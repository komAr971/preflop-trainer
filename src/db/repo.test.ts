import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../core/settings'
import { starterChart } from '../data/starterChart'
import Dexie from 'dexie'
import { BUILTIN_CHARTS, STARTER_ID, TrainerDb, createDexieRepo, type Repo } from './repo'

let db: TrainerDb
let repo: Repo
let n = 0

beforeEach(() => {
  db = new TrainerDb(`test-${n++}`)
  repo = createDexieRepo(db)
})

const UUID = /^[0-9a-f-]{36}$/

const myChart = { ...starterChart, name: 'Мой чарт' }

describe('Dexie repo', () => {
  it('always lists the built-in starter chart first', async () => {
    const list = await repo.listCharts()
    expect(list[0]).toMatchObject({ id: STARTER_ID, builtin: true })
    expect(await repo.getChart(STARTER_ID)).toBe(starterChart)
  })

  it('saves, updates and lists own charts', async () => {
    const id = await repo.saveChart(myChart)
    expect(id).toMatch(UUID)
    await repo.saveChart({ ...myChart, name: 'Переименован' }, id)
    const list = await repo.listCharts()
    expect(list.filter((c) => !c.builtin).map((c) => c.name)).toEqual(['Переименован'])
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
    expect(await repo.loadProgress('missing')).toEqual({ reviews: [], counter: 0 })

    await repo.recordAttempt(
      { chartId: STARTER_ID, spotKey: 'rfi:CO', hand: 'K9o', action: 'raise', correct: true, ts: 2 },
      [],
      2,
    )
    expect(await repo.loadProgress(STARTER_ID)).toEqual({ reviews: [], counter: 2 })
  })

  it('lists attempts per chart and all timestamps', async () => {
    const base = { spotKey: 'rfi:CO', hand: 'AA', action: 'raise' as const, correct: true }
    await repo.recordAttempt({ ...base, chartId: 'a', ts: 30 }, [], 1)
    await repo.recordAttempt({ ...base, chartId: -1, ts: 10 }, [], 1)
    expect(await repo.listAttempts('a')).toHaveLength(1)
    expect((await repo.listAttempts('a'))[0].gid).toMatch(UUID)
    expect(await repo.attemptTimestamps()).toEqual([10, 30])
  })

  it('stores settings with defaults', async () => {
    expect(await repo.getSettings()).toEqual(DEFAULT_SETTINGS)
    await repo.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 40 })
    expect((await repo.getSettings()).dailyGoal).toBe(40)
  })

  it('stores drawing results per chart, oldest first', async () => {
    await repo.recordDrawing({ chartId: 'a', spotKey: 'rfi:CO', score: 90, ts: 2 })
    await repo.recordDrawing({ chartId: 'a', spotKey: 'rfi:CO', score: 80, ts: 1 })
    await repo.recordDrawing({ chartId: 'b', spotKey: 'rfi:CO', score: 70, ts: 3 })
    expect((await repo.listDrawings('a')).map((d) => d.score)).toEqual([80, 90])
  })

  it('ships the Greenline charts as read-only built-ins that can be activated', async () => {
    const list = await repo.listCharts()
    expect(list.filter((c) => c.builtin).map((c) => c.id)).toEqual(BUILTIN_CHARTS.map((c) => c.id))
    expect((await repo.getChart(-1))?.name).toMatch(/Greenline/)
    await expect(repo.saveChart(starterChart, -1)).rejects.toThrow()
    await repo.setActiveChartId(-1)
    expect(await repo.getActiveChartId()).toBe(-1)
    await repo.setActiveChartId(-99)
    expect(await repo.getActiveChartId()).toBe(STARTER_ID)
  })

  it('deletes own charts with their data, leaving a tombstone for sync', async () => {
    const id = await repo.saveChart(myChart)
    const base = { spotKey: 'rfi:CO', hand: 'AA', action: 'raise' as const, correct: true, ts: 1 }
    await repo.recordAttempt({ ...base, chartId: id }, [{ spotKey: 'rfi:CO', hand: 'AA', box: 0, due: 3 }], 1)
    await repo.recordDrawing({ chartId: id, spotKey: 'rfi:CO', score: 50, ts: 1 })
    await repo.deleteChart(id)
    expect(await repo.getChart(id)).toBeUndefined()
    expect((await repo.listCharts()).some((c) => c.id === id)).toBe(false)
    expect(await repo.listAttempts(id)).toEqual([])
    expect(await repo.listDrawings(id)).toEqual([])
    expect(await repo.loadProgress(id)).toEqual({ reviews: [], counter: 0 })
    expect(await db.ownCharts.get(id)).toMatchObject({ deleted: true })
  })
})

