import { describe, expect, it } from 'vitest';
import {
  SCENE_SWEEP,
  facePanYaw,
  nearestStop,
  panYaw,
  rejoinStop,
  sweepPeriod,
  sweepPlan,
  sweepTurnTime,
  wrapAng,
  type SweepPlan,
} from '../src/ai/sceneSweep';
import { ENEMY_CALM_MOTION } from '../src/config/movement';
import type { PatrolRoute, Pt } from '../src/ai/patrol';

const S = SCENE_SWEEP;
const W = ENEMY_CALM_MOTION.turnAim;
const ACC = ENEMY_CALM_MOTION.turnAccel;
/** The calm turn by hand: up to 60 deg/s, across, down (a turn past w^2 / a). */
const turnBig = (a: number): number => a / W + W / ACC;
const near = (a: number, b: number): number => Math.abs(wrapAng(a - b));

describe('sceneSweep (GA6a): constants', () => {
  it('holds the plan numbers (GA6-A1)', () => {
    expect(S.pace).toBe(0.7);
    expect(S.panTime).toBe(3);
    expect(S.panYaw).toBe(0.7);
    expect(S.postPan).toBe(8);
    expect(S.slack).toBe(0.8);
    expect(S.panGate).toBe(0.15);
  });
});

describe('sceneSweep: sweepTurnTime (N2)', () => {
  it('is 0 for no turn, the eased ramp for a small one, rate + ramp for a big one', () => {
    expect(sweepTurnTime(0)).toBe(0);
    const th = (W * W) / ACC;
    expect(sweepTurnTime(th * 0.5)).toBeCloseTo(2 * Math.sqrt((th * 0.5) / ACC), 9);
    expect(sweepTurnTime(Math.PI)).toBeCloseTo(Math.PI / W + W / ACC, 9);
    expect(sweepTurnTime(-Math.PI)).toBeCloseTo(sweepTurnTime(Math.PI), 12);
    // continuous at the switch
    expect(sweepTurnTime(th - 1e-9)).toBeCloseTo(sweepTurnTime(th + 1e-9), 6);
  });
});

