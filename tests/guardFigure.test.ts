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

  it('flash and heat: flash folds into the visible alpha only; heat is the overlay; neither throws', async () => {
    const { B, G, M, scene, rig, forgetModels } = await setup();
    const lib = new G.GuardLibrary(scene);
    const a = new G.GuardFigure(lib, rig('ga'), MANIFEST, 'ga', { pieces: ['average', 'vest_soft'] });
    await a.loadGameLods();
    const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, -3), scene);
    a.update(cam);
    const m0 = a.lodMeshes(M.LOD_0)[0]!;
    expect(() => a.setFlash(1)).not.toThrow();
    expect(alphas(m0)).toEqual([1, 1, 1, 0, 0, 0, 1, 1, 1]);
    // the far LODs catch up when shown
    expect(alphas(a.lodMeshes(M.LOD_2)[0]!)).toEqual([255, 255, 255, 0, 0, 0, 255, 255, 255]);
    a.setFlash(0.5);
    expect(alphas(m0)[0]).toBe(128);
    a.setFlash(0);
    expect(alphas(m0)).toEqual([255, 255, 255, 0, 0, 0, 255, 255, 255]);
    expect(() => a.setHeat(0.85)).not.toThrow();
    expect(a.renderMeshes.every((m) => m.renderOverlay && m.overlayAlpha === 0.85)).toBe(true);
    a.setHeat(0);
    expect(a.renderMeshes.some((m) => m.renderOverlay)).toBe(false);
    expect(() => a.setHeadVisible(false)).not.toThrow();
    a.setEnabled(false);
    expect(m0.isEnabled()).toBe(false);
    a.setEnabled(true);
    expect(m0.isEnabled()).toBe(true);
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
    expect(on._fragmentSourceCode).toContain('surfaceAlbedo *= mix(vec3(1.0), toLinearSpace(vGvis.rgb), gTintMask);');
    const off = await effectOf(false);
    expect(off.defines).not.toContain('#define GUARDFIG');
    scene.dispose();
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
