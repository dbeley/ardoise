/**
 * links.js - the markdown built by `:link`.
 *
 * A link is plain markdown; the URL is validated by the dialog with
 * `normalizeUrl` before it gets here.
 */
export function linkMarkdown({ text = '', url = '' } = {}) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
  const label = clean || String(url).trim()
  return `[${label.replace(/([[\]])/g, '\\$1')}](${String(url).trim()})`
}

/**
 * Where to insert an inline link: its own line when the cursor sits at the
 * start of a non-empty line (otherwise it would eat a heading), padded with a
 * space when it lands against text.
 */
export function linkInsertion(source, at, markup) {
  const value = String(source ?? '')
  const position = Math.max(0, Math.min(Number(at) || 0, value.length))
  const lineStart = value.lastIndexOf('\n', Math.max(0, position - 1)) + 1
  const lineEnd = value.indexOf('\n', position)
  const line = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd)

  if (position === lineStart && line.trim()) {
    return { at: position, insert: `${markup}\n`, pos: position + markup.length + 1 }
  }

  const before = position > 0 ? value[position - 1] : ''
  const after = position < value.length ? value[position] : ''
  const lead = before && !/\s/.test(before) ? ' ' : ''
  const trail = after && !/\s/.test(after) ? ' ' : ''
  const insert = `${lead}${markup}${trail}`
  return { at: position, insert, pos: position + insert.length }
}

/**
 * The link the cursor sits in on its line: `[text](url)`, or `null`. An image
 * (`![alt](url)`) is not a link: the cursor is not "on" it to follow it.
 */
export function linkAt(line, offset) {
  const text = String(line ?? '')
  const at = Number(offset) || 0
  const re = /\[([^\]]*)\]\(([^)\s]+)\)/g
  let match
  while ((match = re.exec(text))) {
    const from = match.index
    const to = from + match[0].length
    if (at < from || at > to) continue
    if (from > 0 && text[from - 1] === '!') continue
    return { text: match[1], url: match[2], from, to }
  }
  return null
}
