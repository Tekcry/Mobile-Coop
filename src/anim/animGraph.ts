/**
 * Layered, clip-based animation graph (pure: no Babylon). Evaluated every render frame.
 *
 * Lower body: a 2D blend space (speed x direction) over keyed locomotion cycles, standing and
 * crouched, all sampled at the gait clock so blends never fight the feet; a timed kneel pose; start
 * weight shift, stop settle and pivot clips driven by the motion driver's state; back-to-wall, traversal,
 * slide and air poses. Switches between these are inertialized (the jump decays through a critically
 * damped curve per joint group), never cut or linearly faded.
 * Upper body: weapon ready positions blended to the raised aim pose; reload (tactical / empty), swap and
 * grenade clips; head-first peek and lean sequencing; recoil absorbed through the spine; spine/head
 * look-at; breathing after 2 s still; hit flinch; acceleration lean.
 * Balance: a pelvis spring compressed on every heel strike and shifted over the support foot.
 * Feet are placed by the rig's world-space FootPlanner from the stance and gait values output here.
 */
import type { Proportions } from '../player/proportions';
import { overClip, addClip, type Clip } from './clip';
import { CH, Inertializer, lerpPose, newPose, type Pose } from './pose';
import { gaitRate, TURN_GAIT_MIN, TURN_STEP, type MotionState } from './motion';
import { MOVEMENT, TENSE } from '../config/movement';
import { approach, clamp, smoothstep, Spring, type V3 } from './rigMath';
import { TUNE_CUR, tuneMoveTwist } from './tune';
import { WEIGHT_POSE, weightApplyPose } from './weight';
import {
  CROUCH_BACK,
  CROUCH_IDLE,
  CROUCH_STRAFE_L,
  CROUCH_STRAFE_R,
  CROUCH_NODES,
  FORWARD_NODES,
  IDLE,
  KNEEL,
  KNEEL_M,
  TENSE_SNEAK,
  WALK_BACK,
  WALK_STRAFE_L,
  WALK_STRAFE_R,
} from './clips/locomotion';
import { DROP, GRENADE, LAND, LAND_DEEP, MANTLE, PIVOT, reloadClipFor, SLIDE, START_SHIFT, STEP_UP, STOP_SETTLE, swapClipFor, VAULT, type SwapReach } from './clips/actions';
import { CLIMB, CLIMB_UP, CLIMB_UP_TEAM, CRAWL, CRAWL_OUT, HANG, PIPE_CLIMB, BRACE, PIPE_INVERTED, PIPE_LEGS_UP, RAPPEL_HANG, ROLL, rollTumble, SPLIT_BRACE, VENT_DROP, WALL_KICK, WINDOW_VAULT } from './clips/traverse';
import { hyp2 } from '../core/mathx';
import { effortSpeed } from './effort';
import { mirrorKeyed, mixKeyed, newKeyedPose, sampleKeyed, type KeyedClip, type KeyedPose } from './keyed';
import { KEYED_WALK } from './clips/keyed/walk';
import { KEYED_JOG } from './clips/keyed/jog';
import { KEYED_RUN } from './clips/keyed/run';
import { KEYED_IDLE } from './clips/keyed/idle';
import { KEYED_READY_STANCE } from './clips/keyed/ready_stance';
import { KEYED_GLIDE_FWD } from './clips/keyed/glide_fwd';
import { KEYED_GLIDE_STRAFE } from './clips/keyed/glide_strafe';
import { KEYED_GLIDE_BACK } from './clips/keyed/glide_back';


export const FADE = 0.2;
/** (locomotion step 21) Crouch -> kneel cross-fade (s), inside the Inertializer's 0.1-0.25 s (bible 5.12.2). */
export const KNEEL_FADE = 0.22;
export const LOWER_STATES = ['locomotion', 'crouch', 'kneel', 'air', 'slide', 'wall', 'traverse'] as const;
export type LowerState = (typeof LOWER_STATES)[number];
/** Committed moves (vault .. hop) and the attached pose family (hang, climb, crawl: keyed over the climb
 *  cadence, `traverseT`). */
export type TraverseKind = 'none' | 'vault' | 'mantle' | 'step' | 'drop' | 'hop' | 'roll' | 'hang' | 'climb' | 'pipeClimb' | 'crawl' | 'crawlOut' | 'climbUp' | 'ventDrop' | 'windowVault' | 'split' | 'wallKick' | 'pipeLegs' | 'pipeInv' | 'rappel' | 'brace';

export interface AnimInput {
  /** Horizontal ground speed (m/s) and local movement direction (x right, z forward). */
  speed: number;
  localX: number;
  localZ: number;
  grounded: boolean;
  /** 0 standing .. 1 crouched (eased by the controller). */
  crouch: number;
  /** Crouched and still: one-knee kneel. */
  kneel: boolean;
  /** (G1, audit row 26) Close to an unaware guard: crouched at a sneak pace the tense sneak takes over (TENSE). */
  tense: boolean;
  /** (CT prototype G8) The keyed walk may play: free movement along the facing with nothing in the arms' or body's way
   *  (no close-quarters hold, carry or knockout bend); the rig sets it. Off by default (guards, scripted rigs). */
  keyedOk: boolean;
  /** (anim-rework S3) A carrier (the player, a remote player) with the gun out, free on foot (no wall, door settle, held
   *  guard): the drawn keyed set may play (ready stance, the low ready walk / jog / run legs, the aimed glide). */
  keyedDrawn: boolean;
  /** Aim pitch (up +) and aim yaw relative to the body (radians). */
  aimPitch: number;
  aimYaw: number;
  /** 0 at the ready position .. 1 shouldered on the aim line. */
  raise: number;
  /** Ready-position weights (sum 1). */
  carryLow: number;
  carryHigh: number;
  carryComp: number;
  /** Weapon mass factor (1 = rifle). Heavier = more inertia and sway. */
  weight: number;
  /** Momentary recoil 0..1. */
  kick: number;
  /** Reload progress 0..1, or < 0; empty = the longer reload with the charging handle. */
  reload: number;
  reloadEmpty: boolean;
  /** Weapon swap progress 0..1, or < 0. */
  swap: number;
  /** Carry slot kinds the swap holsters to / draws from. */
  swapFrom: SwapReach;
  swapTo: SwapReach;
  /** (ct-prototype D1) A draw / holster travel is running: the gun is in the trigger hand the whole way (grip 1). */
  weaponTravel: boolean;
  /** (ct-prototype D+E fix r1) A climbUp from a ledge / drainpipe hang (the rig saw grips on): the knee-plant clip. */
  ledgeClimb: boolean;
  /** Grenade throw progress 0..1, or < 0. */
  grenade: number;
  /** Body yaw rate (rad/s). */
  yawRate: number;
  /** Holding a weapon (two-hand grip). */
  armed: boolean;
  /**
   * (step 09, A42) Weapons carried slung / holstered with the hands empty, on foot: the arms take the ready-hands
   * stand-in and the body keeps the armed carriage (holstering never changes pelvis or head motion, D2).
   */
  ready: boolean;
  /** (fix 21-1, A81) A gun holstered on the right thigh: the relaxed right hand hangs out past it (READY_HANDS.xHolster). */
  thighGear: boolean;
  /** Dash blend 0..1. */
  dash: number;
  /** Dash-in slide progress 0..1, or < 0. */
  slide: number;
  /** Landing recovery 0..1. */
  landing: number;
  /** Back to a wall (the flat-back high stance; back-to-wall, step 11 / A6). */
  wall: boolean;
  /** Which side the wall is on, in the character's frame (-1 left, 1 right, 0 none). */
  wallSide: number;
  /** (G6) How far the posed body is turned off facing out from the wall (|sin|: 0 square .. 1 side-on). */
  wallTurn: number;
  /** (G6, AUDIT-WALLS row 12) A wall right in front of the raised weapon: 0 clear .. 1 at `WALL_BLOCK.near` m (the caller's
   *  ray from the shoulder along the aim); the rifle comes up muzzle-high and pulled in. */
  wallBlock: number;
  /** Lean around an edge: -1 left .. 1 right (hips planted). */
  lean: number;
  traverse: TraverseKind;
  /** Traversal progress 0..1. */
  traverseT: number;
  /** Melee swing 0..1, or < 0. */
  melee: number;
  /** (3.2.0) Whole-body tumble about the hips (rad) set by the caller (pipe legs up / inverted). */
  tumble: number;
  /** Doorway check sweep 0..1, or < 0. */
  check: number;
  /** Gait clock from the motion driver (0..1), or < 0 to integrate from speed. */
  phase: number;
  /** Motion driver state and time in it ('' when there is no driver: enemies, remotes). */
  motion: MotionState | '';
  motionT: number;
  /** Chaos Theory instant stop (3.2.0): the locomotion blends out to idle over this many seconds (0 = the usual). */
  quickStop: number;
  /**
   * Chaos Theory stop hold (3.2.0, m/s; 0 = none): stopped, the body holds the stride it stopped in - the locomotion
   * pose at the frozen gait clock for this pace - until the next input (move, aim, stance, wall, traversal).
   */
  holdSpeed: number;
  /** Root acceleration in the body frame (m/s^2): forward, right. */
  accelFwd: number;
  accelSide: number;
  /** Render-rate stick intent along the body (-1..1, wanted minus current pace): the lean-in shows on the
   *  very next frame, before the fixed-rate root motion catches up. */
  intent: number;
  /** Weapon changing hands 0..1, or < 0 (set by the rig). */
  handSwap: number;
  /** Which hand holds the weapon: 1 right .. -1 left (the rig mirrors weapon x / yaw / roll by it). */
  hand: number;
  /** (G7) Close quarters: the spine bent forward over a held guard / a body (rad), the pelvis dropped (m) and the
   *  hold's side sway (m); eased here, so a hold or a carry starting or ending never pops the back. */
  bend: number;
  bendDrop: number;
  sway: number;
}

/** (locomotion step 10) The elbow arc's hand overlay weight at melee phase `ph` 0..1 (in by 0.17, out from 0.62). */
export function meleeHandW(ph: number): number {
  return smoothstep(ph / 0.167) * (1 - smoothstep((ph - 0.62) / 0.38));
}

/** (G7) An eased value within 1e-4 of its target is the target (the close-quarters layer switches off). */
function settle(x: number, target: number): number {
  return Math.abs(x - target) < 1e-4 ? target : x;
}

/** (step 10) The elbow arc's sweep 0 (wind-up, hand out to the side) .. 1 (contact, across the front). */
export function meleeSweep(ph: number): number {
  return smoothstep((ph - 0.1) / 0.456) * (1 - 0.5 * smoothstep((ph - 0.62) / 0.38));
}

/** (step 10) How far the striking elbow's IK pole lifts (out to the side, level): the graph's hand sweep and the
 *  rig's pole share it, so local and remote rigs (both from `melee`) pose alike. */
export function meleePoleW(ph: number): number {
  return meleeSweep(ph) * meleeHandW(ph);
}

export function defaultInput(): AnimInput {
  return {
    speed: 0,
    localX: 0,
    localZ: 0,
    grounded: true,
    crouch: 0,
    kneel: false,
    tense: false,
    keyedOk: false,
    keyedDrawn: false,
    aimPitch: 0,
    aimYaw: 0,
    raise: 0,
    carryLow: 1,
    carryHigh: 0,
    carryComp: 0,
    weight: 1,
    kick: 0,
    reload: -1,
    reloadEmpty: false,
    swap: -1,
    swapFrom: 'backC',
    swapTo: 'backC',
    weaponTravel: false,
    ledgeClimb: false,
    grenade: -1,
    yawRate: 0,
    armed: true,
    ready: false,
    thighGear: false,
    dash: 0,
    slide: -1,
    landing: 0,
    wall: false,
    wallSide: 0,
    wallTurn: 0,
    wallBlock: 0,
    lean: 0,
    traverse: 'none',
    traverseT: 0,
    melee: -1,
    tumble: 0,
    check: -1,
    phase: -1,
    motion: '',
    motionT: 0,
    quickStop: 0,
    holdSpeed: 0,
    accelFwd: 0,
    accelSide: 0,
    intent: 0,
    handSwap: -1,
    hand: 1,
    bend: 0,
    bendDrop: 0,
    sway: 0,
  };
}

/**
 * Lateral foot offset for a sidestep: the lead foot steps out and the trail foot closes in, so the
 * feet never cross (kept as a utility; the planner enforces the same rule in world space).
 */
export function lateralOffset(dx: number, along: number, stride: number, side: -1 | 1): number {
  return dx * along + side * Math.abs(dx) * stride * 0.5;
}

export interface RigTargets {
  /** Pelvis offset from its rest position and rotation (radians). */
  pelvis: { x: number; y: number; z: number; pitch: number; roll: number; yaw: number };
  /** Spine + chest rotation (split between both). */
  spine: { pitch: number; yaw: number; roll: number };
  head: { pitch: number; yaw: number; roll: number };
  /** Weapon pose relative to the aim pocket: offsets (m) and rotation (rad). */
  weapon: { x: number; y: number; z: number; pitch: number; yaw: number; roll: number };
  /** 1 = both hands on the weapon (IK), 0 = free arms (targets below). */
  grip: number;
  /** Off hand: weights on the foregrip, the magazine well, the wall (rest = free target). */
  offGrip: number;
  offMag: number;
  offWall: number;
  handL: V3;
  handR: V3;
  /** Ideal stance per foot (root space, m) and heel raise / pitch offsets. */
  stance: { lX: number; lZ: number; rX: number; rZ: number; lY: number; rY: number; lPitch: number; rPitch: number };
  /** Gait values for the foot planner. */
  /** (A1.2) `turning` 0..1: how much of the cadence comes from body turning. */
  gait: { phase: number; duty: number; liftH: number; cycleTime: number; moving: boolean; turning: number };
  /** Whole-body tumble about the hips (rad, forward): the landing roll. */
  tumble: number;
  /** Layer weights for the debug overlay. */
  layers: Record<string, number>;
  /** Vertical weapon bob left after stabilisation (m), for tests and the debug trace. */
  weaponBob: number;
  /** (locomotion step 21) Share of the free hand targets that follow the shoulders (ready hands): the rig adds its own
   *  pelvis drop (feet reach, head cap) to that share, so the shoulders' real drop is carried once. */
  readyFollow: number;
  /** (step 21, M14) Where the graph puts the right shoulder joint for the ready hands (body space, m; the left mirrors
   *  x): the rig moves the ready share of the hand targets by the real shoulder's offset from it, so the arms hang from
   *  the actual shoulders (the rig's pelvis drop, head cap and twist included) and keep their bend. */
  readyShoulder: V3;
  /** Cheek weld 0..1 (raised to aim): the neck bends the head down onto the stock, eyes stay on the aim. */
  weld: number;
  /** (G2, AUDIT-AIM row 5) The sight line sits this far (m) below the eye at a full weld (a pistol held under the line). */
  sightDrop: number;
  /** (G2) Share of the weld that is a stock weld 0..1 (the neck dips onto the stock; a pistol has none). */
  stockWeld: number;
  /** How far the weapon is raised onto the aim line 0..1 (lowered it follows the body, raised the aim). */
  aimW: number;
  /** (G6, AUDIT-WALLS row 18) Crouched side-on at a wall: the open-side hand on that knee (signed: 1 the right hand on
   *  the right knee, -1 the left; magnitude the weight), the wall-side hand low by its shin. The rig places both on its
   *  posed legs. */
  kneeHand: number;
  /** (CT prototype G8) The keyed walk (`clips/keyed/walk.ts`, G8-PLAN.md): its weight on the body (pelvis, spine, chest,
   *  neck, legs' track and knee pole) and on the free arms, its pose sampled on this frame's gait phase, and its knee
   *  pole out-share. The rig blends toward it after its procedural solve. */
  keyW: number;
  keyArmW: number;
  keyed: KeyedPose;
  keyKneeOut: number;
  /** (anim-rework S2) The standing holstered weight (on foot, standing, free hands; not faded by turning or moving): the
   *  rig's hip follow and swing knee pole use it. */
  keyHol: number;
  /** (anim-rework S2) The keyed idle's head scan (rad, body yaw of the keyed neck x the idle's share): the rig adds it to
   *  the world-stabilised head, so the scan shows while the aim and look keep driving the head. */
  keyScan: number;
  /** (anim-rework S3) The drawn share of the keyed pose 0..1 (gun out): its pelvis offsets ride on the procedural ones and
   *  the rig applies the keyed trunk only by `keyTrunk` (1 - the drawn share), so the upper body stays the procedural gun
   *  platform; the legs (track, knee pole, duty, lift) take the drawn set's values. */
  keyDrawn: number;
  keyTrunk: number;
}

