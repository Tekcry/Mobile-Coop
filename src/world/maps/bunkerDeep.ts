import type { BoxPiece, LevelBuilder } from '../levelBuilder';
import type { P3 } from '../anchors';
import type { CourseDevice, CourseObjective, ElementFlag } from '../../game/course/courseDef';
import { wallXAt, wallZAt, windowX, windowZ } from './storey';
import { glass as screen, led, slabWithHoles } from './bunkerUpper';
import { B4_COOP_LIPS, type PlantLip } from './bunkerShaft';
import { deck, roof, wallXDoors, wallZDoors } from './bunkerPlant';

/**
 * Fallow, the Deep level, BAYS v2 (T5g; docs/archive/training/BAYS.md sections 0, B7, B8, B9; y 0): B7 The House (the cavern
 * and the kill house), airlock A7, B8 The Range, airlock A8 (medkit), B9 The Plot and the exit lift L9. Every
 * coordinate below is a BAYS local coordinate; `deepAt` / the per-bay `X` / `Z` / `Y` add the bay's offset.
 *
 * The line (R1): A6 -> the cavern (one guarded room: floor, bench, roofs, house) -> the store door (A7's near door, the
 * store-key gate) -> A7 -> the firing line -> the lanes / shoot-house or RT -> CW -> CS (bolted from below) -> the far
 * end -> A8 -> the well (floor, ring, B-1, B-2, bridge: parallel routes) -> the lobby -> the lift door (keys, case, pair
 * gate) -> L9. Every bay is a closed box (walls to its roof); the house windows lead only into the house; CS is caged to
 * 7.0; the lift car is closed but for its door; the message-tube duct and the zipline end in the lobby, before the lift.
 *
 * Ledges (A25): every piece is `noLedge` except the planned lips (`DEEP_LIPS`): the rock-bolting bench, the annex roof,
 * the roof parapet, the sniper scaffold and B9's north-west balustrade gap (the co-op lip, in `BUNKER_COOP_LIPS`).
 * Glass (balustrades, the firing-line screen, RT, the office partitions) is A26 see-through collision, never a lip.
 */

export type DeepBay = 'B7' | 'A7' | 'B8' | 'A8' | 'B9' | 'L9';

/** BAYS 0.1 offsets (v2); every Deep bay's floor is y 0. L9 uses B9's frame (the car is x 12..20, z 38..44). */
export const DEEP_OFFSET: Record<DeepBay, readonly [number, number]> = {
  B7: [6, -69],
  A7: [36, -57],
  B8: [42, -62],
  A8: [102, -57],
  B9: [108, -66],
  L9: [108, -66],
};

/** BAYS 0.1 boxes in world plan (R4 footprints): B7 30 x 30, B8 60 x 16, B9 32 x 38 (well and lobby), L9 8 x 6. */
export const DEEP_BOX: Record<DeepBay, readonly [number, number, number, number]> = {
  B7: [6, -69, 36, -39],
  A7: [36, -57, 42, -51],
  B8: [42, -62, 102, -46],
  A8: [102, -57, 108, -51],
  B9: [108, -66, 140, -28],
  L9: [120, -28, 128, -22],
};

/** World point from a bay's local (x, z, y above the floor). */
export function deepAt(bay: DeepBay, x: number, z: number, y = 0): P3 {
  const o = DEEP_OFFSET[bay];
  return { x: x + o[0], y, z: z + o[1] };
}

/** B7 metrics (local heights). */
export const B7_METRICS = {
  clear: 10,
  firstFloor: 3.2,
  roof: 6.4,
  /** 0.9 (T5; BAYS 1.1 before T5g): the ledge pull's height (victim's feet 1.0 over the hanging feet) sits inside 0.8-2.6. */
  parapet: 0.9,
  annex: 3.2,
  /** 4.9 (T5; BAYS 4.6 before T5g): a standing grab (1.6-2.7) from the bench (1.9) and the annex roof (1.7); drop 3.0 onto B7-W. */
  main: 4.9,
  bench: 3.0,
  sandbag: 1.0,
  /** The manager's window sill (first floor + 0.9). */
  sill: 4.1,
} as const;

/** B8 metrics. */
export const B8_METRICS = { clear: 8, catwalk: 4.0, scaffold: 3.0, bench: 0.9, low: 1.0, high: 2.0, stairRisers: 22, cage: 7.0 } as const;

/** B9 metrics. */
export const B9_METRICS = { clear: 14, b1: 4.5, b2: 9.0, rail: 1.1, lobby: 6.0, table: 0.9, tower: 11.5 } as const;

const M7 = B7_METRICS;
const M8 = B8_METRICS;
const M9 = B9_METRICS;

const OUTER = 0.45;
const PART = 0.3;
const DOOR_W = 1.2;
const DOOR_H = 2.1;
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
  med: '#a33a30',
} as const;

function lipBox(bay: DeepBay, id: string, x0: number, z0: number, x1: number, z1: number, top: number, floor = 0): PlantLip {
  const a = deepAt(bay, x0, z0);
  const e = deepAt(bay, x1, z1);
  return { id, bay, box: [a.x - 0.05, a.z - 0.05, e.x + 0.05, e.z + 0.05], top: top, floor };
}

/** B9's planned co-op lip (level-design 11.3): the B-1 balustrade gap at the north-west, 4.5 over the plot floor. */
export const B9_COOP_LIP: PlantLip = lipBox('B9', 'B9-NW', 5, 26, 6, 28, M9.b1);

/** Every co-op lip on the course: B4's (W1, W2, the outlet) and B9's north-west gap. */
export const BUNKER_COOP_LIPS: readonly PlantLip[] = [...B4_COOP_LIPS, B9_COOP_LIP];

