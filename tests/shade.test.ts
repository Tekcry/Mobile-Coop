import { describe, expect, it } from 'vitest';
import { shapeDistance, smin, VoxelModelBuilder, type BodyMesh } from '../src/voxel/voxelModelBuilder';
import { SHADE_JOINTS, SHADE_SLOTS, shadeBody, shadeColors } from '../src/cosmetics/shadeOperative';
import { SHADE_HEIGHT, SHADE_PALETTE, SHADE_VOXEL } from '../src/config/shade';
import { proportions } from '../src/player/proportions';
import { defaultLook, sanitizeLook } from '../src/cosmetics/avatarLook';

const ID = (): Float32Array => Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const at = (x: number, y: number, z: number): Float32Array => {
  const m = ID();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
};

/** Every triangle's winding faces the way its vertex normals do. */
function checkMesh(b: BodyMesh): void {
  let bad = 0;
  for (let t = 0; t < b.indices.length; t += 3) {
    const [a, c, d] = [b.indices[t]!, b.indices[t + 1]!, b.indices[t + 2]!];
    const P = (v: number, i: number): number => b.positions[v * 3 + i]!;
    const u = [P(c, 0) - P(a, 0), P(c, 1) - P(a, 1), P(c, 2) - P(a, 2)];
    const v = [P(d, 0) - P(a, 0), P(d, 1) - P(a, 1), P(d, 2) - P(a, 2)];
    const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
    let dot = 0;
    for (let i = 0; i < 3; i++) dot += n[i]! * (b.normals[a * 3 + i]! + b.normals[c * 3 + i]! + b.normals[d * 3 + i]!);
    // Babylon's front face: (B - A) x (C - A) against the outward normal
    if (dot > 0) bad++;
  }
  expect(bad).toBe(0);
}

describe('VoxelModelBuilder (smooth skin from a voxel field)', () => {
  const b = new VoxelModelBuilder(0.01);
  it('a sphere: vertices on the true surface, outward normals, closed', () => {
    const m = b.build({ prims: [{ shape: { kind: 'ellipsoid', c: [0, 0, 0], r: [0.1, 0.1, 0.1] }, joint: 0, color: 1, blend: 0 }], paints: [], joints: [ID()] });
    for (let v = 0; v < m.positions.length / 3; v++) {
      const x = m.positions[v * 3]!;
      const y = m.positions[v * 3 + 1]!;
      const z = m.positions[v * 3 + 2]!;
      const r = Math.hypot(x, y, z);
      expect(Math.abs(r - 0.1)).toBeLessThan(0.002);
      expect((x * m.normals[v * 3]! + y * m.normals[v * 3 + 1]! + z * m.normals[v * 3 + 2]!) / r).toBeGreaterThan(0.98);
    }
    checkMesh(m);
    // closed: every edge is shared by exactly two triangles
    const edges = new Map<string, number>();
    for (let t = 0; t < m.indices.length; t += 3)
      for (let e = 0; e < 3; e++) {
        const a = m.indices[t + e]!;
        const c = m.indices[t + ((e + 1) % 3)]!;
        const k = a < c ? `${a},${c}` : `${c},${a}`;
        edges.set(k, (edges.get(k) ?? 0) + 1);
      }
    expect([...edges.values()].every((n) => n === 2)).toBe(true);
  });
  it('blends two joints into one surface and weights the skin across the joint', () => {
    const m = b.build({
      prims: [
        { shape: { kind: 'cone', a: [0, 0, 0], b: [0, -0.2, 0], ra: 0.04, rb: 0.04 }, joint: 0, color: 1, blend: 0 },
        { shape: { kind: 'cone', a: [0, 0, 0], b: [0, -0.2, 0], ra: 0.035, rb: 0.035 }, joint: 1, color: 2, blend: 0.03 },
      ],
      paints: [{ shape: { kind: 'box', c: [0, -0.1, 0], h: [0.1, 0.02, 0.1], round: 0 }, joint: 1, color: 3 }],
      joints: [ID(), at(0, -0.2, 0)],
    });
    checkMesh(m);
    let mixed = 0;
    for (let v = 0; v < m.positions.length / 3; v++) {
      const y = m.positions[v * 3 + 1]!;
      let sum = 0;
      for (let i = 0; i < 4; i++) sum += m.boneW[v * 4 + i]!;
      expect(sum).toBeCloseTo(1, 5);
      if (y > -0.05) expect(m.dominant[v]).toBe(0);
      if (y < -0.35) expect(m.dominant[v]).toBe(1);
      if (Math.abs(y + 0.2) < 0.01 && m.boneW[v * 4 + 1]! > 0.2) mixed++;
      // the paint band on the second joint (y -0.32 .. -0.28 in root space)
      if (y < -0.285 && y > -0.315) expect(m.colors[v]).toBe(3);
    }
    expect(mixed).toBeGreaterThan(4);
  });
  it('distance functions', () => {
    expect(shapeDistance({ kind: 'box', c: [0, 0, 0], h: [0.1, 0.1, 0.1], round: 0.02 }, 0.2, 0, 0)).toBeCloseTo(0.1);
    expect(shapeDistance({ kind: 'cone', a: [0, 0, 0], b: [0, 1, 0], ra: 0.2, rb: 0.1 }, 0.3, 0, 0)).toBeCloseTo(0.1, 2);
    expect(smin(0, 0, 0.1)).toBeLessThan(0);
    expect(smin(0, 1, 0.1)).toBe(0);
  });
});

