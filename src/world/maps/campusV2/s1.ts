// (campus-greybox, v2 lane S1) Copied from `campusS1.ts` at P0; the S1 lane's greybox. Built only when `flags.campusV2` names 1.
import { Vector3 } from '../../../core/babylon';
import type { LevelBuilder } from '../../levelBuilder';
import type { RoomDef } from '../../rooms';
import type { MapLayout } from '../../mapDef';
import { makeCone } from '../../lights';

/**
 * Saltmarsh Park (`campusOps`) section 1 - the gatehouse, staff car park and forecourt (`docs/sector-redesign/SPEC.md`
 * "S1", slice 1). A greybox: boxes, lamps, switches, hide spots and spawns; no dressing. Frame: x west to east, z south
 * to north, y up, metres; yaw 0 = +z, PI / 2 = +x. Footprint x -40..26, z -80..-34 (ground only); the ring road is the map
 * edge (z -84), the HQ entrance pavilion (z -34..-30, the C1 vestibule inside it) closes the north.
 */

const PI = Math.PI;
const T = 0.3;
const WALL = '#b7b2a6';
const WALL_DARK = '#7d786d';
const STEEL = '#55606a';
const ROOF = '#4a4f55';
const KERB = '#9a9d9f';
const DESK = '#8a6a4c';
const BIN = '#2f5a3c';
const PLANTER = '#5d6b4a';
const CAR_COLOURS = ['#6f7b86', '#8c3b3b', '#d8d8d8', '#2e3b52', '#4a5d4a', '#a89a7a', '#3a3a3d'] as const;
const SODIUM: [number, number, number] = [1, 0.72, 0.38];
const WHITE: [number, number, number] = [1, 0.95, 0.88];

/** The lamp circuits (switch groups) of section 1 (the SPEC names them `s1-park-w` ... as ids; the registry's groups are numbers). */
export const S1_GROUPS = { parkW: 40, parkE: 41, fore: 42, gate: 43, canopy: 44, lane: 49 } as const;

/** The doors the sector data finds by centre (`Doors.nearest`): [x, z]. */
export const S1_DOORS = {
  /** C1 near door (the badge door in the canopy's north wall, into the vestibule) and far door (into S2's reception). */
  c1Near: [-20, -34] as [number, number],
  c1Far: [-20, -30] as [number, number],
  /** The delivery yard's dock door (locked; opens when C1 seals). */
  dock: [-33, -40] as [number, number],
  /** The gatehouse's north door. */
  gatehouse: [17, -73] as [number, number],
} as const;

/** The gap (x range) of the C1 doors in the z -34 and z -30 walls: 1.2 wide, on the 0.5 m nav lattice. */
export const C1_GAP: readonly [number, number] = [-20.6, -19.4];

/** (SPEC "Map structure decision") C1: the staff entrance vestibule, a 3.0 high connector. */
export const C1_BOX = [-24, -34, -16, -30] as const;

/** Section 1's rooms (HUD tags; no squads: the mode spawns the guards from the sector data). Plan boxes; none overlap. */
export const S1_ROOMS: RoomDef[] = [
  { id: 'verge', name: 'Marsh Verge', minX: 20, maxX: 26, minZ: -80, maxZ: -56 },
  { id: 'gatehouse', name: 'Gatehouse', minX: 14, maxX: 20, minZ: -79, maxZ: -73 },
  { id: 'lane', name: 'Barrier Lane', minX: 8, maxX: 14, minZ: -80, maxZ: -60 },
  { id: 'park', name: 'Staff Car Park', minX: -36, maxX: 6, minZ: -76, maxZ: -52 },
  { id: 'bins', name: 'Bin Store', minX: -40, maxX: -30, minZ: -52, maxZ: -45 },
  { id: 'bikes', name: 'Bike Shelter', minX: -10, maxX: 0, minZ: -50, maxZ: -46 },
  { id: 'smoke', name: 'Smoking Shelter', minX: 6, maxX: 10, minZ: -50, maxZ: -47 },
  { id: 'dyard', name: 'Delivery Yard', minX: -40, maxX: -26, minZ: -45, maxZ: -40 },
  { id: 'forecourt', name: 'Forecourt', minX: -26, maxX: 6, minZ: -46, maxZ: -34 },
  { id: 'plantroof', name: 'Plant Roof', minX: -40, maxX: -26, minZ: -40, maxZ: -34, minY: 4 },
  { id: 'c1', name: 'Staff Entrance', minX: -24, maxX: -16, minZ: -34, maxZ: -30 },
].map((r) => ({ ...r, squad: [] }));

