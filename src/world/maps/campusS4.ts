import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import type { MapLayout } from '../mapDef';
import type { LaserDef } from '../../game/jammer';
import type { LaserPanelDef } from '../../game/laserPanels';
import type { BoardDef } from '../../game/isolators';
import { makeCone } from '../lights';
import type { CoopLip } from './campusS1';

/**
 * Saltmarsh Park (`campusOps`) section 4 - the data hall (`docs/sector-redesign/briefs/SLICE4.md`, slice 4). A greybox:
 * boxes, lamps, switches, the compound board, the lasers and their panel, hide spots and nav seeds; no dressing, no
 * pickups. Frame: x west to east, z south to north, y up, metres; yaw 0 = +z, PI / 2 = +x. Footprint x -10..34, z 16..48
 * (ground, the NOC mezzanine 3.6, the plant deck 7.3); the generator compound x 34..40 is inside the section (walled, never
 * fenced: A84). Every piece is an axis-aligned box (yaw 0).
 *
 * Plan: the dock (S, the C3 side) x 14..34, z 16..22; the service corridor and the hall lobby (with the mantrap) x -4..14
 * along the south; the battery room, the colonnade corridor (C4's near door) and the UPS room down the west side; the data
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

/** The roof slab's underside and top (the hall's clear height; the top is the plant deck). */
export const S4_ROOF = 7.0;
export const S4_DECK = 7.3;
/** The NOC mezzanine's floor top (slab 3.4-3.6). */
export const S4_NOC = 3.6;
/** The cable baskets' top (boxes 4.0-4.4). */
export const S4_BASKET = 4.4;
const DOOR_H = 2.1;

/** The lamp circuits of section 4 (S1 40-49, S2 50-58, S3 60-67, S5 takes 80-89). */
export const S4_GROUPS = { cold1: 70, cold2: 71, cold3: 72, lobby: 73, dock: 74, yard: 75, noc: 76, sec: 77, ups: 78, deck: 79 } as const;

/** The doors the sector data and the tests find by centre [x, z] (`Doors.nearest`, plan only). */
export const S4_DOORS = {
  /** C3's far door (the dock's south wall; the S1 test asserts it). */
  c3Far: [24, 16] as [number, number],
  /** C4's near door (the colonnade corridor's west wall; the S1 test asserts it). */
  c4Near: [-10, 29] as [number, number],
  kpBatt: [-4, 17] as [number, number],
  kpDeck: [30.6, 45] as [number, number],
  pgCage: [18, 40] as [number, number],
  cageFront: [18, 34] as [number, number],
  dockWest: [14, 17] as [number, number],
  dockEast: [34, 19] as [number, number],
  hallBatt: [-4, 25] as [number, number],
  hallCC: [-4, 29] as [number, number],
  hallUps: [-4, 38] as [number, number],
  hallEast: [34, 30] as [number, number],
  mantrapOuter: [9, 20.5] as [number, number],
  mantrapInner: [10.5, 22] as [number, number],
  scLobby: [4, 18] as [number, number],
  battCC: [-7, 27.8] as [number, number],
  ccUps: [-7, 30.2] as [number, number],
  secDoor: [2, 42] as [number, number],
  ncDoor: [20, 42] as [number, number],
  secNc: [8, 45] as [number, number],
  yardGate: [37.5, 16] as [number, number],
} as const;

/** The NOC's straight flight (`LevelBuilder.stairs` arguments; yaw PI / 2 rises toward +x: x -1.2 at 0 to x 5.2 at 3.6). */
export const S4_FLIGHT = { cx: 2.0, cz: 47.2, w: 1.2, len: 6.4, rise: 3.6, yaw: PI / 2, y0: 0, steps: 20 } as const;

/** The pods' west x (each x0..x0 + 3.6, z 24..32): P1-P5. The hot-aisle centres are x0 + 1.8. */
export const S4_PODS: readonly number[] = [-1.0, 4.6, 10.2, 22.2, 27.8];

