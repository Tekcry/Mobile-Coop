# Check - lamp fix round and section 3 greybox (warehouse-s23)

2026-10-20, fresh checker, read-only (light commands; build, `npm run check` and e2e are the job lead's).

## Commits checked
- `6f0ca54e` lamp fix round (check-s2 polish 1, 2, 5; `step-lampfix-report.md`).
- `597fa592` section 3 greybox (`BUILD-S3.md`; `step-s3-report.md`). Working tree clean.

## Commands and results
- `npx tsc --noEmit`: clean.
- `npx eslint` on the 11 changed .ts files (warehouse, warehouseOps, warehouseS1/S2/S3, warehouseSectors, sectors, sectorStep3, S1/S2/S3 light tests): clean.
- `npx vitest run` sectors, sectorStep3, sectorRecord, sectorRestart, rooms, voxelFit, lampBake, warehouseS1Light, warehouseS2Light, warehouseS3Light: 10 files, 99 passed, 3 skipped (the print tests).
- Scratch probe (scratchpad only): S1 lamps off / on at the C2 far doorway, door open: (-15, -5) 0.39 -> 0.47, (-14.5, -5.2) 0.40 -> 0.51; door shut and 0.5 m further in (-15, -4.5): no change.

## Findings by ask
1. **Lamp fix (polish 1, 5).** Done. S1 / S2 route, decision and takedown points 0.40-0.55, a new maximum test per class (`CAP` 0.55 asserted `< LIGHT.lit`), objective / work areas to 0.80, pockets still strict at 0.30 (no tolerance). S2 aisle band tightened 0.36-0.58 -> 0.40-0.55; S2 spot count unchanged (23 / 23). The S1 ORIGINAL_LIT exceptions are gone; the S2 C3 exceptions were removed in 597fa592 (now 0.47 / 0.48, in band). `Math.hypot` -> `hyp2` in the S1 test.
2. **Polish 2 (M8 margin).** Not achieved and reported honestly (20-seed worst: checker and tour guard 1.75 s; the committed seed passes). Its done-looks-like was conditional on Michael's walk and the lever is geometry; stays on the polish list.
3. **Weakened tests?** `TOL` 0.02 on every band edge relaxes the minima by 0.02 (READ 0.38, KEY 0.43) and the caps to 0.57, still under `lit` 0.6. Mild, logged; polish, not a weakening of intent. The S1 skip of (-15, -5): fair - it is light spill through the open C2 far door only (+0.08 open, 0 shut, 0 at 0.5 m further in), next to the already-excluded threshold point, and reads 0.47 (under CAP). The S3 deck-grip reading at 3.3 (R2[13] / R2[23], the main's north end over the slab, 0.57): fair - the body cannot hang into the slab, the next point is the drop onto the deck there, and 0.57 is under `lit`.
4. **Build vs BUILD-S3.** Guards (9, kinds, waits, faces, spots), routes, devices (cams 2/2/3, lasers 2/1/2, `levels.mezz` 3.3), switches, rooms, seeds, objective (22.4, 3.3, 17.3) and extract box match the sheet. Logged deviations sound: (a) three 1.2 m gaps round 1.1 leaves (office door, plant north door, cage gate) - a real nav-grid finding (0.5 cell, 0.32 agent); (b) duct 0.6 wide to x 23.95 and the entry grate 5 mm proud - voxelFit against the cladded perimeter (inner face 24.0); path points, grates and anchors unchanged; (c) lamps 1, 15, 27 moved / dimmed within the 8.4 ladder (lamp 1 +8 % not +15 %, logged); (d) `navLayers` left at 3 - the office column is floor / deck 3.3 / roof 6.0 = 3, proxy identical at 4. Accepted; e2e nav legs will confirm.
5. **Seal.** North and east parapets (y 6.0-7.5, noLedge) over the perimeter tops; the x -4 wall is section 2's 6.0 + parapet; the deck slab, office roof and walls are noLedge / overhead per sheet. Nothing new opens the shell (the east fire exit is a visual box). Seal on nav is e2e-sectorops' check (pending).
6. **Objective and extract on data.** `sectors.test` "section 3" asserts the stand (23.3, 3.3, 17.3) free, doors over 1.6 m, first-four guards over 1.8 m, extract centre free with no guard within 1.8 m, objective in `prodOffice` on 3.3, extract in `fireLobby`, route obj points free at 3.3. Green.
7. **Guards and M8.** 9 guards, first four enforcer / grunt / officer / runner, no heavy / sniper / dog (asserted). The static M8 test and the phase-drift test now loop all three sections; green with no ladder step.
8. **Light parity.** All 42 S3 lamps are `b.light` registry lamps in one loop, baked ("every new lamp is in the bake"), groups 50-54 / 57 on the sheet's six switches, 55 / 56 / 58 unswitched as the sheet. Column cap and bake-top tests pass for all three light tests. S1 / S2 lamp counts and circuits unchanged.
9. **Rules.** Plain Warehouse unchanged: every skip behind `ah` (default true), `wallX` passes `H` explicitly (= its default); 318 / 14 / 5 test green. No `Math.hypot` or `@babylonjs` import added (S3 imports `Vector3` from `core/babylon`); the changes are map data and tests, no hot path.

## Verdict: PASS

## Fix list (blocking)
None.

## Polish / watch list (not blocking)
1. **M8 margin (S2)**, carried from check-s2 polish 2: checker and tour guard 1.75 s worst over 20 seeds. Done looks like: after Michael's walk, if exposed, a pallet at the A1 mouth and the phase test green on seeds 1-5.
2. **5 cm slits.** The three 1.2 gaps round 1.1 leaves leave 5 cm at each jamb when shut, and the duct / office south wall stop 5 cm short of the east wall (y 3.3-5.8). Watch for light or sight through them; done looks like 1.2 leaves (hinge at the gap edge) and a thin filler at x 23.95-24.0 if a shot or a guard shows a leak.
3. **`TOL` 0.02 on the minima** lets READ / KEY points read 0.38 / 0.43. Done looks like: the minima strict again once the GPU walk settles the levels.
4. **S1 light test** still reads (12, 2.8, 14.1) and (15, 2.8, 14), now under the deck slab (S2's test moved them to 3.3). Done looks like: the same move in `warehouseS1Light.test.ts`.
5. The S1 fire lobby exit sign is gone (column cap); the C2 far door is lit by the lobby panel only. GPU look pending.
6. Pending as the reports say: `npm run check`, build, e2e-sectorops (nav legs at 3 layers, objective reach, seal, ghost run), the GPU walk.
