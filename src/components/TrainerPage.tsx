import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Feedback } from './Feedback'
import { TablePanel, type KeyHandler } from './TablePanel'
import { useTrainer } from '../store/trainerStore'
import { useMediaQuery } from '../ui/useMediaQuery'

/** Several tables only fit on wide screens; narrower windows play one (the choice comes back when wider). */
export const MULTI_QUERY = '(min-width: 900px)'
const COUNTS = [1, 2, 3, 4] as const

/** Full explanation of one table's mistake; the other tables' clocks are paused while it is open. */
function ReviewPanel({ index }: { index: number }) {
  const { t } = useTranslation()
  const table = useTrainer((s) => s.tables[index])
  const chart = useTrainer((s) => s.chart)
  const threshold = useTrainer((s) => s.settings.threshold)
  const next = useTrainer((s) => s.next)
  const setReviewing = useTrainer((s) => s.setReviewing)
  if (!table?.answer) return null
  const { question, answer } = table
  return (
    <aside className="review-panel" data-testid="review-panel" aria-label={t('multi.review')}>
      <div className="review-head">
        <span className="muted">{t('multi.reviewOf', { n: index + 1 })}</span>
        <button type="button" className="review-close" onClick={() => setReviewing(null)} aria-label={t('multi.close')}>
          ✕
        </button>
      </div>
      <Feedback
        answer={answer}
        hand={question.hand}
        freqs={question.freqs}
        spot={question.scenario.spot}
        compiled={chart.spots.get(question.spotKey)}
        threshold={threshold}
        onNext={() => next(index)}
      />
    </aside>
  )
}

export function TrainerPage() {
  const { t } = useTranslation()
  const ready = useTrainer((s) => s.ready)
  const count = useTrainer((s) => s.tables.length)
  const wanted = useTrainer((s) => s.settings.tables)
  const reviewing = useTrainer((s) => s.reviewing)
  const updateSettings = useTrainer((s) => s.updateSettings)
  // Subscribing to the tables keeps the active-table highlight current.
  const active = useTrainer((s) => (s.tables.length > 1 ? s.activeTable() : 0))
  const wide = useMediaQuery(MULTI_QUERY)
  const multi = count > 1

  useEffect(() => {
    useTrainer.getState().setTableCount(wide ? wanted : 1)
  }, [wide, wanted])

  // A hidden tab pauses every table clock.
  useEffect(() => {
    const onVisibility = () => useTrainer.getState().setHidden(document.hidden)
    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Leaving the trainer closes the review panel so the clocks don't stay paused.
  useEffect(() => () => useTrainer.getState().setReviewing(null), [])

  const handlers = useRef(new Map<number, KeyHandler>())
  const register = useCallback((index: number, handler: KeyHandler | null) => {
    if (handler) handlers.current.set(index, handler)
    else handlers.current.delete(index)
  }, [])

  // One keyboard listener: keys go to the review panel when open, else to the active table.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!ready || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target instanceof HTMLInputElement) return
      const key = e.key.toLowerCase()
      const s = useTrainer.getState()
      if (s.reviewing !== null) {
        if (key === 'escape') s.setReviewing(null)
        else if (key === ' ' || key === 'enter') s.next(s.reviewing)
        else return
        e.preventDefault()
        return
      }
      const target = s.tables.length === 1 ? 0 : s.activeTable()
      if (target !== null) handlers.current.get(target)?.(key, e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready])

  if (!ready) return null

  return (
    <main className={`main${multi ? ' main-multi' : ''}`}>
      {wide && (
        <div className="tables-switch">
          <span className="muted">{t('multi.tables')}</span>
          <div className="lang" role="group" aria-label={t('multi.tables')}>
          {COUNTS.map((n) => (
            <button key={n} type="button" aria-pressed={wanted === n} onClick={() => updateSettings({ tables: n })}>
              {n}
            </button>
          ))}
          </div>
        </div>
      )}
      <div className={`tables-layout${reviewing !== null ? ' has-review' : ''}`}>
        <div className={`tables-grid${multi ? ' multi' : ''}`} data-count={count}>
          {Array.from({ length: count }, (_, i) => (
            <TablePanel key={i} index={i} multi={multi} active={multi && active === i} register={register} />
          ))}
        </div>
        {multi && reviewing !== null && <ReviewPanel index={reviewing} />}
      </div>
    </main>
  )
}
