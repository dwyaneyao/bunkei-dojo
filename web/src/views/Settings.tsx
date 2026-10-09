import { useState } from 'react'
import { HAS_SERVER, dayKey, exportProgress, importProgress, setSettings, useProgress } from '../lib/store'
import { DEFAULT_REPO, connect, disconnect, syncNow, useSync } from '../lib/sync'

/** Paste a GitHub token once per device; after that the record syncs by itself. */
function CloudSync() {
  const s = useSync()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const link = async () => {
    setBusy(true)
    setErr('')
    try {
      await connect(token)
      setToken('')
    } catch (e) {
      setErr(e instanceof TypeError ? '连不上 GitHub（可能没网）' : e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h3 className="settings-h">云同步</h3>
      {s.on ? (
        <>
          <p className="small">
            已连接 <code>{s.repo}</code>。作答会自动合并到云端，手机和电脑看到的是同一份记录。
            <br />
            <span className={s.error ? 'bad' : 'muted'}>
              {s.busy
                ? '正在同步…'
                : s.error
                  ? `上次同步没成功：${s.error}`
                  : s.last
                    ? `上次同步：${new Date(s.last).toLocaleTimeString()}`
                    : '还没同步过'}
            </span>
          </p>
          <div className="actions">
            <button className="btn" disabled={s.busy} onClick={() => void syncNow()}>
              立即同步
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                if (confirm('断开后，这台设备不再同步（记录还留在这台设备上）。断开吗？')) disconnect()
              }}
            >
              断开
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted small">
            把记录存到你的私有仓库 <code>{DEFAULT_REPO}</code>，手机和电脑自动合并。每台设备第一次在这里粘贴一次 GitHub
            令牌（只对这个仓库有读写权限的那个）。令牌只存在这台设备的浏览器里。
          </p>
          <div className="row wrap">
            <input
              className="token-input"
              type="password"
              autoComplete="off"
              placeholder="github_pat_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <button className="btn primary" disabled={busy || token.trim().length < 20} onClick={() => void link()}>
              {busy ? '连接中…' : '连接'}
            </button>
          </div>
          {err && <p className="small bad">{err}</p>}
        </>
      )}
    </>
  )
}

export default function Settings() {
  const { settings: s, log } = useProgress()
  const [msg, setMsg] = useState('')

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportProgress()], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `bunkei-dojo-${dayKey(Date.now())}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const upload = async (file: File | undefined) => {
    if (!file) return
    try {
      const n = importProgress(await file.text())
      setMsg(n > 0 ? `合并好了：新增 ${n} 条作答。` : '合并好了：没有新的作答（两边记录一样）。')
    } catch (e) {
      setMsg(`没能导入：${e instanceof Error ? e.message : e}`)
    }
  }

  return (
    <div className="card settings">
      <h1>设置</h1>
      <label className="field">
        <span className="field-l">考试日期</span>
        <input type="date" value={s.examDate} onChange={(e) => setSettings({ examDate: e.target.value })} />
        <span className="muted small">顶部会显示倒计时</span>
      </label>
      <label className="field">
        <span className="field-l">每天新文型</span>
        <input
          type="number"
          min={0}
          max={21}
          value={s.newPerDay}
          onChange={(e) => setSettings({ newPerDay: Math.max(0, Math.min(21, Number(e.target.value) || 0)) })}
        />
        <span className="muted small">个。离考试近可以调高；设为 0 只做复习</span>
      </label>
      <label className="field">
        <span className="field-l">振假名</span>
        <input type="checkbox" checked={s.furigana} onChange={(e) => setSettings({ furigana: e.target.checked })} />
        <span className="muted small">关掉后汉字不注音</span>
      </label>
      <label className="field">
        <span className="field-l">目标记住率</span>
        <select value={s.retention} onChange={(e) => setSettings({ retention: Number(e.target.value) })}>
          <option value={0.85}>85%（复习少一些）</option>
          <option value={0.9}>90%（默认）</option>
          <option value={0.95}>95%（考前冲刺，复习多）</option>
        </select>
      </label>

      <CloudSync />

      <h3 className="settings-h">学习记录</h3>
      <p className="muted small">
        {HAS_SERVER
          ? '这里是电脑版：记录保存在 exam-review/userdata/progress.json（每天自动备份一份）。'
          : '这里是网页版：记录只存在这个浏览器里，和电脑上的记录是分开的。'}
        开了云同步就不用管这里。没开时也可以手动合并：在一边点「导出」，把文件传到另一边，再点「导入」。导入是合并，不会删掉任何作答。
      </p>
      <div className="actions">
        <button className="btn" onClick={download}>
          导出记录（{log.length} 条作答）
        </button>
        <label className="btn">
          导入记录
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void upload(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      </div>
      {msg && <p className="small">{msg}</p>}
    </div>
  )
}
