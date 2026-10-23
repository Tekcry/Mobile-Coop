/**
 * (sector-redesign perfg) The FROZEN anim tier: while the guard render freeze (`sectorGuardFreezeView.ts`) has a
 * guard's rig root disabled, nothing of him is drawn (body, gun, shadows), so his rig skips the pose solve entirely.
 * The skipped time is carried, capped at `ANIM_FROZEN_CARRY_MAX`, into the first solve after the thaw (as the rig's own
 * `lodDt` carries LOD-skipped frames), so a long freeze does not fast-forward springs and clocks on the thaw. Pure (no
 * Babylon). Render only: gameplay reads none of the pose (the head hit volume is the sim's `guardHead`, S3a).
 * Folds into master's `animTier.ts` (guard-render S4) as its FROZEN tier at the merge: the rule reads the root flag only.
 */

/** The most time (s) a thaw solve catches up. */
export const ANIM_FROZEN_CARRY_MAX = 0.1;

export interface AnimFrozenState {
  /** Time skipped while frozen (s, <= `ANIM_FROZEN_CARRY_MAX`). */
  carry: number;
}

export function newAnimFrozenState(): AnimFrozenState {
  return { carry: 0 };
}

/** One render frame: -1 to skip the solve (frozen; `dt` carried, capped), else the time to solve (`dt` plus the carry,
 *  which is then cleared). No allocation. */
export function animFrozenStep(st: AnimFrozenState, frozen: boolean, dt: number): number {
  if (frozen) {
    const c = st.carry + dt;
    st.carry = c < ANIM_FROZEN_CARRY_MAX ? c : ANIM_FROZEN_CARRY_MAX;
    return -1;
  }
  const out = dt + st.carry;
  st.carry = 0;
  return out;
}
