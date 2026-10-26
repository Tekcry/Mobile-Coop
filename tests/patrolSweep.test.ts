import { describe, expect, it } from 'vitest';
import { hyp2 } from '../src/core/mathx';
import { PATROL, PatrolWalker, type PatrolRoute } from '../src/ai/patrol';
import { SCENE_SWEEP, rejoinStop, sweepPlan, wrapAng, type SweepPlan } from '../src/ai/sceneSweep';
import { SEPARATION, stepApart, steerFrom, type SepBody } from '../src/ai/separation';

/**
 * (guard-ai piano GA6a) The walker's sweep mode on a straight-line stand-in: he walks at `SCENE_SWEEP.pace` straight at
 * the point `step` gives, turns at once (no body yaw passed: the pan starts on arrival).
 */
const DT = 1 / 60;
const S = SCENE_SWEEP;
const ROUTE: PatrolRoute = { points: [[0, 0], [0, 7], [7, 7]], waits: [3, 0, 3] };

interface Body {
  x: number;
  z: number;
}
/** A departure: the stop he left and the loop time he left it at. */
type Dep = [number, number];

class Sim {
  readonly b: Body;
  held = false;
  readonly deps: Dep[] = [];
  /** Per hold: the stop, the look yaws in order. */
  readonly holds: { idx: number; yaws: number[] }[] = [];
  readonly heldAt: number[] = [];
  t = 0;
  constructor(
    readonly w: PatrolWalker,
    x: number,
    z: number,
  ) {
    this.b = { x, z };
  }
  run(secs: number, bodyYaw = Number.NaN): void {
    const end = this.t + secs - 1e-9;
    while (this.t < end) this.tick(bodyYaw);
  }
  tick(bodyYaw = Number.NaN): void {
    const w = this.w;
    this.t += DT;
    w.tick(DT);
    const i0 = w.idx;
    const was = this.held;
    const tgt = w.step(DT, this.b.x, this.b.z, bodyYaw);
    this.held = tgt === null;
    if (was && !this.held) this.deps.push([i0, w.sweepTime()]);
    if (this.held) {
      if (!was) this.holds.push({ idx: w.idx, yaws: [] });
      this.holds[this.holds.length - 1]!.yaws.push(w.lookYaw);
      this.heldAt.push(w.idx);
    }
    if (tgt) {
      const dx = tgt[0] - this.b.x;
      const dz = tgt[1] - this.b.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      const s = Math.min(d, S.pace * DT);
      if (d > 1e-9) {
        this.b.x += (dx / d) * s;
        this.b.z += (dz / d) * s;
      }
    }
  }
}

/** Loop time difference a - b wrapped to (-P/2, P/2]. */
const lapDiff = (a: number, b: number, p: number): number => {
  let d = (((a - b) % p) + p) % p;
  if (d > p / 2) d -= p;
  return d;
};

const swept = (plan: SweepPlan, side = 1, x = 0, z = 0): Sim => {
  const w = new PatrolWalker(ROUTE, 0, 0, 0);
  w.setSweep(plan, side, plan.phase);
  return new Sim(w, x, z);
};

describe('patrol sweep (GA6a): setSweep / clearSweep / sweeping', () => {
  it('sweeping follows set and clear; sweepTime runs from t0 on the walker clock', () => {
    const plan = sweepPlan(ROUTE, 0, 0, 0);
    const w = new PatrolWalker(ROUTE, 0, 0, 0);
    expect(w.sweeping).toBe(false);
    expect(Number.isNaN(w.sweepTime())).toBe(true);
    w.tick(5);
    w.setSweep(plan, 1, 2);
    expect(w.sweeping).toBe(true);
    expect(w.sweepPlan).toBe(plan);
    expect(w.sweepTime()).toBeCloseTo(2, 12);
    w.tick(1.5);
    expect(w.sweepTime()).toBeCloseTo(3.5, 12);
    w.clearSweep();
    expect(w.sweeping).toBe(false);
    expect(w.sweepPlan).toBe(null);
  });
});

