<script>
  import { onMount, tick } from 'svelte'
  import { parseDeck, withScratch, serialize, replaceSlideRaw, slugify } from './lib/deck.js'
  import { normalizeKey, isEditableTarget } from './lib/keys.js'
  import { storage, download } from './lib/storage.js'
  import SlideView from './components/SlideView.svelte'
  import Chrome from './components/Chrome.svelte'
  import Composer from './components/Composer.svelte'
  import Editor from './components/Editor.svelte'
  import CommandBar from './components/CommandBar.svelte'
  import HelpOverlay from './components/HelpOverlay.svelte'
  import Overview from './components/Overview.svelte'
  import welcome from '../decks/bienvenue.md?raw'

  const THEMES = ['ardoise', 'paper', 'gruvbox', 'nord']
  const params = new URLSearchParams(location.search)

  let source = $state(storage.deckSource() || welcome)
  let scratch = $state(storage.scratch() || {})
  let deck = $derived(withScratch(parseDeck(source), scratch))

  let index = $state(0)
  let step = $state(0)
  let mode = $state('present')
  let theme = $state(THEMES.includes(params.get('theme')) ? params.get('theme') : storage.theme())
  let raw = $state(params.get('raw') === '1')
  let elapsed = $state(0)
  let running = $state(false)
  let toastMsg = $state('')
  let overviewCursor = $state(0)
  let printAll = $state(false)
  let stageEl = $state(null)

  let current = $derived(deck.slides[index] ?? deck.slides[0] ?? null)
  let steps = $derived(current?.segments.length ?? 1)
  let total = $derived(deck.slides.length || 1)
  let progress = $derived(
    Math.min(100, ((index + (steps > 1 ? step / steps : 0)) / total) * 100)
  )

  let toastTimer = null
  function showToast(message) {
    toastMsg = message
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toastMsg = ''), 2200)
  }

  /* ---------- persistance ---------- */

  $effect(() => {
    document.documentElement.dataset.theme = theme
    storage.saveTheme(theme)
  })

  $effect(() => {
    document.body.classList.toggle('is-raw', raw)
  })

  $effect(() => {
    const wanted = index
    storage.saveSlide(wanted)
  })

  /* ---------- chrono ---------- */

  let startedAt = 0
  let base = 0

  $effect(() => {
    if (!running) return
    const id = setInterval(() => {
      elapsed = base + (Date.now() - startedAt)
    }, 200)
    return () => clearInterval(id)
  })

  function toggleTimer() {
    base = elapsed
    if (running) {
      running = false
    } else {
      startedAt = Date.now()
      running = true
    }
  }

  function resetTimer() {
    elapsed = 0
    base = 0
    startedAt = Date.now()
  }

  /* ---------- fenêtre orateur ---------- */

  let channel = null
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('ardoise')
    channel.addEventListener('message', (event) => {
      if (event.data?.type === 'hello') postState()
    })
  }

  function postState() {
    channel?.postMessage({
      type: 'state',
      index,
      step,
      steps,
      total,
      title: current?.title ?? '',
      next: deck.slides[index + 1]?.title ?? '',
      note: current?.note ?? '',
      elapsed,
      running,
      deckTitle: deck.meta.title,
    })
  }

  $effect(() => {
    // Toute dépendance lue ici déclenche la synchro de la fenêtre orateur.
    void index
    void step
    void steps
    void total
    void elapsed
    void running
    void deck
    postState()
  })

  function openPresenter() {
    const url = new URL(location.href)
    url.search = '?presenter=1'
    window.open(url.toString(), 'ardoise-presenter', 'width=1000,height=740')
    showToast('fenêtre orateur ouverte')
  }

  /* ---------- initialisation ---------- */

  onMount(async () => {
    const wanted = params.has('slide') ? Number(params.get('slide')) - 1 : storage.slide()
    index = clampIndex(Number.isFinite(wanted) ? wanted : 0)

    if (params.get('deck')) {
      try {
        const response = await fetch(params.get('deck'))
        const text = await response.text()
        source = text
        index = 0
        showToast('deck chargé depuis l’URL')
      } catch {
        showToast('deck introuvable')
      }
    }

    if (!params.has('onboard') && !storage.onboarded()) {
      mode = 'onboard'
    } else if (params.get('raw') === '1') {
      mode = 'present'
    }
  })

  /* ---------- navigation ---------- */

  function clampIndex(value) {
    const max = Math.max(0, deck.slides.length - 1)
    return Math.max(0, Math.min(Number(value) || 0, max))
  }

  function lastStepOf(i) {
    return Math.max(0, (deck.slides[i]?.segments.length ?? 1) - 1)
  }

  function scrollTop() {
    if (stageEl) stageEl.scrollTop = 0
  }

  async function scrollToLatest() {
    await tick()
    if (!stageEl) return
    if (stageEl.scrollHeight - stageEl.clientHeight > 4) {
      stageEl.scrollTo({ top: stageEl.scrollHeight, behavior: 'smooth' })
    }
  }

  function goTo(i) {
    index = clampIndex(i)
    step = 0
    scrollTop()
  }

  function nextStep() {
    if (step < steps - 1) {
      step += 1
      scrollToLatest()
    } else if (index < total - 1) {
      index += 1
      step = 0
      scrollTop()
    }
  }

  function prevStep() {
    if (step > 0) {
      step -= 1
    } else if (index > 0) {
      index -= 1
      step = lastStepOf(index)
    }
  }

  function nextSlide() {
    if (index < total - 1) {
      index += 1
      step = 0
      scrollTop()
    }
  }

  function prevSlide() {
    if (index > 0) {
      index -= 1
      step = 0
      scrollTop()
    }
  }

  /* ---------- écriture en direct ---------- */

  function openComposer() {
    mode = 'compose'
  }

  async function commitBlock(text, kind) {
    const markdown =
      kind === 'puce'
        ? text
            .split('\n')
            .map((line) => `- ${line}`)
            .join('\n')
        : kind === 'encadre'
          ? `::: key\n${text}\n:::`
          : text

    scratch = { ...scratch, [index]: [...(scratch[index] ?? []), markdown] }
    storage.saveScratch(scratch)
    mode = 'present'
    step = lastStepOf(index)
    await tick()
    step = lastStepOf(index)
    await markFresh()
    scrollToLatest()
    showToast('bloc ancré sur la slide')
  }

  async function markFresh() {
    await tick()
    const stepEls = stageEl?.querySelectorAll('.slide .step')
    const lastStep = stepEls?.[stepEls.length - 1]
    const target = lastStep?.lastElementChild
    if (!target) return
    target.classList.add('fresh')
    setTimeout(() => target.classList.remove('fresh'), 1500)
  }

  function clearScratch() {
    if (!scratch[index]?.length) {
      showToast('aucun bloc live sur cette slide')
      return
    }
    const copy = { ...scratch }
    delete copy[index]
    scratch = copy
    storage.saveScratch(scratch)
    step = Math.min(step, lastStepOf(index))
    showToast('blocs live effacés')
  }

  function saveEdit(text) {
    const trimmed = text.trim()
    if (trimmed !== (current?.raw ?? '').trim()) {
      source = replaceSlideRaw(source, index, trimmed)
      storage.saveDeckSource(source)
      showToast('slide enregistrée')
    }
    mode = 'present'
    step = Math.min(step, lastStepOf(index))
  }

  function saveDeck() {
    const name = slugify(deck.meta.title) || 'ardoise'
    download(`${name}.md`, serialize(parseDeck(source), scratch))
    showToast('deck exporté en markdown')
  }

  async function exportPdf() {
    printAll = true
    await tick()
    await new Promise((resolve) => setTimeout(resolve, 700))
    window.print()
    setTimeout(() => (printAll = false), 1200)
  }

  async function loadFile(file) {
    if (!file) return
    const text = await file.text()
    source = text
    storage.saveDeckSource(text)
    index = 0
    step = 0
    showToast(`deck chargé : ${file.name}`)
  }

  function onDrop(event) {
    event.preventDefault()
    const file = event.dataTransfer?.files?.[0]
    if (file) loadFile(file)
  }

  function resetAll() {
    scratch = {}
    storage.saveScratch(scratch)
    storage.clearDeckSource()
    source = welcome
    index = 0
    step = 0
    showToast('retour au deck de démonstration')
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      showToast('plein écran refusé par le navigateur')
    }
  }

  function cycleTheme() {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
    theme = next
    showToast(`thème : ${next}`)
  }

  function setTheme(name) {
    const wanted = String(name || '').trim().toLowerCase()
    if (!THEMES.includes(wanted)) {
      showToast(`thèmes : ${THEMES.join(', ')}`)
      return
    }
    theme = wanted
    showToast(`thème : ${wanted}`)
  }

  /* ---------- palette de commandes ---------- */

  let commands = $derived([
    { id: 'next', key: 'next', label: 'pas suivant', run: nextStep },
    { id: 'prev', key: 'prev', label: 'pas précédent', run: prevStep },
    { id: 'slide', key: 'slide 7', label: 'aller à la slide', run: (q) => goTo(Number(q.split(/\s+/)[1]) - 1) },
    { id: 'compose', key: 'compose', label: 'composer un bloc en direct', run: openComposer },
    { id: 'edit', key: 'edit', label: 'éditer la slide brute', run: () => (mode = 'edit') },
    { id: 'theme', key: 'theme nord', label: 'changer de thème', run: (q) => setTheme(q.split(/\s+/)[1] || cycleTheme()) },
    { id: 'overview', key: 'overview', label: 'vue d’ensemble', run: () => { overviewCursor = index; mode = 'overview' } },
    { id: 'presenter', key: 'presenter', label: 'fenêtre orateur', run: openPresenter },
    { id: 'timer', key: 'timer', label: 'chrono marche / arrêt', run: toggleTimer },
    { id: 'timer-reset', key: 'timer reset', label: 'remettre le chrono à zéro', run: resetTimer },
    { id: 'save', key: 'save', label: 'télécharger le markdown', run: saveDeck },
    { id: 'export', key: 'export', label: 'exporter en PDF (impression)', run: exportPdf },
    { id: 'raw', key: 'raw', label: 'masquer le pied de scène (OBS)', run: () => { raw = !raw; showToast(raw ? 'mode captation' : 'pied de scène visible') } },
    { id: 'reset', key: 'reset', label: 'revenir au deck de démo', run: resetAll },
    { id: 'help', key: 'help', label: 'aide clavier', run: () => (mode = 'help') },
  ])

  function runCommand(command, query) {
    mode = 'present'
    if (command?.run) {
      command.run(query)
      return
    }
    const trimmed = query.trim()
    if (/^\d+$/.test(trimmed)) {
      goTo(Number(trimmed) - 1)
      return
    }
    showToast(`commande inconnue : ${trimmed}`)
  }

  /* ---------- clavier ---------- */

  let countBuf = ''
  let lastG = 0

  function dismissOnboarding() {
    storage.setOnboarded(true)
    mode = 'present'
  }

  function gridColumns() {
    const grid = document.querySelector('.overview-grid')
    if (!grid) return 1
    const columns = getComputedStyle(grid).gridTemplateColumns
    return Math.max(1, columns.split(' ').filter(Boolean).length)
  }

  async function overviewMove(delta) {
    overviewCursor = Math.max(0, Math.min(overviewCursor + delta, total - 1))
    await tick()
    document.querySelector('.thumb.is-active')?.scrollIntoView({ block: 'nearest' })
  }

  function onKeydown(event) {
    const key = normalizeKey(event)
    if (event.ctrlKey || event.metaKey || event.altKey) return

    if (mode === 'onboard') {
      dismissOnboarding()
      return
    }

    if (mode === 'black') {
      event.preventDefault()
      mode = 'present'
      return
    }

    if (mode === 'help') {
      if (key === 'échap' || key === '?' || key === 'q') {
        event.preventDefault()
        mode = 'present'
      }
      return
    }

    if (mode === 'overview') {
      const cols = gridColumns()
      if (key === 'échap' || key === 'o') {
        event.preventDefault()
        mode = 'present'
      } else if (key === 'entrée' || key === 'espace') {
        event.preventDefault()
        goTo(overviewCursor)
        mode = 'present'
      } else if (key === '→' || key === 'l' || key === 'j') {
        event.preventDefault()
        overviewMove(key === 'j' ? cols : 1)
      } else if (key === '←' || key === 'h' || key === 'k') {
        event.preventDefault()
        overviewMove(key === 'k' ? -cols : -1)
      }
      return
    }

    if (mode === 'command') {
      if (key === 'échap') {
        event.preventDefault()
        mode = 'present'
      }
      return
    }

    if (mode === 'compose') {
      if (key === 'échap') {
        event.preventDefault()
        mode = 'present'
      }
      return
    }

    if (mode === 'edit') return
    if (isEditableTarget(event.target)) return
    if (event.repeat && ['espace', 'j', 'k', 'l', 'h', 'p', 'n'].includes(key)) return

    if (/^[0-9]$/.test(key)) {
      countBuf = (countBuf + key).slice(0, 3)
      return
    }

    switch (key) {
      case 'espace':
      case 'j':
      case 'l':
      case '→':
        event.preventDefault()
        nextStep()
        return
      case 'n':
        event.preventDefault()
        nextSlide()
        return
      case 'k':
      case 'h':
      case '←':
        event.preventDefault()
        prevStep()
        return
      case 'p':
        event.preventDefault()
        prevSlide()
        return
      case 'G':
        event.preventDefault()
        goTo(countBuf ? Number(countBuf) - 1 : total - 1)
        countBuf = ''
        return
      case 'g': {
        event.preventDefault()
        const now = Date.now()
        if (now - lastG < 620) {
          goTo(0)
          lastG = 0
        } else {
          lastG = now
        }
        return
      }
      case 'b':
        event.preventDefault()
        mode = 'black'
        return
      case 'o':
        event.preventDefault()
        overviewCursor = index
        mode = 'overview'
        return
      case '?':
        event.preventDefault()
        mode = 'help'
        return
      case ':':
        event.preventDefault()
        mode = 'command'
        return
      case 'c':
        event.preventDefault()
        openComposer()
        return
      case 'e':
        event.preventDefault()
        mode = 'edit'
        return
      case 'r':
        event.preventDefault()
        clearScratch()
        return
      case 't':
        event.preventDefault()
        toggleTimer()
        return
      case 'f':
        event.preventDefault()
        toggleFullscreen()
        return
      case 's':
        event.preventDefault()
        saveDeck()
        return
      case 'P':
        event.preventDefault()
        openPresenter()
        return
      case 'échap':
        countBuf = ''
        return
      default:
        return
    }
  }

