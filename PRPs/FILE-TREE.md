# PRP: File Tree and Multi-File Management

## Goal

Add a collapsible file-tree sidebar so users can create, rename, delete, and reorder multiple HTML/CSS/JS files within one webpad project, replacing the hardcoded three-tab model.

## Why

- Current model locks users to exactly one HTML file, one CSS file, one JS file — no way to organise code across multiple files
- Multi-file support is a baseline expectation for any playground after a project grows beyond ~100 lines
- Every shared URL and localStorage entry must continue working (v1 → v2 migration is lossless and transparent)

## What

**From the user's perspective:**
- A 200 px fixed-width sidebar sits left of the Monaco editor and lists all project files in order
- Clicking a file opens it in the editor; the Monaco editor switches language mode and value instantly
- Double-clicking a filename enters inline rename mode; pressing Enter/Escape confirms/cancels
- A "+" button (and `Cmd/Ctrl+N`) appends a new file; the user types a filename with extension; language is inferred from the extension
- Hovering a row reveals a delete `×` button; clicking it calls `window.confirm`; the last HTML file's delete button is disabled
- Files can be reordered by dragging; CSS injection order and JS script-tag order follow the tree order
- `Cmd/Ctrl+B` toggles the sidebar; state (sidebar open/closed) is local and not persisted
- Copy-link encodes ALL files (v2 state), not just the active one

**Out of scope for v1:** folders, ES module resolution, binary assets, resizable sidebar

---

## All Needed Context

### Reference Files in This Repo

Read these before implementing. Exact paths from repo root:

| File | What to absorb |
|---|---|
| `src/components/Playground.tsx` | State owner — all state, effects, layout, keyboard handlers |
| `src/components/EditorPanel.tsx` | Monaco integration, options, `automaticLayout`, `"use client"` |
| `src/components/ConsolePanel.tsx` | Tailwind dark-theme patterns: `bg-gray-900`, `border-gray-700`, sizing |
| `src/lib/buildSrcdoc.ts` | `CONSOLE_INTERCEPT` constant, `<\/script>` escape convention |
| `src/lib/storage.ts` | `readStoredState` / `writeStoredState` shape and error-swallowing pattern |
| `src/lib/urlState.ts` | `LZString`, `history.replaceState`, hash read/write pattern |
| `prds/examples/file-tree/project-state-schema.json` | Exact v2 JSON shape to implement |
| `prds/examples/file-tree/srcdoc-multi-file-output.html` | Exact srcdoc output to produce |

### Existing Patterns to Mirror

**1. Debounced effect + cleanup (Playground.tsx)**
```ts
useEffect(() => {
  if (!hydrated) return;
  const id = setTimeout(() => {
    rebuild(values);
    writeStoredState(values);
    writeHash(values);
  }, 500);
  return () => clearTimeout(id);
}, [values, hydrated, rebuild]);
```
The new version replaces `values` with `project` (ProjectState). Same debounce, same cleanup.

**2. Hydration guard (Playground.tsx)**
```ts
const [hydrated, setHydrated] = useState(false);
useEffect(() => {
  const initial = resolveInitialState();
  setValues(initial);
  setHydrated(true);
}, []);
```
`resolveInitialState()` will return `ProjectState` instead of `EditorState`. Same pattern.

**3. Keyboard handler cleanup (Playground.tsx)**
```ts
useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      rebuild(values);
    }
  }
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}, [values, rebuild]);
```
Add `Cmd+B` (toggle sidebar) and `Cmd+N` (open new-file input) in this same handler.

**4. Monaco options (EditorPanel.tsx)**
```tsx
<Editor
  height="100%"
  language={active}
  value={values[active]}
  theme="vs-dark"
  onChange={(v) => onChange(active, v ?? "")}
  options={{
    minimap: { enabled: false },
    fontSize: 14,
    wordWrap: "on",
    scrollBeyondLastLine: false,
    automaticLayout: true,  // REQUIRED for resize correctness
  }}
/>
```
In the new version add `path={file.id}` — this tells `@monaco-editor/react` to create/reuse one model per path, preserving per-file undo history automatically.

