# Webpad

A lightweight, in-browser HTML/CSS/JavaScript playground — no build step, no server, just write and see results instantly.

**Live:** [https://webpad-eight.vercel.app/](https://webpad-eight.vercel.app/)

## What it does

Webpad gives you three editor panels (HTML, CSS, JavaScript) and a live preview that updates as you type. It also includes a built-in console that captures `console.log` / `warn` / `error` output from your running code — no DevTools required.

Your work is saved automatically to `localStorage` and encoded in the URL hash so you can share a snippet with a link.

## Features

- **Monaco editor** — the same editor powering VS Code, with syntax highlighting and autocomplete
- **Live preview** — iframe rebuilds 500ms after your last keystroke
- **Shareable links** — full editor state is LZ-compressed into the URL hash; paste it anywhere
- **Session restore** — `localStorage` restores your last session on revisit
- **Console panel** — captures `log`, `warn`, and `error` calls from the preview iframe
- **Sandboxed iframe** — user code runs in a null-origin sandbox (`allow-scripts` only, no `allow-same-origin`) for safety

## Tech stack

- [Next.js](https://nextjs.org/) (App Router)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) via `@monaco-editor/react`
- [lz-string](https://github.com/pieroxy/lz-string) for URL state compression
- [Tailwind CSS](https://tailwindcss.com/)

## Running locally

```bash
npm install
npm run dev       # dev server at http://localhost:3000
npm run build     # production build (also runs TypeScript check)
npm run lint      # ESLint
```

## How it works

All execution is client-side. `Playground.tsx` owns the `html`, `css`, and `javascript` strings and passes them to `buildSrcdoc.ts`, which assembles a single `srcdoc` string injected into a sandboxed `<iframe>`. CSS lands in `<style>` in `<head>`; a console-intercept script and the user's JS run in `<body>`. The iframe posts console events back to the parent via `postMessage`.

State hydration on load follows this priority order:
1. URL hash — for shared links
2. `localStorage` — for session restore
3. Hardcoded defaults
