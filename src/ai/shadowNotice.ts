/**
 * (guard-ai-j16 G2, J16) The guard's notice rule for a player's cast shadow (Michael Q14 / G379: "A faint cue"; the
 * picked option: a moving shadow in his focus cone raises suspicion only, never detection). PLAN section 1, BRIEF
 * A1-A6, A11.
 *
 * One pure decision over one player's footprints (`ShadowCues`, Sector Ops' 10 Hz fill): the nearest floor point that
 * is contrasted enough, on a moving footprint, 1-10 m from the guard (horizontal) and inside his focused cone. The
 * caller (G3, `Enemy.shadowLook`) owns everything else: who may look (A6), the one line-of-sight ray (A4, `slack`) and
 * the reaction (A5, `meter`). Every input the decision reads lands in `out` (A11: the debug probe and the e2e log why).
 *
 * Pure: no Babylon, no graphics state, nothing from src/game or src/net. Hot (each calm guard's think, per unseen
 * player): no allocation, and no double crosses the call: the guard's position and yaw go in through `NOTICE_IN`, the
 * result out through `out` (a Float64Array of `NOTICE_OUT`); only ints are passed and returned.
 */
import { hyp2 } from '../core/mathx';
import { CUE, type ShadowCues } from '../world/shadowCues';
import { PERCEPTION } from './perception';

/**
 * The cue's numbers (PLAN section 1; tuned at the walk):
 * - `enabled`: the whole cue (A5's undo: false and no guard reacts to a shadow).
 * - `contrast` 0.40: a point's contrast (the field gives 0..0.85, `1 - CAPSULE.floor`) at least this: a shadow that
 *   takes 40 % or more of the light there, plainly darker than the floor round it; fainter ones are lost in the
 *   lamp falloff (A1). Raise it first if the walk finds dim shadows noticed (`CUE.minLevel` lets weak lamps count).
 * - `moving` 0.3 m/s: the footprint's far point must move at least this (the option's "a moving shadow", A2). A
 *   moving player's shadow tip moves at least his own speed (the far point is the projected top), so a full sneak
 *   (0.8 m/s) passes; a still player's shadow reads speed 0 exactly (`ShadowCues` keeps doubles) and does not; a
 *   still player under a swinging pendant does (his shadow moves). 0 lets still shadows count.
 * - `near` 1 m, `range` 10 m: horizontal distance from the guard's feet (A3). Under 1 m the shadow is at his feet and
 *   `closeRange` (1.8 m) already notices a moving body; past 10 m a floor shadow is a smudge (the focused sight range
 *   is 25 m for a whole lit body).
 * - `half`: the focused cone (`PERCEPTION.focusHalf`, 27.5 deg); no peripheral vision for a shadow (A3).
 * - `meter` 0.35: the reaction's meter floor (A5): above `PERCEPTION.suspicious` 0.3 (he looks: the white arc), below
 *   hearing's `HEARING.turnMax` 0.45 (a heard sound outranks a shadow) and `investigate` 0.6 (never walks over). It must
 *   stay under `ALERT.lingerMeter + PERCEPTION.decay / 2 x ALERT.hearLook` (0.15 + 0.09 x 2.4 = 0.366) so that after
 *   the last cue it drains below `lingerMeter` before his `hearLook` turn ends, even at the half drain, and he calms
 *   instead of investigating (PLAN section 1).
 * - `slack` 0.2 m: the caller's line-of-sight ray from his eye to the point is clear when nothing is hit nearer than
 *   the point less this (`losClear`'s slack, as the body sample rays): the floor under the point never blocks it (A4).
 */
export const SHADOW_NOTICE = {
  enabled: true,
  contrast: 0.4,
  moving: 0.3,
  near: 1,
  range: 10,
  half: PERCEPTION.focusHalf,
  meter: 0.35,
  slack: 0.2,
} as const;

