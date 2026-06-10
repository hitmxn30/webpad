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
  └── PreviewFrame ← srcdoc rebuilt every 500ms debounce
        └── <iframe sandbox="allow-scripts">
```

`Playground.tsx` owns all state (`html`, `css`, `javascript` strings) and the derived `srcdoc`. A `useEffect` with `setTimeout`/`clearTimeout` debounces rebuilds to 500ms after the last keystroke.

`buildSrcdoc.ts` (`src/lib/`) is a pure function that assembles the iframe document: CSS goes into `<style>` in `<head>`, JS goes in a `<script>` at the end of `<body>`. The `<\/script>` escape inside the template literal is intentional — it prevents a literal `</script>` typed in the JS editor from breaking the srcdoc string.

**SSR guard:** `EditorPanel` is imported via `next/dynamic(..., { ssr: false })` in `Playground`. Monaco accesses `window` at import time, which crashes Next.js server rendering without this guard.

**iframe sandbox:** `sandbox="allow-scripts"` only — `allow-same-origin` is deliberately omitted to keep the iframe in a null origin and prevent injected JS from reaching `window.parent`.
