import type { LevelBuilder } from '../levelBuilder';
import type { P3 } from '../anchors';
import type { CourseDevice } from '../../game/course/courseDef';
import { wallXAt, wallZAt } from './storey';
import { pit, slabWithHoles } from './bunkerUpper';
import { stairLayout, type StairLayout } from './stairs';
import { hyp2 } from '../../core/mathx';

/**
 * Fallow, the rest of the Plant level and the stair down (docs/training/BAYS.md B5, B6, S6, A6): B5 Standby Plant,
 * airlock A5 and its service passage, B6 Mock Site, S6 Stair 6 and airlock A6 (Deep, y 0). Every coordinate below is
 * a BAYS local coordinate; `plantAt2` / the per-bay `X` / `Z` / `Y` add the bay's offset and floor.
 *
 * Ledges (A25): every piece here is `noLedge` except the genset tops (`B5_LIPS`: the wall-jump high route); the
 * gallery's west end is a manual hang-only ledge (the hang-drop at x 2). No window anchors: every glazed wall is a
 * fixed pane, so no gate (reader doors, the mains gate, the exit keypad, S6's top door) can be passed by a window,
 * a climb or a side door; the supply duct reaches only the records room (the planned alternate route, A37).
 */

export type Plant2Bay = 'B5' | 'A5' | 'B6' | 'S6' | 'A6';

/** BAYS 0 offsets (x, z) and floor y. S6 sits at z -8 (A36: its top door is in B6's west wall at local z 0.9..2.1). */
export const PLANT2_OFFSET: Record<Plant2Bay, readonly [number, number, number]> = {
  B5: [70, -8, 6],
  A5: [64, 5, 6],
  B6: [22, -8, 6],
  S6: [6, -8, 0],
  A6: [0, -10, 0],
};

/** World point from a bay's local (x, z, y above the bay's floor). */
export function plantAt2(bay: Plant2Bay, x: number, z: number, y = 0): P3 {
  const o = PLANT2_OFFSET[bay];
  return { x: x + o[0], y: o[2] + y, z: z + o[1] };
}

/** B5 metrics (local heights over the hall floor). */
export const B5_METRICS = {
  clear: 9,
  /** Genset roofs: full cover, the wall-jump lips. */
  genset: 3.0,
  gallery: 3.5,
  /** The entry landing at A4's far door (A32: A4's floor is y 10.4). */
  landing: 4.4,
  trenchDepth: 1.5,
  trenchWidth: 1.2,
  /** Trench plan (local): x 3.4..44.6, z 20.4..21.6; the lift-out panel openings at x 4 and x 44. */
  trench: [3.4, 20.4, 44.6, 21.6] as const,
  panels: [4, 44] as const,
  /** The landing stair: 24 risers down to the floor, south from the landing (A36). */
  stairRisers: 24,
  going: 0.28,
} as const;

/** B6 metrics. */
export const B6_METRICS = {
  clear: 7,
  room: 3.5,
  /** Ceiling slab top (the void floor): the supply duct's feet height. */
  ceiling: 3.5,
  mezzanine: 3.6,
  /** The plant platform in A5's service passage (T0): feet 2.2 under the duct entry grate. */
  platform: 2.2,
  desk: 0.75,
} as const;

/** S6: 33 risers of 0.182, going 0.28, 3.0 wide (BAYS S6); the mid landing as deep as the stair is wide (A36). */
export const S6_METRICS = { risers: 33, going: 0.28, width: 3.0, rise: 6, topLanding: 1.8 } as const;

/** Light groups the course reads (T6 hangs HB1-HB6 and CG1-4 on the mains group; the work lamp is on it now). */
export const B5_GROUPS = { mains: 51 } as const;

const OUTER = 0.45;
const PART = 0.3;
const DOOR_W = 1.2;
const DOOR_H = 2.1;
const ROOF_T = 0.3;
const RAIL_H = 1.1;
const AIR_CLEAR = 3.0;

const C = {
  wall: '#62676c',
  conc: '#6b6e70',
  floor: '#55595d',
  roof: '#45484b',
  steel: '#5b6168',
  grate: '#4d5358',
  rail: '#8a6a3a',
  gen: '#4a5a4c',
  tank: '#7a6a3a',
  glass: '#5d7387',
  mesh: '#3f4a3c',
  office: '#8a8f94',
  vinyl: '#6d7276',
  carpet: '#4f5560',
  locker: '#56606a',
  rack: '#2d3238',
  wood: '#7a5a3c',
  cam: '#202326',
} as const;

/** A planned lip on B5 (world plan box grown 5 cm, top world y, the floor it is measured from). */
export interface Plant2Lip {
  id: string;
  bay: Plant2Bay;
  box: [number, number, number, number];
  top: number;
  floor: number;
}

function lip(bay: Plant2Bay, id: string, x0: number, z0: number, x1: number, z1: number, top: number): Plant2Lip {
  const a = plantAt2(bay, x0, z0);
  const e = plantAt2(bay, x1, z1);
  return { id, bay, box: [a.x - 0.05, a.z - 0.05, e.x + 0.05, e.z + 0.05], top: a.y + top, floor: a.y };
}

const M5 = B5_METRICS;
const M6 = B6_METRICS;

/** Genset plan x ranges (local), z 15..17.5. */
const GENSETS: readonly (readonly [number, number])[] = [[10, 16], [21, 27], [32, 38]];

