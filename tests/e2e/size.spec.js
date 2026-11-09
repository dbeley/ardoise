import { test, expect } from '@playwright/test'
import { openDeck } from './helpers.js'

const scale = (page) =>
  page.evaluate(() => document.documentElement.style.getPropertyValue('--type-scale'))

test(':size goes up to 200%, and + stops there', async ({ page }) => {
  await openDeck(page, '# Title\n\nbody\n')

  await page.keyboard.press(':')
  await page.keyboard.type('size 200')
  await page.keyboard.press('Enter')
  await expect.poll(() => scale(page)).toBe('2')

  for (let i = 0; i < 30; i += 1) await page.keyboard.press('+')
  await expect.poll(() => scale(page)).toBe('2')
})
