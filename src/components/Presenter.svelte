<script>
  import { onMount } from 'svelte'

  let payload = $state(null)
  let lastSeen = $state(0)
  let now = $state(Date.now())

  onMount(() => {
    const channel = new BroadcastChannel('ardoise')
    channel.onmessage = (event) => {
      if (event.data?.type === 'state') {
        payload = event.data
        lastSeen = Date.now()
      }
    }
    channel.postMessage({ type: 'hello' })

    const timer = setInterval(() => (now = Date.now()), 1000)
    return () => {
      clearInterval(timer)
      channel.close()
    }
  })

  let live = $derived(lastSeen > 0 && now - lastSeen < 4000)

  function clock(ms) {
    const total = Math.floor((ms ?? 0) / 1000)
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  let time = $derived(
    new Date(now).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  )
</script>

<svelte:head>
  <title>orateur - ardoise</title>
</svelte:head>

<div class="presenter">
  <header class="presenter-head">
    <span class="presenter-deck">{payload?.deckTitle ?? 'ardoise'}</span>
    <span class="presenter-status" class:is-live={live}>
      {live ? '● en direct' : '○ en attente'}
    </span>
    <span class="presenter-clock">{time}</span>
  </header>

  <main class="presenter-body">
    <section class="presenter-notes">
      <h2>notes</h2>
      {#if payload?.note}
        <p>{payload.note}</p>
      {:else}
        <p class="presenter-empty">
          {payload ? 'pas de note pour cette slide.' : 'lance la présentation dans l’autre fenêtre.'}
        </p>
      {/if}
    </section>

    <aside class="presenter-side">
      <div class="presenter-card">
        <h3>slide</h3>
        <p class="presenter-big">{payload ? `${payload.index + 1} / ${payload.total}` : '-'}</p>
        {#if payload?.steps > 1}
          <p class="presenter-small">pas {payload.step + 1} / {payload.steps}</p>
        {/if}
      </div>

      <div class="presenter-card">
        <h3>chrono</h3>
        <p class="presenter-big" class:is-running={payload?.running}>
          {clock(payload?.elapsed)}
        </p>
      </div>

      <div class="presenter-card">
        <h3>actuelle</h3>
        <p class="presenter-title">{payload?.title ?? '-'}</p>
      </div>

      <div class="presenter-card">
        <h3>suivante</h3>
        <p class="presenter-title is-dim">{payload?.next || 'fin du deck'}</p>
      </div>
    </aside>
  </main>

  <footer class="presenter-foot">
    <span>cette fenêtre ne sert qu’à toi - ne pas capturer dans OBS</span>
  </footer>
</div>

<style>
  .presenter {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: #0e1014;
    color: #d9dce3;
    font-family: inherit;
  }

  .presenter-head {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    padding: 0.8rem 1.4rem;
    border-bottom: 1px solid #24272f;
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #6b7280;
  }

  .presenter-deck {
    color: #aeb4c0;
  }

  .presenter-status.is-live {
    color: #9ece6a;
  }

  .presenter-clock {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
  }

  .presenter-body {
    flex: 1;
    display: grid;
    grid-template-columns: 1.55fr 1fr;
    min-height: 0;
  }

  .presenter-notes {
    padding: 2rem 2.2rem;
    overflow: auto;
    border-right: 1px solid #1c1f26;
  }

  .presenter-notes h2,
  .presenter-card h3 {
    margin: 0 0 0.9rem;
    font-size: 0.64rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #7aa2f7;
    font-weight: 600;
  }

  .presenter-notes p {
    margin: 0;
    font-size: clamp(1.25rem, 2.1vw, 1.85rem);
    line-height: 1.55;
    color: #e6e9ef;
    white-space: pre-wrap;
    text-wrap: pretty;
  }

  .presenter-notes p.presenter-empty {
    color: #565d69;
    font-size: 1.1rem;
  }

  .presenter-side {
    padding: 1.4rem 1.6rem;
    display: grid;
    grid-template-rows: repeat(4, auto);
    gap: 0.9rem;
    overflow: auto;
  }

  .presenter-card {
    border: 1px solid #1e222a;
    border-left: 2px solid #2b3040;
    border-radius: 3px;
    padding: 0.8rem 0.95rem;
    background: #12151a;
  }

  .presenter-big {
    margin: 0;
    font-size: 1.9rem;
    font-variant-numeric: tabular-nums;
    color: #e6e9ef;
    line-height: 1.1;
  }

  .presenter-big.is-running {
    color: #7aa2f7;
  }

  .presenter-small {
    margin: 0.3rem 0 0;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .presenter-title {
    margin: 0;
    font-size: 1rem;
    line-height: 1.35;
    color: #cdd3dd;
  }

  .presenter-title.is-dim {
    color: #7c8493;
  }

  .presenter-foot {
    padding: 0.6rem 1.4rem;
    border-top: 1px solid #1c1f26;
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #4a515c;
  }
</style>
