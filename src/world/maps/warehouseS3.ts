import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import type { MapLayout } from '../mapDef';

/**
 * Sector Ops section 3 of the Warehouse (warehouse-s23, SPEC 2.3, BUILD-S3.md): the assembly hall, the mezzanine with the
 * production office, the rear offices and the east fire-exit lobby, a greybox. Frame: x west to east, z south to north, y up,
 * metres. The hall is x -4 (section 2's 6.0 wall, east face -3.85) to x 24 (perimeter inner face), z -8.8 (section 1's 6.0 wall)
 * to z 18. `warehouse.ts` builds the perimeter, floor, the offices' walls and furniture (`assemblyHall: false` skips its own
 * factory floor, deck and lamp strips); this file builds the rest.
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
const GRATE = '#3a3d40';
const BELT = '#3d4247';
const CABINET = '#4b5560';
const T = 0.3;
const PI = Math.PI;

/** Section 3's rooms (HUD tags; squads come from the mode). Plan boxes with storeys (feet height below 2.9 = ground floor). */
export const S3_ROOMS: RoomDef[] = [
  { id: 'assembly', name: 'Assembly Hall', minX: -4, maxX: 24, minZ: -8.8, maxZ: 12, maxY: 2.9 },
  { id: 'stores', name: 'Stores Cage', minX: 0, maxX: 6, minZ: -8.8, maxZ: -4, maxY: 2.9 },
  { id: 'plant', name: 'Plant Room', minX: 16, maxX: 24, minZ: -5.6, maxZ: -1, maxY: 2.9 },
  { id: 'fireLobby', name: 'Fire-exit Lobby', minX: 16, maxX: 24, minZ: -8.8, maxZ: -5.6, maxY: 2.9 },
  { id: 'partsStore', name: 'Parts Store', minX: 8, maxX: 24, minZ: 12, maxZ: 18, maxY: 2.9 },
  { id: 'office', name: 'Office', minX: -4, maxX: 2, minZ: 12, maxZ: 18, maxY: 2.9 },
  { id: 'manager', name: "Manager's Office", minX: 2, maxX: 8, minZ: 12, maxZ: 18, maxY: 2.9 },
  { id: 'mezzDeck', name: 'Mezzanine', minX: -4, maxX: 24, minZ: 12, maxZ: 18, minY: 2.9 },
  { id: 'prodOffice', name: 'Production Office', minX: 16, maxX: 24, minZ: 14.5, maxZ: 18, minY: 2.9 },
].map((r) => ({ ...r, squad: [] }));

/** Light switches (circuits 50-54 and 57: C3, the floor, the deck, the production office, the plant room, the manager's office). */
export const S3_SWITCHES: NonNullable<MapLayout['switches']> = [
  { pos: new Vector3(1.85, 0, 13.0), yaw: -PI / 2, group: 50 },
  { pos: new Vector3(-3.85, 0, 10.5), yaw: PI / 2, group: 51 },
  { pos: new Vector3(23.85, 0, 4.4), yaw: -PI / 2, group: 52 },
  { pos: new Vector3(16.15, 3.3, 15.0), yaw: PI / 2, group: 53 },
  { pos: new Vector3(16.15, 0, -4.3), yaw: PI / 2, group: 54 },
  { pos: new Vector3(2.15, 0, 13.0), yaw: PI / 2, group: 57 },
];

export const S3_PICKUPS: NonNullable<MapLayout['pickups']> = [{ pos: new Vector3(-3.4, 0, 3.0), kind: 'ammo' }];

