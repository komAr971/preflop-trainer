import { describe, expect, it } from 'vitest'
import { parseChart, parseChartJson, positionName, serializeChart, spotKey, type ChartFile } from './chart'

function file(spots: ChartFile['spots']): ChartFile {
  return {
    version: 1,
    name: 'Test',
    format: { players: 6, stackBb: 100 },
    sizings: { openBb: 2.5, sbOpenBb: 3, threeBetIpX: 3, threeBetOopX: 4, fourBetX: 2.2 },
    spots,
  }
}

function errorsOf(input: unknown): string[] {
  const res = parseChart(input)
  if (res.ok) throw new Error('expected parse failure')
  return res.errors
}

describe('spotKey', () => {
  it('builds stable keys', () => {
    expect(spotKey({ kind: 'rfi', hero: 'CO' })).toBe('rfi:CO')
    expect(spotKey({ kind: 'vsOpen', hero: 'BB', villain: 'BTN' })).toBe('vsOpen:BB:BTN')
    expect(spotKey({ kind: 'vs3bet', hero: 'CO', villain: 'BTN' })).toBe('vs3bet:CO:BTN')
  })
})

describe('parseChart', () => {
  it('compiles frequencies with fold as the remainder', () => {
    const res = parseChart(
      file([{ spot: { kind: 'vsOpen', hero: 'BB', villain: 'BTN' }, actions: { raise: 'AA,AKs:0.5', call: 'AKs:0.5,KQo' } }]),
    )
    if (!res.ok) throw new Error(res.errors.join('\n'))
    const spot = res.chart.spots.get('vsOpen:BB:BTN')!
    expect(spot.hands.get('AA')).toEqual({ fold: 0, call: 0, raise: 1 })
    expect(spot.hands.get('AKs')).toEqual({ fold: 0, call: 0.5, raise: 0.5 })
    expect(spot.hands.get('KQo')).toEqual({ fold: 0, call: 1, raise: 0 })
    expect(spot.hands.get('72o')).toEqual({ fold: 1, call: 0, raise: 0 })
    expect(spot.hands.size).toBe(169)
  })

  it('allows limp (call) only for SB in RFI', () => {
    expect(parseChart(file([{ spot: { kind: 'rfi', hero: 'SB' }, actions: { call: 'K9o' } }])).ok).toBe(true)
    expect(errorsOf(file([{ spot: { kind: 'rfi', hero: 'CO' }, actions: { call: 'K9o' } }])).join()).toMatch(/rfi:CO/)
  })

  it('rejects RFI from BB', () => {
    expect(errorsOf(file([{ spot: { kind: 'rfi', hero: 'BB' }, actions: { raise: 'AA' } }])).join()).toMatch(/BB/)
  })

  it('requires opener to act before hero in vsOpen', () => {
    expect(errorsOf(file([{ spot: { kind: 'vsOpen', hero: 'CO', villain: 'BTN' }, actions: { raise: 'AA' } }])).join()).toMatch(
      /vsOpen:CO:BTN/,
    )
  })

  it('requires 3-bettor to act after hero in vs3bet', () => {
    expect(parseChart(file([{ spot: { kind: 'vs3bet', hero: 'CO', villain: 'BB' }, actions: { raise: 'AA' } }])).ok).toBe(true)
    expect(errorsOf(file([{ spot: { kind: 'vs3bet', hero: 'BTN', villain: 'CO' }, actions: { raise: 'AA' } }])).join()).toMatch(
      /vs3bet:BTN:CO/,
    )
  })

  it('rejects duplicate spots', () => {
    const s = { spot: { kind: 'rfi', hero: 'CO' }, actions: { raise: 'AA' } } as const
    expect(errorsOf(file([s, s])).join()).toMatch(/rfi:CO/)
  })

  it('reports bad range token with spot and action', () => {
    const msg = errorsOf(file([{ spot: { kind: 'rfi', hero: 'UTG' }, actions: { raise: 'AA,QXs' } }])).join()
    expect(msg).toMatch(/rfi:UTG/)
    expect(msg).toMatch(/raise/)
    expect(msg).toMatch(/QXs/)
  })

  it('rejects hands whose frequencies sum above 1', () => {
    const msg = errorsOf(
      file([{ spot: { kind: 'vsOpen', hero: 'BB', villain: 'SB' }, actions: { raise: 'AKs:0.7', call: 'AKs:0.5' } }]),
    ).join()
    expect(msg).toMatch(/AKs/)
  })

  it('rejects wrong structure with field path', () => {
    expect(errorsOf({ ...file([]), version: 2 }).join()).toMatch(/version/)
    expect(errorsOf({ ...file([]), sizings: { openBb: -1 } }).join()).toMatch(/sizings/)
    expect(errorsOf(null).length).toBeGreaterThan(0)
  })
})

describe('serializeChart', () => {
  it('round-trips through parseChart', () => {
    const input = file([
      { spot: { kind: 'rfi', hero: 'CO' }, actions: { raise: '22+,A2s+,KTo+,AJo:0.5' } },
      { spot: { kind: 'vsOpen', hero: 'BB', villain: 'BTN' }, actions: { raise: 'QQ+', call: 'JJ-22' } },
    ])
    const first = parseChart(input)
    if (!first.ok) throw new Error(first.errors.join('\n'))
    const second = parseChart(JSON.parse(JSON.stringify(serializeChart(first.chart))))
    if (!second.ok) throw new Error(second.errors.join('\n'))
    expect(second.chart).toEqual(first.chart)
  })
})

describe('parseChartJson', () => {
  it('accepts a valid chart file', () => {
    const res = parseChartJson(JSON.stringify(file([{ spot: { kind: 'rfi', hero: 'CO' }, actions: { raise: 'AA' } }])))
    expect(res.ok).toBe(true)
  })
  it('reports broken JSON', () => {
    const res = parseChartJson('{ "version": 1,')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors[0]).toMatch(/^JSON/)
  })
})

describe('MP / HJ', () => {
  it('imports MP as HJ', () => {
    const res = parseChart(file([{ spot: { kind: 'vsOpen', hero: 'CO', villain: 'MP' as 'HJ' }, actions: { raise: 'AA' } }]))
    if (!res.ok) throw new Error(res.errors.join())
    expect([...res.chart.spots.keys()]).toEqual(['vsOpen:CO:HJ'])
  })

  it('shows the preferred name', () => {
    expect(positionName('HJ', 'MP')).toBe('MP')
    expect(positionName('HJ', 'HJ')).toBe('HJ')
    expect(positionName('CO', 'MP')).toBe('CO')
  })
})

describe('vs4bet rules', () => {
  it('requires the 4-bettor (opener) to act before hero', () => {
    expect(parseChart(file([{ spot: { kind: 'vs4bet', hero: 'BTN', villain: 'CO' }, actions: { raise: 'AA' } }])).ok).toBe(true)
    expect(errorsOf(file([{ spot: { kind: 'vs4bet', hero: 'CO', villain: 'BTN' }, actions: { raise: 'AA' } }])).join()).toMatch(
      /vs4bet:CO:BTN/,
    )
  })
})
