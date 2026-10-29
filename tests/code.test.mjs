/**
 * Code block checks (no browser): fence markup and insertion.
 *
 *   node tests/code.test.mjs
 */
import assert from 'node:assert/strict'
import { codeMarkdown, codeInsertion } from '../src/lib/code.js'

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

await test('a fence is empty without a language', () => {
  assert.equal(codeMarkdown(), '```\n\n```')
})

await test('the language tag is lowercased and sanitised', () => {
  assert.equal(codeMarkdown('Nix'), '```nix\n\n```')
  assert.equal(codeMarkdown(' c++ '), '```c++\n\n```')
  assert.equal(codeMarkdown('a`b'), '```ab\n\n```')
})

await test('the block replaces nothing and the cursor lands inside', () => {
  const source = 'text'
  const { at, insert, pos } = codeInsertion(source, source.length, 'js')
  assert.equal(at, 4)
  assert.equal(insert, '\n\n```js\n\n```\n')
  const next = source.slice(0, at) + insert + source.slice(at)
  assert.equal(next, 'text\n\n```js\n\n```\n')
  assert.equal(next.slice(pos - 6, pos), '```js\n')
})

await test('an existing blank line is reused', () => {
  const source = 'text\n\nrest'
  const { at, insert } = codeInsertion(source, 5, '')
  const next = source.slice(0, at) + insert + source.slice(at)
  assert.equal(next, 'text\n\n```\n\n```\nrest')
})

await test('the insertion sits on the blank line between the fences', () => {
  const source = ''
  const { at, insert, pos } = codeInsertion(source, 0, 'nix')
  const next = source.slice(0, at) + insert + source.slice(at)
  assert.equal(next, '```nix\n\n```\n')
  assert.equal(pos, '```nix\n'.length)
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
