import { describe, expect, it } from 'vitest';
import {
  DashGate,
  EasedVelocity,
  directionMult,
  lookCap,
  needsPivot,
  noiseRadius,
  pickTraversal,
  targetSpeed,
  turnRate,
} from '../src/player/movement';
import { MOVEMENT } from '../src/config/movement';
import { CARRY, WeaponCarry, classWeight, emptyCarryInput, pickReady } from '../src/weapons/weaponCarry';
import { CAMERA, framing } from '../src/config/camera';
import { lateralOffset } from '../src/anim/animGraph';

const DT = 1 / 60;

describe('tactical movement speeds', () => {
  it('creep, walk, brisk, stance caps (m/s)', () => {
    expect(targetSpeed(0.02, 'stand')).toBe(0);
    expect(targetSpeed(MOVEMENT.creepBand, 'stand')).toBeCloseTo(MOVEMENT.creepSpeed);
    expect(targetSpeed(1, 'stand')).toBeCloseTo(1.2);
    expect(targetSpeed(1, 'stand', 0, 1, 1)).toBeCloseTo(2.0);
    expect(targetSpeed(1, 'crouch')).toBeCloseTo(0.9);
    expect(targetSpeed(1, 'ads')).toBeCloseTo(1.0);
    expect(targetSpeed(1, 'cover')).toBeCloseTo(1.0);
    expect(targetSpeed(1, 'reload', 0, 1, 1)).toBeCloseTo(0.6);
    expect(targetSpeed(0.3, 'stand')).toBeLessThan(targetSpeed(0.6, 'stand'));
  });
  it('no running: nothing outside a dash exceeds brisk speed', () => {
    for (const st of ['stand', 'crouch', 'ads', 'cover', 'reload'] as const) {
      for (let m = 0; m <= 1; m += 0.1) expect(targetSpeed(m, st, 0, 1, 1)).toBeLessThanOrEqual(MOVEMENT.briskSpeed + 1e-9);
    }
  });
  it('strafe 90%, backstep 70%', () => {
    expect(directionMult(0, 1)).toBeCloseTo(1);
    expect(directionMult(1, 0)).toBeCloseTo(0.9);
    expect(directionMult(0, -1)).toBeCloseTo(0.7);
    expect(targetSpeed(1, 'stand', 0, -1)).toBeCloseTo(1.2 * 0.7);
    // brisk is forward only
    expect(targetSpeed(1, 'stand', 1, 0, 1)).toBeCloseTo(1.2 * 0.9);
    expect(targetSpeed(1, 'stand', 0, -1, 1)).toBeCloseTo(1.2 * 0.7);
  });
  it('eased start and stop, no overshoot', () => {
    const v = new EasedVelocity();
    const xs: number[] = [];
    for (let i = 0; i < 90; i++) {
      v.step(1.2, 0, DT);
      xs.push(v.x);
    }
    expect(xs[2]! - xs[1]!).toBeGreaterThan(xs[1]! - xs[0]!);
    expect(xs[89]!).toBeCloseTo(1.2, 2);
    expect(Math.max(...xs)).toBeLessThanOrEqual(1.2 + 1e-6);
    const ys: number[] = [];
    for (let i = 0; i < 60; i++) {
      v.step(0, 0, DT);
      ys.push(v.x);
    }
    expect(ys[0]!).toBeGreaterThan(0.8);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(ys[59]!).toBeLessThan(0.02);
  });
});

describe('turning', () => {
  it('turn rate limited by stance: aiming slowest (dash aside)', () => {
    expect(turnRate(true, 0, false)).toBeLessThan(turnRate(false, 1, false));
    expect(turnRate(false, 1, false)).toBeLessThan(turnRate(false, 0, false));
    expect(turnRate(false, 5, true)).toBeLessThan(turnRate(true, 0, false));
    expect(lookCap(true, false)).toBeLessThan(lookCap(false, false));
  });
  it('reversals at speed need a pivot; small turns or standing still do not', () => {
    expect(needsPivot(0, Math.PI, 1.2)).toBe(true);
    expect(needsPivot(0, 0.5, 1.2)).toBe(false);
    expect(needsPivot(0, Math.PI, 0.2)).toBe(false);
    expect(needsPivot(3, -3, 1.2)).toBe(false); // wraps: only 0.28 rad apart
    expect(MOVEMENT.pivotTime).toBeGreaterThanOrEqual(0.4);
    expect(MOVEMENT.pivotTime).toBeLessThanOrEqual(0.6);
  });
});

