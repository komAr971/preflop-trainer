import { describe, expect, it } from 'vitest'
import { presetSize } from './betPresets'

describe('raise presets x2–x5', () => {
  it('multiply the bet in front of the hero (the big blind when opening)', () => {
    expect(presetSize(3, { facingBb: undefined, minRaiseBb: 2 })).toBe(3)
    expect(presetSize(3, { facingBb: 2.5, minRaiseBb: 4 })).toBe(7.5)
    expect(presetSize(4, { facingBb: 7.5, minRaiseBb: 12.5 })).toBe(30)
  })

  it('stay within the minimum raise and the stack, on the 0.5 bb grid', () => {
    expect(presetSize(2, { facingBb: 2.5, minRaiseBb: 4 })).toBe(5)
    expect(presetSize(2, { facingBb: 2, minRaiseBb: 4.5 })).toBe(4.5)
    expect(presetSize(5, { facingBb: 25, minRaiseBb: 45 })).toBe(100)
    expect(presetSize(3, { facingBb: 2.25, minRaiseBb: 3.5 })).toBe(7)
  })
})
