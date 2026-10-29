# Security

## Threat model

ardoise is an **entirely client-side** application: no server, no account, no network
request on load (beyond system fonts and diagrams computed locally). There is therefore
no API key, no session, and nothing to exfiltrate server-side.

The only untrusted input is **the markdown you open** (a local file, a remote URL, or
content already sitting in `localStorage`).

What bounds that input:

- markdown-it runs with `html: false`: raw HTML inside a deck is never interpreted, it
  is escaped;
- Mermaid is initialised with `securityLevel: 'strict'`;
- external links open with `rel="noreferrer noopener"`;
- the app reads no cookie, no `location.hash`, and no URL parameter other than `slide`,
  `theme`, `raw`, `deck` and `presenter`.

Accepted residual risk: an imported deck can contain links to third-party sites, and
`?deck=` performs a `fetch` against the requested URL (subject to CORS).

## Reporting a vulnerability

Open a private report:
<https://github.com/dbeley/ardoise/security/advisories/new>

Please do not open a public issue before a fix ships. Thirty days is a reasonable
window for a patch; this project is maintained in spare time.
