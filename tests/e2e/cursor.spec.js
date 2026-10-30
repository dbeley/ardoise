import { test, expect } from '@playwright/test'
import { openDeck } from './helpers.js'

function collectErrors(page) {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

async function cursorMetrics(page) {
  return page.evaluate(() => {
    const cursor = document.querySelector('.cm-cursor-primary')
    const layer = document.querySelector('.cm-cursorLayer')
    const lines = [...document.querySelectorAll('.cm-line')]
    const rect = cursor.getBoundingClientRect()
    const line = lines.find((candidate) => {
      const box = candidate.getBoundingClientRect()
      return rect.y + rect.height / 2 >= box.top && rect.y + rect.height / 2 <= box.bottom
    })
    const style = getComputedStyle(line)
    const sample = document.createElement('span')
    sample.textContent = '0'
    sample.style.position = 'absolute'
    sample.style.visibility = 'hidden'
    sample.style.font = style.font
    document.body.append(sample)
    const ch = sample.getBoundingClientRect().width
    sample.remove()
    return {
      width: rect.width,
      ch,
      lineFont: style.fontSize,
      layerFont: layer ? getComputedStyle(layer).fontSize : '',
    }
  })
}

test('the block cursor is one cell wide on a heading, without plugin errors', async ({ page }) => {
  const errors = collectErrors(page)
  await openDeck(page, '# Big title\n\nbody text\n')
  await page.locator('.cm-cursor-primary').waitFor()

  const metrics = await cursorMetrics(page)
  expect(metrics.width).toBeGreaterThan(10)
  expect(Math.abs(metrics.width - metrics.ch)).toBeLessThan(1.5)
  expect(metrics.layerFont).toBe(metrics.lineFont)
  expect(errors.join('\n')).not.toContain('CodeMirror plugin crashed')
})

test('a jump to the bottom of a long slide keeps the plugin alive', async ({ page }) => {
  const errors = collectErrors(page)
  const deck = ['# Long', '', ...Array.from({ length: 60 }, (_, i) => `paragraph ${i}\n`)].join('\n')
  await openDeck(page, deck)

  await page.keyboard.press('/')
  await expect(page.locator('.command--search')).toBeVisible()
  await page.keyboard.type('paragraph 59')
  await page.keyboard.press('Enter')
  await expect(page.locator('.cm-find.is-current')).toHaveText('paragraph 59')

  const metrics = await cursorMetrics(page)
  expect(Math.abs(metrics.width - metrics.ch)).toBeLessThan(1.5)
  expect(errors.join('\n')).not.toContain('CodeMirror plugin crashed')
  expect(errors.join('\n')).not.toContain('No tile')
})
