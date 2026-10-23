/**
 * (anim-fix-pass AF4a, Michael P4 "Crouch cover strafe: ... moves around constantly, pistol shifts between knees") The
 * crouched aimed strafe, rifle and pistol, on the AF0 harness (tests/helpers/afpMeasure.ts, aimRun's carrier):
 * - the hips hold steady over the root: lateral offset <= 4 cm p2p on a steady strafe, <= STOPGO_P2P over stop-go cycles and
 *   L <-> R flips (before: 8.1-10.9 / 12.7 cm), and never more than 2 cm a frame beyond pace x dt;
 * - the grip hand's lateral jitter <= 1.0 cm a frame steady, <= 2 cm on flips and stops;
 * - no kneel through an L <-> R flip (the stick crossing the dead zone): crouched and aiming the controller kneels after
 *   KNEEL_STILL_AIM s still, not KNEEL_STILL (playerController.ts `kneelStill`). aimRun hard-codes KNEEL_STILL, so these
 *   runs re-apply the controller's rule to the pose before each animate (the `kneelRule` hook).
 * Standing (crouch 0) the glide's hips are unchanged: GLIDE_HIP's share 1, no rate cap.
 */
import { describe, expect, it } from 'vitest';
import { CT } from '../src/config/movement';
import type { CharacterRig, RigPose } from '../src/player/characterRig';
import { GLIDE_HIP, GLIDE_HIP_CROUCH } from '../src/player/characterRig';
import { KNEEL_STILL, KNEEL_STILL_AIM, kneelStill } from '../src/player/playerController';
import { GUN_EXTENT, gripLateral, kneelSummary, makeProbe, pelvisLateral, type Probe } from './helpers/afpMeasure';
import type { Rec } from './helpers/mocapMeasure';
import { kneeBow } from '../src/anim/audit/metrics';
import { facingHips } from '../src/anim/audit/crabFacing';
import { CRAB } from '../src/anim/audit/limits';
import { aimRun, CROUCH_PLANS, STRAFE_PLANS, type AimTarget } from './helpers/mocapStrafe';

const DT = 1 / 60;
/** Stop-go cycles and flips: the hips' lateral offset from the root (m p2p; before 8.1-10.9 / 12.7 cm). */
const STOPGO_P2P = 0.06;

/** Re-apply playerController's kneel rule (crouched, the stick still, the driver idle, `kneelStill(aimed)` s) to the pose
 *  aimRun hands the rig, through a hook on `rig.animate` set at the first step. */
function kneelRule(target: AimTarget, aimed: boolean): (rig: CharacterRig) => void {
  let hooked = false;
  let k = 0;
  let still = 0;
  return (rig) => {
    if (hooked) return;
    hooked = true;
    const r = rig as unknown as { animate: (dt: number, p: RigPose) => void };
    const anim = r.animate.bind(rig);
    r.animate = (dt: number, p: RigPose) => {
      k++;
      const s = target(k * DT);
      still = (s.crouch ?? 0) > 0.5 && Math.abs(s.x) + Math.abs(s.z) < 0.05 && p.motion === 'idle' ? still + dt : 0;
      p.kneel = still > kneelStill(aimed);
      anim(dt, p);
    };
  };
}

interface Out { R: Rec; P: Probe }
async function run(plan: [AimTarget, number, number], weight: number, aimed = true): Promise<Out> {
  const P = makeProbe(plan[2], weight < 0.85 ? GUN_EXTENT.pistol : GUN_EXTENT.rifle, plan[0]);
  const hook = kneelRule(plan[0], aimed);
  const R = await aimRun(plan[0], plan[1], plan[2], 'on', (rig, k) => {
    hook(rig);
    P.onStep(rig, k);
  }, true, { weight });
  return { R, P };
}

/** CROUCH_PLANS.flip, but moving from the start: that plan's first second is still, so its crouch-in kneel is still fading at
 *  the record start and kneelSummary counts it against the first flip (AF0's "kneel on flip 4 frames", no flip kneel). */
function flipMoving(v: number, per: number, gap: number): [AimTarget, number, number] {
  return [(t) => {
    const u = t % per;
    return { x: u < gap && t > 1 ? 0 : Math.floor(t / per) % 2 ? v : -v, z: 0, crouch: 1 };
  }, 480, 1];
}

/** The worst knee outside its own ankle (m, the e2e-anim knee-out gate CRAB.kneeBow) over a run. */
function kneeOut(R: Rec): number {
  const P = R.pos;
  const fh = facingHips(P.hipL, P.hipR, R.yaw);
  return kneeBow(fh.hipL, fh.hipR, P.kneeL, P.kneeR, P.ankleL, P.ankleR, CRAB.kneeBow).max;
}

const cm = (v: number): string => (v * 100).toFixed(1);

