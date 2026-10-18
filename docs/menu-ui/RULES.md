# Menu UI run - rules
Condensed from BRIEF.md sections 2-6. The brief wins if they differ.

## Resume
1. Read CLAUDE.md, this file, then STATE.md. Read BRIEF.md after any resume or compaction.
2. Read only the current step file and the SPEC.md sections it names.
3. Ignore the feature/kestrel and feature/training-bunker lines in CLAUDE.md.
4. Prompt lines: "Menu UI run: START" (first time), "Menu UI run: RESUME" (after a clear or crash), "Menu UI: go"
   (after a pause, with or without notes).

## Authority
Michael > DECISIONS.md (MD1-MD20, then M-decisions he adds) > bible > SPEC.md > PLAN.md and step files > docs > code.

## Hard rules
- CLAUDE.md hard rules. Branch `feature/menu-ui` only; worktree `C:\NightShift\Mobile-Coop-menu-ui`; ports 4195-4199.
- Never touch dev, master, feature/ct-locomotion, other worktrees, or ports 4189 / 4191.
- Gameplay never reads graphics or UI state. The pause blur is render-only (`src/vfx`).
- No `backdrop-filter`, no runtime font or CDN fetch. Settings additions go in `Settings` (IndexedDB `kv/settings`)
  with `sanitizeSettings` defaults; never localStorage.
- Every new or changed screen passes SPEC section 9 on keyboard, mouse and pad before its step commits.
- e2e selectors use `data-key` (stable) rather than labels or classes.

## No hangs
No foreground servers or watchers; every command has a timeout; full e2e in the background; logs via tail / grep;
the same error twice means stop and rethink; about 60 tool calls per subagent.

## Step loop
Implement (subagent, no commit) -> check (fresh subagent: diff, tests, e2e, parity checklist, prototype comparison,
file:line evidence) -> up to 3 fix rounds -> commit "menu-ui NN: <summary>", push, update LOG, STATE, CHANGELOG,
TESTING, docs/systems/ui.md (and input-and-loop.md when input changes).

## ASSUMED numbering
A new assumption takes the next free A-number in DECISIONS.md "Run assumptions".
