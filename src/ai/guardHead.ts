/**
 * (guard-render S3a) A human guard's head hit volume from the SIM, not from the rendered rig.
 *
 * The head sphere used to follow `rig.headNode` (copied at render rate in `Enemy.frame`): gameplay read graphics
 * state, and the rig's anim LOD (far guards solve every other frame) made it lag. This module gives the head centre
 * from the sim state alone (feet, yaw, crouch, speed, aim, pitch, wall, lean, held / blind pose, ladder). The rig is
 * not touched; the model is a fit of the rig's head node, `tests/guardHeadParity.test.ts` holds it to the rig
 * (T1 steady 5 cm, T2 posed 8 cm, T3 transitions 12 cm).
 *
 * The fit: the rig's head offset (root-local forward / up from the standing `hitVolumes().headY`, in units of
 * `height / 1.75`) is a small quadratic of the pose inputs, per locomotion regime. The coefficients below were fitted
 * to a sweep of the rig (NullEngine, grunt / sniper / enforcer / heavy armed, runner unarmed; aim, aim pitch, crouch,
 * speed, dash) and are rounded to 1 mm. Quadratic terms are in the order 1, x0, x1, .., x0x0, x0x1, .., x1x1, ..
 *
 * Pure: no Babylon, no rig. `guardHead` writes `out` in place (no allocation).
 */
import { proportions, type Build } from '../player/proportions';
import type { GuardCqMode } from '../game/closeQuarters';

type Q2 = readonly [number, number, number, number, number, number];
type Q3 = readonly [number, number, number, number, number, number, number, number, number, number];
type Q4 = readonly [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];

function q2(c: Q2, x: number, y: number): number {
  return c[0] + c[1] * x + c[2] * y + c[3] * x * x + c[4] * x * y + c[5] * y * y;
}
function q3(c: Q3, x: number, y: number, z: number): number {
  return c[0] + c[1] * x + c[2] * y + c[3] * z + c[4] * x * x + c[5] * x * y + c[6] * x * z + c[7] * y * y + c[8] * y * z + c[9] * z * z;
}
function q4(c: Q4, x: number, y: number, z: number, w: number): number {
  return (
    c[0] + c[1] * x + c[2] * y + c[3] * z + c[4] * w +
    c[5] * x * x + c[6] * x * y + c[7] * x * z + c[8] * x * w +
    c[9] * y * y + c[10] * y * z + c[11] * y * w +
    c[12] * z * z + c[13] * z * w + c[14] * w * w
  );
}

/** Root-local head offset (forward F, up U above the standing head height), per regime, standard height. Variables:
 *  a = aim 0..1, c = crouch 0..1, p = aim pitch (rad, clamped +-0.5), s = speed scaled (see each). */
