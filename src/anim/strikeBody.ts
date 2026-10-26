/**
 * (anim-natural N4c, AUDIT row 49) The elbow strike's body: hips and trunk drive the elbow (pure, Babylon-free, no
 * allocation per frame).
 *
 * The strike (and the lethal takedown blow, the same `melee` arc) turned the shoulders 0.8 deg: the anim graph's turn
 * (pelvis / spine yaw channels) was wiped on Wren by the keyed trunk (`CharacterRig.keyedTrunk` slerps hips, spine,
 * chest and neck onto the keyed idle at the keyed weight, ~1 standing holstered). This layer goes on the rig after the
 * keyed trunk, so it shows on every path (keyed or procedural), on Wren rigs only (`AnimGraph.wrenReady`; the guards'
 * melee keeps the graph's own turn, unchanged):
 * - wind-up (phase 0 .. ~0.17): the hips and, further, the shoulders load to the right (the rear shoulder back), the
 *   weight back over the rear (right) foot;
 * - drive: the hips turn left first (`lead` of the phase ahead: ~3 frames time-linear, ~1 on the strike's warp), the
 *   shoulders follow through (about 33 deg of shoulder turn over the arc), the weight forward onto the lead (left)
 *   foot; the elbow arc (the graph's hand sweep, `meleeSweep`) finishes last, so the chain reads hips -> shoulders ->
 *   elbow;
 * - recovery (from 0.62): back to rest at phase 1.
 * The head stays on the target (the rig's head is world-stabilised; the neck takes back `neck` of the shoulder turn).
 * The rig turns the arm targets with the shoulders (about the shoulder), so the elbow drives through with the chest.
 *
 * The values are the code defaults (`STRIKE_BODY`); the tuner's "Elbow strike" section scales them (`STRIKE_SECTION`,
 * identity at default) and `scripts/anim-tune-bake.mjs` bakes a tune back into `STRIKE_BODY` (tuneBakeTable.ts).
 *
 * (anim-n4c M1, Michael: "Faster arm") The phases above are the ARC's. The elbow strike plays the arc through
 * `strikeWarp`: the knockout resolves at `STRIKE.hitAt` (0.08 s), so the arc's contact (0.56) lands there (a frame early
 * for the arm's lag, `STRIKE_ARM_LAG`), a one-frame load and the drive in ~4 frames, the follow-through and the return
 * in the rest of the strike. Its producers apply it (the local `StrikeController`, a remote's `poseFromMoveState` and
 * `RemoteAvatar`'s eased phase; the wire keeps the strike's own phase), so every consumer of `melee` (the graph's hand
 * arc and weights, the rig's elbow pole, this layer, the tuner's row weight) stays in step.
 *
 * (anim-n4d, M1 applied to the kills) The lethal takedown blow and the grab kill play the same arc through `killWarp`:
 * their kill lands at the blow's end (unchanged: approach + `TAKEDOWN.strike`, `GRAB.killTime`), so the arc's contact
 * lands there (a frame early, `STRIKE_ARM_LAG`) and the follow-through and the return run on after the kill
 * (`KillBlow.tail`, pose only: `TakedownController`'s tail, `RemoteAvatar`'s). The wire keeps the blow's own phase.
 *
 * (J19 S2, R8; Michael Q34 2026-10-25 "About 1.4 s") The strike frees 1.4 s after contact (`STRIKE_DUR` 1.48 s). The
 * arc is timed in seconds (`strikeArcAt`): the wind-up, the drive and the contact keep their times (the arc's contact
 * at 0.063 s, the hit at 0.08 s), the follow-through keeps its 84 ms, and the extra 0.8 s goes to the settle: the arm
 * returns to the stance over the rest of the strike (`STRIKE_SETTLE`), moving every frame until the free. The kill
 * blows keep the linear warp (`arcWarp`).
 */
import { STRIKE, STRIKE_DUR } from '../game/elbowStrike';
import { GRAB, TAKEDOWN } from '../game/takedown';
import { registerTuneSection, TUNE_FLAGS, type TuneTunable } from './tuneRegistry';

/** The arc's contact phase: the elbow at its forward extreme (`meleeSweep` peaks at 0.556), the shoulders driven
 *  through (their drive ends at 0.48, the hips' at 0.38). */
