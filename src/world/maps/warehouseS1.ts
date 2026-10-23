import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import type { MapLayout } from '../mapDef';
import { makeCone } from '../lights';
import { addLampRooms, EXIT_GREEN, passLamps, type LampRoom } from './lampRooms';

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

const FLOOD = makeCone(0, -1, -0.25, 0.7);
/** The hall strips' beam optic (a 90 degree LED high-bay beam). */
const HALL = makeCone(0, -1, 0, Math.PI / 4);
/** A wall bulkhead's forward-down beam (35 degrees out from straight down, 55 degree half angle): facing -z (the facade, the walkway). */
const WALL_S = makeCone(0, -0.819, -0.574, 0.96);
// <lamps:S1>
/**
 * Section 1's lamps by room (sector-fixes L, Michael 2026-10-22: one height and a regular layout per room, nothing on the
 * roof or on a climbing pipe, LED fittings; the levels of warehouse-s23 M1 kept: `tests/warehouseS1Light.test.ts`). The
 * hall (the goods-in bay, the lobby-block roof, the plant deck and the workshop share the 5.8 roof): LED strips 0.22 under
 * it in grids over the bays (the bay and workshop with a 45 degree beam); the rooms: LED panels flush under their
 * ceilings; the facade: two floods at 5.0 over the shutters and door bulkheads at 3.3 (the drainpipe's 1.0 m east of the
 * pipe), on 0.3 m brackets with a forward-down beam; the crane walkway: bulkheads at 5.5 on the wall over it; no lamp on
 * the roof (it reads by the moon). Radius and intensity per fitting are tuned against the light tests' bands (sector-fixes
 * L); dead fittings (intensity 0) keep the grids regular over the dark pockets. (LR16-W) The night state: every fitting on
 * its LED night level (the photometric near field reads 3-7x a level 3 m away), routes in the pools' rim (0.4 - 0.55), work
 * areas in their own pool, pockets dark (`docs/sector-redesign/checks/lr16w-s1-build.md`). [x, z, radius, intensity].
 */
