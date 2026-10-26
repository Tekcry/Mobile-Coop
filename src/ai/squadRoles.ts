/**
 * Squad roles for an engaged or searching group (guard-ai S8, design section 8; behaviour profiles design section 7;
 * pure: no Babylon / DOM), unit-tested in squadRoles.test.ts.
 *
 * The group is the guards in combat or searching for one `contact` incident. `assignRoles` runs at 2 Hz per group on
 * the host; `Enemy.decide` acts on the role. Roles:
 * - `reporter`: the caller (radio, section 5). Goes to the nearest cover 10-20 m from the LKP that hides him from it and
 *   stays down while he calls ("hide and report").
 * - `point`: the nearest guard with a cover path toward the LKP; bounds cover to cover (the existing `pickAdvance`),
 *   holding 4-10 m from the LKP.
 * - `overwatch`: 1 per group, cover 8-15 m from the LKP; suppresses while the point moves.
 * - `flank`: 1 per group of 3+ (the existing single flanker, generalised): cover whose bearing from the LKP is >= 60 deg
 *   off the point's.
 * - `search`: everyone else (ring sweep, the existing `searchSlot`).
 * Fill order: reporter, point, overwatch, flank; a group with an aggressive member fills reporter, point, flank,
 * overwatch, and aggressive members are picked first for point and flank (profile weights, never dice). Posted guards
 * (`post`) never take point or flank. Ties go to the lower slot (G143 / A7: no randomness in the choice).
 *
 * Moving mask (`RoleOutput.moving`, 1 = may leave cover this tick): a group never has more than 1 point and 1 flanker
 * moving at once (one of each role per group), and unless one of them is aggressive only one of the two moves:
 * - point moves when it has a cover to bound to and the overwatch is set (in its cover) or there is none;
 * - flank moves when it has a cover to go to and the point holds; once the target has held cover `flankAfter` s
 *   (the old flanker trigger) the flank goes first and the point holds and suppresses;
 * - reporter and overwatch move only until they are in their cover; search always moves.
 * (one-mover triage) A guard already on a role bound (`RoleInput.bound`) is never made the flank while the point is on
 * one too (both standard): a reporter or overwatch whose walk is still going when his role changes is not the second
 * of point / flank on the way (`ONE_MOVER.roles`).
 * `RoleOutput.run`: runs only between covers or on an aggressive profile (`runToContact`); a coverless search walks.
 *
 * Cover comes from `CoverSet` / `CoverGrid` (coverGrid.ts). `scoreCover` is the per-role score (higher is better,
 * -Infinity unusable). Combat variation (bursts, strafes, peeks) uses `mulberry32(combatSeed(...))` per guard per
 * incident in place of `Math.random` (replayable, co-op host only); patrols, posts, investigations and radio delays use
 * no randomness at all.
 *
 * No allocation per call: `RoleInput` / `RoleOutput` are reused SoA buffers, the grid query and the per-call picks use
 * module scratch sized once.
 */
import { hyp2 } from '../core/mathx';
import type { CoverGrid, CoverSet } from './coverGrid';

export type Role = 'none' | 'point' | 'overwatch' | 'flank' | 'reporter' | 'search';
/** Role codes (`RoleOutput.role`): `ROLES[code]`. */
export const ROLES: readonly Role[] = ['none', 'point', 'overwatch', 'flank', 'reporter', 'search'];
export const R_NONE = 0;
export const R_POINT = 1;
export const R_OVERWATCH = 2;
export const R_FLANK = 3;
export const R_REPORTER = 4;
export const R_SEARCH = 5;

/** (guard-ai walk 4.82 item 2) `peekWait`: seconds in cover with no sight of him (one whole hide / peek cycle, the
 *  `inCover` 4.2 s cycle) before a guard with no holding role leaves it to close on the last known position. */
export const ENGAGE = { peekWait: 4.2 } as const;

/**
 * (guard-ai walk 4.82 item 2, Michael: "He should report then attack you instead of hiding") A guard in combat, in
 * cover, his target out of sight: once his radio call is through (`callOpen` false) he moves up on his intruder's last
 * known position (the out-of-sight advance, cover to cover) instead of sitting in cover until the lost-sight timer turns
 * the fight into a search. Only a guard with no holding role: a lone guard (`R_NONE`) or a group's `search`; the point,
 * overwatch, flank and the reporter (who holds the role only while his call is open) keep theirs. A high-security post
 * (`secure`) holds his leash. `unseen`: seconds since he last saw him; `inCoverT`: seconds in this cover; both at least
 * `ENGAGE.peekWait`, so one peek has come up empty (a crouched hide phase is not a lost target). Pure.
 */
