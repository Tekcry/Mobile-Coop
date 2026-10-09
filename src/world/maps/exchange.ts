import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';

/**
 * The Kestrel Exchange (First Playable S1a, S1b): the cable tunnel, cable chamber, ground floor, first floor, roof and
 * rear goods yard as walkable blocks, to the plans in `docs/prompts/exchange-plans` (ground.svg, first.svg, roof.svg:
 * 10 px = 1 m, x = (px - 366) / 10, z = (282 - py) / 10) and `docs/prompts/exchange-design.md`. Greybox: boxes only, no art,
 * no lights, no guards (lights, guards and the objective are S1c).
 * Storeys: basement -3.3, ground 0, first floor 4.5, roof 9.0. Door centres sit on multiples of 0.5 and the world
 * bounds on a quarter-metre offset so every 1.0 m door lines up with a nav cell (cell 0.5, agent radius 0.32).
 */
export const EXCHANGE_Y = { basement: -3.3, ground: 0, first: 4.5, roof: 9.0 } as const;

const WALL = '#a9a496';
const WALL_DARK = '#7d786d';
const FLOOR = '#6f7477';
const STONE = '#8a8d8c';
const STEEL = '#55606a';
const FRAME = '#4d5560';
const STAIR = '#9a948a';
const CRATE = '#a8784a';
const DESK = '#8a6a4c';

const T = 0.3; // interior wall thickness
const TX = 0.45; // exterior wall thickness
const H1 = 4.5; // ground-floor wall height under the first floor
const HD = 8.7; // double-height rooms (MDF hall, power room)
const HX = 9.0; // exterior and court walls to the roof
const HF = 4.2; // first-floor wall height (4.5 storey, 0.3 slab above)
const HH = 5.7; // server hall wall height (raised roof)
const RAISED = 10.5; // top of the raised roof over the server hall
const DOOR_H = 2.1;
const DOOR_W = 1.0;
const BASE = EXCHANGE_Y.basement;

type GapKind = 'door' | 'locked' | 'open';
/** A gap in a wall line: where it starts, what fills it, how wide (sorted by start along the line). */
type Gap = readonly [at: number, kind?: GapKind, width?: number];

/** Wall along X at `z` from x0 to x1 with gaps, standing on `y0`; each gap gets a lintel above the door height and a door anchor. */
function lineX(b: LevelBuilder, z: number, x0: number, x1: number, h: number, gaps: readonly Gap[] = [], t = T, color = WALL, y0 = 0): void {
  let x = x0;
  for (const [a, , w = DOOR_W] of gaps) {
    if (a > x) b.wall(x, z, a, z, h, color, t, y0);
    x = a + w;
  }
  if (x1 > x) b.wall(x, z, x1, z, h, color, t, y0);
  for (const [a, kind = 'door', w = DOOR_W] of gaps) {
    if (h > DOOR_H) b.box(a + w / 2, y0 + (DOOR_H + h) / 2, z, w, h - DOOR_H, t, color);
    if (kind !== 'open') b.door(a, y0, z, w, Math.PI / 2, { locked: kind === 'locked' });
  }
}

/** Wall along Z at `x` from z0 to z1 with gaps (as `lineX`). */
function lineZ(b: LevelBuilder, x: number, z0: number, z1: number, h: number, gaps: readonly Gap[] = [], t = T, color = WALL, y0 = 0): void {
  let z = z0;
  for (const [a, , w = DOOR_W] of gaps) {
    if (a > z) b.wall(x, z, x, a, h, color, t, y0);
    z = a + w;
  }
  if (z1 > z) b.wall(x, z, x, z1, h, color, t, y0);
  for (const [a, kind = 'door', w = DOOR_W] of gaps) {
    if (h > DOOR_H) b.box(x, y0 + (DOOR_H + h) / 2, a + w / 2, t, h - DOOR_H, w, color);
    if (kind !== 'open') b.door(x, y0, a, w, 0, { locked: kind === 'locked' });
  }
}

