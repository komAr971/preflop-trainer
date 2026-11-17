import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SpotKey } from '../core/chart'
import { ALL_SPOTS } from '../core/chartEdit'
import { dayKey, handErrors, medianDecisionMs, spotStats, streakDays, todayCount, type AttemptLike } from '../core/stats'
import type { DrawingRecord } from '../db/repo'
import { useTrainer } from '../store/trainerStore'
import { HeatGrid } from './HeatGrid'
import { useSpotLabel } from './spotLabel'

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export function StatsPage() {
  const { t } = useTranslation()
  const spotLabel = useSpotLabel()
  const repo = useTrainer((s) => s.repo)
  const chart = useTrainer((s) => s.chart)
  const chartId = useTrainer((s) => s.chartId)
  const settings = useTrainer((s) => s.settings)
  const sessionTotal = useTrainer((s) => s.session.total)
  const [attempts, setAttempts] = useState<AttemptLike[] | null>(null)
  const [timestamps, setTimestamps] = useState<number[]>([])
  const [heatSpot, setHeatSpot] = useState<SpotKey | ''>('')
  const [drawings, setDrawings] = useState<DrawingRecord[]>([])

  useEffect(() => {
    if (!repo) return
    void Promise.all([repo.listAttempts(chartId), repo.attemptTimestamps(), repo.listDrawings(chartId)]).then(
      ([a, ts, d]) => {
        setAttempts(a)
        setTimestamps(ts)
        setDrawings(d)
      },
    )
  }, [repo, chartId, sessionTotal])

  const rule = { window: settings.learnedWindow, threshold: settings.learnedThreshold }
  const stats = useMemo(
    () => spotStats(attempts ?? [], rule),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rule is derived from settings
    [attempts, settings.learnedWindow, settings.learnedThreshold],
  )
  const errors = useMemo(() => handErrors(attempts ?? [], heatSpot || undefined), [attempts, heatSpot])

  if (!repo) return <p className="notice error">{t('charts.noStorage')}</p>
  if (!attempts) return null

  const now = Date.now()
  const today = todayCount(timestamps, now)
  const streak = streakDays(timestamps, now, settings.dailyGoal)
  const spots = ALL_SPOTS.filter((s) => chart.spots.has(s.key))
  const learned = spots.filter((s) => stats.get(s.key)?.learned).length
  const total = attempts.length
  const correct = attempts.filter((a) => a.correct).length
  const sec = (ms: number | null) => (ms === null ? '—' : t('stats.sec', { value: (ms / 1000).toFixed(1) }))
  const speedToday = medianDecisionMs(attempts.filter((a) => dayKey(a.ts) === dayKey(now)))
  const speedAll = medianDecisionMs(attempts)

  return (
    <main className="stats">
      <p className="stats-chart">
        {t('stats.chart')}: <b>{chart.name}</b>
      </p>
      <div className="stat-cards">
        <div className="stat-card" data-testid="stat-today">
          <span className="stat-label">{t('stats.today')}</span>
          <span className="stat-value">
            {today} / {settings.dailyGoal}
          </span>
          <progress max={settings.dailyGoal} value={Math.min(today, settings.dailyGoal)} />
        </div>
        <div className="stat-card" data-testid="stat-streak">
          <span className="stat-label">{t('stats.streak')}</span>
          <span className="stat-value">{t('stats.days', { count: streak })}</span>
        </div>
        <div className="stat-card" data-testid="stat-learned">
          <span className="stat-label">{t('stats.learned')}</span>
          <span className="stat-value">
            {learned} / {spots.length}
          </span>
        </div>
        <div className="stat-card" data-testid="stat-accuracy">
          <span className="stat-label">{t('stats.accuracy')}</span>
          <span className="stat-value">{total ? `${pct(correct, total)}%` : '—'}</span>
          <span className="stat-sub">{t('stats.hands', { count: total })}</span>
        </div>
        <div className="stat-card" data-testid="stat-speed">
          <span className="stat-label">{t('stats.speed')}</span>
          <span className="stat-value">{sec(speedToday)}</span>
          <span className="stat-sub">
            {t('stats.speedToday')} · {t('stats.speedAll', { value: sec(speedAll) })}
          </span>
        </div>
      </div>

      <h2>{t('stats.heatmap')}</h2>
      <select value={heatSpot} onChange={(e) => setHeatSpot(e.target.value)} aria-label={t('stats.heatmap')}>
        <option value="">{t('stats.allSpots')}</option>
        {spots.map((s) => (
          <option key={s.key} value={s.key}>
            {spotLabel(s.spot)}
          </option>
        ))}
      </select>
      <HeatGrid errors={errors} />
      <p className="heat-legend">
        <span className="swatch" style={{ background: 'hsl(120 60% 45%)' }} /> {t('stats.noErrors')}
        <span className="swatch" style={{ background: 'hsl(0 60% 45%)' }} /> {t('stats.allErrors')}
        <span className="swatch neutral" /> {t('stats.noData')}
      </p>

      <h2>{t('stats.bySpot')}</h2>
      <p className="stat-sub">
        {t('stats.learnedRule', { threshold: Math.round(settings.learnedThreshold * 100), window: settings.learnedWindow })}
      </p>
      <table className="spot-table">
        <tbody>
          {spots.map((s) => {
            const st = stats.get(s.key)
            const acc = st ? pct(st.recentCorrect, st.recentTotal) : 0
            return (
              <tr key={s.key} data-testid={`spot-${s.key}`} onClick={() => setHeatSpot(s.key)}>
                <td>{spotLabel(s.spot)}</td>
                <td className="num">{st ? `${acc}%` : '—'}</td>
                <td className="bar-cell">
                  <div className="bar">
                    <div style={{ width: `${acc}%` }} />
                  </div>
                </td>
                <td className="num muted">
                  {st ? `${st.recentTotal}/${settings.learnedWindow}` : ''}
                </td>
                <td className="num muted" data-testid="spot-speed">
                  {st && sec(st.medianMs)}
                  {st && st.timeouts > 0 && (
                    <span className="timeouts" title={t('stats.timeouts', { count: st.timeouts })}>
                      {' '}⏱{st.timeouts}
                    </span>
                  )}
                </td>
                <td>{st?.learned && <span className="tag tag-active">{t('stats.learnedTag')}</span>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {drawings.length > 0 && (
        <>
          <h2>{t('draw.stats')}</h2>
          <table className="spot-table" data-testid="draw-stats">
            <thead>
              <tr className="muted">
                <td />
                <td className="num">{t('draw.last')}</td>
                <td className="num">{t('draw.best')}</td>
                <td className="num">{t('draw.attempts')}</td>
              </tr>
            </thead>
            <tbody>
              {spots
                .filter((s) => drawings.some((d) => d.spotKey === s.key))
                .map((s) => {
                  const list = drawings.filter((d) => d.spotKey === s.key)
                  return (
                    <tr key={s.key}>
                      <td>{spotLabel(s.spot)}</td>
                      <td className="num">{list[list.length - 1].score.toFixed(1)}%</td>
                      <td className="num">{Math.max(...list.map((d) => d.score)).toFixed(1)}%</td>
                      <td className="num muted">{list.length}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </>
      )}
    </main>
  )
}
