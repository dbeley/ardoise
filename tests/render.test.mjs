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

test('an image alone in a paragraph becomes a figure with a caption', () => {
  const html = renderMarkdown('![A cat](u.jpg)')
  assert.ok(html.startsWith('<figure class="figure">'), html)
  assert.ok(html.includes('<figcaption>A cat</figcaption>'), html)
  assert.ok(html.includes('</figure>'), html)
  assert.ok(!html.includes('<p>'), html)
})

test('the width goes on the figure, not on the image', () => {
  const html = renderMarkdown('![A cat|60%](u.jpg)')
  assert.ok(html.startsWith('<figure class="figure" style="width:60%">'), html)
  assert.ok(!html.includes('alt="A cat" loading="lazy" style='), html)
})

test('an image without alt has no caption', () => {
  const html = renderMarkdown('![](u.jpg)')
  assert.ok(html.includes('<figure class="figure">'), html)
  assert.ok(!html.includes('<figcaption'), html)
})

test('an image inside a sentence stays inline', () => {
  const html = renderMarkdown('see ![A cat|60%](u.jpg) here')
  assert.ok(html.startsWith('<p>'), html)
  assert.ok(html.includes('style="width:60%"'), html)
  assert.ok(!html.includes('<figure'), html)
})

test('a caption escapes its markup', () => {
  const html = renderMarkdown('![a <b> & c](u.jpg)')
  assert.ok(html.includes('<figcaption>a &lt;b&gt; &amp; c</figcaption>'), html)
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
