/**
 * (anim-natural N1) Foot turn harness: the local player's foot path without Babylon, in sim time (60 Hz, deterministic).
 *
 * MotionDriver (CT free movement, the game's real turn rate and pace spring) -> AnimGraph (gait clock, duty, stance,
 * keyHol, pelvis channel) -> FootPlanner -> pelvisFollow, fed as `CharacterRig.animateFrame` feeds them for the local
 * player (player.ts: phase = the driver's clock, motion = its state, velocity = its output; the rig measures the yaw rate
 * itself, smoothed tau 0.05 s; quickStop = CT.stopBlend; the hip follow cap by keyHol). The rendered heel / toe are
 * modelled as the rig poses them (`solveLegWorld`: the ankle at the planner's spot, raised by `heelLift`, the foot turned by
 * the planner's yaw and pitch about the ankle) and measured as `scripts/anim-natural/audit.mjs` does (slide = the smaller
 * of the heel's and the toe's horizontal travel in one plant; wind = the foot's heading against the pelvis).
 * Not modelled: the IK's reach limit (an overstretched leg drags the rendered ankle), the keyed trunk (the rig slerps the
 * hips to the keyed pelvis by keyW, so `pelvisRange` / `windPelvis` here use the procedural pelvis + the follow), the
 * bank's projection on the hip line, ground probes (flat floor). Run: `npx vitest run tests/footTurn.test.ts --silent=false`.
 * (fix round) Options: `hz` (another sim rate, 120 = a render-rate rig), `turnRule` 0 (master's planner); scenarios may pose a
 * co-op remote (`remote`) or a guard (`guard`, GUARD_SCENARIOS). Contact slide per point (metrics.ts contactSlide).
 */
import { AnimGraph, defaultInput } from '../src/anim/animGraph';
import { emptyPlannerInput, FootPlanner, type FootState } from '../src/anim/footPlanner';
import { emptyMotionInput, MotionDriver } from '../src/anim/motion';
import { HEEL_BACK, HEEL_DOWN, heelLift, TOE_BALL } from '../src/anim/footGeom';
import { contactSlide } from '../src/anim/audit/metrics';
import { PELVIS_FOLLOW_KEYED, PELVIS_FOLLOW_MAX, pelvisFollow } from '../src/anim/turnFollow';
import { CT, ENEMY_CALM_MOTION, ENEMY_MOTION, GEARS } from '../src/config/movement';
import { hyp2 } from '../src/core/mathx';
import { proportions } from '../src/player/proportions';
import { stickCurve, stickSpeed } from '../src/player/speedGears';

const TAU = Math.PI * 2;
const D = 180 / Math.PI;
const wrap = (a: number): number => {
  a %= TAU;
  return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a;
};
const approachTo = (x: number, target: number, dt: number, tau: number): number => target + (x - target) * Math.exp(-dt / tau);

// characterRig.ts CROUCH_REACH (not exported: the rig imports Babylon). The rig's heelLift only raises the ankle (the
// horizontal heel / toe points below do not depend on it): a raised heel turns the foot about the ankle in x / z.
const CROUCH_REACH = 0.8;

/** The stick at time t: world direction (rad) and pace (m/s); null = released. */
export type Stick = (t: number) => { dir: number; speed: number } | null;

export interface Scenario {
  name: string;
  seconds: number;
  /** Metrics are taken from this time (the turn input, the start, the stop). */
  t0: number;
  stick: Stick;
  crouch?: boolean;
  /** Aiming (strafe-locked, stride 'velocity'): the aim yaw at time t (the body follows it at the aim turn rate). */
  aim?: (t: number) => number;
  /**
   * (anim-natural N1 fix round) Posed as a co-op remote (tests/turnHarness.ts's model): 20 Hz snapshots rendered 0.1 s
   * behind, velocity and yaw rate measured from them, no driver phase or motion state, no face goal.
   */
  remote?: boolean;
  /** (fix round, CHECK finding 6) A guard (enemy.ts): its motion tuning, calm (a patrol) or alert. */
  guard?: 'calm' | 'alert';
}

