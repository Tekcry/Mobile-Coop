/**
 * (anim-n4b PR fix) Two e2e regressions at the pose level:
 * - e2e-clip 'ladder down + slide': a fall straight out of a wall-front hold (let go of a ladder near its foot) took the
 *   air pose's legs-ahead lead into the ladder's wall. Such a fall keeps the legs under the body (`AIR_WALL_FROM`); a walk
 *   off a ledge or a jump still leads with them, and the arms still go out and up.
 * - e2e-netmove: the split brace's breath ran on each graph's own idle clock (random start), so the owner and the remote
 *   copy breathed out of phase. It now runs from the split's entry: two graphs entering together pose the same.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnimGraph, defaultInput, type AnimInput } from '../src/anim/animGraph';
import { proportions } from '../src/player/proportions';

const P = proportions();
const k = P.height / 1.75;
const DT = 1 / 120;

/** Ground for 1 s, then `before` (a traversal kind, or 'none') for 0.5 s, then a 0.6 s fall. Returns the graph. */
function fallAfter(before: AnimInput['traverse']): AnimGraph {
  const g = new AnimGraph(P);
  const i = defaultInput();
  i.armed = false;
  i.ready = true;
  for (let n = 0; n < 120; n++) g.update(DT, i);
  if (before !== 'none') {
    i.traverse = before;
    i.grounded = false;
    for (let n = 0; n < 60; n++) {
      i.traverseT = n / 60;
      g.update(DT, i);
    }
    i.traverse = 'none';
    i.traverseT = 0;
  }
  i.grounded = false;
  for (let n = 0; n < 72; n++) g.update(DT, i);
  return g;
}

describe('anim-n4b fix: a fall out of a wall-front hold keeps the legs under the body', () => {
  it('let go of a ladder / a hang: no legs-ahead lead (a walk-off fall leads); the arms still go up', () => {
    const free = fallAfter('none');
    const drop = fallAfter('drop');
    for (const kind of ['climb', 'hang', 'pipeClimb'] as const) {
      const g = fallAfter(kind);
      expect(free.out.stance.lZ - g.out.stance.lZ, kind).toBeGreaterThan(0.1 * k);
      expect(g.out.handL.y, kind).toBeCloseTo(free.out.handL.y, 1);
    }
    // a walk off a ledge (the drop move, from the ground) still leads
    expect(Math.abs(drop.out.stance.lZ - free.out.stance.lZ)).toBeLessThan(0.02 * k);
  });

  it('landed, the next fall leads again', () => {
    const g = new AnimGraph(P);
    const i = defaultInput();
    i.armed = false;
    i.ready = true;
    for (let n = 0; n < 120; n++) g.update(DT, i);
    i.traverse = 'climb';
    i.grounded = false;
    for (let n = 0; n < 30; n++) g.update(DT, i);
    i.traverse = 'none';
    for (let n = 0; n < 30; n++) g.update(DT, i);
    i.grounded = true;
    for (let n = 0; n < 120; n++) g.update(DT, i);
    const lz0 = g.out.stance.lZ;
    i.grounded = false;
    for (let n = 0; n < 72; n++) g.update(DT, i);
    expect(g.out.stance.lZ - lz0).toBeGreaterThan(0.1 * k);
  });
});

describe('anim-n4b fix: the split breath is in step on the owner and a remote copy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('two graphs with different idle clocks entering the split together pose the trunk the same', () => {
    const rnd = vi.spyOn(Math, 'random');
    rnd.mockReturnValue(0.1);
    const a = new AnimGraph(P);
    rnd.mockReturnValue(0.8);
    const b = new AnimGraph(P);
    rnd.mockRestore();
    const ia = defaultInput();
    const ib = defaultInput();
    for (let n = 0; n < 60; n++) {
      a.update(1 / 60, ia);
      b.update(1 / 60, ib);
    }
    ia.traverse = ib.traverse = 'split';
    let worst = 0;
    let lo = 9;
    let hi = -9;
    for (let n = 0; n < 6 * 60; n++) {
      a.update(1 / 60, ia);
      b.update(1 / 60, ib);
      if (n > 60) {
        worst = Math.max(worst, Math.abs(a.out.pelvis.roll - b.out.pelvis.roll), Math.abs(a.out.spine.pitch - b.out.spine.pitch));
        lo = Math.min(lo, a.out.pelvis.roll);
        hi = Math.max(hi, a.out.pelvis.roll);
      }
    }
    expect(hi - lo).toBeGreaterThan(0.03);
    expect(worst).toBeLessThan(1e-4);
  });
});
