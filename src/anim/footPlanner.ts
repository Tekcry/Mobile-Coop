import { hyp2 } from '../core/mathx';
import { SP, STEP, stepGaitNow, stepSelect, stepSelectRows, stepStride } from './tuneStep';
import { ankleToBall, HEEL_BACK, TOE_BALL } from './footGeom';
/** (anim-natural N1) Heel to ball along the foot (m): toe up, the heel's spot is this far behind the ball's flat spot. */
const HEEL_BALL = HEEL_BACK + TOE_BALL;
/**
 * World-space foot planner (pure, allocation-free, unit-tested).
 *
 * Moving: contacts follow the gait clock (left on the ground for `duty` of the cycle from phase 0,
 * right from 0.5). A foot on the ground is locked in world space, so it cannot slide whatever the root
 * does; a foot in swing travels from where it left the ground to a landing point predicted from the
 * root's velocity (half a stance ahead of the hip, so mid-stance is under the body), lifted along a
 * swing arc with toe-off and heel-strike pitch. When stopping, landings aim at the predicted rest
 * position (distance matching), so the last steps land where the body stops.
 *
 * Still: feet stay planted; when the body turns or settles away from a foot's ideal stance spot, that
 * foot takes a deliberate step (one at a time). Turning on the spot and settling after a stop are
 * therefore real steps, and the feet never cross.
 */

export interface FootState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** On the ground (locked). */
  contact: boolean;
  /** Swing progress 0..1 while stepping, else -1. */
  swing: number;
  /** Toe pitch from the swing (toe down +). */
  pitch: number;
  /** (step 22) Toe pitch when a quick stop's set-down or closing step began: it eases flat from there (no toe-off). */
  fromPitch: number;
  /** (step 22, A79) Heel-to-toe roll time left after a heel-first landing (s); 0 when flat. */
  roll: number;
  /** Landed this frame (heel strike). */
  landed: boolean;
  /** Distance a locked foot was dragged (should stay ~0). */
  slide: number;
  /** (A1.2) Yaw a planted foot was turned by the twist cap (rad; should stay ~0). */
  scrub: number;
  /** (G1) Distance a planted foot was scrubbed sideways by the free-movement stance band (m): CT's feet pivot with the hips. */
  scrubPos: number;
  // swing internals
  fromX: number;
  fromY: number;
  fromZ: number;
  fromYaw: number;
  toX: number;
  toY: number;
  toZ: number;
  toYaw: number;
  stepT: number;
  stepDur: number;
  stepLift: number;
  probeT: number;
  /** (step 22) Share of the step toward its target the landing spot keeps (1: all; less: held back from a drop's edge). */
  edgeK: number;
  /** Swing progress when the gait clock's swing window began (an early toe-off already in the air), else -1. */
  swBase: number;
  /** (fix 21-2) Where the foot was minus where the clock's swing put it when the clock took over an early toe-off. */
  offX: number;
  offY: number;
  offZ: number;
  /** (fix 21-2) Time (s) since the offset was taken (-1: none). */
  offBase: number;
  /** (mt2-fixB) The seconds that offset fades over (0: OFF_FADE). */
  offDur: number;
  /** (mocap-trial, A3) The swing in the air is the clip's (clip feet mode), not the planner's. */
  clipOwn: boolean;
  /** (mocap-trial, fix 1) Planted under the clip: landed by it, or its pitch taken over from the planner's. */
  clipPlant: boolean;
  /** (mocap-trial, fix 1) Seconds since the clip took this foot's pitch over from the planner's (-1: the planner's). */
  clipPitchT: number;
  /** (mocap-trial, fix 1) The foot's pitch minus the clip's then (rad): it fades out (CLIP_PITCH_EASE / _SWING). */
  clipPitchOff: number;
  /** (mocap-trial-2, runturn) The body yaw (rad) and the root (world x / z) at this swing's lift, and the share of the
   *  swing run in the body's frame (`CLIP_SWING`, set at the lift: 0 without clip feet on hand). */
  liftYaw: number;
  liftX: number;
  liftZ: number;
  liftW: number;
  /**
   * (anim-natural N1) A clock swing started early (a toe-off or a turn step, lifted in the foot's stance window): it aims
   * as the clock's swing will (`aimClock`, landing on the foot's clock strike), so the clock takes it over without a jump.
   */
  early: boolean;
  /** (anim-natural N1) The early swing is a turn step (rule A): timed to land exactly on the foot's clock strike. */
  turn: boolean;
  /** (anim-natural N1) Time (s) since this foot last landed (0 in the air). */
  plantT: number;
  /** (anim-natural N1, rule B) The planted foot turns about its ball (heel up): the ball's world spot is the anchor. */
  anchored: boolean;
  ballX: number;
  ballZ: number;
  /** (anim-natural N1) The pitch and yaw the ankle was last placed for (unchanged: the ankle is left bit for bit as it is). */
  ancP: number;
  ancYaw: number;
  /** (anim-natural N1) Yaw the foot has pivoted on its ball this plant (rad), and the pivot's own heel raise (rad). */
  pivot: number;
  heelP: number;
  /** (anim-natural N1) Turn steps taken (counted, for tests and the harness). */
  turnSteps: number;
  init: boolean;
}

function newFoot(): FootState {
  return { x: 0, y: 0, z: 0, yaw: 0, contact: true, swing: -1, pitch: 0, fromPitch: 0, roll: 0, landed: false, slide: 0, scrub: 0, scrubPos: 0, fromX: 0, fromY: 0, fromZ: 0, fromYaw: 0, toX: 0, toY: 0, toZ: 0, toYaw: 0, stepT: 0, stepDur: 0.3, stepLift: 0.05, probeT: 0, edgeK: 1, swBase: -1, offX: 0, offY: 0, offZ: 0, offBase: -1, offDur: 0, clipOwn: false, clipPlant: false, clipPitchT: -1, clipPitchOff: 0, liftYaw: 0, liftX: 0, liftZ: 0, liftW: 0, early: false, turn: false, plantT: 0, anchored: false, ballX: 0, ballZ: 0, ancP: 0, ancYaw: 0, pivot: 0, heelP: 0, turnSteps: 0, init: false };
}

export interface PlannerInput {
  dt: number;
  /** Root (feet level) world position and facing. */
  rootX: number;
  rootY: number;
  rootZ: number;
  yaw: number;
  /** Where the body is turning to (stepped turns plant feet for the goal). */
  goalYaw: number;
  /** Root velocity (world, m/s). */
  velX: number;
  velZ: number;
  /** Gait clock and whether contacts follow it. */
  moving: boolean;
  phase: number;
  duty: number;
  /** Seconds per gait cycle (two steps) at the current speed. */
  cycleTime: number;
  /** Swing lift (m). */
  liftH: number;
  /** Ideal stance offsets (root space, m) per foot. */
  lX: number;
  lZ: number;
  rX: number;
  rZ: number;
  /** Predicted rest position while stopping (distance matching), when `rest` is true. */
  rest: boolean;
  restX: number;
  restZ: number;
  /** Max leg reach from under the hip before a planted foot must step (m). */
  reach: number;
  /**
   * Chaos Theory instant stop (3.2.0, s; 0 = off): when moving stops, a foot still in its gait swing sets down within
   * this instead of finishing the stride at idle pace (planted feet stay locked).
   */
  quickStop: number;
  /** Chaos Theory stop hold (3.2.0): stopped feet stay where they are - no settling or idle steps until it ends. */
  hold: boolean;
  /**
   * (3.2.0) Pinned feet (world x / z; NaN = free): a co-op remote's still feet step to where the owner's are
   * planted (back-to-wall, step 11), instead of where its own history put them.
   */
  pinLX: number;
  pinLZ: number;
  pinRX: number;
  pinRZ: number;
  /**
   * (step 11) Back to a wall: no foot lands behind the plane n . p = wallD (outward normal wallNx / wallNz; wallD NaN =
   * none), and a planted foot turned more than `turnStep` (rad) from the body steps round with it (a turn onto the wall
   * never twists the legs across each other).
   */
  wallNx: number;
  wallNz: number;
  wallD: number;
  turnStep: number;
  /** Ground height under a point, or null (keeps the root height). */
  ground: ((x: number, z: number, yFrom: number) => number | null) | null;
  /** (A1.2) Body yaw rate (rad/s): landings are predicted along the turn. */
  yawRate: number;
  /** (A1.2) Where the body is turning to (rad); NaN = unknown (a remote: the prediction caps at +-90 deg). */
  faceGoal: number;
  /**
   * (A1.2) 'facing': free movement, the stride runs along the facing (no sideways or backwards steps except the slowest
   * back walk). 'velocity': aiming, wall, cover: the stride follows the velocity.
   */
  stride: 'facing' | 'velocity';
  /** (anim-rework S3) The standing aimed glide (a carrier aiming on foot): the closing foot comes in to GLIDE_GAP. */
  glide?: boolean;
  /** (A1.2) The pelvis yaw (rad; NaN = the body yaw): the no-crossing rules are measured in its frame. */
  pelvisYaw: number;
  /** (G1) Crouch 0..1: crouched, a trailing foot rises onto its toes further (HEEL_RAISE.pitchCrouch), so the rear knee stays off the floor. */
  crouch: number;
  /**
   * (anim-natural N1) The turn rules (the turn step, the ball pivot, no band scrub): 1 on (the default), 0 off (the
   * ankle-centred twist cap and the band scrub as before): a planner's opt-out.
   */
  turnRule: number;
  /** (mocap-trial, A3) The clip feet this frame (mocap set clips with a `feet` channel), or absent / null: the planner's steps. */
  clipFeet?: ClipFeetIn | null;
  /** (mt2-pop1) The rig's reach need per planted leg last frame (m: how far the pelvis drops for it; read with clip feet only). */
  reachNeedL?: number;
  reachNeedR?: number;
  /** (mocap-trial-2, crouchpop) The mocap switch (LOCO.mocap): a clip-planted foot's hand-off rules (clipHeld, beginSwing). */
  mocap?: boolean;
  /** (mocap-trial-2, strafe) The mocap strafe's share of the pose (animGraph `keyStrafe`; absent / 0: off, the switch off). */
  strafe?: number;
}

/**
 * (mocap-trial, A3) One frame of clip feet from the graph: `f` per side L then R (5 each, `keyed.ts` KF order) the ankle
 * in the root frame in world metres, already scaled to the body and to the game's stride (x right, y the lift over the
 * ground, z forward), the foot pitch (rad, + heel up) and the clip's contact (0..1, information only: contacts keep the
 * gait clock's windows); `on`: new steps and planted feet follow the clip (off: the planner's rules; a clip swing in the
 * air still finishes under the clip).
 */
export interface ClipFeetIn {
  on: boolean;
  readonly f: Float64Array;
}

export function emptyPlannerInput(): PlannerInput {
  return { dt: 0, rootX: 0, rootY: 0, rootZ: 0, yaw: 0, goalYaw: 0, velX: 0, velZ: 0, moving: false, phase: 0, duty: 0.62, cycleTime: 1.1, liftH: 0.06, lX: -0.11, lZ: 0.03, rX: 0.11, rZ: -0.02, rest: false, restX: 0, restZ: 0, reach: 0.55, quickStop: 0, hold: false, pinLX: NaN, pinLZ: NaN, pinRX: NaN, pinRZ: NaN, wallNx: 0, wallNz: 0, wallD: NaN, turnStep: 0.9, ground: null, yawRate: 0, faceGoal: NaN, stride: 'velocity', pelvisYaw: NaN, crouch: 0, turnRule: 1 };
}

/**
 * (A1.2) Legs follow the body in turns: the largest planted-foot yaw from the body (`twistMax`, rad, 52 deg), the
 * least lateral gap between the feet in the pelvis frame for an airborne foot (`minGapAny`, m) within `nearAlong` m
 * front to back, and the most a foot turns in one swing (`maxSwingYaw`, rad).
 * (anim-rework S2) Standing, a planted foot steps back into the band `standMinLateral`..`standMaxLateral` 0.03-0.09 m
 * (the G1 band 0.055-0.14 let a foot sit 16 cm off the line under the hips before it stepped back in, METRICS.md; the
 * keyed walk's track is 4.5 cm), and the scrub (`minLateral`..`maxLateral`, the G1 band) moves a planted standing
 * foot only in a sustained spin (SPIN_SCRUB); in a turn or a direction change it steps instead (the scrub slid planted
 * feet 4-10 cm through 90 / 180 deg direction changes). Crouched keeps the G1 rules.
 */
export const TURN_FOLLOW = { twistMax: 0.9, minGapAny: 0.08, nearAlong: 0.25, maxSwingYaw: 3.4, earlySwap: 0.85, twistFree: 0.25, minLateral: 0.055, maxLateral: 0.14, scrubSpeed: 1.8, standMinLateral: 0.03, standMaxLateral: 0.09 } as const;
/** (anim-rework S2) The free-movement stance band a planted foot steps back into and a landing aims inside (m from the
 *  root's midline): the standing band (standMin / standMax) on foot, the wider G1 band crouched (slice 4 owns it). */
function bandMin(i: PlannerInput): number {
  return i.crouch > 0.5 ? CROUCH_BAND.min : TURN_FOLLOW.standMinLateral;
}
function bandMax(i: PlannerInput): number {
  return i.crouch > 0.5 ? CROUCH_BAND.max : TURN_FOLLOW.standMaxLateral;
}

/**
 * (CT prototype G1, audit row 1-2) Free movement (`stride: 'facing'`) turns the legs as one unit with the body, as Chaos
 * Theory does (105624 @ 24-27, 105949 @ 10-13): a planted foot turns with the root to within `TURN_FOLLOW.twistFree` (rad,
 * 14 deg; was the 52 deg `twistMax`) and stays inside a lateral band of `minLateral`..`maxLateral` m either side of the
 * root's midline (scrubbing on the floor as CT's feet do), landings aim inside the same band; aiming, walls and cover keep
 * the world-locked feet. `HEEL_RAISE`: a planted foot behind the hip rises onto its toes over the last share of its stance
 * (`from` .. 1 of the stance, up to `pitch` rad toe down), so the trailing leg stays long and the pelvis need not drop.
 */
export const HEEL_RAISE = { from: 0.4, pitch: 0.6, pitchRun: 0.6, pitchCrouch: 1.0 } as const;
/** (G1, audit rows 5 / 6) A landing aims this share of the stance's travel ahead of the hip (was 0.5): the pelvis dips less. */
export const LAND_AHEAD = 0.4;
/** (G1 fix) Running (from `LAND_AHEAD_RUN.from` to `to` m/s) the landing comes in to `share`: the pushing leg is the longer one. */
export const LAND_AHEAD_RUN = { share: 0.35, from: 2.2, to: 3.0 } as const;
/** (G1, audit row 9) A Chaos Theory stop's set-down lands no further than this (m, front to back) from the planted foot. */
export const STOP_SPLIT = 0.3;
/** (G1 fix) A stop frozen wider than this (m, front to back) closes the rear foot in under the body over STOP_CLOSE_TIME (s). */
export const STOP_CLOSE = 0.45;
const STOP_CLOSE_TIME = 0.2;

/** A pinned foot further than this (m) from its pin steps onto it. */
export const PIN_TOL = 0.04;

/**
 * (locomotion step 22, A79) Heel-to-toe roll: at a walking pace (standing gears 1-3, crouched gears 1-4) a foot lands
 * heel first with the toe `pitch` up and rolls flat over `time` s after contact (the rig keeps the heel on the
 * floor while it does). Faster gaits land flatter, as before.
 */
export const HEEL_ROLL = { pitch: 0.3, time: 0.1, maxSpeed: 2.2 } as const;

/** Idle stepping thresholds. */
export const PLANNER = { idleErr: 0.075, idleStagger: 0.16, idleYawErr: 0.38, idleStepTime: 0.34, idleStepCrouch: 0.45, idleLift: 0.05, minGap: 0.13, maxStep: 2.6, swingGap: 0.1, swingNear: 0.18 };

const TAU = Math.PI * 2;
const wrap = (a: number): number => {
  a %= TAU;
  return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a;
};
const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clampAbs = (a: number, m: number): number => (a > m ? m : a < -m ? -m : a);
/** (anim-rework S2) The fastest a planted heel rises onto the toes (rad/s); a gait's own raise stays under it. */
const HEEL_RISE = 6;
/** (anim-rework S2) Free movement: a landing keeps at least this share of the stance width from the other foot (no crossing). */
const FREE_GAP = 0.85;
/** (anim-rework S3) The standing aimed glide's least lateral gap between the feet (m; PLANNER.minGap elsewhere). */
export const GLIDE_GAP = 0.09;
/**
 * (anim-rework S4) Standing up or crouching down while still, the feet re-step into the new stance: for `window` s after
 * the crouch crosses half way the idle steps at a sideways error of `err` m (PLANNER.idleErr otherwise, which left the
 * crouched sneak's foot spacing under a standing body until it grew past 7.5 cm).
 */
