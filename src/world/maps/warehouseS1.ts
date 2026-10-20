import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import type { MapLayout } from '../mapDef';
import { makeCone } from '../lights';

/**
 * Sector Ops section 1 of the Warehouse (warehouse-redesign step 4, `docs/warehouse-redesign/SPEC.md` 2.1 and 5): the
 * goods-in and trade-office band along the yard, a greybox. Frame: x west to east, z south to north, y up, metres. The
 * yard is z -26 to -18, the facade stands at z -18 (0.3 thick), the compartment walls at z -6 (x -24 to -4), x -4
 * (z -8.8 to -6) and z -8.8 (x -4 to 24). `warehouse.ts` builds the rest (`southBand: false` skips its own south band).
 */

const CONCRETE = '#8e9396';
const WALL = '#b7b2a6';
const WALL_DARK = '#7d786d';
const STEEL = '#55606a';
const CRATE = '#a8784a';
const HAZARD = '#e8b923';
const DESK = '#8a6a4c';
const SHRINK = '#c4c0b0';
const PIPE = '#6d7378';
const BEAM = '#e07b22';
const ROOF = '#4a4f55';
const GLASS = '#1d2730';
const TRAILER = '#d8d8d8';
const T = 0.3;
const PI = Math.PI;

/** Section 1's rooms (HUD tags; squads come from the mode). Plan boxes, ground floor. */
export const S1_ROOMS: RoomDef[] = [
  { id: 'yard', name: 'Yard', minX: -24, maxX: 24, minZ: -26, maxZ: -18 },
  { id: 'goodsIn', name: 'Goods-in Bay', minX: -24, maxX: -8, minZ: -18, maxZ: -8.8 },
  { id: 'goodsInOffice', name: 'Goods-in Office', minX: -24, maxX: -16.5, minZ: -8.8, maxZ: -6 },
  { id: 'lobby', name: 'Fire Lobby', minX: -16.5, maxX: -12.5, minZ: -8.8, maxZ: -6 },
  { id: 'charging', name: 'Charging Bay', minX: -12.5, maxX: -4, minZ: -8.8, maxZ: -6 },
  { id: 'reception', name: 'Reception', minX: -8, maxX: -2, minZ: -18, maxZ: -13.8 },
  { id: 'transport', name: 'Transport Office', minX: -2, maxX: 3, minZ: -18, maxZ: -13.8 },
  { id: 'security', name: 'Security Office', minX: 3, maxX: 8, minZ: -18, maxZ: -13.8 },
  { id: 'officeCorridor', name: 'Office Corridor', minX: -8, maxX: 8, minZ: -13.8, maxZ: -10.8 },
  { id: 'comms', name: 'Comms Room', minX: -8, maxX: -3, minZ: -10.8, maxZ: -8.8 },
  { id: 'wc', name: 'WC', minX: -3, maxX: 1, minZ: -10.8, maxZ: -8.8 },
  { id: 'mess', name: 'Mess', minX: 1, maxX: 8, minZ: -10.8, maxZ: -8.8 },
  { id: 'workshop', name: 'Workshop', minX: 8, maxX: 24, minZ: -18, maxZ: -8.8 },
].map((r) => ({ ...r, squad: [] }));

/** Light switches (circuits 30, 32, 34: the bay lane, the corridor, the security office). */
export const S1_SWITCHES: NonNullable<MapLayout['switches']> = [
  { pos: new Vector3(-23.85, 0, -12.0), yaw: PI / 2, group: 30 },
  { pos: new Vector3(-7.85, 0, -13.3), yaw: PI / 2, group: 32 },
  { pos: new Vector3(3.15, 0, -14.3), yaw: PI / 2, group: 34 },
];

export const S1_PICKUPS: NonNullable<MapLayout['pickups']> = [
  { pos: new Vector3(-23.3, 0, -14.0), kind: 'ammo' },
  { pos: new Vector3(6.0, 0, -9.4), kind: 'ammo' },
];

export const S1_HIDESPOTS: NonNullable<MapLayout['hideSpots']> = [{ pos: new Vector3(-21.3, 0, -21.5) }, { pos: new Vector3(-6.0, 0, -7.2) }];