**5. Storage read with validation (storage.ts)**
```ts
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
The new version must detect both v1 (no `version` field) and v2 (`version === 2`) shapes.

**6. Tailwind dark-theme classes (from all components)**
```
bg-gray-950   // page background, Monaco area
bg-gray-900   // panel headers, sidebar header
bg-gray-800   // active/hover states in lists
border-gray-700  // all panel dividers
text-gray-400 // muted labels
text-gray-300 // secondary labels
text-white    // active/selected
text-xs       // all UI chrome
```

### Documentation & References

- `@monaco-editor/react` path prop (model per file): https://github.com/suren-atoyan/monaco-react#multi-model-editor — look for the `path` prop and `keepCurrentModel` section. Using `path={fileId}` caches a Monaco model per path, giving free per-file undo history.
- Monaco language IDs: `"html"`, `"css"`, `"javascript"` — map directly to Monaco's identifiers. `.js`, `.jsx`, `.ts`, `.tsx` all map to `"javascript"`.
- HTML5 Drag and Drop API: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API — use `draggable`, `onDragStart`, `onDragOver` (must call `e.preventDefault()` to enable drop), `onDrop`, `onDragEnd`.
- `lz-string` API: https://github.com/pieroxy/lz-string — `LZString.compressToEncodedURIComponent(str)` / `LZString.decompressFromEncodedURIComponent(str)` — same as current usage, no version change needed.
- Next.js dynamic import: https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading — `dynamic(() => import(...), { ssr: false })` — FileTreePanel does NOT need this guard (no `window` access at module level), only EditorPanel does.

### Gotchas & Constraints

1. **`<\/script>` escape is intentional** — in `buildSrcdoc.ts`, the template literal uses `<\/script>` (not `</script>`) wherever a script tag closes inside the template. This prevents the literal string `</script>` appearing in the TypeScript source and breaking the outer srcdoc string. You MUST continue this pattern for every script tag in the new multi-file implementation. Pattern: `<script>${content}<\/script>`.

2. **Monaco SSR crash** — `EditorPanel` MUST remain loaded via `dynamic(..., { ssr: false })` in `Playground.tsx`. Do NOT add `"use client"` to `EditorPanel` alone and import it directly — it will still crash Next.js SSR. The `dynamic` import guard is what matters.

3. **`automaticLayout: true` is required** — without it Monaco freezes at its initial width when the sidebar is toggled. Do not remove this option.

4. **`hydrated` guard pattern** — all localStorage and URL reads happen only after mount in `useEffect`. The `hydrated` boolean prevents the SSR-rendered HTML (which shows defaults) from flickering after mount. Keep this pattern: render defaults on server, then `setProject(resolveInitialState())` on mount.

5. **`history.replaceState` not `window.location.hash =`** — the latter pushes history entries; `replaceState` does not. Do not change this in `urlState.ts`.

6. **`sandbox="allow-scripts allow-modals"`** — `PreviewFrame` already has `allow-modals` (for `alert/confirm/prompt` inside the iframe). The host page can always call `window.confirm` — no constraint here.

7. **TypeScript `strict: true`** — all function parameters and return types must be explicitly typed. No implicit `any`. Pay attention to `ProjectState | null` return types and exhaustive checks on `Language`.

8. **`window.confirm` for delete** — acceptable for a developer tool. Do not replace with a custom modal component — that would add unnecessary complexity.

9. **Multiple HTML files** — only the FIRST HTML file (lowest index in the files array) is used for body content. Show a warning in FileTreePanel when `files.filter(f => f.language === 'html').length > 1`.

10. **Last HTML file protection** — if `files.filter(f => f.language === 'html').length === 1` and the user tries to delete the HTML file, the delete button must be visually disabled (`opacity-50 cursor-not-allowed`) and the click should not fire `window.confirm`.

---

## Implementation Blueprint

### Type Definitions (new `src/lib/types.ts`)

```ts
export type Language = "html" | "css" | "javascript";

export interface ProjectFile {
  id: string;       // stable random ID, never shown to user
  name: string;     // user-visible filename, e.g. "index.html"
  language: Language;
  content: string;
}

export interface ProjectState {
  version: 2;
  files: ProjectFile[];
  activeFileId: string;
}

