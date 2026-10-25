// (anim-skeleton S3a, docs/archive/anim-skeleton/PLAN.md S3) The clip format's optional clavicle, finger and FK leg channels:
// sampled, mixed, mirrored and cleared like the T1a channels (identity / 0 when absent), the rig applying them (a shrug
// moves the shoulder, a curl the fingers, a weighted FK leg the hip / knee, weight 0 the IK leg exactly), the build
// emitter writing them only when the bake has them (the 28 shipped modules re-emitted byte for byte), no allocation.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  clearKeyedArms, KEYED_CLAV, KEYED_FING, KEYED_LEG, KEYED_LEG_SIDE, keyedClip, KL, mirrorKeyed, mixKeyed, newKeyedPose,
  sampleKeyed, type KeyedClip, type KeyedClipDef,
} from '../src/anim/keyed';
import { KEYED_IDLE } from '../src/anim/clips/keyed/idle';
import { FING_L, FING_R } from '../src/anim/fingers';
import { RIG_JOINTS, TRS } from '../src/operators/runtime/pose';
import type { CharacterRig } from '../src/player/characterRig';
import type { TransformNode, Vector3 as V3 } from '../src/core/babylon';
import type { StudioDrive } from '../src/anim/studioDrive';
// @ts-expect-error plain .mjs build script without types
import { clipSource } from '../scripts/anim-keys/build.mjs';
import { bytesPerCall, HEAP_NUMBER, inputs } from './helpers/allocPerCall';

const emit = clipSource as (name: string, clip: Record<string, unknown>) => string;

/** A quaternion (x, y, z, w) turning `a` rad about the unit axis (x, y, z). */
const axq = (x: number, y: number, z: number, a: number): number[] => [x * Math.sin(a / 2), y * Math.sin(a / 2), z * Math.sin(a / 2), Math.cos(a / 2)];
const ID = [0, 0, 0, 1];

/** Two frames of the idle (trunk, pelvis and free arms) with optional per-frame channel rows (the same each frame). */
function testDef(ch: { clav?: number[]; fing?: number[]; leg?: number[] } = {}, legB?: number[]): KeyedClipDef {
  const two = (a: Float32Array, n: number): number[] => Array.from(a.subarray(0, 2 * n));
  const def: KeyedClipDef = {
    name: 'skeleton_test_synth',
    frames: 2,
    duty: KEYED_IDLE.duty,
    liftH: KEYED_IDLE.liftH,
    kneeOut: KEYED_IDLE.kneeOut,
    half: KEYED_IDLE.half,
    pel: two(KEYED_IDLE.pel, 3),
    q: two(KEYED_IDLE.q, 16),
    arm: two(KEYED_IDLE.arm, 12),
  };
  if (ch.clav) def.clav = [...ch.clav, ...ch.clav];
  if (ch.fing) def.fing = [...ch.fing, ...ch.fing];
  if (ch.leg) def.leg = [...ch.leg, ...(legB ?? ch.leg)];
  return def;
}

/** One leg side's 11 values. */
const legSide = (hip: number[], knee: number, ankle: number[], toe: number, w: number): number[] => [...hip, knee, ...ankle, toe, w];
const restLeg = legSide(ID, 0, ID, 0, 0);

const SHRUG_R = axq(0, 0, 1, (20 * Math.PI) / 180); // roll +20 deg on the right: the shoulder lifts (clavicle.ts)
const CLAV = [...ID, ...SHRUG_R];
const FING = new Array<number>(KEYED_FING).fill(0);
FING[FING_R + 1 * 2] = 0.3; // right index curl
FING[FING_L + 4 * 2 + 1] = -0.4; // left little spread
const HIP_R = axq(1, 0, 0, -0.6); // the thigh swung forward
const ANKLE_R = axq(1, 0, 0, 0.2);
const LEG_KICK = [...restLeg, ...legSide(HIP_R, 1.0, ANKLE_R, 0.25, 1)];

