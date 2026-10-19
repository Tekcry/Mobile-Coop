import { describe, expect, it } from 'vitest';
import { CrackPrediction, DOOR_CRACK, DOOR_PEEK, DoorPeekCore, PEEK_ACT, clampPeekYaw, crackedHandle, doorFrame, doorPeekEligible, emptyFrame, hostCrackOk, stepCrack, type DoorPeekInput, type PeekDoor } from '../src/world/doorPeek';
import { sanitizeMoveState, packMoveState, dropBadDoorMove, MOVE_MODES, poseFromMoveState, emptyMovePose } from '../src/player/moveState';
import { hyp2 } from '../src/core/mathx';

// a 1 m door along +z from the origin (yaw 0): its normal is +x; the body stands on +x facing -x (yaw -pi/2)
const door = (over: Partial<PeekDoor['anchor']> = {}, target: 0 | 1 = 0): PeekDoor => ({
  anchor: { hinge: { x: 0, y: 0, z: 0 }, yaw: 0, width: 1, height: 2.1, swing: 1, locked: false, ...over },
  target,
  cx: 0,
  cz: 0.5,
});
const FACE = -Math.PI / 2;
const input = (o: Partial<DoorPeekInput> = {}): DoorPeekInput => ({ context: false, interact: false, push: 0, end: false, candidate: -1, doorOpened: false, ...o });

describe('door peek eligibility', () => {
  it('needs the face within 1 m, faced within 60 deg, closed, unlocked, grounded and free', () => {
    const d = door();
    expect(doorPeekEligible(d, false, 0.6, 0.5, FACE, true, false)).toBe(true);
    expect(doorPeekEligible(d, false, 1.05, 0.5, FACE, true, false)).toBe(false);
    expect(doorPeekEligible(d, false, 0.6, 0.5, FACE + 0.9, true, false)).toBe(true);
    expect(doorPeekEligible(d, false, 0.6, 0.5, FACE + 1.15, true, false)).toBe(false);
    expect(doorPeekEligible(d, false, 0.6, 0.5, FACE + Math.PI, true, false)).toBe(false);
    expect(doorPeekEligible(door({ locked: true }), false, 0.6, 0.5, FACE, true, false)).toBe(false);
    expect(doorPeekEligible(door({}, 1), false, 0.6, 0.5, FACE, true, false)).toBe(false);
    // (fix r1) a crack somebody else peeks at is taken; an abandoned one (nobody peeking) is eligible
    expect(doorPeekEligible(d, true, 0.6, 0.5, FACE, true, false)).toBe(false);
    expect(doorPeekEligible(d, false, 0.6, 0.5, FACE, false, false)).toBe(false);
    expect(doorPeekEligible(d, false, 0.6, 0.5, FACE, true, true)).toBe(false);
    // from the other side (facing +x)
    expect(doorPeekEligible(d, false, -0.6, 0.5, Math.PI / 2, true, false)).toBe(true);
  });
  it('frames the body off the leaf facing it, the hinge side and the eye beyond the swept leaf', () => {
    const f = doorFrame(door().anchor, 0.7, 0.4, 1.6, emptyFrame());
    expect(f.side).toBe(1);
    expect(f.x).toBeCloseTo(DOOR_PEEK.standoff);
    expect(f.z).toBeCloseTo(1 - DOOR_PEEK.handleIn);
    expect(Math.sin(f.yaw)).toBeCloseTo(-1);
    // facing -x the right is +z... the hinge (z 0) is on the left
    expect(f.hingeRight).toBe(false);
    expect(doorFrame(door().anchor, -0.7, 0.4, 1.6, emptyFrame()).hingeRight).toBe(true);
    // a leaf swinging toward the body (swing 1 sweeps toward +x): the eye stays out past its 0.12 sweep
    const sweep = Math.sin(1.75 * DOOR_CRACK.crack * DOOR_CRACK.crack * (3 - 2 * DOOR_CRACK.crack)) * 1;
    expect(f.ex).toBeGreaterThan(sweep + 0.05);
    expect(f.ey).toBeCloseTo(1.6);
  });
  it('the handle follows the cracked leaf', () => {
    const a = door().anchor;
    const h0 = { x: 0, y: 0, z: 0 };
    const h1 = { x: 0, y: 0, z: 0 };
    crackedHandle(a, 1, 0, 1.75, h0);
    crackedHandle(a, 1, DOOR_CRACK.crack, 1.75, h1);
    expect(h0.x).toBeCloseTo(DOOR_PEEK.handleOut);
    expect(h0.z).toBeCloseTo(1 - DOOR_PEEK.handleEdge);
    expect(hyp2(h1.x - h0.x, h1.z - h0.z)).toBeGreaterThan(0.02);
  });
  it('the host checks reach, closed and unlocked', () => {
    expect(hostCrackOk(door(), 0.5, 0.5, true)).toBe(true);
    expect(hostCrackOk(door(), 2.2, 0.5, true)).toBe(false);
    expect(hostCrackOk(door({ locked: true }), 0.5, 0.5, true)).toBe(false);
    expect(hostCrackOk(door({}, 1), 0.5, 0.5, true)).toBe(false);
  });
});

