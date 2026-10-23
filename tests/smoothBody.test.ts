// (guard-render S1) The merged smooth guard body under NullEngine: a guard rig built with `merge` swaps its ~50 part
// instances for one rigidly skinned mesh pair; posed and moved, every skinned vertex lands where its part's instance
// puts it (both levels of detail), colours are the instance colours, the flash / ragdoll / off-flag paths hold.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mesh } from '../src/core/babylon';

afterEach(() => {
  vi.restoreAllMocks();
});

async function setup(merge = true) {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, TransformNode, VertexBuffer } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const { SmoothBody } = await import('../src/player/smoothBody');
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const def = ENEMIES.grunt;
  const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, `enemy-${sl}`), def.look, def.height, 'g1', { build: def.build, armor: def.plated, style: 'detailed', merge });
  return { scene, lib, rig, SmoothBody, TransformNode, VertexBuffer };
}

describe('guard-render S1: SmoothBody', () => {
  it('skinned vertices match the parts instance world positions after a pose and a move (full and low LOD)', async () => {
    const { scene, lib, rig, SmoothBody, VertexBuffer } = await setup();
    const body = rig.voxel;
    expect(body).toBeInstanceOf(SmoothBody);
    const sb = body as InstanceType<typeof SmoothBody>;
    expect(rig.renderMeshes.length).toBe(2);
    expect(rig.parts.length).toBeGreaterThan(30);
    for (const p of rig.parts) expect(p.isEnabled(false)).toBe(false);
    rig.root.position.set(3, 0.2, -2);
    rig.root.rotation.y = 0.7;
    const pose = { speed: 1.6, localX: 0, localZ: 1, grounded: true, crouch: 0.3, aimPitch: 0.1, aim: 0, kick: 0, armed: false, stride: 'facing' as const };
    for (let f = 0; f < 20; f++) rig.animate(1 / 60, pose);
    // world matrices top-down (no render loop here), then the skeleton (its pose reads the nodes)
    rig.root.computeWorldMatrix(true);
    for (const n of rig.root.getDescendants(false)) (n as { computeWorldMatrix?: (f: boolean) => unknown }).computeWorldMatrix?.(true);
    sb.skeleton.prepare(true);
    const bones = sb.skeleton.getTransformMatrices(null);
    const { Matrix, Vector3 } = await import('../src/core/babylon');
    const bm = new Matrix();
    const ranges = (sb as unknown as { ranges: Uint32Array[] }).ranges;
    let checked = 0;
    let worst = 0;
    for (let li = 0; li < 2; li++) {
      const mesh = sb.meshes[li]!;
      const pos = mesh.getVerticesData(VertexBuffer.PositionKind)!;
      const mi = mesh.getVerticesData(VertexBuffer.MatricesIndicesKind)!;
      const world = mesh.computeWorldMatrix(true);
      const r = ranges[li]!;
      rig.parts.forEach((part, pi) => {
        const src = (part as unknown as { sourceMesh: Mesh }).sourceMesh;
        const unit = (li === 0 ? src : lib.low(src)).getVerticesData(VertexBuffer.PositionKind)!;
        const v0 = r[pi * 2]!;
        const n = r[pi * 2 + 1]!;
        expect(n * 3).toBe(unit.length);
        const pw = part.getWorldMatrix();
        for (let k = 0; k < n; k += 7) {
          const v = v0 + k;
          Matrix.FromArrayToRef(bones, mi[v * 4]! * 16, bm);
          const skinned = Vector3.TransformCoordinates(Vector3.TransformCoordinates(new Vector3(pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!), bm), world);
          const inst = Vector3.TransformCoordinates(new Vector3(unit[k * 3]!, unit[k * 3 + 1]!, unit[k * 3 + 2]!), pw);
          worst = Math.max(worst, skinned.subtract(inst).length());
          checked++;
        }
      });
    }
    expect(checked).toBeGreaterThan(500);
    expect(worst).toBeLessThan(1e-4);
    // the instance colours per vertex; the low LOD hangs off the full mesh
    const cols = sb.meshes[0]!.getVerticesData(VertexBuffer.ColorKind)!;
    const c0 = (rig.parts[3] as unknown as { instancedBuffers: { color: { r: number } } }).instancedBuffers.color;
    expect(cols[ranges[0]![3 * 2]! * 4]).toBeCloseTo(c0.r, 6);
    expect(sb.meshes[0]!.getLODLevels().length).toBe(1);
    rig.dispose();
    lib.dispose();
    scene.dispose();
  });

  it('flash tints the vertices; a re-parented joint frees the box; ?guardmerge=0 keeps the parts', async () => {
    const { scene, lib, rig, SmoothBody, TransformNode, VertexBuffer } = await setup();
    const sb = rig.voxel as InstanceType<typeof SmoothBody>;
    const before = Array.from(sb.meshes[0]!.getVerticesData(VertexBuffer.ColorKind)!.slice(0, 3));
    rig.setFlash(1);
    expect(Array.from(sb.meshes[0]!.getVerticesData(VertexBuffer.ColorKind)!.slice(0, 3)).map((x) => +x.toFixed(3))).toEqual([1, 0.92, 0.85]);
    rig.setFlash(0);
    expect(Array.from(sb.meshes[0]!.getVerticesData(VertexBuffer.ColorKind)!.slice(0, 3))).toEqual(before);
    expect(sb.meshes[0]!.alwaysSelectAsActiveMesh).toBe(false);
    scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(sb.loose).toBe(false);
    rig.kneeL.setParent(new TransformNode('phys', scene));
    scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(sb.loose).toBe(true);
    expect(sb.meshes[0]!.alwaysSelectAsActiveMesh).toBe(true);
    // one scene observer for every smooth body
    const { CharacterRig } = await import('../src/player/characterRig');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const observers = scene.onBeforeRenderObservable.observers.length;
    const second = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, `enemy-${sl}`), ENEMIES.grunt.look, ENEMIES.grunt.height, 'g3', { style: 'detailed', merge: true });
    expect(second.voxel).toBeInstanceOf(SmoothBody);
    expect(scene.onBeforeRenderObservable.observers.length).toBe(observers);
    second.dispose();
    rig.dispose();
    const { flags } = await import('../src/core/flags');
    flags.guardMerge = false;
    try {
      const off = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, `enemy-${sl}`), ENEMIES.grunt.look, ENEMIES.grunt.height, 'g2', { style: 'detailed', merge: true });
      expect(off.voxel).toBeNull();
      expect(off.renderMeshes).toBe(off.parts);
      off.dispose();
    } finally {
      flags.guardMerge = true;
    }
    lib.dispose();
    scene.dispose();
  });
});

