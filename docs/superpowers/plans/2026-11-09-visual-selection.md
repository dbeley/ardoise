# Visual Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `v` and `V` select characters or whole lines, motions extend the selection, and `d`/`x`/`y`/`c`/`p` act on it.

**Architecture:** `src/lib/visual.js` (pure) turns a selection into the range an operator removes and the text the register keeps, reusing `lineRange`/`lineDeleteRange` from `deck.js`. `App.svelte` gains a `visual` mode, a `goTo()` that extends instead of collapsing, and one branch in the key handler; the selection itself is CodeMirror's.

**Tech Stack:** Svelte 5, CodeMirror 6, plain node tests, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-visual-selection-design.md`

## Global Constraints

- No new dependency; the highlight is CodeMirror's `drawSelection`.
- The document is untouched until an operator runs.
- Whole lines take their newline; the register keeps the lines without it.
- A selection never crosses a slide.
- `npm test` and `npm run build` pass after every task; one conventional commit per task.

## Review Focus

- `V` on the first lines of a paragraph must not leave a blank line behind — Task 1 test.
- A backwards selection (`o`, or extending left) must delete the same range — Task 1 test.
- `c` must land in insert mode at the selection's start, with nothing left selected — Task 3 e2e.
- `esc` must keep the text and leave the mode — Task 3 e2e.
- `j` at the last line of the slide must not change slide while selecting — Task 3 e2e.

---

### Task 1: The range, pure

**Files:**
- Create: `src/lib/visual.js`
- Modify: `src/lib/deck.js` (`lineDeleteRange`: a selection that starts a block but ends before it)
- Test: `tests/visual.test.mjs`, registered in `package.json`; `tests/core.test.mjs`

**Interfaces:**
- Produces: `visualRange(raw, { from, to }, { linewise, blocks }) → { from, to, keptFrom, keptTo, linewise }`.

- [ ] **Step 1: Write the failing tests** — character range taken as is; line range takes
  whole lines and their newline; a range ending on a line start takes that line; the last
  line has no newline; a whole block takes its separator; a backwards selection is
  normalised; an empty selection keeps nothing.
- [ ] **Step 2: Run** `node tests/visual.test.mjs` — Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `visualRange` on `lineStarts`/`lineAt` (livepreview.js) and
  `lineRange`/`lineDeleteRange` (deck.js).
- [ ] **Step 4: Fix `lineDeleteRange`** — the early return must also fire when the block
  keeps lines *after* the selection (`range.last < owner.endLine`), or `dd` on the first
  line of a paragraph leaves a blank line. Add the `core.test.mjs` test.
- [ ] **Step 5: Run** `npm test` — Expected: pass.
- [ ] **Step 6: Commit** `feat(visual): compute the range a selection covers`.

### Task 2: The mode

**Files:**
- Modify: `src/App.svelte`, `src/lib/keys.js` (help), `README.md`
- Test: `tests/e2e/visual.spec.js`

**Interfaces:**
- Consumes: `visualRange`.
- Produces: `mode === 'visual'`, `startVisual(linewise)`, `stopVisual(at)`, `goTo(pos)`.

- [ ] **Step 1: Write the failing e2e tests** — `v` + `2l` + `d`; `V` + `j` + `d` keeps
  `three`; `y` then `p` over another selection; `c` + typing; `esc` keeps the text; `o`
  swaps the ends; `j` at the last line stays on the slide.
- [ ] **Step 2: Run** them — Expected: FAIL, nothing selected.
- [ ] **Step 3: Implement** — `visualLine` state, `goTo` used by every motion,
  `startVisual`/`stopVisual`, `applyVisual`, `pasteOverSelection`, the key branch that
  lets motions through and handles the rest, `case 'v'`/`case 'V'`, and the slide guards
  in `nextLine`/`prevLine`/`nextBlock`/`prevBlock`.
- [ ] **Step 4: Run** `npm test`, `npx playwright test`, `npm run build`.
- [ ] **Step 5: Commit** `feat(visual): v and V select, d/y/c/p act on the selection`.
