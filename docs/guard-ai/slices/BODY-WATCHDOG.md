# Body compile watchdog (blocks PR #291, LR16 e2e-lightbake)

Status: built (Opus, 2026-10-24), branch `feature/guard-ai-body-watchdog` off master cacd0c7e. Unit tests and tsc
here; e2e on the laptop queue (below). Triage it answers: `docs/sector-redesign/checks/lr16-lightbake-triage.md`
(origin/feature/sector-redesign-polish).

## Cause
e2e-lightbake (`gfx=epic: no console errors`) failed on LR16 x master with:

    [warning] smooth body e1-smooth: body shader compile stuck, recompiling (1/3)
    [warning] smooth body e1-smooth: body shader program disposed, recompiling (2/3)

1. **"compile stuck (1/3)": the 8 s cap.** `src/player/bodyEffectRecovery.ts:18-19` (master) `STUCK_MS = 8000`,
   `STUCK_FRAMES = 30`: `stuckReason` (:55) recompiled any body effect unready for 8 s and 30 frames. LR16's Epic body
   fragment shader is ~5-6x bigger; a cold ANGLE D3D11 compile with three browsers at once takes longer than 8 s. The
   watchdog restarted a compile that was only slow, and warned.
2. **"program disposed (2/3)": a late delete of the old program hit the new one.** `recompileEffect` drops E1 with
   `effect.dispose(true)` -> `_releaseEffect` -> `_deletePipelineContext(pc1)`. The gl-warning-fix patch
   (`src/core/babylon.ts:184-201` on master) defers deleting a program that is still linking until its link
   completes (seconds, for this shader). The original delete it finally calls runs Babylon's `resetCachedPipeline(pc1)`
   (`node_modules/@babylonjs/core/Engines/thinEngine.pure.js:1644`), which is keyed by NAME (the effect key,
   `Materials/effect.functions.js:23-31`): it disposes whatever context is cached under the key at that moment. By then
   the recompiled effect E2 (same key) has cached its own context pc2 there, so pc2 is flagged `_isDisposed`;
   `_isRenderingStateCompiled` (`Engines/thinEngine.functions.js:123`) is false for a disposed context, so E2 can never
   become ready, and the watchdog correctly saw "program disposed" on it. The same late reset also explains the
   forced-fault "program disposed" race in `GUARD-CARRY-FLAKE.md`, and it can hit Babylon's own fallback path (a
   previous context deleted when the next one, same key, compiles).

## Fix
- `src/player/bodyEffectRecovery.ts:24` `STUCK_MS = 45000` (was 8000), `STUCK_FRAMES` 30 unchanged. Recovery at once
  only on a real failure (unchanged checks, :53-57): Babylon's poll timed out (its onError, "timed out"), the compile
  failed with all fallbacks used, or the held effect's program context disposed. A compile still running
  (KHR_parallel_shader_compile not done) is left to finish; only the last-resort cap (45 s and 30 frames, still ahead
  of Babylon's own 120 s timeout) drops it. Nothing is logged before a recovery, so a slow compile prints nothing.
- `src/core/babylon.ts:185-207` `unlinkCachedPipeline`: before the (patched) `_deletePipelineContext` runs, the context
  is unlinked from the GL pipeline cache by identity: its own entry goes now (a new effect must not pick up a context
  being deleted, and it is flagged disposed as the original reset did), a successor's entry under the same name is left
  alone, and its `_name` is cleared so the original delete's name-keyed reset (immediate or deferred) touches nothing.
  So a recompile's drop of the old program can never count as the new effect's failure.
- Carry-fix guarantees kept: `recompileEffect` is unchanged apart from comments (GPU skinning restored on the holders,
  leftover cached pipeline dropped, `MAX_RECOMPILES` 3 per variant).
- `scripts/e2e-guard-carry.mjs:27-28` `STALL_WAIT_MS` 30 s -> 60 s, so the stall pass still covers a compile that
  never finishes (recovered at 45 s now). The loop ends as soon as the body is ready, so a passing run is not slower.
  The forced pass is unaffected: its hook makes Babylon's poll time out after 1 s with Babylon's own timeout error
  through `_processCompilationErrors`, which `stuckReason`'s "timed out" check catches at once (and the fixed cache
  reset no longer races it into "program disposed"; the assert accepts either).
- Docs: `docs/systems/world-and-characters.md` (smooth body bullet), fragment `changes/feature-guard-ai-body-watchdog.md`.

## Tests (`tests/bodyEffectRecovery.test.ts`, NullEngine)
New, `describe('guard-ai body watchdog ...')`:
- slow compile pending 20 s at 60 fps (1251 watch calls), then ready: never recovered, no warn, same effect kept.
- real compile error: not while Babylon is still on fallbacks; recovered ("compile failed") once they are used.
- Babylon's timeout (the forced e2e path) with the next fallback still compiling: recovered at once ("compile timed out").
- self-catch: a GL stand-in with KHR completion status; the old program (still linking) is deleted, the recompiled
  effect's context is cached under the same key, then the old link completes and its deferred delete runs: the new
  context is NOT disposed, stays cached, the watch does not fire; then a real `recompileEffect` swap drops its own
  context and clears the key, and the fresh effect compiles with no second recovery (one warn in total).
  Mutation check: without the `_name` clear this test fails (`succ._isDisposed` true); without the unlink it fails too.
- cap unchanged: `MAX_RECOMPILES` 3, `STUCK_FRAMES` 30 (the existing give-up test still passes).
Existing 4 carry-fix tests unchanged and passing (timed-out recompile, GPU-skinning restore, cap, disposed / cap timing).

Results: `npx vitest run tests/bodyEffectRecovery.test.ts tests/glWarningFix.test.ts` 10/10 pass;
`tests/changesFragments.test.ts` pass; eslint on the changed files clean; `npx tsc --noEmit -p .` clean.

## Laptop (Test Runner queue, `E2E_GPU=1`)
- `e2e-lightbake` (the PR #291 blocker): on this branch it bakes master's lamp code, so it shows no regression only. The
  real proof is e2e-lightbake on LR16 once this merges (lr16-entry picks it up): no "recompiling" warning, solo on the
  laptop GPU, then `e2e-desktop:3` per the triage.
- `e2e-guard-carry`: the forced compile timeout must still recover (log shows `compile timed out, recompiling (1/3)`
  and `forced: ... GPU skinned again`), the stall and 1 s-step passes green.

## Risks
- A compile that genuinely hangs now leaves a guard undrawn up to 45 s (was 8 s) before the last-resort recompile;
  Babylon's own timeout would take 120 s.
- `unlinkCachedPipeline` changes Babylon-internal cache behaviour for every WebGL effect (only the name-keyed reset of
  a context that is no longer the cached one; that reset was the bug). Pinned by `tests/glWarningFix.test.ts` (9.29.0).
