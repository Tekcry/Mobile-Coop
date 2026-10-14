import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clearOfWalls, overlap, pointFoot, rectFoot, segFoot, wallSolids, wallUnder, WALL_PUSH_MAX, WALL_TOUCH } from '../../src/editor/wallClear';
import type { Opening, Wall } from '../../src/editor/types';

const facts = JSON.parse(readFileSync('scripts/kestrel/facts.json', 'utf8')) as { rules: Record<string, { value: number }> };
const wall: Wall = { id: 'W1', level: 'G', a: [0, 0], b: [10, 0], t: 0.3, h: 4.2, kind: 'interior' };
const door: Opening = { id: 'D1', wall: 'W1', at: 3, w: 1.2, h: 2.1, sill: 0, type: 'door' };
const solids = wallSolids([wall, { ...wall, id: 'W2', level: 'L1' }], [door], 'G');

describe('no placing inside walls', () => {
  it('reads its numbers from facts.json', () => {
    expect(WALL_PUSH_MAX).toBe(facts.rules.wallPushMax!.value);
    expect(WALL_TOUCH).toBe(facts.rules.wallTouchTol!.value);
  });

  it('cuts the openings out and keeps the editing level only', () => {
    expect(solids.map((s) => [s.wall, s.y0, s.y1])).toEqual([['W1', 0, 4.2], ['W1', 2.1, 4.2], ['W1', 0, 4.2]]);
  });

  it('a box touching the face is on it; one into the wall is inside', () => {
    expect(wallUnder(rectFoot([1, 0.15, 2, 0.75], 0, 1), solids)).toBeNull();
    expect(wallUnder(rectFoot([1, 0.1, 2, 0.7], 0, 1), solids)?.wall).toBe('W1');
    // in the doorway under the lintel: not inside; up into the lintel: inside
    expect(wallUnder(rectFoot([2.5, -0.1, 3.5, 0.1], 0, 2), solids)).toBeNull();
    expect(wallUnder(rectFoot([2.5, -0.1, 3.5, 0.1], 0, 2.5), solids)?.wall).toBe('W1');
    // above the wall top: clear
    expect(wallUnder(rectFoot([1, -0.1, 2, 0.1], 4.2, 4.5), solids)).toBeNull();
  });

  it('pushes a piece within the limit out to the nearest face', () => {
    const r = clearOfWalls(rectFoot([1, 0.05, 2, 0.65], 0, 1), solids);
    expect(r).toEqual({ ok: true, dx: 0, dz: 0.1 });
    const s = clearOfWalls(rectFoot([1, -0.6, 2, -0.1], 0, 1), solids);
    expect(s).toEqual({ ok: true, dx: 0, dz: -0.05 });
    // a lamp point in the wall's middle leaves by the nearer face (0.15 m)
    const p = clearOfWalls(pointFoot(5, 0.02, 2.8), solids);
    expect(p.ok && Math.abs(p.dz - 0.13) < 1e-9 && p.dx === 0).toBe(true);
  });

  it('refuses a piece deeper in than the limit', () => {
    const r = clearOfWalls(rectFoot([1, -0.4, 2, 0.4], 0, 1), solids);
    expect(r).toEqual({ ok: false, why: 'Inside a wall', wall: 'W1' });
  });

  it('a line piece on the wall line is pushed (thin) or refused (thick); one along the face is clear', () => {
    const thin = clearOfWalls(segFoot([5, 0], [9, 0], 0.05, 1.8, 1.8), solids);
    expect(thin.ok && Math.abs(Math.abs(thin.dz) - 0.2) < 1e-9).toBe(true);
    expect(clearOfWalls(segFoot([5, 0], [9, 0], 0.2, 0, 1.2), solids).ok).toBe(false);
    expect(clearOfWalls(segFoot([5, 0.2], [9, 0.2], 0.05, 1.8, 1.8), solids)).toEqual({ ok: true, dx: 0, dz: 0 });
  });

  it('works on a turned wall (separating axis on its own direction)', () => {
    const w: Wall = { ...wall, a: [0, 0], b: [10, 10] };
    const ss = wallSolids([w], [], 'G');
    expect(overlap(pointFoot(5, 5, 1), ss[0]!)).not.toBeNull();
    expect(overlap(pointFoot(5.5, 4.5, 1), ss[0]!)).toBeNull();
  });
});
