/**
 * Action clips (authored in code). Weapon handling, cover choreography, traversal and transitions.
 * Clips keyed over normalized time (duration 1) are sampled at the action's progress; timed clips
 * are keyed in seconds. Root-space metres at 1.75 m, radians.
 *
 * Reference points (root space): shoulder ~1.43 m, aim pocket ~(0.13, 1.33, 0.3), belt pouch on the
 * left front ~(-0.12, 0.98, 0.12), charging handle ~(0.08, 1.4, 0.16).
 */
import { makeClip } from '../clip';

/**
 * Tactical reload (rifle 2.6 s): tilt the weapon, off hand to the magazine, strip it, to the pouch,
 * new magazine back to the well, seat and slap, hand back to the foregrip. Events for audio.
 */
export const RELOAD_TACTICAL = makeClip({
  name: 'reloadTactical',
  duration: 1,
  keys: {
    offGrip: [0, 1, 0.08, 1, 0.14, 0, 0.84, 0, 0.92, 1],
    offMag: [0, 0, 0.1, 0, 0.16, 1, 0.24, 1, 0.32, 0, 0.5, 0, 0.58, 1, 0.74, 1, 0.84, 0],
    hLX: [0, -0.06, 0.32, -0.1, 0.42, -0.13, 0.5, -0.1],
    hLY: [0, 1.2, 0.32, 1.02, 0.42, 0.97, 0.5, 1.08],
    hLZ: [0, 0.2, 0.32, 0.14, 0.42, 0.12, 0.5, 0.18],
    wpRoll: [0, 0, 0.1, 0.38, 0.62, 0.42, 0.72, 0.3, 0.9, 0.05, 1, 0],
    wpPitch: [0, 0, 0.1, 0.22, 0.62, 0.25, 0.66, 0.2, 0.68, 0.27, 0.9, 0.05, 1, 0],
    wpY: [0, 0, 0.1, -0.05, 0.64, -0.05, 0.66, -0.03, 0.69, -0.06, 0.9, -0.01, 1, 0],
    wpZ: [0, 0, 0.1, -0.09, 0.9, -0.08, 1, 0],
    hdPitch: [0, 0, 0.12, 0.18, 0.3, 0.12, 0.42, 0.28, 0.56, 0.18, 0.7, 0.15, 0.9, 0],
    spPitch: [0, 0, 0.66, 0, 0.68, 0.025, 0.72, 0],
  },
  events: { magOut: 0.24, magIn: 0.66 },
});

/** Empty reload (rifle 3.1 s): as tactical, then the off hand runs the charging handle. */
export const RELOAD_EMPTY = makeClip({
  name: 'reloadEmpty',
  duration: 1,
  keys: {
    offGrip: [0, 1, 0.07, 1, 0.12, 0, 0.86, 0, 0.94, 1],
    offMag: [0, 0, 0.09, 0, 0.14, 1, 0.2, 1, 0.27, 0, 0.44, 0, 0.5, 1, 0.6, 1, 0.66, 0],
    hLX: [0, -0.06, 0.27, -0.1, 0.36, -0.13, 0.44, -0.1, 0.66, 0.0, 0.72, 0.07, 0.78, 0.07, 0.84, 0.0],
    hLY: [0, 1.2, 0.27, 1.02, 0.36, 0.97, 0.44, 1.08, 0.66, 1.3, 0.72, 1.4, 0.78, 1.4, 0.84, 1.3],
    hLZ: [0, 0.2, 0.27, 0.14, 0.36, 0.12, 0.44, 0.18, 0.66, 0.22, 0.72, 0.17, 0.77, 0.06, 0.8, 0.12, 0.84, 0.2],
    wpRoll: [0, 0, 0.09, 0.38, 0.6, 0.42, 0.66, 0.15, 0.82, 0.12, 0.94, 0.02, 1, 0],
    wpPitch: [0, 0, 0.09, 0.22, 0.5, 0.25, 0.54, 0.2, 0.56, 0.27, 0.66, 0.1, 0.77, 0.06, 0.8, 0.12, 0.94, 0.03, 1, 0],
    wpY: [0, 0, 0.09, -0.05, 0.52, -0.05, 0.54, -0.03, 0.57, -0.06, 0.8, -0.03, 0.94, -0.01, 1, 0],
    wpZ: [0, 0, 0.09, -0.09, 0.94, -0.06, 1, 0],
    hdPitch: [0, 0, 0.1, 0.18, 0.27, 0.12, 0.36, 0.28, 0.48, 0.18, 0.66, 0.08, 0.9, 0],
    spPitch: [0, 0, 0.54, 0, 0.56, 0.025, 0.6, 0, 0.77, 0, 0.79, -0.02, 0.82, 0],
  },
  events: { magOut: 0.2, magIn: 0.54, charge: 0.78 },
});

