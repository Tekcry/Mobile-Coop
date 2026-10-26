// (campus-greybox, v2 lane S4) Copied from `campusS4.ts` at P0; the S4 lane's greybox. Built only when `flags.campusV2` names 4.
import { Vector3 } from '../../../core/babylon';
import { GLASS_COLOR } from '../../levelBuilder';
import type { LevelBuilder } from '../../levelBuilder';
import type { RoomDef } from '../../rooms';
import type { MapLayout } from '../../mapDef';
import type { LaserDef } from '../../../game/jammer';
import type { LaserPanelDef } from '../../../game/laserPanels';
import type { BoardDef } from '../../../game/isolators';
import { makeCone, type LightCone } from '../../lights';
import type { CoopLip } from '../campusS1';

/**
 * Saltmarsh Park (`campusOps`) section 4 - the data hall (`docs/sector-redesign/briefs/SLICE4.md`, slice 4). A greybox:
 * boxes, lamps, switches, the compound board, the lasers and their panel, hide spots and nav seeds; no dressing, no
 * pickups. Frame: x west to east, z south to north, y up, metres; yaw 0 = +z, PI / 2 = +x. Footprint x -10..34, z 16..48
 * (ground, the NOC mezzanine 3.6, the plant deck 7.3); the generator compound x 34..40 is inside the section (walled, never
 * fenced: A84). Every piece is an axis-aligned box (yaw 0).
 *
 * Plan: the dock (S, the C3 side) x 14..34, z 16..22; the one goods-in lobby (with the mantrap and the return-air plenum
 * over its slab; J17 G4.1-G4.2) x -4..14 along the south; the battery room, the colonnade corridor (C4's near door) and the UPS room down the west side; the data
 * hall x -4..34, z 22..42 (five hot-aisle pods, the cage, the cable baskets at 4.4 over the cold aisles); the security room
 * and the NOC mezzanine (the one stair) x -4..8, z 42..48; the north corridor and the riser (the caged ladder to the basket
 * landing and the deck) x 8..34, z 42..48; the generator compound east; the plant deck on the roof.
 */

const PI = Math.PI;
const T = 0.3;
const P = 0.2;
const WALL = '#b5b0a6';
const WALL_DARK = '#7b766c';
const STEEL = '#55606a';
const SLAB = '#80868a';
const ROOF = '#4a4f55';
const DESK = '#8a6a4c';
const RACK = '#2f3a44';
const CAGE = '#6b727a';
const CRATE = '#7a6a4a';
const PLANT = '#6a7580';
const WHITE: [number, number, number] = [1, 0.97, 0.92];
/** S1's sodium triple (`campusS1.ts:25`): the warm console lamp. */
const WARM: [number, number, number] = [1, 0.72, 0.38];

/** The roof slab's underside and top (the hall's clear height; the top is the plant deck). */
export const S4_ROOF = 7.0;
export const S4_DECK = 7.3;
/** The NOC mezzanine's floor top (slab 3.4-3.6). */
export const S4_NOC = 3.6;
/** The cable baskets' top (boxes 4.0-4.4). */
export const S4_BASKET = 4.4;
const DOOR_H = 2.1;

/** The lamp circuits of section 4 (S1 40-49, S2 50-58, S3 60-67, S5 takes 80-89; the J17 band 140-149: nc 140, riser 141, batt 142). */
export const S4_GROUPS = { cold1: 70, cold2: 71, cold3: 72, lobby: 73, dock: 74, yard: 75, noc: 76, sec: 77, ups: 78, deck: 79, nc: 140, riser: 141, batt: 142 } as const;

/** The doors the sector data and the tests find by centre [x, z] (`Doors.nearest`, plan only). */
export const S4_DOORS = {
  /** C3's far door (the dock's south wall; the S1 test asserts it). */
  c3Far: [24, 16] as [number, number],
  /** C4's near door (the colonnade corridor's west wall; the S1 test asserts it). */
  c4Near: [-10, 29] as [number, number],
  kpBatt: [-4, 18.5] as [number, number],
  /** (G4.5 C22) the riser partition moved to x 30.5. */
  // bolt point (Dunmore's spook respawn, Code Relay A11): (28, 0, 45.8) kept clear
  kpDeck: [30.5, 45] as [number, number],
  /** (G4.5 D:37, BT:102) the cable-pull door from the compound into the riser, keypad on the plant doors code. */
  kpRiser: [34, 46.5] as [number, number],
  pgCage: [18, 40] as [number, number],
  cageFront: [18, 34] as [number, number],
  dockWest: [14, 17.5] as [number, number],
  dockEast: [34, 19] as [number, number],
  hallBatt: [-4, 25] as [number, number],
  hallUps: [-4, 38] as [number, number],
  /** (G4.3 C15) the staff door from the UPS room into the security room. */
  upsSec: [-4, 46.5] as [number, number],
  hallEast: [34, 30] as [number, number],
  mantrapOuter: [8, 20.5] as [number, number],
  mantrapInner: [9.5, 22] as [number, number],
  battCC: [-8.5, 27.5] as [number, number],
  ccUps: [-5.5, 31] as [number, number],
  secDoor: [2, 42] as [number, number],
  ncDoor: [20, 42] as [number, number],
  /** (G4.4 C18) the security room's side door, moved north to clear the escape ladder's foot. */
  secNc: [8, 43.5] as [number, number],
  /** (G4.4 C18) the NOC's escape door (floor 3.6) onto the platform over the north corridor. */
  nocEscape: [8, 45.5] as [number, number],
  yardGate: [37.5, 16] as [number, number],
} as const;

/**
 * (G4.4 C16, D:31) The NOC's dog-leg fire stair, 0.3 m south of the drawing (P3): `LevelBuilder.stairs` arguments. Flight 1
 * rises west from the foot (x 4.2, G) to the mid landing (x 1.4, 1.8); flight 2 rises east from it to the NOC slab (x 4.2,
 * 3.6). Risers 1.8 / 11 = 0.164, goings 2.8 / 10 = 0.28.
 */
export const S4_FLIGHTS = [
  { cx: 2.8, cz: 47.15, w: 1.3, len: 2.8, rise: 1.8, yaw: -PI / 2, y0: 0, steps: 11 }, // flight 1, rises west
  { cx: 2.8, cz: 45.75, w: 1.3, len: 2.8, rise: 1.8, yaw: PI / 2, y0: 1.8, steps: 11 }, // flight 2, rises east
] as const;

/** The pods' west x (each x0..x0 + 3.6, z 24..32): P1-P5. The hot-aisle centres are x0 + 1.8. */
export const S4_PODS: readonly number[] = [-1.0, 4.6, 10.2, 22.2, 27.8];

/** (G4.5 C25) The deck's pole floods' feet [x, z]. */
export const S4_DECK_POLES: readonly (readonly [number, number])[] = [[-3, 24], [8, 36], [20, 24], [24, 38]];

