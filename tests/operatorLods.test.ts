import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { parseGlb } from '../src/operators/lab/glb';
// @ts-expect-error plain .mjs build script without types
import { mipBytes, repackGlb } from '../scripts/operators/ktx2.mjs';
import { BACKFACE_VIEWS, glbJson, ktx2Check, LOD_ANCHORS, lodChecks, lodReportChecks, type BackFaceView, type GltfJson } from '../src/operators/lodChecks';

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

/** A skinned LOD: root > pelvis > chest, pelvis > hipR, anchors on their joints, optional finger / per-toe bone. */
function lodJson(opts: { drop?: string; finger?: boolean; toes?: boolean; holsterOn?: number } = {}): GltfJson {
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
  if (opts.toes) {
    nodes.push({ name: 'toesL_1' });
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
  it('keeps the per-toe bones on the hero and the finger bones on hero, LOD0 and LOD1 (anim-skeleton S1)', () => {
    const gj = (lod: string, o: Parameters<typeof lodJson>[0]) => lodChecks(lod, lodJson(o), 13_000).find((x) => x.name === 'gameJoints')!.pass;
    expect(gj('lod0', { finger: true })).toBe(true);
    expect(gj('lod1', { finger: true })).toBe(true);
    expect(gj('lod2', { finger: true })).toBe(false);
    expect(gj('lod1', { toes: true })).toBe(false);
    expect(gj('hero', { finger: true, toes: true })).toBe(true);
  });
  it('flags a skin with more joints than its LOD budget (anim-skeleton S1: 67 / 57 / 57 / 27)', () => {
    const j = lodJson();
    for (let i = 0; i < 24; i++) { j.nodes.push({ name: `x${i}` }); j.skins![0]!.joints.push(j.nodes.length - 1); }
    expect(lodChecks('lod2', j, 5_000).find((x) => x.name === 'bones')).toMatchObject({ pass: false, flag: true, value: 28 });
    expect(lodChecks('lod1', j, 13_000).find((x) => x.name === 'bones')!.pass).toBe(true);
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
  it('fails a LOD whose textures are not KTX2 through KHR_texture_basisu (step 11, D26)', () => {
    const webp = (): GltfJson => ({
      ...lodJson(), images: [{ name: 'a', mimeType: 'image/webp' }, { name: 'b', mimeType: 'image/png' }],
      textures: [{ extensions: { EXT_texture_webp: { source: 0 } } }, { source: 1 }], extensionsUsed: ['EXT_texture_webp'], extensionsRequired: ['EXT_texture_webp'],
    });
    const bad = ktx2Check(webp());
    expect(bad.pass).toBe(false);
    expect(bad.value).toEqual(expect.arrayContaining(['image a: image/webp', 'image b: image/png', 'texture 1: plain source 1', 'texture 0: EXT_texture_webp', 'KHR_texture_basisu not in extensionsRequired']));
    expect(lodChecks('lod0', webp(), 40_000).find((x) => x.name === 'ktx2')!.pass).toBe(false);
    const ok: GltfJson = { ...lodJson(), images: [{ name: 'a', mimeType: 'image/ktx2' }], textures: [{ extensions: { KHR_texture_basisu: { source: 0 } } }], extensionsUsed: ['KHR_texture_basisu'], extensionsRequired: ['KHR_texture_basisu'] };
    expect(ktx2Check(ok).pass).toBe(true);
    expect(ktx2Check({ ...ok, extensionsRequired: [] }).pass).toBe(false);
  });
  it('repacks a WebP GLB to KTX2 images the check and the Lab reader accept', () => {
    const json = {
      asset: { version: '2.0' }, nodes: [], meshes: [], accessors: [], buffers: [{ byteLength: 12 }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 8 }, { buffer: 0, byteOffset: 8, byteLength: 4 }],
      images: [{ name: 'wren-lod0-kit-albedo', mimeType: 'image/webp', bufferView: 1 }],
      textures: [{ sampler: 0, extensions: { EXT_texture_webp: { source: 0 } } }], extensionsUsed: ['EXT_texture_webp'], extensionsRequired: ['EXT_texture_webp'],
      materials: [{ name: 'kit', pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
    };
    const ktx = new Uint8Array([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 1, 2, 3]);
    const out = repackGlb(Buffer.from(glb(json, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9, 9]))), (n: string) => (n === 'wren-lod0-kit-albedo' ? ktx : undefined)) as Uint8Array;
    const j = glbJson(out);
    expect(ktx2Check(j)).toMatchObject({ pass: true, value: [] });
    const m = parseGlb(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer);
    expect(m.materials[0]!.baseTex!.mime).toBe('image/ktx2');
    expect([...m.materials[0]!.baseTex!.data]).toEqual([...ktx]);
    expect(mipBytes(4, 4)).toEqual({ block: 16 * 3, rgba: 64 + 16 + 4 });
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

describe('Lab KTX2 transcoder files (step 11, D27)', () => {
  it('bundles every transcoder from the installed @babylonjs/ktx2decoder, matching @babylonjs/core, never a URL', () => {
    const src = readFileSync('src/operators/lab/ktx2.ts', 'utf8');
    const files = [...src.matchAll(/from '@babylonjs\/ktx2decoder\/(wasm\/[^?']+)\?url'/g)].map((x) => x[1]!);
    expect(files.length).toBe(9);
    for (const f of files) expect(existsSync(`node_modules/@babylonjs/ktx2decoder/${f}`)).toBe(true);
    expect(src).not.toMatch(/https?:\/\//);
    const ver = (p: string) => (JSON.parse(readFileSync(`node_modules/${p}/package.json`, 'utf8')) as { version: string }).version;
    expect(ver('@babylonjs/ktx2decoder')).toBe(ver('@babylonjs/core'));
  });
});
