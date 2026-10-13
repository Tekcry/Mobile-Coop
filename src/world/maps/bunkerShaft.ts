import type { LevelBuilder } from '../levelBuilder';
import type { P3 } from '../anchors';
import type { CourseDevice } from '../../game/course/courseDef';
import { wallXAt, wallZAt } from './storey';
import { pit, slabWithHoles } from './bunkerUpper';

/**
 * Fallow, the Plant level's shaft and reservoir (y 6): B3 The Intake, airlock A3, B4 The Cistern, airlock A4
 * (docs/training/BAYS.md sections 0, B3, B4). Every coordinate below is a BAYS local coordinate; `plantAt` / the
 * per-bay `X` / `Z` / `Y` add the bay's offset and floor (BAYS 0 table; A4's floor is the outlet platform, A32).
 *
 * Ledges (A25): `LevelBuilder.build` makes lips from box tops in absolute y, so every piece here is `noLedge` except
 * the lip pieces in `PLANT_LIPS`: B3's riser casing RC and the hoist landing G3 (the wall-jump lip), B4's walls W1 /
 * W2 and the outlet platform (the co-op lips, `BUNKER_COOP_LIPS`) and the Phase 5 overflow channel / float shaft.
 */

export const PLANT_Y = 6;

export type PlantBay = 'B3' | 'A3' | 'B4' | 'A4';

/** BAYS 0 offsets (x, z) and floor y of the shaft and reservoir bays (A4 at the outlet platform's height, A32). */
export const PLANT_OFFSET: Record<PlantBay, readonly [number, number, number]> = {
  B3: [84, 74, PLANT_Y],
  A3: [90, 68, PLANT_Y],
  B4: [82, 30, PLANT_Y],
  A4: [97, 24, PLANT_Y + 4.4],
};

/** World point from a bay's local (x, z, y above the bay's floor). */
export function plantAt(bay: PlantBay, x: number, z: number, y = 0): P3 {
  const o = PLANT_OFFSET[bay];
  return { x: x + o[0], y: o[2] + y, z: z + o[1] };
}

/** B3 metrics (BAYS B3 table and T0, local heights over the chamber floor). */
export const B3_METRICS = {
  g1: 10,
  g2: 14,
  g3: 17.4,
  /** The shaft walls stand to local 24 (y 30). */
  top: 24,
  /** RC: the casing (x 6..12, 1.2 deep) 1.6 m off the north wall, its top 4.3 over G1 (T0 split jump-up window). */
  casingTop: 4.3,
  slot: 1.6,
  /** The grated bridge steps down this far from the casing top to G2's level. */
  bridgeStep: 0.3,
  /** WJ: G3's front lip over G2. */
  wallJump: 3.4,
  /** PH: the damper bar over G3. */
  bar: 2.5,
  /** RP: rope from G3 to the chamber floor (T0: the rope bottom is the exit floor). */
  rope: 17.4,
  /** ZP: cable over G3 and its end over WP (T0: the body hangs 1.9 under the cable). */
  zipTop: 19.4,
  zipEnd: 4.5,
  wp: 2.6,
  fence: 2.4,
  /** The fan guard's hood over the pit (clear of a body flipping over the fence top). */
  hood: 4.6,
  windowSill: 3.0,
  windowHead: 4.5,
  netRC: 8,
  netWJ: 12,
  /** DU: 1.2 wide x 1.0 high, from the pit's south face (z 6.6) to the plant passage wall (z 2.45). */
  ductW: 1.2,
  ductH: 1.0,
} as const;

/** B4 metrics (BAYS B4, local heights over the cell floors). */
export const B4_METRICS = {
  wall: 4.4,
  /** W2 (A35): 4.25 over C2 / C3 so the human ladder's grip (`TEAM.ladderGrab` + 0.2) reaches it; 0.15 below the gallery. */
  w2: 4.25,
  wallThick: 1.0,
  gallery: 4.4,
  outlet: 4.4,
  overflow: 6.2,
  sump: -4,
  clear: 9,
} as const;

const OUTER = 0.45;
const PART = 0.3;
const DOOR_W = 1.2;
const DOOR_H = 2.1;
const ROOF_T = 0.3;
const RAIL_H = 1.1;
export const PLANT_AIRLOCK_CLEAR = 3.0;

