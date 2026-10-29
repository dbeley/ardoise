/**
 * Core checks (no browser): block splitting, surgical source editing,
 * motions and operators.
 *
 *   node tests/core.test.mjs
 */
import assert from 'node:assert/strict'
import {
  parseDeck,
  scanBlocks,
  applyBlockEdit,
  insertBlockAfter,
  serialize,
} from '../src/lib/deck.js'
import {
  nextWordStart,
  prevWordStart,
  wordEnd,
  move,
  operatorRange,
  deleteRange,
  smartNewline,
  lineStart,
  lineEnd,
} from '../src/lib/motions.js'

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

/* ---------------- splitting ---------------- */

const slide = `## A title

First paragraph.

- one bullet
- another one

<!-- pause -->

After the pause.

<!-- note: nothing to report -->`

test('blocks follow paragraphs', () => {
  const { blocks } = scanBlocks(slide)
  assert.deepEqual(
    blocks.map((b) => b.kind),
    ['heading', 'para', 'list', 'para']
  )
  assert.equal(blocks[0].text, '## A title')
  assert.equal(blocks[2].text, '- one bullet\n- another one')
})

test('pauses create segments', () => {
  const { blocks, segmentCount } = scanBlocks(slide)
  assert.equal(segmentCount, 2)
  assert.equal(blocks[3].segIndex, 1)
})

test('line ranges point at the right text', () => {
  const { blocks } = scanBlocks(slide)
  const lines = slide.split('\n')
  for (const block of blocks) {
    const slice = lines.slice(block.startLine, block.endLine + 1).join('\n')
    assert.equal(slice.trim(), block.text, `block ${block.kind}`)
  }
})

test('a code block stays a single block', () => {
  const { blocks } = scanBlocks('```nix\n{\n  a = 1;\n}\n```\n\nAfter.')
  assert.equal(blocks.length, 2)
  assert.equal(blocks[0].kind, 'fence')
  assert.ok(blocks[0].text.includes('a = 1;'))
  // the range must cover the closing fence, not just the opening line:
  // `O` and `dd` rely on it to target the whole block.
  assert.deepEqual([blocks[0].startLine, blocks[0].endLine], [0, 4])
})

test('a callout stays a single block', () => {
  const { blocks } = scanBlocks('::: key\nsome text\n:::')
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].kind, 'box')
  assert.deepEqual([blocks[0].startLine, blocks[0].endLine], [0, 2])
})

/* ---------------- source editing ---------------- */

const deck = `---
title: Test
---

## Title

First.

- a
- b

<!-- note: keep this -->

---

## Two
`

test('editing a block leaves the rest untouched', () => {
  const parsed = parseDeck(deck)
  const block = parsed.slides[0].blocks[1]
  const next = applyBlockEdit(deck, 0, block.startLine, block.endLine, 'First, edited.')
  const reparsed = parseDeck(next)
  assert.equal(reparsed.slides[0].blocks[1].text, 'First, edited.')
  assert.ok(next.includes('<!-- note: keep this -->'), 'the note must survive')
  assert.ok(next.includes('## Two'), 'the next slide must survive')
  assert.equal(reparsed.slides.length, 2)
})

test('a multi-line block is replaced as a whole', () => {
  const parsed = parseDeck(deck)
  const list = parsed.slides[0].blocks[2]
  const next = applyBlockEdit(deck, 0, list.startLine, list.endLine, '- c')
  const reparsed = parseDeck(next)
  assert.equal(reparsed.slides[0].blocks[2].text, '- c')
  assert.equal(reparsed.slides[0].blocks.length, parsed.slides[0].blocks.length)
})

test('inserting a block after another', () => {
  const parsed = parseDeck(deck)
  const block = parsed.slides[0].blocks[0]
  const next = insertBlockAfter(deck, 0, block.endLine, 'New paragraph.')
  const reparsed = parseDeck(next)
  assert.equal(reparsed.slides[0].blocks[1].text, 'New paragraph.')
  assert.equal(reparsed.slides[0].blocks[2].text, 'First.')
})

test('serialize keeps the markdown intact', () => {
  const round = serialize(parseDeck(deck))
  assert.equal(parseDeck(round).slides.length, 2)
  assert.ok(round.includes('title: Test'))
})

/* ---------------- motions ---------------- */

const text = 'hello brave world'

test('w moves word by word', () => {
  assert.equal(nextWordStart(text, 0), 6)
  assert.equal(nextWordStart(text, 6), 12)
  assert.equal(nextWordStart(text, 12), text.length)
})

test('b moves back word by word', () => {
  assert.equal(prevWordStart(text, 12), 6)
  assert.equal(prevWordStart(text, 6), 0)
  assert.equal(prevWordStart(text, 0), 0)
})

test('e reaches the end of the word', () => {
  assert.equal(wordEnd(text, 0), 4)
  assert.equal(wordEnd(text, 6), 10)
  assert.equal(wordEnd(text, 12), 16)
})

test('h and l move one character, without leaving', () => {
  assert.equal(move(text, 0, 'h'), 0)
  assert.equal(move(text, 3, 'l'), 4)
  assert.equal(move(text, text.length - 1, 'l'), text.length - 1)
})

test('0 and $ go to line start and end', () => {
  const multi = 'abc\ndefgh'
  assert.equal(lineStart(multi, 6), 4)
  assert.equal(lineEnd(multi, 5), multi.length)
  assert.equal(move(multi, 6, '0'), 4)
  assert.equal(move(multi, 4, '$'), 8) // last character of 'defgh'
})

test('j and k keep the column', () => {
  const multi = 'abcdef\nxy\nabcdef'
  assert.equal(move(multi, 3, 'j'), 8) // short line: last real column
  assert.equal(move(multi, 8, 'k'), 1) // column 1 kept, not 3
  assert.equal(move('abcdef\nuvwxyz', 3, 'j'), 10)
})

test('counts multiply a motion', () => {
  assert.equal(move('a b c d e', 0, 'w', 3), 6)
})

/* ---------------- operators ---------------- */

test('dw deletes up to the next word', () => {
  const [from, to] = operatorRange(text, 0, 'w')
  assert.deepEqual([from, to], [0, 6])
  assert.equal(deleteRange(text, from, to).text, 'brave world')
})

test('de deletes the whole current word', () => {
  const [from, to] = operatorRange(text, 0, 'e')
  assert.equal(text.slice(from, to), 'hello')
})

test('d0 deletes from line start to the cursor', () => {
  const [from, to] = operatorRange('abcdef', 4, '0')
  assert.deepEqual([from, to], [0, 4])
})

test('dd targets the whole block', () => {
  assert.deepEqual(operatorRange(text, 3, 'd'), [0, text.length])
})

test('deleting a range puts the cursor back', () => {
  const result = deleteRange(text, 6, 12)
  assert.equal(result.text, 'hello world')
  assert.equal(result.pos, 6)
})

/* ---------------- smart newline ---------------- */

test('enter continues a bullet', () => {
  const result = smartNewline('- first', 7)
  assert.equal(result.text, '- first\n- ')
  assert.equal(result.pos, 10)
})

test('enter outside a list adds a line', () => {
  const result = smartNewline('text', 4)
  assert.equal(result.text, 'text\n')
  assert.equal(result.pos, 5)
})

test('enter in a numbered list keeps the prefix', () => {
  const result = smartNewline('1. one', 6)
  assert.equal(result.text, '1. one\n1. ')
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