export interface FootTurnRow {
  name: string;
  /** Pace at the metrics start (m/s) and the time the body takes to 90% of its yaw change (s). */
  speed: number;
  yaw90: number;
  yawTotalDeg: number;
  /** Largest planted-foot twist from the body yaw (deg), and the largest at the frame before a lift. */
  twistBody: number;
  twistAtLift: number;
  /** Audit wind: the planted foot's heading against the pelvis (deg; pelvis = yaw + the graph's pelvis yaw + the follow). */
  windPelvis: number;
  /** Longest time (s) one plant stays down while the body turns > 1 rad/s, and the most body yaw over one plant (deg). */
  plantTurnS: number;
  plantYawDeg: number;
  /** Planted ankle (planner spot) drift in one plant (cm). */
  ankleSlideCm: number;
  /** Rendered: contact-point slide (min of heel / ball travel in one plant, cm; decision 1), and the same with the pitch taken out. */
  renderSlideCm: number;
  flatSlideCm: number;
  /**
   * (anim-natural N1, decision 1; fix round finding 1a) Contact slide (cm): per plant each contact point's travel over
   * the frames it is down (metrics.ts contactSlide, as e2e-anim's foot lock and turn block): the heel while the heel is
   * down (`heelCm`), the ball while the ball is down (`ballCm`), both while flat; `contactCm` the larger. Heel and ball as
   * the rig poses them (footGeom: HEEL_DOWN under the ankle, HEEL_BACK behind, TOE_BALL ahead; the ankle raised by
   * `heelLift`, the foot turned by the planner's yaw and pitch + the stance pitch).
   */
  contactCm: number;
  heelCm: number;
  ballCm: number;
  /** Totals over the window: twist-cap turn of planted feet (deg), band scrub (cm), drag (cm). */
  capDeg: number;
  bandCm: number;
  dragCm: number;
  /** Snap: the swing foot's peak ankle speed in its first 3 swing frames (m/s) and its peak yaw rate there (deg/s). */
  snap: number;
  snapYaw: number;
  /** Least lateral gap between the feet in the pelvis frame while within 0.25 m front to back (cm; < 0 crossed; NaN never). */
  minGapCm: number;
  /** The same in the body (root yaw) frame (cm; NaN never). */
  minGapBodyCm: number;
  /** Landings in the window, and how many of the lifts were rule steps (not the gait clock's swing). */
  steps: number;
  ruleSteps: number;
  /** Pelvis yaw from the root (deg): range in the window (the audit's pelvisYawRange) and its peak. */
  pelvisRange: number;
  pelvisMax: number;
  /** The graph's standing holstered weight (the hip follow cap: PELVIS_FOLLOW_MAX..KEYED), its mean in the window. */
  keyHol: number;
}

interface PlantTrack {
  on: boolean;
  ax: number;
  az: number;
  hx: number;
  hz: number;
  tx: number;
  tz: number;
  fhx: number;
  fhz: number;
  ftx: number;
  ftz: number;
  turnT: number;
  yaw0: number;
  swingN: number;
  px: number;
  pz: number;
  pyaw: number;
  prevTwist: number;
  /** Contact slide: the rig's heel and ball per frame in the window (world x, y, z) and the contact flags. */
  heel: number[];
  ball: number[];
  contact: number[];
}

const track = (): PlantTrack => ({ on: false, ax: 0, az: 0, hx: 0, hz: 0, tx: 0, tz: 0, fhx: 0, fhz: 0, ftx: 0, ftz: 0, turnT: 0, yaw0: 0, swingN: 0, px: 0, pz: 0, pyaw: 0, prevTwist: 0, heel: [], ball: [], contact: [] });

/** Optional per-frame probe (debugging): sim time, the planner and its input after the update, the rendered pelvis yaw. */
export type FootTurnProbe = (t: number, p: FootPlanner, pi: ReturnType<typeof emptyPlannerInput>, pelvisYaw: number) => void;

/**
 * Run one scenario (60 Hz, the game's rate; `hz` another sim rate); returns the metrics row. `turnRule` 0: the planner
 * without the turn rules (master's).
 */
