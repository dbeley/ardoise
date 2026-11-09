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

test('a table is drawn on the stage, and its markdown comes back on the cursor', async ({ page }) => {
  await openDeck(page, '# T\n\n| a | b |\n|---|---|\n| 1 | 2 |\n')

  const widget = page.locator('.cm-table-widget')
  await expect(widget.locator('table')).toBeVisible()
  await expect(widget.locator('th')).toHaveCount(2)
  await expect(widget.locator('td').first()).toHaveText('1')

  await page.keyboard.press('}') // into the table block
  await expect(page.locator('.cm-table-widget')).toHaveCount(0)
  await expect(content(page)).toContainText('|---|---|')

  await page.keyboard.press('{') // back out of it
  await expect(page.locator('.cm-table-widget table')).toBeVisible()
})

test('clicking the drawn table puts the cursor in it', async ({ page }) => {
  await openDeck(page, '# T\n\n| a | b |\n|---|---|\n| 1 | 2 |\n')
  await expect(page.locator('.cm-table-widget table')).toBeVisible()

  await page.locator('.cm-table-widget table').click()
  await expect(page.locator('.cm-table-widget')).toHaveCount(0)
  await expect(content(page)).toContainText('|---|---|')
})

test('a table after a pause is drawn, dimmed', async ({ page }) => {
  await openDeck(page, '# T\n\n<!-- pause -->\n\n| a | b |\n|---|---|\n| 1 | 2 |\n')
  await expect(page.locator('.cm-table-widget.cm-pending')).toHaveCount(1)
  await expect(page.locator('.cm-table-widget table')).toBeVisible()
})