describe('anim-skeleton S3a: the clip channels (pure)', () => {
  it('absent channels sample identity / 0 with their flags off; present ones sample as keyed', () => {
    const p = newKeyedPose();
    sampleKeyed(keyedClip(testDef()), 0.3, 1, p);
    expect([p.hasClav, p.hasFing, p.hasLeg]).toEqual([0, 0, 0]);
    expect([...p.clav]).toEqual([...ID, ...ID]);
    expect([...p.fing]).toEqual(new Array(KEYED_FING).fill(0));
    expect([...p.leg]).toEqual([...restLeg, ...restLeg]);
    const c = keyedClip(testDef({ clav: CLAV, fing: FING, leg: LEG_KICK }));
    expect(c.clav).not.toBeNull();
    sampleKeyed(c, 0.3, 1, p);
    expect([p.hasClav, p.hasFing, p.hasLeg]).toEqual([1, 1, 1]);
    p.clav.forEach((v, i) => expect(v).toBeCloseTo(CLAV[i]!, 6));
    p.fing.forEach((v, i) => expect(v).toBeCloseTo(FING[i]!, 6));
    p.leg.forEach((v, i) => expect(v).toBeCloseTo(LEG_KICK[i]!, 6));
    // every shipped clip keys none of them (S3b: but the studio-only skeleton_test, all three)
    for (const f of readdirSync('src/anim/clips/keyed')) {
      const src = readFileSync(`src/anim/clips/keyed/${f}`, 'utf8');
      if (f === 'skeleton_test.ts') expect(src.match(/^ {2}(clav|fing|leg):/gm)).toHaveLength(3);
      else expect(src).not.toMatch(/^ {2}(clav|fing|leg):/m);
    }
  });

  it('a wrong channel length throws; the FK weight lerps between frames but is not scaled by amp', () => {
    expect(() => keyedClip({ ...testDef(), leg: [1, 2, 3] })).toThrow(/leg has 3 values/);
    const lo = [...restLeg, ...legSide(HIP_R, 1.0, ANKLE_R, 0.2, 0)];
    const hi = [...restLeg, ...legSide(HIP_R, 0.4, ANKLE_R, 0.2, 1)];
    const c = keyedClip(testDef({ leg: lo }, hi));
    const p = newKeyedPose();
    sampleKeyed(c, 0.25, 1, p); // half way frame 0 -> 1
    expect(p.leg[KEYED_LEG_SIDE + KL.w]).toBeCloseTo(0.5, 6);
    expect(p.leg[KEYED_LEG_SIDE + KL.knee]).toBeCloseTo(0.7, 6);
    sampleKeyed(c, 0.5, 0, p); // amp 0: the mean pose, but frame 1's weight
    expect(p.leg[KEYED_LEG_SIDE + KL.knee]).toBeCloseTo(0.7, 6);
    expect(p.leg[KEYED_LEG_SIDE + KL.w]).toBeCloseTo(1, 6);
  });

  it('mix: clavicles and fingers go with the arm channels (kept from a without edits); legs always, one-sided legs keep their pose and fade their weight', () => {
    const a = sampleKeyed(keyedClip(testDef({ clav: CLAV, fing: FING, leg: LEG_KICK })), 0, 1, newKeyedPose());
    const b = sampleKeyed(keyedClip(testDef()), 0, 1, newKeyedPose());
    const o = mixKeyed(a, b, 0.25, newKeyedPose());
    expect([o.hasClav, o.hasFing, o.hasLeg]).toEqual([1, 1, 1]);
    expect(o.fing[FING_R + 2]).toBeCloseTo(0.3 * 0.75, 6);
    expect(o.clav[6]).toBeGreaterThan(0); // the right clavicle part way back to identity
    expect(o.clav[6]).toBeLessThan(SHRUG_R[2]!);
    for (let i = 0; i < KEYED_LEG; i++) {
      if (i === KL.w || i === KEYED_LEG_SIDE + KL.w) continue;
      expect(o.leg[i]).toBeCloseTo(a.leg[i]!, 12);
    }
    expect(o.leg[KEYED_LEG_SIDE + KL.w]).toBeCloseTo(0.75, 12);
    const r = mixKeyed(b, a, 0.25, newKeyedPose());
    expect(r.leg[KEYED_LEG_SIDE + KL.knee]).toBe(a.leg[KEYED_LEG_SIDE + KL.knee]);
    expect(r.leg[KEYED_LEG_SIDE + KL.w]).toBeCloseTo(0.25, 12);
    const n = mixKeyed(b, a, 0.5, newKeyedPose(), false);
    expect([n.hasClav, n.hasFing, n.hasLeg]).toEqual([0, 0, 1]);
    expect([...n.fing]).toEqual([...b.fing]);
    // the drawn set's cleared arms: no clavicles or fingers; the legs stay
    const c = clearKeyedArms(sampleKeyed(keyedClip(testDef({ clav: CLAV, fing: FING, leg: LEG_KICK })), 0, 1, newKeyedPose()));
    expect([c.hasClav, c.hasFing, c.hasLeg]).toEqual([0, 0, 1]);
    expect([...c.clav]).toEqual([...ID, ...ID]);
    expect(c.fing.every((v) => v === 0)).toBe(true);
  });

  it('mirror swaps the sides: clavicles and legs reflected (y, z negated), fingers swapped, knee / toe / weight kept; twice is the pose', () => {
    const p = sampleKeyed(keyedClip(testDef({ clav: CLAV, fing: FING, leg: LEG_KICK })), 0, 1, newKeyedPose());
    const before = { clav: [...p.clav], fing: [...p.fing], leg: [...p.leg] };
    mirrorKeyed(p);
    expect(p.clav[0]).toBeCloseTo(SHRUG_R[0]!, 6);
    expect(p.clav[2]).toBeCloseTo(-SHRUG_R[2]!, 6); // the left now shrugs (roll negated)
    expect(p.clav[6]).toBeCloseTo(0, 12);
    expect(p.fing[FING_L + 2]).toBeCloseTo(0.3, 6);
    expect(p.fing[FING_R + 4 * 2 + 1]).toBeCloseTo(-0.4, 6);
    expect(p.leg[KL.knee]).toBeCloseTo(1, 6);
    expect(p.leg[KL.w]).toBe(1);
    expect(p.leg[KL.hip]).toBeCloseTo(HIP_R[0]!, 6); // a pitch stays
    expect(p.leg[KEYED_LEG_SIDE + KL.w]).toBe(0);
    mirrorKeyed(p);
    expect([...p.clav]).toEqual(before.clav);
    expect([...p.fing]).toEqual(before.fing);
    expect([...p.leg]).toEqual(before.leg);
  });

  it('sampling, mixing and mirroring the new channels never allocate', async () => {
    const c = keyedClip(testDef({ clav: CLAV, fing: FING, leg: LEG_KICK }, [...LEG_KICK].reverse()));
    const a = newKeyedPose();
    const b = newKeyedPose();
    sampleKeyed(c, 0.3, 1, b);
    // gc() + new space per call (tests/helpers/allocPerCall.ts): heapUsed over 100k calls passed only when a GC landed
    // in the window. sampleKeyed leaves two boxed doubles (the phase and the frame fraction, 32 B); one more { x, y, z }
    // a call would read 80 B. Mixing and mirroring leave nothing.
    const PH = inputs(2000, (k) => k * 0.013);
    const sample = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) sampleKeyed(c, PH[k]!, 0.8, a);
    }, 3 * HEAP_NUMBER);
    const mirror = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) mirrorKeyed(b);
    }, HEAP_NUMBER / 2);
    const mix = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) mixKeyed(a, b, 0.3, a);
    }, HEAP_NUMBER / 2);
    console.info(`bytes per call: sampleKeyed ${sample.toFixed(1)}, mirrorKeyed ${mirror.toFixed(1)}, mixKeyed ${mix.toFixed(1)}`);
    expect(Number.isFinite(a.leg[KL.knee]! + a.fing[3]! + a.clav[3]!)).toBe(true);
    expect(sample).toBeLessThanOrEqual(3 * HEAP_NUMBER);
    expect(mirror).toBeLessThanOrEqual(HEAP_NUMBER / 2);
    expect(mix).toBeLessThanOrEqual(HEAP_NUMBER / 2);
  });
});

