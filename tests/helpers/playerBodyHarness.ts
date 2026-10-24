/**
 * rig-pose-fix S1: the shared harness of `tests/playerVolumesParity.test.ts` (the parity check) and
 * `tests/playerVolumesSweep.test.ts` (the fit sweep, `PLAYER_BODY_SWEEP=1`): Wren's rig (NullEngine, `operatorRig`, a
 * carrier) driven the way `Player.frameUpdate` drives it, against the sim body model `src/player/playerVolumes.ts`.
 *
 * Per 60 Hz step: the capsule moves through a `MotionDriver` on the player's tuning (CT free movement, the facing stride
 * unless aiming), the crouch eases as the controller's (`crouchStep`), the weapon raise eases to its goal, the wall peek
 * eases over `WALL.peekBlend`; the rig root is placed as player.ts places it (the wall root push onto the face, the peek's
 * step toward the edge, the side-on crouch's visual yaw), and the rig gets the `RigPose` player.ts builds for that state
 * (no weapon model: `armed` from the draw). The sim model gets the same state as `PlayerBodyIn`. The joints are read in
 * the capsule's frame (side = its right, up, forward).
 */
import type { CharacterRig, RigPose } from '../../src/player/characterRig';
import type { TraverseKind } from '../../src/anim/animGraph';
import { emptyMotionInput, MotionDriver, wrapPi } from '../../src/anim/motion';
import { MOVEMENT } from '../../src/config/movement';
import { LOCO, setMocapLocomotion } from '../../src/anim/mocap';
import { WALL, WALL_LOOK_PITCH, wallHandPoint, wallHeadYaw, wallMoveK, wallRootPush, wallYawOffset } from '../../src/player/wallController';
import { coverStandoff } from '../../src/cover/coverData';
import { proportions } from '../../src/player/proportions';
import { crouchBlendOf, crouchStep, peekShare, emptyPlayerBodyIn, emptyPlayerBodyOut, playerBody, type PlayerBodyIn, type PlayerBodyOut } from '../../src/player/playerVolumes';

export const DT = 1 / 60;
/** The level's wall standoff (`levelBuilder` COVER_STANDOFF: the broad build's depth; repeated here, Babylon-free). */
export const STANDOFF = coverStandoff(MOVEMENT.radius, proportions('broad').bodyDepthHalf);
export const JOINT_NAMES = ['pelvis', 'chest', 'neck', 'head'] as const;
export type JointName = (typeof JOINT_NAMES)[number];

/** What a scenario asks for (held for the whole run). */
export interface PSc {
  id: string;
  /** Seconds before the sampling window, and its length. */
  settle: number;
  len: number;
  crouch: number;
  /** The crouch blend forced (a fit knot between standing and crouched; the game only eases through it). */
  crouchFix?: number;
  drawn?: boolean;
  raise?: number;
  pitch?: number;
  /** Free movement: the local direction (deg from the start facing, 0 ahead, 90 right) and the pace (m/s). */
  move?: { deg: number; speed: number };
  /** Back to a wall: the stance side (1 right, -1 left), the peek wanted (0 / 1) or forced (`peekFix`, the eased
   *  amount), the slide pace along the wall (m/s, + toward the stance side). */
  wall?: { side: number; peek?: number; peekFix?: number; slide?: number };
  /** A traversal family on the rig at a fixed phase (or swept over the cycle at `rate` /s), and the tumble. */
  trav?: { kind: TraverseKind; t: number; rate?: number; tumble?: number };
  /** The mocap set (default: on, the game's). */
  mocap?: boolean;
}

export interface FrameRec {
  t: number;
  /** Capsule-local (side, up, forward) per joint, the rig's and the model's. */
  rig: Float64Array;
  sim: Float64Array;
  inp: Readonly<PlayerBodyIn>;
}

export interface PRes {
  /** Worst and mean 3D error per joint over the window (m). */
  worst: Float64Array;
  mean: Float64Array;
  /** Mean capsule-local offsets per joint (12 values: side, up, forward each), the rig's and the model's. */
  rigMean: Float64Array;
  simMean: Float64Array;
}

export async function setupEnv() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { defaultLook } = await import('../../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../../src/operators/runtime/playerFigure');
  const tune = await import('../../src/anim/tune');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  let n = 0;
  const makeRig = (): { rig: CharacterRig; dispose: () => void } => {
    const op = operatorRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook(), `pb-${n++}`);
    op.rig.carrier = true;
    return {
      rig: op.rig,
      dispose: () => {
        op.figure.dispose();
        op.rig.dispose();
      },
    };
  };
  return { scene, makeRig, tune };
}
export type PEnv = Awaited<ReturnType<typeof setupEnv>>;

