# campus-greybox S3 sub-lane r2 build report (the brief's name: `S3-R2.md`)

Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Night Shift | Cloud Builder 4 (Opus, cloud), 2026-10-25. Branch `feature/campus-greybox-s3-r2` from the R1a
frame commit 3a8c6893a. Brief: `docs/campus-greybox/briefs/S3.md` sections 1-3, 4 "R2", 7, 9, with the cloud-queue
brief's changes. Sources read with `git show`: 7c021f01 (`S3-detail.md` = D:58-82, the v2 graph space ids and boxes),
6c3f4a87 (`campusS3.ts` = S3), r1's head 5d7da838c (`s3Shell.ts`, read only, for the seams). Files touched: only
`src/world/maps/campusV2/s3L1.ts`, `tests/campusV2S3L1.test.ts`, `changes/feature-campus-greybox-s3-r2.md`, this report.

## R2a (commit 01a94ca53) - slab, landing, corridor and lobby, north rooms, security room

`s3L1.ts` (line numbers at the R2b head ffe5d4169):
- Step 1 :173 - the L1 slab (top 4.5, 0.2) over `S3_L1_SLABS` :79 (landing x 10..14, z -30..-11; x 10..64, z -11..0;
  x 52..64, z -18..-11) cut by `slabCut` :142 at `S3_L1_HOLES` :93 only: the north and east core wells inside their walls
  (core box less 0.15: x 30.15..33.35 / 58.15..61.35, z -6.85..-0.65), the hoist hatch x 18..20.85, z -6..-3 (P9), the
  sec hatch x 53.5..54.5, z -17.5..-16.5 (`S3_SEC_HATCH` :86). The west core is east of the landing slab: nothing to cut.
  The chase x 52..53, z -18..-11 keeps its slab (P22).
- Step 2 :177 - landing: x 14 clear glass 4.5 -> 9.0 on z -29.85..-21 and -14.5..-11 with the walkway door hole at 6.0
  (z -29.6..-28.4, 6.0..8.1) and its door (swing -1); a 1.1 rail inside the glass (x 13.75..13.85); the ship-ladder
  platform `S3_SHIP_PLATFORM` :107 (x 12.5..14, z -29.85..-28.35, top 6.0) and the ladder 4.5 -> 6.0 on its west edge
  (x 12.05, z -29.1, facing +x; 0.45 off the edge as the as-built walkway ladders); the landing ceiling at 7.5 over
  z -28..-11 (the crane bay z -30..-28 open to 9.0); the fire double door: z -11 wall x 10..14 to 9.0 with the hole
  x 11.1..12.9, leaves hinged at 11.1 (yaw PI / 2, swing -1) and 12.9 (yaw -PI / 2, swing +1), both opening north.
- Step 3 :203 - z -11 x 14..52: spandrel 4.5..5.6 (`S3_VIEW_SPANDREL_TOP`), clear glass 5.6 -> 9.0, the gallery door
  (glass over it); z -11 x 52..64 wall to 7.5 with the sec door; no wall at x 52 between corridor and lobby. z -7 to 7.5:
  x 10..21 wall (hoist door), x 21..30 the write-up glass front (door in it, glass over), x 33.5..58 wall (gown,
  storeHatch doors), x 61.5..64 wall; x 30..33.5 and 58..61.5 are R3's core walls. Sample cases `S3_SAMPLE_CASES` :101
  at x 18, 26, 34, 46: 1.2 x 0.8 x 1.0, noLedge, against the wall face (z -7.95..-7.15).
