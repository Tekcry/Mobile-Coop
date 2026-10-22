import { describe, expect, it } from 'vitest';
import { AnimGraph, defaultInput } from '../src/anim/animGraph';
import { emptyMotionInput, gaitRate, MotionDriver, stepLength, TURN_STEP } from '../src/anim/motion';
import { kneePoleYaw, PELVIS_FOLLOW_KEYED, PELVIS_FOLLOW_MAX, pelvisFollow } from '../src/anim/turnFollow';
import { CROUCH_BAND, TURN_FOLLOW } from '../src/anim/footPlanner';

/**
 * (anim-natural N1) With the turn rules a planted foot is not scrubbed round to TURN_FOLLOW.twistFree any more: it turns on
 * its ball down to twistFree (TURN_PIVOT) or steps round (FOOT_TURN_STEP), lands up to LAND_TURN into the turn, and the
 * ankle-centred cap is a backstop at TURN_CAP x the turn step's allowance. (fix round, CHECK finding 1c) The bound on a
 * planted foot's twist from the body is the measurement plus a margin, under the backstop (TURN_CAP x 0.4 = 0.54 rad, which
 * the round before used and the 60 Hz spins reached exactly): measured max 0.42 rad (24.1 deg, 120 Hz spin 3 / 4.2 and the
 * remote's), 0.34 at 60 Hz; was TURN_FOLLOW.twistFree, 0.25 rad, before the turn rules. From the pelvis: measured max
 * 0.53 rad (30.6 deg, 120 Hz spin 3). And the backstop itself does not turn a planted foot at all (`scrub` 0).
 */
const PLANTED_TWIST = 0.45;
const PLANTED_TWIST_PELVIS = 0.56;
import { proportions } from '../src/player/proportions';
import { flick, run, SCENARIOS, spin, TAU, wrap } from './turnHarness';

describe('turn follow (A1.2): pelvis and knees', () => {
  it('pelvis follows the planted feet a little (PELVIS_FOLLOW_MAX), eased; the knee pole sits between the hips and toes', () => {
    // (G1, audit row 1) CT turns the hips with the chest: the follow is capped at 3 deg (was 20); (anim-rework S2) standing
    // holstered the rig raises the cap to PELVIS_FOLLOW_KEYED (20 deg: the upper body turns first, the feet step round)
    expect(PELVIS_FOLLOW_MAX).toBeLessThanOrEqual(0.05 + 1e-9);
    expect(PELVIS_FOLLOW_KEYED).toBeCloseTo(0.35, 6);
    let g = 0;
    for (let k = 0; k < 120; k++) g = pelvisFollow(g, 0, 1.05, 1.05, true, true, 1 / 120, PELVIS_FOLLOW_KEYED);
    expect(g).toBeCloseTo(PELVIS_FOLLOW_KEYED, 3);
    // feet 60 deg left of the root: the pelvis goes half way, clamped
    let f = 0;
    for (let k = 0; k < 120; k++) f = pelvisFollow(f, 0, 1.05, 1.05, true, true, 1 / 120);
    expect(f).toBeCloseTo(PELVIS_FOLLOW_MAX, 3);
    // 4 deg: half, unclamped, sign kept
    f = 0;
    for (let k = 0; k < 120; k++) f = pelvisFollow(f, 0, -0.07, -0.07, true, true, 1 / 120);
    expect(f).toBeCloseTo(-0.035, 3);
    // eased: one tau gets ~63%
    expect(pelvisFollow(0, 0, 0.08, 0.08, true, true, 0.06)).toBeCloseTo(0.04 * (1 - Math.exp(-1)), 3);
    // no planted foot: back to 0
    expect(pelvisFollow(0.3, 0, 1, 1, false, false, 1)).toBeCloseTo(0, 3);
    // the chest sum: hips (pe + follow) and spine (- follow) cancel
    expect(0.1 + f + (-0.1 * 0.6 - f) - 0.1 * 0.4).toBeCloseTo(0, 9);
    // knee pole: half way to the toes, never past 0.6 rad, never backwards
    expect(kneePoleYaw(0, 0.4)).toBeCloseTo(0.2, 6);
    expect(kneePoleYaw(0, 3)).toBeCloseTo(0.6, 6);
    expect(kneePoleYaw(1, -2.5)).toBeCloseTo(1.6, 6);
    expect(kneePoleYaw(Number.NaN, 2)).toBe(2);
  });
});