/** Where the right hand goes to holster / draw, per carry slot (body space: x right, y up, z forward). */
export type SwapReach = 'backL' | 'backC' | 'backR' | 'sling' | 'thigh';
const REACH: Record<SwapReach, [number, number, number]> = {
  // over the shoulder to the upper half of the gun on the back
  backL: [-0.06, 1.55, -0.18],
  backC: [0.0, 1.55, -0.2],
  backR: [0.08, 1.5, -0.2],
  // across to the left-hip sling
  sling: [-0.16, 1.0, 0.1],
  // down to the right thigh holster
  thigh: [0.21, 0.74, 0.0],
};
const BACK = (r: SwapReach): boolean => r === 'backL' || r === 'backC' || r === 'backR';

function swapClip(from: SwapReach, to: SwapReach) {
  const f = REACH[from];
  const t = REACH[to];
  return makeClip({
    name: `swap ${from}>${to}`,
    duration: 1,
    keys: {
      grip: [0, 1, 0.12, 1, 0.22, 0, 0.8, 0, 0.88, 1],
      offGrip: [0, 1, 0.1, 0, 0.86, 0, 0.94, 1],
      // out to the outgoing gun's slot (holstered at 0.38), on to the incoming one's (taken at 0.58), then
      // up to the aim pocket (in the pocket at 0.8)
      hRX: [0, 0.18, 0.26, f[0], 0.38, f[0], 0.52, t[0], 0.6, t[0], 0.8, 0.18],
      hRY: [0, 1.25, 0.26, f[1], 0.38, f[1], 0.52, t[1], 0.6, t[1], 0.8, 1.25],
      hRZ: [0, 0.25, 0.26, f[2], 0.38, f[2], 0.52, t[2], 0.6, t[2], 0.8, 0.25],
      hLX: [0, -0.18, 1, -0.18],
      hLY: [0, 1.05, 0.5, 1.0, 1, 1.05],
      hLZ: [0, 0.12, 1, 0.12],
      wpPitch: [0, 0, 0.2, 0.5, 0.75, 0.45, 1, 0],
      // the chest turns towards the reach (right shoulder / left hip / right thigh)
      spYaw: [0, 0, 0.26, BACK(from) ? 0.16 : from === 'sling' ? -0.3 : 0.08, 0.38, BACK(from) ? 0.18 : from === 'sling' ? -0.32 : 0.1, 0.56, BACK(to) ? 0.14 : to === 'sling' ? -0.3 : 0.08, 1, 0],
      spPitch: [0, 0, 0.35, BACK(from) ? 0 : 0.16, 0.56, BACK(to) ? 0 : 0.14, 1, 0],
      hdPitch: [0, 0, 0.35, 0.08, 1, 0],
    },
    events: { holstered: 0.38, drawn: 0.58 },
  });
}

/**
 * Weapon swap (0.9 s): both hands come off, the right hand takes the gun to its slot (back, sling or
 * thigh; holstered at 0.45) and draws the next from its slot. One clip per (from, to) pair, built once.
 */
const SWAPS = new Map<string, ReturnType<typeof makeClip>>();
export function swapClipFor(from: SwapReach, to: SwapReach): ReturnType<typeof makeClip> {
  const key = `${from}>${to}`;
  let c = SWAPS.get(key);
  if (!c) {
    c = swapClip(from, to);
    SWAPS.set(key, c);
  }
  return c;
}
export const SWAP = swapClipFor('backC', 'backC');

/** Grenade (1.2 s): off hand to the vest, pin, wind up behind the head, throw (release), recover. */
export const GRENADE = makeClip({
  name: 'grenade',
  duration: 1,
  keys: {
    offGrip: [0, 1, 0.06, 0, 0.88, 0, 0.98, 1],
    hLX: [0, -0.1, 0.18, -0.08, 0.3, 0.02, 0.4, -0.05, 0.52, -0.22, 0.6, -0.15, 0.7, -0.02, 0.85, -0.1],
    hLY: [0, 1.15, 0.18, 1.18, 0.3, 1.25, 0.4, 1.3, 0.52, 1.66, 0.6, 1.62, 0.7, 1.45, 0.85, 1.15],
    hLZ: [0, 0.18, 0.18, 0.13, 0.3, 0.22, 0.4, 0.2, 0.52, -0.12, 0.6, 0.05, 0.7, 0.55, 0.85, 0.2],
    wpPitch: [0, 0, 0.15, 0.6, 0.8, 0.6, 1, 0],
    wpX: [0, 0, 0.15, 0.06, 0.8, 0.06, 1, 0],
    spYaw: [0, 0, 0.45, 0.35, 0.56, 0.42, 0.68, -0.32, 0.82, -0.1, 1, 0],
    spPitch: [0, 0, 0.5, -0.08, 0.66, 0.12, 0.85, 0.02, 1, 0],
    pelYaw: [0, 0, 0.5, 0.12, 0.68, -0.12, 1, 0],
    hdPitch: [0, 0, 0.2, 0.15, 0.4, 0.1, 0.55, -0.1, 0.75, 0, 1, 0],
  },
  events: { pin: 0.32, release: 0.68 },
});

