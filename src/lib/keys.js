/**
 * keys.js - the single source of truth for the keyboard.
 * The same table feeds the event handler and the `?` help, so the help cannot
 * drift from the real behaviour.
 *
 * Model: one cursor inside the deck. The paragraph is the unit of navigation
 * (and therefore of pacing); word and character are the units of editing.
 */

export const KEYMAP = [
  {
    group: 'Move',
    items: [
      { keys: ['j', 'k'], label: 'next / previous paragraph' },
      { keys: ['espace'], label: 'next step (segment, then slide)' },
      { keys: ['n', 'p'], label: 'next / previous slide' },
      { keys: ['3', 'G'], label: 'jump to paragraph 3' },
      { keys: ['gg', 'G'], label: 'start / end of deck' },
    ],
  },
  {
    group: 'Inside a paragraph',
    items: [
      { keys: ['h', 'l'], label: 'character' },
      { keys: ['w', 'b', 'e'], label: 'next word, previous word, word end' },
      { keys: ['0', '$'], label: 'start / end of line' },
      { keys: ['↑', '↓'], label: 'line inside the block' },
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
      { keys: ['d', 'w'], label: 'delete (d + motion)' },
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
      { keys: ['t'], label: 'timer start / stop' },
      { keys: ['f'], label: 'fullscreen' },
      { keys: ['P'], label: 'speaker window' },
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
  PageDown: 'n',
  PageUp: 'p',
  Enter: 'enter',
  Escape: 'esc',
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