/** Floor slab over [x0, x1] x [z0, z1] with its top at `top`. */
function slab(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, thick: number, top = 0, color = FLOOR): void {
  b.floor((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, color, top, thick);
}

/** Solid block over [x0, x1] x [z0, z1] from y0 to y1. */
function solid(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string): void {
  b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
}

const ROOMS: RoomDef[] = [
  // the tunnel from the manhole and the chamber under the MDF hall (basement: feet at -3.3)
  { id: 'cable', name: 'Cable Tunnel and Chamber', minX: -31.75, maxX: -13.85, minZ: 0, maxZ: 12.15, minY: -3.6, maxY: -0.2 },
  { id: 'mdf', name: 'MDF Hall', minX: -24, maxX: -6, minZ: 0, maxZ: 18, minY: 0, maxY: HD },
  // the battery room (z -6..0) and the power room (z -18..-6) read as one space
  { id: 'power', name: 'Battery and Power Rooms', minX: -24, maxX: -6, minZ: -18, maxZ: 0, minY: 0, maxY: HD },
  { id: 'well', name: 'Light Well', minX: 6, maxX: 18, minZ: -6, maxZ: 6, minY: 0, maxY: 8.9 },
  // first floor (feet at 4.5), roof (9.0, raised roof 10.5) and the yard behind the building (the lane east of it is part of the yard)
  { id: 'switchroom', name: "Operators' Switchroom", minX: 0, maxX: 6, minZ: -6, maxZ: 6, minY: 4.3, maxY: 8.9 },
  { id: 'offices', name: 'Offices', minX: -6, maxX: 6, minZ: 6, maxZ: 18, minY: 4.3, maxY: 8.9 },
  { id: 'servers', name: 'Server Hall', minX: 9.6, maxX: 24, minZ: 6, maxZ: 18, minY: 4.3, maxY: 8.9 },
  { id: 'roof', name: 'Roof', minX: -24, maxX: 24, minZ: -18, maxZ: 18, minY: 8.9, maxY: 14 },
  { id: 'yard', name: 'Rear Goods Yard', minX: -24, maxX: 30, minZ: -36.3, maxZ: -18, minY: -0.5, maxY: 9.5 },
];

/** Cable tunnel (Mill Street manhole to the chamber) and the cable chamber under the MDF hall. */
function buildBasement(b: LevelBuilder): void {
  const Y0 = BASE;
  // floors (the chamber is 9.55 x 11.85, the tunnel 1.8 wide)
  slab(b, -23.7, -13.85, 0, 12.15, 0.3, Y0, FLOOR);
  slab(b, -31.75, -23.7, 7.6, 9.4, 0.3, Y0, FLOOR);
  // chamber walls (3.0 high, ceiling is the ground slab at -0.3), the tunnel mouth in the west wall
  b.wall(-23.7, 0, -23.7, 7.6, 3, WALL_DARK, T, Y0);
  b.wall(-23.7, 9.4, -23.7, 12.15, 3, WALL_DARK, T, Y0);
  b.wall(-23.7, 7.6, -23.7, 9.4, 0.8, WALL_DARK, T, -1.1);
  b.wall(-13.85, 0, -13.85, 12.15, 3, WALL_DARK, T, Y0);
  b.wall(-23.7, 0, -13.85, 0, 3, WALL_DARK, T, Y0);
  b.wall(-23.7, 12.15, -13.85, 12.15, 3, WALL_DARK, T, Y0);
  // tunnel walls (2.2 high) and the end wall under the manhole
  b.wall(-31.75, 7.45, -23.7, 7.45, 2.2, WALL_DARK, T, Y0);
  b.wall(-31.75, 9.55, -23.7, 9.55, 2.2, WALL_DARK, T, Y0);
  b.wall(-31.75, 7.6, -31.75, 9.4, 2.2, WALL_DARK, T, Y0);
  // cable drums in a row across the chamber (1.5 high: mantle over, or round the east end past the sump cover)
  for (const x of [-22.7, -21.1, -19.5, -17.9, -16.3]) solid(b, x - 0.8, x + 0.8, 6, 7.6, Y0, Y0 + 1.5, '#6b4a2f');
  b.surface('metal', -15.0, -14.2, 6.0, 7.6, Y0);

  // the basement stair (two flights of 10 x 0.165 / 0.28, 1.25 wide, half landing at -1.65) in the SW corner:
  // flight A rises from the chamber (north end, z 4.5) to the landing, flight B returns to the fire door at ground
  const s0 = b.boxes.length;
  b.stairs(-21.675, 3.1, 1.25, 2.8, 1.65, 10, STAIR, Math.PI, Y0);
  b.stairs(-22.925, 3.1, 1.25, 2.8, 1.65, 10, STAIR, 0, -1.65);
  solid(b, -23.55, -22.3, 1.7, 4.5, Y0, -1.65, STAIR);
  solid(b, -23.55, -21.05, 0.2, 1.7, Y0, -1.65, STAIR);
  // a divider between the flights, up to the rail height over flight B
  solid(b, -22.375, -22.225, 1.7, 4.5, Y0, 0.9, WALL_DARK);
  b.mark(s0, { noLedge: true });
  // the stair room: east wall from the chamber floor to the first floor, the fire door in the north wall
  b.wall(-20.9, 0.2, -20.9, 4.5, H1 - Y0, WALL, T, Y0);
}

/** The ground slab in tiles: thin over the chamber, thick over the tunnel, open at the manhole and the stair. */
function buildSlabs(b: LevelBuilder): void {
  slab(b, -34, -23.7, -20, 7.3, 1.0);
  slab(b, -34, -23.7, 9.7, 20, 1.0);
  // over the tunnel (2.2 high: ceiling at -1.1), the manhole shaft (1.2 x 1.2) open at its west end
  slab(b, -34, -31.6, 7.3, 9.7, 1.1);
  slab(b, -31.6, -30.4, 7.3, 7.9, 1.1);
  slab(b, -31.6, -30.4, 9.1, 9.7, 1.1);
  slab(b, -30.4, -23.7, 7.3, 9.7, 1.1);
  slab(b, -23.7, -13.85, -20, 0, 1.0);
  slab(b, -23.7, -13.85, 12.15, 20, 1.0);
  // over the chamber (3.0 high: ceiling at -0.3), open over the stair room
  slab(b, -20.9, -13.85, 0, 12.15, 0.3);
  slab(b, -23.7, -20.9, 4.5, 12.15, 0.3);
  slab(b, -13.85, 26, -20, 20, 1.0);
  // the rear goods yard, Mill Street below it and the lane east of the yard (S1b)
  slab(b, -34, 31, -37, -20, 1.0);
  slab(b, 26, 31, -20, -6, 1.0);
}

/** MDF hall, battery and power rooms, the stair room and the fire door. */
function buildWest(b: LevelBuilder): void {
  // exterior west wall, MDF hall north, battery and power room south run in `buildShell`
  // hall south wall (battery lobby door), battery / power wall (door to the power room), power room east wall
  lineX(b, 0, -24, -6, HD, [[-8]]);
  // (both stop at the first floor here; `buildFirst` continues them with the gallery doors)
  lineX(b, -6, -24, -6, H1, [[-20]]);
  lineZ(b, -6, -18, 18, H1, [[-10.5], [14.5]]);
  // battery lobby (2.7 x 2.7, two doors): the second door opens into the battery room
  lineZ(b, -9, -3, 0, H1, [[-2]]);
  lineX(b, -3, -9, -6, H1);
  // the fire door at the head of the basement stair (the stair room's north wall)
  lineX(b, 4.5, -23.8, -20.9, H1, [[-23.5]]);

  // MDF hall: five frame rows 4.0 high (0.6 x 9.6), aisles 2.4 wide and the 1.85 jumper aisle at x -11.7..-9.85;
  // cross aisles at z 14.6..18 (north) and z 0.2..5.0 (south, the test desk)
  for (const x of [-21, -18, -15, -12, -9.55]) b.box(x, 2, 9.8, 0.6, 4, 9.6, FRAME);
  solid(b, -12.6, -8.6, 1.4, 2.4, 0, 0.9, DESK);

  // battery room: glass cells on 1.0 stands (bays, so the aisle and the south door stay open)
  solid(b, -22.6, -10.2, -2.1, -1.1, 0, 1, '#4a5b52');
  solid(b, -22.6, -21, -4.9, -3.9, 0, 1, '#4a5b52');
  solid(b, -18, -7, -4.9, -3.9, 0, 1, '#4a5b52');

  // power room: two standby generators and the rectifier / switchgear cubicles (3.4 high) along the south wall
  solid(b, -20.5, -15.5, -14.5, -11.5, 0, 2.4, '#5b6f56');
  solid(b, -13.5, -8.5, -14.5, -11.5, 0, 2.4, '#5b6f56');
  solid(b, -21, -6.15, -17.55, -16.5, 0, 3.4, STEEL);
}

/** The east side: power corridor, colonnade and light well, stair hall, rooms around the court. */
function buildEast(b: LevelBuilder): void {
  // power corridor (2.1 clear) from the power room to the colonnade, door to the goods entrance
  lineX(b, -9, -6, 3.3, H1);
  lineX(b, -11.4, -6, 6, H1, [[-0.5]]);
  // colonnade (west wall with doors to the mess and WCs, the corridor door at its south end)
  lineZ(b, 3.3, -11.4, 6, H1, [[-10.5], [-5], [2.5]]);
  // staff WCs and engineers' mess off the colonnade, entrance hall's south wall
  lineX(b, 0, -6, 3.3, H1);
  lineX(b, 6, -6, 3.3, H1);
  // colonnade arcade: columns on the court side
  for (const z of [-3, 0, 3]) b.pillar(5.78, z, 0.25, H1, '#8d8a80');
  // stair hall (6..12 x -15..-6.2) with the court door, the WCs south of it, locked doors to the colonnade / workshop
  lineZ(b, 6, -18, -6.2, H1, [[-8, 'locked']]);
  lineZ(b, 12, -18, -6.2, H1, [[-8]]);
  lineX(b, -15, 6, 12, H1, [[10]]);
  // light well (court 12 x 12, open sky): walls to the roof, the stair door south, the test-room door east
  lineX(b, -6.2, 6, 24, HX, [[10]], 0.4);
  lineX(b, 6, 6, 18, HX, [], 0.4);
  lineZ(b, 18, -3.93, 6, HX, [[1]], 0.4);
  // the air shaft (1.85 x 6.0) off the court's SE corner, closed at the depository's party wall
  lineX(b, -3.93, 18, 24, HX, [], 0.4);
  // test room, goods hall, call office, watch lodge, entrance hall
  lineX(b, 6, 18, 24, H1, [[19]]);
  lineZ(b, 6, 6, 18, H1, [[8.5], [14.5]]);
  lineX(b, 12, 6, 12, H1, [[8.5]]);
  lineZ(b, 12, 6, 18, H1, [[9]]);
  // the goods lift (out of service) in the goods hall
  solid(b, 21.6, 23.5, 6.5, 8.4, 0, H1, '#6b7078');
  // the dry fountain (0.6 high) in the court
  solid(b, 10.8, 13.2, -1.2, 1.2, 0, 0.6, STONE);
  // engineers' workshop bench
  solid(b, 15, 21, -15.5, -14.5, 0, 0.9, DESK);
  solid(b, 5, 5.9, -10.9, -9.6, 0, 1.2, CRATE);
}

/** The main stair, ground to the first floor (two flights of 13 x 0.173, landing at +2.25) in the stair hall. */
function buildMainStair(b: LevelBuilder): void {
  const s0 = b.boxes.length;
  b.stairs(6.9, -9.88, 1.4, 3.36, 2.25, 13, STAIR, Math.PI, 0);
  solid(b, 6.2, 9.0, -13.2, -11.56, 0, 2.25, STAIR);
  b.stairs(8.3, -9.88, 1.4, 3.36, 2.25, 13, STAIR, 0, 2.25);
  b.mark(s0, { noLedge: true });
  // the first-floor landing (5.7 x 1.8) with a rail round the stair well
  slab(b, 6.15, 11.85, -8.2, -6.4, 0.3, EXCHANGE_Y.first);
  b.box(6.875, EXCHANGE_Y.first + 0.5, -8.15, 1.45, 1, 0.1, STEEL);
  b.box(10.425, EXCHANGE_Y.first + 0.5, -8.15, 2.85, 1, 0.1, STEEL);
}

/** A rack, cage or desk block standing on the first floor. */
function onFirst(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, h: number, color: string): void {
  solid(b, x0, x1, z0, z1, EXCHANGE_Y.first, EXCHANGE_Y.first + h, color);
}

/** The first floor (+4.5): slabs, rooms, stairs to the gallery and the roof, the server hall with its cage. */
function buildFirst(b: LevelBuilder): void {
  const F = EXCHANGE_Y.first;
  // floors: gallery and fan room, cloak block / switchroom block, offices, WCs, cloakroom and washroom, server hall, spares and motor room
  slab(b, -24, -6, -8.4, 0, 0.3, F);
  slab(b, -6, 6, -18, 6, 0.3, F);
  slab(b, -6, 9.6, 6, 18, 0.3, F);
  slab(b, 6, 12, -18, -15, 0.3, F);
  slab(b, 12, 24, -18, -6.2, 0.3, F);
  slab(b, 9.6, 24, 6, 18, 0.3, F);
  slab(b, 18, 24, -3.9, 6, 0.3, F);

  // the gallery and the fan room: the first-floor part of the power room wall and of the east wall of the double-height halls
  lineX(b, -6, -24, -6, HF, [[-15]], T, WALL, F);
  lineZ(b, -6, -18, 18, HF, [[-8]], T, WALL, F);
  // the gallery rail on the void side, and the steel stair up from the power room (26 x 0.173 / 0.28, 1.2 wide) at its west end
  b.box(-14.25, F + 0.5, -8.35, 16.1, 1, 0.1, STEEL);
  const s0 = b.boxes.length;
  b.stairs(-23, -12.04, 1.2, 7.28, F, 26, STEEL, 0, 0);
  b.mark(s0, { noLedge: true });

  // cloak block: supervisor's office, rest room, cloak lobby, first aid, WCs, cloakroom, washroom
  lineX(b, -6, -6, 6, HF, [[-4.5], [4]], T, WALL, F);
  lineX(b, -12, -6, 6, HF, [[-3.5], [2.5]], T, WALL, F);
  lineX(b, -12, 12, 24, HF, [[17.5]], T, WALL, F);
  lineX(b, -15, 6, 12, HF, [], T, WALL, F);
  lineZ(b, 0, -18, 6, HF, [[-9.5], [-5]], T, WALL, F);
  lineZ(b, 12, -18, -6.2, HF, [[-17], [-7.5]], T, WALL, F);
  // tea room / instruction room, the switchroom, the stem door and the court wall (x 6) to the offices
  lineX(b, 0, -6, 0, HF, [[-3.5]], T, WALL, F);
  lineX(b, 6, -6, 6, HF, [[4.5]], T, WALL, F);
  lineZ(b, 6, -18, 18, HF, [[-7.5], [11.5]], 0.4, WALL, F);
  // offices: clerks', post room and the stem, the T corridor, manager's and records
  lineZ(b, 0, 6, 10.8, HF, [[8]], T, WALL, F);
  lineZ(b, 3.6, 6, 10.8, HF, [[8]], T, WALL, F);
  lineX(b, 10.8, -6, 3.6, HF, [[-3.5], [1.5]], T, WALL, F);
  lineX(b, 13.2, -6, 6, HF, [[-3.5], [2.5]], T, WALL, F);
  lineZ(b, 0, 13.2, 18, HF, [[15]], T, WALL, F);
  // server hall: west wall (two double doors and the north door), south wall to the motor room (door at x 19.5)
  lineZ(b, 9.6, 6, 17.775, HH, [[11], [12], [16.5]], T, WALL, F);
  lineX(b, 6, 18, 24, HH, [[19]], T, WALL, F);
  // spares store and lift motor room
  lineX(b, 0, 18, 24, HF, [[20.5]], T, WALL, F);

  // furniture: the switchboard suite (low cover), office desks, the post room cupboard and the records cabinets
  onFirst(b, 2.2, 3.6, -3, 1.5, 1.1, DESK);
  onFirst(b, -5.2, -3.4, 7, 7.8, 0.9, DESK);
  onFirst(b, -5.2, -3.4, 9, 9.8, 0.9, DESK);
  onFirst(b, -4.5, -2.7, 16.2, 17, 0.9, DESK);
  onFirst(b, 2.5, 3.3, 6.2, 7, 1.8, DESK);
  onFirst(b, 1, 5, 17.3, 17.7, 1.4, STEEL);

  // server hall: stripped racks (3.2 high) in a ring with gaps, the cage (2.4) with a west gate, the core switch in its NE corner
  const rack = (x0: number, x1: number, z0: number, z1: number, c: string): void => onFirst(b, x0, x1, z0, z1, 3.2, c);
  rack(11.8, 15, 15.6, 16.3, FRAME);
  rack(16.6, 21.7, 15.6, 16.3, STEEL);
  rack(11.8, 16.4, 8, 8.7, FRAME);
  rack(18, 21.7, 8, 8.7, STEEL);
  rack(11.8, 12.5, 8.7, 11, FRAME);
  rack(11.8, 12.5, 13, 15.6, FRAME);
  rack(21, 21.7, 8.7, 10.4, STEEL);
  rack(21, 21.7, 12.4, 15.6, STEEL);
  lineZ(b, 14.8, 10, 13.9, 2.4, [[11]], 0.1, STEEL, F);
  lineZ(b, 19.2, 10, 13.9, 2.4, [], 0.1, STEEL, F);
  lineX(b, 10, 14.8, 19.2, 2.4, [], 0.1, STEEL, F);
  lineX(b, 13.9, 14.8, 19.2, 2.4, [], 0.1, STEEL, F);
  onFirst(b, 18.2, 19, 12.9, 13.5, 1.6, '#3b4a5a');

  // the stair from the motor room up to the roof (two flights of 13 x 0.173 / 0.26, landing +6.75, the roof hole above it)
  const s1 = b.boxes.length;
  b.stairs(19.5, 3.12, 1.2, 3.36, 2.25, 13, STEEL, Math.PI, F);
  solid(b, 18.9, 22.1, 0.4, 1.44, F, F + 2.25, STAIR);
  b.stairs(20.8, 3.12, 1.2, 3.36, 2.25, 13, STEEL, 0, F + 2.25);
  b.mark(s1, { noLedge: true });
}

/** The roof (+9.0, raised roof +10.5 over the server hall): slabs, parapets, the hatch stair opening, the tank room, the shaft bridge, the stair to the yard. */
function buildRoof(b: LevelBuilder): void {
  const R = EXCHANGE_Y.roof;
  // main roof (the light well stays open to the sky); the court wall tops sit flush with it
  slab(b, -24, 6.2, -18, 18, 0.3, R);
  slab(b, 6, 24, -18, -6.2, 0.3, R);
  slab(b, 6, 9.6, 6.2, 18, 0.3, R);
  // spares and motor room roof round the stair opening (x 18.9..22.1, z 0.4..4.8)
  slab(b, 18, 18.9, -3.9, 6, 0.3, R);
  slab(b, 22.1, 24, -3.9, 6, 0.3, R);
  slab(b, 18.9, 22.1, -3.9, 0.4, 0.3, R);
  slab(b, 18.9, 22.1, 4.8, 6, 0.3, R);
  // the raised roof over the apparatus range, a 1.5 m step above the main roof, and the step's walls
  slab(b, 9.6, 24, 6, 18, 0.3, RAISED);
  solid(b, 23.775, 24.225, 6, 18, R, 10.2, WALL_DARK);
  solid(b, 9.6, 24, 17.775, 18.225, R, 10.2, WALL_DARK);
  solid(b, 9.6, 18, 6, 6.4, R, 10.2, WALL_DARK);
  solid(b, 23.85, 24.15, 6, 18, RAISED, RAISED + 0.6, STONE);
  solid(b, 9.6, 24, 17.85, 18.15, RAISED, RAISED + 0.6, STONE);

  // 1.0 m parapets: the rear (open where the steel stair leaves the roof, x 15.9..17.1), west, north and east edges
  solid(b, -24, 15.9, -18.15, -17.85, R, R + 1, STONE);
  solid(b, 17.1, 24, -18.15, -17.85, R, R + 1, STONE);
  solid(b, -24.15, -23.85, -18, 18, R, R + 1, STONE);
  solid(b, -24, 9.6, 17.85, 18.15, R, R + 1, STONE);
  solid(b, 23.85, 24.15, -18, 6, R, R + 1, STONE);
  // round the light well and the air shaft (the bridge crosses the shaft at x 21..22)
  solid(b, 5.9, 6.2, -6, 6.2, R, R + 1, STONE);
  solid(b, 6, 9.6, 6, 6.4, R, R + 1, STONE);
  solid(b, 6, 20.9, -6.4, -6, R, R + 1, STONE);
  solid(b, 22.1, 24, -6.4, -6, R, R + 1, STONE);
  solid(b, 17.8, 18.2, -3.93, 6, R, R + 1, STONE);
  solid(b, 18, 20.9, -4.13, -3.73, R, R + 1, STONE);
  solid(b, 22.1, 24, -4.13, -3.73, R, R + 1, STONE);
  slab(b, 21, 22, -6.4, -3.7, 0.3, R);
  solid(b, 20.95, 21.05, -6.2, -3.9, R, R + 1, STEEL);
  solid(b, 21.95, 22.05, -6.2, -3.9, R, R + 1, STEEL);
  // rails round the stair opening (open on the north side where the second flight arrives, x 20.2..21.4)
  solid(b, 18.75, 18.85, 0.4, 4.8, R, R + 1, STEEL);
  solid(b, 22.15, 22.25, 0.4, 4.8, R, R + 1, STEEL);
  solid(b, 18.9, 22.1, 0.25, 0.35, R, R + 1, STEEL);
  solid(b, 18.9, 20.1, 4.85, 4.95, R, R + 1, STEEL);
  solid(b, 21.4, 22.1, 4.85, 4.95, R, R + 1, STEEL);

  // tank room over the power room's south half (9 x 5.2, 3.0 high to +12.0), door on its east side, one tank inside
  const s0 = b.boxes.length;
  lineX(b, -16.15, -20.5, -11.5, 2.7, [], T, WALL, R);
  lineX(b, -10.95, -20.5, -11.5, 2.7, [], T, WALL, R);
  lineZ(b, -20.5, -16.15, -10.95, 2.7, [], T, WALL, R);
  lineZ(b, -11.5, -16.15, -10.95, 2.7, [[-14]], T, WALL, R);
  slab(b, -20.65, -11.35, -16.3, -10.8, 0.3, R + 3);
  solid(b, -19.5, -14.5, -15.5, -12, R, R + 2, '#7a8078');
  b.mark(s0, { noLedge: true });

  // the steel stair from the roof down to the yard (52 x 0.173 / 0.28, 1.2 wide) over the rear wall at x 16.5
  const s1 = b.boxes.length;
  b.stairs(16.5, -25.48, 1.2, 14.56, R, 52, STEEL, 0, 0);
  b.mark(s1, { noLedge: true });
}

/** The rear goods yard (48 x 18, walls 3.0), the lane east of it, the van, the coke bunker and the pallet stacks. */
function buildYard(b: LevelBuilder): void {
  lineX(b, -36.3, -24, 24, 3, [], T, WALL_DARK);
  lineZ(b, -24, -36.3, -18, 3, [[-27, 'locked']], T, WALL_DARK);
  lineZ(b, 24, -36.3, -18, 3, [[-28]], T, WALL_DARK);
  // the lane's north end (the depository's blank wall)
  solid(b, 24, 30.25, -6.2, -5.8, 0, 6, WALL_DARK);
  // the broker's van, the coke bunker, a bin and four pallet stacks (cover)
  solid(b, -14.8, -9.2, -25.6, -23.4, 0, 2.2, '#3f4a55');
  solid(b, -22, -19, -21.3, -19.1, 0, 1.8, '#4a4540');
  solid(b, -21.4, -20.4, -23, -22.2, 0, 1.1, STEEL);
  for (const [x, z] of [[2.5, -20.5], [4, -20.5], [2, -29], [3.5, -29]] as const) solid(b, x - 0.6, x + 0.6, z - 0.6, z + 0.6, 0, 1.1, CRATE);
}

export const exchange: MapDef = {
  id: 'exchange',
  name: 'Kestrel Exchange',
  description: 'A 1934 telephone exchange at night: cable tunnel, MDF hall, battery and power rooms, the light well, the first floor, the roof and the rear yard.',
  modes: ['infiltration', 'sandbox'],
  theme: {
    sky: '#0b111b',
    horizon: '#2b3440',
    ground: '#5f6364',
    fogStart: 30,
    fogEnd: 90,
    sunDir: [0.35, -1, 0.55],
    sunIntensity: 0.16,
    ambient: 0.3,
    lightLevel: 0.1,
    faction: 'urban',
    grade: { tint: [0.92, 1.0, 1.08], saturation: 0.85, contrast: 1.08 },
  },
  build(b: LevelBuilder): MapLayout {
    // world bounds on a quarter-metre offset: 1.0 m doors on half-metre centres line up with the nav cells
    b.perimeter(-33.75, 30.25, -36.75, 20.25, HX, WALL_DARK);
    buildSlabs(b);
    buildBasement(b);
    // exterior skin to the roof (the plan's outer wall lines)
    lineZ(b, -24, -18, 18, HX, [], TX, WALL_DARK);
    lineZ(b, 24, -18, 18, HX, [], TX, WALL_DARK);
    lineX(b, 18, -24, 24, HX, [], TX, WALL_DARK);
    lineX(b, -18, -24, 24, HX, [], TX, WALL_DARK);
    buildWest(b);
    buildEast(b);
    buildMainStair(b);
    buildFirst(b);
    buildRoof(b);
    buildYard(b);

    const v = (x: number, z: number, y = 0): Vector3 => new Vector3(x, y, z);
    return {
      // the operator comes down the Mill Street manhole: four stand in the tunnel facing the chamber
      playerSpawns: [
        { pos: v(-31, 8.5, BASE), yaw: Math.PI / 2 },
        { pos: v(-29.5, 8.5, BASE), yaw: Math.PI / 2 },
        { pos: v(-28, 8.5, BASE), yaw: Math.PI / 2 },
        { pos: v(-26.5, 8.5, BASE), yaw: Math.PI / 2 },
      ],
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      rooms: ROOMS,
    };
  },
};
