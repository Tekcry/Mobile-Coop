import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import raw from '../scripts/operators/data/guards.json';
import { GUARD_LIMITS, type GuardKit } from '../src/operators/guards/guardKit';
import { checkGuardReport, GUARD_ATLAS, GUARD_ATTRIBUTES, GUARD_DRAWS, GUARD_INFLUENCES, pieceLod0Cap, type GuardBakeReport } from '../src/operators/guards/guardBudget';
import { ktx2Check, type GltfJson } from '../src/operators/lodChecks';
import { readAccessor, readGlb } from '../src/operators/rigidKit';

// guard-models G4b / G9: the bundled guard GLBs (copied in by the lead from bake/guard-models after the check passes)
// measured from the files themselves: triangles per LOD, bones, influences, `_PIECE` / `_TINT`, KTX2 only, texture sizes
// within PLAN section 5. Visible-per-kind and head triangles need the bake's piece table; they are checked from the
// bake report (guardBudget.ts), which is also checked here when it is bundled beside the GLBs.

const KIT = raw as unknown as GuardKit;
const DIR = 'src/operators/assets/guards';
const LODS = [0, 1, 2] as const;

interface Prim { attributes: Record<string, number>; indices?: number; mode?: number; material?: number }
interface Json {
  accessors: { count: number }[];
  meshes?: { primitives: Prim[] }[];
  nodes: { name?: string }[];
  skins?: { joints: number[] }[];
  images?: { bufferView?: number; mimeType?: string }[];
  bufferViews: { byteOffset?: number; byteLength: number }[];
  textures?: { extensions?: Record<string, { source?: number } | undefined> }[];
  materials?: {
    pbrMetallicRoughness?: { baseColorTexture?: { index: number }; metallicRoughnessTexture?: { index: number } };
    normalTexture?: { index: number };
    occlusionTexture?: { index: number };
  }[];
}

interface GlbStats {
  tris: number;
  draws: number;
  bones: string[];
  influences: number;
  /** Attribute names present on every primitive. */
  attributes: string[];
  ktx2: string[];
  /** role -> [w, h] of the KTX2 image the material uses for it. */
  textures: Record<string, [number, number]>;
}

const KTX2_ID = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];

/** Measures one guard GLB (pure; the file's bytes in). */
function glbStats(buf: Uint8Array): GlbStats {
  const g = readGlb(buf);
  const json = g.json as unknown as Json;
  const prims = (json.meshes ?? []).flatMap((m) => m.primitives);
  let tris = 0;
  let influences = 0;
  for (const p of prims) {
    if ((p.mode ?? 4) !== 4) throw new Error(`primitive mode ${p.mode}: triangles only`);
    tris += Math.floor((p.indices !== undefined ? json.accessors[p.indices]!.count : json.accessors[p.attributes.POSITION!]!.count) / 3);
    for (const set of ['WEIGHTS_0', 'WEIGHTS_1']) {
      const a = p.attributes[set];
      if (a === undefined) continue;
      const rows = readAccessor(g, a);
      for (const row of rows) influences = Math.max(influences, (set === 'WEIGHTS_1' ? 4 : 0) + row.filter((w) => w > 1e-6).length);
    }
  }
  const attributes = prims.length ? Object.keys(prims[0]!.attributes).filter((k) => prims.every((p) => k in p.attributes)) : [];
  const bones = (json.skins?.[0]?.joints ?? []).map((j) => json.nodes[j]?.name ?? '');
  const ktx2 = ktx2Check(json as unknown as GltfJson).value as string[];
  const size = (tex: number | undefined): [number, number] | undefined => {
    const src = tex === undefined ? undefined : json.textures?.[tex]?.extensions?.KHR_texture_basisu?.source;
    const bv = src === undefined ? undefined : json.bufferViews[json.images?.[src]?.bufferView ?? -1];
    if (!bv) return undefined;
    const at = bv.byteOffset ?? 0;
    const head = g.bin.subarray(at, at + 28);
    if (head.length < 28 || !KTX2_ID.every((b, i) => head[i] === b)) return undefined;
    const dv = new DataView(head.buffer, head.byteOffset, 28);
    return [dv.getUint32(20, true), dv.getUint32(24, true)];
  };
  const textures: Record<string, [number, number]> = {};
  for (const m of json.materials ?? []) {
    const roles: [string, number | undefined][] = [
      ['albedo', m.pbrMetallicRoughness?.baseColorTexture?.index],
      ['normal', m.normalTexture?.index],
      ['orm', m.pbrMetallicRoughness?.metallicRoughnessTexture?.index ?? m.occlusionTexture?.index],
    ];
    for (const [role, idx] of roles) {
      const s = size(idx);
      if (s) textures[role] = s;
    }
  }
  return { tris, draws: prims.length, bones, influences, attributes, ktx2, textures };
}

