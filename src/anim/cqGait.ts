/**
 * (anim-natural N4, AUDIT row 14) The hold and carry walks' trunk (pure, Babylon-free, no allocation per frame).
 *
 * Holding a guard (hostage walk) or carrying a body, the hero walked with the pelvis and the shoulders turning as one
 * block (audit `hold-walk` counterCorr +0.85, `carry-walk` +0.95): the procedural gait clips' small twist was swamped.
 * This layer, on the anim graph's close-quarters pose, turns the pelvis with the step (phase-locked to the gait clock,
 * the same sign as the clips' `twist`: the left hip forward at the left heel strike) and the shoulders against it,
 * smaller than a free walk (the arms are busy). Carrying, the weight on one shoulder: the trunk leans away from the
 * load, the hips sit a little under it and each step loads a little deeper (a heavier dip). The step length (`stride`,
 * `cqSim` on the local player's gait clock) is a slider for a slower cadence, default x1: longer steps leave the trailing
 * foot further behind, and at this pace the late-stance slide is already ~5 cm in a free walk (an N1 planner item).
 *
 * (anim-n4b, PASS2 rows 43-44) Holding a guard still, the trunk was a statue (0.0 deg): standing, the hold now braces
 * against him (`cqBraceAt`, on the layer's own clock): the shoulders turn a little to keep him (a slow yaw, the hips a
 * little against it), the chest rolls against the pair's side-to-side weight shift (the takedown's hold `sway`, which
 * already moves the pelvis on the local rig; a rig without it, a remote copy, shifts on the same 0.5 Hz on its own clock)
 * and a slow braced breath in the spine pitch. A few degrees at most; it fades out as the walk comes in. The Anim
 * Chamber's hold clips get the same layer on their keyed trunk (`cqKeyedHold`): the brace on `hold_idle`, the hold walk's
 * counter-rotation on the hold walks.
 *
 * The values are the code defaults (`CQ_GAIT`); the tuner's "Holds and carries" section scales them (`CQ_SECTION`,
 * identity at default) and `scripts/anim-tune-bake.mjs` bakes a tune back into `CQ_GAIT` (tuneBakeTable.ts).
 */
import { registerTuneSection, TUNE_FLAGS, type TuneTunable } from './tuneRegistry';
import { CH } from './pose';
import { TUNE_CUR } from './tune';
import { CQ } from '../game/closeQuarters';

/** One walk's natural values. */
export interface CqGaitRow {
  /** Pelvis yaw with the step (rad, amplitude: the left hip forward at the left heel strike). */
  pelvis: number;
  /** The shoulder line against the pelvis (share of the pelvis yaw, turned the other way). */
  counter: number;
  /** Trunk lean away from the load (rad; 0 for the hold: the guard is in front). */
  lean: number;
  /** The hips under the load (m, toward the loaded shoulder). */
  shift: number;
  /** The heavier step: the pelvis drop at each loading response (m). */
  dip: number;
  /** Step length at the same pace (x: > 1 is a slower cadence). */
  stride: number;
  /** (anim-n4b) Standing still: the shoulders' brace turn (rad, amplitude; the hips 0.3 of it the other way). */
  brace: number;
  /** (anim-n4b) Standing still: the chest's roll against the side-to-side weight shift (rad, amplitude). */
  braceRoll: number;
  /** (anim-n4b) Standing still: the braced breath in the spine pitch (rad, amplitude). */
  breath: number;
}

/**
 * The defaults (a free walk is about +-4 deg pelvis and -+3 deg thorax: these are smaller, the arms are busy).
 * Hostage walk: +-3 deg pelvis, the shoulders against it at 0.9 of that, no lean (the guard is held square in front).
 * Carry: +-3.4 deg pelvis, shoulders at 0.8 (the body on the shoulder damps the chest), 6 deg lean away from the
 * load, the hips 1.5 cm under it, a 1.2 cm dip per step. (The gait clips' own small twist and the turn follow add to
 * these: measured on Proving, counterCorr -0.76 hold, -0.91 carry.)
 * (anim-n4b) Holding still: the shoulders turn up to 1.3 deg (a 2.5 deg range), the chest rolls 1.1 deg against the
 * weight shift, a 0.7 deg breath. The carry has none (the body on the shoulder: its lean is the still pose).
 */
