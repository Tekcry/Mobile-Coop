import { describe, expect, it } from 'vitest';
import { NavGrid, type NavBlocker, type NavLinkInput, type NavSample } from '../src/ai/navGrid';

function grid(blockers: NavBlocker[], heights?: (x: number, z: number) => number): NavGrid {
  return new NavGrid({
    minX: -10, maxX: 10, minZ: -10, maxZ: 10, cell: 0.5,
    sample: (x, z) => ({ h: heights ? heights(x, z) : 0, ok: true }),
    blockers, agentRadius: 0.3, stepHeight: 0.45, seed: [-9, -9],
  });
}
const pathLen = (p: [number, number][], from: [number, number]) => {
  let l = 0; let prev = from;
  for (const q of p) { l += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
  return l;
};

/** A deck at 3 m over x 2..8 (the floor runs on under it); optionally a ramp up to it along z 6..8 from x -4. */
function storeys(opts: { ramp?: boolean; links?: NavLinkInput[]; seed?: [number, number] } = {}): NavGrid {
  return new NavGrid({
    minX: -10, maxX: 10, minZ: -10, maxZ: 10, cell: 0.5,
    sample: () => ({ h: 0, ok: true }),
    sampleLayers: (x, z): NavSample[] => {
      if (opts.ramp && z > 6 && z < 8 && x > -4 && x < 2) return [{ h: ((x + 4) / 6) * 3, ok: true }];
      if (x > 2 && x < 8) return [{ h: 0, ok: true }, { h: 3, ok: true }];
      return [{ h: 0, ok: true }];
    },
    blockers: [], links: opts.links, agentRadius: 0.3, stepHeight: 0.45, seed: opts.seed ?? [-9, -9],
  });
}

describe('NavGrid storeys and links', () => {
  it('a column holds a floor and the deck over it', () => {
    const g = storeys({ ramp: true });
    const lo = g.cellOf(5, 0, 0);
    const hi = g.cellOf(5, 0, 3);
    expect(lo).not.toBe(hi);
    expect(g.height[lo]).toBe(0);
    expect(g.height[hi]).toBe(3);
    expect(g.isWalkable(lo) && g.isWalkable(hi)).toBe(true);
    // no height: the lowest
    expect(g.cellOf(5, 0)).toBe(lo);
  });
  it('the floor runs on under the deck; the deck is reached up the ramp', () => {
    const g = storeys({ ramp: true });
    expect(g.lineClear([0, 0], [5, 0], 0, 0)).toBe(true);
    expect(g.lineClear([0, 0], [5, 0], 0, 3)).toBe(false);
    const p = g.findPath([-6, 0], [5, 0], 6000, 0, 3)!;
    expect(p).not.toBeNull();
    expect(p.some((q) => q[1] > 5.5 && q[0] < 2.5)).toBe(true);
    const under = g.findPath([-6, 0], [5, 0], 6000, 0, 0)!;
    expect(under.length).toBe(1);
  });
  it('a ladder joins the storeys both ways; the path marks where it starts', () => {
    const ladder: NavLinkInput = { kind: 'ladder', twoWay: true, pts: [1.2, 0, -5, 1.7, 0, -5, 1.7, 3, -5, 2.6, 3, -5] };
    const g = storeys({ links: [ladder] });
    expect(g.links.length).toBe(2);
    const up = g.findPath([-6, -5], [6, 0], 6000, 0, 3)!;
    const at = up.findIndex((q) => q.link);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(up[at]![0]).toBeCloseTo(1.2);
    expect(up[at]!.link!.kind).toBe('ladder');
    const down = g.findPath([6, 0], [-6, -5], 6000, 3, 0)!;
    expect(down.some((q) => q.link)).toBe(true);
    // the flow field reaches the floor through the ladder and steers onto it
    const f = g.flowField([[6, 0]], undefined, [3]);
    expect(Number.isFinite(f[g.cellOf(-6, -5, 0)]!)).toBe(true);
    const n = g.flowNext(f, 1.2, -5, 0)!;
    expect(n.link?.kind).toBe('ladder');
  });
  it('drops go down only', () => {
    const drop: NavLinkInput = { kind: 'drop', twoWay: false, pts: [7.5, 3, 0, 8.1, 3, 0, 8.6, 0, 0] };
    const g = storeys({ links: [drop], seed: [5, 0] });
    // seeded on the floor under the deck: the deck is pruned (nothing climbs to it)
    expect(g.walk[g.cols + g.cellOf(5, 0)]).toBe(0);
    // asked for the deck height: the (pruned) deck cell, not the floor under it
    expect(g.isWalkable(g.cellOf(5, 0, 3))).toBe(false);
    const deck = new NavGrid({
      minX: -10, maxX: 10, minZ: -10, maxZ: 10, cell: 0.5,
      sample: () => ({ h: 0, ok: true }),
      sampleLayers: (x): NavSample[] => (x > 2 && x < 8 ? [{ h: 0, ok: true }, { h: 3, ok: true }] : [{ h: 0, ok: true }]),
      layers: 2, blockers: [], links: [drop], agentRadius: 0.3, stepHeight: 0.45,
    });
    expect(deck.findPath([5, 0], [-6, 0], 6000, 3, 0)!.some((q) => q.link?.kind === 'drop')).toBe(true);
    expect(deck.findPath([-6, 0], [5, 0], 6000, 0, 3)).toBeNull();
  });
});

describe('NavGrid', () => {
  it('open ground: straight path after smoothing', () => {
    const g = grid([]);
    const p = g.findPath([-8, -8], [8, 8])!;
    expect(p.length).toBe(1);
    expect(p[0]).toEqual([8, 8]);
  });
  it('walls block and the path goes around', () => {
    // wall along x = 0 from z = -10 to 6 (gap at the top)
    const wall: NavBlocker = { cx: 0, cz: -2, hx: 0.2, hz: 8, yaw: 0, bottom: 0, top: 3 };
    const g = grid([wall]);
    expect(g.lineClear([-5, 0], [5, 0])).toBe(false);
    const p = g.findPath([-5, 0], [5, 0])!;
    expect(p).not.toBeNull();
    expect(pathLen(p, [-5, 0])).toBeGreaterThan(14);
    for (const q of p) expect(Math.abs(q[0]) > 0.4 || q[1] > 6).toBe(true);
  });
  it('rotated blockers are rasterised in local space', () => {
    const b: NavBlocker = { cx: 0, cz: 0, hx: 0.2, hz: 4, yaw: Math.PI / 2, bottom: 0, top: 3 };
    const g = grid([b]);
    // rotated 90°: the wall now runs along X
    expect(g.isWalkable(g.cellOf(3, 0))).toBe(false);
    expect(g.isWalkable(g.cellOf(0, 3))).toBe(true);
  });
  it('low obstacles below step height do not block; tall ones do', () => {
    const low: NavBlocker = { cx: 0, cz: 0, hx: 1, hz: 1, yaw: 0, bottom: 0, top: 0.3 };
    expect(grid([low]).isWalkable(grid([low]).cellOf(0, 0))).toBe(true);
    const high: NavBlocker = { ...low, top: 1.0 };
    const g = grid([high]);
    expect(g.isWalkable(g.cellOf(0, 0))).toBe(false);
  });
  it('height cliffs are not steppable; ramps are', () => {
    const cliff = grid([], (x) => (x > 0 ? 2 : 0));
    // the plateau is not connected to the seed region, so it is pruned
    expect(cliff.isWalkable(cliff.cellOf(5, 0))).toBe(false);
    const ramp = grid([], (x) => Math.max(0, Math.min(2, (x + 2) * 0.2)));
    expect(ramp.isWalkable(ramp.cellOf(5, 0))).toBe(true);
    const p = ramp.findPath([-5, 0], [5, 0])!;
    expect(p[p.length - 1]).toEqual([5, 0]);
  });
  it('flow field decreases towards the goal and flowNext steps downhill', () => {
    const g = grid([{ cx: 0, cz: 0, hx: 0.2, hz: 6, yaw: 0, bottom: 0, top: 3 }]);
    const f = g.flowField([[6, 0]]);
    expect(f[g.cellOf(6, 0)]).toBe(0);
    const a = f[g.cellOf(-6, 0)]!;
    expect(Number.isFinite(a)).toBe(true);
    const n = g.flowNext(f, -6, 0)!;
    expect(f[g.cellOf(n[0], n[1])]!).toBeLessThan(a);
  });
  it('unreachable islands are pruned from the seed region', () => {
    const ring: NavBlocker[] = [
      { cx: 5, cz: 3, hx: 3, hz: 0.2, yaw: 0, bottom: 0, top: 3 },
      { cx: 5, cz: 7, hx: 3, hz: 0.2, yaw: 0, bottom: 0, top: 3 },
      { cx: 2, cz: 5, hx: 0.2, hz: 2.2, yaw: 0, bottom: 0, top: 3 },
      { cx: 8, cz: 5, hx: 0.2, hz: 2.2, yaw: 0, bottom: 0, top: 3 },
    ];
    const g = grid(ring);
    expect(g.isWalkable(g.cellOf(5, 5))).toBe(false);
  });
});

import { killScore } from '../src/game/modes/score';

describe('kill score', () => {
  it('scores heavies and headshots higher', () => {
    expect(killScore('heavy', false, 1)).toBeGreaterThan(killScore('grunt', false, 1));
    expect(killScore('grunt', true, 1)).toBeGreaterThan(killScore('grunt', false, 1));
    expect(killScore('grunt', false, 5)).toBeGreaterThan(killScore('grunt', false, 1));
  });
});

describe('NavGrid layers per column', () => {
  // five storeys over the same columns (Dead Line v2 A block: basement, ground, first, second, roof)
  const stack = (layers?: number) => new NavGrid({
    minX: -4, maxX: 4, minZ: -4, maxZ: 4, cell: 0.5,
    sample: () => ({ h: 0, ok: true }),
    sampleLayers: (): NavSample[] => [-4, 0, 4.5, 9, 12.6].map((h) => ({ h, ok: true })),
    ...(layers ? { layers } : {}), blockers: [], agentRadius: 0.3, stepHeight: 0.45,
  });
  it('keeps three surfaces by default and drops the ones above', () => {
    const g = stack();
    expect(g.layers).toBe(3);
    expect(g.heightAt(0, 0, 12.6)).toBeCloseTo(4.5);
  });
  it('keeps every storey when the map raises the limit', () => {
    const g = stack(5);
    expect(g.layers).toBe(5);
    for (const h of [-4, 0, 4.5, 9, 12.6]) expect(g.heightAt(0, 0, h)).toBeCloseTo(h);
  });
});

describe('NavGrid extra flood seeds', () => {
  // two floor islands split by a wall at x 0 (no link between them)
  const islands = (extraSeeds?: [number, number, number][]) => new NavGrid({
    minX: -10, maxX: 10, minZ: -10, maxZ: 10, cell: 0.5,
    sample: (x) => ({ h: 0, ok: Math.abs(x) > 1 }),
    blockers: [], agentRadius: 0.3, stepHeight: 0.45, seed: [-9, -9], extraSeeds,
  });
  it('the spawn seed alone drops the far island; an extra seed keeps it', () => {
    expect(islands().findPath([5, 5], [6, 6])).toBeNull();
    expect(islands([[5, 0, 5]]).findPath([5, 5], [6, 6])).not.toBeNull();
    expect(islands([[5, 0, 5]]).findPath([-5, 5], [-6, 6])).not.toBeNull();
  });
  it('no extra seeds (or an empty list) keeps exactly the old region', () => {
    const a = islands();
    const b = islands([]);
    for (let i = 0; i < 40 * 40; i++) expect(b.isWalkable(i)).toBe(a.isWalkable(i));
  });
});

describe('(polish2 A184) findPath partial: the reached cell nearest an unreachable goal', () => {
  // two floor islands split by a 2 m gap at x -1..1 (both seeded: walkable, no way across)
  const g = new NavGrid({
    minX: -10, maxX: 10, minZ: -10, maxZ: 10, cell: 0.5,
    sample: (x) => ({ h: 0, ok: Math.abs(x) > 1 }),
    blockers: [], agentRadius: 0.3, stepHeight: 0.45, seed: [-9, -9], extraSeeds: [[5, 0, 5]],
  });
  it('default: still null; partial: ends on the near side of the gap, level with the goal, and says so', () => {
    expect(g.findPath([-6, 2], [6, -3])).toBeNull();
    expect(g.partialEnd).toBe(false);
    const p = g.findPath([-6, 2], [6, -3], 6000, Number.NaN, Number.NaN, true);
    expect(p).not.toBeNull();
    expect(g.partialEnd).toBe(true);
    const end = p![p!.length - 1]!;
    expect(end[0]).toBeLessThan(-1);
    expect(end[0]).toBeGreaterThan(-2.5);
    expect(Math.abs(end[1] - -3)).toBeLessThan(0.6);
    // standing on that end: nothing nearer (null), still a partial end
    expect(g.findPath([end[0], end[1]], [6, -3], 6000, Number.NaN, Number.NaN, true)).toBeNull();
    expect(g.partialEnd).toBe(true);
    // a reachable goal: the full path, not partial
    const q = g.findPath([-6, 2], [-3, -3], 6000, Number.NaN, Number.NaN, true)!;
    expect(g.partialEnd).toBe(false);
    expect(q[q.length - 1]).toEqual([-3, -3]);
  });
});
