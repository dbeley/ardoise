# ardoise

[![deploy](https://github.com/dbeley/ardoise/actions/workflows/deploy.yml/badge.svg)](https://github.com/dbeley/ardoise/actions/workflows/deploy.yml)
[![license](https://img.shields.io/github/license/dbeley/ardoise)](LICENSE)

**[Try it online](https://dbeley.github.io/ardoise/)** - nothing to install.

A keyboard-driven, **modal** presentation stage. The deck is a plain markdown file:
edit it live, with Vim keybindings, while you present. Speaker notes open in a second
window.

```
j k       paragraph        i        insert          esc   normal mode
space     next step        d w      delete word     :     commands
```

## Modal editing

Ardoise is modal, like Vim:

- **normal mode**: keys are commands (motions, operators, stage controls);
- **insert mode** (`i`, `a`, `A`, `I`, `O`): keys type into the text, still rendered;
- **`esc`** always brings you back to normal mode.

Markdown stays the source. The syntax (`##`, `**`, `-`, links) is hidden outside the
cursor's line and reappears when you edit it. Code, tables and diagrams stay visible as
styled source: the cursor enters them like any other block.

| key | gesture |
|---|---|
| `j` / `k` | next / previous paragraph |
| `space` | next step, then next slide |
| `n` / `p` | next / previous slide |
| `h` `l` | character |
| `w` `b` `e` | next word, previous word, word end |
| `0` `$` | start / end of line |
| `↑` `↓` | line inside the block |
| `gg` / `G` | first / last paragraph of the slide |
| `3` `G` | go to slide 3 |
| `i` `a` `A` `I` | insert: before, after, end of line, start of line |
| `O` | new paragraph after the current block |
| `x` | delete a character |
| `d` + motion | delete (`dw`, `de`, `d0`, `d$`) |
| `d` `d` | delete the whole block |
| `c` + motion | change (`cw`, `cc`) |
| `u` | undo |
| `esc` | back to normal mode |
| `.` | black screen |
| `o` | overview |
| `t` | timer start / stop |
| `f` | fullscreen |
| `P` | speaker window |
| `s` | download the deck |
| `:` | command palette |
| `+` / `-` | text size |
| `?` | keyboard help |

Counts work on motions and operators: `3w`, `2x`, `d2w`.

## The deck is markdown

A deck is one markdown file. Frontmatter is optional; `---` starts a new slide; a
`<!-- pause -->` splits a slide into steps.

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

<!-- note: said out loud, never shown on stage -->
```

| syntax | effect |
|---|---|
| `---` alone on a line | new slide (ignored inside code blocks) |
| `<!-- pause -->` | reveal the rest on the next step, dimmed until then |
| `<!-- note: ... -->` | speaker note, shown only in the `P` window |
| `<!-- layout: center -->` | centre the slide vertically |
| `::: key` ... `:::` | callout (`key`, `warn`, `ok`, `note`, `quote`) |
| ```` ```mermaid ```` | diagram |
| ```` ```nix ```` | syntax highlighting (js, ts, bash, nix, rust, python, json, yaml, css, html, go, c, diff, toml) |

HTML comments stay in the markdown but never reach the rendered output (overview,
print, speaker notes). A slide is split into **blocks** (headings, paragraphs, lists,
code, callouts, tables); the block is the unit of the cursor, of navigation and of
`dd`/`cc`.

## Speaker notes

`P` opens a second window for the other screen: the current notes in large type, the
position, the step count, the timer, and the title of the next slide. It stays in sync
through `BroadcastChannel`; no server, no account.

## Files, commands, settings

| gesture | effect |
|---|---|
| drop a `.md` on the window | open it |
| `:open` | pick a markdown file |
| `:open https://.../deck.md` | import from a URL (if CORS allows) |
| `?deck=./deck.md` | load a deck at startup |
| `:new` / `:reset` | start over from a blank deck |
| `:tutor` | open the tutorial |
| `:paragraph` | new paragraph after the current block |
| `s` | download the deck as markdown |
| `:export` | PDF through the browser print dialog |
| `:theme nord` | palette: `ardoise`, `paper`, `gruvbox`, `nord` |
| `:size 120`, `:size reset` | text size, 80% to 160% |

A deck can set its own `theme:` in the frontmatter. The deck as edited, the theme, the
last slide and the text size are kept in `localStorage`; nothing leaves the browser.
First launch opens a blank deck with a one-line hint.

## Recording (OBS)

- `?raw=1` hides the stage footer and the paragraph marker.
- Use `http://localhost:5173/?raw=1` as a browser source, 1920x1080; `f` for fullscreen.
- `screenkey` (or an OBS keystroke overlay) makes the shortcuts readable.

| parameter | effect |
|---|---|
| `?raw=1` | capture mode (no stage footer) |
| `?slide=7` | start on slide 7 |
| `?theme=paper` | force a theme |
| `?deck=/path/deck.md` | load a deck from a URL |
| `?presenter=1` | open the speaker window directly |

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static dist/
npm run preview    # serves dist/
npm test           # no browser: blocks, editing, motions, live preview
```

On NixOS: `nix develop` (Node 22 provided), then the same commands.

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
   help, so the help cannot lie about behaviour;
2. **editing replaces lines**: every block knows its range in the markdown, so an edit
   never rewrites the file - notes and pauses stay intact.

## Limits

- **No backend**: `:` is a command palette, not a real shell; everything is static and
  offline.
- **`dd`/`cc` work on a block**, not a line; inner lines are reached with `↑`/`↓`.
- **Blocks are shown as styled source** (code, tables, diagrams) while editing.
- **PDF** goes through the browser print dialog ("Save as PDF"), one slide per page.
- **Mermaid** loads on demand (about 1 MB) and only when a diagram exists.
- **The speaker window** can be blocked by a pop-up blocker.
- **No visual selection** (`v`) and no internal clipboard (`y`/`p`).

## License

MIT.
