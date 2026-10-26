// (campus-greybox, v2 lane S2) Copied from `campusS2.ts` at P0; the S2 lane's greybox. Built only when `flags.campusV2` names 2.
import { Vector3 } from '../../../core/babylon';
import type { LevelBuilder } from '../../levelBuilder';
import type { RoomDef } from '../../rooms';
import type { MapLayout } from '../../mapDef';
import type { BoardDef } from '../../../game/isolators';
import { makeCone } from '../../lights';
import { C1_GAP, type CoopLip } from '../campusS1';
import { hyp2 } from '../../../core/mathx';
import { buildEdgeCaps, type EdgeCap } from './edgeCaps';

/**
 * Saltmarsh Park (`campusOps`) section 2 - the HQ atrium and offices (`docs/sector-redesign/SPEC.md` "S2", slice 2). A
 * greybox: boxes, fence panels, lamps, switches, hide spots; no dressing. Frame: x west to east, z south to north, y up,
 * metres; yaw 0 = +z, PI / 2 = +x. Footprint x -44..4, z -30..6: G (floor 0, slab underside 4.2), L1 (slab top 4.4), L2
 * (slab top 8.4), roof (top 12.3); the atrium void x -26..-10, z -20..-4 runs to a roof light at 13.2 (look-down only: a solid
 * rim, no lid that stands). Two enclosed fire stairs (SW, NE) with landings at every floor and roof bulkheads; the
 * feature stair stands in the atrium. Every wall is a plain (unturned) box so the reach and sight checks read it.
 *
 * Plan (G): post room SW (x -44..-30, z -30..-20, the SW fire stair inside), mail / goods room (z -20..-12), lift lobby
 * (z -12..-4), NW store; the foyer (x -30..-8, z -30..-23, the C1 far door, the reception desk) with a turnstile barrier at z
 * -23 into the hall (the atrium floor and the dark cafe); the east plant room. L1: the SW lobby and the west and north open
 * plan (meeting rooms with glass fronts), the S band (print room, kitchen, meeting room), and the east wing behind a wall at
 * x -7.5 (SE meeting room, the bridge landing, the comms room, the facilities office and the NE fire stair). L2: the same
 * skeleton with the executive suite NW, offices S, the board room NE. Roof: plant room, bulkheads, the roof light rim.
 */

const PI = Math.PI;
const T = 0.3;
const P = 0.2;
const WALL = '#b7b2a6';
const WALL_DARK = '#7d786d';
const STEEL = '#55606a';
const SLAB = '#7f8588';
const ROOF = '#4a4f55';
const DESK = '#8a6a4c';
const STAIR = '#8d9296';
const GLASS = '#9fb8c4';
const WHITE: [number, number, number] = [1, 0.95, 0.88];
const COOL: [number, number, number] = [0.85, 0.92, 1];
const DOOR_H = 2.1;

/** The floors' walking heights: G, L1, L2, roof. */
export const S2_FLOORS = [0, 4.4, 8.4, 12.3] as const;
/** The atrium void (x0, x1, z0, z1): open from the G floor to the roof light at 13.2. (S2-G2, C2, `S2-detail.md:74`) 14.5 x
 *  14.5, so the L1 / L2 south and east strips are 3.9 m clear (were 2.45). */
export const S2_VOID = { x0: -26, x1: -11.5, z0: -18.5, z1: -4 } as const;
/** (S2-G3, C12, BA7) The facilities window in the north wall at L1: centre x, width, sill and height (the S1 gatehouse window's size). */
export const FAC_WINDOW = { x: -4, w: 1.2, sill: 5.3, h: 1.2 } as const;
/** (S2-G4, C14) The roof plant room (x -20.5..-12, z 0..6, walls 4.0 high: plant_room class). */
export const ROOF_PLANT = { x0: -20.5, x1: -12, z0: 0, z1: 6, h: 4.0 } as const;
/** (S2-G4, C14, BA9) The plant room's floor hatch in the roof slab (x0, x1, z0, z1) and its cat ladder (x, z; L2 8.4 -> roof 12.3, facing 0). */
export const ROOF_HATCH = { x0: -18.5, x1: -17.5, z0: 2.5, z1: 3.5, ladder: [-18, 3] as const } as const;
/** (S2-G4, C12) The window-cleaning davit: the rappel point (x, z on the roof's north edge) and the rope (7.9 m to the sunshade at 4.4). */
export const DAVIT = { x: -4, z: 5.8, length: 7.9 } as const;
/** The building's footprint. */
export const S2_FOOT = { x0: -44, x1: 4, z0: -30, z1: 6 } as const;
/**
 * (campus-fence-s2s5) The anti-climb caps (`buildEdgeCaps`): the roof's 1.1 parapet (top 13.4) was a mantle over the
 * edge and a 12 m drop out of the campus on every side, and the sunshade (4.4, reached by the davit's rope or through the
 * facilities window) was a walk-off onto the ground north of the HQ. A sheet on each parapet up to 15.5 (over the roof's
 * mantle, 12.3 + 1.8); the sunshade gets a catch out to z 8.0 (a rope kicked out 1.2 m and let go over it lands on it)
 * and a sheet round both up to 8.0. The davit's rope (kinematic) and the window are untouched.
 */
export const S2_EDGE_CAPS: readonly EdgeCap[] = [
  [-44, -29.9, 4, -29.9, 13.4, 15.5],
  [-43.9, -30, -43.9, 6, 13.4, 15.5],
  [3.9, -30, 3.9, 6, 13.4, 15.5],
  // the north parapet either side of the roof plant room (its 4.0 north wall stands on the line)
  [-44, 5.9, ROOF_PLANT.x0, 5.9, 13.4, 15.5],
  [ROOF_PLANT.x1, 5.9, 4, 5.9, 13.4, 15.5],
  // the sunshade (x -7..-1, z 6..7.2): the catch (flush, 4.2..4.4) and the sheet round it
  [-7, 7.2, -1, 8.0, 4.2, 4.4],
  [-7.05, 8.05, -0.95, 8.05, 4.4, 8.0],
  [-7.05, 6.15, -7.05, 8.05, 4.4, 8.0],
  [-0.95, 6.15, -0.95, 8.05, 4.4, 8.0],
];

/** The lamp circuits (switch groups) of section 2 (the SPEC's `s2-atrium` ... are ids; the registry's groups are numbers). */
/** (S2-G5a, BA5) `landing` 53: the K2 landing downlight's own switched circuit. */
export const S2_GROUPS = { atrium: 50, l1Bal: 51, l2Bal: 52, landing: 53, kitchen: 54, facilities: 55, l1Cor: 56, l2Cor: 57, gCor: 58 } as const;

/**
 * (S2-G5c, Q2 "Never", briefs/S2.md 5c) One switched circuit per room that held no lit fitting (the rule's step 3): numbered from 100 in
 * `S2_ROOMS` order (S2's range is 100-139, job PLAN section 2). Every room not listed already holds a lit as-built fitting (the
 * balcony strips by 51 / 52, the facilities office, the wing, the landing, the kitchen, the L2 gallery, the foyer, the mail room) or is
 * the open roof (exterior: no fitting hangs there).
 */
export const S2_ROOM_GROUPS: Readonly<Record<string, number>> = {
  post: 100, lift: 101, store: 102, hallne: 103, plant: 104,
  l1sw: 105, l1project: 106, l1ne: 107, l1wingn: 108, l1wings: 109, l1comms: 110, l1semeet: 111, 's2-l1-mr1': 112, 's2-l1-mr2': 113, 's2-l1-mr3': 114,
  l2wing: 115, 's2-l2-exec': 116, 's2-l2-offa': 117, 's2-l2-offb': 118, 's2-l2-board': 119, 's2-roof-plant': 120,
};
/** (S2-G5c step 4) The fire stairs' riser circuits: the next free numbers after the rooms'. */
export const S2_CORE_GROUPS: Readonly<Record<string, number>> = { sw: 121, ne: 122 };

/** The doors the sector data finds by centre (`Doors.nearest`): [x, z]. */
export const S2_DOORS = {
  /** C2 (the glazed bridge on L1): the near door (the card door in the east wall) and the far door (into the labs). */
  c2Near: [4, -14] as [number, number],
  c2Far: [10, -14] as [number, number],
} as const;

/** C2's box (the bridge, x 4..10, z -16..-12) and its floor. */
export const C2_BOX = [4, -16, 10, -12] as const;
export const C2_FLOOR = 4.4;

/** A rectangle in plan: x0, x1, z0, z1. */
export type Rect = [number, number, number, number];

/** One stair flight as `LevelBuilder.stairs` takes it (centre, width, length, rise, yaw, base height). */
export interface Flight {
  cx: number;
  cz: number;
  w: number;
  len: number;
  rise: number;
  yaw: number;
  y0: number;
  steps: number;
}

/** A fire stair core: the clear interior (x0..x1, z0..z1), the end that holds the floor landings, and the door. */
export interface Core {
  id: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** The floor landings are at this end (the far end has the half landings). */
  near: 'N' | 'S';
  /** The door: in the east wall at z = c, or in the south wall at x = c. */
  door: { wall: 'E' | 'S'; c: number };
}

