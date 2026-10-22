// (anim-bake-targets, BT-A1 / A3) The base table's `body` key: parse / apply / print, the per-rig composition (base
// with the tuner's delta, opened and closed per rig, nothing leaking into the next rig), guards untouched, untuned
// bit-identical.
import { afterEach, describe, expect, it } from 'vitest';
import { ANIM_BASE } from '../src/anim/animBase';
import { BODY_BASE_FIELDS, BODY_FIELDS, BODY_GROUPS, TUNE_CUR, TUNE_IDENTITY, TUNE_LOCAL, TUNE_OWNER, bodyBaseGet, bodyBaseLoad, bodyRigBegin, bodyRigEnd, bodyRigState, type TuneRigIn } from '../src/anim/tune';
import { applyBaseEntries, baseTarget, emptyBase, parseAnimBase, printAnimBase, spliceAnimBase } from '../src/anim/tuneBakeBase';

const tgt = () => ({ x: 1, y: 2, z: 3, w: 1 });
const fakeRig = (): TuneRigIn => ({ heldWeapon: null, reachL: tgt(), reachR: tgt(), plantL: tgt(), plantR: tgt(), root: { rotation: { y: 0.3 } } });
const gi = (g: string): number => (BODY_GROUPS as readonly string[]).indexOf(g);
const FILE = (json: string): string => `head\n// @anim-base-begin\n${json}// @anim-base-end\n;\n`;

afterEach(() => {
  bodyBaseLoad(ANIM_BASE.body);
  TUNE_OWNER.rig = null;
});

describe('anim-bake-targets: the body key in the bake', () => {
  it('a table without the key parses and prints exactly as before; the key prints only with a row set (sorted, identity dropped)', () => {
    const before = printAnimBase(emptyBase());
    expect(printAnimBase({ ...emptyBase(), body: {} })).toBe(before);
    expect(printAnimBase({ ...emptyBase(), body: { walk: { trackMul: 1, elbowOutAdd: 0 } } })).toBe(before);
    expect(parseAnimBase(FILE(before)).body).toBeUndefined();
    const b = { ...emptyBase(), body: { walk: { trackMul: 0.05, elbowOutAdd: 0.03 }, idle: { armSwingMul: 1.23456 } } };
    const text = printAnimBase(b);
    expect(text).toContain('  "body": {\n    "idle": { "armSwingMul": 1.235 },\n    "walk": { "elbowOutAdd": 0.03, "trackMul": 0.05 }\n  }');
    expect(parseAnimBase(spliceAnimBase(FILE(before), b)).body).toEqual({ idle: { armSwingMul: 1.235 }, walk: { elbowOutAdd: 0.03, trackMul: 0.05 } });
  });

  it('apply: mul sliders multiply, add sliders add, onto what is there; a slider with a code rule is refused', () => {
    const b0 = { ...emptyBase(), body: { walk: { trackMul: 0.5, elbowOutAdd: 0.01 } } };
    const b1 = applyBaseEntries(b0, [
      { section: 'body', group: 'walk', id: 'trackMul', value: 0.1 },
      { section: 'body', group: 'walk', id: 'elbowOutAdd', value: 0.02 },
      { section: 'body', group: 'run', id: 'kneeLiftMul', value: 1.55 },
    ]);
    expect(b1.body).toEqual({ walk: { trackMul: 0.05, elbowOutAdd: 0.03 }, run: { kneeLiftMul: 1.55 } });
    expect(b0.body.walk.trackMul).toBe(0.5); // untouched
    expect(baseTarget({ section: 'body', group: 'lowReady', id: 'elbowPoleMul' })).toBe('src/anim/animBase.ts: body.lowReady.elbowPoleMul x');
    expect(baseTarget({ section: 'body', group: 'idle', id: 'elbowOutAdd' })).toBe('src/anim/animBase.ts: body.idle.elbowOutAdd +');
    expect(() => baseTarget({ section: 'body', group: 'walk', id: 'strideMul' })).toThrow(/not a Body base param/);
    expect(() => baseTarget({ section: 'body', group: 'nope', id: 'trackMul' })).toThrow(/not a Body base param/);
    expect(BODY_BASE_FIELDS).not.toContain('strideMul');
    expect(BODY_BASE_FIELDS).not.toContain('peekLeanMul');
    expect(BODY_BASE_FIELDS.length).toBe(BODY_FIELDS.length - 2);
  });

  it('the generated table holds Michael\'s 2026-10-22 Body values (the start-up load)', () => {
    expect(bodyBaseGet('walk', 'trackMul')).toBe(0.05);
    expect(bodyBaseGet('jog', 'armSwingMul')).toBe(1.7);
    expect(bodyBaseGet('run', 'kneeLiftMul')).toBe(1.55);
    expect(bodyBaseGet('lowReady', 'elbowPoleMul')).toBe(2.25);
    expect(bodyBaseGet('idle', 'elbowOutAdd')).toBe(0.03);
    expect(bodyBaseGet('crouchIdle', 'trackMul')).toBe(1);
  });
});

