# Error Handling Findings: PR #1

**Reviewer**: error-handling-agent
**Date**: 2026-06-10T00:00:00Z
**Error Handlers Reviewed**: 6

---

## Summary

The PR introduces three new error boundary sites (storage read/write, URL hash decode, clipboard copy) plus a sandboxed-iframe intercept script. The storage and URL decode handlers are structured correctly with reasonable fallback logic. The one significant gap is `handleCopyLink`, which silently discards clipboard errors — leaving the user with no feedback on failure — which is likely in common browser contexts (HTTP, permission-denied).

**Verdict**: REQUEST_CHANGES

---

## Findings

### Finding 1: Clipboard Copy Fails Silently — User Gets No Feedback

**Severity**: HIGH
**Category**: silent-failure | poor-user-feedback
**Location**: `src/components/Playground.tsx:130-138`

**Issue**:
When `navigator.clipboard.writeText` throws (e.g., `NotAllowedError` on HTTP pages, in iframes without `clipboard-write` permission, or in browsers that require an explicit permission grant), the catch block discards the error entirely. The button label stays "Copy link" — unchanged — giving the user no indication the operation failed. The user may believe the link is on their clipboard and paste elsewhere only to discover nothing was copied.

**Evidence**:
```typescript
// src/components/Playground.tsx:130-138
async function handleCopyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  } catch {
    // ignore
  }
}
```

**Hidden Errors**:
This catch block could silently hide:
- `NotAllowedError`: clipboard API blocked when page is served over HTTP (non-secure context)
- `NotAllowedError`: clipboard permission revoked or denied at OS / browser level
- `SecurityError`: called from a cross-origin iframe that lacks `clipboard-write` permission
- `TypeError`: `navigator.clipboard` is `undefined` in very old browser versions

**User Impact**:
User clicks "Copy link", sees no visual change (stays "Copy link"), pastes the URL somewhere — and nothing is there. Shareable links are a core v1 feature; a silent failure here defeats the feature without the user knowing.

---

#### Fix Suggestions

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Show "Failed — copy manually" label for 1.5s on catch | Actionable feedback, no new UI required | Message may be slightly alarming |
| B | Fallback to `window.prompt(...)` with the URL pre-selected | Works in all browsers/contexts without permission | Modal is intrusive; slightly dated UX |
| C | Log `console.error` + show "Failed — copy manually" | Aids debugging + user feedback | Minor |

**Recommended**: Option A (with optional Option C added)

**Reasoning**:
The clipboard API fails silently in too many real-world conditions (HTTP local dev, some corporate browsers, older Safari) to ignore. The simplest fix reuses the existing `copied` toggle pattern — just add a `failed` state and show a brief error label. Matches project's no-backend, no-modal approach. Option B is browser-native but adds an intrusive modal; Option A is less disruptive and consistent with the existing button-state feedback pattern.

**Recommended Fix**:
```typescript
// src/components/Playground.tsx
const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

async function handleCopyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    setCopyState("copied");
  } catch {
    setCopyState("failed");
  } finally {
    setTimeout(() => setCopyState("idle"), 1500);
  }
}

// In JSX:
// {copyState === "copied" ? "Copied!" : copyState === "failed" ? "Failed — copy manually" : "Copy link"}
```

---

### Finding 2: Silent Discard on URL Hash Decode Failure — User Gets Default State With No Context

**Severity**: MEDIUM
**Category**: silent-failure | poor-user-feedback
**Location**: `src/lib/urlState.ts:12-26`

**Issue**:
When `decodeStateFromHash` fails (malformed/truncated URL, LZString returns `null`, JSON parse error), the function returns `null` and execution falls through to `readStoredState()` then `DEFAULT_STATE`. No log, no UI signal. A user who receives a shared URL that was truncated (common when pasted into Slack, email, SMS) silently sees the default editor content with no indication that the URL they visited contained someone else's code.

**Evidence**:
```typescript
// src/lib/urlState.ts:12-26
try {
  const decompressed = LZString.decompressFromEncodedURIComponent(raw);
  if (!decompressed) return null;
  const parsed = JSON.parse(decompressed) as Partial<EditorState>;
  if (
    typeof parsed.html === "string" &&
    typeof parsed.css === "string" &&
    typeof parsed.javascript === "string"
  ) {
    return { html: parsed.html, css: parsed.css, javascript: parsed.javascript };
  }
  return null;
} catch {
  return null;
}
```

