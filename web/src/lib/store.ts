import { useSyncExternalStore } from 'react'
import { review, type Grade, type MemoryState } from './fsrs'
import { covers, isProgress, mergeProgress } from './merge'
import type { ErrorTag } from '../types'

// Progress is saved to exam-review/userdata/progress.json (via the dev server) and mirrored in localStorage.
// Copies are always merged, never replaced (see merge.ts), so two tabs or a fresh browser cannot wipe answers.

export type Mode = 'daily' | 'exam' | 'drill'

export interface Attempt {
  id: string
  t: number
  /** Last change to the attempt after it was recorded (e.g. 「我写的其实也对」). */
  at?: number
  item: string
  point: string
  type: 'form' | 'choice' | 'produce'
  mode: Mode
  ok: boolean
  grade: Grade
  hinted?: boolean
  /** What the learner typed (form/produce) or picked (choice). */
  answer?: string[]
  /** The full sentence with the learner's fills (produce). */
  sentence?: string
  tags?: ErrorTag[]
}

export interface Settings {
  examDate: string
  newPerDay: number
  furigana: boolean
  retention: number
}

export interface Progress {
  version: 1
  created: number
  settings: Settings
  settingsAt?: number
  cards: Record<string, MemoryState>
  /** Point id → when its card was first studied. */
  intro: Record<string, number>
  log: Attempt[]
}

const fresh = (): Progress => ({
  version: 1,
  created: Date.now(),
  settings: { examDate: '', newPerDay: 4, furigana: true, retention: 0.9 },
  cards: {},
  intro: {},
  log: [],
})

/** 'saved' | 'saving' | 'offline' (server unreachable, kept in this browser) | 'readonly' (file unreadable). */
export type SaveState = 'saved' | 'saving' | 'offline' | 'readonly'

let state: Progress = fresh()
let ready = false
let saveState: SaveState = 'saved'
let diskError = ''
const listeners = new Set<() => void>()
const LS_KEY = 'bunkei-dojo.progress'

const emit = () => listeners.forEach((l) => l())

const withDefaults = (p: Progress): Progress => ({ ...fresh(), ...p, settings: { ...fresh().settings, ...p.settings } })

function readLocal(): Progress | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const p = raw ? JSON.parse(raw) : null
    return isProgress(p) ? (p as Progress) : null
  } catch {
    return null
  }
}

function writeLocal() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  } catch {
    /* storage full or blocked: the disk copy still works */
  }
}

let loading: Promise<void> | null = null

async function readDisk(): Promise<Progress | null> {
  try {
    const r = await fetch('/api/progress', { cache: 'no-store' })
    const j = await r.json()
    if (r.ok) return isProgress(j) ? (j as Progress) : null
    diskError = j?.error ?? `HTTP ${r.status}`
    saveState = 'readonly'
  } catch {
    saveState = 'offline'
  }
  return null
}

/** True when running under the local dev server, which saves to userdata/progress.json. The published
 *  web version (GitHub Pages) is static: there the record lives only in this browser's localStorage. */
export const HAS_SERVER = import.meta.env.DEV

/** Load once (StrictMode calls effects twice): merge the disk file and this browser's copy. */
export function loadProgress(): Promise<void> {
  loading ??= (async () => {
    const disk = HAS_SERVER ? await readDisk() : null
    const local = readLocal()
    let merged = fresh()
    if (disk) merged = mergeProgress(merged, disk)
    if (local) merged = mergeProgress(merged, local)
    state = withDefaults(merged)
    ready = true
    writeLocal()
    // This browser had answers the file lacks (e.g. a save that never reached the server): send them now.
    if (saveState === 'saved' && local && (!disk || !covers(disk, local))) scheduleSave(0)
    emit()
  })()
  return loading
}

// ---------- Saving to disk ----------

let timer: number | undefined
let dirty = false

function scheduleSave(delay = 400) {
  if (!HAS_SERVER || saveState === 'readonly') return
  dirty = true
  clearTimeout(timer)
  timer = window.setTimeout(() => void flush(), delay)
}