// Only used internally for v1 → v2 migration
export interface EditorStateV1 {
  html: string;
  css: string;
  javascript: string;
}
```

### Migration Helper (add to `src/lib/storage.ts` and re-export for `urlState.ts`)

```ts
export function migrateV1ToV2(v1: EditorStateV1): ProjectState {
  return {
    version: 2,
    activeFileId: "html-index",
    files: [
      { id: "html-index", name: "index.html", language: "html",       content: v1.html },
      { id: "css-style",  name: "style.css",  language: "css",        content: v1.css },
      { id: "js-script",  name: "script.js",  language: "javascript", content: v1.javascript },
    ],
  };
}
```

Use deterministic IDs (`html-index`, `css-style`, `js-script`) so that two clients migrating the same v1 URL produce identical IDs — important for diff stability.

### New `buildSrcdoc` signature

```ts
// src/lib/buildSrcdoc.ts
export function buildSrcdoc(files: ProjectFile[]): string {
  const htmlFile  = files.find(f => f.language === "html");
  const cssFiles  = files.filter(f => f.language === "css");
  const jsFiles   = files.filter(f => f.language === "javascript");

  const styleTags = cssFiles.map(f => `<style>${f.content}</style>`).join("");
  const bodyHtml  = htmlFile?.content ?? "";
  // Each JS file is its own <script> block; <\/script> escape is required
  const scriptTags = jsFiles.map(f => `<script>${f.content}<\/script>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${styleTags}</head>`
       + `<body><script>${CONSOLE_INTERCEPT}<\/script>${bodyHtml}${scriptTags}</body></html>`;
}
```

Note the assembly order in `<body>`: CONSOLE_INTERCEPT first (so it captures errors from inline scripts in the HTML content), then HTML body content, then JS files.

### `EditorPanel` simplified signature

```ts
// Props change:
interface Props {
  file: ProjectFile;
  onChange: (id: string, content: string) => void;
}

// Usage inside component:
<Editor
  path={file.id}          // NEW: one Monaco model per file — preserves undo history
  height="100%"
  language={file.language}
  value={file.content}
  theme="vs-dark"
  onChange={(v) => onChange(file.id, v ?? "")}
  options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: "on",
             scrollBeyondLastLine: false, automaticLayout: true }}
/>
```

Remove the `TABS` constant, `active` state, and the tab-bar `<div>`. The component becomes a thin Monaco wrapper.

### `FileTreePanel` component structure (pseudocode)

```
FileTreePanel({ files, activeFileId, onActivate, onCreate,
                onRename, onDelete, onReorder, triggerCreate })

local state:
  editingId: string | null     // which file is in inline-rename mode
  editingName: string          // current value of the rename input
  isCreating: boolean          // whether the new-file input row is visible
  newFileName: string          // value of the new-file name input
  draggedId: string | null     // which file is being dragged

useEffect: when triggerCreate increments, set isCreating = true, focus input

