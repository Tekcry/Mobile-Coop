import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import type { MapLayout } from '../mapDef';
import { makeCone } from '../lights';
import { addLampRooms, EXIT_GREEN, passLamps, type LampRoom } from './lampRooms';

/**
 * Sector Ops section 2 of the Warehouse (warehouse-s23, SPEC 2.2, BUILD-S2.md): the storage hall, a greybox. Frame: x west
 * to east, z south to north, y up, metres. The hall is x -24 (perimeter inner face) to x -4 (wall centre line), z -6 (the
 * wall section 1 builds) to z 18. `warehouse.ts` builds the perimeter, floor and section 3 (`storageHall: false` skips
 * its own racking and x -4 wall); this file builds the rest. (sector-fixes-r R2) The co-op layer: the high-bay row R3
 * (`S2_COOP`) and the VNA escape gate in R1S's through-bay (`S2_BOLTS`); docs/archive/sector-fixes/r/R2.md.
 */

const WALL = '#b7b2a6';
const WALL_DARK = '#7d786d';
const STEEL = '#55606a';
const CRATE = '#a8784a';
const HAZARD = '#e8b923';
const DESK = '#8a6a4c';
const SHRINK = '#c4c0b0';
const PIPE = '#6d7378';
/** Racking bays. */
const RACK = '#3f6f9a';
const BEAM = '#e07b22';
const T = 0.3;
const PI = Math.PI;

/** Section 2's rooms (HUD tags; squads come from the mode). Plan boxes, ground floor. */
export const S2_ROOMS: RoomDef[] = [
  { id: 'storage', name: 'Storage Hall', minX: -24, maxX: -4, minZ: -6, maxZ: 18 },
  { id: 'hvCage', name: 'High-value Cage', minX: -24, maxX: -19.9, minZ: 12, maxZ: 18 },
].map((r) => ({ ...r, squad: [] }));

/** Light switches (circuits 40 and 41: the marshalling lane, the issue desk). */
export const S2_SWITCHES: NonNullable<MapLayout['switches']> = [
  { pos: new Vector3(-13.2, 0, -5.85), yaw: 0, group: 40 },
  { pos: new Vector3(-15.9, 0, 17.85), yaw: PI, group: 41 },
];

export const S2_PICKUPS: NonNullable<MapLayout['pickups']> = [];

/**
 * (sector-fixes-r R2) The high-bay row: R3's two blocks are the reach truck's high put-away locations, tops 4.4 (the co-op
 * band, LD 11.3: `WALL_JUMP.maxUp` + 0.5 to `TEAM.boostMax`), with no rolling ladder (the old R3S ladder is gone).
 */
export const S2_HIGH_TOP = 4.4;

/**
 * (sector-fixes-r R2) Section 2's co-op-only routes: a leg-up onto a planned lip of the high-bay row, then the relay or
 * the two-person rope for the partner. (sector-fixes-r fix) Each entry is one high bay; a bay with no lip is a plain
 * `noLedge` block. `bay` is the block's plan box [x0, z0, x1, z1]; each lip is a run of one face
 * (`nx` its outward normal along x) from `z0` to `z1`, the rest of the block is `noLedge` (cut back 3 m from every solo
 * surface: rack tops, the sprinkler mains, the staged loads and stacks); `spot` is the booster's feet [x, z], facing the
 * face. The lips stay out from under the roof-sheet bands (their collision at 6.03 leaves 1.63 m over a 4.4 top: there
 * the top is crouch-walked). `tests/warehouseCoopS2.test.ts` checks the band, the solo gap and the way down; docs/archive/sector-fixes/r/R2.md.
 * (sector-fixes-r fix) No lip faces A3: the R2 rack tops (4.0) are 3.0 m across it, and a top-gear running jump off them
 * meets R3's face with the feet still over the lip's in-air grab window (`FALL_GRAB`, tests/helpers/soloJumpReach.ts:
 * 4.5 m of reach), so a player alone would hang on it. C1a (R3S from A3) and C2 (R3N from A3) are gone; R3S keeps C1b
 * (the east gangway), R3N is a lipless block.
 */
