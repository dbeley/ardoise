<script>
  import BlockView from './BlockView.svelte'

  let { blocks = [], activeIndex = -1, hydrate = true, class: extraClass = '' } = $props()
</script>

<div class="slide {extraClass}">
  {#each blocks as block, i (i)}
    <BlockView {block} active={i === activeIndex} {hydrate} />
  {/each}
</div>
