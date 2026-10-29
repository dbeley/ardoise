# Contributing

## Getting set up

```bash
nix develop        # Node 22 (or any Node >= 22.12)
npm ci
npm test           # core: blocks, editing, motions, live preview
npm run dev        # http://localhost:5173
```

`npm test` is the gate: any change to `src/lib/deck.js`, `src/lib/motions.js` or
`src/lib/livepreview.js` must keep the 40 checks green, and add one when it changes a
behaviour.

## Two architectural rules

1. **`lib/keys.js` is the only key table.** It feeds both the event handler and the `?`
   help. Adding a key without declaring it there breaks the promise that the help tells
   the truth.
2. **An edit replaces lines.** A block knows its `startLine`-`endLine` range in the
   slide's markdown. Never shortcut that by rewriting the whole slide: `<!-- note: -->`
   comments and `<!-- pause -->` markers must survive.

A third one, specific to the editor: **decorations never hide the cursor's line**. Hiding
syntax is fine everywhere else, but the line being edited must stay readable and
editable.

## Scope

In scope: markdown rendering, the cursor and its motions, editing, export, themes,
keyboard accessibility.

Deliberately out of scope: backend, accounts, real-time collaboration, telemetry, any
third-party service. The project must stay a static folder that works offline.

## Style

- English for code, comments, documentation and commit messages.
- No em dash in prose: use ` - `.
- Comments explain **why**, not what the code already says.

## Pull requests

One PR, one behaviour. Describe the observable gesture ("`d` `w` deletes the word without
leaving a double space"), not the list of files touched. CI builds and deploys; it must
be green.
