# voxel-retire - build plan (strict brief for a Sonnet 5.5 implementer)

One slice. Start from `docs/systems/agent-preamble.md`, then `BRIEF.md` (limits and A1..A10). Line numbers are
master f5912402; re-find by the quoted text if they moved. Branch guard before every write:
`cd /c/NightShift/Mobile-Coop-voxel-retire && test "$(git rev-parse --abbrev-ref HEAD)" = feature/voxel-retire && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-voxel-retire"`.
Do not commit (the job lead does). Do not touch `src/net`, `PROTOCOL_VERSION`, `src/save`, `core/settings.ts`,
`core/governor.ts`, `core/spikes.ts`, `world/lightRig.ts`, `weapons/ballistics.ts`, `vfx/vfx.ts`, or the KEEP files
below except where a step names them.

## KEEP (light bakes and what they need; untouched unless a step says so)
`src/voxel/lampBake.ts`, `lampJobs.ts`, `lampVolume.ts`, `lightShapes.ts`, `skyBake.ts` (incl. its GI code, A5),
`shapes.ts` (edited in step 3 only), `workerPool.ts` + `voxelWorker.ts` (edited in step 3 only).
Readers that stay: `world/lightBake.ts`, `world/bakedLamps.ts`, `world/lightField.ts`, `world/roofGrid.ts`,
`world/levelFill.ts`, `world/levelBuilder.ts` (canonicalLightSet), `editor/lightView.ts`, `player/smoothBody.ts`.

