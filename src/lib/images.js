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

const SEARCH_URL = 'https://api.openverse.org/v1/images/'
const CACHE_LIMIT = 50
const cache = new Map()

/** Keep only what the dialog and the deck need. */
export function normalizeResult(result = {}) {
  const src = String(result.url || '')
  const width = Number(result.width)
  const height = Number(result.height)
  return {
    id: String(result.id || ''),
    title: String(result.title || '').trim() || 'Untitled',
    src,
    thumbnail: String(result.thumbnail || src),
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
    creator: String(result.creator || ''),
    license: String(result.license || '').toUpperCase(),
    licenseVersion: String(result.license_version || ''),
    landing: String(result.foreign_landing_url || ''),
  }
}

function failure(kind) {
  const message = kind === 'rate-limit' ? 'Openverse rate limit reached' : 'Image search unavailable'
  return Object.assign(new Error(message), { kind })
}

/** Search Openverse (anonymous, CORS open). Cached per query, errors never cached. */
export async function searchImages(query, { fetchImpl = fetch, signal } = {}) {
  const clean = String(query ?? '').trim()
  if (clean.length < 2) return []
  const key = clean.toLowerCase()
  if (cache.has(key)) return cache.get(key)

  const url = new URL(SEARCH_URL)
  url.searchParams.set('q', clean)
  url.searchParams.set('page_size', '20')
  url.searchParams.set('mature', 'false')

  let response
  try {
    response = await fetchImpl(url.toString(), {
      signal,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw failure('unavailable')
  }
  if (!response.ok) throw failure(response.status === 429 ? 'rate-limit' : 'unavailable')

  let payload
  try {
    payload = await response.json()
  } catch {
    throw failure('unavailable')
  }

  const results = (payload?.results || []).map(normalizeResult).filter((result) => result.src)
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value)
  cache.set(key, results)
  return results
}
