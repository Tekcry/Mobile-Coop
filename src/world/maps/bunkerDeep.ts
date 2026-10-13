import type { BoxPiece, LevelBuilder } from '../levelBuilder';
import type { P3 } from '../anchors';
import type { CourseDevice } from '../../game/course/courseDef';
import { wallXAt, wallZAt, windowX, windowZ } from './storey';
import { slabWithHoles } from './bunkerUpper';
import { B4_COOP_LIPS, type PlantLip } from './bunkerShaft';
import { deck, glass, rail, roof, wallXDoors, wallZDoors } from './bunkerPlant';

/**
 * Fallow, the Deep level (docs/training/BAYS.md B7, A7, B8, A8, B9, L9; y 0): B7 The House (the cavern and the kill
 * house), airlock A7, B8 The Range, airlock A8 (medkit), B9 The Plot and the exit lift L9. Every coordinate below is a
 * BAYS local coordinate; `deepAt` / the per-bay `X` / `Z` / `Y` add the bay's offset.
 *
 * Ledges (A25): every piece is `noLedge` except the planned lips (`DEEP_LIPS`): the rock-bolting bench, the annex roof,
 * the roof parapet, the sniper scaffold and B9's north-west balustrade gap (the co-op lip, in `BUNKER_COOP_LIPS`).
 * No gate can be passed round: the cavern, the range and the plot are closed boxes (walls to their roof slabs); the
 * house windows lead only into the house; B8's catwalk stair is caged to the roof; the lift car is closed but for its
 * door; the message-tube duct and the zipline end in the lift lobby, before the lift's gate.
 */

export type DeepBay = 'B7' | 'A7' | 'B8' | 'A8' | 'B9' | 'L9';

/** BAYS 0 offsets (x, z); every Deep bay's floor is y 0. */
export const DEEP_OFFSET: Record<DeepBay, readonly [number, number]> = {
  B7: [0, -50],
  A7: [44, -33],
  B8: [50, -46],
  A8: [112, -33],
  B9: [118, -56],
  L9: [118, -56],
};

/** World point from a bay's local (x, z, y above the floor). L9 uses B9's frame (BAYS: the car is x 18..26, z 52..58). */
export function deepAt(bay: DeepBay, x: number, z: number, y = 0): P3 {
  const o = DEEP_OFFSET[bay];
  return { x: x + o[0], y, z: z + o[1] };
}

/** B7 metrics (local heights). */
export const B7_METRICS = {
  clear: 10,
  firstFloor: 3.2,
  roof: 6.4,
  /** T5: 0.9 (BAYS 1.1) so the ledge pull's height (victim's feet 1.0 over the hanging feet) sits inside 0.8-2.6. */
  parapet: 0.9,
  annex: 3.2,
  /** T5: 4.9 (BAYS 4.6): a standing grab (1.6-2.7) from the bench (1.9) and the annex roof (1.7); drop 3.0 onto B7-W. */
  main: 4.9,
  bench: 3.0,
  sandbag: 1.0,
  /** The manager's window sill (first floor + 0.9). */
  sill: 4.1,
} as const;

/** B8 metrics. */
export const B8_METRICS = { clear: 8, catwalk: 4.0, scaffold: 3.0, bench: 0.9, low: 1.0, high: 2.0, stairRisers: 22 } as const;

/** B9 metrics. */
export const B9_METRICS = { clear: 14, b1: 4.5, b2: 9.0, rail: 1.1, lobby: 6.0, table: 0.9, tower: 11.5 } as const;

const M7 = B7_METRICS;
const M8 = B8_METRICS;
const M9 = B9_METRICS;

const OUTER = 0.45;
const PART = 0.3;
const DOOR_W = 1.2;
const AIR_CLEAR = 3.0;

const C = {
  rock: '#5a5852',
  spoil: '#4d4a44',
  wall: '#62676c',
  block: '#8a857a',
  floor: '#55595d',
  vinyl: '#6d7276',
  steel: '#5b6168',
  grate: '#4d5358',
  wood: '#7a5a3c',
  sand: '#8a7a55',
  skip: '#6a5a2a',
  locker: '#56606a',
  pipe: '#4a5a6a',
  ply: '#a08458',
  conc: '#6b6e70',
  table: '#2f4f5a',
  rope: '#3a3d40',
} as const;

function lipBox(bay: DeepBay, id: string, x0: number, z0: number, x1: number, z1: number, top: number, floor = 0): PlantLip {
  const a = deepAt(bay, x0, z0);
  const e = deepAt(bay, x1, z1);
  return { id, bay, box: [a.x - 0.05, a.z - 0.05, e.x + 0.05, e.z + 0.05], top: top, floor };
}

/** B9's planned co-op lip (level-design 11.3): the B-1 balustrade gap at the north-west, 4.5 over the plot floor. */
export const B9_COOP_LIP: PlantLip = lipBox('B9', 'B9-NW', 7, 37, 8, 39, M9.b1);

/** Every co-op lip on the course: B4's (W1, W2, the outlet) and B9's north-west gap. */
export const BUNKER_COOP_LIPS: readonly PlantLip[] = [...B4_COOP_LIPS, B9_COOP_LIP];

/** Every planned lip on the Deep level (nothing else makes a ledge). */
export const DEEP_LIPS: readonly PlantLip[] = [
  lipBox('B7', 'WB', 0.225, 4, 1.5, 30, M7.bench),
  lipBox('B7', 'AX', 19.85, 5.85, 28.15, 10, M7.annex),
  lipBox('B7', 'PR', 13.85, 9.85, 34.15, 26.15, M7.roof + M7.parapet, M7.roof),
  lipBox('B8', 'SP', 56, 18, 60, 22, M8.scaffold),
  B9_COOP_LIP,
];

/** A Deep device mount point (T7a reads these). */
export interface DeepDevice {
  id: string;
  kind: 'camera' | 'cameraSweep' | 'desk' | 'panel' | 'beam' | 'pir' | 'keypad' | 'medkit' | 'alarm' | 'reinforce';
  bay: DeepBay;
  local: readonly [number, number, number];
  pos: P3;
  yaw: number;
  sweep?: readonly [number, number];
  to?: P3;
  door?: string;
}

