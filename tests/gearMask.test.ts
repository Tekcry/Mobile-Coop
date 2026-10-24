// (guard-models G5) The guard figure's piece mask, pure: per-piece visibility from G6's reused (ids, count) list, the
// body piece always shown, stale ids past count ignored, tint fill, flash and heat in alpha, no-op when nothing
// changed, the index grouping by piece and the visible index ranges, the manifest checks and the stand-in.
import { describe, expect, it } from 'vitest';
import {
  fillGvis, FX_LEVELS, gearMask, groupByPiece, guardStandInManifest, isGuardPieceId, pieceMask, validateGuardManifest,
  visibleAlpha, visibleIndices, type GuardManifest,
} from '../src/operators/guards/gearMask';

const PIECES = ['average', 'average-1', 'average-2', 'buzz', 'cap', 'helmet_std', 'vest_soft'] as const;

/** 14 vertices: two per piece, piece i at vertices 2i, 2i + 1; tint slot = piece % 3. */
function mesh(): { piece: Uint8Array; tint: Uint8Array } {
  const piece = new Uint8Array(PIECES.length * 2);
  const tint = new Uint8Array(piece.length);
  for (let v = 0; v < piece.length; v++) {
    piece[v] = v >> 1;
    tint[v] = (v >> 1) % 3;
  }
  return { piece, tint };
}

const TINTS = new Uint8Array([255, 255, 255, 200, 150, 100, 40, 60, 80]);

/** G6's `GuardPieces` shape: a fixed 16-slot reused array, the first `count` valid. */
function g6(ids: string[], stale: string[] = []): { ids: string[]; count: number } {
  const out = [...ids, ...stale];
  while (out.length < 16) out.push('');
  return { ids: out, count: ids.length };
}

