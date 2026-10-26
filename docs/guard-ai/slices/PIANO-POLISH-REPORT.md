# Piano polish report (stacked on feature/guard-ai-piano-sweep, #624)
Builder: Opus 5.5, 2026-10-27. Scope: the two Polish items of `PIANO-GA6-CHECK-A.md` "Polish (re-check)". Scene only:
everything new runs only while `walker.sweeping` (set only by `em.sceneDark`); off the scene nothing changes.

## 1. Stranded off his storey with no path home
Before: a swept guard off his home storey (`away`) walked `goTo(stop, homeY) ?? stop`. With no path up (a stair gate
shut behind him, or past `goTo`'s 3000-cell budget) that is a straight walk to the spot under the stop, then a stand
there for good.

Now:
- `src/ai/sceneSweep.ts:37` `SCENE_SWEEP.strandT: 4` (s). `goTo` replans a missed goal once a second (`routeT` 1 s), so
  4 s is four misses in a row, not one plan caught mid door swing; and a 4 s stand reads as one more pan hold (3 s), not
  a frozen guard.
- `src/ai/sceneSweep.ts:40` `SCENE_SWEEP.strandRetry: 8` (s): the way home is tried again this often. About one 6 m leg
  at the 0.7 m/s pace, so a reopened gate is noticed within a leg; one A* per stranded guard per 8 s.
- `src/ai/enemy.ts:636-638` fields `swNoPath` (seconds in a row away with no path home) and `swRetryT`.
- `src/ai/enemy.ts:3037` `sweepWalk` (replaces the inline `goTo(g, dt, 0.05, homeY) ?? g`, same result when not
  stranded): away and `goTo` null adds to `swNoPath`; a found path zeroes it. At `strandT` the retry timer starts and the
  route plan is cleared (`routeFresh`, `:3006`: `routeGoal` does not hold the goal height, so the floor plan to the same
  stop would otherwise wait out the missed home plan's `routeT`). Stranded, the walk is `goTo(g, dt, 0.05)` on the storey
  he is on; a stop with no path there either calls `PatrolWalker.sweepHere` (below).
- `src/ai/enemy.ts:3017` `sweepStranded`: stranded once `swNoPath >= strandT`; every `strandRetry` s one `goTo` to the
  current stop on `homeY` (route state cleared before and, on a miss, after). Found: `swNoPath = 0`, the plan just made
  is walked from the same tick.
- `src/ai/enemy.ts:3147-3153` and `:3179` the calm branch: `swNoPath` is zeroed on his storey or off the sweep; the walker gets
  `away && !strand`, so stranded he walks the lap at the stops' (x, z) on this floor: walks, holds, pans, keeps the
  schedule. Fixed and explainable, no randomness.
- `src/ai/enemy.ts:3001` `rejoinHome` zeroes `swNoPath`: back from an incident, a fresh try home first.
- `src/ai/patrol.ts:348` `sweepHere()`: the next sweep step takes the stop he heads for as reached where he stands (once;
  dropped when away). A pan stop is held and panned on the spot, a corner passed. So with no stop reachable on this
  floor he holds and pans in place, stop by stop round the schedule.

## 2. A pan cut by `away` restarts at its stop
Before: `away` during a hold froze `swPanE`; back on his storey the hold resumed at once, wherever he stood, and the pan
went on from partway.

Now (`src/ai/patrol.ts:86` `swCut`, `sweepStep` `:240-268`): away mid-hold sets `swCut` and `swPanE = NaN`; the hold's
`swHoldEnd` is kept, so a hold that runs out while away still moves him on (as #624). Back on his storey the hold goes
on only at the stop (within `PATROL.arrive`, or `sweepHere`); until then the stop is the point to walk to. There
`swPan` starts over: onto the start yaw (the N2 body gate), then the cycle from 0 (or the GA6b early-hold / rejoin
whole-cycle split if more than D is left), cut at `leave` as any late arrival. `setSweep`, `clearSweep` and
`sweepRejoin` clear `swCut` / `swHere`.

## Tests
- `tests/patrolSweep.test.ts:477` "patrol sweep: piano polish" (4 cases): the cut pan starts over at the centre and runs
  on from there, the hold still ends at its leave; back on the storey 3 m off the stop he walks to it, then the pan
  starts over; a cut hold that runs out while away still advances `idx` (regression guard, passes either way);
  `sweepHere` (pan stop held here, once only, a corner passed, dropped when away, no-op off the sweep).
- `tests/pianoGuards.test.ts:799` "piano polish: a swept guard off his storey with no path home" (4 cases, the real
  class via `sweepGuard`, a `goTo` stand-in that blocks the home storey): under his stop he walks the lap on the floor
  after `strandT`, out to the far stop and back, never still longer than `strandT` + a hold + 1.5 s over 60 s; the way
  home tried exactly twice in 2 x `strandRetry` s, and once open he walks it within `strandRetry` (home-storey `goTo`
  only, no floor holds); no path on the floor either: he holds and pans in place through both stops of the lap; a rejoin
  zeroes the give-up.
- `tests/helpers/sweepGuard.ts`: the stand-in gets `swNoPath` / `swRetryT` as the constructor sets them.

Results:
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/patrolSweep.test.ts tests/pianoGuards.test.ts`: 55 passed.
- Against the pre-fix `src/ai/{patrol,enemy}.ts` (the new constants kept): 7 of the 8 new cases fail (all but the
  regression guard); restored after.
- `npx vitest run` on every test file matching sweepStep / sweepClock / sweepCalm / sceneDark / setSweep / sweepGuard /
  importing `src/ai/patrol` or `src/ai/enemyManager`, plus `lockedDoorPath` and `guardAiAllocManager` (75 files): 74
  passed, 1 skipped; 1838 tests passed, 1 skipped, 2 todo.
- `tests/changesFragments.test.ts`: passed.

## For the checker
- Allocation: nothing per tick. `goTo`'s `findPath` returns a new array as it always has (at most one home try per
  `strandRetry` s while stranded, plus the floor replan after a missed try).
- The home try uses `goTo` (3000 cells, not partial). A way home that exists but is past that budget is never found by
  the try: he walks the floor lap for good, trying every 8 s. The #588 long plan (`homeLongPlan`) is not used on the
  sweep (as #624). Acceptable per the brief (never frozen), but a way past the budget never gets him home.
- `waiting` still reports a cut hold's time left while he walks back to the stop (it is the hold's schedule, not a
  hold in progress).
- Stuck with a path (a path found but no progress, e.g. a body in the way) is not covered here: that is `homeStep`'s
  job off the sweep, and the sweep has never used it.