/**
 * (sector-fixes R3, docs/sector-fixes/r/R3.md) Section 3's co-op-only routes. Plan boxes [x0, x1] x [z0, z1], slab tops (m).
 * - `valve`: the hall main's zone-valve platform in the east bay, hung from the roof beside the main; its fixed ladder is
 *   gone (the bay is the forklift lane; fitters bring the scissor lift). Leg-up from the bay floor onto its 4.4 m lip, the
 *   partner by the relay or the rope; from its west lip a jump up to the main (0.4 m across, 0.6 m up), then north to the
 *   deck strip by the production office window. Railed on the south (the lamp under it).
 * - `drive`: the crane bridge's drive platform at mid-span (motor and gearbox), hung on the bridge's east side over the
 *   CNC cell, no ladder (scissor lift). Leg-up from the floor; the supervisor's CNC post is under its east lip (a hang-drop);
 *   the CNC cell's sprinkler `branch` off the main ends over that lip (a jump up, then east to the main). Railed on the
 *   west (the lamp under it).
 * Both are co-op-only from the hall floor (nothing a player alone stands on within reach) and reached alone only along the
 * main (the plant-room roof or the deck's north end): the way back for a reviver, and down: let go of any lip (4.4).
 * (sector-fixes-r e2e fix) The hall roof is at 6.03: 1.63 m over a 4.4 top, and a climb-up off a lip needs a standing
 * body's room over the top (`AttachController.climbRoom`, `MOVEMENT.standHeight` 1.75; the e2e hung on the lip with
 * `canClimb` false). So the roof over each platform is cut open and closed by a raised hood (`S3_ROOF_HOODS`, underside
 * `hoodUnder` 6.3: 1.9 m of room), the roof-ventilator upstand the fitters reach the valve and the drive under, as section
 * 1's weather hood over the plant-room door.
 */
export const S3_COOP = {
  valve: { x0: 17.4, x1: 18.6, z0: 4.0, z1: 5.5, top: 4.4 },
  drive: { x0: 11.3, x1: 12.3, z0: 4.4, z1: 6.0, top: 4.4 },
  branch: { x0: 12.45, x1: 17.0, z: 5.3, y: 5.0 },
  /** The team door: the plant room's service door into the fire-exit lobby (a 1.2 gap in the z -5.6 wall). */
  lobbyDoor: { x0: 22.6, x1: 23.8, z: -5.6, w: 1.1 },
  /** (sector-fixes-r e2e fix) The underside of the hoods over the two platforms (m). */
  hoodUnder: 6.3,
} as const;

/** (sector-fixes-r e2e fix) The holes in the hall roof [x0, x1, z0, z1] under the hoods: each platform's footprint. */
export const S3_ROOF_HOODS: readonly (readonly [number, number, number, number])[] = [S3_COOP.valve, S3_COOP.drive].map((p) => [p.x0, p.x1, p.z0, p.z1] as const);

/**
 * (sector-fixes R3, the team-door contract in docs/sector-fixes/r/PLAN.md) The plant room's service door into the fire-exit
 * lobby, barrel-bolted on the lobby side (the exit lobby is never a way into the plant; the engineer uses the hall doors).
 * `at` the door's plan centre, `side` toward the lobby (the side that unbolts it). One drops in by the lobby roof hatch or
 * comes by the fire door and unbolts it for the partner in the plant room (the duct route's way out past the tour guard).
 */
export const S3_BOLTS: readonly { at: [number, number]; side: [number, number] }[] = [
  { at: [(S3_COOP.lobbyDoor.x0 + S3_COOP.lobbyDoor.x1) / 2, S3_COOP.lobbyDoor.z], side: [0, -1] },
];

/** Nav seeds: the deck, the office, the deck strip, the walkway, the lobby and plant roofs, the plant room, the lobby, the cage, the parts store, the press and forklift tops. */
export const S3_NAV_SEEDS: Vector3[] = [
  new Vector3(10, 3.3, 14.0),
  new Vector3(20, 3.3, 16.0),
  new Vector3(19.0, 3.3, 13.0),
  new Vector3(6, 3.0, -8.0),
  new Vector3(19.5, 3.2, -7.8),
  new Vector3(18.5, 3.8, -2.5),
  new Vector3(19.0, 0, -2.0),
  new Vector3(19.5, 0, -7.2),
  new Vector3(3.0, 0, -6.5),
  new Vector3(12.0, 0, 15.0),
  new Vector3(6.0, 3.3, 1.0),
  new Vector3(13.5, 2.2, 10.8),
];

