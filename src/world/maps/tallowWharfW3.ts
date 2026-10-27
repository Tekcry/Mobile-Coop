import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import { makeCone } from '../lights';
import type { RoomDef } from '../rooms';
import type { CoopLip } from './ctcourseGreybox';
import { stairSteps } from './ctcourseGreybox';
import { doorIn, duct, lamp, mass, OUTER, PARAPET, screen, T, wall, type DropGuard, type WharfSection } from './tallowWharfKit';

/**
 * Tallow Wharf section W3, the counting house (mission-framework GB3; `docs/missions/slices/GB-briefs.md` "GB3"; graph
 * `docs/missions/prototypes/campaign-map/graph.json`, spaces `w3-*`). Greybox: boxes, doors, ducts, lamps, switches, hide spots.
 * Frame: world metres, x east, z north, y up; a `y` below is the feet height of a walking surface; yaw 0 faces +z.
 *
 * The east and west wings with the passage between them, the strongroom and the front hall behind, the two key posts at the back
 * and the partners' office, a lodge and an east yard with a fire escape up to the roof, the coal yard with the cart gate onto
 * the cartway, and the roof over the lot. C7 (the chute vent, a co-op boost over a 4.4 m wall lip) is the forced co-op move; the
 * roof's coal-yard edge is a 2.2 m drop guard so a drop cannot skip it. Every box is `noLedge` but the one planned lip
 * (`w3-lip-chute`, a manual ledge).
 *
 * J8 tallow-fixes G3: the house is lit to LIGHT.md section 4 (31 lamps, groups 80-90, every one on: no light left off; the lights
 * basis), the yard fire escape runs down east to a foot beside the east gate (D0's TKL default, EGRESS E9), and cover, hide spots,
 * a medkit and the encounter vantages are added (A8, A9, G157 6). No W3 stair is added (EGRESS section 3, pick 4): the bulkhead
 * stair and the fire escape are met by their 16.5 m separation. The corner bay (x 82-86.5) and its parapet break are unchanged
 * (A28 C5: the widening is on the W2 side).
 *
 * Deviations from the brief (each also in the report): the east-wing / roof stair doors are both at the north end (a two-flight
 * switchback has both doors at one end); the passage's west door is at z 52.95 not 53.75 (a wall 0.9 m from the booster's side
 * probe fails `roomForBoost`); the coal-yard door is at x 99.0 not 99.5 (x 99.5 is inside the yards' dividing wall, so a one-door
 * vestibule x 98-99.85 z 50-51.7 is carved from it); the fire escape's band is z 49.1-52.0 less 0.3 (the wing and passage walls
 * are 0.6 thick, their yard face z 51.7), and its upper flight is steeper (4.8 m run: the yard has no room for a 7.1 m one); the
 * masses under the roof stop at 8.1 (the roof slab); the old-roof lantern test point is z 61.2.
 */

type Rect = readonly [number, number, number, number];

const PI = Math.PI;
/** The roof box, and the two holes in its slab: the lantern and the bulkhead core. */
const ROOF: Rect = [82, 52, 120, 80];
const LANTERN: Rect = [87, 61, 91, 65];
const CORE: Rect = [112.4, 58.6, 115.2, 69.4];
/** The roof slab's top (the walking surface), its underside, and the walls' top under it. */
const ROOF_Y = 8.4;
const UNDER = 8.1;
/** A low ceiling's underside: the wings, the hall, the strongroom, the posts and the office. */
const CEIL = 3.3;
const YARD_WALL = 6.0;
const YARD_WALL_DIVIDE = 6.5;
const PASSAGE_CEIL = 6.0;
/** The chute opening's head and the hood's underside over the lip (4.4 + 1.9: a standing body's room for the climb-up). */
const CHUTE_HEAD = 6.3;
const COLOUR_MOON: [number, number, number] = [0.7, 0.8, 1];
const WARM: [number, number, number] = [1, 0.82, 0.55];

/** The key posts' key switch points (GB5's pair gate): 21 m apart with the front hall between them (no line of sight). */
export const W3_KEY_POSTS = { east: [109, 0, 76.4], west: [88, 0, 76.4] } as const;

/** The desks the W3 desk and table lamps stand on (LIGHT.md section 1 rule 7): visual-only boxes [x0, z0, x1, z1, floorY], top 0.75 over the floor. */
export const W3_DESKS: readonly (readonly [number, number, number, number, number])[] = [
  [109.4, 57.9, 110.6, 58.5, 0],
  [115.4, 57.9, 116.6, 58.5, 0],
  [89.4, 55.9, 90.6, 56.5, 0],
  [116.4, 76.2, 117.6, 76.8, 0],
];
const DESK_TOP = 0.75;

