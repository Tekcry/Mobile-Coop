# campus-greybox S3 sub-lane r1 build report (the brief's name: `S3-R1.md`)

**R1a frame commit: `3a8c6893a0f7fec6c47a914f62ba96f0c929c940`** (branch `feature/campus-greybox-s3-r1`, base 024c7c172
= `origin/feature/campus-greybox` after V2-SEED). Cut r2-r5 from it.

Builder: Opus (cloud), 2026-10-25. Brief: `docs/campus-greybox/briefs/S3.md` sections 0-3, 4 "R1a" and "R1", 8, 9.
Sources read with `git show`: 7c021f01 (`S3-detail.md` = D, `SYNC.md`, `graph/plan/campusOps-S3.json` = GR), 6c3f4a87
(`campusS3.ts` = S3, identical to `origin/master` and to the P0 copy). SS checked on 6c3f4a87 and `origin/master` by
content (single door 1.2 x 2.1, roller 3.0 x 3.0: unchanged). No source value changed; nothing to stop on.

## R1a - frame

Files: `src/world/maps/campusV2/s3Kit.ts` (new), `s3.ts` (rewritten), stubs `s3Shell.ts`, `s3L1.ts`, `s3Stairs.ts`,
`s3Lights.ts`, `s3Devices.ts`, `s3Lips.ts` (new), `s3Data.ts` (only `S3_V2_COPY = false`, line 201),
`tests/campusV2S3Frame.test.ts` (new), `changes/feature-campus-greybox-s3-r1.md` (new).

Built (`s3Kit.ts`):
- Constants :14-48: `PI`, `T` 0.3, the as-built colours, `S3_L1` 4.5, `S3_ROOF` 9.0, `ROOF_TOP` 9.2, `L1_UNDER` 4.3,
  `DOOR_H` 2.1, `DOOR_W` 1.2 (SS 3), `S3_VIEW_SPANDREL_TOP` 5.6 (AS2 D:229, L14 D:75), `S3_OBS_SILL` 1.0 / `S3_OBS_HEAD`
  2.1 (D:47), `S3_ROLLER_H` 3.0 (SS 3), `S3_CEIL_TOP` 7.5 (P19, AS5).
- `S3_GROUPS` :55: 60-67 as built, `ctl` 68, `plant` 69 (B1), and the J17 circuits `emc` 160 .. `eStair` 165 (R4 table, B8).
- `S3_HIGH_BAYS` :76: the five 3.3 points on hb1 / hb2 / hb3.
- `S3_BOX` :88: every row of 3.1 verbatim (plus `hallAisle` x 10..14 and `voidDeck` from x 20, both named in 3.1's rows;
  tops as `<key>Top`, the as-built key names kept so `s3Dress.ts` still compiles).
- `S3_DOORS` :169: the 24 rows of 3.2 as `[x, z, floor]` (the `[0]` / `[1]` reads in `s3Data.ts` still work).
  `S3_DOOR_SWING` :223: each row's swing (roller 0).
- Helpers :253-338 copied unchanged from S3:230-315 (`lamp`, `bx`, `Hole`, `doorHole`, `wall`, `doorAt`, `slab`, `rail`).

`s3.ts`: `buildCampusS3` :42 = shell, L1, stairs, lights; re-exports the kit's data, `S3_FLIGHTS`, `S3_BOARDS`,
`S3_LASERS`, `S3_PANELS`, `S3_PANEL_NEAR`, `S3_SWITCHES`, `S3_DESKS`, `S3_COOP_LIPS`; `S3_ROOMS` / `S3_NAV_SEEDS` /
`S3_HIDESPOTS` :31-37 = G then L1; `S3_PICKUPS` :39 empty. The `S3Flight` interface lives in the `s3Stairs.ts` stub
(R3 adds `steps` there).

Tests `tests/campusV2S3Frame.test.ts`: 4 pass. Flag on, the campus builds; `S3_DOORS` = brief 3.2 row by row; the z -7
L1 door centres 12.6, 24.6, 31.6, 35.5, 49.6, 59.7, each >= 3.0 apart; the gallery door faces no door within 2.0.

## R1 - shell and G re-lay

Files: `src/world/maps/campusV2/s3Shell.ts`, `tests/campusV2S3Shell.test.ts`.

Built (`s3Shell.ts`):
1. Shell as built :90-96 (walls x 10, x 64, z 0, z -30 to 9.2; C3 hole and door; C2 hole and door on L1; roof slab).
2. Hall north wall z -11, x 10..52, to 4.3 :106-108: roller gap x 20..23 x 3.0 (no leaf), ctlHall door, observation glass
   x 34..39 and 44..50 at 1.0..2.1 (clear panes). No wall at x 22.
3. Dock :115-122: blast wall x 13.35..13.65, z -3.5..-0.15, 2.4, noLedge; weldmesh fence z -3.5, x 10.15..13.5, 2.4; bottles
   x 10.3..12.5, z -3.1..-0.5, 1.6 (derived: the as-built cage S3:423-425 offsets turned to the NW corner); dock desk;
   loading pad (0.1, noLedge); dock east wall x 30, z -11..-7, to 4.3.
4-5. x 52 :128-131: z -30..-11 to 9.0 with plantHall; z -11..0 to 4.3 with ctlPlant (control's east wall and the LV room's
   west wall). z -7 :134-135: x 52..58 and 61.5..64 to 4.3 (LV room and riser sealed, no door).
6. Hall contents :140-147: chamber 4.4 + its plant (S3:386-387), EMC room 4.0, racks 2.2 (3.1 rows), benches 0.9 (P8),
   screen 3.0.
