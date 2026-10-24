import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import type { MapLayout } from '../mapDef';
import type { LaserDef } from '../../game/jammer';
import type { LaserPanelDef } from '../../game/laserPanels';
import { makeCone } from '../lights';
import type { CoopLip } from './campusS1';

/**
 * Saltmarsh Park (`campusOps`) section 3 - the lab block (`docs/sector-redesign/SPEC.md` "S3", slice 3). A greybox: boxes,
 * lamps, switches, lasers and their panels, hide spots and nav seeds; no dressing. Frame: x west to east, z south to
 * north, y up, metres; yaw 0 = +z, PI / 2 = +x. Footprint x 10..64, z -30..0; G 0, L1 4.5, roof 9.2 (the test hall 9.0
 * clear). Every piece is an axis-aligned box (yaw 0): no quarter-turn walls.
 *
 * Plan: the west band (x 10..22) is the west lobby (G, the C2 arrival in this branch) under the C2 landing (L1, the SW
 * stair's head, glass onto the hall); the test hall x 22..52, z -30..-8 (9.0 clear) holds the environmental chamber, the
 * EMC room, the burn-in racks, the crane walkway (6.0) and the escape gallery (4.5, with a service spur to the chamber
 * roof); the north band (z -8..0) is the goods-in dock and the north stair (G) under the viewing corridor, the write-up
 * office, the gowning room, the clean room, the back corridor, the prototype store and the security room (L1); the east
 * annex (x 52..64, z -30..-8) is closed plant; the east yard (x 64..70) is outside.
 */

const PI = Math.PI;
const T = 0.3;
const WALL = '#b5b0a6';
const WALL_DARK = '#7b766c';
const PANEL_WHITE = '#d9dcd6';
const STEEL = '#55606a';
const SLAB = '#80868a';
const ROOF = '#4a4f55';
const DESK = '#8a6a4c';
const RACK = '#2f3a44';
const BENCH = '#6f7880';
const BOTTLE = '#5d7d5a';
const WHITE: [number, number, number] = [1, 0.97, 0.92];

/** Storey heights: the L1 floor's top, the roof slab's underside (the hall's clear height) and top. */
export const S3_L1 = 4.5;
export const S3_ROOF = 9.0;
const ROOF_TOP = 9.2;
/** The L1 slab's underside (a 0.2 slab). */
const L1_UNDER = 4.3;
/** Door height. */
const DOOR_H = 2.1;
/** The solid spandrel under the L1 glass (corridor and landing): 1.3 over the L1 floor. */
export const S3_SPANDREL_TOP = 5.8;
/** The viewing corridor's spandrel (the hall's north wall on L1, x 22..52): 1.7 over the L1 floor, so the crane walkway
 *  cannot see the corridor guards over it (A64 render budget; BRIEF A70). Undo: use `S3_SPANDREL_TOP` there again. */
export const S3_VIEW_SPANDREL_TOP = 6.2;

/** The lamp circuits of section 3 (the SPEC's ids: `s3-hb-1..3`, the viewing corridor, the burn-in task lights, the dock ...). */
export const S3_GROUPS = { hb1: 60, hb2: 61, hb3: 62, view: 63, burn: 64, dock: 65, office: 66, sec: 67 } as const;

/** The doors the sector data finds by centre (`Doors.nearest`): [x, z]. */
export const S3_DOORS = {
  /** The C2 stub's far door (ground, x 10): the arrival in this branch (L13 in the build sheet). */
  c2Far: [10, -14] as [number, number],
  /** C3 near door: the dock door in the north wall (the dock link to the data hall). */
  c3Near: [24, 0] as [number, number],
  /** The hall's west door (from the lobby); the high-bay switch bank is beside it on the lobby side. */
  hallWest: [22, -18] as [number, number],
  /** The store's back door (from the back corridor, kp-store; EW5 keypads are not built) and its hatch (the viewing corridor). */
  storeBack: [44.6, -4.2] as [number, number],
  storeHatch: [46.8, -6] as [number, number],
} as const;

