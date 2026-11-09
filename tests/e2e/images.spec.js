import { test, expect } from '@playwright/test'
import { openDeck } from './helpers.js'

test('an image line is one block, with no blank leading around it', async ({ page }) => {
  await openDeck(page, '# T\n\nbefore\n\n![mark](/favicon.svg)\n\nafter\n')

  const image = page.locator('.cm-image img')
  await image.waitFor()
  await image.evaluate((img) =>
    img.complete ? null : new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true })
      img.addEventListener('error', resolve, { once: true })
    })
  )

  const metrics = await page.evaluate(() => {
    const line = document.querySelector('.cm-image-line')
    const img = line.querySelector('img:not(.cm-widgetBuffer)')
    const box = (element) => element.getBoundingClientRect()
    return {
      line: box(line).height,
      image: box(img).height,
      offset: box(img).top - box(line).top,
    }
  })

  expect(metrics.image).toBeGreaterThan(0)
  // CodeMirror's widget buffers used to add a blank line above and below.
  expect(metrics.line - metrics.image).toBeLessThan(6)
  expect(metrics.offset).toBeLessThan(3)
})
