import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import { makeCone } from '../lights';
import type { ShutterSpec } from '../../game/kit/shutter';
import { placeShutter } from '../shutterDoor';
import { stairSteps, type CoopLip } from './ctcourseGreybox';
import { doorIn, duct, lamp, mass, MASS_TOP, OUTER, screen, T, wall, Y, type DropGuard, type WharfPull, type WharfSection } from './tallowWharfKit';

/**
 * Tallow Wharf section W4, the wharf sheds (mission-framework GB4; `docs/missions/slices/GB-briefs.md` GB4): the back lane and
 * the apron, shed three (the clerestory boost, C9), shed two (the placed shutter, C8), the open shed yard, the crane gantry
 * and its north arm (caged by drop guards), the walkable canal bed, the jetty (the pull-up edge, C10) and the boat. Greybox:
 * every box is `noLedge` but the one planned lip (a manual ledge on a `noLedge` wall). Frame: x east, z north, y up; yaw 0
 * faces +z (the canal is the south edge, z 0-6).
 *
 * J8 G4 (`docs/tallow-fixes/LIGHT.md` sections 4-5, EGRESS E4):
 * - lights: every fitting is on (18 lamps, groups 91-98). Shed three is a staffed store under four pendants; the yard is watched
 *   under the gate flood and two crane work floods hung under the gantry deck; the jetty under the loading-door flood and the
 *   gangway lamp; shed two is closed, its exit lamp only (the map's darkest real spot); the lane has four photocell lamps with
 *   long gaps between them. Switched circuits (91-93) carry conduit runs (`W4_CONDUITS`); 94-98 have none (photocell,
 *   maintained, aviation, the launch's battery);
 * - darkness from cover, real gaps, cuts and shots: the stack alley in shed three (two tea-chest stacks west of the foreman's
 *   x 85 leg), the cart line in the yard (two drays) and the crane's rope bin; hide spots by every takedown spot, a medkit on
 *   the back lane;
 * - the way back from the jetty to a partner on the canal bed is the drop off the jetty's open south edge (x 72-76, the pull
 *   edge; `w4-jetty-drop`): no new top by it;
 * - the crane's red aviation lamp is raised to (88, 14, 5) on its jib so the W3 roof sees it (O20); the launch carries its own
 *   masthead light (O6) on a visual mast;
 * - the gantry's north screen has a clear-glass look-out bay x 50-54 for the yard vantages; the shed three vantages watch
 *   through the fire door from shed two.
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

/** The clerestory sash (shed three's north wall): a 1.2 wide x 2.0 high opening over the boost lip (2.0: a standing body's room for the climb-up, `AttachController.climbRoom`). */
const SASH = { x0: 78.4, x1: 79.6, y0: 4.4, y1: 6.4 } as const;
/** The sheds' walls run 0-6.7 and their roofs 6.7-7.0 (over the sash head 6.4-6.7). */
const SHED_TOP = 6.7;
const SHED_ROOF = 7.0;
const LIP_ID = 'w4-lip-clerestory';
const LIP_X = [78.65, 79.35] as const;
/** Shed north walls: 0.6 thick, centred on z 28 (face at z 28.3). */
const NORTH = { at: 28, face: 28.3 } as const;

/** C8: shed two's shutter, placed by `placeShutter` in `build` (J9 S3; shut on the guards' nav, A15, and it stops lamp light, A16). */
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
  // the look-out bay x 50-54 (closed by a clear glass pane: bodies stop, sight and light pass) and the arm's join
  'w4-dg-gantry-n': [[50.0, 54.0], [84, 85.2]],
};

