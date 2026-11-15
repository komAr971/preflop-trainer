import { expect, test } from '@playwright/test'

test('copy the built-in chart and train with it', async ({ page }, info) => {
  await page.goto('/#/charts')
  await page.locator('.chart-list li').first().getByRole('button', { name: /^(Копировать|Copy)$/ }).click()
  // Own charts come after the built-in ones.
  const copy = page.locator('.chart-list li', { hasText: /(копия|copy)/ })
  await expect(copy).toContainText(/(копия|copy)/)
  await page.screenshot({ path: `test-results/charts-${info.project.name}.png`, fullPage: true })
  await copy.getByRole('button', { name: /^(Тренировать|Train)$/ }).click()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.locator('[data-card]')).toHaveCount(2)
  await page.goto('/#/charts')
  await expect(page.locator('.chart-list li', { hasText: /(копия|copy)/ })).toHaveClass(/is-active/)
})
