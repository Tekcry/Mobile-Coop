/**
 * (anim-skeleton S4) The per-key leg deltas over the foot planner (pure, Babylon-free). The rig (`characterRig.ts`
 * `keyedLegDeltas`) turns a SWINGING leg by the clip's `legd` deltas as they are; a PLANTED leg is re-solved onto its
 * plant with them folded in, so the foot never slides: the hip and knee deltas only steer the knee (`plantKnee`: the knee
 * on the circle the plant allows, the side nearest where the raw delta put it), the ankle and toe deltas turn the foot
 * about the ankle, which stays on the plant. Between the two the planner's contact weight (`legdContactW`) blends, so
 * nothing pops at lift-off or touch-down.
 */

/** Plain 3-vectors (Babylon's Vector3 fits). */
export interface V3 {
  x: number;
  y: number;
  z: number;
}

/** Test switch: `resolve` false skips the planted re-solve (every leg takes the raw delta), so a test can show the slide. */
export const LEGD_OPT = { resolve: true };

/** The share of the swing (each end) over which the planted re-solve fades out after lift-off and back in before touch-down. */
export const LEGD_FADE = 0.15;

/**
 * The planted re-solve's weight from the planner's foot state: 1 in contact (or no swing), 0 in mid-swing, eased over
 * the first and last `LEGD_FADE` of the swing (`swing` 0..1) so a lifting or landing foot never jumps.
 */
export function legdContactW(contact: boolean, swing: number): number {
  if (contact || swing < 0) return 1;
  const s = swing > 1 ? 1 : swing;
  const a = s < LEGD_FADE ? 1 - s / LEGD_FADE : s > 1 - LEGD_FADE ? (s - (1 - LEGD_FADE)) / LEGD_FADE : 0;
  return a * a * (3 - 2 * a);
}

/**
 * The knee of a leg from hip `H` to the planted ankle `A` (thigh |K0 - H|, shin |A - K0|, the solved knee `K0`) on the
 * side of `Kr` (where the raw delta put it), into `out`: the circle of knees the plant allows, the point nearest `Kr`
 * about the hip-ankle line (`K0`'s side when `Kr` sits on the line). Out of reach: the straight leg toward `A`.
 * No allocation.
 */
export function plantKnee(H: V3, A: V3, K0: V3, Kr: V3, out: V3): V3 {
  const lt = Math.sqrt((K0.x - H.x) ** 2 + (K0.y - H.y) ** 2 + (K0.z - H.z) ** 2);
  const lc = Math.sqrt((A.x - K0.x) ** 2 + (A.y - K0.y) ** 2 + (A.z - K0.z) ** 2);
  let ux = A.x - H.x;
  let uy = A.y - H.y;
  let uz = A.z - H.z;
  const d = Math.sqrt(ux * ux + uy * uy + uz * uz);
  if (d < 1e-9) {
    out.x = K0.x;
    out.y = K0.y;
    out.z = K0.z;
    return out;
  }
  ux /= d;
  uy /= d;
  uz /= d;
  // along the hip-ankle line and out from it (the law of cosines)
  let a = (lt * lt - lc * lc + d * d) / (2 * d);
  if (a > lt) a = lt;
  const r = Math.sqrt(Math.max(0, lt * lt - a * a));
  // the side: Kr's offset from the line, else K0's
  let vx = Kr.x - H.x;
  let vy = Kr.y - H.y;
  let vz = Kr.z - H.z;
  let t = vx * ux + vy * uy + vz * uz;
  vx -= t * ux;
  vy -= t * uy;
  vz -= t * uz;
  let l = Math.sqrt(vx * vx + vy * vy + vz * vz);
  if (l < 1e-9) {
    vx = K0.x - H.x;
    vy = K0.y - H.y;
    vz = K0.z - H.z;
    t = vx * ux + vy * uy + vz * uz;
    vx -= t * ux;
    vy -= t * uy;
    vz -= t * uz;
    l = Math.sqrt(vx * vx + vy * vy + vz * vz);
  }
  const k = l < 1e-9 ? 0 : r / l;
  out.x = H.x + ux * a + vx * k;
  out.y = H.y + uy * a + vy * k;
  out.z = H.z + uz * a + vz * k;
  return out;
}
