import { ITEMS, POINTS, itemsOf, pointById } from '../content'
import type { ErrorTag, Item } from '../types'
import { dayKey, type Attempt, type Progress } from './store'

export type Step = { kind: 'learn'; point: string } | { kind: 'item'; item: string }

const endOfToday = (now: number) => {
  const d = new Date(now)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

const STAGE: Record<Item['type'], number> = { form: 0, choice: 1, produce: 2 }

/** Reorder so the same point rarely appears twice in a row (interleaving). */
export function interleave(ids: string[]): string[] {
  const buckets = new Map<string, string[]>()
  for (const id of ids) {
    const p = ITEMS.find((i) => i.id === id)?.point ?? id
    buckets.set(p, [...(buckets.get(p) ?? []), id])
  }
  const out: string[] = []
  let last = ''
  while (out.length < ids.length) {
    const cands = [...buckets.entries()].filter(([, v]) => v.length > 0)
    cands.sort((a, b) => b[1].length - a[1].length)
    const pick = cands.find(([k]) => k !== last) ?? cands[0]
    out.push(pick[1].shift()!)
    last = pick[0]
  }
  return out
}

export interface DailyPlan {
  steps: Step[]
  /** Items of points already studied (due reviews plus their not-yet-done items). */
  reviews: number
  newPoints: string[]
}

/**
 * Today's queue: old material first (due reviews + next unseen item of studied points), then new points.
 * A new point: card → form drills → choice items; its first exam-style item comes at the end of the
 * session so there is a gap between seeing the card and producing.
 */
export function buildDaily(p: Progress, now = Date.now()): DailyPlan {
  const horizon = endOfToday(now)
  const reviewIds: string[] = []
  const pendingIds: string[] = []

  for (const pt of POINTS) {
    if (!p.intro[pt.id]) continue
    const its = itemsOf(pt.id)
    const today = dayKey(now)
    const triedToday = new Set(p.log.filter((a) => a.point === pt.id && dayKey(a.t) === today).map((a) => a.item))
    for (const it of its) {
      if (!p.cards[it.id] || p.cards[it.id].due > horizon) continue
      // An exam-style item missed today comes back as a different sentence of the same point; if none is
      // left it waits until tomorrow, so a re-test is never just recalling a model answer seen today.
      if (it.type === 'produce' && triedToday.has(it.id)) {
        const alt = its.find((x) => x.type === 'produce' && !triedToday.has(x.id) && !reviewIds.includes(x.id))
        if (alt) reviewIds.push(alt.id)
        continue
      }
      reviewIds.push(it.id)
    }
    // Unseen items of a studied point: all quick ones, plus one exam-style item per day.
    const unseen = its.filter((it) => !p.cards[it.id])
    pendingIds.push(...unseen.filter((it) => it.type !== 'produce').map((it) => it.id))
    const nextProduce = unseen.find((it) => it.type === 'produce')
    const producedToday = p.log.some((a) => a.point === pt.id && a.type === 'produce' && dayKey(a.t) === dayKey(now))
    if (nextProduce && !producedToday) pendingIds.push(nextProduce.id)
  }

  const introducedToday = Object.values(p.intro).filter((t) => dayKey(t) === dayKey(now)).length
  const room = Math.max(0, p.settings.newPerDay - introducedToday)
  // Unstudied points in list order, except that points already missed (e.g. in a mock exam) come first.
  const missed = new Set(p.log.filter((a) => !a.ok).map((a) => a.point))
  const newPoints = POINTS.filter((pt) => !p.intro[pt.id])
    .map((pt, i) => ({ id: pt.id, rank: (missed.has(pt.id) ? 0 : 1000) + i }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, room)
    .map((x) => x.id)

  const steps: Step[] = []
  const old = interleave(
    [...new Set([...reviewIds, ...pendingIds])].sort((a, b) => STAGE[itemType(a)] - STAGE[itemType(b)]),
  )
  steps.push(...old.map((item) => ({ kind: 'item' as const, item })))

  const deferred: string[] = []
  for (const id of newPoints) {
    steps.push({ kind: 'learn', point: id })
    const its = itemsOf(id).sort((a, b) => STAGE[a.type] - STAGE[b.type])
    for (const it of its.filter((x) => x.type !== 'produce')) steps.push({ kind: 'item', item: it.id })
    // Prefer an exam-style item not seen before (one may already have been answered in a mock exam).
    const produce = its.filter((x) => x.type === 'produce')
    const firstProduce = produce.find((x) => !p.cards[x.id]) ?? produce[0]
    if (firstProduce) deferred.push(firstProduce.id)
  }
  steps.push(...interleave(deferred).map((item) => ({ kind: 'item' as const, item })))

  return { steps, reviews: old.length, newPoints }
}

const itemType = (id: string) => ITEMS.find((i) => i.id === id)?.type ?? 'produce'

/** All items of one point, card first: for focused practice ("专练"). */
export function buildDrill(pointId: string): Step[] {
  const its = itemsOf(pointId).sort((a, b) => STAGE[a.type] - STAGE[b.type])
  return [{ kind: 'learn', point: pointId }, ...its.map((it) => ({ kind: 'item' as const, item: it.id }))]
}

// ---------- Mastery ----------

export const LEVELS = ['未学习', '学习中', '初步掌握', '已巩固', '熟练运用'] as const

export const LEVEL_HINT = [
  '尚未学习',
  '已学习，但尚未在完成句中独立答对',
  '已在完成句中独立答对（未使用提示）',
  '在两个不同的日期独立答对完成句',
  '在两个不同的日期独立答对，且涉及两道以上不同的完成句',
]

export interface Mastery {
  level: 0 | 1 | 2 | 3 | 4
  lastFail: boolean
  attempts: number
}

/** Level per point, from evidence in the log. Only exam-style (produce) answers count as success, and only
 *  independent ones: no hint, and not a sentence already answered earlier the same day (whose model answer
 *  was then on screen). */
export function mastery(p: Progress, pointId: string): Mastery {
  const atts = p.log.filter((a) => a.point === pointId)
  if (!p.intro[pointId] && atts.length === 0) return { level: 0, lastFail: false, attempts: 0 }
  const seen = new Set<string>()
  const wins: Attempt[] = []
  for (const a of atts) {
    if (a.type !== 'produce') continue
    const key = dayKey(a.t) + '|' + a.item
    if (a.ok && !a.hinted && !seen.has(key)) wins.push(a)
    seen.add(key)
  }
  const days = new Set(wins.map((a) => dayKey(a.t))).size
  const sentences = new Set(wins.map((a) => a.item)).size
  let level: Mastery['level'] = 1
  if (wins.length) level = 2
  if (days >= 2) level = 3
  if (days >= 2 && sentences >= 2) level = 4
  const last = atts[atts.length - 1]
  return { level, lastFail: !!last && !last.ok, attempts: atts.length }
}

// ---------- Error statistics ----------

export function errorTags(a: Attempt): ErrorTag[] {
  if (a.ok) return a.tags ?? []
  if (a.tags?.length) return a.tags
  if (a.type === 'form') return ['form']
  return []
}

export function errorStats(p: Progress, sinceDays = 30, now = Date.now()) {
  const since = now - sinceDays * 86_400_000
  const byTag = new Map<ErrorTag, number>()
  const byPoint = new Map<string, number>()
  for (const a of p.log) {
    if (a.t < since) continue
    const tags = errorTags(a)
    if (!tags.length && a.ok) continue
    for (const t of tags) byTag.set(t, (byTag.get(t) ?? 0) + 1)
    if (!a.ok || tags.length) byPoint.set(a.point, (byPoint.get(a.point) ?? 0) + 1)
  }
  return {
    byTag: [...byTag.entries()].sort((a, b) => b[1] - a[1]),
    byPoint: [...byPoint.entries()].sort((a, b) => b[1] - a[1]).filter(([id]) => pointById.has(id)),
  }
}

export function streak(p: Progress, now = Date.now()): number {
  const days = new Set(p.log.map((a) => dayKey(a.t)))
  let n = 0
  const d = new Date(now)
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1)
  while (days.has(dayKey(d.getTime()))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

// ---------- Mock exam ----------

export interface ExamOptions {
  lessons: string[]
  count: number
  onlyStudied: boolean
}

/** One exam-style item per point; weak and least-recently-practised points first, then list order. */
export function buildExam(p: Progress, lessonPoints: string[], opts: ExamOptions): string[] {
  const lastSeen = (item: string) => {
    for (let i = p.log.length - 1; i >= 0; i--) if (p.log[i].item === item) return p.log[i].t
    return 0
  }
  const cands = lessonPoints
    .filter((id) => !opts.onlyStudied || p.intro[id])
    .map((id) => {
      const prod = itemsOf(id).filter((i) => i.type === 'produce')
      if (!prod.length) return null
      const pick = [...prod].sort((a, b) => lastSeen(a.id) - lastSeen(b.id) || Math.random() - 0.5)[0]
      const m = mastery(p, id)
      return { id, item: pick.id, weight: m.level - (m.lastFail ? 2 : 0) + Math.random() * 0.5 }
    })
    .filter((x): x is { id: string; item: string; weight: number } => !!x)
  const chosen = [...cands].sort((a, b) => a.weight - b.weight).slice(0, opts.count)
  const order = new Map(lessonPoints.map((id, i) => [id, i]))
  return chosen.sort((a, b) => order.get(a.id)! - order.get(b.id)!).map((c) => c.item)
}
