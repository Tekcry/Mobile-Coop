# Slice 3 build report - S3 Lab block, the first lasers (builder, 2026-10-23)

Branch `feature/sector-redesign-s3` (head 95097957). Nothing committed. e2e and build not run. Assumptions are L1.. for the
lead to renumber.

## Result
S3 is built in full as a greybox and replaces its shell and stub; S1, the S2 stub and the S4 / S5 stubs are unchanged and
the run still chains. Unit checks, tsc and lint pass. The e2e block (`campusS3Part`, part 6) is written and `node --check`
clean, not run. campusOps is NOT listed (the lead's step).

## Files
- New `src/world/maps/campusS3.ts`: all S3 geometry (axis-aligned boxes only, no quarter-turn walls), stairs (`S3_FLIGHTS`),
  lamps, switches, rooms, pickups, hide spots, nav seeds, `S3_LASERS`, `S3_PANELS` (+ `S3_PANEL_NEAR`),
  `S3_COOP_LIPS` (CR3), `S3_BOX` / `S3_DOORS` / `S3_GROUPS` for the tests.
- Edited `src/world/maps/campusSectors.ts`: the S3 stub (index 2) replaced by the full section; a self-contained S3 block
  before `CAMPUS_SECURITY` (`S3_GUARDS`, `S3_EXIT`, `S3_ROUTES`, `S3_CAMERAS`, `S3_ALARMS`); `CAMPUS_SECURITY.levels` gains
  `'s3-l1': 4.5` and `devices` spreads `S3_CAMERAS`; `CAMPUS_ALARMS` gains an optional `y` and spreads `S3_ALARMS`.
- Edited `src/world/maps/campusOps.ts`: the S3 `shell(...)` line removed (comment left); `build` calls `buildCampusS3(b)`;
  the layout spreads the S3 pickups, hide spots, switches, rooms, nav seeds and adds `lasers` / `laserPanels`; the alarm
  map reads `a.y ?? 0` (L2).
- New `tests/campusS3.test.ts` (32 tests).
- Edited (asserted the old map set): `tests/campusS1.test.ts` (5 lines: stubs found by "(stub)" in the name, not
  `slice(1)`; S1 cameras / alarm filtered by section 0; S1 hide spots and E3 fences filtered to z < -30),
  `tests/laserPanels.test.ts` (the MAPS laser count 6 -> 8).
- Edited `scripts/e2e-sectorops.mjs`: one block appended after the last `if (want(6))` (the S1 part untouched):
  `campusS3Part(page)` and its own `if (want(6))` run.
- `changes/feature-sector-redesign.md`: one line.

## Values the SPEC left open
- Heights: G 0, L1 slab 4.3-4.5, roof slab 9.0-9.2 (walls to 9.2; hall 9.0 clear). Doors 1.2 x 2.1 (S1's L3). Walls 0.3.
- Plan: west band x 10..22 = the lobby (G) under the C2 landing (L1, glass with a 1.3 spandrel onto the hall); test hall
  x 22..52, z -30..-8; north band z -8..0 (G: dock x 22..40, north stair lobby x 40..42.6, closed plant x 42.9..64; L1:
  viewing corridor z -8..-6 x 22..52, write-up x 22..30, gowning x 30..33, clean room x 33..40, north stair x 40..42.6,
  back corridor x 42.6..44.6, store x 44.6..52 z -6..-1.6, north corridor z -1.6..0 x 44.6..64, security room x 52..64
  z -8..-1.6); east annex x 52..64 z -30..-8 closed plant; east yard x 64..70 (outside).
- Stairs (2.6 x 5.6 cores, doglegs of 2 x 2.25, 13 risers each, 3.1-3.2 m flights, spine 0.1, half landing 2.25): SW core
  x 12..14.6, z -28..-22.4 (G door west half, L1 door east half, both north face); north core x 40..42.6, z -6..-0.15 on
  L1 (G lobby z -8..-6 with the hall door (41.3, -8) and the dock door (40, -7); L1 doors south onto the corridor (42, -6)
  and east into the back corridor (42.6, -5.35)).
- Chamber x 30..36, z -22..-14, 4.4 (not noLedge: the CR3 lip), plant x 33.5..35.5, z -21..-15, 4.4-5.6. EMC x 42..48,
  z -24..-16, 4.0, closed, noLedge. Racks 2.2 noLedge x 50.6..51.6 in three runs z -26..-10.5. Benches 0.9: (25.5, -24.5),
  (25.5, -11.2), log desk (47.5, -12.4). Crane walkway x 22.15..51.85, z -29.85..-28.6 at 6.0 (rail on its north edge),
  caged ladders at x 23 and x 51 (base z -28.15). Gallery x 28..44, z -9.5..-8.15 at 4.5 (rails), spur x 31..35,
  z -13.5..-9.5 (rails on its sides, open end 0.5 m off the chamber's north face). Crane-bay screen x 26.5..26.8,
  z -21.5..-10.5, 3.0, noLedge (L9). Gas cage x 36..39.55, z -4..-0.15: blockwork west wall 2.4, mesh south, bottles 1.6.
- Glass = fences (see-through, block movement): corridor south (over a 1.3 spandrel to 5.8, glass 5.8-9.0, gallery door at
  x 41.3), write-up front (door at x 28.8), clean room front; landing glass x 22 (spandrel to 5.8).
- Guards (kind, slot, yaw, route, waits; cycle at the S1 test's arithmetic):
  #1 officer (14, 4.5, -17) yaw -0.927 post (faces the bridge door). #2 officer (30, 4.5, -7.4) / #3 grunt (30, 4.5, -6.6):
  loop (30) <-> (44), period 40, leave [3.5, 23.5], faces 0 / PI, stops 3.5 s. #4 grunt (32.2, 4.5, -1.0) yaw PI-0.6 post.
  #5 officer (47.8, 4.5, -7.0) yaw -PI/2 post. #6 grunt loop (28,-23) (28,-13) (37,-13) (37,-23), waits [0.5, 0.5, 2.5, 2.5],
  44.4 s; #7 the same loop from (37,-13), waits rotated, 44.4 s. #8 grunt (49.4,-20) <-> (47.5,-11.2), [20, 5], 43.2 s.
  #9 officer (30.5, -2.5) yaw PI/2 post. #10 grunt (25,-4.5) <-> (38.9,-4.6), [4, 4], 36.1 s. #11 officer (27.5,-9.2) <->
  (41.3,-6.6), [4, 4], 38.0 s. #12 officer (58, 4.5, -6.6) <-> (62.8, -2.6), [26, 4], 43.4 s, dormant. #13 officer (25, 4.5,
  -4.2) yaw PI post. #14 grunt (67,-26) <-> (67,-10), [3, 3], 38.3 s, dormant. #15 enforcer (43.6, 4.5, -0.8) <-> (57,-0.8),
  [4, 6], 40.5 s. #16 grunt (25,-19) <-> (25,-17), [12, 12], faces PI/2 -/+ 0.87, 28.0 s.
  Squads: 0 landing, 1 L1 (#2-5, #13, #15), 2 hall (#6-8, #11, #16), 3 dock (#9, #10), 4 far (#12, #14).
  Takedown spots: #1 (14.4,-17.3), #2/#3 their slots, #4 (31.9,-0.7), #5 (48.3,-7.0), #6 (37,-23), #7 (37,-13), #8 (49.4,-20),
  #9 (30,-2.5), #10 (38.9,-4.6), #11 (41.3,-6.6), #12 (62.8,-2.6), #13 (25,-3.6), #14 (67,-10), #15 (43.6,-0.8), #16 (24.4,-18).
- Cameras: cam-view (51.7, -7.0) level `s3-l1`, y 2.8, facing 270, aim 6, range 10; cam-dock (24, -0.4) ground, y 3.2,
  facing 180, aim 6, range 10. Alarms: alarm-dock (32.6, -0.2) yaw PI; alarm-sec (52.2, 4.5, -4.0) yaw PI/2.
- Lasers: las-gown x 33, z -3.6..-2.4, ys [0.35, 0.9, 1.45], floorY 4.5; las-store x 48.5, z -4.6..-3.4 (the partition's
  aisle gap), ys [0.5, 1.1], floorY 4.5. Panels: panel-gown (31.2, 5.9, -0.15) yaw PI on the gowning room's north wall
  (seen from the corridor through the gowning door and from inside); panel-store (48.35, 5.9, -5.2) yaw -PI/2 on the
  partition's west face (seen from the store's door half).
- Objective: grab at (51.0, 4.5, -3.8) (shelf x 51.2..51.85). C3: the stub's box [22, 0, 26, 16], near (24, 0), far
  (24, 16), checkpoint (24, 0, 8). Reinforce (30, -5) dock, (24, -21) west door. perStage 2, dogs 0.
- Routes: stealth (lobby, west door behind #16, south strip, round the EMC room, under the gallery, north stair, back
  corridor, back door, beams, shelf; out by the north stair, the dock, C3), loud (across the hall, the corridor, the
  hatch), high (SW ladder, walkway, SE ladder, then stealth; `climbs` [4, 6]).
- Lamps (groups 60-67): hb rows at 8.5, r 12, i 0.9 (row 1 z -26: x 25, 32, 39, 47; row 2 z -18: x 25, 39, 50; row 3 z -11:
  x 25, 32, 39, 47); corridor 3 at 8.8; burn-in 3 task lights at (50.2, 2.6); dock 2 at 4.0; write-up 1; security 1.
  Switches: the bank (21.85, -16.9 / -16.5 / -16.1) facing west on the lobby side; corridor at the gallery door (40.2,
  4.5, -7.85) and the east end (51.85, 4.5, -7.0); burn-in (51.85, -9.2); dock (27.3, -7.85); write-up and security room
  inside their doors. Ambient 0.14 over the block, 0.30 in both stair cores.

## Assumptions
- L1 `CAMPUS_COOP_LIPS` lives in `campusS1.ts` (never-edit here): CR3 is exported as `S3_COOP_LIPS` from `campusS3.ts`;
  the campus list is `[...CAMPUS_COOP_LIPS, ...S3_COOP_LIPS]` (one line for the lead to join where it wants).
- L2 `campusOps.ts` changed beyond the shell line: the S3 layout arrays, `lasers` / `laserPanels`, and the alarm `y`
  (alarm-sec is on L1). The S2 builder likely needs the same alarm `y` (alarm-brg on L1): expect a trivial merge conflict.
- L3 Lamp groups 60-67 (S1 used 40-49; 50-59 left for S2).
- L4 The camera level id is `s3-l1` (not `l1`), so it cannot clash with S2's L1 at 4.4.
- L5 #11 "loop clocking both stairs ~44 s": the two stair doors are ~30 m apart (a 70 s loop); he clocks the dock-hall
  door and the north stair's ground lobby instead (38 s).
- L6 The gas cage stands in the dock's NE corner (SPEC "outside the east wall"): the dock is on the north side, 25 m
  from the block's east wall, and #10's 35 s round needs it close. Its west face is a blockwork blast wall (the
  "isolation behind the gas cage").
- L7 The chamber's own ladder (behind the anti-climb guard) is not built; the EMC room is a closed solid block (no door).
- L8 The chilled-water main at 5.6 (horizontal pipe) is not built: it would sit 0.2 m under the walkway deck.
- L9 The crane-bay board screen (3.0) inside the west door is new (not in the SPEC): without it #16 had no 3 s
  isolation (the chamber round and the stair tour see his corner) and it trims the A64 view of the west end.
- L10 The east yard's "high windows" are not built (walls): #14 cannot glimpse in; he is dormant.
- L11 The store's front door (the hatch) and its back door are plain doors (kp-store, kp-sec: EW5 keypads not built).
- L12 The SW stair's L1 landing (the C2 landing) has no link to the north band's L1 (a fire compartment), so the bridge
  arrival must go down the SW stair (the SPEC route).
- L13 **C2 stays the ground-level stub in this branch.** The S2 stub (index 1, not this slice's) cycles C2 at ground into
  the S3 west wall door (10, -14), so S3 starts at (7, 0, -14). When S2's L1 bridge lands: move C2's far door to the
  landing (10, 4.5, -14) (the landing's west wall needs its doorway cut), S3's start to the landing, wall up the ground
  door; #1 then stands at the real arrival (he is posted there already, not dormant).
- L14 Laser beams: las-store [0.5, 1.1] (a crouch at 1.1 still touches: the crouch pass needs the panel jammed, as PLAN
  says "jamming las-store's panel lets a crouch pass").
- L15 A64 counts a guard when its post or any route vertex has a clear eye-to-chest line within 40 m inside an 86 deg
  horizontal view (CAMERA.fov), 16 facings per point; posts and route vertices only (no mid-leg positions).
- L16 The M8 recorded exception is the viewing-corridor pair #2-#3 only (walking together); every other guard has its 3 s.

## A64 worst point
Superseded by the fix round (slice3-check.md F1, BRIEF A70; L15's sampling is replaced): the corridor spandrel is 6.2
and the test samples every 0.5 m nav cell (7645, the walkway interior included), 32 facings, every 1 m of each route,
the gallery door shut. Worst 6 at (50.25, 0, -12.75) on the hall floor facing 259 deg: #6, #7, #8, #9, #10, #11; none
over 6. (The old 2 m grid skipped the walkway interior, where 5.8 gave 8.)

## M8 (longest isolated run at each takedown spot, 180 s)
#1 180 s, #4 24, #5 9, #6 5.75, #7 5.75, #8 23.25, #9 4.75, #10 5.25, #11 5.75, #12 7.5, #13 29, #14 6.25, #15 7.75, #16 28;
#2 / #3 0 (the recorded pair).

## Skipped
- e2e: the CR3 browser probes (solo running / wall jumps at the chamber from the floor, the racks, the benches, the EMC
  roof; the gallery -> chamber roof step from above), the co-op leg-up, the walkway overwatch, the gowning beams. The unit
  test covers the reach rules (`soloJumpThreats` on all four faces, `soloTopLandingThreats`, rules 2, 3, 5, 6, the step).
- No `campusOps` listing (the lead's step), no SPEC / BRIEF / PLAN / STATE edits.

## Checks
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run tests/campusS1.test.ts tests/campusS3.test.ts tests/soloJumpReach.test.ts tests/sectors.test.ts
  tests/voxelFit.test.ts`: 5 files, 114 tests pass.
- Also (maps loops): rooms, laserPanels, detailPass, lampBake, missions, editor/night, losParity, warehouseCoopS1-3,
  cameraCue, jammer, laserAlarm, sectorBolt, sectorLampSync, sectorRecord, sectorRestart, sectorSlice0, sectorStep3,
  lampGridLossless, navClosure: 21 files, 236 tests pass.
- `npx eslint` on the changed src and test files: clean. `node --check scripts/e2e-sectorops.mjs`: ok.
- e2e and build: not run (brief).
