import { useSyncExternalStore } from 'react'
import type { Unsubscribe } from 'firebase/firestore'
import { FIREBASE_CONFIG } from '../firebaseConfig'
import { covers, isProgress } from './merge'
import { HAS_SERVER, getProgress, isReady, mergeIn, onLocalChange, type Progress } from './store'

// Account login + automatic sync through Firebase (Auth + Firestore).
// The Firebase project is shared with Leon's other sites, so this app keeps to its own collection:
// the whole record is one document, bunkeiDojo/{uid}. Each device merges what it finds there into its own record
// and writes back only when the document lacks something, inside a transaction, so two devices never
// overwrite each other. Merging never drops an answer, so studying offline is fine: it catches up later.
// Firebase is loaded lazily, only when configured.

export const CLOUD_CONFIGURED = !!FIREBASE_CONFIG.apiKey

/** Firestore collection for this app (Firestore rules: each user may only read/write bunkeiDojo/{their uid}). */
const COLLECTION = 'bunkeiDojo'

export interface CloudState {
  /** Auth state known (first answer from Firebase arrived). */
  checked: boolean
  email: string | null
  name: string | null
  photo: string | null
  busy: boolean
  /** Epoch ms of the last successful sync. */
  last: number
  error: string
}

let cloud: CloudState = { checked: !CLOUD_CONFIGURED, email: null, name: null, photo: null, busy: false, last: 0, error: '' }
const listeners = new Set<() => void>()
const set = (patch: Partial<CloudState>) => {
  cloud = { ...cloud, ...patch }
  listeners.forEach((l) => l())
}

export function useCloud(): CloudState {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => cloud,
  )
}

// ---------- Firebase (lazy) ----------

type FB = Awaited<ReturnType<typeof loadFirebase>>
let fbPromise: Promise<FB> | null = null

async function loadFirebase() {
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ])
  const app = initializeApp(FIREBASE_CONFIG)
  return { auth, fs, a: auth.getAuth(app), db: fs.getFirestore(app) }
}
const fb = () => (fbPromise ??= loadFirebase())

// ---------- Encoding (gzip keeps the document far below Firestore's 1 MB limit) ----------

const toB64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
const fromB64 = (b: string) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0))

async function encode(p: Progress): Promise<{ enc: string; data: string }> {
  const json = JSON.stringify(p)
  if (typeof CompressionStream === 'undefined') return { enc: 'json', data: json }
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))
  return { enc: 'gzip-b64', data: toB64(new Uint8Array(await new Response(stream).arrayBuffer())) }
}

async function decode(doc: { enc?: string; data?: string } | undefined): Promise<Progress | null> {
  if (!doc?.data) return null
  let json = doc.data
  if (doc.enc === 'gzip-b64') {
    const stream = new Blob([fromB64(doc.data)]).stream().pipeThrough(new DecompressionStream('gzip'))
    json = await new Response(stream).text()
  }
  const p = JSON.parse(json)
  return isProgress(p) ? (p as Progress) : null
}

const device = () => (HAS_SERVER ? 'pc' : /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'phone' : 'web')

// ---------- Messages ----------

function message(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  const map: Record<string, string> = {
    'auth/invalid-credential': '邮箱或密码错误',
    'auth/wrong-password': '邮箱或密码错误',
    'auth/user-not-found': '该邮箱尚未注册',
    'auth/email-already-in-use': '该邮箱已注册，请直接登录',
    'auth/weak-password': '密码至少需要 6 位',
    'auth/invalid-email': '邮箱格式不正确',
    'auth/missing-password': '请输入密码',
    'auth/network-request-failed': '网络连接失败',
    'auth/too-many-requests': '尝试次数过多，请稍后再试',
    'auth/unauthorized-domain': '当前网址尚未添加到 Firebase 的已授权网域',
    'auth/operation-not-allowed': 'Firebase 尚未启用此登录方式',
    'auth/popup-blocked': '登录窗口被浏览器拦截，请允许弹出窗口后重试',
    'auth/account-exists-with-different-credential': '该邮箱已通过密码注册，请使用邮箱和密码登录',
    'permission-denied': '数据库访问规则尚未正确配置',
    unavailable: '网络连接失败，恢复联网后将自动同步',
  }
  return map[code] ?? (e instanceof Error ? e.message : String(e))
}