render:
  <div header>
    "Files"  +  <button onClick={() => setIsCreating(true)}>+</button>
  </div>

  {files.filter(l=>'html').length > 1 &&
    <div warning>"⚠ Only index.html is rendered"</div>}

  <ul>
    {files.map(file => (
      <li
        key={file.id}
        draggable
        onDragStart={() => setDraggedId(file.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => { onReorder(draggedId!, file.id); setDraggedId(null); }}
        onDragEnd={() => setDraggedId(null)}
        className={file.id === draggedId ? "opacity-40" : ""}
        onClick={() => onActivate(file.id)}
      >
        {editingId === file.id
          ? <input value={editingName} onChange={...} onKeyDown={handleRenameKey} onBlur={commitRename} autoFocus />
          : <span onDoubleClick={() => startEditing(file)}>{file.name}</span>
        }
        <button onClick={() => startEditing(file)}>✎</button>
        <button
          onClick={() => handleDelete(file)}
          disabled={isLastHtml(file)}
          className={isLastHtml(file) ? "opacity-50 cursor-not-allowed" : ""}
        >×</button>
      </li>
    ))}

    {isCreating && (
      <li>
        <input
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          onKeyDown={handleCreateKey}
          onBlur={cancelCreate}
          placeholder="filename.js"
          autoFocus
        />
      </li>
    )}
  </ul>
```

**Inline rename commit logic:**
```ts
function commitRename() {
  if (!editingId) return;
  const trimmed = editingName.trim();
  if (trimmed && !isNameTaken(trimmed, files, editingId)) {
    onRename(editingId, trimmed);
  }
  setEditingId(null);
}

function handleRenameKey(e: React.KeyboardEvent) {
  if (e.key === "Enter") commitRename();
  if (e.key === "Escape") setEditingId(null);
}
```

**New-file commit logic:**
```ts
function handleCreateKey(e: React.KeyboardEvent) {
  if (e.key === "Enter") {
    const trimmed = newFileName.trim();
    if (trimmed && !isNameTaken(trimmed, files)) {
      onCreate(trimmed);    // Playground.tsx infers language from extension
    }
    setIsCreating(false);
    setNewFileName("");
  }
  if (e.key === "Escape") {
    setIsCreating(false);
    setNewFileName("");
  }
}
```

**Delete guard:**
```ts
function isLastHtml(file: ProjectFile): boolean {
  return file.language === "html" && files.filter(f => f.language === "html").length === 1;
}

function handleDelete(file: ProjectFile) {
  if (isLastHtml(file)) return;
  if (window.confirm(`Delete ${file.name}?`)) onDelete(file.id);
}
```

### Language inference helper (put in `src/lib/types.ts` or inline in `FileTreePanel`)

```ts
export function inferLanguage(filename: string): Language {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "css") return "css";
  return "javascript"; // .js, .jsx, .ts, .tsx, unknown → javascript
}
```

### ID generator (put in `src/lib/types.ts`)

```ts
export function generateFileId(): string {
  return Math.random().toString(36).slice(2, 10);
}
```

### `Playground.tsx` new state + handlers

```ts
// Replace EditorState with ProjectState
const DEFAULT_STATE: ProjectState = {
  version: 2,
  activeFileId: "html-index",
  files: [
    { id: "html-index", name: "index.html", language: "html",       content: DEFAULT_HTML },
    { id: "css-style",  name: "style.css",  language: "css",        content: DEFAULT_CSS },
    { id: "js-script",  name: "script.js",  language: "javascript", content: DEFAULT_JS },
  ],
};

const [project, setProject] = useState<ProjectState>(DEFAULT_STATE);
const [sidebarOpen, setSidebarOpen] = useState(true);
const [newFileTrigger, setNewFileTrigger] = useState(0);  // integer-counter pattern for Cmd+N

// Derived: active file (fallback to first file if id not found)
const activeFile = project.files.find(f => f.id === project.activeFileId) ?? project.files[0];

// Rebuild now takes files[], not three strings
const rebuild = useCallback((files: ProjectFile[]) => {
  setSrcdoc(buildSrcdoc(files));
  setMessages([]);
}, []);

// Hydration: resolveInitialState() returns ProjectState
function resolveInitialState(): ProjectState { ... }

// Debounce effect — dependency is `project` (includes activeFileId changes; cheap)
useEffect(() => {
  if (!hydrated) return;
  const id = setTimeout(() => {
    rebuild(project.files);
    writeStoredState(project);
    writeHash(project);
  }, 500);
  return () => clearTimeout(id);
}, [project, hydrated, rebuild]);

// Handlers
function handleFileChange(id: string, content: string) {
  setProject(prev => ({
    ...prev,
    files: prev.files.map(f => f.id === id ? { ...f, content } : f),
  }));
}

function handleSetActiveFile(id: string) {
  setProject(prev => ({ ...prev, activeFileId: id }));
}

function handleCreateFile(name: string) {
  const id = generateFileId();
  const language = inferLanguage(name);
  setProject(prev => ({
    ...prev,
    activeFileId: id,
    files: [...prev.files, { id, name, language, content: "" }],
  }));
}

function handleRenameFile(id: string, newName: string) {
  setProject(prev => ({
    ...prev,
    files: prev.files.map(f => f.id === id ? { ...f, name: newName } : f),
  }));
}

