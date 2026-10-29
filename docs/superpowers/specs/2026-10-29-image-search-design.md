# Image search and insertion — design

Small feature. Hotlink only (option 1 of the conversation): the deck stores a URL,
never a copy of the file.

## Intent

`:image` opens a search dialog backed by Openverse and inserts the chosen picture as
standard markdown at the current block. The image is rendered live in the editor and in
the exported views, and its width can be set as a percentage.

## Behaviour

- **Command**: `:image` (palette id `image`, label `insert an image from the web`).
- **Dialog** (`ImageDialog.svelte`, mode `image`):
  - search field, debounced 500 ms, minimum 2 characters, in-memory cache per query;
  - thumbnails in a grid, selection with the arrow keys, `enter` inserts, `esc` closes;
  - footer shows the selected result's title, creator and license;
  - width control, 25 to 100%, default 100%, with a **live preview** of the selected
    image at that width in a 16:9 pane (the stage's proportion); the preview updates as
    the selection or the width changes;
  - "Search by Openverse" is shown in the dialog.
- **Insertion**: if the current block is empty, its text is replaced; otherwise a new
  paragraph is inserted after the current block. The cursor lands on the line after the
  image so the widget renders immediately.
- **Markup** (one line, no title, no caption, no credit line):

  ```markdown
  ![A cat|60%](https://host.example/cat.jpg)
  ```

  `|NN%` is the width. The alt is the result's title, for accessibility. The width can
  also be edited by hand in the source; the dialog is just the guided way to set it.
- **Rendering**:
  - `render.js` gains an `image` rule: `alt|NN%` becomes `style="width:NN%"`,
    `loading="lazy"` is added; CSS keeps `max-width: 100%`.
  - `livepreview.js`: on a line the cursor is not on, the whole markup is replaced by a
    widget descriptor `{ type: 'image', src, alt, width }`; on the cursor's line the
    source stays visible (the existing decoration rule).
  - `editor.js` turns that descriptor into an `ImageWidget` (an `<img>`; on load error it
    shows the alt text and a muted "image unavailable").
- **Navigation and editing**: an image line is an ordinary `para` block. `j`/`k` step over
  it, `dd` deletes it, the motions still walk the markup when the cursor is on the line.
- **Failure**: network/CORS failure shows a toast (`image search unavailable`), `429`
  shows `Openverse rate limit reached, try again in a minute`; nothing crashes and the
  deck is untouched. Existing decks with images keep their markup offline, but the
  remote files will not load.

## Constraints

- No key, no proxy, no backend. Openverse anonymous access: CORS `*`, 20 requests/min,
  200/day; the debounce and the cache protect the quota.
- The core stays offline: only search and insertion need the network; hotlinked images
  need it again when displayed.
- UI strings and docs in English.

## Choices

- **Hotlink only** (chosen): no embedding, no proxy, no downloaded copies.
- **Width syntax** `![alt|NN%](url)`, parsed by one helper shared by the renderer and the
  live preview; the dialog sets it, the source remains editable by hand.
- **No title, caption or credit line** is inserted: the image is just the image. The
  creator and license stay visible in the dialog at selection time; some CC licenses
  formally require attribution, so the dialog tells the user what they picked.
- **Width preview in the dialog** in a 16:9 pane, so the chosen percentage is judged
  before insertion.
- **One provider** (Openverse), hidden behind `searchImages()` so it can be swapped
  later.

## Files

- Create: `src/lib/images.js` (`searchImages`, `parseImageMarkup`, `imageMarkdown`),
  `src/components/ImageDialog.svelte`
- Modify: `src/App.svelte`, `src/lib/livepreview.js`, `src/lib/editor.js`,
  `src/lib/render.js`, `src/app.css`
- Tests: `tests/images.test.mjs`, `tests/render.test.mjs`, extend
  `tests/livepreview.test.mjs`
- Docs: `README.md`, `CONTRIBUTING.md` (the "any third-party service" scope line)

## Non-goals

- Uploading, embedding, caching or downloading images.
- Drag-to-resize, cropping, multiple providers.
- Image search offline or without a network.

## Review focus

- A broken or slow image URL must not break the editor or the presentation.
- A search burst must stay under 20 requests/min (debounce and cache actually used).
- The dialog preview must match the width the slide will actually use.
- The cursor's line must keep showing the markup, not the widget.
- Motions, counts and `dd` must behave on a line that contains a widget elsewhere.
- The search query is the only thing sent to Openverse; nothing else leaves the browser.
- Only `![alt|NN%](url)` is inserted: no title, no credit line, no extra blank line.
