import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, sanitizeSettings, syncedPart, syncedSettingsEqual, withDeviceFields } from './settings'

describe('settings', () => {
  it('has the agreed defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      threshold: 0.25,
      mixedMode: 'threshold',
      sizeInput: true,
      sizeTolerance: 0,
      borderlineShare: 0.7,
      learnedWindow: 200,
      learnedThreshold: 0.9,
      dailyGoal: 100,
      sound: true,
      volume: 0.5,
      middleName: 'MP',
      soundKinds: { deal: true, chip: true, correct: true, wrong: true, tick: true },
      timeLimit: 0,
      tables: 1,
    })
  })

  it('keeps valid fields and resets invalid ones', () => {
    expect(sanitizeSettings({ dailyGoal: 50, threshold: 7, sound: 'yes' })).toEqual({ ...DEFAULT_SETTINGS, dailyGoal: 50 })
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('plays 1 to 4 tables', () => {
    expect(sanitizeSettings({ tables: 3 }).tables).toBe(3)
    expect(sanitizeSettings({ tables: 6 }).tables).toBe(1)
  })

  it('time limit is one of off / 5 / 10 / 15 / 30 s', () => {
    expect(sanitizeSettings({ timeLimit: 10 }).timeLimit).toBe(10)
    expect(sanitizeSettings({ timeLimit: 7 }).timeLimit).toBe(0)
  })

  it('keeps sound choices saved before the tick sound existed', () => {
    const old = { soundKinds: { deal: false, chip: true, correct: false, wrong: true } }
    expect(sanitizeSettings(old).soundKinds).toEqual({ deal: false, chip: true, correct: false, wrong: true, tick: true })
  })
})

describe('synced settings', () => {
  it('keeps volume and tables on the device', () => {
    const local = { ...DEFAULT_SETTINGS, volume: 0.2, tables: 3 as const }
    expect(syncedPart(local)).not.toHaveProperty('volume')
    expect(syncedPart(local)).not.toHaveProperty('tables')
    const merged = withDeviceFields({ ...DEFAULT_SETTINGS, dailyGoal: 50, volume: 1, tables: 1 }, local)
    expect(merged).toMatchObject({ dailyGoal: 50, volume: 0.2, tables: 3 })
  })

  it('compares only the synced part', () => {
    expect(syncedSettingsEqual(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, volume: 0.1, tables: 2 })).toBe(true)
    expect(syncedSettingsEqual(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, soundKinds: { ...DEFAULT_SETTINGS.soundKinds, tick: false } })).toBe(false)
  })
})
