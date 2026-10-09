import { useRef } from 'react'
import { HAS_SERVER, dayKey, exportProgress, importProgress, setSettings, useProgress } from '../lib/store'
import { CLOUD_CONFIGURED, signOut, syncNow, useCloud } from '../lib/cloud'
import { toast } from '../lib/toast'
import { Avatar, Icon, Segmented, Stepper, Switch, type IconName } from '../components/ui'

function Row({ icon, title, sub, children }: { icon: IconName; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="list-row">
      <span className="row-ico">
        <Icon name={icon} size={19} />
      </span>
      <span className="row-main">
        <b>{title}</b>
        {sub && <span>{sub}</span>}
      </span>
      <span className="row-end">{children}</span>
    </div>
  )
}

/** "我的": account and sync, study settings, appearance, data. */
export default function Me() {
  const { settings: s, log } = useProgress()
  const c = useCloud()
  const file = useRef<HTMLInputElement>(null)

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportProgress()], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `bunkei-dojo-${dayKey(Date.now())}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const upload = async (f: File | undefined) => {
    if (!f) return
    try {
      const n = importProgress(await f.text())
      toast(n > 0 ? `导入完成：新增 ${n} 条作答记录` : '导入完成：没有新的作答记录')
    } catch (e) {
      toast(`导入失败：${e instanceof Error ? e.message : e}`)
    }
  }

  const syncText = c.busy
    ? '正在同步…'
    : c.error
      ? `上次同步失败：${c.error}`
      : c.last
        ? `已同步 · ${new Date(c.last).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : '正在同步…'

  return (
    <div>
      <header className="page-head">
        <div className="eyebrow">設定</div>
        <h1 className="page-title">我的</h1>
      </header>

      <div className="stagger">
        <section className="card">
          {c.email ? (
            <div className="profile">
              <Avatar name={c.name || c.email} photo={c.photo} size={64} />
              <div className="profile-main">
                <b>{c.name || c.email}</b>
                {c.name && <div className="muted">{c.email}</div>}
                <span className={'sync-dot ' + (c.error ? 'err' : c.busy ? 'busy' : 'on')}>{syncText}</span>
              </div>
              <div className="row">
                <button className="btn" disabled={c.busy} onClick={() => void syncNow().then(() => toast('同步完成'))}>
                  <Icon name="refresh" size={17} />
                  立即同步
                </button>
                <button
                  className="btn ghost"
                  onClick={() => {
                    if (confirm('退出登录后，本设备将停止同步（已有记录仍保留在本设备上）。确定退出吗？'))
                      void signOut().then(() => toast('已退出登录'))
                  }}
                >
                  <Icon name="logout" size={17} />
                  退出登录
                </button>
              </div>
            </div>
          ) : (
            <div className="profile">
              <Avatar size={64} />
              <div className="profile-main">
                <b>未登录</b>
                <div className="muted">
                  {HAS_SERVER ? '学习记录保存在本机。' : '学习记录仅保存在当前浏览器中。'}登录后，各设备的记录将自动同步。
                </div>
              </div>
              {CLOUD_CONFIGURED && (
                <a className="btn primary" href="#/login">
                  <Icon name="cloud" size={18} />
                  登录并同步
                </a>
              )}
            </div>
          )}
        </section>

        <section className="group">
          <div className="group-h">学习</div>
          <div className="list">
            <Row icon="calendar" title="考试日期" sub="用于在首页和侧边栏显示倒计时">
              <input type="date" className="input" value={s.examDate} onChange={(e) => setSettings({ examDate: e.target.value })} />
            </Row>
            <Row icon="sparkle" title="每日新文型" sub="临近考试时可适当调高；设为 0 则只复习">
              <Stepper value={s.newPerDay} min={0} max={21} onChange={(v) => setSettings({ newPerDay: v })} />
            </Row>
            <Row icon="target" title="目标正确率" sub="复习时预期能答对的比例。设得越高，复习越频繁">
              <Segmented<number>
                value={s.retention}
                onChange={(v) => setSettings({ retention: v })}
                options={[
                  { value: 0.85, label: '85%' },
                  { value: 0.9, label: '90%' },
                  { value: 0.95, label: '95%' },
                ]}
              />
            </Row>
          </div>
        </section>

        <section className="group">
          <div className="group-h">显示</div>
          <div className="list">
            <Row icon="eye" title="外观">
              <Segmented<'auto' | 'light' | 'dark'>
                value={s.theme ?? 'auto'}
                onChange={(v) => setSettings({ theme: v })}
                options={[
                  { value: 'auto', label: '跟随系统' },
                  { value: 'light', label: '浅色' },
                  { value: 'dark', label: '深色' },
                ]}
              />
            </Row>
            <Row icon="book" title="振假名" sub="关闭后不再为汉字注音">
              <Switch checked={s.furigana} onChange={(v) => setSettings({ furigana: v })} label="振假名" />
            </Row>
          </div>
        </section>

        <section className="group">
          <div className="group-h">数据</div>
          <div className="list">
            <button className="list-row" onClick={download}>
              <span className="row-ico">
                <Icon name="download" size={19} />
              </span>
              <span className="row-main">
                <b>导出记录</b>
                <span>将 {log.length} 条作答记录导出为文件</span>
              </span>
              <span className="row-end inline">
                <Icon name="right" size={18} />
              </span>
            </button>
            <button className="list-row" onClick={() => file.current?.click()}>
              <span className="row-ico">
                <Icon name="upload" size={19} />
              </span>
              <span className="row-main">
                <b>导入记录</b>
                <span>与本设备的记录合并，不会删除任何已有作答</span>
              </span>
              <span className="row-end inline">
                <Icon name="right" size={18} />
              </span>
            </button>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                void upload(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
          {HAS_SERVER && <p className="muted small" style={{ margin: '10px 6px 0' }}>电脑版：记录同时保存在 exam-review/userdata/progress.json，并每日自动备份。</p>}
        </section>

        <section className="group">
          <div className="group-h">关于</div>
          <div className="list">
            <a className="list-row" href="#/guide">
              <span className="row-ico">
                <Icon name="compass" size={19} />
              </span>
              <span className="row-main">
                <b>学习方法</b>
                <span>题型分析、复习机制与掌握程度说明</span>
              </span>
              <span className="row-end inline">
                <Icon name="right" size={18} />
              </span>
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
