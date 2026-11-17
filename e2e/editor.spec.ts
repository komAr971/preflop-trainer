import { expect, test, type Page } from '@playwright/test'

async function center(page: Page, hand: string) {
  const box = (await page.locator(`[data-hand="${hand}"]`).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const raised = (page: Page, hand: string) =>
  page.locator(`[data-hand="${hand}"]`).evaluate((el) => (el as HTMLElement).title.includes('raise 100%'))

test('paint by dragging, save, reload', async ({ page }, info) => {
  await page.goto('/#/charts')
  await page.getByRole('button', { name: /^(Новый чарт|New chart)$/ }).click()
  await expect(page).toHaveURL(/#\/charts\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('grid')).toBeVisible()

  // Drag across 72o → 62o → 52o (bottom row) with the Raise brush.
  const cells = ['72o', '62o', '52o']
  await page.locator('[data-hand="52o"]').scrollIntoViewIfNeeded()
  const points = await Promise.all(cells.map((h) => center(page, h)))
  if (info.project.name === 'mobile') {
    const cdp = await page.context().newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: { x: number; y: number }) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] })
    await touch('touchStart', points[0])
    for (const p of points.slice(1)) await touch('touchMove', p)
    await touch('touchEnd')
  } else {
    await page.mouse.move(points[0].x, points[0].y)
    await page.mouse.down()
    for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 4 })
    await page.mouse.up()
  }
  for (const h of cells) expect(await raised(page, h), h).toBe(true)
  await page.screenshot({ path: `test-results/editor-${info.project.name}.png`, fullPage: true })

  await page.getByRole('button', { name: /^(Сохранить|Save)$/ }).click()
  await expect(page.getByText(/^(Сохранено|Saved)$/)).toBeVisible()

  await page.reload()
  await expect(page.getByRole('grid')).toBeVisible()
  for (const h of cells) expect(await raised(page, h), h).toBe(true)
})
