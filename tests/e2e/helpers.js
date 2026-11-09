import { expect } from '@playwright/test'

/**
 * Seed a deck before the app boots, then focus the editor.
 *
 * The deck must be in place before the first script runs: the app reads it at
 * boot and rewrites localStorage 400ms later, so a deck written after `goto`
 * can be erased by that autosave.
 */
export async function openDeck(page, deck) {
  await page.addInitScript((source) => {
    localStorage.clear()
    localStorage.setItem('ardoise:v1:deck', JSON.stringify(source))
  }, deck)
  await page.goto('/')
  await page.locator('.cm-content').waitFor()
  await page.locator('.cm-content').evaluate((el) => el.focus())
  await expect(page.locator('.cm-content')).toBeVisible()
}

export const content = (page) => page.locator('.cm-content')

export const footer = (page) => page.locator('.chrome')
