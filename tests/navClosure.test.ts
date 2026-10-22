import { describe, expect, it } from 'vitest';
import { NavGrid, type NavBlocker } from '../src/ai/navGrid';

/** (sector-fixes-r2 nav) Runtime closures: a bolted team door shuts its doorway on the guards' nav grid. */

/** A wall along x = 0 (z -10..10) with a 1 m doorway at z 0; a second floor at 3 m (no ramp) where told. */
function walled(upper = false): NavGrid {
  const wall = (cz: number, hz: number): NavBlocker => ({ cx: 0, cz, hx: 0.1, hz, yaw: 0, bottom: 0, top: 3 });
  return new NavGrid({
    minX: -6, maxX: 6, minZ: -10, maxZ: 10, cell: 0.5,
    sample: () => ({ h: 0, ok: true }),
    sampleLayers: upper ? () => [{ h: 0, ok: true }, { h: 3, ok: true }] : undefined,
    // the doorway z -0.9..0.9 (the agent radius eats 0.3 a side: 0.6 m of cells stay open)
    blockers: [wall(-5.45, 4.55), wall(5.45, 4.55)],
    agentRadius: 0.3, stepHeight: 0.45, seed: [-5, -5],
    extraSeeds: upper ? [[-5, 3, -5]] : undefined,
  });
}
/** The door's closure: plan centre (0, 0), the leaf along z (yaw 0: sin 0, cos 0), 1 m + 0.5 along, 0.35 across. */
const door = (g: NavGrid, y = 0) => g.addClosure(0, 0, 0.35, 0.75, 0, y);
const crosses = (p: [number, number][] | null) => !!p && p.length > 0;

describe('NavGrid closures', () => {
  it('a closed doorway blocks its cells and the path through; opening frees them', () => {
    const g = walled();
    const c = g.cellOf(0.1, 0.1);
    expect(g.isWalkable(c)).toBe(true);
    expect(crosses(g.findPath([-4, 0], [4, 0]))).toBe(true);
    const id = door(g);
    expect(g.closureSize(id)).toBeGreaterThan(0);
    // built open
    expect(g.isClosed(id)).toBe(false);
    expect(g.isWalkable(c)).toBe(true);
    const v0 = g.version;
    g.setClosed(id, true);
    expect(g.version).toBe(v0 + 1);
    expect(g.isWalkable(c)).toBe(false);
    expect(g.findPath([-4, 0], [4, 0])).toBeNull();
    expect(g.lineClear([-4, 0], [4, 0])).toBe(false);
    // a flow field from the far side does not reach through
    const f = g.flowField([[4, 0]]);
    expect(f[g.cellOf(-4, 0)]).toBe(Infinity);
    // shutting it twice changes nothing
    g.setClosed(id, true);
    expect(g.version).toBe(v0 + 1);
    g.setClosed(id, false);
    expect(g.isWalkable(c)).toBe(true);
    expect(crosses(g.findPath([-4, 0], [4, 0]))).toBe(true);
    expect(g.flowField([[4, 0]])[g.cellOf(-4, 0)]).toBeLessThan(Infinity);
  });

  it('overlapping closures keep a shared cell blocked until both are open', () => {
    const g = walled();
    const c = g.cellOf(0.1, 0.1);
    const a = door(g);
    // a second closure over the same doorway, a little offset
    const b = g.addClosure(0, 0.25, 0.35, 0.75, 0, 0);
    g.setClosed(a, true);
    // b collected the cells a holds shut too
    expect(g.closureSize(b)).toBeGreaterThan(0);
    g.setClosed(b, true);
    expect(g.isWalkable(c)).toBe(false);
    g.setClosed(a, false);
    expect(g.isWalkable(c)).toBe(false);
    expect(g.findPath([-4, 0], [4, 0])).toBeNull();
    g.setClosed(b, false);
    expect(g.isWalkable(c)).toBe(true);
    expect(crosses(g.findPath([-4, 0], [4, 0]))).toBe(true);
  });

  it('leaves wall cells and other storeys alone', () => {
    const g = walled(true);
    const wallCell = g.cellOf(0.1, 3, 0);
    expect(g.isWalkable(wallCell)).toBe(false);
    const id = g.addClosure(0, 0, 0.35, 4, 0, 0);
    g.setClosed(id, true);
    g.setClosed(id, false);
    // the wall cell was never collected, so opening never made it walkable
    expect(g.isWalkable(wallCell)).toBe(false);
    // the upper storey over the doorway stays walkable while the floor's doorway is shut
    g.setClosed(id, true);
    expect(g.isWalkable(g.cellOf(0.1, 0.1, 0))).toBe(false);
    expect(g.isWalkable(g.cellOf(0.1, 0.1, 3))).toBe(true);
  });

  it('a rotated door (leaf along x) shuts a doorway in a wall along z = 0', () => {
    const wall = (cx: number): NavBlocker => ({ cx, cz: 0, hx: 4.55, hz: 0.1, yaw: 0, bottom: 0, top: 3 });
    const g = new NavGrid({
      minX: -10, maxX: 10, minZ: -6, maxZ: 6, cell: 0.5,
      sample: () => ({ h: 0, ok: true }),
      blockers: [wall(-5.45), wall(5.45)],
      agentRadius: 0.3, stepHeight: 0.45, seed: [-5, -5],
    });
    expect(crosses(g.findPath([0, -4], [0, 4]))).toBe(true);
    // yaw pi / 2: the leaf along (sin, cos) = +x
    const id = g.addClosure(0, 0, 0.35, 0.75, Math.PI / 2, 0);
    g.setClosed(id, true);
    expect(g.findPath([0, -4], [0, 4])).toBeNull();
  });
});
