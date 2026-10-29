/**
 * images.js - image markup and search.
 *
 * The deck stores a URL, never a copy: an image is standard markdown, with an
 * optional width as a percentage: `![alt|60%](https://host/x.jpg)`.
 */

/** A width is a percentage between 25 and 100. */
export function parseWidth(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,3})%$/)
  if (!match) return null
  const number = Number(match[1])
  return number >= 25 && number <= 100 ? number : null
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
