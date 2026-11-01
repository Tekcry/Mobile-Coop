// (anim-skeleton S4) The tuner rows: the clavicle Joints rows, the skeleton Keys fields on every keyed clip (live
// preview through KeyedOffsets), the `legd` leg delta channel and the rig's planted-foot re-solve, `footSlide`, the
// bake's key JSON, an old export loading as identity.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  KD,
  KEYED_LEGD,
  KEYED_LEGD_SIDE,
  keyedClip,
  LEGD_SIGN,
  mirrorKeyed,
  mixKeyed,
  newKeyedPose,
  sampleKeyed,
  type KeyedClipDef,
} from '../src/anim/keyed';
import { KEYED_JOG } from '../src/anim/clips/keyed/jog';
import { KEYED_WALK } from '../src/anim/clips/keyed/walk';
import { FING_R } from '../src/anim/fingers';
import { applyKeyEdits, KEY_FIELDS, keyGroupId, mirrorDelta, readKeys, type KeyFile } from '../src/anim/tuneKeysFile';
import { KEYS_SECTION, tuneKeysSync } from '../src/anim/tuneKeys';
import { TUNE_EXPORT_MAGIC, tuneImport, tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';
import { J, jointsBegin, jointsEnd, jointsGet, jointsLoadFrom, jointsMirror, jointsResetAll, jointsSet } from '../src/anim/tuneJoints';
import { LEGD_OPT, legdContactW, plantKnee } from '../src/anim/legDelta';
import type { CharacterRig } from '../src/player/characterRig';
import type { ChamberDrive } from '../src/anim/chamberDrive';
import type { KeyedClip } from '../src/anim/keyed';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

const D2R = Math.PI / 180;

afterEach(() => {
  tuneResetAll();
  tuneKeysSync();
  jointsResetAll();
  jointsMirror(false);
  LEGD_OPT.resolve = true;
  vi.restoreAllMocks();
});

/** A two-frame synthetic clip with a leg delta channel. */
function legdDef(legd: number[]): KeyedClipDef {
  const row = (n: number, v: number): number[] => Array.from({ length: n }, (_, i) => (i % 4 === 3 ? 1 : v));
  return { name: 'legd_test', frames: 2, duty: 0.6, liftH: 0.1, kneeOut: 0.1, half: 0.08, pel: [0, 0, 0, 0, 0, 0], q: [...row(16, 0), ...row(16, 0)], arm: Array(24).fill(0.1), legd };
}

describe('anim-skeleton S4: the legd channel (pure)', () => {
  // (tuner-clarity S2) 9 a side: the ankle yaw and the shin twist appended
  const A = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, -0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9];
  it('samples between frames, absent = 0 with its flag off, mirror swaps the sides and negates the yaws and rolls', () => {
    const c = keyedClip(legdDef([...A, ...A.map((v) => v * 2)]));
    const p = newKeyedPose();
    sampleKeyed(c, 0.25, 1, p); // half way from frame 0 to frame 1
    expect(p.hasLegd).toBe(1);
    for (let i = 0; i < KEYED_LEGD; i++) expect(p.legd[i]).toBeCloseTo(A[i]! * 1.5, 6);
    sampleKeyed(KEYED_WALK, 0.3, 1, p);
    expect(p.hasLegd).toBe(0);
    expect([...p.legd].every((v) => v === 0)).toBe(true);
    sampleKeyed(c, 0, 1, p);
    const before = [...p.legd];
    mirrorKeyed(p);
    const neg = new Set<number>([KD.hipYaw, KD.hipRoll, KD.ankleRoll, KD.ankleYaw, KD.shinTwist]);
    for (let s = 0; s < 2; s++) for (let k = 0; k < KEYED_LEGD_SIDE; k++) {
      const o = before[(1 - s) * KEYED_LEGD_SIDE + k]!;
      expect(p.legd[s * KEYED_LEGD_SIDE + k]).toBeCloseTo(neg.has(k) ? -o : o, 6);
    }
    mirrorKeyed(p);
    p.legd.forEach((v, i) => expect(v).toBeCloseTo(before[i]!, 9));
    // mix: a pose without the channel fades it
    const q = newKeyedPose();
    sampleKeyed(KEYED_WALK, 0, 1, q);
    mixKeyed(p, q, 0.25, p);
    expect(p.hasLegd).toBe(1);
    p.legd.forEach((v, i) => expect(v).toBeCloseTo(before[i]! * 0.75, 6));
  });

  it('the key signs: mirrored key files swap sides; the left table is the right with the yaws and rolls negated', () => {
    for (let k = 0; k < KEYED_LEGD_SIDE; k++) {
      const neg = k === KD.hipYaw || k === KD.hipRoll || k === KD.ankleRoll || k === KD.ankleYaw || k === KD.shinTwist;
      expect(LEGD_SIGN[0]![k]).toBe(neg ? -LEGD_SIGN[1]![k]! : LEGD_SIGN[1]![k]!);
    }
    expect(mirrorDelta({ legL_knee: 5, handR_indexCurl: 0.4, armL_clavRoll: 3 })).toEqual({ legR_knee: 5, handL_indexCurl: 0.4, armR_clavRoll: 3 });
  });

  it('contact weight: 1 planted, 0 mid-swing, eased at the ends; plantKnee keeps both bone lengths on the raw side', () => {
    expect(legdContactW(true, 0.5)).toBe(1);
    expect(legdContactW(false, 0.5)).toBe(0);
    expect(legdContactW(false, 0)).toBe(1);
    expect(legdContactW(false, 1)).toBe(1);
    expect(legdContactW(false, 0.07)).toBeGreaterThan(0);
    expect(legdContactW(false, 0.07)).toBeLessThan(1);
    const H = { x: 0, y: 1, z: 0 };
    const A = { x: 0, y: 0.2, z: 0.1 };
    const K0 = { x: 0, y: 0.6, z: 0.15 };
    const Kr = { x: 0.2, y: 0.6, z: 0.15 };
    const out = { x: 0, y: 0, z: 0 };
    plantKnee(H, A, K0, Kr, out);
    const len = (a: typeof H, b: typeof H): number => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
    expect(len(out, H)).toBeCloseTo(len(K0, H), 9);
    expect(len(out, A)).toBeCloseTo(len(K0, A), 9);
    expect(out.x).toBeGreaterThan(0.05);
  });

  it('sampling, mixing and mirroring with the leg deltas and the S4 key offsets never allocate', async () => {
    const c = keyedClip(legdDef([...A, ...A]));
    tuneSet(keyGroupId('jog', 0), 'legL_knee', 10);
    tuneSet(keyGroupId('jog', 1), 'armR_clavRoll', 8);
    tuneSet(keyGroupId('jog', 2), 'handR_indexCurl', 0.5);
    tuneKeysSync();
    const a = newKeyedPose();
    const b = newKeyedPose();
    sampleKeyed(KEYED_JOG, 0.3, 1, b);
    // gc() + new space per call (tests/helpers/allocPerCall.ts): heapUsed over 100k calls passed only when a GC landed
    // in the window. A call leaves only boxed doubles: the phase and the frame fraction (32 B), and with the jog key
    // offsets at an amp other than 1 the two arm amplitudes passed on (64 B); one more
    // { x, y, z } a call would read 80 / 112 B.
    const PH = inputs(2000, (k) => k * 0.013);
    const legd = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) sampleKeyed(c, PH[k]!, 0.8, a);
    }, 3 * HEAP_NUMBER);
    const keyed = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) sampleKeyed(KEYED_JOG, PH[k]!, 0.9, b);
    }, 5 * HEAP_NUMBER);
    const mirror = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) mirrorKeyed(b);
    }, HEAP_NUMBER / 2);
    const mix = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) mixKeyed(a, b, 0.3, a);
    }, HEAP_NUMBER / 2);
    console.info(`bytes per call: sampleKeyed legd ${legd.toFixed(1)}, jog with key offsets ${keyed.toFixed(1)}, mirrorKeyed ${mirror.toFixed(1)}, mixKeyed ${mix.toFixed(1)}`);
    expect(Number.isFinite(a.legd[3]! + a.fing[3]! + a.clav[3]!)).toBe(true);
    expect(b.hasClav).toBe(1);
    expect(legd).toBeLessThanOrEqual(3 * HEAP_NUMBER);
    expect(keyed).toBeLessThanOrEqual(5 * HEAP_NUMBER);
    expect(mirror).toBeLessThanOrEqual(HEAP_NUMBER / 2);
    expect(mix).toBeLessThanOrEqual(HEAP_NUMBER / 2);
  });
});

