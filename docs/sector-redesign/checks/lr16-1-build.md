# LR16-1 build - one-bounce fill: walls and ceilings take the light their pools throw

Brief: `origin/cloud-queue:briefs/sector-redesign-LR16-1.md` (Michael ~18:08 "Must be realistic depiction of light",
~18:15 "a showcase no matter where you look"; CT audit gap 5). Branch `feature/sector-redesign-lr16-1`, base c7a26ca7.
Builder: Opus 5.5, 2026-10-23. Commits: 647d5e10 (bake, grid, field), 24b21b16 (picture), 70be1226 (tests), then this file.

## What changed
### Bake (worker, cached with the lamp bake)
- New pure `src/voxel/lampBounce.ts`:
  - `BOUNCE` (`:30`): albedo 0.35, reach 4 m, near 0.5 m, uplight 0.06, q 2^-15 (the brief's), plus `uplightBack` 1 m
    (`:43`, see deviation 1).
  - `bounceLamp` (`:112`): occupancy over the lamp box grown by the reach (whole 0.2 m cells, clipped to the map,
    `rasterise` + the bake's own conservative `occShapes`); patches = air cells with vis > 0 and an occupied
    6-neighbour, one per occupied face, `E = photoTerm x vis x max(0, n . L)` (LR16b's formula, the field's own cone and
    exponent); one VPL per 1 m ambient cell (flux `albedo x sum(E x A)`, flux-weighted position and normal); the
    downward lamps' uplight VPL (`:252`); splat to 1 m receivers (`:267`): `PHI x max(0, n . w) / (pi (d^2 + near^2))`
    x window `(1 - (d / reach)^4)^2`, omni receiver, x the share of 3 points (centre, +-0.3 m on the dominant axis) a
    march on the 0.2 m occupancy reaches (`clearPath` `:75`, endpoint cell included); `Uint16` steps of `q` per unit
    intensity in the receivers' tight box (`:343`).
  - `bounceGridDims` (`:58`): the ambient grid's alignment (origin floor(lo), whole 1 m cells).
- `src/voxel/lampBake.ts`: `LampResult.bounce` (`:46`, optional only for hand-made test results) and `ms` (`:48`, vis /
  bounce bake time); `bakeLamps` calls `bounceLamp` once per lamp right after `bakeOne` (`:147`). `bakeOne` untouched.
- `src/voxel/lampJobs.ts`: `LAMP_VERSION` 3 (`:14`); cache hit needs the bounce (`cacheOk` `:17`); the jobs' bounce
  joined in light order (`:65`). `voxelWorker.ts` is untouched: the bounce arrays are structured-cloned (copied), not
  transferred (73 KB on ctcourse, 225 KB on warehouseOps).

### Runtime (pure, gameplay-owned)
- New `src/world/bounceGrid.ts` `BounceGrid` (`:24`): `acc` Float64Array (sum of `q x round(intensity x 1024)` over lit
  lamps, exact integers), `g` Uint8Array (`round(min(1, acc x q / 1024 x LAMP_LEVEL_GAIN) x 255)`); `sync(reg)`
  (`:94`): one compare when `reg.version` did not move, else per lamp the wanted weight (lit as `lampInto`: on, not
  destroyed, intensity > 0; jam and EMP move `on`) against the applied one; a change adds the delta over that lamp's box
  and re-quantises only that box (`apply` `:120`), grows `dirty` (box union), bumps `version`. Boxes that do not fit
  the grid are dropped at construction. Allocation-free after construction. Also `packFillRG` (`:174`, the picture's
  RG texels) and `bounceColor` (`:201`, lamp colours by intensity, Rec. 709 luminance 1).
- `src/world/lightField.ts`: `readonly bounce` (`:124`) built and synced in the constructor (`:164`); `levelInto` adds
  the trilinear `g` read beside the ambient read (`:254`, same `triInto`, same cells); `bounceAt` (`:193`) public;
  `bounceInto` (`:339`) syncs first. Meter and guards follow.

### Picture
- `src/world/bakedLamps.ts`:
  - `BakeExtras.bounce` (`:40`); the fill texture is RG8 (`:272`): R ambient (unchanged), G bounce. Samplers unchanged.
  - `uploadBounce` (`:388`, from `frame`): sync, and when the grid's version moved re-pack only the dirty box and upload,
    at most every `BOUNCE_UPLOAD_MS` = 250 (`:62`). Written in the class header as light parity's one exception (the
    picture's bounce may lag a switch by <= 0.25 s; meter, guards and direct light never lag).
  - `NS_GRID2_GLSL` (`:734`, in `LAMP_GLSL`): R as `nsGrid` (1 outside the grid), G read with the coordinate clamped to
    the grid (= the field's clamped trilinear).
  - `level()` (`:955`): `nsFillL = nsAmbB.r` as before, `nsBounce = nsAmbB.g`, the curve level `nsS += nsBounce`.
  - Every lit material (`:1160`, after the fill block: level, `LAMP_SKY` boxes, voxels, bodies, props):
    `nsStat += nsBounce x lampMore.w x lampBounceC.rgb x surfaceAlbedo.rgb x nsBF` (nsBF is 1 except bodies / props
    under night vision). Standard-material path (`:1195`): the same term without albedo (that path multiplies after).
  - Uniform `lampBounceC` (`:863`, bound `:897`) from `bounceColor` at load.
- `src/world/world.ts:263`: `bounce: w.lightField.bounce` in the extras (same line as the other extras).
- `src/world/lightBake.ts`: not changed (the type lives on `LampResult`).

## Numbers (tests' fixtures)
Fixture (`tests/helpers/bounceRoom.ts`): room A 10.4 x 3 x 10 m and room B behind a 0.2 m wall (x 10.4..10.6, mid-cell),
one downward lamp at 2.8 m, intensity 1, radius 2.5 (reach 4 m), at x 7.45 so its pool (direct floor level over 0.28)
ends 1 m short of the wall.
| Check | Brief | Measured |
| --- | --- | --- |
| Ceiling over the lamp (field read 0.25 m under it, as the shader) | > 0.04 and >= 0.1 x floor (1.0) | 0.105 |
| Wall 1 m outside the pool edge, 1.5 m up (0.25 m off it) | total >= 0.2 x pool floor | 0.291 (direct 0.245, bounce 0.046) |
| Room B, 1 m from the wall | bounce <= 0.01 | 0.0000 |
| Room B, straddling cell | <= 0.03 | 0.0039 |
| Room with no lamp / map with no lamps | 0 | 0 / bounce grid inactive |
| Tall hall (floor past the reach), ceiling over a lamp 0.4 m under it | uplight only for downward lamps | 0.050 downward, 0.000 spot |
| Bake time, ctcourse (31 lamps, node, under load) | <= +25% | vis 13525 ms, bounce 2730 ms (+20.2%); quieter run 8270 / 1515 ms (+18.3%) |
| Bake time, warehouseOps (133 lamps, probe) | - | 14052 / 2936 ms (+20.9%) |
| Bounce bytes | - | ctcourse 73 KB, warehouseOps 225 KB (Uint16 + boxes) |
| Field boxing budget | 72 B / query | levelAt 68.0 B, bodyLevel 134.0 B (unchanged) |

Wall check by lamp radius (same fixture, lamp moved so the pool edge is 1 m from the wall): radius 2 total 0.82
(the wall is in its direct light), 2.5: 0.291, 3: 0.189, 3.5: 0.156, 4: 0.135, 5: 0.126. Reach 5 / 6 m moved the wall's
bounce only 0.041 -> 0.048 / 0.050 (radius 3). See open item 1.

## Tests (all PASS)
- `npx tsc --noEmit`: clean.
- `tests/lampBounce.test.ts` (new, 7): ceiling over a lamp is lit; wall beside a pool reads >= 0.2 of the pool; no
  bounce through a wall; no lamp, no bounce; uplight only for downward lamps; deterministic (and a lamp's bounce is the
  same baked alone or with others); bake time on the ctcourse fixture.
- `tests/bounceGrid.test.ts` (new, 8): switch off removes exactly that lamp's bounce (switch, shot, jam dark, EMP, all
  back = first bytes, vs an independent from-scratch sum); 1000 random toggles return to the same bytes (switch / shot /
  reset / intensity changes, checked against the scratch sum every 50); only the touched box is re-quantised (cell
  count, a poisoned byte outside it survives, dirty box union); sync is free when the version did not move (< 1 B per
  call); allocation-free (toggle + sync < 1 B per call); a lamp-free bake or a box past the grid is no bounce; the
  bounce tint; "(LR16-1) nsGrid2 green channel = field bounce" (the GLSL string, then the field's grid packed RG and
  sampled as GL samples a LINEAR / CLAMP_TO_EDGE 3D texture at nsGrid2's coordinate equals `bounceAt` to 1e-9 at 400
  points inside, on and past the grid edges; R stays the ambient bytes).
- `tests/lightField.test.ts` (16): the brute-force sum now adds the bounce (its own from-scratch integer sum and
  trilinear read); new "(LR16-1) level adds the bounce read trilinearly" (bounceAt = the shared trilinear of `g`;
  level = the bounce-free bake's level + bounce, clamped; a switched lamp's bounce goes at once and comes back to the
  byte); boxing budget unchanged (above).
- Updated for the bounce (level-equality assertions that assumed lamps alone): `tests/lampFalloff.test.ts` (one line:
  levelAt = GLSL lamp term + bounceAt), `tests/lampGridLossless.test.ts` (one line: levelAt = listed sum + bounceAt).
- Also PASS: lampFalloff (12), lampGridLossless (4), lampLevel, lampPluginGap, lampPluginClone, levelFillParity,
  smoothWorldLight, lampBake, lampAtlasFit, shadowAccuracy, editor/lightPreview, lights, perception, coopTorches, glass,
  sectorLampSync, sectorIsolator, wallController, enemyLightsOut.

### The map-light failures (not edited, LR16g)
15 -> 13. Base c7a26ca7 rerun here (same 4 files): 15 FAIL (ctcourseLight 4, warehouseS1Light 4, S2 3, S3 4). This
branch: 13 FAIL. Now PASS (2): "every route point, objective and key decision point reads lit enough to see" in
warehouseS1Light and warehouseS3Light (the bounce lifts them). Still FAIL (13, the same tests as the base, no new one):
ctcourseLight 4 (must-see spots, dark between pools, airlock lamps, tuned levels within 0.08), warehouseS1Light 3
(stealth maxima, dark pockets, pockets +0.05), S2 3 (lit enough, stealth maxima, pockets +0.05), S3 3 (stealth maxima,
dark pockets, pockets +0.05). The failing asserts' values move with the bounce (brighter); LR16g re-levels.

## Deviations from the brief
1. `BOUNCE.uplightBack` = 1 m (new constant): the uplight's cosine lobe is measured from a point one cell under its VPL.
   Why: a lamp hangs within a cell of its ceiling, so the 1 m receiver cell the ceiling sits in has its centre under the
   lamp; the brief's lobe from the VPL itself (normal +y) gives that cell 0 (tall-hall ceiling read 0.000, and 0.089 <
   0.1 x floor on the fixture with the floor bounce alone). With the offset the cells of the lamp's own layer and up take
   it, nothing a cell under. The uplight level (0.06) is the brief's. Surface VPLs keep the brief's lobe (offset 0).
2. The wall acceptance depends on the fixture lamp's radius, which the brief does not give. With the brief's constants
   the single bounce on a wall 1 m outside a pool is 0.04-0.05 for any radius (physical: albedo 0.35, the pool seen at
   a grazing angle); the total passes 0.2 x the pool only while the wall still gets direct light (radius <= ~2.5; the
   test uses 2.5). The brief's own check put the wall 2 m from the pool's middle; "1 m outside the pool edge" of a 3 m
   pool is 4 m, at the reach. Not raised: reach (5-6 m adds ~0.01), albedo or a multi-bounce factor (would lift every
   dark gap next to a pool; LR16g's call).
3. `LampResult.bounce` is optional (hand-made test results have none); `LampResult.ms` added (the bake-time log).
4. The 3 receiver points' march includes the endpoint's cell (a receiver point inside a wall counts as blocked) and
   starts 0.15 m out from a surface VPL, 0.25 m from the uplight (past the fixture's housing, as `bakeOne`'s
   `NEAR_LIGHT`).
5. `voxelWorker.ts` not edited: the bounce is copied, not transferred, from the worker (small: <= 225 KB).
6. No changelog fragment (the lead's; not in the brief's file list).

## Open items
1. Wall bounce is faint outside a pool's direct light (0.04-0.05 level): on screen that is near black under
   `DARK_DESKTOP`. If the sheets show walls beside pools still black, the levers are albedo (painted plaster 0.5-0.7),
   a multi-bounce factor 1 / (1 - albedo) = 1.54, or a per-map albedo; each lifts the dark gaps too (LR16g re-levels).
2. The floor next to a pool takes a large bounce (0.33-0.49 level under the fixture lamp at 0.25 m: an omni receiver
   0.5 m over a lit floor), so a body standing just outside a pool reads brighter than before. This is what moved the
   map-light tests; LR16g re-levels with it in.
3. The 1 m receiver cells: a wall in the middle of a cell gives that cell at most its lit side's share (1/3 to 2/3), and
   a surface read 0.25 m off a cell-aligned wall / ceiling takes 25% of the in-wall cell (0). Walls and ceilings away
   from cell boundaries read up to ~half their neighbours' bounce. Finer cells (0.5 m) would cost 8x bytes and splat.
4. Voxels on Epic already had their own GI bounce: they now take this one as well (the brief's "every lit material").
   Check for double bounce on Epic.
5. LR16e (penumbra) changes `vis` near edges: the bounce follows it on the merge (no code overlap; bake time +20% of
   whatever `bakeOne` costs then).

## GPU sheets (laptop) must look at
1. Wall + ceiling before / after: campus S1, warehouseOps Goods-in Bay, ctcourse station 2, the Workshop: the ceiling
   over pendants no longer black; walls beside pools take a faint glow (open item 1).
2. Shoot a lamp, switch a group off: the pool and its wall / ceiling glow go within 0.25 s, the meter drops at once.
3. Dark rooms between pools: still under the 0.28 line (meter) and dark on screen; a room behind a wall from a pool
   takes nothing (no bleed through walls, including thin ones).
4. Samplers unchanged (RG in the same texture); `e2e-lightbake` <= 16; bake time (+~20%) and MB (bounce <= 0.3 MB).
5. Night vision: walls not blown out by the bounce; bodies keep the fill cap (x nsBF).
6. Jammer flicker on a lamp: the bounce flickers at most every 0.25 s (upload throttle), the pool every frame.

## Fix round (check Blocking 1: bounce through walls off the cell middle)

Builder: Opus 5.5, 2026-10-23. Started from the cut-off agent's WIP (cc273698, kept: it follows the check's
recommended fix), finished it and added the check's test. Commits d795e27c (code + tests) and this report.

### What changed
- `src/voxel/lampBounce.ts:446`: a receiver cell takes a VPL's light only when the march reaches its centre (the
  3-point share is gone), so a cell a wall crosses holds its centre's side, never a share of the far side.
- `src/voxel/lampBounce.ts:63-80`, `:138` `bounceBits`: 16 static bits per 1 m cell from the bake's own conservative
  occupancy on 0.2 m sub-cells aligned to the grid (every lamp computes the same bits for a cell): bits 0-2 "a solid
  lies between this centre and the +x / +y / +z neighbour's centre" (the check's face bits), plus a 2-bit crossing
  code per direction (+-x, +-y, +-z): a point 0.15 / 0.3 / 0.45 m or more from the centre is past a wall inside the
  cell and reads the neighbour on its own side.
