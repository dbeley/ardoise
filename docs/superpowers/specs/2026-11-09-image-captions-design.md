# Image captions and `:table` — design

Small feature, two parts: images get a caption that visibly belongs to them, and a
command inserts a table skeleton.

## Intent

A caption under an image has to read as *that image's* caption, not as the next
paragraph. Today a paragraph of text under an image is indistinguishable from the rest of
the slide. And tables are supported but nothing helps type one.

## Behaviour

### Captions

- **Rule** (Pandoc's implicit figure): a paragraph whose only content is an image is
  rendered as a figure:

  ```html
  <figure class="figure" style="width:60%">
    <img src="…" alt="A cat" loading="lazy">
    <figcaption>A cat</figcaption>
  </figure>
  ```

  The caption is the alt text. An image with no alt gets a `<figure>` with no
  `<figcaption>`.
- **Width**: `![alt|60%](url)` moves its `style="width:60%"` from the `<img>` to the
  `<figure>`; the image fills the figure. The figure then has the image's width, so the
  caption lines up under the image instead of under the whole slide.
- **Look**: `<figure>` keeps the paragraph's bottom margin and sits where the image sat
  (no centring change); `<figcaption>` is centred under the image, `0.82em`,
  `--muted`, `0.45em` above it. The image keeps its border and radius.
- **Inline images** (an image inside a sentence) are untouched: no figure, width on the
  `<img>` as today.
- **Every view** goes through the same renderer, so the overview, the print/PDF export
  and the stage all get the figure.
- **Editor**: the CodeMirror image widget keeps showing the bare image; the cursor's
  line still shows the markup.
- **Dialog**: the `:image` dialog's second field becomes the caption (label
  `caption (optional)`), since that is what the alt now is.

### `:table`

- **Command**: `:table` inserts a 2-column, 1-row skeleton at the current block and puts
  the cursor in the first header cell, in insert mode:

  ```markdown
  |  |  |
  |---|---|
  |  |  |
  ```

  The cells are empty: nothing to delete before typing.
- **Size**: `:table 3x4` means 3 columns and 4 data rows (plus the header row).
  Columns clamp to 1-8, rows to 1-20; a non-numeric argument falls back to `2x1`.
- **Placement**: same rule as `:code` — after the current block, never glued to the
  previous line.
- **Palette**: `{ id: 'table', key: 'table 3x4', label: 'insert a table (cols x rows)' }`.

## Constraints

- No new dependency; no raw HTML in the markdown (`html: false`).
- One field for the caption: no second syntax, no title attribute.
- UI strings and docs in English.

## Choices

- **Alt as caption** (chosen over a dedicated caption line): the caption lives inside
  the figure, so it can never detach from its image; it also makes the existing,
  invisible description field do something. The cost: an alt with no visible caption is
  no longer possible, and existing decks that filled the description will now show it.
- **Width on the figure** rather than on the image: the caption has to be as wide as the
  image, not as wide as the slide.
- **Skeleton over a dialog** for `:table`: the cells are typed in place, like `:code`.
