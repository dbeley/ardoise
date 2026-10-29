<script>
  import { normalizeUrl } from '../lib/urls.js'

  let { open = false, oninsert, onclose } = $props()

  let url = $state('')
  let text = $state('')
  let error = $state('')
  let input = $state(null)

  $effect(() => {
    if (!open) return
    url = ''
    text = ''
    error = ''
    queueMicrotask(() => input?.focus())
  })

  function submit() {
    const normalized = normalizeUrl(url)
    if (!normalized) {
      error = 'enter an http(s) address'
      return
    }
    oninsert?.({ text: text.trim(), url: normalized })
  }

  function onkeydown(event) {
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
  <div class="overlay" role="dialog" aria-modal="true" aria-label="Insert a link" tabindex="-1" {onkeydown}>
    <div class="panel panel--small">
      <div class="panel-head">
        <strong>link</strong>
        <span>plain markdown</span>
      </div>
      <div class="panel-body">
        <input
          bind:this={input}
          bind:value={url}
          class="dialog-input"
          type="url"
          spellcheck="false"
          autocomplete="off"
          placeholder="https://…"
          aria-label="Link URL"
          oninput={() => (error = '')}
        />
        <input
          bind:value={text}
          class="dialog-input"
          type="text"
          spellcheck="false"
          autocomplete="off"
          placeholder="text (defaults to the URL)"
          aria-label="Link text"
        />

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
