import type { MapDef } from '../mapDef';
import { kestrel } from './kestrel';
import { provingGrounds } from './provingGrounds';
import { seclab } from './seclab';
import { courselab } from './courselab';
import { bunker } from './bunker';
import { ctcourse, ctcourseReplan } from './ctcourse';
import { flags } from '../../core/flags';
import { warehouse } from './warehouse';
import { warehouseOps } from './warehouseOps';
import { campusOps } from './campusOps';
import { studio } from './studio';
import { thornbeckMill } from './thornbeckMill';

/**
 * The listed maps (3.0): Warehouse runs every mode; Saltmarsh Park (`campusOps`, sector-redesign) is listed from slice 3 (`listed.ts`); Proving Grounds is the basic test range (Free
 * Roam); Kestrel is the Cinder Yard (Mission 1) massing walk (Sandbox); Seclab is the Kestrel security debug room (not listed, boot with ?autostart=seclab). Marlow Yard (`ctcourse`, CT prototype) is the CT training course (course mode, not listed; ?autostart=ctcourse&mode=course) and the course's default map. Fallow (`bunker`) is parked behind `?legacy=1` (?legacy=1&autostart=bunker&mode=course). The first map
 * supporting a mode is its default. Parked maps: `parked.ts` (not imported). The retired maps (Exchange, Trunk Annex,
 * Dead Line v1 / v2) were deleted in the consolidation (`docs/archive/consolidation/deleted-maps.md`). (J14 Marlow
 * re-plan) `ctcourseReplan` sits after `ctcourse` (so `ctcourse` stays the course default): unlisted like it, dark behind
 * `flags.marlowReplan` (a host's room names it in `start`), and every map-wide check builds it.
 */
export const MAPS: MapDef[] = [warehouse, warehouseOps, campusOps, provingGrounds, kestrel, seclab, ctcourse, ctcourseReplan, courselab, ...(flags.legacy ? [bunker] : []), ...(flags.pianoEscape ? [thornbeckMill] : [])];

/** (anim-studio) Dev scenes that are not levels: never listed, never in a menu or a co-op lobby, not in `MAPS` (the map
 *  checks and the level design standard bind playable maps); reached by `getMap` (`?autostart=studio`, the Anim Studio
 *  entries). */
export const DEV_MAPS: readonly MapDef[] = [studio];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? DEV_MAPS.find((m) => m.id === id) ?? provingGrounds;
}
