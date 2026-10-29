# Blank start and `:tutor` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** First launch opens a blank deck with one comment hint; `:tutor` loads the tutorial; `:new` means blank deck and `:paragraph` means new paragraph.

**Architecture:** `parseDeck` gains the guarantee that a deck always has at least one slide, so an empty source is editable. App startup falls back to `decks/starter.md` with a nullish check, commands call small `newDeck`/`openTutorial` helpers built on the existing `adoptDeck`, and the onboarding overlay is deleted.

**Tech Stack:** Svelte 5, CodeMirror 6, plain node test scripts (`node tests/core.test.mjs`).

**Spec:** `docs/superpowers/specs/2026-10-29-blank-start-and-tutor-design.md`

## Global Constraints

- UI strings and docs in English.
- No new dependency.
- Autosave behaviour unchanged (400 ms debounce, `storage.saveDeckSource`).
- Conventional commits, English messages; one commit per task.
- `npm test` must pass after every task.

## Review Focus

- A deck containing only a comment must stay editable (the hint is not a block) — pinned by the test in Task 1.
- Reloading after `:new` must stay blank instead of restoring the tutorial — the startup read must use `??`, checked in Task 3.
- `:new` + Enter must run "blank deck", not "new paragraph" — strict filter keeps array order, so the `new` entry must precede `paragraph`, checked in Task 3.
- `:tutor` and `:new` must replace the visible document — `adoptDeck` already bumps `docVersion`, checked in Task 3.
- No stale `onboard` path may keep eating keys — grep check in Task 2.

---

### Task 1: A deck always has at least one slide

**Files:**
- Modify: `src/lib/deck.js:226-249` (`parseDeck`)
- Test: `tests/core.test.mjs` (after the `serialize keeps the markdown intact` test)

**Interfaces:**
- Consumes: nothing new.
- Produces: `parseDeck(source: string)` still returns `{ meta, slides, source }`; for `''` it now returns exactly one slide with `raw === ''`.

- [x] **Step 1: Write the failing tests**

```js
test('a deck made of one comment keeps its slide', () => {
  const parsed = parseDeck('<!-- i to type -->')
  assert.equal(parsed.slides.length, 1)
  assert.equal(parsed.slides[0].raw, '<!-- i to type -->')
})

test('an empty source still yields one empty slide', () => {
  const parsed = parseDeck('')
  assert.equal(parsed.slides.length, 1)
  assert.equal(parsed.slides[0].raw, '')
})

test('a trailing separator still creates no slide', () => {
  assert.equal(parseDeck('one\n\n---\n').slides.length, 1)
})
```

- [x] **Step 2: Run to verify they fail**

Run: `node tests/core.test.mjs`
Expected: FAIL on `an empty source still yields one empty slide` (`0 !== 1`); the comment test fails too because the slide is filtered out.

- [x] **Step 3: Implement in `parseDeck`**

Replace the filter predicate and add the fallback after it: keep the last slide when it has raw text (a comment counts), drop it only when truly empty; then push `parseSlide('', 0)` when no slide remains.

```js
  const slides = raws.map((raw, i) => parseSlide(raw, i)).filter((s, i) => {
    // A wholly empty slide at the end of the document is dropped; a slide with
    // only a comment (like the starter hint) is kept.
    return !(s.raw === '' && i === raws.length - 1)
  })
  if (!slides.length) slides.push(parseSlide('', 0))
```

- [x] **Step 4: Run to verify they pass**

Run: `node tests/core.test.mjs`
Expected: all checks pass.

- [x] **Step 5: Commit**

```bash
git add src/lib/deck.js tests/core.test.mjs
git commit -m "fix(deck): always keep at least one slide"
```

### Task 2: Remove the onboarding overlay

**Files:**
- Modify: `src/App.svelte` (import block, `dismissOnboarding`, `onKeydown`, template)
- Modify: `src/lib/storage.js:43-44`
- Modify: `src/app.css:899-917`
- Test: none (browser-only); grep verification below.

**Interfaces:**
- Consumes: nothing.
- Produces: no `mode === 'onboard'` path; startup still opens the tutorial deck in `present` mode (Task 3 changes the deck).

- [x] **Step 1: Delete the overlay from `src/App.svelte`**

