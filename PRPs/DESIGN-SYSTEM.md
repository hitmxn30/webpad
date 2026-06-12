# PRP: Design System

## Goal

Replace webpad's ad-hoc Tailwind utilities with a cohesive design token system, Geist typography, and a micro-animation library so the UI looks and feels like a polished dark-theme IDE.

## Why

- Every component currently hardcodes colors (`gray-950`, `gray-800`, `blue-600`) with no shared vocabulary — changing the palette means touching dozens of unrelated class strings
- No font is configured; the browser falls back to system defaults, which looks unfinished next to Monaco's Geist rendering inside the editor
- There are zero animations; panel transitions, sidebar open, and console output arrival all happen with hard cuts that feel cheap compared to tools like VSCode or CodeSandbox
- A token layer defined once in `globals.css` + `tailwind.config.ts` makes future theming (light mode, custom accent) a single-file change

## What

**From the user's perspective:**
- The app loads with a deep near-black background (`#0d1117`), slightly lighter panel surfaces, and Geist Sans for all labels and buttons
- The console output panel uses Geist Mono
- Toggling the sidebar (Cmd+B) animates the sidebar sliding in from the left; hard-toggling disappears stays for close (v1)
- Each new console log/warn/error row slides up and fades in on arrival
- The active file in the sidebar has a visible blue left-bar accent strip
- Warning/error console rows use the same amber/red as before but through tokens, not hardcoded class names
- `prefers-reduced-motion: reduce` collapses all animation durations to near-zero

**Out of scope:**
- Light-mode theme (tokens lay the groundwork but no light-mode values)
- Custom theme picker in the UI
- Monaco editor visual changes (it renders its own `vs-dark` theme internally)
- Resizable panels

---

## All Needed Context

### Documentation & References

- **Tailwind `theme.extend`** — https://tailwindcss.com/docs/theme#extending-the-default-theme — add under `extend`, never replace top-level `theme.colors` (would nuke all default utilities)
- **Tailwind `keyframes` + `animation` in config** — https://tailwindcss.com/docs/animation#adding-new-animation-utilities — keyframes and animation shorthand both go inside `theme.extend`
- **`next/font/local`** — https://nextjs.org/docs/app/api-reference/components/font#local-fonts — variable fonts need `weight: '100 900'`; the `variable` option emits a CSS custom property onto the element
- **CSS custom properties** — https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties — declare in `:root`; Tailwind color tokens reference them as `'var(--name)'`
- **`prefers-reduced-motion`** — https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion — a single global rule in CSS is simpler than per-element `motion-reduce:` Tailwind prefixes

### Local Font Files

Both Geist variable fonts are already in the repo. Use `next/font/local` — there is **no** `geist` npm package installed.

```
src/app/fonts/GeistVF.woff       ← Geist Sans variable font
src/app/fonts/GeistMonoVF.woff   ← Geist Mono variable font
```

### Existing `layout.tsx` — Current State

```tsx
// src/app/layout.tsx  (full file — 21 lines)
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webpad",
  description: "In-browser HTML/CSS/JS playground",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-950 text-white antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
```

After the change, fonts are loaded at the top and their CSS variable names are applied to `<html>`.

### Existing `tailwind.config.ts` — Current State

```ts
// tailwind.config.ts (full file)
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // ADD new tokens here — leave background/foreground in place
      },
    },
  },
  plugins: [],
};
export default config;
```

### Existing `globals.css` — Current State

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  height: 100%;
  overflow: hidden;
}
```

Add the `:root` token block and keyframes after the existing rules.

### Color Mapping: Old → New

Every `gray-*`/`blue-*`/`yellow-*`/`red-*` class used in the codebase maps to a token:

| Old class | New token class | Hex value |
|---|---|---|
| `bg-gray-950` | `bg-canvas` | `#0d1117` |
| `bg-gray-900` | `bg-surface` | `#161b22` |
| `bg-gray-800` | `bg-elevated` | `#21262d` |
| `bg-gray-700` | `bg-elevated` (input fields) | same |
| `border-gray-700` | `border-line` | `#30363d` |
| `border-gray-800` | `border-subline` | `#21262d` |
| `text-white` / `text-gray-100` | `text-primary` | `#e6edf3` |
| `text-gray-200` / `text-gray-300` | `text-primary` | same |
| `text-gray-400` | `text-secondary` | `#8b949e` |
| `text-gray-500` / `text-gray-600` | `text-muted` | `#484f58` |
| `bg-blue-600` / `hover:bg-blue-500` | `bg-accent` / `hover:bg-accent-hover` | `#58a6ff` / `#79c0ff` |
| `border-blue-500` | `border-accent` | `#58a6ff` |
| `text-yellow-400` / `text-yellow-500` | `text-warning` | `#d29922` |
| `text-red-400` | `text-error` | `#f85149` |

