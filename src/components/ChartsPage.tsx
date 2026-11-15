import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseChartJson } from '../core/chart'
import { starterChart } from '../data/starterChart'
import { STARTER_ID, type ChartSummary } from '../db/repo'
import { useTrainer } from '../store/trainerStore'
import { downloadJson, fileNameFor, readText } from '../ui/download'
import { navigate } from '../ui/useHashRoute'

type Notice = { kind: 'ok'; text: string } | { kind: 'error'; text: string; details: string[] }

const MAX_ERRORS_SHOWN = 10

export function ChartsPage() {
  const { t } = useTranslation()
  const repo = useTrainer((s) => s.repo)
  const activeId = useTrainer((s) => s.chartId)
  const selectChart = useTrainer((s) => s.selectChart)
  const [charts, setCharts] = useState<ChartSummary[] | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    if (repo) setCharts(await repo.listCharts())
  }, [repo])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!repo) return <p className="notice error">{t('charts.noStorage')}</p>

  const onImport = async (file: File) => {
    const res = parseChartJson(await readText(file))
    if (!res.ok) {
      setNotice({ kind: 'error', text: t('charts.importFailed', { file: file.name }), details: res.errors })
      return
    }
    await repo.saveChart(res.file)
    setNotice({ kind: 'ok', text: t('charts.imported', { name: res.file.name }) })
    await refresh()
  }

  const onCreate = async () => {
    const id = await repo.saveChart({ ...starterChart, name: t('charts.newName'), description: undefined })
    navigate({ page: 'edit', chartId: id })
  }

  const onCopy = async (c: ChartSummary) => {
    const file = await repo.getChart(c.id)
    if (!file) return
    await repo.saveChart({ ...file, name: t('charts.copyName', { name: c.name }) })
    setNotice({ kind: 'ok', text: t('charts.copied', { name: c.name }) })
    await refresh()
  }

  const onExport = async (c: ChartSummary) => {
    const file = await repo.getChart(c.id)
    if (file) downloadJson(fileNameFor(c.name), file)
  }

  const onDelete = async (c: ChartSummary) => {
    if (!window.confirm(t('charts.confirmDelete', { name: c.name }))) return
    await repo.deleteChart(c.id)
    if (c.id === activeId) await selectChart(STARTER_ID)
    await refresh()
  }

  const onTrain = async (c: ChartSummary) => {
    await selectChart(c.id)
    navigate({ page: 'train' })
  }

  return (
    <main className="charts">
      <div className="charts-toolbar">
        <button type="button" onClick={() => void onCreate()}>
          {t('charts.create')}
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          {t('charts.import')}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          data-testid="import-input"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void onImport(file)
          }}
        />
      </div>

      {notice && (
        <div className={`notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          <p>{notice.text}</p>
          {notice.kind === 'error' && (
            <ul>
              {notice.details.slice(0, MAX_ERRORS_SHOWN).map((d) => (
                <li key={d}>
                  <code>{d}</code>
                </li>
              ))}
              {notice.details.length > MAX_ERRORS_SHOWN && (
                <li>{t('charts.moreErrors', { count: notice.details.length - MAX_ERRORS_SHOWN })}</li>
              )}
            </ul>
          )}
        </div>
      )}

      <ul className="chart-list">
        {charts?.map((c) => (
          <li key={c.id} className={c.id === activeId ? 'is-active' : ''} data-testid={`chart-${c.id}`}>
            <div className="chart-name">
              <b>{c.name}</b>
              {c.builtin && <span className="tag">{t('charts.builtin')}</span>}
              {c.id === activeId && <span className="tag tag-active">{t('charts.active')}</span>}
            </div>
            <div className="chart-actions">
              <button type="button" onClick={() => void onTrain(c)}>
                {t('charts.train')}
              </button>
              {!c.builtin && (
                <button type="button" onClick={() => navigate({ page: 'edit', chartId: c.id })}>
                  {t('charts.edit')}
                </button>
              )}
              <button type="button" onClick={() => void onCopy(c)}>
                {t('charts.copy')}
              </button>
              <button type="button" onClick={() => void onExport(c)}>
                {t('charts.export')}
              </button>
              {!c.builtin && (
                <button type="button" className="danger" onClick={() => void onDelete(c)}>
                  {t('charts.delete')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