type P3 = readonly [number, number, number];
const S80: P3 = [115.9, 1.2, 51.4];
const S84: P3 = [106.4, 1.2, 65.9];
const S85: P3 = [95.6, 1.2, 66.4];
/** The 84 runs: every one starts at the switch and climbs to the run height 3.1, then goes along x, then z (LIGHT.md section 1 rule 6). */
const run84 = (...rest: P3[]): readonly P3[] => [S84, [106.4, 3.1, 65.9], ...rest];
/** The 85 pendants' runs: the run height 7.9 under the roof slab; the last leg is the pendant's rod. */
const run85 = (x: number, z: number): readonly P3[] => [S85, [95.6, 7.9, 66.4], [x, 7.9, 66.4], [x, 7.9, z], [x, 4.05, z]];

/**
 * The switched circuits' visible conduit runs (LIGHT.md section 1 rule 6): one polyline per fitting of groups 80, 81, 84 and
 * 85, from the switch's wall point (x, 1.2, z) to within 0.3 m of the fitting. 82, 83 (desk lamps switched at the lamp) and 87
 * (a lamp socket by the door) have none.
 */
export const W3_CONDUITS: readonly { group: number; pts: readonly P3[] }[] = [
  // 80 gate lamp: along the lodge's north wall under its ceiling, out through its west wall, on along the wing's yard face over the gate head
  { group: 80, pts: [S80, [115.9, 3.0, 51.4], [115.9, 3.0, 51.65], [112, 3.0, 51.65]] },
  // 80 flood: out through the lodge's west wall, then south along its yard face under the eaves
  { group: 80, pts: [S80, [115.9, 3.0, 51.4], [113.7, 3.0, 51.4], [113.7, 3.0, 46.0]] },
  // 80 head lamp: up the wing's yard face just east of the head landing, chased into the wall top and up through the parapet's end, up the post, out along its bracket arm
  { group: 80, pts: [S80, [115.9, 3.0, 51.4], [115.9, 3.0, 51.65], [109.45, 3.0, 51.65], [109.45, 8.0, 51.65], [109.45, 8.0, 52.15], [109.45, 10.0, 52.15], [109.2, 10.0, 52.15]] },
  // 81 lodge lamp
  { group: 81, pts: [[114.4, 1.2, 49.0], [114.4, 2.8, 49.0], [117, 2.8, 49.0], [117, 2.8, 48.0]] },
  // 84 (yRun 3.1 under the 3.3 ceilings; the runs to the far side go round the bulkhead core x 112.4-115.2 z 58.6-69.4 on x 111.8)
  { group: 84, pts: run84([101, 3.1, 65.9], [101, 3.1, 68]) },
  { group: 84, pts: run84([107.5, 3.1, 65.9], [107.5, 3.1, 68]) },
  { group: 84, pts: run84([109.2, 3.1, 65.9]) },
  { group: 84, pts: run84([109.2, 3.1, 65.9], [109.2, 3.1, 59]) },
  { group: 84, pts: run84([111.8, 3.1, 65.9], [111.8, 3.1, 55.3], [113.8, 3.1, 55.3]) },
  { group: 84, pts: run84([111.8, 3.1, 65.9], [111.8, 3.1, 57.6], [117.6, 3.1, 57.6], [117.6, 3.1, 59]) },
  { group: 84, pts: run84([111.8, 3.1, 65.9], [111.8, 3.1, 70.0], [117.6, 3.1, 70.0], [117.6, 3.1, 66]) },
  { group: 84, pts: run84([111.8, 3.1, 65.9], [111.8, 3.1, 70.0], [113.8, 3.1, 70.0], [113.8, 3.1, 71.7]) },
  // 85 pendants, and the copying-desk lamp by a floor duct
  { group: 85, pts: run85(85, 55.5) },
  { group: 85, pts: run85(93, 55.5) },
  { group: 85, pts: run85(85, 70.5) },
  { group: 85, pts: run85(93, 70.5) },
  { group: 85, pts: run85(83.6, 63) },
  { group: 85, pts: run85(94.4, 63) },
  { group: 85, pts: [S85, [95.6, 0.05, 66.4], [90, 0.05, 66.4], [90, 0.05, 56.0], [90, 0.95, 56.0]] },
];

/** A conduit run: a visual-only 0.05 x 0.05 box per leg (`collide` false), each leg running 0.05 past its ends so the corners meet. */
function conduit(b: LevelBuilder, pts: readonly P3[]): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const e = pts[i + 1]!;
    const sx = Math.abs(e[0] - a[0]) + 0.05;
    const sy = Math.abs(e[1] - a[1]) + 0.05;
    const sz = Math.abs(e[2] - a[2]) + 0.05;
    b.box((a[0] + e[0]) / 2, (a[1] + e[1]) / 2, (a[2] + e[2]) / 2, sx, sy, sz, '#4f5459', 0, 0, false);
  }
}

/** The chute's boost lip: a manual ledge on the passage's south wall face, 4.4 over the passage floor, facing into the passage (+z). */
const LIP_CHUTE: CoopLip = { id: 'w3-lip-chute', y: 4.4, floor: 0, a: { x: 96.75, z: 52.3 }, b: { x: 97.45, z: 52.3 }, n: { x: 0, z: 1 } };
const LEGUP_CHUTE = { lip: 'w3-lip-chute', x: 97.1, y: 0, z: 53.2, facing: { x: 0, z: -1 } } as const;

