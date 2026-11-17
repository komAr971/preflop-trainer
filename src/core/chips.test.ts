import { describe, expect, it } from 'vitest'
import { chipStack } from './chips'

describe('chipStack', () => {
  it('breaks a bet into casino denominations, biggest at the bottom', () => {
    expect(chipStack(0.5)).toEqual([0.5])
    expect(chipStack(1)).toEqual([1])
    expect(chipStack(2.5)).toEqual([1, 1, 0.5])
    expect(chipStack(7.5)).toEqual([5, 1, 1, 0.5])
    expect(chipStack(22)).toEqual([5, 5, 5, 5, 1, 1])
    expect(chipStack(100)).toEqual([100])
  })

  it('different bet sizes look different', () => {
    const sizes = [0.5, 1, 2, 2.5, 3, 7.5, 9, 11, 22, 25, 100]
    const looks = new Set(sizes.map((s) => chipStack(s).join(',')))
    expect(looks.size).toBe(sizes.length)
  })
})