/**
 * Cover entry (0.8 s), side-signed channels (scaled by the wall side): the lead hand reaches for the
 * wall before contact, the shoulder settles against it.
 */
export const COVER_ENTER_SIDE = makeClip({
  name: 'coverEnterSide',
  duration: 0.8,
  keys: {
    pelX: [0, 0, 0.35, 0.05, 0.55, 0.035, 0.8, 0.03],
    spRoll: [0, 0, 0.35, 0.09, 0.55, 0.05, 0.8, 0.05],
    pelRoll: [0, 0, 0.4, 0.05, 0.8, 0.04],
  },
});
/** Cover entry, unsigned channels: the off hand goes to the wall, the body sinks and settles. */
export const COVER_ENTER = makeClip({
  name: 'coverEnter',
  duration: 0.8,
  keys: {
    offCover: [0, 0, 0.18, 0.4, 0.42, 1, 0.8, 0.8],
    pelY: [0, 0, 0.4, -0.03, 0.6, -0.012, 0.8, -0.015],
    pelPitch: [0, 0, 0.35, 0.08, 0.8, 0.03],
    hdPitch: [0, 0, 0.3, 0.06, 0.8, 0],
  },
});

/** Leaving cover (0.5 s): push off the wall, weapon comes off the compressed carry. */
export const COVER_EXIT = makeClip({
  name: 'coverExit',
  duration: 0.5,
  keys: {
    pelPitch: [0, 0, 0.2, -0.06, 0.5, 0],
    pelY: [0, 0, 0.18, 0.012, 0.5, 0],
    spPitch: [0, 0, 0.25, -0.04, 0.5, 0],
  },
});

/** Start from standstill (0.3 s shift, then fades during the first step): load the support foot. */
export const START_SHIFT = makeClip({
  name: 'startShift',
  duration: 0.7,
  keys: {
    // support = left foot (the right steps first): hips over the left foot, slight drop and lean
    pelX: [0, 0, 0.3, -0.035, 0.7, 0],
    pelY: [0, 0, 0.25, -0.012, 0.7, 0],
    pelRoll: [0, 0, 0.3, -0.03, 0.7, 0],
    pelPitch: [0, 0, 0.3, 0.05, 0.7, 0],
  },
});

/** Settling after a stop (0.55 s): weight comes back over both feet, a small dip and recovery. */
export const STOP_SETTLE = makeClip({
  name: 'stopSettle',
  duration: 0.55,
  keys: {
    pelY: [0, 0, 0.15, -0.016, 0.35, 0.003, 0.55, 0],
    pelPitch: [0, 0, 0.12, -0.04, 0.3, 0.015, 0.55, 0],
    spPitch: [0, 0, 0.15, 0.02, 0.4, -0.006, 0.55, 0],
  },
});

/** Planted pivot (normalized): sink onto the pivot foot, turn, push off. */
export const PIVOT = makeClip({
  name: 'pivot',
  duration: 1,
  keys: {
    pelY: [0, 0, 0.35, -0.03, 0.7, -0.02, 1, 0],
    pelPitch: [0, 0, 0.35, -0.05, 0.65, 0.06, 1, 0],
    spPitch: [0, 0, 0.4, 0.03, 1, 0],
  },
});

/** Vault (normalized): plant the off hand, weight over the arms, legs swing over, land soft. */
export const VAULT = makeClip({
  name: 'vault',
  duration: 1,
  keys: {
    offGrip: [0, 1, 0.12, 0, 0.75, 0, 0.92, 1],
    hLX: [0, -0.2, 1, -0.2],
    hLY: [0, 1.0, 0.25, 0.95, 0.5, 0.75, 0.7, 0.85, 1, 1.0],
    hLZ: [0, 0.3, 0.25, 0.4, 0.5, 0.15, 0.7, 0.0, 1, 0.2],
    pelPitch: [0, 0, 0.2, 0.35, 0.5, 0.45, 0.8, 0.2, 0.9, 0.3, 1, 0.1],
    pelRoll: [0, 0, 0.35, 0.2, 0.6, 0.15, 1, 0],
    pelY: [0, 0, 0.2, -0.08, 0.5, -0.12, 0.8, -0.15, 0.9, -0.16, 1, -0.11],
    fLY: [0, 0, 0.3, 0.25, 0.6, 0.35, 0.85, 0.05, 1, 0],
    fRY: [0, 0, 0.3, 0.3, 0.6, 0.38, 0.85, 0.05, 1, 0],
    fLZ: [0, 0, 0.5, 0.1, 1, 0],
    wpPitch: [0, 0, 0.2, -0.6, 0.8, -0.5, 1, 0],
    spPitch: [0, 0, 0.5, 0.15, 1, 0],
  },
});