describe('SHADE OPERATIVE', async () => {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const look = defaultLook();
  const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, `player-${slot}`), look, SHADE_HEIGHT, 'player');
  const fig = rig.voxel!;
  const p = proportions('average', SHADE_HEIGHT);
  const tris = fig.meshes.reduce((n, m) => n + m.getTotalIndices() / 3, 0);

  it('is one smooth skin on the rig, no equipment, no smooth parts behind it', () => {
    expect(rig.parts.length).toBe(0);
    // body + head (the player's camera fade)
    expect(fig.meshes.length).toBe(2);
    expect(fig.nodes.length).toBe(SHADE_JOINTS.length);
    expect(fig.meshes.every((m) => m.numBoneInfluencers === 4)).toBe(true);
    // the bind pose is undone: the arms hang again
    for (const n of [rig.root, rig.shoulderR, rig.wristR]) n.computeWorldMatrix(true);
    expect(Math.abs(rig.wristR.getAbsolutePosition().x - rig.shoulderR.getAbsolutePosition().x)).toBeLessThan(0.01);
  });
  it('stands 1.75 m: hood top to sole', () => {
    const pos = fig.meshes.flatMap((m) => Array.from(m.getVerticesData('position')!));
    let top = -1;
    let bottom = 9;
    for (let i = 1; i < pos.length; i += 3) {
      top = Math.max(top, pos[i]!);
      bottom = Math.min(bottom, pos[i]!);
    }
    expect(top).toBeGreaterThan(1.72);
    expect(top).toBeLessThan(1.8);
    // the sole is the ankle height under the ankle
    rig.ankleR.computeWorldMatrix(true);
    expect(Math.abs(rig.ankleR.getAbsolutePosition().y - bottom - p.y.ankle)).toBeLessThan(0.01);
  });
  it('fits the triangle budget for a smooth body', () => {
    console.info(`SHADE skin: ${tris} triangles`);
    expect(tris).toBeGreaterThan(4000);
    expect(tris).toBeLessThan(16000);
  });
  it('weights blend at the joints: the elbow takes the upper arm and the forearm', () => {
    const mi = fig.meshes[0]!.getVerticesData('matricesIndices')!;
    const mw = fig.meshes[0]!.getVerticesData('matricesWeights')!;
    const elbow = SHADE_JOINTS.indexOf('elbowR');
    const shoulder = SHADE_JOINTS.indexOf('shoulderR');
    let blended = 0;
    for (let v = 0; v < mw.length / 4; v++) {
      let we = 0;
      let ws = 0;
      for (let i = 0; i < 4; i++) {
        if (mi[v * 4 + i] === elbow) we = mw[v * 4 + i]!;
        if (mi[v * 4 + i] === shoulder) ws = mw[v * 4 + i]!;
      }
      if (we > 0.2 && ws > 0.2) blended++;
    }
    expect(blended).toBeGreaterThan(10);
  });
  it('the palette is one config object; every colour on the skin comes from it', () => {
    expect(shadeColors().slice(1)).toEqual(SHADE_SLOTS.map((k) => SHADE_PALETTE[k]));
    const body = shadeBody(p);
    for (const x of [...body.prims, ...body.paints]) {
      expect(x.color).toBeGreaterThanOrEqual(1);
      expect(x.color).toBeLessThanOrEqual(SHADE_SLOTS.length);
    }
  });
  it('the head hit sphere covers the head', () => {
    const head = fig.meshes[1]!.getVerticesData('position')!;
    rig.headNode.computeWorldMatrix(true);
    const c = rig.headNode.getAbsolutePosition();
    const r = Math.max(rig.headHit, (Math.max(p.head.w, p.head.d) / 2) * 1.15);
    let out = 0;
    for (let i = 0; i < head.length; i += 3) if (Math.hypot(head[i]! - c.x, head[i + 1]! - c.y, head[i + 2]! - c.z) > r + 0.02) out++;
    expect(out / (head.length / 3)).toBeLessThan(0.1);
  });
  it('is the default look; old operator saves become SHADE', () => {
    expect(defaultLook().torso).toBe('shade');
    const old = sanitizeLook({ ...defaultLook(), torso: 'operator', helmet: 'trilens' });
    expect(old.torso).toBe('shade');
    expect(old.helmet).toBe('none');
  });
  it('builds once per body', () => {
    const t0 = performance.now();
    const again = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, `remote-${slot}`), look, SHADE_HEIGHT, 'remote');
    expect(performance.now() - t0).toBeLessThan(200);
    expect(again.voxel!.meshes.length).toBe(1);
    expect(SHADE_VOXEL).toBeGreaterThan(0);
  });
});
