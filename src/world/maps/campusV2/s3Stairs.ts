// (campus-greybox S3 R3) The v2 lab block's three fire stairs (sub-lane r3, slice R3; brief `docs/campus-greybox/briefs/S3.md`
// section 4 "R3"): the west, north and east cores - walls, doors, the two flights of 27 risers, the half and L1 landings,
// the spine wall, the rails over the first flight's well, the part-6 nav lips, the north core's lid and the cores' ambient.
import type { LevelBuilder } from '../../levelBuilder';
import type { RoomDef } from '../../rooms';
import {
  PI,
  ROOF_TOP,
  S3_BOX,
  S3_DOOR_SWING,
  S3_DOORS,
  S3_L1,
  S3_ROOF,
  STEEL,
  T,
  WALL,
  bx,
  doorAt,
  doorHole,
  rail,
  slab,
  wall,
} from './s3Kit';
import type { Hole, S3Box, S3DoorId } from './s3Kit';

/** A stair flight (`LevelBuilder.stairs` arguments): the tests' nav reads the ramps from here (as built `campusS3.ts`). */
export interface S3Flight {
  x: number;
  z: number;
  w: number;
  len: number;
  rise: number;
  yaw: number;
  y: number;
  /** Risers of the flight (13 up to the half landing, 14 from it to L1; 27 in all, GR:236). */
  steps: number;
}

/** Flight width (D:48, D:50, D:53; above SS 3's 1.3). */
export const S3_STAIR_W = 1.4;
/** Landing depth at both ends of a core (derived: the core's clear 6.2 less the 3.4 run leaves 2.8 for two landings). */
export const S3_STAIR_LANDING = 1.4;
/** Run of both flights between the landings (derived: 6.2 - 2 x 1.4; P1: the plan's 0.28 going does not fit). */
export const S3_STAIR_RUN = 3.4;
/** Risers in all (GR:236) and in each flight. */
export const S3_STAIR_RISERS = 27;
export const S3_STAIR_STEPS1 = 13;
export const S3_STAIR_STEPS2 = 14;
/** Rise of flight 1 (G to the half landing) and flight 2 (half landing to L1): 13 and 14 risers of 4.5 / 27. */
export const S3_STAIR_RISE1 = (S3_L1 * S3_STAIR_STEPS1) / S3_STAIR_RISERS;
export const S3_STAIR_RISE2 = (S3_L1 * S3_STAIR_STEPS2) / S3_STAIR_RISERS;
/** Top of every half landing (flight 1's rise). */
export const S3_HALF_TOP = S3_STAIR_RISE1;
/** The north core's lid: deck top 7.5 under the void, 0.1 thick (P11, P19). */
export const S3_NCORE_LID_TOP = 7.5;
/** The cores' ambient (as built S3:481-482: transit lighting). */
export const S3_STAIR_AMBIENT = 0.3;
/** The wall of the spine between the two flights: height (as built S3:365) and width (3.2 - 2 x 1.4). */
export const S3_SPINE_TOP = 5.4;
export const S3_SPINE_W = 0.4;
/**
 * An invisible nav lip at a flight's top (part-6 fix, as built S3:351-356): 0.2 high, 0.15 deep (the brief's 0.2 x 0.2 less
 * 0.05: on the runtime grid the cell centres fall 0.2 and 0.7 from every flight end, so a 0.2 lip ends exactly on a cell
 * centre and would lift that cell 0.14 over the ramp, a 0.48 step to the next cell, over the nav's 0.45; 0.15 keeps the
 * lip over any cell within 0.15 of the end, the case the part-6 fix was for).
 */
export const S3_LIP = 0.2;
export const S3_LIP_DEPTH = 0.15;
/** Rail over the first flight's well at the L1 landing's edge (LD 16.2.4; as built S3:366). */
export const S3_RAIL_H = 1.1;

/** One core of the stairs: its plan box (wall centre lines), where it stands and what it is built of. */
export interface S3Core {
  id: 'w' | 'n' | 'e';
  /** HUD room id of the core. */
  room: string;
  box: S3Box;
  /** The wall height (9.0 to the roof; the north core 7.5, its lid, P11). */
  top: number;
  /** The centre line of the north wall (the shell's inner face -0.15 for the north and east cores: no slot behind them). */
  northWallZ: number;
  /** Flight 1 (G to the half landing) climbs on the east half (the west core) or the west half (north, east). */
  flight1East: boolean;
  /** The stair doors (S3_DOORS ids) of this core. */
  doors: readonly S3DoorId[];
}

