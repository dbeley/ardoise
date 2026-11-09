/**
 * Frontmatter checks (no browser): `applyMeta` updates keys in place, keeps
 * unknown keys and the body verbatim.
 *
 *   node tests/meta.test.mjs
 */
import assert from 'node:assert/strict'
import { applyMeta, parseDeck, parseFrontmatter } from '../src/lib/deck.js'

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

test('adds a header to a deck that has none', () => {
  const source = '# Cover\n\ntext\n'
  const next = applyMeta(source, { title: 'Mon sujet', author: 'David' })
  assert.equal(next, '---\ntitle: Mon sujet\nauthor: David\n---\n\n# Cover\n\ntext\n')
  assert.equal(parseDeck(next).meta.title, 'Mon sujet')
})

test('updates existing keys and keeps unknown keys and the body', () => {
  const source = '---\ntitle: Old\nevent: Meetup\ntheme: nord\n---\n\n# Cover\n'
  const next = applyMeta(source, { title: 'New', author: 'David', theme: 'paper' })
  assert.equal(
    next,
    '---\ntitle: New\nevent: Meetup\ntheme: paper\nauthor: David\n---\n\n# Cover\n'
  )
})

test('an emptied value removes its line', () => {
  const source = '---\ntitle: Old\nauthor: David\n---\n\n# Cover\n'
  assert.equal(applyMeta(source, { author: '' }), '---\ntitle: Old\n---\n\n# Cover\n')
})

test('a header left with no key is dropped', () => {
  const source = '---\ntitle: Old\n---\n\n# Cover\n'
  assert.equal(applyMeta(source, { title: '' }), '# Cover\n')
})

test('values with a colon are quoted and read back', () => {
  const next = applyMeta('', { title: 'Nix: the good parts' })
  assert.equal(parseFrontmatter(next).meta.title, 'Nix: the good parts')
  assert.equal(parseDeck(next).meta.title, 'Nix: the good parts')
})

test('the deck body is untouched', () => {
  const body = '# A\n\n- one\n- two\n\n---\n\n## B\n'
  const next = applyMeta(`---\ntitle: T\n---\n\n${body}`, { title: 'T2' })
  assert.ok(next.endsWith(`\n\n${body}`))
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
