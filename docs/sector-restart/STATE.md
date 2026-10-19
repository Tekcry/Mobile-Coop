# Sector Ops checkpoint restart - state

**Now:** built (92ccfec6, `REPORT.md`): the cause was the Sector Ops rifle issued without its suppressor (A2), plus
music, leftover gadgets and door memory, and no fresh kit. Light checks pass. The laptop runner has check + smoke,
e2e-sectorops, e2e-coop, e2e-netmove, e2e-combat, e2e-ctcourse, e2e-score on 92ccfec6; a fresh checker writes
`CHECK.md`.
Checker FAIL (`CHECK.md`: a throw in hand at the down finished after the restart); the fix round is committed (839a3a07;
`REPORT.md` "Fix round"): the throw ends at the restore, the e2e shot spot sits in the
18-26 m band with a loud control shot. Light checks pass (tsc, ESLint, vitest sectorRestart 8/8).
Fresh checker on the fix round (`CHECK-FIX.md`): the game code holds; its one item (the e2e control assert) is fixed.
**Next:** (1) the laptop runner (queued after CT Core and Menu Notes) on the head with the control-assert fix:
`npm run check`, `node scripts/run-e2e.mjs smoke e2e-sectorops e2e-coop e2e-netmove e2e-combat e2e-ctcourse e2e-score`,
then the full `npm run e2e`; (2) green: the PR to master (a patch) and a message to the orchestrator; a failure in this
job's code: one fix, then the PR with the result written down.
**Open:** doors and shot-out lamps stay as they were at a restart (polish); the co-op client's restart cue is the
banner (A1).

## Done
- 2026-10-19: M9 recorded; branch `feature/sector-restart` from master ce1da1a3 (4.7.2); npm ci. The clean restart built
  (92ccfec6), A1-A4.
- 2026-10-19: fix round 839a3a07 (CHECK.md item: a throw in hand ends at the restore; e2e shot spot in the 18-26 m
  band with a loud control shot). Master 4.7.3 merged in (cb7e1061). Fresh checker (`CHECK-FIX.md`): game code PASS,
  tsc, ESLint and 9 targeted Vitest files (148/148) clean; one e2e script item: the control shot's `lkp` assert read a
  value `EnemyManager.update` clears on the next tick (no sighting since the restart, nobody hunting), so it is
  dropped; the alerted nearest guard stays the control. The laptop passed 92ccfec6 (check and the named suites).

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
