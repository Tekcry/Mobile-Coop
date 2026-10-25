/**
 * Layered, clip-based animation graph (pure: no Babylon). Evaluated every render frame.
 *
 * Lower body: a 2D blend space (speed x direction) over keyed locomotion cycles, standing and
 * crouched, all sampled at the gait clock so blends never fight the feet; a timed kneel pose; start
 * weight shift, stop settle and pivot clips driven by the motion driver's state; back-to-wall, traversal
 * and air poses. Switches between these are inertialized (the jump decays through a critically
 * damped curve per joint group), never cut or linearly faded.
 * Upper body: weapon ready positions blended to the raised aim pose; reload (tactical / empty), swap and
 * grenade clips; head-first peek and lean sequencing; recoil absorbed through the spine; spine/head
 * look-at; breathing after 2 s still; hit flinch; acceleration lean.
 * Balance: a pelvis spring compressed on every heel strike and shifted over the support foot.
 * Feet are placed by the rig's world-space FootPlanner from the stance and gait values output here.
 */
import type { Proportions } from '../player/proportions';
import { rollRide } from '../player/traversePath';
import { overClip, addClip, type Clip } from './clip';
import { evalCurve } from './curves';
import { CH, Inertializer, lerpPose, newPose, type Pose } from './pose';
import { CROUCH_STEP, CROUCH_STEP_GUARD, GLIDE_SIDE, gaitRate, TURN_GAIT_MIN, TURN_STEP, type MotionState } from './motion';
import { MOVEMENT, TENSE } from '../config/movement';
import { approach, clamp, smoothstep, Spring, type V3 } from './rigMath';
import { TUNE_CUR, tuneMoveTwist } from './tune';
import { WEIGHT_POSE, weightApplyPose } from './weight';
import { CqGaitLayer } from './cqGait'; // (anim-n4, track A) the hold / carry walk trunk
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
import { CLIP_RATE, DROP, GRENADE, LAND, LAND_DEEP, MANTLE, PIVOT, reloadClipFor, START_SHIFT, STEP_UP, STOP_SETTLE, swapClipFor, VAULT, type SwapReach } from './clips/actions'; // (clip-speed, track A) CLIP_RATE
import { CLIP_BASE, clipSpeed } from './tuneClipSpeed'; // (clip-speed, track A)
import { airPoseW, CLIMB, CLIMB_UP, CLIMB_UP_CROUCH_K, CLIMB_UP_TEAM, CRAWL, CRAWL_OUT, HANG, LAND_ABSORB, landDeep, landLight, mantlePlant, PIPE_CLIMB, BRACE, PIPE_INVERTED, PIPE_LEGS_UP, RAPPEL_HANG, ROLL, rollBody, SPLIT_BRACE, splitBreath, VENT_DROP, WALL_KICK, WINDOW_VAULT, type MantlePlantOut, type RollBodyOut, type SplitBreathOut } from './clips/traverse';
import { hyp2 } from '../core/mathx';
import { emptyActionWeights, type TuneActionWeights } from './tuneMoveRows';
import { effortSpeed } from './effort';
import { clearKeyedArms, KEYED_FEET, KEYED_FEET_SIDE, KF, layerMul, mirrorKeyed, mixKeyed, newKeyedPose, sampleKeyed, type KeyedClip, type KeyedPose } from './keyed';
import { HAND_KEYED_SET, LOCO, MOCAP_FEET, MOCAP_LAYERS, MOCAP_SLOT, MocapSlots, mocapLayerK, type ClipFeetFrame, type LocoClipSet, type SlotLegValues } from './mocap'; // (mocap-trial)
import { KEYED_WALK } from './clips/keyed/walk';
import { KEYED_JOG } from './clips/keyed/jog';
import { KEYED_RUN } from './clips/keyed/run';
import { KEYED_IDLE } from './clips/keyed/idle';
import { WREN_KEYED } from './mixamo'; // (mixamo-retarget I1) Wren's keyed idle
import { KEYED_READY_STANCE } from './clips/keyed/ready_stance';
import { KEYED_GLIDE_FWD } from './clips/keyed/glide_fwd';
import { KEYED_GLIDE_STRAFE } from './clips/keyed/glide_strafe';
import { STANCE_SHOT, WREN_STANCE } from './mixamo'; // (mixamo-retarget I3) Wren's stance shots
import { KIT_SHOT, KIT_TABLES, newKitShotIn, type KitShotIn } from './kitMixamo'; // (mixamo-kit) the co-op kit's shot
import { KEYED_GLIDE_BACK } from './clips/keyed/glide_back';
import { studioDriveTargets, type StudioDrive } from './studioDrive';
import { MOVE_IDS, newGraphPlaying, type GraphPlaying } from './nowPlaying'; // (tuner-clarity S1)
import { HANG_IDLE_SECONDS, KEEP_CH, SHIMMY_SPEED, SHIMMY_TRAVEL, STAND_FADE, WREN_TRAV } from './mixamo'; // (mixamo-retarget I2)
import { bodyMotionBands, bodyMotionStep, KEY_MOTION, newBodyMotion, newBodyMotionIn, scaleKeyedArms, type BodyMotion } from './bodyMotion';
import { KEYED_SNEAK } from './clips/keyed/sneak';
import { KEYED_CROUCH_WALK } from './clips/keyed/crouch_walk';
import { KEYED_CROUCH_RUN } from './clips/keyed/crouch_run';
import { KEYED_CROUCH_IDLE } from './clips/keyed/crouch_idle';
import { WALL_KEYS, WallKeyed } from './wallKeyed';
import { DRAW_BEAT, DRAW_CUR, drawEnter, drawRelease } from './drawMotion';
import { BodyRecoil, RECOIL_SIGHT_ARM } from './recoil';


export const FADE = 0.2;
/** (locomotion step 21) Crouch -> kneel cross-fade (s), inside the Inertializer's 0.1-0.25 s (bible 5.12.2). */
export const KNEEL_FADE = 0.22;
// (anim-n3b) no 'slide' state: the dash-in slide was deleted (Michael 2026-10-22: CT has no such move)
export const LOWER_STATES = ['locomotion', 'crouch', 'kneel', 'air', 'wall', 'traverse'] as const;
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
  /** (mt2-guardgate, CHECK-6 R1) The mocap switch may drive this rig: a carrier (the player, a remote player; the rig sets
   *  it from `CharacterRig.carrier`). Guards and the menu preview keep the hand-keyed set whatever the switch says (BRIEF
   *  M4: the switch is Wren's). On by default (a bare graph, the tests). */
  mocapOk: boolean;
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
  /** (anim-n4b) A committed move's top above its start feet and its start-to-end distance (m; 0 = unknown): the
   *  mantle's hand plant on the edge (`mantlePlant`; travH < 0 = none: the backward mantle onto a ladder's top). */
  travH: number;
  travD: number;
  /** Melee swing 0..1, or < 0. */
  melee: number;
  /** (3.2.0) Whole-body tumble about the hips (rad) set by the caller (pipe legs up / inverted). */
  tumble: number;
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
  /** (anim-n4, track A) The bend is over a body (lift, carry, put down), not a held guard: the carry walk. */
  cqBody: boolean;
  /** (anim-n4, track A) The body's load: the loaded shoulder (1 right, -1 left) x its weight on it (0..1); 0 none. */
  cqCarry: number;
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
    mocapOk: true,
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
    landing: 0,
    wall: false,
    wallSide: 0,
    wallTurn: 0,
    wallBlock: 0,
    lean: 0,
    traverse: 'none',
    traverseT: 0,
    travH: 0,
    travD: 0,
    melee: -1,
    tumble: 0,
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
    cqBody: false,
    cqCarry: 0,
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
  /** (anim-n4b) The roll's spin about the hips-to-feet line (rad, `rollBody`, applied before the tumble), the tumble
   *  pivot's sink (m, the ride taken back out) and whether the feet's lifts turn with the body (a roll). */
  tumbleSpin: number;
  tumbleDrop: number;
  tumbleLift: boolean;
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
  /** (anim-rework S4) The free kneel's weight 0..1 (off a wall): the rig brings the knee pole in under it (KNEEL_KNEE_OUT). */
  kneel: number;
  /** (anim-rework S4) The keyed squat's share of the free arms (the crouched idle, hands on the knees): the rig moves each
   *  palm onto the top of its own posed knee by it (`kneeRest`). */
  kneeRest: number;
  /** (mocap-trial) The mocap set's share of the keyed pose this frame (0 with the switch off): the rig's and the graph's
   *  MOCAP_LAYERS scales act by it. */
  keyMocap: number;
  /** (mocap-trial-2, strafe) The mocap strafe's share of the keyed pose (the aimed glide's sideways share played by the
   *  captures; 0 with the switch off): the capture's hips ride over its own steps, so the rig's glide hip shift (GLIDE_HIP)
   *  gives way by it. */
  keyStrafe: number;
  /** (mocap-trial, A3) The clip feet for the foot planner (valid only for a mocap clip with a `feet` channel). */
  clipFeet: ClipFeetFrame;
  /** (anim-natural-n2) The body motion layer (`bodyMotion.ts`): Wren rigs on foot only, all 0 on every other rig.
   *  (mocap-trial) Scaled on the mocap share by MOCAP_LAYERS (`motionTrunk` ... `motionArmCap`). */
  motion: BodyMotion;
  /** (mixamo-kit) The co-op kit shot's weight on a free body (traverse or air: the holder's brace, the climber's
   *  climb-up): the rig applies the keyed trunk, neck, head and arms by it (the pelvis stays on `keyW`). 0 on foot. */
  keyShot: number;
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
    tumbleSpin: 0,
    tumbleDrop: 0,
    tumbleLift: false,
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
    kneel: 0,
    kneeRest: 0,
    keyMocap: 0,
    keyStrafe: 0,
    clipFeet: { valid: false, on: false, f: new Float64Array(KEYED_FEET) },
    motion: newBodyMotion(),
    keyShot: 0, // (mixamo-kit)
  };
}