const C = {
  wall: '#62676c',
  conc: '#6b6e70',
  floor: '#55595d',
  roof: '#45484b',
  steel: '#5b6168',
  grate: '#4d5358',
  rail: '#8a6a3a',
  net: '#3f4a3c',
  block: '#74787c',
  wood: '#7a5a3c',
  glass: '#5d7387',
  fan: '#3c4146',
  lock: '#b03a2e',
} as const;

/** A planned lip on the Plant level: its plan box (world, grown 5 cm), top (world y) and the floor it is measured from. */
export interface PlantLip {
  id: string;
  bay: PlantBay;
  box: [number, number, number, number];
  top: number;
  floor: number;
}

function lipBox(bay: PlantBay, id: string, x0: number, z0: number, x1: number, z1: number, top: number, floor = 0): PlantLip {
  const a = plantAt(bay, x0, z0);
  const e = plantAt(bay, x1, z1);
  return { id, bay, box: [a.x - 0.05, a.z - 0.05, e.x + 0.05, e.z + 0.05], top: a.y + top, floor: a.y + floor };
}

const M3 = B3_METRICS;
const M4 = B4_METRICS;

/** The co-op lips (level-design 11.3): out of solo reach, within the boost (W1, W2, the outlet platform). */
export const BUNKER_COOP_LIPS: readonly PlantLip[] = [
  lipBox('B4', 'W1', 0, 25, 32, 26, M4.wall),
  lipBox('B4', 'W2', 0, 12, 32, 13, M4.w2),
  lipBox('B4', 'OUT', 15, 0, 21, 2, M4.outlet),
];

/** Every lip on the shaft and reservoir (nothing else makes a ledge). */
export const PLANT_LIPS: readonly PlantLip[] = [
  lipBox('B3', 'RC', 6, 15.2, 12, 16.4, M3.g1 + M3.casingTop, M3.g1),
  lipBox('B3', 'G3', 12, 12, 18, 18, M3.g3, M3.g2),
  ...BUNKER_COOP_LIPS,
  lipBox('B4', 'OVF', 1.6, 1, 2.0, 8.5, M4.overflow),
  lipBox('B4', 'FLT', 2.6, 4, 4.4, 8.4, M4.overflow),
];

/** What the shaft builder hands back to the map. */
export interface ShaftResult {
  doors: Record<string, number>;
  devices: Record<string, CourseDevice>;
  anchors: Record<string, number>;
  debug: { id: string; label: string; pos: P3; yaw: number }[];
}

interface Frame {
  X: (x: number) => number;
  Z: (z: number) => number;
  Y: (y: number) => number;
}

function frame(bay: PlantBay): Frame {
  const o = PLANT_OFFSET[bay];
  return { X: (x) => x + o[0], Z: (z) => z + o[1], Y: (y) => y + o[2] };
}

/** Roof slab (visual, overhead: no nav blocker, no lip). */
function roof(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number): void {
  const from = b.boxes.length;
  b.box((x0 + x1) / 2, y + ROOF_T / 2, (z0 + z1) / 2, x1 - x0, ROOF_T, z1 - z0, C.roof);
  b.mark(from, { overhead: true, noLedge: true });
}

/** A deck slab (0.3) whose top is at y over a world rect. */
function deck(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number, color: string): void {
  b.box((x0 + x1) / 2, y - 0.15, (z0 + z1) / 2, x1 - x0, 0.3, z1 - z0, color);
}

/** A guard rail 1.1 high on a deck at y, along a world line (one 0.1 bar on the 5 cm voxel grid, collides). */
function rail(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number): void {
  if (Math.abs(x1 - x0) > Math.abs(z1 - z0)) b.box((x0 + x1) / 2, y + RAIL_H / 2, z0, Math.abs(x1 - x0), RAIL_H, 0.1, C.rail);
  else b.box(x0, y + RAIL_H / 2, (z0 + z1) / 2, 0.1, RAIL_H, Math.abs(z1 - z0), C.rail);
}

/**
 * A 2 m chamfer in an inside corner (cx, cz), the shaft on the (sx, sz) side: a block whose inner face is the
 * diagonal, deep enough to fill the corner triangle behind it.
 */
