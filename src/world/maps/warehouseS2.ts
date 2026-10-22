import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import type { MapLayout } from '../mapDef';

/**
 * Sector Ops section 2 of the Warehouse (warehouse-s23, SPEC 2.2, BUILD-S2.md): the storage hall, a greybox. Frame: x west
 * to east, z south to north, y up, metres. The hall is x -24 (perimeter inner face) to x -4 (wall centre line), z -6 (the
 * wall section 1 builds) to z 18. `warehouse.ts` builds the perimeter, floor and section 3 (`storageHall: false` skips
 * its own racking and x -4 wall); this file builds the rest. (sector-fixes-r R2) The co-op layer: the high-bay row R3
 * (`S2_COOP`) and the VNA escape gate in R1S's through-bay (`S2_BOLTS`); docs/sector-fixes/r/R2.md.
 */

const WALL = '#b7b2a6';
const WALL_DARK = '#7d786d';
const STEEL = '#55606a';
const CRATE = '#a8784a';
const HAZARD = '#e8b923';
const DESK = '#8a6a4c';
const SHRINK = '#c4c0b0';
const PIPE = '#6d7378';
/** The art program dresses this colour as racking bays (`warehouseArt.ts`). */
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

export const S2_PICKUPS: NonNullable<MapLayout['pickups']> = [{ pos: new Vector3(-4.7, 0, 9.0), kind: 'ammo' }];

/**
 * (sector-fixes-r R2) The high-bay row: R3's two blocks are the reach truck's high put-away locations, tops 4.4 (the co-op
 * band, LD 11.3: `WALL_JUMP.maxUp` + 0.5 to `TEAM.boostMax`), with no rolling ladder (the old R3S ladder is gone).
 */
export const S2_HIGH_TOP = 4.4;

/**
 * (sector-fixes-r R2) Section 2's co-op-only routes: a leg-up onto a planned lip of the high-bay row, then the relay or
 * the two-person rope for the partner. `bay` is the block's plan box [x0, z0, x1, z1]; each lip is a run of one face
 * (`nx` its outward normal along x) from `z0` to `z1`, the rest of the block is `noLedge` (cut back 3 m from every solo
 * surface: rack tops, the sprinkler mains, the staged loads and stacks); `spot` is the booster's feet [x, z], facing the
 * face. The lips stay out from under the roof-sheet bands (their collision at 6.03 leaves 1.63 m over a 4.4 top: there
 * the top is crouch-walked). `tests/warehouseCoopS2.test.ts` checks the band, the solo gap and the way down; docs/sector-fixes/r/R2.md.
 */
export interface S2CoopRoute {
  name: string;
  bay: readonly [number, number, number, number];
  lips: readonly { x: number; nx: -1 | 1; z0: number; z1: number; spot: readonly [number, number] }[];
}
export const S2_COOP: readonly S2CoopRoute[] = [
  {
    name: 'C1 south high bay (R3S): leg-up from the east gangway or A3, vantage over the lane, A3 and the picker',
    bay: [-10.5, -3, -8.2, 4],
    lips: [
      { x: -10.5, nx: -1, z0: 0.2, z1: 3.3, spot: [-11.0, 1.8] },
      { x: -8.2, nx: 1, z0: 1.0, z1: 3.3, spot: [-7.7, 2.2] },
    ],
  },
  {
    name: 'C2 north high bay (R3N): leg-up from A3 north, vantage over the goods-out corner and the C3 door',
    bay: [-10.5, 7, -8.2, 15],
    lips: [{ x: -10.5, nx: -1, z0: 9.4, z1: 10.6, spot: [-11.0, 10.0] }],
  },
];

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

/**
 * Section 2's lamp pass (the sheet's five lamps, then the lamps the route and objective points need to read without night
 * vision, warehouse-s23 M1). [x, y, z, radius, intensity, group, colour]. The takedown pockets get none.
 * `tests/warehouseS2Light.test.ts` pins the levels.
 */
export type S2Lamp = readonly [x: number, y: number, z: number, radius: number, intensity: number, group: number, colour?: readonly [number, number, number]];
const WARM = [1, 0.92, 0.75] as const;
const GREEN = [0.5, 1, 0.6] as const;
export const S2_LIGHT_PASS: readonly S2Lamp[] = [
  // the sheet (3.6): the lane work lamp, the issue desk, the exit signs and the charger indicator (a small glow: it must not light the charge hand's pocket)
  [-17.7, 3, -4.6, 7, 0.548, 40, WARM],
  [-18.2, 2.6, 17.4, 5.2, 0.768, 41, WARM],
  [-23.6, 2.4, 5.5, 3, 0.43, 42, GREEN],
  [-4.6, 2.4, 14.55, 3, 0.25, 42, GREEN],
  [-4.6, 1.8, -5.2, 0.65, 0.155, 42, GREEN],
  // pendants hung in the aisles (y 3.0): the lane, A1, the cross aisle, A2, A3, the gangways, the cage
  [-21.4, 3, -3.8, 4.5, 0.561, 40],
  [-12.6, 2.6, -3.6, 3.6, 1.07, 40],
  [-20.8, 3, 3.3, 5, 0.562, 40],
  [-22.7, 3, 8.1, 5, 0.493, 40],
  [-15.8, 3, 5.5, 6, 0.46, 40],
  [-17.3, 3, 12, 4.5, 0.845, 40],
  [-12.6, 3, 3, 5, 1.103, 40],
  [-12, 3, 12.7, 5, 0.929, 40],
  [-6.3, 3, 8, 5.5, 0.928, 40],
  [-8.4, 3, 16.4, 5.5, 0.648, 41],
  [-22.5, 3.2, 13.8, 5.5, 0.648, 41],
  [-21.8, 2.7, 15, 2.4, 0.268, 41],
  // under the roof strips (y 5.8) over the rack tops of the high route (a lamp lights what is below it: one near each top point)
  // and beside the sprinkler mains (not over them: a pipe shadows what hangs under it)
  [-14, 5.8, 9, 5, 0.936, 40],
  [-19.1, 5.8, 10.5, 5.5, 0.503, 40],
  [-19.5, 5.8, 14.1, 4, 0.676, 41],
  [-23.6, 5.8, 9.2, 5.4, 1.171, 40],
  [-7.2, 5.8, 7.6, 5, 0.496, 40],
  [-7, 5.8, 14.4, 5.5, 0.578, 41],
];

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
  for (const x of [-16, -8]) b.box(x, 5.75, 6.0, 0.3, 0.5, 24.0, STEEL, 0, 0, false);
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

  // ---- lights
  for (const [x, y, z, radius, intensity, group, colour] of S2_LIGHT_PASS) {
    const sign = group === 42;
    b.light({
      kind: 'lamp',
      x,
      y,
      z,
      radius,
      intensity,
      color: colour ? [colour[0], colour[1], colour[2]] : [1, 0.92, 0.75],
      group,
      fixture: sign ? { sx: 0.3, sy: 0.12, sz: 0.06, oy: 0.06 } : { sx: 0.5, sy: 0.08, sz: 0.5, oy: 0.1 },
    });
  }
}
