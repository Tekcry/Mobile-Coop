/**
 * (anim-natural N1, n138 fix) The e2e-anim "turn feet" block's no-crossing check on a headless Wren rig (operatorRig: the
 * Body base's trackMul 0.05 puts the feet near one line, which tests/footTurnHarness.ts does not model), driven as the
 * e2e drives the player: still, the planner re-initialised, ~1 s forward from a standstill, then the stick turned
 * (60 Hz sim time; the body's visual turn rate-limited at 12 rad/s as player.ts does). Measured as e2e-anim measures:
 * the planner feet's lateral gap in the body (root yaw) frame whenever they are within 25 cm front to back, and the
 * first three swing frames' foot speed. Train 8 (e2e-anim): "run 90 (3.95 m/s) ... least gap -17.4 cm"; headless the
 * same crossing at nearby speeds and turn angles (a left foot swung into a right turn, pushed out of the pelvis-frame
 * window on alternate frames): run 90 at 3.92 m/s -15.6 cm, an 85 deg run turn -15.9 cm, the jog stick sweep -30.6 cm.
 */
import { describe, expect, it } from 'vitest';
import type { CharacterRig, RigPose } from '../src/player/characterRig';
import { emptyMotionInput, MotionDriver } from '../src/anim/motion';
import { CT } from '../src/config/movement';
import { gearCap, stickCurve, stickSpeed } from '../src/player/speedGears';
import { speedPaceMul } from '../src/player/speedTune';

interface Plan {
  gear: number;
  /** The stick's turn (deg, right) or a sweep (rad/s from straight ahead). */
  deg?: number;
  sweep?: number;
  /** Forward travel before the turn (s) and the window after it (s). */
  pre: number;
  sec: number;
  /** The run's pace scale (the in-game pace reads 3.95 m/s at gear 5). */
  vMul: number;
}

interface Out {
  /** Least lateral gap (m, body frame) while within 25 cm front to back; the first swing frames' peak speed (m/s). */
  gap: number;
  snap: number;
}

type MakeRig = () => { rig: CharacterRig; figure: { dispose(): void } };

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

function turnRec(mk: MakeRig, o: Plan): Out {
  const op = mk();
  const rig = op.rig as CharacterRig & { carrier: boolean };
  rig.carrier = true;
  const y0 = -Math.PI / 2;
  rig.root.position.set(12, 0, -14);
  rig.root.rotation.y = y0;
  const d = new MotionDriver(y0);
  const mi = emptyMotionInput();
  const p: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' };
  const DT = 1 / 60;
  const v0 = Math.min(gearCap(o.gear, false), stickSpeed(stickCurve(1), false));
  const v = v0 * speedPaceMul(v0, false) * o.vMul;
  let visYaw = y0;
  const out: Out = { gap: Infinity, snap: 0 };
  const st = [0, 1].map(() => ({ on: false, n: 0, px: 0, pz: 0, lifted: false }));
  const step = (dir: number | null, sample: boolean): void => {
    mi.ct = true;
    mi.faceTravel = true;
    mi.aiming = false;
    mi.crouch = 0;
    mi.yaw = d.yaw;
    mi.vx = dir === null ? 0 : Math.sin(dir) * v;
    mi.vz = dir === null ? 0 : Math.cos(dir) * v;
    d.step(DT, mi);
    rig.root.position.x += d.outX * DT;
    rig.root.position.z += d.outZ * DT;
    // player.ts: the posed body turns at most WALL_TURN_RATE (12 rad/s) once it is more than 0.05 rad off the capsule
    const dd = wrap(d.yaw - visYaw);
    visYaw = Math.abs(dd) > 0.05 ? wrap(visYaw + Math.max(-12 * DT, Math.min(12 * DT, dd))) : d.yaw;
    rig.root.rotation.y = visYaw;
    p.speed = d.speed;
    p.localX = 0;
    p.localZ = d.speed > 0.01 ? 1 : 0;
    p.phase = d.phase;
    p.motion = d.state;
    p.motionT = d.stateT;
    p.quickStop = CT.stopBlend;
    p.velX = d.outX;
    p.velZ = d.outZ;
    p.goalYaw = d.goalYaw;
    p.faceGoal = d.faceGoal;
    p.accelFwd = d.ax * Math.sin(d.yaw) + d.az * Math.cos(d.yaw);
    p.accelSide = d.ax * Math.cos(d.yaw) - d.az * Math.sin(d.yaw);
    p.armed = false;
    p.weight = 1;
    rig.animate(DT, p);
    if (!sample) return;
    const L = rig.planner.L;
    const R = rig.planner.R;
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? L : R;
      const s = st[k]!;
      if (f.contact) {
        s.on = true;
        s.n = 0;
      } else {
        if (s.on) s.lifted = true;
        s.on = false;
        s.n++;
        if (s.lifted && s.n <= 3) out.snap = Math.max(out.snap, Math.hypot(f.x - s.px, f.z - s.pz) / DT);
      }
      s.px = f.x;
      s.pz = f.z;
    }
    const yaw = rig.root.rotation.y;
    const along = (L.x - R.x) * Math.sin(yaw) + (L.z - R.z) * Math.cos(yaw);
    if (Math.abs(along) < 0.25) out.gap = Math.min(out.gap, (R.x - L.x) * Math.cos(yaw) - (R.z - L.z) * Math.sin(yaw));
  };
  for (let k = 0; k < 96; k++) step(null, false);
  rig.planner.L.init = rig.planner.R.init = false;
  for (let k = 0; k < Math.round(o.pre * 60); k++) step(y0, false);
  const n = Math.round(o.sec * 60);
  for (let k = 1; k <= n; k++) step(o.sweep !== undefined ? y0 + (o.sweep * k) / 60 : y0 + ((o.deg ?? 0) * Math.PI) / 180, true);
  op.figure.dispose();
  rig.dispose();
  return out;
}

