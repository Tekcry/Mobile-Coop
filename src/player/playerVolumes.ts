/**
 * (rig-pose-fix S1, REPORT G1-G5, G11, G12, G14) A player's body from the SIM, not from the rendered rig: the pelvis,
 * chest (the rig's torso joint), neck and head centres as a pure function of the sim state. The hit volumes, the guards'
 * perception points, the wall head / chest sample of the light meter and the HUD exposure all read this, on every machine
 * alike (the local player from its controller, the host's view of a client and a partner from the wire `MoveState`), so
 * no rig pose (mocap set, anim LOD, frame rate, tuner, interpolation) moves where a round lands or what a guard sees.
 *
 * Inputs (`PlayerBodyIn`): feet, the capsule yaw, the crouch blend and the crouched kneel, the speed and its sideways
 * share, the weapon (drawn,
 * raise, aim pitch), the wall state (side, the peek's share) and the traversal family (traverse kind and phase,
 * tumble) with the attach root lift (`attachLift`, world). Everything else the rig does (the gait bob, the aim twist, the
 * head glance, the stop hold, start / stop / turn moments, the hold / carry bend) is left out; `tests/playerVolumesParity
 * .test.ts` holds the model to Wren's rig with stated bounds and the residuals are in docs/rig-pose-audit/S1-REPORT.md.
 *
 * The fit (values in metres for Wren, 1.68 m, scaled by `height / PLAYER_OPERATOR_HEIGHT`), in the capsule's frame
 * (side = its right, up from the feet, forward = its facing), 12 numbers per entry (pelvis, chest, neck, head: side, up,
 * forward each):
 * - free and still: a table over the crouch blend per weapon class (holstered, drawn at low ready, raised: raised also
 *   over the aim pitch), plus the kneel's offset (crouched and still);
 * - free and moving: a table over the speed per class and stance (standing / crouched, blended by the crouch), added to
 *   the still stance; the aimed classes split ahead / back and the strafe, blended by the sideways share;
 * - back to a wall: a table over the crouch blend and the peek's share (the side-on crouch, the lean, the step to the edge
 *   and the root push onto the face included), per class (holstered, drawn: the raise follows the peek), fitted on the
 *   right side and mirrored; the slide's pace on top;
 * - a traversal family (attached, committed, team moves): a table over its phase (nine knots; the cycle's mean for a cyclic
 *   family), around the capsule plus the attach lift. Families without a table (the takedown, the strike, the hold)
 *   use the free stance.
 * Every table is generated (mean rig offset per knot, 1 mm rounding) by `scripts/player-body-fit.mjs` from the NullEngine
 * sweep `tests/playerVolumesSweep.test.ts` (the parity test's harness, mocap ON: the game's default set; the rig's idle
 * variation moves a rerun's values by up to ~6 mm). Regenerate:
 *   PLAYER_BODY_SWEEP=1 PLAYER_BODY_OUT=pb.tsv npx vitest run tests/playerVolumesSweep.test.ts
 *   node scripts/player-body-fit.mjs pb.tsv --write
 * then `npx vitest run tests/playerVolumesParity.test.ts`.
 *
 * Pure: no Babylon, no rig. `playerBody` writes `out` in place (no allocation).
 */
import type { TraverseKind } from '../anim/animGraph';
import { MOVEMENT } from '../config/movement';
import { easeInOut } from '../anim/motion';
import { OPERATORS } from '../operators/operatorBody';
import { attachGripWeight, emptyMovePose, isAttachedMode, poseFromMoveState, unpackAttachSub, type MoveState } from './moveState';
import { attachLift } from './attach';
import type { Anchor } from '../world/anchors';
import { wallSideFromSub, WALL_SUB } from './wallController';

