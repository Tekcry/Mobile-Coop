# sector-fixes slice L - parked work in progress (2026-10-22 ~08:55)
Parked (priority switch to anim-natural). UNVERIFIED: the implementer was stopped while editing tests/warehouseS1Light.test.ts
("pass list, moonlit roof band, and a new no-roof-lamp check"). Built so far: src/world/maps/lampRooms.ts (new: per-room
lamp layout), src/world/{fixtureModels, lampMount, lightRig, lights}.ts, the three warehouse section maps, the shot
script scripts/sector-lights-shots.mjs, before shots in this folder. Two scratch tests (zzTables / zzTune .tmp) deleted.
Resume: read the diff against 591c68bc, finish the S1 light test, rebake, check, the warehouse / light suites, after shots.

## 2026-10-22 afternoon: resumed, finished, verified (unit tier)
Resumed on 511d589a (master 4.54.0 merged). The parked layout failed all three section light tests (route points
0.12-0.37 against 0.40, hot spots 0.6-0.76 against 0.55, pockets lit, 2 m columns with 14 lights against 8) and its
hall strips in section 2 sat under roof sheets. Finished as below; nothing committed (the job lead commits).

### Done per BRIEF item (slice L: items 1 and 2)
- One height and a regular layout per room: every room is one model at one height on a full grid or row
  (`tests/warehouseLamps.test.ts`: one height per room and mount, full grid, evenly spaced rows). Per fitting the radius
  and intensity differ (tuned to the light bands); dead fittings (drawn dark) keep the grids regular over pockets.