export const RESTEP = { window: 1.2, err: 0.02 } as const;
/** (anim-rework S4) Crouched free movement: the stance band a planted foot steps back into (m from the midline; the G1
 *  band 0.055-0.14 crouched before let a foot sit 14 cm out, past the crouched 8 cm track). */
export const CROUCH_BAND = { min: 0.035, max: 0.1 } as const;
/** (anim-rework S2) Standing, the planted feet pivot with the band (the scrub) only after this long (s) of continuous fast turning. */
const SPIN_SCRUB = 0.5;
/** (locomotion step 21, A80) A start's first steps (s): the trailing foot may toe off early at any speed. */
const START_TOE_OFF = 1.2;
/** (G1 fix) The legs turn with the body (twistFree, the band's scrub) while it turns faster than 1 rad/s and this long after (s). */
const BAND_TURN_TIME = 0.25;
/** (G1 fix) A planted foot this far (m) outside the stance band steps back into it. */
const BAND_STEP = 0.02;
/** (anim-natural N1 fix round) The same crouched with the turn rules (m). */
const BAND_STEP_CROUCH = 0.004;
/** (G1) A turn's after-effect (s): a foot it left behind may toe off early this long after the body stops turning. */
const TURN_LEFT_TIME = 0.6;
/** (fix 21-2) Still this long (s) before a move counts as a new start. */
const START_STILL = 0.25;
/** (fix 21-2) Time (s) over which a taken-over early toe-off's gap to the clock's swing fades out. */
const OFF_FADE = 0.15;
/**
 * (mocap-trial, fix 1) Time (s) over which a planted foot the clip takes over from the planner eases its pitch onto the
 * clip's: at a fast turn's end the planner's raised heel (0.54 rad) snapped down at the rig's pitch cap and the pelvis
 * dropped 4-10 cm in a few frames to reach the lowered ankle.
 */
const CLIP_PITCH_EASE = 0.15;
/**
 * (mocap-trial, fix 1) Share of a clip swing over which a pitch the planner left at the lift fades into the clip's (the
 * first clip swing after a start: 0.10 -> 0.93 rad, the ankle-toe bone 26 deg in a frame).
 */
const CLIP_PITCH_SWING = 0.3;
/**
 * (mt2-pop1, CHECK-2 required 1) Clip feet on hand (a fast walk turn hands the steps to the planner): a planted foot the
 * turn left behind toes off once the other foot's swing is past CLIP_TOE_OFF_SWING and the rig already drops the pelvis
 * more than CLIP_TOE_OFF_NEED (m) for its leg (`PlannerInput.reachNeedL` / `R`, last frame's), not only once the other
 * foot has landed. At a walk the trailing foot was held planted at its reach until the other landed at phase 0.50 while
 * the turn slot faded out over it: the pelvis sank 9-12 cm in ~6 frames (2.0 m/s x 4 rad/s 2.1-2.3 cm a frame beyond
 * pace x dt). The need is a frame late and grows 2-3 cm a frame there, hence the low threshold.
 */
const CLIP_TOE_OFF_SWING = 0.75;
const CLIP_TOE_OFF_NEED = 0.01;
/** (mocap-trial-2, strafe) In the mocap strafe a swing target that moves more than this in a frame (m) fades in as the
 *  rest spot's re-aim does (OFF_FADE), not in one frame. */
const STRAFE_REAIM = 0.05;
/** (mocap-trial-2, strafe) The strafe share (keyStrafe) the re-aim fade and the takeover fade act from: a real strafe, not
 *  the ~1e-6 a forward / back snap leaves (its fade outlived the touchdown: a 3.2 cm planted slide). */
const STRAFE_ON = 0.05;
/** (mocap-trial-2 strafe fix 3) In the mocap strafe a planted foot past the planner's reach is not dragged while the rig's
 *  reach need for its leg (last frame's pelvis drop, m) is at most this: the rig still holds it (the drop eases it). */
const STRAFE_HOLD_NEED = 0.15;
/**
 * (mocap-trial-2, runturn) A fast jog / run turn hands the steps to the planner inside the clip's long swing window (the
 * gait clock keeps the clip's stance; run duty 0.156: ~0.55 s in the air, 126 deg of a 4 rad/s turn). Swung along the
 * world chord from its lift spot to its landing spot, the outside foot passed up to 70 cm across the planted one in the
 * body's frame and the no-crossing push (`uncross`) snapped it back when it came near (ankle-toe 81 deg in a frame, OFF
 * 58; jog 2.8 x 3 rad/s 45 vs 38). With clip feet on hand such a swing runs in the body's frame instead (`swingTo`):
 * - `carry`: share of the swing over which its lift spot comes round with the body (faded in: it leaves the ground at rest);
 * - `set`: progress over which its turned landing spot fades back onto the spot (by 0.85: a clock swing lands from 0.9);
 * - `full` / `none`: the clip's duty at the lift at or under which this is on in full, at or over which it is off (eased
 *   between): the flight gaits (jog 0.21, run 0.16); the walk (0.56) keeps the world chord (its own turn fixes are another
 *   pass). Taken at the lift and kept to the landing: a stop mid-swing (clip feet gone, duty 0.21 -> 0.60 in a frame)
 *   must not drop it at once.
 */
const CLIP_SWING = { carry: 0.15, set0: 0.55, set1: 0.85, full: 0.35, none: 0.45 } as const;
/** (step 22) A fresh swing the clock starts further into its window than this fades in from the foot (`OFF_FADE`). */
const FRESH_LATE = 0.2;
/** (mt2-fixB) A flick: turning faster than this (rad/s; CT turns at 7.85, 6.1 over 4 m/s). */
const FLICK_RATE = 5;
/**
 * (mocap-trial-2, pop3) In a start's first START_TOE_OFF s a clip lift further into its swing window than this, or while
 * the other foot is still in a planner step, goes to the planner instead (`clipWait`): a short stand's leftover idle step
 * held the other foot planted until the clip lifted it at 0.89-0.98 of its window, 0.3-0.4 m to its landing in a frame.
 */
const CLIP_LIFT_LATE = 0.1;
/**
 * (mocap-trial-2, pop3) A start's leftover idle step where the clock wants the foot down lands within this (s), at most
 * 1 / CLIP_IDLE_RATE times its idle pace (a young idle step sped up to land in 0.05 s moved the foot 18 cm in a frame).
 */
const CLIP_IDLE_LAND = 0.05;
const CLIP_IDLE_RATE = 0.4;
/** (mocap-trial-2, pop3) A start's planted foot this far (m) behind the clip's own stays the planner's (`clipFoot`). */
const CLIP_TAKE_BEHIND = 0.2;
/** (mt2-fixA) A foot the clip pinned toes off (as CLIP_TAKE_BEHIND) once its reach need passes this (m; `clipFoot`): a
 *  backstop to MOCAP_DUTY_GAP; 0.03-0.06 toed off a steady walk's own late stance (mocapSwitch track / jerk). */
const CLIP_PIN_NEED = 0.1;
/** (step 22) Shares of a step tried, in turn, when its landing spot has no ground under it (0: back where it left). */
const EDGE_PULL = [0.6, 0.3, 0] as const;
/** (step 22) A stance staggered more than `min` m front to back: its front foot holds up to `hold` m short of its spot. */
const STAGGER = { min: 0.4, hold: 0.3 } as const;

/*
 * (anim-natural N1) The feet in turns. Per gait arrays are in the Stepping gaits' order (tuneStep STEP_GAITS: idle, walk,
 * jog, run, crouchWalk, crouchRun; the idle entry is the aimed turn on the spot, which reads the idle row); the tuner's
 * Stepping sliders multiply them (identity 1) and the bake writes them (`FOOT_TURN_STEP.twist[2]` ...).
 */
/**
 * Rule A, the turn step: while the body turns faster than `rate` (rad/s), a planted foot whose twist from the body at its
 * clock lift, less what its ball pivot can still take, would pass `twist` (rad) lifts now: an early start of its own
 * clock swing that lands on its clock strike (no longer in the air than `maxAir` s), after at least `minPlant` s down.
 * At a walk never with the other foot in the air.
 */
export const FOOT_TURN_STEP = {
  rate: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
  twist: [0.35, 0.4, 0.4, 0.4, 0.4, 0.4],
  minPlant: 0.06,
  maxAir: 0.45,
} as const;
/**
 * (anim-natural N1, rule A2) While the body turns, a planted foot lifts early (a turn step) once waiting longer would start
 * its clock swing faster than this (m/s^2, smooth's start: 6 x distance / air time^2). A straight run's swing starts at
 * ~87 (2.1 m in 0.38 s), a run 180's foot left behind at ~170 (1.05 m in 0.19 s: 6.1 m/s by its third frame). Headless
 * sweeps (tests/footTurn.test.ts): 80 crossed a 120 Hz run sweep 3 (-34 cm), 90 a 120 Hz spin 4.2 (-10.6), 110 narrowed
 * a run 180 phase to 2.2 cm in the body frame; 100 none of these.
 */
const SWING_ACC = 100;
/**
 * Rule B, the ball pivot: while the body turns (and BAND_TURN_TIME after), a planted foot more than `from` (rad) from the
 * body raises its heel toward `heel` (rad, toe down) and turns about its ball (footGeom) after the body, down to the
 * allowance (TURN_FOLLOW.twistFree), at most `rate` rad/s and `max` rad in one plant. In a heel-first landing's roll (toe
 * up) it turns on its heel instead (TURN_ON). The twist cap stays as a backstop (counted in `scrub`), turning the foot
 * about its contact too.
 * (fix round) The walk and the crouched walk pivot up to 1.7 rad a plant (was 1.2): a held spin at a walk (0.75-2 m/s, 7
 * rad/s) turns the body ~2 rad over one plant and its double support is a frame or two, so the turn step rarely gets
 * its chance; 1.2 left the last 2-7 deg of a plant to the backstop (31.8 deg over a 3.5 s spin at 60 Hz).
 */
export const TURN_PIVOT = {
  from: 0.12,
  heel: [0.35, 0.35, 0.35, 0.35, 0.35, 0.35],
  rate: 12,
  max: [1.2, 1.7, 1.2, 1.2, 1.7, 1.2],
} as const;
/** The landing yaw's lead from the body over half a stance (rad, per gait; was TURN_FOLLOW.twistFree): clamped to the face goal. */
export const LAND_TURN = [0.45, 0.45, 0.45, 0.45, 0.45, 0.45] as const;
/** The twist cap's backstop while the turn rules run: this times the turn step's twist allowance (kTwist). */
export const TURN_CAP = 1.35;
/** The aimed turn on the spot: stride 'velocity' slower than this (m/s) while the body turns (it reads the idle row). */
const SPOT_SPEED = 0.3;
/** The swing's yaw reaches its landing yaw by this share of the swing (eased; was the whole swing). */
const SWING_YAW_BY = 0.7;
/**
 * (anim-natural N1 step 7, cause 6) Under the turn rules every planted foot keeps its contact on the floor (the heel as a
 * heel-first landing rolls flat, the ball as the heel rises and lowers); false: only a foot turning on its ball does.
 */
export const HOLD_CONTACT: boolean = true;
/** (mt2-fixF) The front-to-back stretch (m) before the no-crossing window over which a clip swing's push eases in (`uncrossIn`). */
const UNCROSS_RAMP = 0.12;
/** The fastest a swinging foot turns with the turn rules (rad/s, ~690 deg/s). */
const SWING_YAW_RATE = 12;
/**
 * (anim-natural N1 fix round, CHECK finding 1) Which point a planted foot turns about, so the point on the floor never
 * sweeps: toe up past `toe` (rad; a heel-first landing's roll, the ball over 8 mm up) it turns on its heel; otherwise only
 * with the heel up at least `lift` (rad, the heel ~7 mm up) on its ball. A flat foot (heel and ball both down) never
 * turns: the pivot raises the heel first (at least `heel` rad whatever the pivotHeel slider, so the heel clears the
 * floor), and the twist cap's backstop raises it to `heel` in one go before it turns the foot (ending a roll's last few
 * frames early). The round before turned a toe-up foot about the virtual ball spot (the heel swept 4.6 cm at 60 Hz).
 */
const TURN_ON = { toe: 0.05, lift: 0.04, heel: 0.1 } as const;
/**
 * (anim-natural N1) Still with the turn rules: two planted feet whose idle errors differ by less than this share of the
 * larger are a tie, and the foot planted longer steps first (`updateIdle`; was always the left).
 */
const IDLE_TIE = 0.1;

export class FootPlanner {
  readonly L = newFoot();
  readonly R = newFoot();
  /** (item 24, track A) The stepping table this planner reads (null: the shared one, Wren's rows; a guard: the guards';
   *  any other rig: the identity table, set by `CharacterRig`). */
  stepRows: Float64Array | null = null;
  /** (idle-shins) `reset` keeps the feet off the midline by the stance band's floor (a Wren rig, set by `CharacterRig`). */
  resetBand = false;
  /** Moving on the last update (a quick stop acts on the change to still). */
  private wasMoving = false;
  /** (step 22, A79) Landings this frame roll heel to toe. */
  private rollOn = false;
  /** (step 22) Per foot (L, R): its swing target was held back to the stop's rest spot last update. */
  private restL = false;
  private restR = false;
  /** (locomotion step 21, A80) Time since moving began (s). */
  private moveT = 0;
  /** (mt2-fixB) The switch (`i.mocap`) last frame, and turned off this frame. */
  private mocapWas = false;
  private mocapOff = false;
  /** (mocap-trial-2, pop3) Per foot (bit 1 L, 2 R): a start's clip lift went to the planner, which keeps it until it lifts. */
  private clipWait = 0;
  /** (mocap-trial-2, pop3) Per foot (bit 1 L, 2 R): an idle step still in the air when the move began. */
  private clipIdle = 0;
  /** (mt2-fixA) The first moving frame after a still one (a start, whether or not the planner restarts its start window). */
  private firstMove = false;
  /** (fix 21-2) Time since the last move (s). */
  private stillT = 0;
  /** A quick stop's swings are still setting down. */
  private quick = false;
  /** (G1) Time since the body last turned faster than 1 rad/s (s). */
  private turnT = 9;
  /** (anim-rework S2) How long the body has been turning faster than 1 rad/s (s). */
  private spinT = 0;
  /** (anim-rework S4) Crouched on the last update, and the time left of the re-step after a stance change (RESTEP). */
  private wasCrouch = false;
  private restepT = 0;
  /** (anim-natural N1) This update: the turn rules apply (turnRule, free movement or the aimed spot turn, off a wall). */
  private turnOn = false;
  /** (anim-natural N1) This update: the aimed turn on the spot (it reads the idle row). */
  private spot = false;
  /** (anim-natural N1) This update's turn values (the gait's table entries times its Stepping sliders). */
  private kRate = 0;
  private kTwist = 0;
  private kPivot = 0;
  private kHeel = 0;
  private kLand = 0;
  /** (anim-natural N1) The foot the turn step may lift this update (-1 L, 1 R, 0 none). */
  private pick = 0;
  /** (anim-natural N1 fix round) Time (s) since the body last turned faster than kRate (the turn step's arming). */
  private rateT = 9;
  /** (anim-natural N1) Per foot (L, R): the gait duty when its clock swing window opened in a turn (the foot's lift; -1 none). */
  private swDutyL = -1;
  private swDutyR = -1;