7. Yard walls :150-151: x 64..70 at z 0 and z -30, 6 m (the perimeter's height), noLedge.
8. Trench: **not built (P14)**. The campus ground box is still one floor (`campusOps.ts` `b.floor(0, -7, 140, 154, ...)`);
   the lead has not split it. Logged at :153.
9. Rooms `S3_ROOMS_G` :54: `s3-hall` x 14..52 (full height), `s3-hall-aisle` x 10..14 maxY 4.4 ("Test Hall", B6),
   `s3-dock`, `s3-control` ("Test Control Room"), `s3-plant` ("Plant Room"), all maxY 4.4. Names from the graph `function`.
10. Nav seeds :63: (31, 0, -25.5), (12, 0, -25), (16, 0, -8), (42, 0, -5), (56, 0, -20).
11. Hide spots :76: (11, 0, -28.6), (14.2, 0, -1.0), (23.5, 0, -25.5), (49.3, 0, -23.5), (53.5, 0, -12). Light level: no
   lamps exist on this branch (R4's), so none is logged here; R4 / V6 measure them after the merge.

Sync-node `src` lines: none (the isolator board, sign-out board, kp-store and the desk are R4's).

Tests `tests/campusV2S3Shell.test.ts`: 9 pass. Walls on the plan lines (each piece centred +-0.15, solid end to end; no
x 22 wall; G walls stop at 4.3); roller gap 3.0 x 3.0, no leaf; observation glass spans; every G door hole of this lane
(c3Near, ctlHall, ctlPlant, plantHall; c2Far on L1) 1.2 x 2.1 with its anchor and 3.2 swing; LV room and riser have no door;
G rooms (ids, maxY, no overlap across all `S3_ROOMS`, no squads); yard walls 6 m noLedge, nothing in the yard on the
analytic nav from the hall, and a flood from inside the yard stays in it; nav seeds and hide spots on nav, hide spots
>= 1.5 m from every door on their floor; rule 6 (S3 ground boxes 1.9-4.2 noLedge); the trench test asserts "not built"
until P14.

## Checks
- `npm run typecheck:fast`: clean. `eslint` on the new files: clean.
- `npx vitest run tests/campusV2S3*.test.ts tests/campusS3*.test.ts tests/campusV2.test.ts --maxWorkers=2`: 67 pass
  (Frame 4, Shell 9, campusS3 32, campusS3Dress 13, campusV2 9). The default build is unchanged (live S3 tests green).

## Assumptions and P-items (undo)
- P8 bench against the wall (z -11.95..-11.15). Undo: delete it.
- P14 trench skipped. Undo: build it once the lead splits the ground.
- B1 / B8 circuits in the kit (the J17 160-165 ids put in `S3_GROUPS` now, as the kit is frozen). Undo: drop them from the
  kit and let R4 define them in `s3Lights.ts`.
- B6 the aisle room. B4 swings (`S3_DOOR_SWING`). B7 the derived gas-cage pieces above. Undo: the lead's numbers.
- Roller "shutter box above": no separate box (no size in any source); the wall over the gap (3.0..4.3) stands for it.
- `S3_DOORS` holds `[x, z, floor]` triples (3.2 gives a floor per door). Undo: pairs plus a floor table.

## Deviations
- Step 5 says the plant's north wall carries eStairG: the core's south wall x 58..61.5 and its doors are R3's ("core walls
  G to 9.0", "Doors of 3.2 for each core"), so R1 builds z -7 only for x 52..58 and 61.5..64. R3 must build that segment
  and eStairG (and the north core's nStairW / nStairE, the west core's wStairG / wStairL1).
- R1a test "no two doors within 2.0 face each other across the corridor": the plan itself has two such pairs at L1 (below),
  so the test asserts the plan's rule (the gallery door, D:79) and records the two pairs.

## Findings for the lead
1. Doors facing across the corridor within 2.0 (signed plan, D:78 / P45): landingFire (12, -11) vs hoist (12.6, -7), 0.6
   apart; sec (58.6, -11) vs eStairL1 (59.7, -7), 1.1 apart. D:79 only names the gallery door; decide if these need moving.
2. 0.2 m slots behind the cores: each core box ends at z -0.5 (wall face -0.35) and the shell's inner face is -0.15, so a
   0.2 slot links the dock and the control room behind the north core (x 30..33.5), and the LV room and riser behind the
   east core. Not walkable (agent radius 0.32), but a sight / light gap. R3 (core walls) or the lead: close it (a wall
   x 30 / x 33.5 to z 0, or run the core's north wall on z -0.15).
3. `?campusv2=3` with dressing (the real page) throws until R7: `s3Dress.ts:144` skins the north bench at (25.5, -11.2)
   ("boxAt ... no box within 0.05"); it already threw from the R1a frame on (no boxes). Flag off is unaffected; tests use
   `dress: false`.
4. The control room's HUD box (x 30..52, z -11..0) holds the north core (one rectangle per room); the core has no HUD room.
   If the lead wants one, R3 adds `s3-nstair` / `s3-estair` rooms and the control box stays.

## What Michael should try
Nothing yet: S3 v2 is dark, and `?campusv2=3` throws in the dressed page until R7. After R2 / R3 / R4 merge (undressed
build): walk G from the C2 landing down the west stair, the low aisle, the roller door into the dock, the control-room door
and the plant doors.

## Pending PC runs (not run here)
- `e2e-sectorops:1` .. `:6` at the S3-a head, flag off (laptop queue; brief section 6).
- `scripts/plan-svg.mjs` render of G against P0 (checker, LD 14 phase 3).
- Hide-spot light levels and the hall shadow / vantage measures (V6).
