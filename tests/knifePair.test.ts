/**
 * (piano-knife S1, BRIEF A14) The paired knife kill on headless rigs (Wren's operator rig and a real guard rig, as
 * `tests/mixamoTraverse.test.ts` / `tests/helpers/guardPoseGolden.ts` build them): each row sampled at 1/60 s with the
 * attacker walking 0.3 m/s and turning 0.5 rad/s through the whole move (attached, not placed once), in the game's
 * order (the contacts from the last drawn poses, then the attacker, then the guard pose):
 * - the grip palm within 3 cm of its mark from the end of the grab to `limp`;
 * - the knife tip within 3 cm of the row's target from contact to `limp`;
 * - each guard palm within 3 cm of its forearm mark from contact to `limp`;
 * - the guard's root at the row's offset (within 1 mm) from the end of the grab to `limp`;
 * - the corner row ends on the attacker's side (in front of him, his facing).
 */
import { describe, expect, it, vi } from 'vitest';
import type { RigPose } from '../src/player/characterRig';

// the knife's GLB is not loaded headless (the tip is the node's frame and `KNIFE_TIP`)
vi.mock('../src/weapons/weaponMesh', () => ({ loadWeaponMesh: () => false }));

const DT = 1 / 60;
const WALK = process.env.KP_STATIC ? 0 : 0.3;
const TURN = process.env.KP_STATIC ? 0 : 0.5;

interface RowResult {
  grip: number;
  tip: number;
  handR: number;
  handL: number;
  root: number;
  samples: number;
  endFwd: number;
  at: string;
}