  /**
   * (tuner-ui) Move both feet (planted spots and swing ends) by (dx, dz) in the world: the world slid under the body (the
   * Test Chamber's treadmill holds the root on the spot and moves the feet back with it). No allocation.
   */
  shift(dx: number, dz: number): void {
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? this.L : this.R;
      f.x += dx;
      f.z += dz;
      f.fromX += dx;
      f.fromZ += dz;
      f.toX += dx;
      f.toZ += dz;
      // (anim-natural N1) a ball pivot's anchor moves with the floor
      f.ballX += dx;
      f.ballZ += dz;
    }
  }

  /** Reset both feet to their ideal stance (teleport, spawn). */
  reset(i: PlannerInput): void {
    this.clipWait = this.clipIdle = 0;
    const c = Math.cos(i.yaw);
    const s = Math.sin(i.yaw);
    for (const side of [-1, 1] as const) {
      const f = side < 0 ? this.L : this.R;
      this.ideal(i, side, i.rootX, i.rootZ, i.yaw);
      // (idle-shins) free movement: the feet land no closer to the midline than the stance band's floor, as every landing
      // does (`aim`): Michael's idle track 0.05 put the ideal 0.4 cm off the midline and the teleport left the shins
      // 2.4-3.2 cm into each other (anim-audit selfShanks) until the first step. Widen only (a wider stance is kept).
      if (this.resetBand && i.stride === 'facing' && Number.isNaN(i.wallD)) {
        const lat = ((this.ix - i.rootX) * c - (this.iz - i.rootZ) * s) * side;
        const lo = bandMin(i);
        if (lat < lo) {
          this.ix += (lo - lat) * side * c;
          this.iz -= (lo - lat) * side * s;
        }
      }
      f.x = this.ix;
      f.z = this.iz;
      f.y = i.rootY;
      f.yaw = i.yaw;
      f.contact = true;
      f.swing = -1;
      f.pitch = 0;
      f.slide = 0;
      f.scrub = 0;
      f.scrubPos = 0;
      f.early = f.turn = f.anchored = false;
      f.plantT = f.pivot = f.heelP = 0;
      f.init = true;
    }
  }

  private ix = 0;
  private iz = 0;

  /** Ideal stance spot for a foot around a root position (writes ix, iz). */
  private ideal(i: PlannerInput, side: -1 | 1, rx: number, rz: number, yaw: number): void {
    const lx = side < 0 ? i.lX : i.rX;
    const lz = side < 0 ? i.lZ : i.rZ;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    this.ix = rx + lx * c + lz * s;
    this.iz = rz - lx * s + lz * c;
  }

  update(i: PlannerInput): void {
    // (mt2-fixB) the switch turned off this frame (the clip swings in the air are taken over where they are)
    this.mocapOff = this.mocapWas && !i.mocap;
    this.mocapWas = !!i.mocap;
    if (!this.L.init) this.reset(i);
    // (anim-natural N1) the aimed turn on the spot (moving only by its turn) reads the idle row
    // (fix round, CHECK finding 2) only with the turn rules on and the body turning (faster than 1 rad/s, or within
    // BAND_TURN_TIME after, as the pivot's own window, so its raised heels come down under the same rules): an aimed walk's
    // start or stop under SPOT_SPEED is not a spot turn, and turnRule 0 selects the stepping rows as before
    const v0 = hyp2(i.velX, i.velZ);
    this.spot = i.turnRule > 0 && i.stride === 'velocity' && Number.isNaN(i.wallD) && v0 < SPOT_SPEED && (Math.abs(i.yawRate) > 1 || this.turnT < BAND_TURN_TIME);
    // (tuner-v2 item 3) this gait's stepping row; (item 24, track A) a guard's planner reads the guards' table (one line: the stepping test strips it)
    if (this.stepRows) stepSelectRows(this.stepRows, i.moving && !this.spot, v0, i.crouch); else stepSelect(i.moving && !this.spot, v0, i.crouch);
    {
      // (anim-natural N1) the turn rules: free movement and the aimed spot turn, off a wall, unless the planner opts out
      const g = stepGaitNow;
      this.turnOn = i.turnRule > 0 && Number.isNaN(i.wallD) && (i.stride === 'facing' || this.spot);
      this.kRate = FOOT_TURN_STEP.rate[g]! * STEP[SP.turnRate]!;
      this.kTwist = FOOT_TURN_STEP.twist[g]! * STEP[SP.turnTwist]!;
      this.kPivot = TURN_PIVOT.max[g]! * STEP[SP.pivot]!;
      this.kHeel = TURN_PIVOT.heel[g]! * STEP[SP.pivotHeel]!;
      this.kLand = LAND_TURN[g]! * STEP[SP.landTurn]!;
      // (fix round) the turn step stays armed BAND_TURN_TIME after the rate last passed kRate: a body turning in fits and
      // starts (a 60 Hz spin's frames alternate 0 and 7.85 rad/s; a remote's 20 Hz yaw) left a foot past its allowance
      // with its pivot used up to the cap's backstop on the frames that read 0 (31 deg in a held 0.75 m/s spin)
      this.rateT = Math.abs(i.yawRate) > this.kRate ? 0 : this.rateT + i.dt;
    }
    this.L.landed = this.R.landed = false;
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? this.L : this.R;
      f.plantT = f.contact ? f.plantT + i.dt : 0;
    }
    // (anim-rework S4) a stance change (the crouch past half way either way) re-steps the feet into the new stance
    const crouchNow = i.crouch > 0.5;
    if (crouchNow !== this.wasCrouch) this.restepT = RESTEP.window;
    else if (this.restepT > 0) this.restepT = Math.max(0, this.restepT - i.dt);
    this.wasCrouch = crouchNow;
    // (G1 fix) heel first only walking forward (not a strafe or a back step)
    const vv = hyp2(i.velX, i.velZ);
    this.rollOn = i.moving && vv <= HEEL_ROLL.maxSpeed && (vv < 0.05 || i.velX * Math.sin(i.yaw) + i.velZ * Math.cos(i.yaw) > 0.7 * vv);
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? this.L : this.R;
      if (f.roll <= 0) continue;
      if (!f.contact) f.roll = 0;
      else {
        f.roll = Math.max(0, f.roll - i.dt);
        f.pitch = -HEEL_ROLL.pitch * STEP[SP.heel]! * smooth(f.roll / HEEL_ROLL.time);
      }
    }
    if (!i.moving && this.wasMoving && i.quickStop > 0) {
      // (G26) the feet freeze: a swing left over from moving sets straight down where it is within `quickStop`, no closing step
      for (let k = 0; k < 2; k++) {
        const f = k === 0 ? this.L : this.R;
        if (f.contact || f.swing < 0) continue;
        this.setDown(f, i);
      }
      this.quick = true;
    }
    this.firstMove = i.moving && !this.wasMoving;
    this.wasMoving = i.moving;
    this.turnT = Math.abs(i.yawRate) > 1 ? 0 : this.turnT + i.dt;
    this.spinT = Math.abs(i.yawRate) > 1 ? this.spinT + i.dt : 0;
    // (fix 21-2) a start is a move after START_STILL s still: a remote copy's moving flag flickers off for a frame or
    // two mid-gait (snapshot velocity), which must not restart the start window
    this.stillT = i.moving ? 0 : this.stillT + i.dt;
    this.moveT = i.moving ? this.moveT + i.dt : this.stillT > START_STILL ? 0 : this.moveT;
    if (!i.moving) this.clipWait = this.clipIdle = 0;
    // (mocap-trial, A3) no clip feet (or still): every foot is the planner's (a clip swing in the air finishes as a rule step)
    // (fix 1) and the planted feet's pitch is the planner's: the clip eases it back in when it takes them again
    if (!i.clipFeet || !i.moving) {
      for (let k = 0; k < 2; k++) {
        const f = k === 0 ? this.L : this.R;
        // (mocap-trial-2, CHECK-2 required 2) a clip swing in the air finishes as the planner's from the clip's pitch:
        // swingTo eases it onto the planner's over CLIP_PITCH_EASE (mid-swing the planner's 0 snapped a 0.86 rad toe-off
        // flat at the rig's pitch cap, the ankle-toe bone 35-41 deg in a frame at a stop); a planner swing in the air
        // keeps its ease running. Its place eases over too (swingTo: the gap to the planner's swing fades out over
        // OFF_FADE; it dropped the clip's 13 cm lift or jumped 21 cm back in a frame), with the planner's lift.
        // A quick stop's set-down already starts from the foot, its pitch too (setDown, swingTo's quick ease).
        // (mocap-trial-2, crouchpop) Moving too (clip feet gone as a crouch or a draw took the mocap share to 0): the clock's
        // takeover snapped a 0.66 rad toe-off flat and jumped the swing 0.36 -> 0.61 (ankle-toe 35, knee-ankle 44-46 deg a
        // frame). The fix-1 note (eased moving, the walk 2.0 x 2.5 turn sweep's jerk 14.8 -> 29.7 cm/frame2) no longer holds:
        // mocapSwitch's turn sweeps pass with it
        if (f.clipOwn && !f.contact && !this.quick) {
          f.clipPitchT = 0;
          f.clipPitchOff = f.pitch;
          f.stepLift = i.liftH * STEP[SP.lift]!;
        } else if (f.contact || f.clipOwn) f.clipPitchT = -1;
        f.clipOwn = false;
      }
    }
    if (i.moving) this.updateMoving(i);
    else this.updateIdle(i);
    if (this.L.contact && this.R.contact) this.quick = false;
    // (anim-natural N1, rule B) a planted foot the turn has left behind turns on its ball (heel up), before the cap
    if (this.turnOn && i.moving) this.pivotFeet(i);
    if (i.moving && Number.isNaN(i.wallD)) this.twistCap(i);
    // (G1 fix) only while the facing turns (and just after): straight travel keeps the feet world-locked (e2e-anim foot
    // locking); a planted foot outside the band then steps back into it (holdOrStep)
    // (anim-rework S2, BRIEF 3 / 5: feet lock to the ground) standing, only a foot whose partner is in the air (`band`)
    // (anim-natural N1, rule C) with the turn rules no band scrub at all (crouched it slid planted feet 5-6.5 cm a turn,
    // standing after SPIN_SCRUB 15-52 cm in a sweep): a foot outside the band steps back into it, the turns step round
    // (mocap-trial, A3) never in clip feet: a planted foot stays pinned
    if (!this.turnOn && i.moving && i.stride === 'facing' && Number.isNaN(i.wallD) && this.turnT < BAND_TURN_TIME && !(i.clipFeet && i.clipFeet.on)) this.band(i);
    this.anchorFeet(i);
    this.uncross(i);
  }

  /** (A1.2) The pelvis yaw the turn rules measure in. */
  private pelvis(i: PlannerInput): number {
    return Number.isNaN(i.pelvisYaw) ? i.yaw : i.pelvisYaw;
  }

  /**
   * (anim-natural N1, rule B) The ball pivot: while the body turns, a planted foot more than TURN_PIVOT.from from it
   * raises its heel (to kHeel, HEEL_RISE rad/s) and turns about its ball after the body, down to the twistFree allowance,
   * at most TURN_PIVOT.rate rad/s (eased in with the heel) and kPivot rad in one plant. The first turn anchors the ball
   * (`anchorFeet` then keeps it on its spot whatever the yaw and the pitch).
   */
  private pivotFeet(i: PlannerInput): void {
    const turning = this.turnT < BAND_TURN_TIME;
    const allow = TURN_FOLLOW.twistFree * STEP[SP.lock]!;
    // (fix round) the heel always clears the floor while the foot turns on its ball (TURN_ON.heel at the least)
    const kHeel = this.kHeel > TURN_ON.heel ? this.kHeel : TURN_ON.heel;
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? this.L : this.R;
      // (mt2-fixF) a foot the clip planted (clipPlant, clip feet on hand) pivots on its ball too (it held its ankle and
      // lifted at the cap's 30.9 deg, its ball scrubbing 6-10 cm in a jog 90)
      if (!f.contact) continue;
      const d = wrap(f.yaw - i.yaw);
      const ad = d < 0 ? -d : d;
      // (fix round, CHECK finding 1) in a heel-first landing's roll with the toe still up the foot turns on its heel
      // (anchorFeet: the heel's spot is held); the round before left it to the cap's backstop, which turned it about the
      // ball's flat spot so the heel swept round on a 17 cm lever (4.6 cm at 60 Hz in a held spin)
      let toeUp = f.pitch < -TURN_ON.toe;
      const live = turning && this.kPivot > 0;
      const want = live && !toeUp && ad > TURN_PIVOT.from ? kHeel : 0;
      f.heelP = want > f.heelP ? Math.min(want, f.heelP + HEEL_RISE * i.dt) : Math.max(want, f.heelP - HEEL_RISE * i.dt);
      // (a roll near its end, the toe nearly down: the raised heel takes over and the roll ends)
      // (mt2-fixF) a clip-planted foot's pitch is the clip's again every frame (clipFoot): the planner's raised heel stays on
      // top of it until it is down, toe up or not (the pitch is the larger of the two, the raise easing at HEEL_RISE); let go
      // at a toe-up clip frame it dropped 0.35 -> -0.09 rad in a frame, past the rig's MOCAP_FEET.pitchRate, and the held
      // ball slid 7.4 cm (a walking flick 90 at 2 m/s)
      const clipP = f.clipPlant && !!i.clipFeet;
      if (f.heelP > 0 && f.heelP > f.pitch && (!toeUp || clipP)) {
        f.pitch = f.heelP;
        f.roll = 0;
        if (clipP) toeUp = false;
      }
      // (fix round) on the heel only down to the turn step's allowance (kTwist): the ankle swings round the heel ahead of
      // it, so a roll turned all the way to twistFree put a crouched spin's planted ankle 1.3 cm further out; the ball
      // pivot after the roll takes the rest
      const al = toeUp && this.kTwist > allow ? this.kTwist : allow;
      if (!live || ad <= al || f.pivot >= this.kPivot) continue;
      // a flat foot does not turn (the heel and the ball are both on the floor): its heel comes up first
      if (!toeUp && f.pitch < TURN_ON.lift) continue;
      // the heel comes up first: the turn eases in over the first half of the raise (on the heel: at once)
      const ease = toeUp ? 1 : Math.min(1, f.heelP / (0.5 * kHeel));
      const m = Math.min(TURN_PIVOT.rate * ease * i.dt, this.kPivot - f.pivot);
      const dy = clampAbs(d > 0 ? al - d : -al - d, m);
      if (dy === 0) continue;
      if (!f.anchored) this.anchor(f);
      f.yaw = wrap(f.yaw + dy);
      f.pivot += dy < 0 ? -dy : dy;
    }
  }

  /** (anim-natural N1) Anchor a planted foot's ball where it is now (the spot its pivot and heel raise turn about). */
  private anchor(f: FootState): void {
    const b = ankleToBall(f.pitch);
    f.ballX = f.x + b * Math.sin(f.yaw);
    f.ballZ = f.z + b * Math.cos(f.yaw);
    f.anchored = true;
    f.ancP = f.pitch;
    f.ancYaw = f.yaw;
  }

  /**
   * (anim-natural N1) An anchored planted foot: the ankle sits `ankleToBall(pitch)` behind the ball's spot along the foot,
   * so the ball stays put while the foot turns on it and the heel rises or lowers, and the heel while a heel-first landing
   * rolls flat. HOLD_CONTACT (step 7, cause 6): every planted foot under the turn rules is anchored, not only a pivoting
   * one (the late-stance heel raise turned the foot about the ankle: the ball slid back ~6 cm at 0.6 rad, a 2.8 cm render
   * slide in a straight jog). Without the turn rules (a wall, aiming on the move, an opt-out) the anchor is let go and the
   * ankle stays where it is; without HOLD_CONTACT it is let go once the heel is down after the turn.
   */
  private anchorFeet(i: PlannerInput): void {
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? this.L : this.R;
      // (mt2-fixF) a clip-planted foot is held at its contact too, as N1's: the heel while the clip's stance pitch is toe up,
      // the ball once its heel rises, the ankle travelling with the roll (pinned at the ankle, the heel / ball slid 1.2 / 2.6
      // cm in a straight jog)
      if (!f.contact || !this.turnOn) {
        f.anchored = false;
        continue;
      }
      if (!f.anchored) {
        if (!HOLD_CONTACT) continue;
        this.anchor(f);
      }
      // (a flat foot that has not turned keeps its ankle exactly: no rounding from the round trip through the ball)
      if (f.pitch !== f.ancP || f.yaw !== f.ancYaw) {
        // (fix round, CHECK finding 1) toe up the heel is the contact: a turn there keeps the heel's spot (HEEL_BACK +
        // TOE_BALL behind the ball's flat spot along the foot) and moves the ball's spot round it
        if (f.pitch < 0 && f.yaw !== f.ancYaw) {
          f.ballX += HEEL_BALL * (Math.sin(f.yaw) - Math.sin(f.ancYaw));
          f.ballZ += HEEL_BALL * (Math.cos(f.yaw) - Math.cos(f.ancYaw));
        }
        const b = ankleToBall(f.pitch);
        f.x = f.ballX - b * Math.sin(f.yaw);
        f.z = f.ballZ - b * Math.cos(f.yaw);
        f.ancP = f.pitch;
        f.ancYaw = f.yaw;
      }
      if (!HOLD_CONTACT && f.pitch <= 0 && f.heelP <= 0 && this.turnT >= BAND_TURN_TIME) f.anchored = false;
    }
    void i;
  }

  /**
   * (mt2-fixF) The rig posed an anchored planted foot with another pitch than the update left (the switch on: the rig's
   * MOCAP_FEET.pitchRate cap): its ankle is re-placed round the held contact for that pitch, as `anchorFeet` would (a clip
   * landing's 0.52 rad pitch snap, capped over two frames, moved the held heel 2.1 cm). The rig calls it with the switch
   * on only. No allocation.
   */
  holdPitch(f: FootState): void {
    if (!f.contact || !f.anchored || f.pitch === f.ancP) return;
    const b = ankleToBall(f.pitch);
    f.x = f.ballX - b * Math.sin(f.yaw);
    f.z = f.ballZ - b * Math.cos(f.yaw);
    f.ancP = f.pitch;
  }

  /** (A1.2) A planted foot never twists more than TURN_FOLLOW.twistMax from the body: it turns on the spot (counted). */
  private twistCap(i: PlannerInput): void {
    // (measured from the body yaw: a foot lands ~47 deg ahead and toes off ~47 deg behind in a full-rate spin; the pelvis
    // trails up to 20 deg, so from the pelvis a fresh landing reads up to ~67 deg for a moment)
    const py = i.yaw;
    // (anim-natural N1) with the turn rules the cap is a backstop past the turn step's allowance (TURN_CAP x kTwist): the
    // ball pivot and the turn step keep a planted foot under it (`scrub` should stay ~0); an anchored foot turns about its ball
    const back = this.turnOn && this.turnT < BAND_TURN_TIME ? Math.max(TURN_FOLLOW.twistFree * STEP[SP.lock]!, this.kTwist * TURN_CAP) : -1;
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? this.L : this.R;
      if (!f.contact) continue;
      const d = wrap(f.yaw - py);
      const m = back > 0 ? back : (i.stride === 'facing' && this.turnT < BAND_TURN_TIME ? TURN_FOLLOW.twistFree : TURN_FOLLOW.twistMax) * STEP[SP.lock]!;
      if (d > m || d < -m) {
        // (mt2-fixF) a clip-planted foot as well (skipped, it yaw-scrubbed about the ankle)
        if (this.turnOn) {
          // (fix round, CHECK finding 1) the backstop turns the foot about its contact, never sweeping it: toe up on the
          // heel, else on the ball with the heel raised first (a flat foot, a roll's last frames: TURN_ON.heel at once)
          if (!f.anchored) this.anchor(f);
          if (f.pitch >= -TURN_ON.toe && f.pitch < TURN_ON.lift) {
            f.pitch = TURN_ON.heel;
            f.roll = 0;
            if (f.heelP < f.pitch) f.heelP = f.pitch;
          }
        }
        const to = py + (d > 0 ? m : -m);
        f.scrub += Math.abs(wrap(to - f.yaw));
        f.yaw = wrap(to);
      }
    }
  }

  /**
   * (G1) Free movement: a planted foot stays within TURN_FOLLOW.minLateral..maxLateral m of the root's midline on its own
   * side (root frame), scrubbing sideways when the body turns round it (counted in `scrubPos`).
   */
  private band(i: PlannerInput): void {
    const c = Math.cos(i.yaw);
    const s = Math.sin(i.yaw);
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? this.L : this.R;
      if (!f.contact) continue;
      // (anim-rework S2) standing, a planted foot stays locked through a turn or a direction change (it steps back into the
      // band instead); only a sustained spin (over SPIN_SCRUB s) pivots the feet round with the hips as before
      if (i.crouch <= 0.5 && this.spinT < SPIN_SCRUB) continue;
      const side = k === 0 ? -1 : 1;
      const lat = ((f.x - i.rootX) * c - (f.z - i.rootZ) * s) * side;
      const cl = lat < TURN_FOLLOW.minLateral ? TURN_FOLLOW.minLateral : lat > TURN_FOLLOW.maxLateral ? TURN_FOLLOW.maxLateral : lat;
      if (cl === lat) continue;
      // (G1 fix) the scrub is at most TURN_FOLLOW.scrubSpeed (3 cm a frame at 60 Hz): a foot further out steps in instead
      const m = (TURN_FOLLOW.scrubSpeed * i.dt) / STEP[SP.lock]!;
      const d = clampAbs(cl - lat, m) * side;
      f.x += d * c;
      f.z -= d * s;
      f.scrubPos += Math.abs(d);
    }
  }

  /**
   * (A1.2) Hard no-crossing post-pass in the pelvis frame: an airborne foot within TURN_FOLLOW.nearAlong front to back of
   * the other is pushed outward to at least TURN_FOLLOW.minGapAny from it; a planted foot is never moved. (n138 fix) With
   * the turn rules, then the same in the body (root yaw) frame.
   */
  private uncross(i: PlannerInput): void {
    if (this.L.contact && this.R.contact) return;
    this.ucYaw = this.pelvis(i);
    this.uncrossIn();
    // (anim-natural N1, n138 fix) with the turn rules the body frame too: a turn's crossing swing (a left foot swung into
    // a right turn) sits across the planted foot, and with the hips trailing the facing the pelvis-frame window let it
    // through on alternate frames as `along` hovered at its edge (e2e-anim run 90: -17.4 cm in the body frame, the frame
    // the turn steps and the e2e measure in)
    if (this.turnOn) {
      this.ucYaw = i.yaw;
      this.uncrossIn();
    }
  }

  /** (n138 fix) The frame `uncrossIn` measures in (yaw, rad): a field, not an argument (a double passed to a call that
   *  is not inlined is boxed). */
  private ucYaw = 0;

  /** One no-crossing push (the A1.2 rule) in the frame of yaw `ucYaw`. No allocation. */
  private uncrossIn(): void {
    const c = Math.cos(this.ucYaw);
    const s = Math.sin(this.ucYaw);
    const L = this.L;
    const R = this.R;
    const along = (L.x - R.x) * s + (L.z - R.z) * c;
    // (mt2-fixF) a clip swing passing a planted foot (clipOwn: placed afresh from the clip every frame) is eased out over
    // UNCROSS_RAMP front to back before the window, not pushed all at once as it enters: with its contact held the planted
    // ankle rolls forward, the passing knees met a frame sooner, the knee-gap bow flicked the swing knee 6 cm out and back
    // and the push took it out again (a walk's start: the joint jerk 12.9 against the hand-keyed set's 9.5 cm/frame2)
    const mv = L.contact ? R : R.contact ? L : null;
    const ramp = mv !== null && mv.clipOwn;
    const aa = along < 0 ? -along : along;
    if (aa > TURN_FOLLOW.nearAlong && !(ramp && aa < TURN_FOLLOW.nearAlong + UNCROSS_RAMP)) return;
    const gap = (R.x - L.x) * c - (R.z - L.z) * s;
    let bad = TURN_FOLLOW.minGapAny - gap;
    if (bad <= 0) return;
    if (aa > TURN_FOLLOW.nearAlong) bad *= (TURN_FOLLOW.nearAlong + UNCROSS_RAMP - aa) / UNCROSS_RAMP;
    // the airborne foot moves (both airborne: each half)
    const kL = L.contact ? 0 : R.contact ? 1 : 0.5;
    const kR = 1 - kL;
    L.x -= bad * kL * c;
    L.z += bad * kL * s;
    R.x += bad * kR * c;
    R.z -= bad * kR * s;
  }

  // --- moving: contacts from the gait clock -------------------------------------------------
  private updateMoving(i: PlannerInput): void {
    // (anim-natural N1, rule A) which planted foot the turn step may lift: the larger predicted overrun, a tie the
    // inside foot (the side the body turns to)
    this.pick = 0;
    if (this.turnOn && this.rateT < BAND_TURN_TIME) {
      let best = 0;
      for (let k = 0; k < 2; k++) {
        const side = k === 0 ? -1 : 1;
        const f = k === 0 ? this.L : this.R;
        if (!f.contact || f.plantT < FOOT_TURN_STEP.minPlant) continue;
        const since = (((i.phase - (side < 0 ? 0 : 0.5)) % 1) + 1) % 1;
        if (since >= i.duty) continue;
        const over = this.turnOver(f, i, (i.duty - since) * i.cycleTime);
        if (over > best + 1e-9 || (over > 0 && over > best - 1e-9 && side === (i.yawRate > 0 ? 1 : -1))) {
          best = over;
          this.pick = side;
        }
      }
    }
    for (let si = 0; si < 2; si++) {
      const side: -1 | 1 = si === 0 ? -1 : 1;
      const f = side < 0 ? this.L : this.R;
      const strike = side < 0 ? 0 : 0.5;
      const sinceStrike = (((i.phase - strike) % 1) + 1) % 1;
      const wantContact = sinceStrike < i.duty;
      // (mocap-trial, A3) the clip places this foot's steps
      if (i.clipFeet && this.clipFoot(f, i, side, sinceStrike, wantContact, i.clipFeet)) continue;
      if (!wantContact) {
        // (G1) a rule step (a turn's step round, a no-crossing step) mostly done when the clock's swing window opens, past
        // a start: it lands, and the clock's swing starts from there (taking it over jumped the foot up to its landing
        // spot, ~0.5 m in a frame in a crouched turn)
        // (anim-natural N1) not an early clock swing (a toe-off, a turn step): it already aims at the clock's landing
        if (!f.contact && f.swing >= 0.85 && f.swBase < 0 && !f.early && !this.quick && this.moveT >= START_TOE_OFF) {
          // (where it is: landing on its target from mid-air moved it in one frame)
          f.toX = f.x;
          f.toZ = f.z;
          this.land(f);
        }
        // (mt2-fixA, CHECK-3 required 2) clip feet on: a planner swing nearly down (>= 0.9) as the clock's swing window opens
        // lands where it is; taken over from there (`sp` from a swBase of 0.9-1.0 stays ~1) it rode along with the root
        // unplanted for the whole window (a CT start after a 0.3 s stand: the ankle 40 cm in a frame, the pelvis 8 + 3 cm)
        if (i.clipFeet && !f.contact && f.swing >= 0.9 && f.swBase < 0) {
          f.toX = f.x;
          f.toZ = f.z;
          this.land(f);
        }
        // (mt2-fixD, CHECK-4 required 1) clip feet on: a start's sped-up idle step (`clipIdle`) still in the air as the window
        // opens is never retargeted: the clock's swing starts afresh from where it is (taken over at 0.66-0.74 it jumped to
        // the clock's landing a run stride on, 37-49 cm in a frame, and crawled there: the pelvis 48 cm down at 4 m/s)
        const fresh = f.contact || f.swing < 0 || (!!i.clipFeet && f.swBase < 0 && (this.clipIdle & (side < 0 ? 1 : 2)) !== 0);
        // (anim-rework S2) at a walk (no flight phase) the clock's swing waits while the other foot is still in the air
        // from a rule step (a turn's step round, a start's first step): a turn from a standstill lifted both feet (a hop).
        // Nearly down, the other foot lands now (an early swap)
        const o = side < 0 ? this.R : this.L;
        if (fresh && f.contact && !o.contact && o.swBase < 0 && hyp2(i.velX, i.velZ) < 2) {
          if (o.swing >= TURN_FOLLOW.earlySwap) this.land(o);
          else {
            this.holdOrStep(f, i, side, 0);
            continue;
          }
        }
        // (mt2-fixB, CHECK-3 item 3) clip feet on: a foot just planted (a clip step set down as a turn takes the feet) as its
        // swing window is nearly over (>= 0.9) stays down: the clock lifted it for a two-frame step to its landing spot and
        // set it down with the turn's landing yaw (the ankle-toe 25-36 deg in a frame at 2 m/s flicks)
        if (fresh && f.contact && i.clipFeet && f.plantT < 0.05 && Math.abs(i.yawRate) > FLICK_RATE && sinceStrike - i.duty >= 0.9 * (1 - i.duty)) {
          this.holdOrStep(f, i, side, 0);
          continue;
        }
        if (fresh) {
          this.beginSwing(f, i, (1 - i.duty) * i.cycleTime, i.liftH);
          f.swBase = 0;
        }
        // (fix 21-2) the clock takes over an early toe-off already in the air (a start, A80): its target moves on to
        // the clock's landing spot, up to a stride further on; the foot keeps where it is and the difference fades out
        // over the rest of the swing (it jumped up to 68 cm in one frame on a remote copy, the pelvis dropped 9 cm to
        // reach it and the ankle snapped 70-80 deg)
        const takeover = !fresh && f.swBase < 0;
        // (anim-natural N1, e2e-anim jog 180 snap) with the turn rules a duty that falls mid-swing no longer moves the swing
        // on: its progress runs from the duty its window opened at (the foot's lift) while the live duty is lower. As a
        // turn ends the graph's duty falls (TURN_DUTY 0.52 -> the jog's 0.44) and the progress read from it jumped ahead
        // (0.09-0.1 a frame, twice the clock's rate there; first swing frames 4.9-5.3 m/s). A rising duty reads live as
        // before (from the lift's duty a held spin's swings ran ahead and crossed at the no-crossing window's edge)
        // Only a swing whose window opened while the body turned (turnT < BAND_TURN_TIME): a start's or a stop's duty
        // change on the straight is left as it was
        if (fresh || takeover) {
          const d = this.turnOn && this.turnT < BAND_TURN_TIME ? i.duty : -1;
          if (side < 0) this.swDutyL = d;
          else this.swDutyR = d;
        }
        const d0 = this.turnOn ? Math.max(i.duty, side < 0 ? this.swDutyL : this.swDutyR) : i.duty;
        const s0 = (sinceStrike - d0) / (1 - d0);
        const s = s0 > 0 ? s0 : 0;
        if (takeover) {
          f.swBase = f.swing;
          f.offBase = -1;
          f.offX = f.x;
          f.offY = f.y;
          f.offZ = f.z;
          f.early = f.turn = false;
        }
        // slow near starts and stops, but a step never hangs in the air for long
        f.stepDur = Math.min(0.6, (1 - i.duty) * i.cycleTime);
        // remaining time to land, then half a stance ahead so mid-stance is under the hip
        const toLand = (1 - s) * f.stepDur;
        const prevToX = f.toX;
        const prevToZ = f.toZ;
        const clamped = this.aimClock(f, i, side, toLand);
        // an early toe-off already in the air goes on from its progress to land on the clock (restarting from
        // the clock's 0 snaps the foot back to where it left the ground and the pelvis drops to reach it)
        const sp = f.swBase + (1 - f.swBase) * s;
        // (step 22, M14) a swing re-aimed at the stop's rest spot (or let go of it) mid-air: the jump in its target
        // fades out over OFF_FADE instead of moving the foot in one frame (a stop from gear 4-6 snapped the swing
        // foot back up to 27 cm: knee and hip 33-45 deg in a frame)
        const wasClamped = side < 0 ? this.restL : this.restR;
        // (mocap-trial-2, strafe) and in the mocap strafe a target that jumps in a frame (a flip or a snap off the strafe
        // re-aims the long side-step: the swing foot moved 24-29 cm in a frame, knee-ankle 21-25 deg)
        const reaim = (i.strafe ?? 0) > STRAFE_ON && hyp2(f.toX - prevToX, f.toZ - prevToZ) > STRAFE_REAIM;
        if ((clamped !== wasClamped || reaim) && !fresh && !takeover) {
          const h = smooth(sp);
          const k = f.offBase >= 0 ? 1 - smooth(f.offBase / OFF_FADE) : 0;
          f.offX = f.offX * k - (f.toX - prevToX) * h;
          f.offY = f.offY * k;
          f.offZ = f.offZ * k - (f.toZ - prevToZ) * h;
          f.offBase = 0;
          f.offDur = 0;
        }
        if (side < 0) this.restL = clamped;
        else this.restR = clamped;
        // (mt2-fixC, CHECK-3 item 6a) a clip swing handed over this frame (clipPitchT 0: never with the switch off) already
        // keeps where it is and fades its whole gap (swingTo); the late start below put back only the residual (8 mm of a
        // 23 cm gap: crouching at a jog the swing foot jumped 23 cm the next frame, knee-ankle 25 deg)
        const handNow = f.clipPitchT === 0;
        this.swingTo(f, i, sp);
        // (step 22, M14) a swing the clock starts late in its window (the first frame moving after a landing: the pace
        // now carries over a drop) starts from where the foot is and fades onto the clock's swing over OFF_FADE (it
        // jumped 0.4 m in one frame, drop24 ankle 43 deg a frame); along the ground only (its height follows the swing)
        if (fresh && s > FRESH_LATE && !handNow) {
          f.offX = f.fromX - f.x;
          f.offY = 0;
          f.offZ = f.fromZ - f.z;
          f.offBase = 0;
          f.offDur = 0;
          f.x = f.fromX;
          f.z = f.fromZ;
        }
        // (only in a start's first START_TOE_OFF s, the early toe-offs A80 adds, and not turning: in a turn's
        // reversal the held offset put the swing foot across the planted one, turn180 selfShanks 1.3 -> 8 cm).
        // (A82) Not when the travel has reversed against the foot's heading: the body's yaw has only begun to turn on
        // a reversal's first frames (0.2 rad, inside the yaw test), but the velocity already points back
        // (mt2-fixB, CHECK-3 item 5) and the frame the switch goes off (`mocapOff`): a clip swing in the air taken over by
        // the clock jumped to the clock's swing (60 cm in a frame at a jog); it keeps where it is, the difference fades
        // (mocap-trial-2 strafe fix) a strafe swing taken over by the clock (a snap at sp 0.82 re-aimed it 60 cm: 37 cm in a frame)
        const stTake = takeover && (i.strafe ?? 0) > STRAFE_ON;
        if (
          takeover &&
          ((f.swBase > 0 &&
            f.swBase < 0.9 &&
            this.moveT < START_TOE_OFF &&
            Math.abs(wrap(i.yaw - f.fromYaw)) < 0.35 &&
            i.velX * Math.sin(f.fromYaw) + i.velZ * Math.cos(f.fromYaw) > 0) ||
            this.mocapOff ||
            stTake)
        ) {
          f.offX -= f.x;
          f.offY -= f.y;
          f.offZ -= f.z;
          f.offBase = 0;
          // (mt2-fixB) the switch off: over the swing left (it lands on its target, not short of it: a run's next stance
          // started 30 cm behind and the pelvis dropped 34 cm for it), at least OFF_FADE
          // (mocap-trial-2 strafe fix) and the clock's takeover of a mocap strafe swing (stTake): the same, so a snap into or
          // out of the strafe re-aims the long side-step without a jump and lands with the offset spent (no planted slide)
          f.offDur = this.mocapOff || stTake ? Math.max(OFF_FADE, toLand) : 0;
          f.x += f.offX;
          f.y += f.offY;
          f.z += f.offZ;
        }
        f.stepT = sp * f.stepDur;
      } else if (!f.contact) {
        // a step still in the air when the clock says contact (e.g. an idle step as walking starts)
        f.swBase = -1;
        if (f.early) {
          // (anim-natural N1, cause 5) an early clock swing (a toe-off, a turn step) aims as the clock's swing will at
          // the takeover (the same landing time and spot, `aimClock`), so the clock takes it over without a jump
          const sw = Math.min(1, f.swing + i.dt / f.stepDur);
          const rem = (i.duty - sinceStrike) * i.cycleTime;
          const own = f.turn ? 0.98 : 0.9;
          this.aimClock(f, i, side, rem < (own - sw) * f.stepDur ? rem + Math.min(0.6, (1 - i.duty) * i.cycleTime) : (1 - sw) * f.stepDur);
          if (sw >= own) this.land(f);
          else this.swingTo(f, i, sw);
        } else if (f.swing >= 0.9) this.land(f);
        else {
          const sw = Math.min(1, f.swing + i.dt / f.stepDur);
          // (mt2-fixA, CHECK-3 required 2) clip feet on: it lands as its progress reaches 0.9 (a start's leftover idle step,
          // sped up, went 0.88 -> 1.00 in a frame and was still in the air when its swing window opened)
          if (i.clipFeet && sw >= 0.9) this.land(f);
          else this.swingTo(f, i, sw);
        }
      } else {
        this.holdOrStep(f, i, side, (i.duty - sinceStrike) * i.cycleTime);
        // (G1) late stance: the heel comes up, the foot rolls onto its toes (after the heel-first roll has ended)
        if (f.contact && f.roll <= 0) {
          const u = (sinceStrike / i.duty - HEEL_RAISE.from) / (1 - HEEL_RAISE.from);
          const v = hyp2(i.velX, i.velZ);
          const stand = HEEL_RAISE.pitch + (HEEL_RAISE.pitchRun - HEEL_RAISE.pitch) * Math.min(1, v / 3);
          const top = stand + (HEEL_RAISE.pitchCrouch - stand) * (i.crouch < 0 ? 0 : i.crouch > 1 ? 1 : i.crouch);
          // (G1 fix) only walking forward: a side-step or a back step does not roll off the toes (e2e-anim aim strafe foot lock)
          const fk = v > 0.05 ? (i.velX * Math.sin(i.yaw) + i.velZ * Math.cos(i.yaw)) / v : 0;
          const want = u > 0 && fk > 0.7 ? top * STEP[SP.toeOff]! * smooth(u) * smooth((fk - 0.7) / 0.25) : 0;
          // (anim-rework S2) the heel comes up at most HEEL_RISE rad/s: a start opens mid-stance and the old snap (0 to 0.6 rad
          // in a frame) left the ankle short of its target for a frame (a 6 cm start slide)
          // (anim-natural N1) with the turn rules it comes down at that rate too (a turn's sideways travel dropped it in a
          // frame; an anchored foot keeps its ball on the spot, so the ankle jumped back instead)
          f.pitch = want > f.pitch ? Math.min(want, f.pitch + HEEL_RISE * i.dt) : this.turnOn ? Math.max(want, f.pitch - HEEL_RISE * i.dt) : want;
        }
      }
    }
    // (anim-natural N1 fix round, CHECK finding 4) with the turn rules: a planted foot the turn left outside the stance band
    // (it could not step back in while the other foot was in the air) steps in on the frame the other foot lands, not a
    // frame later: the two planted feet never stand wider than the band (a 120 Hz crouched flick 180 stood 24 cm wide for
    // that frame, master 19.6)
    if (this.turnOn && i.stride === 'facing' && Number.isNaN(i.wallD)) {
      for (let si = 0; si < 2; si++) {
        const side: -1 | 1 = si === 0 ? -1 : 1;
        const f = side < 0 ? this.L : this.R;
        const o = side < 0 ? this.R : this.L;
        if (f.contact && !f.landed && o.landed && this.outOfBand(f, i, side) && !this.clipHeld(f, i, side)) {
          this.beginSwing(f, i, PLANNER.idleStepTime * 0.75, i.liftH);
          this.ruleAim(f, i, side);
        }
      }
    }
  }

  /** (G1 fix) A planted foot further than BAND_STEP outside the free-movement stance band (root frame, its own side). */
  private outOfBand(f: FootState, i: PlannerInput, side: -1 | 1): boolean {
    const latF = ((f.x - i.rootX) * Math.cos(i.yaw) - (f.z - i.rootZ) * Math.sin(i.yaw)) * side;
    // (anim-natural N1 fix round) crouched with the turn rules (no band scrub to hold it) within BAND_STEP_CROUCH: the crouched
    // planted stance stays as wide as master's scrubbed one (+1 cm at most)
    const m = this.turnOn && i.crouch > 0.5 ? BAND_STEP_CROUCH : BAND_STEP;
    return latF > bandMax(i) + m || latF < bandMin(i) - m;
  }

  /**
   * (anim-natural N1, cause 5) The clock swing's landing target for a foot `toLand` s from touchdown: half a stance (a
   * little less, LAND_AHEAD) ahead of the hip, on the turn's arc, at the predicted mid-stance yaw; held to the stop's rest
   * spot. Shared by the clock's swing, the early toe-offs and the turn step, so a takeover never moves the target.
   * Returns whether the rest spot held it back.
   */
  private aimClock(f: FootState, i: PlannerInput, side: -1 | 1, toLand: number): boolean {
    this.clockRoot(i, toLand);
    let rx = this.cRx;
    let rz = this.cRz;
    const landYaw = this.cYaw;
    let clamped = false;
    if (i.rest) {
      // distance matching: do not land beyond where the body will stop
      const ahead = (rx - i.restX) * i.velX + (rz - i.restZ) * i.velZ;
      if (ahead > 0) {
        rx = i.restX;
        rz = i.restZ;
        clamped = true;
      }
    }
    this.aim(f, i, side, rx, rz, landYaw);
    return clamped;
  }

  /** (anim-natural N1) `clockRoot`'s output: the root at a clock landing `toLand` s from now (m) and its landing yaw (rad). */
  private cRx = 0;
  private cRz = 0;
  private cYaw = 0;

  /** The root and landing yaw of a clock swing landing `toLand` s from now (writes cRx, cRz, cYaw; `aimClock`'s prediction). */
  private clockRoot(i: PlannerInput, toLand: number): void {
    // land ahead by at most what the leg can reach (at a sprint half a stance would overreach: the
    // foot lands nearer and toes off early instead)
    // (A1.2) facing mode: the stride runs along the facing at the facing-projected pace (backwards only on the slow
    // back walk), and the root is predicted on the turn's arc (chord at the mid yaw), not on the velocity's tangent
    let vx = i.velX;
    let vz = i.velZ;
    const fy = Math.sin(i.yaw);
    const fz = Math.cos(i.yaw);
    if (i.stride === 'facing') {
      const along = vx * fy + vz * fz;
      const vf = along >= 0 || !this.backWalk(i) ? Math.max(0, along) : along;
      vx = fy * vf;
      vz = fz * vf;
    }
    const v = hyp2(vx, vz);
    // (G1) a little short of half a stance: the trailing foot's heel raise (HEEL_RAISE) lengthens it at the back
    const runK = smooth((v - LAND_AHEAD_RUN.from) / (LAND_AHEAD_RUN.to - LAND_AHEAD_RUN.from));
    // (G1 fix) free movement only: aimed strafes and walls land half a stance ahead as before (a later landing left the
    // side-step's trailing foot past its reach, dragged: e2e-anim aim strafe foot lock)
    const share = i.stride === 'facing' ? LAND_AHEAD + (LAND_AHEAD_RUN.share - LAND_AHEAD) * runK : 0.5;
    const ahead = Math.min(i.duty * i.cycleTime * share * v, i.reach * 0.75) * stepStride(v);
    const lead = toLand + (v > 1e-3 ? ahead / v : 0);
    const cap = Number.isNaN(i.faceGoal) ? Math.PI / 2 : Math.abs(wrap(i.faceGoal - i.yaw));
    const dy = clampAbs(i.yawRate * lead, cap);
    let rx: number;
    let rz: number;
    if (i.stride === 'facing' && dy !== 0) {
      const ha = i.yaw + dy * 0.5;
      const vf = vx * fy + vz * fz;
      rx = i.rootX + Math.sin(ha) * vf * lead;
      rz = i.rootZ + Math.cos(ha) * vf * lead;
    } else {
      rx = i.rootX + vx * lead;
      rz = i.rootZ + vz * lead;
    }
    // the foot lands at the predicted mid-stance yaw: half the stance's turn ahead at touchdown, half behind at toe-off
    // (G1) free movement: no more than TURN_FOLLOW.twistFree ahead of the body at touchdown (the feet turn with it)
    // (anim-natural N1) with the turn rules up to LAND_TURN (kLand) ahead, never past the face goal: a fresh foot was ~33
    // deg behind the body by mid-stance at 7.85 rad/s and the swing made up 90-180 deg in the air
    this.cYaw =
      i.stride === 'facing'
        ? wrap(i.yaw + clampAbs(clampAbs(i.yawRate * toLand, cap) + clampAbs(i.yawRate * 0.5 * i.duty * i.cycleTime, this.turnOn ? this.kLand : TURN_FOLLOW.twistFree), cap))
        : wrap(i.yaw + clampAbs(i.yawRate * (toLand + 0.5 * i.duty * i.cycleTime), cap));
    this.cRx = rx;
    this.cRz = rz;
  }

  /**
   * (anim-natural N1, rule A2, e2e-anim run 180 first swing frames) Whether a planted foot `rem` s before its clock lift
   * must lift now so its swing does not start faster than SWING_ACC: the clock's swing to its landing (the stance spot
   * around `clockRoot`, the same landing time) starts at 6 x distance / air time^2 (smooth's start), which grows as the
   * lift waits. A run's 180 lifts the foot left behind ~1.05 m from its landing with 0.19 s of swing (TURN_DUTY 0.52 of a
   * 0.4 s cycle): 6.1 m/s by its third frame. Lifted now, it is an early clock swing (`turnStep`, landing on its strike).
   */
  private swingFast(f: FootState, i: PlannerInput, side: -1 | 1, rem: number): boolean {
    if (!(rem > 0)) return false;
    const air = rem + Math.min(0.6, (1 - i.duty) * i.cycleTime);
    this.clockRoot(i, air);
    this.ideal(i, side, this.cRx, this.cRz, this.cYaw);
    return 6 * hyp2(this.ix - f.x, this.iz - f.z) > SWING_ACC * air * air;
  }

  /**
   * (anim-natural N1, rule A) How far past the turn step's allowance (kTwist, rad) a planted foot's twist from the body
   * would be at its clock lift `rem` s from now, less what its ball pivot can still take (> 0: it must step now).
   */
  private turnOver(f: FootState, i: PlannerInput, rem: number): number {
    const cap = Number.isNaN(i.faceGoal) ? Math.PI / 2 : Math.abs(wrap(i.faceGoal - i.yaw));
    const pred = wrap(f.yaw - i.yaw) - clampAbs(i.yawRate * rem, cap);
    // (orchestrator review, mocap-trial-2) a clip-planted foot (clip feet on hand) never ball-pivots: no budget left
    const left = f.clipPlant && i.clipFeet ? 0 : this.kPivot - f.pivot;
    return (pred < 0 ? -pred : pred) - (left > 0 ? left : 0) - this.kTwist;
  }

  /**
   * (anim-natural N1, rule A) The turn step: an early start of the foot's own clock swing, timed to land on its clock
   * strike (`rem` s of stance left plus the clock's swing), aimed as the clock's swing (`aimClock`). Not when that is
   * longer than FOOT_TURN_STEP.maxAir (the pivot and the cap hold it), and at a walk (no flight phase) never with the other
   * foot in the air (nearly down from a rule step, it lands now). Returns whether it lifted.
   */
  private turnStep(f: FootState, i: PlannerInput, side: -1 | 1, rem: number): boolean {
    const air = rem + Math.min(0.6, (1 - i.duty) * i.cycleTime);
    if (!(rem > 0) || air > FOOT_TURN_STEP.maxAir) return false;
    const o = side < 0 ? this.R : this.L;
    if (hyp2(i.velX, i.velZ) <= 2) {
      if (!o.contact) {
        if (o.swBase < 0 && o.swing >= TURN_FOLLOW.earlySwap && !this.quick) this.land(o);
        else return false;
      }
      // (fix round) nor while the other foot's own clock swing is due (`otherDue`)
      if (this.otherDue(i, side)) return false;
    }
    // (jog / run: both feet in the air) not while the swinging foot is still passing this one (front to back within
    // PLANNER.swingNear in the facing): with neither foot planted the no-crossing pass pushed both apart, a jitter
    if (!o.contact) {
      const along = (o.x - f.x) * Math.sin(i.yaw) + (o.z - f.z) * Math.cos(i.yaw);
      if (along < PLANNER.swingNear) return false;
    }
    this.beginSwing(f, i, air, i.liftH);
    // the clock's own timing (as its swing: no step duration slider)
    f.stepDur = air;
    f.early = f.turn = true;
    f.turnSteps++;
    this.aimClock(f, i, side, air);
    return true;
  }

  /**
   * (anim-natural N1 fix round) With the turn rules at a walk (no flight phase): the other foot is planted but its own clock
   * swing is due (past its stance), held down only because this foot is in the air. A step this foot takes now keeps it
   * planted through the whole step: it wound past its pivot into the cap's backstop and the feet took turns at it.
   */
  private otherDue(i: PlannerInput, side: -1 | 1): boolean {
    if (!this.turnOn || hyp2(i.velX, i.velZ) > 2) return false;
    const o = side < 0 ? this.R : this.L;
    if (!o.contact) return false;
    const since = (((i.phase - (side < 0 ? 0.5 : 0)) % 1) + 1) % 1;
    return since >= i.duty;
  }

  /**
   * A moving rule step's target (a turn onto a wall, a crossed foot, a foot outside the band): the stance spot under the
   * root. (anim-natural N1) With the turn rules where the root and its yaw will be when it lands (the body turned up to
   * 2 rad during a crouched spin's band step, which landed 100 deg off the body; without the band scrub those steps are
   * the crouched spin's).
   */
  private ruleAim(f: FootState, i: PlannerInput, side: -1 | 1): void {
    if (!this.turnOn) {
      this.aim(f, i, side, i.rootX, i.rootZ, i.yaw);
      return;
    }
    const d = f.stepDur;
    const cap = Number.isNaN(i.faceGoal) ? Math.PI / 2 : Math.abs(wrap(i.faceGoal - i.yaw));
    this.aim(f, i, side, i.rootX + i.velX * d, i.rootZ + i.velZ * d, wrap(i.yaw + clampAbs(i.yawRate * d, cap)));
  }

  // --- still: planted, deliberate steps when out of place -----------------------------------
  private updateIdle(i: PlannerInput): void {
    const dt = i.dt;
    // (G1, audit row 29) crouched the idle steps are slower and more deliberate (CT ~1 step per 0.5 s)
    const idleT = PLANNER.idleStepTime + (PLANNER.idleStepCrouch - PLANNER.idleStepTime) * (i.crouch < 0 ? 0 : i.crouch > 1 ? 1 : i.crouch);
    for (let si = 0; si < 2; si++) {
      const side: -1 | 1 = si === 0 ? -1 : 1;
      const f = side < 0 ? this.L : this.R;
      // (G1) a heel raised at the end of a stance comes back down once still (~0.15 s)
      if (f.contact && f.roll <= 0 && f.pitch > 0) f.pitch = f.pitch < 1e-3 ? 0 : f.pitch * Math.exp(-dt / 0.05);
      // (mocap-trial) a clip's heel strike (toe up) left on a planted foot at a stop goes flat the same way (never
      // otherwise: the planner's heel roll ends at 0; fix 1: only a foot the clip planted, so with the switch off it never runs)
      else if (f.clipPlant && f.contact && f.roll <= 0 && f.pitch < 0) f.pitch = f.pitch > -1e-3 ? 0 : f.pitch * Math.exp(-dt / 0.05);
      if (f.contact) continue;
      // finish the step; a gait swing left over from moving (slow near a stop) finishes at idle pace (a quick stop
      // sets it down sooner, already timed above)
      if (!this.quick && f.stepDur > idleT * 1.2) {
        f.stepDur = idleT;
        f.stepT = Math.max(0, f.swing) * f.stepDur;
      }
      f.stepT += dt;
      const s = Math.min(1, f.stepT / f.stepDur);
      // (a quick stop's leftover swing lands where its stride was going: the stance it stopped in)
      if (this.pinned(i, side)) this.aimPin(f, i, side);
      else if (!this.quick) this.aim(f, i, side, i.rootX, i.rootZ, i.goalYaw);
      this.swingTo(f, i, s);
      if (s >= 1) this.land(f);
    }
    if (!this.L.contact || !this.R.contact) return;
    // pinned (a remote's feet on the owner's): a planted foot off its pin steps onto it
    if (this.pinned(i, -1) || this.pinned(i, 1)) {
      for (let si = 0; si < 2; si++) {
        const side: -1 | 1 = si === 0 ? -1 : 1;
        const f = side < 0 ? this.L : this.R;
        if (!this.pinned(i, side) || !f.contact) continue;
        const px = side < 0 ? i.pinLX : i.pinRX;
        const pz = side < 0 ? i.pinLZ : i.pinRZ;
        if (hyp2(f.x - px, f.z - pz) <= PIN_TOL) continue;
        this.beginSwing(f, i, idleT, PLANNER.idleLift);
        f.probeT = 0;
        this.aimPin(f, i, side);
        // one foot at a time
        return;
      }
      return;
    }
    // holding a stop: the feet stay in the stride
    // (G1 fix, audit row 9) a stop that froze in a lunge (the planted feet more than STOP_CLOSE apart front to back, the
    // rear one left behind by the slide): the rear foot closes in once, quickly, under the body (CT stands in a small split
    // within ~0.17 s, 110038 @ 11.87-12.03)
    if (this.quick && !Number.isNaN(i.yaw)) {
      const sn = Math.sin(i.yaw);
      const cs = Math.cos(i.yaw);
      const lf = (this.L.x - this.R.x) * sn + (this.L.z - this.R.z) * cs;
      if (lf > STOP_CLOSE || lf < -STOP_CLOSE) {
        const rear = lf > 0 ? this.R : this.L;
        this.beginSwing(rear, i, STOP_CLOSE_TIME, PLANNER.idleLift);
        this.aim(rear, i, lf > 0 ? 1 : -1, i.rootX, i.rootZ, i.yaw);
        return;
      }
    }
    if (i.hold) return;
    // both planted: step the foot furthest from its ideal spot, if far enough
    let worst: FootState | null = null;
    let worstSide: -1 | 1 = -1;
    let worstErr = 0;
    let errL = 0;
    let errR = 0;
    for (let si = 0; si < 2; si++) {
      const side: -1 | 1 = si === 0 ? -1 : 1;
      const f = side < 0 ? this.L : this.R;
      this.ideal(i, side, i.rootX, i.rootZ, i.goalYaw);
      // a relaxed stance tolerates a front-back stagger (a stop's settling step leaves one), not a
      // sideways one
      const ex = f.x - this.ix;
      const ez = f.z - this.iz;
      let fwd = ex * Math.sin(i.goalYaw) + ez * Math.cos(i.goalYaw);
      const lat = ex * Math.cos(i.goalYaw) - ez * Math.sin(i.goalYaw);
      // (step 22) a staggered stance (the kneel) is entered by the rear foot only: the front foot short of its spot
      // stays planted (lifting it after the rear foot stepped back left the body over nothing: an eased stop ends with
      // the feet square, so both stepped; flat-crouch3-aim balance 36 cm)
      if (fwd < 0 && (side < 0 ? i.lZ - i.rZ : i.rZ - i.lZ) > STAGGER.min) fwd = Math.min(0, fwd + STAGGER.hold);
      const err = hyp2(fwd / PLANNER.idleStagger, lat / (this.restepT > 0 ? RESTEP.err : PLANNER.idleErr)) + Math.abs(wrap(f.yaw - i.goalYaw)) / PLANNER.idleYawErr;
      if (side < 0) errL = err;
      else errR = err;
      if (err > worstErr) {
        worstErr = err;
        worst = f;
        worstSide = side;
      }
    }
    // (anim-natural N1) with the turn rules a near tie (both feet about as far off: a crouch's re-step from the square
    // stance a turn's steps leave) is not always the left foot's: the foot planted longer steps first, the feet take
    // turns (the left foot's crouch-entry re-step right after its own step: the right wrist 3.2 cm into the right thigh,
    // e2e-clip crouched holstered)
    // (n138 fix) Crouching down, the re-step out of the narrow standing stance (Michael's trackMul 0.05: the feet ~3 cm
    // off the line) takes the right foot first whenever it has to step: Wren's right hand is the one nearer its thigh
    // (the closest arm-to-leg point in every measured frame), and the left foot going first left the right leg narrow
    // and loaded as the hands came down onto the knees (headless e2e-clip replay: the right wrist 2.83 cm into the right
    // thigh, 2.4 cm with the right foot first, tests/crouchEntryRig.test.ts). Which foot went first had been the turn
    // history's (plantT), so a different arrival flipped it (e2e-clip in-game -2.9 cm on N1, -3.2 after the master
    // 4.58.0 merge).
    if (this.turnOn && worst && this.restepT > 0 && i.crouch > 0.5 && errR > STEP[SP.replant]!) {
      worstSide = 1;
      worst = this.R;
    } else if (this.turnOn && worst && Math.abs(errL - errR) < IDLE_TIE * worstErr && this.L.plantT !== this.R.plantT) {
      worstSide = this.L.plantT > this.R.plantT ? -1 : 1;
      worst = worstSide < 0 ? this.L : this.R;
    }
    if (worst && worstErr > STEP[SP.replant]!) {
      this.beginSwing(worst, i, idleT, PLANNER.idleLift);
      worst.stepT = 0;
      this.aim(worst, i, worstSide, i.rootX, i.rootZ, i.goalYaw);
    }
  }

  /**
   * (mocap-trial, A3) Clip feet: the clip places this foot's steps (`C`, from the graph), the planner only grounds and pins
   * them. Contacts keep the gait clock's windows (the clip's duty; phase 0 the left strike, 0.5 the right). A foot lifting
   * while the mode is on swings under the clip (`clipOwn`): from where it left the ground onto the clip's target, which
   * moves with the root (the gap fades out over the swing), its height the ground under the target plus the clip's lift,
   * its pitch the clip's; it lands where it is and stays pinned there (never dragged or scrubbed) until the clip lifts it.
   * A swing the planner began finishes under the planner; with the mode off a planted foot is the planner's again (reach,
   * turn steps, band). Returns true when it handled the foot. No allocation.
   */
  private clipFoot(f: FootState, i: PlannerInput, side: -1 | 1, since: number, wantContact: boolean, C: ClipFeetIn): boolean {
    const o = side < 0 ? 0 : 5;
    // (mocap-trial-2, pop3) a start's lift the clip left to the planner: the planner keeps the planted foot through the rest
    // of its swing window (its wait for the other foot, or its clock swing, as with the switch off); the clip takes it again
    // from its landing, or from its stance window (below: the start toe-off if it was left behind)
    const wb = side < 0 ? 1 : 2;
    if (this.clipWait & wb) {
      if (f.contact && !wantContact && this.moveT < START_TOE_OFF) return false;
      this.clipWait &= ~wb;
    }
    // (mocap-trial-2, pop3) an idle step still in the air as the move starts (a short stand) is the planner's: where the
    // clock wants the foot down it lands within CLIP_IDLE_LAND instead of at idle pace, so the clip's lifts wait at most that.
    // (`clipIdle`); the clip lifts no foot while the other is still in it
    // (mt2-fixA, CHECK-3 required 2) also on a move after a stand shorter than START_STILL (CT's stop and start springs:
    // the planner's start window runs on): the idle step at idle pace was taken over by the clock at 0.59, 47 cm in a frame
    if ((this.moveT < i.dt * 1.5 || this.firstMove) && !f.contact && !f.clipOwn) this.clipIdle |= wb;
    if (this.clipIdle & wb) {
      if (f.contact || f.swBase >= 0) this.clipIdle &= ~wb;
      else if (wantContact && f.swing < 0.9) {
        const d = Math.max(CLIP_IDLE_LAND / (0.9 - f.swing), PLANNER.idleStepTime * CLIP_IDLE_RATE);
        if (d < f.stepDur) f.stepDur = d;
      }
    }
    if (!wantContact) {
      if (f.contact) {
        if (!C.on) return false;
        // (mocap-trial-2, pop3) in a start no clip lift while the other foot is still in that idle step, or late in the swing
        // window (no time left for the swing): the planner lifts this foot (or waits for the other to land), as switched off
        if (this.moveT < START_TOE_OFF && (this.clipIdle & (3 - wb) || (i.duty < 1 && since - i.duty > CLIP_LIFT_LATE * (1 - i.duty)))) {
          this.clipWait |= wb;
          return false;
        }
        // (fix 1) a pitch the planner left on the foot (a start's first clip swing, a turn's hand-back mid-ease) fades into
        // the clip's over the swing's first CLIP_PITCH_SWING; a foot the clip had fully lifts on the clip's own pitch
        // (mt2-fixF) a clip plant's raised heel (the planner's, on top of the clip's pitch) fades out the same way
        const off = f.clipPlant && f.clipPitchT >= CLIP_PITCH_EASE && !(f.heelP > 0) ? 0 : f.pitch - C.f[o + 3]!;
        this.beginSwing(f, i, (1 - i.duty) * i.cycleTime, 0);
        f.clipOwn = true;
        f.clipPitchT = 0;
        f.clipPitchOff = off;
        this.clipTarget(i, C, o);
        f.offX = f.x - this.ix;
        f.offZ = f.z - this.iz;
        f.toY = this.groundAt(i, this.ix, this.iz);
        f.probeT = 0.08;
      } else if (!f.clipOwn) return false;
      const u = i.duty < 1 ? Math.min(1, Math.max(0, (since - i.duty) / (1 - i.duty))) : 1;
      const h = smooth(u);
      this.clipTarget(i, C, o);
      f.probeT -= i.dt;
      if (f.probeT <= 0) {
        f.probeT = 0.08;
        f.toY = this.groundAt(i, this.ix, this.iz);
      }
      f.toX = this.ix;
      f.toZ = this.iz;
      f.toYaw = i.yaw;
      f.x = this.ix + f.offX * (1 - h);
      f.z = this.iz + f.offZ * (1 - h);
      const lift = C.f[o + 1]!;
      f.y = f.fromY + (f.toY - f.fromY) * h + (lift > 0 ? lift : 0);
      f.yaw = wrap(f.fromYaw + wrap(i.yaw - f.fromYaw) * h);
      f.clipPitchT += i.dt;
      f.pitch = C.f[o + 3]! + f.clipPitchOff * (1 - smooth(f.clipPitchT / (CLIP_PITCH_SWING * f.stepDur)));
      f.swing = u;
      f.stepT = u * f.stepDur;
      return true;
    }
    if (!f.contact) {
      if (!f.clipOwn) return false;
      // set down where it is, on the ground under it
      f.toX = f.x;
      f.toZ = f.z;
      f.toY = this.groundAt(i, f.x, f.z);
      f.toYaw = f.yaw;
      f.offBase = -1;
      this.land(f);
      f.clipPlant = true;
      f.clipPitchT = CLIP_PITCH_EASE;
      f.roll = 0;
      f.pitch = C.f[o + 3]!;
      return true;
    }
    if (!C.on) {
      // (fix 1) the planner has this planted foot (a fast turn): the clip eases its pitch back in when it takes it again
      f.clipPitchT = -1;
      return false;
    }
    // (mocap-trial-2, pop3) in a start, a planted foot the clip would take from the planner further behind the clip's own
    // foot than CLIP_TAKE_BEHIND stays the planner's and toes off now (the start toe-off, A80; with the other foot in the
    // air it waits planted); the clip takes it from that landing. Pinned for the rest of the clip's stance it stretched
    // the leg (a late first step at 2.0 m/s: pelvis 82 -> 19 cm); left to the planner's own toe-off it was dragged 3.6 cm
    // once the clip lifted the other foot (no flight at a walk)
    // (mt2-fixA, CHECK-3 required 1) also, at any time, a foot the clip pinned whose leg the rig already drops the pelvis
    // more than CLIP_PIN_NEED for (`reachNeedL` / `R`, last frame's): a pace change through CT's spring left it pinned for
    // a walk-length stance at run pace (its need 2 -> 11 -> 23 -> 43 cm in 4 frames, the pelvis 46 cm down)
    if (
      (f.clipPlant && ((side < 0 ? i.reachNeedL : i.reachNeedR) ?? 0) > CLIP_PIN_NEED) ||
      (f.clipPitchT < 0 && this.moveT < START_TOE_OFF && C.f[o + 2]! - ((f.x - i.rootX) * Math.sin(i.yaw) + (f.z - i.rootZ) * Math.cos(i.yaw)) > CLIP_TAKE_BEHIND)
    ) {
      if (!(side < 0 ? this.R : this.L).contact) return false;
      this.beginSwing(f, i, Math.min(0.6, (1 - i.duty) * i.cycleTime), i.liftH);
      if (this.turnOn) {
        const rem = (i.duty - since) * i.cycleTime;
        f.early = true;
        this.aimClock(f, i, side, rem < 0.9 * f.stepDur ? rem + Math.min(0.6, (1 - i.duty) * i.cycleTime) : f.stepDur);
      } else this.aim(f, i, side, i.rootX + i.velX * f.stepDur, i.rootZ + i.velZ * f.stepDur, i.yaw);
      return true;
    }
    // planted under the clip: pinned; the heel and toe from the clip
    f.roll = 0;
    const cp = C.f[o + 3]!;
    // (fix 1) a planted foot the clip takes over from the planner (a fast turn's end, a start: the planner's raised heel)
    // eases its pitch onto the clip's over CLIP_PITCH_EASE
    if (f.clipPitchT < 0) {
      f.clipPitchT = 0;
      f.clipPitchOff = f.pitch - cp;
      f.clipPlant = true;
    }
    if (f.clipPitchT < CLIP_PITCH_EASE) {
      f.clipPitchT += i.dt;
      f.pitch = cp + f.clipPitchOff * (1 - smooth(f.clipPitchT / CLIP_PITCH_EASE));
    } else f.pitch = cp;
    return true;
  }

  /**
   * (mocap-trial-2, crouchpop) A foot the clip planted, clip feet gone (a crouch or a draw took the mocap share), takes no
   * rule step unless both stance windows outlast it: its own clock swing comes first and lands it on the planner's track.
   * The crouched band read the clip's narrow track as out of band and stepped the foot just landed: the other foot held
   * planted on its raised heel past its window, then lifted late (s 0.6) and flattened 1 rad in 0.15 s; or the clock took
   * the rule step over mid-air (the ankle 31 cm on in a frame). Never with the switch off.
   */
  private clipHeld(f: FootState, i: PlannerInput, side: -1 | 1): boolean {
    return !i.clipFeet && !!i.mocap && f.clipPlant && Math.min(this.windowLeft(i, side < 0 ? 1 : -1), this.windowLeft(i, side)) < PLANNER.idleStepTime * 0.75;
  }

  /** (mocap-trial, fix 1) Seconds left of a side's stance window on the gait clock (0: in its swing window). */
  private windowLeft(i: PlannerInput, side: -1 | 1): number {
    const since = (((i.phase - (side < 0 ? 0 : 0.5)) % 1) + 1) % 1;
    return since < i.duty ? (i.duty - since) * i.cycleTime : 0;
  }

  /** (mocap-trial) The clip's ankle for one side (`o` 0 or 5) in the world, around the root (writes ix, iz). */
  private clipTarget(i: PlannerInput, C: ClipFeetIn, o: number): void {
    const x = C.f[o]!;
    const z = C.f[o + 2]!;
    const c = Math.cos(i.yaw);
    const s = Math.sin(i.yaw);
    this.ix = i.rootX + x * c + z * s;
    this.iz = i.rootZ - x * s + z * c;
  }

  /** A planted foot stays put unless the body has moved out of reach (then it must step). */
  private holdOrStep(f: FootState, i: PlannerInput, side: -1 | 1, rem: number): void {
    // (anim-natural N1, rule A) the turn step: the foot the turn would wind past its allowance steps round now
    if (this.pick === side && this.turnStep(f, i, side, rem)) return;
    // (rule A2) and a foot whose clock swing would start too fast (a run's 180: the foot left behind, a short swing) lifts
    // early enough to land on its strike at SWING_ACC
    if (this.turnOn && this.rateT < BAND_TURN_TIME && f.plantT >= FOOT_TURN_STEP.minPlant && this.swingFast(f, i, side, rem) && this.turnStep(f, i, side, rem)) return;
    // (step 11) turned well away from the body (a turn onto a wall): step round with it, one foot at a time
    const o = side < 0 ? this.R : this.L;
    // (A1.2) the rules also fire while the other foot is nearly down: it lands now (an early swap, never both in the air)
    // (only a rule step: a clock swing landed early would restart its window at once)
    const swap = !o.contact && o.swing >= TURN_FOLLOW.earlySwap && o.swBase < 0 && !this.quick;
    const turned = Math.abs(wrap(f.yaw - i.yaw)) > i.turnStep;
    const c = Math.cos(i.yaw);
    const sn = Math.sin(i.yaw);
    const ox = o.contact ? o.x : o.toX;
    const oz = o.contact ? o.z : o.toZ;
    const crossed = ((f.x - ox) * c - (f.z - oz) * sn) * side < PLANNER.minGap * 0.5;
    if ((o.contact || swap) && (turned || crossed)) {
      if (!o.contact) this.land(o);
    }
    // (anim-natural N1 fix round) with the turn rules at a walk, no rule step while the other foot's own clock swing is due:
    // it waited planted through the whole step (past its pivot, into the backstop: a 120 Hz jog flick 180)
    const oDue = this.otherDue(i, side);
    // (mocap-trial, fix 1) clip feet on hand (a fast turn hands them to the planner): no rule step on this foot while the
    // other's stance window ends before the step could land; the other lifts first, by the clock. The turn swung the
    // clip's staggered narrow track round until it read side by side, the rule lifted the foot just landed, and the
    // trailing foot was held planted past its window (no two feet in the air at a walk): the pelvis sank 35 cm
    // (mocap-trial-2, crouchpop) and a foot the clip planted, clip feet gone (clipHeld)
    const rules = o.contact && !oDue && !(i.clipFeet && this.windowLeft(i, side < 0 ? 1 : -1) < PLANNER.idleStepTime * 0.75) && !this.clipHeld(f, i, side);
    if (rules && turned) {
      this.beginSwing(f, i, PLANNER.idleStepTime * 0.75, i.liftH);
      this.ruleAim(f, i, side);
      return;
    }
    // (A1.1) the body has turned round the planted feet until they are side by side or crossed in its frame (a tight
    // circle): this foot steps round to its own side
    if (rules) {
      const gap = ((f.x - o.x) * c - (f.z - o.z) * sn) * side;
      if (gap < PLANNER.minGap * 0.5) {
        this.beginSwing(f, i, PLANNER.idleStepTime * 0.75, i.liftH);
        this.ruleAim(f, i, side);
        return;
      }
      // (G1 fix) free movement: a planted foot the capped scrub cannot keep inside the stance band steps back into it
      if (i.stride === 'facing' && Number.isNaN(i.wallD)) {
        if (this.outOfBand(f, i, side)) {
          this.beginSwing(f, i, PLANNER.idleStepTime * 0.75, i.liftH);
          this.ruleAim(f, i, side);
          return;
        }
      }
    }
    // measured from under its own hip (the foot's stance spot), not the root centre: a side-step's
    // trailing foot is a hip width further from the centre than the leg is actually stretched
    const lx = side < 0 ? i.lX : i.rX;
    const hx = i.rootX + lx * Math.cos(i.yaw);
    const hz = i.rootZ - lx * Math.sin(i.yaw);
    const dx = f.x - hx;
    const dz = f.z - hz;
    // a planted foot trails up to half a stance behind the hip at speed
    const reach = Math.max(i.reach, hyp2(i.velX, i.velZ) * i.duty * i.cycleTime * 0.5 + 0.3) * STEP[SP.slide]!;
    // moving: toe off before the leg is stretched past what the IK can hold planted
    // (locomotion step 21, D2, A80) over 2 m/s, and in a start's first START_TOE_OFF s at any speed: a walk start at
    // gear 1 held the trailing foot planted 0.2 s past its reach and the pelvis sank 10 cm (a start bob, and a second
    // high in the first step). Only at the start: mid-gait on a remote copy it toed off against the clock (stairs slid)
    // (G1, audit rows 1 / 6) and turning in free movement: a foot the turn has left behind toes off before it stretches the
    // leg (zig-zag walks dropped the pelvis 10 cm for a trailing foot 0.49 m behind)
    const turnLeft = i.stride === 'facing' && this.turnT < TURN_LEFT_TIME && hyp2(dx, dz) > i.reach * 0.75;
    // (G1, audit row 13) a start's trailing foot goes a little sooner (0.92 -> 0.82 of the reach): the first stride's
    // double support no longer sinks the pelvis 9 cm
    const dl = hyp2(dx, dz);
    const startOff = this.moveT < START_TOE_OFF && dl > i.reach * 0.82;
    // (G1 fix) and in a Chaos Theory stop's slide (quickStop): a planted foot the body slides away from toes off instead of
    // being dragged (it showed once the start's clock moved the stride's phase)
    // (anim-rework S2) at a walk (no flight phase) never with the other foot in the air: a turn from a standstill lifted both
    // feet at once (a hop)
    // (mt2-pop1) clip feet on hand: or the other foot nearly down and this leg already at its reach (CLIP_TOE_OFF_SWING), a
    // short double flight instead of the pelvis sinking. (mt2-integ) Not in a start's first START_TOE_OFF s: there pop3's
    // left-behind toe-off (clipFoot) waits for the other foot to land; lifted mid-air instead, the clock's takeover of
    // that early swing froze it a frame and its narrow landing put the next clip swing 4.3 cm inside the uncross gap
    // (mocapSwitch "starts and stops" joint jerk 14.6 cm/frame2 vs 9.0 off)
    // (mocap-trial-2, strafe) and in the mocap strafe with the other foot nearly down: the captures' long stance (duty 0.7)
    // after a closing step the lead foot blocked (a snap into the strafe on the wrong foot) dragged the trailing foot 1.6 cm
    const flight = o.contact || hyp2(i.velX, i.velZ) > 2 || (!!i.clipFeet && this.moveT >= START_TOE_OFF && o.swing >= CLIP_TOE_OFF_SWING && ((side < 0 ? i.reachNeedL : i.reachNeedR) ?? 0) > CLIP_TOE_OFF_NEED) || ((i.strafe ?? 0) > 0.5 && o.swing >= CLIP_TOE_OFF_SWING);
    // (mocap-trial-2 strafe fix) and in the mocap strafe at a start's reach share: a snap onto the strafe's long side-step
    // stretched the trailing leg past the rig's reach a frame before it toed off (planted ankle 0.8 cm)
    const stOff = (i.strafe ?? 0) > 0.5 && dl > i.reach * 0.82;
    if (i.moving && flight && (turnLeft || startOff || stOff || (dl > i.reach * 0.92 * STEP[SP.replant]! && (hyp2(i.velX, i.velZ) > 2 || i.quickStop > 0)))) {
      // accelerating (a sprint or a walk start): the trailing foot toes off early instead of sliding or pulling the
      // pelvis down; the clock's contact window then lands it ahead
      this.beginSwing(f, i, Math.min(0.6, (1 - i.duty) * i.cycleTime), i.liftH);
      if (this.turnOn) {
        // (anim-natural N1, cause 5) aimed as the clock's swing will be when it takes the toe-off over (the clock's landing
        // time and spot, its landing yaw): the target used to jump there at the takeover (3-5.4 m/s first swing frames in turns)
        f.early = true;
        this.aimClock(f, i, side, rem < 0.9 * f.stepDur ? rem + Math.min(0.6, (1 - i.duty) * i.cycleTime) : f.stepDur);
      } else this.aim(f, i, side, i.rootX + i.velX * f.stepDur, i.rootZ + i.velZ * f.stepDur, i.yaw);
      return;
    }
    // (mocap-trial-2 strafe fix 3) in the mocap strafe not while the rig still reaches the foot (its reach need last frame
    // at most STRAFE_HOLD_NEED): the hips sit over the planner's lagging side-steps (GLIDE_HIP, STRAFE_HIP_IN), up to 30 cm
    // behind the root, so the reach read from the root dragged a planted trailing foot 3.9 cm the rig could hold (a
    // restart after a 0.3 s stand at 0.9 m/s) while the other foot's long side-step was in the air
    if (hyp2(dx, dz) > reach && !((i.strafe ?? 0) > STRAFE_ON && ((side < 0 ? i.reachNeedL : i.reachNeedR) ?? 0) <= STRAFE_HOLD_NEED)) {
      // out of reach while locked: drag (counted) back to the reach limit; a real step follows
      const d = hyp2(dx, dz);
      const k = reach / d;
      const nx = hx + dx * k;
      const nz = hz + dz * k;
      f.slide += hyp2(nx - f.x, nz - f.z);
      // (anim-natural N1) an anchored foot's ball goes with it
      f.ballX += nx - f.x;
      f.ballZ += nz - f.z;
      f.x = nx;
      f.z = nz;
    }
  }

  private beginSwing(f: FootState, i: PlannerInput, dur: number, lift: number): void {
    f.contact = false;
    f.fromX = f.x;
    f.fromY = f.y;
    f.fromZ = f.z;
    f.fromYaw = f.yaw;
    f.stepDur = Math.max(0.16, dur * STEP[SP.dur]!);
    f.stepLift = lift * STEP[SP.lift]!;
    f.stepT = 0;
    f.swing = 0;
    f.probeT = 0;
    f.swBase = -1;
    f.offBase = -1;
    // (G1) a heel already raised at toe-off carries its pitch into the swing (no ankle snap)
    f.fromPitch = f.pitch > 0 ? f.pitch : 0;
    // (mocap-trial, fix 1) every swing starts as the planner's: clipFoot claims its own after this (a turn step left
    // flagged as the clip's was set down again by clipFoot and lifted once more: lift, land, lift in 3 frames)
    // (mocap-trial-2, crouchpop) a foot the clip planted that the planner lifts while moving, clip feet gone (a crouch or a
    // draw took the mocap share), eases from its pitch then onto the planner's swing over CLIP_PITCH_EASE (swingTo, as a
    // taken-over clip swing): fromPitch read the clip's heel-strike toe-up as 0, and a lift held while the other foot finished a rule
    // step started past the toe-off's ease (s 0.3: a 1.0 rad raised heel flat in a frame), ankle-toe 32-57 deg a frame.
    // Not with clip feet on hand (a start's toe-off: the clip takes the swing, eased there the knee popped 39 deg), and never
    // with the switch off (a toe-up plant's flag kept through a switch off mid-stop: the planner's lift as before)
    if (f.clipPlant && i.mocap && i.moving && !i.clipFeet) {
      f.clipPitchT = 0;
      f.clipPitchOff = f.pitch;
    } else f.clipPitchT = -1;
    f.clipOwn = false;
    f.clipPlant = false;
    // (anim-natural N1) a plain swing (the toe-off and the turn step mark themselves); the ball pivot ends with the plant
    f.early = f.turn = f.anchored = false;
    f.heelP = 0;
    // (mocap-trial-2, runturn) where the body was at the lift, and with clip feet on hand at a flight gait the share of
    // this swing run in the body's frame (CLIP_SWING)
    f.liftYaw = i.yaw;
    f.liftX = i.rootX;
    f.liftZ = i.rootZ;
    f.liftW = i.clipFeet ? 1 - smooth((i.duty - CLIP_SWING.full) / (CLIP_SWING.none - CLIP_SWING.full)) : 0;
  }

  /** Update a swinging foot's landing target (ideal spot around a root position), feet never crossing. */
  private aim(f: FootState, i: PlannerInput, side: -1 | 1, rx: number, rz: number, yaw: number): void {
    this.ideal(i, side, rx, rz, yaw);
    let tx = this.ix;
    let tz = this.iz;
    // no crossing: keep a gap from the other foot along the body's lateral axis
    const other = side < 0 ? this.R : this.L;
    // (A1.1) measured in the landing foot's own frame (the yaw it lands at), not the body's current one: the body
    // yaw moves ~90 deg per 0.2 s in a fast turn
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const ox = other.contact ? other.x : other.toX;
    const oz = other.contact ? other.z : other.toZ;
    const latT = (tx - rx) * c - (tz - rz) * s;
    const latO = (ox - rx) * c - (oz - rz) * s;
    // (anim-rework S2) in free movement the gap follows the stance (FREE_GAP of its width, at most minGap): the fixed 13 cm
    // pushed every left landing out to 13 cm from the right foot, so the keyed walk's 10 cm track read 6.5-9 cm a foot
    // (the wide stance Michael saw at 14:45)
    // (anim-rework S3) standing aimed (the glide: `glide`, stride 'velocity' off the wall) the closing foot comes in to GLIDE_GAP:
    // a side-step's close at about hip width, so the step opens the feet less wide
    // (anim-rework S4) crouched too: the keyed crouched set's narrow track (the 13 cm gap held the crouch 9-12.6 cm a foot)
    const gapNeed =
      i.stride === 'facing' && Number.isNaN(i.wallD)
        ? Math.min(PLANNER.minGap, (i.rX - i.lX) * FREE_GAP)
        : i.glide && Number.isNaN(i.wallD)
          ? GLIDE_GAP
          : PLANNER.minGap;
    const bad = side < 0 ? latT - (latO - gapNeed) : latO + gapNeed - latT;
    if (bad > 0) {
      const shift = side < 0 ? -bad : bad;
      tx += shift * c;
      tz += -shift * s;
    }
    // (A1.2) and against the other foot where it is now, in the current pelvis frame, when they land near each other
    const py = this.pelvis(i);
    const pc = Math.cos(py);
    const ps = Math.sin(py);
    const oxN = other.x;
    const ozN = other.z;
    const alongP = (tx - oxN) * ps + (tz - ozN) * pc;
    if (alongP < TURN_FOLLOW.nearAlong && alongP > -TURN_FOLLOW.nearAlong) {
      const gapP = ((tx - oxN) * pc - (tz - ozN) * ps) * side;
      const badP = gapNeed - gapP;
      if (badP > 0) {
        tx += badP * side * pc;
        tz -= badP * side * ps;
      }
    }
    // (G1) free movement: the landing stays inside the stance band either side of the midline (no lateral splay)
    if (i.stride === 'facing' && Number.isNaN(i.wallD)) {
      const lat = ((tx - rx) * c - (tz - rz) * s) * side;
      const lo = bandMin(i);
      const hi = bandMax(i);
      const cl = lat < lo ? lo : lat > hi ? hi : lat;
      if (cl !== lat) {
        const d = (cl - lat) * side;
        tx += d * c;
        tz -= d * s;
      }
      // (anim-natural N1 fix round, CHECK finding 4) crouched with the turn rules the landing leads the body by up to
      // LAND_TURN, so inside the band in its own frame it landed up to 2 cm outside it in the body's (no band scrub
      // brings it back): the planted crouched stance stood 20.8-20.9 cm wide in 120 Hz spins (master 19.6). The body's
      // frame about the root now too
      if (this.turnOn && i.crouch > 0.5) {
        const bc = Math.cos(i.yaw);
        const bs = Math.sin(i.yaw);
        const latB = ((tx - i.rootX) * bc - (tz - i.rootZ) * bs) * side;
        const clB = latB < lo ? lo : latB > hi ? hi : latB;
        if (clB !== latB) {
          const d = (clB - latB) * side;
          tx += d * bc;
          tz -= d * bs;
        }
      }
      // (anim-natural N1) with the turn rules a landing leads the body by up to LAND_TURN, so its frame and the pelvis
      // frame part: the band clamp (landing frame) put it across the planted foot in the pelvis frame, the no-crossing
      // pass held the swing out and it jumped onto its spot at touchdown (10 cm). The pelvis frame gap has the last word
      if (this.turnOn) {
        const alongQ = (tx - oxN) * ps + (tz - ozN) * pc;
        if (alongQ < TURN_FOLLOW.nearAlong && alongQ > -TURN_FOLLOW.nearAlong) {
          const badQ = gapNeed - ((tx - oxN) * pc - (tz - ozN) * ps) * side;
          if (badQ > 0) {
            tx += badQ * side * pc;
            tz -= badQ * side * ps;
          }
        }
      }
    }
    // limit the step length from where the foot left the ground
    const sx = tx - f.fromX;
    const sz = tz - f.fromZ;
    const sl = hyp2(sx, sz);
    if (sl > PLANNER.maxStep) {
      tx = f.fromX + (sx * PLANNER.maxStep) / sl;
      tz = f.fromZ + (sz * PLANNER.maxStep) / sl;
    }
    // (step 11) never behind a wall's face
    if (!Number.isNaN(i.wallD)) {
      const behind = tx * i.wallNx + tz * i.wallNz - i.wallD;
      if (behind < 0) {
        tx -= behind * i.wallNx;
        tz -= behind * i.wallNz;
      }
    }
    // ground under the landing spot (refreshed a few times per swing)
    f.probeT -= i.dt;
    if (f.probeT <= 0) {
      f.probeT = 0.08;
      // (step 22) never past a drop's edge: a spot with no ground in the probe's reach (walking off a ledge) is pulled
      // back toward where the foot left (`EDGE_PULL`); landing there at the root's height left the foot planted in
      // the air past the edge (drop09 footFloat 29-92 cm)
      let k = 1;
      let g = this.groundHit(i, tx, tz);
      for (let n = 0; n < EDGE_PULL.length && Number.isNaN(g); n++) {
        k = EDGE_PULL[n] ?? 0;
        g = this.groundHit(i, f.fromX + (tx - f.fromX) * k, f.fromZ + (tz - f.fromZ) * k);
      }
      f.edgeK = k;
      f.toY = Number.isNaN(g) ? i.rootY : g;
    }
    if (f.edgeK < 1) {
      tx = f.fromX + (tx - f.fromX) * f.edgeK;
      tz = f.fromZ + (tz - f.fromZ) * f.edgeK;
    }
    f.toX = tx;
    f.toZ = tz;
    f.toYaw = yaw;
  }

  /**
   * Ground height under a landing spot, within -0.4..+0.45 m of the root. (fix 21-3) The probe starts 0.6 m over the
   * root; ground higher than that (a stride ahead up a 35 deg slope at a sprint) missed it and the foot aimed at the
   * root's height, 30-60 cm under the slope, then jumped up when a later probe hit: a second probe from higher up
   * takes only ground the first one started under.
   */
  private groundAt(i: PlannerInput, x: number, z: number): number {
    const g = this.groundHit(i, x, z);
    return Number.isNaN(g) ? i.rootY : g;
  }

  /** `groundAt`, NaN when neither probe finds ground (a drop: past a ledge's edge). */
  private groundHit(i: PlannerInput, x: number, z: number): number {
    if (!i.ground) return i.rootY;
    let g = i.ground(x, z, i.rootY + 0.6);
    if (g === null) {
      g = i.ground(x, z, i.rootY + 1.1);
      if (g !== null && g < i.rootY + 0.6) g = null;
    }
    return g === null ? Number.NaN : Math.max(i.rootY - 0.4, Math.min(i.rootY + 0.45, g));
  }

  /** (A1.2) The slow back walk: travelling against the facing at under 0.9 m/s. */
  private backWalk(i: PlannerInput): boolean {
    const v = hyp2(i.velX, i.velZ);
    return v < 0.9 && i.velX * Math.sin(i.yaw) + i.velZ * Math.cos(i.yaw) < -0.7 * v;
  }

  private pinned(i: PlannerInput, side: -1 | 1): boolean {
    return side < 0 ? !Number.isNaN(i.pinLX) : !Number.isNaN(i.pinRX);
  }

  /** A swinging foot's landing target on its pin (ground probed as `aim`). */
  private aimPin(f: FootState, i: PlannerInput, side: -1 | 1): void {
    f.toX = side < 0 ? i.pinLX : i.pinRX;
    f.toZ = side < 0 ? i.pinLZ : i.pinRZ;
    if (!Number.isNaN(i.wallD)) {
      const behind = f.toX * i.wallNx + f.toZ * i.wallNz - i.wallD;
      if (behind < 0) {
        f.toX -= behind * i.wallNx;
        f.toZ -= behind * i.wallNz;
      }
    }
    f.toYaw = i.goalYaw;
    f.probeT -= i.dt;
    if (f.probeT <= 0) {
      f.probeT = 0.08;
      f.toY = this.groundAt(i, f.toX, f.toZ);
    }
  }

  /** Instant stop: a foot in the air sets straight down where it is, over `quickStop` (the stride it stopped in). */
  private setDown(f: FootState, i: PlannerInput): void {
    f.fromX = f.toX = f.x;
    f.fromZ = f.toZ = f.z;
    f.fromY = f.y;
    f.fromYaw = f.toYaw = f.yaw;
    // (G1, audit row 9) the freeze keeps a small split: a foot just off the ground behind (or reaching far ahead) sets
    // down within STOP_SPLIT front to back of the planted one, with a little lift when it has to travel
    const o = f === this.L ? this.R : this.L;
    let move = 0;
    if (o.contact) {
      const sn = Math.sin(i.yaw);
      const cs = Math.cos(i.yaw);
      const fwd = (f.x - o.x) * sn + (f.z - o.z) * cs;
      // (G1 fix) only a foot just off the ground behind is drawn in: one reaching ahead sets down where it is (pulling it
      // back across the body made a 0.36 m backward step and a 14 cm dip)
      const cl = fwd < -STOP_SPLIT ? -STOP_SPLIT : fwd;
      if (cl !== fwd) {
        f.toX += (cl - fwd) * sn;
        f.toZ += (cl - fwd) * cs;
        move = Math.abs(cl - fwd);
      }
    }
    f.toY = this.groundAt(i, f.toX, f.toZ);
    f.stepLift = move > 0.05 ? 0.035 : 0;
    f.stepT = 0;
    f.stepDur = Math.max(1e-3, i.quickStop, move > 0.05 ? 0.16 : 0);
    f.fromPitch = f.pitch;
    f.swing = 0;
    f.swBase = -1;
    f.offBase = -1;
    f.early = f.turn = false;
    // (mocap-trial-2, runturn) set straight down from where it is: along the world line
    f.liftW = 0;
  }

  /** Position along the swing at progress s. */
  private swingTo(f: FootState, i: PlannerInput, s: number): void {
    // (mocap-trial-2, CHECK-2 required 2) a clip swing the planner just took over (clipPitchT 0, never with the switch
    // off): where the clip had it, the gap fading out below as a taken-over toe-off's
    const hand = f.clipPitchT === 0;
    const hx = f.x;
    const hy = f.y;
    const hz = f.z;
    f.swing = s;
    const h = smooth(s);
    let fx = f.fromX;
    let fz = f.fromZ;
    let tx = f.toX;
    let tz = f.toZ;
    // (mocap-trial-2, runturn) lifted with clip feet on hand at a flight gait, the swing runs in the body's frame (CLIP_SWING)
    const wF = f.liftW;
    if (wF > 0) {
      // the lift spot turns with the body: its offset from the root at the lift turned by the body's turn since, the
      // root's travel since taken along its chord (the frame half way round the turn). Straight on it is the lift spot
      const dyaw = wrap(i.yaw - f.liftYaw);
      const k = (s < CLIP_SWING.carry ? smooth(s / CLIP_SWING.carry) : 1) * wF;
      const c1 = Math.cos(dyaw);
      const s1 = Math.sin(dyaw);
      const c2 = Math.cos(0.5 * dyaw);
      const s2 = Math.sin(0.5 * dyaw);
      const ax = f.fromX - f.liftX;
      const az = f.fromZ - f.liftZ;
      const vx = i.rootX - f.liftX;
      const vz = i.rootZ - f.liftZ;
      fx += (i.rootX + ax * c1 + az * s1 - (vx * c2 + vz * s2) - f.fromX) * k;
      fz += (i.rootZ - ax * s1 + az * c1 - (-vx * s2 + vz * c2) - f.fromZ) * k;
      // and the landing spot the other way: its offset from where the root lands (on the turn's arc, as `clockRoot`)
      // turned back by the turn still to come, the root's travel there straightened onto the facing (a long swing's
      // chord ran up to 26 cm inside the body's path: a jog turn's outside foot crossed the planted one, the knees
      // knocked and bowed apart, ankle-toe 31 deg). Straight on it is the landing spot
      const kT = (s < CLIP_SWING.set0 ? 1 : 1 - smooth((s - CLIP_SWING.set0) / (CLIP_SWING.set1 - CLIP_SWING.set0))) * wF;
      if (kT > 0) {
        const rem = (1 - s) * f.stepDur;
        const dr = clampAbs(i.yawRate * rem, Number.isNaN(i.faceGoal) ? Math.PI / 2 : Math.abs(wrap(i.faceGoal - i.yaw)));
        const sy = Math.sin(i.yaw);
        const cy = Math.cos(i.yaw);
        const vf = i.velX * sy + i.velZ * cy;
        const d = vf > 0 ? vf * rem : 0;
        const bx = f.toX - i.rootX - Math.sin(i.yaw + 0.5 * dr) * d;
        const bz = f.toZ - i.rootZ - Math.cos(i.yaw + 0.5 * dr) * d;
        const c3 = Math.cos(dr);
        const s3 = Math.sin(dr);
        tx += (i.rootX + bx * c3 - bz * s3 + sy * d - f.toX) * kT;
        tz += (i.rootZ + bx * s3 + bz * c3 + cy * d - f.toZ) * kT;
      }
    }
    f.x = fx + (tx - fx) * h;
    f.z = fz + (tz - fz) * h;
    // lift peaks early (heel comes up first), sets down gently
    const arc = Math.sin(Math.PI * Math.min(1, s * 1.08)) * (1 - 0.25 * s);
    f.y = f.fromY + (f.toY - f.fromY) * h + f.stepLift * Math.max(0, arc);
    if (hand) {
      f.offX = hx - f.x;
      f.offY = hy - f.y;
      f.offZ = hz - f.z;
      f.offBase = 0;
      f.offDur = 0;
    }
    if (f.offBase >= 0) {
      // (fix 21-2) a taken-over early toe-off: the gap to the clock's swing fades out over OFF_FADE s (a landing
      // before then lands where the foot is)
      f.offBase += i.dt;
      const k = 1 - smooth(f.offBase / (f.offDur > 0 ? f.offDur : OFF_FADE));
      f.x += f.offX * k;
      f.y += f.offY * k;
      f.z += f.offZ * k;
      if (k <= 0) {
        f.offBase = -1;
        f.offDur = 0;
      }
    }
    // passing the planted foot (a side-step back across, a reversal) the swing bows out sideways to `swingGap` from
    // it, so the feet never brush; the ends of the swing stay where they are
    const o = f === this.L ? this.R : this.L;
    if (o.contact) {
      // (A1.2) in the current pelvis frame, and a window that widens with the turn rate
      const py = this.pelvis(i);
      const c = Math.cos(py);
      const sn = Math.sin(py);
      const along = (f.x - o.x) * sn + (f.z - o.z) * c;
      const near = PLANNER.swingNear * (1 + Math.min(1.5, Math.abs(i.yawRate) * 0.2));
      // (mocap-trial, fix 1) with clip feet on hand (a fast turn's planner steps on the clip's narrow track) the bow-out
      // fades in and out over a further `near` front to back: at the window's edge it moved the swing foot up to 25 cm
      // sideways in a frame (hip-knee and ankle-toe bones 24-26 deg). Off: the window as before (wk exactly 1 inside it)
      const far = i.clipFeet ? near * 2 : near;
      if (along < far && along > -far) {
        const latF = (f.x - i.rootX) * c - (f.z - i.rootZ) * sn;
        const latO = (o.x - i.rootX) * c - (o.z - i.rootZ) * sn;
        const bad = f === this.L ? latF - (latO - PLANNER.swingGap) : latO + PLANNER.swingGap - latF;
        if (bad > 0) {
          // (anim-natural N1) with the turn rules the bow fades in over the outer half of the window: a foot entering it
          // jumped by the whole bow (5-14 cm in a frame on a turn's crossing swing)
          // (mocap-trial, fix 1) with clip feet on hand the fade runs over the further `near` outside the window instead
          // (measured on the clip's narrow track); without them exactly N1's
          const ad = along < 0 ? -along : along;
          const w = i.clipFeet ? (ad <= near ? 1 : 1 - smooth((ad - near) / near)) : this.turnOn ? smooth((near - ad) / (0.5 * near)) : 1;
          const shift = (f === this.L ? -bad : bad) * Math.sin(Math.PI * s) * w;
          f.x += shift * c;
          f.z -= shift * sn;
        }
      }
    }
    // (A1.2) the foot turns the way the body turns (past 115 deg the shortest way could swing it through the other leg),
    // at most TURN_FOLLOW.maxSwingYaw a swing (the landing yaw is held there too)
    let dy = wrap(f.toYaw - f.fromYaw);
    if ((dy > 2 || dy < -2) && Math.abs(i.yawRate) > 1 && Math.sign(dy) !== Math.sign(i.yawRate)) dy += TAU * Math.sign(i.yawRate);
    if (dy > TURN_FOLLOW.maxSwingYaw || dy < -TURN_FOLLOW.maxSwingYaw) {
      dy = clampAbs(dy, TURN_FOLLOW.maxSwingYaw);
      f.toYaw = wrap(f.fromYaw + dy);
    }
    // (anim-natural N1) moving with the turn rules the yaw gets there by SWING_YAW_BY of the swing: the foot comes round
    // early and sets down already turned
    if (this.turnOn && i.moving) {
      // (a re-aimed landing yaw, as the turn starts or the clock takes a turn step over, moved the swing foot's yaw up to
      // 27 deg in a frame: it follows at most SWING_YAW_RATE)
      let want = wrap(f.fromYaw + dy * smooth(s / SWING_YAW_BY));
      if (f.liftW > 0) {
        // (mocap-trial-2, runturn) a swing run in the body's frame (CLIP_SWING) turns in it too: off the body's yaw, from
        // where it was at the lift to where it lands off the body's yaw there (the turn still to come taken off). Turned
        // to its landing yaw early, a long flight-gait swing pointed 50 deg into the turn mid-air: the knee pole swung the
        // knee across the planted one and the knock rule bowed it back (10 cm a frame, ankle-toe 34 deg)
        const dr = clampAbs(i.yawRate * (1 - s) * f.stepDur, Number.isNaN(i.faceGoal) ? Math.PI / 2 : Math.abs(wrap(i.faceGoal - i.yaw)));
        const r0 = wrap(f.fromYaw - f.liftYaw);
        const wb = wrap(i.yaw + r0 + wrap(f.toYaw - i.yaw - dr - r0) * smooth(s / SWING_YAW_BY));
        want = wrap(want + wrap(wb - want) * f.liftW);
      }
      // (mt2-fixB, CHECK-3 item 3) clip feet on: the rate is at least what lands the foot on its landing yaw, the rest of
      // the turn spread over the frames left (a turn's swing whose window shrank under it, 0.46 -> 0.18 s at a 2 m/s 180
      // flick, lagged up to 33 deg and set down on the landing yaw in a frame)
      let ym = SWING_YAW_RATE * i.dt;
      if (i.clipFeet) {
        const e = Math.abs(wrap(f.toYaw - f.yaw)) * (i.dt / (i.dt + (1 - s) * f.stepDur));
        if (e > ym) ym = e;
      }
      f.yaw = wrap(f.yaw + clampAbs(wrap(want - f.yaw), ym));
    } else f.yaw = wrap(f.fromYaw + dy * h);
    // toe-off then heel strike: toe down early, toe up just before landing
    // (locomotion step 21, A80) the toe-off pitch eases in over the first tenth of the swing: it started at 0.45 rad
    // (26 deg) on the lift frame, an ankle snap of 25-36 deg a frame once the pelvis stopped dropping for the swing
    // (step 22) a quick stop's set-down or closing step eases the toe flat from where it was (restarting the toe-off
    // there tipped the ankle 22 deg in a frame at 120 Hz, flat-stand4)
    if (this.quick) f.pitch = f.fromPitch * (1 - smooth(s));
    else f.pitch = s < 0.3 ? Math.max(0.45 * STEP[SP.toeOff]! * (1 - s / 0.3) * smooth(s / 0.1), f.fromPitch * (1 - smooth(s / 0.3))) : s > 0.72 ? -0.22 * STEP[SP.heel]! * smooth((s - 0.72) / 0.2) * (1 - (this.rollOn ? 1 - HEEL_ROLL.pitch / 0.22 : 1) * smooth((s - 0.92) / 0.08)) : 0;
    // (mocap-trial-2, CHECK-2 required 2) a clip swing the planner took over (a stop) eases from the clip's pitch
    // (`clipPitchOff`, the pitch then) onto the planner's over CLIP_PITCH_EASE; never with the switch off (-1)
    if (f.clipPitchT >= 0) {
      f.clipPitchT += i.dt;
      const k = smooth(f.clipPitchT / CLIP_PITCH_EASE);
      f.pitch = f.clipPitchOff + (f.pitch - f.clipPitchOff) * k;
      if (k >= 1) f.clipPitchT = -1;
    }
  }

  private land(f: FootState): void {
    if (f.offBase >= 0) {
      // (fix 21-2) still fading a taken-over swing's offset: set down where the foot is
      f.toX = f.x;
      f.toZ = f.z;
      f.offBase = -1;
      f.offDur = 0;
    }
    f.x = f.toX;
    f.y = f.toY;
    f.z = f.toZ;
    f.yaw = f.toYaw;
    f.contact = true;
    f.swing = -1;
    // (anim-natural N1) a new plant: no pivot yet
    f.early = f.turn = f.anchored = false;
    f.plantT = f.pivot = f.heelP = 0;
    // (mocap-trial-2, CHECK-2 required 2) a taken-over clip swing still easing its pitch lands on it, flagged as the clip's
    // plant so standing flattens it either way (updateIdle): set to 0 here, the rig's pitch cap wrote the capped pitch
    // back and a toe up stayed up (-0.27 rad) for the whole stand. (A clip swing's own landing here, clipOwn, as before.)
    const eased = f.clipPitchT >= 0 && !f.clipOwn;
    // (step 22, A79) heel first at a walking pace: the toe comes down over HEEL_ROLL.time
    f.roll = this.rollOn && !eased ? HEEL_ROLL.time : 0;
    if (!eased) f.pitch = this.rollOn ? -HEEL_ROLL.pitch * STEP[SP.heel]! : 0;
    f.landed = true;
    // (mocap-trial, fix 1) a landing is the planner's (clipFoot claims its own after this)
    f.clipOwn = false;
    f.clipPlant = eased;
    f.clipPitchT = -1;
  }
}
