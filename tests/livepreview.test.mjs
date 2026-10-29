/**
 * Vérifications du rendu vivant : quels marqueurs sont masqués, quels spans
 * sont stylés, et surtout que rien ne disparaît sur la ligne du curseur.
 *
 *   node tests/livepreview.test.mjs
 */
import assert from 'node:assert/strict'
import { buildDecorations, lineStarts, lineAt } from '../src/lib/livepreview.js'

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

const hiddenIndex = (text, result, needle) => {
  const at = text.indexOf(needle)
  return result.replaces.some((r) => r.from <= at && r.to >= at + needle.length)
}

const marked = (result, text) =>
  result.marks.map((m) => text.slice(m.from, m.to))

const at = (text, needle, offset = 0) => text.indexOf(needle) + offset

/* ---------------- titres ---------------- */

const heading = '## Un titre\n\nSuite.'
test('un titre prend le style de son niveau', () => {
  const result = buildDecorations(heading, [{ from: heading.length, to: heading.length }])
  assert.ok(result.lines.some((l) => l.line === 0 && l.className.includes('cm-h2')))
})
test('les dièses sont masqués quand le curseur est ailleurs', () => {
  const result = buildDecorations(heading, [{ from: heading.length, to: heading.length }])
  assert.ok(hiddenIndex(heading, result, '## '))
})
test('les dièses reviennent sur la ligne du curseur', () => {
  const result = buildDecorations(heading, [{ from: 4, to: 4 }])
  assert.equal(result.replaces.length, 0)
})

/* ---------------- inline ---------------- */

const bold = 'un **mot gras** ici\n\nautre ligne'
test('le gras est stylé et ses astérisques masquées', () => {
  const result = buildDecorations(bold, [{ from: bold.length, to: bold.length }])
  assert.deepEqual(marked(result, bold), ['mot gras'])
  assert.ok(hiddenIndex(bold, result, '**'))
  assert.equal(result.lines.length, 0)
})
test('le gras redevient visible sur sa ligne', () => {
  const result = buildDecorations(bold, [{ from: 4, to: 4 }])
  assert.equal(result.replaces.length, 0)
  assert.deepEqual(marked(result, bold), ['mot gras'])
})

const mixed = 'du *penché*, du `code` et un [lien](https://x.y)\n\nsuite'
test('italique, code inline et lien sont repérés', () => {
  const result = buildDecorations(mixed, [{ from: mixed.length, to: mixed.length }])
  assert.deepEqual(marked(result, mixed), ['penché', 'code', 'lien'])
})
test('le lien masque les crochets et l’URL', () => {
  const result = buildDecorations(mixed, [{ from: mixed.length, to: mixed.length }])
  assert.ok(hiddenIndex(mixed, result, '['))
  assert.ok(hiddenIndex(mixed, result, '](https://x.y)'))
  assert.ok(!hiddenIndex(mixed, result, 'lien]'))
})
test('le contenu d’un code inline n’est pas relu comme du markdown', () => {
  const line = 'un `**pas du gras**` ici'
  const result = buildDecorations(line, [{ from: line.length, to: line.length }])
  assert.equal(result.marks.length, 1)
  assert.equal(line.slice(result.marks[0].from, result.marks[0].to), '**pas du gras**')
})

/* ---------------- listes et citations ---------------- */

const list = '- une puce\n- une autre'
test('les puces sont stylées et le tiret masqué', () => {
  const result = buildDecorations(list, [{ from: list.length, to: list.length }])
  assert.equal(result.lines.filter((l) => l.className === 'cm-bullet').length, 2)
  assert.ok(hiddenIndex(list, result, '- '))
})
test('une liste numérotée garde ses numéros', () => {
  const result = buildDecorations('1. un\n2. deux', [{ from: 0, to: 0 }])
  assert.equal(result.replaces.length, 0)
})

/* ---------------- blocs ---------------- */

const fence = '```nix\n{ a = "**pas du gras**"; }\n```'
test('l’intérieur d’un bloc de code n’est pas stylé comme du markdown', () => {
  const result = buildDecorations(fence, [{ from: 0, to: 0 }])
  assert.equal(result.marks.length, 0)
  assert.equal(result.lines.filter((l) => l.className.startsWith('cm-fence')).length, 3)
})
test('un commentaire est signalé comme tel', () => {
  const text = '<!-- note: à dire -->'
  const result = buildDecorations(text, [{ from: 0, to: 0 }])
  assert.equal(result.lines[0].className, 'cm-comment')
})
test('un encadré garde sa ligne de fence', () => {
  const result = buildDecorations('::: key\ntexte\n:::', [{ from: 0, to: 0 }])
  assert.equal(result.lines.filter((l) => l.className === 'cm-box-line').length, 2)
})
test('un séparateur est repéré', () => {
  const result = buildDecorations('---', [{ from: 0, to: 0 }])
  assert.equal(result.lines[0].className, 'cm-rule')
})

/* ---------------- positions ---------------- */

test('les lignes sont localisées par position', () => {
  const text = 'a\nbb\n\nccc'
  const starts = lineStarts(text)
  assert.deepEqual(starts, [0, 2, 5, 6])
  assert.equal(lineAt(starts, 0), 0)
  assert.equal(lineAt(starts, 3), 1)
  assert.equal(lineAt(starts, 6), 3)
})

test('une sélection multi-lignes laisse la syntaxe visible partout dessus', () => {
  const text = '## titre\n\n**gras**'
  const result = buildDecorations(text, [{ from: 0, to: text.length }])
  assert.equal(result.replaces.filter((r) => r.from < text.indexOf('**')).length, 0)
})

console.log(`\n${passed} vérifications passées${process.exitCode ? ' - échecs ci-dessus' : ''}`)
