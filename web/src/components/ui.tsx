import { useEffect, useRef, useState, type ReactNode } from 'react'

// Small design-system pieces shared by every page: icons, progress ring, red-ink grading stamp,
// switch, segmented control, avatar, count-up numbers.

// ---------- Icons (24×24, stroked, currentColor) ----------

const PATHS: Record<string, ReactNode> = {
  home: <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6.5H9V21H4.5a1 1 0 0 1-1-1z" />,
  book: (
    <>
      <path d="M2.5 5.5C4.5 4 7.5 4 12 6c4.5-2 7.5-2 9.5-.5V19c-2-1.5-5-1.5-9.5.5-4.5-2-7.5-2-9.5-.5z" />
      <path d="M12 6v13.5" />
    </>
  ),
  exam: (
    <>
      <path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14.5 3v4.5H19M8.5 12h7M8.5 16h4.5" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-3.9 3.6-6.5 8-6.5s8 2.6 8 6.5" />
    </>
  ),
  flame: <path d="M12 3c.9 3 5 5.2 5 10a5 5 0 0 1-10 0c0-2.2 1.1-3.8 2.2-4.7.1 1.9 1 3.1 2.1 3.1 0-3.2-.9-5.3.7-8.4z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  left: <path d="m15 6-6 6 6 6" />,
  right: <path d="m9 6 6 6-6 6" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  cloud: <path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6.2 6.2 0 0 1 18.3 11a3.8 3.8 0 0 1-.6 7.5z" />,
  logout: (
    <>
      <path d="M14 4h4.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H14" />
      <path d="m10 8-4 4 4 4M6 12h10" />
    </>
  ),
  download: <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />,
  upload: <path d="M12 20V9M7 13.5l5-5 5 5M5 4h14" />,
  bulb: (
    <>
      <path d="M9 18h6M10.2 21h3.6" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
    </>
  ),
  sparkle: <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9" />
      <path d="M18.5 3v4.5H14M5.5 21v-4.5H10" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
    </>
  ),
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" />,
}

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={'icon ' + (className ?? '')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  )
}

/** Google's "G", in its brand colours (for the sign-in button). */
export function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  )
}

/** The brand seal: 文 in a red hanko square. */
export function Seal({ size = 34 }: { size?: number }) {
  return (
    <span className="seal" style={{ width: size, height: size, fontSize: size * 0.56 }} aria-hidden>
      文
    </span>
  )
}

// ---------- Progress ring ----------

export function Ring({
  value,
  size = 120,
  stroke = 10,
  children,
  tone = 'ai',
}: {
  value: number
  size?: number
  stroke?: number
  children?: ReactNode
  tone?: 'ai' | 'ok' | 'kin' | 'light'
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  // Start empty and fill on the next frame, so the ring animates in.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(1, value))))
    return () => cancelAnimationFrame(id)
  }, [value])
  return (
    <div className={`ring tone-${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="ring-bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

// ---------- Red-ink grading stamp: ◯ / △ / ✕, drawn like a teacher's pen ----------

export function Stamp({ kind, size = 64 }: { kind: 'ok' | 'tri' | 'bad'; size?: number }) {
  return (
    <svg className={`stamp stamp-${kind}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      {kind === 'ok' && <path className="ink" d="M32 8c13 0 24 10 23.5 23.5S44 56 31 55.5 8.5 45 8.5 31.5 19.5 8.5 33.5 9.5" />}
      {kind === 'tri' && <path className="ink" d="M32 10 55 52H9z" />}
      {kind === 'bad' && (
        <>
          <path className="ink" d="M14 14 50 50" />
          <path className="ink ink-2" d="M50 14 14 50" />
        </>
      )}
    </svg>
  )
}

// ---------- Count-up number ----------

export function CountUp({ to, ms = 900 }: { to: number; ms?: number }) {
  const [n, setN] = useState(0)
  const start = useRef(0)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(to)
      return
    }
    let raf = 0
    start.current = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - start.current) / ms)
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return <>{n}</>
}

// ---------- Form controls ----------

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={'switch' + (checked ? ' on' : '')} onClick={() => onChange(!checked)}>
      <span className="switch-knob" />
    </button>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className="segmented" style={{ ['--n' as string]: options.length, ['--i' as string]: i }}>
      <span className="segmented-pill" aria-hidden />
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="减少">
        −
      </button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="增加">
        +
      </button>
    </div>
  )
}

export function Avatar({ name, photo, size = 36 }: { name?: string | null; photo?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false)
  const letter = (name ?? '').trim().charAt(0).toUpperCase()
  if (photo && !broken)
    return <img className="avatar" src={photo} alt="" width={size} height={size} referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  return (
    <span className={'avatar' + (letter ? '' : ' guest')} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {letter || <Icon name="user" size={Math.round(size * 0.5)} />}
    </span>
  )
}
