/**
 * (anim-natural N1, n138 fix) e2e-clip "crouched holstered", its first part on a headless Wren rig: the teleport (the posed
 * body turning onto the new facing at 12 rad/s, as player.ts does), 1.1 s standing, then crouched still for 3 s (the
 * squat: the stance re-steps out of the narrow standing one, Michael's trackMul 0.05, and the hands come down onto the
 * knees). 60 Hz sim, the rig at 120 Hz (alpha 0 / 0.5), measured as e2e-clip's limbCheck every 1/30 s: each upper arm and
 * forearm (tapered) against both thighs and the trunk. Train 8: "crouched holstered ... min -3.2 cm" (limit -3); headless
 * on e6274d36 the left foot re-stepped first and the right wrist went 2.83 cm into the right thigh (2.4 with the right
 * foot first).
 * (#138 fix round 4) KNEE_REST.fwd 0.01 -> 0.03 (the palm on the kneecap, ahead of the joint): the GPU e2e-clip run read -3.0
 * cm on 362359a4; headless every facing -2.42 to -2.56 -> -1.87 to -1.93 cm. Pinned at 2.1 cm (was 2.6).
 */
import { describe, expect, it } from 'vitest';
import type { CharacterRig, RigPose } from '../src/player/characterRig';
import { easeInOut, emptyMotionInput, MotionDriver } from '../src/anim/motion';
import { CT, MOVEMENT } from '../src/config/movement';

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
type P3 = { x: number; y: number; z: number };
/** Distance from P to the segment A -> B minus its tapered radius (e2e-clip `taper`). */
const taper = (P: P3, A: P3, B: P3, r0: number, r1: number): number => {
  const abx = B.x - A.x;
  const aby = B.y - A.y;
  const abz = B.z - A.z;
  const t = Math.max(0, Math.min(1, ((P.x - A.x) * abx + (P.y - A.y) * aby + (P.z - A.z) * abz) / (abx * abx + aby * aby + abz * abz || 1)));
  return Math.hypot(P.x - A.x - abx * t, P.y - A.y - aby * t, P.z - A.z - abz * t) - (r0 + (r1 - r0) * t);
};

describe('(anim-natural N1, n138 fix) crouching down holstered: the arms clear the thighs', () => {
  it('the squat entry from any facing: the arms never more than 2.1 cm into a thigh or the trunk (e2e-clip limit 3)', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Vector3 } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { defaultLook } = await import('../src/player/avatarLook');
    const { operatorRig } = await import('../src/operators/runtime/playerFigure');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const make = (a: Parameters<typeof lib.instance>[0], b: string, c?: Parameters<typeof lib.instance>[2]) => lib.instance(a, b, c);
    const random = Math.random;
    let seed = 12345;
    Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const rows: string[] = [];
    let worst = 9;
    try {
      // the teleport's turn from the last scenario's facing: every 45 deg (on e6274d36 the left foot went first from 0, 45,
      // 90, 180 and 270 deg: -2.81 to -2.84 cm; now -2.42 to -2.56)
      for (let k = 0; k < 8; k++) {
        seed = 12345;
        const op = operatorRig(scene, make, defaultLook(), 'm');
        const rig = op.rig as CharacterRig & { carrier: boolean };
        rig.carrier = true;
        const Y = Math.PI / 2;
        const d = new MotionDriver(Y);
        const mi = emptyMotionInput();
        const pose: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' };
        let visYaw = wrap(Y - (k * Math.PI) / 4);
        rig.root.position.set(0, 0, -14);
        rig.root.rotation.y = visYaw;
        let crouchK = 0;
        let crouched = false;
        let pyaw = Y;
        let pph = d.phase;
        const armSeg = [[rig.shoulderL, rig.elbowL, 0.045, 0.04], [rig.elbowL, rig.wristL, 0.04, 0.025], [rig.shoulderR, rig.elbowR, 0.045, 0.04], [rig.elbowR, rig.wristR, 0.04, 0.025]] as const;
        const ap = new Vector3();
        let min = 9;
        for (let s = 0; s < Math.round((1.1 + 3.0) * 60); s++) {
          if (s === Math.round(1.1 * 60)) crouched = true;
          pyaw = d.yaw;
          pph = d.phase;
          const rate = crouched ? 1 / MOVEMENT.crouchTime : 1 / MOVEMENT.standTime;
          crouchK = crouched ? Math.min(1, crouchK + rate / 60) : Math.max(0, crouchK - rate / 60);
          mi.ct = true;
          mi.faceTravel = true;
          mi.aiming = false;
          mi.crouch = easeInOut(crouchK);
          mi.yaw = d.yaw;
          mi.vx = mi.vz = 0;
          d.step(1 / 60, mi);
          for (const alpha of [0, 0.5]) {
            const ry = pyaw + wrap(d.yaw - pyaw) * alpha;
            const dd = wrap(ry - visYaw);
            visYaw = Math.abs(dd) > 0.05 ? wrap(visYaw + Math.max(-0.1, Math.min(0.1, dd))) : ry;
            rig.root.rotation.y = visYaw;
            let dph = d.phase - pph;
            if (dph < -0.5) dph += 1;
            Object.assign(pose, { speed: d.speed, localX: 0, localZ: 0, crouch: easeInOut(crouchK), phase: (pph + dph * alpha + 1) % 1, motion: d.state, motionT: d.stateT, quickStop: CT.stopBlend, velX: d.outX, velZ: d.outZ, goalYaw: d.goalYaw, faceGoal: d.faceGoal, stride: 'facing', armed: false, weight: 1 });
            rig.animate(1 / 120, pose);
          }
          if (!crouched || s % 2 !== 1) continue;
          for (const n of [rig.root, rig.hips, rig.neck, rig.hipL, rig.kneeL, rig.hipR, rig.kneeR, rig.shoulderL, rig.elbowL, rig.wristL, rig.shoulderR, rig.elbowR, rig.wristR]) n.computeWorldMatrix(true);
          const pv = rig.hips.getAbsolutePosition();
          const nk = rig.neck.getAbsolutePosition();
          for (const [A, B, r0, r1] of armSeg) {
            const a0 = A.getAbsolutePosition();
            const b0 = B.getAbsolutePosition();
            for (let q = 0; q <= 4; q++) {
              Vector3.LerpToRef(a0, b0, q / 4, ap);
              const r = r0 + ((r1 - r0) * q) / 4;
              for (const [H, K] of [[rig.hipL, rig.kneeL], [rig.hipR, rig.kneeR]] as const) min = Math.min(min, taper(ap, H.getAbsolutePosition(), K.getAbsolutePosition(), 0.075, 0.05) - r);
              if (B === rig.elbowL || B === rig.elbowR ? q >= 2 : true) min = Math.min(min, taper(ap, pv, nk, 0, 0) - 0.1 - r);
            }
          }
        }
        rows.push(`from ${k * 45} deg: ${(min * 100).toFixed(2)} cm`);
        worst = Math.min(worst, min);
        op.figure.dispose();
        rig.dispose();
      }
    } finally {
      Math.random = random;
      scene.dispose();
    }
    if (process.env.CROUCH_ENTRY_PRINT) console.info(rows.join('\n'));
    expect(worst, rows.join(', ')).toBeGreaterThan(-0.021);
  });
});
