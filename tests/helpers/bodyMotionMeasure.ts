/**
 * (anim-natural-n2) The body motion harness (from the N2 research harness, `n2measure.test.ts`): a headless Wren rig
 * (`operatorRig`, untuned, NullEngine) through each gait / still at a fixed rate in sim time, sampled every frame:
 * pelvis and shoulder yaw (the hip-joint and shoulder-joint lines, root frame), their correlation, the pelvis lateral
 * swing, the head's yaw and pitch, plus each signal's fundamental on the gait phase (its timing, cycles). The e2e-anim
 * "body motion" block (scripts/e2e-anim.mjs) uses the same maths on the live game.
 */
import type { CharacterRig, RigPose } from '../../src/player/characterRig';
import { ARM_SPEED_MAX, BODY_MOTION, BODY_MOTION_ROWS, KEY_MOTION, KEY_MOTION_ROWS, type BodyMotionRow } from '../../src/anim/bodyMotion';

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
  /** (anim-natural-n2 step 3) The largest pelvis yaw step in one frame (deg; a snap reads here). */
  pelvisStep: number;
  /**
   * (step 3) The wrists, the worse side: the forward range in the root frame (cm, as the audit's wristFwdRangeCm), the
   * peak speed in the root frame (m/s, the audit's wristSpeedMax) and in the chest frame (the wrist off the shoulder
   * joint on the torso's axes: what the keyed arm's speed cap sees).
   */
  wristFwdCm: number;
  wristPeak: number;
  wristPeakChest: number;
}

