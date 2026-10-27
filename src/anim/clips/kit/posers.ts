/**
 * (coop-kit K0) The kit moves' own role bodies, registered by the KA animation slices' pose files
 * (`src/anim/clips/kit/<move>.ts`, loaded eagerly by `team.ts` with `import.meta.glob('./kit/*.ts')`). A move with no
 * entry plays its placeholder (`KIT_B_PLACEHOLDER` in `team.ts`). Its own module (no runtime import) so a pose file can
 * register at load without a cycle through `team.ts`; a pose file may import `team.ts` helpers but must not read its
 * constants at its own top level (they are not initialised yet while `team.ts` loads the folder).
 */
import type { KitPoseMove, TeamBPose, TeamPoseIn } from '../team';

/** A kit move's role B body. Role A's body is its traverse (the local move file's pose; a remote: `KIT_A_TRAVERSE`). */
export interface KitPoser {
  /** Role B's working body for the input `i` (`t` s since the pose began) into `o` (B frame at 1.75 m, as `boostB`).
   *  Every frame: no allocation. */
  b(i: TeamPoseIn, t: number, o: TeamBPose): void;
}

/** Registered posers by move (none = the placeholder). */
export const KIT_POSERS = new Map<KitPoseMove, KitPoser>();

/** Register (or replace) a move's poser (a pose file, at load). */
export function registerKitPoser(move: KitPoseMove, p: KitPoser): void {
  KIT_POSERS.set(move, p);
}
