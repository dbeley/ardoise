# Visual selection — design

Small feature: `v` and `V`, the missing half of the modal model. Everything an operator
needs is already there (the yank ring, `dd`'s line ranges, the selection reveal), so this
is mostly wiring.

## Intent

Deleting or copying several characters or several lines at once has no gesture today: the
operators wait for a motion (`d}`, `d2w`, `dd`), and a mouse selection is dropped by the
next motion. `v`/`V` make the range visible and then let `d`, `y`, `c`, `p` act on it.

## Behaviour

- **Start**: `v` at the cursor, character-wise; `V`, whole lines. `v` from `V` goes back
  to characters, `V` from `v` to lines, and a second `v` cancels. `esc` cancels too,
  folding the selection back to its head.
- **Extend**: every motion drags the head and keeps the anchor: `h l w b e 0 $ ↑ ↓ j k
  } { gg G`, with counts (`2w`, `3j`). The markdown of the selected lines shows while
  the selection is live — that is what the editor already does with a selection.
- **Operators**, on the selection and then back to normal mode:
  - `d` / `x`: delete it, and keep it in the yank ring;
  - `y`: keep it, no change to the text;
  - `c`: delete it and switch to insert mode at its start;
  - `p` / `P`: the register replaces the selection; a line-wise register pastes as
    whole lines, so the shape of the register is kept;
  - `o`: swap the two ends.
- **Whole lines** (`V`): the range takes the lines *and their newline*, and the blank
  line that separated a whole block goes with it — the same ranges `dd` uses, so
  deleting the lines of a paragraph does not leave a blank line behind. The register
  keeps the lines without the final newline, as `yy` does.
- **One slide only**: a selection never crosses a slide. `j` stops on the last line, and
  the slide keys (`J`, `K`, `>`, `<`) are swallowed; the editor holds one slide, so a
  selection cannot span two.
- **Everything else** (search, slides, palette, black screen, help) is ignored while
  selecting: `esc` first, then the key.

## Constraints

- No new dependency; the selection is CodeMirror's own, so `drawSelection` highlights it
  and `undo` still works.
- The document is untouched until an operator runs.
- One pure module for the range (`src/lib/visual.js`), testable without a browser.

## Choices

- **Character-wise and line-wise only**, no block selection (`ctrl-v`) and no text
  objects (`iw`, `i{`): the two cover the request, the others can come later.
- **`p` replaces the selection** rather than pasting beside it: that is what a selection
  means, and it makes `y`/`p` a move.
- **The register is not fed by the pasted-over text** (Vim does): one less surprise, and
  `p` twice stays harmless.