### Playground.tsx — Key Sections to Change

```tsx
// Current sidebar wrapper (lines 215-228)
{sidebarOpen && (
  <div className="w-[200px] shrink-0 border-r border-gray-700 flex flex-col bg-gray-900">
    <FileTreePanel ... />
  </div>
)}
// Change to:
{sidebarOpen && (
  <div className="w-[200px] shrink-0 border-r border-line flex flex-col bg-surface animate-slide-in-left">
    <FileTreePanel ... />
  </div>
)}

// Current root div (line 213)
<div className="flex h-screen bg-gray-950">
// Change to:
<div className="flex h-screen bg-canvas">

// Current editor toolbar (line 233)
<div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700 bg-gray-900 shrink-0">
// Change to:
<div className="flex items-center gap-2 px-3 py-1.5 border-b border-line bg-surface shrink-0">

// Sidebar toggle button (line 235)
className="text-gray-400 hover:text-white text-sm font-mono px-1 shrink-0"
// Change to:
className="text-secondary hover:text-primary text-sm font-mono px-1 shrink-0"

// Active filename (line 241)
className="text-xs text-gray-300 truncate"
// Change to:
className="text-xs text-primary truncate"

// Preview column toolbar (line 250)
<div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700 bg-gray-900 shrink-0">
// Change to:
<div className="flex items-center justify-between px-3 py-1.5 border-b border-line bg-surface shrink-0">

// "Make edits" hint text (line 251)
className="text-xs text-gray-400"
// Change to:
className="text-xs text-muted"

// Copy link button (line 252-261)
className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
// Change to:
className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent-hover text-primary transition-colors"

// Editor column border (line 231)
className="flex-1 min-w-0 flex flex-col border-r border-gray-700"
// Change to:
className="flex-1 min-w-0 flex flex-col border-r border-line"
```

### FileTreePanel.tsx — Key Sections to Change

```tsx
// Panel header (line 112)
<div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700 shrink-0">
// Change to:
<div className="flex items-center justify-between px-3 py-1.5 border-b border-line shrink-0">

// "Files" label (line 113)
className="text-xs font-medium text-gray-300 uppercase tracking-wide"
// Change to:
className="text-xs font-medium text-primary uppercase tracking-wide"

// "+" new file button (line 116)
className="text-gray-400 hover:text-white text-base leading-none px-1"
// Change to:
className="text-secondary hover:text-primary text-base leading-none px-1"

// Multi-HTML warning (line 130)
className="px-3 py-1.5 text-xs text-yellow-500 border-b border-gray-700 shrink-0"
// Change to:
className="px-3 py-1.5 text-xs text-warning border-b border-line shrink-0"

// File row classList (lines 151-157) — THE MOST IMPORTANT CHANGE
// Current active state: "bg-gray-800 text-white"
// New active state adds left accent bar:
file.id === activeFileId
  ? "bg-elevated text-primary border-l-2 border-accent pl-[6px]"
  : "text-secondary hover:bg-elevated hover:text-primary"
// NOTE: active item uses pl-[6px] instead of px-2 to compensate for the 2px left border

// Rename/create input (lines 161-168 and 213-227)
className="... bg-gray-700 text-white ... border-blue-500"
// Change to:
className="... bg-elevated text-primary ... border-accent"

// Rename icon button (line 183)
className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white shrink-0 leading-none px-0.5 transition-opacity"
// Change to:
className="opacity-0 group-hover:opacity-100 text-muted hover:text-primary shrink-0 leading-none px-0.5 transition-opacity"

// Delete icon button — normal state (line 199)
"shrink-0 leading-none px-0.5 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
// Change to:
"shrink-0 leading-none px-0.5 opacity-0 group-hover:opacity-100 text-muted hover:text-error transition-opacity"

// Delete icon button — disabled state (line 195)
"shrink-0 leading-none px-0.5 opacity-30 cursor-not-allowed text-gray-600"
// Change to:
"shrink-0 leading-none px-0.5 opacity-30 cursor-not-allowed text-muted"
```