/**
 * Section 3's lamp pass (BUILD-S3.md 3.7: small lamps under the structure so the route and objective points read without night
 * vision, warehouse-s23 M1). [x, y, z, radius, intensity, group, colour]. Circuits: 50 C3, 51 the floor, 52 the deck and high lamps,
 * 53 the production office, 54 the plant room, 55 the lobby, 56 the cage counter, 57 the manager's office, 58 the exit signs.
 * `tests/warehouseS3Light.test.ts` pins the levels.
 */
export type S3Lamp = readonly [x: number, y: number, z: number, radius: number, intensity: number, group: number, colour?: readonly [number, number, number]];
const GREEN = [0.5, 1, 0.6] as const;
const MONITOR = [0.55, 0.7, 1] as const;
export const S3_LIGHT_PASS: readonly S3Lamp[] = [
  [-2.0, 2.8, 13.8, 4.5, 0.65, 50], // ladder 8.4: sheet (-1.8, 14.2, r 4.0, i 0.60); moved 0.45 m, r +0.5, i +0.05 (doorway and C3 near door)
  [0.6, 2.8, 15.6, 2.5, 0.6, 50],
  [-1.0, 3.6, 10.8, 4.0, 0.6, 51],
  [4.0, 3.6, 7.0, 4.5, 0.6, 51],
  [7.2, 3.6, 9.6, 4.0, 0.85, 51],
  [5.0, 4.4, 10.6, 3.5, 0.62, 51],
  [11.4, 3.4, 11.3, 3.5, 1.05, 51],
  [13.2, 5.4, 10.8, 3.0, 0.6, 52],
  [13.8, 5.8, 12.6, 2.5, 0.47, 52],
  [16.9, 5.6, 12.9, 3.0, 0.65, 52],
  [19.6, 5.6, 13.8, 2.5, 0.31, 52],
  [20.4, 5.6, 12.4, 2.5, 0.51, 52],
  [18.2, 5.6, 15.3, 3.0, 0.69, 53],
  [18.8, 5.6, 17.4, 2.5, 0.74, 53],
  [23.4, 5.6, 16.8, 4.0, 0.85, 53, MONITOR], // ladder 8.4: sheet (22.6, 16.4, i 0.87); moved 0.9 m away from (22.9, 15.6), i -0.02
  [19.5, 4.0, 10.0, 4.0, 0.83, 51],
  [18.0, 4.0, 3.5, 4.5, 0.8, 51],
  [18.2, 5.6, 6.0, 3.5, 0.8, 52],
  [15.0, 3.4, -1.8, 3.0, 1.4, 51],
  [15.0, 3.0, -5.4, 3.0, 0.8, 51],
  [17.6, 3.3, -3.3, 2.4, 1.28, 54],
  [19.4, 3.3, -3.4, 2.4, 1.37, 54],
  [22.2, 2.75, -2.4, 2.5, 0.67, 54],
  [18.2, 2.75, -6.9, 2.6, 0.72, 55],
  [22.2, 2.75, -7.4, 2.0, 0.65, 55],
  [23.8, 2.4, -7.2, 3.0, 0.4, 58, GREEN],
  [16.8, 5.8, -6.6, 2.5, 0.43, 52], // ladder 8.4: sheet i 0.60; two -15% steps (the lobby roof west edge)
  [21.7, 5.8, -7.2, 2.5, 0.58, 52],
  [18.0, 5.7, -1.4, 2.5, 1.23, 52],
  [-2.6, 3.6, 8.0, 4.0, 0.6, 51],
  [-2.6, 3.6, 1.0, 4.0, 0.7, 51],
  [-2.6, 3.6, -4.5, 4.0, 0.7, 51],
  [-3.2, 2.6, -6.6, 3.0, 0.35, 51],
  [-3.0, 5.0, -8.0, 3.0, 0.4, 52],
  [4.0, 5.0, -8.0, 3.0, 0.4, 52],
  [12.0, 5.0, -8.0, 1.9, 0.43, 52],
  [4.2, 2.8, 14.5, 4.0, 1.22, 57],
  [11.0, 3.6, 5.5, 4.5, 1.14, 51],
  [10.8, 3.6, -4.8, 3.0, 0.9, 51],
  [7.8, 3.6, 1.4, 4.0, 0.8, 51],
  [4.2, 2.6, -5.4, 3.0, 0.8, 56],
  [22.7, 5.4, 12.2, 3.0, 0.4, 58, GREEN],
];

