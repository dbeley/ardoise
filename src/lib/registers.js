/**
 * registers.js - the yank ring and where a paste lands.
 *
 * A register entry is `{ text, linewise }`: a word or a character is pasted
 * inline, a whole block (`dd`, `yy`) is pasted as its own paragraph. The ring
 * keeps the last nine entries; `p` uses the most recent, `"3p` the third.
 */
import { clamp } from './motions.js'

export const REGISTER_COUNT = 9

/** Push an entry on the ring, newest first, and keep it bounded. */
export function pushRegister(ring, entry) {
  if (!entry?.text) return ring
  return [{ text: entry.text, linewise: !!entry.linewise }, ...ring].slice(0, REGISTER_COUNT)
}

/** 1-based pick: 1 is the most recent, 9 the oldest kept. */
export function pickRegister(ring, index = 1) {
  if (!ring.length) return null
  return ring[clamp(index, 1, ring.length) - 1]
}

/** The text of `count` pasted copies, blank-line separated for blocks. */
export function registerCopies(entry, count = 1) {
  return Array.from({ length: Math.max(1, count) }, () => entry.text).join('\n\n')
}

/** Inline paste, after the cursor (`p`) or before it (`P`). */
export function charwisePaste(text, pos, entry, { before = false, count = 1 } = {}) {
  const value = String(text ?? '')
  const at = clamp(Number(pos) || 0, 0, value.length)
  const from = before ? at : Math.min(at + 1, value.length)
  const insert = entry.text.repeat(Math.max(1, count))
  return { from, insert, pos: from + insert.length - 1 }
}

/**
 * Block paste: `block` is the current paragraph as `{ start, end }` offsets.
 * The pasted text becomes its own block, blank lines included.
 */
export function linewisePaste(entry, block, { before = false, count = 1 } = {}) {
  const content = registerCopies(entry, count)
  if (before) return { from: block.start, insert: `${content}\n\n`, pos: block.start }
  return { from: block.end, insert: `\n\n${content}`, pos: block.end + 2 }
}
