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
 * - drive: the hips turn left first (`lead` of the phase ahead, ~3 frames), the shoulders follow through (about 33 deg
 *   of shoulder turn over the arc), the weight forward onto the lead (left) foot; the elbow arc (the graph's hand
 *   sweep, `meleeSweep`) finishes last, so the chain reads hips -> shoulders -> elbow;
 * - recovery (from 0.62): back to rest at phase 1.
 * The head stays on the target (the rig's head is world-stabilised; the neck takes back `neck` of the shoulder turn).
 * The rig turns the arm targets with the shoulders (about the shoulder), so the elbow drives through with the chest.
 *
 * The values are the code defaults (`STRIKE_BODY`); the tuner's "Elbow strike" section scales them (`STRIKE_SECTION`,
 * identity at default) and `scripts/anim-tune-bake.mjs` bakes a tune back into `STRIKE_BODY` (tuneBakeTable.ts).
 */
import { registerTuneSection, TUNE_FLAGS, type TuneTunable } from './tuneRegistry';

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
 *  DRIVE_LEN (the shoulders; the hips `lead` earlier), the recovery eases back from REC_FROM over REC_LEN. */
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
  { id: 'hipLead', label: 'Strike: hips lead the shoulders', kind: 'mul', def: 1, min: 0, max: 3, step: 0.05, unit: 'x', groups: G, hook: 'strikeBody.ts STRIKE_BODY.lead (phase the hips turn ahead of the shoulders)' },
  { id: 'shift', label: 'Strike: weight onto the front foot', kind: 'mul', def: 1, min: 0, max: 3, step: 0.05, unit: 'x', groups: G, hook: 'strikeBody.ts STRIKE_BODY.fwd / side (the pelvis forward and over the lead foot)' },
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
 * The offsets at strike phase `ph` (0..1; < 0 the rest pose) with the tuner's sliders on `STRIKE_BODY`. Pure: writes
 * `out`. No allocation.
 */
export function strikeBodyAt(ph: number, out: StrikeBodyOut): StrikeBodyOut {
  if (ph < 0) return strikeBodyRest(out);
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
