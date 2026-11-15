// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { correctActions, mulberry32 } from './core/trainer'
import i18n, { setLanguage } from './i18n'
import { useTrainer } from './store/trainerStore'

const actionLabel = { fold: /^(Фолд|Fold)/, call: /^(Колл|Call|Лимп|Limp)/, raise: /^(Рейз|Raise|3-бет|4-бет|3-bet|4-bet)/ }

beforeEach(() => {
  window.location.hash = ''
  setLanguage('ru')
  const { chart } = useTrainer.getState()
  act(() => useTrainer.getState().reset(chart, mulberry32(42)))
})

describe('App', () => {
  it('renders table with hero cards, 6 seats and actions', () => {
    const { container } = render(<App />)
    expect(container.querySelectorAll('[data-position]')).toHaveLength(6)
    expect(container.querySelectorAll('[data-card]')).toHaveLength(2)
    expect(screen.getByRole('button', { name: actionLabel.fold })).toBeInTheDocument()
  })

  it('marks a correct answer and counts it', async () => {
    const user = userEvent.setup()
    render(<App />)
    const { question } = useTrainer.getState()
    const right = correctActions(question.freqs)[0]
    await user.click(screen.getByRole('button', { name: actionLabel[right] }))
    expect(screen.getByRole('status')).toHaveTextContent('Верно')
    expect(screen.getByTestId('score')).toHaveTextContent('1/1')
  })

  it('marks a wrong answer and waits for Next', async () => {
    const user = userEvent.setup()
    render(<App />)
    const { question } = useTrainer.getState()
    const accepted = correctActions(question.freqs)
    const wrong = question.scenario.actions.find((o) => !accepted.includes(o.action))!.action
    await user.click(screen.getByRole('button', { name: actionLabel[wrong] }))
    expect(screen.getByRole('status')).toHaveTextContent('Ошибка')
    expect(screen.getByTestId('score')).toHaveTextContent('0/1')
    await user.keyboard(' ')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(useTrainer.getState().question.id).toBe(1)
  })

  it('answers with keyboard hotkeys', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('f')
    expect(useTrainer.getState().answer?.action).toBe('fold')
  })

  it('switches language in settings', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/settings'
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'EN' }))
    expect(i18n.language).toBe('en')
    act(() => {
      window.location.hash = '#/'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(await screen.findByRole('button', { name: /^Fold/ })).toBeInTheDocument()
  })

  it('shows MP by default and HJ when chosen in settings', async () => {
    const { container } = render(<App />)
    const seat = () => container.querySelector('[data-position="HJ"] .seat-pos')!.textContent
    expect(seat()).toMatch(/^MP/)
    act(() => useTrainer.getState().updateSettings({ middleName: 'HJ' }))
    expect(seat()).toMatch(/^HJ/)
    act(() => useTrainer.getState().updateSettings({ middleName: 'MP' }))
  })
})
