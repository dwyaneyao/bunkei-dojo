import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Show a readable message instead of a blank page if a view crashes. Progress is already saved.
class Boundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="shell">
        <div className="card">
          <h2>页面出错了</h2>
          <p className="muted">学习记录不受影响。可以回到首页继续，或把下面的信息发给 Claude。</p>
          <pre className="small pre">{String(this.state.error.stack ?? this.state.error)}</pre>
          <a className="btn primary" href="#/" onClick={() => setTimeout(() => location.reload())}>
            回到首页
          </a>
        </div>
      </div>
    )
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </StrictMode>,
)
