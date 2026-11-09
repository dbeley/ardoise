/**
 * editor.js - the editing surface: one CodeMirror document per slide.
 *
 * The document is the current slide's markdown. Decorations (`livepreview.js`)
 * provide the rendering; normal mode locks typing (`readOnly`) and lets our own
 * vim keymap perform the edits.
 */
import { EditorState, Compartment, StateEffect, StateField } from '@codemirror/state'
import { EditorView, Decoration, WidgetType, ViewPlugin, drawSelection, keymap } from '@codemirror/view'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { buildDecorations } from './livepreview.js'
import { renderMarkdown } from './render.js'

const readOnly = new Compartment()

/** Offset from which content has not been revealed yet. */
export const setPendingAt = StateEffect.define()
const pendingAt = StateField.define({
  create: () => Number.MAX_SAFE_INTEGER,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setPendingAt)) return effect.value
    }
    return value
  },
})

export function setPending(view, offset) {
  view.dispatch({ effects: setPendingAt.of(offset) })
}

/** Search highlights for the current slide. */
export const setFindMatches = StateEffect.define()
const findField = StateField.define({
  create: () => Decoration.none,
  update(value, transaction) {
    let next = value.map(transaction.changes)
    for (const effect of transaction.effects) {
      if (!effect.is(setFindMatches)) continue
      const ranges = effect.value
        .filter((range) => range.to > range.from)
        .map((range) =>
          Decoration.mark({
            class: range.current ? 'cm-find is-current' : 'cm-find',
          }).range(range.from, range.to)
        )
      next = Decoration.set(ranges, true)
    }
    return next
  },
  provide: (field) => EditorView.decorations.from(field),
})

export function setFind(view, ranges) {
  view.dispatch({ effects: setFindMatches.of(ranges) })
}

/**
 * A table, drawn where its markdown sits. The wrapper carries `slide`, so the
 * table rules of the deck apply here too: one table, one stylesheet.
 */
class TableWidget extends WidgetType {
  constructor(spec, dimmed = false) {
    super()
    this.spec = spec
    this.dimmed = dimmed
  }

  eq(other) {
    return other.spec.text === this.spec.text && other.dimmed === this.dimmed
  }

  toDOM() {
    const wrap = document.createElement('div')
    wrap.className = this.dimmed ? 'cm-table-widget slide cm-pending' : 'cm-table-widget slide'
    wrap.innerHTML = renderMarkdown(this.spec.text)
    return wrap
  }

  // A click goes to the editor, which puts the cursor in the table: the source
  // comes back, and the click lands where it was aimed.
  ignoreEvent() {
    return false
  }
}

function decorations() {
  return EditorView.decorations.compute(['doc', 'selection', pendingAt], (state) => {
    const selections = state.selection.ranges.map((range) => ({ from: range.from, to: range.to }))
    const { lines, marks, replaces } = buildDecorations(state.doc.toString(), selections)
    const pending = state.field(pendingAt, false)
    const ranges = []
    // A block widget covers whole lines: no line decoration may sit inside it.
    const blocks = replaces.filter((replace) => replace.block)
    const inBlock = (position) =>
      blocks.some((block) => position >= block.from && position <= block.to)

    if (Number.isFinite(pending) && pending < state.doc.length) {
      for (let line = state.doc.lineAt(pending).number; line <= state.doc.lines; line += 1) {
        const from = state.doc.line(line).from
        if (inBlock(from)) continue
        ranges.push(Decoration.line({ class: 'cm-pending' }).range(from))
      }
    }

    for (const entry of lines) {
      const line = state.doc.line(Math.min(entry.line + 1, state.doc.lines))
      const spec = { class: entry.className }
      // Nested list items are drawn from their indent, since the marker and
      // its leading spaces are hidden by the decoration.
      if (entry.indent) spec.attributes = { style: `--list-indent: ${entry.indent}ch` }
      ranges.push(Decoration.line(spec).range(line.from))
    }
    for (const mark of marks) {
      if (mark.to > mark.from) {
        ranges.push(Decoration.mark({ class: mark.className }).range(mark.from, mark.to))
      }
    }
    for (const replace of replaces) {
      if (replace.to <= replace.from) continue
      if (replace.block) {
        const dimmed = Number.isFinite(pending) && pending <= replace.from
        const widget = new TableWidget(replace.widget, dimmed)
        ranges.push(
          Decoration.replace({ widget, block: true }).range(replace.from, replace.to)
        )
        continue
      }
      const spec = replace.widget ? { widget: new ImageWidget(replace.widget) } : {}
      ranges.push(Decoration.replace(spec).range(replace.from, replace.to))
    }

    return Decoration.set(ranges, true)
  })
}