type P3 = readonly [number, number, number];
/** The switches' wall points (switch x / z, floor + 1.2): 91 by the fire door, 93 the gate box. */
const S91: P3 = [85.4, 1.2, 20.4];
const S93: P3 = [63.4, 1.2, 27.6];
/** The 93 run along the yard's north wall top, the crane's feed cable across to its west leg (48.5, 18.8), up the leg, then under the gantry deck's north edge to a crane flood at x. */
const run93Crane = (x: number): P3[] => [S93, [63.4, 6.2, 27.6], [48.5, 6.2, 27.6], [48.5, 6.2, 19.05], [48.5, 9.5, 19.05], [x, 9.5, 19.05], [x, 9.5, 17.25]];

/**
 * LIGHT.md rule 6: one conduit run per fitting of the switched groups 91, 92 and 93, from the switch's wall point up to the run
 * height (`yRun` 6.4 / 4.2 / 6.2), along x, along z, to the fitting (visual only, 0.05 m, #4f5459).
 */
export const W4_CONDUITS: readonly { group: number; pts: readonly P3[] }[] = [
  // 91 the shed three pendants: up the party wall by the fire door, west under the roof at z 20.4, then along z to each pendant
  ...([[75, 13.5], [75, 21.5], [80.5, 13.5], [80.5, 21.5]] as const).map(([x, z]) => ({ group: 91, pts: [S91, [85.4, 6.4, 20.4], [x, 6.4, 20.4], [x, 6.4, z], [x, 5.6, z]] as P3[] })),
  // 92 the loading-door flood: up the south wall inside the door, west to its head, out over the door's head
  { group: 92, pts: [[81.2, 1.2, 10.6], [81.2, 4.2, 10.6], [79, 4.2, 10.6], [79, 4.2, 9.7]] },
  // 93 the gate flood: up the gate box's wall, east along the mass over the gate to the flood
  { group: 93, pts: [S93, [63.4, 6.2, 27.6], [66, 6.2, 27.6], [66, 6.2, 27.2]] },
  // 93 the crane work floods
  { group: 93, pts: run93Crane(53) },
  { group: 93, pts: run93Crane(65) },
];

