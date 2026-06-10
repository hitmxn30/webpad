# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build (also runs TypeScript check)
npm run lint     # ESLint via next lint
```

No test suite is set up. There is no `npm test`.

## Architecture

Webpad is a single-page in-browser HTML/CSS/JS playground. All "compilation" is client-side — the three editor values are concatenated into a single srcdoc string and injected into a sandboxed iframe with no server involvement.

**Data flow:**

```
Playground (state owner)
  ├── EditorPanel  ← user types → onChange(lang, value)
  │     └── Monaco Editor (one instance, swaps language/value per active tab)
  ├── PreviewFrame ← srcdoc rebuilt every 500ms debounce or Cmd+Enter
  │     └── <iframe sandbox="allow-scripts">  ──postMessage──▶ console handler
  └── ConsolePanel ← messages from iframe postMessage / onClear
```

`Playground.tsx` owns all state (`html`, `css`, `javascript` strings) and the derived `srcdoc`. A `useEffect` with `setTimeout`/`clearTimeout` debounces rebuilds, localStorage writes, and URL hash updates to 500ms after the last keystroke.

`buildSrcdoc.ts` (`src/lib/`) is a pure function that assembles the iframe document: CSS goes into `<style>` in `<head>`, a console-intercept script runs first in `<body>`, then the user JS script follows. The `<\/script>` escape inside the template literal is intentional — it prevents a literal `</script>` in either injected script from breaking the srcdoc string.

`storage.ts` (`src/lib/`) reads and writes editor state to `localStorage` under the key `webpad:state`. Shape is validated on read; errors are silently swallowed.

`urlState.ts` (`src/lib/`) encodes editor state as an LZ-compressed, URI-safe string in the URL hash using `lz-string`. `history.replaceState` is used (not `window.location.hash =`) to avoid creating history entries on every debounce cycle.

**State hydration order** (resolved once on mount to avoid SSR mismatch):
1. URL hash (`window.location.hash`) — takes priority for shareable links
2. `localStorage` — restores last session
3. Hardcoded defaults

**SSR guard:** `EditorPanel` is imported via `next/dynamic(..., { ssr: false })` in `Playground`. Monaco accesses `window` at import time, which crashes Next.js server rendering without this guard.

**iframe sandbox:** `sandbox="allow-scripts"` only — `allow-same-origin` is deliberately omitted to keep the iframe in a null origin. Even without `allow-same-origin`, `postMessage` is available under `allow-scripts`, and the console intercept uses it intentionally: the injected `CONSOLE_INTERCEPT` script calls `window.parent.postMessage({ type: 'console', ... }, '*')` and `Playground.tsx` listens on `window`. The handler validates `type`, `level`, and `args` shape before accepting. Any future iframe→parent messages must follow the same validation pattern. Do NOT add `allow-same-origin` — it would give injected JS full access to `window.parent` and break the null-origin isolation.