### ConsolePanel.tsx — Key Sections to Change

```tsx
// LEVEL_STYLES (lines 16-20)
const LEVEL_STYLES: Record<ConsoleLevel, string> = {
  log:   "text-gray-100",
  warn:  "text-yellow-400",
  error: "text-red-400",
};
// Change to:
const LEVEL_STYLES: Record<ConsoleLevel, string> = {
  log:   "text-primary",
  warn:  "text-warning",
  error: "text-error",
};

// Outer panel (line 40)
className="h-48 shrink-0 border-t border-gray-700 bg-gray-950 flex flex-col"
// Change to:
className="h-48 shrink-0 border-t border-line bg-canvas flex flex-col"

// Header bar (line 41)
className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700 bg-gray-900 shrink-0"
// Change to:
className="flex items-center justify-between px-3 py-1.5 border-b border-line bg-surface shrink-0"

// "Console" label (line 42)
className="text-xs font-medium text-gray-300 uppercase tracking-wide"
// Change to:
className="text-xs font-medium text-primary uppercase tracking-wide"

// Clear button (line 43)
className="text-xs text-gray-400 hover:text-white transition-colors"
// Change to:
className="text-xs text-secondary hover:text-primary transition-colors"

// Messages container (line 50)
className="flex-1 min-h-0 overflow-y-auto font-mono text-xs"
// Change to: (font-mono already fine — Geist Mono now resolves from tailwind config)
className="flex-1 min-h-0 overflow-y-auto font-mono text-xs"

// "No output yet" (line 52)
className="px-3 py-2 text-gray-500"
// Change to:
className="px-3 py-2 text-muted"

// Message row (lines 54-60) — ADD animate-slide-in-up
className={`px-3 py-1 border-b border-gray-800 whitespace-pre-wrap break-words ${LEVEL_STYLES[msg.level]}`}
// Change to:
className={`px-3 py-1 border-b border-subline whitespace-pre-wrap break-words animate-slide-in-up ${LEVEL_STYLES[msg.level]}`}
// NOTE: key={msg.id} already exists — React remounts on each new message, replaying the animation
```

### Gotchas & Constraints

1. **Monaco is a black box.** `EditorPanel` wraps Monaco with `theme="vs-dark"`. Monaco renders in its own subtree with its own style injection — CSS custom properties and Tailwind classes on the outer `<div>` have no effect on Monaco internals. Do not add any classes intended to style Monaco's text, scrollbars, or gutter.

2. **`allow-same-origin` must stay absent** from `PreviewFrame`'s `sandbox` attribute. The iframe renders in a null origin — this is an intentional security boundary. `bg-white` on the iframe stays as-is; do not add design system classes to the iframe element.

3. **`<\/script>` in `buildSrcdoc.ts` is intentional.** It prevents a literal `</script>` in user-typed JS from breaking the srcdoc string. Do not touch `buildSrcdoc.ts` during this change.

4. **`theme.extend` only — never replace.** The top-level `theme.colors` object is a replacement, not a merge. Adding tokens inside `theme.extend.colors` merges with Tailwind defaults. The existing `background` and `foreground` tokens in `theme.extend.colors` should be left in place.

5. **Active file item needs padding compensation.** The active file row gets `border-l-2 border-accent` (2px left border). To avoid the text jumping right, replace `px-2` with `pl-[6px] pr-2` on the active row (6px = 8px normal left padding − 2px used by border). The inactive rows keep `px-2`.

6. **Geist fonts are `.woff` (not `.woff2`).** `next/font/local` accepts `.woff`. No format hint is needed — Next.js infers it. The `weight: '100 900'` range declares this as a variable font.

