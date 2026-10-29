/**
 * storage.js - persistance locale (aucun serveur).
 * Everything is best-effort: a private-mode browser must never prevent the app
 * from starting.
 */
const NS = 'ardoise:v1'

function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(`${NS}:${key}`)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(`${NS}:${key}`)
    else localStorage.setItem(`${NS}:${key}`, JSON.stringify(value))
  } catch {
    /* quota / private mode: ignore */
  }
}

export const storage = {
  deckSource: () => read('deck'),
  saveDeckSource: (source) => write('deck', source),
  clearDeckSource: () => write('deck', null),

  scratch: () => read('scratch', {}),
  saveScratch: (scratchObj) => write('scratch', scratchObj),

  theme: () => read('theme', 'ardoise'),
  saveTheme: (theme) => write('theme', theme),

  scale: () => read('scale', 1),
  saveScale: (value) => write('scale', value),

  slide: () => read('slide', 0),
  saveSlide: (index) => write('slide', index),

  onboarded: () => read('onboarded', false),
  setOnboarded: (value) => write('onboarded', value),
}

export function download(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
