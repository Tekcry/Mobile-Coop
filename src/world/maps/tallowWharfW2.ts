import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import { stairSteps, type CoopLip } from './ctcourseGreybox';
import { doorIn, duct, lamp, mass, PARAPET, T, wall, type WharfPull, type WharfRope, type WharfSection, type WharfThrow } from './tallowWharfKit';

/**
 * Tallow Wharf section W2, the arcade lofts (mission-framework GB2; `docs/missions/slices/GB-briefs.md` "GB2", graph
 * `docs/missions/prototypes/campaign-map/graph.json` spaces `w2-*`). Frame: x east, z north, y up; a y below is a walking surface's
 * feet height. Every box is `noLedge` but the one planned lip (`w2-lip-pier`, a manual ledge on the pier's south face).
 *
 * The forced co-op moves: C3 on the walkway (boost + rope at the west pier, pull at the east lip), then C4 (two lightwell throws,
 * 2.5 m, level 4.5 -> 4.5, from the south lofts to the north lofts' iron stages) and C5 (the lane throw, arcade roof -> the W3 corner
 * roof, 2.5 m, level 8.4 -> 8.4). No shutter here. Plan rows (z): the arcade z 48-62; the loft row z 62-70 (pawn loft x 44-54, stair
 * hall 54-56, pie shop / loft 56-66, party wall 66-68, lane-window loft 68-76) under the arcade roof (8.4); the lightwell z 70-73.5;
 * the reading room and the clock loft z 73.5-80.
 */

const BRICK = '#82756a';
const BRICK_D = '#6d6258';
const SLAB = '#6f6a62';
const LEAD = '#5b6168';
const IRON = '#4a4f55';
const GLAZE = '#8fa9b6';
const FILL = '#2f3236';
const STEP = '#7a7872';

/** A plan rectangle [x0, z0, x1, z1]. */
type Rect = [number, number, number, number];

const PI = Math.PI;
/** The loft floors' feet height, and the arcade roof's. */
const LOFT = 4.5;
const ROOF = 8.4;
/** The south lofts' roof slab underside (the taking-in doors' head, the throw's clear air: 3.6 m over the loft floor). */
const ROOF_UNDER = 8.1;

/** The pawn loft's lit rota desk under lamp group 73 (moved from (52.5, 63.5): the fire-stair core stands there), feet height: the tgc-opt board. */
export const W2_ROTA_DESK = [51.2, LOFT, 64] as const;