- `src/voxel/lampBounce.ts:481-502`: the receiver box is grown by one cell (clipped) so every corner a read blends
  carries its bits; `bounceLamp` returns `bits` beside `data`. `src/voxel/lampBake.ts:136-170` and
  `src/voxel/lampJobs.ts:31-32`, `:70-90`: the bits travel with the result and the cache (`cacheOk` rejects an entry
  without them).
- `src/world/bounceGrid.ts:38`, `:95`: the grid ORs the lamps' bits per cell (static). `:153` `sampleInto`: the home
  corner (the cell holding the point, crossed by the code), then a flood over the 8 corners through open faces, the
  trilinear weights of the reached corners renormalised; without walls it is the plain trilinear. Allocation-free
  (typed-array scratch, result in a field). `src/world/lightField.ts:349`: `bounceInto` reads it (meter and guards).
- `src/world/bakedLamps.ts:738` `NS_GRID2_GLSL`: the same steps in GLSL, 8 `texelFetch`es (G = bounce, B + A x 256 =
  bits); R stays one linear tap; the flood stops when nothing grows (field and shader alike). `:271-275`, `:401`: the
  fill texture is RGBA8 (was RG8; still one sampler; `packFillRGBA`, `src/world/bounceGrid.ts:292`).
- `src/voxel/lampJobs.ts:18`: `LAMP_VERSION` 3 -> 4 (cache format changed: the bits; the receivers changed too).
- Polish 3 (trivial, taken): `src/world/bounceGrid.ts:324` `bounceColor` normalised by its brightest channel, not
  luminance, so a warm tint draws no channel over the level (`nsS` is the max channel).
