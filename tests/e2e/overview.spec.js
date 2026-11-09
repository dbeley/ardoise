import { test, expect } from '@playwright/test'
import { openDeck } from './helpers.js'

const fontSize = (locator) =>
  locator.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))

test('a thumbnail shows the whole slide, shrunk to its box', async ({ page }) => {
  await openDeck(page, '# A title that is long\n\nbody text\n\n---\n\n# B\n')
  await page.keyboard.press('o')
  await expect(page.locator('.overview-grid')).toBeVisible()

  const thumb = page.locator('.thumb').first()
  const inner = thumb.locator('.thumb-inner')
  const box = await thumb.boundingBox()
  const heading = inner.locator('h1')
  const title = await heading.boundingBox()

  // The type follows the thumb's width instead of keeping the stage's size:
  // a 62px title in a 230px box was the bug.
  expect(await fontSize(heading)).toBeLessThan(box.width / 10)
  expect(await fontSize(heading)).toBeGreaterThan(4)

  // The title starts inside the box and ends inside it: the slide is a
  // miniature, not the top-left corner of a full-size one.
  expect(title.x).toBeGreaterThanOrEqual(box.x)
  expect(title.x + title.width).toBeLessThanOrEqual(box.x + box.width)
})