function chamfer(b: LevelBuilder, cx: number, cz: number, sx: number, sz: number, y: number, h: number): void {
  const t = 1.45;
  const ax = cx + sx * 2;
  const bz = cz + sz * 2;
  const n = Math.SQRT1_2;
  const mx = (ax + cx) / 2 - sx * n * (t / 2);
  const mz = (cz + bz) / 2 - sz * n * (t / 2);
  b.box(mx, y + h / 2, mz, t, h, 2 * Math.SQRT2, C.wall, Math.atan2(cx - ax, bz - cz));
}

/** A visual-only ladder with a padlocked hasp (B4 C1 / C2: training rig locked out of use, no anchor). */
function lockedLadder(b: LevelBuilder, x: number, z: number, y0: number, y1: number): void {
  for (const dz of [-0.25, 0.25]) b.box(x - 0.06, (y0 + y1) / 2, z + dz, 0.05, y1 - y0, 0.05, C.steel, 0, 0, false);
  for (let y = y0 + 0.3; y < y1; y += 0.3) b.box(x - 0.06, y, z, 0.035, 0.035, 0.5, C.steel, 0, 0, false);
  b.box(x - 0.12, y0 + 1.2, z, 0.08, 0.12, 0.08, C.lock, 0, 0, false);
}

// ---------------------------------------------------------------------------------------------------- B3 The Intake

