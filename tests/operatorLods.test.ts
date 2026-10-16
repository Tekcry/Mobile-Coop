import { describe, expect, it } from 'vitest';
import { parseGlb } from '../src/operators/lab/glb';
import { BACKFACE_VIEWS, glbJson, LOD_ANCHORS, lodChecks, lodReportChecks, type BackFaceView, type GltfJson } from '../src/operators/lodChecks';

/** A GLB holding `json` and one binary chunk (the exporter's layout: 4-byte aligned chunks). */
function glb(json: object, bin: Uint8Array): Uint8Array {
  const pad = (n: number): number => (n + 3) & ~3;
  const raw = new TextEncoder().encode(JSON.stringify(json));
  const jl = pad(raw.length);
  const bl = pad(bin.length);
  const out = new Uint8Array(28 + jl + bl);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true);
  dv.setUint32(4, 2, true);
  dv.setUint32(8, out.length, true);
  dv.setUint32(12, jl, true);
  dv.setUint32(16, 0x4e4f534a, true);
  out.fill(0x20, 20, 20 + jl);
  out.set(raw, 20);
  dv.setUint32(20 + jl, bl, true);
  dv.setUint32(24 + jl, 0x004e4942, true);
  out.set(bin, 28 + jl);
  return out;
}

/** A skinned LOD: root > pelvis > chest, pelvis > hipR, anchors on their joints, optional finger bone. */
function lodJson(opts: { drop?: string; finger?: boolean; holsterOn?: number } = {}): GltfJson {
  const nodes: GltfJson['nodes'] = [
    { name: 'root', children: [1] }, { name: 'pelvis', children: [2, 3] }, { name: 'chest', children: [] }, { name: 'hipR', children: [] },
    { name: 'mesh', mesh: 0 },
  ];
  const at: Record<string, number> = { 'weaponMount.backL': 2, 'weaponMount.backC': 2, 'weaponMount.backR': 2, pistolHolster: opts.holsterOn ?? 3, slingSocket: 1 };
  for (const a of LOD_ANCHORS) {
    if (a === opts.drop) continue;
    nodes.push({ name: a });
    nodes[at[a]!]!.children!.push(nodes.length - 1);
  }
  const joints = [0, 1, 2, 3];
  if (opts.finger) {
    nodes.push({ name: 'fingerL_1_1' });
    joints.push(nodes.length - 1);
  }
  return { nodes, skins: [{ joints }], meshes: [{ primitives: [{}, {}, {}] }], materials: [{}, {}, {}] };
}

