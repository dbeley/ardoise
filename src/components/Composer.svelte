<script>
  let { open = false, oncommit, oncancel } = $props()

  const KINDS = [
    { id: 'puce', prefix: '- ', label: 'puce' },
    { id: 'texte', prefix: '', label: 'texte' },
    { id: 'encadre', prefix: '::: key', label: 'encadré' },
  ]

  let kindIndex = $state(0)
  let text = $state('')
  let area = $state(null)

  let kind = $derived(KINDS[kindIndex])

  function resize() {
    if (!area) return
    area.style.height = 'auto'
    area.style.height = `${Math.min(area.scrollHeight, window.innerHeight * 0.3)}px`
  }

  $effect(() => {
    if (!open) return
    text = ''
    kindIndex = 0
    queueMicrotask(() => {
      area?.focus()
      resize()
    })
  })

  function submit() {
    const value = text.trim()
    if (!value) {
      oncancel?.()
      return
    }
    oncommit?.(value, kind.id)
  }

  function onkeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      submit()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      oncancel?.()
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      event.stopPropagation()
      kindIndex = (kindIndex + 1) % KINDS.length
      return
    }
    event.stopPropagation()
  }
</script>

{#if open}
  <div class="composer" role="dialog" aria-label="Composer un bloc">
    <form
      class="composer-form"
      onsubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <span class="composer-prefix">{kind.prefix || '›'}</span>
      <textarea
        bind:this={area}
        bind:value={text}
        class="composer-input"
        rows="1"
        spellcheck="false"
        placeholder="ton idée, en markdown…"
        aria-label="Texte à ancrer sur la slide"
        onkeydown={onkeydown}
        oninput={resize}
      ></textarea>
    </form>
    <div class="composer-bar">
      <span><kbd>entrée</kbd> ancrer</span>
      <span><kbd>⇧entrée</kbd> ligne</span>
      <span><kbd>tab</kbd> <span class="composer-kind">{kind.label}</span></span>
      <span class="spacer"><kbd>échap</kbd> annuler</span>
    </div>
  </div>
{/if}
