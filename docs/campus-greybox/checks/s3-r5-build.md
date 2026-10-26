# campus-greybox S3 R5 build report (sub-lane r5, cloud)
Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Night Shift | Cloud Builder 2 (Opus 5.5), 2026-10-25. Brief: `docs/campus-greybox/briefs/S3.md` section 4 "R5",
cloud brief `briefs/campus-greybox-s3-r5.md` (cloud-queue). Branch `feature/campus-greybox-s3-r5` from the R1a frame commit
3a8c6893. r1-r4 are NOT merged here (the lead does that); the nav half was checked on a local, unpushed merge of the r1-r4
heads (r1 5d7da838, r2 107f4265, r3 4dd20af1, r4 e37b2656) into this branch, all clean merges.

## Built (slice R5, data and pure tests)
- `src/world/maps/campusV2/s3Data.ts`
  - `S3_GUARDS` (:29): the 20 guards of the R5 table: kinds, slots, yaws, routes, waits, faces, the #2-#3 loop
    (period 40, leave [3.5, 23.5]), zones (graph space ids), roles, reasons (as built for the kept guards; new: #17 the EMC
    test, #18 the goods door, #19 the consoles, #20 the courier escort), squads (hall 2, dock 3, L1 1, #12 / #14 / #19 4).
    None dormant (AS4). One posted choke: #9 `post: { leash: 5, guards: 'c3-door' }`, role `posted` (:80).
  - `S3_ENTRY` (:109), `S3_EXIT` (:113), four routes `S3_ROUTES` (:211): "The south strip and the clean suite" (shadow),
    "The hatch" (loud), "The crane walkway" (high; climbs = the ship ladder and the SE caged ladder), "The ceiling void"
    (secret; climbs = the racking ladder, the crawl, the drop through the tile). Points at door centres +-1.2 m, R3's landing
    and half-landing middles (half landing top 4.5 x 13 / 27).
  - `S3_SECTOR` (:225): start, crate and connector as built; grab `{ x: 57.0, y: 4.5, z: -3.8, yaw: PI / 2 }`;
    `keypads: S3_KEYPADS`, `intel: S3_INTEL` (:243-244, R4's `s3Devices.ts`); reinforce `[[15, -8], [12, -20.05]]`;
    `perStage` 2, `dogs` 0.
  - `S3_PARTS` (:253): cameras / alarms / desks now read R4's `s3Devices.ts` (the v1 copies are gone), `boards: S3_BOARDS`
    (:263, R4's isolator board, sync-s3-isolator; `campusOps.ts` lists parts' boards with `inSection`, so no wiring line
    outside the lane was needed).
- `tests/campusV2S3Guards.test.ts` (new, 15 cases): 9 data cases run now; 6 nav cases are `describe.skipIf(!MERGED)`,
  "pending lead merge", and switch on by themselves once r1-r4 are merged (MERGED = R3's 6 flights, R1's `s3-hall`, R2's
  `s3-view` and R4's cameras present).
- `changes/feature-campus-greybox-s3-r5.md` (kind: patch, dark).

## Tests
- On this branch: `npx vitest run tests/campusV2S3* tests/campusS3* tests/campusV2.test.ts tests/changesFragments.test.ts
  --maxWorkers=2`: 6 files, 68 passed, 6 skipped (the nav half). `npm run typecheck:fast` clean; eslint clean on both files.
- On the local r1-r4 merge (not pushed): `tests/campusV2S3Guards.test.ts` 15 / 15 pass:
  - every slot, route point and takedown spot on the analytic nav of its storey; every walked guard leg has a nav path;
  - #11's cycle by his nav path round the west core within 1 s of 40 (P4);
  - every route point on nav (the two void crawl points exempt: headroom 1.5, off the guards' grid by R2's rule), every
    walked route leg a nav path within 2.5 x straight + 8; reinforcements on nav;
  - `checkSectors(CAMPUS_SECTORS, undefined, layout.security)` empty (desk-sec3, operator #12, cam-view + cam-dock);
  - A99 screen count: worst **11** <= 12, at the crane walkway (15.75, 6.0, -29.25) facing 34 deg: #2, #3, #5, #6, #7, #10,
    #11, #13, #15, #16, #18 (7523 points);
  - M8 isolation in time at each takedown spot (range 15, 180 s): #1 180.25, #2 0, #3 0, #4 26.75, #5 0, #6 0.25, #7 0,
    #8 27.25, #9 0, #10 0, #11 6.75, #12 7.75, #13 30.75, #14 8, #15 0, #16 0, #17 6.75, #18 0, #19 6, #20 0 (s).
- The whole S3 set on the local merge (`tests/campusV2S3* tests/campusS3* tests/campusV2.test.ts`): 139 tests, 138 pass;
  the one failure is not R5's (finding 4).

## Assumptions (logged; undo)
- R5-A1 #8's log-desk stop: the table's (47.5, -11.2) sits in the hall's new north wall clearance (the kept log desk ends
  at z -12.0, the wall face at -11.15: 0.85 m, and no nav cell fits). Moved to the desk's open south side (47.5, -13.25),
  facing 0 (north) at the desk; the 2 m shorter leg given back at the racks (wait 20 -> 24 s) so the cycle stays D's 43.2 s.
  Undo: move the log desk south (R1's file) and put the stop back at (47.5, -11.2) facing PI, waits [20, 5].
- R5-A2 #9's post z -3.1 (table -3.0) and #12's kettle stop z -12.7 (table -12.5): each 0.5 m off the furniture in front
  of him (the dock desk's south edge -2.6; R2's kettle counter, laid 0.3 m in front of the table's stop, inside his 0.32
  radius). #12's cycle 41.4 s (table 41.6). Undo: the table's z with the desk / counter moved (R1's / R2's files).
- R5-A3 #1's squad is 1 (the brief's "L1 1"; as built he was squad 0).
- R5-A4 Takedown spots (B7, derived): 0.3-0.9 m beside or behind the guard at his post or a route stop, on nav: #1 (13.2,
  -17.4), #4 (36.3, -0.9), #9 (25.4, -3.1) beside (the desk is behind him), #16 (19.4, -17.4), #17 (44.4, -15.3) beside (the
  EMC box is behind him), #20 (24, -1.1) at the C3 door, the rest 0.5 m behind or a route point.
- R5-A5 The routes' intermediate points (landings, door approaches) are derived from R3's core table and the door centres;
  the grab point (56.4, -3.8, 4.5) stands 0.6 m short of the objective (the shelf face is 0.35 m from it).
- P3-P7 defaults taken as the brief gives them (no lead answers on the branch): P3 #6 / #7 as-built rectangle 42.0 s; P4 #11
  stair foot <-> roller door ~40 s by nav; P5 the pair x 32..46 on the 40 s clock; P6 #10 stops 9.85 s; P7 #15 at z -9.8.

## Findings for the lead
1. M8: besides the recorded overlaps (#2 / #3 / #5, #6 / #7, #9 / #18 / #20), three guards have no 3 s alone at their spot
   in the sectorCheck model (any facing, clear line within 15 m): #10 (the dock's posts #9 and #18 and #20 see the gas-cage
   corner: D's "behind the cage" moment does not hold with the blast wall on the cage's east face), #15 (#5's post stands in
   his beat, P7), #16 (the open west end of the hall: #6 / #7 and #11). The test records exactly these (`recorded`), so a
   change shows. Fixing them moves table slots (the lead's / V6's call).
2. A99 worst 11 on the walkway (the plan's 10): within the cap 12, one over D:170.
3. Not built here (outside R5's file): the trench (P14) is still unbuilt, so no route uses it.
4. On the local merge, R1's `tests/campusV2S3Shell.test.ts` "the G nav seeds and hide spots are on nav" fails on R2's L1
   seed (33, 4.4, -18) (the chamber roof) against R1's analytic nav; it fails without R5's file too (an r1 x r2 merge item).
5. R2's kettle counter is laid 0.3 m in front of #12's table stop, inside a guard's 0.32 radius (R5-A2 works round it).

## Pending PC runs
- `e2e-sectorops:1` .. `:6` (flag off) at the S3-e head (laptop queue): the default build is unchanged (`tests/campusS3*`
  green here).
- The nav half of this test on the runtime nav grid in a browser (E2E-2a, part 7) and V6's measured isolation / sight.
- Lead merge: r1-r4 into r5, then `npx vitest run tests/campusV2S3Guards.test.ts` runs the 6 skipped cases.

## What Michael should try
Nothing yet: the layout is off by default (`?campusv2=3` once the whole lane is merged).