describe('sceneSweep: sweepPlan schedule', () => {
  const lane: PatrolRoute = { points: [[0, 0], [0, 7]], waits: [3, 3] };

  it('a two-point lane: leg = length / pace + the turn off the pan + slack; leave and period follow', () => {
    const p = sweepPlan(lane, 0, 0, 0);
    // leaving stop 0 (pan centre pi, ends at pi -+ 0.7) onto heading 0: 2.4416 rad either side
    const leg = 7 / S.pace + turnBig(Math.PI - S.panYaw) + S.slack;
    expect(p.leave[0]).toBeCloseTo(3, 9);
    expect(p.leave[1]).toBeCloseTo(3 + leg + 3, 9);
    expect(p.period).toBeCloseTo(3 + leg + 3 + leg, 9);
    expect(sweepPeriod(lane)).toBeCloseTo(p.period, 12);
  });

  it('pan centres: the arrival heading, or faces[i]', () => {
    const p = sweepPlan(lane, 0, 0, 0);
    expect(near(p.centre[0]!, Math.PI)).toBeLessThan(1e-9);
    expect(near(p.centre[1]!, 0)).toBeLessThan(1e-9);
    expect(Number.isNaN(p.from[0]!)).toBe(true);
    const f = sweepPlan({ ...lane, faces: [1.2, -0.4] }, 0, 0, 0);
    expect(f.centre[0]).toBeCloseTo(1.2, 12);
    expect(f.centre[1]).toBeCloseTo(-0.4, 12);
  });

  it('the turn onto a face that is off the arrival heading is in the leg (N2)', () => {
    const base = sweepPlan(lane, 0, 0, 0);
    // stop 1 faces +x (pi/2) while arriving heading +z (0): the leg in gains the pi/2 turn
    const f = sweepPlan({ ...lane, faces: [Math.PI, Math.PI / 2] }, 0, 0, 0);
    const dIn = sweepTurnTime(Math.PI / 2);
    expect(f.leave[1]! - f.leave[0]!).toBeCloseTo(base.leave[1]! - base.leave[0]! + dIn, 9);
  });

  it('a wait omitted is SCENE_SWEEP.panTime (not PATROL.wait); route.wait is used before it', () => {
    expect(sweepPlan({ points: [[0, 0], [0, 7]] }, 0, 0, 0).wait[0]).toBe(S.panTime);
    expect(sweepPlan({ points: [[0, 0], [0, 7]], wait: 5 }, 0, 0, 0).wait[1]).toBe(5);
  });

  it('a corner (wait 0) adds no hold: arrive = leave', () => {
    const r: PatrolRoute = { points: [[0, 0], [0, 7], [7, 7]], waits: [3, 0, 3] };
    const p = sweepPlan(r, 0, 0, 0);
    expect(p.wait[1]).toBe(0);
    // leg 0 -> 1 into a corner: no slack, no turn in; the corner turn (pi/2) is on the leg out
    const leg0 = 7 / S.pace + sweepTurnTime(wrapAng(0 - p.centre[0]! + S.panYaw));
    const l0b = 7 / S.pace + sweepTurnTime(wrapAng(0 - p.centre[0]! - S.panYaw));
    const leg1 = 7 / S.pace + sweepTurnTime(Math.PI / 2) + S.slack + sweepTurnTime(wrapAng(p.centre[2]! - Math.PI / 2));
    expect(p.leave[1]).toBeCloseTo(p.leave[0]! + Math.max(leg0, l0b), 9);
    expect(p.leave[2]).toBeCloseTo(p.leave[1]! + leg1 + 3, 9);
  });

  it('a G4-shaped lap (out, a door stop facing +x, back) is tuned to 40 s with its end wait', () => {
    const pts: Pt[] = [[17.5, 2], [20.5, 2], [20.5, 4], [21.8, 4], [20.5, 4], [20.5, 2]];
    const faces = [-Math.PI / 2, 0, 0, Math.PI / 2, 0, 0];
    const mk = (end: number): PatrolRoute => ({ points: pts, waits: [end, 0, 0, 4, 0, 0], faces });
    // (an end wait of 0 would make stop 0 a corner: other leg times)
    const base = sweepPeriod(mk(1)) - 1;
    expect(sweepPeriod(mk(6)) - base).toBeCloseTo(6, 9);
    const end = 40 - base;
    expect(end).toBeGreaterThan(0);
    expect(sweepPeriod(mk(end))).toBeCloseTo(40, 9);
  });

  it('phase: start {idx, wait} = leave[idx] - wait; none = arriving at stop 0 (N1)', () => {
    const p = sweepPlan(lane, 0, 0, 0);
    expect(p.phase).toBeCloseTo(0, 12);
    expect(p.startIdx).toBe(0);
    const s = sweepPlan({ ...lane, start: { idx: 1, wait: 2 } }, 0, 0, 0);
    expect(s.startIdx).toBe(1);
    expect(s.phase).toBeCloseTo(p.leave[1]! - 2, 9);
  });

  it('a plain post: one stop, an 8 s pan round the post yaw', () => {
    const p = sweepPlan(null, 4, 5, 1.1);
    expect(p.pts.length).toBe(1);
    expect(p.pts[0]).toEqual([4, 5]);
    expect(p.wait[0]).toBe(S.postPan);
    expect(p.centre[0]).toBeCloseTo(1.1, 12);
    expect(p.period).toBeCloseTo(S.postPan, 12);
  });

  it('a two-point post on one spot with faces: a face pan each way on the shortest arc', () => {
    const p = sweepPlan({ points: [[3, 3], [3, 3]], waits: [8, 8], faces: [2.9, -2.5] }, 3, 3, 0);
    expect(p.from[1]).toBeCloseTo(2.9, 12);
    expect(p.centre[1]).toBeCloseTo(-2.5, 12);
    expect(p.from[0]).toBeCloseTo(-2.5, 12);
    expect(p.centre[0]).toBeCloseTo(2.9, 12);
    expect(p.period).toBeCloseTo(16, 12);
    // shortest arc 2.9 -> -2.5 is +0.883 through pi, not -5.4
    const arc = wrapAng(-2.5 - 2.9);
    expect(arc).toBeCloseTo(2 * Math.PI - 5.4, 9);
    expect(near(facePanYaw(2.9, -2.5, 8, 4), 2.9 + arc / 2)).toBeLessThan(1e-9);
    expect(near(facePanYaw(2.9, -2.5, 8, 8), -2.5)).toBeLessThan(1e-9);
    // past D it comes back
    expect(near(facePanYaw(2.9, -2.5, 8, 12), 2.9 + arc / 2)).toBeLessThan(1e-9);
    expect(near(facePanYaw(2.9, -2.5, 8, 16), 2.9)).toBeLessThan(1e-9);
  });
});

