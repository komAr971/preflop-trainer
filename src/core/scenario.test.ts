import { describe, expect, it } from 'vitest'
import { parseChart, type Chart, type Spot } from './chart'
import { buildScenario } from './scenario'
import { mulberry32 } from './trainer'

const sizings = { openBb: 2.5, sbOpenBb: 3, threeBetIpX: 3, threeBetOopX: 4, fourBetX: 2.2 }

function chartWith(spot: Spot, actions: { call?: string; raise?: string } = { raise: 'AA' }): Chart {
  const res = parseChart({ version: 1, name: 't', format: { players: 6, stackBb: 100 }, sizings, spots: [{ spot, actions }] })
  if (!res.ok) throw new Error(res.errors.join())
  return res.chart
}

function scenarioFor(spot: Spot, actions?: { call?: string; raise?: string }) {
  const chart = chartWith(spot, actions)
  return buildScenario([...chart.spots.values()][0], chart.sizings)
}

const seat = (s: ReturnType<typeof scenarioFor>, p: string) => s.seats.find((x) => x.position === p)!

describe('buildScenario: RFI', () => {
  it('CO open: earlier seats folded, blinds posted and waiting', () => {
    const s = scenarioFor({ kind: 'rfi', hero: 'CO' })
    expect(seat(s, 'UTG').status).toBe('folded')
    expect(seat(s, 'HJ').status).toBe('folded')
    expect(seat(s, 'CO')).toMatchObject({ status: 'hero', betBb: 0 })
    expect(seat(s, 'BTN').status).toBe('waiting')
    expect(seat(s, 'SB')).toMatchObject({ status: 'waiting', betBb: 0.5 })
    expect(seat(s, 'BB')).toMatchObject({ status: 'waiting', betBb: 1 })
    expect(s.potBb).toBe(1.5)
    expect(s.actions).toEqual([{ action: 'fold' }, { action: 'raise', toBb: 2.5 }])
  })

  it('SB open uses sbOpenBb and offers limp only if the chart limps', () => {
    expect(scenarioFor({ kind: 'rfi', hero: 'SB' }).actions).toEqual([{ action: 'fold' }, { action: 'raise', toBb: 3 }])
    expect(scenarioFor({ kind: 'rfi', hero: 'SB' }, { raise: 'AA', call: 'K9o' }).actions).toEqual([
      { action: 'fold' },
      { action: 'call', toBb: 1 },
      { action: 'raise', toBb: 3 },
    ])
  })
})

describe('buildScenario: vs open', () => {
  it('BTN vs CO open: 3-bet in position', () => {
    const s = scenarioFor({ kind: 'vsOpen', hero: 'BTN', villain: 'CO' })
    expect(seat(s, 'CO')).toMatchObject({ status: 'acted', betBb: 2.5 })
    expect(seat(s, 'UTG').status).toBe('folded')
    expect(s.potBb).toBe(4)
    expect(s.actions).toEqual([{ action: 'fold' }, { action: 'call', toBb: 2.5 }, { action: 'raise', toBb: 7.5 }])
  })

  it('BB vs BTN open: 3-bet out of position, hero already has 1bb in', () => {
    const s = scenarioFor({ kind: 'vsOpen', hero: 'BB', villain: 'BTN' })
    expect(seat(s, 'BB')).toMatchObject({ status: 'hero', betBb: 1 })
    expect(seat(s, 'SB')).toMatchObject({ status: 'folded', betBb: 0.5 })
    expect(s.actions).toEqual([{ action: 'fold' }, { action: 'call', toBb: 2.5 }, { action: 'raise', toBb: 10 }])
  })

  it('BB vs SB open: BB is in position postflop', () => {
    const s = scenarioFor({ kind: 'vsOpen', hero: 'BB', villain: 'SB' })
    expect(seat(s, 'SB').betBb).toBe(3)
    expect(s.actions.at(-1)).toEqual({ action: 'raise', toBb: 9 })
  })
})

