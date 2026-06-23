import { expect, test } from '@playwright/test'

test('landing page presents the research hub and wallet entry point', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /Research at market speed/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'The live intelligence feed' })).toBeVisible()
  await expect(page.getByText('Smart Money Movement Q2').first()).toBeVisible()

  await page.getByRole('button', { name: 'Connect & explore', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Choose your wallet' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Choose your wallet' })).toBeHidden()
})

test('reports library renders', async ({ page }) => {
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Reports Library' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
})

test('landing navigation adapts on mobile and theme choice persists', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await page.getByRole('button', { name: 'Toggle navigation' }).click()
  await expect(page.getByRole('link', { name: 'Architecture' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('link', { name: 'Architecture' })).toBeHidden()

  await page.getByRole('button', { name: 'Toggle light and dark theme' }).click()
  const theme = await page.locator('html').getAttribute('data-theme')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme ?? 'light')
})
