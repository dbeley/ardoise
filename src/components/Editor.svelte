<script>
  let { open = false, raw = '', title = '', index = 0, total = 1, onsave, oncancel } = $props()

  let text = $state('')
  let area = $state(null)

  $effect(() => {
    if (!open) return
    text = raw
    queueMicrotask(() => {
      area?.focus()
      const end = area?.value.length ?? 0
      area?.setSelectionRange(end, end)
    })
  })

  function onkeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onsave?.(text)
      return
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      event.stopPropagation()
      onsave?.(text)
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      const start = area.selectionStart
      const end = area.selectionEnd
      text = `${text.slice(0, start)}  ${text.slice(end)}`
      queueMicrotask(() => area?.setSelectionRange(start + 2, start + 2))
      return
    }
    event.stopPropagation()
  }
</script>

{#if open}
  <div class="editor" role="dialog" aria-label="Édition de la slide">
    <div class="editor-head">
      <strong>édition</strong>
      <span>slide {index + 1}/{total}</span>
      <span>{title}</span>
      <span style="margin-left:auto"><kbd>échap</kbd> enregistrer · <kbd>^entrée</kbd> idem</span>
    </div>
    <textarea
      bind:this={area}
      bind:value={text}
      class="editor-area"
      spellcheck="false"
      aria-label="Markdown de la slide"
      onkeydown={onkeydown}
    ></textarea>
  </div>
{/if}