export const CQ_GAIT: { hold: CqGaitRow; carry: CqGaitRow } = {
  hold: { pelvis: 0.052, counter: 0.9, lean: 0, shift: 0, dip: 0.006, stride: 1, brace: 0.022, braceRoll: 0.019, breath: 0.012 },
  carry: { pelvis: 0.06, counter: 0.8, lean: 0.105, shift: 0.015, dip: 0.012, stride: 1, brace: 0, braceRoll: 0, breath: 0 },
};

// ------------------------------------------------------------------------------------------
// The tuner section (identity at default; every slider bakes into CQ_GAIT)
// ------------------------------------------------------------------------------------------

export const CQ_GROUPS = ['cq.hold', 'cq.carry'] as const;
export type CqGroup = (typeof CQ_GROUPS)[number];

const HOLD: readonly CqGroup[] = ['cq.hold'];
const CARRY: readonly CqGroup[] = ['cq.carry'];
const mul = (id: string, label: string, g: readonly CqGroup[], hook: string, max = 3): TuneTunable => ({ id, label, kind: 'mul', def: 1, min: 0, max, step: 0.05, unit: 'x', groups: g, hook });

export const CQ_TUNABLES: readonly TuneTunable[] = [
  mul('holdTwist', 'Hold walk: hips and shoulders', HOLD, 'cqGait.ts CQ_GAIT.hold.pelvis (the pelvis yaw with the step; the shoulders follow by the counter share)'),
  mul('holdCounter', 'Hold walk: shoulders vs hips', HOLD, 'cqGait.ts CQ_GAIT.hold.counter (0: the shoulders hold square, 1: as far as the hips the other way)'),
  mul('holdDip', 'Hold walk: step weight (dip)', HOLD, 'cqGait.ts CQ_GAIT.hold.dip (the pelvis drop at each loading response)'),
  mul('holdStride', 'Hold walk: step length', HOLD, 'cqGait.ts CQ_GAIT.hold.stride (longer steps at the same pace: a slower cadence)', 1.6),
  // (anim-n4b) the hold standing still
  mul('holdBrace', 'Hold still: shoulder brace', HOLD, 'cqGait.ts CQ_GAIT.hold.brace (the slow shoulder turn keeping the guard; the hips 0.3 of it the other way)'),
  mul('holdBraceRoll', 'Hold still: chest vs weight', HOLD, 'cqGait.ts CQ_GAIT.hold.braceRoll (the chest roll against the side-to-side sway)'),
  mul('holdBreath', 'Hold still: braced breath', HOLD, 'cqGait.ts CQ_GAIT.hold.breath (the slow spine pitch)'),
  mul('carryTwist', 'Carry: hip and shoulder twist', CARRY, 'cqGait.ts CQ_GAIT.carry.pelvis'),
  mul('carryCounter', 'Carry: shoulders vs hips', CARRY, 'cqGait.ts CQ_GAIT.carry.counter'),
  { id: 'carryLean', label: 'Carry: lean off the load', kind: 'add', def: 0, min: -10, max: 10, step: 0.5, unit: 'deg', groups: CARRY, hook: 'cqGait.ts CQ_GAIT.carry.lean (the trunk away from the loaded shoulder; + = further)' },
  mul('carryShift', 'Carry: hips under the load', CARRY, 'cqGait.ts CQ_GAIT.carry.shift'),
  mul('carryDip', 'Carry: step weight (dip)', CARRY, 'cqGait.ts CQ_GAIT.carry.dip'),
  mul('carryStride', 'Carry: step length (cadence)', CARRY, 'cqGait.ts CQ_GAIT.carry.stride', 1.6),
];

/** Which walk the local player is in (`cqSimSet`, the tuner's follow). */
export const CQ_SIM = { group: '' as CqGroup | '' };

export const CQ_SECTION = registerTuneSection({
  id: 'cq',
  label: 'Holds and carries',
  note: 'The hostage walk and the body carry (anim-natural N4). Applies to the local player holding or carrying and to a remote partner holding a guard (a remote body carry is not on the wire); the step length is the local player only.',
  groups: CQ_GROUPS,
  tunables: CQ_TUNABLES,
  select: () => CQ_SIM.group || null,
});

