<script>
  import { KEYMAP, prettyKey } from '../lib/keys.js'

  let { onclose } = $props()

  const SYNTAX = [
    { code: '<!-- pause -->', label: 'reveal the rest on the next step' },
    { code: '<!-- note: … -->', label: 'speaker note (window P)' },
    { code: '<!-- layout: center -->', label: 'centre the slide vertically' },
    { code: '::: key … :::', label: 'callout (key, warn, ok, note, quote)' },
    { code: '```mermaid', label: 'diagram rendered on output' },
    { code: '---', label: 'slide separator' },
  ]
</script>

<div
  class="overlay"
  role="dialog"
  aria-modal="true"
  aria-label="Keyboard help"
  onclick={(event) => {
    if (event.target === event.currentTarget) onclose()
  }}
>
  <div class="panel">
    <div class="panel-head">
      <strong>ardoise</strong>
      <span>keyboard</span>
      <span style="margin-left:auto">esc to close</span>
    </div>

    <div class="panel-body">
      <div class="help-grid">
        {#each KEYMAP as group (group.group)}
          <div class="help-group">
            <h3>{group.group}</h3>
            {#each group.items as item (item.label)}
              <div class="help-row">
                <span>{item.label}</span>
                <span class="help-keys">
                  {#each item.keys as key (key)}
                    <kbd>{prettyKey(key)}</kbd>
                  {/each}
                </span>
              </div>
            {/each}
          </div>
        {/each}

        <div class="help-group">
          <h3>Markdown format</h3>
          {#each SYNTAX as row (row.code)}
            <div class="help-row">
              <span>{row.label}</span>
              <span class="help-keys"><kbd>{row.code}</kbd></span>
            </div>
          {/each}
        </div>
      </div>

      <p style="margin:1.6rem 0 0;font-size:.8rem;color:var(--muted)">
        Recording tip: <kbd>.</kbd> to talk over a black screen, <kbd>i</kbd> to write an
        idea live, <kbd>P</kbd> for the notes on your second screen.
      </p>
    </div>
  </div>
</div>