describe('gait clock counts turning (A1.2)', () => {
  it('gaitRate: straight walking unchanged, a 450 deg/s spin is 2.5 cycles/s, a run turn takes the max', () => {
    expect(gaitRate(2, 0)).toBeCloseTo(2 / (2 * stepLength(2)), 9);
    expect(gaitRate(0, 7.85)).toBeCloseTo(7.85 / (2 * TURN_STEP), 6);
    expect(gaitRate(0, 7.85)).toBeCloseTo(2.5, 1);
    expect(gaitRate(4.2, 6.1)).toBeCloseTo(Math.max(4.2 / (2 * stepLength(4.2)), 6.1 / Math.PI), 9);
    expect(gaitRate(0, 0.5)).toBe(0);
  });
  it('a flick 180 at 2.0 m/s advances the clock by >= 0.9 cycles through the turn (about 2 steps)', () => {
    const d = new MotionDriver(0);
    const mi = emptyMotionInput();
    mi.ct = true;
    mi.faceTravel = true;
    const dt = 1 / 120;
    for (let k = 0; k < 180; k++) {
      mi.vz = 2;
      mi.yaw = d.yaw;
      d.step(dt, mi);
    }
    let adv = 0;
    let prev = d.phase;
    for (let k = 0; k < 0.4 * 120; k++) {
      mi.vx = 0;
      mi.vz = -2;
      d.step(dt, mi);
      adv += (((d.phase - prev) % 1) + 1) % 1;
      prev = d.phase;
    }
    expect(adv).toBeGreaterThanOrEqual(0.9);
  });
  it('the graph: a spin at a crawl is moving, cycle time 1 / gaitRate, duty near 0.52 in a full spin, unchanged straight', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    i.speed = 2;
    i.localZ = 1;
    for (let k = 0; k < 30; k++) g.update(1 / 60, i);
    const straight = g.out.gait.duty;
    i.speed = 0.1;
    i.yawRate = 6;
    for (let k = 0; k < 30; k++) g.update(1 / 60, i);
    expect(g.out.gait.moving).toBe(true);
    expect(g.out.gait.cycleTime).toBeCloseTo(1 / gaitRate(0.1, 6), 6);
    expect(g.out.gait.duty).toBeCloseTo(0.52, 2);
    expect(g.out.gait.turning).toBeCloseTo(1, 3);
    i.speed = 2;
    i.yawRate = 0;
    for (let k = 0; k < 30; k++) g.update(1 / 60, i);
    expect(g.out.gait.duty).toBeCloseTo(straight, 6);
  });
});

