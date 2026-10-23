/**
 * (guard-ai S16, A80-A86) The armour fire gate (src/ai/armourFire.ts): a guard who sees the target through clear
 * armoured glass (E10: not in `MASK.SIGHT`) holds fire when the muzzle -> aim line's first hit on `MASK.ENEMY_SHOT` is
 * armoured; plain glass is not in the shot mask, so he still fires through it; the verdict is cached `recheck` s per
 * guard while his cell and the aim cell stay put; after `moveAfter` s held he repositions once, holds while `retry`
 * runs, and only holds when he may not move (a room hold, a post leash); the gate allocates nothing.
 */
import { describe, expect, it } from 'vitest';
import { ARMOUR_FIRE, ArmourGate, type ArmourP3, type ArmourRay } from '../src/ai/armourFire';
import { G, MASK, doorMembership, glassMembership, isArmoured } from '../src/physics/groups';
import { losClear } from '../src/ai/perception';
import { bytesPerCall, HEAP_NUMBER, sink } from './helpers/allocPerCall';

/** A stand-in line: bodies at a distance along it with their membership bits; the cast stops at the first one the mask
 *  asks for (as Havok's filter does) and reports whether it carries the armour bit. */
function line(...bodies: [number, number][]): ArmourRay & { casts: number; ray(a: ArmourP3, b: ArmourP3, mask: number): { hit: boolean; distance: number } } {
  const sorted = bodies.slice().sort((a, b) => a[0] - b[0]);
  return {
    casts: 0,
    armouredFirst(_a, _b, mask) {
      this.casts++;
      for (const [, bits] of sorted) if ((bits & mask) !== 0) return isArmoured(bits);
      return false;
    },
    ray(_a, _b, mask) {
      for (const [d, bits] of sorted) if ((bits & mask) !== 0) return { hit: true, distance: d };
      return { hit: false, distance: 99 };
    },
  };
}

const muzzle = { x: 0, y: 1.35, z: 0 };
const aim = { x: 0, y: 1.2, z: 8 };
const PLAYER = [8, G.PLAYER_HITBOX] as [number, number];

