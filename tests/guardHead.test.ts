import { describe, expect, it } from 'vitest';
import { GuardCq, type GuardCqMode } from '../src/game/closeQuarters';
import { BLIND_PITCH, HELD_PITCH, emoteBlind, emoteBlindEnd, emoteSeize, emoteStep, guardHead, guardHeadRest, leanStep, newEmoteState, newLeanState, type GuardHeadIn } from '../src/ai/guardHead';

function inp(over: Partial<GuardHeadIn> = {}): GuardHeadIn {
  return { x: 0, y: 0, z: 0, yaw: 0, crouch: 0, speed: 0, moveX: 0, moveZ: 0, phase: 0, aim: 0.2, aimPitch: 0, wall: false, wallSide: 0, lean: 0, leanDrop: 0, held: null, heldK: 0, koK: 0, blind: 0, poseW: 0, climb: false, ...over };
}
const grunt = guardHeadRest(1.75, 'average');
const head = (i: GuardHeadIn, r = grunt) => {
  const o = { x: 0, y: 0, z: 0 };
  guardHead(i, r, o);
  return o;
};

describe('guardHead (pure sim head)', () => {
  it('turns with yaw about the feet', () => {
    for (const yaw of [0, Math.PI / 2, -2.3]) {
      const a = head(inp({ yaw, x: 1, z: 2 }));
      const b = head(inp({ yaw: 0, x: 1, z: 2 }));
      const fx = a.x - 1;
      const fz = a.z - 2;
      const bx = b.x - 1;
      const bz = b.z - 2;
      // the same horizontal distance from the feet, rotated by yaw
      expect(Math.hypot(fx, fz)).toBeCloseTo(Math.hypot(bx, bz), 9);
      expect(fx).toBeCloseTo(bx * Math.cos(yaw) + bz * Math.sin(yaw), 9);
      expect(fz).toBeCloseTo(-bx * Math.sin(yaw) + bz * Math.cos(yaw), 9);
      expect(a.y).toBeCloseTo(b.y, 9);
    }
  });

  it('crouch lowers the head monotonically', () => {
    let prev = Infinity;
    for (let c = 0; c <= 1.0001; c += 0.1) {
      const y = head(inp({ crouch: c })).y;
      expect(y).toBeLessThan(prev);
      prev = y;
    }
  });

  it('lean moves it sideways by the sign (yaw 0: +x is the root-local side)', () => {
    const l = head(inp({ wall: false, lean: -1, leanDrop: 1 }));
    const r = head(inp({ lean: 1, leanDrop: 1 }));
    expect(l.x).toBeLessThan(-0.5);
    expect(r.x).toBeGreaterThan(0.5);
    expect(r.y).toBeLessThan(head(inp()).y);
  });

  it('held and blind poses pitch the head forward and down', () => {
    const base = head(inp());
    const held = head(inp({ held: 'seizedLethal', heldK: 1, poseW: 1 }));
    expect(held.z).toBeGreaterThan(base.z);
    expect(held.y).toBeLessThan(base.y);
    const blind = head(inp({ blind: 1, poseW: 1 }));
    expect(blind.y).toBeLessThan(base.y);
    // no emote weight: no pose
    const off = head(inp({ held: 'seizedLethal', heldK: 1, blind: 1, poseW: 0 }));
    expect(off.y).toBeCloseTo(base.y, 9);
    expect(off.z).toBeCloseTo(base.z, 9);
  });

  it('(S3a fix 2) emoteStep: blinded, seized, released while the flash still runs: no pose once released', () => {
    // `Enemy` and the parity harness both run this; the seize hands the emote over (`emoteSeize` clears the
    // flashbang's), so after the release the rig shows none (`releaseTakedown` clears it) and the head's pose fades
    const st = newEmoteState();
    const h = inp();
    const dt = 1 / 60;
    emoteBlind(st);
    for (let i = 0; i < 30; i++) emoteStep(st, h, false, true, 'seized', 0.25, 0, dt);
    expect(h.held).toBeNull();
    expect(h.blind).toBe(1);
    expect(h.poseW).toBe(1);
    // seized: before contact (0.25 s) no pose is given, the flashbang's fades; from contact the held one
    emoteSeize(st);
    for (let i = 0; i < 6; i++) emoteStep(st, h, true, true, 'seized', 0.25, 0, dt);
    expect(h.poseW).toBeCloseTo(0.5, 6);
    for (let i = 0; i < 60; i++) emoteStep(st, h, true, true, 'seized', 0.25, 0, dt);
    expect(h.held).toBe('seized');
    expect(h.heldK).toBe(1);
    expect(h.poseW).toBe(1);
    for (let i = 0; i < 30; i++) emoteStep(st, h, false, true, 'seized', 0.25, 0, dt);
    expect(h.poseW).toBe(0);
    expect(h.held).toBe('seized');
  });

  it('(S3a fix 2) emoteStep: the flash ends, the pose fades; the knockout limp follows GuardCq.k', () => {
    const st = newEmoteState();
    const h = inp();
    const dt = 1 / 60;
    emoteBlind(st);
    for (let i = 0; i < 30; i++) emoteStep(st, h, false, true, 'seized', 0, 0, dt);
    expect(h.blind).toBe(1);
    emoteBlindEnd(st);
    for (let i = 0; i < 6; i++) emoteStep(st, h, false, true, 'seized', 0, 0, dt);
    expect(h.poseW).toBeCloseTo(0.5, 6);
    emoteSeize(st);
    emoteStep(st, h, true, false, 'ko', 0, 0.4, dt);
    expect(h.held).toBe('ko');
    expect(h.koK).toBe(0.4);
  });

  it('(S3a fix 2) a walked hostage: the held pose plus the held walk, no free-move side offset or gait-clock bob', () => {
    const still = head(inp({ held: 'hostage', heldK: 1, poseW: 1 }));
    // sideways at 0.6 m/s with the frozen gait clock anywhere: the same head (the rig runs its own gait when held)
    const a = head(inp({ held: 'hostage', heldK: 1, poseW: 1, speed: 0.6, moveX: 0.6, phase: 0 }));
    const b = head(inp({ held: 'hostage', heldK: 1, poseW: 1, speed: 0.6, moveX: 0.6, phase: 0.37 }));
    expect(a.x).toBeCloseTo(still.x, 9);
    expect(a.y).toBeCloseTo(b.y, 9);
    expect(a.z).toBeCloseTo(b.z, 9);
    // the held walk sits lower than the held still pose (the rig's gait under the pose)
    expect(still.y - a.y).toBeGreaterThan(0.02);
  });

  it('(S3a fix round) seized while blind: the held pose only (one emote at a time)', () => {
    const heldOnly = head(inp({ held: 'seized', heldK: 1, poseW: 1 }));
    const both = head(inp({ held: 'seized', heldK: 1, blind: 1, poseW: 1 }));
    expect(both.x).toBeCloseTo(heldOnly.x, 9);
    expect(both.y).toBeCloseTo(heldOnly.y, 9);
    expect(both.z).toBeCloseTo(heldOnly.z, 9);
    // and the blind pose differs from it (head back vs hands to the face)
    expect(Math.abs(head(inp({ blind: 1, poseW: 1 })).z - heldOnly.z)).toBeGreaterThan(0.05);
  });

  it('(S3a fix round) the direction of travel in his frame changes the head (strafe, backpedal)', () => {
    const sp = 0.9;
    const fwd = head(inp({ aim: 1, speed: sp, moveZ: sp }));
    // no direction given: read as straight ahead
    const none = head(inp({ aim: 1, speed: sp }));
    expect(none.y).toBeCloseTo(fwd.y, 9);
    expect(none.z).toBeCloseTo(fwd.z, 9);
    const back = head(inp({ aim: 1, speed: sp, moveZ: -sp }));
    const right = head(inp({ aim: 1, speed: sp, moveX: sp }));
    const left = head(inp({ aim: 1, speed: sp, moveX: -sp }));
    for (const o of [back, right, left]) expect(Math.hypot(o.x - fwd.x, o.y - fwd.y, o.z - fwd.z)).toBeGreaterThan(0.01);
  });

  it('(S3a fix round) walking along the wall leaning out moves the head off the still lean', () => {
    // the game's combination: wall side -1, lean +1 (away from it), walking towards the lean
    const still = head(inp({ aim: 1, wall: true, wallSide: -1, lean: 1, leanDrop: 1 }));
    const moving = head(inp({ aim: 1, wall: true, wallSide: -1, lean: 1, leanDrop: 1, speed: 0.9, moveX: 0.9 }));
    expect(still.y - moving.y).toBeGreaterThan(0.08);
    expect(moving.x).toBeGreaterThan(0.8);
  });

  it('scales with height', () => {
    const lo = head(inp(), guardHeadRest(1.6, 'average'));
    const hi = head(inp(), guardHeadRest(1.95, 'average'));
    expect(hi.y).toBeGreaterThan(lo.y);
    expect(hi.y / lo.y).toBeCloseTo(1.95 / 1.6, 1);
  });

  it('writes out in place', () => {
    const o = { x: 9, y: 9, z: 9 };
    const ret = guardHead(inp({ x: 1 }), grunt, o);
    expect(ret).toBeUndefined();
    expect(o.x).not.toBe(9);
    expect(o.y).toBeGreaterThan(1);
  });

  it('the lean springs settle on the target', () => {
    const st = newLeanState();
    for (let i = 0; i < 120; i++) leanStep(st, 1, 1 / 60);
    expect(st.bd).toBeCloseTo(1, 3);
    for (let i = 0; i < 240; i++) leanStep(st, 0, 1 / 60);
    expect(Math.abs(st.bd)).toBeLessThan(1e-3);
  });

  it('the held and blind pitch table matches GuardCq / Enemy.blind', () => {
    for (const mode of Object.keys(HELD_PITCH) as GuardCqMode[]) {
      const cq = new GuardCq();
      cq.seize(false, 0);
      cq.set(mode);
      cq.k = mode === 'interrogate' ? 0.5 : 1;
      const p = cq.pose(2)!;
      const [n, c] = HELD_PITCH[mode];
      expect(p.neck[0], mode).toBeCloseTo(n, 6);
      expect(p.chest[0], mode).toBeCloseTo(c, 6);
    }
    expect(BLIND_PITCH).toEqual({ neck: 0.45, chest: 0.3, lift: -0.06 });
  });
});
