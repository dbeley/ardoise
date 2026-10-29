# Link cards — design

Feature: a `:link` command that inserts either a plain markdown link or a link card
(title, description, site, optional image) whose metadata is fetched once and stored in
the deck. Chosen approach: static card (approach 1 of the conversation), no iframe, no
screenshot.

## Intent

A deck should be able to point at a page and look good doing it: `:link` opens a small
dialog, fetches the page's metadata, and inserts a card that renders in the editor, the
overview and the print view. The card is stored as text in the deck, so presenting it
never depends on the network (only its image is hotlinked).

## Behaviour

- **Command**: `:link` (palette id `link`, label `insert a link`).
- **Dialog** (`LinkDialog.svelte`, mode `link`):
  - URL field, then `enter` fetches the metadata (no fetch while typing);
  - editable title, description and image URL, pre-filled from the metadata;
  - a card preview and a `card` toggle (on when metadata or an image arrived);
  - "insert" inserts the card, or a plain `[title](url)` link when the toggle is off;
  - `esc` closes; failures show `metadata unavailable - fill the title by hand`.
- **Metadata**: Microlink (`https://api.microlink.io/?url=…`), anonymous, CORS open.
  The free tier is small (about 25 requests/day), so the client caches per URL and
  only fetches on submit. If the fetch fails, the dialog stays usable and the fields
  can be filled by hand.
- **Card markup** (a fenced block, readable and editable by hand):

  ````
  ```link
  url: https://example.com
  title: Example Domain
  description: This domain is for use in illustrative examples.
  image: https://example.com/og.png
  ```
  ````

  `url` is required and must be `http`/`https`; the other lines are optional. Values
  are single-line, split at the first `:`.
- **Insertion**:
  - plain link: `[title](url)` at the cursor;
  - card: after the current block (or at the end of a block-less deck), cursor after
    it, reusing the block-insertion helper introduced for images.
- **Rendering**:
  - `render.js` gets a `link` fence rule: an `<a class="link-card">` with the site
    (host), title, description, URL and the optional image, all escaped; links open in
    a new tab with `rel="noreferrer noopener"`. An invalid or missing URL falls back to
    the normal code block.
  - `livepreview.js` replaces the whole fence with a widget when the cursor is outside
    it, and keeps the source visible on the cursor's line. `editor.js` gets a
    `LinkCardWidget` next to `ImageWidget`.
- **Stage**: the card is not clickable in the editor (the widget ignores events);
  clicking in the overview or a printed/PDF version opens the page.
- **Failure**: no metadata service, quota exhausted, page unreachable — the dialog
  still inserts a plain link with whatever title the user typed. Existing cards need
  no network beyond their hotlinked image.

## Constraints

- Core stays offline; only the metadata fetch and the card image need the network.
- No backend, no key, no proxy. Quotes: Microlink free tier, cached per URL.
- UI strings and docs in English.
- No new dependency.

## Choices

- **One provider** (Microlink), hidden behind `fetchMetadata()`; manual fields are the
  fallback.
- **Card stored as a ```link fence**, not JSON comments or `:::` containers: it is a
  real block for navigation/`dd`, and it reads well by hand.
- **No click-through on stage**; the URL is visible on the card.
- Plain link and card both available from one dialog (`card` toggle).

## Files

- Create: `src/lib/links.js` (`normalizeUrl`, `parseLinkBlock`, `linkCardMarkdown`,
  `linkMarkdown`, `fetchMetadata`), `src/components/LinkDialog.svelte`
- Modify: `src/lib/deck.js` (generic `blockInsertion`), `src/lib/images.js` (delegate),
  `src/lib/render.js`, `src/lib/livepreview.js`, `src/lib/editor.js`, `src/App.svelte`,
  `src/app.css`
- Tests: `tests/links.test.mjs`, extend `tests/render.test.mjs`,
  `tests/livepreview.test.mjs`
- Docs: `README.md`

## Non-goals

- Iframes, interactive pages, screenshots.
- Refreshing metadata later, or fetching it at render time.
- Multiple metadata providers, API keys, proxies.
- Clicking a card while presenting.

## Review focus

- Only `http`/`https` URLs are accepted and rendered; no `javascript:` or data URI in a
  card link.
- A failed metadata fetch never blocks the insertion path.
- The card block round-trips by hand (parse → markdown → parse).
- The cursor's line shows the source, not the widget; `dd`/motions still work.
- The free-tier quota is respected: no fetch while typing, cache per URL.
- The rendered card escapes every field and survives an empty description/image.
