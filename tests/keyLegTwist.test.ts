// (tuner-clarity S2) The Keys leg twists: `legd` 9 a side (ankle yaw "+ toes out", shin twist "+ shin turned out"),
// the rig's compose (the twist after the knee delta, the planted fold), the key fields, export and bake tables, and a
// golden captured on pre-S2 code for an old-channels-only edit that stays bit-identical.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KEYED_JOG } from '../src/anim/clips/keyed/jog';
import { applyKeyEdits, KEY_FIELDS, KEY_LEGD, keyGroupId, mirrorDelta, readKeys, type KeyFile } from '../src/anim/tuneKeysFile';
import { KEYS_SECTION, tuneKeysSync } from '../src/anim/tuneKeys';
import { tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';
import { jointsMirror, jointsResetAll } from '../src/anim/tuneJoints';
import { LEGD_OPT } from '../src/anim/legDelta';
import { KD, KEYED_LEGD, KEYED_LEGD_SIDE, LEGD_FIELDS, LEGD_SIGN, mirrorKeyed, newKeyedPose, sampleKeyed } from '../src/anim/keyed';
import type { CharacterRig } from '../src/player/characterRig';
import type { StudioDrive } from '../src/anim/studioDrive';
import type { KeyedClip } from '../src/anim/keyed';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const D2R = Math.PI / 180;

afterEach(() => {
  tuneResetAll();
  tuneKeysSync();
  jointsResetAll();
  jointsMirror(false);
  LEGD_OPT.resolve = true;
  vi.restoreAllMocks();
});

type Built = { rig: CharacterRig; drive: StudioDrive };
type Setup = { make: (name: string, clip: KeyedClip, phase: number) => Built; dispose: () => void };
async function setup(): Promise<Setup> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../src/operators/runtime/playerFigure');
  const { newStudioDrive } = await import('../src/anim/studioDrive');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const made: { dispose(): void }[] = [];
  return {
    make: (name, clip, phase) => {
      const o = operatorRig(scene, (s, h, n) => lib.instance(s, h, n), defaultLook(), name);
      made.push(o.figure, o.rig);
      const drive = newStudioDrive();
      drive.clip = clip;
      drive.held = true;
      drive.phase = phase;
      drive.pace = 3;
      drive.cycle = 0.72;
      o.rig.graph.drive = drive;
      return { rig: o.rig, drive };
    },
    dispose: () => {
      for (const m of made) m.dispose();
      scene.dispose();
    },
  };
}
const POSE = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' as const };
type LegNode = 'hipL' | 'kneeL' | 'ankleL' | 'toeL' | 'hipR' | 'kneeR' | 'ankleR' | 'toeR';
const LEG_NODES: readonly LegNode[] = ['hipL', 'kneeL', 'ankleL', 'toeL', 'hipR', 'kneeR', 'ankleR', 'toeR'];
/** A rig node's world position, every world matrix from the root down recomputed (no cached matrix read). */
function pos(b: Built, n: LegNode): number[] {
  const chain: { computeWorldMatrix(force: boolean): unknown; parent: unknown }[] = [];
  for (let p: unknown = b.rig[n]; p; p = (p as { parent: unknown }).parent) chain.unshift(p as (typeof chain)[number]);
  for (const c of chain) c.computeWorldMatrix(true);
  const v = b.rig[n].getAbsolutePosition();
  return [v.x, v.y, v.z];
}
/** One fresh rig on jog at `phase`, animated 90 frames (held phase), with the given key edits (key index, id, value). */
async function jogAt(phase: number, edits: readonly (readonly [number, string, number])[]): Promise<{ b: Built; S: Setup }> {
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  tuneResetAll();
  for (const [k, id, v] of edits) tuneSet(keyGroupId('jog', k), id, v);
  tuneKeysSync();
  const S = await setup();
  const b = S.make('w', KEYED_JOG, phase);
  for (let k = 0; k < 90; k++) b.rig.animate(1 / 60, POSE);
  return { b, S };
}
/** The leg nodes' local rotations (x y z w each) and the ankles' and toes' world positions, in one flat list. */
function legState(b: Built): number[] {
  const out: number[] = [];
  for (const n of LEG_NODES) out.push(...b.rig[n].rotationQuaternion!.asArray());
  for (const n of ['ankleL', 'toeL', 'ankleR', 'toeR'] as const) out.push(...pos(b, n));
  return out;
}

