import { Vector3 } from '../../core/babylon';
import type { MapDef } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import { buildWarehouse, warehouse } from './warehouse';
import { buildServiceS1, S1_HIDESPOTS, S1_NAV_SEEDS, S1_PICKUPS, S1_ROOMS, S1_SPAWNS, S1_SWITCHES } from './warehouseS1';
import { buildStorageS2, S2_NAV_SEEDS, S2_PICKUPS, S2_ROOMS, S2_SWITCHES } from './warehouseS2';
import { WAREHOUSE_OPS_ALARMS, WAREHOUSE_OPS_LAMPS, WAREHOUSE_OPS_LASERS, WAREHOUSE_OPS_SECURITY, WAREHOUSE_SECTORS } from './warehouseSectors';

const H = 3.2;
const T = 0.3;
const WALL = '#b7b2a6';
const CRATE = '#a8784a';
const STEEL = '#55606a';
const DESK = '#8a6a4c';

/**
 * The connector rooms (A12): C2, the fire lobby in the lobby block against the z -6 compartment wall (near door south
 * into the goods-in bay, far door north into the racking's south aisle); C3, the ground-floor office (near door in the x -4 wall from the racking,
 * far door the office door onto the factory floor). Exported for the mode and the tests: the doors are found by these
 * centres (`Doors.nearest`), never by id.
 */
export const OPS_DOORS = {
  /** C2 near (bay side) and far (racking side) doorway centres [x, z]. */
  c2Near: [-14.5, -8.8] as [number, number],
  c2Far: [-14.5, -6] as [number, number],
  /** C3 near (racking side, x -4) and far (the office door onto the floor). */
  c3Near: [-4, 14.55] as [number, number],
  c3Far: [-0.95, 12] as [number, number],
  /** The office -> manager's office door: locked until C3 seals (a side room of section 3). */
  manager: [2, 16.05] as [number, number],
} as const;

/** Sector Ops' own pieces (placeholder boxes): section 1 (`warehouseS1.ts`), section 2 (`warehouseS2.ts`), the C3 office door and section 3's M8 routes and cover. */
function opsPieces(b: LevelBuilder): void {
  // ---- section 1 (the south band, C2 the fire lobby included)
  buildServiceS1(b);

  // ---- section 2 (the storage hall: walls, racks, the cage, ladders, pipes, cover and lights)
  buildStorageS2(b);

  // ---- C3: the office. The near door in the x -4 wall swings out into the racking; the desk moves off its line.
  b.door(-4, 0, 14, 1.1, 0, { swing: -1, locked: true, breachable: false });
  b.block(-2.2, 17.4, 1.6, 0.95, 0.7, DESK);

  // ---- section 3 (M8): a doorway from the manager's office onto the floor (a side way out of the offices), crates
  // under the zipline's railing gap (a climb onto the deck), shelving rows on the floor (bays), crates on the deck.
  b.door(4.6, 0, 12, 1.1, Math.PI / 2, { swing: -1 });
  b.block(12, 11.2, 1.2, 1.4, 1.2, CRATE);
  // the stores cage (SW) and the plant room (SE, the freight lift: the extraction) are rooms off the floor; a wall
  // splits the floor's middle west / east
  b.wallZ(4.1, -8.8, -2.5, [[-6.1, -5.0]], H, WALL, T);
  b.wallX(-2.5, -4, 4.1, [[-3.2, -2.1]], H, WALL, T);
  b.wallZ(16, -8.8, -2, [[-8.5, -7.4]], H, WALL, T);
  b.wallX(-2, 16, 24, [], H, WALL, T);
  b.wallZ(10, -2, 7, [[1.6, 2.7]], H, WALL, T);
  b.wallX(3, -4, 1.5, [], H, WALL, T);
  b.block(9.5, 8.8, 0.8, 2.6, 3.6, STEEL);
  b.block(19, 3.8, 3.6, 2.6, 0.8, STEEL);
  b.block(13.2, 16.4, 0.8, 2.0, 3.2, CRATE, 2.6).block(13.2, 12.9, 0.8, 2.0, 1.2, CRATE, 2.6);
  b.block(20.2, 15.6, 0.8, 2.0, 2.6, CRATE, 2.6);
}

