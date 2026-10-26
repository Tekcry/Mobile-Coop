import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import { stairSteps, type CoopLip } from './ctcourseGreybox';
import { doorIn, duct, lamp, mass, PARAPET, screen, SCREEN, T, wall, type DropGuard, type WharfPull, type WharfRope, type WharfSection, type WharfThrow } from './tallowWharfKit';

/**
 * Tallow Wharf section W2, the arcade lofts (mission-framework GB2; `docs/missions/slices/GB-briefs.md` "GB2", graph
 * `docs/missions/prototypes/campaign-map/graph.json` spaces `w2-*`). Frame: x east, z north, y up; a y below is a walking surface's
 * feet height. Every box is `noLedge` but the one planned lip (`w2-lip-pier`, a manual ledge on the pier's south face) and the
 * west downpipe's pull-up lip (`W2_DOWNPIPE_LIP`, at the roof's eaves).
 *
 * The forced co-op moves: C3 on the walkway (boost + rope at the west pier, pull at the east lip), then C4 (two lightwell throws,
 * level 4.5 -> 4.5, from the south lofts to the north lofts' iron stages) and C5 (the lane throw, arcade roof -> the W3 corner
 * roof, level 8.4 -> 8.4). J8 G2 (M2, A4, A24, A28): the pawn throw (C4 west) and the lane throw are 5.8 m site throws over 4.9 m
 * gaps no solo jump makes (the pawn loft cut back to z 67.6, the lane edge back to x 77.1); the pie throw stays the standard
 * 2.5 m throw until the plank bridge (G403). Each C4 way back is an enclosed iron footbridge with its gate bolted on the bridge
 * side (A5); the stair head is bolted on the reading-room side (A25); the clock-mender's door is locked both ways (A29). The roof:
 * the tank-room ladder (A7, E6), and the west downpipe from the walkway (E11). No shutter here. Plan rows (z): the arcade z
 * 48-62; the loft row z 62-70 (pawn loft x 44-54 cut back to z 67.6 with its fire stair along the facade, stair hall 54-56, pie
 * shop / loft 56-66, party wall 66-68, lane-window loft 68-76 with the tank room) under the arcade roof (8.4); the lightwell z
 * 67.6 / 70-73.5 with the two bridges at its ends; the reading room and the clock loft z 73.5-80.
 */

const BRICK = '#82756a';
const BRICK_D = '#6d6258';
const SLAB = '#6f6a62';
const LEAD = '#5b6168';
const IRON = '#4a4f55';
const GLAZE = '#8fa9b6';
const FILL = '#2f3236';
const STEP = '#7a7872';
const CONDUIT = '#4f5459';
const WOOD = '#6b5a45';
const MARK = '#c9b458';
const WARM: [number, number, number] = [1, 0.82, 0.55];
const EXIT: [number, number, number] = [0.8, 1, 0.85];

/** A plan rectangle [x0, z0, x1, z1]. */
type Rect = [number, number, number, number];

const PI = Math.PI;
/** The loft floors' feet height, and the arcade roof's. */
const LOFT = 4.5;
const ROOF = 8.4;
/** The south lofts' roof slab underside (the taking-in doors' head, the throw's clear air: 3.6 m over the loft floor). */
const ROOF_UNDER = 8.1;
/** The A5 bridges: the side walls' top and the roof's top (1.0 m under the north range roof 7.8, over the jump apex). */
const BRIDGE_WALL = 6.6;
const BRIDGE_TOP = 6.8;

/** The pawn loft's lit rota desk under lamp group 73 (on its desk against the fire-stair core's north wall), feet height: the tgc-opt board. */
export const W2_ROTA_DESK = [51.2, LOFT, 64.4] as const;

/** (E11) The west downpipe on the loft row's south facade, over the walkway's west pier (the climber faces +z). */
export const DOWNPIPE = { x: 47.5, z: 61.6 } as const;
/** (E11) The downpipe's pull-up lip at the eaves (a manual ledge; not a co-op lip, so not in `W2.lips`). */
export const W2_DOWNPIPE_LIP = { y: ROOF, a: { x: 47.0, z: 61.85 }, b: { x: 48.0, z: 61.85 }, n: { x: 0, z: -1 } } as const;

/** The desks and tables under the desk and table lamps [x0, z0, x1, z1, floorY] (LIGHT.md rule 7): visual-only boxes, top floor + 0.75. */
export const W2_DESKS: readonly (readonly [number, number, number, number, number])[] = [
  [57.95, 67.1, 58.35, 68.3, LOFT], // the clerk's supper shelf against the pie back stair's east wall (lamp 72's table lamp)
  [50.6, 63.8, 51.8, 64.6, LOFT], // the rota desk against the pawn fire-stair core's north wall (lamp 73)
  [51.9, 74.4, 52.5, 75.6, LOFT], // Teale's table beside him (lamp 74)
  [46.4, 76.9, 47.6, 77.5, LOFT], // the reader's table in front of him (lamp 75)
];