/**
 * The co-op-only lip of section 1 (SPEC "Campus-wide rules", CR1): the canopy's east edge, 4.4 over the forecourt (a
 * leg-up from the dark east end of the kerb). The canopy top is also reached alone by the plant-roof ladder (LS 11.4,
 * rule 7); the lip itself is a co-op pathway only. `top` is the canopy's plan box (the landing).
 */
export interface CoopLip {
  id: string;
  section: number;
  /** The lip: plan x, z range, grip height, outward normal. */
  lip: { x: number; z0: number; z1: number; y: number; n: { x: number; z: number } };
  /** The co-op top it leads to (plan box and height). */
  top: { x0: number; x1: number; z0: number; z1: number; top: number };
  /** The booster's floor height and spot. */
  boost: { floor: number; x: number; z: number };
  /** The solo bypass to the same pinch point. */
  solo: string;
}

export const S1_COOP_LIPS: readonly CoopLip[] = [
  {
    id: 'CR1',
    section: 0,
    lip: { x: -14, z0: -40, z1: -34, y: 4.4, n: { x: 1, z: 0 } },
    top: { x0: -26, x1: -14, z0: -40, z1: -34, top: 4.4 },
    boost: { floor: 0, x: -13.5, z: -38 },
    solo: 'the stealth route to the doorman, or the plant-roof ladder (high route)',
  },
  // (builder, slice 1) the canopy's south edge is the same 4.4 lip over the forecourt; a leg-up from the south finds it too
  {
    id: 'CR1-south',
    section: 0,
    lip: { x: -20, z0: -40, z1: -40, y: 4.4, n: { x: 0, z: -1 } },
    top: { x0: -26, x1: -14, z0: -40, z1: -34, top: 4.4 },
    boost: { floor: 0, x: -20, z: -40.5 },
    solo: 'as CR1',
  },
];

/** Player spawns on the marsh verge, just inside the cut fence panel (24, -80). */
export const S1_SPAWNS: MapLayout['playerSpawns'] = [
  { pos: new Vector3(24, 0, -79), yaw: 0 },
  { pos: new Vector3(22.8, 0, -79), yaw: 0 },
  { pos: new Vector3(25.2, 0, -79), yaw: 0 },
  { pos: new Vector3(24, 0, -77.8), yaw: 0 },
];

/** Nav seeds: the verge, the plant roof and the canopy top (joined to the ground by the ladder / by being flush). */
export const S1_NAV_SEEDS: Vector3[] = [new Vector3(24, 0, -79), new Vector3(-33, 4.4, -37), new Vector3(-20, 4.4, -37), new Vector3(-20, 0, -32)];

export const S1_PICKUPS: NonNullable<MapLayout['pickups']> = [];

/** Where a carried body can be hidden: the bin store, between the cars, the verge reeds, the bike shelter, the smoking shelter's end. */
export const S1_HIDESPOTS: NonNullable<MapLayout['hideSpots']> = [
  { pos: new Vector3(-38, 0, -50.4) },
  { pos: new Vector3(-33.4, 0, -58.75) },
  { pos: new Vector3(24.2, 0, -68) },
  { pos: new Vector3(-5, 0, -47.2) },
  { pos: new Vector3(9.3, 0, -48.2) },
];

/**
 * Light switches: the feeder pillar's two breakers (west half, east half of the car park; the pillar's south face), the
 * delivery yard's board on the plant room's south wall (the forecourt bollards and the dock lamp), the gatehouse's switch
 * by its door (lure #1), and the canopy downlights' switch INSIDE C1 (not cuttable from section 1).
 */
export const S1_SWITCHES: NonNullable<MapLayout['switches']> = [
  { pos: new Vector3(-31.8, 0, -47.0), yaw: PI, group: S1_GROUPS.parkW },
  { pos: new Vector3(-30.9, 0, -47.0), yaw: PI, group: S1_GROUPS.parkE },
  { pos: new Vector3(-29.5, 0, -40.3), yaw: PI, group: S1_GROUPS.fore },
  { pos: new Vector3(15.7, 0, -73.3), yaw: PI, group: S1_GROUPS.gate },
  { pos: new Vector3(-23.85, 0, -32), yaw: PI / 2, group: S1_GROUPS.canopy },
];

