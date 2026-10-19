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

/**
 * Hanging from a lip / pipe / cable: arms overhead, body long, knees soft, feet together and slightly forward.
 * (ct-prototype G4, AUDIT-TRAVERSAL #5 / AUDIT-EXTRA-NEW #8) A looping clip over the pendulum: `traverseT` 0 hangs plumb,
 * +0.25 swings the hips and legs a full `HANG_SWING.max` (0.3 rad) to the body's right about the hands, -0.25 (0.75) to
 * the left (`AttachGrips.cadence`): the legs swing from the hips (the feet 0.45 m out, a little up), the pelvis follows
 * part way (0.08 m) and the trunk tilts back so the shoulders stay under the hands (a full-body swing about the hands
 * took the shoulders 17 cm off a straight-arm grip: e2e-traverse shimmy reach 17.9 cm). Sideways only, so the feet
 * never swing into the wall.
 */
export const HANG = makeClip({
  name: 'hang',
  duration: 1,
  loop: true,
  keys: {
    grip: [0, 0],
    offGrip: [0, 0],
    hLX: [0, -0.22],
    hRX: [0, 0.22],
    hLY: [0, 2.05],
    hRY: [0, 2.05],
    hLZ: [0, 0.22],
    hRZ: [0, 0.22],
    pelPitch: [0, -0.06],
    spPitch: [0, -0.1],
    hdPitch: [0, -0.15],
    pelX: [0, 0, 0.25, 0.08, 0.75, -0.08],
    pelY: [0, 0, 0.25, 0.02, 0.75, 0.02],
    pelRoll: [0, 0, 0.25, 0.3, 0.75, -0.3],
    spRoll: [0, 0, 0.25, 0.14, 0.75, -0.14],
    // feet a little back from the wall (the shins hang plumb, clear of the face), together, swinging with the hips
    fLX: [0, 0, 0.25, 0.45, 0.75, -0.45],
    fRX: [0, 0, 0.25, 0.45, 0.75, -0.45],
    fLZ: [0, -0.06],
    fRZ: [0, -0.08],
    fLY: [0, 0.04, 0.25, 0.1, 0.75, 0.1],
    fRY: [0, 0.02, 0.25, 0.08, 0.75, 0.08],
    width: [0, 0.6],
    wpPitch: [0, -0.9],
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

/**
 * (ct-prototype G4, AUDIT-TRAVERSAL #2, CT 054411 3.4-5.7) Up / down a drainpipe: an inchworm, not a ladder. Keyed over
 * how drawn up the feet are (`AttachGrips.cadence`: 0 legs long, 1 knees at hip height): the pair of feet on the wall
 * either side of the pipe (the rig's plants) step up together after each hand reach, then the legs push the body up
 * as it rises past them. The hips sit a little low while the feet are drawn up and rise as the legs straighten, so the
 * body surges up on the push (about 1.2x the climb's pace) and slows while the feet re-grip (about 0.6x); the hips
 * fold in the compact pose with the chest to the pipe and the head up. No side-to-side roll (the feet are together).
 */
export const PIPE_CLIMB = makeClip({
  name: 'pipeClimb',
  duration: 1,
  keys: {
    grip: [0, 0],
    offGrip: [0, 0],
    hLX: [0, -0.15],
    hRX: [0, 0.15],
    hLY: [0, 1.5],
    hRY: [0, 1.65],
    hLZ: [0, 0.28],
    hRZ: [0, 0.28],
    // (unplanted fallback: the rig's plants hold the soles on the wall)
    fLY: [0, 0.05, 1, 0.45],
    fRY: [0, 0.05, 1, 0.45],
    fLZ: [0, 0],
    fRZ: [0, 0],
    pelY: [0, 0.05, 1, -0.05],
    pelPitch: [0, 0.06, 1, 0.3],
    spPitch: [0, 0.05, 1, 0.1],
    hdPitch: [0, -0.15, 1, -0.3],
    width: [0, 0.9],
    wpPitch: [0, -0.9],
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

/**
 * (ct-prototype G4, AUDIT-EXTRA-NEW #9, CT 110714 13.2-16.4) Crawling out of a wall vent (normalised over the 2.5 s exit,
 * `DUCT_CRAWL_OUT`): a hand reaches out over the lip (0.15), she slides out low on hands and knees (0 - 0.4), the hands
 * push the chest up and the feet come under her (0.4 - 0.8), and she ends in the crouched stance (1: CROUCH_IDLE's pelvis),
 * where the crouch takes over.
 */
export const CRAWL_OUT = makeClip({
  name: 'crawlOut',
  duration: 1,
  keys: {
    grip: [0, 0],
    offGrip: [0, 0],
    pelY: [0, -0.54, 0.4, -0.54, 0.6, -0.5, 0.8, -0.46, 1, -0.42],
    pelPitch: [0, 1.0, 0.4, 1.0, 0.6, 0.8, 0.8, 0.45, 1, 0.28],
    spPitch: [0, 1.17, 0.4, 1.1, 0.6, 0.6, 0.8, 0.15, 1, 0],
    hdPitch: [0, -0.9, 0.4, -0.85, 0.6, -0.5, 0.8, -0.15, 1, 0],
    hLX: [0, -0.18, 1, -0.2],
    hRX: [0, 0.18, 1, 0.2],
    hLY: [0, 0.08, 0.4, 0.08, 0.6, 0.3, 0.8, 0.6, 1, 0.75],
    hRY: [0, 0.08, 0.15, 0.16, 0.25, 0.08, 0.6, 0.3, 0.8, 0.6, 1, 0.75],
    hLZ: [0, 0.55, 0.4, 0.6, 0.6, 0.45, 0.8, 0.3, 1, 0.25],
    hRZ: [0, 0.55, 0.15, 0.75, 0.25, 0.65, 0.6, 0.45, 0.8, 0.3, 1, 0.25],
    fLZ: [0, -0.5, 0.4, -0.5, 0.6, -0.3, 0.8, -0.05, 1, 0],
    fRZ: [0, -0.38, 0.4, -0.38, 0.6, -0.2, 0.8, 0, 1, 0],
    fLY: [0, 0.1, 0.6, 0.1, 0.8, 0.03, 1, 0],
    fRY: [0, 0.1, 0.6, 0.1, 0.8, 0.03, 1, 0],
    fLPitch: [0, 1.3, 0.4, 1.3, 0.6, 0.9, 0.8, 0.2, 1, 0],
    fRPitch: [0, 1.3, 0.4, 1.3, 0.6, 0.9, 0.8, 0.2, 1, 0],
    width: [0, 1, 0.6, 1, 1, 1.35],
    wpPitch: [0, -0.9, 0.8, -0.9, 1, 0],
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

/**
 * Climbing up from a hang (normalised). (ct-prototype E2) Three phases, with the root path in attachController
 * (CLIMB_UP_PATH): pull up and press, chest to the lip, the feet walking up the face (0 - 0.5); the left knee onto the top,
 * the shin flat on it, the body low and pitched forward, the hands letting go of the lip (0.5 - 0.75); the right foot steps up
 * and she stands, the left foot coming through (0.75 - 1).
 * (F5) Over 1.3 s (CLIMB_UP_TIME): the pull-up and the knee keep their seconds (old k x 0.846), the knee is planted by
 * 0.56, the right foot steps up 0.6 - 0.74, and she stands from the knee in one smooth rise 0.72 - 1 (pelvis -0.5 -> 0
 * on a monotone ease: no hop, never above standing).
 * (G4, AUDIT-TRAVERSAL #6, CT 110522 52.8-54.1 and 110616 24.93-26.0: chest at the lip at 0.2 s, the lead knee raised
 * high outside the arm at 0.35 s, on the top at 0.4-0.5 s, crouched on top by 0.85 s, standing only with the stick held)
 * The clip still spans the full 1.3 s, retimed: the pull-up and the knee 0 - 0.36 (0.47 s, was 0.73 s), the left knee
 * swung wide (fLX), the right foot steps up 0.4 - 0.52 and the left comes through 0.5 - 0.63, crouched on both feet at
 * `CLIMB_UP_CROUCH_K` (0.85 s: where a climb-up without the stick held ends, crouched); the stand from the crouch runs
 * 0.654 - 1 (0.45 s, pelvis -0.42 -> 0 on a monotone ease).
 */
export const CLIMB_UP_CROUCH_K = 0.654;
export const CLIMB_UP = makeClip({
  name: 'climbUp',
  duration: 1,
  keys: {
    grip: [0, 0, 1, 0],
    offGrip: [0, 0, 0.56, 0, 0.654, 1, 1, 1],
    pelPitch: [0, 0, 0.19, 0.3, 0.3, 0.55, 0.42, 0.6, 0.654, 0.3, 0.85, 0.12, 1, 0.05],
    spPitch: [0, -0.05, 0.22, 0.3, 0.33, 0.25, 0.654, 0.02, 1, 0],
    hdPitch: [0, -0.2, 0.22, 0.1, 0.4, -0.15, 0.654, -0.05, 1, 0],
    // the crouch on top at 0.654 is the crouched stance's own (CROUCH_IDLE pelY -0.42, pelPitch ~0.28)
    pelY: [0, 0, 0.245, -0.12, 0.33, -0.5, 0.5, -0.5, 0.654, -0.42, 1, 0],
    // the left knee comes over the lip wide of the arm (0.27 - 0.3) and the shin lies on the top behind it (0.36 - 0.5),
    // then it comes through under the body (0.52 - 0.63)
    fLX: [0, 0, 0.2, -0.12, 0.3, -0.25, 0.36, -0.12, 0.5, -0.05, 0.63, 0, 1, 0],
    fLY: [0, 0.05, 0.2, 0.2, 0.3, 0.4, 0.36, 0.12, 0.5, 0.12, 0.57, 0.16, 0.63, 0, 1, 0],
    fLZ: [0, -0.1, 0.27, -0.12, 0.36, -0.38, 0.52, -0.38, 0.63, 0, 1, 0],
    fLPitch: [0, 0, 0.3, 0.6, 0.36, 1.2, 0.52, 1.2, 0.6, 0.3, 0.63, 0, 1, 0],
    // the right foot pushes on the face, then steps up onto the top in front (0.4 - 0.52)
    fRY: [0, 0.05, 0.22, 0.15, 0.4, 0.15, 0.45, 0.3, 0.52, 0.05, 0.6, 0, 1, 0],
    fRZ: [0, -0.12, 0.4, -0.15, 0.48, 0.2, 0.654, 0.06, 1, 0],
    // (the grips hold the hands on the lip until the knee is on, 0.38 - 0.5; the clip's hands meet them there)
    hLY: [0, 2.0, 0.22, 1.3, 0.33, 0.35, 0.47, 0.4, 0.654, 0.7, 1, 1.0],
    hRY: [0, 2.0, 0.22, 1.3, 0.33, 0.35, 0.47, 0.4, 0.654, 0.7, 1, 1.0],
    hLZ: [0, 0.25, 0.33, 0.45, 0.47, 0.4, 0.654, 0.3, 1, 0.25],
    hRZ: [0, 0.25, 0.33, 0.45, 0.47, 0.4, 0.654, 0.3, 1, 0.25],
    wpPitch: [0, -0.9, 0.56, -0.8, 0.654, 0, 1, 0],
  },
});

/**
 * (ct-prototype D+E fix r1) The team climb-ups (boost, relay, the two-person rope top: teamController) keep the old
 * one-rise clip: they have no ledge grips to hold, so the ledge clip's knee plant and hand release do not fit them.
 */
export const CLIMB_UP_TEAM = makeClip({
  name: 'climbUpTeam',
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
    fLY: [0, 0, 1, 0],
    fRY: [0, 0, 1, 0],
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
    fLY: [0, 0, 1, 0],
    fRY: [0, 0, 1, 0],
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

/** On a rappel rope (3.2.0 phase 3): leaning back off the wall from the feet on it, legs long towards the wall, one
 *  hand up the rope and the brake hand at the hip (the rig's reaches); `traverseT` is the kick-out swing (0..1:
 *  the knees fold as the body swings out and extend as the feet come back to the wall). */
export const RAPPEL_HANG = makeClip({
  name: 'rappel',
  duration: 1,
  keys: {
    grip: [0, 0, 1, 0],
    offGrip: [0, 0, 1, 0],
    pelY: [0, -0.15, 0.5, -0.25, 1, -0.15],
    pelPitch: [0, -0.45, 0.5, -0.25, 1, -0.45],
    spPitch: [0, 0.25, 1, 0.25],
    hdPitch: [0, 0.2, 1, 0.2],
    fLZ: [0, 0.42, 0.5, 0.2, 1, 0.42],
    fRZ: [0, 0.38, 0.5, 0.18, 1, 0.38],
    fLY: [0, 0.35, 0.5, 0.25, 1, 0.35],
    fRY: [0, 0.5, 0.5, 0.35, 1, 0.5],
    width: [0, 1.1, 1, 1.1],
    hLX: [0, -0.15, 1, -0.15],
    hRX: [0, 0.1, 1, 0.1],
    hLY: [0, 0.95, 1, 0.95],
    hRY: [0, 1.6, 1, 1.6],
    hLZ: [0, -0.05, 1, -0.05],
    hRZ: [0, 0.25, 1, 0.25],
    wpPitch: [0, -0.9, 1, -0.9],
  },
});

/** Braced for a team move (3.2.0 phase 5): back to the wall, knees bent, hands cupped low in front for a foot. */
export const BRACE = makeClip({
  name: 'brace',
  duration: 1,
  keys: {
    grip: [0, 0, 1, 0],
    offGrip: [0, 0, 1, 0],
    pelY: [0, -0.22, 1, -0.22],
    pelPitch: [0, 0.12, 1, 0.12],
    spPitch: [0, 0.18, 1, 0.18],
    hdPitch: [0, -0.15, 1, -0.15],
    width: [0, 1.3, 1, 1.3],
    fLZ: [0, 0.12, 1, 0.12],
    fRZ: [0, 0.12, 1, 0.12],
    hLX: [0, -0.05, 1, -0.05],
    hRX: [0, 0.05, 1, 0.05],
    hLY: [0, 0.78, 1, 0.78],
    hRY: [0, 0.78, 1, 0.78],
    hLZ: [0, 0.38, 1, 0.38],
    hRZ: [0, 0.38, 1, 0.38],
    wpPitch: [0, -0.9, 1, -0.9],
  },
});
