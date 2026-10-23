# LR16e build - contact-hardening penumbra baked into the lamp visibility byte

Builder: Opus 5.5, 2026-10-23. Base c7a26ca7 (lr16int), branch `feature/sector-redesign-lr16e`.
Brief: `origin/cloud-queue:briefs/sector-redesign-LR16e.md`.

## What changed
Bake-time PCSS, per lamp, in the worker. The atlas (R8), the shaders and `lightField.ts` are untouched: the meter
and the picture read the same bytes.

`src/voxel/lampBake.ts`
- `:38` `PENUMBRA` exported (constants below).
- `:136` `bakeLamps(job, penumbra = true)`: `false` gives the LR16b bake (tests compare). `:148` makes one
  `PenumbraBuffers` per bake; `:152` passes it to `bakeOne` (the only bakeLamps lines touched; LR16-1 adds its call
  after `bakeOne`).
- `:197` `clear()` returns the march distance to the first occupied cell, -1 when clear.
- `:226`-`:269` visibility loop: per air cell in reach `live = 1`. For cells with a blocked sample, `dol` = the cell's
  distance to the light minus the mean hit distance, i.e. the light-to-occluder distance.
- `:274` `penumbraPass` runs between the visibility loop and the solid-cell pass.
- `:296` `fixtureSize`: `max(bulb, ns > 1 ? min(sx, sz) : max(sx, sz))`. `:304` `penumbraWidth(s, dRL, dOL)`:
  `s x (dRL - dOL) / max(dOL, nearOcc)`, clamped to [minWidth, maxWidth]. `:319` `tentWeight(h, j)`: a tent of
  half-width h cells integrated over cell j, so the last tap is fractional.
- `:324` `slideSlices` and `:354` `boxSum3`: separable sliding box sums (x per row, then y and z with row and plane
  accumulators). Memory is read in order and there is no per-cell allocation.
- `:375` `PenumbraBuffers`: views grown to the largest lamp of a bake and reused, so there is one allocation per bake.
- `:417` `penumbraPass`:
  1. Edge cells (`:426`): an air cell with an air neighbour of another byte. They are packed with the blocked-cell
     count (edge x 1024 + blocked; exact in a float).
  2. Within `search` cells (`:456`): the band and the blockers' mean light distance, via two box sums.
  3. For each band cell with a blocker in range (`:461`): the width and the tent weights.
  4. Filter (`:489`) x, y, z, each pass with the receiver's own width. A tap past an occupied or out-of-reach cell
     weighs 0 and stops the walk, so a wall neither darkens the air beside it nor passes light. Normalised by the
     summed weights, then `vis = round(num / den)`.

  Cells off the band, and band cells with no blocker in range, keep their byte. No random input; fixed order.

`src/voxel/lampJobs.ts:13`: `LAMP_VERSION` 1 -> 2 (LR16-1 sets 3; the merge keeps 3).

## Constants
`PENUMBRA = { bulb: 0.08, maxWidth: 0.6, minWidth: 0.1, search: 3, nearOcc: 0.25 (= NEAR_LIGHT) }`.
Tent half-width = width / LAMP_CELL cells: maxWidth gives 3 cells (7 taps), minWidth gives 0.5 cell (one tap).

