import { describe, expect, it } from 'vitest';
import { absorbedMeasure, glbRigidSkin, LOD_ABSORBED, rigidItemChecks, rigidResidual, rigidSkinCheck, ruleBones, slingClockCheck, type RigidPart } from '../src/operators/rigidKit';

const box = (): number[][] => {
  const out: number[][] = [];
  for (const x of [-0.03, 0.03]) for (const y of [-0.089, 0, 0.089]) for (const z of [0, 0.024]) out.push([x, y, z]);
  return out;
};
function move(P: number[][], ang: number, t: number[]): number[][] {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return P.map(([x, y, z]) => [c * x! - s * y! + t[0]!, s * x! + c * y! + t[1]!, z! + t[2]!]);
}

describe('rigidResidual (Horn best fit)', () => {
  it('is zero for a rotated and moved copy', () => {
    expect(rigidResidual(box(), move(box(), 0.7, [0.1, 1.2, -0.3]))).toBeLessThan(1e-9);
  });
  it('measures a bend', () => {
    const bent = move(box(), 0.2, [0, 0, 0]).map(([x, y, z]) => [x!, y!, z! + 0.5 * y! * y!]);
    const r = rigidResidual(box(), bent);
    expect(r).toBeGreaterThan(0.0005);
    expect(r).toBeLessThan(0.004);
  });
});

const mag = (over: Partial<RigidPart> = {}): RigidPart => ({
  id: 101, name: 'rifleMag0', bones: { chest: 1 }, role: 'hard', size: 'rifleMag', extentMm: [86, 178, 25.6],
  design: box(), world: move(box(), 1, [0, 0, 1]), depthIntoSuitMm: 0, seatGapMm: 22, mount: 'rifleMagSeat', ...over,
});
const seat: RigidPart = { id: 102, name: 'rifleMagSeat', bones: { chest: 1 }, role: 'mount', gapMm: 22 };

describe('rigidItemChecks', () => {
  const byName = (cs: ReturnType<typeof rigidItemChecks>) => Object.fromEntries(cs.map((c) => [c.name, c.pass]));
  it('passes a straight, true-size, seated magazine', () => {
    expect(Object.values(byName(rigidItemChecks([mag(), seat])))).toEqual([true, true, true, true, true, true]);
  });
  it('fails a bent part, a deep vertex, a missing mount, a floating rivet, a stub and a wrong bone', () => {
    const bent = move(box(), 0, [0, 0, 0]).map(([x, y, z]) => [x!, y!, z! + 0.6 * y! * y!]);
    const r = byName(rigidItemChecks([
      mag({ world: bent, depthIntoSuitMm: 0.8, mount: null, extentMm: [62, 75, 24] }),
      { id: 103, name: 'browRivetL', bones: { head: 1 }, role: 'hard', hostGapMm: 1.4 },
      { id: 104, name: 'knife', bones: { chest: 1 }, role: 'hard' },
    ]));
    expect(r).toEqual({ 'rigidKit:shape': false, 'rigidKit:depth': false, 'rigidKit:seat': false, 'rigidKit:hostGap': false, 'rigidKit:size': false, 'rigidKit:bones': false });
  });
  it('fails a magazine laid through a curved map (design = its map-space input) and passes it on a flat frame', () => {
    // a 178 x 64 x 24 mm magazine grid in map space (u across, v up, h out), as kit_common.cbox records it
    const design: number[][] = [];
    for (let u = -0.032; u <= 0.0321; u += 0.008) for (let v = -0.089; v <= 0.0891; v += 0.0178) for (const h of [0, 0.024]) design.push([u, v, h]);
    // the chest plate's face as a cylinder (radius 0.16 m about the vertical), like HField, and a rigid Flat
    const R = 0.16;
    const curved = design.map(([u, v, h]) => [(R + h!) * Math.sin(u! / R), v! + 1.1, (R + h!) * Math.cos(u! / R) - 0.3]);
    const flat = move(design, 0.3, [0.02, 1.1, -0.14]);
    expect(rigidResidual(design, curved) * 1000).toBeGreaterThan(1);
    const shape = (world: number[][]) => rigidItemChecks([mag({ design, world }), seat]).find((c) => c.name === 'rigidKit:shape')!;
    expect(shape(curved).pass).toBe(false);
    expect(shape(flat).pass).toBe(true);
  });
  it('fails a hard part built with no design record, and leaves an as-built plate unjudged', () => {
    const shape = (p: RigidPart) => rigidItemChecks([p]).find((c) => c.name === 'rigidKit:shape')!;
    expect(shape(mag({ design: undefined, world: undefined, builtVerts: 120 })).pass).toBe(false);
    const plate = shape({ id: 401, name: 'chestPlate', bones: { chest: 1 }, role: 'hard', shapeRef: 'asBuilt', design: box(), world: box().map(([x, y, z]) => [x!, y!, z! + 9 * y! * y!]) });
    expect(plate.pass).toBe(true);
    expect(plate.value).toEqual({ parts: 0, worstMm: 0, asBuilt: 1 });
  });
  it('knows the D28 rule', () => {
    expect(ruleBones('rib2')).toEqual({ chest: 0.5, spine: 0.5 });
    expect(ruleBones('canister2')).toEqual({ hipL: 1 });
    expect(ruleBones('holsterPlatform')).toEqual({ hipR: 1 });
    expect(ruleBones('dronePodSeat')).toEqual({ pelvis: 1 });
    expect(ruleBones('mystery')).toBeUndefined();
  });
  it('places the sling socket at about 8 o clock', () => {
    expect(slingClockCheck(8.1).pass).toBe(true);
    expect(slingClockCheck(9).pass).toBe(false);
    expect(slingClockCheck(undefined).pass).toBe(false);
  });
});

