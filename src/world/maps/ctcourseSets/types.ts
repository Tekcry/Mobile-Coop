/**
 * Marlow Yard set-part contract (marlow-final slice 0d; `docs/marlow-final/PLAN.md` section 2, "The set-part
 * contract"; SPEC sections 5, 7, 9, 13). Pure data and checks, Babylon-free.
 *
 * The map is built in parts: the facility shell (`facility.ts`: outer and set-boundary walls, the instructor gallery,
 * service corridors, the plant room, holding rooms L1-L7 with their sliding doors, pads, glass slots and medkits, the
 * cash dock) and one file per set (`a1Gate.ts` ... `a8Strongroom.ts`). Each set file exports
 * `build<Set>(b: LevelBuilder, kit: FacilityKit): SetPart` plus its own id constants; `ctcourse.ts` merges the parts
 * into the map layout and the course definition. The rules below keep parallel set builders apart:
 * - build only inside `SET_BOX[set]` (the walls ON a box edge are the facility's);
 * - ids carry the set's tag `a<n>`: they start `a<n>-` or have it as a dash-separated part (`g-a1-wicket`, `sc-a7`,
 *   `laser-a5`, as the SPEC sheets name them) (course devices, gates, flags, squads, cameras, lasers, scanners, zones,
 *   objective steps); course door ids start `A<n>-`;
 * - light groups 10 x n + k (`setGroups`), each a row of `MARLOW_CIRCUITS` (`src/world/lighting/marlowCircuits.ts`);
 * - cameras within the per-set budget (`CAMERA_BUDGET`, 12 per map);
 * - the set enters from its holding room's far door and leaves by the next one's near door (`setEntryDoor`,
 *   `setExitDoor`), which the facility builds and the course chain locks.
 * Plan coordinates are metres, x east, z north, floor y 0 (SPEC section 5). Boxes are wall centre lines.
 */
import type { CourseDevice, CourseObjective, DrillDef, GateDef, RadioLine, RoleClaim } from '../../../game/course/courseDef';
import type { SecurityConsole } from '../../../game/course/securityRoom';
import type { StationDef } from '../../../game/course/stationDef';
import type { LaserDef } from '../../../game/jammer';
import type { LaserPanelDef } from '../../../game/laserPanels';
import type { PassZone } from '../../../game/passZones';
import type { ScannerDef } from '../../../game/scanners';
import type { CameraDevice } from '../../../security/data';
import type { CamSpace } from '../../camSpaces';
import type { LevelBuilder } from '../../levelBuilder';
import type { PropPlacement } from '../../props/facilityProps';
import type { SquadSlot } from '../../rooms';
import type { CoopLip } from '../ctcourseGreybox';

/** A plan box [x0, z0, x1, z1] (m; wall centre lines). */
export type Box = readonly [number, number, number, number];
/** A feet or world point (m). */
export interface Pt {
  x: number;
  y: number;
  z: number;
}

// ------------------------------------------------------------------------------------------------- sets and rooms

/** The eight sets in route order (file names under `ctcourseSets/`). */
export const SET_IDS = ['a1Gate', 'a2CarriageShed', 'a3OfficeRange', 'a4GoodsShed', 'a5Substation', 'a6PumpHouse', 'a7DataHall', 'a8Strongroom'] as const;
export type SetId = (typeof SET_IDS)[number];

/** The set's number n (1-8): its bay is `A<n>`, its ids `a<n>-`, its light groups 10 n + k. */
export const SET_NO: Readonly<Record<SetId, number>> = { a1Gate: 1, a2CarriageShed: 2, a3OfficeRange: 3, a4GoodsShed: 4, a5Substation: 5, a6PumpHouse: 6, a7DataHall: 7, a8Strongroom: 8 };

/** The set's name as signed at its door (SPEC section 5). */
export const SET_NAME: Readonly<Record<SetId, string>> = {
  a1Gate: 'the Gate',
  a2CarriageShed: 'the Carriage Shed',
  a3OfficeRange: 'the Office Range',
  a4GoodsShed: 'the Goods Shed',
  a5Substation: 'the Substation',
  a6PumpHouse: 'the Pump House',
  a7DataHall: 'the Data Hall',
  a8Strongroom: 'the Strongroom',
};

