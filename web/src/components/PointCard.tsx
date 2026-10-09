import type { Point } from '../types'
import { TAG_LABEL } from '../types'
import { J } from '../lib/markup'
import { lessonOfPoint } from '../content'

/** The study card for one grammar point: meaning, form, limits, safe fillers, traps, examples. */
export default function PointCard({ point }: { point: Point }) {
  return (
    <article className="pcard">
      <header className="pcard-head">
        <span className="chip">{lessonOfPoint.get(point.id)?.groups.find((g) => g.id === point.group)?.title ?? point.group}</span>
        <h2 className="pattern">
          <J>{point.pattern}</J>
        </h2>
        <p className="meaning">
          <J>{point.meaning}</J>
        </p>
      </header>

      {(point.list.form || point.list.example) && (
        <section className="pc-sec list-src">
          <h4>讲义原文</h4>
          {point.list.form && (
            <p className="ja-line">
              <J>{point.list.form}</J>
            </p>
          )}
          {point.list.example && (
            <p className="ja-line">
              <J>{point.list.example}</J>
            </p>
          )}
        </section>
      )}

      <section className="pc-sec">
        <h4>接续</h4>
        <ul className="form-list">
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
          <div className="safe">
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
              <li key={i}>
                <div className="trap-bad">
                  <span className="x">✗</span>
                  <J>{t.bad}</J>
                  {t.tag && <span className="tag">{TAG_LABEL[t.tag]}</span>}
                </div>
                {t.fix && (
                  <div className="trap-fix">
                    <span className="o">✓</span>
                    <J>{t.fix}</J>
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
          <h4>
            例句 <span className="muted small">自编</span>
          </h4>
          <ul className="examples">
            {point.examples.map((e, i) => (
              <li key={i}>
                <J>{e}</J>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
