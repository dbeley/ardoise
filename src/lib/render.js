/**
 * render.js - markdown to HTML, tuned for the presenterm-like look.
 *
 * Ajoute :
 *  - syntax highlighting (highlight.js, house theme)
 *  - ```mermaid blocks left as placeholders, hydrated in the DOM
 *  - didactic containers: ::: key / warn / ok / note / quote
 *  - liens externes en target=_blank
 */
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'

import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import bash from 'highlight.js/lib/languages/bash'
import shell from 'highlight.js/lib/languages/shell'
import nix from 'highlight.js/lib/languages/nix'
import rust from 'highlight.js/lib/languages/rust'
import python from 'highlight.js/lib/languages/python'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import go from 'highlight.js/lib/languages/go'
import c from 'highlight.js/lib/languages/c'
import markdown from 'highlight.js/lib/languages/markdown'
import diff from 'highlight.js/lib/languages/diff'
import ini from 'highlight.js/lib/languages/ini'

for (const [name, lang] of Object.entries({
  javascript,
  typescript,
  bash,
  shell,
  nix,
  rust,
  python,
  json,
  yaml,
  css,
  xml,
  go,
  c,
  markdown,
  diff,
  ini,
})) {
  hljs.registerLanguage(name, lang)
}
hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' })
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' })
hljs.registerAliases(['sh', 'zsh', 'console'], { languageName: 'bash' })
hljs.registerAliases(['html', 'svg', 'vue', 'svelte'], { languageName: 'xml' })
hljs.registerAliases(['yml'], { languageName: 'yaml' })
hljs.registerAliases(['md'], { languageName: 'markdown' })
hljs.registerAliases(['toml'], { languageName: 'ini' })

export const CONTAINERS = {
  key: { label: 'key point', icon: '◆' },
  warn: { label: 'watch out', icon: '▲' },
  ok: { label: 'it works', icon: '✓' },
  note: { label: 'note', icon: '›' },
  quote: { label: 'quote', icon: '”' },
}

const PLACEHOLDER = /\u0000C(\d+)\u0000/g

function buildMarkdown() {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    breaks: false,
    highlight: null,
  })

  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]
    const info = (token.info || '').trim()
    const lang = info.split(/\s+/)[0] || ''
    const code = token.content

    if (lang === 'mermaid' || lang === 'diagram') {
      return `<pre class="diagram" data-lang="mermaid">${md.utils.escapeHtml(code)}</pre>`
    }

    let highlighted
    try {
      highlighted =
        lang && hljs.getLanguage(lang)
          ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
          : md.utils.escapeHtml(code)
    } catch {
      highlighted = md.utils.escapeHtml(code)
    }

    const label = lang || 'text'
    return `<div class="code" data-lang="${label}"><pre><code class="hljs">${highlighted}</code></pre></div>`
  }

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href') || ''
    if (/^https?:/i.test(href)) {
      tokens[idx].attrSet('target', '_blank')
      tokens[idx].attrSet('rel', 'noreferrer noopener')
    }
    return self.renderToken(tokens, idx, options)
  }

  // Les tableaux markdown-it n'ont pas de wrapper : on en ajoute un pour le scroll.
  const tableOpen = md.renderer.rules.table_open || ((t, i, o, e, s) => s.renderToken(t, i, o))
  md.renderer.rules.table_open = (tokens, idx, options, env, self) =>
    `<div class="table-wrap">${tableOpen(tokens, idx, options, env, self)}`
  const tableClose = md.renderer.rules.table_close || ((t, i, o, e, s) => s.renderToken(t, i, o))
  md.renderer.rules.table_close = (tokens, idx, options, env, self) =>
    `${tableClose(tokens, idx, options, env, self)}</div>`

  return md
}

const md = buildMarkdown()

/**
 * Extrait les conteneurs ::: x ... ::: sous forme de placeholders avant
 * le passage markdown, pour que leur contenu reste du markdown normal.
 */
function extractContainers(source) {
  const blocks = []
  const lines = source.split('\n')
  const out = []
  let current = null

  for (const line of lines) {
    const open = line.match(/^\s*:::\s*([A-Za-z][\w-]*)?\s*$/)
    if (open && !current) {
      current = { kind: open[1] || 'note', lines: [] }
      continue
    }
    if (/^\s*:::\s*$/.test(line) && current) {
      const id = blocks.length
      blocks.push(current)
      out.push('', `\u0000C${id}\u0000`, '')
      current = null
      continue
    }
    if (current) current.lines.push(line)
    else out.push(line)
  }

  if (current) {
    // Unclosed container: render the text as-is rather than drop it.
    out.push(`::: ${current.kind}`, ...current.lines)
  }

  return { text: out.join('\n'), blocks }
}

function renderContainer(block) {
  const meta = CONTAINERS[block.kind] || { label: block.kind, icon: '›' }
  const inner = md.render(block.lines.join('\n').trim())
  return `<div class="box box--${block.kind}"><div class="box-head"><span class="box-icon">${meta.icon}</span><span class="box-label">${meta.label}</span></div><div class="box-body">${inner}</div></div>`
}

export function renderMarkdown(source) {
  const { text, blocks } = extractContainers(String(source ?? ''))
  let html = md.render(text)
  html = html.replace(PLACEHOLDER, (_, id) => renderContainer(blocks[Number(id)]))
  // A lone placeholder ends up wrapped in <p>...</p>: unwrap it.
  html = html.replace(/<p>\s*(<div class="box)/g, '$1').replace(/(<\/div>)\s*<\/p>/g, '$1')
  return html
}

export function renderInline(source) {
  return md.renderInline(String(source ?? ''))
}

/** Render mermaid blocks, called from the `diagrams` action. */
let mermaidPromise = null
async function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        themeVariables: {
          background: 'transparent',
          primaryColor: '#1d2029',
          primaryTextColor: '#d7dae0',
          primaryBorderColor: '#7aa2f7',
          lineColor: '#7f8794',
          secondaryColor: '#23262f',
          tertiaryColor: '#1a1c23',
          fontSize: '16px',
        },
        flowchart: { curve: 'basis', padding: 12 },
        sequence: { actorMargin: 40 },
      })
      return mermaid
    })
  }
  return mermaidPromise
}

let diagramSeq = 0

/** Action Svelte : hydrate les placeholders diagrammes d'un conteneur. */
export function diagrams(node, params = {}) {
  if (params?.hydrate === false) return
  let cancelled = false


  async function hydrate() {
    const targets = node.querySelectorAll('pre.diagram:not([data-ready])')
    if (!targets.length) return
    const mermaid = await getMermaid()
    for (const el of targets) {
      if (cancelled || !el.isConnected) continue
      const code = el.textContent || ''
      el.dataset.ready = '1'
      try {
        const id = `ardoise-diagram-${++diagramSeq}`
        const { svg } = await mermaid.render(id, code)
        if (cancelled || !el.isConnected) continue
        el.outerHTML = `<div class="diagram-figure">${svg}</div>`
      } catch (error) {
        el.outerHTML = `<div class="diagram-error"><span>diagramme invalide</span><code>${escapeText(
          error?.message || String(error)
        )}</code></div>`
      }
    }
  }

  const observer = new MutationObserver(() => {
    hydrate()
  })
  observer.observe(node, { childList: true, subtree: true })
  hydrate()

  return {
    destroy() {
      cancelled = true
      observer.disconnect()
    },
  }
}

function escapeText(value) {
  return String(value).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
}
