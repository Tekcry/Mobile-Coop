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
