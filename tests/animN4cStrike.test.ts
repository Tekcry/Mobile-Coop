// (anim-natural N4c, AUDIT row 49) The elbow strike driven from the hips and trunk, on the real rig maths (NullEngine):
// the shoulder line's turn through the arc, the hips leading the shoulders, the head on the target, back to rest; the
// pure layer's shape and the tuner section. (anim-n4c M1, "Faster arm") The strike plays the arc warped onto the hit
// (strikeWarp): the contact frame against STRIKE.hitAt, the hips still first, back to rest, the largest per-frame steps.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { setMixamo } from '../src/anim/mixamo';
import type { RigPose } from '../src/player/characterRig';
import { STRIKE_ARC_CONTACT, STRIKE_ARM_LAG, STRIKE_BODY, STRIKE_HIT_PH, STRIKE_SECTION, newStrikeBody, strikeBodyAt, strikeWarp, arcWarp, STRIKE_CONTACT_T, STRIKE_FOLLOW, STRIKE_SETTLE, strikeArcAt, killWarp, KILL_TAIL_END, TAKEDOWN_BLOW, GRAB_KILL_BLOW } from '../src/anim/strikeBody';
import { STRIKE, STRIKE_DUR, STRIKE_WHIFF_DUR, strikePhase, strikeStage } from '../src/game/elbowStrike';
import { meleeHandW, meleeSweep } from '../src/anim/animGraph';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';
import { TUNE_FLAGS } from '../src/anim/tuneRegistry';

// (one-game) the Mixamo captures are on at load by default now; this file pins the hand-made state: `?mixamo=0`
setMixamo(false);

const DT = 1 / 60;
const DEG = 180 / Math.PI;

/** `ph` the strike's phase, `arc` the arc's (the pose input); `wz`: the right wrist ahead of the chest (m, the chest's
 *  frame); `wx`: across it (+ right); `tq` / `hq` the chest's / pelvis' world rotation (x y z w); `wp` the right wrist's
 *  world position. */
type Sample = { ph: number; arc: number; sh: number; hip: number; head: number; pelX: number; pelZ: number; wz: number; wx: number; ez: number; ex: number; tq: number[]; hq: number[]; wp: number[] };

/** Strike on a standing holstered rig: `wren` a Wren rig (tuneRows), else a plain carrier rig (the guards' / old path);
 *  `strike` false: the same frames standing (the control: the idle's own breathing, sway and head scan). */
async function strikeRun(wren: boolean, strike = true, warp = true): Promise<{ rest: Sample; arc: Sample[]; after: Sample; limited: number }> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Matrix, Scene, Vector3 } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { WREN_HANDS } = await import('../src/operators/handFrame');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 1.75, wren ? 'n4c-wren' : 'n4c-plain', { build: 'average', style: 'detailed' });
  rig.groundProbe = () => 0;
  rig.carrier = true;
  if (wren) {
    rig.setHands(WREN_HANDS);
    rig.tuneRows = true;
  }
  const settle = (): void => {
    rig.root.computeWorldMatrix(true);
    for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
  };
  const yawOf = (a: { getAbsolutePosition(): { x: number; z: number } }, b: { getAbsolutePosition(): { x: number; z: number } }): number => {
    const pa = a.getAbsolutePosition();
    const pb = b.getAbsolutePosition();
    // the line left -> right; a turn to the right (+ yaw) carries the right end back (-z)
    return Math.atan2(-(pb.z - pa.z), pb.x - pa.x);
  };
  const fwd = new Vector3();
  const inv = new Matrix();
  const wr = new Vector3();
  const sample = (ph: number, arcPh = ph): Sample => {
    settle();
    Vector3.TransformNormalToRef(new Vector3(0, 0, 1), rig.headNode.getWorldMatrix(), fwd);
    const hp = rig.hips.position;
    rig.torso.getWorldMatrix().invertToRef(inv);
    Vector3.TransformCoordinatesToRef(rig.wristR.getAbsolutePosition(), inv, wr);
    const tq = rig.torso.absoluteRotationQuaternion;
    const hq = rig.hips.absoluteRotationQuaternion;
    const wp = rig.wristR.getAbsolutePosition();
    const wz = wr.z;
    const wx = wr.x;
    Vector3.TransformCoordinatesToRef(rig.elbowR.getAbsolutePosition(), inv, wr);
    return { ph, arc: arcPh, sh: yawOf(rig.shoulderL, rig.shoulderR), hip: yawOf(rig.hipL, rig.hipR), head: Math.atan2(fwd.x, fwd.z), pelX: hp.x, pelZ: hp.z, wz, wx, ez: wr.z, ex: wr.x, tq: [tq.x, tq.y, tq.z, tq.w], hq: [hq.x, hq.y, hq.z, hq.w], wp: [wp.x, wp.y, wp.z] };
  };
  const pose: RigPose = { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing', melee: -1 };
  rig.root.position.set(0, 0, 0);
  for (let k = 0; k < 120; k++) rig.animate(DT, pose);
  const rest = sample(-1);
  const arc: Sample[] = [];
  const limited0 = rig.limited;
  const n = Math.ceil(STRIKE_DUR / DT);
  for (let k = 1; k <= n; k++) {
    // (as StrikeController: the arc warped onto the hit; `warp` false: the arc time-linear, before anim-n4c M1)
    const ph = strikePhase(k * DT);
    const a = warp ? strikeWarp(ph) : ph;
    pose.melee = strike ? a : -1;
    rig.animate(DT, pose);
    arc.push(sample(ph, a));
  }
  pose.melee = -1;
  for (let k = 0; k < 60; k++) rig.animate(DT, pose);
  const after = sample(-1);
  return { rest, arc, after, limited: rig.limited - limited0 };
}

