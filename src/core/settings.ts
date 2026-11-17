import { z } from 'zod'

export const settingsSchema = z.object({
  /** Mixed hands: an action with at least this frequency counts as correct. */
  threshold: z.number().min(0.05).max(1).default(0.25),
  /** Mixed hands: accept any action ≥ threshold, or only the action picked by a 1–100 roll. */
  mixedMode: z.enum(['threshold', 'rng']).default('threshold'),
  /** Raise buttons ask for the size in bb; a wrong size counts as a mistake. */
  sizeInput: z.boolean().default(true),
  /** Allowed difference from the chart's raise size, bb. */
  sizeTolerance: z.number().min(0).max(5).default(0),
  /** Share of questions drawn from borderline hands. */
  borderlineShare: z.number().min(0).max(1).default(0.7),
  /** A spot is learned when accuracy over the last `learnedWindow` hands ≥ `learnedThreshold`. */
  learnedWindow: z.number().int().min(10).max(2000).default(200),
  learnedThreshold: z.number().min(0.5).max(1).default(0.9),
  dailyGoal: z.number().int().min(1).max(5000).default(100),
  sound: z.boolean().default(true),
  volume: z.number().min(0).max(1).default(0.5),
  /** How the 2nd 6-max seat is shown: MP (Russian sources, GipsyTeam) or HJ (GTO Wizard). */
  middleName: z.enum(['MP', 'HJ']).default('MP'),
  /** Individual sounds on/off. */
  soundKinds: z
    .object({
      deal: z.boolean().default(true),
      chip: z.boolean().default(true),
      correct: z.boolean().default(true),
      wrong: z.boolean().default(true),
      /** Soft tick in the last seconds of the time limit. */
      tick: z.boolean().default(true),
    })
    .default({ deal: true, chip: true, correct: true, wrong: true, tick: true }),
  /** Seconds per decision; 0 = no limit. Time is measured either way. */
  timeLimit: z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(15), z.literal(30)]).default(0),
  /** Tables at once on wide screens (phones always play one). Device-only: not synced. */
  tables: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(1),
})

export const TIME_LIMITS = [0, 5, 10, 15, 30] as const

export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({})

/** Missing or invalid fields fall back to defaults one by one. */
export function sanitizeSettings(raw: unknown): Settings {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const field = settingsSchema.shape[key].safeParse(obj[key])
    out[key] = field.success ? field.data : DEFAULT_SETTINGS[key]
  }
  return out as Settings
}

/** Settings that stay on this device and never reach the cloud. */
export const DEVICE_ONLY = ['volume', 'tables'] as const satisfies readonly (keyof Settings)[]
type DeviceOnly = (typeof DEVICE_ONLY)[number]
export type SyncedSettings = Omit<Settings, DeviceOnly>

export function syncedPart(s: Settings): SyncedSettings {
  const out: Record<string, unknown> = { ...s }
  for (const key of DEVICE_ONLY) delete out[key]
  return out as SyncedSettings
}

/** Settings from the cloud, keeping this device's own fields. */
export function withDeviceFields(remote: unknown, local: Settings): Settings {
  const merged = sanitizeSettings(remote)
  for (const key of DEVICE_ONLY) (merged as Record<string, unknown>)[key] = local[key]
  return merged
}

export function syncedSettingsEqual(a: Settings, b: Settings): boolean {
  const keys = Object.keys(syncedPart(DEFAULT_SETTINGS)) as (keyof SyncedSettings)[]
  return keys.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]))
}
