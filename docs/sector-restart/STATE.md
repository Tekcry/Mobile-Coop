# Sector Ops checkpoint restart - state

**Now:** built (92ccfec6, `REPORT.md`): the cause was the Sector Ops rifle issued without its suppressor (A2), plus
music, leftover gadgets and door memory, and no fresh kit. Light checks pass. The laptop runner has check + smoke,
e2e-sectorops, e2e-coop, e2e-netmove, e2e-combat, e2e-ctcourse, e2e-score on 92ccfec6; a fresh checker writes
`CHECK.md`.
**Next:** one fix round from the runner and the checker, then the full e2e on the head, then the PR (a patch).
**Open:** doors and shot-out lamps stay as they were at a restart (polish); the co-op client's restart cue is the
banner (A1).

## Done
- 2026-10-19: M9 recorded; branch `feature/sector-restart` from master ce1da1a3 (4.7.2); npm ci. The clean restart built
  (92ccfec6), A1-A4.

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