/** Every planned lip on B5 / B6 / S6 (nothing else makes a ledge): the genset roofs and the gallery hang-drop. */
export const B5_LIPS: readonly Plant2Lip[] = [
  ...GENSETS.map(([x0, x1], i) => lip('B5', `GEN${i + 1}`, x0, 15, x1, 17.5, M5.genset)),
  lip('B5', 'GAL-W', 2, 30.5, 2, 31.775, M5.gallery),
];

/** A device mount point (T7a reads these): kind, local (x, z, y over the bay floor), world position, facing. */
export interface BunkerDevice {
  id: string;
  kind: 'camera' | 'cameraSweep' | 'desk' | 'panel' | 'fault' | 'reader' | 'iris' | 'beam' | 'pir' | 'keypad' | 'pc' | 'whiteboard' | 'medkit';
  bay: Plant2Bay;
  local: readonly [number, number, number];
  pos: P3;
  /** Facing (yaw, 0 = +z). */
  yaw: number;
  /** Sweep limits (yaw) for a sweeping camera. */
  sweep?: readonly [number, number];
  /** A beam's far end. */
  to?: P3;
  /** Reader level (RD1-RD4) and the door it serves. */
  level?: number;
  door?: string;
}

const deg = (d: number): number => (d * Math.PI) / 180;

function dev(id: string, kind: BunkerDevice['kind'], bay: Plant2Bay, x: number, z: number, y: number, facingDeg: number, extra: Partial<BunkerDevice> = {}): BunkerDevice {
  return { id, kind, bay, local: [x, z, y], pos: plantAt2(bay, x, z, y), yaw: deg(facingDeg), ...extra };
}

/** B6 device mount points (BAYS B6 devices table; readers at their doors' centres, 1.2 over the floor). */
export const BUNKER_DEVICES: readonly BunkerDevice[] = [
  dev('CAM1', 'camera', 'B6', 35, 16, 2.8, 270),
  dev('CAM2', 'cameraSweep', 'B6', 33.5, 16.8, 2.8, 270, { sweep: [deg(225), deg(315)] }),
  dev('CAM3', 'camera', 'B6', 19, 17, 2.8, 180),
  dev('CAM4', 'cameraSweep', 'B6', 27, 24, 3.4, 180, { sweep: [deg(135), deg(225)] }),
  dev('SD', 'desk', 'B6', 27, 30.2, M6.mezzanine, 180),
  dev('PN', 'panel', 'B6', 33, 31, 4.9, 270),
  dev('FLT', 'fault', 'B6', 32, 3, 1.2, 0),
  dev('PC', 'pc', 'B6', 28, 8.6, M6.desk, 180),
  dev('WB', 'whiteboard', 'B6', 31, 17.3, 1.5, 0),
  dev('RD1', 'reader', 'B6', 25, 15.25, 1.2, 0, { level: 1, door: 'B6-rd1' }),
  dev('RD2', 'reader', 'B6', 22, 16.85, 1.2, 180, { level: 2, door: 'B6-rd2' }),
  dev('RD3', 'reader', 'B6', 20, 10.25, 1.2, 0, { level: 3, door: 'B6-rd3' }),
  dev('RD4', 'reader', 'B6', 16.25, 8, 1.2, 90, { level: 4, door: 'B6-rd4' }),
  dev('IR1', 'iris', 'B6', 17, 9, 1.6, 270),
  dev('B6-BH', 'beam', 'B6', 4.2, 9, 1.4, 90, { to: plantAt2('B6', 5.8, 9, 1.4) }),
  dev('B6-BL', 'beam', 'B6', 4.2, 7.8, 0.35, 90, { to: plantAt2('B6', 5.8, 7.8, 0.35) }),
  dev('PIR1', 'pir', 'B6', 5, 15, 3.2, 180),
  dev('KP', 'keypad', 'B6', 4.25, 2.0, 1.2, 90, { door: 'B6-exit' }),
  dev('A6-MED', 'medkit', 'A6', 0.3, 4.5, 1.2, 90),
];

/** What the plant builder hands back to the map. */
export interface Plant2Result {
  doors: Record<string, number>;
  devices: Record<string, CourseDevice>;
  anchors: Record<string, number>;
  hideSpots: P3[];
  switches: { pos: P3; yaw: number; group: number }[];
  debug: { id: string; label: string; pos: P3; yaw: number }[];
  /** The S6 stair as laid out (tests: it fits, its foot and head). */
  s6: StairLayout;
}

interface Frame {
  X: (x: number) => number;
  Z: (z: number) => number;
  Y: (y: number) => number;
}

function frame(bay: Plant2Bay): Frame {
  const o = PLANT2_OFFSET[bay];
  return { X: (x) => x + o[0], Z: (z) => z + o[1], Y: (y) => y + o[2] };
}

/** Overhead slab (no nav blocker, no lip) whose bottom is at y. */
export function roof(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number, t = ROOF_T): void {
  const from = b.boxes.length;
  b.box((x0 + x1) / 2, y + t / 2, (z0 + z1) / 2, x1 - x0, t, z1 - z0, C.roof);
  b.mark(from, { overhead: true, noLedge: true });
}

/** A deck slab (0.3) whose top is at y over a world rect. */
export function deck(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number, color: string): void {
  b.box((x0 + x1) / 2, y - 0.15, (z0 + z1) / 2, x1 - x0, 0.3, z1 - z0, color);
}

