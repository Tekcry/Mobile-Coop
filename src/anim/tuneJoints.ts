/**
 * (tuner-v2 item 1) Per-joint rotation offsets per tuner state (pure, Babylon-free, no DOM): three angles in degrees per
 * joint (x = pitch, y = yaw, z = roll, the rig's `RotationYawPitchRoll` order), per body group of the tuner
 * (`BODY_GROUPS`). Every value defaults to 0 and a joint whose three values are 0 is never touched, so the default
 * output is bit-identical to the untuned rig.
 *
 * Hot path: `jointsBegin(group, dt)` (around the LOCAL player's `rig.animate`, like `tuneBegin`) eases the applied offsets
 * toward the group's row (`JOINT_EASE_TAU`, so a state change never snaps; settled values are exact, identity included);
 * `jointApply` multiplies a node's local rotation by the joint's applied offset quaternion (buffer lookup, no trig, no
 * allocation). Outside the window (remotes, guards, every other rig) `JOINTS_CUR.on` is false and nothing is touched.
 *
 * Mirror lock (`jointsMirror`): an edit to a left / right joint also writes its partner mirrored across the body's
 * sagittal plane. The rig's bones all rest at identity in the body frame (x right, y up, z forward), so the mirror of a
 * rotation keeps x (pitch) and negates y (yaw) and z (roll), as `mirrorKeyed` does for the keyed clips.
 *
 * Save / Export: additive key `joints` on the tuner's existing IndexedDB record and export (`jointsAttach`,
 * `jointsLoadFrom`); `tuneLoad` ignores unknown keys and a record without `joints` loads as all zero.
 */
import { BODY_GROUPS } from './tune';
import { JOINT_WEAPON_ROWS } from './tuneRows';

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

/** (marlow-bays T1a) The table's rows: every body state, then the per-gun rows of the armed states (`rifle.aim`, ...). */
export const JOINT_ROWS: readonly string[] = [...BODY_GROUPS, ...JOINT_WEAPON_ROWS];
const G = JOINT_ROWS.length;
const GROUP_INDEX = Object.fromEntries(JOINT_ROWS.map((g, i) => [g, i])) as Record<string, number>;

/** Degrees, [group][joint][axis] flat. The source of truth. */
const DEG = new Float64Array(G * JOINT_COUNT * 3);
/** The offset quaternions (x y z w), [group][joint] flat, rebuilt on every edit. */
const QUAT = new Float64Array(G * JOINT_COUNT * 4);
/** 1 when the joint has any non-zero angle. */
const LIVE = new Uint8Array(G * JOINT_COUNT);
for (let i = 0; i < G * JOINT_COUNT; i++) QUAT[i * 4 + 3] = 1;

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

function rebuild(slot: number): void {
  const d = slot * 3;
  const x = DEG[d]!;
  const y = DEG[d + 1]!;
  const z = DEG[d + 2]!;
  LIVE[slot] = x !== 0 || y !== 0 || z !== 0 ? 1 : 0;
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

/**
 * The applied offsets (x y z w per joint), eased toward the active state's row so a state change never snaps an offset
 * in (the arm hooks run after their `limitJoint`, so nothing else would smooth them). `CUR_LIVE` = not exact identity.
 */
const CUR = new Float64Array(JOINT_COUNT * 4);
const CUR_LIVE = new Uint8Array(JOINT_COUNT);
for (let j = 0; j < JOINT_COUNT; j++) CUR[j * 4 + 3] = 1;
let curAny = false;
/** The ease time constant (s): exponential, like the rig's `approachTo` 0.06 s (velocity / rest shift); ~95% in 0.18 s. */
export const JOINT_EASE_TAU = 0.06;
/** Within this (per component) of the target the current offset snaps to it exactly, so identity stays bit-exact. */
const SNAP_EPS = 1e-6;

function curReset(): void {
  for (let j = 0; j < JOINT_COUNT; j++) {
    const o = j * 4;
    CUR[o] = CUR[o + 1] = CUR[o + 2] = 0;
    CUR[o + 3] = 1;
    CUR_LIVE[j] = 0;
  }
  curAny = false;
}

/**
 * Before the LOCAL player's `rig.animate`: ease the applied offsets toward the state's row ('' = toward none) over `dt`
 * seconds (nlerp, `JOINT_EASE_TAU`; the default `Infinity` jumps straight to the row). No allocation.
 */
export function jointsBegin(group: string, dt = Number.POSITIVE_INFINITY): void {
  const g = group === '' ? undefined : GROUP_INDEX[group];
  const b = g === undefined ? -1 : g * JOINT_COUNT;
  JOINTS_CUR.on = false;
  if (!curAny) {
    // the common case: nothing applied, and nothing live in this row -> off, no work
    let any = false;
    if (b >= 0) for (let j = 0; j < JOINT_COUNT; j++) if (LIVE[b + j] === 1) any = true;
    if (!any) return;
  }
  const k = dt > 0 ? 1 - Math.exp(-dt / JOINT_EASE_TAU) : 0;
  curAny = false;
  for (let j = 0; j < JOINT_COUNT; j++) {
    const o = j * 4;
    let tx = 0;
    let ty = 0;
    let tz = 0;
    let tw = 1;
    if (b >= 0 && LIVE[b + j] === 1) {
      const t = (b + j) * 4;
      tx = QUAT[t]!;
      ty = QUAT[t + 1]!;
      tz = QUAT[t + 2]!;
      tw = QUAT[t + 3]!;
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
  JOINTS_CUR.on = curAny;
}

/** After the local player's `rig.animate`. */
export function jointsEnd(): void {
  JOINTS_CUR.on = false;
}

/** A writable quaternion (Babylon's `Quaternion` fits). */
export interface QuatLike {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Apply joint `joint`'s offset to a node's local rotation `q`: `parent` false = in the joint's own frame (q * off),
 * true = in the parent's frame (off * q; the shoulders, which share the arm's node with the upper arms). Returns false
 * and leaves `q` untouched when the window is off or the joint has no offset. No allocation.
 */
export function jointApply(q: QuatLike, joint: number, parent = false): boolean {
  if (!JOINTS_CUR.on) return false;
  if (CUR_LIVE[joint] !== 1) return false;
  const o = joint * 4;
  mulInto(q, CUR[o]!, CUR[o + 1]!, CUR[o + 2]!, CUR[o + 3]!, parent);
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
  curReset(); // a load jumps (no ease from the old values)
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
