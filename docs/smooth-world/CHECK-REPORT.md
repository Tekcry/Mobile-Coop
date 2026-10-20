# Smooth world - check report

2026-10-20, laptop, fresh checker (Opus). Commit checked: 7ac815ef on master b125599e (`git diff b125599e..HEAD`).
Read: agent preamble, BRIEF, IMPL-REPORT, CLAUDE.md hard rules and current goal, the diff, and the code it touches
(`world.ts`, `bakedLamps.ts` LampPlugin, `darkCurve.ts`, `lightField.ts`, `ambientGrid.ts`, `gameState.ts`,
`menuScene.ts`, `voxelWorld.ts` roof / sky, `weather.ts`, `surfacePlugin.ts`, `navBuild.ts`, `sectorCheck.ts`).

## Verdict
NOT PASS: 1 BLOCKING item (night vision darker on the smooth level), 5 POLISH items.

## Checks (laptop)
- `npm run lint`: 0 errors, 41 warnings (pre-existing no-console).
- `npm test`: 191 files, 2096 passed, 5 skipped.
- `npm run build`: passes.
- e2e: not run (the job lead runs it under the lock). Must cover `e2e-lightbake`, `e2e-desktop` (both changed),
  smoke, `e2e-ctcourse`, `e2e-darkness`.

## Scope review
1. Flag: `flags.ts:97` `params.get('voxels') === '1'`. Default off, `?voxels=1` on, `?voxels=0` off. OK.
2. Smooth level: with `opts.voxel` null `World.create` draws the blockout through `LevelBuilder.build` in PBR with
   `SurfacePlugin` whenever `atlas` is set. Characters / weapons / menu weapon get null voxel options
   (`gameState.ts:767-769`, `menuScene.ts:436`). OK.
3. Null voxels: every use of `.voxels`, `voxelsFine`, `voxelLayers`, `skyAt`, `roofAt`, `giGroups` / `giSlotOf`, `rt`,
   chips (`onWorldHit`), `setWet`, menuScene is optional-chained or loops an empty list. No refs in photo mode,
   benchmark, editor (the editor builds its own `BakedLamps`), net client or UI. `?voxels=0` already ran this path before.
   No crash path found.
4. `?gfx=min`: `atlas` null, so no PBR, no baked lamps, no dressing; only change is boxes instead of 20 cm voxels
   (fewer draws). OK.
5. Gameplay never reads graphics state: `LightField` and `BakedLamps` take the same `bake` object
   (`world.ts:205` and `world.ts:247`); the shader's level term `nsS = grid fill + moonLight x moon + lamps` mirrors
   `LightField.levelAt`. `roofAt` / `roofGrid` are read only by `Weather`. Nav / sight lines skip `collide: false`
   dressing (`navBuild.ts:33`, `sectorCheck.ts:52`). OK.

## Light parity
- Rendered lamps and the light meter read the same bake: yes (same object, same ambient grid, same moon grid).
- `tests/smoothWorldLight.test.ts`: the real proof is the first block - shapes byte-equal, bounds, hash, registry lights
  and zones equal across voxels / smooth / smooth Low / min on Marlow Yard and the Warehouse. Since the bake is a pure
  function of those inputs, that proves identical gameplay light. The `LightField` sweep is weaker than it looks: both
  fields share ONE bake built from `on.light` (test lines 433-453), so it only re-checks the registry and doors. Not
  wrong, not a tautology overall; see POLISH 2. The e2e `e2e-lightbake` compares the real app's bake hash on
  `gfx=epic` vs `gfx=epic&voxels=1`, which closes the gap that the test's hand-copied `opts()` leaves.

## Open items judged
- a. Night vision: a regression. BLOCKING 1.
- b. Wet floors under roofs: cosmetic, and already true on `?voxels=1` for the thin pieces. POLISH 3.
- c. Indoors: the smooth level takes the ambient grid as its fill, the same term `LightField` sums, so smooth surfaces
  track the meter more closely than the voxel path (whose sky-bake fill is darker under roofs than the meter says). The
  probe's irradiance is not sky-gated but is scaled by the darkness curve (`nsR`) and the environment intensity (0.25 on
  night maps). Not a parity break. POLISH 4 (GPU shot item 3 confirms).
- d. Rain with `?voxels=1`: `World.roofAt` returns `vx.roofAt` whenever `vx.sky` exists, which the structure layer
  always bakes (only the fine layer passes `bakeSky: false`). Same behaviour; if the sky were ever missing, the grid is
  better than the old `-1e9` (rain indoors). No change.

## Fix list (ranked by impact)

