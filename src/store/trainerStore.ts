import { create } from 'zustand'
import { parseChart, type Action, type Chart, type Frequencies, type SpotKey } from '../core/chart'
import type { Hand } from '../core/hands'
import { dueItem, onAnswer, type ReviewItem } from '../core/review'
import { buildScenario, type Scenario, type SizeRule } from '../core/scenario'
import { actionForRoll, correctActions, dealCards, pickHand, rollD100, sizeMatches, type Card, type Rng } from '../core/trainer'
import { elapsedMs, pauseClock, resumeClock, startClock, type Clock } from '../core/timer'
import { DEFAULT_SETTINGS, type Settings } from '../core/settings'
import { starterChart } from '../data/starterChart'
import { STARTER_ID, type ChartId, type Repo } from '../db/repo'

export interface Question {
  id: number
  spotKey: SpotKey
  hand: Hand
  cards: [Card, Card]
  scenario: Scenario
  freqs: Frequencies
  /** Came from the mistakes queue. */
  isReview: boolean
  /** Randomizer roll 1–100 (used in rng mode). */
  roll: number
}

export interface AnswerResult {
  /** null when the time ran out. */
  action: Action | null
  correct: boolean
  /** Decision time, when the clock was running. */
  answerMs?: number
  timedOut?: boolean
  accepted: Action[]
  /** The roll that decided the answer (rng mode). */
  roll?: number
  /** Raise size check (when sizes are entered). */
  size?: { entered: number; rule: SizeRule; ok: boolean }
}

/** One table at the screen: its hand, answer and decision clock. */
export interface TableSlot {
  question: Question
  answer: AnswerResult | null
  /** Starts when the deal animation ends. */
  clock: Clock | null
  /** Since when the table waits for the user (an answer, or "next" after a mistake); null otherwise. */
  waitingSince: number | null
}

interface TrainerState {
  /** False until stored progress is loaded; UI waits for it so answers are never lost. */
  ready: boolean
  repo: Repo | null
  chartId: ChartId
  chart: Chart
  rng: Rng
  now: () => number
  settings: Settings
  /** Questions answered with this chart (drives the review queue). */
  counter: number
  reviews: ReviewItem[]
  /** Tables in play (1–4); counter, session and the review queue are shared. */
  tables: TableSlot[]
  /** Next question id (unique across tables). */
  nextId: number
  /** Tab hidden: every clock is paused. */
  hidden: boolean
  /** Table whose mistake is open in the review panel: the other clocks are paused. */
  reviewing: number | null
  session: { total: number; correct: number }
  /** `sizeBb` — entered raise size, checked when size input is on. `t` — table index. */
  submit: (action: Action, sizeBb?: number, t?: number) => void
  next: (t?: number) => void
  startClock: (t?: number) => void
  setHidden: (hidden: boolean) => void
  setReviewing: (t: number | null) => void
  /** The time limit ran out: a mistake, the hand goes to the review queue. */
  timeUp: (t?: number) => void
  setTableCount: (n: number) => void
  /** The table hotkeys go to: the one waiting longest; null when none waits. */
  activeTable: () => number | null
  /** Connects storage and loads the active chart with its progress. */
  init: (repo: Repo) => Promise<void>
  /** Switches training to another saved chart. */
  selectChart: (chartId: ChartId) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => void
  /** Bumped when another device's changes arrived: lists and stats reload. */
  dataVersion: number
  /** Picks up what a sync pulled: settings, the active chart and its review queue. Hands in play stay. */
  refreshFromStorage: (changed: { settings: boolean; charts: ChartId[]; progress: ChartId[] }) => Promise<void>
  /** In-memory reset (tests). */
  reset: (chart: Chart, rng?: Rng, now?: () => number) => void
}

function compile(file: unknown): Chart {
  const res = parseChart(file)
  if (!res.ok) throw new Error(res.errors.join('\n'))
  return res.chart
}

const starter = compile(starterChart)

type Deal = Pick<TrainerState, 'chart' | 'rng' | 'settings' | 'reviews' | 'counter'>