const deg = (d: number): number => (d * Math.PI) / 180;

function dev(id: string, kind: DeepDevice['kind'], bay: DeepBay, x: number, z: number, y: number, facingDeg: number, extra: Partial<DeepDevice> = {}): DeepDevice {
  return { id, kind, bay, local: [x, z, y], pos: deepAt(bay, x, z, y), yaw: deg(facingDeg), ...extra };
}

/** Deep device mount points (BAYS B7 store keypad, B8 CAM-R, B9 devices). */
export const DEEP_DEVICES: readonly DeepDevice[] = [
  dev('KP7', 'keypad', 'B7', 43.7, 18.9, 1.2, 270, { door: 'A7-near' }),
  dev('CAM-R', 'camera', 'B8', 28, 24, 3.2, 270),
  dev('CAM-P1', 'cameraSweep', 'B9', 22, 43.7, 6.0, 180, { sweep: [deg(135), deg(225)] }),
  dev('CAM-P2', 'camera', 'B9', 22, 44.4, 3.0, 0),
  dev('B9-DESK', 'desk', 'B9', 22, 40.6, M9.b2, 180),
  dev('B9-BEAM', 'beam', 'B9', 18.2, 44.2, 1.4, 90, { to: deepAt('B9', 25.8, 44.2, 1.4) }),
  dev('B9-PIR', 'pir', 'B9', 3, 12, M9.b2 + 2.5, 0),
  dev('B9-ALARM', 'alarm', 'B9', 20, 0.3, M9.b1 + 1.2, 0),
  dev('B9-REINF', 'reinforce', 'B9', 43.2, 5.6, 0, 270, { door: 'B9-tunnel' }),
  dev('B9-MED', 'medkit', 'B9', 0.3, 40, 1.2, 90),
  dev('A8-MED', 'medkit', 'A8', 3, 5.7, 1.2, 180),
];

/**
 * B8 props T7a places: dummies on the lane stands (10, 25, 50 m; lanes 1-6) and the two explosive barrels (world).
 * T5 fix: lanes 5 and 6's far stands are at 45 m (x 53): at 50 m they stood inside the scaffold and the CS cage.
 */
export const B8_TARGETS: readonly P3[] = [0, 1, 2, 3, 4, 5].flatMap((i) => [10, 25, i >= 4 ? 45 : 50].map((m) => deepAt('B8', 8 + m, 4 + 4 * i)));
export const B8_BARRELS: readonly P3[] = [deepAt('B8', 38, 19.4), deepAt('B8', 38, 20.6)];

/** What the Deep builder hands back to the map. */
export interface DeepResult {
  doors: Record<string, number>;
  devices: Record<string, CourseDevice>;
  anchors: Record<string, number>;
  hideSpots: P3[];
  debug: { id: string; label: string; pos: P3; yaw: number }[];
  /** The pieces the 'epic' detail pass dresses as floor, held back for the end of the map (`bunker.build`). */
  floors: BoxPiece[];
}

interface Frame {
  X: (x: number) => number;
  Z: (z: number) => number;
  Y: (y: number) => number;
}

function frame(bay: DeepBay): Frame {
  const o = DEEP_OFFSET[bay];
  return { X: (x) => x + o[0], Z: (z) => z + o[1], Y: (y) => y };
}

type Win = { c: number; kind: 'open' | 'glazed' | 'fixed' };

/** A storey wall along X (world z, x0..x1) from y, h tall, with doors (gap start, world x) and windows (centres). */
function storeyX(b: LevelBuilder, z: number, x0: number, x1: number, doors: readonly number[], wins: readonly Win[], y: number, h: number, color: string): void {
  const gaps = [...doors.map((d) => [d, d + DOOR_W] as const), ...wins.map((w) => [w.c - 0.6, w.c + 0.6] as const)].sort((p, q) => p[0] - q[0]);
  wallXAt(b, z, x0, x1, gaps, y, h, color, PART);
  for (const d of doors) b.box(d + DOOR_W / 2, y + (2.1 + h) / 2, z, DOOR_W, h - 2.1, PART, color);
  for (const w of wins) {
    // a fixed pane 0.1 thick (storey's 0.05 glass is thinner than the 5 cm voxel grid can hold)
    if (w.kind === 'fixed') b.box(w.c, y + 0.45, z, 1.2, 0.9, PART, color).box(w.c, y + (2.1 + h) / 2, z, 1.2, h - 2.1, PART, color).box(w.c, y + 1.5, z, 1.2, 1.2, 0.1, '#5d7387');
    else windowX(b, w.c, z, y, h, color, { open: w.kind === 'open', breakable: true });
  }
}

/** The same along Z (world x, z0..z1). */
function storeyZ(b: LevelBuilder, x: number, z0: number, z1: number, doors: readonly number[], wins: readonly Win[], y: number, h: number, color: string): void {
  const gaps = [...doors.map((d) => [d, d + DOOR_W] as const), ...wins.map((w) => [w.c - 0.6, w.c + 0.6] as const)].sort((p, q) => p[0] - q[0]);
  wallZAt(b, x, z0, z1, gaps, y, h, color, PART);
  for (const d of doors) b.box(x, y + (2.1 + h) / 2, d + DOOR_W / 2, PART, h - 2.1, DOOR_W, color);
  for (const w of wins) {
    if (w.kind === 'fixed') b.box(x, y + 0.45, w.c, PART, 0.9, 1.2, color).box(x, y + (2.1 + h) / 2, w.c, PART, h - 2.1, 1.2, color).box(x, y + 1.5, w.c, 0.1, 1.2, 1.2, '#5d7387');
    else windowZ(b, x, w.c, y, h, color, { open: w.kind === 'open', breakable: true });
  }
}

// ---------------------------------------------------------------------------------------------------- B7 The House

