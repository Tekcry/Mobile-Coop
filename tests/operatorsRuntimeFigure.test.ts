/**
 * Step 11d: the Babylon side of the operator runtime on a NullEngine (no GPU): a small skinned GLB with the game joints
 * and a goggle lens, two bodies on real CharacterRigs (co-op: both players are Wren), LOD choice, posing through the
 * linked bones, goggle states, head hide, dispose. Visual checks wait for step 11e on the GPU.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PBRMaterial } from '../src/core/babylon';
import { operatorNodes } from './helpers/operatorFixture';

/** The fixture skeleton as a Blender-style GLB (glTF frame: x mirrored), one body primitive and one lens primitive. */
function operatorGlb(): ArrayBuffer {
  const { nodes, joints } = operatorNodes();
  const children = nodes.map(() => [] as number[]);
  nodes.forEach((n, i) => { if (n.parent >= 0) children[n.parent]!.push(i); });
  const meshNode = nodes.length;
  // body: one triangle on the chest (joint slot of 'chest'), one on the head; lens: one in use (1), one stowed (2)
  const slotOf = (name: string): number => joints.indexOf(nodes.findIndex((n) => n.name === name));
  const chest = slotOf('chest'), head = slotOf('head');
  const tri = (x: number, y: number, z: number): number[] => [x, y, z, x + 0.05, y, z, x, y + 0.05, z];
  const bodyPos = new Float32Array([...tri(0, 1.2, 0.1), ...tri(0, 1.6, 0.1)]);
  const lensPos = new Float32Array([...tri(0, 1.55, 0.12), ...tri(0, 1.65, 0.1)]);
  const nrm = (n: number): Float32Array => new Float32Array(Array.from({ length: n }, (_, i) => (i % 3 === 2 ? 1 : 0)));
  const uv = (n: number): Float32Array => new Float32Array(n * 2);
  const jn = (list: number[]): Uint8Array => new Uint8Array(list.flatMap((j) => [j, 0, 0, 0]));
  const wt = (n: number): Float32Array => new Float32Array(Array.from({ length: n * 4 }, (_, i) => (i % 4 === 0 ? 1 : 0)));
  const idx = new Uint16Array([0, 1, 2, 3, 4, 5]);
  const goggle = new Float32Array([1, 1, 1, 2, 2, 2]);
  const parts: ArrayBufferView[] = [
    bodyPos, nrm(6), uv(6), jn([chest, chest, chest, head, head, head]), wt(6), idx,
    lensPos, nrm(6), uv(6), jn([head, head, head, head, head, head]), wt(6), idx, goggle,
  ];
  const bytes = parts.map((a) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
  const pad = (n: number): number => (n + 3) & ~3;
  let off = 0;
  const views = bytes.map((p) => {
    const v = { buffer: 0, byteOffset: off, byteLength: p.length };
    off += pad(p.length);
    return v;
  });
  const bin = new Uint8Array(off);
  bytes.forEach((p, i) => bin.set(p, views[i]!.byteOffset));
  const acc = (bv: number, componentType: number, count: number, type: string) => ({ bufferView: bv, componentType, count, type });
  const prim = (b: number, material: number, extra: Record<string, number> = {}) => ({
    attributes: { POSITION: b, NORMAL: b + 1, TEXCOORD_0: b + 2, JOINTS_0: b + 3, WEIGHTS_0: b + 4, ...extra }, indices: b + 5, material,
  });
  const json = {
    asset: { version: '2.0' },
    nodes: [
      ...nodes.map((n, i) => ({
        name: n.name, children: children[i]!.length ? children[i] : undefined,
        translation: [-n.t[0], n.t[1], n.t[2]], rotation: [n.r[0], -n.r[1], -n.r[2], n.r[3]],
      })),
      { name: 'wren-test', mesh: 0, skin: 0 },
    ],
    skins: [{ joints }],
    materials: [
      { name: 'wren-test-cloth', pbrMetallicRoughness: { baseColorFactor: [0.03, 0.03, 0.03, 1], roughnessFactor: 0.9, metallicFactor: 0 } },
      { name: 'wren-test-glow', emissiveFactor: [0.3, 0.85, 0.16], pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 0.08 } },
    ],
    meshes: [{ name: 'wren-test', primitives: [prim(0, 0), prim(6, 1, { _GOGGLE: 12 })] }],
    accessors: [
      ...[0, 6].flatMap((b) => [acc(b, 5126, 6, 'VEC3'), acc(b + 1, 5126, 6, 'VEC3'), acc(b + 2, 5126, 6, 'VEC2'), acc(b + 3, 5121, 6, 'VEC4'), acc(b + 4, 5126, 6, 'VEC4'), acc(b + 5, 5123, 6, 'SCALAR')]),
      acc(12, 5126, 6, 'SCALAR'),
    ],
    bufferViews: views,
    buffers: [{ byteLength: bin.length }],
  };
  void meshNode;
  let js = new TextEncoder().encode(JSON.stringify(json));
  const jl = pad(js.length);
  const padded = new Uint8Array(jl).fill(0x20);
  padded.set(js);
  js = padded;
  const out = new Uint8Array(12 + 8 + jl + 8 + bin.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true);
  dv.setUint32(4, 2, true);
  dv.setUint32(8, out.length, true);
  dv.setUint32(12, jl, true);
  dv.setUint32(16, 0x4e4f534a, true);
  out.set(js, 20);
  dv.setUint32(20 + jl, bin.length, true);
  dv.setUint32(24 + jl, 0x004e4942, true);
  out.set(bin, 28 + jl);
  return out.buffer;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('operator runtime: figure on a NullEngine', () => {
  it('loads shared LOD assets, poses two Wren bodies from their rigs, swaps LOD, goggle and head, disposes', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, FreeCamera, Vector3 } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const { OperatorFigure, OperatorLibrary, forgetModels } = await import('../src/operators/runtime/figure');
    const { CLOSE_CAMERAS } = await import('../src/operators/runtime/lodPick');
    const { manifestFromUrls, LOD_0, LOD_1, LOD_2, LOD_HERO } = await import('../src/operators/runtime/manifest');

    const glb = operatorGlb();
    const fetched: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      fetched.push(url);
      return new Response(glb.slice(0));
    });
    forgetModels();
    const scene = new Scene(new NullEngine());
    const parts = new PartLibrary(scene);
    const manifest = manifestFromUrls('wren', {
      'a/wren-hero.glb': '/assets/wren-hero.glb', 'a/wren-lod0.glb': '/assets/wren-lod0.glb',
      'a/wren-lod1.glb': '/assets/wren-lod1.glb', 'a/wren-lod2.glb': '/assets/wren-lod2.glb',
    });
    const lib = new OperatorLibrary(scene);
    const rigA = new CharacterRig(scene, (s, h, n) => parts.instance(s, h, n), defaultLook(), 1.75, 'player');
    const rigB = new CharacterRig(scene, (s, h, n) => parts.instance(s, h, n), defaultLook(), 1.75, 'remote-1');
    const a = new OperatorFigure(lib, rigA, manifest, 'wrenA');
    const b = new OperatorFigure(lib, rigB, manifest, 'wrenB');
    const built: number[] = [];
    a.onMeshes = (m) => built.push(m.length);
    await Promise.all([a.loadGameLods(), b.loadGameLods()]);
    // each file fetched once for both bodies
    expect(fetched.sort()).toEqual(['/assets/wren-lod0.glb', '/assets/wren-lod1.glb', '/assets/wren-lod2.glb']);
    expect(a.loaded).toBe(0b1110);
    expect(built).toEqual([2, 2, 2]);
    // shared geometry and materials, own glow material and skeleton
    const ma = a.renderMeshes, mb = b.renderMeshes;
    expect(ma[0]!.geometry).toBe(mb[0]!.geometry);
    expect(ma[0]!.material).toBe(mb[0]!.material);
    expect(ma[1]!.material).not.toBe(mb[1]!.material);
    expect(ma[0]!.skeleton).not.toBe(mb[0]!.skeleton);
    expect(ma[0]!.numBoneInfluencers).toBe(4);

    // LOD by camera distance; hero only for a registered close-up camera
    const cam = new FreeCamera('cam', new Vector3(0, 1.6, -3), scene);
    rigA.root.position.set(0, 0, 0);
    a.update(cam);
    expect(a.current).toBe(LOD_0);
    expect(ma.filter((m) => m.isEnabled()).length).toBe(2);
    cam.position.set(0, 1.6, -15);
    cam.computeWorldMatrix();
    a.update(cam);
    expect(a.current).toBe(LOD_1);
    cam.position.set(0, 1.6, -40);
    cam.computeWorldMatrix();
    a.update(cam);
    expect(a.current).toBe(LOD_2);
    expect(a.renderMeshes.filter((m) => m.isEnabled()).length).toBe(2);
    CLOSE_CAMERAS.add(cam.uniqueId);
    a.update(cam);
    expect(a.current).toBe(LOD_0); // hero not loaded yet
    await a.load(LOD_HERO);
    a.update(cam);
    expect(a.current).toBe(LOD_HERO);
    CLOSE_CAMERAS.remove(cam.uniqueId);

    // posing: the operator's head joint follows the rig's head turn (rig stays the authority)
    cam.position.set(0, 1.6, -3);
    cam.computeWorldMatrix();
    a.update(cam);
    rigA.headNode.rotationQuaternion!.set(0, Math.sin(0.4), 0, Math.cos(0.4));
    a.update(cam);
    const head = scene.getTransformNodeByName('wrenA-lod0-head')!;
    expect(head).toBeTruthy();
    head.computeWorldMatrix(true);
    const neck = scene.getTransformNodeByName('wrenA-lod0-neck')!;
    const rel = neck.absoluteRotationQuaternion.conjugate().multiply(head.absoluteRotationQuaternion);
    expect(Math.abs(rel.y)).toBeCloseTo(Math.sin(0.4), 5);
    // the bone is linked to that node
    const skel = ma[0]!.skeleton!;
    expect(skel.bones.find((bn) => bn.name === 'head')!.getTransformNode()).toBe(head);

    // goggle: stowed draws [stowed][body], in use draws [body][in use]; the lens glow dims and brightens
    const lens = a.renderMeshes.filter((m) => m.name.startsWith('wrenA-lod0'))[1]!;
    expect([lens.subMeshes[0]!.indexStart, lens.subMeshes[0]!.indexCount]).toEqual([0, 3]);
    a.setVision('night', 1 / 60);
    expect([lens.subMeshes[0]!.indexStart, lens.subMeshes[0]!.indexCount]).toEqual([3, 3]);
    for (let i = 0; i < 20; i++) a.setVision('night', 1 / 60);
    a.update(cam);
    const glow = lens.material as PBRMaterial;
    expect(glow.emissiveColor.g).toBeCloseTo(0.85, 5);
    a.resetGoggle();
    a.update(cam);
    expect(glow.emissiveColor.g).toBeCloseTo(0.85 * 0.3, 5);
    expect(lens.subMeshes[0]!.indexStart).toBe(0);

    // head hide for the camera fade: the head joint collapses; b is untouched
    a.setHeadVisible(false);
    expect(head.scaling.x).toBe(0);
    a.setHeadVisible(true);
    expect(head.scaling.x).toBe(1);

    // dispose frees this body only; the library keeps the shared sources until the scene goes
    const before = scene.meshes.length;
    a.dispose();
    expect(scene.meshes.length).toBe(before - ma.length - 2); // its 2 hero meshes too
    expect(mb[0]!.isDisposed()).toBe(false);
    expect(mb[0]!.geometry).toBeTruthy();
    b.dispose();
    rigA.dispose();
    rigB.dispose();
    scene.dispose();
    forgetModels();
  });

  it('11e: player rigs at Wren size with hidden part bodies, thermal overlay, close-up cameras switch to the hero', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, FreeCamera, Vector3 } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { defaultLook } = await import('../src/player/avatarLook');
    const { OperatorFigure, LIVE_FIGURES, setCloseCamera, forgetModels } = await import('../src/operators/runtime/figure');
    const { CLOSE_CAMERAS } = await import('../src/operators/runtime/lodPick');
    const { manifestFromUrls, LOD_0, LOD_HERO } = await import('../src/operators/runtime/manifest');
    const { operatorRig, operatorLibrary, PLAYER_HEIGHT } = await import('../src/operators/runtime/playerFigure');
    const glb = operatorGlb();
    const fetched: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      fetched.push(url);
      return new Response(glb.slice(0));
    });
    forgetModels();
    const scene = new Scene(new NullEngine());
    const parts = new PartLibrary(scene);
    const { rig, figure: built } = operatorRig(scene, (s, h, n) => parts.instance(s, h, n), defaultLook(), 'player');
    // the rig is Wren's size (G74, the G72 proportions) and draws nothing of its own
    expect(PLAYER_HEIGHT).toBe(1.68);
    expect(rig.height).toBe(1.68);
    expect(rig.p.y.shoulder).toBeCloseTo(1.4 * (1.68 / 1.75), 9);
    expect(rig.voxel).toBeNull();
    const own = rig.root.getChildMeshes(false).filter((m) => !m.name.startsWith('player-'));
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((m) => !m.isEnabled(false))).toBe(true);
    expect(LIVE_FIGURES.has(built)).toBe(true);
    built.dispose();
    expect(LIVE_FIGURES.has(built)).toBe(false);

    // a body with the fixture manifest: thermal warmth as a per-mesh overlay, then a close-up camera
    const manifest = manifestFromUrls('wren', { 'a/wren-hero.glb': '/h.glb', 'a/wren-lod0.glb': '/0.glb', 'a/wren-lod1.glb': '/1.glb', 'a/wren-lod2.glb': '/2.glb' });
    const fig = new OperatorFigure(operatorLibrary(scene), rig, manifest, 'wren');
    await fig.loadGameLods();
    const cam = new FreeCamera('play', new Vector3(0, 1.6, -3), scene);
    scene.activeCamera = cam;
    fig.update(cam);
    expect(fig.current).toBe(LOD_0);
    fig.setHeat(0.85);
    const ms = fig.renderMeshes;
    expect(ms.every((m) => m.renderOverlay && m.overlayAlpha === 0.85)).toBe(true);
    fig.setHeat(0);
    expect(ms.some((m) => m.renderOverlay)).toBe(false);
    expect(fetched).not.toContain('/h.glb');
    // photo mode registers its camera: the hero loads and shows without a frame update (a frozen game)
    setCloseCamera(cam, true);
    expect(CLOSE_CAMERAS.has(cam.uniqueId)).toBe(true);
    await vi.waitFor(() => expect(fig.current).toBe(LOD_HERO));
    expect(fetched).toContain('/h.glb');
    setCloseCamera(cam, false);
    expect(fig.current).toBe(LOD_0);
    fig.dispose();
    rig.dispose();
    scene.dispose();
    forgetModels();
  });

  it('refuses an asset URL that leaves the origin', async () => {
    const { loadModel } = await import('../src/operators/runtime/figure');
    vi.stubGlobal('location', { origin: 'https://x.github.io' });
    await expect(loadModel('https://cdn.example/wren-lod0.glb')).rejects.toThrow('leaves the origin');
  });
});
