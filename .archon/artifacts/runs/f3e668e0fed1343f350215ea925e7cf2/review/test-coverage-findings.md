# Test Coverage Findings: PR #1

**Reviewer**: test-coverage-agent
**Date**: 2026-06-10T00:00:00Z
**Source Files**: 5
**Test Files**: 0

---

## Summary

This PR introduces five new/modified source files with zero corresponding tests. The repository has no test suite configured at all (`npm test` does not exist). Three of the five source files are pure utility functions (`storage.ts`, `urlState.ts`, `buildSrcdoc.ts`) that are highly testable and contain non-trivial logic — the most critical being URL hash decode/encode and the `<\/script>` escape in `buildSrcdoc.ts`. Since the project deliberately ships without a test suite (per CLAUDE.md), this finding documents the gaps rather than blocking the PR outright.

**Verdict**: NEEDS_DISCUSSION

---

## Coverage Map

| Source File | Test File | New Code Tested | Modified Code Tested |
|-------------|-----------|-----------------|---------------------|
| `src/lib/storage.ts` | (missing) | NONE | N/A |
| `src/lib/urlState.ts` | (missing) | NONE | N/A |
| `src/lib/buildSrcdoc.ts` | (missing) | NONE | NONE |
| `src/components/ConsolePanel.tsx` | (missing) | NONE | N/A |
| `src/components/Playground.tsx` | (missing) | NONE | NONE |

---

## Findings

### Finding 1: `<\/script>` Escape Must Survive Console Intercept Injection

**Severity**: CRITICAL
**Category**: missing-edge-case
**Location**: `src/lib/buildSrcdoc.ts:28` (source)
**Criticality Score**: 9

**Issue**:
`buildSrcdoc` now injects two `<script>` blocks: the CONSOLE_INTERCEPT block and the user's JS. The original `<\/script>` escape guards user-typed `</script>` from breaking the outer template literal, but the CONSOLE_INTERCEPT script itself is a constant string embedded with a raw `<\/script>` in the template. If a future maintainer edits CONSOLE_INTERCEPT to include literal `</script>` text (e.g., a comment or a string literal inside the IIFE), it will silently truncate the srcdoc — the test for user JS would still pass but the intercept script would break.

**Untested Code**:
```typescript
// src/lib/buildSrcdoc.ts:28
return `<!DOCTYPE html>...<script>${CONSOLE_INTERCEPT}<\/script><script>${js}<\/script></body></html>`;
```

**Why This Matters**:
- A future change to CONSOLE_INTERCEPT that accidentally includes `</script>` (in a comment or string) would cause the intercept script to be truncated without any error.
- User JS containing `</script>` must still be correctly escaped; this invariant is easy to regress silently.
- This is the one correctness invariant the CLAUDE.md explicitly calls out as "intentional."

---

#### Test Suggestions

| Option | Approach | Catches | Effort |
|--------|----------|---------|--------|
| A | Pure unit test on `buildSrcdoc` output string | `</script>` escaping, script block presence, srcdoc structure | LOW |
| B | Snapshot test of `buildSrcdoc` output | Full structure regression including CONSOLE_INTERCEPT content | LOW |

**Recommended**: Option A

**Reasoning**:
- Behavioral assertions ("the string must not contain unescaped `</script>` except at structural positions") catch the actual failure mode.
- Pure function — no DOM or browser needed, runs in Node.
- LOW effort, HIGH protection of an explicitly called-out invariant.

**Recommended Test**:
```typescript
// src/lib/buildSrcdoc.test.ts
import { buildSrcdoc } from "./buildSrcdoc";

describe("buildSrcdoc", () => {
  it("produces a valid HTML string with injected css and js", () => {
    const result = buildSrcdoc("<p>hi</p>", "body{color:red}", "console.log(1)");
    expect(result).toContain("<style>body{color:red}</style>");
    expect(result).toContain("<p>hi</p>");
    expect(result).toContain("console.log(1)");
  });

  it("escapes </script> in user js to prevent srcdoc truncation", () => {
    const result = buildSrcdoc("", "", "var s = '</script>';");
    // The literal </script> in user JS must be escaped so the srcdoc doesn't break
    expect(result).not.toMatch(/<\/script>(?!.*<\/script>)/); // only structural closing tags remain
    expect(result).toContain('<\\/script>');
  });

  it("includes console intercept script before user script", () => {
    const result = buildSrcdoc("", "", "");
    const interceptIdx = result.indexOf("window.parent.postMessage");
    const userScriptIdx = result.lastIndexOf("<script>");
    expect(interceptIdx).toBeGreaterThan(-1);
    expect(interceptIdx).toBeLessThan(userScriptIdx);
  });
});
```