/** The plan boxes the tests read: [x0, z0, x1, z1]. */
export const S4_BOX = {
  foot: [-10, 16, 34, 48] as const,
  yard: [34, 16, 40, 48] as const,
  hall: [-4, 22, 34, 42] as const,
  dock: [14, 16, 34, 22] as const,
  battery: [-10, 16, -4, 27.5] as const,
  ups: [-10, 31, -4, 48] as const,
  sec: [-4, 42, 8, 48] as const,
  nc: [8, 42, 30.5, 48] as const,
  riser: [30.5, 42, 34, 48] as const,
  cage: [14, 34, 22, 40] as const,
  podZ: [24, 32] as const,
  racksTop: 2.2,
  podTop: 3.0,
  /** The cable baskets (tops 4.4): [x0, z0, x1, z1]. */
  /** (G4.2 C10) B1 and B2 run on south to the hall wall (z 22.15) and end at the plenum grilles. */
  b1: [3.1, 22.15, 4.1, 40.8] as const,
  b2: [8.7, 22.15, 9.7, 40.8] as const,
  b3: [26.3, 24, 27.3, 40.8] as const,
  bN: [3.1, 40.8, 32.6, 41.8] as const,
  bCage: [17.5, 34.4, 18.5, 40.8] as const,
  stub: [31.6, 41.8, 32.6, 42.15] as const,
  /** The CR4 box of B1 (ledges kept). */
  cr4: [3.1, 32.4, 4.1, 35.6] as const,
  landing: [30.7, 42.15, 33.85, 44.6] as const,
  hatch: [31.6, 42.6, 32.8, 43.8] as const,
  spareRack: [-1.0, 37.0, 4.0, 38.2] as const,
  crac: [24, 37, 32, 38.2] as const,
  buildOut: [-4, 33, 13.8, 42] as const,
  /** (G4.2 C11) 2.0 high, noLedge; the east row cut to z 21.0..23.5 (P1). */
  batteryRacks: [[-9.4, 18.0, -8.4, 26.5], [-5.6, 21.0, -4.6, 23.5]] as const,
  upsCabinets: [-9.6, 32, -8.6, 46] as const,
  chillers: [[4, 31, 8, 33], [12, 31, 16, 33], [20, 31, 24, 33], [26, 31, 30, 33]] as const,
  generator: [36, 34, 39, 40] as const,
  tanks: [36, 26, 39, 30] as const,
  c3: [22, 0, 26, 16] as const,
  c4: [-26, 26, -10, 32] as const,
} as const;

/**
 * The co-op-only lips of section 4 (CR4): the CR4 box of cable basket B1 (x 3.1..4.1, z 32.4..35.6, top 4.4), reached by a
 * leg-up from the floor at its east face (4.8, 34) or its west face (2.4, 34), both under the shadow line. The racks and pods
 * near it are noLedge over the mantle, no crates stand in the hall; solo reaches the baskets from the riser landing (rule 7).
 * The campus list `CAMPUS_COOP_LIPS` is built once in `campusLips.ts`.
 */
export const S4_COOP_LIPS: readonly CoopLip[] = [
  {
    id: 'CR4',
    section: 3,
    lip: { x: 4.1, z0: 32.4, z1: 35.6, y: 4.4, n: { x: 1, z: 0 } },
    top: { x0: 3.1, x1: 4.1, z0: 32.4, z1: 35.6, top: 4.4 },
    boost: { floor: 0, x: 4.8, z: 34.0 },
    solo: 'the hot aisles to the cage front (keyholder), or the riser ladder to the basket landing (high route)',
  },
  {
    id: 'CR4-west',
    section: 3,
    lip: { x: 3.1, z0: 32.4, z1: 35.6, y: 4.4, n: { x: -1, z: 0 } },
    top: { x0: 3.1, x1: 4.1, z0: 32.4, z1: 35.6, top: 4.4 },
    boost: { floor: 0, x: 2.4, z: 34.0 },
    solo: 'as CR4',
  },
  // (G4.2, CR8, D:24) the return-air grilles' sills in the dock's west wall and the battery room's east wall (x = the wall
  // face on the boost side: the dock wall P 0.2 at x 14, the hall wall T 0.3 at x -4), into the plenum over the lobby slab
  {
    id: 'CR8',
    section: 3,
    lip: { x: 14.1, z0: 19.5, z1: 21.0, y: 4.4, n: { x: 1, z: 0 } },
    top: { x0: -4, x1: 14, z0: 16, z1: 22, top: 3.2 },
    boost: { floor: 0, x: 14.6, z: 20.2 },
    solo: 'the plenum from baskets B1 / B2 (the riser ladder to the basket landing)',
  },
  {
    id: 'CR8-west',
    section: 3,
    lip: { x: -4.15, z0: 19.5, z1: 21.0, y: 4.4, n: { x: -1, z: 0 } },
    top: { x0: -4, x1: 14, z0: 16, z1: 22, top: 3.2 },
    boost: { floor: 0, x: -4.8, z: 20.2 },
    solo: 'as CR8',
  },
  // (G4.5, CR10, D:38) the plant ladder's anti-climb cage top (x 34.15..35.05, z 22.4..23.6, top 4.4) from the compound floor
  {
    id: 'CR10',
    section: 3,
    lip: { x: 35.05, z0: 22.4, z1: 23.6, y: 4.4, n: { x: 1, z: 0 } },
    top: { x0: 34.15, x1: 35.05, z0: 22.4, z1: 23.6, top: 4.4 },
    boost: { floor: 0, x: 35.65, z: 23.0 },
    solo: 'the cable-pull door (kp-riser, the dock board code), R1 and R2',
  },
];

/** The laser band over the cage: las-tray, two beams across cable basket B-cage just north of the cage (the basket's full width). */
export const S4_LASERS: LaserDef[] = [
  { id: 'las-tray', x1: 17.5, z1: 40.4, x2: 18.5, z2: 40.4, ys: [0.3, 0.9], floorY: S4_BASKET, label: 'Cage tray beams', section: 3 },
];

/** Its power panel: on the hall's north wall above B-N (seen from the whole basket run; 1.4 over the basket). */
export const S4_PANELS: LaserPanelDef[] = [
  { id: 'panel-tray', lasers: ['las-tray'], x: 23.5, y: 5.8, z: 41.85, yaw: PI, section: 3, label: 'Cage tray beams power' },
];

/** The near-side points (feet) the panel is seen from (the unit test traces eye lines from them). */
export const S4_PANEL_NEAR: Record<string, readonly (readonly [number, number, number])[]> = {
  'panel-tray': [[21.0, S4_BASKET, 41.3], [25.0, S4_BASKET, 41.3], [28.0, S4_BASKET, 41.3]],
};

/** The compound board: a timed isolator (window 20) in the dock that cuts the yard floods (A90). */
export const S4_BOARDS: BoardDef[] = [
  { pos: new Vector3(33.85, 0, 20.8), yaw: -PI / 2, groups: [S4_GROUPS.yard], window: 20 }, // sync-s4-yard-board
  // (G4.3 C12, D:27, SY:41) the essential-lighting board on the battery room's side of the colonnade wall: the NOC and security room lamps, 25 s
  { pos: new Vector3(-5.5, 0, 27.3), yaw: PI, groups: [S4_GROUPS.noc, S4_GROUPS.sec], window: 25 }, // sync-s4-ess-board
];

