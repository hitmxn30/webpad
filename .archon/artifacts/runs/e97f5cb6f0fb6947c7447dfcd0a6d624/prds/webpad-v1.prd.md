# Webpad v1 — PRD

**Status:** Draft  
**Date:** 2026-06-10  
**Author:** Saurabh Suryavanshi

---

## 1. Problem Statement

**Who:** Frontend developers and hobbyists who want a zero-friction scratchpad — specifically the person who opens a new browser tab instead of spinning up a project, just to try a CSS trick or test a JS snippet right now.

**What problem:** Every existing tool introduces too much friction. The pain is real and measurable: you just want to type and see it work. CodePen and JSFiddle are slow, cluttered with ads and social features, and require sign-ups for anything useful. StackBlitz is overkill for a 10-line snippet. These tools are built for sharing and showing off, not for quick personal scratchpad use.

**Why this matters:** The moment between having an idea and being able to test it should be as short as possible. Every extra second of load time, every sign-up wall, every piece of UI noise is friction that kills the creative impulse. A developer with an idea in their head shouldn't have to fight their tool to express it.

---

## 2. Evidence

- **CodePen / JSFiddle:** Slow initial load, ad-supported, require accounts for features like saving. Designed around social discovery, not personal productivity.
- **StackBlitz / CodeSandbox:** Full project environments — wrong tool for a 10-line snippet. Spin-up time alone defeats the purpose.
- **Browser DevTools console:** Good for JS snippets, terrible for HTML/CSS layout work. No persistent state.
- **Existing webpad (this repo):** Already has a fast, client-side Monaco editor with live preview at 500ms debounce. The core UX loop works — what's missing is persistence and shareability, which currently make it a "lose your work on refresh" experience.

---

## 3. Proposed Solution

Extend the existing webpad playground with:

1. **localStorage persistence** — silently save the three editor values (HTML/CSS/JS) on every change so work survives a refresh without any user action required.
2. **URL hash sharing via lz-string compression** — encode the full snippet into the URL hash so any snippet can be shared as a link, no backend required.
3. **Console/error panel** — a bottom drawer below the preview iframe that captures `console.log`, `console.error`, and runtime errors from the sandboxed iframe, surfacing them without requiring DevTools.
4. **Cmd+Enter manual run shortcut** — in addition to the always-on 500ms debounce, allow triggering a preview rebuild manually via keyboard shortcut.

The approach extends existing primitives rather than creating new abstractions:
- `Playground.tsx` already owns all state — persistence and URL sync are `useEffect` additions to the same component.
- `buildSrcdoc.ts` needs a small extension to inject a console-intercept script into the iframe.
- `Playground.tsx` needs a `window.addEventListener('message', handler)` to receive postMessage events from the sandboxed iframe — `PreviewFrame.tsx` itself needs no changes.
- Layout changes (adding console drawer) are contained to `Playground.tsx`'s JSX.

---

## 4. Key Hypothesis

**Primary:** If webpad loads instantly, persists work silently, and allows sharing via URL, developers will choose it over CodePen for quick snippets.

**Test:** "I sent a webpad link instead of a CodePen link." — If this happens organically, the hypothesis is validated.

**Secondary:** The console panel removes the last reason to open browser DevTools for simple snippet work.

---

## 5. What We're NOT Building

The following are explicitly out of scope for v1 and any foreseeable version:

| Category | Excluded |
|---|---|
| Auth / accounts | No login, no profiles, no saved library |
| Backend / database | No server-side storage, no API |
| npm / package support | No import maps, no CDN package lookup UI |
| Multiple files | Single HTML + CSS + JS, no file tree |
| Social features | No comments, likes, forks, embed codes for others |
| Collaboration | No multiplayer / real-time sync |
| Themes | Dark only for v1 (stretch goal) |
| Light mode | Explicitly deferred |
| Mobile layout | Desktop-first, not optimized for touch |

---

## 6. Success Metrics

| Metric | Target | How to measure |
|---|---|---|
| Time to first usable editor | < 2s on fast 3G | Lighthouse / manual |
| Work survives refresh | 100% of the time | Manual test |
| Share link encodes full snippet | Always, including 10KB+ snippets | Manual test with lz-string |
| Console panel shows `console.log` output | Works for all primitive types | Manual test |
| Subjective: opened instead of CodePen | At least once organically | Personal usage |

---

## 7. Open Questions

| Question | Decision |
|---|---|
| URL length limit? | Use lz-string from day one. Ship no broken experience for snippets beyond "hello world". |
| Console panel placement? | Bottom drawer below the preview. Layout: left = editor, right = (preview on top + console drawer on bottom). |
| Debounce strategy? | 500ms always-on stays for v1. Add Cmd+Enter as manual run shortcut. Toggle for auto/manual run is a later feature. |
| lz-string library choice? | `lz-string` npm package — well-maintained, URL-safe encoding built in. |
| Console panel — which methods to intercept? | `console.log`, `console.warn`, `console.error`, uncaught errors (via `window.onerror`). |
| postMessage security? | Verify `event.origin` is null (sandboxed iframe with no same-origin). |

---