describe('guard-render S7: shared GPU buffers per cache entry', () => {
  it('two guards of one look share the static vertex and index buffers; per guard colour, skeleton and box; disposal by reference count', async () => {
    const { scene, lib, rig, SmoothBody, VertexBuffer } = await setup();
    const { CharacterRig } = await import('../src/player/characterRig');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const { sharedBufferCount } = await import('../src/player/smoothBody');
    const def = ENEMIES.grunt;
    const make = (name: string) => new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, `enemy-${sl}`), def.look, def.height, name, { build: def.build, armor: def.plated, style: 'detailed', merge: true });
    const rigB = make('g2');
    const a = rig.voxel as InstanceType<typeof SmoothBody>;
    const b = rigB.voxel as InstanceType<typeof SmoothBody>;
    expect(b).toBeInstanceOf(SmoothBody);
    const STATIC = [VertexBuffer.PositionKind, VertexBuffer.NormalKind, VertexBuffer.MatricesIndicesKind, VertexBuffer.MatricesWeightsKind, 'color2', 'ppos', 'pnrm'];
    const gpu = (m: Mesh, kind: string) => m.getVertexBuffer(kind)!.getBuffer()!;
    const holder = (m: Mesh, kind: string) => (m.getVertexBuffer(kind) as unknown as { _buffer: { isDisposed: boolean } })._buffer;
    // hi and lo: one shared entry each
    expect(sharedBufferCount(scene)).toBe(2);
    const held: { isDisposed: boolean }[] = [];
    const dataBufs: { references: number }[] = [];
    for (let li = 0; li < 2; li++) {
      const ma = a.meshes[li]!;
      const mb = b.meshes[li]!;
      for (const kind of STATIC) {
        expect(gpu(mb, kind)).toBe(gpu(ma, kind));
        expect(holder(mb, kind)).toBe(holder(ma, kind));
        expect(gpu(ma, kind).references).toBe(2);
        held.push(holder(ma, kind));
        dataBufs.push(gpu(ma, kind));
      }
      const ia = ma.geometry!.getIndexBuffer()!;
      expect(mb.geometry!.getIndexBuffer()).toBe(ia);
      expect(ia.references).toBe(2);
      dataBufs.push(ia);
      expect(ma.getTotalIndices()).toBeGreaterThan(0);
      expect(Array.from(mb.getIndices()!.slice(0, 6))).toEqual(Array.from(ma.getIndices()!.slice(0, 6)));
      // per guard: colour (flash, lens glow) and pattern (heat), skeleton, box, geometry
      expect(gpu(mb, VertexBuffer.ColorKind)).not.toBe(gpu(ma, VertexBuffer.ColorKind));
      expect(gpu(mb, 'pattern')).not.toBe(gpu(ma, 'pattern'));
      expect(mb.skeleton).not.toBe(ma.skeleton);
      expect(mb.getBoundingInfo()).not.toBe(ma.getBoundingInfo());
      expect(mb.geometry).not.toBe(ma.geometry);
    }
    // a flash on one guard leaves the other's colours
    const colB = Array.from(b.meshes[0]!.getVerticesData(VertexBuffer.ColorKind)!.slice(0, 4));
    a.setFlash(1);
    a.setHeat(0.8);
    expect(Array.from(b.meshes[0]!.getVerticesData(VertexBuffer.ColorKind)!.slice(0, 4))).toEqual(colB);
    expect(b.meshes[0]!.getVerticesData('pattern')![3]).toBe(0);
    // dispose one: the other keeps every buffer, one reference each
    rig.dispose();
    for (const d of dataBufs) expect(d.references).toBe(1);
    for (const h of held) expect(h.isDisposed).toBe(false);
    expect(sharedBufferCount(scene)).toBe(2);
    for (const m of b.meshes) {
      expect(m.geometry!.isReady()).toBe(true);
      for (const kind of STATIC) expect(m.getVertexBuffer(kind)!.getBuffer()).not.toBeNull();
      expect(m.getTotalIndices()).toBeGreaterThan(0);
      expect(m.subMeshes[0]!.indexCount).toBe(m.getTotalIndices());
    }
    // still selected for drawing (NullEngine: the PBR material never reports ready, before S7 too, so the active list)
    const { FreeCamera, Vector3 } = await import('../src/core/babylon');
    const cam = new FreeCamera('cam', new Vector3(0, 1.5, -4), scene);
    cam.setTarget(new Vector3(0, 1, 0));
    scene.render();
    expect(scene.getActiveMeshes().data.slice(0, scene.getActiveMeshes().length).map((m) => m.name)).toContain('g2-smooth');
    cam.dispose();
    // dispose both: the GPU buffers go, the entry with them
    rigB.dispose();
    for (const d of dataBufs) expect(d.references).toBe(0);
    for (const h of held) expect(h.isDisposed).toBe(true);
    expect(sharedBufferCount(scene)).toBe(0);
    // a later guard of the same look uploads afresh
    const rigC = make('g3');
    const c = rigC.voxel as InstanceType<typeof SmoothBody>;
    expect(gpu(c.meshes[0]!, VertexBuffer.PositionKind).references).toBe(1);
    expect(holder(c.meshes[0]!, VertexBuffer.PositionKind)).not.toBe(held[0]);
    expect(sharedBufferCount(scene)).toBe(2);
    // scene dispose (guard left undisposed) drops the scene's entries
    lib.dispose();
    scene.dispose();
    expect(sharedBufferCount(scene)).toBe(0);
  });
});
