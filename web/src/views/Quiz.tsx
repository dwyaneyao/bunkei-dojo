import { useEffect, useState } from 'react'
import { LESSONS, itemsOf, lessonsIn, pointsIn, scopeOf } from '../content'
import { buildQuiz } from '../lib/plan'
import { useProgress } from '../lib/store'
import { QUIZ_KEY, resume, startQuiz, writeSaved } from '../lib/sessions'
import { Icon, Stepper, Switch } from '../components/ui'
import LessonPicker from '../components/LessonPicker'

/** 按课出题: one exam-style item per point of a lesson, answered and checked one by one in a normal session, no
 *  clock. The set is kept until it is finished or given up, so it can be left and resumed at any time. */
export default function Quiz() {
  const p = useProgress()
  const [current, setCurrent] = useState(() => resume(QUIZ_KEY))
  const [scope, setScope] = useState(() => scopeOf(p.settings.lesson))
  const [onlyStudied, setOnlyStudied] = useState(false)
  // null: as many as the range allows (one per point).
  const [count, setCount] = useState<number | null>(null)

  // The former mock exam kept its unfinished sheet here; it can no longer be opened.
  useEffect(() => {
    try {
      localStorage.removeItem('bunkei-dojo.exam')
    } catch {
      /* storage blocked */
    }
  }, [])

  const inScope = pointsIn(scope).map((pt) => pt.id)
  const withProduce = inScope.filter((id) => itemsOf(id).some((i) => i.type === 'produce'))
  const studied = withProduce.filter((id) => p.intro[id]).length
  const max = onlyStudied ? studied : withProduce.length
  const n = Math.min(count ?? max, max)
  const label = scope === 'all' ? '全部课程' : lessonsIn(scope)[0]?.title ?? scope

  const giveUp = () => {
    writeSaved(QUIZ_KEY, null)
    setCurrent(null)
  }

  return (
    <div>
      <header className="page-head">
        <div className="eyebrow">課ごとの練習</div>
        <h1 className="page-title">按课出题</h1>
        <p className="page-sub">选一课，每个文型出一道完成句。每题写完就能对照标准答案；没有时间限制，可以随时退出，回来接着做。</p>
      </header>

      {current && (
        <section className="card quiz-current">
          <div className="card-head">
            <h2 className="card-title">
              <Icon name="pen" />
              进行中：{current.label ?? '按课出题'}
            </h2>
            <span className="muted small">
              已做 {current.i} / {current.steps.length} 题
            </span>
          </div>
          <div className="actions">
            <a className="btn primary big" href="#/session/quiz">
              <Icon name="play" size={16} />
              继续
            </a>
            <button
              className="btn big"
              onClick={() => {
                if (confirm('放弃这一组题吗？已作答的记录会保留。')) giveUp()
              }}
            >
              放弃
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <div className="exam-hero">
          <div>
            <div className="card-title">
              <Icon name="exam" />
              {label} · 共 {n} 题
            </div>
            <p className="muted small" style={{ marginTop: 6 }}>
              题型：按中文意思填空，完成句子
            </p>
          </div>
          <button
            className="btn primary big"
            disabled={max === 0}
            onClick={() => {
              if (current && !confirm(`放弃进行中的「${current.label ?? '按课出题'}」（${current.i} / ${current.steps.length}），重新出题吗？`))
                return
              startQuiz(buildQuiz(p, inScope, { count: n, onlyStudied }), label)
              location.hash = '#/session/quiz'
            }}
          >
            <Icon name="play" size={16} />
            {current ? '重新出题' : '开始出题'}
          </button>
        </div>

        <div className="option-rows">
          {LESSONS.length > 1 && (
            <div className="opt-row">
              <div className="opt-row-l">
                <b>范围</b>
                <span>选择出题的课</span>
              </div>
              <LessonPicker
                value={scope}
                onChange={(v) => {
                  setScope(v)
                  setCount(null)
                }}
              />
            </div>
          )}
          <div className="opt-row">
            <div className="opt-row-l">
              <b>题数</b>
              <span>每个文型一题，最多 {max} 题；薄弱、久未练习的文型优先</span>
            </div>
            <Stepper value={n} min={1} max={Math.max(1, max)} onChange={setCount} />
          </div>
          <div className="opt-row">
            <div className="opt-row-l">
              <b>只出已学文型</b>
              <span>已学 {studied} 个</span>
            </div>
            <Switch checked={onlyStudied} onChange={setOnlyStudied} label="只出已学文型" />
          </div>
        </div>
      </section>
    </div>
  )
}
