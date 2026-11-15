import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseChart, serializeChart, type Chart, type Sizings, type Spot, type SpotKey } from '../core/chart'
import {
  ALL_SPOTS,
  addSpot,
  allowedActions,
  paintHands,
  rangeWidth,
  removeSpot,
  setActionRange,
  setName,
  setSizings,
  type Brush,
} from '../core/chartEdit'
import { formatRange, type Range } from '../core/range'
import { STARTER_ID } from '../db/repo'
import { useTrainer } from '../store/trainerStore'
import { navigate } from '../ui/useHashRoute'
import { RangeGrid } from './RangeGrid'

const PRESETS: { id: 'fold' | 'call' | 'raise'; brush: Brush }[] = [
  { id: 'raise', brush: { raise: 1, call: 0 } },
  { id: 'call', brush: { raise: 0, call: 1 } },
  { id: 'fold', brush: { raise: 0, call: 0 } },
]

const SIZING_KEYS: (keyof Sizings)[] = ['openBb', 'sbOpenBb', 'threeBetIpX', 'threeBetOopX', 'fourBetX']

function useSpotLabel() {
  const { t } = useTranslation()
  return (spot: Spot) =>
    spot.kind === 'rfi'
      ? t('spotLabel.rfi', { hero: spot.hero })
      : t(`spotLabel.${spot.kind}`, { hero: spot.hero, villain: spot.villain })
}

function actionRangeText(chart: Chart, key: SpotKey, action: 'call' | 'raise'): string {
  const spot = chart.spots.get(key)
  if (!spot) return ''
  const range: Range = new Map()
  for (const [hand, f] of spot.hands) if (f[action] > 0) range.set(hand, f[action])
  return formatRange(range)
}

