/**
 * (anim-gear, marlow-bays item 22, G-A1..G-A3) Gear offsets: per worn-gear socket a position (x / y / z, metres) and a
 * turn (pitch / yaw / roll, degrees) in the socket's own frame, with a crouched variant applied over the standing one by
 * the rig's crouch amount (0..1). Pure, Babylon-free (plain Node loads it: the bake's catalogue).
 *
 * Sockets (`GEAR_SOCKETS`):
 * - `holster`: the sidearm on the right thigh (`CharacterRig.thighMount`, Wren's WREN_HOLSTER, or the generic thigh slot);
 * - `backL` / `backC` / `backR`: the long guns on the back (`CharacterRig.backMount` slots, the diagonal centre sling);
 * - `slingHip`: the rig's `slingHip` node (the belt's sling socket) and the compact gun on the left-hip sling;
 * - `slingBack`: the rig's `slingBack` node (the back plate's sling anchor);
 * (No pouches socket: on Wren her own kit draws the grenade pouches and the GrenadePouches meshes are hidden, so a
 * pouches slider would move nothing; orchestrator 2026-10-22: dropped until the kit's pouches can move.)
 * A gun socket's frame is the gun's own frame in its slot (x its right side, y its top, z along the bore toward the
 * muzzle) and it turns about the slot's pivot (the holster's weapon point, the back stud, the grip on the diagonal
 * sling, the sling's stock-end pivot); a node socket's frame is its parent's (x right, y up, z forward), about the node.
 *
 * Tables: the base table (`ANIM_BASE.gear`, row -> param id -> value; offsets add) plus the tuner's deltas (the Gear
 * section, `tuneV2Sections.ts`) = the effective table every Wren rig reads (`GearRigState`, inside `tuneRigBegin`).
 * Visual only (G-A3): nothing gameplay reads moves. Nothing live (empty base, zero deltas): no work, nothing touched.
 */
import { ANIM_BASE } from './animBase';
import { eulerQuat, wrapDeg } from './tuneJoints';

export const GEAR_SOCKETS = ['holster', 'backL', 'backC', 'backR', 'slingBack', 'slingHip'] as const;
export type GearSocket = (typeof GEAR_SOCKETS)[number];
export const GEAR_SOCKET_COUNT = GEAR_SOCKETS.length;
/** Socket index by id. */
export const GS = Object.freeze(Object.fromEntries(GEAR_SOCKETS.map((s, i) => [s, i]))) as Readonly<Record<GearSocket, number>>;

/** The params, index order: the position (m), then the turn (deg). */
export const GEAR_PARAMS = [
  { id: 'x', label: 'x (socket right, m)', unit: 'm' },
  { id: 'y', label: 'y (socket up / gun top, m)', unit: 'm' },
  { id: 'z', label: 'z (socket forward / along the bore, m)', unit: 'm' },
  { id: 'pitch', label: 'pitch (about x, deg)', unit: 'deg' },
  { id: 'yaw', label: 'yaw (about y, deg)', unit: 'deg' },
  { id: 'roll', label: 'roll (about z, deg)', unit: 'deg' },
] as const;
export const GEAR_PARAM_COUNT = 6;
/** Param index by id. */
export const GP: Readonly<Record<string, number>> = Object.freeze(Object.assign(Object.create(null) as Record<string, number>, Object.fromEntries(GEAR_PARAMS.map((p, i) => [p.id, i]))));
export const GEAR_RANGE_M = { min: -0.1, max: 0.1, step: 0.001 } as const;
export const GEAR_RANGE_DEG = { min: -45, max: 45, step: 0.5 } as const;

/** The rows: each socket standing, then each crouched variant (`holster.crouch`). */
export const GEAR_ROWS: readonly string[] = [...GEAR_SOCKETS, ...GEAR_SOCKETS.map((s) => `${s}.crouch`)];
const ROW_INDEX: Readonly<Record<string, number>> = Object.assign(Object.create(null) as Record<string, number>, Object.fromEntries(GEAR_ROWS.map((r, i) => [r, i])));
const N = GEAR_ROWS.length * GEAR_PARAM_COUNT;

const DELTA = new Float64Array(N);
const BASE = new Float64Array(N);
const EFF = new Float64Array(N);
/** Bumped on every change of the effective table (the rigs recompose). */
let gen = 0;
let anyLive = false;

