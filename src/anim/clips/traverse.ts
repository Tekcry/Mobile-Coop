/**
 * Attached traversal poses (authored in code): the hang family and the climb / crawl cycles. Keyed over a
 * normalised clock (duration 1): poses hold, cycles are sampled at the climb cadence (`traverseT` = the
 * phase of the hand-over-hand / rung cycle). Root-space metres at 1.75 m, radians.
 *
 * The hands' channels here are only the fallback: while attached, the rig puts the hands on the anchor's
 * world grips (`CharacterRig.reachL/R`) and the feet on rungs or wall pads (`plantL/R`). These clips set
 * the body around them: hanging long under the hands, knees soft, chest to the wall on a climb, low
 * and flat in a crawl. Weapons are holstered while attached (grip weights 0).
 */
import { makeClip } from '../clip';

/** Hanging from a lip / pipe / cable: arms overhead, body long, knees soft, feet together and slightly
 *  forward (a dead hang swings a little; the controller adds that). */
export const HANG = makeClip({
  name: 'hang',
  duration: 1,
  keys: {
    grip: [0, 0, 1, 0],
    offGrip: [0, 0, 1, 0],
    hLX: [0, -0.22, 1, -0.22],
    hRX: [0, 0.22, 1, 0.22],
    hLY: [0, 2.05, 1, 2.05],
    hRY: [0, 2.05, 1, 2.05],
    hLZ: [0, 0.22, 1, 0.22],
    hRZ: [0, 0.22, 1, 0.22],
    pelPitch: [0, -0.06, 1, -0.06],
    spPitch: [0, -0.1, 1, -0.1],
    hdPitch: [0, -0.15, 1, -0.15],
    // feet a little back from the wall (the shins hang plumb, clear of the face)
    fLZ: [0, -0.06, 1, -0.06],
    fRZ: [0, -0.08, 1, -0.08],
    fLY: [0, 0.04, 1, 0.04],
    fRY: [0, 0.02, 1, 0.02],
    width: [0, 0.6, 1, 0.6],
    wpPitch: [0, -0.9, 1, -0.9],
  },
});

/** Ladder / drainpipe climb cycle (one full cycle = two reaches: right hand + left foot, then left hand +
 *  right foot). Chest close to the rungs, hips back a little, head up. */
export const CLIMB = makeClip({
  name: 'climb',
  duration: 1,
  loop: true,
  keys: {
    grip: [0, 0, 1, 0],
    offGrip: [0, 0, 1, 0],
    hLX: [0, -0.2, 1, -0.2],
    hRX: [0, 0.2, 1, 0.2],
    hLY: [0, 1.45, 0.25, 1.6, 0.5, 1.75, 0.75, 1.6, 1, 1.45],
    hRY: [0, 1.75, 0.25, 1.6, 0.5, 1.45, 0.75, 1.6, 1, 1.75],
    hLZ: [0, 0.25, 1, 0.25],
    hRZ: [0, 0.25, 1, 0.25],
    fLY: [0, 0.3, 0.25, 0.15, 0.5, 0, 0.75, 0.15, 1, 0.3],
    fRY: [0, 0, 0.25, 0.15, 0.5, 0.3, 0.75, 0.15, 1, 0],
    // (the feet are on the rungs / the wall by the rig's plants; unplanted they stay plumb under the hips)
    fLZ: [0, 0, 1, 0],
    fRZ: [0, 0, 1, 0],
    // upright and in close to the climb: hips over the feet, chest to the rungs, head up a little; the body
    // rises with each push of the stepping leg
    pelY: [0, -0.04, 0.25, 0, 0.5, -0.04, 0.75, 0, 1, -0.04],
    pelPitch: [0, 0.04, 0.5, 0.02, 1, 0.04],
    pelRoll: [0, 0.04, 0.5, -0.04, 1, 0.04],
    spPitch: [0, 0.06, 1, 0.06],
    hdPitch: [0, -0.12, 1, -0.12],
    width: [0, 0.75, 1, 0.75],
    wpPitch: [0, -0.9, 1, -0.9],
  },
});