describe('foot planner: legs follow the body (A1.2)', () => {
  for (const hz of [60, 120]) {
    for (const sc of SCENARIOS) {
      it(`${sc.name} at ${hz} Hz: no crossing, legs turn with the body, inside the stance band, knees forward, strides forward`, () => {
        const r = run({ ...sc.o, hz });
        // 1. never crossed in the pelvis frame (any frame), wider with both planted
        // (anim-rework S2) standing the feet land on the narrow keyed track (the gap follows the stance, FREE_GAP)
        const stand = !sc.o.crouch;
        expect(r.minGapNear, 'gap any').toBeGreaterThanOrEqual(stand ? 0.03 : 0.06);
        expect(r.minGapPlanted, 'gap planted').toBeGreaterThanOrEqual(stand ? 0.03 : 0.11);
        // 2. (G1, audit row 1) free movement turns the legs with the body as CT does: a planted foot stays within
        // TURN_FOLLOW.twistFree of the body (it scrubs round with it; was a 52 deg world lock), the pelvis with the chest
        // (anim-natural N1) the turn rules' bound (PLANTED_TWIST; was TURN_FOLLOW.twistFree) and no band scrub (scrubPos 0)
        expect(r.maxPlantedTwistBody, 'planted twist (body)').toBeLessThanOrEqual(PLANTED_TWIST + 1e-6);
        expect(r.maxPlantedTwist, 'planted twist (pelvis)').toBeLessThanOrEqual(PLANTED_TWIST_PELVIS);
        expect(r.scrubPos, 'band scrub').toBe(0);
        // (fix round, CHECK finding 1c) the twist cap's backstop never turns a planted foot (measured 0 at 60 and 120 Hz; the
        // round before: 16-48 deg at 60 Hz in the spins, which swept the heel round the ball's spot), and the contact
        // points stay put (metrics.ts contactSlide: the heel while down, the ball while down; measured 0)
        expect(r.scrub, 'backstop').toBeLessThan(1e-6);
        expect(r.heelSlide, 'heel slide').toBeLessThan(0.002);
        expect(r.ballSlide, 'ball slide').toBeLessThan(0.002);
        // (G1, audit row 2) no lateral splay: planted feet inside the stance band either side of the midline
        // (the capped scrub lets a foot out by a few cm in a held 400 deg/s spin before it steps back in)
        // (anim-rework S2) standing the planted feet stay locked through the first SPIN_SCRUB s of a turn (no scrub: they
        // step), so a tight 450 deg/s spin or flick at 2-4 m/s leaves a planted foot up to ~0.3 m out before it steps;
        // never crossed under the body (within a cm of the midline on the narrow track)
        // (anim-rework S4) crouched inside the crouched band (CROUCH_BAND: the keyed crouch's narrow track)
        // (anim-natural N1, rule C) crouched no band scrub either: a planted foot stays put (turning on its ball) and steps
        // back in, so a held crouched spin leaves it up to ~18 cm out first (was CROUCH_BAND.max + 0.05, held by the scrub,
        // which slid it 5-6.5 cm a turn). (fix round, CHECK finding 4) That is single support only: with both planted the
        // stance is master's (turnRule 0) within 1 cm, below
        expect(r.latMax, 'planted lateral').toBeLessThanOrEqual(stand ? 0.32 : CROUCH_BAND.max + 0.09);
        const master = run({ ...sc.o, hz, turnRule: 0 });
        expect(r.widthPlanted, 'both planted: stance width').toBeLessThanOrEqual(master.widthPlanted + 0.01);
        expect(r.latMin, 'planted lateral (no crossing under the body)').toBeGreaterThanOrEqual(stand ? -0.01 : CROUCH_BAND.min - 0.04);
        // 3. knees never backwards
        expect(r.maxKnee).toBeLessThanOrEqual(0.6 + 1e-6);
        // 4. strides forward in turns, landing yaw near the body
        for (const l of r.landings) {
          if (!l.turning || l.back) continue;
          // prototype: revisit (plan -0.03; a tight circle lands up to 0.33 m behind the hips in their frame; BC: -0.5, the narrower stance lands 0.46 behind in the 3 rad/s spin)
          expect(l.fwd, `landing fwd at ${l.t.toFixed(2)}`).toBeGreaterThanOrEqual(-0.5);
          // by design about half a stance's turn ahead (mid-stance yaw, ~47 deg in a full-rate spin)
          expect(l.yawErr, `landing yaw at ${l.t.toFixed(2)}`).toBeLessThanOrEqual(0.9 + 1e-6);
        }
        // 7. no world-lock drag; the band's sideways scrub is CT's pivot, capped at TURN_FOLLOW.scrubSpeed (3 cm a frame at 60 Hz)
        expect(r.drag, 'drag').toBeLessThan(0.02);
        expect(r.maxSlide, 'planted move per frame').toBeLessThanOrEqual((hz === 120 ? 0.015 : 0.03) + 0.002);
      });
    }
  }
  it('(fix round, CHECK finding 4) a crouched flick 180 (1.45 m/s) at 60 and 120 Hz: both planted, the stance is as wide as master (+1 cm)', () => {
    for (const hz of [60, 120]) {
      const o = { seconds: 2.6, crouch: true, stick: flick(1.45), hz };
      const r = run(o);
      const master = run({ ...o, turnRule: 0 });
      expect(r.widthPlanted, `${hz} Hz`).toBeLessThanOrEqual(master.widthPlanted + 0.01);
      expect(r.scrub, `${hz} Hz backstop`).toBeLessThan(1e-6);
      expect(Math.max(r.heelSlide, r.ballSlide), `${hz} Hz contact slide`).toBeLessThan(0.002);
    }
  });
  it('a held 450 deg/s spin lands 4 +- 1 steps per 360 standing and crouched', () => {
    for (const [v, crouch] of [[0.75, false], [2.0, false], [3.0, false], [0.85, true], [2.1, true]] as const) {
      const r = run({ seconds: 4, crouch, stick: spin(v, 7.85) });
      // from 1 s (in the spin) to 4 s
      let turned = 0;
      for (let k = 120; k < r.yawRateAt.length; k++) turned += Math.abs(r.yawRateAt[k]!) / 120;
      const steps = r.landings.filter((l) => l.t >= 1).length;
      const per360 = (steps / turned) * TAU;
      expect(per360, `speed ${v}${crouch ? ' crouched' : ''}`).toBeGreaterThanOrEqual(3);
      expect(per360, `speed ${v}${crouch ? ' crouched' : ''}`).toBeLessThanOrEqual(5);
    }
  });
  it('a flick 180 at 2.0 m/s: ~0.4 s, 2 +- 1 landings in the turn, feet with the body 0.15 s after', () => {
    const r = run({ seconds: 2.6, stick: flick(2.0) });
    const k0 = 1.5 * 120;
    let k1 = k0;
    while (k1 < r.yawAt.length && Math.abs(wrap(r.yawAt[k1]! - Math.PI)) > 0.02) k1++;
    const dur = (k1 - k0) / 120;
    expect(dur).toBeGreaterThanOrEqual(0.36);
    expect(dur).toBeLessThanOrEqual(0.45);
    const inTurn = r.landings.filter((l) => l.t >= 1.5 && l.t <= 1.5 + dur).length;
    expect(inTurn).toBeGreaterThanOrEqual(1);
    expect(inTurn).toBeLessThanOrEqual(3);
    expect(r.feetYawAt[k1 + 18]!).toBeLessThanOrEqual(0.6);
  });
  it('the slow back walk steps behind the hips, feet on the facing, never crossing', () => {
    const r = run({ seconds: 4, slowest: true, stick: (t) => ({ dir: t < 1 ? 0 : Math.PI, speed: 0.2 }) });
    const back = r.landings.filter((l) => l.back);
    expect(back.length).toBeGreaterThan(2);
    for (const l of back) {
      expect(l.fwd).toBeLessThanOrEqual(0.05);
      expect(l.yawErr).toBeLessThanOrEqual(0.2);
    }
    expect(r.minGapNear).toBeGreaterThanOrEqual(0.06);
  });
});

