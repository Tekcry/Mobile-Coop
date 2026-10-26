// (campus-greybox S3 R1a) The v2 lab block's shared kit: constants, circuits, the plan boxes, the doors and the build
// helpers. Written once by the frame (R1a) and then frozen: the sub-lanes (s3Shell, s3L1, s3Stairs, s3Lights, s3Devices)
// read it and never edit it. Brief: `docs/campus-greybox/briefs/S3.md` sections 2-3.
import type { LevelBuilder } from '../../levelBuilder';
import type { makeCone } from '../../lights';

/*
 * Frame: x east, z north, y up, metres; yaw 0 = +z, PI / 2 = +x. Plan boxes are wall centre lines, walls 0.3 (clear =
 * box - 0.3; D:7). Footprint x 10..64, z -30..0; G 0, L1 4.5, roof underside 9.0, top 9.2 (fixed, brief section 0).
 * Sources: D = `docs/sector-redesign/signoff/S3-detail.md`, GR = `graph/plan/campusOps-S3.json`, P0 / P45 = the plans,
 * all at 7c021f01; S3 = `campusS3.ts` at 6c3f4a87 (as built).
 */

export const PI = Math.PI;
/** Wall thickness (D:7). */
export const T = 0.3;
export const WALL = '#b5b0a6';
export const WALL_DARK = '#7b766c';
export const PANEL_WHITE = '#d9dcd6';
export const STEEL = '#55606a';
export const SLAB = '#80868a';
export const ROOF = '#4a4f55';
export const DESK = '#8a6a4c';
export const RACK = '#2f3a44';
export const BENCH = '#6f7880';
export const BOTTLE = '#5d7d5a';
export const WHITE: [number, number, number] = [1, 0.97, 0.92];

/** Storey heights: the L1 floor's top, the roof slab's underside (the hall's clear height) and top (D:11-12). */
export const S3_L1 = 4.5;
export const S3_ROOF = 9.0;
export const ROOF_TOP = 9.2;
/** The L1 slab's underside (a 0.2 slab): the clear height of every G room under L1 (D:46, brief section 2). */
export const L1_UNDER = 4.3;
/** Door height (SS 3: single door 1.2 x 2.1). */
export const DOOR_H = 2.1;
/** Single door width (SS 3). */
export const DOOR_W = 1.2;
/** The viewing corridor's spandrel under its hall glass (z -11, x 14..52): 1.1 over the L1 floor (AS2 D:229, L14 D:75;
 *  replaces the as-built `S3_VIEW_SPANDREL_TOP` 6.2). */
export const S3_VIEW_SPANDREL_TOP = 5.6;
/** The hall's G observation glass into the control room (x 34..39 and 44..50 on z -11): sill and head (D:47, P0:60-61). */
export const S3_OBS_SILL = 1.0;
export const S3_OBS_HEAD = 2.1;
/** The goods roller door: an open gap 3.0 x 3.0, no leaf (SS 3; D:47, P0:20-21). */
export const S3_ROLLER_H = 3.0;
/** The L1 suspended ceilings: deck top 7.5, 0.1 thick (P19, AS5 D:235). */
export const S3_CEIL_TOP = 7.5;

/**
 * The lamp circuits of section 3. As built `hb1`..`sec` 60-67 (S3:53); `ctl` 68 and `plant` 69 (derived: the two free ids
 * of S3's 60-69 band; brief B1). J17 (Q2 "Never", brief B8) adds the rooms first listed as dark on S3's new-circuit range
 * 160-169: `emc` 160, `clean` 161, `hoist` 162, `wStair` 163, `nStair` 164, `eStair` 165 (brief R4 lamp table).
 */
export const S3_GROUPS = {
  hb1: 60,
  hb2: 61,
  hb3: 62,
  view: 63,
  burn: 64,
  dock: 65,
  office: 66,
  sec: 67,
  ctl: 68,
  plant: 69,
  emc: 160,
  clean: 161,
  hoist: 162,
  wStair: 163,
  nStair: 164,
  eStair: 165,
} as const;

/** The five high bays (y 8.5, D:116): [x, z, group]. hb1 = the south pair, hb2 = the crane bay, hb3 = the north pair
 *  (derived: the as-built row order south / middle / north, S3:224; brief 3.3). */
