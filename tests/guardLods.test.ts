import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import raw from '../scripts/operators/data/guards.json';
// @ts-expect-error plain JS module (scripts/operators), no types
import { ATLAS, garmentParts, guardLayout, pieceLayout, pieceOrder, rectsAt, skylinePack, TILE_ORIGIN } from '../scripts/operators/guardAtlas.mjs';
// @ts-expect-error plain JS module (scripts/operators), no types
import { fixGuardGlb, glbStats, readGlb, writeGlb } from '../scripts/operators/guardGlb.mjs';
// @ts-expect-error plain JS module (scripts/operators), no types
import { baseReport, fileDataFile, guardFileData, pieceReport, REPORT_VERSION, reportDrift, shownOfKind } from '../scripts/operators/guardLodReport.mjs';
// @ts-expect-error plain JS module (scripts/operators), no types
import { checkFileData, checkGuardFiles } from '../scripts/operators/guard-check.mjs';
// @ts-expect-error plain JS module (scripts/operators), no types
import { shippable } from '../scripts/operators/guardBakePlan.mjs';
import { resolveGuardAsset, type GuardFileData } from '../src/operators/guards/guardAssets';
// @ts-expect-error plain JS module (scripts/operators), no types
import { ktxFor } from '../scripts/operators/guard-lods.mjs';
import { checkGuardReport, GUARD_REPORT_VERSION } from '../src/operators/guards/guardBudget';
import type { GuardKit } from '../src/operators/guards/guardKit';
import { isGuardPieceId } from '../src/operators/guards/gearMask';

// guard-models G4: the pure halves of the LOD bake (atlas layout, GLB post-processing, the measured report, the check).

const KIT = raw as unknown as GuardKit;
type Rect = [number, number, number, number];
type Layout = {
  base: string; pieces: string[]; tintSlots: string[]; regions: Record<string, { kind: string; rect: Rect; tile?: number }>;
  leftScale: number; heads: { id: string }[]; caps: { id: string }[]; garments: { part: string; outfits: string[]; tris: number[]; partTint: string }[];
  outfits: { id: string; parts: string[] }[]; refHeight: number;
};
const layout = (b: string) => guardLayout(KIT, b) as Layout;
const BASES = ['average', 'lean', 'broad'];

