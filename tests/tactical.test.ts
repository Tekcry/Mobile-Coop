import { describe, expect, it } from 'vitest';
import { SprintGate, EasedVelocity, directionMult, noiseRadius, pickTraversal, targetSpeed } from '../src/player/movement';
import { MOVEMENT } from '../src/config/movement';
import { CARRY, WeaponCarry, classWeight, emptyCarryInput, pickReady } from '../src/weapons/weaponCarry';
import { CAMERA, framing } from '../src/config/camera';
import { lateralOffset } from '../src/anim/animGraph';

const DT = 1 / 60;

describe('stealth movement speeds', () => {
  it('crouched sneak -> crouch walk -> crouch run, standing walk -> jog, analog on the stick (m/s)', () => {
    expect(targetSpeed(0.02, 'stand')).toBe(0);
    expect(targetSpeed(MOVEMENT.sneakBand, 'crouch')).toBeCloseTo(0.8);
    expect(targetSpeed(MOVEMENT.crouchWalkBand, 'crouch')).toBeCloseTo(1.8);
    expect(targetSpeed(1, 'crouch')).toBeCloseTo(2.6);
    expect(targetSpeed(MOVEMENT.walkBand, 'stand')).toBeCloseTo(1.4);
    expect(targetSpeed(1, 'stand')).toBeCloseTo(2.8);
    expect(targetSpeed(1, 'sprint')).toBeCloseTo(5);
    expect(targetSpeed(1, 'ads')).toBeCloseTo(1.4);
    expect(targetSpeed(1, 'adsCrouch')).toBeCloseTo(1.0);
    for (const st of ['stand', 'crouch'] as const) for (let m = 0.1; m < 0.85; m += 0.1) expect(targetSpeed(m, st)).toBeLessThan(targetSpeed(m + 0.1, st));
  });
  it('strafe and backstep penalties only while aiming (x0.9 / x0.75)', () => {
    expect(directionMult(1, 0)).toBeCloseTo(0.9);
    expect(directionMult(0, -1)).toBeCloseTo(0.75);
    expect(targetSpeed(1, 'ads', 0, -1)).toBeCloseTo(1.4 * 0.75);
    expect(targetSpeed(1, 'ads', 1, 0)).toBeCloseTo(1.4 * 0.9);
    // not aiming: the body faces where it goes, so no penalty
    expect(targetSpeed(1, 'stand', 0, -1)).toBeCloseTo(2.8);
    expect(targetSpeed(1, 'crouch', 1, 0)).toBeCloseTo(2.6);
  });
  it('eased velocity helper: no overshoot', () => {
    const v = new EasedVelocity();
    const xs: number[] = [];
    for (let i = 0; i < 90; i++) {
      v.step(1.2, 0, DT);
      xs.push(v.x);
    }
    expect(xs[89]!).toBeCloseTo(1.2, 2);
    expect(Math.max(...xs)).toBeLessThanOrEqual(1.2 + 1e-6);
  });
});

describe('sprint', () => {
  it('immediate, stamina-free, weapon blocked while sprinting', () => {
    const d = new SprintGate();
    expect(d.start()).toBe(true);
    expect(d.sprinting).toBe(true);
    expect(d.blocksWeapon).toBe(true);
    for (let k = 0; k < 60 * 30; k++) d.update(DT, 1);
    expect(d.sprinting).toBe(true);
    expect(d.stamina).toBe(1);
  });
  it('ends when the stick is released for more than a moment, or on stop()', () => {
    const d = new SprintGate();
    d.start();
    for (let k = 0; k < 5; k++) d.update(DT, 0);
    expect(d.sprinting).toBe(true);
    for (let k = 0; k < 10; k++) d.update(DT, 0);
    expect(d.sprinting).toBe(false);
    d.start();
    d.stop();
    expect(d.blocksWeapon).toBe(false);
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
    expect(pickTraversal({ height: 1.78, depth: 3, landingClear: false, topClear: true })).toBe('mantle');
    expect(pickTraversal({ height: 1.6, depth: 3, landingClear: false, topClear: false })).toBe('none');
    expect(pickTraversal({ height: 2.4, depth: 0.5, landingClear: true, topClear: true })).toBe('none');
  });
  it('noise by stance and pace: sneak near silent, crouch walk quiet, jog audible, sprint loud', () => {
    expect(noiseRadius(0, false, false)).toBe(0);
    const sneak = noiseRadius(0.8, true, false);
    const crouchWalk = noiseRadius(1.8, true, false);
    const walk = noiseRadius(1.4, false, false);
    const jog = noiseRadius(2.8, false, false);
    const sprint = noiseRadius(5, false, true);
    expect(sneak).toBeLessThan(1);
    expect(crouchWalk).toBeLessThan(walk);
    expect(walk).toBeLessThan(jog);
    expect(jog).toBeGreaterThan(7);
    expect(sprint).toBeGreaterThan(jog * 1.5);
    expect(noiseRadius(2.6, true, false)).toBeLessThan(jog);
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
  it('raise before firing takes 120-200 ms (rifle), heavier is slower', () => {
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