export function emptyTargets(): RigTargets {
  return {
    pelvis: { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 },
    spine: { pitch: 0, yaw: 0, roll: 0 },
    head: { pitch: 0, yaw: 0, roll: 0 },
    weapon: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
    grip: 1,
    offGrip: 1,
    offMag: 0,
    offWall: 0,
    handL: { x: 0, y: 0, z: 0 },
    handR: { x: 0, y: 0, z: 0 },
    stance: { lX: -0.11, lZ: 0.04, rX: 0.11, rZ: -0.02, lY: 0, rY: 0, lPitch: 0, rPitch: 0 },
    gait: { phase: 0, duty: 0.63, liftH: 0.065, cycleTime: 1.1, moving: false, turning: 0 },
    tumble: 0,
    layers: {},
    weaponBob: 0,
    readyFollow: 0,
    readyShoulder: { x: 0, y: 0, z: 0 },
    weld: 0,
    sightDrop: 0,
    stockWeld: 1,
    aimW: 0,
    kneeHand: 0,
    keyW: 0,
    keyArmW: 0,
    keyed: newKeyedPose(),
    keyKneeOut: KEYED_WALK.kneeOut,
    keyHol: 0,
    keyScan: 0,
    keyDrawn: 0,
    keyTrunk: 1,
  };
}

/** Choose the lower-body state (priority order). */
export function pickLower(i: AnimInput): LowerState {
  if (i.traverse !== 'none') return 'traverse';
  if (i.slide >= 0) return 'slide';
  if (!i.grounded) return 'air';
  if (i.wall) return 'wall';
  if (i.crouch > 0.5) return i.kneel ? 'kneel' : 'crouch';
  return 'locomotion';
}

/** Ready-position weapon poses (offsets from the aim pocket; pitch + = muzzle down). */
/**
 * Raised to aim, the weapon comes up to the eye (cheek weld): this offset from the rest aim pocket puts
 * the sight line level with the eye, beside the head (stock high in the shoulder, elbows up); the head dips onto the stock
 * (`SIGHT_HEAD` pitch, roll toward the gun). Scaled by the aim raise.
 */
export const SIGHT_RAISE = { x: 0.08, y: 0.215, z: -0.05 };
/**
 * (BC note 2) Raised, the aim is carried by the chest: the spine chain takes this share of the aim pitch (rad per rad) and
 * of the aim yaw on top of its usual share, so head, shoulders, arms and weapon stay one block and the wrists stay near
 * neutral (the weapon was turning at the wrists only). Starting values (G10).
 * (CT prototype G2, AUDIT-AIM row 4, replaces BC's pitch 0.75) CT's aimed upper body is one rigid block that tilts at the
 * hips (051543 15-30: head and rifle keep their place in the frame down to about 60 deg; 050541 the same walking): raised,
 * the chest takes the WHOLE aim pitch (`pitch` 0.75 -> 1, the wrists stay neutral), the hips `hips` 0.35 of it (clamped
 * to `hipsMax` rad; the rig's spine takes back 0.6 of the pelvis tilt, so the graph gives the spine the rest: chest = 0.4
 * pelvis + spine), and the pelvis moves back `hipsBack` m per radian of hip tilt for balance (the feet stay planted). The
 * head is world-stabilised by the rig (0.8 of the aim plus 0.4 of its channel: 0.98), so it needs no change. The split is
 * a design value: CT never shows a third-person view of an aiming body.
 */
export const AIM_CHEST = { pitch: 1, yaw: 0.3, hips: 0.35, hipsMax: 0.35, hipsBack: 0.08 };
/** (BC note 2) Raised, the elbow pole tucks in: share of the usual outward elbow swing that is removed at a full raise. */
// (anim-rework S3, BRIEF 3 "elbows down") 0.6 -> 0.85: the rifle aim held the elbows 7 cm out past the shoulders
export const AIM_ELBOW_TUCK = 0.85;
/**
 * (feature/weapons) A sidearm raised to the eye goes out to nearly arm's length in front of the face (CT's pistol aim:
 * two hands, arms out; Michael's reference shots), not into the rifle's cheek weld: added to SIGHT_RAISE by the
 * weapon's lightness (mass factor 0.7 pistol: all of it; 0.85 and heavier: none).
 * (CT prototype G2, AUDIT-AIM row 5) CT holds it two-handed, compact and LOW: the hands below and right of the head at chin
 * height, the gun under the sight line, the forearms rising from below (111908 2.2: hands x 0.39 / y 0.68 of the frame,
 * head 0.22 / 0.45). x -0.07 -> -0.09, y 0.015 -> -0.06 (the sight line held this far below the eye: `sightDrop`), z 0.1
 * -> 0.15 (a little further out, the elbows lower; G2 fix r1: 0.2 straightened the arms, CT's hold is compact); `lean` the chest forward over a raised pistol (it leaned back), no stock weld
 * (no neck dip, no head roll onto the gun).
 */
export const PISTOL_REACH = { x: -0.09, y: -0.06, z: 0.15, lean: 0.08 };
/** `peekFull`: (G2 fix) the head lean (rad) at which a raised pistol keeps the full head roll and neck dip at a wall-edge peek. */
export const SIGHT_HEAD = { roll: 0.15, peekFull: 0.2 };
/**
 * Per-shot recoil on the body (rad / m per unit kick, divided by the mass factor). (CT prototype G2, AUDIT-AIM row 11) CT
 * shows no visible flip: the front sight and head move < 1 % of the frame (< 0.5 deg) on the shot frames (111953 3.87,
 * 6.27-6.33, 30 fps). flip 0.12 -> 0.02 (about 7 deg was 7x CT), back 0.05 -> 0.015 m, spine 0.05 -> 0.01, pelvis 0.015
 * -> 0.003. Starting values.
 */
export const RECOIL = { flip: 0.02, back: 0.015, spine: 0.01, pelvis: 0.003 };

/**
 * (locomotion step 21, D2) Weapon / kit stabilisation spring (rad/s): critically damped, settles to 2 % in 5.8 / omega
 * = 0.2 s after a stop, no secondary wobble. Idle breathing (BREATH) starts after `still` s without moving, never
 * while moving or aiming; `amp` is the chest pitch (rad, ~4 mm at the head), `rate` its angular frequency (rad/s).
 */
export const WEAPON_SETTLE_OMEGA = 29;
// (G1, audit row 20) rate 1.6 -> 2.1 rad/s: a 3.0 s breath (old 043858)
export const BREATH = { still: 2, fadeIn: 1.5, fadeOut: 0.05, amp: 0.008, rate: 2.1 };
/**
 * Tactical carriage with a weapon: the chest well forward over the hips, hips back, knees bent, head up (eyes
 * level) - never upright like a mannequin. More bent over moving along a wall and crouched (`crouch`: over the
 * knees); a little more leaning into a raised weapon ((G2, AUDIT-AIM row 4) `aimOpen` 0.05 more off a wall, 0.1 in all: CT leans
 * into the aim; at a wall edge the hand switch keeps the old 0.05, rig.test's pocket jerk bound).
 */
export const HUNCH = { spine: 0.5, pelvis: 0.1, head: 0.34, drop: 0.07, wall: 0.2, wallDrop: 0.06, aim: 0.05, aimOpen: 0.05, crouch: 0.34 };

/**
 * (step 09, A42; step 21, D5.6 trained posture; M14 relaxed arms) Holstered hands on foot: the arms hang RELAXED AT THE
 * SIDES (M14, replaces A42's hands in front), elbows slightly bent, hands loose by the thighs, with a natural counter
 * swing when moving (the arm opposite the leg forward, growing with speed). Crouched the arms stay relaxed, hands out
 * by the knees, elbows softly bent (never straight, never through the thighs). At the sprint the arms pump with the
 * stride (A76): elbows bent, a bigger fore-aft drive, hands a little higher. The wrist target hangs below the shoulder
 * joint (which follows the rig's bent chain, below), at a shoulder-to-wrist distance that gives the elbow bend, so the
 * swing turns the arm about the shoulder without changing the bend.
 * - `x` (m) out from the shoulder joint (hands by the thighs), `xMove` more out at a jog (clear of the swinging
 *   thighs, stairs and slopes included), `xCrouch` more out crouched (outside the knees), `xSprint` at the sprint.
 * - `z` (m) the wrist ahead of the shoulder at rest, `zCrouch` more ahead crouched, `zSprint` at the sprint (the
 *   pumping hands carried by the lower chest; A80: 1 cm with a 13 cm pump, at 8 / 16 cm the forward forearm went
 *   level at the chest and read as a reach).
 * - `flex`, `flexCrouch`, `flexSprint` (rad) the elbow bend standing (~18 deg), crouched (~52: anim-cleanup b46499f, the hands
 *   by the thighs just above the knees over the 35-45 deg crouch, forearms clear of the thighs) and pumping (~80).
 * - `swing` (m per m/s) the counter swing fore-aft, capped at `swingMax` (m); crouched `swingCrouch` of it.
 *   `backSwing` of it behind the rest (A81: the forward swing is the bigger one), arcing `xArc` (m per m) out as
 *   the hand goes back past the hip (clear of the forward thigh); not at the sprint.
 * - `xHolster` (m) the right hand further out over a gun holstered on the right thigh (A81: the holster's grip tips
 *   out with the thigh as it swings forward; the hand hangs outside it, as an operator's does over a drop-leg rig;
 *   the rig turns that elbow out too, HOLSTER_ELBOW_OUT, clear of the grip crouched).
 * - `pump` (m) the fore-aft drive at the sprint, `pumpLift` (m) the hands up for it, `pumpPhase` (cycles) its phase
 *   shift to the sprinting legs.
 * - `settle` (s) the swing's fade time constant (2 % in 0.2 s on a stop, D2), `lag` (s) the hands' ease behind
 *   the shoulders' follow.
 */
export const READY_HANDS = {
  x: 0.06,
  xMove: 0.03,
  xCrouch: 0,
  xSprint: 0.03,
  z: 0.05,
  zCrouch: 0,
  flex: 0.31,
  flexCrouch: 0.9,
  flexSprint: 1.5,
  swing: 0.06,
  swingMax: 0.15,
  swingCrouch: 0.6,
  backSwing: 0.7,
  xArc: 0.3,
  xHolster: 0.05,
  pump: 0.13,
  pumpLift: 0,
  zSprint: 0.01,
  // (G1) 0.35 -> 0: with the run's step cap and flight phase the pump keeps to the legs on the clip phase
  pumpPhase: 0,
  settle: 0.05,
  lag: 0.035,
};
/** Spine-to-chest joint length of the rig (m at 1.75 m; characterRig.ts `torso` node). */
const CHEST_SEG = 0.13;

export const READY_POSES = {
  // stock in the shoulder pocket, muzzle ~45 deg down and angled across the body, elbows bent and in
  // (anim-rework S3, BRIEF 3) muzzle ~40 deg down in front of the feet (pitch 0.8 -> 0.68), only a little inboard (yaw
  // -0.6 -> -0.22: it pointed 34 deg across the body), roll 0.2 -> 0.08
  low: { x: 0, y: -0.08, z: -0.02, pitch: 0.68, yaw: -0.22, roll: 0.08 },
  high: { x: -0.03, y: 0.07, z: -0.12, pitch: -1.0, yaw: -0.08, roll: 0 },
  // pulled in tight to the chest, muzzle forward and down (never swung across into a wall beside you)
  compressed: { x: -0.06, y: -0.08, z: -0.12, pitch: 0.6, yaw: -0.12, roll: 0.1 },
} as const;
/**
 * Back to a wall: tucked against the chest on the open side, muzzle down along the wall and angled away from it
 * (`yaw` is turned away from the wall side), so it never pokes into the wall; raised from here to aim.
 */
/**
 * (anim-rework S3, BRIEF 3 "Pistol low ready: both hands on the gun, close to the chest and pointed down and forward
 * (compressed ready), elbows in") The pistol's low ready replaces READY_POSES.low by its weight (the light gun): the
 * gun in toward the centre line and in close at the lower chest, muzzle ~40 deg down, straight ahead.
 */
export const PISTOL_READY = { x: -0.08, y: -0.05, z: -0.1, pitch: 0.7, yaw: -0.05, roll: 0 } as const;
export const WALL_READY = { x: 0.06, y: -0.24, z: 0.1, pitch: 1.05, yaw: 0.28, roll: 0 };
/**
 * The flat-back high stance (A6): the settled end of the old cover entry - hips over towards the wall, the spine
 * and head rolled into it (side-signed by the wall side), a little lower and bent (unsigned).
 */
/** (P1b) Back-to-wall arms: wrist x out from the shoulder joint (m), reach as a share of the arm length (hangs lower, straighter), z ahead (m). */
export const WALL_ARMS = { x: 0.03, reach: 0.985, z: 0.03 };
/** (step 11) Flat back on a wall: pelvis and spine pitch back (rad; crouched adds), eased in over `tau` (s). */
export const WALL_BACK = { pel: 0.05, pelCrouch: 0.1, spine: 0.08, spineCrouch: 0.2, tau: 0.1 };
/** (step 21w, M14 task 7) Wider feet on a wall (added to the stance width share): crouched the knees stay apart (the
 *  crouched wall crossed the shanks and thighs), standing a little wider for the sidestep shuffle. */
export const WALL_WIDTH = { stand: 0.12, crouch: 0.4 };
/** (21w, M16) `pelYStand`: standing on a wall the pelvis rides higher (the step 21 idle's soft knees put the knees
 *  ~19 cm out from the hips and the feet ahead of the back: a lean back on the wall); crouched `pelY` as before. */
/** (G6, AUDIT-WALLS row 3, 051917 @ 14.0-17.8) Standing on a wall CT sinks into a semi-crouch (knees 35-45 deg) and turns
 *  the chest 30-45 deg toward the travel while sliding (square only at rest and through the reversal): `pelYStand`
 *  0 -> -0.08 m (replaces 21w M16's higher pelvis), `spYawSlide` (rad, by the slide pace) the chest toward the travel. */
export const WALL_STANCE = { pelX: 0.05, spRoll: 0.09, pelRoll: 0.06, hdRoll: 0.05, pelY: -0.03, pelYStand: -0.08, pelPitch: 0.05, spPitch: 0.03, spYawSlide: 0.6 };
/**
 * (G6, AUDIT-WALLS rows 1 / 18, 051917 @ 29.0-34.0) The crouched side-on wall stance: the free crouch-walk carriage along
 * the travel (the flat-back stance eases out by the body's turn, `wallTurn`), the spine `spine` rad more forward than
 * the free crouch's lean (about 45 deg over the knees in all), the open-side hand on its knee (Michael 00:55 "holds knee
 * when up against wall"), in over `handIn` s from `handAt` s on the wall. `turnFrom` / `turnTo`: the side-on share from
 * the turn (|sin|) so the 0.45 s reversal passes through the square stance. At an edge the peek's lean goes forward
 * (`leanFwd` of the lateral lean, rad per rad) past the edge the body faces. Starting values.
 */
export const WALL_SIDE_POSE = { spine: 0.14, turnFrom: 0.35, turnTo: 0.85, handAt: 0.15, handIn: 0.3, leanFwd: 1.2, narrow: 0.35 };
/** (G6, AUDIT-WALLS row 9) The peek's hip shift onto the outer foot (m per rad of lean; was 0.17). */
export const PEEK_HIP = 0.7;
/** (G6, AUDIT-WALLS row 12, 051917 @ 10.9-12.3) Aiming at a wall 0.4-0.5 m away CT brings the rifle up near vertical,
 *  muzzle up and pulled in: from `far` m to `near` m from the shoulder the weapon pitches up `pitch` rad and comes
 *  `pull` m back, eased over about `time` s. The caller's ray: `wallBlockK`. Starting values. */
export const WALL_BLOCK = { far: 0.65, near: 0.45, pitch: 1.2, pull: 0.15, time: 0.12 };
/** (G6) The block amount 0..1 for the distance (m) to the first wall hit along the aim from the shoulder. */
export function wallBlockK(dist: number): number {
  return clamp((WALL_BLOCK.far - dist) / (WALL_BLOCK.far - WALL_BLOCK.near), 0, 1);
}
/** (step 09) Fade rate (1/s) of the swap overlay: in as a swap / draw / holster starts, out when it stops mid-clip. */
const SWAP_FADE = 8;
/** (step 09) Carriage ease (s) during a weapon-to-weapon swap: out before the reach to the slot (~0.2 s in). */
const CARRY_SWAP_TAU = 0.08;
/** (fix 21-2) Time constant (s) of the right hand's holster offset (READY_HANDS.xHolster) easing in / out. */
const HOLSTER_TAU = 0.06;
/** (step 09) Grip weight rate (1/s): the hands take / leave the grip and the foregrip in at least 0.2 s. */
const GRIP_RATE = 5;
/** Seconds the support hand takes to settle onto the wall. */
const WALL_HAND_TIME = 0.42;

