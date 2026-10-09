import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ChoiceItem, ErrorTag, FormItem, ProduceItem } from '../types'
import { TAG_HINT, TAG_LABEL } from '../types'
import { J } from '../lib/markup'
import { checkForm, compose } from '../lib/answer'
import { getProgress, overrule as overruleAttempt, record, type Mode } from '../lib/store'
import type { Grade, MemoryState } from '../lib/fsrs'
import { isEnter, shuffle } from '../lib/util'
import { pointById } from '../content'
import Blanks, { Sentence } from './Blanks'
import PointCard from './PointCard'
import { Icon, Stamp, type IconName } from './ui'

export interface StepResult {
  ok: boolean
  grade: Grade
}

const PointTag = ({ id }: { id: string }) => {
  const p = pointById.get(id)
  return p ? (
    <span className="point-tag">
      <J furigana={false}>{p.pattern}</J>
    </span>
  ) : null
}

function Kind({ icon, label, point }: { icon: IconName; label: string; point: string }) {
  return (
    <div className="step-kind">
      <Icon name={icon} size={16} />
      {label}
      <PointTag id={point} />
    </div>
  )
}

/** A plain digit key press (no modifier, not auto-repeat from a key held down on the previous step). */
const digit = (e: KeyboardEvent) => (e.repeat || e.ctrlKey || e.altKey || e.metaKey ? NaN : Number(e.key))

/** After answering: open the point's study card in place, without leaving the session. */
function CardPeek({ point }: { point: string }) {
  const [open, setOpen] = useState(false)
  const p = pointById.get(point)
  if (!p) return null
  return (
    <div className="peek">
      <button className="btn ghost small" onClick={() => setOpen(!open)}>
        <Icon name="book" size={16} />
        {open ? '收起文型讲解' : '查看文型讲解'}
      </button>
      {open && <PointCard point={p} />}
    </div>
  )
}

/** Once `active`, move focus to the returned button so Enter presses it. Deferred so the Enter
 *  that revealed the answer does not also press it. (The answer input is disabled by then and
 *  would otherwise swallow the key.) */
function useFocusNext(active: boolean) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => ref.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [active])
  return ref
}

/** Feedback panel that slides up from the bottom, with the red-pen ◯ / ✕. */
function Sheet({
  ok,
  title,
  children,
  onNext,
  nextRef,
  extra,
  titleLang = 'ja',
}: {
  ok: boolean
  title: string
  children?: ReactNode
  onNext: () => void
  nextRef: React.RefObject<HTMLButtonElement | null>
  extra?: ReactNode
  titleLang?: string
}) {
  return (
    <>
      <div className="sheet-space" />
      <div className={'sheet ' + (ok ? 'ok' : 'bad')} role="status">
        <div className="sheet-inner">
          <div className="sheet-top">
            <Stamp kind={ok ? 'ok' : 'bad'} size={58} />
            <div style={{ minWidth: 0 }}>
              <div className="sheet-title" lang={titleLang}>
                {title}
              </div>
              {children}
            </div>
          </div>
          <div className="actions">
            <button ref={nextRef} className="btn primary big" onClick={onNext}>
              继续 <kbd>Enter</kbd>
            </button>
            {extra}
          </div>
        </div>
      </div>
    </>
  )
}

// ---------- 接续：type the connected form ----------

export function FormStep({ item, mode, onDone }: { item: FormItem; mode: Mode; onDone: (r: StepResult) => void }) {
  const [v, setV] = useState('')
  const [res, setRes] = useState<null | boolean>(null)
  const [overruled, setOverruled] = useState(false)
  const attempt = useRef<{ id: string; before: MemoryState | undefined } | null>(null)
  const inp = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inp.current?.focus()
  }, [])

  const submit = () => {
    if (res !== null || !v.trim()) return
    const ok = checkForm(v, item.answers)
    setRes(ok)
    const before = getProgress().cards[item.id]
    const id = record({ item: item.id, point: item.point, type: 'form', mode, ok, grade: ok ? 3 : 1, answer: [v], tags: ok ? [] : ['form'] })
    attempt.current = { id, before }
  }
  // The checker only knows the listed spellings; if the learner's answer is in fact right, let them say so.
  const overrule = () => {
    if (!attempt.current) return
    overruleAttempt(attempt.current.id, attempt.current.before)
    setOverruled(true)
    setRes(true)
  }
  const next = () => onDone({ ok: !!res, grade: res ? 3 : 1 })
  const nextBtn = useFocusNext(res !== null)

  return (
    <div className="step">
      <div className="step-card">
        <Kind icon="pen" label="接续" point={item.point} />
        <p className="step-ask">
          写出完整的接续形式
          {item.ask && (
            <>
              （<J>{item.ask}</J>）
            </>
          )}
        </p>
        <div className="cue" lang="ja">
          <J>{item.cue}</J>
        </div>
        <input
          ref={inp}
          className={'big-input' + (res === null ? '' : res ? ' ok' : ' bad')}
          lang="ja"
          value={v}
          disabled={res !== null}
          placeholder="输入答案…"
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (isEnter(e)) {
              e.preventDefault()
              submit()
            }
          }}
        />
        {res === null && (
          <div className="actions">
            <button className="btn primary big" onClick={submit} disabled={!v.trim()}>
              提交 <kbd>Enter</kbd>
            </button>
          </div>
        )}
      </div>
      {res !== null && <CardPeek point={item.point} />}
      {res !== null && (
        <Sheet
          ok={res}
          title={overruled ? '已按你的判断记为正确' : res ? '正解！' : '不正解'}
          titleLang={overruled ? 'zh-CN' : 'ja'}
          onNext={next}
          nextRef={nextBtn}
          extra={
            !res && (
              <button className="btn ghost" onClick={overrule} title="例如汉字与假名写法不同，但答案实际正确">
                我的答案也正确
              </button>
            )
          }
        >
          <div className="sheet-answer">
            {item.answers.map((a, i) => (
              <span key={i}>
                {i > 0 && <span className="muted"> ／ </span>}
                <J>{a}</J>
              </span>
            ))}
          </div>
          {item.note && (
            <p className="sheet-note">
              <J>{item.note}</J>
            </p>
          )}
        </Sheet>
      )}
    </div>
  )
}