// The golden: captured on pre-S2 code (legd 7 a side) with `KEYLEG_GOLDEN=<file>` (it writes the lists there). An old-channels-only
// edit on the left leg (every own key: knee + 18, hip yaw + 12) at a planted phase (0: left contact) and a swinging
// phase (0.7: the left foot in the air); every value bit for bit.
const GOLD_EDITS = [0, 1, 2, 3].flatMap((k) => [[k, 'legL_knee', 18] as const, [k, 'legL_hipYaw', 12] as const]);
const GOLD_PHASES = [0, 0.7] as const;
const GOLDEN: Record<string, { contactL: boolean; state: number[] }> = {
  '0': {
    contactL: true,
    state: [
      -0.38973402657758643, -0.11324029105768572, 0.08009267891267088, 0.9104225265570114,
      0.08666638436257162, -3.3163866791641183e-9, 1.969395688194986e-9, 0.9962373874651413,
      0.26611751075779405, 0.08886126250642724, -0.09072906770058757, 0.9555382747649819,
      0, 0, 0, 1,
      0.09593828219042874, -0.05950930077022069, -0.08077450709877201, 0.9903181184068187,
      0.36045710522149266, -9.858951224850365e-10, -7.551343994549597e-10, 0.9327757972641755,
      -0.48344674208356564, 0.06322286328835548, 0.06809331980687819, 0.8704282930141537,
      0, 0, 0, 1,
      -0.0025852809194475412, 0.07200000435113907, 0.47519999742507935, -0.002585281850770116,
      0.006000007502734661, 0.5918399691581726, 0.002585285808891058, 0.12590156495571136,
      -0.4448072910308838, 0.0025852874387055635, 0.05990157276391983, -0.32816728949546814,
    ],
  },
  '0.7': {
    contactL: false,
    state: [
      -0.3490869842595041, 0.003809074329176097, 0.0506564973996911, 0.9357123982633666,
      0.6340240474956675, -3.6119301993764452e-12, -1.469732821557379e-9, 0.7733133339481907,
      -0.3638446822989078, -0.0443367642386563, -0.05193593664913492, 0.9289531532297732,
      0, 0, 0, 1,
      -0.14390135663708764, 0.0789043210944245, -0.07533930407911926, 0.9835601225481794,
      0.16089385128097344, 2.5087829313985566e-9, -2.551156216834549e-9, 0.9869717155605997,
      -0.0579965094554476, -0.07562021086118378, 0.06777633234460984, 0.9931386383368682,
      0, 0, 0, 1,
      -0.002585282316431403, 0.23417386412620544, -0.05082770437002182, -0.0025852820836007595,
      0.1681738644838333, 0.06581229716539383, 0.0025852792896330357, 0.07200004905462265,
      0.04320001229643822, 0.0025852778926491737, 0.006000054068863392, 0.15984000265598297,
    ],
  },
};

describe('tuner-clarity S2: the golden (old channels only, bit-identical through the S2 compose)', () => {
  it('a left knee + hip yaw edit, planted and swinging, matches the pre-S2 rig bit for bit', async () => {
    const got: Record<string, { contactL: boolean; state: number[] }> = {};
    for (const ph of GOLD_PHASES) {
      const r = await jogAt(ph, GOLD_EDITS);
      got[String(ph)] = { contactL: r.b.rig.planner.L.contact, state: legState(r.b) };
      r.S.dispose();
    }
    const capture = process.env.KEYLEG_GOLDEN;
    if (capture) {
      writeFileSync(capture, JSON.stringify(got));
      return;
    }
    expect(got['0']!.contactL).toBe(true);
    expect(got['0.7']!.contactL).toBe(false);
    expect(got).toEqual(GOLDEN);
  });
});

/** Every own key (0-3) of jog: `f` on both legs by `v` (anatomical: the same sense both sides; the mirror half follows). */
const both = (f: string, v: number): [number, string, number][] =>
  [0, 1, 2, 3].flatMap((k) => [[k, `legL_${f}`, v] as [number, string, number], [k, `legR_${f}`, v] as [number, string, number]]);
const dist = (a: number[], b: number[]): number => Math.sqrt((a[0]! - b[0]!) ** 2 + (a[1]! - b[1]!) ** 2 + (a[2]! - b[2]!) ** 2);
/**
 * The foot's heading (rad) in the body's ground plane, + toward her right: the ankle -> toe line projected on the floor,
 * right = the hips' left -> right line (horizontal), forward = right x up.
 */