/** Every planned lip on the Deep level (nothing else makes a ledge). */
export const DEEP_LIPS: readonly PlantLip[] = [
  lipBox('B7', 'WB', 0.225, 4, 1.5, 24, M7.bench),
  lipBox('B7', 'AX', 11.85, 4.85, 18.15, 8, M7.annex),
  lipBox('B7', 'PR', 7.85, 7.85, 22.15, 20.15, M7.roof + M7.parapet, M7.roof),
  lipBox('B8', 'SP', 54, 7, 57, 10, M8.scaffold),
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

/** Deep device mount points (BAYS B7 store keypad, B8 CAM-R, B9 devices, the A8 wall medkit). */
export const DEEP_DEVICES: readonly DeepDevice[] = [
  dev('KP7', 'keypad', 'B7', 29.7, 16.9, 1.2, 270, { door: 'A7-near' }),
  dev('CAM-R', 'camera', 'B8', 24, 11, 3.2, 270),
  dev('CAM-P1', 'cameraSweep', 'B9', 16, 27.8, 6.0, 180, { sweep: [deg(135), deg(225)] }),
  dev('CAM-P2', 'camera', 'B9', 16, 31.3, 3.0, 0),
  dev('B9-DESK', 'desk', 'B9', 16, 28.8, M9.b2, 180),
  dev('B9-BEAM', 'beam', 'B9', 12.2, 31.4, 1.4, 90, { to: deepAt('B9', 19.8, 31.4, 1.4) }),
  dev('B9-PIR', 'pir', 'B9', 2.5, 12, M9.b2 + 2.5, 0),
  dev('B9-ALARM', 'alarm', 'B9', 16, 0.3, M9.b1 + 1.2, 0),
  dev('B9-REINF', 'reinforce', 'B9', 31.2, 5.6, 0, 270, { door: 'B9-tunnel' }),
  dev('B9-MED', 'medkit', 'B9', 0.3, 29, 1.2, 90),
  dev('A8-MED', 'medkit', 'A8', 3, 5.7, 1.2, 180),
];

/**
 * Guard relief doors (A62): a staff door in an outer wall of each guarded room, locked to players for good (a visual
 * leaf only: no door anchor, no interact, no gap, never on the room graph). The relief spawns at `spawn`, outside the
 * bay's nav (T7b).
 */
export const DEEP_RELIEF_DOORS: readonly { id: string; bay: DeepBay; guards: string[]; pos: P3; yaw: number; spawn: P3 }[] = [
  { id: 'B7-relief', bay: 'B7', guards: ['B7-P1', 'B7-P2', 'B7-W', 'B7-R', 'B7-O', 'B7-H'], pos: deepAt('B7', 21, 0.25), yaw: 0, spawn: deepAt('B7', 21, -1.5) },
  { id: 'B8-relief', bay: 'B8', guards: ['B8-S', 'B8-E', 'B8-F'], pos: deepAt('B8', 45, 0.25), yaw: 0, spawn: deepAt('B8', 45, -1.5) },
  { id: 'B9-relief', bay: 'B9', guards: ['B9-1', 'B9-2', 'B9-3', 'B9-5', 'B9-O'], pos: deepAt('B9', 31.75, 18), yaw: -Math.PI / 2, spawn: deepAt('B9', 33.5, 18) },
  { id: 'B9-relief-lobby', bay: 'B9', guards: ['B9-4'], pos: deepAt('B9', 19.83, 35.5), yaw: -Math.PI / 2, spawn: deepAt('B9', 21.5, 35.5) },
];

/**
 * B8 props T7a places: dummies on the lane stands at 10, 25 and 50 m from the firing-line screen (x 4; lanes 1-6, 2 m
 * each, centres z 1..11) and the two explosive barrels. Lanes 4 and 5's far stands are at 45 m (x 49): at 50 m they
 * stand in the sniper scaffold.
 */
export const B8_TARGETS: readonly P3[] = [0, 1, 2, 3, 4, 5].flatMap((i) => [10, 25, i === 3 || i === 4 ? 45 : 50].map((m) => deepAt('B8', 4 + m, 1 + 2 * i)));
export const B8_BARRELS: readonly P3[] = [deepAt('B8', 34, 8.6), deepAt('B8', 34, 9.4)];

/** BAYS v2 objective tables (R5, A47): the names T7a turns into drills (`DrillDef.name`), in table order. Lines marked
 *  "not a drill until X" are element flags (greyed lines, T7a), not objectives. */
const B7_OBJ = [
  'Open a door quietly, open one fast, bash one', 'Take down a guard from behind', 'Front or side takedown on a calm guard',
  'Corner takedown from the wall', 'Takedown over the sandbags', 'Drop on the west rounds guard from the water main',
  'Inverted takedown from the water main', 'Ledge pull the roof watch off the parapet', 'Window takedown on the officer',
  'Elbow-strike a guard', 'Grab a guard: walk him, draw, hold him as a shield, then knock him out or shove him',
  'Question the officer for the store code', 'Carry a body to a hiding place', 'Drag a body', 'Dual takedown on the talking pair',
  'Open the store door with the code', 'Shoot out a lamp', 'Both on the airlock pad',
];
const B8_OBJ = [
  'Take your kit from the lockers', 'Aim to draw and fire the pistol (no hip fire)', 'Hit the 25 m dummies with the SMG and the rifle',
  'Hit the 10 m dummy with the shotgun', 'Reload, then swap weapons', 'Land a headshot', 'Fire suppressed, then loud: watch the noise ring',
  'Shoot through the plywood wall', 'Blow the barrels with a shot or a frag', 'Throw a frag grenade', 'Gas the dummy group',
  'Throw a flashbang', 'EMP the lamp gantry or its camera', 'Throw a noisemaker onto a barricade', 'Stick a sticky cam on the shoot-house corner',
  'Set a proximity mine at the shoot-house gate', 'Shoot out a gantry lamp', 'Climb to the tower and hit the 50 m dummy with the sniper rifle',
  'Live fire: cover your partner from the catwalk', 'Advance through the shoot-house to the far end',
  'Throw the cease-fire switch and unbolt the catwalk stair', 'Both on the airlock pad',
];
const B9_OBJ = [
  'Find key A in the west cabin', 'Find key B in the east cabin', "Recover the case from the controller's cabin", 'Shoot out a lamp',
  'Turn both lift keys together', 'Ride the lift out',
];
export const DEEP_OBJECTIVES: readonly CourseObjective[] = [
  ...B7_OBJ.map((text, i) => ({ id: `B7-${i + 1}`, bay: 'B7', text })),
  ...B8_OBJ.map((text, i) => ({ id: `B8-${i + 1}`, bay: 'B8', text })),
  ...B9_OBJ.map((text, i) => ({ id: `B9-${i + 1}`, bay: 'B9', text })),
];

/** Elements whose behaviour is a stub until T6 / T7a / T7b: built as geometry or data, not final. */
export const DEEP_ELEMENTS: Record<'B7' | 'B8' | 'B9', ElementFlag[]> = {
  B7: [
    { id: 'B7-guards', feature: 'B7-P1 / P2 / W / R / O / H posts, routes, lures and relief through B7-relief (A62): T7b', final: false },
    { id: 'B7-lights', feature: 'L7 circuits K1 / KH-G / KH-1, breakable floods and porch lamp, the A61 re-lamp (T6 / T7a): one work lamp now', final: false },
    { id: 'B7-store-code', feature: 'store code from B7-O (interrogate, V3): now the desk-drawer "Store key" pickup (A37)', final: false },
    { id: 'B7-greyed', feature: 'greyed lines: whistle (Phase 2); drag is carry until loco 27 (T7a)', final: false },
  ],
  B8: [
    { id: 'B8-guards', feature: 'B8-S / E / F posts, the live-fire trigger and relief through B8-relief (A62): T7b', final: false },
    { id: 'B8-lights', feature: 'L8 circuits R1-R5, gantry lamps L8-G1..4 and the A61 re-lamp (T6 / T7a): one work lamp now', final: false },
    { id: 'B8-props', feature: 'dummies (B8_TARGETS), barrels (B8_BARRELS), CAM-R: placed by T7a', final: false },
    { id: 'B8-greyed', feature: 'greyed lines: pistol secondary, shock round (V3), bottle (Phase 6), ring airfoil (backlog) (T7a)', final: false },
  ],
  B9: [
    { id: 'B9-guards', feature: 'B9-1..5, the dog and B9-O, relief through B9-relief / B9-relief-lobby (A62): T7b', final: false },
    { id: 'B9-devices', feature: 'CAM-P1 / P2, desk feeds, beam, PIR, alarm panel and reinforcements are mount points only (T7a)', final: false },
    { id: 'B9-lights', feature: 'L9 circuits P1-P3 (P3 switch inside the duct door), table back-light, the A61 re-lamp (T6 / T7a)', final: false },
    { id: 'B9-greyed', feature: 'greyed line: clutch save, drag a downed partner, medkit on a mate (Phase 5); the key pair is two switches until Sync (T7a)', final: false },
  ],
};

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

/** Local helpers for one bay: an A26 glass screen, an LED strip, a relief door's visual leaf on a wall face. */
function kit(b: LevelBuilder, f: Frame) {
  const { X, Z, Y } = f;
  return {
    gl: (x0: number, z0: number, x1: number, z1: number, y0: number, h: number) => screen(b, X(x0), Z(z0), X(x1), Z(z1), Y(y0), h),
    strip: (x0: number, z0: number, x1: number, z1: number, y: number) => led(b, X(x0), Z(z0), X(x1), Z(z1), Y(y)),
    leaf: (x: number, z: number, y: number, alongX: boolean) => b.box(X(x), Y(y + DOOR_H / 2), Z(z), alongX ? DOOR_W : 0.05, DOOR_H, alongX ? 0.05 : DOOR_W, C.steel, 0, 0, false),
  };
}

type Win = { c: number; kind: 'open' | 'glazed' | 'fixed' };

/** A storey wall along X (world z, x0..x1) from y, h tall, with doors (gap start, world x) and windows (centres). */
function storeyX(b: LevelBuilder, z: number, x0: number, x1: number, doors: readonly number[], wins: readonly Win[], y: number, h: number, color: string): void {
  const gaps = [...doors.map((d) => [d, d + DOOR_W] as const), ...wins.map((w) => [w.c - 0.6, w.c + 0.6] as const)].sort((p, q) => p[0] - q[0]);
  wallXAt(b, z, x0, x1, gaps, y, h, color, PART);
  for (const d of doors) b.box(d + DOOR_W / 2, y + (DOOR_H + h) / 2, z, DOOR_W, h - DOOR_H, PART, color);
  for (const w of wins) {
    // a fixed pane 0.1 thick (storey's 0.05 glass is thinner than the 5 cm voxel grid can hold)
    if (w.kind === 'fixed') b.box(w.c, y + 0.45, z, 1.2, 0.9, PART, color).box(w.c, y + (DOOR_H + h) / 2, z, 1.2, h - DOOR_H, PART, color).box(w.c, y + 1.5, z, 1.2, 1.2, 0.1, '#5d7387');
    else windowX(b, w.c, z, y, h, color, { open: w.kind === 'open', breakable: true });
  }
}

/** The same along Z (world x, z0..z1). */
function storeyZ(b: LevelBuilder, x: number, z0: number, z1: number, doors: readonly number[], wins: readonly Win[], y: number, h: number, color: string): void {
  const gaps = [...doors.map((d) => [d, d + DOOR_W] as const), ...wins.map((w) => [w.c - 0.6, w.c + 0.6] as const)].sort((p, q) => p[0] - q[0]);
  wallZAt(b, x, z0, z1, gaps, y, h, color, PART);
  for (const d of doors) b.box(x, y + (DOOR_H + h) / 2, d + DOOR_W / 2, PART, h - DOOR_H, DOOR_W, color);
  for (const w of wins) {
    if (w.kind === 'fixed') b.box(x, y + 0.45, w.c, PART, 0.9, 1.2, color).box(x, y + (DOOR_H + h) / 2, w.c, PART, h - DOOR_H, 1.2, color).box(x, y + 1.5, w.c, 0.1, 1.2, 1.2, '#5d7387');
    else windowZ(b, x, w.c, y, h, color, { open: w.kind === 'open', breakable: true });
  }
}

// ---------------------------------------------------------------------------------------------------- B7 The House

function buildB7(b: LevelBuilder, lips: number[], r: DeepResult): void {
  const f = frame('B7');
  const { X, Z, Y } = f;
  const k = kit(b, f);
  const H = M7.clear;
  b.floor(X(15), Z(15), 30.45, 30.45, C.spoil, Y(0));
  b.surface('gravel', X(0), X(30), Z(0), Z(30), Y(0));
  // the cavern (30 x 30, 10 high): west, south, east (the store door = A7's near door at z 14.4), north (A6 builds its
  // own stretch, local x 11.05..17.95, to 3.0; the rock above it here)
  wallZAt(b, X(0), Z(-0.225), Z(30.225), [], Y(0), H, C.rock, OUTER);
  wallXAt(b, Z(0), X(-0.225), X(30.225), [], Y(0), H, C.rock, OUTER);
  wallZDoors(b, X(30), Z(-0.225), Z(30.225), [Z(14.4)], Y(0), H, C.rock, OUTER);
  wallXAt(b, Z(30), X(-0.225), X(11.05), [], Y(0), H, C.rock, OUTER);
  wallXAt(b, Z(30), X(17.95), X(30.225), [], Y(0), H, C.rock, OUTER);
  b.box(X(14.5), Y((AIR_CLEAR + H) / 2), Z(30), 6.9, H - AIR_CLEAR, OUTER, C.rock);
  roof(b, X(-0.225), Z(-0.225), X(30.225), Z(30.225), Y(H));

  // the house (x 8..22, z 8..20): ground storey (front door north, the annex door south, the side door east; two open
  // windows west, two glazed north), first floor 3.2 (the manager's open window south over the annex), roof 6.4
  const F = M7.firstFloor;
  storeyX(b, Z(20), X(7.85), X(22.15), [X(14.4)], [{ c: X(10), kind: 'glazed' }, { c: X(19), kind: 'glazed' }], Y(0), F, C.block);
  storeyX(b, Z(8), X(7.85), X(22.15), [X(14.4)], [], Y(0), F, C.block);
  storeyZ(b, X(8), Z(8.15), Z(19.85), [], [{ c: Z(11), kind: 'open' }, { c: Z(17), kind: 'open' }], Y(0), F, C.block);
  storeyZ(b, X(22), Z(8.15), Z(19.85), [Z(16.4)], [], Y(0), F, C.block);
  storeyX(b, Z(8), X(7.85), X(22.15), [], [{ c: X(15), kind: 'open' }], Y(F), F, C.block);
  storeyX(b, Z(20), X(7.85), X(22.15), [], [{ c: X(19), kind: 'fixed' }], Y(F), F, C.block);
  storeyZ(b, X(8), Z(8.15), Z(19.85), [], [], Y(F), F, C.block);
  storeyZ(b, X(22), Z(8.15), Z(19.85), [], [{ c: Z(17), kind: 'fixed' }], Y(F), F, C.block);
  // ground: the back rooms (south) and the lobby (north) split at z 14; the timber stair along the partition in the
  // lobby (x 15 -> 20.04, rising east)
  wallXDoors(b, Z(14), X(8.15), X(21.85), [X(9.4), X(12.6)], Y(0), F, C.block);
  const sLen = 18 * 0.28;
  b.stairs(X(15 + sLen / 2), Z(14.9), 1.5, sLen, F, 18, C.wood, Math.PI / 2, Y(0));
  b.surface('wood', X(15), X(15 + sLen), Z(14.15), Z(15.65), Y(0));
  // first floor (the stairwell over the stair); the manager's office (x 8..16.5, z 8..13.5) behind glass partitions
  slabWithHoles(b, X(8.15), Z(8.15), X(21.85), Z(19.85), Y(F), [[X(14.85), Z(14.15), X(15.2 + sLen), Z(15.85)]], C.vinyl);
  k.gl(8.15, 13.5, 13.4, 13.5, F, F);
  k.gl(14.6, 13.5, 16.5, 13.5, F, F);
  k.gl(16.5, 8.15, 16.5, 13.5, F, F);
  b.box(X(14), Y(F + (DOOR_H + F) / 2), Z(13.5), DOOR_W, F - DOOR_H, 0.1, C.steel);
  k.strip(8.15, 13.4, 16.5, 13.4, F + 0.015);
  k.strip(16.4, 8.15, 16.4, 13.5, F + 0.015);
  b.block(X(11), Z(12.8), 1.6, 0.75, 0.8, C.wood, Y(F));
  r.devices['sw-store-key'] = { x: X(12.3), y: Y(F), z: Z(12.8), yaw: Math.PI / 2, label: 'Store key' };
  // the roof (hatch hole x 18.4..19.6, z 17..18.2; its fixed ladder from the first floor) and the parapet (the lips)
  slabWithHoles(b, X(7.85), Z(7.85), X(22.15), Z(20.15), Y(M7.roof), [[X(18.4), Z(17), X(19.6), Z(18.2)]], C.conc);
  r.anchors['B7-hatch'] = b.ladder(X(19), Z(17.9), Y(F), Y(M7.roof), 0).id;
  const pt = 0.25;
  const py = M7.roof + M7.parapet / 2;
  lips.push(b.boxes.length, b.boxes.length + 1, b.boxes.length + 2, b.boxes.length + 3);
  b.box(X(15), Y(py), Z(7.85 + pt / 2), 14.3, M7.parapet, pt, C.block);
  b.box(X(15), Y(py), Z(20.15 - pt / 2), 14.3, M7.parapet, pt, C.block);
  b.box(X(7.85 + pt / 2), Y(py), Z(14), pt, M7.parapet, 12.3 - 2 * pt, C.block);
  b.box(X(22.15 - pt / 2), Y(py), Z(14), pt, M7.parapet, 12.3 - 2 * pt, C.block);
  // the roof downpipe on the south face (x 20.5): up to the parapet (the ledge pull's approach)
  r.anchors['B7-downpipe'] = b.pipeV(X(20.5), Z(7.75), Y(0), Y(M7.roof + M7.parapet), 0).id;
  // the lobby lockers (2, hides) on the north wall
  for (const lx of [8.55, 9.1]) b.block(X(lx), Z(19.55), 0.55, 2.0, 0.5, C.locker, Y(0));
  r.hideSpots.push(deepAt('B7', 8.55, 18.9), deepAt('B7', 9.1, 18.9));

  // the annex (kitchen, x 12..18, z 5..8, roof 3.2: the wall-jump lip); its back door in the south wall
  wallZAt(b, X(12), Z(5.15), Z(7.85), [], Y(0), M7.annex, C.block, PART);
  wallZAt(b, X(18), Z(5.15), Z(7.85), [], Y(0), M7.annex, C.block, PART);
  wallXDoors(b, Z(5), X(11.85), X(18.15), [X(14.4)], Y(0), M7.annex, C.block);
  lips.push(b.boxes.length);
  b.box(X(15), Y(M7.annex - 0.15), Z(6.425), 6.3, 0.3, 3.15, C.conc);
  b.block(X(17), Z(7.45), 1.2, 0.9, 0.6, C.wood, Y(0));

  // the water main (300 mm, y 4.9, z 5) wall to wall over the bench, the drop spot (4, 5) and the annex roof's south edge
  r.anchors['B7-main'] = b.pipeH(X(1), Z(5), X(29), Z(5), Y(M7.main), C.pipe, 0.15).id;
  for (const px of [4, 9, 21, 26]) b.box(X(px), Y(M7.main / 2), Z(5.3), 0.12, M7.main, 0.12, C.steel, 0, 0, false);

  // the rock-bolting bench (x 0..1.5, z 4..24, top 3.0) and its plant ladder at the north end
  lips.push(b.boxes.length);
  b.block(X(0.8625), Z(14), 1.275, M7.bench, 20, C.conc, Y(0));
  r.anchors['B7-bench-ladder'] = b.ladder(X(0.8625), Z(24.3), Y(0), Y(M7.bench), Math.PI).id;

  // sandbag walls 1.0 (low cover) before the store door, the skip, three recesses in the cavern wall
  b.block(X(25), Z(11.5), 0.6, M7.sandbag, 3, C.sand, Y(0));
  b.block(X(26.5), Z(15.5), 0.6, M7.sandbag, 3, C.sand, Y(0));
  b.block(X(25), Z(19), 0.6, M7.sandbag, 2, C.sand, Y(0));
  b.block(X(4), Z(26.5), 3, 1.5, 3, C.skip, Y(0));
  r.hideSpots.push(deepAt('B7', 6.1, 26.5));
  const recess = (x0: number, x1: number, zc: number): void => {
    for (const s of [-1, 1]) b.block(X((x0 + x1) / 2), Z(zc + s * 1.05), Math.abs(x1 - x0), 3.0, 0.5, C.rock, Y(0));
  };
  recess(0.225, 1.225, 27);
  recess(28.775, 29.775, 27);
  recess(28.775, 29.775, 2.5);
  r.hideSpots.push(deepAt('B7', 0.6, 27), deepAt('B7', 29.4, 27), deepAt('B7', 29.4, 2.5));

  // the house's doors: front (north, the pair's porch), side (east), annex into the house, the back door, the office
  b.door(X(14.4), Y(0), Z(20), DOOR_W, Math.PI / 2);
  b.door(X(22), Y(0), Z(16.4), DOOR_W, 0);
  b.door(X(14.4), Y(0), Z(8), DOOR_W, Math.PI / 2);
  b.door(X(14.4), Y(0), Z(5), DOOR_W, Math.PI / 2);
  b.door(X(13.4), Y(F), Z(13.5), DOOR_W, Math.PI / 2);
  // the relief door (A62; visual leaf on the cavern's south wall, no anchor)
  k.leaf(21, 0.25, 0, true);
  // LED floods' fixtures are T6; the exit sign over the store door (visual)
  b.box(X(29.75), Y(2.4), Z(15), 0.05, 0.2, 0.5, '#2f7a3a', 0, 0, false);

  r.debug.push(
    { id: 'B7', label: 'B7 The House (A6 door)', pos: deepAt('B7', 14.5, 28.5), yaw: Math.PI },
    { id: 'B7-house', label: 'B7 house lobby', pos: deepAt('B7', 11, 17), yaw: Math.PI },
    { id: 'B7-office', label: "B7 manager's office", pos: deepAt('B7', 10, 10, F), yaw: Math.PI },
    { id: 'B7-roof', label: 'B7 house roof', pos: deepAt('B7', 12, 11, M7.roof), yaw: Math.PI },
    { id: 'B7-annex', label: 'B7 annex roof', pos: deepAt('B7', 15, 6.4, M7.annex), yaw: 0 },
    { id: 'B7-bench', label: 'B7 rock-bolting bench', pos: deepAt('B7', 0.86, 14, M7.bench), yaw: Math.PI / 2 },
  );
}

// ---------------------------------------------------------------------------------------------------- A7, A8

/** The pad border (BAYS 0.4): an LED floor strip 1 m inside every wall. */
function pad(b: LevelBuilder, f: Frame): void {
  const { strip } = kit(b, f);
  strip(1, 1, 5, 1, 0.015);
  strip(1, 5, 5, 5, 0.015);
  strip(1, 1, 1, 5, 0.015);
  strip(5, 1, 5, 5, 0.015);
}

/** A 6 x 6 x 3.0 airlock between two bays on its west (near) and east (far) walls; doors at local z 2.4. */
function buildAirlock(b: LevelBuilder, bay: 'A7' | 'A8', r: DeepResult, medkit: boolean): void {
  const f = frame(bay);
  const { X, Z, Y } = f;
  b.floor(X(3), Z(3), 6, 6 + 2 * OUTER, C.floor, Y(0));
  wallXAt(b, Z(0), X(0.225), X(5.775), [], Y(0), AIR_CLEAR, C.wall, OUTER);
  wallXAt(b, Z(6), X(0.225), X(5.775), [], Y(0), AIR_CLEAR, C.wall, OUTER);
  roof(b, X(-0.225), Z(-OUTER), X(6.225), Z(6 + OUTER), Y(AIR_CLEAR));
  b.block(X(3), Z(0.4), 3, 0.45, 0.45, C.wood, Y(0));
  b.box(X(5.76), Y(1.5), Z(3) + 1.1, 0.04, 0.6, 0.6, '#5d7387', 0, 0, false);
  if (medkit) b.box(X(3), Y(1.2), Z(5.75), 0.5, 0.4, 0.06, C.med, 0, 0, false);
  pad(b, f);
  r.doors[`${bay}-near`] = b.door(X(0), Y(0), Z(2.4), DOOR_W, 0, { locked: true, swing: 1 }).id;
  r.doors[`${bay}-far`] = b.door(X(6), Y(0), Z(2.4), DOOR_W, 0, { locked: true, swing: -1 }).id;
  r.debug.push({ id: bay, label: `${bay} airlock${medkit ? ' (medkit)' : ''}`, pos: deepAt(bay, 3, 3), yaw: Math.PI / 2 });
}

// ---------------------------------------------------------------------------------------------------- B8 The Range

/** The B8 catwalk stair's door (CS) plan centre (world): the cage's south wall at the stair foot, bolted from below. */
export const B8_CS_DOOR = deepAt('B8', 58.9, 12);

function buildB8(b: LevelBuilder, lips: number[], r: DeepResult): void {
  const f = frame('B8');
  const { X, Z, Y } = f;
  const k = kit(b, f);
  const H = M8.clear;
  const cw = M8.catwalk;
  b.floor(X(30), Z(8), 60.45, 16.45, C.floor, Y(0));
  wallZDoors(b, X(0), Z(-0.225), Z(16.225), [Z(7.4)], Y(0), H, C.wall, OUTER);
  wallZDoors(b, X(60), Z(-0.225), Z(16.225), [Z(7.4)], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(0), X(-0.225), X(60.225), [], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(16), X(-0.225), X(60.225), [], Y(0), H, C.wall, OUTER);
  roof(b, X(-0.225), Z(-0.225), X(60.225), Z(16.225), Y(H));

  // KL kit lockers (x 0..2, z 10..12); FL benches (one per lane 1-5; lane 6 is the glass door)
  for (const z of [10.4, 11.0, 11.6]) b.block(X(0.5), Z(z), 0.55, 2.0, 0.58, C.locker, Y(0));
  for (let i = 0; i < 5; i++) b.block(X(3.2), Z(1 + 2 * i), 0.6, M8.bench, 1.4, C.wood, Y(0));
  // the firing-line glass screen (x 4): a 1.0 kick panel and a head screen 1.6..3.0 with the firing slot between
  // (0.6, nobody passes); the glass door (z 9.9..11.1) onto the lanes; full height north of it and under RT
  k.gl(4, 0.225, 4, 9.9, 0, 1.0);
  k.gl(4, 0.225, 4, 9.9, 1.6, 1.4);
  k.gl(4, 11.1, 4, 12, 0, 3.0);
  k.gl(4, 12, 4, 15.775, 0, cw - 0.3);
  b.box(X(4), Y((DOOR_H + 3.0) / 2), Z(10.5), 0.1, 3.0 - DOOR_H, DOOR_W, C.steel);
  b.door(X(4), Y(0), Z(9.9), DOOR_W, 0);
  k.strip(4.08, 0.225, 4.08, 15.775, 0.015);
  // TG lane stands (visual; T7a places the dummies, B8_TARGETS), LG lamp gantry (visual frame) on lane 6 at 20 m
  for (const t of B8_TARGETS) b.box(t.x, 0.6, t.z + 0.4, 0.08, 1.2, 0.08, C.steel, 0, 0, false);
  for (const gz of [10.2, 11.8]) b.box(X(24), Y(1.6), Z(gz), 0.1, 3.2, 0.1, C.steel, 0, 0, false);
  b.box(X(24), Y(3.2), Z(11), 0.15, 0.15, 1.8, C.steel, 0, 0, false);
  // PW penetration wall on lane 2 at 15 m: plywood (0.1, the thinnest the 5 cm voxel grid holds) beside 0.2 block
  b.box(X(19), Y(1.2), Z(2.5), 0.1, 2.4, 1.0, C.ply);
  b.box(X(19), Y(1.2), Z(3.5), 0.2, 2.4, 1.0, C.block);
  for (const p of B8_BARRELS) b.cylinders.push({ c: [p.x, 0.45, p.z], r: 0.3, h: 0.9, color: '#8a2a20', collide: false });
  // SH shoot-house barricades: low 1.0 and high 2.0 (B8-F's beat at x 44 and B8-E's post (52, 6) kept clear)
  for (const [x, z, w, d] of [[33, 3, 0.4, 3], [38, 10.5, 3, 0.4], [47, 3, 0.4, 3], [51.5, 9.6, 2, 0.4]] as const) b.block(X(x), Z(z), w, M8.low, d, C.sand, Y(0));
  for (const [x, z, w, d] of [[37, 5.5, 0.4, 2.5], [41, 7.5, 2.5, 0.4], [47, 9, 0.4, 2]] as const) b.block(X(x), Z(z), w, M8.high, d, C.block, Y(0));

  // RT the range control tower (x 2..8, z 12..16, 4.0), glazed but for the ladder's opening (x 2.5..3.5); LD at x 3
  deck(b, X(2), Z(12), X(8), Z(15.775), Y(cw), C.vinyl);
  k.gl(2, 12, 2.5, 12, cw, 3);
  k.gl(3.5, 12, 8, 12, cw, 3);
  k.gl(2, 12, 2, 15.775, cw, 3);
  k.gl(8, 12, 8, 13, cw, 3);
  roof(b, X(1.95), Z(11.95), X(8), Z(15.775), Y(cw + 3));
  r.anchors['B8-LD'] = b.ladder(X(3), Z(11.7), Y(0), Y(cw), 0).id;
  // CW the catwalk on the crane gantry (x 8..50, z 13..16, 4.0), its 1.1 glass balustrade on the south edge (a vantage)
  deck(b, X(8), Z(13), X(50), Z(15.775), Y(cw), C.grate);
  b.surface('grate', X(8), X(50), Z(13), Z(16), Y(cw));
  k.gl(8, 13, 50, 13, cw, 1.1);
  k.strip(8, 13.1, 50, 13.1, cw + 0.015);
  for (const px of [16, 28, 40]) b.box(X(px), Y(cw / 2), Z(13.2), 0.15, cw - 0.3, 0.15, C.steel, 0, 0, false);
  // CS the catwalk stair (x 50..58, rising west to the catwalk's end), caged to 7.0 (x 50..60, z 12..16); its door
  // at the foot in the cage's south wall (x 58.3..59.5), bolted from below (the floor side, -z)
  b.stairs(X(54), Z(14), 1.6, 8, cw, M8.stairRisers, C.grate, -Math.PI / 2, Y(0));
  wallXDoors(b, Z(12), X(49.85), X(59.775), [X(58.3)], Y(0), M8.cage, C.wall);
  b.box(X(50), Y((cw - 0.3) / 2), Z(13.9625), PART, cw - 0.3, 3.625, C.wall);
  r.doors['B8-cs'] = b.door(X(58.3), Y(0), Z(12), DOOR_W, Math.PI / 2, { locked: true, swing: -1 }).id;
  // SP the sniper scaffold (x 54..57, z 7..10, 3.0) and its ladder (west face)
  lips.push(b.boxes.length);
  b.block(X(55.5), Z(8.5), 3, M8.scaffold, 3, C.steel, Y(0));
  r.anchors['B8-SP-ladder'] = b.ladder(X(53.7), Z(8.5), Y(0), Y(M8.scaffold), Math.PI / 2).id;
  // the cease-fire switch at the far end beside CS's door; the relief door (A62) on the south wall
  r.devices['sw-cease-fire'] = { x: X(59.6), y: Y(0), z: Z(11.2), yaw: -Math.PI / 2, label: 'Cease fire' };
  k.leaf(45, 0.25, 0, true);

  r.debug.push(
    { id: 'B8', label: 'B8 The Range (firing line)', pos: deepAt('B8', 1.5, 5), yaw: Math.PI / 2 },
    { id: 'B8-RT', label: 'B8 range control tower', pos: deepAt('B8', 5, 14, cw), yaw: Math.PI / 2 },
    { id: 'B8-CW', label: 'B8 catwalk', pos: deepAt('B8', 30, 14.5, cw), yaw: Math.PI },
    { id: 'B8-far', label: 'B8 far end', pos: deepAt('B8', 57, 4), yaw: -Math.PI / 2 },
  );
}

// ---------------------------------------------------------------------------------------------------- B9 The Plot

/** One enclosed stair tower (SW x 0..8 or SE x 24..32, z 0..4): two lanes of 13-riser flights 0 -> 4.5 -> 9.0. */
function stairTower(b: LevelBuilder, west: boolean): void {
  const { X, Z, Y } = frame('B9');
  // mirror: local x for the SW tower, 32 - x for the SE one
  const mx = (x: number): number => (west ? X(x) : X(32 - x));
  const up = west ? Math.PI / 2 : -Math.PI / 2;
  const inner = west ? 8 : 24;
  wallZAt(b, X(inner), Z(0.225), Z(4.15), [], Y(0), M9.tower, C.wall, PART);
  for (const [y, h] of [[0, M9.b1], [M9.b1, M9.b2 - M9.b1], [M9.b2, M9.tower - M9.b2]] as const) {
    const d = west ? 0.6 : 32 - 1.8;
    wallXDoors(b, Z(4), west ? X(0.225) : X(23.85), west ? X(8.15) : X(31.775), [X(d)], Y(y), h, C.wall);
    b.door(X(d), Y(y), Z(4), DOOR_W, Math.PI / 2);
  }
  roof(b, west ? X(-0.225) : X(23.85), Z(-0.225), west ? X(8.15) : X(32.225), Z(4.15), Y(M9.tower));
  // a 4.7 run (going 0.36) leaves the far landings 1.35 deep: room for the turn on the nav grid
  const run = 4.7;
  const top = 1.8 + run;
  const rise = M9.b1 / 2;
  const cx = (mx(1.8) + mx(top)) / 2;
  for (const [lane, dir, y] of [[1.15, up, 0], [2.95, -up, rise], [1.15, up, M9.b1], [2.95, -up, M9.b1 + rise]] as const) {
    b.stairs(cx, Z(lane), 1.7, run, rise, 13, C.conc, dir, Y(y));
  }
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
  const f = frame('B9');
  const { X, Z, Y } = f;
  const k = kit(b, f);
  const H = M9.clear;
  b.floor(X(16), Z(15.5), 32.45, 31.45, C.vinyl, Y(0));
  b.floor(X(16), Z(37.725), 8.45, 13.0, C.vinyl, Y(0));
  // the well (x 0..32, z 0..31): west (A8's far door at z 11.4), east (the staff tunnel door at z 5, north of the SE
  // tower), south, north (the lobby opening x 12..20, 6.0 high)
  wallZDoors(b, X(0), Z(-0.225), Z(31.225), [Z(11.4)], Y(0), H, C.wall, OUTER);
  wallZDoors(b, X(32), Z(-0.225), Z(31.225), [Z(5)], Y(0), H, C.wall, OUTER);
  r.doors['B9-tunnel'] = b.door(X(32), Y(0), Z(5), DOOR_W, 0, { locked: true }).id;
  wallXAt(b, Z(0), X(-0.225), X(32.225), [], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(31), X(-0.225), X(12), [], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(31), X(20), X(32.225), [], Y(0), H, C.wall, OUTER);
  b.box(X(16), Y((M9.lobby + H) / 2), Z(31), 8, H - M9.lobby, OUTER, C.wall);
  roof(b, X(-0.225), Z(-0.225), X(32.225), Z(31.225), Y(H));
  // the lift lobby (x 12..20, z 31..38, 6.0) and L9 the lift car (x 12..20, z 38..44), its door locked (the gates)
  wallZAt(b, X(12), Z(31.225), Z(38.225), [], Y(0), M9.lobby, C.wall, PART);
  wallZAt(b, X(20), Z(31.225), Z(38.225), [], Y(0), M9.lobby, C.wall, PART);
  wallXDoors(b, Z(38), X(11.85), X(20.15), [X(15.4)], Y(0), M9.lobby, C.wall, OUTER);
  roof(b, X(11.85), Z(31.225), X(20.15), Z(38.225), Y(M9.lobby));
  wallZAt(b, X(12), Z(38.225), Z(44.225), [], Y(0), AIR_CLEAR, C.steel, OUTER);
  wallZAt(b, X(20), Z(38.225), Z(44.225), [], Y(0), AIR_CLEAR, C.steel, OUTER);
  wallXAt(b, Z(44), X(11.775), X(20.225), [], Y(0), AIR_CLEAR, C.steel, OUTER);
  roof(b, X(11.775), Z(38.225), X(20.225), Z(44.225), Y(AIR_CLEAR));
  r.doors['L9-door'] = b.door(X(15.4), Y(0), Z(38), DOOR_W, Math.PI / 2, { locked: true }).id;
  r.devices.end = { x: X(16), y: Y(0), z: Z(42), yaw: Math.PI, label: 'Finish' };
  r.devices['K-A'] = { x: X(13.5), y: Y(0), z: Z(36), yaw: 0, label: 'Key A' };
  r.devices['K-B'] = { x: X(18.5), y: Y(0), z: Z(36), yaw: 0, label: 'Key B' };

  stairTower(b, true);
  stairTower(b, false);

  // B-1 (4.5): west x 0..6 (z 4..31), the south walkway (z 4..6) and cabin zone (x 8..24, z 0..4), east x 26..32; the
  // north-west gap (x 5..6, z 26..28) is the only lip, over a pier (its brace wall for the boost); 1.1 glass fronts
  const b1 = M9.b1;
  deck(b, X(0.225), Z(4.15), X(6), Z(26), Y(b1), C.grate);
  deck(b, X(0.225), Z(26), X(5), Z(28), Y(b1), C.grate);
  lips.push(b.boxes.length);
  deck(b, X(5), Z(26), X(6), Z(28), Y(b1), C.grate);
  deck(b, X(0.225), Z(28), X(6), Z(30.775), Y(b1), C.grate);
  deck(b, X(6), Z(4.15), X(26), Z(6), Y(b1), C.grate);
  deck(b, X(8.15), Z(0.225), X(23.85), Z(4.15), Y(b1), C.grate);
  deck(b, X(26), Z(4.15), X(31.775), Z(30.775), Y(b1), C.grate);
  b.block(X(5.8), Z(27), 0.4, b1 - 0.3, 2, C.conc, Y(0));
  k.gl(6, 6, 6, 26, b1, M9.rail);
  k.gl(6, 28, 6, 30.775, b1, M9.rail);
  k.gl(6, 6, 26, 6, b1, M9.rail);
  k.gl(26, 6, 26, 30.775, b1, M9.rail);
  k.strip(6.1, 6, 6.1, 30.775, b1 + 0.015);
  k.strip(6, 6.1, 26, 6.1, b1 + 0.015);
  k.strip(25.9, 6, 25.9, 30.775, b1 + 0.015);
  // B-1 cabins: west (key A, x 0..3.5, z 14..20; the tube station), east (key B, x 28.5..32, z 8..14), both up to
  // B-2's underside; south (two, two doors each, x 9..15 and 17..23, z 0..3.5) roofed at 7.5
  const wallTop = M9.b2 - 0.3 - b1;
  storeyZ(b, X(3.5), Z(14), Z(20), [Z(16.4)], [], Y(b1), wallTop, C.wall);
  wallXAt(b, Z(14), X(0.225), X(3.65), [], Y(b1), wallTop, C.wall, PART);
  wallXAt(b, Z(20), X(0.225), X(3.65), [], Y(b1), wallTop, C.wall, PART);
  b.block(X(1.6), Z(16.5), 0.8, 0.75, 1.6, C.wood, Y(b1));
  r.devices['pk-key-a'] = { x: X(2.4), y: Y(b1), z: Z(16.5), yaw: -Math.PI / 2, label: 'Take key A' };
  b.door(X(3.5), Y(b1), Z(16.4), DOOR_W, 0);
  storeyZ(b, X(28.5), Z(8), Z(14), [Z(10.4)], [], Y(b1), wallTop, C.wall);
  wallXAt(b, Z(8), X(28.35), X(31.775), [], Y(b1), wallTop, C.wall, PART);
  wallXAt(b, Z(14), X(28.35), X(31.775), [], Y(b1), wallTop, C.wall, PART);
  b.block(X(31.4), Z(12.5), 0.6, 2.0, 1.2, C.locker, Y(b1));
  r.devices['pk-key-b'] = { x: X(30.8), y: Y(b1), z: Z(12.5), yaw: Math.PI / 2, label: 'Take key B' };
  b.door(X(28.5), Y(b1), Z(10.4), DOOR_W, 0);
  for (const [x0, x1, d0, d1] of [[9, 15, 9.6, 13.2], [17, 23, 17.6, 21.2]] as const) {
    storeyX(b, Z(3.5), X(x0), X(x1), [X(d0), X(d1)], [], Y(b1), 3.0, C.wall);
    wallZAt(b, X(x0), Z(0.225), Z(3.5), [], Y(b1), 3.0, C.wall, PART);
    wallZAt(b, X(x1), Z(0.225), Z(3.5), [], Y(b1), 3.0, C.wall, PART);
    roof(b, X(x0 - 0.15), Z(0.225), X(x1 + 0.15), Z(3.65), Y(b1 + 3.0));
    for (const d of [d0, d1]) b.door(X(d), Y(b1), Z(3.5), DOOR_W, Math.PI / 2);
  }
  r.hideSpots.push(deepAt('B9', 0.8, 14.8, b1), deepAt('B9', 31.2, 8.8, b1));
  // the dark ring's recesses under B-1 (west, east)
  r.hideSpots.push(deepAt('B9', 0.8, 8), deepAt('B9', 31.2, 26));

  // B-2 (9.0): west x 0..5, east x 27..32, the bridge (z 28..31) across the north end; 1.1 glass fronts with two gaps:
  // the zipline's launch (B-2 east, z 20.5..23.5) and the rope point (bridge, x 10.5..11.5)
  const b2 = M9.b2;
  deck(b, X(0.225), Z(4.15), X(5), Z(28), Y(b2), C.grate);
  deck(b, X(27), Z(4.15), X(31.775), Z(28), Y(b2), C.grate);
  deck(b, X(0.225), Z(28), X(31.775), Z(30.775), Y(b2), C.grate);
  k.gl(5, 4.15, 5, 28, b2, M9.rail);
  k.gl(27, 4.15, 27, 20.5, b2, M9.rail);
  k.gl(27, 23.5, 27, 28, b2, M9.rail);
  k.gl(5, 28, 10.5, 28, b2, M9.rail);
  k.gl(11.5, 28, 27, 28, b2, M9.rail);
  k.strip(5, 28.1, 27, 28.1, b2 + 0.015);
  // the controller's cabin (B-2 east, x 29..32, z 20..26): the case; the controller's desk on the bridge
  storeyZ(b, X(29), Z(20), Z(26), [Z(24.4)], [], Y(b2), H - b2, C.wall);
  wallXAt(b, Z(20), X(28.85), X(31.775), [], Y(b2), H - b2, C.wall, PART);
  wallXAt(b, Z(26), X(28.85), X(31.775), [], Y(b2), H - b2, C.wall, PART);
  b.door(X(29), Y(b2), Z(24.4), DOOR_W, 0);
  r.devices['pk-case'] = { x: X(31), y: Y(b2), z: Z(22), yaw: Math.PI / 2, label: 'Take the case' };
  b.block(X(16), Z(28.8), 2.0, 0.75, 0.6, C.wood, Y(b2));
  // the rope point on the bridge front (rope bottom = the plot floor) and the zipline (B-2 east -> the lobby; the cable
  // end 1.9 over the lobby floor: the rider lands on it)
  r.anchors['B9-rappel'] = b.rappel(X(11), Y(b2), Z(28), Math.PI, b2).id;
  r.anchors['B9-zipline'] = b.zipline({ x: X(27.5), y: Y(b2 + 2.5), z: Z(22) }, { x: X(15.5), y: Y(1.9), z: Z(35) }).id;
  b.box(X(15.5), Y(1.0), Z(35.3), 0.1, 2.0, 0.1, C.steel, 0, 0, false);

  // the plot floor: the map table (0.9, back-lit), plotting stands (1.4 boards)
  b.block(X(16.5), Z(17.5), 6, M9.table, 4, C.table, Y(0));
  for (const [x, z, yaw] of [[9, 21, 0], [23, 22, Math.PI / 2], [22, 8, 0]] as const) b.block(X(x), Z(z), 2, 1.4, 0.1, C.wood, Y(0), yaw);

  // the message-tube duct (1.5 x 1.2): from the key A cabin's tube station (west wall) down inside the west wall,
  // behind the north wall, out of the inspection door in the lobby's west wall (the P3 switch beside it, T7a)
  const path: P3[] = [
    { x: X(0.225), y: Y(b1), z: Z(19.2) },
    { x: X(-1.2), y: Y(b1), z: Z(19.2) },
    { x: X(-1.2), y: Y(b1), z: Z(21.5) },
    { x: X(-1.2), y: Y(0), z: Z(32) },
    { x: X(-1.2), y: Y(0), z: Z(34) },
    { x: X(12.15), y: Y(0), z: Z(34) },
  ];
  b.box(X(0.2), Y(b1 + 0.5), Z(19.2), 0.04, 1.0, 1.2, C.grate, 0, 0, false);
  b.box(X(12.12), Y(0.6), Z(34), 0.04, 1.2, 1.4, C.steel, 0, 0, false);
  r.anchors['B9-duct'] = b.duct(
    path,
    { pos: { x: X(0.225), y: Y(b1 + 0.05), z: Z(19.2) }, nx: 1, ny: 0, nz: 0, where: 'wall' },
    { pos: { x: X(12.15), y: Y(0.05), z: Z(34) }, nx: 1, ny: 0, nz: 0, where: 'wall' },
  ).id;
  // the relief doors (A62; visual leaves): the ring's east wall, the lobby's east wall
  k.leaf(31.75, 18, 0, false);
  k.leaf(19.83, 35.5, 0, false);

  r.debug.push(
    { id: 'B9', label: 'B9 The Plot (A8 door)', pos: deepAt('B9', 2, 12), yaw: Math.PI / 2 },
    { id: 'B9-floor', label: 'B9 plot floor', pos: deepAt('B9', 16, 10), yaw: 0 },
    { id: 'B9-B1', label: 'B9 balcony B-1 west', pos: deepAt('B9', 4.5, 10, b1), yaw: Math.PI / 2 },
    { id: 'B9-B2', label: 'B9 balcony B-2 west', pos: deepAt('B9', 2.5, 20, b2), yaw: Math.PI / 2 },
    { id: 'B9-bridge', label: "B9 controller's bridge", pos: deepAt('B9', 8, 29.5, b2), yaw: Math.PI },
    { id: 'B9-lobby', label: 'B9 lift lobby', pos: deepAt('B9', 16, 34), yaw: 0 },
    { id: 'L9', label: 'L9 exit lift', pos: deepAt('L9', 16, 41), yaw: Math.PI },
  );
}

/** Nav flood seeds on every Deep floor and storey guards will use (open floor, never on furniture). */
export function deepNavSeeds(): P3[] {
  const s7 = (x: number, z: number, y = 0): P3 => deepAt('B7', x, z, y);
  const s8 = (x: number, z: number, y = 0): P3 => deepAt('B8', x, z, y);
  const s9 = (x: number, z: number, y = 0): P3 => deepAt('B9', x, z, y);
  return [
    // B7: cavern, house ground (lobby, back rooms), first floor, office, roof, annex (in, on), the bench
    s7(4, 20), s7(11, 17), s7(11, 11), s7(18, 17, M7.firstFloor), s7(10, 10, M7.firstFloor), s7(12, 11, M7.roof), s7(15, 6.5), s7(15, 6.4, M7.annex), s7(0.86, 14, M7.bench),
    // B8: the firing line, the lanes, the dark walk, the catwalk, the tower, the scaffold, the cage foot
    s8(1.5, 5), s8(10, 6), s8(20, 14), s8(30, 14.5, M8.catwalk), s8(5, 14, M8.catwalk), s8(55.5, 8.5, M8.scaffold), s8(59, 14),
    // B9: floor, ring (west, south, east), B-1 (west, south, east), B-2 (west, east), the bridge, the lobby, L9
    s9(16, 10), s9(3, 10), s9(16, 2), s9(29, 16), s9(4.5, 10, M9.b1), s9(16, 5, M9.b1), s9(27, 18, M9.b1),
    s9(2.5, 24, M9.b2), s9(29, 16, M9.b2), s9(8, 29.5, M9.b2), s9(16, 34), s9(16, 41),
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
  b.light({ ...deepAt('B7', 15, 15, 8.5), radius: 26, intensity: 0.8 });
  b.light({ ...deepAt('B8', 30, 8, 7.5), radius: 32, intensity: 0.9 });
  b.light({ ...deepAt('B9', 16, 15, 12.5), radius: 28, intensity: 0.9 });
  return r;
}
