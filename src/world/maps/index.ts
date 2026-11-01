import type { MapDef } from '../mapDef';
import { kestrel } from './kestrel';
import { seclab } from './seclab';
import { courselab } from './courselab';
import { ctcourse, ctcourseReplan } from './ctcourse';
import { tallowWharf } from './tallowWharf';
import { chamber } from './chamber';

/**
 * The maps: Kestrel is the Cinder Yard (Mission 1) massing walk (Sandbox); Seclab is the Kestrel security debug room (not listed, boot with ?autostart=seclab). Marlow Yard (`ctcourse`, CT prototype) is the CT training course (course mode, not listed; ?autostart=ctcourse&mode=course) and the course's default map. Tallow Wharf (`tallowWharf`, mission-framework GB0) is the campaign map's greybox (sector mode, not listed; ?autostart=tallowWharf&mode=sector&mission=<id>). The first map
 * supporting a mode is its default. The retired maps (Exchange, Trunk Annex, Dead Line v1 / v2) were deleted in the
 * consolidation (`docs/archive/consolidation/deleted-maps.md`); Warehouse, Proving Grounds and the five parked maps
 * (Embassy, Mansion, Port, Refinery, Dust Depot) in clean-up stage H. (J14 Marlow
 * re-plan) `ctcourseReplan` sits after `ctcourse` (so `ctcourse` stays the course default): unlisted like it, dark behind
 * `flags.marlowReplan` (a host's room names it in `start`), and every map-wide check builds it.
 */
export const MAPS: MapDef[] = [kestrel, seclab, ctcourse, ctcourseReplan, tallowWharf, courselab];

/** (anim-studio) Dev scenes that are not levels: never in a map list, not in `MAPS` (the map checks and the level design
 *  standard bind playable maps); reached by `getMap` (`?autostart=chamber`, the main menu's Test Chamber row, the benchmark and
 *  the co-op lobby's Test Chamber mode, which hosts `chamber` in the `test` mode: a map id is all the wire carries). */
export const DEV_MAPS: readonly MapDef[] = [chamber];

/** An id no map has (a stale link to a removed map) reads as Marlow Yard: a real map in `MAPS`, so no list ever lands on a dev scene. */
export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? DEV_MAPS.find((m) => m.id === id) ?? ctcourse;
}
