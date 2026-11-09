import { test, expect } from '@playwright/test'
import { openDeck, content } from './helpers.js'

const deck = `---
title: Export
author: Someone
---

# One

body
`

async function palette(page, text) {
  await page.keyboard.press(':')
  await page.keyboard.type(text)
  await page.keyboard.press('Enter')
}

test(':w saves the deck like :save', async ({ page }) => {
  await openDeck(page, deck)

  const pending = page.waitForEvent('download')
  await palette(page, 'w')
  const download = await pending
  expect(download.suggestedFilename()).toBe('export.md')
})

test(':new asks before clearing the deck', async ({ page }) => {
  await openDeck(page, deck)

  await palette(page, 'new')
  await expect(page.getByText('You will lose all your unsaved work')).toBeVisible()

  // esc keeps the work
  await page.keyboard.press('Escape')
  await expect(content(page)).toContainText('One')

  // enter twice: confirm, then the deck is really blank
  await palette(page, 'new')
  await page.keyboard.press('Enter')
  await expect(content(page)).toHaveText('')
})

test(':meta edits the frontmatter without adding a slide', async ({ page }) => {
  await openDeck(page, deck)

  await palette(page, 'meta')
  await expect(page.locator('#meta-title')).toBeVisible()

  await page.locator('#meta-title').fill('New title')
  await page.locator('#meta-author').fill('David')
  await page.locator('#meta-theme').selectOption('paper')
  await page.getByRole('button', { name: 'save (enter)' }).click()

  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('ardoise:v1:deck') ?? '""'))
    )
    .toContain('title: New title')

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ardoise:v1:deck') ?? '""')
  )
  expect(stored).toContain('author: David')
  expect(stored).toContain('theme: paper')
  expect(stored).toContain('# One')
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('paper')

  // The metadata is not a slide: the deck still has its single real slide.
  await expect(page.locator('.chrome')).toContainText('1/1')
  await expect(content(page)).toContainText('One')
})
