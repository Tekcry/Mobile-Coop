/**
 * (guard-models G8 cull) The guard figures cast lamp and torch shadows like the merged S1 body they replace, on a
 * NullEngine with the real `LightRig`: the figure's culling box is the merged body's own (scaled into the figure root),
 * so at the same positions a figure joins exactly the shadow-map caster lists the old body joined; each figure is ONE
 * mesh in a list (the shown LOD: the other LODs and the disabled merged body are left out); a LOD switch between two
 * light picks refills the lists at once (the new LOD casts, the old one leaves). Render side only.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AbstractMesh, Scene } from '../src/core/babylon';
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

const AVG_PIECES = [
  'average', 'average-1', 'average-2', 'average-3', 'average-4', 'buzz', 'crop', 'sidepart', 'receding', 'fade',
  'cap', 'cap_officer', 'beanie', 'headset', 'glasses_clear', 'glasses_dark', 'helmet_std', 'vest_soft',
  'radio', 'pouch_belt', 'holster_thigh', 'flashlight_mount', 'uniform', 'uniform_jacket',
];
const BROAD_PIECES = ['broad', 'broad-1', 'balaclava', 'helmet_heavy', 'plate_heavy', 'pouch_belt', 'uniform'];
/** One triangle per piece; the body piece spread out to an A-pose-wide bind box (hands at +-0.6 m, as the bake). */
const tris = (pieces: readonly string[]): GuardTri[] => [
  ...pieces.map((_p, i): GuardTri => ({ piece: i, tint: i % 6, joint: i === 0 ? 'wrL' : 'head', at: [0.01 * i, 1.2 + 0.01 * i, 0.1] })),
  { piece: 0, tint: 0, joint: 'wrL', at: [0.6, 1.0, 0] },
  { piece: 0, tint: 0, joint: 'wrR', at: [-0.6, 1.0, 0] },
  { piece: 0, tint: 0, joint: 'pelvis', at: [0, 0, 0.34] },
];
const manifest = (id: string, base: 'average' | 'broad', pieces: string[]): GuardManifest => ({
  id, base, urls: ['', `/${id}-lod0.glb`, `/${id}-lod1.glb`, `/${id}-lod2.glb`], pieces, tintSlots: 6, refHeight: base === 'broad' ? 1.825 : 1.77,
});

beforeEach(async () => {
  H.assets.set('average', { manifest: manifest('guard-average', 'average', AVG_PIECES), standIn: false, problems: [] });
  H.assets.set('broad', { manifest: manifest('guard-broad', 'broad', BROAD_PIECES), standIn: false, problems: [] });
  const bin: Record<string, ArrayBuffer> = {};
  for (const l of ['lod0', 'lod1', 'lod2']) {
    bin[`/guard-average-${l}.glb`] = guardGlb(tris(AVG_PIECES));
    bin[`/guard-broad-${l}.glb`] = guardGlb(tris(BROAD_PIECES));
  }
  vi.stubGlobal('fetch', async (url: string) => (bin[url] ? new Response(bin[url]!.slice(0)) : new Response(null, { status: 404 })));
  const { forgetModels } = await import('../src/operators/runtime/figure');
  forgetModels();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  const { flags } = await import('../src/core/flags');
  flags.guardModels = false;
});

/** Guards spread round the torch spots: rings 1.5 m apart, 1.6 m apart on a ring (guard-cap's spacing), yaws mixed. */
const SPOTS: [number, number, number][] = [];
for (let r = 1.5; r <= 9; r += 1.5) {
  const n = Math.max(4, Math.round((2 * Math.PI * r) / 1.6));
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 2 * Math.PI + r;
    SPOTS.push([Math.sin(a) * r, Math.cos(a) * r, a * 1.7]);
  }
}