export const SW_CORE: Core = { id: 'sw', x0: -42, x1: -39.4, z0: -28, z1: -22.4, near: 'N', door: { wall: 'E', c: -23 } };
export const NE_CORE: Core = { id: 'ne', x0: 0, x1: 2.6, z0: 0, z1: 5.6, near: 'S', door: { wall: 'S', c: 1.5 } };
export const S2_CORES: readonly Core[] = [SW_CORE, NE_CORE];
/** The roof bulkheads' top. */
export const BULKHEAD_TOP = 14.9;
/** The near landing's depth along the core and the far (half) landing's. */
/** (S2-G3, C15, Q3 default) 1.2 -> 1.3: each core door sits fully on a 1.3 m flat landing (SS:43, SS:62).
 *  (S2-G6b, A-G6b-2) 1.3 -> 1.4 and the half landing 0.8 -> 0.9: at 1.3 / 0.8 a flight's upper end fell within 0.08 m of a 0.5 m nav
 *  cell centre (the SW near end, the NE far end), where the down-cast hits the pitched ramp's end cap (normal y 0.5) and the cell is
 *  not walkable: no path from L1 to L2 in either core on the runtime nav grid. At 1.4 / 0.9 no cell centre is that close. The door
 *  still sits fully on the landing (1.4 >= 1.3); the flights go 3.3 long (going 0.275 / 0.30, 2R + G 0.64-0.66, inside NCC). */
export const NEAR_D = 1.4;
export const FAR_D = 0.9;

/** A core with its walls: the footprint a slab leaves open. */
export const coreFoot = (c: Core): Rect => [c.x0 - 0.2, c.x1 + 0.2, c.z0 - 0.2, c.z1 + 0.2];

/** The six flights of a core (west half: up from the near end; east half: back to it) and the near landing / half landing boxes. */
export function coreFlights(c: Core): Flight[] {
  const dir = c.near === 'N' ? -1 : 1;
  const nearZ = c.near === 'N' ? c.z1 : c.z0;
  const len = c.z1 - c.z0 - NEAR_D - FAR_D;
  const zc = nearZ + dir * (NEAR_D + len / 2);
  const xm = (c.x0 + c.x1) / 2;
  const w = (c.x1 - c.x0) / 2;
  const out: Flight[] = [];
  for (let s = 0; s < 3; s++) {
    const f = S2_FLOORS[s]!;
    const half = (S2_FLOORS[s + 1]! - f) / 2;
    const steps = Math.round(half / 0.18);
    out.push({ cx: (c.x0 + xm) / 2, cz: zc, w, len, rise: half, yaw: dir > 0 ? 0 : PI, y0: f, steps });
    out.push({ cx: (xm + c.x1) / 2, cz: zc, w, len, rise: half, yaw: dir > 0 ? PI : 0, y0: f + half, steps });
  }
  return out;
}

/**
 * (campus-greybox S2-G1, C3, `S2-detail.md:64`) The feature stair in the atrium: two flights of 13 risers (0.169 x 0.283,
 * 2R + G 0.62) with a 2.0 m mid landing, 2.4 wide (x -19.2..-16.8). Flight A climbs south from the G floor at z -9.7 to the
 * landing (z -13.1..-15.1, top 2.2); flight B from the landing to the L1 south strip at z -18.5.
 */
export const FEATURE_FLIGHTS: readonly Flight[] = [
  { cx: -18, cz: -11.4, w: 2.4, len: 3.4, rise: 2.2, yaw: PI, y0: 0, steps: 13 },
  { cx: -18, cz: -16.8, w: 2.4, len: 3.4, rise: 2.2, yaw: PI, y0: 2.2, steps: 13 },
];
/** The feature stair's mid landing: x -19.2..-16.8, z -15.1..-13.1 (x0, x1, z0, z1), its top and thickness. */
export const FEATURE_LANDING = { x0: -19.2, x1: -16.8, z0: -15.1, z1: -13.1, top: 2.2, th: 0.2 } as const;
/** The feature stair's rails (1.1 high, 0.1 thick) on both sides: their centre lines. */
export const FEATURE_RAIL_X = [-19.25, -16.75] as const;
export const FEATURE_RAIL_H = 1.1;

/** Every flight of the section (the cores' and the feature stair's): the test's nav raster reads the ramps from here. */
export const S2_FLIGHTS: readonly Flight[] = [...coreFlights(SW_CORE), ...coreFlights(NE_CORE), ...FEATURE_FLIGHTS];

/**
 * (campus-greybox S2-G1, C16, `S2-detail.md:67`, BA8) The old mail lift (out of service): the clear shaft x -34..-32.8,
 * z -19.5..-18 (also the L1 slab's hole), walled on the N, E and S faces from G to 4.4 (the W face is the G opening behind
 * the cages), a service ladder inside the east face facing PI / 2, and a 1.1 rail round the hole at L1.
 */
export const MAIL_SHAFT = { x0: -34, x1: -32.8, z0: -19.5, z1: -18 } as const;

/**
 * (SPEC "Campus-wide rules", CR2) The L1 slab nose over the dark cafe, 4.4 over the G floor (a leg-up and a human ladder).
 * (S2-G2, C4, `S2-detail.md:75`) Re-cut with the void: x -11.5, z -11..-5 (a 6 m gap in the east balustrade), the planter
 * removed; the top is the 3.9 m east strip behind the gap (x -11.5..-7.5), flat. Solo bypass: the SW fire stair.
 */
export const CR2: CoopLip = {
  id: 'CR2',
  section: 1,
  lip: { x: -11.5, z0: -11, z1: -5, y: 4.4, n: { x: -1, z: 0 } },
  top: { x0: -11.5, x1: -7.5, z0: -11, z1: -5, top: 4.4 },
  boost: { floor: 0, x: -12.1, z: -8 },
  solo: 'the SW fire stair (post room, stairs, the L1 open plan)',
};
export const S2_COOP_LIPS: readonly CoopLip[] = [CR2];

/** Section 2's rooms (HUD tags; no squads: the mode spawns the guards from the sector data). Plan boxes per floor; none overlap. */
export const S2_ROOMS: RoomDef[] = [
  { id: 'post', name: 'Post Room', minX: -44, maxX: -30, minZ: -30, maxZ: -20, maxY: 4.4 },
  { id: 'mail', name: 'Mail and Goods', minX: -44, maxX: -30, minZ: -20, maxZ: -12, maxY: 4.4 },
  { id: 'lift', name: 'Lift Lobby', minX: -44, maxX: -30, minZ: -12, maxZ: -4, maxY: 4.4 },
  { id: 'store', name: 'North-west Store', minX: -44, maxX: -30, minZ: -4, maxZ: 6, maxY: 4.4 },
  // (S2-G1, C1, BA1) one lobby: the reception and the atrium hall are one room
  { id: 'foyer', name: 'Reception and Atrium', minX: -30, maxX: -8, minZ: -30, maxZ: 6, maxY: 4.4 },
  { id: 'hallne', name: 'North-east Lobby', minX: -8, maxX: 4, minZ: -4, maxZ: 6, maxY: 4.4 },
  { id: 'plant', name: 'East Plant Room', minX: -8, maxX: 4, minZ: -30, maxZ: -4, maxY: 4.4 },
  // (S2-G3, C17, BA2) the L1 rooms re-cut to the new boxes (closes F3: every L1 floor cell in a room)
  { id: 'l1sw', name: 'L1 Open Plan West', minX: -44, maxX: -30, minZ: -30, maxZ: 6, minY: 4.4, maxY: 8.4 },
  { id: 'l1kitchen', name: 'Breakout Kitchen', minX: -30, maxX: -21, minZ: -30, maxZ: -22.5, minY: 4.4, maxY: 8.4 },
  { id: 'l1project', name: 'Project Room', minX: -21, maxX: -7.5, minZ: -30, maxZ: -22.5, minY: 4.4, maxY: 8.4 },
  { id: 'l1west', name: 'L1 West Balcony', minX: -30, maxX: -26, minZ: -22.5, maxZ: -4, minY: 4.4, maxY: 8.4 },
  { id: 'l1south', name: 'L1 South Balcony', minX: -26, maxX: -7.5, minZ: -22.5, maxZ: -18.5, minY: 4.4, maxY: 8.4 },
  { id: 'l1east', name: 'L1 East Balcony', minX: -11.5, maxX: -7.5, minZ: -18.5, maxZ: -4, minY: 4.4, maxY: 8.4 },
  { id: 'l1north', name: 'L1 Open Plan North', minX: -30, maxX: -7.5, minZ: -4, maxZ: 6, minY: 4.4, maxY: 8.4 },
  { id: 'l1fac', name: 'Facilities Office', minX: -7.5, maxX: -0.2, minZ: -1, maxZ: 6, minY: 4.4, maxY: 8.4 },
  { id: 'l1ne', name: 'L1 North-east Stair Lobby', minX: -0.2, maxX: 4, minZ: -1, maxZ: 6, minY: 4.4, maxY: 8.4 },
  { id: 'l1wing', name: 'East Wing', minX: -7.5, maxX: -2.5, minZ: -23, maxZ: -1, minY: 4.4, maxY: 8.4 },
  { id: 'l1wingn', name: 'East Wing North', minX: -2.5, maxX: 4, minZ: -4.5, maxZ: -1, minY: 4.4, maxY: 8.4 },
  { id: 'l1wings', name: 'East Wing South', minX: -2.5, maxX: 4, minZ: -23, maxZ: -17.5, minY: 4.4, maxY: 8.4 },
  { id: 'l1comms', name: 'Comms Room', minX: -2.5, maxX: 4, minZ: -10.5, maxZ: -4.5, minY: 4.4, maxY: 8.4 },
  { id: 'l1landing', name: 'Bridge Landing', minX: -2.5, maxX: 4, minZ: -17.5, maxZ: -10.5, minY: 4.4, maxY: 8.4 },
  { id: 'l1semeet', name: 'South-east Meeting Room', minX: -7.5, maxX: 4, minZ: -30, maxZ: -23, minY: 4.4, maxY: 8.4 },
  // (S2-G5c-0, A-J17-S2-1) every enclosed L1 meeting room is its own room (G329 "no lit place left unlit"; guard-ai `lightsOut`
  // reads "a fixture in the room he stands in"). Boxes from the PG areas. They nest in l1sw / l1north: `roomAt` takes the
  // smallest box, so a point in a meeting room is the meeting room's and the open plan keeps the rest
  { id: 's2-l1-mr1', name: 'Meeting Room 1', minX: -44, maxX: -35.5, minZ: -20, maxZ: -14, minY: 4.4, maxY: 8.4 },
  { id: 's2-l1-mr2', name: 'Meeting Room 2', minX: -44, maxX: -34, minZ: 0, maxZ: 6, minY: 4.4, maxY: 8.4 },
  { id: 's2-l1-mr3', name: 'Meeting Room 3', minX: -26, maxX: -16, minZ: 0, maxZ: 6, minY: 4.4, maxY: 8.4 },
  { id: 'l2sw', name: 'L2 West Gallery', minX: -44, maxX: -26, minZ: -30, maxZ: 6, minY: 8.4, maxY: 12.3 },
  { id: 'l2north', name: 'L2 Offices', minX: -26, maxX: -7.5, minZ: -30, maxZ: 6, minY: 8.4, maxY: 12.3 },
  { id: 'l2wing', name: 'L2 East Wing', minX: -7.5, maxX: 4, minZ: -30, maxZ: 6, minY: 8.4, maxY: 12.3 },
  // (S2-G5c-0, A-J17-S2-1) the L2 enclosed rooms and the L2 balcony strips (twins of l1west / l1south / l1east); nested in
  // l2sw / l2north / l2wing the same way (smallest box wins)
  { id: 's2-l2-exec', name: 'Executive Suite', minX: -44, maxX: -30, minZ: -4, maxZ: 6, minY: 8.4, maxY: 12.3 },
  { id: 's2-l2-offa', name: 'Office A', minX: -28.5, maxX: -13, minZ: -30, maxZ: -22.5, minY: 8.4, maxY: 12.3 },
  { id: 's2-l2-offb', name: 'Office B', minX: -13, maxX: -7.5, minZ: -30, maxZ: -22.5, minY: 8.4, maxY: 12.3 },
  { id: 's2-l2-board', name: 'Board Room', minX: -7.5, maxX: -0.2, minZ: -2.5, maxZ: 6, minY: 8.4, maxY: 12.3 },
  { id: 's2-l2-west', name: 'L2 West Balcony', minX: -30, maxX: -26, minZ: -22.5, maxZ: -4, minY: 8.4, maxY: 12.3 },
  { id: 's2-l2-south', name: 'L2 South Balcony', minX: -26, maxX: -7.5, minZ: -22.5, maxZ: -18.5, minY: 8.4, maxY: 12.3 },
  { id: 's2-l2-east', name: 'L2 East Balcony', minX: -11.5, maxX: -7.5, minZ: -18.5, maxZ: -4, minY: 8.4, maxY: 12.3 },
  { id: 'roof', name: 'Roof', minX: -44, maxX: 4, minZ: -30, maxZ: 6, minY: 12.3 },
  // the roof plant room (`ROOF_PLANT`, walls 4.0 + the roof box): inside the open roof's box
  { id: 's2-roof-plant', name: 'Roof Plant Room', minX: -20.5, maxX: -12, minZ: 0, maxZ: 6, minY: 12.3, maxY: 16.5 },
].map((r) => ({ ...r, squad: [] }));