/** A carry slot's socket (`carrySlots.ts` CarrySlot: thigh, backL / backC / backR, sling), -1 none. */
export function gearSocketOfSlot(slot: string): number {
  return slot === 'thigh' ? 0 : slot === 'backL' ? 1 : slot === 'backC' ? 2 : slot === 'backR' ? 3 : slot === 'sling' ? 5 : -1;
}

export function gearRowIndex(row: string): number {
  const i = ROW_INDEX[row];
  if (i === undefined) throw new Error(`tuneGear: unknown row ${row}`);
  return i;
}

function compose(i: number): boolean {
  const s = BASE[i]! + DELTA[i]!;
  const v = i % GEAR_PARAM_COUNT < 3 ? s + 0 : wrapDeg(s);
  if (v === EFF[i]) return false;
  EFF[i] = v;
  return true;
}

function refresh(): void {
  gen++;
  anyLive = false;
  for (let i = 0; i < N; i++)
    if (EFF[i] !== 0) {
      anyLive = true;
      return;
    }
}

/** The tuner's delta of one param (m or deg). */
export function gearGet(row: string, p: number): number {
  return DELTA[gearRowIndex(row) * GEAR_PARAM_COUNT + p]!;
}

/** Set the tuner's delta of one param; true when the effective value changed. No allocation. */
export function gearSet(row: string, p: number, v: number): boolean {
  const i = gearRowIndex(row) * GEAR_PARAM_COUNT + p;
  if (!Number.isFinite(v) || DELTA[i] === v) return false;
  DELTA[i] = v;
  if (!compose(i)) return false;
  refresh();
  return true;
}

/** Every tuner delta back to 0. */
export function gearResetAll(): void {
  DELTA.fill(0);
  let ch = false;
  for (let i = 0; i < N; i++) if (compose(i)) ch = true;
  if (ch) refresh();
}

/**
 * Load the base table's gear (row -> param id -> value): every base value back to 0, then the known rows and params; the
 * rigs recompose. Returns the unknown `row` / `row.param` names (skipped).
 */
export function gearBaseLoad(gear: unknown): string[] {
  const unknown: string[] = [];
  BASE.fill(0);
  if (gear && typeof gear === 'object') {
    for (const [r, row] of Object.entries(gear as Record<string, unknown>)) {
      const g = ROW_INDEX[r];
      if (g === undefined || !row || typeof row !== 'object') {
        unknown.push(r);
        continue;
      }
      for (const [id, v] of Object.entries(row as Record<string, unknown>)) {
        const p = GP[id];
        if (p === undefined || typeof v !== 'number' || !Number.isFinite(v)) {
          unknown.push(`${r}.${id}`);
          continue;
        }
        BASE[g * GEAR_PARAM_COUNT + p] = p < 3 ? v : wrapDeg(v);
      }
    }
  }
  for (let i = 0; i < N; i++) compose(i);
  refresh();
  return unknown;
}

export function gearBaseGet(row: string, p: number): number {
  return BASE[gearRowIndex(row) * GEAR_PARAM_COUNT + p]!;
}

/** The effective value (base + delta; degrees wrapped): what every Wren rig applies. */
export function gearEffective(row: string, p: number): number {
  return EFF[gearRowIndex(row) * GEAR_PARAM_COUNT + p]!;
}

/** Any effective offset (base or delta). */
export function gearAnyLive(): boolean {
  return anyLive;
}

/** The effective table's generation. */
export function gearGen(): number {
  return gen;
}

// ------------------------------------------------------------------------------------------
// Per rig
// ------------------------------------------------------------------------------------------

/** Floats per socket in `GearRigState.out`: position x, y, z, then the turn's quaternion x, y, z, w. */
export const GEAR_OUT = 7;

export interface GearRigState {
  /** The table generation and crouch amount composed last (-1 / NaN: never). */
  gen: number;
  crouch: number;
  /** Anything applied now. */
  on: boolean;
  /** Bumped whenever `out` / `live` change (the carried items take their slot again). */
  ver: number;
  /** Per socket: 1 when it has an offset now. */
  readonly live: Uint8Array;
  /** Per socket (`GEAR_OUT` floats): the offset in the socket's frame. */
  readonly out: Float64Array;
}

export function gearRigState(): GearRigState {
  const out = new Float64Array(GEAR_SOCKET_COUNT * GEAR_OUT);
  for (let s = 0; s < GEAR_SOCKET_COUNT; s++) out[s * GEAR_OUT + 6] = 1;
  return { gen: -1, crouch: Number.NaN, on: false, ver: 0, live: new Uint8Array(GEAR_SOCKET_COUNT), out };
}

