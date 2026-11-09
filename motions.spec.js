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

test('dd deletes the line, not the block around it', async ({ page }) => {
  await openDeck(page, '# T\n\n## Sub\ntext line\n\nAfter\n')
  await page.keyboard.press('j') // ## Sub
  await page.keyboard.press('j') // text line
  await page.keyboard.press('d')
  await page.keyboard.press('d')

  const text = await content(page).innerText()
  expect(text).not.toContain('text line')
  expect(text).toContain('Sub') // the heading above stayed
  expect(text).toContain('After')
})

test('d} deletes to the end of the block', async ({ page }) => {
  await openDeck(page, '# T\n\n- one\n- two\n\nAfter\n')
  await page.keyboard.press('j') // - one
  await page.keyboard.press('d')
  await page.keyboard.press('}')

  const text = await content(page).innerText()
  expect(text).not.toContain('one')
  expect(text).not.toContain('two')
  expect(text).toContain('After')
})

test('j walks every line of a multi-line paragraph', async ({ page }) => {
  await openDeck(page, '# T\n\nalpha\nbeta\ngamma\n')
  await page.keyboard.press('j') // alpha
  await page.keyboard.press('j') // beta
  await page.keyboard.press('x')

  await expect(content(page)).toContainText('eta')
  await expect(content(page)).toContainText('alpha')
})

test('j enters a code block line by line', async ({ page }) => {
  await openDeck(page, '# T\n\n```nix\na = 1;\nb = 2;\n```\n\nAfter\n')
  await page.keyboard.press('j') // the opening fence
  await page.keyboard.press('j') // a = 1;
  await page.keyboard.press('j') // b = 2;
  await page.keyboard.press('r')
  await page.keyboard.press('B')

  await expect(content(page)).toContainText('B = 2;')
  await expect(content(page)).toContainText('a = 1;')
})

test('j reaches every list item, k comes back', async ({ page }) => {
  await openDeck(page, '# T\n\n- one\n- two\n- three\n\nAfter\n')
  await page.keyboard.press('j') // - one
  await page.keyboard.press('j') // - two
  await page.keyboard.press('j') // - three
  await page.keyboard.press('r')
  await page.keyboard.press('T')
  await page.keyboard.press('k') // back to - two
  await page.keyboard.press('r')
  await page.keyboard.press('K')

  const text = await content(page).innerText()
  expect(text).toContain('T three') // the cursor did reach the third item
  expect(text).toContain('K two') // and k walked back up one line
  expect(text).toContain('one')
})

test('} skips the whole block', async ({ page }) => {
  await openDeck(page, '# T\n\n- one\n- two\n- three\n\nAfter\n')
  await page.keyboard.press('j') // the list, first item
  await page.keyboard.press('}')
  await page.keyboard.press('x')

  const text = await content(page).innerText()
  expect(text).toContain('fter') // the cursor landed on the block after the list
  expect(text).toContain('one')
  expect(text).toContain('three')
})

test('D deletes the current slide, separator included', async ({ page }) => {
  await openDeck(page, '# One\n\nfirst\n\n---\n\n# Two\n\nsecond\n')
  await page.keyboard.press('>') // on the second slide
  await page.keyboard.press('D')
  await expect(page.locator('.dialog-message')).toContainText('Delete slide 2')
  await page.keyboard.press('y')
  await page.waitForTimeout(900)

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ardoise:v1:deck')))
  expect(saved).toContain('first')
  expect(saved).not.toContain('second')
  expect(saved).not.toContain('---')
})

test('D on the last slide keeps the deck alive', async ({ page }) => {
  await openDeck(page, '# One\n\nfirst\n')
  await page.keyboard.press('D')
  await expect(page.locator('.dialog-message')).toHaveCount(0)
  await expect(content(page)).toContainText('first')
})