export const S3_CORES: readonly S3Core[] = [
  { id: 'w', room: 's3-wstair', box: S3_BOX.wCore, top: S3_ROOF, northWallZ: S3_BOX.wCore[3], flight1East: true, doors: ['wStairG', 'wStairL1'] },
  { id: 'n', room: 's3-nstair', box: S3_BOX.nCore, top: S3_NCORE_LID_TOP, northWallZ: -T / 2, flight1East: false, doors: ['nStairW', 'nStairE', 'nStairL1'] },
  { id: 'e', room: 's3-estair', box: S3_BOX.eCore, top: S3_ROOF, northWallZ: -T / 2, flight1East: false, doors: ['eStairG', 'eStairL1', 'staff'] },
];

/** The landings and flights of one core, from its box (the brief's R3 table is this arithmetic). */
export interface S3CoreGeometry {
  core: S3Core;
  /** The clear interior [x0, z0, x1, z1] (box less half a wall). */
  clear: S3Box;
  flight1: S3Flight;
  flight2: S3Flight;
  /** The L1 landing (top 4.5), at the south end, and the half landing (top 2.1667), at the north end. */
  l1Landing: S3Box;
  halfLanding: S3Box;
  /** The spine wall between the flights [x0, z0, x1, z1]. */
  spine: S3Box;
  /** The rail over flight 1's well: x range at the L1 landing's north edge z. */
  railX: readonly [number, number];
  railZ: number;
}

function geometry(core: S3Core): S3CoreGeometry {
  const [bx0, bz0, bx1] = core.box;
  const ix0 = bx0 + T / 2;
  const ix1 = bx1 - T / 2;
  const iz0 = bz0 + T / 2;
  const iz1 = core.northWallZ - T / 2;
  const landingN = iz0 + S3_STAIR_LANDING;
  const runN = landingN + S3_STAIR_RUN;
  const zc = landingN + S3_STAIR_RUN / 2;
  const westX = ix0 + S3_STAIR_W / 2;
  const eastX = ix1 - S3_STAIR_W / 2;
  const x1 = core.flight1East ? eastX : westX;
  const x2 = core.flight1East ? westX : eastX;
  const flight1: S3Flight = { x: x1, z: zc, w: S3_STAIR_W, len: S3_STAIR_RUN, rise: S3_STAIR_RISE1, yaw: 0, y: 0, steps: S3_STAIR_STEPS1 };
  const flight2: S3Flight = { x: x2, z: zc, w: S3_STAIR_W, len: S3_STAIR_RUN, rise: S3_STAIR_RISE2, yaw: PI, y: S3_STAIR_RISE1, steps: S3_STAIR_STEPS2 };
  const sx0 = Math.min(x1, x2) + S3_STAIR_W / 2;
  const sx1 = Math.max(x1, x2) - S3_STAIR_W / 2;
  return {
    core,
    clear: [ix0, iz0, ix1, iz1],
    flight1,
    flight2,
    l1Landing: [ix0, iz0, ix1, landingN],
    halfLanding: [ix0, runN, ix1, iz1],
    spine: [sx0, landingN, sx1, runN],
    railX: [x1 - S3_STAIR_W / 2, x1 + S3_STAIR_W / 2],
    railZ: landingN,
  };
}

/** The three cores' geometry (west, north, east). */
export const S3_CORE_GEOMETRY: readonly S3CoreGeometry[] = S3_CORES.map(geometry);

/** The flights of the three cores: west 1 and 2, north 1 and 2, east 1 and 2. */
export const S3_FLIGHTS: readonly S3Flight[] = S3_CORE_GEOMETRY.flatMap((g) => [g.flight1, g.flight2]);

/**
 * The cores' HUD rooms (no squads). They overlap the hall, dock and control rooms of the G build: `roomAt` takes the
 * smallest room, so a point in a core reads its stair room (the control room box stays as R1 built it). The north and east
 * cores run to the shell's inner face (z -0.15), as their walls do.
 */
export const S3_ROOMS_STAIRS: RoomDef[] = [
  { id: 's3-wstair', name: 'West Fire Stair', minX: S3_BOX.wCore[0], maxX: S3_BOX.wCore[2], minZ: S3_BOX.wCore[1], maxZ: S3_BOX.wCore[3] },
  { id: 's3-nstair', name: 'North Fire Stair', minX: S3_BOX.nCore[0], maxX: S3_BOX.nCore[2], minZ: S3_BOX.nCore[1], maxZ: -T / 2 },
  { id: 's3-estair', name: 'East Fire Stair', minX: S3_BOX.eCore[0], maxX: S3_BOX.eCore[2], minZ: S3_BOX.eCore[1], maxZ: -T / 2 },
].map((r) => ({ ...r, squad: [] }));

/** A door's opening on its wall: hinge at the centre less 0.6 along the wall. */
function hingeAt(id: S3DoorId, alongX: boolean): number {
  const [x, z] = S3_DOORS[id];
  return (alongX ? x : z) - 0.6;
}

