import { test, expect } from '@playwright/test'
import { openDeck } from './helpers.js'

test('enter on a link opens it in a new tab', async ({ page, context }) => {
  await openDeck(page, '# T\n\nsee [the docs](https://example.com/x) here\n')
  await page.keyboard.press('}') // the paragraph
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('l') // inside the link

  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    page.keyboard.press('Enter'),
  ])
  expect(tab.url()).toBe('https://example.com/x')
  await tab.close()
})

test('enter off a link opens nothing', async ({ page, context }) => {
  await openDeck(page, '# T\n\nplain text\n')
  await page.keyboard.press('}')

  let opened = false
  context.on('page', () => (opened = true))
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  expect(opened).toBe(false)
})
