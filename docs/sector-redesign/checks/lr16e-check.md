# LR16e check - contact-hardening penumbra (bake-time PCSS)

Checker: Opus 5.5 (fresh), 2026-10-23. Branch `feature/sector-redesign-lr16e` @ 2f5ffec1, base c7a26ca7.
Brief: `origin/cloud-queue:briefs/sector-redesign-LR16e.md`. Build report: `lr16e-build.md`.

## Verdict: FIX (one blocking item: the bake-time test flakes under load)

The penumbra itself is right: physically correct PCSS width, contact stays sharp, no leak, parity by construction.
The only blocker is the CI-gated bake-time test.

## Blocking
1. **`tests/lampBake.test.ts:283-299` "bake time within 1.2x" flakes under CPU contention.** Solo it reads x1.105-1.119
   (6 runs, all pass). With 4 copies running at once, as `npm test` / CI runs files in parallel beside the heavy
   map-bake tests, one of 4 failed: `LR16e bake 118 ms vs LR16b 95 ms (x1.250)`. Min-of-7 per side does not cancel
   contention that hits one side's runs more than the other, and a 5% margin (x1.14 measured vs x1.2) is too thin
   for a ~100 ms fixture. This is the CI gate (`npm run check`), so trains will fail at random.
   Fix (test only, no code change): take the min of the per-pair ratios `te[k] / tb[k]` (each pair runs back to back
   under the same load) over more pairs (e.g. 11), and assert a regression bound of 1.35. Keep the x1.2 budget as a
   logged number checked by the node map bakes in the build report, not as a CI assert.

## Hard rules
- **Light parity: holds.** `lightField.ts`, the shaders and the R8 atlas are untouched; the meter and the picture
  read the same bytes. The new lightField test samples 200 seeded points in the penumbra band (>50 soft) and checks
  `visAt` = trilinear of the bytes and `levelAt` = the brute-force formula. The bake is deterministic and uses only
  `+ - * /`, `sqrt`, `floor`, `ceil`, `round` (IEEE-exact on every device), so every machine bakes the same bytes.
- **No leaks: holds.** The filter walk stops at the first non-live cell (`lampBake.ts:512`, `:518`), so every
  contribution reaches the receiver along an axis-aligned path of live air cells (x, then y, then z: an L- or
  3-segment path). A 6-connected-sealed region cannot be entered. Checked with a scratch component test (not
  committed): per lamp, label the 6-connected components of live air cells; a component LR16b left fully at 0 must
  stay fully 0 with the penumbra. 0 leaking cells in: a sealed room of 0.02 m sheets (1-cell walls after the grow),
  a thin 45-degree diagonal wall closed by a roof sheet, a butt-jointed thin-wall corner under a roof sheet, a
  0.1 m storey slab over a sealed room with a crate on it (lamp above), and the whole ctcourse map (31 lamps,
  14.3 M cells, 181 896 bytes changed). A diagonal (8-connected) voxel wall also blocks 6-connected walks.
  The blocker box sums (`:458-459`) do cross walls, but they only set the width, never carry visibility.
- **Allocation: holds.** One `PenumbraBuffers` per bake (`:148`), grown to the largest lamp; per lamp only `list`,
  `wts`, `taps` sized by the band (`:467`) and the existing `occ`, `vis`, `pick`, closures. Nothing per cell.
- **Bake time:** ctcourse x1.13, warehouseOps x1.17 (builder, node); unit fixture x1.11 solo here. campusOps measured here in node (134 lamps, 134 M cells, single thread, 2 alternating runs under load): LR16b 120.7 / 75.1 s, LR16e 125.8 / 84.4 s, min vs min x1.12. Within x1.2 on all three maps.

## Deviations
1. **Blocker average (light-to-occluder instead of receiver-to-occluder): accept, it is the correct one.**
   `dB = dRL - mean(dOL)` with `dOL = |cell - light| - t_hit` is PCSS's average blocker depth: one value for every
   receiver an edge shadows. Averaging `dro` over the 7^3 cube mixes cells nearer the occluder and comes out short,
   as the builder measured (0.18 vs ~0.25 m).
2. **Tent half-width = w / cell (not w / cell / 2): accept.** Measured 10-90 widths track the physical penumbra
   (s 0.3, lamp 3 m, slab 1.5 m: geometric w 0.30, physical 10-90 ~0.24, measured 0.258; lamp 2.2 m: clamp 0.6,
   physical ~0.48, measured 0.424). The "/ 2" reading would be ~30% sharper than physics.
