/**
 * (anim-fix-pass AF4a, Michael P4 "Crouch cover strafe: ... moves around constantly, pistol shifts between knees") The
 * crouched aimed strafe, rifle and pistol, on the AF0 harness (tests/helpers/afpMeasure.ts, aimRun's carrier):
 * - the hips hold steady over the root: lateral offset <= 4 cm p2p on a steady strafe (the knee over its toes, <= 3 cm out:
 *   e2e-anim's gate), <= STOPGO_P2P over stop-go cycles and FLIP_P2P over L <-> R flips (before: 8.1-10.9 / 12.7 cm; ~4.6-4.9
 *   cm of it is the keyed crouch pelvis sway and the kneel, AF4b's animGraph.ts), never more than 2 cm a frame beyond pace x dt;
 * - the grip hand's lateral jitter <= 1.0 cm a frame steady (rifle; the pistol's 1.01 cm before is its hold, AF4b: held to
 *   PISTOL_GRIP_STEADY, no worse), <= 2 cm on flips and stops;
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
import { GUN_EXTENT, gripLateral, gunClearance, kneelSummary, makeProbe, pelvisLateral, type Probe } from './helpers/afpMeasure';
import type { Rec } from './helpers/mocapMeasure';
import { kneeBow } from '../src/anim/audit/metrics';
import { facingHips } from '../src/anim/audit/crabFacing';
import { CRAB } from '../src/anim/audit/limits';
import { aimRun, CROUCH_PLANS, STRAFE_PLANS, type AimTarget } from './helpers/mocapStrafe';

const DT = 1 / 60;
/** Stop-go cycles: the hips' lateral offset from the root (m p2p; before 8.1 / 10.9 cm L / R). */
const STOPGO_P2P = 0.085;
/** L <-> R flips: the same (m p2p; before 12.7 cm). */
const FLIP_P2P = 0.08;
/** The pistol's steady grip step (cm a frame): the rifle's 1.0 (AF0 before 1.01; AF4b holds the raised pistol further out
 *  crouched, PISTOL_REACH_CROUCH). */
const PISTOL_GRIP_STEADY = 1.0;

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
/** `wall`: the drawn crouched back-to-wall slide (aimRun's own kneel rule: none at the wall). `lead`: a planner lead forced
 *  on the graph (m, left foot ahead) flipping sign every `lead[1]` s (the lead after a sideways stop is arbitrary). */
async function run(plan: [AimTarget, number, number], weight: number, aimed = true, wall = false, lead?: [number, number]): Promise<Out> {
  const P = makeProbe(plan[2], weight < 0.85 ? GUN_EXTENT.pistol : GUN_EXTENT.rifle, plan[0]);
  const hook = kneelRule(plan[0], aimed);
  let leadHooked = false;
  const R = await aimRun(plan[0], plan[1], plan[2], 'on', (rig, k) => {
    if (!wall) hook(rig);
    if (lead && !leadHooked) {
      leadHooked = true;
      const g = rig.graph as unknown as { setLead: (v: number) => void };
      const set = g.setLead.bind(rig.graph);
      let n = 0;
      g.setLead = () => set(Math.floor(n++ * DT / lead[1]) % 2 ? -lead[0] : lead[0]);
    }
    P.onStep(rig, k);
  }, true, { weight, wall });
  return { R, P };
}

/** Low ready (`aim` 0) over a plan. */
function lowReady(p: [AimTarget, number, number]): [AimTarget, number, number] {
  return [(t) => ({ ...p[0](t), aim: 0 }), p[1], p[2]];
}

