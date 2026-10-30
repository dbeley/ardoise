import { test, expect } from '@playwright/test'
import { openDeck, content } from './helpers.js'

const deck = `# T

hello world

alpha
beta
gamma
`

test('0 is the start-of-line motion, not a count', async ({ page }) => {
  await openDeck(page, deck)
  await page.keyboard.press('j') // the paragraph
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('l')
  await page.keyboard.press('0')
  await page.keyboard.press('x')

  await expect(content(page)).toContainText('ello world')
})

test('e lands on the last character of the word', async ({ page }) => {
  await openDeck(page, deck)
  await page.keyboard.press('j')
  await page.keyboard.press('e')
  await page.keyboard.press('r')
  await page.keyboard.press('X')

  await expect(content(page)).toContainText('hellX world')
})

test('the down arrow is a line motion for d', async ({ page }) => {
  await openDeck(page, '# T\n\nalpha\nbeta\n')
  await page.keyboard.press('j')
  await page.keyboard.press('d')
  await page.keyboard.press('ArrowDown')

  const text = await content(page).innerText()
  expect(text).not.toContain('alpha')
  expect(text).not.toContain('beta')
})

test('2dd deletes two paragraphs', async ({ page }) => {
  await openDeck(page, '# T\n\none\n\ntwo\n\nthree\n')
  await page.keyboard.press('j')
  await page.keyboard.press('2')
  await page.keyboard.press('d')
  await page.keyboard.press('d')

  const text = await content(page).innerText()
  expect(text).not.toContain('one')
  expect(text).not.toContain('two')
  expect(text).toContain('three')
})
