# Image Captions and `:table` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** an image alone in a paragraph renders as a `<figure>` with its alt as a small caption under the image, and `:table [CxR]` inserts an empty table skeleton at the cursor.

**Architecture:** `render.js` gains two paragraph rules that swap `<p><img></p>` for a `<figure>` and move the width from the image to the figure; `app.css` styles the caption. A new pure `src/lib/tables.js` owns the skeleton and its insertion point, mirroring `code.js`; `App.svelte` adds one palette command.

**Tech Stack:** Svelte 5, CodeMirror 6, markdown-it, plain node test scripts, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-image-captions-design.md`

## Global Constraints

- No new dependency; `html: false` stays, so no raw HTML in the deck.
- The caption is the alt text: one field, no second syntax, no title attribute.
- `![alt|NN%](url)`: the width moves to the `<figure>`, never duplicated on the `<img>`.
- An inline image (in a sentence) keeps its current rendering.
- `:table` clamps to 1-8 columns and 1-20 rows; a bad argument falls back to `2x1`.
- UI strings and docs in English.
- `npm test` and `npm run build` pass after every task; conventional commit per task.

## Review Focus

- An image with no alt must not emit an empty `<figcaption>` — Task 1 test.
- An image with a width must not end up with the width on both the figure and the img — Task 1 test.
- A paragraph of text that merely *contains* an image must stay a `<p>` — Task 1 test.
- The cursor's line in the editor still shows the markup, not the widget — existing `tests/livepreview.test.mjs` must stay green.
- `:table 0x0` or `:table foo` must not produce a broken table or a crash — Task 2 test.
- The skeleton must not glue itself to the previous line (a table needs a blank line) — Task 2 test.

---

### Task 1: Figure and caption rendering

**Files:**
- Modify: `src/lib/render.js` (paragraph rules + image rule)
- Modify: `src/lib/editor.js` (`ImageWidget`: caption under the image, width on the wrapper)
- Modify: `src/app.css` (`.slide figure`, `.slide figcaption`, `.cm-image`, `.cm-image-caption`)
- Test: `tests/render.test.mjs`

**Interfaces:**
- Consumes: `parseImageAlt(content): { alt, width }` from `src/lib/images.js`.
- Produces: HTML `<figure class="figure" [style="width:NN%"]><img …>[<figcaption>alt</figcaption>]</figure>`.

- [ ] **Step 1: Write the failing tests**

In `tests/render.test.mjs`:

```js
test('an image alone in a paragraph becomes a figure with a caption', () => {
  const html = renderMarkdown('![A cat](u.jpg)')
  assert.ok(html.startsWith('<figure class="figure">'))
  assert.ok(html.includes('<figcaption>A cat</figcaption>'))
  assert.ok(html.includes('</figure>'))
  assert.ok(!html.includes('<p>'))
})

test('the width goes on the figure, not on the image', () => {
  const html = renderMarkdown('![A cat|60%](u.jpg)')
  assert.ok(html.startsWith('<figure class="figure" style="width:60%">'))
  assert.ok(!html.includes('<img src="u.jpg" alt="A cat" loading="lazy" style='))
})

test('an image without alt has no caption', () => {
  const html = renderMarkdown('![](u.jpg)')
  assert.ok(html.includes('<figure class="figure">'))
  assert.ok(!html.includes('<figcaption'))
})

