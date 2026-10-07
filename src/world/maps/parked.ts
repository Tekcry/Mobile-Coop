import type { MapDef } from '../mapDef';
import { dustDepot } from './dustDepot';
import { embassy } from './embassy';
import { mansion } from './mansion';
import { port } from './port';
import { refinery } from './refinery';

/**
 * Parked maps (3.0): kept as they were in 2.3.0 so they can be reinstated later. Nothing imports this module
 * (not in the bundle, not reachable by URL); it only keeps them type-checked. No work happens on them.
 */
export const PARKED_MAPS: MapDef[] = [embassy, mansion, port, refinery, dustDepot];