function buildB3(b: LevelBuilder, lips: number[], r: ShaftResult): void {
  const { X, Z, Y } = frame('B3');
  const H = M3.top;
  // chamber floor (the bay box plus the outer walls), CR's floor
  b.floor(X(9.1125), Z(9.1125), 18.675, 18.675, C.floor, Y(0));
  // west wall (shared with A2, centred on x 0): lower to G1, upper with the A2 door onto G1 (z 9.4..10.6)
  wallZAt(b, X(0), Z(-0.225), Z(18.45), [], Y(0), M3.g1, C.wall, OUTER);
  wallZAt(b, X(0), Z(-0.225), Z(18.45), [[Z(9.4), Z(10.6)]], Y(M3.g1), H - M3.g1, C.wall, OUTER);
  b.box(X(0), Y(M3.g1 + (DOOR_H + H - M3.g1) / 2), Z(10), OUTER, H - M3.g1 - DOOR_H, DOOR_W, C.wall);
  // north wall: lower to G1, upper from G1 (its face and the casing's make the RC slot on the same floor)
  wallXAt(b, Z(18.225), X(-0.225), X(18.45), [], Y(0), M3.g1, C.wall, OUTER);
  wallXAt(b, Z(18.225), X(-0.225), X(18.45), [], Y(M3.g1), H - M3.g1, C.wall, OUTER);
  // south wall (shared with A3, centred on z 0): the A3 near door (x 8.4..9.6) from the plant passage
  wallXAt(b, Z(0), X(-0.225), X(18.45), [[X(8.4), X(9.6)]], Y(0), H, C.wall, OUTER);
  b.box(X(9), Y((DOOR_H + H) / 2), Z(0), DOOR_W, H - DOOR_H, OUTER, C.wall);
  // east wall, lower (to G3): CR's window (z 6.25..7.75, y 3.0..4.5) on the rope line and CR's door (z 8.4..9.6)
  const EW = 18.225;
  wallZAt(b, X(EW), Z(-0.225), Z(18.45), [[Z(6.25), Z(7.75)], [Z(8.4), Z(9.6)]], Y(0), M3.g3, C.wall, OUTER);
  b.box(X(EW), Y(M3.windowSill / 2), Z(7), OUTER, M3.windowSill, 1.5, C.wall);
  b.box(X(EW), Y((M3.windowHead + M3.g3) / 2), Z(7), OUTER, M3.g3 - M3.windowHead, 1.5, C.wall);
  b.box(X(EW), Y((DOOR_H + M3.g3) / 2), Z(9), OUTER, M3.g3 - DOOR_H, DOOR_W, C.wall);
  // east wall, upper: the hoist recess (x 18..19.6, z 5..13, floor at G3) set into it, open to the shaft; RP on its lip
  wallZAt(b, X(EW), Z(-0.225), Z(5), [], Y(M3.g3), H - M3.g3, C.wall, OUTER);
  wallZAt(b, X(EW), Z(13), Z(18.45), [], Y(M3.g3), H - M3.g3, C.wall, OUTER);
  wallZAt(b, X(19.825), Z(4.55), Z(13.45), [], Y(M3.g3), H - M3.g3, C.wall, OUTER);
  wallXAt(b, Z(4.775), X(18.45), X(19.6), [], Y(M3.g3), H - M3.g3, C.wall, OUTER);
  wallXAt(b, Z(13.225), X(18.45), X(19.6), [], Y(M3.g3), H - M3.g3, C.wall, OUTER);
  deck(b, X(18.45), Z(5), X(19.6), Z(13), Y(M3.g3), C.conc);
  // 2 m chamfered corners
  chamfer(b, X(0), Z(0), 1, 1, Y(0), H);
  chamfer(b, X(18), Z(0), -1, 1, Y(0), H);
  chamfer(b, X(0), Z(18), 1, -1, Y(0), H);
  chamfer(b, X(18), Z(18), -1, -1, Y(0), H);
  // the headframe roof
  roof(b, X(-0.225), Z(-0.225), X(20.05), Z(18.45), Y(H));

  // G1 (y 10): west arm (x 0..2.5, z 2..15.2) and north arm (x 0..12, z 15.2..18; under the casing too)
  deck(b, X(0), Z(2), X(2.5), Z(15.2), Y(M3.g1), C.grate);
  deck(b, X(0), Z(15.2), X(12), Z(18), Y(M3.g1), C.grate);
  // RC: the cable-riser casing on G1 (x 6..12, z 15.2..16.4), 4.3 tall: the 1.6 slot to the north wall
  lips.push(b.boxes.length);
  b.block(X(9), Z(15.8), 6, M3.casingTop, 1.2, C.conc, Y(M3.g1));
  // the grated bridge (x 10.8..12, z 9.5..15.2) 0.3 under the casing top, and G2 (x 12..18, z 9.5..12) at y 14
  deck(b, X(10.8), Z(9.5), X(12), Z(15.2), Y(M3.g2), C.grate);
  deck(b, X(12), Z(9.5), X(18), Z(12), Y(M3.g2), C.grate);
  // G3: the hoist landing (x 12..18, z 12..18, top 17.4) on a concrete mass over G2: its front (z 12) is WJ's
  // wall and lip, 3.4 over G2; the east wall makes the inside corner at (18, 12)
  lips.push(b.boxes.length);
  b.block(X(15), Z(15), 6, M3.g3 - M3.g2, 6, C.conc, Y(M3.g2));
  // guard rails 1.1, except at the move points (A2 door, PL head, net ladders, the slot mouth, the bridge step)
  rail(b, X(2.5), Z(2), X(2.5), Z(13), Y(M3.g1));
  rail(b, X(2.5), Z(14), X(2.5), Z(15.2), Y(M3.g1));
  rail(b, X(0), Z(2), X(2.5), Z(2), Y(M3.g1));
  rail(b, X(2.5), Z(15.2), X(5), Z(15.2), Y(M3.g1));
  rail(b, X(12), Z(16.4), X(12), Z(18), Y(M3.g1));
  rail(b, X(10.8), Z(9.5), X(10.8), Z(15.2), Y(M3.g2));
  rail(b, X(10.8), Z(9.5), X(13.7), Z(9.5), Y(M3.g2));
  rail(b, X(14.3), Z(9.5), X(18), Z(9.5), Y(M3.g2));
  // catch nets (grating floors) 2 m under the RC slot's front and under WJ, each with a net ladder back up
  b.box(X(8.5), Y(M3.netRC) - 0.05, Z(13.85), 7, 0.1, 2.7, C.net);
  b.ladder(X(5.5), Z(15.0), Y(M3.netRC), Y(M3.g1), 0);
  b.box(X(13.25), Y(M3.netWJ) - 0.05, Z(7.75), 4.5, 0.1, 3.5, C.net);
  b.ladder(X(14), Z(9.3), Y(M3.netWJ), Y(M3.g2), 0);
  // PL: the plant ladder, chamber floor to G1 (west arm's front)
  b.ladder(X(2.7), Z(13.5), Y(0), Y(M3.g1), -Math.PI / 2);
  // PH: the damper bar 2.5 over G3, out over the void to above G2 (x 15, z 13.5 -> 9.6)
  b.pipeH(X(15), Z(13.5), X(15), Z(9.6), Y(M3.g3 + M3.bar));
  // RP: the hoist rope down the east wall from the recess lip (normal -x), 17.4 to the chamber floor
  r.anchors['B3-rappel'] = b.rappel(X(18), Y(M3.g3), Z(7), -Math.PI / 2, M3.rope).id;
  // ZP: the spoil ropeway from just off G3's west edge (cable 2.0 over it, 0.4 out: the body clears the edge) to above WP (cable end 1.9 over WP's floor)
  r.anchors['B3-zipline'] = b.zipline({ x: X(11.6), y: Y(M3.zipTop), z: Z(16) }, { x: X(2), y: Y(M3.zipEnd), z: Z(2) }).id;
  // WP: the west platform (x 0..4, z 0..4, 2.6)
  b.block(X(2), Z(2), 4, M3.wp, 4, C.conc, Y(0));

  // CR: the fan control room outside the east wall (x 18.45..23, z 4..10), floor 0, 5.2 high
  b.floor(X(20.95), Z(7), 5.0, 6.9, C.floor, Y(0));
  wallZAt(b, X(23.225), Z(3.55), Z(10.45), [], Y(0), 5.2, C.wall, OUTER);
  wallXAt(b, Z(3.775), X(18.45), X(23.45), [], Y(0), 5.2, C.wall, OUTER);
  wallXAt(b, Z(10.225), X(18.45), X(23.45), [], Y(0), 5.2, C.wall, OUTER);
  roof(b, X(18.45), Z(3.55), X(23.45), Z(10.45), Y(5.2));
  b.windowAt(X(EW), Y((M3.windowSill + M3.windowHead) / 2), Z(7), 1.5, M3.windowHead - M3.windowSill, Math.PI / 2, { sill: Y(M3.windowSill), breakable: true });
  // CR's door onto the chamber floor: bolted, opened from inside CR (swings into CR)
  r.doors['B3-cr'] = b.door(X(EW), Y(0), Z(8.4), DOOR_W, 0, { locked: true, swing: 1 }).id;
  // the fan isolator (a switch: the fan stops, the pit is safe), a panel on CR's east wall
  r.devices['sw-isolator'] = { x: X(22.6), y: Y(0), z: Z(7), yaw: -Math.PI / 2, label: 'Fan isolator' };
  b.box(X(22.9), Y(1.4), Z(7), 0.15, 0.8, 0.6, C.steel, 0, 0, false);

  // FP: the fan pit (x 6..12, z 6..12) in a chain-link guard 2.4 high; a mesh hood over it at 4.6 (nothing drops in
  // from the zipline; a body flipping over the fence top passes under it); the fan housing in the north half
  const fs = [
    ['n', 12, 12, 6, 12],
    ['e', 12, 6, 12, 12],
    ['s', 6, 6, 12, 6],
    ['w', 6, 12, 6, 6],
  ] as const;
  for (const [id, ax, az, bx, bz] of fs) r.anchors[`B3-fence-${id}`] = b.fence(X(ax), Z(az), X(bx), Z(bz), M3.fence, Y(0)).id;
  b.box(X(9), Y(M3.hood + 0.05), Z(9), 8, 0.1, 8, C.grate);
  for (const [px, pz] of [[5.1, 5.1], [12.9, 5.1], [5.1, 12.9], [12.9, 12.9]] as const) b.box(X(px), Y(M3.hood / 2), Z(pz), 0.1, M3.hood, 0.1, C.steel, 0, 0, false);
  b.block(X(9), Z(9.75), 3, 1.2, 2.5, C.fan, Y(0));
  // DU: the discharge duct (1.2 x 1.0) from the pit's south face (entry grate, kicked or unscrewed) to the grille in
  // the plant passage wall (the exit opens itself, T0 Q6: one-way)
  const dz0 = 2.75;
  const dz1 = 6.6;
  b.box(X(8.35), Y(0.55), Z((dz0 + dz1) / 2), 0.1, 1.1, dz1 - dz0, C.steel);
  b.box(X(9.65), Y(0.55), Z((dz0 + dz1) / 2), 0.1, 1.1, dz1 - dz0, C.steel);
  b.box(X(9), Y(M3.ductH + 0.05), Z((dz0 + dz1) / 2), 1.4, 0.1, dz1 - dz0, C.steel);
  b.box(X(9), Y(0.5), Z(dz1), M3.ductW, M3.ductH, 0.04, C.grate, 0, 0, false);
  r.anchors['B3-duct'] = b.duct(
    [{ x: X(9), y: Y(0), z: Z(dz1) }, { x: X(9), y: Y(0), z: Z(2.45) }],
    { pos: { x: X(9), y: Y(0.5), z: Z(dz1) }, nx: 0, ny: 0, nz: 1, where: 'wall' },
    { pos: { x: X(9), y: Y(0.5), z: Z(2.45) }, nx: 0, ny: 0, nz: -1, where: 'wall' },
  ).id;
  // the plant passage (x 5..13, z 0..2.6, 3.0 high) before A3: its north wall carries the duct grille
  wallXAt(b, Z(2.6), X(5), X(13), [[X(8.4), X(9.6)]], Y(0), 3.0, C.wall, PART);
  b.box(X(9), Y((M3.ductH + 3.0) / 2), Z(2.6), M3.ductW, 3.0 - M3.ductH, PART, C.wall);
  b.box(X(9), Y(0.5), Z(2.43), M3.ductW, M3.ductH, 0.04, C.grate, 0, 0, false);
  wallZAt(b, X(5), Z(0.225), Z(2.75), [], Y(0), 3.0, C.wall, PART);
  wallZAt(b, X(13), Z(0.225), Z(2.75), [], Y(0), 3.0, C.wall, PART);
  roof(b, X(4.85), Z(0.225), X(13.15), Z(2.75), Y(3.0));

  r.debug.push(
    { id: 'B3', label: 'B3 The Intake (G1 at the A2 door)', pos: plantAt('B3', 1.5, 10, M3.g1), yaw: Math.PI / 2 },
    { id: 'B3-RC', label: 'B3 RC slot (split)', pos: plantAt('B3', 8.5, 17.2, M3.g1), yaw: Math.PI / 2 },
    { id: 'B3-G3', label: 'B3 G3 (zipline start)', pos: plantAt('B3', 12.6, 16.4, M3.g3), yaw: Math.atan2(-10, -14) },
    { id: 'B3-rope', label: 'B3 G3 hoist recess (rappel)', pos: plantAt('B3', 18.4, 7, M3.g3), yaw: -Math.PI / 2 },
    { id: 'B3-floor', label: 'B3 chamber floor (CR door)', pos: plantAt('B3', 16, 9, 0), yaw: Math.PI / 2 },
  );
}

