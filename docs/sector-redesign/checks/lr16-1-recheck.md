# LR16-1 recheck - one-bounce fill, after the fix round

Rechecker: Opus 5.5 (fresh), 2026-10-23. Commit 666b2a17 (fix code d795e27c) on `feature/sector-redesign-lr16-1`,
checked against 4007eafe (check FIX bde295ef). Detached worktree, nothing committed or pushed. Scratch tests and an
extracted bde295ef `src` copy (for before / after) were written, run and deleted.

## Verdict: PASS

Blocking 1 is closed. No 0.2 m wall or slab, at any position inside its cell, leaks bounce at 0.1 m or more behind it.
At body-clear points on the three real maps, reads that pull light from across a wall dropped 3x to 6x. The field and
the shader run the same arithmetic on the same bytes (max |diff| 2.2e-16 over 367k reads). No sampler is added,
`LAMP_VERSION` is 4 and the cache check covers the bits, the hot path allocates nothing, and the bake costs +9.8%. What
is left are narrow face-glow strips in geometry the shipped maps do not have, or in gaps too narrow for a body. These
go on the polish list below.

## Runs
- `npx tsc --noEmit -p .`: clean (after the scratch files were removed).
- `npx vitest run tests/lampBounce.test.ts tests/bounceGrid.test.ts tests/lightField.test.ts tests/lampFalloff.test.ts
  tests/lampGridLossless.test.ts tests/levelFillParity.test.ts tests/perception.test.ts --maxWorkers=2`: 7 files,
  83 tests PASS (156 s). Bake-time line: ctcourse 31 lamps, visibility 12519 ms, bounce 1222 ms (+9.8%, limit 25%),
  114 KB.
- Scratch (uncommitted, deleted): 6 files, 22 tests, all ran. The numbers are below.

## (1) Blocking 1 re-measured (field `bounceAt`, every read also run through the GLSL port)
Fixture: twoRooms. The acceptance lamp is downward, 2.8 m up, intensity 1, radius 2.5, at `d` m from the lit face.
"Behind" is the maximum over z 0.5-9.5 and body heights 0.25-1.5 m.

| Wall (x, 0.2 m) | d | Behind 0.05 / 0.1 / 0.15 / 0.25 / 0.3 / 0.5 / 1.0 m | Lit 0.25 m off, mean |
| --- | --- | --- | --- |
| 10.10 (offset 0.1) | 1 / 2 / 3 | 0 at every distance | 0.377 / 0.212 / 0.053 |
| 10.60 (offset 0.6) | 1 / 2 / 3 | 0 at every distance | 0.369 / 0.240 / 0.078 |
| 10.90 (offset 0.9) | 1 / 2 / 3 | 0 at every distance | 0.357 / 0.175 / 0.039 |
| Sweep 10.00-10.98, step 0.02 (50 positions) | 1 | 0 everywhere, except 10.54: 0.153 at 0.05 m only | 0.025-0.393 |
| 0.1 m wall, same sweep | 1 | 0, except 10.54: 0.153 at 0.05-0.15 m; 10.58: 0.161 at 0.05-0.1 m | as above |

The lit side compared with bde295ef (same sweep, mean 0.25 m off the lit face). After is greater than or equal to
before at 48 of 50 positions (ratio 1.07-6.5). At 10.64 / 10.68 it is 0.93 / 0.87x before. Those positions were already
the darkest before: 0.041 / 0.027.

| Slab (y) | Lamp (y, intensity) | Above 0.05 / 0.1 / 0.15 / 0.25 / 0.5 / 1 / 1.5 m | Under 0.25 m, mean |
| --- | --- | --- | --- |
| 3.10 | 2.1 i1, 1.1 i1, 2.8 i3 | 0 at every distance | 0.115 / 0.124 / 0.185 |
| 3.60 | 2.6 i1, 1.6 i1, 2.8 i3 | 0 at every distance | 0.034 / 0.042 / 0.097 |
| 3.90 | 2.9 i1, 1.9 i1, 2.8 i3 | 0 at every distance | 0.028 / 0.025 / 0.081 |
| Sweep 3.00-3.95, step 0.05 (lamp 0.5 m under, i2) | | 0, except 3.80: 0.165 at 0.05 m only | 0.009-0.177 |

