import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';

/**
 * The Kestrel Exchange, layout v2 (First Playable R1): the basement, the ground floor, the yard and the vertical links
 * between them, to `docs/prompts/exchange-layout-v2.md`. Greybox: boxes only. The first floor and the roof come in R2,
 * ducts and grilles in R3, lights, guards and the objective chain in S1c-v2.
 * Footprint 48 x 36 m (x -24..24, z -18..18), north is +z. Storeys: basement -3.3, ground 0, first floor 4.5, roof 9.0.
 * Door centres sit on multiples of 0.5 and the world bounds on a quarter-metre offset so every 1.0 m door lines up with a
 * nav cell (cell 0.5, agent radius 0.32).
 */
export const EXCHANGE_Y = { basement: -3.3, ground: 0, first: 4.5, roof: 9.0 } as const;

const WALL = '#a9a496';
const WALL_DARK = '#7d786d';
const FLOOR = '#6f7477';
const STEEL = '#55606a';
const FRAME = '#4d5560';
const STAIR = '#9a948a';
const CRATE = '#a8784a';
const DESK = '#8a6a4c';
const GREEN = '#5b6f56';

const T = 0.3; // interior wall thickness
const TX = 0.45; // exterior wall thickness
const H1 = 4.5; // ground-floor wall height under the first floor
const HX = 9.0; // exterior and court walls to the roof
const BH = 3.3; // basement wall height (floor to the ground slab top)
const DOOR_H = 2.1;
const DOOR_W = 1.0;
const BASE = EXCHANGE_Y.basement;
const RAIL = 1.0;

type GapKind = 'door' | 'locked' | 'open';
/** A gap in a wall line: where it starts, what fills it, how wide (sorted by start along the line). */
type Gap = readonly [at: number, kind?: GapKind, width?: number];
/** A rectangle on the plan: x0, x1, z0, z1. */
type Rect = readonly [x0: number, x1: number, z0: number, z1: number];

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

/** A slab over the rectangle with rectangular holes cut out of it (tiled along the hole edges). */
function slabCut(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, thick: number, top: number, holes: readonly Rect[]): void {
  const xs = new Set<number>([x0, x1]);
  const zs = new Set<number>([z0, z1]);
  for (const [a, c, d, e] of holes) {
    for (const x of [a, c]) if (x > x0 && x < x1) xs.add(x);
    for (const z of [d, e]) if (z > z0 && z < z1) zs.add(z);
  }
  const X = [...xs].sort((p, q) => p - q);
  const Z = [...zs].sort((p, q) => p - q);
  for (let i = 0; i + 1 < X.length; i++) {
    for (let j = 0; j + 1 < Z.length; j++) {
      const mx = (X[i]! + X[i + 1]!) / 2;
      const mz = (Z[j]! + Z[j + 1]!) / 2;
      if (holes.some((h) => mx > h[0] && mx < h[1] && mz > h[2] && mz < h[3])) continue;
      slab(b, X[i]!, X[i + 1]!, Z[j]!, Z[j + 1]!, thick, top);
    }
  }
}

/** Solid block over [x0, x1] x [z0, z1] from y0 to y1. */
function solid(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string): void {
  b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
}

/** A block standing on the basement floor. */
function inBase(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, h: number, color: string): void {
  solid(b, x0, x1, z0, z1, BASE, BASE + h, color);
}