function handleDeleteFile(id: string) {
  setProject(prev => {
    const files = prev.files.filter(f => f.id !== id);
    const activeFileId = prev.activeFileId === id
      ? (files[0]?.id ?? "")
      : prev.activeFileId;
    return { ...prev, files, activeFileId };
  });
}

function handleReorderFiles(draggedId: string, targetId: string) {
  setProject(prev => {
    const files = [...prev.files];
    const fromIdx = files.findIndex(f => f.id === draggedId);
    const toIdx   = files.findIndex(f => f.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return prev;
    const [item] = files.splice(fromIdx, 1);
    files.splice(toIdx, 0, item);
    return { ...prev, files };
  });
}

// Keyboard shortcuts — extend existing handler
useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === "Enter") { e.preventDefault(); rebuild(project.files); }
      if (e.key === "b")     { e.preventDefault(); setSidebarOpen(o => !o); }
      if (e.key === "n")     { e.preventDefault(); setNewFileTrigger(c => c + 1); }
    }
  }
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}, [project, rebuild]);
```

### New Layout (Playground.tsx JSX)

```tsx
<div className="flex h-screen bg-gray-950">
  {/* Sidebar */}
  {sidebarOpen && (
    <div className="w-[200px] shrink-0 border-r border-gray-700 flex flex-col bg-gray-900">
      <FileTreePanel
        files={project.files}
        activeFileId={project.activeFileId}
        onActivate={handleSetActiveFile}
        onCreate={handleCreateFile}
        onRename={handleRenameFile}
        onDelete={handleDeleteFile}
        onReorder={handleReorderFiles}
        triggerCreate={newFileTrigger}
      />
    </div>
  )}

  {/* Editor column */}
  <div className="flex-1 min-w-0 flex flex-col border-r border-gray-700">
    {/* Editor toolbar: sidebar toggle + active filename */}
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700 bg-gray-900 shrink-0">
      <button
        onClick={() => setSidebarOpen(o => !o)}
        className="text-gray-400 hover:text-white text-sm font-mono px-1"
        title="Toggle sidebar (⌘B)"
      >
        ≡
      </button>
      <span className="text-xs text-gray-300 truncate">{activeFile.name}</span>
    </div>
    <div className="flex-1 min-h-0">
      <EditorPanel file={activeFile} onChange={handleFileChange} />
    </div>
  </div>

  {/* Preview + Console column (unchanged) */}
  <div className="flex-1 min-w-0 flex flex-col">
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700 bg-gray-900 shrink-0">
      <span className="text-xs text-gray-400">
        <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">⌘</kbd>
        <span className="mx-1">+</span>
        <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">Enter</kbd>
        <span className="ml-2">to run</span>
      </span>
      <button onClick={handleCopyLink} className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors">
        {copyState === "copied" ? "Copied!" : copyState === "failed" ? "Failed — copy manually" : "Copy link"}
      </button>
    </div>
    <div className="flex-1 min-h-0">
      <PreviewFrame srcdoc={srcdoc} />
    </div>
    <ConsolePanel messages={messages} onClear={handleClearConsole} />
  </div>
