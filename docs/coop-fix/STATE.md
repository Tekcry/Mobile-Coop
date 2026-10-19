# coop-fix - state

## Now
Diagnosis of both bugs (an Opus agent; report DIAGNOSIS.md).

## Next
Fix, e2e-coop coverage, slice tier, full e2e, PR.

## Open
- npm ci waits for the desktop heavy lock (CT Core).

## Done
- 2026-10-20: worktree and branch from master 4.13.0 (51af5ffb); BRIEF, STATE.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for coop-fix. Folder C:/NightShift/Mobile-Coop-coop-fix, branch
feature/coop-fix. Branch guard before every write:
cd /c/NightShift/Mobile-Coop-coop-fix && test "$(git rev-parse --abbrev-ref HEAD)" = feature/coop-fix && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-coop-fix"
Read CLAUDE.md, docs/ROADMAP.md, docs/coop-fix/BRIEF.md and this STATE.md, carry on from "Now". Opus for diagnosis and
checks, Sonnet for chores. Check C:/NightShift/heavy.lock before heavy runs. PR to master (patch), message
"Night Shift | Orchestrator", STOP.
```