function heading(b: Built, side: 'L' | 'R'): number {
  const hl = pos(b, 'hipL');
  const hr = pos(b, 'hipR');
  let rx = hr[0]! - hl[0]!;
  let rz = hr[2]! - hl[2]!;
  const rl = Math.sqrt(rx * rx + rz * rz);
  rx /= rl;
  rz /= rl;
  // right x up (0, 1, 0) = (-rz, 0, rx)
  const fx = -rz;
  const fz = rx;
  const a = pos(b, side === 'L' ? 'ankleL' : 'ankleR');
  const t = pos(b, side === 'L' ? 'toeL' : 'toeR');
  const vx = t[0]! - a[0]!;
  const vz = t[2]! - a[2]!;
  return Math.atan2(vx * rx + vz * rz, vx * fx + vz * fz);
}
/** The outward turn (rad) of a foot from heading `h0` to `h1`: the left foot out is toward her left. */
const outTurn = (side: 'L' | 'R', h0: number, h1: number): number => (side === 'L' ? -1 : 1) * (h1 - h0);
/** The angle (deg) of the relative turn from `a` to `b` and the share of its axis along local y. */
function relTurn(a: { x: number; y: number; z: number; w: number }, b: { x: number; y: number; z: number; w: number }): { deg: number; y: number } {
  // a^-1 * b (unit quaternions: the conjugate)
  const ax = -a.x;
  const ay = -a.y;
  const az = -a.z;
  const aw = a.w;
  const x = aw * b.x + ax * b.w + ay * b.z - az * b.y;
  const y = aw * b.y - ax * b.z + ay * b.w + az * b.x;
  const z = aw * b.z + ax * b.y - ay * b.x + az * b.w;
  const w = aw * b.w - ax * b.x - ay * b.y - az * b.z;
  const n = Math.sqrt(x * x + y * y + z * z);
  return { deg: (2 * Math.acos(Math.min(1, Math.abs(w))) * 180) / Math.PI, y: n > 0 ? Math.abs(y) / n : 0 };
}