/** A guard rail 1.1 high along a world line (collides). */
export function rail(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number): void {
  if (Math.abs(x1 - x0) > Math.abs(z1 - z0)) b.box((x0 + x1) / 2, y + RAIL_H / 2, z0, Math.abs(x1 - x0), RAIL_H, 0.1, C.rail);
  else b.box(x0, y + RAIL_H / 2, (z0 + z1) / 2, 0.1, RAIL_H, Math.abs(z1 - z0), C.rail);
}

/** A wall along X (world z, x0..x1) with 1.2 door gaps starting at `doors` (world x, sorted) and their lintels. */
export function wallXDoors(b: LevelBuilder, z: number, x0: number, x1: number, doors: readonly number[], y: number, h: number, color: string, thick = PART): void {
  wallXAt(b, z, x0, x1, doors.map((d) => [d, d + DOOR_W] as const), y, h, color, thick);
  for (const d of doors) b.box(d + DOOR_W / 2, y + (DOOR_H + h) / 2, z, DOOR_W, h - DOOR_H, thick, color);
}

/** A wall along Z (world x, z0..z1) with 1.2 door gaps starting at `doors` (world z, sorted) and their lintels. */
export function wallZDoors(b: LevelBuilder, x: number, z0: number, z1: number, doors: readonly number[], y: number, h: number, color: string, thick = PART): void {
  wallZAt(b, x, z0, z1, doors.map((d) => [d, d + DOOR_W] as const), y, h, color, thick);
  for (const d of doors) b.box(x, y + (DOOR_H + h) / 2, d + DOOR_W / 2, thick, h - DOOR_H, DOOR_W, color);
}

/** A fixed glazed screen (collides, no window anchor) along a world line from y, h tall. */
export function glass(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number, h: number): void {
  if (Math.abs(x1 - x0) > Math.abs(z1 - z0)) b.box((x0 + x1) / 2, y + h / 2, z0, Math.abs(x1 - x0), h, 0.1, C.glass);
  else b.box(x0, y + h / 2, (z0 + z1) / 2, 0.1, h, Math.abs(z1 - z0), C.glass);
}

// ---------------------------------------------------------------------------------------------------- B5 Standby Plant

