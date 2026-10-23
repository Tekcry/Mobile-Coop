import { describe, expect, it } from 'vitest';
import { closedDoorCrossing, type GhostDoor } from '../src/vfx/doorGhosts';

// a leaf from hinge (0,0) along +z: yaw 0 -> edge (sin 0, cos 0) * width = (0, w)
const door = (open: number): GhostDoor => ({ open, anchor: { yaw: 0, width: 1, hinge: { x: 0, z: 0 } } });
const out = { x: 0, z: 0 };

describe('thermal door ghosts (G102)', () => {
  it('a guard behind a shut door gets a ghost at the leaf', () => {
    expect(closedDoorCrossing([door(0)], -2, 0.5, 2, 0.5, out)).toBe(true);
    expect(out.x).toBeCloseTo(0);
    expect(out.z).toBeCloseTo(0.5);
  });

  it('an open door gets none', () => {
    expect(closedDoorCrossing([door(0.6)], -2, 0.5, 2, 0.5, out)).toBe(false);
  });

  it('a sight line that misses the leaf, or stays on one side, gets none', () => {
    expect(closedDoorCrossing([door(0)], -2, 1.5, 2, 1.5, out)).toBe(false); // passes beyond the leaf's width
    expect(closedDoorCrossing([door(0)], 1, 0.5, 3, 0.5, out)).toBe(false); // both on one side
    expect(closedDoorCrossing([door(0)], 0, -1, 0, 1, out)).toBe(false); // parallel to the leaf
  });

  it('no doors, no ghost; only a closed one counts among several', () => {
    expect(closedDoorCrossing([], -2, 0.5, 2, 0.5, out)).toBe(false);
    expect(closedDoorCrossing([door(1), door(0)], -2, 0.5, 2, 0.5, out)).toBe(true);
  });
});
