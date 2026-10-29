/**
 * search.js - literal, case-insensitive search across every slide.
 *
 * A match is `{ slideIndex, from, to }`, with offsets local to that slide's
 * markdown (the same string the editor holds). The deck is the document, so a
 * search can jump from one slide to another.
 */

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function compare(a, b) {
  return a.slideIndex - b.slideIndex || a.from - b.from
}

/** Every occurrence of `query` in the deck, slides in order. */
export function findMatches(slides, query) {
  const needle = String(query ?? '')
  if (!needle) return []
  const pattern = new RegExp(escapeRegExp(needle), 'gi')
  const matches = []

  slides.forEach((raw, slideIndex) => {
    const line = String(raw ?? '')
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(line))) {
      matches.push({ slideIndex, from: match.index, to: match.index + match[0].length })
      if (match[0].length === 0) pattern.lastIndex += 1
    }
  })

  return matches
}

/** First match at or after the cursor, wrapping to the top. */
export function firstMatch(matches, cursor) {
  if (!matches.length) return null
  return matches.find((match) => compare(match, cursor) >= 0) ?? matches[0]
}

/**
 * The match `count` steps away from the cursor: strictly after it for `n`,
 * strictly before it for `N`, wrapping around the deck.
 */
export function stepMatch(matches, cursor, direction = 1, count = 1) {
  if (!matches.length) return null
  const steps = Math.max(1, count)

  if (direction > 0) {
    const found = matches.findIndex((match) => compare(match, cursor) > 0)
    const start = found === -1 ? 0 : found
    return matches[(start + steps - 1) % matches.length]
  }

  let start = matches.length - 1
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    if (compare(matches[i], cursor) < 0) {
      start = i
      break
    }
  }
  return matches[(((start - (steps - 1)) % matches.length) + matches.length) % matches.length]
}
