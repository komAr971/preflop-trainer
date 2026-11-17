import { expect, it } from 'vitest'
import { createThrottle } from './throttle'

it('lets the same sound through at most once per gap, other sounds independently', () => {
  const allow = createThrottle(100)
  expect(allow('deal', 0)).toBe(true)
  expect(allow('deal', 50)).toBe(false)
  expect(allow('chip', 50)).toBe(true)
  expect(allow('deal', 100)).toBe(true)
})
