import type { ChartRecord, ProgressRecord } from '../db/repo'
import { emptyChanges, type Changes, type CloudAttempt, type CloudDrawing, type CloudSettings, type Remote } from './types'

interface Stamped<T> {
  doc: T
  at: number
}

/** In-memory cloud for tests: same contract as Firestore, server time is a counter. */
export function createMemoryRemote() {
  let clock = 0
  const users = new Map<
    string,
    {
      charts: Map<string, Stamped<ChartRecord>>
      progress: Map<string, Stamped<ProgressRecord>>
      settings: Stamped<CloudSettings> | null
      log: Stamped<{ attempts: CloudAttempt[]; drawings: CloudDrawing[] }>[]
    }
  >()
  const user = (uid: string) => {
    if (!users.has(uid)) users.set(uid, { charts: new Map(), progress: new Map(), settings: null, log: [] })
    return users.get(uid)!
  }
  const copy = <T>(x: T): T => structuredClone(x)

  const remote: Remote & { pushes: number; users: typeof users } = {
    pushes: 0,
    users,
    async push(uid, c) {
      remote.pushes++
      const u = user(uid)
      const at = ++clock
      for (const ch of c.charts) u.charts.set(ch.id, { doc: copy(ch), at })
      for (const p of c.progress) u.progress.set(String(p.chartId), { doc: copy(p), at })
      if (c.settings) u.settings = { doc: copy(c.settings), at }
      if (c.attempts.length || c.drawings.length) u.log.push({ doc: copy({ attempts: c.attempts, drawings: c.drawings }), at })
    },
    async pull(uid, since) {
      const u = user(uid)
      const out: Changes = emptyChanges()
      let cursor = since
      const take = <T>(s: Stamped<T>) => {
        cursor = Math.max(cursor, s.at)
        return copy(s.doc)
      }
      out.charts = [...u.charts.values()].filter((s) => s.at > since).map(take)
      out.progress = [...u.progress.values()].filter((s) => s.at > since).map(take)
      if (u.settings && u.settings.at > since) out.settings = take(u.settings)
      for (const entry of u.log.filter((s) => s.at > since)) {
        const { attempts, drawings } = take(entry)
        out.attempts.push(...attempts)
        out.drawings.push(...drawings)
      }
      return { changes: out, cursor }
    },
    async wipe(uid) {
      users.delete(uid)
    },
  }
  return remote
}
