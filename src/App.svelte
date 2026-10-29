<script>
  import { onMount, tick } from 'svelte'
  import {
    parseDeck,
    applyBlockEdit,
    insertBlockAfter,
    serialize,
    slugify,
    blockKind,
  } from './lib/deck.js'
  import { normalizeKey, isEditableTarget } from './lib/keys.js'
  import { move, operatorRange, deleteRange, smartNewline, clamp } from './lib/motions.js'
  import { storage, download } from './lib/storage.js'
  import SlideView from './components/SlideView.svelte'
  import Chrome from './components/Chrome.svelte'
  import CommandBar from './components/CommandBar.svelte'
  import HelpOverlay from './components/HelpOverlay.svelte'
  import Overview from './components/Overview.svelte'
  import welcome from '../decks/bienvenue.md?raw'

  const THEMES = ['ardoise', 'paper', 'gruvbox', 'nord']
  const params = new URLSearchParams(location.search)
  const TEXT_KEYS = ['h', 'l', 'w', 'b', 'e', '0', '$', '↑', '↓']

  /* ---------- état ---------- */

  let source = $state(storage.deckSource() || welcome)
  let deck = $derived(parseDeck(source))

  let slideIndex = $state(0)
  let blockIndex = $state(0)
  let caret = $state(0)
  let editing = $state(false)
  let insertMode = $state(false)
  let draft = $state('')
  let phantom = $state(null)

  let mode = $state('present')
  let theme = $state(THEMES.includes(params.get('theme')) ? params.get('theme') : storage.theme())
  let typeScale = $state(clamp(Number(storage.scale()) || 1, 0.8, 1.6))
  let raw = $state(params.get('raw') === '1')
  let elapsed = $state(0)
  let running = $state(false)
  let toastMsg = $state('')
  let overviewCursor = $state(0)
  let printAll = $state(false)
  let stageEl = $state(null)
  let textareaEl = $state(null)
  let fileInput = $state(null)

  let countBuf = ''
  let pendingOp = null
  let lastG = 0
  let history = []

  let slide = $derived(deck.slides[slideIndex] ?? deck.slides[0] ?? null)
  let blocks = $derived(slide?.blocks ?? [])
  let total = $derived(deck.slides.length || 1)

  let block = $derived(blocks[Math.min(blockIndex, Math.max(0, blocks.length - 1))] ?? null)
  let seg = $derived(block?.segIndex ?? 0)
  let segmentCount = $derived(slide?.segmentCount ?? 1)

  /**
   * Blocs réellement affichés : jusqu'au segment courant, plus le
   * paragraphe fantôme en cours de création (`O`).
   */
  let viewBlocks = $derived.by(() => {
    if (!slide) return []
    const list = blocks.filter((b) => b.segIndex <= seg)
    if (!phantom) return list

    const ghost = {
      text: phantom.text,
      kind: blockKind(phantom.text || ' '),
      phantom: true,
      segIndex: phantom.segIndex,
      startLine: phantom.afterLine + 2,
      endLine: phantom.afterLine + 2,
    }
    const position = list.filter((b) => b.startLine <= phantom.afterLine).length
    list.splice(Math.min(position, list.length), 0, ghost)
    return list
  })

  let activeIndex = $derived(
    phantom
      ? viewBlocks.findIndex((b) => b.phantom)
      : Math.min(blockIndex, Math.max(0, viewBlocks.length - 1))
  )
  let activeBlock = $derived(viewBlocks[activeIndex] ?? null)

  let progress = $derived(
    Math.min(100, ((slideIndex + (seg + 1) / Math.max(1, segmentCount)) / total) * 100)
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
    document.documentElement.style.setProperty('--type-scale', String(typeScale))
    storage.saveScale(typeScale)
  })

  $effect(() => {
    document.body.classList.toggle('is-raw', raw)
  })

  $effect(() => {
    storage.saveSlide(slideIndex)
  })

  $effect(() => {
    const value = source
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => storage.saveDeckSource(value), 300)
  })
  let saveTimer = null

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
      index: slideIndex,
      step: seg,
      steps: segmentCount,
      total,
      title: slide?.title ?? '',
      next: deck.slides[slideIndex + 1]?.title ?? '',
      note: slide?.note ?? '',
      elapsed,
      running,
      deckTitle: deck.meta.title,
    })
  }

  $effect(() => {
    void slideIndex
    void seg
    void segmentCount
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
    slideIndex = clamp(Number.isFinite(wanted) ? wanted : 0, 0, total - 1)
    blockIndex = 0
    applyDeckTheme(deck.meta)

    if (params.get('deck')) {
      try {
        const response = await fetch(params.get('deck'))
        source = await response.text()
        slideIndex = 0
        applyDeckTheme(deck.meta)
        showToast('deck chargé depuis l’URL')
      } catch {
        showToast('deck introuvable')
      }
    }

    if (!params.has('onboard') && !storage.onboarded()) mode = 'onboard'
  })

  /* ---------- curseur ---------- */

  function pushHistory() {
    history.push(source)
    if (history.length > 60) history.shift()
  }

  function undo() {
    if (!history.length) {
      showToast('rien à annuler')
      return
    }
    commitEdit()
    source = history.pop()
    blockIndex = clamp(blockIndex, 0, blocks.length - 1)
    caret = clamp(caret, 0, block?.text.length ?? 0)
    showToast('annulé')
  }

  function blockLineCount(b) {
    return (b?.text.match(/\n/g)?.length ?? 0) + 1
  }

  async function focusCaret() {
    await tick()
    if (!textareaEl) return
    textareaEl.focus({ preventScroll: true })
    const position = clamp(caret, 0, textareaEl.value.length)
    textareaEl.setSelectionRange(position, position)
    scrollCursorIntoView()
  }

  async function scrollCursorIntoView() {
    await tick()
    const element = stageEl?.querySelector('.block.is-cursor')
    element?.scrollIntoView({ block: 'center', behavior: 'auto' })
  }

  function startEditing(position = caret, insert = false) {
    if (!activeBlock) {
      newParagraph()
      return
    }
    if (!editing) {
      draft = activeBlock.text
      editing = true
    }
    insertMode = insert
    caret = clamp(position, 0, draft.length)
    focusCaret()
  }

  /** Écrit `draft` dans le source. Ne touche à rien si rien n'a changé. */
  function commitEdit() {
    if (!editing) return
    const target = activeBlock
    const text = draft
    editing = false
    insertMode = false

    if (target?.phantom) {
      const anchor = phantom
      phantom = null
      const content = text.replace(/\s+$/, '')
      if (!content.trim()) return
      pushHistory()
      source = insertBlockAfter(source, slideIndex, anchor.afterLine, content)
      const line = anchor.afterLine + 2
      const found = deck.slides[slideIndex].blocks.findIndex((b) => b.startLine === line)
      if (found >= 0) blockIndex = found
      return
    }

    if (!target || target.phantom) return
    if (text === target.text) return

    pushHistory()
    const startLine = target.startLine
    source = applyBlockEdit(source, slideIndex, target.startLine, target.endLine, text)
    const next = deck.slides[slideIndex]?.blocks ?? []
    const found = next.findIndex((b) => b.startLine === startLine)
    blockIndex = found >= 0 ? found : clamp(blockIndex, 0, next.length - 1)
    caret = clamp(caret, 0, next[blockIndex]?.text.length ?? 0)
  }

  function setDraft(nextText, nextCaret) {
    if (!editing) {
      draft = activeBlock?.text ?? ''
      editing = true
    }
    draft = nextText
    caret = clamp(nextCaret, 0, nextText.length)
    focusCaret()
  }

  function currentText() {
    return editing ? draft : (activeBlock?.text ?? '')
  }

  async function applyMotion(motion, count = 1) {
    if (!activeBlock) return
    if (!editing) {
      draft = activeBlock.text
      editing = true
      insertMode = false
    }
    caret = move(draft, caret, motion, count)
    await focusCaret()
  }

  function applyOperator(op, motion, count = 1) {
    if (!activeBlock) return
    const text = currentText()
    const [from, to] = operatorRange(text, caret, motion, count)
    const result = deleteRange(text, from, to)
    setDraft(result.text, result.pos)
    insertMode = op === 'c'
  }

  function deleteChar(count = 1) {
    if (!activeBlock) return
    const text = currentText()
    const [from, to] = operatorRange(text, caret, 'l', count)
    const result = deleteRange(text, from, to)
    setDraft(result.text, result.pos)
  }

  function applySmartNewline() {
    const result = smartNewline(draft, caret)
    draft = result.text
    caret = result.pos
    focusCaret()
  }

  function newParagraph() {
    commitEdit()
    const anchor = activeBlock
    const seed = anchor?.kind === 'list' ? '- ' : ''
    phantom = {
      segIndex: anchor?.segIndex ?? seg,
      afterLine: anchor ? anchor.endLine : Math.max(0, (slide?.raw.split('\n').length ?? 1) - 1),
      text: seed,
    }
    editing = true
    insertMode = true
    draft = seed
    caret = seed.length
    focusCaret()
  }

  /* ---------- navigation ---------- */

  function scrollTop() {
    if (stageEl) stageEl.scrollTop = 0
  }

  function globalBlocks() {
    const list = []
    deck.slides.forEach((s, si) => s.blocks.forEach((b, bi) => list.push({ si, bi })))
    return list
  }

  function goToSlide(target) {
    commitEdit()
    slideIndex = clamp(target, 0, total - 1)
    blockIndex = 0
    caret = 0
    phantom = null
    scrollTop()
  }

  function goToGlobalBlock(position) {
    const list = globalBlocks()
    const found = list[clamp(position, 0, list.length - 1)]
    if (!found) return
    commitEdit()
    slideIndex = found.si
    blockIndex = found.bi
    caret = 0
    scrollTop()
  }

  function nextBlock() {
    commitEdit()
    phantom = null
    if (blockIndex < blocks.length - 1) {
      blockIndex += 1
      caret = 0
      scrollCursorIntoView()
    } else if (slideIndex < total - 1) {
      goToSlide(slideIndex + 1)
    }
  }

  function prevBlock() {
    commitEdit()
    phantom = null
    if (blockIndex > 0) {
      blockIndex -= 1
      caret = 0
      scrollCursorIntoView()
    } else if (slideIndex > 0) {
      commitEdit()
      slideIndex -= 1
      const previous = deck.slides[slideIndex]
      blockIndex = Math.max(0, (previous?.blocks.length ?? 1) - 1)
      caret = 0
      scrollCursorIntoView()
    }
  }

  /** Le pas suit les segments (`<!-- pause -->`), le paragraphe est plus fin. */
  function nextStep() {
    commitEdit()
    phantom = null
    const found = blocks.findIndex((b) => b.segIndex > seg)
    if (found >= 0) {
      blockIndex = found
      caret = 0
      scrollCursorIntoView()
    } else if (slideIndex < total - 1) {
      goToSlide(slideIndex + 1)
    }
  }

  function prevStep() {
    commitEdit()
    phantom = null
    const currentSeg = seg
    let previous = -1
    blocks.forEach((b, i) => {
      if (b.segIndex < currentSeg) previous = i
    })
    if (previous >= 0) {
      blockIndex = previous
      caret = 0
      scrollCursorIntoView()
    } else if (slideIndex > 0) {
      slideIndex -= 1
      const previousSlide = deck.slides[slideIndex]
      blockIndex = Math.max(0, (previousSlide?.blocks.length ?? 1) - 1)
      caret = 0
      scrollCursorIntoView()
    }
  }

  /* ---------- fichiers ---------- */

  function saveDeck() {
    const name = slugify(deck.meta.title) || 'ardoise'
    download(`${name}.md`, serialize(parseDeck(source)))
    showToast('deck exporté en markdown')
  }

  async function exportPdf() {
    commitEdit()
    printAll = true
    await tick()
    await new Promise((resolve) => setTimeout(resolve, 700))
    window.print()
    setTimeout(() => (printAll = false), 1200)
  }

  async function adoptDeck(text, label) {
    source = text
    history = []
    applyDeckTheme(deck.meta)
    slideIndex = 0
    blockIndex = 0
    caret = 0
    phantom = null
    if (label) showToast(label)
  }

  async function loadFile(file) {
    if (!file) return
    await adoptDeck(await file.text(), `deck chargé : ${file.name}`)
  }

  function openFilePicker() {
    fileInput?.click()
  }

  async function importFromUrl(url) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(String(response.status))
      await adoptDeck(await response.text(), 'deck importé depuis l’URL')
    } catch {
      showToast('import impossible (URL ou CORS)')
    }
  }

  function onDrop(event) {
    event.preventDefault()
    const file = event.dataTransfer?.files?.[0]
    if (file) loadFile(file)
  }

  function resetAll() {
    storage.clearDeckSource()
    source = welcome
    history = []
    slideIndex = 0
    blockIndex = 0
    caret = 0
    phantom = null
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
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
    showToast(`thème : ${theme}`)
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

  /* Un deck peut déclarer son thème dans son en-tête : il s'applique à l'ouverture. */
  function applyDeckTheme(meta) {
    const fromUrl = String(params.get('theme') || '').toLowerCase()
    if (THEMES.includes(fromUrl)) {
      theme = fromUrl
      return
    }
    const fromDeck = String(meta?.theme || '').toLowerCase()
    if (THEMES.includes(fromDeck) && fromDeck !== theme) {
      theme = fromDeck
      showToast(`thème du deck : ${fromDeck}`)
    }
  }

  const SCALE_MIN = 0.8
  const SCALE_MAX = 1.6

  function setScale(value) {
    if (value === undefined || value === null || value === '') {
      showToast(`taille : ${Math.round(typeScale * 100)} %`)
      return
    }
    let number = Number(String(value).trim())
    if (!Number.isFinite(number)) {
      showToast('taille : +10, -10, 120, reset')
      return
    }
    if (Math.abs(number) > 10) number /= 100
    typeScale = Math.round(clamp(number, SCALE_MIN, SCALE_MAX) * 100) / 100
    showToast(`taille : ${Math.round(typeScale * 100)} %`)
  }

  function bumpScale(delta) {
    setScale(typeScale + delta)
  }

  /* ---------- palette de commandes ---------- */

  let commands = $derived([
    { id: 'next', key: 'next', label: 'paragraphe suivant', run: nextBlock },
    { id: 'prev', key: 'prev', label: 'paragraphe précédent', run: prevBlock },
    { id: 'step', key: 'step', label: 'pas suivant (segment)', run: nextStep },
    { id: 'slide', key: 'slide 7', label: 'aller à la slide', run: (q) => goToSlide(Number(q.split(/\s+/)[1]) - 1) },
    { id: 'edit', key: 'edit', label: 'éditer le paragraphe', run: () => startEditing(caret, true) },
    { id: 'new', key: 'new', label: 'nouveau paragraphe', run: newParagraph },
    { id: 'theme', key: 'theme nord', label: 'changer de thème', run: (q) => setTheme(q.split(/\s+/)[1] || cycleTheme()) },
    { id: 'size', key: 'size 120', label: 'taille du texte (80–160 %)', run: (q) => {
        const argument = q.split(/\s+/)[1]
        if (argument === 'reset') setScale(1)
        else if (argument) setScale(argument)
        else showToast(`taille : ${Math.round(typeScale * 100)} %`)
      } },
    { id: 'overview', key: 'overview', label: 'vue d’ensemble', run: () => { overviewCursor = slideIndex; mode = 'overview' } },
    { id: 'presenter', key: 'presenter', label: 'fenêtre orateur', run: openPresenter },
    { id: 'timer', key: 'timer', label: 'chrono marche / arrêt', run: toggleTimer },
    { id: 'timer-reset', key: 'timer reset', label: 'remettre le chrono à zéro', run: resetTimer },
    { id: 'open', key: 'open', label: 'importer un fichier markdown', run: (q) => {
        const argument = q.split(/\s+/)[1]
        if (argument) importFromUrl(argument)
        else openFilePicker()
      } },
    { id: 'save', key: 'save', label: 'télécharger le markdown', run: saveDeck },
    { id: 'export', key: 'export', label: 'exporter en PDF (impression)', run: exportPdf },
    { id: 'undo', key: 'undo', label: 'annuler la dernière édition', run: undo },
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
      goToSlide(Number(trimmed) - 1)
      return
    }
    showToast(`commande inconnue : ${trimmed}`)
  }

  /* ---------- clavier ---------- */

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
    overviewCursor = clamp(overviewCursor + delta, 0, total - 1)
    await tick()
    document.querySelector('.thumb.is-active')?.scrollIntoView({ block: 'nearest' })
  }

  function listStart() {
    const text = currentText()
    const index = text.lastIndexOf('\n', Math.max(0, caret - 1))
    return index === -1 ? 0 : index + 1
  }

  function listEnd() {
    const text = currentText()
    const index = text.indexOf('\n', caret)
    return index === -1 ? text.length : index
  }

  function onBeforeInput(event) {
    // En mode normal le textarea ne sert qu'à montrer le curseur :
    // aucune frappe ne doit y entrer directement.
    if (editing && !insertMode) event.preventDefault()
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
        goToSlide(overviewCursor)
        mode = 'present'
      } else if (key === 'l' || key === 'j' || key === '→') {
        event.preventDefault()
        overviewMove(key === 'j' ? cols : 1)
      } else if (key === 'h' || key === 'k' || key === '←') {
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

    if (insertMode) {
      if (key === 'échap') {
        event.preventDefault()
        commitEdit()
        return
      }
      if (key === 'entrée') {
        event.preventDefault()
        applySmartNewline()
        return
      }
      if (key === 'Tab') {
        event.preventDefault()
        setDraft(`${draft.slice(0, caret)}  ${draft.slice(caret)}`, caret + 2)
        return
      }
      return // frappe native, synchronisée par oninput
    }

    if (isEditableTarget(event.target) && event.target.tagName === 'INPUT') return

    if (/^[0-9]$/.test(key)) {
      countBuf = (countBuf + key).slice(0, 3)
      return
    }

    const hadCount = countBuf !== ''
    const count = hadCount ? Number(countBuf) : 1
    countBuf = ''

    if (pendingOp) {
      const op = pendingOp
      pendingOp = null
      if (key === op) {
        applyOperator(op, 'd', 1)
        return
      }
      if (TEXT_KEYS.includes(key)) {
        applyOperator(op, key, count)
        return
      }
      showToast('mouvement non reconnu')
      return
    }

    if (TEXT_KEYS.includes(key)) {
      event.preventDefault()
      applyMotion(key, count)
      return
    }

    switch (key) {
      case 'échap':
        event.preventDefault()
        if (editing) commitEdit()
        return
      case 'j':
        event.preventDefault()
        for (let n = 0; n < count; n += 1) nextBlock()
        return
      case 'k':
        event.preventDefault()
        for (let n = 0; n < count; n += 1) prevBlock()
        return
      case 'espace':
        event.preventDefault()
        nextStep()
        return
      case 'n':
        event.preventDefault()
        goToSlide(slideIndex + count)
        return
      case 'p':
        event.preventDefault()
        goToSlide(slideIndex - count)
        return
      case 'G':
        event.preventDefault()
        goToGlobalBlock(hadCount ? count - 1 : globalBlocks().length - 1)
        return
      case 'g': {
        event.preventDefault()
        const now = Date.now()
        if (now - lastG < 620) {
          goToGlobalBlock(0)
          lastG = 0
        } else {
          lastG = now
        }
        return
      }
      case 'x':
        event.preventDefault()
        deleteChar(count)
        return
      case 'd':
        event.preventDefault()
        pendingOp = 'd'
        return
      case 'c':
        event.preventDefault()
        pendingOp = 'c'
        return
      case 'u':
        event.preventDefault()
        undo()
        return
      case 'i':
        event.preventDefault()
        startEditing(caret, true)
        return
      case 'a':
        event.preventDefault()
        startEditing(caret + 1, true)
        return
      case 'I':
        event.preventDefault()
        startEditing(listStart(), true)
        return
      case 'A':
        event.preventDefault()
        startEditing(listEnd(), true)
        return
      case 'O':
        event.preventDefault()
        newParagraph()
        return
      case '.':
        event.preventDefault()
        mode = 'black'
        return
      case 'o':
        event.preventDefault()
        overviewCursor = slideIndex
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
      case '+':
      case '=':
        event.preventDefault()
        bumpScale(0.05)
        return
      case '-':
      case '_':
        event.preventDefault()
        bumpScale(-0.05)
        return
      default:
        // En mode normal, aucune touche imprimable ne doit écrire.
        if (key.length === 1) event.preventDefault()
        return
    }
  }