describe('buildScenario: vs 3-bet', () => {
  it('CO open, BTN 3-bets in position, hero 4-bets', () => {
    const s = scenarioFor({ kind: 'vs3bet', hero: 'CO', villain: 'BTN' })
    expect(seat(s, 'CO')).toMatchObject({ status: 'hero', betBb: 2.5 })
    expect(seat(s, 'BTN')).toMatchObject({ status: 'acted', betBb: 7.5 })
    expect(seat(s, 'SB')).toMatchObject({ status: 'folded', betBb: 0.5 })
    expect(seat(s, 'BB')).toMatchObject({ status: 'folded', betBb: 1 })
    expect(s.potBb).toBe(11.5)
    expect(s.actions).toEqual([{ action: 'fold' }, { action: 'call', toBb: 7.5 }, { action: 'raise', toBb: 16.5 }])
  })

  it('UTG open, BB 3-bets out of position', () => {
    const s = scenarioFor({ kind: 'vs3bet', hero: 'UTG', villain: 'BB' })
    expect(seat(s, 'BB').betBb).toBe(10)
    expect(seat(s, 'HJ').status).toBe('folded')
    expect(s.actions.at(-1)).toEqual({ action: 'raise', toBb: 22 })
  })
})

describe('buildScenario: vs 4-bet', () => {
  it('BTN 3-bets CO open in position, CO 4-bets; hero can call or go all-in', () => {
    const s = scenarioFor({ kind: 'vs4bet', hero: 'BTN', villain: 'CO' })
    expect(seat(s, 'BTN')).toMatchObject({ status: 'hero', betBb: 7.5 })
    expect(seat(s, 'CO')).toMatchObject({ status: 'acted', betBb: 16.5 })
    expect(seat(s, 'BB')).toMatchObject({ status: 'folded', betBb: 1 })
    expect(s.heroThreeBetBb).toBe(7.5)
    expect(s.actions).toEqual([{ action: 'fold' }, { action: 'call', toBb: 16.5 }, { action: 'raise', toBb: 100 }])
  })

  it('BB 3-bets out of position (4x), then faces the 4-bet', () => {
    const s = scenarioFor({ kind: 'vs4bet', hero: 'BB', villain: 'UTG' })
    expect(s.heroThreeBetBb).toBe(10)
    expect(s.facingBb).toBe(22)
  })
})

describe('buildScenario: vs limp', () => {
  const limpScenario = (spot: Spot, seed: number) => {
    const chart = chartWith(spot)
    return buildScenario([...chart.spots.values()][0], chart.sizings, mulberry32(seed))
  }

  it('seats the given number of limpers before hero, each with 1bb', () => {
    for (let seed = 0; seed < 20; seed++) {
      const s = limpScenario({ kind: 'vsLimp', hero: 'BTN', limpers: 2 }, seed)
      expect(s.limpers).toHaveLength(2)
      for (const p of s.limpers!) {
        expect(['UTG', 'HJ', 'CO']).toContain(p)
        expect(seat(s, p)).toMatchObject({ status: 'acted', betBb: 1 })
      }
      // iso in position: 4bb + 1bb for the extra limper
      expect(s.actions).toEqual([{ action: 'fold' }, { action: 'call', toBb: 1 }, { action: 'raise', toBb: 5 }])
    }
  })

  it('"3+" seats 3 or more limpers', () => {
    const counts = new Set<number>()
    for (let seed = 0; seed < 50; seed++) counts.add(limpScenario({ kind: 'vsLimp', hero: 'BB', limpers: 3 }, seed).limpers!.length)
    expect([...counts].sort()).toEqual([3, 4, 5])
  })

  it('BB can check or raise (no fold), iso out of position', () => {
    const s = limpScenario({ kind: 'vsLimp', hero: 'BB', limpers: 1 }, 1)
    expect(s.actions).toEqual([{ action: 'call', toBb: 1 }, { action: 'raise', toBb: 5 }])
  })
})
