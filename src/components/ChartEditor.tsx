import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseChart, serializeChart, type Chart, type Sizings, type SpotKey } from '../core/chart'
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
import { isBuiltin, type ChartId } from '../db/repo'
import { useTrainer } from '../store/trainerStore'
import { navigate } from '../ui/useHashRoute'
import { NumberField } from './NumberField'
import { RangeGrid } from './RangeGrid'
import { useActionName } from './actionLabels'
import { useSpotLabel } from './spotLabel'

const PRESETS: { id: 'fold' | 'call' | 'raise'; brush: Brush }[] = [
  { id: 'raise', brush: { raise: 1, call: 0 } },
  { id: 'call', brush: { raise: 0, call: 1 } },
  { id: 'fold', brush: { raise: 0, call: 0 } },
]

const SIZING_KEYS: (keyof Sizings)[] = ['openBb', 'sbOpenBb', 'threeBetIpX', 'threeBetOopX', 'fourBetX', 'isoIpBb', 'isoOopBb']

function actionRangeText(chart: Chart, key: SpotKey, action: 'call' | 'raise'): string {
  const spot = chart.spots.get(key)
  if (!spot) return ''
  const range: Range = new Map()
  for (const [hand, f] of spot.hands) if (f[action] > 0) range.set(hand, f[action])
  return formatRange(range)
}

export function ChartEditor({ chartId }: { chartId: ChartId }) {
  const { t } = useTranslation()
  const spotLabel = useSpotLabel()
  const name = useActionName()
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
    if (isBuiltin(chartId)) {
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
              <NumberField
                value={chart.sizings[k]}
                min={1}
                max={100}
                step={0.1}
                onChange={(v) => edit((c) => setSizings(c, { [k]: v }))}
              />
            </label>
          ))}
        </div>
      </details>

      <label className="spot-select">
        {t('editor.spot')}
        <select value={spotKey} onChange={(e) => setSpotKey(e.target.value)}>
          {(['rfi', 'vsOpen', 'vs3bet', 'vs4bet', 'vsLimp'] as const).map((kind) => (
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
            {PRESETS.filter((p) => actions.includes(p.id)).map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={brushId === p.id}
                className={`brush brush-${p.id}`}
                onClick={() => setBrush(p.brush)}
              >
                {name(spotDef.spot, p.id)}
              </button>
            ))}
            <span className="brush-mix">
              <label>
                {t('actionName.raise')} %
                <NumberField
                  integer
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(brush.raise * 100)}
                  onChange={(v) => setBrush({ raise: v / 100, call: Math.min(brush.call, 1 - v / 100) })}
                />
              </label>
              {callAllowed && (
                <label>
                  {name(spotDef.spot, 'call')} %
                  <NumberField
                    integer
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(brush.call * 100)}
                    onChange={(v) => setBrush({ call: v / 100, raise: Math.min(brush.raise, 1 - v / 100) })}
                  />
                </label>
              )}
            </span>
          </div>

          <RangeGrid spot={current} onPaint={(hands) => edit((c) => paintHands(c, spotKey, hands, brush))} />

          <p className="widths" data-testid="widths">
            {t('actionName.raise')} {widths!.raise.toFixed(1)}%
            {callAllowed && ` · ${name(spotDef.spot, 'call')} ${widths!.call.toFixed(1)}%`}
          </p>

          <div className="range-texts">
            {(['raise', 'call'] as const)
              .filter((a) => a === 'raise' || callAllowed)
              .map((a) => (
                <label key={a}>
                  {t('editor.rangeFor', { action: name(spotDef.spot, a) })}
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
