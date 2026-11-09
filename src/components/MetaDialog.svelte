<script>
  /**
   * Frontmatter editor. The metadata lives above the first `---`, which the
   * slide editor never shows: this dialog is the only way to edit it without
   * hand-editing the markdown file.
   */
  let { open = false, meta = {}, themes = [], onsubmit, onclose } = $props()

  let title = $state('')
  let author = $state('')
  let theme = $state('')
  let input = $state(null)

  $effect(() => {
    if (!open) return
    title = meta.title === 'Sans titre' ? '' : (meta.title ?? '')
    author = meta.author ?? ''
    theme = meta.theme ?? ''
    queueMicrotask(() => input?.focus())
  })

  function submit() {
    onsubmit?.({ title: title.trim(), author: author.trim(), theme })
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
  <div class="overlay" role="dialog" aria-modal="true" aria-label="Deck metadata" tabindex="-1" {onkeydown}>
    <div class="panel panel--small">
      <div class="panel-head">
        <strong>metadata</strong>
        <span>frontmatter, never shown on stage</span>
      </div>
      <div class="panel-body">
        <label class="dialog-label" for="meta-title">title</label>
        <input
          id="meta-title"
          bind:this={input}
          bind:value={title}
          class="dialog-input"
          type="text"
          spellcheck="false"
          autocomplete="off"
          placeholder="Sans titre"
        />

        <label class="dialog-label" for="meta-author">author</label>
        <input
          id="meta-author"
          bind:value={author}
          class="dialog-input"
          type="text"
          spellcheck="false"
          autocomplete="off"
          placeholder="your name"
        />

        <label class="dialog-label" for="meta-theme">theme</label>
        <select id="meta-theme" bind:value={theme} class="dialog-input">
          <option value="">no theme in the file (keep the current one)</option>
          {#each themes as name (name)}
            <option value={name}>{name}</option>
          {/each}
        </select>

        <p class="dialog-hint">
          These keys are written at the top of the markdown file. They are never
          rendered as a slide, and stay hidden while presenting.
        </p>

        <div class="dialog-actions">
          <button type="button" onclick={submit}>save (enter)</button>
          <button type="button" onclick={() => onclose?.()}>cancel (esc)</button>
        </div>
      </div>
    </div>
  </div>
{/if}
