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
import { MANTLE_PATH, mantleAlong, mantleRise } from '../../player/traversePath';

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

/**
 * Roll (normalised; the CT forward roll and the landing roll). (anim-n4b, anim-natural PASS2 row 66 / AUDIT fix 28: it
 * was a full somersault about the hips 0.57 m up, feet overhead and off the ground, wrists 28 m/s) A grounded shoulder
 * roll: the rig's body path is `rollBody` (dive forward low onto the right shoulder, roll across the back about the
 * hips-to-feet line close to the floor, come up over the tucked feet); this clip curls the body round it: chin tucked,
 * feet together a little ahead under the hips (on the roll axis, so they never rise above the hips), the hands reaching
 * ahead to the floor as she goes down (0.1 - 0.25), tucked to the chest through the roll, out to the knees as she rises.
 * Hand channels in the body frame (the rig's free-hand targets turn with the body); the graph keeps them over its
 * default hanging hands (`TRAV_CLIP_HANDS`).
 */
export const ROLL = makeClip({
  name: 'roll',
  duration: 1,
  keys: {
    pelY: [0, -0.12, 0.25, -0.22, 0.72, -0.22, 0.9, -0.3, 1, -0.14],
    // the hips on the roll axis (it leans `ROLL_BODY.tilt` back up the body): they ride level through the spin
    pelZ: [0, 0, 0.2, -0.03, 0.78, -0.03, 1, 0],
    pelPitch: [0, 0.2, 0.25, 0.15, 0.72, 0.15, 0.9, 0.4, 1, 0.15],
    spPitch: [0, 0.15, 0.25, 0.12, 0.72, 0.12, 0.9, 0.25, 1, 0.05],
    hdPitch: [0, 0.2, 0.18, 0.45, 0.78, 0.45, 1, 0],
    width: [0, 1, 0.18, 0.35, 0.8, 0.35, 1, 1],
    // the lifts turn with the body in a roll (characterRig: `tumbleLift`): the knees bend, the feet stay near the axis
    fLY: [0, 0, 0.22, 0.12, 0.75, 0.12, 0.9, 0.06, 1, 0],
    fRY: [0, 0, 0.22, 0.12, 0.75, 0.12, 0.9, 0.06, 1, 0],
    // both soles the same way ahead of the pivot (the traversal stance staggers them +-0.04)
    fLZ: [0, 0, 0.2, 0.04, 0.78, 0.04, 1, 0],
    fRZ: [0, 0, 0.2, 0.12, 0.78, 0.12, 1, 0],
    hLX: [0, -0.24, 0.2, -0.2, 0.34, -0.12, 0.7, -0.12, 0.88, -0.22, 1, -0.24],
    hLY: [0, 0.82, 0.2, 0.88, 0.34, 1.0, 0.7, 1.0, 0.88, 0.78, 1, 0.8],
    hLZ: [0, 0.12, 0.2, 0.4, 0.34, 0.15, 0.7, 0.15, 0.88, 0.28, 1, 0.1],
    hRX: [0, 0.24, 0.2, 0.2, 0.34, 0.12, 0.7, 0.12, 0.88, 0.22, 1, 0.24],
    hRY: [0, 0.82, 0.2, 0.88, 0.34, 1.0, 0.7, 1.0, 0.88, 0.78, 1, 0.8],
    hRZ: [0, 0.12, 0.2, 0.4, 0.34, 0.15, 0.7, 0.15, 0.88, 0.28, 1, 0.1],
    wpPitch: [0, 0, 0.2, -0.5, 0.8, -0.5, 1, 0],
    offGrip: [0, 1, 0.15, 0.6, 0.85, 0.6, 1, 1],
  },
});