/** Crouch-crawl in a duct: low on hands and knees, head up, the cycle trading diagonal pairs. */
export const CRAWL = makeClip({
  name: 'crawl',
  duration: 1,
  loop: true,
  keys: {
    grip: [0, 0, 1, 0],
    offGrip: [0, 0, 1, 0],
    pelY: [0, -0.54, 0.25, -0.52, 0.5, -0.54, 0.75, -0.52, 1, -0.54],
    // the rig's spine counters most of the pelvis pitch: chest pitch ~ 0.4 * pelvis + spine (here ~1.57 rad: the
    // back flat, so the long guns on it lie along it under the duct's roof)
    pelPitch: [0, 1.0, 1, 1.0],
    spPitch: [0, 1.17, 1, 1.17],
    hdPitch: [0, -0.9, 1, -0.9],
    hLX: [0, -0.18, 1, -0.18],
    hRX: [0, 0.18, 1, 0.18],
    hLY: [0, 0.08, 0.25, 0.14, 0.5, 0.08, 1, 0.08],
    hRY: [0, 0.08, 0.5, 0.08, 0.75, 0.14, 1, 0.08],
    hLZ: [0, 0.55, 0.25, 0.68, 0.5, 0.42, 1, 0.55],
    hRZ: [0, 0.55, 0.5, 0.68, 0.75, 0.42, 1, 0.55],
    fLZ: [0, -0.5, 0.5, -0.38, 1, -0.5],
    fRZ: [0, -0.38, 0.5, -0.5, 1, -0.38],
    fLY: [0, 0.1, 1, 0.1],
    fRY: [0, 0.1, 1, 0.1],
    fLPitch: [0, 1.3, 1, 1.3],
    fRPitch: [0, 1.3, 1, 1.3],
    wpPitch: [0, -0.9, 1, -0.9],
  },
});

/** Landing roll (normalised): tuck, the rig tumbles the body a full turn forward (`rollTumble`), feet come
 *  back under it, rise into the run. The tuck keeps the curled body about a shoulder's width off the floor. */
export const ROLL = makeClip({
  name: 'roll',
  duration: 1,
  keys: {
    pelY: [0, -0.2, 0.15, -0.5, 0.7, -0.5, 0.9, -0.3, 1, -0.05],
    pelPitch: [0, 0.3, 0.15, 0.7, 0.7, 0.7, 1, 0.1],
    spPitch: [0, 0.2, 0.15, 0.6, 0.7, 0.6, 1, 0.05],
    hdPitch: [0, 0.3, 0.15, 0.7, 0.7, 0.7, 1, 0],
    fLY: [0, 0.05, 0.2, 0.35, 0.7, 0.35, 0.9, 0.08, 1, 0],
    fRY: [0, 0.05, 0.2, 0.3, 0.7, 0.3, 0.9, 0.05, 1, 0],
    fLZ: [0, 0, 0.2, 0.2, 0.7, 0.2, 1, 0],
    fRZ: [0, -0.05, 0.2, 0.15, 0.7, 0.15, 1, -0.05],
    wpPitch: [0, 0, 0.2, -0.5, 0.8, -0.5, 1, 0],
    offGrip: [0, 1, 0.15, 0.6, 0.85, 0.6, 1, 1],
  },
});

/** Body tumble (rad) through a roll at progress t: a full turn between the tuck and the rise. */
export function rollTumble(t: number): number {
  const k = Math.max(0, Math.min(1, (t - 0.12) / 0.72));
  return Math.PI * 2 * k * k * (3 - 2 * k);
}

/** Climbing up from a hang (normalised): pull up with the feet walking up the face behind the body, the knee
 *  comes over onto the top only once the hips are above the lip, then stand. */
export const CLIMB_UP = makeClip({
  name: 'climbUp',
  duration: 1,
  keys: {
    grip: [0, 0, 1, 0],
    offGrip: [0, 0, 0.9, 0, 1, 1],
    pelPitch: [0, 0, 0.35, 0.2, 0.62, 0.35, 0.85, 0.15, 1, 0.05],
    spPitch: [0, -0.05, 0.45, 0.25, 0.7, 0.2, 1, 0],
    hdPitch: [0, -0.2, 0.5, 0.1, 1, 0],
    fLY: [0, 0.05, 0.35, 0.2, 0.55, 0.3, 0.7, 0.45, 0.85, 0.1, 1, 0],
    fRY: [0, 0.05, 0.4, 0.15, 0.6, 0.2, 0.8, 0.25, 0.92, 0.05, 1, 0],
    fLZ: [0, -0.1, 0.55, -0.12, 0.72, 0.15, 1, 0],
    fRZ: [0, -0.12, 0.6, -0.14, 0.85, 0.05, 1, 0],
    pelY: [0, 0, 0.6, -0.1, 0.8, -0.2, 1, 0],
    hLY: [0, 2.0, 0.4, 1.3, 0.7, 1.0, 1, 1.0],
    hRY: [0, 2.0, 0.4, 1.3, 0.7, 1.0, 1, 1.0],
    hLZ: [0, 0.25, 1, 0.25],
    hRZ: [0, 0.25, 1, 0.25],
    wpPitch: [0, -0.9, 0.9, -0.8, 1, 0],
  },
});

