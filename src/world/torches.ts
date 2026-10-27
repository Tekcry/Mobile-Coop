/**
 * Guard flashlights (pure: no Babylon / DOM), one code path for the host and the co-op client (coop-torches).
 *
 * A dark map gets `FLASHLIGHTS` slots in its light registry (`addTorchSlots`, called by `World`). On the host the
 * `EnemyManager` hands a slot to a guard that wants one and moves it with `placeTorch` each step; the co-op client's
 * `TorchMirror` (`net/torchMirror.ts`) does the same from the snapshot's torch bit and the guard's shown position.
 * Everything that reads light (the light field: the meter and guard perception; the light rig, the haze and the
 * reflections: the picture) reads these registry entries, so both pages light a point from the same values
 * (light parity, bible 5.1). `beamReach` (rendering only: where the beam stops at a wall) is shared the same way.
 */
import { hyp2, hyp3 } from '../core/mathx';
import { makeCone, type LightDef, type LightRegistry } from './lights';

/** Flashlight slots on dark maps (enemies searching / investigating in the dark): the default. */
export const FLASHLIGHTS = 4;
/** (piano SO3) The most a map may ask for (`MapDef.torchSlots`). */
export const FLASHLIGHTS_MAX = 16;

/** (piano SO3) A map's torch slots: unset 4; else rounded up to 4, 8, 12 or 16 (each count is its own shader variant,
 *  `LampPlugin`'s defines). Pure. */
export function torchSlotCount(asked: number | null | undefined): number {
  if (asked === null || asked === undefined || !(asked > FLASHLIGHTS)) return FLASHLIGHTS;
  return Math.min(FLASHLIGHTS_MAX, Math.ceil(asked / 4) * 4);
}

/** (piano SO3) How many of `n` slots get a shadow map (the torch atlas): unset all; else 1..n. The rest light with the
 *  beam's reach cut (`LightDef.beamCut`), in the picture and the light field alike. Pure. */
export function torchShadowCount(asked: number | null | undefined, n: number): number {
  if (asked === null || asked === undefined || !(asked < n)) return n;
  return Math.max(1, Math.floor(asked));
}

/** The torch itself: range (m), peak level, colour (rendering), cone half-angles (rad), and how it is held. */
export const TORCH = {
  radius: 13,
  intensity: 0.85,
  color: [0.95, 0.96, 1] as [number, number, number],
  outer: 0.34,
  inner: 0.2,
  /** Pitched down this much (rad) from where the guard faces. */
  pitch: 0.16,
  /** Ahead of the feet along the facing, and to the right of it (m). */
  ahead: 0.35,
  side: 0.15,
  /** Height over the feet standing / crouched, times the guard's scale (m). */
  eyeStand: 1.45,
  eyeCrouch: 1.0,
} as const;

/** (piano SO3 fix) A guard's stable torch key from his id (`e<num>` on the host, the same string in the co-op
 *  snapshot): its trailing digits as a number (Infinity without any). Shared data only, no wire change.
 *  Allocation-free. */
export function torchKey(id: string): number {
  let v = 0;
  let mul = 1;
  let any = false;
  for (let i = id.length - 1; i >= 0; i--) {
    const c = id.charCodeAt(i) - 48;
    if (c < 0 || c > 9) break;
    v += c * mul;
    mul *= 10;
    any = true;
  }
  return any ? v : Infinity;
}

/**
 * (piano SO3 fix) One swap towards the rule both pages keep when a map caps the shadowed slots (`beamCut` slots
 * from `s` on): the shadowed slots hold the lit guards with the lowest `torchKey`s, so a guard's torch is shadowed or
 * cut alike on the host (`EnemyManager.updateTorches`, guard order) and the co-op client (`TorchMirror`, snapshot
 * order), whatever order each lit them in. `keys[k]`: slot k's holder key, -1 free. Returns `i * 64 + j` (swap
 * shadowed slot i with cut slot j: j's holder has a lower key than i's, or i is free) or -1 when the rule holds.
 * Callers swap and call again (at most `n` times). Pure, allocation-free.
 */