const ROOMS: RoomDef[] = [
  // basement (feet at -3.3); the cable room takes in the spawn tunnel
  { id: 'cable', name: 'Cable Tunnel and Chamber', minX: -31.75, maxX: -6, minZ: 0, maxZ: 18, minY: -3.6, maxY: -0.2 },
  { id: 'rectifier', name: 'Rectifier Room', minX: -24, maxX: -6, minZ: -6, maxZ: 0, minY: -3.6, maxY: -0.2 },
  { id: 'battery', name: 'Battery Hall', minX: -24, maxX: -6, minZ: -18, maxZ: -6, minY: -3.6, maxY: -0.2 },
  { id: 'genroom', name: 'Generator Room', minX: 2.5, maxX: 12, minZ: -18, maxZ: -8.5, minY: -3.6, maxY: -0.2 },
  { id: 'boiler', name: 'Boiler House', minX: 12, maxX: 24, minZ: -18, maxZ: -8.5, minY: -3.6, maxY: -0.2 },
  { id: 'riserbase', name: 'Riser Base', minX: 20.5, maxX: 24, minZ: -8.5, maxZ: 8.5, minY: -3.6, maxY: -0.2 },
  // ground floor (feet at 0)
  { id: 'mdf', name: 'MDF Hall', minX: -24, maxX: -6, minZ: 0, maxZ: 18, minY: 0, maxY: 4.3 },
  { id: 'test', name: 'Test Room', minX: -24, maxX: -6, minZ: -6, maxZ: 0, minY: 0, maxY: 4.3 },
  { id: 'transmission', name: 'Transmission Room', minX: -24, maxX: -6, minZ: -18, maxZ: -6, minY: 0, maxY: 4.3 },
  { id: 'foyer', name: 'Foyer', minX: -3.5, maxX: 6, minZ: 8.5, maxZ: 18, minY: 0, maxY: 4.3 },
  { id: 'security', name: 'Security Office', minX: 6, maxX: 12, minZ: 8.5, maxZ: 18, minY: 0, maxY: 4.3 },
  { id: 'canteen', name: 'Canteen', minX: 12, maxX: 24, minZ: 8.5, maxZ: 18, minY: 0, maxY: 4.3 },
  { id: 'meeting', name: 'Meeting Room', minX: -3.5, maxX: 3.5, minZ: 1.25, maxZ: 8.5, minY: 0, maxY: 4.3 },
  { id: 'cleaners', name: "Cleaners' Store", minX: -3.5, maxX: 3.5, minZ: -8.5, maxZ: -1.25, minY: 0, maxY: 4.3 },
  { id: 'goodsin', name: 'Goods-In Bay', minX: 2.5, maxX: 12, minZ: -18, maxZ: -8.5, minY: 0, maxY: 4.3 },
  { id: 'workshop', name: 'Workshop', minX: 18, maxX: 24, minZ: -18, maxZ: -8.5, minY: 0, maxY: 4.3 },
  { id: 'well', name: 'Light Well', minX: 6, maxX: 18, minZ: -6, maxZ: 6, minY: 0, maxY: 8.9 },
  // the rear goods yard and the lane east of it
  { id: 'yard', name: 'Rear Goods Yard', minX: -24, maxX: 30, minZ: -36.3, maxZ: -18, minY: -0.5, maxY: 9.5 },
];

/** Where the storeys are cut open (ground slab holes) and the plant ramp and coke stair come down from the yard. */
const HOLE_C: Rect = [-23.7, -21.5, 1.35, 3.3];
const HOLE_V: Rect = [-7.5, -6, -18, -12.2];
const HOLE_B: Rect = [-3.35, -1.95, -16.6, -11];
const HOLE_R: Rect = [21.5, 23, 0.5, 4.9];
const HOLE_RAMP: Rect = [3, 5, -29.4, -18.225];
const HOLE_COKE: Rect = [14.65, 16.35, -22.7, -18.225];

/** The slabs: basement floors, the ground slab with its holes, the yard, the lane and the strips round the building. */
function buildSlabs(b: LevelBuilder): void {
  // basement floors: cable chamber, rectifier and battery hall with the spine, the stair B foot / generator / boiler row,
  // the service tunnel, the riser base and the spawn tunnel
  slab(b, -24, -3.5, -18, 18, 0.3, BASE);
  slab(b, -3.5, 24, -18, -8.5, 0.3, BASE);
  slab(b, -3.5, 20.5, -1.25, 1.25, 0.3, BASE);
  slab(b, 20.5, 24, -8.5, 8.5, 0.3, BASE);
  slab(b, -31.75, -24, 7.6, 9.4, 0.3, BASE);
  // the ground slab (the basement ceiling where there is a basement)
  slabCut(b, -24, 24, -18, 18, 0.3, 0, [HOLE_C, HOLE_V, HOLE_B, HOLE_R]);
  // west of the building: the Mill Street tunnel (ceiling at -1.1) with the manhole shaft open at its west end
  slab(b, -34, -24, -18, 7.3, 1.0);
  slab(b, -34, -24, 9.7, 20, 1.0);
  slab(b, -34, -31.6, 7.3, 9.7, 1.1);
  slab(b, -31.6, -30.4, 7.3, 7.9, 1.1);
  slab(b, -31.6, -30.4, 9.1, 9.7, 1.1);
  slab(b, -30.4, -24, 7.3, 9.7, 1.1);
  // north strip (the street), the rear goods yard with the plant ramp and the coke stair cut in, the lane east of the yard
  slab(b, -24, 31, 18, 20.5, 1.0);
  slabCut(b, -34, 31, -37, -18, 1.0, 0, [HOLE_RAMP, HOLE_COKE]);
  slab(b, 24, 31, -18, -6, 1.0);
  slab(b, 24, 26, -6, 20, 1.0);
}