// ---------- Sync ----------

let uid: string | null = null
let running: Promise<void> | null = null
let again = false

/** Merge the cloud copy into this device and write back whatever the cloud lacks. */
export function syncNow(): Promise<void> {
  if (!uid || !isReady()) return Promise.resolve()
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    set({ busy: true })
    try {
      do {
        again = false
        await syncOnce()
      } while (again)
      set({ busy: false, last: Date.now(), error: '' })
    } catch (e) {
      set({ busy: false, error: message(e) })
    } finally {
      running = null
    }
  })()
  return running
}

async function syncOnce() {
  const { fs, db } = await fb()
  if (!uid) return
  const ref = fs.doc(db, COLLECTION, uid)
  await fs.runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const remote = await decode(snap.data())
    if (remote) mergeIn(remote)
    const mine = getProgress()
    if (remote && covers(remote, mine)) return
    tx.set(ref, { ...(await encode(mine)), updatedAt: Date.now(), device: device() })
  })
}

let unwatch: Unsubscribe | null = null

/** Start listening for the signed-in user; sync on sign-in, on changes, and when another device writes. */
let started = false
export async function startCloud() {
  if (started || !CLOUD_CONFIGURED) return
  started = true
  const { auth, fs, a, db } = await fb()
  let timer: number | undefined
  onLocalChange(() => {
    clearTimeout(timer)
    timer = window.setTimeout(() => void syncNow(), 3000)
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer)
      timer = undefined
      void syncNow()
    }
  })
  auth.onAuthStateChanged(a, (user) => {
    unwatch?.()
    unwatch = null
    uid = user?.uid ?? null
    set({
      checked: true,
      email: user?.email ?? null,
      name: user?.displayName ?? null,
      photo: user?.photoURL ?? null,
      error: '',
      last: 0,
    })
    if (!user) return
    void syncNow()
    // Another device wrote: merge it in right away (our own writes come back too and merge as a no-op).
    unwatch = fs.onSnapshot(
      fs.doc(db, COLLECTION, user.uid),
      async (snap) => {
        try {
          const remote = await decode(snap.data())
          if (remote) mergeIn(remote)
        } catch (e) {
          set({ error: message(e) })
        }
      },
      (e) => set({ error: message(e) }),
    )
  })
}

// ---------- Account ----------

export async function signUp(email: string, password: string) {
  const { auth, a } = await fb()
  try {
    await auth.createUserWithEmailAndPassword(a, email.trim(), password)
  } catch (e) {
    throw new Error(message(e))
  }
}

export async function signIn(email: string, password: string) {
  const { auth, a } = await fb()
  try {
    await auth.signInWithEmailAndPassword(a, email.trim(), password)
  } catch (e) {
    throw new Error(message(e))
  }
}

/** Sign in (or sign up) with a Google account, in a popup window. */
export async function signInWithGoogle() {
  const { auth, a } = await fb()
  try {
    await auth.signInWithPopup(a, new auth.GoogleAuthProvider())
  } catch (e) {
    const code = (e as { code?: string })?.code
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
    throw new Error(message(e))
  }
}

export async function resetPassword(email: string) {
  const { auth, a } = await fb()
  try {
    await auth.sendPasswordResetEmail(a, email.trim())
  } catch (e) {
    throw new Error(message(e))
  }
}

/** Sign out on this device. The record stays on the device (and in the account). */
export async function signOut() {
  const { auth, a } = await fb()
  await syncNow()
  await auth.signOut(a)
}
