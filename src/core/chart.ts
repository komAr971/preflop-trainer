import { z } from 'zod'
import { ALL_HANDS, type Hand } from './hands'
import { RangeParseError, formatRange, parseRange, type Range } from './range'

/** Preflop action order. */
export const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const
export type Position = (typeof POSITIONS)[number]

/** fold / call (or limp in SB RFI) / raise (open, 3-bet or 4-bet depending on spot). */
export const ACTIONS = ['fold', 'call', 'raise'] as const
export type Action = (typeof ACTIONS)[number]
type PlayableAction = Exclude<Action, 'fold'>

const positionSchema = z.enum(POSITIONS)

const spotSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('rfi'), hero: positionSchema }),
  z.object({ kind: z.literal('vsOpen'), hero: positionSchema, villain: positionSchema }),
  z.object({ kind: z.literal('vs3bet'), hero: positionSchema, villain: positionSchema }),
])
export type Spot = z.infer<typeof spotSchema>
export type SpotKey = string

const positive = z.number().positive()

export const chartFileSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  description: z.string().optional(),
  format: z.object({ players: z.literal(6), stackBb: z.literal(100) }),
  sizings: z.object({
    openBb: positive,
    sbOpenBb: positive,
    threeBetIpX: positive,
    threeBetOopX: positive,
    fourBetX: positive,
  }),
  spots: z.array(
    z.object({
      spot: spotSchema,
      /** Range strings per action; fold is implicit (the remainder). */
      actions: z.object({ call: z.string().optional(), raise: z.string().optional() }).strict(),
    }),
  ),
})
export type ChartFile = z.infer<typeof chartFileSchema>
export type Sizings = ChartFile['sizings']

export type Frequencies = Record<Action, number>

export interface CompiledSpot {
  spot: Spot
  /** All 169 hands, frequencies sum to 1. */
  hands: Map<Hand, Frequencies>
}

export interface Chart {
  name: string
  description?: string
  sizings: Sizings
  spots: Map<SpotKey, CompiledSpot>
}

export type ParseChartResult = { ok: true; chart: Chart } | { ok: false; errors: string[] }

export function spotKey(spot: Spot): SpotKey {
  return spot.kind === 'rfi' ? `rfi:${spot.hero}` : `${spot.kind}:${spot.hero}:${spot.villain}`
}

const order = (p: Position) => POSITIONS.indexOf(p)

function spotRuleError(spot: Spot, actions: Partial<Record<PlayableAction, string>>): string | null {
  switch (spot.kind) {
    case 'rfi':
      if (spot.hero === 'BB') return 'BB cannot open (RFI)'
      if (actions.call !== undefined && spot.hero !== 'SB') return 'call (limp) in RFI is allowed only for SB'
      return null
    case 'vsOpen':
      return order(spot.villain) < order(spot.hero) ? null : 'opener must act before hero'
    case 'vs3bet':
      return order(spot.villain) > order(spot.hero) ? null : '3-bettor must act after hero'
  }
}

const EPS = 1e-9
const round = (n: number) => Math.round(n * 1e6) / 1e6

export function parseChart(input: unknown): ParseChartResult {
  const parsed = chartFileSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    }
  }
  const file = parsed.data
  const errors: string[] = []
  const spots = new Map<SpotKey, CompiledSpot>()

  for (const { spot, actions } of file.spots) {
    const key = spotKey(spot)
    if (spots.has(key)) {
      errors.push(`${key}: duplicate spot`)
      continue
    }
    const ruleError = spotRuleError(spot, actions)
    if (ruleError) {
      errors.push(`${key}: ${ruleError}`)
      continue
    }

    const ranges: Partial<Record<PlayableAction, Range>> = {}
    for (const action of ['call', 'raise'] as const) {
      const text = actions[action]
      if (text === undefined) continue
      try {
        ranges[action] = parseRange(text)
      } catch (e) {
        if (!(e instanceof RangeParseError)) throw e
        errors.push(`${key} ${action}: invalid token "${e.token}"`)
      }
    }

    const hands = new Map<Hand, Frequencies>()
    for (const hand of ALL_HANDS) {
      const call = ranges.call?.get(hand) ?? 0
      const raise = ranges.raise?.get(hand) ?? 0
      if (call + raise > 1 + EPS) {
        errors.push(`${key}: ${hand} frequencies sum to ${round(call + raise)} (> 1)`)
      }
      hands.set(hand, { fold: Math.max(0, round(1 - call - raise)), call, raise })
    }
    spots.set(key, { spot, hands })
  }

  if (errors.length) return { ok: false, errors }
  return {
    ok: true,
    chart: { name: file.name, description: file.description, sizings: file.sizings, spots },
  }
}

export function serializeChart(chart: Chart): ChartFile {
  return {
    version: 1,
    name: chart.name,
    ...(chart.description !== undefined && { description: chart.description }),
    format: { players: 6, stackBb: 100 },
    sizings: chart.sizings,
    spots: [...chart.spots.values()].map(({ spot, hands }) => {
      const actions: ChartFile['spots'][number]['actions'] = {}
      for (const action of ['call', 'raise'] as const) {
        const range: Range = new Map()
        for (const [hand, freqs] of hands) if (freqs[action] > 0) range.set(hand, freqs[action])
        if (range.size) actions[action] = formatRange(range)
      }
      return { spot, actions }
    }),
  }
}

/** Parses a user-supplied JSON text (import). */
export function parseChartJson(text: string): { ok: true; file: ChartFile; chart: Chart } | { ok: false; errors: string[] } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (e) {
    return { ok: false, errors: [`JSON: ${(e as Error).message}`] }
  }
  const res = parseChart(data)
  if (!res.ok) return res
  return { ok: true, file: chartFileSchema.parse(data), chart: res.chart }
}
