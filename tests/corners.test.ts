import { describe, expect, it } from 'vitest';
import { buildCoverSegments, type CoverBox } from '../src/cover/coverData';
import { doorSide, findDoorways, outsideCorners, pickLean, sliceSteer, SLICE } from '../src/cover/corners';

/** Wall along x from x1 to x2 at z, 3 m tall, 0.4 thick. */
const wall = (x1: number, x2: number, z: number): CoverBox => ({ c: [(x1 + x2) / 2, 1.5, z], s: [x2 - x1, 3, 0.4], yaw: 0, pitch: 0, collide: true });

describe('doorways', () => {
  it('a 1.1 m gap between two collinear walls is one doorway', () => {
    const segs = buildCoverSegments([wall(-6, -0.55, 0), wall(0.55, 6, 0)]);
    const doors = findDoorways(segs);
    expect(doors).toHaveLength(1);
    const d = doors[0]!;
    expect(d.width).toBeCloseTo(1.1, 1);
    expect(d.x).toBeCloseTo(0, 1);
    expect(d.z).toBeCloseTo(0, 1);
    expect(Math.abs(d.nz)).toBeCloseTo(1);
  });
  it('gaps that are too wide or offset walls are not doorways', () => {
    expect(findDoorways(buildCoverSegments([wall(-6, -2, 0), wall(2, 6, 0)]))).toHaveLength(0);
    expect(findDoorways(buildCoverSegments([wall(-6, -0.55, 0), wall(0.55, 6, 1.5)]))).toHaveLength(0);
  });
  it('door side flips when crossing, inside only within the opening', () => {
    const d = findDoorways(buildCoverSegments([wall(-6, -0.55, 0), wall(0.55, 6, 0)]))[0]!;
    const a = doorSide(d, 0, -1);
    const b = doorSide(d, 0, 1);
    expect(Math.sign(a.side)).toBe(-Math.sign(b.side));
    expect(a.inside).toBe(true);
    expect(doorSide(d, 3, 1).inside).toBe(false);
  });
});

describe('slicing the pie', () => {
  const segs = buildCoverSegments([wall(-6, 0, 0)]);
  const corners = outsideCorners(segs);
  // the +z face's corner at x = 0, passing towards +x
  const k = corners.find((c) => c.nz > 0.9 && c.x > -0.1 && c.ox > 0.9)!;
  it('wall ends are outside corners on both faces', () => {
    expect(corners.length).toBeGreaterThanOrEqual(4);
    expect(k).toBeDefined();
  });
  it('approaching along the wall too close pushes out towards the standoff', () => {
    const near = sliceSteer(k, -2, 0.2 + 0.3, 1, 0);
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThanOrEqual(SLICE.push);
    // already at the standoff, moving away, past the corner, or far: no push
    expect(sliceSteer(k, -2, 0.2 + SLICE.standoff, 1, 0)).toBe(0);
    expect(sliceSteer(k, -2, 0.5, -1, 0)).toBe(0);
    expect(sliceSteer(k, 1, 0.5, 1, 0)).toBe(0);
    expect(sliceSteer(k, -5, 0.5, 1, 0)).toBe(0);
  });
});

describe('contextual lean', () => {
  it('leans to the clear side only when the aim is blocked', () => {
    expect(pickLean(false, true, true, 1)).toBe(0);
    expect(pickLean(true, false, true, -1)).toBe(1);
    expect(pickLean(true, true, false, 1)).toBe(-1);
    expect(pickLean(true, true, true, -1)).toBe(-1);
    expect(pickLean(true, false, false, 1)).toBe(0);
  });
});
