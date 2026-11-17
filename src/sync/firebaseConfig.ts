import type { FirebaseOptions } from 'firebase/app'

/**
 * Web config of the Firebase project (Console → Project settings → Your apps).
 * These keys are public by design: access is guarded by the Firestore security rules (firestore.rules).
 * Null until the project exists: the account section stays hidden.
 */
export const firebaseConfig: FirebaseOptions | null = null
