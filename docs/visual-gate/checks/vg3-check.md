# VG3 viewpoints check

Verdict: PASS

Checked `feature/visual-gate` @ a3362896 (VG3 = 8262611b on 0b7f46f4) against `docs/visual-gate/briefs/VG3.md`, PLAN.md :76-92 / :198-217 and origin/master fc4dc9ab (maps unchanged since the builder's 1dc3ecfa).

## Must-fix
None.

## What was verified
- Contract: typedefs, exports (`MAPS`, `PRESETS`, `VIEWS`, `RIGS`), query strings, view / rig counts (9 / 10 / 5 / 2, 3 rigs), ids, targets, rules, parity count (3 per map) and rig rules match the brief.
- Coordinates: all 26 views' feet / cam / target compared against `git show origin/master:<file>`: 9 Marlow vantages (a1Gate.ts:265, a2CarriageShed.ts:371, a3OfficeRange.ts:370 + A3_POST_WEST :74, a4GoodsShed.ts:488, a5Substation.ts:416, a6PumpHouse.ts:388 + A6_VANTAGE :119, a7DataHall.ts:445, a8Strongroom.ts:662, facility.ts:747), 10 campus rows (:39 :43 :47 :49 :54 :56 :62 :66 :70 :73), 5 Sector Ops rows (:46 :48 :50 :54 :61) and 2 warehouse rows (:68 :69). All equal, all lines correct.
- Rigs: so-door `warehouseS1.ts:297` (v4.82.0) / `:311` (v4.88.0, master) and cp-door `campusS1.ts:205` (all three) read with `git show <tag>:<file>`: same `b.door(...)` hinge, width 1.2, yaw PI / 2, hinged, unlocked. so-corner racks (`warehouseS2.ts:227` / `:234` R2N, `:77` S2_COOP R3N, built `:229` / `:236` / `:236`) match at the three tags. Door maths re-derived: so-door m (0.5, -13.8), guard (0.5, -15.0), cam (0.5, -11.6); cp-door m (17, -73), guard (17, -74.2), cam (17, -70.8); yaw 0 both; guard 1.2 m from door centre. so-corner geometry holds (side aisle x -13.5 to -10.5, cross aisle z 4-7, guard facing south, leak on R3N face z 7).
- Regions spot-checked against map source: campusOps.ts:120-121 (ground, bounds -70 / 70 / -84), warehouse.ts:211-213 / :219, warehouseS1.ts:245 (compartment wall z -8.8 h 6), campusS3.ts screen, a1Gate.ts:160-167, facilityKit.ts:468.
- Guards: campusOps query `sectorGuards=1` (flags.ts:128, sectorMode.ts:704; campus S1 has guards); warehouseOps `sectorGuards=4`; the test rejects `sectorGuards=0` for any rig map. The harness parks every non-rig guard.
- Shape test mutations (restored with `git checkout -- scripts/visual-gate/viewpoints.mjs`, status clean):
  1. campusOps `sectorGuards=1` -> `0`: 2 tests fail (maps and C0 M2).
  2. m-a2-vantage upper corner x 59.7 -> -59.7: framing test fails (173 deg > 50).
- `npx vitest run tests/visualGateViewpoints.test.ts --maxWorkers=2`: 13 passed. `npx tsc --noEmit -p .`: clean.
- Zero `src/` diff in 8262611b (3 files: viewpoints.mjs, the test, vg3-build.md). No imports, no network in viewpoints.mjs.

## Polish
Region pixel sizes projected at 960 x 540 with 86 deg horizontal FOV (CAMERA.fov, shoulderCamera.ts:456; the photo camera may differ). Every wall region is >= 83 px in both axes (smallest m-a6-kerb wall 301 x 83), so the VG1 blotch erosion rule holds. Regions under 60 px in an axis (floor / upper, stats and haze only; VG5 may want a wider quad):
- m-a2-vantage floor 127x30, upper 58x15; m-a3-lobby upper 9x29; m-a4-aisle upper 36x107; m-a5-kiosk upper 110x54; m-a7-corridor upper 13x51
- cp-s1-b upper 46x25; cp-s1-f upper 35x33; cp-s2-b floor 247x54, upper 143x51; cp-s4-a upper 161x42
- so-s1-goods-in floor 236x44; so-s1-girder floor 136x20, upper 146x47; so-s1-workshop floor 285x39; so-s2-aisle upper 44x35; so-s3-hall floor 165x20
- wh-floods-dock upper 48x114

Partly out of frame (corners off screen, still within the 50 deg cone): cp-s1-b floor (foot to y 694), cp-s5-d floor (y 706), cp-s5-a floor (x -10), so-s1-goods-in floor, so-s1-workshop floor (y 570), door rigs' leak top (y -47).

Other:
- viewpoints.mjs comment cites `campusS3.ts:397` for the board screen; the `bx(...)` call is at :396 (:397 is blank).
- m-f-gallery faces the hall north wall z 19.75 at 7.75 m (inside the brief's 8 m rule) but has no `wall` region; the wall is used as `upper` (y 2-4.5). Not listed in the deviations.
- Floor omitted on 6 views (D1) and cp-s2-d framing the stair core (O1) are documented in vg3-build.md; the lead should decide O1 before VG8 sets F8 bounds on cp-s2-d.
- wh-floods-dock parity (-18.4, 1, -18.6) is in the dock doorway, 0.45 m from the facade face z -18.15; it clears collision boxes by the builder's rule (gap edges 1.4 m) but not the brief's literal "1.2 m from any wall".
