import type { MapDef } from '../mapDef';
import { provingGrounds } from './provingGrounds';
import { dustDepot } from './dustDepot';

export const MAPS: MapDef[] = [dustDepot, provingGrounds];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? provingGrounds;
}
