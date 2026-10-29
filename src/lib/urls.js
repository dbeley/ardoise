/**
 * urls.js - the only URLs a deck accepts: http and https.
 *
 * A bare domain gets https; every other scheme (javascript:, data:, file:) is
 * refused, so a pasted URL can never become active content.
 */
export function normalizeUrl(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  let url
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!url.hostname) return null
  return url.toString()
}