describe('patrol sweep: the schedule', () => {
  const plan = sweepPlan(ROUTE, 0, 0, 0);

  it('leaves every pan stop at its leave, lap after lap (5 laps), and two runs are identical', () => {
    const a = swept(plan);
    a.run(plan.period * 5 + 1);
    const b = swept(plan);
    b.run(plan.period * 5 + 1);
    expect(a.deps).toEqual(b.deps);
    // two pan stops per lap
    expect(a.deps.length).toBe(10);
    for (const [i, t] of a.deps) {
      const d = lapDiff(t, plan.leave[i]!, plan.period);
      expect(d).toBeGreaterThanOrEqual(-1e-9);
      expect(d).toBeLessThan(DT + 1e-9);
    }
    expect(a.b.x).toBeCloseTo(b.b.x, 12);
    expect(a.b.z).toBeCloseTo(b.b.z, 12);
  });

  it('corners pass: he only ever holds at pan stops', () => {
    const a = swept(plan);
    a.run(plan.period * 3);
    expect(a.heldAt.length).toBeGreaterThan(0);
    for (const i of a.heldAt) expect(plan.wait[i]).toBeGreaterThan(0);
  });

  it('pans left, then right, at every pan stop every lap (side +1); mirrored for side -1; an early arrival looks at the centre, then one full cycle ends at leave (GA6b)', () => {
    for (const side of [1, -1]) {
      const a = swept(plan, side);
      a.run(plan.period * 5);
      expect(a.holds.length).toBeGreaterThanOrEqual(9);
      let early = 0;
      for (let k = 0; k < a.deps.length; k++) {
        // every finished hold: the last look is the far extreme (the cycle was not cut part way into a second one)
        const h = a.holds[k]!;
        const c = plan.centre[h.idx]!;
        const D = plan.wait[h.idx]!;
        const ys = h.yaws;
        expect(wrapAng(ys[ys.length - 1]! - c)).toBeCloseTo(side * S.panYaw, 6);
        const cyc = Math.round(D / DT);
        if (ys.length > cyc + 2) {
          early++;
          // longer than D (he came early: no turn on the stand-in): the centre until leave - D
          for (let j = 0; j < ys.length - cyc - 3; j++) expect(ys[j]).toBeCloseTo(c, 9);
          // then the whole cycle: out to the first side at D/4 from its start
          expect(wrapAng(ys[ys.length - cyc - 1 + Math.round(cyc / 4)]! - c)).toBeCloseTo(-side * S.panYaw, 1);
        }
      }
      expect(early).toBeGreaterThan(0);
      // (the run may end inside a hold still looking at the centre: finished holds only)
      for (const h of a.holds.slice(0, a.deps.length)) {
        const c = plan.centre[h.idx]!;
        let iMin = 0;
        let iMax = 0;
        let lo = Infinity;
        let hi = -Infinity;
        h.yaws.forEach((y, k) => {
          const o = wrapAng(y - c);
          if (o < lo - 1e-9) {
            lo = o;
            iMin = k;
          }
          if (o > hi + 1e-9) {
            hi = o;
            iMax = k;
          }
        });
        expect(lo).toBeLessThan(-S.panYaw + 0.02);
        expect(hi).toBeGreaterThan(S.panYaw - 0.02);
        // side +1: left (negative) first; side -1: right first
        if (side > 0) expect(iMin).toBeLessThan(iMax);
        else expect(iMax).toBeLessThan(iMin);
      }
    }
  });

  it('waits for the body to face the pan start before the pan cycle runs (N2), still leaves at leave', () => {
    const a = swept(plan);
    // first step: arrived at stop 0, holding, looking at the centre
    const c = plan.centre[0]!;
    a.tick(c + 1);
    expect(a.held).toBe(true);
    expect(a.w.lookYaw).toBeCloseTo(c, 12);
    // the body far off: the look stays on the centre
    for (let k = 0; k < 60; k++) a.tick(c + 1);
    expect(a.w.lookYaw).toBeCloseTo(c, 12);
    // the body arrives within the gate: the cycle starts from 0, left at D/4
    a.tick(c + S.panGate * 0.5);
    expect(a.w.lookYaw).toBeCloseTo(c, 12);
    const q = Math.round(plan.wait[0]! / 4 / DT);
    for (let k = 0; k < q; k++) a.tick(c);
    expect(wrapAng(a.w.lookYaw - c)).toBeCloseTo(-S.panYaw, 6);
    a.run(plan.period);
    const [i, t] = a.deps[0]!;
    expect(i).toBe(0);
    expect(lapDiff(t, plan.leave[0]!, plan.period)).toBeLessThan(DT + 1e-9);
  });

  it('a start phase: he holds the start stop for start.wait', () => {
    const r: PatrolRoute = { ...ROUTE, start: { idx: 2, wait: 1.25 } };
    const p = sweepPlan(r, 0, 0, 0);
    const w = new PatrolWalker(r, 0, 0, 0);
    w.setSweep(p, 1, p.phase);
    const s = new Sim(w, 7, 7);
    s.tick();
    expect(s.held).toBe(true);
    expect(w.idx).toBe(2);
    expect(w.waiting).toBeCloseTo(1.25 - DT, 9);
  });
});