function buildB5(b: LevelBuilder, lips: number[], r: Plant2Result): void {
  const { X, Z, Y } = frame('B5');
  const H = M5.clear;
  const [tx0, tz0, tx1, tz1] = M5.trench;
  const hole: [number, number, number, number] = [X(tx0), Z(tz0), X(tx1), Z(tz1)];
  slabWithHoles(b, X(-0.225), Z(-0.225), X(48.225), Z(32.225), Y(0), [hole], C.floor);
  // outer walls: west (shared with A5: the A5 near door, the mains gate, z 15.4..16.6), south, east, north (A4)
  wallZDoors(b, X(0), Z(-0.225), Z(32.225), [Z(15.4)], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(0), X(-0.225), X(48.225), [], Y(0), H, C.wall, OUTER);
  wallZAt(b, X(48), Z(-0.225), Z(32.225), [], Y(0), H, C.wall, OUTER);
  // north wall (z 24 world): A4 builds its own 6.9 m stretch (y 10.4..13.4, the far door); B5 fills below and above it
  wallXAt(b, Z(32), X(-0.225), X(48.225), [[X(26.55), X(33.45)]], Y(0), H, C.wall, OUTER);
  b.box(X(30), Y(M5.landing / 2), Z(32), 6.9, M5.landing, OUTER, C.wall);
  const above = M5.landing + AIR_CLEAR;
  b.box(X(30), Y((above + H) / 2), Z(32), 6.9, H - above, OUTER, C.wall);
  roof(b, X(-0.225), Z(-0.225), X(48.225), Z(32.225), Y(H));

  // entry landing (x 27..33, z 30..32, 4.4) at A4's far door: a full-height mesh screen on its west end (no link to
  // the gallery), rails on the south and east edges, its stair down south (x 31.4..33) to the floor (A36)
  b.block(X(30), Z(30.89), 6, M5.landing, 1.78, C.grate, Y(0));
  b.surface('grate', X(27), X(33), Z(30), Z(31.775), Y(M5.landing));
  b.box(X(27), Y((M5.landing + H) / 2), Z(30.89), 0.1, H - M5.landing, 1.78, C.mesh);
  rail(b, X(27), Z(30), X(31.4), Z(30), Y(M5.landing));
  rail(b, X(33), Z(30), X(33), Z(31.775), Y(M5.landing));
  const sLen = M5.stairRisers * M5.going;
  b.stairs(X(32.2), Z(30 - sLen / 2), 1.6, sLen, M5.landing, M5.stairRisers, C.grate, 0, Y(0));
  b.block(X(32.2), Z(30 - sLen / 4), 1.6, M5.landing / 2, sLen / 2, C.conc, Y(0));

  // GEN-1..3 (3.0 high, full cover): their roofs are the planned lips; exhausts visual only
  for (const [x0, x1] of GENSETS) {
    lips.push(b.boxes.length);
    b.block(X((x0 + x1) / 2), Z(16.25), x1 - x0, M5.genset, 2.5, C.gen, Y(0));
    b.cylinders.push({ c: [X(x1 - 1), Y((M5.genset + H) / 2), Z(16.6)], r: 0.2, h: H - M5.genset, color: C.steel, collide: false });
  }

  // the grating walkway (z 20..22, loud) over the cable trench (1.5 deep x 1.2 wide, floor y 4.5): the grating covers
  // the trench but for the two lift-out panel openings (x 3.4..4.6, 43.4..44.6); a plant ladder out at each
  b.surface('grate', X(2), X(46), Z(20), Z(22), Y(0));
  b.box(X((tx0 + 1.2 + tx1 - 1.2) / 2), Y(-0.05), Z((tz0 + tz1) / 2), tx1 - tx0 - 2.4, 0.1, tz1 - tz0, C.grate);
  r.anchors['B5-trench-w'] = b.ladder(X(3.5), Z(21), Y(-M5.trenchDepth), Y(0), -Math.PI / 2).id;
  r.anchors['B5-trench-e'] = b.ladder(X(44.5), Z(21), Y(-M5.trenchDepth), Y(0), Math.PI / 2).id;
  for (const px of M5.panels) r.hideSpots.push(plantAt2('B5', px, 21, -M5.trenchDepth));

  // the cable gallery (y 3.5, x 2..24, z 30.5..32; A36: it ends short of the landing) with its ladder at the east end,
  // a rail on its front, and the planned hang-drop off its west end (a manual hang-only ledge, A25)
  deck(b, X(2), Z(30.5), X(24), Z(31.775), Y(M5.gallery), C.grate);
  b.surface('grate', X(2), X(24), Z(30.5), Z(31.775), Y(M5.gallery));
  for (const px of [6, 12, 18]) b.box(X(px), Y(M5.gallery / 2), Z(30.6), 0.1, M5.gallery - 0.3, 0.1, C.steel, 0, 0, false);
  rail(b, X(2.4), Z(30.5), X(22.9), Z(30.5), Y(M5.gallery));
  rail(b, X(24), Z(30.5), X(24), Z(31.775), Y(M5.gallery));
  r.anchors['B5-gallery-ladder'] = b.ladder(X(23.3), Z(30.45), Y(0), Y(M5.gallery), 0).id;
  r.anchors['B5-hang-drop'] = b.ledge(X(2), Z(31.725), X(2), Z(30.55), Y(M5.gallery), { canHang: true, canClimbUp: false }).id;
  r.hideSpots.push(plantAt2('B5', 1, 31));

  // SR: the switch room (x 38..48, z 24..32), glazed west wall, door in the south wall at x 43.4, roofed at 3.2; a
  // second plain door at the north end of the glazed wall (z 28.6) lets the breaker out into the dark pocket behind
  // the landing stair (x 33..38): both open onto the same hall floor, no gate between them
  glass(b, X(38), Z(24), X(38), Z(28.6), Y(0), 3.2);
  glass(b, X(38), Z(28.6), X(38), Z(28.6 + DOOR_W), Y(DOOR_H), 3.2 - DOOR_H);
  glass(b, X(38), Z(28.6 + DOOR_W), X(38), Z(31.775), Y(0), 3.2);
  r.anchors['B5-SR-west'] = b.door(X(38), Y(0), Z(28.6), DOOR_W, 0, { swing: -1 }).id;
  wallXDoors(b, Z(24), X(38), X(47.775), [X(43.4)], Y(0), 3.2, C.wall);
  roof(b, X(37.95), Z(23.85), X(47.775), Z(31.775), Y(3.2));
  b.box(X(47.7), Y(1.4), Z(28), 0.12, 0.9, 1.6, C.steel, 0, 0, false);
  r.switches.push({ pos: plantAt2('B5', 47.5, 28, 1.2), yaw: -Math.PI / 2, group: B5_GROUPS.mains });

  // FB: the fuel bay (x 38..48, z 0..8), the day tank 4 x 2 x 2.4, door at x 40.4 in its north wall
  wallXDoors(b, Z(8), X(38), X(47.775), [X(40.4)], Y(0), 3.2, C.wall);
  wallZAt(b, X(38), Z(0.225), Z(8.15), [], Y(0), 3.2, C.wall, PART);
  b.block(X(44), Z(3), 4, 2.4, 2, C.tank, Y(0));
  r.hideSpots.push(plantAt2('B5', 44, 1.2));

  // the monitoring desk (x 4..8, z 4..7) facing east
  b.block(X(7.2), Z(5.5), 0.8, M6.desk, 3, C.wood, Y(0));

  r.debug.push(
    { id: 'B5', label: 'B5 Standby Plant (entry landing)', pos: plantAt2('B5', 30, 31, M5.landing), yaw: Math.PI },
    { id: 'B5-SR', label: 'B5 switch room (MB)', pos: plantAt2('B5', 46, 28), yaw: Math.PI / 2 },
  );
}

// ---------------------------------------------------------------------------------------------------- A5, A6

