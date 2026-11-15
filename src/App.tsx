import { useTranslation } from 'react-i18next'
import { ChartsPage } from './components/ChartsPage'
import { TrainerPage } from './components/TrainerPage'
import { LANGUAGES, setLanguage } from './i18n'
import { useTrainer } from './store/trainerStore'
import { hrefFor, useHashRoute } from './ui/useHashRoute'

export default function App() {
  const { t, i18n } = useTranslation()
  const route = useHashRoute()
  const session = useTrainer((s) => s.session)
  const percent = session.total ? Math.round((session.correct / session.total) * 100) : 0

  return (
    <div className="app">
      <header className="header">
        <h1>{t('app.title')}</h1>
        <nav className="tabs">
          <a href={hrefFor({ page: 'train' })} aria-current={route.page === 'train' ? 'page' : undefined}>
            {t('nav.train')}
          </a>
          <a href={hrefFor({ page: 'charts' })} aria-current={route.page !== 'train' ? 'page' : undefined}>
            {t('nav.charts')}
          </a>
        </nav>
        <span className="score" data-testid="score">
          {t('app.score', { correct: session.correct, total: session.total })}
          {session.total > 0 && ` (${percent}%)`}
        </span>
        <div className="lang" role="group" aria-label={t('app.language')}>
          {LANGUAGES.map((lang) => (
            <button key={lang} type="button" aria-pressed={i18n.language === lang} onClick={() => setLanguage(lang)}>
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {route.page === 'train' && <TrainerPage />}
      {route.page === 'charts' && <ChartsPage />}
      {route.page === 'edit' && <p>{t('charts.editorSoon')}</p>}

      <footer className="footer">v {__APP_VERSION__}</footer>
    </div>
  )
}