describe('patrol sweep: posts', () => {
  it('a plain post pans 8 s round its yaw, round and round, never walking', () => {
    const p = sweepPlan(null, 2, 3, 0.4);
    const w = new PatrolWalker(null, 2, 3, 0.4);
    w.setSweep(p, 1, p.phase);
    const s = new Sim(w, 2, 3);
    s.tick();
    let walked = false;
    for (let k = 0; k < Math.round(2 / DT); k++) {
      s.tick();
      if (!s.held) walked = true;
    }
    // 2 s = D/4: left
    expect(wrapAng(w.lookYaw - 0.4)).toBeCloseTo(-S.panYaw, 2);
    for (let k = 0; k < Math.round(30 / DT); k++) {
      s.tick();
      if (!s.held) walked = true;
    }
    expect(walked).toBe(false);
    expect(s.b.x).toBe(2);
    expect(s.b.z).toBe(3);
  });

  it('a two-point post on one spot face-pans 8 s each way', () => {
    const r: PatrolRoute = { points: [[1, 1], [1, 1]], waits: [8, 8], faces: [0.5, 2.0] };
    const p = sweepPlan(r, 1, 1, 0);
    const w = new PatrolWalker(r, 1, 1, 0);
    w.setSweep(p, 1, p.phase);
    const s = new Sim(w, 1, 1);
    s.tick();
    // stop 0 is reached from stop 1 (one spot): from 2.0 to 0.5
    s.run(4 - DT);
    expect(w.idx).toBe(0);
    expect(w.lookYaw).toBeCloseTo(1.25, 1);
    s.run(4);
    // stop 1: from 0.5 to 2.0
    s.run(4);
    expect(w.idx).toBe(1);
    expect(w.lookYaw).toBeCloseTo(1.25, 1);
    s.run(3.9);
    expect(w.lookYaw).toBeCloseTo(2.0, 1);
    expect(s.b.x).toBe(1);
  });
});

