import { initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore/lite'
import type { Cloud } from './cloud'
import { emptyChanges, type Changes, type Remote } from './types'

/**
 * Firestore layout, one private tree per user (see firestore.rules):
 *   users/{uid}/charts/{chartId}     own charts and tombstones
 *   users/{uid}/progress/{chartId}   review queue + counter
 *   users/{uid}/meta/settings
 *   users/{uid}/log/{auto}           append-only batches of attempts and drawings
 * Every doc is { data: JSON string, syncedAt: server time }: JSON keeps optional fields
 * and nested arrays intact, and only `syncedAt` gets indexed.
 */
const COLLECTIONS = ['charts', 'progress', 'meta', 'log'] as const
const LOG_CHUNK = 300
const BATCH_LIMIT = 400
/** Pulls overlap a little: re-reading is harmless (merges are idempotent), missing a write is not. */
const OVERLAP_MS = 2000

function createFirestoreRemote(db: Firestore): Remote {
  const col = (uid: string, name: (typeof COLLECTIONS)[number]) => collection(db, 'users', uid, name)

  async function commit(writes: ((b: ReturnType<typeof writeBatch>) => void)[]) {
    for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db)
      writes.slice(i, i + BATCH_LIMIT).forEach((w) => w(batch))
      await batch.commit()
    }
  }

  return {
    async push(uid, c) {
      const body = (data: unknown) => ({ data: JSON.stringify(data), syncedAt: serverTimestamp() })
      const writes: ((b: ReturnType<typeof writeBatch>) => void)[] = []
      for (const ch of c.charts) writes.push((b) => b.set(doc(col(uid, 'charts'), ch.id), body(ch)))
      for (const p of c.progress) writes.push((b) => b.set(doc(col(uid, 'progress'), String(p.chartId)), body(p)))
      if (c.settings) {
        const s = c.settings
        writes.push((b) => b.set(doc(col(uid, 'meta'), 'settings'), body(s)))
      }
      const items = [...c.attempts.map((a) => ({ a })), ...c.drawings.map((d) => ({ d }))]
      for (let i = 0; i < items.length; i += LOG_CHUNK) {
        const chunk = items.slice(i, i + LOG_CHUNK)
        const entry = {
          attempts: chunk.flatMap((x) => ('a' in x ? [x.a] : [])),
          drawings: chunk.flatMap((x) => ('d' in x ? [x.d] : [])),
        }
        writes.push((b) => b.set(doc(col(uid, 'log')), body(entry)))
      }
      await commit(writes)
    },

    async pull(uid, since) {
      const out: Changes = emptyChanges()
      let cursor = since
      const from = Timestamp.fromMillis(Math.max(0, since - OVERLAP_MS))
      for (const name of COLLECTIONS) {
        const q = since > 0 ? query(col(uid, name), where('syncedAt', '>', from)) : col(uid, name)
        const snap = await getDocs(q)
        for (const d of snap.docs) {
          const raw = d.data() as { data: string; syncedAt?: Timestamp }
          if (raw.syncedAt) cursor = Math.max(cursor, raw.syncedAt.toMillis())
          const data = JSON.parse(raw.data)
          if (name === 'charts') out.charts.push(data)
          else if (name === 'progress') out.progress.push(data)
          else if (name === 'meta') out.settings = data
          else {
            out.attempts.push(...(data.attempts ?? []))
            out.drawings.push(...(data.drawings ?? []))
          }
        }
      }
      return { changes: out, cursor }
    },

    async wipe(uid) {
      const writes: ((b: ReturnType<typeof writeBatch>) => void)[] = []
      for (const name of COLLECTIONS) {
        const snap = await getDocs(col(uid, name))
        for (const d of snap.docs) writes.push((b) => b.delete(d.ref))
      }
      await commit(writes)
    },
  }
}

export function createFirebaseCloud(options: FirebaseOptions): Cloud {
  const app = initializeApp(options)
  const auth = getAuth(app)
  auth.useDeviceLanguage()
  const remote = createFirestoreRemote(getFirestore(app))

  return {
    remote,
    onUser: (cb) => onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null)),
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password)
    },
    signUp: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password)
    },
    resetPassword: (email) => sendPasswordResetEmail(auth, email),
    signOut: () => signOut(auth),
    deleteAccount: async (password, wipe) => {
      const user = auth.currentUser
      if (!user?.email) throw new Error('Not signed in')
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
      await wipe(user.uid)
      await deleteUser(user)
    },
  }
}