describe('anim-skeleton S4: the Keys fields on every keyed clip', () => {
  it('every clip lists the clavicle, finger and leg delta fields; an edit on jog changes the preview at once, reset = baked', () => {
    for (const s of ['L', 'R']) {
      for (const id of [`arm${s}_clavPitch`, `arm${s}_clavYaw`, `arm${s}_clavRoll`, `hand${s}_thumbCurl`, `hand${s}_littleSpread`, `leg${s}_hipPitch`, `leg${s}_toe`, `leg${s}_w`]) {
        expect(KEY_FIELDS.some((f) => f.id === id), id).toBe(true);
        expect(KEYS_SECTION.byId.get(id)?.groups).toContain(keyGroupId('jog', 0));
      }
    }
    const p = newKeyedPose();
    sampleKeyed(KEYED_JOG, 0, 1, p);
    expect(p.hasLegd + p.hasClav + p.hasFing).toBe(0);
    const base = [...p.q, ...p.arm, ...p.clav, ...p.fing, ...p.legd];
    tuneSet(keyGroupId('jog', 0), 'legL_knee', 20);
    tuneSet(keyGroupId('jog', 0), 'armR_clavRoll', 10);
    tuneSet(keyGroupId('jog', 0), 'handR_indexCurl', 0.5);
    tuneKeysSync();
    sampleKeyed(KEYED_JOG, 0, 1, p);
    expect(p.hasLegd).toBe(1);
    expect(p.legd[KD.knee]).toBeCloseTo(20 * D2R, 6); // jog key 0 is phase 0
    expect(p.hasClav).toBe(1);
    // the right clavicle: roll + 10 (chest frame, right as written)
    expect(p.clav[6]).toBeCloseTo(Math.sin(5 * D2R), 6);
    expect(p.fing[FING_R + 2]).toBeCloseTo(0.5, 6);
    // the mirror (key 0 mirrored at phase 0.5): the right knee, the left clavicle (roll mirrored: -), the left index
    sampleKeyed(KEYED_JOG, 0.5, 1, p);
    expect(p.legd[KEYED_LEGD_SIDE + KD.knee]).toBeCloseTo(20 * D2R, 6);
    expect(p.clav[2]).toBeCloseTo(-Math.sin(5 * D2R), 6);
    tuneResetAll();
    tuneKeysSync();
    expect(KEYED_JOG.keyOff).toBeNull();
    sampleKeyed(KEYED_JOG, 0, 1, p);
    expect([...p.q, ...p.arm, ...p.clav, ...p.fing, ...p.legd]).toEqual(base);
  });

  it('the bake writes the nested fields into the key JSON (readKeys reads them back); untouched fields stay as they were', () => {
    const DIR = path.join(__dirname, '..', 'scripts', 'anim-keys', 'keys');
    const jog = JSON.parse(readFileSync(path.join(DIR, 'jog.json'), 'utf8')) as KeyFile;
    const vals = { [keyGroupId('jog', 1)]: { legL_knee: 12, legR_hipYaw: -4, armL_clavYaw: -6, handL_middleCurl: 0.25, handL_middleSpread: 3 } };
    const out = applyKeyEdits(jog, vals);
    const k = out.keys[1] as Record<string, Record<string, unknown>>;
    expect(k.legL!.d).toEqual({ knee: 12 });
    expect(k.legR!.d).toEqual({ hipYaw: -4 });
    expect(k.armL!.clav).toEqual({ yaw: -6, pitch: 0, roll: 0 });
    expect(k.handL).toEqual({ middle: { curl: 0.25, spread: 3 } });
    expect(out.keys[0]).toEqual(jog.keys[0]);
    expect(applyKeyEdits(jog, {})).toEqual(jog);
    const read = readKeys(out);
    const iKnee = KEY_FIELDS.findIndex((f) => f.id === 'legL_knee');
    expect(read.find((r) => r.phase === 0.125)!.v[iKnee]).toBe(12);
    // the mirrored half (key 1 mirrored at 0.625): the right knee and the right hand
    const iKneeR = KEY_FIELDS.findIndex((f) => f.id === 'legR_knee');
    const iMidR = KEY_FIELDS.findIndex((f) => f.id === 'handR_middleCurl');
    const m = read.find((r) => r.phase === 0.625)!;
    expect(m.v[iKneeR]).toBe(12);
    expect(m.v[iMidR]).toBe(0.25);
  });

  it('an old tuner export (no clavicle rows, no S4 key fields) loads as identity for the new rows', () => {
    const OLD = {
      magic: TUNE_EXPORT_MAGIC,
      version: 2,
      changed: [{ group: keyGroupId('jog', 1), id: 'spine_pitch', value: 5 }, { group: keyGroupId('jog', 2), id: 'armL_elbow', value: 4 }],
      joints: { version: 1, mirror: false, values: { walk: { chest: [3, 0, 0], shoulderR: [0, 0, 6] } } },
    };
    const r = tuneImport(JSON.parse(JSON.stringify(OLD)));
    expect(r.ok).toBe(true);
    jointsLoadFrom(OLD);
    tuneKeysSync();
    expect(jointsGet('walk', J.chest, 0)).toBe(3);
    for (const j of [J.clavicleL, J.clavicleR]) for (const a of [0, 1, 2] as const) expect(jointsGet('walk', j, a)).toBe(0);
    for (const f of KEY_FIELDS.slice(KEY_FIELDS.findIndex((x) => x.id === 'armL_clavPitch'))) expect(KEYS_SECTION.values[keyGroupId('jog', 1)]![f.id]).toBe(0);
    expect(KEYED_JOG.keyOff).not.toBeNull();
    const p = newKeyedPose();
    for (let i = 0; i < 32; i++) {
      sampleKeyed(KEYED_JOG, i / 32, 1, p);
      expect(p.hasLegd + p.hasClav + p.hasFing).toBe(0);
    }
  });
});