// ---------------------------------------------------------------------------------------------------- airlocks

/** A3 / A4: 6 x 6 x 3.0 between two bays north and south; the north / south walls are the bays' (A4's south wall is
 *  B5's: A4 builds its stretch at the outlet height); W / E walls, bench, roof, the two locked blast doors in the bays' walls, Cycle panel. */
function buildAirlock(b: LevelBuilder, bay: 'A3' | 'A4', r: ShaftResult): void {
  const { X, Z, Y } = frame(bay);
  b.floor(X(3), Z(3), 6 + 2 * OUTER, 6, C.floor, Y(0));
  wallZAt(b, X(-OUTER / 2), Z(0), Z(6), [], Y(0), PLANT_AIRLOCK_CLEAR, C.wall, OUTER);
  wallZAt(b, X(6 + OUTER / 2), Z(0), Z(6), [], Y(0), PLANT_AIRLOCK_CLEAR, C.wall, OUTER);
  if (bay === 'A4') {
    // A4's stretch of B5's north wall (z 24; B5 fills below and above it, bunkerPlant): the far door at x 2.4..3.6
    wallXAt(b, Z(0), X(-OUTER), X(6 + OUTER), [[X(2.4), X(3.6)]], Y(0), PLANT_AIRLOCK_CLEAR, C.wall, OUTER);
    b.box(X(3), Y((DOOR_H + PLANT_AIRLOCK_CLEAR) / 2), Z(0), DOOR_W, PLANT_AIRLOCK_CLEAR - DOOR_H, OUTER, C.wall);
  }
  b.block(X(5.6), Z(3), 0.45, 0.45, 3, C.wood, Y(0));
  b.box(X(3.6) + 0.9, Y(1.5), Z(0) + 0.24, 0.6, 0.6, 0.04, C.glass, 0, 0, false);
  roof(b, X(-OUTER), Z(-0.225), X(6 + OUTER), Z(6.225), Y(PLANT_AIRLOCK_CLEAR));
  // doors 1.2 x 2.1 at local x 2.4..3.6: near (north, the bay left) and far (south), both swinging into the chamber
  r.doors[`${bay}-near`] = b.door(X(2.4), Y(0), Z(6), DOOR_W, Math.PI / 2, { locked: true, swing: 1 }).id;
  r.doors[`${bay}-far`] = b.door(X(2.4), Y(0), Z(0), DOOR_W, Math.PI / 2, { locked: true, swing: -1 }).id;
  r.devices[bay] = { x: X(0.4), y: Y(0), z: Z(3), yaw: Math.PI / 2 };
  r.debug.push({ id: bay, label: `${bay} airlock`, pos: plantAt(bay, 3, 3), yaw: Math.PI });
}

