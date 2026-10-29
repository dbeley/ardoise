/**
 * editor.js - la surface d'édition : un document CodeMirror par slide.
 *
 * Le document est le markdown de la slide courante. Les décorations
 * (`livepreview.js`) donnent le rendu ; le mode normal verrouille la frappe
 * (`readOnly`) et laisse notre keymap vim faire les modifications.
 */
import { EditorState, Compartment, StateEffect, StateField } from '@codemirror/state'
import { EditorView, Decoration, drawSelection, keymap } from '@codemirror/view'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { buildDecorations } from './livepreview.js'

const readOnly = new Compartment()

/** Position à partir de laquelle le contenu n'est pas encore "révélé". */
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
        ranges.push(Decoration.replace({}).range(replace.from, replace.to))
      }
    }

    return Decoration.set(ranges, true)
  })
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

/** Remplace tout le document (changement de slide) en repartant d'un état neuf. */
export function setDocument(view, doc, options) {
  const fresh = createState(doc, options)
  view.setState(fresh)
}