export const STRIKE_ARC_CONTACT = 0.56;
/** The elbow strike's hit phase (`STRIKE.hitAt` over `STRIKE_DUR`, ~0.054): the knockout resolves here. */
export const STRIKE_HIT_PH = STRIKE.hitAt / STRIKE_DUR;
/** (s) The arm's lag: at this pace the rig's shoulder and elbow rate limits (22 / 24 rad/s, `JOINT_RATE`) hold the hand
 *  about 2 frames behind the arc, so the arc's contact is put a frame ahead of the hit: the hand is within ~8 cm of
 *  contact on the hit's step (0.083 s) and fully across a frame later (0.1 s); the trunk is through by the hit. */
export const STRIKE_ARM_LAG = 1 / 60;
/** (J19 S2, R8) Seconds into the strike of the arc's contact (~0.063 s): a frame before the hit, as before R8. */
export const STRIKE_CONTACT_T = STRIKE.hitAt - STRIKE_ARM_LAG;
/** The strike phase the arc's contact lands on (`STRIKE_CONTACT_T` over `STRIKE_DUR`, ~0.043). */
export const STRIKE_WARP_PH = STRIKE_CONTACT_T / STRIKE_DUR;
/** (J19 S2, R8) The follow-through (s): the arc from its contact (0.56) to the return's start (`REC_FROM`, 0.62) at
 *  the pace it had before R8 (84 ms, 5 frames); every arc curve holds its contact pose over it while the arm and the
 *  trunk arrive (the rig's joint rate limits, `STRIKE_BODY_RATE`). */
export const STRIKE_FOLLOW = 0.084;
/**
 * (J19 S2, R8) The settle: the return (arc `REC_FROM` -> 1) over the rest of the strike. Its share at `s` (0..1 of
 * its time) is the cubic with slope `start` at the follow-through's end and `end` at the free:
 * `s (start + (3 - 2 start - end) s + (start + end - 2) s^2)` = `s (2.5 - 2.6 s + 1.1 s^2)`. `start` 2.5 leaves the
 * follow-through at its own arc pace (no change of pace for the arc, or for a capture fitted to it); `end` 0.6
 * arrives at the free still moving (no held pose). The graph's smoothstep return on top starts and ends at rest; per
 * 60 Hz frame its hand weight never moves, or changes its pace, more than the 0.6 s return before R8 did.
 */
export const STRIKE_SETTLE = { start: 2.5, end: 0.6 } as const;

/**
 * (J19 S2, R8) The elbow strike's arc (the `melee` pose input, 0..1) at `t` seconds into the strike, in seconds rather
 * than phase so the longer recovery keeps the hit as quick as before: linear to the arc's contact at
 * `STRIKE_CONTACT_T` (as before R8), the follow-through to `REC_FROM` over `STRIKE_FOLLOW`, then the settle to rest
 * at `STRIKE_DUR` (`STRIKE_SETTLE`). Monotonic and continuous; <= 0 -> 0, `STRIKE_DUR` and on -> 1. Pure, no allocation.
 */
export function strikeArcAt(t: number): number {
  if (t <= 0) return 0;
  if (t >= STRIKE_DUR) return 1;
  const C = STRIKE_ARC_CONTACT;
  if (t <= STRIKE_CONTACT_T) return (C * t) / STRIKE_CONTACT_T;
  const tR = STRIKE_CONTACT_T + STRIKE_FOLLOW;
  if (t <= tR) return C + ((REC_FROM - C) * (t - STRIKE_CONTACT_T)) / STRIKE_FOLLOW;
  const a = STRIKE_SETTLE.start;
  const b = STRIKE_SETTLE.end;
  const s = (t - tR) / (STRIKE_DUR - tR);
  const x = (((a + b - 2) * s + (3 - 2 * a - b)) * s + a) * s;
  return x < 1 ? REC_FROM + REC_LEN * x : 1;
}

/**
 * (anim-n4c M1; J19 S2, R8) The elbow strike's phase (0..1, time-linear over `STRIKE_DUR`: `strikePhase`, the
 * MoveState's `ph`; < 0 none) -> the arc's phase: `strikeArcAt` of its seconds. < 0 passes through, 1 and on -> 1. Pure.
 */
