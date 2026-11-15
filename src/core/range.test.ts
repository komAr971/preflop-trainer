import { describe, expect, it } from 'vitest'
import { formatRange, parseRange } from './range'

describe('parseRange', () => {
  it('parses single hands with default frequency 1', () => {
    const r = parseRange('AA,AKs,AKo')
    expect(r.get('AA')).toBe(1)
    expect(r.get('AKs')).toBe(1)
    expect(r.get('AKo')).toBe(1)
    expect(r.size).toBe(3)
  })

  it('expands AK without suffix into suited and offsuit', () => {
    const r = parseRange('AK')
    expect([...r.keys()].sort()).toEqual(['AKo', 'AKs'])
  })

  it('parses frequencies', () => {
    const r = parseRange('AKs:0.5, AJo:0.25')
    expect(r.get('AKs')).toBe(0.5)
    expect(r.get('AJo')).toBe(0.25)
  })

  it('expands pair plus: 77+', () => {
    const r = parseRange('77+')
    expect([...r.keys()]).toEqual(['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77'])
  })

  it('expands kicker plus: A9s+, KTo+', () => {
    expect([...parseRange('A9s+').keys()]).toEqual(['AKs', 'AQs', 'AJs', 'ATs', 'A9s'])
    expect([...parseRange('KTo+').keys()]).toEqual(['KQo', 'KJo', 'KTo'])
  })

  it('expands dash ranges: 99-66, A5s-A2s', () => {
    expect([...parseRange('99-66').keys()]).toEqual(['99', '88', '77', '66'])
    expect([...parseRange('A5s-A2s').keys()]).toEqual(['A5s', 'A4s', 'A3s', 'A2s'])
  })

  it('applies frequency to expanded groups: 22+:0.5', () => {
    const r = parseRange('22+:0.5')
    expect(r.size).toBe(13)
    expect(r.get('22')).toBe(0.5)
  })

  it('accepts lowercase and extra whitespace', () => {
    expect([...parseRange(' aks , qq ').keys()]).toEqual(['AKs', 'QQ'])
  })

  it('returns empty range for empty string', () => {
    expect(parseRange('').size).toBe(0)
  })

  it('throws with the bad token on invalid input', () => {
    expect(() => parseRange('AA,XYz')).toThrow(/XYz/)
    expect(() => parseRange('AKs:1.5')).toThrow(/AKs:1.5/)
    expect(() => parseRange('AA+s')).toThrow(/AA\+s/)
    expect(() => parseRange('A5s-K2s')).toThrow(/A5s-K2s/)
  })
})

describe('formatRange', () => {
  it('round-trips through parseRange', () => {
    const input = parseRange('77+,A9s+,KTo+,AJo:0.25')
    expect(parseRange(formatRange(input))).toEqual(input)
  })

  it('omits frequency 1 and keeps fractional ones', () => {
    expect(formatRange(parseRange('AA,AKs:0.5'))).toBe('AA,AKs:0.5')
  })

  it('writes compact notation', () => {
    expect(formatRange(parseRange('77+,A9s+,KTo+'))).toBe('77+,A9s+,KTo+')
    expect(formatRange(parseRange('99-66,A5s-A2s,KQs'))).toBe('99-66,A5s-A2s,KQs')
    expect(formatRange(parseRange('AKs,AQs,AJs,A5s,A4s,QJo'))).toBe('AJs+,A5s-A4s,QJo')
  })

  it('round-trips every starter-like range', () => {
    for (const text of ['22+,A2s+,K2s+,Q5s+,J7s+,T7s+,96s+,A2o+,K9o+', 'JJ-22,AQs-A6s,A3s-A2s:0.5,KJo:0.25']) {
      expect(parseRange(formatRange(parseRange(text)))).toEqual(parseRange(text))
    }
  })
})