export const S1_LAMPS: readonly LampRoom[] = [
  // the facade (z -18, south face -18.15): the floods over shutters W and E (5.0), the drainpipe, entrance and workshop door lamps (3.3; LR16-W: 0.3 m up, a flatter pool over the doors)
  { id: 'facade', model: 'bulkhead', y: 5.0, group: 20, yaw: PI, cone: FLOOD, colour: [0.85, 0.9, 1], pass: true, lamps: [[-19, -18.45, 3.05, 0.3]] },
  { id: 'facade', model: 'bulkhead', y: 5.0, group: 20, yaw: PI, cone: FLOOD, colour: [0.85, 0.9, 1], pass: false, lamps: [[-11, -18.45, 7.5, 0]] },
  { id: 'facadeDoor', model: 'bulkhead', y: 3.3, group: 20, yaw: PI, cone: WALL_S, pass: true, lamps: [[-21.4, -18.45, 1.8, 0.281]] },
  { id: 'facadeDoor', model: 'bulkhead', y: 3.3, group: 20, yaw: PI, cone: WALL_S, pass: false, lamps: [[-5, -18.45, 5.59, 0.103], [11, -18.45, 5.97, 0.065]] },
  // the gatehouse door lamp (its north wall, z -22.6)
  { id: 'gatehouse', model: 'bulkhead', y: 2.3, group: 20, yaw: 0, pass: false, lamps: [[11.25, -22.3, 5.76, 0.225]] },
  // the hall: the goods-in bay (circuit 30), the lobby-block roof (31), the plant deck (34), the workshop (36); (LR16-W) the bay's
  // north row 0.6 m north (z -11.0, over the lane ends), the checker's desk strip (-22, -15.4) kept at full level (the bay's pool),
  // the workshop's middle column 0.6 m east (x 16.6, clear of the crane girder)
  { id: 'bay', model: 'strip', y: 5.58, group: 30, yaw: 0, cone: HALL, pass: true, lamps: [[-22, -15.4, 7.02, 0.7], [-18, -15.4, 6.78, 0.456], [-14, -15.4, 5.51, 0.428], [-10, -15.4, 5.05, 0.467], [-22, -11, 5.4, 0.608], [-18, -11, 4.8, 0.386], [-14, -11, 5.55, 0.572], [-10, -11, 8.8, 0.452]] },
  // (LR16-W) the lobby-block roof row 0.8 m north (z -6.6, by the z -6 wall): the roof walk (z -7.4 to -8.4) in its rim
  { id: 'lobbyRoof', model: 'strip', y: 5.58, group: 31, yaw: 0, pass: true, lamps: [[-22, -6.6, 6.09, 0.314], [-17, -6.6, 6.49, 0.305], [-12, -6.6, 1.5, 0.211], [-7, -6.6, 3.5, 0]] },
  // (LR16-W) the deck row over the plant side (z -16.9): the walk line (z -14.6 / -14.9) in its pool's rim
  { id: 'plantDeck', model: 'strip', y: 5.58, group: 34, yaw: 0, pass: true, lamps: [[-5, -16.9, 3.5, 0], [-1, -16.9, 3.5, 0], [4.2, -16.9, 5.19, 0.237], [7, -16.9, 3, 0.327]] },
  // the crane walkway (y 3 along the z -8.8 wall's south face): LED bulkheads at 5.5 on brackets, one every 7 m
  { id: 'walkway', model: 'bulkhead', y: 5.5, group: 36, yaw: PI, cone: WALL_S, pass: true, lamps: [[8.6, -9.25, 2.12, 0.063], [15.6, -9.25, 2.31, 0.052], [22.6, -9.25, 2.5, 0.06]] },
  { id: 'workshop', model: 'strip', y: 5.58, group: 36, yaw: 0, cone: HALL, pass: true, lamps: [[10.7, -15.8, 5.51, 0.482], [16.6, -15.8, 6.7, 0.639], [21.3, -15.8, 7.5, 0.632], [10.7, -11.8, 5.43, 0.686], [16.6, -11.8, 6.83, 0.613], [21.3, -11.8, 6.3, 0.792]] },
  // the lobby block (ceiling 3.0): the goods-in office, the fire lobby C2; the charging bay's sign on the z -6 wall (LR16dx: x -8,
  // between the parked forklift and the charger: at x -10.2 it hung 0.16 m off the forklift's back)
  { id: 'goodsInOffice', model: 'panel', y: 2.95, group: 31, yaw: 0, pass: false, lamps: [[-20.25, -7.4, 4, 0]] },
  // (LR16-W) the fire lobby: two panels along its east side, one by each door, off the door axis (a flat pool over the route)
  { id: 'lobby', model: 'panel', y: 2.95, group: 31, yaw: 0, pass: true, lamps: [[-13.1, -8, 6, 0.087], [-13.1, -7, 6, 0.11]] },
  { id: 'charging', model: 'bulkhead', y: 2.4, group: 31, yaw: PI, colour: EXIT_GREEN, pass: false, lamps: [[-8, -6.24, 0.6, 0.15]] },
  // the office block: the south rooms (ceiling 3.0 under the plant deck), the corridor and the mess (2.8 under the void), the void (4.6)
  // (LR16-W) the reception row over the counter's back edge (z -15.1), both panels on their night level
  { id: 'reception', model: 'panel', y: 2.95, group: 33, yaw: 0, pass: true, lamps: [[-6.5, -15.1, 5, 0.114]] },
  { id: 'reception', model: 'panel', y: 2.95, group: 33, yaw: 0, pass: true, lamps: [[-3.5, -15.1, 5, 0.113]] },
  { id: 'security', model: 'panel', y: 2.95, group: 34, yaw: 0, pass: false, lamps: [[4.3, -15.9, 4.42, 0.138], [6.7, -15.9, 2.18, 0.037]] },
  { id: 'corridor', model: 'panel', y: 2.75, group: 32, yaw: 0, pass: true, lamps: [[-6.8, -12.3, 3.46, 0.064], [-3.4, -12.3, 5.82, 0.091], [0, -12.3, 2.84, 0.041], [3.4, -12.3, 2.45, 0.163], [6.8, -12.3, 4, 0]] },
  // (LR16-W) the mess panel over the kitchenette end (x 6.0): the kettle end (x 2.6, under hatch h2) in its rim
  { id: 'mess', model: 'panel', y: 2.75, group: 35, yaw: 0, pass: false, lamps: [[6, -9.8, 4.14, 0.773]] },
  // (LR16-W) the void: the north row 1.0 m south (z -11.0) and the east column on x 7.3, three panels lit 1.1 - 1.7 m off the openings
  { id: 'void', model: 'panel', y: 4.55, group: 32, yaw: 0, pass: true, lamps: [[-5.3, -12.3, 2.53, 0], [-1.1, -12.3, 2.8, 0], [3.1, -12.3, 2.8, 0], [7.3, -12.3, 2.8, 0], [-5.3, -11, 2.8, 0.222], [-1.1, -11, 2.8, 0], [3.1, -11, 2.8, 0.175], [7.3, -11, 2.8, 0.257]] },
  // the workshop door's exit sign (the facade's inside face; LR16-W: a local glow, radius 0.6 as S2's signs)
  { id: 'workshop', model: 'bulkhead', y: 2.4, group: 36, yaw: 0, colour: EXIT_GREEN, pass: false, lamps: [[11, -17.76, 0.6, 0.06]] },
];

