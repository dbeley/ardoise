<script>
  let { open = false, message = '', onyes, onno } = $props()
</script>

{#if open}
  <div class="overlay" role="alertdialog" aria-modal="true" aria-label="Confirm" tabindex="-1">
    <div class="panel panel--small">
      <div class="panel-head">
        <strong>confirm</strong>
      </div>
      <div class="panel-body">
        <p class="dialog-message">{message}</p>
        <div class="dialog-actions">
          <button type="button" onclick={() => onyes?.()}>continue (enter)</button>
          <button type="button" onclick={() => onno?.()}>cancel (esc)</button>
        </div>
      </div>
    </div>
  </div>
{/if}
