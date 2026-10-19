import type { MapDef } from '../mapDef';
import { kestrel } from './kestrel';
import { provingGrounds } from './provingGrounds';
import { seclab } from './seclab';
import { courselab } from './courselab';
import { bunker } from './bunker';
import { ctcourse } from './ctcourse';
import { flags } from '../../core/flags';
import { warehouse } from './warehouse';

/**
 * The listed maps (3.0): Warehouse runs every mode; Proving Grounds is the basic test range (Free
 * Roam); Kestrel is the Cinder Yard (Mission 1) massing walk (Sandbox); Seclab is the Kestrel security debug room (not listed, boot with ?autostart=seclab). Marlow Yard (`ctcourse`, CT prototype) is the CT training course (course mode, not listed; ?autostart=ctcourse&mode=course) and the course's default map. Fallow (`bunker`) is parked behind `?legacy=1` (?legacy=1&autostart=bunker&mode=course). The first map
 * supporting a mode is its default. Parked maps: `parked.ts` (not imported). The retired maps (Exchange, Trunk Annex,
 * Dead Line v1 / v2) were deleted in the consolidation (`docs/consolidation/deleted-maps.md`).
 */
export const MAPS: MapDef[] = [warehouse, provingGrounds, kestrel, seclab, ctcourse, courselab, ...(flags.legacy ? [bunker] : [])];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? provingGrounds;
}
