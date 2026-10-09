import { useEffect, useState } from 'react'
import { LESSONS, itemById, itemsOf, pointById } from '../content'
import { buildExam } from '../lib/plan'
import { record, useProgress } from '../lib/store'
import { compose } from '../lib/answer'
import type { Grade } from '../lib/fsrs'
import type { ProduceItem } from '../types'
import { J } from '../lib/markup'
import Blanks from '../components/Blanks'
import { Reveal } from '../components/Steps'

type Phase = 'setup' | 'paper' | 'check' | 'done'

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// An exam in progress is kept in localStorage, so leaving the page (or reloading) does not lose the answers.
const DRAFT_KEY = 'bunkei-dojo.exam'

interface Draft {
  phase: Phase
  items: string[]
  answers: Record<string, string[]>
  grades: Record<string, Grade>
  start: number
  took: number
}

function loadDraft(): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Draft | null
    if (d && d.phase !== 'setup' && d.items.length && d.items.every((id) => itemById.get(id)?.type === 'produce')) return d
  } catch {
    /* storage blocked or bad data */
  }
  return null
}

/** Mock exam: a whole sheet of exam-style items, answered first, then checked one by one. */
export default function Exam() {
  const p = useProgress()
  const [draft] = useState(loadDraft)
  const [phase, setPhase] = useState<Phase>(draft?.phase ?? 'setup')
  const [lessons, setLessons] = useState<string[]>(LESSONS.map((l) => l.id))
  const pointsIn = LESSONS.filter((l) => lessons.includes(l.id)).flatMap((l) => l.points.map((pt) => pt.id))
  const withProduce = pointsIn.filter((id) => itemsOf(id).some((i) => i.type === 'produce'))
  const studied = withProduce.filter((id) => p.intro[id]).length
  const [onlyStudied, setOnlyStudied] = useState(false)
  const max = onlyStudied ? studied : withProduce.length
  const [count, setCount] = useState(withProduce.length)
  const [items, setItems] = useState<string[]>(draft?.items ?? [])
  const [answers, setAnswers] = useState<Record<string, string[]>>(draft?.answers ?? {})
  const [grades, setGrades] = useState<Record<string, Grade>>(draft?.grades ?? {})
  const [start, setStart] = useState(draft?.start ?? 0)
  const [took, setTook] = useState(draft?.took ?? 0)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [phase])

  useEffect(() => {
    try {
      if (phase === 'setup' || phase === 'done') localStorage.removeItem(DRAFT_KEY)
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({ phase, items, answers, grades, start, took } satisfies Draft))
    } catch {
      /* storage blocked: the exam still works, it just is not kept across reloads */
    }
  }, [phase, items, answers, grades, start, took])

  useEffect(() => {
    if (phase !== 'paper') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [phase])

  if (phase === 'setup')
    return (
      <div className="card exam-setup">
        <h1>模拟考</h1>
        <p className="muted">
          和考试一样：一整张卷子先全部写完，再一题一题对答案、自评。每个文型出一道没怎么做过的完成句，弱的文型优先。
        </p>
        <div className="field">
          <span className="field-l">范围</span>
          <div className="row wrap">
            {LESSONS.map((l) => (
              <label key={l.id} className="check">
                <input
                  type="checkbox"
                  checked={lessons.includes(l.id)}
                  onChange={(e) => setLessons(e.target.checked ? [...lessons, l.id] : lessons.filter((x) => x !== l.id))}
                />
                {l.title}
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-l">题数</span>
          <input
            type="number"
            min={1}
            max={max}
            value={Math.min(count, max)}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
          />
          <span className="muted small">最多 {max} 题（每个文型一题）</span>
        </div>
        <label className="check">
          <input type="checkbox" checked={onlyStudied} onChange={(e) => setOnlyStudied(e.target.checked)} />
          只考已经学过的文型（{studied} 个）
        </label>
        <div className="actions">
          <button
            className="btn primary big"
            disabled={max === 0}
            onClick={() => {
              setItems(buildExam(p, pointsIn, { lessons, count: Math.min(count, max), onlyStudied }))
              setAnswers({})
              setGrades({})
              setStart(Date.now())
              setPhase('paper')
            }}
          >
            开始答题
          </button>
        </div>
      </div>
    )

  const list = items.map((id) => itemById.get(id) as ProduceItem)

  if (phase === 'paper')
    return (
      <div className="paper">
        <div className="paper-head">
          <div>
            <h1 lang="ja">模擬試験</h1>
            <p className="ja muted">＿＿に書いて文を完成させてください。</p>
          </div>
          <div className="timer">{fmt(now - start)}</div>
        </div>
        <ol className="paper-list">
          {list.map((it, n) => (
            <li key={it.id}>
              <span className="paper-no">{n + 1}</span>
              <Blanks prompt={it.prompt} values={answers[it.id] ?? []} onChange={(v) => setAnswers({ ...answers, [it.id]: v })} />
            </li>
          ))}
        </ol>
        <div className="actions">
          <button
            className="btn primary big"
            onClick={() => {
              setTook(Date.now() - start)
              setPhase('check')
            }}
          >
            交卷，开始对答案
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              if (confirm('放弃这次模拟考？写的答案不会保存。')) setPhase('setup')
            }}
          >
            放弃
          </button>
        </div>
      </div>
    )

  const gradedCount = Object.keys(grades).length

  if (phase === 'check')
    return (
      <div className="paper">
        <div className="paper-head">
          <div>
            <h1>对答案</h1>
            <p className="muted">
              用时 {fmt(took)} · 已自评 {gradedCount} / {list.length}
            </p>
          </div>
        </div>
        <ol className="paper-list">
          {list.map((it, n) => (
            <li key={it.id} className={grades[it.id] ? 'graded' : ''}>
              <span className="paper-no">{n + 1}</span>
              <div className="grow">
                <div className="point-line">
                  <span className="point-tag">
                    <J>{pointById.get(it.point)!.pattern}</J>
                  </span>
                </div>
                <Reveal
                  item={it}
                  fills={answers[it.id] ?? []}
                  graded={grades[it.id]}
                  onGraded={(g, tags) => {
                    const fills = answers[it.id] ?? []
                    record({
                      item: it.id,
                      point: it.point,
                      type: 'produce',
                      mode: 'exam',
                      ok: g >= 3,
                      grade: g,
                      answer: fills,
                      sentence: compose(it.prompt, fills),
                      tags,
                    })
                    setGrades((prev) => ({ ...prev, [it.id]: g }))
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
        <div className="actions">
          <button className="btn primary big" disabled={gradedCount < list.length} onClick={() => setPhase('done')}>
            {gradedCount < list.length ? `还有 ${list.length - gradedCount} 题没自评` : '看结果'}
          </button>
        </div>
      </div>
    )

  const score = list.filter((it) => grades[it.id] >= 3).length
  const weak = list.filter((it) => grades[it.id] < 3)
  return (
    <div className="card center">
      <h1>结果</h1>
      <p className="big-stat">
        <span className="ok">{score}</span> / {list.length}
      </p>
      <p className="muted">
        用时 {fmt(took)}。「对」和「很轻松」算对。没写对的文型：学过的会在今天或明天的复习里再考（有别的句子就换一句），还没学的会排到新文型的最前面。
      </p>
      {weak.length > 0 && (
        <div className="safe center">
          {weak.map((it) => (
            <a key={it.id} className="safe-chip" href={`#/point/${it.point}`}>
              <J>{pointById.get(it.point)!.pattern}</J>
            </a>
          ))}
        </div>
      )}
      <div className="actions center">
        <a className="btn primary" href="#/">
          回到今日
        </a>
        <button className="btn" onClick={() => setPhase('setup')}>
          再考一次
        </button>
      </div>
    </div>
  )
}
