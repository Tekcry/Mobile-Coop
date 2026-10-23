# Carry fix 2 (forced compile timeout, GPU skinning restore) - fresh check

PASS (fresh Opus checker, 2026-10-23), `git diff 74c352a7 d7a3b887` (0bdfa95b, d7a3b887), Babylon 9.29.0. No blocking
findings. `tsc --noEmit -p .` clean; vitest bodyEffectRecovery 4/4; `node --check scripts/e2e-guard-carry.mjs` clean.
No e2e here (Test Runner runs it in parallel).

## (a) The forced hook against the real failure path
- Same path as the real bug: `_prepareEffect` -> `_checkIsReady(prev)` is wrapped; the faulted effect's pipeline
  contexts are blocked in `engine._isRenderingStateCompiled`, which is what `WebGLPipelineContext.isReady` calls, so
  `_finalizePipelineContext` / `onCompiled` never run, as with a program that never reports COMPLETION_STATUS_KHR. On
  timeout it calls Babylon's own `_processCompilationErrors` with the exact `_RetryWithInterval` message
  ("Operation timed out after maximum retries.  - Effect: pbr"), so the real fallback chain runs (first
  `reduce` = CPU skinning, then the ranks). Only the 120 s cut becomes 1 s.
- Cannot pass vacuously: no parallel compile, a cached pipeline (constructor path skips `_checkIsReady`) or a held
  same-key effect all leave `faulted`/`timeouts` at 0 and fail the "forced fault fired" assert; on master the check
  fails (body never ready), and even if it were ready the `recompiled.length > 0 && disposed >= 1` assert fails.
- The new `gpuSkin` assert (e2e-guard-carry.mjs:306) closes the gap where the old check passed a CPU-skinned body
  (`!m.gpuSkin || ...`).
- Its own error lines are dropped from the final asserts (`forcedLog`, :308), and the `disarm()` counters are
  snapshotted before it disposes leftovers (:141-142), so its own disposals do not inflate `disposed`.
- Later passes: `_checkIsReady` short-circuits on `fault.armed` before the regex; the WeakSet / Set lookups are
  harmless; unheld faulted effects are disposed at `disarm()` (their polls stop on `_isDisposed`).

## (b) The skinning restore
- Correct: `EffectFallbacks.reduce` sets `computeBonesUsingShaders = false` on the bound mesh and on every holder of the
  effect; the restore (bodyEffectRecovery.ts:102) re-enables it on exactly the holders of the recompiled effect. The
  setter marks attributes dirty, so the next prepare builds the GPU key (NUM_BONE_INFLUENCERS 1), which is no longer in
  `_compiledEffects`.
- Only smooth bodies: holders are found by Effect identity of a SMOOTHBODY effect (define set only when `ppos` exists);
  nothing in `src/` sets `computeBonesUsingShaders` otherwise, so no mesh is meant to be CPU skinned.
- No per-frame cost: the loop runs only inside a recompile; one boolean, no allocation, no Math.hypot.
- Bounded: past MAX_RECOMPILES `recompileEffect` returns before the restore, leaving Babylon's flip in place; the GPU
  and CPU keys each have their own cap of 3.
- Normal order is safe: the timeout fires in an interval, the watch runs in `onBeforeRender` before the dirty material
  re-prepares, so E1 is disposed (its fallback poll stops) before any CPU variant exists.

## Polish list
1. The unit test's LOD branch is vacuous: `lod.computeBonesUsingShaders` is never set false (tests/bodyEffectRecovery.test.ts:117-122). Set it false next to `mesh` and assert it unconditionally (both hold the same effect).
2. A stale effect still cycling fallbacks (e.g. one the mesh no longer holds) stays bound to the mesh through
   `_fallbacks._mesh` and can flip it to CPU again on its next timeout. Converges through the cache (`createEffect`
   hands it back, it is then recompiled) and is bounded by the caps; could be closed by also `dispose(true)` of any
   unheld unready body effect of the same mesh, if it ever shows up.
3. The `forcedLog` scan (:308) runs right after `reset()`; a faulted effect created just before the disarm and timing
   out later would print "Unable to compile effect" into the later passes and fail the final assert on the fixed
   branch. Scan after a few frames, or tag lines by the faulted effects' defines.
4. The hook's interval (:67-69) calls `_isReadyInternal()` without the try/catch Babylon's `RunWithCondition` has; a
   throw there becomes a `[pageerror]`.
5. `forcedLog` drops every matching line in the window, a genuine non-body compile failure in that window included.
6. The forced pass uses 1-2 of the grunt variants' 3 recompiles (`RECOMPILES` is module-global), leaving fewer for the
   later stall pass in the same page.