describe('guard atlas layout', () => {
  it('orders pieces body, heads, caps, outfits, then the rest; only contract ids; under 256', () => {
    for (const b of BASES) {
      const L = layout(b);
      expect(L.pieces[0]).toBe(b);
      const heads = KIT.heads.filter((h) => h.base === b).map((h) => h.id);
      expect(L.pieces.slice(1, 1 + heads.length)).toEqual(heads);
      expect(L.pieces.length).toBeLessThan(256);
      expect(new Set(L.pieces).size).toBe(L.pieces.length);
      for (const p of L.pieces) expect(isGuardPieceId(p)).toBe(true);
      expect(L.pieces).not.toContain('shield_riot');
      expect(L.pieces).not.toContain('bald');
    }
    expect(pieceOrder(KIT, 'broad')).toEqual(['broad', 'broad-1', 'uniform', 'balaclava', 'helmet_heavy', 'plate_heavy', 'pouch_belt']);
  });

  it('every rect lies inside the atlas and no two overlap, at every LOD; the left half fits at full density', () => {
    for (const b of BASES) {
      const L = layout(b);
      expect(L.leftScale).toBe(1);
      for (const lod of [0, 1, 2]) {
        const [W, H] = ATLAS[lod];
        const rects = Object.entries(rectsAt(L, lod) as Record<string, Rect>);
        for (const [id, [x, y, w, h]] of rects) {
          expect(w, id).toBeGreaterThan(0);
          expect(x >= 0 && y >= 0 && x + w <= W && y + h <= H, `${b} ${id} LOD${lod}`).toBe(true);
        }
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const [, a] = rects[i]!;
            const [, c] = rects[j]!;
            const apart = a[0] + a[2] <= c[0] || c[0] + c[2] <= a[0] || a[1] + a[3] <= c[1] || c[1] + c[3] <= a[1];
            expect(apart, `${b} LOD${lod}: ${rects[i]![0]} / ${rects[j]![0]}`).toBe(true);
          }
        }
      }
    }
  });

  it('face tiles sit at the SPEC 7 positions in the base faceTiles order; the left items stay in the left half', () => {
    for (const b of BASES) {
      const L = layout(b);
      const base = KIT.bases.find((x) => x.id === b)!;
      base.faceTiles.forEach((id, t) => {
        const r = L.regions[`head:${id}`] ?? L.regions[`piece:${id}`];
        expect(r?.rect, `${b} ${id}`).toEqual([...TILE_ORIGIN[t], 1024, 1024]);
      });
      for (const [id, r] of Object.entries(L.regions)) if (r.tile === undefined) expect(r.rect[0] + r.rect[2], id).toBeLessThanOrEqual(2048);
    }
    expect(layout('broad').regions['piece:plate_heavy']?.tile).toBe(2);
    expect(layout('average').regions['eyes']).toBeDefined();
  });

  it('garment parts never sum past their outfit budget; a part two outfits share is one part in both (lean boots)', () => {
    for (const b of BASES) {
      const L = layout(b);
      for (const o of L.outfits) {
        const piece = KIT.pieces.find((p) => p.id === o.id)!;
        for (const lod of [0, 1, 2]) {
          const sum = L.garments.filter((g) => g.outfits.includes(o.id)).reduce((s, g) => s + g.tris[lod]!, 0);
          expect(sum, `${b} ${o.id} LOD${lod}`).toBeLessThanOrEqual(piece.tris[lod]!);
          expect(sum).toBeGreaterThan(piece.tris[lod]! * 0.65); // a shared part takes the smaller of its outfits' shares
        }
      }
    }
    const boots = garmentParts(KIT, 'lean').find((g: { part: string }) => g.part === 'boots');
    expect(boots.outfits.sort()).toEqual(['uniform_rolled', 'work']);
    expect(layout('lean').garments.find((g) => g.part === 'boots')?.partTint).toBe('none');
    expect(layout('lean').garments.find((g) => g.part === 'shirt_rolled')?.partTint).toBe('uniform');
  });

  it('skylinePack is deterministic and says when items do not fit', () => {
    const items = [{ id: 'a', w: 100, h: 50 }, { id: 'b', w: 60, h: 60 }, { id: 'c', w: 30, h: 30 }];
    const p1 = skylinePack(items, 200, 2);
    expect(p1.fits).toBe(true);
    expect(skylinePack([...items].reverse(), 200, 2)).toEqual(p1);
    expect(skylinePack([{ id: 'x', w: 300, h: 10 }], 200, 2).fits).toBe(false);
  });

  it('the shield layout: its own texels at LOD0, half and quarter below; normal / ORM half', () => {
    const L = pieceLayout(KIT, 'shield_riot');
    expect(L.atlas).toEqual([[512, 512], [256, 256], [128, 128]]);
    expect(L.normal).toEqual([[256, 256], [128, 128], [64, 64]]);
    expect(L.tris).toEqual([800, 300, 120]);
    expect(() => pieceLayout(KIT, 'helmet_std')).toThrow();
  });
});