</script>

<input
  type="file"
  accept=".md,.markdown,text/markdown"
  bind:this={fileInput}
  hidden
  onchange={(event) => {
    const file = event.currentTarget.files?.[0]
    if (file) loadFile(file)
    event.currentTarget.value = ''
  }}
/>

<svelte:window
  onkeydown={onKeydown}
  onbeforeinput={onBeforeInput}
  ondragover={(event) => event.preventDefault()}
  ondrop={onDrop}
/>

<div class="progress-top" style="width: {progress}%"></div>

<div class="stage" bind:this={stageEl} aria-live="polite">
  <div
    class="slide-scroll"
    class:is-centered={slide?.layout === 'center'}
    class:is-editing={editing}
  >
    {#if slide}
      {#key slideIndex}
        <SlideView
          blocks={viewBlocks}
          {activeIndex}
          {editing}
          value={draft}
          bind:textarea={textareaEl}
          oninput={(value, position) => {
            draft = value
            caret = position ?? draft.length
          }}
          oncaret={(position) => {
            if (editing) caret = position
          }}
        />
      {/key}
    {/if}
  </div>
</div>

<Chrome
  title={deck.meta.title}
  author={deck.meta.author}
  index={slideIndex}
  total={total}
  step={seg}
  steps={segmentCount}
  {elapsed}
  {running}
  mode={insertMode ? 'insertion' : editing ? 'édition' : 'present'}
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
    currentIndex={slideIndex}
    onselect={(target) => {
      goToSlide(target)
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
    <div class="panel" style="width:min(760px,94vw)">
      <div class="panel-head">
        <strong>ardoise</strong>
        <span>prise en main</span>
      </div>
      <div class="panel-body">
        <p style="margin:0 0 .4rem;color:var(--fg)">
          Un seul curseur : tu présentes et tu édites dans la même scène.
        </p>
        <div class="onboard-list">
          <div class="onboard-row">
            <span class="help-keys"><kbd>j</kbd> <kbd>k</kbd></span>
            <span>paragraphe suivant / précédent - c’est aussi le rythme des slides</span>
          </div>
          <div class="onboard-row">
            <span class="help-keys"><kbd>espace</kbd></span>
            <span>pas suivant (segment <code>&lt;!-- pause --&gt;</code>)</span>
          </div>
          <div class="onboard-row">
            <span class="help-keys"><kbd>i</kbd></span>
            <span>éditer le paragraphe sur place, <kbd>échap</kbd> le rend de nouveau</span>
          </div>
          <div class="onboard-row">
            <span class="help-keys"><kbd>w</kbd> <kbd>b</kbd> <kbd>d</kbd><kbd>w</kbd></span>
            <span>mot à mot, suppression - édition modale complète</span>
          </div>
          <div class="onboard-row">
            <span class="help-keys"><kbd>?</kbd> <kbd>:</kbd> <kbd>.</kbd></span>
            <span>aide, commandes, écran noir</span>
          </div>
        </div>
        <p style="margin:0;font-size:.78rem;color:var(--muted)">
          Glisse un fichier <code>.md</code> sur la fenêtre, ou <code>:open</code> pour l’importer.
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
    {#each deck.slides as printed (printed.index)}
      <div class="print-slide">
        <SlideView blocks={printed.blocks} activeIndex={-1} />
      </div>
    {/each}
  </div>
{/if}
