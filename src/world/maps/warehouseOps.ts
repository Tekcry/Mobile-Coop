import type { MapDef } from '../mapDef';
import { warehouse } from './warehouse';
import { WAREHOUSE_OPS_LAMPS, WAREHOUSE_OPS_LASERS, WAREHOUSE_OPS_SECURITY, WAREHOUSE_SECTORS } from './warehouseSectors';

/**
 * Sector Ops on the Warehouse (feature/sector-ops PLAN A1): the Warehouse's geometry as it is, plus the sectors'
 * cameras, laser bands and sector 4's extra lamps. A copy, so the Warehouse's other modes keep their own layout.
 */
export const warehouseOps: MapDef = {
  ...warehouse,
  id: 'warehouseOps',
  name: 'Warehouse - Sector Ops',
  description: 'Four sectors in a row: dock, racking, factory floor, offices. Each one harder than the last.',
  modes: ['sector'],
  sectors: WAREHOUSE_SECTORS,
  build(b, seed) {
    const lay = warehouse.build(b, seed);
    for (const [x, z] of WAREHOUSE_OPS_LAMPS) {
      b.light({ kind: 'lamp', x, y: 5.05, z, radius: 8, intensity: 1.0, color: [1, 0.92, 0.75], group: 21, fixture: { sx: 0.25, sy: 0.08, sz: 2.6, oy: 0.15 } });
    }
    // the sectors' guards come from the mode, not the rooms (rooms stay for the HUD tag)
    const rooms = (lay.rooms ?? []).map((r) => ({ ...r, squad: [] }));
    return { ...lay, rooms, security: WAREHOUSE_OPS_SECURITY, lasers: WAREHOUSE_OPS_LASERS };
  },
};