---

### Finding 2: `decodeStateFromHash` — Malformed / Adversarial Hash Inputs

**Severity**: HIGH
**Category**: missing-edge-case
**Location**: `src/lib/urlState.ts:9-28` (source)
**Criticality Score**: 8

**Issue**:
`decodeStateFromHash` is the entry point for untrusted data (the URL hash can be crafted by anyone sharing a link). The function handles empty string, missing `#`, decompression failure, and partial shape — but these branches have no tests. A regression here (e.g., forgetting the `if (!decompressed) return null` guard) would silently cause the editor to mount with broken state when opening a shared link.

**Untested Code**:
```typescript
// src/lib/urlState.ts:9-28
export function decodeStateFromHash(hash: string): EditorState | null {
  if (!hash) return null;
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(raw);
    if (!decompressed) return null;
    const parsed = JSON.parse(decompressed) as Partial<EditorState>;
    if (typeof parsed.html === "string" && ...) { return ...; }
    return null;
  } catch { return null; }
}
```

**Why This Matters**:
- Malformed shared URLs (e.g., a hash from a different tool, a truncated copy-paste) must silently fall back to defaults — not crash or render blank.
- The encode→decode round-trip is the correctness guarantee for URL sharing; an untested compression mismatch would break all shared links.

---

#### Test Suggestions

| Option | Approach | Catches | Effort |
|--------|----------|---------|--------|
| A | Unit tests for all `decodeStateFromHash` branches + round-trip test | All edge cases, regression on guard removals | LOW |
| B | Property-based test (fast-check) encode/decode round-trip | Arbitrary content round-trips | MED |

**Recommended**: Option A

**Reasoning**:
- All branches are deterministic and require no browser.
- Round-trip test directly validates the URL sharing feature end-to-end (encode+decode).
- LOW effort with strong coverage of the security-relevant input validation.

**Recommended Test**:
```typescript
// src/lib/urlState.test.ts
import { encodeStateToHash, decodeStateFromHash, writeHash } from "./urlState";

const VALID: EditorState = { html: "<p>hi</p>", css: "body{}", javascript: "console.log(1)" };

describe("decodeStateFromHash", () => {
  it("returns null for empty string", () => {
    expect(decodeStateFromHash("")).toBeNull();
  });

  it("returns null for hash-only (#)", () => {
    expect(decodeStateFromHash("#")).toBeNull();
  });

  it("returns null for garbage data", () => {
    expect(decodeStateFromHash("#!!!notvalidlz!!!")).toBeNull();
  });

  it("returns null when decompressed JSON is missing keys", () => {
    // Encode an object with only html
    const partial = LZString.compressToEncodedURIComponent(JSON.stringify({ html: "<p/>" }));
    expect(decodeStateFromHash(`#${partial}`)).toBeNull();
  });

  it("round-trips a valid state through encode→decode", () => {
    const hash = encodeStateToHash(VALID);
    const result = decodeStateFromHash(`#${hash}`);
    expect(result).toEqual(VALID);
  });

  it("handles hash without leading # character", () => {
    const hash = encodeStateToHash(VALID);
    expect(decodeStateFromHash(hash)).toEqual(VALID);
  });
});
```

---

### Finding 3: `readStoredState` — Partial / Corrupt localStorage Data

**Severity**: HIGH
**Category**: missing-edge-case
**Location**: `src/lib/storage.ts:11-25` (source)
**Criticality Score**: 7

**Issue**:
`readStoredState` defensively handles corrupt JSON and partial shapes. But these guards are untested. If a bug removes the `typeof parsed.css === "string"` check, users with old/partial localStorage data would see a runtime error on mount instead of falling back to defaults.

**Untested Code**:
```typescript
// src/lib/storage.ts:11-25
const parsed = JSON.parse(raw) as Partial<EditorState>;
if (
  typeof parsed.html === "string" &&
  typeof parsed.css === "string" &&
  typeof parsed.javascript === "string"
) {
  return { html: parsed.html, css: parsed.css, javascript: parsed.javascript };
}
return null;
```

**Why This Matters**:
- If a user's localStorage is from an old version (missing `javascript` key), the app must fall back to defaults without crashing.
- Any future refactor that loosens the shape check (e.g., making fields optional) would silently regress persistence behavior — tests would catch this.

---

#### Test Suggestions

| Option | Approach | Catches | Effort |
|--------|----------|---------|--------|
| A | Unit tests with `localStorage` mock | All validation branches, round-trip write/read | LOW |

**Recommended**: Option A

**Recommended Test**:
```typescript
// src/lib/storage.test.ts
import { readStoredState, writeStoredState } from "./storage";