export function closeFromCover(role: number, callOpen: boolean, secure: boolean, unseen: number, inCoverT: number): boolean {
  if (role !== R_NONE && role !== R_SEARCH) return false;
  if (callOpen || secure) return false;
  return unseen >= ENGAGE.peekWait && inCoverT >= ENGAGE.peekWait;
}

export type ProfileId = 'standard' | 'aggressive' | 'post';

/** How a guard fights (design section 7). Weights and thresholds, never dice: the seeded RNG reads them. */
export interface BehaviourProfile {
  id: ProfileId;
  /** Seconds held between bounds. */
  advanceHold: number;
  /** Weight of going to cover on contact (compared with the seeded combat RNG, replacing `Math.random() < 0.85`). */
  coverFirst: number;
  /** Runs its bounds (last stretch at a jog, not ADVANCE_PACE); may take point without a cover path. */
  runToContact: boolean;
  /** Role weights: the higher weight fills the role first; 0 = never this role. */
  pointWeight: number;
  flankWeight: number;
  overwatchWeight: number;
  /** Suppressive fire while a squadmate moves. */
  suppress: boolean;
  /** Starts with the shared LKP (all reinforcements). */
  knowsLkp: boolean;
  /** Goes straight to search / combat, never calms. */
  neverCautious: boolean;
}

/** Profile codes (`RoleInput.profile`): `PROFILE_IDS[code]`. */
export const PROFILE_IDS: readonly ProfileId[] = ['standard', 'aggressive', 'post'];
export const P_STANDARD = 0;
export const P_AGGRESSIVE = 1;
export const P_POST = 2;

export const BEHAVIOUR: Readonly<Record<ProfileId, Readonly<BehaviourProfile>>> = {
  standard: {
    id: 'standard',
    advanceHold: 2.5,
    coverFirst: 0.85,
    runToContact: false,
    pointWeight: 1,
    flankWeight: 1,
    overwatchWeight: 1,
    suppress: true,
    knowsLkp: false,
    neverCautious: false,
  },
  // reinforcements (S6, M1 "any reinforcements must be aggressive")
  aggressive: {
    id: 'aggressive',
    advanceHold: 0.8,
    coverFirst: 0.3,
    runToContact: true,
    pointWeight: 2,
    flankWeight: 2,
    overwatchWeight: 1,
    suppress: true,
    knowsLkp: true,
    neverCautious: true,
  },
  // high-security posts (A10): hold the leash, watch, never bound or flank
  post: {
    id: 'post',
    advanceHold: 4,
    coverFirst: 0.9,
    runToContact: false,
    pointWeight: 0,
    flankWeight: 0,
    overwatchWeight: 2,
    suppress: true,
    knowsLkp: false,
    neverCautious: false,
  },
};

const PROFILE_BY_CODE: readonly Readonly<BehaviourProfile>[] = [BEHAVIOUR.standard, BEHAVIOUR.aggressive, BEHAVIOUR.post];

/** The profile for a code (unknown codes read as standard). */
export function profileOf(code: number): Readonly<BehaviourProfile> {
  return PROFILE_BY_CODE[code] ?? BEHAVIOUR.standard;
}