/** A5: 6 x 6 x 3.0 between B5 (east, near door) and B6 (west, far door); both doors in the bays' walls. */
function buildA5(b: LevelBuilder, r: Plant2Result): void {
  const { X, Z, Y } = frame('A5');
  b.floor(X(3), Z(3), 6, 6 + 2 * OUTER, C.floor, Y(0));
  wallXAt(b, Z(0), X(0.225), X(5.775), [], Y(0), AIR_CLEAR, C.wall, OUTER);
  wallXAt(b, Z(6), X(0.225), X(5.775), [], Y(0), AIR_CLEAR, C.wall, OUTER);
  roof(b, X(-0.225), Z(-OUTER), X(6.225), Z(6 + OUTER), Y(AIR_CLEAR));
  b.block(X(3), Z(0.4), 3, 0.45, 0.45, C.wood, Y(0));
  b.box(X(0.24), Y(1.5), Z(3) + 1.1, 0.04, 0.6, 0.6, C.glass, 0, 0, false);
  r.doors['A5-near'] = b.door(X(6), Y(0), Z(2.4), DOOR_W, 0, { locked: true, swing: 1 }).id;
  r.doors['A5-far'] = b.door(X(0), Y(0), Z(2.4), DOOR_W, 0, { locked: true, swing: -1 }).id;
  r.devices.A5 = { x: X(3), y: Y(0), z: Z(5.6), yaw: Math.PI };
  r.debug.push({ id: 'A5', label: 'A5 airlock', pos: plantAt2('A5', 3, 3), yaw: -Math.PI / 2 });

  // A5's service passage (x 64.225..69.775, z 11.225..14 world), off B6's reception: the plant platform (feet 2.2)
  // under the supply duct's entry grate, its plant ladder; roofed at 4.8 (head room over the platform)
  const P = { x0: 64.225, x1: 69.775, z0: 11.225, z1: 14 };
  b.floor((P.x0 + P.x1) / 2, (P.z0 + P.z1) / 2, P.x1 - P.x0, P.z1 - P.z0, C.floor, Y(0));
  wallXAt(b, P.z1 + PART / 2, P.x0 - 0.225, P.x1 + 0.225, [], Y(0), 4.8, C.wall, PART);
  roof(b, P.x0 - 0.225, P.z0 - 0.225, P.x1 + 0.225, P.z1 + PART, Y(4.8));
  b.block((P.x0 + 65.6) / 2, (P.z0 + 12.5) / 2, 65.6 - P.x0, M6.platform, 12.5 - P.z0, C.steel, Y(0));
  r.anchors['A5-platform-ladder'] = b.ladder(65.65, 11.85, Y(0), Y(M6.platform), -Math.PI / 2).id;
}

/** A6: 6 x 6 x 3.0 at the S6 foot (east, near door) with the B7 north wall's far door (south); wall medkit. */
function buildA6(b: LevelBuilder, r: Plant2Result): void {
  const { X, Z, Y } = frame('A6');
  wallZAt(b, X(-OUTER / 2), Z(-OUTER), Z(6 + OUTER), [], Y(0), AIR_CLEAR, C.wall, OUTER);
  wallXAt(b, Z(6 + OUTER / 2), X(-OUTER), X(6 + OUTER), [], Y(0), AIR_CLEAR, C.wall, OUTER);
  // east wall (S6's west end): the near door at local z 2.9..4.1 (world -7.1..-5.9)
  wallZDoors(b, X(6), Z(-OUTER), Z(6 + OUTER), [Z(2.9)], Y(0), AIR_CLEAR, C.wall, OUTER);
  // south wall (part of B7's north wall): the far door at x 2.4..3.6 with its vision panel
  wallXDoors(b, Z(0), X(-OUTER), X(6 + OUTER), [X(2.4)], Y(0), AIR_CLEAR, C.wall, OUTER);
  b.box(X(3.6) + 0.9, Y(1.5), Z(0) + 0.24, 0.6, 0.6, 0.04, C.glass, 0, 0, false);
  b.block(X(0.4), Z(1.5), 0.45, 0.45, 2.4, C.wood, Y(0));
  b.box(X(0.25), Y(1.2), Z(4.5), 0.06, 0.4, 0.5, '#a33a30', 0, 0, false);
  r.doors['A6-near'] = b.door(X(6), Y(0), Z(2.9), DOOR_W, 0, { locked: true, swing: 1 }).id;
  r.doors['A6-far'] = b.door(X(2.4), Y(0), Z(0), DOOR_W, Math.PI / 2, { locked: true, swing: -1 }).id;
  r.devices.A6 = { x: X(3), y: Y(0), z: Z(5.6), yaw: Math.PI };
  r.debug.push({ id: 'A6', label: 'A6 airlock (medkit)', pos: plantAt2('A6', 3, 3), yaw: Math.PI });
}

// ---------------------------------------------------------------------------------------------------- B6 Mock Site