## Step 1 - delete these files (git rm)
src/voxel: `voxelWorld.ts`, `voxelPlugin.ts`, `voxelCache.ts`, `chunk.ts`, `mesher.ts`, `brickmap.ts`,
`levelVoxels.ts`, `programs.ts`, `meshVoxels.ts`, `voxelBody.ts`, `voxelBodyPlugin.ts`, `voxelGroup.ts`.
Also: `src/vfx/rtReflections.ts`, `src/world/maps/warehouseArt.ts`.
Tests: `tests/voxelFit.test.ts` (also deleted by #226; fine), `tests/losParity.test.ts`, `tests/levelFillParity.test.ts`.
Renames (keep only the named blocks, step 6): `git mv tests/voxel.test.ts tests/shapes.test.ts`,
`git mv tests/voxelArt.test.ts tests/skyBake.test.ts`.

## Step 2 - helpers that move out of deleted files
- `src/world/bakedLamps.ts:2` `import { dropCpuCopy } from '../voxel/voxelWorld';` -> delete the import and add at the
  bottom of bakedLamps.ts the same function, not exported:
  `/** Free a texture's CPU copy once uploaded (the bake's pools are large). */ function dropCpuCopy(t: { getInternalTexture(): unknown } | null): void { const it = t?.getInternalTexture() as { _bufferView?: unknown } | null | undefined; if (it) it._bufferView = null; }`
  (body verbatim from `voxelWorld.ts:553-556`). Line ~858 and ~927: `#if defined(LAMP_FILL) && !defined(VOXELS)` ->
  `#if defined(LAMP_FILL)` (VOXELS is never defined now; same shader).
- `src/world/levelFill.ts`: add (A6; values copied from brickmap BRICK 8, levelVoxels CHUNK 128 / MIN_VOXELS 1.5,
  VOXEL_TIER.epic.size 0.05, voxelWorld SKY_CELL 0.5 - so the smooth sky grid is unchanged):
  ```ts
  /** The smooth sky bake's grid (voxel-retire: the old 5 cm structure grid kept, so the sky cells are unchanged). */
  export const SKY_CELL = 0.5;
  export const SKY_GRID = { size: 0.05, brick: 8, chunk: 128, minThick: 1.5 } as const;
  ```

## Step 3 - kept voxel-folder files
- `src/voxel/shapes.ts`: delete `import { runProgram } from './programs';` (l.9); delete `coarseShapes` with its doc
  comment (l.86-101); in `rasterise` delete `const prog = ...` and `q0..q3` (l.186-190) and the `if (prog) { ... }`
  block (l.218-222), leaving `let m = mat;` then the Fill / Paint lines. Keep the `prog` / params fields and
  `packShapes` writing `s.prog ?? 0` (l.79): the packed layout and every bake hash stay identical. Fix doc comments
  that name programs or voxel levels (wording only).
- `src/voxel/workerPool.ts`: delete l.5 (chunk import), drop `ChunkJob` / `ChunkResult` from `Job` / `Result` (l.9-10),
  delete `run()` (l.46-52); header comment: "Bake worker pool: sky, lamp and moon bakes ...".
- `src/voxel/voxelWorker.ts`: delete l.2 (chunk import), drop `ChunkJob` from the message type (l.6), and replace the
  chunk fallthrough (l.24-25) with nothing (the three `kind` branches stay; an unknown job is ignored). Header: "Bake
  worker: the sky, lamp and moon bakes off the main thread".

## Step 4 - src edits
- `src/core/flags.ts`: delete the `voxels` field and its comment (l.25-27) and `voxels: params.get('voxels') === '1',` (l.111).
- `src/core/quality.ts`: delete `VOXEL_TIER` and its comment (l.135-144). l.14 comment -> "Reflections: none, screen
  space, or 'rt' (kept for saved settings: runs screen space since voxel-retire)."; l.103 comment: drop "(the voxel
  level)" wording only.
- `src/world/mapDef.ts`: delete `import type { VoxelArt }` (l.6) and the `art?: VoxelArt;` field + comment (l.117-118).
- `src/world/maps/warehouse.ts`: delete l.6 (`import { warehouseArt }`) and l.534 (`art: warehouseArt,`).
  `src/world/maps/warehouseS2.ts:24` comment: drop the `warehouseArt.ts` reference.
- `src/world/levelBuilder.ts`: delete l.38 (levelVoxels import); BuiltLevel `voxels` field + comment (l.120-121);
  LevelBuildOptions `voxelSize`, `fineSize`, `art` (l.133-135). `prepare` (l.539-555): doc "the visual-only dressing
  pass and the canonical light shapes"; return type `{ light: BuiltLevel['light'] }`; l.550 condition ->
  `if (dressing && opts.detail)`; delete l.546-547 and l.551-552 comments/code; return `{ light: canonicalLightSet(...) }`.
  `build`: l.559 `const { light } = this.prepare(name, opts);`; l.607 drop `&& !voxels?.voxelBox[i]`; l.642
  `if (!voxels?.voxelCyl[i]) {` -> unconditional (remove the if, keep its body; keep braces balanced); l.742 delete
  `voxels,`. Fix comments at l.63, 326, 345 that list "voxels" (wording only).
- `src/world/partLibrary.ts`: delete l.20 (VoxelBodyPlugin import) and l.108 `new VoxelBodyPlugin(this.skinMaterial);`;
  l.106 comment -> "merged skinned bodies (guard-render S1 smooth bodies; not frozen until set up)".
- `src/player/characterRig.ts`: delete l.2 (VoxelBody import); delete l.200-204 (`VOXEL_BODY`, `setVoxelBodies`);
  l.1329-1333 -> keep the `skin` line and make the smooth branch the only one:
  `if (opts.merge && this.style === 'detailed' && skin) this.voxel = buildSmoothBody(scene, this.root, this.parts, name);`
  (comment: "(guard-render S1) opted in (guards): the parts merged into one rigidly skinned smooth mesh");
  l.1338-1339 -> `/** The merged smooth body (guard-render S1; null: the parts render). */ voxel: SmoothBody | null = null;`
  (A2: name kept). l.1341 comment: "the merged body's meshes, else the parts". Calls at l.1348, 1716, 4372-4396, 4420
  stay (SmoothBody has the same methods). If `VoxelBodyOptions` / `InstancedMesh` / `Material` imports go unused, drop them.
- `src/operators/runtime/playerFigure.ts`: import l.12 -> `import { CharacterRig, type PartFactory } ...`; delete
  l.23 (`type VoxelOpts`), l.30-36 (`characterVoxels`, `setCharacterVoxels`); l.61-67 -> just
  `const rig = new CharacterRig(scene, make, look, PLAYER_HEIGHT, name, { build: 'average', style: 'detailed' });`
  (no try / finally). Header l.7-8: drop ", and no voxel body is built for it".
- `src/weapons/weaponModel.ts`: delete l.2 (VoxelGroup import), l.49-53 (`VOXEL_WEAPONS`, `setVoxelWeapons`),
  l.182 (`if (VOXEL_WEAPONS ...) this.voxel = ...`), l.262-263 (`voxel` field), l.830 (`this.voxel?.dispose();`);
  l.267 -> `return this.mesh ? [this.mesh] : this.parts;`; l.177-179 comments: keep only the baked-mesh note. If the
  `skin` const (l.178) becomes unused, delete it and any now-unused `InstancedMesh` / `Material` type imports.
  l.15, 185, 779 comments: drop "voxel" wording.
- `src/weapons/grenades.ts`: delete l.11 (voxeliseParts import) and l.53-54 (comment + call).
- `src/world/menuScene.ts`: l.30 import -> `import { WeaponModel } from '../weapons/weaponModel';`; delete l.435-437
  (comment, `const vox`, `setVoxelWeapons(...)`); comments l.612, 623 drop voxel wording. Remove the `flags` import
  only if nothing else in the file uses it.
- `src/vfx/postStack.ts`: delete l.22 (RtReflections import), the `rt?:` option + comment (l.156-157), the `rtr`
  field (l.169), the rt block (l.353-356), `this.rtr?.frame();` (l.467), `this.rtr?.dispose();` (l.504),
  `this.rtr = null;` (l.519). l.296 and l.335 conditions: `(f.reflections === 'rt' && !this.opts.rt)` ->
  `f.reflections === 'rt'` (A3: 'rt' is screen space). l.153 comment: "Sky visibility (the baked moon) for the fog's
  light shafts". l.486-487 comment: drop the ray-traced sentence.
- `src/game/gameState.ts`:
  - imports: delete l.10 (`setCharacterVoxels`), l.12 (`setVoxelWeapons`), l.13 (`setVoxelProps`); l.4 ->
    `import { World } from '../world/world';`; l.60 -> `import { type QualityLevel } from '../core/quality';`
    (drop `VOXEL_TIER`); l.14 `LOD_DISTANCE` and l.5 `flags`: delete only if unused after the edits (eslint says).
  - delete l.500-501 (voxel chips: the `onWorldHit` assignment and comment).
  - delete l.546 `const vx = world.voxels;`; l.554-556 `sky:` -> keep only the baked-moon branch:
    `sky: world.lamps?.moonTex && world.lamps.moon ? { tex: world.lamps.moonTex, origin: world.lamps.moon.origin, cell: world.lamps.moon.cell, dims: world.lamps.moon.n } : null,`
    with comment "fog: moonlit shafts under the skylights and through the doors (the baked moon's visibility)";
    delete l.558-560 (`rt:` and its comment). l.565 comment: "(no rain under roofs: the canonical shapes' tops)".
  - keep `rtCapsules` (l.824-831) and `rtCapsule` (l.3381): `world.lamps.capsules` uses them (soft character shadows).
    l.824 comment -> "Characters for the baked lamps' soft shadows: upright capsules (the player, then the living guards)."
  - `create` l.835-847 -> 
    ```ts
    const q = app.quality.level;
    // (`?gfx=min`: the blockout's boxes in standard materials; every other preset draws them smooth - PBR with the
    // surface atlas and baked lamps)
    const plain = q.minimal;
    const world = await World.create(app.engine, opts.map, { seed: opts.seed, detail: q.minimal ? undefined : q.features.detail, cheap: plain });
    ```
  - l.897 delete `for (const v of this.world.voxelLayers) v.setWet(wet);`.
  - l.2062 delete `private spikeLod = 0;`; l.2074-2077 delete the `lod` loop and its `SPIKE_EVENT.lod` lines (A4).
- `src/world/world.ts`:
  - imports: delete l.37 (`GI_STRIDE`), l.42 (`SKY_CELL, VoxelWorld`), l.44 (`CHUNK, MIN_VOXELS, VOXEL_VERSION`),
    l.46 (`BRICK`); l.38 drop `VOXEL_TIER`; l.45 -> `import { SHAPE_STRIDE, shapeBounds } from '../voxel/shapes';`
    (drop `packShapes`); l.47 -> `import { SKY_CELL, SKY_GRID, skyGridFor, skyShapes } from './levelFill';`. Keep
    `WorkerPool` (l.43). Then drop any Babylon import the removed code alone used (`CreateBox`, `CreateCylinder`,
    `Quaternion`, `Matrix`, `StandardMaterial` - check each; StandardMaterial is still used by `addLightProbe`).
  - delete `WorldOptions.voxel` (l.65-66), `VoxelOptions` (l.69-81), `GI_SLOTS` + `giLights` (l.83-100), `VOXEL_LOD`
    (l.102-103), `PROXY_LAYER` (l.106-107; keep the l.105 class doc line).
  - constructor: delete params `voxels`, `voxelsFine` + comment (l.140-142); delete the fill loop l.162-170; l.181 and
    l.191 (voxel meshes into casters / probe).
  - `create`: delete l.222 (`vo`); l.223 -> `b.build(scene, map.id, { atlas: atlas ?? undefined, floor: map.theme.floor ?? 'concrete', detail: opts.detail, dressing: dressingOn(map) })`;
    delete l.224-235 (the voxel build); l.239-241: comment "(rendering only) the smooth level's sky visibility: its
    fill and image-based light follow it (`world/levelFill.ts`)", code `const skyJob = atlas && flags.baked ? smoothSky(level.light).catch(() => null) : null;`;
    l.243 -> `new World(scene, map, level, layout, atlas, bake)`; comments l.244-251 drop the voxel clauses; delete l.263
    (`giSlotOf`). l.210 comment: drop "and voxel cache".
  - `roofAt` (l.302-312): delete the `vx` lines (l.307-308); doc "the canonical light shapes' tops (built on first use)".
    Delete `voxelLayers` getter (l.314-317).
  - `updateSunCasters`: delete l.348 (`const vx`) and the `if (vx?.sky ...) {...}` branch (l.365-371); l.372
    `} else if (this.bakedMoon && m.isEnabled()) {` -> `if (this.bakedMoon && m.isEnabled()) {` (body unchanged).
  - `useBakedMoon`: delete l.399 (`this.voxelSun.length = 0;`).
  - delete l.404-466 (voxelCasters, voxelSun, proxy, casterMode, `buildShadowProxy`, `setCasterMode`) and the call
    `this.buildShadowProxy();` (l.182).
  - `addStatic` (l.468-489) -> 
    ```ts
    /** Static level geometry: every lamp's list (filtered by reach) and the moon's. */
    private addStatic(m: AbstractMesh): void {
      this.lightRig.addCaster(m);
      this.sunStatic.push(m);
    }
    ```
  - `applyQuality`: delete l.536 (`voxelLayers refresh`), l.538-542 (VOXEL_LOD block), l.548 (`setCasterMode`);
    l.546 drop `, micro: !!this.voxels?.micro` (A5).
  - `applyAdaptive`: delete l.593-597 (VOXEL_LOD block; `a.voxelLod` is no longer read, A4).
  - delete the GI block l.637-662 (`giSlotOf`, `giVersion`, `giOn`, `giAll`, `giW`, `updateGi`) and l.665
    `this.updateGi();`; keep the l.636 doc line with `setSunShadows`' neighbour as it reads. `frame`: delete l.671.
  - `dispose`: delete l.686-687.
  - `smoothSky` (l.693-707): doc "the smooth level's sky visibility (rendering only): `bakeSky` over the canonical
    light shapes in `SKY_CELL` cells on `SKY_GRID`"; body:
    `const shapes = skyShapes(l.shapes, SHAPE_STRIDE, SKY_GRID.size * SKY_GRID.minThick);`
    `const { origin, n } = skyGridFor(shapes.length / SHAPE_STRIDE, (i, out) => shapeBounds(shapes, i, out), () => true, SKY_GRID.brick * SKY_GRID.size, SKY_GRID.chunk * SKY_GRID.size, SKY_CELL);`
    (rest unchanged). Delete `contentHash` (l.709-716).
- Comments only (no code change), optional: `src/ai/animTierView.ts:52`, `src/core/governor.ts` header lines are left
  as is (A4). Do not chase every "voxel" word in comments outside the files above.

## Step 5 - scripts (e2e)
- `scripts/e2e-desktop.mjs`:
  - header l.5-6 -> "(voxel-retire: parts 3 and 4 run the smooth renderer; the voxel look is gone)".
  - part 3 l.346 params -> `'autostart=warehouse&mode=clear&gfx=epic'`. In the l.350-355 evaluate drop `vx` and the
    `vox` field; delete l.356-391 (voxel world, shading, art layer / sky bake, GI asserts).
  - character block: keep the Wren checks (head fade, goggle, `wren.figure`, parts hidden); delete the guard voxel-body
    parts: `err` (l.403-409), `p` (l.410), the lensed-body block (l.432-445), ragdoll (l.446-452) and the returned
    `n, voxel, hidden, cast, quads, err, ragErr, lensChanged, lensHead` fields; asserts: l.468 keep as
    `assert(ch.wren.partsHidden && ch.wren.figure, \`the player is Wren: the rig's parts unseen (...)\`)`; delete
    l.469-472 and l.477-478; keep l.473-476. l.392-394 comment: keep the LOD wait, drop "voxel characters".
  - weapons block l.479-511: delete the chip code (l.486-499 and `chipped`), the `!m.voxel` in the l.484 wait
    (`models.some((m) => !m.mesh)`, the wait stays capped at 60 s), and `voxel` / `quads` fields; assert l.510 ->
    `assert(wp.n > 0 && wp.cast, \`the loadout's weapons render and cast shadows (${wp.meshes.join(', ')} baked)\`)`;
    delete l.511. Keep the baked-lamp and texture checks (l.512-587) as they are.
  - part 4 l.593-594: params `'autostart=warehouse&gfx=user'`, comment "TAAU, Panini, Ray traced setting (screen
    space since voxel-retire)"; l.607 ->
    `assert(p5.pps.includes('ssr') && !p5.pps.includes('rtReflect'), \`Ray traced runs screen space reflections (${p5.pps.join(',')})\`)`.