describe('gearMask', () => {
  it('shows exactly the visible pieces and fills each vertex with its slot tint', () => {
    const { piece, tint } = mesh();
    const out = new Uint8Array(piece.length * 4);
    const visible = ['average', 'average-2', 'cap', 'vest_soft'];
    expect(gearMask(PIECES, piece, tint, visible, visible.length, TINTS, out)).toBe(true);
    for (let v = 0; v < piece.length; v++) {
      const p = PIECES[piece[v]!]!;
      expect(out[v * 4 + 3]).toBe(visible.includes(p) ? 255 : 0);
      const s = tint[v]! * 3;
      expect([out[v * 4], out[v * 4 + 1], out[v * 4 + 2]]).toEqual([TINTS[s], TINTS[s + 1], TINTS[s + 2]]);
    }
  });

  it('(B1) the body piece is always shown: a G6 applyGear list never names the base', () => {
    const { piece, tint } = mesh();
    const out = new Uint8Array(piece.length * 4);
    const p = g6(['average-1', 'buzz', 'vest_soft']);
    gearMask(PIECES, piece, tint, p.ids, p.count, TINTS, out);
    expect([out[3], out[7]]).toEqual([255, 255]); // body (piece 0) vertices 0, 1
    expect([out[4 * 4 + 3], out[12 * 4 + 3]]).toEqual([0, 255]); // average-2 hidden, vest shown
    const vis = new Uint8Array(PIECES.length);
    pieceMask(PIECES, [], 0, vis);
    expect(Array.from(vis)).toEqual([1, 0, 0, 0, 0, 0, 0]);
  });

  it('(B2) ids past count are stale and ignored', () => {
    const vis = new Uint8Array(PIECES.length);
    const p = g6(['average-1', 'cap'], ['helmet_std', 'vest_soft']);
    pieceMask(PIECES, p.ids, p.count, vis);
    expect(Array.from(vis)).toEqual([1, 1, 0, 0, 1, 0, 0]);
    // count past the array's end is clamped
    pieceMask(PIECES, ['buzz'], 5, vis);
    expect(Array.from(vis)).toEqual([1, 0, 0, 1, 0, 0, 0]);
  });

  it('is a no-op when nothing changed, and a gear toggle changes only that piece\'s bytes', () => {
    const { piece, tint } = mesh();
    const out = new Uint8Array(piece.length * 4);
    const p = g6(['average-1', 'buzz'], ['helmet_std']);
    gearMask(PIECES, piece, tint, p.ids, p.count, TINTS, out);
    const before = out.slice();
    expect(gearMask(PIECES, piece, tint, p.ids, p.count, TINTS, out)).toBe(false);
    expect(out).toEqual(before);
    p.count = 3; // the helmet slot becomes valid
    expect(gearMask(PIECES, piece, tint, p.ids, p.count, TINTS, out)).toBe(true);
    const h = PIECES.indexOf('helmet_std');
    for (let i = 0; i < out.length; i++) {
      const v = i >> 2;
      if (piece[v] === h && (i & 3) === 3) expect(out[i]).toBe(255);
      else expect(out[i]).toBe(before[i]);
    }
  });

  it('a tint change rewrites only the vertices of that slot', () => {
    const { piece, tint } = mesh();
    const out = new Uint8Array(piece.length * 4);
    const visible: readonly string[] = PIECES;
    const tints = TINTS.slice();
    gearMask(PIECES, piece, tint, visible, visible.length, tints, out);
    const before = out.slice();
    tints[3] = 10; // slot 1 red
    expect(gearMask(PIECES, piece, tint, visible, visible.length, tints, out)).toBe(true);
    for (let v = 0; v < piece.length; v++) expect(out[v * 4]).toBe(tint[v] === 1 ? 10 : before[v * 4]);
  });

  it('folds flash (low 4 bits) and heat (high 4 bits) into a visible vertex\'s alpha and never hides it', () => {
    expect(FX_LEVELS).toBe(15);
    expect(visibleAlpha(0)).toBe(255);
    expect(visibleAlpha(1)).toBe(240);
    expect(visibleAlpha(2)).toBe(240);
    expect(visibleAlpha(-1)).toBe(255);
    expect(visibleAlpha(0.5)).toBe(255 - 8);
    expect(visibleAlpha(0, 1)).toBe(255 - 240);
    expect(visibleAlpha(1, 1)).toBe(1); // both full: clamped, never 0
    // the thermal body heat (0.85 x n / 16) lands on a level and decodes back within half a level
    for (let n = 0; n <= 16; n++) {
      const k = 0.85 * n / 16;
      const v = 255 - visibleAlpha(0.4, k);
      const heat = Math.floor(v / 16) / FX_LEVELS, flash = (v % 16) / FX_LEVELS;
      expect(Math.abs(heat - k)).toBeLessThanOrEqual(0.5 / FX_LEVELS + 1e-9);
      expect(Math.abs(flash - 0.4)).toBeLessThanOrEqual(0.5 / FX_LEVELS + 1e-9);
    }
    const { piece, tint } = mesh();
    const vis = new Uint8Array(PIECES.length);
    pieceMask(PIECES, [], 0, vis);
    const out = new Uint8Array(piece.length * 4);
    fillGvis(piece, tint, vis, TINTS, 1, out);
    expect(out[3]).toBe(240);
    expect(out[7]).toBe(240);
    expect(out[11]).toBe(0);
    fillGvis(piece, tint, vis, TINTS, 0, out, 0.85);
    expect(out[3]).toBe(255 - 13 * 16);
    expect(out[11]).toBe(0); // hidden stays hidden whatever the heat
  });

  it('a head variant swap and a hair cap toggle change only those pieces\' vertices', () => {
    const { piece, tint } = mesh();
    const out = new Uint8Array(piece.length * 4);
    const alphaOf = (id: string): number[] => {
      const p = PIECES.indexOf(id as (typeof PIECES)[number]);
      return [out[p * 2 * 4 + 3]!, out[(p * 2 + 1) * 4 + 3]!];
    };
    gearMask(PIECES, piece, tint, ['average-1', 'buzz', 'cap'], 3, TINTS, out);
    expect([alphaOf('average-1'), alphaOf('average-2'), alphaOf('buzz'), alphaOf('cap')]).toEqual([[255, 255], [0, 0], [255, 255], [255, 255]]);
    const before = out.slice();
    // head 1 -> 2, hair cap off (a helmet or a beanie hides it, A5): exactly those vertices change
    expect(gearMask(PIECES, piece, tint, ['average-2', 'cap'], 2, TINTS, out)).toBe(true);
    for (let i = 0; i < out.length; i++) {
      const v = i >> 2;
      const p = PIECES[piece[v]!]!;
      if ((i & 3) === 3 && (p === 'average-1' || p === 'average-2' || p === 'buzz')) expect(out[i], `alpha of ${p}`).toBe(p === 'average-2' ? 255 : 0);
      else expect(out[i], `byte ${i}`).toBe(before[i]);
    }
    // nothing named for the head: no head vertex is visible (the body piece alone is forced on)
    gearMask(PIECES, piece, tint, [], 0, TINTS, out);
    for (const h of ['average-1', 'average-2']) expect(alphaOf(h)).toEqual([0, 0]);
    expect(alphaOf('average')).toEqual([255, 255]);
  });

  it('an out-of-range tint slot falls back to slot 0', () => {
    const piece = new Uint8Array([0]);
    const tint = new Uint8Array([9]);
    const out = new Uint8Array(4);
    fillGvis(piece, tint, new Uint8Array([1]), new Uint8Array([11, 22, 33]), 0, out);
    expect(Array.from(out)).toEqual([11, 22, 33, 255]);
  });
});