/** The section's lamp pass (the light test switches these off to compare): the pass rooms' lit lamps. */
export const S1_LIGHT_PASS = passLamps(S1_LAMPS);
// </lamps:S1>

/** Light switches (circuits 30, 32, 34: the bay lane, the corridor, the security office). */
export const S1_SWITCHES: NonNullable<MapLayout['switches']> = [
  { pos: new Vector3(-23.85, 0, -12.0), yaw: PI / 2, group: 30 },
  { pos: new Vector3(-7.85, 0, -13.3), yaw: PI / 2, group: 32 },
  { pos: new Vector3(3.15, 0, -14.3), yaw: PI / 2, group: 34 },
];

export const S1_PICKUPS: NonNullable<MapLayout['pickups']> = [];

export const S1_HIDESPOTS: NonNullable<MapLayout['hideSpots']> = [{ pos: new Vector3(-21.3, 0, -21.5) }, { pos: new Vector3(-6.0, 0, -7.2) }];

/**
 * (sector-fixes R1) Section 1's co-op-only routes (docs/sector-fixes/r/R1.md). Lips at 4.4 m over the floor they start
 * from: out of a solo wall jump (`WALL_JUMP.maxUp` 3.8 + 0.5), inside the leg-up (`TEAM.boostMax` 4.5).
 * - `plantDoor`: the AHU's service door high in the facade over the yard (its hoist platform is gone). Sill top 4.4 over
 *   the yard, 0.8 deep (z0..z1), the eaves notched over it under a weather hood (underside 6.3) so a climb-up stands
 *   (`MOVEMENT.standHeight` 1.75 over the sill); inside it steps down 1.1 m onto the plant deck's west part (3.3): the void opening, hatches h1 / h2, the pallet gate. Way down alone: hang off
 *   the sill and drop to the yard, or the deck's ladders / the pallet gate; up to the roof: the notch's 6.0 lips.
 * - `hoist`: the goods-in monorail (the hoist beam off shutter E into the east lane), a hand-over-hand pipe at 4.4 from
 *   the shutter head to over the checker's east-lane stop (a drop takedown); it passes 0.6 m under the bay main (5.0, z
 *   -17.0), which runs east to the plant deck (a solo way on from the deck, planned: A2). (sector-fixes-r fix) The east
 *   lane's two loads 1.3 m north of its end are stacked `laneStack` (2.0) high, `noLedge`: over the mantle (1.8) with
 *   nothing to grab, no one alone stands on them (their old 1.8 tops were in a top-gear running jump's reach of the pipe:
 *   the in-air grab, `FALL_GRAB`, tests/helpers/soloJumpReach.ts). (sector-fixes-r e2e fix) The single load north of
 *   them is now an empty pallet (`lanePallet` 0.15): at 1.0 (1.2 m from the stacks' face) a running jump off it rode the
 *   capsule up over the stacks' 2.0 edge (e2e: stood at 2.06; the apex 1.87 was 0.13 under it, inside the controller's
 *   step, `MOVEMENT.maxStep` 0.42) and a mantle from its edge reached their top (1.0 up, 1.2 across, inside the probe's
 *   1.3). Off 0.15 the apex is 1.02 and the stacks are 1.85 up, over the mantle (1.8). It stays 3.5 m off the pipe's end.
 *   Way down: let go (the hands stop 0.45 m short of the pipe's ends, `attachRange`: at z -16.05, 0.7 m from the
 *   checker's stop, inside the drop takedown's 1.0).
 */
export const S1_COOP = {
  plantDoor: { x0: -3.2, x1: -2.0, z0: -18.15, z1: -17.35, sill: 4.4, deck: 3.3 },
  hoist: { x: -11.0, z0: -17.5, z1: -15.6, y: 4.4, laneStack: 2.0, lanePallet: 0.15 },
} as const;

/** (sector-fixes R1) The mess's back door into the workshop (x 8, z -10.6 to -9.4), bolted from the mess side. */
const MESS_DOOR = { x: 8, hinge: -10.6, w: 1.2 } as const;

/**
 * (sector-fixes R1, team-door contract in docs/sector-fixes/r/PLAN.md) Doors bolted from one side: the plan centre and the
 * unit direction from the door toward the side that can unbolt it. The mess back door: the mess (x < 8) unbolts it for a
 * partner waiting in the workshop under the catwalk (past the office patrol's turn at the corridor's east door).
 */
