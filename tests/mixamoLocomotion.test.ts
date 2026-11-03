import { describe, expect, it } from 'vitest';
import { LOCO_SLOTS, LOCO_N, locoBlend, setClip } from '../src/characters/locomotion';
import { MOVEMENT } from '../src/config/movement';

const w = new Float64Array(LOCO_N);
const r = new Float64Array(LOCO_N);
const at = (name: (typeof LOCO_SLOTS)[number]): number => w[LOCO_SLOTS.indexOf(name)] as number;
const sum = (): number => w.reduce((a, b) => a + b, 0);

describe('mixamo locomotion blend (mixamo-chars slice a)', () => {
  it('stands still on the idle', () => {
    locoBlend({ speed: 0, localX: 0, localZ: 0, crouch: 0 }, w, r);
    expect(at('idle')).toBe(1);
    expect(sum()).toBeCloseTo(1, 9);
  });

  it('walks, runs and sprints forward by speed', () => {
    locoBlend({ speed: MOVEMENT.walkSpeed, localX: 0, localZ: 1, crouch: 0 }, w, r);
    expect(at('walk')).toBeCloseTo(1, 9);
    locoBlend({ speed: MOVEMENT.jogSpeed, localX: 0, localZ: 1, crouch: 0 }, w, r);
    expect(at('run')).toBeCloseTo(1, 9);
    locoBlend({ speed: MOVEMENT.sprintSpeed, localX: 0, localZ: 1, crouch: 0 }, w, r);
    expect(at('sprint')).toBeCloseTo(1, 9);
    locoBlend({ speed: (MOVEMENT.walkSpeed + MOVEMENT.jogSpeed) / 2, localX: 0, localZ: 1, crouch: 0 }, w, r);
    expect(at('walk')).toBeCloseTo(0.5, 9);
    expect(at('run')).toBeCloseTo(0.5, 9);
  });

  it('splits a diagonal between forward and strafe, and backwards uses the back walk', () => {
    locoBlend({ speed: 1.4, localX: 1, localZ: 1, crouch: 0 }, w, r);
    expect(at('walk')).toBeCloseTo(0.5, 9);
    expect(at('right')).toBeCloseTo(0.5, 9);
    locoBlend({ speed: 1.2, localX: 0, localZ: -1, crouch: 0 }, w, r);
    expect(at('back')).toBeCloseTo(1, 9);
    locoBlend({ speed: 1.3, localX: -1, localZ: 0, crouch: 0 }, w, r);
    expect(at('left')).toBeCloseTo(1, 9);
  });

  it('crouches into the crouch idle and crouch walk', () => {
    locoBlend({ speed: 0, localX: 0, localZ: 0, crouch: 1 }, w, r);
    expect(at('c_idle')).toBe(1);
    locoBlend({ speed: 1.1, localX: 0, localZ: 1, crouch: 1 }, w, r);
    expect(at('c_walk')).toBeCloseTo(1, 9);
    locoBlend({ speed: 1.1, localX: 0, localZ: 1, crouch: 0.5 }, w, r);
    expect(sum()).toBeCloseTo(1, 9);
  });

  it('weights always sum to 1 and speed ratios stay in their limits', () => {
    for (let s = 0; s <= 6; s += 0.25)
      for (let a = 0; a < 8; a++)
        for (const c of [0, 0.3, 1]) {
          locoBlend({ speed: s, localX: Math.sin(a), localZ: Math.cos(a), crouch: c }, w, r);
          expect(sum()).toBeCloseTo(1, 9);
          for (const v of r) {
            expect(v).toBeGreaterThanOrEqual(0.6);
            expect(v).toBeLessThanOrEqual(1.5);
          }
        }
  });

  it('aims the idles and turns a crouched sidestep into the crouched strafe', () => {
    locoBlend({ speed: 0, localX: 0, localZ: 0, crouch: 0, aim: 1 }, w, r);
    expect(at('aim_idle')).toBe(1);
    locoBlend({ speed: 1, localX: 1, localZ: 0, crouch: 1 }, w, r);
    expect(at('c_right')).toBeCloseTo(1, 9);
  });

  it('a set without a slot borrows a clip (pistol crouch back, unarmed aim idle)', () => {
    const k = (n: (typeof LOCO_SLOTS)[number]): number => LOCO_SLOTS.indexOf(n);
    expect(setClip('rifle', k('c_left'))).toBe('rifle_crouch_strafe_l');
    expect(setClip('pistol', k('c_walk'))).toBe('crouch_walk');
    expect(setClip('pistol', k('c_back'))).toBe('crouch_walk');
    expect(setClip('unarmed', k('aim_idle'))).toBe('idle');
  });

  it('(walk-test fix B) low ready drawn, aimed idles aimed, the Action Forge sneak crouched unarmed', () => {
    const k = (n: (typeof LOCO_SLOTS)[number]): number => LOCO_SLOTS.indexOf(n);
    expect(setClip('rifle', k('idle'))).toBe('rifle_low_ready');
    expect(setClip('rifle', k('aim_idle'))).toBe('rifle_aim_idle');
    expect(setClip('pistol', k('idle'))).toBe('pistol_low_ready');
    expect(setClip('pistol', k('aim_idle'))).toBe('pistol_idle');
    expect(['c_walk', 'c_back', 'c_left', 'c_right'].map((n) => setClip('unarmed', k(n as (typeof LOCO_SLOTS)[number])))).toEqual(['af_crouch_f', 'af_crouch_b', 'af_crouch_l', 'af_crouch_r']);
  });
});
