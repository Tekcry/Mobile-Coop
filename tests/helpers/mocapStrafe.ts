/**
 * (mocap-trial-2, strafe) The aimed strafe on a headless Wren rig, driven the way player.ts drives an aiming carrier: a
 * gun in hand raised (`aim` 1, the drawn keyed set's glide), stride 'velocity', the body held on the aim (yaw 0), the
 * velocity from the game's own MotionDriver (Chaos Theory, aiming: the stick's direction at once, the pace through CT's
 * spring) and its gait clock as the rig's `phase`. Records what tests/helpers/mocapMeasure.ts records (`Rec`), so
 * mocapPlayer's measures (pelvis beyond pace x dt, bone / ankle-toe steps, planted contact slide) read it.
 */
import { setMocapLocomotion } from '../../src/anim/mocap';
import { MotionDriver, emptyMotionInput } from '../../src/anim/motion';
import { CT } from '../../src/config/movement';
import { HEEL_BACK, HEEL_DOWN, TOE_BALL } from '../../src/anim/footGeom';
import type { CharacterRig, RigPose } from '../../src/player/characterRig';
import { JOINTS, type Rec } from './mocapMeasure';
import { KNEEL_STILL } from '../../src/player/playerController';
import { wallTurnRate, wallYawOffset } from '../../src/player/wallController';
import type { Mode } from './mocapPlayer';

const DT = 1 / 60;
const wrapPi = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** The stick at time t: the wanted velocity in the body's frame (m/s; x right, z forward); `aim` the raise (default 1). */
/** `mocap` (mode 'on' only): the switch this frame (a toggle mid-run; the carrier's driver follows it). */
export interface AimStick { x: number; z: number; aim?: number; mocap?: boolean; crouch?: number }
/** (afp AF0) `crouch` 0 / 1: the stance asked (eased over 0.22 s as player.ts eases it); crouched with the stick still for
 *  KNEEL_STILL the carrier kneels (playerController.ts's rule). Under `AimOpts.wall` the stick's x is the slide along the
 *  wall (m/s). `AimOpts.weight`: the weapon mass factor (1 rifle, 0.7 pistol); `AimOpts.wall`: a drawn back-to-wall slide
 *  (the wall behind the root, outward normal +z, the body side-on as the crouch blends in, `aim` defaulting to 0). */
export interface AimOpts { weight?: number; wall?: boolean }
export type AimTarget = (t: number) => AimStick;

function contactPts(n: CharacterRig['ankleL'], heel: number[], ball: number[]): void {
  const m = n.computeWorldMatrix(true).m;
  const ly = Math.hypot(m[4]!, m[5]!, m[6]!) || 1;
  const lz = Math.hypot(m[8]!, m[9]!, m[10]!) || 1;
  const y = -HEEL_DOWN;
  for (const [z, out] of [[-HEEL_BACK, heel], [TOE_BALL, ball]] as const) out.push(m[12]! + (m[4]! / ly) * y + (m[8]! / lz) * z, m[13]! + (m[5]! / ly) * y + (m[9]! / lz) * z, m[14]! + (m[6]! / ly) * y + (m[10]! / lz) * z);
}

/** Run an aimed plan for `steps` 60 Hz steps, recording from `recFrom` s; mode 'off' / 'on' (the switch); `carrier` false:
 *  a guard-style rig (the switch must not reach it; its driver never asks the mocap side-step). */
