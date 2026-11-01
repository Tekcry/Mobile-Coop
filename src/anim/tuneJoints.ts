/**
 * (tuner-v2 item 1) Per-joint rotation offsets per tuner state (pure, Babylon-free, no DOM): three angles in degrees per
 * joint (x = pitch, y = yaw, z = roll, the rig's `RotationYawPitchRoll` order), per body group of the tuner
 * (`BODY_GROUPS`). Every value defaults to 0 and a joint whose three values are 0 is never touched, so the default
 * output is bit-identical to the untuned rig.
 *
 * (anim-joints J1) Base and delta: the table here is the tuner's DELTA (what the panel edits, saves and exports); the
 * generated base table `animBase.ts` (baked exports) sits under it. The EFFECTIVE row applied is base + delta per axis
 * in degrees, wrapped to -180..180 (`wrapDeg`), its quaternion built from that sum (so a bake is exact); rebuilt on an
 * edit or a load, never per frame.
 *
 * Hot path: each Wren rig (`CharacterRig.tuneRows`) owns a `JointsRigState` and opens its window inside its own
 * `animate` (`jointsBeginRig`, via `tuneJointsRig.ts`): the rig's applied offsets ease toward its row's effective values
 * (`JOINT_EASE_TAU`, so a state change never snaps; settled values are exact, identity included); `jointApply`
 * multiplies a node's local rotation by the open rig's applied offset quaternion (buffer lookup, no trig, no
 * allocation). Outside a window (guards, the VIP, every non-Wren rig) `JOINTS_CUR.on` is false and nothing is touched.
 * `jointsBegin(group, dt)` opens the module's own state (tests, tools).
 *
 * Mirror lock (`jointsMirror`): an edit to a left / right joint also writes its partner mirrored across the body's
 * sagittal plane. The rig's bones all rest at identity in the body frame (x right, y up, z forward), so the mirror of a
 * rotation keeps x (pitch) and negates y (yaw) and z (roll), as `mirrorKeyed` does for the keyed clips.
 *
 * Save / Export: additive key `joints` on the tuner's existing IndexedDB record and export (`jointsAttach`,
 * `jointsLoadFrom`); `tuneLoad` ignores unknown keys and a record without `joints` loads as all zero.
 */
import { ANIM_BASE } from './animBase';
import { BODY_GROUPS } from './tune';
import { JOINT_WEAPON_ROWS } from './tuneRows';
import { TUNE_MOVE_ROW_IDS } from './tuneMoveRows';

export const JOINTS = [
  'pelvis',
  'spine',
  'chest',
  'neck',
  'head',
  'shoulderL',
  'shoulderR',
  'upperArmL',
  'upperArmR',
  'elbowL',
  'elbowR',
  'wristL',
  'wristR',
  'hipL',
  'hipR',
  'kneeL',
  'kneeR',
  'ankleL',
  'ankleR',
  'toeL',
  'toeR',
  // (anim-skeleton S4) the clavicles (the rig's clavL / clavR nodes, chest frame: a shrug, a shoulder pushed forward),
  // appended so every older joint keeps its index
  'clavicleL',
  'clavicleR',
] as const;
export type Joint = (typeof JOINTS)[number];
/** Joint index by name (the rig hook passes these). */
export const J = Object.freeze(Object.fromEntries(JOINTS.map((j, i) => [j, i]))) as Readonly<Record<Joint, number>>;
export const JOINT_COUNT = JOINTS.length;
export const JOINT_AXES = ['x', 'y', 'z'] as const;
export type JointAxis = 0 | 1 | 2;
/** The edit range and nudge step (degrees). */
export const JOINT_RANGE = { min: -180, max: 180, step: 0.5 } as const;

/** Each joint's mirror partner (itself for the centre line). */
export const MIRROR_OF: readonly number[] = JOINTS.map((j) => {
  const e = j[j.length - 1];
  if (e !== 'L' && e !== 'R') return J[j];
  return J[(j.slice(0, -1) + (e === 'L' ? 'R' : 'L')) as Joint];
});
/** The mirror's sign per axis: pitch kept, yaw and roll flipped. */
export const MIRROR_SIGN: readonly number[] = [1, -1, -1];

