import { useRef } from 'react'
import type { CompiledSpot } from '../core/chart'
import { RANKS, handAt, type Hand } from '../core/hands'

interface Props {
  spot: CompiledSpot
  /** Called with hands touched by one stroke (pointer down → move → up). */
  onPaint?: (hands: Hand[]) => void
}

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`

function cellBackground(raise: number, call: number): string {
  const r = raise * 100
  const c = (raise + call) * 100
  return `linear-gradient(to right, var(--raise) 0 ${r}%, var(--call) ${r}% ${c}%, var(--fold) ${c}% 100%)`
}

/** 13×13 hand grid; paint by click or drag (mouse and touch). */
export function RangeGrid({ spot, onPaint }: Props) {
  const painting = useRef(false)
  const touched = useRef(new Set<Hand>())

  const handFromPoint = (x: number, y: number): Hand | null => {
    const el = document.elementFromPoint(x, y)
    return (el?.closest('[data-hand]') as HTMLElement | null)?.dataset.hand ?? null
  }

  const paint = (hand: Hand | null) => {
    if (!hand || touched.current.has(hand)) return
    touched.current.add(hand)
    onPaint?.([hand])
  }

  return (
    <div
      className={`range-grid ${onPaint ? 'is-editable' : ''}`}
      role="grid"
      onPointerDown={(e) => {
        if (!onPaint) return
        painting.current = true
        touched.current = new Set()
        // Touch pointers are captured by the first element; release so moves hit other cells.
        ;(e.target as Element).releasePointerCapture?.(e.pointerId)
        paint((e.target as HTMLElement).closest<HTMLElement>('[data-hand]')?.dataset.hand ?? null)
      }}
      onPointerMove={(e) => {
        if (painting.current) paint(handFromPoint(e.clientX, e.clientY))
      }}
      onPointerUp={() => (painting.current = false)}
      onPointerLeave={() => (painting.current = false)}
      onPointerCancel={() => (painting.current = false)}
    >
      {RANKS.map((_, row) => (
        <div role="row" key={row} className="range-row">
          {RANKS.map((_, col) => {
            const hand = handAt(row, col)
            const f = spot.hands.get(hand)!
            return (
              <div
                role="gridcell"
                key={hand}
                data-hand={hand}
                className="range-cell"
                style={{ background: cellBackground(f.raise, f.call) }}
                title={`${hand}: raise ${pct(f.raise)}, call ${pct(f.call)}, fold ${pct(f.fold)}`}
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