export const SQUAD = {
  /** Cover protects when normal . dirToLkp >= this. */
  protectDot: 0.3,
  /** Role bands: cover distance to the LKP (m). */
  pointMin: 4,
  pointMax: 10,
  overwatchMin: 8,
  overwatchMax: 15,
  flankMin: 5,
  flankMax: 14,
  reporterMin: 10,
  reporterMax: 20,
  /** How far from the guard a role's cover may be (m; also the grid query radius). */
  pointReach: 12,
  overwatchReach: 15,
  flankReach: 20,
  reporterReach: 14,
  /** A point bound must end at least this much closer to the LKP than the guard is (m). */
  advanceGain: 2,
  /** Same storey: |dy| within this (m) of the guard (or, for point and flank, of the LKP). */
  storeyDy: 1.5,
  /** Flank cover bearing from the LKP at least this far off the point's (deg). */
  flankMinDeg: 60,
  /** Smallest group that gets a flanker. */
  flankGroup: 3,
  /** The target has held cover this long (s): the flank moves first, the point holds (the old flanker trigger). */
  flankAfter: 4,
  /** Score added to the cover a guard already holds (no churn at 2 Hz). */
  stayBonus: 1.5,
  /** Score: base minus distance from me x wMe (reporter x wMeReporter) minus |dT - band mid| x wBand, plus protection. */
  base: 20,
  wMe: 0.5,
  wMeReporter: 1,
  wBand: 0.5,
  wProtect: 2,
  /** Overwatch on low cover can fire over it. */
  lowOverwatch: 0.5,
  /** (guard-ai S27) A role guard out of sight in the open waits for the group at most this long (s), crouched; then he
   *  takes today's cover pick. Infinity: the S8 wait. */
  openWait: 3,
  /** (guard-ai S27) Suppressive fire only along a clear static line from the muzzle to the spot (one cached ray per
   *  think). false: the S8 rule. */
  suppressView: true,
} as const;

/** cos(flankMinDeg): a flank cover's bearing cos to the point's must be <= this. */
export const FLANK_COS = Math.cos((SQUAD.flankMinDeg * Math.PI) / 180);

/** Per-group input, filled by the manager into reused arrays (index = member, not guard id). */
export class RoleInput {
  n = 0;
  /** Stable guard id (`Enemy.num`): ties go to the lower slot; `callerSlot` and `CoverSet.owner` use it. */
  readonly slot: Int16Array;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly seesTarget: Uint8Array;
  readonly inCover: Uint8Array;
  /** `P_STANDARD` / `P_AGGRESSIVE` / `P_POST`. */
  readonly profile: Uint8Array;
  /** Cover index the guard holds or is heading for (`Enemy.coverIdx`), -1 none. */
  readonly coverIdx: Int32Array;
  /** (one-mover triage) 1 = on a role bound now (`seekCover` with `Enemy.roleBound`, whatever role started it): the
   *  manager's "on his way" for the one-mover rule. */
  readonly bound: Uint8Array;
  lkpX = 0;
  lkpY = 0;
  lkpZ = 0;
  /** How long the target has held cover (s), 0 when not in cover. */
  targetCoverT = 0;
  /** Slot of the guard making the radio call, -1 none. */
  callerSlot = -1;
  cover: CoverSet | null = null;
  grid: CoverGrid | null = null;
  constructor(readonly cap = 32) {
    this.slot = new Int16Array(cap);
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.z = new Float32Array(cap);
    this.seesTarget = new Uint8Array(cap);
    this.inCover = new Uint8Array(cap);
    this.profile = new Uint8Array(cap);
    this.coverIdx = new Int32Array(cap).fill(-1);
    this.bound = new Uint8Array(cap);
  }
}

/** Per-member result (index = member, same as the input). */
export class RoleOutput {
  readonly role: Uint8Array;
  /** Cover the role wants (index into the `CoverSet`), -1 none: reserve it, path to it. */
  readonly cover: Int32Array;
  /** 1 = may leave cover / travel this tick (the moving rule above). */
  readonly moving: Uint8Array;
  /** 1 = may run (between covers, or aggressive). */
  readonly run: Uint8Array;
  /** Member index of each single role, -1 none. */
  point = -1;
  overwatch = -1;
  flank = -1;
  reporter = -1;
  constructor(readonly cap = 32) {
    this.role = new Uint8Array(cap);
    this.cover = new Int32Array(cap).fill(-1);
    this.moving = new Uint8Array(cap);
    this.run = new Uint8Array(cap);
  }
}

function bandMin(role: number): number {
  switch (role) {
    case R_POINT:
      return SQUAD.pointMin;
    case R_OVERWATCH:
      return SQUAD.overwatchMin;
    case R_FLANK:
      return SQUAD.flankMin;
    case R_REPORTER:
      return SQUAD.reporterMin;
    default:
      return Infinity;
  }
}

function bandMax(role: number): number {
  switch (role) {
    case R_POINT:
      return SQUAD.pointMax;
    case R_OVERWATCH:
      return SQUAD.overwatchMax;
    case R_FLANK:
      return SQUAD.flankMax;
    case R_REPORTER:
      return SQUAD.reporterMax;
    default:
      return -Infinity;
  }
}