const TRAVERSE_CLIP: Record<Exclude<TraverseKind, 'none'>, Clip> = { vault: VAULT, mantle: MANTLE, step: STEP_UP, drop: DROP, hop: VAULT, roll: ROLL, hang: HANG, climb: CLIMB, pipeClimb: PIPE_CLIMB, crawl: CRAWL, crawlOut: CRAWL_OUT, climbUp: CLIMB_UP, ventDrop: VENT_DROP, windowVault: WINDOW_VAULT, split: SPLIT_BRACE, wallKick: WALL_KICK, pipeLegs: PIPE_LEGS_UP, pipeInv: PIPE_INVERTED, rappel: RAPPEL_HANG, brace: BRACE };

/** Active-clip slots for the debug overlay timeline. */
export interface ClipSlot {
  name: string;
  w: number;
  t: number;
}

const SLOTS = 10;

export class AnimGraph {
  readonly weights: Record<LowerState, number> = { locomotion: 1, crouch: 0, kneel: 0, air: 0, slide: 0, wall: 0, traverse: 0 };
  state: LowerState = 'locomotion';
  /** Gait clock in use (driver's, or integrated from speed). */
  phase = 0;
  readonly out = emptyTargets();
  /** Final pose (after inertialization) and the pre-inertialization source. */
  readonly pose: Pose = newPose();
  private src: Pose = newPose();
  private stand: Pose = newPose();
  private crouch: Pose = newPose();
  readonly inert = new Inertializer();
  /** Debug timeline: active clips (name, weight, time). */
  readonly slots: ClipSlot[] = Array.from({ length: SLOTS }, () => ({ name: '', w: 0, t: 0 }));
  private nSlots = 0;
  // timers and smoothed parameters
  private idleT = Math.random() * 4;
  private stillT = 0;
  /** (fix 21-5) Breathing weight 0..1 (fades out over BREATH.fadeOut on a move). */
  private breathW = 0;
  /** Pace the locomotion blend uses this frame (the speed, or the held stop's pace). */
  private locoSpeed = 0;
  private kneelW = 0;
  /** (G1) Tense sneak weight 0..1 (eased with TENSE.tau). */
  private tenseW = 0;
  /** (G1 fix) The driver's measured gait clock rate (cycles/s; 0 without a driver). */
  private phRate = 0;
  /** (G1) Which knee the kneel puts down: 1 the right (left foot ahead, KNEEL), -1 the left (KNEEL_M); and the planner's
   *  lead foot this frame (left ahead of right in the body frame, m). */
  private kneelSide = 1;
  private lead = 0;
  /** (G1) The deep landing's share for the landing playing (by the fall). */
  private landK = 0;
  private startT = -1;
  private settleT = -1;
  private landT = -1;
  private wallT = 0;
  private prevMotion: MotionState | '' = '';
  private prevAction = '';
  private raiseS = 0;
  private dashS = 0;
  private reloadW = 0;
  /** Tucked in against the wall while reloading / swapping / throwing. */
  tuckW = 0;
  /** (step 11) Back-to-wall weight (eased in / out): the flat back replaces the carriage hunch. */
  private wallW = 0;
  /** Back-to-wall ready weight (eased ~0.25 s). */
  private wallReadyW = 0;
  /** (G6) The side-on crouched wall stance's share (eased) and the knee hand's weight. */
  private sideS = 0;
  private kneeW = 0;
  /** (G6) The eased weapon block at a wall (row 12). */
  private blockS = 0;

  /** How far the body / weapon is leaned out (signed, follows the lean target). */
  get leanOut(): number {
    return this.leanBody.x;
  }
  private leanHead = new Spring();
  private leanBody = new Spring();
  private wallS = 0;
  private dirX = 0;
  private dirZ = 1;
  private moveW = 0;
  private accelLean = new Spring();
  private intentLean = 0;
  private accelRoll = new Spring();
  private pelSpring = new Spring();
  private supportX = new Spring();
  private hit = new Spring();
  private hitSide = 0;
  private recoil = new Spring();
  /** (P1 posture) Weight of the Chaos Theory carriage lean (grounded, off walls and traversals), eased. */
  private carriageS = 1;
  /** (P1c) Armed-carriage hunch scale (eased): near upright when holstered. */
  private hunchS = 0.4;
  /** (P1 posture) The carriage lean (rad), rate-limited. */
  private leanS = 0;
  private support = 0;
  private pelBase = new Spring(-0.04);
  /** Support hand foregrip weight (eased: a draw / holster enters and leaves the swap clip mid-clip). */
  private offGripS = 1;
  /** Two-hand grip weight, eased on a draw / holster and a mid-clip swap entry. */
  private gripS = 1;
  /** Swap overlay weight and its last clip time (fades out when a holster stops it mid-clip). */
  private swapW = 0;
  private swapLastT = 0;
  /** Armed carriage weight (armed, or holstered with ready hands), eased ~0.25 s. */
  private carryW = 1;
  /** (G7) The close-quarters bend (rad), pelvis drop (m) and sway (m), eased. */
  private bendS = 0;
  private bendDropS = 0;
  private swayS = 0;
  /** Ready-hands weight (A42), eased ~0.25 s. */
  private readyW = 0;
  /** (G8) The keyed walk's eased weight. */
  private keyW = 0;
  /** (anim-rework S2) The keyed set's blended clip values (track half-width, duty, lift at the clip's own pace) and the
   *  walk's share of the gait (its slow-walk duty / lift shape), and two scratch poses for the blend. */
  private kHalf = KEYED_WALK.half;
  private kDuty = KEYED_WALK.duty;
  private kLift = KEYED_WALK.liftH;
  private kWalk = 1;
  private readonly kA = newKeyedPose();
  private readonly kB = newKeyedPose();
  /** (anim-rework S3) The drawn set's scratch poses (loco, idle) and its blended values. */
  private readonly kC = newKeyedPose();
  private readonly kD = newKeyedPose();
  private readonly kE = newKeyedPose();
  private dHalf = KEYED_READY_STANCE.half;
  private dKneeOut = 0;
  private dDuty = KEYED_READY_STANCE.duty;
  private dLift = KEYED_READY_STANCE.liftH;
  /** (anim-rework S3) The eased drawn share of the keyed weight, and the drawn still share (the ready stance's stagger). */
  private keyDS = 0;
  private readyStillS = 0;
  /** (anim-rework S2) The eased standing holstered weight (`RigTargets.keyHol`). */
  private keyHolS = 0;
  /** Grenade hands weight (eased), for the ready-hands follow (the melee arc keeps the follow: step 10). */
  private handClipW = 0;
  /** Ready-hands follow of the chest and pelvis (m, root space), eased by READY_HANDS.lag. */
  private readyFy = 0;
  private readyFz = 0;
  /** (step 21, M14) Relaxed arm counter swing amplitude (m), eased by READY_HANDS.settle. */
  private armSwingA = 0;
  /** (step 22, D5.1) The effort pace this frame (m/s in GAIT_REF units). */
  private effortS = 0;
  /** (fix 21-2) Eased share of READY_HANDS.xHolster: on with thigh gear on foot, out on a traverse / attach and a draw. */
  private holsterK = 0;
  private bobResidual = 0;

  constructor(private p: Proportions) {}

  setProportions(p: Proportions): void {
    this.p = p;
  }

  /** Additive hit reaction / flinch (side: -1 from the left .. 1 from the right). */
  hitReact(strength: number, side = 0): void {
    this.hit.kick(4.5 * clamp(strength, 0, 1));
    this.hitSide = side;
  }

  // (locomotion step 21, A10) no heel-strike pelvis kick: the weight of each footfall is the clip's own single loading
  // dip (a second spring dip on top made a double bounce, D2). `pelSpring` stays for the stop / landing settles (D5.3).

  /** (G1) The planner's lead: how far the left foot is ahead of the right in the body frame (m). The kneel keeps the
   *  foot that is ahead planted and puts the other knee down. */
  setLead(lead: number): void {
    this.lead = lead;
  }

  /** Support side from the planner (-1 left foot only, 1 right only, 0 both / none). */
  setSupport(side: number): void {
    this.support = side;
  }

  private slot(name: string, w: number, t: number): void {
    if (w <= 0.001 || this.nSlots >= SLOTS) return;
    const s = this.slots[this.nSlots++]!;
    s.name = name;
    s.w = w;
    s.t = t;
  }

  /** Cross-fade bookkeeping for the debug overlay (the pose itself is inertialized). */
  fade(target: LowerState, dt: number, fade = FADE): void {
    this.state = target;
    const step = fade > 0 ? dt / fade : 1;
    let sum = 0;
    const W = this.weights;
    for (let k = 0; k < LOWER_STATES.length; k++) {
      const s = LOWER_STATES[k]!;
      const w = W[s];
      const nw = s === target ? (w + step > 1 ? 1 : w + step) : w - step < 0 ? 0 : w - step;
      W[s] = nw;
      sum += nw;
    }
    const inv = 1 / (sum || 1);
    for (let k = 0; k < LOWER_STATES.length; k++) W[LOWER_STATES[k]!] *= inv;
  }

  /** Locomotion blend space (speed x direction) for one posture into `out`. */
  private locomotion(out: Pose, crouched: boolean, ph: number): void {
    out.set(NEUTRAL_POSE);
    // idle: a static ready stance; breathing and weight shifts after 2 s still
    const idle = crouched ? CROUCH_IDLE : IDLE;
    overClip(out, idle, 0, 1);
    overClip(out, idle, this.idleT, smoothstep((this.stillT - 2) / 1.5));
    // (G1) still near an unaware guard the tense carriage holds (its mid-stance pose)
    const tw = crouched ? this.tenseW : 0;
    if (tw > 0) overClip(out, TENSE_SNEAK, 0.25, tw);
    if (this.moveW <= 0) return;
    // direction weights from the smoothed local move direction
    const fw = Math.max(0, this.dirZ);
    const bw = Math.max(0, -this.dirZ);
    const sw = Math.abs(this.dirX);
    const tot = fw + bw + sw || 1;
    // (step 22, D5.1) posed at the effort pace: each gear keeps its gait at the slower M14 caps
    const s = effortSpeed(this.locoSpeed, crouched);
    this.moveAcc = 0;
    this.tmpMove.set(out);
    // forward: between the neighbouring speed nodes of the posture's set
    const nodes = crouched ? CROUCH_NODES : FORWARD_NODES;
    const a = fwdNode(nodes, s);
    const na = nodes[a]!;
    const nb = nodes[a + 1]!;
    const k = clamp((s - na.speed) / (nb.speed - na.speed), 0, 1);
    this.addMove(na.clip, (fw / tot) * (1 - k), ph);
    this.addMove(nb.clip, (fw / tot) * k, ph);
    // backwards and sideways only happen while aiming (strafe-locked)
    if (crouched) {
      this.addMove(CROUCH_BACK, bw / tot, ph);
      this.addMove(this.dirX > 0 ? CROUCH_STRAFE_R : CROUCH_STRAFE_L, sw / tot, ph);
    } else {
      this.addMove(WALK_BACK, bw / tot, ph);
      this.addMove(this.dirX > 0 ? WALK_STRAFE_R : WALK_STRAFE_L, sw / tot, ph);
    }
    // (G1, audit row 26) the tense sneak over the crouched gait
    if (tw > 0) overClip(this.tmpMove, TENSE_SNEAK, ph, tw);
    lerpPose(out, out, tuneMoveTwist(this.tmpMove), this.moveW);
  }

  private tmpMove: Pose = newPose();
  private moveAcc = 0;

  /** Sequential weighted blend into tmpMove (exact weighted average of the added clips). */
  private addMove(c: Clip, w: number, ph: number): void {
    if (w <= 0) return;
    this.moveAcc += w;
    overClip(this.tmpMove, c, ph, w / this.moveAcc);
  }