export function runFootTurn(sc: Scenario, probe?: FootTurnProbe, opts: { turnRule?: number; hz?: number } = {}): FootTurnRow {
  const hz = opts.hz ?? 60;
  const dt = 1 / hz;
  const d = new MotionDriver(0);
  const pr = proportions();
  const g = new AnimGraph(pr);
  const gi = defaultInput();
  const p = new FootPlanner();
  const pi = emptyPlannerInput();
  const mi = emptyMotionInput();
  const ankleH = pr.y.ankle;
  const heelZ = -pr.foot.len * 0.25;
  let x = 0;
  let z = 0;
  let follow = 0;
  let prevYaw: number | null = null;
  let yawRateS = 0;
  const tr = [track(), track()];
  const row: FootTurnRow = {
    name: sc.name,
    speed: 0,
    yaw90: 0,
    yawTotalDeg: 0,
    twistBody: 0,
    twistAtLift: 0,
    windPelvis: 0,
    plantTurnS: 0,
    plantYawDeg: 0,
    ankleSlideCm: 0,
    renderSlideCm: 0,
    flatSlideCm: 0,
    contactCm: 0,
    heelCm: 0,
    ballCm: 0,
    capDeg: 0,
    bandCm: 0,
    dragCm: 0,
    snap: 0,
    snapYaw: 0,
    minGapCm: Infinity,
    minGapBodyCm: Infinity,
    steps: 0,
    ruleSteps: 0,
    pelvisRange: 0,
    pelvisMax: 0,
    keyHol: 0,
  };
  let keyN = 0;
  let pelMin = Infinity;
  let pelMax = -Infinity;
  let base = { scrub: 0, scrubPos: 0, slide: 0 };
  const yaws: number[] = [];
  let yaw0 = 0;
  // (fix round) a remote's view: 20 Hz snapshots rendered 0.1 s behind (tests/turnHarness.ts)
  const snaps: { t: number; x: number; z: number; yaw: number }[] = [];
  let rvx = 0;
  let rvz = 0;
  let rPrevX = 0;
  let rPrevZ = 0;
  const snapEvery = Math.max(1, Math.round(hz / 20));
  // heel / toe world points of a foot (pitch optional)
  // (anim-natural N1, decision 1) the contact point: the heel (the audit's point) and the ball the rig keeps on the floor
  // (footGeom TOE_BALL ahead at HEEL_DOWN under the ankle; the audit's toe point, 0.43 of the foot at the ankle height, sat
  // 4-5 mm off it, which a ball pivot reads as slide)
  const pt = (f: FootState, lz: number, withPitch: boolean, pitchAdd: number, depth = ankleH): [number, number] => {
    const pitch = withPitch ? f.pitch + pitchAdd : 0;
    const ly = -depth;
    // Babylon RotationYawPitchRoll(yaw, pitch, 0): pitch about x (+ toe down), then yaw about y
    const zz = ly * Math.sin(pitch) + lz * Math.cos(pitch);
    return [f.x + zz * Math.sin(f.yaw), f.z + zz * Math.cos(f.yaw)];
  };
  for (let n = 0; n < sc.seconds * hz; n++) {
    const t = n * dt;
    const inWin = t >= sc.t0;
    if (n === Math.round(sc.t0 * hz)) {
      row.speed = d.speed;
      yaw0 = d.yaw;
      base = { scrub: p.L.scrub + p.R.scrub, scrubPos: p.L.scrubPos + p.R.scrubPos, slide: p.L.slide + p.R.slide };
    }
    const st = sc.stick(t);
    const aiming = !!sc.aim;
    // (fix round) a guard: the enemy driver (enemy.ts: not CT, faces its travel by the guard turn rates, sprinting over
    // 1.2 x walk), the rest as the player's rig
    mi.ct = !sc.guard;
    mi.faceTravel = !sc.guard;
    mi.sprinting = !!sc.guard && !!st && st.speed > 1.2 * 1.3;
    mi.aiming = aiming;
    mi.slowest = false;
    mi.crouch = sc.crouch ? 1 : 0;
    mi.yaw = aiming ? sc.aim!(t) : sc.guard && st ? st.dir : d.yaw;
    mi.vx = st ? Math.sin(st.dir) * st.speed : 0;
    mi.vz = st ? Math.cos(st.dir) * st.speed : 0;
    if (sc.guard) d.step(dt, mi, sc.guard === 'alert' ? ENEMY_MOTION : ENEMY_CALM_MOTION);
    else d.step(dt, mi);
    x += d.outX * dt;
    z += d.outZ * dt;
    let rx = x;
    let rz = z;
    let yaw = d.yaw;
    let vx = d.outX;
    let vz = d.outZ;
    if (sc.remote) {
      if (n % snapEvery === 0) snaps.push({ t, x, z, yaw: d.yaw });
      const rt = t - 0.1;
      let a = snaps[0]!;
      let b = a;
      for (let k = 0; k < snaps.length; k++) {
        if (snaps[k]!.t <= rt) a = snaps[k]!;
        if (snaps[k]!.t >= rt) {
          b = snaps[k]!;
          break;
        }
      }
      const kk = b.t > a.t ? (rt - a.t) / (b.t - a.t) : 0;
      rx = a.x + (b.x - a.x) * kk;
      rz = a.z + (b.z - a.z) * kk;
      yaw = a.yaw + wrap(b.yaw - a.yaw) * kk;
      if (n > 0) {
        rvx = approachTo(rvx, (rx - rPrevX) / dt, dt, 0.06);
        rvz = approachTo(rvz, (rz - rPrevZ) / dt, dt, 0.06);
      }
      rPrevX = rx;
      rPrevZ = rz;
      vx = rvx;
      vz = rvz;
    }
    // the rig's own measured yaw rate (RigPose.yawRate unset for the local player)
    if (prevYaw !== null) yawRateS = approachTo(yawRateS, wrap(yaw - prevYaw) / dt, dt, 0.05);
    prevYaw = yaw;
    const yr = yawRateS;
    const sp = sc.remote ? hyp2(vx, vz) : d.speed;
    gi.speed = sp;
    const stride = aiming ? 'velocity' : 'facing';
    if (stride === 'facing') {
      const along = vx * Math.sin(yaw) + vz * Math.cos(yaw);
      const back = sp < 0.9 && along < -0.7 * sp;
      gi.localX = 0;
      gi.localZ = back ? -1 : 1;
    } else {
      // root-local travel direction
      gi.localX = vx * Math.cos(yaw) - vz * Math.sin(yaw);
      gi.localZ = vx * Math.sin(yaw) + vz * Math.cos(yaw);
    }
    gi.grounded = true;
    gi.crouch = sc.crouch ? 1 : 0;
    gi.keyedOk = stride === 'facing';
    gi.ready = true;
    gi.armed = false;
    gi.raise = aiming ? 1 : 0;
    gi.yawRate = yr;
    gi.phase = sc.remote ? -1 : d.phase;
    gi.motion = sc.remote ? '' : d.state;
    gi.motionT = d.stateT;
    gi.quickStop = CT.stopBlend;
    gi.accelFwd = d.ax * Math.sin(yaw) + d.az * Math.cos(yaw);
    gi.accelSide = d.ax * Math.cos(yaw) - d.az * Math.sin(yaw);
    const tg = g.update(dt, gi);
    pi.dt = dt;
    pi.rootX = rx;
    pi.rootY = 0;
    pi.rootZ = rz;
    pi.yaw = yaw;
    pi.goalYaw = sc.remote ? yaw : d.goalYaw;
    pi.velX = vx;
    pi.velZ = vz;
    pi.moving = tg.gait.moving;
    pi.phase = tg.gait.phase;
    pi.duty = tg.gait.duty;
    pi.cycleTime = tg.gait.cycleTime;
    pi.liftH = tg.gait.liftH;
    pi.lX = tg.stance.lX;
    pi.lZ = tg.stance.lZ;
    pi.rX = tg.stance.rX;
    pi.rZ = tg.stance.rZ;
    pi.reach = (pr.thigh.len + pr.calf.len) * (0.62 + (CROUCH_REACH - 0.62) * (sc.crouch ? 1 : 0));
    pi.quickStop = CT.stopBlend;
    pi.hold = false;
    pi.turnStep = 0.9;
    pi.turnRule = opts.turnRule ?? 1;
    pi.yawRate = yr;
    pi.faceGoal = sc.remote ? Number.NaN : d.faceGoal;
    pi.stride = stride;
    pi.glide = aiming;
    pi.pelvisYaw = yaw + follow;
    pi.crouch = sc.crouch ? 1 : 0;
    pi.ground = null;
    p.update(pi);
    const L = p.L;
    const R = p.R;
    follow = pelvisFollow(follow, yaw, L.yaw, R.yaw, stride === 'facing' && L.contact, stride === 'facing' && R.contact, dt, PELVIS_FOLLOW_MAX + (PELVIS_FOLLOW_KEYED - PELVIS_FOLLOW_MAX) * tg.keyHol);
    const pelOff = tg.pelvis.yaw + follow;
    const pelYaw = yaw + pelOff;
    if (probe) probe(t, p, pi, pelYaw);
    if (!inWin) {
      // keep the plant trackers current before the window
      for (let k = 0; k < 2; k++) {
        const f = k === 0 ? L : R;
        tr[k]!.on = false;
        tr[k]!.px = f.x;
        tr[k]!.pz = f.z;
        tr[k]!.pyaw = f.yaw;
        tr[k]!.swingN = f.contact ? 0 : tr[k]!.swingN + 1;
      }
      continue;
    }
    yaws.push(yaw);
    row.keyHol += tg.keyHol;
    keyN++;
    pelMin = Math.min(pelMin, pelOff * D);
    pelMax = Math.max(pelMax, pelOff * D);
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? L : R;
      const s = tr[k]!;
      const st2 = k === 0 ? tg.stance.lPitch : tg.stance.rPitch;
      {
        // the rig's contact points (footGeom): the heel HEEL_BACK behind, the ball TOE_BALL ahead, HEEL_DOWN under the
        // ankle, the ankle HEEL_DOWN + heelLift over the floor, the foot turned by the planner's pitch + the stance pitch
        const p0 = f.pitch + st2;
        const ay = HEEL_DOWN + heelLift(f);
        const sy = Math.sin(f.yaw);
        const cy = Math.cos(f.yaw);
        for (let q = 0; q < 2; q++) {
          const lz = q === 0 ? -HEEL_BACK : TOE_BALL;
          const fz = -HEEL_DOWN * Math.sin(p0) + lz * Math.cos(p0);
          const fy = -HEEL_DOWN * Math.cos(p0) - lz * Math.sin(p0);
          (q === 0 ? s.heel : s.ball).push(f.x + fz * sy, f.y + ay + fy, f.z + fz * cy);
        }
        s.contact.push(f.contact ? 1 : 0);
      }
      if (f.contact) {
        const [hx, hz] = pt(f, heelZ, true, st2);
        const [tx, tz] = pt(f, TOE_BALL, true, st2, HEEL_DOWN);
        const [fhx, fhz] = pt(f, heelZ, false, 0);
        const [ftx, ftz] = pt(f, TOE_BALL, false, 0, HEEL_DOWN);
        if (!s.on) {
          s.on = true;
          s.ax = f.x;
          s.az = f.z;
          s.hx = hx;
          s.hz = hz;
          s.tx = tx;
          s.tz = tz;
          s.fhx = fhx;
          s.fhz = fhz;
          s.ftx = ftx;
          s.ftz = ftz;
          s.turnT = 0;
          s.yaw0 = yaw;
        }
        if (Math.abs(yr) > 1) s.turnT += dt;
        row.plantTurnS = Math.max(row.plantTurnS, s.turnT);
        row.plantYawDeg = Math.max(row.plantYawDeg, Math.abs(wrap(yaw - s.yaw0)) * D);
        row.ankleSlideCm = Math.max(row.ankleSlideCm, hyp2(f.x - s.ax, f.z - s.az) * 100);
        row.renderSlideCm = Math.max(row.renderSlideCm, Math.min(hyp2(hx - s.hx, hz - s.hz), hyp2(tx - s.tx, tz - s.tz)) * 100);
        row.flatSlideCm = Math.max(row.flatSlideCm, Math.min(hyp2(fhx - s.fhx, fhz - s.fhz), hyp2(ftx - s.ftx, ftz - s.ftz)) * 100);
        const tw = Math.abs(wrap(f.yaw - yaw)) * D;
        row.twistBody = Math.max(row.twistBody, tw);
        row.windPelvis = Math.max(row.windPelvis, Math.abs(wrap(f.yaw - pelYaw)) * D);
        s.prevTwist = tw;
        s.swingN = 0;
      } else {
        if (s.on || s.swingN === 0) {
          // lifted this frame
          row.twistAtLift = Math.max(row.twistAtLift, s.prevTwist);
          if (f.swBase < 0) row.ruleSteps++;
        }
        s.on = false;
        s.swingN++;
        if (s.swingN <= 3) {
          row.snap = Math.max(row.snap, hyp2(f.x - s.px, f.z - s.pz) / dt);
          row.snapYaw = Math.max(row.snapYaw, (Math.abs(wrap(f.yaw - s.pyaw)) * D) / dt);
        }
      }
      if (f.landed) row.steps++;
      s.px = f.x;
      s.pz = f.z;
      s.pyaw = f.yaw;
    }
    // feet gap in the pelvis frame
    const c = Math.cos(pelYaw);
    const sn = Math.sin(pelYaw);
    const along = (L.x - R.x) * sn + (L.z - R.z) * c;
    if (along < 0.25 && along > -0.25) row.minGapCm = Math.min(row.minGapCm, ((R.x - L.x) * c - (R.z - L.z) * sn) * 100);
    const cb = Math.cos(yaw);
    const sb = Math.sin(yaw);
    const alongB = (L.x - R.x) * sb + (L.z - R.z) * cb;
    if (alongB < 0.25 && alongB > -0.25) row.minGapBodyCm = Math.min(row.minGapBodyCm, ((R.x - L.x) * cb - (R.z - L.z) * sb) * 100);
  }
  // yaw change and the time to 90% of it
  let acc = 0;
  const cum: number[] = [];
  for (let k = 0; k < yaws.length; k++) {
    acc += k === 0 ? wrap(yaws[0]! - yaw0) : wrap(yaws[k]! - yaws[k - 1]!);
    cum.push(acc);
  }
  row.yawTotalDeg = acc * D;
  const want = Math.abs(acc) * 0.9;
  const hit = cum.findIndex((v) => Math.abs(v) >= want);
  row.yaw90 = hit < 0 ? 0 : (hit + 1) * dt;
  for (const s of tr) {
    const c = contactSlide(s.heel, s.ball, s.contact, 0.01);
    row.heelCm = Math.max(row.heelCm, c.heelWorst * 100);
    row.ballCm = Math.max(row.ballCm, c.ballWorst * 100);
  }
  row.contactCm = Math.max(row.heelCm, row.ballCm);
  row.capDeg = (p.L.scrub + p.R.scrub - base.scrub) * D;
  row.bandCm = (p.L.scrubPos + p.R.scrubPos - base.scrubPos) * 100;
  row.dragCm = (p.L.slide + p.R.slide - base.slide) * 100;
  row.pelvisRange = pelMax - pelMin;
  row.pelvisMax = Math.max(Math.abs(pelMax), Math.abs(pelMin));
  if (!Number.isFinite(row.minGapCm)) row.minGapCm = Number.NaN; // never side by side in the window
  if (!Number.isFinite(row.minGapBodyCm)) row.minGapBodyCm = Number.NaN;
  row.keyHol = keyN > 0 ? row.keyHol / keyN : 0;
  return row;
}

