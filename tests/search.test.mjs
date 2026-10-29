/**
 * Search checks (no browser): matches across slides, wrapping, literal text.
 *
 *   node tests/search.test.mjs
 */
import assert from 'node:assert/strict'
import { findMatches, firstMatch, stepMatch } from '../src/lib/search.js'

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

const slides = ['Hello world', '# Hello again\n\nrest', 'nothing here']

await test('every occurrence is found, slides in order', () => {
  assert.deepEqual(findMatches(slides, 'hello'), [
    { slideIndex: 0, from: 0, to: 5 },
    { slideIndex: 1, from: 2, to: 7 },
  ])
})

await test('search is case-insensitive', () => {
  assert.equal(findMatches(['NixOS'], 'nixos').length, 1)
  assert.equal(findMatches(['nixos'], 'NIXOS').length, 1)
})

await test('the query is literal, not a pattern', () => {
  assert.deepEqual(findMatches(['a.b c.d'], 'a.b'), [{ slideIndex: 0, from: 0, to: 3 }])
  assert.equal(findMatches(['ab'], 'a.b').length, 0)
  assert.equal(findMatches(['a+b'], '+').length, 1)
})

await test('an empty query finds nothing', () => {
  assert.deepEqual(findMatches(slides, ''), [])
})

await test('the first match from the cursor can be the cursor itself', () => {
  const matches = findMatches(slides, 'hello')
  assert.deepEqual(firstMatch(matches, { slideIndex: 0, from: 0 }), matches[0])
  assert.deepEqual(firstMatch(matches, { slideIndex: 0, from: 3 }), matches[1])
})

await test('n moves to the next match and wraps to the top', () => {
  const matches = findMatches(slides, 'hello')
  assert.deepEqual(stepMatch(matches, { slideIndex: 0, from: 0 }, 1), matches[1])
  assert.deepEqual(stepMatch(matches, { slideIndex: 1, from: 2 }, 1), matches[0])
})

await test('N moves to the previous match and wraps to the end', () => {
  const matches = findMatches(slides, 'hello')
  assert.deepEqual(stepMatch(matches, { slideIndex: 1, from: 2 }, -1), matches[0])
  assert.deepEqual(stepMatch(matches, { slideIndex: 0, from: 0 }, -1), matches[1])
})

await test('a count skips several matches', () => {
  const many = findMatches(['x x x x x'], 'x')
  assert.equal(stepMatch(many, { slideIndex: 0, from: 0 }, 1, 2).from, 4)
  assert.equal(stepMatch(many, { slideIndex: 0, from: 4 }, -1, 2).from, 0)
})

await test('no match means no jump', () => {
  assert.equal(stepMatch([], { slideIndex: 0, from: 0 }, 1), null)
  assert.equal(firstMatch([], { slideIndex: 0, from: 0 }), null)
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
