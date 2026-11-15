export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const
export type Rank = (typeof RANKS)[number]

/** Hand class: pair "AA", suited "AKs", offsuit "AKo". High rank always first. */
export type Hand = string

export function rankIndex(rank: string): number {
  return RANKS.indexOf(rank as Rank)
}

/** 13×13 grid: pairs on the diagonal, suited above it (row < col), offsuit below. */
export function handAt(row: number, col: number): Hand {
  if (row === col) return RANKS[row] + RANKS[col]
  if (row < col) return RANKS[row] + RANKS[col] + 's'
  return RANKS[col] + RANKS[row] + 'o'
}

export function gridPosition(hand: Hand): { row: number; col: number } {
  const hi = rankIndex(hand[0])
  const lo = rankIndex(hand[1])
  if (hand.length === 2) return { row: hi, col: hi }
  return hand[2] === 's' ? { row: hi, col: lo } : { row: lo, col: hi }
}

export const ALL_HANDS: readonly Hand[] = RANKS.flatMap((_, row) =>
  RANKS.map((_, col) => handAt(row, col)),
)

const HAND_SET = new Set(ALL_HANDS)

export function isHand(value: string): value is Hand {
  return HAND_SET.has(value)
}

export function combosOf(hand: Hand): number {
  if (hand.length === 2) return 6
  return hand[2] === 's' ? 4 : 12
}
