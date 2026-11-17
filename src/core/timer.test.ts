import { describe, expect, it } from 'vitest'
import { elapsedMs, pauseClock, resumeClock, startClock, remainingMs } from './timer'

describe('decision clock', () => {
  it('counts from the start', () => {
    const c = startClock(1000)
    expect(elapsedMs(c, 1000)).toBe(0)
    expect(elapsedMs(c, 3500)).toBe(2500)
  })

  it('does not count while paused (tab hidden)', () => {
    let c = startClock(0)
    c = pauseClock(c, 2000)
    expect(elapsedMs(c, 9000)).toBe(2000)
    c = resumeClock(c, 9000)
    expect(elapsedMs(c, 10_000)).toBe(3000)
  })

  it('ignores a repeated pause or resume', () => {
    let c = startClock(0)
    c = pauseClock(c, 1000)
    c = pauseClock(c, 5000)
    c = resumeClock(c, 6000)
    c = resumeClock(c, 8000)
    expect(elapsedMs(c, 9000)).toBe(4000)
  })

  it('tells how much of the limit is left, never below zero', () => {
    const c = startClock(0)
    expect(remainingMs(c, 3000, 10)).toBe(7000)
    expect(remainingMs(c, 12_000, 10)).toBe(0)
  })
})
