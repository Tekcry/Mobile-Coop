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
const VAN = '#f2a31b';
const CAR_COLOURS = ['#6f7b86', '#8c3b3b', '#d8d8d8', '#2e3b52', '#4a5d4a', '#a89a7a', '#3a3a3d'] as const;

/** The lamp circuits (switch groups) of section 1 (the SPEC names them `s1-park-w` ... as ids; the registry's groups are numbers). */
export const S1_GROUPS = { parkW: 40, parkE: 41, fore: 42, gate: 43, canopy: 44, lane: 49, bikes: 46, smoke: 45 } as const;

/** The doors the sector data finds by centre (`Doors.nearest`): [x, z]. */
export const S1_DOORS = {
  /** C1 near door (the badge door in the canopy's north wall, into the vestibule) and far door (into S2's reception). */
  c1Near: [-20, -34] as [number, number],
  c1Far: [-20, -30] as [number, number],
  /** The delivery yard's dock door (locked; opens when C1 seals). */
  dock: [-33, -40] as [number, number],
  /** The gatehouse's north door. */
  gatehouse: [17, -72.5] as [number, number],
  /** (S1 v3) The garden gate in the new z -58 fence (the pair-gate team door; the gap x 22.4..23.6). */
  gardenGate: [23, -58] as [number, number],
} as const;

/** (campus-s1-fence) The top (m) of the perimeter's collision-only anti-climb cap: over the highest S1 launch near a
 *  perimeter line (the plant-roof parapet 5.5 + the mantle 1.8) with room to spare. */
export const S1_FENCE_CAP = 8;
/** (campus-s1-fence) The perimeter lines the cap stands on: x0, z0, x1, z1 (one axis fixed) and the line's own top there
 *  (the palisade 2.4; the plant-roof and pavilion roof screens 6.8). */
export const S1_FENCE_CAP_LINES: readonly (readonly [number, number, number, number, number])[] = [
  [-40, -80, 26, -80, 2.4], // south, the gate leaf and the cut panel included
  [26, -80, 26, -34, 2.4], // east
  [-40, -80, -40, -40, 2.4], // west palisade
  [-40, -40, -40, -30, 6.8], // west, over the plant room wall and the roof screens
  [4, -34, 26, -34, 2.4], // north-east
  [3.7, -34, 3.7, -30, 6.8], // the pavilion top's east screen
  [6, -58, 26, -58, 2.4], // (S1 v3) the garden-gate fence
];

/** The gap (x range) of the C1 doors in the z -34 and z -30 walls: 1.2 wide, on the 0.5 m nav lattice. */
export const C1_GAP: readonly [number, number] = [-20.6, -19.4];

/** (SPEC "Map structure decision") C1: the staff entrance vestibule, a 3.0 high connector. */
export const C1_BOX = [-24, -34, -16, -30] as const;

/**
 * Section 1's rooms (HUD tags; no squads: the mode spawns the guards from the sector data). Plan boxes (G6, D:136-140); none
 * overlap: the roof rooms carry `minY` and the rooms under them `maxY` (A21). The bins, bikes and smoke rooms of the live S1 are
 * gone (D:140, AS7).
 */
export const S1_ROOMS: RoomDef[] = [
  { id: 'verge', name: 'Marsh Verge', minX: 20, maxX: 26, minZ: -80, maxZ: -54 },
  { id: 'gatehouse', name: 'Gatehouse', minX: 13.5, maxX: 20, minZ: -79, maxZ: -72.5, maxY: 3.2 },
  { id: 'gateroof', name: 'Gatehouse Roof', minX: 13.5, maxX: 20, minZ: -79, maxZ: -72.5, minY: 3.2 },
  { id: 'lane', name: 'Barrier Lane', minX: 6, maxX: 13.5, minZ: -80, maxZ: -54 },
  // the apron is one graph space with the lane (s1-lane): the same name
  { id: 'apron', name: 'Barrier Lane', minX: 13.5, maxX: 20, minZ: -72.5, maxZ: -54 },
  { id: 'park', name: 'Staff Car Park', minX: -40, maxX: 6, minZ: -80, maxZ: -54, maxY: 2.9 },
  { id: 'carport', name: 'Carport Roof', minX: -24, maxX: 0, minZ: -63, maxZ: -54, minY: 2.9 },
  { id: 'dyard', name: 'Service Yard', minX: -40, maxX: -26, minZ: -54, maxZ: -40 },
  { id: 'plantroom', name: 'Plant Room', minX: -40, maxX: -26, minZ: -40, maxZ: -33, maxY: 4 },
  { id: 'plantroof', name: 'Plant Roof', minX: -40, maxX: -26, minZ: -40, maxZ: -34, minY: 4 },
  { id: 'forecourt', name: 'Forecourt', minX: -26, maxX: -6, minZ: -54, maxZ: -34 },
  { id: 'lawn', name: 'Staff Lawn', minX: -6, maxX: 26, minZ: -54, maxZ: -34 },
  { id: 'pavilion', name: 'Pavilion Roof', minX: -40, maxX: 3.7, minZ: -34, maxZ: -30, minY: 4 },
  { id: 'c1', name: 'Staff Entrance', minX: -24, maxX: -16, minZ: -34, maxZ: -30, maxY: 4 },
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
  // (G4, C4) the plant roof's hoist bay over the service yard: the S parapet open x -31..-27 (its true extent:
  // `S1_LIP_SEGMENTS`; `CoopLip` holds a z-running lip only, so it is written point-style as CR1-south, A17)
  {
    id: 'CR1-yard',
    section: 0,
    lip: { x: -29, z0: -40, z1: -40, y: 4.4, n: { x: 0, z: -1 } },
    top: { x0: -40, x1: -26, z0: -40, z1: -33, top: 4.4 },
    boost: { floor: 0, x: -29, z: -40.6 },
    solo: 'the caged ladder, or the plant room roof hatch',
  },
  // (G5, C6) the pavilion east block's south face over the lawn's facade planters (x -6..4; written point-style, A17)
  {
    id: 'CR1-east',
    section: 0,
    lip: { x: 0, z0: -34, z1: -34, y: 4.4, n: { x: 0, z: -1 } },
    top: { x0: -6, x1: 4, z0: -34, z1: -30, top: 4.4 },
    boost: { floor: 0, x: 0, z: -34.6 },
    solo: 'the plant-roof ladder and the pavilion walk',
  },
];

