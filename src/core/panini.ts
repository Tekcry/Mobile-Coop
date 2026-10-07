/**
 * Panini projection (3.0, pure): keeps a wide field of view from stretching shapes at the screen's sides by
 * projecting onto a cylinder first (d = 0: rectilinear, d = 1: full Panini). `paniniView` is what the post pass
 * evaluates per output pixel - the rectilinear view-plane point to sample for an output view-plane point - and
 * `paniniScale` the zoom that makes the result fill the screen's width.
 */

/** For an output point on the view plane (x, y at distance 1), the rectilinear point to sample. */
export function paniniView(x: number, y: number, d: number, out: [number, number]): [number, number] {
  const viewDist = 1 + d;
  const hypSq = x * x + viewDist * viewDist;
  const isect = x * d;
  const discrim = hypSq - isect * isect;
  const cylDistMinusD = (-isect * x + viewDist * Math.sqrt(Math.max(0, discrim))) / hypSq;
  const cylDist = cylDistMinusD + d;
  const k = cylDist / viewDist / Math.max(1e-6, cylDist - d);
  out[0] = x * k;
  out[1] = y * k;
  return out;
}

/** The rectilinear extent the width maps to (tan of half the horizontal FOV) seen through Panini of strength d. */
function cropExtent(tanX: number, d: number): number {
  const viewDist = 1 + d;
  const hyp = Math.sqrt(tanX * tanX + 1);
  const cylDistMinusD = 1 / hyp;
  const cylDist = cylDistMinusD + d;
  return tanX * cylDistMinusD * (viewDist / cylDist);
}

/** Zoom (<= 1) applied to the output plane so the projected image still reaches the screen's sides. */
export function paniniScale(tanX: number, d: number): number {
  if (d <= 0) return 1;
  return Math.min(1, cropExtent(tanX, d) / tanX);
}
