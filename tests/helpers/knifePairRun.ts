/**
 * (piano-knife S2) The paired knife kill on headless rigs, shared by `tests/knifePair.test.ts` (the contact rule) and
 * `tests/knifePairFit.test.ts` (the one measuring run, KP_FIT=1). S1's `runRow`, moved out of `tests/knifePair.test.ts`
 * unchanged in behaviour: Wren's operator rig and a real guard rig (as `tests/mixamoTraverse.test.ts` /
 * `tests/helpers/guardPoseGolden.ts` build them) on a `NullEngine`, each row sampled at 1/60 s with the attacker walking
 * 0.3 m/s and turning 0.5 rad/s through the whole move, in the game's render order (her hands, she poses, his root and
 * hands off her drawn pose, he poses). A row override (the fit's candidates) replaces the row's numbers for the run.
 *
 * The caller mocks `../src/weapons/weaponMesh` (`vi.mock` is hoisted per test file): the knife's GLB is not loaded
 * headless (the tip is the node's frame and `KNIFE_TIP`).
 *
 * Plus two pure clip measures (no rig): `stabPhase` (the stab's full reach) and `standsUntil` (the victim still on his
 * feet).
 */
import type { RigPose } from '../../src/player/characterRig';
import type { KeyedClip } from '../../src/anim/keyed';
import type { KnifeKillRow } from '../../src/game/knifeKill';

const DT = 1 / 60;
const WALK = process.env.KP_STATIC ? 0 : 0.3;
const TURN = process.env.KP_STATIC ? 0 : 0.5;

/** Each contact's largest miss over its window (m): the grip palm from the end of the grab to `limp`, the knife tip and
 *  both guard palms from contact to `limp`; the guard root's largest offset error over the grab (m); the samples in the
 *  grip window, the guard's last place forward of the attacker (m) and where the worst grip miss fell. */
export interface RowResult {
  grip: number;
  tip: number;
  handR: number;
  handL: number;
  root: number;
  samples: number;
  endFwd: number;
  at: string;
}

/** A candidate's numbers for one run (the fit's grid). */
export type RowOverride = Partial<Pick<KnifeKillRow, 'standoff' | 'side' | 'contact' | 'limp' | 'victimTo' | 'attackerFrom' | 'attackerTo'>>;

/** The largest of the four contact maxima (the fit's score). */
export function worstContact(r: RowResult): number {
  return Math.max(r.grip, r.tip, r.handR, r.handL);
}