/** The G cafe tables (x, z), 1.0 x 0.75 x 1.0. (S2-G2, BA10) the two by the CR2 nose moved from x -13 to -14.5: the
 *  as-built 3.0 m offset from the lip kept. */
export const CAFE_TABLES: readonly (readonly [number, number])[] = [[-14.5, -9], [-14.5, -6.5], [-22.5, -9.5]];

/** Player-reach spots: carried bodies can be hidden in the plant room, the NW store, the print room and the board room. */
export const S2_HIDESPOTS: NonNullable<MapLayout['hideSpots']> = [
  { pos: new Vector3(2.5, 0, -24) },
  { pos: new Vector3(-40, 0, 4.5) },
  { pos: new Vector3(-19, 4.4, -28.5) },
  { pos: new Vector3(-2, 8.4, 4.5) },
  // (S2-G1, BA15) the post room: between the two post cages on its north wall (SPEC "Observe")
  { pos: new Vector3(-39.75, 0, -21.6) },
];

/** (S2-G1, BA15) The post room's two post cages (x, z), 2.2 x 1.8 x 0.9 against its north wall (z -20). */
export const POST_CAGES: readonly (readonly [number, number])[] = [[-41.5, -20.6], [-38.0, -20.6]];

export const S2_PICKUPS: NonNullable<MapLayout['pickups']> = [];

/** Nav seeds: the foyer, the SW lobby (L1, L2), the east wing (L1), the bridge, the roof. */
export const S2_NAV_SEEDS: Vector3[] = [new Vector3(-20, 0, -27.5), new Vector3(-34, 4.4, -26), new Vector3(-34, 8.4, -26), new Vector3(-4, 4.4, -14), new Vector3(7, 4.4, -14), new Vector3(-30, 12.3, 0)];

/** Light switches. Y is the floor the switch stands on (the interact test is within 1.5 m of it). */
export const S2_SWITCHES: NonNullable<MapLayout['switches']> = [
  // one switch at each stair door for the balconies' downlights: L1 (SW, NE), L2 (SW, NE)
  { pos: new Vector3(-38.8, 4.4, -24.6), yaw: PI / 2, group: S2_GROUPS.l1Bal },
  { pos: new Vector3(2.4, 4.4, -0.6), yaw: PI, group: S2_GROUPS.l1Bal },
  { pos: new Vector3(-38.8, 8.4, -24.6), yaw: PI / 2, group: S2_GROUPS.l2Bal },
  { pos: new Vector3(2.4, 8.4, -0.6), yaw: PI, group: S2_GROUPS.l2Bal },
  // the kitchen's switch inside its door; the L1 corridor switch by the facilities door (lure #7)
  { pos: new Vector3(-27.7, 4.4, -24.4), yaw: PI / 2, group: S2_GROUPS.kitchen },
  // (S2-G3) moved from z -0.5 with the facilities south wall (z 0 -> -1): the hall side, the same offset
  { pos: new Vector3(-5.6, 4.4, -1.5), yaw: PI, group: S2_GROUPS.l1Cor },
  // (S2-G5a, BA5) the K2 landing downlight's switch: 1.6 m off the landing's north door, 0.4 off the wall face, facing into the landing
  { pos: new Vector3(2.6, 4.4, -11.0), yaw: PI, group: S2_GROUPS.landing },
  // ---- (S2-G5c step 3) one switch per new room circuit, inside the room by its main door: 0.4 m off the wall face, 0.6 m past the
  // door opening's edge on the side away from the hinge (the hinge is at the opening's low end), at the door's floor, facing into the room
  { pos: new Vector3(-30.5, 0, -25.8), yaw: -PI / 2, group: S2_ROOM_GROUPS.post! },
  { pos: new Vector3(-30.5, 0, -6.8), yaw: -PI / 2, group: S2_ROOM_GROUPS.lift! },
  { pos: new Vector3(-30.5, 0, 2.2), yaw: -PI / 2, group: S2_ROOM_GROUPS.store! },
  // the open NE lobby: by the NE core's ground-floor door
  { pos: new Vector3(2.7, 0, -0.6), yaw: PI, group: S2_ROOM_GROUPS.hallne! },
  { pos: new Vector3(-7.5, 0, -24.8), yaw: PI / 2, group: S2_ROOM_GROUPS.plant! },
  // the L1 open plan west: by the SW core's L1 door
  { pos: new Vector3(-38.8, 4.4, -21.8), yaw: PI / 2, group: S2_ROOM_GROUPS.l1sw! },
  { pos: new Vector3(-15.8, 4.4, -23.0), yaw: PI, group: S2_ROOM_GROUPS.l1project! },
  // the NE stair lobby: the hinge side of the core's door (the away side holds the l1Bal switch 0.3 m off), 0.2 m along the wall
  // off the x -0.1 wall's margin (A-G5c-3)
  { pos: new Vector3(0.5, 4.4, -0.6), yaw: PI, group: S2_ROOM_GROUPS.l1ne! },
  // the door-less hall pieces (the wing's north and south ends): on the nearest wall of the room
  { pos: new Vector3(2.7, 4.4, -4.0), yaw: 0, group: S2_ROOM_GROUPS.l1wingn! },
  { pos: new Vector3(-1.5, 4.4, -18.0), yaw: PI, group: S2_ROOM_GROUPS.l1wings! },
  { pos: new Vector3(-2.0, 4.4, -6.3), yaw: PI / 2, group: S2_ROOM_GROUPS.l1comms! },
  { pos: new Vector3(-3.3, 4.4, -23.5), yaw: PI, group: S2_ROOM_GROUPS.l1semeet! },
  { pos: new Vector3(-38.8, 4.4, -14.5), yaw: PI, group: S2_ROOM_GROUPS['s2-l1-mr1']! },
  { pos: new Vector3(-34.5, 4.4, 4.2), yaw: -PI / 2, group: S2_ROOM_GROUPS['s2-l1-mr2']! },
  { pos: new Vector3(-16.5, 4.4, 4.2), yaw: -PI / 2, group: S2_ROOM_GROUPS['s2-l1-mr3']! },
  // the L2 wing hall: by the NE core's L2 door (hinge side, 0.2 m along the wall, as L1)
  { pos: new Vector3(0.5, 8.4, -0.6), yaw: PI, group: S2_ROOM_GROUPS.l2wing! },
  { pos: new Vector3(-30.5, 8.4, 2.2), yaw: -PI / 2, group: S2_ROOM_GROUPS['s2-l2-exec']! },
  { pos: new Vector3(-18.8, 8.4, -23.0), yaw: PI, group: S2_ROOM_GROUPS['s2-l2-offa']! },
  { pos: new Vector3(-8.8, 8.4, -23.0), yaw: PI, group: S2_ROOM_GROUPS['s2-l2-offb']! },
  { pos: new Vector3(-2.8, 8.4, -2.0), yaw: 0, group: S2_ROOM_GROUPS['s2-l2-board']! },
  { pos: new Vector3(-14.8, 12.3, 0.5), yaw: 0, group: S2_ROOM_GROUPS['s2-roof-plant']! },
  // (step 4) the riser circuits, inside each core by its ground-floor door (the hinge side: the far side of the SW door is outside the core)
  { pos: new Vector3(-39.8, 0, -24.2), yaw: -PI / 2, group: S2_CORE_GROUPS.sw! },
  { pos: new Vector3(0.5, 0, 0.4), yaw: 0, group: S2_CORE_GROUPS.ne! }, // 0.2 m along the wall off the x -0.1 wall's margin (A-G5c-3)
];