## 8. Users & Context

**Primary User:** A developer (any level) who has a quick idea — a CSS animation, a vanilla JS experiment, a layout test — and just wants to try it. The trigger is curiosity + impatience. They're already in the browser, they don't want to open a terminal.

**Job To Be Done:** When I get a quick idea I want to test in the browser, I want a zero-friction editor with a live preview, so I can validate the idea in under 30 seconds without losing focus.

**Non-Users (explicitly not our target):**
- Teams collaborating on components → use Storybook or StackBlitz
- People who need npm packages → use CodeSandbox
- Tutorial authors who need embeds → use CodePen
- Anyone who needs auth, persistence beyond a URL, or multi-file projects

---

## 9. Solution Detail

### MVP Definition
localStorage persistence + URL hash sharing. Work must survive a refresh AND be sendable. Without both, it's a notepad that loses your work.

### MoSCoW Table

| Priority | Feature | Notes |
|---|---|---|
| **Must** | localStorage persistence | Silently save on every change; load on mount |
| **Must** | URL hash sharing with lz-string | Encode HTML+CSS+JS into hash; decode on load |
| **Must** | Console/error panel | Bottom drawer; intercepts console.log/warn/error + window.onerror |
| **Should** | Cmd+Enter manual run shortcut | In addition to 500ms debounce, not instead of |
| **Could** | Clear console button | Nice UX, low effort |
| **Could** | Copy share URL button | One-click copy of current URL |
| **Won't** | Themes / light mode | v1 dark only |
| **Won't** | Auth / backend | Never in scope |

### Layout (v1)

```
┌─────────────────────┬───────────────────────────┐
│                     │                           │
│   EditorPanel       │   PreviewFrame            │
│   (Monaco, tabs)    │   (iframe)                │
│                     │                           │
│                     ├───────────────────────────┤
│                     │   ConsolePanel            │
│                     │   (bottom drawer)         │
└─────────────────────┴───────────────────────────┘
```

---

## 10. Technical Approach

All file paths verified against current codebase.

### Verified Files

| File | Role | Change needed |
|---|---|---|
| `src/components/Playground.tsx` | State owner, layout | Add localStorage sync, URL hash sync, console message state, ConsolePanel, keyboard shortcut |
| `src/lib/buildSrcdoc.ts` | Pure function, assembles iframe HTML | Inject console-intercept script that postMessages to parent |
| `src/components/EditorPanel.tsx` | Monaco wrapper, tab switcher | Add `onKeyDown` handler for Cmd+Enter or pass through to Playground |
| `src/components/PreviewFrame.tsx` | Sandboxed iframe | No change needed — postMessage received in Playground |
| `src/app/page.tsx` | Entry point | No change needed |

### New Files Needed

| File | Role |
|---|---|
| `src/components/ConsolePanel.tsx` | Bottom drawer UI for console output |
| `src/lib/urlState.ts` | Encode/decode state to/from URL hash using lz-string |
| `src/lib/storage.ts` | localStorage read/write helpers |

### Key Implementation Details

**localStorage persistence** (`Playground.tsx`):
- On mount: read from `localStorage.getItem('webpad:state')`, parse JSON `{ html, css, javascript }`, use as initial state instead of `DEFAULT_*` constants.
- On change: existing `useEffect([values])` already fires — add `localStorage.setItem('webpad:state', JSON.stringify(values))` inside the debounce or as a separate immediate effect.
- URL hash takes priority over localStorage on load (shared links must override saved state).

**URL hash sharing** (`src/lib/urlState.ts` — needs creation):
- Dependency: `lz-string` (add to `package.json`). Provides `compressToEncodedURIComponent` / `decompressFromEncodedURIComponent`.
- Encode: `#` + `LZString.compressToEncodedURIComponent(JSON.stringify({ html, css, javascript }))`.
- Decode on mount: `window.location.hash` → decompress → parse.
- Share button: `navigator.clipboard.writeText(window.location.href)` (or auto-update hash on every change so the URL is always shareable — preferred for simplicity).

**Console intercept** (`src/lib/buildSrcdoc.ts`):
- Extend `buildSrcdoc` to inject a script *before* the user's JS that overrides `console.log/warn/error` and `window.onerror` to call `window.parent.postMessage({ type: 'console', level, args }, '*')`.
- The `<\/script>` escape pattern is already in place — apply same care to the injected script.

**ConsolePanel** (`Playground.tsx` + `src/components/ConsolePanel.tsx`):
- `Playground.tsx` adds a `window.addEventListener('message', handler)`. To verify the source is the preview iframe (not some other frame), `PreviewFrame.tsx` must forward a `ref` to its `<iframe>` element using `React.forwardRef`, and `Playground.tsx` holds that ref to check `event.source === iframeRef.current?.contentWindow`. Alternatively, check `event.data?.type === 'console'` without source-checking (acceptable since the iframe is sandboxed to null origin). The handler appends to a `consoleMessages` state array.
- `ConsolePanel` renders a scrollable list of messages, color-coded by level (log=white, warn=yellow, error=red).
- Layout: the right column becomes a flex column — `flex-1` for PreviewFrame, fixed height (e.g., `h-48`) for ConsolePanel, collapsible later.