const VH = CQ_SECTION.values['cq.hold']!;
const VC = CQ_SECTION.values['cq.carry']!;

/** The tuned value of a slider (identity under the bypass). */
function tv(v: Record<string, number>, id: string, def: number): number {
  return TUNE_FLAGS.bypass ? def : v[id] ?? def;
}

/** The tuned rows (scratch, rewritten by `cqRows`). */
const RH: CqGaitRow = { pelvis: 0, counter: 0, lean: 0, shift: 0, dip: 0, stride: 1, brace: 0, braceRoll: 0, breath: 0 };
const RC: CqGaitRow = { pelvis: 0, counter: 0, lean: 0, shift: 0, dip: 0, stride: 1, brace: 0, braceRoll: 0, breath: 0 };

/** CQ_GAIT with the tuner's sliders on it (into RH / RC). No allocation. */
export function cqRows(): void {
  const h = CQ_GAIT.hold;
  RH.pelvis = h.pelvis * tv(VH, 'holdTwist', 1);
  RH.counter = h.counter * tv(VH, 'holdCounter', 1);
  RH.lean = h.lean;
  RH.shift = h.shift;
  RH.dip = h.dip * tv(VH, 'holdDip', 1);
  RH.stride = h.stride * tv(VH, 'holdStride', 1);
  RH.brace = h.brace * tv(VH, 'holdBrace', 1);
  RH.braceRoll = h.braceRoll * tv(VH, 'holdBraceRoll', 1);
  RH.breath = h.breath * tv(VH, 'holdBreath', 1);
  const c = CQ_GAIT.carry;
  RC.pelvis = c.pelvis * tv(VC, 'carryTwist', 1);
  RC.counter = c.counter * tv(VC, 'carryCounter', 1);
  RC.lean = c.lean + (tv(VC, 'carryLean', 0) * Math.PI) / 180;
  RC.shift = c.shift * tv(VC, 'carryShift', 1);
  RC.dip = c.dip * tv(VC, 'carryDip', 1);
  RC.stride = c.stride * tv(VC, 'carryStride', 1);
  RC.brace = c.brace;
  RC.braceRoll = c.braceRoll;
  RC.breath = c.breath;
}

// ------------------------------------------------------------------------------------------
// The pose layer
// ------------------------------------------------------------------------------------------

/** The rig's shoulder line yaw is 0.4 x the pelvis yaw + the spine yaw (characterRig: spine 0.4 sp - 0.6 pe, chest 0.6 sp). */
export const CHEST_OF_PELVIS = 0.4;

/** The layer's offsets for one frame (rad, m). */
export interface CqGaitOut {
  pelYaw: number;
  spYaw: number;
  spRoll: number;
  pelX: number;
  pelY: number;
}

/**
 * The offsets at gait phase `ph` (0..1, the left heel strike at 0, the right at 0.5) for `row`, moving share `move`
 * (0 still .. 1 walking), load side `side` (1 the body on the right shoulder, -1 the left, 0 none). The shoulder line
 * (0.4 pelvis + spine) ends at -counter x the pelvis yaw. Pure: writes `out`.
 */
export function cqGaitAt(row: CqGaitRow, ph: number, move: number, side: number, out: CqGaitOut): CqGaitOut {
  const c = Math.cos(2 * Math.PI * ph);
  const pel = row.pelvis * c * move;
  out.pelYaw = pel;
  out.spYaw = -(CHEST_OF_PELVIS + row.counter) * pel;
  // + roll tilts the chest to the left (Babylon yaw-pitch-roll): away from a right-shoulder load
  out.spRoll = row.lean * side;
  out.pelX = row.shift * side;
  // lowest just after each heel strike (the loading response, ~6 % of the cycle in), level at mid-stance
  out.pelY = -row.dip * move * (0.5 + 0.5 * Math.cos(4 * Math.PI * (ph - 0.06)));
  return out;
}

/** (anim-n4b) The hold still's offsets for one frame (rad, m). */
export interface CqBraceOut {
  pelYaw: number;
  spYaw: number;
  spRoll: number;
  spPitch: number;
  pelX: number;
}

/**
 * (anim-n4b) The brace's rates (Hz): the shoulder turn and its overtone, the weight shift (the takedown's hold sway,
 * `CQ.swayHz`) and the braced breath. All divide 4 s (the chamber's `hold_idle` cycle), so a keyed loop closes.
 */
