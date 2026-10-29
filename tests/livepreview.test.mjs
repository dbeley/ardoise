/**
 * Live-preview checks: which markers are hidden, which spans are styled, and
 * above all that nothing disappears on the cursor's line.
 *
 *   node tests/livepreview.test.mjs
 */
import assert from 'node:assert/strict'
import { buildDecorations, lineStarts, lineAt } from '../src/lib/livepreview.js'

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

const hiddenIndex = (text, result, needle) => {
  const at = text.indexOf(needle)
  return result.replaces.some((r) => r.from <= at && r.to >= at + needle.length)
}

const marked = (result, text) => result.marks.map((m) => text.slice(m.from, m.to))

/* ---------------- headings ---------------- */

const heading = '## A title\n\nRest.'
test('a heading takes the style of its level', () => {
  const result = buildDecorations(heading, [{ from: heading.length, to: heading.length }])
  assert.ok(result.lines.some((l) => l.line === 0 && l.className.includes('cm-h2')))
})
test('hashes are hidden when the cursor is elsewhere', () => {
  const result = buildDecorations(heading, [{ from: heading.length, to: heading.length }])
  assert.ok(hiddenIndex(heading, result, '## '))
})
test('hashes come back on the cursor line', () => {
  const result = buildDecorations(heading, [{ from: 4, to: 4 }])
  assert.equal(result.replaces.length, 0)
})

/* ---------------- inline ---------------- */

const bold = 'some **bold text** here\n\nanother line'
test('bold is styled and its asterisks hidden', () => {
  const result = buildDecorations(bold, [{ from: bold.length, to: bold.length }])
  assert.deepEqual(marked(result, bold), ['bold text'])
  assert.ok(hiddenIndex(bold, result, '**'))
  assert.equal(result.lines.length, 0)
})
test('bold markers come back on their own line', () => {
  const result = buildDecorations(bold, [{ from: 4, to: 4 }])
  assert.equal(result.replaces.length, 0)
  assert.deepEqual(marked(result, bold), ['bold text'])
})

const mixed = 'some *slanted*, some `code` and a [link](https://x.y)\n\nrest'
test('italic, inline code and link are detected', () => {
  const result = buildDecorations(mixed, [{ from: mixed.length, to: mixed.length }])
  assert.deepEqual(marked(result, mixed), ['slanted', 'code', 'link'])
})
test('the link hides its brackets and URL', () => {
  const result = buildDecorations(mixed, [{ from: mixed.length, to: mixed.length }])
  assert.ok(hiddenIndex(mixed, result, '['))
  assert.ok(hiddenIndex(mixed, result, '](https://x.y)'))
  assert.ok(!hiddenIndex(mixed, result, 'link]'))
})
test('inline code content is not parsed as markdown', () => {
  const line = 'a `**not bold**` here'
  const result = buildDecorations(line, [{ from: line.length, to: line.length }])
  assert.equal(result.marks.length, 1)
  assert.equal(line.slice(result.marks[0].from, result.marks[0].to), '**not bold**')
})

/* ---------------- lists and quotes ---------------- */

const list = '- one bullet\n- another one'
test('bullets are styled and the dash hidden', () => {
  const result = buildDecorations(list, [{ from: list.length, to: list.length }])
  assert.equal(result.lines.filter((l) => l.className === 'cm-bullet').length, 2)
  assert.ok(hiddenIndex(list, result, '- '))
})
test('a numbered list keeps its numbers', () => {
  const result = buildDecorations('1. one\n2. two', [{ from: 0, to: 0 }])
  assert.equal(result.replaces.length, 0)
})

/* ---------------- blocks ---------------- */

const fence = '```nix\n{ a = "**not bold**"; }\n```'
test('inside a code block is not styled as markdown', () => {
  const result = buildDecorations(fence, [{ from: 0, to: 0 }])
  assert.equal(result.marks.length, 0)
  assert.equal(result.lines.filter((l) => l.className.startsWith('cm-fence')).length, 3)
})
test('a comment is flagged as such', () => {
  const text = '<!-- note: to say -->'
  const result = buildDecorations(text, [{ from: 0, to: 0 }])
  assert.equal(result.lines[0].className, 'cm-comment')
})
test('a callout keeps its fence lines', () => {
  const result = buildDecorations('::: key\nsome text\n:::', [{ from: 0, to: 0 }])
  assert.equal(result.lines.filter((l) => l.className === 'cm-box-line').length, 2)
})
test('a horizontal rule is detected', () => {
  const result = buildDecorations('---', [{ from: 0, to: 0 }])
  assert.equal(result.lines[0].className, 'cm-rule')
})

/* ---------------- positions ---------------- */

test('lines are located by offset', () => {
  const text = 'a\nbb\n\nccc'
  const starts = lineStarts(text)
  assert.deepEqual(starts, [0, 2, 5, 6])
  assert.equal(lineAt(starts, 0), 0)
  assert.equal(lineAt(starts, 3), 1)
  assert.equal(lineAt(starts, 6), 3)
})

test('a multi-line selection keeps syntax visible across it', () => {
  const text = '## title\n\n**bold**'
  const result = buildDecorations(text, [{ from: 0, to: text.length }])
  assert.equal(result.replaces.filter((r) => r.from < text.indexOf('**')).length, 0)
})

console.log(`\n${passed} checks passed${process.exitCode ? ' - failures above' : ''}`)
