/**
 * Image checks (no browser): markup parsing, formatting and the search client.
 *
 *   node tests/images.test.mjs
 */
import assert from 'node:assert/strict'
import {
  parseWidth,
  parseImageAlt,
  parseImageLine,
  imageMarkdown,
  imageInsertion,
} from '../src/lib/images.js'
import { scanBlocks } from '../src/lib/deck.js'

let passed = 0
const test = async (name, fn) => {
  try {
    await fn()
    passed += 1
    console.log(`  ok   ${name}`)
  } catch (error) {
    console.log(`  FAIL ${name}\n       ${error.message}`)
    process.exitCode = 1
  }
}

await test('a width is a percentage between 1 and 100', () => {
  assert.equal(parseWidth('60%'), 60)
  assert.equal(parseWidth('30%'), 30)
  assert.equal(parseWidth('25%'), 25)
  assert.equal(parseWidth('20%'), 20)
  assert.equal(parseWidth('5%'), 5)
  assert.equal(parseWidth('1%'), 1)
  assert.equal(parseWidth('100%'), 100)
  assert.equal(parseWidth('0%'), null)
  assert.equal(parseWidth('101%'), null)
  assert.equal(parseWidth('60'), null)
})

await test('alt and width split on the last bar', () => {
  assert.deepEqual(parseImageAlt('A cat|60%'), { alt: 'A cat', width: 60 })
  assert.deepEqual(parseImageAlt('A cat'), { alt: 'A cat', width: null })
  assert.deepEqual(parseImageAlt('a|b|60%'), { alt: 'a|b', width: 60 })
  assert.deepEqual(parseImageAlt('a|b'), { alt: 'a|b', width: null })
})

await test('an image line is parsed', () => {
  assert.deepEqual(parseImageLine('![A cat|60%](https://x/y.jpg)'), {
    alt: 'A cat',
    src: 'https://x/y.jpg',
    width: 60,
  })
  assert.deepEqual(parseImageLine('![](x.jpg)'), { alt: '', src: 'x.jpg', width: null })
  assert.equal(parseImageLine('text ![a](b)'), null)
  assert.equal(parseImageLine(''), null)
})

await test('markdown keeps the width only when it is not 100', () => {
  assert.equal(imageMarkdown({ alt: 'A cat', src: 'u', width: 60 }), '![A cat|60%](u)')
  assert.equal(imageMarkdown({ alt: 'A cat', src: 'u', width: 100 }), '![A cat](u)')
  assert.equal(imageMarkdown({ alt: '', src: 'u' }), '![](u)')
})

await test('an image appended to a comment-only deck becomes a block', () => {
  const source = '<!-- i to type -->'
  const { at, insert } = imageInsertion(source, source.length, '![A cat](u.jpg)')
  const next = source.slice(0, at) + insert + source.slice(at)
  const { blocks } = scanBlocks(next)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].text, '![A cat](u.jpg)')
})

await test('an image after a block does not add a blank line', () => {
  const source = 'text\n\nrest'
  const { at, insert } = imageInsertion(source, 4, '![img](u.jpg)')
  const next = source.slice(0, at) + insert + source.slice(at)
  assert.equal(next, 'text\n\n![img](u.jpg)\n\nrest')
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
