/**
 * (anim-n4c, AUDIT row 29) The weapon changing hands (the open-left wall edge, the left-shoulder aim swap): the path the
 * gun takes across the body. Pure, no Babylon (the rig reads it).
 *
 * Before: aimed, the swap carried the gun across at face height (the graph's half weld at the mid-point plus the half
 * sight raise), straight through the head ball and the top of the trunk; `clearBody` shoved it up and round the head
 * (the butt up past the eye, 0.27 m of push) and flipped it to the other side in one frame at the centre line (a 28-31 cm
 * pop), so the rifle read as swinging up over the shoulder. Now the sight lets go of the eye and the gun drops and comes
 * forward, under the chin, in front of the chest, on one eased envelope (no stall).
 */

/**
 * The aimed swap's drop (m, down in the chest frame) and its forward carry (m, clear of the chest) at the mid-point,
 * times the raise (a lowered gun is already low) and the Gun section's `swapDropMul` (tuner; baked here, `tuneBakeTable.ts`).
 */
export const HAND_SWAP = { drop: 0.12, fwd: 0.3 };

/**
 * The swap's envelope over the switch progress `s` (0..1; -1 idle): sin^2(pi s), 0 -> 1 -> 0 with zero rate at both
 * ends (one eased move down and back up). Symmetric about 0.5, so a reversal's rewind (s -> 1 - s) keeps it continuous.
 */
export function handSwapK(s: number): number {
  if (s < 0) return 0;
  const v = Math.sin(Math.PI * Math.min(1, s));
  return v * v;
}