export async function runRow(row: number, override: RowOverride | null = null): Promise<RowResult> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { defaultLook } = await import('../../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../../src/operators/runtime/playerFigure');
  const { ENEMIES } = await import('../../src/ai/enemyDefs');
  const { buildEnemyRig } = await import('../../src/ai/enemyRig');
  const { WREN_HANDS } = await import('../../src/operators/handFrame');
  const { KnifeModel } = await import('../../src/weapons/knifeModel');
  const { newKillDrive } = await import('../../src/anim/killDrive');
  const { TAKEDOWN } = await import('../../src/game/takedown');
  const K = await import('../../src/game/knifeKill');
  const P = await import('../../src/game/knifePair');
  if (process.env.KP_GAIN) P.PAIR_TRACK.gain = +process.env.KP_GAIN;
  if (process.env.KP_PRED) P.PAIR_TRACK.predict = +process.env.KP_PRED;
  await K.loadKnifeClips();
  if (!K.knifeClipsReady()) throw new Error('knife clips not ready');
  const R: KnifeKillRow = override ? { ...K.KNIFE_KILLS[row]!, ...override } : K.KNIFE_KILLS[row]!;
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
      // (S2) the attacker's clip window at its own speed (`attackerPhase`, as the controller writes it)
      aD.phase = K.attackerPhase(R, ph);
      aD.w = (kt > 0 ? Math.min(1, kt / K.KNIFE.blendIn) : 0) * (process.env.KP_AW ? +process.env.KP_AW : 1);
      vD.phase = K.victimPhase(R, ph);
      vD.buckle = K.buckleAt(since);
      const wGrip = ph >= R.limp ? 0 : K.handsAt(t, approach);
      // the game's render order (`TakedownController.frameUpdate`, the player's frame, `frameLate`, the enemies'): her
      // hands off his last drawn pose, she poses, his root off her drawn root and his hands on her drawn forearm, he poses
      P.attackerHands(R, ph, since, ar, vr, knife, wGrip, track);
      ar.animate(DT, aPose);
      P.victimRoot(R, ax, 0, az, ayaw, k, fromX, fromZ - 0.6, fromYaw, vr0);
      vr.root.position.set(vr0.x, vr0.y, vr0.z);
      vr.root.rotation.y = vr0.yaw;
      if (ph < R.limp) P.victimHands(R, since, ar, vr, track);
      vr.animate(DT, vPose);
      if (n < 0 || ph >= R.limp) continue;
      P.contactErrors(R, ar, vr, knife, err);
      if (process.env.KP_TRACE) {
        const dbg = (rig: typeof ar, side: number) => {
          const t = side > 0 ? rig.reachR : rig.reachL;
          const S = (side > 0 ? rig.shoulderR : rig.shoulderL).computeWorldMatrix(true).getTranslation();
          const W = (side > 0 ? rig.wristR : rig.wristL).computeWorldMatrix(true).getTranslation();
          const d = Math.sqrt((t.x - S.x) ** 2 + (t.y - S.y) ** 2 + (t.z - S.z) ** 2);
          const b = (rig.p.hand.len * 0.45) / d;
          const iw = { x: t.x - (t.x - S.x) * b, y: t.y - (t.y - S.y) * b, z: t.z - (t.z - S.z) * b };
          const we = Math.sqrt((W.x - iw.x) ** 2 + (W.y - iw.y) ** 2 + (W.z - iw.z) ** 2);
          return 'reach ' + (d * 100).toFixed(0) + '/' + ((rig.p.upperArm.len + rig.p.forearm.len + rig.p.hand.len * 0.45) * 100).toFixed(0) + ' wristErr ' + (we * 100).toFixed(1);
        };
        console.log('DBG', R.id, n, 'AL', dbg(ar, -1), 'AR', dbg(ar, 1), 'VR', dbg(vr, 1), 'VL', dbg(vr, -1));
        console.log(R.id, n, ph.toFixed(2), 'g', (err.grip * 100).toFixed(1), 't', (err.tip * 100).toFixed(1), 'R', (err.handR * 100).toFixed(1), 'L', (err.handL * 100).toFixed(1), 'wL', ar.reachL.w.toFixed(2), 'vR', vr.reachR.w.toFixed(2));
      }
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

/** Wren's body unit (CLIP-FORMAT: K = H / 1.75 = 0.96): clip lengths x K = metres. */
const BODY_K = 1.68 / 1.75;

/** A frame's phase as the kill drive samples it (`killDriveTargets`: phase 1 is the last frame). */
const phaseOf = (clip: KeyedClip, f: number): number => f / (clip.frames - 1);

/**
 * The phase in 0.2-0.8 of the clip where the right wrist reaches furthest forward of its shoulder (the stab's full
 * reach; `arm` holds the wrist from its shoulder in the chest frame, z forward). Deviation from the S2 brief (wrist
 * furthest from the shoulder, any direction): on both attacker clips that picks the wind-up (the knife hand out to the
 * side and up, the arm straight: Stabbing 0.66, Downward 0.35), not the thrust (Stabbing 0.57, Downward 0.41).
 */
export function stabPhase(clip: KeyedClip): number {
  let best = -Infinity;
  let at = 0.5;
  for (let f = 0; f < clip.frames; f++) {
    const p = phaseOf(clip, f);
    if (p < 0.2 || p > 0.8) continue;
    const d = clip.arm[f * 12 + 11]!;
    if (d > best) {
      best = d;
      at = p;
    }
  }
  return at;
}

/** The last phase before the pelvis first drops more than 0.12 m below its frame-0 height (1: it never does). */
export function standsUntil(clip: KeyedClip): number {
  const y0 = clip.pel[1]!;
  for (let f = 1; f < clip.frames; f++) {
    if ((y0 - clip.pel[f * 3 + 1]!) * BODY_K > 0.12) return phaseOf(clip, f - 1);
  }
  return 1;
}
