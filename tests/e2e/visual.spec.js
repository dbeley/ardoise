import { test, expect } from '@playwright/test'
import { openDeck, content, footer } from './helpers.js'

const deck = `# T

alpha beta gamma

one
two
three
`

test('v selects characters and d deletes them', async ({ page }) => {
  await openDeck(page, deck)
  await page.keyboard.press('}') // alpha beta gamma
  await page.keyboard.press('v')
  await page.keyboard.press('2')
  await page.keyboard.press('l')

  // The selection is visible, and its markdown stays on screen.
  await expect(page.locator('.cm-selectionBackground').first()).toBeVisible()

  await page.keyboard.press('d')
  await expect(content(page)).toContainText('pha beta gamma')
})

test('V takes whole lines, newline included', async ({ page }) => {
  await openDeck(page, deck)
  await page.keyboard.press('}') // alpha beta gamma
  await page.keyboard.press('}')
  await page.keyboard.press('V')
  await page.keyboard.press('j')
  await page.keyboard.press('d')

  const text = await content(page).innerText()
  expect(text).not.toContain('one')
  expect(text).not.toContain('two')
  expect(text).toContain('three')
})

test('y yanks the selection, p pastes it over another one', async ({ page }) => {
  await openDeck(page, '# T\n\none\ntwo\nthree\n')
  await page.keyboard.press('}') // the paragraph
  await page.keyboard.press('V')
  await page.keyboard.press('y') // "one"

  await page.keyboard.press('j')
  await page.keyboard.press('j') // three
  await page.keyboard.press('V')
  await page.keyboard.press('p')

  const text = await content(page).innerText()
  expect(text).toContain('one')
  expect(text).not.toContain('three')
})

test('c changes the selection and types over it', async ({ page }) => {
  await openDeck(page, deck)
  await page.keyboard.press('}') // alpha beta gamma
  await page.keyboard.press('v')
  await page.keyboard.press('5')
  await page.keyboard.press('l')
  await page.keyboard.press('c')
  await page.keyboard.type('omega')

  await expect(content(page)).toContainText('omega beta gamma')
})

test('esc cancels the selection and keeps the text', async ({ page }) => {
  await openDeck(page, deck)
  await page.keyboard.press('}') // alpha beta gamma
  await page.keyboard.press('v')
  await page.keyboard.press('3')
  await page.keyboard.press('l')
  await page.keyboard.press('Escape')

  await expect(footer(page)).toContainText('1/1')
  await expect(content(page)).toContainText('alpha beta gamma')
})

test('o swaps the two ends of the selection', async ({ page }) => {
  await openDeck(page, deck)
  await page.keyboard.press('}') // alpha beta gamma
  await page.keyboard.press('v')
  await page.keyboard.press('4')
  await page.keyboard.press('l') // "alph"
  await page.keyboard.press('o') // the head goes back to "alpha"
  await page.keyboard.press('l') // ...and one character further
  await page.keyboard.press('d')

  // "alph" minus its first character: "lph" goes.
  await expect(content(page)).toContainText('a beta gamma')
})

test('a selection never crosses a slide', async ({ page }) => {
  await openDeck(page, '# A\n\none\n\n---\n\n# B\n\ntwo\n')
  await page.keyboard.press('V')
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('j')

  await expect(footer(page)).toContainText('1/2')
})
