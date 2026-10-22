/**
 * (sector-fixes-r2 jump) The solo reach helper (tests/helpers/soloJumpReach.ts): the in-air grab reach and the top
 * landing (a running jump that lands on a higher top by the controller's step-up), read from the movement tables.
 */
import { describe, expect, it } from 'vitest';
import { GEARS, LEAP, MOVEMENT } from '../src/config/movement';
import { GRAVITY } from '../src/physics/havok';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { lastTimeAtOrOver, SOLO_TOP_SPEED, soloTopLandingReach, soloTopLandingThreats } from './helpers/soloJumpReach';

const G = -GRAVITY.y;
/** The same sum written out: feet at or over `to - maxStep` until t, the run's pace, a radius each end. */
const byHand = (from: number, to: number): number => {
  const y = to - MOVEMENT.maxStep - from;
  const disc = LEAP.vy * LEAP.vy - 2 * G * y;
  if (disc < 0) return 0;
  return Math.min(LEAP.maxSpeed, Math.max(...GEARS.stand) * LEAP.carry) * ((LEAP.vy + Math.sqrt(disc)) / G) + 2 * MOVEMENT.radius;
};

describe('soloTopLandingReach', () => {
  it('reads the movement tables (jump speed, gravity, step, radius, the top gear)', () => {
    expect(SOLO_TOP_SPEED).toBeCloseTo(Math.min(LEAP.maxSpeed, Math.max(...GEARS.stand) * LEAP.carry), 9);
    for (const [from, to] of [[4.0, 4.4], [4.0, 4.5], [4.0, 4.0], [3.3, 4.4], [2.0, 2.3]] as const) expect(soloTopLandingReach(from, to)).toBeCloseTo(byHand(from, to), 9);
  });

  it('R2S (4.0) to R3S (4.4): about 3.10 m, so the old 3.0 m gap was in reach; 4.5 still about 3.05', () => {
    expect(soloTopLandingReach(4.0, 4.4)).toBeGreaterThan(3.0);
    expect(soloTopLandingReach(4.0, 4.4)).toBeCloseTo(3.10, 1);
    expect(soloTopLandingReach(4.0, 4.5)).toBeGreaterThan(3.0);
    expect(soloTopLandingReach(4.0, 4.5)).toBeLessThan(soloTopLandingReach(4.0, 4.4));
  });

  it('0 when the apex never lifts the feet within the step of the top', () => {
    const apex = (LEAP.vy * LEAP.vy) / (2 * G);
    expect(soloTopLandingReach(2.0, 2.0 + apex + MOVEMENT.maxStep + 0.01)).toBe(0);
    expect(soloTopLandingReach(2.0, 4.4)).toBe(0);
    expect(soloTopLandingReach(2.0, 2.0 + apex + MOVEMENT.maxStep - 0.01)).toBeGreaterThan(0);
    expect(lastTimeAtOrOver(0, apex + 0.01)).toBeNull();
  });

  it('grows as the far top drops', () => {
    let prev = 0;
    for (let to = 4.8; to >= 3.6; to -= 0.1) {
      const r = soloTopLandingReach(4.0, to);
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
  });
});

describe('soloTopLandingThreats', () => {
  const solidOf = (b: LevelBuilder): BoxPiece[] => b.boxes.filter((p) => p.collide);
  /** A 4.0 top (x -2.3..0, z 0..7) and a 4.4 co-op top `gap` m east of it. */
  const pair = (gap: number): { solid: BoxPiece[]; q: { x0: number; x1: number; z0: number; z1: number; top: number } } => {
    const b = new LevelBuilder();
    b.block(-1.15, 3.5, 2.3, 4.0, 7.0, '#fff');
    const q = { x0: gap, x1: gap + 2.3, z0: 0, z1: 7, top: 4.4 };
    b.block(gap + 1.15, 3.5, 2.3, 4.4, 7.0, '#fff');
    b.mark(b.boxes.length - 1, { noLedge: true });
    return { solid: solidOf(b), q };
  };
  const coop = (q: { x0: number }) => (p: BoxPiece): boolean => p.c[0] > q.x0;

  it('a 4.0 top 3.0 m from a 4.4 top lands on it; 3.7 m clears it by 0.5', () => {
    const near = pair(3.0);
    expect(soloTopLandingThreats(near.solid, near.q, coop(near.q))).toHaveLength(1);
    const far = pair(3.7);
    expect(soloTopLandingThreats(far.solid, far.q, coop(far.q))).toEqual([]);
    expect(soloTopLandingThreats(far.solid, far.q, coop(far.q), 0.5)).toEqual([]);
    expect(soloTopLandingThreats(far.solid, far.q, coop(far.q), 0.7)).toHaveLength(1);
  });

  it('a wall between the tops (over the far top\'s height) stops it', () => {
    const { solid, q } = pair(3.0);
    const b = new LevelBuilder();
    b.box(1.5, 3.0, 3.5, 0.3, 6.0, 7.0, '#fff');
    expect(soloTopLandingThreats([...solid, ...solidOf(b)], q, coop(q))).toEqual([]);
  });

  it('a noLedge top over the mantle is no take-off (nothing climbs it alone); a low top never reaches', () => {
    const { solid, q } = pair(3.0);
    solid[0]!.noLedge = true;
    expect(soloTopLandingThreats(solid, q, coop(q))).toEqual([]);
    const b = new LevelBuilder();
    b.block(-1.15, 3.5, 2.3, 2.0, 7.0, '#fff');
    expect(soloTopLandingThreats([...solidOf(b), solid[1]!], q, coop(q))).toEqual([]);
  });
});