/** How far from the guard a role looks for cover (m); 0 for roles that take none. */
export function roleReach(role: number): number {
  switch (role) {
    case R_POINT:
      return SQUAD.pointReach;
    case R_OVERWATCH:
      return SQUAD.overwatchReach;
    case R_FLANK:
      return SQUAD.flankReach;
    case R_REPORTER:
      return SQUAD.reporterReach;
    default:
      return 0;
  }
}

function scoreCore(
  cx: number,
  cy: number,
  cz: number,
  nx: number,
  nz: number,
  low: boolean,
  gx: number,
  gy: number,
  gz: number,
  lkpX: number,
  lkpY: number,
  lkpZ: number,
  role: number,
  reserved: boolean,
  advance: boolean,
): number {
  const reach = roleReach(role);
  if (reserved || reach <= 0) return -Infinity;
  const towardLkp = role === R_POINT || role === R_FLANK;
  if (Math.abs(cy - gy) > SQUAD.storeyDy && !(towardLkp && Math.abs(cy - lkpY) <= SQUAD.storeyDy)) return -Infinity;
  const dx = lkpX - cx;
  const dz = lkpZ - cz;
  const dT = hyp2(dx, dz);
  const lo = bandMin(role);
  const hi = bandMax(role);
  if (dT < lo || dT > hi) return -Infinity;
  const dot = (nx * dx + nz * dz) / dT;
  if (dot < SQUAD.protectDot) return -Infinity;
  const dMe = hyp2(cx - gx, cz - gz);
  if (dMe > reach) return -Infinity;
  if (advance && role === R_POINT && dT > hyp2(lkpX - gx, lkpZ - gz) - SQUAD.advanceGain) return -Infinity;
  return (
    SQUAD.base -
    dMe * (role === R_REPORTER ? SQUAD.wMeReporter : SQUAD.wMe) -
    Math.abs(dT - (lo + hi) / 2) * SQUAD.wBand +
    (dot - SQUAD.protectDot) * SQUAD.wProtect +
    (low && role === R_OVERWATCH ? SQUAD.lowOverwatch : 0)
  );
}

/**
 * Score of cover point (c) with protected-side normal (n) for a guard at (g) taking `role` against the LKP; higher is
 * better, -Infinity unusable: reserved (by someone else, or blocked), outside the role's band to the LKP (point 4-10 m,
 * overwatch 8-15, flank 5-14, reporter 10-20), not protecting (normal . dirToLkp < 0.3), another storey, beyond the
 * role's reach from the guard, or (point) not at least `advanceGain` m closer to the LKP than the guard. `none` and
 * `search` take no cover (-Infinity).
 */
export function scoreCover(
  cx: number,
  cy: number,
  cz: number,
  nx: number,
  nz: number,
  low: boolean,
  gx: number,
  gy: number,
  gz: number,
  lkpX: number,
  lkpY: number,
  lkpZ: number,
  role: number,
  reserved: boolean,
): number {
  return scoreCore(cx, cy, cz, nx, nz, low, gx, gy, gz, lkpX, lkpY, lkpZ, role, reserved, true);
}

// ---- scratch (module, sized once; grows only if a bigger group arrives) ----
const QUERY = new Int32Array(256);
let taken = new Int32Array(64);
let takenN = 0;
/** (guard-ai polish B5) The covers earlier groups took this roles tick (`taken[0..takenBase)`): `assignRoles` starts
 *  from them, so two intruder groups are never handed the same free cover in one tick (covers are reserved only when a
 *  guard binds to one). */
let takenBase = 0;
let pickScore = -Infinity;

/** (guard-ai polish B5) Groups of one roles tick share their picks (`rolesTickStart`, `rolesCommit`). Undo: false (each
 *  `assignRoles` starts with nothing taken, the 4.97.1 rule). */
export const ROLES_SHARE_TAKEN = true;

/** (one-mover triage, e2e-stealth-ai 'squad roles' on 4.100.2) `roles`: with the point on a role bound, a member on one
 *  too is skipped for flank (both standard), so point and flank are never both on their way. Without it a reporter or
 *  overwatch still walking to his cover when the roles tick makes him flank (his call went through, or the scores
 *  moved) is a second mover beside the point, and the manager's hold has nobody left to hold. Undo: false. */
export const ONE_MOVER = { roles: true } as const;

