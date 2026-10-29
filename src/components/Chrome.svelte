<script>
  let {
    title = '',
    author = '',
    index = 0,
    total = 1,
    step = 0,
    steps = 1,
    elapsed = 0,
    running = false,
    mode = 'present',
  } = $props()

  function clock(ms) {
    const total = Math.floor(ms / 1000)
    const m = String(Math.floor(total / 60)).padStart(2, '0')
    const s = String(total % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  let position = $derived(`${index + 1}/${total}`)
  let reveal = $derived(steps > 1 ? `${Math.min(step + 1, steps)}·${steps}` : '')
</script>

<footer class="chrome">
  <span class="chrome-title">{title}</span>
  {#if author}
    <span class="chrome-sep">/</span>
    <span>{author}</span>
  {/if}
  <span class="chrome-right">
    {#if mode !== 'present'}
      <span class="chrome-mode">{mode}</span>
      <span class="chrome-dot">·</span>
    {/if}
    <span class="chrome-timer is-running:{running}">{clock(elapsed)}</span>
    <span class="chrome-dot">·</span>
    {#if reveal}<span>{reveal}</span>{/if}
    <span>{position}</span>
  </span>
</footer>
