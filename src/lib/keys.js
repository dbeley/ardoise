/**
 * keys.js — source unique de vérité du clavier.
 * La même table alimente le gestionnaire d'événements et l'aide (`?`),
 * donc l'aide ne peut pas diverger du comportement réel.
 */

export const KEYMAP = [
  {
    group: 'Avancer',
    items: [
      { keys: ['espace', 'j', 'l', '→'], label: 'pas suivant (révèle la suite)' },
      { keys: ['n'], label: 'slide suivante d’un coup' },
      { keys: ['3', 'G'], label: 'aller à la slide 3' },
      { keys: ['gg'], label: 'revenir au début' },
      { keys: ['G'], label: 'dernière slide' },
    ],
  },
  {
    group: 'Reculer',
    items: [
      { keys: ['k', 'h', '←'], label: 'pas précédent' },
      { keys: ['p'], label: 'slide précédente' },
    ],
  },
  {
    group: 'Écrire en direct',
    items: [
      { keys: ['c'], label: 'composer un bloc (Entrée l’ancre)' },
      { keys: ['e'], label: 'éditer la slide brute (Échap enregistre)' },
      { keys: ['r'], label: 'effacer les blocs live de la slide' },
      { keys: ['s'], label: 'télécharger le deck à jour' },
    ],
  },
  {
    group: 'Scène',
    items: [
      { keys: ['b'], label: 'écran noir (pause)' },
      { keys: ['o'], label: 'vue d’ensemble' },
      { keys: ['t'], label: 'chrono marche / arrêt' },
      { keys: ['f'], label: 'plein écran' },
      { keys: ['P'], label: 'ouvrir la fenêtre orateur' },
      { keys: [':'], label: 'palette de commandes' },
      { keys: ['?'], label: 'cette aide' },
    ],
  },
]

export const KEY_ALIASES = {
  ' ': 'espace',
  Spacebar: 'espace',
  ArrowRight: '→',
  ArrowLeft: '←',
  ArrowDown: 'j',
  ArrowUp: 'k',
  PageDown: 'j',
  PageUp: 'k',
  Enter: 'entrée',
  Escape: 'échap',
}

export function normalizeKey(event) {
  if (event.key === ' ') return 'espace'
  if (event.key === 'Esc') return 'échap'
  return KEY_ALIASES[event.key] || event.key
}

/** Rend une touche lisible dans l'aide (espace, échap, ⇧G…). */
export function prettyKey(key) {
  if (key === 'espace') return 'espace'
  if (key === 'échap') return 'échap'
  if (key === '→') return '→'
  if (key === '←') return '←'
  return key
}

export function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}