describe('tuner-clarity S2: the legd channel and the key fields (pure)', () => {
  it('9 a side: the twists appended, the key fields and the sign table in the same order', () => {
    expect(KEYED_LEGD).toBe(18);
    expect(KEYED_LEGD_SIDE).toBe(9);
    expect(KD.ankleYaw).toBe(7);
    expect(KD.shinTwist).toBe(8);
    expect([...LEGD_FIELDS]).toEqual(['hipPitch', 'hipYaw', 'hipRoll', 'knee', 'anklePitch', 'ankleRoll', 'toe', 'ankleYaw', 'shinTwist']);
    expect([...KEY_LEGD]).toEqual([...LEGD_FIELDS]);
    for (const s of LEGD_SIGN) expect(s.length).toBe(KEYED_LEGD_SIDE);
    // the twists mirror like the hip yaw: the left sign is the right's negated
    for (const k of [KD.ankleYaw, KD.shinTwist]) expect(LEGD_SIGN[0]![k]).toBe(-LEGD_SIGN[1]![k]!);
  });

  it('the new slider ids come after every older field (older indexes unchanged), on every keyed clip', () => {
    const ids = KEY_FIELDS.map((f) => f.id);
    const w = ids.indexOf('legR_w');
    expect(ids.slice(w + 1)).toEqual(['legL_ankleYaw', 'legL_shinTwist', 'legR_ankleYaw', 'legR_shinTwist']);
    // the S4 leg fields keep their place: hip pitch .. toe then the FK weight, per side
    const l0 = ids.indexOf('legL_hipPitch');
    expect(ids.slice(l0, l0 + 16)).toEqual(['L', 'R'].flatMap((s) => [...LEGD_FIELDS.slice(0, 7).map((f) => `leg${s}_${f}`), `leg${s}_w`]));
    for (const id of ['legL_ankleYaw', 'legL_shinTwist', 'legR_ankleYaw', 'legR_shinTwist']) {
      const f = KEY_FIELDS.find((x) => x.id === id)!;
      expect(f.sub).toBe('d');
      expect(f.unit).toBe('deg');
      expect(KEYS_SECTION.byId.get(id)?.groups).toContain(keyGroupId('jog', 0));
    }
    expect(KEY_FIELDS.find((x) => x.id === 'legL_ankleYaw')!.label).toBe('L leg ankleYaw delta (+ toes out; a planted foot stays on its plant)');
    expect(KEY_FIELDS.find((x) => x.id === 'legR_shinTwist')!.label).toBe('R leg shinTwist delta (+ shin turned out; a planted foot stays on its plant)');
    expect(mirrorDelta({ legL_ankleYaw: 7, legR_shinTwist: -3 })).toEqual({ legR_ankleYaw: 7, legL_shinTwist: -3 });
  });

  it('a key edit reaches the sampled channel (key degrees -> rig radians by LEGD_SIGN); the mirror half swaps and negates', () => {
    tuneSet(keyGroupId('jog', 0), 'legL_ankleYaw', 10);
    tuneSet(keyGroupId('jog', 0), 'legL_shinTwist', -6);
    tuneKeysSync();
    const p = newKeyedPose();
    sampleKeyed(KEYED_JOG, 0, 1, p);
    expect(p.hasLegd).toBe(1);
    expect(p.legd[KD.ankleYaw]).toBeCloseTo(LEGD_SIGN[0]![KD.ankleYaw]! * 10 * D2R, 6);
    expect(p.legd[KD.shinTwist]).toBeCloseTo(LEGD_SIGN[0]![KD.shinTwist]! * -6 * D2R, 6);
    for (let c = 0; c < KD.ankleYaw; c++) expect(p.legd[c]).toBe(0);
    // key 0 mirrored at 0.5: the right leg, the same anatomical sense (the right sign)
    sampleKeyed(KEYED_JOG, 0.5, 1, p);
    expect(p.legd[KEYED_LEGD_SIDE + KD.ankleYaw]).toBeCloseTo(LEGD_SIGN[1]![KD.ankleYaw]! * 10 * D2R, 6);
    expect(p.legd[KEYED_LEGD_SIDE + KD.shinTwist]).toBeCloseTo(LEGD_SIGN[1]![KD.shinTwist]! * -6 * D2R, 6);
    // mirrorKeyed: the sides swapped, the twists negated (rig frame)
    sampleKeyed(KEYED_JOG, 0, 1, p);
    const before = [...p.legd];
    mirrorKeyed(p);
    expect(p.legd[KEYED_LEGD_SIDE + KD.ankleYaw]).toBeCloseTo(-before[KD.ankleYaw]!, 9);
    expect(p.legd[KEYED_LEGD_SIDE + KD.shinTwist]).toBeCloseTo(-before[KD.shinTwist]!, 9);
    expect(p.legd[KD.ankleYaw]).toBe(0);
  });

  it('key export writes legL.d.ankleYaw / shinTwist; readKeys reads them back; a file without them reads 0', () => {
    const DIR = path.join(__dirname, '..', 'scripts', 'anim-keys', 'keys');
    const jog = JSON.parse(readFileSync(path.join(DIR, 'jog.json'), 'utf8')) as KeyFile;
    const out = applyKeyEdits(jog, { [keyGroupId('jog', 1)]: { legL_ankleYaw: 9, legL_shinTwist: -4.5, legR_knee: 3 } });
    const k = out.keys[1] as Record<string, Record<string, unknown>>;
    expect(k.legL!.d).toEqual({ ankleYaw: 9, shinTwist: -4.5 });
    expect(k.legR!.d).toEqual({ knee: 3 });
    const read = readKeys(out);
    const iy = KEY_FIELDS.findIndex((f) => f.id === 'legL_ankleYaw');
    const iw = KEY_FIELDS.findIndex((f) => f.id === 'legL_shinTwist');
    const r1 = read.find((r) => r.phase === 0.125)!;
    expect(r1.v[iy]).toBe(9);
    expect(r1.v[iw]).toBe(-4.5);
    for (const r of readKeys(jog)) expect(r.v[iy]! + r.v[iw]!).toBe(0);
  });

  it("key_clip.py's LEGD_FIELDS and LEGD_SIGN match keyed.ts", () => {
    const py = readFileSync(path.join(__dirname, '..', 'scripts', 'anim-keys', 'py', 'key_clip.py'), 'utf8');
    const fm = /^LEGD_FIELDS = \(([^)]*)\)$/m.exec(py);
    expect(fm, 'LEGD_FIELDS line').not.toBeNull();
    const fields = fm![1]!
      .split(',')
      .map((s) => s.trim().replace(/^'(.*)'$/, '$1'))
      .filter((s) => s.length > 0);
    expect(fields).toEqual([...LEGD_FIELDS]);
    const sm = /^LEGD_SIGN = \{'L': \(([^)]*)\), 'R': \(([^)]*)\)\}$/m.exec(py);
    expect(sm, 'LEGD_SIGN line').not.toBeNull();
    const nums = (s: string): number[] => s.split(',').map((x) => Number(x.trim()));
    expect(nums(sm![1]!)).toEqual([...LEGD_SIGN[0]!]);
    expect(nums(sm![2]!)).toEqual([...LEGD_SIGN[1]!]);
  });
});