/** The yard's dark south-west corner (A4): four spawns around (-20, -24.6). */
export const S1_SPAWNS: MapLayout['playerSpawns'] = [
  { pos: new Vector3(-20, 0, -24.6), yaw: 0.5 },
  { pos: new Vector3(-21.2, 0, -24.6), yaw: 0.5 },
  { pos: new Vector3(-18.8, 0, -24.6), yaw: 0.5 },
  { pos: new Vector3(-20, 0, -25.4), yaw: 0.5 },
];

/** Nav seeds: the yard, the roof, the plant deck, the catwalk and the lobby-block roof (so the grid floods each). */
export const S1_NAV_SEEDS: Vector3[] = [new Vector3(-20, 0, -24.6), new Vector3(0, 6.0, -16), new Vector3(6, 3.3, -16.6), new Vector3(16, 3.0, -9.55), new Vector3(-20, 3.2, -7.4)];

/**
 * A horizontal slab (plan x0..x1, z0..z1, top face at `top`, `th` thick) with rectangular holes [x0, x1, z0, z1]: split
 * into boxes around them (holes must not overlap each other).
 */
function plate(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, top: number, th: number, holes: readonly (readonly [number, number, number, number])[], color: string): void {
  const zs = [z0, z1];
  for (const h of holes) zs.push(h[2], h[3]);
  zs.sort((p, q) => p - q);
  const cy = top - th / 2;
  for (let i = 0; i + 1 < zs.length; i++) {
    const a = zs[i]!;
    const e = zs[i + 1]!;
    if (e - a < 1e-6) continue;
    const mid = (a + e) / 2;
    const inBand = holes.filter((h) => mid > h[2] && mid < h[3]).sort((p, q) => p[0] - q[0]);
    let x = x0;
    for (const h of inBand) {
      if (h[0] > x) b.box((x + h[0]) / 2, cy, mid, h[0] - x, th, e - a, color);
      x = h[1];
    }
    if (x1 > x) b.box((x + x1) / 2, cy, mid, x1 - x, th, e - a, color);
  }
}

/** A lintel (a door or window head over its gap, or a band): an overhead box, so the floor under it stays open to the nav grid. */
function lintel(b: LevelBuilder, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color = WALL): void {
  b.box(cx, cy, cz, sx, sy, sz, color);
  b.boxes[b.boxes.length - 1]!.overhead = true;
}

/** A thin sill or cap box that makes no ledge. */
function noLedgeBox(b: LevelBuilder, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): void {
  b.box(cx, cy, cz, sx, sy, sz, WALL);
  b.boxes[b.boxes.length - 1]!.noLedge = true;
}

/** A head on a z wall over a 1.2 m gap: x centre, y bottom to y top. */
function head(b: LevelBuilder, x: number, z: number, y0: number, y1: number, w: number, color = WALL): void {
  lintel(b, x, (y0 + y1) / 2, z, w, y1 - y0, T, color);
}

/**
 * Everything of section 1 (SPEC 5.2 - 5.4): walls, slabs, the roof, the traversal anchors, the yard, the bay, the
 * offices, the workshop and the lights. Called first by `opsPieces`.
 */