function buildB7(b: LevelBuilder, lips: number[], r: DeepResult): void {
  const { X, Z, Y } = frame('B7');
  const H = M7.clear;
  b.floor(X(22), Z(20), 44.45, 40.45, C.spoil, Y(0));
  b.surface('gravel', X(0), X(44), Z(0), Z(40), Y(0));
  // the cavern: west, south, east (the store door = A7's near door at z 19.4), north (A6 builds x -0.45..6.45 to 3.0)
  wallZAt(b, X(0), Z(-0.225), Z(40.225), [], Y(0), H, C.rock, OUTER);
  wallXAt(b, Z(0), X(-0.225), X(44.225), [], Y(0), H, C.rock, OUTER);
  wallZDoors(b, X(44), Z(-0.225), Z(40.225), [Z(19.4)], Y(0), H, C.rock, OUTER);
  wallXAt(b, Z(40), X(22), X(44.225), [], Y(0), H, C.rock, OUTER);
  b.box(X(3.1125), Y((AIR_CLEAR + H) / 2), Z(40), 6.675, H - AIR_CLEAR, OUTER, C.rock);
  roof(b, X(-0.225), Z(-0.225), X(44.225), Z(40.225), Y(H));
  // x 6.45..22 the north wall is solid rock up to S6's south wall: no 1.5 m slot (a split gap) between them
  b.box(14.225, Y(H / 2), (Z(39.775) - 8.3) / 2, 15.55, H, -8.3 - Z(39.775), C.rock);

  // the house (x 14..34, z 10..26): ground storey, first floor 3.2, roof 6.4 with the parapet and the roof hatch
  const F = M7.firstFloor;
  storeyX(b, Z(10), X(13.85), X(34.15), [X(23.4)], [], Y(0), F, C.block);
  storeyX(b, Z(26), X(13.85), X(34.15), [X(23.4)], [{ c: X(18), kind: 'glazed' }], Y(0), F, C.block);
  storeyZ(b, X(14), Z(10.15), Z(25.85), [], [{ c: Z(14), kind: 'open' }, { c: Z(22), kind: 'glazed' }], Y(0), F, C.block);
  // (T5 fix: the east open window is in the lobby at z 22.5; at z 13 it opened onto the timber stair)
  storeyZ(b, X(34), Z(10.15), Z(25.85), [Z(17.4)], [{ c: Z(22.5), kind: 'open' }], Y(0), F, C.block);
  storeyX(b, Z(10), X(13.85), X(34.15), [], [{ c: X(21.25), kind: 'open' }], Y(F), F, C.block);
  storeyX(b, Z(26), X(13.85), X(34.15), [], [{ c: X(28), kind: 'fixed' }], Y(F), F, C.block);
  storeyZ(b, X(14), Z(10.15), Z(25.85), [], [], Y(F), F, C.block);
  storeyZ(b, X(34), Z(10.15), Z(25.85), [], [{ c: Z(22), kind: 'fixed' }], Y(F), F, C.block);
  // ground: the lobby (north) and the back rooms (south) split at z 18; the timber stair up the east side (x 32.2..33.7)
  wallXDoors(b, Z(18), X(14.15), X(31.9), [X(17.4), X(26.4)], Y(0), F, C.block);
  const sLen = 18 * 0.28;
  b.stairs(X(33), Z(12 + sLen / 2), 1.5, sLen, F, 18, C.wood, 0, Y(0));
  b.surface('wood', X(32.2), X(33.8), Z(12), Z(12 + sLen), Y(0));
  // first floor (a stairwell over the stair) and the manager's office (x 14..24, z 10..16) at the south-west
  slabWithHoles(b, X(14.15), Z(10.15), X(33.85), Z(25.85), Y(F), [[X(32.15), Z(11.9), X(33.85), Z(12 + sLen + 0.2)]], C.vinyl);
  wallXDoors(b, Z(16), X(14.15), X(24), [X(22.4)], Y(F), F, C.block);
  wallZAt(b, X(24), Z(10.15), Z(16), [], Y(F), F, C.block, PART);
  b.block(X(17), Z(14.9), 1.6, 0.75, 0.8, C.wood, Y(F));
  r.devices['sw-store-key'] = { x: X(18.2), y: Y(F), z: Z(14.9), yaw: Math.PI / 2, label: 'Store key' };
  // the roof (hatch hole x 30.4..31.6, z 22..23.2; its fixed ladder from the first floor) and the parapet
  slabWithHoles(b, X(13.85), Z(9.85), X(34.15), Z(26.15), Y(M7.roof), [[X(30.4), Z(22), X(31.6), Z(23.2)]], C.conc);
  r.anchors['B7-hatch'] = b.ladder(X(31), Z(22.9), Y(F), Y(M7.roof), 0).id;
  const pt = 0.25;
  const py = M7.roof + M7.parapet / 2;
  lips.push(b.boxes.length, b.boxes.length + 1, b.boxes.length + 2, b.boxes.length + 3);
  b.box(X(24), Y(py), Z(9.85 + pt / 2), 20.3, M7.parapet, pt, C.block);
  b.box(X(24), Y(py), Z(26.15 - pt / 2), 20.3, M7.parapet, pt, C.block);
  b.box(X(13.85 + pt / 2), Y(py), Z(18), pt, M7.parapet, 16.3 - 2 * pt, C.block);
  b.box(X(34.15 - pt / 2), Y(py), Z(18), pt, M7.parapet, 16.3 - 2 * pt, C.block);
  // the roof downpipe on the south face (x 31.5): up to the parapet (the ledge pull's approach)
  r.anchors['B7-downpipe'] = b.pipeV(X(31.5), Z(9.75), Y(0), Y(M7.roof + M7.parapet), 0).id;
  // the lobby lockers (2, hides) on the north wall
  for (const lx of [14.6, 15.2]) b.block(X(lx), Z(25.55), 0.55, 2.0, 0.5, C.locker, Y(0));
  r.hideSpots.push(deepAt('B7', 14.6, 24.9), deepAt('B7', 15.2, 24.9));

  // the annex (kitchen, x 20..28, z 6..10, roof 3.2: the wall-jump lip); its back door in the south wall
  wallZAt(b, X(20), Z(6.15), Z(9.85), [], Y(0), M7.annex, C.block, PART);
  wallZAt(b, X(28), Z(6.15), Z(9.85), [], Y(0), M7.annex, C.block, PART);
  wallXDoors(b, Z(6), X(19.85), X(28.15), [X(23.4)], Y(0), M7.annex, C.block);
  lips.push(b.boxes.length);
  b.box(X(24), Y(M7.annex - 0.15), Z(7.925), 8.3, 0.3, 4.15, C.conc);
  b.block(X(26.5), Z(9.5), 2.4, 0.9, 0.6, C.wood, Y(0));

  // the water main (300 mm, y 4.9, z 6) wall to wall over the bench, the drop spot (8, 6) and the annex roof's edge
  r.anchors['B7-main'] = b.pipeH(X(0.5), Z(6), X(43.5), Z(6), Y(M7.main), C.pipe, 0.15).id;
  for (const px of [4, 12, 32, 40]) b.box(X(px), Y(M7.main / 2), Z(6.3), 0.12, M7.main, 0.12, C.steel, 0, 0, false);

  // the rock-bolting bench (x 0..1.5, z 4..30, top 3.0) and its plant ladder at the north end (z 30)
  lips.push(b.boxes.length);
  b.block(X(0.8625), Z(17), 1.275, M7.bench, 26, C.conc, Y(0));
  r.anchors['B7-bench-ladder'] = b.ladder(X(0.8625), Z(30.3), Y(0), Y(M7.bench), Math.PI).id;

  // sandbag walls 1.0 (low cover) on the east side, the skip, three recesses in the cavern wall
  b.block(X(37), Z(14), 0.6, M7.sandbag, 4, C.sand, Y(0));
  b.block(X(38.5), Z(18.5), 0.6, M7.sandbag, 3, C.sand, Y(0));
  b.block(X(37), Z(22.5), 0.6, M7.sandbag, 3, C.sand, Y(0));
  b.block(X(5.5), Z(33.5), 3, 1.5, 3, C.skip, Y(0));
  r.hideSpots.push(deepAt('B7', 5.5, 35.6));
  const recess = (x0: number, x1: number, zc: number): void => {
    for (const s of [-1, 1]) b.block(X((x0 + x1) / 2), Z(zc + s * 1.05), Math.abs(x1 - x0), 3.0, 0.5, C.rock, Y(0));
  };
  recess(0.225, 1.225, 34.3);
  recess(42.775, 43.775, 34.3);
  recess(42.775, 43.775, 3.3);
  r.hideSpots.push(deepAt('B7', 0.6, 34.3), deepAt('B7', 43.4, 34.3), deepAt('B7', 43.4, 3.3));

  // the house's other doors: front (north, the pair's porch), side (east), the annex door into the house, the back door
  b.door(X(23.4), Y(0), Z(26), DOOR_W, Math.PI / 2);
  b.door(X(34), Y(0), Z(17.4), DOOR_W, 0);
  b.door(X(23.4), Y(0), Z(10), DOOR_W, Math.PI / 2);
  b.door(X(23.4), Y(0), Z(6), DOOR_W, Math.PI / 2);
  b.door(X(22.4), Y(F), Z(16), DOOR_W, Math.PI / 2);

  r.debug.push(
    { id: 'B7', label: 'B7 The House (A6 door)', pos: deepAt('B7', 3, 38), yaw: Math.PI },
    { id: 'B7-roof', label: 'B7 house roof', pos: deepAt('B7', 20, 14, M7.roof), yaw: Math.PI },
  );
}

