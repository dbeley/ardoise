/**
 * keys.js - the single source of truth for the keyboard.
 * The same table feeds the event handler and the `?` help, so the help cannot
 * drift from the real behaviour.
 *
 * Model: one cursor inside the deck. The line is the unit of vertical
 * movement and of `dd`/`yy`/`cc` (a paragraph is one key, a code block is one
 * key per line); the block is the unit of pacing (`space`, `}`, `{`).
 */

export const KEYMAP = [
  {
    group: 'Move',
    items: [
      { keys: ['j', 'k'], label: 'next / previous line (inside blocks too)' },
      { keys: ['}', '{'], label: 'next / previous block (paragraph, list, code)' },
      { keys: ['espace'], label: 'next step (segment, then slide)' },
      { keys: ['>', 'J', '<', 'K'], label: 'next / previous slide' },
      { keys: ['D'], label: 'delete the current slide' },
      { keys: ['/', 'n', 'N'], label: 'search, next / previous match' },
      { keys: ['3', 'G'], label: 'jump to slide 3' },
      { keys: ['gg', 'G'], label: 'first / last paragraph of the slide' },
    ],
  },
  {
    group: 'Inside a paragraph',
    items: [
      { keys: ['h', 'l'], label: 'character' },
      { keys: ['w', 'b', 'e'], label: 'next word, previous word, word end' },
      { keys: ['0', '$'], label: 'start / end of line' },
      { keys: ['↑', '↓'], label: 'line inside the block, keeping the column' },
      { keys: ['2', 'w'], label: 'count on a motion' },
    ],
  },
  {
    group: 'Edit in place',
    items: [
      { keys: ['i'], label: 'type into the text (insert)' },
      { keys: ['a', 'A'], label: 'type after / at end of line' },
      { keys: ['I'], label: 'type at start of line' },
      { keys: ['O'], label: 'new paragraph after' },
      { keys: ['x'], label: 'delete character' },
      { keys: ['r'], label: 'replace a character' },
      { keys: ['y', 'yy'], label: 'yank (y + motion, or the line)' },
      { keys: ['p', 'P'], label: 'paste after / before' },
      { keys: ['"1p'], label: 'paste from register 1-9' },
      { keys: ['Tab'], label: 'indent / outdent a list item' },
      { keys: ['d', 'w'], label: 'delete (d + motion, d} to the end of the block)' },
      { keys: ['d', 'd'], label: 'delete the line under the cursor' },
      { keys: ['c', 'w'], label: 'change (c + motion)' },
      { keys: ['u'], label: 'undo' },
      { keys: ['esc'], label: 'back to the cursor (normal mode)' },
    ],
  },
  {
    group: 'Stage',
    items: [
      { keys: ['.'], label: 'black screen' },
      { keys: ['o'], label: 'overview' },
      { keys: ['f'], label: 'fullscreen' },
      { keys: ['M'], label: 'speaker window' },
      { keys: ['s'], label: 'download the deck' },
      { keys: [':'], label: 'command palette' },
      { keys: ['+', '-'], label: 'text size' },
      { keys: ['?'], label: 'this help' },
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
  PageDown: '>',
  PageUp: '<',
  Enter: 'enter',
  Escape: 'esc',
}

/**
 * Digits feed the count buffer, except a lone `0`: that is the motion to the
 * start of the line (`d0`, `10j`), as in Vim.
 */
export function isCountDigit(key, buffer = '') {
  return /^[1-9]$/.test(key) || (key === '0' && buffer !== '')
}

export function normalizeKey(event) {
  if (event.key === ' ') return 'espace'
  if (event.key === 'Esc') return 'esc'
  return KEY_ALIASES[event.key] || event.key
}

export function prettyKey(key) {
  return key
}

export function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.isContentEditable
}
