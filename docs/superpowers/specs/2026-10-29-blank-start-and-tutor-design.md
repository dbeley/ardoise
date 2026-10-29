# Blank start and `:tutor` — design

Small change. Chosen approach: the hint lives in the deck as an HTML comment
(option 2 of the conversation), not as a UI overlay.

## Intent

Ardoise should open on a blank page the first time instead of the tutorial.
The tutorial becomes an explicit command, and `:new` is freed for "new deck"
(it currently means "new paragraph").

## Behaviour

- **First launch** (nothing saved in `localStorage`): a one-line starter deck,
  an HTML comment hint:
  `<!-- i to type · ? for help · :tutor for the tour -->`.
  It is part of the file: visible in muted style, deletable like any line.
- **Later launches**: the saved deck is restored, as today.
- **`:new`** (and **`:reset`**) start a strictly empty deck: 0 byte, one empty
  slide, nothing on stage.
- **`:paragraph`** replaces the old `:new`: new paragraph after the current
  block.
- **`:tutor`** loads `decks/tutor.md` in place of the current deck, like
  today's `:reset`; no confirmation.
- The onboarding overlay, its storage flag, its `?onboard` parameter and its CSS
  are removed. The hint and `:tutor` replace them.
- UI language stays English.

## Constraints and edge cases

- `parseDeck` drops a wholly empty trailing slide. A deck with no slides at all
  must keep one empty slide, otherwise `:new` (and deleting all text) leaves the
  app with no editable document.
- A comment-only slide must be kept: the filter tests the slide's raw text, not
  its blocks (comments are not blocks).
- An empty saved deck must survive a reload: read the saved source with `??`,
  not `||`, so `''` is a valid deck.

## Files

- `decks/starter.md` (new), `decks/tutor.md` (renamed from `bienvenue.md`)
- `src/App.svelte`: starter import, `newDeck`, `:tutor`, command renames,
  onboarding removal
- `src/lib/deck.js`: keep one empty slide, keep comment-only slides
- `src/lib/storage.js`: drop the `onboarded` flag
- `src/app.css`: drop the onboarding styles
- `tests/core.test.mjs`: `parseDeck` cases for empty and comment-only sources
- `README.md`: startup, commands, `:reset`, file tree

## Non-goals

- No confirmation dialog when `:tutor` replaces the current deck.
- No recent-decks list.
- No change to autosave timing.

## Calls made by the builder

- Hint in English, as an HTML comment (the app's UI is English).
- `:reset` becomes an alias of `:new` (blank deck), matching its "start over"
  intent now that the tutorial is `:tutor`.
- Rename `decks/bienvenue.md` to `decks/tutor.md` so the file matches the
  command.