// ---- the lamps and switches (LIGHT.md section 3) ----
type P = readonly [number, number, number];
const LAMPS_70: readonly P[] = [[47.5, 4.2, 51], [55.5, 4.2, 51], [63.5, 4.2, 51], [71.5, 4.2, 51], [51.5, 4.2, 56.5], [59.5, 4.2, 56.5], [67.5, 4.2, 56.5]];
const LAMP_71: P = [58.8, 2.4, 62.5];
const LAMPS_72: readonly P[] = [[59, 7.0, 65.5], [63.5, 7.0, 65.5]];
const LAMP_72_TABLE: P = [58.15, 5.4, 67.8];
const LAMPS_73: readonly P[] = [[47.5, 7.6, 65.7], [52, 7.6, 65.7]];
const LAMP_73_DESK: P = [W2_ROTA_DESK[0], 5.6, W2_ROTA_DESK[2]];
const LAMP_74: P = [52.2, 5.4, 75.0];
const LAMP_75: P = [47.0, 5.4, 77.2];
const LAMPS_76: readonly P[] = [[55, 7.2, 72], [55, 6.4, 66]];
const LAMPS_77: readonly P[] = [[47, 7.2, 76.75], [52, 7.2, 76.75], [57, 7.2, 76.75]];
/** The maintained escape bulkheads (r 4, i 0.5): the pawn stair's top landing, foot and flight, the pie back stair head. */
const LAMPS_78: readonly P[] = [[45, 7.6, 62.8], [53, 3.0, 63.3], [49.5, 4.6, 63.3], [57, 7.6, 69.3]];
/** The two bridges' and the tank room's bulkheads (r 3, i 0.3). */
const LAMPS_78_SMALL: readonly P[] = [[44.75, 6.4, 70.5], [69.25, 6.4, 71.75], [72.2, 7.7, 64.9]];
/** The exit lights over the east bridge doorway and the lane-window loft's walkway door (r 3, i 0.15). */
const LAMPS_78_EXIT: readonly P[] = [[69.25, 6.8, 73.9], [72, 6.8, 62.4]];
const LAMPS_79: readonly P[] = [[49, 7.4, 61.75], [56.5, 7.4, 61.75], [65, 7.4, 61.75], [70, 7.4, 61.75]];
const SW_70: P = [40.4, 0, 57.8];
const SW_71: P = [62.4, 0, 62.4];
const SW_72: P = [58.4, LOFT, 68.8];
const SW_73: P = [46.1, LOFT, 64.0];
const SW_76_LANDING: P = [55.4, LOFT, 72.4];
const SW_76_FOOT: P = [55.7, 0, 62.4];
const SW_77: P = [45.8, LOFT, 73.85];
const SW_79: P = [46.1, LOFT, 61.75];

/** The switched groups' conduit runs (LIGHT.md rule 6): one polyline per fitting, from its switch's wall point up to `yRun`, along x, along z, then the drop. */
export const W2_CONDUITS: readonly { group: number; pts: readonly (readonly [number, number, number])[] }[] = (() => {
  const runs: { group: number; pts: readonly (readonly [number, number, number])[] }[] = [];
  const run = (group: number, s: readonly [number, number, number], yRun: number, l: readonly [number, number, number]): void => {
    const y = Math.min(l[1], yRun);
    const pts: [number, number, number][] = [[s[0], s[1] + 1.2, s[2]], [s[0], yRun, s[2]], [l[0], yRun, s[2]], [l[0], yRun, l[2]]];
    if (y < yRun - 1e-9) pts.push([l[0], y, l[2]]);
    runs.push({ group, pts });
  };
  for (const l of LAMPS_70) run(70, SW_70, 7.3, l);
  run(71, SW_71, 2.6, LAMP_71);
  for (const l of [...LAMPS_72, LAMP_72_TABLE]) run(72, SW_72, 7.2, l);
  for (const l of [...LAMPS_73, LAMP_73_DESK]) run(73, SW_73, 7.8, l);
  // the two-way stair circuit: the landing switch to the landing lamp, the foot switch to the flight lamp
  run(76, SW_76_LANDING, 7.4, LAMPS_76[0]!);
  run(76, SW_76_FOOT, 7.4, LAMPS_76[1]!);
  for (const l of LAMPS_77) run(77, SW_77, 7.4, l);
  for (const l of LAMPS_79) run(79, SW_79, 7.6, l);
  return runs;
})();

/** A solid `noLedge` collide box over a plan rectangle between two heights (`overhead` for a ceiling or roof). */
function blk(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, color = BRICK, overhead = false): void {
  const i0 = b.boxes.length;
  b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
  b.mark(i0, overhead ? { noLedge: true, overhead: true } : { noLedge: true });
}

/** A visual-only box over a plan rectangle between two heights (`collide` false: no nav cell, light row or ledge changes). */
function look(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, color: string): void {
  b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, false);
}

/** `r` minus `h` as up to four rectangles. */
function subtract(r: Rect, h: Rect): Rect[] {
  if (h[2] <= r[0] || h[0] >= r[2] || h[3] <= r[1] || h[1] >= r[3]) return [r];
  const out: Rect[] = [];
  if (h[0] > r[0]) out.push([r[0], r[1], h[0], r[3]]);
  if (h[2] < r[2]) out.push([h[2], r[1], r[2], r[3]]);
  const x0 = Math.max(r[0], h[0]);
  const x1 = Math.min(r[2], h[2]);
  if (h[1] > r[1]) out.push([x0, r[1], x1, h[1]]);
  if (h[3] < r[3]) out.push([x0, h[3], x1, r[3]]);
  return out;
}

/** A slab over `rect` minus `holes`, its top at `top`, `th` thick, overhead and `noLedge`. */
function slab(b: LevelBuilder, rect: Rect, top: number, th: number, holes: readonly Rect[], color = SLAB): void {
  let pieces: Rect[] = [rect];
  for (const h of holes) pieces = pieces.flatMap((r) => subtract(r, h));
  for (const r of pieces) if (r[2] - r[0] > 0.01 && r[3] - r[1] > 0.01) blk(b, r[0], r[1], r[2], r[3], top - th, top, color, true);
}

/**
 * A flight rising north (+z) from (xc, z0) over `len` m to `rise` (the builder's steps and its smooth ramp collider), with the
 * space under it filled by `noLedge` slices 0.45 m under the ramp's underside, so nothing can be reached or hidden under a stair.
 */
function flight(b: LevelBuilder, xc: number, w: number, z0: number, len: number, rise: number): void {
  const st = stairSteps(rise);
  b.stairs(xc, z0 + len / 2, w, len, rise, st.steps, STEP, 0, 0);
  for (let s = 0; s < len - 1e-6; s += 0.5) {
    const h = (s / len) * rise - 0.45;
    if (h > 0.05) blk(b, xc - w / 2, z0 + s, xc + w / 2, z0 + Math.min(len, s + 0.5), 0, h, FILL);
  }
}