- No lamps on the roof: none on or over a roof (warehouseLamps), and the S1 light test's roof points read the moon alone
  (no lamp adds over 0.02; the S1 test's moonlit roof band 0.28 and no-roof-lamp check are in).
- No lamp in a climbing pipe: every fitting 0.8 m or more from every pipe, main, ladder and duct; the drainpipe's lamp is
  at (-21.4, 3.0, -18.45), 1.0 m east.
- LED designs: panel / strip / bulkhead LED models (`fixtureModels.ts`, parked work, unchanged).
- Light parity: every fitting is a registry light; the bake, the meter and the guards read the same field. The three
  section light tests pass with all their bands.

### Layout (final)
- S1: facade floods at 5.0 over shutters W / E (E dead), door bulkheads at 3.0 (drainpipe, entrance, workshop door), all
  on 0.3 m brackets with a forward-down beam (`WALL_S`); bay 4 x 2 strips at 5.58 (45 degree beam); lobby roof and plant
  deck rows at 5.58; workshop 3 x 2 at 5.58 (45 degree beam), rows z -15.8 / -11.8; crane walkway bulkheads at 5.0 every
  7 m; lobby two panels, corridor five panels (x -6.8 to 6.8), void 4 x 2 (x -5.3 to 7.3), security two panels.
- S2: strips at 5.8 under the solid roof strips: lane row (z -4.6, 30 degree beam), south aisles row (z 1.9, 50 degree
  beam), north as two staggered grids (A1 / A3 at z 6.9, 13.5; A2 (x -16.2) / gangway at z 9.6, 12.9, 16.2), two cage
  strips; the rack strips are gone; exit signs small glows (radius 0.6, 0.15).
- S3: hall 6 x 3 strips (x -2.8 + 5.2 k, rows z -2.6, 3.4, 9.4); deck row z 13.2 every 2.75 m; south wall bulkheads on
  brackets (`WALL_N`, z -8.35); office 2 x 2 panels; production office 3 x 2.

### Files
src/voxel/lampBake.ts (`lampPlanReach`, `lampColumnDist`, used by `lampGrid`), src/world/lampMount.ts (`WALL_GAP` 0.35),
src/world/maps/warehouseS1.ts, warehouseS2.ts (rafters `detail`), warehouseS3.ts, tests/lampBake.test.ts (new cone
reach test), tests/warehouseS{1,2,3}Light.test.ts (column check reads the plan reach), CHANGELOG.md, TESTING.md,
docs/systems/lighting.md.

### Tests (unit tier, this machine)
- `npx vitest run` warehouseLamps, warehouseS1Light, warehouseS2Light, warehouseS3Light, lampBake, lights, lightField,
  lampLevel, smoothWorldLight, ctcourseLight, sectors, sectorStep3, sectorRecord, sectorRestart, warehouseDress,
  lampPluginClone: 16 files pass (152 tests, 4 skipped).
- `npx tsc --noEmit` clean; eslint clean on the changed files.
- Not run (job lead, heavy lock): `npm run check`, full vitest, build, e2e, GPU shots.

### Assumed decisions (with undo)
- A-L1 Facade lamps at two heights: floods at 5.0 (`facade`), door bulkheads at 3.0 (`facadeDoor`). Undo: one height for
  both (the drainpipe base and the crawl gap then fail the S1 bands).
- A-L2 Wall lights stand 0.3 m off their wall on a bracket (`WALL_GAP` 0.35): at 0.1 m the conservative bake shadows the
  ground right under them. Undo: `WALL_GAP` 0.1 and the wall lamps' z back by 0.2.
- A-L3 Radius and intensity vary per fitting within a room (heights and positions do not). Undo: one value per room (the
  light tests then fail; a full re-tune would be needed).
- A-L4 Section 2's two rafters (x -16, -8) are dressing, out of the light shapes (they shadowed the rack tops). Undo:
  drop the `detail = true` line in `buildStorageS2` and re-tune section 2's north half.
- A-L5 `lampGrid` lists a cone light only where its beam reaches (lossless engine change, every map). Undo: revert
  `lampPlanReach` / `lampColumnDist` (the hall cones then overfill the 8-slot columns).
- A-L6 Exit signs are small glows (radius 0.6, intensity 0.15) so they never move the bands.

### Rebake
Not a committed artefact: the lamp bake runs at load and its cache key holds the shapes and the lights, so the new
layout and the rafter change rebake on their own. `LAMP_VERSION` unchanged (the visibility bake itself did not change).

### e2e and shots for the job lead
- Suites: `node scripts/run-e2e.mjs e2e-sectorops e2e-lightbake` (plus the slice tier: `e2e:quick` + `e2e-ctcourse`);
  GPU (desktop): `E2E_GPU=1 node scripts/run-e2e.mjs e2e-darkness`. No e2e asserts the Sector Ops lamp layout (grep of
  scripts/: e2e-sectorops reads no lights; e2e-lightbake and e2e-darkness use the base warehouse, where only the grid
  listing of its cone floods changes, losslessly).
- After shots: `E2E_GPU=1 E2E_PORT=4189 timeout 1200 node scripts/sector-lights-shots.mjs docs/sector-fixes/l after`,
  then `E2E_GPU=1 E2E_PORT=4189 timeout 600 node scripts/sector-lights-shots.mjs docs/sector-fixes/l --sheet` (needs
  `npm run build`). The view comments in the script still name the old lamps; the views frame the same areas.

### Open items (polish list, not blocking)
- Some lit fittings have a radius under their drop to any floor (e.g. S1 lobby-roof x -12, plant deck x 7, several S3
  hall fittings at 4.5): they glow but light nothing walkable; a look pass may dim them or make them dead.
- Intensities up to 1.6 (two S3 hall strips at x -2.8 and 2.4, z -2.6): check the GPU look for glare.
- Many dead fittings in the grids (S2 north, S3 deck west, S1 void): the look pass may prefer fewer fittings.

## Fresh checker (2026-10-22 ~18:05, on c845bd06 + master 4.55.1 merge 8be5798c): PASS, no must-fix, no should-fix
BRIEF items 1-2 met (one model / height / regular grid per room, nothing on or over a roof, every fitting >= 0.8 m from
pipes / ladders / ducts, panel / strip / bulkhead LED models). Light parity holds: every fitting is a registry light;
`LightField` and the shader read the one `lampGrid`; dead fittings contribute 0. The bake cache key covers the shapes and
the light floats, so no stale bake is reused (LAMP_VERSION unchanged is right). WALL_GAP is a validation limit and the
bracket length only (Sector Ops only).
**lampGrid reach listing is lossless** (orchestrator asked for proof; `tests/lampGridLossless.test.ts`): new listing vs a
reference listing every light whose radius touches the column, uncapped, sampled every 0.5 m at 0.05 / 1.0 / 1.7 m and up
the bake box: ctcourse 338,256 samples, bunker 6,350,400, warehouse 267,904, warehouseOps 291,200 - max abs difference 0
on all four. Against the OLD capped listing: identical on ctcourse, bunker and the base Warehouse (so e2e-lightbake /
e2e-darkness maps are unchanged); on the new Sector Ops layout the old rule would overflow 44 columns and drop light
(147 samples, max 0.085), which the reach listing fixes. `LightField.levelAt` equals the listed sum.
Polish: warehouseS2.ts:80 east exit signs may face the wall (yaw pi/2; check in the GPU look); fittings whose radius is
under their drop; S3 hall intensities up to 1.6; many dead fittings; warehouseOps sits at exactly 8 lights in its worst
column (the light tests catch an overflow).

## GPU after shots (2026-10-22 ~18:10, laptop hardware GPU, 985b0916)
`docs/sector-fixes/l/after-*.webp`, `sheet-before-after.webp`; e2e-darkness (GPU) PASS. The roof reads by the moon only;
the drainpipe lamp is off the pipe; the halls show regular strip rows; s2-aisle's round ceiling disc is a strip now.
**Polish for Michael's look:** s1-goods-in and s1-workshop now show strong white volumetric cones under the strip lights
(the fog volume over the new cone strips; visual only, the light meter and guards read the light field, not the fog);
s3-lobby's wall reads brighter. Tone the strips' volumetric weight or intensity in the visual pass if they read too
foggy.
