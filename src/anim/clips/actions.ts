/**
 * Action clips (authored in code). Weapon handling, traversal and transitions.
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
    // (anim-cleanup) the stripped magazine down to the chest pouch (Wren's rifle pouches, low on the chest plate left
    // of centre, base plates up: the hand above it), swapped there for a fresh one (`pouch`), back up to the well
    hLX: [0, -0.06, 0.32, -0.08, 0.38, -0.07, 0.46, -0.07, 0.52, -0.05],
    hLY: [0, 1.2, 0.32, 1.17, 0.38, 1.22, 0.46, 1.22, 0.52, 1.16],
    hLZ: [0, 0.2, 0.32, 0.22, 0.38, 0.2, 0.46, 0.2, 0.52, 0.24],
    wpRoll: [0, 0, 0.1, 0.38, 0.62, 0.42, 0.72, 0.3, 0.9, 0.05, 1, 0],
    wpPitch: [0, 0, 0.1, 0.22, 0.62, 0.25, 0.66, 0.2, 0.68, 0.27, 0.9, 0.05, 1, 0],
    wpY: [0, 0, 0.1, -0.05, 0.64, -0.05, 0.66, -0.03, 0.69, -0.06, 0.9, -0.01, 1, 0],
    wpZ: [0, 0, 0.1, -0.09, 0.9, -0.08, 1, 0],
    hdPitch: [0, 0, 0.12, 0.18, 0.3, 0.12, 0.42, 0.28, 0.56, 0.18, 0.7, 0.15, 0.9, 0],
    spPitch: [0, 0, 0.66, 0, 0.68, 0.025, 0.72, 0],
  },
  events: { magOut: 0.24, pouch: 0.42, magIn: 0.66 },
});

/** Empty reload (rifle 3.1 s): as tactical, then the off hand runs the charging handle. */
export const RELOAD_EMPTY = makeClip({
  name: 'reloadEmpty',
  duration: 1,
  keys: {
    offGrip: [0, 1, 0.07, 1, 0.12, 0, 0.86, 0, 0.94, 1],
    // (anim-cleanup) after the seat the off hand goes on to the charging handle (the rig's magPoint moves there:
    // playerWeapons) and runs it, then back to the foregrip
    offMag: [0, 0, 0.09, 0, 0.14, 1, 0.2, 1, 0.27, 0, 0.44, 0, 0.5, 1, 0.6, 1, 0.64, 0.6, 0.68, 1, 0.82, 1, 0.86, 0],
    hLX: [0, -0.06, 0.27, -0.08, 0.32, -0.07, 0.4, -0.07, 0.46, -0.05],
    hLY: [0, 1.2, 0.27, 1.17, 0.32, 1.22, 0.4, 1.22, 0.46, 1.16],
    hLZ: [0, 0.2, 0.27, 0.22, 0.32, 0.2, 0.4, 0.2, 0.46, 0.24],
    wpRoll: [0, 0, 0.09, 0.38, 0.6, 0.42, 0.66, 0.15, 0.82, 0.12, 0.94, 0.02, 1, 0],
    wpPitch: [0, 0, 0.09, 0.22, 0.5, 0.25, 0.54, 0.2, 0.56, 0.27, 0.66, 0.1, 0.77, 0.06, 0.8, 0.12, 0.94, 0.03, 1, 0],
    wpY: [0, 0, 0.09, -0.05, 0.52, -0.05, 0.54, -0.03, 0.57, -0.06, 0.8, -0.03, 0.94, -0.01, 1, 0],
    wpZ: [0, 0, 0.09, -0.09, 0.94, -0.06, 1, 0],
    hdPitch: [0, 0, 0.1, 0.18, 0.27, 0.12, 0.36, 0.28, 0.48, 0.18, 0.66, 0.08, 0.9, 0],
    spPitch: [0, 0, 0.54, 0, 0.56, 0.025, 0.6, 0, 0.77, 0, 0.79, -0.02, 0.82, 0],
  },
  events: { magOut: 0.2, pouch: 0.36, magIn: 0.54, charge: 0.78 },
});

/**
 * (anim-cleanup) Pistol reloads: the off hand strips the magazine from the bottom of the grip, takes it to Wren's pistol
 * magazine pouch on the left hip (9 o'clock, base plates forward), comes back with a fresh one and seats it; the empty
 * reload then racks the slide (the off hand over the slide's rear). The gun tilts less than the rifle.
 */