export interface V3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerBodyIn {
  /** Feet (the capsule's base) and the capsule's yaw (rad). */
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** The eased crouch blend 0..1 (`PlayerController.crouchBlend`, a remote's `crouchStep` of the crouch flag). */
  crouch: number;
  /** Crouched and still (the kneel). */
  kneel: boolean;
  /** Horizontal speed (m/s) and the travel's sideways share in the capsule's frame (|local x| of the unit velocity,
   *  0 ahead / back .. 1 a strafe): the aimed walk's stance. */
  speed: number;
  strafe: number;
  /** A weapon in the hand (draw phase not 0), its raise 0..1 and the aim pitch (rad, the camera's). */
  drawn: boolean;
  raise: number;
  pitch: number;
  /** Back to a wall, its stance side (1 right, -1 left) and the peek's share 0..1 (the smoothstep of the eased peek:
   *  the rig's lean over `WALL.peekLean` locally, `peekShare` of a receiver's eased amount). */
  wall: boolean;
  wallSide: number;
  peek: number;
  /** The traversal family on the body (`PlayerPose.traverse`, `poseFromMoveState`), its phase 0..1 and the tumble. */
  traverse: TraverseKind;
  traverseT: number;
  tumble: number;
  /** The attach root lift (world, m: `attachLift`, the drawn body's offset from the gameplay root while attached). */
  liftX: number;
  liftY: number;
  liftZ: number;
  /** The body's standing height (m). */
  height: number;
}

export interface PlayerBodyOut {
  pelvis: V3;
  chest: V3;
  neck: V3;
  head: V3;
}

export function emptyPlayerBodyIn(): PlayerBodyIn {
  return { x: 0, y: 0, z: 0, yaw: 0, crouch: 0, kneel: false, speed: 0, strafe: 0, drawn: false, raise: 0, pitch: 0, wall: false, wallSide: 1, peek: 0, traverse: 'none', traverseT: 0, tumble: 0, liftX: 0, liftY: 0, liftZ: 0, height: PLAYER_OPERATOR_HEIGHT };
}

export function emptyPlayerBodyOut(): PlayerBodyOut {
  return { pelvis: { x: 0, y: 0, z: 0 }, chest: { x: 0, y: 0, z: 0 }, neck: { x: 0, y: 0, z: 0 }, head: { x: 0, y: 0, z: 0 } };
}

/** The controller's crouch ease (`PlayerController.updateStance`) on a linear amount `k` 0..1 toward `crouched`: a
 *  receiver eases the wire's crouch flag the same way. Returns the new `k`; the blend is `easeInOut(k)`. */
export function crouchStep(k: number, crouched: boolean, dt: number): number {
  return crouched ? Math.min(1, k + dt / MOVEMENT.crouchTime) : Math.max(0, k - dt / MOVEMENT.standTime);
}
export { easeInOut as crouchBlendOf };

/** Wren's height (m, G74): every player's body, the height the tables are fitted at. */
export const PLAYER_OPERATOR_HEIGHT = OPERATORS.wren.height;

/** (F3) Crouched and still this long (s) kneels (`KNEEL_STILL`, repeated: playerController imports Babylon). */
export const BODY_KNEEL_STILL = 0.05;

// <player-body-fit>
// generated by scripts/player-body-fit.mjs from the mocap-ON sweep (rows of 12: pelvis, chest, neck, head x side, up,
// forward; m, Wren)
const FIT_C5 = [0, 0.25, 0.5, 0.75, 1];
const FIT_C3 = [0, 0.5, 1];
const FIT_CW = [0, 0.35, 0.6, 0.85, 1];
const FIT_P5 = [-0.5, -0.25, 0, 0.25, 0.5];
const FIT_PE3 = [0, 0.5, 1];
const FIT_T9 = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
const SP_STAND = [0.75, 1.4, 2.1, 3, 4];
const SP_CROUCH = [0.85, 1.3, 1.7, 2.15, 2.6];
const SP_AIM = [0.5, 1, 1.4];
const SP_WALL0 = [0.2, 0.39];
const SP_WALL1 = [0.25, 0.55];
/** Free, still, over the crouch blend (FIT_C5): holstered, drawn at low ready. */
const STILL_H: readonly number[] = [
  0.009, 0.867, 0.014, 0.008, 1.121, 0.026, 0.011, 1.409, 0.033, 0.012, 1.558, 0.05,
  0.009, 0.701, -0.012, 0.008, 0.953, 0.024, 0.011, 1.238, 0.067, 0.011, 1.387, 0.088,
  0.004, 0.585, -0.048, 0.004, 0.833, 0.011, 0.008, 1.109, 0.091, 0.014, 1.257, 0.114,
  0.003, 0.519, -0.074, 0.003, 0.76, 0.007, 0.007, 1.024, 0.123, 0.013, 1.171, 0.15,
  0.002, 0.504, -0.1, 0.002, 0.736, 0.003, 0.006, 0.982, 0.153, 0.012, 1.129, 0.184,
];
const STILL_L: readonly number[] = [
  0.006, 0.855, 0.01, 0.006, 1.108, 0.041, 0.006, 1.388, 0.11, 0.006, 1.532, 0.15,
  0.005, 0.763, 0.01, 0.005, 1.013, 0.06, 0.005, 1.268, 0.193, 0.005, 1.4, 0.265,
  0.004, 0.669, 0, 0.004, 0.914, 0.067, 0.004, 1.139, 0.247, 0.004, 1.254, 0.344,
  0.004, 0.573, 0, 0.004, 0.813, 0.082, 0.004, 1.009, 0.293, 0.004, 1.106, 0.407,
  0.004, 0.475, 0, 0.004, 0.711, 0.094, 0.004, 0.882, 0.325, 0.004, 0.964, 0.451,
];
/** Free, still, raised: crouch (FIT_C3) x aim pitch (FIT_P5). */
const STILL_A: readonly number[] = [
  0.006, 0.855, -0.004, 0.007, 1.093, 0.086, 0.033, 1.285, 0.299, 0.043, 1.327, 0.443,
  0.006, 0.855, 0.003, 0.007, 1.101, 0.066, 0.025, 1.34, 0.226, 0.032, 1.421, 0.352,
  0.006, 0.855, 0.01, 0.006, 1.107, 0.046, 0.017, 1.378, 0.142, 0.021, 1.491, 0.241,
  0.005, 0.855, 0.016, 0.006, 1.11, 0.025, 0.009, 1.396, 0.052, 0.008, 1.532, 0.116,
  0.006, 0.855, 0.023, 0.005, 1.109, 0.004, 0.001, 1.394, -0.04, -0.004, 1.542, -0.017,
  0.004, 0.66, -0.013, 0.006, 0.887, 0.1, 0.035, 1.041, 0.342, 0.046, 1.061, 0.49,
  0.005, 0.66, -0.007, 0.006, 0.898, 0.082, 0.028, 1.108, 0.278, 0.036, 1.169, 0.415,
  0.005, 0.66, 0, 0.005, 0.907, 0.062, 0.02, 1.158, 0.201, 0.024, 1.255, 0.316,
  0.005, 0.66, 0.007, 0.005, 0.912, 0.041, 0.012, 1.19, 0.115, 0.012, 1.315, 0.198,
  0.005, 0.66, 0.013, 0.005, 0.914, 0.02, 0.004, 1.202, 0.024, 0, 1.345, 0.069,
  0.004, 0.465, -0.013, 0.005, 0.679, 0.123, 0.037, 0.791, 0.386, 0.049, 0.789, 0.536,
  0.004, 0.465, -0.007, 0.005, 0.693, 0.105, 0.03, 0.866, 0.334, 0.04, 0.906, 0.478,
  0.004, 0.465, 0, 0.004, 0.704, 0.087, 0.023, 0.929, 0.266, 0.029, 1.007, 0.393,
  0.004, 0.465, 0.007, 0.004, 0.712, 0.067, 0.014, 0.974, 0.185, 0.016, 1.085, 0.286,
  0.004, 0.465, 0.013, 0.004, 0.717, 0.046, 0.007, 1, 0.097, 0.004, 1.135, 0.163,
];
/** The kneel over the crouched stance: holstered, low ready, raised per pitch (FIT_P5). */
const KNEEL_H: readonly number[] = [
  -0.001, 0.001, 0, -0.001, 0, 0, -0.002, 0, 0.001, -0.003, 0, 0.001,
];
const KNEEL_L: readonly number[] = [
  0.025, -0.009, 0, 0.025, 0.008, -0.061, 0.025, 0.112, -0.208, 0.025, 0.171, -0.281,
];
const KNEEL_A: readonly number[] = [
  0.028, -0.006, 0, 0.029, 0.008, -0.028, 0.03, 0.027, -0.037, 0.031, 0.037, -0.037,
  0.028, -0.009, 0, 0.029, 0.002, -0.03, 0.031, 0.019, -0.044, 0.031, 0.029, -0.047,
  0.028, -0.008, 0, 0.029, 0, -0.031, 0.031, 0.013, -0.049, 0.031, 0.023, -0.056,
  0.028, -0.009, 0, 0.029, -0.004, -0.032, 0.031, 0.005, -0.052, 0.032, 0.012, -0.061,
  0.028, -0.008, 0, 0.029, -0.006, -0.032, 0.031, -0.003, -0.054, 0.032, 0.002, -0.065,
];
/** Free, moving, over the still stance, per speed knot: holstered / low ready standing (SP_STAND) and crouched
 *  (SP_CROUCH), raised standing / crouched (SP_AIM): ahead and back (AF), left and right (AS). */
const MOVE_H0: readonly number[] = [
  -0.022, -0.03, -0.012, -0.022, -0.03, -0.018, -0.011, -0.031, 0, -0.024, -0.031, -0.013,
  -0.023, -0.033, -0.013, -0.022, -0.033, -0.018, -0.012, -0.034, 0.001, -0.025, -0.034, -0.013,
  -0.023, -0.063, -0.012, -0.023, -0.063, -0.016, -0.014, -0.064, 0.003, -0.027, -0.064, -0.01,
  -0.004, -0.037, -0.02, -0.008, -0.044, 0.019, -0.012, -0.054, 0.087, -0.023, -0.054, 0.054,
  -0.01, -0.003, -0.028, -0.007, -0.012, 0.019, -0.005, -0.022, 0.089, -0.024, -0.023, 0.058,
];
const MOVE_H1: readonly number[] = [
  -0.006, 0.136, 0.001, -0.009, 0.12, -0.012, -0.021, 0.095, 0.023, -0.022, 0.095, 0.026,
  -0.001, 0.123, -0.012, -0.002, 0.115, -0.008, -0.01, 0.099, 0.015, -0.012, 0.097, 0.025,
  0, 0.112, -0.026, -0.001, 0.104, -0.008, -0.004, 0.096, 0.003, -0.009, 0.092, 0.019,
  0, 0.111, 0.002, -0.001, 0.097, 0.031, -0.004, 0.083, 0.051, -0.009, 0.077, 0.072,
  -0.003, 0.111, 0.043, -0.003, 0.086, 0.088, -0.008, 0.063, 0.12, -0.013, 0.054, 0.149,
];
const MOVE_L0: readonly number[] = [
  -0.019, -0.042, -0.008, -0.019, -0.04, -0.032, -0.006, -0.033, -0.077, -0.018, -0.028, -0.113,
  -0.019, -0.043, -0.009, -0.02, -0.042, -0.032, -0.007, -0.035, -0.077, -0.018, -0.03, -0.112,
  -0.02, -0.061, -0.008, -0.021, -0.06, -0.03, -0.009, -0.053, -0.074, -0.02, -0.048, -0.109,
  -0.006, -0.038, -0.01, -0.005, -0.043, 0.018, -0.006, -0.063, 0.074, -0.006, -0.077, 0.107,
  -0.007, -0.058, -0.01, -0.007, -0.066, 0.029, -0.006, -0.09, 0.092, -0.005, -0.105, 0.127,
];
const MOVE_L1: readonly number[] = [
  -0.007, 0.164, -0.099, -0.01, 0.146, -0.103, -0.019, 0.195, -0.149, -0.014, 0.26, -0.242,
  -0.003, 0.151, -0.112, -0.004, 0.141, -0.099, -0.007, 0.199, -0.156, -0.004, 0.262, -0.242,
  -0.002, 0.141, -0.126, -0.002, 0.13, -0.099, -0.001, 0.196, -0.168, -0.001, 0.257, -0.248,
  -0.002, 0.14, -0.098, -0.002, 0.122, -0.06, -0.001, 0.183, -0.121, -0.001, 0.242, -0.195,
  -0.005, 0.107, -0.014, -0.005, 0.088, 0.024, -0.005, 0.055, 0.045, -0.005, 0.053, 0.046,
];
const MOVE_AF0: readonly number[] = [
  -0.005, -0.004, -0.01, -0.005, -0.006, 0.001, -0.007, -0.008, 0.008, -0.007, -0.01, 0.01,
  -0.006, -0.006, -0.01, -0.006, -0.007, 0.001, -0.007, -0.01, 0.007, -0.007, -0.012, 0.01,
  -0.006, -0.008, -0.01, -0.006, -0.009, -0.002, -0.006, -0.011, 0.003, -0.007, -0.013, 0.004,
];
const MOVE_AS0: readonly number[] = [
  -0.008, -0.061, -0.01, -0.007, -0.061, -0.008, -0.005, -0.062, -0.007, -0.005, -0.062, -0.006,
  -0.004, -0.093, -0.01, -0.005, -0.093, -0.008, -0.006, -0.093, -0.007, -0.006, -0.094, -0.006,
  -0.006, -0.112, -0.01, -0.006, -0.112, -0.008, -0.006, -0.112, -0.007, -0.006, -0.113, -0.006,
];
const MOVE_AF1: readonly number[] = [
  -0.003, -0.031, 0, -0.004, -0.034, 0.008, -0.005, -0.038, 0.013, -0.005, -0.038, 0.013,
  -0.004, -0.017, 0, -0.004, -0.02, 0.008, -0.005, -0.024, 0.013, -0.005, -0.024, 0.013,
  -0.004, -0.001, 0, -0.004, -0.004, 0.007, -0.004, -0.007, 0.011, -0.005, -0.007, 0.011,
];
const MOVE_AS1: readonly number[] = [
  -0.004, 0.047, 0, -0.004, 0.048, -0.002, -0.004, 0.049, -0.003, -0.004, 0.051, -0.005,
  -0.004, 0.048, 0, -0.004, 0.048, -0.002, -0.004, 0.049, -0.003, -0.004, 0.052, -0.005,
  -0.003, 0.048, 0, -0.004, 0.048, -0.002, -0.004, 0.049, -0.003, -0.004, 0.052, -0.005,
];
/** Back to a wall (stance side right; mirrored for the left): crouch (FIT_CW: the side-on turn eases in over 0.35-0.85) x peek (FIT_PE3), holstered / drawn. */
const WALL_H: readonly number[] = [
  0, 0.846, -0.196, 0, 1.1, -0.203, -0.001, 1.388, -0.214, 0.007, 1.537, -0.201,
  0.128, 0.845, -0.18, 0.14, 1.099, -0.187, 0.168, 1.385, -0.202, 0.185, 1.534, -0.197,
  0.27, 0.842, -0.165, 0.294, 1.095, -0.173, 0.35, 1.377, -0.197, 0.376, 1.525, -0.198,
  -0.001, 0.635, -0.175, -0.001, 0.886, -0.133, -0.001, 1.166, -0.065, -0.005, 1.314, -0.041,
  0.127, 0.635, -0.137, 0.135, 0.885, -0.093, 0.156, 1.165, -0.027, 0.163, 1.313, -0.004,
  0.247, 0.637, -0.103, 0.264, 0.886, -0.055, 0.307, 1.163, 0.011, 0.322, 1.311, 0.033,
  -0.043, 0.545, -0.067, 0.007, 0.787, -0.01, 0.087, 1.049, 0.08, 0.105, 1.196, 0.105,
  0.086, 0.548, -0.047, 0.143, 0.789, 0.009, 0.237, 1.048, 0.092, 0.261, 1.194, 0.117,
  0.217, 0.553, -0.036, 0.282, 0.792, 0.021, 0.395, 1.045, 0.099, 0.429, 1.19, 0.12,
  -0.088, 0.506, -0.093, 0.019, 0.735, -0.081, 0.185, 0.969, -0.057, 0.22, 1.115, -0.043,
  0.058, 0.511, -0.11, 0.172, 0.737, -0.099, 0.348, 0.965, -0.087, 0.394, 1.108, -0.082,
  0.203, 0.517, -0.125, 0.324, 0.74, -0.116, 0.509, 0.96, -0.116, 0.565, 1.1, -0.12,
  -0.1, 0.507, -0.091, 0.025, 0.726, -0.076, 0.216, 0.94, -0.047, 0.255, 1.084, -0.034,
  0.06, 0.514, -0.104, 0.193, 0.729, -0.089, 0.397, 0.932, -0.071, 0.45, 1.072, -0.071,
  0.21, 0.52, -0.106, 0.35, 0.73, -0.092, 0.561, 0.926, -0.081, 0.626, 1.061, -0.086,
];
const WALL_D: readonly number[] = [
  0.054, 0.805, -0.19, 0.036, 1.059, -0.181, 0, 1.345, -0.187, -0.022, 1.493, -0.181,
  0.218, 0.805, -0.152, 0.203, 1.059, -0.14, 0.181, 1.346, -0.131, 0.165, 1.48, -0.065,
  0.382, 0.805, -0.152, 0.37, 1.059, -0.14, 0.363, 1.347, -0.133, 0.353, 1.482, -0.068,
  0.053, 0.68, -0.134, 0.035, 0.933, -0.12, -0.001, 1.218, -0.134, -0.023, 1.367, -0.132,
  0.217, 0.68, -0.098, 0.202, 0.933, -0.081, 0.178, 1.22, -0.079, 0.16, 1.356, -0.017,
  0.382, 0.68, -0.098, 0.37, 0.933, -0.081, 0.36, 1.221, -0.082, 0.349, 1.357, -0.02,
  0.027, 0.602, -0.038, 0.045, 0.853, 0, 0.077, 1.13, 0.072, 0.097, 1.272, 0.116,
  0.173, 0.601, -0.056, 0.19, 0.852, -0.022, 0.216, 1.135, 0.025, 0.263, 1.26, 0.093,
  0.32, 0.601, -0.068, 0.339, 0.852, -0.034, 0.375, 1.135, 0.009, 0.427, 1.258, 0.076,
  0.001, 0.534, -0.094, 0.087, 0.772, -0.084, 0.305, 0.958, -0.057, 0.424, 1.048, -0.043,
  0.165, 0.523, -0.1, 0.244, 0.765, -0.091, 0.415, 0.996, -0.088, 0.54, 1.079, -0.078,
  0.329, 0.523, -0.093, 0.411, 0.763, -0.084, 0.597, 0.984, -0.081, 0.726, 1.059, -0.07,
  0.004, 0.47, -0.116, 0.037, 0.722, -0.112, 0.122, 0.997, -0.102, 0.175, 1.137, -0.095,
  0.168, 0.46, -0.122, 0.225, 0.706, -0.116, 0.392, 0.941, -0.117, 0.515, 1.027, -0.108,
  0.332, 0.456, -0.114, 0.391, 0.702, -0.109, 0.571, 0.927, -0.111, 0.698, 1.005, -0.101,
];
/** The slide over the still wall stance (standing SP_WALL0, crouched SP_WALL1). */
const SLIDE_0: readonly number[] = [
  -0.001, -0.05, 0.026, -0.001, -0.05, 0.026, -0.002, -0.05, 0.027, 0.012, -0.053, 0.041,
  0.004, -0.055, 0.026, 0.004, -0.055, 0.027, 0.002, -0.055, 0.027, 0.018, -0.058, 0.042,
];
const SLIDE_1: readonly number[] = [
  0.071, 0.136, -0.005, 0.063, 0.141, -0.004, 0.056, 0.148, -0.011, 0.058, 0.148, -0.019,
  0.07, 0.138, 0.001, 0.063, 0.142, 0, 0.056, 0.149, -0.007, 0.057, 0.149, -0.014,
];
/** Cyclic families: the cycle's mean (12); phased families: over `FIT_T9` (108). */
const TRAV: Partial<Record<TraverseKind, readonly number[]>> = {
  hang: [
    0, 0.863, 0, 0, 1.112, -0.016, 0, 1.391, -0.051, 0, 1.537, -0.067,
  ],
  climb: [
    0.005, 0.859, 0, 0.005, 1.113, 0.009, 0.005, 1.401, 0.029, 0.005, 1.55, 0.045,
  ],
  pipeClimb: [
    0.004, 0.876, 0, 0.004, 1.127, 0.036, 0.004, 1.412, 0.079, 0.004, 1.56, 0.1,
  ],
  crawl: [
    0.006, 0.423, 0, 0.006, 0.568, 0.209, 0.006, 0.568, 0.497, 0.006, 0.599, 0.644,
  ],
  rappel: [
    0.004, 0.686, 0, 0.004, 0.933, -0.048, 0.004, 1.219, -0.016, 0.004, 1.365, 0.019,
  ],
  split: [
    0.013, 0.437, 0, 0.01, 0.691, 0.007, 0.01, 0.979, 0.003, 0.011, 1.129, 0.013,
  ],
  brace: [
    0.005, 0.667, 0, 0.005, 0.92, 0.032, 0.005, 1.2, 0.097, 0.005, 1.346, 0.134,
  ],
  pipeLegs: [
    0.004, 0.545, -0.338, 0.004, 0.506, -0.588, 0.004, 0.505, -0.876, 0.004, 0.536, -1.023,
  ],
  pipeInv: [
    0.005, 0.207, 0, 0.005, -0.047, -0.015, 0.005, -0.335, -0.012, 0.005, -0.485, -0.005,
  ],
  vault: [
    0.006, 0.859, 0, 0.006, 1.114, 0, 0.006, 1.402, 0.001, 0.006, 1.551, 0.011,
    0.006, 0.831, 0, -0.006, 1.082, 0.041, -0.016, 1.368, 0.074, -0.021, 1.515, 0.101,
    0.006, 0.793, 0, -0.027, 1.034, 0.07, -0.054, 1.313, 0.135, -0.068, 1.456, 0.178,
    0.006, 0.776, 0, -0.034, 1.013, 0.081, -0.068, 1.286, 0.166, -0.086, 1.425, 0.219,
    0.006, 0.763, 0, -0.03, 0.998, 0.086, -0.06, 1.269, 0.179, -0.076, 1.407, 0.237,
    0.006, 0.75, 0, -0.023, 0.993, 0.07, -0.048, 1.269, 0.146, -0.06, 1.41, 0.196,
    0.006, 0.739, 0, -0.012, 0.989, 0.043, -0.027, 1.272, 0.09, -0.035, 1.418, 0.125,
    0.006, 0.726, 0, 0, 0.974, 0.052, -0.005, 1.259, 0.092, -0.007, 1.406, 0.123,
    0.006, 0.773, 0, 0.006, 1.026, 0.018, 0.006, 1.314, 0.03, 0.006, 1.463, 0.046,
  ],
  mantle: [
    0.006, 0.859, 0, 0.006, 1.114, 0, 0.006, 1.402, 0.001, 0.006, 1.551, 0.011,
    0.006, 0.863, 0, 0.006, 1.117, 0.017, 0.006, 1.405, 0.029, 0.006, 1.554, 0.045,
    0.006, 0.62, 0, 0.006, 0.869, 0.045, 0.006, 1.156, 0.074, 0.006, 1.304, 0.099,
    0.006, 0.36, 0, 0.006, 0.603, 0.068, 0.006, 0.888, 0.113, 0.006, 1.034, 0.146,
    0.006, 0.201, 0, 0.006, 0.437, 0.089, 0.006, 0.719, 0.147, 0.006, 0.863, 0.188,
    0.006, 0.387, 0, 0.006, 0.62, 0.094, 0.006, 0.901, 0.157, 0.006, 1.045, 0.199,
    0.006, 0.715, 0, 0.006, 0.96, 0.064, 0.006, 1.245, 0.106, 0.006, 1.391, 0.137,
    0.006, 0.794, 0, 0.006, 1.047, 0.031, 0.006, 1.334, 0.052, 0.006, 1.483, 0.072,
    0.006, 0.84, 0, 0.006, 1.094, 0.015, 0.006, 1.382, 0.024, 0.006, 1.531, 0.039,
  ],
  step: [
    0.006, 0.859, 0, 0.006, 1.114, 0, 0.006, 1.402, 0.001, 0.006, 1.551, 0.011,
    0.006, 0.86, 0, 0.006, 1.115, 0.009, 0.006, 1.403, 0.014, 0.006, 1.552, 0.027,
    0.006, 0.839, 0, 0.006, 1.092, 0.025, 0.006, 1.379, 0.041, 0.006, 1.528, 0.059,
    0.006, 0.821, 0, 0.006, 1.073, 0.036, 0.006, 1.36, 0.059, 0.006, 1.508, 0.081,
    0.006, 0.826, 0, 0.006, 1.078, 0.034, 0.006, 1.365, 0.056, 0.006, 1.514, 0.078,
    0.006, 0.843, 0, 0.006, 1.096, 0.028, 0.006, 1.383, 0.046, 0.006, 1.532, 0.066,
    0.006, 0.859, 0, 0.006, 1.112, 0.021, 0.006, 1.4, 0.034, 0.006, 1.549, 0.051,
    0.006, 0.86, 0, 0.006, 1.114, 0.014, 0.006, 1.402, 0.023, 0.006, 1.552, 0.038,
    0.006, 0.859, 0, 0.006, 1.113, 0.009, 0.006, 1.401, 0.016, 0.006, 1.551, 0.029,
  ],
  drop: [
    0.006, 0.859, 0, 0.006, 1.114, 0, 0.006, 1.402, 0.001, 0.006, 1.551, 0.011,
    0.006, 0.85, 0, 0.006, 1.104, 0.009, 0.006, 1.392, 0.014, 0.006, 1.542, 0.027,
    0.006, 0.801, 0, 0.006, 1.054, 0.025, 0.006, 1.342, 0.035, 0.006, 1.491, 0.053,
    0.006, 0.782, 0, 0.006, 1.035, 0.03, 0.006, 1.322, 0.041, 0.006, 1.471, 0.06,
    0.006, 0.789, 0, 0.006, 1.041, 0.026, 0.006, 1.329, 0.031, 0.006, 1.478, 0.049,
    0.006, 0.801, 0, 0.006, 1.054, 0.019, 0.006, 1.342, 0.017, 0.006, 1.491, 0.032,
    0.006, 0.814, 0, 0.006, 1.068, 0.012, 0.006, 1.356, 0.002, 0.006, 1.506, 0.013,
    0.006, 0.826, 0, 0.006, 1.08, 0.005, 0.006, 1.367, -0.01, 0.006, 1.517, -0.001,
    0.006, 0.83, 0, 0.006, 1.084, 0.003, 0.006, 1.372, -0.015, 0.006, 1.522, -0.008,
  ],
  hop: [
    0.006, 0.859, 0, 0.006, 1.114, 0, 0.006, 1.402, 0.001, 0.006, 1.551, 0.011,
    0.006, 0.831, 0, -0.006, 1.082, 0.041, -0.016, 1.368, 0.074, -0.021, 1.515, 0.101,
    0.006, 0.793, 0, -0.027, 1.034, 0.07, -0.054, 1.313, 0.135, -0.068, 1.456, 0.178,
    0.006, 0.776, 0, -0.034, 1.013, 0.081, -0.068, 1.286, 0.166, -0.086, 1.425, 0.219,
    0.006, 0.763, 0, -0.03, 0.998, 0.086, -0.06, 1.269, 0.179, -0.076, 1.407, 0.237,
    0.006, 0.75, 0, -0.023, 0.993, 0.07, -0.048, 1.269, 0.146, -0.06, 1.41, 0.196,
    0.006, 0.739, 0, -0.012, 0.989, 0.043, -0.027, 1.272, 0.09, -0.035, 1.418, 0.125,
    0.006, 0.726, 0, 0, 0.974, 0.052, -0.005, 1.259, 0.092, -0.007, 1.406, 0.123,
    0.006, 0.773, 0, 0.006, 1.026, 0.018, 0.006, 1.314, 0.03, 0.006, 1.463, 0.046,
  ],
  roll: [
    0.006, 0.763, 0, 0.006, 1.013, 0.044, 0.006, 1.294, 0.11, 0.006, 1.434, 0.163,
    0.006, 0.654, 0.045, 0.006, 0.873, 0.174, 0.006, 1.113, 0.334, 0.006, 1.221, 0.439,
    0.005, 0.399, 0.097, -0.022, 0.488, 0.333, -0.057, 0.576, 0.605, -0.083, 0.593, 0.752,
    0, 0.142, 0.122, -0.092, 0.207, 0.35, -0.209, 0.278, 0.603, -0.296, 0.308, 0.722,
    -0.006, 0.117, 0.12, -0.006, 0.277, 0.318, -0.006, 0.468, 0.533, -0.006, 0.588, 0.623,
    0.001, 0.17, 0.118, 0.093, 0.235, 0.346, 0.21, 0.305, 0.6, 0.297, 0.335, 0.719,
    0.005, 0.408, 0.104, 0.034, 0.445, 0.354, 0.07, 0.472, 0.638, 0.096, 0.457, 0.785,
    0.006, 0.571, 0.005, 0.006, 0.756, 0.178, 0.006, 0.952, 0.389, 0.006, 1.037, 0.513,
    0.006, 0.744, 0, 0.006, 0.996, 0.03, 0.006, 1.283, 0.062, 0.006, 1.43, 0.089,
  ],
  windowVault: [
    0.006, 0.859, 0, 0.006, 1.114, 0, 0.006, 1.402, 0.001, 0.006, 1.551, 0.011,
    0.006, 0.742, 0, 0.006, 0.991, 0.051, 0.006, 1.268, 0.129, 0.006, 1.412, 0.172,
    0.006, 0.588, 0, 0.006, 0.817, 0.11, 0.006, 1.045, 0.287, 0.006, 1.17, 0.37,
    0.006, 0.473, 0, 0.006, 0.673, 0.157, 0.006, 0.815, 0.407, 0.006, 0.9, 0.531,
    0.006, 0.449, 0, 0.006, 0.642, 0.165, 0.006, 0.764, 0.426, 0.006, 0.839, 0.556,
    0.006, 0.472, 0, 0.006, 0.681, 0.145, 0.006, 0.841, 0.384, 0.006, 0.935, 0.501,
    0.006, 0.531, 0, 0.006, 0.766, 0.097, 0.006, 0.999, 0.266, 0.006, 1.125, 0.348,
    0.006, 0.704, 0, 0.006, 0.956, 0.039, 0.006, 1.237, 0.102, 0.006, 1.382, 0.139,
    0.006, 0.83, 0, 0.006, 1.084, 0.009, 0.006, 1.372, 0.016, 0.006, 1.522, 0.029,
  ],
  climbUp: [
    0.006, 0.878, 0, 0.006, 1.133, -0.003, 0.006, 1.42, -0.016, 0.006, 1.57, -0.023,
    0.006, 0.872, 0, 0.006, 1.127, 0.008, 0.006, 1.415, 0.015, 0.006, 1.565, 0.022,
    0.006, 0.857, 0, 0.006, 1.109, 0.031, 0.006, 1.393, 0.082, 0.006, 1.539, 0.117,
    0.006, 0.834, 0, 0.006, 1.083, 0.051, 0.006, 1.357, 0.141, 0.006, 1.495, 0.199,
    0.006, 0.806, 0, 0.006, 1.051, 0.068, 0.006, 1.319, 0.172, 0.006, 1.453, 0.24,
    0.006, 0.773, 0, 0.006, 1.016, 0.074, 0.006, 1.286, 0.177, 0.006, 1.42, 0.243,
    0.006, 0.699, 0, 0.006, 0.947, 0.055, 0.006, 1.224, 0.134, 0.006, 1.365, 0.187,
    0.006, 0.747, 0, 0.006, 1, 0.027, 0.006, 1.286, 0.061, 0.006, 1.433, 0.09,
    0.006, 0.859, 0, 0.006, 1.113, 0.009, 0.006, 1.401, 0.016, 0.006, 1.551, 0.029,
  ],
  ventDrop: [
    0.006, 0.43, 0, 0.006, 0.58, 0.205, 0.006, 0.614, 0.491, 0.006, 0.662, 0.633,
    0.006, 0.433, 0, 0.006, 0.6, 0.191, 0.006, 0.673, 0.47, 0.006, 0.738, 0.605,
    0.006, 0.517, 0, 0.006, 0.721, 0.152, 0.006, 0.881, 0.391, 0.006, 0.982, 0.502,
    0.006, 0.62, 0, 0.006, 0.856, 0.094, 0.006, 1.099, 0.249, 0.006, 1.233, 0.317,
    0.006, 0.709, 0, 0.006, 0.961, 0.036, 0.006, 1.244, 0.09, 0.006, 1.392, 0.112,
    0.006, 0.767, 0, 0.006, 1.021, 0, 0.006, 1.309, -0.009, 0.006, 1.459, -0.015,
    0.006, 0.82, 0, 0.006, 1.074, -0.009, 0.006, 1.361, -0.033, 0.006, 1.511, -0.043,
    0.006, 0.862, 0, 0.006, 1.116, -0.014, 0.006, 1.402, -0.046, 0.006, 1.551, -0.06,
    0.006, 0.872, 0, 0.006, 1.126, -0.016, 0.006, 1.412, -0.051, 0.006, 1.561, -0.066,
  ],
  crawlOut: [
    0.006, 0.426, 0, 0.006, 0.571, 0.209, 0.006, 0.57, 0.497, 0.006, 0.6, 0.644,
    0.006, 0.426, 0, 0.006, 0.571, 0.209, 0.006, 0.573, 0.497, 0.006, 0.604, 0.644,
    0.006, 0.426, 0, 0.006, 0.572, 0.208, 0.006, 0.58, 0.496, 0.006, 0.613, 0.642,
    0.006, 0.426, 0, 0.006, 0.573, 0.207, 0.006, 0.591, 0.494, 0.006, 0.628, 0.64,
    0.006, 0.427, 0, 0.006, 0.593, 0.192, 0.006, 0.677, 0.467, 0.006, 0.741, 0.603,
    0.006, 0.403, 0, 0.006, 0.603, 0.155, 0.006, 0.794, 0.37, 0.006, 0.901, 0.476,
    0.006, 0.427, 0, 0.006, 0.658, 0.104, 0.006, 0.918, 0.227, 0.006, 1.054, 0.291,
    0.006, 0.454, 0, 0.006, 0.698, 0.068, 0.006, 0.98, 0.13, 0.006, 1.125, 0.169,
    0.006, 0.475, 0, 0.006, 0.724, 0.05, 0.006, 1.01, 0.083, 0.006, 1.157, 0.11,
  ],
  wallKick: [
    0.006, 0.763, 0, 0.006, 1.015, 0.038, 0.006, 1.293, 0.113, 0.006, 1.436, 0.157,
    0.006, 0.79, 0, 0.006, 1.044, 0.015, 0.006, 1.33, 0.047, 0.006, 1.479, 0.067,
    0.006, 0.83, 0, 0.006, 1.084, -0.019, 0.006, 1.37, -0.05, 0.006, 1.519, -0.068,
    0.006, 0.861, 0, 0.006, 1.115, -0.023, 0.006, 1.4, -0.062, 0.006, 1.548, -0.088,
    0.006, 0.878, 0, 0.006, 1.132, -0.021, 0.006, 1.417, -0.059, 0.006, 1.565, -0.084,
    0.006, 0.878, 0, 0.006, 1.132, -0.019, 0.006, 1.417, -0.057, 0.006, 1.566, -0.079,
    0.006, 0.878, 0, 0.006, 1.132, -0.018, 0.006, 1.418, -0.054, 0.006, 1.567, -0.073,
    0.006, 0.878, 0, 0.006, 1.132, -0.017, 0.006, 1.418, -0.052, 0.006, 1.567, -0.068,
    0.006, 0.872, 0, 0.006, 1.126, -0.016, 0.006, 1.412, -0.051, 0.006, 1.561, -0.066,
  ],
};
// </player-body-fit>

const acc = new Float64Array(12);

/** Index and fraction of `v` on the knots (clamped). Writes `kn`. */
const kn = { i: 0, f: 0 };
function knot(ks: readonly number[], v: number): void {
  const n = ks.length;
  if (v <= ks[0]!) {
    kn.i = 0;
    kn.f = 0;
    return;
  }
  if (v >= ks[n - 1]!) {
    kn.i = n - 2;
    kn.f = 1;
    return;
  }
  let i = 0;
  while (i < n - 2 && v > ks[i + 1]!) i++;
  kn.i = i;
  kn.f = (v - ks[i]!) / (ks[i + 1]! - ks[i]!);
}

/** acc += w x (row i of `t` blended to row i + 1 by f), rows of 12. */
function add(t: readonly number[], w: number, i: number, f: number): void {
  if (w === 0) return;
  const a = i * 12;
  const b = a + 12;
  const g = 1 - f;
  for (let k = 0; k < 12; k++) acc[k] = acc[k]! + w * (g * t[a + k]! + (f > 0 ? f * (t[b + k] ?? 0) : 0));
}

/** acc += w x the table `t` over the knots `ks` at `v`. */
function add1(t: readonly number[], ks: readonly number[], v: number, w: number): void {
  if (w === 0) return;
  knot(ks, v);
  add(t, w, kn.i, kn.f);
}

/** acc += w x the speed table `t` at `sp` (scaled down to 0 below the first knot). */
function addMove(t: readonly number[], ks: readonly number[], sp: number, w: number): void {
  if (w === 0 || sp <= 0.01) return;
  const k0 = ks[0]!;
  add1(t, ks, sp, sp < k0 ? (w * sp) / k0 : w);
}

/** acc += w x the 2D table `t` (rows over `ka` outer, `kb` inner) at (a, b). */
function add2(t: readonly number[], ka: readonly number[], kb: readonly number[], a: number, b: number, w: number): void {
  if (w === 0) return;
  knot(ka, a);
  const ia = kn.i;
  const fa = kn.f;
  knot(kb, b);
  const nb = kb.length;
  add(t, w * (1 - fa), ia * nb + kn.i, kn.f);
  if (fa > 0) add(t, w * fa, (ia + 1) * nb + kn.i, kn.f);
}

/**
 * The body's joint centres for the sim state `i` (world, m). Writes `out` in place; no allocation.
 */
export function playerBody(i: PlayerBodyIn, out: PlayerBodyOut): PlayerBodyOut {
  acc.fill(0);
  const c = Math.max(0, Math.min(1, i.crouch));
  const trav = i.traverse !== 'none' ? TRAV[i.traverse] : undefined;
  let mirror = 1;
  if (trav) {
    if (trav.length === 12) add(trav, 1, 0, 0);
    else add1(trav, FIT_T9, i.traverseT, 1);
  } else if (i.wall) {
    const pe = Math.max(0, Math.min(1, i.peek));
    add2(i.drawn ? WALL_D : WALL_H, FIT_CW, FIT_PE3, c, pe, 1);
    addMove(SLIDE_0, SP_WALL0, i.speed, 1 - c);
    addMove(SLIDE_1, SP_WALL1, i.speed, c);
    mirror = i.wallSide < 0 ? -1 : 1;
  } else {
    const d = i.drawn ? 1 : 0;
    const r = d * Math.max(0, Math.min(1, i.raise));
    const wh = 1 - d;
    const wl = d * (1 - r);
    const p = Math.max(-0.5, Math.min(0.5, i.pitch));
    add1(STILL_H, FIT_C5, c, wh);
    add1(STILL_L, FIT_C5, c, wl);
    add2(STILL_A, FIT_C3, FIT_P5, c, p, r);
    if (i.kneel) {
      add(KNEEL_H, wh, 0, 0);
      add(KNEEL_L, wl, 0, 0);
      add1(KNEEL_A, FIT_P5, p, r);
    } else if (i.speed > 0.01) {
      addMove(MOVE_H0, SP_STAND, i.speed, wh * (1 - c));
      addMove(MOVE_H1, SP_CROUCH, i.speed, wh * c);
      addMove(MOVE_L0, SP_STAND, i.speed, wl * (1 - c));
      addMove(MOVE_L1, SP_CROUCH, i.speed, wl * c);
      // aimed: ahead / back and the strafe, by the travel's sideways share
      const sd = Math.max(0, Math.min(1, i.strafe));
      addMove(MOVE_AF0, SP_AIM, i.speed, r * (1 - c) * (1 - sd));
      addMove(MOVE_AS0, SP_AIM, i.speed, r * (1 - c) * sd);
      addMove(MOVE_AF1, SP_AIM, i.speed, r * c * (1 - sd));
      addMove(MOVE_AS1, SP_AIM, i.speed, r * c * sd);
    }
  }
  const k = i.height / PLAYER_OPERATOR_HEIGHT;
  const s = Math.sin(i.yaw);
  const co = Math.cos(i.yaw);
  const bx = i.x + (trav ? i.liftX : 0);
  const by = i.y + (trav ? i.liftY : 0);
  const bz = i.z + (trav ? i.liftZ : 0);
  put(out.pelvis, 0, bx, by, bz, s, co, k, mirror);
  put(out.chest, 3, bx, by, bz, s, co, k, mirror);
  put(out.neck, 6, bx, by, bz, s, co, k, mirror);
  put(out.head, 9, bx, by, bz, s, co, k, mirror);
  return out;
}

function put(o: V3, a: number, bx: number, by: number, bz: number, s: number, c: number, k: number, mirror: number): void {
  const side = acc[a]! * k * mirror;
  const up = acc[a + 1]! * k;
  const fwd = acc[a + 2]! * k;
  // right (cos, -sin), forward (sin, cos)
  o.x = bx + side * c + fwd * s;
  o.y = by + up;
  o.z = bz - side * s + fwd * c;
}

/** The peek's share from an eased peek amount (the owner's smoothstep, `poseFromMoveState`'s lean). */
export function peekShare(k: number): number {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
}

// ---- inputs from the wire (the host's view of a client, a partner on either machine)

const mp = emptyMovePose();

/**
 * The model's mode fields from a wire `MoveState` (the host's `RemotePlayer`, a partner's `RemoteAvatar`): the wall side
 * and crouch bit, the weapon (draw phase, raise), the traversal family from `poseFromMoveState` (a cyclic family's
 * cadence is not on the wire: the model uses the cycle's mean). `peek` is the receiver's eased peek amount (0..1 over `WALL.peekBlend`; its share is taken here). Leaves the
 * position, yaw, crouch blend, kneel, speed, pitch and lift to the caller. No allocation.
 */
export function bodyFromMoveState(mv: MoveState | undefined, peek: number, out: PlayerBodyIn): PlayerBodyIn {
  out.wall = false;
  out.wallSide = 1;
  out.peek = 0;
  out.traverse = 'none';
  out.traverseT = 0;
  out.tumble = 0;
  if (!mv) {
    out.drawn = false;
    out.raise = 0;
    return out;
  }
  out.drawn = mv.dw !== 0;
  out.raise = mv.r;
  if (mv.m === 'wall') {
    out.wall = true;
    out.wallSide = wallSideFromSub(mv.sub);
    out.peek = mv.sub & (WALL_SUB.edgeL | WALL_SUB.edgeR) ? peekShare(peek) : 0;
    return out;
  }
  poseFromMoveState(mv, 0, mp, 0);
  out.traverse = mp.traverse;
  out.traverseT = mp.traverseT;
  out.tumble = mp.tumble;
  out.drawn = mp.drawn;
  return out;
}

/**
 * The attach root lift of a wire attached state on its anchor (world, m): `AttachGrips.liftTo` (the drawn body's offset
 * from the gameplay root at the body's height, faded on and off with the grips), without a pipe change's blend. Zero off
 * an anchor. The host's view of a client reads it (the local player has its own, `Player.rootLift`).
 */
export function attachLiftOf(mv: MoveState | undefined, a: Anchor | undefined, height: number, out: V3): V3 {
  out.x = out.y = out.z = 0;
  if (!mv || !a || !isAttachedMode(mv.m)) return out;
  const sub = unpackAttachSub(mv.sub);
  const w = attachGripWeight(sub.phase, mv.ph, sub.exit === 'climbUp' || sub.exit === 'mantle');
  attachLift(a, mv.s, sub.face, height, out, a.kind === 'pipeH' ? sub.pipe : 'hands', mv.u ?? 0);
  out.x *= w;
  out.y *= w;
  out.z *= w;
  return out;
}

// ---- the two builders: the local player (its controller) and the host's view of a client (the accepted wire state)

/** What the local player's sim gives the model (`Player` has this shape). */
export interface LocalBodySrc {
  readonly position: V3;
  readonly controller: { readonly yaw: number; readonly crouchBlend: number; readonly kneeling: boolean; readonly speed: number; readonly localMove: { readonly x: number } };
  readonly carry: { readonly raise: number };
  readonly cam: { readonly pitch: number };
  readonly pose: { readonly wall: boolean; readonly wallSide: number; readonly lean: number; readonly traverse: TraverseKind; readonly traverseT: number; readonly tumble: number };
  readonly rootLift: V3;
}

/**
 * (rig-pose-fix S1) The local player's model input (`PlayerTarget.sync`, every fixed step): the controller's crouch,
 * kneel, pace and local move, the weapon (`drawn`: draw phase not holstered; the raise; the camera pitch), the wall
 * stance (the peek's share is the rig's lean over `WALL.peekLean`), the traversal family and the attach lift. No
 * allocation.
 */
export function localBodyIn(pl: LocalBodySrc, drawn: boolean, peekLean: number, out: PlayerBodyIn): PlayerBodyIn {
  const c = pl.controller;
  const pose = pl.pose;
  out.x = pl.position.x;
  out.y = pl.position.y;
  out.z = pl.position.z;
  out.yaw = c.yaw;
  out.crouch = c.crouchBlend;
  out.kneel = c.kneeling;
  out.speed = c.speed;
  out.strafe = Math.min(1, Math.abs(c.localMove.x));
  out.drawn = drawn;
  out.raise = pl.carry.raise;
  out.pitch = pl.cam.pitch;
  out.wall = pose.wall;
  out.wallSide = pose.wallSide < 0 ? -1 : 1;
  out.peek = pose.wall ? Math.min(1, Math.abs(pose.lean) / peekLean) : 0;
  out.traverse = pose.traverse;
  out.traverseT = pose.traverseT;
  out.tumble = pose.tumble;
  out.liftX = pl.rootLift.x;
  out.liftY = pl.rootLift.y;
  out.liftZ = pl.rootLift.z;
  return out;
}

/** The accepted wire state's fields the model reads (`PlayerState`; Babylon- and net-free). */
export interface WireBodySrc {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly speed: number;
  readonly mv?: MoveState;
}

/**
 * (rig-pose-fix S1, G3) The host's view of a client (`RemotePlayer.accept`): the model input from the accepted state, the
 * receiver's eased crouch blend (`crouchStep` of the crouch flag), its kneel timer, eased peek amount, the step's
 * sideways share and the attach lift on the client's anchor (`attachLiftOf`). `maxSpeed` caps the claimed pace. No
 * allocation.
 */
export function wireBodyIn(s: WireBodySrc, crouch: number, kneel: boolean, peek: number, strafe: number, maxSpeed: number, lift: V3, out: PlayerBodyIn): PlayerBodyIn {
  out.x = s.x;
  out.y = s.y;
  out.z = s.z;
  out.yaw = s.yaw;
  out.crouch = crouch;
  out.kneel = kneel;
  out.speed = Math.max(0, Math.min(maxSpeed, s.speed));
  out.strafe = strafe;
  out.pitch = s.pitch;
  bodyFromMoveState(s.mv, peek, out);
  out.liftX = lift.x;
  out.liftY = lift.y;
  out.liftZ = lift.z;
  return out;
}
