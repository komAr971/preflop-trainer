/** Chip denominations in bb, like casino chips: each has its own colour on the table. */
export const DENOMINATIONS = [100, 25, 5, 1, 0.5] as const
export type Denomination = (typeof DENOMINATIONS)[number]

/** Fewest chips that make up the bet, biggest first (bottom of the stack). */
export function chipStack(amountBb: number): Denomination[] {
  const out: Denomination[] = []
  // Work in half-bb units to avoid float drift.
  let rest = Math.round(amountBb * 2)
  for (const d of DENOMINATIONS) {
    const unit = d * 2
    while (rest >= unit) {
      out.push(d)
      rest -= unit
    }
  }
  return out
}
