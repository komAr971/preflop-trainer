import { describe, expect, it } from 'vitest'
import { parseChart, type CompiledSpot } from './chart'
import { checkDrawing, drawingToSpot } from './draw'

function spot(raise: string, call?: string): CompiledSpot {
  const res = parseChart({
    version: 1,
    name: 't',
    format: { players: 6, stackBb: 100 },
    sizings: { openBb: 2.5, sbOpenBb: 3, threeBetIpX: 3, threeBetOopX: 4, fourBetX: 2.2 },
    spots: [{ spot: { kind: 'vsOpen', hero: 'BB', villain: 'BTN' }, actions: { raise, call } }],
  })
  if (!res.ok) throw new Error(res.errors.join())
  return [...res.chart.spots.values()][0]
}

describe('checkDrawing', () => {
  it('is 100% when the drawing matches and unpainted hands count as fold', () => {
    const target = spot('AA,KK')
    const res = checkDrawing(target, new Map([['AA', 'raise'], ['KK', 'raise']]))
    expect(res.score).toBe(100)
    expect(res.wrong).toEqual([])
  })

  it('weights mistakes by combos among relevant hands only', () => {
    const target = spot('AA,AKo')
    // relevant: AA (6) + AKo (12); AKo missed → 6 / 18
    const res = checkDrawing(target, new Map([['AA', 'raise']]))
    expect(res.wrong).toEqual(['AKo'])
    expect(res.score).toBeCloseTo((6 / 18) * 100)
    expect(res.cells.get('AKo')).toMatchObject({ drawn: 'fold', ok: false })
  })

  it('scores an empty grid 0% and counts painted folds as relevant mistakes', () => {
    const target = spot('AA')
    expect(checkDrawing(target, new Map()).score).toBe(0)
    // AA ok (6), 72o painted raise wrong (12) → 6 / 18
    expect(checkDrawing(target, new Map([['AA', 'raise'], ['72o', 'raise']])).score).toBeCloseTo((6 / 18) * 100)
  })

  it('accepts any action at or above the threshold in mixed hands', () => {
    const target = spot('AJo:0.3', 'AJo:0.7')
    expect(checkDrawing(target, new Map([['AJo', 'raise']])).cells.get('AJo')!.ok).toBe(true)
    expect(checkDrawing(target, new Map([['AJo', 'fold']])).cells.get('AJo')!.ok).toBe(false)
    expect(checkDrawing(target, new Map([['AJo', 'raise']]), 0.5).cells.get('AJo')!.ok).toBe(false)
  })
})

describe('drawingToSpot', () => {
  it('turns painted actions into pure frequencies for display', () => {
    const s = drawingToSpot({ kind: 'rfi', hero: 'CO' }, new Map([['AA', 'raise']]))
    expect(s.hands.get('AA')).toEqual({ fold: 0, call: 0, raise: 1 })
    expect(s.hands.get('72o')).toEqual({ fold: 1, call: 0, raise: 0 })
  })
})
