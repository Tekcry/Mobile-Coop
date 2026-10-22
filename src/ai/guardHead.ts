/**
 * (guard-render S3a) A human guard's head hit volume from the SIM, not from the rendered rig.
 *
 * The head sphere used to follow `rig.headNode` (copied at render rate in `Enemy.frame`): gameplay read graphics
 * state, and the rig's anim LOD (far guards solve every other frame) made it lag. This module gives the head centre
 * from the sim state alone (feet, yaw, crouch, velocity in the guard's frame, gait clock, aim, pitch, wall, lean, held /
 * blind pose, ladder). The rig is not touched; the model is a fit of the rig's head node, `tests/guardHeadParity.test.ts`
 * holds it to the rig (T1 steady 5 cm, T2 posed 8 cm, T3 transitions 12 cm, with the written exceptions there).
 *
 * The fit, in units of `height / 1.75` (root-local forward / up from the standing `hitVolumes().headY`, side):
 * - standing still: a small quadratic of aim, crouch and aim pitch (`FIT.idle*`), the wall and lean on top;
 * - moving: the still stance plus a table over the direction of travel in the guard's frame (|theta|, 0 = straight
 *   ahead) and the speed (`MOVE`, bilinear), per stride class (the rig's stride along the facing or along the velocity,
 *   the dash, armed or unarmed, standing or crouched: crouch blends the two), with the aim's and the pitch's terms and
 *   the stride's left / right head bob on the gait clock (`phase`, the motion driver's, which the rig follows);
 * - moving at a wall: the wall stance plus `WALL_MOVE` / `WALL_LEAN_MOVE` over the direction relative to the wall side.
 * The tables were fitted (least squares, per frame, 1 mm rounding) to a NullEngine sweep of the rig fed as `Enemy.frame`
 * feeds it, a `MotionDriver` giving the velocity and the gait clock: grunt, heavy, sniper, enforcer, officer, droneOp
 * armed, the runner unarmed; aim 0.2 / 0.4 / 0.7 / 1, pitch -0.3 / 0 / 0.3, crouch 0 / 1, 14 directions, 0.15 m/s up to
 * the run speed; the wall at 0.3 - 1.3 m/s. `GUARD_HEAD_PRINT=1` on the parity test prints the rig offsets per case.
 *
 * Pure: no Babylon, no rig. `guardHead` writes `out` in place (no allocation).
 */
import { proportions, type Build } from '../player/proportions';
import type { GuardCqMode } from '../game/closeQuarters';

type Q2 = readonly [number, number, number, number, number, number];
type Q3 = readonly [number, number, number, number, number, number, number, number, number, number];

function q2(c: Q2, x: number, y: number): number {
  return c[0] + c[1] * x + c[2] * y + c[3] * x * x + c[4] * x * y + c[5] * y * y;
}
function q3(c: Q3, x: number, y: number, z: number): number {
  return c[0] + c[1] * x + c[2] * y + c[3] * z + c[4] * x * x + c[5] * x * y + c[6] * x * z + c[7] * y * y + c[8] * y * z + c[9] * z * z;
}

/** Root-local head offset (forward F, up U above the standing head height) standing still, standard height.
 *  Variables: a = aim 0..1, c = crouch 0..1, p = aim pitch (rad, clamped +-0.5). Quadratic terms in the order
 *  1, x0, x1, .., x0x0, x0x1, .., x1x1, .. */