test('an image inside a sentence stays inline', () => {
  const html = renderMarkdown('see ![A cat|60%](u.jpg) here')
  assert.ok(html.startsWith('<p>'))
  assert.ok(html.includes('style="width:60%"'))
  assert.ok(!html.includes('<figure'))
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `node tests/render.test.mjs` — Expected: FAIL, no `<figure>` in the output.

- [ ] **Step 3: Implement the rules**

In `buildMarkdown()`, after the image rule:

```js
// An image alone in its paragraph is a figure, its alt is the caption.
const paragraphOpen = md.renderer.rules.paragraph_open || ((t, i, o, e, s) => s.renderToken(t, i, o))
const paragraphClose = md.renderer.rules.paragraph_close || ((t, i, o, e, s) => s.renderToken(t, i, o))

function figureImage(tokens, idx) {
  const inline = tokens[idx + 1]
  if (!inline || inline.type !== 'inline' || !inline.children) return null
  const content = inline.children.filter((t) => t.type !== 'text' || t.content.trim())
  return content.length === 1 && content[0].type === 'image' ? content[0] : null
}

md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
  const image = figureImage(tokens, idx)
  if (!image) return paragraphOpen(tokens, idx, options, env, self)
  const { alt, width } = parseImageAlt(self.renderInlineAsText(image.children, options, env))
  env.figure = alt
  return `<figure class="figure"${width ? ` style="width:${width}%"` : ''}>`
}

md.renderer.rules.paragraph_close = (tokens, idx, options, env, self) => {
  if (env.figure === undefined) return paragraphClose(tokens, idx, options, env, self)
  const alt = env.figure
  delete env.figure
  return `${alt ? `<figcaption>${md.utils.escapeHtml(alt)}</figcaption>` : ''}</figure>`
}
```

and in the image rule, skip the `style` attribute when the image is alone in its
paragraph (`env.figure !== undefined`), so the width is not duplicated:

```js
if (width && env.figure === undefined) token.attrSet('style', `width:${width}%`)
```

- [ ] **Step 4: The widget draws the caption too**

The stage is the editor, so the caption has to be in the image widget as well: in
`ImageWidget.toDOM`, put the width on the wrapper (`wrap.style.width = `${width}%``, the
image keeps `width: 100%` of it) and append a `<span class="cm-image-caption">` holding
the alt when it is not empty. CSS: `.cm-image { display: block; max-width: 100% }` and
`.cm-image-caption` styled like `.slide figcaption`.

- [ ] **Step 5: Style it**

Replace `.slide p > img:only-child` with:

```css
/* An image alone in its paragraph is a figure: the caption sits under it. */
.slide figure {
  margin: 0 0 1.3em;
}

.slide figure img {
  width: 100%;
}

.slide figcaption {
  margin-top: 0.45em;
  font-size: 0.82em;
  line-height: 1.35;
  color: var(--muted);
  text-align: center;
}
```

- [ ] **Step 6: Run the tests**

Run: `npm test` — Expected: all checks pass. Then `npm run build`.

- [ ] **Step 7: Look at it**

Seed a deck with `![A cat on a keyboard|60%](…)` plus text under it, screenshot the
stage and the overview, and check the caption is small, muted, centred under the image
and inside the image's width.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(images): render a lone image as a figure with its alt as caption"
```

### Task 2: `:table` command

**Files:**
- Create: `src/lib/tables.js`
- Modify: `src/App.svelte` (import, `insertTable`, palette entry)
- Test: `tests/tables.test.mjs`, registered in `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `tableMarkdown({ cols = 2, rows = 1 }): string`
  - `parseTableSize(argument: string): { cols: number, rows: number }`
  - `tableInsertion(source: string, at: number, { cols, rows }): { at, insert, pos }`

- [ ] **Step 1: Write the failing tests**

`tests/tables.test.mjs`, sync runner like `tests/core.test.mjs`:

```js
test('a 2x1 skeleton has a header, a delimiter and one row', () => {
  assert.equal(tableMarkdown(), '|  |  |\n|---|---|\n|  |  |')
  assert.equal(tableMarkdown({ cols: 3, rows: 2 }), '|  |  |  |\n|---|---|---|\n|  |  |  |\n|  |  |  |')
})

test('the size is cols x rows, clamped', () => {
  assert.deepEqual(parseTableSize('3x4'), { cols: 3, rows: 4 })
  assert.deepEqual(parseTableSize(''), { cols: 2, rows: 1 })
  assert.deepEqual(parseTableSize('foo'), { cols: 2, rows: 1 })
  assert.deepEqual(parseTableSize('99x99'), { cols: 8, rows: 20 })
  assert.deepEqual(parseTableSize('0x0'), { cols: 1, rows: 1 })
})

test('the table lands after the block, never glued to it', () => {
  const { at, insert, pos } = tableInsertion('one\n\ntwo', 8)
  assert.equal(at, 8)
  assert.equal(insert, '\n|  |  |\n|---|---|\n|  |  |\n')
  assert.equal('one\n\ntwo'.slice(0, at) + insert.slice(0, pos - at) + 'X', 'one\n\ntwo\n|  |  |X')
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `node tests/tables.test.mjs` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/lib/tables.js`: `tableMarkdown` builds the header, the delimiter row
(`|` + `---|` × cols) and `rows` empty rows. `parseTableSize` splits on `x`, clamps
cols to 1-8 and rows to 1-20, and falls back to `{ cols: 2, rows: 1 }` when the
argument is not `NxM`. `tableInsertion` mirrors `codeInsertion`: leading `\n\n` (or
`\n`) when the text does not already end on a blank line, trailing `\n` when the text
continues after `at`, and `pos` on the first header cell (after the first `| `).

- [ ] **Step 4: Wire the command**

In `App.svelte`, next to `insertCode`:

```js
function insertTable(argument) {
  if (!view) return
  const value = text()
  const { at, insert, pos } = tableInsertion(value, blockEnd(), parseTableSize(argument))
  view.dispatch({ changes: { from: at, insert }, selection: { anchor: pos }, scrollIntoView: true })
  place(pos)
  setMode('insert')
}
```

and in `commands`:

```js
{ id: 'table', key: 'table 3x4', label: 'insert a table (cols x rows)', run: (q) => insertTable(q.split(/\s+/)[1]) },
```

- [ ] **Step 5: Run the tests**

Run: `npm test` (add `node tests/tables.test.mjs` to the script) — Expected: pass.

- [ ] **Step 6: E2E**

`tests/e2e/tables.spec.js`: `:table` then type `a`, `Tab`-free: assert the editor holds
`| a |  |` and the slide renders a table (`th` count 2).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(tables): add :table to insert a table skeleton"
```

### Task 3: Copy and docs

**Files:**
- Modify: `src/components/ImageDialog.svelte` (field label/placeholder)
- Modify: `README.md` (syntax table, commands table, images section)
- Modify: `decks/tutor.md` if it documents `:image`/commands

- [ ] **Step 1: Rename the field** — placeholder `caption (optional)`, `aria-label="Image caption"`.
- [ ] **Step 2: Document** — README: `![caption|60%](url)` renders a figure with the
  caption under the image; `:table [3x4]` row in the commands table.
- [ ] **Step 3: Run** `npm test`, `npm run build`, and the e2e suite.
- [ ] **Step 4: Commit** `docs: caption images and :table`.
