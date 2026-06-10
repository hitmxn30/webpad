## FEATURE:

Add a file tree panel to webpad that lets users create, rename, delete, and switch between multiple files within a single project. The current model is fixed at exactly one HTML file, one CSS file, and one JS file. This feature expands that to an arbitrary collection of files of any supported language type (html, css, javascript), with a sidebar tree UI for navigation and management.

**Core behaviours:**
- A collapsible file tree sidebar sits to the left of the editor panel.
- Users can create new files, rename existing files, and delete files (with a confirmation for destructive deletes).
- Clicking a file in the tree activates it in the Monaco editor.
- The srcdoc build assembles all files: the first (or only) HTML file's `<body>` content is used as the page body, all CSS files are injected as individual `<style>` tags in `<head>` (in tree order), and all JS files are injected as individual `<script>` tags at the end of `<body>` (in tree order), after the existing console-intercept script.
- At least one HTML file must always exist (prevent deletion of the last HTML file).
- The active file is persisted in localStorage and URL hash alongside file contents.
- Drag-and-drop reordering of files within the tree controls injection order for CSS and JS.

**Out of scope for v1:**
- Folders / nested directories.
- ES module `import` resolution between files (files share a global scope via sequential `<script>` tags, same as today's single JS approach).
- Binary/asset file support.

## EXAMPLES:

The `examples/file-tree/` folder contains two reference files:

1. **`project-state-schema.json`** — the new storage/URL-hash payload shape (version 2). The top-level `files` array replaces the flat `{ html, css, javascript }` object. Each entry carries a stable `id`, a user-visible `name`, a `language` discriminant, and the editor `content`. `activeFileId` tracks the currently open file. The `version: 2` field lets the storage reader detect the old v1 shape and migrate it to a single-HTML + single-CSS + single-JS v2 project automatically.

2. **`srcdoc-multi-file-output.html`** — shows the srcdoc that `buildSrcdoc` should emit for a four-file project (one HTML, one CSS, two JS). Note the order: `<style>` tags in `<head>` from CSS files in tree order; console-intercept script first in `<body>`; then HTML body content; then one `<script>` per JS file in tree order. All CSS files are merged into `<head>` regardless of which one the user has open.

## DOCUMENTATION:

- Existing `buildSrcdoc.ts` — must be extended to accept the `files[]` array instead of three strings. Keep the existing three-string overload or migrate call sites.
- Existing `storage.ts` — `readStoredState` must handle both v1 (`{ html, css, javascript }`) and v2 (`{ version: 2, files, activeFileId }`) shapes. `writeStoredState` writes v2 only.
- Existing `urlState.ts` — same migration concern: `decodeStateFromHash` must accept both encodings; `writeHash` writes v2 only.
- Monaco language IDs: `"html"`, `"css"`, `"javascript"` — these are the valid `language` values and map 1-to-1 to Monaco's language identifiers.
- File extension → language inference for new-file creation: `.html` → `"html"`, `.css` → `"css"`, `.js` / `.jsx` / `.ts` / `.tsx` → `"javascript"`.

## OTHER CONSIDERATIONS:

**State migration (v1 → v2):**
Every existing shared URL and localStorage entry uses the flat v1 shape. The migration must be lossless: `html` → file named `index.html` with `language: "html"`, `css` → `style.css`, `javascript` → `script.js`. Run migration on read, write v2 back immediately so the URL/storage stays current.

**Deletion guard:**
Never allow deleting the last HTML file. Show a tooltip or disabled state on the delete button in that case. There is no such guard for CSS or JS files — zero of either is valid.

**File naming:**
File names must be unique within the project (case-insensitive comparison). Reject or auto-suffix duplicates on create/rename.

**srcdoc assembly edge cases:**
- Zero CSS files → no `<style>` tag injected.
- Zero JS files → no user `<script>` tags injected (console-intercept still runs).
- Multiple HTML files → only the first HTML file's `<body>` inner content is used; warn the user in the UI that only the first HTML file is rendered (the others are editable but ignored at render time). This keeps the iframe model simple without a virtual router.

**SSR / Monaco guard:**
`EditorPanel` is already dynamically imported with `ssr: false`. The new `FileTreePanel` does not use Monaco directly, so SSR is fine for it. However, `FileTreePanel` reads `window.localStorage` indirectly via the shared state — keep all reads inside `useEffect` or behind the existing `hydrated` guard in `Playground.tsx`.

**Keyboard shortcut — new file:**
`Cmd+N` / `Ctrl+N` inside the playground (not the browser's native new-window) should open a "new file" prompt. Prevent default on the keydown event.

**Sidebar width:**
Fixed at 200px by default, non-resizable in v1. Can be toggled hidden/visible with a button (or `Cmd+B` / `Ctrl+B` matching VS Code muscle memory).

**Avoid regressions:**
- Copy-link behaviour must encode the full v2 state so all files are shareable, not just the active one.
- `Cmd+Enter` immediate rebuild must still work and rebuild from the full `files[]` array.
- Console messages are per-render, not per-file — clearing the console still clears all messages.
