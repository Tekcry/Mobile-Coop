# LR16-POLISH C + F check - lamp bake engine

Checker: Opus 5.5 (fresh), 2026-10-24. Read only. Checked on a temporary detached worktree at the octopus merge of both
onto lr16int `e7cec732` (what will ship). Brief: `briefs/LR16-POLISH.md` "Part C", "Part F".

| Branch | Head | Verdict |
| --- | --- | --- |
| `feature/sector-redesign-lr16pol-c` (part C, penumbra scratch) | `afed404a` | **PASS** alone; **one-line must-fix at the merge with F (M1)** |
| `feature/sector-redesign-lr16pol-f` (part F, bounce strips, cache note, S3 lamp) | `98187543` | **PASS** |

Merge: `git merge --no-ff` of both at once: **clean, no conflicts** (file-disjoint: C `lampBake.ts` + its test; F
`lampBounce.ts`, `lampJobs.ts`, `warehouseS3.ts`, `lampBounce` / `warehouseLamps` tests). Local merge `8e35d8be`, not pushed.

## Must-fix
**M1 (merge of C with F, red on the merged tree).** `tests/lampBake.test.ts:339`, the Marlow Yard hash test, hashes the
bounce bits too, and F changes the bits (`LAMP_VERSION` 7), so on the merged tree it reads `0a285ac259cd1791`, not
`b282bc62ffaa7583`. The visibility bytes are unchanged (the old-vs-new probe below, on the merged tree, matches boxes, vis,
bounce data and bits byte for byte), so the change is F's bits, not C. Fix, in the integration merge commit (or in
whichever of C / F lands second): line 339 `toBe('b282bc62ffaa7583')` -> `toBe('0a285ac259cd1791')`, and the comment at
:324-325 adds "(ctcourse re-taken after pol-f's bounce bits, LAMP_VERSION 7; vis bytes checked identical old vs new on the
merged tree)". The two fixture hashes (:331-332) still pass merged (no bit change on that fixture). Not a reason to block
either branch.

## Runs (merged tree)
- `npx tsc --noEmit`: clean. `npm run lint`: **0 errors**, 42 warnings (pre-existing `no-console` in scripts / docs).
- vitest `--maxWorkers=2`, slot `sr-slot-1` (CPU 14% at start): lampBake, lampBounce, bounceGrid, lampBoxAlign,
  lightField, lampFalloff, lampGridLossless, warehouseLamps, warehouseS1Light, warehouseS2Light, warehouseS3Light,
  ctcourseLight, campusS2: **13 files, 178 passed, 4 skipped, 2 failed**: `ctcourseLight` "S7 stair step 1 (top): 0.31 <
  0.33" (the expected red, on the base too) and the M1 hash.
- Probe (temporary, deleted with the worktree): `src/voxel/lampBake.ts` of `e7cec732` copied beside the new one, both
  run on the merged tree, compared byte for byte (boxes, vis, bounce data, bounce bits): **identical** on (a) a fixture
  with 3 cones (wall bulkhead, downlight, side cone), a 0.5 m and a 0.3 m lamp (boxes with nz <= R = 3), lamps clipped at
  `lo` / `hi`, a carved doorway, a strip and a downward lamp, and (b) the **full warehouseOps bake: 134 lights, 41 cones**.
- Not run (rules): e2e, build, full vitest.

