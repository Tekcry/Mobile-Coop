/**
 * J14 Marlow re-plan, A6 the Pump House (slice G-A6; PLAN section 2, STATIONS.md sections 3, 6, 8, 9): the re-plan's own
 * pieces, called from `ctcourse.ts` right after the set builder when the map is built with `{ replan: true }`. Step 1
 * (the noise test) needs only the attendant's re-routed round; the pit, the outfall and the rest follow.
 */
import type { FacilityKit } from '../../../kit/facilityKit';
import type { LevelBuilder } from '../../../levelBuilder';
import type { FloorHole } from '../../ctcourseGreybox';
import { A6_PASS_WAIT } from '../a6PumpHouse';
import type { SetPart } from '../types';

/** Holes this set cuts in the site slab (world metres [x0, z0, x1, z1]); `ctcourse.ts` hands every set's table to the facility. */
export const FLOOR_HOLES: readonly FloorHole[] = [];

/** The drive pit's floor (the cage footprint sunk 1.6 m) and the drop-catch landing spot on it (STATIONS section 3, mark B of 16). */
export const A6_PIT_Y = -1.6;
export const A6_PIT_LANDING = { x: 51.5, y: A6_PIT_Y, z: 63.5 } as const;

/**
 * The attendant's round on the re-plan (the outfall housing closes the gap he crossed by the gauge board and the cage door):
 * D the desk (his post, facing south over the log), W round the desk's west end, G the gauge board on the housing's north
 * face (facing south), N1 / N2 along the north side of the cage under the bridge, P3 pump 3's east face (facing west), and
 * back the same way. His waits (4 / 3 / 4 s) and facings are the built round's.
 */
export const A6_ATTENDANT_ROUTE_REPLAN: [number, number][] = [
  [61.5, 67.1],
  [60.0, 67.0],
  [58.0, 64.6],
  [54.5, 67.5],
  [48.5, 67.5],
  [48.2, 61.0],
  [48.5, 67.5],
  [54.5, 67.5],
  [60.0, 67.0],
];
export const A6_ATTENDANT_WAITS_REPLAN = [4, A6_PASS_WAIT, 3, A6_PASS_WAIT, A6_PASS_WAIT, 4, A6_PASS_WAIT, A6_PASS_WAIT, A6_PASS_WAIT];
export const A6_ATTENDANT_FACES_REPLAN = [Math.PI, Number.NaN, Math.PI, Number.NaN, Number.NaN, -Math.PI / 2, Number.NaN, Number.NaN, Number.NaN];

/** Add the re-plan's pieces to `b` and amend `part` (the merge reads it afterwards). */
export function replanA6PumpHouse(_b: LevelBuilder, _kit: FacilityKit, _part: SetPart): void {
  // step 1 (the noise test) first; the build follows
}
