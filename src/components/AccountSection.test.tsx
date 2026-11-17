// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { TrainerDb } from '../db/repo'
import { setLanguage } from '../i18n'
import { useAccount } from '../sync/account'
import { createFakeCloud } from '../sync/fakeCloud'
import { AccountSection } from './AccountSection'

let n = 0
let cloud: ReturnType<typeof createFakeCloud>

async function start(configured = true) {
  cloud = createFakeCloud()
  const db = new TrainerDb(`account-ui-${n++}`)
  await act(() => useAccount.getState().init({ db, configured, loadCloud: async () => cloud, onApplied: () => {} }))
}

beforeEach(() => setLanguage('ru'))

describe('AccountSection', () => {
  it('is hidden until the cloud is configured', async () => {
    await start(false)
    const { container } = render(<AccountSection />)
    expect(container).toBeEmptyDOMElement()
  })

  it('creates an account and shows the sync state', async () => {
    await start()
    const user = userEvent.setup()
    render(<AccountSection />)
    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }))
    expect(await screen.findByText('Вы вошли как me@example.com')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('sync-state')).toHaveTextContent(/Синхронизировано в/))

    await user.click(screen.getByRole('button', { name: 'Выйти' }))
    expect(await screen.findByRole('button', { name: 'Войти' })).toBeInTheDocument()
  })

  it('explains a wrong password and sends a reset email', async () => {
    await start()
    const user = userEvent.setup()
    render(<AccountSection />)
    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'wrong12')
    await user.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный email или пароль')
    await user.click(screen.getByRole('button', { name: 'Забыл пароль' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Письмо для сброса пароля отправлено на me@example.com')
    expect(cloud.resets).toEqual(['me@example.com'])
  })

  it('deletes the account after the password is confirmed', async () => {
    await start()
    const user = userEvent.setup()
    render(<AccountSection />)
    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }))
    await user.click(await screen.findByRole('button', { name: 'Удалить аккаунт' }))
    await user.type(screen.getByLabelText('Пароль'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Удалить навсегда' }))
    expect(await screen.findByText('Аккаунт удалён. Данные на этом устройстве сохранены.')).toBeInTheDocument()
    expect(cloud.accounts.size).toBe(0)
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument()
  })
})
