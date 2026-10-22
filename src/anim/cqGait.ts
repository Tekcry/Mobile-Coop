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
 * The values are the code defaults (`CQ_GAIT`); the tuner's "Holds and carries" section scales them (`CQ_SECTION`,
 * identity at default) and `scripts/anim-tune-bake.mjs` bakes a tune back into `CQ_GAIT` (tuneBakeTable.ts).
 */
import { registerTuneSection, TUNE_FLAGS, type TuneTunable } from './tuneRegistry';
import { CH } from './pose';
import { TUNE_CUR } from './tune';

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
}

/**
 * The defaults (a free walk is about +-4 deg pelvis and -+3 deg thorax: these are smaller, the arms are busy).
 * Hostage walk: +-3 deg pelvis, the shoulders against it at 0.9 of that, no lean (the guard is held square in front).
 * Carry: +-3.4 deg pelvis, shoulders at 0.8 (the body on the shoulder damps the chest), 6 deg lean away from the
 * load, the hips 1.5 cm under it, a 1.2 cm dip per step. (The gait clips' own small twist and the turn follow add to
 * these: measured on Proving, counterCorr -0.76 hold, -0.91 carry.)
 */
export const CQ_GAIT: { hold: CqGaitRow; carry: CqGaitRow } = {
  hold: { pelvis: 0.052, counter: 0.9, lean: 0, shift: 0, dip: 0.006, stride: 1 },
  carry: { pelvis: 0.06, counter: 0.8, lean: 0.105, shift: 0.015, dip: 0.012, stride: 1 },
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
  mul('holdTwist', 'Hold walk: hip and shoulder twist', HOLD, 'cqGait.ts CQ_GAIT.hold.pelvis (the pelvis yaw with the step; the shoulders follow by the counter share)'),
  mul('holdCounter', 'Hold walk: shoulders against the hips', HOLD, 'cqGait.ts CQ_GAIT.hold.counter (0: the shoulders hold square, 1: as far as the hips the other way)'),
  mul('holdDip', 'Hold walk: step weight (dip)', HOLD, 'cqGait.ts CQ_GAIT.hold.dip (the pelvis drop at each loading response)'),
  mul('holdStride', 'Hold walk: step length (cadence)', HOLD, 'cqGait.ts CQ_GAIT.hold.stride (longer steps at the same pace: a slower cadence)', 1.6),
  mul('carryTwist', 'Carry: hip and shoulder twist', CARRY, 'cqGait.ts CQ_GAIT.carry.pelvis'),
  mul('carryCounter', 'Carry: shoulders against the hips', CARRY, 'cqGait.ts CQ_GAIT.carry.counter'),
  { id: 'carryLean', label: 'Carry: lean away from the load', kind: 'add', def: 0, min: -10, max: 10, step: 0.5, unit: 'deg', groups: CARRY, hook: 'cqGait.ts CQ_GAIT.carry.lean (the trunk away from the loaded shoulder; + = further)' },
  mul('carryShift', 'Carry: hips under the load', CARRY, 'cqGait.ts CQ_GAIT.carry.shift'),
  mul('carryDip', 'Carry: step weight (dip)', CARRY, 'cqGait.ts CQ_GAIT.carry.dip'),
  mul('carryStride', 'Carry: step length (cadence)', CARRY, 'cqGait.ts CQ_GAIT.carry.stride', 1.6),
];

/** Which walk the local player is in (`cqSimSet`, the tuner's follow). */
export const CQ_SIM = { group: '' as CqGroup | '' };

export const CQ_SECTION = registerTuneSection({
  id: 'cq',
  label: 'Holds and carries',
  note: 'The hostage walk and the body carry (anim-natural N4). Read by every rig holding or carrying; the step length is the local player only.',
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
const RH: CqGaitRow = { pelvis: 0, counter: 0, lean: 0, shift: 0, dip: 0, stride: 1 };
const RC: CqGaitRow = { pelvis: 0, counter: 0, lean: 0, shift: 0, dip: 0, stride: 1 };

/** CQ_GAIT with the tuner's sliders on it (into RH / RC). No allocation. */
export function cqRows(): void {
  const h = CQ_GAIT.hold;
  RH.pelvis = h.pelvis * tv(VH, 'holdTwist', 1);
  RH.counter = h.counter * tv(VH, 'holdCounter', 1);
  RH.lean = h.lean;
  RH.shift = h.shift;
  RH.dip = h.dip * tv(VH, 'holdDip', 1);
  RH.stride = h.stride * tv(VH, 'holdStride', 1);
  const c = CQ_GAIT.carry;
  RC.pelvis = c.pelvis * tv(VC, 'carryTwist', 1);
  RC.counter = c.counter * tv(VC, 'carryCounter', 1);
  RC.lean = c.lean + (tv(VC, 'carryLean', 0) * Math.PI) / 180;
  RC.shift = c.shift * tv(VC, 'carryShift', 1);
  RC.dip = c.dip * tv(VC, 'carryDip', 1);
  RC.stride = c.stride * tv(VC, 'carryStride', 1);
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

/** (hot path) The anim graph's close-quarters layer: eased in / out, written onto the graph's pose channels. */
export class CqGaitLayer {
  /** Eased 0..1: holding or carrying. */
  w = 0;
  /** Eased 0 (hold) .. 1 (carry), and the eased load side. */
  carryK = 0;
  side = 0;
  private readonly a: CqGaitOut = { pelYaw: 0, spYaw: 0, spRoll: 0, pelX: 0, pelY: 0 };
  private readonly b: CqGaitOut = { pelYaw: 0, spYaw: 0, spRoll: 0, pelX: 0, pelY: 0 };

  /**
   * `on`: a held guard or a body (the graph's bend inputs), `carry` the load side (1 right shoulder, -1 left, 0 the
   * hold), `ph` the gait phase, `move` the graph's moving share. Adds to `src` (the graph's pose). No allocation.
   */
  apply(src: Float32Array, on: boolean, carry: number, ph: number, move: number, dt: number): void {
    const k = dt > 0 ? 1 - Math.exp(-dt / 0.15) : 1;
    this.w += ((on ? 1 : 0) - this.w) * k;
    if (on) {
      this.carryK += ((carry !== 0 ? 1 : 0) - this.carryK) * k;
      if (carry !== 0) this.side += (carry - this.side) * k;
    }
    if (this.w < 1e-4) {
      this.w = 0;
      return;
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
