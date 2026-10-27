/**
 * (anim-joints J2, COVERAGE gap 2, A5) The row ids of the Joints, Hands & feet, IK strength and Weapon tables, and the
 * pick of the move and action rows (pure, Babylon-free, no runtime imports: the tables, the registry sections and the
 * tests read it; `moveTune.ts` / `tune.ts` are type-only here, a test keeps the lists equal, so no import cycle).
 *
 * Rows (`TUNE_ROW_IDS`): the body states (`BODY_GROUPS`, in order, so their indices are unchanged), then the move rows
 * `trav.<kind>` (moveTune's `TRAV_KINDS` plus `brace`, the booster's / holder's brace), `team.<move>.<a|b>` (moveTune's
 * `TEAM_MOVES`, role A and role B), then the action rows `air`, `land`, `melee`, `reload`, `swap`, `throw`, `hit`
 * ((anim-n3b) the dash-in slide's row `slide` is gone with its move: `REMOVED_TUNE_ROWS`). Group ids: `joint.trav.vault`, `hand.rifle.reload`, `ik.air`, `weapon.pistol.throw`, `joint.team.boost.b`, ...
 *
 * The pick (`pickTuneRows`): the stance row (the body state, '' during a traversal move that has none) plus up to
 * `TUNE_MOVE_MAX` move / action rows with a weight 0..1 each, strongest first, into a preallocated result. Weights:
 * a traversal kind 1 while `traverse` is that kind; a team role 1 while `tuneTeam` names it; the actions the anim graph's
 * own blend weights (`AnimGraph.rowW`: air its lower-state fade, land its landing clip's envelope, melee the
 * elbow arc's hand weight, reload / swap its overlay weights, throw its grenade hands weight, hit its flinch spring), or,
 * without a graph, 1 while the pose field is on (`grounded` false, `landing` > 0.5, `melee` / `reload` / `swap` /
 * `grenade` >= 0). The panel follows the strongest move row while its weight is 0.5 or more, else the stance row.
 */
import type { BodyGroup } from './tune';
import type { TeamMoveId, TravKind } from './moveTune';

/** The body states (tune.ts `BODY_GROUPS`, the same order; a test keeps them equal). */
const BODY_ROWS: readonly BodyGroup[] = [
  'idle',
  'walk',
  'jog',
  'run',
  'crouchIdle',
  'sneak',
  'crouchWalk',
  'lowReady',
  'aim',
  'aimCrouch',
  'wallIdle',
  'wallSlide',
  'wallPeek',
  'ladder',
  'pipe',
  'ledge',
  'vent',
  'crawl',
  'hang',
  'hold',
  'crouchRun',
  'aimStill',
  'aimCrouchMove',
  'wallCrouchIdle',
  'wallCrouchSlide',
  'wallCrouchPeek',
  'carry',
];

/** The traversal kinds with a move row: moveTune `TRAV_KINDS` (a test keeps them equal) plus `brace`. */
export const MOVE_TRAV_KINDS: readonly (TravKind | 'brace')[] = ['vault', 'mantle', 'step', 'climbUp', 'windowVault', 'rappel', 'drop', 'hop', 'roll', 'wallKick', 'split', 'brace'];
/** The team moves (moveTune `TEAM_MOVES`; a test keeps them equal). */
export const MOVE_TEAM_MOVES: readonly TeamMoveId[] = ['boost', 'relay', 'throw', 'hang', 'rope', 'revive'];
/** The action rows, in the pick's priority order (a tie in weight keeps this order). */
export const ACTION_ROWS = ['air', 'land', 'melee', 'reload', 'swap', 'throw', 'hit'] as const;
/**
 * (anim-n3b) Rows that existed once and were deleted with their move (the dash-in slide, Michael 2026-10-22). A save or
 * an export from before still carries their groups (`joint.slide`, `ik.slide`, `hand.<gun>.slide`,
 * `weapon.<gun>.slide`): the registry drops them on load and import (`isRemovedTuneGroup`) instead of keeping them as a
 * section that never registers.
 */
export const REMOVED_TUNE_ROWS: readonly string[] = ['slide'];
/** (anim-n3b) A group id of a removed row in the Joints / IK / Hands & feet / Weapon tables (the last segment after the
 *  section and gun segments). Not hot: load and import only. */
export function isRemovedTuneGroup(group: string): boolean {
  const parts = group.split('.');
  const sec = parts[0];
  const row = sec === 'joint' || sec === 'ik' ? (parts.length === 2 ? parts[1] : '') : sec === 'hand' || sec === 'weapon' ? (parts.length === 3 ? parts[2] : '') : '';
  return row !== undefined && row !== '' && REMOVED_TUNE_ROWS.includes(row);
}
export type ActionRow = (typeof ACTION_ROWS)[number];

