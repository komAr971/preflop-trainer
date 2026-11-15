import { ACTIONS, type Action, type CompiledSpot } from './chart'
import { rangeWidth } from './chartEdit'
import type { Hand } from './hands'
import { mainAction, neighbors } from './trainer'

export type MistakeReason = 'notInRange' | 'belowThreshold' | 'wrongRoll' | 'wrongSize'

export interface Explanation {
  reason: MistakeReason
  hand: Hand
  chosen: Action
  /** How often the chart takes the chosen action with this hand (0–1). */
  chosenFreq: number
  /** Actions that would have been accepted. */
  accepted: Action[]
  /** Share of all hands (in %) taking each action in this spot. */
  widths: Record<Action, number>
  /** Grid neighbours whose main action is the one the user chose: where that range's border runs. */
  border: { hand: Hand; action: Action }[]
}

export function explainMistake(
  spot: CompiledSpot,
  hand: Hand,
  chosen: Action,
  accepted: Action[],
  opts: { sizeWrong?: boolean; rng?: boolean } = {},
): Explanation {
  const freqs = spot.hands.get(hand)!
  const chosenFreq = freqs[chosen]
  let reason: MistakeReason
  if (opts.sizeWrong && accepted.includes(chosen)) reason = 'wrongSize'
  else if (opts.rng && chosenFreq > 0) reason = 'wrongRoll'
  else if (chosenFreq > 0) reason = 'belowThreshold'
  else reason = 'notInRange'

  const border =
    reason === 'wrongSize'
      ? []
      : neighbors(hand)
          .map((n) => ({ hand: n, action: mainAction(spot.hands.get(n)!) }))
          .filter((n) => n.action === chosen && n.action !== mainAction(freqs))

  const widths = Object.fromEntries(ACTIONS.map((a) => [a, rangeWidth(spot, a)])) as Record<Action, number>
  return { reason, hand, chosen, chosenFreq, accepted, widths, border }
}
