/**
 * (char-shadow-meter S2, J16) The interim fill of the character-occluder contract (`world/charOccluders.ts`): one
 * upright capsule per player slot and per living guard near a player, from the sim (feet, the meter's sample height,
 * the peek offset; a guard's def height), never from graphics state. The meter (`LightField.bodyLevel` with the
 * contract), the picture's round shadows (`pictureInto`, the `BakedLamps.capsules` hook) and Guard AI's shadow cues
 * read the same capsules (G352, bible P1). Guard AI's `fillOccluders` and Player's `fillOperator` replace these fills
 * later (PLAN section 6).
 * (player-j16) `fillOperator` adds a carried body: one capsule on its carrier's shoulder, owned by the carrier's key.
 *
 * Pure: no Babylon, no rig, no `src/net` (single player never imports it), no `PlayerRef` / `Enemy` import. Hot: the
 * fills run every sim step and `pictureInto` every render frame, so nothing allocates after module load and no double
 * crosses a call added here (V8 boxes one at a call it does not inline): capsule inputs go through the module scratch
 * `S` and `put`, which writes the contract as `CharOccluders.add` does (charOccluders.ts `add`, whose 7 doubles would
 * box).
 */
import { hyp2 } from '../core/mathx';
import { OCC, OCC_KIND, occKey, type CharOccluders } from '../world/charOccluders';
import { posedHeadSample } from '../player/wallController';
import { lightSampleHeight, STANDARD_BODY } from './bodyHeight';

/** The interim fill (BRIEF A10): today's `rtCapsule` numbers (gameState.ts `rtCapsule`: radius, the foot lift, the top
 *  below the head, the shortest top), the guard cull (m, horizontal, from any player), player slots (MAX_PLAYERS 2,
 *  src/net/protocol.ts, restated here: single player never imports src/net). */
export const FILL = { r: 0.22, footLift: 0.25, topDrop: 0.2, minTop: 0.5, reach: 30, players: 4 } as const;
/** `pin` stride per player slot: feet x, y, z; sample height h (the meter's); head offset ox, oz. */
export const FILL_IN = 6;

/** A guard or a client's puppet (`TakedownVictim` fits it structurally). */
export interface VictimLike {
  readonly alive: boolean;
  readonly pos: { readonly x: number; readonly y: number; readonly z: number };
  readonly def: { readonly height: number };
}

/** A read-only point. */
type V3 = { readonly x: number; readonly y: number; readonly z: number };

/**
 * (char-shadow-meter S2c) A player slot's sim inputs: the host's `PlayerRef` (`RemotePlayer.ref`) fits it structurally,
 * and so does a co-op client's partner entry (`net/charMates.ts`). Feet, crouched, the body's standing height (absent:
 * `STANDARD_BODY`), the peek offset, and on a wall the sim body's head (null or absent: the upright sample).
 */
export interface MateLike {
  readonly feet: V3;
  readonly crouched: boolean;
  readonly height?: number;
  readonly peekX?: number;
  readonly peekZ?: number;
  readonly head?: V3 | null;
}

/** `slotInto`'s `posedHeadSample` scratch. */
const HEAD = { ox: 0, oz: 0, h: 0 };

/**
 * (char-shadow-meter S2c) One player slot's `pin` inputs (`FILL_IN` doubles at `s * FILL_IN`): feet; on a wall the sim
 * body's head (`posedHeadSample`: height and offset), else the meter's sample height for the body and stance with the
 * peek offset. The host's remote slots and a client's partner slots share it. No allocation.
 */
export function slotInto(pin: Float64Array, s: number, r: MateLike): void {
  const o = s * FILL_IN;
  pin[o] = r.feet.x;
  pin[o + 1] = r.feet.y;
  pin[o + 2] = r.feet.z;
  const rh = r.head;
  if (rh) {
    const hs = posedHeadSample(r.feet.x, r.feet.y, r.feet.z, rh.x, rh.y, rh.z, HEAD);
    pin[o + 3] = hs.h;
    pin[o + 4] = hs.ox;
    pin[o + 5] = hs.oz;
  } else {
    pin[o + 3] = lightSampleHeight(r.height ?? STANDARD_BODY, r.crouched ? 1 : 0);
    pin[o + 4] = r.peekX ?? 0;
    pin[o + 5] = r.peekZ ?? 0;
  }
}

