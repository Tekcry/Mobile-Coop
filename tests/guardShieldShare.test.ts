/**
 * (guard-models G7b, G7-CHECK polish 5) The enforcers' figure shields share one set of materials and the static
 * buffers per scene, and per (base, figure LOD) one bone-index buffer; a LOD switch allocates nothing once each LOD has
 * been shown (no bone indices rebuilt, no new mesh or buffer); one enforcer going leaves the shared side to the others.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mesh, Scene } from '../src/core/babylon';
import type { GuardManifest } from '../src/operators/guards/gearMask';
import type { GuardAsset } from '../src/operators/guards/guardAssets';
import type * as GuardAssets from '../src/operators/guards/guardAssets';
import { guardGlb, type GuardTri } from './helpers/guardGlb';

const H = vi.hoisted(() => ({ assets: new Map<string, unknown>() }));

vi.mock('../src/operators/guards/guardAssets', async (orig) => {
  const actual = await orig<typeof GuardAssets>();
  return {
    ...actual,
    guardAsset: (base: string) => (H.assets.get(base) as GuardAsset | undefined) ?? actual.guardAsset(base as never),
    shieldUrls: () => ['', '/shield-lod0.glb', '/shield-lod1.glb', '/shield-lod2.glb'] as [string, string, string, string],
  };
});

const BROAD_PIECES = ['broad', 'broad-1', 'balaclava', 'helmet_heavy', 'plate_heavy', 'pouch_belt', 'uniform'];
const tris = (pieces: readonly string[]): GuardTri[] =>
  pieces.map((p, i) => ({ piece: i, tint: i % 3, joint: i === 0 ? 'wrL' : p === 'plate_heavy' ? 'chest' : 'head', at: [0.01 * i, 1.2 + 0.01 * i, 0.1] }));
const BROAD: GuardManifest = {
  id: 'guard-broad', base: 'broad', urls: ['', '/guard-broad-lod0.glb', '/guard-broad-lod1.glb', '/guard-broad-lod2.glb'], pieces: BROAD_PIECES, tintSlots: 3, refHeight: 1.825,
};
const SHIELD_TRIS: GuardTri[] = [
  { piece: 0, tint: 0, joint: 'elL', at: [-0.3, 1.1, 0.3] },
  { piece: 0, tint: 0, joint: 'wrL', at: [-0.35, 0.95, 0.3] },
];

beforeEach(async () => {
  H.assets.set('broad', { manifest: BROAD, standIn: false, problems: [] });
  const bin: Record<string, ArrayBuffer> = {};
  for (const l of ['lod0', 'lod1', 'lod2']) {
    bin[`/guard-broad-${l}.glb`] = guardGlb(tris(BROAD_PIECES));
    bin[`/shield-${l}.glb`] = guardGlb(SHIELD_TRIS);
  }
  vi.stubGlobal('fetch', async (url: string) => (bin[url] ? new Response(bin[url]!.slice(0)) : new Response(null, { status: 404 })));
  const { forgetModels } = await import('../src/operators/runtime/figure');
  forgetModels();
  const { flags } = await import('../src/core/flags');
  flags.guardModels = true;
});

afterEach(async () => {
  vi.unstubAllGlobals();
  const { flags } = await import('../src/core/flags');
  flags.guardModels = false;
});

async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { buildEnemyRig } = await import('../src/ai/enemyRig');
  const S = await import('../src/ai/guardShield');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const scene: Scene = new B.Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  const world = { parts, map: { id: 'testmap', theme: { faction: 'urban' } }, addShadowCaster: () => {} };
  const render = (): void => void scene.onBeforeRenderObservable.notifyObservers(scene);
  const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, 3), scene);
  scene.activeCamera = cam;
  /** Puts the camera `d` m from the guards (at the origin): the figure's LOD follows on the next render. */
  const at = (d: number): void => {
    cam.position.set(0, 1.6, d);
    cam.getViewMatrix(true);
  };
  const enforcer = async (name: string) => {
    const gb = buildEnemyRig(scene, world as never, ENEMIES.enforcer, name).figure!;
    const sh = S.guardShieldFor(scene, gb, () => {})!;
    gb.shield = sh;
    await vi.waitFor(() => expect(gb.figure.loaded).toBe(0b1110));
    await vi.waitFor(() => {
      render();
      expect(sh.ready).toBe(true);
    });
    return { gb, sh };
  };
  return { B, scene, render, at, enforcer, S };
}

