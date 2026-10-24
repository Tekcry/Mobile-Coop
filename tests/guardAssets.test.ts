/**
 * (guard-models G9) The bundled guard files against PLAN section 5: visible and buffer triangles per LOD, head triangles,
 * bone count, influences, KTX2-only textures and their sizes, one mesh / one material, the download total.
 *
 * The real checks read `src/operators/assets/guards/` (the bake's shippable files, the seam `guardAssets.ts` documents)
 * and SKIP CLEANLY while those files are absent: G4 (bake, LODs, export) lands them, until then Wren's files stand in
 * and there is nothing to measure. The reader itself (GLB chunks, accessors, the KTX2 header, the measured-kit helper)
 * is covered below on a synthetic file and runs always, so the first real file is not also the first run of the code.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import raw from '../scripts/operators/data/guards.json';
import { GUARD_BASES, GUARD_LIMITS, shownTris, type GuardKit } from '../src/operators/guards/guardKit';
import { validateGuardManifest, type GuardBase, type GuardManifest } from '../src/operators/guards/gearMask';
import { RIG_JOINTS } from '../src/operators/runtime/pose';
import { guardGlb } from './helpers/guardGlb';

const KIT = raw as unknown as GuardKit;
const DIR = fileURLToPath(new URL('../src/operators/assets/guards/', import.meta.url));

/** PLAN section 5 (the budgets the checks enforce). */
const BUDGET = {
  buffer: [45000, 14000, 5000],
  shown: [20000, 7000, 2800],
  bones: [33, 23, 23],
  influences: [4, 4, 2],
  /** Widths of the albedo and of the normal / ORM textures (height is half the width). */
  albedoW: [4096, 2048, 512],
  normalW: [2048, 1024, 256],
  downloadBytes: 75 * 1024 * 1024,
} as const;

// ---- a small GLB reader (no Babylon): enough for the budget checks ----

interface Gltf {
  nodes?: { name?: string; mesh?: number; skin?: number }[];
  meshes?: { primitives: { attributes: Record<string, number>; indices?: number; material?: number }[] }[];
  skins?: { joints: number[] }[];
  materials?: {
    pbrMetallicRoughness?: { baseColorTexture?: { index: number }; metallicRoughnessTexture?: { index: number } };
    normalTexture?: { index: number };
    occlusionTexture?: { index: number };
  }[];
  textures?: { source?: number; extensions?: Record<string, { source?: number }> }[];
  images?: { uri?: string; mimeType?: string; bufferView?: number }[];
  accessors?: { bufferView?: number; byteOffset?: number; componentType: number; count: number; type: string; normalized?: boolean }[];
  bufferViews?: { byteOffset?: number; byteLength: number; byteStride?: number }[];
  extensionsRequired?: string[];
  extensionsUsed?: string[];
}

interface Glb {
  gltf: Gltf;
  bin: Uint8Array;
  dir: string;
}

function parseGlbChunks(file: ArrayBuffer, dir = ''): Glb {
  const dv = new DataView(file);
  expect(dv.getUint32(0, true), 'glb magic').toBe(0x46546c67);
  let off = 12;
  let gltf: Gltf | null = null;
  let bin = new Uint8Array(0);
  while (off + 8 <= file.byteLength) {
    const len = dv.getUint32(off, true);
    const type = dv.getUint32(off + 4, true);
    const body = new Uint8Array(file, off + 8, len);
    if (type === 0x4e4f534a) gltf = JSON.parse(new TextDecoder().decode(body)) as Gltf;
    else if (type === 0x004e4942) bin = body;
    off += 8 + ((len + 3) & ~3);
  }
  if (!gltf) throw new Error('no JSON chunk');
  return { gltf, bin, dir };
}

const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

