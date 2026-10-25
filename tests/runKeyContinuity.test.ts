// (anim-natural N2, A1) The holstered run's trunk is continuous through its keys (scripts/anim-keys/keys/run.json,
// src/anim/clips/keyed/run.ts). Michael's 2026-10-22 run tune (dbd466c7) put key 0 at pelvis yaw 25.5 / chest -26
// against his own keys at phase 1/48 and 3/48 (9.5 / -10, 0.5 / 7.5): with the mirror the pelvis ramped to -25.5 and
// snapped ~21 deg back in one clip frame twice a cycle (pelvis / shoulders 51 / 52 deg p2p, the wrist at 14.8 m/s). Key 0
// is now continuous with those keys. Measured two ways:
// - the clip itself: the pelvis and the shoulder line (chest x axis, body frame) yaw at the clip's 32 frames;
// - the Wren rig headless (operatorRig, NullEngine, 60 Hz, sim time) at the run 4.0 and sprint 5.0 m/s: pelvis / shoulder
//   line yaw p2p and the largest step per 60 Hz frame, the wrist's forward range and peak speed in the root frame, and
//   e2e-anim's crab quantities (knee separation, planted track, knee bow, elbow wing: RUN_TUNE in scripts/e2e-anim.mjs).
// RUNKEY_PRINT=1 prints the table. RUNKEY_EDIT="0:pelvis_yaw=-3;1:chest_yaw=2" measures a candidate edit through the
// tuner's live key preview (key.run.<n> deltas; exact against a rebake for the trunk, the arms within ~0.7 cm;
// tests/keyedExactPreview.test.ts) instead of the shipped clip: the asserts are then skipped. docs/archive/anim-natural-n2/BRIEF.md A1.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { keyGroupId } from '../src/anim/tuneKeysFile';
import { tuneKeysFilesReady, tuneKeysSync } from '../src/anim/tuneKeys';
import { tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';
import { newKeyedPose, sampleKeyed, type KeyedClip } from '../src/anim/keyed';
import { KEYED_RUN } from '../src/anim/clips/keyed/run';
import { crabRanges } from '../src/anim/audit/limits';
import { elbowWing, footTrack, kneeBow, kneeSeparation } from '../src/anim/audit/metrics';

const D = 180 / Math.PI;
const DT = 1 / 60;
const PRINT = !!process.env.RUNKEY_PRINT || !!process.env.RUNKEY_EDIT;
const EDIT = process.env.RUNKEY_EDIT ?? '';
/** The asserts hold for the shipped clip only. */
const check = (f: () => void) => {
  if (!EDIT) f();
};

/** Quaternion (x, y, z, w) product a * b into o. */
const qmul = (a: number[], b: number[]): number[] => [
  a[3]! * b[0]! + a[0]! * b[3]! + a[1]! * b[2]! - a[2]! * b[1]!,
  a[3]! * b[1]! - a[0]! * b[2]! + a[1]! * b[3]! + a[2]! * b[0]!,
  a[3]! * b[2]! + a[0]! * b[1]! - a[1]! * b[0]! + a[2]! * b[3]!,
  a[3]! * b[3]! - a[0]! * b[0]! - a[1]! * b[1]! - a[2]! * b[2]!,
];
/** The yaw (deg, + turns right) of a frame's x axis (the hip / shoulder line): pitch about x leaves it alone. */
const lineYaw = (q: number[]): number => {
  const [x, y, z, w] = q as [number, number, number, number];
  const xx = 1 - 2 * (y * y + z * z);
  const xz = 2 * (x * z - w * y);
  return Math.atan2(-xz, xx) * D;
};
const wrap = (a: number): number => Math.atan2(Math.sin(a / D), Math.cos(a / D)) * D;
const p2p = (a: number[]): number => Math.max(...a) - Math.min(...a);
const maxStep = (a: number[], cyclic: boolean): number => {
  let m = 0;
  for (let i = 1; i < a.length; i++) m = Math.max(m, Math.abs(wrap(a[i]! - a[i - 1]!)));
  if (cyclic) m = Math.max(m, Math.abs(wrap(a[0]! - a[a.length - 1]!)));
  return m;
};

interface ClipYaw {
  pelvis: number[];
  shoulders: number[];
}
/** The pelvis and chest (pelvis * spine * chest) line yaw at each of the clip's frames. */
function clipYaw(clip: KeyedClip): ClipYaw {
  const o = newKeyedPose();
  const out: ClipYaw = { pelvis: [], shoulders: [] };
  for (let f = 0; f < clip.frames; f++) {
    sampleKeyed(clip, f / clip.frames, 1, o);
    const q = (s: number) => [o.q[s]!, o.q[s + 1]!, o.q[s + 2]!, o.q[s + 3]!];
    out.pelvis.push(lineYaw(q(0)));
    out.shoulders.push(lineYaw(qmul(qmul(q(0), q(4)), q(8))));
  }
  return out;
}

/** (run arm pop) The arm points' jump per clip frame (cm, the clip's chest frame from the shoulder joint, 1.75 m body):
 *  for elbow L, wrist L, elbow R, wrist R the largest step between consecutive frames (cyclic) and the frame it ends on. */
const ARM_POINTS = ['elbowL', 'wristL', 'elbowR', 'wristR'] as const;
function clipArmSteps(clip: KeyedClip): { step: number[]; at: number[]; fwd: number[]; per: number[][]; bend: number[][] } {
  const o = newKeyedPose();
  const pts: number[][] = [];
  for (let f = 0; f < clip.frames; f++) {
    sampleKeyed(clip, f / clip.frames, 1, o);
    pts.push(Array.from(o.arm));
  }
  const step = [0, 0, 0, 0];
  const at = [0, 0, 0, 0];
  const fwd = [0, 0, 0, 0];
  const per: number[][] = [[], [], [], []];
  // the elbow bend per side and frame (deg, 0 = straight): the upper arm (shoulder -> elbow) against the forearm
  const bend: number[][] = [0, 6].map((e) =>
    pts.map((p) => {
      const u = [p[e]!, p[e + 1]!, p[e + 2]!];
      const v = [p[e + 3]! - u[0]!, p[e + 4]! - u[1]!, p[e + 5]! - u[2]!];
      return Math.acos((u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!) / Math.hypot(...u) / Math.hypot(...v)) * D;
    }),
  );
  for (let j = 0; j < 4; j++) {
    const z = pts.map((p) => p[j * 3 + 2]!);
    fwd[j] = p2p(z) * 100;
    for (let f = 0; f < clip.frames; f++) {
      const a = pts[(f + clip.frames - 1) % clip.frames]!;
      const b = pts[f]!;
      const d = Math.hypot(b[j * 3]! - a[j * 3]!, b[j * 3 + 1]! - a[j * 3 + 1]!, b[j * 3 + 2]! - a[j * 3 + 2]!) * 100;
      per[j]!.push(d);
      if (d > step[j]!) {
        step[j] = d;
        at[j] = f;
      }
    }
  }
  return { step, at, fwd, per, bend };
}

interface RigRow {
  speed: number;
  pelvisP2p: number;
  shoulderP2p: number;
  pelvisStep: number;
  shoulderStep: number;
  wristRange: [number, number];
  wristPeak: [number, number];
  kneeSep: number;
  track: number;
  bow: number;
  wing: number;
}
/** The Wren rig headless at `speed` (m/s), forward, holstered, 2 s warm then 4 s measured at 60 Hz. */
async function rigRun(speed: number): Promise<RigRow> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../src/operators/runtime/playerFigure');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const random = Math.random;
  let seed = 12345;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  try {
    const op = operatorRig(scene, (a, b, c) => lib.instance(a, b, c), defaultLook(), 'm');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rig = op.rig as any;
    rig.carrier = true;
    rig.groundProbe = () => 0;
    const p = { speed, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing', weight: 1, yawRate: 0 };
    const pel: number[] = [];
    const sh: number[] = [];
    const wl: number[][] = [];
    const wr: number[][] = [];
    const J = ['hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR'] as const;
    const rec = Object.fromEntries(J.map((j) => [j, [] as number[]])) as Record<(typeof J)[number], number[]>;
    const cL: number[] = [];
    const cR: number[] = [];
    const N = Math.round(6 / DT);
    for (let k = 0; k < N; k++) {
      rig.root.position.z += speed * DT;
      rig.animate(DT, p);
      if (k * DT < 2) continue;
      const nodes = [rig.root, rig.hips, rig.spine, rig.torso, rig.shoulderL, rig.shoulderR, rig.wristL, rig.wristR, ...J.map((j) => rig[j])];
      for (const n of nodes) n.computeWorldMatrix(true);
      const P = (n: { getWorldMatrix(): { m: ArrayLike<number> } }) => {
        const m = n.getWorldMatrix().m;
        return [m[12]!, m[13]!, m[14]!];
      };
      const rp = P(rig.root);
      const yawOf = (a: number[], b: number[]) => Math.atan2(-(b[2]! - a[2]!), b[0]! - a[0]!) * D;
      pel.push(yawOf(P(rig.hipL), P(rig.hipR)));
      sh.push(yawOf(P(rig.shoulderL), P(rig.shoulderR)));
      // the root never turns here: the root frame is the world shifted
      const loc = (q: number[]) => [q[0]! - rp[0]!, q[1]! - rp[1]!, q[2]! - rp[2]!];
      wl.push(loc(P(rig.wristL)));
      wr.push(loc(P(rig.wristR)));
      for (const j of J) rec[j].push(...P(rig[j]));
      cL.push(rig.planner.L.contact ? 1 : 0);
      cR.push(rig.planner.R.contact ? 1 : 0);
    }
    const range = (w: number[][]) => p2p(w.map((v) => v[2]!)) * 100;
    const peak = (w: number[][]) => {
      let m = 0;
      for (let i = 1; i < w.length; i++) m = Math.max(m, Math.hypot(w[i]![0]! - w[i - 1]![0]!, w[i]![1]! - w[i - 1]![1]!, w[i]![2]! - w[i - 1]![2]!) / DT);
      return m;
    };
    const C = crabRanges(false);
    const row: RigRow = {
      speed,
      pelvisP2p: p2p(pel),
      shoulderP2p: p2p(sh),
      pelvisStep: maxStep(pel, false),
      shoulderStep: maxStep(sh, false),
      wristRange: [range(wl), range(wr)],
      wristPeak: [peak(wl), peak(wr)],
      kneeSep: kneeSeparation(rec.hipL, rec.hipR, rec.kneeL, rec.kneeR, C.kneeSep.min, C.kneeSep.max).max,
      track: footTrack(rec.hipL, rec.hipR, rec.ankleL, rec.ankleR, C.trackHalf, cL, cR).max * 100,
      bow: kneeBow(rec.hipL, rec.hipR, rec.kneeL, rec.kneeR, rec.ankleL, rec.ankleR, C.kneeBow).max * 100,
      wing: elbowWing(rec.shoulderL, rec.shoulderR, rec.elbowL, rec.elbowR, C.elbowWing).max * 100,
    };
    op.figure.dispose();
    rig.dispose();
    return row;
  } finally {
    Math.random = random;
  }
}

const f1 = (x: number) => x.toFixed(1);
const fmtClip = (c: ClipYaw) =>
  `clip: pelvis ${f1(p2p(c.pelvis))} p2p, max step ${f1(maxStep(c.pelvis, true))} deg / clip frame; shoulders ${f1(p2p(c.shoulders))} p2p, max step ${f1(maxStep(c.shoulders, true))}`;
const fmtRig = (r: RigRow) =>
  `${r.speed} m/s: pelvis ${f1(r.pelvisP2p)} / shoulders ${f1(r.shoulderP2p)} p2p, max step ${f1(r.pelvisStep)} / ${f1(r.shoulderStep)} deg / 60 Hz frame; wrist fwd range ${f1(r.wristRange[0])} / ${f1(r.wristRange[1])} cm, peak ${r.wristPeak[0].toFixed(2)} / ${r.wristPeak[1].toFixed(2)} m/s; knees ${r.kneeSep.toFixed(2)} x hips, track ${f1(r.track)} cm, knee bow ${f1(r.bow)} cm, elbow wing ${f1(r.wing)} cm`;

describe('anim-natural N2 A1: the run trunk is continuous through its keys', () => {
  beforeAll(async () => {
    if (!EDIT) return;
    for (const e of EDIT.split(';').filter(Boolean)) {
      const [k, rest] = e.split(':') as [string, string];
      const [id, v] = rest.split('=') as [string, string];
      expect(tuneSet(keyGroupId('run', +k), id, +v), e).toBe(true);
    }
    tuneKeysSync();
    await tuneKeysFilesReady();
    tuneKeysSync();
    expect(KEYED_RUN.keyOff).not.toBeNull();
  });
  afterAll(() => {
    tuneResetAll();
    tuneKeysSync();
  });
  it('the clip: no trunk yaw snap, a moderate counter-rotation', () => {
    const c = clipYaw(KEYED_RUN);
    if (PRINT) console.info(`${fmtClip(c)}\n  pelvis ${c.pelvis.map(f1).join(' ')}\n  shoulders ${c.shoulders.map(f1).join(' ')}`);
    check(() => {
      // was pelvis 51.0 p2p with a 20.8 deg step in one clip frame (shoulders 52.0 / 23.5)
      expect(p2p(c.pelvis)).toBeLessThan(30);
      expect(p2p(c.shoulders)).toBeLessThan(30);
      expect(maxStep(c.pelvis, true)).toBeLessThan(10);
      expect(maxStep(c.shoulders, true)).toBeLessThan(16);
      // counter-rotation: the shoulders turn against the pelvis at the strike (key 0)
      expect(Math.sign(c.pelvis[0]!)).toBe(-Math.sign(c.shoulders[0]!));
    });
  });

  it('the clip: the arms swing without a pop (no elbow / wrist jump over 8 cm in one clip frame)', () => {
    const a = clipArmSteps(KEYED_RUN);
    if (PRINT) console.info(`clip arms: ${ARM_POINTS.map((n, j) => `${n} max step ${f1(a.step[j]!)} cm (frame ${a.at[j]! - 1 < 0 ? KEYED_RUN.frames - 1 : a.at[j]! - 1} -> ${a.at[j]}), fwd range ${f1(a.fwd[j]!)} cm`).join('; ')}`);
    if (PRINT) {
      const bendL = a.bend[0]!;
      const bendR = a.bend[1]!;
      console.info(
        `  elbow bend L ${f1(Math.min(...bendL))}..${f1(Math.max(...bendL))}, R ${f1(Math.min(...bendR))}..${f1(Math.max(...bendR))} deg\n` +
          `  elbowL steps ${a.per[0]!.map(f1).join(' ')}\n  wristL steps ${a.per[1]!.map(f1).join(' ')}\n  bendL ${bendL.map((v) => v.toFixed(0)).join(' ')}`,
      );
    }
    check(() => {
      // was wrist 23.5 / elbow 9.2 cm in one clip frame at the half wrap (run frames 16 -> 17, and the left at 0 -> 1):
      // Michael's arm values kept their old key spacing (0, 6, 12, 18 / 48) after the keys moved to 0, 1, 3, 13 / 48;
      // the arm keys retimed (n2 run arm pop) bake to wrist 6.5 / elbow 3.4 cm
      for (let j = 0; j < 4; j++) expect(a.step[j], ARM_POINTS[j]).toBeLessThan(8);
    });
  });

  it('the rig at the run and sprint: no snap, the wrist slower, the crab quantities measured', { timeout: 60_000 }, async () => {
    const rows: RigRow[] = [];
    for (const v of [4.0, 5.0]) rows.push(await rigRun(v));
    if (PRINT) console.info(rows.map(fmtRig).join('\n'));
    check(() => {
      for (const r of rows) {
        expect(r.pelvisP2p).toBeLessThan(30);
        expect(r.shoulderP2p).toBeLessThan(30);
        expect(r.pelvisStep).toBeLessThan(10);
      }
    });
  });
});
