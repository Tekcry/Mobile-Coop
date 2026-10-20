/** (A1.2) Shared turn harness: the rig's turn path without Babylon (motion driver -> anim graph -> foot planner -> pelvis follow). */
import { AnimGraph, defaultInput } from '../src/anim/animGraph';
import { emptyPlannerInput, FootPlanner } from '../src/anim/footPlanner';
import { emptyMotionInput, MotionDriver } from '../src/anim/motion';
import { kneePoleYaw, PELVIS_FOLLOW_KEYED, PELVIS_FOLLOW_MAX, pelvisFollow } from '../src/anim/turnFollow';
import { proportions } from '../src/player/proportions';

export const TAU = Math.PI * 2;
export const wrap = (a: number): number => {
  a %= TAU;
  return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a;
};

export interface Opts {
  seconds: number;
  hz?: number;
  crouch?: boolean;
  slowest?: boolean;
  /** Stick direction (world rad) and pace (m/s) at time t; null = released. */
  stick: (t: number) => { dir: number; speed: number } | null;
  /** Pose as a co-op remote does: 20 Hz snapshots interpolated, velocity and yaw rate measured, no driver phase. */
  remote?: boolean;
}

interface Landing {
  t: number;
  fwd: number;
  yawErr: number;
  turning: boolean;
  back: boolean;
}

