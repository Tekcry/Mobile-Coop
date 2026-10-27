/**
 * (gm-perf polish) The enforcer's merged shield is keyed by the parts' local chain, not world x inverse(root world):
 * every enforcer shares one merged shield source wherever he stands and however he faces; the merged geometry is
 * unchanged; a different scale still builds its own source; the merged shield and armour receive shadows as the
 * merged body does. NullEngine harness as `guardActiveMeshes.test.ts`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { AbstractMesh, Matrix, Mesh, Scene } from '../src/core/babylon';

afterEach(async () => {
  const { flags } = await import('../src/core/flags');
  flags.guardModels = false;
  flags.guardMerge = true;
});

async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { flags } = await import('../src/core/flags');
  flags.guardModels = false;
  flags.guardMerge = true;
  const scene: Scene = new B.Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  const casters: AbstractMesh[] = [];
  const world = { parts, map: { id: 'testmap', theme: { faction: 'urban' } }, addShadowCaster: (m: AbstractMesh) => casters.push(m) };
  /** A fresh root at (x, y, z), facing `yaw`, its world matrix computed. */
  const root = (i: number, x: number, y: number, z: number, yaw: number) => {
    const r = new B.TransformNode(`root-${i}`, scene);
    r.position.set(x, y, z);
    r.rotation.y = yaw;
    r.computeWorldMatrix(true);
    return r;
  };
  return { B, scene, world, flags, root };
}

/** Roots [x, y, z, yaw]: the origin, then far places (+-500..+-5000 m) at other yaws. */
const ROOTS: readonly (readonly [number, number, number, number])[] = [
  [0, 0, 0, 0],
  [500.3, 0.2, -512.7, 0.7],
  [-1234.5, 1.1, 2345.6, 1.9],
  [4999.9, -0.4, -4999.9, 3.3],
  [-3777.7, 2.5, -2888.8, 4.4],
  [2500.25, 0.05, 612.3, 5.5],
  [-777.7, 3.3, 4321.1, 6.0],
  [1999.9, -1.2, -3141.6, 2.6],
];

/** World box [min x, y, z, max x, y, z] of local `pos` under `w`, unioned into `out`. */
async function boxOf(pos: ArrayLike<number>, w: Matrix, out = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]): Promise<number[]> {
  const { Vector3 } = await import('../src/core/babylon');
  const t = new Vector3();
  for (let v = 0; v < pos.length / 3; v++) {
    Vector3.TransformCoordinatesFromFloatsToRef(pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!, w, t);
    out[0] = Math.min(out[0]!, t.x);
    out[1] = Math.min(out[1]!, t.y);
    out[2] = Math.min(out[2]!, t.z);
    out[3] = Math.max(out[3]!, t.x);
    out[4] = Math.max(out[4]!, t.y);
    out[5] = Math.max(out[5]!, t.z);
  }
  return out;
}

/** The union of instances' world boxes (their source's full or low LOD). */
async function partsBox(parts: readonly AbstractMesh[], low: boolean, lib: { low(m: Mesh): Mesh }): Promise<number[]> {
  const { VertexBuffer } = await import('../src/core/babylon');
  const out = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    p.computeWorldMatrix(true);
    const src = (p as unknown as { sourceMesh: Mesh }).sourceMesh;
    const m = low ? lib.low(src) : src;
    await boxOf(m.getVerticesData(VertexBuffer.PositionKind)!, p.getWorldMatrix(), out);
  }
  return out;
}

function near(a: number[], b: number[], tol = 0.001): void {
  for (let i = 0; i < 6; i++) expect([i, Math.abs(a[i]! - b[i]!) <= tol, a[i], b[i]]).toEqual([i, true, a[i], b[i]]);
}

const mergedShieldSources = (scene: Scene, scale: string): number => scene.meshes.filter((m) => m.name.startsWith(`merged-shield-${scale}`)).length;

