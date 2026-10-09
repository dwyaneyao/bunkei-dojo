import { LEVEL_HINT, LEVELS } from '../lib/plan'
import { Icon, type IconName } from '../components/ui'

const HOW: { icon: IconName; title: string; text: string }[] = [
  { icon: 'book', title: '文型讲解', text: '包括意思、接续、用法、答题常用搭配（一时想不出内容时可直接套用）和常见错误。' },
  { icon: 'pen', title: '接续', text: '根据「词语＋文型」写出完整的接续形式，由系统自动判定。汉字和假名写法均可识别；若判定有误，可点击「我的答案也正确」。' },
  { icon: 'eye', title: '辨析', text: '从几个选项中选出最恰当的一项。错误选项均取自常见错误，并逐一说明错误原因。' },
  { icon: 'exam', title: '完成句', text: '与考试相同的开放式题目。先独立作答，再对照检查要点和参考答案进行自评。' },
  { icon: 'clock', title: '模拟考', text: '完成整张试卷后统一核对答案，熟悉考场节奏。' },
]

const WHY: { icon: IconName; title: string; text: string }[] = [
  { icon: 'pen', title: '主动回忆', text: '主动写出答案比反复阅读记得更牢，因此每道题都要求先作答、再看答案。' },
  { icon: 'refresh', title: '间隔复习', text: '采用 FSRS 算法，为每道题单独安排下次复习时间：答错的题很快会再次出现，掌握熟练的题间隔逐渐延长。' },
  { icon: 'layers', title: '交错练习', text: '复习时不同文型交替出现，促使你先判断“此处应使用哪个文型”，这正是考试所需的能力。' },
  { icon: 'target', title: '换句复测', text: '完成句答错后，系统会换用一道当天未看过答案的句子再次检测；若没有其他句子，则于次日重考原题。' },
  { icon: 'exam', title: '以考促学', text: '模拟考中答错但尚未学习的文型，会被优先安排为新文型。' },
  { icon: 'chart', title: '错误分析', text: '自评时标注错误类型，首页会统计你最常在接续、意思还是上下文方面出错。' },
]

/** How the tool trains for the exam, in plain words. */
export default function Guide() {
  return (
    <div>
      <header className="page-head">
        <div className="eyebrow">稽古の方法</div>
        <h1 className="page-title">学习方法</h1>
        <p className="page-sub">
          当前考试题型为「<span lang="ja">＿＿に書いて文を完成させてください</span>」：题目给出文型，由你补全句子内容。
        </p>
      </header>

      <div className="stagger">
        <section className="card">
          <h2 className="card-title">
            <Icon name="target" />
            得分条件：填写内容须同时满足以下三点
          </h2>
          <div className="gates">
            <div className="gate">
              <div className="gate-n">一</div>
              <b>接续</b>
              <p>文型前的接续形式是否正确：ます形、て形、な／の，以及是否需要だ。</p>
            </div>
            <div className="gate">
              <div className="gate-n">二</div>
              <b>意思与使用限制</b>
              <p>
                内容是否符合该文型的意思与使用范围，例如 <span lang="ja">がたい</span> 只用于心理上难以做到的事。
              </p>
            </div>
            <div className="gate">
              <div className="gate-n">三</div>
              <b>上下文</b>
              <p>是否与句子或对话自然衔接：时态、逻辑、语体。</p>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title" style={{ marginBottom: 18 }}>
            <Icon name="layers" />
            分项练习，综合检测
          </h2>
          <ul className="how">
            {HOW.map((h) => (
              <li key={h.title}>
                <span className="row-ico">
                  <Icon name={h.icon} size={19} />
                </span>
                <div>
                  <b>{h.title}</b>
                  <p>{h.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="card-title" style={{ marginBottom: 18 }}>
            <Icon name="sparkle" />
            设计依据
          </h2>
          <ul className="how">
            {WHY.map((h) => (
              <li key={h.title}>
                <span className="row-ico">
                  <Icon name={h.icon} size={19} />
                </span>
                <div>
                  <b>{h.title}</b>
                  <p>{h.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="card-title">
            <Icon name="chart" />
            掌握程度
          </h2>
          <p className="muted small" style={{ marginTop: 6 }}>
            仅依据完成句（最接近考试的题型）判定。使用了提示，或当天看过参考答案后重答同一句的，均不计入。
          </p>
          <div className="ladder">
            {LEVELS.map((name, n) => (
              <div key={n} className={`rung lv${n}`} style={{ minHeight: 60 + n * 22 }} title={LEVEL_HINT[n]}>
                {name}
              </div>
            ))}
          </div>
          <ul style={{ marginTop: 16, paddingLeft: '1.1em', color: 'var(--ink-2)' }}>
            {LEVELS.map((name, n) => (
              <li key={n}>
                <b>{name}</b>：{LEVEL_HINT[n]}
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="card-title">
            <Icon name="calendar" />
            使用建议
          </h2>
          <p style={{ marginTop: 10, color: 'var(--ink-2)' }}>
            在首页点击「开始练习」即可：先复习到期的题目，再学习新文型（默认每天 4 个，可在「我的」中调整）。考前几天建议多做模拟考。答题时支持键盘操作：
            <kbd>Enter</kbd> 提交，数字键选择选项或自评等级。
          </p>
        </section>
      </div>
    </div>
  )
}