/** (guard-ai polish B5) A new roles tick: no cover taken by any group yet. */
export function rolesTickStart(): void {
  takenBase = 0;
  takenN = 0;
}

/** (guard-ai polish B5) The last `assignRoles` is this group's final one: its picks stay taken for the next group of
 *  the tick. */
export function rolesCommit(): void {
  if (ROLES_SHARE_TAKEN) takenBase = takenN;
}

function isTaken(c: number): boolean {
  for (let k = 0; k < takenN; k++) if (taken[k] === c) return true;
  return false;
}

function take(c: number): void {
  if (c < 0) return;
  if (takenN >= taken.length) {
    const t = new Int32Array(taken.length * 2);
    t.set(taken);
    taken = t;
  }
  taken[takenN++] = c;
}

/** For tests: the scratch buffers (identity must not change across calls of the usual size). */
export function squadScratch(): { query: Int32Array; taken: Int32Array } {
  return { query: QUERY, taken };
}

/**
 * Best cover for member i in `role` (index, -1 none; score in `pickScore`). The cover he already holds scores without
 * the advance rule plus `stayBonus`. Flank (refX/refZ non-zero): the cover's bearing from the LKP must be >= 60 deg off
 * (refX, refZ).
 */
function pickBest(inp: RoleInput, i: number, role: number, refX: number, refZ: number): number {
  pickScore = -Infinity;
  const set = inp.cover;
  const grid = inp.grid;
  if (!set || !grid) return -1;
  const gx = inp.x[i]!;
  const gy = inp.y[i]!;
  const gz = inp.z[i]!;
  const me = inp.slot[i]!;
  const held = inp.inCover[i] ? inp.coverIdx[i]! : -1;
  const refL = hyp2(refX, refZ);
  const count = grid.query(gx, gz, roleReach(role), QUERY);
  let best = -1;
  for (let k = 0; k < count; k++) {
    const c = QUERY[k]!;
    const own = set.owner[c]!;
    const reserved = set.block[c] === 1 || (own >= 0 && own !== me) || isTaken(c);
    const cx = set.x[c]!;
    const cz = set.z[c]!;
    let s = scoreCore(cx, set.y[c]!, cz, set.nx[c]!, set.nz[c]!, set.low[c] === 1, gx, gy, gz, inp.lkpX, inp.lkpY, inp.lkpZ, role, reserved, c !== held);
    if (s === -Infinity) continue;
    if (role === R_FLANK && refL > 1e-4) {
      const bx = cx - inp.lkpX;
      const bz = cz - inp.lkpZ;
      const bl = hyp2(bx, bz);
      if (bl < 1e-4 || (bx * refX + bz * refZ) / (bl * refL) > FLANK_COS) continue;
    }
    if (c === held) s += SQUAD.stayBonus;
    if (s > pickScore || (s === pickScore && c < best)) {
      pickScore = s;
      best = c;
    }
  }
  return best;
}

/** `a` beats `b` on (weight desc, then key desc, then slot asc). */
function beats(w: number, key: number, slot: number, bw: number, bKey: number, bSlot: number): boolean {
  if (w !== bw) return w > bw;
  if (key !== bKey) return key > bKey;
  return slot < bSlot;
}

/** Wants to travel: has a cover to go to and is not already in it. */
function wantsCover(inp: RoleInput, out: RoleOutput, i: number): boolean {
  const c = out.cover[i]!;
  return c >= 0 && !(inp.inCover[i] === 1 && inp.coverIdx[i] === c);
}

/**
 * Roles for one group (`inp.n` members, clamped to the buffers' capacity) into `out` (same member indices). Pure,
 * deterministic (same input, same output; member order does not matter, ties to the lower slot), no allocation.
 */