const smooth01 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * (anim-n4b) The roll's body path over progress t (`rollBody`): `pitch` forward (rad, about the right axis at the rig's
 * tumble pivot) dives the body to near level by 0.3 and brings it back up over 0.7 - 0.98; `spin` (rad, negative: the
 * right shoulder goes down first) turns it a full turn about the hips-to-feet line (`tilt`: that line leans `tilt`
 * forward at the feet) over 0.16 - 0.84, so it rolls shoulder, back, hip along the floor; `drop` (m at 1.75 m) sinks the
 * pivot towards the floor with the dive (it also takes out the path's ride, `rollRide`, so the body stays down).
 * (anim-n4b fix) `faceLift` (m at 1.75 m) gives back part of the drop while the chest faces the floor (the dive in and the
 * last of the spin): the knees bend toward the chest, so then they point down (rig knee joints were 7.7 cm under the floor).
 */
export const ROLL_BODY = { pitch: 1.5, pitchIn: 0.38, pitchOut: 0.68, pitchOutT: 0.3, spinFrom: 0.16, spinTo: 0.84, drop: 0.32, dropIn: 0.36, dropOut: 0.66, dropOutT: 0.32, tilt: 0.237, faceLift: 0.13 } as const;
const rollFwd = { x: 0, y: 0, z: 0 };

export interface RollBodyOut {
  pitch: number;
  spin: number;
  drop: number;
}

/** The roll's body pitch, spin and pivot drop (m at 1.75 m, before the ride) at progress t (allocation-free). */
export function rollBody(t: number, out: RollBodyOut): RollBodyOut {
  const B = ROLL_BODY;
  out.pitch = B.pitch * (smooth01(t / B.pitchIn) - smooth01((t - B.pitchOut) / B.pitchOutT));
  out.spin = -Math.PI * 2 * smooth01((t - B.spinFrom) / (B.spinTo - B.spinFrom));
  // the body's forward (the chest) turned down toward the floor: the knees with it
  const down = -rollTurn(out.pitch, out.spin, 0, 0, 1, rollFwd).y;
  out.drop = B.drop * (smooth01(t / B.dropIn) - smooth01((t - B.dropOut) / B.dropOutT)) - B.faceLift * Math.max(0, down);
  return out;
}

/**
 * A body-frame offset from the tumble pivot (x right, y up, z forward) turned by a roll's `pitch` and `spin` (the rig's
 * body rotation: the spin about the tilted hips-to-feet line first, then the pitch about the right axis), into `out`
 * (allocation-free; the rig builds the same rotation as a quaternion, tests check them against each other).
 */
export function rollTurn(pitch: number, spin: number, x: number, y: number, z: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  // Rodrigues about u = (0, cos tilt, -sin tilt)
  const uy = Math.cos(ROLL_BODY.tilt);
  const uz = -Math.sin(ROLL_BODY.tilt);
  const c = Math.cos(spin);
  const s = Math.sin(spin);
  const d = y * uy + z * uz;
  // u x v = (uy z - uz y, uz x, -uy x)
  const sx = x * c + (uy * z - uz * y) * s;
  const sy = y * c + uz * x * s + uy * d * (1 - c);
  const sz = z * c - uy * x * s + uz * d * (1 - c);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  out.x = sx;
  out.y = sy * cp - sz * sp;
  out.z = sy * sp + sz * cp;
  return out;
}


/**
 * (anim-n4b) The mantle's hand plant: both hands reach up to the top edge (an arc over the lip, 0.06 - 0.2), press on it
 * while the body rises past and over them (the palms stay where they landed, so in the root frame they move down and
 * back), and leave as the knee comes on (0.52 - 0.72). `H` the top above the start feet, `D` the start-to-end distance
 * (m; 0 = unknown: the 0.9 m audit block). Hand targets in the root frame (m, x the half spacing, y up, z forward);
 * `sink` (m) lowers the pelvis so the shoulders stay `reachUp` over the palms (the arms bent, pressing), given the
 * shoulders' root-frame height without it.
 */
export const MANTLE_PLANT = { on: 0.06, onT: 0.14, off: 0.52, offT: 0.2, halfX: 0.19, palmY: 0.04, palmZ: 0.06, arc: 0.12, nominalH: 0.9, nominalD: 0.75, reachUp: 0.45, sinkMax: 0.55 } as const;

export interface MantlePlantOut {
  w: number;
  x: number;
  y: number;
  z: number;
  sink: number;
}

export function mantlePlant(k: number, H: number, D: number, shoulderY: number, out: MantlePlantOut): MantlePlantOut {
  const P = MANTLE_PLANT;
  // (anim-n4b fix) H < 0: the mantle played backwards onto a ladder from its top (attachController `topIn`): no plant, no
  // sink (the nominal block's sink lowered the body through the rim: e2e-clip 'ladder down + slide', 30 cm)
  if (H < 0) {
    out.w = 0;
    out.sink = 0;
    return out;
  }
  const h = H > 0.05 ? H : P.nominalH;
  const d = D > 0.05 ? D : P.nominalD;
  const on = smooth01((k - P.on) / P.onT);
  out.w = on * (1 - smooth01((k - P.off) / P.offT));
  out.x = P.halfX;
  // the palm on the top, just past the edge; reaching in, the hand arcs up over the lip
  out.y = h - (h + MANTLE_PATH.topLift) * mantleRise(k) + P.palmY + P.arc * Math.sin(Math.PI * on);
  out.z = d - MANTLE_PATH.standIn - d * mantleAlong(k) + P.palmZ;
  out.sink = Math.min(P.sinkMax, Math.max(0, shoulderY - (out.y + P.reachUp))) * out.w;
  return out;
}

/**
 * (anim-n4b, PASS2 row 64 / AUDIT fix 26) Landing absorb by the landing's strength (`AnimInput.landing`, 0..1: the
 * controller's recovery, which grows with the fall speed): `light` the shallow landing's share (from a 0.5 m drop, full
 * by ~1.05 m), `deep` the deep landing's (knees and hips flex further the harder it lands: ~1.05 m starts it, ~1.5 m and
 * more full). (anim-n4b fix) Calibrated at the game's gravity `LAND_GRAVITY` (was 9.81): the controller's landing is
 * min(1, 2 landT), landT = 0.15 + (v - 3) 0.08 over 3 m/s (playerController), so 0.5 m -> 0.50, 1.05 m -> 0.80, 1.5 m ->
 * 1 (the strength tops out there); a stair or step under ~0.25 m (v under 3 m/s) is 0 and never starts one.
 */
export const LAND_ABSORB = { lightFrom: 0.5, lightTo: 0.8, deepFrom: 0.8, deepTo: 1 } as const;
/** (anim-n4b fix) The game's gravity (m/s^2, `physics/havok.ts` GRAVITY.y = -18), not imported: that module pulls
 *  Babylon and Havok into the anim module. The landing calibration's fall speeds. */
export const LAND_GRAVITY = 18;
export function landLight(landing: number): number {
  return smooth01((landing - LAND_ABSORB.lightFrom) / (LAND_ABSORB.lightTo - LAND_ABSORB.lightFrom));
}
export function landDeep(landing: number): number {
  return smooth01((landing - LAND_ABSORB.deepFrom) / (LAND_ABSORB.deepTo - LAND_ABSORB.deepFrom));
}

/** (anim-n4b) The air pose's share after `airT` s off the ground (a drop, a fall, the jump's flight): legs a little
 *  ahead, arms out and up for balance (animGraph AIR_POSE). */
export function airPoseW(airT: number): number {
  return smooth01((airT - 0.05) / 0.2);
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
 * (traverse-fix-2) A mantle keeps the chest low over the hands while the knees come on, then pushes up: the trunk pitches
 * forward over the lip as the root rises (pelPitch + spPitch 1.85 rad by 0.35, held to 0.52), the pelvis low (pelY -0.75)
 * and held back over the lip as the root moves in (pelZ to -0.3 at 0.52), so the shoulders stay within reach of the lip
 * (<= 0.53 m, arm 0.54 m; were 0.6 - 0.88 m over 0.32 - 0.52 with the near upright torso) and the palms stay on it until
 * the right foot is on the top (0.52, CLIMB_UP_HANDS); then up into the crouch by CLIMB_UP_CROUCH_K. The right knee swings
 * out (fRX) and comes over the lip after the left; the left foot swings wide through (fLX -0.2 at 0.57). Every knee stays
 * over the rig's knee floor (root + KNEE_FLOOR: a knee under it lifts the pelvis at once, a pop). Headless measure:
 * tests/climbHands.test.ts. Undo: the keys before traverse-fix-2 (git history) and CLIMB_UP_HANDS { k0 0.38, span 0.12 }.
 */
export const CLIMB_UP_CROUCH_K = 0.654;
export const CLIMB_UP = makeClip({
  name: 'climbUp',
  duration: 1,
  keys: {
    grip: [0, 0, 1, 0],
    offGrip: [0, 0, 0.56, 0, 0.654, 1, 1, 1],
    // (traverse-fix-2) the trunk pitched near flat over the lip from the pull-up until the right foot is on the top (0.4 -
    // 0.48; the spine counters most of pelPitch: the chest's pitch is about 0.4 pelPitch + spPitch), then up into the
    // crouch as the hands let go, spread over the release (0.48 - 0.654: rising later, the arms swung 13 cm a frame
    // round the shoulders' rate limit at the crouch)
    pelPitch: [0, 0, 0.24, 0.13, 0.31, 0.672, 0.35, 0.842, 0.4, 1.152, 0.44, 1.152, 0.48, 0.93, 0.52, 0.774, 0.56, 0.685, 0.6, 0.389, 0.63, 0.3, 0.654, 0.318, 0.85, 0.12, 1, 0.05],
    spPitch: [0, -0.05, 0.24, 0.289, 0.31, 0.653, 0.35, 0.893, 0.4, 0.911, 0.44, 1.049, 0.48, 1.164, 0.52, 1.049, 0.56, 0.736, 0.6, 0.526, 0.63, 0.185, 0.654, 0.013, 1, 0],
    // the head up, looking over the top
    hdPitch: [0, -0.2, 0.22, 0.1, 0.36, -0.6, 0.5, -0.752, 0.654, -0.055, 1, 0],
    // the crouch on top at 0.654 is the crouched stance's own (CROUCH_IDLE pelY -0.42, pelPitch ~0.28); (traverse-fix-2)
    // the pelvis drops as the root rises (the shoulders pass over the hands slower: the elbows' joint rate held the palms
    // 6 cm off the lip at 0.26) and stays low over the knees to 0.5
    pelY: [0, 0, 0.21, -0.003, 0.27, -0.255, 0.33, -0.558, 0.38, -0.718, 0.44, -0.679, 0.5, -0.743, 0.56, -0.606, 0.6, -0.485, 0.654, -0.42, 1, 0],
    // (traverse-fix-2) the pelvis back off the lip through the pull-up, then held back over it as the root moves in over
    // the top (CLIMB_UP_PATH fwd0 0.33), so the shoulders stay in the arms' reach of the hands
    pelZ: [0, 0, 0.2, -0.032, 0.26, -0.131, 0.3, -0.17, 0.36, -0.1, 0.4, -0.104, 0.44, -0.216, 0.48, -0.253, 0.52, -0.246, 0.56, -0.209, 0.6, -0.147, 0.654, 0, 1, 0],
    // the left knee comes over the lip wide of the arm (0.27 - 0.3), the shin trailing behind it (0.36 - 0.54), then the
    // foot swings wide (fLX) and through under the body (0.54 - 0.63)
    fLX: [0, 0, 0.2, -0.12, 0.3, -0.25, 0.36, -0.12, 0.5, -0.05, 0.57, -0.2, 0.63, 0, 1, 0],
    fLY: [0, 0.05, 0.2, 0.2, 0.3, 0.4, 0.36, 0.105, 0.42, 0.061, 0.46, 0.06, 0.5, 0.072, 0.54, 0.15, 0.58, 0.15, 0.63, 0, 1, 0],
    fLZ: [0, -0.1, 0.27, -0.12, 0.42, -0.13, 0.46, -0.268, 0.5, -0.461, 0.54, -0.461, 0.58, -0.328, 0.63, 0, 1, 0],
    fLPitch: [0, 0, 0.3, 0.6, 0.36, 1.2, 0.52, 1.2, 0.58, 0.3, 0.63, 0, 1, 0],
    // the right foot pushes low on the face (0.4 - 0.44), its knee swung out (fRX) past the arm, then the foot steps onto
    // the top in front (0.44 - 0.47: on it by 0.474, before the hands let go), set down under its hip (fRX -0.08 at 0.49;
    // b22-ladder-knees): both legs folded there, a foot set wide tips the hip-ankle line out and the knee in, onto the
    // left knee beside it (8.9 cm apart over a ladder's top with fRX 0.022 -> 0; 14.4 cm now, e2e-clip > 9)
    fRX: [0, 0, 0.26, 0, 0.34, 0.116, 0.37, 0.164, 0.42, 0.163, 0.46, -0.02, 0.49, -0.08, 0.56, 0, 1, 0],
    fRY: [0, 0.05, 0.22, 0.15, 0.3, 0.15, 0.36, 0.139, 0.4, -0.283, 0.42, -0.283, 0.44, -0.271, 0.46, -0.08, 0.48, -0.071, 0.52, -0.064, 0.56, -0.06, 0.6, 0, 1, 0],
    fRZ: [0, -0.12, 0.3, -0.16, 0.335, -0.1, 0.37, -0.131, 0.4, -0.09, 0.42, -0.01, 0.44, 0.003, 0.46, 0.067, 0.48, 0.097, 0.52, 0.098, 0.56, 0, 0.654, 0.06, 1, 0],
    // (the grips hold the hands on the lip until the right foot is on the top, then let go 0.475 - 0.64 (CLIMB_UP_HANDS).
    // These hand keys are not what the free hands go to: the graph overwrites a traverse clip's hands with the hanging
    // defaults except for the roll and the drop (animGraph `clipHands`))
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
 *  hips sink between the legs, back upright, head level, arms out to the walls.
 *  (anim-n4b, AUDIT fix 36 / row 58: a T-pose, the arms straight out level, the trunk still) The palms press on the walls
 *  below the shoulders (`SPLIT_HANDS`, attachGrips; these hand keys are only the fallback), and the trunk breathes and
 *  balances over the brace (`splitBreath`, animGraph). */
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
    hLY: [0, 0.69, 1, 0.69],
    hRY: [0, 0.69, 1, 0.69],
    hLZ: [0, 0.16, 1, 0.16],
    hRZ: [0, 0.16, 1, 0.16],
    wpPitch: [0, -0.9, 1, -0.9],
  },
});

/**
 * (anim-n4b, AUDIT fix 36) Where the split brace's palms press on the two walls: `up` over the feet line (m at 1.75 m;
 * the shoulders sit ~0.57 over it, so the palms are ~0.25 under them: the arms angle down onto the walls, bent where the
 * gap allows) and `fwd` ahead of the body line.
 */
export const SPLIT_HANDS = { up: 0.32, fwd: 0.16 } as const;

/** (anim-n4b) The split brace's breath (chest pitch, a 3.6 s cycle) and balance (the pelvis rolls and shifts over the
 *  legs, the chest and head counter it, a 5.3 s cycle): rad and pose m. */
export const SPLIT_BREATH = { breathT: 3.6, chest: 0.03, head: 0.015, swayT: 5.3, pelRoll: 0.035, pelX: 0.015, spRoll: 0.022, hdRoll: 0.015 } as const;

export interface SplitBreathOut {
  spPitch: number;
  hdPitch: number;
  pelRoll: number;
  pelX: number;
  spRoll: number;
  hdRoll: number;
}

/** The split brace's trunk offsets at time `t` (s) braced (allocation-free). */
export function splitBreath(t: number, out: SplitBreathOut): SplitBreathOut {
  const B = SPLIT_BREATH;
  const br = Math.sin((t / B.breathT) * Math.PI * 2);
  const sw = Math.sin((t / B.swayT) * Math.PI * 2);
  out.spPitch = -B.chest * br;
  out.hdPitch = B.head * br;
  out.pelRoll = B.pelRoll * sw;
  out.pelX = B.pelX * sw;
  out.spRoll = -B.spRoll * sw;
  out.hdRoll = -B.hdRoll * sw;
  return out;
}

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