/** The move rows: traversal, then team (role A, role B per move). */
export const MOVE_ROWS: readonly string[] = [...MOVE_TRAV_KINDS.map((k) => `trav.${k}`), ...MOVE_TEAM_MOVES.flatMap((m) => [`team.${m}.a`, `team.${m}.b`])];
/** Every move and action row (the rows after the body states). */
export const TUNE_MOVE_ROW_IDS: readonly string[] = [...MOVE_ROWS, ...ACTION_ROWS];
/** Every row of the Joints (plus its per-gun rows), Hands & feet, IK strength and Weapon tables. */
export const TUNE_ROW_IDS: readonly string[] = [...BODY_ROWS, ...TUNE_MOVE_ROW_IDS];
export const TUNE_BODY_ROW_COUNT = BODY_ROWS.length;
/** Row index by id. */
export const TUNE_ROW_INDEX: Readonly<Record<string, number>> = Object.freeze(Object.assign(Object.create(null) as Record<string, number>, Object.fromEntries(TUNE_ROW_IDS.map((r, i) => [r, i]))));
/** At most this many move / action rows at once (A5). */
export const TUNE_MOVE_MAX = 3;
/** A weight below this is no row (an eased overlay's tail). */
export const TUNE_ROW_MIN_W = 1e-3;
/** The panel follows a move row from this weight. */
export const TUNE_FOLLOW_W = 0.5;

const TRAV_ROW: Readonly<Record<string, number>> = Object.freeze(Object.fromEntries(MOVE_TRAV_KINDS.map((k) => [k, TUNE_ROW_INDEX[`trav.${k}`]!])));
const ACTION_IDX: readonly number[] = ACTION_ROWS.map((a) => TUNE_ROW_INDEX[a]!);

/** The anim graph's action weights (0..1; `AnimGraph.rowW`). */
export interface TuneActionWeights {
  air: number;
  land: number;
  melee: number;
  reload: number;
  swap: number;
  throw: number;
  hit: number;
}
export const emptyActionWeights = (): TuneActionWeights => ({ air: 0, land: 0, melee: 0, reload: 0, swap: 0, throw: 0, hit: 0 });

/** The RigPose fields the pick reads. */
export interface TuneMovePoseIn {
  grounded: boolean;
  traverse?: string;
  landing?: number;
  melee?: number;
  reload?: number;
  swap?: number;
  grenade?: number;
  /** (J2) The team role row of this rig (`team.<move>.<a|b>`, '' / undefined none). */
  tuneTeam?: string;
}

/** The pick (preallocated: `tuneRowPick`, filled in place by `pickTuneRows`). */
export interface TuneRowPick {
  /** The stance row (a body state) and its index in `TUNE_ROW_IDS` ('' / -1: none). */
  stance: string;
  stanceIdx: number;
  /** How many move / action rows are active (0..TUNE_MOVE_MAX), strongest first. */
  n: number;
  /** Their indices in `TUNE_ROW_IDS`, their ids and their weights (0..1]. */
  readonly idx: Int16Array;
  readonly ids: string[];
  readonly w: Float64Array;
}

export function tuneRowPick(): TuneRowPick {
  return { stance: '', stanceIdx: -1, n: 0, idx: new Int16Array(TUNE_MOVE_MAX).fill(-1), ids: ['', '', ''], w: new Float64Array(TUNE_MOVE_MAX) };
}

const clamp01 = (v: number): number => (v > 1 ? 1 : v > 0 ? v : 0);

/** Insert a candidate (row index, weight) into the pick, strongest first (a tie keeps the earlier). No allocation. */
function offer(out: TuneRowPick, row: number, w: number): void {
  if (!(w >= TUNE_ROW_MIN_W) || row < 0) return;
  const W = out.w;
  const I = out.idx;
  let at = out.n;
  while (at > 0 && W[at - 1]! < w) at--;
  if (at >= TUNE_MOVE_MAX) return;
  const last = out.n < TUNE_MOVE_MAX ? out.n : TUNE_MOVE_MAX - 1;
  for (let k = last; k > at; k--) {
    W[k] = W[k - 1]!;
    I[k] = I[k - 1]!;
  }
  W[at] = w > 1 ? 1 : w;
  I[at] = row;
  if (out.n < TUNE_MOVE_MAX) out.n++;
}

/**
 * Fill `out` for a rig: the stance row `stance` (a body state, '' none) and the move / action rows of `pose` with their
 * weights (`wts`: the rig's anim graph weights, null: from the pose alone). Strongest first, at most `TUNE_MOVE_MAX`.
 * Returns `out`. No allocation.
 */
