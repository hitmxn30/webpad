## FEATURE:

Webpad needs a design system. Right now the UI uses inconsistent, scattered Tailwind utilities with no shared tokens, no defined typography, and no animations. The goal is a polished, professional dark-theme IDE aesthetic — visually coherent across all panels, with smooth micro-animations that make the app feel alive.

The design system should establish:

- A **color palette** built for dark-theme use — deep background, layered surfaces, clear text hierarchy, a blue accent color, and semantic colors for success/warning/error states.
- A **typography system** using Geist Sans for UI text and Geist Mono for console output, with a consistent font-size scale.
- **Animations** for the key interactive moments: sidebar opening, new console messages appearing, button feedback, and panel reveals.
- A consistent **spacing, border-radius, shadow, and transition** vocabulary used across all components.

All five components — the root layout, sidebar, editor wrapper, preview frame, and console panel — should be updated to use the new system. The active file in the sidebar should have a clear visual indicator. Console rows should slide in when they arrive. The sidebar should animate open.

## EXAMPLES:

No example files needed. The design speaks for itself once implemented.

## DOCUMENTATION:

- Tailwind CSS custom theme extension — https://tailwindcss.com/docs/theme#extending-the-default-theme
- Next.js local font optimization — https://nextjs.org/docs/app/building-your-application/optimizing/fonts#local-fonts
- CSS custom properties — https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
- `prefers-reduced-motion` — https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

## OTHER CONSIDERATIONS:

- Monaco editor has its own internal theming (`vs-dark`) and cannot be styled from outside. Don't try.
- The preview iframe must stay white — it renders user HTML, not app chrome.
- All animations must be disabled when the OS has "Reduce Motion" turned on.
- The `geist` font package is already installed — no new dependencies needed.
