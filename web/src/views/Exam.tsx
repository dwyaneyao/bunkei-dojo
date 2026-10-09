import { useEffect, useState } from 'react'
import { LESSONS, itemById, itemsOf, pointById } from '../content'
import { buildExam } from '../lib/plan'
import { record, useProgress } from '../lib/store'
import { useFocusMode } from '../lib/focus'
import { compose } from '../lib/answer'
import type { Grade } from '../lib/fsrs'
import type { ProduceItem } from '../types'
import { J } from '../lib/markup'
import Blanks from '../components/Blanks'
import { Reveal } from '../components/Steps'
import { CountUp, Icon, Ring, Stepper, Switch } from '../components/ui'

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
  useFocusMode(phase === 'paper' || phase === 'check')

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

  const n = Math.min(count, max)

  if (phase === 'setup')
    return (
      <div>
        <header className="page-head">
          <div className="eyebrow">模擬試験</div>
          <h1 className="page-title">模拟考</h1>
          <p className="page-sub">模拟真实考试：先完成整张试卷，再逐题核对答案并自评。每个文型抽取一道你近期较少练习的完成句，薄弱文型优先出题。</p>
        </header>

        <section className="card">
          <div className="exam-hero">
            <div>
              <div className="card-title">
                <Icon name="exam" />
                本次共 {n} 题
              </div>
              <p className="muted small" style={{ marginTop: 6 }}>
                题型：<span lang="ja">＿＿に書いて文を完成させてください。</span>
              </p>
            </div>
            <button
              className="btn primary big"
              disabled={max === 0}
              onClick={() => {
                setItems(buildExam(p, pointsIn, { lessons, count: n, onlyStudied }))
                setAnswers({})
                setGrades({})
                setStart(Date.now())
                setPhase('paper')
              }}
            >
              <Icon name="play" size={16} />
              开始答题
            </button>
          </div>

          <div className="option-rows">
            <div className="opt-row">
              <div className="opt-row-l">
                <b>范围</b>
                <span>选择考查的课次</span>
              </div>
              <div className="chips">
                {LESSONS.map((l) => {
                  const on = lessons.includes(l.id)
                  return (
                    <button
                      key={l.id}
                      className={'tag-btn' + (on ? ' on' : '')}
                      style={on ? { background: 'var(--ai)', borderColor: 'var(--ai)' } : undefined}
                      onClick={() => setLessons(on ? lessons.filter((x) => x !== l.id) : [...lessons, l.id])}
                    >
                      {l.title}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="opt-row">
              <div className="opt-row-l">
                <b>题数</b>
                <span>每个文型一题，最多 {max} 题</span>
              </div>
              <Stepper value={n} min={1} max={Math.max(1, max)} onChange={setCount} />
            </div>
            <div className="opt-row">
              <div className="opt-row-l">
                <b>仅考已学文型</b>
                <span>已学 {studied} 个</span>
              </div>
              <Switch checked={onlyStudied} onChange={setOnlyStudied} label="仅考已学文型" />
            </div>
          </div>
        </section>
      </div>
    )

  const list = items.map((id) => itemById.get(id) as ProduceItem)

  if (phase === 'paper')
    return (
      <div>
        <div className="exam-bar">
          <button
            className="icon-btn"
            aria-label="放弃本次模拟考"
            onClick={() => {
              if (confirm('确定放弃本次模拟考吗？已填写的答案将不会保存。')) setPhase('setup')
            }}
          >
            <Icon name="x" />
          </button>
          <span className="grow">
            已作答 {Object.values(answers).filter((a) => a.some((x) => x?.trim())).length} / {list.length}
          </span>
          <span className="timer">
            <Icon name="clock" size={16} />
            {fmt(now - start)}
          </span>
        </div>
        <div className="paper">
          <div className="paper-head">
            <div>
              <h1 lang="ja">模擬試験</h1>
              <p className="muted small" lang="ja">
                ＿＿に書いて文を完成させてください。
              </p>
            </div>
            <span className="muted small">共 {list.length} 题</span>
          </div>
          <ol className="paper-list">
            {list.map((it, k) => (
              <li key={it.id} style={{ animationDelay: `${Math.min(k, 8) * 0.04}s` }}>
                <span className="paper-no">{k + 1}</span>
                <div className="paper-item">
                  <Blanks prompt={it.prompt} values={answers[it.id] ?? []} onChange={(v) => setAnswers({ ...answers, [it.id]: v })} />
                </div>
              </li>
            ))}
          </ol>
          <div className="actions" style={{ justifyContent: 'center', marginTop: 26 }}>
            <button
              className="btn shu big"
              onClick={() => {
                setTook(Date.now() - start)
                setPhase('check')
              }}
            >
              <Icon name="check" size={18} />
              交卷并核对答案
            </button>
          </div>
        </div>
      </div>
    )

  const gradedCount = Object.keys(grades).length

  if (phase === 'check')
    return (
      <div>
        <div className="exam-bar">
          <span className="grow">
            已自评 {gradedCount} / {list.length}
          </span>
          <span className="timer">
            <Icon name="clock" size={16} />
            {fmt(took)}
          </span>
          <button className="btn primary" disabled={gradedCount < list.length} onClick={() => setPhase('done')}>
            查看结果
          </button>
        </div>
        <ol className="paper-list">
          {list.map((it, k) => (
            <li key={it.id} className={grades[it.id] ? 'graded' : ''}>
              <span className="paper-no">{k + 1}</span>
              <div className="paper-item card" style={{ padding: 20 }}>
                <span className="point-tag">
                  <J furigana={false}>{pointById.get(it.point)!.pattern}</J>
                </span>
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
        <div className="actions" style={{ justifyContent: 'center' }}>
          <button className="btn primary big" disabled={gradedCount < list.length} onClick={() => setPhase('done')}>
            {gradedCount < list.length ? `还有 ${list.length - gradedCount} 题未自评` : '查看结果'}
          </button>
        </div>
      </div>
    )

  const score = list.filter((it) => grades[it.id] >= 3).length
  const weak = list.filter((it) => grades[it.id] < 3)
  return (
    <div className="card result">
      <div className="eyebrow">結果</div>
      <Ring value={list.length ? score / list.length : 0} size={170} stroke={13} tone={score / list.length >= 0.8 ? 'ok' : 'ai'}>
        <div>
          <div className="result-score">
            <CountUp to={score} />
            <span className="muted" style={{ fontSize: '1.2rem' }}>
              {' '}
              / {list.length}
            </span>
          </div>
          <div className="muted small">用时 {fmt(took)}</div>
        </div>
      </Ring>
      <p className="muted" style={{ maxWidth: '52ch', margin: '0 auto' }}>
        自评为「正确」或「熟练」的题目计为得分。未答对的文型中，已学的会在今明两天的复习中再次出现（尽量换用其他句子），未学的会优先安排为新文型。
      </p>
      {weak.length > 0 && (
        <div className="chips" style={{ justifyContent: 'center', marginTop: 18 }}>
          {weak.map((it) => (
            <a key={it.id} className="chip" href={`#/point/${it.point}`}>
              <J furigana={false}>{pointById.get(it.point)!.pattern}</J>
            </a>
          ))}
        </div>
      )}
      <div className="actions" style={{ justifyContent: 'center', marginTop: 26 }}>
        <a className="btn primary big" href="#/">
          返回今日
        </a>
        <button className="btn big" onClick={() => setPhase('setup')}>
          再考一次
        </button>
      </div>
    </div>
  )
}