/** An accessor's values, flat (normalised integers to 0-1). */
function readAccessor(g: Glb, index: number): number[] {
  const a = g.gltf.accessors![index]!;
  const bv = g.gltf.bufferViews![a.bufferView!]!;
  const n = COMPONENTS[a.type]!;
  const size = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[a.componentType]!;
  const stride = bv.byteStride ?? n * size;
  const base = g.bin.byteOffset + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const dv = new DataView(g.bin.buffer);
  const div = a.normalized ? { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[a.componentType as 5120] ?? 1 : 1;
  const out: number[] = [];
  for (let i = 0; i < a.count; i++) {
    for (let c = 0; c < n; c++) {
      const p = base + i * stride + c * size;
      let v: number;
      switch (a.componentType) {
        case 5120: v = dv.getInt8(p); break;
        case 5121: v = dv.getUint8(p); break;
        case 5122: v = dv.getInt16(p, true); break;
        case 5123: v = dv.getUint16(p, true); break;
        case 5125: v = dv.getUint32(p, true); break;
        default: v = dv.getFloat32(p, true);
      }
      out.push(v / div);
    }
  }
  return out;
}

/** The KTX2 header fields the budgets need (https://registry.khronos.org/KTX/specs/2.0). */
export function ktx2Header(bytes: Uint8Array): { width: number; height: number; levels: number } {
  const magic = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
  magic.forEach((b, i) => expect(bytes[i], `KTX2 identifier byte ${i}`).toBe(b));
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: dv.getUint32(20, true), height: dv.getUint32(24, true), levels: dv.getUint32(40, true) };
}

interface TexInfo {
  role: 'albedo' | 'normal' | 'orm';
  mime: string;
  external: boolean;
  width: number;
  height: number;
  levels: number;
}

interface Stats {
  bufferTris: number;
  /** Triangles per `_PIECE` index (by the triangle's first vertex, as `groupByPiece`). */
  perPiece: number[];
  pieceMax: number;
  tintMax: number;
  hasPieceAttr: boolean;
  meshes: number;
  primitives: number;
  materials: number;
  joints: string[];
  maxInfluences: number;
  textures: TexInfo[];
  /** Image types that are not KTX2 (png, webp, jpeg ...). */
  nonKtx2: string[];
  basisuRequired: boolean;
}

function measure(g: Glb): Stats {
  const { gltf } = g;
  const prims = (gltf.meshes ?? []).flatMap((m) => m.primitives);
  const p = prims[0]!;
  const idx = readAccessor(g, p.indices!);
  const piece = p.attributes._PIECE !== undefined ? readAccessor(g, p.attributes._PIECE) : [];
  const tint = p.attributes._TINT !== undefined ? readAccessor(g, p.attributes._TINT) : [];
  const perPiece: number[] = [];
  for (let t = 0; t < idx.length; t += 3) {
    const k = piece.length ? piece[idx[t]!]! : 0;
    perPiece[k] = (perPiece[k] ?? 0) + 1;
  }
  for (let i = 0; i < perPiece.length; i++) perPiece[i] ??= 0;
  const w = p.attributes.WEIGHTS_0 !== undefined ? readAccessor(g, p.attributes.WEIGHTS_0) : [];
  let maxInfluences = 0;
  for (let v = 0; v + 3 < w.length; v += 4) {
    let n = 0;
    for (let c = 0; c < 4; c++) if (w[v + c]! > 1e-4) n++;
    if (n > maxInfluences) maxInfluences = n;
  }
  const skin = gltf.skins?.[0];
  const joints = (skin?.joints ?? []).map((j) => gltf.nodes![j]!.name ?? '');

  const roles = new Map<number, TexInfo['role']>();
  for (const m of gltf.materials ?? []) {
    const bc = m.pbrMetallicRoughness?.baseColorTexture?.index;
    if (bc !== undefined) roles.set(bc, 'albedo');
    if (m.normalTexture) roles.set(m.normalTexture.index, 'normal');
    const orm = m.pbrMetallicRoughness?.metallicRoughnessTexture?.index ?? m.occlusionTexture?.index;
    if (orm !== undefined && !roles.has(orm)) roles.set(orm, 'orm');
  }
  const textures: TexInfo[] = [];
  const nonKtx2: string[] = [];
  for (const [ti, role] of roles) {
    const t = gltf.textures![ti]!;
    const src = t.extensions?.KHR_texture_basisu?.source;
    const image = gltf.images![src ?? t.source!]!;
    if (src === undefined) nonKtx2.push(`${role}: texture ${ti} has no KHR_texture_basisu source`);
    let bytes: Uint8Array | null = null;
    if (image.bufferView !== undefined) {
      const bv = gltf.bufferViews![image.bufferView]!;
      bytes = g.bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
    } else if (image.uri && !image.uri.startsWith('data:') && g.dir) {
      bytes = new Uint8Array(readFileSync(g.dir + image.uri));
    }
    const mime = image.mimeType ?? (image.uri?.endsWith('.ktx2') ? 'image/ktx2' : '');
    if (mime !== 'image/ktx2') nonKtx2.push(`${role}: ${mime || 'unknown type'}`);
    const h = bytes && mime === 'image/ktx2' ? ktx2Header(bytes) : { width: 0, height: 0, levels: 0 };
    textures.push({ role, mime, external: image.bufferView === undefined, width: h.width, height: h.height, levels: h.levels });
  }
  return {
    bufferTris: idx.length / 3,
    perPiece,
    pieceMax: piece.length ? piece.reduce((m, v) => Math.max(m, v), 0) : 0,
    tintMax: tint.length ? tint.reduce((m, v) => Math.max(m, v), 0) : 0,
    hasPieceAttr: piece.length > 0,
    meshes: (gltf.nodes ?? []).filter((n) => n.mesh !== undefined).length,
    primitives: prims.length,
    materials: (gltf.materials ?? []).length,
    joints,
    maxInfluences,
    textures,
    nonKtx2,
    basisuRequired: (gltf.extensionsRequired ?? []).includes('KHR_texture_basisu'),
  };
}

