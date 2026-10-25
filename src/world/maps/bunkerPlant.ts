import type { LevelBuilder } from '../levelBuilder';
import type { P3 } from '../anchors';
import type { CourseDevice, CourseObjective, ElementFlag } from '../../game/course/courseDef';
import { wallXAt, wallZAt } from './storey';
import { glass as screen, led, pit, slabWithHoles } from './bunkerUpper';
import { plantAt } from './bunkerShaft';
import { stairLayout, type StairLayout } from './stairs';
import { hyp2 } from '../../core/mathx';

/**
 * Fallow, the rest of the Plant level and the stair down, BAYS v2 (T5f; docs/archive/training/BAYS.md sections 0, B5, B6,
 * "S6 and A6"): B5 Standby Plant, airlock A5, B6 Mock Site, S6 Stair 6 and airlock A6 (Deep, y 0). Every coordinate
 * below is a BAYS local coordinate; `plantAt2` / the per-bay `X` / `Z` / `Y` add the bay's offset and floor.
 *
 * B5 is one guarded hall (E4 routes side by side): EL -> its stair -> the hall -> A5's mag-locked door (the mains gate).
 * EL is closed but for its stair (a 2.4 glass screen on its south edge, a full mesh screen on its west end).
 * B6 is one line: RC -> AH -> plant ladder -> supply duct -> vent drop into RE -> REX door -> CO, then the operator /
 * runner split (LK, RD2 stair, CR / L-leg, RD3, MT, RD4, SV), rejoining in SV -> exit keypad -> S6 -> A6. RC's inner
 * door is locked for good; every glazed wall is see-through collision (A26), never a way round.
 *
 * Ledges: every piece here is `noLedge`; the only lips are the manual ones in `B5_LIPS` (the genset roofs, the wall-jump
 * high route, and the gallery's hang-only west end). No window anchors anywhere.
 */

export type Plant2Bay = 'B5' | 'A5' | 'B6' | 'S6' | 'A6';

/** BAYS 0.1 offsets (x, z) and floor y. S6's frame is its plan rect's south-west corner (x 19, z -33) at y 0. */
export const PLANT2_OFFSET: Record<Plant2Bay, readonly [number, number, number]> = {
  B5: [48, -16, 6],
  A5: [42, -7, 6],
  B6: [12, -17, 6],
  S6: [19, -33, 0],
  A6: [17.5, -39, 0],
};

/** BAYS 0.1 boxes in world plan (R4 footprints). */
export const PLANT2_BOX: Record<Plant2Bay, readonly [number, number, number, number]> = {
  B5: [48, -16, 78, 8],
  A5: [42, -7, 48, -1],
  B6: [12, -17, 42, 7],
  S6: [19, -33, 22, -17],
  A6: [17.5, -39, 23.5, -33],
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
  /** Trench plan (local): x 1.4..25.6, z 12.8..14.0 under the grating; the lift-out panel openings at x 2 and x 25. */
  trench: [1.4, 12.8, 25.6, 14.0] as const,
  panels: [2, 25] as const,
  /** The landing stair: 24 risers down to the floor, south from the landing along x 26.4..28 (A36). */
  stairRisers: 24,
  going: 0.28,
  /** EL's south-edge screen (R2: no drop past the stair, A51). */
  screen: 2.4,
} as const;

/** B6 metrics. */
export const B6_METRICS = {
  /** One storey to the slab (BAYS 0.1: RC, AH, RE, CO, LK, MT, SV). */
  clear: 4.6,
  /** The office, the CR mezzanine and its enclosed stair share the full height (x 10..24, z 14..24). */
  tall: 6.4,
  /** RE's ceiling top (the void floor): the supply duct's floor. */
  ceiling: 3.4,
  mezzanine: 3.6,
  /** The AH plant platform under the duct mouth (feet 1.2 under the duct floor). */
  platform: 2.2,
  desk: 0.75,
} as const;

/** S6: 33 risers of 0.182, going 0.28, 3.0 wide (BAYS S6); the mid landing as deep as the stair is wide (stairs.ts). */
export const S6_METRICS = { risers: 33, going: 0.28, width: 3.0, rise: 6 } as const;

/** Light groups the course reads (T6 hangs HB1-HB6 and CG1-3 on the mains group; the work lamp is on it now). */
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
  vinyl: '#6d7276',
  locker: '#56606a',
  rack: '#2d3238',
  wood: '#7a5a3c',
  cam: '#202326',
  med: '#a33a30',
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

/** Genset plan x ranges (local), z 9..11.5. */
const GENSETS: readonly (readonly [number, number])[] = [[5, 9], [12, 16], [19, 23]];
const GEN_Z = [9, 11.5] as const;

/** Every planned lip on B5 / B6 / S6 (all manual): the genset roofs (four edges each) and the gallery hang-drop. */
export const B5_LIPS: readonly Plant2Lip[] = [
  ...GENSETS.map(([x0, x1], i) => lip('B5', `GEN${i + 1}`, x0, GEN_Z[0], x1, GEN_Z[1], M5.genset)),
  lip('B5', 'GAL-W', 2, 22.5, 2, 23.775, M5.gallery),
];

