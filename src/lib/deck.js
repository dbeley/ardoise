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
export function parseSlide(raw, index) {
  let note = ''
  let layout = ''
  let classes = ''

  // Notes orateur : <!-- note: ... --> ou <!-- note: | ... -->
  const noteRe = /<!--\s*note\s*:\s*([\s\S]*?)-->/g
  let m
  while ((m = noteRe.exec(raw))) {
    const value = m[1].replace(/^\|?\s*\n?/, '').replace(/\s+$/, '')
    const lines = value.split('\n').map((l) => l.replace(/^\s{2,}/, ''))
    note = (note ? note + '\n' : '') + lines.join('\n').trim()
  }

  const layoutMatch = raw.match(/<!--\s*layout\s*:\s*([A-Za-z-]+)\s*-->/)
  if (layoutMatch) layout = layoutMatch[1].trim()

  const classMatch = raw.match(/<!--\s*class\s*:\s*([\w\s-]+)\s*-->/)
  if (classMatch) classes = classMatch[1].trim()

  const withoutNotes = raw.replace(noteRe, '')

  // Passe ligne à ligne : on ne touche jamais à l'intérieur d'un bloc de code.
  const kept = []
  let fenceChar = null
  for (const line of withoutNotes.split('\n')) {
    const opening = line.match(/^\s*(`{3,}|~{3,})/)
    if (opening) {
      if (!fenceChar) fenceChar = opening[1][0]
      else if (new RegExp(`^\\s*${fenceChar}{3,}\\s*$`).test(line)) fenceChar = null
      kept.push(line)
      continue
    }
    if (fenceChar) {
      kept.push(line)
      continue
    }
    if (/^\s*<!--\s*pause\s*-->\s*$/.test(line)) {
      kept.push('@@PAUSE@@')
      continue
    }
    if (/^\s*<!--\s*(layout|class)\s*:/.test(line)) continue
    if (/^\s*<!--(?!\s*@)[\s\S]*?-->\s*$/.test(line)) continue
    kept.push(line)
  }

  const segments = kept
    .join('\n')
    .split('@@PAUSE@@')
    .map((s) => s.trim())
    .filter((s, i, arr) => s.length > 0 || arr.length === 1)

  const body = segments.join('\n\n')
  const title = firstHeading(body) || firstHeading(raw) || `Slide ${index + 1}`

  return {
    index,
    raw: raw.trim(),
    body,
    segments: segments.length ? segments : [''],
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

/** Ajoute les blocs saisis en direct à la fin de la slide correspondante. */
export function withScratch(deck, scratch) {
  if (!scratch || !Object.keys(scratch).length) return deck
  return {
    ...deck,
    slides: deck.slides.map((slide) => {
      const extra = scratch[slide.index]
      if (!extra || !extra.length) return slide
      const appended = extra.join('\n')
      const raw = `${slide.raw}\n\n${appended}`
      const parsed = parseSlide(raw, slide.index)
      return { ...parsed, committed: extra }
    }),
  }
}

/**
 * Remplace le markdown d'une slide en conservant l'en-tête et les autres
 * slides telles quelles (utilisé par l'éditeur en direct).
 */
export function replaceSlideRaw(source, index, newRaw) {
  const text = String(source ?? '').replace(/\r\n?/g, '\n')
  let head = ''
  let body = text

  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---', 4)
    if (end !== -1) {
      head = text.slice(0, end + 4)
      body = text.slice(end + 4).replace(/^\n+/, '')
    }
  }

  const raws = splitSlides(body)
  if (index < 0 || index >= raws.length) return source
  raws[index] = newRaw.replace(/\s+$/, '')

  return `${head}${head ? '\n' : ''}${raws.join('\n\n---\n\n')}\n`
}

/** Reconstruit un markdown propre, blocs live inclus. */
export function serialize(deck, scratch) {
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

  const body = deck.slides
    .map((slide) => {
      const extra = scratch?.[slide.index]
      if (!extra || !extra.length) return slide.raw
      return `${slide.raw}\n\n${extra.join('\n')}`
    })
    .join('\n\n---\n\n')

  return `${head}${body}\n`
}