| Other geometry | Result |
| --- | --- |
| L corner (lit room x < cx, z < cz; 12 corner positions, cx 6.1-6.9, cz 5.1-5.9) | Outside, 0.15 m or more off the walls (diagonal, along x, along z, the whole dark L): 0.000 at all 12 |
| Diagonal wall (yaw 45 deg, 0.2 m; 20 offsets, d 1 / 2) | Leaks 0.09-0.62 within 0.05-0.2 m behind at 12 of 40 cases, 0.067 at 0.25 m once, 0 at 0.3 m (bde295ef: 0.03-0.19 at 0.05 m, falling to 0.01-0.09 at 0.3 m). 0 diagonal wall-like boxes on ctcourse / warehouseOps / campusOps: latent only, polish 1 |
| Doorway 1 m / 1.2 m / 2 m, wall at 10.0 / 10.3 / 10.5 / 10.8 | The read does not block the door: room B reads its own cells exactly (read at a cell centre = the cell). Just past the door 0.006-0.109; room B 1.2-3.2 m past, mean 0.001-0.005 (no wall: 0.006-0.007). Identical to bde295ef. What reaches room B is set by the bake, not the read |

Real maps (canonicalLightSet + bakeLamps; the scan reads only points with no solid within 0.29 m, i.e. where a body
can stand, at y 0.6 / 1.1 / 1.5). The metric is the share of each read taken from a lit cell whose centre lies across
a wall-like shape:

| Map | Points | Reads > 0.01 / 0.03 / 0.1 / 0.2: after | bde295ef | Worst after / before |
| --- | --- | --- | --- | --- |
| ctcourse | 35279 | 7 / 2 / 0 / 0 | 21 / 1 / 0 / 0 | 0.044 / 0.032 |
| warehouseOps | 29071 | 54 / 12 / 0 / 0 | 159 / 49 / 0 / 0 | 0.087 / 0.096 |
| campusOps | 95349 | 15 / 6 / 1 / 0 | 93 / 24 / 4 / 1 | 0.106 / 0.233 |

## (2) Parity
Checked line by line: `BounceGrid.sampleInto` (`src/world/bounceGrid.ts:153-228`), `nsGrid2`
(`src/world/bakedLamps.ts:738-791`) and `tests/helpers/bounceRead.ts`. They agree on:
- the clamp `u = clamp((p - o) / cell - 0.5, 0, n - 1)` and `i1 = min(i0 + 1, n - 1)` at grid edges;
- the home cell (`f >= 0.5` = `step(0.5, f)`);
- the shift table (+x is SHIFT[0] for the lower home, -x is SHIFT[1] for the upper);
- `d = |f - hb|` against `code x 0.15`;
- `open = (walls & 7) == 0`;
- the flood: the same visit order, at most 7 rounds, stopping once nothing grows; the index guards keep `k + a <= 7`;
- the renormalised weights and the `V[h]` fallback.

Packing: G = g; B = bits & 255; A = bits >> 8. The shader decodes `int(c * 255 + 0.5)`, which is exact for UNORM8. R is
untouched (tested). The 16 bits do not overlap: 0-2 edges, 3-4 / 5-6 x, 8-9 / 10-11 y, 12-13 / 14-15 z, bit 7 unused.
When every neighbour is blocked, the read returns the home value alone (`sw` > 0 always: the home's weight is >= 0.15
after a crossing, >= 0.5 otherwise).

Measured: field vs the GLSL port, max |diff| 2.2e-16 over 308k fixture reads, plus 59k reads over and past every grid
edge (-3..+3 m outside).

## (3) Samplers / GLSL
The plugin's sampler list is unchanged (`bakedLamps.ts:902`, 8). The integration branch with LR16t has 9
(`lampTsAtlas`), the same as before this slice: the bits ride in the same RGBA8 3D texture.

The GLSL is valid ES 3.00:
- int and bit ops (`>>`, `&`, `|=`, `^=`);
- `texelFetch(sampler3D, ivec3, 0)`;
- constant loop bounds (8, 7) with `break` / `continue`;
- dynamic indexing of local arrays (allowed in ES 3.00);
- `float(tx) * 0.15` (the step constant interpolates as a float literal).

