// (hang-down) The host's side of the hanging player's actions, no wire change: the pistol while hanging, the shot origin
// under the turned-over root, a client's seized guard held lifted under its head.
import { describe, expect, it } from 'vitest';
import { checkShot, clientForcedHolster, hostDrawPhase, hostHandsFree, SHOT_UNDER, SHOT_UNDER_HANG } from '../src/net/validate';
import { hangHoldStep, hangingMove, type HangHeld, type HangSpot } from '../src/net/hangHold';
import { emptyMoveState } from '../src/player/moveState';
import { HANG_HEAD, HANG_SUB, ROPE_SUB, THROW_SUB } from '../src/game/teamMoves';
import { hangHoldPoint } from '../src/game/takedown';

const mv = (m: 'boost' | 'brace' | 'ground', sub: number, dw = 2) => ({ ...emptyMoveState(), m, sub, dw });

describe('hang-down net: the hanging partner keeps the pistol (host D8 rule)', () => {
  it('boost + HANG_SUB is hands-free; the other team modes stay busy', () => {
    expect(hostHandsFree(mv('boost', HANG_SUB), false)).toBe(true);
    expect(hostDrawPhase(mv('boost', HANG_SUB), false)).toBe(2);
    expect(hostDrawPhase(mv('boost', HANG_SUB), true)).toBe(0);
    // the holder, the leg-up climber, the thrown runner, the rope climber
    expect(hostDrawPhase(mv('brace', HANG_SUB), false)).toBe(0);
    expect(hostDrawPhase(mv('boost', 0), false)).toBe(0);
    expect(hostDrawPhase(mv('boost', THROW_SUB), false)).toBe(0);
    expect(hostDrawPhase(mv('boost', ROPE_SUB), false)).toBe(0);
    expect(hostDrawPhase(mv('boost', ROPE_SUB | HANG_SUB), false)).toBe(0);
    // the client's own reading agrees (no forced holster while hanging with the pistol out)
    expect(clientForcedHolster(0, 2, mv('boost', HANG_SUB), false)).toBe(false);
  });

  it('hangingMove reads only the hanging partner', () => {
    expect(hangingMove(mv('boost', HANG_SUB))).toBe(true);
    expect(hangingMove(mv('brace', HANG_SUB))).toBe(false);
    expect(hangingMove(mv('boost', ROPE_SUB | HANG_SUB))).toBe(false);
    expect(hangingMove(mv('ground', 0))).toBe(false);
    expect(hangingMove(undefined)).toBe(false);
  });
});

describe('hang-down net: a shot from under the turned-over root', () => {
  const feet = { x: 0, y: 3, z: 0 };
  const body = { x: 0, y: 1, z: 6 };
  const head = { x: 0, y: 1.6, z: 6 };
  const shot = (oy: number) => {
    const o = { x: 0, y: oy, z: 0.3 };
    const d = { x: body.x - o.x, y: body.y - o.y, z: body.z - o.z };
    const l = Math.hypot(d.x, d.y, d.z);
    return { origin: o, dir: { x: d.x / l, y: d.y / l, z: d.z / l }, part: 'body' as const };
  };
  it('the pistol under the hanging head passes with the hang allowance only', () => {
    // the muzzle 1.6 m under the root (the head 0.62 under it, the arm out below)
    expect(checkShot(shot(1.4), feet, body, head, 50).ok).toBe(false);
    expect(checkShot(shot(1.4), feet, body, head, 50, 1.1, SHOT_UNDER).ok).toBe(false);
    expect(checkShot(shot(1.4), feet, body, head, 50, 1.1, SHOT_UNDER_HANG).ok).toBe(true);
    expect(checkShot(shot(3 - SHOT_UNDER_HANG - 0.1), feet, body, head, 50, 1.1, SHOT_UNDER_HANG).ok).toBe(false);
    // a standing shooter's rule is unchanged
    expect(checkShot(shot(2.5), feet, body, head, 50).ok).toBe(true);
  });
});

/** A host guard. */
function guard(id: string, x: number, y: number, z: number): HangHeld & { solid: boolean; yaw: number } {
  return {
    id,
    alive: true,
    pos: { x, y, z },
    solid: true,
    yaw: 0,
    holdAt(px: number, py: number, pz: number, yaw: number) {
      this.pos.x = px;
      this.pos.y = py;
      this.pos.z = pz;
      this.yaw = yaw;
    },
    setSolid(on: boolean) {
      this.solid = on;
    },
  };
}

describe('hang-down net: the host holds a hanging client\'s guard lifted under its head', () => {
  it('fixes the spot at the first step, eases the guard to the hold point, not solid', () => {
    const e = guard('e1', 0, 0, 0.5);
    const list = [guard('e0', 9, 0, 9), e];
    const s: { hang?: HangSpot } = {};
    const root = { x: 0, y: 2.2 + HANG_HEAD, z: 0 };
    expect(hangHoldStep(list, 'e1', s, root.x, root.y, root.z, 1 / 60)).toBe(true);
    expect(s.hang!.y).toBe(0);
    expect(s.hang!.yaw).toBeCloseTo(0, 9);
    expect(e.solid).toBe(false);
    for (let i = 0; i < 120; i++) hangHoldStep(list, 'e1', s, root.x, root.y, root.z, 1 / 60);
    const want = hangHoldPoint(root.x, root.z, 2.2, 0, 0, { x: 0, y: 0, z: 0 });
    expect(e.pos.x).toBeCloseTo(want.x, 3);
    expect(e.pos.y).toBeCloseTo(want.y, 3);
    expect(e.pos.z).toBeCloseTo(want.z, 3);
    // the holder lowers the client: the guard follows the head (lifted no more than liftMax off his floor)
    for (let i = 0; i < 120; i++) hangHoldStep(list, 'e1', s, root.x, root.y + 2, root.z, 1 / 60);
    expect(e.pos.y).toBeCloseTo(hangHoldPoint(0, 0, 4.2, 0, 0, { x: 0, y: 0, z: 0 }).y, 3);
    // the other guard untouched
    expect(list[0]!.pos).toEqual({ x: 9, y: 0, z: 9 });
  });

  it('no such live guard: false (the host lets go as before)', () => {
    const e = guard('e1', 0, 0, 0.5);
    expect(hangHoldStep([e], 'e2', {}, 0, 3, 0, 1 / 60)).toBe(false);
    expect(hangHoldStep(undefined, 'e1', {}, 0, 3, 0, 1 / 60)).toBe(false);
    (e as { alive: boolean }).alive = false;
    expect(hangHoldStep([e], 'e1', {}, 0, 3, 0, 1 / 60)).toBe(false);
  });
});
