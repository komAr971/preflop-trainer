// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ALL_HANDS } from '../core/hands'
import { STARTER_ID, TrainerDb, createDexieRepo, type Repo } from '../db/repo'
import { setLanguage } from '../i18n'
import { useTrainer } from '../store/trainerStore'
import { DrawPage } from './DrawPage'

let repo: Repo
let n = 0

beforeEach(async () => {
  setLanguage('ru')
  repo = createDexieRepo(new TrainerDb(`draw-${n++}`))
  await act(() => useTrainer.getState().init(repo))
})

const cell = (hand: string) => document.querySelector(`[data-hand="${hand}"]`)!

describe('DrawPage', () => {
  it('paints, checks and saves the score; shows the expected strategy', async () => {
    const user = userEvent.setup()
    render(<DrawPage />)
    await user.selectOptions(screen.getByRole('combobox'), 'rfi:UTG')
    // Paint the whole UTG range except AJo.
    const { chart } = useTrainer.getState()
    const utg = chart.spots.get('rfi:UTG')!
    for (const h of ALL_HANDS) {
      if (utg.hands.get(h)!.raise === 1 && h !== 'AJo') {
        fireEvent.pointerDown(cell(h))
        fireEvent.pointerUp(cell(h))
      }
    }
    await user.click(screen.getByRole('button', { name: 'Проверить' }))
    expect(screen.getByRole('status')).toHaveTextContent(/Совпадение 9\d\.\d% · ошибок: 1/)
    expect(cell('AJo')).toHaveAttribute('data-ok', 'false')
    expect(screen.getByTestId('draw-detail')).toHaveTextContent('AJo: нарисовано Фолд · в чарте Рейз 100%')
    await waitFor(async () => expect(await repo.listDrawings(STARTER_ID)).toHaveLength(1))
  })

  it('starts over on the same spot', async () => {
    const user = userEvent.setup()
    render(<DrawPage />)
    await user.click(screen.getByRole('button', { name: 'Проверить' }))
    await user.click(screen.getByRole('button', { name: 'Ещё раз этот спот' }))
    expect(screen.getByRole('button', { name: 'Проверить' })).toBeInTheDocument()
  })
})