/** The basement (-3.3): cable chamber, rectifier, battery hall, spine, stair B foot, generator and boiler rooms, service tunnel, riser base. */
function buildBasement(b: LevelBuilder): void {
  const Y0 = BASE;
  // exterior skin: west (the tunnel mouth is the door at z 8..9), south (plant ramp door x 3.5, coke stair door x 15), north, east
  lineZ(b, -24, -18, 18, BH, [[8]], TX, WALL_DARK, Y0);
  lineX(b, -18, -24, 24, BH, [[3.5], [15]], TX, WALL_DARK, Y0);
  lineX(b, 18, -24, -3.5, BH, [], TX, WALL_DARK, Y0);
  lineZ(b, 24, -18, 8.5, BH, [], TX, WALL_DARK, Y0);
  lineX(b, 8.5, 20.5, 24, BH, [], TX, WALL_DARK, Y0);
  // the spawn tunnel (2.2 high) under the street: walls, the end wall under the manhole
  b.wall(-31.75, 7.45, -24, 7.45, 2.2, WALL_DARK, T, Y0);
  b.wall(-31.75, 9.55, -24, 9.55, 2.2, WALL_DARK, T, Y0);
  b.wall(-31.75, 7.6, -31.75, 9.4, 2.2, WALL_DARK, T, Y0);
  // spine walls: west (to the cable chamber twice, the rectifier and the battery hall), east (stair B foot, service tunnel)
  lineZ(b, -6, -18, 18, BH, [[-8], [-4], [5], [12]], T, WALL, Y0);
  lineZ(b, -3.5, -18, 18, BH, [[-11], [-0.5]], T, WALL, Y0);
  // chamber south wall (door to the rectifier), rectifier south wall (door to the battery hall)
  lineX(b, 0, -24, -6, BH, [[-14]], T, WALL, Y0);
  lineX(b, -6, -24, -6, BH, [[-14]], T, WALL, Y0);
  // stair B foot, generator room, boiler house: north walls, the stair B foot / generator / boiler walls
  lineX(b, -8.5, -3.5, 24, BH, [], T, WALL, Y0);
  lineZ(b, 2.5, -18, -8.5, BH, [[-13]], T, WALL, Y0);
  lineZ(b, 12, -18, -8.5, BH, [[-14]], T, WALL, Y0);
  // service tunnel (2.0 wide) under the court to the riser base
  lineX(b, -1.25, -3.5, 20.5, BH, [], T, WALL, Y0);
  lineX(b, 1.25, -3.5, 20.5, BH, [], T, WALL, Y0);
  lineZ(b, 20.5, -8.5, 8.5, BH, [[-0.5]], T, WALL, Y0);

  // C cable shaft: the pit in the chamber's south-west corner, a ladder up to the MDF hall
  lineX(b, 1.2, -23.7, -21.5, BH, [], T, WALL_DARK, Y0);
  b.ladder(-22.6, 1.6, Y0, EXCHANGE_Y.ground, Math.PI, STEEL);
  // V battery extract (1.5 m shaft, x -7.5..-6): west wall with the battery door, closed at its north end; steep stair up to ground
  lineZ(b, -7.5, -18, -10, BH, [[-17.5]], T, WALL, Y0);
  lineX(b, -10, -7.5, -6, BH, [], T, WALL, Y0);
  const sv = b.boxes.length;
  b.stairs(-6.75, -14.4, 1.2, 4.4, 3.3, 18, STAIR, 0, Y0);
  b.mark(sv, { noLedge: true });
  // B back stair (rise 0.165, run 0.28): foot at the north end of the core, along the west wall, up to ground at z -16.6
  const sb = b.boxes.length;
  b.stairs(-2.65, -13.8, 1.3, 5.6, 3.3, 20, STAIR, Math.PI, Y0);
  b.mark(sb, { noLedge: true });
  // R services riser: steep run from the riser base up to ground
  const sr = b.boxes.length;
  b.stairs(22.25, 2.7, 1.4, 4.4, 3.3, 18, STAIR, 0, Y0);
  b.mark(sr, { noLedge: true });

  // cable chamber: three rows of cable racks (1.5 high) as cover
  for (const z of [4.5, 9, 14]) inBase(b, -20, -9, z - 0.3, z + 0.3, 1.5, '#6b4a2f');
  // rectifier cabinets and the battery hall's rack rows (1.6 high)
  inBase(b, -22, -17, -3.5, -2.5, 2, GREEN);
  inBase(b, -10, -7.5, -3.5, -2.5, 2, GREEN);
  for (const z of [-9.5, -13.5]) inBase(b, -22, -11, z - 0.4, z + 0.4, 1.6, '#4a5b52');
  // generator room and boiler house machinery
  inBase(b, 5, 9, -15, -12, 2.2, GREEN);
  inBase(b, 14, 20, -15.5, -11.5, 2.5, STEEL);
}