</div>
```

### `storage.ts` new read logic

```ts
export function readStoredState(): ProjectState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // v2
    if (parsed?.version === 2 && Array.isArray(parsed.files) && typeof parsed.activeFileId === "string") {
      return parsed as ProjectState; // trust shape after basic check
    }
    // v1 — migrate
    if (typeof parsed?.html === "string" && typeof parsed?.css === "string" && typeof parsed?.javascript === "string") {
      return migrateV1ToV2(parsed as EditorStateV1);
    }
    return null;
  } catch {
    return null;
  }
}
```

### `urlState.ts` new decode logic

```ts
export function decodeStateFromHash(hash: string): ProjectState | null {
  if (!hash) return null;
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(raw);
    if (!decompressed) return null;
    const parsed = JSON.parse(decompressed);
    // v2
    if (parsed?.version === 2 && Array.isArray(parsed.files) && typeof parsed.activeFileId === "string") {
      return parsed as ProjectState;
    }
    // v1 — migrate
    if (typeof parsed?.html === "string" && typeof parsed?.css === "string" && typeof parsed?.javascript === "string") {
      return migrateV1ToV2(parsed as EditorStateV1);
    }
    return null;
  } catch {
    return null;
  }
}
```

---

## Tasks (in order)

- [ ] **Task 1 — `src/lib/types.ts` (NEW)**
  Create this file with: `Language`, `ProjectFile`, `ProjectState`, `EditorStateV1`, `generateFileId()`, `inferLanguage(filename)`, `migrateV1ToV2(v1)`.
  All types and helpers that multiple modules need live here to avoid circular imports.

- [ ] **Task 2 — `src/lib/storage.ts` (MODIFY)**
  - Remove `EditorState` type (now in types.ts); keep `STORAGE_KEY`
  - Import `ProjectState`, `EditorStateV1`, `migrateV1ToV2` from `./types`
  - Change `readStoredState()` return type to `ProjectState | null` with v1+v2 detection
  - Change `writeStoredState(state: ProjectState)` to write v2

- [ ] **Task 3 — `src/lib/urlState.ts` (MODIFY)**
  - Remove `EditorState` import (and the `EditorState` type dependency)
  - Import `ProjectState`, `EditorStateV1`, `migrateV1ToV2` from `./types`
  - Change `decodeStateFromHash` to return `ProjectState | null` with v1+v2 detection
  - Change `encodeStateToHash` and `writeHash` to accept `ProjectState`

- [ ] **Task 4 — `src/lib/buildSrcdoc.ts` (MODIFY)**
  - Import `ProjectFile` from `./types`
  - Replace `buildSrcdoc(html, css, js)` signature with `buildSrcdoc(files: ProjectFile[]): string`
  - Implement the multi-file assembly: CSS `<style>` tags in `<head>`, CONSOLE_INTERCEPT first in `<body>`, HTML body content, JS `<script>` tags in array order
  - Keep `CONSOLE_INTERCEPT` constant and all `<\/script>` escapes

- [ ] **Task 5 — `src/components/EditorPanel.tsx` (MODIFY)**
  - Remove `Lang` type, `TABS` constant, `active` state, tab-bar JSX
  - Import `ProjectFile` from `@/lib/types`
  - Change props to `{ file: ProjectFile; onChange: (id: string, content: string) => void }`
  - Pass `path={file.id}`, `language={file.language}`, `value={file.content}` to Monaco
  - Change `onChange` call to `onChange(file.id, v ?? "")`
  - Keep all Monaco options unchanged (`automaticLayout: true` is critical)

- [ ] **Task 6 — `src/components/FileTreePanel.tsx` (NEW)**
  - `"use client"` at top
  - Import `ProjectFile`, `Language` from `@/lib/types`
  - Props: `FileTreePanelProps` interface (files, activeFileId, onActivate, onCreate, onRename, onDelete, onReorder, triggerCreate: number)
  - Local state: `editingId`, `editingName`, `isCreating`, `newFileName`, `draggedId`
  - `useEffect` on `triggerCreate` to open new-file input
  - `isLastHtml(file)` guard: `file.language === "html" && files.filter(f => f.language === "html").length === 1`
  - Render: header row with "Files" label + "+" button; multi-HTML warning; file list with drag/rename/delete; optional new-file input at bottom
  - Inline rename: double-click name → `<input>` with `autoFocus`, Enter/blur commits, Escape cancels
  - Delete: disabled + `opacity-50 cursor-not-allowed` for last HTML file; `window.confirm` otherwise
  - Drag: native HTML5 DnD, `opacity-40` on the dragged item for visual feedback
  - Tailwind classes: `bg-gray-900` header, `bg-gray-800` active row, `hover:bg-gray-800` hover, `text-gray-400` default text, `text-white` active

- [ ] **Task 7 — `src/components/Playground.tsx` (MODIFY)**
  - Replace `import { readStoredState, writeStoredState, type EditorState }` with `ProjectState` imports
  - Import `buildSrcdoc` (signature changed), `decodeStateFromHash`, `writeHash` (types changed)
  - Import `ProjectFile`, `ProjectState`, `inferLanguage`, `generateFileId` from `@/lib/types`
  - Import `FileTreePanel` directly (no `dynamic` needed — no `window` at module level)
  - Update `EditorPanel` dynamic import call site (props change to `file=` and `onChange=`)
  - Replace `DEFAULT_STATE`, `resolveInitialState`, state declarations as specified in blueprint
  - Add `sidebarOpen` and `newFileTrigger` state
  - Add all handlers: `handleFileChange`, `handleSetActiveFile`, `handleCreateFile`, `handleRenameFile`, `handleDeleteFile`, `handleReorderFiles`
  - Extend keyboard handler for `Cmd+B` and `Cmd+N`
  - Update `rebuild` callback to accept `ProjectFile[]` not three strings
  - Update debounce effect to pass `project.files` to `rebuild`
  - Replace layout JSX with three-column layout as specified in blueprint

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| v1 localStorage/URL on first load | `migrateV1ToV2` runs silently; v2 written back on next debounce tick |
| Unknown/corrupt localStorage | `JSON.parse` throws → `catch` returns `null` → falls through to `DEFAULT_STATE` |
| `activeFileId` not found in files array | `activeFile = project.files.find(...) ?? project.files[0]` — always has a file |
| User deletes the active file | `handleDeleteFile` sets `activeFileId` to `files[0].id` of the remaining files |
| User tries to create a file with a duplicate name | `isNameTaken` check in `FileTreePanel` — silently does nothing (the input stays open) |
| User tries to delete the last HTML file | Delete button is visually disabled, click handler returns early |
| `project.files` is empty after migration (malformed v2) | `files[0]` would be `undefined`; the `?? project.files[0]` fallback also returns `undefined`. Guard: in `readStoredState` and `decodeStateFromHash`, return `null` if `parsed.files.length === 0` so `DEFAULT_STATE` is used instead |
| `buildSrcdoc` called with zero HTML files | `htmlFile?.content ?? ""` → empty body — no crash, blank preview |

---

## Validation Gates

Run these in order after all 7 tasks are complete. All must pass.

```bash
# 1. Type safety — strict mode, no any
npx tsc --noEmit

