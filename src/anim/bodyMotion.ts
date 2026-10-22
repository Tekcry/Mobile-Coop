/**
 * (anim-natural-n2 step 2) The body motion layer: a procedural, phase-locked trunk / sway / head layer added on top of
 * Wren's keyed clips and his key edits (never rescaling them, A4). Pure, Babylon-free, allocation-free.
 *
 * Each tuner body row (the `selectBodyGroup` ids) has one literal per field in `BODY_MOTION` (bake-friendly: step 5's
 * sliders bake into `BODY_MOTION.<row>.<field>`):
 * - `hipTurn` (deg) the pelvis yaw swing added, its amplitude; `hipTime` (cycles of the gait phase) where it peaks;
 * - `chestTurn` (deg) the shoulders' yaw swing added (root frame: the pelvis' added yaw is taken back by the spine, so
 *   0 keeps the chest where it was, as aiming: the chest stays on the aim); `chestTime` (cycles) where it peaks;
 * - `sway` (cm) the pelvis' lateral swing added (weight onto the stance foot); `swayTime` (cycles) where it peaks;
 * - `headFollow` (share) of the chest's yaw off the facing the world-stabilised head lets through (0 aiming);
 * - `headNod` (deg) the head's pitch nod, twice a cycle (each heel strike, `NOD_TIME`).
 * Each swing is `amp * cos(2 pi (phase - time))` on the gait phase (left heel strike at 0); the rows blend as phasors
 * (amplitude x direction), so two rows with different timing cross-fade without a pop or a phase wrap.
 *
 * The row weights come from the graph's own continuous blends (graph-internal inputs only, co-op parity: a remote poses
 * the same from its MoveState): the moving share, the crouch, the drawn share, the raise and the keyed speed blends'
 * shares (KEYED_GAITS standing, KEYED_CROUCH crouched). Every weight is a product of eased values and smoothsteps, so
 * the layer never steps at a band edge.
 */

/** The rows, in the tuner's body order (the `selectBodyGroup` ids this layer covers). */
export const BODY_MOTION_ROWS = ['idle', 'walk', 'jog', 'run', 'crouchIdle', 'sneak', 'crouchWalk', 'crouchRun', 'lowReady', 'aimStill', 'aim', 'aimCrouch', 'aimCrouchMove'] as const;
export type BodyMotionRowId = (typeof BODY_MOTION_ROWS)[number];

export interface BodyMotionRow {
  hipTurn: number;
  hipTime: number;
  chestTurn: number;
  chestTime: number;
  sway: number;
  swayTime: number;
  headFollow: number;
  headNod: number;
}

/** The fields, in slider order. */
export const BODY_MOTION_FIELDS = ['hipTurn', 'hipTime', 'chestTurn', 'chestTime', 'sway', 'swayTime', 'headFollow', 'headNod'] as const satisfies readonly (keyof BodyMotionRow)[];

/**
 * The per-row amounts (deg, cycles, cm, share, deg). Starting values (anim-natural-n2 A2-A4, PLAN step 2): added on top of
 * the keyed swings, timed onto them (the keyed pelvis / shoulders / lateral fundamentals, measured headless:
 * tests/bodyMotion.test.ts), so the totals reach the targets (walk ~8 / 8 deg p2p pelvis / shoulders, jog ~12 / 16,
 * sneak 5 / 5, crouch walk 8 / 8, walk lateral 4-5 cm). Aiming the pelvis swings against the shoulders (counter
 * rotation) and the chest stays on the aim (chestTurn 0). The stills are 0 here (step 4 adds breathing and shifts).
 * (fix round, anim-natural-n2 A11) The sway is 0.7x the first values (walk 1.4 -> 0.98 cm, jog / sneak / crouch walk /
 * crouch run 0.8 -> 0.56): at 1x the stance hip swung outside the stance foot (knee-out 3.0-3.1 cm at the walk even in
 * the facing frame, limit 3); the run keeps 0.6 (its lateral 2-3 cm). Aiming nods 0 (the weld stays still). The run's
 * headFollow is 0.18 (after A1 the keyed run trunk swings ~20 deg p2p: 0.35 gave 10 deg head yaw, over the 2-6 target).
 * The sneak's headFollow is 0.4 (0.35 left its head yaw at 1.9 deg p2p, under the 2-6 target). Times are in the rig's
 * yaw sense (+ about +Y): the hip-joint line's measured yaw (the e2e / harness metric) is the opposite sign, so it peaks
 * half a cycle on.
 * (A12, master 4.54.1 merge) The walk's sway is 0.6 (was 0.98): master's Body base (Michael's 2026-10-22 trackMul 0.05,
 * the feet near one line) alone reads walk knee-out 3.1 cm; with 0.98 the walk read 3.6 cm against e2e-anim's widened
 * walk limit 3.5 (BODY_GAIT). At 0.6 headless (facing frame): walk 3.41, walk 2.1 m/s 3.47, low ready walk 3.33 cm;
 * walk lateral 3.6 -> 2.9 cm. Undo: 0.98.
 */
