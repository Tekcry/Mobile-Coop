# LR16-POLISH part C - penumbra bake scratch memory (build)

Builder: Opus 5.5, 2026-10-24. Brief `briefs/LR16-POLISH.md` "Part C" (on `feature/sector-redesign-polish`). Branch
`feature/sector-redesign-lr16pol-c` off lr16int `e7cec732` (LR16g, LR16-L A + B, LR16-W, polish A, B, E).

## Built
lr16e 1: the penumbra pass's scratch is now 4 B per cell of the largest lamp box (was 21 B), plus rings of planes.
`src/voxel/lampBake.ts` only:
- `PenumbraBuffers` keeps one Float32 per cell: the blocker distance `dol`. The `live` byte is gone: the visibility loop
  marks air cells out of reach `FAR` (2) in the lamp's own `occ`, so live = `occ === 0`; the march and the solid-cell
  pass test `occ === SOLID` (1) instead of truthiness (`occupancyShapes` rasterises to material 1, no programs).
- The box sums stream along z: per plane, the packed counts and blocker distances are built, summed over x and y into a
  ring of `2R + 2` planes, and the z sum adds the plane R + 1 ahead and drops the one R behind (the old `boxSum3` order:
  same Float32 stores, same Float64 sliding sums).
- The band and the filter stream too: each plane's band widths go into a ring of R + 1 planes, its x and y filter run
  inside the plane, the x-y filtered values into a ring of 2R + 1 planes, and the z filter of plane q - R then writes
  its final bytes (no later step reads that plane's raw visibility). Weights are the Float32 values the old `wts`
  stored (`Math.fround(tentWeight)`), the final divide reads the sums as Float32, as the old buffers held them.
- The old per-lamp `list` / `wts` / `taps` arrays (21 B per band cell, new every lamp) are gone; nothing is allocated
  per lamp except two closures and a subarray view.
- `bakeLamps(job, penumbra, pen?)`: an optional `PenumbraBuffers` so tests read `bytes` and `peakBand`. Workers call
  it as before. No `LampResult` change, no wire / protocol / save change, no `LAMP_VERSION` change (bytes identical).

## Bytes identical
`tests/lampBake.test.ts` hashes (sha256 of boxes, vis, bounce boxes / data / bits), expected values taken on
`e7cec732` before the change (the brief said `4ebcecbd`; LR16-L A changed the bake boxes since, so the base sha is the
right reference):
- fixture (10 shapes, 6 lights: bulb, strip, panels, small downlight) penumbra on `8a043bd5a06b6607`, off
  `74336023ce3a74b4`; Marlow Yard (ctcourse) full bake `b282bc62ffaa7583`. All three pass after the change.
- Probe (not committed): each map's two largest lamps baked alone, before and after, same hash:

| Map | Lamp | Box (cells) | Band cells | Hash |
| --- | --- | --- | --- | --- |
| ctcourse | 16 | 207 x 47 x 90 = 875,610 | 65,159 | e11c3366e4bc18ab |
| ctcourse | 12 | 207 x 37 x 90 = 689,310 | 44,641 | 5f0921e466979dd5 |
| warehouseOps | 13 | 141 x 55 x 141 = 1,093,455 | 50,429 | c6ae5dcf47e43458 |
| warehouseOps | 58 | 128 x 55 x 143 = 1,006,720 | 135,297 | c8621aa0188c6eb9 |
| campusOps | 1 | 193 x 90 x 193 = 3,352,410 | 393,518 | b7119eaf6f3fc3a9 |
| campusOps | 2 | 193 x 90 x 193 = 3,352,410 | 406,498 | 119afd4297281e86 |

## Scratch per worker (largest lamp)
Before: 21 B a cell + the 8 B a plane-cell `acc`, plus 21 B a band cell made new per lamp. After: everything
`PenumbraBuffers.bytes` holds (4 B a cell + 196 B a plane cell + 8 B a row).

| Map | Before (cells only) | Before (with band arrays) | After | After / before |
| --- | --- | --- | --- | --- |
| ctcourse | 18.47 MB | 19.83 MB | 5.41 MB | 0.29 |
| warehouseOps | 23.02 MB | 24.08 MB | 5.89 MB | 0.26 |
| campusOps | 70.54 MB | 79.08 MB | 16.82 MB | 0.24 (0.21 with band) |

Target <= 1/3: met on all three. A new test pins it: `pen.bytes <= 4 x cells + 196 x plane + 8 x row` on a fixture.
(The bake's own `occ` and `vis`, 2 B a cell, are unchanged and not counted in either column.)

## Bake time
Fixture bake-time case (paired best ratio vs the LR16b bake, alone, alternating runs): after x1.105 / x1.090, base
x1.038 / x1.071 (penumbra bake 110 ms vs 107 ms, ~3% of the whole bake: small boxes carry relatively more per-plane
work). Map lamps (probe, vis + penumbra time): campusOps 3.41-3.48 s after vs 3.22-3.68 s before, ctcourse and
warehouseOps within the same noise. Budget 1.35x holds.

## Tests
- `npx tsc --noEmit` clean; eslint on `src/voxel/lampBake.ts`, `tests/lampBake.test.ts` clean.
- vitest `--maxWorkers=2` (slot lock): lampBake (29, 3 new), lampBoxAlign, lightField, bounceGrid, lampBounce,
  lampFalloff, lampGridLossless: 7 files, 82 / 82 pass. warehouseS1Light, warehouseS2Light, warehouseS3Light,
  ctcourseLight: 42 pass, 4 skipped, 1 fail = the expected S7 stair red on this branch (`S7 stair step 1 (top): 0.31 <
  0.33`, present on the base).

## Laptop / Test Runner
- Campus first load, tab memory during the bake, before (`e7cec732`) vs after (this branch): expect the worker heap peak
  down by ~54 MB per worker on the largest lamp (70.5 -> 16.8 MB).
- No e2e suite is needed for bytes (identical); `e2e-lightbake` optional.

## Risks
- The `occ` value 2 relies on `occupancyShapes` rasterising to material 1 with no programs (it sets both); a future
  occupancy that writes other materials would need `SOLID` widened. The hash tests would catch it on the fixture and
  ctcourse.
