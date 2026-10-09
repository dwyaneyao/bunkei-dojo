import { useState } from 'react'
import { LESSONS, itemsOf } from '../content'
import { LEVELS, mastery } from '../lib/plan'
import { useProgress } from '../lib/store'
import { J, plain } from '../lib/markup'
import { Icon, Segmented } from '../components/ui'

type Filter = 'all' | 'new' | 'learning' | 'solid'

export default function Points() {
  const p = useProgress()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  const keep = (id: string, pattern: string, meaning: string) => {
    const lv = mastery(p, id).level
    if (filter === 'new' && lv !== 0) return false
    if (filter === 'learning' && (lv === 0 || lv >= 3)) return false
    if (filter === 'solid' && lv < 3) return false
    if (query && !(plain(pattern) + plain(meaning)).toLowerCase().includes(query)) return false
    return true
  }

  return (
    <div>
      <header className="page-head">
        <div className="eyebrow">文型一覧</div>
        <h1 className="page-title">文型</h1>
        <p className="page-sub">按讲义顺序排列。点击文型可查看完整讲解，或进行专项练习。</p>
      </header>

      <div className="toolbar">
        <label className="input-icon">
          <Icon name="search" size={18} />
          <input className="input" placeholder="搜索文型或释义" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: '全部' },
            { value: 'new', label: '未学习' },
            { value: 'learning', label: '学习中' },
            { value: 'solid', label: '已巩固' },
          ]}
        />
      </div>

      {LESSONS.map((l) => {
        const groups = l.groups
          .map((g) => ({ g, pts: l.points.filter((pt) => pt.group === g.id && keep(pt.id, pt.pattern, pt.meaning)) }))
          .filter((x) => x.pts.length)
        return (
          <section key={l.id}>
            {groups.length === 0 && <p className="empty">没有符合条件的文型。</p>}
            {groups.map(({ g, pts }) => (
              <div key={g.id}>
                <h3 className="group-title">
                  {l.title} · {g.title}
                </h3>
                <div className="point-grid stagger">
                  {pts.map((pt) => {
                    const m = mastery(p, pt.id)
                    return (
                      <a key={pt.id} href={`#/point/${pt.id}`} className={`point-tile lv${m.level}`}>
                        <div className="pt-pattern">
                          <J furigana={false}>{pt.pattern}</J>
                        </div>
                        <div className="pt-meaning">
                          <J furigana={false}>{pt.meaning}</J>
                        </div>
                        <div className="pt-foot">
                          <span className="level-pill">
                            <i className={`dot lv${m.level}` + (m.lastFail ? ' fail' : '')} />
                            {LEVELS[m.level]}
                          </span>
                          <span>{itemsOf(pt.id).length} 题</span>
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