export const BODY_MOTION: Record<BodyMotionRowId, BodyMotionRow> = {
  idle: { hipTurn: 0, hipTime: 0, chestTurn: 0, chestTime: 0, sway: 0, swayTime: 0, headFollow: 0, headNod: 0 },
  walk: { hipTurn: 2.5, hipTime: 0.01, chestTurn: 2.5, chestTime: 0.51, sway: 0.6, swayTime: 0.75, headFollow: 0.35, headNod: 0.6 },
  jog: { hipTurn: 3.5, hipTime: 0.96, chestTurn: 4.5, chestTime: 0.45, sway: 0.56, swayTime: 0.74, headFollow: 0.35, headNod: 0.6 },
  run: { hipTurn: 3, hipTime: 0.91, chestTurn: 4, chestTime: 0.38, sway: 0.6, swayTime: 0.69, headFollow: 0.18, headNod: 0.6 },
  crouchIdle: { hipTurn: 0, hipTime: 0, chestTurn: 0, chestTime: 0, sway: 0, swayTime: 0, headFollow: 0, headNod: 0 },
  sneak: { hipTurn: 1.5, hipTime: 0.05, chestTurn: 1.5, chestTime: 0.53, sway: 0.56, swayTime: 0.75, headFollow: 0.4, headNod: 0.6 },
  crouchWalk: { hipTurn: 2, hipTime: 0.05, chestTurn: 2, chestTime: 0.53, sway: 0.56, swayTime: 0.75, headFollow: 0.35, headNod: 0.6 },
  crouchRun: { hipTurn: 2.5, hipTime: 0.05, chestTurn: 3, chestTime: 0.52, sway: 0.56, swayTime: 0.74, headFollow: 0.35, headNod: 0.6 },
  lowReady: { hipTurn: 0, hipTime: 0, chestTurn: 0, chestTime: 0, sway: 0, swayTime: 0, headFollow: 0, headNod: 0 },
  aimStill: { hipTurn: 0, hipTime: 0, chestTurn: 0, chestTime: 0, sway: 0, swayTime: 0, headFollow: 0, headNod: 0 },
  aim: { hipTurn: 1.5, hipTime: 0.95, chestTurn: 0, chestTime: 0, sway: 0, swayTime: 0, headFollow: 0, headNod: 0 },
  aimCrouch: { hipTurn: 0, hipTime: 0, chestTurn: 0, chestTime: 0, sway: 0, swayTime: 0, headFollow: 0, headNod: 0 },
  aimCrouchMove: { hipTurn: 1.2, hipTime: 0.9, chestTurn: 0, chestTime: 0, sway: 0, swayTime: 0, headFollow: 0, headNod: 0 },
};

/** Where the nod peaks (cycles; it repeats every half cycle): just after each heel strike (left at 0, right at 0.5). */
export const NOD_TIME = 0.05;

/** The layer's inputs (the graph's own blends, written into a preallocated struct each frame). */
export interface BodyMotionIn {
  /** Gait phase (cycles, left heel strike at 0). */
  phase: number;
  /** The eased gate 0..1 (a Wren rig on foot). */
  gate: number;
  /** Moving share 0..1 (the graph's moveW). */
  move: number;
  /** Crouch 0..1. */
  crouch: number;
  /** Drawn share 0..1 (gun out). */
  drawn: number;
  /** Raise 0..1 (aimed). */
  aim: number;
  /** The standing speed blend: the jog's share (walk -> jog) and the run's (jog -> run), KEYED_GAITS. */
  jog: number;
  run: number;
  /** The crouched speed blend: the crouch walk's share (sneak -> crouch walk) and the crouch run's, KEYED_CROUCH. */
  cWalk: number;
  cRun: number;
}

/** The layer's output (radians, metres at 1.75 m, share), read by the rig. All 0 when the gate is closed. */
export interface BodyMotion {
  /** The eased gate (for the overlay and tests). */
  w: number;
  /** Pelvis yaw added (rad, root frame). */
  hipYaw: number;
  /** Shoulders' yaw added (rad, root frame): the spine takes back `hipYaw - chestYaw`. */
  chestYaw: number;
  /** Pelvis lateral offset added (m at 1.75 m, + right). */
  pelX: number;
  /** Share of the chest's yaw off the facing the head follows. */
  headFollow: number;
  /** Head pitch added (rad, + down). */
  headPitch: number;
}

export function newBodyMotionIn(): BodyMotionIn {
  return { phase: 0, gate: 0, move: 0, crouch: 0, drawn: 0, aim: 0, jog: 0, run: 0, cWalk: 0, cRun: 0 };
}

export function newBodyMotion(): BodyMotion {
  return { w: 0, hipYaw: 0, chestYaw: 0, pelX: 0, headFollow: 0, headPitch: 0 };
}

const N_ROWS = BODY_MOTION_ROWS.length;
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

