// Merging two copies of the learning record (another tab, localStorage vs disk, client vs server).
// Used by the app and by the dev server's PUT handler, so it must not touch the DOM.
// Nothing recorded in either copy is ever dropped: attempts are unioned by id.

interface Attempt {
  id: string
  t: number
  /** Last change to the attempt after it was recorded. */
  at?: number
}
interface Card {
  last: number
}
export interface Mergeable {
  version: number
  created: number
  settings: object
  settingsAt?: number
  cards: Record<string, Card>
  intro: Record<string, number>
  log: Attempt[]
}

export function isProgress(x: unknown): x is Mergeable {
  const p = x as Mergeable
  return !!p && typeof p === 'object' && Array.isArray(p.log) && typeof p.cards === 'object' && typeof p.intro === 'object'
}

export function mergeProgress<T extends Mergeable>(a: T, b: T): T {
  const log = new Map<string, Attempt>()
  for (const x of [...a.log, ...b.log]) {
    const prev = log.get(x.id)
    if (!prev || (x.at ?? x.t) > (prev.at ?? prev.t)) log.set(x.id, x)
  }
  const cards: Record<string, Card> = { ...a.cards }
  for (const [k, c] of Object.entries(b.cards)) if (!cards[k] || c.last > cards[k].last) cards[k] = c
  const intro: Record<string, number> = { ...a.intro }
  for (const [k, t] of Object.entries(b.intro)) intro[k] = intro[k] ? Math.min(intro[k], t) : t
  const newerSettings = (b.settingsAt ?? 0) > (a.settingsAt ?? 0) ? b : a
  return {
    ...a,
    created: Math.min(a.created || Infinity, b.created || Infinity),
    settings: { ...a.settings, ...newerSettings.settings },
    settingsAt: Math.max(a.settingsAt ?? 0, b.settingsAt ?? 0),
    cards,
    intro,
    log: [...log.values()].sort((x, y) => x.t - y.t),
  } as T
}

/** True when `b` holds nothing that `a` lacks (so writing `a` loses nothing). */
export function covers(a: Mergeable, b: Mergeable): boolean {
  const ids = new Map(a.log.map((x) => [x.id, x.at ?? x.t]))
  if (b.log.some((x) => (ids.get(x.id) ?? -1) < (x.at ?? x.t))) return false
  if (Object.entries(b.cards).some(([k, c]) => !a.cards[k] || a.cards[k].last < c.last)) return false
  if (Object.entries(b.intro).some(([k, t]) => !a.intro[k] || a.intro[k] > t)) return false
  return (a.settingsAt ?? 0) >= (b.settingsAt ?? 0)
}
