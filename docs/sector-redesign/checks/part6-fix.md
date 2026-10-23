# e2e-sectorops part 6 fix (laptop GPU run at 4def7d24)

## (a) "five sections ... the other stubs none"
- Cause: the assert predates slice 3; S3 is built with 16 guards.
- Real counts (read from `CAMPUS_SECTORS`): s1 download 8, s2 hack 12, s3 grab 16, s4 grab 0, s5 grab 0.
- Change: `scripts/e2e-sectorops.mjs:1612` now asserts s3 = 16 and only S4 / S5 at 0.

## (b) "every walked S3 route leg has a nav path" (leg 4 of all three routes)
- The failing leg is index 4 of `S3_ENTRY`: `[13.3, -27.4, 2.25] -> [12.6, -23, 0]`, the SW stair's G flight from the half
  landing down to the G door. Index 3 (L1 landing -> half landing) passes. The stair exists and the route is right.
- Cause: `LevelBuilder.ramp` lowers the collision slab by half its thickness vertically only, so the ramp's top face sits
  0.06 m high and its tilted end cap (normal y 0.58) reaches 0.09 m into the flight's top end. The G flight (yaw PI, top at
  z -26.8) is one nav cell wide (x 12.75; the wall and the divider block x 12.25 and 13.25). Its cell at z -26.75 falls in
  the end cap, so it samples as unwalkable (ok needs normal y > 0.65). That cuts the flight off the half landing, so
  there is no G <-> L1 path on the runtime grid. The north stair and the SW upper flight are fine only because their cell
  centres fall outside their caps. The S3 unit test's `analyticNav` misses this because it models flights as smooth ramps.
- Change: `src/world/maps/campusS3.ts:350-356` adds an invisible 0.2 m collision lip to the half landing
  (x 12..13.25, z -26.8..-26.6, top 2.25, overhead + noLedge) over the G flight's top end. The cell now samples 2.25,
  walkable. The route and the design are unchanged (SPEC S3, slice3-check note 7).
- Not changed: the `ramp()` formula. Fixing it would move every map's stair and ramp collision, so it belongs on the
  backlog. Other ramps whose end caps land on a one-cell-wide flight could hit the same bug.

## Unit check on the runtime nav construction
- `src/ai/navBuild.ts`: `buildNavGrid` now calls a new `navGridFromLevel(level, seed, layers, extraSeeds, castDown)`
  with Havok's down-ray. The runtime behaviour is the same; the sampling code is shared, not copied.
- `tests/helpers/runtimeNav.ts`: an analytic down-cast over the level's collision boxes (with yaw and pitch, so ramps are
  the real 0.3 slabs) and cylinders. A ray starting inside a piece misses it. Doors are left out (`Doors.arm` runs after
  the grid). `runtimeNav(b, spawn, layers, seeds)` builds the grid the game builds.
- `tests/campusRuntimeNav.test.ts`: the e2e's leg check for S1 / S2 / S3 with the e2e's search budgets (60000 /
  200000 / 60000). Before the fix it failed with exactly the e2e's three legs; S1 and S2 passed, as on the laptop.

## Tests
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run` campusRuntimeNav, campusS1, campusS2, campusS3, kestrelCampus, sectors, sectorSlice0, sectorStep3:
  8 files, 171 tests passed. nav, navClosure: 21 passed. ESLint on the changed src / tests files: clean.
- e2e not run (the lead reruns `e2e-sectorops` part 6 on the GPU).
