/**
 * (guard-render S4) Guard animation tiers: how often a guard's rig solves its pose. Pure (no Babylon); the scene side
 * (whether the merged body was drawn, camera and player distances) is `animTierView.ts`.
 *
 * Rules, first match wins:
 * - off (`?animtier=0`), pinned (in a takedown / held / carried, a scripted emote, climbing) or within
 *   `ANIM_TIER_NEAR_PLAYER` of any player (local or remote): every frame;
 * - off-screen (a render happened since the last update and the guard's merged body was drawn in no local view):
 *   every `ANIM_TIER_OFFSCREEN` th frame;
 * - beyond `ANIM_TIER_FAR` from the nearest local camera (the rig's anim LOD distance, never scaled by the Detail
 *   setting: PLAN S3): every `ANIM_TIER_FAR_PERIOD` th frame;
 * - else every frame.
 * Guards are staggered by `slot` (their spawn number) so the solves spread evenly across frames; the skipped frames'
 * time is carried into the next solve (as the rig's own `lodDt` does). The weapon glide is the rig's and runs every
 * frame regardless (`CharacterRig.animate`).
 * Gameplay never reads the guard's render pose: the head hit volume comes from the sim (`guardHead`, S3a).
 */

/** Far tier distance (m, horizontal): = `ANIM_LOD_DISTANCE` in `characterRig.ts` (tests assert it), unscaled. */
export const ANIM_TIER_FAR = 22;
/** Within this horizontal distance (m) of any player a guard always solves every frame. */
export const ANIM_TIER_NEAR_PLAYER = 4;
/** Solve every Nth frame off-screen. */
export const ANIM_TIER_OFFSCREEN = 4;
/** Solve every Nth frame when far. */
export const ANIM_TIER_FAR_PERIOD = 2;

export interface AnimTierIn {
  /** The tiers are on (`flags.animTier`). */
  on: boolean;
  /** Takedown / held / carried, a scripted emote, climbing: full rate. */
  pinned: boolean;
  /** A render happened since the last update (headless steps: false, so visibility is unknown and counts as seen). */
  rendered: boolean;
  /** The guard's body was drawn in at least one local view in the last render (no merged body: true). */
  seen: boolean;
  /** Squared horizontal distance to the nearest local camera (m^2; Infinity with none). */
  camDist2: number;
  /** Squared horizontal distance to the nearest player (m^2; Infinity with none). */
  playerDist2: number;
}

export function newAnimTierIn(): AnimTierIn {
  return { on: true, pinned: false, rendered: false, seen: true, camDist2: 0, playerDist2: Infinity };
}

/** The solve period (frames) for this frame's inputs: 1, `ANIM_TIER_FAR_PERIOD` or `ANIM_TIER_OFFSCREEN`. */
export function animTierPeriod(i: AnimTierIn): number {
  if (!i.on || i.pinned || i.playerDist2 < ANIM_TIER_NEAR_PLAYER * ANIM_TIER_NEAR_PLAYER) return 1;
  if (i.rendered && !i.seen) return ANIM_TIER_OFFSCREEN;
  if (i.camDist2 > ANIM_TIER_FAR * ANIM_TIER_FAR) return ANIM_TIER_FAR_PERIOD;
  return 1;
}

export interface AnimTierState {
  /** Stagger offset (the guard's number). */
  readonly slot: number;
  /** Updates so far. */
  tick: number;
  /** Time skipped since the last solve (s). */
  carry: number;
  /** Solved at least once (the first update always solves). */
  solved: boolean;
}

export function newAnimTierState(slot: number): AnimTierState {
  return { slot: Math.max(0, Math.floor(slot)), tick: 0, carry: 0, solved: false };
}

/** One render-frame update: the time to solve this frame (this frame's `dt` plus the carried time), or -1 to skip
 *  (the frame's `dt` is carried). Solves when `(tick + slot) % period == 0`, always on the first update and at period 1. */
export function animTierStep(st: AnimTierState, period: number, dt: number): number {
  const t = st.tick++;
  if (st.solved && period > 1 && (t + st.slot) % period !== 0) {
    st.carry += dt;
    return -1;
  }
  st.solved = true;
  const out = dt + st.carry;
  st.carry = 0;
  return out;
}
