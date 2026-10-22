import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import type { MapLayout } from '../mapDef';
import { makeCone } from '../lights';
import { addLampRooms, EXIT_GREEN, passLamps, type LampRoom } from './lampRooms';

/**
 * Sector Ops section 2 of the Warehouse (warehouse-s23, SPEC 2.2, BUILD-S2.md): the storage hall, a greybox. Frame: x west
 * to east, z south to north, y up, metres. The hall is x -24 (perimeter inner face) to x -4 (wall centre line), z -6 (the
 * wall section 1 builds) to z 18. `warehouse.ts` builds the perimeter, floor and section 3 (`storageHall: false` skips
 * its own racking and x -4 wall); this file builds the rest.
 */

const WALL = '#b7b2a6';
const WALL_DARK = '#7d786d';
const STEEL = '#55606a';
const CRATE = '#a8784a';
const HAZARD = '#e8b923';
const DESK = '#8a6a4c';
const SHRINK = '#c4c0b0';
const PIPE = '#6d7378';
/** The art program dresses this colour as racking bays (`warehouseArt.ts`). */
const RACK = '#3f6f9a';
const BEAM = '#e07b22';
const T = 0.3;
const PI = Math.PI;

/** Section 2's rooms (HUD tags; squads come from the mode). Plan boxes, ground floor. */
export const S2_ROOMS: RoomDef[] = [
  { id: 'storage', name: 'Storage Hall', minX: -24, maxX: -4, minZ: -6, maxZ: 18 },
  { id: 'hvCage', name: 'High-value Cage', minX: -24, maxX: -19.9, minZ: 12, maxZ: 18 },
].map((r) => ({ ...r, squad: [] }));

/** Light switches (circuits 40 and 41: the marshalling lane, the issue desk). */
export const S2_SWITCHES: NonNullable<MapLayout['switches']> = [
  { pos: new Vector3(-13.2, 0, -5.85), yaw: 0, group: 40 },
  { pos: new Vector3(-15.9, 0, 17.85), yaw: PI, group: 41 },
];

export const S2_PICKUPS: NonNullable<MapLayout['pickups']> = [{ pos: new Vector3(-4.7, 0, 9.0), kind: 'ammo' }];

/** Nav seeds: the cage floor and the rack tops (y 4.0), so the grid floods each layer. */
export const S2_NAV_SEEDS: Vector3[] = [
  new Vector3(-21.4, 0, 14.0),
  new Vector3(-23.45, 4, 0.5),
  new Vector3(-23.45, 4, 9.5),
  new Vector3(-18.75, 4, 0.5),
  new Vector3(-18.75, 4, 11),
  new Vector3(-14.65, 4, 0.5),
  new Vector3(-14.65, 4, 11),
  new Vector3(-9.35, 4, 0.5),
  new Vector3(-9.35, 4, 11),
];

/** The lane row's narrow beam (30 degrees): the lane, not the pockets at its east end. */
const LANE = makeCone(0, -1, 0, Math.PI / 6);
/** The south aisles' beam (50 degrees): the aisle floors and the cross aisle, not the rack tops beside them. */
const SOUTH = makeCone(0, -1, 0, 0.87);
// <lamps:S2>
/**
 * Section 2's lamps by room (sector-fixes L, Michael 2026-10-22: one height and a regular layout per room, LED fittings;
 * the levels of warehouse-s23 M1 kept: `tests/warehouseS2Light.test.ts`). The hall: LED strips at 5.8 under the solid
 * roof strips (z -6 to -1.2, 0 to 4.8, 6 to 10.8, 12 to 16.8; the gaps are sheets) over the aisles: the lane row with a
 * narrow beam (the lane, not the pockets at its east end), the south aisles' row with a 50 degree beam (the floors, not
 * the dark south rack tops), the north half as two staggered grids without a beam (the floors and the rack tops of the
 * high route), two strips over the cage; the exit signs: small LED bulkheads at 2.4 on the walls. Radius and intensity
 * per fitting tuned against the light test's bands; dead fittings (intensity 0) keep the grids regular.
 * [x, z, radius, intensity].
 */