const D2R = Math.PI / 180;

/**
 * Compose this rig's offsets: standing + crouch x crouched, per socket (`crouch` clamped 0..1). Nothing live and
 * nothing applied: returns at once. Same table and crouch as last time: nothing. No allocation.
 */
export function gearRigUpdate(st: GearRigState, crouch: number): void {
  if (!anyLive && !st.on) return;
  const c = crouch > 0 ? (crouch < 1 ? crouch : 1) : 0;
  if (st.gen === gen && st.crouch === c) return;
  st.gen = gen;
  st.crouch = c;
  let on = false;
  const out = st.out;
  for (let s = 0; s < GEAR_SOCKET_COUNT; s++) {
    const a = s * GEAR_PARAM_COUNT;
    const b = (s + GEAR_SOCKET_COUNT) * GEAR_PARAM_COUNT;
    const o = s * GEAR_OUT;
    let live = 0;
    for (let p = 0; p < 3; p++) {
      const v = c > 0 ? EFF[a + p]! + c * EFF[b + p]! : EFF[a + p]!;
      out[o + p] = v;
      if (v !== 0) live = 1;
    }
    const x = c > 0 ? EFF[a + 3]! + c * EFF[b + 3]! : EFF[a + 3]!;
    const y = c > 0 ? EFF[a + 4]! + c * EFF[b + 4]! : EFF[a + 4]!;
    const z = c > 0 ? EFF[a + 5]! + c * EFF[b + 5]! : EFF[a + 5]!;
    if (x !== 0 || y !== 0 || z !== 0) {
      live = 1;
      eulerQuat(x * D2R, y * D2R, z * D2R, out, o + 3);
    } else {
      out[o + 3] = 0;
      out[o + 4] = 0;
      out[o + 5] = 0;
      out[o + 6] = 1;
    }
    st.live[s] = live;
    if (live) on = true;
  }
  st.on = on;
  st.ver++;
}

/**
 * A carried item placed in its slot at position p and rotation q (its parent's frame) with its slot pivot at v (item
 * frame): the socket's offset applied (moved by R d, turned by r about the pivot: p' = p + R (d + v - r v), q' = q r),
 * written to `res` (x, y, z, qx, qy, qz, qw). False (nothing written) when the socket has no offset. No allocation.
 */
export function gearCompose(st: GearRigState, s: number, px: number, py: number, pz: number, qx: number, qy: number, qz: number, qw: number, vx: number, vy: number, vz: number, res: Float64Array): boolean {
  if (s < 0 || s >= GEAR_SOCKET_COUNT || st.live[s] !== 1) return false;
  const o = s * GEAR_OUT;
  const out = st.out;
  const rx = out[o + 3]!;
  const ry = out[o + 4]!;
  const rz = out[o + 5]!;
  const rw = out[o + 6]!;
  // r v
  let tx = 2 * (ry * vz - rz * vy);
  let ty = 2 * (rz * vx - rx * vz);
  let tz = 2 * (rx * vy - ry * vx);
  const rvx = vx + rw * tx + (ry * tz - rz * ty);
  const rvy = vy + rw * ty + (rz * tx - rx * tz);
  const rvz = vz + rw * tz + (rx * ty - ry * tx);
  // u = d + v - r v, then R u
  const ux = out[o]! + vx - rvx;
  const uy = out[o + 1]! + vy - rvy;
  const uz = out[o + 2]! + vz - rvz;
  tx = 2 * (qy * uz - qz * uy);
  ty = 2 * (qz * ux - qx * uz);
  tz = 2 * (qx * uy - qy * ux);
  res[0] = px + ux + qw * tx + (qy * tz - qz * ty);
  res[1] = py + uy + qw * ty + (qz * tx - qx * tz);
  res[2] = pz + uz + qw * tz + (qx * ty - qy * tx);
  // q r (Hamilton: r first, in the slot's frame)
  res[3] = qw * rx + qx * rw + qy * rz - qz * ry;
  res[4] = qw * ry - qx * rz + qy * rw + qz * rx;
  res[5] = qw * rz + qx * ry - qy * rx + qz * rw;
  res[6] = qw * rw - qx * rx - qy * ry - qz * rz;
  return true;
}

{
  const bad = gearBaseLoad(ANIM_BASE.gear);
  if (bad.length) console.warn(`animBase: unknown Gear rows / params skipped: ${bad.join(', ')}`);
}