## Deviations from the brief
1. **Blocker average.** The brief averages `dro`, the receiver-to-occluder distance. The build averages the blockers'
   distance to the light (`dOL`, PCSS's average blocker depth) and takes `dB = dRL - mean dOL`. In the cube around a
   floor receiver, the cells above it sit nearer the occluder, so the mean `dro` came out about 25% short. For example,
   a 3 m panel over a 1.5 m slab gave a 0.18 m edge instead of the geometric ~0.25 m. The occluder-to-light distance is
   the same for every cell one edge shadows. `penumbraWidth` therefore takes `(s, dRL, dOL)`.
2. **Tent radius.** The brief says "radius in cells r = w / LAMP_CELL / 2", but also "maxWidth 0.6 = 3 cells = search"
   and "7 taps". The build uses half-width = w / LAMP_CELL, which matches the 3 cells and 7 taps. Its 10-90 width is
   about 1.1 w, against the physical ramp's 0.8 w plus the grid. The "/ 2" version has a 10-90 width of about 0.55 w,
   sharper than the physics.
3. **Soft-edge acceptance geometry.** ">= 0.4 m at 1.5 m (s = 0.3)" is met with the panel 0.7 m above the slab (lamp
   at 2.2 m): 0.424 m. With the brief's example panel at 3 m, the geometry gives w = 0.3 m. Measured 10-90 is
   0.258 m, against 0.162 m for LR16b. Widening the kernel to reach 0.4 m there would be wider than the physical
   penumbra. The test asserts both: >= 0.4 m at 2.2 m and >= 0.24 m at 3 m.
4. **Wall stop.** The filter walk stops at an occupied cell. This is not in the brief, which only says occupied cells
   weigh 0. Without the stop, a 7-tap filter could reach across a 2-cell wall.
5. **`fixtureSize`, `penumbraWidth` and `tentWeight` exported** for the tests. `bakeLamps` has an optional second
   argument (default on).

## Measured (unit-test scenes, 10-90% width of the trilinear read on the floor's first air row)
| Case | LR16b | LR16e |
|---|---|---|
| Crate foot, side edge / far edge (s 0.3 and 0.6, lamp 3 m) | 0.162 / 0.162 | 0.162 / 0.162 |
| Slab 1.5 m, s 0.3, lamp 2.2 m | 0.162 | 0.424 |
| Slab 1.5 m, s 0.3, lamp 3 m | 0.162 | 0.258 |
| Fence 0.3 / 0.8 / 1.5 m, s 0.3, lamp 3 m | 0.162 each | 0.162 / 0.162 / 0.422 |
| Fence 0.3 / 0.8 / 1.5 m, s 0.6, lamp 3 m | 0.162 each | 0.162 / 0.172 / 0.612 |
| Strip 2.4 x 0.6, slab 1.5: across / along | 0.162 / 1.398 | 0.480 / 1.334 |
| Bytes behind a 0.2 m wall, lamp 2 m in front (s 0.3, 1.2), >= 0.3 m behind | 0 | 0 |

## Bake time
Node, single thread, min of 3 alternating runs; the desktop was under heavy agent load, so expect noise:
| Map | LR16b | LR16e | Ratio |
|---|---|---|---|
| ctcourse (31 lamps, 14.3 M cells) | 7.53 s | 8.49 s | x1.13 |
| warehouseOps (133 lamps, 30.1 M cells) | 16.0 s | 18.8 s | x1.17 |

A phase profile on ctcourse puts the pass at 8-10% of the bake: box sums ~45%, edges ~20%, list ~17%, filter ~14%.
The unit fixture: 116 ms against 101 ms (x1.14; the bound is 1.2).

## Tests
- `npx tsc --noEmit`: clean.
- `npx vitest run tests/lampBake.test.ts tests/lightField.test.ts tests/lampFalloff.test.ts --maxWorkers=2`:
  49 / 49 pass (lampBake 21, incl. 9 new in "(LR16e) penumbra"; lightField 16, incl. 1 new; lampFalloff 12,
  unchanged).
  - New lampBake tests: the width formula and tent; contact sharp; raised soft; width grows with the gap;
    lit/hidden bytes kept; no light through a wall; strips; deterministic; bake time.
  - New lightField test: "(LR16e) field equals trilinear of the baked bytes in a penumbra band". It runs 200 seeded
    points in the fractional cells of the one-sample lamps: `visAt` equals an independent trilinear to 9 digits,
    `levelAt` equals the brute-force formula sum to 6, and more than 50 points read 0.02-0.98.
- `lampAtlasFit`, `lampGridLossless`, `shadowAccuracy`: pass.
- Map-light tests: still 15 failures, the same 15 tests `lr16b-build.md` lists: ctcourseLight 4, warehouseS1Light 4,
  warehouseS2Light 3, warehouseS3Light 4. Not edited (LR16g).

## Open items
1. The bake-time test (x1.2 bound, ~x1.14 measured) can flake on a loaded desktop. If it does, it is the next fix:
   restrict the box sums to the edge cells' bounding box +- 2 x search, or relax to min-of-more runs.
2. Laptop GPU checklist from the brief, still pending: crate and rack contact shadows, doorway shadow softness, the
   parity probe in shadow bands, and per-map bake time and atlas MB after the `LAMP_VERSION` re-bake (campus,
   warehouseOps, ctcourse).
3. The campus bake (118 s baseline) was not measured in node here. Expect a similar +10-17%.