/** A lintel (a head over a gap): an overhead box, so the floor under it stays open to the nav grid. */
function lintel(b: LevelBuilder, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color = WALL): void {
  b.box(cx, cy, cz, sx, sy, sz, color);
  b.boxes[b.boxes.length - 1]!.overhead = true;
}

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

/** Rail segments along the deck's south edge (visual: 0.04 thick, so not light shapes). */
function deckRail(b: LevelBuilder, a: number, e: number): void {
  for (const y of [4.3, 3.8]) b.box((a + e) / 2, y, 11.9, e - a, 0.04, 0.04, HAZARD, 0, 0, false);
  const posts: number[] = [];
  for (let x = a + 2; x < e - 0.5; x += 2) posts.push(x);
  for (const x of [a, ...posts, e]) b.box(x, 3.8, 11.9, 0.04, 1.0, 0.04, HAZARD, 0, 0, false);
}

/** Everything of section 3 (BUILD-S3.md 2 and 3): the shell and deck, the production office, the stair, the plant room, the lobby, the walkway, the floor, the services and the lights. Called by `opsPieces` after section 2. */
export function buildAssemblyS3(b: LevelBuilder): void {
  const nl = (from: number): void => void b.mark(from, { noLedge: true });
  const ov = (from: number): void => void b.mark(from, { overhead: true });

  // ---- 2.1 shell: parapets over the north and east perimeter tops (a seal: no lip on the wall tops)
  let p0 = b.boxes.length;
  b.box(10, 6.75, 18.5, 28.0, 1.5, 1.0, WALL_DARK);
  b.box(24.5, 6.75, 5.1, 1.0, 1.5, 27.8, WALL_DARK);
  nl(p0);

  // ---- 2.2 the mezzanine deck (top 3.3, underside 3.0)
  p0 = b.boxes.length;
  b.box(10.075, 3.15, 14.925, 27.85, 0.3, 6.15, STEEL);
  ov(p0);
  for (const x of [12, 16, 20]) b.pillar(x, 12.15, 0.15, 3.0, STEEL);
  // the manager's office east wall and the door heads
  b.wallZ(8, 12.15, 18, [], 3.0, WALL, T);
  lintel(b, -0.95, 2.55, 12, 1.1, 0.9, T);
  lintel(b, 5.15, 2.55, 12, 1.1, 0.9, T);
  lintel(b, 2, 2.55, 16.05, T, 0.9, 1.1);
  b.surface('metal', -3.85, 24, 11.85, 18, 3.3);
  b.surface('carpet', 16.15, 24, 14.65, 18, 3.3);
  // rails (visual) with the gaps: the west ladder head, the pallet gate, the stair head
  deckRail(b, -3.15, 12.5);
  deckRail(b, 14.5, 22.1);
  deckRail(b, 23.3, 24.0);
  for (const x of [12.5, 14.5]) b.box(x, 3.85, 11.9, 0.04, 1.1, 0.04, HAZARD, 0, 0, false);
  b.box(13.5, 4.4, 11.9, 2.0, 0.04, 0.04, HAZARD, 0, 0, false);
  b.ladder(-3.4, 11.6, 0, 3.3, 0, STEEL);
  // on the deck (cover, not perches)
  p0 = b.boxes.length;
  b.block(6.0, 16.3, 4.0, 2.0, 2.6, STEEL, 3.3);
  b.block(9.0, 14.6, 1.2, 1.2, 1.2, CRATE, 3.3);
  b.block(11.5, 15.8, 1.2, 1.1, 1.2, CRATE, 3.3);
  nl(p0);

  // ---- 2.3 the production office (on the deck)
  p0 = b.boxes.length;
  b.box(16, 4.55, 16.175, T, 2.5, 3.65, WALL);
  // (the door gap is 1.2 (x 16.4-17.6) round a 1.1 leaf: the nav grid (cell 0.5, agent 0.32) needs a cell centre 0.32 clear of both jambs, and 1.1 at these coordinates has none)
  b.box(16.275, 4.55, 14.5, 0.25, 2.5, T, WALL);
  lintel(b, 17.0, 5.6, 14.5, 1.2, 0.4, T);
  b.box(18.3, 4.55, 14.5, 1.4, 2.5, T, WALL);
  b.box(19.6, 3.75, 14.5, 1.2, 0.9, T, WALL);
  lintel(b, 19.6, 5.6, 14.5, 1.2, 0.4, T);
  b.box(21.775, 4.55, 14.5, 3.15, 2.5, T, WALL);
  // (the duct pieces end at x 23.95, 5 cm off the perimeter: the cladding's troughs there fail voxelFit on a flush face)
  b.box(23.65, 3.775, 14.5, 0.6, 0.95, T, WALL);
  b.box(23.65, 5.375, 14.5, 0.6, 0.85, T, WALL);
  b.box(19.925, 5.9, 16.175, 8.15, 0.2, 3.65, ROOF);
  nl(p0);
  b.mark(b.boxes.length - 1, { overhead: true });
  b.door(16.45, 3.3, 14.5, 1.1, PI / 2, { swing: -1 });
  b.windowAt(19.6, 4.8, 14.5, 1.2, 1.2, 0, { sill: 4.2, open: true });
  b.box(23.65, 4.6, 14.67, 0.6, 0.6, 0.04, GRATE, 0, 0, false);
  p0 = b.boxes.length;
  b.block(18.6, 17.75, 1.6, 0.75, 0.5, DESK, 3.3);
  b.block(21.9, 17.3, 0.6, 1.0, 1.4, DESK, 3.3);
  b.block(16.5, 17.6, 0.6, 1.3, 0.8, STEEL, 3.3);
  nl(p0);

  // ---- 2.4 the east stair (two flights of 9 and a landing)
  b.stairs(22.7, 6.1, 1.2, 2.5, 1.65, 9, CONCRETE, 0, 0);
  b.block(22.7, 8.35, 1.2, 1.65, 2.0, CONCRETE);
  b.stairs(22.7, 10.6, 1.2, 2.5, 1.65, 9, CONCRETE, 0, 1.65);
  const pitch = -Math.atan2(1.65, 2.5);
  for (const x of [22.08, 23.32]) {
    b.box(x, 1.825, 6.1, 0.04, 0.04, 2.995, HAZARD, 0, pitch, false);
    b.box(x, 1.65 + 1.825, 10.6, 0.04, 0.04, 2.995, HAZARD, 0, pitch, false);
    b.box(x, 2.65, 8.35, 0.04, 0.04, 2.0, HAZARD, 0, 0, false);
    for (const [z, y] of [[4.85, 0], [7.35, 1.65], [9.35, 1.65], [11.85, 3.3]] as const) b.box(x, y + 0.5, z, 0.04, 1.0, 0.04, HAZARD, 0, 0, false);
  }

  // ---- 2.5 the plant room
  b.wallZ(16, -5.6, -1.0, [[-3.85, -2.75]], 3.6, WALL, T);
  b.wallX(-1.0, 15.85, 24, [[19.4, 20.6]], 3.6, WALL, T); // (a 1.2 gap round the 1.1 leaf: a nav cell fits, see the production office door)
  // (R3) the south wall's service door into the lobby (the team door, S3_BOLTS): a 1.2 gap round the 1.1 leaf
  const ld = S3_COOP.lobbyDoor;
  b.wallX(ld.z, 15.85, 24, [[ld.x0, ld.x1]], 3.6, WALL, T);
  lintel(b, 16, 2.85, -3.3, T, 1.5, 1.1);
  lintel(b, 20.0, 2.85, -1.0, 1.2, 1.5, T);
  lintel(b, (ld.x0 + ld.x1) / 2, 2.85, ld.z, ld.x1 - ld.x0, 1.5, T);
  b.door(16, 0, -3.85, 1.1, 0, { swing: 1 });
  b.door(19.45, 0, -1.0, 1.1, PI / 2, { swing: -1 });
  // bolted on the lobby side; swings into the plant room's empty south-east corner
  b.door((ld.x0 + ld.x1) / 2 - ld.w / 2, 0, ld.z, ld.w, PI / 2, { swing: -1, locked: true, breachable: false });
  p0 = b.boxes.length;
  plate(b, 15.85, 24, -5.75, -0.85, 3.8, 0.2, [[20.55, 21.45, -2.45, -1.55]], ROOF);
  ov(p0);
  b.ladder(21.0, -2.0, 0, 3.8, 0, STEEL);
  b.block(17.2, -5.0, 1.8, 1.6, 0.9, PIPE);
  b.block(20.6, -4.4, 3.0, 2.0, 1.6, STEEL);
  p0 = b.boxes.length;
  b.block(23.6, -0.9, 0.8, 5.9, 3.0, STEEL);
  nl(p0);
  b.box(23.215, 0.5, -1.8, 0.04, 0.6, 0.6, GRATE, 0, 0, false); // (set into the shaft face, 5 mm proud: a flush visual fails voxelFit's air probe)

  // ---- 2.6 the east fire-exit lobby
  b.box(16, 1.5, -7.75, T, 3.0, 1.8, WALL);
  lintel(b, 16, 2.55, -6.3, T, 0.9, 1.1);
  b.door(16, 0, -6.85, 1.1, 0, { swing: 1 });
  p0 = b.boxes.length;
  plate(b, 15.85, 24, -8.65, -5.75, 3.2, 0.2, [[22.05, 22.95, -7.65, -6.75]], ROOF);
  ov(p0);
  b.box(23.97, 1.05, -7.2, 0.06, 2.1, 1.2, STEEL, 0, 0, false);
  b.box(23.92, 1.0, -7.2, 0.04, 0.06, 1.0, HAZARD, 0, 0, false);

  // ---- 2.7 the crane walkway (3.0) and the crane (visual)
  p0 = b.boxes.length;
  b.box(6.1, 2.9, -8.05, 19.4, 0.2, 1.2, STEEL);
  ov(p0);
  b.surface('metal', -3.6, 15.8, -8.65, -7.45, 3.0);
  b.box(6.1, 4.0, -7.47, 19.4, 0.04, 0.04, HAZARD, 0, 0, false);
  for (const x of [-2, 2, 6, 10, 14]) b.box(x, 4.4, -8.05, 0.04, 2.8, 0.04, STEEL, 0, 0, false);
  b.ladder(-3.4, -7.2, 0, 3.0, PI, STEEL);
  b.box(10.075, 5.5, -8.2, 27.85, 0.3, 0.3, BEAM, 0, 0, false);
  b.box(10.075, 5.5, 11.6, 27.85, 0.3, 0.3, BEAM, 0, 0, false);
  b.box(11, 5.2, 1.7, 0.4, 0.4, 19.8, BEAM, 0, 0, false);
  b.box(11, 4.75, -6.9, 0.6, 0.5, 0.6, HAZARD, 0, 0, false);
  b.box(11, 3.0, -6.9, 0.03, 3.0, 0.03, STEEL, 0, 0, false);

  // ---- 2.8 the floor
  b.block(6, 1, 2.4, 3.3, 2.0, STEEL); // the press (a 3.3 perch by wall jump)
  b.box(5.25, 3.5, 1, 0.6, 0.4, 0.9, HAZARD, 0, 0, false);
  p0 = b.boxes.length;
  b.block(7.4, -1.2, 2.4, 2.0, 1.2, STEEL); // power unit
  nl(p0);
  b.block(7.65, 2.6, 1.5, 1.8, 0.8, STEEL); // die trolley
  p0 = b.boxes.length;
  b.block(8.6, 1.0, 0.6, 2.0, 1.8, CABINET); // press control cabinet
  b.block(12.5, -2.5, 3.0, 2.4, 1.6, STEEL); // CNC machining centres
  b.block(12.5, 3.5, 3.0, 2.4, 1.6, STEEL);
  nl(p0);
  b.block(4, 8.6, 10, 1.0, 0.9, BELT); // the conveyor
  b.block(0.5, 10.8, 1.2, 1.4, 1.2, SHRINK); // finished kits for C3
  b.block(13.5, 10.8, 1.2, 2.2, 2.0, HAZARD); // the parked forklift
  b.box(13.5, 0.1, 12.1, 0.9, 0.05, 0.6, STEEL, 0, 0, false);
  p0 = b.boxes.length;
  b.block(11.75, 13.5, 6.5, 2.0, 0.6, STEEL); // the parts store shelving rows
  b.block(11.75, 16.5, 6.5, 2.0, 0.6, STEEL);
  nl(p0);
  // the stores cage (mesh 2.4, open top) with its counter gate
  b.fence(0, -8.65, 0, -4.0, 2.4);
  b.fence(0, -4.0, 2.4, -4.0, 2.4); // (a 1.2 gap round the 1.1 gate, as the office door: a nav cell fits)
  b.fence(3.6, -4.0, 6.0, -4.0, 2.4);
  b.fence(6.0, -4.0, 6.0, -8.65, 2.4);
  b.door(2.45, 0, -4.0, 1.1, PI / 2, { swing: 1 });
  b.block(4.7, -4.35, 1.4, 1.0, 0.5, DESK);
  p0 = b.boxes.length;
  b.block(5.65, -6.5, 0.5, 2.0, 3.6, STEEL);
  b.block(2.6, -8.35, 3.2, 2.0, 0.6, STEEL);
  nl(p0);
  b.block(11.0, -8.15, 1.6, 1.2, 0.9, STEEL); // the die rack under the walkway

  // ---- 2.9 services: the hall main with its header, and the office supply duct
  b.pipeH(17.0, -3.0, 17.0, -1.2, 5.8, PIPE);
  b.pipeH(17.0, -0.5, 17.0, 12.6, 5.0, PIPE);
  b.box(17.0, 2.6, -4.5, 0.12, 2.0, 0.12, PIPE, 0, 0, false);
  b.box(17.0, 4.8, -3.0, 0.12, 2.0, 0.12, PIPE, 0, 0, false);
  b.box(17.0, 5.8, -0.85, 0.12, 0.12, 0.7, PIPE, 0, 0, false);
  b.box(17.0, 5.4, -0.5, 0.12, 0.8, 0.12, PIPE, 0, 0, false);
  for (const z of [3, 7, 11]) b.box(17.0, 5.6, z, 0.04, 1.2, 0.04, PIPE, 0, 0, false);
  b.box(10.0, 2.85, 13.0, 24.0, 0.04, 0.04, PIPE, 0, 0, false);
  p0 = b.boxes.length;
  b.box(23.65, 5.1, 7.275, 0.6, 0.9, 13.35, STEEL);
  nl(p0);
  b.box(23.65, 4.75, 14.15, 0.6, 0.9, 0.4, STEEL, 0, 0, false);
  const inGrate = { pos: { x: 23.18, y: 0.5, z: -1.8 }, nx: -1, ny: 0, nz: 0, where: 'wall' } as const;
  const outGrate = { pos: { x: 23.65, y: 4.6, z: 14.67 }, nx: 0, ny: 0, nz: 1, where: 'wall' } as const;
  const path = [
    { x: 23.2, y: 0, z: -1.8 },
    { x: 23.65, y: 0, z: -1.8 },
    { x: 23.65, y: 4.7, z: 0.5 },
    { x: 23.65, y: 4.7, z: 14.0 },
    { x: 23.65, y: 4.35, z: 14.45 },
  ];
  b.duct(path, inGrate, outGrate);
  b.duct([...path].reverse(), outGrate, inGrate);

  // ---- (sector-fixes R3) co-op-only routes (S3_COOP): two hung platforms with 4.4 m lips over open floor and the branch line.
  // The slabs are overhead (the floor under them stays open to the nav grid and every guard walks under); the rails are
  // solid (they cut the lip on that side) and carry no lips; the rods, valve, motor and brackets are visual.
  const hung = (p: { x0: number; x1: number; z0: number; z1: number; top: number }): void => {
    const cx = (p.x0 + p.x1) / 2;
    const cz = (p.z0 + p.z1) / 2;
    p0 = b.boxes.length;
    b.box(cx, p.top - 0.15, cz, p.x1 - p.x0, 0.3, p.z1 - p.z0, GRATE);
    ov(p0);
    const hu = S3_COOP.hoodUnder;
    for (const [x, z] of [[p.x0 + 0.1, p.z0 + 0.1], [p.x1 - 0.1, p.z0 + 0.1], [p.x0 + 0.1, p.z1 - 0.1], [p.x1 - 0.1, p.z1 - 0.1]] as const) b.box(x, (p.top + hu) / 2, z, 0.04, hu - p.top, 0.04, STEEL, 0, 0, false);
    // (sector-fixes-r e2e fix) the hood over the roof's hole (S3_ROOF_HOODS; the roof panels and sheets are cut round it):
    // upstands from the roof line (6.03) to the lid, the lid's underside at `hoodUnder` 6.3 (a standing body's room over
    // the 4.4 top, for the climb-up); solid and drawn, so it closes the hole for the light bake as the roof did
    const W = 0.1;
    p0 = b.boxes.length;
    b.box(p.x0 - W / 2, (6.03 + hu) / 2, cz, W, hu - 6.03, p.z1 - p.z0 + 2 * W, ROOF);
    b.box(p.x1 + W / 2, (6.03 + hu) / 2, cz, W, hu - 6.03, p.z1 - p.z0 + 2 * W, ROOF);
    b.box(cx, (6.03 + hu) / 2, p.z0 - W / 2, p.x1 - p.x0, hu - 6.03, W, ROOF);
    b.box(cx, (6.03 + hu) / 2, p.z1 + W / 2, p.x1 - p.x0, hu - 6.03, W, ROOF);
    b.box(cx, hu + 0.1, cz, p.x1 - p.x0 + 2 * W, 0.2, p.z1 - p.z0 + 2 * W, ROOF);
    b.mark(p0, { overhead: true, noLedge: true });
  };
  const rail = (cx: number, cz: number, sx: number, sz: number, y: number): void => {
    p0 = b.boxes.length;
    b.box(cx, y + 0.5, cz, sx, 1.0, sz, HAZARD);
    b.mark(p0, { noLedge: true, overhead: true });
  };
  // the zone-valve platform beside the main (east bay): rail on the south (the lamp at (18.0, 4.0, 3.5) is under that edge)
  const vp = S3_COOP.valve;
  hung(vp);
  rail((vp.x0 + vp.x1) / 2, vp.z0 + 0.04, vp.x1 - vp.x0, 0.04, vp.top);
  b.box(17.35, 5.0, 4.75, 0.7, 0.1, 0.1, PIPE, 0, 0, false); // the valve's tee off the main
  b.box(17.7, 4.75, 4.75, 0.12, 0.5, 0.12, PIPE, 0, 0, false);
  b.box(17.7, 4.7, 4.75, 0.3, 0.04, 0.3, BEAM, 0, 0, false); // the handwheel
  // the crane bridge's drive platform (mid-span, east of the girder at x 11): rail on the west (the lamp at (11.0, 3.6, 5.5))
  const dp = S3_COOP.drive;
  hung(dp);
  rail(dp.x0 + 0.04, (dp.z0 + dp.z1) / 2, 0.04, dp.z1 - dp.z0, dp.top);
  b.box(11.75, 4.75, 5.6, 0.6, 0.7, 0.5, BEAM, 0, 0, false); // the drive motor and gearbox
  for (const z of [dp.z0 + 0.3, dp.z1 - 0.3]) b.box(11.25, 4.7, z, 0.1, 0.6, 0.08, BEAM, 0, 0, false); // the brackets off the girder
  // the CNC cell's sprinkler branch off the main, ending over the drive platform's east lip
  const br = S3_COOP.branch;
  b.pipeH(br.x1, br.z, br.x0, br.z, br.y, PIPE);
  b.box(12.6, 4.85, br.z, 0.04, 0.3, 0.04, PIPE, 0, 0, false); // its end drop and sprinkler head

  // ---- lights
  for (const [x, y, z, radius, intensity, group, colour] of S3_LIGHT_PASS) {
    const sign = group === 58;
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
