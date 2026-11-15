import { POSITIONS, type Position } from '../core/chart'
import { CARD_H } from './cardSize'

export type Point = readonly [number, number]

export interface Layout {
  name: 'landscape' | 'portrait'
  width: number
  height: number
  center: Point
  rail: Point
  felt: Point
  seatSize: Point
  cardScale: number
  /** Screen slots clockwise from the bottom (hero). */
  slots: readonly { seat: Point; bet: Point; dealer: Point }[]
}

export const LANDSCAPE: Layout = {
  name: 'landscape',
  width: 800,
  height: 500,
  center: [400, 250],
  rail: [330, 175],
  felt: [310, 157],
  seatSize: [136, 52],
  cardScale: 1,
  slots: [
    { seat: [400, 468], bet: [400, 330], dealer: [490, 464] },
    { seat: [92, 360], bet: [215, 318], dealer: [185, 384] },
    { seat: [92, 140], bet: [215, 182], dealer: [160, 187] },
    { seat: [400, 34], bet: [400, 140], dealer: [490, 81] },
    { seat: [708, 140], bet: [585, 182], dealer: [640, 187] },
    { seat: [708, 360], bet: [585, 318], dealer: [615, 384] },
  ],
}

/** Tall oval for phones held upright: seats down the sides, bigger cards. */
export const PORTRAIT: Layout = {
  name: 'portrait',
  width: 400,
  height: 600,
  center: [200, 285],
  rail: [165, 235],
  felt: [150, 220],
  seatSize: [104, 50],
  cardScale: 1.15,
  slots: [
    { seat: [200, 565], bet: [200, 410], dealer: [272, 565] },
    { seat: [58, 410], bet: [130, 370], dealer: [58, 452] },
    { seat: [58, 170], bet: [122, 214], dealer: [58, 212] },
    { seat: [200, 30], bet: [200, 105], dealer: [272, 30] },
    { seat: [342, 170], bet: [270, 214], dealer: [342, 212] },
    { seat: [342, 410], bet: [270, 370], dealer: [342, 452] },
  ],
}

export function slotOf(position: Position, hero: Position): number {
  return (POSITIONS.indexOf(position) - POSITIONS.indexOf(hero) + 6) % 6
}

export const PORTRAIT_QUERY = '(max-width: 600px) and (orientation: portrait)'

/** Top of hero cards: just above the hero seat. */
export function heroCardsY(layout: Layout): number {
  return layout.slots[0].seat[1] - layout.seatSize[1] / 2 - 8 - CARD_H * layout.cardScale
}