- `scripts/e2e-lightbake.mjs`: drop the 4th config (l.13); header l.4-5 -> "smooth-world / voxel-retire: Epic draws
  the bake through the lamp plugin on every PBR material; Ray traced runs screen space reflections."; l.37 drop
  `voxels: !!w.voxels,`; l.85 drop `, voxels ${info.voxels}`; l.104-105 delete; l.106 loop -> only `['gfx=epic', epic]`;
  l.70 comment -> "Ray traced: screen space reflections run (no crash)"; l.110 message drop "the voxel walls'".
- `scripts/e2e-lib.mjs:221` -> `return w?.lightInfo?.().ms ?? 0;`; l.59 and l.217 comments drop "voxel".
- Leave `scripts/run-e2e.mjs:113` (`'src/voxel/'` still maps to the light bake suites), `scripts/perf.mjs` and
  `scripts/e2e-pad.mjs` comments as they are.

## Step 6 - tests
- `tests/shapes.test.ts` (from voxel.test.ts): keep only the `describe('voxel shapes', ...)` block (l.39-104), renamed
  `describe('light bake shapes', ...)`; imports -> vitest + `packShapes, rasterise, shapeBounds, ShapeMode` from
  `../src/voxel/shapes` (plus whatever the kept block's dynamic imports need). Delete the brickmap, mesher, chunk,
  mesh voxelizer and voxel characters blocks.
- `tests/skyBake.test.ts` (from voxelArt.test.ts): keep `describe('sky bake')` and `describe('GI bake ...')`
  (l.69-116); imports -> vitest, `packShapes` from shapes, `bakeSky, skyDirections` from skyBake. Delete l.2, l.5 and
  the programs / palette blocks (l.7-67).
- `tests/glass.test.ts`: delete l.10 (levelVoxels import) and l.109-110; it title (l.104) -> "no cover, no ledges, no
  dressing from a pane (a visible glass box included)".
- `tests/lampBake.test.ts`: delete the `GI circuits mixed into one texture (3.2)` describe (l.138-150).
- `tests/graphics.test.ts`: drop `VOXEL_TIER` from the l.2 import; delete l.55-56.
- `tests/smoothWorldLight.test.ts`: delete l.19 (VOXEL_TIER); `Mode` -> `'smooth' | 'smoothLow' | 'cheap'`; `opts`:
  delete `t` (l.34), `art: map.art ?? null` from `base`, and the voxels line (l.36); `prepared` returns
  `{ b, light: r.light }` (drop `voxels`); `MODES` = `['smooth', 'smoothLow', 'cheap']`; first describe ->
  "smooth world: the light shapes are the same on every path", `ref = prepared(map, 'smooth')`, delete l.55 and l.58;
  delete the Warehouse art-layer `it` (l.69-75); second describe (l.78-80) -> "Marlow Yard light field, Epic vs Low
  smooth": `on = prepared(ctcourse, 'smooth')`, `off = prepared(ctcourse, 'smoothLow')` (keep the rest; rename
  nothing else). Header comment: replace the voxels-on/off sentences with "on every smooth path (Epic, Low, `?gfx=min`)".
