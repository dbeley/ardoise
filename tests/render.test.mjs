/**
 * Render checks (no browser): markdown-it output for images.
 *
 *   node tests/render.test.mjs
 */
import assert from 'node:assert/strict'
import { renderMarkdown } from '../src/lib/render.js'

let passed = 0
const test = (name, fn) => {
  try {
    fn()
    passed += 1
    console.log(`  ok   ${name}`)
  } catch (error) {
    console.log(`  FAIL ${name}\n       ${error.message}`)
    process.exitCode = 1
  }
}

test('an image keeps its width and drops the suffix from alt', () => {
  const html = renderMarkdown('![A cat|60%](https://x/y.jpg)')
  assert.ok(html.includes('src="https://x/y.jpg"'))
  assert.ok(html.includes('alt="A cat"'))
  assert.ok(html.includes('style="width:60%"'))
  assert.ok(html.includes('loading="lazy"'))
})

test('an image without a width has no style', () => {
  const html = renderMarkdown('![A cat](u.jpg)')
  assert.ok(html.includes('alt="A cat"'))
  assert.ok(!html.includes('width:'))
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