describe('sceneSweep: panYaw', () => {
  const D = 3;
  it('left at D/4, centre at D/2, right at 3D/4, held to D, repeats past D', () => {
    expect(panYaw(1, 1, D, 0)).toBeCloseTo(1, 12);
    expect(panYaw(1, 1, D, D / 4)).toBeCloseTo(1 - S.panYaw, 12);
    expect(panYaw(1, 1, D, D / 2)).toBeCloseTo(1, 12);
    expect(panYaw(1, 1, D, (3 * D) / 4)).toBeCloseTo(1 + S.panYaw, 12);
    expect(panYaw(1, 1, D, D * 0.95)).toBeCloseTo(1 + S.panYaw, 12);
    expect(panYaw(1, 1, D, D + D / 4)).toBeCloseTo(1 - S.panYaw, 9);
  });

  it('mirrored for side -1', () => {
    for (let t = 0; t < D * 2; t += 0.1) {
      expect(panYaw(0.5, -1, D, t) - 0.5).toBeCloseTo(-(panYaw(0.5, 1, D, t) - 0.5), 9);
    }
  });

  it('turns under the 60 deg/s calm rate at 3 s (the body tracks it)', () => {
    let max = 0;
    const dt = 0.01;
    for (let t = 0; t < D - dt; t += dt) {
      const r = Math.abs(wrapAng(panYaw(0, 1, D, t + dt) - panYaw(0, 1, D, t))) / dt;
      if (r > max) max = r;
    }
    expect(max).toBeLessThan(W);
    expect(max).toBeCloseTo(S.panYaw / (D / 4), 6);
  });

  it('wraps round pi', () => {
    expect(near(panYaw(Math.PI, 1, D, (3 * D) / 4), -Math.PI + S.panYaw)).toBeLessThan(1e-9);
  });
});

describe('sceneSweep: rejoin target (N3)', () => {
  const mk = (leave: number[], wait: number[], pts: Pt[], period: number): SweepPlan => ({
    pts,
    wait: Float64Array.from(wait),
    centre: new Float64Array(pts.length),
    from: new Float64Array(pts.length).fill(Number.NaN),
    leave: Float64Array.from(leave),
    period,
    phase: 0,
    startIdx: 0,
  });

  it('picks the pan stop he is back in step at soonest, not the one he just left', () => {
    const p = sweepPlan({ points: [[0, 0], [0, 7]], waits: [3, 3] }, 0, 0, 0);
    // just after leaving stop 0, 2 m along: stop 0 is nearest, but its next leave is almost a lap away
    const now = p.leave[0]! + 3;
    expect(nearestStop(p, 0, 2)).toBe(0);
    expect(rejoinStop(p, 0, 2, now)).toBe(1);
  });

  it('ties: the nearest', () => {
    const pace = S.pace;
    // both stops give the same back-in-step time from (2, 0)
    const p = mk([5, 5 + 6 / pace], [3, 3], [[0, 0], [10, 0]], 40);
    expect(rejoinStop(p, 2, 0, 0)).toBe(0);
    const q = mk([5 + 6 / pace, 5], [3, 3], [[10, 0], [0, 0]], 40);
    expect(rejoinStop(q, 2, 0, 0)).toBe(1);
  });

  it('corners are never targets; no pan stop at all: the nearest stop', () => {
    const p = mk([1, 2, 3], [0, 3, 0], [[0, 0], [10, 0], [1, 0]], 30);
    expect(rejoinStop(p, 0.5, 0, 0)).toBe(1);
    const q = mk([1, 2], [0, 0], [[0, 0], [10, 0]], 30);
    expect(rejoinStop(q, 9, 0, 0)).toBe(1);
  });
});
