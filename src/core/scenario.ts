import { POSITIONS, type Action, type CompiledSpot, type Position, type Sizings, type Spot } from './chart'

export type SeatStatus = 'hero' | 'folded' | 'acted' | 'waiting'

export interface SeatState {
  position: Position
  status: SeatStatus
  /** Chips in front of the player this street. */
  betBb: number
}

export interface ActionOption {
  action: Action
  /** Total bet after the action (call/raise). */
  toBb?: number
}

export interface Scenario {
  spot: Spot
  /** In preflop action order: UTG … BB. */
  seats: SeatState[]
  potBb: number
  actions: ActionOption[]
  /** Size of the bet hero faces (open or 3-bet), if any. */
  facingBb?: number
  /** Hero's 3-bet in vs4bet. */
  heroThreeBetBb?: number
  /** Hero's own open in vs3bet. */
  heroOpenBb?: number
}

export const STACK_BB = 100
const POSTFLOP_ORDER: Position[] = ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN']
const preIdx = (p: Position) => POSITIONS.indexOf(p)
const isInPosition = (a: Position, b: Position) => POSTFLOP_ORDER.indexOf(a) > POSTFLOP_ORDER.indexOf(b)
const roundHalf = (n: number) => Math.round(n * 2) / 2
const blind = (p: Position) => (p === 'SB' ? 0.5 : p === 'BB' ? 1 : 0)

function openSize(opener: Position, s: Sizings): number {
  return opener === 'SB' ? s.sbOpenBb : s.openBb
}

function threeBetSize(threeBettor: Position, opener: Position, open: number, s: Sizings): number {
  return roundHalf(open * (isInPosition(threeBettor, opener) ? s.threeBetIpX : s.threeBetOopX))
}

export function buildScenario(compiled: CompiledSpot, sizings: Sizings): Scenario {
  const { spot } = compiled
  const hero = spot.hero
  const seats: SeatState[] = POSITIONS.map((position) => ({ position, status: 'folded', betBb: blind(position) }))
  const at = (p: Position) => seats[preIdx(p)]
  at(hero).status = 'hero'

  let actions: ActionOption[]
  let facingBb: number | undefined
  let heroOpenBb: number | undefined
  let heroThreeBetBb: number | undefined

  switch (spot.kind) {
    case 'rfi': {
      for (const s of seats) if (preIdx(s.position) > preIdx(hero)) s.status = 'waiting'
      const canLimp = hero === 'SB' && [...compiled.hands.values()].some((f) => f.call > 0)
      actions = [
        { action: 'fold' },
        ...(canLimp ? [{ action: 'call' as const, toBb: 1 }] : []),
        { action: 'raise', toBb: openSize(hero, sizings) },
      ]
      break
    }
    case 'vsOpen': {
      const open = openSize(spot.villain, sizings)
      at(spot.villain).status = 'acted'
      at(spot.villain).betBb = open
      for (const s of seats) if (preIdx(s.position) > preIdx(hero)) s.status = 'waiting'
      facingBb = open
      actions = [
        { action: 'fold' },
        { action: 'call', toBb: open },
        { action: 'raise', toBb: threeBetSize(hero, spot.villain, open, sizings) },
      ]
      break
    }
    case 'vs3bet': {
      const open = openSize(hero, sizings)
      const threeBet = threeBetSize(spot.villain, hero, open, sizings)
      at(hero).betBb = open
      at(spot.villain).status = 'acted'
      at(spot.villain).betBb = threeBet
      facingBb = threeBet
      heroOpenBb = open
      actions = [
        { action: 'fold' },
        { action: 'call', toBb: threeBet },
        { action: 'raise', toBb: roundHalf(threeBet * sizings.fourBetX) },
      ]
      break
    }
    case 'vs4bet': {
      const open = openSize(spot.villain, sizings)
      const threeBet = threeBetSize(hero, spot.villain, open, sizings)
      const fourBet = roundHalf(threeBet * sizings.fourBetX)
      at(hero).betBb = threeBet
      at(spot.villain).status = 'acted'
      at(spot.villain).betBb = fourBet
      facingBb = fourBet
      heroThreeBetBb = threeBet
      actions = [
        { action: 'fold' },
        { action: 'call', toBb: fourBet },
        // 5-bet = all-in at 100bb.
        { action: 'raise', toBb: STACK_BB },
      ]
      break
    }
  }

  const potBb = seats.reduce((sum, s) => sum + s.betBb, 0)
  return { spot, seats, potBb, actions, facingBb, heroOpenBb, heroThreeBetBb }
}
