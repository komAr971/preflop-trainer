import { describe, expect, it } from 'vitest'
import { POSITIONS, parseChart, spotKey, type Chart } from '../core/chart'
import { ALL_HANDS, combosOf } from '../core/hands'
import { starterChart } from './starterChart'

function chart(): Chart {
  const res = parseChart(starterChart)
  if (!res.ok) throw new Error(res.errors.join('\n'))
  return res.chart
}

function raisePercent(c: Chart, key: string): number {
  const spot = c.spots.get(key)!
  const combos = ALL_HANDS.reduce((s, h) => s + combosOf(h) * spot.hands.get(h)!.raise, 0)
  return (combos / 1326) * 100
}

describe('starter chart', () => {
  it('parses without errors', () => {
    expect(() => chart()).not.toThrow()
  })

  it('covers every 6-max spot: 5 RFI, 15 vs open, 15 vs 3-bet, 15 vs 4-bet, 12 vs limp', () => {
    const keys = new Set(chart().spots.keys())
    const expected: string[] = []
    POSITIONS.forEach((p, i) => {
      for (const limpers of [1, 2, 3] as const) if (i >= limpers) expected.push(spotKey({ kind: 'vsLimp', hero: p, limpers }))
      if (p !== 'BB') expected.push(spotKey({ kind: 'rfi', hero: p }))
      for (const later of POSITIONS.slice(i + 1)) {
        expected.push(spotKey({ kind: 'vsOpen', hero: later, villain: p }))
        if (p !== 'BB') expected.push(spotKey({ kind: 'vs3bet', hero: p, villain: later }))
        if (p !== 'BB') expected.push(spotKey({ kind: 'vs4bet', hero: later, villain: p }))
      }
    })
    expect([...keys].sort()).toEqual(expected.sort())
  })

  it('RFI ranges widen with position: UTG ⊂ HJ ⊂ CO ⊂ BTN', () => {
    const c = chart()
    const order = ['UTG', 'HJ', 'CO', 'BTN']
    for (let i = 1; i < order.length; i++) {
      const tight = c.spots.get(`rfi:${order[i - 1]}`)!
      const wide = c.spots.get(`rfi:${order[i]}`)!
      for (const h of ALL_HANDS) {
        if (tight.hands.get(h)!.raise > 0) expect(wide.hands.get(h)!.raise, `${h} in ${order[i]}`).toBeGreaterThan(0)
      }
    }
  })

  it('RFI widths are in sane bounds', () => {
    const c = chart()
    expect(raisePercent(c, 'rfi:UTG')).toBeGreaterThan(12)
    expect(raisePercent(c, 'rfi:UTG')).toBeLessThan(20)
    expect(raisePercent(c, 'rfi:BTN')).toBeGreaterThan(38)
    expect(raisePercent(c, 'rfi:BTN')).toBeLessThan(50)
  })

  it('always continues with AA and KK', () => {
    for (const { hands } of chart().spots.values()) {
      expect(hands.get('AA')!.fold).toBe(0)
      expect(hands.get('KK')!.fold).toBe(0)
    }
  })
})
