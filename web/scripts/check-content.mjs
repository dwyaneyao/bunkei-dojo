// Checks every content/*.json lesson before it is published (`npm run check`, also run by the deploy workflow).
// It catches what the app cannot show well at run time: broken furigana, Japanese text without furigana, model
// answers that do not fit their prompt, ids that do not follow the naming rules. See docs/content-guide.md.
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.resolve(import.meta.dirname, '../../content')
const RUBY = /\{([^|{}]+)\|([^{}]+)\}/g
const KANJI = /[一-鿿々]/
const KANA = /[぀-ヿ]/
// Speaker labels are written without furigana (the app breaks dialogue lines on them).
const LABELS = /(^|[。？！?!）」\s])(母親|父親|娘|息子|子ども|子供|先生|学生|店員|客|母|父)：/g
const TAGS = new Set(['form', 'meaning', 'context', 'register', 'word'])

const problems = []
const seen = new Set()
let pointCount = 0
let itemCount = 0

for (const file of fs.readdirSync(DIR).filter((f) => /^l\d+\.json$/.test(f)).sort()) {
  let L
  try {
    L = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'))
  } catch (e) {
    problems.push(`${file}: not valid JSON (${e.message})`)
    continue
  }
  const at = (id, msg) => problems.push(`${file} ${id}: ${msg}`)

  // Markup that renders wrongly: stray braces or pipes, kanji inside a reading, odd ** pairs.
  const markup = (id, s) => {
    if (typeof s !== 'string') return
    if (/[{}|]/.test(s.replace(RUBY, ''))) at(id, `broken furigana markup: ${s}`)
    for (const m of s.matchAll(RUBY)) if (KANJI.test(m[2])) at(id, `kanji in a reading: ${m[0]}`)
    if ((s.match(/\*\*/g) || []).length % 2) at(id, `unpaired **: ${s}`)
  }
  // Japanese text: as markup, and every kanji must carry furigana. A parenthesised note with no kana in it,
  // such as （程度） or （和……一起）, is Chinese and is skipped.
  const ja = (id, s) => {
    if (typeof s !== 'string') return
    markup(id, s)
    const bare = s
      .replace(RUBY, '')
      .replace(/（[^（）]*）/g, (m) => (KANA.test(m) ? m : ''))
      .replace(LABELS, '$1')
    const k = [...bare].filter((c) => KANJI.test(c))
    if (k.length) at(id, `kanji without furigana (${k.join('')}): ${s}`)
  }

  if (!/^L\d+$/.test(L.id ?? '')) at('lesson', `lesson id "${L.id}" should look like L11`)
  const groups = new Set((L.groups ?? []).map((g) => g.id))
  const points = new Set()

  for (const p of L.points ?? []) {
    pointCount++
    if (seen.has(p.id)) at(p.id, 'duplicate id')
    seen.add(p.id)
    points.add(p.id)
    if (!p.id.startsWith(L.id + '-')) at(p.id, `point id should start with ${L.id}-`)
    if (!groups.has(p.group)) at(p.id, `group ${p.group} does not exist`)
    if (!['grammar', 'word'].includes(p.kind)) at(p.id, `kind must be grammar or word`)
    ja(`${p.id}.pattern`, p.pattern)
    markup(`${p.id}.list.form`, p.list?.form)
    for (const ex of [p.list?.example ?? []].flat()) ja(`${p.id}.list.example`, ex)
    for (const f of ['meaning', ...(p.form ?? []), ...(p.rules ?? [])]) markup(`${p.id}.text`, f === 'meaning' ? p.meaning : f)
    for (const s of p.safe ?? []) ja(`${p.id}.safe`, s)
    for (const s of p.examples ?? []) ja(`${p.id}.examples`, s)
    for (const t of p.traps ?? []) {
      ja(`${p.id}.traps.bad`, t.bad)
      markup(`${p.id}.traps.fix`, t.fix)
      markup(`${p.id}.traps.why`, t.why)
      if (t.tag && !TAGS.has(t.tag)) at(p.id, `unknown tag ${t.tag}`)
    }
  }

  const byPoint = new Map()
  for (const i of L.items ?? []) {
    itemCount++
    if (seen.has(i.id)) at(i.id, 'duplicate id')
    seen.add(i.id)
    if (!points.has(i.point)) at(i.id, `point ${i.point} does not exist in this lesson`)
    if (!i.id.startsWith(i.point + '-')) at(i.id, `item id should start with its point id (${i.point}-)`)
    if (i.type !== 'quick') byPoint.set(i.point, (byPoint.get(i.point) ?? 0) + 1)

    if (i.type === 'form') {
      markup(`${i.id}.cue`, i.cue)
      if (!i.answers?.length) at(i.id, 'no answers')
      for (const a of i.answers ?? []) ja(`${i.id}.answers`, a)
    } else if (i.type === 'choice' || i.type === 'quick') {
      // A quick (速测) item that asks for the meaning of a whole sentence has no blank; it must say so in `ask`.
      if (!i.prompt?.includes('＿＿') && !(i.type === 'quick' && i.ask)) at(i.id, 'prompt has no ＿＿')
      if (i.type === 'quick' && !/^.+-q\d+$/.test(i.id)) at(i.id, 'quick item id should end in -q<number>')
      if (i.type === 'quick' && (i.options ?? []).length < 4) at(i.id, 'quick item needs at least 4 options')
      if (new Set((i.options ?? []).map((o) => o.text)).size !== (i.options ?? []).length) at(i.id, 'duplicate option text')
      ja(`${i.id}.prompt`, i.prompt?.replace(/＿+/g, ''))
      if ((i.options ?? []).filter((o) => o.ok).length !== 1) at(i.id, 'needs exactly one ok option')
      if (!i.explain?.trim()) at(i.id, 'missing explain (题目解析: the clue that decides this item)')
      markup(`${i.id}.explain`, i.explain)
      markup(`${i.id}.zh`, i.zh)
      for (const o of i.options ?? []) {
        // A 含义理解 option is a Chinese translation: no kana in it, so only its markup is checked.
        if (i.type === 'quick' && !KANA.test(o.text)) markup(`${i.id}.option`, o.text)
        else ja(`${i.id}.option`, o.text)
        markup(`${i.id}.why`, o.why)
        if (!o.ok && !TAGS.has(o.tag)) at(i.id, `wrong option needs an error tag: ${o.text}`)
      }
    } else if (i.type === 'produce') {
      const parts = (i.prompt ?? '').split(/＿{2,}/)
      if (parts.length < 2) at(i.id, 'prompt has no ＿＿')
      ja(`${i.id}.prompt`, i.prompt?.replace(/＿+/g, ''))
      if (!i.zh?.trim()) at(i.id, 'missing zh (the Chinese sentence to write)')
      if (!i.hint?.trim()) at(i.id, 'missing hint')
      if (!i.checks?.length) at(i.id, 'missing checks')
      if (!i.models?.length) at(i.id, 'missing models')
      for (const m of i.models ?? []) {
        ja(`${i.id}.models`, m.replace(/\*\*/g, ''))
        const fills = m.match(/\*\*.+?\*\*/g) ?? []
        if (fills.length !== parts.length - 1) at(i.id, `model fills ${fills.length} blanks, prompt has ${parts.length - 1}: ${m}`)
        else if (m.split(/\*\*.+?\*\*/).join('＿＿') !== i.prompt) at(i.id, `model text outside the blanks differs from the prompt: ${m}`)
      }
    } else at(i.id, `unknown type ${i.type}`)
  }
  for (const p of points) if (!byPoint.has(p)) at(p, 'point has no exercises')
}

if (problems.length) {
  console.error(problems.join('\n'))
  console.error(`\n${problems.length} problem(s) in content/.`)
  process.exit(1)
}
console.log(`content OK: ${pointCount} points, ${itemCount} items`)
