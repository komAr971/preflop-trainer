import { describe, expect, it } from 'vitest'
import { REVIEW_INTERVALS, dueItem, onAnswer, type ReviewItem } from './review'

const k = { spotKey: 'rfi:CO', hand: 'K9o' }

describe('review queue', () => {
  it('adds a wrong answer due after the first interval', () => {
    const items = onAnswer([], k, false, 10)
    expect(items).toEqual([{ ...k, box: 0, due: 10 + REVIEW_INTERVALS[0] }])
  })

  it('ignores correct answers for hands not in the queue', () => {
    expect(onAnswer([], k, true, 10)).toEqual([])
  })

  it('moves up a box on correct answers and graduates after the last one', () => {
    let items = onAnswer([], k, false, 0)
    items = onAnswer(items, k, true, 3)
    expect(items[0]).toMatchObject({ box: 1, due: 3 + REVIEW_INTERVALS[1] })
    items = onAnswer(items, k, true, 13)
    expect(items[0]).toMatchObject({ box: 2, due: 13 + REVIEW_INTERVALS[2] })
    items = onAnswer(items, k, true, 43)
    expect(items).toEqual([])
  })

  it('resets to box 0 on another mistake', () => {
    let items = onAnswer([], k, false, 0)
    items = onAnswer(items, k, true, 3)
    items = onAnswer(items, k, false, 13)
    expect(items[0]).toMatchObject({ box: 0, due: 13 + REVIEW_INTERVALS[0] })
  })

  it('keeps other items untouched', () => {
    const other: ReviewItem = { spotKey: 'rfi:UTG', hand: 'A2s', box: 1, due: 50 }
    const items = onAnswer([other], k, false, 0)
    expect(items).toContainEqual(other)
    expect(items).toHaveLength(2)
  })

  it('returns the most overdue item, or none if nothing is due', () => {
    const items: ReviewItem[] = [
      { spotKey: 'a', hand: 'AA', box: 0, due: 8 },
      { spotKey: 'b', hand: 'KK', box: 0, due: 5 },
      { spotKey: 'c', hand: 'QQ', box: 0, due: 20 },
    ]
    expect(dueItem(items, 4)).toBeUndefined()
    expect(dueItem(items, 9)?.hand).toBe('KK')
  })
})
