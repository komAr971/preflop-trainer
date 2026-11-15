import { RANKS, handAt, type Hand } from '../core/hands'

interface Props {
  errors: Map<Hand, { total: number; wrong: number }>
}

/** Error rate 0 → green, 1 → red; hands never asked stay neutral. */
function color(rate: number): string {
  return `hsl(${Math.round(120 * (1 - rate))} 60% 45%)`
}

export function HeatGrid({ errors }: Props) {
  return (
    <div className="range-grid heat-grid" role="grid">
      {RANKS.map((_, row) => (
        <div role="row" key={row} className="range-row">
          {RANKS.map((_, col) => {
            const hand = handAt(row, col)
            const e = errors.get(hand)
            return (
              <div
                role="gridcell"
                key={hand}
                data-hand={hand}
                className={`range-cell ${e ? 'has-data' : ''}`}
                style={e ? { background: color(e.wrong / e.total) } : undefined}
                title={e ? `${hand}: ${e.wrong}/${e.total}` : hand}
              >
                {hand}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