/** A door of the core: its opening in the wall and its anchor (hinge, floor, swing from the kit). */
function stairDoor(b: LevelBuilder, id: S3DoorId, alongX: boolean, at: number, holes: Hole[]): void {
  const y = S3_DOORS[id][2];
  const a = hingeAt(id, alongX);
  const swing = S3_DOOR_SWING[id];
  if (swing === 0) throw new Error(`s3Stairs: door ${id} has no leaf`);
  holes.push(doorHole(a, y));
  doorAt(b, alongX, at, a, y, swing);
}

/** The invisible lip over a flight's last 0.15 at its top (part-6 nav fix, S3:351-356): overhead, noLedge. */
function topLip(b: LevelBuilder, f: S3Flight): void {
  const d = f.len / 2 - S3_LIP_DEPTH / 2;
  b.box(f.x + Math.sin(f.yaw) * d, f.y + f.rise - S3_LIP / 2, f.z + Math.cos(f.yaw) * d, f.w, S3_LIP, S3_LIP_DEPTH, STEEL, 0, 0, true, false);
  const p = b.boxes[b.boxes.length - 1]!;
  p.overhead = true;
  p.noLedge = true;
}

/** One core: the wall ring with its doors, the landings, the flights, the spine, the rail, the lips, the lid and the ambient. */
function buildCore(b: LevelBuilder, g: S3CoreGeometry): void {
  const { core } = g;
  const [x0, z0, x1] = core.box;
  const zn = core.northWallZ;
  const [ix0, , ix1] = g.clear;
  const west: Hole[] = [];
  const east: Hole[] = [];
  const south: Hole[] = [];
  if (core.id === 'w') {
    stairDoor(b, 'wStairG', false, x0, west);
    stairDoor(b, 'wStairL1', false, x0, west);
  } else if (core.id === 'n') {
    stairDoor(b, 'nStairW', false, x0, west);
    stairDoor(b, 'nStairE', false, x1, east);
    stairDoor(b, 'nStairL1', true, z0, south);
  } else {
    stairDoor(b, 'staff', false, x0, west);
    stairDoor(b, 'eStairG', true, z0, south);
    stairDoor(b, 'eStairL1', true, z0, south);
  }
  // walls to the core's top (enclosed, LD 16.2.4): the x walls run the full length, the z walls fit between them
  const za = z0 - T / 2;
  const zb = zn + T / 2;
  wall(b, false, x0, za, zb, 0, core.top, west, WALL);
  wall(b, false, x1, za, zb, 0, core.top, east, WALL);
  wall(b, true, z0, ix0, ix1, 0, core.top, south, WALL);
  wall(b, true, zn, ix0, ix1, 0, core.top, [], WALL);

  // the landings: L1 at the south end, the half landing (top 2.1667) at the north end, wall to wall
  const [lx0, lz0, lx1, lz1] = g.l1Landing;
  slab(b, lx0, lx1, lz0, lz1, S3_L1, STEEL);
  const [hx0, hz0, hx1, hz1] = g.halfLanding;
  slab(b, hx0, hx1, hz0, hz1, S3_HALF_TOP, STEEL);

  // the two flights (13 + 14 risers) and the spine wall between them, noLedge
  for (const f of [g.flight1, g.flight2]) {
    b.stairs(f.x, f.z, f.w, f.len, f.rise, f.steps, STEEL, f.yaw, f.y);
    topLip(b, f);
  }
  const [sx0, sz0, sx1, sz1] = g.spine;
  bx(b, sx0, sx1, 0, S3_SPINE_TOP, sz0, sz1, STEEL, { noLedge: true });

  // the rail on the L1 landing's edge over flight 1's well (the flight 2 side is the stair itself, the spine closes between)
  rail(b, g.railX[0], g.railX[1], g.railZ - 0.05, g.railZ + 0.05, S3_L1);

  // the north core's lid under the void (P11): the deck of the void over the core, wall line to wall line
  if (core.id === 'n') bx(b, x0, x1, S3_NCORE_LID_TOP - 0.1, S3_NCORE_LID_TOP, z0, zn + T / 2, WALL, { overhead: true, noLedge: true });

  // ambient 0.30 in the core (transit; as built S3:481-482); the north core's stops at its lid (the void above is the block's)
  b.ambientZone(x0, x1, z0, zn + T / 2, S3_STAIR_AMBIENT, -1, core.id === 'n' ? S3_NCORE_LID_TOP : ROOF_TOP);
}

/** The three cores: flights, stair doors, landings, rails and the cores' ambient zones. */
export function buildS3Stairs(b: LevelBuilder): void {
  for (const g of S3_CORE_GEOMETRY) buildCore(b, g);
}