describe('(anim-natural N1, n138 fix) e2e-anim turn feet on the Wren rig: the feet never cross in the body frame', () => {
  it('run / jog turns and the jog sweep near the e2e phase keep >= 5 cm side by side (e2e-anim), first swing frames <= 5 m/s', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const { operatorRig } = await import('../src/operators/runtime/playerFigure');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const make = (a: Parameters<typeof lib.instance>[0], b: string, c?: Parameters<typeof lib.instance>[2]) => lib.instance(a, b, c);
    const mk: MakeRig = () => operatorRig(scene, make, defaultLook(), 'm');
    const random = Math.random;
    let seed = 12345;
    Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const rows: string[] = [];
    try {
      // the headless crossings on e6274d36 (body-frame least gap): run 90 at 0.98 x 1.000 s -15.6 cm, the run's 85 deg turn at
      // 1.000 s -15.9, run 90 at 0.9875 x 1.300 s -5.2, the jog sweep at 0.9875 x 1.683 s -30.6; plus the e2e's own rows
      const plans: [string, Plan][] = [
        ['run 90 x0.98 @1.000', { gear: 5, deg: 90, pre: 1.0, sec: 1.2, vMul: 0.98 }],
        ['run 85 @1.000', { gear: 5, deg: 85, pre: 1.0, sec: 1.2, vMul: 1 }],
        ['run 90 x0.9875 @1.300', { gear: 5, deg: 90, pre: 1.3, sec: 1.2, vMul: 0.9875 }],
        ['jog sweep 3 x0.9875 @1.683', { gear: 4, sweep: 3, pre: 1 + 41 / 60, sec: 1.5, vMul: 0.9875 }],
        ['run 90 @1.000', { gear: 5, deg: 90, pre: 1.0, sec: 1.2, vMul: 1 }],
        ['run 180 @1.000', { gear: 5, deg: 180, pre: 1.0, sec: 1.2, vMul: 1 }],
        ['jog 90 @1.000', { gear: 4, deg: 90, pre: 1.0, sec: 1.2, vMul: 1 }],
        ['jog 180 @1.000', { gear: 4, deg: 180, pre: 1.0, sec: 1.2, vMul: 1 }],
        ['jog sweep 3 @1.000', { gear: 4, sweep: 3, pre: 1.0, sec: 1.5, vMul: 1 }],
      ];
      for (const [name, plan] of plans) {
        seed = 12345;
        const r = turnRec(mk, plan);
        rows.push(`${name.padEnd(28)} least gap ${(r.gap * 100).toFixed(1)} cm, first swing frames ${r.snap.toFixed(2)} m/s`);
        expect(r.gap, `${name}: the feet never cross (${(r.gap * 100).toFixed(1)} cm)`).toBeGreaterThanOrEqual(0.05);
        expect(r.snap, `${name}: first swing frames`).toBeLessThanOrEqual(5);
      }
    } finally {
      Math.random = random;
      scene.dispose();
    }
    if (process.env.TURN_CROSS_PRINT) console.info(rows.join('\n'));
  });
});