export function assignRoles(inp: RoleInput, out: RoleOutput): void {
  const n = Math.min(inp.n, inp.cap, out.cap);
  out.point = out.overwatch = out.flank = out.reporter = -1;
  for (let i = 0; i < n; i++) {
    out.role[i] = R_NONE;
    out.cover[i] = -1;
    out.moving[i] = 0;
    out.run[i] = 0;
  }
  takenN = ROLES_SHARE_TAKEN ? takenBase : 0;
  if (n === 0) return;
  // a held reservation by a member stays his: covers other members hold are skipped through `owner`, not `taken`
  let aggressive = false;
  for (let i = 0; i < n; i++) if (inp.profile[i] === P_AGGRESSIVE) aggressive = true;

  // reporter: the caller
  for (let i = 0; i < n; i++) {
    if (inp.callerSlot < 0 || inp.slot[i] !== inp.callerSlot) continue;
    out.role[i] = R_REPORTER;
    out.reporter = i;
    const c = pickBest(inp, i, R_REPORTER, 0, 0);
    out.cover[i] = c;
    take(c);
    break;
  }

  // point: the nearest with a cover path toward the LKP (aggressive first; an aggressive guard may go without one)
  {
    let best = -1;
    let bw = -1;
    let bKey = -Infinity;
    let bSlot = 0;
    let bc = -1;
    for (let i = 0; i < n; i++) {
      if (out.role[i] !== R_NONE) continue;
      const p = profileOf(inp.profile[i]!);
      if (p.pointWeight <= 0) continue;
      const c = pickBest(inp, i, R_POINT, 0, 0);
      if (c < 0 && !p.runToContact) continue;
      const key = -hyp2(inp.lkpX - inp.x[i]!, inp.lkpZ - inp.z[i]!);
      if (best < 0 || beats(p.pointWeight, key, inp.slot[i]!, bw, bKey, bSlot)) {
        best = i;
        bw = p.pointWeight;
        bKey = key;
        bSlot = inp.slot[i]!;
        bc = c;
      }
    }
    if (best >= 0) {
      out.role[best] = R_POINT;
      out.point = best;
      out.cover[best] = bc;
      take(bc);
    }
  }

  const flankOk = n >= SQUAD.flankGroup;
  if (aggressive) {
    if (flankOk) pickFlank(inp, out, n);
    pickOverwatch(inp, out, n);
  } else {
    pickOverwatch(inp, out, n);
    if (flankOk) pickFlank(inp, out, n);
  }

  for (let i = 0; i < n; i++) if (out.role[i] === R_NONE) out.role[i] = R_SEARCH;

  // ---- moving mask ----
  const pt = out.point;
  const ow = out.overwatch;
  const fl = out.flank;
  for (let i = 0; i < n; i++) {
    const r = out.role[i]!;
    if (r === R_SEARCH) out.moving[i] = 1;
    else if (r === R_REPORTER || r === R_OVERWATCH) out.moving[i] = wantsCover(inp, out, i) ? 1 : 0;
  }
  const flWants = fl >= 0 && wantsCover(inp, out, fl);
  const flAggr = fl >= 0 && inp.profile[fl] === P_AGGRESSIVE;
  if (pt >= 0) {
    const ptAggr = inp.profile[pt] === P_AGGRESSIVE;
    const ptWants = out.cover[pt]! >= 0 ? wantsCover(inp, out, pt) : ptAggr;
    const owSet = ow < 0 || out.moving[ow] === 0;
    const flankFirst = flWants && inp.targetCoverT >= SQUAD.flankAfter;
    out.moving[pt] = ptWants && (owSet || ptAggr) && (!flankFirst || ptAggr) ? 1 : 0;
  }
  if (fl >= 0) out.moving[fl] = flWants && (pt < 0 || out.moving[pt] === 0 || flAggr || inp.profile[pt] === P_AGGRESSIVE) ? 1 : 0;
  for (let i = 0; i < n; i++) {
    out.run[i] = out.moving[i] === 1 && (out.cover[i]! >= 0 || profileOf(inp.profile[i]!).runToContact) ? 1 : 0;
  }
}

function pickOverwatch(inp: RoleInput, out: RoleOutput, n: number): void {
  let best = -1;
  let bw = -1;
  let bKey = -Infinity;
  let bSlot = 0;
  let bc = -1;
  for (let i = 0; i < n; i++) {
    if (out.role[i] !== R_NONE) continue;
    const w = profileOf(inp.profile[i]!).overwatchWeight;
    if (w <= 0) continue;
    const c = pickBest(inp, i, R_OVERWATCH, 0, 0);
    // key: has cover, then sees the target, then the cover score (bounded, so the tiers never mix)
    const key = (c >= 0 ? 2000 : 0) + (inp.seesTarget[i] ? 1000 : 0) + (c >= 0 ? Math.max(-999, Math.min(999, pickScore)) : 0);
    if (best < 0 || beats(w, key, inp.slot[i]!, bw, bKey, bSlot)) {
      best = i;
      bw = w;
      bKey = key;
      bSlot = inp.slot[i]!;
      bc = c;
    }
  }
  if (best < 0) return;
  out.role[best] = R_OVERWATCH;
  out.overwatch = best;
  out.cover[best] = bc;
  take(bc);
}