/** Stop-go cycles alternating L / R (CROUCH_PLANS.stopGo's timing). */
function stopGoAlt(v: number, n = 10, on = 1.0, off = 0.8): [AimTarget, number, number] {
  return [(t) => ({ x: t > 1 && (t - 1) % (on + off) < on ? (Math.floor((t - 1) / (on + off)) % 2 ? -v : v) : 0, z: 0, crouch: 1 }), Math.round(60 * (1 + n * (on + off) + 0.5)), 1];
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
          console.info(`AF4a ${w} steady ${sg} ${v}: pel p2p ${cm(pl.p2p)} beyond ${cm(pl.beyondPace)} grip step ${gr.stepMax.toFixed(2)} knee-out ${cm(kneeOut(R))}`);
          expect(pl.p2p).toBeLessThanOrEqual(0.04);
          expect(pl.beyondPace).toBeLessThanOrEqual(0.02);
          expect(gr.stepMax).toBeLessThanOrEqual(weight < 0.85 ? PISTOL_GRIP_STEADY : 1.0);
          expect(kneeOut(R)).toBeLessThanOrEqual(CRAB.kneeBow);
        }
      }
    }, 300_000);

    it(`${w}: stop-go both ways, hips steady, grip <= 2 cm a frame`, async () => {
      for (const sg of [-1, 1]) {
        const { R } = await run(CROUCH_PLANS.stopGo(sg, 0.7), weight);
        const pl = pelvisLateral(R);
        const gr = gripLateral(R);
        console.info(`AF4a ${w} stopgo ${sg}: pel p2p ${cm(pl.p2p)} beyond ${cm(pl.beyondPace)} grip step ${gr.stepMax.toFixed(2)} knee-out ${cm(kneeOut(R))}`);
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
        console.info(`AF4a ${w} flip gap ${gap}: pel p2p ${cm(pl.p2p)} beyond ${cm(pl.beyondPace)} grip step ${gr.stepMax.toFixed(2)} knee-out ${cm(kneeOut(R))} kneels ${kn.episodes} on flip ${kn.kneelOnFlip}`);
        const old = kneelSummary((await run(plan, weight, false)).P);
        console.info(`AF4a ${w} flip gap ${gap} at KNEEL_STILL (the old rule): kneels ${old.episodes} on flip ${old.kneelOnFlip}`);
        expect(kn.episodes).toBe(0);
        expect(kn.kneelOnFlip).toBe(0);
        expect(pl.p2p).toBeLessThanOrEqual(FLIP_P2P);
        expect(pl.beyondPace).toBeLessThanOrEqual(0.02);
        expect(gr.stepMax).toBeLessThanOrEqual(2.0);
      }
    }, 300_000);
  }

  it('a real crouched stop still kneels (aimed, after KNEEL_STILL_AIM)', async () => {
    const { P } = await run(CROUCH_PLANS.stopGo(1, 0.7, 4), 1);
    const kn = kneelSummary(P);
    console.info(`AF4a stop kneels ${kn.episodes}`);
    expect(kn.episodes).toBe(4);
  }, 300_000);

  it('standing aimed strafe: the glide hips unchanged by the crouch cap (crouch 0 keeps share 1)', async () => {
    const [tg, n, from] = STRAFE_PLANS.startStop(1, 0.7);
    const { R } = await run([tg, n, from], 1);
    const pl = pelvisLateral(R);
    console.info(`AF4a standing startStop: pel p2p ${cm(pl.p2p)} beyond ${cm(pl.beyondPace)}`);
    expect(pl.beyondPace).toBeLessThanOrEqual(0.0195);
  }, 300_000);
});

/**
 * (anim-fix-pass AF4b, Michael P4 "with rifle clips and moves around constantly, pistol shifts between knees"):
 * - the kneel's knee is the gun hand's (right), the same over 10 stop-go cycles even with the planner's lead flipping (it
 *   was picked from the lead: crouched the stance lead is zeroed, so after a sideways stop it was arbitrary);
 * - the pistol hand's lateral position against the pelvis varies <= 3 cm across those cycles (aimed and at low ready);
 * - the gun clears the legs (capsules >= 0 cm) and the trunk (>= -1 cm) on every frame, rifle and pistol: the crouched
 *   strafe (aimed and low ready, steady and stop-go) and the drawn crouched wall slide both ways and its reversal. Before:
 *   wall slide rifle leg -2.3 / -10.5 / -10.4 cm, trunk -4.0 / -11.6 / -14.7 (L / R / reverse); pistol leg -1.4 / -8.9 /
 *   -9.6; the crouched pistol low ready -0.4..-1.6 (between the knees, pushed side to side by the rig's body clearance).
 */
const GUN_LEG = 0;
const GUN_TRUNK = -0.01;
const PISTOL_SPREAD = 0.03;

describe('crouched strafe / wall slide: gun clear, pistol on one knee (AF4b)', () => {
  for (const [w, weight] of [['rifle', 1], ['pistol', 0.7]] as const) {
    it(`${w}: one knee over 10 alternating stop-go cycles, the lead flipping; the gun hand steady across them`, async () => {
      for (const aim of [1, 0]) {
        const plan = aim ? stopGoAlt(0.7) : lowReady(stopGoAlt(0.7));
        const { R, P } = await run(plan, weight, aim > 0, false, [0.1, 1.8]);
        const kn = kneelSummary(P);
        const gr = gripLateral(R);
        const gc = gunClearance(R, P, weight < 0.85);
        console.info(`AF4b ${w} aim ${aim} stopgo alt: kneels ${kn.episodes} sides ${kn.sides.join(',')} changes ${kn.sideChanges} grip spread ${cm(gr.cycleSpread)} step ${gr.stepMax.toFixed(2)} gun leg ${cm(gc.leg)} trunk ${cm(gc.trunk)}`);
        expect(kn.episodes).toBe(10);
        expect(kn.sideChanges).toBe(0);
        expect(kn.sides[0]).toBe(1);
        if (weight < 0.85) expect(gr.cycleSpread).toBeLessThanOrEqual(PISTOL_SPREAD);
        expect(gc.leg).toBeGreaterThanOrEqual(GUN_LEG);
        expect(gc.trunk).toBeGreaterThanOrEqual(GUN_TRUNK);
      }
    }, 300_000);

    it(`${w}: the crouched strafe clears the gun, aimed and at low ready`, async () => {
      for (const aim of [1, 0]) {
        for (const plan of [CROUCH_PLANS.steady(-1, 0.4), CROUCH_PLANS.steady(1, 0.7), CROUCH_PLANS.stopGo(1, 0.7), flipMoving(0.7, 1.3, 0.15)]) {
          const { R, P } = await run(aim ? plan : lowReady(plan), weight, aim > 0);
          const gc = gunClearance(R, P, weight < 0.85);
          console.info(`AF4b ${w} aim ${aim} strafe: gun leg ${cm(gc.leg)} trunk ${cm(gc.trunk)}`);
          expect(gc.frames).toBeGreaterThan(100);
          expect(gc.leg).toBeGreaterThanOrEqual(GUN_LEG);
          expect(gc.trunk).toBeGreaterThanOrEqual(GUN_TRUNK);
        }
      }
    }, 300_000);

    it(`${w}: the drawn crouched wall slide both ways and its reversal clear the gun`, async () => {
      for (const [name, plan] of [['L', CROUCH_PLANS.wallSlide(-1, 0.6)], ['R', CROUCH_PLANS.wallSlide(1, 0.6)], ['reverse', CROUCH_PLANS.wallReverse(0.6)]] as const) {
        const { R, P } = await run(plan, weight, false, true);
        const gc = gunClearance(R, P, weight < 0.85);
        console.info(`AF4b ${w} wall ${name}: gun leg ${cm(gc.leg)} trunk ${cm(gc.trunk)}`);
        expect(gc.frames).toBeGreaterThan(100);
        expect(gc.leg).toBeGreaterThanOrEqual(GUN_LEG);
        expect(gc.trunk).toBeGreaterThanOrEqual(GUN_TRUNK);
      }
    }, 300_000);
  }
});

