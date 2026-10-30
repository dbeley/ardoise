/**
 * Keyboard checks (no browser): how a key is normalised and when a digit is a
 * count rather than a motion.
 *
 *   node tests/keys.test.mjs
 */
import assert from 'node:assert/strict'
import { isCountDigit, normalizeKey } from '../src/lib/keys.js'

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

await test('a lone 0 is a motion, not a count', () => {
  assert.equal(isCountDigit('0', ''), false)
})

await test('0 extends an existing count', () => {
  assert.equal(isCountDigit('0', '1'), true)
  assert.equal(isCountDigit('0', '12'), true)
})

await test('1-9 always start a count', () => {
  for (const digit of '123456789') assert.equal(isCountDigit(digit, ''), true)
})

await test('letters are not count digits', () => {
  assert.equal(isCountDigit('j', ''), false)
  assert.equal(isCountDigit('$', ''), false)
})

await test('the stage aliases follow the new keys', () => {
  assert.equal(normalizeKey({ key: 'PageDown' }), '>')
  assert.equal(normalizeKey({ key: 'PageUp' }), '<')
  assert.equal(normalizeKey({ key: ' ' }), 'espace')
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
