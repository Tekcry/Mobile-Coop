import { describe, expect, it } from 'vitest';
import { EasedVelocity, directionMult, noiseRadius, pickTraversal, targetSpeed } from '../src/player/movement';
import { MOVEMENT } from '../src/config/movement';
import { CARRY, DRAW_RAISE, WeaponCarry, classWeight, emptyCarryInput, pickReady } from '../src/weapons/weaponCarry';
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
    expect(targetSpeed(1, 'ads')).toBeCloseTo(1.4);
    expect(targetSpeed(1, 'adsCrouch')).toBeCloseTo(1.0);
    for (const st of ['stand', 'crouch'] as const) for (let m = 0.1; m < 0.85; m += 0.1) expect(targetSpeed(m, st)).toBeLessThan(targetSpeed(m + 0.1, st));
  });
  it('strafe and backstep penalties only while aiming (x0.5, anim-rework S3 glide / x0.75)', () => {
    expect(directionMult(1, 0)).toBeCloseTo(0.5);
    expect(directionMult(0, -1)).toBeCloseTo(0.75);
    expect(targetSpeed(1, 'ads', 0, -1)).toBeCloseTo(1.4 * 0.75);
    expect(targetSpeed(1, 'ads', 1, 0)).toBeCloseTo(1.4 * 0.5);
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
  it('noise by stance and pace (CT prototype M1, G40): slow speeds silent, the run carries', () => {
    expect(noiseRadius(0, false, false)).toBe(0);
    expect(noiseRadius(0.8, true, false)).toBe(0);
    // crouched speeds 1-3 (<= 1.5 m/s) and standing speeds 1-2 (<= 0.75) silent; the rest audible
    expect(noiseRadius(1.5, true, false)).toBe(0);
    expect(noiseRadius(2.0, false, false)).toBeGreaterThan(1);
    expect(noiseRadius(2.1, true, false)).toBeGreaterThan(1);
    expect(noiseRadius(0.75, false, false)).toBe(0);
    const jog = noiseRadius(3.0, false, false);
    const run = noiseRadius(4.2, false, false);
    expect(jog).toBeGreaterThan(2.5);
    expect(run).toBeGreaterThan(jog);
    expect(run).toBeLessThanOrEqual(10);
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
  it('raise before firing takes about 0.3-0.45 s (rifle trigger live ~0.38 s, F1a: half of G103), heavier is slower', () => {
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
    expect(rifle).toBeGreaterThanOrEqual(0.3);
    expect(rifle).toBeLessThanOrEqual(0.5);
    expect(raiseTime(0.7)).toBeLessThan(rifle);
    expect(raiseTime(1.35)).toBeGreaterThan(rifle);
  });
  it('(F6) a rifle draw raises with its travel: well up by the travel end (~0.22 s), not at the low ready (G103 timing)', () => {
    const after = (raiseTime: number, secs: number): number => {
      const c = new WeaponCarry();
      const i = emptyCarryInput();
      i.ads = true;
      i.raiseTime = raiseTime;
      for (let t = 0; t < secs - 1e-9; t += DT) c.update(DT, i);
      return c.raise;
    };
    // the raise starts as the gun leaves the slot, so by the travel end it is past half way and rising; shouldered (0.9)
    // about 0.45 s after the slot, the whole draw about 0.7 s (G103)
    expect(after(DRAW_RAISE.time, 0.22)).toBeGreaterThan(0.5);
    expect(after(DRAW_RAISE.time, 0.5)).toBeGreaterThan(0.9);
    expect(after(0, 0.22)).toBeLessThan(0.7);
  });
  it('holds up after the last shot, then lowers back to ready', () => {
    const c = new WeaponCarry();
    const i = emptyCarryInput();
    i.ads = true;
    for (let k = 0; k < 90; k++) c.update(DT, i);
    expect(c.raise).toBeGreaterThan(0.95);
    i.ads = false;
    i.sinceShot = 0;
    for (let k = 0; k < 30; k++) {
      i.sinceShot += DT;
      c.update(DT, i);
    }
    expect(c.raise).toBeGreaterThan(0.95); // 0.5 s after the shot: still up
    for (let k = 0; k < 120; k++) {
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
    // sprinting carries the low ready (the compressed tuck pushed the gun into the chest at a sprint)
    expect(c.ready).toBe('low');
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
  it('CT framing (A2.1, G3 footage): 1.8 m boom tight / 2.8 m open, 0.15 m shoulder, head-top pivot 1.68; aim 0.40 m / 0.30 m at 1.52 m; FOV 86', () => {
    const hip = framing(0, 0);
    expect(hip.boom).toBeCloseTo(1.8);
    expect(hip.shoulder).toBeCloseTo(0.15);
    expect(hip.pivot).toBeCloseTo(1.68);
    // (G3, AUDIT-CAMERA rows 1 and 7) an open space: 2.8 m standing, 2.2 m crouched; the aim boom is the same in both
    expect(framing(0, 0, CAMERA, 1).boom).toBeCloseTo(2.8);
    expect(framing(0, 1, CAMERA, 1).boom).toBeCloseTo(2.2);
    expect(framing(0, 1, CAMERA, 0).boom).toBeCloseTo(1.8);
    expect(framing(1, 0, CAMERA, 1).boom).toBeCloseTo(0.4);
    const ads = framing(1, 0);
    expect(ads.boom).toBeCloseTo(0.4);
    expect(ads.shoulder).toBeCloseTo(0.3);
    // the camera at 1.52 m: the head centre about 7 deg above the screen centre (CT 4-10)
    expect(ads.pivot).toBeCloseTo(1.52);
    // (row 2) the pivot ~37 deg off the view axis: aiming, the head moves onto the stock (~0.13 m toward the camera
    // side), so its centre lands near x 0.3 as in CT (105845 @ 36.5); 0.17 put it over the reticle in the G3 render
    expect((Math.atan2(ads.shoulder, ads.boom) * 180) / Math.PI).toBeGreaterThan(32);
    expect((Math.atan2(ads.shoulder, ads.boom) * 180) / Math.PI).toBeLessThan(42);
    expect(framing(0, 1).pivot).toBeCloseTo(MOVEMENT.crouchHeight - 0.07);
    // (F2) crouched aim follows the body down: the same framing relative to the body, the pivot lower by the kneel aim's
    // share of the crouch drop (the aiming upper body is upright)
    const ac = framing(1, 1);
    expect(ac.boom).toBeCloseTo(ads.boom);
    expect(ac.shoulder).toBeCloseTo(ads.shoulder);
    expect(ads.pivot - ac.pivot).toBeCloseTo((MOVEMENT.standHeight - MOVEMENT.crouchHeight) * CAMERA.aimCrouchShare);
    expect(ac.pivot).toBeLessThan(ads.pivot - 0.3);
    expect(CAMERA.fov).toBe(86);
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
