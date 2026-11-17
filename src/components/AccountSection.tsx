import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuthError } from '../sync/cloud'
import { useAccount } from '../sync/account'

type Notice = { kind: 'ok' | 'error'; text: string } | null

export function AccountSection() {
  const { t, i18n } = useTranslation()
  const status = useAccount((s) => s.status)
  const [notice, setNotice] = useState<Notice>(null)

  if (status === 'unconfigured') return null

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setNotice(null)
    try {
      await fn()
      if (ok) setNotice({ kind: 'ok', text: ok })
    } catch (code) {
      setNotice({ kind: 'error', text: t(`account.errors.${code as AuthError}`, t('account.errors.unknown')) })
    }
  }

  return (
    <section className="account" aria-labelledby="account-title">
      <h2 id="account-title">{t('account.title')}</h2>
      {status === 'loading' && <p className="setting-hint">{t('account.loading')}</p>}
      {status === 'signedOut' && <SignInForm run={run} />}
      {status === 'signedIn' && <SignedIn run={run} locale={i18n.language} />}
      {notice && (
        <p className={`notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}
    </section>
  )
}

type Run = (fn: () => Promise<void>, ok?: string) => Promise<void>

function SignInForm({ run }: { run: Run }) {
  const { t } = useTranslation()
  const { signIn, signUp, resetPassword } = useAccount.getState()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const act = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true)
    await run(fn, ok)
    setBusy(false)
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void act(() => signIn(email.trim(), password))
  }
  const onForgot = () => {
    if (!email.trim()) return void run(async () => Promise.reject('invalid-email'))
    void act(() => resetPassword(email.trim()), t('account.resetSent', { email: email.trim() }))
  }

  return (
    <form className="account-form" onSubmit={onSubmit}>
      <p className="setting-hint">{t('account.intro')}</p>
      <label className="setting">
        <span>{t('account.email')}</span>
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="setting">
        <span>{t('account.password')}</span>
        <input
          type="password"
          autoComplete="current-password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <div className="account-actions">
        <button type="submit" className="primary" disabled={busy}>
          {t('account.signIn')}
        </button>
        <button type="button" disabled={busy} onClick={() => void act(() => signUp(email.trim(), password))}>
          {t('account.signUp')}
        </button>
        <button type="button" className="link" disabled={busy} onClick={onForgot}>
          {t('account.forgot')}
        </button>
      </div>
    </form>
  )
}

function SignedIn({ run, locale }: { run: Run; locale: string }) {
  const { t } = useTranslation()
  const email = useAccount((s) => s.email)
  const syncing = useAccount((s) => s.syncing)
  const lastSync = useAccount((s) => s.lastSync)
  const syncFailed = useAccount((s) => s.syncFailed)
  const { syncNow, signOut, deleteAccount } = useAccount.getState()
  const [deleting, setDeleting] = useState(false)
  const [password, setPassword] = useState('')

  const time = lastSync ? new Date(lastSync).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : ''
  let state = ''
  if (syncing) state = t('account.syncing')
  else if (syncFailed) state = t('account.syncFailed')
  else if (lastSync) state = t('account.syncedAt', { time })

  const onDelete = (e: FormEvent) => {
    e.preventDefault()
    void run(() => deleteAccount(password), t('account.deleted'))
  }

  return (
    <div className="account-signed-in">
      <p>{t('account.signedInAs', { email })}</p>
      <p className="setting-hint" role="status" data-testid="sync-state">
        {state}
      </p>
      <div className="account-actions">
        <button type="button" disabled={syncing} onClick={() => void syncNow()}>
          {t('account.syncNow')}
        </button>
        <button type="button" onClick={() => void run(signOut)}>
          {t('account.signOut')}
        </button>
        <button type="button" className="danger" onClick={() => setDeleting(true)} disabled={deleting}>
          {t('account.delete')}
        </button>
      </div>
      <p className="setting-hint">{t('account.signOutHint')}</p>
      {deleting && (
        <form className="account-delete" onSubmit={onDelete}>
          <p>{t('account.deleteConfirm')}</p>
          <label className="setting">
            <span>{t('account.password')}</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div className="account-actions">
            <button type="submit" className="danger">
              {t('account.deleteYes')}
            </button>
            <button type="button" onClick={() => setDeleting(false)}>
              {t('account.cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
