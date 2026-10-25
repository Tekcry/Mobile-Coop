# lightField heap check under load - brief

Set by the orchestrator, 2026-10-19 (a filler job between laptop runner requests). Branch `feature/lightfield-heap`
off master 4.7.0 (fca0e267), folder `C:/NightShift/Mobile-Coop-lightfield-heap`.

## Problem
`tests/lightField.test.ts` "allocation-free under a loop" fails under load, and now in `npm run check` alone on the
laptop (expected 41.97 < 39.54: `level < ctl - 32`). It guards that `LightField.levelAt` / `bodyLevel` allocate
nothing per query beyond V8 boxing a returned double (`BOXED_BUDGET` 64 B; `bodyLevel` 128 B), and that this is
clearly below one real allocation (a 3-vector control, 32 B margin).

## Cause
The measurement, not the field. Three skews, seen in loaded runs (unit-timeouts, menus-slider) and in this job's own
measurements (the "bytes per query" line, `vitest run tests/lightField.test.ts --silent=false`):
- The background compiler had not installed the optimized loop after the fixed warm-up, so the field read high
  (35-42 B a query; optimized it is a steady 32.4 B, two boxed doubles).
- A scavenge inside the control round (20000 x a vector, about 1.4 MB) shrank new space, so the control read low
  (15 B; the relative check then needed a negative number).
- The control's vector never escaped its loop, so a fully optimized control was partly scalar-replaced: 63-72 B
  instead of 272 B. Against the field's 32.4 B that leaves about 31-40 B, so `level < ctl - 32` failed whenever the
  control got fully optimized and the field did not (41.97 < 39.54).

## Fix
Tests only, same asserts and limits:
- Rounds that fit in new space after the `gc()` that starts each: the field 5000 queries (it allocates only boxed
  doubles), the control 2000 (2000 x 272 B, about 0.5 MB, under the 1 MB minimum semi-space), so no scavenge can
  make a reading low.
- Up to 40 rounds with a 25 ms yield between them so the compiler can finish. Each measurement keeps its smallest round
  (the optimized code; the strict side). The field queries stop once their smallest meets their limit; the control
  runs all 40.
- The control's vector goes into a 64-slot ring, so it escapes and cannot be optimized away: it is the real
  allocation it stands for, 272.4 B every run.
- What it guards is unchanged: a query that allocates an object can never read under `BOXED_BUDGET` (64 B; bodyLevel
  128 B) in any round, and the field still has to sit at least 32 B under one real allocation.

## Measured (laptop)
With e2e-menus running alongside, 6 runs, and alone, 3 runs: levelAt 32.4, bodyLevel 113.2-121.0, control 272.4 B a
query, every run. Before (same harness, the old measurement): the control read 62.7 B once and the check failed
(32.38 < 30.73).

## Verify
`npm run check` 5 times with an e2e suite running alongside (laptop, BelowNormal, `C:/NightShift/heavy.lock`); the
test's "bytes per query" line logged each run.

## Finish
One PR to master; the orchestrator sets the version and merges.