/** The plan boxes the tests read: [x0, z0, x1, z1]. */
export const S4_BOX = {
  foot: [-10, 16, 34, 48] as const,
  yard: [34, 16, 40, 48] as const,
  hall: [-4, 22, 34, 42] as const,
  dock: [14, 16, 34, 22] as const,
  battery: [-10, 16, -4, 27.8] as const,
  ups: [-10, 30.2, -4, 48] as const,
  sec: [-4, 42, 8, 48] as const,
  nc: [8, 42, 30.6, 48] as const,
  riser: [30.6, 42, 34, 48] as const,
  cage: [14, 34, 22, 40] as const,
  podZ: [24, 32] as const,
  racksTop: 2.2,
  podTop: 3.0,
  /** The cable baskets (tops 4.4): [x0, z0, x1, z1]. */
  b1: [3.1, 24, 4.1, 40.8] as const,
  b2: [8.7, 24, 9.7, 40.8] as const,
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
  batteryRacks: [[-9.4, 18.0, -8.4, 26.5], [-5.6, 18.0, -4.6, 23.5]] as const,
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
export const S4_BOARDS: BoardDef[] = [{ pos: new Vector3(33.85, 0, 20.8), yaw: -PI / 2, groups: [S4_GROUPS.yard], window: 20 }];

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
];

/** Where a carried body can be hidden: the battery room's SW corner, the UPS room's north end, the north corridor's east end, the compound's NE corner, the hall's NW corner. */
export const S4_HIDESPOTS: NonNullable<MapLayout['hideSpots']> = [
  { pos: new Vector3(-9.2, 0, 17.2) },
  { pos: new Vector3(-7.2, 0, 47.2) },
  { pos: new Vector3(29.6, 0, 47.2) },
  { pos: new Vector3(39.2, 0, 47.2) },
  { pos: new Vector3(-3.2, 0, 41.2) },
];

/**
 * Light switches: the hall panel in the service corridor (three rows, lure #4 or #20), the lobby by the corridor door, the
 * dock by the dock's west door, the NOC by the flight's head, the security room by its door, the UPS room by its hall door
 * (the K3 "colonnade lights" lure). The yard floods are on the dock's board (`S4_BOARDS`); the deck task lights have none.
 */
export const S4_SWITCHES: NonNullable<MapLayout['switches']> = [
  { pos: new Vector3(-1.4, 0, 17.85), yaw: PI, group: S4_GROUPS.cold1 },
  { pos: new Vector3(-1.0, 0, 17.85), yaw: PI, group: S4_GROUPS.cold2 },
  { pos: new Vector3(-0.6, 0, 17.85), yaw: PI, group: S4_GROUPS.cold3 },
  { pos: new Vector3(4.8, 0, 18.15), yaw: 0, group: S4_GROUPS.lobby },
  { pos: new Vector3(14.15, 0, 18.8), yaw: PI / 2, group: S4_GROUPS.dock },
  { pos: new Vector3(6.0, S4_NOC, 47.85), yaw: PI, group: S4_GROUPS.noc },
  { pos: new Vector3(2.8, 0, 42.15), yaw: 0, group: S4_GROUPS.sec },
  { pos: new Vector3(-4.15, 0, 37.0), yaw: -PI / 2, group: S4_GROUPS.ups },
];

