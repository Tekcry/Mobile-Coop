import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import { makeCone } from '../lights';
import type { ShutterSpec } from '../../game/kit/shutter';
import { stairSteps, type CoopLip } from './ctcourseGreybox';
import { doorIn, duct, lamp, mass, MASS_TOP, OUTER, screen, standIn, T, wall, Y, type DropGuard, type WharfPull, type WharfSection } from './tallowWharfKit';

/**
 * Tallow Wharf section W4, the wharf sheds (mission-framework GB4; `docs/missions/slices/GB-briefs.md` GB4): the back lane and
 * the apron, shed three (the clerestory boost, C9), shed two (the reserved shutter, C8), the open shed yard, the crane gantry
 * and its north arm (caged by drop guards), the walkable canal bed, the jetty (the pull-up edge, C10) and the boat. Greybox:
 * every box is `noLedge` but the one planned lip (a manual ledge on a `noLedge` wall). Frame: x east, z north, y up; yaw 0
 * faces +z (the canal is the south edge, z 0-6).
 */

const PI = Math.PI;

const C = {
  wall: '#8d887c',
  brick: '#7a5a4a',
  steel: '#8d949b',
  bed: '#1f2a30',
  dark: '#3a3f44',
  roof: '#5b6065',
  glaze: '#7aa0b8',
  rail: '#a0a4a8',
  crate: '#8a6a3c',
  hull: '#4a4036',
};

/** The clerestory sash (shed three's north wall): a 1.2 x 1.2 opening over the boost lip. */
const SASH = { x0: 78.4, x1: 79.6, y0: 4.4, y1: 5.6 } as const;
const LIP_ID = 'w4-lip-clerestory';
const LIP_X = [78.65, 79.35] as const;
/** Shed north walls: 0.6 thick, centred on z 28 (face at z 28.3). */
const NORTH = { at: 28, face: 28.3 } as const;

/** C8: shed two's shutter, reserved as data (no `placeShutter` until the kit's wiring lands; the opening is a closed stand-in). */
export const W4_SHUTTER: ShutterSpec = { id: 'w4-shutter', x: 92, y: 0, z: 28, yaw: 0, width: 3, height: 3 };

/** C10: the jetty pull-up. The holder braces at the open jetty edge, the partner jumps from the canal bed. */
export const W4_PULL: WharfPull = {
  id: 'w4-pull-jetty',
  link: 'w4-canal-ledge->w4-jetty',
  holder: { x: 73.5, y: 0, z: 6.35 },
  yaw: PI,
  partner: { x: 73.5, y: Y.canalBed, z: 5.3 },
};

/** C9: the clerestory boost lip (floor = the lane, y 0), its normal toward the lane. */
export const W4_LIP: CoopLip = { id: LIP_ID, y: 4.4, floor: 0, a: { x: LIP_X[1], z: NORTH.face }, b: { x: LIP_X[0], z: NORTH.face }, n: { x: 0, z: 1 } };

/** The gantry and its north arm are caged: 2.2 m drop guards (over the mantle, no lip). A guard is whole here; its gaps are below. */
export const W4_DROP_GUARDS: readonly DropGuard[] = [
  { id: 'w4-dg-gantry-n', a: { x: 48, z: 19 }, b: { x: 85.2, z: 19 }, y: Y.gantry, h: 2.2 },
  { id: 'w4-dg-gantry-s', a: { x: 48, z: 15 }, b: { x: 85.2, z: 15 }, y: Y.gantry, h: 2.2 },
  { id: 'w4-dg-gantry-w', a: { x: 48, z: 15 }, b: { x: 48, z: 19 }, y: Y.gantry, h: 2.2 },
  { id: 'w4-dg-gantry-e', a: { x: 85.2, z: 15 }, b: { x: 85.2, z: 19 }, y: Y.gantry, h: 2.2 },
  { id: 'w4-dg-arm-w', a: { x: 84, z: 19 }, b: { x: 84, z: 29.4 }, y: Y.gantry, h: 2.2 },
  { id: 'w4-dg-arm-e', a: { x: 85.2, z: 19 }, b: { x: 85.2, z: 29.4 }, y: Y.gantry, h: 2.2 },
];
/** Where a guard is left open along its own axis (x on a long side, z on an end): the yard ladder's top and the arm's join. */
export const W4_GUARD_GAPS: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  'w4-dg-gantry-s': [[59.4, 60.6]],
  'w4-dg-gantry-n': [[84, 85.2]],
};

/** A box over ranges (x0-x1, y0-y1, z0-z1), `noLedge`; `collide` false for visual-only pieces. */
function bx(b: LevelBuilder, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string, collide = true): void {
  const i0 = b.boxes.length;
  b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, collide, true);
  b.mark(i0, { noLedge: true });
}