/** Nav seeds: the dock, the service corridor, the hall, the battery room, the UPS room, the security room, the NOC, the north corridor, the riser, the compound, a basket, the landing, the deck. */
export const S4_NAV_SEEDS: Vector3[] = [
  new Vector3(24, 0, 19),
  new Vector3(4, 0, 17),
  new Vector3(6.4, 0, 33),
  new Vector3(-7, 0, 22),
  new Vector3(-7, 0, 36),
  new Vector3(2, 0, 45),
  new Vector3(2, S4_NOC, 44),
  new Vector3(20, 0, 45),
  new Vector3(32.2, 0, 46.5),
  new Vector3(37, 0, 20),
  new Vector3(18, S4_BASKET, 41.3),
  new Vector3(32.2, S4_BASKET, 43.4),
  new Vector3(20, S4_DECK, 36),
  // (G4.2) the return-air plenum (a player space: the 1.5 m grilles keep guards out, under the 1.7 headroom)
  new Vector3(5, 3.2, 19),
  // (G4.4) the fire stair's top landing on the NOC slab
  new Vector3(4.85, S4_NOC, 45.75),
];

/** Where a carried body can be hidden: the battery room's SW corner, the UPS room's north end, the north corridor's east end, the compound's NE corner, the hall's NW corner. */
export const S4_HIDESPOTS: NonNullable<MapLayout['hideSpots']> = [
  { pos: new Vector3(-9.2, 0, 17.2) },
  { pos: new Vector3(-7.2, 0, 47.2) },
  { pos: new Vector3(29.6, 0, 47.2) },
  { pos: new Vector3(39.2, 0, 47.2) },
  { pos: new Vector3(-3.2, 0, 41.2) },
  // (G4.1, D:90) the lobby alcove east of the mantrap
  { pos: new Vector3(12.6, 0, 21.3) },
];

/**
 * Light switches: the hall panel in the service corridor (three rows, lure #4 or #20), the lobby by the corridor door, the
 * dock by the dock's west door, the NOC by the flight's head, the security room by its door, the UPS room by its hall door
 * (the K3 "colonnade lights" lure). The yard floods are on the dock's board (`S4_BOARDS`); the deck task lights have none.
 */
export const S4_SWITCHES: NonNullable<MapLayout['switches']> = [
  // (G4.1, D:20) the hall panel on the shell south wall's inner face, the lobby switch by the dock door
  { pos: new Vector3(-1.4, 0, 16.15), yaw: 0, group: S4_GROUPS.cold1 },
  { pos: new Vector3(-1.0, 0, 16.15), yaw: 0, group: S4_GROUPS.cold2 },
  { pos: new Vector3(-0.6, 0, 16.15), yaw: 0, group: S4_GROUPS.cold3 },
  { pos: new Vector3(13.85, 0, 18.6), yaw: -PI / 2, group: S4_GROUPS.lobby },
  { pos: new Vector3(14.15, 0, 18.8), yaw: PI / 2, group: S4_GROUPS.dock },
  { pos: new Vector3(6.0, S4_NOC, 47.85), yaw: PI, group: S4_GROUPS.noc },
  { pos: new Vector3(2.8, 0, 42.15), yaw: 0, group: S4_GROUPS.sec },
  { pos: new Vector3(-4.15, 0, 37.0), yaw: -PI / 2, group: S4_GROUPS.ups },
  // (G4.3 C12, derived) inside hallBatt (-4, 25) on its latch side, 0.6 m past the opening, 0.15 off the wall face
  { pos: new Vector3(-4.3, 0, 26.2), yaw: -PI / 2, group: S4_GROUPS.batt },
  // (G4.4, 0.5 rule 4, derived) the north corridor's circuit: inside ncDoor (20, 42) on its latch side
  { pos: new Vector3(21.2, 0, 42.3), yaw: 0, group: S4_GROUPS.nc },
  // (G4.5, 0.5 rule 4, derived) the riser's circuit: inside kpDeck (30.5, 45) on its latch side
  { pos: new Vector3(30.75, 0, 46.2), yaw: PI / 2, group: S4_GROUPS.riser },
];

/** Section 4's rooms (HUD tags; no squads). Stacked rooms carry their storey (`minY` / `maxY`); none overlap (the lobby and hall are cut round the mantrap and the cage). */
export const S4_ROOMS: RoomDef[] = [
  { id: 's4-dock', name: 'Loading Dock', minX: 14, maxX: 34, minZ: 16, maxZ: 22, maxY: 7.2 },
  // (G4.1, C1 / C2) the one goods-in lobby (cut round the mantrap), the mantrap, the return-air plenum over the lobby slab
  { id: 's4-lobby', name: 'Goods-in Lobby', minX: -4, maxX: 8, minZ: 16, maxZ: 22, maxY: 3.1 },
  { id: 's4-lobby-e', name: 'Goods-in Lobby', minX: 8, maxX: 14, minZ: 16, maxZ: 19, maxY: 3.1 },
  { id: 's4-lobby-a', name: 'Goods-in Lobby', minX: 11, maxX: 14, minZ: 19, maxZ: 22, maxY: 3.1 },
  { id: 's4-mantrap', name: 'Mantrap', minX: 8, maxX: 11, minZ: 19, maxZ: 22, maxY: 3.1 },
  { id: 's4-plenum', name: 'Return-air Plenum', minX: -4, maxX: 14, minZ: 16, maxZ: 22, minY: 3.1, maxY: 7.2 },
  { id: 's4-batt', name: 'Battery Room', minX: -10, maxX: -4, minZ: 16, maxZ: 27.5, maxY: 7.2 },
  { id: 's4-cc', name: 'Colonnade Corridor', minX: -10, maxX: -4, minZ: 27.5, maxZ: 31, maxY: 3.1 },
  { id: 's4-ups', name: 'UPS Room', minX: -10, maxX: -4, minZ: 31, maxZ: 48, maxY: 7.2 },
  { id: 's4-hall', name: 'Data Hall', minX: -4, maxX: 34, minZ: 22, maxZ: 34, maxY: 7.2 },
  { id: 's4-hall-w', name: 'Data Hall', minX: -4, maxX: 14, minZ: 34, maxZ: 40, maxY: 7.2 },
  { id: 's4-hall-e', name: 'Data Hall', minX: 22, maxX: 34, minZ: 34, maxZ: 40, maxY: 7.2 },
  { id: 's4-hall-n', name: 'Data Hall', minX: -4, maxX: 34, minZ: 40, maxZ: 42, maxY: 7.2 },
  { id: 's4-cage', name: 'Server Cage', minX: 14, maxX: 22, minZ: 34, maxZ: 40, maxY: 7.2 },
  { id: 's4-sec', name: 'Security Room', minX: -4, maxX: 8, minZ: 42, maxZ: 48, maxY: 3.5 },
  { id: 's4-noc', name: 'NOC', minX: -4, maxX: 8, minZ: 42, maxZ: 48, minY: 3.5, maxY: 7.2 },
  { id: 's4-nc', name: 'North Corridor', minX: 8, maxX: 30.5, minZ: 42, maxZ: 48, maxY: 7.2 },
  { id: 's4-riser', name: 'Cable Riser', minX: 30.5, maxX: 34, minZ: 42, maxZ: 48, maxY: 7.2 },
  { id: 's4-yard', name: 'Generator Compound', minX: 34, maxX: 40, minZ: 16, maxZ: 48 },
  { id: 's4-deck', name: 'Plant Deck', minX: -10, maxX: 34, minZ: 16, maxZ: 48, minY: 7.2 },
].map((r) => ({ ...r, squad: [] }));

