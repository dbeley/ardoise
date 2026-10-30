import { test, expect } from '@playwright/test'
import { openDeck } from './helpers.js'

test('yy then p duplicates the block', async ({ page }) => {
  await openDeck(page, '# T\n\nhello\n\nbye\n')
  await page.keyboard.press('j')
  await page.keyboard.press('y')
  await page.keyboard.press('y')
  await page.keyboard.press('p')
  await page.waitForTimeout(900)

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ardoise:v1:deck')))
  expect(saved.match(/hello/g)).toHaveLength(2)
})

test('"2p pastes an older register', async ({ page }) => {
  await openDeck(page, '# T\n\none\n\ntwo\n\nthree\n')
  await page.keyboard.press('j')
  await page.keyboard.press('y')
  await page.keyboard.press('y')
  await page.keyboard.press('j')
  await page.keyboard.press('y')
  await page.keyboard.press('y')
  await page.keyboard.press('"')
  await page.keyboard.press('2')
  await page.keyboard.press('p')
  await page.waitForTimeout(900)

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ardoise:v1:deck')))
  expect(saved.match(/one/g)).toHaveLength(2)
})

test('a command after "N resets the register prefix', async ({ page }) => {
  await openDeck(page, '# T\n\none\n\ntwo\n\nthree\n')
  await page.keyboard.press('j')
  await page.keyboard.press('y')
  await page.keyboard.press('y') // register 1: one
  await page.keyboard.press('j')
  await page.keyboard.press('y')
  await page.keyboard.press('y') // register 1: two, register 2: one
  await page.keyboard.press('"')
  await page.keyboard.press('2')
  await page.keyboard.press('j') // not a paste: the prefix is dropped
  await page.keyboard.press('p')
  await page.waitForTimeout(900)

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ardoise:v1:deck')))
  // p must paste the newest entry (the "two" block), not the older "one".
  expect(saved.match(/two/g)).toHaveLength(2)
  expect(saved.match(/one/g)).toHaveLength(1)
})