// ---------------------------------------------------------------------------------------------------- B4 The Cistern

/** The sump hole (world rect, B4 local x 26..32, z 2..8). */
const B4_SUMP: [number, number, number, number] = [26 + PLANT_OFFSET.B4[0], 2 + PLANT_OFFSET.B4[1], 32 + PLANT_OFFSET.B4[0], 8 + PLANT_OFFSET.B4[1]];

function buildB4(b: LevelBuilder, lips: number[], r: ShaftResult): void {
  const { X, Z, Y } = frame('B4');
  const H = M4.clear;
  slabWithHoles(b, X(-OUTER), Z(-0.225), X(36 + OUTER), Z(38.225), Y(0), [B4_SUMP], C.floor);
  // outer walls: west / east outside the bay box; north (A3) and south (A4) shared, centred on the line
  wallZAt(b, X(-OUTER / 2), Z(-0.225), Z(38.225), [], Y(0), H, C.wall, OUTER);
  wallZAt(b, X(36 + OUTER / 2), Z(-0.225), Z(38.225), [], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(38), X(-OUTER), X(36 + OUTER), [[X(10.4), X(11.6)]], Y(0), H, C.wall, OUTER);
  b.box(X(11), Y((DOOR_H + H) / 2), Z(38), DOOR_W, H - DOOR_H, OUTER, C.wall);
  // the south wall: A4's door at the outlet platform's height (x 17.4..18.6, y 4.4..6.5)
  wallXAt(b, Z(0), X(-OUTER), X(36 + OUTER), [[X(17.4), X(18.6)]], Y(0), H, C.wall, OUTER);
  b.box(X(18), Y(M4.outlet / 2), Z(0), DOOR_W, M4.outlet, OUTER, C.wall);
  b.box(X(18), Y((M4.outlet + DOOR_H + H) / 2), Z(0), DOOR_W, H - M4.outlet - DOOR_H, OUTER, C.wall);
  roof(b, X(-OUTER), Z(-0.225), X(36 + OUTER), Z(38.225), Y(H));
  // W1 (z 25..26, 4.4 high) and W2 (z 12..13, 4.25 high: A35), 1 m thick, walkable tops (co-op lips)
  const w1 = b.boxes.length;
  wallXAt(b, Z(25.5), X(0), X(32), [[X(14), X(15.2)]], Y(0), M4.wall, C.conc, M4.wallThick);
  b.box(X(14.6), Y((DOOR_H + M4.wall) / 2), Z(25.5), DOOR_W, M4.wall - DOOR_H, M4.wallThick, C.conc);
  wallXAt(b, Z(12.5), X(0), X(32), [[X(20), X(21.5)]], Y(0), M4.w2, C.conc, M4.wallThick);
  b.box(X(20.75), Y((DOOR_H + M4.w2) / 2), Z(12.5), 1.5, M4.w2 - DOOR_H, M4.wallThick, C.conc);
  for (let k = w1; k < b.boxes.length; k++) lips.push(k);
  // the inspection door in W1 (C2 face, swings into C2): bolted from C2; the sluice (1.5 wide) under W2 (C2 face)
  r.doors['B4-insp'] = b.door(X(14), Y(0), Z(25), DOOR_W, Math.PI / 2, { locked: true, swing: 1 }).id;
  r.doors['B4-sluice'] = b.door(X(20), Y(0), Z(13), 1.5, Math.PI / 2, { locked: true, swing: -1 }).id;
  // the valve gallery (x 32..36, top 4.4) along the east wall: no lip (cells cannot climb it), rails on its edge
  b.block(X(34), Z(19), 4, M4.gallery, 38, C.conc, Y(0));
  for (const [z0, z1] of [[0, 9.5], [10.5, 12], [13, 25], [26, 38]] as const) rail(b, X(32.05), Z(z0), X(32.05), Z(z1), Y(M4.gallery));
  // the W2 sluice handwheel on the gallery (a hold point) and C3's access ladder (unlocked) from the gallery
  r.devices['hold-sluice'] = { x: X(33.2), y: Y(M4.gallery), z: Z(12.5), yaw: -Math.PI / 2, label: 'Hold handwheel' };
  b.box(X(32.6), Y(M4.gallery + 1.0), Z(12.5), 0.08, 0.6, 0.6, C.steel, 0, 0, false);
  r.anchors['B4-c3-ladder'] = b.ladder(X(31.8), Z(10), Y(0), Y(M4.gallery), Math.PI / 2).id;
  // C1 / C2 access ladders: padlocked (visual only, no anchor)
  lockedLadder(b, X(32), Z(32), Y(0), Y(M4.gallery));
  lockedLadder(b, X(32), Z(19), Y(0), Y(M4.gallery));
  // Phase 5 elements in C3: the overflow channel (x 0..1.6, z 1..8.5 to a wall 6.2 high: a split; it ends 3.5 short of W2 so the split's jump-up finds no W2 lip), the float shaft (x 3..4,
  // 1.0 wide, 6.2), the sump (x 26..32, z 2..8, 4 deep) with a ladder out
  lips.push(b.boxes.length);
  b.block(X(1.8), Z(4.75), 0.4, M4.overflow, 7.5, C.conc, Y(0));
  for (const [cx, cz, w, d] of [[2.8, 6.2, 0.4, 4.4], [4.2, 6.2, 0.4, 4.4], [3.5, 8.2, 1.0, 0.4]] as const) {
    lips.push(b.boxes.length);
    b.block(X(cx), Z(cz), w, M4.overflow, d, C.conc, Y(0));
  }
  b.ladder(X(26.2), Z(5), Y(M4.sump), Y(0), -Math.PI / 2);
  // the outlet platform (x 15..21, z 0..2, 4.4) at A4's door; its fixed plant ladder (locked until the boost: the
  // top player lowers it, `sw-outlet-ladder`)
  lips.push(b.boxes.length);
  b.block(X(18), Z(1), 6, M4.outlet, 2, C.conc, Y(0));
  r.anchors['B4-outlet-ladder'] = b.ladder(X(16), Z(2.2), Y(0), Y(M4.outlet), Math.PI).id;
  r.devices['sw-outlet-ladder'] = { x: X(16.6), y: Y(M4.outlet), z: Z(1.2), yaw: 0, label: 'Lower ladder' };
  r.debug.push({ id: 'B4', label: 'B4 The Cistern (C1 at the A3 door)', pos: plantAt('B4', 11, 36), yaw: Math.PI });
}

