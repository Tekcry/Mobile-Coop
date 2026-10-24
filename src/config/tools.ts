/**
 * CT toolkit numbers (pure, `docs/systems/ct-toolkit.md` section 1 "Numbers"). Every value is a (TUNE) starting value
 * from the spec (G10). Only the optic cable is built so far (3.2: doors; hatches, panels, grilles and shaft tops engine side).
 */

const DEG = Math.PI / 180;

/** (ct-toolkit 3.2) The optic cable under a door. */
export const OPTIC = {
  /** Feed the cable in / pull it out (s). */
  feedIn: 1.2,
  feedOut: 0.6,
  /** The tip's look range around the door's normal: yaw +-75 deg, pitch -10 (down) to +60 (up) deg. */
  yaw: 75 * DEG,
  pitchMin: -10 * DEG,
  pitchMax: 60 * DEG,
  /** Horizontal field of view at the tip (deg). */
  fov: 100,
  /** The tip past the leaf's far face (m) and over the floor (m). */
  past: 0.3,
  height: 0.05,
  /** The gap check's padding past the tip (m; F23's 0.16 sphere padding). */
  pad: 0.16,
  /** The kneel spot off the leaf plane on the body's side (m), in front of the leaf's middle. */
  kneel: 0.55,
  /** The view's near plane at the tip (m). */
  near: 0.02,
  /** The stick / move keys pulled back this far leaves the view. */
  leaveBack: -0.6,
  /** (optic-coop) Hatches, panels, grilles, shaft tops: the tip this far into the space past the gap (m). */
  into: 0.3,
  /** (optic-coop) Reach to the gap: within 1.0 m (spec) horizontally; the gap from 0.6 m under the feet to 2.4 m over. */
  reach: 1.0,
  reachDown: 0.6,
  reachUp: 2.4,
  /** (optic-coop) The body off a ceiling panel's gap (standing under it, m); hatches and grilles use `kneel`. */
  stand: 0.3,
  /** (optic-coop) The look's centre pitch through a floor or ceiling gap (CT's trap view looks down about 50 deg). */
  vertPitch: 50 * DEG,
  /** (optic-coop) The feeding hand this far short of the gap (m; the cable prop runs from the hand to the tip). */
  hand: 0.2,
  /** (optic-coop) The cable prop's radius (m; render only). */
  cableR: 0.006,
} as const;