  update(dt: number, i: AnimInput): RigTargets {
    const p = this.p;
    const o = this.out;
    const k = p.height / 1.75;
    const mass = clamp(i.weight, 0.5, 1.6);
    this.nSlots = 0;
    let trigger = false;

    // --- lower state (inertialized on change)
    const target = pickLower(i);
    if (target !== this.state) trigger = true;
    this.fade(target, dt, target === 'slide' || target === 'traverse' ? 0.12 : target === 'kneel' ? KNEEL_FADE : FADE);

    // --- clocks and smoothed parameters
    const still = i.speed < 0.05;
    this.stillT = still ? this.stillT + dt : 0;
    this.idleT += dt;
    // (G1, audit row 26) the tense sneak: crouched at a sneak pace close to an unaware guard (the caller tests the guard)
    this.tenseW += ((i.tense && i.crouch > 0.5 && i.speed <= TENSE.maxSpeed && i.grounded && !i.wall && i.traverse === 'none' ? 1 : 0) - this.tenseW) * (1 - Math.exp(-dt / TENSE.tau));
    if (i.phase >= 0) {
      // (G1 fix, audit row 13) the driver's clock rate, measured (a start's clock runs ahead of the pace: MotionDriver START_CLOCK)
      const d = (((i.phase - this.phase) % 1) + 1) % 1;
      if (dt > 0 && d < 0.25) this.phRate += (d / dt - this.phRate) * (1 - Math.exp(-dt / 0.04));
      this.phase = i.phase;
    } else {
      this.phRate = 0;
      // (A1.2) no driver (remotes, enemies): the same clock from distance and turning
      if ((i.speed > 0.02 || Math.abs(i.yawRate) > TURN_GAIT_MIN) && i.grounded) this.phase = (this.phase + gaitRate(i.speed, i.yawRate, undefined, lateralShare(i), this.tenseW, clamp(i.crouch, 0, 1), backShare(i), this.glideK(i)) * dt) % 1;
    }
    const ph = this.phase;
    // (a Chaos Theory stop blends the frozen stride out to idle over `quickStop`: 95% within it)
    // (holding a Chaos Theory stop: the stride it stopped in stays, at the pace it stopped from)
    const locoSpeed = i.holdSpeed > 0 ? i.holdSpeed : i.speed;
    this.locoSpeed = locoSpeed;
    // (step 22, D5.1) the effort pace (GAIT_REF units), stance-blended, for the speed-scaled arm swing
    const ck = clamp(i.crouch, 0, 1);
    this.effortS = effortSpeed(i.speed, false) * (1 - ck) + effortSpeed(i.speed, true) * ck;
    // (G1, audit row 9) holding a stop the body comes up out of the stride over ~0.15 s (knees straighten, upright) while
    // the feet stay where they froze
    const holding = i.holdSpeed > 0 && i.speed < 0.05;
    const moveTarget = holding ? 0 : smoothstep(locoSpeed / 0.22);
    this.moveW = approach(this.moveW, moveTarget, holding ? 0.05 : i.quickStop > 0 && moveTarget < this.moveW ? i.quickStop / 3 : 0.08, dt);
    const dl = hyp2(i.localX, i.localZ);
    if (dl > 0.1 && i.speed > 0.05) {
      this.dirX = approach(this.dirX, i.localX / dl, 0.18, dt);
      this.dirZ = approach(this.dirZ, i.localZ / dl, 0.18, dt);
    }
    const dn = hyp2(this.dirX, this.dirZ) || 1;
    this.dirX /= dn;
    this.dirZ /= dn;
    this.raiseS = approach(this.raiseS, i.raise, 0.02, dt);
    this.dashS = approach(this.dashS, i.dash, 0.15, dt);
    this.wallS = approach(this.wallS, i.wallSide, 0.2, dt);
    const atWall = i.wall;
    this.wallT = atWall ? this.wallT + dt : 0;
    this.wallW = approach(this.wallW, atWall ? 1 : 0, WALL_BACK.tau, dt);
    const wallW = this.wallW;

    // --- locomotion blend space, standing and crouched, then the posture blend
    const crouchK = clamp(i.crouch, 0, 1);
    // (G6, AUDIT-WALLS row 1) the side-on crouched wall stance's share: from the body's turn off the wall (so the 0.45 s
    // reversal passes through the square stance) and the crouch; held as the wall eases out (no flat-back blip on a leave)
    const WS = WALL_SIDE_POSE;
    const sideT = smoothstep((i.wallTurn - WS.turnFrom) / (WS.turnTo - WS.turnFrom)) * smoothstep((crouchK - 0.35) / 0.5);
    this.sideS = atWall ? approach(this.sideS, sideT, 0.04, dt) : wallW > 0.01 ? this.sideS : 0;
    const sideK = this.sideS;
    /** The flat-back stance's weight (the side-on stance is the free crouch carriage on the travel axis). */
    const flatW = wallW * (1 - sideK);
    const src = this.src;
    if (crouchK < 0.999) this.locomotion(this.stand, false, ph);
    if (crouchK > 0.001) this.locomotion(this.crouch, true, ph);
    if (crouchK <= 0.001) src.set(this.stand);
    else if (crouchK >= 0.999) src.set(this.crouch);
    else lerpPose(src, this.stand, this.crouch, crouchK);
    this.slot(crouchK > 0.5 ? 'crouch loco' : 'loco', 1, ph);

    // --- kneel: one knee down when crouched and still (eased over kneelTime)
    // (step 11) never at a wall: the crouched flat-back stance is the wall's own pose (a kneel there moves a foot the
    // remote copy, posed from MoveState without the kneel timer, does not)
    // (P1c) the idle kneel was off (no kneel in the footage read then); (F3, playtest 2 "crouch idle should kneel down
    // like CT ... character looks like a gorilla") back on: one knee down, upright and compact (POSTURE.kneelLean)
    // (G1, audit row 4) kneeling from a standstill goes straight down into the kneel (no wide crouch squat on the way): it
    // starts with the crouch, not half way through it
    // (G6, AUDIT-WALLS row 1, 051917 @ 29.0: still side-on at a wall the trailing knee is near the floor) side-on the wall
    // kneels as the free crouch does (the flat-back stance still never kneels)
    const wantKneel = POSTURE.kneel && i.kneel && crouchK > 0.05 && (!i.wall || sideK > 0.6);
    // (G1 fix) rising out of the kneel over at least kneelTime: the kneel now comes on the stop, so standing straight up
    // from it is common, and the 1.2 rad toe flex let go in standTime stepped the ankle (e2e-anim pose continuity)
    const kStep = dt / (wantKneel ? MOVEMENT.kneelTime : Math.max(MOVEMENT.standTime, MOVEMENT.kneelTime));
    // (G1) a kneel starting: the foot that is ahead stays planted (a stop with the right foot ahead kneels on the left knee)
    // (G6 fix) side-on at a wall the wall-side knee goes down (CT 051917 @ 29.0: the trailing, inner knee near the floor,
    // the open-side knee up under the knee hand), from the wall side alone: the planner's lead differs between the owner
    // and the remote copy (their feet settle at different times), and a flipped kneel moved the knee hand 0.3 m
    // (e2e-netmove wall crouch). Turned toward the travel the wall is on the travel side (wallSide 1: the right).
    if (wantKneel && this.kneelW <= 0) this.kneelSide = i.wall ? (i.wallSide < 0 ? -1 : 1) : this.lead < -0.05 ? -1 : 1;
    this.kneelW = clamp(this.kneelW + (wantKneel ? kStep : -kStep), 0, 1);
    const kw = smoothstep(this.kneelW);
    overClip(src, this.kneelSide > 0 ? KNEEL : KNEEL_M, this.idleT, kw);
    this.slot('kneel', kw, this.idleT);

    // --- start / stop / pivot clips from the motion driver
    if (i.motion === 'start' && this.prevMotion !== 'start') this.startT = 0;
    if (i.motion !== this.prevMotion && (i.motion === 'idle' || i.motion === 'turn') && (this.prevMotion === 'stop' || this.prevMotion === 'pivot')) this.settleT = 0;
    if (i.motion === 'pivot' && this.prevMotion !== 'pivot') trigger = true;
    this.prevMotion = i.motion;
    if (this.startT >= 0) {
      addClip(src, START_SHIFT, this.startT, 1 - crouchK * 0.5);
      this.slot('start', 1, this.startT);
      this.startT += dt;
      if (this.startT > START_SHIFT.duration) this.startT = -1;
    }
    if (this.settleT >= 0) {
      addClip(src, STOP_SETTLE, this.settleT, 1);
      this.slot('settle', 1, this.settleT);
      this.settleT += dt;
      if (this.settleT > STOP_SETTLE.duration) this.settleT = -1;
    }
    if (i.motion === 'pivot') {
      const t = clamp(i.motionT / MOVEMENT.pivotTime, 0, 1);
      addClip(src, PIVOT, t, 1);
      this.slot('pivot', 1, t);
    }

    // --- back to a wall: the flat-back high stance (A6), shoulder to the wall
    // (21w, M16) weighted by the eased wall blend: leaving the wall the stance eases out with it (it dropped in one
    // frame: the leave's ~8 cm pelvis jump)
    if (wallW > 1e-4) {
      // (G6) the flat-back parts ease out as the body turns side-on (flatW)
      const ws = (this.wallS || 1) * flatW;
      const st = WALL_STANCE;
      src[CH.pelX] = src[CH.pelX]! + st.pelX * ws;
      src[CH.spRoll] = src[CH.spRoll]! + st.spRoll * ws;
      src[CH.pelRoll] = src[CH.pelRoll]! + st.pelRoll * ws;
      src[CH.hdRoll] = src[CH.hdRoll]! + st.hdRoll * ws;
      src[CH.pelY] = src[CH.pelY]! + (st.pelYStand + (st.pelY - st.pelYStand) * crouchK) * flatW;
      src[CH.pelPitch] = src[CH.pelPitch]! + st.pelPitch * flatW;
      src[CH.spPitch] = src[CH.spPitch]! + st.spPitch * flatW;
      // (G6, AUDIT-WALLS row 3) sliding standing the chest turns toward the travel (square at rest)
      src[CH.spYaw] = src[CH.spYaw]! + (this.wallS || 0) * st.spYawSlide * this.moveW * (1 - crouchK) * flatW;
      // (G6, row 1) side-on: bent well over the knees, deeper than the free crouch's lean
      src[CH.spPitch] = src[CH.spPitch]! + WALL_SIDE_POSE.spine * sideK * wallW;
      // reloading, swapping or throwing at the wall: tuck in closer to it, a little lower
      this.tuckW = approach(this.tuckW, atWall && (i.reload >= 0 || i.swap >= 0 || i.grenade >= 0) ? 1 : 0, 0.12, dt);
      src[CH.pelX] = src[CH.pelX]! + this.wallS * 0.035 * this.tuckW;
      src[CH.pelY] = src[CH.pelY]! - 0.03 * this.tuckW;
      src[CH.spPitch] = src[CH.spPitch]! + 0.06 * this.tuckW;
    } else this.tuckW = 0;
    if (wallW > 0) {
      // (step 11) shoulder blades back on the wall over the pelvis: the pelvis tips back a little and the chest
      // straightens (more crouched, where the crouch pose leans the trunk over the knees)
      src[CH.pelPitch] = src[CH.pelPitch]! - (WALL_BACK.pel + WALL_BACK.pelCrouch * crouchK) * flatW;
      src[CH.spPitch] = src[CH.spPitch]! - (WALL_BACK.spine + WALL_BACK.spineCrouch * crouchK) * flatW;
      src[CH.width] = src[CH.width]! + (WALL_WIDTH.stand + (WALL_WIDTH.crouch - WALL_WIDTH.stand) * crouchK) * flatW;
      // (G6 fix, check BLOCK 3) side-on the knees stay narrow: the free crouch's wide knees put the wall-side knee into
      // the face (side-on the stance width is across the wall)
      src[CH.width] = src[CH.width]! - WALL_SIDE_POSE.narrow * sideK * wallW;
    }

    // --- traversal, slide, air, landing
    if (i.traverse !== 'none') {
      // (ct-prototype D+E fix r1) a team climb-up (no ledge grips) keeps the old one-rise clip
      const tc = i.traverse === 'climbUp' && !i.ledgeClimb ? CLIMB_UP_TEAM : TRAVERSE_CLIP[i.traverse];
      // cycles (climb, crawl) wrap the cadence clock; committed moves clamp their progress
      overClip(src, tc, tc.loop ? i.traverseT - Math.floor(i.traverseT) : clamp(i.traverseT, 0, 1), 1);
      this.slot(i.traverse, 1, i.traverseT);
      // (3.2.0) a sidearm aimed one-handed from a split / hanging inverted: the weapon hand takes the grip
      if ((i.traverse === 'split' || i.traverse === 'pipeInv' || i.traverse === 'rappel') && i.raise > 0) src[CH.grip] = Math.min(1, i.raise * 1.5);
    }
    if (i.slide >= 0) {
      overClip(src, SLIDE, clamp(i.slide, 0, 1), 1);
      this.slot('slide', 1, i.slide);
    }
    if (!i.grounded) {
      src[CH.fLY] = src[CH.fLY]! + 0.14;
      src[CH.fRY] = src[CH.fRY]! + 0.1;
      src[CH.pelPitch] = src[CH.pelPitch]! + 0.1;
    }
    if (i.landing > 0.5 && this.landT < 0) {
      this.landT = 0;
      // (G1, audit row 18) a drop of about a metre and more (landing 0.82 at 1 m) lands deep, arms out
      // (not into a traversal: a landing roll's tumble with the deep dip put the body 12 cm into the floor, e2e-clip)
      this.landK = i.traverse === 'none' ? smoothstep((i.landing - 0.6) / 0.25) : 0;
    }
    if (this.landT >= 0) {
      const lk = this.landK;
      if (lk < 1) addClip(src, LAND, this.landT, 1 - lk);
      // (crouched already deep: the dip only takes it the rest of the way)
      // (a traversal taking over, the landing roll started on the next frame: the deep landing gives way to it)
      if (i.traverse !== 'none') this.landK = 0;
      if (lk > 0 && i.traverse === 'none') addClip(src, LAND_DEEP, this.landT, lk * (1 - 0.75 * crouchK));
      this.landT += dt;
      if (this.landT > (lk > 0 ? LAND_DEEP.duration : LAND.duration)) this.landT = -1;
    }
    // dash: low, driving rush (the dash cycle is in the blend space; this adds the wind-up crouch)
    src[CH.pelY] = src[CH.pelY]! - this.dashS * 0.04;

    // --- acceleration lean (into acceleration, back against braking); the chest stays steadier
    // anticipation: a first-order (not spring) response so it moves on the first frame
    // (G1, audit row 13) gain 0.1 -> 0.2: the start leans in on its first frame
    this.intentLean += (clamp(i.intent, -1, 1) * 0.2 - this.intentLean) * (1 - Math.exp(-dt / 0.05));
    // (step 22, D5.2, A88) M14 momentum holds an acceleration for ~0.3 s (it was a few frames): a softer gain and cap
    // (5 deg at a walk start or stop and above), on the critically damped spring; the capsule never overshoots
    // the back-to-wall entry and shuffle are a verb on the cover motion (no M14 momentum): they keep the 3.2.0 lean,
    // whose forward lean as the entry brakes holds the upper back off the wall (wall wallClip 2.5 -> 3.1 cm without)
    const lg = i.wall ? LEAN_WALL.gain : LEAN_GAIN;
    const lm = i.wall ? LEAN_WALL.max : LEAN_MAX;
    const lean = this.accelLean.step(clamp(i.accelFwd * lg, -lm, lm), 14, dt) + this.intentLean;
    // (a Chaos Theory sprint turns at 720 deg/s: its roll is held a little lower so the sprint's hunch and the turn
    // still bank within 8 deg)
    const rollMax = i.quickStop > 0 ? 0.08 - 0.03 * this.dashS : 0.08;
    // (G1, audit row 12) at a run the bank grows with the turn's lateral acceleration (speed x yaw rate: the same on a
    // remote copy, from its measured velocity and turn); below BANK.from the 3.2.0 small roll from the side acceleration
    const ay = i.speed * i.yawRate;
    const bankK = smoothstep((i.speed - BANK.from) / (BANK.to - BANK.from)) * (1 - crouchK) * (i.wall ? 0 : 1);
    const bankT = -Math.sign(ay) * Math.min(BANK.max, BANK.k * ay * ay) * bankK;
    const roll = this.accelRoll.step(clamp(-i.accelSide * 0.025, -rollMax, rollMax) * (1 - bankK) + bankT, 12, dt);
    src[CH.pelPitch] = src[CH.pelPitch]! + lean;
    src[CH.spPitch] = src[CH.spPitch]! - lean * 0.45;
    // (banking, BANK.pelvis of it in the pelvis and the rest in the spine so the chest leans the whole bank: the rig's chain
    // carries 0.6 of the pelvis roll up to the chest)
    const pelShare = 1 - bankK * (1 - BANK.pelvis);
    src[CH.pelRoll] = src[CH.pelRoll]! + roll * pelShare;
    src[CH.spRoll] = src[CH.spRoll]! + roll * bankK * (1 - 0.6 * pelShare);

    // ready hands (A42): holstered on foot, eased so a draw / holster never pops the arms or the carriage
    // a weapon-to-weapon swap (the outgoing and incoming slots differ; a draw / holster uses one slot) reaches
    // both slots from an upright chest: its empty-hands beat is not a holstered carry, so neither the ready hands
    // nor the carriage hold through it (the carriage eases out over the swap's first ~0.2 s and back after it)
    const weaponSwap = i.swap >= 0 && i.swapFrom !== i.swapTo;
    this.readyW = approach(this.readyW, !i.armed && i.ready && i.traverse === 'none' && !weaponSwap ? 1 : 0, 0.25, dt);
    // the carriage weight: armed or holstered with ready hands (eased, so it never pops as the weapon leaves the
    // hands at the end of a holster, or across a swap's empty-hands beat)
    const carryOn = !weaponSwap && (i.armed || (i.ready && i.traverse === 'none'));
    this.carryW = approach(this.carryW, carryOn ? 1 : 0, weaponSwap ? CARRY_SWAP_TAU : 0.25, dt);
    // (P1 posture; P1b) computed before the carriage hunch: the posture lean is the TOTAL torso pitch, so it replaces the
    // armed carriage hunch (spine 0.5 + crouch bend 0.34 stacked on it made a 70-90 deg quadruped crouch and a 43 deg run)
    this.carriageS = approach(this.carriageS, i.grounded && i.traverse === 'none' ? 1 - flatW : 0, 0.08, dt);
    const carriage = (1 - this.raiseS) * this.carriageS;
    const runK = smoothstep((i.speed - POSTURE.runFrom) / (POSTURE.runTo - POSTURE.runFrom)) * (1 - crouchK);
    // (rate-limited to POSTURE.rate: standing up out of the kneel snapped the crouch weight, a 0.23 rad spine pop)
    // (F3) kneeling the crouch's forward lean gives way to the kneel's upright back (the kneel clip's own weight)
    const kneelK = smoothstep(this.kneelW);
    // (G1) the crouch run's deeper back over the top crouched gear (effort 1.9 -> 2.5) and the tense sneak's
    const cRunK = smoothstep((effortSpeed(i.speed, true) - 1.9) / 0.6);
    const crouchLeanNow = POSTURE.crouchLean + (POSTURE.crouchRunLean - POSTURE.crouchLean) * cRunK + (POSTURE.tenseLean - POSTURE.crouchLean) * this.tenseW * (1 - cRunK);
    const leanT = (crouchK * crouchLeanNow * (1 - kneelK) + kneelK * POSTURE.kneelLean + runK * POSTURE.runLean) * carriage;
    this.leanS += clamp(leanT - this.leanS, -POSTURE.rate * dt, POSTURE.rate * dt);
    const postureW = Math.max(crouchK, runK) * carriage;
    // --- tactical carriage (armed, or holstered with ready hands): hunched over the weapon; more bent over moving
    // along a wall (the same carriage either way: holstering never changes pelvis or head motion, D2)
    const carryK = this.carryW;
    if (carryK > 0) {
      // (a reload opens the chest up a little so the support arm can reach the magazine well)
      // (step 11) with the back to a wall the back stays flat on it: the hunch eases out with the wall weight
      // (P1c) CT stands upright (spine 3-5 deg) when holstered; only a weapon in hand keeps a light forward carriage
      this.hunchS = approach(this.hunchS, i.armed ? POSTURE.hunchArmed : POSTURE.hunchHolstered, 0.25, dt);
      const hunch = (1 - this.dashS * 0.4) * (1 - this.reloadW) * carryK * (1 - flatW) * (1 - postureW) * this.hunchS;
      // crouched: bent well over the knees (half of it straightens into a raised weapon); not at a wall
      const crouchBend = HUNCH.crouch * crouchK * (1 - 0.5 * this.raiseS) * (1 - flatW) * carryK * (1 - postureW);
      src[CH.spPitch] = src[CH.spPitch]! + HUNCH.spine * hunch + (HUNCH.aim + HUNCH.aimOpen * (1 - wallW)) * this.raiseS + crouchBend;
      src[CH.pelPitch] = src[CH.pelPitch]! + HUNCH.pelvis * hunch;
      src[CH.hdPitch] = src[CH.hdPitch]! - HUNCH.head * hunch - crouchBend * 0.7;
      src[CH.pelY] = src[CH.pelY]! - HUNCH.drop * hunch * (1 - crouchK * 0.6);
    }

    // --- weapon actions (inertialized as they start and end). Not the swap (step 09): its overlay fades in and out
    // (SWAP_FADE), so it has no jump to absorb, and a draw / holster starts while the aim raise / lower is already
    // moving - a trigger there carries the output's velocity on top of the source's own and overshoots
    const action = i.reload >= 0 ? (i.reloadEmpty ? 'reloadE' : 'reloadT') : i.grenade >= 0 ? 'grenade' : i.handSwap >= 0 ? 'hands' : '';
    if (action !== this.prevAction) trigger = true;
    this.prevAction = action;

    // --- upper body: aim, lean (head first), checks
    const aimPitch = clamp(i.aimPitch, -1.2, 1.2);
    const raise = this.raiseS;
    // (locomotion step 21, D2) breathing only after BREATH.still s still (idle, crouch idle, kneel); none moving or aiming
    // (fix 21-5) it fades in with the stillness and out over ~0.2 s on the first move (no one-frame snap)
    const breathT = smoothstep((this.stillT - BREATH.still) / BREATH.fadeIn);
    this.breathW = breathT >= this.breathW ? breathT : approach(this.breathW, breathT, BREATH.fadeOut, dt);
    const breath = Math.sin(this.idleT * BREATH.rate) * BREATH.amp * this.breathW * (1 - raise);
    // head-first peek: the head leans out first, the body follows; coming back the body (and weapon)
    // return first and the head follows
    // the weapon changes to the outside hand before any lean starts
    const leanIn = i.handSwap >= 0 ? 0 : i.lean;
    const peekOut = Math.abs(leanIn) > 0.01;
    const headTarget = leanIn;
    // out: head ~60 ms ahead, weapon and body out by ~200 ms; back: body in ~180 ms, head just behind
    const hd = this.leanHead.step(headTarget, peekOut ? 34 : 18, dt);
    const bodyTarget = peekOut ? (Math.abs(hd) > Math.abs(leanIn) * 0.55 ? leanIn : 0) : 0;
    const bd = this.leanBody.step(bodyTarget, 24, dt);
    // (A1.2) no spine lag behind the turn: the chest keeps the facing, the pelvis follows the legs (rig, turnFollow)
    // (P1 posture, ct-measure-speeds-stops-posture.md s.4) Chaos Theory carriage: crouched the back leans ~38 deg forward
    // (footage 35-45), the run leans ~23 deg; lowered only (a raised weapon keeps its platform), off a wall or a traversal
    // (eased: a one-frame grounded flicker as the capsule stands up popped the spine 0.23 rad)
    const postureLean = this.leanS;
    // (G2, AUDIT-AIM row 4) raised: one rigid block tilting at the hips (AIM_CHEST): the pelvis takes its share, the spine
    // the rest of the whole aim pitch (the rig's chest = 0.4 pelvis + spine), the pelvis back a little for balance
    const hipAim = clamp(-aimPitch * AIM_CHEST.hips * raise, -AIM_CHEST.hipsMax, AIM_CHEST.hipsMax);
    src[CH.pelPitch] = src[CH.pelPitch]! + hipAim;
    src[CH.pelZ] = src[CH.pelZ]! - AIM_CHEST.hipsBack * Math.sin(hipAim);
    src[CH.spPitch] = src[CH.spPitch]! - aimPitch * (0.45 * 0.35 + raise * (AIM_CHEST.pitch - 0.45 * 0.35)) - 0.4 * hipAim + breath + this.dashS * 0.2 + crouchK * 0.08 + postureLean;
    // raised, the chest blades towards the shooting shoulder (mirrored with the hand holding the weapon)
    // (21w, PC-PASS 42) continuous through the open-side hand switch (the sign flipped the chest, head and sight roll
    // in one frame at the half-way point)
    const handS = clamp(i.hand, -1, 1);
    src[CH.spYaw] = src[CH.spYaw]! + clamp(i.aimYaw, -1.2, 1.2) * (0.6 + raise * AIM_CHEST.yaw) + raise * 0.2 * handS * (i.armed ? 1 : 0);
    // (G6, AUDIT-WALLS row 9) the peek: a small torso lean (WALL.peekLean) with the hips shifted onto the outer foot
    // (PEEK_HIP); side-on (crouched, facing the edge) the same lean goes forward past the edge
    const latK = 1 - sideK;
    src[CH.spRoll] = src[CH.spRoll]! - bd * 0.52 * latK;
    src[CH.pelX] = src[CH.pelX]! + bd * PEEK_HIP * k * latK;
    src[CH.spPitch] = src[CH.spPitch]! + Math.abs(bd) * 0.52 * WALL_SIDE_POSE.leanFwd * sideK;
    src[CH.pelZ] = src[CH.pelZ]! + Math.abs(bd) * PEEK_HIP * k * sideK;
    const check = i.check >= 0 ? Math.sin(i.check * Math.PI * 2) * 0.65 * Math.sin(Math.PI * i.check) : 0;
    src[CH.hdPitch] = src[CH.hdPitch]! - aimPitch * 0.45;
    src[CH.hdYaw] = src[CH.hdYaw]! + clamp(i.aimYaw, -1.2, 1.2) * 0.4 - raise * 0.18 * handS + check + hd * 0.12;
    src[CH.hdRoll] = src[CH.hdRoll]! + hd * 0.22;
    if (Math.abs(i.lean) > 0.01 || Math.abs(hd) > 0.01) this.slot('lean', Math.abs(hd), bd);
    if (i.check >= 0) this.slot('check', 1, i.check);

    // --- weapon layer: ready positions blended by weight, raised by `raise`; edge prep tucks it in
    const swapBump = i.handSwap >= 0 ? Math.sin(Math.PI * clamp(i.handSwap, 0, 1)) : 0;
    let cl = i.carryLow;
    let chh = i.carryHigh;
    let cc = i.carryComp;
    if (swapBump > 0) {
      cl *= 1 - swapBump;
      chh *= 1 - swapBump;
      cc = cc * (1 - swapBump) + swapBump;
    }
    // at an edge peek the weapon comes up only as the body leans out past the edge (never raised into it)
    const leanK = peekOut ? smoothstep(Math.abs(bd) / Math.max(0.05, Math.abs(leanIn)) / 0.8) : 1;
    const raiseW = raise * leanK;
    const ready = 1 - raiseW * (1 - swapBump);
    // (anim-rework S3) the pistol's low ready is its compressed ready (PISTOL_READY), by the light gun's weight
    const pistolW = clamp((0.85 - mass) / 0.15, 0, 1);
    const rl = pistolW > 0 ? this.pistolLow(pistolW) : READY_POSES.low;
    const rh = READY_POSES.high;
    const rc = READY_POSES.compressed;
    // (locomotion step 21, D2) no free-running weapon sway: the only idle weapon motion is what the chest breathing carries
    const rec = this.recoil.step(i.kick, 26 / Math.sqrt(mass), dt);
    // raised: up to the eye
    const sight = raiseW;
    // (playtest 2) the sight raise position is carried down with the hand swap: at the mid-point the weapon is on the
    // compressed carry (ready = 1), and the full raise on top of it flicked the gun up high
    const sightPos = sight * (1 - 0.5 * swapBump);
    // at a wall the ready is the wall tuck: muzzle down along the wall, turned away from it (the rig mirrors
    // yaw with the hand, so the away side is relative to the hand holding it)
    this.wallReadyW = approach(this.wallReadyW, atWall ? 1 : 0, 0.25, dt);
    const cw = this.wallReadyW;
    const nw = 1 - this.wallReadyW;
    const awayYaw = (this.wallS === 0 ? 1 : -Math.sign(this.wallS)) * (i.hand < 0 ? -1 : 1);
    const cr = WALL_READY;
    // stepping to the wall the open-ground carry comes in tight to the chest (compressed) until the tuck takes
    // over, so a low-ready muzzle never reaches into the wall on the way in
    const enterK = atWall ? 1 - smoothstep(this.wallT / WALL_HAND_TIME) : 0;
    cc += (cl + chh) * enterK;
    cl *= 1 - enterK;
    chh *= 1 - enterK;
    cl *= nw;
    chh *= nw;
    cc *= nw;
    src[CH.wpX] = ready * (rl.x * cl + rh.x * chh + rc.x * cc + cr.x * cw) + sightPos * SIGHT_RAISE.x;
    src[CH.wpY] = ready * (rl.y * cl + rh.y * chh + rc.y * cc + cr.y * cw) + sightPos * SIGHT_RAISE.y;
    src[CH.wpZ] = ready * (rl.z * cl + rh.z * chh + rc.z * cc + cr.z * cw) - (rec * RECOIL.back) / Math.sqrt(mass) + sightPos * SIGHT_RAISE.z;
    const pistolK = pistolW * sightPos;
    if (pistolK > 0) {
      src[CH.wpX] = src[CH.wpX]! + pistolK * PISTOL_REACH.x;
      src[CH.wpY] = src[CH.wpY]! + pistolK * PISTOL_REACH.y;
      src[CH.wpZ] = src[CH.wpZ]! + pistolK * PISTOL_REACH.z;
      // (G2, AUDIT-AIM row 5) the chest forward over the raised pistol (it leaned back with the hips forward)
      src[CH.spPitch] = src[CH.spPitch]! + pistolK * PISTOL_REACH.lean;
    }
    // (G2) the head rolls onto a stock only: a pistol has none. (G2 fix) Except leaning out at a wall-edge peek: the head
    // rolls out past the edge over the raised pistol as it did before G2 (head first, the chest behind the edge: G36 / A3,
    // e2e-stealth-ai wall peek), eased in with the head's lean
    const peekHeadK = smoothstep(Math.abs(hd) / SIGHT_HEAD.peekFull);
    src[CH.hdRoll] = src[CH.hdRoll]! + sight * SIGHT_HEAD.roll * handS * (1 - pistolW * (1 - peekHeadK));
    // (G6, row 12) blocked by a wall in front: no weld (the rifle is up off the eye)
    this.blockS += clamp(i.wallBlock * raise - this.blockS, -dt / WALL_BLOCK.time, dt / WALL_BLOCK.time);
    this.out.weld = sightPos * (1 - this.blockS);
    this.out.sightDrop = -PISTOL_REACH.y * pistolW;
    // (G2 fix) and the neck dips onto the raised pistol at the peek (the head out past the edge with the gun, as before G2)
    this.out.stockWeld = 1 - pistolW * (1 - peekHeadK);
    this.out.aimW = raiseW;
    // landing roll: the whole body turns over forward about the hips
    this.out.tumble = i.traverse === 'roll' ? rollTumble(i.traverseT) : i.tumble;
    // leaning out at an edge the tucked muzzle comes up towards level (the lean would roll it onto the leg)
    const crPitch = cr.pitch * (1 - 0.6 * Math.min(1, Math.abs(bd)));
    src[CH.wpPitch] = ready * (rl.pitch * cl + rh.pitch * chh + rc.pitch * cc + crPitch * cw) - (rec * RECOIL.flip) / mass;
    src[CH.wpYaw] = ready * (rl.yaw * cl + rh.yaw * chh + rc.yaw * cc + cr.yaw * cw * awayYaw) + check * 0.6 * ready;
    src[CH.wpRoll] = ready * (rl.roll * cl + rh.roll * chh + rc.roll * cc + cr.roll * cw);
    if (this.blockS > 0) {
      // (G6, row 12) the muzzle up (pitch + is muzzle down) and the weapon pulled back toward the chest
      src[CH.wpPitch] = src[CH.wpPitch]! - WALL_BLOCK.pitch * this.blockS;
      src[CH.wpZ] = src[CH.wpZ]! - WALL_BLOCK.pull * this.blockS;
      src[CH.wpY] = src[CH.wpY]! - 0.05 * this.blockS;
    }
    // bent over in a crouch the lowered muzzle comes up with the chest and the gun sits further out, clear of
    // the thighs (the lowered weapon is oriented with the body, not the spine)
    // (the open-ground carries only: the wall tuck has its own pose)
    const bendK = HUNCH.crouch * crouchK * (1 - 0.5 * this.raiseS) * ready * nw;
    src[CH.wpPitch] = src[CH.wpPitch]! - bendK * 1.1;
    src[CH.wpZ] = src[CH.wpZ]! + bendK * 0.08;
    src[CH.wpY] = src[CH.wpY]! + bendK * 0.06;
    // recoil absorbed through the shoulder and spine
    src[CH.spPitch] = src[CH.spPitch]! - (rec * RECOIL.spine) / mass;
    src[CH.pelPitch] = src[CH.pelPitch]! - (rec * RECOIL.pelvis) / mass;
    // grip and off hand defaults (at a wall: off hand to the wall when settled and lowered)
    src[CH.grip] = i.armed ? 1 : 0;
    // (P1b, ct-measure-walls-doors-combat-vision.md s.1) back to the wall the arms HANG at the sides, hands mid-thigh and
    // off the wall (the support hand reached back to a wall point at hip height, elbow out: hand on hip). The support hand
    // lets go of the foregrip while still and lowered (settles over the first ~0.4 s); moving along the wall takes it
    // back to the weapon. No wall-hand contact (offWall stays 0; the rig's wallHand point is unused).
    const wallHang = atWall ? ready * (1 - this.moveW) * smoothstep((this.wallT - 0.18) / 0.24) : 0;
    // (G6, AUDIT-WALLS row 18, 051917 @ 29.07-30.23) side-on and crouched, the empty hands: the open-side hand on its knee
    // through the slide too (the rig puts it on the posed knee); swapped over the reversal by the side (wallS) and the
    // turn (the side-on share passes through 0 at square-on). Not with a weapon in the hands (it stays on the weapon).
    const kneeT = atWall && !i.armed ? sideK * (1 - raise) * smoothstep((this.wallT - WALL_SIDE_POSE.handAt) / WALL_SIDE_POSE.handIn) : 0;
    // (side-on toward the travel the wall is on the travel side: the open-side hand is the other one; signed and eased
    // through 0, so on a reversal one hand lets go as the other takes its knee)
    this.kneeW = approach(this.kneeW, (i.wallSide < 0 ? 1 : -1) * kneeT, 0.06, dt);
    this.out.kneeHand = Math.abs(this.kneeW) < 1e-3 ? 0 : this.kneeW;
    src[CH.offGrip] = 1 - wallHang;
    src[CH.offMag] = 0;
    src[CH.offWall] = 0;
    // free hands hang at the sides (swing a little with the gait when unarmed)
    // (step 22, D5.1) the swing grows with the effort: 7.5 cm at a walk, 11 at a jog, 15 at the sprint (was 10 always)
    const swing = Math.min(0.15, 0.04 + 0.025 * this.effortS) * this.moveW * Math.sin(ph * Math.PI * 2);
    const shY = p.y.shoulder - 0.04 * k;
    const armLen = p.upperArm.len + p.forearm.len;
    src[CH.hLX] = -p.shoulderHalf - 0.06;
    src[CH.hLY] = shY - armLen * 0.92;
    src[CH.hLZ] = 0.05 + swing * 0.3;
    src[CH.hRX] = p.shoulderHalf + 0.06;
    src[CH.hRY] = shY - armLen * 0.92;
    src[CH.hRZ] = 0.05 - swing * 0.3;
    // holstered hands (D5.6, M14): relaxed at the sides, a natural counter swing with the gait (the right arm forward at
    // the left heel strike, phase 0); pumping at the sprint (A76)
    const rw = this.readyW;
    const RH = READY_HANDS;
    const dash = this.dashS;
    // (G1, audit rows 8 / 22 / 23) the run pumps its arms too (elbows ~86 deg, a bigger fore-aft drive): Chaos Theory has no
    // sprint button, its jog and run are the top gears, eased in with the run lean (runK)
    const pk = Math.max(dash, runK);
    const swingT = (Math.min(RH.swingMax, RH.swing * this.effortS) * (1 - (1 - RH.swingCrouch) * crouchK) * (1 - pk) + RH.pump * pk) * smoothstep(i.speed / 0.22) * TUNE_CUR.armSwingK;
    this.armSwingA = approach(this.armSwingA, swingT, RH.settle, dt);
    this.holsterK = approach(this.holsterK, i.thighGear && i.traverse === 'none' ? 1 : 0, HOLSTER_TAU, dt);
    if (rw > 0) {
      // body-relative here; the follow of the leaning chest and the pelvis is added after inertialization (below)
      // (pose units: the output is scaled by k in writeTargets)
      const u = p.upperArm.len / k;
      const fl = p.forearm.len / k;
      const flex = (RH.flex + (RH.flexCrouch - RH.flex) * crouchK) * (1 - pk) + RH.flexSprint * pk;
      const d2 = u * u + fl * fl + 2 * u * fl * Math.cos(flex);
      const dx = RH.x + RH.xMove * smoothstep(i.speed / 3) + RH.xCrouch * crouchK + RH.xSprint * pk;
      const z0 = RH.z + RH.zCrouch * crouchK + RH.zSprint * pk;
      // (the sprint stride runs ~0.35 of a cycle ahead of the clip phase at the feet: the pump keeps to the legs)
      const sw = this.armSwingA * Math.cos((ph + RH.pumpPhase * dash) * Math.PI * 2);
      // (fix 21-1) on foot the hand swings back less than forward and arcs out past the hip as it goes back, clear of
      // the forward-swinging thigh and its holster (the sprint pump keeps its own symmetric drive)
      const backK = 1 - (1 - RH.backSwing) * (1 - pk);
      const arc = RH.xArc * (1 - pk);
      const bR = sw < 0 ? -sw * backK : 0;
      const bL = sw > 0 ? sw * backK : 0;
      const zR = sw < 0 ? z0 - bR : z0 + sw;
      const zL = sw > 0 ? z0 - bL : z0 - sw;
      const dxR = dx + arc * bR + RH.xHolster * this.holsterK * (1 - pk);
      const dxL = dx + arc * bL;
      // (from the rig's rest shoulder joint, p.y.shoulder: `shY` above sits 4 cm lower for the hanging default)
      const lift = p.y.shoulder / k + RH.pumpLift * pk;
      const yR = lift - Math.sqrt(Math.max(0.01, d2 - dxR * dxR - zR * zR));
      const yL = lift - Math.sqrt(Math.max(0.01, d2 - dxL * dxL - zL * zL));
      const sh = p.shoulderHalf / k;
      const rx = sh + dxR;
      const lx = sh + dxL;
      src[CH.hLX] = src[CH.hLX]! + (-lx - src[CH.hLX]!) * rw;
      src[CH.hLY] = src[CH.hLY]! + (yL - src[CH.hLY]!) * rw;
      src[CH.hLZ] = src[CH.hLZ]! + (zL - src[CH.hLZ]!) * rw;
      src[CH.hRX] = src[CH.hRX]! + (rx - src[CH.hRX]!) * rw;
      src[CH.hRY] = src[CH.hRY]! + (yR - src[CH.hRY]!) * rw;
      src[CH.hRZ] = src[CH.hRZ]! + (zR - src[CH.hRZ]!) * rw;
    }
    // (P1b) back to the wall: both free arms hang straight down at the sides (hands low, elbows tucked, about 10-20 deg
    // bend), not out on the hips: the default hang's 0.92 arm length bowed the elbow out and the ready hands carry
    // an arm swing; the wrist target is the footage hang (hands mid-thigh as far as the rig's arm length reaches)
    if (wallHang > 0) {
      const wx = p.shoulderHalf + WALL_ARMS.x;
      // (G6) the hang follows the wall stance's pelvis drop (the semi-crouch, row 3: the hands hang from the lowered shoulders)
      const wy = shY - armLen * WALL_ARMS.reach + (WALL_STANCE.pelYStand + (WALL_STANCE.pelY - WALL_STANCE.pelYStand) * crouchK) * flatW;
      src[CH.hLX] = src[CH.hLX]! + (-wx - src[CH.hLX]!) * wallHang;
      src[CH.hLY] = src[CH.hLY]! + (wy - src[CH.hLY]!) * wallHang;
      src[CH.hLZ] = src[CH.hLZ]! + (WALL_ARMS.z - src[CH.hLZ]!) * wallHang;
      src[CH.hRX] = src[CH.hRX]! + (wx - src[CH.hRX]!) * wallHang;
      src[CH.hRY] = src[CH.hRY]! + (wy - src[CH.hRY]!) * wallHang;
      src[CH.hRZ] = src[CH.hRZ]! + (WALL_ARMS.z - src[CH.hRZ]!) * wallHang;
    }
    // reload / swap / grenade clips over the weapon layer
    this.reloadW = approach(this.reloadW, i.reload >= 0 ? 1 : 0, 0.08 * mass, dt);
    if (i.reload >= 0 || this.reloadW > 0.01) {
      const rt = i.reload >= 0 ? i.reload : 1;
      overClip(src, reloadClipFor(mass, i.reloadEmpty), rt, this.reloadW);
      this.slot(i.reloadEmpty ? 'reload empty' : 'reload', this.reloadW, rt);
      // held a little further out while reloading: the support arm reaches the magazine with the elbow clear of
      // the chest (compact guns hunched at a wall would fold it in)
      src[CH.wpZ] = src[CH.wpZ]! + 0.07 * this.reloadW;
      // crouched / curled over, the reach to the pouch goes out to the side so the elbow clears the chest
      src[CH.hLX] = src[CH.hLX]! - 0.09 * this.reloadW * crouchK;
      src[CH.hLZ] = src[CH.hLZ]! + 0.05 * this.reloadW * crouchK;
    }
    // attached (hang, climb, crawl) the body belongs to the anchor pose and the hands to the grips: a weapon
    // stowed for it goes to its slot without the swap's reach
    const attachedPose = i.traverse === 'hang' || i.traverse === 'climb' || i.traverse === 'pipeClimb' || i.traverse === 'crawl' || i.traverse === 'crawlOut' || i.traverse === 'climbUp' || i.traverse === 'ventDrop' || i.traverse === 'split' || i.traverse === 'wallKick' || i.traverse === 'pipeLegs' || i.traverse === 'pipeInv' || i.traverse === 'rappel' || i.traverse === 'brace';
    // (step 09) the swap clip overrides the chest and head pitch, so entering it from the carriage (hunched over a
    // raised weapon, or the holstered ready carry) would snap the spine by up to ~0.6 rad in one frame - more than
    // the inertializer hides. The overlay fades in over ~0.125 s (a holster from aim, a draw entering at the
    // holstered beat, a swap), and a holster that settles in the slot before the clip's end (the overlay stops
    // mid-clip) fades out from its last time at the same rate instead of cutting
    const swapOn = i.swap >= 0 && !attachedPose;
    if (swapOn) {
      this.swapW = Math.min(1, this.swapW + SWAP_FADE * dt);
      this.swapLastT = i.swap;
    } else this.swapW = Math.max(0, this.swapW - SWAP_FADE * dt);
    if (this.swapW > 0) {
      const st = swapOn ? i.swap : this.swapLastT;
      overClip(src, swapClipFor(i.swapFrom, i.swapTo), st, this.swapW);
      this.slot('swap', this.swapW, st);
    }
    // (step 09) a draw / holster puts the weapon into / out of the hands, and a draw enters the swap clip at its
    // holstered beat, mid-clip (and a holster leaves it mid-clip): the grip weights move onto their targets at a
    // limited rate (GRIP_RATE: a full change in 0.2 s) instead of jumping
    const gStep = GRIP_RATE * dt;
    // (ct-prototype D1) a draw / holster travel carries the gun in the trigger hand: the grip channel heads for 1 the
    // whole way (still rate-limited, so the channel stays continuous); the rig holds the hand on the grip at once
    // (CharacterRig.travelHold: the rate-limited weight lagged the 0.145 s pistol travel, the gun floated ahead)
    this.gripS += clamp((i.weaponTravel ? 1 : src[CH.grip]!) - this.gripS, -gStep, gStep);
    src[CH.grip] = this.gripS;
    this.offGripS += clamp(src[CH.offGrip]! - this.offGripS, -gStep, gStep);
    src[CH.offGrip] = this.offGripS;
    if (i.grenade >= 0) {
      overClip(src, GRENADE, i.grenade, 1);
      this.slot('grenade', 1, i.grenade);
    }
    if (i.melee >= 0) {
      // (locomotion step 10) the elbow arc with the hip turn (the strike and the lethal takedown blow): the wind-up
      // draws the right hand back with the chest and hips turning right (0 - 0.17), the strike drives the elbow
      // across the chest at shoulder height with the hips leading the turn left to contact (0.56), the recovery eases
      // back to the hands' own pose (1). Weighted from the clip's hands, so it starts and ends without a jump; the
      // turn is spread over pelvis, spine and head (5.12.2 joint rates: about 3 deg per frame at its fastest).
      const ph = clamp(i.melee, 0, 1);
      const wStrike = smoothstep((ph - 0.1) / 0.456) * (1 - smoothstep((ph - 0.62) / 0.38));
      const wWind = smoothstep(ph / 0.167) * (1 - smoothstep((ph - 0.167) / 0.333)) * (1 - wStrike);
      // the right hand sweeps round the shoulder (never folding the elbow shut, never through the chest): reaching
      // forward and out to the side on the wind-up, across the front to the midline at contact (the forearm level, the
      // elbow out to the side: the rig lifts its pole by `meleePoleW`), half way back as it blends out. The chest sits
      // ~0.2 m ahead of the root in the hands' frame; the reach forward fades last (in first) so the hand stays clear
      const u = meleeSweep(ph);
      const wHand = meleeHandW(ph);
      const wFwd = Math.min(1, wHand * 1.6);
      const phi = 0.5 + 1.68 * u;
      const r = 0.24 + 0.08 * u;
      // (targets in the frame after the ready-hands follow, which is added below: less the follow, last frame's)
      const fwM = this.readyW * (1 - this.reloadW) * (1 - this.swapW) * (1 - this.handClipW);
      const fy = this.readyFy * fwM;
      const fz = this.readyFz * fwM;
      src[CH.hRX] = src[CH.hRX]! * (1 - wHand) + (p.shoulderHalf + r * Math.cos(phi)) * wHand;
      src[CH.hRY] = src[CH.hRY]! * (1 - wHand) + (shY - 0.22 + 0.12 * u - fy) * wHand;
      src[CH.hRZ] = src[CH.hRZ]! * (1 - wFwd) + (0.2 + r * Math.sin(phi) - fz) * wFwd;
      // the left hand comes up as a guard (forward first, down last)
      src[CH.hLY] = src[CH.hLY]! + 0.15 * wHand;
      src[CH.hLZ] = src[CH.hLZ]! + 0.3 * wFwd;
      const turn = 0.22 * wWind - 0.4 * wStrike;
      src[CH.pelYaw] = src[CH.pelYaw]! + turn * 0.4;
      src[CH.spYaw] = src[CH.spYaw]! + turn * 0.6;
      src[CH.hdYaw] = src[CH.hdYaw]! - turn * 0.5;
      src[CH.pelY] = src[CH.pelY]! - 0.015 * wStrike;
    }

    // --- (G7, AUDIT-WALLS rows 6-8, 19, 20) close quarters: bent over a held guard / a body, the pelvis down under the
    // weight (the feet stay planted: the knees take it), the hold's sway in the pelvis; the head keeps the eyes level
    // with 0.6 of the bend. Eased (tau 0.12 s), so the knockout's bend and the lift's rise read as one motion
    this.bendS = settle(approach(this.bendS, i.bend, 0.12, dt), i.bend);
    this.bendDropS = settle(approach(this.bendDropS, i.bendDrop, 0.12, dt), i.bendDrop);
    this.swayS = settle(approach(this.swayS, i.sway, 0.08, dt), i.sway);
    if (this.bendS !== 0 || this.bendDropS !== 0 || this.swayS !== 0) {
      src[CH.spPitch] = src[CH.spPitch]! + this.bendS * 0.7;
      src[CH.pelPitch] = src[CH.pelPitch]! + this.bendS * 0.3;
      src[CH.hdPitch] = src[CH.hdPitch]! - this.bendS * 0.6;
      src[CH.pelY] = src[CH.pelY]! - this.bendDropS;
      src[CH.pelX] = src[CH.pelX]! + this.swayS;
    }

    // --- additive: hit flinch, heel-strike compression, weight over the support foot
    const hx = this.hit.step(0, 9, dt);
    src[CH.spPitch] = src[CH.spPitch]! - hx * 0.12;
    src[CH.spRoll] = src[CH.spRoll]! + hx * 0.1 * this.hitSide;
    src[CH.hdPitch] = src[CH.hdPitch]! - hx * 0.08;
    const comp = this.pelSpring.step(0, 15, dt);
    src[CH.pelY] = src[CH.pelY]! + comp;
    const sup = this.supportX.step(this.moveW > 0.3 ? 0 : this.support * 0.012, 10, dt);
    src[CH.pelX] = src[CH.pelX]! + sup;

    // --- stabilisation: some of the gait bob is taken out of the weapon (the head is world-stabilised); (step 21, D2) the
    // base follows at WEAPON_SETTLE_OMEGA, so after a stop the weapon is back on the chest in 0.2 s with no wobble
    const bob = src[CH.pelY]! - this.pelBase.step(src[CH.pelY]!, WEAPON_SETTLE_OMEGA, dt);
    src[CH.wpY] = src[CH.wpY]! - bob * 0.8;
    this.bobResidual = bob * 0.2;

    // --- inertialize discrete switches, then output
    if (trigger) this.inert.trigger(src, dt);
    const pose = this.inert.apply(src, this.pose, dt);
    // ready hands (A42) follow the shoulders as the chest leans (pelvis + spine pitch) and the pelvis moves, taken
    // from the inertialized body: the follow is as continuous as the body, and the hands are never inertialized
    // while they move with it (a stance or state switch mid-crouch would carry their velocity on top of the
    // body's own and overshoot). Weighted by the share of the ready hands the clips above left in place.
    this.handClipW = approach(this.handClipW, i.grenade >= 0 ? 1 : 0, 0.05, dt);
    const fw = this.readyW * (1 - this.reloadW) * (1 - this.swapW) * (1 - this.handClipW);
    // (the hands hang a touch behind the shoulders, READY_HANDS.lag: a fast crouch folds the chest and drops the
    // pelvis together, and the hands ease through it instead of taking the sum of both at full speed)
    // (locomotion step 21, PC1) the shoulders' drop and reach as the rig bends the chain (characterRig applyTargets: the
    // pelvis pitch, then the spine and chest share the spine pitch and take back 0.6 of the pelvis pitch), so the hands
    // keep the same place below the shoulders standing and crouched (the old single-pivot model counted ~0.1 m too much
    // drop crouched: the arms hung straight to the knees)
    const pp = pose[CH.pelPitch]!;
    const sp = pose[CH.spPitch]!;
    const a2 = 0.4 * pp + 0.45 * sp;
    const a3 = 0.4 * pp + sp;
    const h1 = (p.y.waist - p.y.hip) / k;
    const h3 = (p.y.shoulder - p.y.waist) / k - CHEST_SEG;
    const drop = h1 * (1 - Math.cos(pp)) + CHEST_SEG * (1 - Math.cos(a2)) + h3 * (1 - Math.cos(a3));
    const reach = h1 * Math.sin(pp) + CHEST_SEG * Math.sin(a2) + h3 * Math.sin(a3);
    this.readyFy = approach(this.readyFy, pose[CH.pelY]! - drop, READY_HANDS.lag, dt);
    this.readyFz = approach(this.readyFz, pose[CH.pelZ]! + reach, READY_HANDS.lag, dt);
    if (fw > 0.0001) {
      const fy = this.readyFy * fw;
      const fz = this.readyFz * fw;
      pose[CH.hLY] = pose[CH.hLY]! + fy;
      pose[CH.hRY] = pose[CH.hRY]! + fy;
      pose[CH.hLZ] = pose[CH.hLZ]! + fz;
      pose[CH.hRZ] = pose[CH.hRZ]! + fz;
    }
    // (G1) free-hand poses over the ready hands, in root space after the follow (pose units at 1.75 m)
    if (fw > 0.0001) this.freeHands(pose, fw, k, ph);
    // (CT prototype G8) the keyed walk: standing, moving at walk pace, on foot (no wall, traversal, air, slide), not
    // raised to aim or dashing; its arms only with free hands (holstered, no reload / swap / throw, no melee)
    {
      const es = effortSpeed(locoSpeed, false);
      const B = KEYED_WALK_BAND;
      const band = 1 - smoothstep((es - B.from) / (B.to - B.from));
      const onFoot = i.keyedOk && i.grounded && i.traverse === 'none' && i.slide < 0 && !i.wall ? 1 : 0;
      // (not turning on the spot: the turn's own stepping, last frame's turning share; a walking turn keeps it: its low
      // pelvis let go mid-turn lifted the head 8 cm, g1Locomotion)
      const spin = o.gait.turning * (1 - smoothstep((i.speed - 0.3) / 0.4));
      // (anim-rework S2) holstered (free hands, `fw`) the keyed set covers every standing pace (walk, jog, run as one
      // blend, KEYED_GAITS) and the standing idle (KEYED_IDLE: breathing, weight shifts, a head scan, the arms in); drawn
      // it keeps the walk band as before (slice 3 owns the drawn carriage)
      const bandK = band + (1 - band) * fw;
      const gate = (1 - crouchK) * onFoot * (1 - wallW) * (1 - this.raiseS) * (1 - this.dashS);
      const loco = this.moveW * bandK * (1 - spin);
      const still = (1 - this.moveW) * fw;
      // (anim-rework S3) drawn (a carrier with the gun out, standing on foot): the drawn set at every pace and still
      // (ready stance; the low ready on the walk / jog / run legs; aiming the glide by direction), in place of the old
      // walk band; crouched drawn keeps the procedural path (slice 4)
      const dOn = i.keyedDrawn && i.grounded && i.traverse === 'none' && i.slide < 0 && !i.wall ? 1 - fw : 0;
      const gateD = (1 - crouchK) * dOn * (1 - wallW) * (1 - this.dashS);
      const locoD = this.moveW * (1 - spin);
      const stillD = 1 - this.moveW;
      const kH = gate * (loco + still) * (1 - dOn);
      const kDr = gateD * (locoD + stillD);
      const kT = kH + kDr;
      this.keyW = approach(this.keyW, kT, B.tau, dt);
      o.keyW = this.keyW < 1e-4 ? 0 : this.keyW;
      if (kT > 1e-4) this.keyDS = approach(this.keyDS, kDr / kT, B.tau, dt);
      this.readyStillS = approach(this.readyStillS, gateD, READY_STANCE.tau, dt);
      const dS = o.keyW > 0 ? this.keyDS : 0;
      o.keyArmW = o.keyW * fw * (1 - dS) * (i.melee >= 0 ? 0 : 1);
      this.keyHolS = approach(this.keyHolS, gate * fw, B.tau, dt);
      o.keyHol = this.keyHolS < 1e-4 ? 0 : this.keyHolS;
      this.keyedSet(ph, es, loco + still > 1e-4 ? still / (loco + still) : 0, o);
      o.keyDrawn = dS;
      o.keyTrunk = 1 - dS * this.raiseS;
      if (dS > 1e-4) this.keyedDrawnSet(ph, es, locoD + stillD > 1e-4 ? stillD / (locoD + stillD) : 0, dS, pose, o);
    }
    this.writeTargets(pose, i, k, ph);
    this.out.weaponBob = this.bobResidual;
    o.readyFollow = fw;
    o.readyShoulder.x = p.shoulderHalf;
    o.readyShoulder.y = p.y.shoulder + this.readyFy * fw * k;
    o.readyShoulder.z = -0.01 + this.readyFz * fw * k;
    return o;
  }

