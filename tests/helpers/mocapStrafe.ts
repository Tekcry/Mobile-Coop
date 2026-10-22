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
import type { Mode } from './mocapPlayer';

const DT = 1 / 60;

/** The stick at time t: the wanted velocity in the body's frame (m/s; x right, z forward); `aim` the raise (default 1). */
export interface AimStick { x: number; z: number; aim?: number }
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
export async function aimRun(target: AimTarget, steps: number, recFrom: number, mode: Mode, onStep?: (rig: CharacterRig, k: number) => void, carrier = true): Promise<Rec> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, TransformNode, Quaternion } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { defaultLook } = await import('../../src/cosmetics/avatarLook');
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
    for (let k = 0; k < steps; k++) {
      const t = k * DT;
      const s = target(t);
      mi.vx = s.x;
      mi.vz = s.z;
      mi.yaw = 0;
      drv.step(DT, mi);
      rig.root.rotation.y = 0;
      rig.root.position.x += drv.outX * DT;
      rig.root.position.z += drv.outZ * DT;
      const sp = Math.hypot(drv.outX, drv.outZ);
      p.speed = sp;
      p.localX = sp > 0.01 ? drv.outX / sp : 0;
      p.localZ = sp > 0.01 ? drv.outZ / sp : 0;
      p.aim = s.aim ?? 1;
      p.phase = drv.phase;
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
      R.yaw.push(0);
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