/** The course bay id of a set ('A1' ... 'A8'). */
export const setBay = (id: SetId): string => `A${SET_NO[id]}`;

/**
 * (marlow-final S10, Michael's walk M1, ROADMAP stealth over shooting (1)) The first set whose cameras are armoured
 * (a shot ricochets, the camera keeps working): A3's hall camera, the course's first, and every later one. A camera
 * of an earlier set stays shootable (A1 and A2 have none today). Undo: a number above 8 (every camera shootable).
 */
export const ARMOURED_FROM_SET = 3;
/** Set `id`'s cameras with the armour rule applied (a camera's own `bulletproof` wins). Not on a hot path (map build). */
export function armourCameras(id: SetId, cams: readonly CameraDevice[]): CameraDevice[] {
  if (SET_NO[id] < ARMOURED_FROM_SET) return [...cams];
  return cams.map((c) => (c.bulletproof === undefined ? { ...c, bulletproof: true } : c));
}
/** The prefix of every id a set owns ('a1-'). */
export const setIdPrefix = (id: SetId): string => `a${SET_NO[id]}-`;
/** Does `s` carry set `id`'s tag: `a<n>-...`, `...-a<n>-...` or `...-a<n>` (SPEC ids such as `g-a1-wicket`, `sc-a7`)? */
export function ownsId(id: SetId, s: string): boolean {
  const t = `a${SET_NO[id]}`;
  return s.startsWith(`${t}-`) || s.includes(`-${t}-`) || s.endsWith(`-${t}`);
}
/** The prefix of a set's course door ids ('A1-'). */
export const setDoorPrefix = (id: SetId): string => `A${SET_NO[id]}-`;
/** A set's light group range [10 n, 10 n + 9] (SPEC 9). */
export const setGroups = (id: SetId): [number, number] => [10 * SET_NO[id], 10 * SET_NO[id] + 9];

/**
 * Where each set builds (SPEC section 5): one or more plan boxes. A4 is three: the security room, the staff passage
 * under the gallery and the goods floor. The walls on these edges are `facility.ts`'s.
 */
export const SET_BOX: Readonly<Record<SetId, readonly Box[]>> = {
  a1Gate: [[0, 2, 22, 20]],
  a2CarriageShed: [[28, 0, 70, 20]],
  a3OfficeRange: [[76, 0, 100, 13]],
  a4GoodsShed: [
    [100, 13, 106.6, 19.6],
    [101, 19.6, 104, 24],
    [76, 24, 112, 48],
  ],
  a5Substation: [[40, 24, 70, 48]],
  a6PumpHouse: [[40, 54, 64, 72]],
  a7DataHall: [[70, 52, 100, 72]],
  a8Strongroom: [[106, 50, 150, 78]],
};

/** The set hall's clear height to the facility roof's underside (m; SPEC 5: 10 m clear to the trusses). A set builds its
 *  own ceilings under it (A3's 3.0 m offices, A4's security room); the A4 staff passage is under the gallery (4.2). */
export const HALL_H = 10;

/** The holding rooms (the course airlocks, SPEC 5): 6 x 6 x 3.2 m. */
export const HOLD_IDS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'] as const;
export type HoldId = (typeof HOLD_IDS)[number];
export const HOLD_BOX: Readonly<Record<HoldId, Box>> = {
  L1: [22, 8, 28, 14],
  L2: [70, 7, 76, 13],
  L3: [100, 7, 106, 13],
  L4: [70, 30, 76, 36],
  L5: [50, 48, 56, 54],
  L6: [64, 59, 70, 65],
  L7: [100, 57, 106, 63],
};
/** A holding room's clear height (its lid's underside, m). */
export const HOLD_H = 3.2;

/**
 * A holding-room door: the opening's centre on its wall line and the `LevelBuilder.door` yaw (0: the leaf along z, a
 * wall at constant x; pi / 2: along x). `into` is the plan direction from the holding room into the set beyond.
 */
export interface DoorSpot {
  x: number;
  z: number;
  yaw: number;
  into: readonly [number, number];
}
/** Each holding room's two motorised sliding doors (1.8 m, SPEC 5): `near` from the set the players leave, `far` into the
 *  next set. Course door ids `<L>-near` / `<L>-far`. */
