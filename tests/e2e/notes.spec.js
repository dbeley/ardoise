import { test, expect } from '@playwright/test'
import { openDeck, content, footer } from './helpers.js'

const deck = `---
title: Notes
---

# One

visible text

<!-- note: first line
---
second line -->

---

# Two

last
`

test('a multi-line comment stays a comment and does not split the deck', async ({ page }) => {
  await openDeck(page, deck)

  await expect(footer(page)).toContainText('1/2')
  const comments = await page.locator('.cm-line.cm-comment').allTextContents()
  expect(comments.join('\n')).toContain('second line -->')
  expect(comments.join('\n')).toContain('---')

  await page.keyboard.press('>')
  await expect(footer(page)).toContainText('2/2')
  await expect(content(page)).toContainText('last')
})

