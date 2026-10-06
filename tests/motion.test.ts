import { describe, expect, it } from 'vitest';
import { emptyMotionInput, MotionDriver, rootModulation, stepLength, wrapPi, type MotionTuning } from '../src/anim/motion';
import { ENEMY_MOTION, MOVEMENT } from '../src/config/movement';

const run = (
  d: MotionDriver,
  seconds: number,
  set: (i: ReturnType<typeof emptyMotionInput>) => void,
  hz = 60,
  each?: (t: number) => void,
  M: MotionTuning = MOVEMENT,
): void => {
  const i = emptyMotionInput();
  i.yaw = d.yaw;
  set(i);
  const dt = 1 / hz;
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    d.step(dt, i, M);
    each?.(t + dt);
  }
};
const travel = (i: ReturnType<typeof emptyMotionInput>): void => {
  i.faceTravel = true;
};

describe('motion driver: responsive starts and stops (player)', () => {
  it('moves on the first step, reaches 90% of jog speed in 0.2-0.35 s', () => {
    const d = new MotionDriver();
    let firstMove = -1;
    let reached = -1;
    run(d, 1, (i) => {
      travel(i);
      i.vz = MOVEMENT.jogSpeed;
    }, 60, (t) => {
      if (firstMove < 0 && d.speed > 0.001) firstMove = t;
      if (reached < 0 && d.speed > MOVEMENT.jogSpeed * 0.9) reached = t;
    });
    expect(firstMove).toBeLessThanOrEqual(1 / 60 + 1e-9);
    expect(reached).toBeGreaterThanOrEqual(0.2);
    expect(reached).toBeLessThanOrEqual(0.35);
  });
  it('walk in 0.2-0.35 s too; sprint 90% within 0.45 s', () => {
    const d = new MotionDriver();
    let reached = -1;
    run(d, 1, (i) => {
      travel(i);
      i.vz = MOVEMENT.walkSpeed;
    }, 60, (t) => {
      if (reached < 0 && d.speed > MOVEMENT.walkSpeed * 0.9) reached = t;
    });
    expect(reached).toBeLessThanOrEqual(0.35);
    const s = new MotionDriver();
    reached = -1;
    run(s, 1, (i) => {
      travel(i);
      i.sprinting = true;
      i.vz = MOVEMENT.sprintSpeed;
    }, 60, (t) => {
      if (reached < 0 && s.speed > MOVEMENT.sprintSpeed * 0.9) reached = t;
    });
    expect(reached).toBeLessThanOrEqual(0.45);
  });
  it('stops in 0.2-0.35 s from a jog, eased, no reversal', () => {
    const d = new MotionDriver();
    run(d, 1, (i) => {
      travel(i);
      i.vz = MOVEMENT.jogSpeed;
    });
    let stopped = -1;
    let minVz = 9;
    run(d, 1, travel, 60, (t) => {
      minVz = Math.min(minVz, d.vz);
      if (stopped < 0 && d.speed < 0.02) stopped = t;
    });
    expect(stopped).toBeGreaterThanOrEqual(0.2);
    expect(stopped).toBeLessThanOrEqual(0.35);
    expect(minVz).toBeGreaterThanOrEqual(0);
  });
  it('acceleration and jerk stay within the caps; no overshoot', () => {
    const d = new MotionDriver();
    let prevA = 0;
    let maxA = 0;
    let maxJ = 0;
    let maxV = 0;
    const dt = 1 / 120;
    run(d, 2, (i) => {
      travel(i);
      i.vz = MOVEMENT.jogSpeed;
    }, 120, () => {
      const a = d.accel;
      maxA = Math.max(maxA, a);
      maxJ = Math.max(maxJ, Math.abs(a - prevA) / dt);
      prevA = a;
      maxV = Math.max(maxV, d.speed);
    });
    expect(maxA).toBeLessThanOrEqual(MOVEMENT.accelMax + 1e-6);
    expect(maxJ).toBeLessThanOrEqual(MOVEMENT.jerkMax + 1e-3);
    expect(maxV).toBeLessThanOrEqual(MOVEMENT.jogSpeed * 1.02);
  });
  it('reversing at a jog is a 0.25-0.35 s planted pivot, then off the other way', () => {
    const d = new MotionDriver();
    run(d, 1, (i) => {
      travel(i);
      i.vz = MOVEMENT.jogSpeed;
    });
    let pivotT = 0;
    run(d, 1, (i) => {
      travel(i);
      i.vz = -MOVEMENT.jogSpeed;
    }, 60, () => {
      if (d.state === 'pivot') pivotT += 1 / 60;
    });
    expect(pivotT).toBeGreaterThanOrEqual(0.25);
    expect(pivotT).toBeLessThanOrEqual(0.36);
    expect(d.vz).toBeLessThan(-2);
    expect(Math.abs(wrapPi(d.yaw - Math.PI))).toBeLessThan(0.05);
  });
});

