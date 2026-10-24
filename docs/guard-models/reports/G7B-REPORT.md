# G7b report: G7 follow-ups before G8

Branch `feature/gm-g7b` off feature/guard-models 416915c1. Opus. Scope: G7-CHECK polish 1-5 and PLAN G7's last
bullet (level load awaits LOD2, shader warmed on the loading screen). `flags.guardModels` stays default off.

## What
1. **One packed varying (polish 1).** `guardFigurePlugin.ts`: G5's `vGvis` (vec3) + `vGfx` (vec2) are now one
   `varying vec4 vGfig`: rgb the tint, w = heat level + flash level / 16. The fragment splits w again in
   `guardFx(w)` (`h = floor(w + 0.5/16)`, flash = `floor((w - h) * 16 + 0.5)`, both / 15). Flash and heat are the same
   on every vertex of a figure, so the interpolated w is exact; the margins absorb interpolation noise below 1/32. The
   fragment keeps the names through `#define vGvis vGfig.rgb` and `#define vGfx guardFx(vGfig.w)`, so the rest of the
   plugin code (and `guardFigure.test.ts`'s text assertions, G9's file) is unchanged. Behaviour identical (tested for
   all 255 visible alpha bytes, with noise).
2. **Level load awaits LOD2 and warms the guard shader (PLAN G7, PLAN 8 risk).** New `src/ai/guardWarm.ts`;
   `GameState.create` (`src/game/gameState.ts`) runs `warmGuardModels(scene, mapId)` beside `scene.whenReadyAsync()`
   under the same `WARMUP_MAX_MS` cap, only when `flags.guardModels` is on (flag off: the exact old await).
   - LOD2 of every base of every human kind goes into the scene's guard library (LOD2 only; LOD0 / LOD1 still load
     per guard after spawn). A guard spawned later shows his figure on his first frame (no merged-body gap).
   - The shader: one hidden, disabled mesh per (base, LOD2 primitive) built exactly as a guard's (the library's shared
     static buffers, a `gvis` buffer, an index buffer of the guard's width, a skeleton with the LOD's bone count, 4
     influences, shadows received). It is polled until the main pass and every light's shadow generator (whatever its
     cast list) report ready, so the PBR + GUARDFIG program and the shadow-depth program are compiled before play.
     The engine's effect cache gives the later guard the very same `Effect` (tested for both passes). The warm meshes
     stay in the scene, disabled (never drawn, freed with the scene): their sub-meshes hold the effects, so Babylon's
     ref-counted effect release never drops the program before the first guard takes it.
   - Never rejects: a base whose LOD2 fails is warned and skipped (the merged body covers it, as before); a compile
     that never gets ready stops polling after 20 s with one warning.
