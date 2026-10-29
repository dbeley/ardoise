# ardoise

[![deploy](https://github.com/dbeley/ardoise/actions/workflows/deploy.yml/badge.svg)](https://github.com/dbeley/ardoise/actions/workflows/deploy.yml)
[![license](https://img.shields.io/github/license/dbeley/ardoise)](LICENSE)

**[Try it online](https://dbeley.github.io/ardoise/)** - nothing to install, the demo deck
loads by itself.

A **keyboard-driven** presentation stage: a markdown deck, one cursor, a command
palette and speaker notes, in a single window.

Built for videos where you **type while you talk**. Presenting and editing are not two
screens: it is the same cursor, at two granularities.

```
j k      paragraph        i        write in place        w b e    word by word
space    next step        esc      back to the cursor    .        black screen
```

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static dist/, openable anywhere
npm run preview    # serves dist/
npm test           # no browser: blocks, editing, motions, live preview
```

On NixOS: `nix develop` (Node 22 provided), then the same commands.

The app starts on a blank deck with a one-line hint. `:tutor` opens the tutorial
(`decks/tutor.md`), which also documents the format.
Drop any `.md` file on the window to present it.

## One mode

There is no reading screen and no editing screen: **the text on screen is the
document**. The cursor lives inside it, and the formatting is already applied.

- **`j` / `k`** walk down and up, **paragraph** by paragraph. In a finished
  presentation a paragraph is a step: navigation *is* the pacing of the slides.
- **`w` `b` `e` `h` `l` `0` `$`** refine down to the word and the character, with
  counts (`3w`, `2x`, `d2w`).
- **`i` `a` `A` `I` `O`** type directly into that styled text.
- **`esc`** returns to the cursor.

Markdown is not another world: the syntax (`##`, `**`, `-`, links) is **hidden
everywhere and reappears on the cursor's line**. You can fix a stray `**` without
leaving the rendered view, and closing the pair makes the bold appear immediately.

Blocks that are not inline text (code, tables, diagrams, callouts) stay as styled
source: that is the price of exactness, and the cursor can enter them like anywhere
else.

Content after a `<!-- pause -->` is **dimmed** until you reach it: still readable and
editable, but you can see how far the reveal has gone.

`u` undoes the last edit. `s` downloads the current deck.

## The keyboard

| key | gesture |
|---|---|
| `j` / `k` | next / previous paragraph |
| `space` | next step (group), then next slide |
| `n` / `p` | next / previous slide |
| `3` `G` | jump to paragraph 3 |
| `gg` / `G` | start / end of deck |
| `h` `l` | character |
| `w` `b` `e` | next word, previous word, word end |
| `0` `$` | start / end of line |
| `↑` `↓` | line inside the block |
| `i` `a` `A` `I` | type: before, after, end of line, start of line |
| `O` | new paragraph after |
| `x` | delete a character |
| `d` + motion | delete (`dw`, `de`, `d$`, `dd`) |
| `c` + motion | change (`cw`, `cc`) |
| `u` | undo |
| `esc` | back to the cursor (normal mode) |
| `.` | black screen (any key brings it back) |
| `o` | overview (`h j k l`, `enter`) |
| `t` | timer start / stop |
| `f` | fullscreen |
| `P` | speaker window |
| `s` | download the deck |
| `:` | command palette |
| `+` / `-` | text size (5% steps) |
| `?` | keyboard help |

`j`/`k` are deliberately the paragraph, not the line: that is what makes navigation
and pacing the same gesture. Inner lines are reached with `↑`/`↓`.

## Import and export

The app is a static site: your files never leave the browser, there is no account and
no server.

| gesture | effect |
|---|---|
| drop a `.md` on the window | open it |
| `:open` | pick a markdown file |
| `:open https://.../deck.md` | import from a URL (if the server allows CORS) |
| `?deck=./deck.md` | load a deck at startup |
| `s` | download the current deck as markdown |
| `:export` | PDF through the browser print dialog |

Edits are kept in `localStorage`: you can close the tab and get your slide back.
`:new` (or `:reset`) starts over from a blank deck; `:tutor` opens the tutorial.

## Deck format

```markdown
---
title: My talk
author: David
theme: ardoise
---

# Cover title

---

## A slide

- one point
<!-- pause -->
- revealed on the next step

<!-- note: to say out loud, never shown on stage -->
```

| syntax | effect |
|---|---|
| `---` alone on a line | separates two slides (ignored inside code blocks) |
| `<!-- pause -->` | reveals the rest on the next step |
| `<!-- note: ... -->` | speaker note, visible only in the `P` window |
| `<!-- layout: center -->` | centres the slide vertically |
| `::: key` ... `:::` | callout (variants: `key`, `warn`, `ok`, `note`, `quote`) |
| ```` ```mermaid ```` | diagram rendered on output |
| ```` ```nix ```` | syntax highlighting (js, ts, bash, nix, rust, python, json, yaml, css, html, go, c, diff, toml) |

Plain HTML comments are dropped from the rendering. A slide is split into **blocks**
(headings, paragraphs, lists, fences, callouts, tables): that is the unit of the
cursor and of editing.

## Speaker window

`P` opens a second window (put it on the other screen, outside the capture) showing:

- the **notes** for the current slide, in large type;
- the position, the step count, the timer, the clock;
- the title of the **next** slide.

Synchronisation goes through `BroadcastChannel`: same origin, no server, no account.
If the window opens later, it catches up on the first change.

## Recording (OBS)

- `?raw=1` hides the stage footer **and the paragraph marker**: the capture only sees
  the slide.
- Browser source, 1920x1080, on `http://localhost:5173/?raw=1`.
- `f` for fullscreen if you capture the screen rather than the browser.
- `screenkey` (or the OBS keystroke overlay) makes the shortcuts readable - that is
  what gives the "typing live" genre its legibility.

Useful URL parameters:

| parameter | effect |
|---|---|
| `?raw=1` | capture mode (no stage footer) |
| `?slide=7` | start on slide 7 |
| `?theme=paper` | force a theme |
| `?deck=/path/deck.md` | load a deck from a URL |
| `?presenter=1` | open the speaker window directly |

## Theme and text size

Four palettes: `ardoise` (default, dark), `paper` (light), `gruvbox`, `nord`.

```
:theme nord        # pick a palette
:theme             # cycle to the next
:size 120          # text size at 120%
:size +            # +5%
:size reset        # back to 100%
```

On the keyboard, `+` and `-` change the size in 5% steps (80% to 160%).

**A deck can declare its own palette** in its YAML header:

```yaml
---
title: My talk
theme: paper
---
```

It applies when the deck loads (a `?theme=` in the URL still wins). A choice made
afterwards with `:theme` is remembered for the session and beyond.

Text size only affects the stage (headings, paragraphs, code, the edited source): the
stage footer and the overlays keep their size, so they stay discreet on screen. Both
settings are kept in `localStorage`.

## What is remembered

In `localStorage`: the deck as edited, the theme, the last slide, the text size.
`:new` (or `:reset`) starts over from a blank deck. `:tutor` opens the tutorial.
Nothing leaves the browser.

## Architecture

```
src/
├── App.svelte            state, cursor, modes, keyboard, commands
├── app.css               themes, typography, blocks, editor surface
├── components/
│   ├── SlideEditor.svelte mounts the CodeMirror surface
│   ├── SlideView.svelte  list of blocks (print and thumbnails)
│   ├── BlockView.svelte  one block, rendered HTML
│   ├── Chrome.svelte     stage footer (timer, position)
│   ├── CommandBar.svelte the `:` palette
│   ├── HelpOverlay.svelte help generated from the key table
│   ├── Overview.svelte   overview (real thumbnails)
│   └── Presenter.svelte  speaker window (separate entry point)
└── lib/
    ├── deck.js           parse into blocks + edit the source by line ranges
    ├── livepreview.js    decorations: hidden markers, styled spans, dimming
    ├── editor.js         CodeMirror setup, decorations, read-only compartment
    ├── motions.js        motions (w, b, e, 0, $, up/down) and operators (d, c)
    ├── render.js         markdown-it + highlight.js + mermaid
    ├── keys.js           single key table (help included)
    └── storage.js        local persistence

tests/                    node-only checks for the core and the live preview
```

Two principles hold it together:

1. **the `KEYMAP` table** in `lib/keys.js` feeds both the event handler and the `?`
   help: the help cannot lie about behaviour;
2. **editing replaces lines**: every block knows its range in the markdown, so an edit
   never rewrites the file - notes and pauses stay intact.

## Known limits

- **No backend**: the "terminal" is a command palette, not a real shell. A real pty
  would need a server; here everything is static and offline.
- **PDF**: `:export` goes through the browser print dialog ("Save as PDF"), every slide
  unfolded, one per page.
- **Mermaid** is loaded on demand (about 1 MB) and only when a diagram exists.
- **The speaker window** can be blocked by a pop-up blocker: allow the site.
- **The editor is CodeMirror 6** (about 90 kB gzipped): that is what makes selection,
  IME and undo reliable. The stage and the PDF do not use the same renderer, so a
  detail can differ between the two.
- **No rich rendering of blocks** (code, tables, diagrams): they show as styled source
  while editing.
- **No visual selection** (`v`), no internal clipboard (`y`/`p`).
- **No multi-screen sync** beyond the notes: a single stage drives everything.

## License

MIT.
