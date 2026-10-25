import { describe, expect, it } from 'vitest';
import type { SectorDef, SectorRoute } from '../src/game/sectors';
import type { StageDoorInfo } from '../src/game/sectorStage';
import { checkSoloRoutes, legCrossesDoor } from '../src/game/sectorSolo';
import { hyp2 } from '../src/core/mathx';

/** (sector-batch, G280, M17) The solo-route check on synthetic sections: a door at (0, 0) whose leaf runs along x. */

const DOOR: StageDoorInfo = { cx: 0, cz: 0, yaw: Math.PI / 2, width: 1, y: 0 };
const doorAt = (x: number, z: number): StageDoorInfo | null => (hyp2(x, z) <= 0.5 ? DOOR : null);

const pose = { x: 0, y: 0, z: 0, yaw: 0 };
const sec = (over: Partial<SectorDef>): SectorDef => ({
  id: 's',
  name: 's',
  start: pose,
  objective: { kind: 'hack', label: 'x', x: 0, y: 0, z: 0, yaw: 0 },
  guards: [],
  reinforce: [],
  perStage: 2,
  routes: [],
  ...over,
});
const gate = (door: readonly [number, number]) => ({ door, a: { at: [-1, -1] as const }, b: { at: [1, -1] as const } });
const THROUGH: SectorRoute = { name: 'through', pts: [[0, -5], [0, 5]], obj: 1 };
const ROUND: SectorRoute = { name: 'round', pts: [[0, -5], [3, -5], [3, 5], [0, 5]], obj: 1 };

describe('sector-batch: solo routes past team doors (G280)', () => {
  it('legCrossesDoor: through the leaf and its 0.3 m pad, at the leaf floor, not parallel', () => {
    expect(legCrossesDoor([0, -2], [0, 2], DOOR)).toBe(true);
    expect(legCrossesDoor([2, -2], [2, 2], DOOR)).toBe(false);
    expect(legCrossesDoor([0.7, -2], [0.7, 2], DOOR)).toBe(true);
    expect(legCrossesDoor([0.9, -2], [0.9, 2], DOOR)).toBe(false);
    expect(legCrossesDoor([0, -2, 4], [0, 2, 4], DOOR)).toBe(false);
    expect(legCrossesDoor([-2, 0], [2, 0], DOOR)).toBe(false);
  });

  it('a pair gate with a route through it and one round it passes', () => {
    expect(checkSoloRoutes([sec({ pairGates: [gate([0, 0])], routes: [THROUGH, ROUND] })], doorAt)).toEqual([]);
  });

  it('a pair gate with only the route through it fails, naming the route', () => {
    const out = checkSoloRoutes([sec({ pairGates: [gate([0, 0])], routes: [THROUGH] })], doorAt);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('no route avoids the team doors');
    expect(out[0]).toContain('through');
  });

  it('a plain bolt counts as a team door (BRIEF A6)', () => {
    const out = checkSoloRoutes([sec({ bolts: [{ at: [0, 0], side: [1, 0], w: 1 }], routes: [THROUGH] })], doorAt);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('no route avoids the team doors');
  });

  it('a team door with no door anchor near it is a problem', () => {
    const out = checkSoloRoutes([sec({ pairGates: [gate([10, 10])], routes: [THROUGH, ROUND] })], doorAt);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('no door at team door (10, 10)');
  });

  it('a section with no team doors passes', () => {
    expect(checkSoloRoutes([sec({ routes: [THROUGH] })], doorAt)).toEqual([]);
  });
});