/** A one-primitive skinned GLB: 3 vertices with _RIGID ids, JOINTS_0 (u8) and WEIGHTS_0 (float). */
function glb(ids: number[], joints: number[][], weights: number[][]): Uint8Array {
  const n = ids.length;
  const bin = new ArrayBuffer(n * 4 + n * 4 + n * 16);
  const dv = new DataView(bin);
  ids.forEach((v, i) => dv.setFloat32(i * 4, v, true));
  joints.forEach((j, i) => j.forEach((v, k) => dv.setUint8(n * 4 + i * 4 + k, v)));
  weights.forEach((w, i) => w.forEach((v, k) => dv.setFloat32(n * 8 + i * 16 + k * 4, v, true)));
  const json = {
    asset: { version: '2.0' },
    buffers: [{ byteLength: bin.byteLength }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: n * 4 }, { buffer: 0, byteOffset: n * 4, byteLength: n * 4 }, { buffer: 0, byteOffset: n * 8, byteLength: n * 16 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: n, type: 'SCALAR' }, { bufferView: 1, componentType: 5121, count: n, type: 'VEC4' }, { bufferView: 2, componentType: 5126, count: n, type: 'VEC4' }],
    meshes: [{ primitives: [{ attributes: { _RIGID: 0, JOINTS_0: 1, WEIGHTS_0: 2 } }] }],
    nodes: [{ name: 'body', mesh: 0, skin: 0 }, { name: 'chest' }, { name: 'spine' }],
    skins: [{ joints: [1, 2] }],
  };
  let js = JSON.stringify(json);
  while (js.length % 4) js += ' ';
  const jb = new TextEncoder().encode(js);
  const total = 12 + 8 + jb.length + 8 + bin.byteLength;
  const out = new Uint8Array(total);
  const o = new DataView(out.buffer);
  o.setUint32(0, 0x46546c67, true);
  o.setUint32(4, 2, true);
  o.setUint32(8, total, true);
  o.setUint32(12, jb.length, true);
  o.setUint32(16, 0x4e4f534a, true);
  out.set(jb, 20);
  o.setUint32(20 + jb.length, bin.byteLength, true);
  o.setUint32(24 + jb.length, 0x004e4942, true);
  out.set(new Uint8Array(bin), 28 + jb.length);
  return out;
}