// ---- scenarios --------------------------------------------------------------------------------------------------

/** The pace a stick magnitude gives (the audit's scripted `y` values), standing or crouched. */
export const paceOf = (mag: number, crouched = false): number => stickSpeed(stickCurve(mag), crouched);
const S = GEARS.stand;
const C = GEARS.crouch;
const PRE = 1.8;
/** Straight along +z, then the stick turned by `deg` (a flick: one jump, as the audit's scripts). */
const turn = (speed: number, deg: number): Stick => (t) => ({ dir: t < PRE ? 0 : (deg * Math.PI) / 180, speed });
/** Straight, then the stick swept round at `rate` rad/s (a continuous circle). */
const sweep = (speed: number, rate: number): Stick => (t) => ({ dir: t < PRE ? 0 : (t - PRE) * rate, speed });
/** A held spin (tests/turnHarness.ts `spin`): the stick rotating at `rate` rad/s from 0.5 s. */
const spinAt = (speed: number, rate: number): Stick => (t) => ({ dir: t < 0.5 ? 0 : (t - 0.5) * rate, speed });

export const FOOT_TURN_SCENARIOS: Scenario[] = [
  // jog / run turns at the GEARS speeds (the audit's turn90-jog / -run, turn180-jog / -run: gear 4 / 5, stick 1)
  ...([['jog', S[3]], ['run', S[4]]] as const).flatMap(([g, v]) =>
    [45, 90, 180].map((deg) => ({ name: `${g} ${deg}`, seconds: PRE + 1.2, t0: PRE, stick: turn(v, deg === 180 ? 179.9 : deg) })),
  ),
  // stick sweeps: a slow curve (~70 deg/s, the audit's curve-jog), a sweep at 3 rad/s, a fast circle at 7 rad/s
  { name: 'jog sweep 1.2', seconds: PRE + 1.5, t0: PRE, stick: sweep(S[3], 1.2) },
  { name: 'jog sweep 3', seconds: PRE + 1.5, t0: PRE, stick: sweep(S[3], 3) },
  { name: 'jog sweep 7', seconds: PRE + 1.5, t0: PRE, stick: sweep(S[3], 7) },
  { name: 'run sweep 3', seconds: PRE + 1.5, t0: PRE, stick: sweep(S[4], 3) },
  { name: 'run sweep 7', seconds: PRE + 1.5, t0: PRE, stick: sweep(S[4], 7) },
  // walk turns: the audit's stick 0.5 (1.45 m/s) and the GEARS walk (2.1 m/s)
  { name: 'walk(a) 90', seconds: PRE + 1.4, t0: PRE, stick: turn(paceOf(0.5), 90) },
  { name: 'walk 90', seconds: PRE + 1.4, t0: PRE, stick: turn(S[2], 90) },
  { name: 'walk 180', seconds: PRE + 1.4, t0: PRE, stick: turn(S[2], 179.9) },
  // crouch walk turns (the audit's crouch-turn90: stick 0.6, 1.45 m/s) and the crouched jog
  { name: 'crouch(a) 90', seconds: PRE + 1.4, t0: PRE, crouch: true, stick: turn(paceOf(0.6, true), 90) },
  { name: 'crouch 180', seconds: PRE + 1.4, t0: PRE, crouch: true, stick: turn(paceOf(0.6, true), 179.9) },
  { name: 'crouch jog 90', seconds: PRE + 1.4, t0: PRE, crouch: true, stick: turn(C[3], 90) },
  // turns on the spot: from a standstill the stick pulled behind at a sneak (e2e-anim 'turn round (standstill)'), and
  // aiming still, the aim swung 90 / 180 deg (the body follows at the aim rate; the feet step round)
  { name: 'stand turn 180', seconds: 2.0, t0: 0.6, stick: (t) => (t < 0.6 ? null : { dir: Math.PI - 1e-3, speed: paceOf(0.3) }) },
  // (anim-natural N1) the same to the left (the gait clock lifts the right foot first either way)
  { name: 'stand turn L', seconds: 2.0, t0: 0.6, stick: (t) => (t < 0.6 ? null : { dir: -Math.PI + 1e-3, speed: paceOf(0.3) }) },
  { name: 'jog 90 L', seconds: PRE + 1.2, t0: PRE, stick: turn(S[3], -90) },
  { name: 'aim spot 90', seconds: 2.0, t0: 0.5, stick: () => null, aim: (t) => (t < 0.5 ? 0 : Math.PI / 2) },
  { name: 'aim spot 180', seconds: 2.4, t0: 0.5, stick: () => null, aim: (t) => (t < 0.5 ? 0 : Math.PI - 1e-3) },
  // starts, stops, a strafe (no turn: the planted-foot baseline)
  { name: 'start jog', seconds: 1.6, t0: 0.5, stick: (t) => (t < 0.5 ? null : { dir: 0, speed: S[3] }) },
  { name: 'stop jog', seconds: PRE + 1.0, t0: PRE, stick: (t) => (t < PRE ? { dir: 0, speed: S[3] } : null) },
  { name: 'stop run', seconds: PRE + 1.0, t0: PRE, stick: (t) => (t < PRE ? { dir: 0, speed: S[4] } : null) },
  { name: 'straight jog', seconds: PRE + 1.2, t0: PRE, stick: () => ({ dir: 0, speed: S[3] }) },
  { name: 'aim strafe', seconds: 2.2, t0: 0.8, stick: () => ({ dir: Math.PI / 2, speed: 1.4 }), aim: () => 0 },
  // (anim-natural N1 fix round, CHECK finding 1d) held spins (tests/turnHarness.ts SCENARIOS): the stick swept round at 7
  // rad/s (5.5 at 4.2 m/s) from 0.5 s, measured from 1 s; crouched; and a co-op remote's copy (20 Hz snapshots)
  ...([0.75, 2, 3, 4.2] as const).map((v) => ({ name: `spin ${v}`, seconds: 3.5, t0: 1.0, stick: spinAt(v, v > 4 ? 5.5 : 7) })),
  ...([0.85, 2.1] as const).map((v) => ({ name: `crouch spin ${v}`, seconds: 3.5, t0: 1.0, crouch: true, stick: spinAt(v, 7) })),
  ...([0.75, 2] as const).map((v) => ({ name: `remote spin ${v}`, seconds: 3.5, t0: 1.0, remote: true, stick: spinAt(v, 7) })),
  // (fix round, Course Ready anim-n4 inputs) the slow walk's late stance (a carry walk's pace, 0.75 m/s: the toe slid back
  // as the heel rose) and a start that turns 90 deg (the carry-walk start turn: the planted foot wound and slid)
  { name: 'slow walk', seconds: PRE + 1.6, t0: PRE, stick: () => ({ dir: 0, speed: 0.75 }) },
  { name: 'start 90 slow', seconds: 2.0, t0: 0.5, stick: (t) => (t < 0.5 ? null : { dir: Math.PI / 2, speed: 0.75 }) },
  { name: 'start 90', seconds: 2.0, t0: 0.5, stick: (t) => (t < 0.5 ? null : { dir: Math.PI / 2, speed: S[2] }) },
];