/** The plan boxes the tests read: [x0, z0, x1, z1] (and the top where it matters). */
export const S3_BOX = {
  hall: [22, -30, 52, -8] as const,
  chamber: [30, -22, 36, -14] as const,
  chamberTop: 4.4,
  emc: [42, -24, 48, -16] as const,
  emcTop: 4.0,
  gasCage: [36, -4, 39.55, -0.15] as const,
  swStair: [12, -28, 14.6, -22.4] as const,
  nStair: [40, -8, 42.6, -0.15] as const,
  /** The escape gallery and its service spur (tops 4.5); the spur's south end is 0.5 m off the chamber's north face. */
  gallery: [28, -9.5, 44, -8.15] as const,
  spur: [31, -13.5, 35, -9.5] as const,
  walkway: [22.15, -29.85, 51.85, -28.6] as const,
  walkwayTop: 6.0,
  racks: [[50.6, -26, 51.6, -21], [50.6, -20, 51.6, -15], [50.6, -14, 51.6, -10.5]] as const,
  racksTop: 2.2,
  benches: [[24, -24.9, 27, -24.1], [24, -11.6, 27, -10.8], [46.5, -12.8, 48.5, -12.0]] as const,
  benchTop: 0.9,
  store: [44.6, -6, 52, -1.6] as const,
  screen: [26.5, -21.5, 26.8, -10.5] as const,
} as const;

/** A stair flight (`LevelBuilder.stairs` arguments): the tests' nav reads the ramps from here. */
export interface S3Flight {
  x: number;
  z: number;
  w: number;
  len: number;
  rise: number;
  yaw: number;
  y: number;
}

/**
 * The two dogleg fire stairs (2.6 x 5.6 cores, two flights of 2.25 each with a half landing): SW (x 12..14.6, z -28..-22.4;
 * up south on the west half, up north on the east half, the G door and the L1 door both on the north face) and north (x
 * 40..42.6, z -6..-0.15; up north on the west half, up south on the east half, the L1 doors south onto the viewing
 * corridor and east into the back corridor).
 */
export const S3_FLIGHTS: readonly S3Flight[] = [
  { x: 12.625, z: -25.2, w: 1.25, len: 3.2, rise: 2.25, yaw: PI, y: 0 },
  { x: 13.975, z: -25.2, w: 1.25, len: 3.2, rise: 2.25, yaw: 0, y: 2.25 },
  { x: 40.625, z: -3.15, w: 1.25, len: 3.1, rise: 2.25, yaw: 0, y: 0 },
  { x: 41.975, z: -3.15, w: 1.25, len: 3.1, rise: 2.25, yaw: PI, y: 2.25 },
];

/** Section 3's rooms (HUD tags; no squads). Stacked rooms carry their storey (`minY` / `maxY`); none overlap. */
export const S3_ROOMS: RoomDef[] = [
  { id: 's3-lobby', name: 'Lab West Lobby', minX: 10, maxX: 22, minZ: -30, maxZ: 0, maxY: 4.4 },
  { id: 's3-c2', name: 'Bridge Landing', minX: 10, maxX: 22, minZ: -30, maxZ: 0, minY: 4.5 },
  { id: 's3-hall', name: 'Test Hall', minX: 22, maxX: 52, minZ: -30, maxZ: -8 },
  { id: 's3-dock', name: 'Goods-in Dock', minX: 22, maxX: 40, minZ: -8, maxZ: 0, maxY: 4.4 },
  { id: 's3-view', name: 'Viewing Corridor', minX: 22, maxX: 52, minZ: -8, maxZ: -6, minY: 4.5 },
  { id: 's3-writeup', name: 'Write-up Office', minX: 22, maxX: 30, minZ: -6, maxZ: 0, minY: 4.5 },
  { id: 's3-gown', name: 'Gowning Room', minX: 30, maxX: 33, minZ: -6, maxZ: 0, minY: 4.5 },
  { id: 's3-clean', name: 'Clean Room', minX: 33, maxX: 40, minZ: -6, maxZ: 0, minY: 4.5 },
  { id: 's3-back', name: 'Store Back Corridor', minX: 42.6, maxX: 44.6, minZ: -6, maxZ: 0, minY: 4.5 },
  { id: 's3-store', name: 'Prototype Store', minX: 44.6, maxX: 52, minZ: -6, maxZ: -1.6, minY: 4.5 },
  { id: 's3-strip', name: 'North Corridor', minX: 44.6, maxX: 64, minZ: -1.6, maxZ: 0, minY: 4.5 },
  { id: 's3-sec', name: 'Lab Security Room', minX: 52, maxX: 64, minZ: -8, maxZ: -1.6, minY: 4.5 },
  { id: 's3-yard', name: 'Lab East Yard', minX: 64, maxX: 70, minZ: -30, maxZ: 0 },
].map((r) => ({ ...r, squad: [] }));

