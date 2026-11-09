/**
 * Link checks (no browser): the markdown built by `:link`.
 *
 *   node tests/links.test.mjs
 */
import assert from 'node:assert/strict'
import {
  linkAt, linkMarkdown, linkInsertion } from '../src/lib/links.js'

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

test('a link uses the text as the label', () => {
  assert.equal(linkMarkdown({ text: 'Docs', url: 'https://x/y' }), '[Docs](https://x/y)')
})

test('an empty text falls back to the URL', () => {
  assert.equal(linkMarkdown({ text: '', url: 'https://x/y' }), '[https://x/y](https://x/y)')
})

test('brackets in the label are escaped', () => {
  assert.equal(linkMarkdown({ text: 'a [b]', url: 'u' }), '[a \\[b\\]](u)')
})

test('newlines collapse into spaces', () => {
  assert.equal(linkMarkdown({ text: 'a\nb', url: 'u' }), '[a b](u)')
})

test('a link at the start of a non-empty line gets its own line', () => {
  assert.equal(linkInsertion('## A', 0, '[Docs](u)').insert, '[Docs](u)\n')
})

test('a link inside text is padded with spaces', () => {
  assert.equal(linkInsertion('ab', 1, '[x](u)').insert, ' [x](u) ')
})

test('a link between newlines is not padded', () => {
  assert.equal(linkInsertion('a\n\nb', 2, '[x](u)').insert, '[x](u)')
})

test('the link under the cursor is found', () => {
  const line = 'see [the docs](https://example.com/x) here'
  assert.deepEqual(linkAt(line, 8), {
    text: 'the docs',
    url: 'https://example.com/x',
    from: 4,
    to: 37,
  })
  assert.equal(linkAt(line, 0), null)
  assert.equal(linkAt('no link here', 3), null)
})

test('an image is not a link to follow', () => {
  assert.equal(linkAt('![A cat](https://x/y.jpg)', 2), null)
  assert.equal(linkAt('![A cat](https://x/y.jpg) and [a](https://b)', 30).url, 'https://b')
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
