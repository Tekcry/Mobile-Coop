import { describe, expect, it } from 'vitest';
import { PAIRS, PAIR_LINES, PairMeet, pairWindow, postedDef, stopWindow, type LoopWindow, type PairDef } from '../src/ai/pairs';
import { PatrolWalker, type PatrolRoute, type Pt } from '../src/ai/patrol';
import { hyp2 } from '../src/core/mathx';

// (guard-ai S10, GA2) talking pairs: the meeting window from the loop clocks, the talk, a disturbance, a missing partner.

const SPEED = 1.2;
const PERIOD = 60;
// two timed loops that meet 2 m apart at stop 1 (A at (-1, 0), B at (1, 0)) from ~7.5 s to 25 s of each loop
const routeA = (): PatrolRoute => ({
  points: [
    [-10, 0],
    [-1, 0],
    [-10, 8],
  ],
  loop: { period: PERIOD, leave: [0, 25, 40], t0: 0 },
});
const routeB = (): PatrolRoute => ({
  points: [
    [10, 0],
    [1, 0],
    [10, 8],
  ],
  loop: { period: PERIOD, leave: [0, 25, 40], t0: 0 },
});

interface Said {
  t: number;
  who: number;
  line: string;
}

/** Walks both guards on their real patrol walkers and feeds the pair; `downB(t)` takes B out. */
function run(
  seconds: number,
  opts: { id?: number; downB?: (t: number) => boolean; onStep?: (t: number, pm: PairMeet) => void } = {},
): { pm: PairMeet; said: Said[]; states: Set<string> } {
  const ra = routeA();
  const rb = routeB();
  const w: LoopWindow = { open: 0, close: 0 };
  expect(pairWindow(ra, 1, rb, 1, SPEED, w)).toBe(true);
  const def: PairDef = { id: opts.id ?? 3, period: PERIOD, t0: 0, open: w.open, close: w.close, aPt: ra.points[1]!, bPt: rb.points[1]! };
  const pm = new PairMeet(def);
  const wa = new PatrolWalker(ra, 0, 0, 0);
  const wb = new PatrolWalker(rb, 0, 0, 0);
  const pa: Pt = [ra.points[0]![0], ra.points[0]![1]];
  const pb: Pt = [rb.points[0]![0], rb.points[0]![1]];
  const said: Said[] = [];
  const states = new Set<string>();
  const dt = 0.1;
  const move = (walker: PatrolWalker, p: Pt): void => {
    walker.tick(dt);
    const tgt = walker.step(dt, p[0], p[1]);
    if (!tgt) return;
    const dx = tgt[0] - p[0];
    const dz = tgt[1] - p[1];
    const d = hyp2(dx, dz);
    const s = Math.min(d, SPEED * dt);
    if (d > 1e-6) {
      p[0] += (dx / d) * s;
      p[1] += (dz / d) * s;
    }
  };
  for (let i = 1; i <= Math.round(seconds / dt); i++) {
    const t = i * dt;
    move(wa, pa);
    const bDown = opts.downB?.(t) ?? false;
    if (!bDown) move(wb, pb);
    pm.a.present = true;
    pm.a.calm = true;
    pm.a.x = pa[0];
    pm.a.z = pa[1];
    pm.a.routeX = ra.points[wa.idx]![0];
    pm.a.routeZ = ra.points[wa.idx]![1];
    pm.b.present = !bDown;
    pm.b.calm = true;
    pm.b.x = pb[0];
    pm.b.z = pb[1];
    pm.b.routeX = rb.points[wb.idx]![0];
    pm.b.routeZ = rb.points[wb.idx]![1];
    opts.onStep?.(t, pm);
    pm.step(dt);
    states.add(pm.state);
    if (pm.sayLine) said.push({ t, who: pm.sayWho, line: pm.sayLine });
  }
  return { pm, said, states };
}

describe('lines', () => {
  it('6-10 two-line exchanges, every line <= 90 characters', () => {
    expect(PAIR_LINES.length).toBeGreaterThanOrEqual(6);
    expect(PAIR_LINES.length).toBeLessThanOrEqual(10);
    for (const ex of PAIR_LINES) {
      expect(ex.length).toBe(2);
      for (const l of ex) {
        expect(l.length).toBeGreaterThan(0);
        expect(l.length).toBeLessThanOrEqual(PAIRS.maxChars);
      }
    }
  });
});