describe('dash', () => {
  it('wind-up, rush up to the max, recovery; weapon blocked throughout', () => {
    const d = new DashGate();
    expect(d.start()).toBe(true);
    expect(d.state).toBe('windup');
    expect(d.blocksWeapon).toBe(true);
    let t = 0;
    while (d.state === 'windup') {
      d.update(DT);
      t += DT;
    }
    expect(t).toBeCloseTo(MOVEMENT.dashWindup, 1);
    expect(d.state).toBe('rush');
    expect(d.blend).toBe(1);
    t = 0;
    while (d.state === 'rush') {
      d.update(DT);
      t += DT;
    }
    expect(t).toBeLessThanOrEqual(MOVEMENT.dashMax + 0.02);
    expect(d.state).toBe('recover');
    expect(d.blocksWeapon).toBe(true);
    for (let k = 0; k < 30; k++) d.update(DT);
    expect(d.blocksWeapon).toBe(false);
  });
  it('stamina: repeated dashes run dry, cooldown, then regenerate', () => {
    const d = new DashGate();
    let dashes = 0;
    for (let k = 0; k < 10 && d.start(); k++) {
      dashes++;
      while (d.state !== 'off') d.update(DT);
    }
    expect(dashes).toBeGreaterThanOrEqual(2);
    expect(dashes).toBeLessThan(10);
    expect(d.start()).toBe(false);
    for (let k = 0; k < 60 * 8; k++) d.update(DT);
    expect(d.stamina).toBeCloseTo(1);
    expect(d.start()).toBe(true);
  });
  it('stop() ends the rush early into recovery', () => {
    const d = new DashGate();
    d.start();
    for (let k = 0; k < 20; k++) d.update(DT);
    d.stop();
    expect(d.state).toBe('recover');
    expect(d.dashing).toBe(false);
  });
});

describe('contextual traversal and noise', () => {
  it('picks step / vault / mantle / none by obstacle', () => {
    expect(pickTraversal({ height: 0.1, depth: 1, landingClear: true, topClear: true })).toBe('none');
    expect(pickTraversal({ height: 0.4, depth: 0.5, landingClear: true, topClear: true })).toBe('step');
    expect(pickTraversal({ height: 0.6, depth: 2.4, landingClear: false, topClear: true })).toBe('step');
    expect(pickTraversal({ height: 1.0, depth: 0.5, landingClear: true, topClear: true })).toBe('vault');
    expect(pickTraversal({ height: 1.0, depth: 3, landingClear: false, topClear: true })).toBe('mantle');
    expect(pickTraversal({ height: 1.6, depth: 3, landingClear: false, topClear: true })).toBe('mantle');
    expect(pickTraversal({ height: 1.6, depth: 3, landingClear: false, topClear: false })).toBe('none');
    expect(pickTraversal({ height: 2.4, depth: 0.5, landingClear: true, topClear: true })).toBe('none');
  });
  it('noise scales with speed: still silent, creep quiet, dash loud, crouch quieter', () => {
    expect(noiseRadius(0, false, false)).toBe(0);
    const creep = noiseRadius(0.6, false, false);
    const walk = noiseRadius(1.2, false, false);
    const brisk = noiseRadius(2.0, false, false);
    expect(creep).toBeLessThan(walk);
    expect(walk).toBeLessThan(brisk);
    expect(brisk).toBeLessThan(noiseRadius(5.5, false, true));
    expect(noiseRadius(1.2, true, false)).toBeLessThan(walk);
  });
});

