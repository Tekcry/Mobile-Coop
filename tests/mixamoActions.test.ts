import { describe, expect, it } from 'vitest';
import { pickAction, type ActionOut } from '../src/characters/actions';
import { LOCO_SLOTS, setClip } from '../src/characters/locomotion';

const out: ActionOut = { clip: null, t: NaN };

describe('mixamo action picker (mixamo-chars slice e)', () => {
  it('no action while walking about', () => {
    expect(pickAction({ speed: 1.4, localX: 0 }, false, out).clip).toBeNull();
    expect(pickAction({ speed: 0, localX: 0, traverse: 'none', melee: -1, grenade: -1 }, false, out).clip).toBeNull();
  });

  it('hangs, shimmies by side, climbs up pinned to the traversal', () => {
    expect(pickAction({ speed: 0, localX: 0, traverse: 'hang' }, false, out).clip).toBe('hang_idle');
    expect(pickAction({ speed: 0.6, localX: -1, traverse: 'hang' }, false, out).clip).toBe('hang_shimmy_l');
    expect(pickAction({ speed: 0.6, localX: 1, traverse: 'hang' }, false, out).clip).toBe('hang_shimmy_r');
    const c = pickAction({ speed: 0, localX: 0, traverse: 'climbUp', traverseT: 0.4 }, false, out);
    expect(c.clip).toBe('hang_climb_up');
    expect(c.t).toBeCloseTo(0.4, 9);
    expect(Number.isNaN(pickAction({ speed: 0.5, localX: 0, traverse: 'climb' }, false, out).t)).toBe(true);
    expect(out.clip).toBe('ladder');
  });

  it('strikes (knife or elbow) and throws, pinned to their progress', () => {
    expect(pickAction({ speed: 0, localX: 0, melee: 0.5 }, false, out)).toEqual({ clip: 'strike_elbow', t: 0.5 });
    expect(pickAction({ speed: 0, localX: 0, melee: 0.25 }, true, out)).toEqual({ clip: 'strike_knife', t: 0.25 });
    expect(pickAction({ speed: 1, localX: 0, grenade: 2 }, false, out)).toEqual({ clip: 'throw', t: 1 });
  });

  it('the carry set carries in every standing slot and borrows the crouch', () => {
    const k = (n: (typeof LOCO_SLOTS)[number]): number => LOCO_SLOTS.indexOf(n);
    expect(setClip('carry', k('idle'))).toBe('carry_idle');
    expect(setClip('carry', k('run'))).toBe('carry_walk');
    expect(setClip('carry', k('left'))).toBe('carry_walk');
    expect(setClip('carry', k('c_idle'))).toBe('crouch_idle');
  });
});
