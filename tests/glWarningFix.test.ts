// (gl-warning-fix, backlog 27) src/core/babylon.ts patches ThinEngine._deletePipelineContext to defer deleting a WebGL
// program that is still linking in parallel. It relies on Babylon internals; this fails loudly when they move.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ThinEngine } from '@babylonjs/core/Engines/thinEngine';
import { WebGLPipelineContext } from '@babylonjs/core/Engines/WebGL/webGLPipelineContext';

const core = 'node_modules/@babylonjs/core/';

describe('gl-warning-fix: Babylon internals behind the deferred program delete', () => {
  it('exist, on the checked version (on an upgrade: re-check src/core/babylon.ts, then bump the version here)', () => {
    expect(JSON.parse(readFileSync(core + 'package.json', 'utf8')).version).toBe('9.29.0');
    expect(typeof ThinEngine.prototype._deletePipelineContext).toBe('function');
    expect(typeof ThinEngine.prototype._isRenderingStateCompiled).toBe('function');
    expect(new WebGLPipelineContext()._isDisposed).toBe(false);
    const fns = readFileSync(core + 'Engines/thinEngine.functions.js', 'utf8');
    expect(fns).toContain('pipelineContext.isParallelCompiled = true');
    expect(fns).toContain('webGLPipelineContext._isDisposed');
  });
});