/** A conduit run: one visual-only 0.05 m box per leg. */
function conduit(b: LevelBuilder, pts: readonly P3[]): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const e = pts[i + 1]!;
    b.box((a[0] + e[0]) / 2, (a[1] + e[1]) / 2, (a[2] + e[2]) / 2, Math.abs(e[0] - a[0]) + 0.05, Math.abs(e[1] - a[1]) + 0.05, Math.abs(e[2] - a[2]) + 0.05, '#4f5459', 0, 0, false);
  }
}

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

  // ---- the shed yard's cover: the cart line (two drays north of the patrol line) and the crane's rope bin under the gantry ----
  bx(b, 52.0, 55.0, 0, 1.6, 22.0, 23.4, C.hull); // the west dray
  bx(b, 59.0, 62.0, 0, 1.6, 22.0, 23.4, C.hull); // the east dray
  bx(b, 63.0, 64.0, 0, 0.9, 14.6, 15.4, C.dark); // the crane's rope bin, 3 m east of the yard ladder

  // ---- the jetty (a solid block, -4.4 to 0), its fence and gate, its south rail (open x 72-76 for the pull, and at the gangway) ----
  bx(b, 72, 100, Y.canalBed, 0, 6, 10, C.dark);
  wall(b, false, 72, 5, 10, [], Y.canalBed, 0, T, C.rail); // the fence's foot, 1.0 m out over the canal
  wall(b, false, 72, 5, 10, [[7.4, 8.6]], 0, 2.4, T, C.rail); // the fence (2.4), its gate gap at z 8
  doorIn(b, false, 72, 8, 0);
  bx(b, 76, 86.75, 0, 1.1, 6.0, 6.1, C.rail);
  bx(b, 89.25, 100, 0, 1.1, 6.0, 6.1, C.rail);
  // the crane's red aviation lamp sits on a jib box over the jetty (off the gantry), raised so the W3 roof sees it (O20)
  bx(b, 86, 90, 13.6, 13.9, 4.7, 5.3, C.steel);

  // ---- the boat and the gangway (jetty steps: one element, both links) ----
  bx(b, 84, 96, Y.canalBed, Y.boat, 1, 5, C.hull);
  bx(b, 89.95, 90.05, Y.boat, 2.9, 2.95, 3.05, C.steel, false); // the launch's mast (visual), under its masthead light
  bx(b, 86.75, 89.25, Y.canalBed, Y.boat, 5, 6, C.hull); // the steps' solid body down to the bed
  const st = stairSteps(1);
  const i0 = b.boxes.length;
  b.stairs(88, 4.3 + st.len / 2, 2.5, st.len, 1, st.steps, C.dark, 0, Y.boat);
  b.mark(i0, { noLedge: true });

  // ---- shed three (x 72-86): walls, roof, the clerestory sash, the tea-chest stack ----
  wall(b, false, 72, 9.85, NORTH.face, [[18.4, 19.6]], 0, SHED_TOP, T, C.wall); // west wall: the yard door at z 19
  doorIn(b, false, 72, 19, 0);
  wall(b, false, 86, 9.85, NORTH.face, [[18.4, 19.6]], 0, SHED_TOP, T, C.wall); // party wall with shed two: the fire door at z 19
  doorIn(b, false, 86, 19, 0);
  wall(b, true, 10, 72, 86, [[77.5, 80.5]], 0, SHED_TOP, T, C.wall, 3.0); // south wall: the sliding loading door (3.0 wide)
  b.door(77.5, 0, 10, 3, PI / 2, { height: 3, leaf: 'slide' });
  // north wall: 0-4.4 all along (the lip's face), over it 4.4-6.7 but the sash
  bx(b, 72, 86, 0, SASH.y0, NORTH.at - OUTER / 2, NORTH.face, C.wall);
  bx(b, 72, SASH.x0, SASH.y0, SHED_TOP, NORTH.at - OUTER / 2, NORTH.face, C.wall);
  bx(b, SASH.x1, 86, SASH.y0, SHED_TOP, NORTH.at - OUTER / 2, NORTH.face, C.wall);
  bx(b, SASH.x0, SASH.x1, SASH.y1, SHED_TOP, NORTH.at - OUTER / 2, NORTH.face, C.wall);
  bx(b, 71.85, 86.15, SHED_TOP, SHED_ROOF, 9.85, NORTH.face, C.roof);
  bx(b, 74, 84, SHED_ROOF, SHED_ROOF + 0.6, 24, 26, C.glaze, false); // north-light glazing (visual)
  bx(b, 77.5, 80.5, 0, 2.0, 25.5, 27.7, C.crate); // the tea-chest stack under the sash: the way down
  // the stack alley (cover): two tea-chest stacks west of the foreman's x 85 leg (the alley x 84.0-85.85), their gap z 17.6-20.4 facing the fire door
  bx(b, 82.4, 84.0, 0, 2.4, 13.0, 17.6, C.crate); // the south stack
  bx(b, 82.4, 84.0, 0, 2.4, 20.4, 25.0, C.crate); // the north stack
  bx(b, 81.6, 82.4, 0, 0.8, 14.6, 15.4, C.crate); // an open empty chest at the south stack's west foot
  bx(b, 72.15, 73.0, 0, 0.9, 15.0, 16.0, C.crate); // a sack hamper on the west wall, south of the yard door
  // the planned lip: a manual ledge on the noLedge wall face, x 78.65-79.35, top 4.4, normal +z (the lane)
  b.ledge(LIP_X[1], NORTH.face, LIP_X[0], NORTH.face, 4.4, { drop: 4.4, canHang: true, canClimbUp: true });

  // ---- shed two (x 86-100): the placed shutter in the north wall, the canal door in the south wall ----
  wall(b, true, NORTH.at, 86, 100, [[90.5, 93.5]], 0, SHED_TOP, OUTER, C.wall, 3.0);
  const iShutter = b.boxes.length;
  placeShutter(b, W4_SHUTTER);
  b.mark(iShutter, { noLedge: true }); // the head box and guides: never a lip (only planned lips, A28)
  wall(b, true, 10, 86, 100, [[92.4, 93.6]], 0, SHED_TOP, T, C.wall);
  doorIn(b, true, 10, 93, 0);
  bx(b, 85.85, 100, SHED_TOP, SHED_ROOF, 9.85, NORTH.face, C.roof);
  bx(b, 88, 98, SHED_ROOF, SHED_ROOF + 0.6, 24, 26, C.glaze, false);

  // ---- the crane gantry (y 10) over the yard and shed three, its north arm, the ladders ----
  bx(b, 48, 85.2, Y.gantry - 0.3, Y.gantry, 15, 19, C.steel);
  for (const x of [48.5, 83.5]) for (const z of [15.2, 18.8]) bx(b, x - 0.2, x + 0.2, 0, Y.gantry - 0.3, z - 0.2, z + 0.2, C.steel);
  bx(b, 84, 85.2, Y.gantry - 0.3, Y.gantry, 19, 29.4, C.steel); // the north arm
  for (const g of W4_DROP_GUARDS) guard(b, g);
  // the crane man's look-out over the yard: the north screen's bay x 50-54 closed by clear glass (no ledge; G45)
  b.glass(50.0, 19, 54.0, 19, 2.2, Y.gantry, 'clear');
  b.ladder(60, 14.55, 0, Y.gantry, 0); // the yard leg, on the gantry's south face (climber south, facing +z)
  b.ladder(84.6, 29.85, 0, Y.gantry, PI); // the arm's ladder, off its north end down to the apron

  // ---- lights (LIGHT.md section 5: every fitting on; darkness from the stacks, the carts, real gaps, cuts and shots) ----
  // 91 shed three pendants over the working floor (switch by the fire door)
  for (const [x, z] of [[75, 13.5], [75, 21.5], [80.5, 13.5], [80.5, 21.5]] as const) lamp(b, x, 5.4, z, { r: 8, i: 1.5, group: 91 });
  // 92 loading-door flood over the jetty's middle (switch inside the loading door)
  lamp(b, 79, 4.0, 9.6, { r: 12, i: 1.3, group: 92, cone: makeCone(0, -1, -0.6, 1.1) });
  // 93 yard flood at the lane gate and the two crane work floods under the gantry deck (switch: the gate box)
  lamp(b, 66, 6.0, 27.2, { r: 16, i: 1.4, group: 93, cone: makeCone(0, -1, -0.7, 1.2) });
  for (const x of [53, 65]) lamp(b, x, 9.6, 17, { r: 16, i: 3.5, group: 93, cone: makeCone(0, -1, 0, 1.0) });
  // 94 quay lamps and the gangway lamp (photocell: no switch)
  lamp(b, 50, 4.0, 6.6, { r: 7, i: 0.4, group: 94 });
  lamp(b, 64, 4.0, 6.6, { r: 7, i: 0.4, group: 94 });
  lamp(b, 88, 4.0, 9.7, { r: 7, i: 0.4, group: 94 });
  // 95 lane lamps on wall brackets, the council's (photocell): the yard gate's and three on the masses' lane face (z 34)
  lamp(b, 66, 4.0, 30.4, { r: 7, i: 0.3, group: 95 });
  for (const x of [48, 104, 117]) lamp(b, x, 5.0, 33.6, { r: 7, i: 0.3, group: 95 });
  // 96 shed two exit lamp at the canal door (maintained, vandal cage), 97 the crane's red aviation lamp on the jib head (its own supply)
  lamp(b, 93, 2.4, 10.6, { r: 4, i: 0.4, group: 96, destructible: false });
  lamp(b, 88, 14, 5, { r: 6, i: 0.6, group: 97, colour: [1, 0.1, 0.1], destructible: false, electric: false });
  // 98 the launch's masthead light (the launch's own battery, no shore switch)
  lamp(b, 90, 3.0, 3, { r: 3, i: 0.15, group: 98 });
  for (const c of W4_CONDUITS) conduit(b, c.pts);
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
  // the two built spots; the first dray's north side, the rope bin, the sack hamper, the empty chest (A9: one by every takedown spot)
  hideSpots: [
    { pos: new Vector3(76, 0, 26) },
    { pos: new Vector3(46, 0, 26) },
    { pos: new Vector3(53.5, 0, 23.8) },
    { pos: new Vector3(63.5, 0, 15.8) },
    { pos: new Vector3(73.4, 0, 15.5) },
    { pos: new Vector3(81.2, 0, 15.0) },
  ],
  // A8: the wharf company's first-aid box on the back lane's north wall (the W3 mass face z 34), across from the shed doors
  medkits: [{ pos: new Vector3(95.0, 0, 33.85), yaw: PI }],
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
    // A6 / EGRESS E4: the way back from the jetty to the canal bed is the drop off its open south edge (x 72-76, the pull edge)
    { id: 'w4-jetty-drop', label: 'W4 jetty drop to the canal bed', pos: new Vector3(74, 0, 6.3), yaw: PI },
    // G157 rule 6: two vantages per encounter (the yard from the gantry's look-out, shed three through the fire door from shed two)
    { id: 'w4-vantage-yard-a', label: 'W4 vantage: the yard from the gantry look-out', pos: new Vector3(51.0, Y.gantry, 18.6), yaw: 0 },
    { id: 'w4-vantage-yard-b', label: 'W4 vantage: the yard from the gantry look-out', pos: new Vector3(53.0, Y.gantry, 18.6), yaw: 0 },
    { id: 'w4-vantage-shed-a', label: 'W4 vantage: shed three through the fire door', pos: new Vector3(87.6, 0, 18.2), yaw: -PI / 2 },
    { id: 'w4-vantage-shed-b', label: 'W4 vantage: shed three through the fire door', pos: new Vector3(87.6, 0, 19.8), yaw: -PI / 2 },
  ],
  deviations: [
    { space: 'w4-back-lane', why: 'the apron x 72-100 z 28-30 is open too: it fronts the shed doors, the shutter and the arm ladder' },
    { space: 'w4-canal-ledge', why: 'the bed is one walkable slab over the whole W4 canal (x 44-120, z 0-6); the room keeps the graph area' },
    { space: 'w4-gantry', why: 'the walkway runs to x 85.2 so the north arm (x 84-85.2, z 19-29.4, caged) joins it; the arm ladder (84.6, 29.85) is 5.0 m from the clerestory lip; the graph marker (74, 0, 24.5) moves. The north screen has a look-out bay x 50-54 closed by clear glass (the crane man\'s look-out over the yard): bodies stop, sight and light pass, so the yard vantages see the yard north of z ~21.7 (the deck hides what is nearer). Ladders are placed by the engine convention (the climber faces the wall: the quay ladder at (58, 5.55) facing +z, the yard leg at (60, 14.55) facing +z, the arm ladder facing -z), not the brief\'s outward-facing yaws' },
    { space: 'w4-shed-two', why: 'the shutter marker (87.5, 0, 25.5) moves to the wall opening at x 92' },
    { space: 'w4-shed-three', why: 'the clerestory sash is 1.2 x 2.0 (y 4.4-6.4), not 1.2 x 1.2, and the shed walls run to 6.7 (roofs 6.7-7.0, both sheds): the climb-up off the lip needs a standing body\'s room (AttachController.climbRoom)' },
    { space: 'w4-jetty', why: 'the gangway and the jetty steps are one element (a stair x 86.75-89.25 down to the boat deck at -1)' },
    { space: 'w4-boat', why: 'the gangway and the jetty steps are one element (a stair x 86.75-89.25 down to the boat deck at -1)' },
  ],
  entry: [90, 0, 32],
  exit: [90, -1, 3],
};
