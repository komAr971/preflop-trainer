import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionBar } from './components/ActionBar'
import { HOTKEYS } from './components/actionLabels'
import { Feedback } from './components/Feedback'
import { Table } from './components/Table'
import type { Action } from './core/chart'
import { fmtBb } from './core/format'
import type { Scenario } from './core/scenario'
import { LANGUAGES, setLanguage, type Language } from './i18n'
import { useTrainer } from './store/trainerStore'

const AUTO_NEXT_MS = 700

function useSpotText(s: Scenario): string {
  const { t } = useTranslation()
  const { spot } = s
  if (spot.kind === 'rfi') return t('spot.rfi')
  if (spot.kind === 'vsOpen') return t('spot.vsOpen', { villain: spot.villain, amount: fmtBb(s.facingBb!) })
  return t('spot.vs3bet', { villain: spot.villain, amount: fmtBb(s.facingBb!), open: fmtBb(s.heroOpenBb!) })
}

export default function App() {
  const { t, i18n } = useTranslation()
  const { ready, question, answer, session, submit, next } = useTrainer()
  const spotText = useSpotText(question.scenario)

  // Keyboard: F/C/R to answer, Space/Enter for next.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!ready || e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (!answer) {
        const action = (Object.keys(HOTKEYS) as Action[]).find((a) => HOTKEYS[a] === key)
        if (action && question.scenario.actions.some((o) => o.action === action)) submit(action)
      } else if (key === ' ' || key === 'enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, answer, question, submit, next])

  // Correct answers move on automatically.
  useEffect(() => {
    if (!answer?.correct) return
    const id = window.setTimeout(next, AUTO_NEXT_MS)
    return () => window.clearTimeout(id)
  }, [answer, next])

  const percent = session.total ? Math.round((session.correct / session.total) * 100) : 0

  return (
    <div className="app">
      <header className="header">
        <h1>{t('app.title')}</h1>
        <span className="score" data-testid="score">
          {t('app.score', { correct: session.correct, total: session.total })}
          {session.total > 0 && ` (${percent}%)`}
        </span>
        <div className="lang" role="group" aria-label={t('app.language')}>
          {LANGUAGES.map((lang: Language) => (
            <button
              key={lang}
              type="button"
              aria-pressed={i18n.language === lang}
              onClick={() => setLanguage(lang)}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {ready && (
        <main className="main">
          <p className="spot-text" data-testid="spot-text">
            <b>{question.scenario.spot.hero}</b> · {spotText}
            {question.isReview && <span className="badge-review">{t('table.review')}</span>}
          </p>
          <Table scenario={question.scenario} cards={question.cards} questionId={question.id} />
          <ActionBar
            spot={question.scenario.spot}
            options={question.scenario.actions}
            disabled={answer !== null}
            chosen={answer?.action}
            accepted={answer?.accepted}
            onAction={submit}
          />
          <div className="feedback-slot">
            {answer && <Feedback answer={answer} hand={question.hand} freqs={question.freqs} onNext={next} />}
          </div>
        </main>
      )}
      <footer className="footer">v {__APP_VERSION__}</footer>
    </div>
  )
}