export interface S2CoopRoute {
  name: string;
  bay: readonly [number, number, number, number];
  lips: readonly { x: number; nx: -1 | 1; z0: number; z1: number; spot: readonly [number, number] }[];
}
export const S2_COOP: readonly S2CoopRoute[] = [
  {
    name: 'C1 south high bay (R3S): leg-up from the east gangway, vantage over the lane, A3 and the picker',
    bay: [-10.5, -3, -8.2, 4],
    lips: [{ x: -8.2, nx: 1, z0: 1.0, z1: 3.3, spot: [-7.7, 2.2] }],
  },
  {
    // (sector-fixes-r fix) no lip: A3's side is in a solo jump's reach from R2N, the gangway's within 2.2 m of the main (x -6)
    name: 'R3N north high bay: no co-op lip (C2 removed in the fix round)',
    bay: [-10.5, 7, -8.2, 15],
    lips: [],
  },
];

/**
 * (sector-fixes-r e2e fix, Michael M1 2026-10-22 ~21:20: "Add another") C2, section 2's second co-op-only route: the old
 * dispatch mezzanine's landing on the x -4 wall over the east gangway. A steel landing hung off the wall at 4.4 (the band),
 * where a stair once came down to the gangway; the stair went when the picking trucks took the gangway, and the
 * mezzanine beyond it was taken out with the wall's fire upgrade, so the landing is a dead end. Leg-up from the gangway
 * floor at `spot` facing +x onto its west lip (x `x0`, z `z0`..`z1`), then the relay or the rope for the partner. A dark
 * vantage over the lane's east end and the charge hand, and the picker's leg (x -7.4) passes 0.8 m off the hanging body:
 * a hang-drop onto him. Way down alone: let go of the lip (open gangway floor under it). Hung (a 0.3 slab, `overhead`): the
 * floor stays open to the nav grid and the picker walks past under its edge. Railed south and north (the rails cut those
 * lips), the wall on the east: the west lip is the only grip. Solo reach (tests/helpers/soloJumpReach.ts, top gear): the
 * nearest solo top is the empty-pallet stack (2.0, z -3.4..-2.2), 4.1 m from the lip against a reach of 3.45; the sprinkler
 * main (z 6.4, 5.0) is 3.06 m grip to grip (a hang's jump spans 2.5). Under the hall roof's panel (visual only): standing
 * room, as on R3S.
 */
export const S2_LANDING = { x0: -6.4, x1: -4.15, z0: 1.9, z1: 3.4, top: S2_HIGH_TOP, spot: [-6.9, 2.65] as const } as const;

/**
 * (sector-fixes-r R2) The team door: the VNA aisle's escape gate in R1S's pedestrian through-bay (A1 <-> A2), bolted from
 * the VNA side so nobody walks into A2 while the truck runs. `at` the door's plan centre, `side` toward A2 (+x). Built
 * `locked: true, breachable: false`; `warehouseSectors.ts` hands the list to the mode (RT).
 */
export const S2_BOLTS: readonly { at: [number, number]; side: [number, number] }[] = [{ at: [-17.75, 0.6], side: [1, 0] }];
/** The through-bay's opening (z) in R1S (x -19.9 to -17.6) and the head of the opening (the racking above it). */
export const S2_THROUGH_BAY = { x0: -19.9, x1: -17.6, z0: 0.05, z1: 1.15, head: 2.2 } as const;

/** Nav seeds: the cage floor and the rack tops (y 4.0; the high-bay row 4.4), so the grid floods each layer. */
export const S2_NAV_SEEDS: Vector3[] = [
  new Vector3(-21.4, 0, 14.0),
  new Vector3(-23.45, 4, 0.5),
  new Vector3(-23.45, 4, 9.5),
  new Vector3(-18.75, 4, -1.5),
  new Vector3(-18.75, 4, 11),
  new Vector3(-14.65, 4, 0.5),
  new Vector3(-14.65, 4, 11),
  new Vector3(-9.35, S2_HIGH_TOP, 0.5),
  new Vector3(-9.35, S2_HIGH_TOP, 11),
];

