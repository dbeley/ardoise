/**
 * motions.js - cursor motions and operators over a block's text.
 *
 * A block is a string (the paragraph's raw markdown). Every function works on
 * character offsets in that string, which makes editing exact: we change the
 * text, not the rendering.
 */

const WORD_CHAR = /[\p{L}\p{N}_]/u

function charClass(ch) {
  if (ch === undefined) return 0
  if (/\s/.test(ch)) return 0
  if (WORD_CHAR.test(ch)) return 1
  return 2
}

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

/** Start of the next word (`w` behaviour). */
export function nextWordStart(text, pos) {
  const n = text.length
  let i = clamp(pos, 0, n)
  if (i >= n) return n

  if (charClass(text[i]) !== 0) {
    const startClass = charClass(text[i])
    while (i < n && charClass(text[i]) === startClass) i += 1
  }
  while (i < n && charClass(text[i]) === 0) i += 1
  return i
}

/** Start of the previous word (`b` behaviour). */
export function prevWordStart(text, pos) {
  let i = clamp(pos, 0, text.length)
  if (i === 0) return 0
  i -= 1
  while (i > 0 && charClass(text[i]) === 0) i -= 1
  const c = charClass(text[i])
  while (i > 0 && charClass(text[i - 1]) === c) i -= 1
  return i
}

/** End of the current or next word (`e` behaviour). */
export function wordEnd(text, pos) {
  const n = text.length
  let i = clamp(pos, 0, n)
  if (i >= n) return n

  if (charClass(text[i]) !== 0) i += 1
  while (i < n && charClass(text[i]) === 0) i += 1
  if (i >= n) return n - 1
  const c = charClass(text[i])
  while (i + 1 < n && charClass(text[i + 1]) === c && c !== 0) i += 1
  return i
}

export function lineStart(text, pos) {
  const i = clamp(pos, 0, text.length)
  const found = text.lastIndexOf('\n', Math.max(0, i - 1))
  return found === -1 ? 0 : found + 1
}

export function lineEnd(text, pos) {
  const i = clamp(pos, 0, text.length)
  const found = text.indexOf('\n', i)
  return found === -1 ? text.length : found
}

/** Visual column, kept across j/k moves. */
export function columnOf(text, pos) {
  return clamp(pos, 0, text.length) - lineStart(text, pos)
}

export function lineDown(text, pos, column = null) {
  const end = lineEnd(text, pos)
  if (end >= text.length) return pos
  const col = column ?? columnOf(text, pos)
  const nextStart = end + 1
  const nextEnd = lineEnd(text, nextStart)
  const last = nextEnd > nextStart ? nextEnd - 1 : nextStart
  return Math.min(nextStart + col, last)
}

export function lineUp(text, pos, column = null) {
  const start = lineStart(text, pos)
  if (start === 0) return pos
  const col = column ?? columnOf(text, pos)
  const prevEnd = start - 1
  const prevStart = lineStart(text, prevEnd)
  const last = prevEnd > prevStart ? prevEnd - 1 : prevStart
  return Math.min(prevStart + col, last)
}

/** Move the cursor along a named motion. */
export function move(text, pos, motion, count = 1) {
  let i = clamp(pos, 0, text.length)
  let column = null

  for (let n = 0; n < Math.max(1, count); n += 1) {
    switch (motion) {
      case 'h':
        i = Math.max(0, i - 1)
        break
      case 'l':
        i = Math.min(Math.max(0, text.length - 1), i + 1)
        break
      case 'w':
        i = nextWordStart(text, i)
        break
      case 'b':
        i = prevWordStart(text, i)
        break
      case 'e':
        // Vim leaves the cursor *on* the last character of the word; the block
        // cursor covers the character at its offset, so that is the index.
        i = wordEnd(text, i)
        break
      case '0':
        i = lineStart(text, i)
        break
      case '$':
        i = Math.max(lineStart(text, i), lineEnd(text, i) - 1)
        break
      case 'j':
        column = column ?? columnOf(text, i)
        i = lineDown(text, i, column)
        break
      case 'k':
        column = column ?? columnOf(text, i)
        i = lineUp(text, i, column)
        break
      default:
        return i
    }
  }
  return i
}

