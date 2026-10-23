// (guard-models G5) The guard figure's piece mask, pure: per-piece visibility, tint fill, flash in alpha, no-op when
// nothing changed, the index grouping by piece and the visible index ranges, the manifest checks and the stand-in.
import { describe, expect, it } from 'vitest';
import {
  fillGvis, gearMask, groupByPiece, guardStandInManifest, isGuardPieceId, pieceMask, validateGuardManifest, visibleAlpha,
  visibleIndices, type GuardManifest,
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

describe('gearMask', () => {
  it('shows exactly the visible pieces and fills each vertex with its slot tint', () => {
    const { piece, tint } = mesh();
    const out = new Uint8Array(piece.length * 4);
    const visible = new Set(['average', 'average-2', 'cap', 'vest_soft']);
    expect(gearMask(PIECES, piece, tint, visible, TINTS, out)).toBe(true);
    for (let v = 0; v < piece.length; v++) {
      const p = PIECES[piece[v]!]!;
      expect(out[v * 4 + 3]).toBe(visible.has(p) ? 255 : 0);
      const s = tint[v]! * 3;
      expect([out[v * 4], out[v * 4 + 1], out[v * 4 + 2]]).toEqual([TINTS[s], TINTS[s + 1], TINTS[s + 2]]);
    }
  });

  it('is a no-op when nothing changed, and a gear toggle changes only that piece\'s bytes', () => {
    const { piece, tint } = mesh();
    const out = new Uint8Array(piece.length * 4);
    const visible = new Set(['average', 'average-1', 'buzz']);
    gearMask(PIECES, piece, tint, visible, TINTS, out);
    const before = out.slice();
    expect(gearMask(PIECES, piece, tint, visible, TINTS, out)).toBe(false);
    expect(out).toEqual(before);
    visible.add('helmet_std');
    expect(gearMask(PIECES, piece, tint, visible, TINTS, out)).toBe(true);
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
    const visible = new Set<string>(PIECES);
    const tints = TINTS.slice();
    gearMask(PIECES, piece, tint, visible, tints, out);
    const before = out.slice();
    tints[3] = 10; // slot 1 red
    expect(gearMask(PIECES, piece, tint, visible, tints, out)).toBe(true);
    for (let v = 0; v < piece.length; v++) expect(out[v * 4]).toBe(tint[v] === 1 ? 10 : before[v * 4]);
  });

  it('folds the flash into a visible vertex\'s alpha and never hides it', () => {
    expect(visibleAlpha(0)).toBe(255);
    expect(visibleAlpha(1)).toBe(1);
    expect(visibleAlpha(2)).toBe(1);
    expect(visibleAlpha(-1)).toBe(255);
    expect(visibleAlpha(0.5)).toBe(128);
    const { piece, tint } = mesh();
    const vis = new Uint8Array(PIECES.length);
    pieceMask(PIECES, new Set(['average']), vis);
    expect(Array.from(vis)).toEqual([1, 0, 0, 0, 0, 0, 0]);
    const out = new Uint8Array(piece.length * 4);
    fillGvis(piece, tint, vis, TINTS, 1, out);
    expect(out[3]).toBe(1);
    expect(out[7]).toBe(1);
    expect(out[11]).toBe(0);
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
  });
});
