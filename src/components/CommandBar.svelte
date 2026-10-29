<script>
  import { matchCommands } from '../lib/palette.js'

  let { open = false, commands = [], onrun, onclose } = $props()

  let query = $state('')
  let cursor = $state(0)
  let input = $state(null)

  let filtered = $derived(matchCommands(commands, query))

  $effect(() => {
    if (!open) return
    query = ''
    cursor = 0
    queueMicrotask(() => input?.focus())
  })

  $effect(() => {
    if (cursor > filtered.length - 1) cursor = Math.max(0, filtered.length - 1)
  })

  function run(index) {
    const command = filtered[index]
    // No match: App falls back to `:12` (go to slide 12).
    onrun?.(command, query.trim())
  }

  function onkeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onclose?.()
      return
    }
    if (event.key === 'ArrowDown' || (event.ctrlKey && event.key === 'n')) {
      event.preventDefault()
      cursor = Math.min(cursor + 1, filtered.length - 1)
      return
    }
    if (event.key === 'ArrowUp' || (event.ctrlKey && event.key === 'p')) {
      event.preventDefault()
      cursor = Math.max(cursor - 1, 0)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      run(cursor)
      return
    }
    event.stopPropagation()
  }
</script>

{#if open}
  <div class="command" role="dialog" aria-label="Palette de commandes">
    <form
      class="command-form"
      onsubmit={(event) => {
        event.preventDefault()
        run(cursor)
      }}
    >
      <span class="command-colon">:</span>
      <input
        bind:this={input}
        bind:value={query}
        class="command-input"
        type="text"
        spellcheck="false"
        autocomplete="off"
        placeholder="slide, theme, edit, timer, export…"
        aria-label="Command"
        onkeydown={onkeydown}
      />
    </form>
    <ul class="command-list">
      {#each filtered as command, i (command.id)}
        <li
          class="command-item"
          class:is-active={i === cursor}
          role="option"
          aria-selected={i === cursor}
          onmouseenter={() => (cursor = i)}
          onclick={() => run(i)}
          onkeydown={() => {}}
        >
          <code>{command.key}</code>
          <em style="font-style:normal">{command.label}</em>
          {#if command.hint}<span>{command.hint}</span>{/if}
        </li>
      {/each}
      {#if filtered.length === 0}
        <li class="command-item"><em style="font-style:normal">no matching command</em></li>
      {/if}
    </ul>
  </div>
{/if}
