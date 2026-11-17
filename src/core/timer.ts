/** Decision clock: an immutable stopwatch that can be paused while the tab is hidden. */
export interface Clock {
  startedAt: number
  /** Total paused time before the current pause. */
  pausedMs: number
  /** Set while paused. */
  pausedAt: number | null
}

export const startClock = (now: number): Clock => ({ startedAt: now, pausedMs: 0, pausedAt: null })

export const pauseClock = (c: Clock, now: number): Clock => (c.pausedAt === null ? { ...c, pausedAt: now } : c)

export const resumeClock = (c: Clock, now: number): Clock =>
  c.pausedAt === null ? c : { ...c, pausedMs: c.pausedMs + (now - c.pausedAt), pausedAt: null }

export const elapsedMs = (c: Clock, now: number): number =>
  (c.pausedAt ?? now) - c.startedAt - c.pausedMs

/** `limitSec` — the time limit setting. */
export const remainingMs = (c: Clock, now: number, limitSec: number): number =>
  Math.max(0, limitSec * 1000 - elapsedMs(c, now))