const FIT = {
  /** Armed, standing still (a, c, p): the gun-ready stance. Sweep: aim 0..1 x pitch +-0.5 x crouch 0..1, speed 0. */
  idleAF: [0.167, 0.108, 0.406, -0.12, -0.043, -0.164, -0.358, -0.086, 0.077, -0.061] as Q3,
  idleAU: [-0.027, -0.068, -0.57, 0.002, -0.003, 0.095, 0.24, -0.03, 0.113, -0.085] as Q3,
  /** Unarmed (the runner), standing still (c, p): the hands-down stance. */
  idleNF: [0.047, 0.495, -0.105, -0.073, 0.041, -0.005] as Q2,
  idleNU: [-0.021, -0.387, 0.007, -0.224, 0.075, -0.009] as Q2,
  /** Walking with the weapon low (aim < 0.5, stride along the facing; a, c, p, speed / 2 m/s). */
  walkF: [0.007, 0.242, 0.121, 0, 0.09, -0.012, 0.104, -0.256, -0.095, -0.029, 0.005, 0.141, -0.001, 0.001, -0.047] as Q4,
  walkU: [-0.122, 0.011, -0.638, -0.012, 0.215, -0.015, -0.23, 0.102, 0.012, 0.302, 0.015, 0.049, -0.003, 0.003, -0.155] as Q4,
  /** Unarmed running (c, p, speed / 4 m/s), no dash blend. */
  runNF: [-0.429, 0.522, -0.058, 1.305, -0.086, 0.043, -0.156, -0.006, -0.028, -0.572] as Q3,
  runNU: [0.377, -0.389, -0.012, -0.999, -0.081, 0.042, -0.024, -0.006, 0.057, 0.466] as Q3,
  /** Moving with the weapon raised (aim >= 0.5; a, c, p, speed / 4 m/s). */
  moveF: [0.174, 0.072, 0.396, -0.123, 0.129, 0.001, -0.188, -0.372, -0.102, -0.047, 0.098, -0.025, -0.128, 0.028, 0.028] as Q4,
  moveU: [-0.036, -0.045, -0.619, 0.022, -0.13, -0.052, 0.173, 0.201, 0.086, -0.038, 0.135, 0.194, -0.163, 0.039, -0.033] as Q4,
  /** Armed dash (aim < 0.5 and fast; a, c, p, speed / 4 m/s). */
  dashF: [-0.06, 0.052, 0.514, -0.131, 0.83, -0.051, -0.061, -0.291, -0.072, -0.2, 0.089, -0.091, -0.031, 0.041, -0.382] as Q4,
  dashU: [0.153, -0.116, -0.773, 0.02, -0.676, 0.005, 0.169, 0.337, 0.12, 0.13, 0.067, 0.091, -0.021, 0.033, 0.287] as Q4,
  /** The held / blind pose with neck and chest at 0 (emote on, aim 0): forward F0(c) and up U0(c) as c, c^2. */
  heldF0: [0.113, 0.28, -0.076] as readonly [number, number, number],
  heldU0: [-0.031, -0.443, -0.022] as readonly [number, number, number],
  /** Unarmed hands-down offset in the held zero pose, fading with crouch: -0.067 (1 - c^2). */
  heldNoGun: -0.067,
  /** The scripted pitch's effect on the head (pn neck, pc chest, c crouch). */
  heldDF: [0.006, 0.141, 0.43, -0.015, -0.025, -0.051, -0.019, -0.067, -0.05, 0.004] as Q3,
  heldDU: [-0.002, -0.024, -0.056, 0.003, -0.067, -0.134, -0.051, -0.204, -0.157, 0.001] as Q3,
  /** Back flat to a wall (c, p), on top of the armed idle stance at the same aim: forward and up. */
  wallF: [-0.144, -0.174, -0.055, -0.087, -0.082, 0.018] as Q2,
  wallU: [0.002, 0.095, -0.155, 0.048, -0.143, -0.178] as Q2,
  /** The wall's side offset per `wallSide` (m, towards -side). */
  wallSide: 0.027,
  /** Lean round an edge: sideways per unit lean, forward per signed lean (m). */
  leanSide: 0.96,
  leanFwd: -0.03,
  /** Lean drop of the head (m) at |lean| = 0, .25, .5, .75, 1 for crouch 0, .5, 1 (the head arcs down as the body
   *  swings out; a crouched guard has less to drop). */
  leanDrop: [
    [0, 0.004, 0.06, 0.216, 0.491],
    [0, 0.0035, 0.014, 0.056, 0.346],
    [0, 0.003, 0.013, 0.029, 0.126],
  ] as readonly (readonly [number, number, number, number, number])[],
  /** At a wall the drop is larger towards `wallSide` (by this share of the drop). */
  leanWallAsym: 0.11,
  /** Ladder climb (armed; the unarmed climb is the idle stance): the head relative to the idle stance at aim 0. */
  climbF: -0.011,
  climbU: -0.041,
};

/** Scripted upper-body pitches (rad, +x tips the body forward and down) per held mode at full ramp: neck, chest. They
 *  copy `GuardCq.write` (`src/game/closeQuarters.ts`); `tests/guardHead.test.ts` checks them against `GuardCq`. */
export const HELD_PITCH: Record<GuardCqMode, readonly [number, number]> = {
  seized: [-0.5, -0.15],
  seizedLethal: [0.35, 0.25],
  hostage: [-0.3, -0.12],
  ko: [0.55, 0.4],
  interrogate: [-0.45, -0.12],
};
/** The flashbang's hands-to-face pose (`Enemy.blind`): neck, chest pitch and the pelvis lift (m). */
export const BLIND_PITCH = { neck: 0.45, chest: 0.3, lift: -0.06 } as const;

const DROP_BACK = 7;

/** The sim's copy of the rig's two lean springs (`AnimGraph`: head 34 / 18 per s, body 24 per s on a gated target),
 *  one state per guard, advanced by `leanStep`. `body` is the value `GuardHeadIn.lean` takes. */
export interface GuardLeanState {
  hd: number;
  hv: number;
  bd: number;
  bv: number;
  /** The drop's |lean|: follows the body out at once, settles back at `DROP_BACK` per s (the rig's head is slow to rise). */
  dr: number;
}

export function newLeanState(): GuardLeanState {
  return { hd: 0, hv: 0, bd: 0, bv: 0, dr: 0 };
}