1. BLOCKING - night vision dims the smooth level. `src/world/bakedLamps.ts:875-878` (and `:886`
   `finalIrradiance *= nsR * nsBF`).
   Why: `nsBodyFill` (`BODY_FILL.nv` 0.35, wrap 0.5; `darkCurve.ts:73`) applies to every `LAMP_FILL && !VOXELS`
   material. It was tuned in nv-pass slice 1 so bodies sit at the voxel walls' brightness. On the smooth default the
   level material has no `VOXELS` define, so under the goggles a wall keeps ~0.26 of its fill (ny 0), a floor 0.35, and
   the probe irradiance the same. In fill-only areas (the dark places night vision is for) the level is ~3-4x darker
   than with `?voxels=1`, whose walls keep their sky fill unscaled. Michael already said "I cant see properly at night".
   Minimal fix: add a `LAMP_LEVEL: false` define to `LampPlugin`'s super() defines (`:619`); in `prepareDefines` (`:641`)
   set it for the level material (e.g. `this._material.name.startsWith('levelMat-')`, made at `levelBuilder.ts:438`, or a
   `metadata` mark set there); in the shader use `float nsBF = 1.0;` under `LAMP_LEVEL`, else `nsBodyFill(...)`. Bodies,
   weapons and props keep the cap.
   Done looks like: the level material compiles with `LAMP_LEVEL`, character / prop materials without it; `e2e-lightbake`
   (or a small read in it) asserts the define on `levelMat-*`; GPU shot (desktop) of NV on Marlow Yard default vs
   `?voxels=1`: the smooth walls are not darker; bodies still not glowing.

2. POLISH - the parity test's sweep shares one bake. `tests/smoothWorldLight.test.ts:433-453`.
   Why: both `LightField`s use the bake from `on.light` / `on.b.lights`, so the sweep cannot catch a difference in the
   bake inputs (the shape check above does).
   Done looks like: bake twice (from `on` and from `off`) and compare `lightBakeHash`, or build the `off` fields from an
   `off` bake.

3. POLISH - wet floors under roofs in rain. `src/world/surfacePlugin.ts:149`.
   Why: `surfWet` has no sky gate on the smooth level (thin pieces on `?voxels=1` had the same). Cosmetic.
   Done looks like: wetness x open-sky (the moon grid or `World.roofAt` vs height) in the shader; floors indoors dry.

4. POLISH - probe irradiance not sky-gated on level surfaces. `src/world/bakedLamps.ts:886`.
   Why: indoors the image-based fill is the room-centre capture. Damped by `nsR` and 0.25 at night; check in the GPU
   shots (item 3) that roofed rooms are not brighter than the meter.
   Done looks like: GPU shot matches the meter; if not, scale `finalIrradiance` by the moon visibility on the level.

5. POLISH (perf) - moving casters indoors still draw into the moon cascades on the smooth path.
   `src/world/world.ts:335` (`if (vx?.sky && ...)`).
   Why: the indoor cull needs the voxel sky; without it every moving caster under a roof costs cascade draws, invisible
   because the sun is x baked moon visibility (0 indoors).
   Done looks like: the cull uses `this.roofAt(x, z) > top` (the grid) when there is no sky bake; draws lower in perf.

6. POLISH - fog shafts read the moon's visibility (along the moon direction) instead of straight-up sky visibility
   (`src/game/gameState.ts:508`). Shafts land slightly offset from the skylights. Cosmetic.

## Re-check (fix round, 12a602dd)
2026-10-20, laptop, fresh checker (Opus), logic only. Reviewed `git diff 7ac815ef..12a602dd -- src tests scripts`.
Lint / unit / build taken as reported (0 errors, 2098 pass, build pass); no e2e run here.

**Verdict: PASS.** No BLOCKING items.

1. BLOCKING 1 fixed. `LAMP_LEVEL: false` is in `LampPlugin`'s super() defines (`bakedLamps.ts:629`), set in
   `prepareDefines` from a `metadata.lampLevel` mark (`:658`). `levelBuilder.ts:452` marks only the PBR `levelMat-*`
   (atlas branch); the StandardMaterial branch (`?gfx=min`) is untouched. GLSL: a plain `#ifdef / #else / #endif`
   nested inside `#if defined(LAMP_FILL) && !defined(VOXELS)`, each branch declares `nsBF` once; the probe line
   `finalIrradiance *= nsR * nsBF` (`:903`) then keeps the level's full irradiance too. Bodies, weapons and props are
   unmarked and keep `nsBodyFill`. VOXELS materials skip the block as before.
   Note (not blocking): on `?voxels=1` the thin pieces still drawn by `levelMat-*` now also skip the cap, which matches
   their voxel walls; GPU shot of NV on default vs `?voxels=1` still pending (desktop).
