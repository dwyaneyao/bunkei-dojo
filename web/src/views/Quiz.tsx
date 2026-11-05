import { useEffect, useState } from 'react'
import { LESSONS, itemsOf, lessonsIn, pointsIn, scopeOf } from '../content'
import { buildQuiz, buildSpeed, speedPoolSize } from '../lib/plan'
import { useProgress } from '../lib/store'
import { QUIZ_KEY, SPEED_KEY, resume, startQuiz, writeSaved, type Saved } from '../lib/sessions'
import { Icon, Segmented, Stepper, Switch } from '../components/ui'
import LessonPicker from '../components/LessonPicker'

type Kind = 'quiz' | 'speed'

const KINDS: Record<Kind, { key: string; name: string; sub: string; ask: string }> = {
  quiz: {
    key: QUIZ_KEY,
    name: '常规测试',
    sub: '开放填空：每个文型出一道完成句，按中文意思用日语填空。每题写完就能对照标准答案并自评。',
    ask: '题型：按中文意思填空，完成句子',
  },
  speed: {
    key: SPEED_KEY,
    name: '速测',
    sub: '选择题：快速排查文型的意思和接续。干扰项都是容易混淆的文型或接法，没记住就会选错。',
    ask: '题型：选择题（意思辨析・接续辨析・句子含义）',
  },
}

const SPEED_DEFAULT = 20

/** 测试: a set of questions over a lesson, answered and checked one by one in a normal session, no clock. Each
 *  kind keeps its own set until it is finished or given up, so it can be left and resumed at any time. */
export default function Quiz() {
  const p = useProgress()
  const [kind, setKind] = useState<Kind>('quiz')
  const [current, setCurrent] = useState<Record<Kind, Saved | null>>(() => ({ quiz: resume(QUIZ_KEY), speed: resume(SPEED_KEY) }))
  const [scope, setScope] = useState(() => scopeOf(p.settings.lesson))
  const [onlyStudied, setOnlyStudied] = useState(false)
  // null: the default for the kind (one per point for 常规测试, SPEED_DEFAULT for 速测).
  const [count, setCount] = useState<number | null>(null)

  // The former mock exam kept its unfinished sheet here; it can no longer be opened.
  useEffect(() => {
    try {
      localStorage.removeItem('bunkei-dojo.exam')
    } catch {
      /* storage blocked */
    }
  }, [])

  const k = KINDS[kind]
  const inScope = pointsIn(scope).map((pt) => pt.id)
  const studiedPoints = inScope.filter((id) => p.intro[id])
  const points = onlyStudied ? studiedPoints : inScope
  const max =
    kind === 'quiz' ? points.filter((id) => itemsOf(id).some((i) => i.type === 'produce')).length : speedPoolSize(points)
  const n = Math.min(count ?? (kind === 'quiz' ? max : SPEED_DEFAULT), max)
  const label = (scope === 'all' ? '全部课程' : lessonsIn(scope)[0]?.title ?? scope) + (kind === 'speed' ? ' · 速测' : ' · 常规测试')
  const cur = current[kind]

  const giveUp = (which: Kind) => {
    writeSaved(KINDS[which].key, null)
    setCurrent({ ...current, [which]: null })
  }

  const start = () => {
    if (cur && !confirm(`放弃进行中的「${cur.label ?? k.name}」（${cur.i} / ${cur.steps.length}），重新出题吗？`)) return
    const items = kind === 'quiz' ? buildQuiz(p, points, { count: n, onlyStudied: false }) : buildSpeed(p, points, n)
    startQuiz(k.key, items, label)
    location.hash = `#/session/${kind}`
  }

  return (
    <div>
      <header className="page-head">
        <div className="eyebrow">テスト</div>
        <h1 className="page-title">测试</h1>
        <p className="page-sub">选一课出一组题：常规测试是开放填空，速测是选择题。逐题作答、马上对照答案；没有时间限制，可以随时退出，回来接着做。</p>
      </header>

      {(['quiz', 'speed'] as Kind[]).map((w) => {
        const c = current[w]
        return (
          c && (
            <section key={w} className="card quiz-current">
              <div className="card-head">
                <h2 className="card-title">
                  <Icon name="pen" />
                  进行中：{c.label ?? KINDS[w].name}
                </h2>
                <span className="muted small">
                  已做 {c.i} / {c.steps.length} 题
                </span>
              </div>
              <div className="actions">
                <a className="btn primary big" href={`#/session/${w}`}>
                  <Icon name="play" size={16} />
                  继续
                </a>
                <button
                  className="btn big"
                  onClick={() => {
                    if (confirm('放弃这一组题吗？已作答的记录会保留。')) giveUp(w)
                  }}
                >
                  放弃
                </button>
              </div>
            </section>
          )
        )
      })}

      <section className="card">
        <Segmented<Kind>
          value={kind}
          onChange={(v) => {
            setKind(v)
            setCount(null)
          }}
          options={[
            { value: 'quiz', label: '常规测试（填空）' },
            { value: 'speed', label: '速测（选择）' },
          ]}
        />
        <p className="muted small" style={{ marginTop: 12 }}>
          {k.sub}
        </p>

        <div className="exam-hero" style={{ marginTop: 18 }}>
          <div>
            <div className="card-title">
              <Icon name="exam" />
              {label} · 共 {n} 题
            </div>
            <p className="muted small" style={{ marginTop: 6 }}>
              {k.ask}
            </p>
          </div>
          <button className="btn primary big" disabled={max === 0} onClick={start}>
            <Icon name="play" size={16} />
            {cur ? '重新出题' : '开始出题'}
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
              <span>
                {kind === 'quiz'
                  ? `每个文型一题，最多 ${max} 题；薄弱、久未练习的文型优先`
                  : `题库共 ${max} 题；答错过和久未做的题优先，各文型轮流出`}
              </span>
            </div>
            <Stepper value={n} min={1} max={Math.max(1, max)} onChange={setCount} />
          </div>
          <div className="opt-row">
            <div className="opt-row-l">
              <b>只出已学文型</b>
              <span>已学 {studiedPoints.length} 个</span>
            </div>
            <Switch checked={onlyStudied} onChange={setOnlyStudied} label="只出已学文型" />
          </div>
        </div>
      </section>
    </div>
  )
}
