import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STARTER_ID, TrainerDb, createDexieRepo } from '../db/repo'
import { createAccountStore } from './account'
import { createFakeCloud } from './fakeCloud'
import { getSyncState } from './local'

let n = 0
const attempt = { chartId: STARTER_ID, spotKey: 'rfi:CO', hand: 'AA', action: 'raise' as const, correct: true, ts: 1 }

async function setup(cloud = createFakeCloud(), configured = true) {
  const db = new TrainerDb(`account-${n++}`)
  const repo = createDexieRepo(db, { onLocalChange: () => useAccount.getState().scheduleSync(0) })
  const onApplied = vi.fn()
  const loadCloud = vi.fn(async () => cloud)
  await useAccount.getState().init({ db, configured, loadCloud, onApplied })
  return { db, repo, cloud, onApplied, loadCloud }
}

let useAccount: ReturnType<typeof createAccountStore>
const waitFor = vi.waitFor

beforeEach(() => {
  useAccount = createAccountStore()
})

describe('account', () => {
  it('without a Firebase project explains that the account is unavailable', async () => {
    await setup(undefined, false)
    expect(useAccount.getState().status).toBe('unconfigured')
  })

  it('does not download the cloud code until the user signs in', async () => {
    const { loadCloud } = await setup()
    expect(useAccount.getState().status).toBe('signedOut')
    expect(loadCloud).not.toHaveBeenCalled()
  })

  it('signs up, merges local data into the account and keeps syncing', async () => {
    const { db, repo, cloud } = await setup()
    await repo.recordAttempt(attempt, [], 1)
    await useAccount.getState().signUp('me@example.com', 'secret1')
    await waitFor(() => expect(useAccount.getState()).toMatchObject({ status: 'signedIn', email: 'me@example.com', syncing: false }))
    expect((await getSyncState(db))?.uid).toBe('uid-1')
    await waitFor(() => expect(cloud.remote.users.get('uid-1')?.log).toHaveLength(1))

    await repo.recordAttempt({ ...attempt, ts: 2 }, [], 2)
    await waitFor(() => expect(cloud.remote.users.get('uid-1')?.log).toHaveLength(2))
  })

  it('reports auth errors as codes', async () => {
    const cloud = createFakeCloud()
    await setup(cloud)
    await expect(useAccount.getState().signIn('x@example.com', 'nope')).rejects.toBe('invalid-credential')
    await expect(useAccount.getState().signUp('x@example.com', '123')).rejects.toBe('weak-password')
    await useAccount.getState().resetPassword('x@example.com')
    expect(cloud.resets).toEqual(['x@example.com'])
  })

  it('signing out stops sync and keeps local data', async () => {
    const { db, repo } = await setup()
    await useAccount.getState().signUp('me@example.com', 'secret1')
    await waitFor(() => expect(useAccount.getState().status).toBe('signedIn'))
    await repo.recordAttempt(attempt, [], 1)
    await useAccount.getState().signOut()
    await waitFor(() => expect(useAccount.getState().status).toBe('signedOut'))
    expect(await getSyncState(db)).toBeNull()
    expect(await repo.attemptTimestamps()).toEqual([1])
  })

  it('deleting the account erases the cloud, local data stays', async () => {
    const { repo, cloud } = await setup()
    await repo.recordAttempt(attempt, [], 1)
    await useAccount.getState().signUp('me@example.com', 'secret1')
    await waitFor(() => expect(cloud.remote.users.get('uid-1')?.log).toHaveLength(1))
    await expect(useAccount.getState().deleteAccount('wrong')).rejects.toBe('invalid-credential')
    await useAccount.getState().deleteAccount('secret1')
    await waitFor(() => expect(useAccount.getState().status).toBe('signedOut'))
    expect(cloud.remote.users.has('uid-1')).toBe(false)
    expect(cloud.accounts.size).toBe(0)
    expect(await repo.attemptTimestamps()).toEqual([1])
  })

  it('resumes sync on start when this device was signed in', async () => {
    const cloud = createFakeCloud()
    const first = await setup(cloud)
    await useAccount.getState().signUp('me@example.com', 'secret1')
    await waitFor(() => expect(useAccount.getState().lastSync).not.toBeNull())
    // Next app start on the same device, the user is still signed in.
    useAccount = createAccountStore()
    const { loadCloud, onApplied } = { loadCloud: vi.fn(async () => cloud), onApplied: vi.fn() }
    await useAccount.getState().init({ db: first.db, configured: true, loadCloud, onApplied })
    expect(loadCloud).toHaveBeenCalled()
    await waitFor(() => expect(useAccount.getState().status).toBe('signedIn'))
  })
})
