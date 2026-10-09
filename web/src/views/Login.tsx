import { useEffect, useState } from 'react'
import { CLOUD_CONFIGURED, resetPassword, signIn, signInWithGoogle, signUp, useCloud } from '../lib/cloud'
import { toast } from '../lib/toast'
import { GoogleG, Icon, Seal, Segmented } from '../components/ui'

/** Sign-in page: Google first, email and password as the alternative. */
export default function Login() {
  const c = useCloud()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; good?: boolean } | null>(null)

  // Signed in (here or on another tab): go back to the app.
  useEffect(() => {
    if (c.email) {
      toast(`已登录：${c.name || c.email}`)
      location.hash = '#/'
    }
  }, [c.email, c.name])

  const run = async (fn: () => Promise<void>, done?: string) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      if (done) setMsg({ text: done, good: true })
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  const validEmail = /\S+@\S+\.\S+/.test(email)
  const ok = validEmail && password.length >= 6

  return (
    <div className="login">
      <aside className="login-brand">
        <div>
          <Seal size={48} />
          <h1 style={{ marginTop: 26 }}>文型道場</h1>
          <p className="tagline" lang="ja">
            書けてこそ、身につく。
          </p>
        </div>
        <ul>
          <li>
            <Icon name="cloud" />
            登录后，多台设备的记录自动同步
          </li>
          <li>
            <Icon name="refresh" />
            依据遗忘曲线为每道题安排复习
          </li>
          <li>
            <Icon name="exam" />
            模拟考：完成整张试卷后统一核对
          </li>
        </ul>
      </aside>

      <section className="login-form">
        <h2>{mode === 'in' ? '登录' : '注册'}</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          在各设备上登录同一账号，学习记录即可自动同步。
        </p>

        {!CLOUD_CONFIGURED ? (
          <p className="form-msg bad">账号同步功能尚未配置。</p>
        ) : (
          <>
            <div className="actions">
              <button className="btn google big block" disabled={busy} onClick={() => void run(signInWithGoogle)}>
                <GoogleG />
                使用 Google 账号登录
              </button>
            </div>

            <div className="or">或使用邮箱</div>

            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault()
                if (ok) void run(() => (mode === 'in' ? signIn(email, password) : signUp(email, password)))
              }}
            >
              <Segmented<'in' | 'up'>
                value={mode}
                onChange={(m) => {
                  setMode(m)
                  setMsg(null)
                }}
                options={[
                  { value: 'in', label: '登录' },
                  { value: 'up', label: '注册新账号' },
                ]}
              />
              <label className="input-icon">
                <Icon name="mail" size={18} />
                <input className="input" type="email" autoComplete="email" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="input-icon">
                <Icon name="lock" size={18} />
                <input
                  className="input"
                  type="password"
                  autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                  placeholder="密码（至少 6 位）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="btn primary big block" type="submit" disabled={busy || !ok}>
                {busy ? '请稍候…' : mode === 'in' ? '登录' : '注册并登录'}
              </button>
              {mode === 'in' && (
                <button
                  type="button"
                  className="link small"
                  style={{ justifySelf: 'center' }}
                  disabled={busy || !validEmail}
                  onClick={() => void run(() => resetPassword(email), '密码重置邮件已发送，请查收（如未收到，请检查垃圾邮件）。')}
                >
                  忘记密码？{!validEmail && '（请先填写邮箱）'}
                </button>
              )}
            </form>
            {msg && <p className={'form-msg ' + (msg.good ? 'good' : 'bad')}>{msg.text}</p>}
          </>
        )}

        <p className="skip">
          无需登录也可使用，学习记录仅保存在本设备上。
          <a className="link" href="#/">
            直接开始练习
          </a>
        </p>
      </section>
    </div>
  )
}