/**
 * (marlow-bays T1a) The table's rows: every body state, then the per-gun rows of the armed states (`rifle.aim`, ...);
 * (anim-joints J2) then the move and action rows (`trav.vault`, `team.boost.b`, `reload`, ...: `tuneMoveRows.ts`).
 */
export const JOINT_ROWS: readonly string[] = [...BODY_GROUPS, ...JOINT_WEAPON_ROWS, ...TUNE_MOVE_ROW_IDS];
const G = JOINT_ROWS.length;
const GROUP_INDEX = Object.fromEntries(JOINT_ROWS.map((g, i) => [g, i])) as Record<string, number>;

/** The tuner's delta, degrees, [group][joint][axis] flat. The source of truth of the panel. */
const DEG = new Float64Array(G * JOINT_COUNT * 3);
/** (J1) The base table's degrees (`animBase.ts`), same layout. */
const BASE = new Float64Array(G * JOINT_COUNT * 3);
/** The EFFECTIVE offset quaternions (x y z w, base + delta), [group][joint] flat, rebuilt on every edit or load. */
const QUAT = new Float64Array(G * JOINT_COUNT * 4);
/** 1 when the joint's delta has any non-zero angle (the panel's "changed", the snapshot). */
const LIVE = new Uint8Array(G * JOINT_COUNT);
/** (J1) 1 when the joint's effective offset (base + delta) is not identity (the hot path). */
const ELIVE = new Uint8Array(G * JOINT_COUNT);
for (let i = 0; i < G * JOINT_COUNT; i++) QUAT[i * 4 + 3] = 1;
/** (J1) Bumped by every load (delta or base): each rig's applied offsets jump (no ease from the old values). */
let loadGen = 0;

let mirror = false;

/** The hot-path window: `on` only inside `jointsBegin` .. `jointsEnd` while an (eased) offset is applied. */
export const JOINTS_CUR = { on: false };

/** The panel's change hook (save, redraw); fired after every edit. */
export const JOINTS_HOOKS: { changed: (() => void) | null } = { changed: null };

const D2R = Math.PI / 180;

/** Babylon `Quaternion.RotationYawPitchRoll(yaw = y, pitch = x, roll = z)`, radians, into `out` at `o`. */
export function eulerQuat(x: number, y: number, z: number, out: Float64Array, o: number): void {
  const sr = Math.sin(z * 0.5);
  const cr = Math.cos(z * 0.5);
  const sp = Math.sin(x * 0.5);
  const cp = Math.cos(x * 0.5);
  const sy = Math.sin(y * 0.5);
  const cy = Math.cos(y * 0.5);
  out[o] = cy * sp * cr + sy * cp * sr;
  out[o + 1] = sy * cp * cr - cy * sp * sr;
  out[o + 2] = cy * cp * sr - sy * sp * cr;
  out[o + 3] = cy * cp * cr + sy * sp * sr;
}

function gi(group: string): number {
  const i = GROUP_INDEX[group];
  if (i === undefined) throw new Error(`tuneJoints: unknown group ${group}`);
  return i;
}

/** (J1) Degrees wrapped into -180..180 (inside it unchanged; no -0). */
export function wrapDeg(v: number): number {
  const w = v > 180 || v < -180 ? v - 360 * Math.round(v / 360) : v;
  return w + 0;
}

function rebuild(slot: number): void {
  const d = slot * 3;
  LIVE[slot] = DEG[d] !== 0 || DEG[d + 1] !== 0 || DEG[d + 2] !== 0 ? 1 : 0;
  const x = wrapDeg(BASE[d]! + DEG[d]!);
  const y = wrapDeg(BASE[d + 1]! + DEG[d + 1]!);
  const z = wrapDeg(BASE[d + 2]! + DEG[d + 2]!);
  ELIVE[slot] = x !== 0 || y !== 0 || z !== 0 ? 1 : 0;
  eulerQuat(x * D2R, y * D2R, z * D2R, QUAT, slot * 4);
}

