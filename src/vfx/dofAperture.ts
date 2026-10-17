/**
 * Depth of field's aperture (Babylon-free; `PostStack.frame`). The field eases between fully sharp and the aiming
 * f/2.8 in aperture (1 / f-stop), which the blur grows with. Sharp is a CoC of zero whatever the depth reads, so the
 * depth pass may pause; the field only opens once that pass is live again (it lags a frame when it restarts).
 *
 * 3.6 desktop blur fix: the old idle value, f/32, still turned depth into blur. With the depth pass paused its map
 * read as "at the lens", and every pixel got the full blur on High / Ultra / Epic whenever ray tracing was off (with
 * ray tracing the pass is shared and never paused, so the bug hid there).
 */

/** The aiming aperture: f/2.8. */
export const AIM_APERTURE = 1 / 2.8;
/** The f-stop drawn while sharp: the circle of confusion is ~0 at any depth (a 0.1 m depth at a 1 m focus: < 1e-4). */
export const SHARP_FSTOP = 1e7;
/** Below this the field snaps shut (sharp) and the depth pass may pause. */
const SNAP = 1e-3;
/** Ease rate per second. */
const RATE = 8;

/**
 * One frame's aperture. `aiming`: the field should be shallow; `depthLive`: the depth pass rendered the frame being
 * blurred (false while paused, and on the frame it restarts).
 */
export function stepAperture(aperture: number, aiming: boolean, depthLive: boolean, dt: number): number {
  const want = aiming && depthLive ? AIM_APERTURE : 0;
  const a = aperture + (want - aperture) * Math.min(1, dt * RATE);
  return want === 0 && a < SNAP ? 0 : a;
}

/** The f-stop for an aperture (sharp when shut). */
export function fStopFor(aperture: number): number {
  return aperture > 0 ? 1 / aperture : SHARP_FSTOP;
}

/** The depth pass is needed: aiming, or the field still open. */
export function depthWanted(aperture: number, aiming: boolean): boolean {
  return aiming || aperture > 0;
}
