// FSRS-5 spaced repetition, implemented locally.
// Reference: open-spaced-repetition/fsrs4anki wiki, "The Algorithm" (FSRS-5).
// A card's memory state is (stability S in days, difficulty D in 1..10).

export type Grade = 1 | 2 | 3 | 4 // Again, Hard, Good, Easy

export interface MemoryState {
  s: number
  d: number
  last: number // epoch ms of last review
  due: number // epoch ms
  reps: number
  lapses: number
}

export const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925,
  1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
]
const DECAY = -0.5
const FACTOR = 19 / 81
const DAY = 86_400_000

const clampD = (d: number) => Math.min(10, Math.max(1, d))

export function retrievability(elapsedDays: number, s: number) {
  return Math.pow(1 + (FACTOR * elapsedDays) / s, DECAY)
}

export function intervalDays(s: number, retention = 0.9) {
  return (s / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1)
}

const initS = (g: Grade) => W[g - 1]
const initD = (g: Grade) => clampD(W[4] - Math.exp(W[5] * (g - 1)) + 1)

function nextD(d: number, g: Grade) {
  const delta = -W[6] * (g - 3)
  const damped = d + (delta * (10 - d)) / 9
  return clampD(W[7] * initD(4) + (1 - W[7]) * damped)
}

function recallS(d: number, s: number, r: number, g: Grade) {
  const hard = g === 2 ? W[15] : 1
  const easy = g === 4 ? W[16] : 1
  return s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy + 1)
}

function forgetS(d: number, s: number, r: number) {
  const f = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r))
  return Math.min(f, s)
}

const shortTermS = (s: number, g: Grade) => s * Math.exp(W[17] * (g - 3 + W[18]))

/** Local midnight of the day `t` falls on. */
const dayStart = (t: number) => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Whole calendar days between two times (local dates, so evening → next morning is 1 day). */
const calendarDays = (from: number, to: number) => Math.round((dayStart(to) - dayStart(from)) / DAY)

/** Schedule a review. `now` in epoch ms. Returns the new state.
 *  Days are counted by calendar date, matching how the daily queue works (an item due "tomorrow" is due
 *  from tomorrow's first session, whatever the time of day). */
export function review(prev: MemoryState | undefined, g: Grade, now: number, retention = 0.9): MemoryState {
  let s: number, d: number
  if (!prev) {
    s = initS(g)
    d = initD(g)
  } else {
    const elapsed = calendarDays(prev.last, now)
    if (elapsed < 1) {
      // Same-day review: short-term stability update.
      s = shortTermS(prev.s, g)
    } else {
      const r = retrievability(elapsed, prev.s)
      s = g === 1 ? forgetS(prev.d, prev.s, r) : recallS(prev.d, prev.s, r, g)
    }
    d = nextD(prev.d, g)
  }
  s = Math.max(0.01, s)
  // Failed cards come back within the session window; otherwise whole days (min 1), from that day's start.
  let due = now + 10 * 60_000
  if (g !== 1) {
    const day = new Date(dayStart(now))
    day.setDate(day.getDate() + Math.max(1, Math.round(intervalDays(s, retention))))
    due = day.getTime()
  }
  return {
    s,
    d,
    last: now,
    due,
    reps: (prev?.reps ?? 0) + 1,
    lapses: (prev?.lapses ?? 0) + (g === 1 && prev ? 1 : 0),
  }
}

/** Human-friendly preview of the next interval for each grade. */
export function previewIntervals(prev: MemoryState | undefined, now: number) {
  return ([1, 2, 3, 4] as Grade[]).map((g) => review(prev, g, now).due - now)
}

export function formatInterval(ms: number) {
  const m = ms / 60_000
  if (m < 60) return `${Math.round(m)}分`
  const h = m / 60
  if (h < 24) return `${Math.round(h)}小时`
  const d = h / 24
  if (d < 31) return `${Math.round(d)}天`
  const mo = d / 30
  if (mo < 12) return `${Math.round(mo)}个月`
  return `${(d / 365).toFixed(1)}年`
}
