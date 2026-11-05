import { itemById, pointById } from '../content'
import type { Step } from './plan'
import { dayKey, getProgress } from './store'

// A practice session in progress is kept in localStorage, so a reload, or leaving and coming back, carries on
// where it stopped instead of starting over. Daily practice, drills and the mistake book keep theirs for the
// day; a lesson quiz (按课出题: 完成句 or 速测) is kept until it is finished or given up.

const SAVE_KEY = 'bunkei-dojo.sessions'
export const QUIZ_KEY = 'quiz'
export const SPEED_KEY = 'speed'

export interface Tally {
  ok: number
  bad: number
  missed: string[]
}

export interface Saved {
  steps: Step[]
  i: number
  /** When step i became current: an answer to it recorded after this was given just before leaving. */
  at: number
  tally: Tally
  retried: string[]
  /** What the session covers, for the 「继续」 card (e.g. 第10課). */
  label?: string
}

const keeps = (key: string, s: Saved) => key === QUIZ_KEY || key === SPEED_KEY || dayKey(s.at) === dayKey(Date.now())

function readAll(): Record<string, Saved> {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') ?? {}
  } catch {
    return {}
  }
}

/** Store (or with null, drop) one session; expired ones are dropped on the way. */
export function writeSaved(key: string, s: Saved | null) {
  const all = Object.fromEntries(Object.entries(readAll()).filter(([k, v]) => k !== key && keeps(k, v)))
  if (s) all[key] = s
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(all))
  } catch {
    /* storage blocked: the session still works, it just is not kept across reloads */
  }
}

/** The unfinished session for this key, if it has not expired and its items still exist. */
export function resume(key: string): Saved | null {
  const s = readAll()[key]
  if (!s || !keeps(key, s) || s.i >= s.steps.length) return null
  if (!s.steps.every((st) => (st.kind === 'learn' ? pointById.has(st.point) : itemById.has(st.item)))) return null
  // The current item was answered but「继续」not pressed before the reload: count it and move on.
  const cur = s.steps[s.i]
  const a = cur.kind === 'item' ? getProgress().log.find((x) => x.item === cur.item && x.t >= s.at) : undefined
  if (!a) return s
  const tally = { ok: s.tally.ok + (a.ok ? 1 : 0), bad: s.tally.bad + (a.ok ? 0 : 1), missed: a.ok ? s.tally.missed : [...s.tally.missed, a.point] }
  return { ...s, i: s.i + 1, at: Date.now(), tally }
}

/** Start a new lesson quiz (QUIZ_KEY) or speed test (SPEED_KEY), replacing any unfinished one of that kind. */
export function startQuiz(key: string, items: string[], label: string) {
  const steps = items.map((item) => ({ kind: 'item' as const, item }))
  writeSaved(key, { steps, i: 0, at: Date.now(), tally: { ok: 0, bad: 0, missed: [] }, retried: [], label })
}
