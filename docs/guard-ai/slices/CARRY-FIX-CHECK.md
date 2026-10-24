# Carry fix (invisible guard bodies) - fresh check

PASS (fresh Opus checker, 2026-10-23), 48d049ad on master 4.78.0 acdbbf29, against Babylon 9.29.0. No blocking findings.
`tsc --noEmit` clean; vitest bodyEffectRecovery, smoothBody, smoothBodyMerge 10/10. No e2e (Test Runner runs
e2e-guard-carry + stealth-ai on 48d049ad and the suite on master f16600f5, expected to fail there).

## Findings
- The recompile is really fresh: after a timeout the effect's `_pipelineContext` is null, so `dispose(true)` never
  resets `cachedPipelines[name]`; the manual delete in `recompileEffect` (same key-to-name mapping as `_prepareEffect`)
  closes that gap. `_releaseEffect` drops the `_compiledEffects` entry and `setEffect(null)` nulls the defines, so PBR
  `isReadyForSubMesh` builds a new Effect with a new program. No double delete when the effect was still compiling.
- No other mesh's rendering is at risk: only that Effect is disposed and every holder was already unready; shadow /
  depth / outline effects have their own keys; the scene.meshes scan (bodyEffectRecovery.ts:91) resets every holder.
- The "never finishes" trigger needs 8 s wall time and 30 rendered frames (a no-render stall alone cannot fire it).
- Per frame: a draw-wrapper lookup + `isReady()` per body mesh (~80 calls at 40 guards), no allocation.

## Polish list
1. A slow but healthy compile (cold ANGLE / D3D shader cache at load) can be killed at 8 s and re-queued up to 3 times,
   delaying a body's first appearance; worth one cold-cache load on the laptop, or a higher STUCK_MS.
2. `RECOMPILES` cap (bodyEffectRecovery.ts:35) is module-global: reset it per scene / map load.
3. A sub-mesh outside the scan (another scene on the engine, e.g. menuScene) keeps the disposed effect and
   bodyEffectRecovery.ts:64 returns early on `effect.isDisposed`: call `setEffect(null)` there instead.
4. With shader hot swapping a stuck replacement sits behind the ready previous effect (stale defines, still visible).
5. The unit test fakes the timed-out state through private fields; the real proof is the GPU e2e stall pass.
