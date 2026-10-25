// (mixamo-retarget M2, docs/mixamo-retarget/PLAN.md M2) The Mixamo take adapter on synthetic M1 dumps built here (a
// T-pose, a walk-like swing, an on-the-spot idle) exported through a scaled and turned armature exactly as the dump
// format says (world heads; rotations W R W^-1): the game frame (+X right, +Y up, +Z forward, left-handed) comes out the
// same whatever the armature's turn, the rotations reproduce the dump's own heads, a left turn reads as a left turn,
// segments end at child heads, 30 -> 120 fps by slerp, the floor at y = 0, asfamc selfCheck passes, A4 in-place
// detection, and the CMU pipeline (retargetTake, buildSlot with `inPlace`, analyzeTake) runs through the injected
// loader. Plus the CMU regression: the default path equals the injected CMU loader (cached take, else skipped).
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as takeMod from '../scripts/mocap/mixamoTake.mjs';
// @ts-expect-error plain .mjs build script without types
import * as retargetMod from '../scripts/mocap/retarget.mjs';
// @ts-expect-error plain .mjs build script without types
import * as analyzeMod from '../scripts/mocap/analyze.mjs';
// @ts-expect-error plain .mjs build script without types
import * as asfMod from '../scripts/mocap/asfamc.mjs';

type V = number[];
type Q = number[]; // [x, y, z, w]
interface Bone { dir: V; length: number; mixamo: { rot: string; end: string | null; kind: string } }
interface Report {
  framesIn: number; framesOut: number; fpsIn: number; prefix: string; facing: { turnDeg: number; hipToeDeg: number | null; from: string };
  floorCm: number; travelCm: number; inPlace: boolean; fkErrMm: number; still: string[];
  segments: Record<string, { slot: string; mixamo: number; wren: number | null; ratio: number | null }>;
  leg: { mixamo: number; wren: number | null; scale: number | null };
}
interface Take {
  take: string; frames: number; fps: number; inPlace: boolean; travel: number; dead: string[]; zeros: Map<string, number[]>;
  skel: { bones: Map<string, Bone>; parent: Map<string, string>; order: string[]; metres: number };
  pos: Map<string, V[]>; quat: Map<string, Q[]>; report: Report;
}
interface Dump { slug: string; frames: number; fps: number; bones: { name: string; parent: string | null; rest: V }[]; pos: Record<string, number[]>; rot: Record<string, number[]> }
type Rig = { names: string[]; bind: Record<string, V>; leg: number };
const T = takeMod as {
  takeFromDump: (d: Dump, o?: { rig?: Rig | null; floor?: string }) => Take;
  loadMixamoTake: (slug: string, o?: { dir?: string; rig?: Rig | null }) => Take;
  mixamoLoader: (o?: { dir?: string }) => (slug: string) => Take;
  MIXAMO_LICENCE: string;
  IN_PLACE_M: number;
};
interface Slot { format: string; root: number[][]; speed: number | null; cycleDistance: number | null; inPlace?: boolean; source: { licence: string; take: string }; quality: { retargetDirErrDeg: number } }
const RT = retargetMod as {
  wrenRig: () => Rig;
  retargetTake: (rig: Rig, take: string, o?: { load?: (s: string) => unknown }) => { dirErrDeg: number; scaleLeg: number; pel: V[] };
  buildSlot: (rig: Rig, pick: object, choice: object, suffix?: string, takeInfo?: object | null, o?: object) => Slot;
  CMU_LICENCE: string;
};
const AN = analyzeMod as { analyzeTake: (e: object, o?: { load?: (s: string) => unknown }) => { take: string; frames: number; selfCheck: boolean; strikes: unknown[] } };
const ASF = asfMod as { selfCheck: (t: Take) => { ok: boolean; floor: number; lines: string[] }; loadTake: (t: string) => unknown; CACHE: string };

