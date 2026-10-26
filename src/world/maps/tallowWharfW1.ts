import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import type { ShutterSpec } from '../../game/kit/shutter';
import { placeShutter } from '../shutterDoor';
import { stairSteps, type CoopLip } from './ctcourseGreybox';
import { doorIn, duct, lamp, mass, T, wall, type WharfSection } from './tallowWharfKit';

/**
 * Tallow Wharf section W1, the night market (mission-framework GB1; `docs/missions/slices/GB-briefs.md` "GB1"; graph
 * `docs/missions/prototypes/campaign-map/graph.json`; J8 G1: `docs/tallow-fixes/LIGHT.md` section 2, `EGRESS.md`). Frame: world
 * metres, x east, z north, y up; a `y` is a walking surface's feet height. Seven spaces: the canal steps (the start), the tea
 * stall, the market square, the gallery (a solid 4.5 m deck, two co-op boost lips and the market warden's caged stair at its
 * canal-steps end (its head gate bolted on the gallery side, `W1_BOLTS` slot 2: the boosted partner unbolts it on landing)), the
 * warden's office (up on the gallery), the fish hall and the service passage.
 *
 * Forced co-op in W1: the gallery and the office are reached only by a boost (C1), the bolted warden's stair (GB5 bolts its foot
 * door) or the market warden's caged stair (its head gate is bolted on the gallery side, `W1_BOLTS`: from the floor the stair ends
 * at a bolted gate, no solo bypass), and the fish
 * hall's north shutter (C2) is placed (`placeShutter`, J9 S3): the opening is shut on the guards' nav (A15) and the shutter stops
 * lamp light (A16); the crew gets through it only once it is opened. The ice-melt drain is the secret crouch duct. No stair is added to the office block (EGRESS pick 2); the gallery stair serves the open deck (G5).
 *
 * Lights (LIGHT.md section 2): 28 lamps in groups 60-67, every one working (no "lit by default" lamps): the market strings, the
 * fish hall pendants and facade brackets, the passage bulkheads and the canal and tea-stall lamps are lit to their bands, with
 * darkness only from cover, real gaps, cut circuits and shot lamps. The warden's office is closed tonight (M1, LP pick 13: he is
 * out on his rounds): only his desk lamp is left on over the tally desk (group 63, a socket circuit switched by the gallery door),
 * so the inspection hatch in its east wall reads dark. That hatch is route 1's own way into the hall, so it is the hall's entry
 * vantage (two crouched points); the gallery over the market holds the market's two standing points. Cover objects (the ledger
 * press, the ice store and benches, fish-box stacks, the oil bin) shade the hall and the stall rows and each takedown spot has a
 * hide spot within 8 m. Every switched group has a visible conduit run (`W1_CONDUITS`), and the desk is a built box (`W1_DESKS`).
 */

const WALL = '#8d887c';
const STALL = '#7a6a55';
const COUNTER = '#8a7358';
const FLOOR = '#5d5a54';
const DECK = '#6e6a62';
const WARM: [number, number, number] = [1, 0.82, 0.55];
const IRON = '#3d4146';
const CONDUIT = '#4f5459';
const WOOD = '#6b5a45';
const ICE = '#8c989c';
const CRATE = '#7b6d52';

/** The C2 fish hall shutter, placed by `placeShutter` in `build` (the plane's normal points +z, toward the passage). */
const SHUTTER: ShutterSpec = { id: 'w1-shutter', x: 22, y: 0, z: 58, yaw: 0, width: 3, height: 3 };

/** The two planned boost lips (C1): `y` is the lip top, `floor` the approach floor. */
const LIP_STEPS: CoopLip = { id: 'w1-lip-steps', y: 4.5, floor: 0, a: { x: 2.25, z: 14 }, b: { x: 5.75, z: 14 }, n: { x: 0, z: -1 } };
const LIP_MARKET: CoopLip = { id: 'w1-lip-market', y: 4.5, floor: 0, a: { x: 6, z: 26.5 }, b: { x: 6, z: 31.5 }, n: { x: 1, z: 0 } };

/** Named doors a later slice locks or bolts: the centre [x, y, z]. */
const DOORS = {
  'w1-warden-stair': [7, 0, 44],
  'w1-hall-side': [33, 0, 44],
  'w1-hall-back': [30, 0, 58],
  'w1-conn-near': [36, 0, 60],
  /** The gallery stair's head gate on the deck edge (bolted on the gallery side, `W1_BOLTS` slot 2; EGRESS E5, J8 G5). */
  'w1-gallery-stair-gate': [6.0, 4.5, 15.1],
} as const;

