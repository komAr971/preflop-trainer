import type { Card } from '../core/trainer'

const SUIT_SYMBOL: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
/** Four-colour deck. */
const SUIT_CLASS: Record<string, string> = { s: 'suit-s', h: 'suit-h', d: 'suit-d', c: 'suit-c' }

export const CARD_W = 56
export const CARD_H = 78

interface Props {
  card: Card
  x: number
  y: number
}

export function PlayingCard({ card, x, y }: Props) {
  const rank = card[0] === 'T' ? '10' : card[0]
  const suit = card[1]
  return (
    <g transform={`translate(${x} ${y})`} className={`card ${SUIT_CLASS[suit]}`} data-card={card}>
      <rect width={CARD_W} height={CARD_H} rx={7} className="card-face" />
      <text x={8} y={28} className="card-rank">
        {rank}
      </text>
      <text x={CARD_W / 2} y={CARD_H - 12} textAnchor="middle" className="card-suit">
        {SUIT_SYMBOL[suit]}
      </text>
    </g>
  )
}