/** `noticeInto`'s input: the guard's feet x, z and his yaw (rad, forward (sin yaw, cos yaw)). Written by the caller. */
export const NOTICE_IN = new Float64Array(3);
export const NI_X = 0;
export const NI_Z = 1;
export const NI_YAW = 2;

/** `noticeInto`'s result layout (`out` has at least `NOTICE_OUT` slots): the point x, y, z, its contrast, its
 *  footprint's speed (m/s), the horizontal distance (m) and the angle off his facing (rad, -pi..pi: `atan2(dx, dz) - yaw`
 *  wrapped, as `Enemy.perceive`'s `P_ANGLE`). Written only when a point is found. */
export const NO_X = 0;
export const NO_Y = 1;
export const NO_Z = 2;
export const NO_CONTRAST = 3;
export const NO_SPEED = 4;
export const NO_DIST = 5;
export const NO_ANGLE = 6;
export const NOTICE_OUT = 7;

/** What the rule reads of the cues (`ShadowCues` fits it). */
export type NoticeCues = Pick<ShadowCues, 'count' | 'pts' | 'speed'>;

/** Floats per point and per slot in `ShadowCues.pts` (x y z contrast). */
const PT = 4;
const SLOT_PTS = CUE.sources * CUE.points;

/**
 * Over player slot `slot`'s footprints, the nearest point (horizontal, from `NOTICE_IN`'s feet) that passes every
 * gate: footprint speed >= `moving`, contrast >= `contrast`, `near` <= distance <= `range`, |angle| <= `half`. Writes it
 * to `out` (`NO_*`) and returns its index in the slot (footprint x `CUE.points` + point), or -1 (none, the cue
 * disabled, or a slot outside 0..`CUE.players` - 1). A footprint's source (a lamp, the moon -1) does not matter. Ties
 * keep the first. No allocation.
 */
export function noticeInto(cues: NoticeCues, slot: number, out: Float64Array): number {
  if (!SHADOW_NOTICE.enabled || slot < 0 || slot >= CUE.players) return -1;
  const nf = cues.count[slot]!;
  if (nf <= 0) return -1;
  const gx = NOTICE_IN[NI_X]!;
  const gz = NOTICE_IN[NI_Z]!;
  const yaw = NOTICE_IN[NI_YAW]!;
  const sy = Math.sin(yaw);
  const cy = Math.cos(yaw);
  const pts = cues.pts;
  const N = SHADOW_NOTICE;
  let best = -1;
  let bestQ = 0;
  let bestD = Infinity;
  let bestA = 0;
  let bestV = 0;
  for (let f = 0; f < nf && f < CUE.sources; f++) {
    const v = cues.speed[slot * CUE.sources + f]!;
    if (!(v >= N.moving)) continue;
    for (let p = 0; p < CUE.points; p++) {
      const q = (slot * SLOT_PTS + f * CUE.points + p) * PT;
      if (!(pts[q + 3]! >= N.contrast)) continue;
      const dx = pts[q]! - gx;
      const dz = pts[q + 2]! - gz;
      const d = hyp2(dx, dz);
      if (d < N.near || d > N.range || d >= bestD) continue;
      // the point's bearing off his facing: (dx, dz) turned by -yaw, already wrapped to -pi..pi
      const a = Math.atan2(dx * cy - dz * sy, dz * cy + dx * sy);
      if (a > N.half || a < -N.half) continue;
      best = f * CUE.points + p;
      bestQ = q;
      bestD = d;
      bestA = a;
      bestV = v;
    }
  }
  if (best < 0) return -1;
  out[NO_X] = pts[bestQ]!;
  out[NO_Y] = pts[bestQ + 1]!;
  out[NO_Z] = pts[bestQ + 2]!;
  out[NO_CONTRAST] = pts[bestQ + 3]!;
  out[NO_SPEED] = bestV;
  out[NO_DIST] = bestD;
  out[NO_ANGLE] = bestA;
  return best;
}