describe('outbox', () => {
  const attempt = { chartId: STARTER_ID, spotKey: 'rfi:CO', hand: 'AA', action: 'raise' as const, correct: true, ts: 1 }

  it('stays empty while signed out', async () => {
    await repo.saveChart(myChart)
    await repo.recordAttempt(attempt, [], 1)
    await repo.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 40 })
    expect(await db.outbox.count()).toBe(0)
  })

  it('queues every synced change while signed in and reports it', async () => {
    let calls = 0
    repo = createDexieRepo(db, { onLocalChange: () => calls++ })
    await db.meta.put({ key: 'sync', value: { uid: 'u1', cursor: 0 } })
    const id = await repo.saveChart(myChart)
    await repo.recordAttempt(attempt, [], 1)
    await repo.recordDrawing({ chartId: STARTER_ID, spotKey: 'rfi:CO', score: 50, ts: 1 })
    await repo.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 40 })
    await repo.deleteChart(id)
    const kinds = (await db.outbox.toArray()).map((o) => o.kind)
    expect(kinds).toEqual(['chart', 'attempt', 'progress', 'drawing', 'settings', 'chart'])
    expect(calls).toBe(5)
  })

  it('does not queue device-only settings changes', async () => {
    await repo.saveSettings(DEFAULT_SETTINGS)
    await db.meta.put({ key: 'sync', value: { uid: 'u1', cursor: 0 } })
    await repo.saveSettings({ ...DEFAULT_SETTINGS, volume: 0.1, tables: 3 })
    expect(await db.outbox.count()).toBe(0)
    expect(await repo.getSettings()).toMatchObject({ volume: 0.1, tables: 3 })
  })
})

describe('migration to UUID chart ids', () => {
  it('moves own charts to UUIDs and remaps everything that points at them', async () => {
    const name = `old-${n++}`
    const old = new Dexie(name)
    old.version(2).stores({
      charts: '++id, name',
      attempts: '++id, chartId, [chartId+spotKey], ts',
      reviews: '[chartId+spotKey+hand], chartId',
      meta: 'key',
      drawings: '++id, chartId, ts',
    })
    await old.open()
    const a = (await old.table('charts').add({ name: 'A', file: myChart, updatedAt: 5 })) as number
    const b = (await old.table('charts').add({ name: 'B', file: myChart, updatedAt: 6 })) as number
    const att = { spotKey: 'rfi:CO', hand: 'AA', action: 'raise', correct: true, ts: 1 }
    await old.table('attempts').bulkAdd([{ ...att, chartId: a }, { ...att, chartId: STARTER_ID }, { ...att, chartId: -1 }])
    await old.table('reviews').bulkAdd([
      { chartId: a, spotKey: 'rfi:CO', hand: 'AA', box: 1, due: 9 },
      { chartId: STARTER_ID, spotKey: 'rfi:BTN', hand: 'K9o', box: 0, due: 4 },
    ])
    await old.table('drawings').add({ chartId: b, spotKey: 'rfi:CO', score: 70, ts: 1 })
    await old.table('meta').bulkPut([
      { key: `counter:${a}`, value: 12 },
      { key: `counter:${STARTER_ID}`, value: 3 },
      { key: 'activeChartId', value: b },
      { key: 'settings', value: { ...DEFAULT_SETTINGS, dailyGoal: 77 } },
    ])
    old.close()

    const migrated = new TrainerDb(name)
    const r = createDexieRepo(migrated)
    const own = (await r.listCharts()).filter((c) => !c.builtin)
    expect(own.map((c) => c.name)).toEqual(['A', 'B'])
    const [idA, idB] = own.map((c) => c.id)
    expect(idA).toMatch(UUID)
    expect(await r.getChart(idA)).toEqual(myChart)
    expect(await r.getActiveChartId()).toBe(idB)
    expect(await r.listAttempts(idA)).toHaveLength(1)
    expect(await r.listAttempts(STARTER_ID)).toHaveLength(1)
    expect(await r.listAttempts(-1)).toHaveLength(1)
    expect(new Set((await migrated.attempts.toArray()).map((x) => x.gid)).size).toBe(3)
    expect(await r.loadProgress(idA)).toEqual({ reviews: [{ spotKey: 'rfi:CO', hand: 'AA', box: 1, due: 9 }], counter: 12 })
    expect(await r.loadProgress(STARTER_ID)).toEqual({ reviews: [{ spotKey: 'rfi:BTN', hand: 'K9o', box: 0, due: 4 }], counter: 3 })
    expect((await r.listDrawings(idB))[0]).toMatchObject({ score: 70, gid: expect.stringMatching(UUID) })
    expect((await r.getSettings()).dailyGoal).toBe(77)
    expect(await migrated.meta.get(`counter:${a}`)).toBeUndefined()
  })
})
