# havok-stall - checker report (2026-10-22 ~00:40, HEAD 3ec2e86a)

## Verdict: PASS

No fix items.

## Findings
1. Diagnosis credible. `scripts/run-e2e.mjs` 241-247: on timeout the KILLED line is appended to `log`, and `log` is only
   printed when `!streamed` (`streamed = jobs === 1`), so at `E2E_JOBS=1` a killed suite ends silently. The report's
   probes (counters moving across CDP pauses, at most 4 steps a frame, the old suite passing in 894 s at a 900 s limit
   and failing at 632 s at 600 s) match a time-limit kill, not a spin.
2. `scripts/e2e-menus.mjs`: after `page.goto('about:blank')` (388) the menu page is used only by the failure screenshot
   (660) and the `errors` filter (662); `G`, `top()` and the other helpers are not called again. The tuner-camera
   `settle()` uses `loop.stepHeadless`, which runs `frameUpdate`, where `shoulderCamera.update` applies `camBoomAdd`
   (`shoulderCamera.ts:338`) and sets `boomActual`; the asserts are unchanged and would still fail if the slider broke
   (cb0 1.37 > 1.2, so the `cb0 < 1.2` escape does not apply).
3. `src/core/loop.ts` 182-184: `NaN > 0` is false, so NaN and non-positive values give 0; Infinity caps at 0.1 s. Two
   comparisons, no allocation. Positive intervals and `timeScale >= 0` give the same values as before; `paused` is
   untouched. `tests/havokStall.test.ts` drives the real `GameLoop.frame` with a stub scene; the NaN test fails on the
   old code (the accumulator goes NaN); the other three pin current behaviour (characterisation).
4. `scripts/e2e-levels.mjs`: `Math.random` is restored in a `finally` inside the evaluate. `loop.manual` is set to true
   and not restored, but only the console-error check follows and the browser closes; nothing later depends on real
   time. The chase body is unchanged; Park-Miller stays exact in doubles.
5. Docs accurate: backlog item 28's line references (`enemy.ts:1779-1781`, `playerTarget.ts:101-119`, `body.ts:96-124`)
   match the code; the flaky-suite entries, CHANGELOG "Unreleased - havok-stall", TESTING.md and `input-and-loop.md`
   match the diff.

## Polish (optional)
- `e2e-menus.mjs:660`: a failure inside the match block now screenshots about:blank; screenshot `M.page` there instead.
- `e2e-levels.mjs`: restore `loop.manual = false` after the chases, so a later step added there does not inherit it.
- `havokStall.test.ts`: `toBeLessThanOrEqual(6)` could be 4 (`MAX_STEPS_PER_FRAME`).
- `loop.ts`: `timeScale = Infinity` with a zero interval still gives NaN (`0 * Infinity`); not reachable from the code.
- `scripts/run-e2e.mjs` (outside the file area): print KILLED in streamed mode (already in REPORT "Open").

## Runs (desktop, software GL, lock held, port 4191)
| Command | Result | Time |
| --- | --- | --- |
| `npm run check` | pass: 227 files, 2475 tests (7 skipped), lint 0 errors / 41 warnings, build ok | 140 s |
| `E2E_PORT=4191 E2E_JOBS=1 node scripts/run-e2e.mjs e2e-menus e2e-levels` | both ok, no console errors | 298 s |
| - e2e-menus | ok (tuner camera 1.37 -> 1.00 -> 1.37 m) | 287 s |
| - e2e-levels | ok (climb up 11.75 s, down 3.5 s) | 12 s |