3. **Soft-edge acceptance moved to a 2.2 m lamp: accept.** The brief's own example (0.3 m panel, 3 m, 1.5 m shelf)
   gives a 0.3 m geometric penumbra, so ">= 0.4 m" there would need a wider-than-physical kernel. The test keeps both
   (>= 0.4 at 2.2 m, >= 0.24 at 3 m, LR16b < 0.17).
4. **Wall stop: accept, required.** Weight 0 alone would let a 7-tap walk step over a 1-2 cell wall and pick up the
   far side; the stop is what makes the no-leak argument above hold.
5. **Exports and the `penumbra` flag: accept.**

## Merge hazards with LR16-1 (`feature/sector-redesign-lr16-1` @ 4007eafe)
- `git merge-tree` conflicts in 3 files: `src/voxel/lampBake.ts` (the `bakeOne(...)` line in `bakeLamps`; resolve
  as `bakeOne(L, li, bx, occShapes, sb, pen)` inside LR16-1's `t0` / `t1` timing, `const pen` before the loop, keep
  the `penumbra = true` parameter), `src/voxel/lampJobs.ts` (`LAMP_VERSION`), `tests/lightField.test.ts` (both
  appended a test at the same spot: keep both).
- **`LAMP_VERSION`: set 4 at the merge, not 3.** The lamp cache key is `lamps:...:v${LAMP_VERSION}:...`
  (`lightBake.ts:88`). Any machine that ran LR16-1 alone (e.g. the laptop's GPU checks) holds v3 entries with a
  bounce and no penumbra; LR16-1's `cacheOk` accepts them, so a merged build at v3 would load them and show no
  penumbra (meter and picture agree, but the feature looks missing and the GPU checklist would pass the wrong bake).
- **The bounce should read the filtered `vis`, and does.** `bounceLamp` weights each lit surface patch by `v / 255`
  (`lampBounce.ts` at 4007eafe, the patch loop): the direct light the picture shows. The penumbra pass runs inside
  `bakeOne`, before the solid-cell pass, so a `bounceLamp` call after `bakeOne` gets the final bytes with no change.
  After the merge, rerun `tests/lampBounce.test.ts` and `tests/bounceGrid.test.ts`: their fixtures were tuned on
  binary visibility and may move slightly. LR16-1's `ms.vis` will include the penumbra pass (fine). The LR16e
  bake-time test will also time the bounce on both sides, which dilutes the ratio (it will pass more easily).

## Tests run (slot-2 lock)
- `npx tsc --noEmit`: clean.
- `npx vitest run tests/lampBake.test.ts tests/lightField.test.ts tests/lampFalloff.test.ts tests/lampAtlasFit.test.ts
  tests/lampGridLossless.test.ts tests/shadowAccuracy.test.ts --maxWorkers=2`: 6 files, 73 / 73 pass (108 s).
- Bake-time test: 6 solo runs x1.105-1.119 (pass); 4 concurrent: x1.091, x1.129, x1.145, x1.250 (fail).
- Scratch (deleted): leak components as above; largest lamp box per map (below).

## Polish (non-blocking)
1. **Worker scratch memory.** `PenumbraBuffers` is 21 B per cell of the largest lamp (`:375-391`), against 2 B
   (`occ` + `vis`) before. Largest boxes: ctcourse 0.90 M cells (18.9 MB), warehouseOps 1.09 M (23.0 MB), campusOps
   3.35 M (70.4 MB) per worker, with up to 12-16 workers in one renderer process on campus's first load. Not broken,
   but add "tab memory on campus first bake" to GPU checklist step 4. Cheap cuts: run the box sums and the filter
   only over the edge cells' bounding box +- 2 x search (also the builder's open item 1 for time), or keep `dol` and
   the sums in one Float32 view pair.
2. Strips: `dol` (`:269`) subtracts the march distance toward sample k from the distance to the lamp centre, not to
   sample k; for a 2.4 m strip 3 m up that biases `dOL` by up to ~0.16 m. Use `|cell - sample k| - t` per hit.
3. The blocker mean (`:458-459`) is not path-aware: near a wall it can average in the other side's blockers and
   pick a slightly wrong width (never light).
4. For w 0.10-0.15 m (h 0.5-0.75 cells) the side tap weighs at most ~0.06 (0.125 at w 0.2 m), so the 0.2 m grid
   stair stays nearly as LR16b for occluders a little off the floor. The physical edge is under a cell there, so
   this is acceptable now; it is not the open-floor stair the goal names.

## Laptop GPU checklist (unchanged from the brief, plus)
- After the LR16-1 merge with `LAMP_VERSION` 4: confirm the first load re-bakes (bake time logged) on campus,
  warehouseOps and ctcourse, and note tab memory during the campus bake.