export const HOLD_DOORS: Readonly<Record<HoldId, { near: DoorSpot; far: DoorSpot }>> = {
  L1: { near: { x: 22, z: 11, yaw: 0, into: [-1, 0] }, far: { x: 28, z: 11, yaw: 0, into: [1, 0] } },
  L2: { near: { x: 70, z: 10, yaw: 0, into: [-1, 0] }, far: { x: 76, z: 10, yaw: 0, into: [1, 0] } },
  L3: { near: { x: 100, z: 10, yaw: 0, into: [-1, 0] }, far: { x: 103, z: 13, yaw: Math.PI / 2, into: [0, 1] } },
  L4: { near: { x: 76, z: 33, yaw: 0, into: [1, 0] }, far: { x: 70, z: 33, yaw: 0, into: [-1, 0] } },
  L5: { near: { x: 53, z: 48, yaw: Math.PI / 2, into: [0, -1] }, far: { x: 53, z: 54, yaw: Math.PI / 2, into: [0, 1] } },
  L6: { near: { x: 64, z: 62, yaw: 0, into: [-1, 0] }, far: { x: 70, z: 62, yaw: 0, into: [1, 0] } },
  L7: { near: { x: 100, z: 60, yaw: 0, into: [-1, 0] }, far: { x: 106, z: 60, yaw: 0, into: [1, 0] } },
};
/** The holding-room door's clear width (m; `kit.slidingDoor`, SPEC 5). */
export const HOLD_DOOR_W = 1.8;
/** A holding-room door's id (`L3-far`). */
export const holdDoorId = (h: HoldId, end: 'near' | 'far'): string => `${h}-${end}`;

/** The route chain: each set's entry (the start in the arrival lounge, or a holding room) and its exit. */
export const SET_LINKS: Readonly<Record<SetId, { entry: 'start' | HoldId; exit: HoldId | 'end' }>> = {
  a1Gate: { entry: 'start', exit: 'L1' },
  a2CarriageShed: { entry: 'L1', exit: 'L2' },
  a3OfficeRange: { entry: 'L2', exit: 'L3' },
  a4GoodsShed: { entry: 'L3', exit: 'L4' },
  a5Substation: { entry: 'L4', exit: 'L5' },
  a6PumpHouse: { entry: 'L5', exit: 'L6' },
  a7DataHall: { entry: 'L6', exit: 'L7' },
  a8Strongroom: { entry: 'L7', exit: 'end' },
};
/** The course door the set is entered by (its entry holding room's far door), or null for A1 (the arrival lounge). */
export const setEntryDoor = (id: SetId): string | null => {
  const e = SET_LINKS[id].entry;
  return e === 'start' ? null : holdDoorId(e, 'far');
};
/** The course door the set is left by (its exit holding room's near door), or null for A8 (the cash dock). */
export const setExitDoor = (id: SetId): string | null => {
  const e = SET_LINKS[id].exit;
  return e === 'end' ? null : holdDoorId(e, 'near');
};

/** The cash dock (the exit zone's room, the facility's) and the exit zone inside it (both players end the course, G138).
 *  The dock's west side is open to A8 (the vault's back, SPEC A8); x 150-154 stays outside the zone. */
export const DOCK_BOX: Box = [150, 58, 160, 66];
export const EXIT_ZONE: Box = [154, 59, 159.4, 65];

/** The arrival lounge (inside A1, the A1 set builds it) and the two spawns in it (SPEC 13: x 2, z 10 and 12, facing +x). */
export const LOUNGE_BOX: Box = [0, 8, 6, 14];
export const SPAWNS: readonly { x: number; z: number; yaw: number }[] = [
  { x: 2, z: 10, yaw: Math.PI / 2 },
  { x: 2, z: 12, yaw: Math.PI / 2 },
];

