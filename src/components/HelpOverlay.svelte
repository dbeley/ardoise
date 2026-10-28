<script>
  import { KEYMAP, prettyKey } from '../lib/keys.js'

  let { onclose } = $props()

  const SYNTAX = [
    { code: '<!-- pause -->', label: 'révéler la suite au pas suivant' },
    { code: '<!-- note: … -->', label: 'note orateur (fenêtre P)' },
    { code: '<!-- layout: center -->', label: 'centrer verticalement' },
    { code: '::: key … :::', label: 'encadré (key, warn, ok, note, quote)' },
    { code: '```mermaid', label: 'diagramme rendu à l’affichage' },
    { code: '---', label: 'séparateur de slides' },
  ]
</script>

<div
  class="overlay"
  role="dialog"
  aria-modal="true"
  aria-label="Aide clavier"
  onclick={(event) => {
    if (event.target === event.currentTarget) onclose()
  }}
>
  <div class="panel">
    <div class="panel-head">
      <strong>ardoise</strong>
      <span>clavier</span>
      <span style="margin-left:auto">échap pour fermer</span>
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
          <h3>Format markdown</h3>
          {#each SYNTAX as row (row.code)}
            <div class="help-row">
              <span>{row.label}</span>
              <span class="help-keys"><kbd>{row.code}</kbd></span>
            </div>
          {/each}
        </div>
      </div>

      <p style="margin:1.6rem 0 0;font-size:.8rem;color:var(--muted)">
        Astuce de tournage : <kbd>b</kbd> pour parler sur écran noir, <kbd>c</kbd> pour
        écrire une idée en direct, <kbd>P</kbd> pour les notes sur le second écran.
      </p>
    </div>
  </div>
</div>
