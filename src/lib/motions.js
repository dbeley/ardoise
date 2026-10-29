/**
 * motions.js — déplacements et opérateurs sur le texte d'un bloc.
 *
 * Le bloc est une chaîne (le markdown brut du paragraphe). Toutes les
 * fonctions raisonnent en index de caractère dans cette chaîne, ce qui rend
 * l'édition exacte : on modifie le texte, pas le rendu.
 */

const WORD_CHAR = /[\p{L}\p{N}_]/u

function charClass(ch) {
  if (ch === undefined) return 0
  if (/\s/.test(ch)) return 0
  if (WORD_CHAR.test(ch)) return 1
  return 2
}

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

/** Début du mot suivant (comportement de `w`). */
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

/** Début du mot précédent (comportement de `b`). */
export function prevWordStart(text, pos) {
  let i = clamp(pos, 0, text.length)
  if (i === 0) return 0
  i -= 1
  while (i > 0 && charClass(text[i]) === 0) i -= 1
  const c = charClass(text[i])
  while (i > 0 && charClass(text[i - 1]) === c) i -= 1
  return i
}

/** Fin du mot courant ou suivant (comportement de `e`). */
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

/** Colonne visuelle utilisée pour conserver l'alignement en j/k. */
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

/** Déplace le curseur selon un mouvement nommé. */
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

/**
 * Plage [start, end) affectée par un opérateur (d, c) suivi d'un mouvement.
 * `dd`/`cc` (motion === 'd') renvoie tout le bloc.
 */
export function operatorRange(text, pos, motion, count = 1) {
  const start = clamp(pos, 0, text.length)

  if (motion === 'd') return [0, text.length]

  switch (motion) {
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
 * Entrée intelligente : dans une liste, prolonge la puce ; sinon nouvelle ligne.
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
