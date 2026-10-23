/**
 * (sector-redesign LR16c) Lamp placement audit on a 2-lamp fixture: a 10 x 10 m room, 3 m high, with a ceiling slab.
 * Lamp 0 hangs 0.5 m off the west wall (flagged, pushed back to 1.2 m); lamp 1 hangs in the middle (passes). Plus the
 * spot axis rule, the wall fitting's own-wall skip, the centre-line fallback and the framing shares.
 */
import { describe, expect, it } from 'vitest';
import type { VoxelShape } from '../src/voxel/shapes';
import { auditLamps, cast, crowds, faceDrop, frameViews, isEmissive, prepareScene, PUSH_TO, shareOf, SIGN_REACH, SPACING, standingSpots, VIEW_DARK, VIEW_LIT, WALL_NEAR } from '../src/world/lampAudit';
import { PHOTO } from '../src/world/lampMath';

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
      { id: 1, x: -4.6, y: 2.5, z: 3, cone: { dx: Math.SQRT1_2, dy: -Math.SQRT1_2, dz: 0 } },
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

describe('lamp audit rules (LR16dx: realistic moves)', () => {
  it('a sign stays on its wall: no push, a dim proposal whose reach stops short of the face', () => {
    // an exit sign on the north wall facing south, 0.4 m from the west wall; marked, and one known only by its small reach
    const sign = { id: 0, x: -4.6, y: 2.4, z: 4.9, cone: null, base: 'wall' as const, model: 'bulkhead', yaw: Math.PI };
    const [a, b] = auditLamps(room(), [{ ...sign, sign: true }, { ...sign, id: 1, reach: 0.96 }]);
    for (const r of [a!, b!]) {
      expect(r.flagged).toBe(true);
      expect(r.move!.how).toBe('dim');
      expect(r.move!.to).toBeNull();
      expect(r.move!.reach!).toBeLessThan(r.dist);
      expect(r.move!.radius! * PHOTO.reach).toBeLessThanOrEqual(r.move!.reach! + 1e-9);
    }
    expect(isEmissive({ ...sign, reach: SIGN_REACH + 0.5 })).toBe(false);
    // a sign whose glow does not reach the side wall is not flagged
    const [c] = auditLamps(room(), [{ ...sign, sign: true, reach: 0.3 }]);
    expect(c!.flagged).toBe(false);
  });

  it('a face beyond the light reach is not flagged; a dead fitting (reach 0) never is', () => {
    const [short, dead, live] = auditLamps(room(), [
      { id: 0, x: -4.5, y: 2.8, z: 0, cone: null, base: 'ceiling', reach: 0.4 },
      { id: 1, x: -4.5, y: 2.8, z: 2, cone: null, base: 'ceiling', reach: 0 },
      { id: 2, x: -4.5, y: 2.8, z: -2, cone: null, base: 'ceiling', reach: 8 },
    ]);
    expect(short!.flagged).toBe(false);
    expect(dead!.flagged).toBe(false);
    expect(live!.flagged).toBe(true);
  });

  it('a low unit well under the lamp is as near as its top edge, a full-height one at its face', () => {
    // a 1.3 m counter run 0.6 m off the lamp in plan, its top 1.5 m below it (a tilted ray meets its face): 1.62 m away
    // in 3D; the same run full height: 0.6 m
    const low = [...room(), box([-0.9, 0.65, 0], [0.6, 1.3, 6])];
    const tall = [...room(), box([-0.9, 1.5, 0], [0.6, 3, 6])];
    const [a] = auditLamps(low, [{ id: 0, x: 0, y: 2.8, z: 0, cone: null, base: 'ceiling' }]);
    const [b] = auditLamps(tall, [{ id: 0, x: 0, y: 2.8, z: 0, cone: null, base: 'ceiling' }]);
    expect(a!.flagged).toBe(false);
    expect(b!.flagged).toBe(true);
    expect(b!.dist).toBeCloseTo(0.6, 2);
    // a scan ray does meet the low run's face (the plan-distance reading flagged it at 0.6 m)
    const a5 = (5 * Math.PI) / 8;
    const h = cast(prepareScene(low), 0, 2.8, 0, Math.cos(a5) * Math.SQRT1_2, -Math.SQRT1_2, Math.sin(a5) * Math.SQRT1_2, 3);
    expect(h!.nx).toBeCloseTo(1, 6);
    expect(faceDrop(prepareScene(low), -0.62, 2.8, 0, 1.2)).toBeCloseTo(1.5, 6);
  });

  it('a thin post is not a wall', () => {
    // (LR16dx fix) a 5 cm post 0.45 m off the lamp, floor to ceiling (S2 lamp 62's case), paints no arc: not flagged;
    // a 0.2 m pier at the same spot is a wall face
    const post = [...room(), box([-0.45, 1.5, 0], [0.05, 3, 0.05])];
    const pier = [...room(), box([-0.45, 1.5, 0], [0.2, 3, 0.2])];
    const [a] = auditLamps(post, [{ id: 0, x: 0, y: 2.8, z: 0, cone: null, base: 'ceiling' }]);
    const [b] = auditLamps(pier, [{ id: 0, x: 0, y: 2.8, z: 0, cone: null, base: 'ceiling' }]);
    expect(a!.flagged).toBe(false);
    expect(a!.nearWall).toBeGreaterThan(WALL_NEAR);
    expect(b!.flagged).toBe(true);
    expect(b!.dist).toBeCloseTo(0.35, 2);
    // the post still stops a plain ray (it is a solid, only the near-wall scan sees through it)
    expect(cast(prepareScene(post), 0, 2.8, 0, -1, 0, 0, 3)!.t).toBeCloseTo(0.425, 6);
  });

  it('never two proposals on one spot: lamps off opposite walls of a 3.35 m room keep SPACING apart', () => {
    // walls at x +-1.675: both centre moves land on x 0 under the old rule
    const rows = auditLamps(room(3.35), [
      { id: 0, x: -0.925, y: 2.8, z: 0, cone: null, base: 'ceiling' },
      { id: 1, x: 0.925, y: 2.8, z: 0, cone: null, base: 'ceiling' },
    ]);
    const to = rows.map((r) => (r.move && r.move.how !== 'none' ? r.move.to! : null));
    expect(rows.every((r) => r.flagged)).toBe(true);
    const [p, q] = [to[0] ?? [-0.925, 2.8, 0], to[1] ?? [0.925, 2.8, 0]];
    expect(to[0]).not.toBeNull();
    expect(Math.hypot(p[0]! - q[0]!, p[2]! - q[2]!)).toBeGreaterThanOrEqual(SPACING);
  });

  it('two strips crowd when their bodies come within FIT_GAP, though their centres are SPACING apart', () => {
    const strip = { id: 0, x: 0, y: 5, z: 0, cone: null, foot: [1.2, 0.09] as const };
    expect(crowds(strip, 1.1, 0.1, { ...strip, id: 1 })).toBe(true);
    expect(crowds(strip, 1.6, 0.1, { ...strip, id: 1 })).toBe(false);
    expect(crowds(strip, 1.1, 1.4, { ...strip, id: 1 })).toBe(false);
    // another storey never crowds
    expect(crowds(strip, 0, 0, { ...strip, id: 1, y: 8 })).toBe(false);
  });

  it('a fitting turned by its yaw crowds along its turned plan, not its authored one', () => {
    const strip = { id: 0, x: 0, y: 5, z: 0, cone: null, foot: [1.2, 0.2] as const };
    const turned = { ...strip, yaw: Math.PI / 2 };
    const o = { ...strip, id: 1 };
    const oT = { ...turned, id: 1 };
    // yaw 0: long in x, so a neighbour 1.4 m along x is within the gap and one 1.4 m along z is not
    expect(crowds(strip, 1.4, 0.1, o)).toBe(true);
    expect(crowds(strip, 0.1, 1.4, o)).toBe(false);
    // yaw PI / 2: long in z, the reverse
    expect(crowds(turned, 0.1, 1.4, oT)).toBe(true);
    expect(crowds(turned, 1.4, 0.1, oT)).toBe(false);
  });

  it('a move toward the centre line goes only as far as needed and never past it', () => {
    // a full-height column (z 0.8 - 1.2, x -3.8 - -3.2) blocks the push target x -3.8 (0.8 m off its face)
    const col = [...room(), box([-3.5, 1.5, 1.0], [0.6, 3, 0.4])];
    const [a] = auditLamps(col, [{ id: 0, x: -4.5, y: 2.8, z: 0, cone: null, base: 'ceiling' }]);
    expect(a!.move!.how).toBe('centre');
    expect(a!.move!.to![0]).toBeGreaterThan(-3.8);
    expect(a!.move!.to![0]).toBeLessThan(-1);
    expect(a!.move!.after).toBeGreaterThanOrEqual(WALL_NEAR);
    // a full-height wall run 0.8 m off every spot up to the centre line: no proposal past the line
    const run = [...room(), box([-2.5, 1.5, 1.0], [5, 3, 0.4])];
    const [b] = auditLamps(run, [{ id: 0, x: -4.5, y: 2.8, z: 0, cone: null, base: 'ceiling' }]);
    expect(b!.move!.how).toBe('none');
    expect(b!.move!.to === null || b!.move!.to[0] <= 1e-6).toBe(true);
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
