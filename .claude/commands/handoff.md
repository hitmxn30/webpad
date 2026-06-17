# Session Handoff

Summarize the current session and append it to `HANDOFF.md` in the project root.

## Steps

1. **Reflect on the session** — review the full conversation and identify:
   - What was discussed, decided, or built
   - Any changes made to the codebase (files edited, created, deleted)
   - Decisions and the reasoning behind them
   - Anything left incomplete, deferred, or flagged as a follow-up
   - Any gotchas, bugs, or constraints surfaced during the session

2. **Write the summary** using this exact format:

```
---
## Session: <one-line topic summary> — <YYYY-MM-DD>

### What was done
- <bullet per completed task or change, with file paths where relevant>

### Decisions made
- <decision>: <brief reason>

### Left open / follow-ups
- <anything unfinished, deferred, or worth revisiting>

### Gotchas surfaced
- <non-obvious findings, bugs caught, constraints discovered — omit if none>
```

3. **Append** the formatted block to `HANDOFF.md` in the project root:
   - If the file does not exist, create it with a `# Handoff Log` heading first, then append the block
   - If it exists, append to the end — never overwrite existing content
   - Use the Write or Edit tool; do not use bash redirection

4. Confirm: **"Handoff written to HANDOFF.md."**