/**
 * The sump's liners and floor, built after every other piece of the map (bunker.ts): its floor (top y 2) is a piece the
 * 'epic' detail pass dresses as floor, so the wall dressing before it draws the same random stream at 'ultra' and
 * 'epic' (detailPass test: ultra <= epic).
 */
export function buildShaftFloors(b: LevelBuilder): void {
  const from = b.boxes.length;
  pit(b, B4_SUMP, PLANT_Y, -M4.sump, C.conc);
  b.mark(from, { noLedge: true });
}

/**
 * Build the shaft and the reservoir into `b` (the sump last of all: `buildShaftFloors`). Returns doors (course ids -> anchor ids), course devices, course
 * anchors and the debug points. Afterwards every piece but the lip pieces is `noLedge`.
 */
export function buildShaft(b: LevelBuilder): ShaftResult {
  const r: ShaftResult = { doors: {}, devices: {}, anchors: {}, debug: [] };
  const from = b.boxes.length;
  const lips: number[] = [];
  buildB3(b, lips, r);
  buildAirlock(b, 'A3', r);
  buildB4(b, lips, r);
  buildAirlock(b, 'A4', r);
  const keep = new Set(lips);
  for (let k = from; k < b.boxes.length; k++) if (!keep.has(k)) b.boxes[k]!.noLedge = true;
  // one work lamp per bay (T6 lights the bays)
  b.light({ ...plantAt('B3', 9, 9, 12), radius: 30, intensity: 0.9 });
  b.light({ ...plantAt('B4', 16, 19, 7.5), radius: 30, intensity: 0.9 });
  return r;
}
