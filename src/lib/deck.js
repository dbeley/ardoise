/**
 * deck.js — parsing / sérialisation du format ardoise.
 *
 * Format :
 *   ---
 *   title: Mon sujet
 *   author: David
 *   theme: ardoise
 *   ---
 *   # Slide 1
 *   ...
 *   ---
 *   # Slide 2
 *   <!-- pause -->        révèle la suite au pas suivant
 *   <!-- note: à dire -->  note orateur (jamais affichée sur scène)
 *   <!-- layout: center --> centre verticalement cette slide
 */

const FRONTMATTER_KEYS = ['title', 'author', 'theme', 'subtitle', 'date', 'event']

export function parseFrontmatter(source) {
  const text = String(source ?? '').replace(/\r\n?/g, '\n')
  if (!text.startsWith('---\n')) return { meta: {}, body: text }

  const end = text.indexOf('\n---', 4)
  if (end === -1) return { meta: {}, body: text }

  const head = text.slice(4, end)
  const body = text.slice(end + 4).replace(/^\n+/, '')

  const meta = {}
  for (const line of head.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    meta[key] = value
  }
  return { meta, body }
}

/** Découpe le corps en slides sur les lignes `---` isolées (hors blocs de code). */
export function splitSlides(body) {
  const slides = []
  let buffer = []
  let fenceChar = null

  for (const line of body.split('\n')) {
    const opening = line.match(/^\s*(`{3,}|~{3,})/)
    if (opening) {
      if (!fenceChar) fenceChar = opening[1][0]
      else if (new RegExp(`^\\s*${fenceChar}{3,}\\s*$`).test(line)) fenceChar = null
      buffer.push(line)
      continue
    }
    if (!fenceChar && /^\s*---\s*$/.test(line)) {
      slides.push(buffer.join('\n'))
      buffer = []
    } else {
      buffer.push(line)
    }
  }
  slides.push(buffer.join('\n'))
  return slides.map((s) => s.replace(/^\n+/, '').replace(/\s+$/, ''))
}

/**
 * Extrait les directives (commentaires HTML) d'une slide brute.
 * Renvoie la slide normalisée : { raw, body, note, layout, segments[] }
 */
export function blockKind(text) {
  const first = text.trimStart()
  if (/^#{1,6}\s/.test(first)) return 'heading'
  if (/^(-|\*|\+|\d+\.)\s/m.test(first) && /^(-|\*|\+|\d+\.)\s/.test(first)) return 'list'
  if (/^(`{3,}|~{3,})/.test(first)) return 'fence'
  if (/^:::\s*[A-Za-z]/.test(first)) return 'box'
  if (/^>/.test(first)) return 'quote'
  if (/^\|/.test(first)) return 'table'
  if (/^(-{3,}|\*{3,})$/.test(first)) return 'rule'
  return 'para'
}

/**
 * Découpe une slide en blocs (paragraphes, titres, listes, fences, encadrés)
 * en conservant leur plage de lignes exacte dans le markdown de la slide.
 *
 * C'est cette plage qui permet d'éditer un bloc sans réécrire le fichier :
 * on remplace des lignes, les commentaires (notes, pauses) restent intacts.
 */
export function scanBlocks(raw) {
  const lines = String(raw ?? '').split('\n')
  const blocks = []
  let seg = 0
  let current = null
  let fenceChar = null
  let inBox = false

  const push = () => {
    if (!current) return
    const text = current.lines.join('\n').replace(/[ \t]+$/gm, '').replace(/\s+$/, '')
    if (text.trim()) {
      blocks.push({
        ...current,
        startLine: current.startLine,
        endLine: current.endLine === null ? current.startLine : current.endLine,
        text,
        segIndex: seg,
        kind: blockKind(text),
      })
    }
    current = null
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]

    if (fenceChar) {
      current.lines.push(line)
      if (new RegExp(`^\\s*${fenceChar}{3,}\\s*$`).test(line)) {
        fenceChar = null
        push()
      }
      continue
    }

    if (/^\s*(`{3,}|~{3,})/.test(line)) {
      push()
      fenceChar = line.trim()[0]
      current = { lines: [line], startLine: i, endLine: null }
      continue
    }

    if (inBox) {
      current.lines.push(line)
      if (/^\s*:::\s*$/.test(line)) {
        inBox = false
        push()
      }
      continue
    }

    if (/^\s*:::\s*[A-Za-z]/.test(line)) {
      push()
      inBox = true
      current = { lines: [line], startLine: i, endLine: null }
      continue
    }

    if (/^\s*<!--\s*pause\s*-->\s*$/.test(line)) {
      push()
      seg += 1
      continue
    }

    if (/^\s*<!--/.test(line)) {
      push()
      continue
    }

    if (!line.trim()) {
      push()
      continue
    }

    if (!current) current = { lines: [], startLine: i, endLine: null }
    current.lines.push(line)
    current.endLine = i
  }
  push()

  return { blocks, segmentCount: blocks.length ? Math.max(...blocks.map((b) => b.segIndex)) + 1 : 1 }
}

/** Extrait les directives (commentaires HTML) d'une slide brute. */
export function parseSlide(raw, index) {
  let note = ''
  let layout = ''
  let classes = ''

  const noteRe = /<!--\s*note\s*:\s*([\s\S]*?)-->/g
  let m
  while ((m = noteRe.exec(raw))) {
    const value = m[1].replace(/^\|?\s*\n?/, '').replace(/\s+$/, '')
    const noteLines = value.split('\n').map((l) => l.replace(/^\s{2,}/, ''))
    note = (note ? note + '\n' : '') + noteLines.join('\n').trim()
  }

  const layoutMatch = raw.match(/<!--\s*layout\s*:\s*([A-Za-z-]+)\s*-->/)
  if (layoutMatch) layout = layoutMatch[1].trim()

  const classMatch = raw.match(/<!--\s*class\s*:\s*([\w\s-]+)\s*-->/)
  if (classMatch) classes = classMatch[1].trim()

  const { blocks, segmentCount } = scanBlocks(raw)
  const segments = Array.from({ length: segmentCount }, (_, s) =>
    blocks
      .filter((b) => b.segIndex === s)
      .map((b) => b.text)
      .join('\n\n')
  )

  const title = firstHeading(blocks[0]?.text ?? '') || firstHeading(raw) || `Slide ${index + 1}`

  return {
    index,
    raw: raw.trim(),
    blocks,
    segments,
    segmentCount,
    note,
    layout,
    classes,
    title,
    label: slugify(title),
  }
}

export function parseDeck(source) {
  const { meta, body } = parseFrontmatter(source)
  const raws = splitSlides(body)
  const slides = raws.map((raw, i) => parseSlide(raw, i)).filter((s, i) => {
    // Une slide entièrement vide en fin de document est ignorée.
    return !(s.segments.length === 1 && s.segments[0] === '' && i === raws.length - 1)
  })
  slides.forEach((s, i) => {
    s.index = i
  })
  return {
    meta: {
      title: meta.title || 'Sans titre',
      author: meta.author || '',
      subtitle: meta.subtitle || '',
      event: meta.event || '',
      date: meta.date || '',
      theme: meta.theme || '',
      ...meta,
    },
    slides,
    source,
  }
}

export function firstHeading(markdown) {
  const match = String(markdown).match(/^\s{0,3}#{1,2}\s+(.+)$/m)
  if (!match) return ''
  return match[1]
    .replace(/[*_`~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim()
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Sépare l'en-tête YAML du corps, en gardant l'en-tête tel quel. */
export function splitHead(source) {
  const text = String(source ?? '').replace(/\r\n?/g, '\n')
  if (!text.startsWith('---\n')) return { head: '', body: text, eol: '\n' }
  const end = text.indexOf('\n---', 4)
  if (end === -1) return { head: '', body: text, eol: '\n' }
  return { head: text.slice(0, end + 4), body: text.slice(end + 4).replace(/^\n+/, '') }
}

function rebuild(source, slideIndex, mutate) {
  const { head, body } = splitHead(source)
  const raws = splitSlides(body)
  if (slideIndex < 0 || slideIndex >= raws.length) return source
  const lines = raws[slideIndex].split('\n')
  const next = mutate(lines)
  if (next === null) return source
  raws[slideIndex] = next.join('\n').replace(/\s+$/, '')
  return `${head}${head ? '\n' : ''}${raws.join('\n\n---\n\n')}\n`
}

/** Remplace les lignes d'un bloc par un nouveau texte (édition en place). */
export function applyBlockEdit(source, slideIndex, startLine, endLine, text) {
  return rebuild(source, slideIndex, (lines) => {
    const replacement = String(text ?? '').split('\n')
    const from = Math.max(0, Math.min(startLine, lines.length - 1))
    const to = Math.max(from - 1, Math.min(endLine, lines.length - 1))
    const copy = [...lines]
    copy.splice(from, to - from + 1, ...replacement)
    return copy
  })
}

/** Insère un nouveau bloc juste après la ligne indiquée. */
export function insertBlockAfter(source, slideIndex, afterLine, text) {
  return rebuild(source, slideIndex, (lines) => {
    const copy = [...lines]
    const at = Math.max(0, Math.min(afterLine + 1, copy.length))
    copy.splice(at, 0, '', ...String(text ?? '').split('\n'))
    return copy
  })
}

/** Reconstruit un markdown propre, un bloc par paragraphe. */
export function serialize(deck) {
  const meta = deck.meta
  const head = [
    '---',
    `title: ${meta.title || 'Sans titre'}`,
    meta.author ? `author: ${meta.author}` : null,
    meta.theme ? `theme: ${meta.theme}` : null,
    '---',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n')

  return `${head}${deck.slides.map((slide) => slide.raw).join('\n\n---\n\n')}\n`
}
