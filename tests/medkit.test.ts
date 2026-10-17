import { describe, expect, it } from 'vitest';
import { addKit, MEDKIT, medkitCarry, medkitDenial, MedkitUse, SELF_TARGET } from '../src/game/medkit';
import { Health } from '../src/game/health';
import { DIFFICULTY } from '../src/ai/archetypes';
import { checkCommitted, type CRequest } from '../src/game/committedMoves';
import { emptyMovePose, emptyMoveState, MOVE_MODES, packMoveState, poseFromMoveState, sanitizeMoveState } from '../src/player/moveState';
import { hostDrawPhase } from '../src/net/validate';
import { parseMessage } from '../src/net/protocol';

const run = (u: MedkitUse, h: Health, secs: number, dt = 1 / 60): string => {
  let r = 'run';
  for (let t = 0; t < secs - 1e-9 && r === 'run'; t += dt) r = u.step(dt, h);
  return r;
};

describe('medkit (locomotion step 15, bible 5.13)', () => {
  it('heals 40 linearly over 1.5 s on yourself', () => {
    const h = new Health(100);
    h.hp = 50;
    const u = new MedkitUse();
    u.start(SELF_TARGET, h.hp);
    run(u, h, 0.75);
    expect(h.hp).toBeCloseTo(70, 0);
    expect(u.progress).toBeCloseTo(0.5, 1);
    expect(run(u, h, 1)).toBe('done');
    expect(h.hp).toBeCloseTo(90, 5);
    expect(u.active).toBe(false);
  });
  it('takes 2.0 s on a team-mate (H2, C14)', () => {
    const h = new Health(100);
    h.hp = 30;
    const u = new MedkitUse();
    u.start({ id: 'p2', mate: true }, h.hp);
    expect(u.dur).toBe(MEDKIT.mateTime);
    expect(run(u, h, 1.5)).toBe('run');
    expect(run(u, h, 0.6)).toBe('done');
    expect(h.hp).toBeCloseTo(70, 5);
  });
  it('damage interrupts it: the heal so far stays (the kit is spent by the caller, A56)', () => {
    const h = new Health(100);
    h.hp = 40;
    const u = new MedkitUse();
    u.start(SELF_TARGET, h.hp);
    run(u, h, 0.75);
    h.damage(5);
    expect(u.step(1 / 60, h)).toBe('hit');
    expect(h.hp).toBeCloseTo(55, 0);
    expect(u.active).toBe(false);
  });
  it('a player cancel takes the heal so far back', () => {
    const h = new Health(100);
    h.hp = 40;
    const u = new MedkitUse();
    u.start(SELF_TARGET, h.hp);
    run(u, h, 0.75);
    u.cancel(h);
    expect(h.hp).toBeCloseTo(40, 5);
    expect(u.active).toBe(false);
  });
  it('a cancel after a heal clamped at full health takes back only what was added', () => {
    const h = new Health(100);
    h.hp = 90;
    const u = new MedkitUse();
    u.start(SELF_TARGET, h.hp);
    run(u, h, 0.75);
    expect(h.hp).toBeCloseTo(100, 5);
    expect(u.healed).toBeCloseTo(10, 5);
    u.cancel(h);
    expect(h.hp).toBeCloseTo(90, 5);
  });
  it('caps at full health and refuses a use at full health, with no kits or dead', () => {
    const h = new Health(100);
    h.hp = 90;
    const u = new MedkitUse();
    u.start(SELF_TARGET, h.hp);
    run(u, h, 2);
    expect(h.hp).toBe(100);
    expect(medkitDenial(2, 100, 100, true)).toBe('full');
    expect(medkitDenial(0, 50, 100, true)).toBe('none');
    expect(medkitDenial(1, 50, 100, false)).toBe('dead');
    expect(medkitDenial(1, 50, 100, true)).toBeNull();
  });
  it('carries 2, 3 at Rookie; pickups cap at the carry max', () => {
    expect(medkitCarry(DIFFICULTY.rookie)).toBe(3);
    expect(medkitCarry(DIFFICULTY.normal)).toBe(2);
    expect(medkitCarry(DIFFICULTY.realistic)).toBe(2);
    expect(medkitCarry(DIFFICULTY.perfectionist)).toBe(2);
    expect(medkitCarry(null)).toBe(MEDKIT.carry);
    expect(addKit(1, 2)).toBe(2);
    expect(addKit(2, 2)).toBe(2);
    expect(addKit(2, 3)).toBe(3);
  });
});

describe('medkit host check and wire (A5, D8)', () => {
  const req = (o: Partial<CRequest> = {}): CRequest => ({ kind: 'medkit', alive: true, downed: false, mode: 'ground', active: false, sinceLast: 5, target: null, slack: 0, kits: 2, hp: 60, maxHp: 100, ...o });
  it('denials none (no kits) and full (hp 100)', () => {
    expect(checkCommitted(req())).toBeNull();
    expect(checkCommitted(req({ kits: 0 }))).toBe('none');
    expect(checkCommitted(req({ hp: 100 }))).toBe('full');
    expect(checkCommitted(req({ active: true }))).toBe('busy');
  });
  it('MoveState medkit is index 28: pack / sanitize, the pose, hands busy', () => {
    expect(MOVE_MODES.indexOf('medkit')).toBe(28);
    const mv = { ...emptyMoveState(), m: 'medkit' as const, ph: 0.4, tid: '', dw: 2 };
    const back = sanitizeMoveState(packMoveState(mv))!;
    expect(back.m).toBe('medkit');
    expect(back.ph).toBeCloseTo(0.4);
    expect(back.a).toBe(-1);
    expect(sanitizeMoveState({ m: 28, ph: 7, tid: '../x' })).toMatchObject({ m: 'medkit', ph: 1, tid: '' });
    const pose = poseFromMoveState(back, 0, emptyMovePose());
    expect(pose.medkit).toBeCloseTo(0.4);
    expect(pose.drawn).toBe(false);
    expect(hostDrawPhase(back, false)).toBe(0);
  });
  it('mk is clamped 0-3 in a snapshot; cdeny carries none / full', () => {
    const ps = (mk: unknown) => ({ id: 'p1', x: 0, y: 0, z: 0, yaw: 0, pitch: 0, speed: 0, f: 0, w: 'pistolSd', hp: 50, mk });
    const snap = (mk: unknown) => parseMessage({ t: 'snap', time: 1, players: [ps(mk)], enemies: [], obj: '', info: '' }) as { players: { mk?: number }[] } | null;
    expect(snap(2)?.players[0]?.mk).toBe(2);
    expect(snap(9)?.players[0]?.mk).toBe(3);
    expect(snap(-4)?.players[0]?.mk).toBe(0);
    expect(snap('x')?.players[0]?.mk).toBeUndefined();
    expect(parseMessage({ t: 'cdeny', a: 'p1', id: 3, kind: 'medkit', reason: 'none' })).toMatchObject({ reason: 'none' });
    expect(parseMessage({ t: 'cdeny', a: 'p1', id: 3, kind: 'medkit', reason: 'full' })).toMatchObject({ reason: 'full' });
    expect(parseMessage({ t: 'cmove', kind: 'medkit', id: 1, target: 'p1' })).toMatchObject({ kind: 'medkit', target: 'p1' });
  });
});