  /**
   * (anim-rework S2) The standing keyed set into `o.keyed`: walk -> jog -> run cross-faded by the effort pace
   * (KEYED_GAITS; the walk scaled by its pace as before), then the idle by its `idleShare` (on its own slow clock); the
   * blended track half-width, knee pole, duty and lift go with it. No allocation.
   */
  private keyedSet(ph: number, es: number, idleShare: number, o: RigTargets): void {
    const needLoco = o.keyW > 0 && idleShare < 1;
    const needIdle = o.keyW > 0 && idleShare > 0;
    this.speedSet(ph, es, needLoco, this.kA, this.kB);
    this.kWalk = this.sWalk;
    let half = this.sHalf;
    let kneeOut = this.sKneeOut;
    this.kDuty = this.sDuty;
    this.kLift = this.sLift;
    if (needIdle) sampleKeyed(KEYED_IDLE, this.idleT / KEYED_IDLE_PERIOD, 1, this.kB);
    // the idle's scan: the keyed neck's yaw in the body frame (the sum of the chain's local yaws), by the idle's share
    let scan = 0;
    if (needIdle) for (let s = 0; s < 16; s += 4) scan += 2 * Math.atan2(this.kB.q[s + 1]!, this.kB.q[s + 3]!);
    o.keyScan = scan * idleShare * o.keyW;
    if (needLoco && needIdle) mixKeyed(this.kA, this.kB, idleShare, o.keyed);
    else if (needLoco) mixKeyed(this.kA, this.kA, 0, o.keyed);
    else if (needIdle) mixKeyed(this.kB, this.kB, 0, o.keyed);
    half += (KEYED_IDLE.half - half) * idleShare;
    kneeOut += (KEYED_IDLE.kneeOut - kneeOut) * idleShare;
    this.kHalf = half;
    o.keyKneeOut = kneeOut;
  }

