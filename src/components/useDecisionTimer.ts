import { useEffect, useRef, useState } from 'react'
import { elapsedMs, remainingMs } from '../core/timer'
import { useTrainer } from '../store/trainerStore'

/** Cards fly in for 0.25 s; the clock starts when they land. */
export const DEAL_MS = 250
/** The bar turns red and ticks in the last seconds. */
export const URGENT_MS = 3000

export interface TimerView {
  /** Shown seconds: counting up without a limit, down with one. */
  seconds: number
  /** Share of the limit left (1 → 0); null without a limit. */
  fraction: number | null
  urgent: boolean
  running: boolean
  /** Limit in seconds, 0 = off. */
  limit: number
}

/**
 * Drives the decision clock of the current hand: starts it after the deal, pauses it while the tab is hidden,
 * calls `timeUp` when the limit runs out and `onTick` once per second in the last 3 s.
 */
export function useDecisionTimer(onTick: () => void): TimerView | null {
  const ready = useTrainer((s) => s.ready)
  const questionId = useTrainer((s) => s.question.id)
  const clock = useTrainer((s) => s.clock)
  const answer = useTrainer((s) => s.answer)
  const limit = useTrainer((s) => s.settings.timeLimit)
  const now = useTrainer((s) => s.now)
  const [t, setT] = useState(() => now())
  const lastTick = useRef<number | null>(null)

  useEffect(() => {
    if (!ready) return
    const { startClock, pauseClock } = useTrainer.getState()
    const id = window.setTimeout(() => {
      startClock()
      if (document.hidden) pauseClock()
    }, DEAL_MS)
    return () => window.clearTimeout(id)
  }, [ready, questionId])

  useEffect(() => {
    const onVisibility = () => {
      const s = useTrainer.getState()
      if (document.hidden) s.pauseClock()
      else s.resumeClock()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const running = clock !== null && answer === null
  useEffect(() => {
    if (!running) return
    lastTick.current = null
    setT(now())
    const id = window.setInterval(() => setT(now()), 100)
    return () => window.clearInterval(id)
  }, [running, clock?.startedAt, now])

  const left = clock && limit > 0 ? remainingMs(clock, t, limit) : null

  useEffect(() => {
    if (!running || left === null) return
    if (left <= 0) {
      useTrainer.getState().timeUp()
      return
    }
    const sec = Math.ceil(left / 1000)
    if (left <= URGENT_MS && lastTick.current !== sec) {
      lastTick.current = sec
      onTick()
    }
  }, [running, left, onTick])

  if (!clock) return null
  const shownMs = answer?.answerMs ?? elapsedMs(clock, t)
  if (limit === 0) return { seconds: Math.floor(shownMs / 1000), fraction: null, urgent: false, running, limit }
  const rest = answer ? Math.max(0, limit * 1000 - shownMs) : left!
  return {
    seconds: Math.ceil(rest / 1000),
    fraction: rest / (limit * 1000),
    urgent: rest <= URGENT_MS,
    running,
    limit,
  }
}
