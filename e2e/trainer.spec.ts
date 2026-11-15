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

test('raise with the bet sizer; a mistake shows why and the chart', async ({ page }, info) => {
  await page.goto('/')
  // Skip hands where raising is an all-in (no sizer).
  for (let i = 0; i < 20 && (await page.getByRole('slider').count()) === 0; i++) {
    await page.locator('.action-bar .action').first().click()
    await page.keyboard.press('Space')
  }
  const input = page.getByRole('textbox', { name: /(Размер рейза|Raise size)/ })
  // Any legal size: one bb above the minimum raise.
  const size = Number(await page.getByRole('slider').getAttribute('min')) + 1
  await input.fill(String(size))
  await expect(page.locator('.action-raise')).toContainText(`${size}bb`)
  await page.screenshot({ path: `test-results/sizer-${info.project.name}.png` })
  await input.press('Enter')
  await expect(page.getByRole('status')).toBeVisible()

  // Make sure we also see a mistake explanation at least once.
  for (let i = 0; i < 30 && (await page.getByTestId('why').count()) === 0; i++) {
    await page.keyboard.press('Space')
    await page.locator('.action-bar .action').first().click()
  }
  await expect(page.getByTestId('why')).toBeVisible()
  await expect(page.locator('.why .is-highlight')).toHaveCount(1)
  await page.screenshot({ path: `test-results/why-${info.project.name}.png`, fullPage: true })
})
