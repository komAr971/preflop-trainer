import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartEditor } from './components/ChartEditor'
import { ChartsPage } from './components/ChartsPage'
import { DrawPage } from './components/DrawPage'
import { SettingsPage } from './components/SettingsPage'
import { StatsPage } from './components/StatsPage'
import { TrainerPage } from './components/TrainerPage'
import { useTrainer } from './store/trainerStore'
import { hrefFor, useHashRoute, type Route } from './ui/useHashRoute'

const TABS: { route: Route; label: string; matches: Route['page'][] }[] = [
  { route: { page: 'train' }, label: 'nav.train', matches: ['train'] },
  { route: { page: 'charts' }, label: 'nav.charts', matches: ['charts', 'edit'] },
  { route: { page: 'stats' }, label: 'nav.stats', matches: ['stats'] },
  { route: { page: 'settings' }, label: 'nav.settings', matches: ['settings'] },
]

export default function App() {
  const { t } = useTranslation()
  const route = useHashRoute()
  const [menuOpen, setMenuOpen] = useState(false)
  // Navigating closes the mobile menu.
  useEffect(() => setMenuOpen(false), [route])
  const session = useTrainer((s) => s.session)
  const soundOn = useTrainer((s) => s.settings.sound)
  const chartId = useTrainer((s) => s.chartId)
  const updateSettings = useTrainer((s) => s.updateSettings)
  const percent = session.total ? Math.round((session.correct / session.total) * 100) : 0

  return (
    <div className={`app page-${route.page}`}>
      <header className="header">
        <button
          type="button"
          className="burger"
          aria-label={t('app.menu')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <h1>{t('app.title')}</h1>
        <nav className={`tabs ${menuOpen ? 'is-open' : ''}`}>
          {TABS.map((tab) => (
            <a
              key={tab.label}
              href={hrefFor(tab.route)}
              aria-current={tab.matches.includes(route.page) ? 'page' : undefined}
            >
              {t(tab.label)}
            </a>
          ))}
          <a href={hrefFor({ page: 'draw' })} className="menu-only" aria-current={route.page === 'draw' ? 'page' : undefined}>
            ✏️ {t('draw.open')}
          </a>
          <span className="menu-only menu-version">v {__APP_VERSION__}</span>
        </nav>
        <span className="score" data-testid="score">
          {t('app.score', { correct: session.correct, total: session.total })}
          {session.total > 0 && ` (${percent}%)`}
        </span>
        <button
          type="button"
          className="mute"
          aria-pressed={!soundOn}
          aria-label={soundOn ? t('app.mute') : t('app.unmute')}
          title={soundOn ? t('app.mute') : t('app.unmute')}
          onClick={() => updateSettings({ sound: !soundOn })}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </header>

      {route.page === 'train' && <TrainerPage />}
      {route.page === 'charts' && <ChartsPage />}
      {route.page === 'edit' && <ChartEditor key={route.chartId} chartId={route.chartId} />}
      {route.page === 'stats' && <StatsPage />}
      {route.page === 'settings' && <SettingsPage />}
      {route.page === 'draw' && <DrawPage key={chartId} />}

      <footer className="footer">v {__APP_VERSION__}</footer>
    </div>
  )
}
