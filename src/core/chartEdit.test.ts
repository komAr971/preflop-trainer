import { describe, expect, it } from 'vitest'
import { parseChart, serializeChart, type Chart } from './chart'
import {
  ALL_SPOTS,
  addSpot,
  allowedActions,
  paintHands,
  rangeWidth,
  removeSpot,
  setActionRange,
  setName,
  setSizings,
} from './chartEdit'

function chart(): Chart {
  const res = parseChart({
    version: 1,
    name: 'T',
    format: { players: 6, stackBb: 100 },
    sizings: { openBb: 2.5, sbOpenBb: 3, threeBetIpX: 3, threeBetOopX: 4, fourBetX: 2.2 },
    spots: [
      { spot: { kind: 'rfi', hero: 'CO' }, actions: { raise: 'AA,KK' } },
      { spot: { kind: 'vsOpen', hero: 'BB', villain: 'BTN' }, actions: { raise: 'AA', call: 'KQo' } },
    ],
  })
  if (!res.ok) throw new Error(res.errors.join())
  return res.chart
}

describe('ALL_SPOTS', () => {
  it('lists 62 valid spots', () => {
    expect(ALL_SPOTS).toHaveLength(62)
    expect(new Set(ALL_SPOTS.map((s) => s.key)).size).toBe(62)
  })
})

describe('allowedActions', () => {
  it('allows limp only for SB RFI', () => {
    expect(allowedActions({ kind: 'rfi', hero: 'CO' })).toEqual(['fold', 'raise'])
    expect(allowedActions({ kind: 'rfi', hero: 'SB' })).toEqual(['fold', 'call', 'raise'])
    expect(allowedActions({ kind: 'vsOpen', hero: 'BB', villain: 'BTN' })).toEqual(['fold', 'call', 'raise'])
  })
})

describe('paintHands', () => {
  it('sets frequencies with fold as the remainder, without mutating the input', () => {
    const before = chart()
    const after = paintHands(before, 'rfi:CO', ['QQ', 'AKs'], { call: 0, raise: 0.5 })
    expect(after.spots.get('rfi:CO')!.hands.get('QQ')).toEqual({ fold: 0.5, call: 0, raise: 0.5 })
    expect(after.spots.get('rfi:CO')!.hands.get('AKs')).toEqual({ fold: 0.5, call: 0, raise: 0.5 })
    expect(before.spots.get('rfi:CO')!.hands.get('QQ')).toEqual({ fold: 1, call: 0, raise: 0 })
  })

  it('round-trips through serialize/parse', () => {
    const painted = paintHands(chart(), 'vsOpen:BB:BTN', ['T9s'], { call: 0.75, raise: 0.25 })
    const res = parseChart(serializeChart(painted))
    if (!res.ok) throw new Error()
    expect(res.chart.spots.get('vsOpen:BB:BTN')!.hands.get('T9s')).toEqual({ fold: 0, call: 0.75, raise: 0.25 })
  })
})

describe('setActionRange', () => {
  it('replaces one action and keeps the other', () => {
    const res = setActionRange(chart(), 'vsOpen:BB:BTN', 'call', 'KQo,KJo:0.5')
    if (!res.ok) throw new Error(res.error)
    const hands = res.chart.spots.get('vsOpen:BB:BTN')!.hands
    expect(hands.get('KJo')).toEqual({ fold: 0.5, call: 0.5, raise: 0 })
    expect(hands.get('AA')).toEqual({ fold: 0, call: 0, raise: 1 })
  })

  it('rejects invalid tokens', () => {
    const res = setActionRange(chart(), 'rfi:CO', 'raise', 'AA,QXs')
    expect(res).toEqual({ ok: false, error: expect.stringContaining('QXs') })
  })

  it('rejects overlaps above 100%', () => {
    const res = setActionRange(chart(), 'vsOpen:BB:BTN', 'call', 'AA')
    expect(res).toEqual({ ok: false, error: expect.stringContaining('AA') })
  })
})

describe('spots, name, sizings', () => {
  it('adds an all-fold spot and removes it', () => {
    const added = addSpot(chart(), { kind: 'rfi', hero: 'UTG' })
    expect(added.spots.get('rfi:UTG')!.hands.get('AA')).toEqual({ fold: 1, call: 0, raise: 0 })
    expect(removeSpot(added, 'rfi:UTG').spots.has('rfi:UTG')).toBe(false)
  })

  it('renames and changes sizings', () => {
    expect(setName(chart(), 'New').name).toBe('New')
    expect(setSizings(chart(), { openBb: 2 }).sizings.openBb).toBe(2)
  })

  it('measures range width in % of combos', () => {
    expect(rangeWidth(chart().spots.get('rfi:CO')!, 'raise')).toBeCloseTo((12 / 1326) * 100)
  })
})
