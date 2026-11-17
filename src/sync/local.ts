import { sanitizeSettings, syncedPart, withDeviceFields } from '../core/settings'
import {
  deleteChartData,
  isBuiltin,
  type ChartId,
  type ChartRecord,
  type OutboxRecord,
  type SyncState,
  type TrainerDb,
} from '../db/repo'
import { emptyChanges, type Applied, type Changes } from './types'

/** The device side of sync: reads the outbox and applies cloud changes without queuing them back. */

export async function getSyncState(db: TrainerDb): Promise<SyncState | null> {
  const v = (await db.meta.get('sync'))?.value as SyncState | undefined
  return v && typeof v.uid === 'string' ? v : null
}

export async function setCursor(db: TrainerDb, uid: string, cursor: number) {
  await db.transaction('rw', db.meta, async () => {
    const s = await getSyncState(db)
    if (s?.uid === uid) await db.meta.put({ key: 'sync', value: { uid, cursor } })
  })
}

/** Signed out: stop queuing, local data stays. */
export async function stopSync(db: TrainerDb) {
  await db.transaction('rw', db.meta, db.outbox, async () => {
    await db.meta.delete('sync')
    await db.outbox.clear()
  })
}

/** Current values of everything queued, deduped. `seqs` are acknowledged after a successful push. */
export async function collectOutbox(db: TrainerDb): Promise<{ changes: Changes; seqs: number[] }> {
  return db.transaction('r', [db.outbox, db.ownCharts, db.progress, db.meta, db.attempts, db.drawings], async () => {
    const rows = await db.outbox.toArray()
    const keys = (kind: OutboxRecord['kind']) => [...new Set(rows.filter((r) => r.kind === kind).map((r) => r.key))]
    const changes = emptyChanges()
    const charts = await db.ownCharts.bulkGet(keys('chart') as string[])
    changes.charts = charts.filter((c): c is ChartRecord => !!c)
    changes.progress = (await db.progress.bulkGet(keys('progress'))).filter((p) => !!p)
    changes.attempts = (await db.attempts.where('gid').anyOf(keys('attempt') as string[]).toArray()).map(withoutId)
    changes.drawings = (await db.drawings.where('gid').anyOf(keys('drawing') as string[]).toArray()).map(withoutId)
    if (keys('settings').length) {
      const row = await db.meta.get('settings')
      changes.settings = { settings: syncedPart(sanitizeSettings(row?.value)), updatedAt: row?.updatedAt ?? 0 }
    }
    return { changes, seqs: rows.map((r) => r.seq!) }
  })
}

export async function ackOutbox(db: TrainerDb, seqs: number[]) {
  await db.outbox.bulkDelete(seqs)
}

function withoutId<T extends { id?: number }>(row: T): Omit<T, 'id'> {
  const rest = { ...row }
  delete rest.id
  return rest
}

/** "Name" → "Name (2)", "Name (3)"… until it is not taken. */
export function uniqueName(name: string, taken: Set<string>): string {
  for (let i = 2; ; i++) {
    const candidate = `${name} (${i})`
    if (!taken.has(candidate)) return candidate
  }
}

/**
 * Applies cloud changes on this device.
 * `merge` (first sync after signing in) also: renames own charts whose name a different cloud chart already has,
 * takes the cloud settings when there are any, and queues everything the cloud lacks.
 */
