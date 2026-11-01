import type { MapDef } from '../mapDef';
import { kestrel } from './kestrel';
import { provingGrounds } from './provingGrounds';
import { seclab } from './seclab';
import { courselab } from './courselab';
import { ctcourse, ctcourseReplan } from './ctcourse';
import { tallowWharf } from './tallowWharf';
import { warehouse } from './warehouse';
import { studio } from './studio';

/**
 * The listed maps (3.0): Warehouse runs every mode; Proving Grounds is the basic test range (Free
 * Roam); Kestrel is the Cinder Yard (Mission 1) massing walk (Sandbox); Seclab is the Kestrel security debug room (not listed, boot with ?autostart=seclab). Marlow Yard (`ctcourse`, CT prototype) is the CT training course (course mode, not listed; ?autostart=ctcourse&mode=course) and the course's default map. Tallow Wharf (`tallowWharf`, mission-framework GB0) is the campaign map's greybox (sector mode, not listed; ?autostart=tallowWharf&mode=sector&mission=<id>). The first map
 * supporting a mode is its default. Parked maps: `parked.ts` (not imported). The retired maps (Exchange, Trunk Annex,
 * Dead Line v1 / v2) were deleted in the consolidation (`docs/archive/consolidation/deleted-maps.md`). (J14 Marlow
 * re-plan) `ctcourseReplan` sits after `ctcourse` (so `ctcourse` stays the course default): unlisted like it, dark behind
 * `flags.marlowReplan` (a host's room names it in `start`), and every map-wide check builds it.
 */
export const MAPS: MapDef[] = [warehouse, provingGrounds, kestrel, seclab, ctcourse, ctcourseReplan, tallowWharf, courselab];

/** (anim-studio) Dev scenes that are not levels: never in a map list, not in `MAPS` (the map checks and the level design
 *  standard bind playable maps); reached by `getMap` (`?autostart=studio`, the main menu's Test Chamber row, and the co-op
 *  lobby's Test Chamber mode, which hosts `studio` in Free Roam: a map id is all the wire carries). */
export const DEV_MAPS: readonly MapDef[] = [studio];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? DEV_MAPS.find((m) => m.id === id) ?? provingGrounds;
}
