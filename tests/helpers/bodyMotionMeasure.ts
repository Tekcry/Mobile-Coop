/**
 * (anim-natural-n2) The body motion harness (from the N2 research harness, `n2measure.test.ts`): a headless Wren rig
 * (`operatorRig`, untuned, NullEngine) through each gait / still at a fixed rate in sim time, sampled every frame:
 * pelvis and shoulder yaw (the hip-joint and shoulder-joint lines, root frame), their correlation, the pelvis lateral
 * swing, the head's yaw and pitch, plus each signal's fundamental on the gait phase (its timing, cycles). The e2e-anim
 * "body motion" block (scripts/e2e-anim.mjs) uses the same maths on the live game.
 */
import type { CharacterRig, RigPose } from '../../src/player/characterRig';
import { BODY_MOTION, BODY_MOTION_ROWS, type BodyMotionRow } from '../../src/anim/bodyMotion';

export interface MotionScenario {
  id: string;
  speed: number;
  dir?: 'fwd' | 'side' | 'back';
  crouch?: number;
  armed?: 'rifle' | 'pistol';
  aim?: number;
  warm?: number;
  secs?: number;
}

export interface MotionMetrics {
  pelvisYaw: number;
  shoulderYaw: number;
  counterCorr: number;
  lateralCm: number;
  headYaw: number;
  headPitch: number;
  /** Fundamentals on the gait phase: timing (cycles) of the pelvis yaw, shoulder yaw and pelvis lateral. */
  tPel: number;
  tSh: number;
  tLat: number;
  /** Mean chest yaw off the facing (deg). */
  chestMean: number;
}

export const MOTION_SCENARIOS: readonly MotionScenario[] = [
  { id: 'walk', speed: 1.4 },
  { id: 'jog', speed: 3.0 },
  { id: 'run', speed: 4.0 },
  { id: 'sneak', speed: 1.0, crouch: 1 },
  { id: 'crouchWalk', speed: 1.7, crouch: 1 },
  { id: 'crouchRun', speed: 2.6, crouch: 1 },
  { id: 'lowReadyWalk', speed: 1.4, armed: 'rifle' },
  { id: 'aimFwd', speed: 1.0, armed: 'rifle', aim: 1 },
  { id: 'aimSide', speed: 1.0, dir: 'side', armed: 'rifle', aim: 1 },
  { id: 'aimBack', speed: 0.9, dir: 'back', armed: 'rifle', aim: 1 },
  { id: 'crouchAimFwd', speed: 0.9, crouch: 1, armed: 'rifle', aim: 1 },
  { id: 'aimStill', speed: 0, armed: 'rifle', aim: 1 },
  { id: 'idle', speed: 0 },
];

const D = 180 / Math.PI;
const ang = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const range = (a: readonly number[]): number => {
  let lo = Infinity;
  let hi = -Infinity;
  for (const x of a) {
    if (x < lo) lo = x;
    if (x > hi) hi = x;
  }
  return a.length ? hi - lo : 0;
};
export function corr(a: readonly number[], b: readonly number[]): number {
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i]!;
    mb += b[i]!;
  }
  ma /= n;
  mb /= n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    sab += (a[i]! - ma) * (b[i]! - mb);
    saa += (a[i]! - ma) ** 2;
    sbb += (b[i]! - mb) ** 2;
  }
  return saa > 1e-12 && sbb > 1e-12 ? sab / Math.sqrt(saa * sbb) : 0;
}
/** The timing (cycles 0..1) of a signal's fundamental on the phase: x ~ A cos(2 pi (phase - t)). */
function fundamental(x: readonly number[], ph: readonly number[]): number {
  let c = 0;
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    c += x[i]! * Math.cos(2 * Math.PI * ph[i]!);
    s += x[i]! * Math.sin(2 * Math.PI * ph[i]!);
  }
  const t = Math.atan2(s, c) / (2 * Math.PI);
  return +(t < 0 ? t + 1 : t).toFixed(3);
}

/** Runs `fn` with every BODY_MOTION amount set to 0 (the layer forced off), then restores the rows. */
export async function withBodyMotionOff<T>(fn: () => Promise<T>): Promise<T> {
  const saved = BODY_MOTION_ROWS.map((r) => ({ ...BODY_MOTION[r] }));
  for (const r of BODY_MOTION_ROWS) {
    const row = BODY_MOTION[r] as BodyMotionRow;
    row.hipTurn = 0;
    row.chestTurn = 0;
    row.sway = 0;
    row.headFollow = 0;
    row.headNod = 0;
  }
  try {
    return await fn();
  } finally {
    BODY_MOTION_ROWS.forEach((r, k) => Object.assign(BODY_MOTION[r], saved[k]));
  }
}