/** A GLB holding `json` and one binary chunk (4-byte aligned chunks). */
function glb(json: object, bin: Uint8Array): Uint8Array {
  const pad = (n: number): number => (n + 3) & ~3;
  const rawJson = new TextEncoder().encode(JSON.stringify(json));
  const jl = pad(rawJson.length);
  const bl = pad(bin.length);
  const out = new Uint8Array(28 + jl + bl);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true);
  dv.setUint32(4, 2, true);
  dv.setUint32(8, out.length, true);
  dv.setUint32(12, jl, true);
  dv.setUint32(16, 0x4e4f534a, true);
  out.fill(0x20, 20, 20 + jl);
  out.set(rawJson, 20);
  dv.setUint32(20 + jl, bl, true);
  dv.setUint32(24 + jl, 0x004e4942, true);
  out.set(bin, 28 + jl);
  return out;
}

describe('guard GLB reader (guard-models G4b)', () => {
  it('measures a synthetic skinned, KTX2-textured file', () => {
    // bin: 2 triangles of indices (6 x u16 = 12 B), 4 vertices of WEIGHTS_0 (4 x 4 x f32 = 64 B), a 28-byte KTX2 header
    const bin = new Uint8Array(12 + 64 + 28);
    const dv = new DataView(bin.buffer);
    [0, 1, 2, 0, 2, 3].forEach((v, i) => dv.setUint16(i * 2, v, true));
    [[1, 0, 0, 0], [0.5, 0.5, 0, 0], [0.4, 0.3, 0.3, 0], [0.25, 0.25, 0.25, 0.25]].forEach((w, r) => w.forEach((x, c) => dv.setFloat32(12 + (r * 4 + c) * 4, x, true)));
    bin.set(KTX2_ID, 76);
    dv.setUint32(76 + 20, 16, true);
    dv.setUint32(76 + 24, 8, true);
    const json = {
      asset: { version: '2.0' },
      extensionsUsed: ['KHR_texture_basisu'],
      extensionsRequired: ['KHR_texture_basisu'],
      nodes: [{ name: 'root', children: [1] }, { name: 'pelvis' }, { name: 'mesh', mesh: 0, skin: 0 }],
      skins: [{ joints: [0, 1] }],
      bufferViews: [{ byteOffset: 0, byteLength: 12 }, { byteOffset: 12, byteLength: 64 }, { byteOffset: 76, byteLength: 28 }],
      accessors: [
        { bufferView: 0, componentType: 5123, count: 6, type: 'SCALAR' },
        { bufferView: 1, componentType: 5126, count: 4, type: 'VEC4' },
        { componentType: 5126, count: 4, type: 'VEC3' },
        { componentType: 5121, count: 4, type: 'SCALAR' },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 2, WEIGHTS_0: 1, _PIECE: 3, _TINT: 3 }, indices: 0, material: 0 }] }],
      materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
      textures: [{ extensions: { KHR_texture_basisu: { source: 0 } } }],
      images: [{ bufferView: 2, mimeType: 'image/ktx2' }],
    };
    const s = glbStats(glb(json, bin));
    expect(s).toMatchObject({ tris: 2, draws: 1, bones: ['root', 'pelvis'], influences: 4, ktx2: [], textures: { albedo: [16, 8] } });
    expect(s.attributes).toEqual(expect.arrayContaining(['_PIECE', '_TINT']));
    // a PNG image fails KTX2 only
    const png = structuredClone(json) as typeof json & { images: { mimeType: string }[] };
    png.images[0]!.mimeType = 'image/png';
    expect(glbStats(glb(png, bin)).ktx2.length).toBeGreaterThan(0);
  });
});