export function nextTorchSwap(keys: Float64Array, n: number, s: number): number {
  if (s >= n) return -1;
  // the cut slot holding the lowest key
  let j = -1;
  let jk = Infinity;
  for (let k = s; k < n; k++) {
    const v = keys[k]!;
    if (v >= 0 && (j < 0 || v < jk)) {
      j = k;
      jk = v;
    }
  }
  if (j < 0) return -1;
  // the shadowed slot that should give way: a free one first, else the highest key
  let i = -1;
  let ik = -Infinity;
  for (let k = 0; k < s; k++) {
    const v = keys[k]!;
    const w = v < 0 ? Infinity : v;
    if (i < 0 || w > ik) {
      i = k;
      ik = w;
    }
  }
  return i >= 0 && jk < ik ? i * 64 + j : -1;
}

/** A dark map (ambient or any zone below 0.5): the flashlight slots, off and parked under the floor until used.
 *  (piano SO3) `n` slots (`torchSlotCount`); the slots from `shadowed` on carry `beamCut` (no shadow map). */
export function addTorchSlots(reg: LightRegistry, n = FLASHLIGHTS, shadowed = n): void {
  if (!(reg.ambient < 0.5 || reg.zones.some((z) => z.ambient < 0.5))) return;
  for (let i = 0; i < n; i++) {
    const l = reg.add({ kind: 'flashlight', x: 0, y: -50, z: 0, radius: TORCH.radius, intensity: TORCH.intensity, color: [...TORCH.color], cone: makeCone(0, 0, 1, TORCH.outer, TORCH.inner), on: false, destructible: false, electric: false });
    if (i >= shadowed) l.beamCut = true;
  }
}

/** The flashlight follows the head: at eye height ahead of the face, pointing where it looks (a bit down).
 *  `crouched`: the guard's crouch past half way (the snapshot's `st` 2). Allocation-free. */
export function placeTorch(l: LightDef, x: number, y: number, z: number, yaw: number, crouched: boolean, scale: number): void {
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  l.x = x + s * TORCH.ahead + c * TORCH.side;
  l.y = y + (crouched ? TORCH.eyeCrouch : TORCH.eyeStand) * scale;
  l.z = z + c * TORCH.ahead - s * TORCH.side;
  const cone = l.cone;
  if (cone) {
    const p = TORCH.pitch;
    cone.dx = s * Math.cos(p);
    cone.dy = -Math.sin(p);
    cone.dz = c * Math.cos(p);
  }
}

/** Distance (m) from a to b before static geometry stops a ray (b's distance when nothing does). */
export type BeamHit = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => number;

/** Rendering only: the longest unobstructed run of a cone light (centre and four edge rays), plus a little spill, so
 *  the beam never lights the room behind a wall. Allocation-free (with an allocation-free `hit`). */
export function beamReach(l: LightDef, hit: BeamHit): number {
  const c = l.cone;
  if (!c) return l.radius;
  const half = Math.acos(c.cosOuter) * 0.75;
  let best = 0;
  // an orthonormal pair across the beam
  const hx = -c.dz;
  const hz = c.dx;
  const hl = hyp2(hx, hz) || 1;
  const ux = hx / hl;
  const uz = hz / hl;
  const vx = c.dy * uz;
  const vy = c.dz * ux - c.dx * uz;
  const vz = -c.dy * ux;
  const t = Math.tan(half);
  for (let k = 0; k < 5; k++) {
    const a = k === 0 ? 0 : t * (k === 1 || k === 3 ? (k === 1 ? 1 : -1) : 0);
    const b = k === 2 ? t : k === 4 ? -t : 0;
    let dx = c.dx + ux * a + vx * b;
    let dy = c.dy + vy * b;
    let dz = c.dz + uz * a + vz * b;
    const n = hyp3(dx, dy, dz) || 1;
    dx /= n;
    dy /= n;
    dz /= n;
    const d = hit(l.x, l.y, l.z, l.x + dx * l.radius, l.y + dy * l.radius, l.z + dz * l.radius);
    if (d > best) best = d;
  }
  return Math.min(l.radius, best + 0.4);
}
