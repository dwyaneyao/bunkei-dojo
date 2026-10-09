import { useSyncExternalStore } from 'react'
import { covers, isProgress } from './merge'
import { HAS_SERVER, getProgress, isReady, mergeIn, onLocalChange, type Progress } from './store'

// Cloud sync through a private GitHub repo: the whole record is one JSON file there. Every sync reads the
// file, merges it into this device's record, and writes the merged record back if the file lacks anything.
// Merging never drops an answer, so the PC and the phone can both study offline and catch up later.
// The token (a fine-grained token limited to that one repo) is kept in this browser's localStorage only.

const KEY = 'bunkei-dojo.sync'
export const DEFAULT_REPO = 'dwyaneyao/bunkei-dojo-data'
const FILE = 'progress.json'
const API = 'https://api.github.com'

interface Config {
  token: string
  repo: string
}

export interface SyncState {
  on: boolean
  repo: string
  busy: boolean
  /** Epoch ms of the last successful sync. */
  last: number
  error: string
}

let config: Config | null = readConfig()
let sync: SyncState = { on: !!config, repo: config?.repo ?? DEFAULT_REPO, busy: false, last: 0, error: '' }
const listeners = new Set<() => void>()
const set = (patch: Partial<SyncState>) => {
  sync = { ...sync, ...patch }
  listeners.forEach((l) => l())
}

export function useSync(): SyncState {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => sync,
  )
}

function readConfig(): Config | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return c?.token && c?.repo ? c : null
  } catch {
    return null
  }
}

// ---------- GitHub contents API ----------

const utf8ToBase64 = (s: string) => {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
const base64ToUtf8 = (b: string) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, '')), (c) => c.charCodeAt(0)))

class SyncError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function gh(c: Config, path: string, init: RequestInit = {}) {
  const r = await fetch(`${API}/repos/${c.repo}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${c.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (!r.ok && r.status !== 404) {
    const msg =
      r.status === 401
        ? '令牌无效或已过期，请重新建一个'
        : r.status === 403
          ? '令牌没有这个仓库的读写权限（Contents 要选 Read and write）'
          : `GitHub 返回 ${r.status}`
    throw new SyncError(r.status, msg)
  }
  return r
}

async function readRemote(c: Config): Promise<{ data: Progress | null; sha?: string }> {
  const r = await gh(c, `/contents/${FILE}`)
  if (r.status === 404) return { data: null }
  const j = await r.json()
  const data = JSON.parse(base64ToUtf8(j.content ?? ''))
  return { data: isProgress(data) ? (data as Progress) : null, sha: j.sha }
}

async function writeRemote(c: Config, data: Progress, sha?: string) {
  const where = HAS_SERVER ? '电脑' : /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? '手机' : '网页'
  await gh(c, `/contents/${FILE}`, {
    method: 'PUT',
    body: JSON.stringify({ message: `sync from ${where} ${new Date().toISOString()}`, content: utf8ToBase64(JSON.stringify(data)), sha }),
  })
}

// ---------- Sync ----------

let running: Promise<void> | null = null
let again = false

/** Read, merge, write back. Concurrent calls coalesce into one extra round. */
export function syncNow(): Promise<void> {
  if (!config || !isReady()) return Promise.resolve()
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    set({ busy: true })
    try {
      do {
        again = false
        await syncOnce(config!)
      } while (again)
      set({ busy: false, last: Date.now(), error: '' })
    } catch (e) {
      const offline = e instanceof TypeError // fetch itself failed: no network
      set({ busy: false, error: offline ? '连不上 GitHub（可能没网）' : e instanceof Error ? e.message : String(e) })
    } finally {
      running = null
    }
  })()
  return running
}

async function syncOnce(c: Config) {
  // Another device may write between our read and write: GitHub then rejects the stale sha; re-read and retry.
  for (let tries = 0; tries < 4; tries++) {
    const remote = await readRemote(c)
    if (remote.data) mergeIn(remote.data)
    const mine = getProgress()
    if (remote.data && covers(remote.data, mine)) return
    try {
      await writeRemote(c, mine, remote.sha)
      return
    } catch (e) {
      if (e instanceof SyncError && (e.status === 409 || e.status === 422)) continue
      throw e
    }
  }
  throw new Error('同步时一直有冲突，稍后再试')
}

/** Check the token can read and write the repo, then remember it on this device and sync. */
export async function connect(token: string, repo = DEFAULT_REPO) {
  const c = { token: token.trim(), repo: repo.trim() }
  const r = await gh(c, '')
  if (r.status === 404) throw new Error(`找不到仓库 ${c.repo}，或者令牌没有选这个仓库`)
  const info = await r.json()
  if (info?.permissions && !info.permissions.push) throw new Error('令牌只能读、不能写（Contents 要选 Read and write）')
  config = c
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    /* storage blocked: sync works until the page is closed */
  }
  set({ on: true, repo: c.repo, error: '' })
  await syncNow()
}

export function disconnect() {
  config = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  set({ on: false, error: '', last: 0 })
}

// Sync when the app opens, a few seconds after changes stop, and when the page comes back to the front.
let timer: number | undefined
let started = false
export function startSync() {
  if (started || typeof window === 'undefined') return
  started = true
  void syncNow()
  onLocalChange(() => {
    clearTimeout(timer)
    timer = window.setTimeout(() => void syncNow(), 4000)
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - sync.last > 30_000) void syncNow()
    if (document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer)
      void syncNow()
    }
  })
}
