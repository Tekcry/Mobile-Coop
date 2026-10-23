// (sector-redesign perf) The render freeze for Sector Ops guards: pure rules, no Babylon.
//
// Why: on campusOps a guard costs ~0.28-0.34 ms of frame CPU at Epic whether he is on screen or not (laptop, campus art
// 5504e2e3: S5-worst 15.6 ms at 24 guards vs 7.4 at 0, with 6 in sight). Off screen, the main pass culls him, but the
// active-mesh evaluation still updates his merged body and his ~18 gun-part instances every frame (the rig moved),
// and every shadow map with him in its list (the moon's cascades, the lamp / flashlight spots) prepares his skeleton
// and draws him (guard-cap `patrol/away`: render() CPU +0.19 ms and eval +0.12 ms per culled guard).
//
// What: a guard whose body cannot be on screen AND whose shadow cannot reach the screen is disabled for that render:
// outside the frustum (decided per camera evaluation from the current frustum, so nothing pops in when the view
// turns), or inside it but behind static geometry (camera rays to sample points round him and his moon shadow, re-tested
// every few frames with a sideways margin; `sectorGuardFreezeView.ts`). At the A99 worst views every S5 guard is in the
// frustum (`guardFrustum` freezes 0 of 24), only 6 are in sight: occlusion is where the saving is. Render only:
// the brain, the sim position, the torches, the hit volumes and the light field never read the rig (guard-render S4
// grep of every `.rig.` reader); the rig keeps animating, so a thawed guard shows his current pose.
//
// Frustum planes come as 6 x (nx, ny, nz, d), inside when n . p + d >= 0 (Babylon's `Plane.dotCoordinate`).

import { hyp2, hyp3 } from '../core/mathx';

export const FREEZE = {
  /** Body sphere radius over half the body height (m): the merged body's rest box pads 1 m sideways and 0.3 m up /
   *  down (`smoothBody.ts`), raised hands and the gun sit inside it; plus a margin. */
  bodyPad: 1.3,
  /** Moon / sun shadow: how far below the feet (m) a guard's shadow may land (a roof edge over the ground: the S5
   *  boathouse roof 3 m, the S4 deck 4.4 m, the S5 roof 8.4 m). */
  shadowDrop: 9,
  /** The flattest light direction extruded (|dir.y| floor): a low moon's shadow length is capped at
   *  (height + drop) / this. */
  minSunY: 0.2,
  /** Never frozen within this distance (m) of the camera, past the body radius. */
  near: 2,
} as const;

/** At most this many shadowing spot / point lights are read per frame (the light rig's shadow pool is 2-4). */
export const FREEZE_MAX_SPOTS = 16;

/** The shadow-casting lights of a frame (filled by the view side; reused, nothing allocated per frame). */
export class FreezeLights {
  /** The moon / sun casts moving shadows. */
  sun = false;
  /** Its unit direction (from the light into the scene). */
  sx = 0;
  sy = -1;
  sz = 0;
  /** Spot / point lights with a shadow map, 4 numbers each: x, y, z, reach (m; Infinity = unbounded). */
  readonly spots = new Float64Array(FREEZE_MAX_SPOTS * 4);
  spotN = 0;
  /** More shadowing lights than `spots` holds: nothing is frozen (conservative). */
  overflow = false;

  clear(): void {
    this.sun = false;
    this.spotN = 0;
    this.overflow = false;
  }

  addSpot(x: number, y: number, z: number, reach: number): void {
    if (this.spotN >= FREEZE_MAX_SPOTS) {
      this.overflow = true;
      return;
    }
    const o = this.spotN * 4;
    this.spots[o] = x;
    this.spots[o + 1] = y;
    this.spots[o + 2] = z;
    this.spots[o + 3] = reach;
    this.spotN++;
  }
}

/** Is the sphere wholly outside one of the planes (culled)? */
export function sphereOutside(pl: ArrayLike<number>, x: number, y: number, z: number, r: number): boolean {
  for (let i = 0; i < 24; i += 4) {
    if (pl[i]! * x + pl[i + 1]! * y + pl[i + 2]! * z + pl[i + 3]! <= -r) return true;
  }
  return false;
}

