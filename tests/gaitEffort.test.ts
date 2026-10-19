import { describe, expect, it } from 'vitest';
import { GAIT_REF, GEARS } from '../src/config/movement';
import { effortLevel, effortSpeed } from '../src/anim/effort';
import { MotionDerive } from '../src/anim/motionDerive';
import { FootPlanner, emptyPlannerInput, HEEL_RAISE, HEEL_ROLL } from '../src/anim/footPlanner';

// (locomotion step 22) the pure parts of batch 1b and the M14 weight change
describe('effort curve (D5.1, A88)', () => {
  it('each gear cap poses as its 3.2.0 reference pace, both stances; monotonic in between', () => {
    for (let g = 0; g < 5; g++) {
      expect(effortSpeed(GEARS.stand[g]!, false)).toBeCloseTo(GAIT_REF.stand[g]!, 9);
      expect(effortSpeed(GEARS.crouch[g]!, true)).toBeCloseTo(GAIT_REF.crouch[g]!, 9);
    }
    let prev = -1;
    for (let v = 0; v <= 5; v += 0.01) {
      const e = effortSpeed(v, false);
      expect(e).toBeGreaterThanOrEqual(prev);
      prev = e;
    }
    expect(effortSpeed(0, false)).toBe(0);
    expect(effortLevel(GEARS.stand[4]!, false)).toBeCloseTo(1, 9);
    expect(effortLevel(GEARS.crouch[4]!, true)).toBeCloseTo(1, 9);
  });
});

describe('remote motion derive (D8, D5.2 / D5.3)', () => {
  it('a start leans forward, a stop reads stop then idle, steady pace reads no lean', () => {
    const d = new MotionDerive();
    const dt = 1 / 60;
    let v = 0;
    let peak = 0;
    for (let k = 0; k < 30; k++) {
      v = Math.min(2.3, v + 2.3 / 18);
      d.update(dt, 0, v, 0);
      peak = Math.max(peak, d.accelFwd);
    }
    expect(peak).toBeGreaterThan(2);
    expect(d.motion).toBe('move');
    for (let k = 0; k < 90; k++) d.update(dt, 0, 2.3, 0);
    expect(Math.abs(d.accelFwd)).toBeLessThan(0.05);
    let sawStop = false;
    for (let k = 0; k < 40; k++) {
      v = Math.max(0, v - 2.3 / 15);
      d.update(dt, 0, v, 0);
      sawStop ||= d.motion === 'stop';
    }
    expect(sawStop).toBe(true);
    expect(d.motion).toBe('idle');
    // side acceleration is in the body frame (facing +x: a push along +z is to the left, negative side)
    const e = new MotionDerive();
    for (let k = 0; k < 20; k++) e.update(dt, 0, k * 0.1, Math.PI / 2);
    expect(e.accelSide).toBeLessThan(-1);
    expect(Math.abs(e.accelFwd)).toBeLessThan(0.2);
  });
});

describe('heel-to-toe roll (A79)', () => {
  it('at a walking pace a landing is heel first and rolls flat within HEEL_ROLL.time; faster gaits land flat; the heel rises late in the stance', () => {
    for (const [speed, roll] of [[1.1, true], [3.15, false]] as const) {
      const p = new FootPlanner();
      const i = emptyPlannerInput();
      i.dt = 1 / 120;
      i.moving = true;
      i.velZ = speed;
      i.cycleTime = (2 * (0.3 + 0.2 * speed)) / speed;
      let z = 0;
      let rolled = false;
      let flatAfter = true;
      let raised = 0;
      for (let k = 0; k < 360; k++) {
        z += speed * i.dt;
        i.rootZ = z;
        i.phase = ((k * i.dt) / i.cycleTime) % 1;
        p.update(i);
        for (const f of [p.L, p.R]) {
          if (f.landed) rolled ||= f.pitch < -0.05;
          // (G1) after the roll no toe-up on the floor; the heel comes up (toe down, pitch > 0) late in the stance only
          if (f.contact && f.roll <= 0 && f.pitch < -1e-9) flatAfter = false;
          if (f.contact && f.roll <= 0 && f.pitch > 0) raised = Math.max(raised, f.pitch);
          expect(f.roll).toBeLessThanOrEqual(HEEL_ROLL.time + 1e-9);
        }
      }
      expect(rolled).toBe(roll);
      expect(flatAfter).toBe(true);
      expect(raised).toBeGreaterThan(0.2);
      expect(raised).toBeLessThanOrEqual(HEEL_RAISE.pitchRun + 1e-9);
    }
  });
});