/** The roof's coal-yard edge: a solid screen over the 1.8 m mantle with no lip (a drop onto the yard would skip C7). It runs to
 *  x 100, over the vestibule x 98-99.85 behind the coal-yard door too (the vestibule opens onto the yard). */
const DG_COALYARD: DropGuard = { id: 'w3-dg-coalyard', a: { x: 82, z: 52 }, b: { x: 100, z: 52 }, y: ROOF_Y, h: 2.2 };

const DOORS: Readonly<Record<string, readonly [number, number, number]>> = {
  'w3-bridge': [82, 8.4, 69.2],
  'w3-chute-hatch': [97.1, 4.4, 50.0],
  'w3-coalyard-door': [99.0, 0, 52],
  'w3-strongroom': [101, 0, 55.5],
  'w3-east-gate': [112, 0, 52],
  // the bulkhead stair's foot leaf (A30: G2 bolts it, TKL only; the top leaf shares its x / z and is not named)
  'w3-bulkhead-foot': [112.5, 0, 68],
  'w3-conn-near': [90.9, 0, 38],
  // the roller leaf beside the wicket: GB5 bolts both leaves of the cart gate
  'w3-conn-roller': [89.4, 0, 38],
};

/** `r` minus the holes, as up to four rectangles per hole. */
function carve(r: Rect, holes: readonly Rect[]): Rect[] {
  let out: Rect[] = [r];
  for (const h of holes) {
    const next: Rect[] = [];
    for (const q of out) {
      if (h[2] <= q[0] || h[0] >= q[2] || h[3] <= q[1] || h[1] >= q[3]) {
        next.push(q);
        continue;
      }
      if (h[0] > q[0]) next.push([q[0], q[1], h[0], q[3]]);
      if (h[2] < q[2]) next.push([h[2], q[1], q[2], q[3]]);
      const x0 = Math.max(q[0], h[0]);
      const x1 = Math.min(q[2], h[2]);
      if (h[1] > q[1]) next.push([x0, q[1], x1, h[1]]);
      if (h[3] < q[3]) next.push([x0, h[3], x1, q[3]]);
    }
    out = next;
  }
  return out;
}

/** A solid `noLedge` slab or block over a plan rectangle (minus holes) from `y0` to `y1`. */
function fill(b: LevelBuilder, r: Rect, holes: readonly Rect[], y0: number, y1: number): void {
  for (const q of carve(r, holes)) mass(b, q[0], q[1], q[2], q[3], y0, y1);
}

const room = (id: string, name: string, r: Rect, o: { minY?: number; maxY?: number } = {}): RoomDef => ({ id, name, minX: r[0], minZ: r[1], maxX: r[2], maxZ: r[3], ...o });

const ROOMS: RoomDef[] = [
  room('w3-roof', 'Counting house roof', [82, 52, 120, 80], { minY: 8.4 }),
  room('w3-chute', 'Coal chute', [96.5, 50.0, 97.7, 52.0], { minY: 4.4 }),
  room('w3-east-yard', 'East yard', [100, 38, 114, 52], { maxY: 4 }),
  room('w3-lodge', 'Gate lodge', [114, 44, 120, 52], { maxY: 4 }),
  room('w3-east-wing', 'East wing', [106, 52, 120, 74], { maxY: 8 }),
  room('w3-partners-office', "Partners' office", [113, 74, 120, 78], { maxY: 4 }),
  room('w3-east-post', 'East key post', [106, 74, 112, 78], { maxY: 4 }),
  room('w3-passage', 'Passage', [96, 52, 106, 55.5], { maxY: 8 }),
  room('w3-strongroom', 'Strongroom', [98, 56, 104, 64], { maxY: 4 }),
  room('w3-west-wing', 'West wing', [82, 52, 96, 74], { maxY: 8 }),
  room('w3-west-post', 'West key post', [85, 74, 91, 78], { maxY: 4 }),
  room('w3-coal-yard', 'Coal yard', [82, 38, 98, 52], { maxY: 4 }),
  room('w3-cartway', 'Cartway', [88, 34, 92, 38], { maxY: 4 }),
  // not a graph space: the front hall between the wings (the link w3-east-wing -> w3-west-wing)
  room('w3-front-hall', 'Front hall', [96, 64, 106, 72], { maxY: 4 }),
];