export const CQ_BRACE_HZ = { turn: 0.25, turn2: 0.75, shift: CQ.swayHz, breath: 0.25 } as const;
/** The hips turn this share of the shoulders' brace, the other way. */
export const BRACE_PELVIS = 0.3;

/**
 * (anim-n4b) The hold standing still at `t` s held. `sway` the pair's side-to-side shift (m, + right: the takedown's
 * hold sway as the rig gets it) and `seen` 0..1 how much of it the rig has (0: a rig without it, a remote copy or the
 * chamber clip: the shift runs on `t` at the same rate and `pelX` carries it). The shoulder line (0.4 pelvis + spine) turns
 * by the brace, the hips `BRACE_PELVIS` of it the other way; the chest rolls against the shift (hips right, chest left:
 * + roll); the breath pitches the spine. Pure: writes `out`.
 */
export function cqBraceAt(row: CqGaitRow, t: number, sway: number, seen: number, out: CqBraceOut): CqBraceOut {
  const TAU = 2 * Math.PI;
  const turn = row.brace * (0.75 * Math.sin(TAU * CQ_BRACE_HZ.turn * t) + 0.25 * Math.sin(TAU * CQ_BRACE_HZ.turn2 * t + 1.1));
  const pel = -BRACE_PELVIS * turn;
  out.pelYaw = pel;
  out.spYaw = turn - CHEST_OF_PELVIS * pel;
  const own = Math.sin(TAU * CQ_BRACE_HZ.shift * t);
  const sn = sway / CQ.swayAmp;
  const s = (sn < -1 ? -1 : sn > 1 ? 1 : sn) * seen + own * (1 - seen);
  out.spRoll = row.braceRoll * s;
  out.pelX = CQ.swayAmp * own * (1 - seen);
  out.spPitch = row.breath * Math.sin(TAU * CQ_BRACE_HZ.breath * t);
  return out;
}

/** (hot path) The anim graph's close-quarters layer: eased in / out, written onto the graph's pose channels. */
export class CqGaitLayer {
  /** Eased 0..1: holding or carrying. */
  w = 0;
  /** Eased 0 (hold) .. 1 (carry), and the load (side x weight on the shoulder; held while fading out). */
  carryK = 0;
  side = 0;
  /** (anim-n4b) The brace's clock (s since the hold began, wrapped every 4 s) and its fade in (s, capped at 1). */
  braceT = 0;
  braceIn = 0;
  /** (anim-n4b) 0..1: the rig gets the takedown's hold sway (eased; 0 on a remote copy). */
  swaySeen = 0;
  private readonly a: CqGaitOut = { pelYaw: 0, spYaw: 0, spRoll: 0, pelX: 0, pelY: 0 };
  private readonly b: CqGaitOut = { pelYaw: 0, spYaw: 0, spRoll: 0, pelX: 0, pelY: 0 };
  private readonly br: CqBraceOut = { pelYaw: 0, spYaw: 0, spRoll: 0, spPitch: 0, pelX: 0 };