const tmpV = { x: 0, y: 0, z: 0 };

/** Run one scenario at the start yaw `yaw0`; `onFrame` gets every sampled frame. */
export function runScenario(env: PEnv, sc: PSc, yaw0: number, onFrame?: (f: FrameRec) => void): PRes {
  const { rig, dispose } = env.makeRig();
  const random = Math.random;
  let seed = 4242;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  setMocapLocomotion(sc.mocap ?? true);
  try {
    return drive(env, rig, sc, yaw0, onFrame);
  } finally {
    Math.random = random;
    setMocapLocomotion(false);
    dispose();
  }
}

function drive(env: PEnv, rig: CharacterRig, sc: PSc, yaw0: number, onFrame?: (f: FrameRec) => void): PRes {
  const x0 = 2.3;
  const z0 = -1.7;
  let px = x0;
  let pz = z0;
  let yaw = yaw0;
  const motion = new MotionDriver(yaw0);
  const mi = emptyMotionInput();
  const rp: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };
  const carry = { low: 1, high: 0, compressed: 0 };
  const inp = emptyPlayerBodyIn();
  const out = emptyPlayerBodyOut();
  const p = rig.p;
  let crouchK = sc.crouch;
  let crouch = sc.crouchFix ?? sc.crouch;
  let raise = sc.raise ?? 0;
  let peek = sc.wall?.peekFix ?? 0;
  let stillT = 2;
  const w = sc.wall;
  // the wall: its outward normal is the start facing (the capsule faces out), the face `STANDOFF` behind the capsule
  const nx = Math.sin(yaw0);
  const nz = Math.cos(yaw0);
  const rx = Math.cos(yaw0);
  const rz = -Math.sin(yaw0);
  const face = nx * x0 + nz * z0 - STANDOFF;
  let visYaw = yaw0 + (w ? wallYawOffset(crouch, w.side) : 0);
  const wallHand = { x: 0, y: 0, z: 0 };
  const total = Math.round((sc.settle + sc.len) / DT);
  const start = Math.round(sc.settle / DT);
  const worst = new Float64Array(4);
  const sum = new Float64Array(4);
  const rigMean = new Float64Array(12);
  const simMean = new Float64Array(12);
  const rigL = new Float64Array(12);
  const simL = new Float64Array(12);
  let n = 0;
  let travT = sc.trav?.t ?? 0;
  for (let f = 0; f < total; f++) {
    // ---- the fixed step
    const drawn = sc.drawn ?? false;
    const goalRaise = sc.raise ?? (w && drawn && peek > 0 ? 1 : 0);
    raise += (goalRaise - raise) * Math.min(1, DT * 10);
    if (sc.crouchFix === undefined) {
      crouchK = crouchStep(crouchK, sc.crouch > 0.5, DT);
      crouch = crouchBlendOf(crouchK);
    }
    const aiming = raise > 0.5;
    let vx = 0;
    let vz = 0;
    let sp = 0;
    if (w) {
      const want = w.peek ?? 0;
      if (w.peekFix === undefined) peek = want > 0 ? Math.min(1, peek + DT / WALL.peekBlend) : Math.max(0, peek - DT / WALL.peekBlend);
      const sl = w.slide ?? 0;
      // the slide along the wall (the stance side is the travel's), constant pace
      vx = rx * w.side * sl;
      vz = rz * w.side * sl;
      sp = Math.abs(sl);
      px += vx * DT;
      pz += vz * DT;
      yaw = yaw0;
    } else if (!sc.trav) {
      const mv = sc.move;
      if (mv) {
        const a = yaw0 + (mv.deg * Math.PI) / 180;
        mi.vx = Math.sin(a) * mv.speed;
        mi.vz = Math.cos(a) * mv.speed;
      } else mi.vx = mi.vz = 0;
      mi.aiming = aiming;
      mi.faceTravel = !aiming;
      mi.yaw = yaw0;
      mi.ct = true;
      mi.crouch = crouch;
      mi.mocapSide = LOCO.mocap && LOCO.set.strafeL !== null && LOCO.set.strafeR !== null;
      motion.step(DT, mi, MOVEMENT);
      vx = motion.outX;
      vz = motion.outZ;
      px += vx * DT;
      pz += vz * DT;
      yaw = motion.yaw;
      sp = Math.hypot(vx, vz);
    }
    if (sc.trav?.rate) travT = (travT + sc.trav.rate * DT) % 1;
    stillT = crouch > 0.5 && sp < 0.15 ? stillT + DT : 0;
    // the controller's kneel (`kneelStill`: 0.35 s aiming, else 0.05 s)
    const kneel = crouch > 0.5 && stillT > (aiming ? 0.35 : 0.05) && !sc.trav && sc.crouchFix === undefined;
    // ---- the model's input (what PlayerTarget / RemotePlayer give it)
    inp.x = px;
    inp.y = 0;
    inp.z = pz;
    inp.yaw = yaw;
    inp.crouch = crouch;
    inp.kneel = kneel;
    inp.speed = sp;
    inp.strafe = sp > 0.01 ? Math.abs(vx * Math.cos(yaw) - vz * Math.sin(yaw)) / sp : 0;
    inp.drawn = drawn;
    inp.raise = raise;
    inp.pitch = sc.pitch ?? 0;
    inp.wall = !!w;
    inp.wallSide = w ? w.side : 0;
    inp.peek = peekShare(peek);
    inp.traverse = sc.trav ? sc.trav.kind : 'none';
    inp.traverseT = travT;
    inp.tumble = sc.trav?.tumble ?? 0;
    playerBody(inp, out);
    // ---- the render frame (player.ts frameUpdate)
    const root = rig.root;
    root.position.set(px, 0, pz);
    const visGoal = w ? yaw + wallYawOffset(crouch, w.side) : yaw;
    visYaw = visYaw + Math.max(-12 * DT, Math.min(12 * DT, wrapPi(visGoal - visYaw)));
    root.rotation.y = visYaw;
    let lean = 0;
    if (w) {
      const push = wallRootPush(STANDOFF, p.bodyDepthHalf, Math.max(Math.abs(Math.sin(visYaw - yaw0)), Math.abs(rig.shoulderTurnSin(nx, nz))), p.shoulderHalf, crouch);
      root.position.x -= nx * push;
      root.position.z -= nz * push;
      const pe = peek * peek * (3 - 2 * peek);
      root.position.x += rx * w.side * WALL.peekStep * pe;
      root.position.z += rz * w.side * WALL.peekStep * pe;
      lean = w.side * WALL.peekLean * pe;
      wallHandPoint(px, 0, pz, nx, nz, -rx, -rz, face, rig.weaponHand, crouch, wallHand);
      rig.wallHand = wallHand as never;
    } else rig.wallHand = null;
    const visOff = wrapPi(visYaw - yaw);
    const cs = Math.cos(visYaw);
    const sn = Math.sin(visYaw);
    rp.speed = sp;
    rp.localX = sp > 0.01 ? (vx * cs - vz * sn) / sp : 0;
    rp.localZ = sp > 0.01 ? (vx * sn + vz * cs) / sp : 0;
    rp.grounded = true;
    rp.crouch = crouch;
    rp.kneel = kneel;
    rp.aim = raise;
    rp.aimPitch = (sc.pitch ?? 0) * raise;
    rp.aimYaw = 0;
    rp.lookYaw = 0;
    rp.lookPitch = 0;
    rp.armed = drawn;
    rp.carry = carry;
    rp.weight = 1;
    rp.wall = !!w;
    rp.wallSide = w ? w.side : 0;
    rp.wallNx = nx;
    rp.wallNz = nz;
    rp.wallFace = face;
    rp.wallTurn = w ? Math.abs(Math.sin(visYaw - yaw0)) : 0;
    rp.lean = lean;
    if (w) {
      const mk = wallMoveK(sp);
      rp.lookYaw = wallHeadYaw(w.side, mk, crouch, visOff, raise, Math.abs(lean) / WALL.peekLean);
      rp.lookPitch = -WALL_LOOK_PITCH * mk * (1 - raise);
    }
    rp.traverse = sc.trav ? sc.trav.kind : 'none';
    rp.traverseT = travT;
    rp.tumble = sc.trav?.tumble ?? 0;
    const sideOn = !!w && (rp.wallTurn ?? 0) > 0.5;
    const free = !w && !sc.trav;
    rp.phase = sideOn || !free ? -1 : motion.phase;
    rp.motion = free ? motion.state : w && sp > 0.01 ? 'move' : 'idle';
    rp.motionT = free ? motion.stateT : 1;
    rp.quickStop = free ? 0.12 : 0;
    rp.holdSpeed = 0;
    rp.accelFwd = free ? motion.ax * sn + motion.az * cs : 0;
    rp.accelSide = free ? motion.ax * cs - motion.az * sn : 0;
    rp.velX = vx;
    rp.velZ = vz;
    rp.goalYaw = free ? motion.goalYaw : yaw;
    rp.stride = free && raise <= 0.5 ? 'facing' : 'velocity';
    rp.faceGoal = free ? motion.faceGoal : 0;
    rp.restX = px;
    rp.restZ = pz;
    env.tune.tuneBegin(rp as never, rig as never, DT);
    try {
      rig.animate(DT, rp);
    } finally {
      env.tune.tuneEnd(rig as never);
    }
    if (f < start) continue;
    // ---- sample: the rig's joints and the model's, in the capsule frame
    const tt = (f - start) * DT;
    readLocal(rig.hips.computeWorldMatrix(true).m, px, pz, yaw, rigL, 0);
    readLocal(rig.torso.computeWorldMatrix(true).m, px, pz, yaw, rigL, 3);
    readLocal(rig.neck.computeWorldMatrix(true).m, px, pz, yaw, rigL, 6);
    readLocal(rig.headNode.computeWorldMatrix(true).m, px, pz, yaw, rigL, 9);
    toLocal(out.pelvis, px, pz, yaw, simL, 0);
    toLocal(out.chest, px, pz, yaw, simL, 3);
    toLocal(out.neck, px, pz, yaw, simL, 6);
    toLocal(out.head, px, pz, yaw, simL, 9);
    for (let j = 0; j < 4; j++) {
      const e = Math.hypot(rigL[j * 3]! - simL[j * 3]!, rigL[j * 3 + 1]! - simL[j * 3 + 1]!, rigL[j * 3 + 2]! - simL[j * 3 + 2]!);
      worst[j] = Math.max(worst[j]!, e);
      sum[j] = sum[j]! + e;
    }
    for (let k = 0; k < 12; k++) {
      rigMean[k] = rigMean[k]! + rigL[k]!;
      simMean[k] = simMean[k]! + simL[k]!;
    }
    n++;
    onFrame?.({ t: tt, rig: rigL.slice(), sim: simL.slice(), inp: { ...inp } });
  }
  for (let k = 0; k < 12; k++) {
    rigMean[k] = rigMean[k]! / n;
    simMean[k] = simMean[k]! / n;
  }
  const mean = new Float64Array(4);
  for (let j = 0; j < 4; j++) mean[j] = sum[j]! / n;
  return { worst, mean, rigMean, simMean };
}

