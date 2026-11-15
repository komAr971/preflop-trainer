import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings'

describe('settings', () => {
  it('has the agreed defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      threshold: 0.25,
      borderlineShare: 0.7,
      learnedWindow: 200,
      learnedThreshold: 0.9,
      dailyGoal: 100,
      sound: true,
      volume: 0.6,
    })
  })

  it('keeps valid fields and resets invalid ones', () => {
    expect(sanitizeSettings({ dailyGoal: 50, threshold: 7, sound: 'yes' })).toEqual({ ...DEFAULT_SETTINGS, dailyGoal: 50 })
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS)
  })
})