function pickFlank(inp: RoleInput, out: RoleOutput, n: number): void {
  // reference bearing from the LKP: the point's cover, else the point, else the group's centre
  let rx = 0;
  let rz = 0;
  const pt = out.point;
  const set = inp.cover;
  if (pt >= 0) {
    const pc = out.cover[pt]!;
    if (pc >= 0 && set) {
      rx = set.x[pc]! - inp.lkpX;
      rz = set.z[pc]! - inp.lkpZ;
    } else {
      rx = inp.x[pt]! - inp.lkpX;
      rz = inp.z[pt]! - inp.lkpZ;
    }
  } else {
    for (let i = 0; i < n; i++) {
      rx += inp.x[i]! - inp.lkpX;
      rz += inp.z[i]! - inp.lkpZ;
    }
  }
  if (hyp2(rx, rz) < 1e-4) return;
  // (one-mover triage) the point on his way: nobody else on his way is made the flank (standard pair only)
  const ptBound = ONE_MOVER.roles && pt >= 0 && inp.bound[pt] === 1 && inp.profile[pt] !== P_AGGRESSIVE;
  let best = -1;
  let bw = -1;
  let bKey = -Infinity;
  let bSlot = 0;
  let bc = -1;
  for (let i = 0; i < n; i++) {
    if (out.role[i] !== R_NONE) continue;
    if (ptBound && inp.bound[i] === 1 && inp.profile[i] !== P_AGGRESSIVE) continue;
    const w = profileOf(inp.profile[i]!).flankWeight;
    if (w <= 0) continue;
    const c = pickBest(inp, i, R_FLANK, rx, rz);
    if (c < 0) continue;
    if (best < 0 || beats(w, pickScore, inp.slot[i]!, bw, bKey, bSlot)) {
      best = i;
      bw = w;
      bKey = pickScore;
      bSlot = inp.slot[i]!;
      bc = c;
    }
  }
  if (best < 0) return;
  out.role[best] = R_FLANK;
  out.flank = best;
  out.cover[best] = bc;
  take(bc);
}

// ---- seeded combat RNG (replaces Math.random in combat; G143 keeps patrols free of any randomness) ----

/** mulberry32: a small, fast, seedable 32-bit generator. One per guard per incident; `reseed` reuses it. */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed | 0;
  }
  reseed(seed: number): void {
    this.s = seed | 0;
  }
  /** Uniform in [0, 1). */
  next(): number {
    const t0 = (this.s = (this.s + 0x6d2b79f5) | 0);
    let t = Math.imul(t0 ^ (t0 >>> 15), t0 | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Uniform in [a, b). */
  range(a: number, b: number): number {
    return a + this.next() * (b - a);
  }
}

export function mulberry32(seed: number): Rng {
  return new Rng(seed);
}

/**
 * Seed for one guard in one incident: `matchSeed ^ incidentId * 2654435761 ^ guardKey` (design section 8), finished
 * with the murmur3 avalanche so neighbouring guard keys get unrelated streams. Unsigned 32-bit.
 */
export function combatSeed(matchSeed: number, incidentId: number, guardKey: number): number {
  let h = (matchSeed ^ Math.imul(incidentId, 2654435761) ^ guardKey) | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** (guard-ai seed-random, hard rule 8) A replayable draw in [0, 1) for one-off jitters (radio delays, a drone's start
 *  angle): `combatSeed` of the same three keys over 2^32. Pure, allocates nothing. */
export function seeded01(matchSeed: number, stream: number, key: number): number {
  return combatSeed(matchSeed, stream, key) / 4294967296;
}

// Stream salts (`combatSeed`'s incident slot): negative, so they never collide with a real engagement id (counts up
// from 0).
/** (guard-ai seed-random) A guard's perception stream (`Enemy.senseRng`: the think cadence). */
export const SEED_SENSE = -1;
/** (guard-ai seed-random) Radio delay jitter (`EnemyManager` callAlert / shout), xor'd with the engagement. */
export const SEED_RADIO = -2;
/** (guard-ai seed-random) A recon drone's orbit start angle (`ReconDrone`). */
export const SEED_DRONE = -3;