function readLocal(m: ArrayLike<number>, px: number, pz: number, yaw: number, out: Float64Array, o: number): void {
  tmpV.x = m[12]!;
  tmpV.y = m[13]!;
  tmpV.z = m[14]!;
  toLocal(tmpV, px, pz, yaw, out, o);
}

function toLocal(v: { x: number; y: number; z: number }, px: number, pz: number, yaw: number, out: Float64Array, o: number): void {
  const dx = v.x - px;
  const dz = v.z - pz;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  out[o] = dx * c - dz * s;
  out[o + 1] = v.y;
  out[o + 2] = dx * s + dz * c;
}

export type { PlayerBodyOut };

// ---- the fit sweep (`tests/playerVolumesSweep.test.ts`, `scripts/player-body-fit.mjs`)

/** A sweep scenario and where its mean goes: table `tab`, row `row`, minus the base row `base` (`TAB:row`) if given;
 *  scenarios with one key are averaged. */
export interface SweepSc extends PSc {
  tab: string;
  row: number;
  base?: string;
}

export const FIT_C5 = [0, 0.25, 0.5, 0.75, 1];
export const FIT_C3 = [0, 0.5, 1];
export const FIT_CW = [0, 0.35, 0.6, 0.85, 1];
export const FIT_P5 = [-0.5, -0.25, 0, 0.25, 0.5];
export const FIT_PE3 = [0, 0.5, 1];
export const FIT_T9 = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
export const SP_STAND = [0.75, 1.4, 2.1, 3, 4];
export const SP_CROUCH = [0.85, 1.3, 1.7, 2.15, 2.6];
export const SP_AIM = [0.5, 1, 1.4];
export const SP_WALL0 = [0.2, 0.39];
export const SP_WALL1 = [0.25, 0.55];
export const TRAV_CYCLIC: readonly { kind: TraverseKind; tumble?: number }[] = [
  { kind: 'hang' },
  { kind: 'climb' },
  { kind: 'pipeClimb' },
  { kind: 'crawl' },
  { kind: 'rappel' },
  { kind: 'split' },
  { kind: 'brace' },
  { kind: 'pipeLegs', tumble: -Math.PI / 2 },
  { kind: 'pipeInv', tumble: Math.PI },
];
export const TRAV_PHASED: readonly TraverseKind[] = ['vault', 'mantle', 'step', 'drop', 'hop', 'roll', 'windowVault', 'climbUp', 'ventDrop', 'crawlOut', 'wallKick'];