describe('guard-ai S16: the armour fire gate', () => {
  it('an armoured clear pane first holds fire while sight passes it (the NOC window)', () => {
    const l = line([3, glassMembership('clear', true)], PLAYER);
    expect(losClear(l, muzzle, aim, 0.3), 'he still sees the target').toBe(true);
    const g = new ArmourGate();
    expect(g.gate(l, muzzle, aim, MASK.ENEMY_SHOT, 1, 2, 1 / 60)).toBe(true);
    expect(g.blocked).toBe(true);
    expect(g.plan(true)).toBe('hold');
  });

  it('an armoured door leaf first holds fire too (its bit is G.STATIC | armour)', () => {
    const g = new ArmourGate();
    expect(g.gate(line([2, doorMembership(true)], PLAYER), muzzle, aim, MASK.ENEMY_SHOT, 1, 2, 1 / 60)).toBe(true);
  });

  it('plain glass (clear or frosted) is not in the shot mask: he fires through it', () => {
    for (const kind of ['clear', 'frosted'] as const) {
      const g = new ArmourGate();
      expect(g.gate(line([3, glassMembership(kind, false)], PLAYER), muzzle, aim, MASK.ENEMY_SHOT, 1, 2, 1 / 60), kind).toBe(false);
      expect(g.plan(true)).toBe('fire');
    }
  });

  it('the player, a wall or a prop first: not armour (the round goes where it would anyway)', () => {
    const arm = glassMembership('clear', true);
    for (const first of [G.PLAYER_HITBOX, G.STATIC, G.PROP]) {
      const g = new ArmourGate();
      expect(g.gate(line([2, first], [3, arm], PLAYER), muzzle, aim, MASK.ENEMY_SHOT, 1, 2, 1 / 60), String(first)).toBe(false);
    }
    // a human shield's hit volumes first (the shield mask adds them): not armour either
    const g = new ArmourGate();
    expect(g.gate(line([1, G.ENEMY_HITBOX], [3, arm], PLAYER), muzzle, aim, MASK.ENEMY_SHOT | G.ENEMY_HITBOX, 1, 2, 1 / 60)).toBe(false);
  });

  it('the verdict is cached: one cast per recheck window while both cells stay, a new cell recasts at once', () => {
    const l = line([3, glassMembership('clear', true)], PLAYER);
    const g = new ArmourGate();
    const dt = 1 / 60;
    for (let i = 0; i < 14; i++) {
      g.gate(l, muzzle, aim, MASK.ENEMY_SHOT, 5, 9, dt);
      g.step(dt);
    }
    expect(l.casts, '14 ticks (0.23 s) inside 0.25 s: one cast').toBe(1);
    for (let i = 0; i < 60; i++) {
      g.gate(l, muzzle, aim, MASK.ENEMY_SHOT, 5, 9, dt);
      g.step(dt);
    }
    // 74 ticks = 1.23 s: a cast every 15 ticks (0.25 s)
    expect(l.casts).toBe(5);
    const before = l.casts;
    g.gate(l, muzzle, aim, MASK.ENEMY_SHOT, 5, 10, dt);
    expect(l.casts, 'the aim moved to another cell').toBe(before + 1);
    g.gate(l, muzzle, aim, MASK.ENEMY_SHOT, 6, 10, dt);
    expect(l.casts, 'he moved to another cell').toBe(before + 2);
    expect(g.casts).toBe(l.casts);
  });

  it('a pane that is gone (the line clears) is seen at the next recheck', () => {
    let armoured = true;
    const l: ArmourRay = { armouredFirst: () => armoured };
    const g = new ArmourGate();
    expect(g.gate(l, muzzle, aim, MASK.ENEMY_SHOT, 1, 1, 0.1)).toBe(true);
    armoured = false;
    g.step(0.1);
    expect(g.gate(l, muzzle, aim, MASK.ENEMY_SHOT, 1, 1, 0.1), 'cached').toBe(true);
    g.step(0.2);
    expect(g.gate(l, muzzle, aim, MASK.ENEMY_SHOT, 1, 1, 0.1), 'recast after 0.25 s').toBe(false);
    expect(g.held).toBe(0);
  });

  it('held fire: a reposition after moveAfter, holding through retry, then another; held to a room or post: hold only', () => {
    const l = line([3, glassMembership('clear', true)], PLAYER);
    const g = new ArmourGate();
    const dt = 1 / 60;
    let t = 0;
    const tick = (canMove: boolean) => {
      g.gate(l, muzzle, aim, MASK.ENEMY_SHOT, 1, 2, dt);
      const p = g.plan(canMove);
      g.step(dt);
      t += dt;
      return p;
    };
    let first = -1;
    while (t < 3 && first < 0) if (tick(true) === 'move') first = t;
    expect(first).toBeGreaterThanOrEqual(ARMOUR_FIRE.moveAfter);
    expect(first).toBeLessThan(ARMOUR_FIRE.moveAfter + 0.05);
    // the move runs moveT s ('moving'), then he holds until the retry is up
    expect(tick(true)).toBe('moving');
    const plans = new Set<string>();
    let second = -1;
    while (t < first + ARMOUR_FIRE.moveT + ARMOUR_FIRE.retry + 3 && second < 0) {
      const p = tick(true);
      if (p === 'move') second = t;
      else plans.add(p);
    }
    expect([...plans].sort()).toEqual(['hold', 'moving']);
    expect(second - first).toBeGreaterThanOrEqual(ARMOUR_FIRE.moveT + ARMOUR_FIRE.retry - 0.05);
    // may not move: holds, never a move, however long
    const h = new ArmourGate();
    for (let i = 0; i < 1200; i++) {
      h.gate(l, muzzle, aim, MASK.ENEMY_SHOT, 1, 2, dt);
      expect(h.plan(false)).toBe('hold');
      h.step(dt);
    }
  });

  it('a clear line ends a reposition; reset forgets everything', () => {
    let armoured = true;
    const l: ArmourRay = { armouredFirst: () => armoured };
    const g = new ArmourGate();
    g.gate(l, muzzle, aim, MASK.ENEMY_SHOT, 1, 1, 1.2);
    expect(g.plan(true)).toBe('move');
    expect(g.moveT).toBe(ARMOUR_FIRE.moveT);
    armoured = false;
    g.gate(l, muzzle, aim, MASK.ENEMY_SHOT, 2, 1, 1 / 60);
    expect(g.moveT).toBe(0);
    expect(g.plan(true)).toBe('fire');
    g.reset();
    expect([g.blocked, g.t, g.held, g.moveT, g.cool, g.fromCell, g.toCell]).toEqual([false, 0, 0, 0, 0, -1, -1]);
  });

  it('the gate allocates nothing per tick (cached and cast ticks)', async () => {
    const bits = glassMembership('clear', true);
    const l: ArmourRay = { armouredFirst: (_a, _b, mask) => (bits & mask) !== 0 };
    const g = new ArmourGate();
    const from = { x: 0, y: 1.35, z: 0 };
    const to = { x: 0, y: 1.2, z: 8 };
    const per = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        sink[0]! += g.gate(l, from, to, MASK.ENEMY_SHOT, 3, i & 7, 0.02) ? 1 : 0;
        g.step(0.02);
      }
    }, HEAP_NUMBER);
    console.info(`bytes per ArmourGate.gate + step: ${per.toFixed(1)}`);
    expect(per).toBeLessThanOrEqual(HEAP_NUMBER);
  });
});
