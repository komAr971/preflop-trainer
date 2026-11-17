import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../core/settings'
import { starterChart } from '../data/starterChart'
import { STARTER_ID, TrainerDb, createDexieRepo, type Repo } from '../db/repo'
import { deleteCloudData, signInSync, signOutSync, syncOnce } from './engine'
import { createMemoryRemote } from './memoryRemote'

let n = 0
let clock = 1000
const now = () => clock++

function device() {
  const db = new TrainerDb(`sync-${n++}`)
  return { db, repo: createDexieRepo(db, { now }) }
}

const attempt = (ts: number, chartId: string | number = STARTER_ID) => ({
  chartId,
  spotKey: 'rfi:CO',
  hand: 'AA',
  action: 'raise' as const,
  correct: true,
  ts,
})
const chart = (name: string) => ({ ...starterChart, name })
const ownNames = async (repo: Repo) => (await repo.listCharts()).filter((c) => !c.builtin).map((c) => c.name).sort()

let remote: ReturnType<typeof createMemoryRemote>
let phone: ReturnType<typeof device>
let pc: ReturnType<typeof device>

beforeEach(() => {
  remote = createMemoryRemote()
  phone = device()
  pc = device()
})

describe('sync', () => {
  it('does nothing while signed out', async () => {
    await phone.repo.recordAttempt(attempt(1), [], 1)
    expect(await syncOnce(phone.db, remote)).toBeNull()
    expect(remote.pushes).toBe(0)
  })

  it('merges attempts from both devices on sign-in without duplicates', async () => {
    await phone.repo.recordAttempt(attempt(1), [], 1)
    await pc.repo.recordAttempt(attempt(2), [], 1)
    await signInSync(phone.db, remote, 'u')
    await signInSync(pc.db, remote, 'u')
    await syncOnce(phone.db, remote)
    expect(await phone.repo.attemptTimestamps()).toEqual([1, 2])
    expect(await pc.repo.attemptTimestamps()).toEqual([1, 2])

    // Signing in again on the same device does not duplicate anything.
    await signOutSync(phone.db)
    await signInSync(phone.db, remote, 'u')
    await syncOnce(pc.db, remote)
    expect(await phone.repo.attemptTimestamps()).toEqual([1, 2])
    expect(await pc.repo.attemptTimestamps()).toEqual([1, 2])
  })

  it('carries new attempts, drawings, timer fields and the review queue between devices', async () => {
    await signInSync(phone.db, remote, 'u')
    await signInSync(pc.db, remote, 'u')
    const review = { spotKey: 'rfi:CO', hand: 'K9o', box: 0, due: 4 }
    await phone.repo.recordAttempt({ ...attempt(5), action: null, correct: false, timedOut: true, answerMs: 10000 }, [review], 7)
    await phone.repo.recordDrawing({ chartId: STARTER_ID, spotKey: 'rfi:CO', score: 88, ts: 6 })
    await syncOnce(phone.db, remote)
    const applied = await syncOnce(pc.db, remote)
    expect(applied).toMatchObject({ attempts: 1, drawings: 1, progress: [STARTER_ID] })
    expect((await pc.repo.listAttempts(STARTER_ID))[0]).toMatchObject({ action: null, timedOut: true, answerMs: 10000 })
    expect((await pc.repo.listDrawings(STARTER_ID))[0].score).toBe(88)
    expect(await pc.repo.loadProgress(STARTER_ID)).toEqual({ reviews: [review], counter: 7 })
  })

  it('renames an own chart whose name the account already has', async () => {
    await phone.repo.saveChart(chart('Мой'))
    await pc.repo.saveChart(chart('Мой'))
    await pc.repo.saveChart(chart('Только ПК'))
    await signInSync(phone.db, remote, 'u')
    await signInSync(pc.db, remote, 'u')
    await syncOnce(phone.db, remote)
    expect(await ownNames(pc.repo)).toEqual(['Мой', 'Мой (2)', 'Только ПК'])
    expect(await ownNames(phone.repo)).toEqual(['Мой', 'Мой (2)', 'Только ПК'])
    const renamed = (await pc.repo.listCharts()).find((c) => c.name === 'Мой (2)')!
    expect((await pc.repo.getChart(renamed.id))?.name).toBe('Мой (2)')
  })

  it('edits and deletions of charts reach the other device, the latest edit wins', async () => {
    await signInSync(phone.db, remote, 'u')
    await signInSync(pc.db, remote, 'u')
    const id = await phone.repo.saveChart(chart('A'))
    await syncOnce(phone.db, remote)
    await syncOnce(pc.db, remote)
    await pc.repo.saveChart(chart('A старое'), id)
    await phone.repo.saveChart(chart('A новое'), id)
    await syncOnce(phone.db, remote)
    await syncOnce(pc.db, remote)
    await syncOnce(phone.db, remote)
    expect(await ownNames(pc.repo)).toEqual(['A новое'])
    expect(await ownNames(phone.repo)).toEqual(['A новое'])

    await pc.repo.recordAttempt(attempt(9, id), [], 1)
    await syncOnce(pc.db, remote)
    await syncOnce(phone.db, remote)
    expect(await phone.repo.listAttempts(id)).toHaveLength(1)
    await phone.repo.setActiveChartId(id)
    await phone.repo.deleteChart(id)
    await syncOnce(phone.db, remote)
    const applied = await syncOnce(pc.db, remote)
    expect(applied?.charts).toEqual([id])
    expect(await ownNames(pc.repo)).toEqual([])
    expect(await pc.repo.listAttempts(id)).toEqual([])
  })

  it('takes settings from the account on sign-in, keeping device-only fields', async () => {
    await phone.repo.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 50 })
    await signInSync(phone.db, remote, 'u')
    await pc.repo.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 300, volume: 0.1, tables: 4 })
    const applied = await signInSync(pc.db, remote, 'u')
    expect(applied.settings).toBe(true)
    expect(await pc.repo.getSettings()).toMatchObject({ dailyGoal: 50, volume: 0.1, tables: 4 })

    // Afterwards the latest change wins.
    await pc.repo.saveSettings({ ...(await pc.repo.getSettings()), dailyGoal: 120 })
    await syncOnce(pc.db, remote)
    await syncOnce(phone.db, remote)
    expect((await phone.repo.getSettings()).dailyGoal).toBe(120)
  })

  it('uses the device settings when the account has none', async () => {
    await phone.repo.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 50 })
    await signInSync(phone.db, remote, 'u')
    await signInSync(pc.db, remote, 'u')
    expect((await pc.repo.getSettings()).dailyGoal).toBe(50)
  })

  it('keeps the newer review queue', async () => {
    await signInSync(phone.db, remote, 'u')
    await signInSync(pc.db, remote, 'u')
    await pc.repo.recordAttempt(attempt(1), [], 3)
    await phone.repo.recordAttempt(attempt(2), [], 8)
    await syncOnce(pc.db, remote)
    await syncOnce(phone.db, remote)
    await syncOnce(pc.db, remote)
    expect((await pc.repo.loadProgress(STARTER_ID)).counter).toBe(8)
    expect((await phone.repo.loadProgress(STARTER_ID)).counter).toBe(8)
  })

  it('deleting the cloud data stops sync and keeps local data', async () => {
    await phone.repo.recordAttempt(attempt(1), [], 1)
    await signInSync(phone.db, remote, 'u')
    await deleteCloudData(phone.db, remote, 'u')
    expect(remote.users.has('u')).toBe(false)
    expect(await phone.repo.attemptTimestamps()).toEqual([1])
    await phone.repo.recordAttempt(attempt(2), [], 2)
    expect(await syncOnce(phone.db, remote)).toBeNull()
    expect(await phone.db.outbox.count()).toBe(0)
  })

  it('does not push when there is nothing new', async () => {
    await signInSync(phone.db, remote, 'u')
    const before = remote.pushes
    await syncOnce(phone.db, remote)
    expect(remote.pushes).toBe(before)
  })
})
