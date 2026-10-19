# Sector Ops checkpoint restart - state

**Now:** branch and docs set up (master 4.7.2); the implementer is finding the cause and building the clean restart.
**Next:** light checks on the desktop, `npm run check` + e2e-sectorops on the laptop runner, a fresh checker (one fix
round), the full e2e, the PR (a patch).
**Open:** none yet.

## Done
- 2026-10-19: M9 recorded; branch `feature/sector-restart` from master ce1da1a3 (4.7.2); npm ci.

## Resume prompt
```
Night Shift | Sector Restart. You are the job lead for the sector-restart job (Sector Ops checkpoint restart, M9; low
priority, after CT Core and Menu Notes). Work only in C:\NightShift\Mobile-Coop-sector-restart on branch
feature/sector-restart (git pull --ff-only first). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, then
docs/sector-restart/STATE.md and BRIEF.md, and docs/sector-ops/STATE.md for the Sector Ops background. Carry on from
STATE "Now / Next" with an implementer and a fresh checker (docs/systems/session-method.md). Heavy runs only under
C:/NightShift/heavy.lock when CT Core and Menu Notes are not waiting; otherwise light commands only and send suites to
"Night Shift | Character Build" (branch, commit, suites). One PR to master (a patch). Report to "Night Shift |
Orchestrator" when the PR is open.
```