2. Parity test: `bakeFrom` runs the full bake (ambient grid, moon, lamps) from each prepared builder's own shapes and
   registry; the test compares `lightBakeHash` (lamp boxes + vis, moon vis, ambient data, moonLight) and the baked ids,
   and each `LightField` reads its own bake. POLISH 2 closed.
3. Roof-grid moon cull (`world.ts:342-349`): only runs with the baked moon and no voxel sky. `World.roofAt` builds the
   grid lazily from `level.light` (always present); outside the grid `roofAt` returns -1e9, so no crash and no cull. A
   caster is culled only if its own column and all four 1.5 m neighbours have a shape top above it, so an outdoor
   caster (open column) is never culled. Minor gap vs the voxel path: no `skyAt` check, so under a high open-sided
   canopy where the slanted moon still reaches, a character's moon shadow can drop. Cosmetic; polish list if seen.
4. `e2e-lightbake` assertion runs on the `gfx=epic` config only, so the voxel config and `gfx=min` cannot false-fail it.
   It waits up to 30 s for a ready `levelMat-*` effect carrying `BAKED_LAMPS`, then needs `LAMP_LEVEL` there and on no
   other lamp-plugin effect. Sound.

## Re-check 2 (fix round 2, 9e90750c)
2026-10-21, laptop, fresh checker, logic only. Read IMPL-REPORT "Fix round 2", `git diff 12a602dd..9e90750c -- src tests
scripts` (2 commits: 1de3b40b docs, 9e90750c fix). Verdict: PASS.
1. Formula parity: `LAMP_SKY` (`bakedLamps.ts:926-933`) is the VoxelPlugin fill term for term: mix(ground, sky, n.y x
   0.5 + 0.5) x (0.12 + 0.88 x vis) x albedo, sky sampled 0.6 cells off the face; colours are `hemi.diffuse` /
   `hemi.groundColor` x `hemi.intensity` x pi, as `World` gives `setFill` (`world.ts:164-167` vs `:255-258`). Probe
   irradiance and reflections x (0.35 + 0.65 x vis) on top of nsR (nsBF = 1 under LAMP_LEVEL), as `vxRefl`. The hemi is
   still subtracted (`:847-848`) and the flat grid fill is in the `#else` only. Constants shared from `levelFill.ts`;
   VoxelPlugin values unchanged. Not modelled: the voxel `shade` (AO / tone) factor, documented.
2. Unchanged paths: LAMP_SKY needs `isLampLevel` (only the PBR `levelMat-*`) plus `lamps.level` and `skyTex`; the sky
   job runs only with `!vo && atlas && flags.baked` (`world.ts:243`), so `?voxels=1` (thin-piece levelMat included)
   and `?gfx=min` (atlas null) get `level: null`. VOXELS materials take the outer `#else` (nsEnv = 1).
3. GLSL: LAMP_SKY in the super() defines, `lampSky` declared under `#ifdef LAMP_SKY` and in `getSamplers`, 4 vec4s in
   the UBO list and the fragment declarations, bound under the same condition as the define. `nsEnv` declared once in
   every branch. Texture units (estimate, compiled list): PBR reflection + BRDF 2, surf 2, lampVis / lampData / lampMoon
   / lampAmb / lampSky 5 (volume is null on this path), sun CSM PCF 1, flashlight shadows <= 2 (`BAKED_SHADOWS`), the
   cluster <= 2: about 14 of 16. Not blocking; `e2e-desktop` texProbe (<= 16 at Epic, alerted) is the proof and must run.
4. Render only: `skyTex` / `level` are read only by LampPlugin; gameplay, the light bake and `lightBakeHash` are
   untouched. No lights: the job's result is dropped, `.catch(() => null)` swallows failures (inline-pool throws
   included), the pool is disposed in `finally`; an empty shape set gives a 1x1x1 grid. A rejected bake leaves the old
   grid fill (LAMP_SKY off). Minor: the job also runs (wasted, ~0.1-0.6 s in a worker) on maps with no lamp bake.
5. `levelFillParity.test.ts` is a real comparison: two independent sky bakes (the voxel layer's shapes on its grid vs
   the canonical shapes filtered and laid out by `skyShapes` / `skyGridFor`), compared at 7 points, plus a roofed /
   open sanity check on the voxel bake. Gaps: it re-implements `smoothSky`'s three lines instead of calling it, and
   cannot check the GLSL (covered by the shared constants and `e2e-lightbake` LAMP_SKY assert).
Still needed (desktop): e2e-lightbake, e2e-desktop texture count, and the default vs `?voxels=1` wall re-shoot.
