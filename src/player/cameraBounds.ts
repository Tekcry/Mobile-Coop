import { CAMERA } from '../config/camera';

/**
 * Pure maths of the camera's wall and low-space safety (no Babylon): the shoulder camera casts spheres head -> pivot ->
 * shoulder point -> camera and probes up and down from the head; these functions turn the cast results into positions.
 * A cast result is a hit fraction along the cast (0..1), or 1 when nothing was hit.
 */

/** Where a cast's sphere stops along a segment of `len` metres: the hit fraction as a distance, minus `pad` (never below 0). */
export function castStop(fraction: number, len: number, pad: number): number {
  if (!(fraction < 1)) return len;
  return Math.max(0, Math.min(len, fraction * len - pad));
}

/**
 * Pivot safety: the pivot (lagged, with look-ahead) is pulled back towards the head when the cast from the head reaches a
 * surface first, and the shoulder point towards the pivot the same way. Returns the safe fraction of the segment (1 = as
 * wanted); a hit stops `skin` metres short, so the next cast in the chain starts clear of the surface instead of touching it.
 */
export function pivotFraction(fraction: number, len: number, skin: number): number {
  if (!(fraction < 1)) return 1;
  return len > 1e-6 ? castStop(fraction, len, skin) / len : 0;
}

/**
 * Low space weight 0..1 from the clear height over the operator (floor to ceiling at the head): 0 at `lowStart` and above
 * (open: the framing is exactly the normal one), 1 at `lowFull` and below.
 */
export function lowWeight(clear: number, C = CAMERA): number {
  if (clear >= C.lowStart) return 0;
  if (clear <= C.lowFull) return 1;
  return (C.lowStart - clear) / (C.lowStart - C.lowFull);
}

/**
 * Low space framing for weight `w`: the boom no longer than `lowBoom` and the shoulder point's height kept between the floor
 * and the ceiling with their gaps (if the space is too low for both gaps, it sits half way). `out` is written and returned.
 */
export function lowFraming(boom: number, shoulderY: number, floorY: number, ceilY: number, w: number, out: { boom: number; shoulderY: number }, C = CAMERA): { boom: number; shoulderY: number } {
  const lo = floorY + C.lowFloorGap;
  const hi = ceilY - C.lowCeilGap;
  const y = lo <= hi ? Math.min(hi, Math.max(lo, shoulderY)) : (floorY + ceilY) / 2;
  out.boom = boom + (Math.min(boom, C.lowBoom) - boom) * w;
  out.shoulderY = shoulderY + (y - shoulderY) * w;
  return out;
}

/** The share of the boom's vertical swing (from pitch) kept in a low space of weight `w` (1 = all of it, as in the open). */
export function lowSwing(w: number, C = CAMERA): number {
  return 1 + (C.lowSwing - 1) * w;
}

/** Near plane distance for a boom length: `near` at `nearFarBoom` and beyond, down to `nearClose` at `nearCloseBoom` and under. */
export function nearPlane(boom: number, C = CAMERA): number {
  if (boom >= C.nearFarBoom) return C.near;
  if (boom <= C.nearCloseBoom) return C.nearClose;
  return C.nearClose + ((C.near - C.nearClose) * (boom - C.nearCloseBoom)) / (C.nearFarBoom - C.nearCloseBoom);
}

/** Rate (1/s) of a value easing towards a target: `fast` when it moves towards safety (`inward`), `slow` otherwise. */
export function easeRate(inward: boolean, fast: number, slow: number): number {
  return inward ? fast : slow;
}
