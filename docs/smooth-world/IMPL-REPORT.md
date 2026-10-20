# Smooth world - implementer report

2026-10-20, laptop, implementer (Opus). Scope: BRIEF 1-6. Nothing committed (the job lead commits).

## What was built
1. `flags.voxels` defaults off; `?voxels=1` turns it on, `?voxels=0` stays off (`src/core/flags.ts`, doc comment updated).
2. Smooth level path. With no voxel options `World.create` already fell back to `LevelBuilder.build`'s blockout. Verified
   what it draws: every visible box as one thin-instanced box mesh and every cylinder as one thin-instanced 12-sided
   cylinder mesh (2 draws), in the PBR level material with `SurfacePlugin` (triplanar CC0 atlas) and a per-instance
   `surf` kind (`pieceKind`: floors by the footstep surface, the rest by colour) whenever `atlas` is set, i.e. on every
   preset but `?gfx=min`. No gap there. Props (`PartLibrary(scene, atlas)`) are PBR with part surfaces. The box detail
   pass draws at the Detail tier on the smooth path, including maps with an art layer (Warehouse), because the skip is
   only `voxelSize && art`. Characters, weapons and props: `setCharacterVoxels` / `setVoxelWeapons` / `setVoxelProps`
   already get null when `flags.voxels` is off (module defaults are null too).
   New: `LevelBuilder.prepare(name, opts)` - the Babylon-free part of `build` (dressing pass, voxel split, canonical
   light shapes), called by `build`; `LevelBuildOptions` exported. Behaviour unchanged.
3. Light parity.
   - `bakeLevelLight` was already built with or without voxels from the canonical shapes (`canonicalLightShapes` drops
     `detail` pieces and re-adds the Medium dressing itself, so the dressing on either path never changes it). Confirmed
     and now unit-tested.
   - `BakedLamps` now builds on every non-cheap path (`bake.lamps && flags.baked && atlas && !opts.cheap`), not only with
     voxels. Same block as before: `LampPlugin` on every `PBRMaterial` (`attachAll`, later materials on the next frame),
     darkness curve, ambient grid fill, baked moon (`useBakedMoon`: static moon shadows from the bake, cascades hold only
     moving casters), closed doors, `LightRig.setBaked` (pools keep only flashlights).
   - Sky fill: on the smooth path the level material is a non-voxel surface (no `VOXELS` define), so `LampPlugin`
     subtracts the hemisphere and adds the ambient grid (`LAMP_FILL && !VOXELS`): no bright hemisphere under roofs.
   - `useBakedMoon` / `voxelSun`: works without voxels (clears `sunStatic`; `setCasterMode` no-ops without a proxy).
   - GI: voxel only, off (no `giSlotOf`). RT reflections: `PostStack` already falls back to SSR when `opts.rt` is null
     (lines 295 / 334 / 352); no crash path. Chips: voxel only; `onWorldHit` stays null so hits use decals.
   - Rain: `SurfacePlugin.wet` still set on the level material; `setWet` loops over an empty `voxelLayers`.
   - Rain occluder: new `World.roofAt(x, z)` - the voxel sky bake's roof with voxels, else `world/roofGrid.ts` (pure,
     0.5 m columns, the top of the highest canonical shape over each column, built on first use). `GameState` always sets
     `weather.occluder = world.roofAt` (before: no occluder without voxels, so rain would fall indoors).
   - Fog light shafts: without the sky bake, `PostStack.sky` reads the baked moon's visibility (`world.lamps.moonTex`,
     same R8 3D layout); before, they would vanish.
4. `?gfx=min` unchanged: standard materials, no atlas, no baked lamps, no dressing. Note: it also loses its 20 cm voxels
   by default (it follows the flag), so the test path now draws the blockout boxes (2 level draws instead of chunk meshes).
5. Menu: `menuScene.ts` 436 already gates on `flags.voxels`; with the new default the menu weapon is smooth; the hero is
   Wren's baked model (never voxel).