export const MOTION_SCENARIOS: readonly MotionScenario[] = [
  { id: 'walk', speed: 1.4 },
  { id: 'jog', speed: 3.0 },
  { id: 'run', speed: 4.0 },
  { id: 'sneak', speed: 1.0, crouch: 1 },
  { id: 'crouchWalk', speed: 1.7, crouch: 1 },
  { id: 'crouchRun', speed: 2.6, crouch: 1 },
  { id: 'lowReadyWalk', speed: 1.4, armed: 'rifle' },
  // (anim-natural-n2 step 3) the low-ready jog and run (AUDIT fix 35: the low-ready run's pelvis) and the sprint pace
  { id: 'lowReadyJog', speed: 3.0, armed: 'rifle' },
  { id: 'lowReadyRun', speed: 4.0, armed: 'rifle' },
  { id: 'sprint', speed: 5.0 },
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

/**
 * Runs `fn` with the layer forced off, then restores the rows: every BODY_MOTION amount 0 and (step 3) the keyed arms at
 * their identity (KEY_MOTION armGain 1, armSpeed ARM_SPEED_MAX: no gain, the cap never engages).
 */
export async function withBodyMotionOff<T>(fn: () => Promise<T>): Promise<T> {
  return withKeyMotionOff(() => withTrunkMotionOff(fn));
}

/** (step 3) Runs `fn` with the keyed arms at their identity (KEY_MOTION armGain 1, armSpeed ARM_SPEED_MAX), then restores them. */
export async function withKeyMotionOff<T>(fn: () => Promise<T>): Promise<T> {
  const saved = KEY_MOTION_ROWS.map((r) => ({ ...KEY_MOTION[r] }));
  for (const r of KEY_MOTION_ROWS) {
    KEY_MOTION[r].armGain = 1;
    KEY_MOTION[r].armSpeed = ARM_SPEED_MAX;
  }
  try {
    return await fn();
  } finally {
    KEY_MOTION_ROWS.forEach((r, k) => Object.assign(KEY_MOTION[r], saved[k]));
  }
}

/** Runs `fn` with every BODY_MOTION amount set to 0 (the trunk / sway / head layer off), then restores the rows. */
export async function withTrunkMotionOff<T>(fn: () => Promise<T>): Promise<T> {
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
      const wr = newWristRec();
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
        const nodes = [rig.root, rig.hips, rig.spine, rig.torso, rig.neck, rig.headNode, rig.shoulderL, rig.shoulderR, rig.hipL, rig.hipR, rig.elbowL, rig.elbowR, rig.wristL, rig.wristR];
        for (const n of nodes) n.computeWorldMatrix(true);
        sampleWrists(rig, wr);
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
        pelvisStep: r1(maxStep(pel)),
        ...wristMetrics(wr, DT),
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

const maxStep = (a: readonly number[]): number => {
  let m = 0;
  for (let i = 1; i < a.length; i++) m = Math.max(m, Math.abs(ang((a[i]! - a[i - 1]!) / D) * D));
  return m;
};

/** (anim-natural-n2 step 3) Per wrist: root-frame positions [0, 1] and chest-frame offsets off the shoulder [2, 3] (xyz). */
type WristRec = number[][];
const newWristRec = (): WristRec => [[], [], [], []];

/** Samples both wrists (the caller has computed the root, torso, shoulder and wrist world matrices this frame). */
function sampleWrists(rig: CharacterRig, rec: WristRec): void {
  const rm = rig.root.getWorldMatrix().m;
  const ry = Math.atan2(rm[8]!, rm[10]!);
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  const tm = rig.torso.getWorldMatrix().m;
  const ax = (o: number) => Math.sqrt(tm[o]! * tm[o]! + tm[o + 1]! * tm[o + 1]! + tm[o + 2]! * tm[o + 2]!) || 1;
  const lx = ax(0);
  const ly = ax(4);
  const lz = ax(8);
  for (let k = 0; k < 2; k++) {
    const w = (k === 0 ? rig.wristL : rig.wristR).getWorldMatrix().m;
    const sm = (k === 0 ? rig.shoulderL : rig.shoulderR).getWorldMatrix().m;
    const dx = w[12]! - rm[12]!;
    const dy = w[13]! - rm[13]!;
    const dz = w[14]! - rm[14]!;
    // root frame: right (cos, -sin), forward (sin, cos) on world x / z (Babylon rotation.y)
    rec[k]!.push(dx * c - dz * s, dy, dx * s + dz * c);
    const ex = w[12]! - sm[12]!;
    const ey = w[13]! - sm[13]!;
    const ez = w[14]! - sm[14]!;
    rec[2 + k]!.push((ex * tm[0]! + ey * tm[1]! + ez * tm[2]!) / lx, (ex * tm[4]! + ey * tm[5]! + ez * tm[6]!) / ly, (ex * tm[8]! + ey * tm[9]! + ez * tm[10]!) / lz);
  }
}

function wristMetrics(rec: WristRec, dt: number): Pick<MotionMetrics, 'wristFwdCm' | 'wristPeak' | 'wristPeakChest'> {
  const fwd = (a: readonly number[]): number => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 2; i < a.length; i += 3) {
      if (a[i]! < lo) lo = a[i]!;
      if (a[i]! > hi) hi = a[i]!;
    }
    return a.length ? hi - lo : 0;
  };
  const peak = (a: readonly number[]): number => {
    let m = 0;
    for (let i = 3; i < a.length; i += 3) {
      const x = a[i]! - a[i - 3]!;
      const y = a[i + 1]! - a[i - 2]!;
      const z = a[i + 2]! - a[i - 1]!;
      m = Math.max(m, Math.sqrt(x * x + y * y + z * z) / dt);
    }
    return m;
  };
  return {
    wristFwdCm: +(Math.max(fwd(rec[0]!), fwd(rec[1]!)) * 100).toFixed(1),
    wristPeak: +Math.max(peak(rec[0]!), peak(rec[1]!)).toFixed(2),
    wristPeakChest: +Math.max(peak(rec[2]!), peak(rec[3]!)).toFixed(2),
  };
}

/** (anim-natural-n2 step 3) A turn: straight at `speed` (or still), then at t = 0 the stick turns `turn` rad (or sweeps `curve` rad/s). */
export interface TurnScenario {
  id: string;
  speed: number;
  turn?: number;
  curve?: number;
  /** Start from a standstill (the stick pushed at t = 0). */
  still?: boolean;
  crouch?: number;
  armed?: 'rifle';
}

