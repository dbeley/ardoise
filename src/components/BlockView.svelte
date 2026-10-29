<script>
  import { renderMarkdown, diagrams } from '../lib/render.js'

  let { block, active = false, hydrate = true } = $props()
</script>

<div class="block" data-kind={block.kind} class:is-cursor={active} use:diagrams={{ hydrate }}>
  {@html renderMarkdown(block.text)}
</div>
