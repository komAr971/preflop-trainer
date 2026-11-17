import type { Scenario } from './scenario'

export const PRESET_MULTIPLIERS = [2, 3, 4, 5] as const
const STACK_BB = 100
const STEP = 0.5

/** Raise size for an "×N" button: N times the bet the hero faces (1bb = the big blind when opening). */
export function presetSize(mult: number, s: Pick<Scenario, 'facingBb' | 'minRaiseBb'>): number {
  const raw = Math.round((mult * (s.facingBb ?? 1)) / STEP) * STEP
  return Math.min(STACK_BB, Math.max(s.minRaiseBb, raw))
}
