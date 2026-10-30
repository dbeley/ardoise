import { test, expect } from '@playwright/test'
import { openDeck, content, footer } from './helpers.js'

const deck = `# One

alpha

---

# Two

beta

---

# Three

gamma
`

test('a search jumps across slides and highlights the match', async ({ page }) => {
  await openDeck(page, deck)

  await page.keyboard.press('/')
  await expect(page.locator('.command--search')).toBeVisible()
  await page.keyboard.type('beta')
  await page.keyboard.press('Enter')

  await expect(footer(page)).toContainText('2/3')
  await expect(page.locator('.cm-find.is-current')).toHaveText('beta')
  await expect(content(page)).toContainText('beta')
})

test('esc clears the search highlights', async ({ page }) => {
  await openDeck(page, deck)
  await page.keyboard.press('/')
  await page.keyboard.type('alpha')
  await page.keyboard.press('Enter')
  await expect(page.locator('.cm-find')).toHaveCount(1)

  await page.keyboard.press('Escape')
  await expect(page.locator('.cm-find')).toHaveCount(0)
})

test('esc closes the search bar even after a click on the stage', async ({ page }) => {
  await openDeck(page, deck)
  await page.keyboard.press('/')
  await expect(page.locator('.command--search')).toBeVisible()

  await page.mouse.click(700, 600)
  await page.keyboard.press('Escape')

  await expect(page.locator('.command--search')).toHaveCount(0)
})

test('a click outside the search closes it', async ({ page }) => {
  await openDeck(page, deck)
  await page.keyboard.press('/')
  await expect(page.locator('.command--search')).toBeVisible()

  await page.mouse.click(700, 600)

  await expect(page.locator('.command--search')).toHaveCount(0)
})
