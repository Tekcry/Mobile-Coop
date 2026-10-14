import type { LevelBuilder } from '../levelBuilder';
import type { Door, Ledge, P3 } from '../anchors';
import type { CourseDevice } from '../../game/course/courseDef';
import { wallXAt, wallZAt, windowZ } from './storey';

/**
 * Fallow, the Upper level (y 16): B1 Muster, airlock A1, B2 The Lanes, airlock A2 (docs/training/BAYS.md sections 0,
 * B1, B2). Every coordinate below is a BAYS local coordinate; `at` / `wx` / `wz` add the bay's offset (BAYS 0 table).
 * Lane S mirrors Lane N in z (`lz`) with the ladder and the downpipe swapped (items 4 and 9).
 *
 * Ledges: `LevelBuilder.build` generates lips from box tops in absolute y (a piece resting on y 16 is not "on the
 * ground", so even a 0.5 m plinth would make one): every Upper piece is `noLedge` except the lip pieces listed in
 * `BUNKER_LIPS` (the galleries G1 / G2 and the platform P); the beam ledges L1 / L2 are manual `ledge` anchors.
 */

export const UPPER_Y = 16;

export type UpperBay = 'B1' | 'A1' | 'B2' | 'A2';

/** BAYS 0 offsets (x, z) of the Upper bays. */
export const UPPER_OFFSET: Record<UpperBay, readonly [number, number]> = {
  B1: [0, 72],
  A1: [24, 81],
  B2: [30, 66],
  A2: [78, 81],
};

/** World point from a bay's local (x, z, y above the Upper floor). */
export function at(bay: UpperBay, x: number, z: number, y = 0): P3 {
  const o = UPPER_OFFSET[bay];
  return { x: x + o[0], y: UPPER_Y + y, z: z + o[1] };
}
const wx = (bay: UpperBay, x: number): number => x + UPPER_OFFSET[bay][0];
const wz = (bay: UpperBay, z: number): number => z + UPPER_OFFSET[bay][1];

/** Lane mirror: Lane N uses BAYS z as given, Lane S mirrors it on the hall's centre line (z 18). */
type Lane = 'N' | 'S';
const lz = (lane: Lane, z: number): number => (lane === 'N' ? z : 36 - z);

/** Heights above the Upper floor. */
export const B1_CLEAR = 3.2;
export const B2_CLEAR = 12;
export const AIRLOCK_CLEAR = 3.0;
const OUTER = 0.45;
const PART = 0.2;
const CROSS = 0.3;
/** Item 13's cross wall (BAYS x 44, moved 0.2 east: 2.05 m off P's east face, wider than a split gap). */
const CROSS_E = 44.2;
const ROOF_T = 0.3;
const DOOR_W = 1.2;
const DOOR_H = 2.1;
/** L2 (BAYS item 11), 0.4 deep: its west end 1.8 past the stub's east end, so the hands are 2.2 apart (`gap`). */
const L2_X0 = 37.85;
const L2_X1 = 38.45;
/** Lane S item 9: the ladder-head landing (x 30.2..31.0, z 35.0..36 against the wall, top at the beam). */
const HEAD_X0 = 30.2;
const HEAD_X1 = 31.0;
const HEAD_Z = 35.0;

/** B2 metrics (BAYS B2 table, local heights). */
export const B2_METRICS = {
  step: 0.5,
  vault: 1.1,
  vaultThick: 0.3,
  mantle: 1.7,
  gallery: 4.0,
  pipe: 6.5,
  beam: 4.5,
  /** L1: a 0.25 m crane-rail beam (hang only). */
  l1Depth: 0.25,
  /** L2: 0.4 deep (climb up). */
  l2Depth: 0.4,
  /** Item 11: hand to hand, the stub's grip to L2's nearest grip (the lip ends are 1.8 apart: edge margins). */
  gap: 2.2,
  platform: 4.5,
  /** Drop pads under P's east edge (tops) and the pit floor. */
  padSoft: 2.5,
  padRoll: 1.3,
  pit: -0.5,
  trenchWidth: 1.2,
  trenchDepth: 1.5,
  sill: 0.9,
} as const;

