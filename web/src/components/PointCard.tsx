import type { ReactNode } from 'react'
import type { Point } from '../types'
import { TAG_LABEL } from '../types'
import { J } from '../lib/markup'
import { lessonOfPoint } from '../content'

/** The study card for one grammar point: meaning, form, limits, safe fillers, traps, examples. */
export default function PointCard({ point, head = true, aside }: { point: Point; head?: boolean; aside?: ReactNode }) {
  const group = lessonOfPoint.get(point.id)?.groups.find((g) => g.id === point.group)?.title ?? point.group
  return (
    <article className="pcard">
      {head && (
        <header className="pcard-head">
          <span className="chip ink">{group}</span>
          <h2 className="pattern" lang="ja">
            <J>{point.pattern}</J>
          </h2>
          <p className="meaning">
            <J>{point.meaning}</J>
          </p>
          {aside && <div className="pcard-aside">{aside}</div>}
        </header>
      )}

      <div className="pcard-body">
        {(point.list.form || point.list.example) && (
          <section className="pc-sec">
            <h4>讲义原文</h4>
            <div className="quote">
              {point.list.form && (
                <p>
                  <J>{point.list.form}</J>
                </p>
              )}
              {point.list.example && (
                <p>
                  <J>{point.list.example}</J>
                </p>
              )}
            </div>
          </section>
        )}

        <section className="pc-sec">
          <h4>接续</h4>
          <ul className="formula">
            {point.form.map((f, i) => (
              <li key={i}>
                <J>{f}</J>
              </li>
            ))}
          </ul>
        </section>

        {point.rules.length > 0 && (
          <section className="pc-sec">
            <h4>什么时候用</h4>
            <ul>
              {point.rules.map((r, i) => (
                <li key={i}>
                  <J>{r}</J>
                </li>
              ))}
            </ul>
          </section>
        )}

        {point.safe.length > 0 && (
          <section className="pc-sec">
            <h4>考场稳妥填法</h4>
            <div className="chips">
              {point.safe.map((s, i) => (
                <span key={i} className="safe-chip">
                  <J>{s}</J>
                </span>
              ))}
            </div>
          </section>
        )}

        {point.traps.length > 0 && (
          <section className="pc-sec">
            <h4>常见坑</h4>
            <ul className="traps">
              {point.traps.map((t, i) => (
                <li key={i} className="trap">
                  <div className="trap-line trap-bad">
                    <span className="mark">✕</span>
                    <span>
                      <J>{t.bad}</J>
                    </span>
                    {t.tag && <span className="tag">{TAG_LABEL[t.tag]}</span>}
                  </div>
                  {t.fix && (
                    <div className="trap-line trap-fix">
                      <span className="mark">◯</span>
                      <span>
                        <J>{t.fix}</J>
                      </span>
                    </div>
                  )}
                  <div className="trap-why">
                    <J>{t.why}</J>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {point.examples.length > 0 && (
          <section className="pc-sec">
            <h4>例句 · 自编</h4>
            <ol className="examples">
              {point.examples.map((e, i) => (
                <li key={i}>
                  <J>{e}</J>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </article>
  )
}