function buildB6(b: LevelBuilder, r: Plant2Result): void {
  const { X, Z, Y } = frame('B6');
  const H = M6.clear;
  const R = M6.room;
  b.floor(X(21), Z(16), 42.45, 32.45, C.vinyl, Y(0));
  // outer walls: west (S6 top door z 0.9), east (A5 far door z 15.4, the service passage door z 20.6), north, south
  wallZDoors(b, X(0), Z(-0.225), Z(32.225), [Z(0.9)], Y(0), H, C.wall, OUTER);
  wallZDoors(b, X(42), Z(-0.225), Z(32.225), [Z(15.4), Z(20.6)], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(0), X(0.225), X(41.775), [], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(32), X(0.225), X(41.775), [], Y(0), H, C.wall, OUTER);
  roof(b, X(-0.225), Z(-0.225), X(42.225), Z(32.225), Y(H));

  // the ceilings (the void floor at 3.5; the office is open to the roof under CR); the records grille's hole at (28, 8)
  const ceil = (x0: number, z0: number, x1: number, z1: number, holes: [number, number, number, number][] = []): void => {
    const from = b.boxes.length;
    slabWithHoles(b, X(x0), Z(z0), X(x1), Z(z1), Y(M6.ceiling), holes, C.roof);
    b.mark(from, { overhead: true, noLedge: true });
  };
  ceil(0.225, 0.225, 34, 17, [[X(27.4), Z(7.4), X(28.6), Z(8.6)]]);
  ceil(34, 0.225, 41.775, 22);
  ceil(0.225, 17, 14, 31.775);
  ceil(14, 26, 19.85, 31.775);

  // CO north wall (z 17, 7 high: the office side is double height): LK door, office doors, RD2 (the CR stair)
  wallXDoors(b, Z(17), X(4), X(34), [X(8.4), X(16.4), X(20.4), X(28.4)], Y(0), H, C.wall);
  // CO south wall (z 15): SV, the mantrap vestibule (x 16..22, open), RE with RD1 at x 23.4
  wallXAt(b, Z(15), X(6), X(16), [], Y(0), R, C.wall);
  wallXDoors(b, Z(15), X(22), X(34), [X(23.4)], Y(0), R, C.wall);
  // x 4: the L leg's and LK's west wall, the exit door (keypad) at z 0.4..1.6 from SV's nook to the S6 lobby
  wallZDoors(b, X(4), Z(0.225), Z(31.775), [Z(0.4)], Y(0), R, C.wall);
  // the S6 lobby (x 0..4, z 0..2.6)
  wallXAt(b, Z(2.6), X(0.225), X(4), [], Y(0), R, C.wall);
  // the L leg (x 4..6, z 2..15): its east wall (SV's west) and its end (SV's nook below it)
  wallZAt(b, X(6), Z(2), Z(15), [], Y(0), R, C.wall);
  wallXAt(b, Z(2), X(4), X(6), [], Y(0), R, C.wall);
  // SV's east wall / the mantrap's west wall (x 16) with RD4; the mantrap (x 16..22, z 4..10), RD3 in its north wall
  wallZDoors(b, X(16), Z(0.225), Z(15), [Z(6.4)], Y(0), R, C.wall);
  wallXDoors(b, Z(10), X(16), X(22), [X(18.4)], Y(0), R, C.wall);
  wallXAt(b, Z(4), X(16), X(22), [], Y(0), R, C.wall);
  // RE's west wall (x 22)
  wallZAt(b, X(22), Z(0.225), Z(15), [], Y(0), R, C.wall);
  // x 34 (7 high): RE / RC and the office / CR east side; the RC inner door at z 15.4 (plain)
  wallZDoors(b, X(34), Z(0.225), Z(31.775), [Z(15.4)], Y(0), H, C.wall);
  wallXAt(b, Z(10), X(34), X(41.775), [], Y(0), R, C.wall);
  wallXAt(b, Z(22), X(34), X(41.775), [], Y(0), R, C.wall);
  // LK's east wall (x 14, 7 high); the manager's office (x 14..19.85, z 26..32): glazed front with its door (pin)
  wallZAt(b, X(14), Z(17), Z(31.775), [], Y(0), H, C.wall);
  glass(b, X(14.15), Z(26), X(17.4), Z(26), Y(0), R);
  glass(b, X(18.6), Z(26), X(19.7), Z(26), Y(0), R);
  b.box(X(18), Y((DOOR_H + R) / 2), Z(26), DOOR_W, R - DOOR_H, 0.1, C.glass);
  // the CR stair enclosure (x 19.85 / 22.15: 2.0 clear, not a split) to the mezzanine; x 19.85 runs on as CR's west
  wallZAt(b, X(19.85), Z(17.15), Z(31.775), [], Y(0), H, C.wall);
  wallZAt(b, X(22.15), Z(17.15), Z(24), [], Y(0), H, C.wall);
  const stLen = 5.8;
  b.stairs(X(21), Z(24 - stLen / 2), 1.7, stLen, M6.mezzanine, 20, C.vinyl, 0, Y(0));
  // CR: the mezzanine deck (x 20..34, z 24..32, 3.6) with its glazed south front to the roof
  deck(b, X(20), Z(24), X(33.85), Z(31.775), Y(M6.mezzanine), C.vinyl);
  glass(b, X(22.15), Z(24), X(33.85), Z(24), Y(M6.mezzanine), H - M6.mezzanine);
  b.block(X(27), Z(30.9), 2.4, 0.75, 0.8, C.wood, Y(M6.mezzanine));
  b.box(X(33.7), Y(4.9), Z(31), 0.12, 0.8, 1.0, C.steel, 0, 0, false);

  // RC: the counter (1.1, low cover)
  b.block(X(37), Z(16), 0.6, 1.1, 8, C.wood, Y(0));
  // the office: desk pods with 1.5 partitions, the whiteboard on CO's north wall (office side)
  b.surface('carpet', X(14), X(34), Z(17), Z(32), Y(0));
  for (const px of [25, 31]) {
    b.block(X(px), Z(21), 4, 1.5, 0.1, C.office, Y(0));
    b.block(X(px), Z(21), 0.1, 1.5, 3, C.office, Y(0));
    b.block(X(px - 1), Z(20.2), 1.6, M6.desk, 0.8, C.wood, Y(0));
    b.block(X(px + 1), Z(21.8), 1.6, M6.desk, 0.8, C.wood, Y(0));
  }
  b.box(X(31), Y(1.6), Z(17.2), 2.4, 1.2, 0.04, '#d8dcdf', 0, 0, false);
  // LK: lockers along the west wall (2.0 high); locker 7 holds card A
  for (let i = 0; i < 12; i++) b.block(X(4.45), Z(24.3 + i * 0.6), 0.5, 2.0, 0.58, C.locker, Y(0));
  const locker7 = 24.3 + 6 * 0.6;
  r.devices['pk-card-a'] = { x: X(5.0), y: Y(0), z: Z(locker7), yaw: Math.PI / 2, label: 'Take card A' };
  r.hideSpots.push(plantAt2('B6', 5.0, 25.5), plantAt2('B6', 5.0, 30.3));
  // RE: the records desk under the grille (2.65 drop onto it) and the PC, the CRAC unit
  b.block(X(28), Z(8), 1.6, M6.desk, 0.8, C.wood, Y(0));
  b.block(X(32), Z(3), 1.6, 1.9, 0.9, C.steel, Y(0));
  r.devices['sw-rd1-rex'] = { x: X(25.2), y: Y(0), z: Z(14.6), yaw: Math.PI, label: 'Exit' };
  // SV: rack rows (2.2, full cover) x 7.5..13.5 at z 4 and z 10; the rack ends are hide spots
  for (const rz of [4, 10]) b.block(X(10.5), Z(rz), 6, 2.2, 0.6, C.rack, Y(0));
  r.hideSpots.push(plantAt2('B6', 14.1, 4), plantAt2('B6', 14.1, 10));
  r.devices['sw-mt-egress'] = { x: X(15.6), y: Y(0), z: Z(8.4), yaw: -Math.PI / 2, label: 'Egress' };
  // the exit keypad (three numbered buttons; the right one is lit on CAM4's whiteboard), on the nook's north wall
  for (let k = 1; k <= 3; k++) r.devices[`sw-key-${k}`] = { x: X(4.0 + 0.5 * k), y: Y(0), z: Z(1.6), yaw: Math.PI, label: `Key ${k}` };
  // the guards' cards (now: pickups at their posts; T7a hands them to B6-GR and B6-GM)
  r.devices['pk-card-b'] = { x: X(24), y: Y(0), z: Z(16.4), yaw: Math.PI, label: 'Take card B' };
  r.devices['pk-card-m'] = { x: X(19), y: Y(0), z: Z(13.6), yaw: -Math.PI / 2, label: 'Take card M' };

  // doors: the readers (locked; course flag gates), the exit (keypad), S6's top (one-way), the manager's (pin), plain
  r.doors['B6-rd1'] = b.door(X(23.4), Y(0), Z(15), DOOR_W, Math.PI / 2, { locked: true }).id;
  r.doors['B6-rd2'] = b.door(X(20.4), Y(0), Z(17), DOOR_W, Math.PI / 2, { locked: true }).id;
  r.doors['B6-rd3'] = b.door(X(18.4), Y(0), Z(10), DOOR_W, Math.PI / 2, { locked: true }).id;
  r.doors['B6-rd4'] = b.door(X(16), Y(0), Z(6.4), DOOR_W, 0, { locked: true }).id;
  r.doors['B6-exit'] = b.door(X(4), Y(0), Z(0.4), DOOR_W, 0, { locked: true }).id;
  r.doors['S6-top'] = b.door(X(0), Y(0), Z(0.9), DOOR_W, 0, { locked: true }).id;
  r.doors['B6-mgr'] = b.door(X(17.4), Y(0), Z(26), DOOR_W, Math.PI / 2, { locked: true }).id;
  for (const [x, z, yaw] of [[8.4, 17, Math.PI / 2], [16.4, 17, Math.PI / 2], [28.4, 17, Math.PI / 2], [34, 15.4, 0], [42, 20.6, 0]] as const) b.door(X(x), Y(0), Z(z), DOOR_W, yaw);

  // the supply duct: from the service passage's grate (B6's east wall face, 1.35 over the platform's feet) west in
  // the ceiling void, along z 16, then south to the records grille (a ceiling exit: the vent drop, SPEC E6)
  const fy = Y(M6.ceiling);
  const path: P3[] = [
    { x: 64.225, y: fy, z: 11.85 },
    { x: X(40), y: fy, z: 11.85 },
    { x: X(40), y: fy, z: Z(16) },
    { x: X(28), y: fy, z: Z(16) },
    { x: X(28), y: fy, z: Z(8) },
  ];
  b.box(64.25, fy + 0.5, 11.85, 0.04, 1.0, 1.2, C.grate, 0, 0, false);
  b.box(X(28), fy - 0.02, Z(8), 1.2, 0.04, 1.2, C.grate, 0, 0, false);
  r.anchors['B6-duct'] = b.duct(
    path,
    { pos: { x: 64.225, y: fy + 0.05, z: 11.85 }, nx: 1, ny: 0, nz: 0, where: 'wall' },
    { pos: { x: X(28), y: fy, z: Z(8) }, nx: 0, ny: -1, nz: 0, where: 'ceiling' },
  ).id;

  // camera fixtures (visual)
  for (const d of BUNKER_DEVICES) if (d.kind === 'camera' || d.kind === 'cameraSweep') b.box(d.pos.x, d.pos.y, d.pos.z, 0.18, 0.14, 0.3, C.cam, d.yaw, 0, false);

  r.debug.push(
    { id: 'B6', label: 'B6 Mock Site (reception)', pos: plantAt2('B6', 39, 16), yaw: -Math.PI / 2 },
    { id: 'B6-CR', label: 'B6 control room (mezzanine)', pos: plantAt2('B6', 27, 28, M6.mezzanine), yaw: Math.PI },
  );
}