describe('anim-bake-targets: the per-rig composition', () => {
  it('untuned (empty base): nothing opens, TUNE_CUR stays bit-identical', () => {
    expect(bodyBaseLoad(undefined)).toEqual([]);
    const st = bodyRigState();
    const rig = fakeRig();
    const p = { speed: 1.4, crouch: 0, aim: 0, lookYaw: 0.4 };
    bodyRigBegin(st, gi('walk'), p, rig, 1 / 60);
    for (const f of BODY_FIELDS) expect(Object.is(TUNE_CUR[f], TUNE_IDENTITY[f]), f).toBe(true);
    expect(TUNE_CUR.armSwingK).toBe(1);
    expect(p.lookYaw).toBe(0.4);
    expect(rig.reachL).toEqual(tgt());
    bodyRigEnd();
    expect(st.live).toBe(false);
  });

  it('base composed with the tuner delta inside the window, put back after; rows per rig, nothing leaks to the next rig', () => {
    bodyBaseLoad({ walk: { trackMul: 0.5, elbowOutAdd: 0.03, headTurnMul: 2, handUpAdd: 0.1 }, idle: { armSwingMul: 1.6 } });
    const a = bodyRigState();
    const b = bodyRigState();
    const rigA = fakeRig();
    const rigB = fakeRig();
    // the local player's tuner values (as tuneBegin loads them) for rig A
    TUNE_CUR.trackMul = 0.8;
    TUNE_CUR.elbowOutAdd = 0.01;
    TUNE_OWNER.rig = rigA;
    const pA = { speed: 1.4, crouch: 0, aim: 0, lookYaw: 0.4 };
    bodyRigBegin(a, gi('walk'), pA, rigA, 0);
    expect(TUNE_CUR.trackMul).toBeCloseTo(0.4, 12);
    expect(TUNE_CUR.elbowOutAdd).toBeCloseTo(0.04, 12);
    expect(TUNE_LOCAL.trackMul).toBeCloseTo(0.4, 12); // the owner's composed values for code outside the window
    expect(pA.lookYaw).toBeCloseTo(0.8, 12);
    expect(rigA.reachL.y).toBeCloseTo(2.1, 12);
    bodyRigEnd();
    expect(TUNE_CUR.trackMul).toBe(0.8);
    expect(TUNE_CUR.elbowOutAdd).toBe(0.01);
    expect(pA.lookYaw).toBe(0.4);
    expect(rigA.reachL).toEqual(tgt());
    // tuneEnd: identity again; then a partner rig (not the owner) on another row
    TUNE_CUR.trackMul = 1;
    TUNE_CUR.elbowOutAdd = 0;
    TUNE_OWNER.rig = null;
    const localTrack = TUNE_LOCAL.trackMul;
    const pB = { speed: 0, crouch: 0, aim: 0 };
    bodyRigBegin(b, gi('idle'), pB, rigB, 0);
    expect(TUNE_CUR.trackMul).toBe(1); // rig A's walk row does not leak into rig B's idle
    expect(TUNE_CUR.armSwingMul).toBeCloseTo(1.6, 12);
    expect(TUNE_CUR.armSwingK).toBeCloseTo(1.6, 12);
    expect(TUNE_LOCAL.trackMul).toBe(localTrack); // a partner never writes the local player's values
    bodyRigEnd();
    for (const f of BODY_FIELDS) expect(TUNE_CUR[f], f).toBe(TUNE_IDENTITY[f]); // a guard (no state, no window) reads identity
    expect(TUNE_CUR.armSwingK).toBe(1);
  });

  it('a state change eases over BODY_TAU (no pop), dt 0 jumps; leaving the row eases back to identity', () => {
    bodyBaseLoad({ walk: { trackMul: 0.2 } });
    const st = bodyRigState();
    const rig = fakeRig();
    const p = { speed: 1, crouch: 0, aim: 0 };
    bodyRigBegin(st, gi('walk'), p, rig, 1 / 60);
    const first = TUNE_CUR.trackMul;
    bodyRigEnd();
    expect(first).toBeLessThan(1);
    expect(first).toBeGreaterThan(0.2);
    bodyRigBegin(st, gi('walk'), p, rig, 0);
    expect(TUNE_CUR.trackMul).toBe(0.2);
    bodyRigEnd();
    for (let i = 0; i < 200; i++) {
      bodyRigBegin(st, gi('crouchIdle'), p, rig, 1 / 60);
      bodyRigEnd();
    }
    expect(st.live).toBe(false);
    expect(st.applied.every((v, i) => v === (BODY_BASE_FIELDS[i]!.endsWith('Mul') ? 1 : 0))).toBe(true);
  });
});