export const S3_HIGH_BAYS: readonly (readonly [number, number, number])[] = [
  [27, -25, S3_GROUPS.hb1],
  [39, -25, S3_GROUPS.hb1],
  [20, -20, S3_GROUPS.hb2],
  [27, -12, S3_GROUPS.hb3],
  [39, -12, S3_GROUPS.hb3],
];

/** A box on the plan: [x0, z0, x1, z1]. */
export type S3Box = readonly [x0: number, z0: number, x1: number, z1: number];

/** The plan boxes (brief 3.1): [x0, z0, x1, z1] on wall centre lines, tops where they matter. */
export const S3_BOX = {
  /** The test hall (D:46, GR:68-99): main hall 9.0 clear; its low aisle x 10..14 under the landing is 4.3 high. */
  hall: [10, -30, 52, -11] as S3Box,
  /** The hall's low aisle under the landing (4.3 high; D:46). */
  hallAisle: [10, -30, 14, -11] as S3Box,
  /** The goods-in dock, 4.3 high (D:49). */
  dock: [10, -11, 30, 0] as S3Box,
  /** The test control room, 4.3 high, less the north core (D:51). */
  control: [30, -11, 52, 0] as S3Box,
  /** The plant room: 4.3 under L1 (z -18..-7), 9.0 over the chiller bay (D:52). */
  plant: [52, -30, 64, -7] as S3Box,
  /** The sealed LV switch room and riser (D:53, P0:40, P0:43): locked, no door. */
  lvRoom: [52, -7, 58, 0] as S3Box,
  riser: [61.5, -7, 64, 0] as S3Box,
  /** The three fire-stair cores (D:48, D:50, D:53). */
  wCore: [14, -21, 17.5, -14.5] as S3Box,
  nCore: [30, -7, 33.5, -0.5] as S3Box,
  eCore: [58, -7, 61.5, -0.5] as S3Box,
  /** The environmental chamber (kept; D:56, S3:71). */
  chamber: [30, -22, 36, -14] as S3Box,
  chamberTop: 4.4,
  /** The shielded EMC room (kept; D:56, S3:73). */
  emc: [42, -24, 48, -16] as S3Box,
  emcTop: 4.0,
  /** The burn-in racks (derived: the as-built rows S3:83 clipped to the plan's z -25..-11.5, gaps kept; D:56). */
  racks: [[50.6, -25, 51.6, -21], [50.6, -20, 51.6, -15], [50.6, -14, 51.6, -11.5]] as readonly S3Box[],
  racksTop: 2.2,
  /** The benches (S3:85): south kept, north against the new z -11 wall (P8), the log desk kept. */
  benches: [[24, -24.9, 27, -24.1], [24, -11.95, 27, -11.15], [46.5, -12.8, 48.5, -12.0]] as readonly S3Box[],
  benchTop: 0.9,
  /** The crane bay's board screen, 3.0 high (D:56). */
  screen: [26.5, -21.5, 26.8, -14] as S3Box,
  screenTop: 3.0,
  /** The gas cage in the dock's NW corner (D:49). */
  gasCage: [10, -3.5, 13.5, 0] as S3Box,
  /** The dock desk (D:49). */
  dockDesk: [23.5, -2.6, 25.5, -1.8] as S3Box,
  dockDeskTop: 0.75,
  /** The loading pad under the hoist hatch (D:49). */
  loadingPad: [18, -6, 21, -3] as S3Box,
  loadingPadTop: 0.1,
  /** L1: the bridge landing (D:62). */
  landing: [10, -30, 14, -11] as S3Box,
  /** The crane walkway (D:63). */
  walkway: [14, -29.85, 52, -28.35] as S3Box,
  walkwayTop: 6.0,
  /** L1: the viewing corridor and the east lobby (D:64-65). */
  view: [10, -11, 52, -7] as S3Box,
  east: [52, -11, 64, -7] as S3Box,
  /** L1: the north rooms, all z -7..0 (D:66-70). */
  hoist: [10, -7, 21, 0] as S3Box,
  writeup: [21, -7, 30, 0] as S3Box,
  gown: [33.5, -7, 37.5, 0] as S3Box,
  clean: [37.5, -7, 47, 0] as S3Box,
  store: [47, -7, 58, 0] as S3Box,
  /** The hoist hatch over the loading pad (D:66; the hole is cut to the x 21 wall face, P9). */
  hoistHatch: [18, -6, 21, -3] as S3Box,
  /** L1: the security room over the plant (D:72). */
  sec: [53, -18, 64, -11] as S3Box,
  /** The escape gallery and its spur to the chamber roof (D:73), deck tops 4.5. */
  gallery: [28, -12.5, 44, -11] as S3Box,
  spur: [31, -14, 35, -12.5] as S3Box,
  galleryTop: 4.5,
  /** The ceiling void (D:75): the graph box x 21..58; the walkable deck from x 20 (P10). */
  void: [21, -7, 58, 0] as S3Box,
  voidDeck: [20, -7, 58, 0] as S3Box,
  voidTop: 7.5,
  /** The chilled-water trench, a crouch duct 1.2 wide and 1.5 clear (P0:71, D:54): its centre-line polyline [x, z]. */
  trench: [[56, -26], [53.5, -29], [37, -29], [37, -23]] as readonly (readonly [number, number])[],
  trenchW: 1.2,
  trenchClear: 1.5,
} as const;

