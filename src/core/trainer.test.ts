import { describe, expect, it } from 'vitest'
import { parseChart, type CompiledSpot, type Frequencies } from './chart'
import { ALL_HANDS, combosOf } from './hands'
import { actionForRoll, correctActions, dealCards, isBorderline, isCorrect, mulberry32, pickHand, rollD100, rollIntervals } from './trainer'

const f = (fold: number, call: number, raise: number): Frequencies => ({ fold, call, raise })

function rfiSpot(raise: string): CompiledSpot {
  const res = parseChart({
    version: 1,
    name: 't',
    format: { players: 6, stackBb: 100 },
    sizings: { openBb: 2.5, sbOpenBb: 3, threeBetIpX: 3, threeBetOopX: 4, fourBetX: 2.2 },
    spots: [{ spot: { kind: 'rfi', hero: 'CO' }, actions: { raise } }],
  })
  if (!res.ok) throw new Error(res.errors.join())
  return res.chart.spots.get('rfi:CO')!
}

describe('isCorrect', () => {
  it('pure strategy: only the action with frequency 1', () => {
    expect(isCorrect(f(0, 0, 1), 'raise')).toBe(true)
    expect(isCorrect(f(0, 0, 1), 'call')).toBe(false)
    expect(isCorrect(f(0, 0, 1), 'fold')).toBe(false)
  })

  it('mixed: any action at or above the threshold (default 25%)', () => {
    expect(isCorrect(f(0.4, 0, 0.6), 'raise')).toBe(true)
    expect(isCorrect(f(0.4, 0, 0.6), 'fold')).toBe(true)
    expect(isCorrect(f(0.75, 0, 0.25), 'raise')).toBe(true)
    expect(isCorrect(f(0.8, 0, 0.2), 'raise')).toBe(false)
  })

  it('respects a custom threshold', () => {
    expect(isCorrect(f(0.6, 0, 0.4), 'raise', 0.5)).toBe(false)
    expect(isCorrect(f(0.6, 0, 0.4), 'fold', 0.5)).toBe(true)
  })

  it('accepts the most frequent action when none reaches the threshold', () => {
    const freqs = f(0.3, 0.3, 0.4)
    expect(correctActions(freqs, 0.5)).toEqual(['raise'])
  })
})

describe('isBorderline', () => {
  const spot = rfiSpot('QQ+,AKs')
  it('is true when a grid neighbour has a different main action', () => {
    expect(isBorderline(spot, 'QQ')).toBe(true) // JJ folds
    expect(isBorderline(spot, 'AKs')).toBe(true) // AQs folds
    expect(isBorderline(spot, 'JJ')).toBe(true) // QQ raises
  })
  it('is false deep inside or outside the range', () => {
    expect(isBorderline(rfiSpot('QQ+,AQs+,AQo+,KQs,KQo'), 'AA')).toBe(false)
    expect(isBorderline(spot, '72o')).toBe(false)
  })
  it('is true for mixed hands', () => {
    expect(isBorderline(rfiSpot('22:0.5'), '22')).toBe(true)
  })
})

describe('pickHand', () => {
  const spot = rfiSpot('22+,A2s+,KTs+,QTs+,JTs,AJo+,KQo')

  it('only borderline hands when share = 1', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 500; i++) expect(isBorderline(spot, pickHand(spot, rng, 1))).toBe(true)
  })

  it('follows real combo frequencies when share = 0', () => {
    const rng = mulberry32(2)
    const n = 20000
    let pairs = 0
    for (let i = 0; i < n; i++) if (pickHand(spot, rng, 0).length === 2) pairs++
    expect(pairs / n).toBeCloseTo(78 / 1326, 2)
  })

  it('mixes shares: at least ~70% borderline with share 0.7', () => {
    const rng = mulberry32(3)
    const n = 5000
    let border = 0
    for (let i = 0; i < n; i++) if (isBorderline(spot, pickHand(spot, rng, 0.7))) border++
    expect(border / n).toBeGreaterThan(0.68)
  })
})

describe('dealCards', () => {
  it('deals two distinct cards that match the hand class', () => {
    const rng = mulberry32(4)
    for (const hand of ALL_HANDS) {
      const [a, b] = dealCards(hand, rng)
      expect(a).not.toBe(b)
      expect(a[0] + b[0]).toBe(hand.slice(0, 2))
      if (hand.length === 2) expect(a[1]).not.toBe(b[1])
      else if (hand[2] === 's') expect(a[1]).toBe(b[1])
      else expect(a[1]).not.toBe(b[1])
    }
  })

  it('reaches every combo', () => {
    const rng = mulberry32(5)
    for (const hand of ['AA', 'AKs', 'AKo']) {
      const seen = new Set<string>()
      for (let i = 0; i < 500; i++) seen.add(dealCards(hand, rng).join(''))
      expect(seen.size).toBe(combosOf(hand))
    }
  })
})

describe('randomizer', () => {
  it('maps a roll 1–100 to raise → call → fold intervals', () => {
    const freqs = f(0.25, 0.15, 0.6)
    expect(rollIntervals(freqs)).toEqual([
      { action: 'raise', from: 1, to: 60 },
      { action: 'call', from: 61, to: 75 },
      { action: 'fold', from: 76, to: 100 },
    ])
    expect(actionForRoll(freqs, 1)).toBe('raise')
    expect(actionForRoll(freqs, 60)).toBe('raise')
    expect(actionForRoll(freqs, 61)).toBe('call')
    expect(actionForRoll(freqs, 75)).toBe('call')
    expect(actionForRoll(freqs, 76)).toBe('fold')
    expect(actionForRoll(freqs, 100)).toBe('fold')
  })

  it('pure hands give the same action for every roll', () => {
    for (const roll of [1, 50, 100]) expect(actionForRoll(f(0, 0, 1), roll)).toBe('raise')
    expect(rollIntervals(f(1, 0, 0))).toEqual([{ action: 'fold', from: 1, to: 100 }])
  })

  it('handles float frequencies without gaps', () => {
    const freqs = f(0.3, 0.1, 0.6) // 0.6 + 0.1 has float noise
    expect(actionForRoll(freqs, 70)).toBe('call')
    expect(actionForRoll(freqs, 71)).toBe('fold')
  })

  it('rolls 1–100', () => {
    const rng = mulberry32(9)
    const seen = new Set<number>()
    for (let i = 0; i < 5000; i++) seen.add(rollD100(rng))
    expect(Math.min(...seen)).toBe(1)
    expect(Math.max(...seen)).toBe(100)
    expect(seen.size).toBe(100)
  })
})