/**
 * The co-op-only lip of section 3 (CR3): the environmental chamber's west face, 4.4 over the hall floor (a leg-up from
 * the floor west of it). Smooth insulated panels, no bench or rack at 1.2 or higher within 4 m, its own ladder not
 * built (behind the padlocked anti-climb guard, A30). The top is also reached alone from above: the escape gallery's
 * service spur ends 0.5 m off its north face, and the gallery is the north stair's (LS 11.4, rule 7). The campus list
 * `CAMPUS_COOP_LIPS` is built once in `campusLips.ts`.
 */
export const S3_COOP_LIPS: readonly CoopLip[] = [
  {
    id: 'CR3',
    section: 2,
    lip: { x: 30, z0: -22, z1: -14, y: 4.4, n: { x: -1, z: 0 } },
    top: { x0: 30, x1: 36, z0: -22, z1: -14, top: 4.4 },
    boost: { floor: 0, x: 29.2, z: -18 },
    solo: 'the stealth route round the EMC room to the north stair (the gallery from the north stair reaches the chamber roof from above)',
  },
];

/**
 * The laser bands (R5: an alarm stage, never damage; drawn in night vision): las-gown, three beams across the gowning
 * room's pass-through into the clean room; las-store, two beams across the prototype store's inner aisle.
 */
export const S3_LASERS: LaserDef[] = [
  { id: 'las-gown', x1: 33, z1: -3.6, x2: 33, z2: -2.4, ys: [0.35, 0.9, 1.45], floorY: S3_L1, label: 'Clean room beam curtain', section: 2 },
  { id: 'las-store', x1: 48.5, z1: -4.6, x2: 48.5, z2: -3.4, ys: [0.5, 1.1], floorY: S3_L1, label: 'Prototype store beams', section: 2 },
];

/**
 * The lasers' power panels (one each, R5 "visible from the near side, with a reason"):
 * - las-gown: on the gowning room's north wall, 1.4 up, facing south: seen from the viewing corridor through the gowning
 *   room door and from inside the gowning room (the near side); the clean-room vendor's interlock box.
 * - las-store: the reset / power box on the store's shelving partition by the doors, west face, 1.4 up: seen from the
 *   whole near (door) half of the store; fitted with the beams after a sample went missing.
 */
export const S3_PANELS: LaserPanelDef[] = [
  { id: 'panel-gown', lasers: ['las-gown'], x: 31.2, y: S3_L1 + 1.4, z: -0.15, yaw: PI, section: 2, label: 'Clean room beam curtain power' },
  { id: 'panel-store', lasers: ['las-store'], x: 48.35, y: S3_L1 + 1.4, z: -5.2, yaw: -PI / 2, section: 2, label: 'Prototype store beams reset' },
];

/** The near-side points (feet) each panel is seen from (the unit test traces eye lines from them). */
export const S3_PANEL_NEAR: Record<string, readonly (readonly [number, number, number])[]> = {
  'panel-gown': [[31.2, S3_L1, -7.0], [31.4, S3_L1, -5.0], [31.0, S3_L1, -3.0]],
  'panel-store': [[45.4, S3_L1, -4.2], [46.8, S3_L1, -5.2], [47.6, S3_L1, -3.0]],
};

/** Nav seeds: the lobby, the C2 landing, the hall, the dock, the walkway, the gallery, the chamber roof, L1 north, the yard. */
export const S3_NAV_SEEDS: Vector3[] = [
  new Vector3(11, 0, -14),
  new Vector3(17, S3_L1, -14),
  new Vector3(26, 0, -20),
  new Vector3(30, 0, -4),
  new Vector3(30, 6.0, -29.25),
  new Vector3(36, S3_L1, -8.8),
  new Vector3(33, 4.4, -18),
  new Vector3(30, S3_L1, -7.25),
  new Vector3(43.7, S3_L1, -3),
  new Vector3(46, S3_L1, -4.2),
  new Vector3(58, S3_L1, -4),
  new Vector3(67, 0, -15),
];