/** The keyed clip module's text back into key_clip.py's JSON shape (rows per frame). */
function parseModule(src: string): { name: string; clip: Record<string, unknown> } {
  const head = /keys\/(\w+)\.json \(Blender (.*), (\w+)\r?\n\/\/ ([\d.]+) m\)/.exec(src)!;
  const num = (k: string): number => Number(new RegExp(`^ {2}${k}: (-?[\\d.e-]+),`, 'm').exec(src)![1]);
  const frames = num('frames');
  const samples: Record<string, number[]>[] = Array.from({ length: frames }, () => ({}));
  for (const m of src.matchAll(/^ {2}(\w+): \[(.*)\],$/gm)) {
    const v = m[2]!.split(', ').map(Number);
    const per = v.length / frames;
    for (let f = 0; f < frames; f++) samples[f]![m[1]!] = v.slice(f * per, (f + 1) * per);
  }
  return {
    name: head[1]!,
    clip: { blender: head[2], operator: head[3], height: Number(head[4]), frames, duty: num('duty'), liftH: num('liftH'), kneeOut: num('kneeOut'), half: num('half'), samples },
  };
}

describe('anim-skeleton S3a: the build emitter (scripts/anim-keys/build.mjs)', () => {
  it('re-emits every shipped clip module byte for byte (no new channel lines; S3b: skeleton_test with all three)', () => {
    const files = readdirSync('src/anim/clips/keyed').filter((f) => f.endsWith('.ts'));
    expect(files).toHaveLength(29);
    for (const f of files) {
      const src = readFileSync(`src/anim/clips/keyed/${f}`, 'utf8').replace(/\r\n/g, '\n');
      const { name, clip } = parseModule(src);
      expect(emit(name, clip), f).toBe(src);
    }
  });

  it('writes clav, fing and leg lines only when the bake has them, after the T1a channels', () => {
    const row = (n: number, v: number): number[] => new Array<number>(n).fill(v);
    const base = { blender: '5.2.2 LTS', operator: 'wren', height: 1.68, frames: 2, duty: 0.5, liftH: 0.05, kneeOut: 0.1, half: 0.05 };
    const plain = { ...base, samples: [0, 1].map(() => ({ pel: row(3, 0), q: row(16, 0.5), arm: row(12, 0.1) })) };
    const none = emit('synth', plain);
    expect(none).not.toMatch(/^ {2}(clav|fing|leg):/m);
    const all = emit('synth', {
      ...base,
      samples: [0, 1].map(() => ({ pel: row(3, 0), q: row(16, 0.5), arm: row(12, 0.1), sh: row(8, 0.5), clav: row(KEYED_CLAV, 0.5), fing: row(KEYED_FING, 0.123456), leg: row(KEYED_LEG, 0.25) })),
    });
    const lines = all.split('\n');
    const at = (k: string): number => lines.findIndex((l) => l.startsWith(`  ${k}: [`));
    expect(at('sh')).toBeGreaterThan(at('arm'));
    expect(at('clav')).toBeGreaterThan(at('sh'));
    expect(at('fing')).toBeGreaterThan(at('clav'));
    expect(at('leg')).toBeGreaterThan(at('fing'));
    expect(lines[at('fing')]).toBe(`  fing: [${row(KEYED_FING * 2, 0.12346).join(', ')}],`);
    expect(lines[at('leg')]!.split(', ')).toHaveLength(KEYED_LEG * 2);
    // only the new lines (and their comments) differ from the plain module
    const plainSh = emit('synth', { ...base, samples: [0, 1].map(() => ({ pel: row(3, 0), q: row(16, 0.5), arm: row(12, 0.1), sh: row(8, 0.5) })) });
    expect(all.split('\n').filter((l) => !/^ {2}(\/\/ (clavicle|fingers|legs)|clav:|fing:|leg:)/.test(l)).join('\n')).toBe(plainSh);
  });
});