describe('meeting window', () => {
  it('stopWindow: previous leave + walk to this leave', () => {
    const w: LoopWindow = { open: 0, close: 0 };
    expect(stopWindow(routeA(), 1, SPEED, w)).toBe(true);
    expect(w.open).toBeCloseTo(9 / SPEED, 5);
    expect(w.close).toBe(25);
    expect(stopWindow({ points: [[0, 0], [1, 0]] }, 0, SPEED, w)).toBe(false);
  });

  it('pairWindow: the overlap, B moved into A loop time by the t0 difference', () => {
    const w: LoopWindow = { open: 0, close: 0 };
    const rb = routeB();
    rb.loop!.t0 = 5; // B's walker is 5 s ahead: its stay is 5 s earlier in A's time
    expect(pairWindow(routeA(), 1, rb, 1, SPEED, w)).toBe(true);
    expect(w.open).toBeCloseTo(9 / SPEED, 5);
    expect(w.close).toBeCloseTo(20, 5);
    const rc = routeB();
    rc.loop!.period = 50;
    expect(pairWindow(routeA(), 1, rc, 1, SPEED, w)).toBe(false);
  });
});

describe('PairMeet', () => {
  it('a pair meets, faces each other and exchanges two lines in order, then splits', () => {
    const facing: number[] = [];
    const { pm, said, states } = run(PERIOD, {
      id: 3,
      onStep: (_t, p) => {
        if (p.state === 'meeting') facing.push(p.faceA, p.faceB);
      },
    });
    expect(pm.meetings).toBe(1);
    expect(said.length).toBe(2);
    const ex = PAIR_LINES[3 % PAIR_LINES.length]!;
    expect(said[0]!.line).toBe(ex[0]);
    expect(said[1]!.line).toBe(ex[1]);
    expect(said[0]!.who).toBe(0); // A opens the first meeting
    expect(said[1]!.who).toBe(1);
    expect(Math.abs(said[1]!.t - said[0]!.t - PAIRS.lineGap)).toBeLessThan(0.15);
    // both inside the window (~7.5 .. 25 s)
    expect(said[0]!.t).toBeGreaterThan(7);
    expect(said[1]!.t).toBeLessThan(25);
    // A at (-1, 0) faces +X (pi/2), B faces -X
    expect(facing.length).toBeGreaterThan(0);
    expect(facing[0]).toBeCloseTo(Math.PI / 2, 1);
    expect(facing[1]).toBeCloseTo(-Math.PI / 2, 1);
    expect(states.has('done')).toBe(true);
    expect(states.has('missing')).toBe(false);
    expect(pm.state).toBe('idle');
  });

  it('same inputs, same lines (deterministic); another pair id picks another exchange', () => {
    const r1 = run(PERIOD * 2, { id: 5 });
    const r2 = run(PERIOD * 2, { id: 5 });
    expect(r1.said).toEqual(r2.said);
    const r3 = run(PERIOD * 2, { id: 6 });
    expect(r3.said[0]!.line).not.toBe(r1.said[0]!.line);
  });

  it('works over several loop periods: one meeting each, the next exchange each time, the opener alternates', () => {
    const { pm, said } = run(PERIOD * 3, { id: 7 });
    expect(pm.meetings).toBe(3);
    expect(said.length).toBe(6);
    const n = PAIR_LINES.length;
    for (let m = 0; m < 3; m++) {
      const ex = PAIR_LINES[(7 + m) % n]!;
      expect(said[m * 2]!.line).toBe(ex[0]);
      expect(said[m * 2 + 1]!.line).toBe(ex[1]);
      expect(said[m * 2]!.who).toBe(m & 1);
      expect(said[m * 2 + 1]!.who).toBe((m + 1) & 1);
      // each meeting falls in its own loop's window
      expect(Math.floor(said[m * 2]!.t / PERIOD)).toBe(m);
    }
  });

  it('interrupt stops the talk for that window; the next loop they meet again', () => {
    let cut = false;
    const { pm, said, states } = run(PERIOD * 2, {
      onStep: (_t, p) => {
        if (!cut && p.state === 'meeting' && p.linesSaid === 1) {
          p.interrupt();
          cut = true;
        }
      },
    });
    expect(cut).toBe(true);
    expect(states.has('interrupted')).toBe(true);
    // first meeting: one line then cut; second meeting: both lines
    expect(said.length).toBe(3);
    expect(Math.floor(said[0]!.t / PERIOD)).toBe(0);
    expect(Math.floor(said[1]!.t / PERIOD)).toBe(1);
    expect(pm.meetings).toBe(2);
    expect(pm.state).not.toBe('missing');
  });

  it('a guard who leaves calm mid-talk interrupts it (no missing request)', () => {
    const { said, states } = run(PERIOD, {
      onStep: (_t, p) => {
        if (p.state === 'meeting' && p.linesSaid === 1) p.b.calm = false;
      },
    });
    expect(said.length).toBe(1);
    expect(states.has('interrupted')).toBe(true);
    expect(states.has('missing')).toBe(false);
  });

  it('one missing at the meeting: the other gets a look-for request after the grace, at the partner last route point', () => {
    let reqAt = -1;
    const { pm, said } = run(PERIOD * 2, {
      downB: (t) => t > 3, // taken out on his way to the meeting
    });
    expect(said.length).toBe(0);
    expect(pm.state).toBe('missing');
    expect(pm.lookFor).toBe(0);
    // B was heading for his meet stop when he went down
    expect(pm.lookX).toBe(1);
    expect(pm.lookZ).toBe(0);
    // the request fired once, grace after the window opened
    const r2 = run(PERIOD, {
      downB: (t) => t > 3,
      onStep: (t, p) => {
        if (reqAt < 0 && p.state === 'missing') reqAt = t;
      },
    });
    expect(r2.pm.state).toBe('missing');
    const open = 9 / SPEED;
    expect(reqAt).toBeGreaterThan(open + PAIRS.grace - 0.3);
    expect(reqAt).toBeLessThan(open + PAIRS.grace + 0.3);
  });

  it('the request is an edge; missing holds until reset, then the pair meets again', () => {
    let edges = 0;
    const { pm } = run(PERIOD * 2, {
      downB: (t) => t < PERIOD,
      onStep: (t, p) => {
        // count edges after the step: read on the next step's start
        if (p.requested) edges++;
        if (t > PERIOD + 1 && p.state === 'missing') p.reset();
      },
    });
    expect(edges).toBe(1);
    expect(pm.meetings).toBe(1);
  });

  it('partner back before the grace runs out: no request, they still meet', () => {
    const open = 9 / SPEED;
    const { pm, said } = run(PERIOD, { downB: (t) => t > open - 1 && t < open + 2 });
    expect(pm.state).not.toBe('missing');
    expect(pm.lookFor).toBe(-1);
    // B stood still while down, so he arrives late but inside the window
    expect(said.length).toBe(2);
  });

  it('both down: nobody asks', () => {
    const def: PairDef = { id: 0, period: PERIOD, t0: 0, open: 7.5, close: 25, aPt: [-1, 0], bPt: [1, 0] };
    const pm = new PairMeet(def);
    pm.a.present = false;
    pm.b.present = false;
    for (let i = 0; i < 600; i++) pm.step(0.1);
    expect(pm.state).not.toBe('missing');
    expect(pm.lookFor).toBe(-1);
  });

  it('a window that wraps past the period still opens', () => {
    const def: PairDef = { id: 1, period: 20, t0: 5, open: 18, close: 4, aPt: [-1, 0], bPt: [1, 0] };
    const pm = new PairMeet(def);
    pm.a.x = -1;
    pm.b.x = 1;
    let lines = 0;
    for (let i = 0; i < 400; i++) {
      pm.step(0.1);
      if (pm.sayLine) lines++;
    }
    // starts outside the window (loop time 5); 40 s = two openings (real 13 s and 33 s), one exchange each
    expect(pm.meetings).toBe(2);
    expect(lines).toBe(4);
  });
});