/** `flight`'s twin for a flight rising west (-x) from (x0, zc) over `len` m (yaw -PI / 2 rises toward -x), filled under the same way. */
function flightWest(b: LevelBuilder, zc: number, w: number, x0: number, len: number, rise: number): void {
  const st = stairSteps(rise);
  b.stairs(x0 - len / 2, zc, w, len, rise, st.steps, STEP, -PI / 2, 0);
  for (let s = 0; s < len - 1e-6; s += 0.5) {
    const h = (s / len) * rise - 0.45;
    if (h > 0.05) blk(b, x0 - Math.min(len, s + 0.5), zc - w / 2, x0 - s, zc + w / 2, 0, h, FILL);
  }
}

/** A visual-only conduit along a polyline of axis-aligned legs: 0.05 x 0.05 boxes (`collide` false, so no nav cell or light row changes). */
function conduit(b: LevelBuilder, pts: readonly (readonly [number, number, number])[]): void {
  const t = 0.05;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay, az] = pts[i]!;
    const [bx, by, bz] = pts[i + 1]!;
    const dx = Math.abs(bx - ax);
    const dy = Math.abs(by - ay);
    const dz = Math.abs(bz - az);
    if (dx + dy + dz < 1e-6) continue;
    b.box((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, dx + t, dy + t, dz + t, CONDUIT, 0, 0, false);
  }
}

// ---- the C3 walkway (choke) ----
const LIP_PIER: CoopLip = { id: 'w2-lip-pier', y: LOFT, floor: 0, a: { x: 45.25, z: 59 }, b: { x: 46.75, z: 59 }, n: { x: 0, z: -1 } };
const LEG_UP = { lip: 'w2-lip-pier', x: 46, y: 0, z: 58.5, facing: { x: 0, z: 1 } } as const;
const ROPE_PIER: WharfRope = { id: 'w2-rope-pier', link: 'w2-arcade -> w2-walkway', holder: { x: 46, y: LOFT, z: 59.35 }, yaw: PI, foot: { x: 46, y: 0, z: 58.4 } };
const PULL_EAST: WharfPull = { id: 'w2-pull-east', link: 'w2-arcade -> w2-walkway', holder: { x: 73.5, y: LOFT, z: 59.35 }, yaw: PI, partner: { x: 73.5, y: 0, z: 58.3 } };

// ---- C4 and C5 throws (M2, A4, A24): the pawn and lane throws are 5.8 m site throws over 4.9 m gaps; the pie throw stays 2.5 m ----
const THROW_PAWN: WharfThrow = { id: 'w2-throw-pawn', link: 'w2-pawn-loft -> w2-reading-room', thrower: { x: 51.2, y: LOFT, z: 67.2 }, runner: { x: 51.2, y: LOFT, z: 65.9 }, stage: [50.2, 72.5, 52.2, 73.5], dist: 5.8 };
const THROW_PIE: WharfThrow = { id: 'w2-throw-pie', link: 'w2-pie-loft -> w2-clock-loft', thrower: { x: 63, y: LOFT, z: 69.6 }, runner: { x: 63, y: LOFT, z: 68.3 }, stage: [61.5, 72.5, 64.5, 73.5] };
const THROW_LANE: WharfThrow = { id: 'w2-throw-lane', link: 'w2-arcade-roof -> w3-roof', thrower: { x: 76.7, y: ROOF, z: 66 }, runner: { x: 75.1, y: ROOF, z: 66 }, stage: [82, 64.5, 86.5, 67.5], dist: 5.8 };

// ---- the drop guards (A28): the arcade roof boarded off from the lightwell side's lower roofs ----
// The north range's insurers had the arcade leads boarded off from the lightwell after a break-in: the screens cut the arcade roof
// off from the stair landing's roof (x 54-56, z 70-73.5, top 7.8), the reading-room and clock-loft roof (x 44-70, z 73.5-80, top
// 7.8) and the corner mass top (x 70-76, z 70-80, 8.4), so nobody drops from a roof onto a stage.
const DG_STAIRHALL: DropGuard = { id: 'w2-dg-stairhall', a: { x: 54, z: 67.3 }, b: { x: 54, z: 70.0 }, y: ROOF, h: SCREEN };
const DG_LIGHTWELL: DropGuard = { id: 'w2-dg-lightwell', a: { x: 54, z: 70.0 }, b: { x: 76, z: 70.0 }, y: ROOF, h: SCREEN };

/** The rooms (HUD tags): the graph's nine spaces; ground spaces band 0-4.4, lofts 4.5-8.3, the roof 8.4 up. */
const ROOMS: RoomDef[] = [
  { id: 'w2-arcade', name: 'Arcade', minX: 40, maxX: 76, minZ: 48, maxZ: 62, minY: 0, maxY: 4.4 },
  { id: 'w2-pie-shop', name: 'Pie shop', minX: 56, maxX: 66, minZ: 62, maxZ: 70, minY: 0, maxY: 4.4 },
  { id: 'w2-walkway', name: 'Walkway', minX: 44, maxX: 76, minZ: 59, maxZ: 62, minY: LOFT, maxY: 8.3 },
  { id: 'w2-pie-loft', name: 'Pie loft', minX: 56, maxX: 66, minZ: 62, maxZ: 70, minY: LOFT, maxY: 8.3 },
  { id: 'w2-pawn-loft', name: 'Pawn loft', minX: 44, maxX: 54, minZ: 62, maxZ: 67.6, minY: LOFT, maxY: 8.3 },
  { id: 'w2-reading-room', name: 'Reading room', minX: 44, maxX: 60, minZ: 73.5, maxZ: 80, minY: LOFT, maxY: 8.3 },
  { id: 'w2-clock-loft', name: 'Clock loft', minX: 60, maxX: 70, minZ: 73.5, maxZ: 80, minY: LOFT, maxY: 8.3 },
  { id: 'w2-lane-window', name: 'Lane window', minX: 68, maxX: 76, minZ: 62, maxZ: 70, minY: LOFT, maxY: 8.3 },
  { id: 'w2-arcade-roof', name: 'Arcade roof', minX: 44, maxX: 76, minZ: 62, maxZ: 70, minY: ROOF },
];