// ---------------------------------------------------------------------------------------------------- S6 Stair 6

/** The S6 stair in world plan: x 7.735..19.975 (stairLayout: run 33 x 0.28 plus the 3.0 mid landing), z -8..-5, rising east. */
export const S6_RECT: [number, number, number, number] = [22 - 0.225 - S6_METRICS.topLanding - S6_METRICS.risers * S6_METRICS.going - S6_METRICS.width, -8, 22 - 0.225 - S6_METRICS.topLanding, -5];

function buildS6(b: LevelBuilder, r: Plant2Result): void {
  const { X, Y } = frame('S6');
  const lay = stairLayout(
    { levels: [{ id: 'A6', floor: 0 }, { id: 'B6', floor: S6_METRICS.rise }], walls: [], openings: [] },
    { from: 'A6', to: 'B6', rect: S6_RECT, up: 'E', width: S6_METRICS.width, risers: S6_METRICS.risers, flights: 2 },
  );
  r.s6 = lay;
  wallXAt(b, -5 + PART / 2, X(0.225), X(16 - 0.225), [], Y(0), 9, C.wall, PART);
  wallXAt(b, -8 - PART / 2, X(0.225), X(16 - 0.225), [], Y(0), 9, C.wall, PART);
  roof(b, X(0), -8.3, X(16), -4.7, 9);
  for (const f of lay.flights) {
    b.stairs(f.c[0], f.c[1], f.w, f.len, f.rise, f.steps, C.conc, f.yaw, f.y);
    // handrails (visual) both sides, 0.9 over the nosings
    const pitch = -Math.atan2(f.rise, f.len);
    for (const s of [-1, 1]) b.box(f.c[0], f.y + f.rise / 2 + 0.9, f.c[1] + s * (f.w / 2 - 0.05), 0.05, 0.05, hyp2(f.len, f.rise), C.rail, f.yaw, pitch, false);
  }
  for (const l of lay.landings) b.block((l.rect[0] + l.rect[2]) / 2, (l.rect[1] + l.rect[3]) / 2, l.rect[2] - l.rect[0], l.top, l.rect[3] - l.rect[1], C.conc, 0);
  // under flight 2 (solid to the mid landing's height) and the top landing (x 20.2..21.775) at y 6
  const f2 = lay.flights[1]!;
  b.block(f2.c[0], f2.c[1], f2.len, f2.y, f2.w, C.conc, 0);
  b.block((S6_RECT[2] + 21.775) / 2, -6.5, 21.775 - S6_RECT[2], S6_METRICS.rise, 3, C.conc, 0);
  r.debug.push({ id: 'S6', label: 'S6 Stair 6 (top landing)', pos: { x: 21, y: S6_METRICS.rise, z: -6.5 }, yaw: -Math.PI / 2 });
}