6. Gameplay never reads graphics state: grep of `src` for `.voxels`, `voxelLayers`, `roofAt`, `skyAt`, `world.lamps`
   outside `world/`, `voxel/` and the render parts of `gameState.ts` found nothing in AI, perception, the light meter or
   net. The light meter / perception read `LightField` (the canonical bake). `navBuild` reads `level.boxes` but skips
   non-colliding pieces (the detail pass is `collide: false`); its `top` bound only grows by a metre over the tallest box.

## Files changed
- `src/core/flags.ts` - default off, comment.
- `src/world/levelBuilder.ts` - `prepare`, `LevelBuildOptions`.
- `src/world/world.ts` - BakedLamps gate, `roofAt`, comments.
- `src/world/roofGrid.ts` (new) - pure rain roof grid.
- `src/game/gameState.ts` - rain occluder, fog shafts from the baked moon, comments.
- `tests/smoothWorldLight.test.ts` (new).
- `scripts/e2e-desktop.mjs` - parts 3 and 4 (the voxel renderer and RT) pass `&voxels=1`.
- `scripts/e2e-lightbake.mjs` - a 4th config `gfx=epic&voxels=1`; asserts smooth Epic has no voxels, both Epic paths draw
  the baked lamps with the plugin on every PBR material, the same bake hash, and smooth Epic at Ray traced falls back to SSR;
  waits for the player + 6 frames before reading.
- `scripts/perf.mjs` - comment only (gfx=min no longer 20 cm voxels).
- `docs/systems/graphics-quality.md`, `docs/systems/lighting.md` - the new default (short).

## Parity test (`tests/smoothWorldLight.test.ts`, ~3 s)
- Marlow Yard (`ctcourse`) and the Warehouse (art layer) prepared four ways (Epic + `voxels=1`, Epic smooth, Low smooth,
  `gfx=min`): canonical shapes byte-equal, bounds and hash equal, light registry lights and zones equal.
- Warehouse: the box dressing exists only on the smooth path, the hash still matches.
- Marlow Yard baked in node (as `ctcourseLight.test.ts`); a `LightField` from each builder's registry and doors: equal
  `bodyLevel` / `levelAt` at 10 named points (S8 exit lit, route, dark corners, airlocks doors shut, S5 back room under
  the roof, surfaces) and a sweep of ~5000 points at 3 heights with doors open and shut. The sweep covers lit (>= 0.6),
  mid and dark (< 0.28) readings.
- `roofGrid`: open yard ~ground, S5 back room roofed above 2.2 m, outside the grid open.

## Checks (laptop)
- `npm ci` (the worktree had no node_modules; project lockfile only).
- `npm run lint`: 0 errors (41 warnings, all pre-existing no-console).
- `npm test`: 191 files, 2096 passed, 5 skipped.
- `npm run build`: passes.
- e2e: skipped. `C:/NightShift/heavy.lock` was held ("Night Shift | Character Build | runner: animtuner-pr56-a361fdea-solo").
  The job lead's full e2e must cover `e2e-lightbake` (changed) and `e2e-desktop` (changed), plus smoke / ctcourse.

## Perf
No headless draw-call numbers taken (no e2e run). Pending desktop GPU run. Expectation: the smooth level is 2 thin-instance
draws (+ dressing in the same 2) per pass instead of dozens of voxel chunk meshes, and characters / weapons skip the voxel
bodies, so draws should fall; the baked lamps cost the same per pixel as on the voxel path.

## Off without voxels (A2 / A3)
- A2: no sky-visibility fill on level surfaces; the ambient grid via `LampPlugin` fills instead (as characters and props).
- A3: no voxel chips (decals), no voxel GI, no RT reflections (SSR instead).
- Also: the rain wet look (`SurfacePlugin.wet`) is not sky-gated, so floors under roofs look wet in the rain too.
- The probe's image-based irradiance on level surfaces is not scaled by sky visibility (the voxel plugin did that); it is
  still scaled by the darkness curve. Same as characters and props today.

