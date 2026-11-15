import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { fmtBb } from '../core/format'
import type { Scenario, SeatState } from '../core/scenario'
import type { Card } from '../core/trainer'
import { useMediaQuery } from '../ui/useMediaQuery'
import { usePositionName } from './usePositionName'
import { CARD_W } from './cardSize'
import { PlayingCard } from './PlayingCard'
import { LANDSCAPE, PORTRAIT, PORTRAIT_QUERY, heroCardsY, slotOf, type Layout } from './tableLayout'

const STACK_BB = 100

function Seat({ seat, slot, layout }: { seat: SeatState; slot: number; layout: Layout }) {
  const { t } = useTranslation()
  const [x, y] = layout.slots[slot].seat
  const [w, h] = layout.seatSize
  const isHero = seat.status === 'hero'
  const pos = usePositionName()
  return (
    <g
      className={`seat seat-${seat.status}`}
      transform={`translate(${x} ${y})`}
      data-position={seat.position}
      data-status={seat.status}
    >
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} className="seat-box" />
      <text y={-4} textAnchor="middle" className="seat-pos">
        {pos(seat.position)}
        {isHero ? ` · ${t('table.you')}` : ''}
      </text>
      <text y={16} textAnchor="middle" className="seat-stack">
        {fmtBb(STACK_BB - seat.betBb)}bb
      </text>
    </g>
  )
}

function Bet({ amount, slot, layout }: { amount: number; slot: number; layout: Layout }) {
  const [x, y] = layout.slots[slot].bet
  const [sx, sy] = layout.slots[slot].seat
  return (
    <motion.g
      className="bet"
      initial={{ opacity: 0, x: (sx - x) * 0.6, y: (sy - y) * 0.6 }}
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

function DealerButton({ slot, layout }: { slot: number; layout: Layout }) {
  const [x, y] = layout.slots[slot].dealer
  return (
    <g transform={`translate(${x} ${y})`} className="dealer" data-testid="dealer">
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
  const layout = useMediaQuery(PORTRAIT_QUERY) ? PORTRAIT : LANDSCAPE
  const hero = scenario.spot.hero
  const [cx, cy] = layout.center
  const cw = CARD_W * layout.cardScale
  const cardsY = heroCardsY(layout)

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className={`table table-${layout.name}`}
      role="img"
      aria-label={t('app.title')}
      data-layout={layout.name}
    >
      <ellipse cx={cx} cy={cy} rx={layout.rail[0]} ry={layout.rail[1]} className="rail" />
      <ellipse cx={cx} cy={cy} rx={layout.felt[0]} ry={layout.felt[1]} className="felt" />
      <text x={cx} y={cy + 6} textAnchor="middle" className="pot" data-testid="pot">
        {t('table.pot', { amount: fmtBb(scenario.potBb) })}
      </text>

      {scenario.seats.map((seat) => (
        <Seat key={seat.position} seat={seat} slot={slotOf(seat.position, hero)} layout={layout} />
      ))}

      <DealerButton slot={slotOf('BTN', hero)} layout={layout} />

      <AnimatePresence mode="popLayout">
        <g key={questionId}>
          {scenario.seats
            .filter((s) => s.betBb > 0)
            .map((s) => (
              <Bet key={s.position} amount={s.betBb} slot={slotOf(s.position, hero)} layout={layout} />
            ))}
          <motion.g
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            data-testid="hero-cards"
          >
            <PlayingCard card={cards[0]} x={cx - cw - 4} y={cardsY} scale={layout.cardScale} />
            <PlayingCard card={cards[1]} x={cx + 4} y={cardsY} scale={layout.cardScale} />
          </motion.g>
        </g>
      </AnimatePresence>
    </svg>
  )
}
