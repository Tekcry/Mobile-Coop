import type { MapDef } from '../mapDef';
import { deadLine } from './deadLine';
import { deadLineV2 } from './deadLineV2';
import { exchange } from './exchange';
import { provingGrounds } from './provingGrounds';
import { seclab } from './seclab';
import { trunkAnnex } from './trunkAnnex';
import { warehouse } from './warehouse';

/**
 * The listed maps (3.0): Warehouse runs every mode; Proving Grounds is the basic test range (Free Roam,
 * Training); the Kestrel Exchange and the Trunk Annex are the First Playable greyboxes (Sandbox, Infiltration); Dead Line is the Mission 1 campus greybox (G1, Sandbox); Dead Line v2 is the Area 1 greybox (G1 of the v2 design); Seclab is the Kestrel security debug room (not listed, boot with ?autostart=seclab). The first map
 * supporting a mode is its default. Parked maps: `parked.ts` (not imported).
 */
export const MAPS: MapDef[] = [warehouse, provingGrounds, exchange, trunkAnnex, deadLine, deadLineV2, seclab];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? provingGrounds;
}
