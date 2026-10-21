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
 */
import { AnimGraph, defaultInput } from '../src/anim/animGraph';
import { emptyPlannerInput, FootPlanner, type FootState } from '../src/anim/footPlanner';
import { emptyMotionInput, MotionDriver } from '../src/anim/motion';
import { PELVIS_FOLLOW_KEYED, PELVIS_FOLLOW_MAX, pelvisFollow } from '../src/anim/turnFollow';
import { CT, GEARS } from '../src/config/movement';
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
  /** Rendered: audit slide (min of heel / toe travel in one plant, cm), and the same with the pitch taken out. */
  renderSlideCm: number;
  flatSlideCm: number;
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
}

const track = (): PlantTrack => ({ on: false, ax: 0, az: 0, hx: 0, hz: 0, tx: 0, tz: 0, fhx: 0, fhz: 0, ftx: 0, ftz: 0, turnT: 0, yaw0: 0, swingN: 0, px: 0, pz: 0, pyaw: 0, prevTwist: 0 });

/** Run one scenario at 60 Hz; returns the metrics row. */
export function runFootTurn(sc: Scenario): FootTurnRow {
  const hz = 60;
  const dt = 1 / hz;
  const d = new MotionDriver(0);
  const pr = proportions();
  const g = new AnimGraph(pr);
  const gi = defaultInput();
  const p = new FootPlanner();
  const pi = emptyPlannerInput();
  const mi = emptyMotionInput();
  const ankleH = pr.y.ankle;
  const toeZ = pr.foot.len * 0.43;
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
  // heel / toe world points of a foot (pitch optional)
  const pt = (f: FootState, lz: number, withPitch: boolean, pitchAdd: number): [number, number] => {
    const pitch = withPitch ? f.pitch + pitchAdd : 0;
    const ly = -ankleH;
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
    mi.ct = true;
    mi.faceTravel = true;
    mi.aiming = aiming;
    mi.slowest = false;
    mi.crouch = sc.crouch ? 1 : 0;
    mi.yaw = aiming ? sc.aim!(t) : d.yaw;
    mi.vx = st ? Math.sin(st.dir) * st.speed : 0;
    mi.vz = st ? Math.cos(st.dir) * st.speed : 0;
    d.step(dt, mi);
    x += d.outX * dt;
    z += d.outZ * dt;
    const yaw = d.yaw;
    // the rig's own measured yaw rate (RigPose.yawRate unset for the local player)
    if (prevYaw !== null) yawRateS = approachTo(yawRateS, wrap(yaw - prevYaw) / dt, dt, 0.05);
    prevYaw = yaw;
    const yr = yawRateS;
    const vx = d.outX;
    const vz = d.outZ;
    const sp = d.speed;
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
    gi.phase = d.phase;
    gi.motion = d.state;
    gi.motionT = d.stateT;
    gi.quickStop = CT.stopBlend;
    gi.accelFwd = d.ax * Math.sin(yaw) + d.az * Math.cos(yaw);
    gi.accelSide = d.ax * Math.cos(yaw) - d.az * Math.sin(yaw);
    const tg = g.update(dt, gi);
    pi.dt = dt;
    pi.rootX = x;
    pi.rootY = 0;
    pi.rootZ = z;
    pi.yaw = yaw;
    pi.goalYaw = d.goalYaw;
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
    pi.yawRate = yr;
    pi.faceGoal = d.faceGoal;
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
      if (f.contact) {
        const [hx, hz] = pt(f, heelZ, true, st2);
        const [tx, tz] = pt(f, toeZ, true, st2);
        const [fhx, fhz] = pt(f, heelZ, false, 0);
        const [ftx, ftz] = pt(f, toeZ, false, 0);
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
  { name: 'aim spot 90', seconds: 2.0, t0: 0.5, stick: () => null, aim: (t) => (t < 0.5 ? 0 : Math.PI / 2) },
  { name: 'aim spot 180', seconds: 2.4, t0: 0.5, stick: () => null, aim: (t) => (t < 0.5 ? 0 : Math.PI - 1e-3) },
  // starts, stops, a strafe (no turn: the planted-foot baseline)
  { name: 'start jog', seconds: 1.6, t0: 0.5, stick: (t) => (t < 0.5 ? null : { dir: 0, speed: S[3] }) },
  { name: 'stop jog', seconds: PRE + 1.0, t0: PRE, stick: (t) => (t < PRE ? { dir: 0, speed: S[3] } : null) },
  { name: 'stop run', seconds: PRE + 1.0, t0: PRE, stick: (t) => (t < PRE ? { dir: 0, speed: S[4] } : null) },
  { name: 'straight jog', seconds: PRE + 1.2, t0: PRE, stick: () => ({ dir: 0, speed: S[3] }) },
  { name: 'aim strafe', seconds: 2.2, t0: 0.8, stick: () => ({ dir: Math.PI / 2, speed: 1.4 }), aim: () => 0 },
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