- Merge-hazard notes taken: `src/voxel/lampBounce.ts:29` says retuning `BOUNCE` bumps `LAMP_VERSION`; the
  `LAMP_VERSION` comment says the LR16e merge takes a number past both branches'.
- Tests: `tests/lampBounce.test.ts:77-118` (new: the check's test); `tests/helpers/bounceRoom.ts:70-150` (`wallRoom`,
  `slabRoom(sy, intensity, lampY)`, `wallProbe`, `slabProbe`); `tests/helpers/bounceRead.ts` (the GLSL written out in
  JS over the RGBA bytes); `tests/bounceGrid.test.ts:208` (GLSL = field at 2400 points over 4 fixtures with walls off
  the cell middle; R untouched; B + A = bits) and `:269` (no walls = trilinear; a wall bit stops the blend; a code
  moves the home; allocation-free); `tests/lightField.test.ts` (the brute-force sum and the bounce test read through
  `bounceRead.ts`); the deterministic test also compares the bits and checks two lamps' boxes agree on shared cells.
  Scratch tests `tests/zzScratch*.test.ts` deleted.

### The check's table redone (same fixture, field `bounceAt`, after the fix)
| Wall (x) | Lamp to wall | Straddling cell | Bounce 0.15 m behind | 0.3 m behind | 0.5 m behind |
| --- | --- | --- | --- | --- | --- |
| 10.4-10.6 (fixture) | 1 m | 0.000 | 0.000 | 0.000 | 0.000 |
| 10.65-10.85 | 1 m | 0.451 (centre 10.5, lit side) | 0.000 | 0.000 | 0.000 |
| 10.65-10.85 | 2 m | 0.306 (lit side) | 0.000 | 0.000 | 0.000 |
| 10.9-11.1 | 1 m | 0 | 0.000 | 0.000 | 0.000 |
| 10.9-11.1 | 2 m | 0 | 0.000 | 0.000 | 0.000 |
| 10.15-10.35 | 1 or 2 m | 0 | 0.000 | 0.000 | 0.000 |

