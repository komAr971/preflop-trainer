import type { SyncedSettings } from '../core/settings'
import type { AttemptRecord, ChartId, ChartRecord, DrawingRecord, ProgressRecord } from '../db/repo'

export type CloudAttempt = Omit<AttemptRecord, 'id'>
export type CloudDrawing = Omit<DrawingRecord, 'id'>

export interface CloudSettings {
  settings: SyncedSettings
  updatedAt: number
}

/**
 * A set of documents going to or coming from the cloud.
 * Charts, progress and settings: last write wins by `updatedAt`. Attempts and drawings: append-only, deduped by `gid`.
 */
export interface Changes {
  charts: ChartRecord[]
  progress: ProgressRecord[]
  settings: CloudSettings | null
  attempts: CloudAttempt[]
  drawings: CloudDrawing[]
}

export const emptyChanges = (): Changes => ({ charts: [], progress: [], settings: null, attempts: [], drawings: [] })

export const isEmpty = (c: Changes) =>
  !c.charts.length && !c.progress.length && !c.settings && !c.attempts.length && !c.drawings.length

/** The cloud store, one private space per user. */
export interface Remote {
  push(uid: string, changes: Changes): Promise<void>
  /** Everything written after `since` (server time, ms); `cursor` is the value to pass next time. */
  pull(uid: string, since: number): Promise<{ changes: Changes; cursor: number }>
  /** Deletes all the user's data. */
  wipe(uid: string): Promise<void>
}

/** What a pull changed on this device, so the open screens can refresh. */
export interface Applied {
  settings: boolean
  charts: ChartId[]
  progress: ChartId[]
  attempts: number
  drawings: number
}