// ---- small quaternion / vector helpers (game and Blender share the maths; only the data differ) ----
const qmul = (a: Q, b: Q): Q => [
  a[3]! * b[0]! + a[0]! * b[3]! + a[1]! * b[2]! - a[2]! * b[1]!,
  a[3]! * b[1]! - a[0]! * b[2]! + a[1]! * b[3]! + a[2]! * b[0]!,
  a[3]! * b[2]! + a[0]! * b[1]! - a[1]! * b[0]! + a[2]! * b[3]!,
  a[3]! * b[3]! - a[0]! * b[0]! - a[1]! * b[1]! - a[2]! * b[2]!,
];
const conj = (q: Q): Q => [-q[0]!, -q[1]!, -q[2]!, q[3]!];
const qax = (ax: V, a: number): Q => { const l = Math.hypot(ax[0]!, ax[1]!, ax[2]!), s = Math.sin(a / 2) / l; return [ax[0]! * s, ax[1]! * s, ax[2]! * s, Math.cos(a / 2)]; };
const rot = (q: Q, v: V): V => { const r = qmul(qmul(q, [v[0]!, v[1]!, v[2]!, 0]), conj(q)); return [r[0]!, r[1]!, r[2]!]; };
const add = (a: V, b: V): V => a.map((x, i) => x + b[i]!);
const sub = (a: V, b: V): V => a.map((x, i) => x - b[i]!);
const len = (a: V): number => Math.hypot(...a);
const norm = (a: V): V => { const l = len(a); return a.map((x) => x / l); };
const qAngle = (a: Q, b: Q): number => 2 * Math.acos(Math.min(1, Math.abs(a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]! + a[3]! * b[3]!)));
const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
const I: Q = [0, 0, 0, 1];

// ---- the synthetic character: Blender canonical world (Z up, facing -Y, its left = +X), standard 65 bones ----
const FING = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
function skeleton(): { order: [string, string | null][]; rest: Record<string, V> } {
  const order: [string, string | null][] = [['Hips', null], ['Spine', 'Hips'], ['Spine1', 'Spine'], ['Spine2', 'Spine1'], ['Neck', 'Spine2'], ['Head', 'Neck'], ['HeadTop_End', 'Head']];
  const rest: Record<string, V> = { Hips: [0, 0, 1], Spine: [0, 0.01, 1.1], Spine1: [0, 0.01, 1.22], Spine2: [0, 0.01, 1.35], Neck: [0, 0, 1.5], Head: [0, -0.01, 1.6], HeadTop_End: [0, -0.01, 1.78] };
  for (const [S, sx] of [['Left', 1], ['Right', -1]] as const) {
    order.push([`${S}Shoulder`, 'Spine2'], [`${S}Arm`, `${S}Shoulder`], [`${S}ForeArm`, `${S}Arm`], [`${S}Hand`, `${S}ForeArm`]);
    rest[`${S}Shoulder`] = [0.06 * sx, 0, 1.45];
    rest[`${S}Arm`] = [0.18 * sx, 0.01, 1.45];
    rest[`${S}ForeArm`] = [0.46 * sx, 0.01, 1.45];
    rest[`${S}Hand`] = [0.71 * sx, 0.01, 1.45];
    FING.forEach((F, fi) => {
      for (let k = 1; k <= 4; k++) {
        order.push([`${S}Hand${F}${k}`, k === 1 ? `${S}Hand` : `${S}Hand${F}${k - 1}`]);
        rest[`${S}Hand${F}${k}`] = F === 'Thumb'
          ? [(0.74 + 0.025 * (k - 1)) * sx, -0.03 - 0.015 * (k - 1), 1.43]
          : [(0.8 - 0.005 * Math.max(0, fi - 2) + 0.03 * (k - 1)) * sx, 0.01 + 0.022 * (fi - 2), 1.45];
      }
    });
    order.push([`${S}UpLeg`, 'Hips'], [`${S}Leg`, `${S}UpLeg`], [`${S}Foot`, `${S}Leg`], [`${S}ToeBase`, `${S}Foot`], [`${S}Toe_End`, `${S}ToeBase`]);
    rest[`${S}UpLeg`] = [0.09 * sx, 0, 0.93];
    rest[`${S}Leg`] = [0.09 * sx, 0, 0.5];
    rest[`${S}Foot`] = [0.09 * sx, 0.02, 0.08];
    rest[`${S}ToeBase`] = [0.09 * sx, -0.11, 0.015];
    rest[`${S}Toe_End`] = [0.09 * sx, -0.19, 0.015];
  }
  return { order, rest };
}
const SK = skeleton();
type Pose = { T: V; L: Record<string, Q> };
type Clip = { n: number; pose: (i: number) => Pose };

