import { expect, test } from '@playwright/test'

test('draw a chart from memory and see it in stats', async ({ page }, info) => {
  await page.goto('/')
  // On phones the link lives in the burger menu.
  const burger = page.getByRole('button', { name: /^(Меню|Menu)$/ })
  if (await burger.isVisible()) await burger.click()
  await page.getByRole('link', { name: /(Нарисовать чарт|Draw a chart)/ }).click()
  await expect(page).toHaveURL(/#\/draw$/)
  await page.getByRole('combobox').selectOption('rfi:UTG')
  await page.locator('[data-hand="AA"]').click()
  await page.locator('[data-hand="KK"]').click()
  await page.getByRole('button', { name: /^(Проверить|Check)$/ }).click()
  await expect(page.getByRole('status')).toContainText(/(Совпадение|Match)/)
  await page.screenshot({ path: `test-results/draw-${info.project.name}.png`, fullPage: true })

  await page.goto('/#/stats')
  await expect(page.getByTestId('draw-stats')).toContainText('UTG')
})