/** `busy` — hands on the other tables: a review hand is never dealt twice at once. */
function makeQuestion(s: Deal, id: number, busy: Question[] = []): Question {
  const { chart, rng } = s
  const free = s.reviews.filter((r) => !busy.some((q) => q.spotKey === r.spotKey && q.hand === r.hand))
  // The question being built will be answered as number counter + 1.
  const due = dueItem(free, s.counter + 1)
  let spotKey: SpotKey
  let hand: Hand
  if (due && chart.spots.has(due.spotKey)) {
    ;({ spotKey, hand } = due)
  } else {
    const keys = [...chart.spots.keys()]
    spotKey = keys[Math.floor(rng() * keys.length)]
    hand = pickHand(chart.spots.get(spotKey)!, rng, s.settings.borderlineShare)
  }
  const spot = chart.spots.get(spotKey)!
  return {
    id,
    spotKey,
    hand,
    cards: dealCards(hand, rng),
    scenario: buildScenario(spot, chart.sizings, rng),
    freqs: spot.hands.get(hand)!,
    isReview: due !== undefined && due.spotKey === spotKey && due.hand === hand,
    roll: rollD100(rng),
  }
}

function acceptedActions(q: Question, settings: Settings): Action[] {
  return settings.mixedMode === 'rng' ? [actionForRoll(q.freqs, q.roll)] : correctActions(q.freqs, settings.threshold)
}

const base = { chart: starter, rng: Math.random, settings: DEFAULT_SETTINGS, reviews: [], counter: 0 }

const slot = (question: Question): TableSlot => ({ question, answer: null, clock: null, waitingSince: null })

/** Deals fresh hands for every table from scratch. */
function dealTables(s: Deal, count: number, firstId: number): TableSlot[] {
  const out: TableSlot[] = []
  for (let i = 0; i < count; i++) out.push(slot(makeQuestion(s, firstId + i, out.map((x) => x.question))))
  return out
}

const isPaused = (s: Pick<TrainerState, 'hidden' | 'reviewing'>, t: number) =>
  s.hidden || (s.reviewing !== null && s.reviewing !== t)

