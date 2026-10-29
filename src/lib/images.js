/**
 * images.js - image markup and search.
 *
 * The deck stores a URL, never a copy: an image is standard markdown, with an
 * optional width as a percentage: `![alt|60%](https://host/x.jpg)`.
 */

/** A width is a percentage between 1 and 100. */
export function parseWidth(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,3})%$/)
  if (!match) return null
  const number = Number(match[1])
  return number >= 1 && number <= 100 ? number : null
}

/** Split `alt|60%` into its alt and width. */
export function parseImageAlt(content) {
  const raw = String(content ?? '')
  const bar = raw.lastIndexOf('|')
  if (bar !== -1) {
    const width = parseWidth(raw.slice(bar + 1))
    if (width !== null) return { alt: raw.slice(0, bar).trim(), width }
  }
  return { alt: raw.trim(), width: null }
}

/** Parse a line that is exactly one image, if any. */
export function parseImageLine(line) {
  const match = String(line ?? '').trim().match(/^!\[([^\]]*)\]\((\S+)\)$/)
  if (!match) return null
  const { alt, width } = parseImageAlt(match[1])
  return { alt, src: match[2], width }
}

/** The markdown for one image; a 100% width is the default and stays implicit. */
export function imageMarkdown({ alt = '', src = '', width = null } = {}) {
  const label = width !== null && width !== undefined && width < 100 ? `${alt}|${width}%` : alt
  return `![${label}](${src})`
}

/**
 * Where to insert an image paragraph and where the cursor goes after it.
 * Never glues the image to the previous line: on a deck made only of the
 * starter comment, that would keep the line a comment and hide the image.
 */
export function imageInsertion(source, at, markup) {
  const value = String(source ?? '')
  const position = Math.max(0, Math.min(Number(at) || 0, value.length))
  const before = value.slice(0, position)
  const after = value.slice(position)
  const lead =
    position === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  let insert = `${lead}${markup}`
  let pos
  if (after.startsWith('\n')) {
    pos = position + insert.length + 1
  } else {
    insert += '\n'
    pos = position + insert.length
  }
  return { at: position, insert, pos }
}

