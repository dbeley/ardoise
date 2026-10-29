/**
 * keys.js - source unique de vérité du clavier.
 * La même table alimente le gestionnaire d'événements et l'aide (`?`),
 * donc l'aide ne peut pas diverger du comportement réel.
 *
 * Modèle : un seul curseur dans le deck. Le paragraphe est l'unité de
 * navigation (donc l'unité de tournage) ; le mot et le caractère sont les
 * unités d'édition.
 */

export const KEYMAP = [
  {
    group: 'Se déplacer',
    items: [
      { keys: ['j', 'k'], label: 'paragraphe suivant / précédent' },
      { keys: ['espace'], label: 'pas suivant (segment, puis slide)' },
      { keys: ['n', 'p'], label: 'slide suivante / précédente' },
      { keys: ['3', 'G'], label: 'aller au paragraphe 3' },
      { keys: ['gg', 'G'], label: 'début / fin du deck' },
    ],
  },
  {
    group: 'Dans le paragraphe',
    items: [
      { keys: ['h', 'l'], label: 'caractère' },
      { keys: ['w', 'b', 'e'], label: 'mot suivant, précédent, fin' },
      { keys: ['0', '$'], label: 'début / fin de ligne' },
      { keys: ['↑', '↓'], label: 'ligne à l’intérieur du bloc' },
      { keys: ['2', 'w'], label: 'compteur sur un mouvement' },
    ],
  },
  {
    group: 'Éditer sur place',
    items: [
      { keys: ['i'], label: 'écrire dans le texte (insertion)' },
      { keys: ['a', 'A'], label: 'écrire après / en fin de ligne' },
      { keys: ['I'], label: 'écrire en début de ligne' },
      { keys: ['O'], label: 'nouveau paragraphe après' },
      { keys: ['x'], label: 'supprimer le caractère' },
      { keys: ['d', 'w'], label: 'supprimer (d + mouvement)' },
      { keys: ['c', 'w'], label: 'changer (c + mouvement)' },
      { keys: ['u'], label: 'annuler' },
      { keys: ['échap'], label: 'revenir au curseur (mode normal)' },
    ],
  },
  {
    group: 'Scène',
    items: [
      { keys: ['.'], label: 'écran noir' },
      { keys: ['o'], label: 'vue d’ensemble' },
      { keys: ['t'], label: 'chrono marche / arrêt' },
      { keys: ['f'], label: 'plein écran' },
      { keys: ['P'], label: 'fenêtre orateur' },
      { keys: ['s'], label: 'télécharger le deck' },
      { keys: [':'], label: 'palette de commandes' },
      { keys: ['+', '-'], label: 'taille du texte' },
      { keys: ['?'], label: 'cette aide' },
    ],
  },
]

export const KEY_ALIASES = {
  ' ': 'espace',
  Spacebar: 'espace',
  ArrowRight: 'l',
  ArrowLeft: 'h',
  ArrowDown: '↓',
  ArrowUp: '↑',
  PageDown: 'n',
  PageUp: 'p',
  Enter: 'entrée',
  Escape: 'échap',
}

export function normalizeKey(event) {
  if (event.key === ' ') return 'espace'
  if (event.key === 'Esc') return 'échap'
  return KEY_ALIASES[event.key] || event.key
}

export function prettyKey(key) {
  return key
}

export function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.isContentEditable
}
