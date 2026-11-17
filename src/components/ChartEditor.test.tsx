// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseChart } from '../core/chart'
import { starterChart } from '../data/starterChart'
import { STARTER_ID, TrainerDb, createDexieRepo, type Repo } from '../db/repo'
import { setLanguage } from '../i18n'
import { useTrainer } from '../store/trainerStore'
import { ChartEditor } from './ChartEditor'

let repo: Repo
let id: string
let n = 0

beforeEach(async () => {
  setLanguage('ru')
  repo = createDexieRepo(new TrainerDb(`editor-${n++}`))
  id = await repo.saveChart({ ...starterChart, name: 'Мой' })
  await act(() => useTrainer.getState().init(repo))
})

async function saved() {
  const res = parseChart(await repo.getChart(id))
  if (!res.ok) throw new Error(res.errors.join())
  return res.chart
}

const cell = (hand: string) => document.querySelector(`[data-hand="${hand}"]`)!

describe('ChartEditor', () => {
  it('refuses to edit the built-in chart', async () => {
    render(<ChartEditor chartId={STARTER_ID} />)
    expect(await screen.findByText(/нельзя менять/)).toBeInTheDocument()
  })

  it('paints a hand and saves the chart', async () => {
    const user = userEvent.setup()
    render(<ChartEditor chartId={id} />)
    await screen.findByRole('grid')
    // First spot is RFI UTG; 72o folds in the starter chart.
    fireEvent.pointerDown(cell('72o'))
    fireEvent.pointerUp(cell('72o'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await screen.findByText('Сохранено')
    expect((await saved()).spots.get('rfi:UTG')!.hands.get('72o')!.raise).toBe(1)
  })

  it('applies a pasted range and shows errors for bad input', async () => {
    const user = userEvent.setup()
    render(<ChartEditor chartId={id} />)
    const box = await screen.findByRole('textbox', { name: /Диапазон: Рейз/ })
    fireEvent.change(box, { target: { value: 'AA,QXs' } })
    await user.click(screen.getAllByRole('button', { name: 'Применить' })[0])
    expect(await screen.findByRole('alert')).toHaveTextContent('QXs')

    fireEvent.change(box, { target: { value: 'QQ+' } })
    await user.click(screen.getAllByRole('button', { name: 'Применить' })[0])
    await waitFor(() => expect(screen.getByTestId('widths')).toHaveTextContent('Рейз 1.4%'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await screen.findByText('Сохранено')
    expect((await saved()).spots.get('rfi:UTG')!.hands.get('JJ')!.raise).toBe(0)
  })

  it('renames the chart', async () => {
    const user = userEvent.setup()
    render(<ChartEditor chartId={id} />)
    const name = await screen.findByRole('textbox', { name: 'Название чарта' })
    await user.clear(name)
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
    await user.type(name, 'Новое имя')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await screen.findByText('Сохранено')
    expect((await saved()).name).toBe('Новое имя')
  })

  it('reloads the trainer when the active chart is saved', async () => {
    const user = userEvent.setup()
    await act(() => useTrainer.getState().selectChart(id))
    render(<ChartEditor chartId={id} />)
    await screen.findByRole('grid')
    fireEvent.pointerDown(cell('72o'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await screen.findByText('Сохранено')
    expect(useTrainer.getState().chart.spots.get('rfi:UTG')!.hands.get('72o')!.raise).toBe(1)
  })
})