</script>

<svelte:window
  onkeydown={onKeydown}
  ondragover={(event) => event.preventDefault()}
  ondrop={onDrop}
/>

<div class="progress-top" style="width: {progress}%"></div>

<div class="stage" bind:this={stageEl} aria-live="polite">
  <div class="slide-scroll" class:is-centered={current?.layout === 'center'}>
    {#if current}
      {#key index}
        <SlideView slide={current} {step} />
      {/key}
    {/if}
  </div>
</div>

<Chrome
  title={deck.meta.title}
  author={deck.meta.author}
  index={index}
  total={total}
  {step}
  {steps}
  {elapsed}
  {running}
  {mode}
/>

<Composer
  open={mode === 'compose'}
  oncommit={commitBlock}
  oncancel={() => (mode = 'present')}
/>

<Editor
  open={mode === 'edit'}
  raw={current?.raw ?? ''}
  title={current?.title ?? ''}
  index={index}
  total={total}
  onsave={saveEdit}
  oncancel={() => (mode = 'present')}
/>

<CommandBar
  open={mode === 'command'}
  {commands}
  onrun={runCommand}
  onclose={() => (mode = 'present')}
/>

{#if mode === 'help'}
  <HelpOverlay onclose={() => (mode = 'present')} />
{/if}

{#if mode === 'overview'}
  <Overview
    slides={deck.slides}
    cursor={overviewCursor}
    currentIndex={index}
    onselect={(target) => {
      goTo(target)
      mode = 'present'
    }}
    onclose={() => (mode = 'present')}
  />
{/if}

{#if mode === 'black'}
  <div class="black-screen">écran noir · une touche pour revenir</div>
{/if}

{#if toastMsg}
  <div class="toast">{toastMsg}</div>
{/if}

{#if mode === 'onboard'}
  <div class="overlay" role="dialog" aria-modal="true" aria-label="Prise en main">
    <div class="panel" style="width:min(720px,94vw)">
      <div class="panel-head">
        <strong>ardoise</strong>
        <span>prise en main</span>
      </div>
      <div class="panel-body">
        <p style="margin:0 0 .4rem;color:var(--fg)">
          Trois gestes suffisent pour animer une idée en direct.
        </p>
        <div class="onboard-list">
          <div class="onboard-row">
            <span class="help-keys"><kbd>espace</kbd></span>
            <span>avancer d’un pas, puis d’une slide</span>
          </div>
          <div class="onboard-row">
            <span class="help-keys"><kbd>c</kbd></span>
            <span>écrire une idée : <kbd>entrée</kbd> l’ancre sur la slide</span>
          </div>
          <div class="onboard-row">
            <span class="help-keys"><kbd>e</kbd></span>
            <span>éditer la slide brute, <kbd>échap</kbd> enregistre</span>
          </div>
          <div class="onboard-row">
            <span class="help-keys"><kbd>?</kbd> <kbd>:</kbd> <kbd>b</kbd></span>
            <span>aide, commandes, écran noir</span>
          </div>
        </div>
        <p style="margin:0;font-size:.78rem;color:var(--muted)">
          Glisse un fichier <code>.md</code> sur la fenêtre pour présenter ton propre deck.
        </p>
        <button
          type="button"
          onclick={dismissOnboarding}
          style="margin-top:1.2rem;background:var(--accent-soft);color:var(--fg);border:1px solid var(--accent);border-radius:3px;padding:.5rem 1rem;font-family:inherit;font-size:.8rem;cursor:pointer"
        >
          commencer
        </button>
      </div>
    </div>
  </div>
{/if}

{#if printAll}
  <div class="print-deck">
    {#each deck.slides as slide (slide.index)}
      <div class="print-slide">
        <SlideView {slide} revealAll />
      </div>
    {/each}
  </div>
{/if}
