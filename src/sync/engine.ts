import type { TrainerDb } from '../db/repo'
import { ackOutbox, applyRemote, collectOutbox, getSyncState, setCursor, stopSync } from './local'
import { isEmpty, type Applied, type Remote } from './types'

/**
 * Signing in: pull everything, merge it with this device (rules in docs/PLAN.md), push what the cloud lacks.
 * From then on local changes are queued for `syncOnce`.
 */
export async function signInSync(db: TrainerDb, remote: Remote, uid: string): Promise<Applied> {
  const { changes, cursor } = await remote.pull(uid, 0)
  await db.meta.put({ key: 'sync', value: { uid, cursor } })
  const applied = await applyRemote(db, changes, { merge: true })
  await pushOutbox(db, remote, uid)
  return applied
}

/**
 * One round: pull what other devices wrote, then push queued changes. Does nothing while signed out.
 * Pulling first matters: a queued chart edit older than the cloud's is resolved here (last write wins)
 * and the push then sends the winner instead of overwriting it.
 */
export async function syncOnce(db: TrainerDb, remote: Remote): Promise<Applied | null> {
  const state = await getSyncState(db)
  if (!state) return null
  const { changes, cursor } = await remote.pull(state.uid, state.cursor)
  const applied = await applyRemote(db, changes)
  await setCursor(db, state.uid, cursor)
  await pushOutbox(db, remote, state.uid)
  return applied
}

async function pushOutbox(db: TrainerDb, remote: Remote, uid: string) {
  const { changes, seqs } = await collectOutbox(db)
  if (!isEmpty(changes)) await remote.push(uid, changes)
  await ackOutbox(db, seqs)
}

export const signOutSync = stopSync

/** Erases the cloud copy; this device keeps its data. */
export async function deleteCloudData(db: TrainerDb, remote: Remote, uid: string) {
  await remote.wipe(uid)
  await stopSync(db)
}