/** Cameras each set may place (PLAN 2: A3 1, A4 3, A7 2, A8 3) and the map cap (`SECURITY_LIMITS.cameras`). */
export const CAMERA_BUDGET: Readonly<Record<SetId, number>> = { a1Gate: 0, a2CarriageShed: 0, a3OfficeRange: 1, a4GoodsShed: 3, a5Substation: 0, a6PumpHouse: 0, a7DataHall: 2, a8Strongroom: 3 };
export const MAP_CAMERAS = 12;
/** Most guards a set spawns (SPEC 9: at most 3 per set, `MAX_ALIVE` 12). */
export const SET_GUARDS_MAX = 3;
/** Longest objective step id: its latch flag `obj:<id>` rides the packed course flags, which the wire cuts at 48
 *  characters (`protocol.ts` `strs`, the slice 0 check finding 5). */
export const OBJECTIVE_ID_MAX = 40;

// ----------------------------------------------------------------------------------------------- the part a set returns

/** An `ambientZone` the set adds (SPEC 7, ENGINE-ANSWERS Q3): edges on whole metres, `minY` -1 (or an upper floor - 0.5),
 *  `maxY` the ceiling - 0.1; the smallest containing zone wins. */
export interface AmbientZoneDef {
  id: string;
  box: Box;
  ambient: number;
  minY: number;
  maxY: number;
}

/** A plain wall switch (`MapLayout.switches`; isolator push stations are course devices instead). */
export interface SwitchDef {
  id: string;
  group: number;
  pos: Pt;
  /** Facing (rad, 0 = +z): out of the wall into the room. */
  yaw: number;
}

/** A debug-menu teleport point (`MapLayout.debugPoints`; the e2e walks read `<bay>-entry` and `<bay>-mid`). */
export interface DebugPoint {
  id: string;
  label: string;
  pos: Pt;
  yaw: number;
}

/**
 * A light-test spot (`tests/ctcourseLight.test.ts`, LIGHTING-PLAN section 5). Bands (`MARLOW_LEVEL`):
 * - `pool`: a lit pool a route must cross, >= `poolMin` (the meter's lit band);
 * - `read`: lit walkable floor, >= `readMin`;
 * - `pocket`: a permanent dark pocket, a crouched body <= `pocketMax`;
 * - `cut`: with the `off` groups switched off, <= `cutMax` (the exercise circuit's dark);
 * - `standby`: with every lamp off, the set's standby fill (0.14) (sets) or `house` (0.30) for facility rooms;
 * - `any`: tuned only (the json keeps its level).
 * Surface spots (`kind: 'surf'`) read `levelAt`; body spots `bodyLevel` (standing 1.7 m, crouched for pockets).
 */
export interface LightSpot {
  name: string;
  kind: 'body' | 'surf';
  x: number;
  y: number;
  z: number;
  band: 'pool' | 'read' | 'pocket' | 'cut' | 'standby' | 'house' | 'any';
  off?: number[];
  /** Read with every door shut (default: open). */
  shut?: boolean;
}

/** A GPU shot (`scripts/shots-ctcourse.mjs`): the player's feet, the photo camera and its target (m). */
export interface ShotVantage {
  name: string;
  feet: [number, number, number];
  cam: [number, number, number];
  target: [number, number, number];
}

/**
 * One element-register row (SPEC 18) and how many of the part's builder pieces it accounts for. The map test checks
 * that every light, collidable box, door and other anchor the part added is counted by exactly one row's numbers.
 */
export interface RegisterRow {
  id: string;
  element: string;
  lights?: number;
  solids?: number;
  doors?: number;
  anchors?: number;
}

/**
 * What a set builder returns: everything the merge needs besides the geometry it wrote into the builder.
 * Course ids (`devices`, `doors`, gates, flags) follow the id rules above.
 */
