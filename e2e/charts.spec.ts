import { expect, test } from '@playwright/test'

test('copy the built-in chart and train with it', async ({ page }, info) => {
  await page.goto('/#/charts')
  await page.getByRole('button', { name: /^(Копировать|Copy)$/ }).click()
  const copy = page.locator('.chart-list li').nth(1)
  await expect(copy).toContainText(/(копия|copy)/)
  await page.screenshot({ path: `test-results/charts-${info.project.name}.png`, fullPage: true })
  await copy.getByRole('button', { name: /^(Тренировать|Train)$/ }).click()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.locator('[data-card]')).toHaveCount(2)
  await page.goto('/#/charts')
  await expect(page.locator('.chart-list li').nth(1)).toHaveClass(/is-active/)
})