- Step 4 :231 - partitions 4.5..7.5 at x 21, 37.5 (passThrough door), 47 (airlock door); strips at x 30, 33.5 and 58
  from the cores' north walls (z -0.5) to the shell, 4.5..7.5 (they close R1's finding (2) slots behind the N and E cores
  on L1); the store's shelving partition x 53 (2.4, solid z -6.85..-4 and -2.8..-0.15, the aisle gap between); the board
  shelf x 57.2..57.85, z -5.0..-2.6, 1.8 high (the brief's "x 57.35..58.0 less 0.15"); the write-up desk as built.
- Step 5 :245 - sec room: x 53 (z -18..-11) and z -18 (x 52..64) walls 4.5 -> 9.0 (the chase sealed at both ends with
  the z -11 wall); counters `S3_SEC_COUNTERS` :114; the hatch: rails 1.1 on its west and east edges, the open cover
  (1.0 x 1.0 plate standing on its south edge), the north edge the way on; `b.ladder(54, -17, 0, 4.5, facing +z)`.

## R2b (commit ffe5d4169) - gallery, walkway, hoist hatch, ceilings and void, rooms, seeds

- Step 6 :258 - gallery deck x 28..44, z -12.5..-11 and spur x 31..35, z -14..-12.5 at 4.5 (STEEL slabs); the bridge
  plate `S3_BRIDGE_PLATE` :122 (x 31.5..34.5, z -14.5..-14, 4.4 -> 4.5 lying on the chamber roof); rails on the south
  edge (x 28..31, 35..44), the west end, both spur sides; the plate end open; the drop gate: a door anchor on the x 44
  end, hinge (44, 4.5, -12.5), 1.2 wide, 1.1 high, swing +1 (opens +x over the drop), a stub rail z -11.3..-11.
- Step 7 :276 - walkway deck x 14..52, z -29.85..-28.35, top 6.0; north-edge rail x 14.15..17.5 and 18.5..50.5; caged
  ladders `S3_WALKWAY_LADDERS` :125 at (18, -28.2) and (51, -28.2), 0 -> 6.0, facing PI, four drawn cage hoops each
  0.3 behind the ladder line (S3:404).
- Step 8 :288 - hoist hatch rails 1.1 on z -6 and z -3 (x 18..20.85); the east side is the x 21 partition; the west
  edge (the CR3b lip) has no collision: the loading gate is drawn as its post with the bar swung up (no collision);
  no ladder. The goods racking `S3_RACKING` :132 (x 18.5..20.85, z -0.8..-0.15, 2.4, noLedge) and the maintenance
  ladder 4.5 -> 7.5 at (20.4, -1.0) facing +x on the x 21 wall face, exiting east out of the hatch onto the void deck.
- Step 9 :302 - ceilings 7.4..7.5 over the corridor and east lobby (x 10..64, z -11..-7), the sec room, the goods
  landing (x 10..20); the void deck x 20..58, z -7..0 (less the north core, R3's lid, P11) with only `S3_VOID_HOLES`
  :136 (the maintenance hatch x 20..21, z -1.5..-0.5; the store tile hole x 48.9..50.1, z -3.6..-2.4) and the lifted
  tile drawn beside it; the plenum wall z -7 from 7.5 to 9.0 (x 10..30, 33.5..58, 61.5..64).
- Step 10 :39 - `S3_ROOMS_L1`: s3-c2, s3-view, s3-east, s3-hoist, s3-writeup, s3-gown, s3-clean, s3-store, s3-sec, each
  on its 3.1 box with minY 4.5 (no maxY, as built), no squad.
- Step 11 :55, :71 - the twelve nav seeds of the brief; the hide spot (11, 4.5, -1.0).

## Tests
`tests/campusV2S3L1.test.ts`, 16 cases (R2a 8, R2b 8), all pass: slab areas and holes; corridor 3.7 clear 4.5..7.4 but
the sample cases (and no wall at x 52); spandrel top 5.6 and glass to 9.0; this lane's nine door holes and anchors with
the 3.2 swings, the two fire-door leaves opening north; landing glass, rail, platform, ship ladder, ceiling and the open
crane bay; partitions, strips, z -7 wall and glass, shelving gap, shelf, desk; sec room walls, counters, hatch, rails,
cover, ladder; walkway deck, rail gaps, ladders and hoops; gallery, spur, plate, rails, drop gate, gallery -> chamber roof
on nav; hoist hatch three sides closed, west open, no ladder; ceilings over every L1 room; void deck and holes, 1.5
clear, plenum wall, no guard nav cell at 7.5, racking and the hatch ladder; the L1 rooms (ids, boxes, minY, no overlap
with any S3 room); seeds and hide spot on nav, hide spot >= 1.5 m from doors; nav layers <= 5 per column.
The nav tests use an analytic grid on this lane's pieces plus two stand-ins for R1's pieces (the roof slab and the
chamber, `standIns` in the test), since the base is the frame commit; R6's nav flood re-runs it on the merged lane.
Other runs: `npx vitest run tests/campusV2S3*.test.ts tests/campusS3*.test.ts` 4 files / 65 tests pass (default-build
S3 tests unchanged); `tests/campusV2.test.ts` passes; `npm run typecheck:fast` clean; eslint clean on both files.

## Assumptions (derived numbers; undo = the lead's number)
- A-R2-1 Core well holes = core box less half a wall (walls pass through the slab). Undo: cut the full box.
- A-R2-2 Landing glass and the z -11 hall glass run to the roof 9.0 (the hall side is open to 9.0); L1 partitions,
  the z -7 line and the lobby's z -11 wall stop at the 7.5 ceiling; the sec room's x 53 and z -18 walls run to 9.0 to
  seal the chase and close the chiller bay. Undo: other tops.
- A-R2-3 Fire door leaves: the 12.9 leaf is yawed -PI / 2 with swing +1 so both open north ("both -1 side"). Undo: flip.
- A-R2-4 Ship ladder on the platform's west edge, 0.45 off it (as-built walkway ladder offset). Undo: move it.
- A-R2-5 Sec counters re-placed by rotating the as-built offsets round #12's stops (monitor 0.6, kettle 0.3 in front).
  Undo: the desk point R4 picks.
- A-R2-6 Sec hatch: rails W and E, the cover standing open on the S edge, ladder facing +z (exit north). Undo: other edge.
- A-R2-7 Bridge plate 0.5 long (one grid cell) lying on the chamber roof, top 4.5. Undo: the lead's length.
- A-R2-8 Drop gate as a door anchor 1.2 x 1.1 (opens over the drop) plus a 0.3 stub rail. Undo: a rail piece or a
  drawn-only gate.
- A-R2-9 Walkway's west rail starts at the glass face 14.15 (clear of the walkway door frame), not 14.0.
- A-R2-10 Racking 0.65 deep (the as-built store shelf depth); the maintenance ladder on the x 21 wall face beside the
  racking, climbing east out of the hatch (the brief's "ladder on the goods racking" would put the exit over the hatch
  hole). Undo: ladder on the racking's front with an exit the lead names.
- A-R2-11 Hoist hatch loading gate drawn only (post, bar up), no collision, so the CR3b lip stays clear. Undo: a bar.
- A-R2-12 Room names as built where the room existed; new: "East Lobby", "Goods Landing". No maxY (as built), so the
  void and the walkway read as the room under them on the HUD. Undo: maxY 7.5 on the north rooms.

## Deviations
- None from the step lists; the derived choices above are the brief's B7 kind.

## Findings for the lead
1. The void deck physically continues west over the goods landing's ceiling (x 10..20): the brief names no plenum wall at
   x 20, so a player in the void can crawl over the goods landing too (still off the guards' grid). Add a 7.5..9.0 wall
   at x 20 if the void should stop there.
2. The ship-ladder platform's north edge (z -28.35, 1.5 over the landing) has no rail; the brief names none.
3. The platform's last 0.35 (z -28.35..-28) sits under the landing ceiling (1.4 headroom); the crane bay is 2 m.
4. The walkway, gallery and void are no HUD rooms (as built); with no maxY the void reads as the room below.

## Pending PC runs
- `e2e-sectorops:1` .. `:6` (flag off) at the S3-b head (laptop queue); the plan-svg render of L1 against P45; V6
  measures (light, shadow, vantage) once R4's lamps are in; R6's nav flood and three-stairs reach on the merged lane.

## What Michael should try
Nothing yet: the layout is off by default (`?campusv2=3` once the whole lane is merged).