**Hidden Errors**:
This catch block could silently hide:
- `SyntaxError` from `JSON.parse`: LZString decompressed into garbage (truncated share URL)
- Any internal `LZString` error: unexpected input format
- Shape mismatch without error: gracefully returns `null` but caller has no way to distinguish "no hash" from "bad hash"

**User Impact**:
User receives a share link for a snippet. Link was truncated by Slack's URL preview. User visits the URL (the `#` fragment is present but corrupted). They see the default boilerplate instead of the shared code. They assume the tool is broken, or think the sender sent the wrong link. There is no way to distinguish "URL had no hash" from "URL had a bad hash" in the current API.

---

#### Fix Suggestions

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Add `console.warn` on decode failure when hash is non-empty | Aids debugging in DevTools, zero UI change | Developer-only; user still gets no feedback |
| B | Return a tagged result `{state, error}` so caller can show a toast | Full feedback path, user knows share failed | Requires caller change in `Playground.tsx` |
| C | `console.warn` + show one-time banner "Shared link couldn't be decoded" | Best UX for the share feature | Small amount of extra state in `Playground.tsx` |

**Recommended**: Option A (immediate low-cost win) with Option C as a follow-up

**Reasoning**:
A `console.warn` in `decodeStateFromHash` costs two lines and immediately helps anyone debugging a truncated URL in DevTools. The more complete fix (Option C, a dismissible banner) requires a small state addition in `Playground.tsx` but is the right UX given that share links are a v1 headline feature. Option A can ship now; Option C is a clean follow-up.

**Recommended Fix (Option A)**:
```typescript
// src/lib/urlState.ts
export function decodeStateFromHash(hash: string): EditorState | null {
  if (!hash) return null;
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(raw);
    if (!decompressed) {
      console.warn("[webpad] URL hash present but decompression returned empty — truncated share link?");
      return null;
    }
    const parsed = JSON.parse(decompressed) as Partial<EditorState>;
    if (
      typeof parsed.html === "string" &&
      typeof parsed.css === "string" &&
      typeof parsed.javascript === "string"
    ) {
      return { html: parsed.html, css: parsed.css, javascript: parsed.javascript };
    }
    console.warn("[webpad] URL hash decoded but missing expected shape fields.");
    return null;
  } catch (err) {
    console.warn("[webpad] URL hash decode failed:", err);
    return null;
  }
}
```

---

### Finding 3: localStorage Write Fails Silently — No User Indication That Persistence Is Broken

**Severity**: LOW
**Category**: silent-failure | poor-user-feedback
**Location**: `src/lib/storage.ts:28-34`

**Issue**:
`writeStoredState` silently discards `QuotaExceededError` and `SecurityError`. In private browsing mode on some browsers (e.g., Safari prior to ITP changes), `localStorage.setItem` throws a `SecurityError`. A user editing code in private mode will never see their work persisted — every reload restores the default — with no indication this is happening.

**Evidence**:
```typescript
// src/lib/storage.ts:28-34
export function writeStoredState(state: EditorState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / disabled storage
  }
}
```

**Hidden Errors**:
This catch block could silently hide:
- `SecurityError`: localStorage blocked in private browsing (Safari), sandboxed iframes, or strict browser policy
- `QuotaExceededError`: localStorage full (5MB default limit; unlikely for editor state but possible if browser storage is nearly full)
- `DOMException`: storage disabled by user browser preference

**User Impact**:
User edits code in a private browsing session, closes the tab, reopens the page — all work is gone. With no "persistence unavailable" indicator, the user attributes this to a bug or unexpected behavior and may lose non-trivial work. URL-based sharing still works as a mitigation, but the user doesn't know to use it.

---

#### Fix Suggestions

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Add `console.warn` on first catch, throttle subsequent | Helps debugging, zero UI change | User still unaware |
| B | Return `boolean` success and show a one-time status indicator | User knows persistence is off | Requires UI plumbing |
| C | Accept silent failure, document in CLAUDE.md | Minimal code change | User data-loss risk undocumented |

**Recommended**: Option A

**Reasoning**:
The comment "ignore quota / disabled storage" documents intent and the fallback is acceptable for v1. However, a `console.warn` on first write failure costs nothing and surfaces the issue immediately during development/testing. Full UI indication (Option B) is a good v2 addition but is out of scope per the "No backend / no auth" exclusion list. Option C leaves a silent data-loss risk with no trail.

**Recommended Fix**:
```typescript
export function writeStoredState(state: EditorState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[webpad] localStorage write failed (private browsing or quota exceeded):", err);
  }
}
```

