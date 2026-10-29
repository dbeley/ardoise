/**
 * URL checks (no browser): the only URLs ardoise accepts in a deck.
 *
 *   node tests/urls.test.mjs
 */
import assert from 'node:assert/strict'
import { normalizeUrl } from '../src/lib/urls.js'

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

test('http and https URLs are kept', () => {
  assert.equal(normalizeUrl('https://example.com/a.png'), 'https://example.com/a.png')
  assert.equal(normalizeUrl('http://example.com/'), 'http://example.com/')
})

test('a bare domain gets https', () => {
  assert.equal(normalizeUrl('example.com/a.png'), 'https://example.com/a.png')
  assert.equal(normalizeUrl('  upload.wikimedia.org/x  '), 'https://upload.wikimedia.org/x')
})

test('other schemes and empty values are rejected', () => {
  assert.equal(normalizeUrl('javascript:alert(1)'), null)
  assert.equal(normalizeUrl('data:image/svg+xml,<svg/>'), null)
  assert.equal(normalizeUrl('file:///etc/passwd'), null)
  assert.equal(normalizeUrl(''), null)
  assert.equal(normalizeUrl('   '), null)
  assert.equal(normalizeUrl(null), null)
})

test('a broken URL is rejected', () => {
  assert.equal(normalizeUrl('https://'), null)
  assert.equal(normalizeUrl('http://'), null)
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