  /** (anim-rework S3) The speed set's blended clip values (`speedSet`). */
  private sHalf = KEYED_WALK.half;
  private sKneeOut = KEYED_WALK.kneeOut;
  private sDuty = KEYED_WALK.duty;
  private sLift = KEYED_WALK.liftH;
  private sWalk = 1;

  /**
   * (anim-rework S2, split out in S3) The standing speed set: walk -> jog -> run cross-faded by the effort pace
   * (KEYED_GAITS; the walk scaled by its pace), into `out` when `sample` (`tmp` a scratch pose); its blended track
   * half-width, knee pole, duty, lift and the walk's share into the s* fields. No allocation.
   */
  private speedSet(ph: number, es: number, sample: boolean, out: KeyedPose, tmp: KeyedPose): void {
    const G = KEYED_GAITS;
    const wJog = smoothstep((es - G.walkTo) / (G.jogFrom - G.walkTo));
    const wRun = smoothstep((es - G.jogTo) / (G.runFrom - G.jogTo));
    let c0: KeyedClip = KEYED_WALK;
    let c1: KeyedClip = KEYED_JOG;
    let t = wJog;
    if (wRun > 0) {
      c0 = KEYED_JOG;
      c1 = KEYED_RUN;
      t = wRun;
    }
    const B = KEYED_WALK_BAND;
    this.sWalk = c0 === KEYED_WALK ? 1 - t : 0;
    this.sHalf = c0.half + (c1.half - c0.half) * t;
    this.sKneeOut = c0.kneeOut + (c1.kneeOut - c0.kneeOut) * t;
    this.sDuty = c0.duty + (c1.duty - c0.duty) * t;
    this.sLift = c0.liftH + (c1.liftH - c0.liftH) * t;
    if (!sample) return;
    sampleKeyed(c0, ph, c0 === KEYED_WALK ? B.ampMin + (1 - B.ampMin) * clamp(es / B.full, 0, 1) : 1, out);
    if (t > 0) {
      sampleKeyed(c1, ph, 1, tmp);
      mixKeyed(out, tmp, t, out);
    }
  }