export function strikeWarp(ph: number): number {
  if (ph < 0) return ph;
  if (ph >= 1) return 1;
  return strikeArcAt(ph * STRIKE_DUR);
}

/**
 * (anim-n4c M1, anim-n4d) A blow's phase (0..1, time-linear; < 0 none) -> the arc's phase with the arc's contact on
 * `hitPh`, linear on both sides (the arc's own curves ease it; they are at rest at contact, so the change of pace
 * there shows no kink). The kill blows' warp (`killWarp`); before J19 S2 also the elbow strike's (then `strikeWarp`
 * with a hit phase). Monotonic, 0 -> 0, 1 -> 1, < 0 passes through; no hit phase in (0, 1): unwarped. Pure.
 */
export function arcWarp(ph: number, hitPh: number): number {
  if (ph < 0) return ph;
  if (ph >= 1) return 1;
  if (!(hitPh > 0 && hitPh < 1)) return ph;
  const C = STRIKE_ARC_CONTACT;
  return ph <= hitPh ? (C * ph) / hitPh : C + ((1 - C) * (ph - hitPh)) / (1 - hitPh);
}

/**
 * (anim-n4d, M1) A kill blow (the lethal takedown blow, the grab kill): its kill lands at the end of its own phase
 * (`dur` s, the nominal length). The arc's contact is put a frame before the kill (`STRIKE_ARM_LAG`) and the arc's
 * follow-through and return (after contact) run on after the kill for `tail` s, at the arc's own pace
 * (`1 - STRIKE_ARC_CONTACT` of `dur`, as unwarped). `hit`: the contact's place on the whole posed timeline
 * (`dur + tail`), the `arcWarp` hit phase (above the arc's contact: the wind-up and drive slow to land on the kill).
 */
export interface KillBlow {
  readonly dur: number;
  readonly tail: number;
  readonly hit: number;
}

function killBlow(dur: number): KillBlow {
  const tail = (1 - STRIKE_ARC_CONTACT) * dur;
  return { dur, tail, hit: (dur - STRIKE_ARM_LAG) / (dur + tail) };
}

/** The lethal takedown blow (the ground takedowns' 0.7 s; the other kinds' blows share it, their kill at phase 1). */
export const TAKEDOWN_BLOW = killBlow(TAKEDOWN.strike);
/** The grab kill (`GRAB.killTime`). */
export const GRAB_KILL_BLOW = killBlow(GRAB.killTime);
/** The blow phase the follow-through ends at (past the kill at 1: `1 + tail / dur`, the same for both). */
export const KILL_TAIL_END = 1 + (1 - STRIKE_ARC_CONTACT);
/** A remote whose last blow phase reached this saw the kill (an abort ends it earlier): it plays the tail. */
export const KILL_SEEN = 0.85;

/**
 * (anim-n4d, M1) A kill blow's phase `u` (0..1 the blow, the kill at 1; 1..`KILL_TAIL_END` the follow-through after
 * the kill; < 0 none) -> the arc's phase (the `melee` pose input): `arcWarp` on the whole posed timeline with the
 * blow's own hit phase. Monotonic and continuous, 0 -> 0, `KILL_TAIL_END` -> 1, < 0 passes through. Pure.
 */
export function killWarp(u: number, b: KillBlow): number {
  if (u < 0) return u;
  return arcWarp((u * b.dur) / (b.dur + b.tail), b.hit);
}

/** The strike's body amounts (Wren). Yaw + is a turn to the right (Babylon yaw), x + right, z + forward. */
export const STRIKE_BODY = {
  /** Pelvis yaw at the wind-up's end (rad, to the right). */
  pelWind: 0.12,
  /** Pelvis yaw at contact (rad, to the left). */
  pelDrive: 0.2,
  /** Shoulder line yaw at the wind-up's end (rad, to the right: the rear shoulder back). */
  chestWind: 0.24,
  /** Shoulder line yaw at contact (rad, to the left). */
  chestDrive: 0.34,
  /** How far (phase, 0..1 of the arc) the hips lead the shoulders through the drive. */
  lead: 0.1,
  /** The pelvis forward onto the lead foot at contact (m; the wind-up sits back by `WIND_BACK` of it). */
  fwd: 0.03,
  /** The pelvis over the lead (left) foot at contact (m; the wind-up sits over the rear foot by `WIND_BACK` of it). */
  side: 0.02,
  /** The share of the shoulder turn the neck takes back (the head stays on the target). */
  neck: 0.5,
};