function clampDeg(v: number): number {
  return Math.max(JOINT_RANGE.min, Math.min(JOINT_RANGE.max, v));
}

/** Write one axis (no mirror, no hook); true if it changed. */
function put(g: number, joint: number, axis: number, v: number): boolean {
  const slot = g * JOINT_COUNT + joint;
  const d = slot * 3 + axis;
  if (DEG[d] === v) return false;
  DEG[d] = v;
  rebuild(slot);
  return true;
}

// ------------------------------------------------------------------------------------------
// The panel API (not hot)
// ------------------------------------------------------------------------------------------

export function jointsGet(group: string, joint: number, axis: JointAxis): number {
  return DEG[(gi(group) * JOINT_COUNT + joint) * 3 + axis]!;
}

/**
 * Set one axis of one joint in one state (degrees, clamped to `JOINT_RANGE`, a non-finite value is refused). With the
 * mirror lock on, a left / right joint's partner takes the mirrored value. Returns true if anything changed.
 */
export function jointsSet(group: string, joint: number, axis: JointAxis, deg: number): boolean {
  if (!Number.isFinite(deg) || joint < 0 || joint >= JOINT_COUNT) return false;
  const g = gi(group);
  const v = clampDeg(deg);
  let ch = put(g, joint, axis, v);
  const m = MIRROR_OF[joint]!;
  if (mirror && m !== joint) ch = put(g, m, axis, v * MIRROR_SIGN[axis]! + 0) || ch;
  if (ch) JOINTS_HOOKS.changed?.();
  return ch;
}

/** One joint's three axes back to 0 (and its partner with the mirror lock on). */
export function jointsReset(group: string, joint: number): void {
  for (let a = 0; a < 3; a++) jointsSet(group, joint, a as JointAxis, 0);
}

export function jointsResetGroup(group: string): void {
  const g = gi(group);
  let ch = false;
  for (let j = 0; j < JOINT_COUNT; j++) for (let a = 0; a < 3; a++) ch = put(g, j, a, 0) || ch;
  if (ch) JOINTS_HOOKS.changed?.();
}

export function jointsResetAll(): void {
  let ch = false;
  for (let g = 0; g < G; g++) for (let j = 0; j < JOINT_COUNT; j++) for (let a = 0; a < 3; a++) ch = put(g, j, a, 0) || ch;
  if (ch) JOINTS_HOOKS.changed?.();
}

/** The mirror lock: read it, or set it with `on`. Turning it on does not rewrite existing values. */
export function jointsMirror(on?: boolean): boolean {
  if (on !== undefined && on !== mirror) {
    mirror = on;
    JOINTS_HOOKS.changed?.();
  }
  return mirror;
}

export function jointChanged(group: string, joint: number): boolean {
  return LIVE[gi(group) * JOINT_COUNT + joint] === 1;
}

export function jointsGroupChanged(group: string): boolean {
  const b = gi(group) * JOINT_COUNT;
  for (let j = 0; j < JOINT_COUNT; j++) if (LIVE[b + j] === 1) return true;
  return false;
}

// ------------------------------------------------------------------------------------------
// Hot path
// ------------------------------------------------------------------------------------------

/** The ease time constant (s): exponential, like the rig's `approachTo` 0.06 s (velocity / rest shift); ~95% in 0.18 s. */
export const JOINT_EASE_TAU = 0.06;
/** Within this (per component) of the target the current offset snaps to it exactly, so identity stays bit-exact. */
const SNAP_EPS = 1e-6;

/**
 * (J1) One rig's applied offsets (x y z w per joint), eased toward its row so a state change never snaps an offset in
 * (the arm hooks run after their `limitJoint`, so nothing else would smooth them). `live` per joint = not exact
 * identity. Allocated once per rig (`jointsRigState`).
 */