  /**
   * (anim-rework S3) The drawn set, mixed into `o.keyed` by its share `dS` (BRIEF 3 "Weapon carry and aiming"; S3-KEYS.md):
   * - low ready: the speed set's legs and trunk moving (no lean below the run, M6), the ready stance still;
   * - aiming (by the eased raise): the glide by the smoothed local direction (forward, back, the strafe: the right step
   *   as keyed, the left one mirrored half a cycle on), the ready stance still; its pelvis offsets ride on the procedural
   *   pose (the clip's swing about its mean) and its trunk is not applied (`keyTrunk`): the upper body stays the
   *   procedural gun platform, the legs do the moving.
   * The track half-width, knee pole, duty and lift blend the same way. No allocation.
   */
  private keyedDrawnSet(ph: number, es: number, idleShare: number, dS: number, pose: Pose, o: RigTargets): void {
    const aimK = this.raiseS;
    const R = KEYED_READY_STANCE;
    const rph = this.idleT / READY_STANCE.period;
    // low ready: the speed set moving, the ready stance still
    this.speedSet(ph, es, idleShare < 1, this.kC, this.kD);
    const lHalf = this.sHalf + (R.half - this.sHalf) * idleShare;
    const lKnee = this.sKneeOut + (R.kneeOut - this.sKneeOut) * idleShare;
    const lDuty = this.sDuty + (R.duty - this.sDuty) * idleShare;
    const lLift = this.sLift + (R.liftH - this.sLift) * idleShare;
    if (idleShare > 0) {
      sampleKeyed(R, rph, 1, this.kD);
      if (idleShare < 1) mixKeyed(this.kC, this.kD, idleShare, this.kC);
      else mixKeyed(this.kD, this.kD, 0, this.kC);
    }
    let gHalf = R.half;
    let gKnee = R.kneeOut;
    let gDuty = R.duty;
    let gLift = R.liftH;
    if (aimK > 1e-4) {
      // the glide by direction (weights as the procedural blend space), scaled by the pace about each clip's mean
      const fwW = Math.max(0, this.dirZ);
      const bwW = Math.max(0, -this.dirZ);
      const swW = Math.abs(this.dirX);
      const tot = fwW + bwW + swW || 1;
      const amp = clamp(GLIDE.ampMin + ((1 - GLIDE.ampMin) * this.locoSpeed) / GLIDE.full, 0, 1);
      const zc = fwW >= bwW ? KEYED_GLIDE_FWD : KEYED_GLIDE_BACK;
      const zKnee = GLIDE.kneeOut;
      const S = KEYED_GLIDE_STRAFE;
      const sk = swW / tot;
      const mHalf = zc.half * GLIDE.halfK + (S.half * GLIDE.halfKSide - zc.half * GLIDE.halfK) * sk;
      const mKnee = zKnee + (GLIDE.kneeOutSide - zKnee) * sk;
      const mDuty = zc.duty + (S.duty - zc.duty) * sk;
      const mLift = zc.liftH + (S.liftH - zc.liftH) * sk;
      const loco = idleShare < 1;
      if (loco) {
        sampleKeyed(zc, ph, amp, this.kE);
        this.dynPel(this.kE, zc, pose);
        if (sk > 0) {
          // the right step as keyed; the left mirrored, half a cycle on (its lead foot is the left: it lands at 0)
          const left = this.dirX < 0;
          sampleKeyed(S, left ? ph + 0.5 : ph, amp, this.kD);
          if (left) mirrorKeyed(this.kD);
          this.dynPel(this.kD, S, pose);
          mixKeyed(this.kE, this.kD, sk, this.kE);
        }
      }
      if (idleShare > 0) {
        sampleKeyed(R, rph, 1, this.kD);
        this.dynPel(this.kD, R, pose);
        if (loco) mixKeyed(this.kE, this.kD, idleShare, this.kE);
        else mixKeyed(this.kD, this.kD, 0, this.kE);
      }
      gHalf = mHalf + (R.half - mHalf) * idleShare;
      gKnee = mKnee + (R.kneeOut - mKnee) * idleShare;
      gDuty = mDuty + (R.duty - mDuty) * idleShare;
      gLift = mLift + (R.liftH - mLift) * idleShare;
      // the aimed trunk is not applied (keyTrunk): keep the low ready's so a partial raise never mixes trunks
      this.kE.q.set(this.kC.q);
      mixKeyed(this.kC, this.kE, aimK, this.kC);
    }
    this.dHalf = lHalf + (gHalf - lHalf) * aimK;
    this.dKneeOut = lKnee + (gKnee - lKnee) * aimK;
    this.dDuty = lDuty + (gDuty - lDuty) * aimK;
    this.dLift = lLift + (gLift - lLift) * aimK;
    // into the holstered set's pose and values by the drawn share
    mixKeyed(o.keyed, this.kC, dS, o.keyed);
    this.kHalf += (this.dHalf - this.kHalf) * dS;
    o.keyKneeOut += (this.dKneeOut - o.keyKneeOut) * dS;
    this.kDuty += (this.dDuty - this.kDuty) * dS;
    this.kLift += (this.dLift - this.kLift) * dS;
    // (the slow-walk duty / lift shape: the low ready's walk share moving)
    this.kWalk += (this.sWalk * (1 - aimK) * (1 - idleShare) - this.kWalk) * dS;
    o.keyScan *= 1 - dS;
  }

  /** (anim-rework S3) The glide's share of the step (GLIDE_STEP): a carrier aiming (the raise past half, as the driver's
   *  `aiming`). Enemies keep their steps. */
  private glideK(i: AnimInput): number {
    return i.keyedDrawn && i.raise > 0.5 ? 1 : 0;
  }

  /** (anim-rework S3) A sampled aimed pose's pelvis offsets as the procedural pose's plus the clip's swing about its mean. */
  private dynPel(k: KeyedPose, c: KeyedClip, pose: Pose): void {
    k.pel[0] = pose[CH.pelX]! + k.pel[0]! - c.meanPel[0]!;
    k.pel[1] = k.pel[1]! - c.meanPel[1]!;
    k.pel[2] = pose[CH.pelZ]! + k.pel[2]! - c.meanPel[2]!;
  }

  /**
   * (CT prototype G1) Free-hand poses on top of the ready hands (weighted by `fw`, their share left by the clips):
   * - the kneel (audit row 4, 105624 @ 53.5-54.7): the left forearm resting on the left thigh, the wrist over the knee;
   *   the right hand by the right thigh (KNEEL_HANDS);
   * - the tense sneak (row 26, Michael: "holding hand near knife when near guard"): the right hand out ahead of the hip for
   *   balance, the left hand over the knife on the left thigh, closing on its handle every few seconds (TENSE_HANDS);
   * - a deep landing (row 18): the arms thrown out sideways for ~0.3 s (LAND_ARMS).
   */
  private freeHands(pose: Pose, fw: number, k: number, ph: number): void {
    const p = this.p;
    const kw = smoothstep(this.kneelW) * fw;
    if (kw > 0.001) {
      // (the forearm on the front knee's thigh: mirrored with the kneel)
      const KH = KNEEL_HANDS;
      const m = this.kneelSide;
      blendHand(pose, m > 0 ? CH.hLX : CH.hRX, KH.lx * m, KH.ly, KH.lz, kw);
      blendHand(pose, m > 0 ? CH.hRX : CH.hLX, KH.rx * m, KH.ry, KH.rz, kw);
    }
    const tw = this.tenseW * fw * (1 - smoothstep(this.kneelW));
    if (tw > 0.001) {
      const T = TENSE_HANDS;
      // hip height and fore-aft in the pose (pelvis offset from rest)
      const hy = p.y.hip / k + pose[CH.pelY]!;
      const hz = pose[CH.pelZ]!;
      const sh = p.shoulderHalf / k;
      // the knife hand settles onto the handle and eases off it again (a slow ~3 s cycle), the balance hand sways a little with the stride
      const knife = 0.5 + 0.5 * Math.sin(this.idleT * T.knifeRate);
      const sway = Math.sin(ph * Math.PI * 2) * T.sway;
      blendHand(pose, CH.hRX, sh + T.outX, hy + T.outY, hz + T.outZ + sway, tw);
      blendHand(pose, CH.hLX, -(sh + T.knifeX), hy + T.knifeY + T.knifeOff * (1 - knife), hz + T.knifeZ, tw);
    }
    if (this.landT >= 0 && this.landK > 0) {
      const t = this.landT;
      const w = this.landK * fw * smoothstep(t / 0.08) * (1 - smoothstep((t - LAND_ARMS.hold) / 0.25));
      pose[CH.hLX] = pose[CH.hLX]! - LAND_ARMS.out * w;
      pose[CH.hRX] = pose[CH.hRX]! + LAND_ARMS.out * w;
      pose[CH.hLY] = pose[CH.hLY]! + LAND_ARMS.up * w;
      pose[CH.hRY] = pose[CH.hRY]! + LAND_ARMS.up * w;
    }
  }

