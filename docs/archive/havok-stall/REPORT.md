# havok-stall - implementer report (2026-10-22 ~00:20)

Written by the job lead from the implementer's hand-back (the harness kept the subagent from writing files here).

## Cause: no Havok spin; the runner killed the suite at its time limit
On the desktop (i7-7700K, 8 threads, software GL) `e2e-menus` is killed at the runner's 600 s limit
(`E2E_SUITE_TIMEOUT`); at `E2E_JOBS=1` the runner streams the suite's output and does not print its own "KILLED" line
(`scripts/run-e2e.mjs` 241-247), so the kill looked like a hang.
- Probe 1 (5 CDP pauses 3 s apart at the "stall"): the counters moved (frames 255 -> 287, fixed steps 195 -> 285, rays
  2208 -> 2718); only the first pause was in `HP_World_Step`, the others at the start of Babylon's render function
  (the main thread idle, waiting for the browser's next frame). At most 4 steps a frame, physics dt always 1/60, every
  cast input finite. `docs/anim-joints/J2-STALL.md`'s stacks were snapshots of slow frames, not a spin.
- Probe 2: the browser delivered 1-1.6 frames a second (gaps up to 1.6 s); the tuner-camera `frames(30)` returned after
  24 s. With `E2E_SUITE_TIMEOUT=900` the old suite passed in 894 s; with the default it failed at 632 s, its last line
  "Menu closes it": the "stall" signature.
- Why so slow: the software renderer keeps the CPU at 100%: the match page 2.4-4.2 fps alone, 1.6 fps with the suite's
  1920 x 1080 menu page open beside it; `?gfx=min` did not help (1.8 fps).
- Why always tuner-camera: that block waited 360 rendered frames, so the kill fell inside it.
- Hypothesis (a), a huge backlog after the tuner pause: ruled out (the loop caps real time per frame: 250 ms tick, 0.1 s
  fed in, at most 4 steps, the backlog dropped; the new unit tests show it on the unchanged loop). (b), a degenerate
  cast: no sign.

## Fix
- `scripts/e2e-menus.mjs:385-388`: the menu page goes to `about:blank` before the match page launches (after that it is
  only used for the failure screenshot).
- `scripts/e2e-menus.mjs:548-562` (tuner-camera): the waits of 30 / 90 / 240 rendered frames are `settle(s)` =
  `loop.stepHeadless(s)` + 2 rendered frames (0.5 s, 3 s, 6 s); the asserts unchanged and passing (1.37 -> 1.00 -> 1.37 m).
- `src/core/loop.ts:182-184` (hardening, not the cause): a NaN interval or time scale poisoned the accumulator for good
  (the sim never stepped again); a non-positive or NaN value now counts as 0. No allocation; 60 Hz play unchanged.
- `tests/havokStall.test.ts` (new): a 2 min timeScale 0 hold plus 30 s gaps adds nothing to the accumulator; a release
  with a 60 s interval runs at most 4 steps, then 1 a frame; physics dt always 1/60; NaN / Infinity handled; 60 Hz and
  30 Hz give 600 steps.

## Item 2: the e2e-levels ladder chase
`scripts/e2e-levels.mjs:7-8, 23-64`: `loop.manual = true` from the chase section on; each chase seeds `Math.random`
(Park-Miller, `LADDER_SEED = 7919`), restored in a `finally`; the budget stays 30 s. 3 solo runs: climb-up 15.5 /
10.25 / 15.5 s, down 3.5 s, suite 9 / 8 / 9 s (before: 9-30 s). A seed sweep: the climb-up never takes the ladder when
it runs after a down chase in the same page (the suite's order, up then down, is fine). Listed in backlog "Flaky e2e
suites" as a watch item, not in `KNOWN_FLAKY`.

## Item 3 and docs
`docs/backlog.md` Open item 28: the three rig-pose reads (`enemy.ts:1779-1781`, `playerTarget.ts:101-119`,
`body.ts:96-124`). Backlog "Flaky e2e suites": e2e-menus (cause, fix) and e2e-levels. CHANGELOG "Unreleased -
havok-stall"; TESTING.md (a silent stop at `E2E_JOBS=1` may be the suite limit); `docs/systems/input-and-loop.md` (the
loop's pause / resume rule).

## Runs (desktop, software GL, the default 600 s limit unless noted)
| Run | Result |
| --- | --- |
| `npm run check` | pass: 2475 tests, build ok, 0 lint errors (41 warnings) |
| e2e-menus alone, old test, 900 s limit | ok, 894 s |
| e2e-menus alone, old test | FAIL at 632 s (killed in tuner-camera) |
| e2e-menus alone, fixed | ok, 312 s |
| e2e-menus + e2e-ctcourse + e2e-coop, `E2E_JOBS=2`, run 1 (23:41-00:01) | menus ok 597 s; ctcourse FAIL 602 s, coop FAIL 603 s |
| same, run 2 (00:01-00:19) | menus ok 491 s; ctcourse FAIL 602 s, coop FAIL 612 s |

e2e-menus did not stall in either loaded run; ctcourse and coop were killed at 600 s by the same overload (their files
untouched).

## Open
1. Rerun the loaded set with `E2E_SUITE_TIMEOUT=900` (TESTING.md says so for this desktop) or on the laptop.
2. `scripts/run-e2e.mjs` (outside the file area) should print the KILLED line in streamed mode too.
3. Every warehouse suite runs at 1.5-4 fps on this desktop: other long rendered-frame waits may hit the limit under load.
4. The climb-up after a down chase never takes the ladder: worth a look from the AI side.
