# Webpad — Project Plan

## What it is

An in-browser HTML/CSS/JS playground (like CodePen) built with Next.js 14. Write code on the left, see it rendered live on the right. No server-side compilation — everything runs in the browser.

## Layout

```
┌─────────────────────┬──────────────────────┐
│  [HTML] [CSS] [JS]  │                      │
│                     │   Live Preview       │
│  Monaco Editor      │   (iframe)           │
│  (active tab)       │                      │
└─────────────────────┴──────────────────────┘
```

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14, App Router | SSR + routing out of the box |
| Language | TypeScript | Type safety |
| Editor | `@monaco-editor/react` | Zero webpack worker config in Next.js |
| Styling | Tailwind CSS | Utility-first, no extra setup |
| State | React `useState` + `useEffect` | No external lib needed for flat state |

## File Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout — dark bg, h-full body
│   ├── page.tsx            # Entry point — renders <Playground />
│   └── globals.css         # Tailwind directives + full-height/no-scroll body
├── components/
│   ├── Playground.tsx      # Top-level: owns state, left/right layout, debounce
│   ├── EditorPanel.tsx     # Tab bar (HTML/CSS/JS) + single Monaco editor
│   └── PreviewFrame.tsx    # Sandboxed iframe
└── lib/
    └── buildSrcdoc.ts      # Pure fn: (html, css, js) => srcdoc string
```

## Key Design Decisions

**Monaco SSR guard** — `EditorPanel` is loaded via `dynamic(..., { ssr: false })` because Monaco accesses `window`/`document` at import time, which breaks Next.js server rendering.

**iframe sandboxing** — `sandbox="allow-scripts"` without `allow-same-origin`. This keeps the iframe in a null origin so injected JS cannot reach `window.parent` even if the user writes code that tries to.

**`<\/script>` escape in srcdoc** — Prevents a literal `</script>` typed in the JS editor from terminating the outer script tag inside the srcdoc template string.

**`automaticLayout: true`** — Monaco option that recalculates editor dimensions on container resize. Without it, the editor freezes at its initial size when the window is resized.

**500ms debounce** — `useEffect` + `setTimeout` + cleanup. The cleanup cancels any pending rebuild when the user types again before the timeout fires, so only one rebuild happens per typing pause.

## Future Ideas

- Resizable split pane (drag the divider)
- Console output panel (capture `console.log` from the iframe)
- URL sharing (encode state in a URL hash or short link)
- Multiple files / import support
- Prettier formatting on save