export const RELOAD_PISTOL_TACTICAL = makeClip({
  name: 'reloadPistolTactical',
  duration: 1,
  keys: {
    offGrip: [0, 1, 0.08, 1, 0.14, 0, 0.84, 0, 0.92, 1],
    offMag: [0, 0, 0.1, 0, 0.16, 1, 0.24, 1, 0.3, 0, 0.52, 0, 0.58, 1, 0.74, 1, 0.84, 0],
    hLX: [0, -0.1, 0.3, -0.16, 0.36, -0.21, 0.46, -0.21, 0.52, -0.12],
    hLY: [0, 1.15, 0.3, 1.06, 0.36, 1.03, 0.46, 1.03, 0.52, 1.12],
    hLZ: [0, 0.2, 0.3, 0.1, 0.36, 0.05, 0.46, 0.05, 0.52, 0.18],
    wpRoll: [0, 0, 0.1, 0.25, 0.62, 0.28, 0.72, 0.2, 0.9, 0.04, 1, 0],
    wpPitch: [0, 0, 0.1, 0.12, 0.62, 0.14, 0.66, 0.1, 0.7, 0.16, 0.9, 0.03, 1, 0],
    wpZ: [0, 0, 0.1, -0.06, 0.9, -0.05, 1, 0],
    hdPitch: [0, 0, 0.12, 0.16, 0.3, 0.1, 0.42, 0.22, 0.56, 0.16, 0.7, 0.12, 0.9, 0],
  },
  events: { magOut: 0.24, pouch: 0.41, magIn: 0.66 },
});

export const RELOAD_PISTOL_EMPTY = makeClip({
  name: 'reloadPistolEmpty',
  duration: 1,
  keys: {
    offGrip: [0, 1, 0.07, 1, 0.12, 0, 0.86, 0, 0.94, 1],
    offMag: [0, 0, 0.09, 0, 0.14, 1, 0.2, 1, 0.26, 0, 0.44, 0, 0.5, 1, 0.6, 1, 0.64, 0.6, 0.68, 1, 0.82, 1, 0.86, 0],
    hLX: [0, -0.1, 0.26, -0.16, 0.31, -0.21, 0.39, -0.21, 0.45, -0.12],
    hLY: [0, 1.15, 0.26, 1.06, 0.31, 1.03, 0.39, 1.03, 0.45, 1.12],
    hLZ: [0, 0.2, 0.26, 0.1, 0.31, 0.05, 0.39, 0.05, 0.45, 0.18],
    wpRoll: [0, 0, 0.09, 0.25, 0.6, 0.28, 0.66, 0.1, 0.94, 0.02, 1, 0],
    wpPitch: [0, 0, 0.09, 0.12, 0.5, 0.14, 0.54, 0.1, 0.56, 0.16, 0.66, 0.06, 0.94, 0.02, 1, 0],
    wpZ: [0, 0, 0.09, -0.06, 0.94, -0.04, 1, 0],
    hdPitch: [0, 0, 0.1, 0.16, 0.26, 0.1, 0.36, 0.22, 0.48, 0.16, 0.66, 0.08, 0.9, 0],
  },
  events: { magOut: 0.2, pouch: 0.35, magIn: 0.54, charge: 0.78 },
});

/** (anim-cleanup) The reload clip for a weapon (pistols by their light mass factor) and kind. */
export function reloadClipFor(weight: number, empty: boolean): ReturnType<typeof makeClip> {
  const pistol = weight < 0.85;
  return pistol ? (empty ? RELOAD_PISTOL_EMPTY : RELOAD_PISTOL_TACTICAL) : empty ? RELOAD_EMPTY : RELOAD_TACTICAL;
}

