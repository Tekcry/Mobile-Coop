// (guard-ai carry fix) A smooth body whose PBR effect timed out compiling (Babylon's parallel-compile poll gives up:
// "Operation timed out after maximum retries. - Effect: pbr") is recompiled: the failed effect leaves the engine's
// cache and every sub-mesh holding it, a new one compiles; a program disposed under an unready effect and a compile
// that never finishes recover the same way; after MAX_RECOMPILES per variant the body is left alone.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Effect, Mesh } from '../src/core/babylon';

afterEach(() => {
  vi.restoreAllMocks();
});

async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const rec = await import('../src/player/bodyEffectRecovery');
  rec.resetEffectRecovery();
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const lib = new PartLibrary(scene);
  const def = ENEMIES.grunt;
  const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, `enemy-${sl}`), def.look, def.height, 'g1', { build: def.build, armor: def.plated, style: 'detailed', merge: true });
  const mesh = rig.renderMeshes[0] as Mesh;
  const readyNow = (): boolean => mesh.material!.isReadyForSubMesh(mesh, mesh.subMeshes[0]!, false);
  // (the first effect waits on a texture or two: a few ticks)
  const ready = async (): Promise<boolean> => {
    for (let i = 0; i < 50; i++) {
      if (readyNow()) return true;
      await new Promise((r) => setTimeout(r, 10));
    }
    return false;
  };
  const compiled = (): Record<string, Effect> => (engine as unknown as { _compiledEffects: Record<string, Effect> })._compiledEffects;
  return { engine, rig, mesh, ready, readyNow, compiled, rec };
}

const TIMEOUT = 'Error: Operation timed out after maximum retries.  - Effect: pbr';

/** Make `e` look like Babylon's state after the readiness poll timed out (all fallbacks used, no program). */
function timeOut(e: Effect): void {
  const x = e as unknown as { _isReady: boolean; _pipelineContext: unknown; _compilationError: string; _allFallbacksProcessed: boolean };
  x._isReady = false;
  x._pipelineContext = null;
  x._compilationError = TIMEOUT;
  x._allFallbacksProcessed = true;
}