describe('low ready still: crouch -> kneel -> stand, pistol (AF4b, e2e-anim pop)', () => {
  // e2e-anim "low ready still: crouch -> stand" (the pistol in hand): standing from the kneel the crouch runs out in
  // standTime while the knees are still up; CROUCH_GUN.pistol by the crouch alone dropped the hang into the rising thighs
  // and the body clearance threw the gun 11 cm sideways (wristL 14.5 cm a frame, <= 11.5). By the crouch or the kneel,
  // whichever is more. The real weapons, stance and carry (drawHarness), the e2e's pop measure (velocity change a frame).
  it('standing up from the pistol low-ready kneel does not pop', async () => {
    const { drawHarness } = await import('./helpers/drawHarness');
    const h = await drawHarness();
    const rig = h.rig;
    let crouched = false;
    let ck = 0;
    let still = 0;
    const r = rig as unknown as { animate: (dt: number, p: RigPose) => void };
    const anim = r.animate.bind(rig);
    r.animate = (dt: number, p: RigPose) => {
      // PlayerController: crouchTime / standTime 0.22 s eased, the kneel after KNEEL_STILL still crouched
      ck = crouched ? Math.min(1, ck + dt / 0.22) : Math.max(0, ck - dt / 0.22);
      p.crouch = ck * ck * (3 - 2 * ck);
      still = crouched ? still + dt : 0;
      p.kneel = still > KNEEL_STILL;
      p.motion = 'idle';
      anim(dt, p);
    };
    h.tap('swapNext');
    h.run(120);
    h.stance.base = 'lowReady';
    h.run(90);
    expect(h.weapons.current.def.class).toBe('pistol');
    const joints = ['hips', 'wristL', 'wristR', 'headNode'] as const;
    let prev: number[] | null = null;
    let vel: number[] | null = null;
    let pop = 0;
    let where = '';
    let pushMax = 0;
    const now: number[] = [];
    const rec = (n: number): void => {
      for (let k = 0; k < n; k++) {
        h.step();
        pushMax = Math.max(pushMax, (rig as unknown as { gunPush: number }).gunPush);
        now.length = 0;
        for (const j of joints) {
          const m = rig[j].computeWorldMatrix(true).m;
          now.push(m[12]!, m[13]!, m[14]!);
        }
        if (prev) {
          const v = now.map((x, i) => x - prev![i]!);
          if (vel)
            for (let i = 0; i < joints.length; i++) {
              const a = Math.hypot(v[3 * i]! - vel[3 * i]!, v[3 * i + 1]! - vel[3 * i + 1]!, v[3 * i + 2]! - vel[3 * i + 2]!);
              if (a > pop) {
                pop = a;
                where = joints[i]!;
              }
            }
          vel = v;
        }
        prev = now.slice();
      }
    };
    crouched = true;
    rec(72);
    crouched = false;
    rec(72);
    h.dispose();
    console.info(`AF4b pistol low ready crouch -> kneel -> stand: worst velocity change ${cm(pop)} cm a frame (${where}), body clearance push max ${cm(pushMax)} cm`);
    expect(pop).toBeLessThanOrEqual(0.115);
    // the hang stays clear of the thighs through the stand (by the crouch alone: pushed 4.2 cm here, 11 cm in the game)
    expect(pushMax).toBeLessThanOrEqual(0.01);
  }, 120_000);
});
