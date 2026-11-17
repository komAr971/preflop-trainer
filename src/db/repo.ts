import Dexie, { type EntityTable, type Transaction } from 'dexie'
import type { Action, ChartFile, SpotKey } from '../core/chart'
import type { Hand } from '../core/hands'
import type { ReviewItem } from '../core/review'
import { sanitizeSettings, syncedSettingsEqual, type Settings } from '../core/settings'
import { greenlineRfiTight, greenlineRfiWide, greenlineStandard } from '../data/greenline2026'
import { starterChart } from '../data/starterChart'

/**
 * Built-in charts live in code (always up to date), are read-only and use numeric ids ≤ 0.
 * Own charts use UUID strings, so they stay unique across devices when synced.
 */
export type ChartId = number | string

export const STARTER_ID = 0

export const BUILTIN_CHARTS: { id: number; file: ChartFile }[] = [
  { id: STARTER_ID, file: starterChart },
  { id: -1, file: greenlineStandard },
  { id: -2, file: greenlineRfiTight },
  { id: -3, file: greenlineRfiWide },
]

export const isBuiltin = (id: ChartId): id is number => typeof id === 'number'
const builtin = (id: number) => BUILTIN_CHARTS.find((c) => c.id === id)

export const newId = (): string => crypto.randomUUID()

export interface ChartRecord {
  id: string
  name: string
  file: ChartFile
  updatedAt: number
  /** Tombstone: kept so the deletion reaches other devices. */
  deleted?: boolean
}

export interface AttemptRecord {
  id?: number
  /** Global id: dedupes attempts merged from other devices. */
  gid: string
  chartId: ChartId
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

export interface ProgressRecord {
  chartId: ChartId
  reviews: ReviewItem[]
  /** Questions answered with this chart (drives the review queue). */
  counter: number
  updatedAt: number
}

export interface DrawingRecord {
  id?: number
  gid: string
  chartId: ChartId
  spotKey: SpotKey
  /** Combo-weighted % correct. */
  score: number
  ts: number
}

export interface MetaRecord {
  key: string
  value: unknown
  updatedAt?: number
}

/** What changed locally and still has to reach the cloud. `key`: gid, chart id or 'settings'. */
export type OutboxKind = 'attempt' | 'drawing' | 'chart' | 'progress' | 'settings'
export interface OutboxRecord {
  seq?: number
  kind: OutboxKind
  key: ChartId
}

/** Present while signed in: local changes are queued in the outbox. */
export interface SyncState {
  uid: string
  /** Server time (ms) of the newest cloud change already pulled. */
  cursor: number
}

export class TrainerDb extends Dexie {
  ownCharts!: EntityTable<ChartRecord, 'id'>
  attempts!: EntityTable<AttemptRecord, 'id'>
  progress!: EntityTable<ProgressRecord, 'chartId'>
  meta!: EntityTable<MetaRecord, 'key'>
  drawings!: EntityTable<DrawingRecord, 'id'>
  outbox!: EntityTable<OutboxRecord, 'seq'>

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
    // Own charts get UUIDs; the review queue and counter move into one progress row per chart.
    this.version(3)
      .stores({
        ownCharts: 'id, name',
        progress: 'chartId',
        attempts: '++id, &gid, chartId, [chartId+spotKey], ts',
        drawings: '++id, &gid, chartId, ts',
        outbox: '++seq',
      })
      .upgrade(migrateToUuids)
    this.version(4).stores({ charts: null, reviews: null })
  }
}

interface OldChart {
  id: number
  name: string
  file: ChartFile
  updatedAt: number
}
interface OldReview extends ReviewItem {
  chartId: number
}