/** One critically damped spring step (the rig's `Spring.step`), inlined for the state fields. */
function spring(x: number, v: number, target: number, omega: number, dt: number, out: GuardLeanState, isBody: boolean): void {
  const e = Math.exp(-omega * dt);
  const d = x - target;
  const t1 = (v + omega * d) * dt;
  const nx = target + (d + t1) * e;
  const nv = (v - omega * t1) * e;
  if (isBody) {
    out.bd = nx;
    out.bv = nv;
  } else {
    out.hd = nx;
    out.hv = nv;
  }
}

/** One step toward the wanted lean `target` (`Enemy.coverPeek`, -1 / 0 / 1), as the rig's head-first peek does. */
export function leanStep(st: GuardLeanState, target: number, dt: number): void {
  const out = target > 0.01 || target < -0.01;
  spring(st.hd, st.hv, target, out ? 34 : 18, dt, st, false);
  const ah = st.hd < 0 ? -st.hd : st.hd;
  const at = target < 0 ? -target : target;
  const bt = out ? (ah > at * 0.55 ? target : 0) : 0;
  spring(st.bd, st.bv, bt, 24, dt, st, true);
  const ab = st.bd < 0 ? -st.bd : st.bd;
  st.dr = ab >= st.dr ? ab : st.dr + (ab - st.dr) * Math.min(1, dt * DROP_BACK);
}

/** Aim pitch is clamped to this (rad): the fit's range. */
const PITCH_MAX = 0.5;
/** Moving above this speed (m/s) is a walk (the rig's gait blend); at standstill the idle stance. */
const MOVE_FROM = 0.3;
/** At or above this speed (m/s) the rig runs (a dash lean) whatever the dash blend. */
const RUN_FROM = 2.4;
/** The rig's walk fit spans up to this speed (m/s). */
const WALK_MAX = 2;

/** The per-guard constants for its build and height (built once, in the Enemy constructor). */
export interface GuardHeadRest {
  /** Height scale (`height / 1.75`): every fitted offset scales with it, as `proportions` does. */
  k: number;
  /** The standing head centre above the feet (`hitVolumes(p).headY`). */
  headY: number;
  /** Carries a weapon (the rig holds it: the stance leans forward). */
  armed: boolean;
  /** Dash starts above this speed with the weapon low (`0.8 * runSpeed`; never for a melee guard). */
  dashFrom: number;
}

/**
 * @param armed the guard carries a gun (`def.gun !== null`): the armed rig's body leans forward of the unarmed
 * @param runSpeed the def's run speed (m/s), 0 for a melee guard (the rig never dashes: `Enemy.frame` sets `dash` 0)
 */
export function guardHeadRest(height: number, build: Build, armed = true, runSpeed = 0): GuardHeadRest {
  const p = proportions(build, height);
  return {
    k: p.height / 1.75,
    headY: p.y.neck + p.neck.len + p.head.h * 0.42,
    armed,
    dashFrom: runSpeed > 0 ? runSpeed * 0.8 : Number.POSITIVE_INFINITY,
  };
}

/** The sim state the head follows (plain numbers; the feet are `Enemy.pos`). */
export interface GuardHeadIn {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** 0 standing .. 1 crouched. */
  crouch: number;
  /** Horizontal speed (m/s). */
  speed: number;
  /** Weapon raise 0..1: the value the rig gets (0 when held or climbing). */
  aim: number;
  aimPitch: number;
  /** Back to a wall (`coverPose === 'high'`) and the side of the wall (-1 / 0 / 1). */
  wall: boolean;
  wallSide: number;
  /** The sim-eased lean round an edge, -1..1 (`leanStep`, the body spring). */
  lean: number;
  /** The lean's |value| for the head's drop (`GuardLeanState.dr`); 0 = same as |lean|. */
  leanDrop: number;
  held: GuardCqMode | null;
  /** The struggle ramp 0..1. */
  heldK: number;
  /** The knockout's limp 0..1 (`cq.k` in mode 'ko'). */
  koK: number;
  /** The flashbang's pose ramp 0..1. */
  blind: number;
  climb: boolean;
}

export interface HeadOut {
  x: number;
  y: number;
  z: number;
}

function clampPitch(p: number): number {
  return p > PITCH_MAX ? PITCH_MAX : p < -PITCH_MAX ? -PITCH_MAX : p;
}