/** (campus-greybox A17) The true plan segments of the x-running co-op lips (`S1_COOP_LIPS` writes them point-style). */
export const S1_LIP_SEGMENTS: Record<string, { a: [number, number]; b: [number, number] }> = {
  'CR1-yard': { a: [-31, -40], b: [-27, -40] },
  'CR1-east': { a: [-6, -34], b: [4, -34] },
};

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

/** Where a carried body can be hidden: the bin store, between the cars, the verge reeds, the bike shelter, the smoking
 *  shelter's end; (G3, D:148) the cars' and the bike shelter's moved with them, the carport's west end added; (G6) the final
 *  seven, in the brief's order. */
export const S1_HIDESPOTS: NonNullable<MapLayout['hideSpots']> = [
  { pos: new Vector3(-38, 0, -50.4) },
  { pos: new Vector3(-33.4, 0, -60.75) },
  { pos: new Vector3(24.2, 0, -68) },
  { pos: new Vector3(-7, 0, -51.2) },
  { pos: new Vector3(9.3, 0, -48.2) },
  // (G4, D:115) the plant room
  { pos: new Vector3(-38, 0, -36) },
  // (G3) the carport's west end
  { pos: new Vector3(-25, 0, -62) },
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
  { pos: new Vector3(15.7, 0, -72.8), yaw: PI, group: S1_GROUPS.gate },
  // (G4, D:104, AS8) the canopy breaker on the yard board beside the fore switch (sync node A, sync-s1-yard-board)
  { pos: new Vector3(-29.0, 0, -40.3), yaw: PI, group: S1_GROUPS.canopy },
  // (G3, A25) the bike shelter lamp's switch on its north-west post
  { pos: new Vector3(-11.65, 0, -50.4), yaw: PI / 2, group: S1_GROUPS.bikes },
  // (G5, A19) the smoking shelter lamp's switch on the west panel's inner face at its open end
  { pos: new Vector3(6.2, 0, -49.8), yaw: PI / 2, group: S1_GROUPS.smoke },
];

/** The 14 parked cars: [row, bay] (4 rows x 15 bays of 2.8 m from x -36, rows 4.5 m deep with a 6 m aisle between R2 and R3);
 *  (G3, D:77) the rows 2 m south, the aisle z -69..-63. */
const ROW_Z = [-75.75, -71.25, -60.75, -56.25] as const;
const bayX = (i: number): number => -34.6 + 2.8 * i;
const CARS: readonly (readonly [number, number])[] = [
  [0, 2], [0, 3], [0, 8], [0, 13],
  [1, 3], [1, 7], [1, 11],
  [2, 1], [2, 5], [2, 9], [2, 14],
  [3, 4], [3, 8], [3, 12],
];

/** (campus-greybox S1 G1) The lamp lists live in the one light block `S1_LIGHTS` (`s1Data.ts`); these names re-export its
 *  lists. `s1Data.ts` is the entry of the S1 modules (`campusSections.ts` imports it first), so the cycle is safe. */
export { PARK_COLUMNS_W, PARK_COLUMNS_E, BOLLARD_XS, CANOPY_LAMPS } from './s1Data';

/** A light colour (linear RGB) and a cone as `makeCone`'s arguments (direction x, y, z, outer angle). */
export type S1Colour = readonly [number, number, number];
export type S1Cone = readonly [number, number, number, number];
/**
 * (light-realism L1) One car-park column head: the pole's x, z and its arm's unit direction ax, az (along x or z, toward the
 * bays). A twin-head column is two entries at one x, z with opposite arms (a head's own pole shades a wedge behind it, the
 * other head lights it); the pole is drawn once per twin.
 */
