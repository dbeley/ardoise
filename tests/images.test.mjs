/**
 * Image checks (no browser): markup parsing and formatting.
 *
 *   node tests/images.test.mjs
 */
import assert from 'node:assert/strict'
import {
  parseWidth,
  parseImageAlt,
  parseImageLine,
  imageMarkdown,
} from '../src/lib/images.js'

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

test('a width is a percentage between 25 and 100', () => {
  assert.equal(parseWidth('60%'), 60)
  assert.equal(parseWidth('25%'), 25)
  assert.equal(parseWidth('100%'), 100)
  assert.equal(parseWidth('24%'), null)
  assert.equal(parseWidth('101%'), null)
  assert.equal(parseWidth('60'), null)
})

test('alt and width split on the last bar', () => {
  assert.deepEqual(parseImageAlt('A cat|60%'), { alt: 'A cat', width: 60 })
  assert.deepEqual(parseImageAlt('A cat'), { alt: 'A cat', width: null })
  assert.deepEqual(parseImageAlt('a|b|60%'), { alt: 'a|b', width: 60 })
  assert.deepEqual(parseImageAlt('a|b'), { alt: 'a|b', width: null })
})

test('an image line is parsed', () => {
  assert.deepEqual(parseImageLine('![A cat|60%](https://x/y.jpg)'), {
    alt: 'A cat',
    src: 'https://x/y.jpg',
    width: 60,
  })
  assert.deepEqual(parseImageLine('![](x.jpg)'), { alt: '', src: 'x.jpg', width: null })
  assert.equal(parseImageLine('text ![a](b)'), null)
  assert.equal(parseImageLine(''), null)
})

test('markdown keeps the width only when it is not 100', () => {
  assert.equal(imageMarkdown({ alt: 'A cat', src: 'u', width: 60 }), '![A cat|60%](u)')
  assert.equal(imageMarkdown({ alt: 'A cat', src: 'u', width: 100 }), '![A cat](u)')
  assert.equal(imageMarkdown({ alt: '', src: 'u' }), '![](u)')
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
