# G7b check (fresh Opus checker)

Branch `feature/gm-g7b`, reviewed head 79d9e397, base 416915c1 (`git diff 416915c1..79d9e397`). Read-only review
against `gm-common.md`, G7B-REPORT.md and G7-CHECK.md polish 1-5.

## Verdict: PASS

Nothing blocking. Polish 1-5 of G7-CHECK are done as asked. With the flag off, every changed path is exactly the old one.

## Runs
- `npx tsc --noEmit -p .`: clean. `npx eslint` on the 12 changed / new files: clean.
- Vitest, one file at a time: guardFigureWarm 7, offlineWarmQueue 3, guardHelmetDrop 3, guardShieldShare 2,
  guardFigure 13, guardBody 14, gearWiring 21, guardResolve 9, animN4dKill 11, coopWalkFixes 15, hangDown 8,
  hangDownTakedown 7, poseParity 12, sectorDesk 18, sectorKeypad 19, strikePops 7 (16 files, 169 tests). All passed.
  The other files are the ones that import a changed src file: gameState, helmetDrops, guardHelmet, guardShield,
  guardWarm, guardFigurePlugin or offline.

## What was checked
1. **Packed varying `vGfig`.** Vertex: gFx = 255 - a byte (0..254 visible), heat = floor(gFx/16) (exact: power of
   two), w = heat + flash/16, in [0, 15.875]. Fragment: h = floor(w + 1/32), flash = floor((w-h)*16 + 0.5). Both
   decodes tolerate an error of up to 1/32 in w, and the result equals G5's (flash, heat)/15 exactly. Precision: w needs
   8 significant bits. Real fp16 holds it exactly (ulp 1/128 in [8, 16)). Even the GLSL ES spec-minimum mediump
   (relative 2^-10) gives |err| <= 15.875 x 2^-10 ~ 0.0155 < 1/32, so a mediump varying cannot lose the flash bits.
   Hardware interpolation of a constant across a triangle adds fp32-level noise only. Every visible vertex of a figure
   carries the same `visibleAlpha` (fillGvis), and hidden pieces leave the index buffer, so no drawn triangle mixes w
   values. The macros (`vGvis` -> `vGfig.rgb`, `vGfx` -> `guardFx(vGfig.w)`) are pure rvalue substitutions, used only in
   `.x` / `.y` reads and a `toLinearSpace` argument, so the semantics do not change (the second use only costs one more
   cheap call). The GLSL is valid ES (a swizzle on a function's return value is legal). The NullEngine test does not
   compile GLSL, so the first real compile is still the flag-on GPU e2e (report open item).
2. **guardWarm + GameState.create.** Flag off: `const ready = g.scene.whenReadyAsync(); await Promise.race([ready,
   timeout])` is the old expression in the same order. The only difference is a new import whose dependencies
   (guardVariant, guardAssets, guardFigure, offline) gameState already loads through enemy / guardBody. Flag on:
   `Promise.all([ready, warm])` sits under the same `WARMUP_MAX_MS` race. LOD2 of each base's manifest (deduplicated by
   id) loads into the scene's `guardLibrary`, the same key a later guard's `load(LOD_2)` hits (tested: no refetch, and
   the same `Effect` for both the main and the shadow-depth pass). The warm meshes match a guard's defines: the same
   shared VBs, a `gvis` UNSIGNED_BYTE normalised buffer, the same bone count (BonesPerMesh / BONETEXTURE follow the
   count and the engine caps), 4 influences and receiveShadows. `warmReady` walks every light's generators and render
   pass ids (CSM included), so compiling does not depend on the cast lists. A failed LOD2 hits the rejection handler,
   which warns (unless the page is leaving or the scene is disposed), counts it as false and never rejects. The warm
   meshes are disabled and `isPickable = false`. They are in no caster list and no gameplay path reads them:
   `paintElectro` filters InstancedMesh, and `bodyEffectRecovery` only clears effects. The skeleton, meshes and the
   owned gvis buffer all belong to the scene. `WARMED` / `LIBRARIES` are WeakMaps keyed by scene, so nothing leaks
   across maps.
