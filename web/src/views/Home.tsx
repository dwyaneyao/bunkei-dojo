import { LESSONS, PROBLEMS, pointById } from '../content'
import { buildDaily, errorStats, LEVEL_HINT, LEVELS, mastery, streak } from '../lib/plan'
import { dayKey, useProgress } from '../lib/store'
import { J } from '../lib/markup'
import { TAG_HINT, TAG_LABEL } from '../types'
import { daysUntil } from '../lib/util'

export default function Home() {
  const p = useProgress()
  const plan = buildDaily(p)
  const stats = errorStats(p)
  const left = daysUntil(p.settings.examDate)
  const s = streak(p)
  const total = plan.steps.length
  const todayLog = p.log.filter((a) => dayKey(a.t) === dayKey(Date.now()))

  return (
    <div className="home">
      {PROBLEMS.length > 0 && (
        <div className="card warn">
          <b>内容文件有问题：</b>
          <ul>
            {PROBLEMS.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="today card">
        <div className="today-main">
          <h1>今日练习</h1>
          {total > 0 ? (
            <p className="today-line">
              复习 <b>{plan.reviews}</b> 题
              {plan.newPoints.length > 0 && (
                <>
                  {' '}
                  · 新文型 <b>{plan.newPoints.length}</b> 个
                </>
              )}
              {' '}
              · 共 <b>{total}</b> 步
            </p>
          ) : (
            <p className="today-line">今天的任务都完成了。</p>
          )}
          {plan.newPoints.length > 0 && (
            <div className="safe">
              {plan.newPoints.map((id) => (
                <span key={id} className="safe-chip">
                  <J>{pointById.get(id)!.pattern}</J>
                </span>
              ))}
            </div>
          )}
          <div className="actions">
            {total > 0 ? (
              <a className="btn primary big" href="#/session">
                开始
              </a>
            ) : (
              <a className="btn primary big" href="#/exam">
                做一次模拟考
              </a>
            )}
          </div>
        </div>
        <div className="today-side">
          <div className="stat" title={todayLog.length ? `其中对了 ${todayLog.filter((a) => a.ok).length} 题` : ''}>
            <span className="stat-n">{todayLog.length}</span>
            <span className="stat-l">今天做了（题）</span>
          </div>
          <div className="stat">
            <span className="stat-n">{s}</span>
            <span className="stat-l">连续天数</span>
          </div>
          {left !== null && left >= 0 ? (
            <div className="stat">
              <span className="stat-n">{left}</span>
              <span className="stat-l">距考试（天）</span>
            </div>
          ) : (
            <a className="stat link" href="#/settings">
              <span className="stat-n">＋</span>
              <span className="stat-l">设置考试日期</span>
            </a>
          )}
        </div>
      </section>

      {LESSONS.map((l) => {
        const levels = l.points.map((pt) => mastery(p, pt.id))
        const counts = [0, 1, 2, 3, 4].map((n) => levels.filter((m) => m.level === n).length)
        return (
          <section key={l.id} className="card">
            <div className="row between">
              <h2>{l.title}</h2>
              <span className="muted small">
                {counts.map((c, n) => (c ? `${LEVELS[n]} ${c}` : '')).filter(Boolean).join(' · ')}
              </span>
            </div>
            {l.groups.map((g) => (
              <div key={g.id} className="map-row">
                <span className="map-group">{g.title}</span>
                <div className="map-points">
                  {l.points
                    .filter((pt) => pt.group === g.id)
                    .map((pt) => {
                      const m = mastery(p, pt.id)
                      return (
                        <a
                          key={pt.id}
                          href={`#/point/${pt.id}`}
                          className={`mp lv${m.level}` + (m.lastFail ? ' fail' : '')}
                          title={`${LEVELS[m.level]}：${LEVEL_HINT[m.level]}${m.lastFail ? '（最近一次错）' : ''}`}
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
                <span key={n} className="legend-item" title={LEVEL_HINT[n]}>
                  <i className={`dot lv${n}`} />
                  {name}
                </span>
              ))}
              <span className="legend-item" title="最近一次作答是错的">
                <i className="dot fail" />
                最近错过
              </span>
            </div>
          </section>
        )
      })}

      <section className="card">
        <h2>最近 30 天的错因</h2>
        {stats.byTag.length === 0 ? (
          <p className="muted">还没有错题记录。做题时选择「哪里不对」，这里会统计你最常出问题的环节。</p>
        ) : (
          <div className="err-grid">
            <div>
              {stats.byTag.map(([t, n]) => (
                <div key={t} className="err-row" title={TAG_HINT[t]}>
                  <span className="err-name">{TAG_LABEL[t]}</span>
                  <span className="err-bar">
                    <i style={{ width: `${(n / stats.byTag[0][1]) * 100}%` }} />
                  </span>
                  <span className="err-n">{n}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="muted small">错得最多的文型</p>
              <div className="safe">
                {stats.byPoint.slice(0, 8).map(([id, n]) => (
                  <a key={id} className="safe-chip" href={`#/point/${id}`}>
                    <J>{pointById.get(id)!.pattern}</J> <span className="muted">×{n}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