/** The lane row's narrow beam (30 degrees): the lane, not the pockets at its east end. */
const LANE = makeCone(0, -1, 0, Math.PI / 6);
/** The south aisles' beam (50 degrees): the aisle floors and the cross aisle, not the rack tops beside them. */
const SOUTH = makeCone(0, -1, 0, 0.87);
// <lamps:S2>
/**
 * Section 2's lamps by room (sector-fixes L, Michael 2026-10-22: one height and a regular layout per room, LED fittings;
 * the levels of warehouse-s23 M1 kept: `tests/warehouseS2Light.test.ts`). The hall: LED strips at 5.8 under the solid
 * roof strips (z -6 to -1.2, 0 to 4.8, 6 to 10.8, 12 to 16.8; the gaps are sheets) over the aisles: the lane row with a
 * narrow beam (the lane, not the pockets at its east end), the south aisles' row with a 50 degree beam (the floors, not
 * the dark south rack tops), the north half as two staggered grids without a beam (the floors and the rack tops of the
 * high route), two strips over the cage; the exit signs: small LED bulkheads at 2.4 on the walls. Radius and intensity
 * per fitting tuned against the light test's bands; dead fittings (intensity 0) keep the grids regular.
 * [x, z, radius, intensity].
 */
export const S2_LAMPS: readonly LampRoom[] = [
  // the aisle strips (A1 -21.4, A2 -16.7 (-17.0 in the north), A3 -12.0, the east gangway -7.2): the lane and south racks (circuit 40), north (41)
  // (LR16-W S2, the hall's night state: each fitting at its LED night level; the lane's A1 fitting a wider 0.85 rad optic so the A1 mouth sits
  // in its beam; A2 south a 1.0 rad optic, A3 south 0.45 rad so the A3 / cross aisle corner reads its own strip only; northB's A2 column
  // 0.8 m west over aisle A2's centre line, its first row 0.5 m south to z 9.1, its dead A2 fitting over the A2 ladder lit low; A3 north 0.75 rad)
  // (LR16-W INT: the lane's A3 fitting a 0.62 rad optic, the C2 far door (-14.5, -5.4) 2.1 m off its axis in the beam, not the
  // 30 degree feather; the lane's east-end pocket stays outside it)
  { id: 'lane', model: 'strip', y: 5.8, group: 40, yaw: 0, cone: LANE, pass: true, lamps: [[-21.5, -4.6, 8.1, 0.553, 0.85], [-17, -4.6, 5.89, 0.585], [-12.5, -4.6, 6.04, 0.64, 0.62]] },
  { id: 'southAisles', model: 'strip', y: 5.8, group: 40, yaw: 0, cone: SOUTH, pass: true, lamps: [[-21.4, 1.9, 6.61, 0.515], [-16.7, 1.9, 9, 0.568, 1.0], [-12, 1.9, 5.56, 0.493, 0.45], [-7.2, 1.9, 3.85, 0.064]] },
  { id: 'northA', model: 'strip', y: 5.8, group: 41, yaw: 0, pass: true, lamps: [[-21.4, 6.9, 6.4, 0.407], [-12, 6.9, 9, 0.702], [-21.4, 13.5, 7.64, 0.308], [-12, 13.5, 5.78, 0.446, 0.75]] },
  { id: 'northB', model: 'strip', y: 5.8, group: 41, yaw: 0, pass: true, lamps: [[-17, 9.1, 7.91, 0.289], [-7.2, 9.1, 9, 0.599], [-17, 12.9, 6.5, 0.16], [-7.2, 12.9, 6.5, 0], [-17, 16.2, 9, 0.472], [-7.2, 16.2, 9, 0.443]] },
  // the high-value cage (x -24 to -19.9, z 12 to 18, open under the roof): two strips down its west side, clear of aisle A1's strip at
  // (-21.4, 13.5) (LR16-W S2: the north one the shelf light over the case shelving with a 0.65 rad optic; the south one over the stock
  // ladder, which also lights the W0N rack top outside the fence)
  { id: 'cage', model: 'strip', y: 5.8, group: 41, yaw: 0, pass: true, lamps: [[-23.3, 13.4, 5.2, 0.3], [-23.3, 16.2, 5.3, 0.26, 0.65]] },
  // the exit signs: the west fire exit, the C3 door, the charger indicator (a small glow: it must not light the charge hand's pocket)
  { id: 'storage', model: 'bulkhead', y: 2.4, group: 42, yaw: PI / 2, colour: EXIT_GREEN, pass: true, lamps: [[-23.7, 5.5, 0.6, 0.15], [-4.45, 14.55, 0.6, 0.083], [-4.45, -5.2, 0.3, 0.15]] },
];