describe('guard-ai carry fix: body effect recovery', () => {
  it('a timed-out body effect is dropped and compiled afresh; the body is ready again', async () => {
    const { engine, mesh, readyNow, compiled, rec, rig } = await setup();
    expect(mesh.material?.name).toBe('partSkinMat');
    // the body's effects time out before they are ever ready (as on the laptop GPU)
    const create = engine.createEffect.bind(engine);
    let failing = true;
    vi.spyOn(engine, 'createEffect').mockImplementation((...a: Parameters<typeof engine.createEffect>) => {
      const e = create(...a);
      if (failing && e.key.includes('SMOOTHBODY')) {
        // held failed: the (Null engine's) compile finishing later must not make it ready
        timeOut(e);
        for (const [k, v] of [['_isReady', false], ['_pipelineContext', null], ['_compilationError', TIMEOUT]] as const) Object.defineProperty(e, k, { get: () => v, set: () => {}, configurable: true });
      }
      return e;
    });
    const lod = rig.renderMeshes[1] as Mesh;
    const lodReady = (): boolean => lod.material!.isReadyForSubMesh(lod, lod.subMeshes[0]!, false);
    for (let i = 0; i < 20; i++) {
      expect(readyNow()).toBe(false);
      lodReady();
      await new Promise((r) => setTimeout(r, 5));
    }
    // what the laptop GPU showed: the material keeps the failed effect, never ready
    const bad = mesh.subMeshes[0]!.effect!;
    expect(bad.getCompilationError()).toBe(TIMEOUT);
    expect(lod.subMeshes[0]!.effect).toBe(bad);
    expect(compiled()[bad.key]).toBe(bad);
    failing = false;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const w = rec.newEffectWatch();
    const wl = rec.newEffectWatch();
    expect(rec.watchBodyEffect(mesh, w, 0)).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('compile timed out, recompiling (1/3)'));
    expect(bad.isDisposed).toBe(true);
    expect(compiled()[bad.key]).toBeUndefined();
    // every sub-mesh holding it (the low LOD too) re-prepares
    expect(mesh.subMeshes[0]!.effect).toBeNull();
    expect(lod.subMeshes[0]!.effect).toBeNull();
    // as the render loop does: each frame the material re-prepares and the watch runs (earlier failed variants, made
    // before the textures were ready, are recompiled the same way when they come back)
    let ok = false;
    for (let f = 1; f < 40 && !ok; f++) {
      ok = readyNow() && lodReady();
      rec.watchBodyEffect(mesh, w, f);
      rec.watchBodyEffect(lod, wl, f);
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(ok).toBe(true);
    const fresh = mesh.subMeshes[0]!.effect!;
    expect(fresh).not.toBe(bad);
    expect(fresh.isReady()).toBe(true);
    expect(lod.subMeshes[0]!.effect!.isReady()).toBe(true);
    // ready: nothing more to do
    expect(rec.watchBodyEffect(mesh, w, 100)).toBe(false);
    rig.dispose();
  });

  it("undoes Babylon's CPU-skinning fallback on the meshes holding the recompiled effect", async () => {
    const { mesh, ready, rec, rig } = await setup();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await ready()).toBe(true);
    expect(mesh.skeleton).toBeTruthy();
    expect(mesh.computeBonesUsingShaders).toBe(true);
    const lod = rig.renderMeshes[1] as Mesh;
    // as EffectFallbacks.reduce does on a failed compile: the holders drop to CPU skinning
    mesh.computeBonesUsingShaders = false;
    timeOut(mesh.subMeshes[0]!.effect!);
    const lodHeld = lod.subMeshes[0]!.effect === mesh.subMeshes[0]!.effect;
    expect(rec.watchBodyEffect(mesh, rec.newEffectWatch(), 0)).toBe(true);
    expect(mesh.computeBonesUsingShaders).toBe(true);
    if (lodHeld) expect(lod.computeBonesUsingShaders).toBe(true);
    expect(await ready()).toBe(true);
    expect(mesh.subMeshes[0]!.effect!.defines).toContain(`#define NUM_BONE_INFLUENCERS ${mesh.numBoneInfluencers}`);
    rig.dispose();
  });

  it('gives up after MAX_RECOMPILES per variant (one log line), leaving the effect to Babylon', async () => {
    const { mesh, ready, rec, rig } = await setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const w = rec.newEffectWatch();
    for (let i = 0; i < rec.MAX_RECOMPILES; i++) {
      expect(await ready()).toBe(true);
      timeOut(mesh.subMeshes[0]!.effect!);
      expect(rec.watchBodyEffect(mesh, w, i)).toBe(true);
    }
    expect(await ready()).toBe(true);
    const last = mesh.subMeshes[0]!.effect!;
    timeOut(last);
    expect(rec.watchBodyEffect(mesh, w, 10)).toBe(false);
    expect(rec.watchBodyEffect(mesh, w, 11)).toBe(false);
    expect(last.isDisposed).toBe(false);
    expect(mesh.subMeshes[0]!.effect).toBe(last);
    expect(warn).toHaveBeenCalledTimes(rec.MAX_RECOMPILES + 1);
    expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('3 recompiles done, left to Babylon'));
    rig.dispose();
  });

  it('a program disposed under an unready effect recovers at once; a slow compile only after STUCK_MS and STUCK_FRAMES', async () => {
    const { mesh, ready, rec, rig } = await setup();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await ready()).toBe(true);
    const e1 = mesh.subMeshes[0]!.effect!;
    const x1 = e1 as unknown as { _isReady: boolean; _pipelineContext: { _isDisposed?: boolean; isReady: boolean } | null };
    x1._isReady = false;
    x1._pipelineContext = { _isDisposed: true, isReady: false };
    const w = rec.newEffectWatch();
    expect(rec.stuckReason(e1, w, 0)).toBe('program disposed');
    x1._pipelineContext = null;
    // merely unready (compiling): timed, recompiled only once both limits pass
    expect(rec.stuckReason(e1, w, 0)).toBeNull();
    for (let f = 1; f < rec.STUCK_FRAMES; f++) expect(rec.stuckReason(e1, w, rec.STUCK_MS + f)).toBeNull();
    expect(rec.stuckReason(e1, w, rec.STUCK_MS + rec.STUCK_FRAMES)).toBe('compile stuck');
    const w2 = rec.newEffectWatch();
    expect(rec.stuckReason(e1, w2, 0)).toBeNull();
    // frames but not the time
    for (let f = 1; f <= rec.STUCK_FRAMES * 2; f++) expect(rec.stuckReason(e1, w2, 100 + f)).toBeNull();
    expect(rec.watchBodyEffect(mesh, w2, rec.STUCK_MS + 1)).toBe(true);
    expect(await ready()).toBe(true);
    expect(mesh.subMeshes[0]!.effect).not.toBe(e1);
    rig.dispose();
  });
});
