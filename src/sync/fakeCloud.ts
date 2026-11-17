import type { Cloud, CloudUser } from './cloud'
import { createMemoryRemote } from './memoryRemote'

/** Account backend for tests: users live in memory, passwords in plain text. */
export function createFakeCloud(remote = createMemoryRemote()) {
  const accounts = new Map<string, { uid: string; password: string }>()
  const listeners = new Set<(u: CloudUser | null) => void>()
  let current: CloudUser | null = null
  const emit = () => listeners.forEach((l) => l(current))
  const fail = (code: string) => Object.assign(new Error(code), { code: `auth/${code}` })

  const cloud: Cloud & { remote: typeof remote; resets: string[]; accounts: typeof accounts } = {
    remote,
    resets: [],
    accounts,
    onUser(cb) {
      listeners.add(cb)
      cb(current)
      return () => listeners.delete(cb)
    },
    async signIn(email, password) {
      const a = accounts.get(email)
      if (!a || a.password !== password) throw fail('invalid-credential')
      current = { uid: a.uid, email }
      emit()
    },
    async signUp(email, password) {
      if (accounts.has(email)) throw fail('email-already-in-use')
      if (password.length < 6) throw fail('weak-password')
      accounts.set(email, { uid: `uid-${accounts.size + 1}`, password })
      await cloud.signIn(email, password)
    },
    async resetPassword(email) {
      cloud.resets.push(email)
    },
    async signOut() {
      current = null
      emit()
    },
    async deleteAccount(password, wipe) {
      const email = current?.email ?? ''
      const a = accounts.get(email)
      if (!a || a.password !== password) throw fail('invalid-credential')
      await wipe(a.uid)
      accounts.delete(email)
      current = null
      emit()
    },
  }
  return cloud
}