describe('anim-skeleton S4: the rig', () => {
  type Built = { rig: CharacterRig; drive: ChamberDrive };
  async function setup(): Promise<{ make: (name: string, clip: KeyedClip, phase: number) => Built; dispose: () => void }> {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const { operatorRig } = await import('../src/operators/runtime/playerFigure');
    const { newChamberDrive } = await import('../src/anim/chamberDrive');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const made: { dispose(): void }[] = [];
    return {
      make: (name, clip, phase) => {
        const o = operatorRig(scene, (s, h, n) => lib.instance(s, h, n), defaultLook(), name);
        made.push(o.figure, o.rig);
        const drive = newChamberDrive();
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
  const run = (b: Built, n: number): void => {
    for (let k = 0; k < n; k++) b.rig.animate(1 / 60, POSE);
  };
  /** A rig node's world position, every world matrix from the root down recomputed (no cached matrix read). */
  const pos = (b: Built, n: 'ankleL' | 'ankleR' | 'kneeL' | 'kneeR' | 'shoulderL' | 'shoulderR'): number[] => {
    const chain: { computeWorldMatrix(force: boolean): unknown; parent: unknown }[] = [];
    for (let p: unknown = b.rig[n]; p; p = (p as { parent: unknown }).parent) chain.unshift(p as (typeof chain)[number]);
    for (const c of chain) c.computeWorldMatrix(true);
    const v = b.rig[n].getAbsolutePosition();
    return [v.x, v.y, v.z];
  };
  const dist = (a: number[], b: number[]): number => Math.sqrt((a[0]! - b[0]!) ** 2 + (a[1]! - b[1]!) ** 2 + (a[2]! - b[2]!) ** 2);
  /** One fresh rig on jog at `phase`, animated 90 frames (held phase), with the given key edits. */
  async function jogAt(phase: number, edits: [number, string, number][]): Promise<{ b: Built; S: Awaited<ReturnType<typeof setup>> }> {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    tuneResetAll();
    for (const [k, id, v] of edits) tuneSet(keyGroupId('jog', k), id, v);
    tuneKeysSync();
    const S = await setup();
    const b = S.make('w', KEYED_JOG, phase);
    run(b, 90);
    return { b, S };
  }

  it("a knee and hip delta on jog's contact key leaves the planted foot on its plant (< 0.5 cm), footSlide ~0; bypassed it slides", async () => {
    const plain = await jogAt(0, []);
    expect(plain.b.rig.planner.L.contact).toBe(true);
    const aP = pos(plain.b, 'ankleL');
    const kP = pos(plain.b, 'kneeL');
    const plainHip = plain.b.rig.hipL.rotationQuaternion!.asArray();
    expect(plain.b.rig.footSlide.l).toBe(0);
    plain.S.dispose();
    const edits: [number, string, number][] = [[0, 'legL_knee', 25], [0, 'legL_hipPitch', 15], [0, 'legL_hipYaw', 20]];
    const tuned = await jogAt(0, edits);
    const err = dist(pos(tuned.b, 'ankleL'), aP) * 100;
    console.info(`S4 planted-foot error (jog key 0, knee 25 / hip pitch 15 / hip yaw 20): ${err.toExponential(2)} cm (float32 world matrices), footSlide ${tuned.b.rig.footSlide.l.toExponential(2)} cm, knee moved ${(dist(pos(tuned.b, "kneeL"), kP) * 100).toFixed(2)} cm`);
    expect(err).toBeLessThan(0.5);
    expect(tuned.b.rig.footSlide.l).toBeLessThan(0.5);
    // the knee did move (the hip yaw turns it out about the hip-ankle line)
    expect(dist(pos(tuned.b, 'kneeL'), kP)).toBeGreaterThan(0.01);
    tuned.S.dispose();
    // continuous at a tiny delta: the planted leg is the planner's leg (no twist jump from the re-solve)
    const tiny = await jogAt(0, [[0, 'legL_hipYaw', 0.01]]);
    expect(dist(pos(tiny.b, 'kneeL'), kP)).toBeLessThan(1e-3);
    const qa = tiny.b.rig.hipL.rotationQuaternion!;
    const qb = plainHip;
    const dq = Math.abs(qa.x * qb[0]! + qa.y * qb[1]! + qa.z * qb[2]! + qa.w * qb[3]!);
    const twistDeg = (2 * Math.acos(Math.min(1, dq)) * 180) / Math.PI;
    console.info(`S4 tiny hip yaw delta: hip turned ${twistDeg.toFixed(4)} deg off the planner's leg`);
    expect(twistDeg).toBeLessThan(0.5);
    tiny.S.dispose();
    // the re-solve bypassed: the raw delta moves the planted foot, and footSlide reads it
    LEGD_OPT.resolve = false;
    const raw = await jogAt(0, edits);
    const errRaw = dist(pos(raw.b, 'ankleL'), aP) * 100;
    console.info(`S4 re-solve bypassed: planted foot moved ${errRaw.toFixed(2)} cm, footSlide ${raw.b.rig.footSlide.l.toFixed(2)} cm`);
    expect(errRaw).toBeGreaterThan(2);
    expect(raw.b.rig.footSlide.l).toBeGreaterThan(2);
    raw.S.dispose();
  });

  it('the swing leg takes the raw delta (the knee turned by it); the planted side and footSlide stay as without it', async () => {
    const { Quaternion } = await import('../src/core/babylon');
    const plain = await jogAt(0.2, []);
    expect(plain.b.rig.planner.R.contact).toBe(false);
    const qP = plain.b.rig.kneeR.rotationQuaternion!.clone();
    const aL = pos(plain.b, 'ankleL');
    plain.S.dispose();
    // every own key of the right leg (the mirrored half is the left leg's): 20 deg at phase 0.2
    const tuned = await jogAt(0.2, [0, 1, 2, 3].map((k) => [k, 'legR_knee', 20] as [number, string, number]));
    const qT = tuned.b.rig.kneeR.rotationQuaternion!;
    const rel = Quaternion.Inverse(qP).multiply(qT);
    const ang = (2 * Math.acos(Math.min(1, Math.abs(rel.w))) * 180) / Math.PI;
    expect(ang).toBeCloseTo(20, 1);
    expect(Math.abs(rel.x) / Math.sqrt(rel.x ** 2 + rel.y ** 2 + rel.z ** 2)).toBeGreaterThan(0.999); // about the hinge
    expect(dist(pos(tuned.b, 'ankleL'), aL)).toBeLessThan(1e-6);
    expect(tuned.b.rig.footSlide.r).toBe(0);
    expect(tuned.b.rig.footSlide.l).toBeLessThan(1e-4);
    tuned.S.dispose();
  });

  it('the clavicle Joints row moves the shoulder (mirror lock: one + shrugs both), identity at 0', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Quaternion } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const names = ['hips', 'torso', 'clavL', 'clavR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'kneeL', 'ankleL'] as const;
    const go = (window: boolean): { q: number[][]; shL: number; shR: number; clR: number[] } => {
      vi.spyOn(Math, 'random').mockReturnValue(0.25);
      const scene = new Scene(new NullEngine());
      const lib = new PartLibrary(scene);
      const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
      const rp = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' as const };
      for (let k = 0; k < 60; k++) {
        if (window) jointsBegin('idle');
        rg.animate(1 / 60, rp);
        jointsEnd();
      }
      const R = rg as unknown as Record<string, { position: { x: number; y: number; z: number }; rotationQuaternion: InstanceType<typeof Quaternion> }>;
      const out = {
        q: names.map((n) => [...R[n]!.rotationQuaternion.asArray(), R[n]!.position.x, R[n]!.position.y, R[n]!.position.z]),
        shL: rg.shoulderL.position.y,
        shR: rg.shoulderR.position.y,
        clR: rg.clavR.rotationQuaternion!.asArray(),
      };
      rg.dispose();
      scene.dispose();
      return out;
    };
    // The reference is the pose inside the tuner window with every delta at 0: since 4.46.0 the Joints base table holds
    // Michael's baked values, which act inside the window, so the window-off pose is no longer the same pose. The
    // clavicle rows have no base values, so at 0 they leave that pose as it is (the S2 identity tests cover the rig
    // with no window at all).
    const base = go(true);
    expect(go(true).q).toEqual(base.q);
    // the right clavicle rolled + 15 (chest frame): the right shoulder lifts, the left stays
    jointsSet('idle', J.clavicleR, 2, 15);
    const up = go(true);
    expect(up.shR - base.shR).toBeGreaterThan(0.005);
    expect(up.shL).toBe(base.shL);
    const want = Quaternion.RotationYawPitchRoll(0, 0, 15 * D2R).asArray();
    up.clR.forEach((v, i) => expect(v).toBeCloseTo(want[i]!, 9));
    // the mirror lock: the left takes -15 and both shrug
    jointsMirror(true);
    jointsSet('idle', J.clavicleR, 2, 15);
    expect(jointsGet('idle', J.clavicleL, 2)).toBe(-15);
    const both = go(true);
    expect(both.shL - base.shL).toBeGreaterThan(0.005);
    expect(both.shR - base.shR).toBeGreaterThan(0.005);
    // back to 0: identity again
    jointsResetAll();
    expect(go(true).q).toEqual(base.q);
  });

  // The whole rig's heap already grows a few MB per 3000 frames before S4 (checker, 2026-10-22: plain walk and jog
  // alike), far above a per-frame leak in the leg stage, so the rig-level comparison was noise. The pure pieces the
  // leg stage runs every frame are measured here instead; keyedLegDeltas itself was read for allocations (none).
  it('the planted-leg solve and the contact weight never allocate', async () => {
    const H = { x: 0.1, y: 0.9, z: 0 };
    const A = { x: 0.12, y: 0.1, z: 0.15 };
    const K0 = { x: 0.11, y: 0.5, z: 0.1 };
    const Kr = { x: 0.13, y: 0.52, z: 0.14 };
    const out = { x: 0, y: 0, z: 0 };
    // inputs precomputed, the result into a typed slot (+= on a captured let boxes a 16-byte HeapNumber an iteration)
    const KZ = inputs(2000, (k) => 0.1 + (k % 50) * 0.002);
    const CW = inputs(2000, (k) => (k % 100) / 100);
    sink[0] = 0;
    // gc() + new space per step (tests/helpers/allocPerCall.ts), not heapUsed (GC timing): one { x, y, z } a step reads 48 B
    const step = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        Kr.z = KZ[k]!;
        plantKnee(H, A, K0, Kr, out);
        sink[0]! += out.x + legdContactW(k % 3 !== 0, CW[k]!);
      }
    }, HEAP_NUMBER / 2);
    console.info(`bytes per step: plantKnee + legdContactW ${step.toFixed(1)}`);
    expect(Number.isFinite(sink[0]!)).toBe(true);
    expect(step).toBeLessThanOrEqual(HEAP_NUMBER / 2);
  });
});