/** One S4 lamp fitting (`S4_LIGHTS`): position, pool radius, intensity, circuit, an optional downward cone, the fixture width and colour. */
export interface S4Lamp {
  x: number;
  y: number;
  z: number;
  r: number;
  i: number;
  group: number;
  cone?: LightCone | null;
  w?: number;
  /** Default `WHITE`. */
  color?: readonly [number, number, number];
}

const DOWN = makeCone(0, -1, 0, 1.15);

// PROVISIONAL - light-realism (J10) retunes these values (AS/NZS 1680 / 1158 bands). TODO(light-realism): replace with calibrated values.
/**
 * (campus-greybox G4.1, job BRIEF A19) Every lamp of section 4, in named lists; `buildCampusS4` draws every lamp from this
 * block and from nowhere else. The as-built lamps (the first twelve lists, `campusS4.ts` as built) keep their position,
 * radius, intensity and group; the plan's removals and dims are not built (Q2 "Never"); the plan's lamps with a job of
 * their own are added after them.
 */
export const S4_LIGHTS = {
  // ---- as built (B:494-505)
  cold1: [[3.6, 25], [3.6, 29], [9.2, 25], [9.2, 29], [-2.5, 26], [-2.5, 34]].map(([x, z]) => ({ x: x!, y: 3.6, z: z!, r: 4.5, i: 0.8, group: S4_GROUPS.cold1, cone: DOWN })),
  cold2: [25, 29.5, 33.0].map((z) => ({ x: 18, y: 3.6, z, r: 5, i: 0.8, group: S4_GROUPS.cold2, cone: DOWN })),
  cage: [{ x: 18, y: 2.8, z: 37, r: 5, i: 0.8, group: S4_GROUPS.cold2, cone: DOWN }],
  cold3: [[26.8, 25], [26.8, 29], [32.7, 26], [32.7, 34]].map(([x, z]) => ({ x: x!, y: 3.6, z: z!, r: 4.5, i: 0.8, group: S4_GROUPS.cold3, cone: DOWN })),
  lobby: [{ x: 5, y: 2.8, z: 20, r: 5, i: 0.8, group: S4_GROUPS.lobby, cone: DOWN }],
  dockFloods: [20, 29].map((x) => ({ x, y: 6.0, z: 19, r: 8, i: 0.9, group: S4_GROUPS.dock, w: 0.6 })),
  yardFloods: [24, 40].map((z) => ({ x: 35.35, y: 6.0, z, r: 9, i: 0.9, group: S4_GROUPS.yard, w: 0.6 })),
  noc: [0, 5].map((x) => ({ x, y: 6.4, z: 45, r: 6, i: 0.8, group: S4_GROUPS.noc, w: 0.5 })),
  sec: [0, 5].map((x) => ({ x, y: 3.1, z: 44.5, r: 5, i: 0.8, group: S4_GROUPS.sec, w: 0.5 })),
  ups: [34, 41].map((z) => ({ x: -7, y: 3.4, z, r: 5, i: 0.7, group: S4_GROUPS.ups, cone: DOWN })),
  cc: [{ x: -7, y: 2.8, z: 29, r: 5, i: 0.7, group: S4_GROUPS.ups, cone: DOWN }],
  deckTask: [6, 14, 22, 28].map((x) => ({ x, y: 8.8, z: 34.2, r: 3.5, i: 0.7, group: S4_GROUPS.deck, w: 0.5 })),
  // ---- added (G4.1): the two lobby lamps (C5, D:20; r = 1.5 x 2.8), the mantrap fitting (0.5 rule 4, derived: the centre of
  // the 3 x 3 under its 3.0 lid), the dock board lamp (D:22, the board reads lit, BT:99)
  lobbyN: [2.0, 6.5].map((x) => ({ x, y: 2.8, z: 21.2, r: 4.2, i: 0.8, group: S4_GROUPS.lobby, cone: makeCone(0, -1, 0, 1.15), w: 0.4 })),
  mantrap: [{ x: 9.5, y: 2.9, z: 20.5, r: 3, i: 0.8, group: S4_GROUPS.lobby, cone: DOWN, w: 0.3 }],
  dockBoard: [{ x: 16, y: 2.4, z: 21.5, r: 3.6, i: 0.8, group: S4_GROUPS.dock, cone: DOWN, w: 0.3 }],
  // ---- added (G4.3): the battery room's hydrogen-rated fitting (C12, D:27; a 2.4 m lamp, r 1.5 x 2.4), circuit batt 142
  batt: [{ x: -7, y: 2.4, z: 24, r: 3.6, i: 0.8, group: S4_GROUPS.batt, cone: DOWN, w: 0.3 }],
  // ---- added (G4.4): the warm console lamp over the desk (C20, D:35 / D:60; a 2.4 m lamp, r 3.6, on the security circuit),
  // the north corridor's three fittings (0.5 rule 4; S2 G5c values; derived: n = ceil(22.5 / 8) = 3 evenly on the centre line)
  console: [{ x: -2.0, y: 2.4, z: 44.6, r: 3.6, i: 0.8, group: S4_GROUPS.sec, cone: DOWN, w: 0.3, color: WARM }],
  // ---- added (G4.5): the four deck pole floods 5.0 m over the deck (C25, D:40; group 79 has no switch: external plant-deck
  // lighting on a photocell, the LD 5.1 named reason; cut by shooting), the riser's stair-class fitting (0.5 rule 4, derived:
  // S3's stair fitting values, off the R1 ladder line)
  deckFloods: S4_DECK_POLES.map(([x, z]) => ({ x, y: 12.3, z, r: 7.5, i: 0.9, group: S4_GROUPS.deck, cone: makeCone(0, -1, 0, 1.15), w: 0.6 })),
  riser: [{ x: 31.2, y: 3.5, z: 47.2, r: 4, i: 0.7, group: S4_GROUPS.riser, w: 0.3 }],
  nc: [11.75, 19.25, 26.75].map((x) => ({ x, y: 3.5, z: 45, r: 5, i: 0.8, group: S4_GROUPS.nc, cone: makeCone(0, -1, 0, 1.2), w: 0.4 })),
} satisfies Record<string, readonly S4Lamp[]>;

/** A visible lamp fitting (the glowing box), a real registry light, from an `S4_LIGHTS` entry. */
function lamp(b: LevelBuilder, l: S4Lamp): void {
  const w = l.w ?? 0.5;
  b.light({
    kind: l.cone ? 'spot' : 'lamp',
    x: l.x,
    y: l.y,
    z: l.z,
    radius: l.r,
    intensity: l.i,
    color: [...(l.color ?? WHITE)] as [number, number, number],
    cone: l.cone ?? null,
    group: l.group,
    on: true,
    destructible: true,
    electric: true,
    fixture: { sx: w, sy: 0.1, sz: w / 2, oy: 0 },
  });
}

interface Flags {
  overhead?: boolean;
  noLedge?: boolean;
}