/**
 * (LR16-4) The reception panel: an untimed breaker board (EW8, no `window`) on `s2-atrium` (the three pendants and the
 * reception downlight), on the foyer's east wall. Lure #1: he sees his own room go dark, walks to the board and
 * switches it back (guard-ai LR16-4, #255); taken down at the board, the atrium stays dark.
 */
export const S2_BOARDS: BoardDef[] = [
  { pos: new Vector3(-8.4, 0, -28.5), yaw: -PI / 2, groups: [S2_GROUPS.atrium] }, // sync-s2-atrium (the reception board, as built)
  // (S2-G5a, C5, `S2-detail.md:180`) the east-wing breaker on the plant room's switchgear, facing west: a held cut (no
  // `window`) of the facilities lamp (55) and the wing corridor downlights (56)
  { pos: new Vector3(0.3, 0, -22), yaw: -PI / 2, groups: [S2_GROUPS.facilities, S2_GROUPS.l1Cor] }, // sync-s2-power
];

/** One S2 lamp fitting: its role (`S2_LIGHTS`), position, radius, intensity, circuit, colour, an optional downward cone
 *  (dx, dy, dz, angle) and the fitting's width. */
export interface S2Lamp {
  readonly role: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly r: number;
  readonly i: number;
  readonly group: number;
  readonly colour: readonly [number, number, number];
  readonly cone?: readonly [number, number, number, number];
  readonly w?: number;
}

/** The balcony downlight's cone (straight down, 1.2 rad). */
const DOWN: readonly [number, number, number, number] = [0, -1, 0, 1.2];

/** (S2-G5c) A room's fittings (the balcony downlight spec, r 5, i 0.8, cone 1.2, w 0.4) on its circuit at height y: the points are (x, z). */
function fit(room: string, y: number, pts: readonly (readonly [number, number])[]): S2Lamp[] {
  const group = S2_ROOM_GROUPS[room]!;
  return pts.map(([x, z]) => ({ role: `room:${room}`, x, y, z, r: 5, i: 0.8, group, colour: WHITE, cone: DOWN, w: 0.4 }));
}

/** (S2-G5c step 4) A fire stair core's landing lights: the ground-floor door landing, then the six landing slabs bottom to top (half
 *  landing at the far end, near landing at the door end, per storey), each at landing + 2.4 (the roof landing's 14.7 is 14.6: the
 *  bulkhead roof's underside is 14.7); r 4, i 0.7, no cone, w 0.3, on the core's riser circuit. */
function coreFit(c: Core): S2Lamp[] {
  const dir = c.near === 'N' ? -1 : 1;
  const nearZ = c.near === 'N' ? c.z1 : c.z0;
  const cx = (c.x0 + c.x1) / 2;
  const nearMid = nearZ + dir * (NEAR_D / 2);
  const farMid = nearZ + dir * (c.z1 - c.z0 - FAR_D / 2);
  const group = S2_CORE_GROUPS[c.id]!;
  const tops: [number, number][] = [[0, nearMid], [2.2, farMid], [4.4, nearMid], [6.4, farMid], [8.4, nearMid], [10.4, farMid], [12.3, nearMid]];
  return tops.map(([top, z]) => ({ role: `core:${c.id}`, x: cx, y: Math.min(top + 2.4, BULKHEAD_TOP - 0.3), z, r: 4, i: 0.7, group, colour: WHITE, w: 0.3 }));
}

/**
 * (S2-G2, lead note 2026-10-25 ~09:05, briefs/S2.md 0.6) Every S2 lamp, in one block: provisional, light-realism retunes.
 * `buildCampusS2` builds every lamp from this block and from nowhere else. No fitting is built off or dead (Q2 "Never").
 * TODO(light-realism): calibration replaces these values (today's engine values x1).
 */
export const S2_LIGHTS: readonly S2Lamp[] = [
  // the atrium pendants at y 9.0 over the south half of the void (the landmark), on the atrium board (50)
  { role: 'pendant', x: -22, y: 9.0, z: -17, r: 12, i: 1.35, group: S2_GROUPS.atrium, colour: WHITE, w: 0.7 },
  { role: 'pendant', x: -18, y: 9.0, z: -17, r: 12, i: 1.35, group: S2_GROUPS.atrium, colour: WHITE, w: 0.7 },
  { role: 'pendant', x: -14, y: 9.0, z: -17, r: 12, i: 1.35, group: S2_GROUPS.atrium, colour: WHITE, w: 0.7 },
  // the balcony downlights along the void's edges: the six as built plus (-18, -21.2) and (-10, -21.2) (BA3), on L1 (y 7.9, 51) and L2 (y 11.9, 52)
  ...([[-22, -2.8], [-14, -2.8], [-27.2, -12], [-8.8, -12], [-22, -21.2], [-14, -21.2], [-18, -21.2], [-10, -21.2]] as const).flatMap(([x, z]): S2Lamp[] => [
    { role: 'l1-balcony', x, y: 7.9, z, r: 5, i: 0.8, group: S2_GROUPS.l1Bal, colour: WHITE, cone: DOWN, w: 0.4 },
    { role: 'l2-balcony', x, y: 11.9, z, r: 5, i: 0.8, group: S2_GROUPS.l2Bal, colour: WHITE, cone: DOWN, w: 0.4 },
  ]),
  // the reception downlight is on the panel's circuit: from the desk the pendants hang above the L1 slab line (no sight
  // line), so #1 notices the panel by his own room going dark (guard-ai lightsOut: a fixture in the room he stands in)
  { role: 'reception', x: -20, y: 3.9, z: -26.5, r: 6, i: 0.9, group: S2_GROUPS.atrium, colour: WHITE, w: 0.6 },
  { role: 'kitchen', x: -25, y: 7.9, z: -26, r: 5, i: 0.9, group: S2_GROUPS.kitchen, colour: WHITE, w: 0.6 },
  { role: 'facilities', x: -4, y: 7.9, z: 3, r: 6, i: 0.9, group: S2_GROUPS.facilities, colour: COOL, w: 0.6 },
  // one night lamp per corridor (0.25)
  // (S2-G5a, BA4, C11) the wing corridor's two downlights (56, patrolled white cones), 1.0 m into the hall from the facilities
  // door and the landing's west door; they replace the as-built night lamp (-3, 7.9, -1.5)
  { role: 'wing', x: -4, y: 7.9, z: -2.0, r: 5, i: 0.8, group: S2_GROUPS.l1Cor, colour: WHITE, cone: DOWN, w: 0.4 },
  { role: 'wing', x: -3.5, y: 7.9, z: -16.0, r: 5, i: 0.8, group: S2_GROUPS.l1Cor, colour: WHITE, cone: DOWN, w: 0.4 },
  // (S2-G5a, BA5) the K2 landing downlight (53, switched by the landing's north door)
  { role: 'landing', x: 1.5, y: 7.9, z: -15.8, r: 5, i: 0.8, group: S2_GROUPS.landing, colour: WHITE, cone: DOWN, w: 0.4 },
  { role: 'l2-corridor', x: -35, y: 11.9, z: -9, r: 8, i: 0.25, group: S2_GROUPS.l2Cor, colour: WHITE, w: 0.4 },
  { role: 'g-corridor', x: -28, y: 3.9, z: -14, r: 8, i: 0.25, group: S2_GROUPS.gCor, colour: WHITE, w: 0.4 },
  // (S2-G5a, BA6) the goods-door bulkhead over the mail room's goods door (#12), on the G corridor circuit, unswitched
  { role: 'goods', x: -43.6, y: 2.6, z: -16, r: 5, i: 0.8, group: S2_GROUPS.gCor, colour: WHITE, cone: DOWN, w: 0.4 },
  // ---- (S2-G5c, Q2 "Never") every room without a lit fitting gets its own switched circuit (`S2_ROOM_GROUPS`). PROVISIONAL (J10
  // retunes): n = ceil(L / 8) fittings along the box's long axis, evenly spaced on its centre line, the balcony downlight's values.
  // A room holding a core, the lift block or a nested child cuts its box to the free rectangle first (A-G5c-2); y is the floor + 3.5
  // (G 3.9, L1 7.9, L2 11.9, the roof plant room 15.9). TODO(light-realism): calibration replaces these values.
  ...fit('post', 3.9, [[-34.6, -27.5], [-34.6, -22.5]]),
  ...fit('lift', 3.9, [[-38.25, -8], [-32.75, -8]]),
  ...fit('store', 3.9, [[-40.5, 1], [-33.5, 1]]),
  ...fit('hallne', 3.9, [[-4.1, -1.5], [-4.1, 3.5]]),
  ...fit('plant', 3.9, [[-2, -26.75], [-2, -20.25], [-2, -13.75], [-2, -7.25]]),
  ...fit('l1sw', 7.9, [[-31.4, -26.25], [-31.4, -18.75], [-31.4, -11.25], [-31.4, -3.75]]),
  ...fit('l1project', 7.9, [[-17.625, -26.25], [-10.875, -26.25]]),
  ...fit('l1ne', 7.9, [[1.9, -0.6]]),
  ...fit('l1wingn', 7.9, [[0.75, -2.75]]),
  ...fit('l1wings', 7.9, [[0.75, -20.25]]),
  ...fit('l1comms', 7.9, [[0.75, -7.5]]),
  ...fit('l1semeet', 7.9, [[-4.625, -26.5], [1.125, -26.5]]),
  ...fit('s2-l1-mr1', 7.9, [[-41.875, -17], [-37.625, -17]]),
  ...fit('s2-l1-mr2', 7.9, [[-41.5, 3], [-36.5, 3]]),
  ...fit('s2-l1-mr3', 7.9, [[-23.5, 3], [-18.5, 3]]),
  ...fit('l2wing', 11.9, [[-1.75, -26.5625], [-1.75, -19.6875], [-1.75, -12.8125], [-1.75, -5.9375]]),
  ...fit('s2-l2-exec', 11.9, [[-40.5, 1], [-33.5, 1]]),
  ...fit('s2-l2-offa', 11.9, [[-24.625, -26.25], [-16.875, -26.25]]),
  ...fit('s2-l2-offb', 11.9, [[-10.25, -26.25]]),
  ...fit('s2-l2-board', 11.9, [[-3.85, -0.375], [-3.85, 3.875]]),
  ...fit('s2-roof-plant', 15.9, [[-18.375, 3], [-14.125, 3]]),
  // (S2-G5c step 4) the fire stairs' riser circuits: one fitting per landing (the ground-floor door landing and the six landing
  // slabs: the floors' near landings and the half landings, A-G5c-5) at landing + 2.4, r 4, i 0.7, no cone, w 0.3
  ...coreFit(SW_CORE),
  ...coreFit(NE_CORE),
];

