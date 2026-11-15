import { ALL_HANDS, RANKS, isHand, rankIndex, type Hand } from './hands'

/** Hand class → frequency in (0, 1]. */
export type Range = Map<Hand, number>

export class RangeParseError extends Error {
  readonly token: string
  constructor(token: string) {
    super(`Invalid range token: "${token}"`)
    this.name = 'RangeParseError'
    this.token = token
  }
}

function normalizeHand(raw: string): string {
  if (raw.length < 2) return raw
  return raw.slice(0, 2).toUpperCase() + raw.slice(2).toLowerCase()
}

/** "AK" → ["AKs", "AKo"], "AKs" → ["AKs"]; null if not a valid hand. */
function expandBase(raw: string): Hand[] | null {
  const h = normalizeHand(raw)
  if (h.length === 2 && h[0] !== h[1]) {
    const pair = [h + 's', h + 'o']
    return pair.every(isHand) ? pair : null
  }
  return isHand(h) ? [h] : null
}

function expandPlus(base: Hand): Hand[] {
  const hi = rankIndex(base[0])
  const lo = rankIndex(base[1])
  if (base.length === 2) return RANKS.slice(0, hi + 1).map((r) => r + r)
  const suffix = base[2]
  return RANKS.slice(hi + 1, lo + 1).map((r) => base[0] + r + suffix)
}

function expandDash(from: Hand, to: Hand): Hand[] | null {
  const isPair = (h: Hand) => h.length === 2
  if (isPair(from) && isPair(to)) {
    const [a, b] = [rankIndex(from[0]), rankIndex(to[0])].sort((x, y) => x - y)
    return RANKS.slice(a, b + 1).map((r) => r + r)
  }
  if (isPair(from) || isPair(to) || from[0] !== to[0] || from[2] !== to[2]) return null
  const [a, b] = [rankIndex(from[1]), rankIndex(to[1])].sort((x, y) => x - y)
  return RANKS.slice(a, b + 1).map((r) => from[0] + r + from[2])
}

function expandToken(body: string): Hand[] | null {
  if (body.includes('-')) {
    const parts = body.split('-')
    if (parts.length !== 2) return null
    const from = expandBase(parts[0])
    const to = expandBase(parts[1])
    if (!from || !to || from.length !== 1 || to.length !== 1) return null
    return expandDash(from[0], to[0])
  }
  if (body.endsWith('+')) {
    const bases = expandBase(body.slice(0, -1))
    return bases ? bases.flatMap(expandPlus) : null
  }
  return expandBase(body)
}

/** Parses PioSolver / GTO Wizard style strings: "77+,A9s+,KTo+,A5s-A2s,AJo:0.25". */
export function parseRange(input: string): Range {
  const range: Range = new Map()
  for (const rawToken of input.split(',')) {
    const token = rawToken.trim()
    if (!token) continue
    const [body, freqRaw, ...rest] = token.split(':')
    const freq = freqRaw === undefined ? 1 : Number(freqRaw)
    if (rest.length || !Number.isFinite(freq) || freq <= 0 || freq > 1) {
      throw new RangeParseError(token)
    }
    const hands = expandToken(body.trim())
    if (!hands) throw new RangeParseError(token)
    for (const hand of hands) range.set(hand, freq)
  }
  return range
}

/** Contiguous runs of indices, e.g. [0,1,2,5] → [[0,1,2],[5]]. */
function runs(indices: number[]): number[][] {
  const out: number[][] = []
  for (const i of indices) {
    const last = out.at(-1)
    if (last && last[last.length - 1] === i - 1) last.push(i)
    else out.push([i])
  }
  return out
}

function compactTokens(hands: Set<Hand>): string[] {
  const tokens: string[] = []
  // Pairs: "77+" when the run reaches AA, "99-66" otherwise.
  const pairIdx = RANKS.map((_, i) => i).filter((i) => hands.has(RANKS[i] + RANKS[i]))
  for (const run of runs(pairIdx)) {
    const top = RANKS[run[0]].repeat(2)
    const bottom = RANKS[run[run.length - 1]].repeat(2)
    if (run.length === 1) tokens.push(top)
    else if (run[0] === 0) tokens.push(`${bottom}+`)
    else tokens.push(`${top}-${bottom}`)
  }
  // Non-pairs per high card and suffix: "A9s+" when the run reaches the top kicker, "A5s-A2s" otherwise.
  for (const suffix of ['s', 'o']) {
    RANKS.forEach((high, hi) => {
      const kickers = RANKS.map((_, i) => i).filter((i) => i > hi && hands.has(high + RANKS[i] + suffix))
      for (const run of runs(kickers)) {
        const top = high + RANKS[run[0]] + suffix
        const bottom = high + RANKS[run[run.length - 1]] + suffix
        if (run.length === 1) tokens.push(top)
        else if (run[0] === hi + 1) tokens.push(`${bottom}+`)
        else tokens.push(`${top}-${bottom}`)
      }
    })
  }
  return tokens
}

/** Compact notation grouped by frequency (highest first): "22+,A2s+,KTo+,AJo:0.5". */
export function formatRange(range: Range): string {
  const byFreq = new Map<number, Set<Hand>>()
  for (const h of ALL_HANDS) {
    const f = range.get(h)
    if (f === undefined) continue
    if (!byFreq.has(f)) byFreq.set(f, new Set())
    byFreq.get(f)!.add(h)
  }
  return [...byFreq.entries()]
    .sort(([a], [b]) => b - a)
    .flatMap(([f, hands]) => compactTokens(hands).map((t) => (f === 1 ? t : `${t}:${f}`)))
    .join(',')
}
