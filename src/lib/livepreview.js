/**
 * livepreview.js - decorate a markdown document for live-preview editing.
 *
 * Markdown stays the source. Syntax is hidden everywhere except on the lines
 * holding the selection, so you can fix a stray `**` without leaving the
 * rendered view.
 *
 * This module is pure (no DOM): it takes a string plus selection offsets and
 * returns plain decoration descriptors. `editor.js` turns them into CodeMirror
 * objects, and the tests can check the parsing without a browser.
 */

import { parseImageLine } from './images.js'

const FENCE = /^\s*(`{3,}|~{3,})/
const HEADING = /^(#{1,6})\s+/
const BULLET = /^(\s*)([-*+])\s+/
const ORDERED = /^(\s*)(\d+\.)\s+/
const QUOTE = /^(\s*)>\s?/
const BOX = /^\s*:::/
const COMMENT = /^\s*<!--/
export function lineStarts(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') starts.push(i + 1)
  }
  return starts
}

export function lineAt(starts, pos) {
  let low = 0
  let high = starts.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if (starts[mid] <= pos) low = mid
    else high = mid - 1
  }
  return low
}

/** Split a line into inline code spans, so markdown is not parsed inside them. */
function codeSpans(line) {
  const spans = []
  const re = /`([^`]+)`/g
  let match
  while ((match = re.exec(line))) {
    spans.push({ from: match.index, to: match.index + match[0].length, inner: [match.index + 1, match.index + 1 + match[1].length] })
  }
  return spans
}

function overlaps(spans, from, to) {
  return spans.some((span) => from < span.to && to > span.from)
}

/**
 * @param {string} text slide markdown
 * @param {{from:number,to:number}[]} selections cursor offsets in the document
 * @returns {{lines: {line:number, className:string}[], marks: {from:number,to:number,className:string}[], replaces: {from:number,to:number}[]}}
 */
export function buildDecorations(text, selections = []) {
  const starts = lineStarts(text)
  const active = new Set()
  for (const selection of selections) {
    const from = lineAt(starts, Math.max(0, Math.min(selection.from, text.length)))
    const to = lineAt(starts, Math.max(0, Math.min(selection.to, text.length)))
    for (let line = from; line <= to; line += 1) active.add(line)
  }

  const lines = []
  const marks = []
  const replaces = []

  let fence = null

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index]
    const end = index + 1 < starts.length ? starts[index + 1] - 1 : text.length
    const line = text.slice(start, end)
    const isActive = active.has(index)

    // Code blocks: never decorate the inside, only style the line.
    const fenceMatch = line.match(FENCE)
    if (fenceMatch) {
      if (!fence) {
        fence = fenceMatch[1][0]
        lines.push({ line: index, className: 'cm-fence cm-fence-open' })
        continue
      }
      lines.push({ line: index, className: 'cm-fence cm-fence-close' })
      fence = null
      continue
    }
    if (fence) {
      lines.push({ line: index, className: 'cm-fence' })
      continue
    }

    if (COMMENT.test(line)) {
      lines.push({ line: index, className: 'cm-comment' })
      continue
    }

    if (BOX.test(line)) {
      lines.push({ line: index, className: 'cm-box-line' })
      continue
    }

    const image = parseImageLine(line)
    if (image) {
      if (!isActive) {
        replaces.push({ from: start, to: end, widget: { type: 'image', ...image } })
      }
      lines.push({ line: index, className: 'cm-image-line' })
      continue
    }

    let contentStart = 0

    const heading = line.match(HEADING)
    if (heading) {
      const level = heading[1].length
      lines.push({ line: index, className: `cm-heading cm-h${Math.min(level, 4)}` })
      if (!isActive) {
        replaces.push({ from: start, to: start + heading[0].length })
        contentStart = heading[0].length
      }
    } else {
      const bullet = line.match(BULLET)
      const ordered = line.match(ORDERED)
      const quote = line.match(QUOTE)

      if (bullet) {
        lines.push({ line: index, className: 'cm-bullet' })
        if (!isActive) {
          replaces.push({ from: start, to: start + bullet[0].length })
          contentStart = bullet[0].length
        }
      } else if (ordered) {
        lines.push({ line: index, className: 'cm-ordered' })
      } else if (quote) {
        lines.push({ line: index, className: 'cm-quote' })
        if (!isActive) {
          replaces.push({ from: start, to: start + quote[0].length })
          contentStart = quote[0].length
        }
      } else if (line.startsWith('|')) {
        lines.push({ line: index, className: 'cm-table' })
      } else if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
        lines.push({ line: index, className: 'cm-rule' })
      }
    }

    // Markdown inline, hors code.
    const code = codeSpans(line)
    for (const span of code) {
      marks.push({
        from: start + span.inner[0],
        to: start + span.inner[1],
        className: 'cm-code',
      })
      if (!isActive) {
        replaces.push({ from: start + span.from, to: start + span.inner[0] })
        replaces.push({ from: start + span.inner[1], to: start + span.to })
      }
    }

    const inline = (regex, className, markerLength) => {
      regex.lastIndex = 0
      let match
      while ((match = regex.exec(line))) {
        const from = match.index
        const to = match.index + match[0].length
        if (to <= contentStart) continue
        if (overlaps(code, from, to)) continue

        if (className) {
          marks.push({ from: start + from + markerLength, to: start + to - markerLength, className })
        }
        if (!isActive) {
          if (className === 'cm-link') {
            // [texte](url) : on garde le texte, on retire les crochets et l'URL.
            const closeBracket = line.indexOf('](', from)
            replaces.push({ from: start + from, to: start + from + 1 })
            replaces.push({ from: start + closeBracket, to: start + to })
          } else {
            replaces.push({ from: start + from, to: start + from + markerLength })
            replaces.push({ from: start + to - markerLength, to: start + to })
          }
        }
        if (match[0].length === 0) regex.lastIndex += 1
      }
    }

    // Links: asymmetric markers, handled separately.
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g
    let link
    while ((link = linkRe.exec(line))) {
      const from = link.index
      const to = link.index + link[0].length
      if (to <= contentStart || overlaps(code, from, to)) continue
      const textFrom = from + 1
      const textTo = textFrom + link[1].length
      marks.push({ from: start + textFrom, to: start + textTo, className: 'cm-link' })
      if (!isActive) {
        replaces.push({ from: start + from, to: start + textFrom })
        replaces.push({ from: start + textTo, to: start + to })
      }
    }

    inline(/\*\*([^*]+)\*\*/g, 'cm-strong', 2)
    inline(/__([^_]+)__/g, 'cm-strong', 2)
    inline(/~~([^~]+)~~/g, 'cm-strike', 2)
    inline(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, 'cm-em', 1)
  }

  marks.sort((a, b) => a.from - b.from || a.to - b.to)
  return { lines, marks, replaces }
}
