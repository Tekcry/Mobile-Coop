# Unit test timeouts under load - brief

Set by the orchestrator, 2026-10-19 16:30. Branch `feature/unit-timeouts` off master 7c950acc, folder
`C:/NightShift/Mobile-Coop-unit-timeouts`. Runs on the laptop between test-runner requests (they interrupt it).

## Problem
With an e2e run alongside, `npm test` timed out 2-9 tests at Vitest's 5 s default (seen in the menus-slider verify
runs): operatorsRuntimeFigure, lightField, posture, posture-p1c, rig, cameraRigid, detailPass, jammer, netSim. All
pass alone.

## Fix
`testTimeout: 120_000` in `vitest.config.ts` (A2, A3). No change to what any test checks.

## Verify
`npm run check`; then `npm test` with an e2e suite running alongside, 2 runs, 0 timeouts.

## Laptop rules
BelowNormal priority, `E2E_JOBS=1`, port 4191, headless only, `C:/NightShift/heavy.lock` for any npm ci / build /
test / e2e.

## Finish
One PR to master; the orchestrator sets the version and merges.

## Decisions
Assumed:
- **A1 posture-p1c is in the set.** It timed out in the same runs though the orchestrator's list did not name it.
- **A2 one global 30 s `testTimeout`, not per-file.** The first try (a file-scoped `vi.setConfig` in the 9 files) failed
  `npm run check` with no e2e alongside: a tenth file, voxelFit, timed out at 5.5 s on the loaded laptop. The set of
  heavy files is open-ended, so a per-file list keeps breaking. 
  Undo: remove `testTimeout` from `vitest.config.ts` and add `vi.setConfig({ testTimeout: 30_000 })` after the
  imports of each heavy file instead.
- **A3 120 s, not 30 s.** With 30 s, 2 and 9 tests still timed out in the two loaded runs: under e2e-menus the unit
  run took 121-148 s against about 14 s alone (20 workers at BelowNormal beside software-GL Chromium). 120 s is a hang
  guard; cost: a test that really hangs takes 2 minutes to fail. Undo: set it back to 30_000 (or remove it).
- **A4 per-test timeouts under 120 s are removed** (readyHands 60 s x2, menuShots 30 s x2, score 20 s): they override the
  default, and readyHands timed out at its own 60 s under load. losParity (240 s) and operatorsRuntime (120 s) keep
  theirs. Undo: restore the second argument to those `it` calls.
- **A5 settings.test's round trip waits for its own debounced save.** Under load its `SettingsStore` save (250 ms
  timer) fired during the later touch-record test and overwrote kv/settings (reload KeyR, not KeyT), in both loaded
  runs. The test now awaits that save before it ends; its checks are unchanged. Undo: drop `done` / `saved` in
  "round trip through SettingsStore".

## Out of scope
- lightField's "allocation-free under a loop" fails its heap assertion under load (it measures new-space growth; V8
  under starvation boxes more). Not a timeout; making it pass would change what it tests. Reported to the orchestrator.
