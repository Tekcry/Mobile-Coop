import type { MapDef } from '../mapDef';
import { provingGrounds } from './provingGrounds';

export const MAPS: MapDef[] = [provingGrounds];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? provingGrounds;
}