// ---------------------------------------------------------------------------------------------------- A7, A8

/** A 6 x 6 x 3.0 airlock between two bays on its west (near) and east (far) walls; doors at local z 2.4. */
function buildAirlock(b: LevelBuilder, bay: 'A7' | 'A8', r: DeepResult, medkit: boolean): void {
  const { X, Z, Y } = frame(bay);
  b.floor(X(3), Z(3), 6, 6 + 2 * OUTER, C.floor, Y(0));
  wallXAt(b, Z(0), X(0.225), X(5.775), [], Y(0), AIR_CLEAR, C.wall, OUTER);
  wallXAt(b, Z(6), X(0.225), X(5.775), [], Y(0), AIR_CLEAR, C.wall, OUTER);
  roof(b, X(-0.225), Z(-OUTER), X(6.225), Z(6 + OUTER), Y(AIR_CLEAR));
  b.block(X(3), Z(0.4), 3, 0.45, 0.45, C.wood, Y(0));
  b.box(X(5.76), Y(1.5), Z(3) + 1.1, 0.04, 0.6, 0.6, '#5d7387', 0, 0, false);
  if (medkit) b.box(X(3), Y(1.2), Z(5.75), 0.5, 0.4, 0.06, '#a33a30', 0, 0, false);
  r.doors[`${bay}-near`] = b.door(X(0), Y(0), Z(2.4), DOOR_W, 0, { locked: true, swing: 1 }).id;
  r.doors[`${bay}-far`] = b.door(X(6), Y(0), Z(2.4), DOOR_W, 0, { locked: true, swing: -1 }).id;
  r.devices[bay] = { x: X(3), y: Y(0), z: Z(5.6), yaw: Math.PI };
  r.debug.push({ id: bay, label: `${bay} airlock${medkit ? ' (medkit)' : ''}`, pos: deepAt(bay, 3, 3), yaw: Math.PI / 2 });
}

// ---------------------------------------------------------------------------------------------------- B8 The Range

/** The B8 catwalk stair's door (CS) plan centre (world), bolted from below (the floor side, -z). */
export const B8_CS_DOOR = deepAt('B8', 59, 23.5);