export function pickTuneRows(pose: TuneMovePoseIn, wts: TuneActionWeights | null, stance: string, out: TuneRowPick): TuneRowPick {
  out.stance = stance;
  out.stanceIdx = stance === '' ? -1 : (TUNE_ROW_INDEX[stance] ?? -1);
  if (out.stanceIdx >= TUNE_BODY_ROW_COUNT) {
    out.stance = '';
    out.stanceIdx = -1;
  }
  out.n = 0;
  // traversal kind: 1 while the pose is in it
  const tr = pose.traverse;
  if (tr !== undefined && tr !== 'none' && tr !== '') {
    const r = TRAV_ROW[tr];
    if (r !== undefined) offer(out, r, 1);
  }
  // team role: 1 while the rig is in it
  const tm = pose.tuneTeam;
  if (tm !== undefined && tm !== '') offer(out, TUNE_ROW_INDEX[tm] ?? -1, 1);
  // actions
  if (wts) {
    offer(out, ACTION_IDX[0]!, clamp01(wts.air));
    offer(out, ACTION_IDX[1]!, clamp01(wts.land));
    offer(out, ACTION_IDX[2]!, clamp01(wts.melee));
    offer(out, ACTION_IDX[3]!, clamp01(wts.reload));
    offer(out, ACTION_IDX[4]!, clamp01(wts.swap));
    offer(out, ACTION_IDX[5]!, clamp01(wts.throw));
    offer(out, ACTION_IDX[6]!, clamp01(wts.hit));
  } else {
    if (!pose.grounded && (tr === undefined || tr === 'none')) offer(out, ACTION_IDX[0]!, 1);
    if ((pose.landing ?? 0) > 0.5) offer(out, ACTION_IDX[1]!, 1);
    if ((pose.melee ?? -1) >= 0) offer(out, ACTION_IDX[2]!, 1);
    if ((pose.reload ?? -1) >= 0) offer(out, ACTION_IDX[3]!, 1);
    if ((pose.swap ?? -1) >= 0) offer(out, ACTION_IDX[4]!, 1);
    if ((pose.grenade ?? -1) >= 0) offer(out, ACTION_IDX[5]!, 1);
  }
  const ids = out.ids;
  for (let k = 0; k < TUNE_MOVE_MAX; k++) {
    if (k < out.n) ids[k] = TUNE_ROW_IDS[out.idx[k]!]!;
    else {
      ids[k] = '';
      out.idx[k] = -1;
      out.w[k] = 0;
    }
  }
  return out;
}

/** The row the panel follows: the strongest move / action row at weight 0.5 or more, else the stance row (-1 none). */
export function tuneRowFollow(p: TuneRowPick): number {
  return p.n > 0 && p.w[0]! >= TUNE_FOLLOW_W ? p.idx[0]! : p.stanceIdx;
}

// ------------------------------------------------------------------------------------------
// (A6) The co-op partner's team role from its own movement state on the wire (no wire change)
// ------------------------------------------------------------------------------------------

/** The wire's team sub bits (game/teamMoves ROPE_SUB, HANG_SUB, THROW_SUB; player/moveState ATTACH_SUB.relay). A test keeps them equal. */
export const TEAM_WIRE_BITS = { rope: 4, hang: 2, throw: 1, relay: 1024 } as const;

/** (coop-kit K0) The part 2 kit moves' sub bits on `brace` / `boost` (game/teamMoves `KIT_SUB`; a test keeps them
 *  equal) and their tuner rows (`team.<move>.a` / `.b`, moveTune `KIT_TUNE_MOVES`). The relay's 1024 is a `ledge` bit,
 *  never read on `brace` / `boost`. */
export const KIT_WIRE_ROWS: readonly { readonly bit: number; readonly a: string; readonly b: string }[] = (
  [
    [64, 'deadweight'],
    [128, 'dropCatch'],
    [256, 'chimneyPair'],
    [512, 'swingPass'],
    [1024, 'plankBridge'],
  ] as const
).map(([bit, m]) => ({ bit, a: `team.${m}.a`, b: `team.${m}.b` }));

/**
 * The team role row of a partner from its movement mode and sub on the wire ('' none): `brace` is role B (the rope, the
 * hang-down, the throw by their sub bit, else the leg-up), `boost` role A (the same bits, else the leg-up: the relay
 * climber rides the same mode and sub, so it reads as the leg-up's role A), a ledge hang with the relay bit the relay's
 * role B. The revive is not on the wire (none).
 */
export function teamRowOfWire(mode: string, sub: number): string {
  const B = TEAM_WIRE_BITS;
  if (mode === 'brace' || mode === 'boost') {
    const r = mode === 'brace' ? 'b' : 'a';
    // (mission NET) a kit move (PULL_SUB 8, SHUTTER_SUB 16) has no tuner row yet: never the leg-up's
    if ((sub & 24) !== 0) return '';
    // (coop-kit K0) a part 2 kit move: its own section's role row (moveTune `KIT_TUNE_MOVES`)
    for (let i = 0; i < KIT_WIRE_ROWS.length; i++) {
      const k = KIT_WIRE_ROWS[i]!;
      if ((sub & k.bit) !== 0) return r === 'a' ? k.a : k.b;
    }
    if ((sub & B.rope) !== 0) return r === 'a' ? 'team.rope.a' : 'team.rope.b';
    if ((sub & B.hang) !== 0) return r === 'a' ? 'team.hang.a' : 'team.hang.b';
    if ((sub & B.throw) !== 0) return r === 'a' ? 'team.throw.a' : 'team.throw.b';
    return r === 'a' ? 'team.boost.a' : 'team.boost.b';
  }
  if (mode === 'ledge' && (sub & B.relay) !== 0) return 'team.relay.b';
  return '';
}