describe('remote parity (A1.2): a co-op partner posed from snapshots', () => {
  // (fix round) at 60 Hz too (the default is 120)
  for (const hz of [60, 120])
  for (const sc of SCENARIOS) {
    it(`${sc.name} at ${hz} Hz: same rules, looser bounds (snapshot lag)`, () => {
      const r = run({ ...sc.o, remote: true, hz });
      expect(r.minGapNear).toBeGreaterThanOrEqual(0.04);
      expect(r.maxPlantedTwist).toBeLessThanOrEqual(1.25);
      // (G1) the remote copy's legs turn with its body too, inside the same stance band (anim-rework S2: standing as above)
      // (anim-natural N1) the turn rules' bound (was TURN_FOLLOW.twistFree)
      expect(r.maxPlantedTwistBody).toBeLessThanOrEqual(PLANTED_TWIST + 1e-6);
      // (fix round, CHECK finding 1c) no backstop, no contact slide (measured 0; the round before: 14.5 deg and a 4.3 cm
      // heel sweep in the 2 m/s spin at 60 Hz)
      expect(r.scrub, 'backstop').toBeLessThan(1e-6);
      expect(Math.max(r.heelSlide, r.ballSlide), 'contact slide').toBeLessThan(0.002);
      expect(r.latMax).toBeLessThanOrEqual(!sc.o.crouch ? 0.32 : TURN_FOLLOW.maxLateral + 0.05);
      expect(r.maxKnee).toBeLessThanOrEqual(0.6 + 1e-6);
      for (const l of r.landings) {
        if (!l.turning || l.back) continue;
        expect(l.fwd, `landing fwd at ${l.t.toFixed(2)}`).toBeGreaterThanOrEqual(-0.45);
        expect(l.yawErr, `landing yaw at ${l.t.toFixed(2)}`).toBeLessThanOrEqual(0.95);
      }
    });
  }
});