/** The warden's tally desk [x0, z0, x1, z1, floorY] (LIGHT.md rule 7): a visual-only box, top floor + 0.75, under lamp 63. */
export const W1_DESKS: readonly (readonly [number, number, number, number, number])[] = [[2.0, 50.1, 3.2, 50.7, 4.5]];

/** The switched groups' conduit runs (LIGHT.md rule 6): one polyline per fitting, from its switch's wall point up to `yRun`, along x, along z. */
export const W1_CONDUITS: readonly { group: number; pts: readonly (readonly [number, number, number])[] }[] = (() => {
  const runs: { group: number; pts: readonly (readonly [number, number, number])[] }[] = [];
  const string = (group: number, sx: number, sz: number, lampXs: readonly number[], lampZ: number): void => {
    // the string's wire at 3.0 is level with its lamps
    for (const x of lampXs) runs.push({ group, pts: [[sx, 1.2, sz], [sx, 3.0, sz], [x, 3.0, sz], [x, 3.0, lampZ]] });
  };
  string(60, 11.5, 20.5, [15.5, 20, 25.5, 31], 18.5);
  string(61, 11.5, 35.5, [13.5, 19, 24.5, 30], 37);
  // the hall circuit: eight pendants at yRun 5.7, then a 0.3 m drop to each; the two facade brackets out through the south wall at 3.6
  for (const z of [47.5, 54.5]) for (const x of [11, 19, 26, 33]) runs.push({ group: 62, pts: [[24.4, 1.2, 44.6], [24.4, 5.7, 44.6], [x, 5.7, 44.6], [x, 5.7, z], [x, 5.4, z]] });
  for (const x of [18, 26]) runs.push({ group: 62, pts: [[24.4, 1.2, 44.6], [24.4, 3.6, 44.6], [x, 3.6, 44.6], [x, 3.6, 43.7]] });
  // the desk lamp's socket circuit: a floor duct from the switch by the gallery door, up the desk's leg
  runs.push({ group: 63, pts: [[5.2, 5.7, 46.6], [5.2, 4.55, 46.6], [2.6, 4.55, 46.6], [2.6, 4.55, 50.4], [2.6, 5.45, 50.4]] });
  return runs;
})();

const room = (id: string, name: string, a: readonly [number, number, number, number], y: { minY?: number; maxY?: number }): RoomDef => ({ id, name, minX: a[0], minZ: a[1], maxX: a[2], maxZ: a[3], ...y });

const ROOMS: RoomDef[] = [
  room('w1-canal-steps', 'Canal steps', [2, 6, 12, 14], { minY: 0, maxY: 4.4 }),
  room('w1-tea-stall', 'Tea stall', [12, 6, 20, 14], { minY: 0, maxY: 4.4 }),
  room('w1-market', 'Night market', [6, 14, 36, 44], { minY: 0, maxY: 4.4 }),
  room('w1-gallery', 'Gallery', [2, 14, 6, 46], { minY: 4.5 }),
  room('w1-warden-office', "Warden's office", [0, 46, 8, 54], { minY: 4.5 }),
  room('w1-fish-hall', 'Fish hall', [8, 44, 36, 58], { minY: 0, maxY: 4.4 }),
  room('w1-service-passage', 'Service passage', [6, 58, 40, 62], { minY: 0, maxY: 4.4 }),
];

