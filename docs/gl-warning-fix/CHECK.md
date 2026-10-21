# gl-warning-fix - CHECK (PR #79, Babylon 9.29.0) - FIX (2 small items, logic sound)

Leaks: bounded. Stuck link deletes after 600 tries (babylon.ts `++tries < 600`; ~10 s, longer if a hidden tab throttles timers, still bounded). Context lost: deletes at once. Engine disposed: dropped on purpose (the context goes with it). Double delete: none. Effect.dispose runs once (effect.pure.js:1180), the recompile path deletes only the previous context (effect.pure.js:563), and `_rebuildEffects` nulls `_pipelineContext` (abstractEngine.pure.js:214). The early `_isDisposed` only stops Babylon's poll (thinEngine.functions.js:123). Engine's override (engine.pure.js:287) calls `super`, so it reaches the patch. Hot path: one closure + one `getProgramParameter` per parallel-compiled delete (rebuilds / recompiles only). Fine.

1. **Upgrade guard missing (blocker).** If Babylon renames `_deletePipelineContext`, `isParallelCompiled` or `_isDisposed`, the patch turns into a silent no-op and the warnings come back. Add `tests/glWarningFix.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ThinEngine } from '@babylonjs/core/Engines/thinEngine';
import { WebGLPipelineContext } from '@babylonjs/core/Engines/WebGL/webGLPipelineContext';
const core = 'node_modules/@babylonjs/core/';
describe('gl-warning-fix: Babylon internals behind the deferred program delete', () => {
  it('exist, on the checked version (on upgrade: re-check src/core/babylon.ts, then bump)', () => {
    expect(JSON.parse(readFileSync(core + 'package.json', 'utf8')).version).toBe('9.29.0');
    expect(typeof ThinEngine.prototype._deletePipelineContext).toBe('function');
    expect(typeof ThinEngine.prototype._isRenderingStateCompiled).toBe('function');
    expect(new WebGLPipelineContext()._isDisposed).toBe(false);
    const fns = readFileSync(core + 'Engines/thinEngine.functions.js', 'utf8');
    expect(fns).toContain('pipelineContext.isParallelCompiled = true');
    expect(fns).toContain('webGLPipelineContext._isDisposed');
  });
});
```
Done looks like: vitest 24 passed. Bumping @babylonjs/core fails it with a message that names the file to re-check.

2. **Stale program after a context restore (rare, polish-plus).** If the context is lost and restored between two retries (likely in a hidden tab, where timers slow to 1 s+), `getProgramParameter` on the old program raises INVALID_OPERATION and returns null. That reads as "still linking", so the loop runs 600 times and logs a GL error each time. `isProgram` returns false for a deleted or other-context program and raises no error, which also guards any future double delete. In `release`, after `if (this.isDisposed) return;` add:
```ts
    if (ctx.program && !gl.isContextLost() && !gl.isProgram(ctx.program)) return; // already deleted or from a lost context
```
(move `const gl = this._gl;` above it). Done looks like: build + eslint clean, and the `E2E_GPU=1 e2e-desktop` part 4 still shows 0 warnings.