async function runRow(row: number): Promise<RowResult> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../src/operators/runtime/playerFigure');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const { buildEnemyRig } = await import('../src/ai/enemyRig');
  const { WREN_HANDS } = await import('../src/operators/handFrame');
  const { KnifeModel } = await import('../src/weapons/knifeModel');
  const { newKillDrive } = await import('../src/anim/killDrive');
  const { TAKEDOWN } = await import('../src/game/takedown');
  const K = await import('../src/game/knifeKill');
  const P = await import('../src/game/knifePair');
  if (process.env.KP_GAIN) P.PAIR_TRACK.gain = +process.env.KP_GAIN;
  if (process.env.KP_PRED) P.PAIR_TRACK.predict = +process.env.KP_PRED;
  await K.loadKnifeClips();
  expect(K.knifeClipsReady()).toBe(true);
  const R = K.KNIFE_KILLS[row]!;
  const scene = new Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  const world = { parts, map: { theme: { faction: 'urban' } }, addShadowCaster: () => {} };
  const op = operatorRig(scene, (s, h, sl) => parts.instance(s, h, sl), defaultLook(), `knife-${R.id}`);
  const ar = op.rig;
  ar.tuneRows = !process.env.KP_NOTUNE;
  const { rig: vr, gun } = buildEnemyRig(scene, world as never, ENEMIES.grunt, `knife-guard-${R.id}`);
  gun?.setVisible(false);
  const knife = new KnifeModel(scene, ar, WREN_HANDS.R);
  knife.show(true);
  const aPose: RigPose = { speed: WALK, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' };
  const vPose: RigPose = { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' };
  const track = P.newPairTrack();
  const aD = newKillDrive();
  const vD = newKillDrive();
  aD.clip = K.knifeClip(row, false);
  vD.clip = K.knifeClip(row, true);
  vD.w = 1;
  vD.bucklePitch = K.bucklePitchOf(R) * (process.env.KP_BK ? +process.env.KP_BK : 1);
  // where the guard stood: the takedown's standoff ahead (from behind, corner: his back to her; front: facing her);
  // a corner guard stands off to her right, round the corner
  const fromX = R.id === 'corner' ? 0.45 : 0;
  const fromZ = TAKEDOWN.standoff;
  const fromYaw = R.id === 'front' ? Math.PI : R.id === 'corner' ? -Math.PI / 2 : 0;
  const approach = TAKEDOWN.approach;
  const total = approach + R.seconds;
  const out: RowResult = { grip: 0, tip: 0, handR: 0, handL: 0, root: 0, samples: 0, endFwd: 0, at: '' };
  const err = { grip: 0, tip: 0, handR: 0, handL: 0 };
  const vr0 = { x: 0, y: 0, z: 0, yaw: 0 };
  const random = Math.random;
  let seed = 4242;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  let ax = 0;
  let az = -0.6;
  let ayaw = 0;
  try {
    // a warm-up standing (the planners settle), then the move
    const WARM = 30;
    const N = Math.ceil(total / DT);
    ar.graph.kill = aD;
    vr.graph.kill = vD;
    for (let n = -WARM; n <= N; n++) {
      const t = Math.max(0, n) * DT;
      if (n > 0) {
        ax += Math.sin(ayaw) * WALK * DT;
        az += Math.cos(ayaw) * WALK * DT;
        ayaw += TURN * DT;
      }
      aPose.speed = n > 0 ? WALK : 0;
      ar.root.position.set(ax, 0, az);
      ar.root.rotation.y = ayaw;
      // the grab: the last `gripIn` share of the approach; then the move's clock
      const k = K.grabAt(t, approach);
      const kt = t - approach;
      const ph = kt > 0 ? kt / R.seconds : 0;
      const since = kt - R.contact * R.seconds;
      P.victimRoot(R, ax, 0, az, ayaw, k, fromX, fromZ - 0.6, fromYaw, vr0);
      vr.root.position.set(vr0.x, vr0.y, vr0.z);
      vr.root.rotation.y = vr0.yaw;
      aD.phase = ph;
      aD.w = (kt > 0 ? Math.min(1, kt / K.KNIFE.blendIn) : 0) * (process.env.KP_AW ? +process.env.KP_AW : 1);
      vD.phase = K.victimPhase(R, ph);
      vD.buckle = K.buckleAt(since);
      const wGrip = ph >= R.limp ? 0 : K.handsAt(t, approach);
      P.attackerHands(R, ph, since, ar, vr, knife, wGrip, track);
      if (ph < R.limp) P.victimHands(R, since, ar, vr, track);
      ar.animate(DT, aPose);
      vr.animate(DT, vPose);
      if (n < 0 || ph >= R.limp) continue;
      P.contactErrors(R, ar, vr, knife, err);
      if (process.env.KP_TRACE) {
        const dbg = (rig: typeof ar, side: number) => {
          const t = side > 0 ? rig.reachR : rig.reachL;
          const S = (side > 0 ? rig.shoulderR : rig.shoulderL).computeWorldMatrix(true).getTranslation();
          const W = (side > 0 ? rig.wristR : rig.wristL).computeWorldMatrix(true).getTranslation();
          const d = Math.sqrt((t.x - S.x) ** 2 + (t.y - S.y) ** 2 + (t.z - S.z) ** 2);
          const b = rig.p.hand.len * 0.45 / d;
          const iw = { x: t.x - (t.x - S.x) * b, y: t.y - (t.y - S.y) * b, z: t.z - (t.z - S.z) * b };
          const we = Math.sqrt((W.x - iw.x) ** 2 + (W.y - iw.y) ** 2 + (W.z - iw.z) ** 2);
          return 'reach ' + (d * 100).toFixed(0) + '/' + ((rig.p.upperArm.len + rig.p.forearm.len + rig.p.hand.len * 0.45) * 100).toFixed(0) + ' wristErr ' + (we * 100).toFixed(1);
        };
        console.log('DBG', R.id, n, 'AL', dbg(ar, -1), 'AR', dbg(ar, 1), 'VR', dbg(vr, 1), 'VL', dbg(vr, -1));
      }
      if (process.env.KP_TRACE) console.log(R.id, n, ph.toFixed(2), 'g', (err.grip*100).toFixed(1), 't', (err.tip*100).toFixed(1), 'R', (err.handR*100).toFixed(1), 'L', (err.handL*100).toFixed(1), 'wL', ar.reachL.w.toFixed(2), 'vR', vr.reachR.w.toFixed(2));
      const pf = ar.root.position;
      const s = Math.sin(ar.root.rotation.y);
      const c = Math.cos(ar.root.rotation.y);
      const rx = pf.x + s * R.standoff + c * R.side;
      const rz = pf.z + c * R.standoff - s * R.side;
      const grabbed = t >= approach;
      if (grabbed) {
        out.samples++;
        const rd = Math.sqrt((vr.root.position.x - rx) ** 2 + (vr.root.position.z - rz) ** 2);
        if (rd > out.root) out.root = rd;
        if (err.grip > out.grip) {
          out.grip = err.grip;
          out.at = `grip n${n} ph${ph.toFixed(2)}`;
        }
      }
      if (since >= 0) {
        out.tip = Math.max(out.tip, err.tip);
        out.handR = Math.max(out.handR, err.handR);
        out.handL = Math.max(out.handL, err.handL);
      }
      // the guard's place in the attacker's frame: forward of him
      out.endFwd = (vr.root.position.x - pf.x) * s + (vr.root.position.z - pf.z) * c;
    }
  } finally {
    Math.random = random;
    knife.dispose();
    op.figure.dispose();
    ar.dispose();
    gun?.dispose();
    vr.dispose();
    scene.dispose();
  }
  return out;
}

describe('piano-knife S1: the paired knife kill on headless rigs', () => {
  for (let row = 0; row < 4; row++) {
    it(`row ${row}: grip, knife tip and his hands on their marks every frame, the guard attached`, async () => {
      const { KNIFE_KILLS, KNIFE } = await import('../src/game/knifeKill');
      const r = await runRow(row);
      const R = KNIFE_KILLS[row]!;
      console.info(`(piano-knife S1) ${R.id}: grip ${(r.grip * 100).toFixed(1)} cm (${r.at}), tip ${(r.tip * 100).toFixed(1)}, his hands R ${(r.handR * 100).toFixed(1)} L ${(r.handL * 100).toFixed(1)}, root ${(r.root * 1000).toFixed(2)} mm over ${r.samples} frames`);
      expect(r.samples).toBeGreaterThan(40);
      expect(r.grip).toBeLessThanOrEqual(KNIFE.contactTol);
      expect(r.tip).toBeLessThanOrEqual(KNIFE.contactTol);
      expect(r.handR).toBeLessThanOrEqual(KNIFE.contactTol);
      expect(r.handL).toBeLessThanOrEqual(KNIFE.contactTol);
      expect(r.root).toBeLessThanOrEqual(0.001);
      if (R.id === 'corner') expect(r.endFwd).toBeGreaterThan(0.2);
    }, 120_000);
  }
});