describe('patrol sweep: rejoin (N3)', () => {
  const plan = sweepPlan(ROUTE, 0, 0, 0);

  it('from off the route: the soonest pan stop, held until its leave, then back in step', () => {
    const ref = swept(plan);
    const a = swept(plan);
    ref.run(9);
    a.run(9);
    // pulled off to (4, 2) for 6 s (the clock runs on)
    a.b.x = 4;
    a.b.z = 2;
    for (let k = 0; k < Math.round(6 / DT); k++) {
      a.t += DT;
      a.w.tick(DT);
      ref.tick();
    }
    const k = rejoinStop(plan, 4, 2, a.w.sweepTime());
    a.w.rejoin(4, 2);
    expect(a.w.idx).toBe(k);
    expect(plan.wait[k]).toBeGreaterThan(0);
    a.held = false;
    const n0 = a.deps.length;
    a.run(plan.period * 3);
    ref.run(plan.period * 3);
    // he first leaves the rejoin stop at its leave, then every pan stop at its leave
    expect(a.deps[n0]![0]).toBe(k);
    for (let m = n0; m < a.deps.length; m++) {
      const [i, t] = a.deps[m]!;
      const d = lapDiff(t, plan.leave[i]!, plan.period);
      expect(d).toBeGreaterThanOrEqual(-1e-9);
      expect(d).toBeLessThan(DT + 1e-9);
    }
    // and walks with the undisturbed walker again
    expect(hyp2(a.b.x - ref.b.x, a.b.z - ref.b.z)).toBeLessThan(0.05);
  });

  it('a rejoin hold is at most one lap', () => {
    const a = swept(plan);
    a.run(2);
    a.w.rejoin(0.2, 3.5);
    a.held = false;
    a.run(plan.period + 30);
    expect(a.deps.length).toBeGreaterThan(0);
    for (const h of a.holds) expect(h.yaws.length * DT).toBeLessThanOrEqual(plan.period + 2 * DT);
  });

  it('a rejoin hold longer than 2 D pans whole cycles while he waits, the last one ending at leave (GA6b)', () => {
    const a = swept(plan);
    a.run(2);
    a.w.rejoin(0.2, 3.5);
    a.held = false;
    const k0 = a.holds.length;
    a.run(plan.period + 30);
    const h = a.holds[k0]!;
    const D = plan.wait[h.idx]!;
    const c = plan.centre[h.idx]!;
    expect(h.yaws.length * DT).toBeGreaterThan(2 * D);
    // the far extreme (side +1: right) reached more than once, and the hold ends on it
    let rights = 0;
    for (let k = 1; k < h.yaws.length; k++) {
      const o = wrapAng(h.yaws[k]! - c);
      const p = wrapAng(h.yaws[k - 1]! - c);
      if (o >= S.panYaw - 1e-6 && p < S.panYaw - 1e-6) rights++;
    }
    expect(rights).toBeGreaterThan(1);
    expect(wrapAng(h.yaws[h.yaws.length - 1]! - c)).toBeCloseTo(S.panYaw, 6);
  });

  it('two walkers on one schedule are abreast again after rejoining at different stops', () => {
    const a = swept(plan);
    const b = swept(plan);
    a.run(5);
    b.run(5);
    a.b.x = 0.5;
    a.b.z = 1.5;
    a.w.rejoin(a.b.x, a.b.z);
    a.held = false;
    b.run(4);
    a.run(4);
    b.b.x = 6;
    b.b.z = 5.5;
    b.w.rejoin(b.b.x, b.b.z);
    b.held = false;
    a.run(plan.period * 2);
    b.run(plan.period * 2);
    for (let k = 0; k < Math.round(plan.period / DT); k++) {
      a.tick();
      b.tick();
      expect(hyp2(a.b.x - b.b.x, a.b.z - b.b.z)).toBeLessThan(0.05);
    }
  });
});

describe('patrol sweep: off his storey (GA6 fix round, check A FIX 2)', () => {
  const plan = sweepPlan(ROUTE, 0, 0, 0);

  it('away under a stop: the stop to walk to, never a hold or a pan; back on his storey he holds there', () => {
    const w = new PatrolWalker(ROUTE, 0, 0, 0);
    w.setSweep(plan, 1, plan.phase);
    const k = w.idx;
    const p = plan.pts[k]!;
    expect(plan.wait[k]).toBeGreaterThan(0);
    for (let s = 0; s < Math.round((plan.period + 5) / DT); s++) {
      w.tick(DT);
      expect(w.step(DT, p[0], p[1], Number.NaN, true)).toBe(p);
      expect(w.idx).toBe(k);
      expect(w.waiting).toBe(0);
      expect(Number.isNaN(w.lookYaw)).toBe(true);
    }
    w.tick(DT);
    expect(w.step(DT, p[0], p[1])).toBeNull();
  });

  it('a hold in progress is not panned while away; he is sent back to the stop, the hold goes on once he is up', () => {
    const w = new PatrolWalker(ROUTE, 0, 0, 0);
    w.setSweep(plan, 1, plan.phase);
    const p = plan.pts[w.idx]!;
    w.tick(DT);
    expect(w.step(DT, p[0], p[1])).toBeNull();
    const left = w.waiting;
    expect(left).toBeGreaterThan(4 * DT);
    w.tick(DT);
    expect(w.step(DT, p[0], p[1], Number.NaN, true)).toBe(p);
    expect(Number.isNaN(w.lookYaw)).toBe(true);
    w.tick(DT);
    expect(w.step(DT, p[0], p[1])).toBeNull();
    expect(w.waiting).toBeCloseTo(left - 2 * DT, 9);
  });
});