/** Is the swept sphere (radius r along a -> b) wholly outside one of the planes? Conservative: a capsule that misses
 *  the frustum only by a corner counts as inside. */
export function segmentOutside(pl: ArrayLike<number>, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number): boolean {
  for (let i = 0; i < 24; i += 4) {
    const nx = pl[i]!;
    const ny = pl[i + 1]!;
    const nz = pl[i + 2]!;
    const d = pl[i + 3]!;
    if (nx * ax + ny * ay + nz * az + d <= -r && nx * bx + ny * by + nz * bz + d <= -r) return true;
  }
  return false;
}

/** The moon shadow's reach along its direction (m) for a body `height` tall: down to `shadowDrop` below the feet. */
export function sunShadowLength(height: number, dirY: number): number {
  return (height + FREEZE.shadowDrop) / Math.max(-dirY, FREEZE.minSunY);
}

/** `guardFrustum` result: drawn (near the camera, a lamp in view lights him, or the lights are unknown). */
export const FREEZE_DRAW = -1;
/** `guardFrustum` result bits: the body sphere / the moon shadow capsule is in the frustum (0: neither, frozen). */
export const FREEZE_BODY_IN = 1;
export const FREEZE_SHADOW_IN = 2;

/**
 * The frustum part of the rule for a guard with feet at (x, y, z), `height` tall, the camera at (cx, cy, cz):
 * `FREEZE_DRAW`, 0 (neither his body nor his shadow can be in the frustum `pl`: frozen), or the in-frustum bits (the
 * occlusion rays then decide, `occlusionPoints`).
 */
export function guardFrustum(pl: ArrayLike<number>, x: number, y: number, z: number, height: number, cx: number, cy: number, cz: number, lights: FreezeLights): number {
  if (lights.overflow) return FREEZE_DRAW;
  const r = height * 0.5 + FREEZE.bodyPad;
  const my = y + height * 0.5;
  if (hyp3(x - cx, my - cy, z - cz) < r + FREEZE.near) return FREEZE_DRAW;
  // a shadowing spot / point light in range whose sphere is in view: his shadow may be anywhere in it
  const s = lights.spots;
  for (let i = 0; i < lights.spotN; i++) {
    const o = i * 4;
    const reach = s[o + 3]!;
    if (hyp3(x - s[o]!, my - s[o + 1]!, z - s[o + 2]!) > reach + r) continue;
    if (reach === Infinity || !sphereOutside(pl, s[o]!, s[o + 1]!, s[o + 2]!, reach)) return FREEZE_DRAW;
  }
  let bits = sphereOutside(pl, x, my, z, r) ? 0 : FREEZE_BODY_IN;
  if (lights.sun) {
    const l = sunShadowLength(height, lights.sy);
    if (!segmentOutside(pl, x, my, z, x + lights.sx * l, my + lights.sy * l, z + lights.sz * l, r)) bits |= FREEZE_SHADOW_IN;
  }
  return bits;
}

/** Frustum only (no occlusion): true when neither his body nor any shadow he casts can be in the frustum. */
export function guardFrozen(pl: ArrayLike<number>, x: number, y: number, z: number, height: number, cx: number, cy: number, cz: number, lights: FreezeLights): boolean {
  return guardFrustum(pl, x, y, z, height, cx, cy, cz, lights) === 0;
}

/** Occlusion: sample points per guard (x, y, z each), at most this many (5 body, 2 moon shadow on his floor). */
export const FREEZE_MAX_POINTS = 7;
/** (frzpol) Knee height (m) of the leg sample: legs seen under an overhang, a raised shutter, or from below a floor lip. */
export const FREEZE_KNEE = 0.4;
/** (frzpol) A moon-shadow probe that stops more than this (m) below his feet has left his floor (a roof edge): its
 *  landing is sampled too. */
export const FREEZE_LEDGE = 0.5;
/** (frzpol) Shadow probes per occlusion test (from the head, then from the middle when the head's lands below). */
export const FREEZE_PROBES = 2;
/** (frzpol) Most rays one occlusion test casts (before see-through recasts): the points, each probe and its landing. */
export const FREEZE_TEST_RAYS = FREEZE_MAX_POINTS + FREEZE_PROBES * 2;
/** Sideways reach of the body samples (m, across the view): the body's half width, his travel and the camera's over a
 *  re-test period, and a margin, so a guard about to step out from behind a corner is drawn before he shows. */
