# Guard carry: recovered guard bodies GPU skinned again
kind: patch
- Fix: a guard body recovered from a timed-out shader compile (4.80.0) is GPU skinned again. Babylon's first fallback
  on the failed compile had switched the body to CPU skinning, which draws the GPU-buffer body unskinned (bind pose);
  `recompileEffect` (`src/player/bodyEffectRecovery.ts`) turns `computeBonesUsingShaders` back on for every mesh holding
  the recompiled effect. Unit test in `tests/bodyEffectRecovery.test.ts`.
- `e2e-guard-carry` gets a "(forced)" pass that makes the first guard-body compile time out the way the laptop GPU did
  (a runtime hook on Babylon's compile poll, cut to 1 s, with Babylon's own timeout error), so the suite fails without
  the recovery (master 4.79.0 fails it: the guard stays invisible). The pass asserts the fault fired (a timeout or a
  recovery drop), the body recompiled, drawn and GPU skinned again. Run with `E2E_GPU=1`.