export interface JointsRigState {
  readonly cur: Float64Array;
  readonly live: Uint8Array;
  any: boolean;
  gen: number;
  /** The row this rig picked last (index into `JOINT_ROWS`, -1 none). */
  row: number;
}

export function jointsRigState(): JointsRigState {
  const cur = new Float64Array(JOINT_COUNT * 4);
  for (let j = 0; j < JOINT_COUNT; j++) cur[j * 4 + 3] = 1;
  return { cur, live: new Uint8Array(JOINT_COUNT), any: false, gen: loadGen, row: -1 };
}

function stateReset(st: JointsRigState): void {
  const c = st.cur;
  for (let j = 0; j < JOINT_COUNT; j++) {
    const o = j * 4;
    c[o] = c[o + 1] = c[o + 2] = 0;
    c[o + 3] = 1;
    st.live[j] = 0;
  }
  st.any = false;
  st.gen = loadGen;
}

/** The module's own state (`jointsBegin`: tests and tools). */
const OWN = jointsRigState();
/** The state of the open window (`jointApply` reads it). */
let act: JointsRigState = OWN;

/** (J1) A Joints row's index ('' or unknown: -1). Not hot. */
export function jointRowIndex(row: string): number {
  return row === '' ? -1 : (GROUP_INDEX[row] ?? -1);
}

/**
 * The module's own window (tests, tools): ease toward the state's row ('' = toward none) over `dt` seconds (the default
 * `Infinity` jumps straight to the row). No allocation.
 */
export function jointsBegin(group: string, dt = Number.POSITIVE_INFINITY): void {
  jointsBeginRig(OWN, jointRowIndex(group), dt);
}

/**
 * (J1) Before a rig's own `animate`: ease `st`'s applied offsets toward row `g`'s effective values (-1 = toward none)
 * over `dt` seconds (nlerp, `JOINT_EASE_TAU`) and open the window on `st`. Nothing applied and nothing live in the row:
 * the window stays off, no work. No allocation.
 */
export function jointsBeginRig(st: JointsRigState, g: number, dt: number): void {
  jointsBeginRigRows(st, g, NO_ROWS, NO_W, 0, dt);
}

const NO_ROWS = new Int16Array(0);
const NO_W = new Float64Array(0);

/** (J2) A move row's weight at or above this applies the row as is (no nlerp, no normalise: exact). */
const W_FULL = 1;

/** (J2) Whether row `g` (index into `JOINT_ROWS`, -1 none) has any effective offset. */
function rowLive(g: number): boolean {
  if (g < 0 || g >= G) return false;
  const b = g * JOINT_COUNT;
  for (let j = 0; j < JOINT_COUNT; j++) if (ELIVE[b + j] === 1) return true;
  return false;
}

/**
 * (anim-joints J2, A5) `jointsBeginRig` with up to `n` move / action rows over the stance row `g`: each joint's target
 * is stance x nlerp(identity, move, w) for each move row in turn (`rows[k]` an index into `JOINT_ROWS`, `w[k]` 0..1;
 * a stance of -1 is identity, so a traversal move's row applies over identity). Only the rows with an offset on the
 * joint take part, so with no move row (or none live) the target is the stance row's quaternion exactly, as in J1. The
 * rig's applied offsets then ease toward the target as before. No allocation.
 */
