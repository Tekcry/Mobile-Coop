import { describe, expect, it } from 'vitest';
import { bindWorld, parseGlb, qmul, rotate, type GlbNode, type Quat, type V3 } from '../src/operators/lab/glb';
import { arc, buildRetarget, poseSkeleton } from '../src/operators/lab/retarget';
import { CLOSEUPS, COLOUR_BLIND, LIGHT_RIGS, POSES, PRESETS, TURNAROUND, calloutsFor, ktx2RemoteUrls, simulate } from '../src/operators/lab/labData';
import { KITS } from '../src/operators/kit';

/** A one-triangle skinned GLB written the way Blender's exporter writes it (right-handed, +Z forward). */
function tinyGlb(): ArrayBuffer {
  const pos = new Float32Array([1, 0, 2, 0, 1, 2, 0, 0, 3]);
  const nor = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  const uv = new Float32Array([0, 0, 1, 0, 0, 1]);
  const jn = new Uint8Array([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]);
  const wt = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
  const idx = new Uint16Array([0, 1, 2]);
  const parts = [pos, nor, uv, jn, wt, idx].map((a) => new Uint8Array(a.buffer));
  const pad = (n: number): number => (n + 3) & ~3;
  let off = 0;
  const views = parts.map((p) => {
    const v = { buffer: 0, byteOffset: off, byteLength: p.length };
    off += pad(p.length);
    return v;
  });
  const bin = new Uint8Array(off);
  parts.forEach((p, i) => bin.set(p, views[i]!.byteOffset));
  const json = {
    asset: { version: '2.0' },
    nodes: [{ name: 'rig', children: [1] }, { name: 'a', children: [2], translation: [-0.5, 1, 0] }, { name: 'b', translation: [0, 1, 0], rotation: [0.1, 0.2, 0.3, 0.927] }, { name: 'm', skin: 0, mesh: 0 }],
    skins: [{ joints: [2, 1] }],
    materials: [{ name: 'knit', pbrMetallicRoughness: { baseColorFactor: [0.03, 0.03, 0.03, 1], roughnessFactor: 0.9, metallicFactor: 0 } }],
    meshes: [{ name: 'tri', primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, JOINTS_0: 3, WEIGHTS_0: 4 }, indices: 5, material: 0 }] }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: 3, type: 'VEC2' },
      { bufferView: 3, componentType: 5121, count: 3, type: 'VEC4' },
      { bufferView: 4, componentType: 5126, count: 3, type: 'VEC4' },
      { bufferView: 5, componentType: 5123, count: 3, type: 'SCALAR' },
    ],
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

describe('glb reader', () => {
  const m = parseGlb(tinyGlb());
  it('converts glTF (right-handed, +Z forward) to the game frame', () => {
    expect([...m.meshes[0]!.positions]).toEqual([-1, 0, 2, -0, 1, 2, -0, 0, 3]);
    expect(m.nodes[1]!.t).toEqual([0.5, 1, 0]);
    expect(m.nodes[2]!.r[1]).toBeCloseTo(-0.2);
  });
  it('keeps the glTF index order: the x mirror already makes the front faces clockwise, as Babylon draws them (A80)', () => {
    expect([...m.meshes[0]!.indices]).toEqual([0, 1, 2]);
  });
  it('reads skin order, joints, weights and material factors', () => {
    expect(m.joints).toEqual([2, 1]);
    expect([...m.meshes[0]!.joints.slice(0, 8)]).toEqual([0, 0, 0, 0, 1, 0, 0, 0]);
    expect(m.materials[0]).toMatchObject({ name: 'knit', roughness: 0.9, metallic: 0 });
  });
  it('rejects a file that is not a GLB', () => {
    expect(() => parseGlb(new ArrayBuffer(32))).toThrow('not a GLB');
  });
  it('composes world bind transforms down the tree', () => {
    const w = bindWorld(m.nodes);
    expect(w.pos[1]).toEqual([0.5, 1, 0]);
    expect(w.pos[2]![1]).toBeCloseTo(2);
  });
});