/** Section 4's rooms (HUD tags; no squads). Stacked rooms carry their storey (`minY` / `maxY`); none overlap (the lobby and hall are cut round the mantrap and the cage). */
export const S4_ROOMS: RoomDef[] = [
  { id: 's4-dock', name: 'Loading Dock', minX: 14, maxX: 34, minZ: 16, maxZ: 22, maxY: 7.2 },
  { id: 's4-sc', name: 'Service Corridor', minX: -4, maxX: 14, minZ: 16, maxZ: 18, maxY: 7.2 },
  { id: 's4-lobby', name: 'Hall Lobby', minX: -4, maxX: 9, minZ: 18, maxZ: 22, maxY: 7.2 },
  { id: 's4-lobby-b', name: 'Hall Lobby', minX: 9, maxX: 12, minZ: 18, maxZ: 19, maxY: 7.2 },
  { id: 's4-lobby-c', name: 'Hall Lobby', minX: 12, maxX: 14, minZ: 18, maxZ: 22, maxY: 7.2 },
  { id: 's4-mantrap', name: 'Mantrap', minX: 9, maxX: 12, minZ: 19, maxZ: 22, maxY: 7.2 },
  { id: 's4-batt', name: 'Battery Room', minX: -10, maxX: -4, minZ: 16, maxZ: 27.8, maxY: 7.2 },
  { id: 's4-cc', name: 'Colonnade Corridor', minX: -10, maxX: -4, minZ: 27.8, maxZ: 30.2, maxY: 7.2 },
  { id: 's4-ups', name: 'UPS Room', minX: -10, maxX: -4, minZ: 30.2, maxZ: 48, maxY: 7.2 },
  { id: 's4-hall', name: 'Data Hall', minX: -4, maxX: 34, minZ: 22, maxZ: 34, maxY: 7.2 },
  { id: 's4-hall-w', name: 'Data Hall', minX: -4, maxX: 14, minZ: 34, maxZ: 40, maxY: 7.2 },
  { id: 's4-hall-e', name: 'Data Hall', minX: 22, maxX: 34, minZ: 34, maxZ: 40, maxY: 7.2 },
  { id: 's4-hall-n', name: 'Data Hall', minX: -4, maxX: 34, minZ: 40, maxZ: 42, maxY: 7.2 },
  { id: 's4-cage', name: 'Server Cage', minX: 14, maxX: 22, minZ: 34, maxZ: 40, maxY: 7.2 },
  { id: 's4-sec', name: 'Security Room', minX: -4, maxX: 8, minZ: 42, maxZ: 48, maxY: 3.5 },
  { id: 's4-noc', name: 'NOC', minX: -4, maxX: 8, minZ: 42, maxZ: 48, minY: 3.5, maxY: 7.2 },
  { id: 's4-nc', name: 'North Corridor', minX: 8, maxX: 30.6, minZ: 42, maxZ: 48, maxY: 7.2 },
  { id: 's4-riser', name: 'Cable Riser', minX: 30.6, maxX: 34, minZ: 42, maxZ: 48, maxY: 7.2 },
  { id: 's4-yard', name: 'Generator Compound', minX: 34, maxX: 40, minZ: 16, maxZ: 48 },
  { id: 's4-deck', name: 'Plant Deck', minX: -10, maxX: 34, minZ: 16, maxZ: 48, minY: 7.2 },
].map((r) => ({ ...r, squad: [] }));

