# LR16dx: warehouse lamp moves, fix round (Opus)

Base: e8cc0eef (lr16int c7a26ca7 + lr16dw 0cdee9f1). Michael: lamps paint hard arcs on nearby walls; "light positioning
needs to be improved"; "Must be realistic depiction of light". Status: DONE (tsc clean; 9 of 12 related vitest files pass, the 3 map light-level files fail the same 11 tests as on the base lamp data (LR16g); the full audit leaves 3 flags, all decided).

## Audit rule fixes (`src/world/lampAudit.ts`, `scripts/lamp-audit.mjs`)

- **Reach**: a face beyond the lamp's reach (`LightDef.radius`, the authored radius x 1.6) is never lit by it, so the flag
  reads `min(WALL_NEAR, reach)`. A dead fitting (intensity 0, reach 0: drawn dark, never lit, no circuit) is never
  flagged (was: ops 81, 116, and the dead fittings LR16dw moved).
- **Signs / emissive wall fittings** (`isEmissive`: a wall fitting in exit-sign green, which the script marks, or one
  reaching <= `SIGN_REACH` 1.2 m): never moved off their wall or door. When the glow reaches a face, the proposal is `dim`:
  the reach (and authored radius) that stops `DIM_MARGIN` 0.05 m short of it.
- **No two proposals on one spot** (`auditAll`, `crowds`): lamps are audited in table order; a target keeps `SPACING`
  1.0 m in plan from every other lamp (one moved earlier: at its target) and `FIT_GAP` 0.3 m between the fittings' bodies
  (`foot` = fixture sx / sz, so two 1.2 m strips cannot overlap).
- **Only as far as needed, never past the centre line**: after a failed push, the smallest 0.05 m step toward the
  room's centre line that clears (was: straight to the centre line); a step past the line is refused; when the centre
  line lies behind the lamp (the flagged face is a low unit or a wall top, not the wall across the room) the row is
  `none`, re-site by hand (was: the lamp moved toward the face, ops 20 -> z -13.4).
- **3D face distance** (`faceDrop`): a face a tilted scan ray meets below the lamp counts at its top edge
  (`hyp(plan distance, drop to the solid's top)`); a full-height wall is unchanged. The near radius is 3D: a cabinet
  1.65 m under a panel is not a wall 0.8 m away (that reading blocked ops 120 / 123 / 122 / 125 and flagged ops 20 / 71).
- **Push with the centre line behind the lamp**: the plain push is no longer refused as "past the centre line" when that
  line lies behind the lamp (a low face); only a positive centre line limits the step.
- Unit tests (`tests/lampAudit.test.ts`, 6 new): sign dim and no push; reach and dead fitting; low unit vs full-height
  face; two lamps off opposite walls of a 3.35 m room keep SPACING; strip bodies crowd; smallest step and never past
  the centre line.

## Moves (this round)