export async function aimRun(target: AimTarget, steps: number, recFrom: number, mode: Mode, onStep?: (rig: CharacterRig, k: number) => void, carrier = true, opts: AimOpts = {}): Promise<Rec> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, TransformNode, Quaternion } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { defaultLook } = await import('../../src/player/avatarLook');
  const { operatorRig } = await import('../../src/operators/runtime/playerFigure');
  setMocapLocomotion(mode === 'on');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const random = Math.random;
  let seed = 777;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pos = {} as Record<(typeof JOINTS)[number], number[]>;
  for (const j of JOINTS) pos[j] = [];
  const R: Rec = { n: 0, pos, root: [], yaw: [], speed: [], contactL: [], contactR: [], targetL: [], targetR: [], landL: [], landR: [], cycleTime: [], clipOn: [], share: [], zk: [], gaze: [], heelL: [], ballL: [], heelR: [], ballR: [], heldL: [], heldR: [] };
  try {
    const op = operatorRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook(), 'measure');
    const rig: CharacterRig = op.rig;
    rig.carrier = carrier;
    const gun = new TransformNode('gun', scene);
    gun.parent = rig.weaponPivot;
    gun.rotationQuaternion = Quaternion.Identity();
    rig.heldWeapon = gun;
    const p: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 1, kick: 0, armed: true, aimYaw: 0, stride: 'velocity' };
    const drv = new MotionDriver(0);
    const mi = emptyMotionInput();
    mi.ct = true;
    mi.aiming = true;
    mi.faceTravel = true;
    mi.mocapSide = mode === 'on' && carrier;
    p.weight = opts.weight ?? 1;
    let crouchK = 0, stillT = 0, visYaw = 0, wallSide = 1;
    for (let k = 0; k < steps; k++) {
      const t = k * DT;
      const s = target(t);
      if (mode === 'on' && s.mocap !== undefined) {
        setMocapLocomotion(s.mocap);
        mi.mocapSide = s.mocap && carrier;
      }
      const cw = s.crouch ?? 0;
      crouchK = Math.max(0, Math.min(1, crouchK + (cw > crouchK ? 1 : cw < crouchK ? -1 : 0) * DT / 0.22));
      const cs = crouchK * crouchK * (3 - 2 * crouchK);
      if (cs > 0) mi.crouch = cs;
      mi.vx = s.x;
      mi.vz = opts.wall ? 0 : s.z;
      if (opts.wall) {
        if (Math.abs(s.x) > 0.05) wallSide = s.x > 0 ? 1 : -1;
        const d = wrapPi(wallYawOffset(cs, wallSide) - visYaw);
        const mx = wallTurnRate(Math.abs(d), true, true, cs) * DT;
        visYaw += Math.max(-mx, Math.min(mx, d));
      }
      mi.yaw = visYaw;
      drv.step(DT, mi);
      rig.root.rotation.y = visYaw;
      rig.root.position.x += drv.outX * DT;
      rig.root.position.z += drv.outZ * DT;
      const sp = Math.hypot(drv.outX, drv.outZ);
      const cy = Math.cos(visYaw);
      const sy = Math.sin(visYaw);
      p.speed = sp;
      p.localX = sp > 0.01 ? (drv.outX * cy - drv.outZ * sy) / sp : 0;
      p.localZ = sp > 0.01 ? (drv.outX * sy + drv.outZ * cy) / sp : 0;
      p.crouch = cs;
      stillT = cw > 0.5 && Math.hypot(s.x, s.z) < 0.05 && drv.state === 'idle' ? stillT + DT : 0;
      p.kneel = stillT > KNEEL_STILL;
      p.aim = s.aim ?? (opts.wall ? 0 : 1);
      if (opts.wall) {
        p.wall = true;
        p.wallSide = wallSide;
        p.wallNx = 0;
        p.wallNz = 1;
        p.wallFace = -0.3;
        p.wallTurn = Math.abs(sy);
      }
      p.phase = opts.wall && Math.abs(sy) > 0.5 ? -1 : drv.phase;
      p.motion = drv.state;
      p.motionT = drv.stateT;
      p.quickStop = CT.stopBlend;
      p.holdSpeed = 0;
      p.accelFwd = drv.az;
      p.accelSide = drv.ax;
      p.velX = drv.outX;
      p.velZ = drv.outZ;
      p.goalYaw = drv.goalYaw;
      p.faceGoal = drv.faceGoal;
      rig.animate(DT, p);
      onStep?.(rig, k);
      if (t < recFrom) continue;
      for (const j of JOINTS) {
        const m = rig[j].computeWorldMatrix(true).m;
        pos[j].push(m[12]!, m[13]!, m[14]!);
      }
      R.n++;
      R.root.push(rig.root.position.x, rig.root.position.y, rig.root.position.z);
      R.yaw.push(visYaw);
      R.speed.push(sp);
      const PL = rig.planner;
      R.contactL.push(PL.L.contact ? 1 : 0);
      R.contactR.push(PL.R.contact ? 1 : 0);
      R.targetL.push(PL.L.contact ? PL.L.x : NaN, PL.L.contact ? PL.L.z : NaN);
      R.targetR.push(PL.R.contact ? PL.R.x : NaN, PL.R.contact ? PL.R.z : NaN);
      if (PL.L.landed) R.landL.push(PL.L.x, PL.L.z);
      if (PL.R.landed) R.landR.push(PL.R.x, PL.R.z);
      R.heldL.push(PL.L.anchored ? 1 : 0);
      R.heldR.push(PL.R.anchored ? 1 : 0);
      contactPts(rig.ankleL, R.heelL, R.ballL);
      contactPts(rig.ankleR, R.heelR, R.ballR);
      const o = rig.graph.out;
      R.cycleTime.push(o.gait.cycleTime);
      R.clipOn.push(o.clipFeet.valid && o.clipFeet.on ? 1 : 0);
      R.share.push(o.keyMocap);
      R.zk.push(0);
      R.gaze.push(0);
    }
    op.figure.dispose();
    rig.dispose();
  } finally {
    Math.random = random;
    scene.dispose();
    setMocapLocomotion(false);
  }
  return R;
}