function build(b: LevelBuilder): void {
  // ---- the roof ----
  fill(b, ROOF, [LANTERN, CORE], UNDER, ROOF_Y);
  // parapets (1.1): north z 80, east x 120, west x 82 (break z 64.5-67.5 for the throw, the bridge door frame z 68.3-70.1), south z 52 east of the drop guard (break at the fire escape head x 108.0-109.3)
  mass(b, 82, 79.7, 120, 80, ROOF_Y, ROOF_Y + PARAPET);
  mass(b, 119.7, 52, 120, 79.7, ROOF_Y, ROOF_Y + PARAPET);
  for (const [z0, z1] of [[52, 64.5], [67.5, 68.3], [70.1, 79.7]] as const) mass(b, 82, z0, 82.3, z1, ROOF_Y, ROOF_Y + PARAPET);
  mass(b, 100, 52, 108.0, 52.3, ROOF_Y, ROOF_Y + PARAPET);
  mass(b, 109.3, 52, 120, 52.3, ROOF_Y, ROOF_Y + PARAPET);
  screen(b, DG_COALYARD);
  // the bridge door frame (opens from the counting-house side; GB5 bolts it)
  wall(b, false, 82.15, 68.3, 70.1, [[68.6, 69.8]], ROOF_Y, 11.0, T);
  doorIn(b, false, 82, 69.2, ROOF_Y);
  // the turret clock
  mass(b, 99, 64, 103, 68, ROOF_Y, 12);
  // the lantern: a 1.0 glazed upstand round the opening, open at a sash on its south side
  wall(b, true, 60.9, 86.8, 91.2, [[88.4, 89.6]], ROOF_Y, ROOF_Y + 1.0, 0.2, undefined, 1.0);
  wall(b, true, 65.1, 86.8, 91.2, [], ROOF_Y, ROOF_Y + 1.0, 0.2);
  wall(b, false, 86.9, 60.9, 65.2, [], ROOF_Y, ROOF_Y + 1.0, 0.2);
  wall(b, false, 91.1, 60.9, 65.2, [], ROOF_Y, ROOF_Y + 1.0, 0.2);

  // ---- the bulkhead stair (roof -> east wing): a core x 112.4-115.2 z 58.6-69.4, two switchback flights, both doors at the north end ----
  wall(b, false, 112.5, 58.6, 69.4, [[67.4, 68.6]], 0, ROOF_Y, 0.2);
  wall(b, false, 112.5, 58.6, 69.4, [[67.4, 68.6]], ROOF_Y, 10.6, 0.2);
  wall(b, false, 115.1, 58.6, 69.4, [], 0, 10.6, 0.2);
  wall(b, true, 58.7, 112.6, 115.0, [], 0, 10.6, 0.2);
  wall(b, true, 69.3, 112.6, 115.0, [], 0, 10.6, 0.2);
  mass(b, CORE[0], CORE[1], CORE[2], CORE[3], 10.6, 10.8);
  const flight = stairSteps(4.2);
  // flight 1 (west half): foot at the north end (y 0, z 67.2) rising south to the half landing (y 4.2, z 60.075)
  b.stairs(113.2, 63.6375, 1.2, flight.len, 4.2, flight.steps, '#6a6f74', PI, 0);
  // flight 2 (east half): from the half landing rising north to the top landing (y 8.4, z 67.2)
  b.stairs(114.4, 63.6375, 1.2, flight.len, 4.2, flight.steps, '#6a6f74', 0, 4.2);
  mass(b, 112.6, 58.8, 115.0, 60.075, 0, 4.2);
  mass(b, 113.8, 60.075, 115.0, 67.2, 0, 4.2);
  mass(b, 112.6, 67.2, 115.0, 69.2, 8.2, ROOF_Y);
  doorIn(b, false, 112.5, 68, 0);
  doorIn(b, false, 112.5, 68, ROOF_Y);

  // ---- the fire escape (roof -> east yard): an external iron stair against the yard face of the wing and passage walls; it runs
  // down east to a foot beside the east gate (D0's TKL default, EGRESS E9) ----
  mass(b, 108.0, 50.4, 109.3, 52.0, 8.2, ROOF_Y);
  // flight A: from the half landing (x 103.2, y 4.2) up east to the head (x 108.0, y 8.4): a steep 4.8 m run (the yard has no room for 7.1 m)
  b.stairs(105.6, 51.05, 1.3, 4.8, 4.2, flight.steps, '#8d949b', PI / 2, 4.2);
  mass(b, 101.9, 49.1, 103.2, 51.7, 4.0, 4.2);
  // flight B: from the half landing (x 103.2, y 4.2) down east to the yard (ramp x 103.2-110.325; the foot (110.6, 0, 49.75) is 2.6 m plan from the gate centre)
  b.stairs(103.2 + flight.len / 2, 49.75, 1.3, flight.len, 4.2, flight.steps, '#8d949b', -PI / 2, 0);

  // ---- the east wing (x 106-120 z 52-74), the posts and the office behind it ----
  fill(b, [106, 52, 120, 80], [CORE], CEIL, UNDER);
  // south wall z 52 (OUTER): the sash window (sill 1.0, head 2.2), the east gate (keypad), the lodge door
  wall(b, true, 52, 106, 109.4, [[108.2, 109.4]], 0, UNDER, OUTER, undefined, 2.2);
  mass(b, 108.2, 51.7, 109.4, 52.3, 0, 1.0);
  b.windowAt(108.8, 1.6, 52, 1.2, 1.2, PI / 2, { sill: 1.0, open: true, breakable: false });
  wall(b, true, 52, 109.4, 120, [[111.4, 112.6], [116.4, 117.6]], 0, UNDER, OUTER);
  doorIn(b, true, 52, 112, 0);
  doorIn(b, true, 52, 117, 0);
  // west wall x 106: the passage door (z 53.75) and the front hall's 3 m opening (z 66.5-69.5)
  wall(b, false, 106, 52, 55.5, [[53.15, 54.35]], 0, PASSAGE_CEIL);
  doorIn(b, false, 106, 53.75, 0);
  wall(b, false, 106, 64, 72, [[66.5, 69.5]], 0, CEIL);
  // north wall z 74: the east post's 3 m arch and the partners' office door
  wall(b, true, 74, 106, 120, [[107.5, 110.5], [115.9, 117.1]], 0, CEIL);
  doorIn(b, true, 74, 116.5, 0);
  mass(b, 112, 74, 113, 78, 0, CEIL);
  mass(b, 106, 78, 120, 80, 0, CEIL);

  // ---- the lodge and the east yard ----
  mass(b, 114, 44, 120, 52, 3.0, CEIL);
  wall(b, false, 114, 44, 52, [[47.4, 48.6]], 0, 3.0);
  doorIn(b, false, 114, 48, 0);
  // the yards' dividing wall x 100 is 6.5 (not 6.0): the fire escape's half landing (4.2) is 2.3 under its top, over the 1.8 mantle
  wall(b, false, 100, 38, 52, [], 0, YARD_WALL_DIVIDE);
  wall(b, true, 38, 100, 114, [], 0, YARD_WALL);
  mass(b, 114, 34, 120, 44, 0, 12);
  mass(b, 100, 34, 114, 38, 0, 12);

  // ---- the passage (x 96-106 z 52-55.5), the chute duct and the strongroom ----
  // the passage ceiling, open 6.0-6.3 over the chute opening's inner half (z 52-52.3): the climb-up off the lip stands there
  fill(b, [96, 52, 106, 55.5], [[96.5, 52, 97.7, 52.3]], PASSAGE_CEIL, CHUTE_HEAD);
  fill(b, [96, 52, 106, 55.5], [], CHUTE_HEAD, UNDER);
  // south wall z 52 (OUTER): 0-4.4 below the chute (the lip's wall), the coal-yard door, the old coal hole; above: the chute
  // opening 4.4-6.3 (`AttachController.climbRoom`), the wall to 6.5 over it
  wall(b, true, 52, 96, 101, [[98.4, 99.6]], 0, 4.4, OUTER);
  doorIn(b, true, 52, 99, 0);
  wall(b, true, 52, 101, 106, [[103.9, 105.1]], 0, 4.4, OUTER, undefined, 1.5);
  wall(b, true, 52, 96, 106, [[96.5, 97.7]], 4.4, CHUTE_HEAD + 0.2, OUTER, undefined, CHUTE_HEAD - 4.4);
  b.ledge(LIP_CHUTE.b.x, LIP_CHUTE.a.z, LIP_CHUTE.a.x, LIP_CHUTE.a.z, LIP_CHUTE.y);
  // the old coal hole (secret duct, passage -> east yard)
  duct(b, [[104.5, 52.3], [104.5, 49.2]], 0);
  // north wall z 55.5-56 (0.5 thick): the strongroom door
  wall(b, true, 55.75, 98, 104, [[100.4, 101.6]], 0, PASSAGE_CEIL, 0.5);
  doorIn(b, true, 55.5, 101, 0);
  // the strongroom (x 98-104 z 56-64): ceiling, and the front hall's south wall z 64
  fill(b, [98, 56, 104, 64], [], CEIL, UNDER);
  wall(b, true, 64, 96, 106, [], 0, CEIL);
  mass(b, 96, 55.5, 98, 64, 0, UNDER);
  mass(b, 104, 55.5, 106, 64, 0, UNDER);
  // the chute duct: floor top 4.4 out over the coal yard on a corbel, 1.5 high, the bolted hatch in its south end wall; over the
  // lip's end (z 50.9-52.3) a hood 6.3-6.5 (1.9 clear: the climb-up's standing room), the step between the lid and the hood closed
  mass(b, 96.3, 49.8, 97.9, 52.3, 4.2, 4.4);
  mass(b, 96.5, 50.4, 97.7, 51.7, 3.0, 4.2);
  mass(b, 96.3, 49.8, 96.5, 50.9, 4.4, 5.9);
  mass(b, 97.7, 49.8, 97.9, 50.9, 4.4, 5.9);
  mass(b, 96.3, 50.9, 96.5, 51.7, 4.4, CHUTE_HEAD);
  mass(b, 97.7, 50.9, 97.9, 51.7, 4.4, CHUTE_HEAD);
  mass(b, 96.3, 49.8, 97.9, 50.9, 5.9, 6.1);
  mass(b, 96.3, 50.7, 97.9, 50.9, 6.1, CHUTE_HEAD + 0.2);
  mass(b, 96.3, 50.9, 97.9, 52.3, CHUTE_HEAD, CHUTE_HEAD + 0.2);
  doorIn(b, true, 50.0, 97.1, 4.4, { h: 1.5 });

  // ---- the front hall (x 96-106 z 64-72), the heating duct behind it ----
  fill(b, [96, 64, 106, 72], [], CEIL, UNDER);
  // the west wall x 96 (the long wall of the west wing): the passage door (z 52.95), the hall's double doors (z 68, 2.0 wide), the heating duct's mouth (z 72.6-73.8, 1.5 high)
  wall(b, false, 96, 52, 72, [[52.35, 53.55], [67, 69]], 0, UNDER);
  wall(b, false, 96, 72, 74, [[72.6, 73.8]], 0, UNDER, T, undefined, 1.5);
  doorIn(b, false, 96, 52.95, 0);
  doorIn(b, false, 96, 68, 0, { w: 2.0 });
  mass(b, 96, 72, 106, 72.4, 0, UNDER);
  mass(b, 96, 72.4, 106, 74.0, 1.7, UNDER);
  mass(b, 96, 74.0, 106, 80, 0, UNDER);
  duct(b, [[106, 73.2], [96, 73.2]], 0);

  // ---- the west wing (x 82-96 z 52-74, open to the roof slab) and the west post ----
  wall(b, false, 82, 52, 74, [], 0, UNDER);
  wall(b, true, 52, 82, 96, [], 0, UNDER, OUTER);
  wall(b, true, 74, 85, 91, [[86.5, 89.5]], 0, CEIL);
  fill(b, [85, 74, 91, 78], [], CEIL, UNDER);
  mass(b, 82, 74, 85, 80, 0, UNDER);
  mass(b, 91, 74, 96, 80, 0, UNDER);
  mass(b, 85, 78, 91, 80, 0, UNDER);
  // the iron gallery (y 4.2): a ring round a hole under the lantern, a rail on every edge but the stair head, the stair down
  fill(b, [86, 60, 92, 66], [[87.5, 61.5, 90.5, 64.5]], 4.0, 4.2);
  mass(b, 85.6, 65, 86, 66, 4.0, 4.2);
  mass(b, 87.4, 61.4, 87.5, 64.6, 4.2, 5.3);
  mass(b, 90.5, 61.4, 90.6, 64.6, 4.2, 5.3);
  mass(b, 87.4, 61.4, 90.6, 61.5, 4.2, 5.3);
  mass(b, 87.4, 64.5, 90.6, 64.6, 4.2, 5.3);
  mass(b, 86, 60, 92, 60.1, 4.2, 5.3);
  mass(b, 91.9, 60, 92, 66, 4.2, 5.3);
  mass(b, 87, 65.9, 92, 66, 4.2, 5.3);
  mass(b, 86, 60, 86.1, 64.5, 4.2, 5.3);
  b.stairs(85.0, 62.4375, 1.2, flight.len, 4.2, flight.steps, '#8d949b', 0, 0);

  // ---- the coal yard (x 82-98 z 38-52), the cart gate and the cartway ----
  wall(b, false, 82, 38, 52, [], 0, YARD_WALL);
  // the east wall x 98 stops short of the passage wall: the vestibule x 98-99.85 z 50-51.7 behind the coal-yard door
  wall(b, false, 98, 38, 50, [], 0, YARD_WALL);
  mass(b, 98, 34, 100, 50, 0, 12);
  wall(b, true, 38, 82, 98, [[88.5, 91.5]], 0, YARD_WALL, T, undefined, 3.0);
  b.door(88.5, 0, 38, 1.8, PI / 2, { height: 3.0, leaf: 'slide' });
  doorIn(b, true, 38, 90.9, 0);
  mass(b, 83, 39, 87, 44, 0, 2.0);
  mass(b, 83, 45, 87, 50, 0, 2.0);
  mass(b, 82, 34, 88, 38, 0, 12);
  mass(b, 92, 34, 98, 38, 0, 12);
  wall(b, true, 34, 88, 92, [[88.5, 91.5]], 0, 3.0, T, undefined, 3.0);
  mass(b, 88, 34, 92, 38, 3.0, CEIL);

  // ---- cover (A9: a hide spot by every takedown spot), each a collide `noLedge` mass ----
  // east yard: the coal merchant's handcart, inside guard 0's loop
  mass(b, 104.0, 42.6, 105.4, 43.6, 0, 1.1);
  // lodge: the porter's coat cupboard
  mass(b, 119.2, 50.0, 120, 51.4, 0, 2.0);
  // east wing, the press recesses: deed presses on the west wall (the strongroom mass's face) and the east wall
  mass(b, 106, 59.2, 106.7, 60.8, 0, 2.4);
  mass(b, 106, 61.8, 106.7, 63.4, 0, 2.4);
  mass(b, 119.3, 59.2, 120, 60.8, 0, 2.4);
  // west wing, the aisles between the new shelf ranges, and the day-book box at the first range's foot
  mass(b, 92.4, 56.5, 93.0, 62.5, 0, 2.2);
  mass(b, 94.0, 56.5, 94.6, 62.5, 0, 2.2);
  mass(b, 91.5, 56.6, 92.3, 57.4, 0, 0.9);
  // front hall: the post-sack bin
  mass(b, 102.6, 70.8, 103.4, 71.6, 0, 1.1);

  // ---- lights (LIGHT.md section 4: 31 lamps, groups 80-90, every one on) ----
  // 80: the gate lamp over the keypad door, the yard flood on a bracket under the lodge's eaves (aimed west-south-west across the
  // yard; wall x 114 tops at 3.0, the lodge roof is 3.0-3.3), and the head lamp on the bracket arm of an iron lamp post on the
  // roof parapet's west end (the parapet mass x 109.3-120, top 9.5; the post is 0.12 m square, no standable top)
  lamp(b, 112, 3.0, 51.6, { r: 4, i: 0.5, group: 80 });
  lamp(b, 113.7, 2.9, 46.0, { r: 14, i: 2.5, group: 80, cone: makeCone(-1, -0.4, -0.5, 1.0) });
  lamp(b, 109.0, 10.0, 52.15, { r: 5, i: 0.5, group: 80 });
  // the lamp post under the head lamp's bracket arm
  mass(b, 109.3, 52.09, 109.42, 52.21, ROOF_Y + PARAPET, 10.15);
  lamp(b, 117, 2.6, 48, { r: 5, i: 0.6, group: 81, colour: WARM });
  lamp(b, 110, 1.2, 58, { r: 4, i: 0.35, group: 82, colour: WARM });
  lamp(b, 116, 1.2, 58, { r: 4, i: 0.35, group: 83, colour: WARM });
  lamp(b, 101, 2.9, 68, { r: 8, i: 0.8, group: 84 });
  lamp(b, 107.5, 2.9, 68, { r: 8, i: 0.8, group: 84 });
  for (const [x, z] of [[113.8, 55.3], [109.2, 59], [109.2, 66], [117.6, 59], [117.6, 66], [113.8, 71.7]] as const) lamp(b, x, 3.0, z, { r: 7, i: 0.8, group: 84 });
  lamp(b, 90, 1.2, 56, { r: 4, i: 0.35, group: 85, colour: WARM });
  for (const [x, z] of [[85, 55.5], [93, 55.5], [85, 70.5], [93, 70.5], [83.6, 63], [94.4, 63]] as const) lamp(b, x, 3.8, z, { r: 8, i: 0.9, group: 85 });
  lamp(b, 89, 7.8, 63, { r: 8, i: 0.4, group: 86, colour: COLOUR_MOON, destructible: false, electric: false });
  lamp(b, 117, 1.2, 76.5, { r: 3.5, i: 0.5, group: 87, colour: WARM });
  lamp(b, 101, 2.7, 53.75, { r: 5, i: 0.5, group: 88, destructible: false });
  lamp(b, 101, 3.0, 62.5, { r: 4, i: 0.25, group: 88 });
  for (const [x, y, z] of [[113.2, 2.9, 68.6], [113.8, 6.8, 59.4], [113.2, 10.3, 68.6]] as const) lamp(b, x, y, z, { r: 4, i: 0.5, group: 88 });
  lamp(b, 90, 3.6, 38.6, { r: 6, i: 0.2, group: 89 });
  lamp(b, 90, 2.6, 34.6, { r: 6, i: 0.15, group: 89 });
  lamp(b, 101, 11, 66, { r: 6, i: 0.5, group: 90, destructible: false, electric: false });

  // the desks the desk and table lamps stand on: visual-only boxes (no nav cell, no light row changes)
  for (const [x0, z0, x1, z1, fy] of W3_DESKS) b.box((x0 + x1) / 2, fy + DESK_TOP / 2, (z0 + z1) / 2, x1 - x0, DESK_TOP, z1 - z0, '#6b5a43', 0, 0, false);
  // the conduit runs from the switches to the fittings of the switched circuits
  for (const c of W3_CONDUITS) conduit(b, c.pts);
}

