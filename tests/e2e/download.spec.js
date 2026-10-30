import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { openDeck } from './helpers.js'

const deck = `---
title: Export
subtitle: Keep me
event: Conf
---

# One

body
`

test('the downloaded deck keeps the whole frontmatter', async ({ page }) => {
  await openDeck(page, deck)

  const pending = page.waitForEvent('download')
  await page.keyboard.press('s')
  const download = await pending
  const path = await download.path()
  const text = await readFile(path, 'utf8')

  expect(download.suggestedFilename()).toBe('export.md')
  expect(text).toContain('subtitle: Keep me')
  expect(text).toContain('event: Conf')
  expect(text.trim()).toBe(deck.trim())
})