7. **Font CSS variable must be on `<html>`, not `<body>`.** `next/font/local` with `variable` emits a CSS custom property — apply the `localFont.variable` className to `<html>`. Add `font-sans` to `<body>` so Tailwind's default `font-family: var(--font-sans)` (which we extend to reference `var(--font-geist-sans)`) resolves correctly.

8. **Tailwind purging and `animate-slide-in-up`.** Tailwind's content scanner must see the string `animate-slide-in-up` in source. It appears in `ConsolePanel.tsx` as a static string in the template literal — that's fine; Tailwind will detect it. Do not construct it dynamically.

9. **Opacity modifier incompatibility with hex CSS vars.** Tailwind v3's opacity modifier syntax (`text-primary/50`) does NOT work when the color token is `var(--color-...)` pointing to a hex value. Tailwind needs `rgb`/`hsl` channel-split syntax for that to work. This design system does NOT use opacity modifiers — don't add them.

---

## Implementation Blueprint

### Pseudocode

```
1. globals.css
   - Append :root block with 13 color tokens + 3 radius + 2 shadow + 3 transition tokens
   - Append 6 @keyframe definitions
   - Append prefers-reduced-motion override

2. tailwind.config.ts
   - Inside theme.extend.colors: add 13 semantic color aliases pointing to CSS vars
   - Add theme.extend.fontFamily: { sans, mono } pointing to CSS var font families
   - Add theme.extend.fontSize with 5 named sizes
   - Add theme.extend.borderRadius: { sm, md, lg }
   - Add theme.extend.boxShadow: { panel, dropdown }
   - Add theme.extend.keyframes with 6 keyframe definitions
   - Add theme.extend.animation with 6 animate-* shorthands

3. layout.tsx
   - Import localFont from 'next/font/local'
   - Declare geistSans (variable font, src './fonts/GeistVF.woff', variable '--font-geist-sans')
   - Declare geistMono (variable font, src './fonts/GeistMonoVF.woff', variable '--font-geist-mono')
   - Apply both .variable classNames to <html> along with h-full
   - Change <body> className: bg-gray-950 → bg-canvas; add font-sans

4. Playground.tsx
   - Root div: bg-gray-950 → bg-canvas
   - Sidebar wrapper: bg-gray-900 border-gray-700 → bg-surface border-line; add animate-slide-in-left
   - Editor column: border-gray-700 → border-line
   - Editor toolbar: bg-gray-900 border-gray-700 → bg-surface border-line
   - Toggle button: text-gray-400 hover:text-white → text-secondary hover:text-primary
   - Active filename span: text-gray-300 → text-primary
   - Preview toolbar: bg-gray-900 border-gray-700 → bg-surface border-line
   - Hint text: text-gray-400 → text-muted
   - Copy link button: bg-blue-600 hover:bg-blue-500 → bg-accent hover:bg-accent-hover

5. FileTreePanel.tsx
   - Header: border-gray-700 → border-line; text-gray-300 → text-primary; text-gray-400 → text-secondary
   - Multi-HTML warning: text-yellow-500 border-gray-700 → text-warning border-line
   - Active file row: bg-gray-800 text-white → bg-elevated text-primary border-l-2 border-accent pl-[6px] pr-2
   - Idle/hover row: text-gray-400 hover:bg-gray-800 hover:text-gray-200 → text-secondary hover:bg-elevated hover:text-primary
   - Rename/create inputs: bg-gray-700 border-blue-500 → bg-elevated border-accent; text-white → text-primary
   - Icon buttons: text-gray-500 hover:text-white → text-muted hover:text-primary
   - Delete hover: hover:text-red-400 → hover:text-error
   - Disabled delete: text-gray-600 → text-muted

6. ConsolePanel.tsx
   - LEVEL_STYLES: text-gray-100 → text-primary; text-yellow-400 → text-warning; text-red-400 → text-error
   - Outer panel: border-gray-700 bg-gray-950 → border-line bg-canvas
   - Header: border-gray-700 bg-gray-900 → border-line bg-surface
   - "Console" label: text-gray-300 → text-primary
   - Clear button: text-gray-400 hover:text-white → text-secondary hover:text-primary
   - "No output yet": text-gray-500 → text-muted
   - Message rows: border-gray-800 → border-subline; add animate-slide-in-up

7. EditorPanel.tsx
   - Outer div: no color classes currently — no change needed

8. PreviewFrame.tsx
   - iframe: bg-white stays; no changes needed
```

