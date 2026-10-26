/**
 * J14 Marlow re-plan, A1 the Gate (slice G-A1A7; PLAN section 2, STATIONS.md sections 3, 6, 8, 9): the boost and the human
 * ladder up the 4.4 m boundary wall, nothing that can fail. The set's geometry is the built set's; this file only amends the
 * part the merge reads:
 * - the gate checker stays seated, passive, blind and deaf in `bay.squad` (BRIEF A11; `e2e-coop`'s Marlow block) and on no
 *   station's list: A1 has no guard;
 * - two wall-top pass zones (STATIONS section 8): `a1-top1` (one player on the wall top: the boost done) and `a1-top`
 *   (both: the ladder done), on the wall's 0.6 m top at 4.4 m;
 * - the wicket is a way back only (graph `a1-walltop`): a flag gate on `a1-top` joins the yard-side bolt on the same door
 *   (`CourseState.locked`: every gate on a door must be open), so B dropping into the yard and unbolting it cannot let A
 *   through until both have been on the wall top; afterwards its push bar is the way back. The striped mark's role claim
 *   (the booster takes A) is the built one;
 * - stations 1 and 2 (STATIONS section 3, verbatim, `retry: 'none'`), the objective lines (what and where) and LANTERN's
 *   entry line in place of "open the gate for your partner". Nothing can fail; (J14 A26) the one way back is for an early
 *   drop: a player in the yard before the ladder is done puts both back at the live station's marks (`a1Tick`,
 *   `src/game/course/replan/a1Ticks.ts`, cause `other`) with its `retry:<id>:other` line.
 * Only type imports from `../` besides the set file's constants and `retryKey` (the facility imports nothing from here).
 */
import { retryKey, type FlagGate } from '../../../../game/course/courseDef';
import type { StationDef } from '../../../../game/course/stationDef';
import type { FacilityKit } from '../../../kit/facilityKit';
import type { LevelBuilder } from '../../../levelBuilder';
import type { FloorHole } from '../../ctcourseGreybox';
import { A1_WALL, A1_WICKET_DOOR } from '../a1Gate';
import type { SetPart } from '../types';

/** Holes this set cuts in the site slab (world metres [x0, z0, x1, z1]); `ctcourse.ts` hands every set's table to the facility. */
export const FLOOR_HOLES: readonly FloorHole[] = [];

/** The wall-top flags (STATIONS section 8): one player on the top (station 1, the boost), both (station 2, the ladder). */
export const A1_TOP1_FLAG = 'a1-top1';
export const A1_TOP_FLAG = 'a1-top';
/** Their zone: the wall's top between its faces (11.7-12.3), z inside the hall walls; feet at the lip height. */
export const A1_TOP_ZONE: [number, number, number, number] = [A1_WALL.near, 2.3, A1_WALL.far, 19.7];
/** The wicket's second gate: shut until both players have been on the wall top (`a1-top`), then the bolt is the way back. */
export const A1_WICKET_TOP_GATE = 'g-a1-wicket-top';
/** (J14 A26) LANTERN's lines when an early drop into the yard puts the pair back (`a1Tick`, cause `other`). */
export const A1_TRAP_LINES = {
  'a1-boost': 'Into the yard too soon. The wicket stays shut till you are both up. Back to the mark.',
  'a1-ladder': 'Into the yard too soon. The wicket stays shut till you are both up. Back to the wall.',
} as const;

/** Stations 1 and 2 (STATIONS.md section 3, A1 block). */
export const A1_GATE_STATIONS: readonly StationDef[] = [
  { n: 1, id: 'a1-boost', lesson: 'boost', retry: 'none', doneFlag: 'a1-top1',
    marks: [{ x: 10.5, z: 6.0, y: 0, yaw: Math.PI / 2 }, { x: 9.5, z: 6.0, y: 0, yaw: Math.PI / 2 }],
    guards: [], gates: [] },
  { n: 2, id: 'a1-ladder', lesson: 'human_ladder', retry: 'none', doneFlag: 'a1-top',
    marks: [{ x: 10.5, z: 6.0, y: 0, yaw: Math.PI / 2 }, { x: 12.0, z: 6.0, y: 4.4, yaw: -Math.PI / 2 }],
    guards: [], gates: ['g-a1-wicket'] },
];

/** The built objective steps this set replaces (`a1Gate.ts`). */
const BUILT_STEPS = ['a1-over', 'a1-lock'];

/** Add the re-plan's pieces to `b` and amend `part` (the merge reads it afterwards). */
export function replanA1Gate(_b: LevelBuilder, _kit: FacilityKit, part: SetPart): void {
  part.passZones.push(
    { id: 'a1-p-top1', box: A1_TOP_ZONE, flag: A1_TOP1_FLAG, floorY: A1_WALL.lip, any: true },
    { id: 'a1-p-top', box: A1_TOP_ZONE, flag: A1_TOP_FLAG, floorY: A1_WALL.lip },
  );
  part.externalFlags.push(A1_TOP1_FLAG, A1_TOP_FLAG);
  part.bay.gates.push({ kind: 'flag', id: A1_WICKET_TOP_GATE, flag: A1_TOP_FLAG, doorId: A1_WICKET_DOOR } satisfies FlagGate);
  part.bay.stations = A1_GATE_STATIONS;

  // the steps: the boost, the ladder, then the way on (the relay and the wicket handshake are gone)
  for (let i = part.objectives.length - 1; i >= 0; i--) if (BUILT_STEPS.includes(part.objectives[i]!.id)) part.objectives.splice(i, 1);
  part.objectives.push(
    {
      id: 'a1-boost',
      bay: 'A1',
      text: 'Boost at the striped mark: one of you onto the yard wall top.',
      a: 'Crouch on the striped mark by the wall and boost your partner up.',
      b: 'Take the boost from the striped mark and climb onto the wall top.',
      done: { flag: A1_TOP1_FLAG },
    },
    {
      id: 'a1-ladder',
      bay: 'A1',
      text: 'Human ladder at the striped mark: the one on top hangs, the other climbs.',
      a: "Climb your partner's legs from the striped mark onto the wall top.",
      b: 'Hang down off the wall top over the striped mark for your partner.',
      done: { flag: A1_TOP_FLAG },
    },
    { id: 'a1-lock', bay: 'A1', text: 'Drop into the yard. Both of you into holding room one.' },
  );
  // the built two (the entry line asked B to open the gate for A; the other was keyed to the old step)
  part.bay.radio.length = 0;
  part.bay.radio.push(
    { at: 'enter', text: 'Evening. Over the yard wall, both of you. The wicket stays shut till you are.' },
    { at: 'a1-boost', text: 'Good. That is the boost.' },
    { at: 'a1-ladder', text: 'Good. That is the ladder. You will use both all night.' },
    { at: retryKey('a1-boost', 'other'), text: A1_TRAP_LINES['a1-boost'] },
    { at: retryKey('a1-ladder', 'other'), text: A1_TRAP_LINES['a1-ladder'] },
  );
}