/** An axis-aligned box from its extents. */
function bx(b: LevelBuilder, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string, f: Flags = {}): void {
  b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
  const p = b.boxes[b.boxes.length - 1]!;
  if (f.overhead) p.overhead = true;
  if (f.noLedge) p.noLedge = true;
}

/** An opening in a wall: a..e along it, from y0 to y1. */
type Hole = readonly [a: number, e: number, y0: number, y1: number];

/** A door opening centred on `c` (1.2 wide, or `w`) on floor `y`. */
const doorHole = (c: number, y: number, w = 1.2): Hole => [c - w / 2, c + w / 2, y, y + DOOR_H];

/**
 * A wall of thickness `t` centred on a line (along x at z when `alongX`, else along z at x), from a0 to a1 and y0 to y1, cut
 * by its openings: the wall is split into upright strips between the openings' edges, each strip solid where no opening
 * covers it. Every piece is noLedge (walls are no climbing routes).
 */
function wall(b: LevelBuilder, alongX: boolean, at: number, a0: number, a1: number, y0: number, y1: number, holes: readonly Hole[], t = T, color = WALL): void {
  const cuts = new Set<number>([a0, a1]);
  for (const h of holes) {
    if (h[0] > a0 && h[0] < a1) cuts.add(h[0]);
    if (h[1] > a0 && h[1] < a1) cuts.add(h[1]);
  }
  const xs = [...cuts].sort((p, q) => p - q);
  for (let i = 0; i + 1 < xs.length; i++) {
    const p = xs[i]!;
    const q = xs[i + 1]!;
    if (q - p < 1e-6) continue;
    const over = holes.filter((h) => h[0] <= p + 1e-6 && h[1] >= q - 1e-6).map((h) => [Math.max(y0, h[2]), Math.min(y1, h[3])] as const).filter((h) => h[1] > h[0]);
    over.sort((u, v) => u[0] - v[0]);
    let y = y0;
    const solid: [number, number][] = [];
    for (const [u, v] of over) {
      if (u > y) solid.push([y, u]);
      y = Math.max(y, v);
    }
    if (y1 > y) solid.push([y, y1]);
    for (const [u, v] of solid) {
      if (v - u < 1e-6) continue;
      if (alongX) bx(b, p, q, u, v, at - t / 2, at + t / 2, color, { noLedge: true });
      else bx(b, at - t / 2, at + t / 2, u, v, p, q, color, { noLedge: true });
    }
  }
}

/** A door anchor centred on `c` in a 1.2 opening of a wall line (hinge at `c - w / 2`). */
function doorAt(b: LevelBuilder, alongX: boolean, at: number, c: number, y: number, swing: 1 | -1, o: { locked?: boolean; breachable?: boolean; w?: number; armoured?: boolean } = {}): void {
  const w = o.w ?? 1.2;
  const a = c - w / 2;
  const opts = { swing, locked: o.locked, breachable: o.breachable ?? !o.locked, ...(o.armoured ? { armoured: true } : {}) };
  if (alongX) b.door(a, y, at, w, PI / 2, opts);
  else b.door(at, y, a, w, 0, opts);
}

/** A floor slab (0.2 thick, top at `top`), overhead and noLedge. */
function slab(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, top: number, color = SLAB): void {
  bx(b, x0, x1, top - 0.2, top, z0, z1, color, { overhead: true, noLedge: true });
}

/** A plan rectangle [x0, x1, z0, z1]. */
type Rect = [number, number, number, number];

/** (G4.4, S5's helper) `r` minus `h` as up to four rectangles. */
function subtract(r: Rect, h: Rect): Rect[] {
  if (h[1] <= r[0] || h[0] >= r[1] || h[3] <= r[2] || h[2] >= r[3]) return [r];
  const out: Rect[] = [];
  if (h[0] > r[0]) out.push([r[0], h[0], r[2], r[3]]);
  if (h[1] < r[1]) out.push([h[1], r[1], r[2], r[3]]);
  const x0 = Math.max(r[0], h[0]);
  const x1 = Math.min(r[1], h[1]);
  if (h[2] > r[2]) out.push([x0, x1, r[2], h[2]]);
  if (h[3] < r[3]) out.push([x0, x1, h[3], r[3]]);
  return out;
}

/** (G4.4) A rectangle minus its holes, as the pieces a slab is built from. */
function cutRect(rect: Rect, holes: readonly Rect[]): Rect[] {
  let pieces: Rect[] = [rect];
  for (const h of holes) pieces = pieces.flatMap((r) => subtract(r, h));
  return pieces.filter((r) => r[1] - r[0] > 0.01 && r[3] - r[2] > 0.01);
}

/** (G4.4, S5's `slab(rect, top, holes)`) A floor slab (0.2 thick, top at `top`) over `rect` minus `holes`, overhead and noLedge. */
function slabCut(b: LevelBuilder, rect: Rect, top: number, holes: readonly Rect[], color = SLAB): void {
  for (const r of cutRect(rect, holes)) slab(b, r[0], r[1], r[2], r[3], top, color);
}

/** (G4.4 C17) The NOC roof hatch in the deck, and (C19) the NOC rooflight over the console's west half. */
const NOC_HATCH: Rect = [6.0, 7.2, 46.6, 47.8];
const ROOFLIGHT: Rect = [0, 4, 43.5, 45.5];
/** (G4.4 C16) The stair well in the NOC slab: both flights and the mid landing. */
const STAIR_WELL: Rect = [0, 4.2, 45.1, 47.85];

/** A steel guard rail (0.1 thick, 1.1 high) on a floor at `y`, noLedge. */
function rail(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, y: number): void {
  bx(b, x0, x1, y, y + 1.1, z0, z1, STEEL, { noLedge: true });
}

/** A cable basket box (0.4 thick, top 4.4), noLedge unless it is the CR4 box (`ledge`). */
function basket(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, ledge = false): void {
  bx(b, x0, x1, S4_BASKET - 0.4, S4_BASKET, z0, z1, STEEL, ledge ? {} : { noLedge: true });
}

/** One hot-aisle pod (x0..x0 + 3.6, z 24..32): two rack rows, containment panels on the outer faces, the roof slab, the end doors. */
function pod(b: LevelBuilder, x0: number): void {
  const [z0, z1] = S4_BOX.podZ;
  bx(b, x0, x0 + 1.2, 0, 2.2, z0, z1, RACK, { noLedge: true });
  bx(b, x0 + 2.4, x0 + 3.6, 0, 2.2, z0, z1, RACK, { noLedge: true });
  bx(b, x0, x0 + 0.1, 2.2, 2.9, z0, z1, PLANT, { noLedge: true });
  bx(b, x0 + 3.5, x0 + 3.6, 2.2, 2.9, z0, z1, PLANT, { noLedge: true });
  bx(b, x0, x0 + 3.6, 2.9, 3.0, z0, z1, SLAB, { overhead: true, noLedge: true });
  doorAt(b, true, z0, x0 + 1.8, 0, 1);
  doorAt(b, true, z1, x0 + 1.8, 0, -1);
}

