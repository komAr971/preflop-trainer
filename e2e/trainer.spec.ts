import { expect, test } from '@playwright/test'

test('plays a few hands', async ({ page }, info) => {
  await page.goto('/')
  await expect(page.locator('[data-position]')).toHaveCount(6)
  await expect(page.locator('[data-card]')).toHaveCount(2)
  await expect(page.locator('svg.table')).toHaveAttribute('data-layout', info.project.name === 'mobile' ? 'portrait' : 'landscape')
  await page.waitForTimeout(400) // let deal animation finish
  await page.screenshot({ path: `test-results/table-${info.project.name}.png`, fullPage: true })

  for (let i = 0; i < 3; i++) {
    // First available action (BB facing limps has no Fold button).
    await page.locator('.action-bar .action').first().click()
    await expect(page.getByRole('status')).toBeVisible()
    if (i === 0) await page.screenshot({ path: `test-results/feedback-${info.project.name}.png`, fullPage: true })
    await page.getByRole('button', { name: /^(Дальше|Next)/ }).click({ timeout: 2000 }).catch(() => {})
    await expect(page.getByRole('status')).toBeHidden()
  }
  await expect(page.getByTestId('score')).toContainText('/3')
})

test('enter a raise size', async ({ page }, info) => {
  await page.goto('/')
  // Skip hands where raising is an all-in (no size to type).
  for (let i = 0; i < 20 && (await page.getByRole('button', { name: /…/ }).count()) === 0; i++) {
    await page.locator('.action-bar .action').first().click()
    await page.keyboard.press('Space')
  }
  await page.getByRole('button', { name: /…/ }).click()
  const input = page.getByRole('textbox', { name: /(Размер рейза|Raise size)/ })
  await expect(input).toBeFocused()
  await input.fill('7.5')
  await page.screenshot({ path: `test-results/size-${info.project.name}.png` })
  await input.press('Enter')
  await expect(page.getByRole('status')).toBeVisible()
  await page.screenshot({ path: `test-results/size-result-${info.project.name}.png` })
})
