import { ACTIONS, type Action, type CompiledSpot, type Frequencies } from './chart'
import { ALL_HANDS, combosOf, gridPosition, handAt, type Hand } from './hands'

/** Returns a float in [0, 1). Injected so tests are deterministic. */
export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const DEFAULT_THRESHOLD = 0.25
export const DEFAULT_BORDERLINE_SHARE = 0.7
const EPS = 1e-9

function mainAction(freqs: Frequencies): Action {
  return ACTIONS.reduce((best, a) => (freqs[a] > freqs[best] ? a : best))
}

/** Actions accepted as correct: frequency ≥ threshold, or the most frequent one if none reaches it. */
export function correctActions(freqs: Frequencies, threshold = DEFAULT_THRESHOLD): Action[] {
  const ok = ACTIONS.filter((a) => freqs[a] > 0 && freqs[a] >= threshold - EPS)
  return ok.length ? ok : [mainAction(freqs)]
}

export function isCorrect(freqs: Frequencies, action: Action, threshold = DEFAULT_THRESHOLD): boolean {
  return correctActions(freqs, threshold).includes(action)
}

/**
 * Mixed hand, or a neighbour with a different main action.
 * Neighbours: up/down/left/right on the grid; pairs also neighbour the next pairs (diagonal), e.g. QQ–JJ.
 */
export function isBorderline(spot: CompiledSpot, hand: Hand): boolean {
  const freqs = spot.hands.get(hand)!
  if (ACTIONS.every((a) => freqs[a] < 1)) return true
  const own = mainAction(freqs)
  const { row, col } = gridPosition(hand)
  const steps = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  if (row === col) steps.push([-1, -1], [1, 1])
  for (const [dr, dc] of steps) {
    const r = row + dr
    const c = col + dc
    if (r < 0 || r > 12 || c < 0 || c > 12) continue
    if (mainAction(spot.hands.get(handAt(r, c))!) !== own) return true
  }
  return false
}

function weightedByCombos(hands: readonly Hand[], rng: Rng): Hand {
  const total = hands.reduce((s, h) => s + combosOf(h), 0)
  let x = rng() * total
  for (const h of hands) {
    x -= combosOf(h)
    if (x < 0) return h
  }
  return hands[hands.length - 1]
}

const borderlineCache = new WeakMap<CompiledSpot, Hand[]>()

function borderlineHands(spot: CompiledSpot): Hand[] {
  let list = borderlineCache.get(spot)
  if (!list) {
    list = ALL_HANDS.filter((h) => isBorderline(spot, h))
    borderlineCache.set(spot, list)
  }
  return list
}

/** With probability `borderlineShare` picks a borderline hand, otherwise any hand; both weighted by combos. */
export function pickHand(spot: CompiledSpot, rng: Rng, borderlineShare = DEFAULT_BORDERLINE_SHARE): Hand {
  const border = borderlineHands(spot)
  const pool = border.length && rng() < borderlineShare ? border : ALL_HANDS
  return weightedByCombos(pool, rng)
}

export const SUITS = ['s', 'h', 'd', 'c'] as const
export type Card = string

/** Concrete cards for a hand class, e.g. "AKs" → ["Ah", "Kh"]. */
export function dealCards(hand: Hand, rng: Rng): [Card, Card] {
  const pick = () => Math.floor(rng() * 4)
  const s1 = pick()
  if (hand.length === 3 && hand[2] === 's') return [hand[0] + SUITS[s1], hand[1] + SUITS[s1]]
  const s2 = (s1 + 1 + Math.floor(rng() * 3)) % 4
  if (hand.length === 2) return [hand[0] + SUITS[Math.min(s1, s2)], hand[1] + SUITS[Math.max(s1, s2)]]
  return [hand[0] + SUITS[s1], hand[1] + SUITS[s2]]
}

/** Randomizer order: raise, then call, then fold. */
const ROLL_ORDER: Action[] = ['raise', 'call', 'fold']

export interface RollInterval {
  action: Action
  from: number
  to: number
}

/** Integer intervals on 1–100 for each action with non-zero frequency. */
export function rollIntervals(freqs: Frequencies): RollInterval[] {
  const out: RollInterval[] = []
  let cum = 0
  let from = 1
  for (const action of ROLL_ORDER) {
    if (freqs[action] <= 0) continue
    cum += freqs[action]
    const to = Math.min(100, Math.round(cum * 100))
    if (to >= from) out.push({ action, from, to })
    from = to + 1
  }
  if (out.length) out[out.length - 1].to = 100
  return out
}

export function actionForRoll(freqs: Frequencies, roll: number): Action {
  return rollIntervals(freqs).find((i) => roll >= i.from && roll <= i.to)!.action
}

export function rollD100(rng: Rng): number {
  return 1 + Math.floor(rng() * 100)
}

/** True when the entered raise size is within `tolerance` bb of the expected one. */
export function sizeMatches(entered: number, expected: number, tolerance = 0): boolean {
  return Math.abs(entered - expected) <= tolerance + 1e-9
}
