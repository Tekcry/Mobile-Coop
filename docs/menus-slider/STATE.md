# Menus slider fix - state

**Now (2026-10-19):** done; PR to master open, waiting for the orchestrator's review, version (patch) and merge.

**Next:** nothing unless the review asks for changes: make them here, rerun e2e-menus alone on the laptop (port 4191,
`E2E_JOBS=1`, BelowNormal, `C:/NightShift/heavy.lock`), push, tell the orchestrator.

**Open (not this job):** under load (`npm test` alongside an e2e run) 2-9 unit tests time out at Vitest's 5 s default
(operatorsRuntimeFigure, lightField, posture, rig, cameraRigid, detailPass, jammer, netSim); all pass alone in
`npm run check`. A later look: per-test timeouts for the heavy ones, or keep `npm test` off a loaded machine.

## Findings
- The repeat logic is correct: `NavRepeater` (`src/input/navRepeat.ts`, 0.4 s delay, 0.11 s interval) and
  `adjustHold` (`src/ui/focusNav.ts`, fast after 1 s, chain 0.5 s) match SPEC 4.2. No game change.
- Both read wall time (`performance.now()`) but only advance when a frame runs, so a stalled frame loses steps. A stall
  longer than `ADJUST_CHAIN_S` (0.5 s) between two repeats also restarts the hold, so fast needs another 1 s. That is a
  load artefact (at 60 fps repeats are 0.11 s apart); the test now waits on the condition instead.

## Done
- 2026-10-19: verify round 2 (with A1): `npm run check` PASS; e2e-menus 5/5 alone (99-126 s) and 1/1 with `npm test`
  alongside; the slider check settles at sfx 0.45-0.6 with a fast step every run.
- 2026-10-19: verify round 1: check PASS; e2e-menus runs 2-5 and the load run PASS, the slider check passed all 6;
  run 1 (257 s, loaded) failed on the results-screen wait (15 s cap), hence A1 (BRIEF).
- 2026-10-19: branch off master 7c950acc; BRIEF, STATE; e2e-menus holds right until fast > 0 and sfx > 0.2 (15 s cap).
