# Slice 3 check - S3 lab block, first lasers (checker: Opus, 2026-10-23)

Commit checked: 66287baa on `feature/sector-redesign-s3` (base 95097957). Read-only: I edited nothing but this report.
My probes ran from the scratchpad. They used a vitest config that points at this tree.

## Verdict: 1 fix, nothing unplayable

S3 plays solo by the stealth route, as far as unit tests can show. The lasers are alarm-only, each with one panel on
its near side. Every guard is armed. tsc and the tests are green. One item must be fixed: the A64 screen-count test
passes only because of how it samples. The real worst view on the crane walkway is 8 awake guards at route vertices,
or 9 with guards between vertices. The build sheet says 6. That is the slice's perf acceptance and it is wrong, so it
gets the one fix round. Everything else is a recommendation or polish.

## Checks
- `npx tsc --noEmit -p .`: exit 0.
- `npx vitest run tests/campusS1.test.ts tests/campusS3.test.ts tests/laserPanels.test.ts`: 3 files, 96 tests pass.
- Static `src/net` imports and `Math.hypot` in the src diff: none. The only allocations are in build-time map code
  (`wall()` Set / filter); the hot paths are untouched.
- A scratch merge, `git merge-tree 66287baa feature/sector-redesign` (S2 f5422070): 4 files conflict (see "Merge").

## Fix (the one round)

**F1. A64 is not met and its test cannot see the failure** (`tests/campusS3.test.ts:563-594`, geometry
`src/world/maps/campusS3.ts:367-370`).
- **Cause.** The grid is x 11, 13, ... and z -29, -27, .... The nav cell holding z -29 is the walkway's north half
  cell, and the walkway rail (x 23.5..50.5, z -28.7..-28.6) blocks it. So the test skips the walkway everywhere
  except x < 23.5 and x > 50.5, and its "worst" (51, 6, -29) is the walkway's unrailed end. It also counts route
  vertices only and samples 16 facings.
- **Measured** with the test's own sight model (`SightWorld`, chest 1.2, eye 1.6, 86 deg, 40 m), on a 0.5 m grid with
  64 facings:

  | Guard positions | Worst view | Points over 6 |
  | --- | --- | --- |
  | Vertices only | 8 at (25.5..29.5, 6, -29.25): #3, #4, #6, #7, #8, #11, #13, #16 | 39 |
  | Every 1 m along the route (`guardPoints`) | 9 at (23.5..29.5, 6, -29.25) | 161 |

  All of these points are on the crane walkway, which is the planned high route.
- **Layout fix (measured).** Raise the viewing-corridor spandrel from 5.8 to 6.2 (`S3_SPANDREL_TOP` for the x 22..52
  north-wall glass only; the landing glass at x 22 can stay 5.8).
  - Vertices only: the worst view drops to 5, at (22.5, 0, -9.25).
  - Every 1 m with the gallery door leaf counted as shut: worst 6, none over.
  - The only remaining 7s look through the open gallery door hole, and that door is a real leaf in play.
  - Cost: corridor guards (eye 6.05) lose their view down to the far half of the hall. The 5.8 spandrel already hid
    the near 12 m, so the stealth route under the corridor does not change.
  - 6.0 is not enough: the vertex worst stays at 6 and the between-vertex worst is 7.
  - The other way out: shorten the walkway's west end to start east of x ~31. That loses the SW caged ladder, which is
    the high route's way in.
- **Test fix.** Sample every walkable nav cell centre on every layer with h <= 7 (or offset the grid by a quarter
  cell). Use 32 or more facings. Count a guard by `guardPoints` (every 1 m along the route), not by vertices: guards
  start out of phase in play, so their positions can combine freely. Optionally add door leaves as occluders.
- **Done looks like:** the A64 test samples the walkway interior (assert at least one sample at y 6 with 24 < x < 50),
  uses `guardPoints`, prints a worst of 6 or less, and the build sheet's A64 line gives the new worst point and count.

## Judgements asked for

**1. A64 (6 at (51, 6, -29)): not robust.** See F1: the test never sampled the real worst place.
- The dormant tags follow the rule: #12 (security room) and #14 (east yard) only; no pair, posted guard or handler.
- #12 is 7 m from the objective through the store's east wall. Guard-render has to wake him by distance when a
  player is in the store. Note this for Character Build.
- #14 can never be seen or met. L10 left out the east windows, so tagging him dormant is right (see Polish).

**2. Merge with S2.** Exact instructions are in "Merge" below. All four conflicts are mechanical. One real hazard:
`Doors.nearest` is plan-only (`sectorMode.ts:163-164`, `DOOR_FIND` 1.2). S2's C2 far door is (10, -14) at floor 4.4,
and S2 builds no door there ("S3 builds it later"). If S3 keeps its ground door at (10, 0, -14), C2's far door
resolves to that ground door and the bridge ends on a solid L1 wall. That is a softlock, so L13 is required, not
optional.

**3. Lasers: they pass the rules.**
- Both are alarm-only (`laserTouch` then `deviceAlarm`, no damage), section 2, drawn in night vision only (one mode),
  each with a visible emitter box and exactly one panel (`checkPanels`).
