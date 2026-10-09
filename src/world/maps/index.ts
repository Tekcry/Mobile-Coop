import type { MapDef } from '../mapDef';
import { exchange } from './exchange';
import { provingGrounds } from './provingGrounds';
import { trunkAnnex } from './trunkAnnex';
import { warehouse } from './warehouse';

/**
 * The listed maps (3.0): Warehouse runs every mode; Proving Grounds is the basic test range (Free Roam,
 * Training); the Kestrel Exchange and the Trunk Annex are the First Playable greyboxes (Sandbox, Infiltration). The first map
 * supporting a mode is its default. Parked maps: `parked.ts` (not imported).
 */
export const MAPS: MapDef[] = [warehouse, provingGrounds, exchange, trunkAnnex];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? provingGrounds;
}
