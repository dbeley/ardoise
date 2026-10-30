import { expect } from '@playwright/test'

/** Seed a deck in localStorage, reload, and focus the editor. */
export async function openDeck(page, deck) {
  await page.goto('/')
  await page.evaluate((source) => {
    localStorage.clear()
    localStorage.setItem('ardoise:v1:deck', JSON.stringify(source))
  }, deck)
  await page.reload()
  await page.locator('.cm-content').waitFor()
  await page.locator('.cm-content').evaluate((el) => el.focus())
  await expect(page.locator('.cm-content')).toBeVisible()
}

export const content = (page) => page.locator('.cm-content')

export const footer = (page) => page.locator('.chrome')