/** A door of section 3: its centre [x, z] on its wall line and its floor y. */
export type S3Door = readonly [x: number, z: number, y: number];

/**
 * Every door centre of the re-lay (brief 3.2; centre [x, z] on the wall line, floor y). Single doors are 1.2 x 2.1 (SS 3),
 * hinge = centre - 0.6 along the wall (`doorAt`). `roller` is an open 3.0 x 3.0 gap with no leaf (x 20..23 on z -11);
 * `landingFire` is a 1.8 double door (x 11.1..12.9). The sector data finds doors by centre (`Doors.nearest`).
 */
export const S3_DOORS = {
  /** C3 near door (as built; hole x 23.4..24.6 on z 0; S3:324, S3:327). */
  c3Near: [24, 0, 0] as S3Door,
  /** C2 far door (as built; hole z -14.6..-13.4 on x 10 at L1; S3:325, S3:328; P20). */
  c2Far: [10, -14, S3_L1] as S3Door,
  /** The goods roller door, hall <-> dock (D:47, P0:20-21). */
  roller: [21.5, -11, 0] as S3Door,
  /** Hall -> control room (D:47, P0:21-22). */
  ctlHall: [40.6, -11, 0] as S3Door,
  /** The north core's G doors: west to the dock, east to the control room (D:50, P0:23-30). */
  nStairW: [30, -6, 0] as S3Door,
  nStairE: [33.5, -6, 0] as S3Door,
  /** The north core's L1 door onto the corridor (D:50, P45:35). */
  nStairL1: [31.6, -7, S3_L1] as S3Door,
  /** Control room -> plant (D:51, P0:31-32). */
  ctlPlant: [52, -9, 0] as S3Door,
  /** Hall -> plant (D:52, P0:50-51). */
  plantHall: [52, -26.8, 0] as S3Door,
  /** The east core's G door from the plant (D:53, P0:33-36). */
  eStairG: [59.7, -7, 0] as S3Door,
  /** The west core's doors on its west face, stacked (D:48, P0:47-48; z -20.05 on the landing, P2; plan -19.4). */
  wStairG: [14, -20.05, 0] as S3Door,
  wStairL1: [14, -20.05, S3_L1] as S3Door,
  /** The landing's fire double door to the corridor, 1.8 (D:62, P45:26-27). */
  landingFire: [12, -11, S3_L1] as S3Door,
  /** The north rooms' corridor doors (z -7, L1): goods landing, write-up (in its glass front), gowning (D:66-68, D:78). */
  hoist: [12.6, -7, S3_L1] as S3Door,
  writeup: [24.6, -7, S3_L1] as S3Door,
  gown: [35.5, -7, S3_L1] as S3Door,
  /** Gowning -> clean room (D:68, P45:42-43) and clean room -> store, the airlock (D:69, P45:44-45). */
  passThrough: [37.5, -3, S3_L1] as S3Door,
  airlock: [47, -3, S3_L1] as S3Door,
  /** The store hatch from the corridor (D:70; unlocked as built S3:442, B5). */
  storeHatch: [49.6, -7, S3_L1] as S3Door,
  /** The store's staff door from the east core, kp-store (D:70, GR:676). */
  staff: [58, -6, S3_L1] as S3Door,
  /** The east core's L1 door onto the east lobby (GR:686). */
  eStairL1: [59.7, -7, S3_L1] as S3Door,
  /** The gallery's glass door onto the corridor (D:73, P45:28-29). */
  gallery: [43.2, -11, S3_L1] as S3Door,
  /** The security room door from the east lobby, kp-sec (D:72, P45:30-31). */
  sec: [58.6, -11, S3_L1] as S3Door,
  /** The walkway door in the landing's x 14 glass, at 6.0 (D:63, P45:18-19). */
  walkway: [14, -29.0, 6.0] as S3Door,
} as const;

