import { describe, expect, it } from 'vitest';
import { emptyMotionInput, MotionDriver, rootModulation, stepLength, wrapPi, type MotionTuning } from '../src/anim/motion';
import { CT, ENEMY_CALM_MOTION, ENEMY_MOTION, MOVEMENT } from '../src/config/movement';

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

describe('motion driver: Chaos Theory feel (3.2.0, player)', () => {
  const ct = (i: ReturnType<typeof emptyMotionInput>): void => {
    i.faceTravel = true;
    i.ct = true;
  };
  for (const hz of [60, 90, 120]) {
    it(`${hz} Hz: 95% of the target within CT.startTime; zero velocity on the step after release`, () => {
      const d = new MotionDriver();
      let reached = -1;
      let firstMove = -1;
      run(d, 0.5, (i) => {
        ct(i);
        i.vz = 2.8;
      }, hz, (t) => {
        if (firstMove < 0 && d.speed > 0.001) firstMove = t;
        if (reached < 0 && d.speed >= 2.8 * 0.95) reached = t;
      });
      expect(firstMove).toBeLessThanOrEqual(1 / hz + 1e-9);
      expect(reached).toBeGreaterThan(0);
      expect(reached).toBeLessThanOrEqual(CT.startTime + 1e-9);
      // release: stopped on that very step, gait clock frozen, no stop / pivot state
      const phase = d.phase;
      run(d, 1 / hz, ct, hz);
      expect(d.speed).toBe(0);
      expect(d.outX === 0 && d.outZ === 0).toBe(true);
      expect(d.state).toBe('idle');
      run(d, 0.3, ct, hz);
      expect(d.phase).toBe(phase);
      expect(d.speed).toBe(0);
    });
  }
  it('60 / 90 / 120 Hz give the same trajectory (start, gear change, turn, stop)', () => {
    const traj = (hz: number): number[] => {
      const d = new MotionDriver();
      let x = 0;
      let z = 0;
      const acc = (): void => {
        x += d.outX / hz;
        z += d.outZ / hz;
      };
      run(d, 0.8, (i) => {
        ct(i);
        i.vz = 2.0;
      }, hz, acc);
      run(d, 0.5, (i) => {
        ct(i);
        i.vz = 3.8;
      }, hz, acc);
      run(d, 0.6, (i) => {
        ct(i);
        i.vx = 3.8;
      }, hz, acc);
      const yaw = d.yaw;
      run(d, 0.3, ct, hz, acc);
      return [x, z, yaw, d.speed];
    };
    const a = traj(60);
    for (const hz of [90, 120]) {
      const b = traj(hz);
      for (let k = 0; k < a.length; k++) expect(Math.abs(a[k]! - b[k]!)).toBeLessThan(0.03);
    }
  });
  it('a gear change mid-move re-targets within CT.startTime; a reversal is not a planted pivot', () => {
    const d = new MotionDriver();
    run(d, 0.5, (i) => {
      ct(i);
      i.vz = 2.0;
    }, 60);
    let reached = -1;
    run(d, 0.3, (i) => {
      ct(i);
      i.vz = 3.8;
    }, 60, (t) => {
      if (reached < 0 && d.speed >= 2.0 + (3.8 - 2.0) * 0.95) reached = t;
    });
    expect(reached).toBeGreaterThan(0);
    expect(reached).toBeLessThanOrEqual(CT.startTime + 1e-9);
    // reverse at speed: no pivot state, heading back the other way at once
    let pivot = false;
    let back = -1;
    run(d, 0.4, (i) => {
      ct(i);
      i.vz = -3.8;
    }, 60, (t) => {
      pivot ||= d.state === 'pivot';
      if (back < 0 && d.vz <= -3.8 * 0.95) back = t;
    });
    expect(pivot).toBe(false);
    expect(back).toBeLessThanOrEqual(0.12);
  });
  it('travel turns at up to CT.turnRate (720 deg/s), faster than the 2.x travel rate', () => {
    const d = new MotionDriver();
    run(d, 0.5, (i) => {
      ct(i);
      i.vz = 2.8;
    }, 120);
    let maxRate = 0;
    run(d, 0.6, (i) => {
      ct(i);
      i.vx = 2.8;
    }, 120, () => (maxRate = Math.max(maxRate, Math.abs(d.yawRate))));
    expect(maxRate).toBeLessThanOrEqual(CT.turnRate + 1e-6);
    expect(maxRate).toBeGreaterThan(MOVEMENT.turnTravelSlow * 1.05);
    expect(Math.abs(wrapPi(d.yaw - Math.PI / 2))).toBeLessThan(0.01);
  });
  it('without the flag (enemies, cover moves) the driver keeps its 2.x behaviour', () => {
    const d = new MotionDriver();
    run(d, 1, (i) => {
      travel(i);
      i.vz = MOVEMENT.jogSpeed;
    }, 60);
    run(d, 1 / 60, travel, 60);
    expect(d.speed).toBeGreaterThan(1);
    expect(d.state).toBe('stop');
  });
});

