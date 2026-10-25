# campus-greybox S3 sub-lane r4 build report (the brief's name: `S3-R4.md`)

Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Night Shift | Cloud Builder 4 (Opus, cloud), 2026-10-25. Branch `feature/campus-greybox-s3-r4` from the R1a
frame commit 3a8c6893a. Brief: `docs/campus-greybox/briefs/S3.md` sections 1-3, 4 "R4", 7 (B1-B3, B7-B9), 8, 9 (P12,
P13, P15-P17), with the cloud-queue brief's changes (G329; one provisional block with `TODO(light-realism)`, as S2's
`S2_LIGHTS` on origin/feature/campus-greybox-s2). Sources: 6c3f4a87 `campusS3.ts` (S3) and `campusSectors.ts` (CS),
7c021f01 `SYNC.md` and the v2 graph (= the plan graph, V2-SEED). Files touched: only `s3Lights.ts`, `s3Devices.ts`,
`tests/campusV2S3Lights.test.ts`, `tests/campusV2S3Sync.test.ts`, the fragment and this report.

## R4 (commits 9eca28309, a99bec3bc)

`src/world/maps/campusV2/s3Lights.ts`:
- `S3_LIGHTS` :54, one block (PROVISIONAL, `TODO(light-realism)`, engine values x1); `buildS3Lights` :155 builds every
  lamp from it and nowhere else, then the four laser emitter boxes (S3:462-465) and the block fill 0.14 (S3:480; the
  cores' 0.30 is R3's). 32 fittings: 5 high bays (3.3 points; r 12, i 0.9, cone down 1.15, w 0.7), 3 corridor
  downlights + the goal lamp at the hatch (P12) + the gowning night light (r 4, no cone, w 0.4) on `view` (B2), 3
  burn-in task lights, 2 dock lamps (desk, roller door; P13), the write-up and sec lamps, 2 control consoles and the
  sign-out board lamp on `ctl`, the chiller bay and the plant north passage on `plant`, and J17: the gas-cage bulkhead
  on `dock` (B9), the EMC room (inside, y 3.6), the clean room, the goods landing, and two per fire stair (half landing
  y 4.4, L1 landing y 6.9) on 160-165. L1 lamps at y 7.4.
- `S3_SWITCHES` :93 (17): the hb1-hb3 bank on the west core's west face (x 13.85, z -18.95 / -18.55 / -18.15, yaw
  -PI / 2); view at the fire door's corridor side (13.4, 4.5, -10.85) and the east lobby's end wall (63.85, 4.5, -9);
  burn on the hall side of the control-room door (41.7, 0, -11.15); dock (23.5, 0, -10.85), office (25.7, 4.5, -6.85),
  sec (59.7, 4.5, -11.15), ctl (41.7, 0, -10.85), plant (52.15, 0, -25.7); J17: emc (46.1, 0, -15.85), clean (37.65,
  4.5, -1.9), hoist (13.7, 4.5, -6.85), wStair (14.15, 0, -18.95), nStair (30.15, 0, -4.9), eStair (60.8, 0, -6.85).
- `S3_BOARDS` :122, `S3_LASERS` :129, `S3_PANELS` :139, `S3_PANEL_NEAR` :146 as the brief lists them.

`src/world/maps/campusV2/s3Devices.ts`: `S3_CAMERAS` :14 (cam-view P16, cam-dock as built), `S3_ALARMS` :23 (P17),
`S3_DESKS` :38, `S3_KEYPADS` :54, `S3_INTEL` :63.

### Planned nodes built (for the lead's SYNC.md `src` column)
- sync-s3-isolator: `src/world/maps/campusV2/s3Lights.ts:122` (`S3_BOARDS`, (56, 0, -7.3), view, window 45).
- sync-s3-code-src: `src/world/maps/campusV2/s3Devices.ts:64` (`S3_INTEL` board at (44, 1.5, -0.3), grants s3-codes).
- sync-s3-code-sink: `src/world/maps/campusV2/s3Devices.ts:55` (kp-store at (58, -6), s3-codes); kp-sec :56.
- sync-s3-camloop: `src/world/maps/campusV2/s3Devices.ts:38` (`desk-sec3` at (58.3, -15), y 4.5, cam-view + cam-dock,
  operator 11).

