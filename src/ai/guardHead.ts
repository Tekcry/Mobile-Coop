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
 * - held (seized, hostage, ...): the held pose replaces forward / up and the free-move side offset; a walked hostage adds
 *   `HELD_MOVE` (the rig's own gait under the pose: `Enemy.frame` gives it phase -1 when held).
 * Every table is fitted (least squares, per frame, 1 mm rounding) by `scripts/guard-head-fit.mjs` from the NullEngine
 * sweep `tests/guardHeadSweep.test.ts` (the parity test's harness: the rig fed as `Enemy.frame` feeds it, a
 * `MotionDriver` giving the velocity and the gait clock). Regenerate (S3a fix 2), from the repo root:
 *   MOVE (between the `<guard-head-fit free>` markers): grunt, heavy, sniper, enforcer, officer, droneOp armed, the runner
 *   unarmed (as fitted before G298 armed him; refit: polish P1); aim 0.2 / 0.4 / 0.7 / 1 (aim 1 also at pitch -0.3 /
 *   0.3), crouch 0 / 1, 14 directions, 0.15 m/s up to the run speed, in 8 parts (one vitest each):
 *     for i in 0 1 2 3 4 5 6 7; do GUARD_HEAD_SWEEP=1 GUARD_HEAD_CASES=free GUARD_HEAD_EVERY=3 GUARD_HEAD_PART=$i/8 \
 *       GUARD_HEAD_OUT=free-$i.tsv npx vitest run tests/guardHeadSweep.test.ts; done
 *     node scripts/guard-head-fit.mjs free free-*.tsv --write
 *   HELD_MOVE (`<guard-head-fit hostage>`):
 *     GUARD_HEAD_SWEEP=1 GUARD_HEAD_CASES=hostage GUARD_HEAD_LEN=3 GUARD_HEAD_OUT=hostage.tsv npx vitest run tests/guardHeadSweep.test.ts
 *     node scripts/guard-head-fit.mjs hostage hostage.tsv --write
 *   WALL_MOVE / WALL_LEAN_MOVE (printed, pasted by hand):
 *     GUARD_HEAD_SWEEP=1 GUARD_HEAD_SETTLE=2.5 GUARD_HEAD_LEN=2 GUARD_HEAD_OUT=wall.tsv npx vitest run tests/guardHeadSweep.test.ts
 *     node scripts/guard-head-fit.mjs wall wall.tsv
 * Then `npx vitest run tests/guardHeadParity.test.ts`. `GUARD_HEAD_PRINT=1` on the parity test prints the rig offsets
 * per case.
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
  /** (S3a fix round) The stride's first harmonic on the gait clock (up, signed by the side of travel), same layout as
   *  `up`; null where it is under 5 mm (lean 0). */
  bobC: readonly number[] | null;
  bobS: readonly number[] | null;
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

// <guard-head-fit free>
const MOVE: Record<MoveClass, MoveTable> = {
  /** armed, weapon low (aim < 0.5), stride along the facing (|theta| < 60 deg), standing. */
  AF0: {
    th: TH_F,
    sp: SP_W,
    up: [
      -.026, -.029, -.029, -.029, -.028, -.034, -.045, -.058, -.067, -.067,
      -.026, -.029, -.028, -.028, -.028, -.034, -.05, -.057, -.068, -.067,
      -.024, -.031, -.044, -.062, -.038, -.06, -.071, -.041, -.063, -.065,
    ],
    fw: [
      -.112, -.134, -.133, -.133, -.135, -.134, -.127, .001, .032, .035,
      -.112, -.134, -.133, -.133, -.135, -.134, -.129, .011, .039, .038,
      -.111, -.134, -.133, -.133, -.135, -.134, -.129, .008, .04, .039,
    ],
    bob: [
      0, 0, 0, 0, 0, 0, -.001, .001, .002, .002,
      0, 0, 0, 0, 0, -.001, -.003, .003, .003, .003,
      .002, .01, .03, .044, -.01, -.006, -.014, .005, .003, .003,
    ],
    aimUp: [.07, .069, .057],
    aimFw: [.1, .1, .1],
    pitch: [0, 0, 0, 0],
    sx: [0, 0, 0, 0],
    ph: -0.05,
  },
  /** armed, weapon low, stride along the facing, crouched. */
  AF1: {
    th: TH_F,
    sp: SP_C,
    up: [
      .215, .269, .267, .268, .279,
      .214, .269, .268, .268, .28,
      .212, .27, .268, .267, .279,
    ],
    fw: [
      -.239, -.285, -.283, -.286, -.232,
      -.239, -.284, -.283, -.286, -.232,
      -.237, -.284, -.283, -.285, -.232,
    ],
    bob: null,
    aimUp: [-.294, -.294, -.293],
    aimFw: [.346, .345, .345],
    pitch: [0, 0, 0, 0],
    sx: [0, .011, 0, 0],
    ph: -0.05,
  },
  /** armed, stride along the velocity (aim >= 0.5, or the weapon low going sideways / back), standing. */
  AV0: {
    th: TH_V,
    sp: SP_W,
    up: [
      -.017, -.022, -.024, -.027, -.035, -.053, -.07, -.106, -.115, -.113,
      -.03, -.037, -.037, -.041, -.063, -.1, -.095, -.09, -.095, -.106,
      -.044, -.048, -.065, -.089, -.134, -.182, -.127, -.09, -.087, -.084,
      -.047, -.053, -.068, -.094, -.132, -.172, -.121, -.114, -.114, -.101,
      -.054, -.065, -.07, -.093, -.133, -.169, -.125, -.113, -.11, -.1,
      -.055, -.065, -.074, -.099, -.139, -.182, -.122, -.09, -.082, -.087,
      -.052, -.065, -.065, -.079, -.108, -.15, -.141, -.115, -.111, -.127,
      -.034, -.03, -.04, -.053, -.068, -.089, -.108, -.144, -.185, -.172,
    ],
    fw: [
      -.011, -.007, -.006, -.007, -.013, -.013, .004, .025, .039, .041,
      -.016, -.013, -.012, -.013, -.016, -.017, -.004, .011, .02, .027,
      -.018, -.016, -.016, -.016, -.019, -.019, -.009, .003, .01, .015,
      -.021, -.018, -.019, -.018, -.02, -.02, -.007, -.002, .001, .004,
      -.025, -.023, -.023, -.023, -.023, -.023, -.014, -.013, -.014, -.01,
      -.028, -.027, -.027, -.027, -.027, -.027, -.017, -.015, -.016, -.013,
      -.03, -.03, -.03, -.03, -.03, -.029, -.02, -.018, -.018, -.007,
      -.011, -.005, -.006, -.006, -.012, -.011, .011, .027, .041, .032,
    ],
    bob: [
      0, 0, .001, .003, .007, .01, .008, .004, .002, .001,
      0, 0, 0, .001, .008, .015, .01, .001, .002, 0,
      .004, .003, .011, .015, .022, .032, .008, -.001, 0, -.001,
      .005, .001, .007, .012, .016, .023, .004, -.001, -.009, -.002,
      .002, 0, .003, .007, .014, .019, .005, -.001, -.006, -.001,
      .003, 0, .005, .011, .017, .025, .005, -.003, -.002, .002,
      0, 0, 0, .005, .012, .022, .016, .002, -.001, .002,
      .001, .001, .003, .006, .011, .015, .012, .006, .002, .002,
    ],
    aimUp: [.026, .026, .026, .025, .025, .026, .028, .026],
    aimFw: [.033, .032, .033, .031, .031, .031, .031, .03],
    pitch: [-.007, -.155, -.011, -.018],
    sx: [-.003, .017, -.05, .001],
    ph: 0.21,
  },
  /** armed, stride along the velocity, crouched. */
  AV1: {
    th: TH_V,
    sp: SP_C,
    up: [
      -.051, -.084, -.062, -.046, -.026,
      -.05, -.053, -.052, -.053, -.039,
      -.034, -.032, -.032, -.033, -.023,
      -.001, .006, .006, .006, .011,
      .02, .034, .033, .033, .034,
      .021, .033, .033, .033, .034,
      .022, .035, .035, .035, .035,
      -.062, -.069, -.049, -.035, -.009,
    ],
    fw: [
      .005, .009, .008, .009, .006,
      .001, .003, .003, .003, .001,
      -.001, 0, -.001, 0, -.002,
      -.012, -.012, -.012, -.012, -.013,
      -.016, -.017, -.017, -.017, -.017,
      -.017, -.018, -.018, -.018, -.018,
      -.019, -.021, -.02, -.02, -.02,
      -.003, 0, 0, 0, -.002,
    ],
    bob: null,
    aimUp: [.063, .058, .056, .034, .034, .034, .034, .041],
    aimFw: [.026, .025, .026, .035, .035, .034, .034, .036],
    pitch: [.018, -.08, .001, -.136],
    sx: [.005, .022, -.048, -.027],
    ph: 0.21,
  },
  /** armed, weapon low, the dash (faster than `dashFrom`), stride along the facing, standing. */
  DF: {
    th: TH_F,
    sp: SP_D,
    up: [
      -.065, -.111, -.161, -.175,
      -.065, -.112, -.164, -.175,
      -.099, -.13, -.181, -.184,
    ],
    fw: [
      .052, .111, .17, .183,
      .052, .111, .17, .183,
      .052, .111, .17, .183,
    ],
    bob: [
      0, 0, -.001, 0,
      0, -.001, -.001, 0,
      -.006, -.003, -.003, -.005,
    ],
    aimUp: [.044, .046, .047],
    aimFw: [-.064, -.064, -.065],
    pitch: [0, 0, 0, 0],
    sx: [0, .021, 0, 0],
    ph: -0.05,
  },
  /** armed, weapon low, the dash, stride along the velocity, standing. */
  DV: {
    th: TH_V,
    sp: SP_D,
    up: [
      -.197, -.195, -.193, -.192,
      -.199, -.194, -.192, -.191,
      -.206, -.192, -.19, -.189,
      -.228, -.176, -.187, -.187,
      -.22, -.181, -.184, -.182,
      -.236, -.176, -.166, -.16,
      -.169, -.187, -.181, -.179,
      -.108, -.149, -.216, -.258,
    ],
    fw: [
      .099, .104, .111, .115,
      .095, .103, .113, .119,
      .081, .099, .12, .128,
      .05, .093, .141, .145,
      .048, .086, .131, .131,
      .045, .084, .13, .129,
      .042, .081, .127, .127,
      .054, .109, .169, .182,
    ],
    bob: [
      .01, .008, .006, .005,
      .012, .008, .005, .004,
      .017, .008, .003, 0,
      .03, .005, -.001, -.006,
      .024, .006, -.001, -.004,
      .031, .006, -.002, -.001,
      .018, .012, .001, 0,
      .014, .01, .005, .002,
    ],
    aimUp: [.052, .052, .052, .052, .052, .049, .053, .052],
    aimFw: [-.064, -.064, -.064, -.064, -.065, -.065, -.066, -.061],
    pitch: [0, 0, 0, 0],
    sx: [0, .023, 0, 0],
    ph: 0.21,
  },
  /** unarmed (melee), stride along the facing, standing. */
  NF0: {
    th: TH_F,
    sp: SP_W,
    up: [
      -.003, -.011, -.011, -.011, -.011, -.019, -.035, -.086, -.102, -.119,
      -.002, -.011, -.011, -.011, -.012, -.025, -.043, -.09, -.107, -.122,
      -.009, -.025, -.042, -.062, -.036, -.064, -.068, -.104, -.12, -.14,
    ],
    fw: [
      -.001, -.002, -.002, -.002, -.002, -.002, 0, .205, .23, .246,
      0, -.002, -.002, -.002, -.002, -.002, -.006, .208, .229, .247,
      0, -.002, -.002, -.002, -.002, -.002, -.006, .208, .229, .247,
    ],
    bob: [
      0, .001, .001, 0, -.001, -.003, -.004, -.003, -.003, -.004,
      0, .001, .001, .001, -.001, -.004, -.006, -.001, -.003, -.004,
      .009, .019, .034, .04, -.009, -.01, -.017, -.004, -.005, -.005,
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
      .203, .27, .271, .271, .287,
      .2, .272, .272, .271, .287,
      .198, .272, .271, .271, .288,
    ],
    fw: [
      -.207, -.279, -.279, -.279, -.203,
      -.205, -.279, -.279, -.281, -.202,
      -.204, -.279, -.279, -.28, -.202,
    ],
    bob: null,
    aimUp: null,
    aimFw: null,
    pitch: [0, 0, 0, 0],
    sx: [.002, 0, 0, 0],
    ph: -0.05,
  },
  /** unarmed, stride along the velocity, standing. */
  NV0: {
    th: TH_VN,
    sp: SP_W,
    up: [
      -.021, -.033, -.058, -.091, -.143, -.164, -.106, -.14, -.137, -.107,
      -.025, -.04, -.061, -.092, -.141, -.156, -.111, -.137, -.131, -.13,
      -.03, -.042, -.064, -.097, -.146, -.175, -.108, -.113, -.105, -.11,
      -.026, -.034, -.048, -.072, -.11, -.154, -.132, -.143, -.153, -.211,
      -.024, -.019, -.031, -.045, -.063, -.086, -.111, -.173, -.237, -.256,
    ],
    fw: [
      -.005, -.003, -.003, -.003, -.005, .004, .074, .179, .19, .193,
      -.008, -.007, -.007, -.007, -.008, 0, .067, .169, .175, .174,
      -.012, -.011, -.011, -.011, -.012, -.003, .064, .167, .174, .173,
      -.014, -.014, -.014, -.014, -.015, -.006, .062, .165, .172, .172,
      .006, .01, .01, .01, .003, .013, .092, .206, .228, .244,
    ],
    bob: [
      .009, .01, .017, .021, .024, .024, 0, -.004, -.009, -.001,
      .008, .008, .013, .016, .021, .02, .002, -.004, -.008, -.007,
      .008, .01, .016, .02, .025, .027, .002, -.006, -.001, -.001,
      .005, .004, .012, .016, .021, .029, .018, .003, -.001, 0,
      .006, .007, .011, .015, .019, .021, .015, .007, .002, .001,
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
      .021, .027, .027, .027, .032,
      .041, .053, .053, .053, .054,
      .042, .053, .054, .053, .054,
      .042, .054, .054, .054, .055,
      -.035, -.039, -.021, -.007, .016,
    ],
    fw: [
      .001, .001, .001, .001, 0,
      -.003, -.004, -.004, -.004, -.004,
      -.004, -.005, -.005, -.005, -.005,
      -.005, -.007, -.007, -.007, -.007,
      .01, .012, .012, .012, .01,
    ],
    bob: null,
    aimUp: null,
    aimFw: null,
    pitch: [0, 0, 0, 0],
    sx: [0, 0, 0, 0],
    ph: 0.21,
  },
};
// </guard-head-fit free>

/** (S3a fix 2) A walked hostage (held, `Enemy.holdAt` gives him a velocity): the rig's own gait under the held pose,
 *  added to the held still pose. Up and forward per (theta knot, speed knot `SP_H`), one row per theta knot, scaled down
 *  to 0 below the first speed knot (units of `height / 1.75`).
 *
 *  (S3a fix 3) The class switch stays a step, on the rig's own test: `Enemy.frame` gives the rig stride 'facing' when
 *  `localZ = moveZ / speed > 0.5` (and 'velocity' past 60 deg), and the rig's head steps with it: armed, the facing
 *  stride's keyed walk carries the head 6.7 cm further back (forward -0.075 against -0.008 m at 0.6 m/s), reached in
 *  ~0.1 s (the keyed walk's weight eases at tau 0.08 s, its pelvis at 1.2 m/s). A blend across the boundary would be off
 *  the rig on both sides of it for every steady direction in the band; the step is off it only for the ~0.1 s the rig
 *  takes to cross. `heldFacing` computes the test exactly as the rig's (`moveZ * (1 / speed)`), so the two switch on
 *  the same frame. The theta knots reach the boundary from both sides (`TH_HF` up to 59 deg, `TH_HV` from 61 deg; the
 *  60 deg row of round 2 sat on the boundary and its frames split between the classes). Near the boundary the facing
 *  stride slips sideways and the rig's head dips up to 11 cm below its mean for ~0.5 s at irregular times (the foot
 *  planner catching up; 52-60 deg at 0.45 m/s, 54-60 at 0.6, 58-60 at 0.75): the fit gives the mean there.
 *  (The rig also takes stride 'velocity' when the held guard's `aimWeight()` is 0.5 or more; the sim gets aim 0 when
 *  held and assumes the calm weight: a follow-up, docs/archive/guard-render/STATE.md "Fix round 3".)
 *
 *  After a release (`releaseTakedown`) the held weight `poseW` fades over 0.2 s with the last held pose kept, and
 *  `HELD_MOVE` and the free-move side removal (`sxm`) still apply scaled by it while the guard moves: a known short
 *  transient (at most 0.2 s, the size of the table's value times the fading weight). */
interface HeldMoveTable {
  th: readonly number[];
  up: readonly number[];
  fw: readonly number[];
}
type HeldMoveClass = 'AF' | 'NF' | 'V';
const TH_HF = [0, 30, 45, 50, 55, 59];
const TH_HV = [61, 75, 90, 120, 150, 180];
const SP_H = [.15, .3, .45, .6, .75, .9, 1.2, 1.6];

/** (S3a fix 3) The rig's stride class test (`Enemy.frame`: `localZ > 0.5`, `localZ = moveZ * (1 / speed)`), bit for bit. */
function heldFacing(mz: number, sp: number): boolean {
  return sp > 0.01 && mz * (1 / sp) > 0.5;
}
// <guard-head-fit hostage>
const HELD_MOVE: Record<HeldMoveClass, HeldMoveTable> = {
  /** armed, stride along the facing. */
  AF: {
    th: TH_HF,
    up: [
      -.025, -.035, -.035, -.035, -.035, -.035, -.035, -.034,
      -.025, -.035, -.035, -.035, -.035, -.035, -.035, -.034,
      -.025, -.044, -.056, -.037, -.039, -.043, -.052, -.071,
      -.025, -.049, -.037, -.04, -.042, -.049, -.06, -.078,
      -.026, -.052, -.07, -.074, -.045, -.053, -.066, -.09,
      -.026, -.055, -.074, -.078, -.093, -.098, -.07, -.099,
    ],
    fw: [
      -.057, -.074, -.074, -.074, -.074, -.074, -.074, -.063,
      -.057, -.074, -.074, -.074, -.074, -.074, -.074, -.044,
      -.057, -.074, -.074, -.074, -.074, -.074, -.074, -.073,
      -.057, -.074, -.074, -.074, -.074, -.074, -.074, -.029,
      -.057, -.074, -.074, -.074, -.074, -.074, -.074, -.055,
      -.057, -.074, -.074, -.074, -.074, -.074, -.074, -.074,
    ],
  },
  /** unarmed, stride along the facing. */
  NF: {
    th: TH_HF,
    up: [
      .002, -.007, -.007, -.007, -.007, -.007, -.007, -.009,
      .002, -.007, -.007, -.007, -.007, -.007, -.008, -.016,
      -.002, -.029, -.052, -.018, -.022, -.03, -.042, -.064,
      -.005, -.036, -.019, -.023, -.028, -.037, -.052, -.078,
      -.006, -.042, -.07, -.075, -.032, -.043, -.059, -.088,
      -.007, -.045, -.075, -.08, -.096, -.101, -.064, -.096,
    ],
    fw: [
      -.005, -.007, -.007, -.007, -.007, -.007, -.007, -.007,
      -.005, -.007, -.007, -.007, -.007, -.007, -.007, -.007,
      -.005, -.007, -.007, -.007, -.007, -.007, -.007, -.007,
      -.005, -.007, -.007, -.007, -.007, -.007, -.007, -.007,
      -.005, -.007, -.007, -.007, -.007, -.007, -.007, -.007,
      -.005, -.007, -.007, -.007, -.007, -.007, -.007, -.007,
    ],
  },
  /** stride along the velocity (armed or not). */
  V: {
    th: TH_HV,
    up: [
      -.02, -.031, -.038, -.046, -.056, -.07, -.098, -.139,
      -.025, -.036, -.041, -.048, -.059, -.072, -.099, -.135,
      -.036, -.048, -.049, -.053, -.062, -.072, -.099, -.133,
      -.032, -.046, -.049, -.056, -.065, -.077, -.107, -.145,
      -.045, -.046, -.047, -.049, -.054, -.061, -.079, -.106,
      -.046, -.021, -.015, -.021, -.027, -.034, -.05, -.064,
    ],
    fw: [
      -.01, -.008, -.008, -.008, -.008, -.008, -.009, -.008,
      -.012, -.011, -.011, -.011, -.011, -.011, -.011, -.01,
      -.015, -.015, -.015, -.015, -.015, -.015, -.015, -.013,
      -.018, -.019, -.019, -.019, -.019, -.019, -.019, -.012,
      -.021, -.021, -.021, -.021, -.021, -.021, -.021, -.021,
      -.002, .004, .004, .004, .004, .004, 0, -.007,
    ],
  },
};
// </guard-head-fit hostage>

const WALL_TH = [-180, -150, -120, -90, -70, -50, -30, 0, 30, 50, 70, 90, 120, 150, 180];
const WALL_THA = [0, 30, 50, 70, 90, 120, 150, 180];
const WALL_SP = [.3, .6, .9, 1.3];
/** Lean 0 (the flat back, the side step, back to the cover point). Fitted by `scripts/guard-head-fit.mjs wall` from the
 *  `tests/guardHeadSweep.test.ts` wall sweep (grunt, sniper, officer; settle 2.5 s, 2 s window); the pitch terms are the
 *  WIP fit's (the sweep runs at pitch 0). */
const WALL_MOVE: WallTable = {
  up: [
    -.006, -.006, -.01, -.021,
    -.052, -.052, -.052, -.054,
    -.052, -.052, -.052, -.054,
    -.052, -.052, -.053, -.053,
    -.04, -.04, -.04, -.042,
    -.031, -.031, -.031, -.038,
    -.022, -.022, -.022, -.022,
    -.005, -.005, -.005, -.005,
    -.022, -.022, -.023, -.024,
    -.031, -.032, -.042, -.08,
    -.04, -.04, -.047, -.085,
    -.052, -.053, -.054, -.084,
    -.052, -.053, -.056, -.093,
    -.052, -.052, -.053, -.064,
    -.006, -.006, -.01, -.021,
  ],
  bobC: null,
  bobS: null,
  fw: [.027, .021, .018, .014, .01, .006, .003, .027],
  sx: [.03, .031, .032, .032, .033, .034, .035, .03],
  pitch: [-.005, .017, .041, 0, -.153, .001],
};
/** Leaning out (the lean away from the wall side, the only one the game gives): the walk to the edge is `theta * side`
 *  = -90. Same fit. The rig's head here rides a once-a-stride sawtooth of 10-17 cm (the hips shifted 0.7 m onto the
 *  outer foot: the foot planner's reach) that is not locked to the gait clock; the mean and the first harmonic leave
 *  up to ~0.12-0.17 m (see the parity test's written exception). */
const WALL_LEAN_MOVE: WallTable = {
  up: [
    -.042, -.056, -.079, -.123,
    -.097, -.162, -.204, -.243,
    -.096, -.148, -.191, -.215,
    -.091, -.158, -.192, -.219,
    -.084, -.157, -.193, -.211,
    -.067, -.14, -.179, -.217,
    -.022, -.098, -.154, -.187,
    .005, -.012, -.036, -.064,
    -.014, -.084, -.141, -.154,
    -.019, -.102, -.146, -.153,
    -.034, -.108, -.15, -.163,
    -.031, -.115, -.152, -.169,
    -.017, -.108, -.143, -.16,
    -.035, -.094, -.157, -.168,
    -.042, -.056, -.079, -.123,
  ],
  bobC: [
    0, 0, 0, 0,
    .063, .074, .056, .037,
    .083, .09, .058, .015,
    .096, .091, .062, .022,
    .085, .096, .06, .019,
    .086, .098, .065, .021,
    .078, .101, .088, .062,
    0, 0, 0, 0,
    .051, .037, -.001, -.03,
    .075, .024, -.015, -.036,
    .08, .021, -.018, -.031,
    .075, .021, -.012, -.028,
    .085, .032, -.006, -.027,
    .077, .053, .023, -.009,
    0, 0, 0, 0,
  ],
  bobS: [
    0, 0, 0, 0,
    .018, .026, .004, -.021,
    -.099, -.068, -.061, -.059,
    -.089, -.054, -.048, -.052,
    -.092, -.062, -.054, -.054,
    -.087, -.062, -.061, -.066,
    -.036, -.007, -.003, -.031,
    0, 0, 0, 0,
    .076, .11, .108, .084,
    .117, .131, .112, .079,
    .124, .127, .099, .071,
    .128, .124, .093, .071,
    .13, .134, .103, .079,
    .044, .081, .097, .072,
    0, 0, 0, 0,
  ],
  fw: [.111, .105, .103, .1, .096, .092, .09, .111],
  sx: [.065, .066, .067, .068, .069, .069, .07, .065],
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
  /** (S3a fix) The gait clock 0..1 (`MotionDriver.phase`, which the rig's stride follows). (rig-pose-fix S3)
   *  `PHASE_UNKNOWN` (negative): no clock (the co-op puppet: not on the wire), the stride at its phase mean. */
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
  /** The held pose the rig's emote shows (or showed last, while it fades out); null: none. Wins over `blind`. */
  held: GuardCqMode | null;
  /** The held pose's own ramp 0..1 (`GuardCq.write`: `clamp01((t - delay) * 5)`), the pitches' scale. */
  heldK: number;
  /** The knockout's limp 0..1 (`cq.k` in mode 'ko'). */
  koK: number;
  /** The flashbang's pose ramp 0..1 (`Enemy.blind`'s emote: `min(1, t * 6)`); read only when `held` is null. */
  blind: number;
  /** (S3a fix) The emote's blend weight 0..1, the sim's copy of the rig's `emoteW`: up at 5 per s while the emote
   *  gives a pose, down at 5 per s (holding the last pose) when it gives none. */
  poseW: number;
  climb: boolean;
}

export interface HeadOut {
  x: number;
  y: number;
  z: number;
}

/** (S3a fix 2) Whose emote the rig shows, the sim side: the held pose's clock, the flashbang's, and whether the
 *  flashbang's emote is still the rig's (a seize replaces it, its end clears it). One per guard; `Enemy` and the parity
 *  harness drive it through `emoteBlind` / `emoteSeize` / `emoteBlindEnd` / `emoteStep`, so both run the same logic. */
export interface GuardEmoteState {
  heldT: number;
  blindAge: number;
  blindPose: boolean;
}

export function newEmoteState(): GuardEmoteState {
  return { heldT: 0, blindAge: 0, blindPose: false };
}

/** Flashbanged (`Enemy.blind`): the rig's emote is the hands-to-face pose from now. */
export function emoteBlind(st: GuardEmoteState): void {
  st.blindAge = 0;
  st.blindPose = true;
}

/** Seized (`Enemy.beginTakedown`): the held pose replaces the flashbang's emote (one emote at a time). */
export function emoteSeize(st: GuardEmoteState): void {
  st.heldT = 0;
  st.blindPose = false;
}

/** The flash wore off (`Enemy.update`): the rig's emote is cleared. */
export function emoteBlindEnd(st: GuardEmoteState): void {
  st.blindPose = false;
}

/**
 * One fixed step of the emote the head follows (`Enemy.syncHitboxes`): writes `h.held` / `heldK` / `koK` / `blind` /
 * `poseW`. The rig shows the held pose from contact (`GuardCq.pose` is null before its `delay` in the seize modes), else
 * the flashbang's while it is his; with none, the last one fades out at 5 per s (`CharacterRig.emoteW`), its values kept.
 * @param taken in a takedown (`Enemy.taken`)
 * @param blinding the flash is still on (`Enemy.blindT > 0`)
 * @param mode / delay / cqK the held pose's `GuardCq` mode, contact delay and `k`
 */
export function emoteStep(st: GuardEmoteState, h: GuardHeadIn, taken: boolean, blinding: boolean, mode: GuardCqMode, delay: number, cqK: number, dt: number): void {
  if (taken) st.heldT += dt;
  else if (st.blindPose) st.blindAge += dt;
  const heldOn = taken && (st.heldT >= delay || (mode !== 'seized' && mode !== 'seizedLethal'));
  const blindOn = !taken && st.blindPose && blinding;
  if (heldOn) {
    h.held = mode;
    const k = (st.heldT - delay) * 5;
    h.heldK = k < 0 ? 0 : k > 1 ? 1 : k;
    h.koK = mode === 'ko' ? cqK : 0;
  } else if (blindOn) {
    h.held = null;
    h.blind = st.blindAge * 6 < 1 ? st.blindAge * 6 : 1;
  }
  const w = h.poseW + (heldOn || blindOn ? dt : -dt) * 5;
  h.poseW = w < 0 ? 0 : w > 1 ? 1 : w;
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
  if (t.bob !== null && side !== 0 && ph >= 0) up += cell(t.bob, ns) * side * Math.cos(TAU * (ph - t.ph));
  const sx = t.sx;
  mSx = sx[0] + sx[1] * a + sx[2] * p + sx[3] * p * p;
  mUp = up;
  mFw = fw;
}

/** A wall-move table's offset (side relative to the wall side, up, forward; into `mSx` / `mUp` / `mFw`). */
function wallOff(t: WallTable, thr: number, s: number, p: number, side: number, ph: number): void {
  knots(WALL_TH, WALL_SP, thr, s, true);
  const ns = WALL_SP.length;
  const z = ksz;
  let up = cell(t.up, ns);
  if (t.bobC !== null && t.bobS !== null && side !== 0 && ph >= 0) {
    const a = TAU * ph;
    up += side * (cell(t.bobC, ns) * Math.cos(a) + cell(t.bobS, ns) * Math.sin(a));
  }
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
  const pace = ph < 0 ? sp : sp / (1 - ROOT_DIP * Math.cos(2 * TAU * ph));
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
  /** The free-move share of `sx` (the held pose replaces it with the rest of the stance). */
  let sxm = 0;
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
    sxm = sx;
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
      wallOff(WALL_MOVE, thr, sp, pt, side, i.phase);
      wS = mSx * (1 - lw);
      wU = mUp * (1 - lw);
      wF = mFw * (1 - lw);
    }
    if (lw > 0) {
      wallOff(WALL_LEAN_MOVE, thr, sp, pt, side, i.phase);
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
  // scripted upper-body pose (held / blind): the emote overrides the neck and chest, blended by the rig's emote weight.
  // One emote at a time: a seize replaces the flashbang's (`beginTakedown`), so `held` wins.
  const w = i.poseW;
  if (w > 0) {
    let pn = 0;
    let pc = 0;
    let lift = 0;
    if (i.held !== null) {
      const h = HELD_PITCH[i.held];
      const hk = i.heldK;
      pn = h[0] * hk;
      pc = h[1] * hk;
      if (i.held === 'ko') {
        const hs = HELD_PITCH.hostage;
        const m = 1 - i.koK;
        pn = (hs[0] * m + h[0] * i.koK) * hk;
        pc = (hs[1] * m + h[1] * i.koK) * hk;
      }
    } else if (i.blind > 0) {
      pn = BLIND_PITCH.neck * i.blind;
      pc = BLIND_PITCH.chest * i.blind;
      lift = BLIND_PITCH.lift * i.blind;
    }
    const c2 = c * c;
    let hf = FIT.heldF0[0] + FIT.heldF0[1] * c + FIT.heldF0[2] * c2;
    const hu = FIT.heldU0[0] + FIT.heldU0[1] * c + FIT.heldU0[2] * c2;
    if (!r.armed) hf += FIT.heldNoGun * (1 - c2);
    hf += q3(FIT.heldDF, pn, pc, c);
    let hh = hu + q3(FIT.heldDU, pn, pc, c);
    if (i.held !== null && sp > 0 && !i.wall && c < 1) {
      // (S3a fix 2) walked as a hostage: the rig's own gait under the held pose (it ignores the gait clock and the free
      // stride tables: `rp.phase` is -1 when held), fitted standing (fades with crouch)
      const hm = heldFacing(mz, sp) ? (r.armed ? HELD_MOVE.AF : HELD_MOVE.NF) : HELD_MOVE.V;
      knots(hm.th, SP_H, th, sp, true);
      const ns = SP_H.length;
      hf += cell(hm.fw, ns) * (1 - c);
      hh += cell(hm.up, ns) * (1 - c);
    }
    f += (hf * k - f) * w;
    u += (hh * k - u) * w;
    u += lift * w;
    sx -= sxm * k * w;
  }
  const s = Math.sin(i.yaw);
  const co = Math.cos(i.yaw);
  out.x = i.x + sx * co + f * s;
  out.z = i.z - sx * s + f * co;
  out.y = i.y + r.headY + u;
}

/** (rig-pose-fix S3, audit G7) `GuardHeadIn.phase` when there is no gait clock (the co-op puppet): the stride at its
 *  phase mean (the bob, a first harmonic, at 0; the dash at the mean pace). */
export const PHASE_UNKNOWN = -1;

/**
 * (rig-pose-fix S3, audit G7) The head inputs the co-op client has for this guard: `i` with every input the wire does not
 * carry set the way the client's puppet sets it (`enemyPuppet.ts`, its own `GuardHeadIn` from what it draws): no gait
 * clock, no aim pitch, no wall or lean, no ladder, no flashbang pose (the held pose stays: the puppet shows it). The
 * host records `guardHead` of this beside the sim head (`Enemy.wireHead`) so its judge knows the head the client was
 * shown. Writes and returns `out`; no allocation.
 */
export function wireHeadIn(i: GuardHeadIn, out: GuardHeadIn): GuardHeadIn {
  out.x = i.x;
  out.y = i.y;
  out.z = i.z;
  out.yaw = i.yaw;
  out.crouch = i.crouch;
  out.speed = i.speed;
  out.moveX = i.moveX;
  out.moveZ = i.moveZ;
  out.phase = PHASE_UNKNOWN;
  out.aim = i.aim;
  out.aimPitch = 0;
  out.wall = false;
  out.wallSide = 0;
  out.lean = 0;
  out.leanDrop = 0;
  out.held = i.held;
  out.heldK = i.heldK;
  out.koK = i.koK;
  out.blind = 0;
  out.poseW = i.held !== null ? i.poseW : 0;
  out.climb = false;
  return out;
}

/** A fresh head input (the guard standing at the origin). */
export function newHeadIn(): GuardHeadIn {
  return { x: 0, y: 0, z: 0, yaw: 0, crouch: 0, speed: 0, moveX: 0, moveZ: 0, phase: 0, aim: 0, aimPitch: 0, wall: false, wallSide: 0, lean: 0, leanDrop: 0, held: null, heldK: 0, koK: 0, blind: 0, poseW: 0, climb: false };
}