describe('door peek core', () => {
  const run = (c: DoorPeekCore, s: number, o: Partial<DoorPeekInput> = {}): number[] => {
    const acts: number[] = [];
    for (let t = 0; t < s - 1e-9; t += 1 / 60) acts.push(c.update(1 / 60, input(o)));
    return acts;
  };
  // (G6, AUDIT-WALLS row 14, 052349 @ 13.6-18.6) the step and the hand up, the view in, then the leaf 1.2 s after the pick
  it('settles 0.5 s, holds the handle 0.7 s while the view moves in, cracks over 0.6 s, then peeks', () => {
    expect(DOOR_PEEK.settle).toBe(0.5);
    expect(DOOR_PEEK.crackDelay).toBe(0.7);
    const c = new DoorPeekCore();
    expect(c.update(1 / 60, input({ context: true, candidate: 4 }))).toBe(PEEK_ACT.none);
    expect(c.phase).toBe('settle');
    expect(c.door).toBe(4);
    expect(run(c, 0.5)).not.toContain(PEEK_ACT.crackOn);
    expect(c.phase).toBe('ready');
    run(c, 0.35);
    expect(c.view()).toBeGreaterThan(0.4);
    expect(c.view()).toBeLessThan(0.6);
    expect(c.handW()).toBe(1);
    const acts = run(c, 0.35);
    expect(acts.filter((a) => a === PEEK_ACT.crackOn).length).toBe(1);
    expect(c.phase).toBe('crack');
    run(c, 0.62);
    expect(c.phase).toBe('peek');
    expect(c.view()).toBe(1);
    expect(c.handW()).toBe(1);
  });
  it('no press, no candidate: stays off', () => {
    const c = new DoorPeekCore();
    c.update(1 / 60, input({ context: true }));
    c.update(1 / 60, input({ candidate: 2 }));
    expect(c.active).toBe(false);
  });
  const peeking = (): DoorPeekCore => {
    const c = new DoorPeekCore();
    c.update(1 / 60, input({ context: true, candidate: 1 }));
    run(c, 2);
    return c;
  };
  it('a second press closes over 0.4 s', () => {
    const c = peeking();
    expect(c.update(1 / 60, input({ context: true }))).toBe(PEEK_ACT.crackOff);
    expect(c.phase).toBe('closing');
    run(c, 0.2);
    expect(c.active).toBe(true);
    run(c, 0.22);
    expect(c.active).toBe(false);
  });
  it('the stick pulled back 0.2 s closes; a shorter pull does not', () => {
    const c = peeking();
    expect(run(c, 0.1, { push: -0.8 })).not.toContain(PEEK_ACT.crackOff);
    c.update(1 / 60, input());
    expect(run(c, 0.2, { push: -0.8 })).toContain(PEEK_ACT.crackOff);
  });
  it('the stick pushed in or interact opens quietly and ends the peek', () => {
    const a = peeking();
    expect(a.update(1 / 60, input({ push: 0.9 }))).toBe(PEEK_ACT.open);
    expect(a.active).toBe(false);
    const b = peeking();
    expect(b.update(1 / 60, input({ interact: true }))).toBe(PEEK_ACT.open);
    expect(b.active).toBe(false);
  });
  it('damage / aim / jump / sprint end it without closing; the door opened by anyone ends it', () => {
    const a = peeking();
    expect(a.update(1 / 60, input({ end: true }))).toBe(PEEK_ACT.none);
    expect(a.active).toBe(false);
    const b = peeking();
    b.update(1 / 60, input({ doorOpened: true }));
    expect(b.active).toBe(false);
  });
  it('the look stays within +-35 deg of the door', () => {
    expect(clampPeekYaw(0.3, 0)).toBeCloseTo(0.3);
    expect(clampPeekYaw(1.2, 0)).toBeCloseTo(DOOR_PEEK.look);
    expect(clampPeekYaw(-1.2, 0)).toBeCloseTo(-DOOR_PEEK.look);
  });
  it('the crack eases to 0.12 in 0.6 s and back in 0.4 s', () => {
    let a = 0;
    for (let i = 0; i < 36; i++) a = stepCrack(a, true, 1 / 60);
    expect(a).toBeCloseTo(DOOR_CRACK.crack, 5);
    for (let i = 0; i < 12; i++) a = stepCrack(a, false, 1 / 60);
    expect(a).toBeGreaterThan(0.05);
    for (let i = 0; i < 12; i++) a = stepCrack(a, false, 1 / 60);
    expect(a).toBeCloseTo(0, 5);
  });
});

