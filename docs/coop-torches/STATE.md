# coop-torches - state

## Now
Implementer building (2026-10-21).

## Next
1. Implementer (report docs/coop-torches/REPORT.md), fresh check (CHECK.md), one fix round.
2. `npm run check`, e2e-coop and e2e-netmove (port 4191, desktop heavy.lock); push; PR to master; Character Build full
   e2e (copy the orchestrator); message the orchestrator with the head.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for coop-torches. Folder C:/NightShift/Mobile-Coop-coop-torches,
branch feature/coop-torches (PR to master). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-coop-torches && test "$(git rev-parse --abbrev-ref HEAD)" = feature/coop-torches && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-coop-torches"
Read CLAUDE.md, docs/coop-torches/BRIEF.md and this STATE.md; carry on from "Next". Report to "Night Shift | Orchestrator".
Heavy runs only under C:/NightShift/heavy.lock (create only if absent; delete only your own line).
```
