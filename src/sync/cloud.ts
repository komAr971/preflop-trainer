import type { Remote } from './types'

export interface CloudUser {
  uid: string
  email: string | null
}

/** Account + cloud store. The Firebase implementation is loaded on demand; tests use a fake. */
export interface Cloud {
  remote: Remote
  /** Calls back with the current user right away and on every change. Returns unsubscribe. */
  onUser(cb: (user: CloudUser | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<void>
  resetPassword(email: string): Promise<void>
  signOut(): Promise<void>
  /** Confirms the password, erases the cloud data, then the account itself. */
  deleteAccount(password: string, wipe: (uid: string) => Promise<void>): Promise<void>
}

/** Error codes the account screen explains; anything else is "unknown". */
export const AUTH_ERRORS = [
  'invalid-credential',
  'email-already-in-use',
  'weak-password',
  'invalid-email',
  'too-many-requests',
  'network-request-failed',
  'not-configured',
] as const
export type AuthError = (typeof AUTH_ERRORS)[number] | 'unknown'

export function authErrorCode(e: unknown): AuthError {
  const raw = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : ''
  let code = raw.replace(/^auth\//, '')
  // Firebase reports a wrong password or unknown email in several ways depending on settings.
  if (code === 'wrong-password' || code === 'user-not-found' || code === 'invalid-login-credentials') code = 'invalid-credential'
  if (code === 'missing-password') code = 'weak-password'
  return (AUTH_ERRORS as readonly string[]).includes(code) ? (code as AuthError) : 'unknown'
}