/** A drop guard with its gaps cut out (screens along the segment). */
function guard(b: LevelBuilder, g: DropGuard): void {
  const horizontal = Math.abs(g.a.z - g.b.z) < 1e-6;
  const lo = horizontal ? Math.min(g.a.x, g.b.x) : Math.min(g.a.z, g.b.z);
  const hi = horizontal ? Math.max(g.a.x, g.b.x) : Math.max(g.a.z, g.b.z);
  const put = (s: number, e: number): void => {
    if (e - s < 0.01) return;
    screen(b, { ...g, a: horizontal ? { x: s, z: g.a.z } : { x: g.a.x, z: s }, b: horizontal ? { x: e, z: g.a.z } : { x: g.a.x, z: e } });
  };
  let s = lo;
  for (const gap of [...(W4_GUARD_GAPS[g.id] ?? [])].sort((p, q) => p[0] - q[0])) {
    put(s, gap[0]);
    s = gap[1];
  }
  put(s, hi);
}

function build(b: LevelBuilder): void {
  // ---- the canal (x 44-120, z 0-6): a walkable bed at -4.4, walled all round ----
  bx(b, 44, 120, Y.canalBed - 0.5, Y.canalBed, 0, 6, C.bed);
  bx(b, 44, 120, Y.canalBed, 0, -1, 0, C.brick); // south wall (the perimeter starts at y 0)
  bx(b, 120, 121, Y.canalBed, 0, -1, 6, C.brick); // east end
  bx(b, 43.7, 44, Y.canalBed, 3.0, 0, 6, C.brick); // west end (joins the W1 barrier)
  bx(b, 44, 72, Y.canalBed, -1, 6, 7, C.brick); // the quay face under the yard floor (z 6, -4.4 to 0 with the floor slab)

  // ---- masses ----
  mass(b, 100, 6, 120, 30, Y.canalBed); // east of shed two to the map edge (the lane's south side there)
  mass(b, 44, 28, 64.25, 30);
  mass(b, 67.75, 28, 69.7, 30);
  mass(b, 71.3, 28, 72, 30);
  mass(b, 64.25, 28, 67.75, 30, 4.0, MASS_TOP); // over the lane gate (3.5 wide x 4.0)
  mass(b, 69.7, 28, 71.3, 30, 1.7, MASS_TOP); // over the culvert
  duct(b, [[70.5, 30], [70.5, 27.5]], 0); // the culvert: lane -> yard (crouch)

  // ---- the quay: railing with the ladder gap, the ladder down to the bed ----
  bx(b, 44, 57.5, 0, 1.1, 6.0, 6.1, C.rail);
  bx(b, 58.5, 72, 0, 1.1, 6.0, 6.1, C.rail);
  // the climber stands in the canal facing the quay face (+z); the line is 0.45 off the face, the top at the edge (the S3 convention)
  b.ladder(58, 5.55, Y.canalBed, 0, 0);

  // ---- the jetty (a solid block, -4.4 to 0), its fence and gate, its south rail (open x 72-76 for the pull, and at the gangway) ----
  bx(b, 72, 100, Y.canalBed, 0, 6, 10, C.dark);
  wall(b, false, 72, 5, 10, [], Y.canalBed, 0, T, C.rail); // the fence's foot, 1.0 m out over the canal
  wall(b, false, 72, 5, 10, [[7.4, 8.6]], 0, 2.4, T, C.rail); // the fence (2.4), its gate gap at z 8
  doorIn(b, false, 72, 8, 0);
  bx(b, 76, 86.75, 0, 1.1, 6.0, 6.1, C.rail);
  bx(b, 89.25, 100, 0, 1.1, 6.0, 6.1, C.rail);
  // the crane's red aviation lamp sits on a jib box over the jetty (off the gantry)
  bx(b, 86, 90, 11.6, 11.9, 4.7, 5.3, C.steel);

  // ---- the boat and the gangway (jetty steps: one element, both links) ----
  bx(b, 84, 96, Y.canalBed, Y.boat, 1, 5, C.hull);
  bx(b, 86.75, 89.25, Y.canalBed, Y.boat, 5, 6, C.hull); // the steps' solid body down to the bed
  const st = stairSteps(1);
  const i0 = b.boxes.length;
  b.stairs(88, 4.3 + st.len / 2, 2.5, st.len, 1, st.steps, C.dark, 0, Y.boat);
  b.mark(i0, { noLedge: true });

  // ---- shed three (x 72-86): walls, roof, the clerestory sash, the tea-chest stack ----
  wall(b, false, 72, 9.85, NORTH.face, [[18.4, 19.6]], 0, 6, T, C.wall); // west wall: the yard door at z 19
  doorIn(b, false, 72, 19, 0);
  wall(b, false, 86, 9.85, NORTH.face, [[18.4, 19.6]], 0, 6, T, C.wall); // party wall with shed two: the fire door at z 19
  doorIn(b, false, 86, 19, 0);
  wall(b, true, 10, 72, 86, [[77.5, 80.5]], 0, 6, T, C.wall, 3.0); // south wall: the sliding loading door (3.0 wide)
  b.door(77.5, 0, 10, 3, PI / 2, { height: 3, leaf: 'slide' });
  // north wall: 0-4.4 all along (the lip's face), over it 4.4-6 but the sash
  bx(b, 72, 86, 0, SASH.y0, NORTH.at - OUTER / 2, NORTH.face, C.wall);
  bx(b, 72, SASH.x0, SASH.y0, 6, NORTH.at - OUTER / 2, NORTH.face, C.wall);
  bx(b, SASH.x1, 86, SASH.y0, 6, NORTH.at - OUTER / 2, NORTH.face, C.wall);
  bx(b, SASH.x0, SASH.x1, SASH.y1, 6, NORTH.at - OUTER / 2, NORTH.face, C.wall);
  bx(b, 71.85, 86.15, 6.0, 6.3, 9.85, NORTH.face, C.roof);
  bx(b, 74, 84, 6.3, 6.9, 24, 26, C.glaze, false); // north-light glazing (visual)
  bx(b, 77.5, 80.5, 0, 2.0, 25.5, 27.7, C.crate); // the tea-chest stack under the sash: the way down
  // the planned lip: a manual ledge on the noLedge wall face, x 78.65-79.35, top 4.4, normal +z (the lane)
  b.ledge(LIP_X[1], NORTH.face, LIP_X[0], NORTH.face, 4.4, { drop: 4.4, canHang: true, canClimbUp: true });

  // ---- shed two (x 86-100): the reserved shutter in the north wall, the canal door in the south wall ----
  wall(b, true, NORTH.at, 86, 100, [[90.5, 93.5]], 0, 6, OUTER, C.wall, 3.0);
  standIn(b, W4_SHUTTER);
  wall(b, true, 10, 86, 100, [[92.4, 93.6]], 0, 6, T, C.wall);
  doorIn(b, true, 10, 93, 0);
  bx(b, 85.85, 100, 6.0, 6.3, 9.85, NORTH.face, C.roof);
  bx(b, 88, 98, 6.3, 6.9, 24, 26, C.glaze, false);

  // ---- the crane gantry (y 10) over the yard and shed three, its north arm, the ladders ----
  bx(b, 48, 85.2, Y.gantry - 0.3, Y.gantry, 15, 19, C.steel);
  for (const x of [48.5, 83.5]) for (const z of [15.2, 18.8]) bx(b, x - 0.2, x + 0.2, 0, Y.gantry - 0.3, z - 0.2, z + 0.2, C.steel);
  bx(b, 84, 85.2, Y.gantry - 0.3, Y.gantry, 19, 29.4, C.steel); // the north arm
  for (const g of W4_DROP_GUARDS) guard(b, g);
  b.ladder(60, 14.55, 0, Y.gantry, 0); // the yard leg, on the gantry's south face (climber south, facing +z)
  b.ladder(84.6, 29.85, 0, Y.gantry, PI); // the arm's ladder, off its north end down to the apron

  // ---- lights ----
  // 91 shed three pendants (side aisle x 84-86 stays dark)
  for (const [x, z] of [[75, 14], [75, 22], [81, 14], [81, 22]] as const) lamp(b, x, 5.4, z, { r: 8, i: 0.9, group: 91 });
  // 92 loading-door flood over the jetty's middle
  lamp(b, 79, 4.0, 9.6, { r: 12, i: 1.3, group: 92, cone: makeCone(0, -1, -0.6, 1.1) });
  // 93 yard flood at the lane gate (the cart lines stay dark)
  lamp(b, 66, 6.0, 27.2, { r: 16, i: 1.4, group: 93, cone: makeCone(0, -1, -0.7, 1.2) });
  // 94 quay lamps (photocell: no switch), 95 the lane lamp at the yard gate
  lamp(b, 50, 4.0, 6.6, { r: 7, i: 0.6, group: 94 });
  lamp(b, 64, 4.0, 6.6, { r: 7, i: 0.6, group: 94 });
  lamp(b, 66, 4.0, 30.4, { r: 6, i: 0.6, group: 95 });
  // 96 shed two emergency lamp (always on), 97 the crane's red aviation lamp (a landmark)
  lamp(b, 93, 2.4, 10.6, { r: 4, i: 0.4, group: 96, destructible: false });
  lamp(b, 88, 12, 5, { r: 6, i: 0.6, group: 97, colour: [1, 0.1, 0.1], destructible: false, electric: false });
}

