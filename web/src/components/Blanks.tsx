import { Fragment, useEffect, useRef } from 'react'
import { J } from '../lib/markup'
import { splitBlanks } from '../lib/answer'
import { isEnter } from '../lib/util'

// A speaker label (A：, B：, 母親：…) starts a new line when it begins the text or follows punctuation,
// so 祖母： or "AI：" inside a sentence are left alone.
const LABEL = /(?<=^|[。？！?!）」\s])(?=(?:[A-Z]|母親|父親|娘|息子|子ども|子供|先生|学生|店員|客|母|父)：)/

const lines = (text: string) => text.split(LABEL).filter((l) => l !== '')

/** A prompt sentence with an input in every ＿＿; dialogue turns go on separate lines. */
export default function Blanks({
  prompt,
  values,
  onChange,
  onEnter,
  disabled,
  autoFocus,
}: {
  prompt: string
  values: string[]
  onChange: (v: string[]) => void
  onEnter?: () => void
  disabled?: boolean
  autoFocus?: boolean
}) {
  const total = splitBlanks(prompt).length - 1
  const refs = useRef<(HTMLInputElement | null)[]>([])
  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus, prompt])

  let blank = 0
  const input = (idx: number) => (
    <input
      key={'in' + idx}
      ref={(el) => {
        refs.current[idx] = el
      }}
      className="blank-input"
      lang="ja"
      aria-label={`第 ${idx + 1} 个空`}
      value={values[idx] ?? ''}
      disabled={disabled}
      style={{ width: `${Math.max(5, Math.min(22, [...(values[idx] ?? '')].length + 2))}em` }}
      onChange={(e) => {
        const next = [...values]
        next[idx] = e.target.value
        onChange(next)
      }}
      onKeyDown={(e) => {
        if (!isEnter(e)) return
        e.preventDefault()
        if (idx < total - 1) refs.current[idx + 1]?.focus()
        else onEnter?.()
      }}
    />
  )

  return (
    <div className="blanks ja">
      {lines(prompt).map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {splitBlanks(line).map((seg, si, segs) => (
            <Fragment key={si}>
              {seg && <J>{seg}</J>}
              {si < segs.length - 1 && input(blank++)}
            </Fragment>
          ))}
        </Fragment>
      ))}
    </div>
  )
}

/** Read-only version of a prompt (with fills in **bold**), same line breaking as Blanks. */
export function Sentence({ text }: { text: string }) {
  return (
    <div className="blanks ja">
      {lines(text).map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          <J>{line}</J>
        </Fragment>
      ))}
    </div>
  )
}
