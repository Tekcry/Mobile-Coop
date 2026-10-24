/**
 * (guard-models G5) The guard figure on a NullEngine: a small skinned GLB with the game joints and three pieces (body,
 * helmet, vest) on two guards' CharacterRigs; shared static buffers per (base, LOD), per-guard gvis and index buffers,
 * gear and tint changes, the S1 culling box and the ragdoll fallback, the world-matrix path, flash / heat, dispose; then
 * the stand-in on Wren's real LOD2 file posed exactly as Wren's own figure poses it.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Bone, Matrix, Mesh, Scene, Skeleton, TransformNode } from '../src/core/babylon';
import type { GuardGlbMesh } from '../src/operators/runtime/guardFigure';
import type { GuardManifest } from '../src/operators/guards/gearMask';
import { operatorNodes } from './helpers/operatorFixture';

/** The fixture skeleton as a GLB (glTF frame: x mirrored): one primitive, three triangles (body, helmet, vest). */
function guardGlb(): ArrayBuffer {
  const { nodes, joints } = operatorNodes();
  const children = nodes.map(() => [] as number[]);
  nodes.forEach((n, i) => { if (n.parent >= 0) children[n.parent]!.push(i); });
  const slotOf = (name: string): number => joints.indexOf(nodes.findIndex((n) => n.name === name));
  const chest = slotOf('chest'), head = slotOf('head'), wrist = slotOf('wrL');
  const tri = (x: number, y: number, z: number): number[] => [x, y, z, x + 0.05, y, z, x, y + 0.05, z];
  // body on the left wrist (so the world path has a moving joint), helmet on the head, vest on the chest
  const pos = new Float32Array([...tri(-0.5, 1.0, 0), ...tri(0, 1.7, 0.1), ...tri(0, 1.3, 0.12)]);
  const nrm = new Float32Array(Array.from({ length: 27 }, (_, i) => (i % 3 === 2 ? 1 : 0)));
  const uv = new Float32Array(18);
  const jn = new Uint8Array([wrist, wrist, wrist, head, head, head, chest, chest, chest].flatMap((j) => [j, 0, 0, 0]));
  const wt = new Float32Array(Array.from({ length: 36 }, (_, i) => (i % 4 === 0 ? 1 : 0)));
  const idx = new Uint16Array([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const parts: ArrayBufferView[] = [pos, nrm, uv, jn, wt, idx];
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
  const json = {
    asset: { version: '2.0' },
    nodes: [
      ...nodes.map((n, i) => ({
        name: n.name, children: children[i]!.length ? children[i] : undefined,
        translation: [-n.t[0], n.t[1], n.t[2]], rotation: [n.r[0], -n.r[1], -n.r[2], n.r[3]],
      })),
      { name: 'guard-test', mesh: 0, skin: 0 },
    ],
    skins: [{ joints }],
    materials: [{ name: 'guard-test-atlas', pbrMetallicRoughness: { baseColorFactor: [0.5, 0.5, 0.5, 1], roughnessFactor: 0.8, metallicFactor: 0 } }],
    meshes: [{ name: 'guard-test', primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, JOINTS_0: 3, WEIGHTS_0: 4 }, indices: 5, material: 0 }] }],
    accessors: [acc(0, 5126, 9, 'VEC3'), acc(1, 5126, 9, 'VEC3'), acc(2, 5126, 9, 'VEC2'), acc(3, 5121, 9, 'VEC4'), acc(4, 5126, 9, 'VEC4'), acc(5, 5123, 9, 'SCALAR')],
    bufferViews: views,
    buffers: [{ byteLength: bin.length }],
  };
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

const MANIFEST: GuardManifest = {
  id: 'guard-average', base: 'average', urls: ['', '/g-lod0.glb', '/g-lod1.glb', '/g-lod2.glb'],
  pieces: ['average', 'helmet_std', 'vest_soft'], tintSlots: 2, refHeight: 1.77,
};
/** Per vertex: body (0) 0-2, helmet (1) 3-5, vest (2) 6-8; the vest in tint slot 1. */
const PIECE = [0, 0, 0, 1, 1, 1, 2, 2, 2];
const TINT = [0, 0, 0, 0, 0, 0, 1, 1, 1];

/** World matrices top-down (no render loop on a NullEngine). */
function refresh(n: TransformNode): void {
  n.computeWorldMatrix(true);
  for (const c of n.getChildren()) refresh(c as TransformNode);
}

/** A bone's skeleton-space matrix by its local chain (independent of Babylon's skeleton.prepare). */
function boneAbs(b: Bone, M: typeof Matrix): Matrix {
  const p = b.getParent();
  return p ? b.getLocalMatrix().multiply(boneAbs(p, M)) : b.getLocalMatrix().clone();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { forgetModels, loadModel } = await import('../src/operators/runtime/figure');
  const G = await import('../src/operators/runtime/guardFigure');
  const M = await import('../src/operators/runtime/manifest');
  const glb = guardGlb();
  const fetched: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    fetched.push(url);
    return new Response(glb.slice(0));
  });
  forgetModels();
  // the bake's _PIECE / _TINT (G4's reader fills them; patched into the cached parse here)
  for (const u of MANIFEST.urls.slice(1)) {
    const model = await loadModel(u);
    const g = model.meshes[0] as GuardGlbMesh;
    g.piece = Uint8Array.from(PIECE);
    g.tint = Uint8Array.from(TINT);
  }
  fetched.length = 0;
  const scene: Scene = new B.Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  const rig = (name: string) => new CharacterRig(scene, (s, h, n) => parts.instance(s, h, n), defaultLook(), 1.8, name);
  return { B, G, M, scene, rig, fetched, forgetModels };
}