export interface SetPart {
  id: SetId;
  /** True while the set file is the slice 0d stub (an empty lit room): the frames skip the checks only a built set can
   *  pass (each circuit row with planned lamps has a lamp, a tuned light file per spot). Remove it in the set slice. */
  stub?: boolean;
  /** The bay: squad slots spawned when it starts, its gates, radio lines, drills and role claims (`BayDef`). */
  bay: { squad: string[]; gates: GateDef[]; radio: RadioLine[]; drills: DrillDef[]; roles?: RoleClaim[]; /** (J14) The bay's numbered stations (replan variant only). */ stations?: readonly StationDef[] };
  /** Objective steps in route order (`CourseObjective`, N1, bay = the set's bay id); the last without `done` is the line
   *  shown once the others are done ("Both of you into holding room two."). */
  objectives: CourseObjective[];
  /** Flags set by pass zones, scanners or the mode (`CourseDef.externalFlags`). */
  externalFlags: string[];
  devices: Record<string, CourseDevice>;
  /** Course door id -> door anchor id (the set's own doors; the holding-room doors are the facility's). */
  doors: Record<string, number>;
  anchors: Record<string, number>;
  squads: Record<string, SquadSlot>;
  consoles: SecurityConsole[];
  /** The set's changeable light groups (`CourseLayout.groups` keys -> numbers); each must equal its
   *  `marlowCourseGroups()` row. */
  groups: Record<string, number>;
  switches: SwitchDef[];
  /** SPEC 7: the set's standby zone (and its upper levels' zones, pockets' zones). */
  ambientZones: AmbientZoneDef[];
  cameras: CameraDevice[];
  /** Camera levels by name (floor height, m) for cameras on an upper level (A8's gallery C2: `a8-gallery` 4.4). */
  levels?: Record<string, number>;
  lasers: LaserDef[];
  laserPanels: LaserPanelDef[];
  scanners: ScannerDef[];
  passZones: PassZone[];
  hideSpots: Pt[];
  medkitWalls: { pos: Pt; yaw: number }[];
  /** SPEC 13 (ENGINE-ANSWERS Q13): `open` for halls, `tight` for corridors, aisles and small rooms. */
  camSpaces: CamSpace[];
  /** One nav flood seed per reachable floor the spawn does not reach by walking (feet points). */
  navSeeds: Pt[];
  debugPoints: DebugPoint[];
  /** The props kit's placements (visual; the set wrote their gameplay boxes itself, `FacilityProps.write(b)`), merged
   *  into `MapLayout.facilityProps`. */
  props: PropPlacement[];
  /** The planned co-op lips (greybox helpers' `lips`, for `COOP_LIPS`). */
  lips: CoopLip[];
  register: RegisterRow[];
  lightSpots: LightSpot[];
  shotVantages: ShotVantage[];
}

/** The builder pieces the register counts: lights, collidable boxes, doors and the other anchors. */
export interface PieceCount {
  lights: number;
  solids: number;
  doors: number;
  anchors: number;
}

/** The builder's piece counts now (build time only: it scans the boxes). */
export function pieceCount(b: LevelBuilder): PieceCount {
  let solids = 0;
  for (const p of b.boxes) if (p.collide) solids++;
  return { lights: b.lights.lights.length, solids, doors: b.anchors.doors.length, anchors: b.anchors.all.length - b.anchors.doors.length };
}

/** The pieces added between two counts. */
export function pieceDelta(a: PieceCount, z: PieceCount): PieceCount {
  return { lights: z.lights - a.lights, solids: z.solids - a.solids, doors: z.doors - a.doors, anchors: z.anchors - a.anchors };
}

/** The sum of a part's register rows. */
export function registerSum(rows: readonly RegisterRow[]): PieceCount {
  const s = { lights: 0, solids: 0, doors: 0, anchors: 0 };
  for (const r of rows) {
    s.lights += r.lights ?? 0;
    s.solids += r.solids ?? 0;
    s.doors += r.doors ?? 0;
    s.anchors += r.anchors ?? 0;
  }
  return s;
}

/**
 * Build with `fn` and add what it placed to register row `id` (created on first use): the easy way to keep a part's
 * register in step with its code (`facility.ts`, the stubs).
 */
export function tally(b: LevelBuilder, rows: RegisterRow[], id: string, element: string, fn: () => void): void {
  const a = pieceCount(b);
  fn();
  const d = pieceDelta(a, pieceCount(b));
  let r = rows.find((x) => x.id === id);
  if (!r) rows.push((r = { id, element }));
  r.lights = (r.lights ?? 0) + d.lights;
  r.solids = (r.solids ?? 0) + d.solids;
  r.doors = (r.doors ?? 0) + d.doors;
  r.anchors = (r.anchors ?? 0) + d.anchors;
}

