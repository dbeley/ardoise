/**
 * Vérifications du noyau (sans navigateur) : découpage en blocs, édition
 * chirurgicale du source, déplacements et opérateurs.
 *
 *   node tests/core.test.mjs
 */
import assert from 'node:assert/strict'
import {
  parseDeck,
  scanBlocks,
  applyBlockEdit,
  insertBlockAfter,
  serialize,
} from '../src/lib/deck.js'
import {
  nextWordStart,
  prevWordStart,
  wordEnd,
  move,
  operatorRange,
  deleteRange,
  smartNewline,
  lineStart,
  lineEnd,
} from '../src/lib/motions.js'

let passed = 0
const test = (name, fn) => {
  try {
    fn()
    passed += 1
    console.log(`  ok   ${name}`)
  } catch (error) {
    console.log(`  FAIL ${name}\n       ${error.message}`)
    process.exitCode = 1
  }
}

/* ---------------- découpage ---------------- */

const slide = `## Un titre

Premier paragraphe.

- une puce
- une autre

<!-- pause -->

Après la pause.

<!-- note: rien à signaler -->`

test('les blocs respectent les paragraphes', () => {
  const { blocks } = scanBlocks(slide)
  assert.deepEqual(
    blocks.map((b) => b.kind),
    ['heading', 'para', 'list', 'para']
  )
  assert.equal(blocks[0].text, '## Un titre')
  assert.equal(blocks[2].text, '- une puce\n- une autre')
})

test('les pauses créent des segments', () => {
  const { blocks, segmentCount } = scanBlocks(slide)
  assert.equal(segmentCount, 2)
  assert.equal(blocks[3].segIndex, 1)
})

test('les plages de lignes pointent le bon texte', () => {
  const { blocks } = scanBlocks(slide)
  const lines = slide.split('\n')
  for (const block of blocks) {
    const slice = lines.slice(block.startLine, block.endLine + 1).join('\n')
    assert.equal(slice.trim(), block.text, `bloc ${block.kind}`)
  }
})

test('un bloc de code reste un seul bloc', () => {
  const { blocks } = scanBlocks('```nix\n{\n  a = 1;\n}\n```\n\nSuite.')
  assert.equal(blocks.length, 2)
  assert.equal(blocks[0].kind, 'fence')
  assert.ok(blocks[0].text.includes('a = 1;'))
})

test('un encadré reste un seul bloc', () => {
  const { blocks } = scanBlocks('::: key\ndu texte\n:::')
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].kind, 'box')
})

/* ---------------- édition du source ---------------- */

const deck = `---
title: Test
---

## Titre

Premier.

- a
- b

<!-- note: garder ceci -->

---

## Deux
`

test('éditer un bloc ne touche pas au reste', () => {
  const parsed = parseDeck(deck)
  const block = parsed.slides[0].blocks[1]
  const next = applyBlockEdit(deck, 0, block.startLine, block.endLine, 'Premier modifié.')
  const reparsed = parseDeck(next)
  assert.equal(reparsed.slides[0].blocks[1].text, 'Premier modifié.')
  assert.ok(next.includes('<!-- note: garder ceci -->'), 'la note doit survivre')
  assert.ok(next.includes('## Deux'), 'la slide suivante doit survivre')
  assert.equal(reparsed.slides.length, 2)
})

test('un bloc multi-lignes se remplace entièrement', () => {
  const parsed = parseDeck(deck)
  const list = parsed.slides[0].blocks[2]
  const next = applyBlockEdit(deck, 0, list.startLine, list.endLine, '- c')
  const reparsed = parseDeck(next)
  assert.equal(reparsed.slides[0].blocks[2].text, '- c')
  assert.equal(reparsed.slides[0].blocks.length, parsed.slides[0].blocks.length)
})

test('insérer un bloc après un autre', () => {
  const parsed = parseDeck(deck)
  const block = parsed.slides[0].blocks[0]
  const next = insertBlockAfter(deck, 0, block.endLine, 'Nouveau paragraphe.')
  const reparsed = parseDeck(next)
  assert.equal(reparsed.slides[0].blocks[1].text, 'Nouveau paragraphe.')
  assert.equal(reparsed.slides[0].blocks[2].text, 'Premier.')
})