export function jointsBeginRigRows(st: JointsRigState, g: number, rows: ArrayLike<number>, w: ArrayLike<number>, n: number, dt: number): void {
  const b = g < 0 || g >= G ? -1 : g * JOINT_COUNT;
  JOINTS_CUR.on = false;
  st.row = b < 0 ? -1 : g;
  if (st.gen !== loadGen) stateReset(st);
  // the move rows with an offset and a weight (their table bases; -1 skipped)
  let mn = 0;
  for (let m = 0; m < n; m++) {
    const r = rows[m]!;
    const lw = w[m]!;
    if (lw > 0 && rowLive(r)) mn++;
  }
  if (!st.any && mn === 0) {
    // the common case: nothing applied, and nothing live in these rows -> off, no work
    if (!rowLive(b < 0 ? -1 : g)) return;
  }
  const CUR = st.cur;
  const CUR_LIVE = st.live;
  // (J1) dt 0 (a frozen game: the tuner's Pause, the chamber's pause) = at once, as the registry's sections
  const k = dt > 0 ? 1 - Math.exp(-dt / JOINT_EASE_TAU) : 1;
  let curAny = false;
  for (let j = 0; j < JOINT_COUNT; j++) {
    const o = j * 4;
    let tx = 0;
    let ty = 0;
    let tz = 0;
    let tw = 1;
    let ident = true;
    if (b >= 0 && ELIVE[b + j] === 1) {
      const t = (b + j) * 4;
      tx = QUAT[t]!;
      ty = QUAT[t + 1]!;
      tz = QUAT[t + 2]!;
      tw = QUAT[t + 3]!;
      ident = false;
    }
    if (mn > 0) {
      for (let m = 0; m < n; m++) {
        const r = rows[m]!;
        const lw = w[m]!;
        if (!(lw > 0) || r < 0 || r >= G || ELIVE[r * JOINT_COUNT + j] !== 1) continue;
        const q = (r * JOINT_COUNT + j) * 4;
        let nx = QUAT[q]!;
        let ny = QUAT[q + 1]!;
        let nz = QUAT[q + 2]!;
        let nw = QUAT[q + 3]!;
        if (lw < W_FULL) {
          // nlerp(identity, move, w), shortest arc
          const s = nw < 0 ? -lw : lw;
          nx *= s;
          ny *= s;
          nz *= s;
          nw = nw * s + (1 - lw);
          const l = Math.sqrt(nx * nx + ny * ny + nz * nz + nw * nw) || 1;
          nx /= l;
          ny /= l;
          nz /= l;
          nw /= l;
        }
        if (ident) {
          tx = nx;
          ty = ny;
          tz = nz;
          tw = nw;
          ident = false;
        } else {
          // target = target x n (Hamilton), normalised
          const x = tw * nx + tx * nw + ty * nz - tz * ny;
          const y = tw * ny - tx * nz + ty * nw + tz * nx;
          const z = tw * nz + tx * ny - ty * nx + tz * nw;
          const ww = tw * nw - tx * nx - ty * ny - tz * nz;
          const l = Math.sqrt(x * x + y * y + z * z + ww * ww) || 1;
          tx = x / l;
          ty = y / l;
          tz = z / l;
          tw = ww / l;
        }
      }
    }
    let cx = CUR[o]!;
    let cy = CUR[o + 1]!;
    let cz = CUR[o + 2]!;
    let cw = CUR[o + 3]!;
    if (cx === tx && cy === ty && cz === tz && cw === tw) {
      // settled (identity included): nothing to do
    } else {
      if (cx * tx + cy * ty + cz * tz + cw * tw < 0) {
        tx = -tx;
        ty = -ty;
        tz = -tz;
        tw = -tw;
      }
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;
      cz += (tz - cz) * k;
      cw += (tw - cw) * k;
      if (Math.abs(tx - cx) < SNAP_EPS && Math.abs(ty - cy) < SNAP_EPS && Math.abs(tz - cz) < SNAP_EPS && Math.abs(tw - cw) < SNAP_EPS) {
        cx = tx;
        cy = ty;
        cz = tz;
        cw = tw;
      } else {
        const l = Math.sqrt(cx * cx + cy * cy + cz * cz + cw * cw) || 1;
        cx /= l;
        cy /= l;
        cz /= l;
        cw /= l;
      }
      CUR[o] = cx;
      CUR[o + 1] = cy;
      CUR[o + 2] = cz;
      CUR[o + 3] = cw;
    }
    // a sign-flipped target (-identity) is the same rotation: treat it as identity
    const live = cx === 0 && cy === 0 && cz === 0 && (cw === 1 || cw === -1) ? 0 : 1;
    if (!live) {
      CUR[o] = CUR[o + 1] = CUR[o + 2] = 0;
      CUR[o + 3] = 1;
    }
    CUR_LIVE[j] = live;
    if (live) curAny = true;
  }
  st.any = curAny;
  act = st;
  JOINTS_CUR.on = curAny;
}

