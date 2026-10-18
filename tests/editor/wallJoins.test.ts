import { describe, expect, it } from 'vitest';
import { closeGap, GAP_MAX, gapWords, joinedCampus, joinPieces, JOIN_TOL, WALL_EXTEND, wallGaps, wallJoins, wallPieces } from '../../src/editor/geometry';
import type { Opening, Pt, Wall } from '../../src/editor/types';

const W = (id: string, a: Pt, b: Pt, t = 0.2, level = 'G'): Wall => ({ id, level, a, b, t, h: 3, kind: 'interior' });

/** The plan box of a wall drawn with its joins: [minX, minZ, maxX, maxZ]. */
function box(w: Wall, joins: ReturnType<typeof wallJoins>): [number, number, number, number] {
  const L = Math.abs(w.b[0] - w.a[0]) + Math.abs(w.b[1] - w.a[1]);
  const p = joinPieces(wallPieces(w, []), L, joins.get(w.id))[0]!;
  const dx = (w.b[0] - w.a[0]) / L;
  const dz = (w.b[1] - w.a[1]) / L;
  const x0 = w.a[0] + dx * p.s0, x1 = w.a[0] + dx * p.s1, z0 = w.a[1] + dz * p.s0, z1 = w.a[1] + dz * p.s1;
  const ht = w.t / 2;
  return [Math.min(x0, x1) - (dz ? ht : 0), Math.min(z0, z1) - (dx ? ht : 0), Math.max(x0, x1) + (dz ? ht : 0), Math.max(z0, z1) + (dx ? ht : 0)];
}

describe('wall corner joins (ON0b decision 6)', () => {
  it('reads its numbers from facts.json', () => {
    expect(WALL_EXTEND).toBe(0.5);
    expect(JOIN_TOL).toBe(0.001);
    expect(GAP_MAX).toBe(0.05);
  });

  it('L: both ends grow by half the other wall, so the outside corner is square', () => {
    const a = W('A', [0, 0], [5, 0]);
    const b = W('B', [5, 0], [5, 4]);
    const j = wallJoins([a, b]);
    expect(j.get('A')).toEqual({ a: 0, b: 0.1, seamA: false, seamB: false });
    expect(j.get('B')).toEqual({ a: 0.1, b: 0, seamA: false, seamB: false });
    const ba = box(a, j);
    const bb = box(b, j);
    // outside corner at (5.1, -0.1): both boxes reach it
    expect(ba[2]).toBeCloseTo(5.1, 9);
    expect(bb[2]).toBeCloseTo(5.1, 9);
    expect(ba[1]).toBeCloseTo(-0.1, 9);
    expect(bb[1]).toBeCloseTo(-0.1, 9);
  });

  it('different thicknesses: each end grows by half the other one', () => {
    const a = W('A', [0, 0], [5, 0], 0.3);
    const b = W('B', [5, 0], [5, 4], 0.1);
    const j = wallJoins([a, b]);
    expect(j.get('A')!.b).toBeCloseTo(0.05, 9);
    expect(j.get('B')!.a).toBeCloseTo(0.15, 9);
    expect(box(a, j)[2]).toBeCloseTo(5.05, 9); // A reaches B's outer face
    expect(box(b, j)[1]).toBeCloseTo(-0.15, 9); // B reaches A's outer face
  });

  it('T: the stem reaches the far face of the bar; the bar is unchanged', () => {
    const bar = W('BAR', [0, 0], [10, 0], 0.3);
    const stem = W('STEM', [4, 0], [4, 5], 0.1);
    const j = wallJoins([bar, stem]);
    expect(j.get('BAR')).toBeUndefined();
    expect(j.get('STEM')).toEqual({ a: 0.15, b: 0, seamA: false, seamB: false });
    expect(box(stem, j)[1]).toBeCloseTo(-0.15, 9);
  });

  it('X: four arms from one point need nothing (opposite arms run on into each other)', () => {
    const ws = [W('E', [0, 0], [3, 0]), W('Wx', [0, 0], [-3, 0]), W('N', [0, 0], [0, 3]), W('S', [0, 0], [0, -3])];
    const j = wallJoins(ws);
    for (const id of ['E', 'Wx', 'N', 'S']) expect(j.get(id)).toEqual({ a: 0, b: 0, seamA: true, seamB: false });
  });

  it('same line, ends meeting: one continuous wall (no extension, seam flagged)', () => {
    const j = wallJoins([W('A', [0, 0], [5, 0]), W('B', [5, 0], [9, 0])]);
    expect(j.get('A')).toEqual({ a: 0, b: 0, seamA: false, seamB: true });
    expect(j.get('B')).toEqual({ a: 0, b: 0, seamA: true, seamB: false });
  });

  it('a free end stays as drawn; other levels never join', () => {
    const j = wallJoins([W('A', [0, 0], [5, 0]), W('B', [5, 0], [5, 4], 0.2, 'L1'), W('C', [20, 0], [20, 4])]);
    expect(j.size).toBe(0);
  });

  it('the walk test campus: walls grown, openings kept in place, the input untouched', () => {
    const a = W('A', [0, 0], [5, 0]);
    const b = W('B', [5, 0], [5, 4]);
    const o: Opening = { id: 'D', wall: 'B', at: 2, w: 0.9, h: 2.1, sill: 0, type: 'door' };
    const c = { walls: [a, b], openings: [o] };
    const out = joinedCampus(c);
    expect(out.walls[0]!.b).toEqual([5.1, 0]);
    expect(out.walls[1]!.a).toEqual([5, -0.1]);
    expect(out.openings[0]!.at).toBeCloseTo(2.1, 9); // same world point
    expect(c.walls[1]!.a).toEqual([5, 0]);
    expect(o.at).toBe(2);
  });
});