// ---- a synthetic GLB (two pieces, float attributes as Blender writes them, one KTX2 albedo)
function ktx2Header(w: number, h: number): Uint8Array {
  const b = new Uint8Array(32);
  [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a].forEach((v, i) => { b[i] = v; });
  const dv = new DataView(b.buffer);
  dv.setUint32(20, w, true);
  dv.setUint32(24, h, true);
  return b;
}
function synthGlb(): Uint8Array {
  const parts: Uint8Array[] = [];
  const views: { buffer: number; byteOffset: number; byteLength: number }[] = [];
  let off = 0;
  const add = (a: ArrayBufferView) => {
    const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    const pad = (4 - (off % 4)) % 4;
    if (pad) { parts.push(new Uint8Array(pad)); off += pad; }
    views.push({ buffer: 0, byteOffset: off, byteLength: u.length });
    parts.push(u);
    off += u.length;
    return views.length - 1;
  };
  // 6 vertices: two triangles of piece 0 / 1, then one mixed triangle (0, 0, 1) using vertices 0, 1, 3
  const pos = add(new Float32Array(18));
  const piece = add(new Float32Array([0, 0, 0, 1, 1, 1]));
  const tint = add(new Float32Array([4, 4, 5, 2, 2, 2]));
  const joints = add(new Uint8Array(24));
  const weights = add(new Float32Array([1, 0, 0, 0, 0.5, 0.5, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0.3, 0.3, 0.4, 0, 1, 0, 0, 0]));
  const idx = add(new Uint16Array([0, 1, 2, 3, 4, 5, 0, 1, 3]));
  const img = add(ktx2Header(4096, 2048));
  const json = {
    asset: { version: '2.0' },
    buffers: [{ byteLength: 0 }],
    bufferViews: views,
    accessors: [
      { bufferView: pos, componentType: 5126, count: 6, type: 'VEC3' },
      { bufferView: piece, componentType: 5126, count: 6, type: 'SCALAR' },
      { bufferView: tint, componentType: 5126, count: 6, type: 'SCALAR' },
      { bufferView: joints, componentType: 5121, count: 6, type: 'VEC4' },
      { bufferView: weights, componentType: 5126, count: 6, type: 'VEC4' },
      { bufferView: idx, componentType: 5123, count: 9, type: 'SCALAR' },
    ],
    meshes: [{ name: 'm', primitives: [{ attributes: { POSITION: 0, _PIECE: 1, _TINT: 2, JOINTS_0: 3, WEIGHTS_0: 4 }, indices: 5, material: 0 }] }],
    nodes: [{ name: 'root' }, { name: 'head' }, { mesh: 0, skin: 0 }],
    skins: [{ joints: [0, 1] }],
    images: [{ name: 'guard-x-lod0-albedo', bufferView: img, mimeType: 'image/ktx2' }],
    textures: [{ extensions: { KHR_texture_basisu: { source: 0 } } }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
  };
  const bin = new Uint8Array(off);
  let o = 0;
  for (const p of parts) { bin.set(p, o); o += p.length; }
  json.buffers[0]!.byteLength = bin.length;
  return writeGlb(json, bin);
}

describe('guard GLB post-processing and measuring', () => {
  it('fixGuardGlb turns _PIECE / _TINT into uint8 and writes extras.guard; glbStats measures the file', () => {
    const info = { base: 'x', lod: 0, pieces: ['x', 'cap'], tintSlots: ['uniform', 'kit', 'headwear', 'hair', 'skin', 'none'] };
    const fixed = fixGuardGlb(synthGlb(), info);
    const { json } = readGlb(fixed);
    const prim = json.meshes[0].primitives[0];
    expect(json.accessors[prim.attributes._PIECE].componentType).toBe(5121);
    expect(json.accessors[prim.attributes._TINT].componentType).toBe(5121);
    expect(json.meshes[0].extras.guard).toEqual(info);
    const s = glbStats(fixed);
    expect(s.tris).toBe(3);
    expect(s.pieceTris).toEqual({ 0: 2, 1: 1 });
    expect(s.pieceTintTris).toEqual({ '0:4': 2, '1:2': 1 });
    expect(s.mixedTris).toBe(1);
    expect(s.influences).toBe(3);
    expect(s.bones).toEqual(['root', 'head']);
    expect(s.pieceAttrUint8).toBe(true);
    expect(s.extras).toEqual(info);
    expect(s.textures).toEqual([{ role: 'albedo', width: 4096, height: 2048, format: 'ktx2', name: 'guard-x-lod0-albedo' }]);
  });

  it('refuses a _PIECE that is not a whole uint8', () => {
    const g = readGlb(synthGlb());
    const dv = new DataView(g.bin.buffer, g.bin.byteOffset + g.json.bufferViews[1].byteOffset, 24);
    dv.setFloat32(0, 0.5, true);
    expect(() => fixGuardGlb(writeGlb(g.json, g.bin), { lod: 0 })).toThrow(/not a uint8/);
  });

  it('the KTX2 lookup of the repack matches images by their role suffix', () => {
    const f = ktxFor({ albedo: new Uint8Array([1]), normal: new Uint8Array([2]), orm: new Uint8Array([3]) });
    expect(f('guard-average-lod1-normal')?.[0]).toBe(2);
    expect(f('guard-average-lod1-orm.png')?.[0]).toBe(3);
    expect(f('something')).toBeUndefined();
  });
});

// ---- the measured report: synthetic stats at the kit's own budgets pass G4b's check
const SLOTS = KIT.tintSlots;
function statsFor(L: Layout, lod: number, scale = 1) {
  const pieceTris: Record<number, number> = {};
  const pieceTintTris: Record<string, number> = {};
  const none = SLOTS.indexOf('none');
  const skin = SLOTS.indexOf('skin');
  const base = KIT.bases.find((b) => b.id === L.base)!;
  L.pieces.forEach((id, i) => {
    let n: number;
    if (id === L.base) n = base.bodyTris[lod]!;
    else if (KIT.heads.some((h) => h.id === id)) {
      const head = KIT.heads.find((h) => h.id === id)!.tris[lod]!;
      const eyes = lod === 0 ? 448 : 0;
      pieceTintTris[`${i}:${skin}`] = head;
      pieceTintTris[`${i}:${none}`] = eyes;
      n = head + eyes;
    } else if (KIT.hairCaps.some((c) => c.id === id)) n = KIT.hairCaps.find((c) => c.id === id)!.tris[lod]!;
    else n = KIT.pieces.find((p) => p.id === id)!.tris[lod]!;
    pieceTris[i] = Math.floor(n * scale);
  });
  const tris = Object.values(pieceTris).reduce((a, b) => a + b, 0);
  const [w, h] = ATLAS[lod];
  return {
    tris, draws: 1, vertices: tris, bones: lod === 0 ? [...KIT.bones.rig, ...KIT.bones.fingers] : [...KIT.bones.rig], influences: lod === 2 ? 2 : 4,
    attributes: ['POSITION', 'NORMAL', 'TANGENT', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0', '_PIECE', '_TINT'],
    textures: [{ role: 'albedo', width: w, height: h, format: 'ktx2' }, { role: 'normal', width: w / 2, height: h / 2, format: 'ktx2' }, { role: 'orm', width: w / 2, height: h / 2, format: 'ktx2' }],
    pieceTris, pieceTintTris, mixedTris: 0, pieceAttrUint8: true, extras: { pieces: L.pieces },
  };
}

describe('guard bake report (measured)', () => {
  it('keeps the report version of guardBudget.ts', () => {
    expect(REPORT_VERSION).toBe(GUARD_REPORT_VERSION);
  });

  it('a base at its kit budgets passes G4b\'s check; the eyes are the head\'s none-tint triangles', () => {
    for (const b of BASES) {
      const L = layout(b);
      const r = baseReport(KIT, L, [0, 1, 2].map((l) => statsFor(L, l)));
      expect(checkGuardReport(r, KIT), b).toEqual([]);
      expect(r.lods[0].eyeTris).toBe(448);
      expect(r.manifest.pieces).toEqual(L.pieces);
    }
  });

  it('shown per kind is the guardKit worst case from measured counts (shield at its kit budget)', () => {
    const L = layout('broad');
    const r = baseReport(KIT, L, [0, 1, 2].map((l) => statsFor(L, l)));
    // enforcer: body 1200 + head 4000 + eyes 448 + uniform 5500 + balaclava 600 + plate 2600 + helmet_heavy 1200 + pouch 400 + shield 800
    expect(r.lods[0].shownTris.enforcer).toBe(1200 + 4000 + 448 + 5500 + 600 + 2600 + 1200 + 400 + 800);
    expect(r.lods[0].shownTris.heavy).toBe(1200 + 4000 + 448 + 5500 + 600 + 2600 + 1200 + 400);
    const t = { body: 10, heads: { h: 5 }, caps: { c: 3 }, pieces: { o: 7, a: 2, b: 4 }, eyes: 1 };
    const kind = { heads: ['h'], hairCaps: ['c'], outfit: 'o', headwear: ['a', 'b'], headwear2: [], eyewear: [], fixedGear: ['a'], gameplayGear: [], kitPool: ['a'] };
    expect(shownOfKind(kind, t)).toBe(10 + 5 + 1 + 3 + 7 + 4 + 2);
  });

  it('a base over its buffer, a piece over its cap or PNG textures fail the check', () => {
    const L = layout('average');
    const stats = [0, 1, 2].map((l) => statsFor(L, l));
    stats[0]!.pieceTris[L.pieces.indexOf('helmet_std')] = 1300;
    stats[1]!.textures[0]!.format = 'png';
    const p = checkGuardReport(baseReport(KIT, L, stats), KIT);
    expect(p.some((x) => /helmet_std 1300 tris over 1200/.test(x))).toBe(true);
    expect(p.some((x) => /not ktx2/.test(x))).toBe(true);
  });

  it('reportDrift names every number the written report gets wrong', () => {
    const L = layout('lean');
    const stats = [0, 1, 2].map((l) => statsFor(L, l));
    const good = baseReport(KIT, L, stats);
    expect(reportDrift(good, good)).toEqual([]);
    const bad = JSON.parse(JSON.stringify(good));
    bad.lods[1].bufferTris -= 10;
    bad.lods[0].pieceTris.work = 1;
    const d = reportDrift(bad, good);
    expect(d.some((x: string) => x.startsWith('LOD1: bufferTris'))).toBe(true);
    expect(d.some((x: string) => x.startsWith('LOD0: pieceTris.work'))).toBe(true);
  });

  it('the piece report of the shield passes at its budgets', () => {
    const L = pieceLayout(KIT, 'shield_riot');
    const stats = [0, 1, 2].map((l) => ({
      tris: L.tris[l], draws: 1, vertices: 10, bones: ['elL', 'wrL'], influences: 2, attributes: ['POSITION', '_PIECE', '_TINT'],
      textures: ['albedo', 'normal', 'orm'].map((role, i) => ({ role, width: i ? L.normal[l][0] : L.atlas[l][0], height: i ? L.normal[l][1] : L.atlas[l][1], format: 'ktx2' })),
      pieceTris: { 0: L.tris[l] }, pieceTintTris: {}, mixedTris: 0, pieceAttrUint8: true, extras: { pieces: ['shield_riot'] },
    }));
    expect(checkGuardReport(pieceReport(L, stats), KIT)).toEqual([]);
  });
});

describe('guard check (files)', () => {
  it('passes a clean base and lists the file-level problems', () => {
    const L = layout('broad');
    const stats = [0, 1, 2].map((l) => statsFor(L, l));
    const written = { ...baseReport(KIT, L, stats), bake: { seamKept: [0, 1, 2].map(() => ({ body: 42, 'broad-1': 42 })) } };
    const fileData = guardFileData(L);
    expect(checkGuardFiles({ kit: KIT, layout: L, stats, written, fileData }).problems).toEqual([]);
    expect(checkGuardFiles({ kit: KIT, layout: L, stats, written }).problems).toEqual([`${fileDataFile('broad')} missing (the runtime falls back to the stand-in without it)`]);
    const s2 = JSON.parse(JSON.stringify(stats));
    s2[0].mixedTris = 3;
    s2[1].pieceAttrUint8 = false;
    s2[2].extras = { pieces: ['broad'] };
    s2[0].pieceTris[L.pieces.indexOf('pouch_belt')] = 0;
    const w2 = { ...written, bake: { seamKept: [{ body: 40, 'broad-1': 42 }, null, null] }, notes: ['garment shirt missing'] };
    const p = checkGuardFiles({ kit: KIT, layout: L, stats: s2, written: w2, fileData }).problems;
    for (const re of [/span two pieces/, /not UNSIGNED_BYTE/, /extras.guard.pieces/, /pouch_belt has no triangles/, /body seam ring 40/, /bake note: garment shirt missing/, /report drift/]) {
      expect(p.some((x: string) => re.test(x)), String(re)).toBe(true);
    }
  });

  it('flags a piece with no triangles at LOD1 / LOD2, but not a hair cap at LOD2 (the kit gives caps none there)', () => {
    const L = layout('average');
    const stats = [0, 1, 2].map((l) => statsFor(L, l));
    const written = { ...baseReport(KIT, L, stats), bake: {} };
    const fileData = guardFileData(L);
    const cap = L.caps[0]!.id;
    expect(stats[2]!.pieceTris[L.pieces.indexOf(cap)]).toBe(0);
    expect(checkGuardFiles({ kit: KIT, layout: L, stats, written, fileData }).problems).toEqual([]);
    const s2 = JSON.parse(JSON.stringify(stats));
    s2[1].pieceTris[L.pieces.indexOf('radio')] = 0;
    s2[2].pieceTris[L.pieces.indexOf('glasses_dark')] = 0;
    s2[1].pieceTris[L.pieces.indexOf(cap)] = 0;
    const p = checkGuardFiles({ kit: KIT, layout: L, stats: s2, written: baseReport(KIT, L, s2), fileData }).problems;
    expect(p).toContain('average LOD1: piece radio has no triangles (decimated away?)');
    expect(p).toContain('average LOD2: piece glasses_dark has no triangles (decimated away?)');
    expect(p).toContain(`average LOD1: piece ${cap} has no triangles (decimated away?)`);
    expect(p.filter((x: string) => x.includes('has no triangles'))).toHaveLength(3);
  });
});

describe('guard-<base>.json (G7 guardAssets.ts GuardFileData)', () => {
  it('has the loader\'s shape, the report manifest\'s values, and G7\'s loader takes it for every base', () => {
    for (const b of BASES) {
      const L = layout(b);
      const d = guardFileData(L) as GuardFileData;
      expect(Object.keys(d).sort()).toEqual(['pieces', 'refHeight', 'tintSlots']);
      expect(d.pieces).toEqual(L.pieces);
      expect(d.tintSlots).toBe(KIT.tintSlots.length);
      expect(d.refHeight).toBe(KIT.bases.find((x) => x.id === b)!.refHeight);
      const m = baseReport(KIT, L, [0, 1, 2].map((l) => statsFor(L, l))).manifest;
      expect({ pieces: m.pieces, tintSlots: m.tintSlots, refHeight: m.refHeight }).toEqual(d);
      expect(checkFileData(L, d, { manifest: m })).toEqual([]);
      // the runtime resolver itself (G7), with the file names the lead copies into src/operators/assets/guards/
      const files = Object.fromEntries([0, 1, 2].map((l) => [`../assets/guards/guard-${b}-lod${l}.glb`, `u${l}`]));
      const a = resolveGuardAsset(b as 'average', files, { [`../assets/guards/guard-${b}.json`]: JSON.parse(JSON.stringify(d)) as GuardFileData }, ['', 'w1', 'w2', 'w3']);
      expect(a.problems, b).toEqual([]);
      expect(a.standIn).toBe(false);
      expect(fileDataFile(b)).toBe(`lods/guard-${b}.json`);
      expect(shippable(fileDataFile(b))).toBe(true);
    }
    for (const no of ['lods/guard-average.layout.json', 'lods/guard-average.bake.json']) expect(shippable(no), no).toBe(false);
  });

  it('the check names a malformed file, a wrong value and a manifest the runtime refuses', () => {
    const L = layout('lean');
    const d = guardFileData(L);
    expect(checkFileData(L, { ...d, tintSlots: KIT.tintSlots }, null)[0]).toMatch(/malformed/);
    expect(checkFileData(L, { ...d, refHeight: d.refHeight + 0.1 }, null)).toEqual(['lods/guard-lean.json: refHeight is not the layout\'s']);
    const m = { ...d, tintSlots: d.tintSlots + 1 };
    expect(checkFileData(L, d, { manifest: m })).toEqual(['lods/guard-lean.json: tintSlots differs from the report manifest']);
    const bad = { ...d, pieces: ['average', ...d.pieces.slice(1)] };
    const p = checkFileData(L, bad, null);
    expect(p.some((x: string) => /body piece average is not the base lean/.test(x))).toBe(true);
    expect(p.some((x: string) => /pieces is not the layout's/.test(x))).toBe(true);
  });
});

// The bake's numpy helpers (guard_lod_util.py: raster, dilate, resize, place, the finger fold, the neck weld by hm08
// index, lodBones from the kit) carry their own self-test; it runs here when Blender's bundled Python is installed.
const BLENDER_PY = process.env.BLENDER_PYTHON ?? 'C:/Program Files/Blender Foundation/Blender 5.2/5.2/python/bin/python.exe';
describe('guard LOD bake numpy helpers', () => {
  it.skipIf(!existsSync(BLENDER_PY))('guard_lod_util.py self-test passes', () => {
    const out = execFileSync(BLENDER_PY, ['-I', 'scripts/operators/py/guard_lod_util.py'], { encoding: 'utf8', windowsHide: true, timeout: 60_000 });
    expect(out).toContain('self-test: ok');
  });
});
