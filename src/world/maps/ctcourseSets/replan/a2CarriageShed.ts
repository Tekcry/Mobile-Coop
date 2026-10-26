/**
 * J14 Marlow re-plan, A2 the Carriage Shed: the re-plan's own pieces (geometry, closers, stations, stand-ins, lamps), called from
 * `ctcourse.ts` right after the set builder when the map is built with `{ replan: true }`. S0 stub: a no-op until this
 * set's slice fills it. Only type imports from `../` (the facility imports nothing from here), so this file may import
 * its set file and the greybox helpers without a cycle.
 */
import type { FacilityKit } from '../../../kit/facilityKit';
import type { LevelBuilder } from '../../../levelBuilder';
import type { FloorHole } from '../../ctcourseGreybox';
import type { SetPart } from '../types';

/** Holes this set cuts in the site slab (world metres [x0, z0, x1, z1]); `ctcourse.ts` hands every set's table to the facility. */
export const FLOOR_HOLES: readonly FloorHole[] = [];

/** Add the re-plan's pieces to `b` and amend `part` (the merge reads it afterwards). */
export function replanA2CarriageShed(_b: LevelBuilder, _kit: FacilityKit, _part: SetPart): void {
  // S0 stub (J14): the set slice builds here
}
