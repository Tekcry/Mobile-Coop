import { describe, expect, it } from 'vitest';
import { emptyMotionInput, MotionDriver, rootModulation, stepLength, wrapPi } from '../src/anim/motion';
import { MOVEMENT } from '../src/config/movement';

const run = (d: MotionDriver, seconds: number, set: (i: ReturnType<typeof emptyMotionInput>) => void, hz = 60, each?: (t: number) => void): void => {
  const i = emptyMotionInput();
  i.yaw = d.yaw;
  set(i);
  const dt = 1 / hz;
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    d.step(dt, i);
    each?.(t + dt);
  }
};

describe('motion driver: starts and stops', () => {
  it('weight shift before the root moves, then reaches walk speed over ~0.8-1.0 s', () => {
    const d = new MotionDriver();
    let firstMove = -1;
    let reached = -1;
    run(d, 2, (i) => (i.vz = MOVEMENT.walkSpeed), 60, (t) => {
      if (firstMove < 0 && d.speed > 0.01) firstMove = t;
      if (reached < 0 && d.speed > MOVEMENT.walkSpeed * 0.95) reached = t;
    });
    expect(firstMove).toBeGreaterThanOrEqual(0.25);
    expect(firstMove).toBeLessThanOrEqual(0.42);
    expect(reached).toBeGreaterThan(0.75);
    expect(reached).toBeLessThan(1.15);
    expect(d.state).toBe('move');
  });
  it('stopping takes 0.5-0.8 s, eased, no reversal', () => {
    const d = new MotionDriver();
    run(d, 2, (i) => (i.vz = MOVEMENT.walkSpeed));
    let stopped = -1;
    let minVz = 1;
    run(d, 1.5, () => {}, 60, (t) => {
      minVz = Math.min(minVz, d.vz);
      if (stopped < 0 && d.speed < 0.02) stopped = t;
    });
    expect(stopped).toBeGreaterThan(0.45);
    expect(stopped).toBeLessThan(0.85);
    expect(minVz).toBeGreaterThanOrEqual(0);
    expect(d.state).toBe('idle');
  });
  it('acceleration and jerk stay within the caps; no overshoot', () => {
    const d = new MotionDriver();
    let prevA = 0;
    let maxA = 0;
    let maxJ = 0;
    let maxV = 0;
    const dt = 1 / 120;
    run(d, 3, (i) => (i.vz = MOVEMENT.briskSpeed), 120, () => {
      const a = d.accel;
      maxA = Math.max(maxA, a);
      maxJ = Math.max(maxJ, Math.abs(a - prevA) / dt);
      prevA = a;
      maxV = Math.max(maxV, d.speed);
    });
    expect(maxA).toBeLessThanOrEqual(MOVEMENT.accelMax + 1e-6);
    expect(maxJ).toBeLessThanOrEqual(MOVEMENT.jerkMax + 1e-3);
    expect(maxV).toBeLessThanOrEqual(MOVEMENT.briskSpeed * 1.02);
  });
  it('reversal at speed is a planted pivot', () => {
    const d = new MotionDriver();
    run(d, 2, (i) => (i.vz = MOVEMENT.walkSpeed));
    let pivoted = false;
    let minSpeed = 9;
    run(d, 1.2, (i) => (i.vz = -MOVEMENT.walkSpeed * MOVEMENT.backMult), 60, () => {
      if (d.state === 'pivot') {
        pivoted = true;
        minSpeed = Math.min(minSpeed, d.speed);
      }
    });
    expect(pivoted).toBe(true);
    expect(minSpeed).toBeLessThan(0.1);
    run(d, 1.5, (i) => (i.vz = -MOVEMENT.walkSpeed * MOVEMENT.backMult));
    expect(d.vz).toBeLessThan(-0.5);
  });
});

describe('motion driver: gait clock and root modulation', () => {
  it('modulation averages 1 over a step, dips at heel strike', () => {
    let sum = 0;
    for (let k = 0; k < 1000; k++) sum += rootModulation(k / 1000);
    expect(sum / 1000).toBeCloseTo(1, 3);
    expect(rootModulation(0)).toBeLessThan(1);
    expect(rootModulation(0.25)).toBeGreaterThan(1);
    expect(stepLength(MOVEMENT.walkSpeed)).toBeGreaterThan(0.45);
    expect(stepLength(MOVEMENT.walkSpeed)).toBeLessThan(0.6);
  });
  it('phase advances by ground distance / cycle length', () => {
    const d = new MotionDriver();
    run(d, 3, (i) => (i.vz = MOVEMENT.walkSpeed));
    const p0 = d.phase;
    run(d, 1, (i) => (i.vz = MOVEMENT.walkSpeed));
    const cycles = (d.phase - p0 + 1) % 1;
    const expected = (MOVEMENT.walkSpeed / (2 * stepLength(MOVEMENT.walkSpeed))) % 1;
    expect(cycles).toBeCloseTo(expected, 2);
  });
});

describe('motion driver: facing', () => {
  it('turning 90 degrees on the spot is two stepped chunks in about 0.6 s', () => {
    const d = new MotionDriver(0);
    let chunks = 0;
    let last = d.state;
    let done = -1;
    run(d, 1.5, (i) => (i.yaw = Math.PI / 2), 60, (t) => {
      if (d.state === 'turn' && last !== 'turn') chunks++;
      last = d.state;
      if (done < 0 && Math.abs(wrapPi(Math.PI / 2 - d.yaw)) < 0.02) done = t;
    });
    expect(chunks).toBe(2);
    expect(done).toBeGreaterThan(0.5);
    expect(done).toBeLessThan(0.75);
  });
  it('small aim changes on the spot do not step', () => {
    const d = new MotionDriver(0);
    run(d, 1, (i) => (i.yaw = 0.3));
    expect(d.yaw).toBe(0);
  });
  it('aiming turns continuously at <= 110 deg/s with eased acceleration', () => {
    const d = new MotionDriver(0);
    let maxRate = 0;
    run(d, 2, (i) => {
      i.yaw = 1.2;
      i.aiming = true;
    }, 60, () => (maxRate = Math.max(maxRate, Math.abs(d.yawRate))));
    expect(maxRate).toBeLessThanOrEqual((110 * Math.PI) / 180 + 1e-6);
    expect(d.yaw).toBeCloseTo(1.2, 3);
  });
});

describe('frame-rate independence', () => {
  it('60 Hz and 120 Hz stepping give the same trajectory within tolerance', () => {
    const traj = (hz: number): number[] => {
      const d = new MotionDriver();
      const out: number[] = [];
      let z = 0;
      run(d, 1.5, (i) => (i.vz = MOVEMENT.walkSpeed), hz, () => (z += d.outZ / hz));
      out.push(z, d.speed);
      run(d, 1, () => {}, hz, () => (z += d.outZ / hz));
      out.push(z, d.speed);
      return out;
    };
    const a = traj(60);
    const b = traj(120);
    for (let k = 0; k < a.length; k++) expect(Math.abs(a[k]! - b[k]!)).toBeLessThan(0.03);
  });
});