describe('retarget', () => {
  const ID: Quat = [0, 0, 0, 1];
  // a root, a pelvis, and a left arm bound out at 45 degrees (the A-pose)
  const nodes: GlbNode[] = [
    { name: 'root', parent: -1, t: [0, 0, 0], r: ID },
    { name: 'pelvis', parent: 0, t: [0, 1, 0], r: ID },
    { name: 'shL', parent: 1, t: [-0.2, 0.5, 0], r: ID },
    { name: 'elL', parent: 2, t: [-0.2, -0.2, 0], r: ID },
    { name: 'fingerL_1_1', parent: 3, t: [-0.05, -0.05, 0], r: ID },
  ];
  const w = bindWorld(nodes);
  const rt = buildRetarget(nodes, w.pos, [0, 1, 2, 3, 4]);
  const none = (): null => null;

  it('arc turns one direction onto another', () => {
    const q = arc([1, 0, 0], [0, 1, 0]);
    const v = rotate(q, [1, 0, 0]);
    expect(v[1]).toBeCloseTo(1);
    expect(Math.abs(v[0])).toBeLessThan(1e-9);
  });

  it('swings the A-pose arm down to hang when the rig is at rest', () => {
    const p: V3[] = [];
    const r: Quat[] = [];
    poseSkeleton(nodes, w.pos, w.rot, rt, () => ({ rot: ID, move: [0, 0, 0] }), p, r);
    // the elbow hangs straight below the shoulder, the upper arm length kept
    expect(p[3]![0]).toBeCloseTo(p[2]![0], 6);
    expect(p[2]![1] - p[3]![1]).toBeCloseTo(Math.hypot(0.2, 0.2), 6);
    // the fingers follow the arm
    expect(p[4]![0]).toBeCloseTo(p[3]![0] - 0.0, 1);
  });

  it('leaves the bind pose alone with no rig driving it and no arm correction', () => {
    const flat = buildRetarget(nodes.slice(0, 2), w.pos, [0, 1]);
    const p: V3[] = [];
    const r: Quat[] = [];
    poseSkeleton(nodes.slice(0, 2), w.pos, w.rot, flat, none, p, r);
    expect(p[1]).toEqual(w.pos[1]);
  });

  it('moves root, body and pelvis with the rig and turns children with a rotated parent', () => {
    const half = Math.SQRT1_2;
    const p: V3[] = [];
    const r: Quat[] = [];
    poseSkeleton(nodes, w.pos, w.rot, rt, (n) => (n === 'pelvis' ? { rot: [0, half, 0, half], move: [0, -0.3, 0] } : { rot: ID, move: [0, 0, 0] }), p, r);
    expect(p[1]![1]).toBeCloseTo(0.7, 6);
    // the pelvis turned 90 degrees about Y: the shoulder offset (-0.2, 0.5, 0) lands on +Z
    expect(p[2]![2]).toBeCloseTo(0.2, 5);
    expect(qmul(r[1]!, ID)[1]).toBeCloseTo(half, 6);
  });
});