- **las-store** protects the objective shelf. The x 48.5 partition (2.4, noLedge, above the 1.8 mantle) leaves only
  the z -4.6..-3.4 gap. The beams sit at 0.5 and 1.1, so a crouch (0..1.1) touches both: jam or trip.
- panel-store is on the partition's west face. Its eye lines from the three near-side points are clear and inside
  jammer range (unit test). The store is dark and unwatched, so a player can reach it.
- **las-gown** spans the gowning to clean-room pass-through. Its panel is on the gowning room's north wall, seen
  through the gowning door from the corridor and from inside the room. It has a stated reason (cleanroom intrusion).
  However, the clean room is a dead end: nothing is in it and no route uses it (see R2).

**4. Michael 01:50 and the difficulty ramp.**
- **Unavoidable guard:** S3 has none by design (A60: chokes in S1, S2, S4, S5; S3's test is the lasers and the clean
  room). The unit test asserts there is no posted guard and no post block.
- After the merge, #1 (bridge landing, facing the bridge door from 5 m, his back to the SW stair) stands across the
  only way off the landing (L12). He becomes a near-choke, which fits the ramp. The lead decides whether he gets
  `role: 'posted'` and a post block (R3).
- **Armed:** `checkSectorGuards` passes. Kinds are 7 officers, 8 grunts and 1 enforcer; no dogs.
- **Ramp:** guards 12 -> 16. Lasers are new (2). Alarm panels stay at 2. Cameras drop from 3 to 2. Peak alive is
  16 + 6 = 22, within the cap of 32.
- **Solo:** the stealth route's legs all have nav paths (unit). The e2e is written but has not run.
- **Co-op:** CR3 passes rules 1-7, and the generic CR loop in `campusS1.test.ts` passes with CR3 added (probe). Its
  payoff is weak (R1).
- **Cameras:** cam-view (store hatch, corridor) and cam-dock (C3 door), both range 10 with an aim and a reason. That
  is 2 live, well under 12 per section.

**5. Hot paths and net imports:** clean.

## Merge (S3 onto `feature/sector-redesign` f5422070, S2)

Conflict resolution:
1. `campusOps.ts`:
   - Imports: keep both the S2 and S3 import lines. Drop `C1_GAP` from the S1 import (S2 dropped it).
   - `otherBuildings`: drop both the S2 shell line and the S3 shell line (keep only S4, S5 and S2's connector edits).
   - `build`: call `buildCampusS1`, `buildCampusS2`, `otherBuildings`, `buildCampusS3`, in that order.
   - Layout arrays: S1 + S2 + S3 for pickups, hideSpots, switches and rooms; navSeeds is
     `[...S1_NAV_SEEDS, ...S2_NAV_SEEDS, ...STUB_NAV_SEEDS, ...S3_NAV_SEEDS]`. Keep `lasers` / `laserPanels` and the
     alarm `a.y ?? 0` (both branches have it).
2. `campusSectors.ts`:
   - Imports: `import { C2_BOX, C2_FLOOR, S2_DOORS } from './campusS2'` and `import { S3_L1 } from './campusS3'`
     (`S3_DOORS` is still used for C3).
   - `levels: { ground: 0, l1: 4.4, 's3-l1': S3_L1 }`. The ids do not clash (S2 is 4.4, S3 is 4.5).
   - `devices`: S1's two cameras, S2's three, then `...S3_CAMERAS`.
   - `CAMPUS_ALARMS`: S2's three-entry list plus `...S3_ALARMS`.
   - The S3 entry: take S3's, with `start: { x: 7, y: C2_FLOOR, z: -14, yaw: PI / 2 }`.
3. `tests/campusS1.test.ts`:
   - Line ~121: take S3's `(stub)` name filter. S2's `slice(2)` would now include the built S3.
   - Line ~276: take S2's `lay.alarms!.filter((q) => q.section === 0)[0]`.
   - Line ~331: take S2's `z < -32`.
4. `changes/feature-sector-redesign.md`: keep both lines.

Then the L1 / L13 edits (no conflict markers; these break a test or the game if missed):

5. **L1, the co-op lips.** Join CR3 to `CAMPUS_COOP_LIPS` the way S2 does at `campusS2.ts:140`: a guarded push in
   `campusS3.ts` after `S3_COOP_LIPS`. Cleaner: build the list once in `campusOps.ts`. Then flip
   `tests/campusS3.test.ts` (the CR3 `describe`, first `it`) from
   `expect(CAMPUS_COOP_LIPS.some((l) => l.id === 'CR3')).toBe(false)` to `toBe(true)`. My probe shows CR3 passes the
   S1 test's generic loop (`soloJumpThreats` / `soloTopLandingThreats` with `() => false`, and rule 2 on the lip line).
6. **L13, C2's far door on L1.**
   - In `campusS3.ts:322`, change the x 10 wall's hole from `doorHole(-14.6, 0)` to
     `[-14.6, -13.4, S3_L1, S3_L1 + DOOR_H]`.
   - In `campusS3.ts:325`, change `doorAt(b, false, 10, -14.6, 0, 1)` to `doorAt(b, false, 10, -14.6, S3_L1, 1)`.
   - This walls up the ground door, so only the L1 door is within `DOOR_FIND` of (10, -14).
   - The bridge deck is 4.4 and the landing 4.5: a 0.1 step, under `stepHeight` 0.45.
   - #1's yaw (-0.927) already faces (10, -14). He keeps 7.6 m from the start.
7. **L13, the S3 routes (`campusSectors.ts`, `S3_ROUTES`, all three).** Replace the opening `[7, -14], [11, -14]` with
   the bridge, the landing and the SW stair down. Suggested points (verify them with the unit route test):
   `[7, -14, 4.4], [11, -14, S3_L1], [14, -21.6, S3_L1], [14, -23, S3_L1], [13.3, -27.4, 2.25], [12.6, -23, 0],
   [12.6, -21.6, 0]`, then the existing `[20.5, -18], ...`. Shift each `obj` index by +5 and `climbs` [4, 6] to
   [9, 11].
8. **`tests/campusS2.test.ts:155`.** `lay.switches!.length` must be `5 + 7 + 9` (S3 adds 9 switches). Line 544
   filters by S2 group ids, and S3's groups (60-67) do not collide.
9. **`laserPanels.test.ts` stays at 8** (S2 has no lasers). The e2e S3 part takes S2's checkpoint from `sections()`,
   so it follows the L1 start. Check its `(7, -14)` assumptions on the first merged e2e run.

## Recommendations (lead decides; not blocking)
- **R1. The CR3 payoff lands in front of the keyholder.** The gallery door (40.7..41.9, z -8, L1) opens into the lit
  viewing corridor.
  - #5 stands 6.6 m east of it, about 9 deg off his facing. cam-view's 10 m cone ends at x 41.7, and the pair's east
    stop is at x 44.
  - The solo route reaches the same north-stair L1 point out of sight, through the stair's east door into the back
    corridor.
  - So CR3 is shorter but not safer, which is weak against rule 8.
  - Options: a door from the gallery straight into the north stair core, or #5 facing the hatch rather than down the
    corridor. Settle it at Michael's playtest.
- **R2. las-gown guards a dead end.** Either give the clean room something (optional intel such as the store's
  keypad code, which suits EW5 / A4, or a pickup), or add a second, riskier way into the store through it. Otherwise
  it can read as a laser "for the sake of having it" (M1).
- **R3. After the merge, #1 is effectively S3's choke.** Either tag him (`role: 'posted'`, leash about 3, guards
  `c2-door`, a choke assert) or log that he is a soft near-choke.
