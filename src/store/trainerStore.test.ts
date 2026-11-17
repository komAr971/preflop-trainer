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
  const q = store().tables[0].question
  const accepted = correctActions(q.freqs)
  store().submit(q.scenario.actions.find((o) => !accepted.includes(o.action))!.action)
}

function answerRight() {
  store().submit(correctActions(store().tables[0].question.freqs)[0])
}

beforeEach(() => {
  const res = parseChart(starterChart)
  if (!res.ok) throw new Error()
  clockNow = 0
  store().reset(res.chart, mulberry32(7), () => clockNow)
})

describe('trainer store', () => {
  it('brings a mistake back after the first interval', () => {
    const missed = store().tables[0].question
    answerWrong()
    for (let i = 0; i < REVIEW_INTERVALS[0]; i++) {
      store().next()
      if (i < REVIEW_INTERVALS[0] - 1) {
        expect(store().tables[0].question.isReview).toBe(false)
        answerRight()
      }
    }
    expect(store().tables[0].question).toMatchObject({ isReview: true, spotKey: missed.spotKey, hand: missed.hand })
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
    expect(store().tables[0].question.spotKey).toBe('rfi:UTG')
    expect(await repo.getActiveChartId()).toBe(id)
    await store().selectChart(STARTER_ID)
    expect(store().chart.spots.size).toBe(62)
  })

  it('picks up synced changes without redealing the hand in play', async () => {
    const repo = createDexieRepo(new TrainerDb(`store-${n++}`))
    await store().init(repo)
    const question = store().tables[0].question
    const before = store().dataVersion
    // Another device answered 5 more hands and changed the daily goal.
    await repo.recordAttempt(
      { chartId: STARTER_ID, spotKey: 'rfi:CO', hand: 'K9o', action: 'fold', correct: false, ts: 1 },
      [{ spotKey: 'rfi:CO', hand: 'K9o', box: 0, due: 8 }],
      5,
    )
    await repo.saveSettings({ ...store().settings, dailyGoal: 33 })
    await store().refreshFromStorage({ settings: true, charts: [], progress: [STARTER_ID] })
    expect(store().counter).toBe(5)
    expect(store().reviews).toHaveLength(1)
    expect(store().settings.dailyGoal).toBe(33)
    expect(store().tables[0].question).toBe(question)
    expect(store().dataVersion).toBe(before + 1)
  })

  it('falls back to the starter when the active chart was deleted on another device', async () => {
    const repo = createDexieRepo(new TrainerDb(`store-${n++}`))
    const id = await repo.saveChart({ ...starterChart, name: 'Удалят' })
    await store().init(repo)
    await store().selectChart(id)
    await repo.deleteChart(id)
    await store().refreshFromStorage({ settings: false, charts: [id], progress: [] })
    expect(store().chartId).toBe(STARTER_ID)
  })

  it('randomizer mode accepts only the action of the rolled interval', () => {
    store().updateSettings({ mixedMode: 'rng' })
    for (let i = 0; i < 30; i++) {
      const q = store().tables[0].question
      const expected = actionForRoll(q.freqs, q.roll)
      const other = q.scenario.actions.find((o) => o.action !== expected)!.action
      store().submit(other)
      expect(store().tables[0].answer).toMatchObject({ correct: false, accepted: [expected], roll: q.roll })
      store().next()
    }
    store().updateSettings({ mixedMode: 'threshold' })
  })

  it('a correct raise with a wrong size is a mistake', () => {
    // find a question where raise is correct
    for (let i = 0; i < 200 && !correctActions(store().tables[0].question.freqs).includes('raise'); i++) store().next()
    const q = store().tables[0].question
    const rule = q.scenario.actions.find((o) => o.action === 'raise')!.rule!
    store().submit('raise', rule.to + 1)
    expect(store().tables[0].answer).toMatchObject({ correct: false, size: { ok: false, entered: rule.to + 1 } })
    store().next()
    for (let i = 0; i < 200 && !correctActions(store().tables[0].question.freqs).includes('raise'); i++) store().next()
    const q2 = store().tables[0].question
    store().submit('raise', q2.scenario.actions.find((o) => o.action === 'raise')!.rule!.to)
    expect(store().tables[0].answer).toMatchObject({ correct: true, size: { ok: true } })
  })

  it('measures the decision time from the moment the cards are dealt, without hidden-tab time', async () => {
    const repo = createDexieRepo(new TrainerDb(`store-${n++}`))
    await store().init(repo)
    clockNow = 1000
    store().startClock()
    clockNow = 3000
    store().setHidden(true)
    clockNow = 60_000
    store().setHidden(false)
    clockNow = 61_500
    answerRight()
    expect(store().tables[0].answer?.answerMs).toBe(3500)
    await new Promise((r) => setTimeout(r, 50))
    expect((await repo.listAttempts(STARTER_ID))[0]).toMatchObject({ answerMs: 3500, correct: true })
  })

  it('time up is a mistake with the right answer shown and the hand queued for review', async () => {
    const repo = createDexieRepo(new TrainerDb(`store-${n++}`))
    await store().init(repo)
    store().updateSettings({ timeLimit: 5 })
    store().startClock()
    const q = store().tables[0].question
    store().timeUp()
    expect(store().tables[0].answer).toMatchObject({ action: null, correct: false, timedOut: true, accepted: correctActions(q.freqs) })
    expect(store().reviews).toMatchObject([{ spotKey: q.spotKey, hand: q.hand }])
    expect(store().session).toEqual({ total: 1, correct: 0 })
    // A click that lands after the time is up changes nothing.
    answerRight()
    expect(store().tables[0].answer?.timedOut).toBe(true)
    await new Promise((r) => setTimeout(r, 50))
    expect((await repo.listAttempts(STARTER_ID))[0]).toMatchObject({ action: null, correct: false, timedOut: true })
  })

  it('an answer before the cards land counts as 0 ms', () => {
    answerRight()
    expect(store().tables[0].answer?.answerMs).toBe(0)
  })

  describe('several tables', () => {
    const tables = () => store().tables

    it('opens and closes tables, keeping the ones already in play', () => {
      const first = tables()[0].question
      store().setTableCount(4)
      expect(tables()).toHaveLength(4)
      expect(new Set(tables().map((x) => x.question.id)).size).toBe(4)
      store().setTableCount(1)
      expect(tables()).toHaveLength(1)
      expect(tables()[0].question).toBe(first)
    })

    it('shares the counter, session and review queue; each table deals its own next hand', () => {
      store().setTableCount(2)
      const other = tables()[1].question
      const q = tables()[0].question
      const wrong = q.scenario.actions.find((o) => !correctActions(q.freqs).includes(o.action))!.action
      store().submit(wrong, undefined, 0)
      store().submit(correctActions(other.freqs)[0], undefined, 1)
      expect(store().counter).toBe(2)
      expect(store().session).toEqual({ total: 2, correct: 1 })
      expect(store().reviews).toMatchObject([{ spotKey: q.spotKey, hand: q.hand }])
      store().next(1)
      expect(tables()[1].question.id).not.toBe(other.id)
      expect(tables()[0].answer?.correct).toBe(false)
    })

    it('never deals the same review hand on two tables at once', () => {
      store().setTableCount(4)
      const missed = tables()[0].question
      answerWrong()
      store().next(0)
      // Deal on tables 1–3 only, never answering the review hand: once due it must not spread.
      let seen = 0
      for (let i = 0; i < 10; i++) {
        for (const t of [1, 2, 3]) {
          const q = tables()[t].question
          if (q.spotKey === missed.spotKey && q.hand === missed.hand) continue
          store().submit(correctActions(q.freqs)[0], undefined, t)
          store().next(t)
        }
        const holding = tables().filter((x) => x.question.spotKey === missed.spotKey && x.question.hand === missed.hand)
        expect(holding.length).toBeLessThanOrEqual(1)
        seen += holding.length
      }
      expect(seen).toBeGreaterThan(0)
    })

    it('the active table is the one waiting longest; a mistake waits for a click', () => {
      store().setTableCount(3)
      clockNow = 100
      store().startClock(2)
      clockNow = 200
      store().startClock(0)
      clockNow = 300
      store().startClock(1)
      expect(store().activeTable()).toBe(2)
      store().submit(correctActions(tables()[2].question.freqs)[0], undefined, 2)
      expect(store().activeTable()).toBe(0)
      clockNow = 400
      const q = tables()[0].question
      store().submit(q.scenario.actions.find((o) => !correctActions(q.freqs).includes(o.action))!.action, undefined, 0)
      // Table 0 now waits for "next" since 400, table 1 waits for an answer since 300.
      expect(store().activeTable()).toBe(1)
    })

    it('the review panel pauses the other tables; a hidden tab pauses all', () => {
      store().setTableCount(2)
      clockNow = 0
      store().startClock(0)
      store().startClock(1)
      const q = tables()[0].question
      clockNow = 1000
      store().submit(q.scenario.actions.find((o) => !correctActions(q.freqs).includes(o.action))!.action, undefined, 0)
      store().setReviewing(0)
      clockNow = 30_000
      store().setReviewing(null)
      clockNow = 32_000
      store().setHidden(true)
      clockNow = 50_000
      store().setHidden(false)
      clockNow = 51_000
      store().submit(correctActions(tables()[1].question.freqs)[0], undefined, 1)
      expect(tables()[1].answer?.answerMs).toBe(1000 + 2000 + 1000)
    })
  })
})
