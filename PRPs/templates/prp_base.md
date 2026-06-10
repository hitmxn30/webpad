# PRP: {Feature Name}

## Goal

One sentence: what this feature does and why it matters to the user.

## Why

- Problem or gap this solves
- Who benefits and how
- Why now / what unblocks

## What

Precise description of the feature from the user's perspective. Include:
- Inputs / triggers
- Expected outputs / side effects
- Out of scope (explicit)

---

## All Needed Context

### Documentation & References

<!-- Paste specific URLs the agent should read, with a one-line note on what to look for -->
- URL — what section / why relevant

### Existing Codebase Patterns to Follow

<!-- Paste real snippets or file paths the agent must mirror -->

```ts
// Example: how state is managed in Playground.tsx
const [values, setValues] = useState<Record<Lang, string>>({ ... });
useEffect(() => {
  const id = setTimeout(() => ..., 500);
  return () => clearTimeout(id);
}, [values]);
```

Key files:
- `src/components/Playground.tsx` — state owner, layout
- `src/components/EditorPanel.tsx` — tab bar + Monaco instance
- `src/components/PreviewFrame.tsx` — sandboxed iframe
- `src/lib/buildSrcdoc.ts` — pure srcdoc assembly

### Gotchas & Constraints

- Monaco must be loaded via `dynamic(..., { ssr: false })` — it accesses `window` at import time
- iframe uses `sandbox="allow-scripts"` only; omitting `allow-same-origin` is intentional
- `<\/script>` escape inside srcdoc template literal is intentional — do not remove
- `automaticLayout: true` on Monaco is required for correct resize behaviour
- No test suite exists; validation is `tsc --noEmit` + `npm run lint` + `npm run build`

---

## Implementation Blueprint

### Pseudocode

```
// High-level steps — not real code, just the logical sequence
1. ...
2. ...
3. ...
```

### Tasks (in order)

- [ ] Task 1 — file to create/edit, what changes
- [ ] Task 2
- [ ] Task 3
- [ ] ...

### Error Handling

- What can go wrong at each step
- How to surface errors to the user (or silently recover)

---

## Validation Gates

Run these in order. All must pass before the PRP is considered complete.

```bash
# 1. Type safety
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Production build (catches tree-shaking and SSR errors)
npm run build
```

Manual smoke test (run `npm run dev`, open http://localhost:3000):
- [ ] Describe the exact interaction to verify the feature works
- [ ] Describe the edge case to verify it is handled

---

## Confidence Score

**X / 10** — one sentence explaining what would need to be true to reach 10.