const FIT = {
  /** Armed, standing still (a, c, p): the gun-ready stance. Sweep: aim 0..1 x pitch +-0.5 x crouch 0..1, speed 0. */
  idleAF: [0.167, 0.108, 0.406, -0.12, -0.043, -0.164, -0.358, -0.086, 0.077, -0.061] as Q3,
  idleAU: [-0.027, -0.068, -0.57, 0.002, -0.003, 0.095, 0.24, -0.03, 0.113, -0.085] as Q3,
  /** Unarmed (the runner), standing still (c, p): the hands-down stance. */
  idleNF: [0.047, 0.495, -0.105, -0.073, 0.041, -0.005] as Q2,
  idleNU: [-0.021, -0.387, 0.007, -0.224, 0.075, -0.009] as Q2,
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

/** (S3a fix) A free-movement table: the head offset added to the still stance while moving (units of `height / 1.75`). */
interface MoveTable {
  /** |theta| knots (deg, the direction of travel in the guard's frame, 0 straight ahead) and speed knots (m/s). */
  th: readonly number[];
  sp: readonly number[];
  /** Up and forward per (theta knot, speed knot), one row per theta knot. Below the first speed knot the offset
   *  scales down to 0 at a standstill (the dash tables clamp instead: the dash starts above the first knot). */
  up: readonly number[];
  fw: readonly number[];
  /** The stride's left / right head bob (the gait clock's first harmonic, signed by the side of travel), same layout;
   *  null where it is under 5 mm (crouched). */
  bob: readonly number[] | null;
  /** Up and forward per unit aim, per theta knot; null where the class has one aim (unarmed, the dash). */
  aimUp: readonly number[] | null;
  aimFw: readonly number[] | null;
  /** The aim pitch beyond the still stance's: up p, up p^2, forward p, forward p^2. */
  pitch: readonly [number, number, number, number];
  /** Side offset: constant, per aim, per p, per p^2. */
  sx: readonly [number, number, number, number];
  /** The bob's phase on the gait clock (cycles; left heel strike at 0). */
  ph: number;
}
type MoveClass = 'AF0' | 'AF1' | 'AV0' | 'AV1' | 'DF' | 'DV' | 'NF0' | 'NF1' | 'NV0' | 'NV1';

/** (S3a fix) Moving with the back to a wall: added to the still wall stance (lean 0) or the still lean (lean 1).
 *  Theta is relative to the wall side (`theta * wallSide`, signed); up per (theta, speed), forward and side per |theta|
 *  (side times `wallSide`), all scaled down to 0 below the first speed knot. */
interface WallTable {
  up: readonly number[];
  fw: readonly number[];
  sx: readonly number[];
  /** up p, up p^2, forward p, forward p^2, side p, side p^2 (scaled with the speed like the rest). */
  pitch: readonly [number, number, number, number, number, number];
}

// ---- (S3a fix) the fitted movement tables (values in height / 1.75 units, 1 mm rounding)

const TH_F = [0, 30, 50];
const TH_V = [0, 30, 50, 70, 90, 120, 150, 180];
const TH_VN = [70, 90, 120, 150, 180];
const SP_W = [.15, .4, .7, 1, 1.4, 1.8, 2.2, 2.8, 3.4, 4.2];
const SP_C = [.15, .4, .7, 1, 1.4];
const SP_D = [1.6, 2.2, 2.8, 3.4];

const MOVE: Record<MoveClass, MoveTable> = {
  /** armed, weapon low (aim < 0.5), stride along the facing (|theta| < 60 deg), standing. */
  AF0: {
    th: TH_F,
    sp: SP_W,
    up: [
      -.028, -.03, -.029, -.029, -.028, -.034, -.049, .005, .038, .05,
      -.028, -.029, -.029, -.029, -.029, -.034, -.057, .034, .058, .062,
      -.024, -.032, -.045, -.062, -.038, -.058, -.085, .152, .096, .079,
    ],
    fw: [
      -.117, -.137, -.133, -.134, -.136, -.135, -.123, -.079, -.08, -.08,
      -.117, -.137, -.133, -.134, -.136, -.135, -.123, -.08, -.08, -.08,
      -.117, -.137, -.133, -.134, -.135, -.135, -.123, -.08, -.08, -.08,
    ],
    bob: [
      0, 0, 0, 0, .001, .003, .009, .028, .039, .044,
      0, 0, 0, 0, 0, -.001, -.004, .034, .046, .049,
      0, .01, .03, .045, -.01, -.006, -.017, .087, .063, .056,
    ],
    aimUp: [.071, .071, .059],
    aimFw: [.101, .101, .101],
    pitch: [0, 0, 0, 0],
    sx: [0, 0, 0, 0],
    ph: -0.05,
  },
  /** armed, weapon low, stride along the facing, crouched. */
  AF1: {
    th: TH_F,
    sp: SP_C,
    up: [
      .226, .278, .268, .27, .282,
      .226, .278, .268, .27, .281,
      .228, .278, .268, .27, .281,
    ],
    fw: [
      -.251, -.295, -.286, -.29, -.235,
      -.252, -.295, -.286, -.29, -.236,
      -.252, -.295, -.286, -.29, -.235,
    ],
    bob: null,
    aimUp: [-.299, -.299, -.3],
    aimFw: [.358, .359, .359],
    pitch: [0, 0, 0, 0],
    sx: [-.001, .011, 0, 0],
    ph: -0.05,
  },
  /** armed, stride along the velocity (aim >= 0.5, or the weapon low going sideways / back), standing. */
  AV0: {
    th: TH_V,
    sp: SP_W,
    up: [
      -.018, -.021, -.023, -.026, -.033, -.052, -.069, -.103, -.11, -.115,
      -.031, -.037, -.037, -.042, -.062, -.104, -.093, -.087, -.092, -.111,
      -.041, -.053, -.063, -.088, -.13, -.186, -.121, -.091, -.087, -.079,
      -.05, -.056, -.067, -.092, -.134, -.175, -.119, -.113, -.111, -.093,
      -.058, -.067, -.07, -.092, -.131, -.172, -.121, -.11, -.111, -.089,
      -.057, -.068, -.073, -.098, -.14, -.185, -.121, -.088, -.083, -.071,
      -.063, -.066, -.069, -.08, -.107, -.149, -.141, -.111, -.108, -.128,
      -.066, -.03, -.041, -.055, -.069, -.089, -.107, -.143, -.18, -.2,
    ],
    fw: [
      -.012, -.007, -.008, -.008, -.014, -.014, 0, .018, .032, .048,
      -.018, -.014, -.015, -.015, -.019, -.019, -.009, .003, .012, .022,
      -.021, -.018, -.018, -.018, -.021, -.021, -.014, -.004, .002, .009,
      -.022, -.019, -.02, -.02, -.022, -.021, -.012, -.01, -.006, -.003,
      -.025, -.025, -.025, -.025, -.025, -.025, -.019, -.021, -.021, -.021,
      -.029, -.028, -.029, -.029, -.029, -.028, -.022, -.023, -.022, -.023,
      -.031, -.032, -.032, -.032, -.032, -.031, -.025, -.026, -.025, -.025,
      -.011, -.006, -.007, -.007, -.013, -.012, .006, .02, .034, .048,
    ],
    bob: [
      0, 0, .001, .003, .007, .011, .008, .003, .002, .001,
      0, 0, 0, 0, .008, .018, .009, 0, .001, .001,
      0, .009, .008, .015, .022, .033, .007, 0, -.001, .007,
      .004, .001, .007, .012, .017, .023, .004, -.001, -.007, .005,
      .003, -.001, .002, .008, .012, .02, .004, 0, -.006, -.002,
      .002, .001, .003, .011, .016, .025, .005, -.003, -.006, .012,
      0, .001, 0, .003, .012, .022, .018, 0, -.001, .003,
      .017, .007, -.004, .001, -.002, -.001, .001, -.004, -.003, .008,
    ],
    aimUp: [.024, .025, .024, .025, .025, .026, .027, .025],
    aimFw: [.036, .036, .037, .034, .035, .035, .035, .033],
    pitch: [-.005, -.155, -.011, -.054],
    sx: [-.003, .018, -.05, 0],
    ph: 0.21,
  },
  /** armed, stride along the velocity, crouched. */
  AV1: {
    th: TH_V,
    sp: SP_C,
    up: [
      -.046, -.075, -.063, -.043, -.024,
      -.05, -.051, -.051, -.051, -.038,
      -.033, -.031, -.031, -.031, -.023,
      .001, .007, .006, .006, .011,
      .024, .035, .033, .034, .033,
      .024, .035, .033, .033, .033,
      .025, .037, .034, .035, .035,
      -.067, -.071, -.05, -.035, -.01,
    ],
    fw: [
      .006, .009, .008, .008, .006,
      .001, .003, .002, .002, .001,
      -.001, -.001, -.001, -.001, -.002,
      -.012, -.012, -.012, -.012, -.013,
      -.016, -.017, -.017, -.017, -.017,
      -.017, -.018, -.018, -.018, -.018,
      -.019, -.021, -.02, -.02, -.02,
      -.003, 0, 0, 0, -.002,
    ],
    bob: null,
    aimUp: [.062, .056, .054, .035, .034, .034, .034, .042],
    aimFw: [.027, .026, .026, .035, .034, .034, .034, .036],
    pitch: [.017, -.082, .001, -.136],
    sx: [.005, .021, -.048, -.023],
    ph: 0.21,
  },
  /** armed, weapon low, the dash (faster than `dashFrom`), stride along the facing, standing. */
  DF: {
    th: TH_F,
    sp: SP_D,
    up: [
      -.055, -.097, -.147, -.162,
      -.054, -.098, -.149, -.162,
      -.086, -.117, -.167, -.169,
    ],
    fw: [
      .035, .091, .149, .164,
      .035, .091, .149, .164,
      .035, .091, .149, .164,
    ],
    bob: [
      0, 0, 0, 0,
      0, -.001, -.001, 0,
      -.007, -.003, -.002, -.004,
    ],
    aimUp: null,
    aimFw: null,
    pitch: [0, 0, 0, 0],
    sx: [.006, 0, 0, 0],
    ph: -0.05,
  },
  /** armed, weapon low, the dash, stride along the velocity, standing. */
  DV: {
    th: TH_V,
    sp: SP_D,
    up: [
      -.181, -.179, -.177, -.176,
      -.184, -.179, -.176, -.175,
      -.191, -.176, -.174, -.173,
      -.213, -.16, -.171, -.17,
      -.209, -.161, -.168, -.168,
      -.225, -.161, -.152, -.148,
      -.149, -.175, -.164, -.164,
      -.095, -.135, -.201, -.242,
    ],
    fw: [
      .08, .085, .091, .095,
      .075, .083, .093, .099,
      .062, .08, .101, .109,
      .03, .074, .121, .126,
      .028, .067, .11, .112,
      .025, .064, .109, .111,
      .022, .062, .106, .108,
      .035, .091, .149, .164,
    ],
    bob: [
      .011, .009, .007, .006,
      .012, .009, .006, .004,
      .017, .009, .004, .001,
      .031, .005, -.001, -.004,
      .024, .005, 0, -.004,
      .033, .005, -.002, -.003,
      .015, .015, 0, 0,
      .003, .002, -.004, -.002,
    ],
    aimUp: null,
    aimFw: null,
    pitch: [0, 0, 0, 0],
    sx: [.007, 0, 0, 0],
    ph: 0.21,
  },
  /** unarmed (melee), stride along the facing, standing. */
  NF0: {
    th: TH_F,
    sp: SP_W,
    up: [
      -.005, -.013, -.01, -.011, -.011, -.019, -.032, -.076, -.105, -.119,
      -.004, -.012, -.01, -.011, -.011, -.024, -.044, -.063, -.109, -.123,
      -.008, -.026, -.042, -.065, -.031, -.063, -.073, -.035, -.121, -.142,
    ],
    fw: [
      -.001, -.003, -.002, -.002, -.002, -.001, -.008, .158, .232, .246,
      -.001, -.003, -.002, -.002, -.002, -.001, -.008, .16, .231, .246,
      -.001, -.003, -.002, -.002, -.002, -.001, -.008, .161, .231, .246,
    ],
    bob: [
      0, 0, 0, 0, -.001, -.003, -.003, 0, -.002, -.003,
      0, 0, 0, 0, -.001, -.004, -.007, .005, -.004, -.004,
      .005, .019, .035, .041, -.017, -.008, -.02, .001, -.003, -.011,
    ],
    aimUp: null,
    aimFw: null,
    pitch: [0, 0, 0, 0],
    sx: [0, 0, 0, 0],
    ph: -0.05,
  },
  /** unarmed, stride along the facing, crouched. */
  NF1: {
    th: TH_F,
    sp: SP_C,
    up: [
      .212, .283, .27, .27, .287,
      .213, .283, .268, .269, .287,
      .215, .283, .268, .27, .287,
    ],
    fw: [
      -.218, -.292, -.275, -.284, -.208,
      -.219, -.292, -.275, -.284, -.207,
      -.22, -.291, -.275, -.283, -.208,
    ],
    bob: null,
    aimUp: null,
    aimFw: null,
    pitch: [0, 0, 0, 0],
    sx: [.001, 0, 0, 0],
    ph: -0.05,
  },
  /** unarmed, stride along the velocity, standing. */
  NV0: {
    th: TH_VN,
    sp: SP_W,
    up: [
      -.028, -.036, -.058, -.088, -.142, -.167, -.104, -.133, -.14, -.122,
      -.033, -.041, -.06, -.091, -.136, -.158, -.11, -.143, -.131, -.13,
      -.036, -.044, -.062, -.098, -.143, -.18, -.1, -.151, -.107, -.113,
      -.048, -.039, -.052, -.075, -.109, -.155, -.131, -.166, -.153, -.212,
      -.059, -.018, -.031, -.048, -.066, -.084, -.105, -.216, -.25, -.261,
    ],
    fw: [
      -.004, -.002, -.003, -.002, -.005, .002, .072, .184, .189, .193,
      -.008, -.007, -.007, -.007, -.008, -.001, .066, .173, .174, .173,
      -.012, -.011, -.011, -.011, -.012, -.004, .063, .172, .173, .173,
      -.014, -.015, -.014, -.014, -.015, -.007, .06, .171, .17, .17,
      .007, .012, .011, .011, .004, .011, .092, .207, .228, .247,
    ],
    bob: [
      .001, .014, .016, .019, .025, .026, 0, -.007, -.009, -.004,
      .004, .008, .013, .016, .019, .021, .001, -.003, -.007, -.007,
      0, .012, .014, .022, .024, .029, .001, -.012, -.003, 0,
      .001, .009, .01, .015, .02, .03, .017, .001, -.001, 0,
      .019, .007, -.004, .001, .004, -.001, .003, -.016, .008, .007,
    ],
    aimUp: null,
    aimFw: null,
    pitch: [0, 0, 0, 0],
    sx: [0, 0, 0, 0],
    ph: 0.21,
  },
  /** unarmed, stride along the velocity, crouched. */
  NV1: {
    th: TH_VN,
    sp: SP_C,
    up: [
      .021, .027, .026, .026, .031,
      .044, .056, .053, .054, .054,
      .044, .056, .053, .053, .054,
      .045, .057, .055, .055, .055,
      -.042, -.045, -.025, -.008, .015,
    ],
    fw: [
      .001, .001, .001, .001, 0,
      -.003, -.004, -.004, -.004, -.004,
      -.004, -.006, -.005, -.005, -.005,
      -.006, -.008, -.008, -.008, -.008,
      .011, .013, .013, .013, .011,
    ],
    bob: null,
    aimUp: null,
    aimFw: null,
    pitch: [0, 0, 0, 0],
    sx: [0, 0, 0, 0],
    ph: 0.21,
  },
};

const WALL_TH = [-180, -150, -120, -90, -70, -50, -30, 0, 30, 50, 70, 90, 120, 150, 180];
const WALL_THA = [0, 30, 50, 70, 90, 120, 150, 180];
const WALL_SP = [.3, .6, .9, 1.3];
const WALL_MOVE: WallTable = {
  up: [
    -.025, -.014, -.02, -.027,
    -.052, -.053, -.053, -.057,
    -.053, -.053, -.053, -.058,
    -.054, -.054, -.054, -.058,
    -.04, -.04, -.041, -.046,
    -.031, -.032, -.033, -.042,
    -.022, -.022, -.022, -.022,
    -.005, -.005, -.005, -.005,
    -.022, -.022, -.026, -.028,
    -.043, -.043, -.046, -.083,
    -.047, -.047, -.052, -.088,
    -.054, -.056, -.059, -.083,
    -.053, -.059, -.061, -.1,
    -.052, -.054, -.057, -.072,
    -.025, -.014, -.02, -.027,
  ],
  fw: [.027, .021, .018, .014, .01, .006, .003, .027],
  sx: [.03, .031, .032, .032, .033, .034, .035, .03],
  pitch: [-.005, .017, .041, 0, -.153, .001],
};
const WALL_LEAN_MOVE: WallTable = {
  up: [
    -.058, -.097, -.146, -.207,
    -.192, -.218, -.25, -.263,
    -.148, -.199, -.23, -.251,
    -.155, -.215, -.24, -.246,
    -.158, -.2, -.243, -.229,
    -.145, -.193, -.214, -.247,
    -.15, -.164, -.212, -.234,
    .011, -.02, -.059, -.115,
    -.055, -.144, -.177, -.196,
    -.096, -.139, -.189, -.197,
    -.096, -.142, -.184, -.204,
    -.104, -.152, -.197, -.211,
    -.099, -.14, -.185, -.203,
    -.049, -.148, -.195, -.212,
    -.058, -.097, -.146, -.207,
  ],
  fw: [.111, .106, .103, .1, .096, .093, .09, .111],
  sx: [.062, .063, .064, .064, .065, .066, .067, .062],
  pitch: [.009, .03, .09, 0, -.152, .016],
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
const TAU = Math.PI * 2;
const R2D = 180 / Math.PI;

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
  /** (S3a fix) The velocity in the guard's frame (m/s): `moveX` to his right, `moveZ` ahead (`Enemy.frame`'s localX /
   *  localZ times the speed). Both 0 with `speed` above 0 is read as straight ahead. */
  moveX: number;
  moveZ: number;
  /** (S3a fix) The gait clock 0..1 (`MotionDriver.phase`, which the rig's stride follows). */
  phase: number;
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

// ---- table lookup (module scratch: one guard at a time, no allocation)

let kt0 = 0;
let kt1 = 0;
let ktf = 0;
let ks0 = 0;
let ks1 = 0;
let ksf = 0;
let ksz = 1;

/** The bracketing knots and weights of theta (clamped to the knots) and speed (below the first knot: scaled to 0 at
 *  rest when `ramp`, else clamped; above the last: clamped). */
function knots(th: readonly number[], sp: readonly number[], t: number, s: number, ramp: boolean): void {
  const nt = th.length;
  const t0 = th[0]!;
  const tn = th[nt - 1]!;
  const tc = t < t0 ? t0 : t > tn ? tn : t;
  let i = 0;
  while (i < nt - 2 && tc > th[i + 1]!) i++;
  kt0 = i;
  kt1 = i + 1;
  ktf = (tc - th[i]!) / (th[i + 1]! - th[i]!);
  const ns = sp.length;
  const s0 = sp[0]!;
  if (s <= s0) {
    ks0 = 0;
    ks1 = 0;
    ksf = 0;
    ksz = ramp ? (s > 0 ? s / s0 : 0) : 1;
  } else if (s >= sp[ns - 1]!) {
    ks0 = ns - 1;
    ks1 = ns - 1;
    ksf = 0;
    ksz = 1;
  } else {
    let j = 0;
    while (s > sp[j + 1]!) j++;
    ks0 = j;
    ks1 = j + 1;
    ksf = (s - sp[j]!) / (sp[j + 1]! - sp[j]!);
    ksz = 1;
  }
}

/** Bilinear value of a (theta, speed) table at the last `knots`. */
function cell(a: readonly number[], ns: number): number {
  const r0 = kt0 * ns;
  const r1 = kt1 * ns;
  const v0 = a[r0 + ks0]! + (a[r0 + ks1]! - a[r0 + ks0]!) * ksf;
  const v1 = a[r1 + ks0]! + (a[r1 + ks1]! - a[r1 + ks0]!) * ksf;
  return (v0 + (v1 - v0) * ktf) * ksz;
}

/** Linear value of a per-theta-knot row at the last `knots`. */
function along(a: readonly number[]): number {
  return a[kt0]! + (a[kt1]! - a[kt0]!) * ktf;
}

let mSx = 0;
let mUp = 0;
let mFw = 0;

/** A free-move table's offset (side, up, forward into `mSx` / `mUp` / `mFw`, units of `height / 1.75`). */
function moveOff(t: MoveTable, a: number, p: number, th: number, side: number, s: number, ph: number): void {
  knots(t.th, t.sp, th, s, t.sp !== SP_D);
  const ns = t.sp.length;
  let up = cell(t.up, ns);
  let fw = cell(t.fw, ns);
  if (t.aimUp !== null && t.aimFw !== null) {
    up += along(t.aimUp) * a;
    fw += along(t.aimFw) * a;
  }
  const pt = t.pitch;
  up += pt[0] * p + pt[1] * p * p;
  fw += pt[2] * p + pt[3] * p * p;
  if (t.bob !== null && side !== 0) up += cell(t.bob, ns) * side * Math.cos(TAU * (ph - t.ph));
  const sx = t.sx;
  mSx = sx[0] + sx[1] * a + sx[2] * p + sx[3] * p * p;
  mUp = up;
  mFw = fw;
}

/** A wall-move table's offset (side relative to the wall side, up, forward; into `mSx` / `mUp` / `mFw`). */
function wallOff(t: WallTable, thr: number, s: number, p: number): void {
  knots(WALL_TH, WALL_SP, thr, s, true);
  const ns = WALL_SP.length;
  const z = ksz;
  const up = cell(t.up, ns);
  knots(WALL_THA, WALL_SP, thr < 0 ? -thr : thr, s, true);
  const pt = t.pitch;
  mUp = up + (pt[0] * p + pt[1] * p * p) * z;
  mFw = (along(t.fw) + pt[2] * p + pt[3] * p * p) * z;
  mSx = (along(t.sx) + pt[4] * p + pt[5] * p * p) * z;
}

/** The guards' stride speed swing (`ENEMY_MOTION.rootDip`: the driver's speed is the pace times 1 - dip cos(4 pi phase)). */
export const ROOT_DIP = 0.05;

/** (S3a fix) The rig's eased dash weight near `dashFrom`: the rig gets `dash` 1 whenever the swinging speed is over it
 *  and eases it (0.15 s), so it settles at the share of the stride spent over it (from the pace under the swing). */
function dashShare(sp: number, dashFrom: number, ph: number): number {
  if (dashFrom === Number.POSITIVE_INFINITY) return 0;
  const pace = sp / (1 - ROOT_DIP * Math.cos(2 * TAU * ph));
  const q = (1 - dashFrom / pace) / ROOT_DIP;
  return q >= 1 ? 1 : q <= -1 ? 0 : 1 - Math.acos(q) / Math.PI;
}

/** The head centre in world space, written to `out`. Offsets are computed root-local (forward, up, side) then turned. */
export function guardHead(i: GuardHeadIn, r: GuardHeadRest, out: HeadOut): void {
  const c = i.crouch < 0 ? 0 : i.crouch > 1 ? 1 : i.crouch;
  const pt = clampPitch(i.aimPitch);
  const climb = i.climb;
  const a = climb ? 0 : i.aim;
  const sp = climb ? 0 : i.speed;
  // the still stance (the base every moving offset is fitted on)
  let f: number;
  let u: number;
  if (r.armed) {
    f = q3(FIT.idleAF, a, c, pt);
    u = q3(FIT.idleAU, a, c, pt);
  } else {
    f = q2(FIT.idleNF, c, pt);
    u = q2(FIT.idleNU, c, pt);
  }
  let sx = 0;
  // the direction of travel in the guard's frame (theta 0 straight ahead, `side` the sign of the sideways part)
  const mx = i.moveX;
  const mz = mx === 0 && i.moveZ === 0 ? sp : i.moveZ;
  const side = mx > 0 ? 1 : mx < 0 ? -1 : 0;
  const th = sp > 0 ? Math.atan2(mx < 0 ? -mx : mx, mz) * R2D : 0;
  if (sp > 0 && !i.wall) {
    // (S3a fix) moving: the stride class's table, crouch blending the standing and crouched ones
    const facing = a < 0.5 && mz > 0.5 * sp;
    const dw = r.armed && a < 0.5 ? dashShare(sp, r.dashFrom, i.phase) : 0;
    const t0 = r.armed ? (facing ? MOVE.AF0 : MOVE.AV0) : facing ? MOVE.NF0 : MOVE.NV0;
    const t1 = r.armed ? (facing ? MOVE.AF1 : MOVE.AV1) : facing ? MOVE.NF1 : MOVE.NV1;
    if (c < 1) {
      const w0 = (1 - c) * (1 - dw);
      if (w0 > 0) {
        moveOff(t0, a, pt, th, side, sp, i.phase);
        sx += mSx * w0;
        u += mUp * w0;
        f += mFw * w0;
      }
      if (dw > 0) {
        moveOff(facing ? MOVE.DF : MOVE.DV, a, pt, th, side, sp, i.phase);
        const wd = (1 - c) * dw;
        sx += mSx * wd;
        u += mUp * wd;
        f += mFw * wd;
      }
    }
    if (c > 0) {
      moveOff(t1, a, pt, th, side, sp, i.phase);
      sx += mSx * c;
      u += mUp * c;
      f += mFw * c;
    }
  }
  const k = r.k;
  f *= k;
  u *= k;
  sx *= k;
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
    const cu = c * 2;
    const ci = cu >= 1 ? 1 : 0;
    const cf = cu - ci;
    const lu = (al > 1 ? 1 : al) * 4;
    const li = lu >= 4 ? 3 : Math.floor(lu);
    const lf = lu - li;
    const d0t = FIT.leanDrop[ci]!;
    const d1t = FIT.leanDrop[ci + 1]!;
    const d0 = d0t[li]! + (d0t[li + 1]! - d0t[li]!) * lf;
    const d1 = d1t[li]! + (d1t[li + 1]! - d1t[li]!) * lf;
    let drop = d0 + (d1 - d0) * cf;
    if (i.wall) drop *= 1 + FIT.leanWallAsym * l * i.wallSide;
    u -= drop * k;
  }
  if (sp > 0 && i.wall) {
    // (S3a fix) moving along the wall: the wall-move table, the lean's share on the moving-lean table
    const ws = i.wallSide;
    const thr = side * th * (ws < 0 ? -1 : 1);
    const lw = l < 0 ? (l < -1 ? 1 : -l) : l > 1 ? 1 : l;
    let wS = 0;
    let wU = 0;
    let wF = 0;
    if (lw < 1) {
      wallOff(WALL_MOVE, thr, sp, pt);
      wS = mSx * (1 - lw);
      wU = mUp * (1 - lw);
      wF = mFw * (1 - lw);
    }
    if (lw > 0) {
      wallOff(WALL_LEAN_MOVE, thr, sp, pt);
      wS += mSx * lw;
      wU += mUp * lw;
      wF += mFw * lw;
    }
    sx += wS * ws * k;
    u += wU * k;
    f += wF * k;
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