- No edit needed: `tests/smoothBody.test.ts`, `tests/operatorsRuntimeFigure.test.ts` (`rig.voxel` kept, A2),
  `tests/governor.test.ts` (A4).

## Step 7 - docs (same change)
- `docs/systems/graphics-quality.md`: l.33-34 drop `VOXEL_TIER` / `VOXEL_LOD`; l.49 "voxelLod x0.75" -> "step 6 (was
  voxel LOD) a no-op since voxel-retire"; l.125-132 rewrite as "Smooth world (the only renderer since voxel-retire,
  2026-10-23, Michael: "nothing should be voxel"): ..." keeping the still-true facts (PBR boxes / cylinders, detail
  pass, BakedLamps, smooth parts, roofGrid rain, baked-moon shafts, `?gfx=min`); delete l.133-165 (Voxels, Voxel art),
  l.175-206 (Voxel characters, weapons, Chips, GI); l.166-170 Sky bake -> the smooth sky bake (`smoothSky`, `SKY_GRID`,
  `levelFill.ts`) and `bakeMoon`; l.171-174 Weather: drop "voxels wet ..."; l.207-214 Reflections -> "off / ssr / rt;
  rt runs screen space (voxel-retire; the setting is kept for saved settings)".
- `docs/systems/lighting.md` l.82, 90, 118-120, 131, 160: drop the `?voxels=1` / voxel-wall clauses (the bake text stays).
- `docs/systems/performance.md` l.16, 25 (voxel cache budget), 32-33, 48-49, 52, 59: drop voxel items.
- `docs/systems/testing-tools.md` l.109, 394: drop the voxel cache / voxel character notes; the e2e-desktop entry no
  longer passes `?voxels=1` (fix if it says so).
