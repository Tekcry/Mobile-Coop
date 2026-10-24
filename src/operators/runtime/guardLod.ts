/**
 * (guard-models S11) The guard figures' render LOD table: every distance, bone fold and pose rate of a guard figure in
 * one place (pure, no Babylon). Render only: gameplay never reads it (CLAUDE.md hard rule; hit volumes, perception and
 * the light meter read the rig). Wren keeps `lodPick`'s own bands (`LOD_EDGES`, 8 / 25 m).
 *
 * - `edges`: LOD0 -> LOD1 at 6 m (PLAN 6's data lever, was 8), LOD1 -> LOD2 at 25 m; `lodPick`'s 10 % hysteresis.
 * - Bone folds (load time, `buildGuardLod`): a folded joint gets no bone, no pose and no upload; its vertices ride the
 *   nearest kept ancestor (fingers -> wrist, toe -> ankle, clavicle -> chest). LOD1 and LOD2 fold the fingers (the bake
 *   already leaves them out of LOD1 / LOD2, `lodBones`; this keeps any file that still has them, e.g. Wren's stand-in
 *   LOD1, at the same count); LOD2 also folds the toes and clavicles (23 -> 19 bones; a shrug or toe roll beyond 25 m
 *   is under a pixel).
 * - `halfRateFrom`: from this LOD the figure poses every other render frame, staggered by its slot (a ragdoll and a
 *   LOD switch pose at once; never two frames without a pose, so an anim tier that already halves the rate is not
 *   halved again).
 */
import { LOD_1, LOD_2 } from './manifest';

export const GUARD_LOD = {
  /** Band edges (m): LOD0 -> LOD1, LOD1 -> LOD2. */
  edges: [6, 25] as readonly [number, number],
  /** From this LOD the finger joints fold onto the wrists. */
  foldFingersFrom: LOD_1,
  /** From this LOD these joints fold too (onto the ankles, the chest). */
  foldMoreFrom: LOD_2,
  foldMore: ['toeL', 'toeR', 'clavL', 'clavR'] as readonly string[],
  /** From this LOD the figure poses at half rate. */
  halfRateFrom: LOD_2,
} as const;

/** A finger joint in either naming (the bake's `finger<S>_<f>_1`, Wren's `finger<S>_<f>_<seg>`). */
const FINGER = /^finger[LR]_/;

/** Does LOD `lod` fold joint `name` onto its nearest kept ancestor? Load time. */
export function guardFolds(lod: number, name: string): boolean {
  if (lod >= GUARD_LOD.foldFingersFrom && FINGER.test(name)) return true;
  return lod >= GUARD_LOD.foldMoreFrom && GUARD_LOD.foldMore.includes(name);
}

/**
 * (half-rate LODs) Does a figure at LOD `lod` with stagger `slot` pose on render frame `frame`, having last posed on
 * `posedAt`? Every frame below `halfRateFrom`; above it on its own parity, or whenever it missed the frame before (an
 * anim tier calling out of phase still gets every call it makes). Pure, no allocation.
 */
export function guardPosesNow(lod: number, slot: number, frame: number, posedAt: number): boolean {
  if (lod < GUARD_LOD.halfRateFrom) return true;
  return ((frame + slot) & 1) === 0 || frame - posedAt >= 2;
}
