# Image Search and Insertion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `:image` searches Openverse and inserts `![alt|NN%](url)` at the current block, rendered live in the editor and in the exported views, with a width preview in the dialog.

**Architecture:** A pure `images.js` module owns the markup and the search client. `render.js` gains one image rule, `livepreview.js`/`editor.js` gain a CodeMirror widget, and `ImageDialog.svelte` is the only UI surface. `App.svelte` wires the command, the insertion point and the mode.

**Tech Stack:** Svelte 5, CodeMirror 6, markdown-it, plain node test scripts.

**Spec:** `docs/superpowers/specs/2026-10-29-image-search-design.md`

## Global Constraints

- Hotlink only: no upload, no embedded copy, no proxy.
- Markup: `![alt|NN%](url)`; no title, no caption, no credit line. `NN` is 25-100.
- No default width suffix when the width is 100.
- Search: Openverse only, anonymous, CORS is open; 20 requests/min and 200/day.
- UI strings and docs in English.
- No new dependency.
- `npm test` and `npm run build` must pass after every task.
- Conventional commits, English; one commit per task.

## Review Focus

- A broken or slow image URL must not break the editor or the presentation — image rule (Task 3) and widget error path (Task 4).
- A search burst must stay under 20/min — debounce plus cache (Task 2 and Task 5).
- The dialog preview must match the slide width — percentage of a 16:9 pane (Task 5).
- The cursor's line keeps the markup, not the widget — widget descriptor test (Task 4).
- Motions and `dd` on a line that contains a widget elsewhere — existing motion tests plus widget sizing (Task 4).
- Only the query leaves the browser — search client sends nothing else (Task 2).
- Only `![alt|NN%](url)` is inserted — markup helper test (Task 1) and insertion (Task 6).

---

### Task 1: Image markup helpers

**Files:**
- Create: `src/lib/images.js`
- Test: `tests/images.test.mjs`, registered in `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `parseWidth(value: string): number | null` (25-100)
  - `parseImageAlt(content: string): { alt: string, width: number | null }`
  - `parseImageLine(line: string): { alt: string, src: string, width: number | null } | null`
  - `imageMarkdown({ alt?: string, src: string, width?: number | null }): string`

- [ ] **Step 1: Write the failing test**

Create `tests/images.test.mjs` with a sync runner like `tests/core.test.mjs`, then:

```js
test('a width is a percentage between 25 and 100', () => {
  assert.equal(parseWidth('60%'), 60)
  assert.equal(parseWidth('25%'), 25)
  assert.equal(parseWidth('100%'), 100)
  assert.equal(parseWidth('24%'), null)
  assert.equal(parseWidth('101%'), null)
  assert.equal(parseWidth('60'), null)
})

test('alt and width split on the last bar', () => {
  assert.deepEqual(parseImageAlt('A cat|60%'), { alt: 'A cat', width: 60 })
  assert.deepEqual(parseImageAlt('A cat'), { alt: 'A cat', width: null })
  assert.deepEqual(parseImageAlt('a|b|60%'), { alt: 'a|b', width: 60 })
  assert.deepEqual(parseImageAlt('a|b'), { alt: 'a|b', width: null })
})

test('an image line is parsed', () => {
  assert.deepEqual(parseImageLine('![A cat|60%](https://x/y.jpg)'), {
    alt: 'A cat',
    src: 'https://x/y.jpg',
    width: 60,
  })
  assert.deepEqual(parseImageLine('![](x.jpg)'), { alt: '', src: 'x.jpg', width: null })
  assert.equal(parseImageLine('text ![a](b)'), null)
  assert.equal(parseImageLine(''), null)
})

