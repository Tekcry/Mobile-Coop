# tuner-ui - state

## Now
PR open (2026-10-21): built (REPORT.md), check PASS (CHECK.md, no blockers), fix round done (state pick carries across tabs, folded tab bar, snap-lock e2e), master 4.32.3 merged; npm run check green (2337), smoke / e2e-studio / e2e-menus ok on the desktop. Full e2e requested from CT Core Build (laptop offline).

## Next
1. The full e2e result; a failure: fix on this branch. 2. The orchestrator merges on CI.
3. Then coop-torches resumes (docs/coop-torches/STATE.md).

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for tuner-ui. Folder C:/NightShift/Mobile-Coop-tuner-ui, branch
feature/tuner-ui (PR to master). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-tuner-ui && test "$(git rev-parse --abbrev-ref HEAD)" = feature/tuner-ui && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-tuner-ui"
Read CLAUDE.md, docs/tuner-ui/BRIEF.md and this STATE.md; carry on from "Next". Report to "Night Shift | Orchestrator".
Heavy runs only under C:/NightShift/heavy.lock (create only if absent; delete only your own line).
```
