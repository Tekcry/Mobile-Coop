import { describe, expect, it } from 'vitest';
import { CAMERA } from '../src/config/security';
import { PERCEPTION } from '../src/ai/perception';
import { LIGHT } from '../src/world/lights';
import { CameraUnit, cameraRate, inFrame, newMeter, segmentHitsHousing, stepCamMeter, sweepCycle, sweepYaw } from '../src/security/camera';
import { validateSecurity, type CameraDevice } from '../src/security/data';

const DEG = Math.PI / 180;
/** Standing gear 2 (F18: 1.3 m/s): the walking speed S0's derived times (SN08, SN10) use. */
const WALK = 1.3;
const fixed: CameraDevice = { id: 'f', kind: 'camera', level: 'ground', at: [0, 0], y: 3, facing: 0, reason: 't' };
const pan: CameraDevice = { id: 'p', kind: 'camera', level: 'ground', at: [0, 0], y: 3, facing: 0, sweep: [0, 90], reason: 't' };

/** Seconds until a meter reaches 1 at a constant fill rate (thinking at the camera rate), or Infinity. */
function timeToFull(rate: number, limit = 60): number {
  const m = newMeter();
  const dt = 1 / CAMERA.thinkHz;
  for (let t = dt; t <= limit; t += dt) {
    stepCamMeter(m, rate, dt);
    if (m.meter >= 1) return t;
  }
  return Infinity;
}

describe('camera sweep (SN13-SN15)', () => {
  it('a 90 degree sweep takes 6 s each way with 2 s pauses (16 s cycle)', () => {
    expect(sweepCycle(pan.sweep)).toBeCloseTo(16, 6);
    expect(sweepYaw(pan, 0)).toBeCloseTo(0, 6);
    expect(sweepYaw(pan, 1.99)).toBeCloseTo(0, 6);
    expect(sweepYaw(pan, 5) / DEG).toBeCloseTo(45, 4);
    expect(sweepYaw(pan, 8)).toBeCloseTo(90 * DEG, 6);
    expect(sweepYaw(pan, 9.5)).toBeCloseTo(90 * DEG, 6);
    expect(sweepYaw(pan, 13) / DEG).toBeCloseTo(45, 4);
    expect(sweepYaw(pan, 16)).toBeCloseTo(0, 6);
  });

  it('a fixed camera holds its facing', () => {
    expect(sweepYaw({ facing: 135 }, 40)).toBeCloseTo(135 * DEG, 9);
  });

  it('gives the same angles at 60, 90 and 120 Hz', () => {
    const at = (hz: number, seconds: number): number => {
      const c = new CameraUnit(pan, 0);
      for (let i = 0; i < hz * seconds; i++) c.advance(1 / hz);
      return c.yaw;
    };
    for (const seconds of [3, 5, 9, 12, 20]) {
      const a = at(60, seconds);
      expect(Math.abs(at(90, seconds) - a)).toBeLessThan(0.1 * DEG);
      expect(Math.abs(at(120, seconds) - a)).toBeLessThan(0.1 * DEG);
    }
  });

  it('keeps turning while off or looped, and stops when destroyed', () => {
    const c = new CameraUnit(pan, 0);
    c.setMode('off');
    c.advance(5);
    expect(c.yaw / DEG).toBeCloseTo(45, 4);
    c.destroy();
    c.advance(3);
    expect(c.yaw / DEG).toBeCloseTo(45, 4);
    c.setMode('online');
    expect(c.mode).toBe('destroyed');
  });
});

describe('camera frame test (SN01-SN03)', () => {
  // camera at the origin, 3 m up, facing +Z
  const at = (x: number, y: number, z: number): boolean => inFrame(0, 0, 3, 0, x, y, z);

  it('sees a head straight ahead inside the range', () => {
    expect(at(0, 1.6, 10)).toBe(true);
  });

  it('cuts at the half field of view (35 deg) on both sides', () => {
    const z = 10;
    const inside = z * Math.tan(34.5 * DEG);
    const outside = z * Math.tan(35.5 * DEG);
    expect(at(inside, 1.6, z)).toBe(true);
    expect(at(-inside, 1.6, z)).toBe(true);
    expect(at(outside, 1.6, z)).toBe(false);
    expect(at(-outside, 1.6, z)).toBe(false);
  });

  it('cuts at the range (18 m)', () => {
    expect(at(0, 3, 17.9)).toBe(true);
    expect(at(0, 3, 18.1)).toBe(false);
  });

  it('cuts at the half vertical field (22.5 deg): a head under the mount is out of frame', () => {
    // head 1.4 m below the lens: 25 deg down at 3 m (out), 21 deg down at 3.6 m (in)
    expect(at(0, 1.6, 3)).toBe(false);
    expect(at(0, 1.6, 3.6)).toBe(true);
  });

  it('does not see behind or straight below', () => {
    expect(at(0, 1.6, -5)).toBe(false);
    expect(at(0, 0, 0)).toBe(false);
  });
});