/**
 * The audit's turn rows (docs/archive/anim-natural/AUDIT.md finding 7: the wrist whip in turns and the strafe start), headless:
 * the player's own motion driver (CT free movement, facing the travel) turns the root, the rig poses from it as the
 * player feeds it (phase, state, yaw rate, velocity, goals). 2 s warm, then 2.5 s from the turn.
 */
export const TURN_SCENARIOS: readonly TurnScenario[] = [
  { id: 'turn90Walk', speed: 1.4, turn: Math.PI / 2 },
  { id: 'turn180Jog', speed: 3.0, turn: Math.PI },
  { id: 'turn90Run', speed: 4.0, turn: Math.PI / 2 },
  { id: 'turn180Run', speed: 4.0, turn: Math.PI },
  { id: 'curveJog', speed: 3.0, curve: 1.2 },
  { id: 'strafe', speed: 3.0, turn: Math.PI / 2, still: true },
  { id: 'crouchTurn90', speed: 1.7, turn: Math.PI / 2, crouch: 1 },
  { id: 'lowReadyTurn180', speed: 3.0, turn: Math.PI, armed: 'rifle' },
];

/** Measures each turn at `hz` (sim time): the wrists over the turn and after, the pelvis step. */
export async function measureTurns(hz = 60, only?: readonly string[]): Promise<Record<string, Pick<MotionMetrics, 'pelvisStep' | 'wristFwdCm' | 'wristPeak' | 'wristPeakChest'>>> {
  const DT = 1 / hz;
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { defaultLook } = await import('../../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../../src/operators/runtime/playerFigure');
  const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../../src/weapons/weaponModel');
  const { WEAPONS } = await import('../../src/weapons/weaponDefs');
  const { MotionDriver, emptyMotionInput } = await import('../../src/anim/motion');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const make = (a: Parameters<typeof lib.instance>[0], b: string, c?: Parameters<typeof lib.instance>[2]) => lib.instance(a, b, c);
  const out: Record<string, Pick<MotionMetrics, 'pelvisStep' | 'wristFwdCm' | 'wristPeak' | 'wristPeakChest'>> = {};
  const random = Math.random;
  let seed = 12345;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  try {
    for (const sc of TURN_SCENARIOS) {
      if (only && !only.includes(sc.id)) continue;
      seed = 12345;
      const op = operatorRig(scene, make, defaultLook(), 'm');
      const rig = op.rig as CharacterRig & { carrier: boolean };
      if (sc.armed) new WeaponModel(scene, lib, WEAPONS.rifle, DEFAULT_WEAPON_COLORS, rig.root).hold(rig);
      rig.carrier = true;
      const d = new MotionDriver(0);
      const mi = emptyMotionInput();
      const p: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' };
      const warm = 2;
      const N = Math.round((warm + 2.5) * hz);
      const pel: number[] = [];
      const wr = newWristRec();
      for (let k = 0; k < N; k++) {
        const t = k * DT - warm;
        const dir = t < 0 ? 0 : sc.curve !== undefined ? sc.curve * t : (sc.turn ?? 0);
        const v = t < 0 && sc.still ? 0 : sc.speed;
        mi.ct = true;
        mi.faceTravel = true;
        mi.aiming = false;
        mi.yaw = d.yaw;
        mi.vx = Math.sin(dir) * v;
        mi.vz = Math.cos(dir) * v;
        mi.crouch = sc.crouch ?? 0;
        d.step(DT, mi);
        rig.root.position.x += d.outX * DT;
        rig.root.position.z += d.outZ * DT;
        rig.root.rotation.y = d.yaw;
        p.speed = d.speed;
        p.localX = 0;
        p.localZ = d.speed > 0.01 ? 1 : 0;
        p.crouch = sc.crouch ?? 0;
        p.armed = !!sc.armed;
        p.weight = 1;
        p.yawRate = d.yawRate;
        p.phase = d.phase;
        p.motion = d.state;
        p.motionT = d.stateT;
        p.velX = d.outX;
        p.velZ = d.outZ;
        p.goalYaw = d.goalYaw;
        p.faceGoal = d.faceGoal;
        p.stride = 'facing';
        rig.animate(DT, p);
        if (t < -0.25) continue;
        const nodes = [rig.root, rig.hips, rig.spine, rig.torso, rig.shoulderL, rig.shoulderR, rig.hipL, rig.hipR, rig.elbowL, rig.elbowR, rig.wristL, rig.wristR];
        for (const n of nodes) n.computeWorldMatrix(true);
        const rm = rig.root.getWorldMatrix().m;
        const rr = Math.atan2(rm[2]!, rm[0]!);
        const hl = rig.hipL.getWorldMatrix().m;
        const hr = rig.hipR.getWorldMatrix().m;
        pel.push(ang(Math.atan2(hr[14]! - hl[14]!, hr[12]! - hl[12]!) - rr) * D);
        sampleWrists(rig, wr);
      }
      out[sc.id] = { pelvisStep: +maxStep(pel).toFixed(1), ...wristMetrics(wr, DT) };
      op.figure.dispose();
      rig.dispose();
    }
  } finally {
    Math.random = random;
  }
  scene.dispose();
  return out;
}

