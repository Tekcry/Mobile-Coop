import { describe, expect, it } from 'vitest';
import { LOCO_CLIPS, LOCO_N, locoBlend } from '../src/characters/locomotion';
import { MOVEMENT } from '../src/config/movement';

const w = new Float64Array(LOCO_N);
const r = new Float64Array(LOCO_N);
const at = (name: (typeof LOCO_CLIPS)[number]): number => w[LOCO_CLIPS.indexOf(name)] as number;
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
    expect(at('strafe_walk_r')).toBeCloseTo(0.5, 9);
    locoBlend({ speed: 1.2, localX: 0, localZ: -1, crouch: 0 }, w, r);
    expect(at('walk_back')).toBeCloseTo(1, 9);
    locoBlend({ speed: 1.3, localX: -1, localZ: 0, crouch: 0 }, w, r);
    expect(at('strafe_walk_l')).toBeCloseTo(1, 9);
  });

  it('crouches into the crouch idle and crouch walk', () => {
    locoBlend({ speed: 0, localX: 0, localZ: 0, crouch: 1 }, w, r);
    expect(at('crouch_idle')).toBe(1);
    locoBlend({ speed: 1.1, localX: 0, localZ: 1, crouch: 1 }, w, r);
    expect(at('crouch_walk')).toBeCloseTo(1, 9);
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
});