describe('gm-perf polish: merged shield key and shadows', () => {
  it('every enforcer shares one merged shield source wherever he stands and faces', async () => {
    const { scene, world, root } = await setup();
    const { buildShieldPart } = await import('../src/ai/gearParts');
    const shields = ROOTS.map(([x, y, z, yaw], i) => buildShieldPart(world as never, root(i, x, y, z, yaw), 1));
    for (const sh of shields) expect(sh.getChildMeshes().length).toBe(0); // merged (no visor child left)
    const src = shields[0]!.sourceMesh;
    const own = shields.flatMap((sh, i) => (sh.sourceMesh === src ? [] : [i]));
    expect(own).toEqual([]);
    expect(mergedShieldSources(scene, '1.0000')).toBe(2); // the hi source and its low LOD, once
  });

  it('geometry unchanged: the merged shield box equals its parts\' within 1 mm (origin and far root, full and low LOD)', async () => {
    const { B, world, flags, root } = await setup();
    const { buildShieldPart } = await import('../src/ai/gearParts');
    for (const i of [0, 3, 6]) {
      const [x, y, z, yaw] = ROOTS[i]!;
      const r = root(i, x, y, z, yaw);
      flags.guardMerge = false;
      const sh0 = buildShieldPart(world as never, r, 1);
      flags.guardMerge = true;
      const parts = [sh0, ...sh0.getChildMeshes()];
      expect(parts.length).toBe(2);
      const want = [await partsBox(parts, false, world.parts), await partsBox(parts, true, world.parts)];
      sh0.dispose();
      const sh = buildShieldPart(world as never, r, 1);
      expect(sh.getChildMeshes().length).toBe(0);
      sh.computeWorldMatrix(true);
      const lo = sh.sourceMesh.getLODLevels()[0]!.mesh!;
      for (const [k, m] of [sh.sourceMesh, lo].entries()) {
        near(await boxOf(m.getVerticesData(B.VertexBuffer.PositionKind)!, sh.getWorldMatrix()), want[k]!);
      }
    }
  });

  it('a different scale still gets its own source (shared by its own kind)', async () => {
    const { scene, world, root } = await setup();
    const { buildShieldPart } = await import('../src/ai/gearParts');
    const a = buildShieldPart(world as never, root(0, ...ROOTS[1]!), 1);
    const b = buildShieldPart(world as never, root(1, ...ROOTS[2]!), 1.1);
    const c = buildShieldPart(world as never, root(2, ...ROOTS[3]!), 1.1);
    expect(b.sourceMesh).not.toBe(a.sourceMesh);
    expect(c.sourceMesh).toBe(b.sourceMesh);
    expect(mergedShieldSources(scene, '1.0000')).toBe(2);
    expect(mergedShieldSources(scene, '1.1000')).toBe(2);
  });

  it('the merged shield and armour receive shadows (hi and low LOD) though the part bases do not', async () => {
    const { scene, world, flags, root } = await setup();
    const { buildArmourParts, buildShieldPart } = await import('../src/ai/gearParts');
    const { buildEnemyRig } = await import('../src/ai/enemyRig');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    // the bases as a fresh library has them (nothing registered with a shadow generator)
    flags.guardMerge = false;
    const raw = buildShieldPart(world as never, root(0, ...ROOTS[4]!), 1);
    flags.guardMerge = true;
    expect(raw.sourceMesh.receiveShadows).toBe(false);
    const sh = buildShieldPart(world as never, root(1, ...ROOTS[5]!), 1);
    expect(sh.getChildMeshes().length).toBe(0);
    const shLo = sh.sourceMesh.getLODLevels()[0]!.mesh!;
    expect([sh.sourceMesh.receiveShadows, shLo.receiveShadows]).toEqual([true, true]);
    const { rig } = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'rcv');
    expect(rig.voxel).not.toBeNull();
    const plate = world.parts.instance('pill', '#556070', 'probe');
    expect(plate.sourceMesh.receiveShadows).toBe(false);
    plate.dispose();
    const merged = buildArmourParts(world as never, rig, '#556070');
    expect(merged.length).toBe(1);
    const hi = merged[0] as Mesh;
    const lo = hi.getLODLevels()[0]!.mesh!;
    expect([hi.receiveShadows, lo.receiveShadows]).toEqual([true, true]);
  });
});