/** The 14 parked cars: [row, bay] (4 rows x 15 bays of 2.8 m from x -36, rows 4.5 m deep with a 6 m aisle between R2 and R3). */
const ROW_Z = [-73.75, -69.25, -58.75, -54.25] as const;
const bayX = (i: number): number => -34.6 + 2.8 * i;
const CARS: readonly (readonly [number, number])[] = [
  [0, 2], [0, 3], [0, 8], [0, 13],
  [1, 3], [1, 7], [1, 11],
  [2, 1], [2, 5], [2, 9], [2, 14],
  [3, 4], [3, 8], [3, 12],
];

/**
 * The car-park columns: the pole's x, z and its arm's unit direction ax, az along x or z, toward the bays (west circuit
 * 16 heads, east circuit 10). light-realism L1: the light point hangs at the arm's end, 0.8 m out, not on top of its
 * pole. Every pole carries two heads on opposite arms (a twin-head column, two entries at one x, z): a head's own pole
 * shades a wedge behind it, and the other head lights that wedge. Three rows tuned to AS/NZS 1158.3.1 P11a
 * (`docs/light-realism/measure/S1-carpark.md`): the north row in R3 (z -53) and the south row on the back-to-back line
 * between R0 and R1 (z -71.5), poles on bay boundaries (x -36 + 2.8k); the aisle row (z -62). Every west pole west of
 * every east pole (one breaker each half).
 */
const PARK_ROW_N = -53;
const PARK_ROW_AISLE = -62;
const PARK_ROW_S = (ROW_Z[0] + ROW_Z[1]) / 2;
const twinRow = (z: number, xs: readonly number[]): (readonly [number, number, number, number])[] => xs.flatMap((x) => [[x, z, -1, 0] as const, [x, z, 1, 0] as const]);
export const PARK_COLUMNS_W: readonly (readonly [number, number, number, number])[] = [
  ...twinRow(PARK_ROW_N, [-33.2, -24.8, -13.6]),
  ...twinRow(PARK_ROW_AISLE, [-33, -21]),
  ...twinRow(PARK_ROW_S, [-36, -24.8, -13.6]),
];
export const PARK_COLUMNS_E: readonly (readonly [number, number, number, number])[] = [
  ...twinRow(PARK_ROW_N, [0.4]),
  ...twinRow(PARK_ROW_AISLE, [-9, 3]),
  ...twinRow(PARK_ROW_S, [-2.4, 6]),
];
/** The car-park heads: intensity, reach (radius 10: the worst 2 m lamp-grid column stays within `LAMP_GRID_SLOTS`) and
 *  cone (tipped 0.2 toward the arm, outer 1.3 rad: tilt + outer at most 1.5, a full cut-off head). */
export const PARK_COLUMN_HEAD = { i: 2.0, r: 10, tilt: 0.2, outer: 1.3 } as const;
/** The forecourt bollards (x at z -45.5). */
export const BOLLARD_XS: readonly number[] = [-28, -24, -20, -16, -12, -8, -4, 0];
/** The canopy downlights. */
export const CANOPY_LAMPS: readonly (readonly [number, number])[] = [[-23, -38], [-18.5, -38], [-23, -35.6], [-18.5, -35.6]];

/** A visible lamp fitting (no model: the glowing box), a real registry light. */
function lamp(b: LevelBuilder, x: number, y: number, z: number, o: { r: number; i: number; group: number; colour: [number, number, number]; cone?: ReturnType<typeof makeCone> | null; w?: number }): void {
  const w = o.w ?? 0.5;
  b.light({
    kind: o.cone ? 'spot' : 'lamp',
    x,
    y,
    z,
    radius: o.r,
    intensity: o.i,
    color: o.colour,
    cone: o.cone ?? null,
    group: o.group,
    on: true,
    destructible: true,
    electric: true,
    fixture: { sx: w, sy: 0.1, sz: w / 2, oy: 0 },
  });
}

/** An overhead head box (a door or window lintel): nothing to walk into on the floor below. */
function head(b: LevelBuilder, cx: number, cz: number, w: number, y0: number, y1: number, alongX: boolean, color = WALL): void {
  b.box(cx, (y0 + y1) / 2, cz, alongX ? w : T, y1 - y0, alongX ? T : w, color);
  b.boxes[b.boxes.length - 1]!.overhead = true;
}

