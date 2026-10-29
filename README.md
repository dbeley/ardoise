# ardoise

[![deploy](https://github.com/dbeley/ardoise/actions/workflows/deploy.yml/badge.svg)](https://github.com/dbeley/ardoise/actions/workflows/deploy.yml)
[![license](https://img.shields.io/github/license/dbeley/ardoise)](LICENSE)

**[Try it online](https://dbeley.github.io/ardoise/)** - nothing to install.

A keyboard-driven, live presentation tool. The deck is a plain markdown file:
edit it live, with Vim keybindings, while you present. Speaker notes can be opened in a second
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

## Images and links

`:image` asks for an image URL and inserts it as markdown, hotlinked from its host:

```markdown
![A cat|60%](https://host.example/cat.jpg)
```

`|60%` is optional (25-100, default 100) and can be edited by hand. The dialog previews
the image at the chosen width; the description field is optional (accessibility and the
broken-image fallback). The image is loaded from its host each time the slide is shown.

`:link` asks for a URL and a text (defaults to the URL) and inserts `[text](url)` at the
cursor.

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
| `:image` | insert an image from a URL |
| `:link` | insert a link (URL + text) |
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