const C = {
  wall: '#62676c',
  part: '#7a7d80',
  floor: '#55595d',
  roof: '#45484b',
  plinth: '#6f6a62',
  rail: '#8a6a3a',
  block: '#74787c',
  steel: '#5b6168',
  beam: '#6a5f52',
  pad: '#4f6a57',
  locker: '#56606a',
  wood: '#7a5a3c',
  glass: '#5d7387',
  mark: '#c9b458',
} as const;

/** A planned lip: the plan box its generated or manual ledges lie in (world), its top (world y), and which piece. */
export interface BunkerLip {
  id: string;
  bay: UpperBay;
  box: [number, number, number, number];
  top: number;
}

function lipBox(bay: UpperBay, x0: number, z0: number, x1: number, z1: number): [number, number, number, number] {
  return [wx(bay, Math.min(x0, x1)), wz(bay, Math.min(z0, z1)), wx(bay, Math.max(x0, x1)), wz(bay, Math.max(z0, z1))];
}

function laneLips(lane: Lane): BunkerLip[] {
  const M = B2_METRICS;
  // plan box from BAYS local corners, grown by 5 cm
  const box = (x0: number, z0: number, x1: number, z1: number): [number, number, number, number] => {
    const r = lipBox('B2', x0, lz(lane, z0), x1, lz(lane, z1));
    return [r[0] - 0.05, r[1] - 0.05, r[2] + 0.05, r[3] + 0.05];
  };
  return [
    { id: `G1${lane}`, bay: 'B2', box: box(13, 34.5, 17, 36), top: UPPER_Y + M.gallery },
    { id: `G2${lane}`, bay: 'B2', box: box(21, 34.5, 23, 36), top: UPPER_Y + M.gallery },
    { id: `L1${lane}`, bay: 'B2', box: box(31, 34.75, 36.05, 35.75), top: UPPER_Y + M.beam },
    { id: `L2${lane}`, bay: 'B2', box: box(L2_X0, 35.6, L2_X1, 35.6), top: UPPER_Y + M.beam },
    { id: `P${lane}`, bay: 'B2', box: box(L2_X1, 32, 42, 36), top: UPPER_Y + M.platform },
    // Lane S only: the ladder-head landing's lip (item 9), hang only, chained into L1
    ...(lane === 'S' ? [{ id: 'LHS', bay: 'B2' as const, box: box(HEAD_X0, HEAD_Z, HEAD_X1, 35.75), top: UPPER_Y + M.beam }] : []),
  ];
}

/** Every lip on the Upper level (B1 has none: one floor, no verticality). Nothing else above 1.9 m makes a ledge. */
export const BUNKER_LIPS: readonly BunkerLip[] = [...laneLips('N'), ...laneLips('S')];

/** What the Upper builder hands back to the map. */
export interface UpperResult {
  doors: Record<string, number>;
  devices: Record<string, CourseDevice>;
  spawns: { pos: P3; yaw: number }[];
  debug: { id: string; label: string; pos: P3; yaw: number }[];
}

/** A floor slab over a world rect with rectangular holes (world rects), top at y. */
export function slabWithHoles(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number, holes: readonly (readonly [number, number, number, number])[], color: string): void {
  const xs = [x0, x1];
  const zs = [z0, z1];
  for (const h of holes) {
    xs.push(h[0], h[2]);
    zs.push(h[1], h[3]);
  }
  const ux = [...new Set(xs)].filter((v) => v >= x0 && v <= x1).sort((p, q) => p - q);
  const uz = [...new Set(zs)].filter((v) => v >= z0 && v <= z1).sort((p, q) => p - q);
  for (let i = 0; i + 1 < ux.length; i++) {
    const ax = ux[i]!;
    const bx = ux[i + 1]!;
    const mx = (ax + bx) / 2;
    // merge the solid cells of this x strip along z
    let run = -1;
    for (let j = 0; j < uz.length; j++) {
      const mz = j + 1 < uz.length ? (uz[j]! + uz[j + 1]!) / 2 : NaN;
      const solid = j + 1 < uz.length && !holes.some((h) => mx > h[0] && mx < h[2] && mz > h[1] && mz < h[3]);
      if (solid && run < 0) run = j;
      if (!solid && run >= 0) {
        const za = uz[run]!;
        const zb = uz[j]!;
        b.floor(mx, (za + zb) / 2, bx - ax, zb - za, color, y);
        run = -1;
      }
    }
  }
}