Remove `dismissOnboarding`, the `if (mode === 'onboard') { dismissOnboarding(); return }` block in `onKeydown`, the whole `{#if mode === 'onboard'} … {/if}` block after `{#if toastMsg}`, and in `onMount` replace the `onboard` condition (the `if (!params.has('onboard') && !storage.onboarded()) … else …` lines) with `setMode('present')`.

- [x] **Step 2: Delete the flag and the styles**

Remove `onboarded` and `setOnboarded` from `src/lib/storage.js`, and the `/* ---------------- onboarding ---------------- */` section from `src/app.css` (`.onboard-list`, `.onboard-row`, `.onboard-row .help-keys`).

- [x] **Step 3: Verify nothing references it**

Run: `grep -rn "onboard" src README.md`
Expected: no output.

- [x] **Step 4: Run the tests and commit**

Run: `npm test`
Expected: 25 + 16 checks pass.

```bash
git add src/App.svelte src/lib/storage.js src/app.css
git commit -m "feat: drop the onboarding overlay"
```

### Task 3: Blank first launch, `:tutor`, `:new`, `:paragraph`

**Files:**
- Create: `decks/starter.md`
- Rename: `decks/bienvenue.md` → `decks/tutor.md`
- Modify: `src/App.svelte` (imports, `source`, `onMount`, commands, helpers)
- Modify: `README.md:32`, `README.md:107-108`, `README.md:209`

**Interfaces:**
- Consumes: `parseDeck('')` → one empty slide (Task 1); `adoptDeck(value, label)` (existing) bumps `docVersion`.
- Produces: commands `:new`, `:reset` (both `newDeck`), `:paragraph` (`newParagraph`), `:tutor` (`openTutorial`).

- [x] **Step 1: Create `decks/starter.md`**

Exact content, one line and a trailing newline:

```
<!-- i to type · ? for help · :tutor for the tour -->
```

- [x] **Step 2: Rename the tutorial and update its last slide**

Run: `git mv decks/bienvenue.md decks/tutor.md`

In that file, replace `Drop your own `.md` file on this window, or replace `decks/bienvenue.md`.` with `Drop your own `.md` file on this window, or start over with `:new`.`

- [x] **Step 3: Point startup at the starter**

In `src/App.svelte`, replace the `welcome` import with:

```js
  import starter from '../decks/starter.md?raw'
  import tutorial from '../decks/tutor.md?raw'
```

and the initial state with a nullish check (an empty saved deck is a valid deck):

```js
  let source = $state(storage.deckSource() ?? starter)
```

- [x] **Step 4: Replace `resetAll` with `newDeck` and `openTutorial`**

```js
  function newDeck() {
    storage.clearDeckSource()
    adoptDeck('', 'blank deck')
  }

  function openTutorial() {
    adoptDeck(tutorial, 'tutorial loaded')
  }
```

- [x] **Step 5: Rewire the commands**

Replace the current `{ id: 'new', key: 'new', label: 'new paragraph', run: newParagraph },` entry with these three, in this order (order matters for `:new` + Enter):

```js
    { id: 'new', key: 'new', label: 'blank deck', run: newDeck },
    { id: 'paragraph', key: 'paragraph', label: 'new paragraph', run: newParagraph },
    { id: 'tutor', key: 'tutor', label: 'open the tutorial', run: openTutorial },
```

Replace the `reset` entry with:

```js
    { id: 'reset', key: 'reset', label: 'start over from a blank deck', run: newDeck },
```

- [x] **Step 6: Update the README**

- Line 32: `The app starts on a blank deck with a one-line hint. `:tutor` opens the tutorial (`decks/tutor.md`), which also documents the format.`
- Lines 107-108: `Edits are kept in `localStorage`: you can close the tab and get your slide back.` then `:new` (or `:reset`) starts over from a blank deck; `:tutor` opens the tutorial.`
- Line 209: `:new` (or `:reset`) starts over from a blank deck. `:tutor` opens the tutorial. Nothing leaves the browser.`

- [x] **Step 7: Verify references and run the tests**

Run: `grep -rn "bienvenue\|resetAll\|welcome" src README.md decks`
Expected: no output.

Run: `npm test`
Expected: 25 + 16 checks pass.

- [x] **Step 8: Commit**

```bash
git add decks/starter.md decks/tutor.md src/App.svelte README.md
git commit -m "feat: start blank, add :tutor, free :new for a new deck"
```
