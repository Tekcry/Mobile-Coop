# lightField heap check under load - brief

Set by the orchestrator, 2026-10-19 (a filler job between laptop runner requests). Branch `feature/lightfield-heap`
off master 4.7.0 (fca0e267), folder `C:/NightShift/Mobile-Coop-lightfield-heap`.

## Problem
`tests/lightField.test.ts` "allocation-free under a loop" fails under load, and now in `npm run check` alone on the
laptop (expected 41.97 < 39.54: `level < ctl - 32`). It guards that `LightField.levelAt` / `bodyLevel` allocate
nothing per query beyond V8 boxing a returned double (`BOXED_BUDGET` 64 B; `bodyLevel` 128 B), and that this is
clearly below one real allocation (a 3-vector control, 32 B margin).

## Cause
The measurement, not the field. Two skews, seen in the loaded runs of the unit-timeouts and menus-slider jobs:
- The background compiler had not installed the optimized loop after the fixed warm-up, so the field's doubles were
  still boxed: 35-42 B a query (alone: about 0).
- A scavenge inside the control round (20000 x a vector, about 1.4 MB) shrank new space, so the control read low
  (15 B; the relative check then needed a negative number).

## Fix
Tests only, same asserts and limits:
- Rounds of 5000 queries (the control about 0.4 MB, under the 1 MB minimum semi-space, so no scavenge fits after the
  `gc()` that starts each round).
- Up to 40 rounds with a 25 ms yield between them so the compiler can finish; the field keeps its smallest round and
  stops once that meets its limit; the control keeps its largest round (it is measured first and sets the field's
  target).
- What it guards is unchanged: a query that allocates an object (16 B+ each, plus the boxed result) can never read
  under the limits in any round, and with no scavenge in a round a smaller number cannot be an artefact.

## Verify
`npm run check` 5 times with an e2e suite running alongside (laptop, BelowNormal, `C:/NightShift/heavy.lock`); the
test's "bytes per query" line logged each run.

## Finish
One PR to master; the orchestrator sets the version and merges.
