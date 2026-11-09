import { test, expect } from '@playwright/test'
import { openDeck, content } from './helpers.js'

const run = async (page, command) => {
  await page.keyboard.press(':')
  await page.keyboard.type(command)
  await page.keyboard.press('Enter')
}

test(':table inserts a skeleton after the block and lands in the first cell', async ({ page }) => {
  await openDeck(page, '# T\n\nbody\n')
  await page.keyboard.press('}') // the body block
  await run(page, 'table')

  await expect(content(page)).toContainText('|---|---|')
  // Insert mode, cursor in the header cell: the next keys fill it.
  await page.keyboard.type('key')
  await expect(content(page)).toContainText('| key |  |')
})

test(':table 3x2 builds three columns and two rows', async ({ page }) => {
  await openDeck(page, '# T\n')
  await run(page, 'table 3x2')
  await page.keyboard.press('Escape')

  await page.keyboard.press('o')
  await expect(page.locator('.thumb table')).toHaveCount(1)
  await expect(page.locator('.thumb th')).toHaveCount(3)
  await expect(page.locator('.thumb tbody tr')).toHaveCount(2)
})
