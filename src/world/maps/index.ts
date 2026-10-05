import type { MapDef } from '../mapDef';
import { provingGrounds } from './provingGrounds';
import { dustDepot } from './dustDepot';
import { warehouse } from './warehouse';

/** First map supporting a mode is its default (Warehouse for Clear, Mission and Wave). */
export const MAPS: MapDef[] = [warehouse, dustDepot, provingGrounds];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? provingGrounds;
}
