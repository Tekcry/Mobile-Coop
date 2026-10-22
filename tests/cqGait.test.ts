import { describe, expect, it, beforeEach } from 'vitest';
import { CHEST_OF_PELVIS, CQ_GAIT, CQ_SECTION, CQ_SIM, cqGaitAt, CqGaitLayer, CqLiftCrouch, cqSim, cqSimSet, type CqGaitOut, type CqGaitRow } from '../src/anim/cqGait';
import { CQ, dropCurve, liftCurve, type DropState, type LiftState } from '../src/game/closeQuarters';
import { CH, newPose } from '../src/anim/pose';
import { TUNE_CUR } from '../src/anim/tune';
import { TUNE_FLAGS } from '../src/anim/tuneRegistry';
import { BAKE_CATALOGUE_MODULES, BAKE_RULES } from '../src/anim/tuneBakeTable';

const out = (): CqGaitOut => ({ pelYaw: 0, spYaw: 0, spRoll: 0, pelX: 0, pelY: 0 });
const corr = (a: number[], b: number[]): number => {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < n; i++) {
    ab += (a[i]! - ma) * (b[i]! - mb);
    aa += (a[i]! - ma) ** 2;
    bb += (b[i]! - mb) ** 2;
  }
  return ab / Math.sqrt(aa * bb);
};

function resetSliders(): void {
  for (const g of CQ_SECTION.groups) {
    const v = CQ_SECTION.values[g]!;
    for (const t of CQ_SECTION.tunables) v[t.id] = t.def;
  }
}

describe('cqGait (anim-natural N4: hold and carry walk trunk)', () => {
  beforeEach(() => {
    resetSliders();
    TUNE_FLAGS.bypass = false;
    cqSimSet('');
  });

  it('turns the pelvis with the step (left hip forward at the left heel strike) and the shoulders against it', () => {
    for (const row of [CQ_GAIT.hold, CQ_GAIT.carry]) {
      const o = cqGaitAt(row, 0, 1, 0, out());
      expect(o.pelYaw).toBeCloseTo(row.pelvis, 9);
      // the shoulder line is 0.4 pelvis + spine (characterRig): it ends at -counter x the pelvis
      expect(CHEST_OF_PELVIS * o.pelYaw + o.spYaw).toBeCloseTo(-row.counter * row.pelvis, 9);
      expect(cqGaitAt(row, 0.5, 1, 0, out()).pelYaw).toBeCloseTo(-row.pelvis, 9);
      expect(Math.abs(cqGaitAt(row, 0.25, 1, 0, out()).pelYaw)).toBeLessThan(1e-9);
    }
  });

  it('counter-rotates over a cycle: pelvis and shoulder line correlate below -0.5, smaller than a free walk', () => {
    for (const row of [CQ_GAIT.hold, CQ_GAIT.carry]) {
      const p: number[] = [];
      const s: number[] = [];
      for (let i = 0; i < 60; i++) {
        const o = cqGaitAt(row, i / 60, 1, 1, out());
        p.push(o.pelYaw);
        s.push(CHEST_OF_PELVIS * o.pelYaw + o.spYaw);
      }
      expect(corr(p, s)).toBeLessThan(-0.99);
      // a free walk is about +-4 deg pelvis: these stay under it
      expect(row.pelvis).toBeLessThan((4 * Math.PI) / 180);
      expect(row.pelvis).toBeGreaterThan((2 * Math.PI) / 180);
    }
  });

  it('still: no twist and no dip; the carry lean stays (away from the load: + roll is to the left)', () => {
    const o = cqGaitAt(CQ_GAIT.carry, 0.3, 0, 1, out());
    expect(Math.abs(o.pelYaw)).toBe(0);
    expect(Math.abs(o.pelY)).toBe(0);
    expect(o.spRoll).toBeCloseTo(CQ_GAIT.carry.lean, 9);
    expect(o.pelX).toBeCloseTo(CQ_GAIT.carry.shift, 9);
    const l = cqGaitAt(CQ_GAIT.carry, 0.3, 0, -1, out());
    expect(l.spRoll).toBeCloseTo(-CQ_GAIT.carry.lean, 9);
    expect(cqGaitAt(CQ_GAIT.hold, 0.3, 0, 1, out()).spRoll).toBe(0);
  });

  it('the heavier step: deepest just after each heel strike, none at mid-stance', () => {
    const row = CQ_GAIT.carry;
    expect(cqGaitAt(row, 0.06, 1, 1, out()).pelY).toBeCloseTo(-row.dip, 9);
    expect(cqGaitAt(row, 0.56, 1, 1, out()).pelY).toBeCloseTo(-row.dip, 9);
    expect(Math.abs(cqGaitAt(row, 0.31, 1, 1, out()).pelY)).toBeLessThan(1e-9);
  });

  it('the layer adds nothing when not holding or carrying, and eases in', () => {
    const L = new CqGaitLayer();
    const src = newPose();
    const before = Float32Array.from(src);
    L.apply(src, false, false, 0, 0, 1, 1 / 60);
    expect(Array.from(src)).toEqual(Array.from(before));
    L.apply(src, true, true, 1, 0, 1, 1 / 60);
    const w = L.w;
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThan(0.2);
    for (let i = 0; i < 120; i++) {
      src.fill(0);
      L.apply(src, true, true, 1, 0, 1, 1 / 60);
    }
    expect(src[CH.pelYaw]!).toBeCloseTo(CQ_GAIT.carry.pelvis, 3);
    expect(src[CH.spRoll]!).toBeCloseTo(CQ_GAIT.carry.lean, 3);
  });

  it('sliders: identity at default reproduces CQ_GAIT, a slider scales its own value, the bypass reads identity', () => {
    const L = new CqGaitLayer();
    const src = newPose();
    const run = (): number => {
      L.w = 1;
      L.carryK = 0;
      src.fill(0);
      L.apply(src, true, false, 0, 0, 1, 0);
      return src[CH.pelYaw]!;
    };
    expect(run()).toBeCloseTo(CQ_GAIT.hold.pelvis, 6);
    CQ_SECTION.values['cq.hold']!.holdTwist = 0;
    expect(run()).toBe(0);
    CQ_SECTION.values['cq.hold']!.holdTwist = 2;
    expect(run()).toBeCloseTo(CQ_GAIT.hold.pelvis * 2, 6);
    TUNE_FLAGS.bypass = true;
    expect(run()).toBeCloseTo(CQ_GAIT.hold.pelvis, 6);
  });

  it('the carry step length goes on the local gait clock only inside the window', () => {
    TUNE_CUR.strideMul = 1;
    cqSimSet('cq.carry');
    expect(CQ_SIM.group).toBe('cq.carry');
    cqSim();
    expect(TUNE_CUR.strideMul).toBeCloseTo(CQ_GAIT.carry.stride, 9);
    TUNE_CUR.strideMul = 1;
    cqSimSet('');
    cqSim();
    expect(TUNE_CUR.strideMul).toBe(1);
  });

  it('every slider bakes: one rule per slider into its own CQ_GAIT value, and the catalogue loads the module', () => {
    expect(BAKE_CATALOGUE_MODULES).toContain('src/anim/cqGait.ts');
    for (const t of CQ_SECTION.tunables) {
      const r = BAKE_RULES.filter((x) => x.section === 'cq' && x.id === t.id);
      expect(r, t.id).toHaveLength(1);
      expect(r[0]!.groups).toEqual(t.groups);
      const ed = r[0]!.edits[0]!;
      expect(ed.file).toBe('src/anim/cqGait.ts');
      const [, walk, field] = ed.path.split('.') as [string, 'hold' | 'carry', keyof CqGaitRow];
      expect(typeof CQ_GAIT[walk][field]).toBe('number');
      expect(ed.op).toBe(t.kind === 'mul' ? 'mul' : 'add');
    }
  });
});

