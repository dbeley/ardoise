<script>
  import { renderMarkdown, diagrams } from '../lib/render.js'

  let {
    block,
    active = false,
    editing = false,
    value = '',
    hydrate = true,
    textarea = $bindable(null),
    oninput,
    oncaret,
    onblur,
  } = $props()

  let wrapper = $state(null)

  // Le textarea prend la hauteur exacte de son contenu : aucun scroll
  // interne, l'édition reste dans le flux de la slide.
  $effect(() => {
    if (!editing || !textarea) return
    void value
    const fit = () => {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
    fit()
    requestAnimationFrame(fit)
  })
</script>

{#if editing}
  <div class="block block--source" data-kind={block.kind} class:is-cursor={active}>
    <textarea
      bind:this={textarea}
      class="block-source"
      class:is-heading={block.kind === 'heading'}
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      aria-label="Markdown du paragraphe"
      {value}
      oninput={(event) => {
        oninput?.(event.currentTarget.value, event.currentTarget.selectionStart)
      }}
      onkeyup={(event) => oncaret?.(event.currentTarget.selectionStart)}
      onclick={(event) => oncaret?.(event.currentTarget.selectionStart)}
      onblur={() => onblur?.()}
    ></textarea>
  </div>
{:else}
  <div
    bind:this={wrapper}
    class="block"
    data-kind={block.kind}
    class:is-cursor={active}
    use:diagrams={{ hydrate }}
  >
    {@html renderMarkdown(block.text)}
  </div>
{/if}