/**
 * The pieces the 'epic' detail pass dresses as floor (under y 6: the trench floor, S6's and A6's floors, A6's roof),
 * built after every other piece of the map (bunker.ts) so 'ultra' and 'epic' draw the same wall-dressing stream.
 */
export function buildPlantFloors(b: LevelBuilder): void {
  const from = b.boxes.length;
  const t = frame('B5');
  const [tx0, tz0, tx1, tz1] = M5.trench;
  pit(b, [t.X(tx0), t.Z(tz0), t.X(tx1), t.Z(tz1)], t.Y(0), M5.trenchDepth, C.conc);
  b.floor((6.225 + 21.775) / 2, -6.5, 21.775 - 6.225, 3.3, C.floor, 0);
  const { X, Z, Y } = frame('A6');
  b.floor(X(3), Z(3), 6 + 2 * OUTER, 6 + 2 * OUTER, C.floor, Y(0));
  roof(b, X(-OUTER), Z(-OUTER), X(6 + OUTER), Z(6 + OUTER), Y(AIR_CLEAR));
  b.mark(from, { noLedge: true });
}

/**
 * Build B5, A5 (and its service passage), B6, S6 and A6 into `b` (their floor-dressed pieces last: `buildPlantFloors`). Afterwards every piece but the genset roofs is
 * `noLedge`. One work lamp per bay (T6 lights the bays); B5's is on the mains group (MB turns it off).
 */
export function buildPlant(b: LevelBuilder): Plant2Result {
  const r: Plant2Result = { doors: {}, devices: {}, anchors: {}, hideSpots: [], switches: [], debug: [], s6: { flights: [], landing: null, landings: [], foot: [0, 0], head: [0, 0] } };
  const from = b.boxes.length;
  const lips: number[] = [];
  buildB5(b, lips, r);
  buildA5(b, r);
  buildB6(b, r);
  buildS6(b, r);
  buildA6(b, r);
  const keep = new Set(lips);
  for (let k = from; k < b.boxes.length; k++) if (!keep.has(k)) b.boxes[k]!.noLedge = true;
  // the mains group's only lamp: never shot out or EMP'd (a dead lamp would read as mains off: the gate bypass)
  b.light({ ...plantAt2('B5', 24, 16, 7.5), radius: 30, intensity: 0.9, group: B5_GROUPS.mains, destructible: false, electric: false });
  b.light({ ...plantAt2('B6', 27, 21, 5.5), radius: 26, intensity: 0.9 });
  b.light({ x: 14, y: 4.5, z: -6.5, radius: 12, intensity: 0.7 });
  return r;
}