/** An empty part for `id` (a builder fills in what it has). */
export function emptyPart(id: SetId): SetPart {
  return {
    id,
    bay: { squad: [], gates: [], radio: [], drills: [] },
    objectives: [],
    externalFlags: [],
    devices: {},
    doors: {},
    anchors: {},
    squads: {},
    consoles: [],
    groups: {},
    switches: [],
    ambientZones: [],
    cameras: [],
    lasers: [],
    laserPanels: [],
    scanners: [],
    passZones: [],
    hideSpots: [],
    medkitWalls: [],
    camSpaces: [],
    navSeeds: [],
    debugPoints: [],
    props: [],
    lips: [],
    register: [],
    lightSpots: [],
    shotVantages: [],
  };
}

// ---------------------------------------------------------------------------------------------------------- the rules

/** Is (x, z) inside box `b` (grown by `pad` m)? */
export function inBox(b: Box, x: number, z: number, pad = 0): boolean {
  return x >= Math.min(b[0], b[2]) - pad && x <= Math.max(b[0], b[2]) + pad && z >= Math.min(b[1], b[3]) - pad && z <= Math.max(b[1], b[3]) + pad;
}
/** Is (x, z) inside one of set `id`'s boxes (grown by `pad`)? */
export function inSet(id: SetId, x: number, z: number, pad = 0): boolean {
  for (const b of SET_BOX[id]) if (inBox(b, x, z, pad)) return true;
  return false;
}
/** The plan box round all of set `id`'s boxes (`MARLOW_ROOMS`' box for the set). */
export function setBounds(id: SetId): Box {
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  for (const b of SET_BOX[id]) {
    x0 = Math.min(x0, b[0], b[2]);
    z0 = Math.min(z0, b[1], b[3]);
    x1 = Math.max(x1, b[0], b[2]);
    z1 = Math.max(z1, b[1], b[3]);
  }
  return [x0, z0, x1, z1];
}
/** Is the box `inner` inside one of set `id`'s boxes (grown by `pad`)? */
export function boxInSet(id: SetId, inner: Box, pad = 0): boolean {
  for (const b of SET_BOX[id]) if (inBox(b, inner[0], inner[1], pad) && inBox(b, inner[2], inner[3], pad)) return true;
  return false;
}

/**
 * The contract's rules for one set part (the map test runs it on every part): ids by prefix, light groups in range,
 * every placed thing inside the set box, cameras within the budget, guards at most 3, objective steps in the set's bay
 * with ids that fit the wire, the role claims' devices its own. Returns one line per problem (empty = fine).
 */
