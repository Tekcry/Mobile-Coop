// (hang-down) The hanging player's actions from the co-op hang-down: the reach rule, the lift, the grab / neck-snap plan.
import { describe, expect, it } from 'vitest';
import { GRAB_KINDS, HANG_GRAB, TAKEDOWN, hangHoldPoint, hangInReach, hangLiftY, pickTakedown, type TakedownInput } from '../src/game/takedown';
import { TeamController } from '../src/game/teamController';
import type { GameState } from '../src/game/gameState';

/** A hanging player with the head at `headY` over (0, 0) (the input's `ay` from the hang) and a calm guard on the floor
 *  at (`vx`, `vy`, `vz`). */
const inp = (headY: number, vx: number, vy: number, vz: number, over: Partial<TakedownInput> = {}): TakedownInput => ({
  state: 'hangDown',
  ax: 0,
  ay: headY,
  az: 0,
  vx,
  vy,
  vz,
  vyaw: 0,
  vCalm: true,
  los: true,
  ...over,
});

describe('hang-down: the reach of the hanging hands', () => {
  it('a guard whose neck is by the hanging head is in reach; too far across, too low or too high is not', () => {
    // neck at 1.5: the head from 1.15 (0.35 under the neck) to 2.25 (0.75 over it)
    expect(hangInReach(0, 0, 2.0, 0.5, 0, 0)).toBe(true);
    expect(hangInReach(0, 0, 1.15 + 1e-6, 0, 0, 0)).toBe(true);
    expect(hangInReach(0, 0, 1.1, 0, 0, 0)).toBe(false);
    expect(hangInReach(0, 0, 2.25 - 1e-6, 0, 0, 0)).toBe(true);
    expect(hangInReach(0, 0, 2.3, 0, 0, 0)).toBe(false);
    expect(hangInReach(0, 0, 2.0, TAKEDOWN.hangReach - 1e-6, 0, 0)).toBe(true);
    expect(hangInReach(0, 0, 2.0, 0.7, 0, 0.7)).toBe(false);
    // on a raised floor too (the rule reads the guard's own feet)
    expect(hangInReach(0, 0, 4.0, 0, 2.0, 0.3)).toBe(true);
  });

  it('the lift: the neck to the hands, never under his floor, at most liftMax up', () => {
    expect(hangLiftY(1.85, 0)).toBeCloseTo(0, 9);
    expect(hangLiftY(2.2, 0)).toBeCloseTo(2.2 - HANG_GRAB.hands - HANG_GRAB.neck, 9);
    expect(hangLiftY(1.2, 0)).toBe(0);
    expect(hangLiftY(5, 0)).toBe(HANG_GRAB.liftMax);
    expect(hangLiftY(5, 1)).toBe(1 + HANG_GRAB.liftMax);
  });

  it('the hold point: in front of the hang along the way to him, lifted', () => {
    const out = { x: 0, y: 0, z: 0 };
    hangHoldPoint(1, 2, 2.2, Math.PI / 2, 0, out);
    expect(out.x).toBeCloseTo(1 + HANG_GRAB.hold, 9);
    expect(out.z).toBeCloseTo(2, 9);
    expect(out.y).toBeCloseTo(hangLiftY(2.2, 0), 9);
  });
});

describe('hang-down: the takedown plan from the hang', () => {
  it('a guard in reach: kind hangDown, the hanger stays, the guard comes up to the hands', () => {
    const p = pickTakedown(inp(2.2, 0, 0, 0.5));
    expect(p?.kind).toBe('hangDown');
    expect(p!.approach).toBe(0);
    expect(p!.alignX).toBe(0);
    expect(p!.alignY).toBeCloseTo(2.2, 9);
    expect(p!.faceYaw).toBeCloseTo(0, 9);
    expect(p!.victimTo!.z).toBeCloseTo(HANG_GRAB.hold, 9);
    expect(p!.victimTo!.y).toBeCloseTo(hangLiftY(2.2, 0), 9);
    expect(p!.strike).toBe(HANG_GRAB.strike);
  });

  it('any awareness and facing, but not out of reach or out of sight', () => {
    expect(pickTakedown(inp(2.2, 0.3, 0, 0, { vCalm: false, vyaw: 2 }))?.kind).toBe('hangDown');
    expect(pickTakedown(inp(2.2, 0, 0, 0.5, { los: false }))).toBeNull();
    expect(pickTakedown(inp(3.0, 0, 0, 0.5))).toBeNull();
    expect(pickTakedown(inp(2.2, 1.2, 0, 0))).toBeNull();
  });

  it('a guard right under the head: the way to him is his back (no NaN facing)', () => {
    const p = pickTakedown(inp(2.0, 0, 0, 0, { vyaw: 1 }));
    expect(p?.kind).toBe('hangDown');
    expect(Number.isFinite(p!.faceYaw)).toBe(true);
    expect(Number.isFinite(p!.victimTo!.x)).toBe(true);
  });

  it('the grab from the hang is a grab (the held rules follow); the ground kinds are unchanged', () => {
    expect(GRAB_KINDS).toContain('hangDown');
    expect(GRAB_KINDS).toContain('behind');
    expect(GRAB_KINDS).not.toContain('front');
  });
});

describe('hang-down: the hanging player\'s actions are live only hanging settled', () => {
  it('hanging with no end asked: live; lowering, pulled up, dropping or after asking the end: not', () => {
    const t = new TeamController({} as GameState);
    t.state = 'hanging';
    expect(t.hangActs).toBe(true);
    t.hang.sent = true;
    expect(t.hangActs).toBe(false);
    t.hang.sent = false;
    for (const s of ['hangDown', 'hangPull', 'hangDrop', 'hangHold', 'none'] as const) {
      t.state = s;
      expect(t.hangActs).toBe(false);
    }
  });
});