## Part C against the brief
- **The arithmetic is the old one.** Checked line by line against `e7cec732`:
  - Box sums: per plane, `sumXY` runs the old x pass (`s` a double, Float32 store) and the old y `slideSlices` (now with
    separate src / dst bases, same body); the streamed z sum keeps the old Float64 `acc`, stores `outC` / `outB` (Float32)
    before the update, and updates as `acc + add - rm` in the old order, with the same add-only / remove-only branches at
    the box ends. `SUM_RING` = 2R + 2 holds planes q - R .. q + R + 1 distinct; the fed plane overwrites q - R - 1, dropped
    the step before.
  - Band: same test (`occ` 0, k >= EDGE, k % EDGE > 0), same `penumbraWidth / c`, kept as a double in `hRing` (R + 1
    planes; plane q's slot lives until q + R, when its z pass runs). Weights: `Math.fround(tentWeight)` = the old Float32
    `wts`; taps `min(R, ceil(h - 0.5))` (h >= minWidth / c = 0.5, so the -1 sentinel never collides).
  - Filter: x then y inside the plane (x reads raw `vis`, y reads `numX`; `b` = w0 + w_k equals the old w x 1 exactly),
    Float32 stores; z over `XY_RING` = 2R + 1 planes; final `round(fround(a) / fround(b))` = the old divide of Float32
    buffers. Every plane gets exactly one z pass (`q - R` in the loop, `nz - R .. nz - 1` after; `nz <= R`: all after).
  - Order: the z pass writes plane q - R only after every later read of its raw `vis` (feeds read planes >= q + R, the
    x / y filters their own plane). Correct.
- **FAR cannot make a blocker.** `occ` is a fresh per-lamp `Uint8Array`; `rasterise` writes only 0 or the material, and
  `occupancyShapes` sets material 1, no programs, drops paints. The march (`=== SOLID`), the solid-cell pass and its
  neighbour tests (`!== SOLID`) treat FAR as air, as before; the only `continue`s in the visibility loop are solid and
  out of reach, so live = `occ === 0` exactly. `occ` is not read after `bakeOne` (the bounce rasterises its own). Stale
  `dol` in non-live cells is never read.
- **The hash tests are real**: fixture penumbra on / off (all downward lamps: bulb, strips, panels, small downlight) and
  the full ctcourse bake; values from `e7cec732` (the probe reproduces old == new, so they were not re-taken to pass).
  No cone in the committed hashes (ctcourse has none); the probe covers 41.
- **Memory**: 4 B a cell + 196 B a plane cell + 8 B a row matches the buffers (32 hRing + 64 sum rings + 56 filter rings
  + 28 plane arrays + 16 Float64 sums). The bound test is met by construction; its `< 21 x cells / 2` line is the real
  regression guard. Report: 70.5 -> 16.8 MB on campusOps' largest lamp (<= 1/3 met on all three maps).
- **No allocation per cell**: `w` reused, `isEdge` / `tapWeights` plain calls; two closures per lamp; `bytes` (an
  array) only in tests.

## Part F against the brief
- **The rules are sound** (`src/voxel/lampBounce.ts` `bounceBits`):
  - Thin wall (solid centre, the run's ends both in the cell, middle this way): with S = 5 this is only ea 2 / eb 1 (a
    0.4 m grown run, middle +0.1 m): code 1 (0.15 m) instead of 2. The other way is unchanged (code 1). Correct.
  - Air centre: the code from the run's first two sub-cells (`near`), the `BOUNCE_T_FAR` test on the whole run. Only
    js 1 with je >= 3 changes (code 3 -> 2, threshold 0.3 m vs the real face at 0.2 m): the lit side is not crossed.
  - Second-run rule from a solid centre only (`after`), m = after .. S: in bounds (the padded occupancy, as the edge-bit
    loop). The deviation from the brief's "every code" is explained with sweeps (the air-centre version made the 0.2 m
    gap worse).
- **No lit-side regression**: the existing wall / slab sweeps, ctcourseLight (only S7), warehouseS1/S2/S3Light,
  warehouseLamps and campusS2 pass.
- **Parity**: the read (`bounceGrid.ts`, `nsGrid2`, `tests/helpers/bounceRead.ts`) is untouched; the bounceGrid parity
  test passes.
- **LAMP_VERSION** 6 -> 7, once (F only; C needs none). Merged: 7.
- **#81**: `[22.15, -2.6, 6.5, 0]`, in the column of 3.4 / 9.4 / deck 13.2; dead (radius 0, intensity 0, group -1, off);
  `LR16D_MOVED` maps it to its grid cell; the grid test passes.
- The `BOUNCE` comment names the four constants and the `bounceBits` rules. Bake-time assert 0.5 x vis, budget logged.

## Wire / protocol / save
None: the diffs touch only the files above. Gameplay reads the bake (`LightField` via `BounceGrid`); the readers are
unchanged.

## Polish (not blocking)
1. C: `tests/lampBake.test.ts:323-324` says the blocker distance is "reused as the band index"; the build keeps the band
   widths in `hRing`. Reword.
2. C: add a cone light (e.g. a wall bulkhead) to the fixture hash so the committed test covers cones (value from the
   `e7cec732` code; this check's probe found it identical).
3. F: `tests/lampBounce.test.ts:163-164` accepts worst <= 0.04 and two positions over 0.03 for the 0.2 m gap (brief:
   <= 0.03); the two are explained in the report (crate + wall one run, centre on the wall's far face). Accepted.
4. F: the hull rule also drops the code when the neighbour's own centre sub-cell (m = S, `lampBounce.ts:254`) is solid,
   so a point past a hull reads home instead of a solid neighbour. Harmless on the sweeps; worth a word in the comment.

## Laptop
`e2e-lightbake` on the integration sha after M1 (cache key v7). C's Test Runner item: campus first-load tab memory,
before vs after.