describe('cqGait: the body on the shoulder (anim-n4 fix round)', () => {
  const dt = 1 / 60;
  const lift = (): LiftState => ({ atBody: true, hoist: 0, bend: 0, drop: 0, crouch: true, hands: 0, step: 0, load: 0 });

  beforeEach(() => {
    resetSliders();
    TUNE_FLAGS.bypass = false;
  });

  it('the carry lean and hip shift follow the weight on the shoulder: none kneeling (lift t = 0.4), full carrying, gone by the hand-over', () => {
    const L = new CqGaitLayer();
    const src = newPose();
    const lc = lift();
    // the sim's load (StealthSystems.loadShare) x the right shoulder, as GameState hands it to the rig (carrySide)
    const frame = (load: number): void => {
      src.fill(0);
      L.apply(src, true, true, 1 * load, 0.3, 0, dt);
    };
    let n = 1;
    for (; n <= 24; n++) frame(liftCurve(n * dt, lc).load);
    expect((n - 1) * dt).toBeCloseTo(0.4, 9);
    expect(L.carryK).toBeGreaterThan(0.9); // the carry walk's row, with nothing on the shoulder yet
    expect(Math.abs(src[CH.spRoll]!)).toBeLessThan(1e-6);
    expect(Math.abs(src[CH.pelX]!)).toBeLessThan(1e-6);
    // the hoist brings it in; carrying it is full
    for (; n <= 60 * CQ.lift; n++) frame(liftCurve(n * dt, lc).load);
    for (let k = 0; k < 60; k++) frame(1);
    expect(src[CH.spRoll]!).toBeCloseTo(CQ_GAIT.carry.lean, 4);
    expect(src[CH.pelX]!).toBeCloseTo(CQ_GAIT.carry.shift, 5);
    // the put down: half way to the ragdoll's hand-over (dropHand) half the lean, none once it has the body
    const dc: DropState = { slide: 0, bend: 0, drop: 0, hands: 1, load: 1 };
    const half = Math.round(CQ.dropHand * 30);
    for (let k = 1; k <= half; k++) frame(dropCurve(k * dt, dc).load);
    expect(src[CH.spRoll]!).toBeCloseTo(CQ_GAIT.carry.lean * 0.5, 2);
    for (let k = half + 1; k <= 2 * half; k++) frame(dropCurve(k * dt, dc).load);
    expect(dc.load).toBe(0);
    expect(Math.abs(src[CH.spRoll]!)).toBeLessThan(1e-6);
    expect(Math.abs(src[CH.pelX]!)).toBeLessThan(1e-6);
  });

  it('the lift crouch: the controller crouches from t = 0 (the sim timeline); the pose steps in standing, kneels before the hoist, stays down for a stepping foot (capped)', () => {
    for (const planted of [false, true]) {
      const P = new CqLiftCrouch();
      const lc = lift();
      let crouch = 0;
      let at03 = -1;
      let atReach = -1;
      let at11 = -1;
      let at16 = -1;
      for (let n = 0; n <= 60 * CQ.lift; n++) {
        const t = n * dt;
        liftCurve(t, lc);
        if (n === 0) expect(lc.crouch).toBe(true);
        // the controller's stance ease (crouch held, then standTime ~0.25 s)
        crouch = lc.crouch ? Math.min(1, crouch + dt / 0.22) : Math.max(0, crouch - dt / 0.25);
        const c = P.step(crouch, lc.step, planted, dt);
        if (n === 18) at03 = c;
        if (n === Math.round(CQ.liftReach * 60)) atReach = c;
        if (n === 66) at11 = c;
        if (n === 96) at16 = c;
      }
      expect(at03).toBe(0); // the step-in standing (the controller is down by now)
      expect(atReach).toBeGreaterThan(0.99); // kneeling at the body before the hoist
      // a foot still stepping holds the kneel (at most CQ.liftCrouchWait); both planted, it follows the controller up
      if (planted) expect(at11).toBeLessThan(0.5);
      else expect(at11).toBe(1);
      expect(at16).toBe(0);
      // after the lift (back on the controller's crouch) it passes it through
      expect(P.step(0, -1, true, dt)).toBe(0);
      expect(P.step(0.4, -1, true, dt)).toBe(0.4);
    }
  });
});