describe('glbRigidSkin / rigidSkinCheck', () => {
  const table = { '403': { name: 'rib2', bones: { chest: 0.5, spine: 0.5 } }, '101': { name: 'rifleMag0', bones: { chest: 1 } } };
  it('passes one weight vector on the declared bones', () => {
    const s = glbRigidSkin(glb([403, 403, 101], [[0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0]], [[0.5, 0.5, 0, 0], [0.5, 0.5, 0, 0], [1, 0, 0, 0]]));
    expect(s['403']).toEqual({ verts: 2, spread: 0, bones: ['chest', 'spine'], weights: { chest: 0.5, spine: 0.5 } });
    expect(rigidSkinCheck('lod0', s, table).pass).toBe(true);
  });
  it('fails rib 2 skinned to the chest alone (weights, not just the bone set)', () => {
    const s = glbRigidSkin(glb([403, 403, 101], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]]));
    expect(s['403']!.weights).toEqual({ chest: 1 });
    const c = rigidSkinCheck('lod0', s, table);
    expect(c.pass).toBe(false);
    expect(c.detail).toContain('rib2 weights');
  });
  it('fails a hard part missing from a file unless A82 names it for that LOD', () => {
    const t = { ...table, '301': { name: 'legBandBuckleL0', bones: { hipL: 1 }, role: 'hard' }, '209': { name: 'slingSocket', bones: { pelvis: 1 }, role: 'hard' }, '102': { name: 'rifleMagSeat', bones: { chest: 1 }, role: 'mount' } };
    const s = glbRigidSkin(glb([403, 403, 101], [[0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0]], [[0.5, 0.5, 0, 0], [0.5, 0.5, 0, 0], [1, 0, 0, 0]]));
    const lod1 = rigidSkinCheck('lod1', s, t, ['legBandBuckleL0']);
    expect(lod1.pass).toBe(false);
    expect(lod1.detail).toContain('slingSocket: hard part missing');
    expect(lod1.detail).not.toContain('legBandBuckleL0');
    expect(LOD_ABSORBED.lod2).toContain('slingSocket');
    expect(rigidSkinCheck('lod2', s, t, LOD_ABSORBED.lod2).detail).toContain('legBandBuckleL0: hard part missing');
    expect(rigidSkinCheck('lod1', s, t, ['legBandBuckleL0', 'slingSocket']).pass).toBe(true);
    expect(rigidSkinCheck('hero', s, t, []).detail).toContain('legBandBuckleL0: hard part missing');
  });
  it('holds a named absence to A82 measured: under 50 mm, the shell in its place on the declared bones', () => {
    const t = { '208': { name: 'slingSocket', bones: { pelvis: 1 }, role: 'hard' }, '101': { name: 'rifleMag0', bones: { chest: 1 } } };
    const s = glbRigidSkin(glb([101, 101, 0], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]]));
    // hero: the socket 30 mm across at the origin; LOD: two shell vertices 5 mm off it, one 40 mm away
    const hero = { pos: [[0, 0, 0], [0.03, 0, 0]], rid: [208, 208], w: [{ pelvis: 1 }, { pelvis: 1 }] };
    const lod = (w: Record<string, number>) => ({ pos: [[0.005, 0, 0], [0.03, 0.005, 0], [0.07, 0, 0]], rid: [0, 0, 0], w: [w, w, { hipL: 1 }] });
    const ok = absorbedMeasure(hero, lod({ pelvis: 0.85, hipL: 0.15 }), 208, { pelvis: 1 });
    expect(ok).toEqual({ diagMm: 30, near: 2, declaredShare: 0.85, weights: { pelvis: 0.85, hipL: 0.15 } });
    expect(rigidSkinCheck('lod2', s, t, ['slingSocket'], { slingSocket: ok }).pass).toBe(true);
    const thigh = absorbedMeasure(hero, lod({ pelvis: 0.5, hipL: 0.5 }), 208, { pelvis: 1 });
    expect(rigidSkinCheck('lod2', s, t, ['slingSocket'], { slingSocket: thigh }).detail).toContain('on its declared bones');
    const big = absorbedMeasure({ ...hero, pos: [[0, 0, 0], [0.06, 0, 0]] }, lod({ pelvis: 1 }), 208, { pelvis: 1 });
    expect(rigidSkinCheck('lod2', s, t, ['slingSocket'], { slingSocket: big }).detail).toContain('under 50 mm only');
    expect(rigidSkinCheck('lod2', s, t, ['slingSocket'], {}).detail).toContain('not measured');
    const none = absorbedMeasure(hero, { pos: [[0.2, 0, 0]], rid: [0], w: [{ hipL: 1 }] }, 208, { pelvis: 1 });
    expect(none.near).toBe(0);
    expect(rigidSkinCheck('lod2', s, t, ['slingSocket'], { slingSocket: none }).pass).toBe(true);
  });
  it('fails a part blended across bones, and a bone not declared', () => {
    const s = glbRigidSkin(glb([101, 101, 0], [[0, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], [[0.9, 0.1, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]]));
    expect(s['101']!.spread).toBeCloseTo(0.1, 5);
    const c = rigidSkinCheck('hero', s, table);
    expect(c.pass).toBe(false);
    expect(c.detail).toContain('rifleMag0');
  });
});
