// (sector-redesign perfg) A guard's gun as one instance of a merged mesh per gun type (NullEngine): the parts are
// disabled, every merged vertex lands where its part's instance put it, with that part's colour (the ENEMY_GUN
// colours, no look change), both LODs; guns of a type share one source; the node hides it; `?guardmerge=0` keeps the parts.
import { afterEach, describe, expect, it } from 'vitest';
import type { InstancedMesh, Mesh } from '../src/core/babylon';
import type { WeaponId } from '../src/weapons/weaponDefs';

const ENEMY_GUN = { body: '#2a2d31', grip: '#17191c', accent: '#3a3f45' };

afterEach(async () => {
  const { flags } = await import('../src/core/flags');
  flags.guardMerge = true;
});

async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, TransformNode, Vector3, VertexBuffer } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { WeaponModel } = await import('../src/weapons/weaponModel');
  const { WEAPONS } = await import('../src/weapons/weaponDefs');
  const { mergeGun } = await import('../src/ai/enemyGunMerge');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const gun = (id: WeaponId, x: number) => {
    const hand = new TransformNode(`hand-${x}`, scene);
    hand.position.set(x, 1.2, -0.5);
    hand.rotation.set(0.2, 0.9, -0.1);
    return new WeaponModel(scene, lib, WEAPONS[id], ENEMY_GUN, hand);
  };
  return { scene, lib, gun, mergeGun, Vector3, VertexBuffer };
}

describe('perfg: merged guard gun', () => {
  it('one instance on the gun node; every vertex and colour as the parts had them (full and low LOD)', async () => {
    const { scene, lib, gun, mergeGun, Vector3, VertexBuffer } = await setup();
    const g = gun('rifle', 2);
    const n = g.parts.length;
    expect(n).toBeGreaterThanOrEqual(10);
    // the parts' world placement and colours before the swap
    const want = g.parts.map((p) => {
      p.computeWorldMatrix(true);
      const c = (p as InstancedMesh).instancedBuffers.color as { r: number; g: number; b: number };
      return { w: p.getWorldMatrix().clone(), c: { r: c.r, g: c.g, b: c.b }, src: (p as InstancedMesh).sourceMesh };
    });
    const inst = mergeGun(scene, g, 'g1');
    expect(inst).not.toBeNull();
    expect(inst!.parent).toBe(g.node);
    for (const p of g.parts) expect(p.isEnabled(false)).toBe(false);
    const hi = inst!.sourceMesh;
    expect(hi.isVisible).toBe(false);
    expect(hi.material).toBe(lib.skinMaterial);
    const lods = hi.getLODLevels();
    expect(lods.length).toBe(1);
    const lo = lods[0]!.mesh as Mesh;
    inst!.computeWorldMatrix(true);
    const iw = inst!.getWorldMatrix();
    let worst = 0;
    let checked = 0;
    for (const [li, mesh] of [hi, lo].entries()) {
      const pos = mesh.getVerticesData(VertexBuffer.PositionKind)!;
      const col = mesh.getVerticesData(VertexBuffer.ColorKind)!;
      let v0 = 0;
      for (const w of want) {
        const unit = (li === 0 ? w.src : lib.low(w.src)).getVerticesData(VertexBuffer.PositionKind)!;
        const nv = unit.length / 3;
        for (let k = 0; k < nv; k += Math.max(1, Math.floor(nv / 7))) {
          const a = Vector3.TransformCoordinates(new Vector3(unit[k * 3]!, unit[k * 3 + 1]!, unit[k * 3 + 2]!), w.w);
          const v = v0 + k;
          const b = Vector3.TransformCoordinates(new Vector3(pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!), iw);
          worst = Math.max(worst, a.subtract(b).length());
          expect(col[v * 4]).toBeCloseTo(w.c.r, 5);
          expect(col[v * 4 + 1]).toBeCloseTo(w.c.g, 5);
          expect(col[v * 4 + 2]).toBeCloseTo(w.c.b, 5);
          checked++;
        }
        v0 += nv;
      }
      expect(v0).toBe(pos.length / 3);
      for (const kind of ['pattern', 'color2', 'ppos', 'pnrm']) expect(mesh.isVerticesDataPresent(kind)).toBe(true);
    }
    expect(checked).toBeGreaterThan(50);
    expect(worst).toBeLessThan(1e-4);
  });

  it('guns of one type share one source; another type gets its own; the node hides it; dispose takes it', async () => {
    const { scene, gun, mergeGun } = await setup();
    const a = gun('rifle', 0);
    const b = gun('rifle', 3);
    const c = gun('pistolSd', 5);
    const ia = mergeGun(scene, a, 'a')!;
    const ib = mergeGun(scene, b, 'b')!;
    const ic = mergeGun(scene, c, 'c')!;
    expect(ia.sourceMesh).toBe(ib.sourceMesh);
    expect(ic.sourceMesh).not.toBe(ia.sourceMesh);
    a.setVisible(false);
    expect(ia.isEnabled()).toBe(false);
    a.setVisible(true);
    expect(ia.isEnabled()).toBe(true);
    a.dispose();
    expect(ia.isDisposed()).toBe(true);
    expect(ib.sourceMesh.isDisposed()).toBe(false);
  });

  it('?guardmerge=0: the parts stay', async () => {
    const { flags } = await import('../src/core/flags');
    const { scene, gun, mergeGun } = await setup();
    flags.guardMerge = false;
    const g = gun('rifle', 0);
    expect(mergeGun(scene, g, 'g')).toBeNull();
    for (const p of g.parts) expect(p.isEnabled(false)).toBe(true);
  });
});