async function migrateToUuids(tx: Transaction) {
  const ids = new Map<number, string>()
  const old = (await tx.table('charts').toArray()) as OldChart[]
  for (const c of old) ids.set(c.id, newId())
  await tx.table('ownCharts').bulkAdd(old.map((c) => ({ ...c, id: ids.get(c.id)! })))
  const map = (id: number): ChartId => ids.get(id) ?? id

  await tx.table('attempts').toCollection().modify((a: AttemptRecord) => {
    a.chartId = map(a.chartId as number)
    a.gid = newId()
  })
  await tx.table('drawings').toCollection().modify((d: DrawingRecord) => {
    d.chartId = map(d.chartId as number)
    d.gid = newId()
  })

  const reviews = (await tx.table('reviews').toArray()) as OldReview[]
  const counters = (await tx.table('meta').where('key').startsWith('counter:').toArray()) as MetaRecord[]
  const progress = new Map<ChartId, ProgressRecord>()
  const row = (chartId: ChartId) => {
    if (!progress.has(chartId)) progress.set(chartId, { chartId, reviews: [], counter: 0, updatedAt: Date.now() })
    return progress.get(chartId)!
  }
  for (const { chartId, ...item } of reviews) row(map(chartId)).reviews.push(item)
  for (const c of counters) {
    const chartId = Number(c.key.slice('counter:'.length))
    if (typeof c.value === 'number' && Number.isInteger(chartId)) row(map(chartId)).counter = c.value
  }
  await tx.table('progress').bulkAdd([...progress.values()])
  await tx.table('meta').bulkDelete(counters.map((c) => c.key))

  const active = (await tx.table('meta').get('activeChartId')) as MetaRecord | undefined
  if (typeof active?.value === 'number') await tx.table('meta').put({ key: 'activeChartId', value: map(active.value) })
}

export interface ChartSummary {
  id: ChartId
  name: string
  builtin: boolean
  updatedAt: number
}

/** All storage the app needs. The store depends on this interface, not on Dexie. */
export interface Repo {
  listCharts(): Promise<ChartSummary[]>
  getChart(id: ChartId): Promise<ChartFile | undefined>
  /** Creates a chart, or replaces it when `id` is given. Built-in charts cannot be overwritten. */
  saveChart(file: ChartFile, id?: ChartId): Promise<string>
  deleteChart(id: ChartId): Promise<void>
  getActiveChartId(): Promise<ChartId>
  setActiveChartId(id: ChartId): Promise<void>
  /** Saves the attempt, the new review queue and the question counter in one transaction. */
  recordAttempt(attempt: Omit<AttemptRecord, 'id' | 'gid'>, reviews: ReviewItem[], counter: number): Promise<void>
  loadProgress(chartId: ChartId): Promise<{ reviews: ReviewItem[]; counter: number }>
  listAttempts(chartId: ChartId): Promise<AttemptRecord[]>
  /** Timestamps of all attempts across charts (daily goal, streak). */
  attemptTimestamps(): Promise<number[]>
  recordDrawing(drawing: Omit<DrawingRecord, 'id' | 'gid'>): Promise<void>
  listDrawings(chartId: ChartId): Promise<DrawingRecord[]>
  getSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<void>
}

export interface RepoOptions {
  /** Called after a change was queued for the cloud (sync is on). */
  onLocalChange?: () => void
  now?: () => number
}