No GPU compile or perf run here: pending PC run (`e2e-lightbake`, perf budget).

## (4) Cache
`LAMP_VERSION` 4 (`src/voxel/lampJobs.ts:18`) is in the key (`src/world/lightBake.ts:88`). `cacheOk` rejects an entry
without `bits` or with a length mismatch (`lampJobs.ts:30-32`). The bits come from the shapes, which `shapesHash` in
the key already covers. LR16e's branch is at v2, so the merged build must take 5 (noted in the code comment;
merge-time).

## (5) Hot path
- `sampleInto` uses typed-array scratch and writes its result to a field: no closures or iterators, and the
  allocation test passes.
- `bounceInto` / `levelInto`: no allocation.
- `uploadBounce` / `packFillRGBA`: no allocation.
- No `Math.hypot` in the diff.
- The bake allocates in the worker only.

## (6) Deviation 3 (a straddling cell keeps the lit value of its centre's side)
Acceptable. Points past the wall cross to the neighbour on their own side: 0 behind at every 0.2 m position from 0.1 m
on. The lit side gains 1.1-6.5x over bde295ef.

## (7) Bake cost
+9.8% here (builder: +8.9%), limit 25%.

## Polish (not blocking)
1. **Face-glow strips the per-axis codes cannot see.** `src/voxel/lampBounce.ts:193-214`, read at
   `src/world/bounceGrid.ts:195-200`. All cases stay within ~0.25 m of a face, so no meter or guard read sees them;
   only the picture's 0.25 m tap could show a strip.
   - Diagonal walls: 0.1-0.6 within 0.2 m behind, 0 diagonal walls on the three maps today.
   - Thin (0.1 m) walls at a few positions: 0.15-0.16 within 0.15 m.
   - An object's conservative hull holding the cell centre with a wall in the same half cell: warehouseOps (0.2, 1.5,
     11.65-11.85) reads the next room's 0.36 in the 0.2 m gap between a crate and the wall; campusOps (-30.2, 1.0,
     -46.65) reads 0.05 in a 0.15 m strip.

   Fix: in `bounceBits`, set a crossing code only when the segment from the run's end to the neighbour's centre is
   clear (a second solid run means code 0, so the point keeps its home). For rotated walls, a per-cell plane would be
   needed.
2. **Lit wall faces at ~25% of in-cell positions read a near-zero bounce 0.25 m off.** This happens when the 1 m
   receiver centre falls in the bake's conservative occupancy (wall at 10.64 / 10.68: 0.025-0.04 vs ~0.36 next door).
   It was already so before (open item 4). The same applies to a lit inside corner (L corner 6.5 / 5.6: 0.000) and the
   lit side of the diagonal at some offsets. LR16g's call: a receiver centre in a solid could take its open
   neighbour's share.
3. `int e[k]` reaches 65535 (`bakedLamps.ts:750-754`). Babylon declares `precision highp int` only inside
   `helperFunctions` for WebGL2. Desktop ints are 32-bit, but a phone launch (G182) with 16-bit mediump ints would
   misread the -z code. Declare the locals `highp int` or keep the codes under bit 15.
4. `BOUNCE_SUB` / `BOUNCE_T_STEP` / `BOUNCE_T_FAR` / `BOUNCE_T_SHIFT` are not in the cache key. The `BOUNCE` comment
   (`lampBounce.ts:29`) says a retune bumps `LAMP_VERSION`; extend it to these.
5. Doorway fill is faint: room B behind a 1 m door gets mean 0.001-0.002, max 0.009-0.016. That is the bake's march to
   1 m receiver centres (the read passes it through unchanged; identical before). A centre on a grown jamb sees the
   pool only through the gap. Note for LR16g if lit-through-a-door rooms look black on the sheets.
6. Carried from the check: polish 1, 2, 4, 5, 6 and 7 (Epic voxel double bounce, uplight march start, Kestrel light
   view, sub-box upload (now RGBA, 2x bytes), the omni receiver's floor lift, the bake-time ratio test).