/** One capsule's input for `put`: ax ay az bx by bz r. */
const S = new Float64Array(7);
/** `pictureInto` scratch: each capsule's squared horizontal distance to slot 0, and the ones already taken. */
const DIST = new Float64Array(OCC.max);
const TAKEN = new Uint8Array(OCC.max);

/** `CharOccluders.add(kind, index, ...S)` without the boxed doubles: the capsule in `S`; its slot, or -1 when full. */
function put(occ: CharOccluders, kind: number, index: number): number {
  if (occ.n >= OCC.max) return -1;
  const i = occ.n++;
  const o = i * OCC.stride;
  const c = occ.cap;
  c[o] = S[0]!;
  c[o + 1] = S[1]!;
  c[o + 2] = S[2]!;
  c[o + 3] = S[3]!;
  c[o + 4] = S[4]!;
  c[o + 5] = S[5]!;
  c[o + 6] = S[6]!;
  c[o + 7] = kind;
  occ.owner[i] = occKey(kind, index);
  return i;
}

/** `occ.clear()`, then per slot s < n one upright capsule: a = (x, y + footLift, z), b = (x + ox, y + max(minTop,
 *  h - topDrop), z + oz), r; owner `occKey(OCC_KIND.player, s)` into `keys[s]` (-1 when the contract is full). */
export function fillPlayers(occ: CharOccluders, pin: Float64Array, n: number, keys: Int32Array): void {
  occ.clear();
  for (let s = 0; s < n; s++) {
    const o = s * FILL_IN;
    const x = pin[o]!;
    const y = pin[o + 1]!;
    const z = pin[o + 2]!;
    const top = pin[o + 3]! - FILL.topDrop;
    S[0] = x;
    S[1] = y + FILL.footLift;
    S[2] = z;
    S[3] = x + pin[o + 4]!;
    S[4] = y + (top > FILL.minTop ? top : FILL.minTop);
    S[5] = z + pin[o + 5]!;
    S[6] = FILL.r;
    keys[s] = put(occ, OCC_KIND.player, s) < 0 ? -1 : occKey(OCC_KIND.player, s);
  }
}

/** Every `alive` victim in list order whose feet are within `FILL.reach` (hyp2, horizontal) of any player slot in
 *  `pin`: a = (x, y + 0.25, z), b = (x, y + max(0.5, height - 0.2), z), r 0.22, owner `occKey(OCC_KIND.guard, i)`,
 *  i = its list index. Returns how many did not fit (0 unless the contract is full). */
export function fillVictims(occ: CharOccluders, vs: readonly VictimLike[], pin: Float64Array, n: number): number {
  let over = 0;
  for (let i = 0; i < vs.length; i++) {
    const v = vs[i]!;
    if (!v.alive) continue;
    const p = v.pos;
    let near = false;
    for (let s = 0; s < n && !near; s++) {
      const o = s * FILL_IN;
      if (hyp2(p.x - pin[o]!, p.z - pin[o + 2]!) <= FILL.reach) near = true;
    }
    if (!near) continue;
    const top = v.def.height - FILL.topDrop;
    S[0] = p.x;
    S[1] = p.y + FILL.footLift;
    S[2] = p.z;
    S[3] = p.x;
    S[4] = p.y + (top > FILL.minTop ? top : FILL.minTop);
    S[5] = p.z;
    S[6] = FILL.r;
    if (put(occ, OCC_KIND.guard, i) < 0) over++;
  }
  return over;
}

/** (player-j16) The carried body on a carrier's shoulder, one capsule along its torso hanging down his back (CT carry:
 *  hips on the shoulder, torso down the back, legs down the front inside his own capsule). Fractions / metres:
 *  the hips' height as a share of the slot's sample height h (crouch lowers it with h), the shoulder's offset to the
 *  load side, the torso's drop and its lean back, the lowest end over the feet, the radius. */
export const LOAD = { hip: 0.88, side: 0.14, hang: 0.65, back: 0.25, low: 0.25, r: 0.17 } as const;
/** `lin` stride per player slot: side (0 no load, 1 right shoulder, -1 left), the carrier's yaw (rad, 0 = +Z). */
export const LOAD_IN = 2;