/**
 * The row weights (sum 1 for any inputs in range) into `out` (length >= 13, BODY_MOTION_ROWS order). No allocation.
 * Moving (`move`): standing walk / jog / run, crouched sneak / crouch walk / crouch run, aimed `aim` / `aimCrouchMove`;
 * still: `idle` / `lowReady` (by the drawn share), `crouchIdle`, aimed `aimStill` / `aimCrouch`. Aimed = drawn x raise.
 */
export function bodyMotionWeights(i: BodyMotionIn, out: Float64Array | number[]): void {
  const m = i.move;
  const s = 1 - m;
  const c = i.crouch;
  const st = 1 - c;
  const a = i.drawn * i.aim;
  const na = 1 - a;
  const mStand = m * st * na;
  const mCr = m * c * na;
  out[0] = s * st * na * (1 - i.drawn); // idle
  out[1] = mStand * (1 - i.jog); // walk
  out[2] = mStand * (i.jog - i.run); // jog
  out[3] = mStand * i.run; // run
  out[4] = s * c * na; // crouchIdle
  out[5] = mCr * (1 - i.cWalk); // sneak
  out[6] = mCr * (i.cWalk - i.cRun); // crouchWalk
  out[7] = mCr * i.cRun; // crouchRun
  out[8] = s * st * na * i.drawn; // lowReady
  out[9] = s * st * a; // aimStill
  out[10] = m * st * a; // aim
  out[11] = s * c * a; // aimCrouch
  out[12] = m * c * a; // aimCrouchMove
}

const smooth = (t: number): number => {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
};

/** The keyed speed blends' band edges (the graph's KEYED_GAITS and KEYED_CROUCH, passed in: no import cycle). */
export interface GaitBands {
  readonly walkTo: number;
  readonly jogFrom: number;
  readonly jogTo: number;
  readonly runFrom: number;
}
export interface CrouchBands {
  readonly sneakTo: number;
  readonly walkFrom: number;
  readonly walkTo: number;
  readonly runFrom: number;
}

/**
 * The speed blends' shares into `i` as the keyed sets cross-fade their clips (`speedSet`, `crouchSet`): the standing
 * effort pace `es` through `G`, the crouched effort pace `cPace` through `C`. No allocation.
 */
export function bodyMotionBands(i: BodyMotionIn, es: number, cPace: number, G: GaitBands, C: CrouchBands): void {
  i.jog = smooth((es - G.walkTo) / (G.jogFrom - G.walkTo));
  i.run = smooth((es - G.jogTo) / (G.runFrom - G.jogTo));
  i.cWalk = smooth((cPace - C.sneakTo) / (C.walkFrom - C.sneakTo));
  i.cRun = smooth((cPace - C.walkTo) / (C.runFrom - C.walkTo));
}

const W = new Float64Array(N_ROWS);

/**
 * One frame of the layer into `out` (no allocation, no clock of its own: the same phase and inputs give the same
 * output at any frame rate). The rows blend as phasors, then each swing is read on the phase.
 */
export function bodyMotionStep(i: BodyMotionIn, out: BodyMotion): BodyMotion {
  const g = i.gate;
  out.w = g;
  if (!(g > 0)) {
    out.hipYaw = 0;
    out.chestYaw = 0;
    out.pelX = 0;
    out.headFollow = 0;
    out.headPitch = 0;
    return out;
  }
  bodyMotionWeights(i, W);
  let hc = 0;
  let hs = 0;
  let cc = 0;
  let cs = 0;
  let sc = 0;
  let ss = 0;
  let follow = 0;
  let nod = 0;
  for (let r = 0; r < N_ROWS; r++) {
    const w = W[r]!;
    if (!(w > 0)) continue;
    const R = BODY_MOTION[BODY_MOTION_ROWS[r]!];
    if (R.hipTurn !== 0) {
      hc += w * R.hipTurn * Math.cos(TAU * R.hipTime);
      hs += w * R.hipTurn * Math.sin(TAU * R.hipTime);
    }
    if (R.chestTurn !== 0) {
      cc += w * R.chestTurn * Math.cos(TAU * R.chestTime);
      cs += w * R.chestTurn * Math.sin(TAU * R.chestTime);
    }
    if (R.sway !== 0) {
      sc += w * R.sway * Math.cos(TAU * R.swayTime);
      ss += w * R.sway * Math.sin(TAU * R.swayTime);
    }
    follow += w * R.headFollow;
    nod += w * R.headNod;
  }
  const pc = Math.cos(TAU * i.phase);
  const ps = Math.sin(TAU * i.phase);
  out.hipYaw = (hc * pc + hs * ps) * DEG * g;
  // (anim-natural-n2, e2e-anim low ready jog elbows) the gun out keeps the chest on the gun (PASS2 item 7: the low-ready
  // arms locked to the gun): the drawn share takes the rows' chest swing out, the pelvis still counter-rotates under it
  out.chestYaw = (cc * pc + cs * ps) * DEG * g * (1 - i.drawn);
  out.pelX = (sc * pc + ss * ps) * 0.01 * g;
  out.headFollow = follow * g;
  out.headPitch = nod !== 0 ? nod * Math.cos(2 * TAU * (i.phase - NOD_TIME)) * DEG * g : 0;
  return out;
}