/** A device mount point (T7a reads these): kind, local (x, z, y over the bay floor), world position, facing. */
export interface BunkerDevice {
  id: string;
  kind: 'camera' | 'cameraSweep' | 'desk' | 'panel' | 'fault' | 'reader' | 'iris' | 'beam' | 'pir' | 'keypad' | 'pc' | 'whiteboard' | 'medkit';
  bay: Plant2Bay | 'A4';
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

/** Device mount points (BAYS B6 devices table; readers beside their doors on the approach side, 1.2 over the floor;
 *  the wall medkits in A4 and A6, BAYS 0.4). */
export const BUNKER_DEVICES: readonly BunkerDevice[] = [
  dev('CAM1', 'camera', 'B6', 29.5, 13, 2.8, 270),
  dev('CAM2', 'cameraSweep', 'B6', 23.5, 13.6, 2.8, 270, { sweep: [deg(225), deg(315)] }),
  dev('CAM3', 'camera', 'B6', 3, 11.6, 2.8, 180),
  dev('CAM4', 'cameraSweep', 'B6', 19, 18.8, 3.4, 180, { sweep: [deg(135), deg(225)] }),
  dev('SD', 'desk', 'B6', 19, 23, M6.mezzanine, 180),
  dev('PN', 'panel', 'B6', 23.7, 23.3, M6.mezzanine + 1.3, 270),
  dev('FLT', 'fault', 'B6', 22, 3, 1.2, 0),
  dev('PC', 'pc', 'B6', 15, 9, M6.desk, 180),
  dev('WB', 'whiteboard', 'B6', 17, 14.35, 1.5, 0),
  dev('RD1', 'reader', 'B6', 18.6, 12.25, 1.2, 0, { level: 1, door: 'B6-rd1' }),
  dev('RD2', 'reader', 'B6', 12, 13.75, 1.2, 180, { level: 2, door: 'B6-rd2' }),
  dev('RD3', 'reader', 'B6', 3.8, 4.25, 1.2, 0, { level: 3, door: 'B6-rd3' }),
  dev('RD4', 'reader', 'B6', 5.75, 0.8, 1.2, 270, { level: 4, door: 'B6-rd4' }),
  dev('IR1', 'iris', 'B6', 5.8, 3.2, 1.6, 270),
  dev('B6-BH', 'beam', 'B6', 2.2, 9, 1.4, 90, { to: plantAt2('B6', 3.8, 9, 1.4) }),
  dev('B6-BL', 'beam', 'B6', 2.2, 7.8, 0.35, 90, { to: plantAt2('B6', 3.8, 7.8, 0.35) }),
  dev('PIR1', 'pir', 'B6', 3, 12.8, 3.2, 180),
  dev('KP', 'keypad', 'B6', 10.3, 0.25, 1.2, 0, { door: 'B6-exit' }),
  { id: 'A4-MED', kind: 'medkit', bay: 'A4', local: [0.3, 4.5, 1.2], pos: plantAt('A4', 0.3, 4.5, 1.2), yaw: deg(90) },
  dev('A6-MED', 'medkit', 'A6', 0.3, 4.5, 1.2, 90),
];

/**
 * Guard relief doors (A62): a staff door in an outer wall of each guard's room, locked to players for good (visual
 * leaf only: no door anchor, no interact, no gap, never on the room graph). The relief spawns at `spawn` (outside the
 * bay's nav) and walks in while neither player can see the door (T7b). World positions; yaw = the leaf's facing into
 * the room.
 */
export const RELIEF_DOORS: readonly { id: string; bay: Plant2Bay; guards: string[]; pos: P3; yaw: number; spawn: P3 }[] = [
  { id: 'B5-relief', bay: 'B5', guards: ['B5-G1', 'B5-G2'], pos: plantAt2('B5', 13, 0), yaw: 0, spawn: plantAt2('B5', 13, -1.5) },
  { id: 'B6-relief-cr', bay: 'B6', guards: ['B6-GD'], pos: plantAt2('B6', 19, 24, M6.mezzanine), yaw: Math.PI, spawn: plantAt2('B6', 19, 25.5, M6.mezzanine) },
  { id: 'B6-relief-of', bay: 'B6', guards: ['B6-GR'], pos: plantAt2('B6', 22, 24), yaw: Math.PI, spawn: plantAt2('B6', 22, 25.5) },
  { id: 'B6-relief-co', bay: 'B6', guards: ['B6-GM'], pos: plantAt2('B6', 2, 13), yaw: Math.PI / 2, spawn: plantAt2('B6', -1.5, 13) },
];

/** BAYS v2 objective tables (R5, A47): the names T7a turns into drills (`DrillDef.name`), in the table order. */
const B5_OBJ = [
  'Thermal vision: find the hot gensets', 'Switch a light circuit off', 'Shoot out a lamp', 'EMP a lamp',
  'Lure a guard with a noisemaker', 'Take down a guard from behind', 'Pull the mains breaker',
  'Reach the fire door while the mains are off', 'Both on the airlock pad',
];
const B6_OBJ = [
  'Climb to the supply duct and crawl it', 'Drop through the ceiling grille into records',
  'Press the exit button to open the records door', 'Back to the wall: slide along the corridor wall',
  'Peek round the corner', 'Lean out and aim from the corner', 'SWAT turn across a doorway', 'Peek a door open a crack',
  "Electro vision: trace a card reader's wiring", 'Look under a door with the optic cable',
  'Trip the cooling fault to send a guard', 'Pick locker 7 for card A', 'Swipe card A at the control-room stair',
  'Take down the desk operator, or lure him off the desk', 'Loop the cameras at the alarm panel',
  'Turn the beams off at the alarm panel', 'Read the exit code on the office camera feed',
  'Take card B from the rounds officer', 'Grab the mantrap guard and walk him down the corridor',
  'Open the mantrap: card B, card M, his eye at the iris', 'Knock him out in the server room',
  'Press the egress button for your partner', 'Enter the exit code at the keypad', 'Both on the airlock pad',
];
export const PLANT2_OBJECTIVES: readonly CourseObjective[] = [
  ...B5_OBJ.map((text, i) => ({ id: `B5-${i + 1}`, bay: 'B5', text })),
  ...B6_OBJ.map((text, i) => ({ id: `B6-${i + 1}`, bay: 'B6', text })),
];

/** Elements whose behaviour is a stub until T6 / T7a / T7b: built as geometry or data, not final. */
export const PLANT2_ELEMENTS: Record<'B5' | 'B6', ElementFlag[]> = {
  B5: [
    { id: 'B5-circuits', feature: 'L1-L4 circuits, HB1-HB6 / CG1-3 lamps, EM and PIR fittings, the A61 re-lamp (T6 / T7a): one mains work lamp now', final: false },
    { id: 'B5-guards', feature: 'B5-G1 / B5-G2 posts, routes and relief through B5-relief (A62): T7b', final: false },
  ],
  B6: [
    { id: 'B6-security', feature: 'cameras, beams, PIR, iris, panel loop and fault trip are mount points only (S1-S3; now forms T7a)', final: false },
    { id: 'B6-guards', feature: 'B6-GD / GR / GM posts, routes, cards and relief doors (A62): T7b; cards are pickups now (A37)', final: false },
    { id: 'B6-s6-relock', feature: "S6's top door relocks after both pass (A37 gate kind): T7a", final: false },
  ],
};

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

/** A fixed glazed screen (visible, collides, no window anchor) along a world line from y, h tall (bunkerDeep's v1
 *  glazing; the v2 bays use bunkerUpper's A26 glass). */
export function glass(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number, h: number): void {
  if (Math.abs(x1 - x0) > Math.abs(z1 - z0)) b.box((x0 + x1) / 2, y + h / 2, z0, Math.abs(x1 - x0), h, 0.1, C.glass);
  else b.box(x0, y + h / 2, (z0 + z1) / 2, 0.1, h, Math.abs(z1 - z0), C.glass);
}

/** Local helpers for one bay: a solid box between two heights, an A26 glass screen, an LED strip. */
function kit(b: LevelBuilder, f: Frame) {
  const { X, Z, Y } = f;
  return {
    solid: (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, color: string = C.conc) =>
      b.box(X((x0 + x1) / 2), Y((y0 + y1) / 2), Z((z0 + z1) / 2), x1 - x0, y1 - y0, z1 - z0, color),
    gl: (x0: number, z0: number, x1: number, z1: number, y0: number, h: number) => screen(b, X(x0), Z(z0), X(x1), Z(z1), Y(y0), h),
    strip: (x0: number, z0: number, x1: number, z1: number, y: number) => led(b, X(x0), Z(z0), X(x1), Z(z1), Y(y)),
    /** A relief door's visual leaf on a wall face (no anchor). */
    leaf: (x: number, z: number, y: number, alongX: boolean) => b.box(X(x), Y(y + DOOR_H / 2), Z(z), alongX ? DOOR_W : 0.05, DOOR_H, alongX ? 0.05 : DOOR_W, C.steel, 0, 0, false),
  };
}

// ---------------------------------------------------------------------------------------------------- B5 Standby Plant

function buildB5(b: LevelBuilder, r: Plant2Result): void {
  const f = frame('B5');
  const { X, Z, Y } = f;
  const { solid, gl, strip, leaf } = kit(b, f);
  const H = M5.clear;
  const [tx0, tz0, tx1, tz1] = M5.trench;
  slabWithHoles(b, X(-0.225), Z(-0.225), X(30.225), Z(24.225), Y(0), [[X(tx0), Z(tz0), X(tx1), Z(tz1)]], C.floor);
  // outer walls: west (A5's near door, the mains gate, z 11.4..12.6), south, east; north (z 24): A4 builds its own
  // 6.9 m stretch at its floor (y 10.4..13.4, the far door), B5 fills below and above it
  wallZDoors(b, X(0), Z(-0.225), Z(24.225), [Z(11.4)], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(0), X(-0.225), X(30.225), [], Y(0), H, C.wall, OUTER);
  wallZAt(b, X(30), Z(-0.225), Z(24.225), [], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(24), X(-0.225), X(30.225), [[X(21.55), X(28.45)]], Y(0), H, C.wall, OUTER);
  b.box(X(25), Y(M5.landing / 2), Z(24), 6.9, M5.landing, OUTER, C.wall);
  const above = M5.landing + AIR_CLEAR;
  b.box(X(25), Y((above + H) / 2), Z(24), 6.9, H - above, OUTER, C.wall);
  roof(b, X(-0.225), Z(-0.225), X(30.225), Z(24.225), Y(H));

  // EL (x 22..30, z 21..24, 4.4) at A4's far door: a full-height mesh screen on its west end (no link to the gallery),
  // a 2.4 glass screen on its south edge but for the stair head (x 26.4..28, R2: EL's only way down is its stair)
  solid(22, 21, 29.775, 23.775, 0, M5.landing, C.grate);
  b.surface('grate', X(22), X(29.775), Z(21), Z(23.775), Y(M5.landing));
  b.box(X(22), Y((M5.landing + H) / 2), Z(22.39), 0.1, H - M5.landing, 2.775, C.mesh);
  gl(22, 21, 26.4, 21, M5.landing, M5.screen);
  gl(28, 21, 29.775, 21, M5.landing, M5.screen);
  const sLen = M5.stairRisers * M5.going;
  b.stairs(X(27.2), Z(21 - sLen / 2), 1.6, sLen, M5.landing, M5.stairRisers, C.grate, 0, Y(0));
  b.block(X(27.2), Z(21 - sLen / 4), 1.6, M5.landing / 2, sLen / 2, C.conc, Y(0));
  for (let k = 0; k < M5.stairRisers; k += 4) strip(26.45, 21 - sLen + k * M5.going + 0.05, 27.95, 21 - sLen + k * M5.going + 0.05, ((k + 1) * M5.landing) / M5.stairRisers + 0.02);
  strip(22, 21.02, 29.7, 21.02, M5.landing - 0.05);

  // GEN-1..3 (3.0 high, full cover): their roofs are the planned lips (four manual edges each); exhausts visual only
  for (const [x0, x1] of GENSETS) {
    b.block(X((x0 + x1) / 2), Z((GEN_Z[0] + GEN_Z[1]) / 2), x1 - x0, M5.genset, GEN_Z[1] - GEN_Z[0], C.gen, Y(0));
    const o = { drop: M5.genset, canHang: true, canClimbUp: true };
    b.ledge(X(x0), Z(GEN_Z[0]), X(x1), Z(GEN_Z[0]), Y(M5.genset), o);
    b.ledge(X(x1), Z(GEN_Z[1]), X(x0), Z(GEN_Z[1]), Y(M5.genset), o);
    b.ledge(X(x1), Z(GEN_Z[0]), X(x1), Z(GEN_Z[1]), Y(M5.genset), o);
    b.ledge(X(x0), Z(GEN_Z[1]), X(x0), Z(GEN_Z[0]), Y(M5.genset), o);
    b.cylinders.push({ c: [X(x1 - 1), Y((M5.genset + H) / 2), Z(10.6)], r: 0.2, h: H - M5.genset, color: C.steel, collide: false });
  }

  // the grating (loud) over the cable trench (1.5 deep x 1.2 wide, floor y 4.5): it covers the trench but for the two
  // lift-out panel openings at its ends (x 1.4..2.6, 24.4..25.6); a plant ladder out at each
  b.surface('grate', X(tx0), X(tx1), Z(tz0), Z(tz1), Y(0));
  b.box(X((tx0 + 1.2 + tx1 - 1.2) / 2), Y(-0.05), Z((tz0 + tz1) / 2), tx1 - tx0 - 2.4, 0.1, tz1 - tz0, C.grate);
  r.anchors['B5-trench-w'] = b.ladder(X(tx0 + 0.1), Z((tz0 + tz1) / 2), Y(-M5.trenchDepth), Y(0), -Math.PI / 2).id;
  r.anchors['B5-trench-e'] = b.ladder(X(tx1 - 0.1), Z((tz0 + tz1) / 2), Y(-M5.trenchDepth), Y(0), Math.PI / 2).id;
  for (const px of M5.panels) r.hideSpots.push(plantAt2('B5', px, (tz0 + tz1) / 2, -M5.trenchDepth));

  // CG (y 3.5, x 2..16, z 22.5..24): its ladder at the east end, a rail on its front, the planned hang-drop off its
  // west end (a manual hang-only ledge, A38)
  deck(b, X(2), Z(22.5), X(16), Z(23.775), Y(M5.gallery), C.grate);
  b.surface('grate', X(2), X(16), Z(22.5), Z(23.775), Y(M5.gallery));
  for (const px of [5, 10]) b.box(X(px), Y(M5.gallery / 2), Z(22.6), 0.1, M5.gallery - 0.3, 0.1, C.steel, 0, 0, false);
  rail(b, X(2.4), Z(22.5), X(14.6), Z(22.5), Y(M5.gallery));
  rail(b, X(16), Z(22.5), X(16), Z(23.775), Y(M5.gallery));
  r.anchors['B5-gallery-ladder'] = b.ladder(X(15.3), Z(22.45), Y(0), Y(M5.gallery), 0).id;
  r.anchors['B5-hang-drop'] = b.ledge(X(2), Z(23.725), X(2), Z(22.55), Y(M5.gallery), { canHang: true, canClimbUp: false }).id;
  strip(2, 22.48, 16, 22.48, M5.gallery - 0.32);
  r.hideSpots.push(plantAt2('B5', 1.1, 23));

  // SR (x 24..30, z 6..12): glazed west wall with its door onto the aisle (z 6.6..7.8), roofed at 3.2; MB (the mains
  // group switch)
  gl(24, 6, 24, 6.6, 0, 3.2);
  gl(24, 7.8, 24, 12, 0, 3.2);
  gl(24, 6.6, 24, 7.8, DOOR_H, 3.2 - DOOR_H);
  r.anchors['B5-SR-west'] = b.door(X(24), Y(0), Z(6.6), DOOR_W, 0, { swing: 1 }).id;
  wallXAt(b, Z(12), X(23.85), X(29.775), [], Y(0), 3.2, C.wall, PART);
  wallXAt(b, Z(6), X(23.85), X(29.775), [], Y(0), 3.2, C.wall, PART);
  roof(b, X(23.85), Z(5.85), X(29.775), Z(12.15), Y(3.2));
  b.box(X(29.7), Y(1.4), Z(9), 0.12, 0.9, 1.6, C.steel, 0, 0, false);
  r.switches.push({ pos: plantAt2('B5', 29.5, 9, 1.2), yaw: -Math.PI / 2, group: B5_GROUPS.mains });
  strip(24.05, 6, 24.05, 12, 0.02);

  // FB (x 24..30, z 0..6): the day tank 4 x 2 x 2.4, door in its west wall (z 1.4..2.6)
  wallZDoors(b, X(24), Z(0.225), Z(5.85), [Z(1.4)], Y(0), 3.2, C.wall);
  b.door(X(24), Y(0), Z(1.4), DOOR_W, 0, { swing: -1 });
  b.block(X(27.6), Z(3.6), 4, 2.4, 2, C.tank, Y(0));
  r.hideSpots.push(plantAt2('B5', 27.6, 1.2));

  // the monitoring desk (x 1..4, z 1..3.5) facing east (B5-G2's post at (2.5, 2.2)); the relief door (A62)
  b.block(X(3.6), Z(2.25), 0.8, M6.desk, 2.5, C.wood, Y(0));
  leaf(13, 0.25, 0, true);

  r.debug.push(
    { id: 'B5', label: 'B5 Standby Plant (entry landing)', pos: plantAt2('B5', 25, 22.5, M5.landing), yaw: Math.PI },
    { id: 'B5-floor', label: 'B5 hall (stair foot)', pos: plantAt2('B5', 27.2, 13.4), yaw: Math.PI },
    { id: 'B5-GEN', label: 'B5 genset 2 roof', pos: plantAt2('B5', 14, 10.25, M5.genset), yaw: -Math.PI / 2 },
    { id: 'B5-CG', label: 'B5 cable gallery', pos: plantAt2('B5', 8, 23.1, M5.gallery), yaw: -Math.PI / 2 },
    { id: 'B5-trench', label: 'B5 cable trench', pos: plantAt2('B5', 2.2, 13.4, -M5.trenchDepth), yaw: -Math.PI / 2 },
    { id: 'B5-SR', label: 'B5 switch room (MB)', pos: plantAt2('B5', 27.5, 9), yaw: Math.PI / 2 },
    { id: 'B5-FB', label: 'B5 fuel bay', pos: plantAt2('B5', 24.9, 5.2), yaw: Math.PI / 2 },
  );
}

// ---------------------------------------------------------------------------------------------------- A5, A6

/** The pad border (BAYS 0.4): an LED floor strip 1 m inside every wall. */
function pad(b: LevelBuilder, f: Frame): void {
  const { strip } = kit(b, f);
  strip(1, 1, 5, 1, 0.015);
  strip(1, 5, 5, 5, 0.015);
  strip(1, 1, 1, 5, 0.015);
  strip(5, 1, 5, 5, 0.015);
}

/** A5: 6 x 6 x 3.0 between B5 (east, near door) and B6 (west, far door); both doors in the bays' walls. */
function buildA5(b: LevelBuilder, r: Plant2Result): void {
  const f = frame('A5');
  const { X, Z, Y } = f;
  b.floor(X(3), Z(3), 6, 6 + 2 * OUTER, C.floor, Y(0));
  wallXAt(b, Z(0), X(0.225), X(5.775), [], Y(0), AIR_CLEAR, C.wall, OUTER);
  wallXAt(b, Z(6), X(0.225), X(5.775), [], Y(0), AIR_CLEAR, C.wall, OUTER);
  roof(b, X(-0.225), Z(-OUTER), X(6.225), Z(6 + OUTER), Y(AIR_CLEAR));
  b.block(X(3), Z(5.6), 3, 0.45, 0.45, C.wood, Y(0));
  b.box(X(0.24), Y(1.5), Z(3) + 1.1, 0.04, 0.6, 0.6, C.glass, 0, 0, false);
  pad(b, f);
  r.doors['A5-near'] = b.door(X(6), Y(0), Z(2.4), DOOR_W, 0, { locked: true, swing: 1 }).id;
  r.doors['A5-far'] = b.door(X(0), Y(0), Z(2.4), DOOR_W, 0, { locked: true, swing: -1 }).id;
  r.debug.push({ id: 'A5', label: 'A5 airlock', pos: plantAt2('A5', 3, 3), yaw: -Math.PI / 2 });
}

/** A6: 6 x 6 x 3.0 at the S6 foot (north, near door) with B7's north wall's far door (south); wall medkit. */
function buildA6(b: LevelBuilder, r: Plant2Result): void {
  const f = frame('A6');
  const { X, Z, Y } = f;
  wallZAt(b, X(-OUTER / 2), Z(0.225), Z(5.775), [], Y(0), AIR_CLEAR, C.wall, OUTER);
  wallZAt(b, X(6 + OUTER / 2), Z(0.225), Z(5.775), [], Y(0), AIR_CLEAR, C.wall, OUTER);
  // north wall (S6's foot): the near door at local x 2.4..3.6 (world 19.9..21.1)
  wallXDoors(b, Z(6), X(-OUTER), X(6 + OUTER), [X(2.4)], Y(0), AIR_CLEAR, C.wall, OUTER);
  // south wall (A6's stretch of B7's north wall): the far door at x 2.4..3.6 with its vision panel
  wallXDoors(b, Z(0), X(-OUTER), X(6 + OUTER), [X(2.4)], Y(0), AIR_CLEAR, C.wall, OUTER);
  b.box(X(3.6) + 0.9, Y(1.5), Z(0) + 0.24, 0.6, 0.6, 0.04, C.glass, 0, 0, false);
  b.block(X(5.6), Z(3), 0.45, 0.45, 3, C.wood, Y(0));
  b.box(X(0.25), Y(1.2), Z(4.5), 0.06, 0.4, 0.5, C.med, 0, 0, false);
  pad(b, f);
  r.doors['A6-near'] = b.door(X(2.4), Y(0), Z(6), DOOR_W, Math.PI / 2, { locked: true, swing: 1 }).id;
  r.doors['A6-far'] = b.door(X(2.4), Y(0), Z(0), DOOR_W, Math.PI / 2, { locked: true, swing: -1 }).id;
  r.debug.push({ id: 'A6', label: 'A6 airlock (medkit)', pos: plantAt2('A6', 3, 3), yaw: Math.PI });
}

// ---------------------------------------------------------------------------------------------------- B6 Mock Site

function buildB6(b: LevelBuilder, r: Plant2Result): void {
  const f = frame('B6');
  const { X, Z, Y } = f;
  const { solid, gl, strip, leaf } = kit(b, f);
  const H = M6.clear;
  const HT = M6.tall;
  const MZ = M6.mezzanine;
  b.floor(X(15), Z(12), 30.45, 24.45, C.vinyl, Y(0));
  // outer walls (4.6): west (with the 1.8 m riser fill to x 2: CO, LK and MT start at x 2), east (A5's far door z 12.4),
  // south (the exit door x 8..9.2 to S6), north (raised to 6.4 over the tall volume, x 9.7..24.15)
  wallZAt(b, X(0), Z(-0.225), Z(24.225), [], Y(0), H, C.wall, OUTER);
  solid(0.225, 0.225, 2, 23.775, 0, H);
  wallZDoors(b, X(30), Z(-0.225), Z(24.225), [Z(12.4)], Y(0), H, C.wall, OUTER);
  wallXDoors(b, Z(0), X(-0.225), X(30.225), [X(8)], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(24), X(-0.225), X(30.225), [], Y(0), H, C.wall, OUTER);
  solid(9.7, 23.775, 24.15, 24.225, H, HT, C.wall);
  // the slab: 4.6 over RC, AH, RE, CO, LK, MT and SV; 6.4 over the tall volume (the office, CR and its stair: x 9.7..24.15,
  // z 14..24.225), whose walls rise from the low slab to the high one (no gap between the two levels)
  roof(b, X(-0.225), Z(-0.225), X(30.225), Z(14.15), Y(H));
  roof(b, X(-0.225), Z(14.15), X(9.7), Z(24.225), Y(H));
  roof(b, X(24.15), Z(14.15), X(30.225), Z(24.225), Y(H));
  roof(b, X(9.7), Z(14), X(24.15), Z(24.225), Y(HT));

  // partitions (to the slab over them): x 24 (RC / AH | CO / RE 4.6, the office 6.4), RC's inner door (locked for good)
  // at z 12.4
  wallZDoors(b, X(24), Z(0.225), Z(14), [Z(12.4)], Y(0), H, C.wall);
  wallZAt(b, X(24), Z(14), Z(23.775), [], Y(0), HT, C.wall);
  wallXDoors(b, Z(8), X(24.15), X(29.775), [X(26)], Y(0), H, C.wall);
  // CO (2.0 clear, z 12..14: wider than any split gap, two bodies pass): south wall (RD1 into RE at x 17), north wall
  // (LK x 6 at 4.6; RD2 x 10.4, OF x 13 and x 20 at 6.4); the L-leg and the CR stair are 2.0 clear too
  wallXDoors(b, Z(11.85), X(4), X(23.85), [X(17)], Y(0), H, C.wall);
  wallXDoors(b, Z(14.15), X(2), X(9.7), [X(6)], Y(0), H, C.wall);
  wallXDoors(b, Z(14.15), X(9.7), X(23.85), [X(10.4), X(13), X(20)], Y(0), HT, C.wall);
  // the L-leg (x 2..4, z 4..12): its east wall; MT (x 2..6, z 0..4): RD3 in its north wall, RD4 in its east wall
  wallZAt(b, X(4.15), Z(4.15), Z(12), [], Y(0), H, C.wall);
  wallXDoors(b, Z(4), X(2), X(6.15), [X(2.4)], Y(0), H, C.wall);
  wallZDoors(b, X(6), Z(0.225), Z(4.15), [Z(1.4)], Y(0), H, C.wall);
  // SV / RE (x 12); LK / CR stair (x 10, z 14..24); the stair's east wall (x 12, z 14..20) and its foot under the landing
  wallZAt(b, X(12), Z(0.225), Z(11.85), [], Y(0), H, C.wall);
  wallZAt(b, X(9.85), Z(14.3), Z(23.775), [], Y(0), HT, C.wall);
  wallZAt(b, X(12.15), Z(14.3), Z(20.15), [], Y(0), HT, C.wall);
  wallXAt(b, Z(20), X(10), X(12), [], Y(0), MZ - 0.3, C.wall);

  // the CR stair (x 10..12, z 14.3..20, behind RD2) up to the enclosed landing (x 10..14, z 20..24, 3.6) over the
  // manager's office; the door into CR at x 14 (z 21..22.2)
  const stLen = 5.7;
  b.stairs(X(11), Z(14.3 + stLen / 2), 1.7, stLen, MZ, 20, C.vinyl, 0, Y(0));
  deck(b, X(10), Z(20), X(14), Z(23.775), Y(MZ), C.vinyl);
  b.box(X(13), Y((MZ + HT) / 2), Z(20), 2, HT - MZ, PART, C.wall);
  wallZDoors(b, X(14), Z(19), Z(23.775), [Z(21)], Y(MZ), HT - MZ, C.wall);
  // the manager's office (x 10..14, z 20..24 under the landing): glazed south and east fronts, its door (pin, locked)
  gl(12.3, 20, 12.4, 20, 0, MZ - 0.3);
  gl(13.6, 20, 14, 20, 0, MZ - 0.3);
  gl(12.4, 20, 13.6, 20, DOOR_H, MZ - 0.3 - DOOR_H);
  gl(14, 20, 14, 23.775, 0, MZ - 0.3);
  // CR: the mezzanine deck (x 14..24, z 19..24, 3.6) with its glazed south front to the slab
  deck(b, X(14), Z(19), X(23.85), Z(23.775), Y(MZ), C.vinyl);
  gl(14, 19, 23.85, 19, MZ, HT - MZ);
  b.block(X(19), Z(23), 2.4, 0.75, 0.8, C.wood, Y(MZ));
  b.box(X(23.8), Y(MZ + 1.3), Z(23.3), 0.12, 0.8, 1.0, C.steel, 0, 0, false);
  strip(14, 19.02, 23.85, 19.02, MZ - 0.05);

  // RC: the counter (1.1, low cover); AH: the air-handling unit, the platform (2.2) and its caged plant ladder
  b.block(X(25.7), Z(18), 0.6, 1.1, 6, C.wood, Y(0));
  b.block(X(28), Z(3), 2.4, 2.6, 3, C.steel, Y(0));
  b.block(X((24.15 + 25.6) / 2), Z(6), 25.6 - 24.15, M6.platform, 2, C.steel, Y(0));
  r.anchors['B6-ah-ladder'] = b.ladder(X(25.65), Z(6.5), Y(0), Y(M6.platform), -Math.PI / 2).id;
  for (const dz of [-0.45, 0.45]) b.box(X(26.1), Y(M6.platform / 2 + 0.6), Z(6.5 + dz), 0.05, M6.platform + 0.2, 0.05, C.steel, 0, 0, false);

  // RE: its ceiling (the void floor, 3.4) with the grille's hole; the records desk under it, the PC desk, the CRAC
  // unit; the exit (REX) button inside the door
  const from = b.boxes.length;
  slabWithHoles(b, X(12.15), Z(0.225), X(23.85), Z(11.85), Y(M6.ceiling), [[X(18), Z(5.4), X(19.2), Z(6.6)]], C.roof);
  b.mark(from, { overhead: true, noLedge: true });
  b.block(X(18.6), Z(6), 1.6, M6.desk, 0.8, C.wood, Y(0));
  b.block(X(15), Z(9.5), 1.6, M6.desk, 0.8, C.wood, Y(0));
  b.block(X(22), Z(2.4), 1.6, 1.9, 1.1, C.steel, Y(0));
  r.devices['sw-rd1-rex'] = { x: X(16.6), y: Y(0), z: Z(11.45), yaw: Math.PI, label: 'Exit' };

  // the office: desk pods with 1.5 glass partitions under the mezzanine, the whiteboard on CO's north wall
  b.surface('carpet', X(12), X(24), Z(14), Z(24), Y(0));
  for (const px of [16.5, 21]) {
    gl(px - 2, 21.5, px + 2, 21.5, 0, 1.5);
    gl(px, 20.2, px, 22.8, 0, 1.5);
    b.block(X(px - 1), Z(20.8), 1.6, M6.desk, 0.8, C.wood, Y(0));
    b.block(X(px + 1), Z(22.2), 1.6, M6.desk, 0.8, C.wood, Y(0));
  }
  b.box(X(17), Y(1.6), Z(14.32), 2.4, 1.2, 0.04, '#d8dcdf', 0, 0, false);
  // LK: lockers along the west wall (2.0 high); locker 7 holds card A
  for (let i = 0; i < 12; i++) b.block(X(2.25), Z(15.3 + i * 0.6), 0.5, 2.0, 0.58, C.locker, Y(0));
  const locker7 = 15.3 + 6 * 0.6;
  r.devices['pk-card-a'] = { x: X(2.8), y: Y(0), z: Z(locker7), yaw: Math.PI / 2, label: 'Take card A' };
  r.hideSpots.push(plantAt2('B6', 2.8, 15.6), plantAt2('B6', 2.8, 21.9));
  // SV: rack rows (2.2, full cover); the rack ends are hide spots; the egress by RD4; the exit keypad (three numbered
  // buttons; the right one is on CAM4's whiteboard) beside the exit door
  for (const rz of [6, 9.5]) b.block(X(8.5), Z(rz), 5, 2.2, 0.6, C.rack, Y(0));
  r.hideSpots.push(plantAt2('B6', 11.5, 6), plantAt2('B6', 11.5, 9.5));
  r.devices['sw-mt-egress'] = { x: X(6.4), y: Y(0), z: Z(3.2), yaw: Math.PI / 2, label: 'Egress' };
  for (let k = 1; k <= 3; k++) r.devices[`sw-key-${k}`] = { x: X(9.3 + 0.5 * k), y: Y(0), z: Z(0.4), yaw: 0, label: `Key ${k}` };
  // the guards' cards (now: pickups at their posts; T7b hands them to B6-GR and B6-GM)
  r.devices['pk-card-b'] = { x: X(22.5), y: Y(0), z: Z(13), yaw: -Math.PI / 2, label: 'Take card B' };
  r.devices['pk-card-m'] = { x: X(3), y: Y(0), z: Z(12.8), yaw: Math.PI / 2, label: 'Take card M' };

  // doors: readers (locked; course flag gates), the exit (keypad), RC's inner door and the manager's (locked for
  // good), plain doors
  r.doors['B6-rd1'] = b.door(X(17), Y(0), Z(11.85), DOOR_W, Math.PI / 2, { locked: true, swing: -1 }).id;
  r.doors['B6-rd2'] = b.door(X(10.4), Y(0), Z(14.15), DOOR_W, Math.PI / 2, { locked: true, swing: 1 }).id;
  r.doors['B6-rd3'] = b.door(X(2.4), Y(0), Z(4), DOOR_W, Math.PI / 2, { locked: true, swing: -1 }).id;
  r.doors['B6-rd4'] = b.door(X(6), Y(0), Z(1.4), DOOR_W, 0, { locked: true, swing: -1 }).id;
  r.doors['B6-exit'] = b.door(X(8), Y(0), Z(0), DOOR_W, Math.PI / 2, { locked: true, swing: -1 }).id;
  r.doors['B6-rc'] = b.door(X(24), Y(0), Z(12.4), DOOR_W, 0, { locked: true, swing: -1 }).id;
  r.doors['B6-mgr'] = b.door(X(12.4), Y(0), Z(20), DOOR_W, Math.PI / 2, { locked: true, swing: -1 }).id;
  b.door(X(26), Y(0), Z(8), DOOR_W, Math.PI / 2, { swing: 1 });
  for (const x of [6, 13, 20]) b.door(X(x), Y(0), Z(14.15), DOOR_W, Math.PI / 2, { swing: -1 });
  b.door(X(14), Y(MZ), Z(21), DOOR_W, 0, { swing: -1 });
  // the relief doors (A62; visual leaves, no anchor)
  leaf(19, 23.75, MZ, true);
  leaf(22, 23.75, 0, true);
  leaf(2.03, 13, 0, false);

  // the supply duct: from the AH wall grate (the platform's west face, 1.2 over its feet) west in RE's ceiling void
  // to the records grille (a ceiling exit: the vent drop, SPEC E6)
  const fy = Y(M6.ceiling);
  b.box(X(24.17), fy + 0.5, Z(6), 0.04, 1.0, 1.2, C.grate, 0, 0, false);
  b.box(X(18.6), fy - 0.02, Z(6), 1.2, 0.04, 1.2, C.grate, 0, 0, false);
  r.anchors['B6-duct'] = b.duct(
    [{ x: X(24.15), y: fy, z: Z(6) }, { x: X(18.6), y: fy, z: Z(6) }],
    { pos: { x: X(24.15), y: fy + 0.05, z: Z(6) }, nx: 1, ny: 0, nz: 0, where: 'wall' },
    { pos: { x: X(18.6), y: fy, z: Z(6) }, nx: 0, ny: -1, nz: 0, where: 'ceiling' },
  ).id;

  // camera fixtures (visual)
  for (const d of BUNKER_DEVICES) if (d.kind === 'camera' || d.kind === 'cameraSweep') b.box(d.pos.x, d.pos.y, d.pos.z, 0.18, 0.14, 0.3, C.cam, d.yaw, 0, false);

  r.debug.push(
    { id: 'B6', label: 'B6 Mock Site (reception)', pos: plantAt2('B6', 27, 15.5), yaw: -Math.PI / 2 },
    { id: 'B6-AH', label: 'B6 air-handling room', pos: plantAt2('B6', 27, 6.5), yaw: -Math.PI / 2 },
    { id: 'B6-PLAT', label: 'B6 AH platform (duct mouth)', pos: plantAt2('B6', 24.9, 6, M6.platform), yaw: -Math.PI / 2 },
    { id: 'B6-RE', label: 'B6 records', pos: plantAt2('B6', 15, 4), yaw: 0 },
    { id: 'B6-CO', label: 'B6 corridor', pos: plantAt2('B6', 8, 13), yaw: -Math.PI / 2 },
    { id: 'B6-L', label: 'B6 corridor L-leg', pos: plantAt2('B6', 3, 8), yaw: Math.PI },
    { id: 'B6-LK', label: 'B6 locker room', pos: plantAt2('B6', 6, 19), yaw: 0 },
    { id: 'B6-OF', label: 'B6 open office', pos: plantAt2('B6', 17, 16.5), yaw: 0 },
    { id: 'B6-CR', label: 'B6 control room (mezzanine)', pos: plantAt2('B6', 19, 21.5, MZ), yaw: Math.PI },
    { id: 'B6-MT', label: 'B6 mantrap', pos: plantAt2('B6', 4, 2), yaw: Math.PI / 2 },
    { id: 'B6-SV', label: 'B6 server room', pos: plantAt2('B6', 9, 2.5), yaw: Math.PI },
  );
  // one work lamp per room (T6 lights the bays)
  for (const [x, z, y] of [[27, 15, 3.8], [27, 4, 3.8], [17, 4, 2.8], [13, 13, 3.8], [6, 19, 3.8], [18, 16.5, 5.5], [19, 21.5, MZ + 2.4], [4, 2, 3.8], [9, 5, 3.8]] as const) {
    b.light({ ...plantAt2('B6', x, z, y), radius: 9, intensity: 0.8 });
  }
}

// ---------------------------------------------------------------------------------------------------- S6 Stair 6

/** The S6 stair in world plan: x 19..22, z -32.0..-19.76 (33 goings of 0.28 plus the 3.0 mid landing), rising north to
 *  B6. The top landing (z -19.76..-17.225, y 6) holds S6's top door (z -18.3). */
export const S6_RECT: [number, number, number, number] = [19, -32.0, 22, -32.0 + S6_METRICS.risers * S6_METRICS.going + S6_METRICS.width];
/** S6's top door centre (world plan) in its partition across the top landing (opened from the B6 side only). */
export const S6_TOP_DOOR = { x: 20.6, z: -18.3 } as const;

function buildS6(b: LevelBuilder, r: Plant2Result): void {
  const lay = stairLayout(
    { levels: [{ id: 'A6', floor: 0 }, { id: 'B6', floor: S6_METRICS.rise }], walls: [], openings: [] },
    { from: 'A6', to: 'B6', rect: S6_RECT, up: 'N', width: S6_METRICS.width, risers: S6_METRICS.risers, flights: 2 },
  );
  r.s6 = lay;
  const top = S6_METRICS.rise;
  wallZAt(b, 19 - PART / 2, -33.225, -17.225, [], 0, top + 3, C.wall, PART);
  wallZAt(b, 22 + PART / 2, -33.225, -17.225, [], 0, top + 3, C.wall, PART);
  roof(b, 19 - PART, -33.225, 22 + PART, -17.225, top + 3);
  for (const fl of lay.flights) {
    b.stairs(fl.c[0], fl.c[1], fl.w, fl.len, fl.rise, fl.steps, C.conc, fl.yaw, fl.y);
    // handrails (visual) both sides, 0.9 over the nosings, with an LED strip (accent)
    const pitch = -Math.atan2(fl.rise, fl.len);
    for (const s of [-1, 1]) b.box(fl.c[0] + s * (fl.w / 2 - 0.05), fl.y + fl.rise / 2 + 0.9, fl.c[1], 0.05, 0.05, hyp2(fl.len, fl.rise), C.rail, fl.yaw, pitch, false);
  }
  for (const l of lay.landings) b.block((l.rect[0] + l.rect[2]) / 2, (l.rect[1] + l.rect[3]) / 2, l.rect[2] - l.rect[0], l.top, l.rect[3] - l.rect[1], C.conc, 0);
  // under flight 2 (solid to the mid landing's height) and the top landing (z -19.76..-17.225) at y 6
  const f2 = lay.flights[1]!;
  b.block(f2.c[0], f2.c[1], f2.w, f2.y, f2.len, C.conc, 0);
  b.block(20.5, (S6_RECT[3] - 17.225) / 2, 3, top, -17.225 - S6_RECT[3], C.conc, 0);
  // the top door's partition (y 6..9)
  wallXDoors(b, S6_TOP_DOOR.z, 19, 22, [S6_TOP_DOOR.x - DOOR_W / 2], top, 3, C.wall);
  r.doors['S6-top'] = b.door(S6_TOP_DOOR.x - DOOR_W / 2, top, S6_TOP_DOOR.z, DOOR_W, Math.PI / 2, { locked: true, swing: 1 }).id;
  b.light({ x: 20.5, y: 4.5, z: -25, radius: 10, intensity: 0.7 });
  r.debug.push({ id: 'S6', label: 'S6 Stair 6 (top landing)', pos: { x: 20.5, y: top, z: -19.1 }, yaw: Math.PI });
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
  b.floor(20.5, -25.2, 3, 16.05, C.floor, 0);
  const { X, Z, Y } = frame('A6');
  b.floor(X(3), Z(3), 6 + 2 * OUTER, 6 + 2 * OUTER, C.floor, Y(0));
  roof(b, X(-OUTER), Z(-OUTER), X(6 + OUTER), Z(6 + OUTER), Y(AIR_CLEAR));
  b.mark(from, { noLedge: true });
}

/**
 * Build B5, A5, B6, S6 and A6 into `b` (their floor-dressed pieces last: `buildPlantFloors`). Afterwards every piece
 * is `noLedge` (the lips are manual). Work lamps: B5's hall lamp is on the mains group (MB turns it off).
 */
export function buildPlant(b: LevelBuilder): Plant2Result {
  const r: Plant2Result = { doors: {}, devices: {}, anchors: {}, hideSpots: [], switches: [], debug: [], s6: { flights: [], landing: null, landings: [], foot: [0, 0], head: [0, 0] } };
  const from = b.boxes.length;
  buildB5(b, r);
  buildA5(b, r);
  buildB6(b, r);
  buildS6(b, r);
  buildA6(b, r);
  for (let k = from; k < b.boxes.length; k++) b.boxes[k]!.noLedge = true;
  // the mains group's only lamp: never shot out or EMP'd (a dead lamp would read as mains off: the gate bypass)
  b.light({ ...plantAt2('B5', 14, 12, 7.5), radius: 26, intensity: 0.9, group: B5_GROUPS.mains, destructible: false, electric: false });
  b.light({ ...plantAt2('B5', 27, 9, 2.9), radius: 6, intensity: 0.7 });
  b.light({ ...plantAt2('B5', 26, 3, 2.9), radius: 6, intensity: 0.7 });
  return r;
}
