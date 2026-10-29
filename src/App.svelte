<script>
  import { onMount, tick, untrack } from 'svelte'
  import { parseDeck, applySlideRaw, serialize, slugify, scanBlocks, cursorStart } from './lib/deck.js'
  import { normalizeKey } from './lib/keys.js'
  import { move, operatorRange, clamp } from './lib/motions.js'
  import { lineStarts, lineAt } from './lib/livepreview.js'
  import { setDocument, setReadOnly, setPending } from './lib/editor.js'
  import { undo as editorUndo } from '@codemirror/commands'
  import { storage, download } from './lib/storage.js'
  import SlideView from './components/SlideView.svelte'
  import SlideEditor from './components/SlideEditor.svelte'
  import Chrome from './components/Chrome.svelte'
  import CommandBar from './components/CommandBar.svelte'
  import HelpOverlay from './components/HelpOverlay.svelte'
  import Overview from './components/Overview.svelte'
  import starter from '../decks/starter.md?raw'
  import tutorial from '../decks/tutor.md?raw'

  const THEMES = ['ardoise', 'paper', 'gruvbox', 'nord']
  const params = new URLSearchParams(location.search)
  const TEXT_KEYS = ['h', 'l', 'w', 'b', 'e', '0', '$', '↑', '↓']

  /* ---------- state ---------- */

  let source = $state(storage.deckSource() ?? starter)
  let deck = $derived(parseDeck(source))

  let slideIndex = $state(0)
  let mode = $state('present')
  let view = $state(null)
  let docText = $state('')
  let cursor = $state(0)

  let theme = $state(THEMES.includes(params.get('theme')) ? params.get('theme') : storage.theme())
  let typeScale = $state(clamp(Number(storage.scale()) || 1, 0.8, 1.6))
  let raw = $state(params.get('raw') === '1')
  let elapsed = $state(0)
  let running = $state(false)
  let toastMsg = $state('')
  let overviewCursor = $state(0)
  let printAll = $state(false)
  let stageEl = $state(null)
  let fileInput = $state(null)

  let countBuf = ''
  let pendingOp = null
  let lastG = 0
  let writeTimer = null
  let wantedLine = 0
  let loadedKey = ''
  let docVersion = $state(0)
  let lastPending = -1

  let slide = $derived(deck.slides[slideIndex] ?? deck.slides[0] ?? null)
  let total = $derived(deck.slides.length || 1)

  /* Blocks come from the live document, never from the saved source. */
  let docBlocks = $derived(scanBlocks(docText).blocks)
  let starts = $derived(lineStarts(docText))
  let cursorLine = $derived(lineAt(starts, clamp(cursor, 0, docText.length)))

  let blockIndex = $derived.by(() => {
    let found = 0
    docBlocks.forEach((block, i) => {
      if (block.startLine <= cursorLine) found = i
    })
    return found
  })

  let seg = $derived(docBlocks[blockIndex]?.segIndex ?? 0)
  let segmentCount = $derived(
    docBlocks.length ? Math.max(...docBlocks.map((b) => b.segIndex)) + 1 : 1
  )

  let progress = $derived(
    Math.min(100, ((slideIndex + (seg + 1) / Math.max(1, segmentCount)) / total) * 100)
  )

  let toastTimer = null
  function showToast(message) {
    toastMsg = message
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toastMsg = ''), 2200)
  }

  /* ---------- persistence ---------- */

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

  let saveTimer = null
  $effect(() => {
    const value = source
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => storage.saveDeckSource(value), 400)
  })

  /* ---------- timer ---------- */

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

  /* ---------- speaker window ---------- */

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
    showToast('speaker window opened')
  }

  /* ---------- startup ---------- */

  onMount(async () => {
    const wanted = params.has('slide') ? Number(params.get('slide')) - 1 : storage.slide()
    slideIndex = clamp(Number.isFinite(wanted) ? wanted : 0, 0, total - 1)
    applyDeckTheme(deck.meta)

    if (params.get('deck')) {
      try {
        const response = await fetch(params.get('deck'))
        source = await response.text()
        slideIndex = 0
        docVersion += 1
        applyDeckTheme(deck.meta)
        showToast('deck loaded from URL')
      } catch {
        showToast('deck introuvable')
      }
    }

    setMode('present')
  })

  /* ---------- document ---------- */

  function text() {
    return view?.state.doc.toString() ?? ''
  }

  function head() {
    return view?.state.selection.main.head ?? 0
  }

  function place(position) {
    if (!view) return
    const target = clamp(position, 0, view.state.doc.length)
    view.dispatch({ selection: { anchor: target }, scrollIntoView: true })
    view.focus()
  }

  function lineOffset(line) {
    const list = lineStarts(text())
    return list[clamp(line, 0, list.length - 1)] ?? 0
  }

  function flushWrite() {
    clearTimeout(writeTimer)
    if (!view) return
    const value = view.state.doc.toString()
    if (value !== (slide?.raw ?? '') && loadedKey) {
      source = applySlideRaw(source, slideIndex, value)
      dockText(value)
    }
  }

  function dockText(value) {
    if (docText !== value) docText = value
  }

  function handleDocChange(value) {
    dockText(value)
    syncPending(head(), value)
    clearTimeout(writeTimer)
    writeTimer = setTimeout(() => {
      source = applySlideRaw(source, slideIndex, value)
    }, 300)
  }

  function handleCursor(position, value) {
    cursor = position
    dockText(value)
    syncPending(position, value)
  }

  /**
   * Dim the content that has not been revealed yet (blocks after the current
   * segment). Computed from the cursor's real position, never from derived
   * state: otherwise the dimming lags one step behind.
   */
  function syncPending(position, value) {
    if (!view) return
    const blocks = scanBlocks(value).blocks
    const total = view.state.doc.length
    if (!blocks.length) {
      if (lastPending !== total) {
        lastPending = total
        setPending(view, total)
      }
      return
    }
    const starts = lineStarts(value)
    const line = lineAt(starts, position)
    let seg = 0
    blocks.forEach((block) => {
      if (block.startLine <= line) seg = block.segIndex
    })
    const next = blocks.find((block) => block.segIndex > seg)
    const offset = next ? (starts[next.startLine] ?? total) : total
    if (offset !== lastPending) {
      lastPending = offset
      setPending(view, offset)
    }
  }

  /* Load the document on every slide change (or external reload). */
  $effect(() => {
    const currentView = view
    const currentSlide = slide
    void docVersion
    if (!currentView || !currentSlide) return

    const key = `${slideIndex}:${docVersion}`
    if (loadedKey === key) return
    loadedKey = key

    untrack(() => {
      setDocument(currentView, currentSlide.raw, {
        readonly: mode !== 'insert',
        onChange: handleDocChange,
        onCursor: handleCursor,
      })
      const raw = currentSlide.raw
      const lines = lineStarts(raw).length
      const last = wantedLine < 0
      const line = clamp(last ? lines - 1 : wantedLine, 0, lines - 1)
      wantedLine = 0
      const offset = last ? (lineStarts(raw)[line] ?? 0) : cursorStart(raw)
      place(offset)
      lastPending = -1
      syncPending(offset, currentSlide.raw)
    })
  })

  $effect(() => {
    if (!view) return
    setReadOnly(view, mode !== 'insert')
    if (mode === 'insert') view.focus()
  })

  /* Dimming is recomputed by syncPending on every cursor move. */

  /* ---------- modes ---------- */

  function setMode(next) {
    mode = next
    if (view) {
      setReadOnly(view, next !== 'insert')
      view.focus()
    }
  }

  /* ---------- navigation ---------- */

  function goToSlide(target, line = 0) {
    flushWrite()
    wantedLine = line
    const next = clamp(target, 0, total - 1)
    if (next === slideIndex) {
      place(line < 0 ? view?.state.doc.length ?? 0 : lineOffset(line))
      return
    }
    slideIndex = next
  }

  function nextBlock() {
    const next = docBlocks[blockIndex + 1]
    if (next) {
      place(lineOffset(next.startLine))
      return
    }
    if (slideIndex < total - 1) goToSlide(slideIndex + 1, 0)
  }

  function prevBlock() {
    const previous = docBlocks[blockIndex - 1]
    if (previous) {
      place(lineOffset(previous.startLine))
      return
    }
    if (slideIndex > 0) goToSlide(slideIndex - 1, -1)
  }

  function nextStep() {
    const next = docBlocks.find((b) => b.segIndex > seg)
    if (next) {
      place(lineOffset(next.startLine))
      return
    }
    if (slideIndex < total - 1) goToSlide(slideIndex + 1, 0)
  }

  function prevStep() {
    let previous = null
    docBlocks.forEach((b) => {
      if (b.segIndex < seg) previous = b
    })
    if (previous) {
      place(lineOffset(previous.startLine))
      return
    }
    if (slideIndex > 0) goToSlide(slideIndex - 1, -1)
  }

  /* ---------- modal editing ---------- */

  function applyMotion(key, count = 1) {
    const motion = key === '↑' ? 'k' : key === '↓' ? 'j' : key
    place(move(text(), head(), motion, count))
  }

  function applyOperator(op, key, count = 1) {
    const value = text()
    let from = 0
    let to = 0

    if (key === op) {
      const block = docBlocks[blockIndex]
      if (!block) return
      from = lineOffset(block.startLine)
      to = lineOffset(block.endLine) + (docText.split('\n')[block.endLine]?.length ?? 0)
    } else {
      ;[from, to] = operatorRange(value, head(), key, count)
    }

    if (to <= from) return
    view.dispatch({ changes: { from, to, insert: '' }, selection: { anchor: from } })
    place(from)
    if (op === 'c') setMode('insert')
  }

  function deleteChar(count = 1) {
    const selection = view.state.selection.main
    if (!selection.empty) {
      view.dispatch({ changes: { from: selection.from, to: selection.to, insert: '' } })
      return
    }
    const [from, to] = operatorRange(text(), head(), 'l', count)
    if (to > from) view.dispatch({ changes: { from, to, insert: '' } })
  }

  function newParagraph() {
    const block = docBlocks[blockIndex]
    const value = text()
    const offset = block ? lineOffset(block.endLine) + (value.split('\n')[block.endLine]?.length ?? 0) : value.length
    const insert = block?.kind === 'list' ? '\n\n- ' : '\n\n'
    view.dispatch({
      changes: { from: offset, insert },
      selection: { anchor: offset + insert.length },
    })
    place(offset + insert.length)
    setMode('insert')
  }

  function insertNewline() {
    const value = text()
    const position = head()
    const lineStart = value.lastIndexOf('\n', Math.max(0, position - 1)) + 1
    const line = value.slice(lineStart, position)
    const bullet = line.match(/^\s*([-*+]|\d+\.)\s/)
    const insert = bullet ? `\n${bullet[0]}` : '\n'
    view.dispatch({
      changes: { from: position, insert },
      selection: { anchor: position + insert.length },
      scrollIntoView: true,
    })
  }

  function undo() {
    if (!view) return
    // `undo` refuses to run on a read-only document (normal mode): we unlock it
    // for the duration of the transaction, leaving no window for typing.
    const locked = view.state.readOnly
    if (locked) setReadOnly(view, false)
    const done = editorUndo(view)
    if (locked && !view.state.readOnly) setReadOnly(view, true)
    if (!done) showToast('nothing to undo')
    view.focus()
  }

  /* ---------- files ---------- */

  function saveDeck() {
    flushWrite()
    const name = slugify(deck.meta.title) || 'ardoise'
    download(`${name}.md`, serialize(parseDeck(source)))
    showToast('deck exported as markdown')
  }

  async function exportPdf() {
    flushWrite()
    printAll = true
    await tick()
    await new Promise((resolve) => setTimeout(resolve, 700))
    window.print()
    setTimeout(() => (printAll = false), 1200)
  }

  function adoptDeck(value, label) {
    // A pending write from the previous deck would land on the new one.
    clearTimeout(writeTimer)
    writeTimer = null
    source = value
    slideIndex = 0
    docText = ''
    cursor = 0
    docVersion += 1
    applyDeckTheme(deck.meta)
    if (label) showToast(label)
  }

  async function loadFile(file) {
    if (!file) return
    adoptDeck(await file.text(), `deck loaded: ${file.name}`)
  }

  function openFilePicker() {
    fileInput?.click()
  }

  async function importFromUrl(url) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(String(response.status))
      adoptDeck(await response.text(), 'deck imported from URL')
    } catch {
      showToast('import failed (URL or CORS)')
    }
  }

  function onDrop(event) {
    event.preventDefault()
    const file = event.dataTransfer?.files?.[0]
    if (file) loadFile(file)
  }

  function newDeck() {
    storage.clearDeckSource()
    adoptDeck('', 'blank deck')
  }

  function openTutorial() {
    adoptDeck(tutorial, 'tutorial loaded')
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      showToast('fullscreen refused by the browser')
    }
  }

  function cycleTheme() {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
    showToast(`theme: ${theme}`)
  }

  function setTheme(name) {
    const wanted = String(name || '').trim().toLowerCase()
    if (!THEMES.includes(wanted)) {
      showToast(`themes: ${THEMES.join(', ')}`)
      return
    }
    theme = wanted
    showToast(`theme: ${wanted}`)
  }

  /* A deck may declare its theme in its header: it applies on load. */
  function applyDeckTheme(meta) {
    const fromUrl = String(params.get('theme') || '').toLowerCase()
    if (THEMES.includes(fromUrl)) {
      theme = fromUrl
      return
    }
    const fromDeck = String(meta?.theme || '').toLowerCase()
    if (THEMES.includes(fromDeck) && fromDeck !== theme) {
      theme = fromDeck
      showToast(`deck theme: ${fromDeck}`)
    }
  }

  const SCALE_MIN = 0.8
  const SCALE_MAX = 1.6

  function setScale(value) {
    if (value === undefined || value === null || value === '') {
      showToast(`size: ${Math.round(typeScale * 100)}%`)
      return
    }
    let number = Number(String(value).trim())
    if (!Number.isFinite(number)) {
      showToast('size: +10, -10, 120, reset')
      return
    }
    if (Math.abs(number) > 10) number /= 100
    typeScale = Math.round(clamp(number, SCALE_MIN, SCALE_MAX) * 100) / 100
    showToast(`size: ${Math.round(typeScale * 100)}%`)
  }

  function bumpScale(delta) {
    setScale(typeScale + delta)
  }

  /* ---------- command palette ---------- */

  let commands = $derived([
    { id: 'next', key: 'next', label: 'next paragraph', run: nextBlock },
    { id: 'prev', key: 'prev', label: 'previous paragraph', run: prevBlock },
    { id: 'step', key: 'step', label: 'next step (segment)', run: nextStep },
    { id: 'slide', key: 'slide 7', label: 'go to slide', run: (q) => goToSlide(Number(q.split(/\s+/)[1]) - 1) },
    { id: 'edit', key: 'edit', label: 'type here (insert mode)', run: () => setMode('insert') },
    { id: 'new', key: 'new', label: 'blank deck', run: newDeck },
    { id: 'paragraph', key: 'paragraph', label: 'new paragraph', run: newParagraph },
    { id: 'tutor', key: 'tutor', label: 'open the tutorial', run: openTutorial },
    { id: 'theme', key: 'theme nord', label: 'change theme', run: (q) => setTheme(q.split(/\s+/)[1] || cycleTheme()) },
    { id: 'size', key: 'size 120', label: 'text size (80-160%)', run: (q) => {
        const argument = q.split(/\s+/)[1]
        if (argument === 'reset') setScale(1)
        else if (argument) setScale(argument)
        else showToast(`size: ${Math.round(typeScale * 100)}%`)
      } },
    { id: 'overview', key: 'overview', label: 'overview', run: () => { overviewCursor = slideIndex; mode = 'overview' } },
    { id: 'presenter', key: 'presenter', label: 'speaker window', run: openPresenter },
    { id: 'timer', key: 'timer', label: 'timer start / stop', run: toggleTimer },
    { id: 'timer-reset', key: 'timer reset', label: 'reset the timer', run: resetTimer },
    { id: 'open', key: 'open', label: 'import a markdown file', run: (q) => {
        const argument = q.split(/\s+/)[1]
        if (argument) importFromUrl(argument)
        else openFilePicker()
      } },
    { id: 'save', key: 'save', label: 'download the markdown', run: saveDeck },
    { id: 'export', key: 'export', label: 'export as PDF (print)', run: exportPdf },
    { id: 'undo', key: 'undo', label: 'undo the last edit', run: undo },
    { id: 'raw', key: 'raw', label: 'hide the stage footer (OBS)', run: () => { raw = !raw; showToast(raw ? 'capture mode' : 'stage footer visible') } },
    { id: 'reset', key: 'reset', label: 'start over from a blank deck', run: newDeck },
    { id: 'help', key: 'help', label: 'keyboard help', run: () => (mode = 'help') },
  ])

  function runCommand(command, query) {
    mode = 'present'
    if (command?.run) {
      command.run(query)
      setMode('present')
      return
    }
    const trimmed = query.trim()
    if (/^\d+$/.test(trimmed)) {
      goToSlide(Number(trimmed) - 1)
      return
    }
    showToast(`unknown command: ${trimmed}`)
  }

  /* ---------- keyboard ---------- */

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

  function lineStart() {
    const value = text()
    const index = value.lastIndexOf('\n', Math.max(0, head() - 1))
    return index === -1 ? 0 : index + 1
  }

  function lineEnd() {
    const value = text()
    const index = value.indexOf('\n', head())
    return index === -1 ? value.length : index
  }

  function insertText(value) {
    if (!view) return
    const position = head()
    view.dispatch({
      changes: { from: position, insert: value },
      selection: { anchor: position + value.length },
    })
  }

  function onKeydown(event) {
    const key = normalizeKey(event)
    if (event.ctrlKey || event.metaKey || event.altKey) return

    if (mode === 'black') {
      event.preventDefault()
      setMode('present')
      return
    }

    if (mode === 'help') {
      if (key === 'esc' || key === '?' || key === 'q') {
        event.preventDefault()
        setMode('present')
      }
      return
    }

    if (mode === 'overview') {
      const cols = gridColumns()
      if (key === 'esc' || key === 'o') {
        event.preventDefault()
        setMode('present')
      } else if (key === 'enter' || key === 'espace') {
        event.preventDefault()
        goToSlide(overviewCursor)
        setMode('present')
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
      if (key === 'esc') {
        event.preventDefault()
        setMode('present')
      }
      return
    }

    if (mode === 'insert') {
      if (key === 'esc') {
        event.preventDefault()
        event.stopPropagation()
        setMode('present')
        return
      }
      if (key === 'enter') {
        event.preventDefault()
        event.stopPropagation()
        insertNewline()
        return
      }
      if (key === 'Tab') {
        event.preventDefault()
        event.stopPropagation()
        insertText('  ')
        return
      }
      return // free typing: CodeMirror handles it
    }

    // Normal mode: the keyboard is ours, CodeMirror sees nothing.
    event.stopPropagation()

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
      if (key === op || TEXT_KEYS.includes(key)) {
        // `c` switches to insert mode during this same keydown: without this,
        // the browser's default action types the motion key (cw -> "w").
        event.preventDefault()
        applyOperator(op, key, count)
        return
      }
      showToast('motion not recognised')
      return
    }

    if (TEXT_KEYS.includes(key)) {
      event.preventDefault()
      applyMotion(key, count)
      return
    }

    switch (key) {
      case 'esc':
        event.preventDefault()
        setMode('present')
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
      case 'G': {
        event.preventDefault()
        const last = docBlocks[docBlocks.length - 1]
        if (hadCount) goToSlide(count - 1)
        else if (last) place(lineOffset(last.startLine))
        return
      }
      case 'g': {
        event.preventDefault()
        const now = Date.now()
        if (now - lastG < 620) {
          place(0)
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
        place(head())
        setMode('insert')
        return
      case 'a':
        event.preventDefault()
        place(head() + 1)
        setMode('insert')
        return
      case 'I':
        event.preventDefault()
        place(lineStart())
        setMode('insert')
        return
      case 'A':
        event.preventDefault()
        place(lineEnd())
        setMode('insert')
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
  onkeydowncapture={onKeydown}
  ondragover={(event) => event.preventDefault()}
  ondrop={onDrop}
/>

<div class="progress-top" style="width: {progress}%"></div>

<div class="stage" bind:this={stageEl}>
  <div class="slide-scroll" class:is-centered={slide?.layout === 'center'}>
    <SlideEditor bind:view onChange={handleDocChange} onCursor={handleCursor} />
  </div>
</div>

<Chrome
  index={slideIndex}
  total={total}
  step={seg}
  steps={segmentCount}
  {elapsed}
  {running}
  mode={mode}
/>

<CommandBar
  open={mode === 'command'}
  {commands}
  onrun={runCommand}
  onclose={() => setMode('present')}
/>

{#if mode === 'help'}
  <HelpOverlay onclose={() => setMode('present')} />
{/if}

{#if mode === 'overview'}
  <Overview
    slides={deck.slides}
    cursor={overviewCursor}
    currentIndex={slideIndex}
    onselect={(target) => {
      goToSlide(target)
      setMode('present')
    }}
    onclose={() => setMode('present')}
  />
{/if}

{#if mode === 'black'}
  <div class="black-screen">black screen - press any key</div>
{/if}

{#if toastMsg}
  <div class="toast">{toastMsg}</div>
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