---

## Error Handler Audit

| Location | Type | Logging | User Feedback | Specificity | Verdict |
|----------|------|---------|---------------|-------------|---------|
| `storage.ts:11-25` `readStoredState` | try-catch | NONE | N/A (fallback) | GOOD — shape-validates after parse | PASS |
| `storage.ts:28-34` `writeStoredState` | try-catch | NONE | NONE | GOOD — comment explains intent | LOW ISSUE |
| `urlState.ts:12-26` `decodeStateFromHash` | try-catch | NONE | NONE | GOOD — shape-validates after decode | MEDIUM ISSUE |
| `Playground.tsx:130-138` `handleCopyLink` | try-catch (async) | NONE | NONE | BROAD — catches all errors | HIGH ISSUE |
| `buildSrcdoc.ts:4-10` CONSOLE_INTERCEPT outer | try-catch (JS in string) | N/A | N/A | Intentional silent guard | PASS |
| `buildSrcdoc.ts:7` CONSOLE_INTERCEPT inner | try-catch (JS in string) | N/A | N/A | Catches JSON.stringify circular refs | PASS |
| `ConsolePanel.tsx:31-35` `formatArg` | try-catch | NONE | Falls back to `String(arg)` | Catches circular JSON | PASS |

---

## Statistics

| Severity | Count | Auto-fixable |
|----------|-------|--------------|
| CRITICAL | 0 | 0 |
| HIGH | 1 | 1 |
| MEDIUM | 1 | 1 |
| LOW | 1 | 1 |

---

## Silent Failure Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Clipboard copy silently fails (HTTP, permission denied) | HIGH — common in dev/HTTP contexts | User believes link copied; shares nothing | Show "Failed — copy manually" label on catch |
| Shared URL truncated, user sees default state | MEDIUM — URL truncation is common in messaging apps | Confusing UX; makes share feature appear broken | `console.warn` + optional decode-failure banner |
| localStorage writes fail silently in private browsing | MEDIUM — Safari private mode, some strict policies | User loses work on reload with no warning | `console.warn` on write failure |
| `LZString.compressToEncodedURIComponent` returns empty string | LOW — only on empty/null input; state always has strings | Hash set to `#` — triggers non-`null` path on next decode | Input is always a valid `EditorState`; low risk |

---

## Patterns Referenced

| File | Lines | Pattern |
|------|-------|---------|
| `src/lib/storage.ts` | 11–25 | Parse + shape-validate pattern: JSON.parse inside try, then typeof checks on each field before trusting the value |
| `src/lib/urlState.ts` | 12–26 | Decompress + shape-validate pattern: mirrors `readStoredState` structure, consistent validation approach |
| `src/components/ConsolePanel.tsx` | 31–35 | Display fallback: try JSON.stringify, catch circular refs, fall back to String() |
| `src/lib/buildSrcdoc.ts` | 4–10 | Sandboxed script intercept: outer catch prevents intercept crash from affecting user code execution |

---

## Positive Observations

- **Shape validation is consistent and correct**: Both `readStoredState` and `decodeStateFromHash` independently validate each field as a string before returning — not just trusting the `as` cast. This correctly prevents malformed data from entering editor state.
- **`EditorState` is re-exported as a shared type**: Defining the shape in `storage.ts` and re-importing in `urlState.ts` avoids drift between the two serialization paths.
- **CONSOLE_INTERCEPT guard is appropriate**: The outer `try/catch(e){}` in the injected iframe script is correct defensive coding — the intercept must not crash user code, and there's no safe place inside the sandbox to log errors without risking infinite recursion.
- **`hydrated` flag prevents persistence on pre-mount state**: The `if (!hydrated) return` guard in the debounce effect correctly prevents `writeStoredState`/`writeHash` from being called with `DEFAULT_STATE` before the hash/localStorage has been read, avoiding overwriting stored state on load.
- **`postMessage` handler validates type and level**: The `handler` in `Playground.tsx` (lines 100-109) correctly checks `data.type === "console"` and validates `level` against the allowed union before processing, preventing spoofed messages from injecting unexpected data.

---

## Metadata

- **Agent**: error-handling-agent
- **Timestamp**: 2026-06-10T00:00:00Z
- **Artifact**: `/Users/saurabhsuryavanshi/.archon/workspaces/D/webpad/worktrees/archon/task-feat-webpad-v1/.archon/artifacts/runs/f3e668e0fed1343f350215ea925e7cf2/review/error-handling-findings.md`