function build(b: LevelBuilder): void {
  // ---- solid mass (every plan inside the box that is no space, stair core or listed element) ----
  mass(b, 40, 62, 44, 80); // west of the lofts and the reading room (the west bridge's west side)
  mass(b, 44, 63.8, 53.85, 67.6, 0, LOFT); // the loft base: the loft floor ends at z 67.6 (the take-off edge, A28)
  mass(b, 68, 62, 76, 70, 0, LOFT); // under the lane-window loft
  mass(b, 44, 73.5, 70, 80, 0, LOFT); // under the reading room and the clock loft
  mass(b, 70, 70, 76, 80, 0, ROOF); // the corner (the east bridge's east side)
  // the party wall x 66-68 (pie loft | lane window) with the inner door passage at z 66 (y 4.5-6.6)
  mass(b, 66, 62, 68, 65.4, 0, ROOF);
  mass(b, 66, 66.6, 68, 70, 0, ROOF);
  mass(b, 66, 65.4, 68, 66.6, 0, LOFT);
  mass(b, 66, 65.4, 68, 66.6, 6.6, ROOF);
  doorIn(b, false, 67, 66, LOFT);

  // ---- the arcade (ground): walls 0-7.5, the glazed roof over z 48-59, the lane door, the shop fronts ----
  wall(b, false, 40, 48, 62, [[58.5, 61.5]], 0, 7.5, T, BRICK, 3.0); // west, with W1's 3 x 3 opening
  wall(b, true, 48, 40, 76, [], 0, 7.5, T, BRICK); // south
  wall(b, false, 76, 48, 62, [[54.4, 55.6]], 0, 7.5, T, BRICK); // east, with the lane door
  doorIn(b, false, 76, 55, 0);
  blk(b, 40, 48, 76, 59, 7.5, 7.7, GLAZE, true);
  for (const [x0, x1] of [[41, 49], [50, 58], [59, 67], [68, 75]] as const) blk(b, x0, 48, x1, 48.6, 0, 3.0, BRICK_D);

  // ---- C3, the walkway at y 4.5: the pier, the fascia, the slab on posts, the balustrade, the lip ----
  blk(b, 44, 59, 48, 62, 0, LOFT, BRICK_D); // the west pier
  blk(b, 71, 59, 76, 62, 0, LOFT, BRICK_D); // the east fascia
  blk(b, 48, 59, 71, 62, 4.2, LOFT, SLAB, true); // the walkway slab
  for (const x of [52, 56, 60, 64, 68]) blk(b, x - 0.15, 59, x + 0.15, 59.3, 0, 4.2, IRON); // posts 0.3 x 0.3
  for (const [x0, x1] of [[44, 45], [47, 72.5], [74.5, 76]] as const) blk(b, x0, 59, x1, 59.1, LOFT, LOFT + PARAPET, IRON); // balustrade; gaps x 45-47 and 72.5-74.5
  b.ledge(LIP_PIER.a.x, LIP_PIER.a.z, LIP_PIER.b.x, LIP_PIER.b.z, LOFT, { drop: LOFT });

  // ---- the loft row's south facade (z 62): the ground doors, the cellar duct gap, the loft doors onto the walkway ----
  wall(b, true, 62, 44, 62.8, [[52.4, 53.6], [54.4, 55.6], [60.4, 61.6]], 0, LOFT, T, BRICK_D);
  wall(b, true, 62, 62.8, 64.4, [[62.8, 64.4]], 0, LOFT, T, BRICK_D, 1.7);
  wall(b, true, 62, 64.4, 76, [], 0, LOFT, T, BRICK_D);
  wall(b, true, 62, 44, 76, [[44.4, 45.6], [60.4, 61.6], [71.4, 72.6]], LOFT, ROOF_UNDER, T, BRICK);
  doorIn(b, true, 62, 53, 0); // pawn stair foot
  doorIn(b, true, 62, 55, 0); // stair hall
  doorIn(b, true, 62, 61, 0); // pie shop
  doorIn(b, true, 62, 45, LOFT); // the walkway door, onto the pawn stair's top landing
  doorIn(b, true, 62, 61, LOFT); // pie loft (propped open)
  doorIn(b, true, 62, 72, LOFT); // lane window

  // ---- the coal bunker over the cellar coal passage (a secret crouch duct through the wall into the pie shop) ----
  blk(b, 62.5, 59.6, 62.8, 62, 0, 2.0, IRON);
  blk(b, 64.4, 59.6, 64.5, 62, 0, 2.0, IRON);
  blk(b, 62.8, 59.6, 64.4, 62, 1.7, 2.0, IRON);
  duct(b, [[63.6, 59.6], [63.6, 63.2]], 0);

  // ---- the stair hall x 54-56 (open stair, arcade -> reading room): flight z 62.3-70, the landing across the lightwell ----
  wall(b, false, 54, 62, 70, [], 0, ROOF_UNDER, T, BRICK);
  wall(b, false, 56, 62, 70, [], 0, ROOF_UNDER, T, BRICK);
  // the landing z 70-73.5 (walls 0-7.5 over the lightwell, the drain's gap 0.9-2.5 m from the south, 1.7 high)
  wall(b, false, 54, 70, 73.5, [[70.9, 72.5]], 0, 7.5, T, BRICK, 1.7);
  wall(b, false, 56, 70, 73.5, [[70.9, 72.5]], 0, 7.5, T, BRICK, 1.7);
  flight(b, 55, 1.7, 62.3, 7.7, LOFT);
  mass(b, 54, 70, 56, 70.9, 0, LOFT);
  mass(b, 54, 72.5, 56, 73.5, 0, LOFT);
  mass(b, 54, 70.9, 56, 72.5, 1.7, LOFT); // over the drain
  blk(b, 54, 70, 56, 73.5, 7.5, 7.8, LEAD, true); // the landing's roof
  // the lightwell drain (a crouch duct under the landing: the west half of the lightwell is otherwise a pit with no way out)
  duct(b, [[53.2, 71.7], [56.8, 71.7]], 0);

  // ---- the pawn fire stair (EGRESS pick 5): core x 44-53.85 z 62-63.8 along the facade, foot door (53, 0, 62), the flight rising
  // west to the top landing x 44-45.8 with the walkway door (45, 4.5, 62) and the loft door (45, 4.5, 63.65) on it ----
  wall(b, true, 63.65, 44, 53.85, [], 0, LOFT, T, BRICK_D);
  wall(b, true, 63.65, 44, 53.85, [[44.4, 45.6]], LOFT, ROOF_UNDER, T, BRICK_D);
  doorIn(b, true, 63.65, 45, LOFT); // the loft door (plain)
  flightWest(b, 62.825, 1.3, 52.3, 6.5, LOFT); // x 52.3 (foot landing x 52.3-53.85 on the ground) -> x 45.8
  mass(b, 44, 62.15, 45.8, 63.5, 0, LOFT); // the top landing
  // the pawn loft's north wall along z 67.45 (to the roof top: its 0.3 m top is narrower than `climbDepth`), the taking-in door x
  // 50.2-52.2 (2.0 x 3.6) and the west bridge gate x 44.15-45.35
  wall(b, true, 67.45, 44, 47.5, [[44.15, 45.35]], LOFT, ROOF, T, BRICK);
  wall(b, true, 67.45, 47.5, 53.85, [[50.2, 52.2]], LOFT, ROOF, T, BRICK, 3.6);
  doorIn(b, true, 67.45, 51.2, LOFT, { w: 2.0, h: 3.6 });
  doorIn(b, true, 67.45, 44.75, LOFT); // the west bridge gate (bolted on the bridge side, A5)
  // the hoist man's mark: where the thrower stands (visual only, 0.01 high)
  look(b, 50.9, 67.0, 51.5, 67.3, LOFT, LOFT + 0.01, MARK);

  // ---- the pie shop (ground, walls 0-4.2) and the pie loft (4.5, open to the roof slab) ----
  wall(b, true, 70, 56, 66, [[60.4, 61.6]], 0, 4.2, T, BRICK_D);
  doorIn(b, true, 70, 61, 0); // onto the lightwell (unlocked: a fall-in is never a softlock)
  slab(b, [56, 62, 66, 70], LOFT, 0.3, [[56.35, 62.15, 57.65, 68.7]]); // the loft slab 4.2-4.5 (the shop's ceiling) with the stair hole
  // the back stair core x 56.2-57.8 z 62.2-69.9: foot door in the east face at z 63 (ground), top door at z 69 (loft)
  wall(b, false, 56.2, 62, 69.9, [], 0, ROOF_UNDER, T, BRICK_D);
  wall(b, false, 57.8, 62, 69.9, [[62.4, 63.6]], 0, LOFT, T, BRICK_D);
  wall(b, false, 57.8, 62, 69.9, [[68.4, 69.6]], LOFT, ROOF_UNDER, T, BRICK_D);
  wall(b, true, 69.9, 56.05, 57.95, [], 0, ROOF_UNDER, T, BRICK_D);
  flight(b, 57, 1.3, 62.2, 6.5, LOFT);
  mass(b, 56.35, 68.7, 57.65, 69.75, 0, LOFT);
  doorIn(b, false, 57.8, 63, 0);
  doorIn(b, false, 57.8, 69, LOFT);
  // the pie loft's north wall with the taking-in door x 62-64
  wall(b, true, 70, 56, 66, [[62, 64]], LOFT, ROOF_UNDER, 0.2, BRICK, 3.6);
  doorIn(b, true, 70, 63, LOFT, { w: 2.0, h: 3.6 });

  // ---- the lane-window loft (4.5): east wall on the lane, north wall onto the lightwell with the east bridge gate ----
  wall(b, false, 76, 62, 70, [], LOFT, ROOF_UNDER, T, BRICK);
  wall(b, true, 70, 68, 70, [[68.65, 69.85]], LOFT, ROOF_UNDER, 0.2, BRICK);
  doorIn(b, true, 70, 69.25, LOFT); // the east bridge gate (bolted on the bridge side, A5)
  // the tank room (A7, E6): the plant room round the roof hatch and its fixed ladder, entered from the loft by a door
  wall(b, true, 64.4, 70.4, 74.0, [[71.4, 72.6]], LOFT, ROOF_UNDER, T, BRICK);
  doorIn(b, true, 64.4, 72, LOFT);
  wall(b, true, 67.6, 70.4, 74.0, [], LOFT, ROOF_UNDER, T, BRICK);
  wall(b, false, 70.4, 64.4, 67.6, [], LOFT, ROOF_UNDER, T, BRICK);
  wall(b, false, 74.0, 64.4, 67.6, [], LOFT, ROOF_UNDER, T, BRICK);
  blk(b, 72.9, 64.7, 73.8, 67.3, LOFT, 6.0, IRON); // the water tank

  // ---- the arcade roof (8.4): lead flat over the loft row with the hatch, parapets, the screens, the lane landing, the cage ----
  // over the cut-back pawn loft it ends at z 67.3 (5.2 m from the stage) and its south edge is the eaves, flush with the facade face
  slab(b, [44, 61.85, 54, 67.3], ROOF, 0.3, [], LEAD);
  slab(b, [54, 62, 76, 70.1], ROOF, 0.3, [[71.4, 65.4, 72.6, 66.6]], LEAD);
  // the fixed ladder up the hatch, now inside the tank room: the line 0.45 short of the hole's north edge, so the top is at that
  // edge (z 66.6) and the top-out (+0.4) lands on the slab at z 67.0, not over the hole (the campus S3 convention)
  b.ladder(72, 66.15, LOFT, ROOF, 0);
  blk(b, 44.2, 67.1, 54, 67.3, ROOF, ROOF + PARAPET, IRON); // parapet on the cut-back edge
  blk(b, 44, 62, 44.2, 67.1, ROOF, ROOF + PARAPET, IRON); // parapet on x 44
  // x 76: broken at z 64.5-67.5 (the lane landing) and z 68.6-69.8 (the cage)
  for (const [z0, z1] of [[62, 64.5], [67.5, 68.6], [69.8, 70]] as const) blk(b, 75.9, z0, 76.1, z1, ROOF, ROOF + PARAPET, IRON);
  for (const g of [DG_STAIRHALL, DG_LIGHTWELL]) screen(b, g);
  // the old bridge landing cut back to x 76-77.1 (C5 widened on the W2 side, the gap to the W3 corner bay 4.9 m): slab 8.1-8.4 on a
  // corbel block down to 6.0, its two parapet stubs; no parapet on its east edge; the hoist man's mark on it
  blk(b, 76, 64.5, 77.1, 67.5, 6.0, ROOF, LEAD);
  blk(b, 76.1, 64.4, 77.1, 64.6, ROOF, ROOF + PARAPET, IRON);
  blk(b, 76.1, 67.4, 77.1, 67.6, ROOF, ROOF + PARAPET, IRON);
  look(b, 76.5, 65.7, 76.85, 66.3, ROOF, ROOF + 0.01, MARK);
  // the fire-escape bridge (W2 half): a deck x 76-82 z 68.6-69.8 at 8.4 in an open-topped cage (A28: sides 2.0 m over the deck, 0.1
  // thick, no roof), open at x 76; its W3 end is the counting house's door frame with the bolted bridge door
  blk(b, 76, 68.6, 82, 69.8, ROOF_UNDER, ROOF, LEAD);
  blk(b, 76.1, 68.55, 82, 68.65, ROOF, ROOF + 2.0, IRON);
  blk(b, 76.1, 69.75, 82, 69.85, ROOF, ROOF + 2.0, IRON);

  // ---- the west downpipe (E11): the eaves gutter's outlet on the facade over the west pier, climbable 4.5 -> 8.4 (below the walkway
  // floor it runs inside the pier's chase); its pull-up lip at the eaves; the rainwater head under the eaves (visual only) ----
  b.pipeV(DOWNPIPE.x, DOWNPIPE.z, LOFT, ROOF, 0, IRON);
  b.ledge(W2_DOWNPIPE_LIP.a.x, W2_DOWNPIPE_LIP.a.z, W2_DOWNPIPE_LIP.b.x, W2_DOWNPIPE_LIP.b.z, ROOF, { drop: ROOF - LOFT });
  look(b, 47.3, 61.45, 47.7, 61.75, 7.85, 8.25, IRON);

  // ---- the lightwell's north side: the reading room and the clock loft (4.5), their roof 7.5-7.8, the iron landing stages ----
  wall(b, true, 73.5, 44, 62, [[44.15, 45.35], [50.6, 51.8], [54.4, 55.6]], LOFT, 7.5, T, BRICK); // the west bridge doorway is open
  wall(b, true, 73.5, 64, 70, [[68.65, 69.85]], LOFT, 7.5, T, BRICK); // x 62-64 is the clock loft's taking-in opening; the east bridge doorway is open
  doorIn(b, true, 73.5, 51.2, LOFT); // from the reading stage
  doorIn(b, true, 73.5, 55, LOFT); // the stair head (bolted on the reading-room side, A25)
  doorIn(b, true, 73.5, 63, LOFT, { w: 2.0, h: 3.0 }); // the clock loft's taking-in door, from its stage
  wall(b, false, 60, 73.5, 80, [[76.15, 77.35]], LOFT, 7.5, T, BRICK);
  // (A29) the clock-mender is out tonight and has locked his door behind him: locked both ways until the plank (G403)
  doorIn(b, false, 60, 76.75, LOFT, { locked: true, breachable: false });
  blk(b, 44, 73.5, 70, 80, 7.5, 7.8, LEAD, true);
  for (const s of [THROW_PAWN.stage, THROW_PIE.stage]) blk(b, s[0], s[1], s[2], s[3], LOFT - 0.2, LOFT, IRON);

  // ---- the A5 way-back bridges: enclosed iron footbridges along the lightwell ends, no way in but their two ends ----
  // west x 44-45.5 z 67.6-73.5: the floor, the east side wall, the roof (the mass x 40-44 is its west side)
  blk(b, 44, 67.6, 45.5, 73.5, 4.2, LOFT, IRON, true);
  blk(b, 45.35, 67.6, 45.5, 73.5, LOFT, BRIDGE_WALL, IRON);
  blk(b, 44, 67.6, 45.5, 73.5, BRIDGE_WALL, BRIDGE_TOP, IRON, true);
  // east x 68.5-70 z 70-73.5: the floor, the west side wall, the roof (the corner mass x 70 is its east side)
  blk(b, 68.5, 70, 70, 73.5, 4.2, LOFT, IRON, true);
  blk(b, 68.5, 70, 68.65, 73.5, LOFT, BRIDGE_WALL, IRON);
  blk(b, 68.5, 70, 70, 73.5, BRIDGE_WALL, BRIDGE_TOP, IRON, true);

  // ---- cover (each a real object, collide `noLedge`) ----
  blk(b, 53, 77.2, 57, 77.8, LOFT, 6.7, WOOD); // the reading room's book stacks, between the keeper's z 76 and z 79 legs
  blk(b, 53.0, 64.0, 53.8, 64.8, LOFT, 5.2, WOOD); // the pledge chest in the pawn loft's SE corner (against the core and the stair-hall wall)
  blk(b, 44.15, 75.6, 45.0, 76.4, LOFT, 5.1, WOOD); // a book trunk on the reading room's west wall
  blk(b, 44.0, 48.6, 45.0, 49.4, 0, 0.9, IRON); // the beadle's sand bin
  blk(b, 64.4, 68.4, 65.4, 69.4, 0, 0.9, WOOD); // a flour bin in the pie shop
  blk(b, 64.4, 62.6, 65.4, 63.4, LOFT, 5.3, WOOD); // a sack hamper in the pie loft

  // ---- desks under the desk and table lamps (visual only, top floor + 0.75) ----
  for (const [x0, z0, x1, z1, fy] of W2_DESKS) look(b, x0, z0, x1, z1, fy, fy + 0.75, WOOD);

  // ---- lights (LIGHT.md section 3): every fitting on, groups 70-79; closed rooms by their night fittings only (M1) ----
  for (const l of LAMPS_70) lamp(b, l[0], l[1], l[2], { r: 7, i: 0.85, group: 70 }); // arcade pendants on rods from the glazed roof
  lamp(b, LAMP_71[0], LAMP_71[1], LAMP_71[2], { r: 4, i: 0.3, group: 71, colour: WARM }); // the pie shop's window night light
  for (const l of LAMPS_72) lamp(b, l[0], l[1], l[2], { r: 7, i: 0.9, group: 72, colour: WARM }); // pie loft pendants
  lamp(b, LAMP_72_TABLE[0], LAMP_72_TABLE[1], LAMP_72_TABLE[2], { r: 3, i: 0.35, group: 72, colour: WARM }); // the clerk's table lamp
  for (const l of LAMPS_73) lamp(b, l[0], l[1], l[2], { r: 7, i: 0.9, group: 73, colour: WARM }); // pawn loft pendants
  lamp(b, LAMP_73_DESK[0], LAMP_73_DESK[1], LAMP_73_DESK[2], { r: 4, i: 0.35, group: 73, colour: WARM }); // the rota desk lamp
  lamp(b, LAMP_74[0], LAMP_74[1], LAMP_74[2], { r: 4, i: 0.35, group: 74, colour: WARM }); // Teale's table lamp
  lamp(b, LAMP_75[0], LAMP_75[1], LAMP_75[2], { r: 4, i: 0.35, group: 75, colour: WARM }); // the reader's table lamp
  for (const l of LAMPS_76) lamp(b, l[0], l[1], l[2], { r: 6, i: 0.8, group: 76 }); // public stair landing and flight
  for (const l of LAMPS_77) lamp(b, l[0], l[1], l[2], { r: 7, i: 0.9, group: 77, colour: WARM }); // reading room pendants
  // the maintained escape circuit (no switch): the stair bulkheads, the bridges and the tank room, the exit lights
  for (const l of LAMPS_78) lamp(b, l[0], l[1], l[2], { r: 4, i: 0.5, group: 78 });
  for (const l of LAMPS_78_SMALL) lamp(b, l[0], l[1], l[2], { r: 3, i: 0.3, group: 78 });
  for (const l of LAMPS_78_EXIT) lamp(b, l[0], l[1], l[2], { r: 3, i: 0.15, group: 78, colour: EXIT });
  for (const l of LAMPS_79) lamp(b, l[0], l[1], l[2], { r: 6, i: 1.3, group: 79, colour: WARM }); // walkway bracket lamps on the facade
  for (const run of W2_CONDUITS) conduit(b, run.pts);
}

