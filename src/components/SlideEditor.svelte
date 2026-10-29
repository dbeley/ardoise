<script>
  import { onMount } from 'svelte'
  import { createView, createState } from '../lib/editor.js'

  let { view = $bindable(null), onChange, onCursor } = $props()

  let host = $state(null)

  onMount(() => {
    view = createView(host, createState('', { readonly: true, onChange, onCursor }))
    return () => {
      view?.destroy()
      view = null
    }
  })
</script>

<div class="editor-host" bind:this={host}></div>