export const S2_LAMPS: readonly LampRoom[] = [
  // the aisle strips (A1 -21.4, A2 -16.7 (-16.2 in the north), A3 -12.0, the east gangway -7.2): the lane and south racks (circuit 40), north (41)
  { id: 'lane', model: 'strip', y: 5.8, group: 40, yaw: 0, cone: LANE, pass: true, lamps: [[-21.5, -4.6, 8.1, 0.679], [-17, -4.6, 5.89, 0.87], [-12.5, -4.6, 6.04, 0.862]] },
  { id: 'southAisles', model: 'strip', y: 5.8, group: 40, yaw: 0, cone: SOUTH, pass: true, lamps: [[-21.4, 1.9, 6.61, 0.603], [-16.7, 1.9, 9, 0.494], [-12, 1.9, 5.56, 0.951], [-7.2, 1.9, 6.41, 0.121]] },
  { id: 'northA', model: 'strip', y: 5.8, group: 41, yaw: 0, pass: true, lamps: [[-21.4, 6.9, 6.4, 0.966], [-12, 6.9, 9, 0.709], [-21.4, 13.5, 7.64, 0.572], [-12, 13.5, 5.78, 0.582]] },
  { id: 'northB', model: 'strip', y: 5.8, group: 41, yaw: 0, pass: true, lamps: [[-16.2, 9.6, 7.91, 0.558], [-7.2, 9.6, 9, 0.685], [-16.2, 12.9, 6.5, 0], [-7.2, 12.9, 6.5, 0], [-16.2, 16.2, 9, 0.627], [-7.2, 16.2, 9, 0.488]] },
  // the high-value cage (x -24 to -19.9, z 12 to 18, open under the roof): two strips down its middle
  { id: 'cage', model: 'strip', y: 5.8, group: 41, yaw: 0, pass: true, lamps: [[-22.2, 13.4, 5.2, 0.653], [-22.2, 16.2, 5.3, 0.452]] },
  // the exit signs: the west fire exit, the C3 door, the charger indicator (a small glow: it must not light the charge hand's pocket)
  { id: 'storage', model: 'bulkhead', y: 2.4, group: 42, yaw: PI / 2, colour: EXIT_GREEN, pass: true, lamps: [[-23.7, 5.5, 0.6, 0.15], [-4.45, 14.55, 0.6, 0.15], [-4.45, -5.2, 0.6, 0.15]] },
];

/** The section's lamp pass (the light test switches these off to compare): every lit lamp of section 2. */
export const S2_LIGHT_PASS = passLamps(S2_LAMPS);
// </lamps:S2>

/** A lintel (a head over a gap): an overhead box, so the floor under it stays open to the nav grid. */
function lintel(b: LevelBuilder, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color = WALL): void {
  b.box(cx, cy, cz, sx, sy, sz, color);
  b.boxes[b.boxes.length - 1]!.overhead = true;
}

/** A rack block (solid, top 4.0) with its two visual beams and its metal surface. */
function rack(b: LevelBuilder, cx: number, cz: number, w: number, d: number): void {
  b.block(cx, cz, w, 4.0, d, RACK);
  for (const y of [1.35, 2.7]) b.box(cx, y, cz, w + 0.08, 0.1, d + 0.04, BEAM, 0, 0, false);
  b.surface('metal', cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, 4.0);
}