/**
 * (anim-natural N1 fix round, CHECK finding 6) Guard rows: the enemy motion driver (config/enemies.json walk 0.9 / 1.3,
 * run 3.2 m/s; patrol turns at the guard turn rates, 300-540 deg/s) through the same rig path (stride 'facing', the gait
 * clock from the driver). Measured with the turn rules and with turnRule 0 (master's planner).
 */
export const GUARD_SCENARIOS: Scenario[] = [
  ...([0.9, 1.3] as const).flatMap((v) => [90, 180].map((deg) => ({ name: `guard ${v} ${deg}`, seconds: PRE + 1.6, t0: PRE, guard: 'calm' as const, stick: turn(v, deg === 180 ? 179.9 : deg) }))),
  { name: 'guard run 3.2 90', seconds: PRE + 1.4, t0: PRE, guard: 'alert', stick: turn(3.2, 90) },
  { name: 'guard alert 1.3 180', seconds: PRE + 1.6, t0: PRE, guard: 'alert', stick: turn(1.3, 179.9) },
  { name: 'guard spin 1.3', seconds: 3.5, t0: 1.0, guard: 'calm', stick: spinAt(1.3, 7) },
  { name: 'guard straight 1.3', seconds: PRE + 1.2, t0: PRE, guard: 'calm', stick: () => ({ dir: 0, speed: 1.3 }) },
];