export function buildServiceS1(b: LevelBuilder): void {
  const wallX = (z: number, x0: number, x1: number, gaps: [number, number][], h: number, color = WALL): void => void b.wallX(z, x0, x1, gaps, h, color, T);
  const wallZ = (x: number, z0: number, z1: number, gaps: [number, number][], h: number, color = WALL): void => void b.wallZ(x, z0, z1, gaps, h, color, T);
  const over = (from: number): void => void b.mark(from, { overhead: true });

  // ---- facade (z -18, 6.0 high): shutters W (raised 1.5 m), E and the workshop's; the entrance, two windows, the workshop door
  wallX(-18, -24, 24, [[-21, -17], [-13, -9], [-5.6, -4.4], [0.6, 1.8], [5.4, 6.6], [10.4, 11.6], [13, 17]], 6.0, WALL_DARK);
  b.box(-19, 3.0, -18, 4.0, 3.0, 0.1, STEEL); // shutter W: y 1.5 - 4.5, the crouch gap under it
  lintel(b, -19, 5.25, -18, 4.0, 1.5, T, WALL_DARK);
  b.box(-11, 2.25, -18, 4.0, 4.5, 0.1, STEEL); // shutter E, closed
  lintel(b, -11, 5.25, -18, 4.0, 1.5, T, WALL_DARK);
  b.box(15, 2.25, -18, 4.0, 4.5, 0.1, STEEL); // the workshop's shutter, closed
  lintel(b, 15, 5.25, -18, 4.0, 1.5, T, WALL_DARK);
  head(b, -5, -18, 2.1, 6.0, 1.2, WALL_DARK); // entrance
  b.door(-5.6, 0, -18, 1.2, PI / 2, { locked: true, breachable: true, swing: -1 });
  for (const x of [1.2, 6.0]) {
    b.box(x, 0.45, -18, 1.2, 0.9, T, WALL_DARK);
    head(b, x, -18, 2.1, 6.0, 1.2, WALL_DARK);
    b.windowAt(x, 1.5, -18, 1.2, 1.2, 0, { sill: 0.9, open: false, breakable: true });
  }
  head(b, 11, -18, 2.1, 6.0, 1.2, WALL_DARK); // the workshop's door (E7 fallback: an unlocked leaf, no one-way door yet)
  b.door(10.4, 0, -18, 1.2, PI / 2, { swing: 1 });
  for (const x of [-21, -17, -13, -9, 13, 17]) b.box(x, 2.5, -18.2, 0.12, 5, 0.12, HAZARD, 0, 0, false);

  // ---- compartment walls (6.0 high): z -6 with the far door of C2, x -4, z -8.8
  wallX(-6, -24, -4, [[-15.1, -13.9]], 6.0);
  head(b, -14.5, -6, 2.1, 6.0, 1.2);
  b.door(-15.1, 0, -6, 1.2, PI / 2, { swing: -1, locked: true, breachable: false });
  wallZ(-4, -8.8, -6, [], 6.0);
  wallX(-8.8, -4, 24, [], 6.0);

  // ---- lobby block (x -24 to -4, z -8.8 to -6, 3.0 high): goods-in office, the fire lobby C2, the charging bay
  wallX(-8.8, -24, -12.5, [[-22.6, -21.4], [-19.6, -18.4], [-15.1, -13.9]], 3.0);
  b.box(-22, 0.45, -8.8, 1.2, 0.9, T, WALL);
  lintel(b, -22, 2.55, -8.8, 1.2, 0.9, T);
  lintel(b, -19, 2.55, -8.8, 1.2, 0.9, T);
  lintel(b, -14.5, 2.55, -8.8, 1.2, 0.9, T);
  b.windowAt(-22, 1.5, -8.8, 1.2, 1.2, 0, { sill: 0.9 });
  b.door(-19.6, 0, -8.8, 1.2, PI / 2, { swing: -1 });
  b.door(-15.1, 0, -8.8, 1.2, PI / 2, { swing: 1, locked: true, breachable: false }); // C2 near door
  wallZ(-16.5, -8.8, -6, [], 3.0);
  wallZ(-12.5, -8.8, -6, [], 3.0);
  const r0 = b.boxes.length;
  b.box(-14.075, 3.1, -7.55, 19.85, 0.2, 2.8, CONCRETE); // roof slab, top 3.2
  over(r0);

  // ---- office block (x -8 to 8, z -18 to -8.8): south rooms 3.0 high under the plant deck, the corridor and north rooms 2.8 under the void
  wallZ(-8, -17.85, -13.8, [[-16.4, -15.2]], 3.0);
  lintel(b, -8, 2.55, -15.8, T, 0.9, 1.2);
  wallZ(-8, -13.8, -8.8, [[-12.9, -11.7]], 2.8);
  lintel(b, -8, 2.45, -12.3, T, 0.7, 1.2);
  wallZ(8, -17.85, -13.8, [], 3.0);
  wallZ(8, -13.8, -8.8, [[-12.9, -11.7]], 2.8);
  lintel(b, 8, 2.45, -12.3, T, 0.7, 1.2);
  b.box(-8, 3.8, -11.3, T, 2.0, 5.0, WALL); // void west wall
  b.box(8, 3.8, -11.975, T, 2.0, 3.65, WALL); // void east wall with the catwalk opening z -10.15 to -8.95 (y 3.0 - 4.6)
  // (the openings' sills and caps are not ledges: the catwalk walks straight in)
  noLedgeBox(b, 8, 2.9, -9.55, T, 0.2, 1.2);
  noLedgeBox(b, 8, 4.7, -9.55, T, 0.2, 1.2);
  b.box(-6, 1.4, -8.8, 4.0, 2.8, T, WALL); // north wall, x -8 to -4
  b.box(-7.25, 3.8, -8.8, 1.5, 2.0, T, WALL); // void north wall with the opening x -6.5 to -5.3 onto the lobby-block roof
  b.box(-4.65, 3.8, -8.8, 1.3, 2.0, T, WALL);
  noLedgeBox(b, -5.9, 2.9, -8.8, 1.2, 0.2, T);
  noLedgeBox(b, -5.9, 4.7, -8.8, 1.2, 0.2, T);
  // corridor south wall z -13.8 (3 doors), the band over it, and the upper wall with the deck opening x -3.6 to -2.4
  wallX(-13.8, -8, 8, [[-5.1, -3.9], [-0.1, 1.1], [3.9, 5.1]], 2.8);
  lintel(b, 0, 3.05, -13.8, 16, 0.5, T); // the 2.8 - 3.3 band
  b.box(-5.8, 4.05, -13.8, 4.4, 1.5, T, WALL);
  b.box(2.8, 4.05, -13.8, 10.4, 1.5, T, WALL);
  b.box(-3.0, 4.7, -13.8, 1.2, 0.2, T, WALL);
  wallX(-10.8, -8, 8, [[-7.1, -5.9], [-2.1, -0.9], [1.9, 3.1]], 2.8);
  for (const x of [-4.5, 0.5, 4.5]) lintel(b, x, 2.45, -13.8, 1.2, 0.7, T);
  for (const x of [-6.5, -1.5, 2.5]) lintel(b, x, 2.45, -10.8, 1.2, 0.7, T);
  wallZ(-2, -17.85, -13.8, [], 3.0);
  wallZ(3, -17.85, -13.8, [], 3.0);
  wallZ(-3, -10.8, -8.8, [], 2.8);
  wallZ(1, -10.8, -8.8, [], 2.8);
  // slabs: the plant deck (3.0 - 3.3) over the south rooms with the security hatch, the void floor (2.8 - 3.0) with h1 and h2, the void roof
  const s0 = b.boxes.length;
  plate(b, -8.15, 8.15, -17.85, -13.95, 3.3, 0.3, [[6.0, 6.9, -15.85, -14.95]], CONCRETE);
  plate(b, -8.15, 8.15, -13.95, -8.95, 3.0, 0.2, [[-6.05, -5.15, -12.75, -11.85], [2.15, 3.05, -10.4, -9.5]], CONCRETE);
  over(s0);
  const v0 = b.boxes.length;
  plate(b, -8.15, 8.15, -13.95, -8.95, 4.8, 0.2, [], CONCRETE);
  over(v0);
  b.mark(v0, { noLedge: true });

  // doors inside (1.2 wide, 2.1 high): the corridor's ends, the reception's bay door, six room doors
  b.door(-8, 0, -12.9, 1.2, 0, { swing: 1 });
  b.door(8, 0, -12.9, 1.2, 0, { swing: -1 });
  b.door(-8, 0, -16.4, 1.2, 0, { swing: 1 });
  for (const x of [-5.1, -0.1, 3.9]) b.door(x, 0, -13.8, 1.2, PI / 2, { swing: 1 });
  for (const x of [-7.1, -2.1, 1.9]) b.door(x, 0, -10.8, 1.2, PI / 2, { swing: -1 });

  // ---- roof (top 6.0): the lobby-block part with the smoke vent, the main part with the roof hatch; parapets, gables
  const roof0 = b.boxes.length;
  plate(b, -24, -4, -18.15, -6.15, 6.0, 0.2, [[-20.6, -19.4, -8.0, -6.8]], ROOF);
  plate(b, -4, 24, -18.15, -8.95, 6.0, 0.2, [[4.5, 5.5, -14.8, -14.0]], ROOF);
  over(roof0);
  b.surface('metal', -24, 24, -18.15, -6, 6.0);
  const p0 = b.boxes.length;
  b.box(-14, 6.75, -6, 20.3, 1.5, T, WALL_DARK);
  b.box(10, 6.75, -8.8, 28.3, 1.5, T, WALL_DARK);
  b.box(-4, 6.75, -7.4, T, 1.5, 2.8, WALL_DARK);
  b.box(-24.5, 6.75, -12.4, 1.0, 1.5, 12.5, WALL_DARK);
  b.box(24.5, 6.75, -13.725, 1.0, 1.5, 9.85, WALL_DARK);
  b.mark(p0, { noLedge: true });

  // ---- traversal anchors
  for (const x of [-22.4, 8.6, 22.6]) b.pipeV(x, -18.23, 0, 6.0, 0);
  b.rappel(1.2, 6.0, -18.15, PI, 6.0);
  b.pipeH(-6.8, -17.0, -23.4, -17.0, 5.0); // the bay main
  b.pipeH(12.0, -10.35, 12.0, -17.4, 4.7); // the workshop branch
  b.ladder(5.0, -14.45, 3.3, 6.0, 0); // the roof hatch ladder (top (5.0, 6.0, -14.0))
  b.ladder(8.5, -14.6, 0, 3.3, -PI / 2); // workshop to the deck
  b.ladder(23.5, -9.55, 0, 3.0, -PI / 2); // the catwalk's east end
  b.box(15.625, 2.9, -9.55, 14.95, 0.2, 1.2, STEEL); // catwalk x 8.15 - 23.1
  b.box(15.625, 3.5, -8.9, 14.95, 0.05, 0.05, HAZARD, 0, 0, false); // visual rail
  // deck rails (visual): the west edge with the pallet-gate gap z -17.65 to -16.45, the east edge
  b.box(-8.1, 3.8, -14.8, 0.05, 1.0, 1.7, HAZARD, 0, 0, false);
  b.box(-8.1, 3.8, -16.0, 0.05, 0.05, 1.2, HAZARD, 0, 0, false);
  b.fence(22, -17.85, 22, -15.8, 2.4); // the valve cage
  b.fence(22, -15.8, 23.85, -15.8, 2.4);
  b.block(20.2, -19.025, 3.2, 4.3, 1.75, WALL); // the pump house (4.3 m)

  // ---- yard
  const t0 = b.boxes.length;
  b.box(-4.6, 2.65, -23.35, 13.6, 2.7, 2.5, TRAILER); // trailer body y 1.3 - 4.0
  b.mark(t0, { noLedge: true });
  b.block(-9.9, -23.35, 3.0, 1.3, 2.5, STEEL); // the rear bogie
  b.box(-13.5, 1.1, -21.2, 3.0, 2.2, 0.1, STEEL); // the smoker's shelter: panels S, W, E; the roof is visual
  b.box(-15, 1.1, -20.5, 0.1, 2.2, 1.4, STEEL);
  b.box(-12, 1.1, -20.5, 0.1, 2.2, 1.4, STEEL);
  b.box(-13.5, 2.25, -20.5, 3.2, 0.08, 1.6, STEEL, 0, 0, false);
  b.block(-22.7, -21.5, 1.8, 1.7, 3.6, '#2f5a3c'); // the skip
  b.block(-16.4, -19.0, 1.2, 1.4, 1.0, CRATE); // empty pallets
  b.block(15, -21.4, 2.0, 2.5, 5.5, '#3d6e8f'); // the van
  b.block(11.25, -23.6, 2.5, 2.6, 2.0, WALL); // the gatehouse
  b.box(6.5, 1.1, -25.95, 6.0, 2.2, 0.08, STEEL, 0, 0, false); // the gate panel (visual)
  b.ambientZone(-11.6, 2.4, -26, -22.0, 0.17, -1, 6); // the lane behind the trailer

  // ---- bay
  for (const x of [-19.8, -18.4, -17.0]) b.block(x, -14.4, 1.2, 1.6, 1.0, SHRINK); // the W lane pallets
  b.block(-12.0, -13.8, 1.2, 1.8, 1.0, CRATE).block(-10.8, -13.8, 1.2, 1.8, 1.0, CRATE).block(-11.4, -11.6, 1.2, 1.2, 1.0, CRATE); // the E lane
  b.block(-16.0, -11.8, 1.6, 0.15, 1.6, STEEL).block(-16.0, -12.75, 0.3, 2.4, 0.3, STEEL); // the wrapper
  b.block(-22.8, -15.6, 0.8, 1.05, 1.6, DESK);
  b.block(-23.4, -11.4, 1.0, 1.5, 1.2, CRATE).block(-23.4, -10.1, 1.0, 0.9, 1.2, CRATE); // empty stacks
  b.block(-10.2, -7.6, 1.2, 2.2, 2.4, HAZARD); // the forklift
  b.block(-6.0, -6.5, 1.0, 1.6, 0.6, STEEL); // the charger
  b.block(-21, -7.0, 1.2, 1.0, 0.8, CRATE, 3.2).block(-10.5, -7.2, 1.6, 1.2, 1.0, CRATE, 3.2); // lobby-block roof storage

  // ---- offices
  b.block(-5.0, -15.4, 3.0, 1.05, 0.6, DESK); // the counter
  b.block(-0.6, -16.6, 1.6, 0.75, 0.8, DESK).block(2.0, -15.0, 0.8, 0.75, 1.6, DESK);
  b.block(3.5, -15.6, 0.7, 0.75, 2.4, DESK); // the DVR desk
  b.block(6.45, -15.4, 0.9, 1.2, 0.5, STEEL); // the cabinet centred under the security hatch (top 1.2: 1.8 m to the deck slab)
  b.block(4.5, -9.25, 5.0, 0.9, 0.6, DESK); // the mess worktop
  b.block(-7.4, -9.6, 0.6, 2.0, 1.0, STEEL); // the server rack
  b.block(1.5, -16.3, 3.0, 1.8, 1.6, STEEL, 3.3); // the AHU on the deck

  // ---- workshop
  b.block(12.5, -14.0, 2.4, 0.9, 0.9, DESK).block(19.0, -15.5, 0.9, 0.9, 2.4, DESK);
  b.block(17.0, -11.8, 2.2, 1.3, 0.8, STEEL); // the lathe
  b.block(21.0, -16.8, 0.6, 1.7, 0.6, STEEL); // the drill
  b.block(8.45, -16.6, 0.6, 2.0, 1.6, STEEL); // the lockers
  b.box(16, 4.4, -14.5, 15, 0.3, 0.3, BEAM, 0, 0, false); // the crane runway and girder (visual)
  b.box(16, 4.7, -13.0, 0.4, 0.4, 7, BEAM, 0, 0, false);
  b.box(10, 2.95, -10.9, 4, 0.14, 0.14, PIPE, 0, 0, false);
  b.box(5.0, 2.25, -17.9, 0.05, 0.3, 0.05, GLASS, 0, 0, false);

  // ---- lights (groups 30 - 36 are the new circuits, 20 is outside)
  const lamp = (x: number, y: number, z: number, radius: number, intensity: number, group: number, color: [number, number, number] = [1, 0.92, 0.75]): void => {
    b.light({ kind: 'lamp', x, y, z, radius, intensity, color, group, fixture: { sx: 0.5, sy: 0.08, sz: 0.5, oy: 0.1 } });
  };
  lamp(-19, 5.05, -14.4, 7, 0.8, 30);
  lamp(-20.2, 2.75, -7.4, 4, 0.8, 31);
  lamp(-10.2, 2.75, -7.4, 3, 0.4, 31, [0.5, 1, 0.6]);
  lamp(0, 2.65, -12.3, 6, 0.8, 32);
  lamp(-5, 2.85, -14.4, 3, 0.4, 33);
  lamp(4.8, 2.85, -15.8, 4, 0.7, 34, [0.55, 0.7, 1]);
  lamp(4.5, 2.65, -9.8, 4, 0.8, 35);
  lamp(11, 2.4, -17.6, 3, 0.4, 36, [0.5, 1, 0.6]);
  b.light({ kind: 'spot', x: -11, y: 5.6, z: -18.6, radius: 7.5, intensity: 0.9, color: [0.85, 0.9, 1], cone: makeCone(0, -1, -0.25, 0.7), group: 20, fixture: { sx: 0.45, sy: 0.22, sz: 0.3, oy: 0.12 } });
  b.light({ kind: 'lamp', x: -5, y: 2.6, z: -18.5, radius: 5, intensity: 0.8, color: [1, 0.92, 0.75], group: 20, fixture: { sx: 0.3, sy: 0.1, sz: 0.2, oy: 0.1 } });
  b.light({ kind: 'lamp', x: 11, y: 2.6, z: -18.5, radius: 4, intensity: 0.6, color: [1, 0.92, 0.75], group: 20, fixture: { sx: 0.3, sy: 0.1, sz: 0.2, oy: 0.1 } });
  b.light({ kind: 'lamp', x: 11.25, y: 2.45, z: -22.45, radius: 4, intensity: 0.7, color: [1, 0.85, 0.6], group: 20, fixture: { sx: 0.2, sy: 0.12, sz: 0.2, oy: 0.06 } });
  b.ambientZone(-8, 8, -13.8, -8.8, 0.05, 2.95, 4.65); // the void
}
