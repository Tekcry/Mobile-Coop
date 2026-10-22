# Slice 1 build report - S1 Gatehouse and car park (builder: Sonnet 5.5, 2026-10-23)

Branch `feature/sector-redesign` (base d9a27c4f). Nothing committed. e2e and build not run (laptop). Assumptions are numbered
L1.. for the lead to renumber (A64+).

## Result
Done: `campusOps` builds and registers; S1 is built in full as a greybox; S2-S5 are stubs in hollow shells that chain. Unit
checks, tsc and lint pass. The e2e part (`--part=6`) is written and `node --check` clean but NOT run.

## Files
New: `src/world/maps/campusOps.ts` (MapDef, ground, perimeter, four shells, three stub connectors),
`src/world/maps/campusS1.ts` (all S1 geometry, lamps, switches, spawns, hide spots, seeds, rooms, `CAMPUS_COOP_LIPS`),
`src/world/maps/campusSectors.ts` (`CAMPUS_SECTORS`, `CAMPUS_SECURITY`, `CAMPUS_ALARMS`, `CAMPUS_POSTS`),
`tests/campusS1.test.ts` (43 tests), `tests/soloJumpReach.test.ts`.
Edited: `src/world/maps/index.ts` (registered after `warehouseOps`; not in `LISTED_MAP_IDS`),
`tests/helpers/soloJumpReach.ts` (replaced by 7306dce9's version, 206 lines; the three warehouseCoop tests still pass),
`scripts/e2e-sectorops.mjs` (part 6 added before the closing lines; every Warehouse part untouched),
`changes/feature-sector-redesign.md` (the one line).
Tests edited outside the owned list (they assert the map set): `tests/rooms.test.ts` (id list gains `campusOps`),
`tests/detailPass.test.ts` (the MAPS no-dressing list gains `campusOps`; the ultra <= epic count is only asserted for dressed
maps and Kestrel: the tiers share one random stream, so campusOps read 711 > 683), `tests/voxelFit.test.ts` (area limit
160 x 160 for `campusOps`, like the bunker's own: its voxel grid is 154 x 154 m against 110 x 110).

## Values the SPEC left open
- Lamp groups (numbers; the SPEC's names are ids): `s1-park-w` 40 (8 columns), `s1-park-e` 41 (6), `s1-fore` 42 (8 bollards +
  1 dock lamp), gatehouse 43 (1 panel, switch at (15.7, -73.3)), canopy 44 (4 downlights, switch INSIDE C1 at (-23.85, -32)),
  lane floodlight 49 (no switch, pole (9, -66)). Columns 6.0 high at z -62 and z -53 (x -34,-28,-22,-16 west; -10,-4,2 east).
  Lamps: columns r 12, i 0.9, sodium, spot 66 deg; bollards r 4.5, i 0.5 at z -45.5; canopy r 6.5, i 0.85; gatehouse r 5.5, i 0.9.
- Ambient: the whole S1 box 0.14 (verge, bin lane, bike shelter, roofs included), C1 0.30. Bike shelter has a dead fitting.
- Switches: feeder breakers (-31.8, -47) west and (-30.9, -47) east on the pillar's south face (pillar block at (-31.4, -46.6)),
  yard board (-29.5, -40.3) on the plant room's south wall.
- Spawns (24, -79), (22.8, -79), (25.2, -79), (24, -77.8), yaw 0. Start = (24, 0, -79). C1 checkpoint (-20, 0, -32, yaw 0).
- Guards (kind, slot, yaw, route, waits): #1 officer (16, -76) -PI/2 post. #2 officer (18.3, -74.8) 0, route desk -> kettle (18.4,
  -77.65), waits [28, 5], faces [0, PI], cycle 39.1 s. #3 grunt (-29, -66.2) and #4 officer (-29, -65.2): a timed loop of 4
  points (8 x 2.4 m), `loop {period 42, leave [4.5, 18, 25, 38], t0 0}`, side by side, faces 0 / PI, stops 3-6 s for both walkers.
  #5 officer (-20, -35) yaw PI post (K1). #6 grunt (8, -48.5) PI post. #7 grunt (-38, -66) <-> (-34, -50), waits [4, 4], faces
  [PI, 0], cycle 41.4 s. #8 grunt (-34, -41.6) <-> (-32, -41.6), waits [12, 12], faces PI -/+ 1.05, cycle 28 s.
  Squads: gatehouse 0, car park 1, front 2 (#5, #6), west 3 (#7, #8). Takedown spots: #1 (16, -76.4), #2 (18.4, -77.65), #3 / #4 on
  their slots, #5 (-20, -34.7) behind him, #6 (8, -47.6), #7 (-34, -50.6), #8 (-33, -42.2).
- Cameras: cam-gate at (11, -77.9) y 3.0 facing 180 fixed, aim 6, range 10; cam-walk at (-17, -34.5) y 3.4 facing 205, sweep
  [185, 225], aim 8, range 10. Alarm panel (15, -73.3) facing south. Reinforce (11, -79) and (-33, -41), `perStage` 2, `dogs` 0.
- Routes (3): stealth (verge, rear window, east side, behind the smoking shelter, facade, doorman from the east), shadow (feeder
  board, bin store, yard, doorman from the west), high (yard ladder, plant roof, canopy, drop at the E lip; `climbs` [8, 12]).
- Geometry: ground slab 1 m; perimeter fences 2.4 (gate x 8..14, cut panel gap x 23.4..24.6); gatehouse walls 3.0, roof 3.3;
  car park cars 1.8 x 1.5 x 4.2 in rows z -73.75, -69.25, -58.75, -54.25 (bay pitch 2.8 from x -34.6); bin store walls 3.0 on
  W / N / E, open south; shelters roofs 2.4; kerb 0.15 at z -46.15; planters 0.7 at (-11 / -7 / -3, -35.6); pavilion x -44..4,
  z -34..-30 solid 4.4 with C1 hollow (3.0); canopy slab 4.2-4.4 on four 0.15-radius columns; plant room walls 4.2, roof 4.4,
  parapets 1.1 on S (ladder gap x -38.6..-37.4) and W; ladder base (-38, -40.4) to 4.4 with three hoops.
- Shells: S2 x -44..4 z -30..6 h 12.3 (slabs 4.4, 8.4); S3 x 10..64 z -30..0 h 9.5 (slab 4.5); S4 x -10..40 z 16..48 h 7.5;
  S5 x -66..-26 z 18..48 h 8.4 (slab 4.2). Stub connectors at ground level: C2 x 4..10 z -16..-12, C3 x 22..26 z 0..16, C4 x
  -26..-10 z 26..32. Stub objectives are plain grabs; S5 extract box [-54, 40, -48, 46] inside its shell.

## Assumptions
- L1 Lamp groups are numbers (the registry's `group` is a number); the names above map to them (`S1_GROUPS`).
- L2 **The download objective is at (19.3, -76), not (18.5, -76).** At the open window a player stands at x >= 20.45 (wall face
  20.15 + 0.3 body): 1.95 m from (18.5, -76), outside the default interact reach 1.8, so the download could not be started from
  the verge. (19.3) is the PC on its desk, 1.15 m from the window. It still sits within 4 m of the whole verge route.
- L3 Doors are 1.2 wide, not 1.0: the 0.5 m nav grid with a 0.32 agent only opens a gap wider than 1.14 m (the Warehouse's 1.2).
- L4 The bin store is z -52..-45 and the delivery yard z -45..-40: the SPEC boxes (bins -52..-44, yard -46..-40) overlapped by 2 m
  in plan, which the rooms test forbids.
- L5 The fence patrol walks (-38, -66) <-> (-34, -50), not from (-38, -76): at 0.99 m/s a 26 m leg is a 53 s cycle (limit 45).
- L6 Cycle arithmetic uses the real walk speeds (grunt 0.9, officer 0.85, enforcer 0.8; plain routes x 1.1; loops x 1.0), see
  the header of `campusSectors.ts`.
- L7 The car-park pair walks one 42 s master-clock loop (the A16 pattern), 1 m apart; "stops at the row ends" is the 4 loop stops.
- L8 K1 cone for the choke assert = the union of the focus cone (25 m, 27.5 deg half angle) and the peripheral cone (12 m, 100
  deg), facing south from the post, geometric (no occlusion), ground storey only. The focus cone alone cannot close a path (it is
  a sliver beside the apex); the peripheral cone covers everything but the cells behind him. The door cell is 1.0 m behind the
  post and inside the leash circle (5 m): the leash edge is 4 m off it, so the post stayed at (-20, -35) (no move).
- L9 **CR1's "drop takedown behind the doorman" does not fit the geometry.** The doorman stands 6 m inside the E lip and 5 m
  inside the S lip under a solid slab; a drop from either lip lands on the forecourt, not behind him. Needs a design call (a
  notch or hatch in the slab over him, or a lip nearer his post). Left as built.
- L10 The pavilion (z -34..-30) is a solid 4.4 box with C1 hollow; S2's shell starts at z -30. The canopy, the plant room roof and
  the pavilion roof are all flush at 4.4, so the canopy top is walkable from the plant roof (the high route).
- L11 M8: #1 and #2 (one lit room), #3 and #4 (walking together) fail isolation in time by construction (overlap partners, LS 4.5);
  they are the recorded exceptions in the test. #5, #6, #7 (8.5 s at the bin-store end), #8 pass.
- L12 Stub connectors are ground-level rooms between the shells (the SPEC's glazed C2 bridge is on L1); shells are hollow.
- L13 `detail: false` on the map: no generated skirting / vents / clutter (greybox).
- L14 `CAMPUS_COOP_LIPS` also lists `CR1-south` (the same canopy's south lip, a leg-up from the forecourt); it passes the same
  checks.
- L15 The ladder base is (-38, -40.4) (0.4 m off the wall face), not (-38, -41). The breakers are 0.8 m apart at (-31.8 / -30.9,
  -47), not both at (-31, -47).
- L16 cam-walk's "2 s pause" has no data field: only the sweep is set.
- L17 `CAMPUS_POSTS['s1#5']` holds the K1 post block (leash 5, guards `c1-door`) until guard-ai's `post` lands on `SquadSlot`.

## Findings for the lead
- **Quarter-turn walls.** `LevelBuilder.wallX` / `wallZ` make a wall as a box with yaw PI / 2 (size swapped). The Warehouse
  tests filter `Math.abs(yaw) < 1e-3` before `soloJumpThreats`, which silently drops every wall from the jump / landing checks.
  `tests/campusS1.test.ts` swaps those boxes to plain ones first; the CR1 checks pass with the walls in.
- **Registering `campusOps` in `MAPS` puts it in the Sector Ops list**: `sectorOps()` (`missionsScreen.ts`) filters `MAPS` by
  the `sector` mode, not by `LISTED_MAP_IDS` (which does not list `warehouseOps` either). A second op button now shows. The
  menu e2e (`e2e-menus`, `e2e-park`) looks up `[data-op="warehouseOps"]` by id and should be unaffected.
- **`run-e2e.mjs` expands `e2e-sectorops` into `:1`-`:5`**; part 6 runs only by name (`e2e-sectorops:6`) until it is added there.
- EW16 data (node, pure bakers, the desktop at full load; Warehouse Ops against campusOps): map build 295 ms against 3 ms (the
  Warehouse has dressing, campusOps none: 1439 against 146 boxes, 105 cylinders), moon bake 76 ms against 1071 ms (grid 112 x 22
  x 104 against 288 x 32 x 316), lamp bake 4030 ms against 9764 ms (133 lights against 30: the volume grows with the map, not the lamps; the budget A20 is 2x),
  light-set bounds -72..72 x -2..14 x -86..72. The nav grid is 280 x 308 columns x 5 layers (86k x 5). The voxel grid is 154 x 154 m
  (see `voxelFit`). Browser load time, nav build and memory on the laptop GPU are NOT measured.

## Checks run (desktop, nothing heavier)
- `npx tsc --noEmit -p .`: pass (exit 0).
- `npx vitest run tests/campusS1.test.ts tests/soloJumpReach.test.ts tests/sectors.test.ts`: 3 files, 77 tests pass.
- Also: `tests/warehouseCoopS1/2/3`, `rooms`, `laserPanels`, `detailPass`, `voxelFit`, `lampBake`, `editor/night`, `kestrelMap`,
  `missions` pass (the maps loops now include campusOps). No full run.
- `npx eslint` on `src/world/maps/campus*.ts`, `index.ts`, the new and edited tests, `tests/helpers/soloJumpReach.ts`: clean
  (eslint ignores `scripts/`). `node --check scripts/e2e-sectorops.mjs`: ok.

## What the unit test covers (PLAN "Common" list)
8 guards with kinds / weapons, every human armed, role / zone / reason / squad / pair tags, each cycle 25-45 s, loop fit, slots >= 7
m from the start, every guard slot / route point / takedown spot / route point / spawn / hide spot / reinforce point on an
analytic nav grid built from the pieces (ladder links included), every walked route leg has a path, cameras (range 8-12, reason,
`validateSecurity`), CR1 (and the south lip) against `soloJumpThreats` + `soloTopLandingThreats` with 0.5 m, headroom to 6.2, rule
2, rule 3, rule 6, rule 7, the lighting circuits and darkness, E1-E12, the M8 check, and K1 (post data, leash, the cone choke:
blocked cells > 50, no path from the verge to the C1 near door; unblocked, a path).

## e2e part 6 (written, not run)
(a) boots, 8 guards alive, 5 sections, cameras live, every route leg has a path on the real grid; (b) teleport-walk verge -> open
window, download 10 s, C1 opens, into C1, the cycle seals, the S2 stub loads with the dock door unlocked, its objective opens
C2; (c) the west breaker cuts only `s1-park-w` and the meter at (-28, -58.75) reads < 0.28 (and brighter with it on); (d) solo
probes (CR1 east lip from the kerb, the south lip, the plant room wall, the bin store wall) never hold a 4.25+ grip or stand there.
Unsure until run: the lit reading margin in (c) (+0.08), and the probes' run-up geometry in (d).

## Skipped (PLAN bonus list)
Co-op legs (leg-up onto the canopy, the drop takedown, both pass C1), the revive on the roof, the verge-vantage and cam-walk
coverage e2e, the fence patrol drawn to the cut board, the S2-S5 stub seal / nav check, a real walk (pad-driven) through the
badge door, the in-browser EW16 timings, a lit-level table for the S1 light pass (no `tests/campusS1Light` bake test).

## Fix round (A64-A68)
- A68 list: `sectorOps()` filters `m.id !== 'campusOps'` (`LISTED_MAP_IDS` has no `warehouseOps`, so no set to reuse). No test or script asserts `sectorOps`.
- A65 hatch: canopy slab is four boxes around x -20.6..-19.4, z -36.4..-35.3 (west, east, south strip, north strip; the north strip's edge is a normal slab ledge). Doorman post (-20, -35) kept. East downlights now x -18.5, radius 4.5. Tests: hatch open, takedown spot (-20, 4.4, -36.7) on the slab 1.7 m from the post with a clear eye ray, boost point (-13.5, -38) under `LIGHT.shadow` (ambient + `contribution()` sum, no occlusion: conservative). CR1 and E8 tests now find the slab by its east piece (centre x -16.7).
- A66: objective was already (19.3, -76); SPEC S1 text changed from (18.5, -76).
- A67: `voxelFit` limit is max(110 x 110, (map span + 16)^2) from `b.bounds`, bunker excepted; the `campusOps` exception is gone. `rooms` (the map id list) and `detailPass` (the dressing-off id list) assert which maps exist, not a limit: left as they are.
- A68 margin: guard #7 tagged `dormant: true` (`SectorGuard.dormant?` added in `src/game/sectors.ts`); smoking shelter east panel now z -51.5..-47 (1.5 m longer toward the car park/verge side). Unit assert: no posted, pair, handler or dog guard is dormant.
- Checks: tsc 0 errors; vitest campusS1, rooms, detailPass, voxelFit, sectors, soloJumpReach: 6 files, 98 tests pass; eslint clean on changed files. No e2e, no build.