describe('weapon carry', () => {
  it('ready position by context', () => {
    const i = emptyCarryInput();
    expect(pickReady(i)).toBe('low');
    i.tight = true;
    expect(pickReady(i)).toBe('high');
    i.doorway = true;
    expect(pickReady(i)).toBe('compressed');
  });
  it('raise before firing takes 120-180 ms (rifle), heavier is slower', () => {
    const raiseTime = (weight: number): number => {
      const c = new WeaponCarry();
      const i = emptyCarryInput();
      i.fire = true;
      i.weight = weight;
      let t = 0;
      while (!c.canFire(i) && t < 2) {
        c.update(DT, i);
        t += DT;
      }
      return t;
    };
    const rifle = raiseTime(1);
    expect(rifle).toBeGreaterThanOrEqual(0.1);
    expect(rifle).toBeLessThanOrEqual(0.2);
    expect(raiseTime(0.7)).toBeLessThan(rifle);
    expect(raiseTime(1.35)).toBeGreaterThan(rifle);
  });
  it('holds up after the last shot, then lowers back to ready', () => {
    const c = new WeaponCarry();
    const i = emptyCarryInput();
    i.ads = true;
    for (let k = 0; k < 30; k++) c.update(DT, i);
    expect(c.raise).toBeGreaterThan(0.95);
    i.ads = false;
    i.sinceShot = 0;
    for (let k = 0; k < 30; k++) {
      i.sinceShot += DT;
      c.update(DT, i);
    }
    expect(c.raise).toBeGreaterThan(0.95); // 0.5 s after the shot: still up
    for (let k = 0; k < 90; k++) {
      i.sinceShot += DT;
      c.update(DT, i);
    }
    expect(c.raise).toBeLessThan(0.05);
    expect(CARRY.holdAfterFire).toBeCloseTo(0.6);
  });
  it('dash, reload and traversal block the raise and the trigger', () => {
    const c = new WeaponCarry();
    const i = emptyCarryInput();
    i.fire = true;
    i.dashing = true;
    for (let k = 0; k < 30; k++) c.update(DT, i);
    expect(c.raise).toBeLessThan(0.01);
    expect(c.canFire(i)).toBe(false);
    expect(c.ready).toBe('compressed');
  });
  it('ready weights cross-fade and always sum to 1', () => {
    const c = new WeaponCarry();
    const i = emptyCarryInput();
    i.nearWall = true;
    c.update(0.1, i);
    expect(c.w.low).toBeGreaterThan(0);
    expect(c.w.compressed).toBeGreaterThan(0);
    expect(c.w.low + c.w.high + c.w.compressed).toBeCloseTo(1);
    for (let k = 0; k < 30; k++) c.update(DT, i);
    expect(c.w.compressed).toBeCloseTo(1);
  });
  it('class weights', () => {
    expect(classWeight('pistol')).toBeLessThan(classWeight('rifle'));
    expect(classWeight('sniper')).toBeGreaterThan(classWeight('shotgun'));
  });
});

describe('camera framing', () => {
  it('tight over-the-shoulder: hip 1.2 m boom, 0.5 m shoulder, 1.6 m pivot; ADS pushes in', () => {
    const hip = framing(0, 0, 0);
    expect(hip.boom).toBeCloseTo(1.2);
    expect(hip.shoulder).toBeCloseTo(0.5);
    expect(hip.pivot).toBeCloseTo(1.6);
    const ads = framing(1, 0, 0);
    expect(ads.boom).toBeCloseTo(0.75);
    expect(ads.shoulder).toBeLessThan(hip.shoulder);
    expect(framing(0, 1, 0).pivot).toBeLessThan(hip.pivot);
    expect(framing(0, 0, 1).boom).toBeGreaterThan(hip.boom);
    expect(framing(0, 0, 1).boom).toBeLessThan(1.6); // a nudge, never a chase camera
    expect(CAMERA.fov).toBe(75);
  });
});

describe('sidestep gait', () => {
  it('feet never cross when moving sideways', () => {
    // moving right (dx = 1): left foot (side -1) and right foot (side 1) at every phase of the stride
    for (let along = -0.5; along <= 0.5; along += 0.05) {
      const l = -0.11 + lateralOffset(1, along, 0.3, -1);
      const r = 0.11 + lateralOffset(1, along, 0.3, 1);
      expect(r - l).toBeGreaterThan(0.1);
    }
  });
});
