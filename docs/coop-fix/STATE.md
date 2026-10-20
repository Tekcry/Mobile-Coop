# coop-fix - state

## Now
PR #35 open (patch), head 9f7e964a. Waiting for the full e2e on the laptop; then the orchestrator merges.

## Open
- e2e-coop-gpu two-context variants: first page load refused on the desktop (opt-in `COOPGPU_ALL=1`; not diagnosed).
- Hand check on the PC: co-op on High / Epic, two windows side by side and one over the other (TESTING.md).

## Done
- 2026-10-20: worktree from master 4.13.0; DIAGNOSIS (label bug, hidden-window stall), fixes, CHECK (1 fix: tick opt-out
  on automation, not `?net=local`), DIAGNOSIS-2 + menu-flow repro; GPU repro found the root cause of the invisible host
  (LampPlugin clone aborts the partner figure load); fix `doNotSerialize`; GPU suite e2e-coop-gpu; npm run check pass.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for coop-fix. Folder C:/NightShift/Mobile-Coop-coop-fix, branch
feature/coop-fix. Branch guard before every write:
cd /c/NightShift/Mobile-Coop-coop-fix && test "$(git rev-parse --abbrev-ref HEAD)" = feature/coop-fix && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-coop-fix"
Read CLAUDE.md, docs/ROADMAP.md, docs/coop-fix/BRIEF.md and this STATE.md; carry on from "Now". PR #35 to master.
```
