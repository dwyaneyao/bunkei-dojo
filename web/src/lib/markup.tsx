import { Fragment, type ReactNode } from 'react'
import { useProgress } from './store'

// Inline markup used in content JSON (same syntax as Kotonoha Studio):
//   {漢字|かな}   furigana
//   **text**     emphasis (the part that answers a blank)
//   ＿＿          blank

type Token =
  | { t: 'text'; v: string }
  | { t: 'ruby'; base: string; rt: string }
  | { t: 'bold'; children: Token[] }
  | { t: 'slot' }

const RE = /\{([^|{}]+)\|([^{}]+)\}|\*\*(.+?)\*\*|＿{2,}/g

function parse(src: string): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of src.matchAll(RE)) {
    if (m.index! > last) out.push({ t: 'text', v: src.slice(last, m.index) })
    if (m[1] !== undefined) out.push({ t: 'ruby', base: m[1], rt: m[2] })
    else if (m[3] !== undefined) out.push({ t: 'bold', children: parse(m[3]) })
    else out.push({ t: 'slot' })
    last = m.index! + m[0].length
  }
  if (last < src.length) out.push({ t: 'text', v: src.slice(last) })
  return out
}

/** Text without furigana or emphasis marks. */
export function plain(src: string): string {
  return src.replace(/\{([^|{}]+)\|[^{}]+\}/g, '$1').replace(/\*\*/g, '')
}

/** Every spelling of a marked-up answer: each furigana word may be written as kanji or as kana. */
export function spellings(src: string): string[] {
  const parts: string[][] = []
  let last = 0
  const s = src.replace(/\*\*/g, '')
  for (const m of s.matchAll(/\{([^|{}]+)\|([^{}]+)\}/g)) {
    if (m.index! > last) parts.push([s.slice(last, m.index)])
    parts.push([m[1], m[2]])
    last = m.index! + m[0].length
  }
  if (last < s.length) parts.push([s.slice(last)])
  let out = ['']
  for (const p of parts) {
    const next: string[] = []
    for (const a of out) for (const b of p) next.push(a + b)
    out = next.length > 256 ? next.slice(0, 256) : next
  }
  return out
}

function renderTokens(ts: Token[], furigana: boolean): ReactNode {
  return ts.map((x, i) => {
    if (x.t === 'text') return <Fragment key={i}>{x.v}</Fragment>
    if (x.t === 'slot') return <span key={i} className="slot" aria-label="空格" />
    if (x.t === 'bold' && x.children.length === 1 && x.children[0].t === 'slot')
      return <span key={i} className="slot" aria-label="空格" />
    if (x.t === 'ruby')
      return furigana ? (
        <ruby key={i}>
          {x.base}
          <rt>{x.rt}</rt>
        </ruby>
      ) : (
        <Fragment key={i}>{x.base}</Fragment>
      )
    return <strong key={i}>{renderTokens(x.children, furigana)}</strong>
  })
}

/** Japanese text with markup. Furigana follows the setting unless forced. */
export function J({ children, furigana }: { children: string; furigana?: boolean }) {
  const setting = useProgress().settings.furigana
  return (
    <span lang="ja" className="ja">
      {renderTokens(parse(children), furigana ?? setting)}
    </span>
  )
}
