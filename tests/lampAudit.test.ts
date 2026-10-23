/**
 * (sector-redesign LR16c) Lamp placement audit on a 2-lamp fixture: a 10 x 10 m room, 3 m high, with a ceiling slab.
 * Lamp 0 hangs 0.5 m off the west wall (flagged, pushed back to 1.2 m); lamp 1 hangs in the middle (passes). Plus the
 * spot axis rule, the wall fitting's own-wall skip, the centre-line fallback and the framing shares.
 */
import { describe, expect, it } from 'vitest';
import type { VoxelShape } from '../src/voxel/shapes';
import { auditLamps, frameViews, prepareScene, PUSH_TO, shareOf, standingSpots, VIEW_DARK, VIEW_LIT, WALL_NEAR } from '../src/world/lampAudit';

const box = (c: [number, number, number], s: [number, number, number]): VoxelShape => ({ kind: 'box', c, s, yaw: 0, pitch: 0, mat: 1 });
const room = (w = 10): VoxelShape[] => {
  const h = w / 2;
  return [
    box([0, -0.1, 0], [w + 0.4, 0.2, w + 0.4]),
    box([0, 3.1, 0], [w + 0.4, 0.2, w + 0.4]),
    box([-h - 0.1, 1.5, 0], [0.2, 3, w + 0.4]),
    box([h + 0.1, 1.5, 0], [0.2, 3, w + 0.4]),
    box([0, 1.5, -h - 0.1], [w + 0.4, 3, 0.2]),
    box([0, 1.5, h + 0.1], [w + 0.4, 3, 0.2]),
  ];
};

describe('lamp audit, 2-lamp fixture', () => {
  const rows = auditLamps(room(), [
    { id: 0, x: -4.5, y: 2.8, z: 0, cone: null, base: 'ceiling' },
    { id: 1, x: 0, y: 2.8, z: 0, cone: null, base: 'ceiling' },
  ]);

  it('flags the lamp 0.5 m off the west wall with the wall normal', () => {
    const a = rows[0]!;
    expect(a.flagged).toBe(true);
    expect(a.rule).toBe('wall');
    expect(a.mount).toBe('ceiling');
    expect(a.dist).toBeCloseTo(0.5, 3);
    expect(a.normal![0]).toBeCloseTo(1, 6);
    expect(Math.abs(a.normal![2])).toBeLessThan(1e-6);
  });

  it('pushes it back along the normal to 1.2 m, keeping its height', () => {
    const m = rows[0]!.move!;
    expect(m.how).toBe('push');
    expect(m.to).toEqual([-3.8, 2.8, 0]);
    expect(m.dx).toBeCloseTo(PUSH_TO - 0.5, 6);
    expect(m.dz).toBe(0);
    expect(m.after).toBeCloseTo(PUSH_TO, 2);
    expect(m.ceilGap).toBeCloseTo(0.2, 3);
  });

  it('passes the lamp in the middle of the room', () => {
    const b = rows[1]!;
    expect(b.flagged).toBe(false);
    expect(b.move).toBeNull();
    expect(b.dist).toBeGreaterThan(WALL_NEAR);
  });
});

describe('lamp audit rules', () => {
  it('flags a spot whose axis meets a wall within 0.6 m, not one aimed away', () => {
    const [near, away] = auditLamps(room(), [
      { id: 0, x: -4.6, y: 2.5, z: 0, cone: { dx: -Math.SQRT1_2, dy: -Math.SQRT1_2, dz: 0 } },
      { id: 1, x: -4.6, y: 2.5, z: 0, cone: { dx: Math.SQRT1_2, dy: -Math.SQRT1_2, dz: 0 } },
    ]);
    expect(near!.rule).toBe('axis');
    expect(near!.flagged).toBe(true);
    expect(near!.dist).toBeCloseTo(0.4 * Math.SQRT2, 3);
    expect(near!.move!.how).toBe('push');
    expect(away!.flagged).toBe(false);
  });

  it('a bulkhead ignores its own wall and slides along it, away from the side wall', () => {
    // on the north wall (z 5), facing south (yaw PI), 0.4 m from the west wall
    const [w] = auditLamps(room(), [{ id: 0, x: -4.6, y: 2.4, z: 4.9, cone: null, base: 'wall', model: 'bulkhead', yaw: Math.PI }]);
    expect(w!.mount).toBe('wall');
    expect(w!.flagged).toBe(true);
    expect(w!.dist).toBeCloseTo(0.4, 3);
    expect(w!.move!.how).toBe('push');
    expect(w!.move!.to![0]).toBeCloseTo(-3.8, 6);
    expect(w!.move!.dz).toBe(0);
  });

  it('a corridor too narrow for 1.2 m from both walls gets the centre line, still flagged in its note', () => {
    const [c] = auditLamps(room(1.8), [{ id: 0, x: -0.6, y: 2.8, z: 0, cone: null, base: 'ceiling' }]);
    expect(c!.flagged).toBe(true);
    expect(c!.move!.how).toBe('none');
    expect(c!.move!.to![0]).toBeCloseTo(0, 6);
    expect(c!.move!.note).toMatch(/room 1\.80 m across/);
  });
});

describe('framing audit', () => {
  it('splits levels into lit / dim / dark', () => {
    const s = shareOf([VIEW_LIT + 0.1, VIEW_LIT + 0.2, 0.35, VIEW_DARK - 0.1]);
    expect(s).toEqual({ lit: 0.5, dim: 0.25, dark: 0.25 });
  });

  it('finds the floor spot and flags a uniformly dark room as no pool, a pooled one not', () => {
    const sc = prepareScene(room());
    const all = standingSpots(sc, 10);
    // the roof (open sky) and the floor
    expect(all).toHaveLength(2);
    expect(all[0]![1]).toBeCloseTo(3.2, 6);
    expect(all[1]![1]).toBeCloseTo(0, 6);
    expect(frameViews(sc, all.slice(0, 1), () => 0.1).every((v) => v.sky)).toBe(true);
    const spots = all.slice(1);
    const dark = frameViews(sc, spots, () => 0.1);
    expect(dark).toHaveLength(4);
    expect(dark.every((v) => v.noPool && !v.noDark && !v.sky)).toBe(true);
    const pool = frameViews(sc, spots, (x, _y, z) => (Math.hypot(x, z) < 3 ? 0.7 : 0.1));
    expect(pool.every((v) => !v.noPool && !v.noDark)).toBe(true);
  });
});
