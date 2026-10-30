/**
 * Palette checks (no browser): the `:` command matching and its ranking.
 *
 *   node tests/palette.test.mjs
 */
import assert from 'node:assert/strict'
import { matchCommands } from '../src/lib/palette.js'

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

const commands = [
  { id: 'next', key: 'next', label: 'next paragraph' },
  { id: 'prev', key: 'prev', label: 'previous paragraph' },
  { id: 'new', key: 'new', label: 'blank deck' },
  { id: 'paragraph', key: 'paragraph', label: 'new paragraph' },
  { id: 'theme', key: 'theme nord', label: 'change theme' },
  { id: 'reset', key: 'reset', label: 'start over from a blank deck' },
  { id: 'tutor', key: 'tutor', label: 'open the tutorial' },
]

test('an exact key match wins over a label match', () => {
  assert.equal(matchCommands(commands, 'paragraph')[0].id, 'paragraph')
  assert.equal(matchCommands(commands, 'para')[0].id, 'paragraph')
  assert.equal(matchCommands(commands, 'reset')[0].id, 'reset')
  assert.equal(matchCommands(commands, 'new')[0].id, 'new')
})

test('an empty query lists every command in order', () => {
  assert.deepEqual(
    matchCommands(commands, '').map((command) => command.id),
    commands.map((command) => command.id)
  )
})

test('an argument falls back to the command named by the first word', () => {
  assert.equal(matchCommands(commands, 'theme paper')[0].id, 'theme')
  assert.equal(matchCommands(commands, 'tutor please')[0].id, 'tutor')
})

test('an unknown query matches nothing', () => {
  assert.deepEqual(matchCommands(commands, 'zzz'), [])
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
