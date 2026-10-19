# Sector Ops checkpoint restart - state

**Now:** built (92ccfec6, `REPORT.md`): the cause was the Sector Ops rifle issued without its suppressor (A2), plus
music, leftover gadgets and door memory, and no fresh kit. Light checks pass. The laptop runner has check + smoke,
e2e-sectorops, e2e-coop, e2e-netmove, e2e-combat, e2e-ctcourse, e2e-score on 92ccfec6; a fresh checker writes
`CHECK.md`.
Checker FAIL (`CHECK.md`: a throw in hand at the down finished after the restart); the fix round is committed (839a3a07;
`REPORT.md` "Fix round"): the throw ends at the restore, the e2e shot spot sits in the
18-26 m band with a loud control shot. Light checks pass (tsc, ESLint, vitest sectorRestart 8/8).
**Next:** (1) rerun the targeted Vitest files sectors, sectorStep3, enemyManagerDespawn, arsenal, score, net, gadgets,
sectorRecord (light); (2) the laptop passed 92ccfec6 (check, smoke, e2e-sectorops, e2e-coop, e2e-netmove, e2e-combat,
e2e-ctcourse, e2e-score); send the fix-round head (9a90946e or later) to
the runner: `npm run check`, then `node scripts/run-e2e.mjs smoke e2e-sectorops e2e-coop e2e-netmove e2e-combat
e2e-ctcourse` and `e2e-score`; (3) a fresh checker on the fix round only if e2e needs code changes; (4) the full
`npm run e2e` on the head; (5) the PR to master (a patch) and a message to the orchestrator.
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