/** A plain `noLedge` collide box over the plan rectangle [x0, z0, x1, z1] from y0 to y1; `overhead` for roofs and ceilings. */
function blk(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, color: string, overhead = false): void {
  const i0 = b.boxes.length;
  b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
  b.mark(i0, overhead ? { noLedge: true, overhead: true } : { noLedge: true });
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

function build(b: LevelBuilder): void {
  // ---- the solid building mass round the section (every piece noLedge) ----
  mass(b, 0, 6, 2, 14); // west of the canal steps
  mass(b, 0, 14, 2, 46); // west of the gallery
  mass(b, 0, 54, 6, 62); // north of the office
  mass(b, 6, 54, 8, 58); // the corner between the office, the hall and the passage (unlisted plan)
  mass(b, 20, 6, 40, 14); // east of the tea stall
  mass(b, 36, 14, 40, 58); // east of the market and the hall

  // ---- canal steps and tea stall (y 0) ----
  // the tea stall: awning posts at the four corners, the serving counter, the urn crates (the dark nook between them and the canal rail)
  for (const [x, z] of [[12.3, 6.3], [19.7, 6.3], [12.3, 14.2], [19.7, 14.2]] as const) blk(b, x - 0.075, z - 0.075, x + 0.075, z + 0.075, 0, 2.6, STALL);
  blk(b, 13, 13.5, 19, 14.2, 0, 1.0, COUNTER);
  blk(b, 18, 6.6, 19.6, 8, 0, 2.0, STALL);

  // ---- the market square (open, no roof): two stall rows, the dark aisle between their backs ----
  blk(b, 12, 20, 32, 21, 0, 1.0, COUNTER); // row S counter
  blk(b, 12, 22.85, 32, 23.15, 0, 2.4, STALL); // row S back wall
  blk(b, 12, 32.85, 32, 33.15, 0, 2.4, STALL); // row N back wall
  blk(b, 12, 35, 32, 36, 0, 1.0, COUNTER); // row N counter

  // ---- the gallery deck (x 2-6, z 14-46, top 4.5): one solid block round the ice-melt drain, no parapet ----
  blk(b, 2, 14, 2.4, 46, 0, 4.5, DECK);
  blk(b, 3.6, 14, 6, 46, 0, 4.5, DECK);
  blk(b, 2.4, 14, 3.6, 46, 1.5, 4.5, DECK); // over the drain's mouth
  // the two planned boost lips (C1): manual ledges on the noLedge deck faces
  for (const l of [LIP_STEPS, LIP_MARKET]) b.ledge(l.a.x, l.a.z, l.b.x, l.b.z, l.y);

  // ---- the market warden's gallery stair (EGRESS E5, J8 G5): an enclosed iron core on the deck's east face at its canal-steps end ----
  // outer x 6.0-7.5, z 14.4-24.4, walls to 6.9 (2.4 m over the deck), roofed; the open foot arch faces the market's west strip, the
  // head gate on the deck edge is bolted on the gallery side (`W1_BOLTS` slot 2): from the floor the stair ends at a bolted gate
  wall(b, false, 7.45, 14.4, 24.4, [], 0, 6.9, 0.1, IRON); // east wall
  wall(b, true, 14.45, 6.0, 7.5, [], 0, 6.9, 0.1, IRON); // south wall
  wall(b, true, 24.35, 6.0, 7.5, [[6.2, 7.2]], 0, 6.9, 0.1, IRON, 2.1); // north wall: the foot archway x 6.2-7.2, 2.1 high, no leaf
  blk(b, 5.95, 14.4, 7.5, 24.4, 6.9, 7.0, IRON, true); // roof
  // the screen on the deck edge (y 4.5-6.9) with the head gate's gap z 14.6-15.6
  wall(b, false, 6.0, 14.4, 24.4, [[14.6, 15.6]], 4.5, 6.9, 0.1, IRON, 2.1);
  // the head gate: hinged at the south jamb z 14.6; swing +1 lays the open leaf east along the landing's south edge, clear of the flight head
  doorIn(b, false, 6.0, 15.1, 4.5, { w: 1.0 });
  blk(b, 6.0, 14.5, 7.4, 15.8, 0, 4.5, FLOOR); // the head landing (top 4.5, flush with the deck)
  {
    // the flight x 6.05-7.35: foot z 23.5 (y 0), rising south (yaw PI, as W3's flight 1) to the landing at z 15.8; 0.8 m foot landing to the arch
    const gs = stairSteps(4.5);
    const i0 = b.boxes.length;
    b.stairs(6.7, 15.8 + gs.len / 2, 1.3, gs.len, 4.5, gs.steps, IRON, Math.PI, 0);
    b.mark(i0, { noLedge: true });
  }

  // ---- the warden's office (x 0-8, z 46-54, floor 4.5, walls 4.5-7.5, ceiling 7.5-7.8) ----
  // the floor slab (top 4.5, 0.3 thick) with the stair hole x 6.2-7.8 z 46-52
  blk(b, 0, 46, 6.2, 54, 4.2, 4.5, FLOOR);
  blk(b, 7.8, 46, 8.15, 54, 4.2, 4.5, FLOOR);
  blk(b, 6.2, 52, 7.8, 54, 4.2, 4.5, FLOOR);
  // under it: mass to 4.2, split round the drain (x 2.2-3.8 to z 53.8, then east along z 52.2-53.8 to the hall wall)
  blk(b, 0, 46, 2.2, 54, 0, 4.2, FLOOR);
  blk(b, 2.2, 46, 3.8, 54, 1.7, 4.2, FLOOR);
  blk(b, 2.2, 53.8, 3.8, 54, 0, 1.7, FLOOR);
  blk(b, 3.8, 46, 6.2, 52.2, 0, 4.2, FLOOR);
  blk(b, 3.8, 52.2, 6.2, 53.8, 1.7, 4.2, FLOOR);
  blk(b, 3.8, 53.8, 6.2, 54, 0, 4.2, FLOOR);
  blk(b, 6.2, 52, 7.8, 52.2, 0, 4.2, FLOOR);
  blk(b, 6.2, 52.2, 8, 53.8, 1.7, 4.2, FLOOR);
  blk(b, 6.2, 53.8, 8, 54, 0, 4.2, FLOOR);
  blk(b, 7.8, 46, 8, 52.2, 0, 4.2, FLOOR);
  // the south wall (door from the gallery at x 4, floor 4.5); the east wall is below, with the inspection hatch
  wall(b, true, 46, 0, 6.2, [[3.4, 4.6]], 4.5, 7.5);
  doorIn(b, true, 46, 4, 4.5);
  blk(b, 0, 46, 8.15, 54, 7.5, 7.8, FLOOR, true); // ceiling
  // the drain's east leg meets the hall's west wall (below); the east wall x 8: the drain mouth at z 52.4-53.6 (1.5 high), the
  // inspection hatch over it (1.2 w x 1.2 h, bottom 4.5), a 4.5 m drop into the hall's west bay
  wall(b, false, 8, 46, 54, [[52.4, 53.6]], 0, 4.5, T, WALL, 1.5);
  wall(b, false, 8, 46, 54, [[52.4, 53.6]], 4.5, 7.5, T, WALL, 1.2);

  // ---- the warden's stair: an enclosed core (walls x 6.2 and 7.8, z 44-52, 0-7.5), bolted at its foot door by GB5 ----
  wall(b, false, 6.2, 44, 52, [], 0, 7.5);
  wall(b, false, 7.8, 44, 52, [], 0, 7.5);
  wall(b, true, 44, 6.2, 7.8, [[6.4, 7.6]], 0, 7.5);
  doorIn(b, true, 44, 7, 0);
  blk(b, 6.05, 43.85, 7.95, 46, 7.5, 7.8, FLOOR, true); // core lid south of the office ceiling
  {
    const st = stairSteps(4.5);
    // the flight runs inside x 6.35-7.65 from z 44.3 (y 0) to z 52 (y 4.5)
    b.stairs(7, 44.3 + st.len / 2, 1.3, st.len, 4.5, st.steps, FLOOR, 0, 0);
  }

  // ---- the fish hall (x 8-36, z 44-58, walls 0-6, roof 6.0-6.3) ----
  // south wall z 44: the main arch (x 20.25-23.75, 4.0 high) and the side door at x 33
  wall(b, true, 44, 7.8, 20.25, [], 0, 6);
  wall(b, true, 44, 20.25, 23.75, [[20.25, 23.75]], 0, 6, T, WALL, 4.0);
  wall(b, true, 44, 23.75, 36, [[32.4, 33.6]], 0, 6);
  doorIn(b, true, 44, 33, 0);
  // east wall x 36 (backed by the mass), west wall x 8 below the office and north of it
  wall(b, false, 36, 44, 58, [], 0, 6);
  wall(b, false, 8, 44, 46, [], 0, 6);
  wall(b, false, 8, 54, 58, [], 0, 6);
  // north wall z 58: the C2 shutter opening (x 20.5-23.5, 3.0 high; it holds the C2 shutter, J9 S3) and the back door at x 30
  wall(b, true, 58, 8, 25, [[20.5, 23.5]], 0, 6, T, WALL, 3.0);
  const iShutter = b.boxes.length;
  placeShutter(b, SHUTTER);
  b.mark(iShutter, { noLedge: true }); // the head box and guides: never a lip (only planned lips, A28)
  wall(b, true, 58, 25, 36, [[29.4, 30.6]], 0, 6);
  doorIn(b, true, 58, 30, 0);
  blk(b, 8, 44, 36, 58, 6.0, 6.3, WALL, true); // roof

  // ---- the ice-melt drain (secret crouch duct, canal steps -> fish hall): under the gallery and the office, out through the hall's west wall ----
  duct(b, [[3, 14], [3, 53], [8, 53]], 0);

  // ---- the service passage (x 6-40, z 58-62, roof 3.0-3.2) ----
  blk(b, 6, 58, 40, 62, 3.0, 3.2, WALL, true);
  wall(b, false, 36, 58, 62, [[59.4, 60.6]], 0, 3);
  doorIn(b, false, 36, 60, 0);

  // ---- cover objects (every one a `noLedge` collide box; each shades a route or holds a hide spot) ----
  blk(b, 0.15, 52.6, 1.2, 53.85, 4.5, 6.5, WOOD); // the warden's ledger press, the office's NW corner (cover from the desk lamp)
  blk(b, 8.3, 54.6, 11.3, 57.7, 0, 2.4, ICE); // the ice store in the hall's west bay (north of the drain outlet)
  blk(b, 13, 51.6, 18.5, 52.6, 0, 0.9, ICE); // ice bench, west (clear of the watchman's x 12 leg and the scales pair)
  blk(b, 25, 51.6, 32, 52.6, 0, 0.9, ICE); // ice bench, east (clear of the watchman's x 33 leg)
  blk(b, 34.0, 47.5, 35.7, 50.5, 0, 1.8, CRATE); // fish-box stacks along the hall's east wall
  blk(b, 17.0, 44.4, 18.6, 45.2, 0, 1.4, CRATE); // a fish-box pile inside the hall, west of the arch (1.65 m clear of it)
  blk(b, 11.9, 15.7, 12.9, 16.7, 0, 0.9, IRON); // the trimmer's oil bin at row S's west end
  blk(b, 32.4, 33.6, 33.4, 34.4, 0, 0.8, CRATE); // a fish box at row N's east end

  // ---- lights (groups 60-67: LIGHT.md section 2, 28 lamps, every one on) ----
  for (const x of [15.5, 20, 25.5, 31]) lamp(b, x, 3.0, 18.5, { r: 8, i: 0.6, group: 60, colour: WARM }); // row S stall string
  for (const x of [13.5, 19, 24.5, 30]) lamp(b, x, 3.0, 37, { r: 8, i: 0.45, group: 61, colour: WARM }); // row N stall string
  for (const z of [47.5, 54.5]) for (const x of [11, 19, 26, 33]) lamp(b, x, 5.4, z, { r: 8, i: 1.5, group: 62 }); // fish hall pendants
  for (const x of [18, 26]) lamp(b, x, 3.6, 43.7, { r: 6, i: 0.5, group: 62, colour: WARM }); // facade brackets flanking the arch
  // the office is closed (M1): only the warden's desk lamp is left on, standing on his tally desk
  lamp(b, 2.6, 5.7, 50.4, { r: 3.5, i: 0.5, group: 63, colour: WARM });
  lamp(b, 16, 2.4, 12, { r: 6, i: 0.3, group: 64, colour: WARM, electric: false }); // the tea man's paraffin lamp, switched at the lamp
  lamp(b, 7, 3.5, 6.4, { r: 6, i: 0.3, group: 65 }); // the canal company's lamp post (photocell)
  lamp(b, 22, 7.5, 43.6, { r: 6, i: 0.6, group: 66, destructible: false, electric: false }); // the clock dial's gas jet
  for (const x of [10, 16, 22, 28, 34]) lamp(b, x, 2.85, 60, { r: 5, i: 1.0, group: 67 }); // the passage's maintained bulkheads
  lamp(b, 38, 2.6, 60, { r: 5, i: 0.35, group: 67 }); // the vestibule bulkhead

  // the warden's tally desk (LIGHT.md rule 7): visual only, so it adds no nav cell, cover or light row
  for (const [x0, z0, x1, z1, fy] of W1_DESKS) b.box((x0 + x1) / 2, fy + 0.375, (z0 + z1) / 2, x1 - x0, 0.75, z1 - z0, WOOD, 0, 0, false);
  // the visible links from each switch to its fittings (LIGHT.md rule 6)
  for (const run of W1_CONDUITS) conduit(b, run.pts);
}

export const W1: WharfSection = {
  id: 'W1',
  build,
  rooms: ROOMS,
  switches: [
    { pos: new Vector3(11.5, 0, 20.5), yaw: -Math.PI / 2, group: 60 },
    { pos: new Vector3(11.5, 0, 35.5), yaw: -Math.PI / 2, group: 61 },
    { pos: new Vector3(24.4, 0, 44.6), yaw: 0, group: 62 },
    { pos: new Vector3(5.2, 4.5, 46.6), yaw: 0, group: 63 },
    { pos: new Vector3(16, 0, 12.6), yaw: 0, group: 64 },
  ],
  // body containers (A9): the two old ones, the oil bin (south side), an empty urn crate at the urn stack, the fish box (north side) and the fish-box pile
  hideSpots: [
    { pos: new Vector3(20, 0, 23.6) },
    { pos: new Vector3(9.5, 0, 46) },
    { pos: new Vector3(12.4, 0, 15.3) },
    { pos: new Vector3(19.2, 0, 8.4) },
    { pos: new Vector3(32.9, 0, 34.8) },
    { pos: new Vector3(17.8, 0, 45.6) },
  ],
  navSeeds: [new Vector3(7, 0, 10), new Vector3(20, 0, 28), new Vector3(4, 4.5, 30), new Vector3(3, 4.5, 50), new Vector3(20, 0, 51), new Vector3(20, 0, 60), new Vector3(38, 0, 60)],
  lips: [LIP_STEPS, LIP_MARKET],
  legUps: [
    { lip: 'w1-lip-steps', x: 4, y: 0, z: 13.5, facing: { x: 0, z: 1 } },
    { lip: 'w1-lip-market', x: 6.5, y: 0, z: 29, facing: { x: -1, z: 0 } },
  ],
  pulls: [],
  ropes: [],
  throws: [],
  shutters: [SHUTTER],
  dropGuards: [],
  doors: DOORS,
  // the market warden's first-aid box on the canal steps' west wall (A8): the barge crews come ashore here
  medkits: [{ pos: new Vector3(2.15, 0, 7.0), yaw: Math.PI / 2 }],
  debugPoints: [
    { id: 'w1-start', label: 'W1 start (canal steps)', pos: new Vector3(7, 0, 10), yaw: 0 },
    { id: 'w1-legup-steps', label: 'W1 leg-up, canal steps', pos: new Vector3(4, 0, 13.5), yaw: 0 },
    { id: 'w1-legup-market', label: 'W1 leg-up, market', pos: new Vector3(6.5, 0, 29), yaw: -Math.PI / 2 },
    { id: 'w1-shutter', label: 'W1 fish hall shutter', pos: new Vector3(22, 0, 57.2), yaw: 0 },
    { id: 'w1-passage-end', label: 'W1 passage end', pos: new Vector3(38, 0, 60), yaw: Math.PI / 2 },
    // the encounter vantages (G157 6): two per encounter, dark (<= 0.45), no guard within 6 m
    { id: 'w1-vantage-market-a', label: 'W1 vantage, gallery over the market A', pos: new Vector3(3.0, 4.5, 29.4), yaw: Math.PI / 2 },
    { id: 'w1-vantage-market-b', label: 'W1 vantage, gallery over the market B', pos: new Vector3(3.0, 4.5, 30.8), yaw: Math.PI / 2 },
    { id: 'w1-vantage-hall-a', label: "W1 vantage, warden's office hatch A (crouched)", pos: new Vector3(7.4, 4.5, 52.6), yaw: Math.PI / 2 },
    { id: 'w1-vantage-hall-b', label: "W1 vantage, warden's office hatch B (crouched)", pos: new Vector3(7.4, 4.5, 53.6), yaw: Math.PI / 2 },
  ],
  deviations: [
    { space: 'w1-warden-office', why: "The warden's stair core (walls x 6.2 and 7.8, z 44-52) stands in the office's south-east corner and the fire-stair link marker moved from [12.5, 0, 39.5] to the stair's foot door [7, 0, 44]; the office's own box is unchanged." },
    { space: 'w1-gallery', why: 'The market lip is 4.5 m (the graph says 4.4): the gallery is one 4.5 m floor. GBM re-measures.' },
    { space: 'w1-tea-stall', why: 'z max 14, not 14.5: rooms may not overlap, and the graph box runs 0.5 m into the market (z 14-44); a stall is not inside the market, so the two are disjoint, not nested.' },
  ],
  entry: [7, 0, 10],
  exit: [38, 0, 60],
};
