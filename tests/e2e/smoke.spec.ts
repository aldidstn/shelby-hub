import { expect, test } from '@playwright/test'

test('landing page presents the research hub and wallet entry point', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /Research at market speed/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'The live intelligence feed' })).toBeVisible()
  await expect(page.getByText('Smart Money Movement Q2').first()).toBeVisible()

  await page.getByRole('banner').getByRole('button', { name: 'Connect & explore', exact: true }).click()
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

test('landing content keeps the audited mobile alignment', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const marquee = page.getByRole('region', { name: 'Platform characteristics' })
  const marqueeLayout = await marquee.evaluate((element) => {
    const style = getComputedStyle(element)
    return { left: style.paddingLeft, right: style.paddingRight }
  })
  expect(marqueeLayout).toEqual({ left: '16px', right: '16px' })
  const accessibleMarqueeCopy = page.getByText('Research reports, Smart money data, Encrypted delivery, Direct settlement, Permanent access')
  const hiddenCopyLayout = await accessibleMarqueeCopy.evaluate((element) => {
    const style = getComputedStyle(element)
    return { width: style.width, height: style.height, clip: style.clip, overflow: style.overflow }
  })
  expect(hiddenCopyLayout).toEqual({ width: '1px', height: '1px', clip: 'rect(0px, 0px, 0px, 0px)', overflow: 'hidden' })

  const sequenceItems = await page.locator('figure figcaption > span:not([aria-hidden])').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().toJSON()))
  expect(sequenceItems.every(Boolean)).toBe(true)
  expect(sequenceItems).toHaveLength(3)
  expect(Math.max(...sequenceItems.map((item) => item.y)) - Math.min(...sequenceItems.map((item) => item.y))).toBeLessThan(3)

  for (const title of ['Smart Money Movement Q2', 'AI Sector On-Chain Onboarding Report']) {
    const card = page.getByRole('article').filter({ hasText: title })
    const radii = await card.evaluate((element) => {
      const style = getComputedStyle(element)
      return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius]
    })
    expect(new Set(radii).size).toBe(1)
  }

  const workflow = page.getByRole('article').filter({ hasText: 'Encrypted storage pipeline' })
  const workflowBox = await workflow.boundingBox()
  expect(workflowBox?.width).toBeGreaterThan(350)
})

test('intel trades adapt to a mobile card layout without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/intel', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: 'trade-1',
          type: 'trade',
          attributes: {
            block_number: 1,
            tx_hash: `0x${'a'.repeat(64)}`,
            tx_from_address: `0x${'b'.repeat(40)}`,
            from_token_amount: '1',
            to_token_amount: '2500',
            price_from_in_usd: '2500',
            price_to_in_usd: '1',
            block_timestamp: new Date().toISOString(),
            kind: 'buy',
            volume_in_usd: '2500',
            from_token_address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            to_token_address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
          },
        }],
      }),
    })
  })

  await page.goto('/intel')

  await expect(page.getByRole('list', { name: 'Trade history' })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Trade history' })).toBeHidden()
  await expect(page.getByRole('link', { name: 'View transaction' })).toBeVisible()
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(widths.content).toBeLessThanOrEqual(widths.viewport)
})
