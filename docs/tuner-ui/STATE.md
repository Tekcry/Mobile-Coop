# tuner-ui - state

## Now
Implementer building the layout pass (2026-10-21).

## Next
1. Implementer (report docs/tuner-ui/REPORT.md), fresh check (CHECK.md), one fix round.
2. `npm run check`, e2e-menus, e2e-studio, smoke (port 4191, desktop heavy.lock; the desktop is slow: E2E_SUITE_TIMEOUT
   1200); push; PR to master; Character Build full e2e (copy the orchestrator); message the orchestrator with the head.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for tuner-ui. Folder C:/NightShift/Mobile-Coop-tuner-ui, branch
feature/tuner-ui (PR to master). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-tuner-ui && test "$(git rev-parse --abbrev-ref HEAD)" = feature/tuner-ui && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-tuner-ui"
Read CLAUDE.md, docs/tuner-ui/BRIEF.md and this STATE.md; carry on from "Next". Report to "Night Shift | Orchestrator".
Heavy runs only under C:/NightShift/heavy.lock (create only if absent; delete only your own line).
```
