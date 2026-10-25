# section-bake check B (engine safety and render)

**Verdict: FIX** (one must-fix, small; everything else polish).

Checker B, fresh, 2026-10-24. Branch `feature/sector-redesign-bake` head cfacf4bc vs master 95849c26. Read: agent preamble,
CLAUDE.md hard rules, `SECTION-BAKE.md`, `section-bake-build.md`, the full diff, Babylon 9.29.0's `thinEngine.pure.js` /
`engine.rawTexture.pure.js` / `engine.dynamicTexture.pure.js`, `workerPool.ts`, `e2e-lib.mjs`, `guard-cap.mjs`.
Ran (slot sr-slot-3, CPU 40-60%): `npx tsc --noEmit -p .` clean; eslint on the 13 changed src / test files clean;
`tests/sectionBake.test.ts` 11/11, `tests/sectionBakeCampus.test.ts` 3 passed + 1 skipped (heavy), `tests/bounceGrid.test.ts`
11/11. No e2e, build or GPU run.

## Must-fix

1. **`src/world/bakedLamps.ts:830-833` (`uploadTile`): `UNPACK_FLIP_Y_WEBGL` is never cleared before `texSubImage3D`.**
   Babylon caches the flip-Y unpack state and sets it only on its own uploads (`ThinEngine._unpackFlipY`); it never
   resets it afterwards. Every image texture loaded with `invertY` true (Babylon's default: `operators/runtime/figure.ts`
   PNG / WebP textures, `invertY = !isKtx2`) and every `DynamicTexture.update()` (fence and menu-beam textures,
   default `invertY` true) leave `UNPACK_FLIP_Y_WEBGL = 1` in the GL context. The WebGL 2 spec makes `texImage3D` /
   `texSubImage3D` from an `ArrayBufferView` with FLIP_Y or PREMULTIPLY_ALPHA set an `INVALID_OPERATION` (Chrome logs
   "FLIP_Y or PREMULTIPLY_ALPHA isn't allowed for uploading 3D textures") and uploads nothing. `uploadTile` still
   returns true and counts `tileUploads`, so there is no fallback.
   Failure: cold campus load; S1's lamps land during the load (`landed` -> `uploadTile`, :738) while the operator / guard
   figure textures are decoding (image `onload` callbacks run between the same frames as the worker landings). Any
   lamp whose tile goes up after such an image upload stays 0 in the atlas: the car park flood is black on screen while
   the light field, meter and guards read it lit. A parity break, random per load, invisible to the node tests (no GL)
   and to the GPU e2e (e2e-lightbake does not run campus cold). Background tiles in `stepLanding` hit the same race
   whenever a texture loads during play.
   Fix (one line, same as Babylon's own `updateRawTexture3D`): before `texSubImage3D` call the engine's
   `_unpackFlipY(false)` (add it to the cast type; if it is missing, `gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)` and
   set `_unpackFlipYCached = null`). PREMULTIPLY_ALPHA is safe: Babylon resets it to 0 after each premultiplied upload.
   A one-shot check worth adding to the laptop run: `gl.getError()` after the first `uploadTile` in a debug build, or
   read back one S1 flood's atlas texel.

## Checked, no fault

- **(1) Hot paths.** Per frame only `stepLanding` (:761) runs while tiles are queued or fades run: typed-array queue and
  fade list, `performance.now()`, `Math.min/max`, `slabDepth` (pure arithmetic), `uploadTile` (no allocation:
  `getInternalTexture`, a cast, `getParameter(UNPACK_ALIGNMENT)` served client-side). No closures, iterators, temp
  arrays, `Math.hypot` or uint32 returns. `SectionPlan.ready` / `next` / `setLive` / `liveMember` allocate nothing
  (`ready` is O(134) per sim step at the connector gate, constant after `done`). The light field's read path is
  unchanged (`BounceGrid` fields lost `readonly` only). All allocations (`bakeVisSampler`, `lampDoorListInto`'s
  default `near`, `joinBounce`, `BounceGrid.load`'s box copy) run in landing callbacks, never per frame.
- **(2) Texture path.** No new Babylon import: `uploadTile` reaches `_gl`, `_bindTextureDirectly` through a cast of
  `scene.getEngine()` (the same pattern as the existing `uploadRows` / `SubUpload`); the hard rule (imports only through
  `core/babylon.ts`) holds. Region maths match `fillLampAtlas` (x fastest, then y, then z; offsets x / z, page y);
  `UNPACK_ALIGNMENT` 1 is set and restored; no row-length / image-height / PBO state is in play. The game only makes a
  WebGL `Engine` (`core/engine.ts`), so `_gl` and `_bindTextureDirectly` exist and the fallback is reachable only on a
  NullEngine or a future WebGPU engine. No new sampler: tiles go into the existing R8 3D atlas (16-texture cap
  unchanged). GPU memory: one atlas, updated in place, no double buffer. `TILE_BUDGET` 4 MB / frame: at most one z slice
  over (a slice is <= 192 x 97 B = 18 KB); the ~45 MB of non-S1 tiles go up over ~11 frames as they land.
- **(3) Worker pool.** One lamp per job, `plan.next()` = live section first, biggest box first; `setLive` reorders
  without cancelling in-flight jobs (fine). `GameState.dispose` -> `SectionBaker.dispose` -> `WorkerPool.dispose`
  terminates every worker; in-flight promises never settle and the queue rejects into `retryInline`, which returns on
  `disposed`. A finished baker disposes its pool in `complete`. Map change / quit = a new `GameState` (old one
  disposed); in-match sector restart keeps the baker (same section). Nothing holds workers or buffers across matches
  (`BAKERS` is a WeakMap, entry deleted at `complete`). Low-core CPU share: pool `max(2, hc - 4)`; by the report's own
  table the background after play starts is only ~3.6 s (W 4) to ~7 s (W 2), not the ~25 s risk 4 states.
- **(4) Wire.** `coopClient.ts` adds one line reading the existing `msg.ls` of the `sector` message; no message shape
  change; `PROTOCOL_VERSION` not touched (not in any changed file).
- **(5) Owned files.** Not in the diff: `src/world/world.ts`, `sunCascadeCull.ts`, `src/game/sectorGuardFreeze*`,
  `src/ai`, `src/game/course`, `courseMode.ts`, ctcourse maps, `tests/lightField.test.ts`.
- **(6) Other maps.** `sectionBakeFor` is campusOps only (and campusOps is `modes: ['sector']`). Elsewhere: `bakeLevelLamps`
  with the same arguments (cache read split out, same behaviour); `sections: null`; `sectionBakerOf(r)` null so
  `fade` is all 1 (`x * 1` is bit-identical) and `stepLanding` never runs; `lampDoorLists` writes the same rows
  (`-1` past the list as `fill(-1)` did); `BounceGrid` constructor -> `load` gives the same arrays (a 1-cell grid keeps
  zeroed arrays, same values); the connector gate and `GameState` wait are no-ops without a baker; the e2e-lib wait
  returns at once (`!s`). The full-map path is the old one.
- **(7) Docs.** `lighting.md` "Per-section lamp bake", the TESTING.md line and the changelog fragment match the code
  (names, 4 MB, 1.5 s, SB14). `e2e-lib.mjs:221` waits on `sections.done || disposed || !sections`, polling 250 ms, 240 s
  timeout, after the player exists. **Risk 6 (guard-cap) is not real:** `guard-cap.mjs:577` boots through e2e-lib's
  `launch`, which calls `openPage` with its `autostart=campusOps` params, so it gets the same wait (as do `perf.mjs` and
  `campus-art-shots.mjs`). Severity: none; correct the report line.

## Polish (not blocking)

1. `uploadTile` would be safer as a helper in `src/core/babylon.ts` (next to `max3DTextureSize`): one place that knows the
   engine internals, pinned to the Babylon version, with the flip-Y reset from must-fix 1.
2. Fallback hitch: without `texSubImage3D`, `reuploadAtlas` (:848) allocates and fills the whole atlas (>= 133 MB) and
   `texImage3D`s it per landing batch (`landed` :747, `stepLanding` :773): ~0.3-1 s per batch, ~15-20 batches. Not
   reachable on the WebGL engine; guard it anyway: once `uploadTile` has failed, stop re-uploading per batch and do one
   re-upload when the baker is `done` (lamps stay dark until then, both off the live section).
3. `SectionBaker.retryInline` (sectionJobs.ts:174) bakes on the main thread: a big flood is 2-5 s, so a worker error
   during play freezes the game that long, and a worker that fails every job (script load failure) would bake every
   remaining lamp inline. Retry once on the pool first, or, once playing, hold the inline bake until a quiet moment.
   A worker that dies without `onerror` leaves its job in flight forever and `whenReady` never resolves (same as the old
   `Promise.all`; a timeout would turn a hung load into a slow one).
4. Live-member landings during play upload whole tiles unbudgeted (`landed` :738, up to 8 x 3.6 MB in one callback):
   reachable for a late-joining client (risk 1). Route them through the queue head instead of a direct upload.
5. On `setLive`, lamps of the new live section still in the tile queue or mid-fade keep the queue order and the 1.5 s
   fade: if the host's SB9 gate opens just before the cycle, deep-k+1 lamps can come in dim for a moment while the meter
   reads them in full. Snap their fade to 1 and move their tiles to the queue head on `setLive`.
6. SB14: the cache write waits for a section change or `GameState.dispose`. A player who closes the browser or reloads
   during S1 (minutes) never gets it written: the next load is cold again. The 133 MB clone at the connector cycle is
   also a mid-play hitch (one-time per cold install; ~100-300 ms, unmeasured). Consider the pause menu or an idle
   callback as the quiet moment; the changelog's "later loads are unchanged" holds only after a section change or a quit.
7. Per-flush main-thread work during the background window (`joinBounce` re-join, `BounceGrid.load`'s full `bits` re-OR
   over ~650 k cells and every lamp's bounce cells, the whole data-texture upload from `version = -1`): estimated
   10-30 ms per flush, ~10 flushes in the first seconds of play. Inside the report's "no hitch spikes in the first 30 s"
   laptop check; measure there.
8. `SectionBaker.parts` (per-lamp bounce) is kept for the whole match after `complete`; drop it there.
9. Editor only: `BakedLamps` volume mode (Kestrel light view) never uploads the fade colours or remixes the volume from
   `stepLanding`; a background lamp would stay dark until the next registry change. Unreachable today (campusOps is not
   an editor map); worth a guard if the opt-in table grows.
10. e2e-lib wait swallows its 240 s timeout silently (`.catch(() => {})`): log it so a suite that runs on a half-baked
    campus says so.
