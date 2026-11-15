import { bbChecks, type Action, type CompiledSpot, type Frequencies, type Spot } from './chart'
import { ALL_HANDS, combosOf, type Hand } from './hands'
import { DEFAULT_THRESHOLD, correctActions } from './trainer'

/** Unpainted hands: fold, or check for BB facing limps. */
export function defaultAction(spot: Spot): Action {
  return bbChecks(spot) ? 'call' : 'fold'
}

/** What the user painted; unpainted hands take the default action. */
export type Drawing = Map<Hand, Action>

export interface DrawCell {
  drawn: Action
  expected: Frequencies
  ok: boolean
}

export interface DrawResult {
  /**
   * Combo-weighted % correct among relevant hands: those the chart plays or the user painted.
   * Obvious folds don't inflate the score (an empty grid scores 0%).
   */
  score: number
  cells: Map<Hand, DrawCell>
  /** Wrong hands in grid order. */
  wrong: Hand[]
}

export function checkDrawing(target: CompiledSpot, drawing: Drawing, threshold = DEFAULT_THRESHOLD): DrawResult {
  const cells = new Map<Hand, DrawCell>()
  const wrong: Hand[] = []
  let okCombos = 0
  let relevantCombos = 0
  for (const hand of ALL_HANDS) {
    const expected = target.hands.get(hand)!
    const drawn = drawing.get(hand) ?? defaultAction(target.spot)
    const ok = correctActions(expected, threshold).includes(drawn)
    cells.set(hand, { drawn, expected, ok })
    if (!ok) wrong.push(hand)
    if (expected[defaultAction(target.spot)] < 1 || drawn !== defaultAction(target.spot)) {
      relevantCombos += combosOf(hand)
      if (ok) okCombos += combosOf(hand)
    }
  }
  return { score: relevantCombos ? (okCombos / relevantCombos) * 100 : 100, cells, wrong }
}

/** A drawing as a spot, so the regular range grid can render it. */
export function drawingToSpot(spot: Spot, drawing: Drawing): CompiledSpot {
  const hands = new Map<Hand, Frequencies>()
  for (const hand of ALL_HANDS) {
    const a = drawing.get(hand) ?? defaultAction(spot)
    hands.set(hand, { fold: a === 'fold' ? 1 : 0, call: a === 'call' ? 1 : 0, raise: a === 'raise' ? 1 : 0 })
  }
  return { spot, hands }
}