/** Arc timing (phase 0..1, the `melee` input): the wind-up loads by WIND_END, the drive runs from DRIVE_FROM over
 *  DRIVE_LEN (the shoulders; the hips `lead` earlier), the recovery eases back from REC_FROM over REC_LEN.
 *  (J19 S2) `strikeArcAt` times the elbow strike's follow-through and settle on REC_FROM / REC_LEN (the graph's
 *  `meleeHandW` / `meleeSweep` return on the same 0.62 / 0.38). */
const WIND_END = 0.17;
const DRIVE_FROM = 0.12;
const DRIVE_LEN = 0.36;
const REC_FROM = 0.62;
const REC_LEN = 0.38;
/** The wind-up's weight shift: back and over the rear foot by this share of the contact's shift. */
const WIND_BACK = 0.4;

// ------------------------------------------------------------------------------------------
// The tuner section (identity at default; every slider bakes into STRIKE_BODY)
// ------------------------------------------------------------------------------------------

export const STRIKE_GROUPS = ['strike.elbow'] as const;
const G: readonly string[] = STRIKE_GROUPS;

export const STRIKE_TUNABLES: readonly TuneTunable[] = [
  { id: 'turn', label: 'Strike: hip and shoulder turn', kind: 'mul', def: 1, min: 0, max: 2, step: 0.05, unit: 'x', groups: G, hook: 'strikeBody.ts STRIKE_BODY.pelWind / pelDrive / chestWind / chestDrive (the wind-up and the drive)' },
  { id: 'hipLead', label: 'Strike: hips lead', kind: 'mul', def: 1, min: 0, max: 3, step: 0.05, unit: 'x', groups: G, hook: 'strikeBody.ts STRIKE_BODY.lead (phase the hips turn ahead of the shoulders)' },
  { id: 'shift', label: 'Strike: weight to front foot', kind: 'mul', def: 1, min: 0, max: 3, step: 0.05, unit: 'x', groups: G, hook: 'strikeBody.ts STRIKE_BODY.fwd / side (the pelvis forward and over the lead foot)' },
];

/** The local player is striking (StrikeController sets it each step; the tuner's follow). */
export const STRIKE_SIM = { on: false };

export const STRIKE_SECTION = registerTuneSection({
  id: 'strike',
  label: 'Elbow strike',
  note: 'The elbow strike and the lethal takedown blow (anim-natural N4c): the hips and trunk drive the elbow. Every Wren rig (the local player and a remote partner); guards keep their own.',
  groups: STRIKE_GROUPS,
  tunables: STRIKE_TUNABLES,
  select: () => (STRIKE_SIM.on ? 'strike.elbow' : null),
});

const V = STRIKE_SECTION.values['strike.elbow']!;

/** The tuned value of a slider (identity under the bypass). */
function tv(id: string): number {
  return TUNE_FLAGS.bypass ? 1 : V[id] ?? 1;
}

/** The local player's strike state for the tuner's follow. */
export function strikeSimSet(on: boolean): void {
  STRIKE_SIM.on = on;
}

// ------------------------------------------------------------------------------------------
// The pose layer
// ------------------------------------------------------------------------------------------

/** The layer's offsets for one frame (rad, m), in the rig's body frame. */
export interface StrikeBodyOut {
  /** Pelvis yaw (rad, + right). */
  pel: number;
  /** Shoulder line yaw (rad, + right): the spine and chest take `chest - pel` between them. */
  chest: number;
  /** Pelvis forward (m). */
  fwd: number;
  /** Pelvis sideways (m, + right). */
  side: number;
  /** Neck yaw (rad): takes back `STRIKE_BODY.neck` of the shoulder turn. */
  neck: number;
}

export const newStrikeBody = (): StrikeBodyOut => ({ pel: 0, chest: 0, fwd: 0, side: 0, neck: 0 });

