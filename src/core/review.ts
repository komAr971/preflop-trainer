import type { SpotKey } from './chart'
import type { Hand } from './hands'

/**
 * Leitner-style repetition of mistakes, counted in questions (not time):
 * a mistake comes back after 3 questions, then 10, then 30; one more correct answer graduates it.
 * Any mistake on the way resets it to the start.
 */
export const REVIEW_INTERVALS = [3, 10, 30] as const

export interface ReviewKey {
  spotKey: SpotKey
  hand: Hand
}

export interface ReviewItem extends ReviewKey {
  box: number
  /** Question counter value when the item becomes due. */
  due: number
}

const same = (a: ReviewKey, b: ReviewKey) => a.spotKey === b.spotKey && a.hand === b.hand

export function onAnswer(items: ReviewItem[], key: ReviewKey, correct: boolean, counter: number): ReviewItem[] {
  const existing = items.find((i) => same(i, key))
  const rest = items.filter((i) => !same(i, key))
  if (!correct) return [...rest, { spotKey: key.spotKey, hand: key.hand, box: 0, due: counter + REVIEW_INTERVALS[0] }]
  if (!existing) return items
  const box = existing.box + 1
  if (box >= REVIEW_INTERVALS.length) return rest
  return [...rest, { ...existing, box, due: counter + REVIEW_INTERVALS[box] }]
}

export function dueItem(items: ReviewItem[], counter: number): ReviewItem | undefined {
  return items.filter((i) => i.due <= counter).sort((a, b) => a.due - b.due)[0]
}