const COLS: [keyof FootTurnRow, string, number][] = [
  ['speed', 'v m/s', 2],
  ['yaw90', 'yaw90 s', 2],
  ['yawTotalDeg', 'yaw deg', 0],
  ['twistBody', 'twist', 1],
  ['twistAtLift', '@lift', 1],
  ['windPelvis', 'wind(p)', 1],
  ['plantTurnS', 'plantTurn s', 2],
  ['plantYawDeg', 'plantYaw', 0],
  ['ankleSlideCm', 'ankle cm', 1],
  ['renderSlideCm', 'render cm', 1],
  ['flatSlideCm', 'flat cm', 1],
  ['contactCm', 'contact', 1],
  ['heelCm', 'heel', 1],
  ['ballCm', 'ball', 1],
  ['capDeg', 'cap deg', 0],
  ['bandCm', 'band cm', 1],
  ['dragCm', 'drag cm', 1],
  ['snap', 'snap m/s', 2],
  ['snapYaw', 'snapYaw', 0],
  ['minGapCm', 'gap cm', 1],
  ['minGapBodyCm', 'gapB cm', 1],
  ['steps', 'steps', 0],
  ['ruleSteps', 'rule', 0],
  ['pelvisRange', 'pelR', 1],
  ['keyHol', 'keyHol', 2],
];

/** The table as text (one row per scenario). */
export function footTurnTable(rows: FootTurnRow[]): string {
  const w = 15;
  const head = 'scenario'.padEnd(w) + COLS.map(([, h]) => h.padStart(Math.max(7, h.length + 1))).join('');
  const lines = rows.map((r) => r.name.padEnd(w) + COLS.map(([k, h, dp]) => (Number.isNaN(r[k] as number) ? '-' : (r[k] as number).toFixed(dp)).padStart(Math.max(7, h.length + 1))).join(''));
  return [head, ...lines].join('\n');
}