## Open items
- e2e not run here (lock held): `e2e-lightbake`, `e2e-desktop`, smoke, `e2e-ctcourse`, and the full run.
- Night vision: `nsBodyFill` (cap on the flat fill under the goggles, meant for bodies) now also applies to the level boxes
  on the smooth path, so walls and bodies scale alike under NV. Look at it in GPU shots.
- Wet floors indoors in rain (above). Fix if it reads wrong: gate `SurfacePlugin.wet` by `roofAt` / the moon grid.

## For Michael / the desktop GPU shots (`?voxels=1` vs default)
1. Marlow Yard and the Warehouse at Epic and Low: walls, floors and props textured (surface atlas), no voxel steps.
2. Lamp pools match between the two (same bake): the light meter reading at a pool edge should match what is seen.
3. Indoors under a roof (S5 back room, Warehouse interior): dark like `?voxels=1`, not sky-lit.
4. Night vision on: walls versus bodies brightness.
5. Rain (`?weather=rain` on a map that allows it): no streaks under roofs; floors indoors wet (known).
6. Fog: moonlit shafts still show under openings.
7. Reflections set to Ray traced on the default: SSR instead, no errors.
8. Draw calls and frame time, default vs `?voxels=1` (`perf.mjs --desktop`, `E2E_GPU=1`).
9. Menu: the weapon beside Wren is smooth.

## Fix round (after CHECK-REPORT, on 7ac815ef)
1. BLOCKING fixed - night vision no longer dims the smooth level. `bakedLamps.ts`: `markLampLevel(m)` / `isLampLevel(m)`
   (a `metadata.lampLevel` mark) and a `LAMP_LEVEL` define in `LampPlugin` (`prepareDefines`); the shader uses
   `nsBF = 1.0` under `LAMP_LEVEL`, else `nsBodyFill` as before. `levelBuilder.ts` marks the PBR `levelMat-*` material.
   Bodies, weapons and props stay unmarked and keep the `BODY_FILL` cap. Voxel materials are unchanged (`VOXELS` path).
   Tests: new `tests/lampLevel.test.ts` (NullEngine: a marked material gets `LAMP_LEVEL`, an unmarked one does not, the
   mark keeps other metadata, the shader branch is present); `scripts/e2e-lightbake.mjs` asserts on smooth Epic that the
   compiled `levelMat-*` effect has `#define LAMP_LEVEL` and no other lamp-plugin effect does.
2. POLISH done - `tests/smoothWorldLight.test.ts` bakes twice (from the voxels-on builder and the voxels-off builder),
   asserts `lightBakeHash` equal and the baked ids equal, and each `LightField` reads its own path's bake. File runs in
   ~8.5 s.
3. POLISH done (perf) - `World.updateSunCasters`: without a voxel sky bake and with the baked moon on, a moving caster
   whose column and the four 1.5 m neighbours have a roof above it (`World.roofAt`, the roof grid) leaves the moon
   cascades. The cheap path (no baked moon) keeps every caster as before.
- Left for the polish list (`POLISH.md`): check items 3 (wet floors under roofs), 4 (probe irradiance indoors),
  6 (fog shafts follow the moon's direction).
- Checks: `npm run lint` 0 errors (41 pre-existing warnings); `npm test` 192 files, 2098 passed, 5 skipped;
  `npm run build` passes. No e2e (job lead). Pending desktop GPU: NV on Marlow Yard default vs `?voxels=1` (smooth walls
  not darker, bodies not glowing).

## Fix round 2 (GPU shots, on 1de3b40b)
Desktop shots: smooth walls read clearly brighter than voxel walls under the same light (Marlow Yard annex walls light
grey vs dark grey at meter 1; the rain-roof moonlit wall bright vs dark).

Terms compared (VoxelPlugin + LampPlugin with VOXELS vs SurfacePlugin + LampPlugin with LAMP_LEVEL):
- Fill (the cause, the big one): voxels take the hemisphere's colours (sky white, ground x 0.6, x the theme's `ambient`
  0.25) mixed by the normal, x (0.12 + 0.88 x sky visibility), the hemisphere light excluded. The smooth level took the
  flat gameplay ambient grid x `LEVEL_TO_RENDER` (0.25 x 1.33 = 0.33, no normal or sky term): about 4x the voxel fill on
  open walls and 10-20x under the annex roof (model numbers below).
