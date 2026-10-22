// (anim-natural N4c, AUDIT row 49) The elbow strike driven from the hips and trunk, on the real rig maths (NullEngine):
// the shoulder line's turn through the arc, the hips leading the shoulders, the head on the target, back to rest; the
// pure layer's shape and the tuner section.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RigPose } from '../src/player/characterRig';
import { STRIKE_BODY, STRIKE_SECTION, newStrikeBody, strikeBodyAt } from '../src/anim/strikeBody';
import { STRIKE_DUR, strikePhase } from '../src/game/elbowStrike';
import { TUNE_FLAGS } from '../src/anim/tuneRegistry';

const DT = 1 / 60;
const DEG = 180 / Math.PI;

/** `wz`: the right wrist ahead of the chest (m, the chest's frame); `wx`: across it (+ right). */
type Sample = { ph: number; sh: number; hip: number; head: number; pelX: number; pelZ: number; wz: number; wx: number };

/** Strike on a standing holstered rig: `wren` a Wren rig (tuneRows), else a plain carrier rig (the guards' / old path);
 *  `strike` false: the same frames standing (the control: the idle's own breathing, sway and head scan). */
async function strikeRun(wren: boolean, strike = true): Promise<{ rest: Sample; arc: Sample[]; after: Sample; limited: number }> {
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
  const sample = (ph: number): Sample => {
    settle();
    Vector3.TransformNormalToRef(new Vector3(0, 0, 1), rig.headNode.getWorldMatrix(), fwd);
    const hp = rig.hips.position;
    rig.torso.getWorldMatrix().invertToRef(inv);
    Vector3.TransformCoordinatesToRef(rig.wristR.getAbsolutePosition(), inv, wr);
    return { ph, sh: yawOf(rig.shoulderL, rig.shoulderR), hip: yawOf(rig.hipL, rig.hipR), head: Math.atan2(fwd.x, fwd.z), pelX: hp.x, pelZ: hp.z, wz: wr.z, wx: wr.x };
  };
  const pose: RigPose = { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing', melee: -1 };
  rig.root.position.set(0, 0, 0);
  for (let k = 0; k < 120; k++) rig.animate(DT, pose);
  const rest = sample(-1);
  const arc: Sample[] = [];
  const limited0 = rig.limited;
  const n = Math.ceil(STRIKE_DUR / DT);
  for (let k = 1; k <= n; k++) {
    const ph = strikePhase(k * DT);
    pose.melee = strike ? ph : -1;
    rig.animate(DT, pose);
    arc.push(sample(ph));
  }
  pose.melee = -1;
  for (let k = 0; k < 60; k++) rig.animate(DT, pose);
  const after = sample(-1);
  return { rest, arc, after, limited: rig.limited - limited0 };
}

/** The strike run less the control run, frame by frame (the idle's own motion cancels). */
const minus = (a: readonly Sample[], b: readonly Sample[], f: (s: Sample) => number): number[] => a.map((s, i) => f(s) - f(b[i]!));
/** The first frame a descending series crosses the middle of its range (the drive's mid-point). */
const midCross = (a: readonly number[]): number => {
  const mid = (Math.max(...a) + Math.min(...a)) / 2;
  const top = a.indexOf(Math.max(...a));
  for (let k = top; k < a.length; k++) if (a[k]! <= mid) return k;
  return -1;
};
const range = (a: readonly number[]): number => Math.max(...a) - Math.min(...a);

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
    const before = await strikeRun(false);
    const beforeCtl = await strikeRun(false, false);
    const r = await strikeRun(true);
    const ctl = await strikeRun(true, false);
    const shs = minus(r.arc, ctl.arc, (s) => s.sh);
    const hips = minus(r.arc, ctl.arc, (s) => s.hip);
    const shB = range(minus(before.arc, beforeCtl.arc, (s) => s.sh)) * DEG;
    const sh = range(shs) * DEG;
    const hip = range(hips) * DEG;
    const hipAt = midCross(hips);
    const shAt = midCross(shs);
    const head = Math.max(...minus(r.arc, ctl.arc, (s) => s.head).map(Math.abs)) * DEG;
    const fwd = Math.max(...minus(r.arc, ctl.arc, (s) => s.pelZ));
    const backSh = (r.after.sh - ctl.after.sh) * DEG;
    const backHip = (r.after.hip - ctl.after.hip) * DEG;
    const contact = r.arc.reduce((a, s) => (Math.abs(s.ph - 0.56) < Math.abs(a.ph - 0.56) ? s : a));
    const wzMin = Math.min(...r.arc.map((s) => s.wz));
    const wzMinB = Math.min(...before.arc.map((s) => s.wz));
    console.info(`[n4c strike] right wrist (chest frame): nearest the chest ${(wzMin * 100).toFixed(1)} cm ahead (old path ${(wzMinB * 100).toFixed(1)}); at contact ${(contact.wz * 100).toFixed(1)} cm ahead, ${(contact.wx * 100).toFixed(1)} cm across (old path at contact ${(before.arc.reduce((a, s) => (Math.abs(s.ph - 0.56) < Math.abs(a.ph - 0.56) ? s : a)).wz * 100).toFixed(1)} cm ahead)`);
    console.info(`[n4c strike] shoulder turn over the arc: plain carrier rig (the old path) ${shB.toFixed(1)} deg, Wren ${sh.toFixed(1)} deg; hips ${hip.toFixed(1)} deg; mid-drive: hips frame ${hipAt}, shoulders ${shAt}; head off target max ${head.toFixed(1)} deg; pelvis forward ${(fwd * 100).toFixed(1)} cm; rate-limited joint frames ${r.limited} (control ${ctl.limited}, old path ${before.limited}); 1 s after: shoulders ${backSh.toFixed(2)} deg, hips ${backHip.toFixed(2)} deg`);
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
