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

/**
 * (strike-pops, n4c polish 1) The swap's progress (0..1) read back from the hand blend `b` (0 right .. 1 left): the
 * inverse of the plain swap's smoothstep, so a plain swap gets its own progress back (`handSwapK` and the graph's tuck
 * bump unchanged). A reversal rewound the progress (s -> 1 - s): the envelope kept its place but its rate flipped sign
 * in one frame (the gun dropping 8 cm a frame came up 3 cm the next). The blend keeps its velocity through a reversal
 * (the rig's Hermite), so the envelope read from it does too. Symmetric (b and 1 - b give 1 - s and s: the same
 * envelope), so either direction reads alike. Pure, no allocation.
 */
export function handSwapPh(b: number): number {
  const c = b < 0 ? 0 : b > 1 ? 1 : b;
  return 0.5 - Math.sin(Math.asin(1 - 2 * c) / 3);
}