/** Mantle (normalized): both hands up on the edge, pull, knee up, stand. */
export const MANTLE = makeClip({
  name: 'mantle',
  duration: 1,
  keys: {
    grip: [0, 1, 0.1, 0, 0.82, 0, 0.95, 1],
    offGrip: [0, 1, 0.1, 0, 0.85, 0, 0.97, 1],
    hLX: [0, -0.2, 1, -0.2],
    hRX: [0, 0.2, 1, 0.2],
    hLY: [0, 1.4, 0.2, 1.75, 0.55, 1.2, 0.8, 1.1, 1, 1.1],
    hRY: [0, 1.4, 0.2, 1.75, 0.55, 1.2, 0.8, 1.1, 1, 1.1],
    hLZ: [0, 0.3, 0.2, 0.42, 0.55, 0.3, 1, 0.2],
    hRZ: [0, 0.3, 0.2, 0.42, 0.55, 0.3, 1, 0.2],
    pelPitch: [0, 0, 0.25, 0.25, 0.6, 0.55, 0.85, 0.2, 1, 0.08],
    pelY: [0, 0, 0.25, -0.05, 0.6, -0.25, 0.85, -0.1, 1, -0.04],
    fLY: [0, 0, 0.35, 0.15, 0.6, 0.45, 0.8, 0.1, 1, 0],
    fLZ: [0, 0, 0.6, 0.2, 1, 0],
    fRY: [0, 0, 0.6, 0.12, 0.85, 0.2, 1, 0],
    wpPitch: [0, 0, 0.15, -0.9, 0.85, -0.8, 1, 0],
  },
});

/** Step up (normalized): high knee, drive up over the lead leg. */
export const STEP_UP = makeClip({
  name: 'stepUp',
  duration: 1,
  keys: {
    fLY: [0, 0, 0.35, 0.28, 0.6, 0.1, 1, 0],
    fLZ: [0, 0, 0.35, 0.2, 1, 0],
    pelPitch: [0, 0, 0.4, 0.2, 0.8, 0.1, 1, 0.05],
    pelY: [0, 0, 0.4, -0.06, 0.75, -0.02, 1, 0],
  },
});

/** Drop off a ledge (normalized): crouch and push off, then a heavy landing absorbed in the knees. */
export const DROP = makeClip({
  name: 'drop',
  duration: 1,
  keys: {
    pelY: [0, 0, 0.3, -0.12, 0.6, -0.04, 1, -0.08],
    pelPitch: [0, 0, 0.3, 0.25, 0.7, 0.15, 1, 0.2],
    fLY: [0, 0, 0.5, 0.12, 1, 0.05],
    fRY: [0, 0, 0.5, 0.08, 1, 0.03],
  },
});

/** Dash-in slide (normalized): low, lead leg forward, trail leg folded, brace with the off hand. */
export const SLIDE = makeClip({
  name: 'slide',
  duration: 1,
  keys: {
    pelY: [0, -0.1, 0.25, -0.5, 0.7, -0.52, 1, -0.4],
    pelPitch: [0, 0.3, 0.3, -0.12, 0.7, -0.08, 1, 0.15],
    fLZ: [0, 0, 0.3, 0.45, 0.8, 0.35, 1, 0.25],
    fLY: [0, 0, 0.2, 0.04, 1, 0],
    fRZ: [0, 0, 0.3, -0.25, 1, -0.3],
    fRY: [0, 0, 0.3, 0.06, 1, 0.07],
    fRPitch: [0, 0, 0.3, 1.0, 1, 1.1],
    offGrip: [0, 1, 0.3, 0.2, 0.8, 0.2, 1, 1],
    hLX: [0, -0.3, 1, -0.3],
    hLY: [0, 0.5, 1, 0.5],
    hLZ: [0, 0.1, 1, 0.1],
  },
});

/** Landing compression after a drop (timed). */
export const LAND = makeClip({
  name: 'land',
  duration: 0.6,
  keys: {
    pelY: [0, 0, 0.12, -0.16, 0.35, -0.05, 0.6, 0],
    pelPitch: [0, 0, 0.12, 0.25, 0.4, 0.06, 0.6, 0],
    spPitch: [0, 0, 0.12, -0.1, 0.4, 0, 0.6, 0],
  },
});
