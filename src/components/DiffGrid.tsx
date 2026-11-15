import type { DrawResult } from '../core/draw'
import { RANKS, handAt, type Hand } from '../core/hands'

interface Props {
  result: DrawResult
  selected: Hand | null
  onSelect: (hand: Hand) => void
}

/** Drawing check: green = correct, red = wrong; tap a cell to see the expected strategy. */
export function DiffGrid({ result, selected, onSelect }: Props) {
  return (
    <div className="range-grid diff-grid" role="grid">
      {RANKS.map((_, row) => (
        <div role="row" key={row} className="range-row">
          {RANKS.map((_, col) => {
            const hand = handAt(row, col)
            const cell = result.cells.get(hand)!
            return (
              <button
                type="button"
                role="gridcell"
                key={hand}
                data-hand={hand}
                data-ok={cell.ok}
                aria-pressed={selected === hand}
                className={`range-cell diff-cell ${cell.ok ? 'is-ok' : 'is-bad'} drawn-${cell.drawn}`}
                onClick={() => onSelect(hand)}
              >
                {hand}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