describe('enemy tuning is pinned (3.2.0: standalone literals)', () => {
  // the values ENEMY_MOTION / ENEMY_CALM_MOTION resolved to on 3.1.0 (`...MOVEMENT` + overrides)
  const PINNED = {
    sneakSpeed: 0.8, crouchWalkSpeed: 1.8, crouchRunSpeed: 2.6, walkSpeed: 1.4, jogSpeed: 2.8, sprintSpeed: 5, adsSpeed: 1.4,
    adsCrouchSpeed: 1, coverSpeed: 2.3, coverCrouchSpeed: 1.25, coverRunSpeed: 3.6, reloadMult: 0.75, sneakBand: 0.4,
    crouchWalkBand: 0.85, walkBand: 0.5, strafeMult: 0.9, backMult: 0.75, accelMax: 1.5, decelMax: 2, jerkMax: 9,
    sprintAccel: 4.5, velGain: 6, brakeGain: 6, startShift: 0.3, stepLen0: 0.27, stepLenK: 0.22, rootDip: 0.05,
    turnTravelSlow: 9.42477796076938, turnTravelFast: 5.235987755982989, turnAim: 1.9198621771937625, turnAccel: 12,
    turnSprint: 1.2, turnMoving: 2.4, turnChunk: 0.785, turnChunkTime: 0.3, turnThreshold: 0.45, twistMax: 1.3,
    pivotTime: 0.6, pivotMinSpeed: 0.45, crouchTime: 0.25, kneelTime: 0.3, standTime: 0.28, airControl: 0.05,
    standHeight: 1.75, crouchHeight: 1.15, radius: 0.3, maxStep: 0.42, camFollow: 16, camShoulder: 15.5, camAds: 19,
    recentreDelay: 1.5, recentreRate: 1.6,
  };
  it('ENEMY_MOTION and ENEMY_CALM_MOTION hold the 3.1.0 values', () => {
    expect(Object.keys(ENEMY_MOTION).sort()).toEqual(Object.keys(PINNED).sort());
    for (const [k, v] of Object.entries(PINNED)) expect(ENEMY_MOTION[k as keyof typeof ENEMY_MOTION]).toBeCloseTo(v, 12);
    for (const [k, v] of Object.entries({ ...PINNED, turnAim: 1.0471975511965976, turnAccel: 6 })) expect(ENEMY_CALM_MOTION[k as keyof typeof ENEMY_CALM_MOTION]).toBeCloseTo(v, 12);
  });
  it('changing the player tuning never reaches the enemies', () => {
    const keep = { ...MOVEMENT };
    try {
      for (const k of Object.keys(MOVEMENT) as (keyof typeof MOVEMENT)[]) (MOVEMENT as Record<string, number>)[k] = keep[k] * 2 + 1;
      for (const [k, v] of Object.entries(PINNED)) expect(ENEMY_MOTION[k as keyof typeof ENEMY_MOTION]).toBeCloseTo(v, 12);
    } finally {
      Object.assign(MOVEMENT, keep);
    }
  });
});
