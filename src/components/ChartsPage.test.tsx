// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { starterChart } from '../data/starterChart'
import { STARTER_ID, TrainerDb, createDexieRepo, type Repo } from '../db/repo'
import { setLanguage } from '../i18n'
import { useTrainer } from '../store/trainerStore'
import { readText } from '../ui/download'
import { ChartsPage } from './ChartsPage'

let repo: Repo
let n = 0

beforeEach(async () => {
  setLanguage('ru')
  repo = createDexieRepo(new TrainerDb(`charts-page-${n++}`))
  await act(() => useTrainer.getState().init(repo))
})

const jsonFile = (name: string, data: unknown) =>
  new File([typeof data === 'string' ? data : JSON.stringify(data)], name, { type: 'application/json' })

describe('ChartsPage', () => {
  it('lists the built-in chart as active', async () => {
    render(<ChartsPage />)
    const row = await screen.findByTestId(`chart-${STARTER_ID}`)
    expect(row).toHaveTextContent('встроенный')
    expect(row).toHaveTextContent('активный')
    expect(within(row).queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument()
  })

  it('imports a valid chart file', async () => {
    const user = userEvent.setup()
    render(<ChartsPage />)
    await user.upload(screen.getByTestId('import-input'), jsonFile('mine.json', { ...starterChart, name: 'Импортный' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Импортирован чарт «Импортный»')
    expect(await screen.findByText('Импортный')).toBeInTheDocument()
  })

  it('shows readable errors for an invalid file and saves nothing', async () => {
    const user = userEvent.setup()
    render(<ChartsPage />)
    const bad = { ...starterChart, spots: [{ spot: { kind: 'rfi', hero: 'CO' }, actions: { raise: 'AA,QXs' } }] }
    await user.upload(screen.getByTestId('import-input'), jsonFile('bad.json', bad))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('bad.json')
    expect(alert).toHaveTextContent('rfi:CO raise: invalid token "QXs"')
    expect(await repo.listCharts()).toHaveLength(1)
  })

  it('copies, trains with and deletes a chart', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ChartsPage />)
    const starterRow = await screen.findByTestId(`chart-${STARTER_ID}`)
    await user.click(within(starterRow).getByRole('button', { name: 'Копировать' }))
    const copyName = `${starterChart.name} (копия)`
    const copyRow = (await screen.findByText(copyName)).closest('li')!

    await user.click(within(copyRow).getByRole('button', { name: 'Тренировать' }))
    await waitFor(() => expect(useTrainer.getState().chartId).not.toBe(STARTER_ID))

    await user.click(within(copyRow).getByRole('button', { name: 'Удалить' }))
    await waitFor(() => expect(screen.queryByText(copyName)).not.toBeInTheDocument())
    expect(useTrainer.getState().chartId).toBe(STARTER_ID)
  })

  it('exports a chart as JSON', async () => {
    const user = userEvent.setup()
    const createUrl = vi.fn((blob: Blob) => (void blob, 'blob:x'))
    URL.createObjectURL = createUrl as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<ChartsPage />)
    const row = await screen.findByTestId(`chart-${STARTER_ID}`)
    await user.click(within(row).getByRole('button', { name: 'Экспорт' }))
    await waitFor(() => expect(createUrl).toHaveBeenCalled())
    const blob = createUrl.mock.calls[0][0]
    expect(JSON.parse(await readText(blob))).toEqual(starterChart)
  })
})
