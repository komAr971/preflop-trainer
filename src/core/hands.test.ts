import { describe, expect, it } from 'vitest'
import { ALL_HANDS, combosOf, gridPosition, handAt } from './hands'

describe('hands', () => {
  it('has 169 unique hand classes', () => {
    expect(ALL_HANDS).toHaveLength(169)
    expect(new Set(ALL_HANDS).size).toBe(169)
  })

  it('places pairs on the diagonal, suited above, offsuit below', () => {
    expect(handAt(0, 0)).toBe('AA')
    expect(handAt(0, 1)).toBe('AKs')
    expect(handAt(1, 0)).toBe('AKo')
    expect(handAt(12, 12)).toBe('22')
    expect(handAt(12, 11)).toBe('32o')
  })

  it('maps hand back to grid position', () => {
    for (const hand of ALL_HANDS) {
      const { row, col } = gridPosition(hand)
      expect(handAt(row, col)).toBe(hand)
    }
  })

  it('counts combos: pair 6, suited 4, offsuit 12 (1326 total)', () => {
    expect(combosOf('AA')).toBe(6)
    expect(combosOf('AKs')).toBe(4)
    expect(combosOf('AKo')).toBe(12)
    expect(ALL_HANDS.reduce((sum, h) => sum + combosOf(h), 0)).toBe(1326)
  })
})