export const W3: WharfSection = {
  id: 'W3',
  build,
  rooms: ROOMS,
  switches: [
    { pos: new Vector3(115.9, 0, 51.4), yaw: PI, group: 80 },
    { pos: new Vector3(114.4, 0, 49.0), yaw: PI / 2, group: 81 },
    { pos: new Vector3(110.6, 0, 57.4), yaw: 0, group: 82 },
    { pos: new Vector3(116.6, 0, 57.4), yaw: 0, group: 83 },
    { pos: new Vector3(106.4, 0, 65.9), yaw: PI / 2, group: 84 },
    { pos: new Vector3(95.6, 0, 66.4), yaw: -PI / 2, group: 85 },
    { pos: new Vector3(115.8, 0, 74.6), yaw: 0, group: 87 },
  ],
  hideSpots: [
    { pos: new Vector3(84, 0, 72) },
    { pos: new Vector3(85, 0, 44.6) },
    // the handcart, the lodge cupboard, the west presses, the east press, the day-book box, the post-sack bin
    { pos: new Vector3(104.7, 0, 44.0) },
    { pos: new Vector3(118.8, 0, 50.7) },
    { pos: new Vector3(107.1, 0, 60.0) },
    { pos: new Vector3(107.1, 0, 62.6) },
    { pos: new Vector3(118.9, 0, 60.0) },
    { pos: new Vector3(91.9, 0, 56.2) },
    { pos: new Vector3(103.0, 0, 70.4) },
  ],
  // A8: the porters' first-aid box on the north wall of the bulkhead stair's top landing (the roof access), not the lodge (the porter sleeps in it)
  medkits: [{ pos: new Vector3(114.0, 8.4, 69.15), yaw: PI }],
  navSeeds: [
    new Vector3(100, 8.4, 70),
    new Vector3(106, 0, 44),
    new Vector3(117, 0, 48),
    new Vector3(112, 0, 62),
    new Vector3(88, 0, 58),
    new Vector3(89, 4.2, 60.6),
    new Vector3(101, 0, 53.75),
    new Vector3(101, 0, 60),
    new Vector3(90, 0, 46),
    new Vector3(90, 0, 36),
    new Vector3(109, 0, 76),
    new Vector3(88, 0, 76),
    new Vector3(117, 0, 76),
    new Vector3(101, 0, 68),
  ],
  lips: [LIP_CHUTE],
  legUps: [LEGUP_CHUTE],
  pulls: [],
  ropes: [],
  throws: [],
  shutters: [],
  dropGuards: [DG_COALYARD],
  doors: DOORS,
  debugPoints: [
    { id: 'w3-bulkhead-head', label: 'W3 bulkhead stair head (restart)', pos: new Vector3(111.4, 8.4, 68), yaw: PI / 2 },
    { id: 'w3-corner-bay', label: 'W3 corner bay (throw landing)', pos: new Vector3(84, 8.4, 66), yaw: PI / 2 },
    { id: 'w3-chute-spot', label: 'W3 chute boost spot', pos: new Vector3(97.1, 0, 53.2), yaw: PI },
    { id: 'w3-coal-yard', label: 'W3 coal yard', pos: new Vector3(90, 0, 46), yaw: PI },
    { id: 'w3-cartway', label: 'W3 cartway', pos: new Vector3(90, 0, 36), yaw: PI },
    { id: 'w3-fire-escape-head', label: 'W3 fire escape head (roof)', pos: new Vector3(108.65, 8.4, 51.2), yaw: PI },
    { id: 'w3-fire-escape-foot', label: 'W3 fire escape foot (east gate)', pos: new Vector3(110.6, 0, 49.75), yaw: PI / 2 },
    { id: 'w3-vantage-yard-a', label: 'W3 yard vantage A (fire escape half landing)', pos: new Vector3(102.55, 4.2, 49.6), yaw: PI },
    { id: 'w3-vantage-yard-b', label: 'W3 yard vantage B (fire escape half landing)', pos: new Vector3(102.55, 4.2, 51.2), yaw: PI },
    { id: 'w3-vantage-east-a', label: 'W3 east wing vantage A (east key post alcove)', pos: new Vector3(111.5, 0, 77.0), yaw: PI },
    { id: 'w3-vantage-east-b', label: 'W3 east wing vantage B (east key post alcove)', pos: new Vector3(110.4, 0, 77.6), yaw: PI },
    { id: 'w3-vantage-west-a', label: 'W3 west wing vantage A (iron gallery south strip)', pos: new Vector3(86.7, 4.2, 60.6), yaw: PI },
    { id: 'w3-vantage-west-b', label: 'W3 west wing vantage B (iron gallery south strip)', pos: new Vector3(87.9, 4.2, 60.6), yaw: PI },
  ],
  deviations: [
    { space: 'w3-chute', why: 'floor 4.4 not 2.2 (0.1 question 5): a 1.2 x 2.0 duct x 96.5-97.7 z 50.0-52.0 out over the coal yard (the room stops at z 52.0, rooms may not overlap; the duct floor runs on to the lip at z 52.3), its hatch in the south end wall; the opening and a hood over the lip end (z 50.9-52.3) are 1.9 high for the climb-up' },
    { space: 'w3-east-wing', why: 'the bulkhead stair has both doors (east wing and roof) at the north end: a two-flight switchback has both doors at one end' },
    { space: 'w3-passage', why: "the passage's west door is at z 52.95 not 53.75 (a wall 0.9 m from the booster's side probe fails roomForBoost)" },
    { space: 'w3-coal-yard', why: "the coal-yard door is at x 99.0 not 99.5 (x 99.5 is inside the yards' dividing wall): a one-door vestibule x 98-99.85 z 50-51.7 is carved from it, open to the yard; the roof's drop guard runs on to x 100 over it" },
    { space: 'w3-east-yard', why: "the fire escape runs down east to a foot beside the east gate, D0's TKL default; band z 49.1-52.0 less 0.3; upper flight steeper (a 4.8 m run); the dividing wall x 100 is 6.5" },
    { space: 'w3-cartway', why: 'z 34-38 not 34-40: the graph box overlaps the coal yard at z 38-40' },
    { space: 'w3-front-hall', why: 'not a graph space: the 10 x 8 hall between the wings (the link w3-east-wing -> w3-west-wing)' },
    { space: 'w3-roof', why: "the fire escape's marker [108.65, 8.4, 52] (D0, EGRESS E9) is its head landing x 108.0-109.3" },
  ],
  entry: [100, 8.4, 70],
  exit: [90, 0, 36],
};
