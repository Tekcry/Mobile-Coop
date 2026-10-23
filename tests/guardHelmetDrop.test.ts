/**
 * (guard-models G7b, G7-CHECK polish 3) The dropped helmet_std's colour is per instance: the source mesh carries no
 * vertex colour, each drop takes the colour of the guard it fell from (a heavy's dark helmet and a faction helmet side
 * by side), and a reused drop is recoloured in place (no allocation).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Color4, InstancedMesh, Scene } from '../src/core/babylon';
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
    shieldUrls: () => null,
  };
});

const PIECES = ['average', 'helmet_std', 'vest_soft'];
const tris = (pieces: readonly string[]): GuardTri[] =>
  pieces.map((_, i) => ({ piece: i, tint: i % 3, joint: i === 0 ? 'wrL' : 'head', at: [0.02 * i, 1.6 + 0.01 * i, 0.1] }));
const AVG: GuardManifest = {
  id: 'guard-average', base: 'average', urls: ['', '/guard-average-lod0.glb', '/guard-average-lod1.glb', '/guard-average-lod2.glb'], pieces: PIECES, tintSlots: 3, refHeight: 1.77,
};
const FACTION = '#22262b';
const HEAVY = '#14161a';

beforeEach(async () => {
  H.assets.set('average', { manifest: AVG, standIn: false, problems: [] });
  const bin: Record<string, ArrayBuffer> = {};
  for (const l of ['lod0', 'lod1', 'lod2']) bin[`/guard-average-${l}.glb`] = guardGlb(tris(PIECES));
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
  const G = await import('../src/ai/guardHelmet');
  const { HelmetDrops, HELMET_DROP } = await import('../src/ai/helmetDrops');
  const scene: Scene = new B.Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  await vi.waitFor(() => expect(G.helmetDropSource(scene)).not.toBeNull());
  const src = G.helmetDropSource(scene)!;
  const drops = new HelmetDrops(parts, () => {});
  const list = (): { m: InstancedMesh }[] => (drops as unknown as { drops: { m: InstancedMesh }[] }).drops;
  return { B, scene, G, src, drops, list, HELMET_DROP };
}

const rgb = (c: Color4): number[] => [c.r, c.g, c.b, c.a];

describe('helmet drop colour per instance (polish 3)', () => {
  it('helmetDropColour: linear over the fabric neutral, clamped, alpha 1; upper and lower case hex alike', async () => {
    const { B, G, scene } = await setup();
    const { srgbToLinear } = await import('../src/operators/guards/guardTints');
    const c = G.helmetDropColour('#22262B', new B.Color4());
    expect(c.r).toBeCloseTo(Math.min(1, srgbToLinear(0x22 / 255) / 0.4), 9);
    expect(c.g).toBeCloseTo(Math.min(1, srgbToLinear(0x26 / 255) / 0.4), 9);
    expect(c.b).toBeCloseTo(Math.min(1, srgbToLinear(0x2b / 255) / 0.4), 9);
    expect(c.a).toBe(1);
    expect(rgb(G.helmetDropColour('#ffffff', new B.Color4()))).toEqual([1, 1, 1, 1]);
    expect(rgb(G.helmetDropColour('#22262b', new B.Color4()))).toEqual(rgb(c));
    scene.dispose();
  });

  it('the shared source has no vertex colour; a heavy\'s drop and a grunt\'s drop each keep their own colour', async () => {
    const { B, G, src, drops, list, scene } = await setup();
    // (per-vertex colour lives in the geometry; the instanced colour is the drops' own)
    expect(src.mesh.geometry!.isVerticesDataPresent('color')).toBe(false);
    drops.drop(0, 0, 0, 1.8, 0, 1, HEAVY, 0.25, 0.2, 0.26);
    drops.drop(2, 0, 0, 1.7, 0, 1, FACTION, 0.25, 0.2, 0.26);
    const [a, b] = list();
    expect(a!.m.sourceMesh).toBe(src.mesh);
    expect(b!.m.sourceMesh).toBe(src.mesh);
    expect(rgb(a!.m.instancedBuffers.color as Color4)).toEqual(rgb(G.helmetDropColour(HEAVY, new B.Color4())));
    expect(rgb(b!.m.instancedBuffers.color as Color4)).toEqual(rgb(G.helmetDropColour(FACTION, new B.Color4())));
    expect(a!.m.instancedBuffers.color).not.toBe(b!.m.instancedBuffers.color);
    // the source's own colour is untouched (white): nothing bleeds through it
    expect(rgb(src.mesh.instancedBuffers.color as Color4)).toEqual([1, 1, 1, 1]);
    // the drops draw their colour through the instanced 'color' attribute (as the part library's instances): the
    // colour define is on, its buffer is the per-instance one, the geometry has none
    const sm = src.mesh.subMeshes[0]!;
    await vi.waitFor(() => expect(src.mesh.material!.isReadyForSubMesh(src.mesh, sm, true)).toBe(true));
    expect((sm.effect as unknown as { defines: string }).defines).toContain('#define VERTEXCOLOR');
    expect((src.mesh as unknown as { _userInstancedBuffersStorage: { strides: Record<string, number> } })._userInstancedBuffersStorage.strides.color).toBe(4);
    scene.dispose();
  });

  it('a reused drop (the pool full) is recoloured in place: same instance, same Color4, the new guard\'s colour', async () => {
    const { B, G, drops, list, HELMET_DROP, scene } = await setup();
    for (let i = 0; i < HELMET_DROP.pool; i++) drops.drop(i, 0, 0, 1.7, 0, 1, FACTION, 0.25, 0.2, 0.26);
    const first = list()[0]!.m;
    const col = first.instancedBuffers.color as Color4;
    drops.drop(9, 0, 0, 1.8, 0, 1, HEAVY, 0.25, 0.2, 0.26);
    expect(list().length).toBe(HELMET_DROP.pool);
    expect(list()[0]!.m).toBe(first);
    expect(first.instancedBuffers.color).toBe(col);
    expect(rgb(col)).toEqual(rgb(G.helmetDropColour(HEAVY, new B.Color4())));
    expect(rgb(list()[1]!.m.instancedBuffers.color as Color4)).toEqual(rgb(G.helmetDropColour(FACTION, new B.Color4())));
    scene.dispose();
  });
});