test('markdown keeps the width only when it is not 100', () => {
  assert.equal(imageMarkdown({ alt: 'A cat', src: 'u', width: 60 }), '![A cat|60%](u)')
  assert.equal(imageMarkdown({ alt: 'A cat', src: 'u', width: 100 }), '![A cat](u)')
  assert.equal(imageMarkdown({ alt: '', src: 'u' }), '![](u)')
})
```

Add `node tests/images.test.mjs` to the `test` script.

- [ ] **Step 2: Run to verify it fails**

Run: `node tests/images.test.mjs`
Expected: FAIL, module `../src/lib/images.js` not found.

- [ ] **Step 3: Implement the helpers in `src/lib/images.js`**

`parseImageLine` matches a whole trimmed line with `/^!\[([^\]]*)\]\((\S+)\)$/` and delegates the alt to `parseImageAlt`. `parseImageAlt` splits at the last `|` and only accepts a valid `parseWidth`. `imageMarkdown` appends `|NN%` when `width` is a valid percentage below 100.

- [ ] **Step 4: Run to verify it passes**

Run: `node tests/images.test.mjs`
Expected: 4 checks pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/images.js tests/images.test.mjs package.json
git commit -m "feat(image): add the image markup helpers"
```

### Task 2: Openverse search client

**Files:**
- Modify: `src/lib/images.js`
- Test: `tests/images.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `normalizeResult(result: object): { id, title, src, thumbnail, width, height, creator, license, licenseVersion, landing }`
  - `searchImages(query: string, { fetchImpl?: typeof fetch, signal?: AbortSignal } = {}): Promise<Result[]>`
  - Errors carry `kind: 'rate-limit' | 'unavailable'`.

- [ ] **Step 1: Write the failing tests**

The file's runner must await async tests; make `test` async and await each call:

```js
const test = async (name, fn) => {
  try {
    await fn()
    passed += 1
    console.log(`  ok   ${name}`)
  } catch (error) {
    console.log(`  FAIL ${name}\n       ${error.message}`)
    process.exitCode = 1
  }
}
```

Add:

```js
const payload = {
  results: [
    {
      id: '1', title: 'A cat', url: 'https://x/y.jpg', thumbnail: 'https://x/t.jpg',
      creator: 'Jane', license: 'by', license_version: '4.0',
      foreign_landing_url: 'https://x/page', width: 800, height: 600,
    },
  ],
}
const fakeFetch = (status = 200, body = payload) => {
  let calls = 0
  const impl = async () => {
    calls += 1
    return { ok: status < 400, status, json: async () => body }
  }
  impl.calls = () => calls
  return impl
}

await test('results are normalised', async () => {
  const [result] = await searchImages('cat', { fetchImpl: fakeFetch() })
  assert.equal(result.title, 'A cat')
  assert.equal(result.src, 'https://x/y.jpg')
  assert.equal(result.width, 800)
  assert.equal(result.license, 'BY')
})

await test('a one-letter query does not search', async () => {
  const impl = fakeFetch()
  assert.deepEqual(await searchImages('c', { fetchImpl: impl }), [])
  assert.equal(impl.calls(), 0)
})

await test('a query is cached', async () => {
  const impl = fakeFetch()
  const query = `cached-${Math.random()}`
  await searchImages(query, { fetchImpl: impl })
  await searchImages(query, { fetchImpl: impl })
  assert.equal(impl.calls(), 1)
})