export const FREEZE_SIDE = 1.2;

/**
 * The points the camera must not see for an occluded guard to freeze, into `out` (3 numbers each); returns the count.
 * Body (`FREEZE_BODY_IN`): above the head, the chest, the chest `FREEZE_SIDE` either side across the view, and the knee
 * (frzpol). Moon shadow (`FREEZE_SHADOW_IN`): on his floor where the shadow of his middle and of his head falls (where
 * it leaves his floor: `shadowProbe` / `shadowLanding`).
 */
export function occlusionPoints(out: Float64Array, bits: number, x: number, y: number, z: number, height: number, cx: number, cz: number, lights: FreezeLights): number {
  let n = 0;
  if (bits & FREEZE_BODY_IN) {
    n = put(out, n, x, y + height + 0.15, z);
    const cy = y + height * 0.6;
    n = put(out, n, x, cy, z);
    let dx = x - cx;
    let dz = z - cz;
    const d = hyp2(dx, dz) || 1;
    // across the view: (dz, -dx) / d
    dx /= d;
    dz /= d;
    n = put(out, n, x + dz * FREEZE_SIDE, cy, z - dx * FREEZE_SIDE);
    n = put(out, n, x - dz * FREEZE_SIDE, cy, z + dx * FREEZE_SIDE);
    n = put(out, n, x, y + FREEZE_KNEE, z);
  }
  if (bits & FREEZE_SHADOW_IN && lights.sun) {
    const k = 1 / Math.max(-lights.sy, FREEZE.minSunY);
    const hx = lights.sx * k;
    const hz = lights.sz * k;
    n = put(out, n, x + hx * height * 0.5, y + 0.1, z + hz * height * 0.5);
    n = put(out, n, x + hx * height, y + 0.1, z + hz * height);
  }
  return n;
}

/** Point `n` of `out` set; returns n + 1 (a module function, not a closure: the rule runs every frame). */
function put(out: Float64Array, n: number, x: number, y: number, z: number): number {
  out[n * 3] = x;
  out[n * 3 + 1] = y;
  out[n * 3 + 2] = z;
  return n + 1;
}

/**
 * (frzpol) A moon-shadow probe for a guard (feet at x, y, z, `height` tall): the ray from the point at `frac` of his
 * height along the light down to `FREEZE.shadowDrop` below his feet, into `out` as (fx, fy, fz, tx, ty, tz). Cast it
 * (the freeze's render-only static ray): where it stops is where that point's shadow lands. False without a moon.
 */
export function shadowProbe(out: Float64Array, x: number, y: number, z: number, height: number, frac: number, lights: FreezeLights): boolean {
  if (!lights.sun) return false;
  const fy = y + height * frac;
  const k = (height * frac + FREEZE.shadowDrop) / Math.max(-lights.sy, FREEZE.minSunY);
  out[0] = x;
  out[1] = fy;
  out[2] = z;
  out[3] = x + lights.sx * k;
  out[4] = fy + lights.sy * k;
  out[5] = z + lights.sz * k;
  return true;
}

/**
 * (frzpol) The probe in `out` (from `shadowProbe`) stopped `dist` along it. When that is off his floor (more than
 * `FREEZE_LEDGE` below his feet `y`: a roof edge, the shadow on the ground below), the landing backed 0.2 m toward the
 * light (so it sits above the surface) goes to `out[6..8]` and the result is true. False when the shadow stays on his
 * floor (his floor points cover it) or the probe found no ground within the drop (the frustum capsule's reach too).
 */
export function shadowLanding(out: Float64Array, y: number, dist: number): boolean {
  const dx = out[3]! - out[0]!;
  const dy = out[4]! - out[1]!;
  const dz = out[5]! - out[2]!;
  const len = hyp3(dx, dy, dz);
  if (len <= 0 || dist >= len - 1e-3) return false;
  if (out[1]! + (dy * dist) / len >= y - FREEZE_LEDGE) return false;
  const t = Math.max(0, dist - 0.2) / len;
  out[6] = out[0]! + dx * t;
  out[7] = out[1]! + dy * t;
  out[8] = out[2]! + dz * t;
  return true;
}