export function ChartEditor({ chartId }: { chartId: number }) {
  const { t } = useTranslation()
  const spotLabel = useSpotLabel()
  const repo = useTrainer((s) => s.repo)
  const activeId = useTrainer((s) => s.chartId)
  const selectChart = useTrainer((s) => s.selectChart)

  const [chart, setChart] = useState<Chart | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)
  const [spotKey, setSpotKey] = useState<SpotKey>(ALL_SPOTS[0].key)
  const [brush, setBrush] = useState<Brush>(PRESETS[0].brush)
  const [texts, setTexts] = useState<{ call: string; raise: string }>({ call: '', raise: '' })
  const [rangeError, setRangeError] = useState<string | null>(null)

  useEffect(() => {
    if (!repo) return
    if (chartId === STARTER_ID) {
      setLoadError(t('editor.readOnly'))
      return
    }
    void repo.getChart(chartId).then((file) => {
      const res = file && parseChart(file)
      if (!res) setLoadError(t('editor.notFound'))
      else if (!res.ok) setLoadError(res.errors.join('\n'))
      else setChart(res.chart)
    })
  }, [repo, chartId, t])

  // Range text boxes follow the current spot.
  useEffect(() => {
    if (!chart) return
    setTexts({ call: actionRangeText(chart, spotKey, 'call'), raise: actionRangeText(chart, spotKey, 'raise') })
    setRangeError(null)
    // Only refresh on spot change or after edits elsewhere (chart identity).
  }, [chart, spotKey])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const current = chart?.spots.get(spotKey)
  const spotDef = ALL_SPOTS.find((s) => s.key === spotKey)!
  const actions = allowedActions(spotDef.spot)
  const widths = useMemo(
    () => current && { raise: rangeWidth(current, 'raise'), call: rangeWidth(current, 'call') },
    [current],
  )

  if (loadError) return <p className="notice error">{loadError}</p>
  if (!repo || !chart) return null

  /** Always applies to the latest chart, so fast strokes never overwrite each other. */
  const edit = (update: (prev: Chart) => Chart) => {
    setChart((prev) => (prev ? update(prev) : prev))
    setDirty(true)
    setSavedNotice(false)
  }

  const save = async () => {
    if (!chart.name.trim()) return
    if (chart.spots.size === 0) {
      window.alert(t('editor.needSpot'))
      return
    }
    await repo.saveChart(serializeChart(chart), chartId)
    if (chartId === activeId) await selectChart(chartId)
    setDirty(false)
    setSavedNotice(true)
  }

  const back = () => {
    if (dirty && !window.confirm(t('editor.confirmLeave'))) return
    navigate({ page: 'charts' })
  }

  const applyText = (action: 'call' | 'raise') => {
    const res = setActionRange(chart, spotKey, action, texts[action])
    if (!res.ok) setRangeError(res.error)
    else edit(() => res.chart)
  }

  const brushId = PRESETS.find((p) => p.brush.raise === brush.raise && p.brush.call === brush.call)?.id ?? 'mix'
  const callAllowed = actions.includes('call')

  return (
    <main className="editor">
      <div className="editor-top">
        <button type="button" onClick={back}>
          ← {t('editor.back')}
        </button>
        <input
          className="editor-name"
          aria-label={t('editor.name')}
          value={chart.name}
          onChange={(e) => {
            const name = e.target.value
            edit((c) => setName(c, name))
          }}
        />
        <button type="button" className="primary" disabled={!dirty || !chart.name.trim()} onClick={() => void save()}>
          {t('editor.save')}
        </button>
        {savedNotice && (
          <span className="saved" role="status">
            {t('editor.saved')}
          </span>
        )}
      </div>

      <details className="sizings">
        <summary>{t('editor.sizings')}</summary>
        <div className="sizings-grid">
          {SIZING_KEYS.map((k) => (
            <label key={k}>
              {t(`sizing.${k}`)}
              <input
                type="number"
                min={1}
                step={0.1}
                value={chart.sizings[k]}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (v > 0) edit((c) => setSizings(c, { [k]: v }))
                }}
              />
            </label>
          ))}
        </div>
      </details>

      <label className="spot-select">
        {t('editor.spot')}
        <select value={spotKey} onChange={(e) => setSpotKey(e.target.value)}>
          {(['rfi', 'vsOpen', 'vs3bet'] as const).map((kind) => (
            <optgroup key={kind} label={t(`spotKind.${kind}`)}>
              {ALL_SPOTS.filter((s) => s.spot.kind === kind).map((s) => (
                <option key={s.key} value={s.key}>
                  {spotLabel(s.spot)}
                  {chart.spots.has(s.key) ? '' : ` — ${t('editor.empty')}`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {!current ? (
        <div className="notice">
          <p>{t('editor.spotMissing')}</p>
          <button type="button" onClick={() => edit((c) => addSpot(c, spotDef.spot))}>
            {t('editor.addSpot')}
          </button>
        </div>
      ) : (
        <>
          <div className="brushes" role="radiogroup" aria-label={t('editor.brush')}>
            {PRESETS.filter((p) => p.id !== 'call' || callAllowed).map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={brushId === p.id}
                className={`brush brush-${p.id}`}
                onClick={() => setBrush(p.brush)}
              >
                {t(`actionName.${p.id}`)}
              </button>
            ))}
            <span className="brush-mix">
              <label>
                {t('actionName.raise')} %
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(brush.raise * 100)}
                  onChange={(e) => {
                    const raise = Math.min(1, Math.max(0, Number(e.target.value) / 100))
                    setBrush({ raise, call: Math.min(brush.call, 1 - raise) })
                  }}
                />
              </label>
              {callAllowed && (
                <label>
                  {t('actionName.call')} %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(brush.call * 100)}
                    onChange={(e) => {
                      const call = Math.min(1, Math.max(0, Number(e.target.value) / 100))
                      setBrush({ call, raise: Math.min(brush.raise, 1 - call) })
                    }}
                  />
                </label>
              )}
            </span>
          </div>

          <RangeGrid spot={current} onPaint={(hands) => edit((c) => paintHands(c, spotKey, hands, brush))} />

          <p className="widths" data-testid="widths">
            {t('actionName.raise')} {widths!.raise.toFixed(1)}%
            {callAllowed && ` · ${t('actionName.call')} ${widths!.call.toFixed(1)}%`}
          </p>

          <div className="range-texts">
            {(['raise', 'call'] as const)
              .filter((a) => a === 'raise' || callAllowed)
              .map((a) => (
                <label key={a}>
                  {t('editor.rangeFor', { action: t(`actionName.${a}`) })}
                  <textarea
                    rows={2}
                    value={texts[a]}
                    spellCheck={false}
                    onChange={(e) => setTexts({ ...texts, [a]: e.target.value })}
                  />
                  <button type="button" onClick={() => applyText(a)}>
                    {t('editor.apply')}
                  </button>
                </label>
              ))}
            {rangeError && (
              <p className="notice error" role="alert">
                {rangeError}
              </p>
            )}
          </div>

          <button
            type="button"
            className="danger"
            onClick={() => {
              if (window.confirm(t('editor.confirmRemoveSpot'))) edit((c) => removeSpot(c, spotKey))
            }}
          >
            {t('editor.removeSpot')}
          </button>
        </>
      )}
    </main>
  )
}