| Map | Id | Where | Before | After | Why |
|---|---|---|---|---|---|
| warehouse | 11 | warehouse.ts:35 `LAMP_MOVED_Z` | z 10.09 (LR16dw) | z 3.8 | the (9, 3) strip hung 0.82 m off the crane girder's face (z 2.17, y 4.8-5.2); z 3.8 clears it and the (10, 5) pillar by 1.1 m and keeps 5.2 m to the lit (9, 9) strip (10.09 was 1.09 m from it) |
| warehouseOps | 20 | warehouseS1.ts plantDeck | [3, -14.6] | [4.2, -15.15] | joins its row (18, 19, 21 at z -15.15); x 3 on that row sits 0.48 m over the plant unit's corner (x 0-3, top 5.1): 4.2 is 1.29 m off it; the audit's z -13.4 put it over the void 0.25 m off the corridor wall's top |
| warehouseOps | 34 | warehouseS1.ts charging | [-10.2, -6.24] | [-8, -6.24] | the bay sign hung 0.16 m off the parked forklift's back (top 2.2); slid along its z -6 wall, between the forklift and the charger (1.6 m clear) |
| warehouseOps | 71 | warehouseS2.ts cage | [-22.2, 13.4] | [-22.2, 14.4] | it overlapped aisle A1's strip at (-21.4, 13.5) (0.8 m apart, bodies crossing); the audit's x -21.7 push would put it 0.3 m off that strip; z 14.4 is 1.2 m in plan from A1's strip and 1.8 m from the other cage strip. Tried z 14.8 (S2 light test): no slot-cap failure either, but the cage's south end reads darker (stock ladder rack top 0.28 vs 0.31, R2[13] 0.28 vs 0.31), so 14.4 stays |
| warehouseOps | 75 | warehouseS2.ts storage | [-4.45, 6.08] (LR16dw) | [-4.45, -5.2], radius 0.6 -> 0.3 | the charger indicator back on its wall over the charger; its glow (reach 0.96) reached the z -6 wall 0.65 m off: reach 0.48 now |
| warehouseOps | 132 | warehouseS3.ts deck sign | [22.15, 14.05] (LR16dw) | [22.7, 14.05], radius 0.6 -> 0.3 | the stair-head exit sign back centred over the stair (x 22.1-23.3); the duct at x 23.35 is 0.65 m off: reach 0.48 now |
| warehouseOps | 120-125 | warehouseS3.ts prodOffice | 120 / 123 both (17.6, 16.33), 121 (20.4, 15.85), 122 (23.2, 15.4), 124 (20.4, 16.33), 125 (23.2, 17.1) | a regular 3 x 2 grid: x 17.85 / 20.4 / 22.95, z 15.7 / 16.95 (same order, radius, intensity) | the room is x 16.15-24.0, z 14.65-18.0; every panel 1.05 m off the walls, 2.55 m and 1.25 m apart, no shared spot |

`tests/warehouseLamps.test.ts` "regular grid": `LR16D_MOVED` reads 20 and 71 at their grid cells; the production office
is a regular grid again, so its entries are gone.

## `none` rows (LR16c) decided

- 34: hand slide along its wall (above).
- 44 (mess panel): stays. The mess is 1.7 m deep (z -10.65 to -8.95): no spot is 1 m off both long walls; the centred
  panel (0.85 m each side) is the realistic one. The one documented flag.
- 81 (hall strip, (23.2, -2.6)) and 116 (parts store panel, (14, 12.8)): dead fittings (intensity 0), drawn dark and
  never lit: no light reaches a wall; they stay on their grids (the audit no longer flags them).
- 122, 125: re-gridded with the production office (above).
- bunker 13 (push dz +0.58) and 15 (shaft 2.29 m across, centred still 0.92 m): Fallow is parked behind `?legacy=1`
  (no new work on parked maps); they stay, the push is valid if Fallow returns.
- The decided rows live in `scripts/lamp-audit.mjs` (`DECIDED`): the audit marks them in the flagged table, counts them
  (Decided column) and lists them with the reason, so a re-run keeps the record.

## Audit rerun (full, `npm run lamp-audit`, 199 s)

`docs/sector-redesign/checks/lr16-lamp-audit.md` rewritten. Flags: warehouse 0 (was 2), campusOps 0 (was 26: cleared by
the reach and 3D face-distance rules), warehouseOps 1 (was 28: 44, decided), bunker 2 (was 4: 13, 15, decided), embassy 0
(was 1), every other map 0. No push, centre or dim row left to apply. Framing counts barely move (warehouse no pool 343 ->
340, warehouseOps 285 -> 299, campusOps 3098 -> 3119): the levels are LR16g's.

## Tests

- `npx tsc --noEmit`: clean.
- `npx vitest run --maxWorkers=2` on lampAudit, warehouseLamps, lampGridLossless, sectorStep3, sectors, smoothWorldLight,
  warehouseCoopS1-S3, warehouseS1Light-S3Light (every test importing the touched map files): 9 files pass; 144 passed,
  11 failed, 3 skipped.