/** (player-j16) After `fillPlayers` and the guard fill: per slot s < n with `lin[s*LOAD_IN] !== 0` and `keys[s] >= 0`,
 *  one capsule written through `put(occ, OCC_KIND.player, s)` (kind player, owner `keys[s]`: the carrier's own key).
 *  With f = (sin yaw, 0, cos yaw) his forward and rt = (cos yaw, 0, -sin yaw) his right: a (the hips) = feet + rt x
 *  side x `LOAD.side`, h x `LOAD.hip` up; b (the head end) = a - f x `LOAD.back`, at max(a.y - `LOAD.hang`, y +
 *  `LOAD.low`); r `LOAD.r`. The peek offset is ignored. Returns how many did not fit. No allocation. */
export function fillOperator(occ: CharOccluders, pin: Float64Array, lin: Float64Array, n: number, keys: Int32Array): number {
  let over = 0;
  for (let s = 0; s < n; s++) {
    const side = lin[s * LOAD_IN]!;
    if (side === 0 || keys[s]! < 0) continue;
    const yaw = lin[s * LOAD_IN + 1]!;
    const o = s * FILL_IN;
    const y = pin[o + 1]!;
    const sn = Math.sin(yaw);
    const cs = Math.cos(yaw);
    const ax = pin[o]! + cs * side * LOAD.side;
    const ay = y + pin[o + 3]! * LOAD.hip;
    const az = pin[o + 2]! - sn * side * LOAD.side;
    const by = ay - LOAD.hang;
    const low = y + LOAD.low;
    S[0] = ax;
    S[1] = ay;
    S[2] = az;
    S[3] = ax - sn * LOAD.back;
    S[4] = by > low ? by : low;
    S[5] = az - cs * LOAD.back;
    S[6] = LOAD.r;
    if (put(occ, OCC_KIND.player, s) < 0) over++;
  }
  return over;
}

/** The picture's capsules in `BakedLamps.capsules` layout (a = foot x, y, z, r; b = head x, y, z): players in contract
 *  order first, then the others nearest pin slot 0 (the local player; squared horizontal distance of the capsule
 *  midpoint, ties by slot); at most `max`; returns the count. */
export function pictureInto(occ: CharOccluders, a: Float32Array, b: Float32Array, max: number, pin: Float64Array): number {
  const C = occ.cap;
  const total = occ.n;
  let m = 0;
  for (let i = 0; i < total && m < max; i++) {
    const o = i * OCC.stride;
    if (C[o + 7] !== OCC_KIND.player) continue;
    copyOut(C, o, a, b, m);
    m++;
  }
  if (m >= max) return m;
  const x0 = pin[0]!;
  const z0 = pin[2]!;
  let others = 0;
  for (let i = 0; i < total; i++) {
    const o = i * OCC.stride;
    if (C[o + 7] === OCC_KIND.player) {
      TAKEN[i] = 1;
      continue;
    }
    TAKEN[i] = 0;
    others++;
    const dx = (C[o]! + C[o + 3]!) * 0.5 - x0;
    const dz = (C[o + 2]! + C[o + 5]!) * 0.5 - z0;
    DIST[i] = dx * dx + dz * dz;
  }
  // the nearest first, one pick at a time (at most 16 picks over at most 64 capsules); a tie keeps the lower slot
  while (m < max && others > 0) {
    let best = -1;
    for (let i = 0; i < total; i++) if (TAKEN[i] === 0 && (best < 0 || DIST[i]! < DIST[best]!)) best = i;
    TAKEN[best] = 1;
    others--;
    copyOut(C, best * OCC.stride, a, b, m);
    m++;
  }
  return m;
}

/** Contract capsule at `o` into the picture's arrays at `m`. */
function copyOut(C: Float32Array, o: number, a: Float32Array, b: Float32Array, m: number): void {
  const k = m * 4;
  a[k] = C[o]!;
  a[k + 1] = C[o + 1]!;
  a[k + 2] = C[o + 2]!;
  a[k + 3] = C[o + 6]!;
  b[k] = C[o + 3]!;
  b[k + 1] = C[o + 4]!;
  b[k + 2] = C[o + 5]!;
}