const sw = (p: P, yaw: number, group: number): { pos: Vector3; yaw: number; group: number } => ({ pos: new Vector3(p[0], p[1], p[2]), yaw, group });

export const W2: WharfSection = {
  id: 'W2',
  build,
  rooms: ROOMS,
  switches: [
    sw(SW_70, PI / 2, 70),
    sw(SW_71, 0, 71),
    sw(SW_72, PI / 2, 72),
    sw(SW_73, 0, 73),
    sw([52.6, LOFT, 74.6], -PI / 2, 74),
    sw([47.9, LOFT, 77.2], -PI / 2, 75),
    sw(SW_76_LANDING, -PI / 2, 76),
    sw(SW_76_FOOT, 0, 76),
    sw(SW_77, 0, 77),
    sw(SW_79, PI, 79),
  ],
  hideSpots: [
    { pos: new Vector3(59.4, LOFT, 79) },
    { pos: new Vector3(42, 0, 61) },
    { pos: new Vector3(44.5, 0, 49.6) }, // the sand bin
    { pos: new Vector3(62.2, 0, 60.6) }, // the coal bunker's lid
    { pos: new Vector3(44.6, LOFT, 76.8) }, // the book trunk (its north side)
    { pos: new Vector3(53.4, LOFT, 65.2) }, // the pledge chest (its north side)
    { pos: new Vector3(64.8, 0, 68.0) }, // the flour bin
    { pos: new Vector3(64.8, LOFT, 63.8) }, // the sack hamper
  ],
  navSeeds: [
    new Vector3(58, 0, 55),
    new Vector3(60, LOFT, 60.5),
    new Vector3(46, LOFT, 66),
    new Vector3(60, LOFT, 66),
    new Vector3(72, LOFT, 66),
    new Vector3(60, ROOF, 66),
    new Vector3(52, LOFT, 77),
    new Vector3(65, LOFT, 77),
    new Vector3(60, 0, 71.7),
    new Vector3(61, 0, 66),
    new Vector3(79, 0, 60),
    new Vector3(76.7, ROOF, 66),
    new Vector3(45, LOFT, 62.8),
    new Vector3(53, 0, 62.8),
    new Vector3(44.75, LOFT, 70.5),
    new Vector3(69.25, LOFT, 71.75),
    new Vector3(72, LOFT, 65),
  ],
  lips: [LIP_PIER],
  legUps: [LEG_UP],
  pulls: [PULL_EAST],
  ropes: [ROPE_PIER],
  throws: [THROW_PAWN, THROW_PIE, THROW_LANE],
  shutters: [],
  dropGuards: [DG_STAIRHALL, DG_LIGHTWELL],
  doors: {
    'w2-pawn-stair-foot': [53, 0, 62],
    'w2-pawn-stair-top': [45, LOFT, 63.65],
    'w2-walkway-pawn': [45, LOFT, 62],
    'w2-pie-stair-top': [57.8, LOFT, 69],
    'w2-pawn-taking-in': [51.2, LOFT, 67.45],
    'w2-pie-taking-in': [63, LOFT, 70],
    'w2-clock-door': [60, LOFT, 76.75],
    'w2-bridge-west': [44.75, LOFT, 67.45],
    'w2-bridge-east': [69.25, LOFT, 70],
    'w2-stair-head': [55, LOFT, 73.5],
    'w2-tank-room': [72, LOFT, 64.4],
    'w2-reading-stage': [51.2, LOFT, 73.5],
  },
  debugPoints: [
    { id: 'w2-start', label: 'W2 start (arcade west arch)', pos: new Vector3(42, 0, 55), yaw: 0 },
    { id: 'w2-legup', label: 'W2 pier leg-up mark', pos: new Vector3(46, 0, 58.5), yaw: 0 },
    { id: 'w2-pull-partner', label: 'W2 east pull, the jumper', pos: new Vector3(73.5, 0, 58.3), yaw: 0 },
    { id: 'w2-throw-pawn', label: 'W2 pawn loft throw (thrower)', pos: new Vector3(51.2, LOFT, 67.2), yaw: 0 },
    { id: 'w2-throw-pie', label: 'W2 pie loft throw (thrower)', pos: new Vector3(63, LOFT, 69.6), yaw: 0 },
    { id: 'w2-throw-lane', label: 'W2 lane throw (thrower)', pos: new Vector3(76.7, ROOF, 66), yaw: PI / 2 },
    { id: 'w2-roof', label: 'W2 arcade roof (exit)', pos: new Vector3(60, ROOF, 66), yaw: 0 },
    { id: 'w2-downpipe', label: 'W2 west downpipe foot (E11)', pos: new Vector3(DOWNPIPE.x, LOFT, 61.0), yaw: 0 },
    { id: 'w2-vantage-arcade-a', label: 'W2 vantage: the arcade through the glazed roof (a)', pos: new Vector3(58.8, ROOF, 62.6), yaw: PI },
    { id: 'w2-vantage-arcade-b', label: 'W2 vantage: the arcade through the glazed roof (b)', pos: new Vector3(60.6, ROOF, 62.6), yaw: PI },
    { id: 'w2-vantage-reading-a', label: 'W2 vantage: the pawn stage across the lightwell (a)', pos: new Vector3(51.0, ROOF, 66.8), yaw: 0 },
    { id: 'w2-vantage-reading-b', label: 'W2 vantage: the pawn stage across the lightwell (b)', pos: new Vector3(52.6, ROOF, 66.8), yaw: 0 },
  ],
  deviations: [
    { space: 'w2-pawn-loft', why: 'the M2 cut-back (A28): the loft ends at z 67.6 (the take-off edge, 4.9 m from the reading stage) and its fire stair is rebuilt along the south facade (core x 44-53.85, z 62-63.8; foot door (53, 0, 62), the flight rising west to the top landing x 44-45.8 with the walkway door (45, 4.5, 62) and the loft door (45, 4.5, 63.65)); the room is z 62-67.6, the core included; the rota desk moves to (51.2, 64.4)' },
    { space: 'w2-pie-loft', why: 'the back stair core (x 56.2-57.8, z 62.2-69.9) stands in the loft; flight 6.5 m like the pawn stair; its foot door is in the east face at z 63' },
    { space: 'stair-hall', why: 'x 54-56 z 62-73.5 is the arcade -> reading room open stair, not a space: flight 1.7 wide z 62.3-70, the landing z 70-73.5 across the lightwell on mass; its walls run to the roof slab underside 8.1 (the brief says 7.8); the stair head is bolted on the reading-room side (A25)' },
    { space: 'party-wall', why: 'x 66-68 z 62-70 is mass 0-8.4 with a 1.2 x 2.1 door passage at z 66 (y 4.5-6.6); not a space' },
    { space: 'lightwell', why: 'x 44-70 z 70-73.5 (and x 45.5-53.85 z 67.6-70 behind the pawn loft cut-back) is open to the sky, not a space; the lightwell drain (a crouch duct under the landing, z 71.7) is added so a fall-in from the reading stage into the west half is not a softlock; the two A5 bridges (x 44-45.5 z 67.6-73.5, x 68.5-70 z 70-73.5) are enclosed footbridges at its ends' },
    { space: 'w2-arcade-roof', why: 'the roof over the pawn loft ends at z 67.3 (its south edge the eaves at z 61.85); the hatch x 71.4-72.6 z 65.4-66.6 opens into the tank room (x 70.4-74.0, z 64.4-67.6), no longer a loft opening (the dormer window link is gone); 2.2 m screens on x 54 (z 67.3-70) and z 70 (x 54-76) cut it off from the lower roofs; the x 76 parapet is broken at z 68.6-69.8 for the fire-escape cage; the lane landing is cut back to x 77.1' },
    { space: 'w2-arcade', why: 'the boost / rope / pull positions split from the graph\'s single marker [60, 0, 60.5]: the west pier (x 46) takes the boost and the rope, the east lip (x 73.5) the pull' },
  ],
  medkits: [{ pos: new Vector3(44.15, LOFT, 62.8), yaw: PI / 2 }], // the landlord's first-aid box in the pawn fire stair's top landing (A8)
  entry: [42, 0, 55],
  exit: [60, 8.4, 66],
};
