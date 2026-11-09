/**
 * tables.js - the skeleton `:table` inserts.
 *
 * A table is plain markdown; the command only saves typing the pipes and lands
 * the cursor in the first header cell.
 */

const MAX_COLS = 8
const MAX_ROWS = 20
const DEFAULT = { cols: 2, rows: 1 }

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/**
 * An empty table: a header row, the delimiter markdown-it needs, then `rows`
 * empty rows. Every cell is two spaces, so nothing has to be deleted.
 */
export function tableMarkdown({ cols = DEFAULT.cols, rows = DEFAULT.rows } = {}) {
  const columns = clamp(Math.round(Number(cols) || DEFAULT.cols), 1, MAX_COLS)
  const lines = clamp(Math.round(Number(rows) || DEFAULT.rows), 1, MAX_ROWS)
  const row = `|${'  |'.repeat(columns)}`
  const delimiter = `|${'---|'.repeat(columns)}`
  return [row, delimiter, ...Array(lines).fill(row)].join('\n')
}

/** `3x4` is 3 columns and 4 rows; a bare number is a column count. */
export function parseTableSize(argument) {
  const text = String(argument ?? '').trim()
  const pair = text.match(/^(\d+)\s*x\s*(\d+)$/i)
  const single = text.match(/^(\d+)$/)
  if (pair) {
    return {
      cols: clamp(Number(pair[1]), 1, MAX_COLS),
      rows: clamp(Number(pair[2]), 1, MAX_ROWS),
    }
  }
  if (single) return { cols: clamp(Number(single[1]), 1, MAX_COLS), rows: DEFAULT.rows }
  return { ...DEFAULT }
}

/**
 * Where to insert the table after `at` (the end of the current block), and
 * where the cursor goes: in the first header cell.
 */
export function tableInsertion(source, at, size = {}) {
  const value = String(source ?? '')
  const position = Math.max(0, Math.min(Number(at) || 0, value.length))
  const markup = tableMarkdown(size)
  const before = value.slice(0, position)
  const after = value.slice(position)
  const lead =
    position === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  let insert = `${lead}${markup}`

  if (!after.startsWith('\n')) insert += '\n'

  // Right after the leading `| ` of the header row.
  const pos = position + lead.length + 2
  return { at: position, insert, pos }
}
