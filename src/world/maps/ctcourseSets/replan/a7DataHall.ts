/**
 * J14 Marlow re-plan, A7 the Data Hall (slice G-A1A7; PLAN section 2, STATIONS.md sections 3, 6, 9): the split paths and the
 * synced hack, now with two-way cover. The set file builds everything but the lobby's east wall (its `opts.replan` guards);
 * this file adds:
 * - the full-height glazed lobby screen on x 76 (z 55.95-65.85) to the 4.0 m slab, the hall door `A7-hall` kept: `kit.glass`
 *   (stops movement and guard / camera sight, passes light), a transom over the door and one solid jamb pier south of it
 *   carrying the rack-row switch (z 60.25-61.0). From the lobby a player looks down all three aisles and the cage front
 *   (graph `a7-hall` vantage); the technicians cannot see into the lobby;
 * - the second technician `a7-tech2` (Michael ~20:40 "12, add two"; PLAN "Guards per lesson"): spawned in the hall at the
 *   containment pod's monitoring panel on the north apron's east end (facing the pod's solid north wall: he sees nothing of
 *   either route there), walking to the cage's north-east corner, where he looks south-south-east through the cage's
 *   north and east mesh at the pod's south door and T2's spot (the pod leg's approach), and back. His whole round is in
 *   the hall's north apron, never in the pod's box (the pod stays a quiet connector, LD 3.8). From the front aisle and T1's
 *   spot the hall leg sees him through both mesh faces, so each partner covers the other: the pod leg watches the rows 1-2
 *   technician through the mesh, the hall leg watches this one;
 * - station 17 (STATIONS section 3, verbatim): the split and the synced hack, `retry: 'station'` (seen); no `drillS` (SA6:
 *   a hack miss resets the terminals in place, the scanner's own rule), and LANTERN's retry line (section 6, verbatim).
 * The objective lines and the lamps are the built set's (no circuit change) but the sync step's A line (marlow-play-2 C14).
 * Only type imports from `../` besides the set file's constants (the facility imports nothing from here).
 */
import { retryKey } from '../../../../game/course/courseDef';
import type { StationDef } from '../../../../game/course/stationDef';
import { KIT_BOX_COLOR, type FacilityKit } from '../../../kit/facilityKit';
import type { LevelBuilder } from '../../../levelBuilder';
import type { FloorHole } from '../../ctcourseGreybox';
import { A7_H } from '../a7DataHall';
import { tally, type SetPart } from '../types';

/** Holes this set cuts in the site slab (world metres [x0, z0, x1, z1]); `ctcourse.ts` hands every set's table to the facility. */
export const FLOOR_HOLES: readonly FloorHole[] = [];

/** The glazed screen (`a7DataHall.ts`'s lobby east wall line x 76, the corridor wall's face to the riser block's), the hall
 *  door's span and height it keeps, and the jamb pier carrying the rack-row switch (built at z 60.4). */
export const A7_SCREEN = { x: 76, z0: 55.95, z1: 65.85, door: [61.0, 62.2] as [number, number], doorH: 2.1, pier: [60.25, 61.0] as [number, number], t: 0.3 } as const;

/** The second technician (STATIONS section 9 `a7-tech2`*): squad slot id, his round on the north apron, its stops and facings. */
export const A7_TECH2 = 'a7-tech2';
/** P0 the pod's monitoring panel at the north apron's east end (facing south: the pod's solid north wall), P1 the cage's
 *  north-east corner (facing the pod's south door through the cage's north and east mesh). */
export const A7_TECH2_ROUTE: [number, number][] = [[98.5, 70.5], [94.0, 68.5]];
export const A7_TECH2_WAITS = [12, 8];
export const A7_TECH2_FACES = [Math.PI, Math.atan2(98 - 94, 56.2 - 68.5)];
/** His look stop (P1) and the pod leg's approach he watches from it: inside the pod's south door, the pod's middle, T2's spot. */
export const A7_TECH2_LOOK: [number, number] = A7_TECH2_ROUTE[1]!;
export const A7_POD_APPROACH: readonly [number, number][] = [[98.0, 56.6], [98.0, 59.0], [96.65, 61.5]];

/** Station 17 (STATIONS.md section 3, A7 block). */
export const A7_DATA_HALL_STATIONS: readonly StationDef[] = [
  { n: 17, id: 'a7-split', lesson: 'synced_hack', retry: 'station', doneFlag: 'a7-sync',
    marks: [{ x: 74.0, z: 62.0, y: 0, yaw: Math.PI / 2 }, { x: 72.5, z: 57.0, y: 0, yaw: Math.PI }],
    guards: ['a7-tech', 'a7-tech2'], gates: ['g-a7-cage-w', 'g-a7-cage-e', 'g-a7-east', 'a7-cam1', 'a7-cam2'] },
];

/** LANTERN's line when station 17 retries (STATIONS section 6). */
export const A7_RETRY_LINE = 'Seen in the data hall. Back to the entry lobby.';

/** (marlow-play-2 C14) A's hack line on the re-plan: A counts the pair in (the built line had both on the other's count). B's
 *  line and the built yard's (its walk reads them) stay as built. */
export const A7_SYNC_A_LINE = 'Count your partner in, then hack terminal one together.';

/** Add the re-plan's pieces to `b` and amend `part` (the merge reads it afterwards). */
export function replanA7DataHall(b: LevelBuilder, kit: FacilityKit, part: SetPart): void {
  const S = A7_SCREEN;
  tally(b, part.register, 'A7-R1', 'Glazed lobby screen on x 76, z 55.95-65.85, full height to the 4.0 m slab (kit.glass: stops movement and guard / camera sight, passes light), a glass transom over the kept hall door A7-hall, one solid noLedge jamb pier z 60.25-61.0 carrying the rack-row switch', () => {
    const from = b.boxes.length;
    b.box(S.x, A7_H.slab / 2, (S.pier[0] + S.pier[1]) / 2, S.t, A7_H.slab, S.pier[1] - S.pier[0], KIT_BOX_COLOR);
    b.mark(from, { noLedge: true });
    kit.glass(S.x, S.z0, S.x, S.pier[0], A7_H.slab);
    kit.glass(S.x, S.door[0], S.x, S.door[1], A7_H.slab - S.doorH, { y: S.doorH });
    kit.glass(S.x, S.door[1], S.x, S.z1, A7_H.slab);
  });

  part.squads[A7_TECH2] = { kind: 'grunt', x: A7_TECH2_ROUTE[0]![0], z: A7_TECH2_ROUTE[0]![1], yaw: Math.PI, route: A7_TECH2_ROUTE, waits: A7_TECH2_WAITS, faces: A7_TECH2_FACES };
  part.bay.squad.push(A7_TECH2);
  part.bay.stations = A7_DATA_HALL_STATIONS;
  part.bay.radio.push({ at: retryKey('a7-split'), text: A7_RETRY_LINE });
  // (marlow-play-2 C14) the sync step's A line (a copy: the built set's objective is left alone)
  const si = part.objectives.findIndex((o) => o.id === 'a7-sync');
  if (si >= 0) part.objectives[si] = { ...part.objectives[si]!, a: A7_SYNC_A_LINE };
  part.debugPoints.push({ id: 'A7-tech2', label: 'Set 7 second technician (north apron, the pod panel)', pos: { x: A7_TECH2_ROUTE[0]![0], y: 0, z: A7_TECH2_ROUTE[0]![1] }, yaw: Math.PI });
}