await test('a 429 is a rate limit', async () => {
  await assert.rejects(
    () => searchImages(`limited-${Math.random()}`, { fetchImpl: fakeFetch(429, {}) }),
    (error) => error.kind === 'rate-limit'
  )
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `node tests/images.test.mjs`
Expected: FAIL, `searchImages` not exported.

- [ ] **Step 3: Implement the client**

GET `https://api.openverse.org/v1/images/?q=<query>&page_size=20&mature=false`, `Accept: application/json`.
`normalizeResult` fills every field as a string or number, title falls back to `'Untitled'`, license is uppercased, thumbnail falls back to `src`.
Cache successful results in a module-level `Map` keyed by the trimmed lowercase query, capped at 50 entries (delete the oldest when full). Never cache errors. `!response.ok` throws an `Error` whose `kind` is `'rate-limit'` for 429 and `'unavailable'` otherwise; network failures become `'unavailable'` too.

- [ ] **Step 4: Run to verify they pass**

Run: `node tests/images.test.mjs`
Expected: 8 checks pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/images.js tests/images.test.mjs
git commit -m "feat(image): search Openverse from the browser"
```

### Task 3: Render the width in the exported views

**Files:**
- Modify: `src/lib/render.js`
- Test: create `tests/render.test.mjs`, registered in `package.json`

**Interfaces:**
- Consumes: `parseImageAlt` (Task 1).
- Produces: `renderMarkdown` keeps its signature; image markup renders as `<img alt style="width:NN%" loading="lazy">`.

- [ ] **Step 1: Write the failing test**

```js
test('an image keeps its width and drops the suffix from alt', () => {
  const html = renderMarkdown('![A cat|60%](https://x/y.jpg)')
  assert.ok(html.includes('src="https://x/y.jpg"'))
  assert.ok(html.includes('alt="A cat"'))
  assert.ok(html.includes('style="width:60%"'))
  assert.ok(html.includes('loading="lazy"'))
})

test('an image without a width has no style', () => {
  const html = renderMarkdown('![A cat](u.jpg)')
  assert.ok(html.includes('alt="A cat"'))
  assert.ok(!html.includes('width:'))
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tests/render.test.mjs`
Expected: FAIL, `width:60%` missing.

- [ ] **Step 3: Add the rule in `buildMarkdown`**

Override `md.renderer.rules.image`: read the alt with `self.renderInlineAsText(token.children, options, env)`, split it with `parseImageAlt`, `attrSet('alt', alt)`, `attrSet('loading', 'lazy')`, and `attrSet('style', 'width:NN%')` only when a width exists; then `self.renderToken(...)`.

- [ ] **Step 4: Run to verify it passes**

Run: `node tests/render.test.mjs`
Expected: 2 checks pass. Also run `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/render.js tests/render.test.mjs package.json
git commit -m "feat(image): render the width in the exported views"
```

### Task 4: Show images in the live editor

**Files:**
- Modify: `src/lib/livepreview.js`, `src/lib/editor.js`, `src/app.css`
- Test: `tests/livepreview.test.mjs`

**Interfaces:**
- Consumes: `parseImageLine` (Task 1).
- Produces: a replace descriptor may carry `widget: { type: 'image', src, alt, width }`; `editor.js` renders it as an `<img class="cm-image">` with `max-width:100%`.

- [ ] **Step 1: Write the failing tests** in `tests/livepreview.test.mjs`

```js
test('an image line becomes a widget away from the cursor', () => {
  const text = '![A cat|60%](https://x/y.jpg)\n\ntext'
  const idle = buildDecorations(text, [{ from: text.length, to: text.length }])
  const widget = idle.replaces.find((replace) => replace.widget)
  assert.deepEqual(widget.widget, { type: 'image', src: 'https://x/y.jpg', alt: 'A cat', width: 60 })
})

test('the cursor line keeps the image markup', () => {
  const text = '![A cat|60%](https://x/y.jpg)\n\ntext'
  const active = buildDecorations(text, [{ from: 2, to: 2 }])
  assert.equal(active.replaces.some((replace) => replace.widget), false)
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `node tests/livepreview.test.mjs`
Expected: FAIL, no `widget` on the replacements.

- [ ] **Step 3: Implement**

In `livepreview.js`, after the comment/box checks: if `!isActive` and `parseImageLine(line)` returns a result, push `replaces.push({ from: start, to: end, widget: { type: 'image', ...image } })`, push a `cm-image-line` line decoration, and `continue` (skip inline parsing on that line). If the line is active, do not push the widget.

In `editor.js`, import `WidgetType`; map a replace with `widget` to `Decoration.replace({ widget: new ImageWidget(replace.widget) })`. `ImageWidget` sets `src`, `alt`, `style.width` when present, `loading="lazy"`, and on `error` replaces itself with a muted `alt` text. `eq` compares src/alt/width; `ignoreEvent()` returns true.

In `app.css`, add `.cm-image img { max-width: 100%; display: block; border-radius: 4px; }` and `.cm-image.is-broken { color: var(--muted); font-style: italic; }`.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test` then `npm run build`.
Expected: all checks pass, build green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/livepreview.js src/lib/editor.js src/app.css tests/livepreview.test.mjs
git commit -m "feat(image): render images in the live editor"
```

### Task 5: Search dialog with a live width preview

**Files:**
- Create: `src/components/ImageDialog.svelte`
- Modify: `src/app.css`
- Test: none (browser-only); verification below.

**Interfaces:**
- Consumes: `searchImages` (Task 2).
- Produces: `<ImageDialog open oninsert onclose />`; `oninsert({ alt, src, width })`.

- [ ] **Step 1: Build the component**

Props `{ open = false, oninsert, onclose }`. State: `query`, `results`, `index`, `width = 100`, `error = ''`, `loading = false`.
A 500 ms debounced `$effect` on `query` calls `searchImages(query, { signal })` when the trimmed query has at least 2 characters, aborts the previous request, ignores stale responses (compare the query that started the request), and clears `error` on success.
Keyboard in the search input: `Escape` closes; `ArrowDown`/`ArrowUp` move the selection by 4 (the grid has 4 columns), clamped; `Enter` inserts the selected result when there is one. The input keeps `ArrowLeft`/`ArrowRight` for the caret.
Layout: overlay + panel (reuse `.overlay`/`.panel`), search input on top; below it a two-column area: a 4-column thumbnail grid (16:9, `object-fit: cover`, selected item outlined in `var(--accent)`) and a preview pane with `aspect-ratio: 16/9`, centered image at `style="width:{width}%"`, updating with the selection and the slider. Below: `<input type="range" min="25" max="100" step="5">` and the percentage; footer shows title, creator and license of the selection and "Search by Openverse".
`error` shows `image search unavailable` or `Openverse rate limit reached, try again in a minute` in the panel; no toast.
`oninsert` sends `{ alt: result.title, src: result.src, width }` then closes.

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: green, no Svelte error.

- [ ] **Step 3: Commit**

```bash
git add src/components/ImageDialog.svelte src/app.css
git commit -m "feat(image): add the search dialog with a width preview"
```

### Task 6: Wire `:image` and insert the markup

**Files:**
- Modify: `src/App.svelte`, `README.md`, `CONTRIBUTING.md`
- Test: none (browser-only); verification below.

**Interfaces:**
- Consumes: `imageMarkdown` (Task 1), `ImageDialog` (Task 5).
- Produces: the `image` palette command and mode `image`.

- [ ] **Step 1: Add the command and the mode**

- command `{ id: 'image', key: 'image', label: 'insert an image from the web', run: openImage }` where `openImage` sets `mode = 'image'`;
- in `runCommand`, after `command.run(query)`, call `setMode('present')` only when the mode is still `'present'` (so a command that opens a mode is not closed);
- in `onKeydown`, return early for `mode === 'image'` (the dialog owns the keyboard);
- render `<ImageDialog open={mode === 'image'} oninsert={insertImage} onclose={() => setMode('present')} />`.

- [ ] **Step 2: Insert at the right place**

`insertImage({ alt, src, width })`:
- `block = docBlocks[blockIndex]`, `markup = imageMarkdown({ alt, src, width })`;
- with a block: insert `\n\n${markup}\n` at the end of the block's last line;
- without a block (empty deck): insert `${markup}\n` at `head()`;
- dispatch the change with the selection at the end, `place` there (the empty line after the image), then `setMode('present')`.
- The trailing `\n` is what lets the widget render immediately (the cursor is on the next line).

- [ ] **Step 3: Update the docs**

- `README.md`: add `:image` to the files/commands table and a short **Images** section: `![alt|60%](url)`, `|NN%` optional, Openverse search, network needed, hotlinks.
- `CONTRIBUTING.md`: replace the "any third-party service" line of the **Scope** section with: the core stays static and offline; network features (image search) are optional and must degrade gracefully.

- [ ] **Step 4: Verify**

Run: `npm test`, `npm run build`.
Expected: green.
With `npm run dev` in a browser: `:image`, search "cat", change the width, insert; check the image in the editor (cursor elsewhere), in the overview, and after `s` the downloaded markdown contains `![…|…%](…)`; `:new` then `i` still types normally.

- [ ] **Step 5: Commit**

```bash
git add src/App.svelte README.md CONTRIBUTING.md
git commit -m "feat: add :image with Openverse search"
```
