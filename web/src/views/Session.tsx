import { useEffect, useState } from 'react'
import { itemById, itemsOf, pointById } from '../content'
import { buildDaily, buildDrill, type Step } from '../lib/plan'
import { dayKey, getProgress, markIntro, useProgress, type Mode } from '../lib/store'
import { J } from '../lib/markup'
import PointCard from '../components/PointCard'
import { ChoiceStep, FormStep, ProduceStep, type StepResult } from '../components/Steps'

interface Tally {
  ok: number
  bad: number
  missed: string[]
}

export default function Session({ mode, point }: { mode: Exclude<Mode, 'exam'>; point?: string }) {
  const p = useProgress()
  // The queue is fixed when the session starts; retries are spliced in as we go.
  const [steps, setSteps] = useState<Step[]>(() => (mode === 'drill' && point ? buildDrill(point) : buildDaily(p).steps))
  const [i, setI] = useState(0)
  const [tally, setTally] = useState<Tally>({ ok: 0, bad: 0, missed: [] })
  const [retried] = useState(() => new Set<string>())

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [i])

  const step = steps[i]
  const total = steps.length

  if (total === 0)
    return (
      <div className="card center">
        <h2>今天没有要做的了</h2>
        <p className="muted">复习都做完了，新文型也已经达到每日上限。可以去做一次模拟考，或者到「文型表」专练某个文型。</p>
        <div className="actions center">
          <a className="btn primary" href="#/exam">
            做模拟考
          </a>
          <a className="btn" href="#/points">
            文型表
          </a>
        </div>
      </div>
    )

  if (!step)
    return (
      <div className="card center">
        <h2>这一轮完成了</h2>
        <p className="big-stat">
          <span className="ok">{tally.ok}</span> 对 · <span className="bad">{tally.bad}</span> 错
        </p>
        {tally.missed.length > 0 && (
          <div className="missed">
            <p className="muted">错过的文型（已自动安排更早复习）：</p>
            <div className="safe">
              {[...new Set(tally.missed)].map((id) => (
                <a key={id} className="safe-chip" href={`#/point/${id}`}>
                  <J>{pointById.get(id)?.pattern ?? id}</J>
                </a>
              ))}
            </div>
          </div>
        )}
        <div className="actions center">
          <a className="btn primary" href="#/">
            回到今日
          </a>
          {mode === 'drill' && point && (
            <a className="btn" href={`#/point/${point}`}>
              回到文型卡
            </a>
          )}
        </div>
      </div>
    )

  const done = (r: StepResult, itemId: string) => {
    const it = itemById.get(itemId)!
    setTally((t) => ({ ok: t.ok + (r.ok ? 1 : 0), bad: t.bad + (r.ok ? 0 : 1), missed: r.ok ? t.missed : [...t.missed, it.point] }))
    if (!r.ok) {
      const next = [...steps]
      const at = Math.min(next.length, i + 4)
      if (it.type !== 'produce' && !retried.has(itemId)) {
        // Quick items: one retry a few steps later.
        retried.add(itemId)
        next.splice(at, 0, { kind: 'item', item: itemId })
      } else if (it.type === 'produce') {
        // Exam-style item: re-test with a *different* sentence of the same point, one whose model answer
        // has not been on screen today.
        const today = dayKey(Date.now())
        const seen = new Set(getProgress().log.filter((a) => dayKey(a.t) === today).map((a) => a.item))
        const queued = new Set(next.map((s) => (s.kind === 'item' ? s.item : '')))
        const other = itemsOf(it.point).find(
          (x) => x.type === 'produce' && x.id !== itemId && !queued.has(x.id) && !retried.has(x.id) && !seen.has(x.id),
        )
        if (other) {
          retried.add(other.id)
          next.splice(at, 0, { kind: 'item', item: other.id })
        }
      }
      setSteps(next)
    }
    setI(i + 1)
  }

  let body
  if (step.kind === 'learn') {
    const pt = pointById.get(step.point)!
    body = (
      <div className="step">
        <div className="step-kind">新文型</div>
        <PointCard point={pt} />
        <div className="actions">
          <button
            className="btn primary"
            onClick={() => {
              markIntro(pt.id)
              setI(i + 1)
            }}
          >
            看完了，开始练
          </button>
        </div>
      </div>
    )
  } else {
    const it = itemById.get(step.item)
    if (!it)
      body = (
        <div className="step">
          <p className="muted">题目 {step.item} 不存在（内容可能改过）。</p>
          <button className="btn" onClick={() => setI(i + 1)}>
            跳过
          </button>
        </div>
      )
    else if (it.type === 'form') body = <FormStep key={i} item={it} mode={mode} onDone={(r) => done(r, it.id)} />
    else if (it.type === 'choice') body = <ChoiceStep key={i} item={it} mode={mode} onDone={(r) => done(r, it.id)} />
    else body = <ProduceStep key={i} item={it} mode={mode} onDone={(r) => done(r, it.id)} />
  }

  return (
    <div className="session">
      <div className="progress">
        <div className="bar" style={{ width: `${(i / total) * 100}%` }} />
        <span className="count">
          {i + 1} / {total}
        </span>
      </div>
      {body}
    </div>
  )
}