- Image-based light (second): voxels scale the probe's irradiance and reflections by 0.35 + 0.65 x sky visibility; the
  smooth level did not (full room-centre capture indoors).
- Same on both (no change): baked lamps and moon (same plugin code), the darkness curve (reads the gameplay level on
  both), directIntensity pi, environmentIntensity 0.6, metallic per surface kind, no leftover hemisphere (the smooth
  path subtracts it). Albedo: the same piece colours linearised; atlas detail strength 0.5 vs 0.45, cavity 0.35 vs 0.3,
  the voxel tone hash averages 1.0, the smooth per-piece jitter 0.99: within a few percent. Not changed.

Fix:
- `src/world/levelFill.ts` (new, pure): the fill and image-based light formulas and constants (`SKY_FILL_FLOOR` 0.12,
  `ENV_FLOOR` 0.35, `SKY_OFFSET` 0.6), `levelFillColors`, `levelFill`, `envScale`, `sampleSky` (a CPU model of the
  linear 3D texture tap), `skyShapes` (the pieces the voxel structure layer holds: >= 1.5 voxels thick) and `skyGridFor`
  (the voxel path's sky grid layout: origin on the 5 cm brick grid, whole chunks; float32-safe).
- `VoxelPlugin`: the same numbers now come from `LEVEL_FILL_GLSL` (values unchanged).
- `World.create` (smooth, non-cheap, baked): `smoothSky` bakes sky visibility (`bakeSky`, one worker job beside the light
  bake, about 0.1-0.6 s per map measured in node) from the canonical shapes filtered and laid out as the voxel path
  would, and passes it with the hemisphere's sky / ground fill colours to `BakedLamps` (`BakeExtras.level`). Rendering
  only; gameplay and the light bake are untouched.
- `BakedLamps` / `LampPlugin`: a `LAMP_SKY` define (the `LAMP_LEVEL` material with a level fill): the level's fill is the
  voxel formula by the sky texture (`lampSky`) instead of the flat grid, and `finalIrradiance` / `finalRadianceScaled`
  are scaled by the same 0.35 + 0.65 x visibility. Bodies, weapons and props are unchanged (grid fill, NV cap).

Test: `tests/levelFillParity.test.ts` (Babylon-free, ~1 s). Marlow Yard, both sky bakes (voxel shapes on the voxel grid;
canonical shapes through `skyShapes` / `skyGridFor`), 7 points (annex front wall inside, annex grid wall, annex floor,
the front wall outside under the roof lip = rain-roof, S8 obstacle wall by the exit lamp, S2 obstacle wall, open yard
floor). Smooth vs voxel: sky visibility equal to 0.01 at every point; fill and image-based scale within 10% (in fact
equal). The old flat fill vs the voxel fill: 0.333 vs 0.017 (annex walls, 20x), 0.030 (annex floor, 11x), 0.083
(rain-roof wall, 4x), 0.089 (S8 wall, 3.7x), 0.129 (yard floor, 2.6x); the test asserts > 4x roofed, > 1.5x open.
Not modelled (desktop shots): the probe's captured cube itself (it renders whichever level is drawn, so the smooth
capture may still differ), the atlas texture values, per-voxel AO in corners and the voxel worn edges.
`scripts/e2e-lightbake.mjs` also asserts the smooth level effect compiles `LAMP_SKY`.

Checks: `npm run lint` 0 errors (41 pre-existing warnings); `npm test` 193 files, 2101 passed, 5 skipped; `npm run
build` passes. No e2e, no GPU runs (laptop).
Perf: not measured (the draw counter is cumulative and frame time sits at vsync on the desktop shots). Cost added: one
sky bake job at load, one R8 3D texture, one 3D tap per level pixel.
Open: a map with no lights builds no `BakedLamps`, so its smooth level still takes the plain hemisphere (no sky term),
as `?voxels=0` did before this job. Desktop: re-shoot the annex and rain-roof walls, default vs `?voxels=1`.
