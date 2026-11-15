import { describe, expect, it } from 'vitest'
import { parseChart, type CompiledSpot } from './chart'
import { explainMistake } from './explain'

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

describe('explainMistake', () => {
  const s = spot('QQ+,AKs', 'JJ-99,AQs,KQs:0.2')

  it('hand not in the chosen range', () => {
    const e = explainMistake(s, 'JJ', 'raise', ['call'])
    expect(e).toMatchObject({ reason: 'notInRange', chosenFreq: 0, accepted: ['call'] })
    expect(e.border).toEqual([{ hand: 'QQ', action: 'raise' }])
    expect(e.widths.raise).toBeCloseTo((22 / 1326) * 100)
  })

  it('action exists but below the threshold', () => {
    expect(explainMistake(s, 'KQs', 'call', ['fold']).reason).toBe('belowThreshold')
  })

  it('randomizer picked another action', () => {
    expect(explainMistake(s, 'KQs', 'call', ['fold'], { rng: true }).reason).toBe('wrongRoll')
  })

  it('right action, wrong size', () => {
    expect(explainMistake(s, 'AA', 'raise', ['raise'], { sizeWrong: true }).reason).toBe('wrongSize')
  })

  it('lists no border when no neighbour takes the chosen action', () => {
    expect(explainMistake(s, '72o', 'raise', ['fold']).border).toEqual([])
  })
})
