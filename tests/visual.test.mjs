/**
 * Visual-mode checks (no browser): what a selection covers, characters or
 * whole lines, and what an operator would delete.
 *
 *   node tests/visual.test.mjs
 */
import assert from 'node:assert/strict'
import { visualRange } from '../src/lib/visual.js'
import { scanBlocks } from '../src/lib/deck.js'

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

const pick = (raw, from, to, linewise = false) => {
  const blocks = scanBlocks(raw).blocks
  const text = raw
  return visualRange(text, { from, to }, { linewise, blocks })
}

test('a character selection is taken as it is', () => {
  const raw = 'alpha beta'
  assert.deepEqual(pick(raw, 0, 5), { from: 0, to: 5, keptFrom: 0, keptTo: 5, linewise: false })
})

test('a line selection covers whole lines', () => {
  const raw = 'one\ntwo\nthree'
  const range = pick(raw, 5, 7, true)
  assert.equal(raw.slice(range.from, range.to), 'two\n')
  assert.equal(raw.slice(range.keptFrom, range.keptTo), 'two')
  assert.equal(range.linewise, true)
})

test('a line selection ending on a line start takes that line', () => {
  const raw = 'one\ntwo\nthree'
  // `V` then `j`: the head lands on the start of the next line.
  const range = pick(raw, 0, 4, true)
  assert.equal(raw.slice(range.keptFrom, range.keptTo), 'one\ntwo')
  assert.equal(raw.slice(range.from, range.to), 'one\ntwo\n')
})

test('the last line has no newline to take', () => {
  const raw = 'one\ntwo'
  const range = pick(raw, 4, 7, true)
  assert.equal(raw.slice(range.from, range.to), 'two')
  assert.equal(range.keptTo - range.keptFrom, 3)
})

test('a whole block takes its separator with it', () => {
  const raw = 'one\n\ntwo\n\nthree'
  const range = pick(raw, 5, 8, true)
  assert.equal(raw.slice(range.from, range.to), 'two\n\n')
  assert.equal(raw.slice(range.keptFrom, range.keptTo), 'two')
})

test('a backwards selection is normalised', () => {
  const raw = 'alpha beta'
  assert.deepEqual(pick(raw, 5, 0), { from: 0, to: 5, keptFrom: 0, keptTo: 5, linewise: false })
})

test('an empty selection keeps nothing', () => {
  const range = pick('alpha', 2, 2)
  assert.equal(range.from, range.to)
  assert.equal(range.keptFrom, range.keptTo)
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