function buildB8(b: LevelBuilder, lips: number[], r: DeepResult): void {
  const { X, Z, Y } = frame('B8');
  const H = M8.clear;
  const cw = M8.catwalk;
  b.floor(X(31), Z(16), 62.45, 32.45, C.floor, Y(0));
  wallZDoors(b, X(0), Z(-0.225), Z(32.225), [Z(15.4)], Y(0), H, C.wall, OUTER);
  wallZDoors(b, X(62), Z(-0.225), Z(32.225), [Z(15.4)], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(0), X(-0.225), X(62.225), [], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(32), X(-0.225), X(62.225), [], Y(0), H, C.wall, OUTER);
  roof(b, X(-0.225), Z(-0.225), X(62.225), Z(32.225), Y(H));

  // FL firing line benches (one per lane, a gap to walk downrange), KL kit lockers on the west wall
  for (let i = 0; i < 6; i++) b.block(X(7.5), Z(2 + 4 * i + 1.5), 0.6, M8.bench, 2.6, C.wood, Y(0));
  for (let i = 0; i < 10; i++) b.block(X(0.5), Z(20.3 + i * 0.6), 0.55, 2.0, 0.58, C.locker, Y(0));
  // TG lane stands (visual; T7a places the dummies, B8_TARGETS), LG lamp gantry (visual frame) on lane 6
  for (const t of B8_TARGETS) b.box(t.x, 0.6, t.z + 0.4, 0.08, 1.2, 0.08, C.steel, 0, 0, false);
  for (const gz of [22.2, 25.8]) b.box(X(28), Y(1.6), Z(gz), 0.1, 3.2, 0.1, C.steel, 0, 0, false);
  b.box(X(28), Y(3.2), Z(24), 0.15, 0.15, 3.6, C.steel, 0, 0, false);
  // PW penetration wall on lane 2 at 15 m: plywood beside 0.2 block (T5: the panel is 0.1, BAYS 0.05, the thinnest the
  // 5 cm voxel grid holds; still the thin one); BR barrels (props, B8_BARRELS)
  b.box(X(23), Y(1.2), Z(7.4), 0.1, 2.4, 1.2, C.ply);
  b.box(X(23), Y(1.2), Z(8.6), 0.2, 2.4, 1.2, C.block);
  for (const p of B8_BARRELS) b.cylinders.push({ c: [p.x, 0.45, p.z], r: 0.3, h: 0.9, color: '#8a2a20', collide: false });
  // SH shoot-house barricades: low 1.0 and high 2.0 (B8-F's beat at x 44 kept clear)
  for (const [x, z, w, d] of [[34, 5, 0.4, 3], [40, 9.5, 3, 0.4], [50, 6, 0.4, 3], [53.5, 14, 3, 0.4]] as const) b.block(X(x), Z(z), w, M8.low, d, C.sand, Y(0));
  for (const [x, z, w, d] of [[37, 14, 0.4, 3], [48, 11, 2.5, 0.4]] as const) b.block(X(x), Z(z), w, M8.high, d, C.block, Y(0));

  // CW the catwalk (crane gantry, x 14..58, z 28..32, 4.0) with its rail; RT the tower cabin (x 8..14) glazed but for
  // the ladder's opening at x 8.5..9.5; LD the ladder at x 9
  deck(b, X(14), Z(28), X(57.85), Z(31.775), Y(cw), C.grate);
  b.surface('grate', X(14), X(58), Z(28), Z(32), Y(cw));
  rail(b, X(14), Z(28), X(57.85), Z(28), Y(cw));
  for (const px of [20, 32, 44, 56]) b.box(X(px), Y(cw / 2), Z(28.2), 0.15, cw - 0.3, 0.15, C.steel, 0, 0, false);
  deck(b, X(8), Z(26), X(14), Z(31.775), Y(cw), C.vinyl);
  glass(b, X(8), Z(26), X(8.5), Z(26), Y(cw), 3);
  glass(b, X(9.5), Z(26), X(14), Z(26), Y(cw), 3);
  glass(b, X(8), Z(26), X(8), Z(31.775), Y(cw), 3);
  roof(b, X(7.95), Z(25.95), X(14), Z(31.775), Y(cw + 3));
  r.anchors['B8-LD'] = b.ladder(X(9), Z(25.7), Y(0), Y(cw), 0).id;
  // CS: the catwalk stair (x 58..60) from the landing (z 30..32) down south to the floor at z 24, caged to 7.0; its
  // door at the foot (z 23.5) bolted from below
  deck(b, X(58), Z(30), X(60), Z(31.775), Y(cw), C.grate);
  const sLen = 6;
  b.stairs(X(59), Z(27), 1.6, sLen, cw, M8.stairRisers, C.grate, 0, Y(0));
  wallZAt(b, X(57.85), Z(23.35), Z(30), [], Y(0), 7, C.wall, PART);
  // (the east side is solid to the bay wall: no 1.5 m slot between the cage and the wall)
  b.block(X(60.8875), Z(27.5625), 1.775, 7, 8.425, C.wall, Y(0));
  wallXDoors(b, Z(23.5), X(57.7), X(60.3), [X(58.4)], Y(0), 7, C.wall);
  r.doors['B8-cs'] = b.door(X(58.4), Y(0), Z(23.5), DOOR_W, Math.PI / 2, { locked: true, swing: -1 }).id;
  // SP the sniper scaffold (x 56..60, z 18..22, 3.0: T5 moves it 2 m south, 1.35 clear of CS's door) and its ladder
  lips.push(b.boxes.length);
  b.block(X(58), Z(20), 4, M8.scaffold, 4, C.steel, Y(0));
  r.anchors['B8-SP-ladder'] = b.ladder(X(55.7), Z(20), Y(0), Y(M8.scaffold), Math.PI / 2).id;
  // the cease-fire switch at the far end (east wall)
  r.devices['sw-cease-fire'] = { x: X(61.6), y: Y(0), z: Z(9), yaw: -Math.PI / 2, label: 'Cease fire' };

  r.debug.push(
    { id: 'B8', label: 'B8 The Range (firing line)', pos: deepAt('B8', 2, 16), yaw: Math.PI / 2 },
    { id: 'B8-RT', label: 'B8 range control tower', pos: deepAt('B8', 11, 29, cw), yaw: Math.PI },
  );
}

// ---------------------------------------------------------------------------------------------------- B9 The Plot

