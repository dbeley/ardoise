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
  searchImages,
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

await test('a width is a percentage between 25 and 100', () => {
  assert.equal(parseWidth('60%'), 60)
  assert.equal(parseWidth('25%'), 25)
  assert.equal(parseWidth('100%'), 100)
  assert.equal(parseWidth('24%'), null)
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

const payload = {
  results: [
    {
      id: '1',
      title: 'A cat',
      url: 'https://x/y.jpg',
      thumbnail: 'https://x/t.jpg',
      creator: 'Jane',
      license: 'by',
      license_version: '4.0',
      foreign_landing_url: 'https://x/page',
      width: 800,
      height: 600,
    },
  ],
}
const fakeFetch = (status = 200, body = payload) => {
  let calls = 0
  const impl = async () => {
    calls += 1
    return { ok: status < 400, status, json: async () => body }
  }
  impl.calls = () => calls
  return impl
}

await test('results are normalised', async () => {
  const [result] = await searchImages('cat', { fetchImpl: fakeFetch() })
  assert.equal(result.title, 'A cat')
  assert.equal(result.src, 'https://x/y.jpg')
  assert.equal(result.width, 800)
  assert.equal(result.license, 'BY')
})

await test('a one-letter query does not search', async () => {
  const impl = fakeFetch()
  assert.deepEqual(await searchImages('c', { fetchImpl: impl }), [])
  assert.equal(impl.calls(), 0)
})

await test('a query is cached', async () => {
  const impl = fakeFetch()
  const query = `cached-${Math.random()}`
  await searchImages(query, { fetchImpl: impl })
  await searchImages(query, { fetchImpl: impl })
  assert.equal(impl.calls(), 1)
})

await test('a 429 is a rate limit', async () => {
  await assert.rejects(
    () => searchImages(`limited-${Math.random()}`, { fetchImpl: fakeFetch(429, {}) }),
    (error) => error.kind === 'rate-limit'
  )
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