const ROOMS: RoomDef[] = [
  { id: 'w4-back-lane', name: 'Back Lane', minX: 44, maxX: 120, minZ: 30, maxZ: 34, minY: 0, maxY: 9.5 },
  { id: 'w4-gantry', name: 'Crane Gantry', minX: 48, maxX: 84, minZ: 15, maxZ: 19, minY: 10 },
  { id: 'w4-shed-three', name: 'Shed Three', minX: 72, maxX: 86, minZ: 10, maxZ: 28, minY: 0, maxY: 9.5 },
  { id: 'w4-shed-two', name: 'Shed Two', minX: 86, maxX: 100, minZ: 10, maxZ: 28, minY: 0, maxY: 9.5 },
  { id: 'w4-shed-yard', name: 'Shed Yard', minX: 44, maxX: 72, minZ: 6, maxZ: 28, minY: 0, maxY: 9.5 },
  { id: 'w4-canal-ledge', name: 'Canal Bed', minX: 44, maxX: 72, minZ: 3, maxZ: 6, minY: Y.canalBed, maxY: -0.5 },
  { id: 'w4-jetty', name: 'Jetty', minX: 72, maxX: 100, minZ: 6, maxZ: 10, minY: 0, maxY: 9.5 },
  { id: 'w4-boat', name: 'Boat', minX: 84, maxX: 96, minZ: 1, maxZ: 5, minY: Y.boat, maxY: 4 },
];

