/**
 * palette.js - command matching for the `:` palette.
 *
 * Pure, so the ranking rules can be tested without a browser. The palette
 * keeps array order for ties, which meant a label substring ("next paragraph")
 * could shadow the command whose key is exactly the word typed ("paragraph").
 */

/** `key` plus optional vim-style `alias` entries (`w` for save). */
function names(command) {
  const aliases = command.alias === undefined ? [] : [].concat(command.alias)
  return [command.key, ...aliases].map((name) => String(name).toLowerCase())
}

function keyScore(command, head) {
  let score = 0
  for (const key of names(command)) {
    if (key === head) score = 2
    else if (key.startsWith(head) && score < 1) score = 1
  }
  return score
}

function haystack(command) {
  return [...names(command), String(command.label).toLowerCase()].join(' ')
}

export function matchCommands(commands, query) {
  const words = String(query ?? '').toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!words.length) return commands

  const strict = commands.filter((command) =>
    words.every((word) => haystack(command).includes(word))
  )
  if (strict.length) {
    const head = words[0]
    // Stable sort: ties keep the palette's own order.
    return [...strict].sort((a, b) => keyScore(b, head) - keyScore(a, head))
  }

  // `theme paper`: the first word picks the command, the rest is passed to it.
  const head = words[0]
  return commands
    .filter((command) => {
      const heads = names(command).map((name) => name.split(' ')[0])
      return (
        heads.some((name) => name.startsWith(head)) ||
        String(command.label).toLowerCase().startsWith(head)
      )
    })
    .slice(0, 1)
}