### Tasks (in order)

- [ ] **Task 1 — `src/app/globals.css`**: Append `:root` block with all design tokens, 6 `@keyframe` rules, and `prefers-reduced-motion` override
- [ ] **Task 2 — `tailwind.config.ts`**: Extend `theme.extend` with colors, fontFamily, fontSize, borderRadius, boxShadow, keyframes, animation
- [ ] **Task 3 — `src/app/layout.tsx`**: Load Geist fonts via `next/font/local`, apply CSS variable classNames to `<html>`, update `<body>` classes
- [ ] **Task 4 — `src/components/Playground.tsx`**: Update root, sidebar, editor column, toolbars, buttons per the mapping table
- [ ] **Task 5 — `src/components/FileTreePanel.tsx`**: Update header, file item active/hover/idle states, inputs, icon buttons
- [ ] **Task 6 — `src/components/ConsolePanel.tsx`**: Update `LEVEL_STYLES`, panel/header/row classes, add `animate-slide-in-up` to message rows
- [ ] **Task 7 — `src/components/EditorPanel.tsx`**: Verify no changes are needed (no color classes on wrapper)
- [ ] **Task 8 — `src/components/PreviewFrame.tsx`**: Verify no changes are needed (iframe `bg-white` stays)

### Error Handling

- **Font files missing**: If `GeistVF.woff` or `GeistMonoVF.woff` do not exist at `src/app/fonts/`, `next/font/local` will throw a build error. Verify file paths with `ls src/app/fonts/` before starting.
- **Tailwind class not found at runtime**: Silently falls back to no style. No error is thrown. If a token class like `bg-canvas` appears unstyled, check: (a) the CSS var is in `:root`, (b) the Tailwind alias is in `theme.extend.colors`, (c) the class string is static (not dynamically constructed).
- **Animation not playing on console rows**: Most likely cause is `key` prop being stable across renders. The existing `key={msg.id}` where `id` is `messageIdRef.current++` guarantees uniqueness — confirm this is not accidentally changed.
- **Active file left-border misaligns text**: If padding compensation `pl-[6px]` is forgotten, the text jumps 2px right on activation. Fix by replacing `px-2` with `pl-[6px] pr-2` on active rows only.

---

## Validation Gates

Run these in order. All must pass before the PRP is considered complete.

```bash
# 1. Type safety
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Production build (catches SSR errors and tree-shaking issues)
npm run build
```

Manual smoke test (run `npm run dev`, open http://localhost:3000):

- [ ] Root background is deep near-black (`#0d1117`), clearly darker than panel toolbars (`#161b22`)
- [ ] UI labels (file names, "Files" header, "Console" header) render in Geist Sans
- [ ] Console output rows render in Geist Mono (visibly different from panel labels)
- [ ] Press Cmd+B to close sidebar, then Cmd+B to open — sidebar slides in from the left
- [ ] Type `console.log("hello")` in the JS file, run preview — new console row slides up on arrival
- [ ] Active file in sidebar has a visible blue left-bar accent strip
- [ ] Inactive file items are dimmer than active; hover brightens them
- [ ] Console warn row (type `console.warn("x")`) is amber, error row (type `console.error("x")`) is red
- [ ] Monaco editor interior (syntax highlighting, background) is visually unchanged
- [ ] Preview iframe renders user HTML on white background unchanged
- [ ] In macOS System Preferences → Accessibility → Reduce Motion: toggle sidebar produces no animation

---

## Confidence Score

**9 / 10** — Every file to change is listed with exact before/after class strings extracted from the actual source; the only uncertainty is whether Tailwind's JIT picks up `animate-slide-in-up` from the template literal in `ConsolePanel.tsx` without needing a `safelist` entry (it should, since the string is static).
