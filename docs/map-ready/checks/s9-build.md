# map-ready S9 build report: kept parts (model files and textures)
Owner: Night Shift | Sector Ops Build. Status: current.

Built by Night Shift | Cloud Builder 2 (cloud) from `docs/map-ready/briefs/S9.md` on `feature/map-ready` 3a18a7bb5, with
the cloud-queue brief's changes. Branch `feature/map-ready-s9`. Steps 1-5 are built and pushed. Step 6 (S1's counters)
is not built: S1 is not merged into `feature/map-ready` yet (checked at the end of step 5), so the lead runs it as a
one-commit follow-up.

Checks are cloud-only: `npm run typecheck:fast` (clean after every step) and single vitest files with
`--maxWorkers=2`. No e2e, GPU or laptop run here. Those are listed under "Pending PC runs".

## Texture path: buffer (no url-set fallback)
Babylon 9.29 `AbstractEngine._createTextureBase` (`Engines/abstractEngine.pure.js:635-783`) accepts a buffer under a
non-blob URL for both formats:
- KTX2: `forcedExtension` '.ktx2' picks the KTX loader, and with a buffer it calls `processBufferAsync(buffer)`, never
  `_loadFile(url)`. `KhronosTextureContainer2._decodeAsync` copies the view, including its byteOffset.
- PNG / WebP: a plain URL with a buffer still loads the URL (`_FileToolsLoadImage(url)`). A `data:` URL that is not
  base64 loads from the buffer (`_FileToolsLoadImage(buffer, ..., mimeType)`; Babylon makes and revokes its own blob
  internally).

So the kept texture's URL is `data:<key>` with `im.data` as the buffer, and the KTX2 one keeps `forcedExtension` '.ktx2'
and its mime. Our code makes no blob URL on this path. `Texture` asks `_getFromCache(url, ...)` first
(`texture.pure.js:308`, `baseTexture.pure.js:580-605`), so the next scene gets the same internal texture.

## Step 1: holder (pure), commit dc1a4fda
- Files: `src/core/keptParts.ts` (new), `tests/keptParts.test.ts` (new).
- `KeptParts` follows the brief's interface, plus `forgetFile` (a hook figure.ts sets to `forgetModel`), `budgetBytes`
  (tests lower it), `heldKeys()` and the `textureBytes(w, h, ktx2)` helper. Per-scene uses sit in a `WeakMap`, so a
  scene disposed without a hand-over (`App.setState`) is never kept alive by the holder.
- Tests: `npx vitest run tests/keptParts.test.ts --maxWorkers=2`: 8 passed. They cover:
  - a hand-over holds once, not once per hand-over
  - a texture unused in 2 hand-overs in a row is disposed once
  - the byte budget drops the least recently used first
  - `dropTextures` disposes each held texture once
  - a released texture is never held, and a new texture under a held key replaces the old one
  - a file unused in 2 hand-overs is forgotten
  - with `enabled` false every call is a no-op
  - the byte estimate

## Step 2: `figure.ts` `texture()`, commit 7a054fe6
- Files: `src/operators/runtime/figure.ts`.
- `texture(scene, im, srgb, keep = true)`: with `kept.enabled && keep` it calls `keptTexture()`, as described above.
  - The key is `glb-img:<n>` from a `WeakMap<GlbImage, string>`.
  - `reused` = the engine texture cache did not grow during the `Texture` constructor (a cache hit adds no entry).
  - bytes = width x height x (KTX2 ? 1 : 4) x 4/3. The size comes from the image header (PNG IHDR, or KTX2
    pixelWidth / pixelHeight), else from the internal texture.
  - Flag off or `keep` false: today's code, unchanged.
- `operatorMaterial(scene, m, label, keep = true)` passes `keep` to its 3 `texture()` calls. `buildLodAsset` passes
  `lod !== LOD_HERO`, so the hero is never kept.
