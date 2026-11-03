import { describe, expect, it } from 'vitest';
import { LIFT_OFFER, LIFT_RISE, LIFT_STAND, liftAt, pickAction, SWAP_HOLSTERED, WallTurn, type ActionOut } from '../src/characters/actions';
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
    expect(pickAction({ speed: 0, localX: 0, melee: 0.5 }, false, out)).toMatchObject({ clip: 'strike_elbow', t: 0.5 });
    expect(pickAction({ speed: 0, localX: 0, melee: 0.25 }, true, out)).toMatchObject({ clip: 'strike_knife', t: 0.25 });
    expect(pickAction({ speed: 1, localX: 0, grenade: 2 }, false, out)).toMatchObject({ clip: 'throw', t: 1 });
  });

  it('the carry set carries in every standing slot and borrows the crouch', () => {
    const k = (n: (typeof LOCO_SLOTS)[number]): number => LOCO_SLOTS.indexOf(n);
    expect(setClip('carry', k('idle'))).toBe('carry_idle');
    expect(setClip('carry', k('run'))).toBe('carry_walk');
    expect(setClip('carry', k('left'))).toBe('carry_walk');
    expect(setClip('carry', k('c_idle'))).toBe('crouch_idle');
  });

  it('(slice f) vaults, hops and rolls pinned; falls and crawls looping; a mantle plays the climb-up from its middle', () => {
    expect(pickAction({ speed: 2, localX: 0, traverse: 'vault', traverseT: 0.3 }, false, out)).toMatchObject({ clip: 'vault', t: 0.3 });
    expect(pickAction({ speed: 2, localX: 0, traverse: 'windowVault', traverseT: 1 }, false, out)).toMatchObject({ clip: 'vault', t: 1 });
    expect(pickAction({ speed: 2, localX: 0, traverse: 'hop', traverseT: 0.5 }, false, out).clip).toBe('hop');
    expect(pickAction({ speed: 2, localX: 0, traverse: 'roll', traverseT: 0.5 }, false, out).clip).toBe('roll');
    expect(pickAction({ speed: 0, localX: 0, traverse: 'drop' }, false, out).clip).toBe('fall');
    expect(pickAction({ speed: 0, localX: 0, traverse: 'ventDrop' }, false, out).clip).toBe('fall');
    expect(pickAction({ speed: 0.5, localX: 0, traverse: 'crawl' }, false, out).clip).toBe('crawl');
    const m = pickAction({ speed: 0, localX: 0, traverse: 'mantle', traverseT: 0 }, false, out);
    expect(m.clip).toBe('hang_climb_up');
    expect(m.t).toBeCloseTo(0.45, 9);
    expect(pickAction({ speed: 0, localX: 0, traverse: 'step', traverseT: 1 }, false, out).t).toBeCloseTo(1, 9);
  });

  it('(slice f) back to the wall: idle standing or crouched, sliding by side; a strike wins over the wall', () => {
    expect(pickAction({ speed: 0, localX: 0, wall: true }, false, out).clip).toBe('wall_idle');
    expect(pickAction({ speed: 0, localX: 0, wall: true, crouch: 1 }, false, out).clip).toBe('wall_crouch_idle');
    // (walk-test fix A) the pack's "left cover sneak" steps to the character's right: moving left plays the right one
    expect(pickAction({ speed: 0.8, localX: -1, wall: true }, false, out).clip).toBe('wall_slide_r');
    expect(pickAction({ speed: 0.8, localX: 1, wall: true }, false, out).clip).toBe('wall_slide_l');
    // (walk-test fix A) crouched and moving: no action, the locomotion's crouched sidestep
    expect(pickAction({ speed: 0.8, localX: -1, wall: true, crouch: 1 }, false, out).clip).toBe(null);
    expect(pickAction({ speed: 0, localX: 0, wall: true, melee: 0.2 }, false, out).clip).toBe('strike_elbow');
  });

  it('(walk-test fix A) the ladder and the pipe climb play only while moving (grip); other moves do not', () => {
    expect(pickAction({ speed: 0, localX: 0, traverse: 'climb' }, false, out)).toMatchObject({ clip: 'ladder', grip: true });
    expect(pickAction({ speed: 0, localX: 0, traverse: 'pipeClimb' }, false, out)).toMatchObject({ clip: 'rope_climb', grip: true });
    expect(pickAction({ speed: 0, localX: 0, traverse: 'hang' }, false, out).grip).toBe(false);
  });

  it('(slice h) team moves: the holder lifts, braces or hauls; the rope climber climbs; the move wins over its traverse', () => {
    const offer = pickAction({ speed: 0, localX: 0, traverse: 'brace', teamMove: 'boost', teamRole: 'b', teamK: -1 }, false, out);
    expect(offer).toMatchObject({ clip: 'team_lift' });
    expect(offer.t).toBeCloseTo(LIFT_OFFER, 9);
    expect(pickAction({ speed: 0, localX: 0, teamMove: 'throw', teamRole: 'b', teamK: 0 }, false, out).t).toBeCloseTo(LIFT_RISE[0], 9);
    expect(pickAction({ speed: 0, localX: 0, teamMove: 'boost', teamRole: 'b', teamK: 1 }, false, out).t).toBeCloseTo(LIFT_STAND[1], 9);
    expect(liftAt(0.25)).toBeCloseTo((LIFT_RISE[0] + LIFT_RISE[1]) / 2, 9);
    expect(liftAt(0.75)).toBeCloseTo((LIFT_STAND[0] + LIFT_STAND[1]) / 2, 9);
    expect(pickAction({ speed: 0, localX: 0, teamMove: 'hang', teamRole: 'b', teamK: 1 }, false, out).clip).toBe('team_brace');
    expect(pickAction({ speed: 0, localX: 0, teamMove: 'pull', teamRole: 'b', teamK: -1 }, false, out).clip).toBe('team_brace');
    expect(pickAction({ speed: 0, localX: 0, teamMove: 'rope', teamRole: 'b', teamK: 1 }, false, out).clip).toBe('team_rope');
    expect(pickAction({ speed: 0, localX: 0, traverse: 'climb', teamMove: 'rope', teamRole: 'a', teamK: 1 }, false, out).clip).toBe('rope_climb');
    // the deadweight holder hangs by its traverse; the leg-up climber plays its own traverse
    expect(pickAction({ speed: 0, localX: 0, traverse: 'hang', teamMove: 'deadweight', teamRole: 'b', teamK: 0 }, false, out).clip).toBe('hang_idle');
    expect(pickAction({ speed: 0, localX: 0, traverse: 'climbUp', traverseT: 0.5, teamMove: 'boost', teamRole: 'a', teamK: 0.5 }, false, out).clip).toBe('hang_climb_up');
  });

  it('(slice i) pipes, wall kick, rappel, split and brace; on a pipe the body turns over', () => {
    expect(pickAction({ speed: 0, localX: 0, traverse: 'pipeClimb' }, false, out).clip).toBe('rope_climb');
    expect(pickAction({ speed: 0, localX: 0, traverse: 'pipeInv' }, false, out)).toMatchObject({ clip: 'hang_idle', turn: true });
    expect(pickAction({ speed: 0, localX: 0, traverse: 'pipeLegs' }, false, out)).toMatchObject({ clip: 'hang_idle', turn: true });
    expect(pickAction({ speed: 0, localX: 0, traverse: 'hang' }, false, out).turn).toBe(false);
    expect(pickAction({ speed: 0, localX: 0, traverse: 'wallKick', traverseT: 0.6 }, false, out)).toMatchObject({ clip: 'wall_kick', t: 0.6 });
    // (walk-test fix B2) the rappel is its own move now, a grip climb
    expect(pickAction({ speed: 0, localX: 0, traverse: 'rappel' }, false, out)).toMatchObject({ clip: 'rappel', grip: true });
    expect(pickAction({ speed: 0, localX: 0, traverse: 'split' }, false, out).clip).toBe('fall');
    expect(pickAction({ speed: 0, localX: 0, traverse: 'brace' }, false, out)).toMatchObject({ clip: 'team_lift', t: LIFT_OFFER });
  });

  it('(walk-test fix B2) a swap holsters then draws on the upper body, by the gun class of each slot', () => {
    const h = pickAction({ speed: 1.2, localX: 0, swap: SWAP_HOLSTERED / 2, swapFrom: 'thigh', swapTo: 'backC' }, false, out);
    expect(h).toMatchObject({ clip: null, upper: 'pistol_holster' });
    expect(h.upperT).toBeCloseTo(0.5, 9);
    const d = pickAction({ speed: 1.2, localX: 0, swap: 1, swapFrom: 'thigh', swapTo: 'backC' }, false, out);
    expect(d).toMatchObject({ clip: null, upper: 'rifle_draw', upperT: 1 });
    expect(pickAction({ speed: 0, localX: 0, swap: SWAP_HOLSTERED, swapFrom: 'thigh', swapTo: 'thigh' }, false, out)).toMatchObject({ upper: 'pistol_draw', upperT: 0 });
    expect(pickAction({ speed: 0, localX: 0, swap: 0.1, swapFrom: 'sling', swapTo: 'thigh' }, false, out).upper).toBe('rifle_holster');
    expect(pickAction({ speed: 0, localX: 0, swap: -1 }, false, out).upper).toBeNull();
    // a whole-body action (a ladder stow) keeps its arms: no upper clip
    expect(pickAction({ speed: 0, localX: 0, traverse: 'climb', swap: 0.2, swapFrom: 'backC' }, false, out)).toMatchObject({ clip: 'ladder', upper: null });
  });

  it('(walk-test fix B2) the guard grab plays on both upper bodies: pulled in, held (looping), let go on the knockout', () => {
    expect(pickAction({ speed: 0.5, localX: 0, grab: 0.4 }, false, out)).toMatchObject({ clip: null, upper: 'grab_take', upperT: 0.4 });
    expect(Number.isNaN(pickAction({ speed: 0.5, localX: 0, grab: 1 }, false, out).upperT)).toBe(true);
    expect(out.upper).toBe('grab_idle');
    expect(pickAction({ speed: 0, localX: 0, grab: 1.5 }, false, out)).toMatchObject({ upper: 'grab_release', upperT: 0.5 });
    expect(pickAction({ speed: 0.5, localX: 0, grabbed: 0.25 }, false, out)).toMatchObject({ upper: 'grabbed_take', upperT: 0.25 });
    expect(pickAction({ speed: 0.5, localX: 0, grabbed: 1 }, false, out).upper).toBe('grabbed_idle');
    // the grab wins over a swap; the kill's strike is a whole-body action
    expect(pickAction({ speed: 0, localX: 0, grab: 1, swap: 0.5, swapTo: 'thigh' }, false, out).upper).toBe('grab_idle');
    expect(pickAction({ speed: 0, localX: 0, grab: 1, melee: 0.3 }, false, out)).toMatchObject({ clip: 'strike_elbow', upper: null });
    expect(pickAction({ speed: 0, localX: 0, grab: -1, grabbed: -1 }, false, out).upper).toBeNull();
  });

  it('(walk-test fix B2) a zipline hangs its own way', () => {
    expect(pickAction({ speed: 5, localX: 0, traverse: 'hang', zip: true }, false, out).clip).toBe('zipline');
    expect(pickAction({ speed: 0.6, localX: 1, traverse: 'hang', zip: false }, false, out).clip).toBe('hang_shimmy_r');
  });

  it('(walk-test fix B2) back to a wall, a change of slide direction plays the cover turn once', () => {
    const wt = new WallTurn();
    const clips = { seconds: (n: string): number => (n.startsWith('cover_turn') ? 1 : 0) };
    const step = (i: Parameters<typeof pickAction>[0], dt = 0.1): ActionOut => {
      pickAction(i, false, out);
      wt.step(i, dt, clips, out);
      return out;
    };
    expect(step({ speed: 0.8, localX: -1, wall: true }).clip).toBe('wall_slide_r');
    const t0 = step({ speed: 0.8, localX: 1, wall: true });
    expect(t0).toMatchObject({ clip: 'cover_turn', t: 0 });
    expect(step({ speed: 0.8, localX: 1, wall: true }).t).toBeCloseTo(0.1, 9);
    expect(step({ speed: 0, localX: 0, wall: true }, 0.5).t).toBeCloseTo(0.6, 9);
    expect(step({ speed: 0.8, localX: 1, wall: true }, 0.5).clip).toBe('wall_slide_l');
    // crouched it is the crouched turn; leaving the wall forgets the direction
    expect(step({ speed: 0.8, localX: -1, wall: true, crouch: 1 }).clip).toBe('cover_turn_crouch');
    step({ speed: 0, localX: 0, wall: false });
    expect(step({ speed: 0.8, localX: 1, wall: true }).clip).toBe('wall_slide_l');
  });
});
