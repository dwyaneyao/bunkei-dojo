import { LESSONS, itemsOf } from '../content'
import { LEVELS, mastery } from '../lib/plan'
import { useProgress } from '../lib/store'
import { J } from '../lib/markup'

export default function Points() {
  const p = useProgress()
  return (
    <div>
      {LESSONS.map((l) => (
        <section key={l.id} className="card">
          <h1>{l.title}</h1>
          <p className="muted small">来源：{l.source}</p>
          {l.groups.map((g) => (
            <div key={g.id} className="group">
              <h3 className="group-title">{g.title}</h3>
              <div className="point-grid">
                {l.points
                  .filter((pt) => pt.group === g.id)
                  .map((pt) => {
                    const m = mastery(p, pt.id)
                    const n = itemsOf(pt.id).length
                    return (
                      <a key={pt.id} href={`#/point/${pt.id}`} className={`point-tile lv${m.level}`}>
                        <div className="pt-pattern">
                          <J furigana={false}>{pt.pattern}</J>
                        </div>
                        <div className="pt-meaning">
                          <J furigana={false}>{pt.meaning}</J>
                        </div>
                        <div className="pt-foot">
                          <span>
                            <i className={`dot lv${m.level}` + (m.lastFail ? ' fail' : '')} /> {LEVELS[m.level]}
                          </span>
                          <span className="muted">{n} 题</span>
                        </div>
                      </a>
                    )
                  })}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
