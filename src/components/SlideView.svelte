<script>
  import BlockView from './BlockView.svelte'

  let {
    blocks = [],
    activeIndex = -1,
    editing = false,
    hydrate = true,
    value = '',
    textarea = $bindable(null),
    oninput,
    oncaret,
    onblur,
    class: extraClass = '',
  } = $props()
</script>

<div class="slide {extraClass}">
  {#each blocks as block, i (i)}
    <BlockView
      {block}
      active={i === activeIndex}
      editing={editing && i === activeIndex}
      {value}
      {hydrate}
      bind:textarea
      {oninput}
      {oncaret}
      {onblur}
    />
  {/each}
</div>
