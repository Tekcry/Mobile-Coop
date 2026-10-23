import { describe, expect, it } from 'vitest';
import { HoldClock, holdFeed, stepHoldFeed } from '../src/net/holdFeed';

/**
 * (hostage-gait) The host's view of a client's hostage: the seized loop (coopHost.fixedUpdate, 60 Hz) places him from
 * the client's drawn body, which RemoteAvatar.update moves once per render frame (coopHost.frameUpdate, after the
 * frame's fixed steps: src/core/loop.ts). Below 60 fps 2+ steps see one pose. This replays that order (the GameLoop
 * accumulator, 4-step cap, 0.1 s INTERP_DELAY) and measures the speed `Enemy.holdAt` gives him (his gait), with the old
 * feed (the drawn point) and the new one (holdFeed).
 */

const DT = 1 / 60;
const WALK = 1.4;
const DIR_X = Math.cos(0.5);
const DIR_Z = Math.sin(0.5);

/** `Enemy.holdAt`'s velocity ease (src/ai/enemy.ts, while `taken`), copied: src/ai is not this job's to import here. */
class Held {
  x = 0;
  z = 0;
  vx = 0;
  vz = 0;
  holdAt(x: number, z: number): void {
    this.vx += ((x - this.x) * 60 - this.vx) * 0.35;
    this.vz += ((z - this.z) * 60 - this.vz) * 0.35;
    this.x = x;
    this.z = z;
  }
}

type Path = (t: number) => { x: number; z: number };
const walk: Path = (t) => ({ x: WALK * t * DIR_X, z: WALK * t * DIR_Z });

interface Run {
  /** Per fixed step: the fed point's speed (m/s, what holdAt's target velocity is built from). */
  fed: { t: number; v: number }[];
  /** Per render frame: the speed the gait reads (|holdAt velocity|), its forward part, and the feed's lag behind the drawn point. */
  gait: { t: number; v: number; fwd: number; lag: number }[];
  snaps: number;
}

function simulate(fps: number, mode: 'old' | 'new', path: Path, dur: number, jitter = 0, seed = 7): Run {
  let rnd = seed;
  const rand = (): number => {
    rnd = (rnd * 1103515245 + 12345) % 2147483648;
    return rnd / 2147483648;
  };
  const clock = new HoldClock();
  const f = holdFeed();
  const held = new Held();
  const out: Run = { fed: [], gait: [], snaps: 0 };
  let wall = 0;
  let sim = 0;
  let acc = 0;
  let pose = path(-0.1);
  held.x = pose.x;
  held.z = pose.z;
  let lastFed = { x: pose.x, z: pose.z };
  while (wall < dur) {
    const frame = (1 / fps) * (1 + jitter * (rand() * 2 - 1));
    wall += frame;
    acc += Math.min(frame, 0.1);
    let steps = 0;
    while (acc >= DT && steps < 4) {
      sim += DT;
      let fx = pose.x;
      let fz = pose.z;
      if (mode === 'new') {
        if (stepHoldFeed(f, pose.x, pose.z, clock, sim, DT)) {
          // coopHost: a jump places him first, so holdAt sees no move
          held.x = f.hfX;
          held.z = f.hfZ;
          out.snaps++;
        }
        fx = f.hfX;
        fz = f.hfZ;
      }
      held.holdAt(fx, fz);
      out.fed.push({ t: wall, v: Math.sqrt((fx - lastFed.x) ** 2 + (fz - lastFed.z) ** 2) / DT });
      lastFed = { x: fx, z: fz };
      acc -= DT;
      steps++;
    }
    if (steps === 4) acc = 0;
    // frameUpdate: the remote body drawn at render time, then the clock
    const renderT = wall - 0.1;
    pose = path(renderT);
    clock.frame(renderT, sim);
    out.gait.push({
      t: wall,
      v: Math.sqrt(held.vx * held.vx + held.vz * held.vz),
      fwd: held.vx * DIR_X + held.vz * DIR_Z,
      lag: Math.sqrt((pose.x - held.x) ** 2 + (pose.z - held.z) ** 2),
    });
  }
  return out;
}

function stats(v: number[]): { mean: number; sd: number; cv: number; maxDelta: number } {
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
  let maxDelta = 0;
  for (let i = 1; i < v.length; i++) maxDelta = Math.max(maxDelta, Math.abs(v[i]! - v[i - 1]!));
  return { mean, sd, cv: sd / mean, maxDelta };
}

const r3 = (n: number): number => Math.round(n * 1000) / 1000;

function steady(fps: number, mode: 'old' | 'new', jitter = 0) {
  const run = simulate(fps, mode, walk, 3, jitter);
  const fed = stats(run.fed.filter((s) => s.t > 1).map((s) => s.v));
  const gaitRows = run.gait.filter((s) => s.t > 1);
  const gait = stats(gaitRows.map((s) => s.v));
  const lag = Math.max(...gaitRows.map((s) => s.lag));
  return { fedCv: r3(fed.cv), fedSd: r3(fed.sd), gaitMean: r3(gait.mean), gaitSd: r3(gait.sd), gaitCv: r3(gait.cv), gaitMaxDelta: r3(gait.maxDelta), lag: r3(lag) };
}