/** One enclosed stair tower (SW or SE): two lanes of 13-riser flights (2.25 each) 0 -> 4.5 -> 9.0, doors at the door end. */
function stairTower(b: LevelBuilder, west: boolean): void {
  const { X, Z, Y } = frame('B9');
  // mirror: local x for the SW tower, 44 - x for the SE one
  const mx = (x: number): number => (west ? X(x) : X(44 - x));
  const up = west ? Math.PI / 2 : -Math.PI / 2;
  const inner = west ? 8 : 36;
  wallZAt(b, X(inner), Z(0.225), Z(4.15), [], Y(0), M9.tower, C.wall, PART);
  for (const [y, h] of [[0, M9.b1], [M9.b1, M9.b2 - M9.b1], [M9.b2, M9.tower - M9.b2]] as const) {
    const d = west ? 0.6 : 44 - 1.8;
    wallXDoors(b, Z(4), west ? X(0.225) : X(35.85), west ? X(8.15) : X(43.775), [X(d)], Y(y), h, C.wall);
    b.door(X(d), Y(y), Z(4), DOOR_W, Math.PI / 2);
  }
  roof(b, west ? X(-0.225) : X(35.85), Z(-0.225), west ? X(8.15) : X(44.225), Z(4.15), Y(M9.tower));
  // (T5 fix) a 4.7 run (going 0.36) leaves the far landings 1.35 deep: room for the turn on the nav grid
  const run = 4.7;
  const top = 1.8 + run;
  const rise = M9.b1 / 2;
  const cx = (mx(1.8) + mx(top)) / 2;
  for (const [lane, dir, y] of [[1.15, up, 0], [2.95, -up, rise], [1.15, up, M9.b1], [2.95, -up, M9.b1 + rise]] as const) {
    b.stairs(cx, Z(lane), 1.7, run, rise, 13, C.conc, dir, Y(y));
  }
  // the far landings (2.25 solid, 6.75 a deck), the door-end landings (4.5, 9.0); no spine (a 1.8 m lane would be a split)
  const far0 = Math.min(mx(top), mx(7.85));
  const far1 = Math.max(mx(top), mx(7.85));
  b.block((far0 + far1) / 2, Z(2.04), far1 - far0, rise, 3.62, C.conc, Y(0));
  deck(b, far0, Z(0.225), far1, Z(3.85), Y(M9.b1 + rise), C.conc);
  const near0 = Math.min(mx(0.225), mx(1.8));
  const near1 = Math.max(mx(0.225), mx(1.8));
  deck(b, near0, Z(0.225), near1, Z(3.85), Y(M9.b1), C.conc);
  deck(b, near0, Z(0.225), near1, Z(3.85), Y(M9.b2), C.conc);
}

