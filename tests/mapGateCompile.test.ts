// (0b load crash) The load gate's compile (`GameState.gateCompile`) never turns a material's shader hot-swap off. Babylon's
// `forceCompilation` did, on the shared frozen guard part material while the gate drew frames: a real sub-mesh then took
// an unfinished shader and the frozen shortcut bound it (`reading 'world'` in `bindForSubMesh`), killing the render.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AbstractMesh, Material } from '../src/core/babylon';

afterEach(() => {
  vi.restoreAllMocks();
});

vi.mock('virtual:pwa-register', () => ({ registerSW: () => async () => undefined }));

type GateCompile = (mat: Material, m: AbstractMesh, inst: boolean) => Promise<void>;

async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { GameState } = await import('../src/game/gameState');
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const lib = new PartLibrary(scene);
  const part = lib.instance('box', '#808080', 'gate-part');
  const mesh = part.sourceMesh;
  const gateCompile = (GameState as unknown as { gateCompile: GateCompile }).gateCompile;
  return { engine, scene, lib, mesh, gateCompile };
}

describe('map-ready gate compile (0b)', () => {
  it('compiles the shared frozen part material on its own sub-mesh, hot-swap left on, the real sub-mesh untouched', async () => {
    const { engine, lib, mesh, gateCompile } = await setup();
    const mat = lib.material;
    expect(mat.isFrozen).toBe(true);
    expect(mat.allowShaderHotSwapping).toBe(true);
    const real = mesh.subMeshes[0]!;
    const before = real.effect;
    const swaps: boolean[] = [];
    const isReady = mat.isReadyForSubMesh.bind(mat);
    vi.spyOn(mat, 'isReadyForSubMesh').mockImplementation((m, sm, inst) => {
      swaps.push(mat.allowShaderHotSwapping);
      return isReady(m, sm, inst);
    });
    await gateCompile(mat, mesh, true);
    expect(swaps.length).toBeGreaterThan(0);
    expect(swaps.every((s) => s)).toBe(true);
    expect(mat.allowShaderHotSwapping).toBe(true);
    expect(real.effect).toBe(before);
    engine.dispose();
  });

  it('settles at once for a disposed mesh', async () => {
    const { engine, lib, mesh, gateCompile } = await setup();
    mesh.dispose();
    await expect(gateCompile(lib.material, mesh, false)).resolves.toBeUndefined();
    engine.dispose();
  });
});
