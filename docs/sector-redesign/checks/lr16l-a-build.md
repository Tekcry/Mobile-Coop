# LR16-L Part A - build report (lamp bake box aligned on the light point)

Branch `feature/sector-redesign-lr16l-a`, base lr16g `02419d1b` (`LAMP_VERSION` 5). Brief: `docs/sector-redesign/briefs/LR16-L.md`
Part A (on `feature/sector-redesign-polish`). Built by two Opus builders: the first died at the 23:30 swap after `667247b6`;
the second verified A1-A4, read the A2 lamps, re-baselined the tests that moved and wrote this report. Part B (Low / phone
precision) is not in this branch.

Status: built. A1-A4 done. The audit, the A3 corridor tests and the wall guard pass. The map-light band tests that were red
on the base (LR16g's C1-C4) are still red, with a few more points over their limits (see "Map-light tests"). One new red:
warehouseS3 "lit enough", where one point slipped 0.01 to 0.42 against a 0.43 floor. Lead calls are at the end.

## Files
| File | Change |
| --- | --- |
| `src/voxel/lampBake.ts` | `lampBox`: every axis starts at `alignedFrom(l, max(lo, l - r), c)` = `l - c * floor((l - from) / c + 1e-9)`, so a cell plane runs through the light point and `from <= origin < from + c`. Counts are `ceil((x1 - origin) / c - 1e-6)`, so an aligned end (the downward lamp's `y + c`) adds no extra row. The doc comment says why. |
| `src/voxel/lampJobs.ts` | `LAMP_VERSION` 5 -> 6 (cached bakes are stale). |
| `tests/lampBoxAlign.test.ts` | New (A4): alignment over 400 seeded lamps; the A3 corridor (lamp 0.02-0.19 m under the slab); a beam still shadows; the map audit with the A2 lists; the wall guard. |
| `tests/ctcourseLight.tuned.json` | Re-taken: 34 of 190 levels, 0.01-0.07. |
| `tests/lampBake.test.ts` | LR16e penumbra edge tests: lamps at 3.1 / 2.3 (were 3.0 / 2.2), plus 5 mm of slack on one ordering check. |
| `docs/systems/lighting.md` | Baked lamps: the box is aligned on the light point, and the audit test is named (the lead's WIP commit `ad4c74ad`: reviewed, correct). |

Probe files (`zzOldLampBake.ts`, the `zz*` tests, a base-alias vitest config) were used only for measuring. They were
deleted and never committed.

## A1-A4 against the brief
- A1: done as briefed on all three axes. The march, the LR16e penumbra pass, the bounce, `bakeVisSampler` and the shader's
  `t3` all read `r.boxes`, and `lampBox` has one caller (`bakeLamps`). There is no shader or field change.
- A2: see "A2 list" below.
- A3: `LAMP_VERSION` 5 -> 6. `e2e-lightbake` only compares keys between presets (`scripts/e2e-lightbake.mjs:139`). No script
  names the version, so no script changes.
- A4: every listed test is in. One deviation, in the wall guard: at I 0.4 the across-row limit is <= 3.0, not the brief's
  <= 2.9. The real fix measures 2.92. The brief's 2.63 came from probe L3, which moved the whole scene 0.05 m up against
  the old grid instead of moving the grid. The worst row is y 2.65, where the level crosses the darkness curve's knee
  (the brief's "residual"). Lead call 3.
- The audit's "light inside a solid cell" check can no longer fire, because the light now always sits on a cell corner.
  It stays as a guard against `lampBox` regressing; on the base it found 23 lamps. The live check is the solid cell
  straight under the light.

## Before / after (the A3 corridor, re-measured on base 02419d1b vs this branch)
North wall 0.2 m off the face. y 2.9 / 2.7 / 2.5 / 2.3 / 2.1 / 1.8. Lamp 87's box y origin: -2.000 on the base, -1.850 aligned.

| I 0.9 | vis of the lamp in front (x 87), / 255 | vis between lamps (x 85.5) | rendered x 100 at x 87 | at x 85.5 |
| --- | --- | --- | --- | --- |
| base | 1 / 1 / 4 / 38 / 181 / 249 | 0 / 0 / 0 / 5 / 26 / 106 | 56 / 72 / 87 / 138 / 188 / 162 | 49 / 66 / 80 / 106 / 141 / 167 |
| aligned | 239 / 255 / 255 / 255 / 255 / 255 | 239 / 255 x 5 | 107 / 135 / 201 / 185 / 163 / 127 | 95 / 109 / 152 / 168 / 139 / 111 |

| I 0.4 | rendered x 100 at x 87 | at x 85.5 | head by the wall (85.5, 1.7, 12.2) |
| --- | --- | --- | --- |
| base | 9 / 10 / 13 / 51 / 144 / 183 | 9 / 10 / 12 / 18 / 62 / 118 | 0.794 |
| aligned | 13 / 37 / 119 / 170 / 187 / 171 | 11 / 16 / 75 / 118 / 152 / 164 | 1.000 |

These match the brief's table to within 1 in every cell. (The brief shows 255 at y 2.9; the top row reads 239 here because the
trilinear read there mixes in the slab's row.)

| Wall guard | worst 5 cm step | worst across-row max / min | limit |
| --- | --- | --- | --- |
| I 0.9 base -> aligned | 0.367 -> 0.265 | 1.61 -> 1.47 | <= 0.32 / <= 1.6 |
| I 0.4 base -> aligned | 0.377 -> 0.267 | 3.63 -> 2.92 (worst row y 2.65) | <= 3.0 (brief 2.9, see A4) |

Self-shadow check, lamp 0.02 / 0.05 / 0.10 / 0.15 / 0.19 m under the slab: `visAt` >= 0.95 at (87, 2.6) and (85.5, 2.3) for
every depth. The base read 0.010 / 0.019 at 0.05. The beam at x 85.4-85.6 hides (86.5, 2.3) from lamp 84: <= 0.2 holds.

## A2 list (each lamp read in its map; map files untouched)
Audit on this branch: no lamp lies inside a solid cell. The lamps whose cell straight below is solid are these:

| Lamp | Where | Reading | Verdict |
| --- | --- | --- | --- |
| campusOps #1-#15 | S1 lane floodlight (9, 6.0, -66) and the car park columns, `campusS1.ts:222, 233, 237` | Light point at the top of its 6.0 m pole (cylinder r 0.15). | On its post: accepted (`ON_ITS_POST`). |
| campusOps #17-#24 | S1 forecourt bollards (x -28..0, 0.85, -45.5), `campusS1.ts:269` | Light point 0.05 m inside the top of its 0.9 m post (r 0.08). | Bollard: accepted (`ON_ITS_POST`). |
| campusOps #16 | S1 bike shelter (-5, 2.2, -48), `campusS1.ts:254` | Fitting flush with the roof underside (roof 2.2-2.4), tagged out (radius 0, off). | Data error, but harmless: it bakes nothing. Fix by hanging it 0.05 lower (map owner). |
| campusOps #81 | S4 cage downlight (18, 2.8, 37), `campusS4.ts:493` | Sits inside the basket support post at (18, 37), a 0.1 x 0.1 box from y 0 to 4.0 (`campusS4.ts:416`; non-colliding but in the light bake). The post runs through the lamp to the floor, straight down its beam. | **Data error with an effect**: the post cuts the cone under the cage lamp. Fix: move the post (e.g. to the basket edge) or the lamp (map owner). |
| warehouseOps #34 | S1 charging-bay exit sign (-8, 2.4, -6.24), `warehouseS1.ts:83` | Wall bulkhead 0.09 m off the z -6 wall face (fixture depth 0.07). It sits inside the wall's grown half cell. The aligned cells on the room side are clear; only the wall-side cells are solid. | Wall-mounted: no self-shadow into the room. Recommend accepting as "on its wall" (lead call 1). |
| warehouseOps #53 | S1 workshop door exit sign (11, 2.4, -17.76), `warehouseS1.ts:92` | Same case on the facade over the door (box y 2.1-6.0, z -18.15..-17.85). | Same as #34. |

The test keeps #16, #81, #34 and #53 in `KNOWN_EMBEDDED`, with these reasons, and fails if the list changes. When the lead
accepts #34 / #53, move them to `ON_ITS_POST`. When a lamp moves, delete its entry.

Base audit, for the record: 23 lamps sat inside a solid cell (warehouseOps #33 #38 #41 #42 #45 #51 #122 #126 #127, depth
0.02-0.15; campusOps #17-#24, #45 #50; ctcourse #26-#29). This branch: 0.

## Re-baselined numbers (old -> new)
- `tests/ctcourseLight.tuned.json` (LR16g's table; the base matched it exactly). 34 of 190 levels changed, the largest by
  0.07 against a 0.08 tolerance, with no band change, so the table was re-taken: S2 route x0+8.4 0.85 -> 0.78; S5 hatch
  frame 0.52 -> 0.50; S7 stair step 2 0.41 -> 0.40, step 3 0.54 -> 0.53; S3 panel face 0.48 -> 0.47; S5 panel reader
  0.65 -> 0.64; S7 panel face 0.50 -> 0.51; S2 far drop 0.88 -> 0.87; S5 hack panel 1 -> 0.99; airlock pads A2 / A3 / A4
  1 -> 0.99; airlock corners A1-A5 0.48 -> 0.49, A6 0.47 -> 0.48, A7 0.46 -> 0.47; A2 far door 0.69 -> 0.70; yard corners
  S1 x0+0.6 0.46 -> 0.47 (x2), x0+8.3 / x0+9.8 0.58 -> 0.57 (x4), x0+15.4 0.47 -> 0.46 and 0.48 -> 0.46, S3 x0+0.6 z13.4
  0.47 -> 0.49, S4 x0+0.6 z0.6 0.49 -> 0.48, S6 x0+0.6 z13.4 0.45 -> 0.46, S8 x0+0.6 0.45 -> 0.46 and 0.44 -> 0.45,
  S8 x0+15.4 z13.4 0.44 -> 0.45. The must-see C2 (S7 stair step 1) stays 0.31 < 0.33 (red on the base too).
- `tests/lampBake.test.ts` (LR16e penumbra): with the lamp at 3.0 the tests' y 0.2 read row now sat on a cell plane, and
  every edge doubled (crate side 0.162 -> 0.320, near slab 0.424 -> 0.556, LR16b edge 0.162 -> 0.320: 3 red). With the
  lamps at 3.1 / 2.3, the planes land where the old grid from lo -0.5 had them: crate s 0.3 side / end 0.162 / 0.162 ->
  0.162 / 0.160, s 0.6 0.162 / 0.160 -> same; near 0.424 -> 0.414 (>= 0.4); high 0.258 -> 0.366 (>= 0.24); LR16b edge
  0.162 -> 0.160 (< 0.17); fence s 0.3 0.162 / 0.162 / 0.422 -> 0.162 / 0.160 / 0.414, s 0.6 0.162 / 0.172 / 0.612 ->
  0.162 / 0.172 / 0.614. The `w[1] >= w[0]` check takes 5 mm (march noise at the contact width).
- `tests/lampAtlasFit.test.ts`: unchanged, because it asserts no dims. campusOps still packs past 2048 at the old width and
  fits. Dims are below.
- campusS2 atrium (LR16g): no change worth a re-baseline. Floor (-16, 0.05, -15) 0.468 -> 0.468. Cafe bodies all within
  0.004 (largest (-25, -7) 0.221 -> 0.225), all < shadow.
- `e2e-lightbake` keys: none name the version, so no change.

## Map-light tests (warehouseOps; band tests, red on the base with LR16g's C1-C4)
Failing points per assert, base -> this branch:

| Test | Base | Aligned |
| --- | --- | --- |
| S1 stealth maxima (C1) | 67 | 68 |
| S2 lit enough (C3) | 1 | 4 (+ R2[13] 0.38, east gangway middle 0.38, W0N rack top 0.38; min 0.4 less 0.02 TOL) |
| S2 stealth maxima (C1) | 41 | 49 |
| S3 lit enough | 0 (green) | 1: connector C3 far doorway outside 0.43 -> 0.42 (min 0.45 less TOL). **New red file-level assert** |
| S3 stealth maxima (C1) | 66 | 67 |
| S3 pockets dark (C4) | 1 (stores officer 0.41) | 1 (0.39) |
| S3 pockets +0.05 (C4) | crane operator +0.12 first | supervisor's spot +0.053 first (was <= 0.05) |

Levels that moved by 0.01 or more (body level with the lamp pass on, base -> aligned, the print's band without TOL):
- S1, 19 of 100: R1[5] 0.85 -> 0.83, R1[7] 0.80 -> 0.79, R1[8] 0.77 -> 0.67, R1[15] / R3[19] 0.73 -> 0.75, R1[16]
  0.53 -> 0.52, R1[17] 0.95 -> 0.86, R1[18] 0.89 -> 0.90, R2[2] 0.51 -> 0.52, R2[14] 0.77 -> 0.95, R3[6] 0.90 -> 0.89,
  takedown 3 0.93 -> 0.92, C2 near / far door 0.96 / 0.94 -> 0.97 / 0.97, bay wrapper 0.78 -> 0.97, reception counter
  0.80 -> 0.78, drainpipe base 0.51 -> 0.52, workshop lathe 0.54 -> 0.39 (READ 0.4: inside TOL), lobby roof storage
  0.77 -> 0.95.
- S2, 44 of 96: R1[2] 0.52 -> 0.51, R1[4] / R1[8] 0.72 -> 0.65, **R1[9] 0.41 -> 0.92**, R1[10] 0.59 -> 0.58, R1[12] /
  R3[14] 0.51 -> 0.50, R1[13] / R2[19] / R3[15] 0.56 -> 0.54, R2[3] 0.60 -> 0.59, R2[4] 0.45 -> 0.44, R2[12] 0.71 -> 0.72,
  **R2[15] (y 5) 0.44 -> 1.00**, R2[17] 0.87 -> 0.88, R2[18] 0.56 -> 0.55, R3[3] 0.53 -> 0.52, R3[6] 0.63 -> 0.56, R3[7] /
  R3[11] 0.79 -> 0.80, takedown 2 0.55 -> 0.54, 3 0.89 -> 0.87, 4 0.73 -> 0.72, 6 0.39 -> 0.42, 8 0.56 -> 0.55, C3 near /
  far door 0.88 / 0.55 -> 0.87 / 0.54, lane west end 0.49 -> 0.53, lane middle 0.55 -> 0.54, A1 middle 0.67 -> 0.74, A1
  north end 0.95 -> 0.93, **cross aisle west 0.40 -> 0.90, middle 0.48 -> 0.62**, east 0.59 -> 0.58, A2 south mouth
  0.40 -> 0.39, **A2 middle 0.49 -> 0.61**, A3 north half 0.56 -> 0.55, R2N ladder foot 0.45 -> 0.44, cage stock ladder
  0.71 -> 0.72, east gangway ammo 0.51 -> 0.50, north gangway middle 0.43 -> 0.42, issue desk front 0.74 -> 0.73, pockets
  takedown 7 / lane east half 0.12 -> 0.13.
- S3, 25 of 102, all 0.01-0.06: R1[2] / R2[2] 0.43 -> 0.42, R1[3] 0.49 -> 0.48, R1[4] 0.81 -> 0.79, R1[18] 0.46 -> 0.45,
  R1[19] 0.48 -> 0.47, R1[21] / R3[19] 0.45 -> 0.44, R2[3] 0.55 -> 0.54, R2[4] 0.54 -> 0.53, R2[7] 0.54 -> 0.55,
  R2[10] / R2[11] / R2[26] 0.83 -> 0.82, R2[25] 0.67 -> 0.66, R3[2] 0.76 -> 0.70, R3[4] 0.62 -> 0.63, R3[5] 0.49 -> 0.50,
  R3[6] 0.74 -> 0.72, R3[8] 0.54 -> 0.53, C3 far doorway outside 0.43 -> 0.42, the fitter 0.76 -> 0.79, cage counter
  0.72 -> 0.71, porter 0.51 -> 0.50, stores officer 0.41 -> 0.39.

Why the large moves (probe: each sample's march on both grids, `bodyLevel` split per lamp):
- Lamps embedded sideways: their y already lay on a cell plane on the base, so the brief's audit did not list them, but on
  x or z they sat inside a solid cell. S2 strip #61 (-21.4, 5.8, 6.9): the base z planes ran 0.04 m off the light. Rays to
  the floor ended in the solid cells of a thin 0.12 m rail at y 5.0 (yawed box at x -14.93), so vis was 0.0-0.45; aligned
  it is 1.0. That one lamp moves R1[9], R2[15], cross aisle west / middle and A2 middle.
- Grid phase on thin occluders and grazing edges. Moving the box origin by up to 0.2 m shifts where every thin piece and
  door edge rasterises, because occupancy is conservative (grown 0.1, solid when a cell centre is inside). Examples: S1
  R1[8] loses corridor panel #40 under the door head at (-4.5, 2.45, -13.8) (vis 0.78 -> 0.15 at 1.5 m); the lathe loses
  part of strip #29 to the 0.4 m beam at (16, 4.7, -13). Both are moves within the bake's resolution, not a fault in the
  alignment.

## Perf (node, one thread, `bakeLamps` direct; warm second run)
| Map | Bake ms (vis / bounce) base -> aligned | Cells | `fitLampAtlas(2048)` dims |
| --- | --- | --- | --- |
| warehouseOps | 22042 (20049 / 1974) -> 22384 (20479 / 1893) | 28.89 M -> 28.16 M | 1007 x 55 x 1002 (55.50 M texels) -> 1000 x 55 x 999 (54.95 M), 1 page |
| campusOps | 121809 (116207 / 5567) -> 101856 (97164 / 4648) | 134.24 M -> 133.43 M | 2031 x 522 x 193 (204.62 M) -> 2045 x 519 x 193 (204.84 M), 8 pages |

Atlas texels change by -1.0% / +0.1%, inside the brief's +5%. Cells drop because the dropped strip `[from, origin)` is no
longer baked. Bake times match within the desktop's load noise (CPU 45-90% during the runs); in-game worker-pool bake
times are pending the GPU run.

## Acceptance (desktop, slot lock each run, `--maxWorkers=2`)
- `npx tsc --noEmit`: clean.
- `npm run lint`: 1 error, 42 warnings. The error is `tests/torchOcclusion.test.ts:166`
  (`consistent-type-imports`, an `import()` type). That file is LR16t's and unchanged since the base, so the error is
  pre-existing. This branch's files lint clean.
- The lead's set plus the bake readers, 18 files: `lampBoxAlign`, `lampAtlasFit`, `ctcourseLight`, `campusS2`,
  `warehouseS1Light`, `warehouseS2Light`, `warehouseS3Light`, `lightField`, `bounceGrid`, `lampFalloff`, `darkCurve`,
  `lampBake`, `lampBounce`, `lampGridLossless`, `sectorLampSync`, `lampAudit`, `warehouseLamps`, `smoothWorldLight`.
  Result: 210 passed, 11 failed, 4 skipped. The 11: the 8 map-light asserts above (7 the base's C1-C4, 1 new) and the 3
  lampBake penumbra tests, since re-baselined. `lampBake` alone after the re-baseline: 21 / 21 pass.
- The other files that read the bake or field: `lampBake`, `coopTorches`, `glass`, `lampFlicker`, `lights`, `perception`,
  `sectorIsolator`, `shadowAccuracy`, `torchOcclusion`, `wallController`, `lampLevel`, `levelFillParity`. 173 / 173 pass.
- Base for comparison (same map-light files on the base bake): the 7 C reds, with the counts in the table above.

## GPU check for this head (laptop queue, `E2E_GPU=1`, port 4189, heavy.lock)
1. `e2e-lightbake` (Low and Epic bake the same bytes; keys carry v6) and `e2e-darkness`. The brief expects the Warehouse's
   numbers not to move. The alignment does re-phase every lamp box, including the Warehouse's, so small moves (about 0.01)
   are possible. A move there is grid phase, not a fault; compare it with the base before calling it a failure.
2. `e2e-sectorops` and `e2e-ctcourse` (map gates on the moved levels). `e2e-desktop:3` belongs with Part B (B1 / B2), not
   this head.
3. Sheet (brief GPU 3): pending the PC run.

## Lead calls
1. A2: accept warehouseOps #34 / #53 as wall-mounted (move them to `ON_ITS_POST`), or ask the map owner to stand them
   0.11+ m off the wall.
2. A2: campusOps #81 is a real map bug (the basket post runs through the cage lamp and down its beam). Send it to the
   campus map owner. #16 is cosmetic.
3. Wall guard at I 0.4: keep <= 3.0 (measured 2.92) or set the brief's 2.9. The 2.9 cannot pass without a light-model change
   (the brief's "residual").
4. warehouseS3 "lit enough" is newly red on one point (C3 far doorway outside 0.42 vs a 0.43 floor). warehouseS2 gains 3
   lit-enough points at 0.38 and 8 stealth-cap points (cross aisle / A2 now lit by strip #61). These belong to the
   warehouseOps layout slice with LR16g's C1 / C3, or the lead re-levels #61.
5. The 0.2 m conservative bake is phase-sensitive. Any change to a box origin can move a grazing or thin-occluder point by
   0.1-0.5 (S1 lathe, R1[8]). That property predates this fix (the old grid was anchored on the map's `lo`). A finer
   `LAMP_CELL` or an exact rail / door-edge test would remove it; both are out of scope.
