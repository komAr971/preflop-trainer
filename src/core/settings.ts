import { z } from 'zod'

export const settingsSchema = z.object({
  /** Mixed hands: an action with at least this frequency counts as correct. */
  threshold: z.number().min(0.05).max(1).default(0.25),
  /** Share of questions drawn from borderline hands. */
  borderlineShare: z.number().min(0).max(1).default(0.7),
  /** A spot is learned when accuracy over the last `learnedWindow` hands ≥ `learnedThreshold`. */
  learnedWindow: z.number().int().min(10).max(2000).default(200),
  learnedThreshold: z.number().min(0.5).max(1).default(0.9),
  dailyGoal: z.number().int().min(1).max(5000).default(100),
  sound: z.boolean().default(true),
  volume: z.number().min(0).max(1).default(0.5),
  /** Individual sounds on/off. */
  soundKinds: z
    .object({ deal: z.boolean(), chip: z.boolean(), correct: z.boolean(), wrong: z.boolean() })
    .default({ deal: true, chip: true, correct: true, wrong: true }),
})

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
