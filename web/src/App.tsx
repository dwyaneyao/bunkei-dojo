import { useEffect, useState } from 'react'
import { loadProgress, isReady, useProgress, useSaveState } from './lib/store'
import { startSync, useSync } from './lib/sync'
import { daysUntil } from './lib/util'
import Home from './views/Home'
import Session from './views/Session'
import Exam from './views/Exam'
import Points from './views/Points'
import PointView from './views/PointView'
import Settings from './views/Settings'
import Guide from './views/Guide'

function useRoute() {
  const [hash, setHash] = useState(location.hash || '#/')
  useEffect(() => {
    const on = () => {
      setHash(location.hash || '#/')
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash.slice(1).split('/').filter(Boolean)
}

const NAV: [string, string][] = [
  ['#/', '今日'],
  ['#/points', '文型表'],
  ['#/exam', '模拟考'],
  ['#/guide', '怎么练'],
  ['#/settings', '设置'],
]

export default function App() {
  const [, force] = useState(0)
  useEffect(() => {
    loadProgress().then(() => {
      startSync()
      force((n) => n + 1)
    })
  }, [])
  const route = useRoute()
  const p = useProgress()
  if (!isReady()) return <div className="shell muted">载入中…</div>

  const [head, arg] = route
  const here = '#/' + (head ?? '')
  const left = daysUntil(p.settings.examDate)

  let view
  switch (head) {
    case 'session':
      view = <Session key={location.hash} mode={arg === 'drill' ? 'drill' : 'daily'} point={route[2]} />
      break
    case 'exam':
      view = <Exam />
      break
    case 'points':
      view = <Points />
      break
    case 'point':
      view = <PointView id={arg} />
      break
    case 'settings':
      view = <Settings />
      break
    case 'guide':
      view = <Guide />
      break
    default:
      view = <Home />
  }

  return (
    <>
      <header className="top">
        <div className="top-inner">
          <a className="brand" href="#/">
            <span className="brand-mark" aria-hidden>
              文
            </span>
            <span lang="ja">文型道場</span>
          </a>
          <nav>
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className={here === href || (href === '#/points' && head === 'point') ? 'on' : ''}>
                {label}
              </a>
            ))}
          </nav>
          {left !== null && left >= 0 && (
            <span className="countdown" title={p.settings.examDate}>
              距考试 <b>{left}</b> 天
            </span>
          )}
        </div>
      </header>
      <main className="shell">
        <SaveBanner />
        {view}
      </main>
    </>
  )
}

/** Only shown when something is wrong with saving to userdata/progress.json. */
function SaveBanner() {
  const { state, error } = useSaveState()
  const sync = useSync()
  if (sync.on && sync.error)
    return (
      <div className="card warn small">
        <b>云同步没成功：</b>
        {sync.error}。作答都还在这台设备上，下次同步时会补上。可以到 <a href="#/settings">设置</a> 里看看。
      </div>
    )
  if (state === 'readonly')
    return (
      <div className="card warn small">
        <b>学习记录文件读不了，所以这次不会写入它（避免覆盖）。</b>新的作答只存在这个浏览器里。请把这条信息告诉 Claude：
        <div className="pre">{error}</div>
      </div>
    )
  if (state === 'offline')
    return <div className="card warn small">暂时连不上本地服务器：作答先存在浏览器里，连上后会自动写入文件。</div>
  return null
}