/** Choose the lower-body state (priority order). */
export function pickLower(i: AnimInput): LowerState {
  if (i.traverse !== 'none') return 'traverse';
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
/** (afp AF4b) Crouched, the raised pistol this much further out along the aim (m, by the crouch). */
export const PISTOL_REACH_CROUCH = 0.05;
/** `peekFull`: (G2 fix) the head lean (rad) at which a raised pistol keeps the full head roll and neck dip at a wall-edge peek. */
export const SIGHT_HEAD = { roll: 0.15, peekFull: 0.2 };
/**
 * Per-shot recoil on the body (rad / m per unit kick, divided by the mass factor). (CT prototype G2, AUDIT-AIM row 11) CT
 * shows no visible flip: the front sight and head move < 1 % of the frame (< 0.5 deg) on the shot frames (111953 3.87,
 * 6.27-6.33, 30 fps). flip 0.12 -> 0.02 (about 7 deg was 7x CT), back 0.05 -> 0.015 m, spine 0.05 -> 0.01, pelvis 0.015
 * -> 0.003. Starting values.
 * (anim-n3b, PASS2 row 25) The guards' (every non-Wren rig's) recoil only: a Wren rig takes the per-shot body kick of
 * `recoil.ts` (WREN_RECOIL_RIFLE / WREN_RECOIL_PISTOL).
 */
export const RECOIL = { flip: 0.02, back: 0.015, spine: 0.01, pelvis: 0.003 };

/**
 * (locomotion step 21, D2) Weapon / kit stabilisation spring (rad/s): critically damped, settles to 2 % in 5.8 / omega
 * = 0.2 s after a stop, no secondary wobble. Idle breathing (BREATH) starts after `still` s without moving, never
 * while moving or aiming; `amp` is the chest pitch (rad, ~4 mm at the head), `rate` its angular frequency (rad/s).
 */
export const WEAPON_SETTLE_OMEGA = 29;
// (G1, audit row 20) rate 1.6 -> 2.1 rad/s: a 3.0 s breath (old 043858)
export const BREATH = { still: 2, fadeIn: 1.5, fadeOut: 0.05, amp: 0.008, rate: 2.1, rateCrouch: 1.3 };
/** (anim-rework S4, Michael 2026-10-19 "crouching idles too quick") Crouched the procedural breath slows to `BREATH.rateCrouch`
 *  (rad/s: a breath every 4.8 s, was 3 s) and the kneel's own cycle plays at `KNEEL_RATE` of its keyed pace (5.1 s, was 3.6). */
export const KNEEL_RATE = 0.7;
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
  // (anim-bake-1022) the guards' (every non-Wren rig's) low ready; Wren's is WREN_READY_LOW
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
/** (anim-bake-1022) A ready pose of the weapon layer (m, rad). */
export interface ReadyPose {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly pitch: number;
  readonly yaw: number;
  readonly roll: number;
}
/**
 * (anim-bake-1022, "Wren's rows never touch guards") Wren's own rifle low ready and pistol low ready: every Wren rig
 * (`CharacterRig.tuneRows`: the player, the co-op partner, the studio puppets) reads these, every other rig (guards,
 * VIP, dummy) READY_POSES.low and PISTOL_READY. The tuner's gun bake targets these (`tuneBakeTable.ts`). Michael's
 * 2026-10-22 tune: low pitch / yaw / roll 0.68 / -0.22 / 0.08 -> 0.75 / -0.63 / 0.54; pistol y / z / pitch -0.05 / -0.1
 * / 0.7 -> -0.34 / 0.08 / 1.16.
 */
export const WREN_READY_LOW = { x: 0, y: -0.08, z: -0.02, pitch: 0.75, yaw: -0.63, roll: 0.54 } as const;
export const WREN_PISTOL_READY = { x: -0.08, y: -0.34, z: 0.08, pitch: 1.16, yaw: -0.05, roll: 0 } as const;
/**
 * (anim-bake-targets, BT-A2) Wren's elbow tuck multiplier per gun state (the tuner's gun groups; the bake writes each,
 * `tuneBakeTable.ts`): a Wren rig's tuck (max(AIM_ELBOW_TUCK x aimK, READY_ELBOW_TUCK .. _CROUCH)) times this, every other
 * rig (guards, VIP, dummy) times 1. Identity 1 everywhere = the old shared tuck, bit-identical.
 */
export const WREN_TUCK = {
  rifle: { lowReady: 0.75, aim: 1, aimCrouch: 1 },
  pistol: { lowReady: 0, aim: 1, aimCrouch: 1 },
};
/**
 * A Wren rig's tuck multiplier: the low ready's at aimK 0, the aim's (crouched by `crouch` 0..1) at aimK 1, blended
 * between (no pop on raise); exact per state in the steady states. No allocation.
 */
export function wrenTuckMul(pistol: boolean, aimK: number, crouch: number): number {
  const t = pistol ? WREN_TUCK.pistol : WREN_TUCK.rifle;
  if (aimK <= 0) return t.lowReady;
  const aim = crouch <= 0 ? t.aim : crouch >= 1 ? t.aimCrouch : t.aim + (t.aimCrouch - t.aim) * crouch;
  return aimK >= 1 ? aim : t.lowReady + (aim - t.lowReady) * aimK;
}
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
/** (afp AF4b) The lowered gun crouched, added to the open-ground carry (m up / ahead, rad pitch; - muzzle up): `pistol` by the
 *  pistol's low-ready share and the crouch; `wall` side-on at a crouched wall (by the crouch and the wall blend, half
 *  raised); `pistol.kneel` m up at the middle of a kneel going down or up ((4 k (1 - k))^2 of its progress: no velocity step at either end). Clears the thighs:
 *  gun vs leg capsules >= 0 and no body-clearance push flipping it between the knees (tests/crouchStrafe.test.ts). */
export const CROUCH_GUN = { pistol: { y: 0.15, z: 0.08, pitch: -0.5, kneel: 0.2 }, wall: { y: 0.3, z: 0.1, pitch: -0.7 } } as const;
/** (G6, AUDIT-WALLS row 9) The peek's hip shift onto the outer foot (m per rad of lean; was 0.17). */
export const PEEK_HIP = 0.7;
/** (G6, AUDIT-WALLS row 12) A wall right in front of the raised weapon: `far` m to `near` m from the shoulder along the aim
 *  is the block amount 0..1 (the caller's ray: `wallBlockK`).
 *  (anim-n3b, PASS2 row 24; replaces G6's muzzle-up swing: 1.2 rad up and 0.15 m back, a linear 0.12 s ease, which flipped
 *  the rifle to 69 deg muzzle-up and held it there) Blocked, the weapon is shortened the way a trained shooter does at a
 *  wall: off the eye (no weld), the muzzle tipped `tip` rad below the aim line (at most `maxDown` rad below level, at least
 *  `minTip` under the aim line: aiming down it never points into the feet) about the butt in the shoulder (`butt` m
 *  behind the grip; a pistol about the wrists, `buttPistol`), pulled `pull` m back (`pullPistol` for a pistol, in to
 *  the chest), canted `cant` rad: about 0.3 m of reach in front of the body, so the rifle fits at the wall (the capsule stops the body 0.3 m off it). One eased
 *  move of `time` s each way. Hysteresis: blocked from an amount of `on`, clear again under `off`, so standing part-way
 *  into the band never holds the gun half-way. Starting values. */
export const WALL_BLOCK = { far: 0.65, near: 0.45, on: 0.35, off: 0.1, time: 0.4, tip: 1.15, maxDown: 1.13, minTip: 0.35, butt: 0.33, buttPistol: 0.08, pull: 0.06, pullPistol: 0.15, cant: 0.1 };
/** (G6) The block amount 0..1 for the distance (m) to the first wall hit along the aim from the shoulder. */
export function wallBlockK(dist: number): number {
  return clamp((WALL_BLOCK.far - dist) / (WALL_BLOCK.far - WALL_BLOCK.near), 0, 1);
}
/** (step 09) Fade rate (1/s) of the swap overlay: in as a swap / draw / holster starts, out when it stops mid-clip. */
const SWAP_FADE = 8;
/** (anim-natural N3) The overlay's fade-out rate (1/s) once a holster seats the gun: the hand lets go, no whip. */
const SWAP_FADE_HOLSTER = 2;
/** (anim-joints J2) The flinch spring's peak for a full hit (kick 4.5, omega 9: 4.5 / (9 e)) -> row weight 1. */
const HIT_ROW_K = (9 * Math.E) / 4.5;
/** (step 09) Carriage ease (s) during a weapon-to-weapon swap: out before the reach to the slot (~0.2 s in). */
const CARRY_SWAP_TAU = 0.08;
/** (mt2-fixC) Switch on, captured gaits: the stop hold's fade out of the stride (tau, s; 0.05 otherwise). */
const HOLD_TAU_CAPT = 0.08;
/** (fix 21-2) Time constant (s) of the right hand's holster offset (READY_HANDS.xHolster) easing in / out. */
const HOLSTER_TAU = 0.06;
/** (step 09) Grip weight rate (1/s): the hands take / leave the grip and the foregrip in at least 0.2 s. */
const GRIP_RATE = 5;
/** Seconds the support hand takes to settle onto the wall. */
const WALL_HAND_TIME = 0.42;
// (clip-speed, track A) the tuner's "today" lines: each timed body clip's duration at its code rate
CLIP_BASE.startShift = START_SHIFT.duration / CLIP_RATE.startShift;
CLIP_BASE.stopSettle = STOP_SETTLE.duration / CLIP_RATE.stopSettle;
CLIP_BASE.land = LAND.duration / CLIP_RATE.land;

/** (anim-n4b) The hand channels a traversal clip keeps over the graph's hanging hands (the roll, the ledge drop). */
const TRAV_CLIP_HANDS: readonly number[] = [CH.hLX, CH.hLY, CH.hLZ, CH.hRX, CH.hRY, CH.hRZ];
const TRAVERSE_CLIP: Record<Exclude<TraverseKind, 'none'>, Clip> = { vault: VAULT, mantle: MANTLE, step: STEP_UP, drop: DROP, hop: VAULT, roll: ROLL, hang: HANG, climb: CLIMB, pipeClimb: PIPE_CLIMB, crawl: CRAWL, crawlOut: CRAWL_OUT, climbUp: CLIMB_UP, ventDrop: VENT_DROP, windowVault: WINDOW_VAULT, split: SPLIT_BRACE, wallKick: WALL_KICK, pipeLegs: PIPE_LEGS_UP, pipeInv: PIPE_INVERTED, rappel: RAPPEL_HANG, brace: BRACE };

/** Active-clip slots for the debug overlay timeline. */
export interface ClipSlot {
  name: string;
  w: number;
  t: number;
}

const SLOTS = 10;

export class AnimGraph {
  readonly weights: Record<LowerState, number> = { locomotion: 1, crouch: 0, kneel: 0, air: 0, wall: 0, traverse: 0 };
  /**
   * (anim-joints J2, row plumbing) The action weights 0..1 the tuner's action rows read (`tuneMoveRows.ts`), written at
   * the end of each `update` from the graph's own blends: read only, nothing in the graph reads them back.
   */
  readonly rowW: TuneActionWeights = emptyActionWeights();
  state: LowerState = 'locomotion';
  /** Gait clock in use (driver's, or integrated from speed). */
  phase = 0;
  readonly out = emptyTargets();
  /** (anim-studio) The Anim Studio's loop player (`studioDrive.ts`): set on one rig's graph inside the studio only. */
  drive: StudioDrive | null = null;
  /**
   * (tuner-clarity S1, BRIEF A3) What this graph plays (`nowPlaying.ts`): the motion-capture, hand-keyed and graph-code
   * shares of the body, the captured move and the studio's clip, written at the end of each `update` (`notePlaying`).
   * The same object every frame; display only (`tuneEnd` copies the local player's into NOW_PLAYING): nothing in the
   * graph or the game reads it back.
   */
  readonly playing: GraphPlaying = newGraphPlaying();
  /** (mixamo-retarget M5) The traversal clip this frame's pose played (null: none), for `playing.trav`. */
  private travNow: Clip | null = null;
  /** (mixamo-retarget I2) The traversal kind before the current climb-up ('hang' a lip, 'climb' a ladder). */
  private travFrom: TraverseKind = 'none';
  /** (I2) The hang: a lip's pendulum seen (a pipe hang's time stays 0), the shimmy's weight and direction (0 left .. 1
   *  right), the hanging idle's and the shimmy's clocks (0..1). */
  private hangLip = false;
  private hangMoveW = 0;
  private hangDir = 0.5;
  private hangIdleT = 0;
  private shimT = 0;
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
  /** (mt2-qstop) Switch on: the standing pose's effort pace (the procedural stand's speed nodes and the mocap speed set),
   *  falling at most MOCAP_SLOT.paceFall; the effort pace itself otherwise. */
  private mPace = 0;
  /** (mt2-qstop) `mPace` is falling at its limit (a stop from over a walking pace, until it meets the pace). */
  private mEase = false;
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
  /** (anim-n4b) The shallow landing's share (a light landing flexes less), the time off the ground (s), the mantle's
   *  hand plant and the roll's body path this frame. */
  private landL = 1;
  private airT = 0;
  /** (anim-n4b fix) This fall began by letting go of a hold with a wall or a hole's edge in front (`AIR_WALL_FROM`): the air
   *  pose keeps the legs under the body (legs ahead went 30 cm into the ladder's wall, e2e-clip 'ladder down + slide'). */
  private airWall = false;
  /** (anim-n4b fix) Seconds braced in this split: the breath's clock (from the entry, so the owner and a remote copy
   *  breathe in step; the per-rig idle clock put them out of phase). */
  private splitT = 0;
  private travHandW = 0;
  private readonly plant: MantlePlantOut = { w: 0, x: 0, y: 0, z: 0, sink: 0 };
  private readonly rollB: RollBodyOut = { pitch: 0, spin: 0, drop: 0 };
  private readonly splitB: SplitBreathOut = { spPitch: 0, hdPitch: 0, pelRoll: 0, pelX: 0, spRoll: 0, hdRoll: 0 };
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
  /** (G6) The weapon block at a wall (row 12): (anim-n3b) its move 0..1 (linear in time; the pose eases it) and its
   *  hysteresis state. */
  private blockS = 0;
  private blockOn = false;
  /** (anim-n3b) A Wren rig's per-shot body recoil (`recoil.ts`). */
  private readonly bodyRecoil = new BodyRecoil();

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
  /** (anim-natural N3) The clip time a draw from rest entered the overlay at (-1: not one; drawMotion.drawEnter). */
  private swapInT = -1;
  /** Armed carriage weight (armed, or holstered with ready hands), eased ~0.25 s. */
  private carryW = 1;
  /** (G7) The close-quarters bend (rad), pelvis drop (m) and sway (m), eased. */
  private bendS = 0;
  private bendDropS = 0;
  private swayS = 0;
  /** (anim-n4, track A) The hold / carry walk's counter-rotation, lean and step weight (cqGait.ts). */
  private readonly cqGait = new CqGaitLayer();
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
  /** (anim-rework S4) The crouched set's pose (moving and still mixed), a scratch pose, its blended values and scan, and
   *  its share of this frame's keyed pose (the crouch blend). */
  private readonly kCr = newKeyedPose();
  private readonly kF = newKeyedPose();
  /** (mocap-trial-2) Switch on: the hand-keyed crouched pose for the drawn set (kCr holds the capture), the capture's share
   *  of kCr (`crouchSet`) and of this frame's keyed pose (the layer scales). */
  private readonly kCrD = newKeyedPose();
  private cMocap = 0;
  /** (mocap-trial-2, strafe, BRIEF A10) Switch on with the set's strafe: a scratch pose (the right strafe in a blend) and the
   *  side the aimed glide plays the captures by (0 left .. 1 right; eased from the travel's own side, `STRAFE_SIDE_TAU`). */
  private readonly kSt = newKeyedPose();
  private stSide = 0;
  private stShare = 0;
  /** (mocap-trial-2, strafe) The still share the aimed glide's pose takes with the mocap strafe: the drawn set's, eased
   *  rising (STRAFE_IDLE_TAU; a CT stop fades the moving pose out in ~0.1 s, the captures' larger pelvis swing popped it). */
  private stIdle = 1;
  /** (mocap-trial-2, strafe) stIdle's first stage: the fade runs through two (C1: a stop's fade starts at rest, no hips kink). */
  private stIdleA = 1;
  /** (mocap-trial-2, strafe) stIdle's ease a frame (exp(-dt / (STRAFE_IDLE_TAU / 2)), set by `strafeTrack`). */
  private stIdleK = 0;
  /** (mocap-trial-2, strafe) The hips' shift back over the planner's side-steps (m, + right; rate-limited, STRAFE_LEAD). */
  private stHip = 0;
  /** (mocap-trial-2, strafe) The captures' cycle amplitude (the glide's `amp`, eased: STRAFE_AMP_TAU). */
  private stAmp: number = GLIDE.ampMin;
  /** (mocap-trial-2, strafe) This frame's dt and travel length for `strafeTrack` (fields: no boxed double arguments). */
  private stDt = 0;
  /** (mocap-trial-2 strafe fix) The switch last frame (mOn), and the still share easing both ways after it came on. */
  private stWas = false;
  private stIn = false;
  private stDl = 0;
  /** (mocap-trial-2 strafe fix 3) The travel's sideways and forward / back parts, each eased unsigned (the travel direction's
   *  0.18 s), and the sideways share they give (`stSk`): the captures' share by it, not by dirX / dirZ, whose eased vector
   *  passes the origin in a pure L <-> R flip and swung onto forward / back ~1 s after it (the strafe share dipped to 0.04
   *  mid-strafe: the pose went to the forward glide and back, the hips lunged 1.4 cm a frame beyond the pace). */
  private stAX = 0;
  private stAZ = 0;
  private stSk = 0;
  private mcK = 0;
  private cHalf = KEYED_CROUCH_WALK.half;
  private cKneeOut = 0;
  private cDuty: number = KEYED_CROUCH_LEG.walk.duty;
  private cLift: number = KEYED_CROUCH_LEG.walk.lift;
  private cScan = 0;
  private cIdle = 0;
  private cIdleS = 0;
  private cPace = 0;
  /** (afp AF3) The crouched hips-back share (CROUCH_BACK_TURN: 1 straight, 0 turning), eased. */
  private cBackK = 1;
  /** (anim-rework S4) The procedural breath's phase (rad). */
  private breathPh = 0;
  /** (mocap-trial) The mocap set's slots on this graph, the set they ran on (reset on a switch), the planner values they
   *  blend, the mocap share of the standing holstered pose, and the clip feet's source: this frame's speed set sampled
   *  feet (`kA`), its blended root travel per cycle and duty. */
  private readonly mSlots = new MocapSlots();
  private mSet: LocoClipSet = HAND_KEYED_SET;
  /** (mt2-guardgate) This frame's switch for this rig (`LOCO.mocap && i.mocapOk`), its clip set (LOCO.set, or the hand-keyed
   *  set off) and slots (LOCO.slots, or none off): every mocap read in the graph goes through these. */
  private mOn = false;
  /** (afp CI fix) The anim-fix-pass rows apply this frame: a Wren rig (`wrenReady`: the player, the partner, the studio and
   *  menu puppets) or a carrier (`i.mocapOk`; a bare graph). The crouch carriage and step line (AF3) and the crouched gun
   *  (AF4b) are Wren's: guards and every other rig keep theirs (mt2-guardgate; guardPoseGolden "never re-capture"). */
  private afRig = true;
  private mS: LocoClipSet = HAND_KEYED_SET;
  private mSl = false;
  /** (mocap-trial-2, strafe) The switch with the strafe captures in its set: the mocap side-step on the gait clock. */
  private mSide = false;
  private readonly mVals: SlotLegValues = { half: 0, kneeOut: 0, duty: 0, lift: 0 };
  private mShare = 0;
  private mFeet = false;
  private mStride = 0;
  private mDuty = 0;
  /** (fix 2) The duty the gait clock took last frame with clip feet on hand (-1: none) and that frame's gait phase. (fix 2
   *  check) Also without them with the switch on and the gait moving (-1 none); `mCarry`: clip feet on hand last frame,
   *  or gone and the duty still easing back to the planner's. */
  private mDutyGait = -1;
  private mPh = 0;
  private mCarry = false;
  private kCk = 0;
  /** (mixamo-retarget I3) Wren's stance shot (WREN_STANCE, `stanceShot`): its direction (+1 down, -1 up, 0 none), the
   *  direction it reversed from (fading out), last frame's crouch blend, the cross-fade into the new direction (0..1;
   *  1 settled), this frame's crouch blend, weight and dt (fields: no boxed double arguments), and two scratch poses
   *  (the direction's sample, the old direction's during a reversal). Named sn*: kSt / st* are the strafe's. */
  private snDir = 0;
  private snOld = 0;
  private snPrev = 0;
  private snFlip = 1;
  private snK = 0;
  private snW = 0;
  private snDt = 0;
  private readonly kSn = newKeyedPose();
  private readonly kSn2 = newKeyedPose();
  /** (mixamo-kit) The co-op kit's shot for this rig: `TeamPoser` (clips/team.ts) writes it before `rig.animate`
   *  (kitMixamo.ts `KitShotIn`); `kitShot` samples it. */
  readonly kit: KitShotIn = newKitShotIn();
  /** (mixamo-kit) `kitShot`'s state: its eased weight, the take / progress / loop it shows (held while it fades out), the
   *  cross-fade from the pose held at a jump in progress (0..1; 1 settled), this frame's dt and whether the body is free
   *  (traverse or air: the shot replaces the keyed pose, by `keyShot`; on foot it mixes over it), and two scratch poses
   *  (the sample, the held pose). Fields: no boxed double arguments. */
  private kxW = 0;
  private kxClip: KeyedClip | null = null;
  private kxTime = 0;
  private kxLoop = false;
  private kxFade = 1;
  private kxDt = 0;
  private kxFree = false;
  private readonly kKx = newKeyedPose();
  private readonly kKx2 = newKeyedPose();
  /** (anim-rework S5) The eased wall share of the keyed weight and the wall keyed set (wallKeyed.ts). */
  private keyWallS = 0;
  /** (S5 round 2) The wall slide's pelvis twist cut this frame (WALL_KEYS.slideYawCut x the slide x the wall share). */
  private wallYawCut = 0;
  private readonly wallKeys = new WallKeyed();
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
    const s = this.mOn && !crouched ? this.mPace : effortSpeed(this.locoSpeed, crouched); // (mt2-qstop)
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
    this.mOn = LOCO.mocap && i.mocapOk;
    this.afRig = i.mocapOk || this.wrenReady;
    this.mS = this.mOn ? LOCO.set : HAND_KEYED_SET;
    this.mSl = this.mOn && LOCO.slots;
    this.mSide = this.mOn && this.mS.strafeL !== null && this.mS.strafeR !== null;
    let trigger = false;

    // --- lower state (inertialized on change)
    const target = pickLower(i);
    if (target !== this.state) trigger = true;
    this.fade(target, dt, target === 'traverse' ? 0.12 : target === 'kneel' ? KNEEL_FADE : FADE);

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
      if ((i.speed > 0.02 || Math.abs(i.yawRate) > TURN_GAIT_MIN) && i.grounded) this.phase = (this.phase + gaitRate(i.speed, i.yawRate, undefined, lateralShare(i), this.tenseW, clamp(i.crouch, 0, 1), backShare(i), this.glideK(i), this.mSide, this.afRig ? CROUCH_STEP : CROUCH_STEP_GUARD) * dt) % 1;
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
    // (mt2-qstop) switch on with the captured gaits (not the mocapSwitch placeholders: the hand-keyed run), a pace falling
    // from over a walk (MOCAP_SLOT.walkMax) eases the standing pose's pace (`mPace`: the procedural stand's speed nodes and
    // the mocap speed set) down at most MOCAP_SLOT.paceFall until it meets the pace (a one-frame stop 5 -> 0 m/s posed the
    // slowest gait at once: the run's pelvis rose 6.7 cm in the procedural stand and 5.5 cm in the mocap set in a frame; a
    // braked stop crossed the jog band in under two frames). Rising, and a walking stop, it is the frame's pace (as before:
    // a walking stop's walk at its own pace faded 2.1 cm a frame). A stop's fade to the idle (the moving share) is slower
    // from over a walk, by the pose's pace (the run's pelvis is ~14 cm under the idle's: 0.19 of it a frame at 0.08 s)
    const esNow = effortSpeed(locoSpeed, false);
    const capt = this.mOn && this.mS.run !== HAND_KEYED_SET.run;
    const fallTo = this.mPace - MOCAP_SLOT.paceFall * dt;
    this.mEase = capt && esNow < fallTo && (this.mPace > MOCAP_SLOT.walkMax || this.mEase);
    this.mPace = this.mEase ? fallTo : esNow;
    const fadeTau = capt ? 0.08 * Math.max(1, this.mPace / MOCAP_SLOT.walkMax) : 0.08;
    // (mt2-fixC, CHECK-3 item 6d) with the captured gaits the hold comes up out of the stride over HOLD_TAU_CAPT (0.05: a
    // stop from 5 m/s turned the forearm 30.2 deg in a frame in the fade, OFF 28.0)
    this.moveW = approach(this.moveW, moveTarget, holding ? (capt ? HOLD_TAU_CAPT : 0.05) : i.quickStop > 0 && moveTarget < this.moveW ? i.quickStop / 3 : moveTarget < this.moveW ? fadeTau : 0.08, dt);
    const dl = hyp2(i.localX, i.localZ);
    if (dl > 0.1 && i.speed > 0.05) {
      this.dirX = approach(this.dirX, i.localX / dl, 0.18, dt);
      this.dirZ = approach(this.dirZ, i.localZ / dl, 0.18, dt);
    }
    const dn = hyp2(this.dirX, this.dirZ) || 1;
    this.dirX /= dn;
    this.dirZ /= dn;
    // (mocap-trial-2, strafe) switch on: the mocap strafe's side, hips shift and amplitude (`strafeTrack`)
    // (dt and dl as fields, not arguments: a double passed to a call is boxed, 48 B a frame)
    if (this.mOn) {
      // (strafe fix) the switch just on: its tracking was stale (stIdle 0 mid-strafe: the captures popped in at full share and
      // the planted knee jumped 30-33 deg as the rig's switch fade ended): the hips hold from 0 and the pose eased in
      if (!this.stWas) {
        this.stHip = 0;
        this.stIdle = this.stIdleA = 1;
        this.stIn = true;
        this.stAX = this.dirX < 0 ? -this.dirX : this.dirX;
        this.stAZ = this.dirZ < 0 ? -this.dirZ : this.dirZ;
      }
      this.stDt = dt;
      this.stDl = dl;
      this.strafeTrack(i);
    }
    this.stWas = this.mOn;
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
    // (anim-rework S4) holstered in free movement the keyed squat is the crouched idle (KEYED_CROUCH.squat): no kneel
    const squat = KEYED_CROUCH.squat && i.keyedOk && i.ready && !i.armed && !i.wall;
    const wantKneel = POSTURE.kneel && i.kneel && crouchK > 0.05 && (!i.wall || sideK > 0.6) && !squat;
    // (G1 fix) rising out of the kneel over at least kneelTime: the kneel now comes on the stop, so standing straight up
    // from it is common, and the 1.2 rad toe flex let go in standTime stepped the ankle (e2e-anim pose continuity)
    const kStep = dt / (wantKneel ? MOVEMENT.kneelTime : Math.max(MOVEMENT.standTime, MOVEMENT.kneelTime));
    // (G1) a kneel starting: the foot that is ahead stays planted (a stop with the right foot ahead kneels on the left knee)
    // (G6 fix) side-on at a wall the wall-side knee goes down (CT 051917 @ 29.0: the trailing, inner knee near the floor,
    // the open-side knee up under the knee hand), from the wall side alone: the planner's lead differs between the owner
    // and the remote copy (their feet settle at different times), and a flipped kneel moved the knee hand 0.3 m
    // (e2e-netmove wall crouch). Turned toward the travel the wall is on the travel side (wallSide 1: the right).
    // (afp AF4b, Michael P4 "pistol shifts between knees") off the wall: not from the lead (crouched the stance lead is zeroed,
    // so after a sideways stop it was arbitrary and the knee changed between stops): armed, the gun hand's knee (a right hand
    // kneels on the right knee); holstered (free movement squats instead, KEYED_CROUCH.squat) the planted lead foot as before
    // (afp CI fix) Wren's rule only (afRig): guards kneel by the lead as before
    if (wantKneel && this.kneelW <= 0) this.kneelSide = i.wall ? (i.wallSide < 0 ? -1 : 1) : i.armed && this.afRig ? (i.hand < 0 ? -1 : 1) : this.lead < -0.05 ? -1 : 1;
    this.kneelW = clamp(this.kneelW + (wantKneel ? kStep : -kStep), 0, 1);
    const kw = smoothstep(this.kneelW);
    overClip(src, this.kneelSide > 0 ? KNEEL : KNEEL_M, this.idleT * KNEEL_RATE, kw);
    this.slot('kneel', kw, this.idleT);

    // --- start / stop / pivot clips from the motion driver
    if (i.motion === 'start' && this.prevMotion !== 'start') this.startT = 0;
    if (i.motion !== this.prevMotion && (i.motion === 'idle' || i.motion === 'turn') && (this.prevMotion === 'stop' || this.prevMotion === 'pivot')) this.settleT = 0;
    if (i.motion === 'pivot' && this.prevMotion !== 'pivot') trigger = true;
    this.prevMotion = i.motion;
    if (this.startT >= 0) {
      addClip(src, START_SHIFT, this.startT, 1 - crouchK * 0.5);
      this.slot('start', 1, this.startT);
      this.startT += dt * CLIP_RATE.startShift * clipSpeed('startShift'); // (clip-speed, track A)
      if (this.startT > START_SHIFT.duration) this.startT = -1;
    }
    if (this.settleT >= 0) {
      // (mocap-trial) MOCAP_LAYERS.stopSettle on the mocap share (last frame's; 1: as before)
      addClip(src, STOP_SETTLE, this.settleT, mocapLayerK(MOCAP_LAYERS.stopSettle, o.keyMocap));
      this.slot('settle', 1, this.settleT);
      this.settleT += dt * CLIP_RATE.stopSettle * clipSpeed('stopSettle'); // (clip-speed, track A)
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
      // (anim-rework S5) the wall keys carry the standing drop, the slide's chest turn and the side-on trunk: those
      // terms give way to them by the keyed wall weight (last frame's)
      const wkOff = 1 - this.keyW * this.keyWallS;
      src[CH.pelX] = src[CH.pelX]! + st.pelX * ws;
      src[CH.spRoll] = src[CH.spRoll]! + st.spRoll * ws;
      src[CH.pelRoll] = src[CH.pelRoll]! + st.pelRoll * ws;
      src[CH.hdRoll] = src[CH.hdRoll]! + st.hdRoll * ws;
      src[CH.pelY] = src[CH.pelY]! + (st.pelYStand + (st.pelY - st.pelYStand) * crouchK) * flatW * wkOff;
      src[CH.pelPitch] = src[CH.pelPitch]! + st.pelPitch * flatW;
      src[CH.spPitch] = src[CH.spPitch]! + st.spPitch * flatW;
      // (G6, AUDIT-WALLS row 3) sliding standing the chest turns toward the travel (square at rest)
      src[CH.spYaw] = src[CH.spYaw]! + (this.wallS || 0) * st.spYawSlide * this.moveW * (1 - crouchK) * flatW * wkOff;
      // (G6, row 1) side-on: bent well over the knees, deeper than the free crouch's lean
      // (afp AF4b) not with a weapon in the hands: the extra lean put the lowered muzzle into the thighs (the free crouch's
      // lean is kept, ~40 deg)
      src[CH.spPitch] = src[CH.spPitch]! + WALL_SIDE_POSE.spine * sideK * wallW * wkOff * (i.armed && this.afRig ? 0 : 1);
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

    // --- traversal, air, landing
    this.travNow = null;
    if (i.traverse !== 'none') {
      // (ct-prototype D+E fix r1) a team climb-up (no ledge grips) keeps the old one-rise clip
      const tc = i.traverse === 'climbUp' && !i.ledgeClimb ? CLIMB_UP_TEAM : TRAVERSE_CLIP[i.traverse];
      // (mixamo-retarget I2) Wren with a Mixamo capture in the slot plays it (`mixamo.ts`); else the hand-made clip
      // (dt as a field: no boxed double argument)
      if (WREN_TRAV.any) this.mxDt = dt;
      const cap = WREN_TRAV.any && this.wrenReady && this.mixamoTrav(src, i, tc);
      if (!cap) {
        this.travNow = tc; // (mixamo-retarget M5) for `playing.trav` (display only)
        // cycles (climb, crawl) wrap the cadence clock; committed moves clamp their progress
        overClip(src, tc, tc.loop ? i.traverseT - Math.floor(i.traverseT) : clamp(i.traverseT, 0, 1), 1);
      }
      // (I2 fix) a capture giving way to a hand-made clip (or the reverse) inside the traverse state is a source switch
      // the state change does not see (the still hang's capture to the hand-made climb-up jumped fLPitch 0.73 rad and the
      // ankle 31 cm in a frame): inertialized as a state change is. Flag off no capture ever plays: no trigger, as before
      if (cap !== this.mxLast) trigger = true;
      this.mxLast = cap;
      this.slot(i.traverse, 1, i.traverseT);
      if (i.traverse === 'mantle') {
        // (anim-n4b, PASS2 row 61) the hands plant on the top edge (`mantlePlant`, put over the hanging hands below) and
        // the pelvis sinks so the shoulders stay within a bent-arm press of them as the feet rise (the chest's drop as
        // the ready hands' follow below reads it)
        const pp = src[CH.pelPitch]!;
        const sp = src[CH.spPitch]!;
        const h3 = (p.y.shoulder - p.y.waist) / k - CHEST_SEG;
        const chestDrop = ((p.y.waist - p.y.hip) / k) * (1 - Math.cos(pp)) + CHEST_SEG * (1 - Math.cos(0.4 * pp + 0.45 * sp)) + h3 * (1 - Math.cos(0.4 * pp + sp));
        mantlePlant(clamp(i.traverseT, 0, 1), i.travH, i.travD, p.y.shoulder + (src[CH.pelY]! - chestDrop) * k, this.plant);
        src[CH.pelY] = src[CH.pelY]! - this.plant.sink / k;
      } else this.plant.w = 0;
      if (i.traverse === 'split') {
        // (anim-n4b, AUDIT fix 36) braced in the split the trunk breathes and balances over the legs (it was still)
        // (fix) on the split's own clock from the entry: the owner and the remote copy in step (0 at the entry: no pop)
        this.splitT += dt;
        const b = splitBreath(this.splitT, this.splitB);
        src[CH.spPitch] = src[CH.spPitch]! + b.spPitch;
        src[CH.hdPitch] = src[CH.hdPitch]! + b.hdPitch;
        src[CH.pelRoll] = src[CH.pelRoll]! + b.pelRoll;
        src[CH.pelX] = src[CH.pelX]! + b.pelX;
        src[CH.spRoll] = src[CH.spRoll]! + b.spRoll;
        src[CH.hdRoll] = src[CH.hdRoll]! + b.hdRoll;
      }
      // (3.2.0) a sidearm aimed one-handed from a split / hanging inverted: the weapon hand takes the grip
      if ((i.traverse === 'split' || i.traverse === 'pipeInv' || i.traverse === 'rappel') && i.raise > 0) src[CH.grip] = Math.min(1, i.raise * 1.5);
    } else this.mxLast = false;
    if (i.traverse !== 'split') this.splitT = 0;
    // (mixamo-retarget I2) the kind a climb-up started from (a lip hang, a ladder) and the hang's clocks: read only by
    // `mixamoTrav`, so the hand-made path is unchanged
    if (i.traverse !== 'climbUp') this.travFrom = i.traverse;
    if (i.traverse !== 'hang') {
      this.hangLip = false;
      this.hangMoveW = 0;
      this.hangDir = 0.5;
      this.hangIdleT = 0;
      this.shimT = 0;
    }
    this.airT = i.grounded || i.traverse !== 'none' ? 0 : this.airT + dt;
    // (anim-n4b fix) a fall straight out of a wall-front hold (a ladder, a drainpipe, a hang, ...) keeps the legs under the
    // body; a fall from anything else (a walk off a ledge, a jump) leads with them ('drop' keeps it: the vent drop's lower
    // ends in it, and a walk off a ledge starts grounded)
    if (i.traverse !== 'none' && i.traverse !== 'drop') this.airWall = AIR_WALL_FROM.includes(i.traverse);
    else if (i.grounded) this.airWall = false;
    if (!i.grounded) {
      src[CH.fLY] = src[CH.fLY]! + 0.14;
      src[CH.fRY] = src[CH.fRY]! + 0.1;
      src[CH.pelPitch] = src[CH.pelPitch]! + 0.1;
      // (anim-n4b, PASS2 row 64) a fall (off a ledge, let go of a hang): the legs a little ahead, the chest back (the arms
      // out and up: freeHands, AIR_POSE)
      const aw = airPoseW(this.airT);
      if (aw > 0) {
        const lw = this.airWall ? 0 : aw;
        src[CH.fLZ] = src[CH.fLZ]! + AIR_POSE.lead * lw;
        src[CH.fRZ] = src[CH.fRZ]! + AIR_POSE.trail * lw;
        src[CH.fLY] = src[CH.fLY]! + AIR_POSE.lift * lw;
        src[CH.spPitch] = src[CH.spPitch]! + AIR_POSE.chest * aw;
      }
    }
    // (anim-n4b, PASS2 row 64) any landing from about half a metre flexes, by how hard it lands (`landLight` / `landDeep`):
    // the knees and hips go deeper the longer the drop, then recover (was: 0.9 m and up, the deep one full from ~1.1 m)
    if (i.landing > LAND_ABSORB.lightFrom && this.landT < 0) {
      this.landT = 0;
      // (G1, audit row 18) a drop of about a metre and more lands deep, arms out
      // (not into a traversal: a landing roll's tumble with the deep dip put the body 12 cm into the floor, e2e-clip)
      this.landK = i.traverse === 'none' ? landDeep(i.landing) : 0;
      this.landL = landLight(i.landing);
    }
    if (this.landT >= 0) {
      const lk = this.landK;
      if (lk < 1) addClip(src, LAND, this.landT, (1 - lk) * this.landL);
      // (crouched already deep: the dip only takes it the rest of the way)
      // (a traversal taking over, the landing roll started on the next frame: the deep landing gives way to it)
      if (i.traverse !== 'none') this.landK = 0;
      if (lk > 0 && i.traverse === 'none') addClip(src, LAND_DEEP, this.landT, lk * (1 - 0.75 * crouchK));
      this.landT += dt * CLIP_RATE.land * clipSpeed('land'); // (clip-speed, track A)
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
    // (anim-natural N3) the carriage comes back over the incoming gun's lift and present (drawRelease from the lift,
    // eased), not as a second move after the swap ends
    const swapping = i.swap >= 0 && i.swapFrom !== i.swapTo;
    const swapRel = swapping ? drawRelease(i.swap, DRAW_CUR[i.swapTo === 'thigh' ? 'pistol' : 'rifle'], 0) : 0;
    const weaponSwap = swapRel > 0.5;
    this.readyW = approach(this.readyW, !i.armed && i.ready && i.traverse === 'none' && !weaponSwap ? 1 : 0, 0.25, dt);
    // the carriage weight: armed or holstered with ready hands (eased, so it never pops as the weapon leaves the
    // hands at the end of a holster, or across a swap's empty-hands beat)
    const carryOn = i.armed || (i.ready && i.traverse === 'none');
    this.carryW = approach(this.carryW, carryOn ? 1 - swapRel : 0, swapping ? CARRY_SWAP_TAU : 0.25, dt);
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

    // --- upper body: aim, lean (head first)
    const aimPitch = clamp(i.aimPitch, -1.2, 1.2);
    const raise = this.raiseS;
    // (locomotion step 21, D2) breathing only after BREATH.still s still (idle, crouch idle, kneel); none moving or aiming
    // (fix 21-5) it fades in with the stillness and out over ~0.2 s on the first move (no one-frame snap)
    const breathT = smoothstep((this.stillT - BREATH.still) / BREATH.fadeIn);
    this.breathW = breathT >= this.breathW ? breathT : approach(this.breathW, breathT, BREATH.fadeOut, dt);
    // (anim-rework S4) on its own phase: slower crouched (BREATH.rateCrouch), never a jump as the rate changes
    this.breathPh = (this.breathPh + dt * (BREATH.rate + (BREATH.rateCrouch - BREATH.rate) * crouchK)) % (Math.PI * 2);
    const breath = Math.sin(this.breathPh) * BREATH.amp * this.breathW * (1 - raise);
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
    src[CH.hdPitch] = src[CH.hdPitch]! - aimPitch * 0.45;
    src[CH.hdYaw] = src[CH.hdYaw]! + clamp(i.aimYaw, -1.2, 1.2) * 0.4 - raise * 0.18 * handS + hd * 0.12;
    src[CH.hdRoll] = src[CH.hdRoll]! + hd * 0.22;
    if (Math.abs(i.lean) > 0.01 || Math.abs(hd) > 0.01) this.slot('lean', Math.abs(hd), bd);

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
    const rl = pistolW > 0 ? this.pistolLow(pistolW) : this.readyLow;
    const rh = READY_POSES.high;
    const rc = READY_POSES.compressed;
    // (locomotion step 21, D2) no free-running weapon sway: the only idle weapon motion is what the chest breathing carries
    // (anim-n3b, PASS2 row 25) a Wren rig: the per-shot body kick (recoil.ts); every other rig: the G2 envelope spring
    let rcBack: number, rcUp: number, rcFlip: number, rcSpine: number, rcYaw: number, rcPel: number;
    // (the sight-to-eye hold would take the kick's lift straight back out: the sight is let rise with it, `RECOIL_SIGHT_ARM`)
    let rcSight = 0;
    if (this.wrenReady) {
      const br = this.bodyRecoil;
      br.step(i.kick, pistolW, TUNE_CUR.recoilMul, dt);
      rcBack = br.back;
      rcUp = br.up;
      rcFlip = br.flip;
      rcSpine = br.spine;
      rcYaw = br.yaw * handS;
      rcPel = br.pelvis;
      rcSight = rcUp + rcFlip * RECOIL_SIGHT_ARM;
    } else {
      const rec = this.recoil.step(i.kick, 26 / Math.sqrt(mass), dt);
      rcBack = (rec * RECOIL.back) / Math.sqrt(mass);
      rcUp = 0;
      rcFlip = (rec * RECOIL.flip) / mass;
      rcSpine = (rec * RECOIL.spine) / mass;
      rcYaw = 0;
      rcPel = (rec * RECOIL.pelvis) / mass;
    }
    // raised: up to the eye
    const sight = raiseW;
    // (playtest 2) the sight raise position is carried down with the hand swap: at the mid-point the weapon is on the
    // compressed carry (ready = 1), and the full raise on top of it flicked the gun up high
    const sightPos = sight * (1 - 0.5 * swapBump);
    // at a wall the ready is the wall tuck: muzzle down along the wall, turned away from it (the rig mirrors
    // yaw with the hand, so the away side is relative to the hand holding it)
    this.wallReadyW = approach(this.wallReadyW, atWall ? 1 : 0, 0.25, dt);
    // (afp AF4b, Michael P4 "with rifle clips") crouched at a wall the body is side-on, the free crouch carriage along the
    // travel: the open-ground carry, not the tuck (muzzle down along the wall, which side-on and bent over put the muzzle
    // into the thighs). By the crouch, not the body's turn, so a reversal (the body turning through square) keeps the carry
    // and never swings the gun into the tuck and back.
    // (afp CI fix) Wren's only (afRig; gs 0 on a guard: the wall tuck, no CROUCH_GUN.wall, as before)
    const gs = this.afRig ? smoothstep((crouchK - 0.35) / 0.5) : 0;
    const cw = this.wallReadyW * (1 - gs);
    const nw = 1 - cw;
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
    src[CH.wpY] = ready * (rl.y * cl + rh.y * chh + rc.y * cc + cr.y * cw) + rcUp + sightPos * SIGHT_RAISE.y;
    src[CH.wpZ] = ready * (rl.z * cl + rh.z * chh + rc.z * cc + cr.z * cw) - rcBack + sightPos * SIGHT_RAISE.z;
    const pistolK = pistolW * sightPos;
    if (pistolK > 0) {
      src[CH.wpX] = src[CH.wpX]! + pistolK * PISTOL_REACH.x;
      src[CH.wpY] = src[CH.wpY]! + pistolK * PISTOL_REACH.y;
      // (afp AF4b) crouched the raised pistol is held further out (PISTOL_REACH_CROUCH): close in, the rig's body clearance
      // pushed it 0-3.6 cm in and out each step of the crouched gait (grip 1.01 cm a frame)
      src[CH.wpZ] = src[CH.wpZ]! + pistolK * (PISTOL_REACH.z + (this.afRig ? PISTOL_REACH_CROUCH * crouchK : 0));
      // (G2, AUDIT-AIM row 5) the chest forward over the raised pistol (it leaned back with the hips forward)
      src[CH.spPitch] = src[CH.spPitch]! + pistolK * PISTOL_REACH.lean;
    }
    // (G2) the head rolls onto a stock only: a pistol has none. (G2 fix) Except leaning out at a wall-edge peek: the head
    // rolls out past the edge over the raised pistol as it did before G2 (head first, the chest behind the edge: G36 / A3,
    // e2e-stealth-ai wall peek), eased in with the head's lean
    const peekHeadK = smoothstep(Math.abs(hd) / SIGHT_HEAD.peekFull);
    src[CH.hdRoll] = src[CH.hdRoll]! + sight * SIGHT_HEAD.roll * handS * (1 - pistolW * (1 - peekHeadK));
    // (G6, row 12) blocked by a wall in front (WALL_BLOCK): no weld. (anim-n3b, PASS2 row 24) hysteresis, then one move
    // eased in time; the gun keeps pointing along the aim (out.aimW), so the tip puts the muzzle below the aim line
    const blockWant = i.wallBlock * raise;
    if (blockWant >= WALL_BLOCK.on) this.blockOn = true;
    else if (blockWant <= WALL_BLOCK.off) this.blockOn = false;
    this.blockS = clamp(this.blockS + (this.blockOn ? dt : -dt) / WALL_BLOCK.time, 0, 1);
    const blockK = smoothstep(this.blockS);
    this.out.weld = sightPos * (1 - blockK);
    this.out.sightDrop = -PISTOL_REACH.y * pistolW - rcSight;
    // (G2 fix) and the neck dips onto the raised pistol at the peek (the head out past the edge with the gun, as before G2)
    this.out.stockWeld = 1 - pistolW * (1 - peekHeadK);
    this.out.aimW = raiseW;
    // landing roll: (anim-n4b, PASS2 row 66) a grounded shoulder roll: the body dives forward low, spins about the
    // hips-to-feet line across the back and comes up (`rollBody`); the pivot sinks with the dive and the path's ride
    // comes back out of it, so the pelvis stays near the floor and the feet never rise above the hips
    if (i.traverse === 'roll') {
      const rt = clamp(i.traverseT, 0, 1);
      const rb = rollBody(rt, this.rollB);
      this.out.tumble = rb.pitch;
      this.out.tumbleSpin = rb.spin;
      this.out.tumbleDrop = rb.drop * k + rollRide(rt);
      this.out.tumbleLift = true;
    } else {
      this.out.tumble = i.tumble;
      this.out.tumbleSpin = 0;
      this.out.tumbleDrop = 0;
      this.out.tumbleLift = false;
    }
    // leaning out at an edge the tucked muzzle comes up towards level (the lean would roll it onto the leg)
    const crPitch = cr.pitch * (1 - 0.6 * Math.min(1, Math.abs(bd)));
    src[CH.wpPitch] = ready * (rl.pitch * cl + rh.pitch * chh + rc.pitch * cc + crPitch * cw) - rcFlip;
    src[CH.wpYaw] = ready * (rl.yaw * cl + rh.yaw * chh + rc.yaw * cc + cr.yaw * cw * awayYaw);
    src[CH.wpRoll] = ready * (rl.roll * cl + rh.roll * chh + rc.roll * cc + cr.roll * cw);
    if (blockK > 0) {
      // (anim-n3b) the muzzle tipped down about the butt (the grip goes down and back on that arc), pulled in, canted
      const tip = clamp(WALL_BLOCK.maxDown + i.aimPitch, WALL_BLOCK.minTip, WALL_BLOCK.tip) * blockK;
      const butt = WALL_BLOCK.butt + (WALL_BLOCK.buttPistol - WALL_BLOCK.butt) * pistolW;
      const pull = WALL_BLOCK.pull + (WALL_BLOCK.pullPistol - WALL_BLOCK.pull) * pistolW;
      src[CH.wpPitch] = src[CH.wpPitch]! + tip;
      src[CH.wpY] = src[CH.wpY]! - butt * Math.sin(tip);
      src[CH.wpZ] = src[CH.wpZ]! - butt * (1 - Math.cos(tip)) - pull * blockK;
      src[CH.wpRoll] = src[CH.wpRoll]! + WALL_BLOCK.cant * blockK;
    }
    // bent over in a crouch the lowered muzzle comes up with the chest and the gun sits further out, clear of
    // the thighs (the lowered weapon is oriented with the body, not the spine)
    // (the open-ground carries only: the wall tuck has its own pose)
    const bendK = HUNCH.crouch * crouchK * (1 - 0.5 * this.raiseS) * ready * nw;
    src[CH.wpPitch] = src[CH.wpPitch]! - bendK * 1.1;
    src[CH.wpZ] = src[CH.wpZ]! + bendK * 0.08;
    src[CH.wpY] = src[CH.wpY]! + bendK * 0.06;
    // (afp AF4b, Michael P4 "pistol shifts between knees") crouched, the pistol's low ready (Michael's standing hang, y -0.34)
    // sat at knee height between the knees, and the rig's body clearance pushed it out to one side or the other frame to
    // frame: crouched it comes up and ahead (CROUCH_GUN.pistol); side-on at a crouched wall the carry rises over the knees
    // (CROUCH_GUN.wall)
    const CG = CROUCH_GUN;
    // (by the crouch or the kneel, whichever is more: standing up from the kneel the crouch runs out in standTime while the
    // knees are still up (the kneel eases out over kneelTime); by the crouch alone the hang dropped into the rising thighs
    // and the body clearance threw it 11 cm sideways (e2e-anim low ready still crouch -> stand, pistol: 14.5 cm a frame))
    // (afp CI fix: 0 on a guard; `sk` is through `gs`)
    const pck = this.afRig ? pistolW * Math.max(crouchK, smoothstep(this.kneelW)) * ready * cl : 0;
    const sk = gs * wallW * ready * nw * (1 - 0.5 * this.raiseS);
    // (and through a kneel going down or coming up the body folds over the gun: the hang rises with it, CROUCH_GUN.pistol.kneel)
    const kq = 4 * this.kneelW * (1 - this.kneelW);
    const kb = pck * kq * kq * CG.pistol.kneel;
    src[CH.wpY] = src[CH.wpY]! + CG.pistol.y * pck + CG.wall.y * sk + kb;
    src[CH.wpZ] = src[CH.wpZ]! + CG.pistol.z * pck + CG.wall.z * sk;
    // (kneeling at the wall the trunk is upright: the muzzle is not tipped up there, or it pointed at the sky)
    src[CH.wpPitch] = src[CH.wpPitch]! + CG.pistol.pitch * pck + CG.wall.pitch * sk * (1 - smoothstep(this.kneelW));
    // recoil absorbed through the shoulder and spine ((anim-n3b) a Wren rig: the shooting shoulder pushed back too)
    src[CH.spPitch] = src[CH.spPitch]! - rcSpine;
    src[CH.spYaw] = src[CH.spYaw]! + rcYaw;
    src[CH.pelPitch] = src[CH.pelPitch]! - rcPel;
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
    this.out.kneel = i.wall ? 0 : smoothstep(this.kneelW);
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
    // (anim-n4b, PASS2 rows 61, 64, 66) the roll's and the ledge drop's own hands over the hanging defaults (the hands above
    // overwrite every clip's), and the mantle's hands planted on the edge (from the defaults, by the plant's weight)
    const clipHands = i.traverse === 'roll' || i.traverse === 'drop';
    this.travHandW = approach(this.travHandW, clipHands ? 1 : this.plant.w, 0.04, dt);
    if (clipHands) {
      const tc = i.traverse === 'roll' ? ROLL : DROP;
      const tt = clamp(i.traverseT, 0, 1);
      const hw = this.travHandW; // (anim-n4b fix) eased in from the hands before (it overwrote at full weight: a pop)
      for (let h = 0; h < TRAV_CLIP_HANDS.length; h++) {
        const ch = TRAV_CLIP_HANDS[h]!;
        const cv = tc.curves[ch];
        if (cv) src[ch] = src[ch]! + (evalCurve(cv, tt) - src[ch]!) * hw;
      }
    } else if (this.plant.w > 0) {
      const pl = this.plant;
      blendHand(src, CH.hLX, -pl.x / k, pl.y / k, pl.z / k, pl.w);
      blendHand(src, CH.hRX, pl.x / k, pl.y / k, pl.z / k, pl.w);
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
    // (anim-natural N3) a draw from rest (one slot, entering at the holstered beat) brings the clip in over its reach
    // (drawEnter); a holster's overlay fades out slower once the gun is seated (the hand lets go, SWAP_FADE_HOLSTER)
    const oneSlot = i.swapFrom === i.swapTo;
    if (swapOn) {
      if (this.swapW === 0) this.swapInT = oneSlot && i.swap >= DRAW_BEAT - 1e-3 ? i.swap : -1;
      this.swapW = Math.min(1, this.swapW + SWAP_FADE * dt);
      this.swapLastT = i.swap;
    } else this.swapW = Math.max(0, this.swapW - (oneSlot && this.swapLastT <= DRAW_BEAT + 1e-3 ? SWAP_FADE_HOLSTER : SWAP_FADE) * dt);
    if (this.swapW > 0) {
      const st = swapOn ? i.swap : this.swapLastT;
      // (anim-natural N3) eased in and out (the fade was linear: the hand left the slot at a constant speed and stopped
      // dead), and the incoming gun's part hands over to the ready / aim pose while it presents (drawMotion.drawRelease):
      // the clip's own end pose (a level pocket, the chest square, the support hand off) never shows, so nothing moves
      // again when the swap ends
      const dm = DRAW_CUR[i.swapTo === 'thigh' ? 'pistol' : 'rifle'];
      const sw = smoothstep(this.swapW) * drawEnter(st, this.swapInT, dm) * drawRelease(st, dm);
      overClip(src, swapClipFor(i.swapFrom, i.swapTo), st, sw);
      this.slot('swap', sw, st);
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
      // (anim-natural N4c, AUDIT row 49) a Wren rig's hip and trunk turn is the rig's strike body layer (strikeBody.ts,
      // after the keyed trunk, which wiped this turn: 0.8 deg of shoulder turn); every other rig keeps this one
      if (!this.wrenReady) {
        const turn = 0.22 * wWind - 0.4 * wStrike;
        src[CH.pelYaw] = src[CH.pelYaw]! + turn * 0.4;
        src[CH.spYaw] = src[CH.spYaw]! + turn * 0.6;
        src[CH.hdYaw] = src[CH.hdYaw]! - turn * 0.5;
      }
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
    // (anim-n4b fix) a team holder's brace bends too (team pose `applyB`, traverse 'brace'): not a hold or a carry, so no
    // close-quarters walk or hostage brace on it
    const cqOn = (i.bend > 0 || i.bendDrop > 0) && i.traverse !== 'brace';
    this.cqGait.apply(src, cqOn, i.cqBody, i.cqCarry, this.phase, this.moveW, dt, this.swayS); // (anim-n4, track A; anim-n4b, track A: the hold sway drives the still brace)

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
    // (anim-n4b) less the share a traversal's own hands hold (the mantle's plant, the roll's and the drop's keys)
    const fw = this.readyW * (1 - this.reloadW) * (1 - this.swapW) * (1 - this.handClipW) * (1 - this.travHandW);
    this.writeRowW(i, hx);
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
    // (CT prototype G8) the keyed walk: standing, moving at walk pace, on foot (no wall, traversal, air), not
    // raised to aim or dashing; its arms only with free hands (holstered, no reload / swap / throw, no melee)
    {
      const es = effortSpeed(locoSpeed, false);
      const B = KEYED_WALK_BAND;
      const band = 1 - smoothstep((es - B.from) / (B.to - B.from));
      const onFoot = i.keyedOk && i.grounded && i.traverse === 'none' && !i.wall ? 1 : 0;
      // (not turning on the spot: the turn's own stepping, last frame's turning share; a walking turn keeps it: its low
      // pelvis let go mid-turn lifted the head 8 cm, g1Locomotion)
      const spin = o.gait.turning * (1 - smoothstep((i.speed - 0.3) / 0.4));
      // (mocap-trial) the mocap set's slots: their timers every frame while the set has one filled (reset on a switch)
      const S = this.mS;
      if (S !== this.mSet) {
        this.mSet = S;
        this.mSlots.reset();
      }
      if (this.mSl) this.mSlots.update(dt, S, i.speed, i.accelFwd, i.yawRate);
      // (anim-rework S2) holstered (free hands, `fw`) the keyed set covers every standing pace (walk, jog, run as one
      // blend, KEYED_GAITS) and the standing idle (KEYED_IDLE: breathing, weight shifts, a head scan, the arms in); drawn
      // it keeps the walk band as before (slice 3 owns the drawn carriage)
      const bandK = band + (1 - band) * fw;
      // (anim-rework S4) standing and crouched (the crouched set mixes in by the crouch blend), not in the tense sneak (its
      // own carriage and hands) or a kneel (drawn and still crouched: the procedural kneel; holstered the keyed squat)
      const crouchOn = (1 - this.tenseW) * (1 - smoothstep(this.kneelW));
      const gate = onFoot * (1 - wallW) * (1 - this.raiseS) * (1 - this.dashS) * crouchOn;
      // (mocap-trial) a filled turn-in-place slot keeps the keyed set on through a spin (its clip is the turn)
      // (mocap-trial-2, crouch) crouched the slots give way to the crouched set, so a crouched spin cuts the keyed set by the
      // crouch as with the hand-keyed set (the planted feet slid 4-5 cm in a 0.5 m/s x 3 rad/s crouched spin, switch on)
      const loco = this.moveW * bandK * (1 - (S.turnInPlace !== null ? spin * crouchK : spin));
      const still = (1 - this.moveW) * fw;
      // (anim-rework S3) drawn (a carrier with the gun out, standing on foot): the drawn set at every pace and still
      // (ready stance; the low ready on the walk / jog / run legs; aiming the glide by direction), in place of the old
      // walk band; (anim-rework S4) crouched the crouched set's legs under the procedural gun upper body
      const dOn = i.keyedDrawn && i.grounded && i.traverse === 'none' && !i.wall ? 1 - fw : 0;
      const gateD = dOn * (1 - wallW) * (1 - this.dashS) * crouchOn;
      const locoD = this.moveW * (1 - spin);
      const stillD = 1 - this.moveW;
      const kH = gate * (loco + still) * (1 - dOn);
      const kDr = gateD * (locoD + stillD);
      // (anim-rework S5) back to a wall: the wall keyed set (wallKeyed.ts), holstered (free hands) on foot and not
      // aiming; a drawn weapon keeps the procedural wall pose (WALL_READY, the edge lean-outs)
      const kWl = i.wall && i.grounded && i.traverse === 'none' ? wallW * fw * (1 - this.raiseS) : 0;
      const kT = kH + kDr + kWl;
      this.keyW = approach(this.keyW, kT, B.tau, dt);
      o.keyW = this.keyW < 1e-4 ? 0 : this.keyW;
      if (kT > 1e-4) this.keyDS = approach(this.keyDS, kDr / kT, B.tau, dt);
      if (kT > 1e-4) this.keyWallS = approach(this.keyWallS, kWl / kT, B.tau, dt);
      this.readyStillS = approach(this.readyStillS, gateD, READY_STANCE.tau, dt);
      const dS = o.keyW > 0 ? this.keyDS : 0;
      o.keyArmW = o.keyW * fw * (1 - dS) * (i.melee >= 0 ? 0 : 1);
      this.keyHolS = approach(this.keyHolS, gate * fw, B.tau, dt);
      o.keyHol = this.keyHolS < 1e-4 ? 0 : this.keyHolS;
      // (anim-rework S4) the crouched set by the crouch blend (one pose for both sets: its still share as the drawn set's)
      this.kCk = o.keyW > 0 ? crouchK : 0;
      const cStill = locoD + stillD > 1e-4 ? stillD / (locoD + stillD) : 0;
      this.cIdleS = approach(this.cIdleS, cStill, cStill > this.cIdleS ? KEYED_CROUCH.settleIn : KEYED_CROUCH.settleOut, dt);
      this.cPace = approach(this.cPace, effortSpeed(locoSpeed, true), KEYED_CROUCH.paceTau / Math.max(0.05, this.moveW), dt);
      // (approach and clamp written out: a call the graph does not inline boxes its double arguments, 16 B each a frame)
      const cbT = 1 - Math.abs(i.yawRate) / CROUCH_BACK_TURN.rate;
      const cbC = Math.max(0, Math.min(1, cbT));
      this.cBackK = cbC + (this.cBackK - cbC) * Math.exp(-dt / CROUCH_BACK_TURN.tau);
      // (mocap-trial-2) switch on, the crouched sneak's capture (LOCO.set.crouchWalk) into kCr; the drawn set's crouched legs
      // stay hand-keyed (kCrD, as the drawn speed set: weapons are not part of the mocap trial)
      const mcC = this.mOn ? this.mS.crouchWalk : null;
      if (this.kCk > 0) {
        if (mcC !== null && dS > 1e-4) this.crouchSet(ph, this.cPace, this.cIdleS, this.kCrD, null);
        this.crouchSet(ph, this.cPace, this.cIdleS, this.kCr, mcC);
      }
      this.keyedSet(ph, this.mOn ? this.mPace : es, loco + still > 1e-4 ? still / (loco + still) : 0, o);
      // (mixamo-retarget I3) Wren's stance shot over the standing / crouched pose by the still share (moving keeps the
      // hand-made blend), less the drawn and wall shares; both shots null (the flag off): skipped, byte-identical
      if (this.wrenReady && (WREN_STANCE.down !== null || WREN_STANCE.up !== null)) {
        this.snK = crouchK;
        this.snDt = dt;
        this.snW = o.keyW > 0 && loco + still > 1e-4 ? (still / (loco + still)) * (1 - dS) * (1 - this.keyWallS) : 0;
        this.stanceShot(o);
      }
      // (mixamo-kit) the co-op kit's Mixamo shot (kitMixamo.ts; TeamPoser writes `kit`): a free body (the holder's brace,
      // the climber's climb-up) takes it by `keyShot`, a crawler mixes it over the keyed pose; no kit row on: skipped
      if (this.wrenReady && KIT_TABLES[1].any) {
        this.kxDt = dt;
        this.kxFree = !i.grounded || i.traverse !== 'none';
        this.kitShot(o);
      }
      o.keyDrawn = dS;
      o.keyTrunk = 1 - dS * this.raiseS;
      if (dS > 1e-4) this.keyedDrawnSet(ph, es, locoD + stillD > 1e-4 ? stillD / (locoD + stillD) : 0, dS, pose, o);
      // (anim-rework S4) the crouched clips' height is the crouch's whole depth: by the crouched share it replaces the
      // procedural one (the rig adds the keyed height to the pose's)
      if (this.kCk > 0) o.keyed.pel[1] = o.keyed.pel[1]! - this.kCk * pose[CH.pelY]!;
      // (anim-rework S4) the squat's hands on the knees: its share of the keyed arms
      o.kneeRest = this.kCk > 0 ? o.keyArmW * this.kCk * this.cIdle : 0;
      if (o.keyW > 0 && this.keyWallS > 1e-4) this.keyedWallSet(ph, this.keyWallS, crouchK, Math.abs(bd) / WALL_KEYS.peekLean, pose, o);
      // (mocap-trial) the mocap set's share of the keyed pose: the standing holstered gait and slots, less the drawn,
      // crouched and wall shares mixed over it (0 with the switch off)
      o.keyMocap = this.mOn ? o.keyW * (1 - dS) * (1 - this.kCk) * (1 - this.keyWallS) * this.mShare : 0;
      // (mocap-trial-2, strafe) the mocap strafe's share (keyedDrawnSet's, by the drawn share; 0 with the switch off)
      o.keyStrafe = this.mOn && dS > 1e-4 ? dS * this.stShare : 0;
      // (mocap-trial-2) the crouched capture's share of the keyed pose, for the layer scales (bodyMotion); not in keyMocap:
      // clip feet and the rig's mocap rules stay with the standing gait (the crouch keeps the planner's feet, BRIEF A5)
      this.mcK = mcC !== null ? o.keyW * (1 - dS) * this.kCk * (1 - this.keyWallS) * this.cMocap : 0;
      // (merge S4 x S5) the squat's hands on the knees give way to the wall set's arms by its share
      o.kneeRest *= 1 - this.keyWallS;
    }
    this.writeTargets(pose, i, k, ph);
    this.out.weaponBob = this.bobResidual;
    o.readyFollow = fw;
    o.readyShoulder.x = p.shoulderHalf;
    o.readyShoulder.y = p.y.shoulder + this.readyFy * fw * k;
    o.readyShoulder.z = -0.01 + this.readyFz * fw * k;
    if (this.drive !== null) studioDriveTargets(this.drive, o, dt); // (anim-studio) the loop player's clip; null outside the studio
    this.bodyMotion(i, o, dt);
    this.notePlaying(o); // (tuner-clarity S1) after the studio drive; display only
    return o;
  }

  /**
   * (tuner-clarity S1, BRIEF A3) `playing` from this frame's targets: the capture share is the standing holstered gait and
   * slots (`keyMocap`), the crouched sneak capture (`mcK`) and the aimed strafe capture (`keyStrafe` of the keyed share);
   * the rest of the keyed share is hand-keyed, the rest of the body graph code. The move: the strongest capture part (the
   * strongest slot's part of the standing capture, the gait's rest of it, the sneak, the strafe); with no capture share
   * the holstered speed set's nearer clip. A studio drive with a clip: its clip, no capture (`studioDriveTargets`).
   * Numbers and one reference written field by field; its one argument an object (no boxed doubles). No allocation.
   */
  private notePlaying(o: RigTargets): void {
    const P = this.playing;
    const d = this.drive;
    if (d !== null && d.clip !== null) {
      P.mocap = 0;
      P.keyed = o.keyW;
      P.code = 1 - o.keyW;
      P.move = MOVE_IDS.clip;
      P.clip = d.clip;
      P.trav = null;
      return;
    }
    P.trav = this.travNow; // (mixamo-retarget M5) the traversal clip (graph code's share)
    const km = o.keyMocap;
    const kc = this.mcK;
    const sk = o.keyW * o.keyStrafe;
    const m = km + kc + sk;
    P.mocap = m;
    P.keyed = o.keyW - m;
    P.code = 1 - o.keyW;
    P.clip = null;
    let mv: number = this.sNear;
    let best = km;
    if (this.mSl && km > 0 && this.mShare > 0) {
      // the strongest slot; its part of the standing capture (`mShare` holds the gait and every slot over it)
      const sl = this.mSlots;
      let w = sl.wStart;
      let sm: number = MOVE_IDS.start;
      if (sl.wStop > w) {
        w = sl.wStop;
        sm = MOVE_IDS.stop;
      }
      if (sl.wTurn > w) {
        w = sl.wTurn;
        sm = sl.turnSpot ? MOVE_IDS.turnSpot : MOVE_IDS.turnMove;
      }
      const sp = (km * w) / this.mShare;
      best = km - sp;
      if (sp > best) {
        best = sp;
        mv = sm;
      }
    }
    if (kc > best) {
      best = kc;
      mv = MOVE_IDS.sneak;
    }
    if (sk > best) mv = MOVE_IDS.strafe;
    P.move = mv;
  }

  /** (anim-natural-n2) The body motion layer's inputs and eased gate (preallocated). */
  private readonly motionIn = newBodyMotionIn();
  private motionGate = 0;

  /**
   * (anim-natural-n2 step 2) The body motion layer into `o.motion` (`bodyMotion.ts`), on this frame's gait phase: a Wren
   * rig (`wrenReady`) on foot (no wall, traversal, air, close-quarters hold / bend, melee, dash, tense sneak or
   * kneel), the gate eased over KEYED_WALK_BAND.tau. Graph-internal inputs only (co-op parity). No allocation.
   */
  private bodyMotion(i: AnimInput, o: RigTargets, dt: number): void {
    const onFoot = this.wrenReady && (i.keyedOk || i.keyedDrawn) && i.grounded && i.traverse === 'none' && !i.wall && i.melee < 0 ? 1 : 0;
    const target = onFoot * (1 - this.wallW) * (1 - this.dashS) * (1 - this.tenseW) * (1 - smoothstep(this.kneelW));
    this.motionGate = approach(this.motionGate, target, KEYED_WALK_BAND.tau, dt);
    if (this.motionGate < 1e-4) this.motionGate = 0;
    const m = this.motionIn;
    m.gate = this.motionGate;
    if (m.gate > 0) {
      m.phase = o.gait.phase;
      m.move = this.moveW;
      m.crouch = clamp(i.crouch, 0, 1);
      m.drawn = o.keyDrawn;
      m.aim = this.raiseS;
      bodyMotionBands(m, effortSpeed(this.locoSpeed, false), this.cPace, KEYED_GAITS, KEYED_CROUCH);
    }
    bodyMotionStep(m, o.motion);
    // (CHECK-4 should-fix 2) the studio's loop player shows Michael's keys as keyed: no arm speed cap while it drives
    // (the drive bypasses the pace bands, so the cap would read the walk's)
    if (this.drive !== null) o.motion.armSpeed = Infinity;
    // (mocap-trial) on the mocap share each part of the layer by its MOCAP_LAYERS scale (the capture holds its own trunk
    // counter-rotation, sway, head motion and arm speed); 0 with the switch off, so the layer is exactly as above
    // (mocap-trial-2) and on the crouched capture's share (mcK, 0 with the switch off)
    const sM = o.keyMocap + this.mcK;
    if (sM > 0) this.mocapMotionLayer(o.motion, sM);
  }

  /**
   * (mocap-trial) The mocap share `s` (> 0) of the motion layer: each part by its MOCAP_LAYERS scale (the capture holds its
   * own trunk counter-rotation, sway, head motion and arm speed). (mocap-trial-2) Its own small method with the multipliers
   * written out (`mocapLayerK`'s `scale === 1 ? 1 : layerMul`, as a ternary): in `bodyMotion`, past V8's inlining budget,
   * each `mocapLayerK` call boxed its doubles, 6 a frame on the crouched capture (MT2-ALLOC.md). No allocation.
   */
  private mocapMotionLayer(mo: BodyMotion, s: number): void {
    const L = MOCAP_LAYERS;
    const aT = L.motionTrunk;
    const kt = aT === 1 ? 1 : s === 1 ? aT : 1 + (aT - 1) * s;
    mo.hipYaw *= kt;
    mo.chestYaw *= kt;
    const aS = L.motionSway;
    mo.pelX *= aS === 1 ? 1 : s === 1 ? aS : 1 + (aS - 1) * s;
    const aH = L.motionHead;
    mo.headFollow *= aH === 1 ? 1 : s === 1 ? aH : 1 + (aH - 1) * s;
    const aN = L.motionNod;
    mo.headPitch *= aN === 1 ? 1 : s === 1 ? aN : 1 + (aN - 1) * s;
    // the cap lets go on the share it is off on (cap / 1 - share, as the gate eases it: Infinity at the full share)
    const aC = L.motionArmCap;
    mo.armSpeed /= aC === 1 ? 1 : s === 1 ? aC : 1 + (aC - 1) * s;
  }

  /**
   * (anim-natural-n2 step 3) A keyed gait clip's arm gain (KEY_MOTION, A7): the speed set's walk / jog / run and the
   * crouched set's sneak / crouch walk / crouch run; 1 for any other clip. (mocap-trial) A clip set with layer scales (the
   * mocap set `S`): its walk / jog / run rows' gains by MOCAP_LAYERS.motionArmGain (0: the capture's own swing).
   */
  private armGain(c: KeyedClip, S: LocoClipSet = HAND_KEYED_SET): number {
    const K = KEY_MOTION;
    if (S.layers !== null) return layerMul(c === S.walk ? K.walk.armGain : c === S.jog ? K.jog.armGain : c === S.run ? K.run.armGain : 1, S.layers.motionArmGain);
    return c === KEYED_WALK ? K.walk.armGain : c === KEYED_JOG ? K.jog.armGain : c === KEYED_RUN ? K.run.armGain : c === KEYED_SNEAK ? K.sneak.armGain : c === KEYED_CROUCH_WALK ? K.crouchWalk.armGain : c === KEYED_CROUCH_RUN ? K.crouchRun.armGain : 1;
  }

  /**
   * (anim-rework S2) The standing keyed set into `o.keyed`: walk -> jog -> run cross-faded by the effort pace
   * (KEYED_GAITS; the walk scaled by its pace as before), then the idle by its `idleShare` (on its own slow clock); the
   * blended track half-width, knee pole, duty and lift go with it. No allocation.
   */
  private keyedSet(ph: number, es: number, idleShare: number, o: RigTargets): void {
    const needLoco = o.keyW > 0 && idleShare < 1;
    const needIdle = o.keyW > 0 && idleShare > 0;
    // (mocap-trial) the switch's clip set (LOCO.set: the hand-keyed set, or the mocap one)
    const S = this.mS;
    this.speedSet(ph, es, needLoco, this.kA, this.kB, S);
    // (A3) the clip feet's source: the speed set's own sample (kA, before the idle and slots mix), its travel and duty
    this.mFeet = needLoco && this.kA.hasFeet === 1;
    this.mStride = this.sStride;
    this.mDuty = this.sDuty;
    this.kWalk = this.sWalk;
    let half = this.sHalf;
    let kneeOut = this.sKneeOut;
    this.kDuty = this.sDuty;
    this.kLift = this.sLift;
    // (mixamo-retarget I1) the idle: a Wren rig's from WREN_KEYED (the hand-made KEYED_IDLE over 12 s, or with ?mixamo=1
    // the Mixamo standing idle over its 6 s), every other rig's the hand-made one (HAND_IDLE: an unarmed rig walking along
    // its facing reaches this set too); read by reference, so off it is the same clip and period as before
    const KI = this.wrenReady ? WREN_KEYED : HAND_IDLE;
    if (needIdle) sampleKeyed(KI.idle, this.idleT / KI.idlePeriod, 1, this.kB);
    // the idle's scan: the keyed neck's yaw in the body frame (the sum of the chain's local yaws), by the idle's share
    let scan = 0;
    if (needIdle) for (let s = 0; s < 16; s += 4) scan += 2 * Math.atan2(this.kB.q[s + 1]!, this.kB.q[s + 3]!);
    o.keyScan = scan * idleShare * o.keyW;
    if (needLoco && needIdle) mixKeyed(this.kA, this.kB, idleShare, o.keyed);
    else if (needLoco) mixKeyed(this.kA, this.kA, 0, o.keyed);
    else if (needIdle) mixKeyed(this.kB, this.kB, 0, o.keyed);
    half += (KI.idle.half - half) * idleShare;
    kneeOut += (KI.idle.kneeOut - kneeOut) * idleShare;
    // (mocap-trial) the mocap set's share of this standing pose (its gait), then its filled slots over it (start, stop, turn)
    let share = this.mOn && needLoco ? 1 - idleShare : 0;
    if (this.mSl && o.keyW > 0) {
      const v = this.mVals;
      v.half = half;
      v.kneeOut = kneeOut;
      v.duty = this.kDuty;
      v.lift = this.kLift;
      const ws = this.mSlots.apply(S, o.keyed, this.kB, v);
      half = v.half;
      kneeOut = v.kneeOut;
      this.kDuty = v.duty;
      this.kLift = v.lift;
      this.kWalk *= 1 - ws;
      share += (1 - share) * ws;
    }
    this.mShare = share;
    // (anim-rework S4) crouched: the crouched set by the crouch blend
    const c = this.kCk;
    if (c > 0) {
      mixKeyed(o.keyed, this.kCr, c, o.keyed);
      half += (this.cHalf - half) * c;
      kneeOut += (this.cKneeOut - kneeOut) * c;
      this.kDuty += (this.cDuty - this.kDuty) * c;
      this.kLift += (this.cLift - this.kLift) * c;
      this.kWalk *= 1 - c;
      o.keyScan += (this.cScan * o.keyW - o.keyScan) * c;
    }
    this.kHalf = half;
    o.keyKneeOut = kneeOut;
  }

  /**
   * (mixamo-retarget I3, PLAN "I3") Wren's stance shot (WREN_STANCE: the Mixamo stand-to-crouch / crouch-to-stand) over
   * this frame's keyed pose, played BY PROGRESS on the game's stance blend: going down at the crouch blend (`snK`), going
   * up at one less it, so the whole take spans the controller's own crouch / stand time and the stance is never faster
   * or slower than without it. Its weight: `snW` (the still share less the drawn and wall shares) by the edge fades
   * (STANCE_SHOT.edge: 0 at a settled stance, so standing and crouched are the hand-made sets exactly), less a kneel. A
   * reversal mid-change cross-fades the old direction's shot into the new over STANCE_SHOT.flip s. The pelvis height
   * stays the blend's (the take crouches to its own 47 / 54 cm, not the game's crouch height); the rest (pelvis x / z,
   * trunk, neck, head, arms) comes from the shot by the weight. No allocation.
   */
  private stanceShot(o: RigTargets): void {
    const k = this.snK;
    let dir = this.snDir;
    if (k > this.snPrev + 1e-6) dir = 1;
    else if (k < this.snPrev - 1e-6) dir = -1;
    if (k <= 0 || k >= 1) dir = 0;
    if (dir !== this.snDir) {
      // a reversal mid-change fades the old direction's shot out; a start from a settled stance has none to fade
      if (dir !== 0 && this.snDir !== 0) {
        this.snOld = this.snDir;
        this.snFlip = 0;
      } else this.snFlip = 1;
      this.snDir = dir;
    }
    this.snPrev = k;
    const flip = this.snFlip;
    if (flip < 1) this.snFlip = Math.min(1, flip + this.snDt / STANCE_SHOT.flip);
    if (dir === 0) return;
    const S = WREN_STANCE;
    const cNew = dir > 0 ? S.down : S.up;
    const cOld = flip < 1 ? (this.snOld > 0 ? S.down : S.up) : null;
    // the edge fades and the kneel (smoothsteps written out: no call with double arguments)
    const e = k < 1 - k ? k : 1 - k;
    const t = e >= STANCE_SHOT.edge ? 1 : e / STANCE_SHOT.edge;
    const kn = this.kneelW;
    let w = t * t * (3 - 2 * t) * this.snW * (1 - kn * kn * (3 - 2 * kn));
    if (cNew === null) w *= cOld === null ? 0 : 1 - flip;
    else if (cOld === null) w *= flip;
    if (w <= 1e-4) return;
    // progress p onto a one-shot's frames: p 1 is its last frame (sampleKeyed wraps phase 1 to the first frame)
    const pNew = dir > 0 ? k : 1 - k;
    if (cNew !== null) sampleKeyed(cNew, (pNew * (cNew.frames - 1)) / cNew.frames, 1, this.kSn);
    if (cOld !== null) {
      const pOld = this.snOld > 0 ? k : 1 - k;
      sampleKeyed(cOld, (pOld * (cOld.frames - 1)) / cOld.frames, 1, cNew !== null ? this.kSn2 : this.kSn);
      if (cNew !== null) mixKeyed(this.kSn2, this.kSn, flip, this.kSn);
    }
    // (the takes key the pelvis, trunk, arms and head only: the forearm twists, shoulders, clavicles, fingers and edits
    // stay the blend's, `edits` false)
    const pelY = o.keyed.pel[1]!;
    mixKeyed(o.keyed, this.kSn, w, o.keyed, false);
    o.keyed.pel[1] = pelY;
  }

  /**
   * (mixamo-kit, docs/mixamo-kit/PLAN.md 2) The co-op kit's shot (`kit`: TeamPoser's take, progress and weight for this
   * rig). Its own weight eases over KIT_SHOT.flip at a start, an end and a source flip, holding the last take and progress
   * while it fades out (a new take while the old one shows waits for the old to fade); a jump in progress (a phase
   * change, a relink) cross-fades from the pose last shown over the same time. A free body takes the take whole into the
   * keyed pose and `keyShot` = the weight (the rig applies its trunk, neck, head and arms; the pelvis stays the game's);
   * on foot (the crawler) it mixes over the keyed pose by the weight, its pelvis height included. Weight 0: nothing
   * sampled or written but `keyShot` 0. No allocation.
   */
  private kitShot(o: RigTargets): void {
    const K = this.kit;
    const c = K.weight > 0 ? K.clip : null;
    let target = 0;
    if (c !== null && (c === this.kxClip || this.kxW <= 0)) {
      if (c === this.kxClip && this.kxW > 0) {
        let d = K.time - this.kxTime;
        if (K.mode === 'loop') d -= Math.round(d);
        if ((d < 0 ? -d : d) > KIT_SHOT.jump) {
          mixKeyed(this.kKx, this.kKx, 0, this.kKx2);
          this.kxFade = 0;
        }
      }
      this.kxClip = c;
      this.kxTime = K.time;
      this.kxLoop = K.mode === 'loop';
      target = K.weight;
    }
    const st = this.kxDt / KIT_SHOT.flip;
    const w0 = this.kxW;
    this.kxW = target > w0 ? Math.min(target, w0 + st) : Math.max(target, w0 - st);
    if (this.kxFade < 1) this.kxFade = Math.min(1, this.kxFade + st);
    const cl = this.kxClip;
    if (this.kxW <= 1e-4 || cl === null) {
      this.kxW = 0;
      if (target === 0) this.kxClip = null;
      o.keyShot = 0;
      return;
    }
    // a one-shot's progress 1 is its last frame (sampleKeyed wraps phase 1 to the first frame)
    const t = this.kxTime;
    sampleKeyed(cl, this.kxLoop ? t : (t * (cl.frames - 1)) / cl.frames, 1, this.kKx);
    if (this.kxFade < 1) mixKeyed(this.kKx2, this.kKx, this.kxFade, this.kKx);
    if (this.kxFree) {
      mixKeyed(this.kKx, this.kKx, 0, o.keyed);
      o.keyShot = this.kxW;
    } else {
      mixKeyed(o.keyed, this.kKx, this.kxW, o.keyed, false);
      o.keyShot = 0;
    }
  }

  /**
   * (anim-rework S4, BRIEF 3 "Stealth") The crouched set into `kCr`: sneak -> crouch walk -> crouch run cross-faded by the
   * crouched effort pace (KEYED_CROUCH; the sneak scaled by its pace), then the crouched idle (the squat, hands on the
   * knees, on its own slow clock) by `idleShare`; its track half-width, knee pole, duty, lift (KEYED_CROUCH_LEG) and the
   * idle's head scan into the c* fields. No allocation. (mocap-trial-2) Into `out` (`kCr`; `kCrD` the drawn set's), with
   * `mc` in place of the sneak (null: the hand-keyed sneak).
   */
  private crouchSet(ph: number, es: number, idleShare: number, out: KeyedPose, mc: KeyedClip | null): void {
    const C = KEYED_CROUCH;
    const L = KEYED_CROUCH_LEG;
    const wWalk = smoothstep((es - C.sneakTo) / (C.walkFrom - C.sneakTo));
    const wRun = smoothstep((es - C.walkTo) / (C.runFrom - C.walkTo));
    // (mocap-trial-2, BRIEF A5) `mc` (switch on: the mocap set's crouch walk capture) poses the body in the sneak band (pelvis,
    // trunk, arms, head; (afp AF3) carried by MOCAP_CROUCH_POSE, its sway scaled to the keyed feet); the planner keeps the
    // hand-keyed sneak's feet (duty, lift, track, knee pole); the crouch walk / run bands stay hand-keyed, crossed into
    // over the same blend. Null (switch off, the drawn legs): the hand-keyed sneak.
    let c0: KeyedClip = mc ?? KEYED_SNEAK;
    let c1: KeyedClip = KEYED_CROUCH_WALK;
    let l0: { duty: number; lift: number } = L.sneak;
    let l1: { duty: number; lift: number } = L.walk;
    const P = KEYED_CROUCH_POSE;
    let p0: { lean: number; leanD: number; drop: number; back: number } = mc !== null ? MOCAP_CROUCH_POSE : P.sneak;
    let p1: { lean: number; leanD: number; drop: number; back: number } = P.walk;
    let t = wWalk;
    if (wRun > 0) {
      c0 = KEYED_CROUCH_WALK;
      c1 = KEYED_CROUCH_RUN;
      l0 = L.walk;
      l1 = L.run;
      p0 = P.walk;
      p1 = P.run;
      t = wRun;
    }
    const I = KEYED_CROUCH_IDLE;
    if (idleShare < 1) {
      if (c0 === mc) {
        // the sneak's amplitude by pace, the set's layer scales; the sway centred on the planner's track (the clip's root sits
        // under the pelvis at phase 0, 3.7 cm off its mean)
        sampleKeyed(mc, ph, C.ampMin + (1 - C.ampMin) * clamp(es / C.full, 0, 1), out, this.mS.layers);
        out.pel[0] = (out.pel[0]! - mc.meanPel[0]!) * MOCAP_CROUCH_POSE.sway;
      } else sampleKeyed(c0, ph, c0 === KEYED_SNEAK ? C.ampMin + (1 - C.ampMin) * clamp(es / C.full, 0, 1) : 1, out);
      scaleKeyedArms(out.arm, c0.meanArm, this.armGain(c0)); // (anim-natural-n2 step 3) KEY_MOTION's arm gain per clip
      if (t > 0) {
        sampleKeyed(c1, ph, 1, this.kF);
        scaleKeyedArms(this.kF.arm, c1.meanArm, this.armGain(c1));
        mixKeyed(out, this.kF, t, out);
      }
      // the game's extra lean and drop (KEYED_CROUCH_POSE), the arms turned back by the lean
      // (afp AF3) the drawn crouched legs (`kCrD`, under the procedural gun upper body) keep the lean they had (`leanD`) and no
      // hips-back offset: their carriage is the drawn crouch's (AF4b), and the extra lean put the low-ready elbows 6.5 cm out
      // (afp CI fix) a guard (not afRig) likewise: leanD (the old leans), no hips-back (guards keep their rig)
      const dw = out === this.kCrD || !this.afRig;
      const lean = dw ? p0.leanD + (p1.leanD - p0.leanD) * t : p0.lean + (p1.lean - p0.lean) * t;
      out.pel[1] = out.pel[1]! - (p0.drop + (p1.drop - p0.drop) * t);
      out.pel[2] = out.pel[2]! - (p0.back + (p1.back - p0.back) * t) * (dw ? 0 : this.cBackK);
      const sn = Math.sin(lean * 0.5);
      const cs = Math.cos(lean * 0.5);
      const q = out.q;
      const x = q[0]!;
      const y = q[1]!;
      const z = q[2]!;
      const w = q[3]!;
      q[0] = cs * x + sn * w;
      q[1] = cs * y - sn * z;
      q[2] = cs * z + sn * y;
      q[3] = cs * w - sn * x;
      const s2 = Math.sin(lean);
      const c2 = Math.cos(lean);
      const A = out.arm;
      for (let k = 0; k < 12; k += 3) {
        const ay = A[k + 1]!;
        const az = A[k + 2]!;
        A[k + 1] = ay * c2 + az * s2;
        A[k + 2] = -ay * s2 + az * c2;
      }
    }
    let scan = 0;
    if (idleShare > 0) {
      sampleKeyed(I, this.idleT / C.period, 1, this.kF);
      for (let s = 0; s < 16; s += 4) scan += 2 * Math.atan2(this.kF.q[s + 1]!, this.kF.q[s + 3]!);
      if (idleShare < 1) mixKeyed(out, this.kF, idleShare, out);
      else mixKeyed(this.kF, this.kF, 0, out);
    }
    this.cMocap = c0 === mc ? (1 - t) * (1 - idleShare) : 0;
    this.cScan = scan * idleShare;
    this.cIdle = idleShare;
    // (mocap-trial-2) the planner's feet under the capture are the hand-keyed sneak's
    const k0: KeyedClip = c0 === mc ? KEYED_SNEAK : c0;
    const half = (k0.half + (c1.half - k0.half) * t) * C.halfK;
    const kneeOut = k0.kneeOut + (c1.kneeOut - k0.kneeOut) * t + C.kneeOut;
    const duty = l0.duty + (l1.duty - l0.duty) * t;
    const lift = l0.lift + (l1.lift - l0.lift) * t;
    this.cHalf = half + (I.half * C.idleHalfK - half) * idleShare;
    this.cKneeOut = kneeOut + (I.kneeOut + C.kneeOut - kneeOut) * idleShare;
    this.cDuty = duty + (I.duty - duty) * idleShare;
    this.cLift = lift + (I.liftH - lift) * idleShare;
  }

  /**
   * (anim-rework S5) The wall keyed set mixed into `o.keyed` by its share `wS` (idle / slide / peek, standing and
   * crouched, mirrored by the side: wallKeyed.ts), with its track, knee pole, duty and lift. Crouched the keys' height is
   * the full crouch depth (S5-KEYS), so the procedural crouch drop gives way to it. The drawn share reported floors at
   * WALL_KEYS.gate: the rig applies the keyed pose only in free gait or drawn (a rig gate for CT Core, S5-REPORT).
   */
  private keyedWallSet(ph: number, wS: number, crouchK: number, peek: number, pose: Pose, o: RigTargets): void {
    const W = this.wallKeys;
    W.sample(ph, this.idleT, this.moveW, peek, crouchK, this.wallS || 1);
    mixKeyed(o.keyed, W.pose, wS, o.keyed);
    this.kHalf += (W.half - this.kHalf) * wS;
    o.keyKneeOut += (W.kneeOut - o.keyKneeOut) * wS;
    this.kDuty += (W.duty - this.kDuty) * wS;
    this.kLift += (W.liftH - this.kLift) * wS;
    this.kWalk *= 1 - wS;
    o.keyScan *= 1 - wS;
    pose[CH.pelY] = pose[CH.pelY]! * (1 - o.keyW * wS * crouchK);
    o.keyDrawn = Math.max(o.keyDrawn, WALL_KEYS.gate);
    this.wallYawCut = WALL_KEYS.slideYawCut * W.slide * wS * o.keyW;
  }

  /** (anim-rework S3) The speed set's blended clip values (`speedSet`). */
  private sHalf = KEYED_WALK.half;
  private sKneeOut = KEYED_WALK.kneeOut;
  private sDuty = KEYED_WALK.duty;
  private sLift = KEYED_WALK.liftH;
  private sWalk = 1;
  /** (mocap-trial, A3) The speed set's blended root travel per cycle (1.75 m units; 0: no clip feet). */
  private sStride = 0;
  /** (tuner-clarity S1) The holstered speed set's nearer clip (MOVE_IDS walk 0 .. sprint 3), for `playing`: written by
   *  the holstered call only (into `kA`), never by the drawn legs' call (into `kC`). */
  private sNear = 0;

  /**
   * (anim-rework S2, split out in S3) The standing speed set: walk -> jog -> run cross-faded by the effort pace
   * (KEYED_GAITS; the walk scaled by its pace), into `out` when `sample` (`tmp` a scratch pose); its blended track
   * half-width, knee pole, duty, lift and the walk's share into the s* fields. (mocap-trial) From the clip set `S` (the
   * holstered gait: the switch's `LOCO.set`; the drawn legs: always the hand-keyed set), sampled with its layer scales.
   * No allocation.
   */
  private speedSet(ph: number, es: number, sample: boolean, out: KeyedPose, tmp: KeyedPose, S: LocoClipSet): void {
    const G = KEYED_GAITS;
    const wJog = smoothstep((es - G.walkTo) / (G.jogFrom - G.walkTo));
    const wRun = smoothstep((es - G.jogTo) / (G.runFrom - G.jogTo));
    let c0: KeyedClip = S.walk;
    let c1: KeyedClip = S.jog;
    let t = wJog;
    let n0 = 0; // (tuner-clarity S1) c0's MOVE_IDS index
    if (wRun > 0) {
      c0 = S.jog;
      c1 = S.run;
      t = wRun;
      n0 = 1;
    }
    // (mocap-trial-2, sprint, BRIEF A6) past the run: run -> sprint (the set's sprint clip; null: the run stays the top)
    if (S.sprint !== null) {
      const wSpr = smoothstep((es - G.runTo) / (G.sprintFrom - G.runTo));
      if (wSpr > 0) {
        c0 = S.run;
        c1 = S.sprint;
        t = wSpr;
        n0 = 2;
      }
    }
    // (tuner-clarity S1) the nearer clip, from the holstered call only (the drawn legs' call samples into kC)
    if (out === this.kA) this.sNear = t < 0.5 ? n0 : n0 + 1;
    const B = KEYED_WALK_BAND;
    this.sWalk = c0 === S.walk ? 1 - t : 0;
    this.sHalf = c0.half + (c1.half - c0.half) * t;
    this.sKneeOut = c0.kneeOut + (c1.kneeOut - c0.kneeOut) * t;
    this.sDuty = c0.duty + (c1.duty - c0.duty) * t;
    this.sLift = c0.liftH + (c1.liftH - c0.liftH) * t;
    // (A3) a blend with a clip without feet keeps the other's (mixKeyed), so its travel too
    this.sStride = c0.feet && c1.feet ? c0.stride + (c1.stride - c0.stride) * t : c0.feet ? c0.stride : c1.feet ? c1.stride : 0;
    if (!sample) return;
    const L = S.layers;
    sampleKeyed(c0, ph, c0 === S.walk ? B.ampMin + (1 - B.ampMin) * clamp(es / B.full, 0, 1) : 1, out, L);
    // (anim-natural-n2 step 3) KEY_MOTION's arm gain per clip; (mocap-trial) on the mocap set's clips by MOCAP_LAYERS.motionArmGain
    scaleKeyedArms(out.arm, c0.meanArm, this.armGain(c0, S));
    if (t > 0) {
      sampleKeyed(c1, ph, 1, tmp, L);
      scaleKeyedArms(tmp.arm, c1.meanArm, this.armGain(c1, S));
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
    // (mocap-trial) the drawn legs stay hand-keyed (weapons and the gun carriage are not part of the mocap trial)
    this.speedSet(ph, es, idleShare < 1, this.kC, this.kD, HAND_KEYED_SET);
    // (marlow-bays T1a, COVERAGE gap 4) the speed set's holstered arm keys and edits never reach the gun arms (its trunk
    // edits are in its trunk already); the ready stance's and the glides' edits below do (the rig's `keyedArmEdit`)
    clearKeyedArms(this.kC);
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
    this.stShare = 0;
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
      // (mocap-trial-2, strafe, BRIEF A10) switch on with a strafe in the set: the captured sideways cycles (left, right by the
      // eased side) in place of the glide strafe, on their own side-step (motion.ts GLIDE_SIDE) and stance share
      const SL = this.mOn ? this.mS.strafeL : null;
      const SR = this.mOn ? this.mS.strafeR : null;
      // (mocap-trial-2 strafe fix 3) the mocap strafe's share never under the flip-proof one (stSk): through a pure L <-> R
      // flip it holds the captures; elsewhere the eased direction's share as before (it is the larger in a snap)
      const sk = SL !== null && SR !== null ? this.stSk : swW / tot;
      const stW = this.stSide;
      // (mocap-trial-2, strafe) the pose's still share with the mocap strafe (stIdle): the drawn set's, rising through two
      // stages, each STRAFE_IDLE_TAU / 2, falling at once (a CT stop fades the moving pose out in ~0.1 s, the captures' wide
      // hips swing popped it; written out here, not in update(): there the switch-off frame boxed a double)
      if (SL !== null && SR !== null) {
        this.stIdleA = idleShare > this.stIdleA || this.stIn ? idleShare + (this.stIdleA - idleShare) * this.stIdleK : idleShare;
        this.stIdle = this.stIdleA > this.stIdle || this.stIn ? this.stIdleA + (this.stIdle - this.stIdleA) * this.stIdleK : this.stIdleA;
        // (settled within 1e-4: exactly idleShare, so the mix below passes idleShare itself)
        if (this.stIdle - idleShare < 1e-4 && this.stIdle - idleShare > -1e-4) {
          this.stIdle = this.stIdleA = idleShare;
          this.stIn = false;
        }
      }
      const sDuty = SL !== null && SR !== null ? SL.duty + (SR.duty - SL.duty) * stW : S.duty;
      this.stShare = SL !== null && SR !== null ? sk * aimK * (1 - this.stIdle) * (1 - this.kCk) : 0;
      const mHalf = zc.half * GLIDE.halfK + (S.half * GLIDE.halfKSide - zc.half * GLIDE.halfK) * sk;
      const mKnee = zKnee + (GLIDE.kneeOutSide - zKnee) * sk;
      const mDuty = zc.duty + (sDuty - zc.duty) * sk;
      const mLift = zc.liftH + (S.liftH - zc.liftH) * sk;
      // (mocap-trial-2, strafe) the pose's still share with the mocap strafe: eased (stIdle); the planner's values keep idleShare
      // (strafe fix 2) as two tests, not a merged share: the merge of the field and the argument boxed a double, 16 B a frame
      const loco = SL !== null && SR !== null ? this.stIdle < 1 : idleShare < 1;
      const still = SL !== null && SR !== null ? this.stIdle > 0 : idleShare > 0;
      if (loco) {
        sampleKeyed(zc, ph, amp, this.kE);
        this.dynPel(this.kE, zc, pose);
        if (sk > 0 && SL !== null && SR !== null) {
          // (mocap-trial-2, strafe) each capture as captured (the left one leads with the left foot: it lands at 0), the
          // aimed head on the gun platform (no keyed head turn, as the trunk)
          // (their hips at the procedural height: kept at their own, the 3.6 cm sink bent the knees out past the ankles)
          if (stW < 1) {
            // (the glide's own amp once the ease has settled on it: no new boxed double a frame)
            if (this.stAmp === amp) sampleKeyed(SL, ph, amp, this.kD);
            else sampleKeyed(SL, ph, this.stAmp, this.kD);
            this.dynPel(this.kD, SL, pose);
          }
          if (stW > 0) {
            const k = stW < 1 ? this.kSt : this.kD;
            if (this.stAmp === amp) sampleKeyed(SR, ph, amp, k);
            else sampleKeyed(SR, ph, this.stAmp, k);
            this.dynPel(k, SR, pose);
            if (stW < 1) mixKeyed(this.kD, this.kSt, stW, this.kD);
          }
          // the hips back over the planner's steps (STRAFE_LEAD.hips of a cycle's travel against the travel); the captures'
          // own sideways sway, not the procedural one too (it fell away at a CT stop's last pace step: the hips kinked)
          this.kD.pel[0] = this.kD.pel[0]! - this.stHip / (this.p.height / 1.75) - pose[CH.pelX]!;
          const h = this.kD.head;
          h[0] = h[1] = h[2] = 0;
          h[3] = 1;
          this.kD.hasHead = 0;
          mixKeyed(this.kE, this.kD, sk, this.kE);
        } else if (sk > 0) {
          // the right step as keyed; the left mirrored, half a cycle on (its lead foot is the left: it lands at 0)
          const left = this.dirX < 0;
          sampleKeyed(S, left ? ph + 0.5 : ph, amp, this.kD);
          if (left) mirrorKeyed(this.kD);
          this.dynPel(this.kD, S, pose);
          mixKeyed(this.kE, this.kD, sk, this.kE);
        }
      }
      if (still) {
        sampleKeyed(R, rph, 1, this.kD);
        this.dynPel(this.kD, R, pose);
        // (the glide's share passed as it came: a merged double is boxed for the call, an allocation the switch off)
        // (the eased still share only while it differs: settled it is idleShare itself, no new boxed double a frame)
        if (loco) {
          if (SL === null || SR === null || this.stIdle === idleShare) mixKeyed(this.kE, this.kD, idleShare, this.kE);
          else mixKeyed(this.kE, this.kD, this.stIdle, this.kE);
        }
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
    // (anim-rework S4) crouched: the crouched set's legs by the crouch blend, at low ready and aiming (its trunk only at
    // low ready, keyTrunk: aiming the upper body stays the procedural gun platform)
    const c = this.kCk;
    if (c > 0) {
      mixKeyed(this.kC, this.mOn && this.mS.crouchWalk !== null ? this.kCrD : this.kCr, c, this.kC, false);
      this.dHalf += (this.cHalf - this.dHalf) * c;
      this.dKneeOut += (this.cKneeOut - this.dKneeOut) * c;
      this.dDuty += (this.cDuty - this.dDuty) * c;
      this.dLift += (this.cLift - this.dLift) * c;
    }
    // into the holstered set's pose and values by the drawn share
    mixKeyed(o.keyed, this.kC, dS, o.keyed);
    this.kHalf += (this.dHalf - this.kHalf) * dS;
    o.keyKneeOut += (this.dKneeOut - o.keyKneeOut) * dS;
    this.kDuty += (this.dDuty - this.kDuty) * dS;
    this.kLift += (this.dLift - this.kLift) * dS;
    // (the slow-walk duty / lift shape: the low ready's walk share moving)
    this.kWalk += (this.sWalk * (1 - aimK) * (1 - idleShare) * (1 - c) - this.kWalk) * dS;
    o.keyScan *= 1 - dS;
  }

  /** (anim-rework S3) The glide's share of the step (GLIDE_STEP): a carrier aiming (the raise past half, as the driver's
   *  `aiming`). Enemies keep their steps. */
  private glideK(i: AnimInput): number {
    return i.keyedDrawn && i.raise > 0.5 ? 1 : 0;
  }

  /** (mocap-trial-2, strafe) Switch on (`mOn`), once a frame: the mocap strafe's eased side, the hips' shift over its
   *  side-steps, the captures' eased amplitude and the still share's ease (a method of its own: in update() the aimed
   *  frame allocated more). The eases are written out: a double returned from a call is boxed. */
  private strafeTrack(i: AnimInput): void {
    const dt = this.stDt;
    const dl = this.stDl;
    const locoSpeed = this.locoSpeed;
    // the side of the travel the captures play (dirX holds its side through a pure flip: renormalised with no forward part it
    // never crosses 0), eased so a flip cross-fades the left and right captures
    if (dl > 0.1 && i.speed > 0.05 && (i.localX > 0.1 * dl || i.localX < -0.1 * dl)) {
      const sw = i.localX > 0 ? 1 : 0;
      const ss = sw + (this.stSide - sw) * Math.exp(-dt / STRAFE_SIDE_TAU);
      // (strafe fix 2) settled within 1e-4: exactly the side (the ease stuck one ulp short of 1, so a steady strafe sampled
      // both captures and blended them every frame: two calls and a boxed double, 32 B a frame)
      this.stSide = ss - sw < 1e-4 && ss - sw > -1e-4 ? sw : ss;
    }
    // (strafe fix 3) the travel's unsigned sideways / forward parts, eased as dirX / dirZ (0.18 s), and their sideways share
    if (dl > 0.1 && i.speed > 0.05) {
      const ek = Math.exp(-dt / 0.18);
      const ax = (i.localX < 0 ? -i.localX : i.localX) / dl;
      const az = (i.localZ < 0 ? -i.localZ : i.localZ) / dl;
      this.stAX = ax + (this.stAX - ax) * ek;
      this.stAZ = az + (this.stAZ - az) * ek;
    }
    this.stSk = this.stAX + this.stAZ > 0 ? this.stAX / (this.stAX + this.stAZ) : 0;
    // the hips' shift against the travel: a quarter of the side-step's cycle travel, at most STRAFE_LEAD.rate m/s; aimed only
    // (the captures play under the raise): holstered it eases back to 0 at the rate
    // (motion.ts sideStepAt written out, as mocapSideStep: no call with a double a frame)
    const gs = GLIDE_SIDE.stride;
    const st = this.raiseS > 1e-4 && this.mSide && gs > 0 && locoSpeed > 0 ? 0.5 * gs * Math.pow(locoSpeed / (gs / GLIDE_SIDE.cycle), GLIDE_SIDE.exp) : Number.NaN;
    const want = Number.isNaN(st) ? 0 : (2 * this.stSide - 1) * STRAFE_LEAD.hips * 2 * st;
    const dm = STRAFE_LEAD.rate * dt;
    this.stHip = want > this.stHip + dm ? this.stHip + dm : want < this.stHip - dm ? this.stHip - dm : want;
    // the captures' amplitude, eased: a CT stop's last pace step scaled their wide hips swing by 8 % in a frame
    const amp = GLIDE.ampMin + ((1 - GLIDE.ampMin) * locoSpeed) / GLIDE.full;
    const ampT = amp < 0 ? 0 : amp > 1 ? 1 : amp;
    // (settled onto the glide's amp exactly: keyedDrawnSet then passes its own `amp`, no new boxed double a frame)
    const sa = ampT + (this.stAmp - ampT) * Math.exp(-dt / STRAFE_AMP_TAU);
    this.stAmp = sa - ampT < 1e-4 && sa - ampT > -1e-4 ? ampT : sa;
    // the still share's ease a frame (keyedDrawnSet's stIdle)
    this.stIdleK = Math.exp(-dt / (STRAFE_IDLE_TAU * 0.5));
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
    // (anim-n4b, PASS2 row 64) falling, the free arms go out and up for balance (AIR_POSE)
    const aw = airPoseW(this.airT) * fw;
    if (aw > 0.001) {
      blendHand(pose, CH.hLX, -AIR_POSE.armX, AIR_POSE.armY, AIR_POSE.armZ, aw);
      blendHand(pose, CH.hRX, AIR_POSE.armX, AIR_POSE.armY, AIR_POSE.armZ, aw);
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
    // (S5 round 2) sliding along a wall too (WALL_KEYS.slideYawCut): a side step, as the glide strafe
    pe.yaw = q[CH.pelYaw]! * (1 - Math.max(GLIDE.yawCut * TUNE_CUR.glideTwistMul * o.keyDrawn * o.keyW * this.raiseS, this.wallYawCut));
    this.wallYawCut = 0;
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
    if (WEIGHT_POSE.on) {
      weightApplyPose(o); // (anim-weight) the local player's Weight layers (off: untouched)
      // (mocap-trial) MOCAP_LAYERS.weightLoad: the plant / landing drop on the mocap share (1: as is)
      const wl = mocapLayerK(MOCAP_LAYERS.weightLoad, o.keyMocap);
      if (wl !== 1) o.pelvis.y += WEIGHT_POSE.pelY * (wl - 1);
    }
    // stance: shoulder-width tactical stance, support (left) foot slightly forward
    // (BC note 4) on foot the feet stay under the hips (inside the body width): the clips' width scale only widens the stance
    // a quarter as much, capped at 1.1 hip half-widths (it was 1.2 x width: up to 1.6 crouched). Traversals keep their own width.
    const wd = q[CH.width]!;
    const half0 = this.p.hipHalf * (i.traverse === 'none' && !i.wall ? 1 + clamp(wd - 1, -0.5, 0.4) * 0.25 : 1.2 * wd);
    // (CT prototype G8) the keyed walk's narrow track (the feet under the body, the soles just clear)
    // (anim-rework S2) the keyed set's blended track (walk, jog, run, the idle's hip width)
    // (anim-rework S4) the free kneel's feet a little under the hips (KNEEL_NARROW: its front foot planted 10.5 cm out)
    let half = (half0 + (this.kHalf - half0) * o.keyW) * (1 - KNEEL_NARROW * o.kneel) * TUNE_CUR.trackMul;
    // (anim-fix-pass AF1, P1 "legs ... overlapping eachother") on the mocap share at a jog and faster the planner's stance
    // half is floored at the clips' planted half (kHalf: the mocap set's, emit.mjs STANCE_HALF), not trackMul's: the
    // planner's steps (a turn past MOCAP_FEET_TURN, a hand-off) landed 0.35 cm off the midline (Body trackMul 0.05) and its
    // uncross gap (FREE_GAP of the stance) was ~0.6 cm, so in a turn the outside foot came in across the inside one (jog
    // 3 m/s x 2.5 rad/s planted ankle -0.3 cm, run 4 x 4 0.5 cm). The walk keeps trackMul's (its turns are fine); off the
    // switch keyMocap is 0, and without clip feet (the placeholders) nothing here: unchanged
    // (smoothstep written out: a call the graph does not inline boxes its double argument, 16 B a frame)
    const hT = Math.max(0, Math.min(1, (Math.max(0, i.speed) - MOCAP_FEET_TRACK.from) / (MOCAP_FEET_TRACK.full - MOCAP_FEET_TRACK.from)));
    const hF = this.mFeet ? o.keyMocap * (hT * hT * (3 - 2 * hT)) : 0;
    if (hF > 0) {
      const hc = this.kHalf * (1 - KNEEL_NARROW * o.kneel);
      if (hc > half) half += (hc - half) * hF;
    }
    const st = o.stance;
    // (G1 fix, audit row 20) standing still on foot the feet sit IDLE_STANCE apart (anim-rework S2: about hip width)
    const wide = i.traverse === 'none' && !i.wall && i.grounded ? IDLE_STANCE.extra * o.keyHol * (1 - this.moveW) * (1 - clamp(i.crouch, 0, 1)) : 0;
    st.lX = (-half - wide + q[CH.fLX]!) * k;
    // (G1) the support foot's lead (0.08 m) is a standing stance: moving, the feet run on even tracks (a lead made every
    // other landing reach further and dip the pelvis more: a limp in the bob)
    // (traversals, walls and the air keep the 3.2.0 stagger: a window vault tucked the knees together without it)
    // (anim-rework S3) drawn on foot the ready stance's longer stagger (READY_STANCE.lead: the support foot ahead)
    // (anim-rework S4) crouched under the keyed set the feet stand square (the squat; the crouched clips own their steps)
    const lead = (IDLE_STANCE.lead + (READY_STANCE.lead - IDLE_STANCE.lead) * this.readyStillS) * (1 - clamp(i.crouch, 0, 1) * o.keyW);
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
    const rate = Math.max(gaitRate(s > 0.05 ? s : 0, yr, undefined, lat, tense, ckw, bk, gl, this.mSide, this.afRig ? CROUCH_STEP : CROUCH_STEP_GUARD), i.motion === 'move' ? this.phRate : 0);
    g.cycleTime = rate > 1e-3 ? 1 / rate : 1.2;
    // (afp CI fix) the turn share is measured against the pre-AF3 crouched step line (CROUCH_STEP_GUARD) on every rig: AF3's
    // shorter crouched steps raised the linear rate, so a crouched spin no longer read as a full turn (2.1 m/s x 7 rad/s:
    // turning 0.90, was 1) and its longer stance wound a planted foot past PLANTED_TWIST (turnFollow 0.52 rad) and into the
    // twist cap (footTurn crouch spin 0.85: 7.5 deg). The clock (cycleTime, phase) keeps AF3's cadence; straight, unchanged.
    const linRate = s > 0.05 ? gaitRate(s, 0, undefined, lat, tense, ckw, bk, gl, this.mSide, CROUCH_STEP_GUARD) : 0;
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
    this.clipFeet(i, k, s);
    // (anim-fix-pass AF1) turning on the mocap share at a jog and faster, the outside foot's stance spot goes out by the
    // sagitta of the body's arc over a stance (v x stance^2 x yaw rate / 8, MOCAP_FEET_TRACK.arcK times, at most .arcMax):
    // planted on a straight chord under a curving body, the outside foot came in to the midline by its stance's end (jog
    // 3 m/s x 4 rad/s 1.4 cm). The planner's steps read it (the clip feet keep their own x); 0 off the switch or straight
    if (hF > 0 && i.yawRate !== 0) {
      const sp = o.gait.duty * o.gait.cycleTime;
      const arc = s * sp * sp * Math.abs(i.yawRate) * MOCAP_FEET_TRACK.arcK;
      const out = (arc < MOCAP_FEET_TRACK.arcMax ? arc : MOCAP_FEET_TRACK.arcMax) * hF * k;
      if (i.yawRate > 0) st.lX -= out;
      else st.rX += out;
    }
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

  /**
   * (mocap-trial, A3) The clip feet for the planner (`RigTargets.clipFeet`): valid while the mocap set's speed set was
   * sampled from clips with a `feet` channel and the gait moves; each side's ankle scaled to the body (x, lift) and, fore
   * and aft, by the game's stride over the clip's (speed x cycle time / clip stride: the cadence stays the gait clock's).
   * `on` (MOCAP_FEET): the mocap share high enough, not turning fast, past a crawl; then the contacts take the clip's own
   * duty. With the switch off (or no feet) nothing here changes a value. No allocation.
   */
  /** (AF1) The clip feet's turn hysteresis: under the turn limit last frame, handed off by a turn (not taken back
   *  yet), the time the turn has stayed under the take-back rate (s), the jog+ share (MOCAP_FEET_TRACK), the last pace. */
  private cfTurnOk = true;
  private cfTurned = false;
  private cfT = 0;
  private cfTk = 0;
  private cfSpeed = 0;
  private clipFeet(i: AnimInput, k: number, speed: number): void {
    const o = this.out;
    const CF = o.clipFeet;
    CF.valid = this.mOn && this.mFeet && this.mStride > 0 && o.keyMocap > 0 && o.gait.moving;
    CF.on = false;
    // (fix 2 check) clip feet gone with the switch on while the gait moves (a crouch, a draw or a wall taking the share to
    // 0): the duty goes on easing from the clip's window to the planner's at the same rate below (it jumped 0.18-0.30 in
    // the frame they went, a foot in the air back in its stance window). Else nothing is carried (the switch off: as before)
    if (!CF.valid && (!this.mOn || !this.mCarry || !o.gait.moving)) {
      // (and the switch on, moving: this frame's duty, the next clip feet frame moves on from it)
      const on = this.mOn && o.gait.moving;
      this.mCarry = false;
      this.mDutyGait = on ? o.gait.duty : -1;
      this.mPh = on ? o.gait.phase : -1;
      return;
    }
    const M = MOCAP_FEET;
    let want = o.gait.duty;
    if (CF.valid) {
      const zk = (speed * o.gait.cycleTime) / this.mStride;
      const src = this.kA.feet;
      for (let s = 0; s < KEYED_FEET; s += KEYED_FEET_SIDE) {
        CF.f[s + KF.x] = src[s + KF.x]! * k;
        CF.f[s + KF.y] = src[s + KF.y]! * k;
        CF.f[s + KF.z] = src[s + KF.z]! * zk;
        CF.f[s + KF.pitch] = src[s + KF.pitch]!;
        CF.f[s + KF.contact] = src[s + KF.contact]!;
      }
      // (integration) a turn hands the steps to the planner past `turnMax`, or past what turns the body `twistMax` over
      // one of the clip's stances (a run's short stance keeps its clip feet through steering)
      const st = this.mDuty * o.gait.cycleTime;
      const turnMax = st > 0 && M.twistMax / st > M.turnMax ? M.twistMax / st : M.turnMax;
      // (anim-fix-pass AF1) at a jog and faster (eased in over MOCAP_FEET_TRACK's speeds) the hand-off comes at
      // MOCAP_FEET_TURN.off and the take-back under .on (hysteresis); the walk's own limit as before
      // (smoothstep written out: a call with a double boxes it, 16 B a frame)
      const tkT = Math.max(0, Math.min(1, (speed - MOCAP_FEET_TRACK.from) / (MOCAP_FEET_TRACK.full - MOCAP_FEET_TRACK.from)));
      const tk = tkT * tkT * (3 - 2 * tkT);
      const tOff = tk > 0 ? turnMax + ((turnMax < MOCAP_FEET_TURN.off ? turnMax : MOCAP_FEET_TURN.off) - turnMax) * tk : turnMax;
      const tOn = tk > 0 ? tOff + ((tOff < MOCAP_FEET_TURN.on ? tOff : MOCAP_FEET_TURN.on) - tOff) * tk : tOff;
      const yrA = Math.abs(i.yawRate);
      this.cfTurnOk = yrA < (this.cfTurnOk ? tOff : tOn);
      this.cfTk = tk;
      if (!this.cfTurnOk) this.cfTurned = true;
      // (the take-back's clock: the time the turn has stayed under the take-back rate)
      if (yrA >= tOn) this.cfT = 0;
      CF.on = o.keyMocap >= M.share && this.cfTurnOk && speed > M.minSpeed;
      const w = o.keyMocap >= M.share ? 1 : o.keyMocap / M.share;
      const duty = o.gait.duty + (this.mDuty - o.gait.duty) * w;
      want = o.keyMocap >= M.share && speed > M.minSpeed ? duty : duty < 0.4 ? 0.4 : duty > 0.75 ? 0.75 : duty;
    }
    // (integration) the gait clock keeps the clip's stance window whenever clip feet are on hand (by the mocap share), on
    // or handed to the planner: a hand-off never moves the windows under a foot in the air (it landed mid-swing, 18 cm
    // down in a frame, or jumped half its swing)
    // (fix 2) the clip's own duty (outside the planner's 0.40-0.75) only while its feet are on or handed to the planner by
    // a turn alone; off for a part share or a crawl, the planner's steps take its clamp. (A turn hand-off keeps the clip's
    // window: clamped there, the jog / run turns' planner steps popped worse, jog 2.8 m/s x 2.5-4 rad/s ankle-toe 24-32 ->
    // 37-44 deg, run 4.0 x 4 48 -> 70 deg; the walk's 0.56 is inside the clamp either way.) The duty moves at most half
    // the gait clock's advance a frame, so a foot in its swing window never falls back into its stance window (the jog's
    // 0.21 -> 0.40 in one frame set the swing down mid-air). (fix 2 check) Also from last frame's duty (the planner's) in
    // the first frame clip feet are on hand (the switch turned on mid-jog: 0.44 -> 0.21 in a frame, every swing jumped 20 %
    // on), and held through a clock that stepped (no last phase, or over a quarter cycle a frame: a step back read as a
    // whole cycle)
    let dPh = this.mPh < 0 ? 0 : o.gait.phase - this.mPh;
    if (dPh < 0) dPh += 1;
    if (dPh > 0.25) dPh = 0;
    const from = this.mDutyGait < 0 ? o.gait.duty : this.mDutyGait;
    const dd = want - from;
    const dm = 0.5 * dPh;
    o.gait.duty = from + (dd < -dm ? -dm : dd > dm ? dm : dd);
    // (mt2-fixA, CHECK-3 required 1) the clip feet wait (the planner keeps the steps, as in a turn hand-off) while the duty
    // is still easing more than MOCAP_DUTY_GAP from the clip's: a pace change through CT's spring (1.4 -> 5.0 m/s) put the
    // pose in a run on a walk's duty, the clip pinned a planted foot for a walk-length stance at 4.4 m/s (its reach need
    // 2 -> 43 cm in 4 frames, the pelvis 46 cm down)
    if (CF.on && Math.abs(o.gait.duty - want) > MOCAP_DUTY_GAP) CF.on = false;
    // (anim-fix-pass AF1) after a turn's hand-off the clip takes the feet back only once the turn has stayed under the
    // take-back rate for MOCAP_FEET_TURN.hold (on the gait clock's time; a weave through the rates stays the planner's), nor while the pace changes faster than .accel m/s^2 (a CT flick's pace dip recovering through
    // the walk -> jog band: taken back on the walk's duty, the duty gap above handed them off again 5 frames later; from
    // MOCAP_FEET_TRACK.from only: a walk flick's pace recovery held the planner's steps on and the pelvis lurched 2.8 cm);
    // a hand-off is never held back
    const cdt = dPh * o.gait.cycleTime;
    this.cfT += cdt;
    const acc = cdt > 0 ? Math.abs(speed - this.cfSpeed) / cdt : 0;
    this.cfSpeed = speed;
    if (CF.on && this.cfTurned && (this.cfT < MOCAP_FEET_TURN.hold || (this.cfTk > 0 && acc > MOCAP_FEET_TURN.accel))) CF.on = false;
    if (CF.on) this.cfTurned = false;
    // (clip feet gone: carried until the planner's duty is met)
    this.mCarry = CF.valid || o.gait.duty !== want;
    this.mDutyGait = o.gait.duty;
    this.mPh = o.gait.phase;
  }

  /**
   * (mixamo-retarget I2) A Wren traversal frame from the resolved Mixamo table (`WREN_TRAV`, `mixamo.ts`): plays the
   * slot's capture (a null slot: its hand-made clip), sets `travNow` and returns true; false when every slot this kind
   * uses is hand-made (the caller plays `tc` as before). The channels `MIXAMO_KEEP` names for the move stay the hand-made
   * clip's (where the body sits against the grips). Allocation-free: no double crosses a call (a call the graph does not
   * inline boxes each double argument, 16 B a frame), so the frame's dt is the field `mxDt` and every blend's time and
   * weight are the fields `mxT` / `mxW` (`mxOver`, `keepApply`).
   * - hang: the hanging idle on its own clock, the shimmy left / right over it by the pace along the lip (the direction
   *   from the pendulum: the hips trail the hands, so a swing to the left is a shimmy to the right); a pipe hang (no
   *   pendulum) keeps the hand-made clip when moving.
   * - ladder / vent crawl: the capture on the hand cadence.
   * - a lip climb-up: the climb to the crouch, then the stand-up end faded in past `CLIMB_UP_CROUCH_K`; a ladder's
   *   top-out: its capture on the same progress. A drainpipe's or a team climb-up stays hand-made.
   */
  private mixamoTrav(src: Pose, i: AnimInput, tc: Clip): boolean {
    // (mixamo-kit) the pull-up partner keeps the hand-made clips (the haul's k is no pendulum, its rise no shimmy pace):
    // gated on a kit row, not this rig's source (WREN_TRAV is the viewer's table: a CMU partner on a Mixamo screen too)
    if (KIT_TABLES[1].any && this.kit.move === 'pull' && this.kit.role === 'a') return false;
    const W = WREN_TRAV;
    const t = i.traverseT;
    const dt = this.mxDt;
    if (i.traverse === 'hang') {
      if (W.hangIdle === null && W.shimmyL === null && W.shimmyR === null) return false;
      const swing = t - Math.floor(t);
      if (t !== 0) this.hangLip = true;
      const S = SHIMMY_SPEED;
      const k = this.p.height / 1.75;
      this.hangIdleT = (this.hangIdleT + dt / HANG_IDLE_SECONDS) % 1;
      this.shimT = (this.shimT + (i.speed * dt) / (SHIMMY_TRAVEL * k)) % 1;
      const moving = i.speed > S.on;
      this.hangMoveW = (moving ? 1 : 0) + (this.hangMoveW - (moving ? 1 : 0)) * Math.exp(-dt / S.fade);
      if (this.hangLip && moving && (t < 0 ? -t : t) > S.swing) this.hangDir = (t < 0 ? 1 : 0) + (this.hangDir - (t < 0 ? 1 : 0)) * Math.exp(-dt / S.dirFade);
      const mv = this.hangMoveW;
      const r = this.hangDir;
      const sl = this.hangLip ? W.shimmyL : null;
      const sr = this.hangLip ? W.shimmyR : null;
      const keep = KEEP_CH.hang;
      this.keepSave(src, keep);
      // the idle, then left and right over it (sequential blends: their shares come out mv x (1 - r) and mv x r); a
      // capture at full weight covers the ones under it (every capture keys the same channels), so those are skipped
      const b = mv * r;
      const a = b < 1 ? (mv - b) / (1 - b) : 0;
      const full = (b >= 1 && sr !== null) || (a >= 1 && b <= 0 && sl !== null);
      this.mxW = 1;
      if (!full) {
        this.mxT = W.hangIdle ? this.hangIdleT : swing;
        this.mxOver(src, W.hangIdle ?? HANG);
      }
      if (a > 0 && b < 1) {
        this.mxW = a;
        this.mxT = sl ? this.shimT : swing;
        this.mxOver(src, sl ?? HANG);
      }
      if (b > 0) {
        this.mxW = b;
        this.mxT = sr ? this.shimT : swing;
        this.mxOver(src, sr ?? HANG);
      }
      this.mxT = swing;
      this.keepApply(src, keep, HANG);
      this.travNow = (mv < 0.5 ? W.hangIdle : r < 0.5 ? sl : sr) ?? tc;
      return true;
    }
    if (i.traverse === 'climb' || i.traverse === 'crawl') {
      const ladder = i.traverse === 'climb';
      const c = ladder ? W.ladder : W.crawl;
      if (c === null) return false;
      const keep = ladder ? KEEP_CH.climb : KEEP_CH.crawl;
      this.keepSave(src, keep);
      this.mxT = t - Math.floor(t);
      this.mxW = 1;
      this.mxOver(src, c);
      this.keepApply(src, keep, tc);
      this.travNow = c;
      return true;
    }
    if (i.traverse !== 'climbUp' || !i.ledgeClimb) return false;
    // (clamp written out: no double argument)
    this.mxT = t < 0 ? 0 : t > 1 ? 1 : t;
    this.mxW = 1;
    if (this.travFrom === 'climb') {
      if (W.ladderTop === null) return false;
      this.keepSave(src, KEEP_CH.topOut);
      this.mxOver(src, W.ladderTop);
      this.keepApply(src, KEEP_CH.topOut, CLIMB_UP);
      this.travNow = W.ladderTop;
      return true;
    }
    if (this.travFrom !== 'hang') return false;
    const ca = W.climbUpCrouch ?? CLIMB_UP;
    const cb = W.climbUpStand ?? CLIMB_UP;
    if (ca === CLIMB_UP && cb === CLIMB_UP) return false;
    this.keepSave(src, KEEP_CH.climbUp);
    this.mxOver(src, ca);
    // (smoothstep written out: no double argument)
    const u = (this.mxT - CLIMB_UP_CROUCH_K) / STAND_FADE;
    const sw = cb === ca || u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
    if (sw > 0) {
      this.mxW = sw;
      this.mxOver(src, cb);
    }
    this.keepApply(src, KEEP_CH.climbUp, CLIMB_UP);
    this.travNow = sw > 0.5 ? cb : ca;
    return true;
  }

  /** (I2) This frame's dt for `mixamoTrav`, and a blend's clip time and weight for `mxOver` / `keepApply` (fields: no
   *  boxed double arguments). */
  private mxDt = 0;
  private mxT = 0;
  private mxW = 0;
  /** (I2 fix) Last frame's traversal played a capture (a switch to or from the hand-made clip is inertialized). */
  private mxLast = false;
  /** (I2) `overClip(src, c, mxT, mxW)` with its time and weight read from the fields. */
  private mxOver(src: Pose, c: Clip): void {
    const w = this.mxW;
    const t = this.mxT;
    if (w === 0) return;
    for (let k = 0; k < c.keyed.length; k++) {
      const ch = c.keyed[k]!;
      const v = evalCurve(c.curves[ch]!, t);
      src[ch] = src[ch]! + w * (v - src[ch]!);
    }
  }

  /** (I2) The kept channels' values before the capture (the base pose under a channel the hand-made clip does not key). */
  private readonly keepBase = new Float64Array(64);
  private keepSave(src: Pose, keep: readonly number[]): void {
    for (let j = 0; j < keep.length; j++) this.keepBase[j] = src[keep[j]!]!;
  }
  /** (I2) The kept channels back to the hand-made clip `hand` at `mxT` (as the hand-made path would have set them). */
  private keepApply(src: Pose, keep: readonly number[], hand: Clip): void {
    const t = this.mxT;
    for (let j = 0; j < keep.length; j++) {
      const ch = keep[j]!;
      const cv = hand.curves[ch];
      src[ch] = cv ? evalCurve(cv, t) : this.keepBase[j]!;
    }
  }

  /** (anim-bake-1022) This rig's rifle low ready and pistol low ready (`wrenReady` swaps the references, set once). */
  private readyLow: ReadyPose = READY_POSES.low;
  private readyPistol: ReadyPose = PISTOL_READY;
  /**
   * (anim-bake-1022) A Wren rig's ready poses (WREN_READY_LOW / WREN_PISTOL_READY) or every other rig's (READY_POSES.low
   * / PISTOL_READY). Set where the rig is made (`CharacterRig.tuneRows`); the per-frame pick reads the references only.
   */
  set wrenReady(on: boolean) {
    this.readyLow = on ? WREN_READY_LOW : READY_POSES.low;
    this.readyPistol = on ? WREN_PISTOL_READY : PISTOL_READY;
  }
  get wrenReady(): boolean {
    return this.readyLow === WREN_READY_LOW;
  }

  /** (anim-rework S3) The low ready toward the pistol's by the pistol weight, into a scratch pose (no allocation). */
  private readonly pLow = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };
  private pistolLow(w: number): { x: number; y: number; z: number; pitch: number; yaw: number; roll: number } {
    const a = this.readyLow;
    const b = this.readyPistol;
    const o = this.pLow;
    o.x = a.x + (b.x - a.x) * w;
    o.y = a.y + (b.y - a.y) * w;
    o.z = a.z + (b.z - a.z) * w;
    o.pitch = a.pitch + (b.pitch - a.pitch) * w;
    o.yaw = a.yaw + (b.yaw - a.yaw) * w;
    o.roll = a.roll + (b.roll - a.roll) * w;
    return o;
  }

  /**
   * (anim-joints J2) The tuner's action row weights from this frame's blends (read only): air the lower-state
   * fade, land the landing clip's envelope (in over 0.1 s, out over its last part), melee the elbow arc's hand weight,
   * reload / swap the overlay weights, throw the grenade hands weight, hit the flinch spring (1 at a full hit's peak).
   */
  private writeRowW(i: AnimInput, hx: number): void {
    const r = this.rowW;
    r.air = this.weights.air;
    if (this.landT >= 0) {
      const dur = this.landK > 0 ? LAND_DEEP.duration : LAND.duration;
      r.land = smoothstep(this.landT / 0.1) * (1 - smoothstep((this.landT - 0.3) / Math.max(0.05, dur - 0.3)));
    } else r.land = 0;
    r.melee = i.melee >= 0 ? meleeHandW(clamp(i.melee, 0, 1)) : 0;
    r.reload = this.reloadW;
    r.swap = this.swapW;
    r.throw = this.handClipW;
    r.hit = Math.min(1, Math.abs(hx) * HIT_ROW_K);
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
 * m/s), into the run by `runFrom` (3.8: ~4.2 m/s). (mocap-trial-2, sprint) With the mocap set's sprint clip: the run alone to
 * `runTo` (4.2), crossed into the sprint by `sprintFrom` (5.0: the game's sprint pace; above the top gear the effort pace is
 * the real pace). Smoothstep fades: the gait never pops; the stride and cadence stay the
 * planner's, from the actual ground speed.
 */
export const KEYED_GAITS = { walkTo: 2.0, jogFrom: 2.6, jogTo: 3.2, runFrom: 3.8, runTo: 4.2, sprintFrom: 5.0 } as const;
/** (anim-rework S2) The keyed idle's cycle (s): three slow breaths, a weight shift each way and a head scan each way. */
export const KEYED_IDLE_PERIOD = 12;
/** (mixamo-retarget I1) The hand-made idle and its cycle, as `WREN_KEYED` holds them off: every rig but Wren's. */
const HAND_IDLE: { readonly idle: KeyedClip; readonly idlePeriod: number } = { idle: KEYED_IDLE, idlePeriod: KEYED_IDLE_PERIOD };
/**
 * (anim-rework S4, BRIEF 3 "Stealth") The crouched keyed set (S4-KEYS.md), on the crouched effort pace (GAIT_REF.crouch
 * units, `effortSpeed` crouched): the sneak alone up to `sneakTo` (0.7: ~1.1 m/s), cross-faded into the crouch walk by
 * `walkFrom` (1.1: ~1.45 m/s), the crouch walk alone to `walkTo` (1.6: ~1.9 m/s), into the crouch run by `runFrom` (2.3:
 * ~2.45 m/s). The sneak swings `ampMin` of its keyed cycle at a standstill and all of it from `full` (gear 1). `halfK`
 * the moving clips' track half-width share for the planner (keyed about 6.2 cm a foot: 5.3 cm, the planted feet near the
 * line through the pelvis' stepping twist), `idleHalfK` the crouched idle's (keyed 12.2 cm a foot: about 8.8 cm, the
 * feet about hip width). `kneeOut` the clips' knee pole share added (a little in: on the narrow track the bent
 * knees stay over the toes, not 3.4 cm outside the ankles). `period` (s) the crouched idle's cycle (three slow breaths, a weight shift, a
 * head scan). `settleIn` / `settleOut` (s) the crouched idle's share eases in on a stop (the hands travel down onto the
 * knees, the hips settle into the squat) and out on a start (a crouched quick stop let the hands jump 11 cm in a frame);
 * `paceTau` (s) the crouched set's effort pace is eased, slower as the body comes to rest (over `paceTau` / the moving
 * share: a crouched stop's held pace drops to 0 when the kneel flag lets it go, and the sneak / crouch walk mix under the
 * settling squat jumped 4 cm).
 * `squat`: holstered and still the keyed squat with the hands on the knees is the crouched idle (no kneel;
 * false brings the one-knee kneel back). The clips' pelvis height is the crouch's whole depth: it replaces the procedural
 * crouch drop by the crouched share (the rig adds the keyed height).
 */
export const KEYED_CROUCH = { sneakTo: 0.7, walkFrom: 1.1, walkTo: 1.6, runFrom: 2.3, ampMin: 0.6, full: 0.5, halfK: 0.85, idleHalfK: 0.72, kneeOut: -0.04, period: 12, settleIn: 0.22, settleOut: 0.12, paceTau: 0.1, squat: true } as const;
/**
 * (anim-rework S4) The crouched clips' foot planner values (S4-KEYS.md "duty and liftH are set from the gait"), matched to
 * the planner: `duty` the stance share (the sneak's long quiet stance; no flight in the crouch run, the rear knee stays
 * off the floor), `lift` the swing foot's lift (m at 1.75 m: the sneak skims, the run clears the floor).
 */
export const KEYED_CROUCH_LEG = {
  sneak: { duty: 0.66, lift: 0.045 },
  walk: { duty: 0.6, lift: 0.06 },
  run: { duty: 0.52, lift: 0.09 },
} as const;
/**
 * (anim-rework S4, BRIEF 3 "the crouch run leans forward and stays low") Added to the moving crouched clips in the game:
 * `lean` (rad) more forward pitch at the pelvis (the chain above inherits it; the keyed arms are turned back by as much,
 * so they still hang as keyed, along the body) and `drop` (m at 1.75 m) a lower pelvis. In the game the keyed clips read
 * upright and high (trunk 17 / 21 / 26 deg, hips 17-25 cm under standing for the sneak / crouch walk / crouch run): about
 * 25 / 28 / 37 deg and 20-27 cm with these. The crouched idle keeps its own.
 * (afp AF3, walk 4.72 P2 "leaning a bit too far forward seems hard to balance") `back` (m at 1.75 m) the hips behind the
 * root, so the body sits over the planted feet: the centre of mass was 11-15 cm ahead of the feet in crouched double
 * support (the keyed idle that balances sits its hips 10 cm back), now about 3 cm; the walk leans 0.18 (was 0.12) so gears
 * 1-3 keep one carriage (AF0 harness: trunk 31.5-32.2 deg, hips within 2.2 cm; were 28-43 deg and 7 cm apart).
 * `leanD` the lean of the drawn crouched legs (`kCrD`, the old values; no `back` there).
 */
export const KEYED_CROUCH_POSE = {
  sneak: { lean: 0.08, leanD: 0.08, drop: 0.02, back: 0.1 },
  walk: { lean: 0.18, leanD: 0.12, drop: 0.03, back: 0.1 },
  run: { lean: 0.2, leanD: 0.2, drop: 0.05, back: 0.08 },
} as const;
/**
 * (afp AF3, walk 4.72 P2) The mocap crouch walk's carriage in the game (it was as captured, M1: trunk 43 deg, hips 7 cm
 * over the keyed crouch walk's, CoM 15 cm ahead of the feet): `lean` (rad, negative: more upright; the arms turned with
 * it as KEYED_CROUCH_POSE's), `drop` and `back` as KEYED_CROUCH_POSE's, and `sway` the share of the capture's lateral
 * pelvis sway kept (8.4 cm p2p over the keyed sneak's narrow feet: now 4.2 cm).
 */
const MOCAP_CROUCH_POSE = { lean: -0.19, leanD: -0.19, drop: 0.05, back: 0.1, sway: 0.5 } as const;
/**
 * (afp AF3) The crouched hips-back offset (`back` above) fades out while turning: gone by `rate` (rad/s of yaw), eased
 * over `tau` (s). With the hips behind the root a crouched landing in a turn hit the leg joints' rate limit
 * (characterRig limitJoint) and the planted heel slid 2-8 cm (mocapCrouch turns at 0.5-0.8 m/s).
 */
const CROUCH_BACK_TURN = { rate: 0.5, tau: 0.1 } as const;
/** (anim-rework S4) The free kneel's stance width share taken off (the feet under the hips; walls keep theirs). */
export const KNEEL_NARROW = 0.12;
/**
 * (anim-rework S3, BRIEF 3 "feet staggered") The drawn ready stance: `period` (s) the ready_stance clip's cycle (two slow
 * breaths), `lead` (m) the support (left) foot ahead and the strong foot as far behind when still with the gun out (an
 * 18 cm stagger, the ready stance's bladed base; the holstered idle keeps IDLE_STANCE.lead), `tau` (s) its easing.
 */
export const READY_STANCE = { period: 8, lead: 0.09, tau: 0.25 } as const;
/** (mocap-trial-2, strafe) How fast the mocap strafe's side follows the travel's (s; a flip cross-fades the left and right
 *  captures over about three of it). */
export const STRAFE_SIDE_TAU = 0.06;
/** (mocap-trial-2, strafe) The mocap strafe's pose fades to the still stance over this (s, rising, through two stages: `stIdle`). */
export const STRAFE_IDLE_TAU = 0.2;
/** (mocap-trial-2, strafe) The captures' cycle amplitude follows the glide's (pace-scaled `amp`) over this (s). */
export const STRAFE_AMP_TAU = 0.06;
/** (mocap-trial-2, strafe) The hips' shift back over the planner's side-steps: `hips` of a cycle's travel against the
 *  travel, changing at most `rate` m/s. */
export const STRAFE_LEAD = { hips: 0.25, rate: 0.3 };
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
/** (anim-n4b, PASS2 row 64) The air pose by `airPoseW` (a drop, a fall, a let-go from a hang): the left foot `lead` and the
 *  right `trail` ahead (pose m), a little more knee (`lift`), the chest back (`chest` rad); free hands out to the sides
 *  and up for balance (`arm*`, root frame, pose m: about chest height, well out from the shoulders). */
export const AIR_POSE = { lead: 0.14, trail: 0.06, lift: 0.04, chest: -0.06, armX: 0.55, armY: 1.2, armZ: 0.1 } as const;
/** (anim-n4b fix) The holds with a wall or a hole's edge in front: a fall straight out of one (let go, slid off) keeps the
 *  air pose's legs under the body (no `lead` / `trail` / `lift`); the arms and chest still take it. */
export const AIR_WALL_FROM: readonly TraverseKind[] = ['hang', 'climb', 'pipeClimb', 'rappel', 'pipeLegs', 'pipeInv', 'wallKick', 'ventDrop', 'crawl', 'crawlOut'];

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
/** (mt2-fixA) The clip feet wait while the gait duty is further than this from the clip's (`clipFeet`; 0.05-0.1 left an
 *  accelerating 3 rad/s turn to the planner's steps under a run pose: an anchored landing slid 7.7-7.9 cm). */
const MOCAP_DUTY_GAP = 0.15;
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

/**
 * (anim-fix-pass AF1) The mocap fast gaits' feet (Michael P1: "anything faster is bad, legs sticking and overlapping
 * eachother"). `MOCAP_FEET_TRACK`: from `from` m/s, in full at `full` (the walk -> jog blend), the planner's stance half on
 * the mocap share is floored at the clips' planted half (writeTargets). `MOCAP_FEET_TURN`: at a jog and faster (eased in
 * over the same speeds) the clip feet hand a turn to the planner past `off` rad/s and take it back under `on` (hysteresis),
 * once the turn has stayed under `on` for `hold` s and not while the pace changes faster than `accel` m/s^2 (a hand-off is never
 * held back; clipFeet): the clip's stance kept a
 * planted foot pinned while the body yawed up to 2.3 (jog), 3.7 (run) and 4.7 (sprint) rad/s over it (MOCAP_FEET.twistMax /
 * the stance), and with no hysteresis the owner changed frame to frame near the limit. The walk keeps MOCAP_FEET.turnMax
 * (the hold applies at any pace, the pace check from MOCAP_FEET_TRACK.from).
 */
const MOCAP_FEET_TRACK = { from: 2.1, full: 2.6, arcK: 0.19, arcMax: 0.05 } as const;
const MOCAP_FEET_TURN = { off: 1.5, on: 1.0, hold: 0.3, accel: 1.5 } as const;