async function setup(kind: 'grunt' | 'heavy') {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { LightRegistry } = await import('../src/world/lights');
  const { LightRig } = await import('../src/world/lightRig');
  const { buildEnemyRig } = await import('../src/ai/enemyRig');
  const GB = await import('../src/ai/guardBody');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const { flags } = await import('../src/core/flags');
  const scene: Scene = new B.Scene(new NullEngine());
  const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, -3), scene);
  scene.activeCamera = cam;
  const reg = new LightRegistry();
  // one torch (moved per probe) holding the one shadow map
  const torch = reg.add({ kind: 'flashlight', x: 0, y: 1.45, z: 0, radius: 13, intensity: 0.85, cone: null, on: true, destructible: false, electric: false });
  const rig = new LightRig(scene, reg);
  rig.configure({ lights: 1, shadow: { sun: false, cascades: 0, sunSize: 0, casters: 1, size: 64, soft: false, charLamps: 0, charTile: 0 }, volumetric: false, minimal: true });
  const parts = new PartLibrary(scene);
  const world = { parts, map: { id: 'sectorops', theme: { faction: 'urban' } }, addShadowCaster: (m: AbstractMesh) => rig.addCaster(m) };
  const def = ENEMIES[kind];
  const place = (r: { root: { position: { set(x: number, y: number, z: number): void }; rotation: { y: number } } }, s: [number, number, number]): void => {
    r.root.position.set(s[0], 0, s[1]);
    r.root.rotation.y = s[2];
  };
  flags.guardModels = false;
  const off = SPOTS.map((s, i) => {
    const b = buildEnemyRig(scene, world as never, def, `off${i}`);
    place(b.rig, s);
    return b;
  });
  flags.guardModels = true;
  const on = SPOTS.map((s, i) => {
    const b = buildEnemyRig(scene, world as never, def, `on${i}`);
    place(b.rig, s);
    return b;
  });
  await vi.waitFor(() => expect(on.every((b) => b.figure!.shown && b.figure!.figure.loaded === 0b1110)).toBe(true));
  const frame = (): void => {
    scene.onBeforeRenderObservable.notifyObservers(scene);
    for (const m of scene.meshes) m.computeWorldMatrix(true);
  };
  frame();
  const list = (): readonly AbstractMesh[] => scene.getLightByName('maplight-shadow-0')!.getShadowGenerator()!.getShadowMap()!.renderList ?? [];
  /** A torch at (x, z) whose beam stops `reach` m out: the light picked again, its caster list filled. */
  const probe = (x: number, z: number, reach: number): readonly AbstractMesh[] => {
    torch.x = x;
    torch.z = z;
    torch.reach = reach;
    reg.version++;
    rig.update(1, x, 1.6, z - 3);
    return list();
  };
  return { B, scene, cam, rig, reg, torch, off, on, frame, list, probe, GB };
}

describe('guard figures in the lamp / torch caster lists (G8 cull)', () => {
  for (const kind of ['grunt', 'heavy'] as const) {
    it(`${kind}: the figure's culling box is the merged body's, in the figure root's space`, async () => {
      const { off, on, GB } = await setup(kind);
      const want = GB.mergedBox(off[0]!.rig)!;
      expect(want).toBeDefined();
      for (const b of on.slice(0, 3)) {
        const f = b.figure!.figure;
        const s = f.root.scaling.x;
        for (const lod of [1, 2, 3]) {
          for (const m of f.lodMeshes(lod)) {
            const bb = m.getBoundingInfo().boundingBox;
            const got = [bb.minimum.x, bb.minimum.y, bb.minimum.z, bb.maximum.x, bb.maximum.y, bb.maximum.z].map((v) => v * s);
            for (let i = 0; i < 6; i++) expect(got[i]).toBeCloseTo(want[i]!, 5);
          }
        }
      }
    });
  }

  it('at the same positions a figure joins exactly the torch lists the merged body joined, as one mesh', async () => {
    const { off, on, probe } = await setup('grunt');
    let joined = 0;
    let probes = 0;
    for (const [x, z] of [[0, 0], [3, 2], [-4, 5], [6, -1], [-2, -6]] as const) {
      for (const reach of [1.5, 3, 5]) {
        const l = probe(x, z, reach);
        probes++;
        const offIn = off.map((b) => b.rig.renderMeshes.some((m) => l.includes(m)));
        const onIn = on.map((b) => b.figure!.figure.renderMeshes.some((m) => l.includes(m)));
        expect(onIn).toEqual(offIn);
        joined += onIn.filter(Boolean).length;
        for (const b of on) {
          const f = b.figure!.figure;
          const mine = [...f.renderMeshes, ...b.rig.renderMeshes].filter((m) => l.includes(m));
          // one mesh per guard per list: the shown LOD only (never another LOD, never the merged body it replaced)
          if (mine.length) expect(mine).toEqual([f.lodMeshes(f.current)[0]]);
        }
        // nothing disabled in a list
        expect(l.every((m) => m.isEnabled())).toBe(true);
      }
    }
    // the probes reach some guards and miss others (the boundary is exercised)
    expect(joined).toBeGreaterThan(0);
    expect(joined).toBeLessThan(probes * on.length);
  });

  it('a LOD switch between picks refills the list at once: the new LOD casts, the old one leaves', async () => {
    const { on, cam, frame, probe, list, rig, B } = await setup('grunt');
    const near = on[0]!.figure!.figure;
    probe(SPOTS[0]![0], SPOTS[0]![1], 5);
    const was = near.current;
    expect(list()).toContain(near.lodMeshes(was)[0]);
    // the camera far away: every figure drops to the far LOD
    cam.position = new B.Vector3(0, 1.6, -60);
    cam.computeWorldMatrix();
    frame();
    expect(near.current).not.toBe(was);
    rig.update(1 / 60, 0, 1.6, -60); // inside the pick interval: no new pick, only the refill
    expect(list()).toContain(near.lodMeshes(near.current)[0]);
    expect(list()).not.toContain(near.lodMeshes(was)[0]);
  });
});
