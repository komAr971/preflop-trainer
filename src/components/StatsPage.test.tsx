// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { STARTER_ID, TrainerDb, createDexieRepo, type Repo } from '../db/repo'
import { setLanguage } from '../i18n'
import { useTrainer } from '../store/trainerStore'
import { SettingsPage } from './SettingsPage'
import { StatsPage } from './StatsPage'

let repo: Repo
let n = 0
/** Strictly increasing timestamps so "most recent" is unambiguous. */
let clock = Date.now()

beforeEach(async () => {
  setLanguage('ru')
  repo = createDexieRepo(new TrainerDb(`stats-${n++}`))
  await act(() => useTrainer.getState().init(repo))
})

async function record(count: number, correct: boolean, spotKey = 'rfi:CO') {
  for (let i = 0; i < count; i++) {
    await repo.recordAttempt(
      { chartId: STARTER_ID, spotKey, hand: 'K9o', action: 'fold', correct, ts: clock++ },
      [],
      i,
    )
  }
}

describe('StatsPage', () => {
  it('shows today, accuracy and a learned spot', async () => {
    act(() => useTrainer.getState().updateSettings({ learnedWindow: 10, dailyGoal: 12 }))
    await record(2, false)
    await record(10, true)
    render(<StatsPage />)
    expect(await screen.findByTestId('stat-today')).toHaveTextContent('12 / 12')
    expect(screen.getByTestId('stat-streak')).toHaveTextContent('1 день')
    expect(screen.getByTestId('stat-accuracy')).toHaveTextContent('83%')
    expect(screen.getByTestId('stat-learned')).toHaveTextContent('1 / 50')
    const row = screen.getByTestId('spot-rfi:CO')
    expect(row).toHaveTextContent('100%')
    expect(within(row).getByText('выучено')).toBeInTheDocument()
    expect(document.querySelector('[data-hand="K9o"]')).toHaveAttribute('title', 'K9o: 2/12')
  })
})

describe('SettingsPage', () => {
  it('saves changed settings', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    const goal = screen.getByRole('spinbutton', { name: /Цель на день/ })
    await user.clear(goal)
    await user.type(goal, '50')
    await user.click(screen.getByRole('checkbox', { name: 'Звуки включены' }))
    await new Promise((r) => setTimeout(r, 20))
    expect(await repo.getSettings()).toMatchObject({ dailyGoal: 50, sound: false })
  })
})
