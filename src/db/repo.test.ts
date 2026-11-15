import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { starterChart } from '../data/starterChart'
import { STARTER_ID, TrainerDb, createDexieRepo, type Repo } from './repo'

let repo: Repo
let n = 0

beforeEach(() => {
  repo = createDexieRepo(new TrainerDb(`test-${n++}`))
})

const myChart = { ...starterChart, name: 'Мой чарт' }

describe('Dexie repo', () => {
  it('always lists the built-in starter chart first', async () => {
    const list = await repo.listCharts()
    expect(list[0]).toMatchObject({ id: STARTER_ID, builtin: true })
    expect(await repo.getChart(STARTER_ID)).toBe(starterChart)
  })

  it('saves, updates and lists own charts', async () => {
    const id = await repo.saveChart(myChart)
    expect(id).toBeGreaterThan(0)
    await repo.saveChart({ ...myChart, name: 'Переименован' }, id)
    const list = await repo.listCharts()
    expect(list.map((c) => c.name)).toEqual([starterChart.name, 'Переименован'])
    expect((await repo.getChart(id))?.name).toBe('Переименован')
  })

  it('refuses to overwrite or delete the built-in chart', async () => {
    await expect(repo.saveChart(myChart, STARTER_ID)).rejects.toThrow()
    await expect(repo.deleteChart(STARTER_ID)).rejects.toThrow()
  })

  it('falls back to the starter when the active chart is missing or deleted', async () => {
    expect(await repo.getActiveChartId()).toBe(STARTER_ID)
    const id = await repo.saveChart(myChart)
    await repo.setActiveChartId(id)
    expect(await repo.getActiveChartId()).toBe(id)
    await repo.deleteChart(id)
    expect(await repo.getActiveChartId()).toBe(STARTER_ID)
  })

  it('stores attempts with review queue and counter per chart', async () => {
    const review = { spotKey: 'rfi:CO', hand: 'K9o', box: 0, due: 4 }
    await repo.recordAttempt(
      { chartId: STARTER_ID, spotKey: 'rfi:CO', hand: 'K9o', action: 'fold', correct: false, ts: 1 },
      [review],
      1,
    )
    expect(await repo.loadProgress(STARTER_ID)).toEqual({ reviews: [review], counter: 1 })
    expect(await repo.loadProgress(99)).toEqual({ reviews: [], counter: 0 })

    await repo.recordAttempt(
      { chartId: STARTER_ID, spotKey: 'rfi:CO', hand: 'K9o', action: 'raise', correct: true, ts: 2 },
      [],
      2,
    )
    expect(await repo.loadProgress(STARTER_ID)).toEqual({ reviews: [], counter: 2 })
  })
})
