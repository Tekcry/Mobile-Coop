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

const AISLE = makeCone(0, -1, 0, Math.PI / 4);
// <lamps:S2>
/**
 * Section 2's lamps by room (sector-fixes L, Michael 2026-10-22: one height and a regular layout per room, LED fittings;
 * the levels of warehouse-s23 M1 kept: `tests/warehouseS2Light.test.ts`). The hall: rows of LED strips 0.22 under the
 * roof (5.8) across the hall on the roof strips (z -3.6, 2.4, 8.4, 14.4), one over every aisle and every rack line; the
 * aisle strips have a narrow aisle optic (the floor, not the rack tops beside them), the rack strips light the rack tops
 * of the high route. Dead fittings (intensity 0) over the dark rack tops and pockets. The exit signs: LED bulkheads at
 * 2.4 on the walls. [x, z, radius, intensity].
 */
export const S2_LAMPS: readonly LampRoom[] = [
  // the aisle strips (A1 -21.4, A2 -16.7, A3 -12.0, the east gangway -7.2): the lane and south racks (circuit 40), north (41)
  { id: 'hallAisle', model: 'strip', y: 5.8, group: 40, yaw: PI / 2, cone: AISLE, pass: true, lamps: [[-21.4, -3.6, 7, 0.6], [-16.7, -3.6, 7, 0.6], [-12, -3.6, 7, 0.6], [-7.2, -3.6, 7, 0.6], [-21.4, 2.4, 7, 0.6], [-16.7, 2.4, 7, 0.6], [-12, 2.4, 7, 0.6], [-7.2, 2.4, 7, 0.6]] },
  { id: 'hallAisle', model: 'strip', y: 5.8, group: 41, yaw: PI / 2, cone: AISLE, pass: true, lamps: [[-21.4, 8.4, 7, 0.6], [-16.7, 8.4, 7, 0.6], [-12, 8.4, 7, 0.6], [-7.2, 8.4, 7, 0.6], [-21.4, 14.4, 7, 0.6], [-16.7, 14.4, 7, 0.6], [-12, 14.4, 7, 0.6], [-7.2, 14.4, 7, 0.6]] },
  // the rack strips (W0 -23.45, R1 -18.75, R2 -14.65, R3 -9.35): only the north rack tops of the high route are lit
  { id: 'hallRack', model: 'strip', y: 5.8, group: 40, yaw: PI / 2, pass: true, lamps: [[-23.45, -3.6, 3, 0], [-18.75, -3.6, 3, 0], [-14.65, -3.6, 3, 0], [-9.35, -3.6, 3, 0], [-23.45, 2.4, 3, 0], [-18.75, 2.4, 3, 0], [-14.65, 2.4, 3, 0], [-9.35, 2.4, 3, 0]] },
  { id: 'hallRack', model: 'strip', y: 5.8, group: 41, yaw: PI / 2, pass: true, lamps: [[-23.45, 8.4, 3.5, 0.5], [-18.75, 8.4, 3.5, 0.5], [-14.65, 8.4, 3.5, 0.5], [-9.35, 8.4, 3, 0], [-23.45, 14.4, 3.5, 0.5], [-18.75, 14.4, 3.5, 0.5], [-14.65, 14.4, 3.5, 0.5], [-9.35, 14.4, 3, 0]] },
  // the exit signs: the west fire exit, the C3 door, the charger indicator (a small glow: it must not light the charge hand's pocket)
  { id: 'storage', model: 'bulkhead', y: 2.4, group: 42, yaw: PI / 2, colour: EXIT_GREEN, pass: true, lamps: [[-23.91, 5.5, 3, 0.43], [-4.24, 14.55, 3, 0.25], [-4.24, -5.2, 0.65, 0.155]] },
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
  for (const x of [-16, -8]) b.box(x, 5.75, 6.0, 0.3, 0.5, 24.0, STEEL, 0, 0, false);
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