- `docs/systems/conventions.md:51` and `CLAUDE.md:257` module row -> "`voxel/` | Light bakes (the folder name is
  history): lamp bake and light volume, moon / sky bake, canonical light shapes, the bake worker pool". `CLAUDE.md:213`
  hard rule -> "presets, LOD, the governor". `CLAUDE.md:307` doc index -> "Presets, governor, renderer, TAAU, weather".
- `docs/design-bible.md` l.775, l.808: "Voxels are off by default (G223)" -> "The voxel look is retired (2026-10-23,
  Michael: "nothing should be voxel"; G number at the merge)". l.974 drop "voxel layers".
- `docs/backlog.md` item 5: mark closed by voxel-retire (A10).
- `docs/systems/world-and-characters.md:122`: drop ", no voxel body".
- Changelog fragment `changes/feature-voxel-retire.md` (see `changes/README.md` for the format): "The voxel look is
  retired (Michael: "nothing should be voxel"): `?voxels=1`, voxel world, characters, weapons, chips, voxel GI and
  ray-traced reflections removed; Ray traced now runs screen space reflections; the light bakes are unchanged."
- `TESTING.md`: nothing (no voxel step there).

## Verification (desktop, light; never a full `npm run check`)
1. `npx tsc --noEmit` - zero errors.
2. `npx eslint` on every touched src / script / test file (list them), zero errors.
3. `grep -rn "voxels=1\|flags.voxels\|VoxelWorld\|VoxelBody\|VoxelGroup\|voxelPlugin\|levelVoxels\|rtReflections\|warehouseArt\|VOXEL_TIER\|VOXEL_LOD" src scripts tests`
   prints nothing (docs history may still mention them).