Sweep (wall every 0.05 m from 10.0 to 10.95, lamp 1 and 2 m; 0.1 / 0.15 / 0.3 / 0.5 / 1 m behind, heights 0.25-2.75):
max 0.000 at all 40 (before: up to 0.246). Slab every 0.05 m from 3.0 to 3.95 (lamp 2.8 m up, intensity 3): max over
it 0.000 at all 20 (before: up to 0.087).

The check's test (`wallProbe` / `slabProbe`; lit = 0.25 m off the lit face, heights 0.25-2.5 m, z 3-7 m; slab lit side
0.25 m under it, x / z 3-7 m; "before" = bde295ef):
| Case (offset in cell, lamp distance) | Behind 0.15 / 0.3 / 0.5 before | after | Lit mean before -> after | Lit min before -> after |
| --- | --- | --- | --- | --- |
| wall 0, 1 m | 0.102 / 0 / 0 | 0 / 0 / 0 | 0.247 -> 0.347 | 0.057 -> 0.092 |
| wall 0, 2 m | 0.054 / 0 / 0 | 0 / 0 / 0 | 0.124 -> 0.175 | 0.028 -> 0.047 |
| wall 0.25, 1 m | 0.011 / 0.009 / 0.006 | 0 / 0 / 0 | 0.163 -> 0.339 | 0.043 -> 0.102 |
| wall 0.25, 2 m | 0.007 / 0.006 / 0.004 | 0 / 0 / 0 | 0.086 -> 0.180 | 0.022 -> 0.053 |
| wall 0.5, 1 m | 0.005 / 0.004 / 0.002 | 0 / 0 / 0 | 0.079 -> 0.321 | 0.023 -> 0.108 |
| wall 0.5, 2 m | 0.005 / 0.004 / 0.002 | 0 / 0 / 0 | 0.046 -> 0.186 | 0.012 -> 0.061 |
| wall 0.75, 1 m | 0.212 / 0.132 / 0.026 | 0 / 0 / 0 | 0.200 -> 0.247 | 0.041 -> 0.057 |
| wall 0.75, 2 m | 0.115 / 0.072 / 0.014 | 0 / 0 / 0 | 0.088 -> 0.113 | 0.010 -> 0.016 |
| slab 0, 1 m | 0.028 / 0 / 0 | 0 / 0 / 0 | 0.066 -> 0.121 | 0.019 -> 0.038 |
| slab 0, 2 m | 0.023 / 0 / 0 | 0 / 0 / 0 | 0.060 -> 0.117 | 0.016 -> 0.029 |
| slab 0.25, 1 m | 0 / 0 / 0 | 0 / 0 / 0 | 0.053 -> 0.106 | 0.017 -> 0.033 |
| slab 0.25, 2 m | 0 / 0 / 0 | 0 / 0 / 0 | 0.066 -> 0.132 | 0.019 -> 0.037 |
| slab 0.5, 1 m | 0.013 / 0.010 / 0.006 | 0 / 0 / 0 | 0.027 -> 0.088 | 0.008 -> 0.028 |
| slab 0.5, 2 m | 0.010 / 0.008 / 0.005 | 0 / 0 / 0 | 0.039 -> 0.136 | 0.011 -> 0.041 |
| slab 0.75, 1 m | 0.019 / 0.012 / 0.002 | 0 / 0 / 0 | 0.020 -> 0.027 | 0.005 -> 0.005 |
| slab 0.75, 2 m | 0.014 / 0.009 / 0.002 | 0 / 0 / 0 | 0.018 -> 0.025 | 0.005 -> 0.006 |

