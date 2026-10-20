import { Vector3 } from '../../core/babylon';
import type { MapDef } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import { buildWarehouse, warehouse } from './warehouse';
import { buildServiceS1, S1_HIDESPOTS, S1_NAV_SEEDS, S1_PICKUPS, S1_ROOMS, S1_SPAWNS, S1_SWITCHES } from './warehouseS1';
import { WAREHOUSE_OPS_ALARMS, WAREHOUSE_OPS_LAMPS, WAREHOUSE_OPS_LASERS, WAREHOUSE_OPS_SECURITY, WAREHOUSE_SECTORS } from './warehouseSectors';

const H = 3.2;
const T = 0.3;
const WALL = '#b7b2a6';
const CRATE = '#a8784a';
const SHRINK = '#c4c0b0';
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

/** Sector Ops' own pieces (placeholder boxes): section 1 (`warehouseS1.ts`), the C3 office door and sections 2 and 3's M8 routes and cover. */
function opsPieces(b: LevelBuilder): void {
  // ---- section 1 (the south band, C2 the fire lobby included)
  buildServiceS1(b);

  // ---- C3: the office. The near door in the x -4 wall swings out into the racking; the desk moves off its line.
  b.door(-4, 0, 14, 1.1, 0, { swing: -1, locked: true, breachable: false });
  b.block(-2.2, 17.4, 1.6, 0.95, 0.7, DESK);

  // ---- section 2 (M8): a high route over the racks. A ladder onto the west rack's south end and one off the east
  // rack's north end; planks bridge the rack tops across the aisles at z 11 (west rack to east rack). Loads parked in
  // the cross aisle close it at two aisles (dead-end pockets north and south of them), and stacks in the west and
  // east aisles break their long sight lines.
  b.ladder(-20.5, -4.25, 0, 2.8, 0, STEEL);
  b.ladder(-8.5, 16.65, 0, 2.8, Math.PI, STEEL);
  const plank0 = b.boxes.length;
  for (const x of [-18.5, -14.5, -10.5]) b.box(x, 2.75, 11, 3.2, 0.1, 0.9, STEEL);
  b.mark(plank0, { overhead: true });
  b.block(-18.5, 5.2, 3, 2.4, 2, SHRINK).block(-10.5, 5.2, 3, 2.4, 2, SHRINK);
  b.block(-23.5, 5.2, 1.0, 2.4, 1.6, SHRINK);
  b.block(-6.6, 9.6, 2.0, 2.4, 1.2, SHRINK);
  // chicanes (two offset loads, walk the S between them) in the west aisle and the centre aisle's north half
  b.block(-23.1, -0.2, 1.8, 2.4, 0.9, SHRINK).block(-21.9, 1.6, 1.8, 2.4, 0.9, SHRINK);
  b.block(-15.1, 11.6, 1.8, 2.4, 0.9, SHRINK).block(-13.9, 13.6, 1.8, 2.4, 0.9, SHRINK);

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
 * for its connector room. 1 the service entrance (yard, goods-in bay, trade offices, workshop; `warehouseS1.ts`), 2 the racking aisles,
 * 3 the factory floor with the mezzanine deck and the manager's office. The Warehouse's geometry with the openings
 * between sections walled (the x -4 gaps dock-floor and racking-floor, the z -8.8 corridor-floor gap and door, the
 * z -6 dock-racking openings and hatch), the connector rooms, and the M8 routes and cover (`opsPieces`). Section 1's south
 * band is built by `warehouseS1.ts` (the Warehouse's own band is skipped: `southBand: false`).
 */
export const warehouseOps: MapDef = {
  ...warehouse,
  id: 'warehouseOps',
  name: 'Warehouse - Sector Ops',
  description: 'Three sections in a row: the service entrance, the racking aisles, the factory floor and mezzanine.',
  modes: ['sector'],
  sectors: WAREHOUSE_SECTORS,
  build(b) {
    const lay = buildWarehouse(b, {
      southBand: false,
      gapsX4: [[14, 15.1]],
      gapsZ12: [[-1.5, -0.4], [4.6, 5.7]],
      officeSwing: 1,
      officeDesk: false,
      extra: opsPieces,
    });
    for (const [x, z] of WAREHOUSE_OPS_LAMPS) {
      b.light({ kind: 'lamp', x, y: 5.05, z, radius: 8, intensity: 1.0, color: [1, 0.92, 0.75], group: 21, fixture: { sx: 0.25, sy: 0.08, sz: 2.6, oy: 0.15 } });
    }
    // the sections' guards come from the mode, not the rooms (rooms stay for the HUD tag)
    // (the south band's base rooms are dropped for section 1's own)
    const gone = new Set(['dock', 'dispatch', 'workshop', 'corridor']);
    const rooms = [...(lay.rooms ?? []).filter((r) => !gone.has(r.id)).map((r) => ({ ...r, squad: [] })), ...S1_ROOMS];
    // a base item belongs to sections 2 and 3 (z -6 and up, or the floor east of the x -4 wall from z -8.8)
    const north = (x: number, z: number): boolean => z >= -6 || (x > -4 && z >= -8.8);
    // nav seeds: one per section and connector, and the deck, so the grid floods all of them (and section 1's levels)
    const navSeeds = [
      new Vector3(-14.5, 0, -7.5),
      new Vector3(-14.5, 0, 5.2),
      new Vector3(-1.2, 0, 14.8),
      new Vector3(10, 0, 0),
      new Vector3(15, 2.6, 15),
      new Vector3(5, 0, 14),
      ...S1_NAV_SEEDS,
    ];
    // alarm panels tagged by section (only the live section's work)
    const alarms = WAREHOUSE_OPS_ALARMS.map((a) => ({ pos: new Vector3(a.at[0], 0, a.at[1]), yaw: a.yaw, section: a.section }));
    return {
      ...lay,
      playerSpawns: S1_SPAWNS,
      enemySpawns: lay.enemySpawns.filter((v) => v.z >= -6),
      props: lay.props.filter((p) => north(p.pos.x, p.pos.z)),
      objectives: lay.objectives.filter((o) => o.id !== 'termB' && o.id !== 'extract'),
      pickups: [...(lay.pickups ?? []).filter((p) => north(p.pos.x, p.pos.z)), ...S1_PICKUPS],
      hideSpots: [...(lay.hideSpots ?? []).filter((h) => north(h.pos.x, h.pos.z)), ...S1_HIDESPOTS],
      switches: [...(lay.switches ?? []).filter((w) => north(w.pos.x, w.pos.z)), ...S1_SWITCHES],
      rooms,
      navSeeds,
      alarms,
      security: WAREHOUSE_OPS_SECURITY,
      lasers: WAREHOUSE_OPS_LASERS,
    };
  },
};
