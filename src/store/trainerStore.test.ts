import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseChart } from '../core/chart'
import { REVIEW_INTERVALS } from '../core/review'
import { actionForRoll, correctActions, mulberry32 } from '../core/trainer'
import { starterChart } from '../data/starterChart'
import { STARTER_ID, TrainerDb, createDexieRepo } from '../db/repo'
import { useTrainer } from './trainerStore'

let n = 0
let clockNow = 0
const store = () => useTrainer.getState()

function answerWrong() {
  const q = store().question
  const accepted = correctActions(q.freqs)
  store().submit(q.scenario.actions.find((o) => !accepted.includes(o.action))!.action)
}

function answerRight() {
  store().submit(correctActions(store().question.freqs)[0])
}

beforeEach(() => {
  const res = parseChart(starterChart)
  if (!res.ok) throw new Error()
  clockNow = 0
  store().reset(res.chart, mulberry32(7), () => clockNow)
})

describe('trainer store', () => {
  it('brings a mistake back after the first interval', () => {
    const missed = store().question
    answerWrong()
    for (let i = 0; i < REVIEW_INTERVALS[0]; i++) {
      store().next()
      if (i < REVIEW_INTERVALS[0] - 1) {
        expect(store().question.isReview).toBe(false)
        answerRight()
      }
    }
    expect(store().question).toMatchObject({ isReview: true, spotKey: missed.spotKey, hand: missed.hand })
  })

  it('persists progress and restores it after reload', async () => {
    const repo = createDexieRepo(new TrainerDb(`store-${n++}`))
    await store().init(repo)
    answerWrong()
    await new Promise((r) => setTimeout(r, 50))

    store().reset(store().chart)
    await store().init(repo)
    expect(store().counter).toBe(1)
    expect(store().reviews).toHaveLength(1)
  })

  it('switches to a saved chart and back', async () => {
    const repo = createDexieRepo(new TrainerDb(`store-${n++}`))
    const id = await repo.saveChart({
      ...starterChart,
      name: 'Только UTG',
      spots: starterChart.spots.filter((s) => s.spot.kind === 'rfi' && s.spot.hero === 'UTG'),
    })
    await store().init(repo)
    await store().selectChart(id)
    expect(store().chartId).toBe(id)
    expect(store().question.spotKey).toBe('rfi:UTG')
    expect(await repo.getActiveChartId()).toBe(id)
    await store().selectChart(STARTER_ID)
    expect(store().chart.spots.size).toBe(62)
  })

  it('randomizer mode accepts only the action of the rolled interval', () => {
    store().updateSettings({ mixedMode: 'rng' })
    for (let i = 0; i < 30; i++) {
      const q = store().question
      const expected = actionForRoll(q.freqs, q.roll)
      const other = q.scenario.actions.find((o) => o.action !== expected)!.action
      store().submit(other)
      expect(store().answer).toMatchObject({ correct: false, accepted: [expected], roll: q.roll })
      store().next()
    }
    store().updateSettings({ mixedMode: 'threshold' })
  })

  it('a correct raise with a wrong size is a mistake', () => {
    // find a question where raise is correct
    for (let i = 0; i < 200 && !correctActions(store().question.freqs).includes('raise'); i++) store().next()
    const q = store().question
    const rule = q.scenario.actions.find((o) => o.action === 'raise')!.rule!
    store().submit('raise', rule.to + 1)
    expect(store().answer).toMatchObject({ correct: false, size: { ok: false, entered: rule.to + 1 } })
    store().next()
    for (let i = 0; i < 200 && !correctActions(store().question.freqs).includes('raise'); i++) store().next()
    const q2 = store().question
    store().submit('raise', q2.scenario.actions.find((o) => o.action === 'raise')!.rule!.to)
    expect(store().answer).toMatchObject({ correct: true, size: { ok: true } })
  })

  it('measures the decision time from the moment the cards are dealt, without hidden-tab time', async () => {
    const repo = createDexieRepo(new TrainerDb(`store-${n++}`))
    await store().init(repo)
    clockNow = 1000
    store().startClock()
    clockNow = 3000
    store().pauseClock()
    clockNow = 60_000
    store().resumeClock()
    clockNow = 61_500
    answerRight()
    expect(store().answer?.answerMs).toBe(3500)
    await new Promise((r) => setTimeout(r, 50))
    expect((await repo.listAttempts(STARTER_ID))[0]).toMatchObject({ answerMs: 3500, correct: true })
  })

  it('time up is a mistake with the right answer shown and the hand queued for review', async () => {
    const repo = createDexieRepo(new TrainerDb(`store-${n++}`))
    await store().init(repo)
    store().updateSettings({ timeLimit: 5 })
    store().startClock()
    const q = store().question
    store().timeUp()
    expect(store().answer).toMatchObject({ action: null, correct: false, timedOut: true, accepted: correctActions(q.freqs) })
    expect(store().reviews).toMatchObject([{ spotKey: q.spotKey, hand: q.hand }])
    expect(store().session).toEqual({ total: 1, correct: 0 })
    // A click that lands after the time is up changes nothing.
    answerRight()
    expect(store().answer?.timedOut).toBe(true)
    await new Promise((r) => setTimeout(r, 50))
    expect((await repo.listAttempts(STARTER_ID))[0]).toMatchObject({ action: null, correct: false, timedOut: true })
  })

  it('an answer before the cards land counts as 0 ms', () => {
    answerRight()
    expect(store().answer?.answerMs).toBe(0)
  })
})
