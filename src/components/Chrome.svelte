<script>
  let {
    index = 0,
    total = 1,
    step = 0,
    steps = 1,
    mode = 'present',
  } = $props()

  let position = $derived(`${index + 1}/${total}`)
  let reveal = $derived(steps > 1 ? `${Math.min(step + 1, steps)}·${steps}` : '')
</script>

<footer class="chrome">
  <span class="chrome-right">
    {#if mode !== 'present'}
      <span class="chrome-mode">{mode}</span>
      <span class="chrome-dot">·</span>
    {/if}
    {#if reveal}
      <span>{reveal}</span>
      <span class="chrome-dot">·</span>
    {/if}
    <span>{position}</span>
  </span>
</footer>