// ----- (guard-rules S6, A10, A11) the walking-together check and posted pairs -----

/** A window far from the start (30 .. 45 s of a 60 s loop): a check before 30 s is outside it. */
const watchDef = (watch: boolean): PairDef => ({ id: 2, period: PERIOD, t0: 0, open: 30, close: 45, aPt: [-1, 0], bPt: [1, 0], watch });

interface WatchRun {
  /** Time of the first missing request (s; -1 none) and how many fired. */
  reqAt: number;
  reqs: number;
}

/**
 * Steps `pm` at the board rate for `seconds`: A walks +X along z = 0 at 1 m/s from x = -20 (route point (5, 0)), B beside
 * him at z = `gap` (route point (5, gap)). `bDown(t)` takes B out, `aCalm(t)` sets A's calm; `each(t)` before each step.
 */
function watchRun(
  pm: PairMeet,
  seconds: number,
  o: { gap?: number; bDown?: (t: number) => boolean; aCalm?: (t: number) => boolean; each?: (t: number) => void } = {},
): WatchRun {
  const dt = PAIRS.tick;
  const gap = o.gap ?? 1;
  const r: WatchRun = { reqAt: -1, reqs: 0 };
  for (let i = 1; i <= Math.round(seconds / dt); i++) {
    const t = i * dt;
    const x = -20 + t;
    pm.a.present = true;
    pm.a.calm = o.aCalm?.(t) ?? true;
    pm.a.x = x;
    pm.a.z = 0;
    pm.a.routeX = 5;
    pm.a.routeZ = 0;
    pm.b.present = !(o.bDown?.(t) ?? false);
    pm.b.calm = true;
    pm.b.x = x;
    pm.b.z = gap;
    pm.b.routeX = 5;
    pm.b.routeZ = gap;
    o.each?.(t);
    pm.step(dt);
    if (pm.requested) {
      r.reqs++;
      if (r.reqAt < 0) r.reqAt = t;
    }
  }
  return r;
}