/**
 * The kit with this LOD's triangle numbers replaced by the measured ones (pieces by id from the base's piece list), so
 * `shownTris` gives the worst-case shown triangles of the real file. A head's eyes are inside the head piece in the
 * file, so the kit's separate eyes term is zeroed.
 */
export function measuredKit(kit: GuardKit, base: string, pieces: readonly string[], perPiece: readonly number[], lod: 0 | 1 | 2): GuardKit {
  const k = structuredClone(kit);
  const tris = (id: string): number => {
    const i = pieces.indexOf(id);
    return i < 0 ? 0 : (perPiece[i] ?? 0);
  };
  for (const b of k.bases) if (b.id === base) b.bodyTris[lod] = tris(b.id);
  for (const h of k.heads) h.tris[lod] = tris(h.id);
  for (const c of k.hairCaps) c.tris[lod] = tris(c.id);
  for (const p of k.pieces) if (!p.ownGlb) p.tris[lod] = tris(p.id);
  k.face.eyes.tris[lod] = 0;
  return k;
}

/** LOD0 ceiling for one piece id (PLAN section 5), or null when only the totals bind it. */
function pieceCeiling(id: string, kind: string | undefined): number | null {
  const L = GUARD_LIMITS.pieceLod0;
  if (kind === 'headwear') return L.headwear;
  if (id.startsWith('helmet_')) return L.helmet;
  if (id === 'vest_soft') return L.vest_soft;
  if (id === 'plate_heavy') return L.plate_heavy;
  return null;
}

// ---- the reader on a synthetic file (always runs) ----