/** The head centre in world space, written to `out`. Offsets are computed root-local (forward, up, side) then turned. */
export function guardHead(i: GuardHeadIn, r: GuardHeadRest, out: HeadOut): void {
  const c = i.crouch;
  const pt = clampPitch(i.aimPitch);
  const climb = i.climb;
  const a = climb ? 0 : i.aim;
  const sp = climb ? 0 : i.speed;
  let f: number;
  let u: number;
  if (i.wall || sp <= MOVE_FROM) {
    // still (or back to a wall: the stance, whatever the speed)
    if (r.armed) {
      f = q3(FIT.idleAF, a, c, pt);
      u = q3(FIT.idleAU, a, c, pt);
    } else {
      f = q2(FIT.idleNF, c, pt);
      u = q2(FIT.idleNU, c, pt);
    }
  } else if (a >= 0.5) {
    f = q4(FIT.moveF, a, c, pt, sp / 4);
    u = q4(FIT.moveU, a, c, pt, sp / 4);
  } else if (r.armed) {
    if (sp > r.dashFrom || sp > RUN_FROM) {
      f = q4(FIT.dashF, a, c, pt, sp / 4);
      u = q4(FIT.dashU, a, c, pt, sp / 4);
    } else {
      f = q4(FIT.walkF, a, c, pt, (sp > WALK_MAX ? WALK_MAX : sp) / 2);
      u = q4(FIT.walkU, a, c, pt, (sp > WALK_MAX ? WALK_MAX : sp) / 2);
    }
  } else if (sp > RUN_FROM) {
    f = q3(FIT.runNF, c, pt, sp / 4);
    u = q3(FIT.runNU, c, pt, sp / 4);
  } else {
    f = q4(FIT.walkF, a, c, pt, (sp > WALK_MAX ? WALK_MAX : sp) / 2);
    u = q4(FIT.walkU, a, c, pt, (sp > WALK_MAX ? WALK_MAX : sp) / 2);
  }
  let sx = 0;
  const k = r.k;
  f *= k;
  u *= k;
  if (i.wall) {
    f += q2(FIT.wallF, c, pt) * k;
    u += q2(FIT.wallU, c, pt) * k;
    sx -= FIT.wallSide * i.wallSide * k;
  }
  const l = i.lean;
  if (l !== 0) {
    const al = i.leanDrop !== 0 ? i.leanDrop : l < 0 ? -l : l;
    sx += FIT.leanSide * l * k;
    f += FIT.leanFwd * l * k;
    // the drop: bilinear on |lean| (0, .25, .5, .75, 1) and crouch (0, .5, 1)
    const cu = (c < 0 ? 0 : c > 1 ? 1 : c) * 2;
    const ci = cu >= 1 ? 1 : 0;
    const cf = cu - ci;
    const lu = (al > 1 ? 1 : al) * 4;
    const li = lu >= 4 ? 3 : Math.floor(lu);
    const lf = lu - li;
    const t0 = FIT.leanDrop[ci]!;
    const t1 = FIT.leanDrop[ci + 1]!;
    const d0 = t0[li]! + (t0[li + 1]! - t0[li]!) * lf;
    const d1 = t1[li]! + (t1[li + 1]! - t1[li]!) * lf;
    let drop = d0 + (d1 - d0) * cf;
    if (i.wall) drop *= 1 + FIT.leanWallAsym * l * i.wallSide;
    u -= drop * k;
  }
  if (climb && r.armed) {
    f += FIT.climbF * k;
    u += FIT.climbU * k;
  }
  // scripted upper-body pose (held / blind): the emote overrides the neck and chest
  let w = 0;
  let pn = 0;
  let pc = 0;
  let lift = 0;
  if (i.held !== null && i.heldK > 0) {
    const h = HELD_PITCH[i.held];
    w = i.heldK;
    pn = h[0] * w;
    pc = h[1] * w;
    if (i.held === 'ko') {
      const hs = HELD_PITCH.hostage;
      const m = 1 - i.koK;
      pn = (hs[0] * m + h[0] * i.koK) * w;
      pc = (hs[1] * m + h[1] * i.koK) * w;
    }
  }
  if (i.blind > 0) {
    // blind: the held pose's blend (the emote's own ramp), the pitches on top
    if (i.blind > w) w = i.blind;
    pn += BLIND_PITCH.neck * i.blind;
    pc += BLIND_PITCH.chest * i.blind;
    lift = BLIND_PITCH.lift * i.blind;
  }
  if (w > 0) {
    const c2 = c * c;
    let hf = FIT.heldF0[0] + FIT.heldF0[1] * c + FIT.heldF0[2] * c2;
    const hu = FIT.heldU0[0] + FIT.heldU0[1] * c + FIT.heldU0[2] * c2;
    if (!r.armed) hf += FIT.heldNoGun * (1 - c2);
    hf += q3(FIT.heldDF, pn, pc, c);
    const hh = hu + q3(FIT.heldDU, pn, pc, c);
    f += (hf * k - f) * w;
    u += (hh * k - u) * w;
    u += lift;
  }
  const s = Math.sin(i.yaw);
  const co = Math.cos(i.yaw);
  out.x = i.x + sx * co + f * s;
  out.z = i.z - sx * s + f * co;
  out.y = i.y + r.headY + u;
}
