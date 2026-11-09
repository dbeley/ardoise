# Live tables on the stage — design

Small feature. The stage is the editor, so a table has to be *drawn* there, the way an
image already is: source on the cursor's lines, rendered everywhere else.

## Intent

A table typed in ardoise currently shows as dimmed pipes on the stage and only becomes a
table in the overview and the PDF. For a presentation tool, the formatted table is the
point: it should be on screen while presenting, and the markdown should come back only
while the cells are being typed.

## Behaviour

- **What is a table**: a run of consecutive lines starting with `|`, at least two of them,
  where the second line is a delimiter row (`|---|`, `|:--|--:|`). A run without a
  delimiter row is not a table and stays source.
- **Cursor outside the run** (selection included): the whole run is replaced by one block
  widget drawing the rendered table. `renderMarkdown(text)` produces it, so it is the
  same table as the overview and the PDF — header in small caps, rows, borders, sideways
  scroll when too wide.
- **Cursor inside the run**: the source lines come back, styled as today (`.cm-table`), so
  the pipes and the cells can be edited.
- **Click on the table**: the click reaches the editor, the cursor enters the table, and
  the source appears — same as clicking any other text.
- **Unrevealed tables** (`<!-- pause -->`): drawn too, dimmed like the rest of the hidden
  part. The dim is a class on the widget: a line decoration on the replaced lines would
  overlap the replace range.
- **Everything else unchanged**: the overview, the print/PDF export and the speaker window
  already render tables through the same markdown pipeline.

## Constraints

- No new dependency; the widget renders through the existing `renderMarkdown`.
- The document is never rewritten: decorations only, so undo, motions, `dd`/`d}` and the
  deck source stay exactly as typed.
- One CSS source of truth for tables: the widget wrapper carries `slide`, so the
  `.slide table` rules apply inside the editor.
- UI strings and docs in English.

## Choices

- **Block widget over per-line formatting**: a table is one block; aligning pipes in a
  monospace grid would have to rewrite the text to look right.
- **Reuse the `.slide` rules** instead of duplicating the table CSS under `.cm-…`.
- **`cm-table` on the source lines** stays, so the editing view is unchanged.