describe('guard asset reader (synthetic file)', () => {
  const file = guardGlb([
    { piece: 0, tint: 0, joint: 'chest', at: [0, 1.3, 0] },
    { piece: 0, tint: 0, joint: 'chest', at: [0.1, 1.3, 0] },
    { piece: 1, tint: 1, joint: 'head', at: [0, 1.7, 0] },
    { piece: 2, tint: 2, joint: 'chest', at: [0, 1.2, 0] },
    { piece: 2, tint: 2, joint: 'chest', at: [0.2, 1.2, 0] },
    { piece: 2, tint: 2, joint: 'chest', at: [0.3, 1.2, 0] },
  ]);
  const stats = measure(parseGlbChunks(file));

  it('counts triangles per piece, the buffer, the joints, influences and the one mesh', () => {
    expect(stats.bufferTris).toBe(6);
    expect(stats.perPiece).toEqual([2, 1, 3]);
    expect(stats.pieceMax).toBe(2);
    expect(stats.tintMax).toBe(2);
    expect(stats.hasPieceAttr).toBe(true);
    expect([stats.meshes, stats.primitives, stats.materials]).toEqual([1, 1, 1]);
    expect(stats.joints).toEqual(expect.arrayContaining(['chest', 'head', 'wrL']));
    expect(stats.maxInfluences).toBe(1);
    expect(stats.textures).toEqual([]);
    expect(stats.nonKtx2).toEqual([]);
  });

  it('reads a KTX2 header (size and mip levels) and refuses a file that is not KTX2', () => {
    const b = new Uint8Array(80);
    b.set([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);
    const dv = new DataView(b.buffer);
    dv.setUint32(20, 4096, true);
    dv.setUint32(24, 2048, true);
    dv.setUint32(40, 13, true);
    expect(ktx2Header(b)).toEqual({ width: 4096, height: 2048, levels: 13 });
    expect(() => ktx2Header(new Uint8Array(80))).toThrow();
  });

  it('the measured kit equals the kit when fed the kit\'s own triangle numbers', () => {
    for (const base of GUARD_BASES) {
      const pieces: string[] = [base, ...KIT.heads.filter((h) => h.base === base).map((h) => h.id), ...KIT.hairCaps.map((c) => c.id), ...KIT.pieces.filter((p) => !p.ownGlb).map((p) => p.id)];
      for (const lod of [0, 1, 2] as const) {
        const per = pieces.map((id) => {
          const head = KIT.heads.find((h) => h.id === id);
          if (head) return head.tris[lod] + KIT.face.eyes.tris[lod];
          return KIT.bases.find((b) => b.id === id)?.bodyTris[lod] ?? KIT.hairCaps.find((c) => c.id === id)?.tris[lod] ?? KIT.pieces.find((p) => p.id === id)!.tris[lod];
        });
        const mk = measuredKit(KIT, base, pieces, per, lod);
        for (const kind of KIT.kinds.filter((k) => k.base === base)) {
          expect(shownTris(mk, mk.kinds.find((k) => k.id === kind.id)!, lod), `${kind.id} LOD${lod}`).toBe(shownTris(KIT, kind, lod));
        }
      }
    }
  });

  it('the budget table is PLAN section 5 and the kit limits agree with it', () => {
    expect(BUDGET.shown).toEqual(GUARD_LIMITS.shown);
    expect(BUDGET.buffer).toEqual(GUARD_LIMITS.buffer);
    expect(BUDGET.bones[0]).toBe(GUARD_LIMITS.rigBones + GUARD_LIMITS.fingerBones);
    expect(BUDGET.bones[1]).toBe(GUARD_LIMITS.rigBones);
  });
});

// ---- the bundled files (skipped until G4 lands them) ----

const present = GUARD_BASES.filter((b) => existsSync(`${DIR}guard-${b}-lod0.glb`));
const allGlbs = existsSync(DIR) ? readdirSync(DIR).filter((f) => /^guard-.*\.glb$/.test(f)) : [];

/** G4 (bake, LODs, export) puts `guard-<base>-lod0/1/2.glb` + `guard-<base>.json` in the folder; until then this skips. */
describe.skipIf(present.length === 0)('bundled guard files (PLAN section 5)', () => {
  it('every base present has all three LODs and its json, and the manifest validates', () => {
    for (const base of present) {
      for (const l of [0, 1, 2]) expect(existsSync(`${DIR}guard-${base}-lod${l}.glb`), `guard-${base}-lod${l}.glb`).toBe(true);
      const data = JSON.parse(readFileSync(`${DIR}guard-${base}.json`, 'utf8')) as { pieces: string[]; tintSlots: number; refHeight: number };
      const m: GuardManifest = { id: `guard-${base}`, base: base as GuardBase, urls: ['', 'a', 'b', 'c'], pieces: data.pieces, tintSlots: data.tintSlots, refHeight: data.refHeight };
      expect(validateGuardManifest(m), base).toEqual([]);
      const kit = KIT.bases.find((b) => b.id === base)!;
      expect(Math.abs(data.refHeight - kit.refHeight), `${base} refHeight`).toBeLessThanOrEqual(GUARD_LIMITS.heightTolerance);
    }
  });

  for (const base of present) {
    describe(base, () => {
      const data = JSON.parse(readFileSync(`${DIR}guard-${base}.json`, 'utf8')) as { pieces: string[]; tintSlots: number };
      for (const lod of [0, 1, 2] as const) {
        const stats = measure(parseGlbChunks(new Uint8Array(readFileSync(`${DIR}guard-${base}-lod${lod}.glb`)).buffer as ArrayBuffer, DIR));

        it(`LOD${lod}: buffer triangles, shown triangles per kind and the head budget`, () => {
          expect(stats.bufferTris, 'buffer tris').toBeLessThanOrEqual(BUDGET.buffer[lod]);
          expect(stats.hasPieceAttr, '_PIECE attribute').toBe(true);
          expect(stats.pieceMax, '_PIECE index inside the piece list').toBeLessThan(data.pieces.length);
          expect(stats.tintMax, '_TINT slot inside tintSlots').toBeLessThan(data.tintSlots);
          const mk = measuredKit(KIT, base, data.pieces, stats.perPiece, lod);
          for (const kind of mk.kinds.filter((k) => k.base === base)) {
            expect(shownTris(mk, kind, lod), `${kind.id} shown tris`).toBeLessThanOrEqual(BUDGET.shown[lod]);
          }
          for (const h of KIT.heads.filter((x) => x.base === base)) {
            const n = stats.perPiece[data.pieces.indexOf(h.id)] ?? 0;
            expect(n, `${h.id} head tris`).toBeGreaterThan(0);
            // LOD0 eyes (2 x 250) ride in the head piece; at LOD1 they are inside the 1,200 and at LOD2 in the albedo
            expect(n, `${h.id} head tris`).toBeLessThanOrEqual(GUARD_LIMITS.head[lod] + (lod === 0 ? GUARD_LIMITS.eyesLod0 : 0));
          }
          if (lod === 0) {
            data.pieces.forEach((id, i) => {
              const ceil = pieceCeiling(id, KIT.pieces.find((p) => p.id === id)?.kind);
              if (ceil !== null) expect(stats.perPiece[i] ?? 0, `${id} LOD0 tris`).toBeLessThanOrEqual(ceil);
              if (KIT.hairCaps.some((c) => c.id === id)) expect(stats.perPiece[i] ?? 0, `${id} hair cap`).toBeLessThanOrEqual(GUARD_LIMITS.hairCapLod0);
            });
          }
          if (lod === 1) {
            data.pieces.forEach((id, i) => {
              if (KIT.hairCaps.some((c) => c.id === id)) expect(stats.perPiece[i] ?? 0, `${id} hair cap`).toBeLessThanOrEqual(GUARD_LIMITS.hairCapLod1);
            });
          }
        });

        it(`LOD${lod}: bones, influences, one mesh and one material`, () => {
          expect(stats.joints.length, 'bones').toBeLessThanOrEqual(BUDGET.bones[lod]);
          for (const j of RIG_JOINTS) expect(stats.joints, `joint ${j}`).toContain(j);
          expect(stats.maxInfluences, 'influences').toBeLessThanOrEqual(BUDGET.influences[lod]);
          expect([stats.meshes, stats.primitives, stats.materials], 'meshes, primitives, materials').toEqual([1, 1, 1]);
        });

        it(`LOD${lod}: KTX2 textures only, sizes inside section 5, with mips`, () => {
          expect(stats.basisuRequired, 'KHR_texture_basisu required').toBe(true);
          expect(stats.nonKtx2, 'non KTX2 images').toEqual([]);
          const roles = stats.textures.map((t) => t.role).sort();
          expect(roles, 'texture set').toEqual(['albedo', 'normal', 'orm']);
          for (const t of stats.textures) {
            const maxW = t.role === 'albedo' ? BUDGET.albedoW[lod] : BUDGET.normalW[lod];
            expect(t.width, `${t.role} width`).toBeGreaterThan(0);
            expect(t.width, `${t.role} width`).toBeLessThanOrEqual(maxW);
            expect(t.height, `${t.role} height`).toBeLessThanOrEqual(maxW / 2);
            expect(t.levels, `${t.role} mip levels`).toBeGreaterThan(1);
          }
        });
      }
    });
  }

  // G10a D6: a face-covered head (every kind wearing it has `faceCovered`, the balaclava never comes off) loses the
  // triangles the balaclava covers in the bake (bake_guard.py), so no skin shows in front of the membrane below the eye
  // slot. Measured like the D6 diagnosis (G10A-REPORT.md): front = +z, a front-facing head triangle below the slot whose
  // centroid's +z ray meets no balaclava triangle shows skin. Before the fix (the 2026-10-24 bake): 520 / 120 / 53; the
  // G10a bake: 46 / 26 / 18 (the kept margin ring and the jaw line).
  const coveredHeads = KIT.heads.filter((h) => {
    const kinds = KIT.kinds.filter((k) => k.base === h.base);
    return kinds.length > 0 && kinds.every((k) => k.faceCovered) && (present as readonly string[]).includes(h.base);
  });
  it.skipIf(coveredHeads.length === 0)('face-covered heads: no lower-face skin in front of the balaclava (G10a D6)', () => {
    const EYE_SLOT_BOTTOM = 1.677; // headwear.py's eye slot on the broad head, y 1.677-1.720 (G10A-REPORT D6 step 1)
    const MAX_SHOWN = [80, 40, 30];
    for (const h of coveredHeads) {
      const data = JSON.parse(readFileSync(`${DIR}guard-${h.base}.json`, 'utf8')) as { pieces: string[] };
      const hp = data.pieces.indexOf(h.id);
      const bp = data.pieces.indexOf('balaclava');
      expect(hp, `${h.id} in the piece list`).toBeGreaterThanOrEqual(0);
      expect(bp, 'balaclava in the piece list').toBeGreaterThanOrEqual(0);
      for (const lod of [0, 1, 2] as const) {
        const g = parseGlbChunks(new Uint8Array(readFileSync(`${DIR}guard-${h.base}-lod${lod}.glb`)).buffer as ArrayBuffer, DIR);
        const p = g.gltf.meshes![0]!.primitives[0]!;
        const idx = readAccessor(g, p.indices!);
        const pos = readAccessor(g, p.attributes.POSITION!);
        const piece = readAccessor(g, p.attributes._PIECE!);
        const head: number[] = [];
        const bal: number[] = [];
        for (let t = 0; t < idx.length; t += 3) {
          const k = piece[idx[t]!]!;
          if (k === hp) head.push(t);
          else if (k === bp) bal.push(t);
        }
        const x = (t: number, c: number): number => pos[3 * idx[t + c]!]!;
        const y = (t: number, c: number): number => pos[3 * idx[t + c]! + 1]!;
        const z = (t: number, c: number): number => pos[3 * idx[t + c]! + 2]!;
        let cz = 0;
        for (const t of head) cz += (z(t, 0) + z(t, 1) + z(t, 2)) / 3;
        cz /= head.length;
        const covered = (ox: number, oy: number, oz: number): boolean => {
          for (const t of bal) {
            const ax = x(t, 0), ay = y(t, 0), bx = x(t, 1) - ax, by = y(t, 1) - ay, cx = x(t, 2) - ax, cy = y(t, 2) - ay;
            const d = bx * cy - cx * by;
            if (Math.abs(d) < 1e-12) continue;
            const u = ((ox - ax) * cy - cx * (oy - ay)) / d;
            const v = (bx * (oy - ay) - (ox - ax) * by) / d;
            if (u < 0 || v < 0 || u + v > 1) continue;
            if (z(t, 0) + u * (z(t, 1) - z(t, 0)) + v * (z(t, 2) - z(t, 0)) > oz) return true;
          }
          return false;
        };
        let shown = 0;
        for (const t of head) {
          const oy = (y(t, 0) + y(t, 1) + y(t, 2)) / 3;
          const oz = (z(t, 0) + z(t, 1) + z(t, 2)) / 3;
          if (oy >= EYE_SLOT_BOTTOM || oz <= cz) continue;
          const nz = (x(t, 1) - x(t, 0)) * (y(t, 2) - y(t, 0)) - (y(t, 1) - y(t, 0)) * (x(t, 2) - x(t, 0));
          if (nz <= 0) continue;
          if (!covered((x(t, 0) + x(t, 1) + x(t, 2)) / 3, oy, oz)) shown++;
        }
        expect(shown, `${h.id} LOD${lod}: head triangles showing in front of the balaclava below the eye slot`).toBeLessThanOrEqual(MAX_SHOWN[lod]!);
      }
    }
  });

  it('the riot shield (its own GLB, when present): inside the shield piece budget and KTX2 only', () => {
    for (const lod of [0, 1, 2]) {
      const f = `${DIR}guard-shield_riot-lod${lod}.glb`;
      if (!existsSync(f)) continue;
      const s = measure(parseGlbChunks(new Uint8Array(readFileSync(f)).buffer as ArrayBuffer, DIR));
      if (lod === 0) expect(s.bufferTris, 'shield tris').toBeLessThanOrEqual(GUARD_LIMITS.pieceLod0.shield);
      expect(s.nonKtx2, `shield LOD${lod} images`).toEqual([]);
    }
  });

  it('the download (every guard file) stays inside 75 MB', () => {
    const total = allGlbs.reduce((n, f) => n + statSync(DIR + f).size, 0) + (readdirSync(DIR).filter((f) => f.endsWith('.ktx2')).reduce((n, f) => n + statSync(DIR + f).size, 0));
    expect(total).toBeLessThanOrEqual(BUDGET.downloadBytes);
  });
});
