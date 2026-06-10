# Plan Context

**Generated**: 2026-06-10 00:00
**Workflow ID**: f3e668e0fed1343f350215ea925e7cf2
**Plan Source**: /Users/saurabhsuryavanshi/.archon/workspaces/D/webpad/worktrees/archon/task-prd-webpad-plan/.archon/artifacts/runs/e97f5cb6f0fb6947c7447dfcd0a6d624/prds/webpad-v1.prd.md

---

## Branch

| Field | Value |
|-------|-------|
| **Branch** | `archon/task-feat-webpad-v1` |
| **Base** | `main` |

---

## Plan Summary

**Title**: Webpad v1

**Overview**: Extend the existing webpad playground with localStorage persistence, URL hash sharing via lz-string compression, a console/error panel (bottom drawer), and a Cmd+Enter manual run shortcut. All features are client-side with no backend involvement.

---

## Files to Change

| File | Action |
|------|--------|
| `src/components/Playground.tsx` | UPDATE — localStorage sync, URL hash sync, console message state, ConsolePanel, keyboard shortcut |
| `src/lib/buildSrcdoc.ts` | UPDATE — inject console-intercept script |
| `src/components/EditorPanel.tsx` | UPDATE — add `onKeyDown` handler for Cmd+Enter or pass through |
| `src/components/ConsolePanel.tsx` | CREATE — bottom drawer UI for console output |
| `src/lib/urlState.ts` | CREATE — encode/decode state to/from URL hash using lz-string |
| `src/lib/storage.ts` | CREATE — localStorage read/write helpers |
| `package.json` | UPDATE — add `lz-string` dependency |

Files with no change needed:
- `src/components/PreviewFrame.tsx` — postMessage received in Playground, no listener needed here
- `src/app/page.tsx` — entry point, no change needed

---

## NOT Building (Scope Limits)

**CRITICAL FOR REVIEWERS**: These items are **intentionally excluded** from scope. Do NOT flag them as bugs or missing features.

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

Additional scope limits from Decisions Log:
- Toggle for auto/manual run (debounce toggle) is deferred — v1 has always-on 500ms + Cmd+Enter only
- ConsolePanel collapsible state is deferred — fixed height (`h-48`) for v1
- `console.table`, `console.group`, etc. not intercepted — only `log`, `warn`, `error`, and `window.onerror`

---

## Validation Commands

```bash
npm run build    # TypeScript check + production build
npm run lint     # ESLint via next lint
```

Manual validation:
- Work survives browser refresh (localStorage)
- Share link roundtrip (encode → copy URL → open in new tab → same state)
- Console panel shows `console.log`, `console.warn`, `console.error` output from iframe
- Cmd+Enter triggers immediate preview rebuild
- Share URL contains hash, not query param

---

## Acceptance Criteria

- [ ] localStorage persistence: editor state survives a full page refresh
- [ ] URL hash sharing: full snippet encoded in URL hash via lz-string; opening URL restores state
- [ ] URL takes priority over localStorage (shared links override local state)
- [ ] Console panel renders `console.log`, `console.warn`, `console.error` output from iframe
- [ ] Uncaught errors from iframe appear in console panel (via `window.onerror`)
- [ ] Console messages color-coded: log=white/default, warn=yellow, error=red
- [ ] Cmd+Enter (Mac) / Ctrl+Enter (Windows) triggers immediate preview rebuild
- [ ] 500ms debounce still active — Cmd+Enter is additive, not replacing
- [ ] "Copy link" button copies current URL to clipboard
- [ ] `npm run build` passes with no TypeScript errors
- [ ] `npm run lint` passes with no ESLint errors

---

## Patterns to Mirror

| Pattern | Source File | Lines |
|---------|-------------|-------|
| State owner / debounce pattern | `src/components/Playground.tsx` | 44–70 |
| srcdoc assembly | `src/lib/buildSrcdoc.ts` | full file |
| `<\/script>` escape inside template literal | `src/lib/buildSrcdoc.ts` | (existing pattern, apply to injected script) |
| SSR guard via `next/dynamic` | `src/components/Playground.tsx` | EditorPanel import |
| iframe sandbox (null origin) | `src/components/PreviewFrame.tsx` | `sandbox="allow-scripts"` only |

---

## Key Implementation Details

### localStorage (`src/lib/storage.ts` + `Playground.tsx`)
- Key: `webpad:state`
- Format: `{ html, css, javascript }` JSON (matches `Record<Lang, string>`)
- On mount: read from storage; URL hash takes priority if present
- On change: `localStorage.setItem` inside or alongside the existing debounce `useEffect`

### URL Hash (`src/lib/urlState.ts`)
- Dependency: `lz-string@^1.5.0` (ships its own TS types — no `@types/lz-string` needed)
- Encode: `#` + `LZString.compressToEncodedURIComponent(JSON.stringify({ html, css, javascript }))`
- Decode: `window.location.hash` → `decompressFromEncodedURIComponent` → `JSON.parse`
- Strategy: auto-update hash on every change so URL is always current and shareable

### Console Intercept (`src/lib/buildSrcdoc.ts`)
- Inject script *before* user's JS that overrides `console.log/warn/error` and `window.onerror`
- Each intercept calls `window.parent.postMessage({ type: 'console', level: 'log'|'warn'|'error', args: [...] }, '*')`
- Apply `<\/script>` escape to injected script template literal

### ConsolePanel (`src/components/ConsolePanel.tsx`)
- Props: `messages: Array<{ level: 'log'|'warn'|'error', args: unknown[], id: number }>`
- Scrollable list, color-coded by level
- Layout: right column is `flex flex-col` — `flex-1` PreviewFrame + fixed-height ConsolePanel

### Message Listener (`Playground.tsx`)
- `window.addEventListener('message', handler)` in a `useEffect`
- Accept messages where `event.data?.type === 'console'` (source-checking via null-origin sandbox is sufficient)
- Append to `consoleMessages` state array

### Cmd+Enter (`Playground.tsx`)
- `useEffect` registering `keydown` on `document`
- `(e.metaKey || e.ctrlKey) && e.key === 'Enter'` → immediately call `setSrcdoc(buildSrcdoc(...))`

---

## Next Steps

1. `archon-confirm-plan` - Verify patterns still exist
2. `archon-implement-tasks` - Execute the plan
3. `archon-validate` - Run full validation
4. `archon-finalize-pr` - Create PR and mark ready
