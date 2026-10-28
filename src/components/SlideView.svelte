<script>
  import { renderMarkdown, diagrams } from '../lib/render.js'

  let { slide, step = 0, revealAll = false, hydrate = true, class: extraClass = '' } = $props()

  let segments = $derived(slide?.segments ?? [])
  let visible = $derived(
    revealAll ? segments : segments.slice(0, Math.min(step + 1, segments.length))
  )
</script>

<div class="slide {extraClass}" use:diagrams={{ hydrate }}>
  {#each visible as segment, i (i)}
    <div class="step">{@html renderMarkdown(segment)}</div>
  {/each}
</div>