const gvisOf = (m: Mesh): Uint8Array => m.getVertexBuffer('gvis')!.getData() as Uint8Array;
const alphas = (m: Mesh): number[] => Array.from(gvisOf(m)).filter((_, i) => (i & 3) === 3);

describe('guard figure on a NullEngine', () => {
  it('shares static buffers per (base, LOD) across guards; gvis, indices and skeleton per guard', async () => {
    const { B, G, M, scene, rig, fetched, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    const ra = rig('ga'), rb = rig('gb');
    const a = new G.GuardFigure(lib, ra, MANIFEST, 'ga', { pieces: ['average', 'vest_soft'], tints: [255, 255, 255, 10, 20, 30] });
    const b = new G.GuardFigure(lib, rb, MANIFEST, 'gb', { pieces: ['average', 'helmet_std'] });
    const built: number[] = [];
    a.onMeshes = (ms) => built.push(ms.length);
    await Promise.all([a.loadGameLods(), b.loadGameLods()]);
    expect(fetched).toEqual([]); // parsed once (the cache), never refetched per guard
    expect(lib.sharedCount).toBe(3);
    expect(a.loaded).toBe(0b1110);
    expect(built).toEqual([1, 1, 1]);
    for (const lod of [M.LOD_0, M.LOD_1, M.LOD_2]) {
      const ma = a.lodMeshes(lod)[0]!, mb = b.lodMeshes(lod)[0]!;
      for (const kind of [B.VertexBuffer.PositionKind, B.VertexBuffer.NormalKind, B.VertexBuffer.MatricesIndicesKind, B.VertexBuffer.MatricesWeightsKind]) {
        expect(ma.getVertexBuffer(kind)!.getBuffer()).toBe(mb.getVertexBuffer(kind)!.getBuffer());
      }
      expect(ma.getVertexBuffer('gvis')!.getBuffer()).not.toBe(mb.getVertexBuffer('gvis')!.getBuffer());
      expect(ma.geometry).not.toBe(mb.geometry);
      expect(ma.geometry!.getIndexBuffer()).not.toBe(mb.geometry!.getIndexBuffer());
      expect(ma.material).toBe(mb.material);
      expect(ma.material!.pluginManager?.getPlugin('GuardFigure')).toBeTruthy();
      // the albedo alpha is the tint mask, never transparency
      expect((ma.material as InstanceType<typeof B.PBRMaterial>).useAlphaFromAlbedoTexture).toBe(false);
      expect(ma.skeleton).not.toBe(mb.skeleton);
      expect(ma.numBoneInfluencers).toBe(4);
      // only the visible pieces' triangles are in each guard's index buffer
      expect(ma.getTotalIndices()).toBe(6);
      expect(mb.getTotalIndices()).toBe(6);
      // RGBA8 normalised; tint per slot, a = visible
      const vb = ma.getVertexBuffer('gvis')!;
      expect(vb.type).toBe(B.VertexBuffer.UNSIGNED_BYTE);
      expect(vb.normalized).toBe(true);
      expect(alphas(ma)).toEqual([255, 255, 255, 0, 0, 0, 255, 255, 255]);
      expect(alphas(mb)).toEqual([255, 255, 255, 255, 255, 255, 0, 0, 0]);
      expect(Array.from(gvisOf(ma).subarray(24, 28))).toEqual([10, 20, 30, 255]);
      expect(Array.from(gvisOf(mb).subarray(24, 27))).toEqual([255, 255, 255]);
    }
    a.dispose();
    b.dispose();
    scene.dispose();
    forgetModels();
  });

  it('a gear toggle rewrites exactly that piece\'s gvis bytes and the index buffer; unchanged calls are no-ops', async () => {
    const { B, G, M, scene, rig, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    const a = new G.GuardFigure(lib, rig('ga'), MANIFEST, 'ga', { pieces: ['average', 'vest_soft'] });
    await a.loadGameLods();
    const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, -3), scene);
    a.update(cam);
    expect(a.current).toBe(M.LOD_0);
    const m0 = a.lodMeshes(M.LOD_0)[0]!;
    const before = gvisOf(m0).slice();
    const ib0 = m0.geometry!.getIndexBuffer();
    // no change: nothing rewritten
    a.setPieces(['vest_soft', 'average']);
    expect(m0.geometry!.getIndexBuffer()).toBe(ib0);
    // helmet on (alarm stage): only the helmet vertices' alpha bytes change
    a.setPieces(['average', 'vest_soft', 'helmet_std']);
    const after = gvisOf(m0);
    for (let i = 0; i < after.length; i++) {
      const v = i >> 2;
      if (PIECE[v] === 1 && (i & 3) === 3) expect(after[i]).toBe(255);
      else expect(after[i], `byte ${i}`).toBe(before[i]);
    }
    expect(m0.getTotalIndices()).toBe(9);
    expect(m0.subMeshes.length).toBe(1);
    expect(m0.subMeshes[0]!.indexCount).toBe(9);
    // the rest box survives the index swap (mesh and submesh)
    expect(m0.getBoundingInfo().boundingBox.minimum.y).toBeCloseTo(0.7, 5);
    expect(m0.subMeshes[0]!.getBoundingInfo().boundingBox.minimum.y).toBeCloseTo(0.7, 5);
    expect(m0.alwaysSelectAsActiveMesh).toBe(false);
    expect(m0.geometry!.getIndexBuffer()).not.toBe(ib0);
    expect(ib0!.references).toBe(0); // the old one released
    // a tint change: only slot 1's vertices
    a.setTints([255, 255, 255, 40, 50, 60]);
    expect(Array.from(gvisOf(m0).subarray(0, 4))).toEqual([255, 255, 255, 255]);
    expect(Array.from(gvisOf(m0).subarray(32, 36))).toEqual([40, 50, 60, 255]);
    // a LOD not shown catches up when it is shown
    const m1 = a.lodMeshes(M.LOD_1)[0]!;
    expect(alphas(m1)).toEqual([255, 255, 255, 0, 0, 0, 255, 255, 255]);
    cam.position.set(0, 1.6, -15);
    cam.computeWorldMatrix();
    a.update(cam);
    expect(a.current).toBe(M.LOD_1);
    expect(m0.isEnabled()).toBe(false);
    expect(m1.isEnabled()).toBe(true);
    expect(alphas(m1)).toEqual([255, 255, 255, 255, 255, 255, 255, 255, 255]);
    expect(Array.from(gvisOf(m1).subarray(32, 36))).toEqual([40, 50, 60, 255]);
    expect(m1.getTotalIndices()).toBe(9);
    // helmet knocked off: its triangles leave the buffer, so no pass (shadows, G-buffer) draws it
    a.setPieces(['average', 'vest_soft']);
    expect(m1.getTotalIndices()).toBe(6);
    // the mesh draws the visible pieces only: the anim tier's mesh is the shown one
    expect(a.mesh).toBe(m1);
    // a WebGL context restore: every LOD's index buffer back to the visible pieces (the rebuild made a full one)
    const ib1 = m1.geometry!.getIndexBuffer();
    scene.getEngine().onContextRestoredObservable.notifyObservers(scene.getEngine());
    expect(m1.geometry!.getIndexBuffer()).not.toBe(ib1);
    expect(m1.getTotalIndices()).toBe(6);
    // LOD0 (not shown, behind the helmet change) catches up when shown
    cam.position.set(0, 1.6, -3);
    cam.computeWorldMatrix();
    a.update(cam);
    expect(a.current).toBe(M.LOD_0);
    expect(m0.getTotalIndices()).toBe(6);
    expect(alphas(m0)).toEqual([255, 255, 255, 0, 0, 0, 255, 255, 255]);
    a.dispose();
    scene.dispose();
    forgetModels();
  });

  it('culls by the S1 rest box (not always active); a re-parented joint flips it and the world path follows the rig < 1e-4 m', async () => {
    const { B, G, M, scene, rig, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    const r = rig('ga');
    r.root.position.set(2, 0, -1);
    r.root.rotationQuaternion = B.Quaternion.RotationYawPitchRoll(0.6, 0, 0);
    refresh(r.root);
    const a = new G.GuardFigure(lib, r, MANIFEST, 'ga', { pieces: ['average', 'helmet_std', 'vest_soft'], scale: 1.03 });
    await a.load(M.LOD_0);
    a.update(null);
    expect(a.current).toBe(M.LOD_0);
    const mesh = a.lodMeshes(M.LOD_0)[0]!;
    expect(mesh.alwaysSelectAsActiveMesh).toBe(false);
    expect(a.loose).toBe(false);
    // the bind pose's root-local box plus S1's margins (the reader mirrors glTF x: x runs -0.05..0.5)
    const bb = mesh.getBoundingInfo().boundingBox;
    expect(bb.minimum.x).toBeCloseTo(-0.05 - 1, 5);
    expect(bb.maximum.x).toBeCloseTo(0.5 + 1, 5);
    expect(bb.minimum.y).toBeCloseTo(1.0 - 0.3, 5);
    expect(bb.maximum.y).toBeCloseTo(1.75 + 0.3, 5);
    expect(bb.maximum.z).toBeCloseTo(0.12 + 1, 5);
    const skel = a.lodSkeleton(M.LOD_0)!;
    const world = (name: string): InstanceType<typeof B.Vector3> => {
      refresh(r.root);
      const bone = skel.bones.find((b) => b.name === name)!;
      return boneAbs(bone, B.Matrix).multiply(mesh.getWorldMatrix()).getTranslation();
    };
    const names = skel.bones.map((b) => b.name);
    const local = new Map(names.map((n) => [n, world(n)] as const));
    // ragdoll: the left arm onto a physics node (world kept), then the node moves
    const shParent = r.shoulderL.parent;
    const arm = new B.TransformNode('rag-armL', scene);
    r.shoulderL.computeWorldMatrix(true);
    arm.position.copyFrom(r.shoulderL.getAbsolutePosition());
    arm.rotationQuaternion = r.shoulderL.absoluteRotationQuaternion.clone();
    refresh(arm);
    r.shoulderL.setParent(arm);
    refresh(r.root);
    refresh(arm);
    a.update(null);
    expect(a.loose).toBe(true);
    expect(mesh.alwaysSelectAsActiveMesh).toBe(true);
    // the world path at the moment of the switch matches the local retarget (rig at rest)
    for (const n of names) expect(B.Vector3.Distance(world(n), local.get(n)!), n).toBeLessThan(1e-4);
    // each operator joint rides its rig joint's world matrix
    const rigNodes = new Map<string, TransformNode>([['shL', r.shoulderL], ['elL', r.elbowL], ['wrL', r.wristL], ['handL', r.wristL], ['fingerL_1_1', r.wristL], ['head', r.headNode], ['chest', r.torso]]);
    const wBefore = new Map([...rigNodes].map(([k, n]) => [k, n.computeWorldMatrix(true).clone()] as const));
    arm.position.addInPlace(new B.Vector3(0.1, -0.3, 0.2));
    arm.rotationQuaternion = B.Quaternion.RotationYawPitchRoll(0.4, 1.0, -0.3).multiply(arm.rotationQuaternion);
    refresh(arm);
    r.elbowL.rotationQuaternion = B.Quaternion.RotationYawPitchRoll(0, 0.7, 0);
    refresh(arm);
    a.update(null);
    for (const [k, n] of rigNodes) {
      const wAfter = n.computeWorldMatrix(true);
      const expected = B.Vector3.TransformCoordinates(B.Vector3.TransformCoordinates(local.get(k)!, wBefore.get(k)!.clone().invert()), wAfter);
      expect(B.Vector3.Distance(world(k), expected), k).toBeLessThan(1e-4);
    }
    expect(B.Vector3.Distance(world('wrL'), local.get('wrL')!)).toBeGreaterThan(0.1); // it did move
    // the joints left on the rig stay put
    expect(B.Vector3.Distance(world('head'), local.get('head')!)).toBeLessThan(1e-4);
    // the arm back on its rig parent: culled by its box again, the local retarget again
    r.shoulderL.setParent(shParent);
    r.elbowL.rotationQuaternion = B.Quaternion.Identity();
    refresh(r.root);
    a.update(null);
    expect(a.loose).toBe(false);
    expect(mesh.alwaysSelectAsActiveMesh).toBe(false);
    a.dispose();
    scene.dispose();
    forgetModels();
  });

  it('(B1) the body piece is always shown: a G6 applyGear list without the base keeps it in gvis and the index buffer', async () => {
    const { B, G, M, scene, rig, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    // the default: the body only
    const d = new G.GuardFigure(lib, rig('gd'), MANIFEST, 'gd');
    // G6's applyGear output never lists the base (head, hair, headwear, kit, outfit, gear only)
    const a = new G.GuardFigure(lib, rig('ga'), MANIFEST, 'ga', { pieces: ['helmet_std'] });
    await Promise.all([a.loadGameLods(), d.loadGameLods()]);
    const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, -3), scene);
    a.update(cam);
    d.update(cam);
    const m0 = a.lodMeshes(M.LOD_0)[0]!;
    expect(alphas(m0)).toEqual([255, 255, 255, 255, 255, 255, 0, 0, 0]);
    expect(m0.getTotalIndices()).toBe(6);
    expect(a.pieceShown('average')).toBe(true);
    expect(alphas(d.lodMeshes(M.LOD_0)[0]!)).toEqual([255, 255, 255, 0, 0, 0, 0, 0, 0]);
    expect(d.lodMeshes(M.LOD_0)[0]!.getTotalIndices()).toBe(3);
    // a gear change with no body named and nothing else: the body stays drawn
    const ib = vi.spyOn(scene.getEngine(), 'createIndexBuffer');
    a.setPieces([], 0);
    expect(alphas(m0).slice(0, 3)).toEqual([255, 255, 255]);
    expect(m0.getTotalIndices()).toBe(3);
    expect(Array.from(ib.mock.calls.at(-1)![0] as Uint16Array)).toEqual([0, 1, 2]);
    expect(m0.isVisible).toBe(true);
    ib.mockRestore();
    a.dispose();
    d.dispose();
    scene.dispose();
    forgetModels();
  });

  it('(B2) takes G6\'s reused (ids, count): a stale helmet_std past count stays hidden and out of the index buffer', async () => {
    const { B, G, M, scene, rig, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    const a = new G.GuardFigure(lib, rig('ga'), MANIFEST, 'ga');
    await a.loadGameLods();
    const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, -3), scene);
    a.update(cam);
    const m0 = a.lodMeshes(M.LOD_0)[0]!;
    // GuardPieces as applyGear leaves it: 16 reused slots, the first `count` valid
    const ids: string[] = ['average-1', 'vest_soft', 'helmet_std'];
    while (ids.length < 16) ids.push('');
    const ib = vi.spyOn(scene.getEngine(), 'createIndexBuffer');
    a.setPieces(ids, 3);
    expect(alphas(m0)).toEqual([255, 255, 255, 255, 255, 255, 255, 255, 255]);
    expect(m0.getTotalIndices()).toBe(9);
    // the helmet knocked off: applyGear rewrites the list shorter; helmet_std stays in slot 2 as a stale entry
    ids[1] = 'vest_soft';
    a.setPieces(ids, 2);
    expect(alphas(m0)).toEqual([255, 255, 255, 0, 0, 0, 255, 255, 255]);
    expect(a.pieceShown('helmet_std')).toBe(false);
    expect(m0.getTotalIndices()).toBe(6);
    const last = Array.from(ib.mock.calls.at(-1)![0] as Uint16Array);
    expect(last.some((i) => i >= 3 && i <= 5)).toBe(false);
    expect(last.sort()).toEqual([0, 1, 2, 6, 7, 8]);
    // the same set again (a different stale tail): no rewrite
    const n = ib.mock.calls.length;
    ids[2] = 'cap';
    a.setPieces(ids, 2);
    expect(ib.mock.calls.length).toBe(n);
    ib.mockRestore();
    a.dispose();
    scene.dispose();
    forgetModels();
  });

  it('a head variant swap hides exactly the old head\'s vertices and shows exactly the new one\'s (body, gear and tints untouched)', async () => {
    const { B, G, M, scene, rig, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    // the fixture's pieces 1 and 2 stand for two head variants of the base (same vertices, other ids)
    const HEADS: GuardManifest = { ...MANIFEST, pieces: ['average', 'average-1', 'average-2'] };
    const a = new G.GuardFigure(lib, rig('ga'), HEADS, 'ga', { pieces: ['average-1'] });
    await a.loadGameLods();
    const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, -3), scene);
    a.update(cam);
    const m0 = a.lodMeshes(M.LOD_0)[0]!;
    expect(alphas(m0)).toEqual([255, 255, 255, 255, 255, 255, 0, 0, 0]);
    const before = gvisOf(m0).slice();
    const ib = vi.spyOn(scene.getEngine(), 'createIndexBuffer');
    a.setPieces(['average-2']);
    const after = gvisOf(m0);
    for (let i = 0; i < after.length; i++) {
      const v = i >> 2;
      if ((i & 3) === 3 && (PIECE[v] === 1 || PIECE[v] === 2)) expect(after[i], `alpha of vertex ${v}`).toBe(PIECE[v] === 2 ? 255 : 0);
      else expect(after[i], `byte ${i}`).toBe(before[i]);
    }
    expect(a.pieceShown('average-1')).toBe(false);
    expect(a.pieceShown('average-2')).toBe(true);
    // still two triangles: the body and the new head; the old head's triangle is gone from every pass
    expect(m0.getTotalIndices()).toBe(6);
    expect(Array.from(ib.mock.calls.at(-1)![0] as Uint16Array).sort()).toEqual([0, 1, 2, 6, 7, 8]);
    // the same head again: no rewrite
    const n = ib.mock.calls.length;
    a.setPieces(['average-2']);
    expect(ib.mock.calls.length).toBe(n);
    // two heads listed (a bad caller) are both shown: the mask is the list, never a guess
    a.setPieces(['average-1', 'average-2']);
    expect(alphas(m0)).toEqual([255, 255, 255, 255, 255, 255, 255, 255, 255]);
    ib.mockRestore();
    a.dispose();
    scene.dispose();
    forgetModels();
  });

  it('flash and heat fold into the visible alpha (no overlay, one draw per guard in thermal); neither throws', async () => {
    const { B, G, M, scene, rig, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    const a = new G.GuardFigure(lib, rig('ga'), MANIFEST, 'ga', { pieces: ['average', 'vest_soft'] });
    await a.loadGameLods();
    const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, -3), scene);
    a.update(cam);
    const m0 = a.lodMeshes(M.LOD_0)[0]!;
    expect(() => a.setFlash(1)).not.toThrow();
    expect(alphas(m0)).toEqual([240, 240, 240, 0, 0, 0, 240, 240, 240]);
    // the far LODs catch up when shown
    expect(alphas(a.lodMeshes(M.LOD_2)[0]!)).toEqual([255, 255, 255, 0, 0, 0, 255, 255, 255]);
    a.setFlash(0.5);
    expect(alphas(m0)[0]).toBe(255 - 8);
    a.setFlash(0);
    expect(alphas(m0)).toEqual([255, 255, 255, 0, 0, 0, 255, 255, 255]);
    // thermal: the body heat (THERMAL.bodyEmit 0.85) as level 13 in the high bits of the same bytes, no overlay pass
    const vb = m0.getVertexBuffer('gvis')!;
    const up = vi.spyOn(vb, 'updateDirectly');
    expect(() => a.setHeat(0.85)).not.toThrow();
    expect(up).toHaveBeenCalledTimes(1);
    expect(alphas(m0)).toEqual([47, 47, 47, 0, 0, 0, 47, 47, 47]);
    expect(a.renderMeshes.some((m) => m.renderOverlay)).toBe(false);
    a.setHeat(0.851); // same level: no rewrite
    expect(up).toHaveBeenCalledTimes(1);
    up.mockRestore();
    // a LOD shown later catches up with the heat
    cam.position.set(0, 1.6, -40);
    cam.computeWorldMatrix();
    a.update(cam);
    expect(a.current).toBe(M.LOD_2);
    expect(alphas(a.lodMeshes(M.LOD_2)[0]!)).toEqual([47, 47, 47, 0, 0, 0, 47, 47, 47]);
    a.setHeat(0);
    expect(alphas(a.lodMeshes(M.LOD_2)[0]!)).toEqual([255, 255, 255, 0, 0, 0, 255, 255, 255]);
    expect(a.renderMeshes.some((m) => m.renderOverlay)).toBe(false);
    expect(() => a.setHeadVisible(false)).not.toThrow();
    const m2 = a.lodMeshes(M.LOD_2)[0]!;
    a.setEnabled(false);
    expect(m2.isEnabled()).toBe(false);
    a.setEnabled(true);
    expect(m2.isEnabled()).toBe(true);
    a.dispose();
    scene.dispose();
    forgetModels();
  });

  it('(R1) thermal adds no draw: the guard draws once with heat on as with it off (an overlay would add one)', async () => {
    const { B, G, M, scene, rig, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    const a = new G.GuardFigure(lib, rig('ga'), MANIFEST, 'ga', { pieces: ['average', 'vest_soft'] });
    await a.loadGameLods();
    const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, -3), scene);
    cam.setTarget(new B.Vector3(0, 1.2, 0));
    scene.activeCamera = cam;
    a.update(cam);
    const m0 = a.lodMeshes(M.LOD_0)[0]!;
    const draws = vi.spyOn(scene.getEngine(), 'drawElementsType');
    const frame = async (): Promise<number> => {
      await vi.waitFor(() => expect(scene.isReady()).toBe(true));
      draws.mockClear();
      scene.render();
      return draws.mock.calls.length;
    };
    const cold = await frame();
    expect(cold).toBeGreaterThan(0);
    a.setHeat(0.85);
    expect(await frame()).toBe(cold);
    // the counter does see an overlay pass: Wren's way (renderOverlay) costs one more draw per mesh
    m0.renderOverlay = true;
    m0.overlayAlpha = 0.85;
    // (the outline renderer compiles its effect on the first frames)
    await vi.waitFor(async () => expect(await frame()).toBe(cold + 1));
    m0.renderOverlay = false;
    draws.mockRestore();
    a.dispose();
    scene.dispose();
    forgetModels();
  });

  it('dispose frees the guard\'s own buffers only; the shared (base, LOD) buffers stay for the others', async () => {
    const { B, G, M, scene, rig, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    const a = new G.GuardFigure(lib, rig('ga'), MANIFEST, 'ga');
    const b = new G.GuardFigure(lib, rig('gb'), MANIFEST, 'gb');
    await Promise.all([a.loadGameLods(), b.loadGameLods()]);
    const own = a.renderMeshes.flatMap((m) => [m.getVertexBuffer('gvis')!.getBuffer()!, m.geometry!.getIndexBuffer()!]);
    const shared = a.renderMeshes.map((m) => m.getVertexBuffer(B.VertexBuffer.PositionKind)!.getBuffer()!);
    const sharedRefs = shared.map((d) => d.references);
    const before = scene.meshes.length;
    a.dispose();
    expect(a.isDisposed).toBe(true);
    expect(scene.meshes.length).toBe(before - 3);
    for (const d of own) expect(d.references).toBe(0);
    expect(shared.map((d) => d.references)).toEqual(sharedRefs);
    expect(lib.sharedCount).toBe(3);
    for (const lod of [M.LOD_0, M.LOD_1, M.LOD_2]) {
      const mb = b.lodMeshes(lod)[0]!;
      expect(mb.isDisposed()).toBe(false);
      expect(mb.getVertexBuffer(B.VertexBuffer.PositionKind)!.getBuffer()).toBe(shared[lod - 1]);
    }
    expect(lib.figures.has(a)).toBe(false);
    b.dispose();
    scene.dispose();
    forgetModels();
  });

  it('the plugin: its code in the PBR effect of a gvis mesh (GUARDFIG on), off for a mesh without gvis', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const B = await import('../src/core/babylon');
    const { GuardFigurePlugin } = await import('../src/operators/runtime/guardFigurePlugin');
    const scene = new B.Scene(new NullEngine());
    const mat = new B.PBRMaterial('m', scene);
    new GuardFigurePlugin(mat);
    const effectOf = async (gvis: boolean) => {
      const mesh = B.CreateBox(`b${gvis}`, {}, scene);
      if (gvis) mesh.setVerticesBuffer(new B.VertexBuffer(scene.getEngine(), new Uint8Array(mesh.getTotalVertices() * 4), 'gvis', { updatable: true, stride: 4, size: 4, type: B.VertexBuffer.UNSIGNED_BYTE, normalized: true }));
      mesh.material = mat;
      const sm = mesh.subMeshes[0]!;
      await vi.waitFor(() => expect(mat.isReadyForSubMesh(mesh, sm)).toBe(true));
      return sm.effect! as unknown as { defines: string; _vertexSourceCode: string; _fragmentSourceCode: string };
    };
    const on = await effectOf(true);
    expect(on.defines).toContain('#define GUARDFIG');
    expect(on._vertexSourceCode).toContain('gl_Position *= step(0.5 / 255.0, gvis.a);');
    expect(on._fragmentSourceCode).toContain('surfaceAlbedo *= mix(vec3(1.0), toLinearSpace(vGvis), gTintMask);');
    expect(on._vertexSourceCode).toContain('float gHeat = floor(gFx / 16.0);');
    expect(on._fragmentSourceCode).toContain('finalColor.rgb = mix(finalColor.rgb, vec3(1.0), vGfx.y);');
    const off = await effectOf(false);
    expect(off.defines).not.toContain('#define GUARDFIG');
    scene.dispose();
  });

  it('(P1) a load finishing after the scene is disposed builds nothing; the figure load is abandoned, not failed', async () => {
    const { G, M, scene, rig, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    const a = new G.GuardFigure(lib, rig('ga'), MANIFEST, 'ga');
    const p = a.load(M.LOD_0);
    const q = lib.load(MANIFEST, M.LOD_1);
    scene.dispose();
    await expect(p).resolves.toBeUndefined();
    await expect(q).rejects.toThrow('scene disposed');
    expect(lib.sharedCount).toBe(0);
    expect(a.loaded).toBe(0);
    forgetModels();
  });

  it('(P2) a guard file is one primitive; only the stand-in may carry several', async () => {
    const { G, scene, forgetModels } = await setup();
    const { loadModel } = await import('../src/operators/runtime/figure');
    const model = await loadModel(MANIFEST.urls[1]);
    const two = { ...model, meshes: [model.meshes[0]!, model.meshes[0]!] };
    expect(G.validateGuardModel(model, MANIFEST, 'x')).toEqual([]);
    expect(G.validateGuardModel(two, MANIFEST, 'x').some((e) => e.includes('2 primitives'))).toBe(true);
    expect(G.validateGuardModel(two, { ...MANIFEST, id: 'guard-standin-average' }, 'x')).toEqual([]);
    scene.dispose();
    forgetModels();
  });

  it('refuses a bad manifest and a hero LOD', async () => {
    const { G, M, scene, rig, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    expect(() => new G.GuardFigure(lib, rig('ga'), { ...MANIFEST, pieces: [] }, 'ga')).toThrow('no pieces');
    await expect(lib.load(MANIFEST, M.LOD_HERO)).rejects.toThrow('not in the build');
    scene.dispose();
    forgetModels();
  });
});

