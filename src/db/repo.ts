import Dexie, { type EntityTable } from 'dexie'
import type { Action, ChartFile, SpotKey } from '../core/chart'
import type { Hand } from '../core/hands'
import type { ReviewItem } from '../core/review'
import { sanitizeSettings, type Settings } from '../core/settings'
import { starterChart } from '../data/starterChart'

/** Built-in chart lives in code (always up to date) and is read-only. */
export const STARTER_ID = 0

export interface ChartRecord {
  id: number
  name: string
  file: ChartFile
  updatedAt: number
}

export interface AttemptRecord {
  id?: number
  chartId: number
  spotKey: SpotKey
  hand: Hand
  action: Action
  correct: boolean
  ts: number
}

export interface ReviewRecord extends ReviewItem {
  chartId: number
}

interface MetaRecord {
  key: string
  value: unknown
}

export class TrainerDb extends Dexie {
  charts!: EntityTable<ChartRecord, 'id'>
  attempts!: EntityTable<AttemptRecord, 'id'>
  reviews!: Dexie.Table<ReviewRecord, [number, string, string]>
  meta!: EntityTable<MetaRecord, 'key'>

  constructor(name = 'preflop-trainer') {
    super(name)
    this.version(1).stores({
      charts: '++id, name',
      attempts: '++id, chartId, [chartId+spotKey], ts',
      reviews: '[chartId+spotKey+hand], chartId',
      meta: 'key',
    })
  }
}

export interface ChartSummary {
  id: number
  name: string
  builtin: boolean
  updatedAt: number
}

/** All storage the app needs. The store depends on this interface, not on Dexie. */
export interface Repo {
  listCharts(): Promise<ChartSummary[]>
  getChart(id: number): Promise<ChartFile | undefined>
  /** Creates a chart, or replaces it when `id` is given. Built-in chart cannot be overwritten. */
  saveChart(file: ChartFile, id?: number): Promise<number>
  deleteChart(id: number): Promise<void>
  getActiveChartId(): Promise<number>
  setActiveChartId(id: number): Promise<void>
  /** Saves the attempt, the new review queue and the question counter in one transaction. */
  recordAttempt(attempt: Omit<AttemptRecord, 'id'>, reviews: ReviewItem[], counter: number): Promise<void>
  loadProgress(chartId: number): Promise<{ reviews: ReviewItem[]; counter: number }>
  listAttempts(chartId: number): Promise<AttemptRecord[]>
  /** Timestamps of all attempts across charts (daily goal, streak). */
  attemptTimestamps(): Promise<number[]>
  getSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<void>
}

const counterKey = (chartId: number) => `counter:${chartId}`

export function createDexieRepo(db = new TrainerDb()): Repo {
  return {
    async listCharts() {
      const own = await db.charts.orderBy('name').toArray()
      return [
        { id: STARTER_ID, name: starterChart.name, builtin: true, updatedAt: 0 },
        ...own.map((c) => ({ id: c.id, name: c.name, builtin: false, updatedAt: c.updatedAt })),
      ]
    },

    async getChart(id) {
      if (id === STARTER_ID) return starterChart
      return (await db.charts.get(id))?.file
    },

    async saveChart(file, id) {
      if (id === STARTER_ID) throw new Error('Built-in chart is read-only')
      const record = { name: file.name, file, updatedAt: Date.now() }
      if (id === undefined) return db.charts.add(record as ChartRecord)
      await db.charts.put({ ...record, id })
      return id
    },

    async deleteChart(id) {
      if (id === STARTER_ID) throw new Error('Built-in chart cannot be deleted')
      await db.transaction('rw', [db.charts, db.attempts, db.reviews, db.meta], async () => {
        await db.charts.delete(id)
        await db.attempts.where('chartId').equals(id).delete()
        await db.reviews.where('chartId').equals(id).delete()
        await db.meta.delete(counterKey(id))
        const active = await db.meta.get('activeChartId')
        if (active?.value === id) await db.meta.put({ key: 'activeChartId', value: STARTER_ID })
      })
    },

    async getActiveChartId() {
      const value = (await db.meta.get('activeChartId'))?.value
      if (typeof value !== 'number') return STARTER_ID
      if (value !== STARTER_ID && !(await db.charts.get(value))) return STARTER_ID
      return value
    },

    async setActiveChartId(id) {
      await db.meta.put({ key: 'activeChartId', value: id })
    },

    async recordAttempt(attempt, reviews, counter) {
      const { chartId } = attempt
      await db.transaction('rw', [db.attempts, db.reviews, db.meta], async () => {
        await db.attempts.add(attempt)
        await db.reviews.where('chartId').equals(chartId).delete()
        await db.reviews.bulkAdd(reviews.map((r) => ({ ...r, chartId })))
        await db.meta.put({ key: counterKey(chartId), value: counter })
      })
    },

    async loadProgress(chartId) {
      const [rows, counter] = await Promise.all([
        db.reviews.where('chartId').equals(chartId).toArray(),
        db.meta.get(counterKey(chartId)),
      ])
      return {
        reviews: rows.map(({ spotKey, hand, box, due }) => ({ spotKey, hand, box, due })),
        counter: typeof counter?.value === 'number' ? counter.value : 0,
      }
    },

    async listAttempts(chartId) {
      return db.attempts.where('chartId').equals(chartId).toArray()
    },

    async attemptTimestamps() {
      return (await db.attempts.orderBy('ts').keys()) as number[]
    },

    async getSettings() {
      return sanitizeSettings((await db.meta.get('settings'))?.value)
    },

    async saveSettings(settings) {
      await db.meta.put({ key: 'settings', value: settings })
    },
  }
}