/** The strike run less the control run, frame by frame (the idle's own motion cancels). */
const minus = (a: readonly Sample[], b: readonly Sample[], f: (s: Sample) => number): number[] => a.map((s, i) => f(s) - f(b[i]!));
const range = (a: readonly number[]): number => Math.max(...a) - Math.min(...a);
/** Where a descending series first crosses the middle of its range after its top (the drive's mid-point), in fractional
 *  frames (linear between the two frames either side; anim-n4c M1: the drive spans only a few frames). */
const midCrossF = (a: readonly number[]): number => {
  const mid = (Math.max(...a) + Math.min(...a)) / 2;
  const top = a.indexOf(Math.max(...a));
  for (let k = top + 1; k < a.length; k++) if (a[k]! <= mid) return k - 1 + (a[k - 1]! - mid) / (a[k - 1]! - a[k]!);
  return -1;
};
/** The angle (rad) between two rotations (x y z w). */
const qAngle = (a: readonly number[], b: readonly number[]): number => 2 * Math.acos(Math.min(1, Math.abs(a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]! + a[3]! * b[3]!)));
/** The largest step from one frame to the next (the rest pose before the first). */
const maxStep = (rest: Sample, arc: readonly Sample[], f: (a: Sample, b: Sample) => number): number => {
  let m = 0;
  for (let k = 0; k < arc.length; k++) m = Math.max(m, f(k === 0 ? rest : arc[k - 1]!, arc[k]!));
  return m;
};
const dist3 = (a: readonly number[], b: readonly number[]): number => Math.sqrt((a[0]! - b[0]!) ** 2 + (a[1]! - b[1]!) ** 2 + (a[2]! - b[2]!) ** 2);
const argMin = (a: readonly number[]): number => a.indexOf(Math.min(...a));
const argMax = (a: readonly number[]): number => a.indexOf(Math.max(...a));
/** The rig runs, shared by the tests (each is a few hundred NullEngine frames). */
const runs = new Map<string, ReturnType<typeof strikeRun>>();
const run = (wren: boolean, strike = true, warp = true): ReturnType<typeof strikeRun> => {
  const key = `${wren}-${strike}-${strike && warp}`;
  let r = runs.get(key);
  if (!r) runs.set(key, (r = strikeRun(wren, strike, warp)));
  return r;
};

