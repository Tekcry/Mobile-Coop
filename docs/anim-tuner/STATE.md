# anim-tuner - state

## Now
Implementer building the tuner (2026-10-20 evening).

## Next
1. Implementer: tuning table, hooks, panel, IndexedDB, export (report: docs/anim-tuner/REPORT.md).
2. Fresh Opus check (docs/anim-tuner/CHECK.md), at most one fix round.
3. `npm run check` + `npm run e2e:quick` (E2E_PORT 4191, under the desktop lock; laptop runner via the orchestrator if busy).
4. Merge origin/feature/ct-prototype or master, PR to master (minor), message the orchestrator.

## Done
- 2026-10-20: worktree and branch from dedcfcc5; BRIEF.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for anim-tuner. Folder C:/NightShift/Mobile-Coop-anim-tuner, branch
feature/anim-tuner (PR to master). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-anim-tuner && test "$(git rev-parse --abbrev-ref HEAD)" = feature/anim-tuner && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-anim-tuner"
Read CLAUDE.md, docs/anim-tuner/BRIEF.md and this STATE.md; carry on from "Next". Report to "Night Shift | Orchestrator", then STOP.
```
