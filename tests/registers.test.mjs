/**
 * Register checks (no browser): the yank ring and paste placement.
 *
 *   node tests/registers.test.mjs
 */
import assert from 'node:assert/strict'
import {
  REGISTER_COUNT,
  pushRegister,
  pickRegister,
  registerCopies,
  charwisePaste,
  linewisePaste,
} from '../src/lib/registers.js'

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

await test('the newest entry comes first', () => {
  let ring = []
  ring = pushRegister(ring, { text: 'one', linewise: false })
  ring = pushRegister(ring, { text: 'two', linewise: true })
  assert.deepEqual(ring, [
    { text: 'two', linewise: true },
    { text: 'one', linewise: false },
  ])
})

await test('empty entries are ignored', () => {
  assert.deepEqual(pushRegister([], { text: '', linewise: false }), [])
  assert.deepEqual(pushRegister([], { text: 'x' }), [{ text: 'x', linewise: false }])
})

await test('the ring keeps nine entries', () => {
  let ring = []
  for (let i = 0; i < 12; i += 1) ring = pushRegister(ring, { text: String(i) })
  assert.equal(ring.length, REGISTER_COUNT)
  assert.equal(ring[0].text, '11')
  assert.equal(ring[8].text, '3')
})

await test('registers are picked from 1, most recent first', () => {
  const ring = [{ text: 'new' }, { text: 'old' }]
  assert.equal(pickRegister(ring, 1).text, 'new')
  assert.equal(pickRegister(ring, 2).text, 'old')
  assert.equal(pickRegister(ring, 9).text, 'old')
  assert.equal(pickRegister([], 1), null)
})

await test('copies are blank-line separated', () => {
  assert.equal(registerCopies({ text: '- a' }, 2), '- a\n\n- a')
})

await test('p pastes after the cursor, P before it', () => {
  const entry = { text: 'XX' }
  assert.deepEqual(charwisePaste('abcd', 1, entry), { from: 2, insert: 'XX', pos: 3 })
  assert.deepEqual(charwisePaste('abcd', 1, entry, { before: true }), { from: 1, insert: 'XX', pos: 2 })
})

await test('a charwise paste at the end of the line stays on the line', () => {
  const entry = { text: 'Z' }
  assert.deepEqual(charwisePaste('ab\ncd', 1, entry), { from: 2, insert: 'Z', pos: 2 })
  assert.deepEqual(charwisePaste('ab', 1, entry), { from: 2, insert: 'Z', pos: 2 })
})

await test('a charwise paste honours the count', () => {
  assert.deepEqual(charwisePaste('ab', 0, { text: 'x' }, { count: 3 }), {
    from: 1,
    insert: 'xxx',
    pos: 3,
  })
})

await test('a block paste goes after the current block', () => {
  const entry = { text: '- item', linewise: true }
  assert.deepEqual(linewisePaste(entry, { start: 0, end: 6 }), {
    from: 6,
    insert: '\n\n- item',
    pos: 8,
  })
})

await test('a block paste before the current block', () => {
  const entry = { text: '- item', linewise: true }
  assert.deepEqual(linewisePaste(entry, { start: 10, end: 16 }, { before: true }), {
    from: 10,
    insert: '- item\n\n',
    pos: 10,
  })
})

await test('a block paste repeats with blank lines', () => {
  const entry = { text: 'para', linewise: true }
  assert.equal(linewisePaste(entry, { start: 0, end: 4 }, { count: 2 }).insert, '\n\npara\n\npara')
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