export const S3_PICKUPS: NonNullable<MapLayout['pickups']> = [];

/** Where a carried body can be hidden: the lobby's dark corners, behind the gas cage, the walkway's west end, the north corridor's east end. */
export const S3_HIDESPOTS: NonNullable<MapLayout['hideSpots']> = [
  { pos: new Vector3(11, 0, -28.6) },
  { pos: new Vector3(11, 0, -1.2) },
  { pos: new Vector3(35.4, 0, -1.0) },
  { pos: new Vector3(23.5, 0, -25.5) },
  { pos: new Vector3(63, S3_L1, -0.75) },
];

/**
 * Light switches: the high-bay switch bank (three rows) on the lobby side of the hall's west door (lure #16, #8 by
 * report); the viewing corridor's two door switches (at the gallery door and the east end); the burn-in task lights by
 * the log desk; the dock by the dock-hall door; the write-up office and the security room inside their doors.
 */
export const S3_SWITCHES: NonNullable<MapLayout['switches']> = [
  { pos: new Vector3(21.85, 0, -16.9), yaw: -PI / 2, group: S3_GROUPS.hb1 },
  { pos: new Vector3(21.85, 0, -16.5), yaw: -PI / 2, group: S3_GROUPS.hb2 },
  { pos: new Vector3(21.85, 0, -16.1), yaw: -PI / 2, group: S3_GROUPS.hb3 },
  { pos: new Vector3(40.2, S3_L1, -7.85), yaw: 0, group: S3_GROUPS.view },
  { pos: new Vector3(51.85, S3_L1, -7.0), yaw: -PI / 2, group: S3_GROUPS.view },
  { pos: new Vector3(51.85, 0, -9.2), yaw: -PI / 2, group: S3_GROUPS.burn },
  { pos: new Vector3(27.3, 0, -7.85), yaw: 0, group: S3_GROUPS.dock },
  { pos: new Vector3(27.7, S3_L1, -5.85), yaw: 0, group: S3_GROUPS.office },
  { pos: new Vector3(56, S3_L1, -1.75), yaw: PI, group: S3_GROUPS.sec },
];

/** The high-bay fittings (8.5 m, shootable, jammable): three rows, none over the chamber or the EMC room (dark by reason). */
export const S3_HIGH_BAYS: readonly (readonly [number, number, number])[] = [
  // [x, z, group]: row 1 south (z -26), row 2 middle (z -18), row 3 north (z -11)
  [25, -26, S3_GROUPS.hb1], [32, -26, S3_GROUPS.hb1], [39, -26, S3_GROUPS.hb1], [47, -26, S3_GROUPS.hb1],
  [25, -18, S3_GROUPS.hb2], [39, -18, S3_GROUPS.hb2], [50, -18, S3_GROUPS.hb2],
  [25, -11, S3_GROUPS.hb3], [32, -11, S3_GROUPS.hb3], [39, -11, S3_GROUPS.hb3], [47, -11, S3_GROUPS.hb3],
];

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

/** A door opening on floor `y` (1.2 wide from `a`). */
const doorHole = (a: number, y: number): Hole => [a, a + 1.2, y, y + DOOR_H];

/**
 * A wall of thickness T centred on a line (along x at z when `alongX`, else along z at x), from a0 to a1 and y0 to y1, cut
 * by its openings: the wall is split into upright strips between the openings' edges, each strip solid where no opening
 * covers it. Every piece is noLedge (walls are no climbing routes).
 */
function wall(b: LevelBuilder, alongX: boolean, at: number, a0: number, a1: number, y0: number, y1: number, holes: readonly Hole[], color = WALL): void {
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
      if (alongX) bx(b, p, q, u, v, at - T / 2, at + T / 2, color, { noLedge: true });
      else bx(b, at - T / 2, at + T / 2, u, v, p, q, color, { noLedge: true });
    }
  }
}