const ss = (t: number): number => {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
};

/** The rest pose (no strike). */
export function strikeBodyRest(out: StrikeBodyOut): StrikeBodyOut {
  out.pel = 0;
  out.chest = 0;
  out.fwd = 0;
  out.side = 0;
  out.neck = 0;
  return out;
}

/**
 * The offsets at strike phase `ph` (0..1; < 0 the rest pose) with the tuner's sliders on `STRIKE_BODY`, by `k` (1: as
 * keyed; (mixamo-retarget I5) a Mixamo strike capture's share of the body takes its share of the shoulder line's turn past
 * the hips and the neck's out: the take turns its own spine and chest over these hips). Pure: writes `out`. No allocation.
 */
export function strikeBodyAt(ph: number, out: StrikeBodyOut, k = 1): StrikeBodyOut {
  if (ph < 0 || k <= 0) return strikeBodyRest(out);
  if (k < 1) {
    strikeBodyAt(ph, out, 1);
    // the hips' turn and the weight shift stay; the shoulder line's turn past the hips and the neck's go
    out.chest = out.pel + (out.chest - out.pel) * k;
    out.neck *= k;
    return out;
  }
  const p = ph > 1 ? 1 : ph;
  const B = STRIKE_BODY;
  const turn = tv('turn');
  const lead = B.lead * tv('hipLead');
  const shift = tv('shift');
  const wind = ss(p / WIND_END);
  const rest = 1 - ss((p - REC_FROM) / REC_LEN);
  const sC = ss((p - DRIVE_FROM) / DRIVE_LEN);
  const sP = ss((p + lead - DRIVE_FROM) / DRIVE_LEN);
  out.pel = (B.pelWind * wind * (1 - sP) - B.pelDrive * sP) * turn * rest;
  out.chest = (B.chestWind * wind * (1 - sC) - B.chestDrive * sC) * turn * rest;
  // the weight goes with the hips: back over the rear (right) foot on the wind-up, onto the lead (left) foot driving
  out.fwd = (-WIND_BACK * wind * (1 - sP) + sP) * B.fwd * shift * rest;
  out.side = (WIND_BACK * wind * (1 - sP) - sP) * B.side * shift * rest;
  out.neck = -B.neck * out.chest;
  return out;
}

/**
 * (strike-pops, n4c polish 9 and the trunk's reversal) The trunk's pace: the layer's phase follows the arc (`melee`) at
 * most this much per second. The elbow strike plays the arc 0 -> contact in ~4 frames (`strikeWarp`), but the arm
 * reaches contact ~2 frames later (the shoulder and elbow rate limits), so the trunk's one-frame load and its drive (hips
 * and shoulders through by arc 0.38 / 0.48) landed in 2 frames on top of the arm's own fastest frames: the shoulder line
 * turned 12.6 deg right then 12.1 deg left on the next frame (a reversal at full speed), then 18.9 deg in one frame, and
 * the right wrist moved 31.4 cm in one frame (the pelvis 2.9 cm). Held to this pace the load eases out before the drive
 * (the shoulders 9.2 -> -0.4 -> -13.3 -> -12.1 deg a frame), the drive over 2 frames instead of 1, the shoulders through
 * on the hit's step (83 ms) and the hand across at 100 ms as before: the wrist's largest frame 27.0 cm, the pelvis'
 * 2.0 cm (60 Hz, `tests/strikePops.test.ts`). 6 / s puts the hand's arrival a frame late; 6.75 / s and up leave a
 * reversal at speed (7: 10.6 -> -4.6 deg a frame). The kill blows (~0.8 / s before contact) and the recovery never
 * reach it. Never ahead of the arc; a rewind (a denial's blend back) follows at once; it starts from rest (phase 0).
 */
export const STRIKE_BODY_RATE = 6.25;

/** The layer's phase this frame from last frame's (`prev`, < 0 none) and the arc's (`arc`, < 0 none). Pure. */
export function strikeBodyPhase(prev: number, arc: number, dt: number): number {
  if (arc < 0) return -1;
  const p = prev < 0 ? 0 : prev;
  if (arc <= p) return arc;
  return Math.min(arc, p + STRIKE_BODY_RATE * dt);
}
