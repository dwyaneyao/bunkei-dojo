import { itemsOf, pointById } from '../content'
import { LEVEL_HINT, LEVELS, mastery } from '../lib/plan'
import { useProgress } from '../lib/store'
import { formatInterval } from '../lib/fsrs'
import { J } from '../lib/markup'
import PointCard from '../components/PointCard'

const KIND = { form: '接续', choice: '辨析', produce: '完成句' } as const

export default function PointView({ id }: { id: string }) {
  const p = useProgress()
  const pt = pointById.get(id)
  if (!pt) return <p className="muted">找不到这个文型。</p>
  const m = mastery(p, id)
  const items = itemsOf(id)
  const now = Date.now()

  return (
    <div className="point-view">
      <div className="row between">
        <a href="#/points" className="muted">
          ← 文型表
        </a>
        <a className="btn primary" href={`#/session/drill/${id}`}>
          专练这个文型（{items.length} 题）
        </a>
      </div>
      <PointCard point={pt} />
      <section className="card">
        <div className="row between">
          <h3>
            掌握程度：<span className={`lv-text lv${m.level}`}>{LEVELS[m.level]}</span>
          </h3>
          <span className="muted small">{LEVEL_HINT[m.level]}</span>
        </div>
        <table className="items">
          <thead>
            <tr>
              <th>题型</th>
              <th>题目</th>
              <th>最近</th>
              <th>下次复习</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const card = p.cards[it.id]
              const last = [...p.log].reverse().find((a) => a.item === it.id)
              const text = it.type === 'form' ? it.cue : it.prompt
              return (
                <tr key={it.id}>
                  <td className="nowrap">{KIND[it.type]}</td>
                  <td className="ja">
                    <J>{text}</J>
                  </td>
                  <td className="nowrap">{last ? (last.ok ? <span className="ok">✓</span> : <span className="bad">✗</span>) : <span className="muted">—</span>}</td>
                  <td className="nowrap muted">{card ? (card.due <= now ? '现在' : formatInterval(card.due - now) + '后') : '未做'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
