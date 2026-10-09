import { useEffect, useState } from 'react'
import { itemById, itemsOf, pointById } from '../content'
import { buildDaily, buildDrill, type Step } from '../lib/plan'
import { dayKey, getProgress, markIntro, useProgress, type Mode } from '../lib/store'
import { useFocusMode } from '../lib/focus'
import { J } from '../lib/markup'
import PointCard from '../components/PointCard'
import { ChoiceStep, FormStep, ProduceStep, type StepResult } from '../components/Steps'
import { CountUp, Icon, Stamp } from '../components/ui'

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

  const step = steps[i]
  const total = steps.length
  useFocusMode(!!step)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [i])

  const exitHref = mode === 'drill' && point ? `#/point/${point}` : '#/'

  if (total === 0)
    return (
      <div className="card finish">
        <Stamp kind="ok" size={84} />
        <h1>今天没有要做的了</h1>
        <p className="muted">复习都做完了，新文型也到了每天的上限。可以做一次模拟考，或者到「文型」里专练某一个。</p>
        <div className="actions" style={{ justifyContent: 'center' }}>
          <a className="btn primary big" href="#/exam">
            做模拟考
          </a>
          <a className="btn big" href="#/points">
            文型
          </a>
        </div>
      </div>
    )

  if (!step) {
    const n = tally.ok + tally.bad
    return (
      <div className="card finish">
        <Stamp kind={tally.bad === 0 ? 'ok' : 'tri'} size={92} />
        <h1 lang="ja">お疲れさまでした</h1>
        <p className="muted">这一轮完成了</p>
        <div className="finish-stats">
          <div>
            <b className="ok">
              <CountUp to={tally.ok} />
            </b>
            <span className="muted small">对</span>
          </div>
          <div>
            <b className="bad">
              <CountUp to={tally.bad} />
            </b>
            <span className="muted small">错</span>
          </div>
          <div>
            <b>
              <CountUp to={n ? Math.round((tally.ok / n) * 100) : 0} />%
            </b>
            <span className="muted small">正确率</span>
          </div>
        </div>
        {tally.missed.length > 0 && (
          <>
            <p className="muted small">错过的文型，已经安排更早复习：</p>
            <div className="chips" style={{ justifyContent: 'center', marginTop: 10 }}>
              {[...new Set(tally.missed)].map((id) => (
                <a key={id} className="chip" href={`#/point/${id}`}>
                  <J furigana={false}>{pointById.get(id)?.pattern ?? id}</J>
                </a>
              ))}
            </div>
          </>
        )}
        <div className="actions" style={{ justifyContent: 'center', marginTop: 26 }}>
          <a className="btn primary big" href="#/">
            回到今日
          </a>
          {mode === 'drill' && point && (
            <a className="btn big" href={`#/point/${point}`}>
              回到文型卡
            </a>
          )}
        </div>
      </div>
    )
  }

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
      <div className="step" key={i}>
        <div className="step-kind" style={{ marginBottom: 14 }}>
          <Icon name="sparkle" size={16} />
          新文型
        </div>
        <PointCard point={pt} />
        <div className="sticky-cta">
          <button
            className="btn primary big"
            onClick={() => {
              markIntro(pt.id)
              setI(i + 1)
            }}
          >
            看完了，开始练
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </div>
    )
  } else {
    const it = itemById.get(step.item)
    if (!it)
      body = (
        <div className="step step-card" key={i}>
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
      <div className="focus-bar">
        <a className="icon-btn" href={exitHref} aria-label="结束练习" title="结束练习（已做的都保存了）">
          <Icon name="x" />
        </a>
        <div className="progress" aria-label={`进度 ${i + 1} / ${total}`}>
          <i style={{ width: `${(i / total) * 100}%` }} />
        </div>
        <span className="progress-n">
          {i + 1} / {total}
        </span>
      </div>
      {body}
    </div>
  )
}
