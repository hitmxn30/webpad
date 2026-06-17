# Handoff Log

---
## Session: Claude Code custom skills setup (primer + handoff) — 2026-06-15

### What was done
- Created `.claude/commands/primer.md` — initial version was webpad-specific with all analysis hardcoded into the command itself
- Rewrote `.claude/commands/primer.md` — replaced with Cole's generic structure (tree → CLAUDE.md → README → key src files → explain back) plus a short webpad-specific nuances section at the bottom
- Updated `.claude/commands/primer.md` — added a step to read `HANDOFF.md` if it exists, so future sessions load prior session context automatically
- Created `.claude/commands/handoff.md` — new skill that reflects on the session and appends a dated, structured summary block to `HANDOFF.md`

### Decisions made
- **Adopted Cole's primer structure over the original webpad-specific one**: the original hardcoded the analysis output inside the command, meaning it would drift whenever the codebase changed. Cole's approach reads live files and lets Claude generate the analysis dynamically — always accurate, zero maintenance.
- **Kept a short nuances section in primer**: a purely generic primer would miss non-obvious invariants (`renameCancelRef`, `allow-modals`, `<\/script>` escape, hydration order, etc.) that aren't surfaced by skimming files. The nuances section guides Claude to look for them without hardcoding the answers.
- **Primer reads HANDOFF.md before source files**: positions session history as higher-priority context than raw code, so prior decisions and deferred work are visible before any analysis begins.
- **Handoff appends, never overwrites**: HANDOFF.md is a cumulative log — each session adds a dated block so the full history is preserved.

### Left open / follow-ups
- `tree` is not installed on this machine — primer falls back to `find` with exclusion flags. Consider adding `tree` via Homebrew (`brew install tree`) or updating the primer command to use `find` as the canonical alternative.
- The nuances section in primer is still webpad-specific. If this project ever becomes a template or monorepo, extract the nuances into a separate file and reference it from the command.

### Gotchas surfaced
- The initial primer command had a stale reference: it documented `sandbox="allow-scripts"` only, but `PreviewFrame.tsx` actually uses `sandbox="allow-scripts allow-modals"` — `allow-modals` was added to support `alert()`/`confirm()` in user code. Caught during the live /primer run.
- The system-reminder showed the user had already edited `primer.md` to add `"Any IMPORTANT specific nuances about the codebase"` as a bullet — this happened between the rewrite and the follow-up /primer run, so both versions were in play briefly.