/**
 * A block cursor must be as wide as the character cell, and that cell depends
 * on the line's font size (a heading is two to three times larger than body
 * text). The cursor layer is outside the lines, so its `1ch` is measured with
 * the editor's base font: give the layer the current line's font size.
 */
const cursorFont = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.sync(view)
    }

    update(update) {
      if (
        update.selectionSet ||
        update.docChanged ||
        update.viewportChanged ||
        update.geometryChanged
      ) {
        this.sync(update.view)
      }
    }

    sync(view) {
      // The constructor can run before the first document view exists, and
      // `domAtPos` only knows positions that are currently drawn: never let a
      // cosmetic plugin throw (CodeMirror would disable it for good).
      if (!view.docView) return
      const layer = view.dom.querySelector('.cm-cursorLayer')
      if (!layer) return
      try {
        const pos = view.state.selection.main.head
        if (!view.visibleRanges.some((range) => pos >= range.from && pos <= range.to)) return
        let node = view.domAtPos(pos).node
        if (node.nodeType !== Node.ELEMENT_NODE) node = node.parentElement
        const line = node?.closest?.('.cm-line')
        layer.style.fontSize = line ? getComputedStyle(line).fontSize : ''
      } catch {
        // Mid-reconfiguration: the next selection or viewport update retries.
      }
    }
  }
)

class ImageWidget extends WidgetType {
  constructor(spec) {
    super()
    this.spec = spec
  }

  eq(other) {
    return (
      other.spec.src === this.spec.src &&
      other.spec.alt === this.spec.alt &&
      other.spec.width === this.spec.width
    )
  }

  toDOM() {
    const wrap = document.createElement('span')
    wrap.className = 'cm-image'
    // The width is on the wrapper so the caption under the image is as wide as
    // the image, exactly like the rendered figure.
    if (this.spec.width) wrap.style.width = `${this.spec.width}%`
    const img = document.createElement('img')
    img.src = this.spec.src
    img.alt = this.spec.alt || ''
    img.loading = 'lazy'
    img.onerror = () => {
      wrap.classList.add('is-broken')
      wrap.textContent = this.spec.alt || 'image unavailable'
    }
    wrap.appendChild(img)
    // The alt is the caption: the stage is the editor, so this is where the
    // caption is read while presenting.
    if (this.spec.alt) {
      const caption = document.createElement('span')
      caption.className = 'cm-image-caption'
      caption.textContent = this.spec.alt
      wrap.appendChild(caption)
    }
    return wrap
  }

  ignoreEvent() {
    return true
  }
}

export function createState(doc, { readonly = true, onChange, onCursor } = {}) {
  return EditorState.create({
    doc,
    extensions: [
      history(),
      drawSelection(),
      EditorView.lineWrapping,
      readOnly.of(EditorState.readOnly.of(readonly)),
      pendingAt,
      decorations(),
      findField,
      cursorFont,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange?.(update.state.doc.toString())
        if (update.selectionSet || update.docChanged) {
          const head = update.state.selection.main.head
          onCursor?.(head, update.state.doc.toString())
        }
      }),
    ],
  })
}

export function createView(parent, state) {
  return new EditorView({ parent, state })
}

export function setReadOnly(view, value) {
  view.dispatch({ effects: readOnly.reconfigure(EditorState.readOnly.of(value)) })
}

/** Replace the whole document (slide change) with a fresh state. */
export function setDocument(view, doc, options) {
  const fresh = createState(doc, options)
  view.setState(fresh)
}
