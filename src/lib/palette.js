/**
 * palette.js - command matching for the `:` palette.
 *
 * Pure, so the ranking rules can be tested without a browser. The palette
 * keeps array order for ties, which meant a label substring ("next paragraph")
 * could shadow the command whose key is exactly the word typed ("paragraph").
 */

function keyScore(command, head) {
  const key = String(command.key).toLowerCase()
  if (key === head) return 2
  if (key.startsWith(head)) return 1
  return 0
}

export function matchCommands(commands, query) {
  const words = String(query ?? '').toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!words.length) return commands

  const strict = commands.filter((command) =>
    words.every((word) => `${command.key} ${command.label}`.toLowerCase().includes(word))
  )
  if (strict.length) {
    const head = words[0]
    // Stable sort: ties keep the palette's own order.
    return [...strict].sort((a, b) => keyScore(b, head) - keyScore(a, head))
  }

  // `theme paper`: the first word picks the command, the rest is passed to it.
  const head = words[0]
  return commands
    .filter(
      (command) =>
        String(command.key).toLowerCase().split(' ')[0].startsWith(head) ||
        String(command.label).toLowerCase().startsWith(head)
    )
    .slice(0, 1)
}