const VALID: EditorState = { html: "<p/>", css: "body{}", javascript: "var x=1;" };

beforeEach(() => localStorage.clear());

describe("readStoredState", () => {
  it("returns null when no key exists", () => {
    expect(readStoredState()).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    localStorage.setItem("webpad:state", "{not json}");
    expect(readStoredState()).toBeNull();
  });

  it("returns null for partial shape (missing css)", () => {
    localStorage.setItem("webpad:state", JSON.stringify({ html: "", javascript: "" }));
    expect(readStoredState()).toBeNull();
  });

  it("returns valid state when all keys present", () => {
    localStorage.setItem("webpad:state", JSON.stringify(VALID));
    expect(readStoredState()).toEqual(VALID);
  });
});

describe("writeStoredState / readStoredState round-trip", () => {
  it("persists and retrieves state correctly", () => {
    writeStoredState(VALID);
    expect(readStoredState()).toEqual(VALID);
  });
});
```

---

### Finding 4: `formatArg` in ConsolePanel — Edge Cases for Error Objects and Circular References

**Severity**: MEDIUM
**Category**: missing-edge-case
**Location**: `src/components/ConsolePanel.tsx:24-37` (source)
**Criticality Score**: 5

**Issue**:
`formatArg` is a pure function that formats console output. It handles null, undefined, primitives, `__error` objects, and falls back to `JSON.stringify`. The circular reference path (the `catch` on `JSON.stringify`) has no test. If `__error` duck-typing is accidentally removed or broken, error messages would display as `[object Object]`.

**Untested Code**:
```typescript
function formatArg(arg: unknown): string {
  if (arg === null) return "null";
  if (arg === undefined) return "undefined";
  if (typeof arg === "string") return arg;
  if (typeof arg === "number" || typeof arg === "boolean") return String(arg);
  if (typeof arg === "object" && arg !== null && "__error" in arg) { ... }
  try { return JSON.stringify(arg); } catch { return String(arg); }
}
```

**Why This Matters**:
- If a user's code throws an Error, the console panel should show a readable message — not `[object Object]`. A regression here degrades the debugging UX.
- Circular reference objects (e.g., `var o = {}; o.self = o; console.log(o)`) should not throw — the `catch` path must remain.

---

#### Test Suggestions

| Option | Approach | Catches | Effort |
|--------|----------|---------|--------|
| A | Unit test exported `formatArg` (requires exporting it) | All branches including circular | LOW |
| B | Render test for `ConsolePanel` with varied message types | Integration-level check | MED |

**Recommended**: Option A (export `formatArg` for testability)

**Recommended Test**:
```typescript
// src/components/ConsolePanel.test.ts
import { formatArg } from "./ConsolePanel"; // requires exporting the function

describe("formatArg", () => {
  it("formats null", () => expect(formatArg(null)).toBe("null"));
  it("formats undefined", () => expect(formatArg(undefined)).toBe("undefined"));
  it("formats string", () => expect(formatArg("hello")).toBe("hello"));
  it("formats number", () => expect(formatArg(42)).toBe("42"));
  it("formats boolean", () => expect(formatArg(false)).toBe("false"));
  it("formats __error object", () => {
    expect(formatArg({ __error: true, name: "TypeError", message: "bad" }))
      .toBe("TypeError: bad");
  });
  it("formats plain object as JSON", () => {
    expect(formatArg({ a: 1 })).toBe('{"a":1}');
  });
  it("handles circular reference gracefully", () => {
    const o: Record<string, unknown> = {};
    o.self = o;
    expect(() => formatArg(o)).not.toThrow();
    expect(formatArg(o)).toBe("[object Object]");
  });
});
```

---

### Finding 5: `resolveInitialState` Priority Order (Hash > Storage > Default)

**Severity**: MEDIUM
**Category**: missing-test
**Location**: `src/components/Playground.tsx:57-64` (source)
**Criticality Score**: 6

**Issue**:
`resolveInitialState` defines the hydration priority: URL hash wins over localStorage, which wins over defaults. This ordering is a product decision (a shared link should always override local drafts). It is currently untested. Swapping the priority order (e.g., localStorage checked first) would silently break URL sharing for users who have prior local state.

**Untested Code**:
```typescript
function resolveInitialState(): EditorState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  const fromHash = decodeStateFromHash(window.location.hash);
  if (fromHash) return fromHash;
  const fromStorage = readStoredState();
  if (fromStorage) return fromStorage;
  return DEFAULT_STATE;
}
```

**Why This Matters**:
- "A shared link must override local edits" is the UX contract for URL sharing. If priority flips, users receiving a shared link who already have code in localStorage will see their own code instead of the shared code — a confusing silent failure.

---

#### Test Suggestions

| Option | Approach | Catches | Effort |
|--------|----------|---------|--------|
| A | Export `resolveInitialState`, unit test with mocked `window.location.hash` and `localStorage` | Priority order, SSR guard | MED |

**Recommended**: Option A

**Recommended Test**:
```typescript
import { resolveInitialState } from "./Playground"; // requires exporting