3. **warmPlayLods.** A call with nothing fresh returns the latest-queued run that holds one of its urls. Runs are
   serial, so that run settles last among them. When no run holds the urls it returns a settled 0. The menu therefore
   no longer waits behind the guards' run (tested). A call with fresh urls still chains on `warm`, so the order is
   unchanged. A failure forgets only its own urls. The `held` reference inside `.catch` is TDZ-safe because the catch
   always runs asynchronously, after `held` is assigned. The pre-controller `pending` path is untouched.
4. **Helmet drop colour.** `helmetDropColour` parses with char codes into the caller's `Color4` and allocates nothing.
   `helmetDropInstance` replaces the source's shared white `Color4` reference (copied by the InstancedMesh ctor) with
   its own, so a recolour never touches the source or a sibling. Babylon re-copies `instancedBuffers` each frame, so
   in-place recolouring works. `HelmetDrops.drop` serves host and client (enemyManager:540, coopClient:880). With
   `src` null (flag off, or the box) the path is identical: `make` -> `parts.instance(hex)`, and the recolour is
   skipped. The guardBody.test edits only drop the removed argument, so every assert is unchanged.
5. **Shared shield.** Per scene and shield model there is one material set, one set of static GpuBuffers, and bone
   indices per (manifest, LOD). The joint order comes from the asset's `setup` and is the same for every guard of a
   base. Per enforcer, each LOD gets its own meshes on non-owning VertexBuffers. A switch only toggles enabled, and the
   parent assignment is guarded by an equality check. The test spies `setVerticesData` / `setVerticesBuffer` and counts
   scene meshes. Disposal: an enforcer frees only his own meshes, and the shared side is freed on scene dispose (no ref
   count is needed; it is bounded at one per shield file plus three bone buffers per base). The sparse `perLod` holes
   are guarded. The shield has no tint, as before (G7 also used plain `operatorMaterial`). `ready` is now set on the
   first shown LOD, and only tests read it.
- Hot paths: `follow()`, `drop()` and the recolour allocate nothing. The warm poll allocates, but only at load time.
  No `Math.hypot` / `sqrt` / `any` / ts-ignore in the diff.

## Polish (non-blocking)
1. `src/ai/guardWarm.ts:147-152`: the fulfilment handler is not guarded. A synchronous Babylon throw inside
   `warmMeshes` / `untilWarm` would reject `warmGuardModels`, contradicting its doc ("never rejects"). Through
   `Promise.all` in `gameState.ts:905` it would then reject `GameState.create` (`main.ts:397` is `void`ed: the level
   would hang on the loading screen) if it happens inside the 6 s cap. This is unlikely, because the same buffers are
   used as a guard instance's. Before G8, add a try/catch that warns and returns false, or `.catch(() => 0)` at the
   call site.
2. `src/ai/guardShield.ts:113` / `:166`: the first time an enforcer shows a LOD, it builds that LOD's meshes and index
   buffers mid-play, and the first enforcer also builds the per-(base, LOD) bone indices. The shield's program is not
   warmed either. This is bounded (three times per enforcer), but it is a first-show hitch. Build them when the
   figure's LOD meshes arrive, or warm a shield mesh with the guards. This stays dormant until the shield files land.
3. `src/ai/guardWarm.ts:113-114`: `warmReady` runs before the `scene.isDisposed` check. This is harmless (a disposed
   mesh has no material), but the order should be swapped.
4. `src/operators/runtime/offline.ts:92/98`: declare `held` before the chain for readability. Its current position is
   correct only because the catch runs asynchronously.
5. For G9's doc line: at the spec-minimum mediump, the packed w keeps about a 2x margin (0.0155 against the 1/32
   tolerance). Real fp16 and fp32 are exact. No action is needed.

## Laptop e2e
As in G7B-REPORT ("Laptop e2e to run"). The flag-on GPU console check is the first real compile of the packed plugin
and the warm.