function buildB9(b: LevelBuilder, lips: number[], r: DeepResult): void {
  const { X, Z, Y } = frame('B9');
  const H = M9.clear;
  b.floor(X(22), Z(29), 44.45, 58.45, C.vinyl, Y(0));
  // outer walls: west (A8's far door at z 25.4), east (the staff tunnel door at z 5, north of the SE tower), south,
  // north (z 58: L9's back)
  wallZDoors(b, X(0), Z(-0.225), Z(52.225), [Z(25.4)], Y(0), H, C.wall, OUTER);
  wallZDoors(b, X(44), Z(-0.225), Z(52.225), [Z(5)], Y(0), H, C.wall, OUTER);
  r.doors['B9-tunnel'] = b.door(X(44), Y(0), Z(5), DOOR_W, 0, { locked: true }).id;
  wallXAt(b, Z(0), X(-0.225), X(44.225), [], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(52), X(-0.225), X(18), [], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(52), X(26), X(44.225), [], Y(0), H, C.wall, OUTER);
  roof(b, X(-0.225), Z(-0.225), X(44.225), Z(52.225), Y(H));
  // the plot's north wall (z 44) with the lift lobby's opening (x 18..26, 6.0 high); the lobby (x 18..26, z 44..52)
  wallXAt(b, Z(44), X(0.225), X(18), [], Y(0), H, C.wall, PART);
  wallXAt(b, Z(44), X(26), X(43.775), [], Y(0), H, C.wall, PART);
  b.box(X(22), Y((M9.lobby + H) / 2), Z(44), 8, H - M9.lobby, PART, C.wall);
  wallZAt(b, X(18), Z(44.15), Z(52.225), [], Y(0), H, C.wall, PART);
  wallZAt(b, X(26), Z(44.15), Z(52.225), [], Y(0), H, C.wall, PART);
  wallXDoors(b, Z(52), X(18), X(26), [X(21.4)], Y(0), H, C.wall, OUTER);
  roof(b, X(18.15), Z(44.15), X(25.85), Z(51.775), Y(M9.lobby));
  // L9 the lift car (x 18..26, z 52..58), its door locked (the two-key pair gate); the course ends inside
  wallZAt(b, X(18), Z(52.225), Z(58.225), [], Y(0), AIR_CLEAR, C.steel, OUTER);
  wallZAt(b, X(26), Z(52.225), Z(58.225), [], Y(0), AIR_CLEAR, C.steel, OUTER);
  wallXAt(b, Z(58), X(17.775), X(26.225), [], Y(0), AIR_CLEAR, C.steel, OUTER);
  roof(b, X(17.775), Z(52.225), X(26.225), Z(58.225), Y(AIR_CLEAR));
  r.doors['L9-door'] = b.door(X(21.4), Y(0), Z(52), DOOR_W, Math.PI / 2, { locked: true }).id;
  r.devices.end = { x: X(22), y: Y(0), z: Z(56), yaw: Math.PI, label: 'Finish' };
  r.devices['K-A'] = { x: X(19.5), y: Y(0), z: Z(46), yaw: 0, label: 'Key A' };
  r.devices['K-B'] = { x: X(24.5), y: Y(0), z: Z(46), yaw: 0, label: 'Key B' };

  stairTower(b, true);
  stairTower(b, false);

  // B-1 (4.5): west x 0..8, south z 0..8, east x 36..44 (3 m walkways before 5 m cabin zones); the north-west gap
  // (x 7..8, z 37..39) is the only lip, over a pier (its brace wall for the boost)
  const b1 = M9.b1;
  deck(b, X(0.225), Z(4.15), X(8), Z(37), Y(b1), C.grate);
  deck(b, X(0.225), Z(37), X(7), Z(39), Y(b1), C.grate);
  lips.push(b.boxes.length);
  deck(b, X(7), Z(37), X(8), Z(39), Y(b1), C.grate);
  deck(b, X(0.225), Z(39), X(8), Z(43.85), Y(b1), C.grate);
  // (T5 fix: x 8..36, no 0.15 slot between it and the west / east walkways)
  deck(b, X(8), Z(4.15), X(36), Z(8), Y(b1), C.grate);
  deck(b, X(8.15), Z(0.225), X(35.85), Z(4.15), Y(b1), C.grate);
  deck(b, X(36), Z(4.15), X(43.775), Z(43.85), Y(b1), C.grate);
  b.block(X(7.8), Z(38), 0.4, b1 - 0.3, 2, C.conc, Y(0));
  rail(b, X(8), Z(8), X(8), Z(37), Y(b1));
  rail(b, X(8), Z(39), X(8), Z(43.85), Y(b1));
  rail(b, X(8), Z(8), X(36), Z(8), Y(b1));
  rail(b, X(36), Z(8), X(36), Z(43.85), Y(b1));
  // B-1 cabins: west (key A, x 0..5, z 24..32; the tube station), east (key B, x 39..44, z 14..22), south (two, two
  // doors each); west / east cabins run up to B-2's underside, the south ones are roofed at 7.5
  const wallTop = M9.b2 - 0.3 - b1;
  storeyZ(b, X(5), Z(24), Z(32), [Z(27.4)], [], Y(b1), wallTop, C.wall);
  wallXAt(b, Z(24), X(0.225), X(5.15), [], Y(b1), wallTop, C.wall, PART);
  wallXAt(b, Z(32), X(0.225), X(5.15), [], Y(b1), wallTop, C.wall, PART);
  b.block(X(3), Z(26), 0.8, 0.75, 1.6, C.wood, Y(b1));
  r.devices['pk-key-a'] = { x: X(3.6), y: Y(b1), z: Z(26), yaw: -Math.PI / 2, label: 'Take key A' };
  b.door(X(5), Y(b1), Z(27.4), DOOR_W, 0);
  storeyZ(b, X(39), Z(14), Z(22), [Z(17.4)], [], Y(b1), wallTop, C.wall);
  wallXAt(b, Z(14), X(38.85), X(43.775), [], Y(b1), wallTop, C.wall, PART);
  wallXAt(b, Z(22), X(38.85), X(43.775), [], Y(b1), wallTop, C.wall, PART);
  b.block(X(43.4), Z(19.5), 0.6, 2.0, 1.2, C.locker, Y(b1));
  r.devices['pk-key-b'] = { x: X(42.8), y: Y(b1), z: Z(19.5), yaw: Math.PI / 2, label: 'Take key B' };
  b.door(X(39), Y(b1), Z(17.4), DOOR_W, 0);
  for (const [x0, x1, d0, d1] of [[10, 18, 11, 15.8], [24, 34, 25, 31.8]] as const) {
    storeyX(b, Z(5), X(x0), X(x1), [X(d0), X(d1)], [], Y(b1), 3.0, C.wall);
    wallZAt(b, X(x0), Z(0.225), Z(5), [], Y(b1), 3.0, C.wall, PART);
    wallZAt(b, X(x1), Z(0.225), Z(5), [], Y(b1), 3.0, C.wall, PART);
    roof(b, X(x0 - 0.15), Z(0.225), X(x1 + 0.15), Z(5.15), Y(b1 + 3.0));
    for (const d of [d0, d1]) b.door(X(d), Y(b1), Z(5), DOOR_W, Math.PI / 2);
  }
  r.hideSpots.push(deepAt('B9', 1.0, 31, b1), deepAt('B9', 43.0, 15, b1));
  // the dark ring's recesses under B-1 (west, east)
  r.hideSpots.push(deepAt('B9', 0.8, 14), deepAt('B9', 43.2, 34));

  // B-2 (9.0): west x 0..6, east x 38..44, the bridge (z 40..43.85) across the north end; balustrades with two gaps:
  // the zipline's launch (B-2 east, z 21.5..25) and the rope point (bridge, x 13.5..14.5)
  const b2 = M9.b2;
  deck(b, X(0.225), Z(4.15), X(6), Z(40), Y(b2), C.grate);
  deck(b, X(38), Z(4.15), X(43.775), Z(40), Y(b2), C.grate);
  deck(b, X(0.225), Z(40), X(43.775), Z(43.85), Y(b2), C.grate);
  rail(b, X(6), Z(4.15), X(6), Z(40), Y(b2));
  rail(b, X(38), Z(4.15), X(38), Z(21.5), Y(b2));
  rail(b, X(38), Z(25), X(38), Z(40), Y(b2));
  rail(b, X(6), Z(40), X(13.5), Z(40), Y(b2));
  rail(b, X(14.5), Z(40), X(38), Z(40), Y(b2));
  // the senior controller's cabin (B-2 east, x 41..44, z 30..40): the case; the controller's desk on the bridge
  storeyZ(b, X(41), Z(30), Z(39.85), [Z(34.4)], [], Y(b2), H - b2, C.wall);
  wallXAt(b, Z(30), X(40.85), X(43.775), [], Y(b2), H - b2, C.wall, PART);
  wallXAt(b, Z(40), X(40.85), X(43.775), [], Y(b2), H - b2, C.wall, PART);
  b.door(X(41), Y(b2), Z(34.4), DOOR_W, 0);
  r.devices['pk-case'] = { x: X(42.8), y: Y(b2), z: Z(37), yaw: Math.PI / 2, label: 'Take the case' };
  b.block(X(22), Z(40.6), 2.0, 0.75, 0.6, C.wood, Y(b2));
  // the rope point on the bridge rail (rope bottom = the plot floor) and the zipline (B-2 east -> the lobby rail;
  // the cable end 1.9 over the lobby floor: the rider lands on it)
  r.anchors['B9-rappel'] = b.rappel(X(14), Y(b2), Z(40), Math.PI, b2).id;
  r.anchors['B9-zipline'] = b.zipline({ x: X(38.5), y: Y(b2 + 2.5), z: Z(22) }, { x: X(21.5), y: Y(1.9), z: Z(49.5) }).id;
  b.box(X(21.5), Y(1.0), Z(49.8), 0.1, 2.0, 0.1, C.steel, 0, 0, false);

  // the plot floor: the map table (0.9, back-lit), plotting stands (1.4 boards)
  b.block(X(26), Z(26), 6, M9.table, 4, C.table, Y(0));
  for (const [x, z, yaw] of [[14, 30, 0], [18, 36, Math.PI / 2], [30, 36, Math.PI / 2], [32, 12, 0]] as const) b.block(X(x), Z(z), 2, 1.4, 0.1, C.wood, Y(0), yaw);

  // the message-tube duct (1.5 x 1.2): from the key A cabin's tube station (west wall) down inside the west wall,
  // under the void north of the plot, out of the inspection door in the lobby's west wall (the P3 switch beside it)
  const path: P3[] = [
    { x: X(0.225), y: Y(b1), z: Z(30.5) },
    { x: X(-1.2), y: Y(b1), z: Z(30.5) },
    { x: X(-1.2), y: Y(b1), z: Z(33) },
    { x: X(-1.2), y: Y(0), z: Z(46) },
    { x: X(-1.2), y: Y(0), z: Z(48) },
    { x: X(18.15), y: Y(0), z: Z(48) },
  ];
  b.box(X(0.2), Y(b1 + 0.5), Z(30.5), 0.04, 1.0, 1.2, C.grate, 0, 0, false);
  b.box(X(18.12), Y(0.6), Z(48), 0.04, 1.2, 1.4, C.steel, 0, 0, false);
  r.anchors['B9-duct'] = b.duct(
    path,
    { pos: { x: X(0.225), y: Y(b1 + 0.05), z: Z(30.5) }, nx: 1, ny: 0, nz: 0, where: 'wall' },
    { pos: { x: X(18.15), y: Y(0.05), z: Z(48) }, nx: 1, ny: 0, nz: 0, where: 'wall' },
  ).id;

  r.debug.push(
    { id: 'B9', label: 'B9 The Plot (A8 door)', pos: deepAt('B9', 2, 26), yaw: Math.PI / 2 },
    { id: 'B9-B2', label: 'B9 balcony B-2 west', pos: deepAt('B9', 3, 20, b2), yaw: Math.PI / 2 },
    { id: 'L9', label: 'L9 exit lift', pos: deepAt('L9', 22, 55), yaw: Math.PI },
  );
}

