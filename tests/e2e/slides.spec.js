import { test, expect } from '@playwright/test'
import { openDeck, footer } from './helpers.js'

const thumbs = (page) => page.locator('.thumb')

test('a separator typed in the editor adds one slide, once', async ({ page }) => {
  await openDeck(page, '# A\n\n---\n\n# B\n')

  await page.keyboard.press('i')
  await page.keyboard.press('Control+End')
  await page.keyboard.type('\n\n---\n\n# C')
  await page.keyboard.press('Escape')
  await expect(footer(page)).toContainText('1/3')

  // Every save folds the buffer back into the source: no copy piles up.
  for (let i = 0; i < 8; i += 1) await page.keyboard.press('j')
  await page.keyboard.press('o')
  await expect(thumbs(page)).toHaveCount(3)
})

test('deleting the separator again drops the slide it added', async ({ page }) => {
  await openDeck(page, '# A\n\n---\n\n# B\n')

  await page.keyboard.press('i')
  await page.keyboard.press('Control+End')
  await page.keyboard.type('\n\n---\n\n# C')
  await expect(footer(page)).toContainText('1/3')

  for (let i = 0; i < 9; i += 1) await page.keyboard.press('Backspace')
  await page.keyboard.press('Escape')
  await expect(footer(page)).toContainText('1/2')

  await page.keyboard.press('o')
  await expect(thumbs(page)).toHaveCount(2)
})
