/**
 * editor.js - the editing surface: one CodeMirror document per slide.
 *
 * The document is the current slide's markdown. Decorations (`livepreview.js`)
 * provide the rendering; normal mode locks typing (`readOnly`) and lets our own
 * vim keymap perform the edits.
 */
import { EditorState, Compartment, StateEffect, StateField } from '@codemirror/state'
import { EditorView, Decoration, WidgetType, drawSelection, keymap } from '@codemirror/view'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { buildDecorations } from './livepreview.js'

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

function decorations() {
  return EditorView.decorations.compute(['doc', 'selection', pendingAt], (state) => {
    const selections = state.selection.ranges.map((range) => ({ from: range.from, to: range.to }))
    const { lines, marks, replaces } = buildDecorations(state.doc.toString(), selections)
    const pending = state.field(pendingAt, false)
    const ranges = []

    if (Number.isFinite(pending) && pending < state.doc.length) {
      for (let line = state.doc.lineAt(pending).number; line <= state.doc.lines; line += 1) {
        ranges.push(Decoration.line({ class: 'cm-pending' }).range(state.doc.line(line).from))
      }
    }

    for (const entry of lines) {
      const line = state.doc.line(Math.min(entry.line + 1, state.doc.lines))
      ranges.push(Decoration.line({ class: entry.className }).range(line.from))
    }
    for (const mark of marks) {
      if (mark.to > mark.from) {
        ranges.push(Decoration.mark({ class: mark.className }).range(mark.from, mark.to))
      }
    }
    for (const replace of replaces) {
      if (replace.to > replace.from) {
        const spec = replace.widget ? { widget: new ImageWidget(replace.widget) } : {}
        ranges.push(Decoration.replace(spec).range(replace.from, replace.to))
      }
    }

    return Decoration.set(ranges, true)
  })
}

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
    const img = document.createElement('img')
    img.src = this.spec.src
    img.alt = this.spec.alt || ''
    img.loading = 'lazy'
    if (this.spec.width) img.style.width = `${this.spec.width}%`
    img.onerror = () => {
      wrap.classList.add('is-broken')
      wrap.textContent = this.spec.alt || 'image unavailable'
    }
    wrap.appendChild(img)
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