const present = existsSync(DIR);
if (!present) {
  it.skip(`bundled guard GLBs: ${DIR}/ is absent (G4 has not baked yet); these checks run once the lead copies the GLBs in`, () => {});
} else {
  describe('bundled guard GLBs (guard-models G4b / G9)', () => {
    const bases = KIT.bases.map((b) => b.id);
    const pieces = KIT.pieces.filter((p) => p.ownGlb);
    const files = [...bases, ...pieces.map((p) => p.id)].flatMap((id) => LODS.map((l) => [id, l] as const));

    it.each(files)('%s LOD%i is within PLAN section 5', (id, l) => {
      const file = `${DIR}/guard-${id}-lod${l}.glb`;
      expect(existsSync(file), `${file} missing`).toBe(true);
      const s = glbStats(new Uint8Array(readFileSync(file)));
      const piece = pieces.find((p) => p.id === id);
      expect(s.ktx2, 'KTX2 only').toEqual([]);
      expect(s.draws).toBeLessThanOrEqual(GUARD_DRAWS);
      expect(s.influences).toBeLessThanOrEqual(GUARD_INFLUENCES[l]);
      if (piece) {
        const s5 = l === 0 ? pieceLod0Cap(piece) : null;
        expect(s.tris).toBeLessThanOrEqual(s5 === null ? piece.tris[l] : Math.min(piece.tris[l], s5));
        expect(s.bones.length).toBeGreaterThan(0);
        expect(s.bones.filter((b) => !piece.bones.includes(b))).toEqual([]);
        const a = [piece.texels[0] >> l, piece.texels[1] >> l];
        for (const [role, max] of [['albedo', a], ['normal', [a[0]! >> 1, a[1]! >> 1]], ['orm', [a[0]! >> 1, a[1]! >> 1]]] as const) {
          const t = s.textures[role];
          expect(t, `${role} texture`).toBeDefined();
          expect(t![0] <= max[0]! && t![1] <= max[1]!, `${role} ${t!.join(' x ')} over ${max.join(' x ')}`).toBe(true);
        }
      } else {
        expect(s.tris).toBeLessThanOrEqual(GUARD_LIMITS.buffer[l]);
        expect([...s.bones].sort()).toEqual((l === 0 ? [...KIT.bones.rig, ...KIT.bones.fingers] : [...KIT.bones.rig]).sort());
        expect(s.bones.length).toBe(GUARD_LIMITS.rigBones + (l === 0 ? GUARD_LIMITS.fingerBones : 0));
        for (const attr of GUARD_ATTRIBUTES) expect(s.attributes, `vertex attribute ${attr}`).toContain(attr);
        for (const role of ['albedo', 'normal', 'orm'] as const) {
          const t = s.textures[role];
          const max = GUARD_ATLAS[role][l]!;
          expect(t, `${role} texture`).toBeDefined();
          expect(t![0] <= max[0] && t![1] <= max[1], `${role} ${t!.join(' x ')} over ${max.join(' x ')}`).toBe(true);
        }
      }
      // the bake report, when bundled beside the GLBs: within budget, and its buffer count is the file's
      const reportFile = `${DIR}/guard-${id}.report.json`;
      if (existsSync(reportFile)) {
        const report = JSON.parse(readFileSync(reportFile, 'utf8')) as GuardBakeReport;
        expect(checkGuardReport(report, KIT)).toEqual([]);
        expect(report.lods.find((r) => r.lod === l)?.bufferTris).toBe(s.tris);
      }
    });
  });
}
