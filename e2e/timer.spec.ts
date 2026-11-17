import { expect, test } from '@playwright/test'

test('with a 5 s limit the hand times out; answer time is shown', async ({ page }, info) => {
  await page.goto('/#/settings')
  await page.getByRole('group', { name: /(Лимит времени|time limit)/ }).getByRole('button', { name: /^5/ }).click()
  // In-app navigation: the setting is already in memory, no wait for IndexedDB.
  await page.goto('/#/')
  const timer = page.getByTestId('timer')
  await expect(timer).toHaveAttribute('data-limit', '5')
  await expect(timer).toHaveAttribute('data-seconds', /^[45]$/)
  await page.screenshot({ path: `test-results/timer-${info.project.name}.png` })
  await expect(timer).toHaveAttribute('data-urgent', 'true', { timeout: 4000 })
  const status = page.getByRole('status')
  await expect(status).toContainText(/(Время вышло|Time is up)/, { timeout: 6000 })
  await expect(status).toContainText(/(Стратегия|Strategy)/)
  await page.screenshot({ path: `test-results/timeup-${info.project.name}.png`, fullPage: true })
  // No auto-next after a timeout: the hand waits for the user.
  await page.waitForTimeout(1000)
  await expect(status).toContainText(/(Время вышло|Time is up)/)

  await page.getByRole('button', { name: /^(Дальше|Next)/ }).click()
  await page.locator('.action-bar .action').first().click()
  await expect(page.getByTestId('answer-time')).toContainText(/\d\.\d/)
})