describe('motion driver: travel facing (player, not aiming)', () => {
  it('faces where it goes; a 90 degree change arcs round without stopping', () => {
    const d = new MotionDriver(0);
    run(d, 1, (i) => {
      travel(i);
      i.vz = MOVEMENT.jogSpeed;
    });
    let minSpeed = 9;
    run(d, 0.8, (i) => {
      travel(i);
      i.vx = MOVEMENT.jogSpeed;
    }, 60, () => (minSpeed = Math.min(minSpeed, d.speed)));
    expect(minSpeed).toBeGreaterThan(MOVEMENT.jogSpeed * 0.8);
    expect(Math.abs(wrapPi(d.yaw - Math.PI / 2))).toBeLessThan(0.05);
    expect(d.state).toBe('move');
  });
  it('turn rate: about 540 deg/s at a sneak, 300 deg/s at a sprint', () => {
    const rate = (v: number, sprint: boolean): number => {
      const d = new MotionDriver(0);
      run(d, 1, (i) => {
        travel(i);
        i.sprinting = sprint;
        i.vz = v;
      });
      let max = 0;
      run(d, 0.4, (i) => {
        travel(i);
        i.sprinting = sprint;
        i.vx = v * 0.7;
        i.vz = -v * 0.7;
      }, 120, () => (max = Math.max(max, Math.abs(d.yawRate))));
      return (max * 180) / Math.PI;
    };
    expect(rate(MOVEMENT.sneakSpeed, false)).toBeGreaterThan(450);
    expect(rate(MOVEMENT.sneakSpeed, false)).toBeLessThanOrEqual(541);
    expect(rate(MOVEMENT.sprintSpeed, true)).toBeLessThanOrEqual(301);
  });
  it('standing still the body holds its facing whatever the view does', () => {
    const d = new MotionDriver(0.4);
    run(d, 1, (i) => {
      travel(i);
      i.yaw = 2.5;
    });
    expect(d.yaw).toBeCloseTo(0.4, 6);
  });
  it('aiming: strafe-locked to the aim at <= 360 deg/s, eased', () => {
    const d = new MotionDriver(0);
    let maxRate = 0;
    let at = -1;
    run(d, 1, (i) => {
      travel(i);
      i.aiming = true;
      i.yaw = Math.PI / 4;
    }, 120, (t) => {
      maxRate = Math.max(maxRate, Math.abs(d.yawRate));
      if (at < 0 && Math.abs(wrapPi(Math.PI / 4 - d.yaw)) < 0.01) at = t;
    });
    expect((maxRate * 180) / Math.PI).toBeLessThanOrEqual(360 + 1e-6);
    expect(at).toBeGreaterThan(0.1);
    expect(at).toBeLessThan(0.25);
  });
});

describe('motion driver: gait clock and root modulation', () => {
  it('modulation averages 1 over a step, dips at heel strike', () => {
    let sum = 0;
    for (let k = 0; k < 1000; k++) sum += rootModulation(k / 1000);
    expect(sum / 1000).toBeCloseTo(1, 3);
    expect(rootModulation(0)).toBeLessThan(1);
    expect(rootModulation(0.25)).toBeGreaterThan(1);
    expect(stepLength(MOVEMENT.walkSpeed)).toBeGreaterThan(0.5);
    expect(stepLength(MOVEMENT.walkSpeed)).toBeLessThan(0.65);
    expect(stepLength(MOVEMENT.sprintSpeed)).toBeLessThan(1.4);
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

describe('motion driver: explicit facing (enemies)', () => {
  it('turning 90 degrees on the spot is two stepped chunks in about 0.6 s', () => {
    const d = new MotionDriver(0);
    let chunks = 0;
    let lastTo = Number.NaN;
    let done = -1;
    run(d, 1.5, (i) => (i.yaw = Math.PI / 2), 60, (t) => {
      // chunks chain back to back while turning: count each new chunk target
      if (d.state === 'turn' && d['turnTo'] !== lastTo) {
        chunks++;
        lastTo = d['turnTo'];
      }
      if (done < 0 && Math.abs(wrapPi(Math.PI / 2 - d.yaw)) < 0.02) done = t;
    }, ENEMY_MOTION);
    expect(chunks).toBe(2);
    expect(done).toBeGreaterThan(0.5);
    expect(done).toBeLessThan(0.75);
  });
  it('a turn steps on until the feet face the aim (no 20 degree leftover after a sweep)', () => {
    const d = new MotionDriver(0);
    // the aim sweeps 90 degrees but is held back at first (as the camera twist limit does)
    const i = emptyMotionInput();
    for (let k = 0; k < 120; k++) {
      i.yaw = Math.min(Math.PI / 2, i.yaw + 6 / 60, d.yaw + 1.3);
      d.step(1 / 60, i, ENEMY_MOTION);
    }
    expect(Math.abs(wrapPi(Math.PI / 2 - d.yaw))).toBeLessThan(0.13);
    expect(d.state).toBe('idle');
  });
  it('small aim changes on the spot do not step', () => {
    const d = new MotionDriver(0);
    run(d, 1, (i) => (i.yaw = 0.3), 60, undefined, ENEMY_MOTION);
    expect(d.yaw).toBe(0);
  });
  it('aiming turns continuously at <= 110 deg/s with eased acceleration', () => {
    const d = new MotionDriver(0);
    let maxRate = 0;
    run(d, 2, (i) => {
      i.yaw = 1.2;
      i.aiming = true;
    }, 60, () => (maxRate = Math.max(maxRate, Math.abs(d.yawRate))), ENEMY_MOTION);
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
      let x = 0;
      run(d, 1.5, (i) => {
        travel(i);
        i.vz = MOVEMENT.jogSpeed;
      }, hz, () => (z += d.outZ / hz));
      out.push(z, d.speed);
      run(d, 1, (i) => {
        travel(i);
        i.vx = MOVEMENT.jogSpeed;
      }, hz, () => {
        z += d.outZ / hz;
        x += d.outX / hz;
      });
      out.push(x, z, d.yaw);
      run(d, 1, travel, hz, () => (z += d.outZ / hz));
      out.push(z, d.speed);
      return out;
    };
    const a = traj(60);
    const b = traj(120);
    // positions after ~9 m including a 90 degree arc: within 5 cm; speeds and facing within 0.03
    for (let k = 0; k < a.length; k++) expect(Math.abs(a[k]! - b[k]!)).toBeLessThan(0.05);
  });
});