/** A visible lamp fitting (the glowing box), a real registry light. */
function lamp(b: LevelBuilder, x: number, y: number, z: number, o: { r: number; i: number; group: number; cone?: ReturnType<typeof makeCone> | null; w?: number }): void {
  const w = o.w ?? 0.5;
  b.light({
    kind: o.cone ? 'spot' : 'lamp',
    x,
    y,
    z,
    radius: o.r,
    intensity: o.i,
    color: WHITE,
    cone: o.cone ?? null,
    group: o.group,
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
  wall(b, false, 34, 15.85, 48.15, 0, D, [doorHole(19, 0), doorHole(30, 0)]);
  doorAt(b, true, 16, 24, 0, 1);
  doorAt(b, false, -10, 29, 0, 1);
  doorAt(b, false, 34, 19, 0, -1);
  doorAt(b, false, 34, 30, 0, -1);
  // the roof slab (7.0-7.3) with the riser's roof hatch cut out
  const [hx0, hz0, hx1, hz1] = S4_BOX.hatch;
  bx(b, -10, 34, R, D, 16, hz0, ROOF, { overhead: true, noLedge: true });
  bx(b, -10, hx0, R, D, hz0, hz1, ROOF, { overhead: true, noLedge: true });
  bx(b, hx1, 34, R, D, hz0, hz1, ROOF, { overhead: true, noLedge: true });
  bx(b, -10, 34, R, D, hz1, 48, ROOF, { overhead: true, noLedge: true });

  // ---- the dock (x 14..34, z 16..22): west wall with the service corridor door, two crate stacks, the roller door's dressing
  wall(b, false, 14, 16, 22, 0, R, [doorHole(17, 0)], P);
  bx(b, 17.4, 18.6, 0, 1.0, 20.4, 21.2, CRATE);
  bx(b, 19.9, 21.1, 0, 1.0, 20.4, 21.2, CRATE);
  b.box(30, 1.4, 16.2, 4, 2.8, 0.1, WALL_DARK, 0, 0, false);
  doorAt(b, false, 14, 17, 0, 1);

  // ---- the hall's south wall (z 22, x -4..34): the mantrap's inner door; the service corridor / lobby partition z 18
  wall(b, true, 22, -4, 34.15, 0, R, [doorHole(10.5, 0)]);
  doorAt(b, true, 22, 10.5, 0, 1, { breachable: false, armoured: true }); // (E10) arm-mantrap: bulletproof, no round through it
  wall(b, true, 18, -4, 14, 0, R, [doorHole(4, 0)], P);
  doorAt(b, true, 18, 4, 0, 1);
  // the service corridor and lobby ceilings (3.0-3.2, overhead): 3.8 m of dead air over each
  slab(b, -4, 14, 16, 18, 3.2);
  slab(b, -4, 14, 18, 22, 3.2);
  // the mantrap (x 9..12, z 19..22): walls 3.0, a lid, the outer door west, the inner door north (breachable false: armoured)
  wall(b, true, 19, 9, 12, 0, 3.0, [], P);
  wall(b, false, 12, 19, 22, 0, 3.0, [], P);
  wall(b, false, 9, 19, 22, 0, 3.0, [doorHole(20.5, 0)], P);
  doorAt(b, false, 9, 20.5, 0, -1, { breachable: false });
  bx(b, 9, 12, 3.0, 3.1, 19, 22, SLAB, { overhead: true, noLedge: true });
  bx(b, 5.2, 6.8, 0, 0.75, 20.6, 21.4, DESK);

  // ---- the west side: the hall's west wall (x -4, doors to the service corridor, the battery room, the colonnade, the UPS room)
  wall(b, false, -4, 15.85, 48.15, 0, R, [doorHole(17, 0), doorHole(25, 0), doorHole(29, 0), doorHole(38, 0)]);
  doorAt(b, false, -4, 17, 0, 1);
  doorAt(b, false, -4, 25, 0, -1);
  doorAt(b, false, -4, 29, 0, -1);
  doorAt(b, false, -4, 38, 0, -1);
  // the battery room (x -10..-4, z 16..27.8), the colonnade corridor (27.8..30.2), the UPS room (30.2..48)
  wall(b, true, 27.8, -10, -4, 0, R, [doorHole(-7, 0)], P);
  wall(b, true, 30.2, -10, -4, 0, R, [doorHole(-7, 0)], P);
  doorAt(b, true, 27.8, -7, 0, 1);
  doorAt(b, true, 30.2, -7, 0, 1);
  for (const [x0, z0, x1, z1] of S4_BOX.batteryRacks) bx(b, x0, x1, 0, 1.2, z0, z1, RACK);
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

  // ---- the security room (x -4..8, z 42..48; the NOC's slab over it) and the NOC (3.6..7.0): the one stair, a hole for it, rails
  const f = S4_FLIGHT;
  slab(b, -4, 8, 42, 46.6, S4_NOC);
  slab(b, -4, 8, 47.8, 48, S4_NOC);
  slab(b, -4, f.cx - f.len / 2, 46.6, 47.8, S4_NOC);
  slab(b, f.cx + f.len / 2, 8, 46.6, 47.8, S4_NOC);
  rail(b, f.cx - f.len / 2 - 0.1, f.cx + f.len / 2, 46.5, 46.6, S4_NOC);
  rail(b, f.cx - f.len / 2 - 0.1, f.cx - f.len / 2, 46.6, 47.8, S4_NOC);
  b.stairs(f.cx, f.cz, f.w, f.len, f.rise, f.steps, STEEL, f.yaw, f.y0);
  bx(b, -3.9, -3.3, 0, 0.75, 43.2, 46.0, DESK);
  // the security room / north corridor partition (x 8, the side door) and the corridor / riser partition (x 30.6, kp-deck)
  wall(b, false, 8, 42, 48, 0, R, [doorHole(45, 0)], P);
  wall(b, false, 30.6, 42, 48, 0, R, [doorHole(45, 0)], P);
  doorAt(b, false, 8, 45, 0, 1);
  doorAt(b, false, 30.6, 45, 0, 1);

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
  // the plant ladder on the building's east wall up to the deck
  b.ladder(34.6, 23, 0, D, -PI / 2);

  // ---- the plant deck (top 7.3): chillers; 2.0 acoustic screens on the north, south and west edges, a 1.1 parapet on the east edge (the ladder gap z 22.4..23.6)
  for (const [x0, z0, x1, z1] of S4_BOX.chillers) bx(b, x0, x1, D, D + 2.0, z0, z1, PLANT, { noLedge: true });
  bx(b, -10.15, 34.15, D, D + 2.0, 47.85, 48.15, WALL_DARK, { noLedge: true });
  bx(b, -10.15, 34.15, D, D + 2.0, 15.85, 16.15, WALL_DARK, { noLedge: true });
  bx(b, -10.15, -9.85, D, D + 2.0, 16.15, 47.85, WALL_DARK, { noLedge: true });
  bx(b, 33.85, 34.15, D, D + 1.1, 16.15, 22.4, STEEL, { noLedge: true });
  bx(b, 33.85, 34.15, D, D + 1.1, 23.6, 47.85, STEEL, { noLedge: true });

  // ---- the laser fixtures (every band a visible emitter box at each end, R5)
  for (const l of S4_LASERS) {
    const top = Math.max(...l.ys) + 0.15;
    for (const [x, z] of [[l.x1, l.z1], [l.x2, l.z2]] as const) b.box(x, l.floorY! + top / 2, z, 0.12, top, 0.12, '#3a3d40', 0, 0, false);
  }

  // ---- lamps. Lit: the cold aisles (under the baskets), the cage, the lobby, the dock floods, the yard floods, the NOC, the
  // security room, the UPS / colonnade lamps, the deck task lights. Dark by reason: the battery room, the service corridor, the
  // north corridor, the riser, the hot aisles, the build-out area, the baskets (above the cones), the compound's north end.
  const down = makeCone(0, -1, 0, 1.15);
  for (const [x, z] of [[3.6, 25], [3.6, 29], [9.2, 25], [9.2, 29], [-2.5, 26], [-2.5, 34]] as const) lamp(b, x, 3.6, z, { r: 4.5, i: 0.8, group: S4_GROUPS.cold1, cone: down });
  for (const z of [25, 29.5, 33.0]) lamp(b, 18, 3.6, z, { r: 5, i: 0.8, group: S4_GROUPS.cold2, cone: down });
  lamp(b, 18, 2.8, 37, { r: 5, i: 0.8, group: S4_GROUPS.cold2, cone: down });
  for (const [x, z] of [[26.8, 25], [26.8, 29], [32.7, 26], [32.7, 34]] as const) lamp(b, x, 3.6, z, { r: 4.5, i: 0.8, group: S4_GROUPS.cold3, cone: down });
  lamp(b, 5, 2.8, 20, { r: 5, i: 0.8, group: S4_GROUPS.lobby, cone: down });
  for (const x of [20, 29]) lamp(b, x, 6.0, 19, { r: 8, i: 0.9, group: S4_GROUPS.dock, w: 0.6 });
  for (const z of [24, 40]) lamp(b, 35.35, 6.0, z, { r: 9, i: 0.9, group: S4_GROUPS.yard, w: 0.6 });
  for (const x of [0, 5]) lamp(b, x, 6.4, 45, { r: 6, i: 0.8, group: S4_GROUPS.noc, w: 0.5 });
  for (const x of [0, 5]) lamp(b, x, 3.1, 44.5, { r: 5, i: 0.8, group: S4_GROUPS.sec, w: 0.5 });
  for (const z of [34, 41]) lamp(b, -7, 3.4, z, { r: 5, i: 0.7, group: S4_GROUPS.ups, cone: down });
  lamp(b, -7, 2.8, 29, { r: 5, i: 0.7, group: S4_GROUPS.ups, cone: down });
  for (const x of [6, 14, 22, 28]) lamp(b, x, 8.8, 34.2, { r: 3.5, i: 0.7, group: S4_GROUPS.deck, w: 0.5 });

  // ---- ambient: the section at the standby fill 0.14 (true dark with a circuit cut); C3 and C4 keep their 0.30
  b.ambientZone(-10, 40, 16, 48, 0.14, -1, 9.5);
}
