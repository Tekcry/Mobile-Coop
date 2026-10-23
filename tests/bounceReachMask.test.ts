/**
 * (LR16-P polish) The shader's reach set (`nsGrid2`, `src/world/bakedLamps.ts`), written out in `helpers/bounceRead.ts`
 * as `reachMask`, held against a plain breadth-first search over the cube's 8 corners for EVERY closed-edge set of the
 * 12 edges (4096), every start corner (8), clean and with junk bits on the positions no axis reads (2): 65536 cases.
 *
 * Corners k = x + 2y + 4z. `ea[i]` / `eb[i]` (i = x + 2y) hold the z = 0 / z = 1 corners; a set bit is a closed edge:
 * bit 1 the +x edge (corners with x 0), bit 2 the +y edge (corners with y 0), bit 4 the +z edge (`ea` only).
 */
import { describe, expect, it } from 'vitest';
import { reachMask } from './helpers/bounceRead';

/** The 12 edges as [corner a, corner b, array (0 = ea, 1 = eb), index, bit]. */
const EDGES: ReadonlyArray<readonly [number, number, 0 | 1, number, number]> = (() => {
  const out: Array<[number, number, 0 | 1, number, number]> = [];
  for (let k = 0; k < 8; k++) {
    const i = k & 3;
    const arr = k < 4 ? 0 : 1;
    if ((k & 1) === 0) out.push([k, k + 1, arr, i, 1]);
    if ((k & 2) === 0) out.push([k, k + 2, arr, i, 2]);
    if ((k & 4) === 0) out.push([k, k + 4, 0, i, 4]);
  }
  return out;
})();

/** The component of `h` over the open edges (closed = bit i of `closed`), as a corner bit mask. */
function bfs(closed: number, h: number): number {
  const seen = new Set<number>([h]);
  const queue = [h];
  while (queue.length) {
    const k = queue.pop()!;
    EDGES.forEach(([a, b], e) => {
      if ((closed >> e) & 1) return;
      const o = a === k ? b : b === k ? a : -1;
      if (o >= 0 && !seen.has(o)) {
        seen.add(o);
        queue.push(o);
      }
    });
  }
  let m = 0;
  for (const k of seen) m |= 1 << k;
  return m;
}

describe('(LR16-P) nsGrid2 reach mask = the BFS component of the start corner', () => {
  it('all 4096 closed-edge sets x 8 start corners x (clean, junk bits) agree', () => {
    expect(EDGES.length).toBe(12);
    let cases = 0;
    let mismatches = 0;
    let first = '';
    for (let closed = 0; closed < 4096; closed++) {
      const ea = [0, 0, 0, 0];
      const eb = [0, 0, 0, 0];
      EDGES.forEach(([, , arr, i, bit], e) => {
        if ((closed >> e) & 1) (arr === 0 ? ea : eb)[i]! |= bit;
      });
      for (const junk of [false, true]) {
        const ja = ea.slice();
        const jb = eb.slice();
        if (junk) {
          // positions no axis reads: bit 1 on x = 1 corners (1, 3), bit 2 on y = 1 corners (2, 3), bit 4 on `eb`
          for (const i of [1, 3]) {
            ja[i]! |= 1;
            jb[i]! |= 1;
          }
          for (const i of [2, 3]) {
            ja[i]! |= 2;
            jb[i]! |= 2;
          }
          for (let i = 0; i < 4; i++) jb[i]! |= 4;
        }
        for (let h = 0; h < 8; h++) {
          const want = bfs(closed, h);
          const got = reachMask(ja, jb, h);
          cases++;
          if (got !== want) {
            mismatches++;
            if (!first) first = `closed ${closed} h ${h} junk ${junk}: got ${got}, want ${want}`;
          }
        }
      }
    }
    expect(cases).toBe(65536);
    expect(first).toBe('');
    expect(mismatches).toBe(0);
  });

  it('no closed edge reaches all 8 corners (255)', () => {
    for (let h = 0; h < 8; h++) expect(reachMask([0, 0, 0, 0], [0, 0, 0, 0], h)).toBe(255);
  });
});