/** The ground floor (0): MDF hall, test and transmission rooms, spine, foyer, security, canteen, meeting room, cleaners, ring, goods-in, M hall, workshop, court, riser strip. */
function buildGround(b: LevelBuilder): void {
  const R0 = 0;
  // exterior skin to the roof: the street door (locked), the yard fire doors
  lineZ(b, -24, -18, 18, HX, [], TX, WALL_DARK);
  lineZ(b, 24, -18, 18, HX, [], TX, WALL_DARK);
  lineX(b, 18, -24, 24, HX, [[0, 'locked']], TX, WALL_DARK);
  lineX(b, -18, -24, 24, HX, [[-16], [-5.5], [9], [20]], TX, WALL_DARK);

  // the spine (x -6..-3.5): west wall to the MDF hall (two), test room, transmission room; east wall to stair B, cleaners, cross corridor, meeting room, foyer
  lineZ(b, -6, -18, 18, H1, [[-8], [-4], [3], [13]]);
  lineZ(b, -3.5, -18, 18, H1, [[-17], [-5], [-0.5], [5], [12]]);
  // the west block: MDF hall | test room | transmission room
  lineX(b, 0, -24, -6, H1, [[-14]]);
  lineX(b, -6, -24, -6, H1, [[-14]]);
  // V shaft (x -7.5..-6): its west wall has the one door, to the transmission room
  lineZ(b, -7.5, -18, -10, H1, [[-12.5]]);
  lineX(b, -10, -7.5, -6, H1);
  // cross corridor (x -3.5..3.5, z -1.25..1.25), the ring's west wall, the meeting room and cleaners
  lineX(b, 1.25, -3.5, 3.5, H1, [[-1]]);
  lineX(b, -1.25, -3.5, 3.5, H1, [[-1]]);
  lineZ(b, 3.5, -8.5, 8.5, H1, [[-0.5]]);
  // the ring's outer walls: north (foyer, security, canteen), south (stair B core, goods-in, M hall, workshop), east (riser strip)
  lineX(b, 8.5, -3.5, 24, H1, [[-2], [4], [8], [14]]);
  lineX(b, -8.5, -3.5, 24, H1, [[5], [13], [19]]);
  lineZ(b, 20.5, -8.5, 8.5, H1, [[5]]);
  // the court (x 6..18, z -6..6, open to the sky): walls to the roof, one door from the ring's west side
  lineZ(b, 6, -6, 6, HX, [[0]], 0.4);
  lineZ(b, 18, -6, 6, HX, [], 0.4);
  lineX(b, 6, 6, 18, HX, [], 0.4);
  lineX(b, -6, 6, 18, HX, [], 0.4);
  // north rooms: foyer | security | canteen
  lineZ(b, 6, 8.5, 18, H1, [[13]]);
  lineZ(b, 12, 8.5, 18, H1);
  // south rooms: stair B core | goods-in | M hall | workshop
  lineZ(b, 2.5, -18, -8.5, H1, [[-10]]);
  lineZ(b, 12, -18, -8.5, H1, [[-14]]);
  lineZ(b, 18, -18, -8.5, H1);

  // C cable shaft top: rails on the open sides of the hole (the ladder comes up on its south edge)
  solid(b, HOLE_C[1] - 0.05, HOLE_C[1] + 0.05, HOLE_C[2], HOLE_C[3], R0, R0 + RAIL, STEEL);
  solid(b, HOLE_C[0], HOLE_C[1], HOLE_C[3], HOLE_C[3] + 0.1, R0, R0 + RAIL, STEEL);
  // B stair top: rails on the hole's east side and across its north end
  solid(b, HOLE_B[1] - 0.05, HOLE_B[1] + 0.05, HOLE_B[2], HOLE_B[3], R0, R0 + RAIL, STEEL);
  solid(b, HOLE_B[0], HOLE_B[1], HOLE_B[3] - 0.05, HOLE_B[3] + 0.05, R0, R0 + RAIL, STEEL);
  // R riser: rails on both sides of the hole and across its south end
  solid(b, HOLE_R[0] - 0.05, HOLE_R[0] + 0.05, HOLE_R[2], HOLE_R[3], R0, R0 + RAIL, STEEL);
  solid(b, HOLE_R[1] - 0.05, HOLE_R[1] + 0.05, HOLE_R[2], HOLE_R[3], R0, R0 + RAIL, STEEL);
  solid(b, HOLE_R[0], HOLE_R[1], HOLE_R[2] - 0.05, HOLE_R[2] + 0.05, R0, R0 + RAIL, STEEL);

  // MDF hall: two long frame rows (1.2 x 4.0 high) leave three lanes; the line-record cabinet and desk in the test room
  for (const z of [6, 12]) solid(b, -21, -9, z - 0.6, z + 0.6, R0, 4, FRAME);
  solid(b, -22, -20.4, -5.8, -4.2, R0, 1.8, STEEL);
  solid(b, -14, -10, -2, -1, R0, 0.9, DESK);
  // transmission room: two rack rows, leaving the V door and the test-room door clear
  for (const z of [-9.4, -14.2]) solid(b, -22, -12, z - 0.4, z + 0.4, R0, 2.2, FRAME);
  // foyer reception desk, security desks, canteen tables and lockers, meeting table, cleaners' shelves, goods-in crates, workshop bench
  solid(b, 1.5, 4.5, 14, 14.8, R0, 1.1, DESK);
  solid(b, 7.5, 11, 15.5, 16.5, R0, 0.9, DESK);
  solid(b, 14, 21, 12, 13, R0, 0.9, DESK);
  solid(b, 14, 23.5, 17.0, 17.6, R0, 2, STEEL);
  solid(b, -2, 2, 4, 5.5, R0, 0.9, DESK);
  solid(b, -3.2, -2.5, -7.5, -3, R0, 1.8, STEEL);
  for (const [x, z] of [[5, -14], [6.4, -14], [9, -16]] as const) solid(b, x - 0.6, x + 0.6, z - 0.6, z + 0.6, R0, 1.1, CRATE);
  solid(b, 19, 23, -16.5, -15.5, R0, 0.9, DESK);
}

