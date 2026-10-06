import { describe, expect, it } from 'vitest';
import {
  EDGE_BACK,
  EDGE_ROUND,
  OVER_HALF,
  WALL_HALF,
  clampAim,
  edgeLimit,
  overLimit,
  pitchMin,
  wallLimit,
  wrapAngle,
  type AimLimit,
  type AimState,
} from '../src/cover/coverAim';

const lim = (): AimLimit => ({ yaw: 0, half: 0, clear: Infinity, reach: 1 });
// a face along x, its outward normal towards -z (the player stands at -z, the cover is at +z)
const NX = 0;
const NZ = -1;
const ACROSS = Math.atan2(-NX, -NZ); // straight over / across the cover: +z = yaw 0

describe('cover aim limits', () => {
  it('wraps angles into (-pi, pi]', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2);
  });

  it('edge peek: from a little back across the cover (stepping out) round past the edge, never along it behind', () => {
    // peeking past the +x edge
    const l = edgeLimit(NX, NZ, 1, 0, lim());
    expect(l.clear).toBe(Infinity);
    const lo = wrapAngle(l.yaw - l.half);
    const hi = wrapAngle(l.yaw + l.half);
    // one end is EDGE_BACK back across the cover (away from the edge side), the other EDGE_ROUND round towards +x
    expect(Math.min(Math.abs(wrapAngle(lo - ACROSS)), Math.abs(wrapAngle(hi - ACROSS)))).toBeCloseTo(EDGE_BACK);
    expect(l.half * 2).toBeCloseTo(EDGE_ROUND + EDGE_BACK);
    // +x is yaw +pi/2: inside; -x (back across the face, behind the cover) is outside
    expect(Math.abs(wrapAngle(Math.PI / 2 - l.yaw))).toBeLessThanOrEqual(l.half);
    expect(Math.abs(wrapAngle(-Math.PI / 2 - l.yaw))).toBeGreaterThan(l.half);
    // the other edge mirrors it
    const r = edgeLimit(NX, NZ, -1, 0, lim());
    expect(wrapAngle(r.yaw - ACROSS)).toBeCloseTo(-wrapAngle(l.yaw - ACROSS));
  });

  it('over low cover: centred across the top, with a pitch floor that tightens sideways', () => {
    const l = overLimit(NX, NZ, 0.13, 0.6, lim());
    expect(l.yaw).toBeCloseTo(ACROSS);
    expect(l.half).toBe(OVER_HALF);
    const straight = pitchMin(l, 0);
    const side = pitchMin(l, 1.2);
    expect(straight).toBeLessThan(0);
    // further along the top when aiming sideways: a shallower allowed dip
    expect(side).toBeGreaterThan(straight);
    // the floor never lets the line dip below the far edge of the top
    expect(Math.tan(-straight) * 0.6).toBeLessThanOrEqual(0.13 + 1e-9);
  });

  it('high cover away from an edge: only away from the wall', () => {
    const l = wallLimit(NX, NZ, lim());
    expect(l.yaw).toBeCloseTo(Math.atan2(NX, NZ));
    expect(l.half).toBe(WALL_HALF);
    expect(pitchMin(l, 0)).toBe(-Infinity);
    // into the wall (+z) is outside
    expect(Math.abs(wrapAngle(ACROSS - l.yaw))).toBeGreaterThan(l.half);
  });

  it('clampAim: a hard stop once inside, an eased approach when the limit starts outside', () => {
    const l = wallLimit(NX, NZ, lim());
    const a: AimState = { yaw: l.yaw, pitch: 0, inside: false };
    clampAim(a, l, 1 / 60);
    expect(a.inside).toBe(true);
    // pushing past the edge stops dead at it
    a.yaw = l.yaw + l.half + 0.3;
    clampAim(a, l, 1 / 60);
    expect(wrapAngle(a.yaw - l.yaw)).toBeCloseTo(l.half);
    expect(a.inside).toBe(true);
    // starting well outside: moves towards the range at a limited rate
    const b: AimState = { yaw: ACROSS, pitch: 0, inside: false };
    const before = Math.abs(wrapAngle(b.yaw - l.yaw));
    clampAim(b, l, 1 / 60);
    const after = Math.abs(wrapAngle(b.yaw - l.yaw));
    expect(after).toBeLessThan(before);
    expect(before - after).toBeLessThan(0.2);
    for (let k = 0; k < 120; k++) clampAim(b, l, 1 / 60);
    expect(b.inside).toBe(true);
  });

  it('clampAim: over low cover lifts an aim that dips into the top', () => {
    const l = overLimit(NX, NZ, 0.13, 0.6, lim());
    const a: AimState = { yaw: l.yaw, pitch: 0, inside: true };
    clampAim(a, l, 1 / 60);
    a.pitch = -0.6;
    clampAim(a, l, 1 / 60);
    expect(a.pitch).toBeCloseTo(pitchMin(l, 0));
  });
});
