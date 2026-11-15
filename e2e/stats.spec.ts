import { expect, test } from '@playwright/test'

test('stats reflect played hands; settings persist', async ({ page }, info) => {
  await page.goto('/')
  for (let i = 0; i < 5; i++) {
    // First available action (BB facing limps has no Fold button).
    await page.locator('.action-bar .action').first().click()
    await expect(page.getByRole('status')).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.getByRole('status')).toBeHidden()
  }
  await page.screenshot({ path: `test-results/trainer-${info.project.name}.png` })

  await page.goto('/#/stats')
  await expect(page.getByTestId('stat-today')).toContainText('5 / 100')
  await page.screenshot({ path: `test-results/stats-${info.project.name}.png`, fullPage: true })

  await page.goto('/#/settings')
  const goal = page.getByRole('spinbutton').first()
  await goal.fill('30')
  await page.reload()
  await expect(page.getByRole('spinbutton').first()).toHaveValue('30')
  await page.screenshot({ path: `test-results/settings-${info.project.name}.png`, fullPage: true })
})