export const S1_BOLTS: readonly { at: [number, number]; side: [number, number] }[] = [{ at: [MESS_DOOR.x, MESS_DOOR.hinge + MESS_DOOR.w / 2], side: [-1, 0] }];

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
  const pd = S1_COOP.plantDoor;
  wallX(-18, -24, 24, [[-21, -17], [-13, -9], [-5.6, -4.4], [pd.x0, pd.x1], [0.6, 1.8], [5.4, 6.6], [10.4, 11.6], [13, 17]], 6.0, WALL_DARK);
  // (R1) the plant-room service door: the facade under it to the deck slab, the sill (deck slab to 4.4, 0.8 deep: the
  // co-op lip over the yard); over it the eaves are notched (the roof hole below) under a weather hood at 6.3
  b.box((pd.x0 + pd.x1) / 2, 1.5, -18, pd.x1 - pd.x0, 3.0, T, WALL_DARK);
  b.box((pd.x0 + pd.x1) / 2, (3.0 + pd.sill) / 2, (pd.z0 + pd.z1) / 2, pd.x1 - pd.x0, pd.sill - 3.0, pd.z1 - pd.z0, STEEL);
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
  wallZ(8, -13.8, -8.8, [[-12.9, -11.7], [MESS_DOOR.hinge, MESS_DOOR.hinge + MESS_DOOR.w]], 2.8);
  lintel(b, 8, 2.45, -12.3, T, 0.7, 1.2);
  lintel(b, MESS_DOOR.x, 2.45, MESS_DOOR.hinge + MESS_DOOR.w / 2, T, 0.7, MESS_DOOR.w); // (R1) the mess back door's head
  b.box(-8, 3.8, -11.3, T, 2.0, 5.0, WALL); // void west wall
  // void east wall with the catwalk opening z -10.0 to -8.95 (y 3.0 - 4.6); (lr16fix2) its south jamb 0.15 m in from the
  // catwalk's south edge: the corner where the deck edge met the wall end let a floor eye (x 21.6 - 23.6, z -13.2 - -13.6)
  // see panel-workshop over the sill (tests/laserPanels.test.ts "hidden from the floor")
  b.box(8, 3.8, -11.9, T, 2.0, 3.8, WALL);
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
  // (R1) the team door: the mess's back door into the workshop, bolted from the mess side (S1_BOLTS)
  b.door(MESS_DOOR.x, 0, MESS_DOOR.hinge, MESS_DOOR.w, 0, { swing: -1, locked: true, breachable: false });

  // ---- roof (top 6.0): the lobby-block part with the smoke vent, the main part with the roof hatch; parapets, gables
  const roof0 = b.boxes.length;
  plate(b, -24, -4, -18.15, -6.15, 6.0, 0.2, [[-20.6, -19.4, -8.0, -6.8]], ROOF);
  plate(b, -4, 24, -18.15, -8.95, 6.0, 0.2, [[4.5, 5.5, -14.8, -14.0], [pd.x0, pd.x1, pd.z0, pd.z1]], ROOF);
  over(roof0);
  // (R1) the service door's weather hood over the eaves notch: high enough for a climb-up to stand on the sill
  const hood0 = b.boxes.length;
  b.box((pd.x0 + pd.x1) / 2, 6.375, (pd.z0 + pd.z1) / 2, pd.x1 - pd.x0, 0.15, pd.z1 - pd.z0, ROOF);
  b.mark(hood0, { overhead: true, noLedge: true });
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
  const ho = S1_COOP.hoist;
  b.pipeH(ho.x, ho.z0, ho.x, ho.z1, ho.y, BEAM, 0.08); // (R1) the goods-in hoist monorail: leg-up onto it (4.4)
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
  // the E lane: (sector-fixes-r fix) the two loads by the monorail are stacked `laneStack` (2.0) high without lips: over
  // the mantle, nothing to grab, so no one alone stands on them (a 1.8 top was in a running jump's reach of the pipe);
  // they still screen the checker's stop from the forklift lane (M8). The single pallet (1.2 -> 1.0 -> (sector-fixes-r e2e
  // fix) an empty pallet, `lanePallet` 0.15: off 1.0 a running jump rode up over the stacks' edge and a mantle reached
  // their top) is 3.5 m off the monorail's end.
  const ls = b.boxes.length;
  b.block(-12.0, -13.8, 1.2, S1_COOP.hoist.laneStack, 1.0, CRATE).block(-10.8, -13.8, 1.2, S1_COOP.hoist.laneStack, 1.0, CRATE);
  b.mark(ls, { noLedge: true });
  b.block(-11.4, -11.6, 1.2, S1_COOP.hoist.lanePallet, 1.0, CRATE);
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

  // ---- lights (sector-fixes L: by room, `S1_LAMPS`; circuit 20 outside, 30 - 36 inside)
  b.ambientZone(-8, 8, -13.8, -8.8, 0.05, 2.95, 4.65); // the void
  addLampRooms(b, S1_LAMPS);
}