/** After the rig's `animate` (closes whichever window is open). */
export function jointsEnd(): void {
  JOINTS_CUR.on = false;
}

/**
 * (item 24, track A) Open the window on a rig state whose applied offsets another table eased (a guard rig: the guard
 * table of `tuneGuard.ts`, never this module's Wren rows). On only while `st` has a live offset. Close with
 * `jointsEnd`. No allocation.
 */
export function jointsOpen(st: JointsRigState): void {
  act = st;
  JOINTS_CUR.on = st.any;
}

/** A writable quaternion (Babylon's `Quaternion` fits). */
export interface QuatLike {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Apply joint `joint`'s offset (the open window's rig) to a node's local rotation `q`: `parent` false = in the joint's
 * own frame (q * off), true = in the parent's frame (off * q; the shoulders, which share the arm's node with the upper
 * arms). Returns false and leaves `q` untouched when the window is off or the joint has no offset. No allocation.
 */
export function jointApply(q: QuatLike, joint: number, parent = false): boolean {
  if (!JOINTS_CUR.on) return false;
  const st = act;
  if (st.live[joint] !== 1) return false;
  const o = joint * 4;
  const c = st.cur;
  mulInto(q, c[o]!, c[o + 1]!, c[o + 2]!, c[o + 3]!, parent);
  return true;
}

/** q = q * b (or b * q with `pre`), Hamilton x y z w, normalised. */
export function mulInto(q: QuatLike, bx: number, by: number, bz: number, bw: number, pre: boolean): void {
  let ax = q.x;
  let ay = q.y;
  let az = q.z;
  let aw = q.w;
  if (pre) {
    const tx = ax;
    const ty = ay;
    const tz = az;
    const tw = aw;
    ax = bx;
    ay = by;
    az = bz;
    aw = bw;
    bx = tx;
    by = ty;
    bz = tz;
    bw = tw;
  }
  const x = aw * bx + ax * bw + ay * bz - az * by;
  const y = aw * by - ax * bz + ay * bw + az * bx;
  const z = aw * bz + ax * by - ay * bx + az * bw;
  const w = aw * bw - ax * bx - ay * by - az * bz;
  const l = Math.sqrt(x * x + y * y + z * z + w * w) || 1;
  q.x = x / l;
  q.y = y / l;
  q.z = z / l;
  q.w = w / l;
}

// ------------------------------------------------------------------------------------------
// Save / Export (additive key `joints` on the tuner's record)
// ------------------------------------------------------------------------------------------

export interface JointsSnapshot {
  version: 1;
  mirror: boolean;
  /** Only the non-zero joints: group -> joint name -> [x, y, z] degrees. */
  values: Record<string, Record<string, [number, number, number]>>;
}

export function jointsSnapshot(): JointsSnapshot {
  const values: JointsSnapshot['values'] = {};
  for (let g = 0; g < G; g++) {
    for (let j = 0; j < JOINT_COUNT; j++) {
      const slot = g * JOINT_COUNT + j;
      if (LIVE[slot] !== 1) continue;
      const d = slot * 3;
      (values[JOINT_ROWS[g]!] ??= {})[JOINTS[j]!] = [DEG[d]!, DEG[d + 1]!, DEG[d + 2]!];
    }
  }
  return { version: 1, mirror, values };
}

