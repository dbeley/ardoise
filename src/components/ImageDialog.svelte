<script>
  import { searchImages } from '../lib/images.js'

  let { open = false, oninsert, onclose } = $props()

  const COLUMNS = 4

  let query = $state('')
  let results = $state([])
  let index = $state(0)
  let width = $state(100)
  let error = $state('')
  let loading = $state(false)
  let input = $state(null)

  let selected = $derived(results[index] ?? null)

  let controller = null
  let timer = null
  let requested = ''

  $effect(() => {
    if (!open) return
    query = ''
    results = []
    index = 0
    width = 100
    error = ''
    queueMicrotask(() => input?.focus())
  })

  $effect(() => {
    const clean = query.trim()
    clearTimeout(timer)
    if (!open || clean.length < 2) {
      results = []
      index = 0
      return
    }

    const token = clean.toLowerCase()
    timer = setTimeout(async () => {
      controller?.abort()
      controller = new AbortController()
      requested = token
      loading = true
      error = ''
      try {
        const found = await searchImages(clean, { signal: controller.signal })
        if (requested !== token) return
        results = found
        index = 0
      } catch (failure) {
        if (failure?.name === 'AbortError' || requested !== token) return
        error =
          failure?.kind === 'rate-limit'
            ? 'Openverse rate limit reached, try again in a minute'
            : 'image search unavailable'
      } finally {
        if (requested === token) loading = false
      }
    }, 500)

    return () => clearTimeout(timer)
  })

  function move(delta) {
    if (!results.length) return
    index = Math.max(0, Math.min(results.length - 1, index + delta))
  }

  function insert() {
    if (!selected) return
    oninsert?.({ alt: selected.title, src: selected.src, width })
  }

  function onkeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onclose?.()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      move(COLUMNS)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      move(-COLUMNS)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      insert()
      return
    }
    event.stopPropagation()
  }
</script>

{#if open}
  <div class="overlay" role="dialog" aria-modal="true" aria-label="Insert an image">
    <div class="panel">
      <div class="panel-head">
        <strong>image</strong>
        <span>search by Openverse</span>
      </div>
      <div class="panel-body">
        <input
          bind:this={input}
          bind:value={query}
          class="image-search"
          type="text"
          spellcheck="false"
          autocomplete="off"
          placeholder="search images…"
          aria-label="Image search"
          {onkeydown}
        />

        <div class="image-layout">
          <div class="image-results" role="listbox" aria-label="Results">
            {#each results as result, i (result.id)}
              <button
                type="button"
                class="image-thumb"
                class:is-active={i === index}
                aria-selected={i === index}
                onclick={() => (index = i)}
                onmouseenter={() => (index = i)}
              >
                <img src={result.thumbnail} alt={result.title} loading="lazy" />
              </button>
            {/each}
            {#if !results.length}
              <p class="image-empty">
                {loading ? 'searching…' : error || 'type at least two characters'}
              </p>
            {/if}
          </div>

          <div class="image-preview" aria-label="Preview">
            {#if selected}
              <img src={selected.src} alt={selected.title} style="width:{width}%" />
            {:else}
              <span class="image-empty">no image selected</span>
            {/if}
          </div>
        </div>

        <div class="image-controls">
          <label>
            width
            <input type="range" min="25" max="100" step="5" bind:value={width} />
            <span>{width}%</span>
          </label>
          {#if selected}
            <span class="image-meta">
              {selected.title}
              {#if selected.creator}· {selected.creator}{/if}
              {#if selected.license}· {selected.license}{/if}
            </span>
          {/if}
          <span class="image-credit">Search by Openverse</span>
        </div>

        {#if error && results.length}
          <p class="image-error">{error}</p>
        {/if}

        <div class="image-actions">
          <button type="button" onclick={insert} disabled={!selected}>insert (enter)</button>
          <button type="button" onclick={() => onclose?.()}>cancel (esc)</button>
        </div>
      </div>
    </div>
  </div>
{/if}