/** The atrium pendants (x, z) at y 9.0 (from `S2_LIGHTS`). */
export const PENDANTS: readonly (readonly [number, number])[] = S2_LIGHTS.filter((l) => l.role === 'pendant').map((l) => [l.x, l.z] as const);
/** The balcony downlights (x, z), the same eight on L1 and L2 (from `S2_LIGHTS`). */
export const BALCONY_LAMPS: readonly (readonly [number, number])[] = S2_LIGHTS.filter((l) => l.role === 'l1-balcony').map((l) => [l.x, l.z] as const);

/** A visible lamp fitting (no model: the glowing box), a real registry light, from an `S2_LIGHTS` entry. */
function lamp(b: LevelBuilder, l: S2Lamp): void {
  const w = l.w ?? 0.5;
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
    fixture: { sx: w, sy: 0.1, sz: w / 2, oy: 0 },
  });
}

/** `r` minus `h` as up to four rectangles. */
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

/** A gap of 1.2 centred on `c`. */
const gc = (c: number): [number, number] => [c - 0.6, c + 0.6];

/** A wall along x (`alongX`, at z = `at`) or along z (at x = `at`) from a to e between heights, with door gaps (heads over them, overhead). */
function wall(b: LevelBuilder, alongX: boolean, at: number, a: number, e: number, gaps: readonly (readonly [number, number])[], y0: number, y1: number, th = P, color = WALL): void {
  const i0 = b.boxes.length;
  const put = (s: number, f: number, lo: number, hi: number, head: boolean): void => {
    if (f - s < 0.01 || hi - lo < 0.01) return;
    const m = (s + f) / 2;
    if (alongX) b.box(m, (lo + hi) / 2, at, f - s, hi - lo, th, color);
    else b.box(at, (lo + hi) / 2, m, th, hi - lo, f - s, color);
    if (head) b.boxes[b.boxes.length - 1]!.overhead = true;
  };
  let s = a;
  for (const g of [...gaps].sort((p, q) => p[0] - q[0])) {
    put(s, g[0], y0, y1, false);
    put(g[0], g[1], y0 + DOOR_H, y1, true);
    s = g[1];
  }
  put(s, e, y0, y1, false);
  b.mark(i0, { noLedge: true });
}

/** A door anchor in a wall along x (at z) or along z (at x), centred on `c`, on floor `y`. */
function doorIn(b: LevelBuilder, alongX: boolean, at: number, c: number, y: number, o: { locked?: boolean; breachable?: boolean; swing?: 1 | -1 } = {}): void {
  if (alongX) b.door(c - 0.6, y, at, 1.2, PI / 2, { swing: o.swing ?? 1, ...(o.locked !== undefined ? { locked: o.locked } : {}), ...(o.breachable !== undefined ? { breachable: o.breachable } : {}) });
  else b.door(at, y, c - 0.6, 1.2, 0, { swing: o.swing ?? 1, ...(o.locked !== undefined ? { locked: o.locked } : {}), ...(o.breachable !== undefined ? { breachable: o.breachable } : {}) });
}

/** (E2) The meeting rooms' frosted band (SPEC S2 stealth route: "crouch under the meeting rooms' frosted band"): frosted
 *  from the floor to this height (over a crouched body, `MOVEMENT.crouchHeight` 1.15), clear above. */
export const S2_FROSTED_BAND = 1.2;

/**
 * A glass front (E2, EW6; was the L10 fence fallback): glass panes `height` tall along a wall line between gaps, on the
 * fence panels' lines (the same nav footprint), clear, or frosted to `band` and clear above; and a head box over the
 * whole run.
 */
function glassFront(b: LevelBuilder, alongX: boolean, at: number, a: number, e: number, openings: readonly (readonly [number, number])[], y: number, y1: number, head = false, height = 2.4, band = 0): void {
  const seg = (s: number, f: number): void => {
    if (f - s < 0.3) return;
    const [ax, az, bx, bz] = alongX ? [s, at, f, at] : [at, s, at, f];
    if (band > 0) {
      b.glass(ax, az, bx, bz, band, y, 'frosted', GLASS);
      b.glass(ax, az, bx, bz, height - band, y + band, 'clear', GLASS);
    } else b.glass(ax, az, bx, bz, height, y, 'clear', GLASS);
  };
  let s = a;
  for (const g of [...openings].sort((p, q) => p[0] - q[0])) {
    seg(s, g[0]);
    s = g[1];
  }
  seg(s, e);
  if (!head) return;
  const i0 = b.boxes.length;
  const m = (a + e) / 2;
  if (alongX) b.box(m, (y + height + y1) / 2, at, e - a, y1 - y - height, P, WALL);
  else b.box(at, (y + height + y1) / 2, m, P, y1 - y - height, e - a, WALL);
  b.boxes[b.boxes.length - 1]!.overhead = true;
  b.mark(i0, { noLedge: true });
}

/** A floor slab over `rect` minus `holes` (top at `top`, 0.2 thick unless `th`), every piece overhead and `noLedge` unless `ledge`. */
function slab(b: LevelBuilder, rect: Rect, top: number, holes: readonly Rect[], th = 0.2, color = SLAB, ledge = false): void {
  let pieces: Rect[] = [rect];
  for (const h of holes) pieces = pieces.flatMap((r) => subtract(r, h));
  for (const r of pieces) {
    if (r[1] - r[0] < 0.01 || r[3] - r[2] < 0.01) continue;
    b.box((r[0] + r[1]) / 2, top - th / 2, (r[2] + r[3]) / 2, r[1] - r[0], th, r[3] - r[2], color);
    const p = b.boxes[b.boxes.length - 1]!;
    p.overhead = true;
    if (!ledge) p.noLedge = true;
  }
}

/** A low furniture block (desk, counter, table, cabinet): `noLedge` when 1.8 or over. */
function furn(b: LevelBuilder, x: number, z: number, w: number, h: number, d: number, color = DESK, y = 0): void {
  b.block(x, z, w, h, d, color, y);
  if (h >= 1.8) b.boxes[b.boxes.length - 1]!.noLedge = true;
}