describe('anim-n4c: the elbow strike from the hips and trunk (AUDIT row 49)', () => {
  // the graph's idle clock starts at a random time: fixed, so the strike and control runs pose the same idle
  beforeAll(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('the pure layer: rest at both ends, wind-up right, drive left, the hips ahead of the shoulders, the weight forward', () => {
    const o = newStrikeBody();
    expect(strikeBodyAt(-1, o)).toEqual({ pel: 0, chest: 0, fwd: 0, side: 0, neck: 0 });
    strikeBodyAt(0, o);
    expect(Math.abs(o.pel) + Math.abs(o.chest) + Math.abs(o.fwd) + Math.abs(o.side)).toBeLessThan(1e-9);
    strikeBodyAt(1, o);
    expect(Math.abs(o.pel) + Math.abs(o.chest) + Math.abs(o.fwd) + Math.abs(o.side)).toBeLessThan(1e-9);
    let maxC = 0;
    let minC = 0;
    let minCAt = 0;
    let minPAt = 0;
    let minP = 0;
    let maxFwd = 0;
    for (let k = 0; k <= 200; k++) {
      const ph = k / 200;
      strikeBodyAt(ph, o);
      if (o.chest > maxC) maxC = o.chest;
      if (o.chest < minC) [minC, minCAt] = [o.chest, ph];
      if (o.pel < minP) [minP, minPAt] = [o.pel, ph];
      maxFwd = Math.max(maxFwd, o.fwd);
      // the neck takes half the shoulder turn back
      expect(o.neck).toBeCloseTo(-STRIKE_BODY.neck * o.chest, 12);
    }
    expect(maxC).toBeGreaterThan(0.2); // the rear shoulder back on the wind-up
    expect(minC).toBeLessThan(-0.3); // through to the left at contact
    expect((maxC - minC) * DEG).toBeGreaterThan(28);
    expect((maxC - minC) * DEG).toBeLessThan(40);
    expect(minPAt).toBeLessThan(minCAt); // the hips arrive first
    expect(maxFwd).toBeCloseTo(STRIKE_BODY.fwd, 3);
  });

  it('the tuner section scales the turn (identity at default, the bypass reads the code values)', () => {
    const v = STRIKE_SECTION.values['strike.elbow']!;
    const o = newStrikeBody();
    const base = strikeBodyAt(0.45, o).chest;
    try {
      v.turn = 0.5;
      expect(strikeBodyAt(0.45, o).chest).toBeCloseTo(base * 0.5, 9);
      TUNE_FLAGS.bypass = true;
      expect(strikeBodyAt(0.45, o).chest).toBeCloseTo(base, 9);
    } finally {
      v.turn = 1;
      TUNE_FLAGS.bypass = false;
    }
  });

  it('a Wren rig turns the shoulders ~33 deg through the arc, hips first, head on the target, then back to rest', async () => {
    const before = await run(false);
    const beforeCtl = await run(false, false);
    const r = await run(true);
    const ctl = await run(true, false);
    const shs = minus(r.arc, ctl.arc, (s) => s.sh);
    const hips = minus(r.arc, ctl.arc, (s) => s.hip);
    const shB = range(minus(before.arc, beforeCtl.arc, (s) => s.sh)) * DEG;
    const sh = range(shs) * DEG;
    const hip = range(hips) * DEG;
    // (anim-n4c M1: the drive now spans ~3 frames, so the mid-points are taken between frames)
    const hipAt = midCrossF(hips);
    const shAt = midCrossF(shs);
    const head = Math.max(...minus(r.arc, ctl.arc, (s) => s.head).map(Math.abs)) * DEG;
    const fwd = Math.max(...minus(r.arc, ctl.arc, (s) => s.pelZ));
    const backSh = (r.after.sh - ctl.after.sh) * DEG;
    const backHip = (r.after.hip - ctl.after.hip) * DEG;
    // contact: the hand's arrival across (anim-n4c M1: the arm lags the warped arc by about 2 frames, the joint limits)
    const atArc = (a: readonly Sample[]): Sample => {
      const m = Math.min(...a.map((s) => s.wx));
      return a.find((s) => s.wx <= m + 0.01)!;
    };
    const contact = atArc(r.arc);
    const wzMin = Math.min(...r.arc.map((s) => s.wz));
    const wzMinB = Math.min(...before.arc.map((s) => s.wz));
    console.info(`[n4c strike] right wrist (chest frame): nearest the chest ${(wzMin * 100).toFixed(1)} cm ahead (old path ${(wzMinB * 100).toFixed(1)}); at contact ${(contact.wz * 100).toFixed(1)} cm ahead, ${(contact.wx * 100).toFixed(1)} cm across (old path at contact ${(atArc(before.arc).wz * 100).toFixed(1)} cm ahead)`);
    console.info(`[n4c strike] shoulder turn over the arc: plain carrier rig (the old path) ${shB.toFixed(1)} deg, Wren ${sh.toFixed(1)} deg; hips ${hip.toFixed(1)} deg; mid-drive: hips frame ${hipAt.toFixed(2)}, shoulders ${shAt.toFixed(2)}; head off target max ${head.toFixed(1)} deg; pelvis forward ${(fwd * 100).toFixed(1)} cm; rate-limited joint frames ${r.limited} (control ${ctl.limited}, old path ${before.limited}); 1 s after: shoulders ${backSh.toFixed(2)} deg, hips ${backHip.toFixed(2)} deg`);
    // the old path (the guards' code and Wren before): the keyed trunk wiped the graph's turn
    expect(shB).toBeLessThan(10);
    // Wren: a body-driven strike
    expect(sh).toBeGreaterThan(20);
    expect(sh).toBeLessThan(40);
    expect(hip).toBeGreaterThan(10);
    expect(hipAt).toBeGreaterThan(0);
    expect(hipAt).toBeLessThan(shAt); // the hips lead the shoulders by a few frames
    expect(shAt - hipAt).toBeLessThanOrEqual(5);
    expect(head).toBeLessThan(6); // the head stays on the target
    expect(fwd).toBeGreaterThan(0.015); // the weight onto the lead foot
    // the elbow drives through with the chest: the striking hand stays ahead of the chest, across to the midline
    expect(wzMin).toBeGreaterThan(wzMinB - 0.02);
    expect(contact.wx).toBeLessThan(0.1);
    // back to rest
    expect(Math.abs(backSh)).toBeLessThan(0.5);
    expect(Math.abs(backHip)).toBeLessThan(0.5);
  });

  it('(M1, "Faster arm") the warp: the arc\'s contact a frame before the hit, monotonic, ends and "none" kept', () => {
    expect(STRIKE_HIT_PH).toBeCloseTo(STRIKE.hitAt / STRIKE_DUR, 12);
    expect(STRIKE_ARM_LAG).toBeCloseTo(DT, 12);
    expect(strikeWarp(strikePhase(STRIKE.hitAt - STRIKE_ARM_LAG))).toBeCloseTo(STRIKE_ARC_CONTACT, 9);
    expect(strikeWarp(STRIKE_HIT_PH)).toBeGreaterThan(STRIKE_ARC_CONTACT); // past contact at the hit
    expect(arcWarp(STRIKE_HIT_PH, STRIKE_HIT_PH)).toBeCloseTo(STRIKE_ARC_CONTACT, 9);
    expect(strikeWarp(0)).toBe(0);
    expect(strikeWarp(1)).toBe(1);
    expect(strikeWarp(-1)).toBe(-1);
    expect(arcWarp(0.3, 0)).toBe(0.3); // no hit phase: unwarped
    let prev = 0;
    for (let k = 1; k <= 400; k++) {
      const w = strikeWarp(k / 400);
      expect(w).toBeGreaterThan(prev);
      prev = w;
    }
  });

  it('(M1, "Faster arm") the elbow reaches contact at the hit, the trunk through with it, hips first, then back to rest', async () => {
    const r = await run(true);
    const old = await run(true, true, false);
    const ctl = await run(true, false);
    const tOf = (i: number): number => (i + 1) * DT;
    const stats = (x: { rest: Sample; arc: Sample[]; after: Sample; limited: number }) => {
      const shs = minus(x.arc, ctl.arc, (s) => s.sh);
      const hips = minus(x.arc, ctl.arc, (s) => s.hip);
      // the striking hand arrives across at the midline (the sweep's peak: the first frame within 1 cm of its furthest)
      const wxs = x.arc.map((s) => s.wx);
      const wxMin = Math.min(...wxs);
      const contact = wxs.findIndex((w) => w <= wxMin + 0.01);
      // the striking elbow at its forward extreme (the same: within 1 cm)
      const ezs = x.arc.map((s) => s.ez);
      const ezMax = Math.max(...ezs);
      const elbow = ezs.findIndex((z) => z >= ezMax - 0.01);
      const shTop = argMin(shs); // the shoulders driven through
      const hipTop = argMin(hips);
      const wind = argMax(shs.slice(0, contact + 1)); // the rear shoulder's furthest back: the end of the load
      return {
        tContact: tOf(contact),
        tElbow: tOf(elbow),
        tSh: tOf(shTop),
        tHip: tOf(hipTop),
        tWind: tOf(wind),
        lead: (midCrossF(shs) - midCrossF(hips)) * DT,
        torso: maxStep(x.rest, x.arc, (a, b) => qAngle(a.tq, b.tq)) * DEG,
        pelvis: maxStep(x.rest, x.arc, (a, b) => qAngle(a.hq, b.hq)) * DEG,
        wrist: maxStep(x.rest, x.arc, (a, b) => dist3(a.wp, b.wp)),
        sh: range(shs) * DEG,
        backSh: (x.after.sh - ctl.after.sh) * DEG,
        backHip: (x.after.hip - ctl.after.hip) * DEG,
        backW: dist3(x.after.wp, ctl.after.wp),
        limited: x.limited,
      };
    };
    const a = stats(r);
    const b = stats(old);
    // the frame of the hit's step (StrikeController resolves contact on the first step at or past STRIKE.hitAt)
    const hitK = Math.ceil(STRIKE.hitAt / DT - 1e-9) - 1;
    const wxMin = Math.min(...r.arc.map((s) => s.wx));
    const atHit = r.arc[hitK]!.wx - wxMin;
    const ms = (s: number): string => `${(s * 1000).toFixed(0)} ms`;
    for (const [k, s] of [['before (arc time-linear)', b], ['after (warped onto the hit)', a]] as const) {
      console.info(`[n4c M1] ${k}: hand across ${ms(s.tContact)}, elbow forward ${ms(s.tElbow)}, shoulders through ${ms(s.tSh)}, hips through ${ms(s.tHip)}, load ends ${ms(s.tWind)}; hips lead (mid-drive) ${ms(s.lead)}; shoulder turn ${s.sh.toFixed(1)} deg; largest per-frame step: chest ${s.torso.toFixed(1)} deg, pelvis ${s.pelvis.toFixed(1)} deg, right wrist ${(s.wrist * 100).toFixed(1)} cm; rate-limited joint frames ${s.limited} (control ${ctl.limited}); 1 s after: shoulders ${s.backSh.toFixed(2)} deg, hips ${s.backHip.toFixed(2)} deg, wrist ${(s.backW * 100).toFixed(1)} cm`);
    }
    console.info(`[n4c M1] on the hit's step (${ms((hitK + 1) * DT)}) the hand is ${(atHit * 100).toFixed(1)} cm short of across`);
    // before: the knockout (0.08 s) landed during the wind-up, contact ~0.37 s
    expect(b.tContact).toBeGreaterThan(0.3);
    // after: the hand across at the hit (within 2 frames; a hand's width short on the hit's step), the trunk through
    expect(Math.abs(a.tContact - STRIKE.hitAt)).toBeLessThanOrEqual(2 * DT + 1e-9);
    expect(Math.abs(a.tElbow - STRIKE.hitAt)).toBeLessThanOrEqual(2 * DT + 1e-9);
    expect(atHit).toBeLessThan(0.12);
    expect(a.tSh).toBeLessThanOrEqual(STRIKE.hitAt + DT + 1e-9);
    expect(a.tWind).toBeLessThan(a.tContact); // a tight load before the drive
    // the hips still first, the shoulders still turned through the same arc
    expect(a.tHip).toBeLessThan(a.tSh);
    expect(a.lead).toBeGreaterThan(0);
    expect(a.sh).toBeGreaterThan(20);
    // no snap: every trunk joint within its limit (the chest's world step within the chain's pelvis 8 + spine 8 +
    // chest 9 rad/s, the pelvis within 8 rad/s), the wrist under 35 cm a frame (the trunk's turn and the arm's sweep,
    // the shoulder and elbow at their 22 / 24 rad/s)
    expect(a.torso).toBeLessThanOrEqual((8 + 8 + 9) * DT * DEG + 1e-6);
    expect(a.pelvis).toBeLessThanOrEqual(8 * DT * DEG + 0.5);
    expect(a.wrist).toBeLessThan(0.35);
    // back to rest
    expect(Math.abs(a.backSh)).toBeLessThan(0.5);
    expect(Math.abs(a.backHip)).toBeLessThan(0.5);
    expect(a.backW).toBeLessThan(0.02);
  });
});

describe('anim-n4c: the Elbow strike section bakes (every slider bakes)', () => {
  it('one rule per slider into STRIKE_BODY; a tuned export writes the amounts and nothing else', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const { BAKE_CATALOGUE_MODULES, BAKE_RULES } = await import('../src/anim/tuneBakeTable');
    const { bakeCatalogue, locate, tuneBake } = await import('../src/anim/tuneBake');
    const F = 'src/anim/strikeBody.ts';
    expect(BAKE_CATALOGUE_MODULES).toContain(F);
    for (const t of STRIKE_SECTION.tunables) {
      const r = BAKE_RULES.filter((x) => x.section === 'strike' && x.id === t.id);
      expect(r, t.id).toHaveLength(1);
      expect(r[0]!.groups).toEqual(t.groups);
      for (const ed of r[0]!.edits) {
        expect(ed.file).toBe(F);
        expect(typeof STRIKE_BODY[ed.path.split('.')[1] as keyof typeof STRIKE_BODY]).toBe('number');
      }
    }
    const src = readFileSync(path.join(__dirname, '..', F), 'utf8');
    const read = (p: string): string | null => (p === F ? src : null);
    const entry = (id: string, value: number) => ({ group: 'strike.elbow', id, label: id, kind: 'mul' as const, unit: 'x', value, default: 1 });
    const exp = { magic: 'night-shift-anim-tune', version: 1, exported: '2026-10-22T20:00:00.000Z', changed: [entry('turn', 1.2), entry('shift', 0.5)], log: [] };
    const r = tuneBake(exp, bakeCatalogue([STRIKE_SECTION]), read, { now: new Date('2026-10-22T21:00:00Z') });
    expect(r.ok, r.error).toBe(true);
    const w = r.writes.find((x) => x.path === F)!;
    const num = (t: string, p: string): number => Number(locate(t, p).text);
    expect(num(w.after, 'STRIKE_BODY.chestDrive')).toBeCloseTo(STRIKE_BODY.chestDrive * 1.2, 4);
    expect(num(w.after, 'STRIKE_BODY.pelWind')).toBeCloseTo(STRIKE_BODY.pelWind * 1.2, 4);
    expect(num(w.after, 'STRIKE_BODY.fwd')).toBeCloseTo(STRIKE_BODY.fwd * 0.5, 4);
    expect(num(w.after, 'STRIKE_BODY.lead')).toBe(STRIKE_BODY.lead);
    expect(w.after.split('\n').length).toBe(w.before.split('\n').length);
  });
});

