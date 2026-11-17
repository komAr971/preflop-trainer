import { create } from 'zustand'
import type { TrainerDb } from '../db/repo'
import { authErrorCode, type AuthError, type Cloud, type CloudUser } from './cloud'
import { deleteCloudData, signInSync, signOutSync, syncOnce } from './engine'
import { getSyncState } from './local'
import type { Applied } from './types'

export type AccountStatus = 'unconfigured' | 'loading' | 'signedOut' | 'signedIn'

interface Deps {
  db: TrainerDb
  /** False when the build has no Firebase project yet: the account section explains that. */
  configured: boolean
  /** Null when the app has no cloud configured. Loads the Firebase code on first call. */
  loadCloud: () => Promise<Cloud | null>
  /** Lets open screens pick up what a pull changed. */
  onApplied: (applied: Applied) => void
}

interface AccountState {
  status: AccountStatus
  email: string | null
  syncing: boolean
  lastSync: number | null
  syncFailed: boolean
  init: (deps: Deps) => Promise<void>
  /** Throw an `AuthError` code on failure. */
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: (password: string) => Promise<void>
  /** Runs a sync soon (debounced); no-op while signed out. */
  scheduleSync: (delayMs?: number) => void
  syncNow: () => Promise<void>
}

/** Sync every minute while the app is visible, after local changes, on focus and when back online. */
const PERIOD_MS = 60_000
const AFTER_CHANGE_MS = 5_000

/** A factory so tests get a fresh store; the app uses `useAccount`. */
export const createAccountStore = () => create<AccountState>()((set, get) => {
  let deps: Deps | null = null
  let cloud: Cloud | null = null
  let uid: string | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let running: Promise<void> | null = null
  let again = false
  let stopListening: (() => void) | null = null

  let unsubscribe: (() => void) | null = null

  /** Loads the cloud code once and starts following the signed-in user. */
  const requireCloud = async (): Promise<Cloud> => {
    cloud ??= (await deps?.loadCloud()) ?? null
    if (!cloud) throw 'not-configured' satisfies AuthError
    unsubscribe ??= cloud.onUser((u) => void onUser(u))
    return cloud
  }

  const wrap = async (fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      if (typeof e === 'string') throw e
      console.error(e)
      throw authErrorCode(e)
    }
  }

  const listen = () => {
    if (stopListening || typeof window === 'undefined') return
    const onVisible = () => {
      if (document.visibilityState === 'visible') get().scheduleSync(0)
      else void get().syncNow()
    }
    const onOnline = () => get().scheduleSync(0)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') get().scheduleSync(0)
    }, PERIOD_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    stopListening = () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      stopListening = null
    }
  }

  const onUser = async (user: CloudUser | null) => {
    if (!deps) return
    const state = await getSyncState(deps.db)
    if (!user) {
      uid = null
      stopListening?.()
      if (state) await signOutSync(deps.db)
      set({ status: 'signedOut', email: null, syncing: false })
      return
    }
    uid = user.uid
    set({ status: 'signedIn', email: user.email })
    listen()
    if (state?.uid === user.uid) {
      get().scheduleSync(0)
      return
    }
    // A new sign-in on this device: merge local data with the account.
    await runSync(() => signInSync(deps!.db, cloud!.remote, user.uid))
  }

  const runSync = async (fn: () => Promise<Applied | null>) => {
    if (running) {
      again = true
      return running
    }
    set({ syncing: true })
    running = (async () => {
      try {
        const applied = await fn()
        if (applied) deps?.onApplied(applied)
        set({ lastSync: Date.now(), syncFailed: false })
      } catch (e) {
        console.error('Sync failed', e)
        set({ syncFailed: true })
      } finally {
        running = null
        set({ syncing: false })
      }
    })()
    await running
    if (again) {
      again = false
      await get().syncNow()
    }
  }

  return {
    status: 'loading',
    email: null,
    syncing: false,
    lastSync: null,
    syncFailed: false,

    init: async (d) => {
      // Re-init (tests, hot reload) starts from scratch.
      unsubscribe?.()
      unsubscribe = null
      stopListening?.()
      cloud = null
      uid = null
      set({ status: 'loading', email: null, syncing: false, lastSync: null, syncFailed: false })
      deps = d
      if (!d.configured) {
        set({ status: 'unconfigured' })
        return
      }
      // Firebase is only downloaded for people who use an account.
      if (!(await getSyncState(d.db))) {
        set({ status: 'signedOut' })
        return
      }
      try {
        await requireCloud()
      } catch (e) {
        console.error('Cloud unavailable', e)
        set({ status: 'signedOut' })
      }
    },

    signIn: (email, password) =>
      wrap(async () => {
        await (await requireCloud()).signIn(email, password)
      }),

    signUp: (email, password) =>
      wrap(async () => {
        await (await requireCloud()).signUp(email, password)
      }),

    resetPassword: (email) => wrap(async () => (await requireCloud()).resetPassword(email)),

    signOut: () =>
      wrap(async () => {
        await get().syncNow()
        await (await requireCloud()).signOut()
      }),

    deleteAccount: (password) =>
      wrap(async () => {
        const c = await requireCloud()
        await c.deleteAccount(password, (id) => deleteCloudData(deps!.db, c.remote, id))
      }),

    scheduleSync: (delayMs = AFTER_CHANGE_MS) => {
      if (!uid) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void get().syncNow()
      }, delayMs)
    },

    syncNow: async () => {
      if (!uid || !deps || !cloud) return
      const { db } = deps
      const { remote } = cloud
      await runSync(() => syncOnce(db, remote))
    },
  }
})

export const useAccount = createAccountStore()
