import { LESSONS, PROBLEMS, pointById } from '../content'
import { buildDaily, errorStats, LEVEL_HINT, LEVELS, mastery, streak } from '../lib/plan'
import { dayKey, useProgress } from '../lib/store'
import { useCloud } from '../lib/cloud'
import { J } from '../lib/markup'
import { TAG_HINT, TAG_LABEL } from '../types'
import { daysUntil } from '../lib/util'
import { CountUp, Icon, Ring } from '../components/ui'

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

function greeting(h: number) {
  if (h < 5) return 'お疲れさまです'
  if (h < 11) return 'おはようございます'
  if (h < 18) return 'こんにちは'
  return 'こんばんは'
}

export default function Home() {
  const p = useProgress()
  const cloud = useCloud()
  const now = new Date()
  const plan = buildDaily(p)
  const stats = errorStats(p)
  const left = daysUntil(p.settings.examDate)
  const s = streak(p)
  const remaining = plan.steps.length
  const todayLog = p.log.filter((a) => dayKey(a.t) === dayKey(Date.now()))
  const done = todayLog.length
  const acc = done ? Math.round((todayLog.filter((a) => a.ok).length / done) * 100) : null
  const allPoints = LESSONS.flatMap((l) => l.points)
  const solid = allPoints.filter((pt) => mastery(p, pt.id).level >= 3).length
  const firstName = (cloud.name ?? '').split(/\s+/)[0]

  return (
    <div className="home">
      {PROBLEMS.length > 0 && (
        <div className="card warn small">
          <b>内容文件存在问题：</b>
          <ul>
            {PROBLEMS.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      <header className="greet">
        <div>
          <div className="greet-date">
            {now.getMonth() + 1}月{now.getDate()}日 · 星期{WEEK[now.getDay()]}
          </div>
          <h1 lang="ja">
            {greeting(now.getHours())}
            {firstName && `、${firstName}`}
          </h1>
        </div>
      </header>

      <section className="hero">
        <div className="hero-main">
          <div className="eyebrow">今日の稽古</div>
          {remaining > 0 ? (
            <>
              <h2>{done > 0 ? '继续今日练习' : '开始今日练习'}</h2>
              <p className="hero-line">
                复习 <b>{plan.reviews}</b> 题
                {plan.newPoints.length > 0 && (
                  <>
                    {' '}
                    · 新文型 <b>{plan.newPoints.length}</b> 个
                  </>
                )}{' '}
                · 共 <b>{remaining}</b> 项
              </p>
              {plan.newPoints.length > 0 && (
                <div className="chips">
                  {plan.newPoints.map((id) => (
                    <span key={id} className="chip">
                      <J furigana={false}>{pointById.get(id)!.pattern}</J>
                    </span>
                  ))}
                </div>
              )}
              <div className="actions">
                <a className="btn light big" href="#/session">
                  <Icon name="play" size={16} />
                  {done > 0 ? '继续练习' : '开始练习'}
                </a>
              </div>
            </>
          ) : (
            <>
              <h2>今日练习已完成</h2>
              <p className="hero-line">到期的复习已全部完成，新文型也已达到今日上限。如需继续练习，可以进行一次模拟考。</p>
              <div className="actions">
                <a className="btn light big" href="#/exam">
                  <Icon name="exam" size={18} />
                  开始模拟考
                </a>
              </div>
            </>
          )}
        </div>
        <Ring value={done + remaining ? done / (done + remaining) : 1} size={132} stroke={11} tone="light">
          <div>
            <div className="ring-num">
              <CountUp to={done} />
            </div>
            <div className="ring-label">今日已答</div>
          </div>
        </Ring>
      </section>

      <section className="stats stagger">
        <div className="stat">
          <span className="stat-ico kin">
            <Icon name="flame" />
          </span>
          <span className="stat-n">
            <CountUp to={s} />
            <small>天</small>
          </span>
          <span className="stat-l">连续练习</span>
        </div>
        <div className="stat">
          <span className="stat-ico ok">
            <Icon name="target" />
          </span>
          <span className="stat-n">
            {acc === null ? '—' : <CountUp to={acc} />}
            {acc !== null && <small>%</small>}
          </span>
          <span className="stat-l">今日正确率</span>
        </div>
        <a className="stat" href="#/points">
          <span className="stat-ico ai">
            <Icon name="layers" />
          </span>
          <span className="stat-n">
            <CountUp to={solid} />
            <small>/ {allPoints.length}</small>
          </span>
          <span className="stat-l">已巩固文型</span>
        </a>
        <a className="stat" href="#/me">
          <span className="stat-ico shu">
            <Icon name="calendar" />
          </span>
          {left !== null && left >= 0 ? (
            <>
              <span className="stat-n">
                <CountUp to={left} />
                <small>天</small>
              </span>
              <span className="stat-l">距离考试</span>
            </>
          ) : (
            <>
              <span className="stat-n">＋</span>
              <span className="stat-l">设置考试日期</span>
            </>
          )}
        </a>
      </section>

      {LESSONS.map((l) => {
        const levels = l.points.map((pt) => mastery(p, pt.id))
        const counts = [0, 1, 2, 3, 4].map((n) => levels.filter((m) => m.level === n).length)
        return (
          <section key={l.id} className="card">
            <div className="card-head">
              <h2 className="card-title">
                <Icon name="layers" />
                {l.title} · 掌握概览
              </h2>
              <span className="muted small">
                {counts.map((c, n) => (c ? `${LEVELS[n]} ${c}` : '')).filter(Boolean).join(' · ')}
              </span>
            </div>
            {l.groups.map((g) => (
              <div key={g.id} className="map-group">
                <span className="map-label">{g.title}</span>
                <div className="map-tiles">
                  {l.points
                    .filter((pt) => pt.group === g.id)
                    .map((pt) => {
                      const m = mastery(p, pt.id)
                      return (
                        <a
                          key={pt.id}
                          href={`#/point/${pt.id}`}
                          className={`tile lv${m.level}` + (m.lastFail ? ' fail' : '')}
                          title={`${LEVELS[m.level]}：${LEVEL_HINT[m.level]}${m.lastFail ? '（最近一次答错）' : ''}`}
                        >
                          <J furigana={false}>{pt.pattern}</J>
                        </a>
                      )
                    })}
                </div>
              </div>
            ))}
            <div className="legend">
              {LEVELS.map((name, n) => (
                <span key={n} title={LEVEL_HINT[n]}>
                  <i className={`dot lv${n}`} />
                  {name}
                </span>
              ))}
              <span>
                <i className="dot lv0 fail" />
                最近答错
              </span>
            </div>
          </section>
        )
      })}

      <section className="two-col">
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">
              <Icon name="chart" />
              近 30 天错误类型
            </h2>
          </div>
          {stats.byTag.length === 0 ? (
            <p className="empty small">暂无错题记录。完成句自评时标注错误类型后，这里会统计你最常出错的环节。</p>
          ) : (
            <div className="bars">
              {stats.byTag.map(([t, n]) => (
                <div key={t} className="bar-row" title={TAG_HINT[t]}>
                  <span>{TAG_LABEL[t]}</span>
                  <span className="bar">
                    <i style={{ width: `${(n / stats.byTag[0][1]) * 100}%` }} />
                  </span>
                  <span className="bar-n">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">
              <Icon name="target" />
              待加强文型
            </h2>
          </div>
          {stats.byPoint.length === 0 ? (
            <p className="empty small">暂无。答错过的文型会显示在这里。</p>
          ) : (
            <div className="chips">
              {stats.byPoint.slice(0, 8).map(([id, n]) => (
                <a key={id} className="chip" href={`#/point/${id}`}>
                  <J furigana={false}>{pointById.get(id)!.pattern}</J>
                  <span className="muted">×{n}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
