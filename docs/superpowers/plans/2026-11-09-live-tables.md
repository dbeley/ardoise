# Live Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a table run on the stage is drawn as a real table whenever the cursor is not inside it, and shows its markdown source when it is.

**Architecture:** `livepreview.js` (pure) detects a table run and emits one `block: true` replace descriptor carrying the run's text; `editor.js` turns it into a CodeMirror block widget that renders the table through `renderMarkdown`, with the `slide` class so the existing table CSS applies. Pending dimming moves from line decorations to a class on the widget for the replaced lines.

**Tech Stack:** Svelte 5, CodeMirror 6, markdown-it, plain node tests, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-live-tables-design.md`

## Global Constraints

- No new dependency; the widget uses `renderMarkdown` from `src/lib/render.js`.
- The document is never modified by decorations.
- A run without a delimiter row is not a table: it keeps the source view.
- The cursor's table keeps its markdown; every other table is drawn.
- `npm test` and `npm run build` pass after every task; one conventional commit per task.

## Review Focus

- A `<!-- pause -->` before a table must not throw "overlapping ranges" — Task 2 test.
- Clicking a drawn table must put the cursor inside it (source back) — Task 3 e2e test.
- A malformed run (`| a | b |` with no `|---|` line) must stay source, not become a
  broken widget — Task 1 test.
- A table at the very end of a slide must not swallow the last newline or break the
  cursor — Task 1 test on the `to` offset.
- The table inside a fence stays code, never a widget — Task 1 test.

---

### Task 1: Detect a table run in the pure layer

**Files:**
- Modify: `src/lib/livepreview.js`
- Test: `tests/livepreview.test.mjs`

**Interfaces:**
- Produces: `replaces` entries shaped `{ from, to, block: true, widget: { type: 'table', text } }`,
  and the helper `isDelimiterRow(line): boolean` (exported for the tests).

- [ ] **Step 1: Write the failing tests**

```js
const table = '| a | b |\n|---|---|\n| 1 | 2 |'
test('a table away from the cursor becomes one block widget', () => {
  const text = `# T\n\n${table}\n\nrest`
  const result = buildDecorations(text, [{ from: 0, to: 0 }])
  const widget = result.replaces.find((r) => r.widget?.type === 'table')
  assert.ok(widget)
  assert.equal(widget.block, true)
  assert.equal(widget.widget.text, table)
  // The whole run, no trailing newline.
  assert.equal(widget.from, text.indexOf('| a'))
  assert.equal(widget.to, text.indexOf('\n\nrest'))
  assert.ok(!result.lines.some((l) => l.className === 'cm-table'))
})

test('the cursor inside the table keeps its markdown', () => {
  const text = `# T\n\n${table}\n\nrest`
  const at = text.indexOf('| 1 |')
  const result = buildDecorations(text, [{ from: at, to: at }])
  assert.ok(!result.replaces.some((r) => r.widget?.type === 'table'))
  assert.equal(result.lines.filter((l) => l.className === 'cm-table').length, 3)
})

test('a run without a delimiter row is not a table', () => {
  const text = '| a | b |\n| 1 | 2 |'
  const result = buildDecorations(text, [{ from: 0, to: 0 }])
  assert.ok(!result.replaces.some((r) => r.widget?.type === 'table'))
})

test('a pipe line inside a fence stays code', () => {
  const text = '```\n| a | b |\n|---|---|\n```'
  const result = buildDecorations(text, [{ from: 0, to: 0 }])
  assert.ok(!result.replaces.some((r) => r.widget?.type === 'table'))
})
```

- [ ] **Step 2: Run to verify they fail** — `node tests/livepreview.test.mjs`

- [ ] **Step 3: Implement** — in the `buildDecorations` loop, before the inline parsing:
  when a line starts with `|`, walk forward to the end of the run; if the run has at least
  two lines and `isDelimiterRow(run[1])`, either emit the block replace (no line of the
  run active) or the `cm-table` line classes (a line active). Set `index = end` and
  `continue`.

- [ ] **Step 4: Run** `npm test` — Expected: pass.

- [ ] **Step 5: Commit** `feat(tables): detect a table run and describe it as one block`

### Task 2: Draw it in the editor

**Files:**
- Modify: `src/lib/editor.js` (`TableWidget`, block decoration, pending dimming)
- Modify: `src/app.css` (`.cm-table-widget`)
- Test: `tests/e2e/tables.spec.js`

**Interfaces:**
- Consumes: the `{ block: true, widget: { type: 'table', text } }` descriptor.
- Produces: a `.cm-table-widget` element containing `renderMarkdown(text)`.

- [ ] **Step 1: Write the failing e2e test**

```js
test('a table is drawn on the stage, and its markdown comes back on the cursor', async ({ page }) => {
  await openDeck(page, '# T\n\n| a | b |\n|---|---|\n| 1 | 2 |\n')
  await expect(page.locator('.cm-table-widget table')).toBeVisible()
  await expect(page.locator('.cm-table-widget th')).toHaveCount(2)
  await page.keyboard.press('}') // into the table block
  await expect(page.locator('.cm-table-widget')).toHaveCount(0)
  await expect(content(page)).toContainText('|---|---|')
})

test('a table after a pause is drawn, dimmed, without breaking', async ({ page }) => {
  await openDeck(page, '# T\n\n<!-- pause -->\n\n| a | b |\n|---|---|\n| 1 | 2 |\n')
  await expect(page.locator('.cm-table-widget.cm-pending')).toHaveCount(1)
})
```

- [ ] **Step 2: Run to verify they fail**

- [ ] **Step 3: Implement** — `TableWidget` (an `eq` on the text, `toDOM` returning
  `<div class="cm-table-widget slide cm-pending?">` filled with `renderMarkdown(text)`,
  `ignoreEvent()` returning `false`); in the decoration loop use
  `Decoration.replace({ widget, block: true })` for `replace.block`, pass the dim flag,
  and skip `cm-pending` line decorations for positions inside a block replace range.

- [ ] **Step 4: Style** — `.cm-table-widget { margin: 0.6em 0 }`, `.cm-table-widget
  .table-wrap { margin: 0 }`, and the dim class (`.cm-pending` opacity) on the widget.

- [ ] **Step 5: Run** `npm test`, `npx playwright test`, `npm run build`.

- [ ] **Step 6: Commit** `feat(tables): draw tables on the stage`

### Task 3: Docs

- [ ] **Step 1**: README — the tables line says a table is drawn on the stage and shows its
  source on the cursor's lines; the help overlay's syntax list gets the table row.
- [ ] **Step 2**: `npm test`, `npx playwright test`, `npm run build`.
- [ ] **Step 3: Commit** `docs: tables are drawn on the stage`.