export function sweepScenarios(mocap = true): SweepSc[] {
  const L: SweepSc[] = [];
  const S = 1.5;
  const W = 1;
  // free, still: holstered / drawn low over the crouch blend (forced knots), the kneel (crouched, still)
  for (const [tab, drawn] of [['STILL_H', false], ['STILL_L', true]] as const) {
    FIT_C5.forEach((c, i) => L.push({ id: `${tab} c${c}`, tab, row: i, settle: S, len: W, crouch: c > 0.5 ? 1 : 0, crouchFix: c, drawn, raise: 0 }));
    L.push({ id: `${tab.replace('STILL', 'KNEEL')}`, tab: tab.replace('STILL', 'KNEEL'), row: 0, base: `${tab}:4`, settle: S, len: W, crouch: 1, drawn, raise: 0 });
  }
  // raised: crouch x pitch, the kneel per pitch
  FIT_C3.forEach((c, ci) =>
    FIT_P5.forEach((p, pi) => L.push({ id: `STILL_A c${c} p${p}`, tab: 'STILL_A', row: ci * 5 + pi, settle: S, len: W, crouch: c > 0.5 ? 1 : 0, crouchFix: c, drawn: true, raise: 1, pitch: p })),
  );
  FIT_P5.forEach((p, pi) => L.push({ id: `KNEEL_A p${p}`, tab: 'KNEEL_A', row: pi, base: `STILL_A:${10 + pi}`, settle: S, len: W, crouch: 1, drawn: true, raise: 1, pitch: p }));
  // free, moving: forward per class and stance (holstered / low: the facing stride; raised: the four directions)
  for (const [tab, drawn, c, sps] of [
    ['MOVE_H0', false, 0, SP_STAND],
    ['MOVE_H1', false, 1, SP_CROUCH],
    ['MOVE_L0', true, 0, SP_STAND],
    ['MOVE_L1', true, 1, SP_CROUCH],
  ] as const)
    sps.forEach((v, i) => L.push({ id: `${tab} v${v}`, tab, row: i, base: `${drawn ? 'STILL_L' : 'STILL_H'}:${c ? 4 : 0}`, settle: 2, len: 1.5, crouch: c, drawn, raise: 0, move: { deg: 0, speed: v }, mocap }));
  for (const c of [0, 1])
    SP_AIM.forEach((v, i) => {
      for (const deg of [0, 90, -90, 180]) L.push({ id: `MOVE_A v${v} c${c} d${deg}`, tab: `MOVE_A${deg === 0 || deg === 180 ? 'F' : 'S'}${c}`, row: i, base: `STILL_A:${c ? 12 : 2}`, settle: 2, len: 1.5, crouch: c, drawn: true, raise: 1, move: { deg, speed: v }, mocap });
    });
  // the wall: crouch x peek per class (right side), the slide per stance (holstered)
  for (const [tab, drawn] of [['WALL_H', false], ['WALL_D', true]] as const)
    FIT_CW.forEach((c, ci) =>
      FIT_PE3.forEach((pe, pi) => {
        // the eased peek whose smoothstep is the knot is the knot itself at 0, 0.5 and 1; standing and the crouch (the
        // side-on kneel) as the game holds them, the knots between forced
        L.push({ id: `${tab} c${c} pe${pe}`, tab, row: ci * 3 + pi, settle: S, len: W, crouch: c > 0.5 ? 1 : 0, crouchFix: c > 0 && c < 1 ? c : undefined, drawn, wall: { side: 1, peekFix: pe } });
      }),
    );
  for (const [tab, c, sps] of [['SLIDE_0', 0, SP_WALL0], ['SLIDE_1', 1, SP_WALL1]] as const)
    sps.forEach((v, i) => L.push({ id: `${tab} v${v}`, tab, row: i, base: `WALL_H:${c ? 12 : 0}`, settle: S, len: 1.5, crouch: c, wall: { side: 1, slide: v } }));
  // the traversal families: a cyclic family's mean over two cycles, a phased one held at each knot
  for (const t of TRAV_CYCLIC) L.push({ id: `TRAV ${t.kind}`, tab: `TRAV_${t.kind}`, row: 0, settle: 1, len: 2, crouch: 0, trav: { kind: t.kind, t: 0, rate: 1, tumble: t.tumble } });
  for (const k of TRAV_PHASED) FIT_T9.forEach((t, i) => L.push({ id: `TRAV ${k} t${t}`, tab: `TRAV_${k}`, row: i, settle: 0.6, len: 0.3, crouch: 0, trav: { kind: k, t } }));
  return L;
}
