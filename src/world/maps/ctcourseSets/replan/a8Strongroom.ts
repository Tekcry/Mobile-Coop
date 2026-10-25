/**
 * J14 Marlow re-plan, A8 the Strongroom: the re-plan's own pieces (geometry, closers, stations, stand-ins, lamps), called from
 * `ctcourse.ts` right after the set builder when the map is built with `{ replan: true }`. S0 stub: a no-op until this
 * set's slice fills it. Only type imports from `../` (the facility imports nothing from here), so this file may import
 * its set file and the greybox helpers without a cycle.
 */
import type { FacilityKit } from '../../../kit/facilityKit';
import type { LevelBuilder } from '../../../levelBuilder';
import type { FloorHole } from '../../ctcourseGreybox';
import type { StationDef } from '../../../../game/course/stationDef';
import type { SetPart } from '../types';

/** Holes this set cuts in the site slab (world metres [x0, z0, x1, z1]); `ctcourse.ts` hands every set's table to the facility. */
export const FLOOR_HOLES: readonly FloorHole[] = [];

/** Station 20's done flag: its pass zone `a8-grille-in` (STATIONS section 8), one player through the public grille. */
export const A8_GRILLE_IN_FLAG = 'a8-grille-in';

/** Stations 18-21 (STATIONS.md section 3, A8 block, verbatim): badge 18's four `caught` steps. */
export const A8_STATIONS: readonly StationDef[] = [
  { n: 18, id: 'a8-c2run', lesson: 'jam_relay', retry: 'caught', doneFlag: 'a8-office-in',
    marks: [{ x: 107.5, z: 64.0, y: 0, yaw: Math.PI / 2 }, { x: 107.5, z: 65.5, y: 0, yaw: Math.PI / 2 }],
    guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['a8-cam1', 'a8-cam2', 'a8-cam3'] },
  { n: 19, id: 'a8-loopset', lesson: 'camera_loop', retry: 'caught', doneFlag: 'a8-loop',
    marks: [{ x: 135.0, z: 76.5, y: 4.4, yaw: Math.PI / 2 }, { x: 126.5, z: 76.5, y: 0, yaw: 0 }],
    guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['g-a8-console'] },
  { n: 20, id: 'a8-isolate', lesson: 'timed_light_cut', retry: 'caught', doneFlag: 'a8-grille-in', drillS: 25,
    marks: [{ x: 141.5, z: 73.5, y: 4.4, yaw: Math.PI / 2 }, { x: 126.5, z: 76.5, y: 0, yaw: 0 }],
    guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['g-a8-night', 'g-a8-grille'] },
  { n: 21, id: 'a8-locks', lesson: 'synced_hack', retry: 'caught', doneFlag: 'a8-sync', drillS: 60,
    marks: [{ x: 141.5, z: 73.5, y: 4.4, yaw: Math.PI / 2 }, { x: 135.5, z: 66.5, y: 0, yaw: Math.PI / 2 }],
    guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['g-a8-console', 'g-a8-vault', 'laser-a8'] },
];

/** Add the re-plan's pieces to `b` and amend `part` (the merge reads it afterwards). */
export function replanA8Strongroom(_b: LevelBuilder, _kit: FacilityKit, _part: SetPart): void {
  // S0 stub (J14): the set slice builds here
}
