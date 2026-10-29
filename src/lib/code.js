/**
 * code.js - the fenced block built by `:code`.
 *
 * A code block is plain markdown; the command only saves typing the fences
 * and lands the cursor on the empty line between them.
 */

/** The language tag is optional and reduced to a safe fence suffix. */
export function codeMarkdown(lang = '') {
  const clean = String(lang ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+#.-]/g, '')
  return `\`\`\`${clean}\n\n\`\`\``
}

/**
 * Where to insert a block after `at` (the end of the current block), and
 * where the cursor goes: on the blank line inside the fences.
 */
export function codeInsertion(source, at, lang = '') {
  const value = String(source ?? '')
  const position = Math.max(0, Math.min(Number(at) || 0, value.length))
  const markup = codeMarkdown(lang)
  const before = value.slice(0, position)
  const after = value.slice(position)
  const lead =
    position === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  let insert = `${lead}${markup}`

  if (!after.startsWith('\n')) insert += '\n'

  const pos = position + lead.length + markup.indexOf('\n') + 1
  return { at: position, insert, pos }
}