- The 11 failures are the known LR16a / LR16b map light levels (lit enough, not lit to a guard, dark pockets, pockets
  +0.05: S1 4, S2 3, S3 4), level tuning for LR16g. Same 11 tests fail with the base (e8cc0eef) lamp data in the four map
  files; S1 and S3 failing spots are identical, S2 differs only round the cage (71): R2[8] 0.38, R2[13] 0.31 and the W0N
  rack top 0.31 now under 0.4, R1[4] / R1[8] (-22.4, 11.2) no longer over 0.55. The slot-cap test ("no 2 m column has more
  lamps in reach than the shaders list") passes in all three.
- No e2e, GPU, build or `npm run check` (brief).

## Fix round (Opus, after the checker FIX `lr16dx-check.md`)

What changed:
- **Blocking 1** (`warehouseS3.ts:135` partsStore): 115 back to (10, 12.8) and 118 back to (22, 12.8), the row of four
  panels at z 12.8 again (115 at z 12 hung 0.155 m past the deck slab over the open hall). Both dropped from
  `LR16D_MOVED` (`tests/warehouseLamps.test.ts`). Neither flags under the dx rules (115: 1.03 m, 118: dead).
- **Blocking 2** (`warehouseS2.ts:139` northA): 62 back to (-12, 6.9), in line with the cross-aisle row; dropped from
  `LR16D_MOVED`. Its "wall" was a 0.05 x 0.05 m post.
- **Polish 1** (`src/world/lampAudit.ts`): `THIN` 0.15 m. A solid whose world plan bounds are under `THIN` on both axes
  (a post, a pipe, a hanger; a cylinder under 0.15 m across) is `Prepared.thin`; `cast(..., skipThin)` sees through it,
  and only `nearestWall` passes `skipThin` (the ceiling, drop, push-block and framing casts still hit it). Unit test
  "a thin post is not a wall" (`tests/lampAudit.test.ts`: a 5 cm post 0.45 m off the lamp is not flagged, a 0.2 m pier
  there is at 0.35 m, a plain ray still stops on the post).
- Other polish items untouched (LR16g / later).

Tests:
- `npx tsc --noEmit`: clean.
- `npx vitest run` lampAudit, warehouseLamps, warehouseS1Light-S3Light (`--maxWorkers=2`): lampAudit (16) and
  warehouseLamps pass; 11 failed, 47 passed, 3 skipped. The same 11 tests fail with the base c7a26ca7 map data
  (warehouse, S1-S3 swapped in, run, restored).
- Failing items vs base c7a26ca7, line by line: identical except
  - new on head (the 3 accepted cage spots, lamp 71, LR16g): S2 "lit enough" R2[8] (-18.75, 13.5, 4) 0.38, R2[13]
    (-23.45, 11.4, 4) 0.31, rack top W0N 0.31;
  - gone on head: S2 "lit to a guard" R1[4] and R1[8] (-22.4, 11.2) (0.73 on base);
  - the rest are the same items with values moved (largest: S3 pocket "the east bay by the plant room" 0.40 -> 0.54,
    lamp 87, polish 3; S2 cage-side reads +-0.08 from 71). S3 R1[6], R3[6] and packing end and the S2 route
    items the checker listed (R2[4], cross aisle middle, A2 middle, ladder foot R2N 0.17) are back to their base values
    (S3: R1[6] passes, R3[6] 0.78 and the packing end 0.83 as on base; S2: R2[4], cross aisle middle and A2 middle
    pass, ladder foot R2N 0.43 as on base).

Audit (`node scripts/lamp-audit.mjs --json --no-views --map=warehouse,warehouseOps`): warehouse 0 flags, warehouseOps
1 (44, decided). 62 not flagged (nearest wall 2.05 m: the post is seen through), 115 not flagged (1.03 m), 118 not
flagged (dead fitting, 0.95 m). `lr16-lamp-audit.md` is not rewritten by this partial run; the next full
`npm run lamp-audit` picks up the thin rule.