const TPOSE: Clip = { n: 10, pose: () => ({ T: [0, 0, 0], L: {} }) };
const WALK: Clip = {
  n: 61,
  pose: (i) => {
    const p = (2 * Math.PI * i) / 30;
    return {
      T: [0, -1.2 * (i / 30), 0.03 * Math.cos(2 * p)],
      L: {
        Hips: qax(Z, 0.06 * Math.sin(p)), Spine1: qax(Z, -0.05 * Math.sin(p)), Neck: qax(X, 0.05 * Math.sin(2 * p)),
        LeftUpLeg: qax(X, 0.45 * Math.sin(p)), RightUpLeg: qax(X, -0.45 * Math.sin(p)),
        LeftLeg: qax(X, 0.1 + 0.3 * (1 + Math.sin(p + 1))), RightLeg: qax(X, 0.1 + 0.3 * (1 - Math.sin(p + 1))),
        LeftFoot: qax(X, -0.2 * Math.sin(p)), RightFoot: qax(X, 0.2 * Math.sin(p)),
        LeftShoulder: qax(Y, 0.05 * Math.sin(p)), LeftArm: qax(add(Y, [0, 0, 0.3 * Math.sin(p)]), 1.2), RightArm: qax(add(Y, [0, 0, 0.3 * Math.sin(p)]), -1.2),
        LeftForeArm: qax(Z, 0.4 + 0.2 * Math.sin(p)), LeftHandIndex1: qax(Y, 0.4 + 0.3 * Math.sin(p)),
      },
    };
  },
};
const IDLE: Clip = {
  n: 61,
  pose: (i) => {
    const p = (2 * Math.PI * i) / 60;
    return {
      T: [0.012 * Math.sin(p), 0.004 * Math.sin(2 * p), 0.005 * Math.cos(p) - 0.005],
      L: { Hips: qax(Y, 0.03 * Math.sin(p)), Spine: qax(X, 0.02 * Math.sin(p)), LeftArm: qax(Y, 1.2), RightArm: qax(Y, -1.2), Head: qax(Z, 0.1 * Math.sin(p)) },
    };
  },
};

/** Canonical FK: rest-relative world rotations Q (parent Q times local L) and heads. */
function fkCanon(pose: Pose): { Q: Record<string, Q>; P: Record<string, V> } {
  const Qw: Record<string, Q> = {}, P: Record<string, V> = {};
  for (const [b, p] of SK.order) {
    const L = pose.L[b] ?? I;
    if (p === null) { Qw[b] = L; P[b] = add(SK.rest[b]!, pose.T); continue; }
    Qw[b] = qmul(Qw[p]!, L);
    P[b] = add(P[p]!, rot(Qw[p]!, sub(SK.rest[b]!, SK.rest[p]!)));
  }
  return { Q: Qw, P };
}

const r5 = (x: number): number => Math.round(x * 1e5) / 1e5;
/**
 * An M1 dump of a clip: the character lives in FBX armature space (Y up, centimetres, facing +Z); the armature object
 * has the importer's X 90 deg turn and 0.01 scale, then `theta` about Z and a move `t`. World heads = W p, world
 * rotations = W_rot R W_rot^-1 (scale removed), quaternions (w, x, y, z) sign-continuous, 5 decimals.
 */
