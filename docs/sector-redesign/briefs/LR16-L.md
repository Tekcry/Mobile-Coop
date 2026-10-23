status: open

# LR16-L - wall light "blotchy, not smooth" (walk 4.82 item 8) - Opus build brief

Investigator: Opus 5.5, 2026-10-23 (fresh; the first investigator died at the swap without a brief). Plans only.
Michael (walk 4.82, item 8, `docs/orchestrator/WALK-4.82-REPORT.md:12` on `feature/menu`): "s3 lights on low look terrible
on walls, blotchy, not smooth. iPhone/ipad using chrome." Photo `C:/NightShift/scratch/walk-4.82/s3-hallway-low-ipad.png`:
Marlow Yard A3 (the Office Range corridor, master `a3OfficeRange.ts`), the iPad is the host (overlay "Operator
disconnected", item 7), preset Low (`settings-low-ipad.png`). Upper 0.5-0.8 m of both corridor walls dark, lit lobes in
front of each ceiling panel, dark "teeth" hanging between them about 1-1.5 m apart, the lower wall near white.

## Verdict in three lines
1. Root cause: the lamp visibility bake shadows each ceiling lamp's light from its OWN ceiling. The bake's conservative
   occupancy grows the slab 0.1 m and rasterises it on the lamp box's 0.2 m grid; that grid starts at the map's `lo`, so a
   lamp hung 5 cm under a 3.0 m slab sits 0.15 m deep inside a solid cell row. Every ray to it that rises less than
   0.15 m over its last 0.25 m (the march's `NEAR_LIGHT` stop) is blocked: on a wall 1.75 m away nothing above ~2.4 m sees
   the lamp in front of it, nothing above ~1.8-2.0 m sees the next one. The cut is rasterised in 0.2 m steps, and the
   darkness curve (steep 12) turns it into a hard, toothed edge.
2. It is not the Low preset and not shader precision: the bake, every light grid and the whole lamp shader path are
   identical on every preset (and highp). Low and the phone only remove what softened it on desktop: no bloom, and the
   phone renders at 50% x 0.67 TAAU (about 1/3 of native).
3. Fix: align each lamp's bake box on the lamp (cell planes through the light point), so a lamp under its mount sits on
   a cell boundary under the solid row. Same bytes for the meter, the guards and the picture (parity by construction).
   Small extras for Low / phones: highp depth samplers in TAAU and the fog, explicit `precision highp int` (LR16-1
   recheck polish 3), and Low's surface normals made equal to Medium's.

## Evidence (file:line at lr16int 961ca660 unless marked master)
- The march: `src/voxel/lampBake.ts:25` `NEAR_LIGHT = 0.25`; `:236` `const end = d - NEAR_LIGHT`; occupancy grown by half
  a cell `:145` `occupancyShapes(job.shapes, c * 0.5)` (rule in the header `:8-10`); a cell is solid when its centre is
  inside a grown shape (`src/voxel/shapes.ts:163-169`).
- The box grid: `lampBake.ts:79-81` `x0 = max(lo, x - r)` (same for y, z). With the photometric reach (radius x 1.6,
  6.08 m for A3's 3.8) `y - r` falls below `lo`, so the rows sit on the map's `lo` (-2): row [2.8, 3.0) has its centre
  (2.9) inside the slab grown to 2.9, and holds the lamp at 2.95. Master is the same code (master `lampBake.ts:24, 55-56,
  120, 185`); master A3 hangs every lamp at `CEIL - 0.05` under a 3.0 slab (master `a3OfficeRange.ts:289, 294, 297`).
- Why only some players saw it: on master the photometric model is a setting (default `lampFalloff: 'linear'`, master
  `settings.ts:167`; reach x 1.6 only in photometric, master `lampMath.ts:49-54`). With the linear reach, `y - r` = -0.85
  puts a row boundary at 2.95 by chance and the wall is clear (the first investigator's master probe, vis 223-255 at the
  top). The photo's near-white lower walls match photometric levels (rendered 2.0-2.7 x albedo), not linear (0.6-0.7):
  the iPad ran photometric. On lr16int photometric is the only model (LR16a), so every player gets it.
- Reproduced (probe `tests/zzLowWallsL3.test.ts`, untracked in `C:/NightShift/Mobile-Coop-sector-redesign-lowchk`; the
  A3 corridor rebuilt from master's numbers: 3.5 m wide, slab 3.0-3.2, six 1.2 x 0.3 panels at y 2.95 every 3 m, radius
  3.8, I 0.9, standby 0.14 to y 2.9; real `bakeLamps` + `LightField` (bounce on); picture = (lit x N.L + (fill + bounce)
  x LEVEL_TO_RENDER) x `darkWeight(s)`). North wall, 0.2 m off it, y 2.9 / 2.7 / 2.5 / 2.3 / 2.1 / 1.8:

  | | vis of the lamp in front (x 87), / 255 | vis between lamps (x 85.5) | rendered x 100 at x 87 | at x 85.5 |
  | --- | --- | --- | --- | --- |
  | now (rows on `lo`) | 1 / 1 / 4 / 38 / 181 / 249 | 0 / 0 / 0 / 5 / 26 / 106 | 56 / 72 / 87 / 138 / 188 / 162 | 49 / 66 / 80 / 106 / 141 / 167 |
  | aligned (lamp on a row boundary) | 255 everywhere | 255 everywhere | 108 / 136 / 201 / 185 / 163 / 127 | 98 / 112 / 154 / 168 / 139 / 111 |

  Worst vertical change per 5 cm (x 81-96, y <= 2.9): 36.7 now -> 26.3 aligned; worst row max/min across a lamp period:
  1.61 -> 1.44. Dimmer lamps (I 0.4, the LR16g direction) now: top band 9-13 (black), edge 51 -> 110 between 2.3 and 2.2,
  across-row ratio 3.63 (the photo's lobes and teeth); aligned: 26.7 / 2.63. Gameplay: a standing head by the wall
  between two lamps (85.5, 1.7, 12.2) reads 0.79 now, 1.00 aligned (I 0.4).
- How often (audit probe `tests/zzLowWallsL5.test.ts`, same folder; lamps whose light point lies strictly inside a solid
  cell of their own box): warehouseOps 8 / 133 (#33 #38 #41 #45 #51 #122 #126 #127, depth 0.02-0.15 m), campusOps 11 / 134
  (#17-#24 at y 0.85, #45 #50 at 3.90, #81 cone at 2.80, depth 0.05-0.20), ctcourse 3 / 31 (#27-#29 at 3.85, depth 0.05),
  master A3 all 14 (depth 0.15, the worst case: 3.0 m ceilings). warehouse, seclab, courselab, proving, kestrel: none.
- Refuted (the lead's list):
  - Precision in the lamp / bounce / falloff path: every lamp sampler is declared highp (`bakedLamps.ts:566-567, 843-852`);
    Babylon prepends `precision highp float` (`shaderProcessor.js:60-79`) and its `helperFunctions` include (which
    declares `precision highp int` for WebGL2) comes before `CUSTOM_FRAGMENT_DEFINITIONS` in both `pbr.fragment` and
    `default.fragment` (Babylon 9.29). Correct today, by include order only (B2 makes it explicit).
  - Grid resolution at Low: none is per preset. `LAMP_CELL` 0.2 "one size on every device" (`lampBake.ts:15-16`),
    `AMBIENT_CELL` 1 (`ambientGrid.ts:9`), the bounce on the ambient cells; the game never builds the light volume
    (`world.ts:270` passes `volume` null; editor only, `bakedLamps.ts:172`).
  - RGBA8 fill (LR16-1): the same bytes on every preset and in the field; 1/255 of level is at most ~6/255 of rendered
    light at the curve's centre: faint banding at worst, not lobes.
  - Lamp volume filtering: R8 trilinear, no mips, every preset (`bakedLamps.ts:216, 284`).
  - Dithering: none on walls at Low (the fog's dither only marches volumetric lights; Low has none).
- What does differ at Low (`src/core/quality.ts:55, 67`): no AO, no bloom (Medium+ bloom spreads the lit side over the
  edge), textures 256 per tile, render scale 0.67, no G-buffer. Two of these touch walls:
  - TAAU and the height fog read the scene's hardware depth only at Low (`src/vfx/postStack.ts:181-190`, mode 2; Medium+
    have AO and read the G-buffer's linear view z, `:296`), through `uniform sampler2D depthSampler` with no precision
    (`src/vfx/taau.ts:32`, `postStack.ts:51`) = GLSL ES 3.00's default `lowp sampler2D`. Desktop GPUs run it at fp32;
    Apple GPUs (WebKit's ANGLE-Metal, which Chrome on iOS uses) at fp16: hyperbolic depth near 1.0 then steps in slabs of
    z^2 x 2^-11 / near (near 0.05: 9 cm at 3 m, 1 m at 10 m). Measured cost on the picture: small (sub-pixel reprojection
    error, fog 0.004/m); a robustness fix, not the cause.
  - Surface normals: `surfaceAtlas.ts:213` `e = texel * 4.0` with `texel = 1 / tilePx` (`:257`) and `(h - hx) * 2.5`
    (`:218`): the slope scales with the step, so Low's 256 px tiles get 2x Medium's bump (Ultra / Epic half). Grazing lamp
    light shows it as speckle. Minor, Low-only.

## Base, branch, rules
- Base: the head that carries LR16g + LR16-W when the lead starts this (both re-level lamps; this fix lifts levels near
  ceilings, so measure on top of them), else `feature/sector-redesign-lr16int` @ 961ca660. Branch
  `feature/sector-redesign-lr16l`. Lead fills the sha. Recommendation to the lead: land Part A before LR16g / W's checker
  measures, or have that checker measure with it (Part A changes the same map-light numbers they tune).
- Read `docs/systems/agent-preamble.md`. Cloud build: `npx tsc --noEmit`, single vitest files `--maxWorkers=2` (slot
  lock `C:/NightShift/scratch/sr-slot-{1..4}.lock`), `npm run lint`. No e2e, no GPU, no `npm run dev`.
- Not to touch: map data (`src/world/maps/**`), `lampMath.ts`, `darkCurve.ts`, `bounceGrid.ts`, `lampBounce.ts` logic.

## Part A - the bake: a lamp never shadows itself from its mount (the fix)
A1. `src/voxel/lampBake.ts:71-92` `lampBox`: put the box grid's planes through the light point on all three axes. For
   each axis, with `from = max(lo, l - r)`: `origin = l - c * Math.floor((l - from) / c + 1e-9)` (so `from <= origin <
   from + c`: the box stays inside the old clip; the strip `[from, origin)` it drops is under one cell at the reach end
   (falloff ~0) or at the map's outer bound, and lookups there clamp to the edge cell as now). Counts as now:
   `ceil((x1 - origin) / c)` with `x1 = min(hi, l + r)` (`y + c` for a downward lamp). Update the doc comment: why
   aligned (a lamp up to 0.2 m under a mount sits on a boundary under the solid row; rays from below never cross it).
   Everything that reads the box takes it from the result (`BOX_STRIDE` boxes): the march, the LR16e penumbra pass, the
   bounce, `bakeVisSampler` (`lightField.ts:40-52`), the shader's `t3` (`bakedLamps.ts:1233-1234`), the atlas fit. No
   shader or field change.
A2. Lamps still embedded after alignment (the audit's "cell below still solid": campusOps #16 (-5, 2.2, -48), #17-#24
   (y 0.85, z -45.5), warehouseOps #34 (-8, 2.4, -6.24), #53 (11, 2.4, -17.76)): read each in its map. A light point on
   top of a post or rail (a bollard) is right as is (its own post shadows its base); a light flush with or inside a
   ceiling or shelf is a data error: list it for the lead (map files are not ours), do not move it here.
A3. `src/voxel/lampJobs.ts:20` `LAMP_VERSION` + 1 from its value at the base (cached bakes are stale).
A4. Tests (new `tests/lampBoxAlign.test.ts`):
   - `lampBox` alignment: for a seeded set of lamps (inside / outside `lo`, downward and cones, r 0.5-10), `(l - origin) /
     c` is an integer within 1e-6 on x, y, z; `max(lo, l - r) <= origin < max(lo, l - r) + c`; `origin + n * c >= x1`.
   - No self-shadow: the A3 corridor above (build it with `LevelBuilder.box` / `light` / `ambientZone`, `lo` y forced to -2
     as in the probe; copy `zzLowWallsL3.test.ts`'s builder): `visAt(lamp at 87, 87, 2.6, 12.3) >= 0.95` and `visAt(.., 85.5,
     2.3, 12.3) >= 0.95` (now 0.01 / 0.02); repeat with the slab at 3.0 and the lamp 0.02, 0.05, 0.10, 0.15, 0.19 below it.
   - Real occluders still shadow: a 0.3 m deep beam across the corridor at y 2.6-2.9, x 85.4-85.6: the wall point behind
     it from the lamp at 84 (x 86.5, y 2.3, z 12.3) reads `visAt <= 0.2`.
   - Map audit: for every map in `MAPS`, no baked lamp's light point lies strictly inside a solid cell of its own box
     (the check of `zzLowWallsL5.test.ts`: `rasterise(occupancyShapes(shapes, c / 2))` on the one cell holding the light,
     depth `> 0.001`). Allow-list the A2 lamps the lead accepts, by id, with the reason.
   - The wall guard (picture model, pure): on the A3 corridor, worst 5 cm vertical change on the north wall (x 81-96, y
     1.0-2.9) <= 0.32 and worst across-row max / min (y 1.6-2.9, one lamp period) <= 1.6 at I 0.9; <= 2.9 at I 0.4. (Aligned
     values 0.263 / 1.44 / 2.63; today 0.367 / 1.61 / 3.63.) This is the "arches never come back" guard for LR16g and later
     re-levels.
   - Re-baseline whatever moves, with the old and new number in the commit and the report: `tests/lampAtlasFit.test.ts`
     (box dims), LR16g / W's map-light tests (levels near walls under the audit's lamps rise; list each changed point with
     old -> new and its band), `e2e-lightbake`'s keys (version).

## Part B - Low / phone robustness (picture only, no value changes on desktop)
B1. `src/vfx/taau.ts:30-32` and `src/vfx/postStack.ts:46, 51`: declare `uniform highp sampler2D` for `depthSampler`,
   `textureSampler`, `historySampler` (HDR colour above 2.0 must not ride on a lowp sampler either). Grep `src/vfx` for any
   other `uniform sampler2D` that reads depth or HDR colour (`rtReflections.ts:24-25, 221-222`, `cinematicPost.ts:11, 24,
   29`, `paniniPass.ts:8`) and make those highp too. No other change.
B2. Explicit integer precision (LR16-1 recheck polish 3, `checks/lr16-1-recheck.md:134-136`): add `precision highp int;`
   as the first line of `LAMP_GLSL` (`bakedLamps.ts:842`, before `${LAMP_MATH_GLSL}`; global scope inside
   `CUSTOM_FRAGMENT_DEFINITIONS`) and after `precision highp sampler3D;` in `MIX_GLSL` (`:565`; the editor's volume mix,
   which has no Babylon include and whose `lampTexel` indices pass 16 bits on big maps). `tests/bounceGrid.test.ts:210-225`
   still holds (`LAMP_GLSL` contains `NS_GRID2_GLSL`).
B3. `src/world/surfaceAtlas.ts:213`: `float e = min(texel, 1.0 / 512.0) * 4.0;` - Low's normals equal Medium / High's;
   Ultra / Epic unchanged (the step is analytic: `surf()` is evaluated at `uv + e`, not fetched, so any `e` works at 256 px).
   Comment why.
B4. Tests (new `tests/glslPrecision.test.ts`): import the modules, then read `Effect.ShadersStore['taauFragmentShader']`,
   `['volumetricFragmentShader']` (and the B1 list): every `uniform ... sampler2D` line is `highp`; `LAMP_GLSL` starts with
   `precision highp int;`; `MIX_GLSL` contains it; the surface normal shader contains `min(texel, 1.0 / 512.0)`.

## Not in this build (residual, numbers for the lead / LR16g)
With A, dim lamps still give a dark top band and a firmer edge: at I 0.4 the top 0.3 m reads 0.11-0.15 and rises 0.35 ->
0.86 between 2.7 and 2.6 m under a lamp. That is the darkness curve's knee (centre 0.37, steep 12) meeting a level that
crosses 0.3-0.45 there; a lower `steep` barely helps (I 0.4: 37.7 -> 24.8 per 5 cm at steep 4, and the 0.27 card gets 1.39x
brighter), a wider `LAMP_FEATHER` helps more (0.4 -> 0.7: 28 -> 19) but takes 24% off a lamp 3 m away (pool rims, a
gameplay change). Both are light-model / look calls for LR16g and Michael, not this fix.

## Light parity
- Part A changes the bake: the meter, the guards and the picture read the same box and bytes, so they move together. Levels
  rise where rays to an embedded lamp were cut: upper walls, and bodies 2+ m from such a lamp near walls (head by the wall
  0.79 -> 1.00 in the probe). Floors and pool centres barely move (steep rays). This is the meter / guards changing because
  the picture does, as the rule requires; report every map-light test point that moves.
- Part B changes no light value on desktop (ints already 32-bit, depth already fp32); on Apple GPUs it makes TAAU / fog read
  depth as desktop does. B3 is the surface texture only: the static light (`nsS`) and the meter are untouched.

## Perf at Low
- A: no runtime cost (same taps). Bake: same cell count +/- one row per axis per lamp; atlas bytes +5% at most (report
  `fitLampAtlas` dims and bake ms before / after on warehouseOps and campusOps from the bake log).
- B: fp32 instead of fp16 for 3 texture reads per pixel in TAAU / fog on Apple GPUs (negligible); B2, B3 none at runtime
  (B3 changes the one-time atlas draw only).

## Acceptance
- `npx tsc --noEmit`, `npm run lint`, the new and re-baselined test files, `tests/lightField*`, `tests/bounceGrid.test.ts`,
  `tests/lampFalloff.test.ts`, `tests/lampAtlasFit.test.ts`, `tests/darkCurve*` pass.
- The audit test: zero embedded lamps on every map (allow-list only for the A2 lamps the lead accepts).
- The wall guard holds at I 0.9 and 0.4.
- Report `docs/sector-redesign/checks/lr16l-build.md`: files, the before / after table above re-measured on the base, every
  re-baselined number, the A2 list, bake ms / atlas dims.

## GPU check (laptop queue, `E2E_GPU=1`, port 4189, heavy.lock)
1. `e2e-lightbake` (Low and Epic bake the same bytes; new keys) and `e2e-darkness` (display targets; the Warehouse has no
   embedded lamp, so its numbers must not move).
2. `e2e-desktop:3` (every material compiles at every preset, texture-unit count, after B1 / B2), `e2e-sectorops` and
   `e2e-ctcourse` (map gates on the moved levels).
3. Sheet: `scripts/sector-lights-shots.mjs`, before (base) / after (this branch), `GFX=low SUFFIX=-low` then
   `GFX=medium SUFFIX=-medium`, into `docs/sector-redesign/checks/lr16l/`, then `--sheet`. Add rows (one wall-facing view
   each, 2 m from the wall, lamp in frame): warehouseOps lamps #33 (-13.85, 2.95, -7.40) and #122 (22.95, 5.75, 15.70);
   campusOps #81 (18.0, 2.8, 37.0) and #45 (-20, 3.9, -26.5) (add `campus: 'autostart=campusOps&mode=sector'` to the
   script's `MAPS`, as `e2e-sectorops.mjs:1735`); ctcourse #27 (99, 3.85, 7). After the master merge, add Marlow A3 (camera
   at the west lobby looking east along the corridor, x 79.5-97, z 9-12.5). Pass: no dark band with teeth above the
   fittings; Low = Medium apart from bloom.
4. Michael on the iPad (TESTING.md line for the lead): Marlow A3 corridor at Low, walls lit to the ceiling in front of each
   panel, no teeth.