/** The rig's turn path without Babylon: motion driver -> anim graph gait -> foot planner -> pelvis follow. */
export function run(o: Opts) {
  const hz = o.hz ?? 120;
  const dt = 1 / hz;
  const d = new MotionDriver(0);
  const g = new AnimGraph(proportions());
  const gi = defaultInput();
  const p = new FootPlanner();
  const pi = emptyPlannerInput();
  const mi = emptyMotionInput();
  const pr = proportions();
  let x = 0;
  let z = 0;
  let follow = 0;
  // remote state
  const snaps: { t: number; x: number; z: number; yaw: number }[] = [];
  let rvx = 0;
  let rvz = 0;
  let rPrevX = 0;
  let rPrevZ = 0;
  let rPrevYaw: number | null = null;
  let rYawRate = 0;
  const out = {
    minGapNear: Infinity,
    minGapPlanted: Infinity,
    maxPlantedTwist: 0,
    maxPlantedTwistBody: 0,
    maxKnee: 0,
    landings: [] as Landing[],
    maxSlide: 0,
    scrub: 0,
    /** (G1) Largest planted-foot distance from the root's midline (m, root frame), its least, and the world-lock drag. */
    latMax: 0,
    latMin: Infinity,
    drag: 0,
    scrubPos: 0,
    yawAt: [] as number[],
    yawRateAt: [] as number[],
    feetYawAt: [] as number[],
  };
  let prevL = { x: 0, z: 0, c: false };
  let prevR = { x: 0, z: 0, c: false };
  for (let n = 0; n < o.seconds * hz; n++) {
    const t = n * dt;
    const st = o.stick(t);
    mi.ct = true;
    mi.faceTravel = true;
    mi.aiming = false;
    mi.slowest = o.slowest ?? false;
    mi.yaw = d.yaw;
    mi.vx = st ? Math.sin(st.dir) * st.speed : 0;
    mi.vz = st ? Math.cos(st.dir) * st.speed : 0;
    d.step(dt, mi);
    x += d.outX * dt;
    z += d.outZ * dt;
    // what the rig sees
    let rx = x;
    let rz = z;
    let yaw = d.yaw;
    let vx = d.outX;
    let vz = d.outZ;
    let yr = d.yawRate;
    let phase = d.phase;
    let faceGoal = d.faceGoal;
    if (o.remote) {
      if (n % (hz / 20) === 0) snaps.push({ t, x, z, yaw: d.yaw });
      // render 0.1 s behind, interpolated between snapshots
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
        rvx = (rx - rPrevX) / dt + (rvx - (rx - rPrevX) / dt) * Math.exp(-dt / 0.06);
        rvz = (rz - rPrevZ) / dt + (rvz - (rz - rPrevZ) / dt) * Math.exp(-dt / 0.06);
      }
      rPrevX = rx;
      rPrevZ = rz;
      if (rPrevYaw !== null) {
        const dy = wrap(yaw - rPrevYaw) / dt;
        rYawRate = dy + (rYawRate - dy) * Math.exp(-dt / 0.05);
      }
      rPrevYaw = yaw;
      vx = rvx;
      vz = rvz;
      yr = rYawRate;
      phase = -1;
      faceGoal = Number.NaN;
    }
    const sp = Math.hypot(vx, vz);
    const along = vx * Math.sin(yaw) + vz * Math.cos(yaw);
    gi.speed = sp;
    gi.localX = 0;
    gi.localZ = sp < 0.9 && along < -0.7 * sp ? -1 : 1;
    gi.grounded = true;
    gi.crouch = o.crouch ? 1 : 0;
    gi.yawRate = yr;
    gi.phase = phase;
    gi.motion = o.remote ? '' : d.state;
    gi.motionT = d.stateT;
    const tg = g.update(dt, gi);
    pi.dt = dt;
    pi.rootX = rx;
    pi.rootZ = rz;
    pi.yaw = yaw;
    pi.goalYaw = yaw;
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
    pi.reach = (pr.thigh.len + pr.calf.len) * 0.62;
    pi.turnStep = 0.9;
    pi.yawRate = yr;
    pi.faceGoal = faceGoal;
    pi.stride = 'facing';
    pi.pelvisYaw = yaw + follow;
    pi.crouch = o.crouch ? 1 : 0;
    p.update(pi);
    const L = p.L;
    const R = p.R;
    // measured in the pelvis frame the planner used this frame, then the pelvis follows
    const py = pi.pelvisYaw;
    // (anim-rework S2) standing models the holstered player (the rig raises the cap to PELVIS_FOLLOW_KEYED); crouched as before
    follow = pelvisFollow(follow, yaw, L.yaw, R.yaw, L.contact, R.contact, dt, o.crouch ? PELVIS_FOLLOW_MAX : PELVIS_FOLLOW_KEYED);
    const c = Math.cos(py);
    const s = Math.sin(py);
    const gapAlong = (L.x - R.x) * s + (L.z - R.z) * c;
    const gap = (R.x - L.x) * c - (R.z - L.z) * s;
    if (Math.abs(gapAlong) < 0.25) out.minGapNear = Math.min(out.minGapNear, gap);
    if (L.contact && R.contact && Math.abs(gapAlong) < 0.25) out.minGapPlanted = Math.min(out.minGapPlanted, gap);
    for (const f of [L, R]) {
      if (f.contact) out.maxPlantedTwist = Math.max(out.maxPlantedTwist, Math.abs(wrap(f.yaw - py)));
      if (f.contact) out.maxPlantedTwistBody = Math.max(out.maxPlantedTwistBody, Math.abs(wrap(f.yaw - yaw)));
      if (f.contact && pi.moving) {
        const lat = Math.abs((f.x - rx) * Math.cos(yaw) - (f.z - rz) * Math.sin(yaw));
        out.latMax = Math.max(out.latMax, lat);
        out.latMin = Math.min(out.latMin, lat);
      }
      out.maxKnee = Math.max(out.maxKnee, Math.abs(wrap(kneePoleYaw(py, f.yaw) - py)));
      if (f.landed) {
        const fwd = (f.x - rx) * s + (f.z - rz) * c;
        out.landings.push({ t, fwd, yawErr: Math.abs(wrap(f.yaw - yaw)), turning: Math.abs(yr) > 1.5, back: d.backward });
      }
    }
    if (prevL.c && L.contact) out.maxSlide = Math.max(out.maxSlide, Math.hypot(L.x - prevL.x, L.z - prevL.z));
    if (prevR.c && R.contact) out.maxSlide = Math.max(out.maxSlide, Math.hypot(R.x - prevR.x, R.z - prevR.z));
    prevL = { x: L.x, z: L.z, c: L.contact };
    prevR = { x: R.x, z: R.z, c: R.contact };
    out.yawAt.push(d.yaw);
    out.yawRateAt.push(d.yawRate);
    out.feetYawAt.push(Math.max(Math.abs(wrap(L.yaw - d.yaw)), Math.abs(wrap(R.yaw - d.yaw))));
  }
  out.scrub = p.L.scrub + p.R.scrub;
  out.drag = p.L.slide + p.R.slide;
  out.scrubPos = p.L.scrubPos + p.R.scrubPos;
  return out;
}

/** A held spin: the stick rotating at `rate` rad/s from 0.5 s, for `secs` s. */
export const spin = (speed: number, rate = 7) => (t: number) => ({ dir: t < 0.5 ? 0 : (t - 0.5) * rate, speed });
/** Straight for 1.5 s, then the stick flicked 180 deg. */
export const flick = (speed: number) => (t: number) => ({ dir: t < 1.5 ? 0 : Math.PI, speed });

export const SCENARIOS: { name: string; o: Opts }[] = [
  ...[0.75, 2.0, 3.0, 4.2].map((v) => ({ name: `spin ${v}`, o: { seconds: 3.5, stick: spin(v, v > 4 ? 5.5 : 7) } })),
  ...[0.85, 2.1].map((v) => ({ name: `crouched spin ${v}`, o: { seconds: 3.5, crouch: true, stick: spin(v) } })),
  ...[0.75, 2.0, 3.0].map((v) => ({ name: `flick ${v}`, o: { seconds: 2.6, stick: flick(v) } })),
  { name: 'run reversal 4.2', o: { seconds: 2.6, stick: flick(4.2) } },
];