function dumpOf(clip: Clip, { slug = 'synthetic', theta = 0, t = [0, 0, 0], prefix = 'mixamorig:', fps = 30 }: { slug?: string; theta?: number; t?: V; prefix?: string; fps?: number } = {}): Dump {
  const toArm = qax(X, -Math.PI / 2); // canonical world -> armature space (then / 0.01 for centimetres)
  const Wr = qmul(qax(Z, theta), qax(X, Math.PI / 2));
  const s = 0.01;
  const world = (pArm: V): V => add(rot(Wr, pArm.map((x) => x * s)), t);
  const armOf = (pc: V): V => rot(toArm, pc).map((x) => x / s);
  const name = (b: string): string => prefix + b;
  const d: Dump & Record<string, unknown> = {
    version: 1, file: 'Synthetic Clip.fbx', slug, sha256: '0'.repeat(64), fps, frameStart: 1, frameEnd: clip.n, frames: clip.n, armature: 'Armature',
    world: (() => {
      const q = Wr, [x, y, z, w] = [q[0]!, q[1]!, q[2]!, q[3]!];
      const m = [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)].map((v) => v * s);
      return [m[0], m[1], m[2], t[0], m[3], m[4], m[5], t[1], m[6], m[7], m[8], t[2], 0, 0, 0, 1].map((v) => r5(v!));
    })(),
    scale: s,
    bones: SK.order.map(([b, p]) => ({ name: name(b), parent: p === null ? null : name(p), rest: world(armOf(SK.rest[b]!)).map(r5) })),
    pos: {}, rot: {},
  };
  for (const [b] of SK.order) { d.pos[name(b)] = []; d.rot[name(b)] = []; }
  const prev: Record<string, Q> = {};
  for (let i = 0; i < clip.n; i++) {
    const { Q: Qc, P } = fkCanon(clip.pose(i));
    for (const [b] of SK.order) {
      d.pos[name(b)]!.push(...world(armOf(P[b]!)).map(r5));
      const Rarm = qmul(qmul(toArm, Qc[b]!), conj(toArm)); // armature-space rest-relative rotation
      let qw = qmul(qmul(Wr, Rarm), conj(Wr));
      const pq = prev[b];
      if (pq && qw[0]! * pq[0]! + qw[1]! * pq[1]! + qw[2]! * pq[2]! + qw[3]! * pq[3]! < 0) qw = qw.map((x) => -x);
      prev[b] = qw;
      d.rot[name(b)]!.push(r5(qw[3]!), r5(qw[0]!), r5(qw[1]!), r5(qw[2]!));
    }
  }
  return d;
}

/** Canonical (Blender, facing -Y) vector -> game (+X right, +Y up, +Z forward). */
const canonToGame = (v: V): V => [-v[0]!, v[2]!, -v[1]!];
const close = (a: V, b: V, eps: number, what: string): void => { expect(len(sub(a, b)), `${what}: ${a.map((x) => x.toFixed(5))} vs ${b.map((x) => x.toFixed(5))}`).toBeLessThan(eps); };

