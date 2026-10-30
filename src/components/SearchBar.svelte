<script>
  import { findMatches } from '../lib/search.js'

  let { open = false, slides = [], initial = '', onsubmit, onclose } = $props()

  let query = $state('')
  let input = $state(null)
  let bar = $state(null)

  let matches = $derived(findMatches(slides, query))

  $effect(() => {
    if (!open) return
    query = initial
    queueMicrotask(() => {
      input?.focus()
      input?.select?.()
    })
  })

  // A click on the stage would blur the input and leave the mode open: close
  // the search instead, as a palette does.
  $effect(() => {
    if (!open) return
    const onPointerDown = (event) => {
      if (!bar?.contains(event.target)) onclose?.()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  })

  function onkeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onclose?.()
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      onsubmit?.(query)
      return
    }
    event.stopPropagation()
  }
</script>

{#if open}
  <div class="command command--search" role="dialog" aria-label="Search the deck" bind:this={bar}>
    <form
      class="command-form"
      onsubmit={(event) => {
        event.preventDefault()
        onsubmit?.(query)
      }}
    >
      <span class="command-colon">/</span>
      <input
        bind:this={input}
        bind:value={query}
        class="command-input"
        type="text"
        spellcheck="false"
        autocomplete="off"
        placeholder="search the deck…"
        aria-label="Search"
        onkeydown={onkeydown}
      />
      <span class="command-count" aria-live="polite">
        {matches.length}
        {matches.length === 1 ? 'match' : 'matches'}
      </span>
    </form>
  </div>
{/if}