/** Everything of section 4: the shell, rooms, hall, pods, baskets, cage, NOC, riser, compound, deck, lamps and laser housings. */
export function buildCampusS4(b: LevelBuilder): void {
  const R = S4_ROOF;
  const D = S4_DECK;

  // ---- the shell (0..7.3): south (the C3 far door, the dock's roller door is dressing), north, west (the C4 near door), east (dock and hall doors to the compound)
  wall(b, true, 16, -10.15, 34.15, 0, D, [doorHole(24, 0)]);
  wall(b, true, 48, -10.15, 34.15, 0, D, []);
  wall(b, false, -10, 15.85, 48.15, 0, D, [doorHole(29, 0)]);
  wall(b, false, 34, 15.85, 48.15, 0, D, [doorHole(19, 0), doorHole(30, 0), doorHole(46.5, 0)]);
  doorAt(b, true, 16, 24, 0, 1);
  doorAt(b, false, -10, 29, 0, 1);
  doorAt(b, false, 34, 19, 0, -1);
  doorAt(b, false, 34, 30, 0, -1);
  doorAt(b, false, 34, 46.5, 0, 1); // (G4.5 D:37, BT:102) kp-riser, the cable-pull door (opens into the compound)
  // (G4.4 C17 / C19) the roof slab (7.0-7.3) as one rect minus the riser's roof hatch, the NOC roof hatch and the NOC rooflight
  const [hx0, hz0, hx1, hz1] = S4_BOX.hatch;
  for (const r of cutRect([-10, 34, 16, 48], [[hx0, hx1, hz0, hz1], NOC_HATCH, ROOFLIGHT])) bx(b, r[0], r[1], R, D, r[2], r[3], ROOF, { overhead: true, noLedge: true });

  // ---- the dock (x 14..34, z 16..22): west wall with the goods door into the lobby, two crate stacks, the roller door's dressing
  // (G4.2 C9, D:24) the return-air grille 1.5 x 1.5 at y 4.4..5.9 into the plenum (z 19.5..21.0)
  wall(b, false, 14, 16, 22, 0, R, [doorHole(17.5, 0), [19.5, 21.0, 4.4, 5.9]], P);
  bx(b, 17.4, 18.6, 0, 1.0, 20.4, 21.2, CRATE);
  bx(b, 19.9, 21.1, 0, 1.0, 20.4, 21.2, CRATE);
  b.box(30, 1.4, 16.2, 4, 2.8, 0.1, WALL_DARK, 0, 0, false);
  doorAt(b, false, 14, 17.5, 0, 1); // (G4.1, C6) dockWest 1.5 m off the corner

  // ---- the hall's south wall (z 22, x -4..34): the mantrap's inner door (G4.1 C2: 1 m west, x 9.5)
  // (G4.2 C9, D:24) the hall grilles 1.2 x 1.5 at y 4.4..5.9 where baskets B1 / B2 end (noLedge: a walk-through from the baskets)
  wall(b, true, 22, -4, 34.15, 0, R, [doorHole(9.5, 0), [3.0, 4.2, 4.4, 5.9], [8.6, 9.8, 4.4, 5.9]]);
  doorAt(b, true, 22, 9.5, 0, 1, { breachable: false, armoured: true }); // (E10) arm-mantrap: bulletproof, no round through it
  // (G4.1 C1, D:16) one goods-in lobby x -4..14, z 16..22 (the z 18 partition and the scLobby door gone); one ceiling slab
  // (3.0-3.2, overhead) with the return-air plenum over it; (G4.2 C9, D:24) cut round the 1.2 x 1.2 ceiling hatch at
  // (-2.0, 17.0), x -2.6..-1.4, z 16.4..17.6 (an open hole; its cover is dress, as S1 A3)
  slab(b, -4, 14, 16, 16.4, 3.2);
  slab(b, -4, 14, 17.6, 22, 3.2);
  slab(b, -4, -2.6, 16.4, 17.6, 3.2);
  slab(b, -1.4, 14, 16.4, 17.6, 3.2);
  // (G4.1 C2, D:17) the mantrap x 8..11, z 19..22: walls 3.0, a lid, the outer door west (into the lobby), the inner door
  // north (breachable false: armoured); the east 3 x 3 (x 11..14, z 19..22) is an open trolley alcove
  wall(b, true, 19, 8, 11, 0, 3.0, [], P);
  wall(b, false, 11, 19, 22, 0, 3.0, [], P);
  wall(b, false, 8, 19, 22, 0, 3.0, [doorHole(20.5, 0)], P);
  doorAt(b, false, 8, 20.5, 0, -1, { breachable: false });
  bx(b, 8, 11, 3.0, 3.1, 19, 22, SLAB, { overhead: true, noLedge: true });
  // (G4.1 C3, D:18) the mantrap desk
  bx(b, 0.5, 2.1, 0, 0.75, 20.6, 21.4, DESK);
  // (G4.1 C4, D:19) three 1.2 m parcel cages: low cover along the goods lane (not noLedge)
  for (const [x0, x1] of [[2.0, 3.2], [7.0, 8.2], [11.5, 12.7]] as const) bx(b, x0, x1, 0, 1.2, 18.0, 18.8, CRATE);

  // ---- the west side: the hall's west wall (x -4, doors to the service corridor, the battery room, the colonnade, the UPS room)
  // (G4.2 C9, D:24) the return-air grille 1.5 x 1.5 at y 4.4..5.9 (z 19.5..21.0) from the battery room into the plenum
  // (G4.3 C14, D:28) the colonnade door hallCC (-4, 29) is walled up
  wall(b, false, -4, 15.85, 48.15, 0, R, [doorHole(18.5, 0), [19.5, 21.0, 4.4, 5.9], doorHole(25, 0), doorHole(38, 0), doorHole(46.5, 0)]);
  doorAt(b, false, -4, 18.5, 0, 1); // (G4.1, C6) kpBatt 1.5 m off the corner
  doorAt(b, false, -4, 25, 0, -1);
  doorAt(b, false, -4, 38, 0, -1);
  doorAt(b, false, -4, 46.5, 0, 1); // (G4.3 C15, D:30) the staff door from the UPS room into the security room (opens into it)
  // (G4.3 C13 / C14, D:28-29) the battery room (x -10..-4, z 16..27.5), the colonnade corridor (27.5..31, 3.3 clear, a 3.0
  // slab over it), the UPS room (31..48); battCC (-8.5, 27.5) opens north into the colonnade (P2), ccUps (-5.5, 31) into it
  wall(b, true, 27.5, -10, -4, 0, R, [doorHole(-8.5, 0)], P);
  wall(b, true, 31, -10, -4, 0, R, [doorHole(-5.5, 0)], P);
  doorAt(b, true, 27.5, -8.5, 0, -1);
  doorAt(b, true, 31, -5.5, 0, 1);
  slab(b, -10, -4, 27.5, 31, 3.2);
  // (G4.2 C11, D:26) the battery racks 2.0 high, noLedge (CR8-west rules 2-3)
  for (const [x0, z0, x1, z1] of S4_BOX.batteryRacks) bx(b, x0, x1, 0, 2.0, z0, z1, RACK, { noLedge: true });
  // (G4.2 CR8, D:24; fix 1) the sills under the two side grilles (y 0..4.4, z 19.5..21.0) stay noLedge: a strip 0.2 / 0.3
  // deep only hangs (`canClimbUp` needs `LEDGE.climbDepth`), so each sill top gets manual ledges (hang and climb up) on
  // both faces: the boost side (CR8 dock x 14.1, CR8-west battery room x -4.15) and the plenum side (x 13.9, -3.85; the
  // plenum floor is the lobby slab at 3.2, 1.2 under the sill), so the climb in and the hang-drop back out both work
  b.ledge(14.1, 19.5, 14.1, 21.0, 4.4);
  b.ledge(13.9, 21.0, 13.9, 19.5, 4.4);
  b.ledge(-4.15, 21.0, -4.15, 19.5, 4.4);
  b.ledge(-3.85, 19.5, -3.85, 21.0, 4.4);
  const [ux0, uz0, ux1, uz1] = S4_BOX.upsCabinets;
  bx(b, ux0, ux1, 0, 2.0, uz0, uz1, RACK, { noLedge: true });

  // ---- the data hall: its north wall (z 42, doors to the security room and the north corridor, the basket penetration)
  wall(b, true, 42, -4, 34.15, 0, R, [doorHole(2, 0), doorHole(20, 0), [-3.5, 7.5, 4.6, 6.6], [31.55, 32.65, S4_BASKET, 6.4]]);
  doorAt(b, true, 42, 2, 0, -1);
  doorAt(b, true, 42, 20, 0, -1);
  // the NOC's window (E2): clear glass on the old L10 fence line (the wall head above); armoured (E10, arm-noc): the NOC
  // pair sees the hall through it, no round crosses it either way
  b.glass(-3.5, 42, 7.5, 42, 2.0, 4.6, 'clear', undefined, { armoured: true });

  // ---- the pods P1-P5
  for (const x0 of S4_PODS) pod(b, x0);

  // ---- the cable baskets (top 4.4, boxes 4.0-4.4; supports are visual only): B1 in three boxes (the CR4 box keeps its ledges), B2, B3, B-N, B-cage, the penetration stub
  const [b1x0, b1z0, b1x1, b1z1] = S4_BOX.b1;
  basket(b, b1x0, b1z0, b1x1, 32.4);
  basket(b, b1x0, 32.4, b1x1, 35.6, true);
  basket(b, b1x0, 35.6, b1x1, b1z1);
  for (const q of [S4_BOX.b2, S4_BOX.b3, S4_BOX.bN, S4_BOX.bCage, S4_BOX.stub]) basket(b, q[0], q[1], q[2], q[3]);
  // (LR16-W) B-cage's support hangs from the basket's west rail at z 38.5: clear of the cage downlight (18, 2.8, 37) and
  // its beam (it stood through the lamp at (18, 37)), and of the rear gate's swing (hinge (17.4, 40), 1.2 m leaf)
  for (const [x, z] of [[3.6, 26], [3.6, 38], [9.2, 26], [9.2, 38], [26.8, 26], [26.8, 38], [17.55, 38.5], [8, 41.3], [14, 41.3], [24, 41.3], [30, 41.3]] as const) b.box(x, S4_BASKET / 2 - 0.2, z, 0.1, S4_BASKET - 0.4, 0.1, STEEL, 0, 0, false);

  // ---- the cage (x 14..22, z 34..40): solid 3.0 walls 0.1 thick, open top (A83); the front gate south, the rear gate north (pg-cage)
  const [kx0, kz0, kx1, kz1] = S4_BOX.cage;
  wall(b, true, kz0, kx0 - 0.05, kx1 + 0.05, 0, 3.0, [doorHole(18, 0)], 0.1, CAGE);
  wall(b, true, kz1, kx0 - 0.05, kx1 + 0.05, 0, 3.0, [doorHole(18, 0)], 0.1, CAGE);
  wall(b, false, kx0, kz0, kz1, 0, 3.0, [], 0.1, CAGE);
  wall(b, false, kx1, kz0, kz1, 0, 3.0, [], 0.1, CAGE);
  doorAt(b, true, kz0, 18, 0, 1);
  doorAt(b, true, kz1, 18, 0, -1);
  bx(b, 17.4, 18.6, 0, 0.75, 38.2, 38.8, DESK);
  // the build-out area's spare racks and the NE plant area's CRAC units
  const [sx0, sz0, sx1, sz1] = S4_BOX.spareRack;
  bx(b, sx0, sx1, 0, 2.2, sz0, sz1, RACK, { noLedge: true });
  const [cx0, cz0, cx1, cz1] = S4_BOX.crac;
  bx(b, cx0, cx1, 0, 2.0, cz0, cz1, PLANT, { noLedge: true });

  // ---- the security room (x -4..8, z 42..48; the NOC's slab over it) and the NOC (3.6..7.0)
  // (G4.4 C16, D:31) the dog-leg fire stair: one slab rect minus the well, the mid landing, the spine, the three rails
  // sync-s4-noc: Dunmore (#14) issues the release (J26; re-askable, no hard countdown). The console prop and the seat placard (BT:107)
  // sit on the window ledge in front of the west seat (P12), not inside #14's slot (1.0, 3.6, 43.0)
  b.box(1.0, 4.45, 42.35, 0.6, 0.08, 0.3, '#2a2f35', 0, 0, false);
  b.box(1.0, 4.55, 42.3, 0.25, 0.08, 0.02, '#d8d8d8', 0, 0, false); // Dunmore's seat placard (BT:107)
  slabCut(b, [-4, 8, 42, 48], S4_NOC, [STAIR_WELL]);
  bx(b, 0, 1.4, 1.6, 1.8, 45.1, 47.85, STEEL, { noLedge: true });
  bx(b, 1.4, 4.2, 0, 4.7, 46.4, 46.5, WALL_DARK, { noLedge: true });
  rail(b, -0.1, 0, 45.1, 47.85, S4_NOC);
  rail(b, 0, 4.2, 45.0, 45.1, S4_NOC);
  rail(b, 4.2, 4.3, 46.5, 47.85, S4_NOC);
  for (const f of S4_FLIGHTS) b.stairs(f.cx, f.cz, f.w, f.len, f.rise, f.steps, STEEL, f.yaw, f.y0);
  bx(b, -3.9, -3.3, 0, 0.75, 43.2, 45.6, DESK); // (G4.3 C15) the console stops at the UPS door's swing
  // (G4.4 C17, D:32) the NOC roof hatch x 6.0..7.2, z 46.6..47.8 (cut in the roof slab above): the ladder to the deck, rails on
  // three sides (the north side is the deck screen B:478, 0.05 m from the hatch rim). ASSUMPTION A1: the brief's ladder
  // `b.ladder(6.6, 47.6, S4_NOC, S4_DECK, 0)` faces north and steps off at z 48.05, inside that screen (z 47.85..48.15, 2.0
  // high), so no climber lands. The ladder is built on the east rim instead (S1's hatch-ladder rule turned east: base 0.25 m
  // inside the rim, facing it, the top 0.45 m past it) and the east rail leaves the 0.5 m ladder gap z 46.95..47.45 (as R1's
  // landing rail). Undo: the brief's literal ladder and the unbroken east rail, and a cut in the screen for the exit.
  b.ladder(6.95, 47.2, S4_NOC, D, PI / 2);
  rail(b, 5.9, 6.0, 46.6, 47.8, D);
  rail(b, 5.9, 7.3, 46.5, 46.6, D);
  rail(b, 7.2, 7.3, 46.6, 46.95, D);
  rail(b, 7.2, 7.3, 47.45, 47.8, D);
  // (G4.4 C19, D:34) the NOC rooflight x 0..4, z 43.5..45.5: fixed wired glass flush with the deck (clear: sight and light pass)
  b.box(2, 7.275, 44.5, 4, 0.05, 2, GLASS_COLOR, 0, 0, true, false);
  const rl = b.boxes[b.boxes.length - 1]!;
  rl.glass = 'clear';
  rl.noLedge = true;
  rl.overhead = true;
  // the security room / north corridor partition (x 8: the side door, and (G4.4 C18, D:33) the NOC escape door at 3.6 onto a
  // platform and a caged ladder down to the corridor) and the corridor / riser partition (x 30.5, kp-deck; G4.5 C22)
  wall(b, false, 8, 42, 48, 0, R, [doorHole(43.5, 0), doorHole(45.5, S4_NOC)], P);
  wall(b, false, 30.5, 42, 48, 0, R, [doorHole(45, 0)], P);
  doorAt(b, false, 8, 43.5, 0, 1);
  doorAt(b, false, 8, 45.5, S4_NOC, -1); // opens into the NOC (P4)
  doorAt(b, false, 30.5, 45, 0, 1);
  b.box(30.62, 1.3, 45.85, 0.02, 0.15, 0.1, '#3a3d40', 0, 0, false); // kp-deck riser side (Code Relay BT:100)
  bx(b, 8.1, 9.3, 3.4, 3.6, 44.9, 46.1, STEEL, { noLedge: true });
  rail(b, 8.1, 9.3, 46.0, 46.1, S4_NOC);
  rail(b, 8.1, 9.3, 44.9, 45.0, S4_NOC);
  rail(b, 9.2, 9.3, 44.9, 45.2, S4_NOC);
  rail(b, 9.2, 9.3, 45.8, 46.1, S4_NOC);
  b.ladder(9.55, 45.5, 0, S4_NOC, -PI / 2); // (P5) 0.25 m off the platform edge; the ladder gap z 45.2..45.8

  // ---- the riser: the basket landing (4.0-4.4) with a rail on its north edge but the ladder gap, R1 up from the floor, R2 up to the deck hatch
  const [lx0, lz0, lx1, lz1] = S4_BOX.landing;
  bx(b, lx0, lx1, S4_BASKET - 0.4, S4_BASKET, lz0, lz1, STEEL, { noLedge: true });
  rail(b, lx0, 31.7, lz1 - 0.1, lz1, S4_BASKET);
  rail(b, 32.7, lx1, lz1 - 0.1, lz1, S4_BASKET);
  b.ladder(32.2, 45.05, 0, S4_BASKET, PI);
  b.ladder(32.2, 43.35, S4_BASKET, D, 0);
  rail(b, hx0 - 0.1, hx0, hz0, hz1, D);
  rail(b, hx0 - 0.1, hx1 + 0.1, hz0 - 0.1, hz0, D);
  rail(b, hx1, hx1 + 0.1, hz0, hz1, D);

  // ---- the generator compound (x 34..40, z 16..48): walls 2.8, never fences (A84); the yard gate locked and unbreachable
  wall(b, true, 16, 34.15, 40.15, 0, 2.8, [[36.5, 38.5, 0, DOOR_H]]);
  wall(b, true, 48, 34.15, 40.15, 0, 2.8, []);
  wall(b, false, 40, 15.85, 48.15, 0, 2.8, []);
  b.door(36.5, 0, 16, 2.0, PI / 2, { swing: 1, locked: true, breachable: false });
  const [gx0, gz0, gx1, gz1] = S4_BOX.generator;
  bx(b, gx0, gx1, 0, 2.6, gz0, gz1, PLANT, { noLedge: true });
  const [tx0, tz0, tx1, tz1] = S4_BOX.tanks;
  // (polish 1, L6) 2.0 noLedge: no tank-top step to the 2.8 east wall 0.85 m away
  bx(b, tx0, tx1, 0, 2.0, tz0, tz1, CAGE, { noLedge: true });
  // (G4.5 C23, D:38, P6) the plant ladder behind a locked anti-climb cage: the ladder starts on the cage top (4.4); the cage is
  // not noLedge (its east top edge is CR10); the north and south edges lose their ledges, so only the east lip stays
  bx(b, 34.15, 35.05, 0, 4.4, 22.4, 23.6, STEEL);
  b.ladder(34.6, 23, 4.4, D, -PI / 2);
  // ASSUMPTION A2: radius 0.4, not the brief's 0.5: `suppressLedgesNear` takes every ledge whose nearest point is within r, and the
  // east lip's ends are 0.45 m from these two points (x 35.05 vs 34.6), so r 0.5 removed the east lip too and CR10 could not hang.
  // Undo: 0.5 (and no CR10).
  b.noLedge(34.6, 22.4, 0.4);
  b.noLedge(34.6, 23.6, 0.4);

  // ---- the plant deck (top 7.3): chillers; 2.0 acoustic screens on the north, south and west edges, a 1.1 parapet on the east edge (the ladder gap z 22.4..23.6)
  for (const [x0, z0, x1, z1] of S4_BOX.chillers) bx(b, x0, x1, D, D + 2.0, z0, z1, PLANT, { noLedge: true });
  bx(b, -10.15, 34.15, D, D + 2.0, 47.85, 48.15, WALL_DARK, { noLedge: true });
  bx(b, -10.15, 34.15, D, D + 2.0, 15.85, 16.15, WALL_DARK, { noLedge: true });
  bx(b, -10.15, -9.85, D, D + 2.0, 16.15, 47.85, WALL_DARK, { noLedge: true });
  bx(b, 33.85, 34.15, D, D + 1.1, 16.15, 22.4, STEEL, { noLedge: true });
  bx(b, 33.85, 34.15, D, D + 1.1, 23.6, 47.85, STEEL, { noLedge: true });
  // (G4.5 C25, D:40) the four floodlight poles (the floods are in `S4_LIGHTS.deckFloods`, 5.0 over the deck)
  for (const [x, z] of S4_DECK_POLES) bx(b, x - 0.075, x + 0.075, D, D + 5.0, z - 0.075, z + 0.075, STEEL, { noLedge: true });

  // ---- the laser fixtures (every band a visible emitter box at each end, R5)
  for (const l of S4_LASERS) {
    const top = Math.max(...l.ys) + 0.15;
    for (const [x, z] of [[l.x1, l.z1], [l.x2, l.z2]] as const) b.box(x, l.floorY! + top / 2, z, 0.12, top, 0.12, '#3a3d40', 0, 0, false);
  }

  // ---- lamps: every one from `S4_LIGHTS` (job BRIEF A19). Dark by reason (no fitting): the plenum, the baskets and the
  // space above the pods; the hot aisles are behind the pod roofs.
  for (const list of Object.values(S4_LIGHTS)) for (const l of list) lamp(b, l);

  // ---- ambient: the section at the standby fill 0.14 (true dark with a circuit cut); C3 and C4 keep their 0.30
  b.ambientZone(-10, 40, 16, 48, 0.14, -1, 9.5);
}