4. Single vitest files (one run, these paths only):
   `npx vitest run tests/shapes.test.ts tests/skyBake.test.ts tests/glass.test.ts tests/lampBake.test.ts tests/graphics.test.ts tests/governor.test.ts tests/smoothWorldLight.test.ts tests/smoothBody.test.ts tests/operatorsRuntimeFigure.test.ts tests/ctcourseLight.test.ts tests/lampGridLossless.test.ts tests/lightField.test.ts tests/warehouseS1Light.test.ts tests/warehouseDress.test.ts tests/detailPass.test.ts tests/rig.test.ts tests/lampLevel.test.ts tests/lampPluginClone.test.ts tests/lampPluginGap.test.ts tests/enemyLightsOut.test.ts`
   The light-bake tests (ctcourseLight, lampGridLossless, warehouseS1Light, smoothWorldLight hashes) must pass with
   no number changed: a changed bake hash means a KEEP file was disturbed - stop and report.
5. `npm run build` once (also proves the worker bundles without chunk.ts).

## e2e for the laptop (Test Runner, `E2E_GPU=1`, on the pushed commit)
Must (their URLs or asserts used voxels): `e2e-desktop` (all 4 parts), `e2e-lightbake`.
Area (src/world, src/game, src/player, src/weapons, src/vfx touched): `smoke`, `e2e-ctcourse`, `e2e-levels`,
`e2e-anchors`, `e2e-combat`, `e2e-weapons-carry`, `e2e-enemies`, `e2e-gadgets`, `e2e-sectorops`, `e2e-menus`
(menu stage weapon). Then the PR rides the next train's full run. No `e2e-coop` / `e2e-netmove` needed (no `src/net`).

## Report (to the job lead)
Files deleted / edited, the vitest list result, tsc / eslint result, the grep result, anything left (with file:line).
