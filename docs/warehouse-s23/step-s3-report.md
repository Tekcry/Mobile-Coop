# Step S3 report - section 3 greybox (implementer)

Built to `BUILD-S3.md` (all of it read). Nothing committed. Heavy checks (`npm run check`, build, e2e) are the job lead's.

## Built
- `warehouse.ts`: `assemblyHall` option (default true) exactly as sheet 1.1 (z 12 / x 2 walls 3.0 high, floor and mezzanine blocks skipped, lamp strips x > -4 dropped, deck surface and pipe skipped). Plain Warehouse still 318 / 14 / 5.
- `warehouseS3.ts` (new): `buildAssemblyS3`, `S3_ROOMS` (9), `S3_SWITCHES` (6), `S3_PICKUPS`, `S3_NAV_SEEDS` (12), `S3_LIGHT_PASS` (42 lamps), parapets, deck, columns, rails, ladders, production office with door / window / duct grille, stair, plant room, lobby, walkway, floor contents, stores cage, hall main with header, supply duct (both directions).
- `warehouseOps.ts`: section 3 call, `assemblyHall: false`, rooms / items / seeds as sheet 1.3, `WAREHOUSE_OPS_LAMPS` loop and constants removed, description updated.
- `warehouseSectors.ts`: `WAREHOUSE_SECTORS[2]` (9 guards, 3 routes, extract in the fire lobby), the five devices moved, `levels.mezz` 3.3, `WAREHOUSE_OPS_LAMPS` deleted, header "8, 8 and 9".

## Deviations from the sheet (all)
1. **Door gaps 1.2 m, not 1.1** (office door x 16.4-17.6, lintel 1.2; plant north door x 19.4-20.6, lintel 1.2; cage gate fence gap 2.4-3.6). The 1.1 gaps held no nav cell (0.5 m cells, agent 0.32: a cell centre must be 0.32 clear of both jambs, a 0.46 window; these three fell 2 cm short). The leaves stay 1.1 (hinges unchanged). Found by a node nav proxy: with 1.1 the office, the cage and the engineer's north door were unreachable.
2. **Duct pieces 0.6 wide, east face x 23.95** (casing, the two opening boxes, elbow, grille centred 23.65; sheet 0.65 wide to 24.0). Flush to the perimeter they failed `voxelFit` (probe 3 cm into the cladded wall above its plinth reads air). Path points, grates and anchors unchanged.
3. **Entry grate visual** centred x 23.215 (5 mm proud of the shaft face; sheet 23.18, flush): a flush visual failed voxelFit's air probe.
4. **Lamps 1, 15, 27** by the ladder (below); the other 39 as the sheet.
5. **Light test reading rule**: a pipe grip over the deck (the main's north end (17, 12.4, 5.0), feet would be in the slab) reads on the deck top 3.3. Reads 0.57 (band 0.55 + 0.02).
6. Light test C3 spots: all KEY-CAP named points use 0.45-0.55; route ends and waypoints READ-CAP.
Everything else as the sheet (coordinates, guards, routes, climbs, devices, rooms, switches, pickup, seeds).

## Ladder steps
- M8 (8.3): none. Every guard passed the static check and the phase-drift test as built (the fitter's three screens in place).
- Lamps (8.4, details in `LIGHT-S3.md`): lamp 27 over the lobby roof i 0.60 -> 0.43 (two -15 % steps; the roof west edge 0.65 -> 0.53). Lamp 15 (terminal glow) moved 0.9 m to (23.4, 16.8), i 0.85 ((22.9, 15.6) 0.66 -> 0.51, grille 0.45, terminal 0.56). Lamp 1 (C3 ceiling) moved 0.45 m to (-2.0, 13.8), r 4.5, i 0.65 (+8 %, not 15 %: the checkpoint would pass 0.57); doorway (-0.95, 12.6) 0.33 -> 0.42. Tried and reverted: lamp 3 +15 % (no effect on the doorway), lamp 1 +15 % (checkpoint 0.58). No pocket changed.
- `navLayers`: not set. The proxy (all route legs, guard loops, seeds) passes at 3 layers, identical at 4.

## Files
Changed: `src/world/maps/warehouse.ts`, `warehouseOps.ts`, `warehouseSectors.ts`; `tests/sectors.test.ts`, `sectorStep3.test.ts`, `warehouseS2Light.test.ts`; `scripts/e2e-sectorops.mjs` (SECTOR_SHOTS deck shot -> `shot('s3-deck', 16.8, 3.3, 12.6, PI, 0.3)`, data only).
New: `src/world/maps/warehouseS3.ts`, `tests/warehouseS3Light.test.ts` (11 tests, maxima per class, `WH3LIGHT_PRINT`), `docs/warehouse-s23/LIGHT-S3.md`, this report.

## Tests changed and why
- `sectorStep3`: section 3 rooms = `S3_ROOMS` ids.
- `sectors`: new "section 3 (warehouse-s23)" test (9 guards, first four kinds, stand and exit free, rooms, objective in `prodOffice` at y 3.3, exit in `fireLobby`, route obj points free at 3.3); phase drift now runs all three sections.
- `warehouseS2Light`: removed the 0.90 / 0.85 maxima for the C3 far door, C3 checkpoint and the (-1, 15) route ends: they now read 0.47 / 0.48 and the route ends in READ-CAP (the bake allows KEY-CAP). The two old deck points y 2.6 moved to the deck, y 3.3.
- S1 light test untouched, green.

## Results
- `npx tsc --noEmit`: clean. eslint on 8 changed .ts files: clean (the .mjs is ignored by the config).
- vitest: sectors + sectorStep3 33 passed; with sectorRecord, rooms, voxelFit, lampBake, warehouseS1Light, warehouseS2Light, warehouseS3Light, sectorRestart: 99 passed, 3 skipped (the print tests). Also losParity, detailPass, missions, editor/night, nav, lightField, lights: 64 passed. The plain Warehouse 318 / 14 / 5 passes.
- Scratch harnesses deleted from `tests/`. Not run: build, check, e2e.

## Engine findings
- **Nav door gaps**: with `cell` 0.5 and agent 0.32 a gap needs a cell centre in [edge + 0.32, edge - 0.32]; a 1.1 gap passes only when it falls on the grid's phase (S1 / S2 did by luck). 1.2 always passes. Applies to any new door, fence gate or window-less opening.
- **voxelFit**: a solid piece flush with the perimeter above the plinth, or a visual box flush on a solid face, fails the probe (cladding troughs; the visual is "solid" in voxels only). Keep 5 cm off the perimeter, set visuals into the face.
- The 0.5 m nav proxy needs no Havok: a top-face raycast model of `sampleLayers` over the boxes reproduces layers (office column: floor, deck 3.3, office roof 6.0 = 3).
- A lamp lights what is under it only through open doorways (the C3 far doorway is lit by the office ceiling lamp, not the floor lamp south of the wall).

## What Michael should try
`SECTOR_SHOTS=<dir>` shots (deck). In play: C3 -> floor, the stair to the deck, the stair-head laser, the pallet gate and the forklift, the production office door (clerk at his desk), the window and the duct crawl (plant room grate -> office grille), the main and header from the plant roof, the walkway ladder, the lobby hatch and the extraction; the east cam and the cage gate.

## Draft STATE Done line
2026-10-20 S3 greybox: section 3 (assembly hall, mezzanine, production office, plant room, fire lobby, crane walkway) built to BUILD-S3, `assemblyHall` option, 42-lamp pass in the bands, door gaps 1.2 for the nav grid; tsc, eslint and the sector / light / voxelFit / rooms Vitest green; check and e2e-sectorops pending.