/** Feeds a posted pair standing at their posts (route point = the post); `bDown(t)` takes B out. */
function postedRun(pm: PairMeet, seconds: number, bDown?: (t: number) => boolean): { said: Said[]; reqAt: number } {
  const dt = PAIRS.tick;
  const said: Said[] = [];
  let reqAt = -1;
  const { aPt, bPt } = pm.def;
  for (let i = 1; i <= Math.round(seconds / dt); i++) {
    const t = i * dt;
    pm.a.present = true;
    pm.a.calm = true;
    pm.a.x = pm.a.routeX = aPt[0];
    pm.a.z = pm.a.routeZ = aPt[1];
    pm.b.present = !(bDown?.(t) ?? false);
    pm.b.calm = true;
    pm.b.x = pm.b.routeX = bPt[0];
    pm.b.z = pm.b.routeZ = bPt[1];
    pm.step(dt);
    if (pm.sayLine) said.push({ t, who: pm.sayWho, line: pm.sayLine });
    if (pm.requested && reqAt < 0) reqAt = t;
  }
  return { said, reqAt };
}

describe('(guard-rules S6) watch and posted pairs', () => {
  const take = 5;
  const down = (t: number): boolean => t > take;

  it("watch on, walking together, B down outside the window: a request `notice` s later at B's route point", () => {
    const pm = new PairMeet(watchDef(true));
    const r = watchRun(pm, 20, { bDown: down });
    expect(r.reqs).toBe(1);
    expect(r.reqAt).toBeGreaterThanOrEqual(take + PAIRS.notice - 0.01);
    expect(r.reqAt).toBeLessThanOrEqual(take + PAIRS.notice + PAIRS.tick + 0.01);
    expect(pm.state).toBe('missing');
    expect(pm.lookFor).toBe(0);
    expect([pm.lookX, pm.lookZ]).toEqual([5, 1]);
  });

  it("watch off (today's def), same run: no request before the window opens + grace", () => {
    const pm = new PairMeet(watchDef(false));
    const r = watchRun(pm, 50, { bDown: down });
    expect(r.reqs).toBe(1);
    expect(r.reqAt).toBeGreaterThan(30 + PAIRS.grace - 0.3);
    expect(r.reqAt).toBeLessThan(30 + PAIRS.grace + 0.3);
  });

  it('watch on, B down while over `togetherR` from A: no early request (the window grace path only)', () => {
    const pm = new PairMeet(watchDef(true));
    const r = watchRun(pm, 50, { gap: PAIRS.togetherR + 1, bDown: down });
    expect(r.reqs).toBe(1);
    expect(r.reqAt).toBeGreaterThan(30 + PAIRS.grace - 0.3);
    expect(r.reqAt).toBeLessThan(30 + PAIRS.grace + 0.3);
  });

  it('watch on, A not calm while B is gone: no request while busy; calm again, a request `notice` s later', () => {
    const pm = new PairMeet(watchDef(true));
    const calmAt = 10;
    const r = watchRun(pm, 20, { bDown: down, aCalm: (t) => t <= take || t > calmAt });
    expect(r.reqs).toBe(1);
    expect(r.reqAt).toBeGreaterThanOrEqual(calmAt + PAIRS.notice - 0.01);
    expect(r.reqAt).toBeLessThanOrEqual(calmAt + PAIRS.notice + PAIRS.tick + 0.01);
  });

  it('watch on, B back before `notice`: no request; reset() clears together / goneT', () => {
    const pm = new PairMeet(watchDef(true));
    const r = watchRun(pm, 25, { bDown: (t) => t > take && t < take + PAIRS.notice - 1 });
    expect(r.reqs).toBe(0);
    expect(pm.state).toBe('idle');
    // B down again; `reset` mid-count: no longer together, the timer cleared, so no request after it
    const pm2 = new PairMeet(watchDef(true));
    const priv = pm2 as unknown as { together: boolean; goneT: number };
    let seen = false;
    const r2 = watchRun(pm2, 25, {
      bDown: down,
      each: (t) => {
        if (!seen && t > take + 1.5) {
          expect(priv.together).toBe(true);
          expect(priv.goneT).toBeGreaterThan(1);
          pm2.reset();
          expect(priv.together).toBe(false);
          expect(priv.goneT).toBe(0);
          seen = true;
        }
      },
    });
    expect(seen).toBe(true);
    expect(r2.reqs).toBe(0);
  });

  it('postedDef: opens on the first step, both at their points meet at once, two lines, done; the next at `postedPeriod`', () => {
    const def = postedDef(104, [0, 0], [1.2, 0]);
    expect(def).toEqual({ id: 104, period: PAIRS.postedPeriod, t0: 0, open: 0, close: PAIRS.postedOpen, aPt: [0, 0], bPt: [1.2, 0], watch: true, posted: true });
    const pm = new PairMeet(def);
    const states: string[] = [];
    let firstMeet = -1;
    for (let i = 1; i <= 50; i++) {
      pm.a.x = 0;
      pm.b.x = 1.2;
      pm.a.z = pm.b.z = 0;
      pm.step(PAIRS.tick);
      states.push(pm.state);
      if (firstMeet < 0 && pm.state === 'meeting') firstMeet = i;
    }
    expect(firstMeet).toBe(1);
    expect(states[states.length - 1]).toBe('done');
    const run1 = postedRun(new PairMeet(postedDef(104, [0, 0], [1.2, 0])), PAIRS.postedPeriod * 2 + 10);
    expect(run1.said.length).toBe(6);
    const ex = PAIR_LINES[104 % PAIR_LINES.length]!;
    expect(run1.said[0]!.line).toBe(ex[0]);
    expect(run1.said[1]!.line).toBe(ex[1]);
    expect(run1.said[0]!.who).toBe(0);
    expect(run1.said[1]!.who).toBe(1);
    expect(run1.said[1]!.t).toBeLessThan(PAIRS.postedOpen);
    expect(Math.abs(run1.said[2]!.t - run1.said[0]!.t - PAIRS.postedPeriod)).toBeLessThan(PAIRS.tick + 0.01);
    expect(Math.abs(run1.said[4]!.t - run1.said[0]!.t - 2 * PAIRS.postedPeriod)).toBeLessThan(PAIRS.tick + 0.01);
    expect(run1.reqAt).toBe(-1);
    // same inputs, same lines
    const run2 = postedRun(new PairMeet(postedDef(104, [0, 0], [1.2, 0])), PAIRS.postedPeriod * 2 + 10);
    expect(run2.said).toEqual(run1.said);
  });

  it('posted: one down after the talk -> a request `notice` s later, at his post', () => {
    const pm = new PairMeet(postedDef(7, [-0.6, 0], [0.6, 0]));
    const at = 10;
    const r = postedRun(pm, 20, (t) => t > at);
    expect(r.said.length).toBe(2);
    expect(r.reqAt).toBeGreaterThanOrEqual(at + PAIRS.notice - 0.01);
    expect(r.reqAt).toBeLessThanOrEqual(at + PAIRS.notice + PAIRS.tick + 0.01);
    expect(pm.lookFor).toBe(0);
    expect([pm.lookX, pm.lookZ]).toEqual([0.6, 0]);
  });
});