- **R4. Skipped e2e** (PLAN slice 3): the CR3 browser probes and the co-op leg-up are not written. The unit tests
  cover the reach rules. Add the probes when the merged branch runs e2e on the laptop.

## Polish
- #14 (east yard) cannot see in (L10: no high windows) and no route passes him. Add the high windows, or keep him
  as a dormant count-filler and say so in the build sheet.
- `wall()` in `campusS3.ts` duplicates the S2 helper. Share it when S4 starts.
- `S3_DOORS.c2Far` is unused after the merge.
- The cam-dock exit: the route reaches the C3 door along the north wall, behind #9 and outside the camera's
  86-degree view. No test covers it. Add it to the e2e exit leg.

## Fix round (Opus implementer, 2026-10-23)

F1 fixed. Nothing committed.
- **Geometry.** New `S3_VIEW_SPANDREL_TOP = 6.2` (`campusS3.ts`) for the viewing corridor's x 22..52 north wall and its
  two glass fences; the landing glass at x 22 keeps `S3_SPANDREL_TOP` 5.8. SW and SE ladders and the walkway unchanged.
  Logged as BRIEF A70 (undo: point the corridor wall back at `S3_SPANDREL_TOP`).
- **Test** (`tests/campusS3.test.ts`, A64): every walkable nav cell centre (0.5 m) in the S3 footprint on every layer
  with h <= 7 (7645 samples, 52 on the walkway interior x 24..50 at y 6, asserted > 50), 32 facings, every guard
  point from `guardPoints` (post plus every 1 m along the route), the gallery door leaf added as a shut occluder, sight
  world limited to pieces near the footprint (same model, faster; the test runs in ~1.3 s). Asserts worst <= 6.
- **Result.** Worst **6** at (50.25, 0, -12.75) on the hall floor by the racks, facing 259 deg: #6, #7, #8, #9, #10,
  #11 (#9 / #10 through the open ground dock door). No sample over 6. The walkway's worst is now 6 or under.
- **Same test against the old geometry:** 5.8 gives 8 at (23.75, 6, -29.25) (28 samples over 6) and fails; 6.0 gives
  exactly 6 at that walkway point (no margin). With the gallery door open the checker's 7s through the door hole remain.
- Checks: `npx tsc --noEmit -p .` clean; `npx vitest run tests/campusS1.test.ts tests/campusS3.test.ts
  tests/laserPanels.test.ts` 3 files, 96 tests pass (M8 unchanged and green); eslint on the two changed files clean.