describe('guard figure stand-in on Wren\'s real LOD2', () => {
  it('draws Wren\'s file as one body piece, posed bone for bone as Wren\'s own figure poses it', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const B = await import('../src/core/babylon');
    const { Tools } = await import('@babylonjs/core/Misc/tools');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const { OperatorFigure, OperatorLibrary, forgetModels } = await import('../src/operators/runtime/figure');
    const { manifestFromUrls, LOD_2 } = await import('../src/operators/runtime/manifest');
    const { guardStandInManifest } = await import('../src/operators/guards/gearMask');
    const { GuardFigure, GuardLibrary } = await import('../src/operators/runtime/guardFigure');
    // the real file carries KTX2 textures: an origin for the transcoder setup and a URL resolver (no GPU here)
    vi.stubGlobal('location', { origin: 'http://localhost' });
    const T = Tools as unknown as { GetAbsoluteUrl: (u: string) => string };
    const abs = T.GetAbsoluteUrl;
    T.GetAbsoluteUrl = (u) => u;
    vi.stubGlobal('fetch', async (url: string) => new Response(readFileSync(`src/operators/assets/wren/wren-${url.slice(1, -4)}.glb`)));
    forgetModels();
    const scene = new B.Scene(new NullEngine());
    const parts = new PartLibrary(scene);
    const def = ENEMIES.grunt;
    const rig = new CharacterRig(scene, (s, h, n) => parts.instance(s, h, n), def.look, def.height, 'g1', { build: def.build });
    const wrenUrls = manifestFromUrls('wren', { 'a/wren-lod0.glb': '/lod0.glb', 'a/wren-lod1.glb': '/lod1.glb', 'a/wren-lod2.glb': '/lod2.glb' }).urls;
    const manifest = guardStandInManifest('average', wrenUrls);
    const guard = new GuardFigure(new GuardLibrary(scene), rig, manifest, 'gs');
    const wren = new OperatorFigure(new OperatorLibrary(scene), rig, manifestFromUrls('wren', { 'a/wren-lod2.glb': '/lod2.glb' }), 'ws');
    await guard.load(LOD_2);
    await wren.load(LOD_2);
    // every vertex visible (one piece), every triangle in the guard's index buffer
    const gm = guard.lodMeshes(LOD_2);
    expect(gm.length).toBe(wren.renderMeshes.length);
    for (let i = 0; i < gm.length; i++) {
      const m = gm[i]!;
      expect(alphas(m).every((x) => x === 255)).toBe(true);
      expect(m.getTotalIndices()).toBe(wren.renderMeshes[i]!.getTotalIndices());
      expect(m.alwaysSelectAsActiveMesh).toBe(false);
    }
    const pose = { speed: 1.6, localX: 0, localZ: 1, grounded: true, crouch: 0.3, aimPitch: 0.1, aim: 0, kick: 0, armed: false, stride: 'facing' as const };
    for (let f = 0; f < 12; f++) rig.animate(1 / 60, pose);
    guard.update(null);
    wren.update(null);
    expect(guard.current).toBe(LOD_2);
    refresh(rig.root);
    const skel: Skeleton = guard.lodSkeleton(LOD_2)!;
    const wm = gm[0]!.getWorldMatrix();
    let worst = 0;
    let moved = 0;
    for (const bone of skel.bones) {
      const node = scene.getTransformNodeByName(`ws-lod2-${bone.name}`)!;
      expect(node, bone.name).toBeTruthy();
      const g = boneAbs(bone, B.Matrix).multiply(wm).getTranslation();
      worst = Math.max(worst, B.Vector3.Distance(g, node.getAbsolutePosition()));
      // (the walk moved the body off its bind pose: the comparison is not of two rest poses)
      moved = Math.max(moved, B.Vector3.Distance(g, B.Vector3.TransformCoordinates(bone.getAbsoluteInverseBindMatrix().clone().invert().getTranslation(), wm)));
    }
    expect(worst).toBeLessThan(1e-4);
    expect(moved).toBeGreaterThan(0.05);
    guard.dispose();
    wren.dispose();
    rig.dispose();
    scene.dispose();
    forgetModels();
    T.GetAbsoluteUrl = abs;
  }, 60_000);
});

