import { useState } from 'react'
import { CLOUD_CONFIGURED, resetPassword, signIn, signOut, signUp, syncNow, useCloud } from '../lib/cloud'

/** Sign up / sign in with email and password; once signed in, the record syncs by itself. */
export default function Account() {
  const c = useCloud()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)

  if (!CLOUD_CONFIGURED) return <p className="muted small">账号同步还没有接上。</p>
  if (!c.checked) return <p className="muted small">正在检查登录状态…</p>

  const run = async (fn: () => Promise<void>, done?: string) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      if (done) setMsg({ text: done })
      setPassword('')
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), bad: true })
    } finally {
      setBusy(false)
    }
  }

  if (c.email)
    return (
      <div className="account">
        <p className="small">
          已登录 <b>{c.email}</b>。这台设备的作答会自动同步，手机和电脑看到的是同一份记录。
          <br />
          <span className={c.error ? 'bad' : 'muted'}>
            {c.busy
              ? '正在同步…'
              : c.error
                ? `上次同步没成功：${c.error}`
                : c.last
                  ? `上次同步：${new Date(c.last).toLocaleTimeString()}`
                  : '正在同步…'}
          </span>
        </p>
        <div className="actions">
          <button className="btn" disabled={c.busy} onClick={() => void syncNow()}>
            立即同步
          </button>
          <button
            className="btn ghost"
            disabled={busy}
            onClick={() => {
              if (confirm('退出登录后，这台设备不再同步（记录还留在这台设备上）。退出吗？')) void run(signOut)
            }}
          >
            退出登录
          </button>
        </div>
        {msg && <p className={'small' + (msg.bad ? ' bad' : '')}>{msg.text}</p>}
      </div>
    )

  const ok = /\S+@\S+\.\S+/.test(email) && password.length >= 6
  return (
    <form
      className="account"
      onSubmit={(e) => {
        e.preventDefault()
        if (ok) void run(() => signIn(email, password))
      }}
    >
      <p className="muted small">
        登录后，这台设备的记录会和账号里的合并，之后自动同步。第一次用请先「注册」，其他设备用同一个邮箱和密码「登录」。
      </p>
      <div className="account-fields">
        <input
          className="token-input"
          type="email"
          autoComplete="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="token-input"
          type="password"
          autoComplete="current-password"
          placeholder="密码（至少 6 位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={busy || !ok}>
          登录
        </button>
        <button className="btn" type="button" disabled={busy || !ok} onClick={() => void run(() => signUp(email, password))}>
          注册
        </button>
        <button
          className="btn ghost small"
          type="button"
          disabled={busy || !/\S+@\S+\.\S+/.test(email)}
          onClick={() => void run(() => resetPassword(email), '重设密码的邮件已经发出，请查收（也看看垃圾邮件）。')}
        >
          忘记密码
        </button>
      </div>
      {msg && <p className={'small' + (msg.bad ? ' bad' : '')}>{msg.text}</p>}
    </form>
  )
}