describe('loadMixamoTake (synthetic M1 dumps)', () => {
  const tpose = T.takeFromDump(dumpOf(TPOSE, { theta: (30 * Math.PI) / 180, t: [1, 2, 0.3] }));

  it('T-pose: segments from child heads in the game frame, 30 -> 120 fps, floor at 0, facing measured', () => {
    expect(tpose.fps).toBe(120);
    expect(tpose.frames).toBe((TPOSE.n - 1) * 4 + 1);
    expect(tpose.report.framesIn).toBe(TPOSE.n);
    expect(tpose.report.facing.turnDeg).toBeCloseTo(30, 1);
    expect(tpose.report.facing.from).toBe('hips+toes');
    expect(tpose.report.prefix).toBe('mixamorig:');
    const gameDir = (s: string): V => { const d = tpose.skel.bones.get(s)!.dir; return [-d[0]!, d[1]!, d[2]!]; };
    const expectSeg = (slot: string, a: string, b: string): void => {
      const want = canonToGame(sub(SK.rest[b]!, SK.rest[a]!));
      expect(tpose.skel.bones.get(slot)!.length, slot).toBeCloseTo(len(want), 4);
      close(gameDir(slot), norm(want), 1e-4, slot);
    };
    expectSeg('lhumerus', 'LeftArm', 'LeftForeArm');
    expectSeg('rradius', 'RightForeArm', 'RightHand');
    expectSeg('lhand', 'LeftHand', 'LeftHandMiddle1');
    expectSeg('lfemur', 'LeftUpLeg', 'LeftLeg');
    expectSeg('ltibia', 'LeftLeg', 'LeftFoot');
    expectSeg('lfoot', 'LeftFoot', 'LeftToeBase');
    expectSeg('ltoes', 'LeftToeBase', 'LeftToe_End');
    expectSeg('upperback', 'Spine1', 'Spine2');
    expectSeg('upperneck', 'Neck', 'Head');
    expectSeg('head', 'Head', 'HeadTop_End');
    expectSeg('lhipjoint', 'Hips', 'LeftUpLeg');
    expectSeg('lindex2', 'LeftHandIndex2', 'LeftHandIndex3');
    // left is -X, up +Y, forward +Z
    close(gameDir('lhumerus'), [-1, 0, 0], 0.05, 'left arm points left');
    close(gameDir('lfemur'), [0, -1, 0], 1e-4, 'thigh points down');
    expect(gameDir('lfoot')[2]!).toBeGreaterThan(0.8);
    // the floor: the lowest foot point (toe base / toe tip, 1.5 cm in the file) at y = 0
    expect(tpose.report.floorCm).toBeCloseTo(1.5 + 30, 1);
    expect(tpose.pos.get('ltoes')![0]![1]).toBeCloseTo(0, 5);
    expect(tpose.pos.get('root')![0]![1]).toBeCloseTo(1 - 0.015, 4);
    const c = ASF.selfCheck(tpose);
    expect(c.ok, c.lines.join('\n')).toBe(true);
    expect(tpose.report.still).toContain('lfemur');
    expect(tpose.dead).toEqual([]);
  });

  it('the game frame does not depend on the armature turn, move or prefix (W R W^-1 through an improper basis change)', () => {
    const a = T.takeFromDump(dumpOf(WALK, { theta: 0, t: [0, 0, 0], prefix: 'mixamorig:' }));
    const b = T.takeFromDump(dumpOf(WALK, { theta: (-117 * Math.PI) / 180, t: [3, -2, 0.5], prefix: 'mixamorig2:' }));
    expect(b.report.prefix).toBe('mixamorig2:');
    expect(b.report.facing.turnDeg).toBeCloseTo(-117, 1);
    const a0 = a.pos.get('root')![0]!, b0 = b.pos.get('root')![0]!;
    for (const slot of ['root', 'lfemur', 'rtoes', 'lhand', 'rradius', 'head', 'lindex3', 'lclavicle']) {
      for (let k = 0; k < a.frames; k += 7) {
        close(sub(b.pos.get(slot)![k]!, b0), sub(a.pos.get(slot)![k]!, a0), 2e-4, `${slot} @${k}`);
        expect(qAngle(a.quat.get(slot)![k]!, b.quat.get(slot)![k]!), `${slot} @${k}`).toBeLessThan(2e-4);
      }
    }
    expect(b.pos.get('root')![0]![1]).toBeCloseTo(a.pos.get('root')![0]![1]!, 4);
  });

  it('the converted rotations rebuild the dump\'s own posed heads, and match the canonical motion', () => {
    const d = dumpOf(WALK, { theta: 0.7, t: [-1, 4, 0] });
    const w = T.takeFromDump(d);
    expect(w.report.fkErrMm).toBeLessThan(0.2);
    // every source frame k (120 fps frame 4k): each slot's rotation maps its rest segment onto the canonical posed one
    for (let i = 0; i < WALK.n; i += 5) {
      const { P } = fkCanon(WALK.pose(i));
      const seg: [string, string, string][] = [['lfemur', 'LeftUpLeg', 'LeftLeg'], ['ltibia', 'LeftLeg', 'LeftFoot'], ['lradius', 'LeftForeArm', 'LeftHand'], ['lindex1', 'LeftHandIndex1', 'LeftHandIndex2'], ['upperback', 'Spine1', 'Spine2'], ['rhumerus', 'RightArm', 'RightForeArm']];
      for (const [slot, a, b] of seg) {
        const bone = w.skel.bones.get(slot)!;
        const posed = rot(w.quat.get(slot)![4 * i]!, [-bone.dir[0]!, bone.dir[1]!, bone.dir[2]!]);
        close(posed, norm(canonToGame(sub(P[b]!, P[a]!))), 1e-3, `${slot} @${i}`); // 0.06 deg: the dump's 5-decimal rounding on a 3 cm finger
      }
    }
    const c = ASF.selfCheck(w);
    expect(c.ok, c.lines.join('\n')).toBe(true);
    expect(Math.abs(c.floor)).toBeLessThan(1e-9);
    // forward walk: the hips travel +Z at 1.2 m/s, no sideways drift
    const h = w.pos.get('root')!;
    expect(h[h.length - 1]![2]! - h[0]![2]!).toBeCloseTo(2.4, 3);
    expect(Math.abs(h[h.length - 1]![0]! - h[0]![0]!)).toBeLessThan(1e-4);
    expect(w.inPlace).toBe(false);
    expect(w.report.travelCm).toBeCloseTo(240, 0);
  });

  it('a turn to the character\'s left reads as a left turn in the game frame (handedness)', () => {
    const left: Clip = { n: 4, pose: () => ({ T: [0, 0, 0], L: { Hips: qax(Z, 0.3) } }) }; // CCW seen from above = toward +X = her left
    const t = T.takeFromDump(dumpOf(left, { theta: 2.1 }));
    const fwd = rot(t.quat.get('root')![0]!, [0, 0, 1]);
    close(fwd, [-Math.sin(0.3), 0, Math.cos(0.3)], 1e-4, 'facing after a left turn');
    // the left foot swings forward-left of the hips: it stays on the -X side
    expect(t.pos.get('lfoot')![0]![0]! - t.pos.get('root')![0]![0]!).toBeLessThan(0);
  });

  it('resamples 30 -> 120 fps: slerp between source frames, the hips path through every source frame', () => {
    const swing: Clip = { n: 5, pose: (i) => ({ T: [0.1 * i, 0, 0], L: { LeftForeArm: qax(Z, 0.24 * i) } }) };
    const t = T.takeFromDump(dumpOf(swing, { theta: 1 }));
    expect(t.frames).toBe(17);
    const q = t.quat.get('lradius')!;
    for (let k = 0; k < t.frames; k++) expect(qAngle(q[0]!, q[k]!), `frame ${k}`).toBeCloseTo(0.06 * k, 4);
    const h = t.pos.get('root')!;
    // canonical +X (her left) -> game -X; linear motion stays linear under Catmull-Rom
    for (let k = 0; k < t.frames; k++) expect(h[k]![0]! - h[0]![0]!).toBeCloseTo(-0.025 * k, 4);
    expect(T.takeFromDump(dumpOf(swing, { fps: 60 })).frames).toBe(9);
  });

  it('detects an on-the-spot clip (A4) and reads dumps from an injected directory', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mixamo-m2-'));
    try {
      writeFileSync(path.join(dir, 'standing_idle.json'), JSON.stringify(dumpOf(IDLE, { slug: 'standing_idle', theta: -0.4 })));
      const idle = T.loadMixamoTake('standing_idle', { dir });
      expect(idle.inPlace).toBe(true);
      expect(idle.travel).toBeLessThan(T.IN_PLACE_M);
      expect(idle.report.travelCm).toBeLessThan(1);
      expect(idle.take).toBe('standing_idle');
      expect(ASF.selfCheck(idle).ok).toBe(true);
      expect(() => T.loadMixamoTake('nope', { dir })).toThrow(/missing .*nope\.json/);
      writeFileSync(path.join(dir, 'other.json'), JSON.stringify(dumpOf(TPOSE, { slug: 'not_other' })));
      expect(() => T.loadMixamoTake('other', { dir })).toThrow(/slug not_other, want other/);
      const broken = dumpOf(TPOSE);
      broken.pos['mixamorig:LeftLeg']!.pop();
      expect(() => T.takeFromDump(broken)).toThrow(/pos\.mixamorig:LeftLeg/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('the CMU pipeline on a Mixamo take (injected loader)', () => {
  const rig = RT.wrenRig();
  const dumps: Record<string, Dump> = { walk: dumpOf(WALK, { slug: 'walk', theta: 0.5 }), idle: dumpOf(IDLE, { slug: 'idle', theta: -2 }) };
  const load = (slug: string): Take => T.takeFromDump(dumps[slug]!, { rig });

  it('reports rest lengths against Wren\'s bind and the leg scale', () => {
    const r = load('walk').report;
    const leg = 0.43 + Math.hypot(0.02, 0.42); // thigh + shin (the ankle sits 2 cm behind the knee)
    expect(r.leg.mixamo).toBeCloseTo(leg, 3);
    expect(r.leg.wren).toBeCloseTo(rig.leg, 3);
    expect(r.leg.scale).toBeCloseTo(rig.leg / leg, 2);
    expect(r.segments.hipL).toMatchObject({ slot: 'lfemur', mixamo: 0.43 });
    expect(r.segments.hipL!.wren).toBeGreaterThan(0.3);
    expect(Object.keys(r.segments).length).toBe(15);
  });

  it('retargetTake aims every Wren segment along the take (direction error under A6\'s 8 deg)', () => {
    const R = RT.retargetTake(rig, 'walk', { load });
    expect(R.dirErrDeg).toBeLessThan(0.5);
    expect(R.scaleLeg).toBeCloseTo(rig.leg / (0.43 + Math.hypot(0.02, 0.42)), 4);
  });

  it('buildSlot { inPlace } keeps an on-the-spot loop\'s root fixed, with the Mixamo source line', () => {
    const n = load('idle').frames;
    const pick = { slot: 'idle', kind: 'loop' }, choice = { take: 'idle', segment: [0, n - 1], loop: true };
    const s = RT.buildSlot(rig, pick, choice, '', null, { load, licence: T.MIXAMO_LICENCE, inPlace: true });
    expect(s.inPlace).toBe(true);
    expect(s.source.licence).toBe(T.MIXAMO_LICENCE);
    expect(s.source.take).toBe('idle');
    expect(s.cycleDistance).toBe(0);
    expect(s.speed).toBe(0);
    for (const r of s.root) expect(r).toEqual([0, 0, 0]);
    expect(s.quality.retargetDirErrDeg).toBeLessThan(0.5);
    // a one-shot in place: the same fixed root
    const one = RT.buildSlot(rig, { slot: 'idle_once', kind: 'oneshot' }, { take: 'idle', segment: [0, 120] }, '', null, { load, inPlace: true });
    for (const r of one.root) expect(r).toEqual([0, 0, 0]);
    // without the option the loop's root travels by its (noise) displacement, as for CMU
    const moving = RT.buildSlot(rig, pick, choice, '', null, { load });
    expect(moving.inPlace).toBeUndefined();
    expect(moving.source.licence).toBe(RT.CMU_LICENCE);
  });

  it('analyzeTake runs on the Mixamo take', () => {
    const a = AN.analyzeTake({ take: 'walk', desc: 'walk (Mixamo)', kind: 'loop' }, { load });
    expect(a.take).toBe('walk');
    expect(a.frames).toBe((WALK.n - 1) * 4 + 1);
    expect(a.selfCheck).toBe(true);
  });
});

// CMU regression: the default (CMU) path is the injected CMU loader, byte for byte. Needs a raw take in .mocap-cache
// (gitignored, not on every machine): skipped with a note otherwise. The old-vs-new byte check is in M2-REPORT.md.
const cmuTake = existsSync(ASF.CACHE) ? readdirSync(ASF.CACHE).find((f) => f.endsWith('.amc') && existsSync(path.join(ASF.CACHE, `${f.split('_')[0]}.asf`)))?.slice(0, -4) : undefined;
describe('CMU output unchanged by the loader injection', () => {
  afterAll(() => { if (!cmuTake) console.info('mixamoTake.test: no CMU take in .mocap-cache, the CMU regression is skipped'); });
  it.skipIf(!cmuTake)(`buildSlot / retargetTake / analyzeTake: default == injected loadTake (${cmuTake ?? 'no take'})`, () => {
    const rig = RT.wrenRig();
    const take = cmuTake!;
    const pick = { slot: 'reg', kind: 'loop' }, choice = { take, segment: [0, 240] };
    const a = JSON.stringify(RT.buildSlot(rig, pick, choice));
    const b = JSON.stringify(RT.buildSlot(rig, pick, choice, '', null, { load: ASF.loadTake, licence: RT.CMU_LICENCE, inPlace: false }));
    expect(b).toBe(a);
    expect(a).toContain('"licence":"CMU Graphics Lab Motion Capture Database, mocap.cs.cmu.edu (SOURCES.md)"');
    expect(JSON.stringify(RT.retargetTake(rig, take).pel)).toBe(JSON.stringify(RT.retargetTake(rig, take, { load: ASF.loadTake }).pel));
    const e = { take, desc: 'regression', kind: 'loop' };
    expect(JSON.stringify(AN.analyzeTake(e, { load: ASF.loadTake }))).toBe(JSON.stringify(AN.analyzeTake(e)));
  });
});