/** A sunken pit under a slab hole (world rect): liners round it down to `depth` below y, and its floor. */
export function pit(b: LevelBuilder, h: readonly [number, number, number, number], y: number, depth: number, color: string): void {
  const [x0, z0, x1, z1] = h;
  const t = 0.2;
  b.box((x0 + x1) / 2, y - depth / 2, z0 - t / 2, x1 - x0 + 2 * t, depth, t, color);
  b.box((x0 + x1) / 2, y - depth / 2, z1 + t / 2, x1 - x0 + 2 * t, depth, t, color);
  b.box(x0 - t / 2, y - depth / 2, (z0 + z1) / 2, t, depth, z1 - z0, color);
  b.box(x1 + t / 2, y - depth / 2, (z0 + z1) / 2, t, depth, z1 - z0, color);
  b.floor((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 + 2 * t, z1 - z0 + 2 * t, color, y - depth, 0.3);
}

/** A lintel over a door gap in a wall along Z (x, gap z0..z1) up to the wall top. */
function headerZ(b: LevelBuilder, x: number, z0: number, z1: number, y: number, h: number, thick: number, color: string): void {
  b.box(x, y + (DOOR_H + h) / 2, (z0 + z1) / 2, thick, h - DOOR_H, z1 - z0, color);
}
function headerX(b: LevelBuilder, z: number, x0: number, x1: number, y: number, h: number, thick: number, color: string): void {
  b.box((x0 + x1) / 2, y + (DOOR_H + h) / 2, z, x1 - x0, h - DOOR_H, thick, color);
}

/** Roof slab (visual, overhead: no nav blocker, no lip). */
function roof(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number): void {
  const from = b.boxes.length;
  b.box((x0 + x1) / 2, y + ROOF_T / 2, (z0 + z1) / 2, x1 - x0, ROOF_T, z1 - z0, C.roof);
  b.mark(from, { overhead: true, noLedge: true });
}

function link(chain: Ledge[], mirrored: boolean): void {
  for (let i = 0; i + 1 < chain.length; i++) {
    const cur = chain[i]!;
    const next = chain[i + 1]!;
    if (mirrored) {
      cur.nextA = next.id;
      next.nextB = cur.id;
    } else {
      cur.nextB = next.id;
      next.nextA = cur.id;
    }
  }
}

// ---------------------------------------------------------------------------------------------------- B1 Muster

function buildB1(b: LevelBuilder, r: UpperResult): void {
  const y = UPPER_Y;
  const H = B1_CLEAR;
  const X = (x: number): number => wx('B1', x);
  const Z = (z: number): number => wz('B1', z);
  b.floor(X(12), Z(12), 24 + 2 * OUTER, 24 + 2 * OUTER, C.floor, y);
  // perimeter (0.45, outside the bay box); the east wall is shared with A1 (centred on x 24, the A1 door gap)
  wallXAt(b, Z(-OUTER / 2), X(-OUTER), X(24 + OUTER), [], y, H, C.wall, OUTER);
  wallXAt(b, Z(24 + OUTER / 2), X(-OUTER), X(24 + OUTER), [], y, H, C.wall, OUTER);
  wallZAt(b, X(-OUTER / 2), Z(0), Z(24), [], y, H, C.wall, OUTER);
  wallZAt(b, X(24), Z(0), Z(24), [[Z(11.4), Z(12.6)]], y, H, C.wall, OUTER);
  headerZ(b, X(24), Z(11.4), Z(12.6), y, H, OUTER, C.wall);
  // partitions (0.2): x 6 (lobby | briefing, kit room; open to the corridor), lobby south / north, x 18
  wallZAt(b, X(6), Z(0), Z(24), [[Z(10.8), Z(13.2)]], y, H, C.part, PART);
  wallXAt(b, Z(8), X(0), X(6), [], y, H, C.part, PART);
  wallXAt(b, Z(16), X(0), X(6), [], y, H, C.part, PART);
  wallZAt(b, X(18), Z(0), Z(10.8), [], y, H, C.part, PART);
  wallZAt(b, X(18), Z(13.2), Z(24), [], y, H, C.part, PART);
  // corridor north wall: kit room door (x 7.0..8.2), store door (x 19.5..20.7)
  wallXAt(b, Z(13.2), X(6), X(24), [[X(7), X(8.2)], [X(19.5), X(20.7)]], y, H, C.part, PART);
  headerX(b, Z(13.2), X(7), X(8.2), y, H, PART, C.part);
  headerX(b, Z(13.2), X(19.5), X(20.7), y, H, PART, C.part);
  // corridor south wall: the briefing room's glass wall (x 6..16), its door (x 16..17.2), solid to x 24
  b.box(X(11), y + 0.45, Z(10.8), 10, 0.9, PART, C.part);
  headerX(b, Z(10.8), X(6), X(16), y, H, PART, C.part);
  b.box(X(11), y + 1.5, Z(10.8), 10, 1.2, PART, C.glass);
  wallXAt(b, Z(10.8), X(17.2), X(24), [], y, H, C.part, PART);
  headerX(b, Z(10.8), X(16), X(17.2), y, H, PART, C.part);
  const kit = b.door(X(7), y, Z(13.2), DOOR_W, Math.PI / 2);
  const store = b.door(X(19.5), y, Z(13.2), DOOR_W, Math.PI / 2);
  const brief = b.door(X(16), y, Z(10.8), DOOR_W, Math.PI / 2);
  r.doors['B1-kit'] = kit.id;
  r.doors['B1-store'] = store.id;
  r.doors['B1-brief'] = brief.id;
  // lift lobby: the surface lift's closed doors on the west wall (visual)
  b.box(X(0.05), y + 1.1, Z(12), 0.1, 2.2, 2.0, C.steel, 0, 0, false);
  // kit room: two operator lockers (north wall), bench 0.45 (x 9..15, z 18..18.5), weapon rack (east wall)
  b.box(X(8.0), y + 1.0, Z(23.7), 0.6, 2.0, 0.6, C.locker);
  b.box(X(8.7), y + 1.0, Z(23.7), 0.6, 2.0, 0.6, C.locker);
  b.block(X(12), Z(18.25), 6, 0.45, 0.5, C.wood, y);
  b.box(X(17.7), y + 0.9, Z(19), 0.4, 1.8, 2.4, C.steel);
  // (the padded strike post is a TrainingDummy placed by the course data, T7a)
  // briefing room: map table 0.9 (x 9..15, z 3..7), screen on the south wall (visual)
  b.block(X(12), Z(5), 6, 0.9, 4, C.wood, y);
  b.box(X(12), y + 1.8, Z(0.08), 3.2, 1.6, 0.06, '#202428', 0, 0, false);
  // dark store: shelving 2.0 along the north, east and west walls
  b.box(X(21), y + 1.0, Z(23.6), 5.6, 2.0, 0.6, C.steel);
  b.box(X(23.45), y + 1.0, Z(18.5), 0.6, 2.0, 7.0, C.steel);
  b.box(X(18.4), y + 1.0, Z(19.5), 0.6, 2.0, 5.0, C.steel);
  // corridor floor marks every 3 m (gear run; visual)
  for (let x = 9; x <= 21; x += 3) b.box(X(x), y + 0.01, Z(12), 0.08, 0.02, 2.2, C.mark, 0, 0, false);
  roof(b, X(-OUTER), Z(-OUTER), X(24 + OUTER), Z(24 + OUTER), y + H);
  r.spawns.push({ pos: at('B1', 2, 12), yaw: Math.PI / 2 }, { pos: at('B1', 4, 12), yaw: Math.PI / 2 });
  r.debug.push({ id: 'B1', label: 'B1 Muster (corridor west end)', pos: at('B1', 7, 12), yaw: Math.PI / 2 });
}

// ---------------------------------------------------------------------------------------------------- airlocks

/** A1 / A2 (BAYS 0): 6 x 6 x 3.0; the west and east walls are the bays' (built there); N / S walls, bench, roof,
 *  two locked blast doors (the course unlocks them), a vision slot beside the far door (visual). */
function buildAirlock(b: LevelBuilder, bay: 'A1' | 'A2', r: UpperResult): void {
  const y = UPPER_Y;
  const X = (x: number): number => wx(bay, x);
  const Z = (z: number): number => wz(bay, z);
  b.floor(X(3), Z(3), 6, 6 + 2 * OUTER, C.floor, y);
  // (A2's east wall at x 84, the far door's wall, is B3's west wall: bunkerShaft.ts builds it)
  wallXAt(b, Z(-OUTER / 2), X(0), X(6), [], y, AIRLOCK_CLEAR, C.wall, OUTER);
  wallXAt(b, Z(6 + OUTER / 2), X(0), X(6), [], y, AIRLOCK_CLEAR, C.wall, OUTER);
  // bench on the north wall
  b.block(X(3), Z(5.6), 3, 0.45, 0.45, C.wood, y);
  // vision slot beside the far door (glazed, visual only)
  b.box(X(6) - 0.24, y + 1.5, Z(3) + 0.9, 0.04, 0.6, 0.15, C.glass, 0, 0, false);
  roof(b, X(-0.225), Z(-OUTER), X(6.225), Z(6 + OUTER), y + AIRLOCK_CLEAR);
  // doors 1.2 x 2.1 in the bays' walls at local z 2.4..3.6, swinging into the chamber
  const near: Door = b.door(X(0), y, Z(2.4), DOOR_W, 0, { locked: true, swing: 1 });
  const far: Door = b.door(X(6), y, Z(2.4), DOOR_W, 0, { locked: true, swing: -1 });
  r.doors[`${bay}-near`] = near.id;
  r.doors[`${bay}-far`] = far.id;
  r.debug.push({ id: bay, label: `${bay} airlock`, pos: at(bay, 3, 3), yaw: Math.PI / 2 });
}

// ---------------------------------------------------------------------------------------------------- B2 The Lanes

function buildLane(b: LevelBuilder, lane: Lane, lips: number[], r: UpperResult): void {
  const y = UPPER_Y;
  const M = B2_METRICS;
  const X = (x: number): number => wx('B2', x);
  const Z = (z: number): number => wz('B2', lz(lane, z));
  const facingWall = lane === 'N' ? 0 : Math.PI;
  const mirrored = lane === 'S';
  // 1 step (N: an old cable-drum stand; S: a cable-tray plinth), x 2.5..3.5
  b.block(X(3), (Z(23) + Z(33)) / 2, 1.0, M.step, 10, C.plinth, y);
  // 2 vault rail 1.1 x 0.3 (course obstacle), x 6
  b.block(X(6), (Z(23) + Z(33)) / 2, M.vaultThick, M.vault, 10, C.rail, y);
  // 3 mantle block wall 1.7, x 9..11, z 24..33
  b.block(X(10), (Z(24) + Z(33)) / 2, 2, M.mantle, 9, C.block, y);
  // 5 / 6 galleries G1 (x 13..17) and G2 (x 21..23), 1.5 deep on the wall, steel grating at y 4.0 (lip pieces)
  for (const [x0, x1] of [[13, 17], [21, 23]] as const) {
    lips.push(b.boxes.length);
    b.box(X((x0 + x1) / 2), y + M.gallery - 0.15, (Z(34.5) + Z(36)) / 2, x1 - x0, 0.3, 1.5, C.steel);
  }
  // 4 up to G1: Lane N a fixed ladder against G1's front face, Lane S a cast-iron downpipe from the gallery gutter
  if (lane === 'N') b.ladder(X(13.6), Z(34.1), y, y + M.gallery, facingWall);
  else b.pipeV(X(13.6), Z(34.4), y, y + M.gallery, facingWall);
  // 5 the cable-support pipe over the cut gallery (x 17..21) at y 6.5
  b.pipeH(X(16.6), Z(35.25), X(21.4), Z(35.25), y + M.pipe);
  // 7 the full-height cross wall at x 24 with the lane door (z 27.4..28.6), locked: the other lane's lever opens it
  const g0 = Math.min(Z(27.4), Z(28.6));
  const g1 = Math.max(Z(27.4), Z(28.6));
  wallZAt(b, X(24), Math.min(Z(21), Z(36)), Math.max(Z(21), Z(36)), [[g0, g1]], y, B2_CLEAR, C.wall, CROSS);
  headerZ(b, X(24), g0, g1, y, B2_CLEAR, CROSS, C.wall);
  const laneDoor = b.door(X(24), y, g0, DOOR_W, 0, { locked: true });
  r.doors[`B2-lane-${lane.toLowerCase()}`] = laneDoor.id;
  // the lever for the other lane's door: x 22, beside the glass, after this lane's first half
  r.devices[`sw-lever-${lane.toLowerCase()}`] = { x: X(22), y, z: Z(21.4), yaw: lane === 'N' ? 0 : Math.PI, label: 'Pull lever' };
  // 8 trench x 28.4..29.6 (1.2 wide, 1.5 deep): built with the hall floor (holes)
  // 9 up to L1: Lane N a cast-iron downpipe (at its top the climber steps sideways onto L1's west end); Lane S a
  // fixed ladder up the front of a small ladder-head landing (x 30.2..31.0, z 35..36, top 4.5): the ladder's top
  // step-off lands on it, and its lip (hang only) chains into L1
  if (lane === 'N') b.pipeV(X(30.8), Z(35.9), y, y + M.beam, facingWall);
  else {
    b.block(X((HEAD_X0 + HEAD_X1) / 2), (Z(HEAD_Z) + Z(36)) / 2, HEAD_X1 - HEAD_X0, M.beam, 36 - HEAD_Z, C.steel, y);
    b.ladder(X(30.6), Z(HEAD_Z - 0.4), y, y + M.beam, facingWall);
  }
  // 10 beam ledge L1 (0.25, hang only) along the wall x 31..34.25, round the square column (x 34.5..35.5, 1 m off the
  // wall) and a 0.3 stub past it; 11 the 2.2 gap (hand to hand) to L2 (0.4 deep, x 37.85..38.45) beside platform P
  const bt = M.beam;
  const beamFrom = b.boxes.length;
  b.box(X(32.625), y + bt - 0.125, (Z(35.75) + Z(36)) / 2, 3.25, 0.25, 0.25, C.beam);
  b.box(X(34.375), y + bt - 0.125, (Z(34.75) + Z(36)) / 2, 0.25, 0.25, 1.25, C.beam);
  b.box(X(35.0), y + bt - 0.125, (Z(34.75) + Z(35)) / 2, 1.5, 0.25, 0.25, C.beam);
  b.box(X(35.625), y + bt - 0.125, (Z(34.75) + Z(36)) / 2, 0.25, 0.25, 1.25, C.beam);
  b.box(X(35.9), y + bt - 0.125, (Z(35.75) + Z(36)) / 2, 0.3, 0.25, 0.25, C.beam);
  b.box(X(35.0), y + B2_CLEAR / 2, (Z(35) + Z(36)) / 2, 1.0, B2_CLEAR, 1.0, C.wall);
  b.box(X((L2_X0 + L2_X1) / 2), y + bt - 0.2, (Z(35.6) + Z(36)) / 2, L2_X1 - L2_X0, 0.4, 0.4, C.beam);
  b.mark(beamFrom, { noLedge: true });
  const top = y + bt;
  // manual lips (Lane N order west -> east; Lane S mirrored: a / b swapped so the normal still points out)
  const lip = (ax: number, az: number, bx: number, bz: number, climb: boolean): Ledge => {
    const opts = { drop: bt, canHang: true, canClimbUp: climb };
    return mirrored ? b.ledge(X(bx), Z(bz), X(ax), Z(az), top, opts) : b.ledge(X(ax), Z(az), X(bx), Z(bz), top, opts);
  };
  const head = lane === 'S' ? [lip(HEAD_X0, HEAD_Z, HEAD_X1, HEAD_Z, false), lip(HEAD_X1, HEAD_Z, HEAD_X1, 35.75, false)] : [];
  const l1 = [
    ...head,
    lip(31, 35.75, 34.25, 35.75, false),
    lip(34.25, 35.75, 34.25, 34.75, false),
    lip(34.25, 34.75, 35.75, 34.75, false),
    lip(35.75, 34.75, 35.75, 35.75, false),
    lip(35.75, 35.75, 36.05, 35.75, false),
  ];
  link(l1, mirrored);
  lip(L2_X0, 35.6, L2_X1, 35.6, true);
  // platform P (x 38.45..42, 4 deep on the wall, top 4.5): a lip piece
  lips.push(b.boxes.length);
  b.block(X((L2_X1 + 42) / 2), (Z(32) + Z(36)) / 2, 42 - L2_X1, M.platform, 4, C.block, y);
  // 12 drop pads under P's east edge (x 42..44): 2.0 (pad top 2.5), 3.2 (pad 1.3), 5.0 (the pit floor at -0.5)
  b.block(X(43.025), (Z(34.67) + Z(36)) / 2, 2.05, M.padSoft, 1.33, C.pad, y);
  b.block(X(43.025), (Z(33.33) + Z(34.67)) / 2, 2.05, M.padRoll, 1.34, C.pad, y);
  // 13 the cross wall at x 44.2 with an open and a glazed inspection window side by side (sill 0.9)
  const wa = Math.min(Z(21), Z(36));
  const wb = Math.max(Z(21), Z(36));
  const open = [Math.min(Z(27), Z(28.2)), Math.max(Z(27), Z(28.2))] as const;
  const glazed = [Math.min(Z(29), Z(30.2)), Math.max(Z(29), Z(30.2))] as const;
  const gaps = open[0] < glazed[0] ? [open, glazed] : [glazed, open];
  wallZAt(b, X(CROSS_E), wa, wb, gaps, y, B2_CLEAR, C.wall, CROSS);
  windowZ(b, X(CROSS_E), (open[0] + open[1]) / 2, y, B2_CLEAR, C.wall, { open: true, breakable: false });
  windowZ(b, X(CROSS_E), (glazed[0] + glazed[1]) / 2, y, B2_CLEAR, C.wall, { open: false, breakable: true });
  // 14 floor marks (visual): "stop on the line" at x 46, "turn" at x 47.5
  b.box(X(46), y + 0.01, (Z(22) + Z(35)) / 2, 0.1, 0.02, 13, C.mark, 0, 0, false);
  b.box(X(47.5), y + 0.01, (Z(22) + Z(35)) / 2, 0.1, 0.02, 13, C.mark, 0, 0, false);
}

/** Glass thickness (the invisible collision box). */
const GLASS_T = 0.1;

/**
 * A glazed partition along z from x0 to x1 (world), `h` tall: one invisible full-height collision box (never a lip:
 * `noLedge`; no fence anchor, so it cannot be climbed) and a visual-only steel frame (posts every 3 m, sill and head
 * rails); the pane itself is not drawn, so the run reads as see-through glass.
 */
function glassRun(b: LevelBuilder, x0: number, x1: number, z: number, y: number, h: number): void {
  const from = b.boxes.length;
  b.box((x0 + x1) / 2, y + h / 2, z, x1 - x0, h, GLASS_T, C.glass, 0, 0, true, false);
  const n = Math.max(1, Math.round((x1 - x0) / 3));
  for (let i = 0; i <= n; i++) b.box(x0 + ((x1 - x0) * i) / n, y + h / 2, z, 0.08, h, 0.08, C.steel, 0, 0, false);
  for (const ry of [0.05, 2.4, h - 0.05]) b.box((x0 + x1) / 2, y + ry, z, x1 - x0, 0.1, 0.08, C.steel, 0, 0, false);
  b.mark(from, { noLedge: true });
}

/** Holes in the hall floor for one lane (world rects): the trench and the drop pit. */
function laneHoles(lane: Lane): { trench: [number, number, number, number]; pit: [number, number, number, number] } {
  return { trench: lipBox('B2', 28.4, lz(lane, 21), 29.6, lz(lane, 36)), pit: lipBox('B2', 42, lz(lane, 32), CROSS_E - CROSS / 2, lz(lane, 33.33)) };
}

function buildB2(b: LevelBuilder, lips: number[], r: UpperResult): void {
  const y = UPPER_Y;
  const H = B2_CLEAR;
  const M = B2_METRICS;
  const X = (x: number): number => wx('B2', x);
  const Z = (z: number): number => wz('B2', z);
  const hn = laneHoles('N');
  const hs = laneHoles('S');
  slabWithHoles(b, X(-0.225), Z(-OUTER), X(48.225), Z(36 + OUTER), y, [hn.trench, hn.pit, hs.trench, hs.pit], C.floor);
  for (const h of [hn.trench, hs.trench]) pit(b, h, y, M.trenchDepth, C.block);
  for (const h of [hn.pit, hs.pit]) pit(b, h, y, -M.pit, C.block);
  // perimeter: north / south outside the hall box; west (A1) and east (A2) shared walls centred, with the door gaps
  wallXAt(b, Z(36 + OUTER / 2), X(-0.225), X(48.225), [], y, H, C.wall, OUTER);
  wallXAt(b, Z(-OUTER / 2), X(-0.225), X(48.225), [], y, H, C.wall, OUTER);
  for (const x of [0, 48]) {
    wallZAt(b, X(x), Z(-OUTER), Z(36 + OUTER), [[Z(17.4), Z(18.6)]], y, H, C.wall, OUTER);
    headerZ(b, X(x), Z(17.4), Z(18.6), y, H, OUTER, C.wall);
  }
  buildLane(b, 'N', lips, r);
  buildLane(b, 'S', lips, r);
  // the glass walls on z 15 and z 21 (toughened, see-through, never break; A26): a full-height invisible collision
  // box (no anchor: nothing to climb) behind a visual-only frame (posts, rails), the glass itself unrendered. The lane
  // entry doors at the west end (x 1.0..2.2); the walkway's east-end doors (x 45.4..46.6) are locked at start and
  // open with their lane's x 24 gate (the same lever), so the window at x 44.2 is no way round the gate
  for (const z of [15, 21]) {
    const runs: [number, number][] = [[0.225, 1.0], [2.2, 45.4], [46.6, 47.775]];
    for (const [a, e] of runs) glassRun(b, X(a), X(e), Z(z), y, H);
    for (const x0 of [1.0, 45.4]) {
      const from = b.boxes.length;
      b.box(X(x0 + DOOR_W / 2), y + (DOOR_H + H) / 2, Z(z), DOOR_W, H - DOOR_H, GLASS_T, C.glass, 0, 0, true, false);
      b.box(X(x0 + DOOR_W / 2), y + DOOR_H + 0.05, Z(z), DOOR_W, 0.1, 0.08, C.steel, 0, 0, false);
      b.mark(from, { noLedge: true });
    }
    const lane = z === 21 ? 'n' : 's';
    r.doors[`B2-entry-${lane}`] = b.door(X(1.0), y, Z(z), DOOR_W, Math.PI / 2).id;
    r.doors[`B2-exit-${lane}`] = b.door(X(45.4), y, Z(z), DOOR_W, Math.PI / 2, { locked: true }).id;
  }
  roof(b, X(-0.225), Z(-OUTER), X(48.225), Z(36 + OUTER), y + H);
  r.debug.push({ id: 'B2', label: 'B2 The Lanes (walkway west end)', pos: at('B2', 2, 18), yaw: Math.PI / 2 });
}

/**
 * Build the Upper level into `b`. Returns doors (course ids -> anchor ids), course devices, the two lift spawns and
 * the debug points. Afterwards every Upper box but the lip pieces is `noLedge`.
 */
export function buildUpper(b: LevelBuilder): UpperResult {
  const r: UpperResult = { doors: {}, devices: {}, spawns: [], debug: [] };
  const from = b.boxes.length;
  const lips: number[] = [];
  buildB1(b, r);
  buildAirlock(b, 'A1', r);
  buildB2(b, lips, r);
  buildAirlock(b, 'A2', r);
  const keep = new Set(lips);
  for (let k = from; k < b.boxes.length; k++) if (!keep.has(k)) b.boxes[k]!.noLedge = true;
  // one work lamp per bay (T6 lights the bays)
  const l1 = at('B1', 12, 12, 2.9);
  b.light({ ...l1, radius: 16, intensity: 0.9 });
  const l2 = at('B2', 24, 18, 10);
  b.light({ ...l2, radius: 32, intensity: 0.9 });
  return r;
}