export async function applyRemote(db: TrainerDb, remote: Changes, { merge = false, now = Date.now } = {}): Promise<Applied> {
  const applied: Applied = { settings: false, charts: [], progress: [], attempts: 0, drawings: 0 }
  const tables = [db.ownCharts, db.progress, db.meta, db.attempts, db.drawings, db.outbox]
  await db.transaction('rw', tables, async () => {
    const queue: OutboxRecord[] = []

    // Charts
    if (merge) {
      const remoteIds = new Set(remote.charts.map((c) => c.id))
      const taken = new Set(remote.charts.filter((c) => !c.deleted).map((c) => c.name))
      for (const c of await db.ownCharts.toArray()) {
        if (c.deleted || remoteIds.has(c.id)) continue
        if (taken.has(c.name)) {
          const name = uniqueName(c.name, taken)
          await db.ownCharts.put({ ...c, name, file: { ...c.file, name }, updatedAt: now() })
          applied.charts.push(c.id)
          taken.add(name)
        } else taken.add(c.name)
      }
    }
    for (const r of remote.charts) {
      const local = await db.ownCharts.get(r.id)
      if (local && local.updatedAt >= r.updatedAt) continue
      if (!local && r.deleted) continue
      await db.ownCharts.put(r)
      if (r.deleted) await deleteChartData(db, r.id)
      applied.charts.push(r.id)
    }
    const live = async (id: ChartId) => {
      if (isBuiltin(id)) return true
      const c = await db.ownCharts.get(id)
      return !!c && !c.deleted
    }

    // Progress
    for (const r of remote.progress) {
      if (!(await live(r.chartId))) continue
      const local = await db.progress.get(r.chartId)
      if (local && local.updatedAt >= r.updatedAt) continue
      await db.progress.put(r)
      applied.progress.push(r.chartId)
    }

    // Settings
    if (remote.settings) {
      const row = await db.meta.get('settings')
      if (merge || (row?.updatedAt ?? 0) < remote.settings.updatedAt) {
        const value = withDeviceFields(remote.settings.settings, sanitizeSettings(row?.value))
        await db.meta.put({ key: 'settings', value, updatedAt: remote.settings.updatedAt })
        applied.settings = true
      }
    }

    // Attempts and drawings: add what is new, skip charts deleted here
    const attemptGids = new Set((await db.attempts.orderBy('gid').keys()) as string[])
    const newAttempts = []
    for (const a of remote.attempts) if (!attemptGids.has(a.gid) && (await live(a.chartId))) newAttempts.push(a)
    await db.attempts.bulkAdd(newAttempts)
    applied.attempts = newAttempts.length

    const drawingGids = new Set((await db.drawings.orderBy('gid').keys()) as string[])
    const newDrawings = []
    for (const d of remote.drawings) if (!drawingGids.has(d.gid) && (await live(d.chartId))) newDrawings.push(d)
    await db.drawings.bulkAdd(newDrawings)
    applied.drawings = newDrawings.length

    if (merge) {
      const remoteCharts = new Map(remote.charts.map((c) => [c.id, c]))
      for (const c of await db.ownCharts.toArray()) {
        const r = remoteCharts.get(c.id)
        if (!r || c.updatedAt > r.updatedAt) queue.push({ kind: 'chart', key: c.id })
      }
      const remoteProgress = new Map(remote.progress.map((p) => [p.chartId, p]))
      for (const p of await db.progress.toArray()) {
        const r = remoteProgress.get(p.chartId)
        if (!r || p.updatedAt > r.updatedAt) queue.push({ kind: 'progress', key: p.chartId })
      }
      if (!remote.settings) {
        const row = await db.meta.get('settings')
        await db.meta.put({ key: 'settings', value: sanitizeSettings(row?.value), updatedAt: row?.updatedAt ?? now() })
        queue.push({ kind: 'settings', key: 'settings' })
      }
      const cloudAttempts = new Set(remote.attempts.map((a) => a.gid))
      for (const gid of (await db.attempts.orderBy('gid').keys()) as string[])
        if (!cloudAttempts.has(gid)) queue.push({ kind: 'attempt', key: gid })
      const cloudDrawings = new Set(remote.drawings.map((d) => d.gid))
      for (const gid of (await db.drawings.orderBy('gid').keys()) as string[])
        if (!cloudDrawings.has(gid)) queue.push({ kind: 'drawing', key: gid })
      await db.outbox.clear()
      await db.outbox.bulkAdd(queue)
    }
  })
  return applied
}