export const W4: WharfSection = {
  id: 'W4',
  build,
  rooms: ROOMS,
  switches: [
    { pos: new Vector3(85.4, 0, 20.4), yaw: -PI / 2, group: 91 },
    { pos: new Vector3(81.2, 0, 10.6), yaw: 0, group: 92 },
    { pos: new Vector3(63.4, 0, 27.6), yaw: PI, group: 93 },
  ],
  hideSpots: [{ pos: new Vector3(76, 0, 26) }, { pos: new Vector3(46, 0, 26) }],
  navSeeds: [new Vector3(90, 0, 32), new Vector3(58, 0, 18), new Vector3(79, 0, 18), new Vector3(93, 0, 18), new Vector3(86, 0, 8), new Vector3(66, 10, 17), new Vector3(90, -1, 3)],
  lips: [W4_LIP],
  legUps: [{ lip: LIP_ID, x: 79, y: 0, z: 29.2, facing: { x: 0, z: -1 } }],
  pulls: [W4_PULL],
  ropes: [],
  throws: [],
  shutters: [W4_SHUTTER],
  dropGuards: W4_DROP_GUARDS,
  doors: {
    'w4-jetty-gate': [72, 0, 8],
    'w4-shed3-yard': [72, 0, 19],
  },
  debugPoints: [
    { id: 'w4-lane', label: 'W4 lane checkpoint', pos: new Vector3(90, 0, 32), yaw: PI },
    { id: 'w4-clerestory', label: 'W4 clerestory leg-up', pos: new Vector3(79, 0, 29.2), yaw: PI },
    { id: 'w4-shutter', label: 'W4 shed two shutter', pos: new Vector3(92, 0, 29.2), yaw: PI },
    { id: 'w4-canal-bed', label: 'W4 canal bed (pull)', pos: new Vector3(73.5, Y.canalBed, 5.0), yaw: 0 },
    { id: 'w4-boat', label: 'W4 boat', pos: new Vector3(90, Y.boat, 3), yaw: 0 },
  ],
  deviations: [
    { space: 'w4-back-lane', why: 'the apron x 72-100 z 28-30 is open too: it fronts the shed doors, the shutter and the arm ladder' },
    { space: 'w4-canal-ledge', why: 'the bed is one walkable slab over the whole W4 canal (x 44-120, z 0-6); the room keeps the graph area' },
    { space: 'w4-gantry', why: 'the walkway runs to x 85.2 so the north arm (x 84-85.2, z 19-29.4, caged) joins it; the arm ladder (84.6, 29.85) is 5.0 m from the clerestory lip; the graph marker (74, 0, 24.5) moves. Ladders are placed by the engine convention (the climber faces the wall: the quay ladder at (58, 5.55) facing +z, the yard leg at (60, 14.55) facing +z, the arm ladder facing -z), not the brief\'s outward-facing yaws' },
    { space: 'w4-shed-two', why: 'the shutter marker (87.5, 0, 25.5) moves to the wall opening at x 92' },
    { space: 'w4-jetty', why: 'the gangway and the jetty steps are one element (a stair x 86.75-89.25 down to the boat deck at -1)' },
    { space: 'w4-boat', why: 'the gangway and the jetty steps are one element (a stair x 86.75-89.25 down to the boat deck at -1)' },
  ],
  entry: [90, 0, 32],
  exit: [90, -1, 3],
};