  /**
   * `on`: a held guard or a body (the graph's bend inputs), `body` the bend is over a body (the carry walk), `load` the
   * body's load (1 right shoulder .. -1 left, x its weight on it 0..1: 0 kneeling at the body and after the put down's
   * hand-over), `ph` the gait phase, `move` the graph's moving share. The carry's lean and hip shift follow the load as
   * given (the sim eases it; a body hidden or dropped at once ends `on`, and the layer fades out on the last load).
   * (anim-n4b) `sway` the hold's side-to-side shift as the graph has it (m; 0 on a rig without it): standing still with
   * a guard the hold braces (`cqBraceAt`), faded in over its first second and out as the walk comes in. Adds to `src`
   * (the graph's pose). No allocation.
   */
  apply(src: Float32Array, on: boolean, body: boolean, load: number, ph: number, move: number, dt: number, sway = 0): void {
    const k = dt > 0 ? 1 - Math.exp(-dt / 0.15) : 1;
    this.w += ((on ? 1 : 0) - this.w) * k;
    if (on) {
      this.carryK += ((body ? 1 : 0) - this.carryK) * k;
      this.side = load;
    }
    if (this.w < 1e-4) {
      this.w = 0;
      this.braceT = this.braceIn = this.swaySeen = 0;
      return;
    }
    if (body) this.braceT = this.braceIn = 0;
    else if (on && dt > 0) {
      this.braceT += dt;
      if (this.braceT >= 4) this.braceT -= 4;
      this.braceIn = Math.min(1, this.braceIn + dt);
      const seen = Math.abs(sway) > 1e-4 ? 1 : 0;
      this.swaySeen += (seen - this.swaySeen) * (1 - Math.exp(-dt / (seen ? 0.2 : 1.5)));
    }
    cqRows();
    const m = move < 0 ? 0 : move > 1 ? 1 : move;
    const a = cqGaitAt(RH, ph, m, this.side, this.a);
    const b = cqGaitAt(RC, ph, m, this.side, this.b);
    const ck = this.carryK;
    const w = this.w;
    src[CH.pelYaw] = src[CH.pelYaw]! + (a.pelYaw + (b.pelYaw - a.pelYaw) * ck) * w;
    src[CH.spYaw] = src[CH.spYaw]! + (a.spYaw + (b.spYaw - a.spYaw) * ck) * w;
    src[CH.spRoll] = src[CH.spRoll]! + (a.spRoll + (b.spRoll - a.spRoll) * ck) * w;
    src[CH.pelX] = src[CH.pelX]! + (a.pelX + (b.pelX - a.pelX) * ck) * w;
    src[CH.pelY] = src[CH.pelY]! + (a.pelY + (b.pelY - a.pelY) * ck) * w;
    // (anim-n4b) holding still: the brace (the hold's share, standing, faded in)
    const bw = w * (1 - ck) * (1 - m) * this.braceIn;
    if (bw > 1e-4) {
      const r = cqBraceAt(RH, this.braceT, sway, this.swaySeen, this.br);
      src[CH.pelYaw] = src[CH.pelYaw]! + r.pelYaw * bw;
      src[CH.spYaw] = src[CH.spYaw]! + r.spYaw * bw;
      src[CH.spRoll] = src[CH.spRoll]! + r.spRoll * bw;
      src[CH.spPitch] = src[CH.spPitch]! + r.spPitch * bw;
      src[CH.pelX] = src[CH.pelX]! + r.pelX * bw;
    }
  }
}

// ------------------------------------------------------------------------------------------
// (anim-n4b) The Test Chamber's hold clips: the same layer on the keyed trunk
// ------------------------------------------------------------------------------------------

/** `q[o..o+3]` (x, y, z, w) pre-multiplied by a yaw (about y), pitch (x) and roll (z) in Babylon's yaw-pitch-roll order
 *  (in the parent frame). No allocation. */
function preYpr(q: Float64Array, o: number, yaw: number, pitch: number, roll: number): void {
  const cy = Math.cos(yaw / 2);
  const sy = Math.sin(yaw / 2);
  const cp = Math.cos(pitch / 2);
  const sp = Math.sin(pitch / 2);
  const cr = Math.cos(roll / 2);
  const sr = Math.sin(roll / 2);
  // Babylon RotationYawPitchRoll: q = qYaw(y) * qPitch(x) * qRoll(z)
  const rx = cy * sp * cr + sy * cp * sr;
  const ry = sy * cp * cr - cy * sp * sr;
  const rz = cy * cp * sr - sy * sp * cr;
  const rw = cy * cp * cr + sy * sp * sr;
  const x = q[o]!;
  const y = q[o + 1]!;
  const z = q[o + 2]!;
  const qw = q[o + 3]!;
  q[o] = rw * x + rx * qw + ry * z - rz * y;
  q[o + 1] = rw * y - rx * z + ry * qw + rz * x;
  q[o + 2] = rw * z + rx * y - ry * x + rz * qw;
  q[o + 3] = rw * qw - rx * x - ry * y - rz * z;
}

const KG: CqGaitOut = { pelYaw: 0, spYaw: 0, spRoll: 0, pelX: 0, pelY: 0 };
const KB: CqBraceOut = { pelYaw: 0, spYaw: 0, spRoll: 0, spPitch: 0, pelX: 0 };

