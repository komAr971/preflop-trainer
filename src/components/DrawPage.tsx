import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ACTIONS, type Action, type SpotKey } from '../core/chart'
import { ALL_SPOTS, allowedActions } from '../core/chartEdit'
import { checkDrawing, drawingToSpot, type Drawing, type DrawResult } from '../core/draw'
import type { Hand } from '../core/hands'
import { useTrainer } from '../store/trainerStore'
import { navigate } from '../ui/useHashRoute'
import { DiffGrid } from './DiffGrid'
import { RangeGrid } from './RangeGrid'
import { useSpotLabel } from './spotLabel'

export function DrawPage() {
  const { t } = useTranslation()
  const spotLabel = useSpotLabel()
  const chart = useTrainer((s) => s.chart)
  const chartId = useTrainer((s) => s.chartId)
  const repo = useTrainer((s) => s.repo)
  const threshold = useTrainer((s) => s.settings.threshold)
  const rng = useTrainer((s) => s.rng)

  const spots = useMemo(() => ALL_SPOTS.filter((s) => chart.spots.has(s.key)), [chart])
  const randomKey = () => spots[Math.floor(rng() * spots.length)].key
  const [spotKey, setSpotKey] = useState<SpotKey>(randomKey)
  const [drawing, setDrawing] = useState<Drawing>(new Map())
  const [brush, setBrush] = useState<Action>('raise')
  const [result, setResult] = useState<DrawResult | null>(null)
  const [selected, setSelected] = useState<Hand | null>(null)

  const target = chart.spots.get(spotKey)
  if (!target) return null
  const actions = allowedActions(target.spot)

  const start = (key: SpotKey) => {
    setSpotKey(key)
    setDrawing(new Map())
    setResult(null)
    setSelected(null)
  }

  const check = () => {
    const res = checkDrawing(target, drawing, threshold)
    setResult(res)
    setSelected(res.wrong[0] ?? null)
    repo
      ?.recordDrawing({ chartId, spotKey, score: res.score, ts: Date.now() })
      .catch((e) => console.error('Failed to save drawing', e))
  }

  const sel = selected && result?.cells.get(selected)

  return (
    <main className="draw">
      <div className="draw-top">
        <button type="button" onClick={() => navigate({ page: 'train' })}>
          ← {t('draw.back')}
        </button>
        <select value={spotKey} onChange={(e) => start(e.target.value)} aria-label={t('editor.spot')}>
          {spots.map((s) => (
            <option key={s.key} value={s.key}>
              {spotLabel(s.spot)}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => start(randomKey())}>
          🎲 {t('draw.random')}
        </button>
      </div>

      <p className="draw-task">{t('draw.task', { spot: spotLabel(target.spot) })}</p>

      {!result ? (
        <>
          <div className="brushes" role="radiogroup" aria-label={t('editor.brush')}>
            {(['raise', 'call', 'fold'] as const)
              .filter((a) => actions.includes(a))
              .map((a) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={brush === a}
                  className={`brush brush-${a}`}
                  onClick={() => setBrush(a)}
                >
                  {t(`actionName.${a}`)}
                </button>
              ))}
          </div>
          <RangeGrid
            spot={drawingToSpot(target.spot, drawing)}
            onPaint={(hands) =>
              setDrawing((prev) => {
                const next = new Map(prev)
                for (const h of hands) next.set(h, brush)
                return next
              })
            }
          />
          <div className="draw-actions">
            <button type="button" className="primary" onClick={check}>
              {t('draw.check')}
            </button>
            <button type="button" onClick={() => setDrawing(new Map())}>
              {t('draw.clear')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={`draw-score ${result.score >= 95 ? 'ok' : 'bad'}`} role="status">
            {t('draw.score', { score: result.score.toFixed(1), wrong: result.wrong.length })}
          </p>
          <DiffGrid result={result} selected={selected} onSelect={setSelected} />
          {sel && (
            <p className="draw-detail" data-testid="draw-detail">
              <b>{selected}</b>: {t('draw.drawn')} {t(`actionName.${sel.drawn}`)} · {t('draw.expected')}{' '}
              {ACTIONS.filter((a) => sel.expected[a] > 0)
                .map((a) => `${t(`actionName.${a}`)} ${Math.round(sel.expected[a] * 100)}%`)
                .join(' · ')}
            </p>
          )}
          <div className="draw-actions">
            <button type="button" className="primary" onClick={() => start(spotKey)}>
              {t('draw.again')}
            </button>
            <button type="button" onClick={() => start(randomKey())}>
              {t('draw.next')}
            </button>
          </div>
        </>
      )}
    </main>
  )
}