The lit side never loses light: it is brighter everywhere (the old trilinear read mixed in the dark or in-wall cell;
now that corner drops out and the weights renormalise).

Other numbers: ctcourse bake, 31 lamps: vis 10736 ms, bounce 957 ms (+8.9%, `bounceBits` included); bounce data +
boxes 114 KB (was 73 KB: the box grown by a cell) plus the bits, the same size again. The fill texture doubles (RGBA8).

### Tests
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run tests/lampBounce.test.ts tests/bounceGrid.test.ts tests/lightField.test.ts tests/lampFalloff.test.ts
  tests/lampGridLossless.test.ts tests/levelFillParity.test.ts tests/perception.test.ts --maxWorkers=2`: 7 files,
  83 tests PASS (126 s). Was 79: + the check's test, + 3 wall-aware read tests.
- Map-light tests (ctcourseLight, warehouseS1Light, S2, S3): 13 FAIL / 30 pass / 4 skipped, the same 13 tests as
  before this round (no new failure, none fixed; LR16g re-levels).

### Deviations
1. 16 bits a cell in RGBA8 (B + A), not 3 bits in RGB8: the 3 face bits cannot tell which side of a wall inside the
   home cell a point is on (a wall in the far half of the cell still leaks into the point's read), so the crossing
   codes were added. Still one sampler; RGBA avoids 3-byte texel rows.
2. The brief's "straddling cell <= 0.03" now holds where the cell's centre is behind or inside the wall (the fixture:
   0.000); a cell whose centre is on the lit side keeps the lit value (0.45 for the wall at 10.65), as the check's fix
   says ("takes the share of the side its centre is on"). Every read behind the wall is 0.
3. `LAMP_VERSION` 4 (format change); see open item 1.

### Open items
1. Merge with LR16e: `LAMP_VERSION` must end past both branches' values (both may now say 4).
2. Shader cost: `nsGrid2` is 8 texel fetches plus a flood of at most 7 rounds where a wall is near (stops when nothing
   grows). No GPU or perf run here: pending PC run (`e2e-lightbake`, perf budget, a shader compile on the GPU).
3. Re-upload (polish 5) now sends RGBA: ~2x the bytes per bounce change (a sub-box upload would fix both).
4. A wall face whose VPLs sit in the receiver centre's own plane (wall at 10.8: VPL and centre both at x 10.5) lights
   that cell little (lit-face min 0.03 at 0.25 m off). Pre-existing (0.017 before), not this round.
5. Polish not taken (not trivial, or parked): 1 (Epic voxel double bounce), 2 (uplight march start), 4 (Kestrel light
   view; Kestrel is paused), 5 (sub-box upload), 6 (LR16g's call), 7 (bake-time ratio test kept: +8.9% against 25%).