describe('(J19 S2, R8) the palm strike frees 1.4 s after contact: the hit as before, the follow-through, the settle', () => {
  /** (J19 S2) The strike's arc before R8 (0.68 s, linear either side of the arc's contact at 0.0633 s): the reference. */
  const OLD_DUR = 0.68;
  const oldArc = (t: number): number => {
    const tc = STRIKE.hitAt - STRIKE_ARM_LAG;
    if (t >= OLD_DUR) return 1;
    return t <= tc ? (STRIKE_ARC_CONTACT * t) / tc : STRIKE_ARC_CONTACT + ((1 - STRIKE_ARC_CONTACT) * (t - tc)) / (OLD_DUR - tc);
  };
  /** (J19 S2) The arc StrikeController poses `t` s into the strike. */
  const nowArc = (t: number): number => strikeWarp(strikePhase(t));

  it('the arc in seconds: the wind-up and contact as before R8, the follow-through, the settle\'s curve, free at 1.48 s', () => {
    expect(STRIKE_CONTACT_T).toBeCloseTo(STRIKE.hitAt - STRIKE_ARM_LAG, 15);
    expect(STRIKE_FOLLOW).toBe(0.084);
    expect(STRIKE_SETTLE).toEqual({ start: 2.5, end: 0.6 });
    for (let k = 0; k <= 40; k++) {
      const t = (k / 40) * STRIKE_CONTACT_T;
      expect(strikeWarp(strikePhase(t))).toBeCloseTo(oldArc(t), 12);
      expect(strikeWarp(strikePhase(t))).toBeCloseTo((STRIKE_ARC_CONTACT * t) / STRIKE_CONTACT_T, 12);
    }
    expect(strikeWarp(strikePhase(STRIKE.hitAt))).toBeCloseTo(0.5719, 4);
    expect(strikeArcAt(STRIKE_CONTACT_T + STRIKE_FOLLOW)).toBeCloseTo(0.62, 12);
    const follow = (0.62 - STRIKE_ARC_CONTACT) / STRIKE_FOLLOW;
    const settle0 = (0.38 * STRIKE_SETTLE.start) / (STRIKE_DUR - STRIKE_CONTACT_T - STRIKE_FOLLOW);
    const oldPace = (1 - STRIKE_ARC_CONTACT) / (OLD_DUR - STRIKE_CONTACT_T);
    console.info(`[j19-s2] arc pace after contact: follow-through ${follow.toFixed(4)} / s, settle start ${settle0.toFixed(4)} / s (before R8 ${oldPace.toFixed(4)} / s); at the hit ${strikeWarp(strikePhase(STRIKE.hitAt)).toFixed(4)}`);
    expect(follow).toBeCloseTo(oldPace, 2);
    expect(settle0).toBeCloseTo(follow, 2);
    const tR = STRIKE_CONTACT_T + STRIKE_FOLLOW;
    expect(strikeArcAt(tR + 0.25 * (STRIKE_DUR - tR))).toBeCloseTo(0.80228125, 9);
    expect(strikeArcAt(tR + 0.5 * (STRIKE_DUR - tR))).toBeCloseTo(0.90025, 9);
    expect(strikeArcAt(tR + 0.75 * (STRIKE_DUR - tR))).toBeCloseTo(0.95309375, 9);
    expect(strikeArcAt(0)).toBe(0);
    expect(strikeArcAt(STRIKE_DUR)).toBe(1);
    expect(strikeWarp(1)).toBe(1);
    expect(strikeWarp(-1)).toBe(-1);
    expect(strikeWarp(strikePhase(STRIKE.hitAt + STRIKE.recover))).toBe(1);
    expect(strikeStage(STRIKE.hitAt + STRIKE.recover)).toBe('done');
    expect(strikeStage(STRIKE.hitAt + STRIKE.recover - 1e-6)).toBe('recover');
  });

  it('per 60 Hz frame: always on the move, no freeze after the hit, never faster or jerkier than before R8, settling into the free', () => {
    const frames = (arcAt: (t: number) => number, dur: number): number[] => {
      const a = [0];
      for (let k = 1; k <= Math.ceil(dur / DT); k++) a.push(arcAt(k * DT));
      return a;
    };
    const hitK = Math.ceil(STRIKE.hitAt / DT - 1e-9) - 1;
    const measure = (a: readonly number[]): { still: number; maxDW: number; maxJ: number; settle: number } => {
      let still = 0;
      let runLen = 0;
      let maxDW = 0;
      let maxJ = 0;
      let settle = -1;
      let prevDW = 0;
      for (let k = hitK + 2; k < a.length; k++) {
        const dW = meleeHandW(a[k]!) - meleeHandW(a[k - 1]!);
        const dS = meleeSweep(a[k]!) - meleeSweep(a[k - 1]!);
        runLen = Math.abs(dW) < 1e-3 && Math.abs(dS) < 1e-3 ? runLen + 1 : 0;
        still = Math.max(still, runLen);
        maxDW = Math.max(maxDW, Math.abs(dW));
        if (k >= hitK + 3) maxJ = Math.max(maxJ, Math.abs(dW - prevDW));
        if (settle < 0 && meleeHandW(a[k]!) <= 0.01) settle = k;
        prevDW = dW;
      }
      return { still, maxDW, maxJ, settle };
    };
    const a = frames(nowArc, STRIKE_DUR);
    const o = frames(oldArc, OLD_DUR);
    const mn = measure(a);
    const mo = measure(o);
    const last = Math.ceil(STRIKE_DUR / DT) - 1;
    console.info(`[j19-s2] pure, per 60 Hz frame (re-timed ${a.length - 1} frames / before R8 ${o.length - 1}): still run ${mn.still} / ${mo.still}; largest hand-weight change ${mn.maxDW.toFixed(4)} / ${mo.maxDW.toFixed(4)}; its change ${mn.maxJ.toFixed(5)} / ${mo.maxJ.toFixed(5)}; within 1% of rest at ${(mn.settle * DT).toFixed(2)} s / ${(mo.settle * DT).toFixed(2)} s; last posed frame ${last}: arc ${a[last]!.toFixed(4)}, hand weight ${meleeHandW(a[last]!).toFixed(4)}`);
    for (let k = 1; k < a.length; k++) expect(a[k]!, `frame ${k}`).toBeGreaterThan(a[k - 1]!);
    expect(mn.still).toBeLessThanOrEqual(5);
    expect(mn.maxDW).toBeLessThan(0.03);
    expect(mn.maxDW).toBeLessThanOrEqual(mo.maxDW);
    expect(mn.maxJ).toBeLessThanOrEqual(mo.maxJ);
    expect(mn.settle * DT).toBeGreaterThanOrEqual(STRIKE_DUR - 0.2);
    expect(a[last]!).toBeLessThan(1);
    expect(meleeHandW(a[last]!)).toBeGreaterThan(0);
  });

  it('the whiff (0.38 s, unchanged) ends earlier in the settle: its last posed frame (information, pinned)', () => {
    const kW = Math.ceil(STRIKE_WHIFF_DUR / DT) - 1;
    const w = strikeWarp(strikePhase(kW * DT));
    const wo = oldArc(kW * DT);
    console.info(`[j19-s2] whiff: last posed frame ${kW} (${((kW * DT) * 1000).toFixed(0)} ms): arc ${w.toFixed(4)}, hand weight left ${meleeHandW(w).toFixed(4)}; before R8 arc ${wo.toFixed(4)}, hand weight ${meleeHandW(wo).toFixed(4)}`);
    expect(w).toBeCloseTo(0.7515, 3);
    expect(meleeHandW(w)).toBeCloseTo(0.7238, 3);
  });

  it('the kill blows keep the linear warp bit for bit (arcWarp is the warp before J19 S2)', () => {
    for (const hit of [0.12, 0.3, STRIKE_ARC_CONTACT, 0.69, 0.9, TAKEDOWN_BLOW.hit, GRAB_KILL_BLOW.hit]) {
      for (let k = 0; k <= 1000; k++) {
        const x = k / 1000;
        expect(arcWarp(x, hit)).toBe(x >= 1 ? 1 : x <= hit ? (STRIKE_ARC_CONTACT * x) / hit : STRIKE_ARC_CONTACT + ((1 - STRIKE_ARC_CONTACT) * (x - hit)) / (1 - hit));
      }
    }
    for (const b of [TAKEDOWN_BLOW, GRAB_KILL_BLOW]) {
      for (let k = 0; k <= 100; k++) {
        const u = (k / 100) * KILL_TAIL_END;
        expect(killWarp(u, b)).toBe(arcWarp((u * b.dur) / (b.dur + b.tail), b.hit));
      }
    }
  });

  it('strikeWarp allocates nothing (StrikeController, MoveState and RemoteAvatar call it every frame)', async () => {
    const PH = inputs(2000, (k) => k / 1999);
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) sink[0]! += strikeWarp(PH[k]!);
    }, 0);
    console.info(`[j19-s2] strikeWarp: ${per.toFixed(1)} B a call`);
    expect(per).toBeLessThanOrEqual(HEAP_NUMBER);
  }, 60_000);
});