/** A door anchor centred in a 1.2 opening at `a`..`a + 1.2` of a wall line (hinge at `a`). */
function doorAt(b: LevelBuilder, alongX: boolean, at: number, a: number, y: number, swing: 1 | -1, o: { locked?: boolean } = {}): void {
  if (alongX) b.door(a, y, at, 1.2, PI / 2, { swing, locked: o.locked, breachable: !o.locked });
  else b.door(at, y, a, 1.2, 0, { swing, locked: o.locked, breachable: !o.locked });
}

/** A floor slab (0.2 thick, top at `top`), overhead and noLedge. */
function slab(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, top: number, color = SLAB): void {
  bx(b, x0, x1, top - 0.2, top, z0, z1, color, { overhead: true, noLedge: true });
}

/** A steel guard rail (0.1 thick, 1.1 high) on a floor at `y`, noLedge. */
function rail(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, y: number): void {
  bx(b, x0, x1, y, y + 1.1, z0, z1, STEEL, { noLedge: true });
}

/** Everything of section 3: the shell, the lobby and landing, the hall, the north band, the stairs, lamps, lasers' housings. */
export function buildCampusS3(b: LevelBuilder): void {
  const L1 = S3_L1;
  const R = S3_ROOF;

  // ---- the shell: walls to the roof, C2's far door (west, on L1 at S2's bridge landing, L13) and the C3 dock door (north)
  wall(b, true, -30, 10, 64, 0, ROOF_TOP, []);
  wall(b, true, 0, 10, 64, 0, ROOF_TOP, [doorHole(23.4, 0)]);
  wall(b, false, 10, -30, 0, 0, ROOF_TOP, [doorHole(-14.6, L1)]);
  wall(b, false, 64, -30, 0, 0, ROOF_TOP, []);
  doorAt(b, true, 0, 23.4, 0, -1);
  doorAt(b, false, 10, -14.6, L1, 1);
  slab(b, 10, 64, -30, 0, ROOF_TOP, ROOF);

  // ---- the west band (x 10..22): the lobby (G) under the C2 landing (L1); the x 22 wall has the hall's west door and, on
  // L1 over the hall, the landing's spandrel and glass (the occlusion vantage over the whole hall, A23) (E2: clear glass panes on the old fence lines)
  wall(b, false, 22, -30, 0, 0, R, [doorHole(-18.6, 0), [-29.85, -8, S3_SPANDREL_TOP, R]]);
  doorAt(b, false, 22, -18.6, 0, 1);
  b.glass(22, -29.85, 22, -8, R - S3_SPANDREL_TOP, S3_SPANDREL_TOP);
  // the landing's floor, round the SW stair core
  slab(b, 10, 22, -22.4, 0, L1);
  slab(b, 10, 22, -30, -28, L1);
  slab(b, 10, 12, -28, -22.4, L1);
  slab(b, 14.6, 22, -28, -22.4, L1);

  // ---- the SW stair (core x 12..14.6, z -28..-22.4): G door (west half) and L1 door (east half) on the north face
  wall(b, false, 11.85, -28.3, -22.1, 0, R, []);
  wall(b, false, 14.75, -28.3, -22.1, 0, R, []);
  wall(b, true, -28.15, 11.7, 14.9, 0, R, []);
  wall(b, true, -22.25, 11.7, 14.9, 0, R, [[12, 13.2, 0, DOOR_H], [13.4, 14.6, L1, L1 + DOOR_H]]);
  doorAt(b, true, -22.25, 12, 0, 1);
  doorAt(b, true, -22.25, 13.4, L1, 1);
  bx(b, 13.25, 13.35, 0, 5.4, -26.8, -23.6, STEEL, { noLedge: true });
  slab(b, 12, 14.6, -28, -26.8, 2.25, STEEL);
  // (part-6 fix) an invisible 0.2 m lip of the half landing over the G flight's top end: the flight's collision ramp
  // ends there in its tilted end cap (normal 0.58, `LevelBuilder.ramp`), and the guards' nav cell at z -26.75 sampled the
  // cap, unwalkable, which cut the one-cell-wide flight off the landing (no G <-> L1 path on the runtime grid)
  b.box(12.625, 2.15, -26.7, 1.25, 0.2, 0.2, STEEL, 0, 0, true, false);
  b.boxes[b.boxes.length - 1]!.overhead = true;
  b.boxes[b.boxes.length - 1]!.noLedge = true;
  slab(b, 13.35, 14.6, -23.6, -22.4, L1, STEEL);
  // ---- the north stair (core x 40..42.6, z -6..-0.15 on L1; on G it opens south to the lobby z -8..-6)
  wall(b, false, 39.85, -7.85, -0.15, 0, R, [[-7.6, -6.4, 0, DOOR_H], [-7.85, -6, L1_UNDER, R]]);
  wall(b, false, 42.75, -7.85, -0.15, 0, R, [[-7.85, -6, L1_UNDER, R], [-5.95, -4.75, L1, L1 + DOOR_H]]);
  wall(b, true, -6, 39.7, 42.9, L1, R, [[41.4, 42.6, L1, L1 + DOOR_H]]);
  doorAt(b, false, 39.85, -7.6, 0, -1);
  doorAt(b, false, 42.75, -5.95, L1, 1);
  doorAt(b, true, -6, 41.4, L1, -1);
  bx(b, 41.25, 41.35, 0, 5.4, -4.7, -1.6, STEEL, { noLedge: true });
  rail(b, 41.25, 41.35, -6, -4.7, L1);
  slab(b, 40, 42.6, -1.6, -0.15, 2.25, STEEL);
  slab(b, 41.35, 42.6, -6, -4.7, L1, STEEL);
  for (const f of S3_FLIGHTS) b.stairs(f.x, f.z, f.w, f.len, f.rise, 13, STEEL, f.yaw, f.y);

  // ---- the test hall (x 22..52, z -30..-8, 9.0 clear): its north wall on G (the dock door, the stair lobby door) and the
  // corridor's spandrel and glass over it on L1 (the gallery door at x 41.3); the east wall to the closed annex
  wall(b, true, -8, 22, 52, 0, L1_UNDER, [doorHole(25.4, 0), doorHole(40.7, 0)]);
  doorAt(b, true, -8, 25.4, 0, -1);
  doorAt(b, true, -8, 40.7, 0, -1);
  wall(b, true, -8, 22, 52, L1, R, [[22, 40.7, S3_VIEW_SPANDREL_TOP, R], [40.7, 41.9, L1, L1 + DOOR_H], [41.9, 52, S3_VIEW_SPANDREL_TOP, R]]);
  doorAt(b, true, -8, 40.7, L1, 1);
  b.glass(22, -8, 40.7, -8, R - S3_VIEW_SPANDREL_TOP, S3_VIEW_SPANDREL_TOP);
  b.glass(41.9, -8, 52, -8, R - S3_VIEW_SPANDREL_TOP, S3_VIEW_SPANDREL_TOP);
  wall(b, false, 52, -30, -8, 0, R, []);
  // the east annex (x 52..64, z -30..-8): closed plant; its north wall runs to the roof (the security room's south wall on L1)
  wall(b, true, -8, 52, 64, 0, R, []);

  // the environmental chamber (x 30..36, z -22..-14, 4.4): smooth insulated panels, the refrigeration plant on top (set
  // back 3.5 m from the west lip: the CR3 headroom); its ladder is behind the padlocked anti-climb guard (A30): not built
  bx(b, 30, 36, 0, S3_BOX.chamberTop, -22, -14, PANEL_WHITE);
  bx(b, 33.5, 35.5, S3_BOX.chamberTop, 5.6, -21, -15, STEEL, { noLedge: true });
  // the shielded EMC room (x 42..48, z -24..-16, 4.0): closed (off when not testing), noLedge
  bx(b, 42, 48, 0, S3_BOX.emcTop, -24, -16, WALL_DARK, { noLedge: true });
  // the burn-in racks (2.2, along the east wall, >= 14 m from the chamber), noLedge; the benches (0.9) and the log desk
  for (const [x0, z0, x1, z1] of S3_BOX.racks) bx(b, x0, x1, 0, S3_BOX.racksTop, z0, z1, RACK, { noLedge: true });
  for (const [x0, z0, x1, z1] of S3_BOX.benches) bx(b, x0, x1, 0, S3_BOX.benchTop, z0, z1, BENCH);
  // the crane bay's board screen (3.0, x 26.5..26.8, z -21.5..-10.5) inside the west door: the bay's goods are staged behind
  // it; it hides #16's sweep corner from the chamber round and the stair tour (M8, A64)
  const [qx0, qz0, qx1, qz1] = S3_BOX.screen;
  bx(b, qx0, qx1, 0, 3.0, qz0, qz1, WALL_DARK, { noLedge: true });

  // the crane walkway (6.0) along the south wall: a 1.25 deck, a rail on its north edge, a caged ladder at each end (SW, SE)
  const [wx0, wz0, wx1, wz1] = S3_BOX.walkway;
  slab(b, wx0, wx1, wz0, wz1, S3_BOX.walkwayTop, STEEL);
  rail(b, 23.5, 50.5, wz1 - 0.1, wz1, S3_BOX.walkwayTop);
  for (const x of [23, 51]) {
    b.ladder(x, wz1 + 0.45, 0, S3_BOX.walkwayTop, PI);
    for (const y of [2.4, 3.4, 4.4, 5.4]) b.box(x, y, wz1 + 0.75, 0.9, 0.04, 0.04, STEEL, 0, 0, false);
  }

  // the steel escape gallery (4.5) on the hall's north wall, x 28..44, and its service spur to 0.5 m off the chamber's north
  // face (the plant's maintenance access): rails on every open edge but the spur's end
  const [gx0, gz0, gx1, gz1] = S3_BOX.gallery;
  const [sx0, sz0, sx1, sz1] = S3_BOX.spur;
  slab(b, gx0, gx1, gz0, gz1, L1, STEEL);
  slab(b, sx0, sx1, sz0, sz1, L1, STEEL);
  rail(b, gx0, sx0, gz0, gz0 + 0.1, L1);
  rail(b, sx1, gx1, gz0, gz0 + 0.1, L1);
  rail(b, gx0, gx0 + 0.1, gz0, gz1, L1);
  rail(b, gx1 - 0.1, gx1, gz0, gz1, L1);
  rail(b, sx0, sx0 + 0.1, sz0, sz1, L1);
  rail(b, sx1 - 0.1, sx1, sz0, sz1, L1);

  // ---- the north band, G: the goods-in dock (x 22..40), the dock desk, the gas cage in its NE corner (a 2.4 blockwork
  // blast wall on its west face, weldmesh on its south face, bottles inside, dark); x 42.9..64 is closed plant under L1
  bx(b, 30.7, 32.3, 0, 0.75, -1.35, -0.65, DESK);
  bx(b, 35.85, 36.15, 0, 2.4, -4, -0.15, WALL_DARK, { noLedge: true });
  b.fence(36, -4, 39.55, -4, 2.4);
  bx(b, 37, 39.4, 0, 1.6, -3.6, -0.5, BOTTLE);

  // ---- the north band, L1: its floor round the north stair core
  slab(b, 22, 64, -8, -6, L1);
  slab(b, 22, 40, -6, 0, L1);
  slab(b, 42.6, 64, -6, 0, L1);
  // the viewing corridor's north side (z -6): the write-up office's glass front and door, the gowning room's wall and door,
  // the clean room's glass, the back corridor's end, the store's front with its hatch door; the corridor's east end (x 52)
  b.glass(22, -6, 28.2, -6, R - L1, L1);
  b.glass(29.4, -6, 30, -6, R - L1, L1);
  b.glass(28.2, -6, 29.4, -6, R - L1 - DOOR_H, L1 + DOOR_H);
  doorAt(b, true, -6, 28.2, L1, 1);
  wall(b, true, -6, 30, 33, L1, R, [[30.6, 31.8, L1, L1 + DOOR_H]]);
  doorAt(b, true, -6, 30.6, L1, 1);
  b.glass(33, -6, 39.7, -6, R - L1, L1);
  wall(b, true, -6, 42.9, 44.6, L1, R, []);
  wall(b, true, -6, 44.6, 52, L1, R, [[46.2, 47.4, L1, L1 + DOOR_H]]);
  doorAt(b, true, -6, 46.2, L1, 1, { locked: false });
  wall(b, false, 52, -7.85, -1.75, L1, R, []);
  // the rooms' cross walls: write-up | gowning, gowning | clean room (the pass-through), back corridor | store (the back
  // door, kp-store), the store's north wall and the security room's north wall (its door) along z -1.6
  wall(b, false, 30, -6, -0.15, L1, R, []);
  wall(b, false, 33, -6, -0.15, L1, R, [[-3.6, -2.4, L1, L1 + DOOR_H]]);
  wall(b, false, 44.6, -6, -1.6, L1, R, [[-4.8, -3.6, L1, L1 + DOOR_H]]);
  doorAt(b, false, 44.6, -4.8, L1, 1);
  wall(b, true, -1.6, 44.6, 64, L1, R, [[56.4, 57.6, L1, L1 + DOOR_H]]);
  doorAt(b, true, -1.6, 56.4, L1, -1);
  // the store: the shelving partition at x 48.5 (2.4, the aisle gap z -4.6..-3.4 the beams cross), the prototype shelf
  bx(b, 48.35, 48.65, L1, L1 + 2.4, -5.85, -4.6, STEEL, { noLedge: true });
  bx(b, 48.35, 48.65, L1, L1 + 2.4, -3.4, -1.75, STEEL, { noLedge: true });
  bx(b, 51.2, 51.85, L1, L1 + 1.8, -5.0, -2.6, STEEL, { noLedge: true });
  // the desks: write-up (facing the corridor glass), the security room's monitors and kettle counter
  bx(b, 24.2, 25.8, L1, L1 + 0.75, -5.45, -4.75, DESK);
  bx(b, 57, 59, L1, L1 + 0.75, -7.85, -7.2, DESK);
  bx(b, 62.4, 63.85, L1, L1 + 0.9, -2.3, -1.75, STEEL);

  // ---- the laser fixtures (every band a visible emitter box at each end, R5)
  for (const l of S3_LASERS) {
    const top = Math.max(...l.ys) + 0.15;
    for (const [x, z] of [[l.x1, l.z1], [l.x2, l.z2]] as const) b.box(x, l.floorY! + top / 2, z, 0.12, top, 0.12, '#3a3d40', 0, 0, false);
  }

  // ---- lamps: the high bays (8.5, three rows), the viewing corridor, the burn-in task lights, the dock, the write-up office,
  // the security room. Dark by reason: the chamber roof and the EMC room (no fittings over them), the gas cage, the east
  // yard, the lobby and landing (nobody works there at night), the stairs (emergency fill only), the clean room, the store
  const down = makeCone(0, -1, 0, 1.15);
  for (const [x, z, g] of S3_HIGH_BAYS) lamp(b, x, 8.5, z, { r: 12, i: 0.9, group: g, cone: down, w: 0.7 });
  // LR16d: the east lamp slid 0.35 m off the wall (z -7 -> -7.35, lamp audit)
  for (const [x, z] of [[27, -7], [37, -7], [47, -7.35]] as const) lamp(b, x, 8.8, z, { r: 6, i: 0.7, group: S3_GROUPS.view, w: 0.5 });
  for (const z of [-23.5, -17.5, -12.2]) lamp(b, 50.2, 2.6, z, { r: 4, i: 0.7, group: S3_GROUPS.burn, cone: makeCone(0.5, -0.85, 0, 1.0), w: 0.4 });
  for (const x of [26, 33]) lamp(b, x, 4.0, -4, { r: 7, i: 0.8, group: S3_GROUPS.dock, cone: down, w: 0.5 });
  lamp(b, 26, 8.8, -3, { r: 6, i: 0.7, group: S3_GROUPS.office, w: 0.5 });
  lamp(b, 58, 8.8, -5, { r: 7, i: 0.7, group: S3_GROUPS.sec, w: 0.5 });

  // ---- ambient (LR7): the block at the standby fill 0.14 (true dark with a circuit cut); the two stair cores 0.30 (transit)
  b.ambientZone(10, 64, -30, 0, 0.14, -1, ROOF_TOP);
  b.ambientZone(12, 14.6, -28, -22.4, 0.3, -1, ROOF_TOP);
  b.ambientZone(40, 42.6, -8, -0.15, 0.3, -1, ROOF_TOP);
}