  /** Map the pose to rig targets and the planner's stance/gait values. */
  private writeTargets(q: Pose, i: AnimInput, k: number, ph: number): void {
    const o = this.out;
    const pe = o.pelvis;
    pe.x = q[CH.pelX]! * k;
    pe.y = q[CH.pelY]! * k + TUNE_CUR.pelvisYAdd;
    pe.z = q[CH.pelZ]! * k;
    pe.pitch = q[CH.pelPitch]!;
    pe.roll = q[CH.pelRoll]!;
    // (anim-rework S3) gliding aimed the hips twist less with the steps (GLIDE.yawCut): a quieter gun platform
    pe.yaw = q[CH.pelYaw]! * (1 - GLIDE.yawCut * TUNE_CUR.glideTwistMul * o.keyDrawn * o.keyW * this.raiseS);
    o.spine.pitch = q[CH.spPitch]! + TUNE_CUR.leanAdd;
    o.spine.yaw = q[CH.spYaw]!;
    o.spine.roll = q[CH.spRoll]!;
    o.head.pitch = q[CH.hdPitch]!;
    o.head.yaw = q[CH.hdYaw]!;
    o.head.roll = q[CH.hdRoll]!;
    const w = o.weapon;
    w.x = q[CH.wpX]!;
    w.y = q[CH.wpY]!;
    w.z = q[CH.wpZ]!;
    w.pitch = q[CH.wpPitch]!;
    w.yaw = q[CH.wpYaw]!;
    w.roll = q[CH.wpRoll]!;
    o.grip = clamp(q[CH.grip]!, 0, 1);
    o.offGrip = clamp(q[CH.offGrip]!, 0, 1);
    o.offMag = clamp(q[CH.offMag]!, 0, 1);
    o.offWall = clamp(q[CH.offWall]!, 0, 1);
    o.handL.x = q[CH.hLX]! * k;
    o.handL.y = q[CH.hLY]! * k;
    o.handL.z = q[CH.hLZ]! * k;
    o.handR.x = q[CH.hRX]! * k;
    o.handR.y = q[CH.hRY]! * k;
    o.handR.z = q[CH.hRZ]! * k;
    if (WEIGHT_POSE.on) weightApplyPose(o); // (anim-weight) the local player's Weight layers (off: untouched)
    // stance: shoulder-width tactical stance, support (left) foot slightly forward
    // (BC note 4) on foot the feet stay under the hips (inside the body width): the clips' width scale only widens the stance
    // a quarter as much, capped at 1.1 hip half-widths (it was 1.2 x width: up to 1.6 crouched). Traversals keep their own width.
    const wd = q[CH.width]!;
    const half0 = this.p.hipHalf * (i.traverse === 'none' && !i.wall ? 1 + clamp(wd - 1, -0.5, 0.4) * 0.25 : 1.2 * wd);
    // (CT prototype G8) the keyed walk's narrow track (the feet under the body, the soles just clear)
    // (anim-rework S2) the keyed set's blended track (walk, jog, run, the idle's hip width)
    const half = (half0 + (this.kHalf - half0) * o.keyW) * TUNE_CUR.trackMul;
    const st = o.stance;
    // (G1 fix, audit row 20) standing still on foot the feet sit IDLE_STANCE apart (anim-rework S2: about hip width)
    const wide = i.traverse === 'none' && !i.wall && i.grounded ? IDLE_STANCE.extra * o.keyHol * (1 - this.moveW) * (1 - clamp(i.crouch, 0, 1)) : 0;
    st.lX = (-half - wide + q[CH.fLX]!) * k;
    // (G1) the support foot's lead (0.08 m) is a standing stance: moving, the feet run on even tracks (a lead made every
    // other landing reach further and dip the pelvis more: a limp in the bob)
    // (traversals, walls and the air keep the 3.2.0 stagger: a window vault tucked the knees together without it)
    // (anim-rework S3) drawn on foot the ready stance's longer stagger (READY_STANCE.lead: the support foot ahead)
    const lead = IDLE_STANCE.lead + (READY_STANCE.lead - IDLE_STANCE.lead) * this.readyStillS;
    const stag = i.traverse !== 'none' || i.wall || !i.grounded ? 0.04 : lead * (1 - this.moveW);
    st.lZ = (0.01 + stag + q[CH.fLZ]!) * k;
    st.rX = (half + wide + q[CH.fRX]!) * k;
    st.rZ = (0.01 - stag + q[CH.fRZ]!) * k;
    st.lY = q[CH.fLY]! * k;
    st.rY = q[CH.fRY]! * k;
    st.lPitch = q[CH.fLPitch]!;
    st.rPitch = q[CH.fRPitch]!;
    // gait values for the planner: duty and lift from the blended cycle at this speed
    const s = Math.max(0, i.speed);
    const g = o.gait;
    g.phase = ph;
    // near the end of a stop the gait clock crawls: hand the last step to deliberate idle stepping
    // (A1.2) turning steps the feet too (one step per 90 deg), not on a wall, a traversal or a stepped turn chunk
    const lat = lateralShare(i);
    const bk = backShare(i);
    const gl = this.glideK(i);
    const canTurn = !i.wall && i.traverse === 'none' && i.motion !== 'turn' && i.motion !== 'stop';
    const yr = canTurn ? Math.abs(i.yawRate) : 0;
    g.moving = (s > (i.motion === 'stop' ? 0.3 : 0.05) || yr > TURN_GAIT_MIN) && i.grounded;
    const tense = i.crouch > 0.5 ? this.tenseW : 0;
    // (G1 fix) moving on a driver's clock that runs ahead of the pace (a start), the swings keep to the clock
    const ckw = clamp(i.crouch, 0, 1);
    const rate = Math.max(gaitRate(s > 0.05 ? s : 0, yr, undefined, lat, tense, ckw, bk, gl), i.motion === 'move' ? this.phRate : 0);
    g.cycleTime = rate > 1e-3 ? 1 / rate : 1.2;
    const linRate = s > 0.05 ? gaitRate(s, 0, undefined, lat, tense, ckw, bk, gl) : 0;
    const angRate = yr > TURN_GAIT_MIN ? yr / (2 * TURN_STEP) : 0;
    g.turning = smoothstep((linRate > 1e-3 ? angRate / linRate : angRate > 0 ? 10 : 0) - 0.5);
    const nodes = i.crouch > 0.5 ? CROUCH_NODES : FORWARD_NODES;
    // (step 22, D5.1) duty and lift at the effort pace, as the clips the pose blends
    const es = effortSpeed(s, i.crouch > 0.5);
    const a = fwdNode(nodes, es);
    const na = nodes[a]!;
    const nb = nodes[a + 1]!;
    const kk = clamp((es - na.speed) / (nb.speed - na.speed), 0, 1);
    // (G1) the tense sneak's own contact timing and high knee lift
    const duty0 = na.clip.duty + (nb.clip.duty - na.clip.duty) * kk;
    const lift0 = na.clip.liftH + (nb.clip.liftH - na.clip.liftH) * kk;
    const duty1 = duty0 + (TENSE_SNEAK.duty - duty0) * tense;
    const lift1 = lift0 + (TENSE_SNEAK.liftH - lift0) * tense;
    // (G8) the keyed walk's contact timing and swing lift
    // (slower the stance is longer and the swing lower: KEYED_WALK_BAND.duty / lift at a standstill)
    const kp = clamp(es / KEYED_WALK_BAND.full, 0, 1);
    // (anim-rework S2) the keyed set's blended values; the slow-walk shape on the walk's share only
    const sw = this.kWalk * (1 - kp);
    const duty = duty1 + (this.kDuty + KEYED_WALK_BAND.slowDuty * sw - duty1) * o.keyW;
    const lift = lift1 + (this.kLift * (1 - KEYED_WALK_BAND.slowLift * sw) - lift1) * o.keyW;
    // (A1.2) a shorter stance in a turn: less body yaw over a planted foot
    g.duty = clamp(duty + (TURN_DUTY - duty) * g.turning, 0.4, 0.75);
    g.liftH = lift * k * clamp(q[CH.lift]!, 0.3, 2) * TUNE_CUR.kneeLiftMul;
    // layer weights for the overlay
    const ly = o.layers;
    for (let k = 0; k < LOWER_STATES.length; k++) ly[LOWER_STATES[k]!] = this.weights[LOWER_STATES[k]!];
    ly.raise = this.raiseS;
    ly.low = i.carryLow;
    ly.high = i.carryHigh;
    ly.compressed = i.carryComp;
    ly.reload = this.reloadW;
    ly.dash = this.dashS;
    ly.kneel = smoothstep(this.kneelW);
    ly.inert = this.inert.maxOffset;
  }

  /** (anim-rework S3) READY_POSES.low toward PISTOL_READY by the pistol weight, into a scratch pose (no allocation). */
  private readonly pLow = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };
  private pistolLow(w: number): { x: number; y: number; z: number; pitch: number; yaw: number; roll: number } {
    const a = READY_POSES.low;
    const b = PISTOL_READY;
    const o = this.pLow;
    o.x = a.x + (b.x - a.x) * w;
    o.y = a.y + (b.y - a.y) * w;
    o.z = a.z + (b.z - a.z) * w;
    o.pitch = a.pitch + (b.pitch - a.pitch) * w;
    o.yaw = a.yaw + (b.yaw - a.yaw) * w;
    o.roll = a.roll + (b.roll - a.roll) * w;
    return o;
  }

  /** Active clips this frame (debug overlay). */
  activeClips(): readonly ClipSlot[] {
    return this.slots.slice(0, this.nSlots);
  }
}

const NEUTRAL_POSE: Pose = newPose();

/**
 * (G1 fix, audit row 20) The standing rest stance: `extra` (m) wider each side than the hips, the left foot `lead` (m)
 * ahead and the right as far behind. (anim-rework S2, BRIEF 3: feet about hip width) extra 0.065 -> 0, lead 0.05 -> 0.04:
 * the CT stance (0.3-0.4 m) put each foot 15 cm off the line under the hips and opened the knees to 1.4 x the hips; (S2
 * fix round) extra -0.015, standing holstered only (keyHol; drawn and the close-quarters hold keep the hip-joint
 * width): the feet a touch inside the hip joints, 1 cm or more of margin under CRAB_IDLE.
 */
export const IDLE_STANCE = { extra: -0.015, lead: 0.04 } as const;

/**
 * (CT prototype G8) Where the keyed walk plays: at full weight up to `from` effort pace (GAIT_REF units: 2.0 is gear 3,
 * 2.1 m/s, the CT walk of 105949 / 105509: ~3 steps a second), gone by `to` (3.0 is gear 4, 3.0 m/s: the procedural jog
 * takes over); `ampMin` the cycle's share at a standstill and `full` the effort pace it is keyed at (a slower walk swings
 * less: half at gear 1, three quarters at gear 2); `tau` (s) the weight's easing (stance, wall, air,
 * aim changes never pop); `slowDuty` the stance share added and `slowLift` the swing lift share taken off at a standstill
 * (a slower walk keeps each foot down longer and lifts it less).
 */
export const KEYED_WALK_BAND = { from: 2.15, to: 2.75, full: 2.0, ampMin: 0.5, tau: 0.08, slowDuty: 0.04, slowLift: 0.25 } as const;

/**
 * (anim-rework S2) The standing keyed speed blend in effort pace (GAIT_REF units, `effortSpeed`): the walk alone up to
 * `walkTo` (2.0: 2.1 m/s), cross-faded into the jog by `jogFrom` (2.6: ~2.6 m/s), the jog alone to `jogTo` (3.2: ~3.3
 * m/s), into the run by `runFrom` (3.8: ~4.2 m/s). Smoothstep fades: the gait never pops; the stride and cadence stay the
 * planner's, from the actual ground speed.
 */
export const KEYED_GAITS = { walkTo: 2.0, jogFrom: 2.6, jogTo: 3.2, runFrom: 3.8 } as const;
/** (anim-rework S2) The keyed idle's cycle (s): three slow breaths, a weight shift each way and a head scan each way. */
export const KEYED_IDLE_PERIOD = 12;
/**
 * (anim-rework S3, BRIEF 3 "feet staggered") The drawn ready stance: `period` (s) the ready_stance clip's cycle (two slow
 * breaths), `lead` (m) the support (left) foot ahead and the strong foot as far behind when still with the gun out (an
 * 18 cm stagger, the ready stance's bladed base; the holstered idle keeps IDLE_STANCE.lead), `tau` (s) its easing.
 */
export const READY_STANCE = { period: 8, lead: 0.09, tau: 0.25 } as const;
/** (anim-rework S3) The aimed glide's cycle amplitude: `ampMin` at a standstill, the full keyed swing from `full` m/s;
 *  `halfK` / `halfKSide` the forward / back and the side clips' track half-width share for the planner (the feet a little under the hips: the glide's narrow base); `kneeOut` / `kneeOutSide` the forward / back and the side glides' knee pole share (a little in: the narrow track's
 *  knees stay over the toes, not out past the ankles); `yawCut` the share of the stepping pelvis twist taken off. */
export const GLIDE = { ampMin: 0.4, full: 1.0, halfK: 0.8, halfKSide: 0.9, kneeOut: -0.05, kneeOutSide: -0.08, yawCut: 0.85 } as const;

/** (G1) Move a free hand target (channels x, y, z from `ch`) toward (x, y, z) by `w`. */
function blendHand(q: Pose, ch: number, x: number, y: number, z: number, w: number): void {
  q[ch] = q[ch]! + (x - q[ch]!) * w;
  q[ch + 1] = q[ch + 1]! + (y - q[ch + 1]!) * w;
  q[ch + 2] = q[ch + 2]! + (z - q[ch + 2]!) * w;
}

/** (G1, audit row 4) Kneeling wrists (root space, m at 1.75 m): the left on the front (left) knee, the right by the right thigh. */
export const KNEEL_HANDS = { lx: -0.1, ly: 0.58, lz: 0.42, rx: 0.24, ry: 0.42, rz: 0.06 } as const;
/**
 * (G1, audit row 26) Tense sneak wrists, from the hip (m at 1.75 m): the right `out*` (out past the shoulder, height, ahead)
 * for balance with a `sway` (m) along the stride, the left `knife*` over the knife on the left thigh, `knifeOff` (m) off
 * its handle at the open end of the `knifeRate` (rad/s) cycle.
 */
export const TENSE_HANDS = { outX: 0.12, outY: 0.04, outZ: 0.22, sway: 0.03, knifeX: -0.03, knifeY: 0.06, knifeZ: 0.12, knifeOff: 0.06, knifeRate: 2.1 } as const;
/** (G1, audit row 18) A deep landing throws the arms out (m sideways, m up) for `hold` s. */
export const LAND_ARMS = { out: 0.3, up: 0.3, hold: 0.3 } as const;

/** Sideways share of the local movement direction (0 forward/back .. 1 pure strafe). */
function lateralShare(i: AnimInput): number {
  const l = Math.sqrt(i.localX * i.localX + i.localZ * i.localZ);
  return l > 1e-4 ? Math.min(1, Math.abs(i.localX) / l) : 0;
}

/** (anim-rework S3) Backward share of the local movement direction (0 forward / sideways .. 1 straight back). */
function backShare(i: AnimInput): number {
  const l = Math.sqrt(i.localX * i.localX + i.localZ * i.localZ);
  return l > 1e-4 ? Math.max(0, Math.min(1, -i.localZ / l)) : 0;
}

/** Index of the lower node bracketing a speed in a forward node set. */
/** (step 22, D5.2) Acceleration lean: rad per m/s^2 along the body, and its cap (rad). */
const LEAN_GAIN = 0.012;
/** (A1.2) Stance share of the gait cycle in a full-rate turn (shorter stance: less body yaw over a planted foot). */
const TURN_DUTY = 0.52;
/**
 * (P1 posture) Extra spine pitch (rad, forward +) for the Chaos Theory carriage: `crouchLean` crouched (total ~38 deg
 * with the pelvis tilt), `runLean` at the run (total ~23 deg at 4.2 m/s), easing in from `runFrom` to `runTo` m/s;
 * the lean changes at most `rate` rad/s.
 */
// (CT prototype G1) runFrom / runTo 2.0 / 4.2 -> 1.6 / 3.0 (audit row 8: the full run lean from gear 4); kneelLean 0.1 ->
// 0.18 (row 4: the kneel's back ~15-20 deg forward); `crouchRunLean` (row 16) the crouch run's back, ~55 deg with the
// pelvis, eased in over the top crouched gear; `tenseLean` (row 26) the tense sneak's back (0.6 rad, ~45 deg with the pelvis).
export const POSTURE = { crouchLean: 0.74, kneelLean: 0.18, runLean: 0.37, kneel: true, hunchArmed: 0.4, hunchHolstered: 0.05, runFrom: 1.6, runTo: 3.0, rate: 2.5, crouchRunLean: 0.95, tenseLean: 0.55 } as const;
const LEAN_MAX = 0.09;
/**
 * (CT prototype G1, audit row 12) Bank into a fast turn: roll = min(`max`, `k` x a^2) for the lateral acceleration a = speed x
 * yaw rate (m/s^2), eased in from `from` to `to` m/s (none walking): ~10 deg in a swept run turn (12 m/s^2), the 0.55 rad
 * (31 deg) cap in a 360 deg/s run spin (051339 @ 17-19.75: 30-45 deg). Split `pelvis` / the rest over the spine. (The audit's
 * 0.35 x atan(a / g) gives 18 deg for its own 10 deg swept turn: the quadratic keeps both of its measured ends.)
 */
export const BANK = { k: 0.0012, max: 0.55, from: 2.5, to: 3.0, pelvis: 0.4 } as const;
/** (step 22) The acceleration lean on the wall (entry, shuffle): the 3.2.0 gain and cap. */
const LEAN_WALL = { gain: 0.025, max: 0.14 } as const;

function fwdNode(nodes: readonly { speed: number }[], s: number): number {
  let a = 0;
  while (a < nodes.length - 2 && s > nodes[a + 1]!.speed) a++;
  return a;
}
