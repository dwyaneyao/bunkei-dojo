import type { Item, Lesson, Point, ProduceItem } from './types'
import { blankCount } from './lib/answer'

// Every exam-review/content/*.json file is a lesson. Adding a lesson = adding a file.
const files = import.meta.glob<Lesson>('../../content/*.json', { eager: true, import: 'default' })

export const LESSONS: Lesson[] = Object.values(files).sort((a, b) =>
  a.id.localeCompare(b.id, 'en', { numeric: true }),
)

export const POINTS: Point[] = LESSONS.flatMap((l) => l.points)
export const ITEMS: Item[] = LESSONS.flatMap((l) => l.items)

export const pointById = new Map(POINTS.map((p) => [p.id, p]))
export const itemById = new Map(ITEMS.map((i) => [i.id, i]))
export const lessonOfPoint = new Map(LESSONS.flatMap((l) => l.points.map((p) => [p.id, l] as const)))

export const itemsOf = (pointId: string) => ITEMS.filter((i) => i.point === pointId)

/** Content problems, shown on the home screen so a bad edit is noticed immediately. */
export const PROBLEMS: string[] = (() => {
  const out: string[] = []
  const seen = new Set<string>()
  for (const l of LESSONS) {
    const groups = new Set(l.groups.map((g) => g.id))
    for (const p of l.points) {
      if (seen.has(p.id)) out.push(`重复的 id：${p.id}`)
      seen.add(p.id)
      if (!groups.has(p.group)) out.push(`${p.id}：分组 ${p.group} 不存在`)
    }
    for (const i of l.items) {
      if (seen.has(i.id)) out.push(`重复的 id：${i.id}`)
      seen.add(i.id)
      if (!pointById.has(i.point)) out.push(`${i.id}：文型 ${i.point} 不存在`)
      if (i.type === 'choice' && i.options.filter((o) => o.ok).length !== 1) out.push(`${i.id}：选择题要有且只有一个正确项`)
      if (i.type === 'choice' && !i.prompt.includes('＿＿')) out.push(`${i.id}：题干缺少＿＿`)
      if (i.type === 'produce') {
        const n = blankCount(i.prompt)
        if (n < 1) out.push(`${i.id}：完成句缺少＿＿`)
        for (const m of i.models) if (!m.includes('**')) out.push(`${i.id}：参考答案要用 ** 标出填空部分`)
      }
      if (i.type === 'form' && i.answers.length === 0) out.push(`${i.id}：没有答案`)
    }
  }
  return out
})()

export const isProduce = (i: Item): i is ProduceItem => i.type === 'produce'