describe('index grouping by piece', () => {
  it('groups triangles by piece and writes the visible ranges', () => {
    // 6 vertices: piece 0 (0, 1, 4), piece 1 (2, 3, 5); triangles interleaved
    const vp = new Uint8Array([0, 0, 1, 1, 0, 1]);
    const idx = [2, 3, 5, 0, 1, 4, 5, 3, 2, 4, 1, 0];
    const g = groupByPiece(idx, vp, 2);
    expect(g.indices).toBeInstanceOf(Uint16Array);
    expect(Array.from(g.start)).toEqual([0, 6, 12]);
    expect(Array.from(g.indices)).toEqual([0, 1, 4, 4, 1, 0, 2, 3, 5, 5, 3, 2]);
    const out = new Uint16Array(12);
    expect(visibleIndices(g, new Uint8Array([0, 1]), out)).toBe(6);
    expect(Array.from(out.subarray(0, 6))).toEqual([2, 3, 5, 5, 3, 2]);
    expect(visibleIndices(g, new Uint8Array([1, 1]), out)).toBe(12);
    expect(visibleIndices(g, new Uint8Array([0, 0]), out)).toBe(0);
  });

  it('uses 32-bit indices past 65535 vertices', () => {
    const vp = new Uint8Array(70000);
    const g = groupByPiece([0, 1, 69999], vp, 1);
    expect(g.indices).toBeInstanceOf(Uint32Array);
    expect(Array.from(g.indices)).toEqual([0, 1, 69999]);
  });
});

describe('guard manifest', () => {
  it('contract ids, the stand-in and its checks', () => {
    expect(isGuardPieceId('helmet_std')).toBe(true);
    expect(isGuardPieceId('broad-1')).toBe(true);
    expect(isGuardPieceId('bald')).toBe(false); // no mesh
    expect(isGuardPieceId('shield_riot')).toBe(false); // its own GLB
    const s = guardStandInManifest('average', ['/h.glb', '/0.glb', '/1.glb', '/2.glb']);
    expect(s.urls).toEqual(['', '/0.glb', '/1.glb', '/2.glb']);
    expect(s.pieces).toEqual(['average']);
    expect(validateGuardManifest(s)).toEqual([]);
    const bad: GuardManifest = { ...s, urls: ['/h.glb', '', '/1.glb', '/2.glb'], pieces: ['average', 'average', 'hat'], tintSlots: 0, refHeight: 0 };
    const p = validateGuardManifest(bad);
    expect(p.some((x) => x.includes('no hero'))).toBe(true);
    expect(p.some((x) => x.includes('lod0 missing'))).toBe(true);
    expect(p.some((x) => x.includes('twice'))).toBe(true);
    expect(p.some((x) => x.includes('hat'))).toBe(true);
    expect(p.some((x) => x.includes('tint slots'))).toBe(true);
    expect(p.some((x) => x.includes('reference height'))).toBe(true);
    // the body piece: present, and the only base in the file
    expect(validateGuardManifest({ ...s, pieces: ['helmet_std'] }).some((x) => x.includes('body piece average missing'))).toBe(true);
    expect(validateGuardManifest({ ...s, pieces: ['average', 'lean'] }).some((x) => x.includes('not the base'))).toBe(true);
    expect(validateGuardManifest({ ...s, pieces: ['average', 'eyes'] }).some((x) => x.includes('eyes is not a contract id'))).toBe(true);
  });
});
