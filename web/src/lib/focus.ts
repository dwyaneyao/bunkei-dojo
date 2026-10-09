import { useEffect, useSyncExternalStore } from 'react'

// "Focus mode": while practising or writing a mock exam, the app hides its navigation.
// A page turns it on with useFocusMode(true); the shell reads it with useIsFocus().

let focus = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function useFocusMode(on: boolean) {
  useEffect(() => {
    if (!on) return
    focus++
    emit()
    return () => {
      focus--
      emit()
    }
  }, [on])
}

export function useIsFocus(): boolean {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => focus > 0,
  )
}