describe('patrol sweep: off the sweep nothing changes (N4)', () => {
  /** Step a plain walker as `enemy.ts` does, returning everything it said. */
  const trace = (w: PatrolWalker, x0: number, z0: number): number[] => {
    const out: number[] = [];
    let x = x0;
    let z = z0;
    for (let k = 0; k < 2400; k++) {
      w.tick(DT);
      const t = w.step(DT, x, z);
      out.push(t ? t[0] * 1000 + t[1] : -1, w.lookYaw, w.idx);
      if (t) {
        const dx = t[0] - x;
        const dz = t[1] - z;
        const d = Math.sqrt(dx * dx + dz * dz);
        const s = Math.min(d, 1.1 * DT);
        if (d > 1e-9) {
          x += (dx / d) * s;
          z += (dz / d) * s;
        }
      }
    }
    return out;
  };

  for (const route of [
    { points: [[0, 0], [0, 7], [7, 7]], waits: [3, 0, 3] } as PatrolRoute,
    { points: [[0, 0], [6, 0]], loop: { period: 30, leave: [5, 20], t0: 0 } } as PatrolRoute,
    null,
  ]) {
    it(`set true then false behaves as a never-swept walker (${route ? (route.loop ? 'timed loop' : 'route') : 'post'})`, () => {
      const a = new PatrolWalker(route, 0, 0, 0.3, 2);
      const b = new PatrolWalker(route, 0, 0, 0.3, 2);
      a.setSweep(sweepPlan(route, 0, 0, 0.3), -1, 4);
      a.step(DT, 0, 0);
      a.rejoin(3, 1);
      a.clearSweep();
      expect(a.sweeping).toBe(false);
      a.rejoin(0, 0);
      b.rejoin(0, 0);
      expect(trace(a, 0, 0)).toEqual(trace(b, 0, 0));
    });
  }

  it('a non-sweep step ignores the body yaw argument', () => {
    const a = new PatrolWalker(ROUTE, 0, 0, 0);
    const b = new PatrolWalker(ROUTE, 0, 0, 0);
    for (let k = 0; k < 600; k++) {
      a.tick(DT);
      b.tick(DT);
      expect(a.step(DT, 0, 0, 2.5)).toEqual(b.step(DT, 0, 0));
      expect(a.lookYaw).toEqual(b.lookYaw);
    }
    expect(PATROL.wait).toBe(9);
  });
});

describe('separation: steerFrom skip (GA6a)', () => {
  const body = (x: number, z: number): SepBody => ({ pos: { x, y: 0, z }, solid: true });

  it('the skipped guard gives no soft push; others still do; the hard floor still holds against him', () => {
    const me = body(0, 0);
    const mate = body(0.7, 0);
    const other = body(0, -0.8);
    const list = [me, mate, other];
    const all = { x: 0, z: 0 };
    steerFrom(me, 0, 1, S.pace, list, all);
    const skip = { x: 0, z: 0 };
    steerFrom(me, 0, 1, S.pace, list, skip, mate);
    const only = { x: 0, z: 0 };
    steerFrom(me, 0, 1, S.pace, [me, other], only);
    expect(skip.x).toBeCloseTo(only.x, 12);
    expect(skip.z).toBeCloseTo(only.z, 12);
    expect(all.x).toBeLessThan(skip.x - 0.5);
    // a step into him is still cut at SEPARATION.min
    const out = { x: 0, z: 0 };
    expect(stepApart(me, 0.3, 0, list, out)).toBe(true);
    expect(hyp2(out.x - 0.7, out.z)).toBeGreaterThanOrEqual(SEPARATION.min - 1e-9);
  });

  it('skip null (the default) is the old push', () => {
    const me = body(0, 0);
    const list = [me, body(0.6, 0.2)];
    const a = { x: 0, z: 0 };
    const b = { x: 0, z: 0 };
    steerFrom(me, 1, 0, 1, list, a);
    steerFrom(me, 1, 0, 1, list, b, null);
    expect(a).toEqual(b);
  });
});