- `weaponMesh.ts` and `guardFigure.ts` keep their calls as they are and get keeping through the defaults (not edited).
- Tests: tsc clean. The brief's figure / campus-art set (`keptParts operatorsRuntime operatorsRuntimeFigure operatorLods
  campusArtRender campusArtKit guardFigure`): 7 files, 78 passed, 1 skipped.

## Step 3: kit, props and campus art on the file cache, commit c8412b92
- Files: `src/operators/runtime/figure.ts` (`hasModel(url)`, `loadKeptModel(scene, url)`), `src/world/kit/kitRender.ts`,
  `src/world/props/propRender.ts`, `src/world/campusArt/campusArtRender.ts`.
- With `kept.enabled`, `create` reads the GLB through `loadKeptModel`: `loadModel(url)` plus
  `kept.useFile(scene, url, reused)`, where `reused` = `hasModel(url)` before the read. Flag off: today's `fetch` +
  `parseGlb`, unchanged.
- Tests: tsc clean. The brief's set plus `facilityKit` and `facilityProps`: 9 files, 113 passed, 1 skipped.

## Step 4: `app.ts`, commit 43adf0fb
- Files: `src/core/app.ts`.
- `readonly kept: KeptParts` on `App` points at the module's `kept`.
- The constructor sets `kept.enabled = flags.mapReady`. With the flag on it also:
  - adds `engine.onContextLostObservable.add(() => kept.dropTextures())`
  - sets `quality.onChange` to drop the held textures when `level.features.textures` changes
- `releaseState` calls `kept.handOver(prev.scene)` right before `prev.scene.dispose()`, inside the existing
  `!isDisposed` check. `releaseEffects()` is unchanged (S10).
- Flag off: `handOver` is a no-op, and no observer or `onChange` is set.
- Tests: tsc clean. No test imports `core/app.ts`.

## Step 5: NullEngine test, commit 948d8060
- Files: `tests/keptParts.test.ts`, which now has 11 tests (8 from step 1 and 3 new).
- Setup: a `NullEngine`, a figure material with a tiny in-memory PNG `GlbImage`, and `KitRender.create` with the real
  `facility-kit.glb` behind a stubbed `fetch`. Each cycle is create, then `kept.handOver(scene)`, then `scene.dispose()`
  (App.releaseState's order). `flags.mapReady` and `kept.enabled` are set and restored.
- Flag on:
  - the second scene's texture has the same internal texture
  - `texReused` > 0 and `texDecoded` does not change
  - the kit GLB is fetched once over two cycles
  - a context-loss notify leaves `heldTextures` at 0, and the texture leaves the engine cache
- Hero (`keep` false) with the flag on: blob URL, nothing held.
- Flag off: blob URLs, no hold, a new internal texture each cycle, the kit fetched each load, stats unchanged.
- Tests: `npx vitest run tests/keptParts.test.ts --maxWorkers=2`: 11 passed. The brief's full set: 7 files, 81 passed,
  1 skipped. tsc clean.

## Allocation lines (V8, per process)
Only `tests/campusArtRender.test.ts` in the brief's set measures allocation. Lines from the step 2 run (`ALLOC_TRACE=1`):
- Circuit repaint: `allocPerCall goal 0.5 best 0.0: 0:0.6/0x51 1:0.0/0x51 2:0.0/0x51 3:0.0/0x51 4:0.0/0x51`
- Far cull: `allocPerCall goal 0.5 best 0.0: 0:0.0/0x8401 1:0.0/0x51 2:847.6/0x8001 3:847.4/0x8001 4:847.6/0x8201`

Lines from the step 5 run:
- `allocPerCall goal 0.5 best 0.0: 0:0.6/0x51 1:0.0/0x51 2:0.0/0x51 3:0.0/0x51 4:0.0/0x51`
- `allocPerCall goal 0.5 best 0.0: 0:0.0/0x51 1:0.0/0x51 2:0.0/0x51 3:0.0/0x51 4:0.0/0x51`

Best is 0.0 bytes per call in every run, so both tests pass. The far cull's 847 B rounds in step 2 are de-optimised
rounds (status 0x8001), which the best-of rule skips. This slice does not touch the far-cull code.

## Deviations
1. The texture key has a colour-space suffix: `glb-img:<n>:s` (sRGB) or `:l` (linear), not just `glb-img:<n>`. Babylon
   stores `gammaSpace` on the shared internal texture, so one image used as both sRGB and linear must not share one.
   The texture URL is `data:` + that key, the `data:` prefix being what makes Babylon read a PNG from the buffer (see
   above).
2. `KeptTex` has one extra optional field, `_references` (Babylon's count). A texture already released by the engine
   (count 0) is never held, so the holder cannot bring a freed texture back.
3. `forgetFile` and `loadKeptModel` are additions. `forgetFile` is set by figure.ts so keptParts.ts stays free of
   Babylon imports. `loadKeptModel` is one helper shared by the three renderers.
4. The quality `onChange` and the context-loss observer are only added with the flag on, so with the flag off the code
   is identical to today.
5. A NullEngine's `_releaseTexture` is a no-op: a released texture stays in its cache. The step 5 test gives it a real
   engine's splice, so the hold is what keeps the texture.
6. The NullEngine never runs `_createTextureBase`, so the buffer path itself (the data URL and the KTX2 buffer decode)
   is only checked on a GPU run (below).

## Pending PC runs (the lead requests them)
- Affected e2e on the branch head (laptop queue, `affected-e2e`).
- `e2e-coop` + `e2e-netmove` (partner bodies use `texture()`):
  `node scripts/laptop-queue/request.mjs --sha <head sha> --pr <n> --suites "e2e-coop e2e-netmove" --set map-ready-s9-coop --requester "Night Shift | Sector Ops Build"`
- `e2e-lightbake` with the flag off as it is, then by hand with `mapready=1`:
  `node scripts/laptop-queue/request.mjs --sha <head sha> --pr <n> --suites "e2e-lightbake" --set map-ready-s9-lightbake --requester "Night Shift | Sector Ops Build"`
- GPU proof of the buffer path: with `?mapready=1`, operator and weapon textures (KTX2 and PNG) draw the same as with
  the flag off. A first load then decodes, and a repeat load in the page hits the cache.
- The repeat-load proof, once S1 and S9 are both merged into `feature/map-ready`: S1's
  `scripts/map-ready-measure.mjs --gated` repeat rows with `mapready=1`. Expect `texDecoded` 0 and `filesFetched` 0 on
  the second load of the same map, and the heap after 3 campus loads within 5% of the heap after 1.

## Step 6 (not built)
S1 (`src/core/mapReadyStats.ts`, `loadCounters`) is not on `feature/map-ready`. When it is, the follow-up is:
- add each `texReused` / `texDecoded` / `filesReused` / `filesFetched` increment in `KeptParts.useTexture` /
  `useFile` to `loadCounters` as well
- make no edit to `mapReadyStats.ts`