describe('lab data', () => {
  it('lighting rigs, presets and poses have unique ids and the BRIEF lists', () => {
    // the BRIEF's six rigs, plus step 11's calibrated close-up rigs and the rim silhouette (A78) (and the whole-figure rig, fix round 1)
    expect(LIGHT_RIGS.map((r) => r.id)).toEqual(['studio', 'raking', 'detail', 'detailRear', 'detailFront', 'figure', 'rim', 'menu', 'hollowmere', 'dark', 'nightvision']);
    expect(PRESETS.map((p) => p.id)).toEqual(['low', 'high', 'epic']);
    expect(POSES.map((p) => p.id)).toEqual(['apose', 'idle', 'crouch', 'sneak', 'aimPistol', 'aimRifle', 'climbReach']);
    expect(TURNAROUND).toHaveLength(5);
  });
  it('darkness has no lights except the goggle glow', () => {
    const d = LIGHT_RIGS.find((r) => r.id === 'dark')!;
    expect(d.lights).toHaveLength(0);
    expect(d.glow).toBe(true);
  });
  it('close-ups sit between 0.3 and 1 m', () => {
    for (const c of CLOSEUPS) if (c.rig) expect(LIGHT_RIGS.some((r) => r.id === c.rig)).toBe(true);
    for (const c of CLOSEUPS) expect(c.distance).toBeGreaterThanOrEqual(0.3);
    for (const c of CLOSEUPS) expect(c.distance).toBeLessThanOrEqual(1);
  });
  it('colour-blind matrices keep neutral grey neutral and turn the green glow towards yellow', () => {
    expect(simulate('normal', [0.3, 0.6, 0.2])).toEqual([0.3, 0.6, 0.2]);
    for (const k of Object.keys(COLOUR_BLIND)) {
      const g = simulate(k, [0.5, 0.5, 0.5]);
      expect(Math.abs(g[0] - g[1])).toBeLessThan(0.02);
    }
    const d = simulate('deuteranopia', [0.35, 1, 0.19]);
    expect(d[0]).toBeGreaterThan(0.35);
  });
  it('callouts list only built kit items in the close-up zone', () => {
    const built = new Set(['suit', 'harnessShoulders']);
    const shoulder = CLOSEUPS.find((c) => c.id === 'shoulder')!;
    const ids = calloutsFor(KITS.wren.items, built, shoulder).map((i) => i.id);
    expect(ids).toContain('harnessShoulders');
    expect(calloutsFor(KITS.wren.items, built, CLOSEUPS.find((c) => c.id === 'boots')!)).toHaveLength(0);
  });
  it('callouts name only what each frame shows (fix round 3, item 2)', () => {
    const all = new Set(KITS.wren.items.map((i) => i.id));
    const ids = (id: string) => calloutsFor(KITS.wren.items, all, CLOSEUPS.find((c) => c.id === id)!).map((i) => i.id);
    // the earpiece is in the ear under the hood: never called out; its cable is
    for (const c of CLOSEUPS) expect(ids(c.id)).not.toContain('earpiece');
    expect(ids('collar')).toContain('earpieceCable');
    expect(ids('head')).not.toContain('batteryPack');
    expect(ids('neckRear')).toEqual(expect.arrayContaining(['batteryPack', 'goggleBand', 'goggleCable']));
    expect(ids('neckRear')).not.toContain('earpieceCable');
    expect(ids('collar')).not.toContain('headHarness');
    expect(ids('chestFront')).not.toContain('ptt');
    // a kit item from another zone that is in frame (the belt closure) is called out through `include`
    expect(ids('beltFront')).toEqual(expect.arrayContaining(['magBuckle', 'waistBelt', 'pistolMagPouch']));
    expect(ids('beltFront')).not.toContain('slingSocket');
    // the sling socket's own view (DESIGN.md loadout table): the left hip from the side (step 11b, D28: the 9 o'clock
    // pistol magazines, the socket behind them, the pod; the belt and the cam pouch at the front edge called out too)
    expect(ids('hipL').sort()).toEqual(['camMinePouch', 'pistolMagPouch', 'slingSocket', 'waistBelt']);
    // every identifiable item in frame is called out (11-fixes-r4 item 1), one assertion per changed close-up
    expect(ids('collar')).toContain('harnessShoulders');
    expect(ids('chestFront')).toEqual(expect.arrayContaining(['harnessShoulders', 'magBuckle', 'torsoSideStraps', 'magPouches']));
    expect(ids('ptt')).toContain('suitZip');
    expect(ids('beltFront')).toContain('ribSegments');
    expect(ids('thighL')).toEqual(expect.arrayContaining(['knife', 'throwableSleeves', 'sleevePanel']));
    expect(ids('thighR')).not.toContain('knife');
    expect(ids('buckle')).not.toContain('pistolMagPouch');
    expect(ids('buckle')).toEqual(expect.arrayContaining(['magBuckle', 'camMinePouch', 'medPouch', 'ribSegments']));
    expect(calloutsFor(KITS.wren.items, new Set(['suit']), CLOSEUPS.find((c) => c.id === 'beltFront')!)).toHaveLength(0);
  });
});

describe('operator lab, step 11 fix round 1', () => {
  it('the KTX2 decoder never keeps a CDN URL (D27, no runtime network)', () => {
    const o = 'http://127.0.0.1:4191';
    expect(ktx2RemoteUrls({ jsDecoderModule: 'https://cdn.babylonjs.com/babylon.ktx2Decoder.js', wasmZSTDDecoder: null }, o)).toEqual(['jsDecoderModule=https://cdn.babylonjs.com/babylon.ktx2Decoder.js']);
    expect(ktx2RemoteUrls({ a: '//cdn.babylonjs.com/x.wasm' }, o)).toHaveLength(1);
    expect(ktx2RemoteUrls({ a: '/assets/uastc_bc7-abc.wasm', b: `${o}/assets/zstddec.wasm`, c: '', d: null }, o)).toEqual([]);
  });
  it('the rim rig has back rims only and no goggle spill; the calibrated rigs key from the front (A80)', () => {
    const rig = (id: string) => LIGHT_RIGS.find((r) => r.id === id)!;
    expect(rig('rim').lights.every((l) => l.kind === 'dir' && l.v[2] > 0)).toBe(true);
    expect(rig('rim').glowLight).toBe(false);
    for (const id of ['studio', 'detail', 'figure', 'menu']) expect(rig(id).lights[0]!.v[2]).toBeLessThan(0);
    expect(rig('detailRear').lights[0]!.v[2]).toBeGreaterThan(0);
    for (const id of ['detail', 'detailRear', 'detailFront', 'figure']) expect(rig(id).bloom).toBe(false);
  });
});