/** (CHECK-4 should-fix 2) One Anim Studio keyed loop on the player rig: per frame, both elbows and wrists (world, m). */
export interface StudioArms {
  /** Per frame: elbow L, wrist L, elbow R, wrist R (xyz each, 12 numbers a frame). */
  pts: number[];
  /** Frames the layer's gate was open (the cap would apply) and the largest arm speed cap seen (m/s). */
  gated: number;
  armSpeedMax: number;
}

/**
 * Plays each studio entry (`keyed:<clip>`, in place, its own cycle) on a fresh player rig as the studio does: the graph's
 * drive set, the rig standing (speed 0, stride 'facing': the keyed gate open, the layer's bands at the walk's).
 */
export async function measureStudioArms(ids: readonly string[], hz = 60, secs = 6): Promise<Record<string, StudioArms>> {
  const DT = 1 / hz;
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { defaultLook } = await import('../../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../../src/operators/runtime/playerFigure');
  const { newStudioDrive } = await import('../../src/anim/studioDrive');
  const { studioEntry } = await import('../../src/anim/studio');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const make = (a: Parameters<typeof lib.instance>[0], b: string, c?: Parameters<typeof lib.instance>[2]) => lib.instance(a, b, c);
  const out: Record<string, StudioArms> = {};
  const random = Math.random;
  let seed = 12345;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  try {
    for (const id of ids) {
      seed = 12345;
      const e = studioEntry(id);
      if (e.id !== id || !e.clip) throw new Error(`no studio keyed entry ${id}`);
      const op = operatorRig(scene, make, defaultLook(), 'm');
      const rig = op.rig as CharacterRig & { carrier: boolean };
      rig.carrier = true;
      const d = newStudioDrive();
      d.clip = e.clip;
      d.inPlace = true;
      d.cycle = e.cycle;
      d.drawn = e.drawn;
      d.crouch = e.crouch;
      d.pace = e.pace;
      d.dirX = e.move === 'side' ? 1 : 0;
      d.dirZ = e.move === 'fwd' ? 1 : e.move === 'back' ? -1 : 0;
      rig.graph.drive = d;
      const p: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing', weight: 1, yawRate: 0 };
      const r: StudioArms = { pts: [], gated: 0, armSpeedMax: 0 };
      const N = Math.round(secs * hz);
      for (let k = 0; k < N; k++) {
        rig.animate(DT, p);
        const m = rig.graph.out.motion;
        if (m.w > 0) r.gated++;
        if (m.armSpeed > r.armSpeedMax) r.armSpeedMax = m.armSpeed;
        for (const n of [rig.root, rig.hips, rig.spine, rig.torso, rig.shoulderL, rig.elbowL, rig.wristL, rig.shoulderR, rig.elbowR, rig.wristR]) n.computeWorldMatrix(true);
        for (const n of [rig.elbowL, rig.wristL, rig.elbowR, rig.wristR]) {
          const w = n.getWorldMatrix().m;
          r.pts.push(w[12]!, w[13]!, w[14]!);
        }
      }
      out[id] = r;
      op.figure.dispose();
      rig.dispose();
    }
  } finally {
    Math.random = random;
  }
  scene.dispose();
  return out;
}