/** The section's lamp pass (the light test switches these off to compare): every lit lamp of section 2. */
export const S2_LIGHT_PASS = passLamps(S2_LAMPS);
// </lamps:S2>

/** A lintel (a head over a gap): an overhead box, so the floor under it stays open to the nav grid. */
function lintel(b: LevelBuilder, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color = WALL): void {
  b.box(cx, cy, cz, sx, sy, sz, color);
  b.boxes[b.boxes.length - 1]!.overhead = true;
}

/** A rack block (solid, top 4.0) with its two visual beams and its metal surface. */
function rack(b: LevelBuilder, cx: number, cz: number, w: number, d: number): void {
  b.block(cx, cz, w, 4.0, d, RACK);
  for (const y of [1.35, 2.7]) b.box(cx, y, cz, w + 0.08, 0.1, d + 0.04, BEAM, 0, 0, false);
  b.surface('metal', cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, 4.0);
}

/** A width of rack (x0..x1, z0..z1, solid top `h`) with no lips: the high bay's filler and the through-bay's sides. */
function rackPiece(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, h: number, ledges: boolean): void {
  const from = b.boxes.length;
  b.box((x0 + x1) / 2, h / 2, (z0 + z1) / 2, x1 - x0, h, z1 - z0, RACK);
  if (!ledges) b.mark(from, { noLedge: true });
}

/**
 * (sector-fixes-r R2) A high-bay block (`S2_HIGH_TOP`): one 0.8 m strip per planned lip carries the lip (a full top deep
 * enough to climb onto), the rest of the block is filler without lips, so the only grips are the planned ones.
 */
function highBay(b: LevelBuilder, r: S2CoopRoute): void {
  const [x0, z0, x1, z1] = r.bay;
  const S = 0.8;
  const h = S2_HIGH_TOP;
  for (const l of r.lips) rackPiece(b, l.nx < 0 ? x0 : x1 - S, l.nx < 0 ? x0 + S : x1, l.z0, l.z1, h, true);
  const cuts = [...new Set([z0, z1, ...r.lips.flatMap((l) => [l.z0, l.z1])])].sort((a, c) => a - c);
  for (let i = 0; i + 1 < cuts.length; i++) {
    const za = cuts[i]!;
    const zb = cuts[i + 1]!;
    const on = (nx: number): boolean => r.lips.some((l) => l.nx === nx && l.z0 <= za + 1e-6 && l.z1 >= zb - 1e-6);
    rackPiece(b, on(-1) ? x0 + S : x0, on(1) ? x1 - S : x1, za, zb, h, false);
  }
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  for (const y of [1.35, 2.7, 4.05]) b.box(cx, y, cz, x1 - x0 + 0.08, 0.1, z1 - z0 + 0.04, BEAM, 0, 0, false);
  b.surface('metal', x0, x1, z0, z1, h);
}