describe('anim-skeleton S3a: the rig applies the channels', () => {
  type Built = { rig: CharacterRig; nodes: TransformNode[]; drive: StudioDrive };

  async function setup(): Promise<{ make: (name: string, clip: KeyedClip) => Built; dispose: () => void }> {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const { operatorRig } = await import('../src/operators/runtime/playerFigure');
    const { rigNodes } = await import('../src/operators/runtime/figure');
    const { newStudioDrive } = await import('../src/anim/studioDrive');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const made: { dispose(): void }[] = [];
    return {
      make: (name, clip) => {
        const o = operatorRig(scene, (s, h, n) => lib.instance(s, h, n), defaultLook(), name);
        made.push(o.figure, o.rig);
        const drive = newStudioDrive();
        drive.clip = clip;
        drive.held = true;
        drive.phase = 0.1;
        o.rig.graph.drive = drive;
        return { rig: o.rig, nodes: rigNodes(o.rig), drive };
      },
      dispose: () => {
        for (const m of made) m.dispose();
        scene.dispose();
      },
    };
  }

  const POSE = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' as const };
  const run = (b: Built[], n: number): void => {
    for (let k = 0; k < n; k++) for (const x of b) x.rig.animate(1 / 60, POSE);
  };
  const trs = (b: Built): number[] => b.nodes.flatMap((n) => [...n.position.asArray(), ...(n.rotationQuaternion?.asArray() ?? n.rotation.asArray())]);

  it('a shrug lifts the shoulder (readRig un-carries it exactly), a curl moves rig.fingers, cleared when the channel goes', async () => {
    const S = await setup();
    const { readRig } = await import('../src/operators/runtime/figure');
    const plain = S.make('p', keyedClip(testDef()));
    const keyed = S.make('k', keyedClip(testDef({ clav: CLAV, fing: FING })));
    run([plain, keyed], 60);
    expect(keyed.rig.keyedWalk).toBe(1);
    const shR = keyed.rig.shoulderR.position;
    expect(shR.y - plain.rig.shoulderR.position.y).toBeGreaterThan(0.02);
    expect(keyed.rig.shoulderL.position.asArray()).toEqual(plain.rig.shoulderL.position.asArray());
    expect(keyed.rig.clavL.rotationQuaternion!.asArray()).toEqual([0, 0, 0, 1]);
    keyed.rig.clavR.rotationQuaternion!.asArray().forEach((v, i) => expect(v).toBeCloseTo(SHRUG_R[i]!, 6));
    // the poser's shoulder: before the carry (the free hand's rest), as the plain rig's
    const buf = new Float64Array(RIG_JOINTS.length * TRS);
    readRig(keyed.nodes, buf);
    const sh = RIG_JOINTS.indexOf('shR') * TRS;
    plain.rig.shoulderR.position.asArray().forEach((v, i) => expect(buf[sh + i]!).toBeCloseTo(v, 9));
    // fingers: the clip's offsets on the grip shape (float32 clip data)
    expect(keyed.rig.fingers[FING_R + 2]! - plain.rig.fingers[FING_R + 2]!).toBeCloseTo(0.3, 6);
    expect(keyed.rig.fingers[FING_L + 9]! - plain.rig.fingers[FING_L + 9]!).toBeCloseTo(-0.4, 6);
    expect(keyed.rig.fingerClip[FING_R + 2]).toBeCloseTo(0.3, 6);
    // mirrored: the left shrugs and the left index curls
    keyed.drive.mirror = true;
    run([plain, keyed], 60);
    expect(keyed.rig.shoulderL.position.y - plain.rig.shoulderL.position.y).toBeGreaterThan(0.02);
    expect(keyed.rig.clavR.rotationQuaternion!.asArray()).toEqual([0, 0, 0, 1]);
    expect(keyed.rig.fingers[FING_L + 2]! - plain.rig.fingers[FING_L + 2]!).toBeCloseTo(0.3, 6);
    // a clip without the channels: the clavicle back at identity, the clip slot cleared
    keyed.drive.clip = plain.drive.clip;
    keyed.drive.mirror = false;
    run([plain, keyed], 60);
    expect(keyed.rig.clavL.rotationQuaternion!.asArray()).toEqual([0, 0, 0, 1]);
    expect([...keyed.rig.fingerClip].every((v) => v === 0)).toBe(true);
    keyed.rig.shoulderR.position.asArray().forEach((v, i) => expect(v).toBeCloseTo(plain.rig.shoulderR.position.asArray()[i]!, 9));
    S.dispose();
  });

  it('an FK leg at weight 1 takes the clip hip / knee / ankle / toe; weight 0 leaves the IK leg bit for bit', async () => {
    const S = await setup();
    const { Vector3 } = await import('../src/core/babylon');
    const plain = S.make('p', keyedClip(testDef()));
    const kick = S.make('k', keyedClip(testDef({ leg: LEG_KICK })));
    const zero = S.make('z', keyedClip(testDef({ leg: [...legSide(HIP_R, 1, ANKLE_R, 0.25, 0), ...legSide(HIP_R, 1, ANKLE_R, 0.25, 0)] })));
    run([plain, kick, zero], 90);
    // weight 0 on both sides: every rig joint as without the channel
    expect(trs(zero)).toEqual(trs(plain));
    // the kicking right leg follows the clip
    const r = kick.rig;
    r.hipR.rotationQuaternion!.asArray().forEach((v, i) => expect(v).toBeCloseTo(HIP_R[i]!, 6));
    r.kneeR.rotationQuaternion!.asArray().forEach((v, i) => expect(v).toBeCloseTo(axq(1, 0, 0, 1.0)[i]!, 6));
    r.ankleR.rotationQuaternion!.asArray().forEach((v, i) => expect(v).toBeCloseTo(ANKLE_R[i]!, 6));
    r.toeR.rotationQuaternion!.asArray().forEach((v, i) => expect(v).toBeCloseTo(axq(1, 0, 0, 0.25)[i]!, 6));
    // in the pelvis frame the knee is ahead of the hip (thigh forward) and the ankle behind the knee (the knee bends)
    const inv = r.hips.getWorldMatrix().clone().invert();
    const p = (n: TransformNode): V3 => Vector3.TransformCoordinates(n.getAbsolutePosition(), inv);
    expect(p(r.kneeR).z - p(r.hipR).z).toBeGreaterThan(0.15);
    expect(p(r.ankleR).z).toBeLessThan(p(r.kneeR).z);
    // the left leg (weight 0) is the IK leg, untouched
    for (const n of ['hipL', 'kneeL', 'ankleL', 'toeL'] as const) expect(r[n].rotationQuaternion!.asArray()).toEqual(plain.rig[n].rotationQuaternion!.asArray());
    // mirrored (fresh rigs, both mirrored: the idle's trunk mirrors too), the left leg kicks and the right is the IK leg
    const plainM = S.make('pm', keyedClip(testDef()));
    const kickM = S.make('km', keyedClip(testDef({ leg: LEG_KICK })));
    plainM.drive.mirror = kickM.drive.mirror = true;
    run([plainM, kickM], 90);
    const m = kickM.rig;
    const inv2 = m.hips.getWorldMatrix().clone().invert();
    const q = (n: TransformNode): V3 => Vector3.TransformCoordinates(n.getAbsolutePosition(), inv2);
    expect(q(m.kneeL).z - q(m.hipL).z).toBeGreaterThan(0.15);
    m.kneeL.rotationQuaternion!.asArray().forEach((v, i) => expect(v).toBeCloseTo(axq(1, 0, 0, 1.0)[i]!, 6));
    for (const n of ['hipR', 'kneeR', 'ankleR', 'toeR'] as const) expect(m[n].rotationQuaternion!.asArray()).toEqual(plainM.rig[n].rotationQuaternion!.asArray());
    S.dispose();
  });
});