describe('crouched aimed strafe (AF4a)', () => {
  it('the kneel rule: crouched aiming waits KNEEL_STILL_AIM, a flip through the dead zone never kneels', () => {
    expect(kneelStill(false)).toBe(KNEEL_STILL);
    expect(kneelStill(true)).toBe(KNEEL_STILL_AIM);
    expect(KNEEL_STILL_AIM).toBeGreaterThanOrEqual(0.3);
    // standing glide untouched: share 1; crouched a share under 1 and a rate cap
    expect(GLIDE_HIP.share).toBe(1);
    expect(GLIDE_HIP_CROUCH.share).toBeLessThan(1);
    expect(CT.stopBlend).toBeGreaterThan(0);
  });

  for (const [w, weight] of [['rifle', 1], ['pistol', 0.7]] as const) {
    it(`${w}: steady L / R, hips <= 4 cm p2p, grip <= 1 cm a frame`, async () => {
      for (const sg of [-1, 1]) {
        for (const v of [0.4, 0.7]) {
          const { R } = await run(CROUCH_PLANS.steady(sg, v), weight);
          const pl = pelvisLateral(R);
          const gr = gripLateral(R);
          console.log(`AF4a ${w} steady ${sg} ${v}: pel p2p ${cm(pl.p2p)} beyond ${cm(pl.beyondPace)} grip step ${gr.stepMax.toFixed(2)} knee-out ${cm(kneeOut(R))}`);
          expect(pl.p2p).toBeLessThanOrEqual(0.04);
          expect(pl.beyondPace).toBeLessThanOrEqual(0.02);
          expect(gr.stepMax).toBeLessThanOrEqual(1.0);
        }
      }
    }, 300_000);

    it(`${w}: stop-go both ways, hips steady, grip <= 2 cm a frame`, async () => {
      for (const sg of [-1, 1]) {
        const { R } = await run(CROUCH_PLANS.stopGo(sg, 0.7), weight);
        const pl = pelvisLateral(R);
        const gr = gripLateral(R);
        console.log(`AF4a ${w} stopgo ${sg}: pel p2p ${cm(pl.p2p)} beyond ${cm(pl.beyondPace)} grip step ${gr.stepMax.toFixed(2)} knee-out ${cm(kneeOut(R))}`);
        expect(pl.p2p).toBeLessThanOrEqual(STOPGO_P2P);
        expect(pl.beyondPace).toBeLessThanOrEqual(0.02);
        expect(gr.stepMax).toBeLessThanOrEqual(2.0);
      }
    }, 300_000);

    it(`${w}: L <-> R flips through the dead zone, no kneel, hips steady`, async () => {
      for (const gap of [0.15, 0.3]) {
        const plan = flipMoving(0.7, 1.3, gap);
        const { R, P } = await run(plan, weight);
        const pl = pelvisLateral(R);
        const gr = gripLateral(R);
        const kn = kneelSummary(P);
        console.log(`AF4a ${w} flip gap ${gap}: pel p2p ${cm(pl.p2p)} beyond ${cm(pl.beyondPace)} grip step ${gr.stepMax.toFixed(2)} knee-out ${cm(kneeOut(R))} kneels ${kn.episodes} on flip ${kn.kneelOnFlip}`);
        const old = kneelSummary((await run(plan, weight, false)).P);
        console.log(`AF4a ${w} flip gap ${gap} at KNEEL_STILL (the old rule): kneels ${old.episodes} on flip ${old.kneelOnFlip}`);
        expect(kn.episodes).toBe(0);
        expect(kn.kneelOnFlip).toBe(0);
        expect(pl.p2p).toBeLessThanOrEqual(STOPGO_P2P);
        expect(pl.beyondPace).toBeLessThanOrEqual(0.02);
        expect(gr.stepMax).toBeLessThanOrEqual(2.0);
      }
    }, 300_000);
  }

  it('a real crouched stop still kneels (aimed, after KNEEL_STILL_AIM)', async () => {
    const { P } = await run(CROUCH_PLANS.stopGo(1, 0.7, 4), 1);
    const kn = kneelSummary(P);
    console.log(`AF4a stop kneels ${kn.episodes}`);
    expect(kn.episodes).toBe(4);
  }, 300_000);

  it('standing aimed strafe: the glide hips unchanged by the crouch cap (crouch 0 keeps share 1)', async () => {
    const [tg, n, from] = STRAFE_PLANS.startStop(1, 0.7);
    const { R } = await run([tg, n, from], 1);
    const pl = pelvisLateral(R);
    console.log(`AF4a standing startStop: pel p2p ${cm(pl.p2p)} beyond ${cm(pl.beyondPace)}`);
    expect(pl.beyondPace).toBeLessThanOrEqual(0.0195);
  }, 300_000);
});