/**
 * Sector Ops on the Warehouse (feature/sector-ops A12, M7, M8): three sections in a row, each sealed from the next but
 * for its connector room. 1 the service entrance (yard, goods-in bay, trade offices, workshop; `warehouseS1.ts`), 2 the storage hall (`warehouseS2.ts`),
 * 3 the factory floor with the mezzanine deck and the manager's office. The Warehouse's geometry with the openings
 * between sections walled (the x -4 gaps dock-floor and racking-floor, the z -8.8 corridor-floor gap and door, the
 * z -6 dock-racking openings and hatch), the connector rooms, and the M8 routes and cover (`opsPieces`). Section 1's south
 * band is built by `warehouseS1.ts` (the Warehouse's own band is skipped: `southBand: false`).
 */
export const warehouseOps: MapDef = {
  ...warehouse,
  id: 'warehouseOps',
  name: 'Warehouse - Sector Ops',
  description: 'Three sections in a row: the service entrance, the storage hall, the factory floor and mezzanine.',
  modes: ['sector'],
  sectors: WAREHOUSE_SECTORS,
  build(b) {
    const lay = buildWarehouse(b, {
      southBand: false,
      gapsX4: [[14, 15.1]],
      gapsZ12: [[-1.5, -0.4], [4.6, 5.7]],
      officeSwing: 1,
      officeDesk: false,
      storageHall: false,
      extra: opsPieces,
    });
    for (const [x, z] of WAREHOUSE_OPS_LAMPS) {
      b.light({ kind: 'lamp', x, y: 5.05, z, radius: 8, intensity: 1.0, color: [1, 0.92, 0.75], group: 21, fixture: { sx: 0.25, sy: 0.08, sz: 2.6, oy: 0.15 } });
    }
    // the sections' guards come from the mode, not the rooms (rooms stay for the HUD tag)
    // (the south band's base rooms are dropped for section 1's own)
    const gone = new Set(['dock', 'dispatch', 'workshop', 'corridor', 'racking']);
    const rooms = [...(lay.rooms ?? []).filter((r) => !gone.has(r.id)).map((r) => ({ ...r, squad: [] })), ...S1_ROOMS, ...S2_ROOMS];
    // a base item belongs to section 3 only (the floor east of the x -4 wall from z -8.8); sections 1 and 2 bring their own
    const s3 = (x: number, z: number): boolean => x > -4 && z >= -8.8;
    // nav seeds: one per section and connector, and the deck, so the grid floods all of them (and section 1's levels)
    const navSeeds = [
      new Vector3(-14.5, 0, -7.5),
      new Vector3(-14.5, 0, 5.2),
      new Vector3(-1.2, 0, 14.8),
      new Vector3(10, 0, 0),
      new Vector3(15, 2.6, 15),
      new Vector3(5, 0, 14),
      ...S1_NAV_SEEDS,
      ...S2_NAV_SEEDS,
    ];
    // alarm panels tagged by section (only the live section's work)
    const alarms = WAREHOUSE_OPS_ALARMS.map((a) => ({ pos: new Vector3(a.at[0], 0, a.at[1]), yaw: a.yaw, section: a.section }));
    return {
      ...lay,
      playerSpawns: S1_SPAWNS,
      enemySpawns: lay.enemySpawns.filter((v) => s3(v.x, v.z)),
      props: lay.props.filter((p) => s3(p.pos.x, p.pos.z)),
      objectives: lay.objectives.filter((o) => o.id !== 'termB' && o.id !== 'extract'),
      pickups: [...(lay.pickups ?? []).filter((p) => s3(p.pos.x, p.pos.z)), ...S1_PICKUPS, ...S2_PICKUPS],
      hideSpots: [...(lay.hideSpots ?? []).filter((h) => s3(h.pos.x, h.pos.z)), ...S1_HIDESPOTS],
      switches: [...(lay.switches ?? []).filter((w) => s3(w.pos.x, w.pos.z)), ...S1_SWITCHES, ...S2_SWITCHES],
      rooms,
      navSeeds,
      alarms,
      security: WAREHOUSE_OPS_SECURITY,
      lasers: WAREHOUSE_OPS_LASERS,
    };
  },
};