/** Everything of section 2 (BUILD-S2.md 2 and 3): the walls and parapets, the racks, the cage, the ladders and pipes, the cover and the lights. Called by `opsPieces` after section 1. */
export function buildStorageS2(b: LevelBuilder): void {
  // ---- walls: the x -4 compartment wall (6.0, also section 3's west wall) with the C3 doorway head
  b.wallZ(-4, -6, 18, [[14, 15.1]], 6.0, WALL, T);
  lintel(b, -4, 4.05, 14.55, T, 3.9, 1.1);

  // ---- parapets (y 6.0 - 7.5, a seal: no lip is generated on the wall tops)
  const p0 = b.boxes.length;
  b.box(-4, 6.75, 6.0, T, 1.5, 24.0, WALL_DARK);
  b.box(-24.5, 6.75, 5.925, 1.0, 1.5, 24.15, WALL_DARK);
  b.box(-14.5, 6.75, 18.5, 21.0, 1.5, 1.0, WALL_DARK);
  b.mark(p0, { noLedge: true });

  // two visual rafters on the frame lines; the west fire exit (visual only)
  // (sector-fixes L: dressing, out of the light shapes, so they do not cut the hall strips' light off the rack tops)
  for (const x of [-16, -8]) {
    b.box(x, 5.75, 6.0, 0.3, 0.5, 24.0, STEEL, 0, 0, false);
    b.boxes[b.boxes.length - 1]!.detail = true;
  }
  b.box(-23.97, 1.05, 5.5, 0.06, 2.1, 1.2, STEEL, 0, 0, false);
  b.box(-23.92, 1.0, 5.5, 0.04, 0.06, 1.0, HAZARD, 0, 0, false);

  // ---- racks (single 1.1, back-to-back 2.3, 2.7 m bays; greybox height 4.0)
  rack(b, -23.45, 0.5, 1.1, 7.0); // W0S
  rack(b, -23.45, 9.5, 1.1, 5.0); // W0N (cut by the cage)
  // R1S with its pedestrian through-bay (sector-fixes-r R2): the VNA escape gate, bolted from the A2 side (S2_BOLTS); the
  // bay is 1.1 m wide (under a split's 1.2) and the racking over it (2.2 - 4.0) is overhead, so the nav sees the floor
  const tb = S2_THROUGH_BAY;
  rack(b, -18.75, (-3 + tb.z0) / 2, 2.3, tb.z0 + 3);
  rack(b, -18.75, (tb.z1 + 4) / 2, 2.3, 4 - tb.z1);
  lintel(b, -18.75, (tb.head + 4.0) / 2, (tb.z0 + tb.z1) / 2, 2.3, 4.0 - tb.head, tb.z1 - tb.z0, RACK);
  b.door(-17.75, 0, tb.z0, tb.z1 - tb.z0, 0, { swing: -1, locked: true, breachable: false });
  rack(b, -18.75, 11.0, 2.3, 8.0); // R1N
  rack(b, -14.65, 0.5, 2.3, 7.0); // R2S
  rack(b, -14.65, 11.0, 2.3, 8.0); // R2N
  // R3S and R3N: the high-bay row (sector-fixes-r R2, S2_COOP): tops 4.4, lips only where planned, no rolling ladder
  for (const r of S2_COOP) highBay(b, r);
  // (sector-fixes-r e2e fix) C2: the dispatch mezzanine's landing on the x -4 wall (S2_LANDING): a hung slab (overhead),
  // solid rails south and north (no lips there), visual hangers to the roof; its west edge is the co-op lip
  const ld = S2_LANDING;
  const lcx = (ld.x0 + ld.x1) / 2;
  const lcz = (ld.z0 + ld.z1) / 2;
  const l0 = b.boxes.length;
  b.box(lcx, ld.top - 0.15, lcz, ld.x1 - ld.x0, 0.3, ld.z1 - ld.z0, STEEL);
  b.mark(l0, { overhead: true });
  const r0 = b.boxes.length;
  // (sector-fixes-r CI fix, train 11 voxelFit) each rail is an undrawn blocker (it cuts the lip and stops a body) plus the
  // drawn rail: no cover faces up there (no guard reaches the landing), and the 4 cm blocker stays out of the voxel fit
  for (const z of [ld.z0 + 0.02, ld.z1 - 0.02]) b.box(lcx, ld.top + 0.5, z, ld.x1 - ld.x0, 1.0, 0.04, HAZARD, 0, 0, true, false);
  b.mark(r0, { overhead: true, noLedge: true });
  for (const z of [ld.z0 + 0.02, ld.z1 - 0.02]) b.box(lcx, ld.top + 0.5, z, ld.x1 - ld.x0, 1.0, 0.04, HAZARD, 0, 0, false);
  for (const z of [ld.z0 + 0.1, ld.z1 - 0.1]) b.box(ld.x0 + 0.1, (ld.top + 6.03) / 2, z, 0.04, 6.03 - ld.top, 0.04, STEEL, 0, 0, false);

  // ---- the high-value cage (x -24 to -19.9, z 12 to 18; mesh 2.4 high, open top)
  b.fence(-22.9, 12, -21.9, 12, 2.4);
  b.fence(-20.9, 12, -19.9, 12, 2.4);
  b.door(-21.9, 0, 12, 1.0, PI / 2, { swing: -1, locked: true, breachable: true });
  b.fence(-19.9, 15.0, -19.9, 15.9, 2.4);
  b.fence(-19.9, 17.1, -19.9, 18.0, 2.4);
  b.door(-19.9, 0, 15.9, 1.2, 0, { swing: -1 });
  b.block(-23.6, 15.4, 0.8, 2.0, 4.4, STEEL); // shelving along the west wall
  b.ladder(-23.45, 12.25, 0, 4.0, PI, STEEL); // the stock ladder onto W0N

  // ---- ladders (fixed "rolling" ladders), sprinkler mains (R3S's ladder is gone: R3 is the high-bay row, sector-fixes-r R2)
  b.ladder(-14.65, 6.75, 0, 4.0, 0, STEEL);
  b.ladder(-17.35, 13.4, 0, 4.0, -PI / 2, STEEL);
  b.pipeV(-23.85, 6.4, 0, 5.0, -PI / 2, PIPE);
  b.pipeH(-23.85, 6.4, -6.0, 6.4, 5.0, PIPE);
  b.pipeH(-6.0, 6.4, -6.0, 15.4, 5.0, PIPE);
  for (const x of [-20, -16, -12, -8]) b.box(x, 5.45, 6.4, 0.05, 0.9, 0.05, PIPE, 0, 0, false);
  for (const z of [10, 14]) b.box(-6.0, 5.45, z, 0.05, 0.9, 0.05, PIPE, 0, 0, false);

  // ---- contents and cover
  b.block(-19.7, -3.9, 3.4, 1.8, 1.2, SHRINK); // staged delivery, west
  b.block(-9.7, -3.9, 2.6, 1.8, 1.2, SHRINK); // staged delivery, east
  b.block(-4.5, -5.2, 0.5, 1.6, 1.0, STEEL); // charger
  b.block(-6.0, -2.8, 1.6, 2.0, 1.2, CRATE); // empty-pallet stack
  b.block(-17.0, 17.6, 1.6, 0.9, 0.8, DESK); // issue desk
  b.block(-6.0, 17.35, 1.2, 0.15, 1.2, STEEL); // wrapper turntable
  b.block(-6.0, 17.85, 0.3, 2.4, 0.2, STEEL); // wrapper mast
  b.block(-9.0, 16.6, 1.2, 1.8, 1.2, SHRINK); // wrapped stack

  // ---- lights (sector-fixes L: by room, `S2_LAMPS`)
  addLampRooms(b, S2_LAMPS);
}
