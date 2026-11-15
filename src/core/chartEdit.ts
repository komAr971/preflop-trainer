import { POSITIONS, spotKey, type Action, type Chart, type CompiledSpot, type Sizings, type Spot, type SpotKey } from './chart'
import { ALL_HANDS, combosOf, type Hand } from './hands'
import { RangeParseError, parseRange } from './range'

/** Every spot the app supports, in a stable display order. */
export const ALL_SPOTS: { key: SpotKey; spot: Spot }[] = (() => {
  const out: Spot[] = []
  for (const hero of POSITIONS) if (hero !== 'BB') out.push({ kind: 'rfi', hero })
  POSITIONS.forEach((villain, i) => {
    for (const hero of POSITIONS.slice(i + 1)) if (villain !== 'BB') out.push({ kind: 'vsOpen', hero, villain })
  })
  POSITIONS.forEach((hero, i) => {
    if (hero === 'BB') return
    for (const villain of POSITIONS.slice(i + 1)) out.push({ kind: 'vs3bet', hero, villain })
  })
  POSITIONS.forEach((villain, i) => {
    if (villain === 'BB') return
    for (const hero of POSITIONS.slice(i + 1)) out.push({ kind: 'vs4bet', hero, villain })
  })
  return out.map((spot) => ({ key: spotKey(spot), spot }))
})()

export function allowedActions(spot: Spot): Action[] {
  if (spot.kind === 'rfi' && spot.hero !== 'SB') return ['fold', 'raise']
  return ['fold', 'call', 'raise']
}

export interface Brush {
  call: number
  raise: number
}

const EPS = 1e-9
const round = (n: number) => Math.round(n * 1e6) / 1e6

function withSpot(chart: Chart, key: SpotKey, spot: CompiledSpot): Chart {
  const spots = new Map(chart.spots)
  spots.set(key, spot)
  return { ...chart, spots }
}

export function paintHands(chart: Chart, key: SpotKey, hands: Hand[], brush: Brush): Chart {
  const current = chart.spots.get(key)
  if (!current) return chart
  const next = new Map(current.hands)
  const freqs = { fold: Math.max(0, round(1 - brush.call - brush.raise)), call: brush.call, raise: brush.raise }
  for (const h of hands) next.set(h, freqs)
  return withSpot(chart, key, { ...current, hands: next })
}

export type EditResult = { ok: true; chart: Chart } | { ok: false; error: string }

/** Replaces one action's range from a range string; the other action stays as is. */
export function setActionRange(chart: Chart, key: SpotKey, action: 'call' | 'raise', text: string): EditResult {
  const current = chart.spots.get(key)
  if (!current) return { ok: false, error: `Unknown spot ${key}` }
  let range
  try {
    range = parseRange(text)
  } catch (e) {
    if (e instanceof RangeParseError) return { ok: false, error: `Invalid token "${e.token}"` }
    throw e
  }
  const other = action === 'call' ? 'raise' : 'call'
  const next = new Map(current.hands)
  const over: Hand[] = []
  for (const h of ALL_HANDS) {
    const f = current.hands.get(h)!
    const value = range.get(h) ?? 0
    if (value + f[other] > 1 + EPS) over.push(h)
    next.set(h, { ...f, [action]: value, fold: Math.max(0, round(1 - value - f[other])) })
  }
  if (over.length) return { ok: false, error: `Above 100% with ${other}: ${over.join(', ')}` }
  return { ok: true, chart: withSpot(chart, key, { ...current, hands: next }) }
}

export function addSpot(chart: Chart, spot: Spot): Chart {
  const hands = new Map(ALL_HANDS.map((h) => [h, { fold: 1, call: 0, raise: 0 }]))
  return withSpot(chart, spotKey(spot), { spot, hands })
}

export function removeSpot(chart: Chart, key: SpotKey): Chart {
  const spots = new Map(chart.spots)
  spots.delete(key)
  return { ...chart, spots }
}

export function setName(chart: Chart, name: string): Chart {
  return { ...chart, name }
}

export function setSizings(chart: Chart, patch: Partial<Sizings>): Chart {
  return { ...chart, sizings: { ...chart.sizings, ...patch } }
}

/** Share of all 1326 combos (in %) that take the action. */
export function rangeWidth(spot: CompiledSpot, action: Action): number {
  const combos = ALL_HANDS.reduce((s, h) => s + combosOf(h) * spot.hands.get(h)![action], 0)
  return (combos / 1326) * 100
}
