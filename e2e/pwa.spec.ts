import { expect, test } from '@playwright/test'

test('works offline after first visit', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'one browser is enough')
  await page.goto('/')
  await page.evaluate('navigator.serviceWorker.ready.then(() => true)')
  await page.reload() // let the service worker control the page
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('[data-card]')).toHaveCount(2)
  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifest).toBeTruthy()
})