/** Range [start, end) covered by an operator (d, c) followed by a motion.
 * `dd`/`cc` (motion === 'd') renvoie tout le bloc.
 */
export function operatorRange(text, pos, motion, count = 1) {
  const start = clamp(pos, 0, text.length)
  // The arrows are line motions inside a block, like j/k;
  // `d↓`, `y↓`, `d↑` must work too.
  const key = motion === '↑' ? 'k' : motion === '↓' ? 'j' : motion

  if (key === 'd') return [0, text.length]

  switch (key) {
    case 'w': {
      let end = start
      for (let n = 0; n < Math.max(1, count); n += 1) end = nextWordStart(text, end)
      return [start, end]
    }
    case 'b': {
      let begin = start
      for (let n = 0; n < Math.max(1, count); n += 1) begin = prevWordStart(text, begin)
      return [begin, start]
    }
    case 'e': {
      let end = start
      for (let n = 0; n < Math.max(1, count); n += 1) end = wordEnd(text, end) + 1
      return [start, clamp(end, 0, text.length)]
    }
    case 'l':
      return [start, clamp(start + Math.max(1, count), 0, text.length)]
    case 'h':
      return [clamp(start - Math.max(1, count), 0, text.length), start]
    case '0':
      return [lineStart(text, start), start]
    case '$':
      return [start, lineEnd(text, start)]
    case 'j': {
      let end = start
      const col = columnOf(text, start)
      for (let n = 0; n < Math.max(1, count); n += 1) end = lineDown(text, end, col)
      return [start, Math.min(text.length, lineEnd(text, end))]
    }
    case 'k': {
      let begin = start
      const col = columnOf(text, start)
      for (let n = 0; n < Math.max(1, count); n += 1) begin = lineUp(text, begin, col)
      return [lineStart(text, begin), start]
    }
    default:
      return [start, start]
  }
}

/** Supprime une plage et renvoie { text, pos }. */
export function deleteRange(text, from, to) {
  const start = clamp(Math.min(from, to), 0, text.length)
  const end = clamp(Math.max(from, to), 0, text.length)
  return {
    text: text.slice(0, start) + text.slice(end),
    pos: Math.min(start, text.length),
  }
}

/**
 * Indent or outdent a list item by one level (two spaces).
 * `delta > 0` nests the item, `delta < 0` moves it back one level.
 * Returns the change to apply plus the cursor offset, or null when the line
 * is not a list item (the caller can then fall back to plain spaces).
 */
export function listIndent(text, pos, delta = 1) {
  const start = lineStart(text, pos)
  const end = lineEnd(text, pos)
  const line = text.slice(start, end)
  const match = line.match(/^(\s*)([-*+]|\d+\.)\s/)
  if (!match) return null

  if (delta > 0) {
    const insert = '  '.repeat(Math.max(1, Math.round(delta)))
    return { from: start, to: start, insert, pos: Math.min(pos + insert.length, end + insert.length) }
  }

  const spaces = match[1].length
  if (!spaces) return { from: start, to: start, insert: '', pos }
  const remove = Math.min(2 * Math.max(1, Math.round(-delta)), spaces)
  return { from: start, to: start + remove, insert: '', pos: Math.max(start, pos - remove) }
}

/**
 * Smart newline: inside a list, continue the bullet; otherwise a plain line.
 */
export function smartNewline(text, pos) {
  const start = lineStart(text, pos)
  const line = text.slice(start, lineEnd(text, pos))
  const bullet = line.match(/^(\s*)([-*+]|\d+\.)\s/)
  const insert = bullet ? `\n${bullet[1]}${bullet[2]} ` : '\n'
  return {
    text: text.slice(0, pos) + insert + text.slice(pos),
    pos: pos + insert.length,
  }
}