# 2. Lint — Next.js ESLint rules
npm run lint

# 3. Production build — catches SSR errors and tree-shaking issues
npm run build
```

**Manual smoke tests** (run `npm run dev`, open http://localhost:3000):

- [ ] Page loads with sidebar showing 3 files: `index.html`, `style.css`, `script.js`; Monaco shows `index.html` content
- [ ] Click `style.css` in sidebar → Monaco switches to CSS mode, shows CSS content
- [ ] Edit CSS content → preview updates after 500ms debounce
- [ ] Click "+" → new-file input appears; type `utils.js`, press Enter → file appears in list, is activated in Monaco
- [ ] Double-click `utils.js` → inline rename input appears; type `helpers.js`, press Enter → file renamed in sidebar
- [ ] Type JS in `helpers.js` → it runs in the preview (separate `<script>` tag)
- [ ] Drag `helpers.js` above `script.js` → JS injection order changes; verify in preview
- [ ] Delete `helpers.js` (confirm) → file removed, `script.js` becomes active
- [ ] Try to delete `index.html` when it's the only HTML file → button is disabled, nothing happens
- [ ] Add a second HTML file `page2.html` → warning banner appears: "Only index.html is rendered"
- [ ] `Cmd+B` → sidebar collapses; `Cmd+B` again → sidebar reopens; Monaco resizes correctly (`automaticLayout: true`)
- [ ] `Cmd+N` → new-file input appears in sidebar
- [ ] `Cmd+Enter` → immediate preview rebuild with all files
- [ ] Copy link → paste in new tab → all files restore (v2 URL hash); correct file is active
- [ ] Open a v1 URL (hash of `{html, css, javascript}`) → migrates to `index.html`, `style.css`, `script.js` silently
- [ ] Open with empty localStorage in a fresh tab → default 3-file project loads correctly

---

## Confidence Score

**8.5 / 10** — the blueprint covers every file, every type, every edge case, and every regression; the only risk is the `@monaco-editor/react` `path` prop behaviour (model caching / controlled-value interaction) which requires quick manual verification of cursor stability during file-switch and rapid typing.
