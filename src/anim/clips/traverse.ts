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
    fLZ: [0, 0.06, 1, 0.06],
    fRZ: [0, 0.03, 1, 0.03],
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
    hLY: [0, 1.55, 0.25, 1.75, 0.5, 1.95, 0.75, 1.75, 1, 1.55],
    hRY: [0, 1.95, 0.25, 1.75, 0.5, 1.55, 0.75, 1.75, 1, 1.95],
    hLZ: [0, 0.3, 1, 0.3],
    hRZ: [0, 0.3, 1, 0.3],
    fLY: [0, 0.3, 0.25, 0.15, 0.5, 0, 0.75, 0.15, 1, 0.3],
    fRY: [0, 0, 0.25, 0.15, 0.5, 0.3, 0.75, 0.15, 1, 0],
    fLZ: [0, 0.08, 1, 0.08],
    fRZ: [0, 0.08, 1, 0.08],
    pelZ: [0, -0.06, 1, -0.06],
    pelPitch: [0, 0.12, 0.5, 0.08, 1, 0.12],
    spPitch: [0, -0.05, 1, -0.05],
    hdPitch: [0, -0.2, 1, -0.2],
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
    pelY: [0, -0.5, 0.25, -0.48, 0.5, -0.5, 0.75, -0.48, 1, -0.5],
    // the rig's spine counters most of the pelvis pitch: chest pitch ~ 0.4 * pelvis + spine (here ~1.45 rad)
    pelPitch: [0, 1.0, 1, 1.0],
    spPitch: [0, 1.05, 1, 1.05],
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
