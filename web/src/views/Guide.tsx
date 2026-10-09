import { LEVEL_HINT, LEVELS } from '../lib/plan'
import { Icon, type IconName } from '../components/ui'

const HOW: { icon: IconName; title: string; text: string }[] = [
  { icon: 'book', title: '文型卡', text: '一句话意思、接续、什么时候用、考场稳妥填法（一时想不出内容时能直接用的搭配）、常见坑。' },
  { icon: 'pen', title: '接续', text: '看到「词＋文型」直接打出完整的形，自动判对错。汉字、假名两种写法都认；判错了但你确定写对了，可以点「我写的其实也对」。' },
  { icon: 'eye', title: '辨析', text: '几种填法里挑最自然的。错的选项就是常见错误，每个都说明错在哪。' },
  { icon: 'exam', title: '完成句', text: '和考试一样的开放题。先自己写，再逐条对照检查点和参考答案，自己评分。' },
  { icon: 'clock', title: '模拟考', text: '整张卷子先写完再对答案，练考场节奏。' },
]

const WHY: { icon: IconName; title: string; text: string }[] = [
  { icon: 'pen', title: '先回想，再看答案', text: '自己写出来，比反复看记得牢，所以每道题都先作答。' },
  { icon: 'refresh', title: '按遗忘曲线复习', text: '每道题单独安排下次出现的时间（FSRS 算法）。答错的很快再出现，答得轻松的间隔拉长。' },
  { icon: 'layers', title: '不同文型混在一起出', text: '复习时文型交错出现，逼你先判断“这里该用哪个”，这正是考试需要的。' },
  { icon: 'target', title: '错了换个句子再考', text: '完成句写错后，会换一个今天没见过答案的句子再考；没有别的句子了，就等到明天再考原来那句。' },
  { icon: 'exam', title: '先考后学也可以', text: '模拟考里错了、但还没学的文型，会排到新文型的最前面。' },
  { icon: 'chart', title: '记录错因', text: '自评时选「哪里不对」，首页会统计你最常错在接续、意思还是上下文。' },
]

/** How the tool trains for the exam, in plain words. */
export default function Guide() {
  return (
    <div>
      <header className="page-head">
        <div className="eyebrow">稽古の方法</div>
        <h1 className="page-title">这个工具怎么练</h1>
        <p className="page-sub">
          现在的考试题型是「<span lang="ja">＿＿に書いて文を完成させてください</span>」：文型已经给了，你自己补内容。
        </p>
      </header>

      <div className="stagger">
        <section className="card">
          <h2 className="card-title">
            <Icon name="target" />
            要拿分，补进去的内容必须同时过三关
          </h2>
          <div className="gates">
            <div className="gate">
              <div className="gate-n">一</div>
              <b>接续</b>
              <p>文型前面的形对不对：ます形、て形、な／の、要不要だ。</p>
            </div>
            <div className="gate">
              <div className="gate-n">二</div>
              <b>意思和限制</b>
              <p>
                内容符不符合这个文型的意思和使用范围，比如 <span lang="ja">がたい</span> 只用于心理上的难。
              </p>
            </div>
            <div className="gate">
              <div className="gate-n">三</div>
              <b>上下文</b>
              <p>和句子、对话接不接得上：时态、逻辑、礼貌程度。</p>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title" style={{ marginBottom: 18 }}>
            <Icon name="layers" />
            每个文型分开练，最后合起来考
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
            为什么这样安排
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
            只看完成句（最接近考试的题）。用了提示的、或者同一天看过参考答案后再写同一句的，都不算。
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
            每天怎么用
          </h2>
          <p style={{ marginTop: 10, color: 'var(--ink-2)' }}>
            打开首页点「开始」就行：先复习到期的题，再学几个新文型（默认每天 4 个，在「我的」里可以调）。考前几天多做模拟考。做题时可以用键盘：
            <kbd>Enter</kbd> 确定、数字键选选项和自评。
          </p>
        </section>
      </div>
    </div>
  )
}
