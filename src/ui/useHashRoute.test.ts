import { describe, expect, it } from 'vitest'
import { hrefFor, parseHash } from './useHashRoute'

describe('hash routes', () => {
  it('parses and builds routes', () => {
    expect(parseHash('')).toEqual({ page: 'train' })
    expect(parseHash('#/charts')).toEqual({ page: 'charts' })
    expect(parseHash('#/charts/12')).toEqual({ page: 'edit', chartId: 12 })
    expect(parseHash('#/charts/0')).toEqual({ page: 'edit', chartId: 0 })
    expect(parseHash('#/charts/-2')).toEqual({ page: 'edit', chartId: -2 })
    const uuid = '3f2b1c9e-0a4d-4e8b-9c1f-2a6d7e8f9b0c'
    expect(parseHash(hrefFor({ page: 'edit', chartId: uuid }))).toEqual({ page: 'edit', chartId: uuid })
    expect(parseHash('#/nonsense')).toEqual({ page: 'train' })
    expect(hrefFor({ page: 'edit', chartId: 3 })).toBe('#/charts/3')
    expect(parseHash('#/stats')).toEqual({ page: 'stats' })
    expect(parseHash(hrefFor({ page: 'settings' }))).toEqual({ page: 'settings' })
  })
})