describe('LOD export checks (step 10)', () => {
  it('passes a LOD whose anchors ride their joints', () => {
    const c = lodChecks('lod0', lodJson(), 40_000);
    expect(c.filter((x) => !x.pass)).toEqual([]);
  });
  it('fails a missing anchor and an anchor on the wrong joint', () => {
    expect(lodChecks('lod0', lodJson({ drop: 'slingSocket' }), 40_000).find((x) => x.name === 'anchors')!.value).toEqual(['slingSocket: missing']);
    const wrong = lodChecks('lod0', lodJson({ holsterOn: 2 }), 40_000).find((x) => x.name === 'anchors')!;
    expect(wrong.pass).toBe(false);
    expect(wrong.value).toEqual(['pistolHolster: on chest, not hipR']);
  });
  it('keeps hero finger bones out of the game LODs', () => {
    expect(lodChecks('lod1', lodJson({ finger: true }), 13_000).find((x) => x.name === 'gameJoints')!.pass).toBe(false);
    expect(lodChecks('hero', lodJson({ finger: true }), 200_000).find((x) => x.name === 'gameJoints')!.pass).toBe(true);
  });
  it('flags SPEC 6.4 overruns without failing them', () => {
    const t = lodChecks('lod2', lodJson(), 9_000).find((x) => x.name === 'triangles')!;
    expect(t).toMatchObject({ pass: false, flag: true, value: 9_000 });
  });
  it('fails a normal-mapped primitive without tangents', () => {
    const j = lodJson();
    j.materials = [{ name: 'wren-lod1-cloth', normalTexture: { index: 0 } }, { name: 'wren-lod1-glow' }];
    j.meshes = [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, material: 0 }, { attributes: { POSITION: 2 }, material: 1 }] }];
    const t = lodChecks('lod1', j, 13_000).find((x) => x.name === 'tangents')!;
    expect(t).toMatchObject({ pass: false, value: ['mesh 0 wren-lod1-cloth'] });
    j.meshes[0]!.primitives[0]!.attributes!.TANGENT = 3;
    expect(lodChecks('lod1', j, 13_000).find((x) => x.name === 'tangents')!.pass).toBe(true);
  });
  it('reads the goggle glow as the extra draw below LOD0 (A75)', () => {
    const j = lodJson();
    j.meshes = [{ primitives: [{}, {}, {}] }];
    expect(lodChecks('lod1', j, 13_000).find((x) => x.name === 'draws')).toMatchObject({ pass: true, limit: 'SPEC 6.4 <= 2 + glow (A75)' });
    j.meshes = [{ primitives: [{}, {}, {}, {}] }];
    expect(lodChecks('lod1', j, 13_000).find((x) => x.name === 'draws')).toMatchObject({ pass: false, flag: true });
  });
  it('fails visible back faces over the hero + 0.2 % and open edges over 1.5x the hero', () => {
    const views = (px: number): Record<string, BackFaceView> => Object.fromEntries(BACKFACE_VIEWS.map((v) => [v, { px, figurePx: 100_000 }]));
    const hero = { openEdgeM: 35 };
    const ok = lodReportChecks('lod2', { openEdgeM: 40 }, hero, { hero: views(50), lod2: views(250) });
    expect(ok.every((c) => c.pass && !c.flag)).toBe(true);
    const bad = lodReportChecks('lod2', { openEdgeM: 91 }, hero, { hero: views(50), lod2: views(251) });
    expect(bad.find((c) => c.name === 'backFaces')!.pass).toBe(false);
    expect(bad.find((c) => c.name === 'openEdges')).toMatchObject({ pass: false, value: 91 });
    expect(lodReportChecks('lod1', { openEdgeM: 10 }, hero).find((c) => c.name === 'backFaces')!.pass).toBe(false);
    expect(lodReportChecks('hero', hero, hero)).toEqual([]);
  });
  it('reads the JSON chunk of a GLB', () => {
    expect(glbJson(glb({ asset: { version: '2.0' }, nodes: [{ name: 'x' }] }, new Uint8Array(4))).nodes[0]!.name).toBe('x');
    expect(() => glbJson(new Uint8Array(32))).toThrow('not a GLB');
  });
});

describe('glb reader: baked maps (step 10)', () => {
  // three images back to back in the binary chunk, the base colour one through EXT_texture_webp
  const bin = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const json = {
    asset: { version: '2.0' }, nodes: [], meshes: [], accessors: [],
    bufferViews: [{ byteOffset: 0, byteLength: 4 }, { byteOffset: 4, byteLength: 4 }, { byteOffset: 8, byteLength: 4 }],
    images: [{ bufferView: 0, mimeType: 'image/webp' }, { bufferView: 1, mimeType: 'image/png' }, { bufferView: 2, mimeType: 'image/png' }],
    textures: [{ extensions: { EXT_texture_webp: { source: 0 } } }, { source: 1 }, { source: 2 }],
    materials: [
      { name: 'wren-lod0-cloth', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicRoughnessTexture: { index: 1 } }, normalTexture: { index: 2 } },
      { name: 'wren-lod0-glow', pbrMetallicRoughness: { baseColorFactor: [0.02, 0.02, 0.02, 1] }, emissiveFactor: [0.3, 0.85, 0.16] },
    ],
  };
  const m = parseGlb(glb(json, bin).slice().buffer);
  it('reads the embedded base colour, packed ORM and normal images', () => {
    const c = m.materials[0]!;
    expect(c.baseTex?.mime).toBe('image/webp');
    expect([...c.baseTex!.data]).toEqual([1, 2, 3, 4]);
    expect([...c.ormTex!.data]).toEqual([5, 6, 7, 8]);
    expect([...c.normalTex!.data]).toEqual([9, 10, 11, 12]);
    expect(c.base).toEqual([0.8, 0.8, 0.8]);
  });
  it('reads the glow factors and leaves untextured materials without maps', () => {
    const g = m.materials[1]!;
    expect(g.emissive).toEqual([0.3, 0.85, 0.16]);
    expect(g.baseTex).toBeUndefined();
    expect(g.normalTex).toBeUndefined();
  });
});
