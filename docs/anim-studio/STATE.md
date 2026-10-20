# anim-studio - state

## Now
PR 1 open (2026-10-21): built, checked (FIX: 2 one-line blockers, fixed in 95d16b94), master 4.24.0 merged.

## Next
1. Implementer (report docs/anim-studio/REPORT.md), fresh check (CHECK.md), one fix round.
2. Merge master once #65 is in; npm run check, e2e:quick + the studio suite; PR to master; message the orchestrator.
3. PR 2 (co-op pairs, traversal props), then the bake script (docs/anim-tuner/STATE.md "Plan after tuner-camera").

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for anim-studio. Folder C:/NightShift/Mobile-Coop-anim-studio,
branch feature/anim-studio (PR to master). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-anim-studio && test "$(git rev-parse --abbrev-ref HEAD)" = feature/anim-studio && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-anim-studio"
Read CLAUDE.md, docs/anim-studio/BRIEF.md and this STATE.md; carry on from "Next". Report to "Night Shift | Orchestrator".
```
