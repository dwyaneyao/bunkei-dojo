import { useSyncExternalStore } from 'react'

// One short message at the bottom of the screen ("已登录", "导入了 3 条作答"…).

let current: { id: number; text: string } | null = null
const listeners = new Set<() => void>()
let timer: number | undefined

export function toast(text: string, ms = 2600) {
  current = { id: Date.now(), text }
  listeners.forEach((l) => l())
  clearTimeout(timer)
  timer = window.setTimeout(() => {
    current = null
    listeners.forEach((l) => l())
  }, ms)
}

export function useToast() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
  )
}
