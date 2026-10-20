# gl-warning-fix - report (2026-10-21)

**Cause.** A WebGL program was deleted while its parallel link (KHR_parallel_shader_compile) was still running, so
Chrome / ANGLE then queried the deleted program: "GL_INVALID_VALUE: glGetProgramiv: Program object expected", about a
dozen per occurrence. Software GL has no parallel compile, so it never shows there. RT / TAAU / Panini were not the
trigger: the later part-4 post stack rebuilds were (the `rb` / `df` steps' `setOverride`), where a rebuild disposes a
post-process EffectWrapper whose effect has not finished compiling.

**Evidence** (GPU runs, temporary instrumentation since removed). Error counts between part-4 steps: 0 through the RT +
TAAU + Panini and governor steps, then 13-24 at the rebuild steps. A getError wrapper put the error at `deleteProgram`,
from EffectWrapper.dispose -> DrawWrapper.dispose -> Effect.dispose -> `_releaseEffect`. No JS call used a deleted
program. A delete-time COMPLETION_STATUS check found one program deleted mid-link per run. Deferring only those deletes
until their link completed: 0 warnings, part 4 passed.

**Fix.** `src/core/babylon.ts` patches `ThinEngine.prototype._deletePipelineContext`: a parallel-compiled context still
linking is flagged `_isDisposed` at once (Babylon's readiness poll stops without a GL call), then retried every 16 ms and
deleted with Babylon's real delete once COMPLETION_STATUS is true; it deletes anyway after 600 tries (about 10 s) or on
context loss, and skips if the engine is disposed. A finished program goes straight through the normal delete.

**Results.** `E2E_GPU=1 e2e-desktop` full suite PASS (95 ok, 150 s); one earlier run hit the known flake "the result is
saved as a performance note without a tap" (unrelated). `npm run build` (tsc) exit 0, eslint clean, vitest 23 passed.
The e2e assert is unchanged.

**Risks.** A still-linking program lives up to about 10 s longer (small GPU memory). Its cache / current-program reset is
delayed too (safe: Babylon never draws with an effect that is not ready). One extra `getProgramParameter` per delete.
Relies on Babylon 9.29 internals (`_deletePipelineContext`, `_isDisposed`, `isParallelCompiled`): re-check on upgrade.
