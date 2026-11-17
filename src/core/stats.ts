import type { SpotKey } from './chart'
import type { Hand } from './hands'

export interface AttemptLike {
  spotKey: SpotKey
  hand: Hand
  correct: boolean
  ts: number
  answerMs?: number
  timedOut?: boolean
}

/** Answers slower than this are treated as distraction and left out of the median. */
export const MAX_COUNTED_MS = 60_000

/** Median decision time; timeouts, answers over 60 s and untimed attempts don't count. */
export function medianDecisionMs(attempts: AttemptLike[]): number | null {
  const times = attempts
    .filter((x) => !x.timedOut && x.answerMs !== undefined && x.answerMs <= MAX_COUNTED_MS)
    .map((x) => x.answerMs!)
    .sort((x, y) => x - y)
  if (times.length === 0) return null
  const mid = times.length >> 1
  return times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2
}

export interface SpotStat {
  total: number
  correct: number
  /** Last `window` attempts in this spot. */
  recentTotal: number
  recentCorrect: number
  /** Window is full and its accuracy ≥ threshold. */
  learned: boolean
  /** Median decision time, null when nothing was timed. */
  medianMs: number | null
  timeouts: number
}

export interface LearnedRule {
  window: number
  threshold: number
}

export const DEFAULT_LEARNED: LearnedRule = { window: 200, threshold: 0.9 }
export const DEFAULT_DAILY_GOAL = 100

export function spotStats(attempts: AttemptLike[], rule: LearnedRule = DEFAULT_LEARNED): Map<SpotKey, SpotStat> {
  const bySpot = new Map<SpotKey, AttemptLike[]>()
  for (const at of attempts) {
    if (!bySpot.has(at.spotKey)) bySpot.set(at.spotKey, [])
    bySpot.get(at.spotKey)!.push(at)
  }
  const out = new Map<SpotKey, SpotStat>()
  for (const [key, list] of bySpot) {
    const recent = [...list].sort((x, y) => x.ts - y.ts).slice(-rule.window)
    const recentCorrect = recent.filter((x) => x.correct).length
    out.set(key, {
      total: list.length,
      correct: list.filter((x) => x.correct).length,
      recentTotal: recent.length,
      recentCorrect,
      learned: recent.length >= rule.window && recentCorrect / recent.length >= rule.threshold,
      medianMs: medianDecisionMs(list),
      timeouts: list.filter((x) => x.timedOut).length,
    })
  }
  return out
}

export function handErrors(attempts: AttemptLike[], spotKey?: SpotKey): Map<Hand, { total: number; wrong: number }> {
  const out = new Map<Hand, { total: number; wrong: number }>()
  for (const at of attempts) {
    if (spotKey && at.spotKey !== spotKey) continue
    const cur = out.get(at.hand) ?? { total: 0, wrong: 0 }
    out.set(at.hand, { total: cur.total + 1, wrong: cur.wrong + (at.correct ? 0 : 1) })
  }
  return out
}

/** Local calendar day, "YYYY-MM-DD". */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function shiftDay(ts: number, days: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

export function todayCount(timestamps: number[], now: number): number {
  const today = dayKey(now)
  return timestamps.filter((ts) => dayKey(ts) === today).length
}

/**
 * Consecutive days (ending today) on which at least `goal` hands were played.
 * Today counts once reached; until then the streak from yesterday stays alive.
 */
export function streakDays(timestamps: number[], now: number, goal: number): number {
  const perDay = new Map<string, number>()
  for (const ts of timestamps) perDay.set(dayKey(ts), (perDay.get(dayKey(ts)) ?? 0) + 1)
  const reached = (ts: number) => (perDay.get(dayKey(ts)) ?? 0) >= goal

  let day = reached(now) ? now : shiftDay(now, -1)
  let streak = 0
  while (reached(day)) {
    streak++
    day = shiftDay(day, -1)
  }
  return streak
}