/**
 * (anim-n4b) A chamber hold clip with the game's close-quarters layer on its keyed trunk (the clips are chamber-only
 * references; the game's hold is procedural with this layer): `walk` the hold walk's counter-rotation at gait phase `ph`
 * (the left heel strike at 0), else the hold still's brace at `t` s (the shift on its own clock). `pel` the keyed pelvis
 * offset (x, y, z), `q` the pelvis, spine, chest, neck quaternions (`KQ` layout: pelvis 0, spine 4). The keyed spine is
 * the procedural spine and chest together, so it takes the whole spine yaw, roll and pitch. No allocation.
 */
export function cqKeyedHold(pel: Float64Array, q: Float64Array, walk: boolean, ph: number, t: number): void {
  cqRows();
  if (walk) {
    const g = cqGaitAt(RH, ph, 1, 0, KG);
    preYpr(q, 0, g.pelYaw, 0, 0);
    preYpr(q, 4, g.spYaw - (1 - CHEST_OF_PELVIS) * g.pelYaw, 0, 0);
    pel[1] = pel[1]! + g.pelY;
    return;
  }
  const b = cqBraceAt(RH, t, 0, 0, KB);
  preYpr(q, 0, b.pelYaw, 0, 0);
  // the keyed spine sits on the keyed pelvis: the shoulder line ends at pelvis + spine (the procedural rig's 0.4 share
  // of the pelvis is its own split)
  preYpr(q, 4, b.spYaw - (1 - CHEST_OF_PELVIS) * b.pelYaw, b.spPitch, b.spRoll);
  pel[0] = pel[0]! + b.pelX;
}

// ------------------------------------------------------------------------------------------
// The body lift's crouch pose (animation only)
// ------------------------------------------------------------------------------------------

/** The rig's lift crouch pose moves at most 1 / this per second (s, the controller's crouch time). */
export const LIFT_CROUCH_POSE_TIME = 0.22;

/**
 * (hot path) The body lift's crouch pose, on the rig. The controller crouches from the lift's start (the sim's fixed
 * timeline, `liftCurve`); the pose walks the step-in to the body standing and kneels once the step is
 * `CQ.liftCrouchStep` done (a step-in posed crouched let the crouched stance band drag a planted foot along with the
 * body: lift slide 21 cm), and standing up it stays down while a foot is still stepping, at most `CQ.liftCrouchWait` s
 * (a stand-up on a foot stretched wide dragged it 6 cm). Outside a lift it passes the controller's crouch through.
 */
export class CqLiftCrouch {
  /** The posed crouch 0..1. */
  cr = 0;
  private wait = 0;
  /** Easing back onto the controller's crouch after a lift. */
  private tail = false;

  /**
   * `crouch` the controller's eased stance (0..1), `step` the lift's step-in 0..1 (< 0 no lift), `planted` both feet
   * in contact (the planner's last frame). Returns the crouch to pose.
   */
  step(crouch: number, step: number, planted: boolean, dt: number): number {
    if (step < 0 && !this.tail) {
      this.cr = crouch;
      this.wait = 0;
      return crouch;
    }
    let goal = crouch;
    if (step >= 0) {
      this.tail = true;
      if (step < CQ.liftCrouchStep) goal = 0;
      else if (goal < this.cr && !planted && this.wait < CQ.liftCrouchWait) {
        goal = this.cr;
        this.wait += dt;
      }
    }
    const r = dt / LIFT_CROUCH_POSE_TIME;
    this.cr = goal > this.cr ? Math.min(goal, this.cr + r) : Math.max(goal, this.cr - r);
    if (step < 0 && Math.abs(this.cr - crouch) < 1e-3) {
      this.tail = false;
      this.wait = 0;
      this.cr = crouch;
    }
    return this.cr;
  }
}

// ------------------------------------------------------------------------------------------
// The step length (the local player's gait clock)
// ------------------------------------------------------------------------------------------

/** The local player's walk this step ('' none): GameState sets it with the close-quarters pose. */
export function cqSimSet(group: CqGroup | ''): void {
  CQ_SIM.group = group;
}

/** Inside `tuneSim(true)` .. `tuneSim(false)` (PlayerController): the walk's step length on the gait clock. */
export function cqSim(): void {
  const g = CQ_SIM.group;
  if (g === '') return;
  cqRows();
  TUNE_CUR.strideMul *= g === 'cq.carry' ? RC.stride : RH.stride;
}