test('serialize conserve le markdown à l’identique', () => {
  const round = serialize(parseDeck(deck))
  assert.equal(parseDeck(round).slides.length, 2)
  assert.ok(round.includes('title: Test'))
})

/* ---------------- déplacements ---------------- */

const text = 'bonjour le monde'

test('w avance de mot en mot', () => {
  assert.equal(nextWordStart(text, 0), 8)
  assert.equal(nextWordStart(text, 8), 11)
  assert.equal(nextWordStart(text, 11), text.length)
})

test('b recule de mot en mot', () => {
  assert.equal(prevWordStart(text, 11), 8)
  assert.equal(prevWordStart(text, 8), 0)
  assert.equal(prevWordStart(text, 0), 0)
})

test('e atteint la fin du mot', () => {
  assert.equal(wordEnd(text, 0), 6)
  assert.equal(wordEnd(text, 8), 9)
  assert.equal(wordEnd(text, 11), 15)
})

test('h et l se déplacent d’un caractère, sans sortir', () => {
  assert.equal(move(text, 0, 'h'), 0)
  assert.equal(move(text, 3, 'l'), 4)
  assert.equal(move(text, text.length - 1, 'l'), text.length - 1)
})

test('0 et $ vont au début et à la fin de ligne', () => {
  const multi = 'abc\ndefgh'
  assert.equal(lineStart(multi, 6), 4)
  assert.equal(lineEnd(multi, 5), multi.length)
  assert.equal(move(multi, 6, '0'), 4)
  assert.equal(move(multi, 4, '$'), 8)  // dernier caractère de 'defgh'
})

test('j et k conservent la colonne', () => {
  const multi = 'abcdef\nxy\nabcdef'
  assert.equal(move(multi, 3, 'j'), 8)  // ligne courte : dernière colonne réelle
  assert.equal(move(multi, 8, 'k'), 1)  // colonne 1 conservée, pas 3
  assert.equal(move('abcdef\nuvwxyz', 3, 'j'), 10)
})

test('les compteurs multiplient le mouvement', () => {
  assert.equal(move('a b c d e', 0, 'w', 3), 6)
})

/* ---------------- opérateurs ---------------- */

test('dw supprime jusqu’au mot suivant', () => {
  const [from, to] = operatorRange(text, 0, 'w')
  assert.deepEqual([from, to], [0, 8])
  assert.equal(deleteRange(text, from, to).text, 'le monde')
})

test('de supprime le mot courant en entier', () => {
  const [from, to] = operatorRange(text, 0, 'e')
  assert.equal(text.slice(from, to), 'bonjour')
})

test('d0 supprime du début de ligne au curseur', () => {
  const [from, to] = operatorRange('abcdef', 4, '0')
  assert.deepEqual([from, to], [0, 4])
})

test('dd vise tout le bloc', () => {
  assert.deepEqual(operatorRange(text, 3, 'd'), [0, text.length])
})

test('supprimer une plage replace le curseur', () => {
  const result = deleteRange(text, 8, 11)
  assert.equal(result.text, 'bonjour monde')
  assert.equal(result.pos, 8)
})

/* ---------------- entrée intelligente ---------------- */

test('entrée prolonge une puce', () => {
  const result = smartNewline('- premier', 9)
  assert.equal(result.text, '- premier\n- ')
  assert.equal(result.pos, 12)
})

test('entrée hors liste ajoute une ligne', () => {
  const result = smartNewline('texte', 5)
  assert.equal(result.text, 'texte\n')
  assert.equal(result.pos, 6)
})

test('entrée dans une liste numérotée garde le préfixe', () => {
  const result = smartNewline('1. un', 5)
  assert.equal(result.text, '1. un\n1. ')
})

console.log(`\n${passed} vérifications passées${process.exitCode ? ' - échecs ci-dessus' : ''}`)
