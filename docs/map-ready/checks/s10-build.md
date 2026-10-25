# map-ready S10 build report: kept parts (compiled shaders)
Owner: Night Shift | Sector Ops Build. Status: current.

Built by an Opus 5.5 builder from `docs/map-ready/briefs/S10.md` (PLAN S10 :384-412, BRIEF A18, research row 14) on
`feature/map-ready-s10`, cut from `origin/feature/map-ready` with S1 fix1 and S9 merged (base 06849c4f4). Babylon facts
read from the 9.29.0 sources in `node_modules/@babylonjs/core`.

Desktop checks only: `npm run typecheck:fast` and single vitest files with `--maxWorkers=2`. No e2e, GPU or
`npm run check` here; those are under "Pending PC runs".

## Step 1: plugin audit (no code change)
The question: does every plugin's shader code depend only on its defines and module constants, so that Babylon's cache
key (shader name + defines, `Engines/thinEngine.pure.js:1683`; the plugin's main define `MATERIALPLUGIN_<n>` is per class
name, `Materials/materialPluginManager.pure.js:43-44`) always means the same code on every map?

| Plugin | `getCustomCode` | `getUniforms` / `getSamplers` | What the code reads | Verdict |
| --- | --- | --- | --- | --- |
| `LampPlugin` | `world/bakedLamps.ts:1549` (class :1392) | :1445 / :1441 | `this.std` (the material's class: StandardMaterial vs PBR, which is the shader name `default` vs `pbr`, so it is in the key). Module constants only: `LAMP_GLSL`, `CHAR_SHADOW_GLSL`, `DARK_GLSL`, `TORCH_DRAW_GLSL`, `SPOT_FALLOFF_GLSL` / `_CALL` / `_SWAP`, `spotFeatherStd`, `LEVEL_FILL_GLSL`, `VISION_GAIN`, `VOL_CAPS`, `LAMP_GRID_SLOTS`, `LAMP_GRID_TEXELS`, `LAMP_TEXELS`, `DOORS_PER_LAMP`, `DOOR_TEXELS`, `MAX_CAPSULES`, `CAPS_PER_LAMP`. Uniform array sizes: `VOL_CAPS`, `TORCH_DRAW_SLOTS`, `TORCH_VEC4`, literal 16 / 4. The per-map `BakedLamps` (volume, door slots, atlas pages, torches, grid, lamp counts) is read only in `prepareDefines` (into defines) and `bindForSubMesh` (uniform values, textures) | clean |
| `SurfacePlugin` | `world/surfacePlugin.ts:67` | :50 / :42 | `PARAMS_GLSL` (module constant from `SURFACE_KINDS` / `SURFACE_PARAMS`, both `const` and never written). The atlas (its size follows the quality preset) is read only in `bindForSubMesh`; `space` sets the `SURF_OBJECT` define (and the `surf` attribute, which follows that define) | clean |
| `LevelMaterialPlugin` | `world/levelMaterialPlugin.ts:26` | none | a literal string | clean |
| `SmoothBodyPlugin` | `player/smoothBodyPlugin.ts:31` | none | a literal string | clean |
| `GuardFigurePlugin` | `operators/runtime/guardFigurePlugin.ts:37` | none | a literal string | clean |
| `PatternPlugin` | `cosmetics/patternPlugin.ts:39` | none | `PATTERN_GLSL` (module constant); `this.pbr` (the material's class, so the shader name: in the key) | clean |

Every GLSL constant above is a module-level template string, evaluated once at import, so it cannot change between maps
in one page. No other `MaterialPluginBase` subclass exists in `src/`, and nothing in `src/` sets
`customShaderNameResolve`, `processFinalCode`, `processCodeAfterIncludes` or `indexParameters` by hand.

Other effects are keyed by their own code, so they are in the budget: the `EffectWrapper`s
(`vfx/nightBloom.ts`, `world/charShadows.ts`, `world/torchShadows.ts`, `world/bakedLamps.ts` `lampVolumeMix`, whose
per-map `mixDefines` are part of the key) put their fragment source in the key; every `Effect.ShadersStore` entry
(`vfx/cameraCueView.ts`, `vfx/cinematicPost.ts`, `vfx/paniniPass.ts`, `vfx/postStack.ts`, `vfx/taau.ts`,
`world/surfaceAtlas.ts`, and the lab's) is registered once at module level.

Result: no per-map value in any plugin's code, so no plugin file is edited and no material is kept out of the budget.

## Steps 2-6: commit 1aac3f457 (one WIP commit)
The lead's "account save" asked for a push while steps 2-6 were written but not yet run (desktop CPU was at 100%, so
the tests waited). They went up as one WIP commit; nothing changed after it, the tests below ran on that code. Undo:
none needed (the steps are separate in this report, not in git).

### Step 2: `tests/pluginCode.test.ts` (new)
- Each of the six plugins, on the material class it rides on in the game (Lamp and Pattern on PBR and Standard): two
  instances on two NullEngine scenes with different map inputs (lamp counts, door lists, grid sizes, atlas tile 256 vs
  512) give the same `getCustomCode('vertex' / 'fragment')`, `getUniforms()` and `getSamplers()`.
- Compiled on two NullEngines for two maps (a body PBR with all five non-level plugins, the level's PBR with sky fill and
  world surfaces, the editor's standard material with level shading): the same three keys, and each key carries the
  same final vertex and fragment source.
- Fail-first: a per-map value (`this.lamps.lampBase`) put into `LampPlugin`'s code for one run fails both tests
  (reverted at once).

### Step 3: `keepEffects` / `releaseUnkept` / `dropEffects` (`src/core/keptParts.ts`)
- `KEPT_EFFECTS` = 400, `KeptEffect`, `stats.effReused` / `effCompiled` / `heldEffects` as the brief's interface.
- `keepEffects(compiled)`: one `_refCount++` on each ready effect not yet held; a not-ready or disposed one is not kept.
  Every kept effect is stripped (again at each keep: the next match may add observers): `onCompiled`, `onError`,
  `onBind`, `_fallbacks`, `_processCodeAfterIncludes`, `_processFinalCode` nulled; `onCompileObservable`,
  `onErrorObservable` and `_onBindObservable` (the field, never the getter) cleared. Past the budget the least recently
  used get one `dispose()`. A held effect that left the cache is forgotten.
- `dropEffects()`: one `dispose()` per kept effect (the holder's reference), not `force`: an effect the live match uses
  stays for it, and Babylon rebuilds it on the restore from its kept code (`_rebuildEffects` -> `_prepareEffect` uses
  `_vertexSourceCode`, not the stripped hooks). Unused ones reach 0 and leave the cache.

### Step 4: `src/core/app.ts`
- `releaseState`: after S9's `handOver`, `keptParts.keepEffects(engine._compiledEffects)`, then `prev.scene.dispose()`.
  Then, flag on: `keptParts.releaseUnkept(...)`: every cached effect not kept gets `dispose(true)` and leaves the cache
  (what `releaseEffects()` does to it: its release observer disposes every effect with force). Flag off:
  `this.engine.releaseEffects()` as before. The 3.1.7 comment is rewritten (keys repeat in 9.29; kept effects are
  stripped).
- Constructor, flag on: the context-loss observer now calls `dropTextures()` and `dropEffects()`.

### Step 5: counters
- `countEffect(e)` in `keptParts.ts`, called from a wrapper App puts on `engine.createEffect` (flag on only): a kept
  effect's first return since its keep is `effReused` (once per effect per match); a new effect (`_refCount` 1) is
  `effCompiled`. Both bump S1's `loadCounters` (fields already there; `mapReadyStats.ts` not edited), so the load
  record's reveal deltas carry them.

### Step 6: `tests/keptParts.test.ts` (extended)
- Pure, on fake effects (6): one reference, once, and the strip; not-ready not kept; `releaseUnkept` forces the rest out
  of the cache; the budget drops the least recently used once; `dropEffects` keeps a live one for its match;
  `countEffect` and `loadCounters`; flag off = no-ops.
- NullEngine (4), in App's order with App's wrapper and observer: the kept effect survives the release
  (`_refCount` 1, still cached) and the next scene's `createEffect` returns the same object on the same key
  (`_refCount` 2, no new key, `effCompiled` delta 0); no kept effect reaches its old material (fields null, observers
  empty, a property walk from the effect finds neither the material nor the scene, and with `gc()` the old material and
  scene are collected); context loss drops them (freed, out of the cache, the next scene compiles a new one); flag off:
  nothing kept or stripped, `releaseEffects` frees every effect, the next scene compiles a new one.
- The S9 flag-off test's `stats` object now lists the three new fields.
- Fail-first: with the strip off, the strip test fails, and with the field asserts also removed the `gc()` assert fails
  ("expected PBRMaterial to be undefined"): the old material stays alive through the effect's code hook, the 3.1.7 leak.
  Reverted.

## Tests
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/pluginCode.test.ts tests/keptParts.test.ts --maxWorkers=2`: 2 files, 23 passed (2 + 21; 10 of
  the 21 new).
- With neighbours (`mapReadyStats`, `changesFragments`, `lampPluginClone`): 5 files, 32 passed.

## Deviations
1. `onBind` is nulled with the brief's fields (a per-user callback on the effect; nothing in `src/` sets it). Undo: drop
   the line in `stripEffect`.
2. `releaseUnkept(compiled)` is a `KeptParts` method (testable without App) instead of a loop in `app.ts`; it also
   deletes each released key, as `releaseEffects` drops the whole cache. Undo: inline it.
3. `dropEffects` gives back the holder's reference (`dispose()`), not `dispose(true)`: a forced dispose would break a
   kept effect the live match is drawing with. The brief's "a stripped effect cannot rebuild itself" does not hold in
   9.29 (the rebuild uses the kept final code), so a live one is safe to leave. Undo: `dispose(true)`.
4. Counting: the brief suggests comparing key sets at the reveal; the reveal is in `gameState.ts` (S2's, never touch),
   so `effReused` / `effCompiled` are counted live through a `createEffect` wrapper in `app.ts` (flag on only; one rest
   array per call, load time, not a gameplay hot path). Undo: remove the wrapper; the counters stay 0.
5. LRU "recently used" = returned by `createEffect` since the last keep (`countEffect`), not `_refCount > 1`: Babylon's
   `DrawWrapper.setEffect` never gives a reference back, so counts drift up. Undo: compare `_refCount`.
6. Steps 2-6 are one WIP commit (above).

## S9 polish list
None of its items were in lines S10 touched; none taken.

## Pending PC runs (lead requests)
- Affected e2e for this head.
- `e2e-lightbake` (a repeat load in the page; S6's assert by hand) and `e2e-desktop` (a quality change mid-match still
  compiles its new variants), flag off and `mapready=1`.
- `e2e-coop` + `e2e-netmove`, flag off and on (`releaseState` runs on every co-op restart): the checker gate.
- With S10 on `feature/map-ready`: `scripts/map-ready-measure.mjs --gated` repeat rows (`loadPrograms` 0 and
  `effCompiled` 0 for kept materials on the second load; heap after 3 loads within 5% of after 1).
- A GPU look check with the flag on across two loads (kept programs bound to the new materials' uniform buffers on real
  WebGL2), and a forced context loss mid-match (`WEBGL_lose_context`) to see the live kept effects rebuild.