/** Dropping through a ceiling vent (normalised over the lowering): from the crawl, the hips swing down through the
 *  hole while the chest comes upright, hanging on the edges by the end (the root drops at the same time, so the
 *  head stays inside the duct until it is over the hole). */
export const VENT_DROP = makeClip({
  name: 'ventDrop',
  duration: 1,
  keys: {
    grip: [0, 0, 1, 0],
    offGrip: [0, 0, 1, 0],
    pelPitch: [0, 1.0, 0.65, 0, 1, -0.06],
    spPitch: [0, 1.05, 0.65, -0.05, 1, -0.1],
    pelY: [0, -0.5, 0.55, -0.15, 1, 0],
    hdPitch: [0, -0.9, 0.7, -0.2, 1, -0.15],
    fLZ: [0, -0.5, 0.6, -0.06, 1, -0.06],
    fRZ: [0, -0.38, 0.6, -0.08, 1, -0.08],
    fLY: [0, 0.1, 1, 0.04],
    fRY: [0, 0.1, 1, 0.02],
    fLPitch: [0, 1.3, 0.6, 0, 1, 0],
    fRPitch: [0, 1.3, 0.6, 0, 1, 0],
    // hands tucked in at the chest while the shoulders pass the hole, then up for the edges
    hLX: [0, -0.12, 1, -0.16],
    hRX: [0, 0.12, 1, 0.16],
    hLY: [0, 0.6, 0.5, 1.3, 1, 1.95],
    hRY: [0, 0.6, 0.5, 1.3, 1, 1.95],
    hLZ: [0, 0.15, 1, 0.08],
    hRZ: [0, 0.15, 1, 0.08],
    width: [0, 1, 1, 0.6],
    wpPitch: [0, -0.9, 1, -0.9],
  },
});

/** Vaulting through a window (normalised): dip, hands on the sill, a low dive with the body near horizontal and
 *  the legs tucked through the 1.2 m opening, land, rise. */
export const WINDOW_VAULT = makeClip({
  name: 'windowVault',
  duration: 1,
  keys: {
    grip: [0, 1, 0.15, 0, 0.8, 0, 0.95, 1],
    offGrip: [0, 1, 0.12, 0, 0.8, 0, 0.95, 1],
    pelY: [0, 0, 0.2, -0.25, 0.45, -0.45, 0.7, -0.4, 0.9, -0.15, 1, -0.05],
    pelPitch: [0, 0, 0.2, 0.4, 0.45, 0.75, 0.65, 0.6, 0.85, 0.2, 1, 0.05],
    spPitch: [0, 0, 0.2, 0.35, 0.45, 0.85, 0.65, 0.7, 0.85, 0.2, 1, 0],
    hdPitch: [0, 0, 0.3, -0.5, 0.65, -0.5, 1, 0],
    fLY: [0, 0, 0.3, 0.35, 0.6, 0.45, 0.85, 0.05, 1, 0],
    fRY: [0, 0, 0.3, 0.4, 0.6, 0.5, 0.85, 0.05, 1, 0],
    fLZ: [0, 0, 0.45, -0.1, 0.7, 0.1, 1, 0],
    hLX: [0, -0.2, 1, -0.2],
    hRX: [0, 0.2, 1, 0.2],
    hLY: [0, 1.0, 0.25, 0.95, 0.5, 0.7, 0.8, 0.9, 1, 1.0],
    hRY: [0, 1.0, 0.25, 0.95, 0.5, 0.7, 0.8, 0.9, 1, 1.0],
    hLZ: [0, 0.3, 0.25, 0.45, 0.5, 0.2, 1, 0.2],
    hRZ: [0, 0.3, 0.25, 0.45, 0.5, 0.2, 1, 0.2],
    wpPitch: [0, 0, 0.2, -0.7, 0.8, -0.6, 1, 0],
  },
});

// --- 3.2.0 Chaos Theory: split jump, wall jump, pipe legs up / inverted

/** Braced in a split between two walls (the rig plants the feet on the walls and the hands beside the chest): the
 *  hips sink between the legs, back upright, head level, arms out to the walls. */
export const SPLIT_BRACE = makeClip({
  name: 'split',
  duration: 1,
  keys: {
    grip: [0, 0, 1, 0],
    offGrip: [0, 0, 1, 0],
    pelY: [0, -0.46, 1, -0.46],
    pelPitch: [0, 0.05, 1, 0.05],
    spPitch: [0, -0.04, 1, -0.04],
    hdPitch: [0, 0.05, 1, 0.05],
    width: [0, 2.6, 1, 2.6],
    fLY: [0, 0, 1, 0],
    fRY: [0, 0, 1, 0],
    hLX: [0, -0.62, 1, -0.62],
    hRX: [0, 0.62, 1, 0.62],
    hLY: [0, 1.0, 1, 1.0],
    hRY: [0, 1.0, 1, 1.0],
    hLZ: [0, 0.12, 1, 0.12],
    hRZ: [0, 0.12, 1, 0.12],
    wpPitch: [0, -0.9, 1, -0.9],
  },
});

