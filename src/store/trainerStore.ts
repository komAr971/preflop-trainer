import { create } from 'zustand'
import { parseChart, type Action, type Chart, type Frequencies, type SpotKey } from '../core/chart'
import type { Hand } from '../core/hands'
import { dueItem, onAnswer, type ReviewItem } from '../core/review'
import { buildScenario, type Scenario } from '../core/scenario'
import { correctActions, dealCards, pickHand, type Card, type Rng } from '../core/trainer'
import { DEFAULT_SETTINGS, type Settings } from '../core/settings'
import { starterChart } from '../data/starterChart'
import { STARTER_ID, type Repo } from '../db/repo'

export interface Question {
  id: number
  spotKey: SpotKey
  hand: Hand
  cards: [Card, Card]
  scenario: Scenario
  freqs: Frequencies
  /** Came from the mistakes queue. */
  isReview: boolean
}

export interface AnswerResult {
  action: Action
  correct: boolean
  accepted: Action[]
}

interface TrainerState {
  /** False until stored progress is loaded; UI waits for it so answers are never lost. */
  ready: boolean
  repo: Repo | null
  chartId: number
  chart: Chart
  rng: Rng
  settings: Settings
  /** Questions answered with this chart (drives the review queue). */
  counter: number
  reviews: ReviewItem[]
  question: Question
  answer: AnswerResult | null
  session: { total: number; correct: number }
  submit: (action: Action) => void
  next: () => void
  /** Connects storage and loads the active chart with its progress. */
  init: (repo: Repo) => Promise<void>
  /** Switches training to another saved chart. */
  selectChart: (chartId: number) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => void
  /** In-memory reset (tests). */
  reset: (chart: Chart, rng?: Rng) => void
}

function compile(file: unknown): Chart {
  const res = parseChart(file)
  if (!res.ok) throw new Error(res.errors.join('\n'))
  return res.chart
}

const starter = compile(starterChart)

function makeQuestion(
  s: Pick<TrainerState, 'chart' | 'rng' | 'settings' | 'reviews' | 'counter'>,
  id: number,
): Question {
  const { chart, rng } = s
  // The question being built will be answered as number counter + 1.
  const due = dueItem(s.reviews, s.counter + 1)
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
    scenario: buildScenario(spot, chart.sizings),
    freqs: spot.hands.get(hand)!,
    isReview: due !== undefined && due.spotKey === spotKey && due.hand === hand,
  }
}

const base = { chart: starter, rng: Math.random, settings: DEFAULT_SETTINGS, reviews: [], counter: 0 }

export const useTrainer = create<TrainerState>()((set, get) => ({
  ready: false,
  repo: null,
  chartId: STARTER_ID,
  ...base,
  question: makeQuestion(base, 0),
  answer: null,
  session: { total: 0, correct: 0 },

  submit: (action) => {
    const { answer, question, settings, session, counter, reviews, repo, chartId } = get()
    if (answer) return
    const accepted = correctActions(question.freqs, settings.threshold)
    const correct = accepted.includes(action)
    const nextCounter = counter + 1
    const nextReviews = onAnswer(reviews, question, correct, nextCounter)
    set({
      answer: { action, correct, accepted },
      session: { total: session.total + 1, correct: session.correct + (correct ? 1 : 0) },
      counter: nextCounter,
      reviews: nextReviews,
    })
    repo
      ?.recordAttempt(
        { chartId, spotKey: question.spotKey, hand: question.hand, action, correct, ts: Date.now() },
        nextReviews,
        nextCounter,
      )
      .catch((e) => console.error('Failed to save attempt', e))
  },

  next: () => {
    const s = get()
    set({ question: makeQuestion(s, s.question.id + 1), answer: null })
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
    let id = STARTER_ID
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
    set({ chartId: id, chart, reviews, counter, question: makeQuestion(s, get().question.id + 1), answer: null })
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    set({ settings })
    get()
      .repo?.saveSettings(settings)
      .catch((e) => console.error('Failed to save settings', e))
  },

  reset: (chart, rng = Math.random) => {
    const s = { ...get(), chart, rng, reviews: [], counter: 0 }
    set({
      ready: true,
      repo: null,
      chartId: STARTER_ID,
      chart,
      rng,
      reviews: [],
      counter: 0,
      question: makeQuestion(s, 0),
      answer: null,
      session: { total: 0, correct: 0 },
    })
  },
}))
