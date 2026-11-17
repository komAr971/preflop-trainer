import Dexie, { type EntityTable } from 'dexie'
import type { Action, ChartFile, SpotKey } from '../core/chart'
import type { Hand } from '../core/hands'
import type { ReviewItem } from '../core/review'
import { sanitizeSettings, type Settings } from '../core/settings'
import { greenlineRfiTight, greenlineRfiWide, greenlineStandard } from '../data/greenline2026'
import { starterChart } from '../data/starterChart'

/** Built-in charts live in code (always up to date), are read-only and use ids ≤ 0. */
export const STARTER_ID = 0

export const BUILTIN_CHARTS: { id: number; file: ChartFile }[] = [
  { id: STARTER_ID, file: starterChart },
  { id: -1, file: greenlineStandard },
  { id: -2, file: greenlineRfiTight },
  { id: -3, file: greenlineRfiWide },
]

export const isBuiltin = (id: number): boolean => id <= 0
const builtin = (id: number) => BUILTIN_CHARTS.find((c) => c.id === id)

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
  /** null when the time ran out. */
  action: Action | null
  correct: boolean
  ts: number
  /** Decision time; missing in attempts saved before the timer existed. */
  answerMs?: number
  timedOut?: boolean
}

export interface ReviewRecord extends ReviewItem {
  chartId: number
}

export interface DrawingRecord {
  id?: number
  chartId: number
  spotKey: SpotKey
  /** Combo-weighted % correct. */
  score: number
  ts: number
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
  drawings!: EntityTable<DrawingRecord, 'id'>

  constructor(name = 'preflop-trainer') {
    super(name)
    this.version(1).stores({
      charts: '++id, name',
      attempts: '++id, chartId, [chartId+spotKey], ts',
      reviews: '[chartId+spotKey+hand], chartId',
      meta: 'key',
    })
    this.version(2).stores({
      drawings: '++id, chartId, ts',
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
  recordDrawing(drawing: Omit<DrawingRecord, 'id'>): Promise<void>
  listDrawings(chartId: number): Promise<DrawingRecord[]>
  getSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<void>
}

const counterKey = (chartId: number) => `counter:${chartId}`

export function createDexieRepo(db = new TrainerDb()): Repo {
  return {
    async listCharts() {
      const own = await db.charts.orderBy('name').toArray()
      return [
        ...BUILTIN_CHARTS.map((c) => ({ id: c.id, name: c.file.name, builtin: true, updatedAt: 0 })),
        ...own.map((c) => ({ id: c.id, name: c.name, builtin: false, updatedAt: c.updatedAt })),
      ]
    },

    async getChart(id) {
      if (isBuiltin(id)) return builtin(id)?.file
      return (await db.charts.get(id))?.file
    },

    async saveChart(file, id) {
      if (id !== undefined && isBuiltin(id)) throw new Error('Built-in chart is read-only')
      const record = { name: file.name, file, updatedAt: Date.now() }
      if (id === undefined) return db.charts.add(record as ChartRecord)
      await db.charts.put({ ...record, id })
      return id
    },

    async deleteChart(id) {
      if (isBuiltin(id)) throw new Error('Built-in chart cannot be deleted')
      await db.transaction('rw', [db.charts, db.attempts, db.reviews, db.meta, db.drawings], async () => {
        await db.charts.delete(id)
        await db.drawings.where('chartId').equals(id).delete()
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
      if (isBuiltin(value)) return builtin(value) ? value : STARTER_ID
      if (!(await db.charts.get(value))) return STARTER_ID
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

    async recordDrawing(drawing) {
      await db.drawings.add(drawing)
    },

    async listDrawings(chartId) {
      return db.drawings.where('chartId').equals(chartId).sortBy('ts')
    },

    async getSettings() {
      return sanitizeSettings((await db.meta.get('settings'))?.value)
    },

    async saveSettings(settings) {
      await db.meta.put({ key: 'settings', value: settings })
    },
  }
}
