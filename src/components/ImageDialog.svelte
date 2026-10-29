<script>
  import { normalizeUrl } from '../lib/urls.js'

  let { open = false, oninsert, onclose } = $props()

  let url = $state('')
  let alt = $state('')
  let width = $state(100)
  let error = $state('')
  let broken = $state(false)
  let input = $state(null)

  let src = $derived(normalizeUrl(url))

  $effect(() => {
    if (!open) return
    url = ''
    alt = ''
    width = 100
    error = ''
    broken = false
    queueMicrotask(() => input?.focus())
  })

  function submit() {
    if (!src) {
      error = 'enter an http(s) image address'
      return
    }
    oninsert?.({ alt: alt.trim(), src, width })
  }

  function onkeydown(event) {
    const isRange = event.target instanceof HTMLInputElement && event.target.type === 'range'
    if (isRange && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onclose?.()
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
      return
    }
    event.stopPropagation()
  }
</script>

{#if open}
  <div class="overlay" role="dialog" aria-modal="true" aria-label="Insert an image" tabindex="-1" {onkeydown}>
    <div class="panel panel--small">
      <div class="panel-head">
        <strong>image</strong>
        <span>paste a URL</span>
      </div>
      <div class="panel-body">
        <input
          bind:this={input}
          bind:value={url}
          class="dialog-input"
          type="url"
          spellcheck="false"
          autocomplete="off"
          placeholder="https://…/image.png"
          aria-label="Image URL"
          oninput={() => {
            broken = false
            error = ''
          }}
        />
        <input
          bind:value={alt}
          class="dialog-input"
          type="text"
          spellcheck="false"
          autocomplete="off"
          placeholder="description (optional, for accessibility)"
          aria-label="Image description"
        />

        <div class="image-preview">
          {#if src}
            {#if broken}
              <span class="image-empty">image unavailable</span>
            {:else}
              <img
                src={src}
                alt={alt}
                style="width:{width}%"
                onerror={() => (broken = true)}
              />
            {/if}
          {:else}
            <span class="image-empty">paste an image URL to preview it</span>
          {/if}
        </div>

        <div class="image-controls">
          <label>
            width
            <input type="range" min="25" max="100" step="5" bind:value={width} />
            <span>{width}%</span>
          </label>
        </div>

        {#if error}
          <p class="dialog-error">{error}</p>
        {/if}

        <div class="dialog-actions">
          <button type="button" onclick={submit}>insert (enter)</button>
          <button type="button" onclick={() => onclose?.()}>cancel (esc)</button>
        </div>
      </div>
    </div>
  </div>
{/if}