/** (S2-G2) Glass balustrade runs (x0, x1, z0, z1 centre lines: one of the pairs equal), 1.1 high, 0.1 thick, on floor `y`, noLedge. */
function balustrade(b: LevelBuilder, y: number, runs: readonly (readonly [number, number, number, number])[]): void {
  const i0 = b.boxes.length;
  const h = 1.1;
  for (const [x0, x1, z0, z1] of runs) b.box((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2, Math.max(0.1, x1 - x0), h, Math.max(0.1, z1 - z0), GLASS);
  b.mark(i0, { noLedge: true });
}

/** One fire stair core: walls with the door at every floor and the roof bulkhead, the flights, the half and near landings, the bulkhead roof. */
function buildCore(b: LevelBuilder, c: Core): void {
  const [fx0, fx1, fz0, fz1] = coreFoot(c);
  const gaps: [number, number][] = [gc(c.door.c)];
  for (let s = 0; s < 4; s++) {
    const y0 = S2_FLOORS[s]!;
    const y1 = s < 3 ? S2_FLOORS[s + 1]! : BULKHEAD_TOP;
    // the four walls (centre lines 0.1 outside the interior); the door wall carries the gap
    wall(b, false, c.x0 - 0.1, fz0, fz1, [], y0, y1, P, WALL_DARK);
    wall(b, false, c.x1 + 0.1, fz0, fz1, c.door.wall === 'E' ? gaps : [], y0, y1, P, WALL_DARK);
    wall(b, true, c.z0 - 0.1, fx0, fx1, c.door.wall === 'S' ? gaps : [], y0, y1, P, WALL_DARK);
    wall(b, true, c.z1 + 0.1, fx0, fx1, [], y0, y1, P, WALL_DARK);
    if (c.door.wall === 'E') doorIn(b, false, c.x1 + 0.1, c.door.c, y0);
    else doorIn(b, true, c.z0 - 0.1, c.door.c, y0);
  }
  // flights, the half landings (far end) and the near landings (the floors)
  const dir = c.near === 'N' ? -1 : 1;
  const nearZ = c.near === 'N' ? c.z1 : c.z0;
  const fl = coreFlights(c);
  fl.forEach((f) => b.stairs(f.cx, f.cz, f.w, f.len, f.rise, f.steps, STAIR, f.yaw, f.y0));
  const farMid = nearZ + dir * (c.z1 - c.z0 - FAR_D / 2);
  const nearMid = nearZ + dir * (NEAR_D / 2);
  const cx = (c.x0 + c.x1) / 2;
  const w = c.x1 - c.x0;
  const i0 = b.boxes.length;
  for (let s = 0; s < 3; s++) {
    const f = S2_FLOORS[s]!;
    const top = S2_FLOORS[s + 1]!;
    b.box(cx, f + (top - f) / 2 - 0.1, farMid, w, 0.2, FAR_D, SLAB);
    b.box(cx, top - 0.1, nearMid, w, 0.2, NEAR_D, SLAB);
  }
  b.box(cx, BULKHEAD_TOP - 0.1, (c.z0 + c.z1) / 2, w + 0.4, 0.2, c.z1 - c.z0 + 0.4, ROOF);
  b.mark(i0, { overhead: true, noLedge: true });
}

/** Everything of section 2: walls, slabs, stairs, the atrium, furniture, lamps and doors. */
export function buildCampusS2(b: LevelBuilder): void {
  const { x0: X0, x1: X1, z0: Z0, z1: Z1 } = S2_FOOT;
  const [F0, F1, F2, FR] = S2_FLOORS;
  const V: Rect = [S2_VOID.x0, S2_VOID.x1, S2_VOID.z0, S2_VOID.z1];
  const swFoot = coreFoot(SW_CORE);
  const neFoot = coreFoot(NE_CORE);

  // ---- the shell: outer walls per floor (0.3), the C1 far door's gap at the foot of the south wall, the goods door, the C2 door
  wall(b, true, Z0, X0, X1, [[C1_GAP[0], C1_GAP[1]]], F0, F1, T);
  wall(b, true, Z0, X0, X1, [], F1, F2, T);
  wall(b, true, Z0, X0, X1, [], F2, FR, T);
  // (S2-G3, C12) the north wall per floor: L1 leaves the facilities window's gap (x -4.6..-3.4, sill 5.3, 1.2 high)
  wall(b, true, Z1, X0, X1, [], F0, F1, T);
  {
    const W = FAC_WINDOW;
    wall(b, true, Z1, X0, W.x - W.w / 2, [], F1, F2, T);
    wall(b, true, Z1, W.x + W.w / 2, X1, [], F1, F2, T);
    const i0 = b.boxes.length;
    b.box(W.x, (F1 + W.sill) / 2, Z1, W.w, W.sill - F1, T, WALL);
    b.box(W.x, (W.sill + W.h + F2) / 2, Z1, W.w, F2 - W.sill - W.h, T, WALL);
    b.mark(i0, { noLedge: true });
  }
  wall(b, true, Z1, X0, X1, [], F2, FR, T);
  wall(b, false, X0, Z0, Z1, [gc(-16)], F0, F1, T);
  wall(b, false, X0, Z0, Z1, [], F1, FR, T);
  wall(b, false, X1, Z0, Z1, [], F0, F1, T);
  wall(b, false, X1, Z0, Z1, [gc(-14)], F1, F2, T);
  wall(b, false, X1, Z0, Z1, [], F2, FR, T);
  // the goods door: locked and unbreakable (no outside to go to: the SW goods bay is S1's fenced side)
  doorIn(b, false, X0, -16, F0, { locked: true, breachable: false });

  // ---- slabs: L1 (the lip piece at the cafe, CR2, keeps its ledge), L2, the roof (the void's rim stands on it)
  const lip: Rect = [-11.5, -6, -11, -5];
  const shaft: Rect = [MAIL_SHAFT.x0, MAIL_SHAFT.x1, MAIL_SHAFT.z0, MAIL_SHAFT.z1];
  slab(b, [X0, X1, Z0, Z1], F1, [V, swFoot, neFoot, lip, shaft], 0.4);
  slab(b, [lip[0], lip[1], lip[2], lip[3]], F1, [], 0.4, SLAB, true);
  slab(b, [X0, X1, Z0, Z1], F2, [V, swFoot, neFoot]);
  // (S2-G4, C14, BA9) the roof slab has the plant room's floor hatch
  const hatch: Rect = [ROOF_HATCH.x0, ROOF_HATCH.x1, ROOF_HATCH.z0, ROOF_HATCH.z1];
  slab(b, [X0, X1, Z0, Z1], FR, [V, swFoot, neFoot, hatch], 0.3, ROOF);

  // ---- the cores and the feature stair
  buildCore(b, SW_CORE);
  buildCore(b, NE_CORE);
  // (S2-G1, C3) the feature stair: two flights, the mid landing (a slab, overhead: G walks under it), rails both sides (LD 16.2.4)
  {
    for (const f of FEATURE_FLIGHTS) b.stairs(f.cx, f.cz, f.w, f.len, f.rise, f.steps, STAIR, f.yaw, f.y0);
    const L = FEATURE_LANDING;
    const i0 = b.boxes.length;
    b.box((L.x0 + L.x1) / 2, L.top - L.th / 2, (L.z0 + L.z1) / 2, L.x1 - L.x0, L.th, L.z1 - L.z0, SLAB);
    b.boxes[b.boxes.length - 1]!.overhead = true;
    const h = FEATURE_RAIL_H;
    for (const x of FEATURE_RAIL_X) {
      // the flights' rails: pitched boxes along the slope, the bottom face on the pitch line
      for (const f of FEATURE_FLIGHTS) {
        const pitch = -Math.atan2(f.rise, f.len);
        b.box(x, f.y0 + f.rise / 2 + (h / 2) * Math.cos(pitch), f.cz, 0.1, h, hyp2(f.len, f.rise), STEEL, f.yaw, pitch);
      }
      b.box(x, L.top + h / 2, (L.z0 + L.z1) / 2, 0.1, h, L.z1 - L.z0, STEEL);
    }
    b.mark(i0, { noLedge: true });
  }

  // ---- G floor
  const G1 = 4.0;
  // west line x -30: post room / foyer door, mail room, lift lobby, the NW store (door to the hall)
  wall(b, false, -30, Z0, Z1, [gc(-27), gc(-16), gc(-8), gc(1)], F0, G1);
  doorIn(b, false, -30, -27, F0);
  doorIn(b, false, -30, -16, F0);
  doorIn(b, false, -30, -8, F0);
  doorIn(b, false, -30, 1, F0);
  wall(b, true, -20, X0, -30, [gc(-36)], F0, G1);
  doorIn(b, true, -20, -36, F0);
  // (S2-G1, C6) the back-of-house doors: mail room to lift lobby, lift lobby to store (6 m from the x -30 corner)
  wall(b, true, -12, X0, -30, [gc(-36)], F0, G1);
  doorIn(b, true, -12, -36, F0);
  wall(b, true, -4, X0, -30, [gc(-36)], F0, G1);
  doorIn(b, true, -4, -36, F0);
  // the east plant room (x -8..4, z -30..-4): a door from the foyer; (S2-G1, C5) the north door to the NE lobby, 3 m from
  // the x -8 corner, locked at night and breachable (guard nav goes round by reception)
  wall(b, false, -8, Z0, -4, [gc(-26)], F0, G1);
  doorIn(b, false, -8, -26, F0);
  wall(b, true, -4, -8, X1, [gc(-5)], F0, G1);
  doorIn(b, true, -4, -5, F0, { locked: true, breachable: true });
  // the turnstile barrier at z -23 (x -30..-8): waist high with three gates of 1.2 (the gates are open gaps; the camera sees them)
  {
    const i0 = b.boxes.length;
    let s = -30;
    for (const g of [gc(-24), gc(-20), gc(-16)]) {
      b.box((s + g[0]) / 2, 0.55, -23, g[0] - s, 1.1, T, STEEL);
      s = g[1];
    }
    b.box((s + -8) / 2, 0.55, -23, -8 - s, 1.1, T, STEEL);
    b.mark(i0, { noLedge: true });
  }
  // the lift shaft block (x -44..-41, z -12..-4, all floors): dummy lift doors on its east face
  {
    const i0 = b.boxes.length;
    b.box(-42.5, FR / 2, -8, 3, FR, 8, STEEL);
    b.mark(i0, { noLedge: true });
    for (const f of [F0, F1, F2]) for (const z of [-10.5, -8, -5.5]) b.box(-40.93, f + 1.05, z, 0.14, 2.1, 1.2, '#aeb6bb', 0, 0, false);
  }
  // G furniture: the reception desk (faces the turnstiles), the cafe counter and tables (0.75), mail cages, the plant room's switchgear
  furn(b, -20, -27.1, 6, 1.1, 0.8);
  furn(b, -19, -5.6, 6, 1.1, 0.6);
  for (const [x, z] of CAFE_TABLES) furn(b, x, z, 1.0, 0.75, 1.0);
  for (const [x, z] of [[-41.5, -13.5], [-38, -13.5], [-41.5, -18.5]] as const) furn(b, x, z, 2.2, 1.8, 0.9, STEEL);
  furn(b, 1.5, -10, 2.4, 1.8, 1.0, STEEL);
  furn(b, 1.5, -22, 2.4, 1.8, 1.0, STEEL);
  furn(b, -42.5, 3, 1.4, 1.8, 3.0, STEEL);
  // post room: sorting table; (S2-G1, BA15) the two post cages on the north wall
  furn(b, -35, -26, 3.0, 0.9, 1.0);
  // (S2-G5a, BA16) the post-room note on the sorting table: a visual box, no collision ('Plant log - cage 3 for facilities')
  b.box(-35, 0.91, -26, 0.3, 0.02, 0.2, '#e8e2d0', 0, 0, false); // lead for sync-s2-plantlog
  for (const [x, z] of POST_CAGES) furn(b, x, z, 2.2, 1.8, 0.9, STEEL);
  // (S2-G1, C16, BA8) the mail-lift shaft: walls on the N, E and S faces (centre lines 0.1 outside the clear box, G to
  // 4.4), the service ladder inside the east face, and at L1 a 1.1 rail round the hole (see the S2-G1 report: the rail
  // leaves the ladder's top-out side, east, open)
  {
    const M = MAIL_SHAFT;
    const i0 = b.boxes.length;
    wall(b, true, M.z0 - 0.1, M.x0, M.x1 + 0.2, [], F0, F1, P, STEEL);
    wall(b, true, M.z1 + 0.1, M.x0, M.x1 + 0.2, [], F0, F1, P, STEEL);
    wall(b, false, M.x1 + 0.1, M.z0 - 0.2, M.z1 + 0.2, [], F0, F1, P, STEEL);
    const y = F1 + 0.55;
    b.box((M.x0 + M.x1) / 2, y, M.z0 - 0.05, M.x1 - M.x0, 1.1, 0.1, STEEL);
    b.box((M.x0 + M.x1) / 2, y, M.z1 + 0.05, M.x1 - M.x0, 1.1, 0.1, STEEL);
    b.box(M.x0 - 0.05, y, (M.z0 + M.z1) / 2, 0.1, 1.1, M.z1 - M.z0 + 0.2, STEEL);
    b.mark(i0, { noLedge: true });
    b.ladder(M.x1, (M.z0 + M.z1) / 2, F0, F1, PI / 2);
  }

  // ---- L1 (floor 4.4, partitions up to 8.2)
  const A1 = F1;
  const B1 = 8.2;
  // (S2-G3, C10) the east wing wall x -7.5 (z -30..0.5): doors into the SE meeting room (z -27, C8), from the south ring
  // (z -21) and the north plan (z -3); then the facilities office's glazed partition (z 0.5..5.5) with its west door
  wall(b, false, -7.5, Z0, 0.5, [gc(-27), gc(-21), gc(-3)], A1, B1);
  doorIn(b, false, -7.5, -27, A1);
  doorIn(b, false, -7.5, -21, A1);
  doorIn(b, false, -7.5, -3, A1);
  glassFront(b, false, -7.5, 0.5, 5.5, [gc(3)], A1, B1);
  doorIn(b, false, -7.5, 3, A1);
  wall(b, false, -7.5, 5.5, Z1, [], A1, B1);
  // the SE meeting room (x -7.5..4, z -30..-23): door in its north wall, into the room (south)
  wall(b, true, -23, -7.5, X1, [gc(-4.5)], A1, B1);
  doorIn(b, true, -23, -4.5, A1, { swing: 1 });
  // (C10) the bridge landing (x -2.5..4, z -17.5..-10.5), the comms room (z -10.5..-4.5) and the strip to the NE stair door:
  // the x -2.5 wall with the landing's west door (pg-brg, z -16) and the comms door (z -7.5), both opening east into the rooms;
  // the comms room's door into the landing (x 1) opens south, into the landing
  wall(b, false, -2.5, -17.5, -4.5, [gc(-16), gc(-7.5)], A1, B1);
  doorIn(b, false, -2.5, -16, A1, { swing: 1 });
  doorIn(b, false, -2.5, -7.5, A1, { swing: 1 });
  wall(b, true, -17.5, -2.5, X1, [], A1, B1);
  wall(b, true, -10.5, -2.5, X1, [gc(1)], A1, B1);
  doorIn(b, true, -10.5, 1, A1, { swing: 1 });
  wall(b, true, -4.5, -2.5, X1, [], A1, B1);
  // (C10) the facilities office (x -7.5..-0.2, z -1..6): door S (x -4) opening north into the office; z -1..0 shut on the
  // NE core's west wall line (x -0.1); its east wall is the NE core's west wall
  wall(b, true, -1, -7.5, -0.2, [gc(-4)], A1, B1);
  doorIn(b, true, -1, -4, A1, { swing: -1 });
  wall(b, false, -0.1, -1, 0, [], A1, B1);
  // the pocket east of the NE core (x 2.8..4) is shut
  wall(b, true, 0, 2.8, X1, [], A1, B1);
  // (C12) the sunshade ledge outside the north wall (x -7..-1, z 6..7.2, top 4.4, steel): a hang ledge on its north edge;
  // the facilities window (BA7) over it
  {
    const i0 = b.boxes.length;
    b.box(-4, F1 - 0.1, 6.6, 6, 0.2, 1.2, STEEL);
    b.mark(i0, { noLedge: true });
    b.ledge(-1, 7.2, -7, 7.2, F1);
    const W = FAC_WINDOW;
    b.windowAt(W.x, W.sill + W.h / 2, Z1, W.w, W.h, 0, { sill: W.sill, open: true, breakable: true });
  }
  // (C8) the south band (z -30..-22.5): the kitchen (x -30..-21) and the project room (x -21..-7.5, the print room and meeting
  // room 4 merged), doors onto the south ring at x -25, -17 and -10, each opening south into its room
  wall(b, true, -22.5, -30, -7.5, [gc(-25), gc(-17), gc(-10)], A1, B1);
  for (const c of [-25, -17, -10]) doorIn(b, true, -22.5, c, A1, { swing: 1 });
  wall(b, false, -30, Z0, -22.5, [gc(-26)], A1, B1);
  doorIn(b, false, -30, -26, A1);
  wall(b, false, -21, Z0, -22.5, [], A1, B1);
  // (C9) meeting rooms with glass fronts (E2: the frosted band, clear above), each glass opening a door: MR1 west
  // (x -44..-35.5, z -20..-14) with a north door (x -40); MR2 (x -44..-34) and MR3 (x -26..-16) north (z 0..6), side doors (z 3)
  wall(b, true, -20, X0, -35.5, [], A1, B1);
  wall(b, true, -14, X0, -35.5, [gc(-40)], A1, B1);
  doorIn(b, true, -14, -40, A1);
  glassFront(b, false, -35.5, -20, -14, [gc(-17)], A1, B1, false, 2.4, S2_FROSTED_BAND);
  doorIn(b, false, -35.5, -17, A1);
  glassFront(b, true, 0, X0, -34, [gc(-39)], A1, B1, false, 2.4, S2_FROSTED_BAND);
  doorIn(b, true, 0, -39, A1);
  wall(b, false, -34, 0, Z1, [gc(3)], A1, B1);
  doorIn(b, false, -34, 3, A1);
  glassFront(b, true, 0, -26, -16, [gc(-21)], A1, B1, false, 2.4, S2_FROSTED_BAND);
  doorIn(b, true, 0, -21, A1);
  wall(b, false, -26, 0, Z1, [], A1, B1);
  wall(b, false, -16, 0, Z1, [gc(3)], A1, B1);
  doorIn(b, false, -16, 3, A1);
  // L1 furniture: desks (0.75), the kitchen counter and table, the print room copier, the comms UPS cabinets, the BMS desk and plotter
  for (const [x, z] of [[-31.5, -4.5], [-31.5, 0.5], [-12, 3], [-12, 5]] as const) furn(b, x, z, 1.6, 0.75, 0.8, DESK, A1);
  furn(b, -25, -29.4, 5, 1.1, 0.6, DESK, A1);
  furn(b, -16, -28, 1.2, 1.0, 0.8, STEEL, A1);
  furn(b, 2.9, -8.3, 2.4, 1.8, 0.8, STEEL, A1);
  // (S2-G3, C10) the north UPS cabinet moved from z -4.8 to -5.2: 0.2 off the new z -4.5 wall face
  furn(b, 2.9, -5.2, 2.4, 1.8, 0.8, STEEL, A1);
  furn(b, -6.5, 4.3, 3, 0.75, 0.9, DESK, A1);
  furn(b, -2.2, 5.3, 1.0, 1.0, 0.8, STEEL, A1);
  // (S2-G2, C4) the CR2 planter is removed; (C2) the L1 balustrade (1.1 glass, 0.1 thick) round the 14.5 m void: the south
  // side has the feature stair's head gap (x -19.2..-16.8), the east side the CR2 gap (z -11..-5, 6 m)
  balustrade(b, A1, [
    [-26.1, -26.1, -18.5, -4],
    [-26, -11.5, -4.1, -4.1],
    [-26, -19.2, -18.4, -18.4],
    [-16.8, -11.6, -18.4, -18.4],
    [-11.6, -11.6, -18.4, -11],
    [-11.6, -11.6, -5, -4],
  ]);

  // ---- L2 (floor 8.4, partitions up to 12.0)
  const A2 = F2;
  const B2 = 12.0;
  // (S2-G4, C13) the x -7.5 wall: office B's side door (z -26), the wing's south (-21) and north (-3) doors, the board room's
  // west door (3)
  wall(b, false, -7.5, Z0, Z1, [gc(-26), gc(-21), gc(-3), gc(3)], A2, B2);
  doorIn(b, false, -7.5, -26, A2);
  doorIn(b, false, -7.5, -21, A2);
  doorIn(b, false, -7.5, -3, A2);
  doorIn(b, false, -7.5, 3, A2);
  // (C13) the board room NE (x -7.5..-0.2, z -2.5..6): its south wall moved from z 0 to -2.5, door S (x -4); z -2.5..0 shut
  // on the NE core's west wall line (x -0.1)
  wall(b, true, -2.5, -7.5, -0.2, [gc(-4)], A2, B2);
  doorIn(b, true, -2.5, -4, A2);
  wall(b, false, -0.1, -2.5, 0, [], A2, B2);
  wall(b, true, 0, 2.8, X1, [], A2, B2);
  // the executive suite NW (x -44..-30, z -4..6): door from the lift lobby (z -4, x -33) and to the north corridor (x -30, z 1)
  wall(b, true, -4, X0, -30, [gc(-33)], A2, B2);
  doorIn(b, true, -4, -33, A2);
  wall(b, false, -30, -4, Z1, [gc(1)], A2, B2);
  doorIn(b, false, -30, 1, A2);
  // the south band: two offices with doors onto the south ring strip
  // (S2-G4, C13) office A's second door (x -24)
  wall(b, true, -22.5, -28.5, -7.5, [gc(-24), gc(-20), gc(-10)], A2, B2);
  for (const c of [-24, -20, -10]) doorIn(b, true, -22.5, c, A2);
  for (const x of [-28.5, -13]) wall(b, false, x, Z0, -22.5, [], A2, B2);
  // L2 furniture
  for (const [x, z] of [[-34, 3], [-36, 1], [-16, 3.5], [-12, 3.5], [-33, -25.5]] as const) furn(b, x, z, 1.6, 0.75, 0.8, DESK, A2);
  furn(b, -38, 3, 4, 0.75, 1.4, DESK, A2);
  // (S2-G2, C2) the L2 balustrade: as L1 with no gap (no stair and no lip at L2; the L2 drawing's stair gap is a copy slip, LD 16.5.3)
  balustrade(b, A2, [
    [-26.1, -26.1, -18.5, -4],
    [-26, -11.5, -4.1, -4.1],
    [-26, -11.5, -18.4, -18.4],
    [-11.6, -11.6, -18.5, -4],
  ]);

  // ---- roof: parapet 1.1 on the edge, the roof light's rim round the void (0.9 over the roof, top 13.2) and its lid (glass: visual only), the plant room
  {
    const i0 = b.boxes.length;
    const ph = 1.1;
    const py = FR + ph / 2;
    b.box((X0 + X1) / 2, py, Z0 + 0.1, X1 - X0, ph, 0.2, WALL_DARK);
    // (S2-G4, C14) the north parapet has no piece over the roof plant room (x -20.5..-12): its north wall stands there
    b.box((X0 + ROOF_PLANT.x0) / 2, py, Z1 - 0.1, ROOF_PLANT.x0 - X0, ph, 0.2, WALL_DARK);
    b.box((ROOF_PLANT.x1 + X1) / 2, py, Z1 - 0.1, X1 - ROOF_PLANT.x1, ph, 0.2, WALL_DARK);
    b.box(X0 + 0.1, py, (Z0 + Z1) / 2, 0.2, ph, Z1 - Z0, WALL_DARK);
    b.box(X1 - 0.1, py, (Z0 + Z1) / 2, 0.2, ph, Z1 - Z0, WALL_DARK);
    // (S2-G2, C2, `S2-detail.md:94`) the rim follows the void: outer box x -26.4..-11.1, z -18.9..-3.6, 0.9 high (to 13.2), 0.4 thick
    const rh = 13.2 - FR;
    const ry = FR + rh / 2;
    b.box(-18.75, ry, -18.7, 15.3, rh, 0.4, WALL_DARK);
    b.box(-18.75, ry, -3.8, 15.3, rh, 0.4, WALL_DARK);
    b.box(-26.2, ry, -11.25, 0.4, rh, 14.5, WALL_DARK);
    b.box(-11.3, ry, -11.25, 0.4, rh, 14.5, WALL_DARK);
    b.mark(i0, { noLedge: true });
    b.box(-18.75, 13.2, -11.25, 14.5, 0.1, 14.5, '#6c8da0', 0, 0, false);
    // (S2-G4, C14, `S2-detail.md:96`) the roof plant room (x -20.5..-12, z 0..6, walls 4.0 high; the north wall on the
    // shell's north line), a roof box on top (overhead, noLedge), the door south (x -16); the floor hatch (BA9) with its cat
    // ladder down to the L2 north plan and a 1.1 rail on three sides, the ladder's top-out side (north) open
    const R = ROOF_PLANT;
    const j0 = b.boxes.length;
    wall(b, true, 0, R.x0, R.x1, [gc(-16)], FR, FR + R.h, P, WALL_DARK);
    wall(b, true, Z1 - 0.1, R.x0, R.x1, [], FR, FR + R.h, P, WALL_DARK);
    wall(b, false, R.x0, 0, Z1, [], FR, FR + R.h, P, WALL_DARK);
    wall(b, false, R.x1, 0, Z1, [], FR, FR + R.h, P, WALL_DARK);
    b.box((R.x0 + R.x1) / 2, FR + R.h - 0.1, (-0.1 + Z1) / 2, R.x1 - R.x0 + 0.2, 0.2, Z1 + 0.1, ROOF);
    b.boxes[b.boxes.length - 1]!.overhead = true;
    const H = ROOF_HATCH;
    const ry1 = FR + 0.55;
    b.box(H.x0 - 0.05, ry1, (H.z0 + H.z1) / 2, 0.1, 1.1, H.z1 - H.z0 + 0.2, STEEL);
    b.box(H.x1 + 0.05, ry1, (H.z0 + H.z1) / 2, 0.1, 1.1, H.z1 - H.z0 + 0.2, STEEL);
    b.box((H.x0 + H.x1) / 2, ry1, H.z0 - 0.05, H.x1 - H.x0, 1.1, 0.1, STEEL);
    b.mark(j0, { noLedge: true });
    doorIn(b, true, 0, -16, FR);
    b.ladder(H.ladder[0], H.ladder[1], F2, FR, 0);
    // (S2-G4, C12) the window-cleaning davit on the north parapet: a rappel 7.9 m down to the sunshade ledge (4.4), beside
    // the facilities window (the `traversal.ts:122` rope-to-window case)
    b.rappel(DAVIT.x, FR, DAVIT.z, 0, DAVIT.length);
    // (campus-fence-s2s5) the anti-climb caps on the parapet and round the sunshade (`S2_EDGE_CAPS`)
    buildEdgeCaps(b, S2_EDGE_CAPS);
  }

  // ---- the C2 bridge (L1, x 4..10, z -16..-12): walls 3.0, a roof, the floor slab; a card door in the east wall (the gap above)
  {
    const i0 = b.boxes.length;
    wall(b, true, -16, 4, 10, [], F1, F1 + 3.0, T);
    wall(b, true, -12, 4, 10, [], F1, F1 + 3.0, T);
    b.box(7, F1 - 0.1, -14, 6, 0.2, 4.3, SLAB);
    b.box(7, F1 + 3.1, -14, 6.3, 0.2, 4.3, SLAB);
    b.mark(i0, { noLedge: true });
    b.boxes[b.boxes.length - 1]!.overhead = true;
    b.boxes[b.boxes.length - 2]!.overhead = true;
    // the card door and the far door (the lab block's west wall, S3 builds it later)
    doorIn(b, false, X1, -14, F1);
  }

  // ---- lamps (SPEC "Lighting"): every one from the `S2_LIGHTS` block
  for (const l of S2_LIGHTS) lamp(b, l);

  // ---- ambient (SPEC lighting rules, LR7): the whole building at the standby fill 0.14; the fire stairs and C2 are transit spaces at 0.30
  b.ambientZone(X0, X1, Z0, Z1, 0.14, -1, 13.6);
  for (const c of S2_CORES) b.ambientZone(c.x0, c.x1, c.z0, c.z1, 0.3, -1, BULKHEAD_TOP);
  b.ambientZone(C2_BOX[0], C2_BOX[2], C2_BOX[1], C2_BOX[3], 0.3, 4.0, 7.8);
}