/** Everything of section 1: walls, the canopy and plant roof, cars, shelters, fences, lamps, the ladder and the doors. */
export function buildCampusS1(b: LevelBuilder): void {
  // ---- perimeter weldmesh 2.4 (E3): south with the gate (x 8..14) and the cut panel (E1, x 23.4..24.6), east, west, north-east
  b.fence(-40, -80, 8, -80, 2.4);
  b.fence(14, -80, 23.4, -80, 2.4);
  b.fence(24.6, -80, 26, -80, 2.4);
  b.fence(26, -80, 26, -34, 2.4);
  b.fence(-40, -80, -40, -52, 2.4);
  b.fence(-40, -45, -40, -40, 2.4);
  b.fence(4, -34, 26, -34, 2.4);

  // ---- the gatehouse (14..20, -79..-73): roof 3.3, door north (17, -73), reception window west, rear window east (20, -76)
  const g0 = b.boxes.length;
  b.wallX(-79, 14, 20, [], 3.0, WALL, T);
  b.wallX(-73, 14, 20, [[16.4, 17.6]], 3.0, WALL, T);
  head(b, 17, -73, 1.2, 2.1, 3.0, true);
  b.wallZ(14, -79, -73, [[-76.6, -75.4]], 3.0, WALL, T);
  b.box(14, 0.45, -76, T, 0.9, 1.2, WALL_DARK);
  head(b, 14, -76, 1.2, 2.1, 3.0, false);
  b.wallZ(20, -79, -73, [[-76.6, -75.4]], 3.0, WALL, T);
  b.box(20, 0.45, -76, T, 0.9, 1.2, WALL_DARK);
  head(b, 20, -76, 1.2, 2.1, 3.0, false);
  b.box(17, 3.15, -76, 6.3, 0.3, 6.3, ROOF);
  b.boxes[b.boxes.length - 1]!.overhead = true;
  b.mark(g0, { noLedge: true });
  b.door(16.4, 0, -73, 1.2, PI / 2, { swing: -1 });
  b.windowAt(14, 1.5, -76, 1.2, 1.2, PI / 2, { sill: 0.9, open: false, breakable: true });
  // E2: the rear window is open for the kettle steam
  b.windowAt(20, 1.5, -76, 1.2, 1.2, PI / 2, { sill: 0.9, open: true, breakable: true });
  // the CCTV desk, the PC desk by the rear window, the kettle counter
  b.block(18.8, -73.8, 1.6, 0.75, 0.7, DESK);
  b.block(19.35, -76, 0.9, 0.75, 1.6, DESK);
  b.block(18.4, -78.55, 1.6, 0.9, 0.6, STEEL);
  // the gatehouse lamp (switch by its door: lure #1) and an off-circuit fitting nowhere: the interior is one circuit
  lamp(b, 17, 2.9, -76, { r: 5.5, i: 0.9, group: S1_GROUPS.gate, colour: WHITE, w: 0.6 });

  // ---- the barrier lane (8..14, -80..-60): rising-arm barrier at z -77 (the arm is down, visual), the island with cam-gate
  b.block(11, -77, 1.0, 1.0, 2.4, KERB);
  b.box(12.75, 1.0, -77, 2.5, 0.08, 0.1, '#d8c24a', 0, 0, false);
  b.pillar(11, -77.9, 0.07, 3.0, STEEL);
  // the lane floodlight on its 6.2 m pole, its arm +x into the lane (pole axis to 0.6 m out, y 6.10-6.20), the light point
  // at the arm's end 0.8 m out (light-realism L1: not on top of its pole) (photocell: no switch, shot only)
  b.pillar(9, -66, 0.15, 6.2, STEEL);
  b.box(9.3, 6.15, -66, 0.6, 0.1, 0.1, STEEL);
  lamp(b, 9.8, 6.0, -66, { r: 12, i: 0.5, group: S1_GROUPS.lane, colour: SODIUM, cone: makeCone(0, -1, 0, 1.15), w: 0.6 });

  // ---- the marsh verge (20..26, -80..-56): dark, reeds (visual) and two trees
  b.pillar(22.5, -66, 0.3, 5, '#4a3a2a');
  b.pillar(24.5, -60, 0.3, 5, '#4a3a2a');

  // ---- the staff car park (-36..6, -76..-52): 14 parked cars (roofs 1.5), column lamps 6.0 on two circuits (E5, E6, E11)
  CARS.forEach(([row, bay], k) => b.box(bayX(bay), 0.75, ROW_Z[row]!, 1.8, 1.5, 4.2, CAR_COLOURS[k % CAR_COLOURS.length]!));
  // each column (light-realism L1): the 6.2 m pole (once per twin), each arm along (ax, az) from the pole's axis to 0.6 m
  // out at y 6.10-6.20, and its light point hanging at the arm's end, 0.8 m out at y 6.0 (nothing of its own below it)
  const H = PARK_COLUMN_HEAD;
  for (const [cols, group] of [[PARK_COLUMNS_W, S1_GROUPS.parkW], [PARK_COLUMNS_E, S1_GROUPS.parkE]] as const) {
    cols.forEach(([x, z, ax, az], k) => {
      if (k === 0 || cols[k - 1]![0] !== x || cols[k - 1]![1] !== z) b.pillar(x, z, 0.15, 6.2, STEEL);
      b.box(x + 0.3 * ax, 6.15, z + 0.3 * az, ax ? 0.6 : 0.1, 0.1, az ? 0.6 : 0.1, STEEL);
      lamp(b, x + 0.8 * ax, 6.0, z + 0.8 * az, { r: H.r, i: H.i, group, colour: SODIUM, cone: makeCone(ax * H.tilt, -1, az * H.tilt, H.outer), w: 0.6 });
    });
  }

  // ---- the bin store (-40..-30, -52..-45): walls 3.0, open top and open to the south (E4); the feeder pillar's board (E5)
  b.wallZ(-40, -52, -45, [], 3.0, WALL_DARK, T);
  b.wallX(-45, -40, -30, [], 3.0, WALL_DARK, T);
  b.wallZ(-30, -52, -45, [], 3.0, WALL_DARK, T);
  b.block(-38.2, -48.2, 1.4, 1.2, 1.1, BIN);
  b.block(-36.6, -48.2, 1.4, 1.2, 1.1, BIN);
  b.block(-38.2, -46.2, 1.4, 1.2, 1.1, BIN);
  b.block(-31.4, -46.6, 1.6, 1.5, 0.4, STEEL); // the feeder pillar: its two breakers on the south face (S1_SWITCHES)

  // ---- the bike shelter (-10..0, -50..-46): roof 2.4 on four posts, its fitting tagged out (a dead lamp); no light
  const s0 = b.boxes.length;
  b.box(-5, 2.3, -48, 10, 0.2, 4, ROOF);
  b.mark(s0, { noLedge: true });
  for (const [x, z] of [[-9.8, -49.8], [-0.2, -49.8], [-9.8, -46.2], [-0.2, -46.2]] as const) b.pillar(x, z, 0.08, 2.2, STEEL);
  b.light({ kind: 'lamp', x: -5, y: 2.2, z: -48, radius: 0, intensity: 0, color: WHITE, group: -1, on: false, destructible: false, electric: false, fixture: { sx: 0.6, sy: 0.1, sz: 0.3, oy: 0 } });

  // ---- the smoking shelter (6..10, -50..-47): roof 2.4, back panel north, panels W and E, open to the car park
  const k0 = b.boxes.length;
  b.box(8, 2.3, -48.5, 4, 0.2, 3, ROOF);
  b.box(8, 1.1, -47.05, 4, 2.2, 0.1, STEEL);
  b.box(6.05, 1.1, -48.5, 0.1, 2.2, 3, STEEL);
  b.box(9.95, 1.1, -49.25, 0.1, 2.2, 4.5, STEEL); // (A68) the east panel runs 1.5 m longer to the south (z -51.5), hiding #6 from the verge
  b.mark(k0, { noLedge: true });

  // ---- the forecourt (-26..6, -46..-34): the drop-off kerb, planters along the facade (E10), bollards on the s1-fore circuit (E11)
  b.box(-20, 0.075, -46.15, 12, 0.15, 0.3, KERB);
  for (const x of [-11, -7, -3]) b.block(x, -35.6, 2.4, 0.7, 0.8, PLANTER);
  for (const x of BOLLARD_XS) {
    b.pillar(x, -45.5, 0.08, 0.9, STEEL);
    lamp(b, x, 0.85, -45.5, { r: 4.5, i: 0.5, group: S1_GROUPS.fore, colour: SODIUM, w: 0.2 });
  }

  // ---- the HQ entrance pavilion (z -34..-30, 4.4): solid blocks west and east of C1, the vestibule between them
  const p0 = b.boxes.length;
  b.box(-34, 2.2, -32, 20, 4.4, 4, WALL_DARK);
  b.box(-6, 2.2, -32, 20, 4.4, 4, WALL_DARK);
  // C1 (-24..-16, -34..-30, 3.0): the near door (-20, -34) in its south wall, its roof the pavilion's 4.4 top
  b.wallX(-34, -24, -16, [[C1_GAP[0], C1_GAP[1]]], 3.0, WALL, T);
  head(b, -20, -34, 1.2, 2.1, 3.0, true);
  b.box(-20, 3.7, -32, 8, 1.4, 4, WALL_DARK);
  b.mark(p0, { noLedge: true });
  b.boxes[b.boxes.length - 1]!.overhead = true;
  b.door(C1_GAP[0], 0, -34, 1.2, PI / 2, { swing: -1, locked: true, breachable: false });
  // the far door (-20, -30) in the S2 south wall (the wall and its head are `campusOps`'s shell, its gap is `C1_GAP`)
  b.door(C1_GAP[0], 0, -30, 1.2, PI / 2, { swing: 1, locked: true, breachable: false });

  // ---- the entrance canopy (-26..-14, -40..-34): a free-standing 4.4 top (soffit 4.2) on four 0.3 columns; nothing under its S / E / W edges (E8)
  const c0 = b.boxes.length;
  // (sector-redesign A65) a hatch x -20.6..-19.4, z -36.4..-35.3 above the doorman's post (-20, -35): the slab is four boxes around the opening
  for (const [x, z, w, d] of [[-23.3, -37, 5.4, 6], [-16.7, -37, 5.4, 6], [-20, -38.2, 1.2, 3.6], [-20, -34.65, 1.2, 1.3]] as const) b.box(x, 4.3, z, w, 0.2, d, '#9aa3a8');
  b.mark(c0, { overhead: true });
  for (const [x, z] of [[-25.5, -39.5], [-14.5, -39.5], [-25.5, -34.6], [-14.5, -34.6]] as const) b.pillar(x, z, 0.15, 4.2, STEEL);
  for (const [x, z] of CANOPY_LAMPS) lamp(b, x, 4.1, z, { r: 4.5, i: 0.85, group: S1_GROUPS.canopy, colour: WHITE, cone: makeCone(0, -1, 0, 1.0), w: 0.5 });

  // ---- the HQ ground-floor plant room (-40..-26, -40..-34) and its roof 4.4 (E9): walls 4.2, parapets 1.1 on its S and W edges
  const r0 = b.boxes.length;
  b.wallX(-40, -40, -26, [[-33.6, -32.4]], 4.2, WALL_DARK, T);
  head(b, -33, -40, 1.2, 2.1, 4.2, true, WALL_DARK);
  b.wallZ(-40, -40, -34, [], 4.2, WALL_DARK, T);
  b.wallZ(-26, -40, -34, [], 4.2, WALL_DARK, T);
  b.box(-33, 4.3, -37, 14, 0.2, 6, ROOF);
  b.mark(r0, { noLedge: true });
  b.door(-33.6, 0, -40, 1.2, PI / 2, { swing: 1, locked: true, breachable: false }); // E12: the dock door
  const q0 = b.boxes.length;
  b.box(-39.3, 4.95, -39.85, 1.4, 1.1, T, WALL_DARK); // S parapet, the ladder gap x -38.6 .. -37.4
  b.box(-31.7, 4.95, -39.85, 11.4, 1.1, T, WALL_DARK);
  b.box(-39.85, 4.95, -37, T, 1.1, 5.7, WALL_DARK); // W parapet
  b.mark(q0, { noLedge: true });
  // the caged ladder from the delivery yard (-38, -41) to the plant roof (E9)
  b.ladder(-38, -40.4, 0, 4.4, 0);
  for (const y of [2.2, 3.1, 4.0]) b.box(-38, y, -40.4, 0.9, 0.04, 0.04, STEEL, 0, 0, false);

  // ---- the delivery yard (-40..-26, -45..-40): the cage trolley (cover), the dock lamp on the s1-fore circuit
  b.block(-30.5, -44, 1.0, 1.2, 0.8, STEEL);
  lamp(b, -33, 2.7, -40.4, { r: 5, i: 0.8, group: S1_GROUPS.fore, colour: WHITE, cone: makeCone(0, -0.8, -0.6, 1.0), w: 0.4 });

  // ---- ambient (SPEC lighting rules, LR7): the whole section at the standby fill 0.14 (true dark with a circuit cut, the
  // verge, bin lane, bike shelter and the roofs by reason); C1 is a transit space at 0.30
  b.ambientZone(-40, 26, -80, -34, 0.14, -1, 8);
  b.ambientZone(C1_BOX[0], C1_BOX[2], C1_BOX[1], C1_BOX[3], 0.3, -1, 3.2);
}