describe('MoveState doorPeek', () => {
  it('is at index 26 (A3: swat removed) and round-trips (a in range, sub bit 1, ph the crack)', () => {
    expect(MOVE_MODES.indexOf('doorPeek')).toBe(26);
    const mv = sanitizeMoveState(packMoveState({ m: 'doorPeek', a: 3, s: 0, sub: 1, ph: 0.12, tid: '', g: 2, r: 0, ay: 0, dw: 0 }), 4096, 4096, 10)!;
    expect(mv.m).toBe('doorPeek');
    expect(mv.a).toBe(3);
    expect(mv.sub).toBe(1);
    expect(mv.ph).toBeCloseTo(0.12);
    expect(sanitizeMoveState({ m: 26, a: 10, sub: 0 }, 4096, 4096, 10)).toBeNull();
    expect(sanitizeMoveState({ m: 26, a: -1, sub: 0 })).toBeNull();
    expect(sanitizeMoveState({ m: 26, a: 2, sub: 0xff })!.sub).toBe(1);
    const s = { mv: sanitizeMoveState({ m: 26, a: 5 })! };
    expect(dropBadDoorMove(s, 4)).toBe(true);
    expect(s.mv).toBeUndefined();
    expect(poseFromMoveState(mv, 1, emptyMovePose()).wall).toBe(false);
  });
});

describe('door peek fix r1', () => {
  it('an abandoned crack resumes straight into the peek (no crack request) and can be closed', () => {
    const c = new DoorPeekCore();
    expect(c.update(1 / 60, input({ context: true, candidate: 3, resume: true }))).toBe(PEEK_ACT.none);
    expect(c.phase).toBe('settle');
    let crackOn = 0;
    for (let i = 0; i < 40; i++) if (c.update(1 / 60, input()) === PEEK_ACT.crackOn) crackOn++;
    expect(crackOn).toBe(0);
    expect(c.phase).toBe('peek');
    expect(c.view()).toBe(1);
    expect(c.update(1 / 60, input({ context: true }))).toBe(PEEK_ACT.crackOff);
    expect(c.phase).toBe('closing');
    for (let i = 0; i < 30; i++) c.update(1 / 60, input());
    expect(c.phase).toBe('off');
    // the next peek on a closed door cracks as before
    c.update(1 / 60, input({ context: true, candidate: 3 }));
    let acts = 0;
    for (let i = 0; i < 90; i++) if (c.update(1 / 60, input()) === PEEK_ACT.crackOn) acts++;
    expect(acts).toBe(1);
  });
  it('a client ignores the snapshot un-crack for about a round trip after its prediction, then the host wins', () => {
    const p = new CrackPrediction(4);
    expect(p.resolve(1, false, 0)).toBe(false);
    p.predict(1, true, 10);
    expect(p.resolve(1, false, 10.1)).toBe(true);
    expect(p.resolve(1, false, 10.3)).toBe(true);
    // the host agrees: the hold ends, a later un-crack applies at once
    expect(p.resolve(1, true, 10.35)).toBe(true);
    expect(p.resolve(1, false, 10.36)).toBe(false);
    // a predicted close: a stale cracked snapshot is ignored, past the hold the host wins
    p.predict(1, false, 20);
    expect(p.resolve(1, true, 20.2)).toBe(false);
    expect(p.resolve(1, true, 20 + CrackPrediction.hold + 0.05)).toBe(true);
    // other doors and out-of-range indices pass the snapshot through
    expect(p.resolve(2, true, 20.2)).toBe(true);
    p.predict(9, true, 0);
    expect(p.resolve(9, false, 0)).toBe(false);
  });
});