/** Where the right hand goes to holster / draw, per carry slot (body space: x right, y up, z forward). */
export type SwapReach = 'backL' | 'backC' | 'backR' | 'sling' | 'thigh';
const REACH: Record<SwapReach, [number, number, number]> = {
  // (anim-cleanup) behind the back to the pistol grip of the gun hung on the back plate (the rifle is carried there
  // over the right shoulder in the trigger hand: WeaponModel travel)
  backL: [0.02, 1.26, -0.12],
  // (G2, AUDIT-AIM row 3) the diagonal sling's grip, at the bottom of the right shoulder blade (backDiag BACK_DIAG.grip): the hand
  // goes back over the right shoulder (was [0.08, 1.26, -0.12], the vertical gun's grip by the spine)
  // (G2 fix r1) up over the right shoulder to the slung stock, as CT's reach (105845 2.77): [0.14, 1.2, -0.12] behind the
  // blade was out of the arm's reach (e2e-weapons-carry: the hand 27 cm from the gun on a pistol-to-rifle swap)
  backC: [0.16, 1.34, -0.1],
  backR: [0.14, 1.26, -0.12],
  // across to the left-hip sling
  sling: [-0.16, 1.0, 0.1],
  // down to the right thigh holster
  thigh: [0.21, 0.74, 0.0],
};
/**
 * (G2 fix r1) Where the hand lets go of the centre gun it just slung (its grip at the bottom of the right shoulder blade,
 * backDiag BACK_DIAG.grip): an outgoing back gun ends there, so the hand leaves for the next slot from it (the reach over
 * the shoulder, REACH.backC, is for taking it).
 */
const SLUNG_GRIP_C: [number, number, number] = [0.14, 1.2, -0.12];
const BACK = (r: SwapReach): boolean => r === 'backL' || r === 'backC' || r === 'backR';

/** (ct-prototype D1) One hand channel's swap keys: pocket, out to `f`, between the slots (`mid`), `t`, back to the pocket. */
function travelKeys(from: SwapReach, to: SwapReach, pocket: number, f: number, mid: number, t: number, backPocket = pocket): number[] {
  const out = from === 'sling' ? [0, pocket, 0.26, f, 0.38, f] : [0, pocket, 0.06, pocket, 0.38, f];
  // (G2, AUDIT-AIM row 1) from the back the hand is in the pocket at 0.65 (was 0.8) and on the way there no lower than
  // `backPocket` (the shoulder, the raised pocket): over the shoulder, muzzle up, then down onto the line, no chest pass
  // (G2 fix r1) a gun-to-gun swap to a travelled slot (the diagonal sling over the shoulder, the thigh from it) reaches the
  // next gun sooner (0.42 between, there by 0.47, held to the take at 0.5): the hand is on the gun before it leaves its slot
  const early = to !== 'sling' && from !== to;
  const at = early ? [0.47, t] : [];
  const back = to === 'sling' ? [0.5, t, 0.6, t, 0.8, pocket] : BACK(to) ? [...at, 0.5, t, 0.65, backPocket, 1, backPocket] : [...at, 0.5, t, 0.8, pocket];
  return [...out, early ? 0.42 : 0.44, mid, ...back];
}