/** Nav flood seeds on every Deep floor and storey guards will use (open floor, never on furniture). */
export function deepNavSeeds(): P3[] {
  const s7 = (x: number, z: number, y = 0): P3 => deepAt('B7', x, z, y);
  const s8 = (x: number, z: number, y = 0): P3 => deepAt('B8', x, z, y);
  const s9 = (x: number, z: number, y = 0): P3 => deepAt('B9', x, z, y);
  return [
    // B7: cavern, house ground (lobby, back rooms), first floor, office, roof, annex (in, on), the bench
    s7(10, 20), s7(24, 22), s7(20, 13), s7(28, 20, M7.firstFloor), s7(19, 12, M7.firstFloor), s7(26, 18, M7.roof), s7(24, 8), s7(25, 8, M7.annex), s7(0.86, 15, M7.bench),
    // B8: the floor, the corridor behind the stands, the catwalk, the tower, the scaffold
    s8(20, 14), s8(40, 27), s8(30, 30, M8.catwalk), s8(11, 29, M8.catwalk), s8(58, 20, M8.scaffold),
    // B9: floor, ring (west, south, east), B-1 (west, south, east), B-2 (west, east), the bridge, the lobby, L9
    s9(20, 20), s9(4, 16), s9(20, 6), s9(40, 30), s9(6.5, 16, M9.b1), s9(20, 6.5, M9.b1), s9(37.5, 30, M9.b1),
    s9(3, 24, M9.b2), s9(40, 28, M9.b2), s9(22, 42.5, M9.b2), s9(22, 48), s9(22, 55),
  ];
}

/**
 * Build B7, A7, B8, A8, B9 and L9 into `b`. Afterwards every piece but the planned lips is `noLedge`, and the pieces
 * the 'epic' detail pass dresses as floor are taken out into `floors` (the map adds them last). One work lamp a bay.
 */
export function buildDeep(b: LevelBuilder): DeepResult {
  const r: DeepResult = { doors: {}, devices: {}, anchors: {}, hideSpots: [], debug: [], floors: [] };
  const from = b.boxes.length;
  const lips: number[] = [];
  buildB7(b, lips, r);
  buildAirlock(b, 'A7', r, false);
  buildB8(b, lips, r);
  buildAirlock(b, 'A8', r, true);
  buildB9(b, lips, r);
  const keep = new Set(lips);
  for (let k = from; k < b.boxes.length; k++) if (!keep.has(k)) b.boxes[k]!.noLedge = true;
  // floor-like pieces (detailPass: collide, visible, flat, sy <= 0.6, area >= 16, top < 6) go to the end of the map
  const rest: BoxPiece[] = [];
  for (const p of b.boxes.splice(from)) {
    const top = p.c[1] + p.s[1] / 2;
    const floorLike = p.collide && p.visible !== false && Math.abs(p.pitch) <= 1e-3 && !p.detail && p.s[1] <= 0.6 && p.s[0] * p.s[2] >= 16 && top < 6;
    (floorLike ? r.floors : rest).push(p);
  }
  b.boxes.push(...rest);
  b.light({ ...deepAt('B7', 22, 20, 8.5), radius: 30, intensity: 0.8 });
  b.light({ ...deepAt('B8', 31, 16, 7.5), radius: 34, intensity: 0.9 });
  b.light({ ...deepAt('B9', 22, 26, 12.5), radius: 36, intensity: 0.9 });
  return r;
}
