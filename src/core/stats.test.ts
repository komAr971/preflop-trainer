import { describe, expect, it } from 'vitest'
import { dayKey, handErrors, medianDecisionMs, spotStats, streakDays, todayCount, type AttemptLike } from './stats'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()
const a = (spotKey: string, hand: string, correct: boolean, ts = 0): AttemptLike => ({ spotKey, hand, correct, ts })

describe('spotStats', () => {
  it('counts totals and recent window per spot', () => {
    const attempts = [
      ...Array.from({ length: 5 }, (_, i) => a('rfi:CO', 'AA', false, i)),
      ...Array.from({ length: 10 }, (_, i) => a('rfi:CO', 'AA', true, 10 + i)),
      a('rfi:UTG', 'KK', true, 100),
    ]
    const s = spotStats(attempts, { window: 10, threshold: 0.9 })
    expect(s.get('rfi:CO')).toEqual({
      total: 15, correct: 10, recentTotal: 10, recentCorrect: 10, learned: true, medianMs: null, timeouts: 0,
    })
    expect(s.get('rfi:UTG')).toMatchObject({ total: 1, learned: false })
  })

  it('is not learned until the window is full', () => {
    const attempts = Array.from({ length: 9 }, (_, i) => a('rfi:CO', 'AA', true, i))
    expect(spotStats(attempts, { window: 10, threshold: 0.9 }).get('rfi:CO')!.learned).toBe(false)
  })

  it('uses the most recent attempts even if input is unsorted', () => {
    const attempts = [a('x', 'AA', false, 100), a('x', 'AA', true, 1), a('x', 'AA', true, 2)]
    expect(spotStats(attempts, { window: 1, threshold: 0.9 }).get('x')).toMatchObject({ recentCorrect: 0 })
  })
})

describe('handErrors', () => {
  it('aggregates per hand, optionally for one spot', () => {
    const attempts = [a('s1', 'AA', false), a('s1', 'AA', true), a('s2', 'AA', false), a('s1', 'KK', true)]
    expect(handErrors(attempts).get('AA')).toEqual({ total: 3, wrong: 2 })
    expect(handErrors(attempts, 's1').get('AA')).toEqual({ total: 2, wrong: 1 })
    expect(handErrors(attempts, 's1').has('QQ')).toBe(false)
  })
})

describe('days', () => {
  const now = at(2026, 11, 20, 18)

  it('uses local calendar days', () => {
    expect(dayKey(at(2026, 11, 20, 0))).toBe('2026-11-20')
    expect(dayKey(at(2026, 11, 20, 23))).toBe('2026-11-20')
  })

  it('counts today', () => {
    expect(todayCount([at(2026, 11, 20, 9), at(2026, 11, 19, 23), at(2026, 11, 20, 1)], now)).toBe(2)
  })

  it('counts consecutive days that reached the goal', () => {
    const many = (d: number, n: number) => Array.from({ length: n }, () => at(2026, 11, d))
    const ts = [...many(17, 3), ...many(18, 3), ...many(19, 3), ...many(20, 3)]
    expect(streakDays(ts, now, 3)).toBe(4)
    expect(streakDays(ts, now, 4)).toBe(0)
  })

  it('keeps the streak alive while today is still in progress', () => {
    const ts = [at(2026, 11, 18), at(2026, 11, 19), at(2026, 11, 20)]
    expect(streakDays(ts.slice(0, 2), now, 1)).toBe(2)
    expect(streakDays(ts, now, 1)).toBe(3)
  })

  it('breaks on a missed day', () => {
    expect(streakDays([at(2026, 11, 17), at(2026, 11, 19)], now, 1)).toBe(1)
    expect(streakDays([at(2026, 11, 17)], now, 1)).toBe(0)
  })
})

describe('decision time', () => {
  const t = (answerMs: number | undefined, extra: Partial<AttemptLike> = {}): AttemptLike => ({ ...a('rfi:CO', 'AA', true), answerMs, ...extra })

  it('is the median answer time', () => {
    expect(medianDecisionMs([t(3000), t(1000), t(2000)])).toBe(2000)
    expect(medianDecisionMs([t(1000), t(2000), t(4000), t(9000)])).toBe(3000)
  })

  it('leaves out timeouts, answers over 60 s and old attempts without time', () => {
    expect(medianDecisionMs([t(1000), t(10_000, { timedOut: true, correct: false }), t(61_000), t(undefined)])).toBe(1000)
  })

  it('is empty when nothing was timed', () => {
    expect(medianDecisionMs([t(undefined)])).toBeNull()
    expect(medianDecisionMs([])).toBeNull()
  })

  it('is shown per spot together with the timeout count', () => {
    const s = spotStats([t(1000), t(3000), t(5000, { timedOut: true, correct: false }), t(undefined, { spotKey: 'rfi:BTN' })])
    expect(s.get('rfi:CO')).toMatchObject({ medianMs: 2000, timeouts: 1 })
    expect(s.get('rfi:BTN')).toMatchObject({ medianMs: null, timeouts: 0 })
  })
})
