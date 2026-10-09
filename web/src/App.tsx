import { useEffect, useState } from 'react'
import { loadProgress, isReady, useProgress, useSaveState } from './lib/store'
import { CLOUD_CONFIGURED, startCloud, useCloud } from './lib/cloud'
import { useIsFocus } from './lib/focus'
import { useToast } from './lib/toast'
import { daysUntil } from './lib/util'
import { Avatar, Icon, Seal, type IconName } from './components/ui'
import Home from './views/Home'
import Session from './views/Session'
import Exam from './views/Exam'
import Points from './views/Points'
import PointView from './views/PointView'
import Me from './views/Me'
import Login from './views/Login'
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

const NAV: { href: string; label: string; icon: IconName; match: string[] }[] = [
  { href: '#/', label: '今日', icon: 'home', match: [''] },
  { href: '#/points', label: '文型', icon: 'book', match: ['points', 'point'] },
  { href: '#/exam', label: '模拟考', icon: 'exam', match: ['exam'] },
  { href: '#/guide', label: '方法', icon: 'compass', match: ['guide'] },
]

const TABS: { href: string; label: string; icon: IconName; match: string[] }[] = [
  NAV[0],
  NAV[1],
  NAV[2],
  { href: '#/me', label: '我的', icon: 'user', match: ['me', 'settings', 'login', 'guide'] },
]

export default function App() {
  const [, force] = useState(0)
  useEffect(() => {
    loadProgress().then(() => {
      void startCloud()
      force((n) => n + 1)
    })
  }, [])
  const route = useRoute()
  const p = useProgress()
  const cloud = useCloud()
  const focus = useIsFocus()
  const toast = useToast()

  // Light / dark / follow the system.
  const theme = p.settings.theme ?? 'auto'
  useEffect(() => {
    const el = document.documentElement
    if (theme === 'auto') delete el.dataset.theme
    else el.dataset.theme = theme
  }, [theme])

  if (!isReady())
    return (
      <div className="boot">
        <Seal size={44} />
      </div>
    )

  const [head = '', arg] = route
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
    case 'me':
    case 'settings':
      view = <Me />
      break
    case 'login':
      view = <Login />
      break
    case 'guide':
      view = <Guide />
      break
    default:
      view = <Home />
  }

  const meName = cloud.name || cloud.email || '未登录'
  const syncCls = !cloud.email ? '' : cloud.error ? 'err' : cloud.busy ? 'busy' : 'on'
  const syncText = !CLOUD_CONFIGURED || !cloud.email ? '只保存在这台设备' : cloud.error ? '同步出错' : cloud.busy ? '同步中…' : '已同步'

  return (
    <div className={'app' + (focus ? ' focus' : '')}>
      <aside className="sidebar">
        <a className="brand" href="#/">
          <Seal />
          <span className="brand-name">
            <b>文型道場</b>
            <small>BUNKEI DOJO</small>
          </span>
        </a>
        <nav className="nav">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className={n.match.includes(head) ? 'on' : ''}>
              <Icon name={n.icon} />
              {n.label}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          {left !== null && left >= 0 && (
            <div className="side-count">
              距考试 <b>{left}</b>天
            </div>
          )}
          <a className="me-link" href="#/me">
            <Avatar name={cloud.name || cloud.email} photo={cloud.photo} />
            <span className="who">
              <b>{meName}</b>
              <span className={'sync-dot ' + syncCls}>{syncText}</span>
            </span>
            <Icon name="right" size={16} />
          </a>
        </div>
      </aside>

      <header className="topbar">
        <a className="brand" href="#/">
          <Seal size={30} />
          <span className="brand-name">
            <b>文型道場</b>
          </span>
        </a>
        <a href="#/me" aria-label="我的">
          <Avatar name={cloud.name || cloud.email} photo={cloud.photo} size={32} />
        </a>
      </header>

      <main className="main">
        <div className="content">
          <SaveBanner />
          <div className="view" key={head + '/' + (arg ?? '')}>
            {view}
          </div>
        </div>
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <a key={t.href} href={t.href} className={t.match.includes(head) ? 'on' : ''}>
            <span className="tab-ico">
              <Icon name={t.icon} size={21} />
            </span>
            {t.label}
          </a>
        ))}
      </nav>

      {toast && (
        <div className="toast" key={toast.id}>
          <Icon name="check" size={16} />
          {toast.text}
        </div>
      )}
    </div>
  )
}

/** Only shown when something is wrong with saving. */
function SaveBanner() {
  const { state, error } = useSaveState()
  const cloud = useCloud()
  if (cloud.email && cloud.error)
    return (
      <div className="card warn small banner">
        <b>同步没成功：</b>
        {cloud.error}。作答都还在这台设备上，下次同步时会补上。
      </div>
    )
  if (state === 'readonly')
    return (
      <div className="card warn small banner">
        <b>学习记录文件读不了，所以这次不会写入它（避免覆盖）。</b>新的作答只存在这个浏览器里。请把这条信息告诉 Claude：
        <div className="pre">{error}</div>
      </div>
    )
  if (state === 'offline')
    return <div className="card warn small banner">暂时连不上本地服务器：作答先存在浏览器里，连上后会自动写入文件。</div>
  return null
}