describe('tuner-clarity S2: the rig (ankle yaw and shin twist)', () => {
  type Side = 'L' | 'R';
  const SW = { L: 0.7, R: 0.2 } as const; // the foot in mid-swing (the other planted)
  const PL = { L: 0, R: 0.5 } as const; // the foot planted
  const ank = (s: Side): 'ankleL' | 'ankleR' => (s === 'L' ? 'ankleL' : 'ankleR');
  const kne = (s: Side): 'kneeL' | 'kneeR' => (s === 'L' ? 'kneeL' : 'kneeR');
  const slide = (b: Built, s: Side): number => (s === 'L' ? b.rig.footSlide.l : b.rig.footSlide.r);

  it('ankle yaw on a swinging foot: the ankle turns about its own y by the delta, the toes out on both sides, the ankle point fixed', async () => {
    for (const s of ['L', 'R'] as const) {
      const plain = await jogAt(SW[s], []);
      expect(plain.b.rig.planner[s].contact).toBe(false);
      const q0 = plain.b.rig[ank(s)].rotationQuaternion!.clone();
      const h0 = heading(plain.b, s);
      const a0 = pos(plain.b, ank(s));
      plain.S.dispose();
      const t = await jogAt(SW[s], both('ankleYaw', 15));
      const r = relTurn(q0, t.b.rig[ank(s)].rotationQuaternion!);
      const turn = outTurn(s, h0, heading(t.b, s)) / D2R;
      console.info(`S2 swing ankle yaw ${s} +15: ankle turned ${r.deg.toFixed(3)} deg (axis along y ${r.y.toFixed(5)}), toes out ${turn.toFixed(2)} deg`);
      expect(r.deg).toBeCloseTo(15, 1);
      expect(r.y).toBeGreaterThan(0.999);
      expect(turn).toBeGreaterThan(10);
      expect(turn).toBeLessThan(20);
      expect(dist(pos(t.b, ank(s)), a0)).toBeLessThan(1e-3);
      t.S.dispose();
    }
  });

  it('ankle yaw on a planted foot: the ankle stays within 1 mm of its plant while the toes turn out (both sides)', async () => {
    for (const s of ['L', 'R'] as const) {
      const plain = await jogAt(PL[s], []);
      expect(plain.b.rig.planner[s].contact).toBe(true);
      const a0 = pos(plain.b, ank(s));
      const h0 = heading(plain.b, s);
      plain.S.dispose();
      const t = await jogAt(PL[s], both('ankleYaw', 15));
      const err = dist(pos(t.b, ank(s)), a0) * 1000;
      const turn = outTurn(s, h0, heading(t.b, s)) / D2R;
      console.info(`S2 planted ankle yaw ${s} +15: ankle off its plant ${err.toFixed(4)} mm, toes out ${turn.toFixed(2)} deg, footSlide ${slide(t.b, s).toFixed(4)} cm`);
      expect(err).toBeLessThan(1);
      expect(turn).toBeGreaterThan(10);
      expect(slide(t.b, s)).toBeLessThan(0.1);
      t.S.dispose();
    }
  });

  it('shin twist on a bent swinging leg turns about the shin: the ankle point stays within 1 mm, the toes turn out', async () => {
    for (const s of ['L', 'R'] as const) {
      // bent: the knee + 30 on top of the swing's own bend
      const plain = await jogAt(SW[s], both('knee', 30));
      expect(plain.b.rig.planner[s].contact).toBe(false);
      const a0 = pos(plain.b, ank(s));
      const k0 = plain.b.rig[kne(s)].rotationQuaternion!.clone();
      const h0 = heading(plain.b, s);
      plain.S.dispose();
      const t = await jogAt(SW[s], [...both('knee', 30), ...both('shinTwist', 20)]);
      const err = dist(pos(t.b, ank(s)), a0) * 1000;
      const turn = outTurn(s, h0, heading(t.b, s)) / D2R;
      // the knee's local turn is Ry(twist) after the knee delta (about the bone)
      const r = relTurn(k0, t.b.rig[kne(s)].rotationQuaternion!);
      console.info(`S2 swing shin twist ${s} +20 (knee +30): ankle moved ${err.toFixed(4)} mm, knee turned ${r.deg.toFixed(3)} deg (axis along y ${r.y.toFixed(5)}), toes out ${turn.toFixed(2)} deg`);
      expect(err).toBeLessThan(1);
      expect(r.deg).toBeCloseTo(20, 1);
      expect(r.y).toBeGreaterThan(0.999);
      expect(turn).toBeGreaterThan(5);
      t.S.dispose();
    }
  });

  it('shin twist on a planted leg folds into the foot: the ankle stays on its plant, the toes turn out (both sides)', async () => {
    const { Quaternion } = await import('../src/core/babylon');
    for (const s of ['L', 'R'] as const) {
      const plain = await jogAt(PL[s], []);
      const a0 = pos(plain.b, ank(s));
      const h0 = heading(plain.b, s);
      const f0 = plain.b.rig[ank(s)].absoluteRotationQuaternion.clone();
      plain.S.dispose();
      const t = await jogAt(PL[s], both('shinTwist', 15));
      const a1 = pos(t.b, ank(s));
      const err = dist(a1, a0) * 1000;
      const turn = outTurn(s, h0, heading(t.b, s)) / D2R;
      // the foot's world turn: 15 deg about the shin (the knee -> ankle line)
      const k1 = pos(t.b, kne(s));
      const w = t.b.rig[ank(s)].absoluteRotationQuaternion.multiply(Quaternion.Inverse(f0));
      const wn = Math.sqrt(w.x * w.x + w.y * w.y + w.z * w.z);
      const sx = a1[0]! - k1[0]!;
      const sy = a1[1]! - k1[1]!;
      const sz = a1[2]! - k1[2]!;
      const along = Math.abs(w.x * sx + w.y * sy + w.z * sz) / (wn * Math.sqrt(sx * sx + sy * sy + sz * sz));
      const deg = (2 * Math.acos(Math.min(1, Math.abs(w.w))) * 180) / Math.PI;
      console.info(`S2 planted shin twist ${s} +15: ankle off its plant ${err.toFixed(4)} mm, foot turned ${deg.toFixed(3)} deg (axis along the shin ${along.toFixed(5)}), toes out on the floor ${turn.toFixed(2)} deg (the shin leans), footSlide ${slide(t.b, s).toFixed(4)} cm`);
      expect(err).toBeLessThan(1);
      expect(deg).toBeCloseTo(15, 1);
      expect(along).toBeGreaterThan(0.99);
      expect(turn).toBeGreaterThan(5);
      expect(slide(t.b, s)).toBeLessThan(0.1);
      t.S.dispose();
    }
  });

  it('a side with zero deltas stays bit-identical (the left foot and shin twisted, the right leg untouched)', async () => {
    // legState: 8 quaternions (hipL kneeL ankleL toeL hipR kneeR ankleR toeR) then ankleL toeL ankleR toeR positions
    const right = (st: number[]): number[] => [...st.slice(16, 32), ...st.slice(38, 44)];
    const plain = await jogAt(0.2, []);
    const rP = right(legState(plain.b));
    const lP = legState(plain.b).slice(0, 16);
    plain.S.dispose();
    // the left leg's own keys only: at 0.2 the right leg reads its own keys' (untouched) values
    const t = await jogAt(0.2, [0, 1, 2, 3].flatMap((k) => [[k, 'legL_ankleYaw', 12] as const, [k, 'legL_shinTwist', -8] as const]));
    const st = legState(t.b);
    expect(right(st)).toEqual(rP);
    expect(st.slice(0, 16)).not.toEqual(lP);
    expect(t.b.rig.footSlide.r).toBe(0);
    t.S.dispose();
  });
});
