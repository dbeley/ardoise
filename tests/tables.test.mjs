/**
 * Table checks (no browser): the skeleton `:table` inserts and where it lands.
 *
 *   node tests/tables.test.mjs
 */
import assert from 'node:assert/strict'
import { tableMarkdown, parseTableSize, tableInsertion } from '../src/lib/tables.js'

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

test('a 2x1 skeleton has a header, a delimiter and one row', () => {
  assert.equal(tableMarkdown(), '|  |  |\n|---|---|\n|  |  |')
  assert.equal(
    tableMarkdown({ cols: 3, rows: 2 }),
    '|  |  |  |\n|---|---|---|\n|  |  |  |\n|  |  |  |'
  )
})

test('the size is cols x rows, clamped', () => {
  assert.deepEqual(parseTableSize('3x4'), { cols: 3, rows: 4 })
  assert.deepEqual(parseTableSize(''), { cols: 2, rows: 1 })
  assert.deepEqual(parseTableSize(undefined), { cols: 2, rows: 1 })
  assert.deepEqual(parseTableSize('foo'), { cols: 2, rows: 1 })
  assert.deepEqual(parseTableSize('99x99'), { cols: 8, rows: 20 })
  assert.deepEqual(parseTableSize('0x0'), { cols: 1, rows: 1 })
  // A bare number is a column count.
  assert.deepEqual(parseTableSize('4'), { cols: 4, rows: 1 })
})

test('the table lands after the block, never glued to it', () => {
  const { at, insert, pos } = tableInsertion('one\n\ntwo', 8)
  assert.equal(at, 8)
  assert.equal(insert, '\n\n|  |  |\n|---|---|\n|  |  |\n')
  // The cursor sits in the first header cell, not after the row.
  assert.equal(insert.slice(0, pos - at), '\n\n| ')
})

test('a table inserted mid-text is padded on both sides', () => {
  const { at, insert, pos } = tableInsertion('one\ntwo', 3)
  assert.equal(at, 3)
  assert.equal(insert, '\n\n|  |  |\n|---|---|\n|  |  |')
  assert.equal(insert.slice(0, pos - at), '\n\n| ')
})

test('a table in an empty slide has no leading blank', () => {
  const { insert, pos } = tableInsertion('', 0)
  assert.equal(insert, '|  |  |\n|---|---|\n|  |  |\n')
  assert.equal(pos, 2)
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