/** The aimed stick plans the strafe checks run (name, target, steps, record from s): steady strafes, CT starts / stops
 *  (moving 1.5 s of every 3 s), L <-> R flips, snaps off the strafe onto forward / back. */
export const STRAFE_PLANS = {
  steady: (sg: number, v: number): [AimTarget, number, number] => [() => ({ x: sg * v, z: 0 }), 300, 2],
  startStop: (sg: number, v: number): [AimTarget, number, number] => [(t) => ({ x: t > 1 && t % 3 < 1.7 && t % 3 > 0.2 ? sg * v : 0, z: 0 }), 600, 0.5],
  flip: (v: number, per: number): [AimTarget, number, number] => [(t) => ({ x: Math.floor(t / per) % 2 ? v : -v, z: 0 }), 420, 1],
  snap: (sg: number, fwd: number): [AimTarget, number, number] => [(t) => (Math.floor(t / 1.5) % 2 ? { x: 0, z: fwd } : { x: sg * 0.7, z: 0 }), 480, 1],
};

/** (afp AF0) Crouched aimed plans (`crouch` 1 from t = 0, eased in; pass `AimOpts.weight` 0.7 for the pistol) and the drawn
 *  crouched back-to-wall slide (pass `{ wall: true }`; `wallSlide`: steady, `wallReverse`: the slide reverses every `per` s).
 *  [target, steps, record from s]: the crouch settles before the record starts. */
export const CROUCH_PLANS = {
  steady: (sg: number, v: number): [AimTarget, number, number] => [() => ({ x: sg * v, z: 0, crouch: 1 }), 420, 2],
  /** `n` stop-go cycles: the stick on `on` s, off `off` s (the carrier kneels each stop). */
  stopGo: (sg: number, v: number, n = 10, on = 1.0, off = 0.8): [AimTarget, number, number] => [
    (t) => ({ x: t > 1 && (t - 1) % (on + off) < on ? sg * v : 0, z: 0, crouch: 1 }),
    Math.round(60 * (1 + n * (on + off) + 0.5)),
    1,
  ],
  /** L <-> R flips every `per` s through the stick's centre: `gap` s of zero between (a thumb crossing the dead zone). */
  flip: (v: number, per: number, gap = 0.15): [AimTarget, number, number] => [
    (t) => {
      const u = t % per;
      return { x: u < gap || t < 1 ? 0 : Math.floor(t / per) % 2 ? v : -v, z: 0, crouch: 1 };
    },
    480,
    1,
  ],
  wallSlide: (sg: number, v: number): [AimTarget, number, number] => [(t) => ({ x: t < 1 ? 0 : sg * v, z: 0, crouch: 1 }), 360, 2],
  wallReverse: (v: number, per = 1.4): [AimTarget, number, number] => [(t) => ({ x: t < 1 ? 0 : Math.floor((t - 1) / per) % 2 ? -v : v, z: 0, crouch: 1 }), 480, 1.5],
};

/** The feet's smallest sideways gap (m): the right ankle's x less the left's (the body faces +z: under 0 they cross). */
export function footGap(R: Rec): number {
  let m = Infinity;
  for (let i = 0; i < R.n; i++) m = Math.min(m, R.pos.ankleR[i * 3]! - R.pos.ankleL[i * 3]!);
  return m;
}

/** The largest ankle move in one frame (m), either foot: a swing foot that jumps (a re-aimed target) reads here. */
export function ankleJump(R: Rec): number {
  let m = 0;
  for (const A of [R.pos.ankleL, R.pos.ankleR]) {
    for (let i = 1; i < R.n; i++) m = Math.max(m, Math.hypot(A[i * 3]! - A[i * 3 - 3]!, A[i * 3 + 1]! - A[i * 3 - 2]!, A[i * 3 + 2]! - A[i * 3 - 1]!));
  }
  return m;
}
