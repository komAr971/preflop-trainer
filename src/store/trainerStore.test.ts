import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseChart } from '../core/chart'
import { REVIEW_INTERVALS } from '../core/review'
import { actionForRoll, correctActions, mulberry32 } from '../core/trainer'
import { starterChart } from '../data/starterChart'
import { STARTER_ID, TrainerDb, createDexieRepo } from '../db/repo'
import { useTrainer } from './trainerStore'

let n = 0
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
  store().reset(res.chart, mulberry32(7))
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
    expect(store().chart.spots.size).toBe(35)
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
})