/** Wall jump (normalised over the run-up kick into the hang): a step in, the right foot kicks off the wall high,
 *  the body rises with the arms reaching for the lip, the legs trail into the hang. */
export const WALL_KICK = makeClip({
  name: 'wallKick',
  duration: 1,
  keys: {
    grip: [0, 0, 1, 0],
    offGrip: [0, 0, 1, 0],
    pelY: [0, -0.12, 0.25, -0.05, 0.5, 0, 1, 0],
    pelPitch: [0, 0.15, 0.3, -0.1, 0.6, -0.08, 1, -0.06],
    spPitch: [0, 0.2, 0.3, -0.1, 0.7, -0.1, 1, -0.1],
    hdPitch: [0, -0.1, 0.4, -0.35, 1, -0.15],
    fRY: [0, 0, 0.15, 0.25, 0.35, 0.55, 0.55, 0.2, 1, 0.02],
    fRZ: [0, 0, 0.2, 0.25, 0.35, 0.35, 0.6, 0, 1, -0.08],
    fLY: [0, 0.05, 0.3, 0.1, 0.6, 0.15, 1, 0.04],
    fLZ: [0, -0.05, 0.4, -0.15, 1, -0.06],
    hLX: [0, -0.25, 1, -0.22],
    hRX: [0, 0.25, 1, 0.22],
    hLY: [0, 1.0, 0.4, 1.6, 0.7, 2.05, 1, 2.05],
    hRY: [0, 1.0, 0.35, 1.7, 0.65, 2.05, 1, 2.05],
    hLZ: [0, 0.3, 0.5, 0.35, 1, 0.22],
    hRZ: [0, 0.3, 0.5, 0.35, 1, 0.22],
    width: [0, 0.8, 1, 0.6],
    wpPitch: [0, -0.9, 1, -0.9],
  },
});

/** Legs up on a horizontal pipe (body frame before the tumble lays it back): arms overhead to the pipe, hips
 *  flexed so the legs come up and cross over it, head turned to look along the body. */
export const PIPE_LEGS_UP = makeClip({
  name: 'pipeLegs',
  duration: 1,
  keys: {
    grip: [0, 0, 1, 0],
    offGrip: [0, 0, 1, 0],
    pelPitch: [0, -0.25, 1, -0.25],
    spPitch: [0, 0.1, 1, 0.1],
    hdPitch: [0, 0.45, 1, 0.45],
    fLY: [0, 0.3, 1, 0.3],
    fRY: [0, 0.32, 1, 0.32],
    fLZ: [0, 0.45, 1, 0.45],
    fRZ: [0, 0.47, 1, 0.47],
    width: [0, 0.4, 1, 0.4],
    hLX: [0, -0.1, 1, -0.1],
    hRX: [0, 0.1, 1, 0.1],
    hLY: [0, 1.9, 1, 1.9],
    hRY: [0, 1.9, 1, 1.9],
    hLZ: [0, 0.35, 1, 0.35],
    hRZ: [0, 0.35, 1, 0.35],
    wpPitch: [0, -0.9, 1, -0.9],
  },
});

/** Hanging inverted by the knees (body frame before the tumble turns it over): knees bent hooking the pipe, back
 *  long, arms hanging past the head (overhead in the body frame), head lifted to look ahead. */
export const PIPE_INVERTED = makeClip({
  name: 'pipeInv',
  duration: 1,
  keys: {
    grip: [0, 0, 1, 0],
    offGrip: [0, 0, 1, 0],
    pelPitch: [0, 0.1, 1, 0.1],
    spPitch: [0, -0.05, 1, -0.05],
    hdPitch: [0, -0.35, 1, -0.35],
    fLY: [0, 0.35, 1, 0.35],
    fRY: [0, 0.35, 1, 0.35],
    fLZ: [0, -0.32, 1, -0.32],
    fRZ: [0, -0.32, 1, -0.32],
    width: [0, 0.7, 1, 0.7],
    hLX: [0, -0.22, 1, -0.22],
    hRX: [0, 0.22, 1, 0.22],
    hLY: [0, 2.0, 1, 2.0],
    hRY: [0, 2.0, 1, 2.0],
    hLZ: [0, 0.05, 1, 0.05],
    hRZ: [0, 0.05, 1, 0.05],
    wpPitch: [0, -0.9, 1, -0.9],
  },
});