// ---------- 辨析：pick the natural completion ----------

export function ChoiceStep({ item, mode, onDone }: { item: ChoiceItem; mode: Mode; onDone: (r: StepResult) => void }) {
  const opts = useMemo(() => shuffle(item.options.map((o, i) => ({ ...o, i }))), [item])
  const [pick, setPick] = useState<number | null>(null)
  const chosen = pick === null ? null : item.options[pick]
  const right = item.options.find((o) => o.ok)

  const choose = (i: number) => {
    if (pick !== null) return
    setPick(i)
    const o = item.options[i]
    record({
      item: item.id,
      point: item.point,
      type: 'choice',
      mode,
      ok: !!o.ok,
      grade: o.ok ? 3 : 1,
      answer: [o.text],
      tags: o.ok || !o.tag ? [] : [o.tag],
    })
  }
  const next = () => onDone({ ok: !!chosen?.ok, grade: chosen?.ok ? 3 : 1 })
  const nextBtn = useFocusNext(pick !== null)

  useEffect(() => {
    if (pick !== null) return
    const on = (e: KeyboardEvent) => {
      const n = digit(e)
      if (n >= 1 && n <= opts.length) choose(opts[n - 1].i)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  return (
    <div className="step">
      <div className="step-card">
        <Kind icon="eye" label="辨析" point={item.point} />
        <p className="step-ask">{item.ask ?? '选出填入空格最恰当的一项'}</p>
        <Sentence text={item.prompt} />
        <ol className="options">
          {opts.map((o, n) => {
            const state = pick === null ? '' : o.ok ? ' right' : pick === o.i ? ' wrong' : ' dim'
            return (
              <li key={o.i}>
                <button className={'option' + state} onClick={() => choose(o.i)} disabled={pick !== null}>
                  <span className="opt-n">{pick !== null && o.ok ? '◯' : pick === o.i ? '✕' : n + 1}</span>
                  <span className="opt-text" lang="ja">
                    <J>{o.text}</J>
                  </span>
                  {pick !== null && o.tag && !o.ok && <span className="tag">{TAG_LABEL[o.tag]}</span>}
                </button>
                {pick !== null && !o.ok && (
                  <div className="opt-why">
                    <J>{o.why}</J>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </div>
      {pick !== null && <CardPeek point={item.point} />}
      {pick !== null && right && (
        <Sheet ok={!!chosen?.ok} title={chosen?.ok ? '正解！' : '不正解'} onNext={next} nextRef={nextBtn}>
          <div className="sheet-answer">
            <J>{right.text}</J>
          </div>
          <p className="sheet-note">
            <J>{right.why}</J>
          </p>
        </Sheet>
      )}
    </div>
  )
}

// ---------- 完成句：exam-style open completion ----------

export function ProduceStep({ item, mode, onDone }: { item: ProduceItem; mode: Mode; onDone: (r: StepResult) => void }) {
  const [vals, setVals] = useState<string[]>([])
  const [hinted, setHinted] = useState(false)
  const [shown, setShown] = useState(false)

  return (
    <div className="step">
      <div className="step-card">
        <Kind icon="exam" label="完成句" point={item.point} />
        <p className="step-ask">在空格处填写内容，完成句子。与考试相同，答案不唯一。</p>
        <Blanks prompt={item.prompt} values={vals} onChange={setVals} onEnter={() => setShown(true)} disabled={shown} autoFocus />
        {!shown && (
          <div className="actions">
            <button className="btn primary big" onClick={() => setShown(true)}>
              提交并核对答案 <kbd>Enter</kbd>
            </button>
            {!hinted ? (
              <button className="btn ghost" onClick={() => setHinted(true)}>
                <Icon name="bulb" size={18} />
                查看提示
              </button>
            ) : (
              <span className="hint">
                <Icon name="bulb" size={18} />
                <J>{item.hint}</J>
              </span>
            )}
          </div>
        )}
        {shown && (
          <Reveal
            item={item}
            fills={vals}
            hinted={hinted}
            keys
            onGraded={(g, tags) => {
              // With a hint, a right answer still counts as right, but is scheduled like a hard one and
              // does not count toward mastery.
              const grade = hinted ? (Math.min(g, 2) as Grade) : g
              record({
                item: item.id,
                point: item.point,
                type: 'produce',
                mode,
                ok: g >= 3,
                grade,
                hinted,
                answer: vals,
                sentence: compose(item.prompt, vals),
                tags,
              })
              onDone({ ok: g >= 3, grade })
            }}
          />
        )}
      </div>
    </div>
  )
}

const GRADES: { g: Grade; label: string; sub: string; cls: string }[] = [
  { g: 1, label: '✕ 错误', sub: '未能写出或有明显错误', cls: 'g1' },
  { g: 2, label: '△ 部分正确', sub: '基本正确，但有小错误', cls: 'g2' },
  { g: 3, label: '◯ 正确', sub: '符合全部检查要点', cls: 'g3' },
  { g: 4, label: '◎ 熟练', sub: '迅速、准确地写出', cls: 'g4' },
]

/** Self-check: learner's sentence, the item's checklist, model answers, then grade + error tags. */
export function Reveal({
  item,
  fills,
  hinted,
  onGraded,
  graded,
  keys,
}: {
  item: ProduceItem
  fills: string[]
  hinted?: boolean
  onGraded: (g: Grade, tags: ErrorTag[]) => void
  graded?: Grade
  /** Number keys 1–4 pick the grade (only when this is the only Reveal on screen). */
  keys?: boolean
}) {
  const [ticks, setTicks] = useState<boolean[]>([])
  const [tags, setTags] = useState<ErrorTag[]>([])
  const empty = fills.every((f) => !f?.trim())
  const grades = GRADES

  // Grade once only, even if a key repeats or a button is double-clicked.
  const fired = useRef(false)
  const grade = (g: Grade) => {
    if (fired.current) return
    fired.current = true
    onGraded(g, tags)
  }
  const latest = useRef({ grade, grades })
  latest.current = { grade, grades }
  useEffect(() => {
    if (!keys || graded !== undefined) return
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'text') return
      const g = latest.current.grades.find((x) => x.g === digit(e))
      if (g) latest.current.grade(g.g)
    }
    // Deferred so a key that is still being released from the answer step is not taken as a grade.
    const t = setTimeout(() => window.addEventListener('keydown', on), 150)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', on)
    }
  }, [keys, graded])

  return (
    <div className="reveal">
      <div className="panel">
        <div className="lbl">你的答案</div>
        <Sentence text={compose(item.prompt, fills)} />
        {empty && <div className="muted small">（未作答）</div>}
      </div>

      <div className="panel">
        <div className="lbl">检查要点</div>
        <ul className="checks">
          {item.checks.map((c, i) => (
            <li key={i}>
              <label>
                <input
                  type="checkbox"
                  checked={!!ticks[i]}
                  onChange={(e) => {
                    const n = [...ticks]
                    n[i] = e.target.checked
                    setTicks(n)
                  }}
                />
                <span>
                  <J>{c}</J>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <div className="lbl">参考答案</div>
        <ul className="models">
          {item.models.map((m, i) => (
            <li key={i}>
              <Sentence text={m} />
            </li>
          ))}
        </ul>
      </div>
      <CardPeek point={item.point} />

      {graded === undefined ? (
        <div className="grade-box">
          <div className="lbl">错误类型（可多选，答错或部分正确时选择）</div>
          <div className="tag-pick">
            {(Object.keys(TAG_LABEL) as ErrorTag[]).map((t) => (
              <button
                key={t}
                className={'tag-btn' + (tags.includes(t) ? ' on' : '')}
                title={TAG_HINT[t]}
                onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}
              >
                {TAG_LABEL[t]}
              </button>
            ))}
          </div>
          {hinted && <p className="muted small" style={{ marginTop: 10 }}>本题使用了提示：答对仍记为正确，但会提前安排复习，且不计入掌握程度。</p>}
          <div className="grades">
            {grades.map((g) => (
              <button key={g.g} className={'grade ' + g.cls} onClick={() => grade(g.g)}>
                <b>{g.label}</b>
                <span>
                  {g.sub}
                  {keys && <kbd>{g.g}</kbd>}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="muted small">已自评：{GRADES.find((g) => g.g === graded)?.label}</div>
      )}
    </div>
  )
}
