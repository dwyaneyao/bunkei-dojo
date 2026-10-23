import { useEffect, useState } from 'react'

// The published site is static, and a phone keeps an open tab (or a cached index.html) for a long time, so after
// a deploy the old app can stay on screen for days. Compare this build with the server's version.json when the
// app opens, when it comes back to the foreground, and every half hour.

const BUILD: string = import.meta.env.VITE_BUILD ?? ''
const RELOADED_FOR = 'bunkei-dojo.reloadedFor'

async function serverBuild(): Promise<string | null> {
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!r.ok) return null
    return ((await r.json()) as { build?: string }).build ?? null
  } catch {
    return null // offline: try again later
  }
}

/** True when a newer build has been published. With `canReload`, the page reloads into it right away, once per
 *  build: if a cached page comes back after that, it only reports the update instead of reloading again. */
export function useUpdate(canReload: boolean): boolean {
  const [newer, setNewer] = useState<string | null>(null)

  useEffect(() => {
    if (import.meta.env.DEV || !BUILD) return
    const check = () => void serverBuild().then((b) => b && b !== BUILD && setNewer(b))
    const onVisible = () => document.visibilityState === 'visible' && check()
    check()
    document.addEventListener('visibilitychange', onVisible)
    const t = setInterval(check, 30 * 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(t)
    }
  }, [])

  useEffect(() => {
    if (!newer || !canReload) return
    try {
      if (sessionStorage.getItem(RELOADED_FOR) === newer) return
      sessionStorage.setItem(RELOADED_FOR, newer)
    } catch {
      return // without storage a reload could repeat; leave it to the banner
    }
    location.reload()
  }, [newer, canReload])

  return newer !== null
}