## Tests
- `tests/campusV2S3Lights.test.ts` 11/11: every lamp from the block (on, > 0, destructible, electric; the campus build's
  footprint lamps are exactly the block; every circuit has a lamp); the 5 high bays; every circuit's switch within 2.0 m
  of a door of its space (J17 one each within 1.5 m; the corridor's end-wall switch excepted, as built); J17 lamps all
  inside their room and each switch facing into it; dark by reason; the board; lasers, panels, near points,
  `checkPanels` empty, emitters drawn only, the beams' spans; cameras and `validateSecurity` (with the desk); the desk;
  the keypads and intel with `checkSectorCodes` empty (S3's keypads and intel swapped into the campus sectors until R5
  adds them) and failing without the intel; the alarms.
- `tests/campusV2S3Sync.test.ts` 5/5: graph `syncs` = SYNC.md's S3 rows; the board, sign-out board, kp-store and desk
  at the graph notes' points (+-0.05), the 45 s window, the looped cameras.
- Also: `npx vitest run tests/campusV2S3*.test.ts tests/campusS3*.test.ts tests/campusV2.test.ts` 6 files / 74 tests
  pass (default-build S3 tests unchanged); `npm run typecheck:fast` clean; eslint clean on the four files.

## Assumptions (derived; undo = the lead's value)
- A-R4-1 Switch placement: on the wall face, 0.5 off the latch edge of the space's main door, yawed into the space
  (the brief's rule with the as-built 0.5 offset, S3:213); the high-bay bank's offsets from wStairG's latch edge are the
  as-built bank's from the old hall door (0.5, 0.9, 1.3).
- A-R4-2 The dock's main door is the roller door (the hall side, as built the dock-hall door); the control room's is
  ctlHall; burn sits at ctlHall's hall side (the nearest door to the log desk; LD 5.1 "by a door").
- A-R4-3 The view switch's second position: the east lobby's end wall middle (63.85, -9), as built at the corridor's
  end-wall middle.
- A-R4-4 The sign-out board lamp is the burn-in fitting turned to face its board (cone 0 / -0.85 / 0.5).
- A-R4-5 Gowning night light width 0.4 (S3:474's fitting); the stair fittings 0.3 (J17 B8).
- A-R4-6 The EMC lamp's cone uses the high bay's down cone (1.15): the table says "cone down".
- A-R4-7 Desk point 0.3 m ahead of #12's monitor stop: (58.3, -15), yaw PI / 2, y 4.5 (r2 put the monitor counter at
  x 58.6..59.25, consistent).

## Deviations
- The brief's R4 test line "no fitting over the chamber, EMC room, gas cage, clean room, low aisle or walkway" predates
  J17, which lights the gas cage, the EMC room and the clean room (B8, B9; Q2 "Never" is Michael's and wins). The test
  checks: nothing above the chamber or EMC roofs, nothing in the void over the clean room, nothing in the low aisle or
  over the walkway, and the gas cage's one bulkhead and the EMC room's one inside lamp.
- SYNC.md is not on this branch (it lives on feature/sector-redesign-signoff): the sync test carries its S3 rows
  verbatim and also compares with the file when it is present in the tree.
- "las-store's partition leaves no way round" and "each group's switch on nav" need R2's partition and slab and R1's
  walls: on this branch the tests check the beam spans and that each J17 switch's stand point is inside its room;
  the nav checks are pending the merged lane (R5 / R6).

## Findings for the lead
1. The EMC room is a solid box with no door (R1, as built), so its lamp sits inside solid collision and its switch
   ("inside the shielded door") is on the box's north face by #17's door post (45, -16). If the EMC room should open, it
   needs a door and an interior (R1's file).
2. The S3 wiring is in `s3Data.ts` (R5): `S3_PARTS.boards` is still `[]` and `S3_CAMERAS` / `S3_ALARMS` / `S3_DESKS` /
   keypads / intel there are the v1 copies; R5 points them at `s3Lights.ts` / `s3Devices.ts`.
3. The north stair's switch (latch side of nStairW) sits beside flight 1's foot; the hinge side has only 0.25 m.

## Pending PC runs
- `e2e-sectorops:1` .. `:6` (flag off) at the S3-d head; V6 light / shadow measures of the new fittings (J10 retunes);
  the GPU look of the block; the merged-lane nav checks (switch stand points, las-store no way round, panel eye lines).

## What Michael should try
Nothing yet: the layout is off by default (`?campusv2=3` once the whole lane is merged).