export type S1Column = readonly [number, number, number, number];
/** One lamp fitting of the light block. */
export interface S1Lamp {
  x: number;
  y: number;
  z: number;
  r: number;
  i: number;
  colour: S1Colour;
  group: number;
  cone: S1Cone | null;
  /** Fixture width (the glowing box). */
  w: number;
}
/** A row of like fittings at plan points (one spec, many points). */
export interface S1LampRow {
  pts: readonly (readonly [number, number])[];
  y: number;
  r: number;
  i: number;
  colour: S1Colour;
  group: number;
  cone: S1Cone | null;
  w: number;
}
/**
 * (campus-greybox S1 G1) Every S1 lamp (position, height, radius, intensity, colour, cone, circuit) in one block: `S1_LIGHTS`
 * in `s1Data.ts`, passed to `buildCampusS1` (`S1_PARTS.build`), so light-realism retunes it without touching the geometry.
 */
export interface S1Lights {
  /** The car-park column heads on the west and east circuits (light-realism L1: twin-head arm columns, `S1Column`). */
  columnsW: readonly S1Column[];
  columnsE: readonly S1Column[];
  /** The column spec: the pole (height, radius), the arm (from the pole's axis to `armLen` out, centred at `armY`), the
   *  light point `reach` out along the arm at `y`, the head (radius, intensity, colour, the cone tipped `tilt` toward the
   *  arm with outer angle `outer`, fixture width) and the two circuits. */
  column: { pillarH: number; pillarR: number; armLen: number; armY: number; reach: number; y: number; r: number; i: number; colour: S1Colour; tilt: number; outer: number; w: number; groupW: number; groupE: number };
  /** The forecourt light bollards: x list at one z, the post and the lamp. */
  bollards: { xs: readonly number[]; z: number; postH: number; postR: number; y: number; r: number; i: number; colour: S1Colour; group: number; w: number };
  /** The entrance canopy downlights. */
  canopy: S1LampRow;
  /** The plant room's dock lamp over the goods door. */
  dock: S1Lamp;
  /** The barrier lane floodlight (photocell: no switch, shot only): the lamp at its arm's end; the pole at (poleX, z), the
   *  arm along x from the pole's axis to `armLen` out toward the lamp, centred at `armY` (light-realism L1). */
  laneFlood: S1Lamp & { poleX: number; poleH: number; poleR: number; armLen: number; armY: number };
  /** The gatehouse ceiling tube. */
  gate: S1Lamp;
  /** (G2) The warm desk lamp on the CCTV desk (gate circuit). */
  deskLamp: S1Lamp;
  /** (S1 v3) the garden gate's lamp, gatehouse circuit. */
  gateLamp: S1Lamp;
  /** (G3) The carport's under-canopy downlights: [x, z, circuit] each (the car park's halves), one spec. */
  carport: { pts: readonly (readonly [number, number, number])[]; y: number; r: number; i: number; colour: S1Colour; cone: S1Cone | null; w: number };
  /** (G3) The bike shelter lamp (its own circuit). */
  bikes: S1Lamp;
  /** (G5) The smoking shelter's warm lamp (its own circuit). */
  smoke: S1Lamp;
}

/** Every lamp of the block as single fittings, in draw order (the tests match the registry against it). */
export function s1Lamps(L: S1Lights): S1Lamp[] {
  const c = L.column;
  const out: S1Lamp[] = [L.gate, L.deskLamp, L.laneFlood];
  for (const h of L.columnsW) out.push(columnLamp(c, h, c.groupW));
  for (const h of L.columnsE) out.push(columnLamp(c, h, c.groupE));
  const o = L.bollards;
  for (const x of o.xs) out.push({ x, y: o.y, z: o.z, r: o.r, i: o.i, colour: o.colour, group: o.group, cone: null, w: o.w });
  for (const [x, z] of L.canopy.pts) out.push({ ...L.canopy, x, z });
  out.push(L.dock);
  const cp = L.carport;
  for (const [x, z, group] of cp.pts) out.push({ x, y: cp.y, z, r: cp.r, i: cp.i, colour: cp.colour, group, cone: cp.cone, w: cp.w });
  out.push(L.bikes, L.smoke, L.gateLamp);
  return out;
}

/** (light-realism L1) A column head's lamp: the light point hangs at the arm's end, `reach` out, not on top of its pole;
 *  its cone tipped `tilt` toward the arm. */
export function columnLamp(c: S1Lights['column'], [x, z, ax, az]: S1Column, group: number): S1Lamp {
  return { x: x + c.reach * ax, y: c.y, z: z + c.reach * az, r: c.r, i: c.i, colour: c.colour, group, cone: [ax * c.tilt, -1, az * c.tilt, c.outer], w: c.w };
}

/** A visible lamp fitting (no model: the glowing box), a real registry light, from a light-block entry. */
function lamp(b: LevelBuilder, l: S1Lamp): void {
  b.light({
    kind: l.cone ? 'spot' : 'lamp',
    x: l.x,
    y: l.y,
    z: l.z,
    radius: l.r,
    intensity: l.i,
    color: [l.colour[0], l.colour[1], l.colour[2]],
    cone: l.cone ? makeCone(l.cone[0], l.cone[1], l.cone[2], l.cone[3]) : null,
    group: l.group,
    on: true,
    destructible: true,
    electric: true,
    fixture: { sx: l.w, sy: 0.1, sz: l.w / 2, oy: 0 },
  });
}

