# Menus slider fix - brief

Set by the orchestrator, 2026-10-19 16:00 (Michael chose it). Branch `feature/menus-slider` off master 4.6.5
(7c950acc), folder `C:/NightShift/Mobile-Coop-menus-slider`. Runs on the laptop. One step, no PLAN.

## Problem
`scripts/e2e-menus.mjs` held d-pad right on the Audio > Effects slider for a fixed 3.2 s of wall time, then asserted
a fast step happened and sfx > 0.2. Under load it failed (2 of 3 desktop runs; alone it passed): the menu repeat
(0.4 s delay, x5 steps after 1 s, menu-ui SPEC 4.2) only advances on frames, and stalled frames fit fewer steps in 3.2 s.

## Fix
Hold right until `window.__fast > 0` and sfx > 0.2 (`waitForFunction`, 15 s cap), then release; the old assert still
reports. Game code only if the repeat logic is wrong (then in `src/ui` with a Vitest test).

## Verify
`npm run check`; e2e-menus 5 times in a row on port 4191; once more with `npm test` running alongside. All pass.

## Decisions
Assumed:
- **A1 the results-screen wait in the same file gets a 60 s hang guard (was 15 s).** Verify run 1 (257 s under load,
  others about 105 s) failed there, not on the slider: `endSession` pushes the results screen after a 1.8 s timer, and
  the element became visible just as the 15 s cap ran out. Same wall-time-under-load cause; one line. Undo: set the
  timeout back to 15000 in `scripts/e2e-menus.mjs` ("results" block).

## Laptop rules
BelowNormal priority, `E2E_JOBS=1`, headless only, `C:/NightShift/heavy.lock` for any npm ci / build / test / e2e.

## Finish
One PR to master, "menus-slider: e2e-menus hold-repeat waits on the condition". The orchestrator sets the version
(patch) and merges.
