import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../core/settings'
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

  it('lists attempts per chart and all timestamps', async () => {
    const base = { spotKey: 'rfi:CO', hand: 'AA', action: 'raise' as const, correct: true }
    await repo.recordAttempt({ ...base, chartId: 1, ts: 30 }, [], 1)
    await repo.recordAttempt({ ...base, chartId: 2, ts: 10 }, [], 1)
    expect(await repo.listAttempts(1)).toHaveLength(1)
    expect(await repo.attemptTimestamps()).toEqual([10, 30])
  })

  it('stores settings with defaults', async () => {
    expect(await repo.getSettings()).toEqual(DEFAULT_SETTINGS)
    await repo.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 40 })
    expect((await repo.getSettings()).dailyGoal).toBe(40)
  })

  it('stores drawing results per chart, oldest first', async () => {
    await repo.recordDrawing({ chartId: 1, spotKey: 'rfi:CO', score: 90, ts: 2 })
    await repo.recordDrawing({ chartId: 1, spotKey: 'rfi:CO', score: 80, ts: 1 })
    await repo.recordDrawing({ chartId: 2, spotKey: 'rfi:CO', score: 70, ts: 3 })
    expect((await repo.listDrawings(1)).map((d) => d.score)).toEqual([80, 90])
  })
})