function swapClip(from: SwapReach, to: SwapReach) {
  const f = from === 'backC' && to !== 'backC' ? SLUNG_GRIP_C : REACH[from];
  const t = REACH[to];
  return makeClip({
    name: `swap ${from}>${to}`,
    duration: 1,
    keys: {
      // (anim-cleanup) the trigger hand keeps the grip while the gun travels to its slot (to 0.38) and from the next
      // slot to the aim pocket (0.5-0.8: WeaponModel travel); empty only between the two slots, round the outside of the
      // body (never through the hip)
      grip: [0, 1, 0.38, 1, 0.41, 0, 0.47, 0, 0.5, 1, 1, 1],
      offGrip: [0, 1, 0.1, 0, 0.86, 0, 0.94, 1],
      // out to the outgoing gun's slot (holstered at 0.38), on to the incoming one's (taken at 0.5), then
      // up to the aim pocket (in the pocket at 0.8)
      // (ct-prototype D1) a travelled slot (back, thigh): the hand keys follow the gun's travel (out over 0.06-0.38, in
      // over 0.5-0.8) instead of reaching the slot early and holding there; the sling's hand-off keeps the old keys
      hRX: travelKeys(from, to, 0.18, f[0], Math.max(f[0], t[0]) + 0.12, t[0]),
      hRY: travelKeys(from, to, 1.25, f[1], (f[1] + t[1]) / 2, t[1], 1.32),
      hRZ: travelKeys(from, to, 0.25, f[2], (f[2] + t[2]) / 2, t[2]),
      // the support hand hangs relaxed at the side (the arm's own length below the shoulder), out of the gun's way, and
      // comes up for the grip as the gun reaches the pocket
      hLX: [0, -0.2, 0.2, -0.21, 0.7, -0.21, 1, -0.16],
      hLY: [0, 1.0, 0.2, 0.88, 0.7, 0.88, 1, 1.1],
      hLZ: [0, 0.1, 0.2, 0.05, 0.7, 0.05, 1, 0.14],
      // (F6) a draw to the back slot's gun comes up level (its travel ends at the shoulder): no muzzle-down low ready on
      // the way in (0.45 rad at 0.75 was the dip): level from the slot (0.38) on, so the clip adds no pitch change to
      // the draw raise (a drop near 0.5 was a 0.15-0.2 rad one-frame pop in e2e-anim); other slots keep the old keys
      // (G2 fix r1) a holster to the back carries the gun along its travel (WeaponModel: the pocket pitch is not shown), so
      // the clip's 0.5 rad dip only moved the channel: over the 0.15 s holster it stepped ~0.1 rad a frame on top of the
      // carry lower (e2e-anim draw / holster continuity). Flat for a back-to-back holster / draw
      wpPitch: BACK(to) && BACK(from) ? [0, 0, 1, 0] : BACK(to) ? [0, 0, 0.2, 0.5, 0.38, 0, 1, 0] : [0, 0, 0.2, 0.5, 0.75, 0.45, 1, 0],
      // the chest turns towards the reach (right shoulder / left hip / right thigh)
      spYaw: [0, 0, 0.26, BACK(from) ? 0.16 : from === 'sling' ? -0.3 : 0.08, 0.38, BACK(from) ? 0.18 : from === 'sling' ? -0.32 : 0.1, 0.56, BACK(to) ? 0.14 : to === 'sling' ? -0.3 : 0.08, 1, 0],
      spPitch: [0, 0, 0.35, BACK(from) ? 0 : 0.16, 0.56, BACK(to) ? 0 : 0.14, 1, 0],
      hdPitch: [0, 0, 0.35, 0.08, 1, 0],
    },
    events: { holstered: 0.38, drawn: 0.5 },
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
 * (clip-speed, track A) Playback rate of the timed body clips below (1: as keyed; 2: twice as fast, half the time). The
 * animation graph's clip clocks run at this x the tuner's Clip speed slider; the bake writes a tuned speed in here.
 */
export const CLIP_RATE = { startShift: 1, stopSettle: 1, land: 1 };

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
  // (locomotion step 22, D5.3 / D2, M14) one damped dip, no rebound, back within 0.16 s: Chaos Theory stops now ease
  // through a 'stop' state and play it at rest (it had a 0.35 s rebound: aimed weapon settle 0.13 -> 0.53 s)
  duration: 0.16,
  keys: {
    pelY: [0, 0, 0.06, -0.012, 0.16, 0],
    pelPitch: [0, 0, 0.05, -0.025, 0.16, 0],
    spPitch: [0, 0, 0.06, 0.012, 0.16, 0],
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

/** Landing compression after a drop (timed). */
/**
 * (CT prototype G1, audit row 18) A drop of a metre and more (110522 @ 71.5-72.1): the hips sink to near full crouch depth
 * at 0.1 s and come back up over 0.5 s (the graph weights it by the fall and adds the arms thrown out, LAND_ARMS).
 */
export const LAND_DEEP = makeClip({
  name: 'landDeep',
  duration: 0.75,
  keys: {
    pelY: [0, 0, 0.1, -0.4, 0.25, -0.36, 0.5, -0.14, 0.75, 0],
    pelPitch: [0, 0, 0.1, 0.35, 0.35, 0.18, 0.75, 0],
    spPitch: [0, 0, 0.1, -0.08, 0.35, 0.02, 0.75, 0],
    hdPitch: [0, 0, 0.1, -0.2, 0.75, 0],
  },
});

export const LAND = makeClip({
  name: 'land',
  duration: 0.6,
  keys: {
    pelY: [0, 0, 0.12, -0.16, 0.35, -0.05, 0.6, 0],
    pelPitch: [0, 0, 0.12, 0.25, 0.4, 0.06, 0.6, 0],
    spPitch: [0, 0, 0.12, -0.1, 0.4, 0, 0.6, 0],
  },
});
