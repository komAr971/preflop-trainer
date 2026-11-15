import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { POSITIONS, type Position } from '../core/chart'
import { fmtBb } from '../core/format'
import type { Scenario, SeatState } from '../core/scenario'
import type { Card } from '../core/trainer'
import { CARD_H, CARD_W, PlayingCard } from './PlayingCard'

const STACK_BB = 100
const CX = 400
const CY = 250

/** Screen slots clockwise from the bottom (hero). */
const SLOTS = [
  { seat: [400, 468], bet: [400, 330] },
  { seat: [92, 360], bet: [215, 318] },
  { seat: [92, 140], bet: [215, 182] },
  { seat: [400, 34], bet: [400, 140] },
  { seat: [708, 140], bet: [585, 182] },
  { seat: [708, 360], bet: [585, 318] },
] as const

function slotOf(position: Position, hero: Position): number {
  return (POSITIONS.indexOf(position) - POSITIONS.indexOf(hero) + 6) % 6
}


function Seat({ seat, slot }: { seat: SeatState; slot: number }) {
  const { t } = useTranslation()
  const [x, y] = SLOTS[slot].seat
  const isHero = seat.status === 'hero'
  return (
    <g
      className={`seat seat-${seat.status}`}
      transform={`translate(${x} ${y})`}
      data-position={seat.position}
      data-status={seat.status}
    >
      <rect x={-68} y={-26} width={136} height={52} rx={26} className="seat-box" />
      <text y={-4} textAnchor="middle" className="seat-pos">
        {seat.position}
        {isHero ? ` · ${t('table.you')}` : ''}
      </text>
      <text y={16} textAnchor="middle" className="seat-stack">
        {fmtBb(STACK_BB - seat.betBb)}bb
      </text>
    </g>
  )
}

function Bet({ amount, slot }: { amount: number; slot: number }) {
  const [x, y] = SLOTS[slot].bet
  return (
    <motion.g
      className="bet"
      initial={{ opacity: 0, x: (SLOTS[slot].seat[0] - x) * 0.6, y: (SLOTS[slot].seat[1] - y) * 0.6 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <g transform={`translate(${x} ${y})`}>
        <circle r={11} className="chip" />
        <circle r={6} className="chip-inner" />
        <text x={18} y={5} className="bet-amount">
          {fmtBb(amount)}
        </text>
      </g>
    </motion.g>
  )
}

function DealerButton({ slot }: { slot: number }) {
  const [sx, sy] = SLOTS[slot].seat
  const x = sx + (CX - sx) * 0.22 + (slot === 0 || slot === 3 ? 90 : 0)
  const y = sy + (CY - sy) * 0.22 + (slot === 0 || slot === 3 ? 0 : 38)
  return (
    <g transform={`translate(${x} ${y})`} className="dealer">
      <circle r={13} className="dealer-btn" />
      <text y={5} textAnchor="middle" className="dealer-text">
        D
      </text>
    </g>
  )
}

interface Props {
  scenario: Scenario
  cards: [Card, Card]
  questionId: number
}

export function Table({ scenario, cards, questionId }: Props) {
  const { t } = useTranslation()
  const hero = scenario.spot.hero
  const btnSlot = slotOf('BTN', hero)
  const cardsY = SLOTS[0].seat[1] - 30 - CARD_H

  return (
    <svg viewBox="0 0 800 500" className="table" role="img" aria-label={t('app.title')}>
      <ellipse cx={CX} cy={CY} rx={330} ry={175} className="rail" />
      <ellipse cx={CX} cy={CY} rx={310} ry={157} className="felt" />
      <text x={CX} y={CY + 6} textAnchor="middle" className="pot" data-testid="pot">
        {t('table.pot', { amount: fmtBb(scenario.potBb) })}
      </text>

      {scenario.seats.map((seat) => {
        const slot = slotOf(seat.position, hero)
        return <Seat key={seat.position} seat={seat} slot={slot} />
      })}

      <DealerButton slot={btnSlot} />

      <AnimatePresence mode="popLayout">
        <g key={questionId}>
          {scenario.seats
            .filter((s) => s.betBb > 0)
            .map((s) => (
              <Bet key={s.position} amount={s.betBb} slot={slotOf(s.position, hero)} />
            ))}
          <motion.g
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            data-testid="hero-cards"
          >
            <PlayingCard card={cards[0]} x={CX - CARD_W - 4} y={cardsY} />
            <PlayingCard card={cards[1]} x={CX + 4} y={cardsY} />
          </motion.g>
        </g>
      </AnimatePresence>
    </svg>
  )
}