const bonesBuf = (m: Mesh): unknown => m.getVertexBuffer('matricesIndices')!.getBuffer();

describe("the enforcers' shared shield (polish 5)", () => {
  it('two enforcers: one material set, the same static and bone-index buffers per LOD; one shared side per scene', async () => {
    const { scene, at, render, enforcer, S } = await setup();
    at(3);
    const a = await enforcer('e1');
    const b = await enforcer('e2');
    render();
    const ma = a.sh.renderMeshes[0]!;
    const mb = b.sh.renderMeshes[0]!;
    expect(ma).not.toBe(mb);
    expect(ma.material).toBe(mb.material);
    expect(ma.getVertexBuffer('position')!.getBuffer()).toBe(mb.getVertexBuffer('position')!.getBuffer());
    expect(bonesBuf(ma)).toBe(bonesBuf(mb));
    expect(S.sharedShieldCount(scene)).toBe(1);
    // each on his own skeleton (the LOD's joint order, by name)
    expect(ma.skeleton).toBe(a.gb.figure.lodSkeleton(a.gb.figure.current));
    expect(mb.skeleton).toBe(b.gb.figure.lodSkeleton(b.gb.figure.current));
    const idx = ma.getVerticesData('matricesIndices')!;
    expect(idx[0]).toBe(ma.skeleton!.getBoneIndexByName('elL'));
    expect(idx[12]).toBe(ma.skeleton!.getBoneIndexByName('wrL'));
    // one goes: the other keeps the shared material and buffers
    const mat = ma.material!;
    a.gb.dispose();
    expect(ma.isDisposed()).toBe(true);
    expect(scene.materials).toContain(mat);
    expect(mb.isDisposed()).toBe(false);
    expect(mb.material).toBe(mat);
    scene.dispose();
    expect(S.sharedShieldCount(scene)).toBe(0);
  });

  it('LOD switches: each LOD made once, then no new mesh, no setVerticesData, no new buffer; the shield follows the shown LOD', async () => {
    const { B, scene, at, render, enforcer } = await setup();
    at(3);
    const { gb, sh } = await enforcer('e1');
    const seen = new Map<number, Mesh>();
    for (const d of [3, 15, 60]) {
      at(d);
      render();
      seen.set(gb.figure.current, sh.renderMeshes[0]!);
    }
    expect([...seen.keys()].sort()).toEqual([1, 2, 3]);
    const meshes = scene.meshes.length;
    const setData = vi.spyOn(B.Mesh.prototype, 'setVerticesData');
    const setBuf = vi.spyOn(B.Mesh.prototype, 'setVerticesBuffer');
    for (let k = 0; k < 4; k++) {
      for (const d of [3, 15, 60, 15]) {
        at(d);
        render();
        const lod = gb.figure.current;
        const m = sh.renderMeshes[0]!;
        expect(m).toBe(seen.get(lod));
        expect(m.isEnabled(false)).toBe(true);
        expect(m.skeleton).toBe(gb.figure.lodSkeleton(lod));
        expect(m.parent).toBe(gb.figure.lodMeshes(lod)[0]!.parent);
        for (const [l, o] of seen) if (l !== lod) expect(o.isEnabled(false)).toBe(false);
      }
    }
    expect(scene.meshes.length).toBe(meshes);
    expect(setData).not.toHaveBeenCalled();
    expect(setBuf).not.toHaveBeenCalled();
    setData.mockRestore();
    setBuf.mockRestore();
    gb.dispose();
    for (const m of seen.values()) expect(m.isDisposed()).toBe(true);
    scene.dispose();
  });
});