describe('(S11) guard figure CPU levers', () => {
  it('LOD1 / LOD2 fold the fingers (LOD2 also the toes and clavicles): fewer bones, the kept ones posed where LOD0 poses them', async () => {
    const { B, G, M, scene, rig, forgetModels } = await setup();
    const { GUARD_LOD } = await import('../src/operators/runtime/guardLod');
    const lib = new G.GuardLibrary(scene);
    const r = rig('ga');
    // (one fixture file serves every LOD: a finger and the toes in all three, so each fold shows)
    const a = new G.GuardFigure(lib, r, MANIFEST, 'ga');
    await a.loadGameLods();
    const names = (lod: number): string[] => a.lodSkeleton(lod)!.bones.map((b) => b.name);
    expect(a.lodBoneCount(M.LOD_0)).toBe(23);
    expect(names(M.LOD_0)).toContain('fingerL_1_1');
    expect(a.lodBoneCount(M.LOD_1)).toBe(22);
    expect(names(M.LOD_1).some((n) => n.startsWith('finger'))).toBe(false);
    expect(names(M.LOD_1)).toContain('toeL');
    expect(a.lodBoneCount(M.LOD_2)).toBe(20);
    for (const n of ['fingerL_1_1', ...GUARD_LOD.foldMore]) expect(names(M.LOD_2)).not.toContain(n);
    // every vertex still points at a bone of its own skeleton (a folded joint's vertices ride its kept ancestor)
    for (const lod of [M.LOD_1, M.LOD_2]) {
      const idx = a.lodMeshes(lod)[0]!.getVertexBuffer(B.VertexBuffer.MatricesIndicesKind)!.getData() as Float32Array;
      expect(Math.max(...idx)).toBeLessThan(a.lodBoneCount(lod));
    }
    // a walk: each LOD2 bone sits where the LOD0 bone of the same name sits (< 1e-4 m)
    const pose = { speed: 1.6, localX: 0, localZ: 1, grounded: true, crouch: 0.3, aimPitch: 0.1, aim: 0, kick: 0, armed: false, stride: 'facing' as const };
    for (let f = 0; f < 12; f++) r.animate(1 / 60, pose);
    const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, -3), scene);
    cam.computeWorldMatrix();
    a.update(cam);
    expect(a.current).toBe(M.LOD_0);
    cam.position.set(0, 1.6, -40);
    cam.computeWorldMatrix();
    a.update(cam);
    expect(a.current).toBe(M.LOD_2);
    refresh(r.root);
    const at = (lod: number, n: string): InstanceType<typeof B.Vector3> =>
      boneAbs(a.lodSkeleton(lod)!.bones.find((b) => b.name === n)!, B.Matrix).multiply(a.lodMeshes(lod)[0]!.getWorldMatrix()).getTranslation();
    for (const n of names(M.LOD_2)) expect(B.Vector3.Distance(at(M.LOD_2, n), at(M.LOD_0, n)), n).toBeLessThan(1e-4);
    a.dispose();
    scene.dispose();
    forgetModels();
  });

  it('LOD distances: LOD0 under 6 m (GUARD_LOD), LOD1 to 25 m, LOD2 beyond, with the 10 % hysteresis', async () => {
    const { B, G, M, scene, rig, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    const r = rig('ga');
    const a = new G.GuardFigure(lib, r, MANIFEST, 'ga');
    await a.loadGameLods();
    refresh(r.root);
    // (measured from the rig's first joint: the camera level with it, so z alone is the distance)
    const y = a.root.parent ? (a.root.parent as TransformNode).getAbsolutePosition().y : 0;
    const cam = new B.FreeCamera('cam', new B.Vector3(0, y, -3), scene);
    cam.computeWorldMatrix();
    const at = (d: number): number => {
      cam.position.set(0, y, -d);
    cam.computeWorldMatrix();
      a.update(cam);
      return a.current;
    };
    expect(at(3)).toBe(M.LOD_0);
    expect(at(6.5)).toBe(M.LOD_0); // inside the hysteresis
    expect(at(6.7)).toBe(M.LOD_1); // past 6 x 1.1 (Wren's figure would still show LOD0: 8 m)
    expect(at(5.5)).toBe(M.LOD_1);
    expect(at(5.3)).toBe(M.LOD_0); // under 6 x 0.9
    expect(at(27)).toBe(M.LOD_1);
    expect(at(28)).toBe(M.LOD_2);
    a.dispose();
    scene.dispose();
    forgetModels();
  });

  it('LOD2 poses every other frame, odd and even slots on alternate frames; a LOD switch poses at once; an out-of-phase caller is never halved again', async () => {
    const { B, G, M, scene, rig, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    const a = new G.GuardFigure(lib, rig('ga'), MANIFEST, 'ga', { slot: 0 });
    const b = new G.GuardFigure(lib, rig('gb'), MANIFEST, 'gb', { slot: 1 });
    await Promise.all([a.loadGameLods(), b.loadGameLods()]);
    let frame = 10;
    vi.spyOn(scene, 'getFrameId').mockImplementation(() => frame);
    const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, -40), scene);
    cam.computeWorldMatrix();
    // the first frame at LOD2 is a LOD switch: both pose
    a.update(cam);
    b.update(cam);
    expect([a.current, b.current]).toEqual([M.LOD_2, M.LOD_2]);
    expect([a.poses, b.poses]).toEqual([1, 1]);
    const posedOn: [number[], number[]] = [[], []];
    for (frame = 11; frame <= 20; frame++) {
      const pa = a.poses, pb = b.poses;
      a.update(cam);
      b.update(cam);
      if (a.poses > pa) posedOn[0].push(frame);
      if (b.poses > pb) posedOn[1].push(frame);
    }
    expect(posedOn[0]).toEqual([12, 14, 16, 18, 20]);
    expect(posedOn[1]).toEqual([11, 13, 15, 17, 19]);
    // an anim tier calling only on odd frames (its own half rate, out of slot 0's phase): every call poses
    const before = a.poses;
    for (frame = 23; frame <= 31; frame += 2) a.update(cam);
    expect(a.poses - before).toBe(5);
    // a skipped frame leaves the skeleton unmarked (nothing recomputed or uploaded)
    const dirty = vi.spyOn(a.lodSkeleton(M.LOD_2)!.bones[0]!, 'markAsDirty');
    frame = 32;
    a.update(cam);
    frame = 33;
    a.update(cam);
    expect(dirty).toHaveBeenCalledTimes(1);
    // LOD1 poses every frame
    cam.position.set(0, 1.6, -15);
    cam.computeWorldMatrix();
    const p1 = a.poses;
    for (frame = 40; frame < 46; frame++) a.update(cam);
    expect(a.current).toBe(M.LOD_1);
    expect(a.poses - p1).toBe(6);
    // back to LOD2: the switch frame poses even off its parity (its bones were left from before)
    cam.position.set(0, 1.6, -40);
    cam.computeWorldMatrix();
    frame = 47;
    const p2 = a.poses;
    a.update(cam);
    expect(a.current).toBe(M.LOD_2);
    expect(a.poses - p2).toBe(1);
    a.dispose();
    b.dispose();
    scene.dispose();
    forgetModels();
  });
});