describe('camera meter (SN08-SN10, derived from PERCEPTION)', () => {
  it('a lit walking body at 10 m fills in about 1.3 s (within 10 %)', () => {
    const t = timeToFull(cameraRate(10, 1, false, WALK));
    expect(t).toBeGreaterThanOrEqual(1.3 * 0.9 - 0.25);
    expect(t).toBeLessThanOrEqual(1.3 * 1.1 + 0.25);
  });

  it('a lit crouched still body at 10 m takes about 9 s (within 10 %)', () => {
    const t = timeToFull(cameraRate(10, 1, true, 0));
    expect(t).toBeGreaterThanOrEqual(9 * 0.9);
    expect(t).toBeLessThanOrEqual(9 * 1.1);
  });

  it('a body in shadow (0.28) walking at 4 m takes about 13 s (within 10 %)', () => {
    const t = timeToFull(cameraRate(4, LIGHT.shadow, false, WALK));
    expect(t).toBeGreaterThanOrEqual(13 * 0.9);
    expect(t).toBeLessThanOrEqual(13 * 1.1);
  });

  it('a body in shadow at 10 m is never detected', () => {
    expect(timeToFull(cameraRate(10, LIGHT.shadow, false, WALK), 120)).toBe(Infinity);
    expect(timeToFull(cameraRate(10, 0.1, true, 0), 120)).toBe(Infinity);
  });

  it('raises the suspicious stage at 0.3 and the full stage at 1, each once', () => {
    const m = newMeter();
    const rate = cameraRate(8, 1, false, WALK);
    const rose: number[] = [];
    for (let i = 0; i < 40; i++) {
      const r = stepCamMeter(m, rate, 1 / CAMERA.thinkHz);
      if (r) rose.push(r);
    }
    expect(rose).toEqual([1, 2]);
    expect(m.meter).toBe(1);
    expect(m.full).toBeGreaterThan(CAMERA.fullFrameTime);
  });

  it('leaving the frame drains the meter and resets the stage', () => {
    const m = newMeter();
    for (let i = 0; i < 6; i++) stepCamMeter(m, cameraRate(8, 1, false, WALK), 1 / CAMERA.thinkHz);
    expect(m.meter).toBeGreaterThan(PERCEPTION.suspicious);
    for (let i = 0; i < 80; i++) stepCamMeter(m, 0, 1 / CAMERA.thinkHz);
    expect(m.meter).toBe(0);
    expect(m.stage).toBe(0);
  });
});

describe('camera modes', () => {
  it('only an online camera covers a point; off, looped and destroyed are blind', () => {
    const c = new CameraUnit(fixed, 0);
    expect(c.covers(0, 1.6, 10)).toBe(true);
    for (const mode of ['off', 'looped'] as const) {
      c.setMode(mode);
      expect(c.covers(0, 1.6, 10)).toBe(false);
    }
    c.setMode('online');
    expect(c.covers(0, 1.6, 10)).toBe(true);
    c.destroy();
    expect(c.covers(0, 1.6, 10)).toBe(false);
  });

  it('a shot housing is hit along the facing axis and missed beside it', () => {
    const c = { x: 0, y: 3, z: 0, yaw: 0 };
    expect(segmentHitsHousing(c, 0, 3, 5, 0, 3, -5)).toBe(true);
    expect(segmentHitsHousing(c, 0.4, 3, 5, 0.4, 3, -5)).toBe(false);
    expect(segmentHitsHousing(c, 0, 3.4, 5, 0, 3.4, -5)).toBe(false);
    // turned 90 degrees: the long side now lies along X
    const turned = { x: 0, y: 3, z: 0, yaw: 90 * DEG };
    expect(segmentHitsHousing(turned, 5, 3, 0, -5, 3, 0)).toBe(true);
    expect(segmentHitsHousing(turned, 5, 3, 0.2, -5, 3, 0.2)).toBe(false);
  });
});

describe('security data validation', () => {
  it('accepts the S0 shape', () => {
    expect(validateSecurity({ devices: [fixed, pan].map((d, i) => ({ ...d, id: `c${i}` })) })).toEqual([]);
  });

  it('rejects a bad mount height, an over-wide sweep, duplicates, a missing reason and too many cameras', () => {
    expect(validateSecurity({ devices: [{ ...fixed, y: 2.0 }] }).join()).toMatch(/SN04/);
    expect(validateSecurity({ devices: [{ ...fixed, y: 3.6 }] }).join()).toMatch(/SN04/);
    expect(validateSecurity({ devices: [{ ...fixed, sweep: [0, 121] }] }).join()).toMatch(/SN13/);
    expect(validateSecurity({ devices: [fixed, fixed] }).join()).toMatch(/duplicate/);
    expect(validateSecurity({ devices: [{ ...fixed, reason: '' }] }).join()).toMatch(/no reason/);
    const many = Array.from({ length: 13 }, (_, i) => ({ ...fixed, id: `c${i}` }));
    expect(validateSecurity({ devices: many }).join()).toMatch(/SN60/);
  });
});
