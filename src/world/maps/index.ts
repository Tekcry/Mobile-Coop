import type { MapDef } from '../mapDef';
import { provingGrounds } from './provingGrounds';
import { dustDepot } from './dustDepot';
import { warehouse } from './warehouse';
import { embassy } from './embassy';
import { mansion } from './mansion';
import { port } from './port';
import { refinery } from './refinery';

/** First map supporting a mode is its default (Warehouse for Hunter / Clear, Mission and Wave; Embassy for
 *  Infiltration). */
export const MAPS: MapDef[] = [warehouse, embassy, mansion, port, refinery, dustDepot, provingGrounds];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? provingGrounds;
}
