import { create } from 'zustand'
import { parseChart, type Action, type Chart, type Frequencies, type SpotKey } from '../core/chart'
import type { Hand } from '../core/hands'
import { buildScenario, type Scenario } from '../core/scenario'
import { correctActions, dealCards, pickHand, type Card, type Rng } from '../core/trainer'
import { starterChart } from '../data/starterChart'

export interface Question {
  id: number
  spotKey: SpotKey
  hand: Hand
  cards: [Card, Card]
  scenario: Scenario
  freqs: Frequencies
}

export interface AnswerResult {
  action: Action
  correct: boolean
  accepted: Action[]
}

interface TrainerState {
  chart: Chart
  rng: Rng
  threshold: number
  borderlineShare: number
  question: Question
  answer: AnswerResult | null
  session: { total: number; correct: number }
  submit: (action: Action) => void
  next: () => void
  /** For tests and future chart switching. */
  reset: (chart: Chart, rng?: Rng) => void
}

function loadStarter(): Chart {
  const res = parseChart(starterChart)
  if (!res.ok) throw new Error(`Starter chart is invalid:\n${res.errors.join('\n')}`)
  return res.chart
}

function makeQuestion(chart: Chart, rng: Rng, borderlineShare: number, id: number): Question {
  const keys = [...chart.spots.keys()]
  const spotKey = keys[Math.floor(rng() * keys.length)]
  const spot = chart.spots.get(spotKey)!
  const hand = pickHand(spot, rng, borderlineShare)
  return {
    id,
    spotKey,
    hand,
    cards: dealCards(hand, rng),
    scenario: buildScenario(spot, chart.sizings),
    freqs: spot.hands.get(hand)!,
  }
}

const initialChart = loadStarter()

export const useTrainer = create<TrainerState>()((set, get) => ({
  chart: initialChart,
  rng: Math.random,
  threshold: 0.25,
  borderlineShare: 0.7,
  question: makeQuestion(initialChart, Math.random, 0.7, 0),
  answer: null,
  session: { total: 0, correct: 0 },

  submit: (action) => {
    const { answer, question, threshold, session } = get()
    if (answer) return
    const accepted = correctActions(question.freqs, threshold)
    const correct = accepted.includes(action)
    set({
      answer: { action, correct, accepted },
      session: { total: session.total + 1, correct: session.correct + (correct ? 1 : 0) },
    })
  },

  next: () => {
    const { chart, rng, borderlineShare, question } = get()
    set({ question: makeQuestion(chart, rng, borderlineShare, question.id + 1), answer: null })
  },

  reset: (chart, rng = Math.random) => {
    set({
      chart,
      rng,
      question: makeQuestion(chart, rng, get().borderlineShare, 0),
      answer: null,
      session: { total: 0, correct: 0 },
    })
  },
}))