export type S3DoorId = keyof typeof S3_DOORS;

/**
 * Each door's swing for `doorAt` (brief 3.2, B4; `doors.ts:163`: leaf yaw = yaw + swing x openAngle). A wall along x
 * (yaw PI / 2): +1 opens to -z, -1 to +z; a wall along z (yaw 0): +1 opens to +x, -1 to -x. Room doors on the corridor
 * open into the room; stair-core doors open into the core; the gallery and walkway doors open away from their decks.
 * `roller` has no leaf (0); `landingFire` is two 0.9 leaves, both on the -1 side.
 */
export const S3_DOOR_SWING: Readonly<Record<S3DoorId, 1 | -1 | 0>> = {
  c3Near: -1,
  c2Far: 1,
  roller: 0,
  ctlHall: -1,
  nStairW: 1,
  nStairE: -1,
  nStairL1: -1,
  ctlPlant: 1,
  plantHall: 1,
  eStairG: -1,
  wStairG: 1,
  wStairL1: 1,
  landingFire: -1,
  hoist: -1,
  writeup: -1,
  gown: -1,
  passThrough: 1,
  airlock: 1,
  storeHatch: -1,
  staff: 1,
  eStairL1: -1,
  gallery: -1,
  sec: 1,
  walkway: -1,
};

// ---- helpers, copied unchanged from `campusS3.ts` (S3:230-247, S3:249-315)

/** A visible lamp fitting (the glowing box), a real registry light. */
export function lamp(b: LevelBuilder, x: number, y: number, z: number, o: { r: number; i: number; group: number; cone?: ReturnType<typeof makeCone> | null; w?: number }): void {
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

export interface Flags {
  overhead?: boolean;
  noLedge?: boolean;
}

/** An axis-aligned box from its extents. */
export function bx(b: LevelBuilder, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string, f: Flags = {}): void {
  b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
  const p = b.boxes[b.boxes.length - 1]!;
  if (f.overhead) p.overhead = true;
  if (f.noLedge) p.noLedge = true;
}

/** An opening in a wall: a..e along it, from y0 to y1. */
export type Hole = readonly [a: number, e: number, y0: number, y1: number];

/** A door opening on floor `y` (1.2 wide from `a`). */
export const doorHole = (a: number, y: number): Hole => [a, a + 1.2, y, y + DOOR_H];

/**
 * A wall of thickness T centred on a line (along x at z when `alongX`, else along z at x), from a0 to a1 and y0 to y1, cut
 * by its openings: the wall is split into upright strips between the openings' edges, each strip solid where no opening
 * covers it. Every piece is noLedge (walls are no climbing routes).
 */
export function wall(b: LevelBuilder, alongX: boolean, at: number, a0: number, a1: number, y0: number, y1: number, holes: readonly Hole[], color = WALL): void {
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
export function doorAt(b: LevelBuilder, alongX: boolean, at: number, a: number, y: number, swing: 1 | -1, o: { locked?: boolean } = {}): void {
  if (alongX) b.door(a, y, at, 1.2, PI / 2, { swing, locked: o.locked, breachable: !o.locked });
  else b.door(at, y, a, 1.2, 0, { swing, locked: o.locked, breachable: !o.locked });
}

/** A floor slab (0.2 thick, top at `top`), overhead and noLedge. */
export function slab(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, top: number, color = SLAB): void {
  bx(b, x0, x1, top - 0.2, top, z0, z1, color, { overhead: true, noLedge: true });
}

/** A steel guard rail (0.1 thick, 1.1 high) on a floor at `y`, noLedge. */
export function rail(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, y: number): void {
  bx(b, x0, x1, y, y + 1.1, z0, z1, STEEL, { noLedge: true });
}