/** Everything of section 2 (BUILD-S2.md 2 and 3): the walls and parapets, the racks, the cage, the ladders and pipes, the cover and the lights. Called by `opsPieces` after section 1. */
export function buildStorageS2(b: LevelBuilder): void {
  // ---- walls: the x -4 compartment wall (6.0, also section 3's west wall) with the C3 doorway head
  b.wallZ(-4, -6, 18, [[14, 15.1]], 6.0, WALL, T);
  lintel(b, -4, 4.05, 14.55, T, 3.9, 1.1);

  // ---- parapets (y 6.0 - 7.5, a seal: no lip is generated on the wall tops)
  const p0 = b.boxes.length;
  b.box(-4, 6.75, 6.0, T, 1.5, 24.0, WALL_DARK);
  b.box(-24.5, 6.75, 5.925, 1.0, 1.5, 24.15, WALL_DARK);
  b.box(-14.5, 6.75, 18.5, 21.0, 1.5, 1.0, WALL_DARK);
  b.mark(p0, { noLedge: true });

  // two visual rafters on the frame lines; the west fire exit (visual only)
  // (sector-fixes L: dressing, out of the light shapes, so they do not cut the hall strips' light off the rack tops)
  for (const x of [-16, -8]) {
    b.box(x, 5.75, 6.0, 0.3, 0.5, 24.0, STEEL, 0, 0, false);
    b.boxes[b.boxes.length - 1]!.detail = true;
  }
  b.box(-23.97, 1.05, 5.5, 0.06, 2.1, 1.2, STEEL, 0, 0, false);
  b.box(-23.92, 1.0, 5.5, 0.04, 0.06, 1.0, HAZARD, 0, 0, false);

  // ---- racks (single 1.1, back-to-back 2.3, 2.7 m bays; greybox height 4.0)
  rack(b, -23.45, 0.5, 1.1, 7.0); // W0S
  rack(b, -23.45, 9.5, 1.1, 5.0); // W0N (cut by the cage)
  rack(b, -18.75, 0.5, 2.3, 7.0); // R1S
  rack(b, -18.75, 11.0, 2.3, 8.0); // R1N
  rack(b, -14.65, 0.5, 2.3, 7.0); // R2S
  rack(b, -14.65, 11.0, 2.3, 8.0); // R2N
  rack(b, -9.35, 0.5, 2.3, 7.0); // R3S
  rack(b, -9.35, 11.0, 2.3, 8.0); // R3N

  // ---- the high-value cage (x -24 to -19.9, z 12 to 18; mesh 2.4 high, open top)
  b.fence(-22.9, 12, -21.9, 12, 2.4);
  b.fence(-20.9, 12, -19.9, 12, 2.4);
  b.door(-21.9, 0, 12, 1.0, PI / 2, { swing: -1, locked: true, breachable: true });
  b.fence(-19.9, 15.0, -19.9, 15.9, 2.4);
  b.fence(-19.9, 17.1, -19.9, 18.0, 2.4);
  b.door(-19.9, 0, 15.9, 1.2, 0, { swing: -1 });
  b.block(-23.6, 15.4, 0.8, 2.0, 4.4, STEEL); // shelving along the west wall
  b.ladder(-23.45, 12.25, 0, 4.0, PI, STEEL); // the stock ladder onto W0N

  // ---- ladders (fixed "rolling" ladders), sprinkler mains
  b.ladder(-14.65, 6.75, 0, 4.0, 0, STEEL);
  b.ladder(-7.95, -2.6, 0, 4.0, -PI / 2, STEEL);
  b.ladder(-17.35, 13.4, 0, 4.0, -PI / 2, STEEL);
  b.pipeV(-23.85, 6.4, 0, 5.0, -PI / 2, PIPE);
  b.pipeH(-23.85, 6.4, -6.0, 6.4, 5.0, PIPE);
  b.pipeH(-6.0, 6.4, -6.0, 15.4, 5.0, PIPE);
  for (const x of [-20, -16, -12, -8]) b.box(x, 5.45, 6.4, 0.05, 0.9, 0.05, PIPE, 0, 0, false);
  for (const z of [10, 14]) b.box(-6.0, 5.45, z, 0.05, 0.9, 0.05, PIPE, 0, 0, false);

  // ---- contents and cover
  b.block(-19.7, -3.9, 3.4, 1.8, 1.2, SHRINK); // staged delivery, west
  b.block(-9.7, -3.9, 2.6, 1.8, 1.2, SHRINK); // staged delivery, east
  b.block(-4.5, -5.2, 0.5, 1.6, 1.0, STEEL); // charger
  b.block(-6.0, -2.8, 1.6, 2.0, 1.2, CRATE); // empty-pallet stack
  b.block(-17.0, 17.6, 1.6, 0.9, 0.8, DESK); // issue desk
  b.block(-6.0, 17.35, 1.2, 0.15, 1.2, STEEL); // wrapper turntable
  b.block(-6.0, 17.85, 0.3, 2.4, 0.2, STEEL); // wrapper mast
  b.block(-9.0, 16.6, 1.2, 1.8, 1.2, SHRINK); // wrapped stack

  // ---- lights (sector-fixes L: by room, `S2_LAMPS`)
  addLampRooms(b, S2_LAMPS);
}