/** Measures each scenario at `hz` (sim time). */
export async function measureMotion(hz = 60, only?: readonly string[]): Promise<Record<string, MotionMetrics>> {
  const DT = 1 / hz;
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { defaultLook } = await import('../../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../../src/operators/runtime/playerFigure');
  const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../../src/weapons/weaponModel');
  const { WEAPONS } = await import('../../src/weapons/weaponDefs');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const make = (a: Parameters<typeof lib.instance>[0], b: string, c?: Parameters<typeof lib.instance>[2]) => lib.instance(a, b, c);
  const out: Record<string, MotionMetrics> = {};
  const random = Math.random;
  let seed = 12345;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  try {
    for (const sc of MOTION_SCENARIOS) {
      if (only && !only.includes(sc.id)) continue;
      seed = 12345;
      const op = operatorRig(scene, make, defaultLook(), 'm');
      const rig = op.rig as CharacterRig & { carrier: boolean };
      if (sc.armed) new WeaponModel(scene, lib, sc.armed === 'rifle' ? WEAPONS.rifle : WEAPONS.pistolSd, DEFAULT_WEAPON_COLORS, rig.root).hold(rig);
      rig.carrier = true;
      const p: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' };
      const warm = sc.warm ?? 2;
      const secs = sc.secs ?? 4;
      const N = Math.round((warm + secs) * hz);
      const dir = sc.dir ?? 'fwd';
      const lx = dir === 'side' ? 1 : 0;
      const lz = dir === 'fwd' ? 1 : dir === 'back' ? -1 : 0;
      const pel: number[] = [];
      const sh: number[] = [];
      const lat: number[] = [];
      const hy: number[] = [];
      const hp: number[] = [];
      const ph: number[] = [];
      let chestSum = 0;
      for (let k = 0; k < N; k++) {
        const t = k * DT - warm;
        rig.root.rotation.y = 0;
        rig.root.position.x += lx * sc.speed * DT;
        rig.root.position.z += lz * sc.speed * DT;
        p.speed = sc.speed;
        p.localX = sc.speed > 0 ? lx : 0;
        p.localZ = sc.speed > 0 ? lz : 0;
        p.crouch = sc.crouch ?? 0;
        p.armed = !!sc.armed;
        p.aim = sc.aim ?? 0;
        p.stride = (sc.aim ?? 0) > 0.5 ? 'velocity' : 'facing';
        p.weight = 1;
        p.yawRate = 0;
        rig.animate(DT, p);
        if (t < 0) continue;
        const nodes = [rig.root, rig.hips, rig.spine, rig.torso, rig.neck, rig.headNode, rig.shoulderL, rig.shoulderR, rig.hipL, rig.hipR];
        for (const n of nodes) n.computeWorldMatrix(true);
        const rm = rig.root.getWorldMatrix().m;
        const rx = rm[12]!;
        const rz = rm[14]!;
        const rootYaw = Math.atan2(rm[8]!, rm[10]!);
        const rr = Math.atan2(rm[2]!, rm[0]!);
        const W = (n: { getWorldMatrix(): { m: ArrayLike<number> } }) => n.getWorldMatrix().m;
        const lineYaw = (a: ArrayLike<number>, b: ArrayLike<number>) => ang(Math.atan2(b[14]! - a[14]!, b[12]! - a[12]!) - rr) * D;
        const hm = W(rig.hips);
        const tm = W(rig.torso);
        const em = W(rig.headNode);
        pel.push(lineYaw(W(rig.hipL), W(rig.hipR)));
        sh.push(lineYaw(W(rig.shoulderL), W(rig.shoulderR)));
        lat.push((hm[12]! - rx) * Math.cos(rootYaw) - (hm[14]! - rz) * Math.sin(rootYaw));
        hy.push(ang(Math.atan2(em[8]!, em[10]!) - rootYaw) * D);
        const nl = Math.sqrt(em[8]! * em[8]! + em[9]! * em[9]! + em[10]! * em[10]!);
        hp.push(Math.asin(Math.max(-1, Math.min(1, em[9]! / nl))) * D);
        ph.push(rig.graph.out.gait.phase);
        chestSum += ang(Math.atan2(tm[8]!, tm[10]!) - rootYaw) * D;
      }
      const r1 = (x: number, k = 1) => +x.toFixed(k);
      out[sc.id] = {
        pelvisYaw: r1(range(pel)),
        shoulderYaw: r1(range(sh)),
        counterCorr: r1(corr(pel, sh), 2),
        lateralCm: r1(range(lat) * 100),
        headYaw: r1(range(hy), 2),
        headPitch: r1(range(hp), 2),
        tPel: fundamental(pel, ph),
        tSh: fundamental(sh, ph),
        tLat: fundamental(lat, ph),
        chestMean: r1(chestSum / Math.max(1, pel.length), 2),
      };
      op.figure.dispose();
      rig.dispose();
    }
  } finally {
    Math.random = random;
  }
  scene.dispose();
  return out;
}