3. **warmPlayLods (polish 4).** `offline.ts`: each asked url remembers the run that holds it. A call with nothing new
   returns the latest-queued run holding ITS urls (else a settled 0), never the last run queued, so
   `loadMenuLods` (the menu's load screen) does not wait behind the guards' LOD warming. A call with fresh urls still
   queues behind every earlier run; a failed run forgets only its own urls.
4. **Helmet drop colour per instance (polish 3).** `guardHelmet.ts`: the shared drop source has no vertex colour; it
   registers an instanced `color` buffer (the part library's pattern). `helmetDropInstance(src, hex, name)` gives each
   drop its own `Color4` (`helmetDropColour`: sRGB hex -> linear / fabric neutral, clamped, same formula as before),
   and `setHelmetDropColour` recolours a reused drop in place (no allocation; hex parsed by char codes). `helmetDrops.ts`
   uses them (every helmet_std drop takes its guard's colour, reused or not). `helmetDropSource(scene)` lost its unused
   `hex` argument (`tests/guardBody.test.ts`'s four calls updated).
5. **Shared shield (polish 5).** `guardShield.ts`: per scene and shield file, one material set (the shield has no tint,
   so no per-instance colour is needed), shared static vertex buffers, and per (base, figure LOD) one bone-index buffer
   (every guard of a base has the same joint order per LOD). Per enforcer, one mesh per figure LOD, made the first time
   he shows that LOD (three at most), then only enabled / disabled. A LOD switch allocates nothing: no bone indices, no
   `setVerticesData`, no buffer and no vertex-array rebuild. An enforcer's dispose frees his meshes only; the scene frees
   the shared side.

## Files
- Changed: `src/operators/runtime/guardFigurePlugin.ts`, `src/operators/runtime/offline.ts`, `src/ai/guardHelmet.ts`,
  `src/ai/helmetDrops.ts`, `src/ai/guardShield.ts`, `src/game/gameState.ts` (one import, the await),
  `tests/guardBody.test.ts` (call sites of `helmetDropSource`).
- New: `src/ai/guardWarm.ts`, `tests/guardFigureWarm.test.ts`, `tests/offlineWarmQueue.test.ts`,
  `tests/guardHelmetDrop.test.ts`, `tests/guardShieldShare.test.ts`.
- Not touched: G9's test files (guardKit, guardVariant, gearMask, guardLook, guardFigure, guardAssets), `docs/systems/*`,
  `TESTING.md`, art credits, `changes/`.

## Decisions I assumed
1. "Every base the map's guards use" = every human kind's base. Reinforcements, response squads and sector slots can
   bring any kind into any level, and modes spawn at `enter()` (after the load), so no mode-independent list of the
   map's kinds exists before play. Cost: at most three LOD2 files (while Wren stands in, all three are Wren's LOD2,
   already loaded for the player). `warmGuardModels` takes a `kinds` list if a later slice wants per-mode lists.
2. The packed varying keeps `vGvis` / `vGfx` as fragment macros (so G9's `guardFigure.test.ts` stays green untouched).
3. Warm meshes stay alive (disabled) per scene rather than being disposed after the compile (see What 2).
4. The warm reads the scene's active camera (CAMERA_PERSPECTIVE is a define). In `GameState.create` the shoulder camera
   is active from the constructor, before the await.
5. Shield: one mesh per figure LOD (as the figure itself) instead of swapping a bone-index buffer on one mesh, which
   would rebuild the vertex-array object on every switch.

## Tests
- `npx tsc --noEmit -p .`: clean. `npx eslint` on the 12 changed / new files: clean.
- New (15 tests, all pass):
  - `tests/guardFigureWarm.test.ts` 7: packed decode equals G5's for all 255 visible bytes with noise 0, +-1/64, +-1e-4;
    the PBR effect of a gvis mesh declares exactly one guard varying (`vec4 vGfig`) in both stages; the bases (every
    human kind's, once, no dog); flag on: LOD2 only fetched, one library entry and one hidden disabled warm mesh per base
    with GUARDFIG compiled, idempotent second call, the later grunt's LOD2 needs no fetch and gets the same `Effect`
    object as the warm mesh; the shadow-depth variant compiled for a generator whose cast list does not hold the warm
    mesh, and the later guard's depth effect is the same object; flag off: nothing fetched or built; a failing base is
    warned and skipped, the others warm, no rejection.
  - `tests/offlineWarmQueue.test.ts` 3: the menu's repeat call settles with its own run while the guards' run is still
    fetching; guard urls asked again wait for the guards' run; fresh urls queue behind earlier runs; an empty call is 0;
    a failed run forgets only its own urls.
  - `tests/guardHelmetDrop.test.ts` 3: `helmetDropColour` values (formula, case, clamp, alpha); the source has no
    geometry colour, a heavy's and a grunt's drops keep their own colours (separate `Color4`s), the source stays white,
    the colour reaches the shader through the instanced `color` buffer (stride 4, VERTEXCOLOR); a reused drop is the
    same instance and the same `Color4`, recoloured.
  - `tests/guardShieldShare.test.ts` 2: two enforcers share material, static buffers and bone-index buffer; each on his
    own skeleton with elL / wrL indices by name; one disposed leaves the material in the scene for the other; the shared
    side is freed with the scene; LOD switches over LOD0 / 1 / 2 (camera at 3, 15, 60 m) four rounds: the same mesh per
    LOD, the right skeleton and parent, the others disabled, no new scene mesh, no `setVerticesData` /
    `setVerticesBuffer` call; all freed on dispose.
- Re-run, all pass: guardBody 14, guardFigure 13 (G9's, untouched), gearWiring 21, guardResolve 9 (8 files with the new
  four: 72 passed); operatorsRuntime, menuGate, operatorsRuntimeFigure, coopGuardAi, coopGuardCarry, gearMask,
  guardVariant, guardLook, guardPoseGolden, mocapGuards, coopTorches, carry, bodySearch, enemyManagerDespawn (14 files:
  145 passed, 2 skipped, the existing capture skips).

## Laptop e2e to run
- Flag off (regression; `gameState.ts`, `offline.ts`, `helmetDrops.ts` changed): `smoke`, `e2e-offline`, `e2e-menus`,
  `e2e-enemies`, `e2e-combat`, `e2e-takedown`, `e2e-ctcourse`, `e2e-coop`.
- Flag on, `E2E_GPU=1`, on a scratch commit with the default flipped (or the `E2E_GUARDMODELS` runner switch):
  `e2e-enemies`, `e2e-combat`, `e2e-guard-carry`, `e2e-coop`, `e2e-ctcourse`, plus a console check on
  `?autostart=ctcourse&mode=course&guardmodels=1`: no shader / varying / compile errors (first real GPU compile of the
  packed plugin and of the warm), guards drawn as figures on their first frame, and the load time against flag off
  (the warm adds the LOD2 fetches and two compiles per base, inside the 6 s cap).

## Doc lines for G9
- `docs/systems/graphics-quality.md` (guard figures): "The guard shader uses one vec4 varying (`vGfig`: tint rgb, heat
  level + flash level / 16), inside the PBR varying limit." "With the guard models on, the level load awaits LOD2 of
  every guard base and compiles the guard shader (main and shadow depth) on hidden warm meshes, under the warm-up cap
  (`src/ai/guardWarm.ts`)."
- `docs/systems/ai.md` (dropped helmets): "With the guard models, each dropped helmet_std carries its own colour (an
  instanced colour), so a heavy's dark helmet and a faction helmet never share one."
- `docs/systems/performance.md` (guards): "The enforcer's figure shield shares its materials and buffers per scene; a
  LOD switch allocates nothing." "Per scene, one disabled warm mesh per guard base stays loaded (never drawn)."
- `TESTING.md` (with `?guardmodels=1`): "At level start every guard shows as a figure on his first frame; no hitch the
  first time a guard comes into view."

## Open items
- The packed plugin and the warm are verified on NullEngine only; the first real GPU compile is in the flag-on e2e.
- The warm compiles LOD2's material. LOD0 / LOD1 materials are separate objects but get the same program when their
  defines match (same texture set; true for Wren's stand-in and the synthetic files). If G4's LOD0 carries a texture
  LOD2 lacks, LOD0's program compiles at the first near draw: recheck with G4's files (warm LOD0 materials too if so).
- Light-dependent defines: the warm compiles for the lights enabled at load; a light toggled later recompiles every
  lit material, guards included (unchanged behaviour).
- With the flag on and Wren standing in, drops are still the part library's box, which keeps the colour of the drop
  that made it (pre-G7 behaviour; gone with G4's helmet_std).
- G7-CHECK polish 6-9 are not in this slice.
