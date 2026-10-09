import { itemsOf, lessonOfPoint, pointById } from '../content'
import { LEVEL_HINT, LEVELS, mastery } from '../lib/plan'
import { useProgress } from '../lib/store'
import { formatInterval } from '../lib/fsrs'
import { J } from '../lib/markup'
import PointCard from '../components/PointCard'
import { Icon } from '../components/ui'

const KIND = { form: '接续', choice: '辨析', produce: '完成句' } as const

export default function PointView({ id }: { id: string }) {
  const p = useProgress()
  const pt = pointById.get(id)
  if (!pt) return <p className="empty">未找到该文型。</p>
  const m = mastery(p, id)
  const items = itemsOf(id)
  const now = Date.now()
  const lesson = lessonOfPoint.get(id)

  return (
    <div className="point-view">
      <a href="#/points" className="back">
        <Icon name="left" size={18} />
        文型列表
      </a>

      <div className="stagger">
        <PointCard
          point={pt}
          aside={
            <div className="pv-cta">
              <div>
                <div className="level-pill">
                  <i className={`dot lv${m.level}` + (m.lastFail ? ' fail' : '')} />
                  {LEVELS[m.level]}
                </div>
                <p className="muted small" style={{ marginTop: 2 }}>
                  {LEVEL_HINT[m.level]}
                </p>
              </div>
              <a className="btn primary" href={`#/session/drill/${id}`}>
                <Icon name="pen" size={18} />
                专项练习
              </a>
            </div>
          }
        />

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <Icon name="exam" />
              练习题 · {items.length} 道
            </h2>
            <span className="muted small">{lesson?.title}</span>
          </div>
          <ul className="item-list">
            {items.map((it) => {
              const card = p.cards[it.id]
              const last = [...p.log].reverse().find((a) => a.item === it.id)
              const text = it.type === 'form' ? it.cue : it.prompt
              return (
                <li key={it.id}>
                  <span className="item-kind">{KIND[it.type]}</span>
                  <span className="item-text">
                    <J furigana={false}>{text}</J>
                  </span>
                  <span className="item-state">
                    {last && (last.ok ? <Icon name="check" size={16} className="ok" /> : <Icon name="x" size={16} className="bad" />)}
                    {card ? (card.due <= now ? '待复习' : formatInterval(card.due - now) + '后复习') : '未作答'}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