async function flush(keepalive = false) {
  if (!dirty || saveState === 'readonly') return
  dirty = false
  if (saveState !== 'offline') setSaveState('saving')
  try {
    const r = await fetch('/api/progress', { method: 'PUT', body: JSON.stringify(state), keepalive })
    if (r.status === 409) {
      diskError = (await r.json())?.error ?? 'progress.json 读不了'
      setSaveState('readonly')
      return
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    // The server merged our copy with the file; adopt anything another tab or browser wrote.
    const merged = await r.json()
    if (isProgress(merged) && !covers(state, merged as Progress)) {
      state = withDefaults(mergeProgress(state, merged as Progress))
      writeLocal()
    }
    setSaveState(dirty ? 'saving' : 'saved')
  } catch {
    // Server down or file busy (Windows): keep it in localStorage and try again.
    dirty = true
    setSaveState('offline')
    clearTimeout(timer)
    timer = window.setTimeout(() => void flush(), 5000)
  }
}

function setSaveState(s: SaveState) {
  if (saveState === s) return
  saveState = s
  emit()
}

if (typeof window !== 'undefined') {
  // Send pending changes before the tab closes or goes to the background.
  const now = () => {
    if (dirty) void flush(true)
  }
  window.addEventListener('pagehide', now)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && now())
  // Another tab saved: merge its changes in so neither tab overwrites the other.
  window.addEventListener('storage', (e) => {
    if (e.key !== LS_KEY || !ready) return
    const other = readLocal()
    if (other && !covers(state, other)) {
      state = withDefaults(mergeProgress(state, other))
      emit()
    }
  })
}

// ---------- Updates ----------

/** Called after every change made on this device (cloud sync hooks in here). */
const changeHooks = new Set<() => void>()
export function onLocalChange(fn: () => void) {
  changeHooks.add(fn)
  return () => changeHooks.delete(fn)
}

export function update(fn: (p: Progress) => void) {
  // Pick up anything another tab wrote since we last looked, then apply the change.
  const other = readLocal()
  const base = other && !covers(state, other) ? withDefaults(mergeProgress(state, other)) : state
  const next = structuredClone(base)
  fn(next)
  state = next
  writeLocal()
  scheduleSave()
  emit()
  changeHooks.forEach((h) => h())
}

/** Merge a copy from elsewhere (the cloud) into this one, if it holds anything new. Returns true if it did. */
export function mergeIn(other: Progress): boolean {
  if (covers(state, other)) return false
  state = withDefaults(mergeProgress(state, other))
  writeLocal()
  scheduleSave()
  emit()
  return true
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  )
}

export function useSaveState(): { state: SaveState; error: string } {
  const s = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => saveState,
  )
  return { state: s, error: diskError }
}

export const isReady = () => ready
export const getProgress = () => state

export function markIntro(point: string) {
  if (state.intro[point]) return
  update((p) => {
    p.intro[point] = Date.now()
  })
}

/** Record an attempt and reschedule the item. Returns the attempt id. */
export function record(a: Omit<Attempt, 'id' | 't'>): string {
  const t = Date.now()
  const id = `${t.toString(36)}-${a.item}`
  update((p) => {
    p.log.push({ ...a, id, t })
    p.cards[a.item] = review(p.cards[a.item], a.grade, t, p.settings.retention)
  })
  return id
}

/** The learner says an auto-checked answer was in fact right: count it as correct and reschedule from the
 *  card's state before the attempt. */
export function overrule(id: string, before: MemoryState | undefined) {
  update((p) => {
    const a = p.log.find((x) => x.id === id)
    if (!a) return
    Object.assign(a, { ok: true, grade: 3 as Grade, tags: [], at: Date.now() })
    p.cards[a.item] = review(before, 3, a.t, p.settings.retention)
  })
}

/** The whole record as a file's text, for carrying it between the PC and the web version. */
export const exportProgress = () => JSON.stringify(state)

/** Merge a record exported from another copy into this one. Returns how many new answers it brought. */
export function importProgress(text: string): number {
  const other = JSON.parse(text.replace(/^﻿/, ''))
  if (!isProgress(other)) throw new Error('这不是学习记录文件')
  const before = state.log.length
  update((p) => {
    Object.assign(p, withDefaults(mergeProgress(p, other as Progress)))
  })
  return state.log.length - before
}

export function setSettings(patch: Partial<Settings>) {
  update((p) => {
    p.settings = { ...p.settings, ...patch }
    p.settingsAt = Date.now()
  })
}

export const dayKey = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