/** A solid `noLedge` collide box over a plan rectangle between two heights (`overhead` for a ceiling or roof). */
function blk(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, color = BRICK, overhead = false): void {
  const i0 = b.boxes.length;
  b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
  b.mark(i0, overhead ? { noLedge: true, overhead: true } : { noLedge: true });
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

// ---- the C3 walkway (choke) ----
const LIP_PIER: CoopLip = { id: 'w2-lip-pier', y: LOFT, floor: 0, a: { x: 45.25, z: 59 }, b: { x: 46.75, z: 59 }, n: { x: 0, z: -1 } };
const LEG_UP = { lip: 'w2-lip-pier', x: 46, y: 0, z: 58.5, facing: { x: 0, z: 1 } } as const;
const ROPE_PIER: WharfRope = { id: 'w2-rope-pier', link: 'w2-arcade -> w2-walkway', holder: { x: 46, y: LOFT, z: 59.35 }, yaw: PI, foot: { x: 46, y: 0, z: 58.4 } };
const PULL_EAST: WharfPull = { id: 'w2-pull-east', link: 'w2-arcade -> w2-walkway', holder: { x: 73.5, y: LOFT, z: 59.35 }, yaw: PI, partner: { x: 73.5, y: 0, z: 58.3 } };

// ---- C4 and C5 throws ----
const THROW_PAWN: WharfThrow = { id: 'w2-throw-pawn', link: 'w2-pawn-loft -> w2-reading-room', thrower: { x: 50.5, y: LOFT, z: 69.6 }, runner: { x: 50.5, y: LOFT, z: 68.3 }, stage: [49, 72.5, 52, 73.5] };
const THROW_PIE: WharfThrow = { id: 'w2-throw-pie', link: 'w2-pie-loft -> w2-clock-loft', thrower: { x: 63, y: LOFT, z: 69.6 }, runner: { x: 63, y: LOFT, z: 68.3 }, stage: [61.5, 72.5, 64.5, 73.5] };
const THROW_LANE: WharfThrow = { id: 'w2-throw-lane', link: 'w2-arcade-roof -> w3-roof', thrower: { x: 79.2, y: ROOF, z: 66 }, runner: { x: 77.6, y: ROOF, z: 66 }, stage: [82, 64.5, 86.5, 67.5] };

/** The rooms (HUD tags): the graph's nine spaces; ground spaces band 0-4.4, lofts 4.5-8.3, the roof 8.4 up. */
const ROOMS: RoomDef[] = [
  { id: 'w2-arcade', name: 'Arcade', minX: 40, maxX: 76, minZ: 48, maxZ: 62, minY: 0, maxY: 4.4 },
  { id: 'w2-pie-shop', name: 'Pie shop', minX: 56, maxX: 66, minZ: 62, maxZ: 70, minY: 0, maxY: 4.4 },
  { id: 'w2-walkway', name: 'Walkway', minX: 44, maxX: 76, minZ: 59, maxZ: 62, minY: LOFT, maxY: 8.3 },
  { id: 'w2-pie-loft', name: 'Pie loft', minX: 56, maxX: 66, minZ: 62, maxZ: 70, minY: LOFT, maxY: 8.3 },
  { id: 'w2-pawn-loft', name: 'Pawn loft', minX: 44, maxX: 54, minZ: 62, maxZ: 70, minY: LOFT, maxY: 8.3 },
  { id: 'w2-reading-room', name: 'Reading room', minX: 44, maxX: 60, minZ: 73.5, maxZ: 80, minY: LOFT, maxY: 8.3 },
  { id: 'w2-clock-loft', name: 'Clock loft', minX: 60, maxX: 70, minZ: 73.5, maxZ: 80, minY: LOFT, maxY: 8.3 },
  { id: 'w2-lane-window', name: 'Lane window', minX: 68, maxX: 76, minZ: 62, maxZ: 70, minY: LOFT, maxY: 8.3 },
  { id: 'w2-arcade-roof', name: 'Arcade roof', minX: 44, maxX: 76, minZ: 62, maxZ: 70, minY: ROOF },
];

function build(b: LevelBuilder): void {
  // ---- solid mass (every plan inside the box that is no space, stair core or listed element) ----
  mass(b, 40, 62, 44, 80); // west of the lofts and the reading room
  mass(b, 44, 62, 52.05, 70, 0, LOFT); // under the pawn loft, west of its stair core
  mass(b, 68, 62, 76, 70, 0, LOFT); // under the lane-window loft
  mass(b, 44, 73.5, 70, 80, 0, LOFT); // under the reading room and the clock loft
  mass(b, 70, 70, 76, 80, 0, ROOF); // the corner
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
  wall(b, true, 62, 44, 76, [[48.4, 49.6], [60.4, 61.6], [71.4, 72.6]], LOFT, ROOF_UNDER, T, BRICK);
  doorIn(b, true, 62, 53, 0); // pawn stair foot
  doorIn(b, true, 62, 55, 0); // stair hall
  doorIn(b, true, 62, 61, 0); // pie shop
  doorIn(b, true, 62, 49, LOFT); // pawn loft
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

  // ---- the pawn fire stair: core x 52.2-53.8 z 62.2-69.9, foot door (53, 0, 62), top door in the west face at z 69 ----
  wall(b, false, 52.2, 62, 69.9, [], 0, LOFT, T, BRICK_D);
  wall(b, false, 52.2, 62, 69.9, [[68.4, 69.6]], LOFT, ROOF_UNDER, T, BRICK_D);
  wall(b, false, 53.8, 62, 69.9, [], 0, ROOF_UNDER, T, BRICK_D);
  wall(b, true, 69.9, 52.05, 53.95, [], 0, ROOF_UNDER, T, BRICK_D);
  flight(b, 53, 1.3, 62.2, 6.5, LOFT);
  mass(b, 52.35, 68.7, 53.65, 69.75, 0, LOFT); // the level landing z 68.7-69.9
  doorIn(b, false, 52.2, 69, LOFT);
  // the pawn loft's north wall with the taking-in door x 49.5-51.5 (2.0 x 3.6, T 0.2: inner face z 69.9)
  wall(b, true, 70, 44, 54, [[49.5, 51.5]], LOFT, ROOF_UNDER, 0.2, BRICK, 3.6);
  doorIn(b, true, 70, 50.5, LOFT, { w: 2.0, h: 3.6 });

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

  // ---- the lane-window loft (4.5): east wall on the lane, north wall onto the lightwell ----
  wall(b, false, 76, 62, 70, [], LOFT, ROOF_UNDER, T, BRICK);
  wall(b, true, 70, 68, 70, [], LOFT, ROOF_UNDER, 0.2, BRICK);

  // ---- the arcade roof (8.4): lead flat over the loft row with the hatch, parapets, the old bridge landing, the fire-escape deck ----
  slab(b, [44, 62, 76, 70.1], ROOF, 0.3, [[71.4, 65.4, 72.6, 66.6]], LEAD);
  // the fixed loft ladder up the hatch (the dormer window shares the opening): the line 0.45 short of the hole's north edge, so
  // the top is at that edge (z 66.6) and the top-out (+0.4) lands on the slab at z 67.0, not over the hole (the campus S3 convention)
  b.ladder(72, 66.15, LOFT, ROOF, 0);
  blk(b, 44, 69.9, 76, 70.1, ROOF, ROOF + PARAPET, IRON); // parapet on z 70
  blk(b, 44, 62, 44.2, 70, ROOF, ROOF + PARAPET, IRON); // parapet on x 44
  // x 76: broken at z 64.5-67.5 (the bridge landing) and z 68.6-69.8 (the deck)
  for (const [z0, z1] of [[62, 64.5], [67.5, 68.6], [69.8, 70]] as const) blk(b, 75.9, z0, 76.1, z1, ROOF, ROOF + PARAPET, IRON);
  // the old bridge landing x 76-79.5 z 64.5-67.5 (slab 8.1-8.4 on a corbel block down to 6.0); no parapet on its east edge
  blk(b, 76, 64.5, 79.5, 67.5, 6.0, ROOF, LEAD);
  blk(b, 76.1, 64.4, 79.5, 64.6, ROOF, ROOF + PARAPET, IRON);
  blk(b, 76.1, 67.4, 79.5, 67.6, ROOF, ROOF + PARAPET, IRON);
  // the fire-escape bridge (W2 half): a deck x 76-82 z 68.6-69.8 at 8.4, railings 1.1 on both long sides, open at x 76
  blk(b, 76, 68.6, 82, 69.8, ROOF_UNDER, ROOF, LEAD);
  blk(b, 76.1, 68.55, 82, 68.65, ROOF, ROOF + PARAPET, IRON);
  blk(b, 76.1, 69.75, 82, 69.85, ROOF, ROOF + PARAPET, IRON);

  // ---- the lightwell's north side: the reading room and the clock loft (4.5), their roof 7.5-7.8, the iron landing stages ----
  wall(b, true, 73.5, 44, 62, [[49.9, 51.1], [54.4, 55.6]], LOFT, 7.5, T, BRICK);
  wall(b, true, 73.5, 64, 70, [], LOFT, 7.5, T, BRICK); // x 62-64 is the clock loft's taking-in opening
  doorIn(b, true, 73.5, 50.5, LOFT); // from the reading stage
  doorIn(b, true, 73.5, 55, LOFT); // from the stair landing
  doorIn(b, true, 73.5, 63, LOFT, { w: 2.0, h: 3.0 }); // the clock loft's taking-in door, from its stage
  wall(b, false, 60, 73.5, 80, [[76.15, 77.35]], LOFT, 7.5, T, BRICK);
  doorIn(b, false, 60, 76.75, LOFT);
  blk(b, 44, 73.5, 70, 80, 7.5, 7.8, LEAD, true);
  for (const s of [THROW_PAWN.stage, THROW_PIE.stage]) blk(b, s[0], s[1], s[2], s[3], LOFT - 0.2, LOFT, IRON);

  // ---- lights: lit by default; groups 70-76, every circuit has a switch ----
  for (const x of [46, 54, 62, 70]) lamp(b, x, 6.5, 53, { r: 10, i: 1.1, group: 70 });
  lamp(b, 60, 2.6, 63.2, { r: 5, i: 0.8, group: 71 });
  lamp(b, 61, 7.0, 66, { r: 5, i: 0.8, group: 72 });
  lamp(b, W2_ROTA_DESK[0], 5.6, W2_ROTA_DESK[2], { r: 4, i: 0.7, group: 73 });
  lamp(b, 51, 5.4, 74.6, { r: 4, i: 0.8, group: 74 });
  lamp(b, 47, 5.4, 78.6, { r: 4, i: 0.7, group: 75 });
  lamp(b, 55, 7.2, 72, { r: 6, i: 0.8, group: 76 });
}

export const W2: WharfSection = {
  id: 'W2',
  build,
  rooms: ROOMS,
  switches: [
    { pos: new Vector3(41, 0, 57.4), yaw: PI / 2, group: 70 },
    { pos: new Vector3(64.6, 0, 64), yaw: -PI / 2, group: 71 },
    { pos: new Vector3(58.4, LOFT, 68.8), yaw: PI / 2, group: 72 },
    { pos: new Vector3(50.2, LOFT, 62.6), yaw: 0, group: 73 },
    { pos: new Vector3(51.8, LOFT, 74.3), yaw: 0, group: 74 },
    { pos: new Vector3(47.8, LOFT, 78.8), yaw: PI, group: 75 },
    { pos: new Vector3(55.4, LOFT, 72.4), yaw: -PI / 2, group: 76 },
  ],
  hideSpots: [{ pos: new Vector3(59.4, LOFT, 79) }, { pos: new Vector3(42, 0, 61) }],
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
    new Vector3(78, ROOF, 66),
  ],
  lips: [LIP_PIER],
  legUps: [LEG_UP],
  pulls: [PULL_EAST],
  ropes: [ROPE_PIER],
  throws: [THROW_PAWN, THROW_PIE, THROW_LANE],
  shutters: [],
  dropGuards: [],
  doors: {
    'w2-pawn-stair-top': [52.2, LOFT, 69],
    'w2-pie-stair-top': [57.8, LOFT, 69],
    'w2-pawn-taking-in': [50.5, LOFT, 70],
    'w2-pie-taking-in': [63, LOFT, 70],
    'w2-clock-door': [60, LOFT, 76.75],
  },
  debugPoints: [
    { id: 'w2-start', label: 'W2 start (arcade west arch)', pos: new Vector3(42, 0, 55), yaw: 0 },
    { id: 'w2-legup', label: 'W2 pier leg-up mark', pos: new Vector3(46, 0, 58.5), yaw: 0 },
    { id: 'w2-pull-partner', label: 'W2 east pull, the jumper', pos: new Vector3(73.5, 0, 58.3), yaw: 0 },
    { id: 'w2-throw-pawn', label: 'W2 pawn loft throw (thrower)', pos: new Vector3(50.5, LOFT, 69.6), yaw: 0 },
    { id: 'w2-throw-pie', label: 'W2 pie loft throw (thrower)', pos: new Vector3(63, LOFT, 69.6), yaw: 0 },
    { id: 'w2-throw-lane', label: 'W2 lane throw (thrower)', pos: new Vector3(79.2, ROOF, 66), yaw: PI / 2 },
    { id: 'w2-roof', label: 'W2 arcade roof (exit)', pos: new Vector3(60, ROOF, 66), yaw: 0 },
  ],
  deviations: [
    { space: 'w2-pawn-loft', why: 'the pawn fire stair core (x 52.2-53.8, z 62.2-69.9) stands in the loft, so the foot door moves to (53, 0, 62) (graph marker [49, 0, 62]); the flight is 6.5 m (27 risers of 0.167, run 0.24) so the top door at z 69 opens onto a level landing; the desk lamp moves from (52.5, 63.5) to (51.2, 64) (the core stands at the old spot)' },
    { space: 'w2-pie-loft', why: 'the back stair core (x 56.2-57.8, z 62.2-69.9) stands in the loft; flight 6.5 m like the pawn stair; its foot door is in the east face at z 63' },
    { space: 'stair-hall', why: 'x 54-56 z 62-73.5 is the arcade -> reading room open stair, not a space: flight 1.7 wide z 62.3-70, the landing z 70-73.5 across the lightwell on mass; its walls run to the roof slab underside 8.1 (the brief says 7.8)' },
    { space: 'party-wall', why: 'x 66-68 z 62-70 is mass 0-8.4 with a 1.2 x 2.1 door passage at z 66 (y 4.5-6.6); not a space' },
    { space: 'lightwell', why: 'x 44-70 z 70-73.5 is open to the sky, not a space; the lightwell drain (a crouch duct under the landing, z 71.7) is added so a fall-in from the reading stage into the west half is not a softlock' },
    { space: 'w2-arcade-roof', why: 'the dormer window (link window) shares the hatch opening x 71.4-72.6 z 65.4-66.6; the x 76 parapet is also broken at z 68.6-69.8 for the fire-escape deck' },
    { space: 'w2-arcade', why: 'the boost / rope / pull positions split from the graph\'s single marker [60, 0, 60.5]: the west pier (x 46) takes the boost and the rope, the east lip (x 73.5) the pull' },
  ],
  entry: [42, 0, 55],
  exit: [60, 8.4, 66],
};
