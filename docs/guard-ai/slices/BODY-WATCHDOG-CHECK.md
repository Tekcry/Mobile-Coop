# Body compile watchdog: check

Checker: fresh Opus, 2026-10-24, read-only. Branch `feature/guard-ai-body-watchdog` head afc9cdd7, diff against master
cacd0c7e. Builder report: `BODY-WATCHDOG.md`. No e2e (as briefed).

**Verdict: PASS.** No broken or wrong behaviour found. Two non-blocking follow-ups (pin strings, measure the Epic
compile time).

## Tests run
- `npx vitest run tests/bodyEffectRecovery.test.ts`: 9/9 pass (1.9 s).
- `npx vitest run tests/glWarningFix.test.ts`: 1/1 pass.

## 1. `unlinkCachedPipeline` against Babylon 9.29.0
Read in `node_modules/@babylonjs/core` (version 9.29.0):
- The cache is `getStateObject(gl).cachedPipelines` (a per-GL-context WeakMap entry, `Engines/thinEngine.functions.js:18-34`),
  keyed by NAME: `createAndPreparePipelineContext` sets `pipelineContext._name = options.name` and
  `cachedPipelines[name] = pipelineContext` (`Materials/effect.functions.js:186-190`); the name is the effect `_key`
  with `\r` removed and `\n` -> `|` (`Materials/effect.pure.js:555`). `_key` is fixed per effect, so Babylon's
  fallbacks and a recompiled effect of the same variant all land under the same name. The patch imports
  `getStateObject` from the same module file Babylon uses, so it reads the same WeakMap.
- `resetCachedPipeline` (`effect.functions.js:23-32`) disposes and evicts whatever is cached under `pipeline._name`,
  not the pipeline passed in. It is the only reader of a pipeline context's `_name` in the WebGL path (grep), so
  clearing `_name` has no other effect.
- `Effect.dispose` runs `resetCachedPipeline(own context)` before `_releaseEffect` -> `_deletePipelineContext`
  (`effect.pure.js:1188-1191`). So in the watchdog's `effect.dispose(true)` the entry is already gone when the patch
  runs; `unlink` returns false, but clears `_name`, which is what stops the deferred original delete (link done,
  seconds later) from disposing the successor cached under the same name. This matches the triage's
  "program disposed (2/3)": confirmed as a real Babylon name-keyed reset racing the gl-warning-fix deferral.
- Behaviour per case, original vs patched:
  - cache holds this very context: original disposes and evicts it; patched evicts it and calls `ctx.dispose()`.
    Same.
  - cache holds nothing under the name: both no-op. Same.
  - cache holds a different context (the successor): original disposes and evicts the successor (the bug); patched
    leaves it. Only change.
- No leak: the GL program is still deleted on both paths (immediately for a non-parallel or linked program; deferred
  until link completion otherwise). The only thing skipped is the reset of an entry that is not this context.
- No dangling cache entry: a context is only ever removed from the name it is still cached under, by identity, at
  delete time, so a deleted context cannot stay in the cache.
- Effects that are never recompiled: the only path they meet is Babylon's own `_prepareEffect` delete of a
  `previousPipelineContext` once the new one compiles (`effect.pure.js:561-565`). Same key, so originally that reset
  disposed and evicted the freshly compiled context; now it is left alone. That is an improvement, not a regression.
  Context loss: `deleteStateObject` drops the cache (`thinEngine.pure.js:187,199`); a late delete of a pre-loss
  context now cannot touch a post-restore entry of the same name either.
- Pinning: `tests/glWarningFix.test.ts` is unchanged. Its `version === '9.29.0'` pin is real and fails on any
  upgrade, which forces a re-check of `src/core/babylon.ts`. It does not assert the new internals the unlink relies on
  (`resetCachedPipeline` keyed by `pipeline._name`, `cachedPipelines`, `getStateObject` exported from
  `Engines/thinEngine.functions`). The self-catch test in `bodyEffectRecovery.test.ts` exercises them behaviourally.
  Follow-up (non-blocking): add `toContain` string checks for `stateObject.cachedPipelines[name]` and
  `const name = pipeline._name` in `effect.functions.js` to the pin test.
- Hard rules: the new Babylon import is in `src/core/babylon.ts`; strict TS types (`Pick<IPipelineContext,'_name'>`).

## 2. Detection
`stuckReason` is unchanged apart from `STUCK_MS` 8000 -> 45000.
- Forced timeout (`scripts/e2e-guard-carry.mjs:76-101`): the hook calls `_processCompilationErrors` with Babylon's
  "Operation timed out" error after 1 s; `getCompilationError()` then contains "timed out" -> recovered on the next
  render, independent of `STUCK_MS`. Unit test "Babylon's timeout ... recovered at once" covers it.
- Compile error: recovered once `allFallbacksProcessed()` (test "a real compile error"). Unchanged.
- Context disposed under the effect: `pc._isDisposed` -> "program disposed" at once. Unchanged; the fix removes the
  false positive from a late delete of the predecessor (self-catch test).
- Slow compile: no error, context not disposed -> only the cap, which needs 30 frames AND 45 s. Nothing logs before a
  recovery (`recompileEffect` is the only `console.warn`). Unit test: 20 s at 60 fps, no warn, same effect kept.
- `MAX_RECOMPILES` 3 per key and the GPU-skinning restore loop in `recompileEffect` are byte-identical (diff is
  comments only there).

## 3. 45 s worst case
Acceptable. The cap is now only a backstop for a compile that never completes and never errors; every observed real
failure (Babylon's timeout, a failed compile, a disposed context) still recovers at once. Babylon's own poll counts
7500 x 16 ms tries (`Misc/timingTools.js:54`), so its cut is 120 s or later in wall time; 45 s brings a true hang
forward by at least 75 s.
A shorter cap with no warn would not be safer: `recompileEffect` always warns, and restarting a compile that is only
slow makes it slower (the old program keeps linking under the gl-warning-fix deferral while the new one queues
behind it), which is the failure being fixed. Residual risk: the LR16 Epic body compile time on cold D3D11 is not
measured (triage: "> 8 s"). If it exceeds 45 s under three browsers, e2e-lightbake still warns. Follow-up: read the
compile time from the laptop e2e-lightbake run on LR16; if it comes near 45 s, raise the cap or leave a still-linking
program to Babylon's timeout entirely.

## 4. e2e-guard-carry wait
Still meaningful. `check()` (`scripts/e2e-guard-carry.mjs:264-274`) breaks as soon as the body is ready and drawn, so
a passing run is not slower. The forced pass recovers at ~1 s through the timeout path and still asserts the
"recompiling" log, a faulted effect dropped and GPU skinning restored. The stall pass's 60 s covers the 45 s
backstop plus ~15 s for the recompile; a body that never shows within 60 s still fails.
