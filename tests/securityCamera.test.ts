import { describe, expect, it } from 'vitest';
import { CAMERA } from '../src/config/security';
import { PERCEPTION, seenAt, sightRate } from '../src/ai/perception';
import { SENSITIVITY } from '../src/ai/alertState';
import { LIGHT } from '../src/world/lights';
import { CameraUnit, camRange, cameraRate, cameraReach, inFrame, newMeter, segmentHitsHousing, stepCamMeter, sweepCycle, sweepYaw } from '../src/security/camera';
import { validateSecurity, type CameraDevice } from '../src/security/data';
import { SecuritySystem, cameraSight, type SecurityHost } from '../src/security/securitySystem';
import { Vector3 } from '../src/core/babylon';
import type { PlayerRef } from '../src/ai/enemy';

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
    // (camera-range) 8 m out: the frame's sides stay inside the 12 m default range
    const z = 8;
    const inside = z * Math.tan(34.5 * DEG);
    const outside = z * Math.tan(35.5 * DEG);
    expect(at(inside, 1.6, z)).toBe(true);
    expect(at(-inside, 1.6, z)).toBe(true);
    expect(at(outside, 1.6, z)).toBe(false);
    expect(at(-outside, 1.6, z)).toBe(false);
  });

  it('(camera-range) cuts at the default range (12 m, was 18) and at a range it is given', () => {
    expect(CAMERA.range).toBe(12);
    expect(at(0, 3, 11.9)).toBe(true);
    expect(at(0, 3, 12.1)).toBe(false);
    expect(inFrame(0, 0, 3, 0, 0, 3, 7.9, 0, 8)).toBe(true);
    expect(inFrame(0, 0, 3, 0, 0, 3, 8.1, 0, 8)).toBe(false);
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

describe('camera meter (SN08-SN10, derived from PERCEPTION; camera-range: the falloff over the camera range)', () => {
  // (camera-range) the S0 derivations were at 10 m of an 18 m range; the same times now hold at the zone's middle
  // (6 m of the 12 m default range): the falloff 1 - (d / range)^2 there (0.75) is close to the old 0.72 at 6 m
  it('a lit walking body at the middle of the zone (6 m of 12) fills in about 1 s, within 15 % of the guard curve at 6 m', () => {
    const t = timeToFull(cameraRate(6, false, WALK));
    expect(t).toBeGreaterThanOrEqual(0.75);
    expect(t).toBeLessThanOrEqual(1.25);
    const guard6 = sightRate({ dist: 6, angle: 0, light: 1, crouched: false, speed: WALK, exposure: 1, sensitivity: SENSITIVITY.unaware });
    expect(Math.abs(cameraRate(6, false, WALK) - guard6) / guard6).toBeLessThan(0.15);
  });

  it('a lit crouched still body at the middle of the zone takes about 3.5 s', () => {
    const t = timeToFull(cameraRate(6, true, 0));
    expect(t).toBeGreaterThanOrEqual(3);
    expect(t).toBeLessThanOrEqual(4.5);
  });

  it('(camera-range) the rate falls to 0 at the range: just outside the zone nothing, just inside it under the leak', () => {
    for (const range of [CAMERA.range, 10, CAMERA.rangeMax]) {
      for (const [crouched, speed] of [[false, 0], [false, WALK], [false, 4], [true, 0], [true, 1.3]] as const) {
        expect(cameraRate(range + 0.01, crouched, speed, range)).toBe(0);
        expect(cameraRate(range, crouched, speed, range)).toBe(0);
        // the outer 3 % of the zone never fills the meter, even running
        expect(seenAt(cameraRate(range * 0.97, crouched, speed, range)), `${range} ${crouched} ${speed}`).toBe(false);
        // the reach (`cameraReach`): over the leak just inside it, under just outside it
        const r = cameraReach(crouched, speed, range);
        expect(r).toBeGreaterThan(range * 0.75);
        expect(seenAt(cameraRate(r - 0.02, crouched, speed, range))).toBe(true);
        expect(seenAt(cameraRate(r + 0.02, crouched, speed, range))).toBe(false);
      }
    }
    // inside: a standing body still at half the range fills, at the edge nothing
    expect(timeToFull(cameraRate(6, false, 0, 12))).toBeLessThan(3);
    expect(timeToFull(cameraRate(11.9, false, 0, 12))).toBe(Infinity);
  });

  it('(marlow-jammer M3) sees by its own IR: the rate is the same whatever the lamps; a guard in shadow is slower', () => {
    expect(CAMERA.irLight).toBeGreaterThanOrEqual(LIGHT.lit);
    const guard = (dist: number, light: number, crouched: boolean, speed: number): number =>
      sightRate({ dist, angle: 0, light, crouched, speed, exposure: 1, sensitivity: SENSITIVITY.unaware });
    // (camera-range) the camera's terms are the guard's but the falloff: the ratio to the lit guard rate is the falloff ratio
    for (const [dist, crouched, speed] of [[4, false, WALK], [8, false, WALK], [8, true, 0], [3, false, 4]] as const) {
      const k = dist / CAMERA.range;
      const ratio = (1 - k * k) / Math.pow(1 - dist / PERCEPTION.focusRange, PERCEPTION.distPow);
      const lit = guard(dist, 1, crouched, speed);
      if (lit < PERCEPTION.maxRate && cameraRate(dist, crouched, speed) < PERCEPTION.maxRate) expect(cameraRate(dist, crouched, speed)).toBeCloseTo(lit * ratio, 9);
      // a guard reads the lamps: in shadow it is much slower; the camera is not
      expect(guard(dist, LIGHT.shadow, crouched, speed)).toBeLessThan(cameraRate(dist, crouched, speed));
    }
    // the old shadow cases: a body walking in shadow at 4 m (13 s by the lamps) is caught as if lit
    expect(timeToFull(cameraRate(4, false, WALK))).toBeLessThan(2);
  });

  it('raises the suspicious stage at 0.3 and the full stage at 1, each once', () => {
    const m = newMeter();
    const rate = cameraRate(8, false, WALK);
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
    for (let i = 0; i < 6; i++) stepCamMeter(m, cameraRate(8, false, WALK), 1 / CAMERA.thinkHz);
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

describe('(camera-range) one zone for host and client', () => {
  // an aimed camera like the Sector Ops ones: 2.8 m up, aim 6 (range 2 x 6 = 12), facing +Z
  const aimed: CameraDevice = { id: 'a', kind: 'camera', level: 'ground', at: [0, 0], y: 2.8, facing: 0, aim: 6, reason: 't' };
  const open = { hitDistance: (a: Vector3, b: Vector3) => Vector3.Distance(a, b) };
  const head = (z: number, crouched = false): Vector3 => new Vector3(0, crouched ? 1.05 : 1.6, z);

  it('the range rule: own range, else 2 x aim, else 12 m, never over 14 m', () => {
    expect(camRange(aimed)).toBe(12);
    expect(camRange({ aim: 6.5 })).toBe(13);
    expect(camRange({ aim: 9 })).toBe(CAMERA.rangeMax);
    expect(camRange({ range: 10, aim: 6 })).toBe(10);
    expect(camRange({})).toBe(CAMERA.range);
    expect(new CameraUnit(aimed, 0).range).toBe(12);
  });

  it('a player just outside the zone is not picked up (any stance), one well inside is', () => {
    const c = new CameraUnit(aimed, 0);
    for (const [crouched, speed] of [[false, 0], [false, 2.1], [false, 4], [true, 0], [true, 1.3]] as const) {
      const r = cameraReach(crouched, speed, c.range);
      // just outside the reach (and the range): 0 or under the leak
      expect(seenAt(cameraSight(c, head(c.range + 0.2, crouched), crouched, speed, open))).toBe(false);
      expect(seenAt(cameraSight(c, head(Math.sqrt((r + 0.15) ** 2 - (c.y - head(0, crouched).y) ** 2), crouched), crouched, speed, open))).toBe(false);
      // inside: at the aim point the meter fills
      expect(seenAt(cameraSight(c, head(6, crouched), crouched, speed, open)), `${crouched} ${speed}`).toBe(true);
    }
  });

  it('the co-op client cue reads the same rate as the host think (one cameraSight, one CameraUnit range)', () => {
    const data = { devices: [aimed] };
    const feet = new Vector3(0, 0, 8);
    const p = { id: 'local', feet, speed: 2.1, crouched: false, target: { alive: true, headPoint: (v: Vector3) => v.set(0, 1.6, 8), aimPoint: (v: Vector3) => v.set(0, 1.6, 8) } } as unknown as PlayerRef;
    const host: SecurityHost = { ballistics: open as unknown as SecurityHost['ballistics'], players: () => [p] };
    const sys = new SecuritySystem(data, host);
    // the client builds its own unit from the same data (ctDevices) and calls cameraSight with the same body
    const client = new CameraUnit(aimed, 0);
    expect(client.range).toBe(sys.cameras[0]!.range);
    expect(client.pitch).toBe(sys.cameras[0]!.pitch);
    const clientRate = cameraSight(client, head(8), false, 2.1, open);
    const hostRate = cameraSight(sys.cameras[0]!, head(8), false, 2.1, open);
    expect(clientRate).toBe(hostRate);
    expect(hostRate).toBeGreaterThan(PERCEPTION.leak);
    // and the host's meter fills by exactly that rate over one think
    sys.fixedUpdate(1 / CAMERA.thinkHz);
    expect(sys.meterOf('a', 'local')!.meter).toBeCloseTo((hostRate - PERCEPTION.leak) / CAMERA.thinkHz, 9);
  });
});