describe('wall gaps (ON0b decision 7)', () => {
  it('an end 0.04 m short of a corner is a Gap; 0.06 m or a meeting end is not', () => {
    const g = wallGaps([W('A', [0, 0], [4.96, 0]), W('B', [5, 0], [5, 4])]);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ wall: 'A', end: 'b', other: 'B', dist: 0.04, to: [5, 0] });
    expect(gapWords(g[0]!)).toBe('Gap 0.04 m: A end b to B');
    expect(wallGaps([W('A', [0, 0], [4.94, 0]), W('B', [5, 0], [5, 4])])).toHaveLength(0);
    expect(wallGaps([W('A', [0, 0], [5, 0]), W('B', [5, 0], [5, 4])])).toHaveLength(0);
  });

  it('a T stem 0.03 m off the bar closes onto the bar line; each pair is listed once', () => {
    const g = wallGaps([W('BAR', [0, 0], [10, 0]), W('STEM', [4, 0.03], [4, 5])]);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ wall: 'STEM', end: 'a', to: [4, 0] });
    const both = wallGaps([W('A', [0, 0], [4.97, 0]), W('B', [5, 0], [9, 0])]);
    expect(both).toHaveLength(1);
    expect(wallGaps([W('A', [0, 0], [4.97, 0]), W('B', [5, 0], [9, 0])], false).map((g) => g.wall)).toEqual(['A', 'B']);
  });

  it('Close gap moves the end along the wall, and across only when it must', () => {
    const a = W('A', [0, 0], [4.96, 0]);
    const b = W('B', [5, 0], [5, 4]);
    const fixed = closeGap(a, wallGaps([a, b])[0]!, b);
    expect(fixed.b).toEqual([5, 0]);
    expect(wallGaps([fixed, b])).toHaveLength(0);
    const off = W('A', [0, -0.03], [5, -0.03]);
    const g = wallGaps([off, b])[0]!;
    const shifted = closeGap(off, g, b);
    expect(shifted.a[1]).toBeCloseTo(0, 9);
    expect(shifted.b[1]).toBeCloseTo(0, 9);
    expect(wallGaps([shifted, b])).toHaveLength(0);
  });
});