/** Load a snapshot: every value back to 0 first; unknown groups / joints and bad numbers are skipped. No hook. */
export function jointsLoad(s: unknown): void {
  for (let i = 0; i < DEG.length; i++) DEG[i] = 0;
  for (let i = 0; i < LIVE.length; i++) rebuild(i);
  loadGen++; // a load jumps (no ease from the old values), on every rig
  mirror = false;
  if (!s || typeof s !== 'object') return;
  const snap = s as Partial<JointsSnapshot>;
  mirror = snap.mirror === true;
  const vals = snap.values;
  if (!vals || typeof vals !== 'object') return;
  for (const [gName, row] of Object.entries(vals)) {
    const g = GROUP_INDEX[gName];
    if (g === undefined || !row || typeof row !== 'object') continue;
    for (const [jName, v] of Object.entries(row)) {
      const j = J[jName as Joint];
      if (j === undefined || !Array.isArray(v)) continue;
      for (let a = 0; a < 3; a++) {
        const n: unknown = v[a];
        if (typeof n === 'number' && Number.isFinite(n)) put(g, j, a, clampDeg(n));
      }
    }
  }
}

/**
 * The tuner record (its IndexedDB snapshot or its export) with `joints` added when any joint is offset or the mirror
 * lock is on; otherwise the record is returned unchanged, so an untouched save stays exactly as today.
 */
export function jointsAttach<T extends object>(rec: T): T & { joints?: JointsSnapshot } {
  const s = jointsSnapshot();
  if (!s.mirror && Object.keys(s.values).length === 0) return rec;
  return { ...rec, joints: s };
}

/** Load the `joints` key of a tuner record (a record without it, an old save, loads as all zero). */
export function jointsLoadFrom(rec: unknown): void {
  jointsLoad(rec && typeof rec === 'object' ? (rec as { joints?: unknown }).joints : undefined);
}

// ------------------------------------------------------------------------------------------
// (anim-joints J1) The base table (`animBase.ts`): loaded at start, or by the dev hook
// ------------------------------------------------------------------------------------------

/**
 * Load the base table's joints (row -> joint name -> [x, y, z] degrees): every base value back to 0 first, then the
 * known rows and joints (by name); the effective rows are rebuilt and every rig jumps. Returns the unknown `row` /
 * `row.joint` names (skipped).
 */
export function jointsBaseLoad(joints: unknown): string[] {
  const unknown: string[] = [];
  BASE.fill(0);
  if (joints && typeof joints === 'object') {
    for (const [rName, row] of Object.entries(joints as Record<string, unknown>)) {
      const g = GROUP_INDEX[rName];
      if (g === undefined || !row || typeof row !== 'object') {
        unknown.push(rName);
        continue;
      }
      for (const [jName, v] of Object.entries(row as Record<string, unknown>)) {
        const j = (J as Record<string, number | undefined>)[jName];
        if (j === undefined || !Array.isArray(v)) {
          unknown.push(`${rName}.${jName}`);
          continue;
        }
        for (let a = 0; a < 3; a++) {
          const n: unknown = v[a];
          if (typeof n === 'number' && Number.isFinite(n)) BASE[(g * JOINT_COUNT + j) * 3 + a] = wrapDeg(n);
        }
      }
    }
  }
  for (let i = 0; i < LIVE.length; i++) rebuild(i);
  loadGen++;
  return unknown;
}

/** The base table's value of one axis (degrees). */
export function jointsBaseGet(group: string, joint: number, axis: JointAxis): number {
  return BASE[(gi(group) * JOINT_COUNT + joint) * 3 + axis]!;
}

/** The effective value of one axis (base + delta, wrapped; degrees): what every Wren rig applies. */
export function jointsEffective(group: string, joint: number, axis: JointAxis): number {
  const d = (gi(group) * JOINT_COUNT + joint) * 3 + axis;
  return wrapDeg(BASE[d]! + DEG[d]!);
}

/** True when any row has an effective offset (base or delta). Not hot. */
export function jointsAnyLive(): boolean {
  for (let i = 0; i < ELIVE.length; i++) if (ELIVE[i] === 1) return true;
  return false;
}

{
  const bad = jointsBaseLoad(ANIM_BASE.joints);
  if (bad.length) console.warn(`animBase: unknown Joints rows / joints skipped: ${bad.join(', ')}`);
}