describe('hostage gait: the fed speed is steady below 60 fps', () => {
  const rows: Record<string, unknown> = {};
  for (const fps of [30, 45, 60]) {
    for (const jitter of [0, 0.15]) {
      it(`${fps} fps${jitter ? ' (frame time +-15%)' : ''}: before vs after`, () => {
        const before = steady(fps, 'old', jitter);
        const after = steady(fps, 'new', jitter);
        rows[`${fps}${jitter ? 'j' : ''} before`] = before;
        rows[`${fps}${jitter ? 'j' : ''} after`] = after;
        // after: the fed speed and the gait speed hold within a few percent of the walk, at the walk's speed
        expect(after.fedCv).toBeLessThan(jitter ? 0.06 : 0.01);
        expect(after.gaitCv).toBeLessThan(jitter ? 0.03 : 0.01);
        expect(Math.abs(after.gaitMean - WALK)).toBeLessThan(0.03);
        // the hostage stays with the drawn body (the point vs the hold point at the frame)
        expect(after.lag).toBeLessThan(0.06);
        if (fps < 60) {
          expect(before.fedCv).toBeGreaterThan(0.4);
          expect(after.fedCv).toBeLessThan(before.fedCv / 8);
          expect(after.gaitMaxDelta).toBeLessThanOrEqual(before.gaitMaxDelta);
        }
      });
    }
  }
  it('prints the table', () => {
    console.info('hostage gait (speeds m/s, walk 1.4):\n' + JSON.stringify(rows, null, 1));
  });
});

describe('hostage gait: stops, jumps', () => {
  const stopPath: Path = (t) => walk(Math.min(t, 2));
  function stopLatency(fps: number, mode: 'old' | 'new') {
    const run = simulate(fps, mode, stopPath, 3.5);
    // the first frame whose drawn pose is the stopped one (render time >= 2)
    const t0 = run.gait.find((s) => s.t - 0.1 >= 2)!.t;
    let settled = t0;
    for (const s of run.gait) if (s.t >= t0 && s.v >= 0.1) settled = s.t;
    const back = Math.min(...run.gait.filter((s) => s.t >= t0).map((s) => s.fwd));
    return { latency: r3(settled - t0), backward: r3(back) };
  }
  it('a stopped holder stops the hostage within ~0.15 s', () => {
    const rows: Record<string, unknown> = {};
    for (const fps of [30, 45, 60]) {
      const before = stopLatency(fps, 'old');
      const after = stopLatency(fps, 'new');
      rows[`${fps} before`] = before;
      rows[`${fps} after`] = after;
      expect(after.latency).toBeLessThanOrEqual(0.17);
      // no visible step back when he stops
      expect(after.backward).toBeGreaterThan(-0.25);
    }
    console.info('hostage stop (s to < 0.1 m/s; most backward m/s):\n' + JSON.stringify(rows, null, 1));
  });

  it('a jump over 1 m snaps without a speed spike', () => {
    const jumpPath: Path = (t) => {
      const p = walk(t);
      return t >= 2 ? { x: p.x + 3, z: p.z } : p;
    };
    const rows: Record<string, unknown> = {};
    for (const fps of [30, 45, 60]) {
      const before = simulate(fps, 'old', jumpPath, 3);
      const after = simulate(fps, 'new', jumpPath, 3);
      const peak = (r: Run): number => Math.max(...r.gait.filter((s) => s.t > 1).map((s) => s.v));
      rows[`${fps}`] = { beforePeak: r3(peak(before)), afterPeak: r3(peak(after)), snaps: after.snaps };
      expect(after.snaps).toBe(1);
      expect(peak(after)).toBeLessThan(WALK * 1.15);
      // he is at the new place right away
      const last = after.gait[after.gait.length - 1]!;
      expect(last.lag).toBeLessThan(0.06);
    }
    console.info('hostage jump (peak gait speed m/s):\n' + JSON.stringify(rows, null, 1));
  });

  it('a small step under 1 m is followed, not snapped; a fresh feed starts at the point', () => {
    const f = holdFeed();
    const clock = new HoldClock();
    clock.frame(0, 0);
    expect(stepHoldFeed(f, 2, 3, clock, DT, DT)).toBe(false);
    expect(f.hfX).toBe(2);
    expect(f.hfZ).toBe(3);
    clock.frame(DT, DT);
    expect(stepHoldFeed(f, 2.5, 3, clock, 2 * DT, DT)).toBe(false);
    expect(f.hfX).toBeGreaterThan(2);
    expect(f.hfX).toBeLessThan(2.6);
  });
});
