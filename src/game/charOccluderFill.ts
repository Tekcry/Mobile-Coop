/**
 * (char-shadow-meter S2, J16) The interim fill of the character-occluder contract (`world/charOccluders.ts`): one
 * upright capsule per player slot and per living guard near a player, from the sim (feet, the meter's sample height,
 * the peek offset; a guard's def height), never from graphics state. The meter (`LightField.bodyLevel` with the
 * contract), the picture's round shadows (`pictureInto`, the `BakedLamps.capsules` hook) and Guard AI's shadow cues
 * read the same capsules (G352, bible P1). Guard AI's `fillOccluders` and Player's `fillOperator` replace these fills
 * later (PLAN section 6).
 *
 * Pure: no Babylon, no rig, no `src/net` (single player never imports it), no `PlayerRef` / `Enemy` import. Hot: the
 * fills run every sim step and `pictureInto` every render frame, so nothing allocates after module load and no double
 * crosses a call added here (V8 boxes one at a call it does not inline): capsule inputs go through the module scratch
 * `S` and `put`, which writes the contract as `CharOccluders.add` does (charOccluders.ts `add`, whose 7 doubles would
 * box).
 */
import { hyp2 } from '../core/mathx';
import { OCC, OCC_KIND, occKey, type CharOccluders } from '../world/charOccluders';

/** The interim fill (BRIEF A10): today's `rtCapsule` numbers (gameState.ts `rtCapsule`: radius, the foot lift, the top
 *  below the head, the shortest top), the guard cull (m, horizontal, from any player), player slots (MAX_PLAYERS 4,
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