describe("resolveInitialState", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset hash
    Object.defineProperty(window, 'location', { value: { hash: '' }, writable: true });
  });

  it("returns DEFAULT_STATE when no hash and no storage", () => {
    expect(resolveInitialState()).toEqual(DEFAULT_STATE);
  });

  it("prefers URL hash over localStorage", () => {
    writeStoredState(STORAGE_STATE);
    const hash = encodeStateToHash(HASH_STATE);
    window.location.hash = `#${hash}`;
    expect(resolveInitialState()).toEqual(HASH_STATE);
  });

  it("falls back to localStorage when no hash", () => {
    writeStoredState(STORAGE_STATE);
    window.location.hash = "";
    expect(resolveInitialState()).toEqual(STORAGE_STATE);
  });
});
```

---

## Test Quality Audit

No tests exist in this PR or the repository. N/A.

---

## Statistics

| Severity | Count | Criticality 8-10 | Criticality 5-7 | Criticality 1-4 |
|----------|-------|------------------|-----------------|-----------------|
| CRITICAL | 1 | 1 | - | - |
| HIGH | 2 | 1 | 1 | - |
| MEDIUM | 2 | - | 2 | - |
| LOW | 0 | - | - | - |

---

## Risk Assessment

| Untested Area | Failure Mode | User Impact | Priority |
|---------------|--------------|-------------|----------|
| `</script>` escape in `buildSrcdoc` | Future CONSOLE_INTERCEPT edit silently truncates srcdoc | All user JS stops running in preview | CRITICAL |
| `decodeStateFromHash` guards | Corrupt shared URL crashes app or shows blank editor | URL sharing feature silently broken | HIGH |
| `readStoredState` shape validation | Missing key in old localStorage → runtime error on mount | App fails to load for returning users | HIGH |
| Priority order in `resolveInitialState` | Swapped priority means shared links don't override local state | URL sharing UX broken for users with saved state | MEDIUM |
| `formatArg` edge cases | Error objects display as `[object Object]` | Console panel unreadable for thrown errors | MEDIUM |

---

## Patterns Referenced

No existing tests in the codebase. Suggested tests follow Jest + Testing Library patterns standard for Next.js projects (`@testing-library/react`, `jest-environment-jsdom`).

---

## Positive Observations

- All three utility files (`storage.ts`, `urlState.ts`, `buildSrcdoc.ts`) are **pure functions or functions with clear side effects** — they are maximally testable with zero browser/DOM setup.
- The defensive coding is thorough: every external data source (localStorage, URL hash, postMessage) validates shape before use. Tests would just verify these guards remain intact.
- The `writeHash` no-op guard (`if (window.location.hash !== newHash)`) prevents redundant `replaceState` calls — a subtle correctness detail worth a regression test.
- The postMessage handler correctly validates `data.type === "console"` and level membership before acting — good defensive practice.

---

## Setup Note

To add tests to this project, install Jest + jsdom + Testing Library:

```bash
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom ts-jest
```

The pure utility functions (`storage.ts`, `urlState.ts`, `buildSrcdoc.ts`) can be tested immediately with `jest-environment-jsdom` for `localStorage` and `window` access — no React or component rendering needed. Starting with Finding 1 (`buildSrcdoc`) and Finding 2 (`decodeStateFromHash`) gives the highest return per line of test code.

---

## Metadata

- **Agent**: test-coverage-agent
- **Timestamp**: 2026-06-10T00:00:00Z
- **Artifact**: `/Users/saurabhsuryavanshi/.archon/workspaces/D/webpad/worktrees/archon/task-feat-webpad-v1/.archon/artifacts/runs/f3e668e0fed1343f350215ea925e7cf2/review/test-coverage-findings.md`