/** An overhead head box (a door or window lintel): nothing to walk into on the floor below. */
function head(b: LevelBuilder, cx: number, cz: number, w: number, y0: number, y1: number, alongX: boolean, color = WALL): void {
  b.box(cx, (y0 + y1) / 2, cz, alongX ? w : T, y1 - y0, alongX ? T : w, color);
  b.boxes[b.boxes.length - 1]!.overhead = true;
}

/** Everything of section 1: walls, the canopy and plant roof, cars, shelters, the palisade, lamps, the ladder and the doors.
 *  `L` is the light block (`S1_LIGHTS`, `s1Data.ts`): every lamp, column pillar and lamp post is drawn from it. */
export function buildCampusS1(b: LevelBuilder, L: S1Lights): void {
  // ---- (campus-greybox G1, S1-detail C1) the perimeter: an anti-climb steel palisade 2.4 high, 0.1 thick, noLedge, as boxes
  // (no fence anchors in S1): south z -80 (the closed sliding gate leaf x 8..14 and the re-hung cut panel x 23.4..24.6 are
  // their own pieces), east x 26, west x -40, north-east z -34
  const f0 = b.boxes.length;
  b.box(-16, 1.2, -80, 48, 2.4, 0.1, STEEL); // x -40..8
  b.box(11, 1.2, -80, 6, 2.4, 0.1, STEEL); // the sliding gate leaf, closed (a static piece, A1)
  b.box(18.7, 1.2, -80, 9.4, 2.4, 0.1, STEEL); // x 14..23.4
  b.box(24, 1.2, -80, 1.2, 2.4, 0.1, STEEL); // the anglers' cut panel, re-hung behind the crew
  b.box(25.3, 1.2, -80, 1.4, 2.4, 0.1, STEEL); // x 24.6..26
  b.box(26, 1.2, -57, 0.1, 2.4, 46, STEEL); // east, z -80..-34
  b.box(-40, 1.2, -60, 0.1, 2.4, 40, STEEL); // west, z -80..-40
  b.box(15, 1.2, -34, 22, 2.4, 0.1, STEEL); // north-east, x 4..26
  // roof-edge screens 2.4: the gatehouse roof's south edge, the plant roof's west edge (replaces its 1.1 parapet), the
  // pavilion top's two ends
  b.box(16.75, 4.5, -79, 6.5, 2.4, 0.1, STEEL);
  b.box(-40, 5.6, -37, 0.1, 2.4, 6, STEEL);
  b.box(-40, 5.6, -32, 0.1, 2.4, 4, STEEL);
  b.box(3.7, 5.6, -32, 0.1, 2.4, 4, STEEL);
  // (S1 v3) the garden-gate fence: a 2.4 anti-climb fence across the verge and the lane end on z -58 (x 6..26) with a 1.2 gap at
  // x 22.4..23.6 (the gate, below), closing the east side: the way past it is the gate (two players) or the lit lane (solo)
  b.box(14.2, 1.2, -58, 16.4, 2.4, 0.1, STEEL); // x 6..22.4
  b.box(24.8, 1.2, -58, 2.4, 2.4, 0.1, STEEL); // x 23.6..26
  b.box(23, 2.25, -58, 1.2, 0.3, 0.1, STEEL); // the gate head
  b.boxes[b.boxes.length - 1]!.overhead = true;
  // (campus-s1-fence) the anti-climb cap: a collision-only sheet over every perimeter line up to `S1_FENCE_CAP` (not drawn,
  // not baked, no cover, no ledges). The 2.4 palisade alone was a launch line: a leap off the gatehouse roof's open south
  // corners or off the condenser, or a mantle off the yard bins, the bin screen or the plant-roof parapet carried a player
  // over it (`tests/campusV2S1Fence.test.ts`)
  for (const [x0, z0, x1, z1, y0] of S1_FENCE_CAP_LINES) {
    b.box((x0 + x1) / 2, (y0 + S1_FENCE_CAP) / 2, (z0 + z1) / 2, x1 - x0 || 0.1, S1_FENCE_CAP - y0, z1 - z0 || 0.1, STEEL, 0, 0, true, false);
  }
  b.mark(f0, { noLedge: true });
  // (S1 v3) the garden gate: locked, unbreachable, opens south (clear of #15's lane-side walk); the pair gate (`pairGates`) opens it
  b.door(22.4, 0, -58, 1.2, PI / 2, { swing: 1, locked: true, breachable: false });

  // ---- (G2, S1-detail C2) the gatehouse (13.5..20, -79..-72.5, clear 6.2 x 6.2): walls 3.0, roof 3.3, the door north
  // (17, -72.5) opening out, a glazing band (the reception window W, the fixed rear panes E2 and E, a fixed
  // north pane), the roof's east edge the only ledge (the SE wall-jump corner by the condenser), a glazed smoke-vent hatch
  const g0 = b.boxes.length;
  b.wallX(-79, 13.5, 20, [], 3.0, WALL, T);
  b.wallX(-72.5, 13.5, 20, [[16.4, 17.6], [18.6, 19.8]], 3.0, WALL, T);
  b.wallZ(13.5, -79, -72.5, [[-76.6, -75.4]], 3.0, WALL, T);
  b.wallZ(20, -79, -72.5, [[-76.6, -75.4], [-74.4, -73.2]], 3.0, WALL, T);
  head(b, 17, -72.5, 1.2, 2.1, 3.0, true);
  // the four panes: a 0.9 sill, a head 2.1..3.0 (reception W, E2 and the fixed rear pane E, the fixed north pane)
  for (const [x, z, alongX] of [[13.5, -76, false], [20, -76, false], [20, -73.8, false], [19.2, -72.5, true]] as const) {
    b.box(x, 0.45, z, alongX ? 1.2 : T, 0.9, alongX ? T : 1.2, WALL_DARK);
    head(b, x, z, 1.2, 2.1, 3.0, alongX);
  }
  // the roof slab (top 3.3, 0.15 past the walls) round the hatch x 17.8..19.0, z -78.4..-77.2: west, middle south, middle north
  for (const [x, z, w, d] of [[15.575, -75.75, 4.45, 6.8], [18.4, -78.775, 1.2, 0.75], [18.4, -74.775, 1.2, 4.85]] as const) {
    b.box(x, 3.15, z, w, 0.3, d, ROOF);
    b.boxes[b.boxes.length - 1]!.overhead = true;
  }
  b.mark(g0, { noLedge: true });
  // the east strip keeps its east lip (the wall-jump corner); its north end and the hatch rim do not hang
  b.box(19.575, 3.15, -75.75, 1.15, 0.3, 6.8, ROOF);
  b.boxes[b.boxes.length - 1]!.overhead = true;
  b.noLedge(19.575, -72.35, 0.4);
  // (A27-cloud) the south end too: the z -79 screen stands 0.1 inside the slab edge (z -79.15), so it does not cut that lip
  b.noLedge(19.575, -79.15, 0.4);
  b.noLedge(18.4, -77.8, 0.7);
  // the split A/C condenser on its wall bracket off the east wall (y 1.2..2.0): the wall-jump corner's step (a planned climb)
  b.box(20.4, 1.6, -78.4, 0.5, 0.8, 0.9, STEEL);
  b.door(16.4, 0, -72.5, 1.2, PI / 2, { swing: -1 });
  b.windowAt(13.5, 1.5, -76, 1.2, 1.2, PI / 2, { sill: 0.9, open: false, breakable: true });
  // (S1 v3) E2: the rear pane is fixed glass now (Michael: no rear window)
  b.windowAt(20, 1.5, -76, 1.2, 1.2, PI / 2, { sill: 0.9, open: false, breakable: false });
  // the fixed rear pane and the fixed north pane (A2: closed, not breakable)
  b.windowAt(20, 1.5, -73.8, 1.2, 1.2, PI / 2, { sill: 0.9, open: false, breakable: false });
  b.windowAt(19.2, 1.5, -72.5, 1.2, 1.2, 0, { sill: 0.9, open: false, breakable: false });
  // the CCTV desk flush to the north wall (A5), the PC desk by the rear window, the kettle counter. (F42) The PC desk stands
  // on the east wall south of the rear pane E2 (z -78.55..-76.95), clear of the vault landing it had when E2 was open. The
  // kettle counter moved 0.35 m west to make room (x 17.25..18.85); the CCTV officer's kettle stop (18.4, -77.65) still faces it
  // and his route line x 18.3-18.4 keeps its 0.5 m gap to the desk's west face (x 18.9). The CCTV desk and the fixed pane E
  // are untouched.
  b.block(18.8, -73.0, 1.6, 0.75, 0.7, DESK);
  b.block(19.35, -77.75, 0.9, 0.75, 1.6, DESK);
  b.block(18.05, -78.55, 1.6, 0.9, 0.6, STEEL);
  // the ceiling tube and the warm desk lamp on the CCTV desk, both on the gate circuit (switch by the door: lure #1)
  lamp(b, L.gate);
  lamp(b, L.deskLamp);

  // ---- the barrier lane (8..14, -80..-60): rising-arm barrier at z -77 (the arm is down, visual), the island with cam-gate
  b.block(11, -77, 1.0, 1.0, 2.4, KERB);
  b.box(12.75, 1.0, -77, 2.5, 0.08, 0.1, '#d8c24a', 0, 0, false);
  b.pillar(11, -77.9, 0.07, 3.0, STEEL);
  // the lane floodlight on its pole, its arm along x into the lane, the light point at the arm's end (light-realism L1: not
  // on top of its pole) (photocell: no switch, shot only)
  const lf = L.laneFlood;
  const lsx = Math.sign(lf.x - lf.poleX);
  b.pillar(lf.poleX, lf.z, lf.poleR, lf.poleH, STEEL);
  b.box(lf.poleX + (lsx * lf.armLen) / 2, lf.armY, lf.z, lf.armLen, 0.1, 0.1, STEEL);
  lamp(b, lf);

  // ---- the marsh verge (20..26, -80..-56): dark, reeds (visual) and two trees
  b.pillar(22.5, -66, 0.3, 5, '#4a3a2a');
  b.pillar(24.5, -60, 0.3, 5, '#4a3a2a');

  // ---- the staff car park (-40..6, -80..-54): 14 parked cars (roofs 1.5), column lamps 6.0 on two circuits (E5, E6, E11);
  // (G3, C3) the rows 2 m south, the columns (the light block: light-realism L1's twin-head arm columns), the solar carport,
  // the courier's van
  CARS.forEach(([row, bay], k) => b.box(bayX(bay), 0.75, ROW_Z[row]!, 1.8, 1.5, 4.2, CAR_COLOURS[k % CAR_COLOURS.length]!));
  // each column (light-realism L1): the pole (once per twin), each arm along (ax, az) from the pole's axis to armLen out, and
  // its light point hanging at the arm's end, reach out (nothing of its own below it)
  const col = L.column;
  for (const [pts, group] of [[L.columnsW, col.groupW], [L.columnsE, col.groupE]] as const) {
    pts.forEach((h, k) => {
      const [x, z, ax, az] = h;
      if (k === 0 || pts[k - 1]![0] !== x || pts[k - 1]![1] !== z) b.pillar(x, z, col.pillarR, col.pillarH, STEEL);
      b.box(x + (col.armLen / 2) * ax, col.armY, z + (col.armLen / 2) * az, ax ? col.armLen : 0.1, 0.1, az ? col.armLen : 0.1, STEEL);
      lamp(b, columnLamp(col, h, group));
    });
  }
  // the solar PV carport x -24..0, z -63..-54: top 3.0, underside 2.6, a planned solo route (not noLedge); posts every 6 m on
  // z -58.5; its under-canopy downlights mid-span between the posts (A9), on the car park's two circuits
  b.box(-12, 2.8, -58.5, 24, 0.4, 9, ROOF);
  b.boxes[b.boxes.length - 1]!.overhead = true;
  for (const x of [-24, -18, -12, -6, 0]) b.pillar(x, -58.5, 0.15, 2.6, STEEL);
  const cp = L.carport;
  for (const [x, z, group] of cp.pts) lamp(b, { x, y: cp.y, z, r: cp.r, i: cp.i, colour: cp.colour, group, cone: cp.cone, w: cp.w });
  // (S1 v3) the courier's van at R3 bay 3 (bayX(3) = -26.2), z -63.25..-58.25, the objective (a bright yellow-orange landmark): the
  // bonnet 1.1 at the aisle end (A10), the cab 2.0, the box body 2.8 (z -61.45..-58.25, 1.1 m from the carport's west edge). The
  // windscreen, the livery bands, the dark load space and the open rear doors are visual only (collide false)
  b.box(-26.2, 0.55, -62.85, 2.0, 1.1, 0.8, VAN);
  b.box(-26.2, 1.0, -61.95, 2.0, 2.0, 1.0, VAN);
  b.box(-26.2, 1.4, -59.85, 2.2, 2.8, 3.2, VAN);
  b.box(-26.2, 1.5, -62.47, 1.8, 0.6, 0.04, '#1c2228', 0, 0, false);
  for (const x of [-27.32, -25.08]) b.box(x, 1.0, -59.85, 0.04, 0.3, 3.0, '#b8321a', 0, 0, false);
  b.box(-26.2, 1.4, -58.28, 2.0, 2.5, 0.04, '#2a2a2a', 0, 0, false);
  for (const x of [-27.3, -25.1]) b.box(x, 1.4, -57.75, 0.05, 2.5, 1.0, VAN, 0, 0, false);
  b.block(-28.4, -56.4, 1.0, 1.2, 0.8, STEEL); // the courier's cage trolley by the open rear doors (dress skins it)

  // ---- (G4, C4) the service yard (-40..-26, -54..-40, 14 x 14): the bin store's walls are gone; the bins stand behind a 1.5
  // bin screen in the SW corner (open to the south, A12); the feeder pillar's board (E5)
  const y0 = b.boxes.length;
  b.wallX(-49, -40, -35, [], 1.5, WALL_DARK, T);
  b.wallZ(-35, -54, -49, [], 1.5, WALL_DARK, T);
  b.mark(y0, { noLedge: true });
  b.block(-39.25, -53.2, 1.4, 1.2, 1.1, BIN);
  b.block(-39.25, -51.8, 1.4, 1.2, 1.1, BIN);
  b.block(-36.6, -49.8, 1.4, 1.2, 1.1, BIN);
  b.block(-31.4, -46.6, 1.6, 1.5, 0.4, STEEL); // the feeder pillar: its two breakers on the south face (S1_SWITCHES)
  // the cage trolley (cover) and the 1.2 roll cage beside it (A13)
  b.block(-30.5, -46, 1.0, 1.2, 0.8, STEEL);
  b.block(-29.2, -46, 1.0, 1.2, 0.8, STEEL);

  // ---- (G3, C3) the bike shelter x -12..-2, z -54..-50 against the carport: roof 2.4 on four posts, a planned route (A11:
  // not noLedge), its lamp lit on its own circuit (Q2 "Never", A25); the cycle lockers 1.2 north of it
  b.box(-7, 2.3, -52, 10, 0.2, 4, ROOF);
  for (const [x, z] of [[-11.8, -53.8], [-2.2, -53.8], [-11.8, -50.2], [-2.2, -50.2]] as const) b.pillar(x, z, 0.08, 2.2, STEEL);
  lamp(b, L.bikes);
  b.block(-9, -49.5, 6, 1.2, 1, STEEL);

  // ---- the smoking shelter (6..10, -50..-47): roof 2.4, back panel north, panels W and E, open to the car park
  const k0 = b.boxes.length;
  b.box(8, 2.3, -48.5, 4, 0.2, 3, ROOF);
  b.box(8, 1.1, -47.05, 4, 2.2, 0.1, STEEL);
  b.box(6.05, 1.1, -48.5, 0.1, 2.2, 3, STEEL);
  b.box(9.95, 1.1, -49.25, 0.1, 2.2, 4.5, STEEL); // (A68) the east panel runs 1.5 m longer to the south (z -51.5), hiding #6 from the verge
  b.mark(k0, { noLedge: true });
  // (G5, D:133) the shelter's warm lamp on its own circuit (A6); the switch on the west panel's inner face at its open end (A19)
  lamp(b, L.smoke);

  // ---- (G5, C7) the lawn's two trees (verge-tree size) and the forecourt's two grit bins 1.2 (low cover)
  b.pillar(0, -44, 0.3, 5, '#4a3a2a');
  b.pillar(16, -40, 0.3, 5, '#4a3a2a');
  b.block(-24, -48, 0.8, 1.2, 0.8, '#b8902a');
  b.block(-10, -47.5, 0.8, 1.2, 0.8, '#b8902a');

  // ---- the forecourt (-26..6, -46..-34): the drop-off kerb, planters along the facade (E10), bollards on the s1-fore circuit (E11)
  b.box(-20, 0.075, -46.15, 12, 0.15, 0.3, KERB);
  for (const x of [-11, -7, -3]) b.block(x, -35.6, 2.4, 0.7, 0.8, PLANTER);
  const bo = L.bollards;
  for (const x of bo.xs) {
    b.pillar(x, bo.z, bo.postR, bo.postH, STEEL);
    lamp(b, { x, y: bo.y, z: bo.z, r: bo.r, i: bo.i, colour: bo.colour, group: bo.group, cone: null, w: bo.w });
  }

  // ---- the HQ entrance pavilion (z -34..-30, 4.4): solid blocks west and east of C1, the vestibule between them
  const p0 = b.boxes.length;
  // (G4, C5) the west block gives its south metre to the plant room: x -44..-24, z -33..-30, the two pockets the carve would
  // open outside the room filled (A14)
  b.box(-34, 2.2, -31.5, 20, 4.4, 3, WALL_DARK);
  b.box(-42, 2.2, -33.5, 4, 4.4, 1, WALL_DARK);
  b.box(-25, 2.2, -33.5, 2, 4.4, 1, WALL_DARK);
  // (G5, C6) the east block split at x -6: only its east half (x -6..4) keeps a ledge (CR1-east, below)
  b.box(-11, 2.2, -32, 10, 4.4, 4, WALL_DARK);
  // C1 (-24..-16, -34..-30, 3.0): the near door (-20, -34) in its south wall, its roof the pavilion's 4.4 top
  b.wallX(-34, -24, -16, [[C1_GAP[0], C1_GAP[1]]], 3.0, WALL, T);
  head(b, -20, -34, 1.2, 2.1, 3.0, true);
  b.box(-20, 3.7, -32, 8, 1.4, 4, WALL_DARK);
  b.mark(p0, { noLedge: true });
  b.boxes[b.boxes.length - 1]!.overhead = true;
  // (G5) the east block's east half x -6..4: its south face is the CR1-east lip; its east end and north edge do not hang
  b.box(-1, 2.2, -32, 10, 4.4, 4, WALL_DARK);
  b.noLedge(4, -32, 0.5);
  b.noLedge(-1, -30, 0.5);
  b.door(C1_GAP[0], 0, -34, 1.2, PI / 2, { swing: -1, locked: true, breachable: false });
  // the far door (-20, -30) in the S2 south wall (the wall and its head are `campusOps`'s shell, its gap is `C1_GAP`)
  b.door(C1_GAP[0], 0, -30, 1.2, PI / 2, { swing: 1, locked: true, breachable: false });

  // ---- the entrance canopy (-26..-14, -40..-34): a free-standing 4.4 top (soffit 4.2) on four 0.3 columns; nothing under its S / E / W edges (E8)
  const c0 = b.boxes.length;
  // (sector-redesign A65) a hatch x -20.6..-19.4, z -36.4..-35.3 above the doorman's post (-20, -35): the slab is four boxes around the opening
  for (const [x, z, w, d] of [[-23.3, -37, 5.4, 6], [-16.7, -37, 5.4, 6], [-20, -38.2, 1.2, 3.6], [-20, -34.65, 1.2, 1.3]] as const) b.box(x, 4.3, z, w, 0.2, d, '#9aa3a8');
  b.mark(c0, { overhead: true });
  for (const [x, z] of [[-25.5, -39.5], [-14.5, -39.5], [-25.5, -34.6], [-14.5, -34.6]] as const) b.pillar(x, z, 0.15, 4.2, STEEL);
  for (const [x, z] of L.canopy.pts) lamp(b, { ...L.canopy, x, z });

  // ---- (G4, C5) the HQ ground-floor plant room (-40..-26, -40..-33, clear 13.7 x 6.7): walls 4.2, the north wall carved 1 m
  // into the pavilion block; roof 4.4 with a hatch 1.2 x 1.2 at (-30, -36.5) and a fixed ladder up to it; the goods door E12
  // (plain, unlocked: the 03:00 courier); the S parapet 1.1 open at the hoist bay x -31..-27 (CR1-yard)
  const r0 = b.boxes.length;
  b.wallX(-40, -40, -26, [[-33.6, -32.4]], 4.2, WALL_DARK, T);
  head(b, -33, -40, 1.2, 2.1, 4.2, true, WALL_DARK);
  b.wallZ(-40, -40, -33, [], 4.2, WALL_DARK, T);
  b.wallZ(-26, -40, -33, [], 4.2, WALL_DARK, T);
  b.wallX(-33, -40, -26, [], 4.2, WALL_DARK, T);
  // the roof slab (top 4.4, over the carved metre too: A15) round the hatch x -30.6..-29.4, z -37.1..-35.9: north strip,
  // middle west, middle east
  b.box(-33, 4.3, -34.45, 14, 0.2, 2.9, ROOF);
  b.box(-35.3, 4.3, -36.5, 9.4, 0.2, 1.2, ROOF);
  b.box(-27.7, 4.3, -36.5, 3.4, 0.2, 1.2, ROOF);
  b.mark(r0, { noLedge: true });
  // the south strip carries the CR1-yard lip (z -40, x -31..-27): its hatch rim and the caged ladder's gap do not hang
  b.box(-33, 4.3, -38.55, 14, 0.2, 2.9, ROOF);
  b.noLedge(-30, -37.1, 0.7);
  b.noLedge(-38, -40, 0.7);
  // (A28-cloud) and its east edge (x -26, at the strip's centre z -38.55): the canopy slab beside it is 0.2 thick, under the
  // generator's 0.3 hand probe, so it does not cut that lip (this also stops the canopy's flush west edge on the same line)
  b.noLedge(-26, -38.55, 1.3);
  b.door(-33.6, 0, -40, 1.2, PI / 2, { swing: 1 }); // E12: the goods door, unlocked (AS6)
  const q0 = b.boxes.length;
  b.box(-39.3, 4.95, -39.85, 1.4, 1.1, T, WALL_DARK); // S parapet, the ladder gap x -38.6 .. -37.4
  b.box(-34.2, 4.95, -39.85, 6.4, 1.1, T, WALL_DARK); // x -37.4 .. -31, then the hoist bay x -31 .. -27 (its gate open: dress)
  b.box(-26.5, 4.95, -39.85, 1.0, 1.1, T, WALL_DARK); // x -27 .. -26
  // (G1) the W parapet is the 2.4 roof screen (perimeter, above)
  b.mark(q0, { noLedge: true });
  // the caged ladder from the service yard (-38, -41) to the plant roof (E9)
  b.ladder(-38, -40.4, 0, 4.4, 0);
  for (const y of [2.2, 3.1, 4.0]) b.box(-38, y, -40.4, 0.9, 0.04, 0.04, STEEL, 0, 0, false);
  // the fixed ladder to the roof hatch, 0.25 m off its north rim, landing on the north strip (0.6 m clear in front)
  b.ladder(-30, -36.15, 0, 4.4, 0);
  // two compressor skids on the north wall (A16); the circuit chart inside the goods door (no collision; the lead for sync
  // node A, sync-s1-yard-board)
  b.block(-36, -33.75, 2.0, 1.0, 1.0, STEEL);
  b.block(-32, -33.75, 2.0, 1.0, 1.0, STEEL);
  b.box(-31.8, 1.5, -39.83, 0.6, 0.4, 0.02, '#d8d8d8', 0, 0, false);

  // ---- the dock lamp over the goods door on the s1-fore circuit
  lamp(b, L.dock);

  // ---- (S1 v3) the garden gate's lamp on the gatehouse circuit, 0.45 m south of the fence line (outside the cap: shootable from the verge)
  b.box(23, 2.85, -58.25, 0.06, 0.06, 0.4, STEEL, 0, 0, false);
  lamp(b, L.gateLamp);

  // ---- ambient (SPEC lighting rules, LR7): the whole section at the standby fill 0.14 (true dark with a circuit cut, the
  // verge, bin lane, bike shelter and the roofs by reason); C1 is a transit space at 0.30
  b.ambientZone(-40, 26, -80, -34, 0.14, -1, 8);
  // (G4) the plant room's carved metre as dark as the rest
  b.ambientZone(-40, -26, -34, -33, 0.14, -1, 8);
  b.ambientZone(C1_BOX[0], C1_BOX[2], C1_BOX[1], C1_BOX[3], 0.3, -1, 3.2);
}