export function createDexieRepo(db = new TrainerDb(), { onLocalChange, now = Date.now }: RepoOptions = {}): Repo {
  /** Queues changes for the cloud while signed in. Call inside a transaction that includes meta and outbox. */
  const enqueue = async (...items: OutboxRecord[]) => {
    if (!(await db.meta.get('sync'))) return false
    await db.outbox.bulkAdd(items)
    return true
  }
  const notify = (queued: boolean) => {
    if (queued) onLocalChange?.()
  }

  const ownChart = async (id: ChartId) => {
    if (isBuiltin(id)) return undefined
    const c = await db.ownCharts.get(id)
    return c && !c.deleted ? c : undefined
  }

  return {
    async listCharts() {
      const own = (await db.ownCharts.orderBy('name').toArray()).filter((c) => !c.deleted)
      return [
        ...BUILTIN_CHARTS.map((c) => ({ id: c.id, name: c.file.name, builtin: true, updatedAt: 0 })),
        ...own.map((c) => ({ id: c.id, name: c.name, builtin: false, updatedAt: c.updatedAt })),
      ]
    },

    async getChart(id) {
      if (isBuiltin(id)) return builtin(id)?.file
      return (await ownChart(id))?.file
    },

    async saveChart(file, id) {
      if (id !== undefined && isBuiltin(id)) throw new Error('Built-in chart is read-only')
      const chartId = id ?? newId()
      const queued = await db.transaction('rw', [db.ownCharts, db.meta, db.outbox], async () => {
        await db.ownCharts.put({ id: chartId, name: file.name, file, updatedAt: now() })
        return enqueue({ kind: 'chart', key: chartId })
      })
      notify(queued)
      return chartId
    },

    async deleteChart(id) {
      if (isBuiltin(id)) throw new Error('Built-in chart cannot be deleted')
      const queued = await db.transaction('rw', [db.ownCharts, db.attempts, db.progress, db.meta, db.drawings, db.outbox], async () => {
        const c = await db.ownCharts.get(id)
        if (!c) return false
        await db.ownCharts.put({ ...c, deleted: true, updatedAt: now() })
        await deleteChartData(db, id)
        return enqueue({ kind: 'chart', key: id })
      })
      notify(queued)
    },

    async getActiveChartId() {
      const value = (await db.meta.get('activeChartId'))?.value
      if (typeof value === 'number') return builtin(value) ? value : STARTER_ID
      if (typeof value === 'string' && (await ownChart(value))) return value
      return STARTER_ID
    },

    async setActiveChartId(id) {
      await db.meta.put({ key: 'activeChartId', value: id })
    },

    async recordAttempt(attempt, reviews, counter) {
      const { chartId } = attempt
      const gid = newId()
      const queued = await db.transaction('rw', [db.attempts, db.progress, db.meta, db.outbox], async () => {
        await db.attempts.add({ ...attempt, gid })
        await db.progress.put({ chartId, reviews, counter, updatedAt: now() })
        return enqueue({ kind: 'attempt', key: gid }, { kind: 'progress', key: chartId })
      })
      notify(queued)
    },

    async loadProgress(chartId) {
      const row = await db.progress.get(chartId)
      return { reviews: row?.reviews ?? [], counter: row?.counter ?? 0 }
    },

    async listAttempts(chartId) {
      return db.attempts.where('chartId').equals(chartId).toArray()
    },

    async attemptTimestamps() {
      return (await db.attempts.orderBy('ts').keys()) as number[]
    },

    async recordDrawing(drawing) {
      const gid = newId()
      const queued = await db.transaction('rw', [db.drawings, db.meta, db.outbox], async () => {
        await db.drawings.add({ ...drawing, gid })
        return enqueue({ kind: 'drawing', key: gid })
      })
      notify(queued)
    },

    async listDrawings(chartId) {
      return db.drawings.where('chartId').equals(chartId).sortBy('ts')
    },

    async getSettings() {
      return sanitizeSettings((await db.meta.get('settings'))?.value)
    },

    async saveSettings(settings) {
      const queued = await db.transaction('rw', [db.meta, db.outbox], async () => {
        const prev = await db.meta.get('settings')
        // Device-only fields (volume, tables) do not count as a change for the cloud.
        if (prev?.updatedAt !== undefined && syncedSettingsEqual(sanitizeSettings(prev.value), settings)) {
          await db.meta.put({ ...prev, value: settings })
          return false
        }
        await db.meta.put({ key: 'settings', value: settings, updatedAt: now() })
        return enqueue({ kind: 'settings', key: 'settings' })
      })
      notify(queued)
    },
  }
}

/** Removes everything recorded for a chart on this device (the chart row itself is handled by the caller). */
export async function deleteChartData(db: TrainerDb, id: ChartId) {
  await db.drawings.where('chartId').equals(id).delete()
  await db.attempts.where('chartId').equals(id).delete()
  await db.progress.delete(id)
  const active = await db.meta.get('activeChartId')
  if (active?.value === id) await db.meta.put({ key: 'activeChartId', value: STARTER_ID })
}