describe('cqGait bake (every slider bakes)', () => {
  it('a tuned export writes CQ_GAIT (x for a mul, + deg in rad for the lean) and nothing else', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const { bakeCatalogue, locate, tuneBake } = await import('../src/anim/tuneBake');
    const F = 'src/anim/cqGait.ts';
    const src = readFileSync(path.join(__dirname, '..', F), 'utf8');
    const read = (p: string): string | null => (p === F ? src : null);
    const entry = (group: string, id: string, kind: 'mul' | 'add', value: number) => ({ group, id, label: id, kind, unit: '', value, default: kind === 'mul' ? 1 : 0 });
    const exp = {
      magic: 'night-shift-anim-tune',
      version: 1,
      exported: '2026-10-22T10:00:00.000Z',
      changed: [entry('cq.hold', 'holdTwist', 'mul', 1.5), entry('cq.carry', 'carryLean', 'add', 2), entry('cq.carry', 'carryStride', 'mul', 1.2)],
      log: [],
    };
    const r = tuneBake(exp, bakeCatalogue([CQ_SECTION]), read, { now: new Date('2026-10-22T12:00:00Z') });
    expect(r.ok, r.error).toBe(true);
    const w = r.writes.find((x) => x.path === F)!;
    expect(w).toBeTruthy();
    const num = (t: string, p: string): number => Number(locate(t, p).text);
    expect(num(w.after, 'CQ_GAIT.hold.pelvis')).toBeCloseTo(CQ_GAIT.hold.pelvis * 1.5, 4);
    expect(num(w.after, 'CQ_GAIT.carry.lean')).toBeCloseTo(CQ_GAIT.carry.lean + (2 * Math.PI) / 180, 4);
    expect(num(w.after, 'CQ_GAIT.carry.stride')).toBeCloseTo(CQ_GAIT.carry.stride * 1.2, 4);
    expect(num(w.after, 'CQ_GAIT.carry.pelvis')).toBe(CQ_GAIT.carry.pelvis);
    expect(w.after.split('\n').length).toBe(w.before.split('\n').length);
    for (const id of ['holdTwist', 'carryLean', 'carryStride']) expect(r.rows.find((x) => x.id === id)!.result).toBe('baked');
  });
});