/** The plant ramp and the coke stair, cut into the yard: retaining walls to rail height, the way down into the basement. */
function buildYardCuts(b: LevelBuilder): void {
  const Y0 = BASE;
  // plant ramp: a shallow ramp (x 3.2..4.8) from the yard down to the generator room door
  lineZ(b, HOLE_RAMP[0], HOLE_RAMP[2], HOLE_RAMP[3], BH + RAIL, [], T, WALL_DARK, Y0);
  lineZ(b, HOLE_RAMP[1], HOLE_RAMP[2], HOLE_RAMP[3], BH + RAIL, [], T, WALL_DARK, Y0);
  b.ramp(4, (HOLE_RAMP[2] + HOLE_RAMP[3] + 0.025) / 2, 1.6, 11.2, 3.3, STAIR, Math.PI, Y0);
  // coke chute: a steep stair (x 14.8..16.2) from the yard down to the boiler house door
  lineZ(b, HOLE_COKE[0], HOLE_COKE[2], HOLE_COKE[3], BH + RAIL, [], T, WALL_DARK, Y0);
  lineZ(b, HOLE_COKE[1], HOLE_COKE[2], HOLE_COKE[3], BH + RAIL, [], T, WALL_DARK, Y0);
  const sc = b.boxes.length;
  b.stairs(15.5, -20.5, 1.4, 4.4, 3.3, 17, STAIR, Math.PI, Y0);
  b.mark(sc, { noLedge: true });
}

/** The rear goods yard (48 x 18, walls 3.0), the lane east of it, the van, the coke bunker, a bin and the pallet stacks. */
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
  for (const [x, z] of [[8, -21], [9.5, -21], [8.5, -30], [10, -30]] as const) solid(b, x - 0.6, x + 0.6, z - 0.6, z + 0.6, 0, 1.1, CRATE);
}

export const exchange: MapDef = {
  id: 'exchange',
  name: 'Kestrel Exchange',
  description: 'A 1934 telephone exchange at night: cable tunnel, MDF hall, battery and generator rooms, the light well, the ground floor and the rear yard.',
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
    buildGround(b);
    buildYardCuts(b);
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