export function checkSetPart(p: SetPart): string[] {
  const bad: string[] = [];
  const id = p.id;
  const pre = setIdPrefix(id);
  const dpre = setDoorPrefix(id);
  const bay = setBay(id);
  const [g0, g1] = setGroups(id);
  const at = (what: string): string => `${id}: ${what}`;
  const own = (s: string, what: string): void => {
    if (!ownsId(id, s)) bad.push(at(`${what} '${s}' does not carry the tag '${pre}'`));
  };
  // a point inside the set box; 0.5 m of slack for devices mounted on a boundary wall's face
  const inside = (x: number, z: number, what: string, pad = 0.5): void => {
    if (!inSet(id, x, z, pad)) bad.push(at(`${what} at (${x}, ${z}) is outside the set box`));
  };
  for (const [k, d] of Object.entries(p.devices)) {
    own(k, 'device');
    inside(d.x, d.z, `device '${k}'`);
  }
  for (const k of Object.keys(p.anchors)) own(k, 'anchor');
  for (const d of p.bay.drills) own(d.id, 'drill');
  for (const k of Object.keys(p.doors)) if (!k.startsWith(dpre)) bad.push(at(`door '${k}' does not start '${dpre}'`));
  for (const g of p.bay.gates) own(g.id, 'gate');
  for (const f of p.externalFlags) own(f, 'flag');
  for (const [k, s] of Object.entries(p.squads)) {
    own(k, 'squad slot');
    inside(s.x, s.z, `squad slot '${k}'`, 0);
  }
  if (p.bay.squad.length > SET_GUARDS_MAX) bad.push(at(`${p.bay.squad.length} guards, at most ${SET_GUARDS_MAX}`));
  for (const s of p.bay.squad) if (!p.squads[s]) bad.push(at(`squad '${s}' has no slot`));
  for (const c of p.consoles) own(c.id, 'console');
  for (const o of p.objectives) {
    own(o.id, 'objective step');
    if (o.bay !== bay) bad.push(at(`objective '${o.id}' is in bay '${o.bay}', not ${bay}`));
    if (o.id.length > OBJECTIVE_ID_MAX) bad.push(at(`objective id '${o.id}' is over ${OBJECTIVE_ID_MAX} characters`));
  }
  if (!p.objectives.some((o) => o.done === undefined)) bad.push(at('no closing objective line (a step without done)'));
  for (const [k, g] of Object.entries(p.groups)) if (g < g0 || g > g1) bad.push(at(`light group ${k} = ${g} is outside ${g0}-${g1}`));
  for (const s of p.switches) {
    if (s.group < g0 || s.group > g1) bad.push(at(`switch '${s.id}' on group ${s.group}, outside ${g0}-${g1}`));
    inside(s.pos.x, s.pos.z, `switch '${s.id}'`);
  }
  // zones snap to whole metres on the wall lines (ENGINE-ANSWERS Q3): inside the set's bounds, 0.5 m of slack
  const sb = setBounds(id);
  for (const z of p.ambientZones) if (!(inBox(sb, z.box[0], z.box[1], 0.5) && inBox(sb, z.box[2], z.box[3], 0.5))) bad.push(at(`ambient zone '${z.id}' is outside the set's bounds`));
  for (const c of p.cameras) {
    own(c.id, 'camera');
    inside(c.at[0], c.at[1], `camera '${c.id}'`);
  }
  if (p.cameras.length > CAMERA_BUDGET[id]) bad.push(at(`${p.cameras.length} cameras, budget ${CAMERA_BUDGET[id]}`));
  for (const l of p.lasers) {
    own(l.id, 'laser');
    inside(l.x1, l.z1, `laser '${l.id}' end`);
    inside(l.x2, l.z2, `laser '${l.id}' end`);
  }
  for (const l of p.laserPanels) own(l.id, 'laser panel');
  for (const s of p.scanners) {
    own(s.id, 'scanner pair');
    own(s.flag, 'scanner flag');
  }
  for (const z of p.passZones) {
    own(z.id, 'pass zone');
    own(z.flag, 'pass zone flag');
    if (!boxInSet(id, z.box, 0.01)) bad.push(at(`pass zone '${z.id}' is outside the set box`));
  }
  for (const r of p.bay.roles ?? []) for (const d of r.press ?? []) if (!p.devices[d]) bad.push(at(`role claim device '${d}' is not the set's`));
  for (const c of p.camSpaces) if (!boxInSet(id, c.box, 0.01)) bad.push(at('a camera space is outside the set box'));
  for (const s of [...p.navSeeds, ...p.hideSpots]) inside(s.x, s.z, 'a nav seed or hide spot', 0);
  for (const m of p.medkitWalls) inside(m.pos.x, m.pos.z, 'a medkit');
  for (const d of p.debugPoints) if (!d.id.startsWith(`${bay}-`)) bad.push(at(`debug point '${d.id}' does not start '${bay}-'`));
  const names = new Set<string>();
  for (const s of p.lightSpots) {
    if (!s.name.startsWith(`${bay} `)) bad.push(at(`light spot '${s.name}' does not start '${bay} '`));
    if (names.has(s.name)) bad.push(at(`light spot '${s.name}' twice`));
    names.add(s.name);
    inside(s.x, s.z, `light spot '${s.name}'`, 0);
  }
  for (const v of p.shotVantages) if (!v.name.startsWith(`${bay.toLowerCase()}-`)) bad.push(at(`shot '${v.name}' does not start '${bay.toLowerCase()}-'`));
  const rows = new Set<string>();
  for (const r of p.register) {
    if (!r.id.startsWith(`${bay}-`)) bad.push(at(`register row '${r.id}' does not start '${bay}-'`));
    if (rows.has(r.id)) bad.push(at(`register row '${r.id}' twice`));
    rows.add(r.id);
  }
  return bad;
}
