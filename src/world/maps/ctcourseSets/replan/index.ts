/**
 * J14 Marlow re-plan: the per-set re-plan builders and floor-hole tables in route order (S0). `ctcourse.ts` reads this
 * for `{ replan: true }`; a set slice edits only its own `replan/<set>.ts`, never this file.
 */
import type { FacilityKit } from '../../../kit/facilityKit';
import type { LevelBuilder } from '../../../levelBuilder';
import type { FloorHole } from '../../ctcourseGreybox';
import type { SetId, SetPart } from '../types';
import * as a1 from './a1Gate';
import * as a2 from './a2CarriageShed';
import * as a3 from './a3OfficeRange';
import * as a4 from './a4GoodsShed';
import * as a5 from './a5Substation';
import * as a6 from './a6PumpHouse';
import * as a7 from './a7DataHall';
import * as a8 from './a8Strongroom';

/** The re-plan builders (`replan<Set>(b, kit, part)`), called after the set's own builder. */
export const REPLAN_BUILDERS: Readonly<Record<SetId, (b: LevelBuilder, kit: FacilityKit, part: SetPart) => void>> = {
  a1Gate: a1.replanA1Gate,
  a2CarriageShed: a2.replanA2CarriageShed,
  a3OfficeRange: a3.replanA3OfficeRange,
  a4GoodsShed: a4.replanA4GoodsShed,
  a5Substation: a5.replanA5Substation,
  a6PumpHouse: a6.replanA6PumpHouse,
  a7DataHall: a7.replanA7DataHall,
  a8Strongroom: a8.replanA8Strongroom,
};

/** Every set's holes in the site slab, in route order (the facility cuts the slab round all of them). */
export const REPLAN_FLOOR_HOLES: readonly FloorHole[] = [
  ...a1.FLOOR_HOLES,
  ...a2.FLOOR_HOLES,
  ...a3.FLOOR_HOLES,
  ...a4.FLOOR_HOLES,
  ...a5.FLOOR_HOLES,
  ...a6.FLOOR_HOLES,
  ...a7.FLOOR_HOLES,
  ...a8.FLOOR_HOLES,
];