**Cmd+Enter shortcut**:
- Add `useEffect` in `Playground.tsx` that registers `keydown` on `document`.
- On `metaKey + key === 'Enter'` (Mac) or `ctrlKey + key === 'Enter'` (Windows): immediately call `setSrcdoc(buildSrcdoc(...))` without waiting for the 500ms debounce.

### Dependencies to Add

```json
"lz-string": "^1.5.0"
```

> **Note:** `lz-string` ships its own TypeScript types at `typings/lz-string.d.ts`. No `@types/lz-string` entry is needed in devDependencies.

---

## 11. Implementation Phases

### Phase 1 — Persistence (can ship independently)

| Task | File | Status |
|---|---|---|
| Create `src/lib/storage.ts` with read/write helpers | new | TODO |
| Load from localStorage on mount in `Playground.tsx` | `Playground.tsx:47` | TODO |
| Save to localStorage on change in `Playground.tsx` | `Playground.tsx:57` | TODO |

### Phase 2 — URL Hash Sharing (depends on Phase 1 for priority logic)

| Task | File | Status |
|---|---|---|
| Add `lz-string` dependency | `package.json` | TODO |
| Create `src/lib/urlState.ts` with encode/decode | new | TODO |
| On mount: decode hash, override localStorage if present | `Playground.tsx` | TODO |
| On change: update `window.location.hash` | `Playground.tsx` | TODO |
| Add "Copy link" button to UI | `Playground.tsx` JSX | TODO |

### Phase 3 — Console Panel (parallel with Phase 2)

| Task | File | Status |
|---|---|---|
| Extend `buildSrcdoc.ts` to inject console-intercept script | `src/lib/buildSrcdoc.ts` | TODO |
| Create `src/components/ConsolePanel.tsx` | new | TODO |
| Add `message` event listener in `Playground.tsx` | `Playground.tsx` | TODO |
| Wire ConsolePanel into layout | `Playground.tsx` JSX | TODO |

### Phase 4 — Keyboard Shortcut (small, can be done anytime)

| Task | File | Status |
|---|---|---|
| Add Cmd+Enter `keydown` listener in `Playground.tsx` | `Playground.tsx` | TODO |

### Parallel Opportunities

- Phase 2 and Phase 3 are independent — can be developed simultaneously.
- Phase 4 can be dropped into any phase without conflict.

---

## 12. Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| URL encoding library | `lz-string` | Mature, URL-safe, no backend needed. Do it right from day one — don't ship broken for large snippets. |
| Console panel placement | Bottom drawer under preview | Keeps layout simple. Left = editor, right = (preview + console). Avoids a third column. |
| Debounce strategy | 500ms always-on + Cmd+Enter shortcut | Always-on is fine for v1. Manual shortcut added as power-user escape hatch. Toggle (auto/manual) deferred. |
| State serialization format | `{ html, css, javascript }` JSON | Matches existing `Record<Lang, string>` type in `Playground.tsx:47` (`type Lang` is defined at line 44). |
| URL hash vs query param | Hash (`#`) | Hash never reaches the server — cleaner for client-only state. |
| localStorage key | `webpad:state` | Namespaced to avoid collisions. |
| URL priority over localStorage | URL wins | Shared links must override local state. Visiting a link should always show the linked snippet. |
| Dark theme only | Dark only for v1 | Reduces scope. Monaco is already `vs-dark`. Tailwind classes already use `gray-950`/`gray-900`. |
| No backend | Confirmed out of scope | Personal tool, side project. lz-string + localStorage covers all stated needs. |

---

## Validation Notes

Validated 2026-06-10 against codebase at `src/`. Four corrections applied:

1. **Section 3 — PreviewFrame attribution corrected**: Original text said "PreviewFrame.tsx needs a postMessage listener added to bridge iframe console output to the parent." This is wrong — the `message` event listener belongs in `Playground.tsx` (the parent window), not in `PreviewFrame.tsx`. `PreviewFrame.tsx` renders the iframe and needs no listener. Corrected to reflect that `Playground.tsx` adds the `window.addEventListener('message', handler)`.

2. **Section 10 — iframeRef requires ref-forwarding**: The `iframeRef.current?.contentWindow` source check in `Playground.tsx` requires the iframe ref to be accessible there. Since the `<iframe>` is rendered inside `PreviewFrame.tsx`, `PreviewFrame.tsx` must use `React.forwardRef` to expose the ref. This was not mentioned in the original PRD. Added a note with the alternative (type-check `event.data?.type` only, acceptable given null-origin sandbox).

3. **Line number `Playground.tsx:44` corrected to `:47`**: Line 44 is `type Lang = "html" | "css" | "javascript"`. The `Record<Lang, string>` type usage (the `useState` initializer) is at line 47. Fixed the reference in the Decisions Log.

4. **`@types/lz-string` removed**: `lz-string` ships its own TypeScript declarations at `typings/lz-string.d.ts` (confirmed via `npm show lz-string typings`). The `@types/lz-string` devDependency entry was unnecessary and removed.