export const useTrainer = create<TrainerState>()((set, get) => {
  /** Pauses or resumes every table clock after the tab or the review panel changed. */
  const syncClocks = () => {
    const s = get()
    const now = s.now()
    set({
      tables: s.tables.map((x, i) =>
        x.clock ? { ...x, clock: isPaused(s, i) ? pauseClock(x.clock, now) : resumeClock(x.clock, now) } : x,
      ),
    })
  }

  return {
  ready: false,
  repo: null,
  chartId: STARTER_ID,
  ...base,
  now: Date.now,
  tables: dealTables(base, 1, 0),
  nextId: 1,
  hidden: false,
  reviewing: null,
  session: { total: 0, correct: 0 },
  dataVersion: 0,

  submit: (action, sizeBb, t = 0) => {
    const { tables, settings, session, counter, reviews, repo, chartId, now } = get()
    const table = tables[t]
    if (!table || table.answer) return
    const { question, clock } = table
    const accepted = acceptedActions(question, settings)
    // Answered while the cards were still flying in: the clock had not started yet.
    const answerMs = clock ? elapsedMs(clock, now()) : 0
    const rule = question.scenario.actions.find((o) => o.action === 'raise')?.rule
    const size =
      action === 'raise' && rule && sizeBb !== undefined
        ? { entered: sizeBb, rule, ok: sizeMatches(sizeBb, rule.to, settings.sizeTolerance) }
        : undefined
    const correct = accepted.includes(action) && (size?.ok ?? true)
    const nextCounter = counter + 1
    const nextReviews = onAnswer(reviews, question, correct, nextCounter)
    const answer = { action, correct, accepted, roll: settings.mixedMode === 'rng' ? question.roll : undefined, size, answerMs }
    set({
      tables: tables.map((x, i) => (i === t ? { ...x, answer, waitingSince: correct ? null : now() } : x)),
      session: { total: session.total + 1, correct: session.correct + (correct ? 1 : 0) },
      counter: nextCounter,
      reviews: nextReviews,
    })
    repo
      ?.recordAttempt(
        { chartId, spotKey: question.spotKey, hand: question.hand, action, correct, ts: Date.now(), answerMs },
        nextReviews,
        nextCounter,
      )
      .catch((e) => console.error('Failed to save attempt', e))
  },

  next: (t = 0) => {
    const s = get()
    if (!s.tables[t]) return
    const busy = s.tables.filter((_, i) => i !== t).map((x) => x.question)
    const question = makeQuestion(s, s.nextId, busy)
    set({
      tables: s.tables.map((x, i) => (i === t ? slot(question) : x)),
      nextId: s.nextId + 1,
    })
    // "Next" from the review panel closes it and resumes the other tables.
    if (s.reviewing === t) get().setReviewing(null)
  },

  startClock: (t = 0) => {
    const s = get()
    const table = s.tables[t]
    if (!table || table.answer || table.clock) return
    const now = s.now()
    const clock = isPaused(s, t) ? pauseClock(startClock(now), now) : startClock(now)
    set({ tables: s.tables.map((x, i) => (i === t ? { ...x, clock, waitingSince: now } : x)) })
  },

  setHidden: (hidden) => {
    set({ hidden })
    syncClocks()
  },

  setReviewing: (reviewing) => {
    set({ reviewing })
    syncClocks()
  },

  timeUp: (t = 0) => {
    const { tables, settings, session, counter, reviews, repo, chartId, now } = get()
    const table = tables[t]
    if (!table || table.answer || settings.timeLimit === 0) return
    const { question } = table
    const answerMs = settings.timeLimit * 1000
    const nextCounter = counter + 1
    const nextReviews = onAnswer(reviews, question, false, nextCounter)
    const answer: AnswerResult = {
      action: null,
      correct: false,
      timedOut: true,
      answerMs,
      accepted: acceptedActions(question, settings),
      roll: settings.mixedMode === 'rng' ? question.roll : undefined,
    }
    set({
      tables: tables.map((x, i) => (i === t ? { ...x, answer, waitingSince: now() } : x)),
      session: { total: session.total + 1, correct: session.correct },
      counter: nextCounter,
      reviews: nextReviews,
    })
    repo
      ?.recordAttempt(
        { chartId, spotKey: question.spotKey, hand: question.hand, action: null, correct: false, ts: Date.now(), answerMs, timedOut: true },
        nextReviews,
        nextCounter,
      )
      .catch((e) => console.error('Failed to save attempt', e))
  },

  setTableCount: (n) => {
    const s = get()
    const count = Math.max(1, Math.min(4, Math.floor(n)))
    if (count === s.tables.length) return
    let tables = s.tables.slice(0, count)
    let nextId = s.nextId
    while (tables.length < count) {
      tables = [...tables, slot(makeQuestion(s, nextId++, tables.map((x) => x.question)))]
    }
    set({ tables, nextId, reviewing: s.reviewing !== null && s.reviewing >= count ? null : s.reviewing })
    syncClocks()
  },

  activeTable: () => {
    let best: number | null = null
    get().tables.forEach((x, i) => {
      if (x.waitingSince === null) return
      if (best === null || x.waitingSince < get().tables[best].waitingSince!) best = i
    })
    return best
  },

  init: async (repo) => {
    set({ repo })
    try {
      set({ settings: await repo.getSettings() })
      await get().selectChart(await repo.getActiveChartId())
    } catch (e) {
      // Storage unavailable (e.g. private mode): train without saving.
      set({ repo: null })
      throw e
    } finally {
      set({ ready: true })
    }
  },

  selectChart: async (chartId) => {
    const { repo } = get()
    if (!repo) return
    let chart = starter
    let id: ChartId = STARTER_ID
    try {
      const file = await repo.getChart(chartId)
      if (file) {
        chart = compile(file)
        id = chartId
      }
    } catch (e) {
      console.error('Saved chart is invalid, falling back to starter', e)
    }
    const { reviews, counter } = await repo.loadProgress(id)
    await repo.setActiveChartId(id)
    const s = { ...get(), chart, reviews, counter }
    const count = get().tables.length
    set({ chartId: id, chart, reviews, counter, tables: dealTables(s, count, s.nextId), nextId: s.nextId + count, reviewing: null })
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    set({ settings })
    get()
      .repo?.saveSettings(settings)
      .catch((e) => console.error('Failed to save settings', e))
  },

  refreshFromStorage: async (changed) => {
    const { repo } = get()
    if (!repo) return
    if (changed.settings) set({ settings: await repo.getSettings() })
    const active = get().chartId
    if (changed.charts.includes(active)) {
      // Edited or deleted elsewhere: recompile (falls back to the starter when gone).
      await get().selectChart(await repo.getActiveChartId())
    } else if (changed.progress.includes(active)) {
      set(await repo.loadProgress(active))
    }
    set({ dataVersion: get().dataVersion + 1 })
  },

  reset: (chart, rng = Math.random, now = Date.now) => {
    const s = { ...get(), chart, rng, reviews: [], counter: 0 }
    set({
      ready: true,
      repo: null,
      chartId: STARTER_ID,
      chart,
      rng,
      now,
      reviews: [],
      counter: 0,
      tables: dealTables(s, 1, 0),
      nextId: 1,
      hidden: false,
      reviewing: null,
      session: { total: 0, correct: 0 },
    })
  },
  }
})
