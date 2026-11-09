/**
 * visual.js - what a visual selection covers.
 *
 * `v` selects characters, `V` whole lines. Both end up as the same shape, so
 * one operator (`d`, `y`, `c`, `p`) works for either: `from`/`to` is the range
 * an operator removes, `keptFrom`/`keptTo` what the register keeps (whole lines
 * never keep their newline, as with `yy`).
 */
import { lineStarts, lineAt } from './livepreview.js'
import { lineRange, lineDeleteRange } from './deck.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/**
 * @param {string} raw slide markdown
 * @param {{from:number, to:number}} selection normalised selection offsets
 * @param {{linewise?: boolean, blocks?: object[]}} options
 * @returns {{from:number, to:number, keptFrom:number, keptTo:number, linewise:boolean}}
 */
export function visualRange(raw, selection, { linewise = false, blocks = [] } = {}) {
  const value = String(raw ?? '')
  const a = clamp(Number(selection?.from) || 0, 0, value.length)
  const b = clamp(Number(selection?.to) || 0, 0, value.length)
  const from = Math.min(a, b)
  const to = Math.max(a, b)

  if (!linewise) return { from, to, keptFrom: from, keptTo: to, linewise: false }

  const starts = lineStarts(value)
  const first = lineAt(starts, from)
  const last = lineAt(starts, to)
  const content = lineRange(value, first, last - first + 1)
  const target = lineDeleteRange(value, blocks, first, last - first + 1)
  return {
    from: target.from,
    to: target.to,
    keptFrom: content.from,
    keptTo: content.to,
    linewise: true,
  }
}
