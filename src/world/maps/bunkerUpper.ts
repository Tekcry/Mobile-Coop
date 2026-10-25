import type { LevelBuilder } from '../levelBuilder';
import type { Door, Ledge, P3 } from '../anchors';
import type { CourseDevice, CourseObjective, ElementFlag } from '../../game/course/courseDef';
import { wallXAt, wallZAt, windowZ } from './storey';

/**
 * Fallow, the Upper level (y 16), BAYS v2 (T5d): B1 Muster, airlock A1, B2 The Lanes, airlock A2 (docs/archive/training/BAYS.md
 * sections 0, B1, B2). Every coordinate below is a BAYS local coordinate; `at` / `wx` / `wz` add the bay's offset
 * (BAYS 0.1). One shared course (R3): B1 is a chain of five rooms, B2 one lane of seven stations, every element spans
 * its room wall to wall (R2).
 *
 * Ledges: `LevelBuilder.build` generates lips from box tops in absolute y, so every Upper piece is `noLedge`; the only
 * lips are the manual ones in `BUNKER_LIPS` (G2's hang point, the beam ledge L1 round the column, the portal sill L2).
 *
 * A2's far door opens onto B3's G1 (bunkerShaft, B3 at its v2 offset (65, 46) since T5e).
 */

export const UPPER_Y = 16;

export type UpperBay = 'B1' | 'A1' | 'B2' | 'A2';

/** BAYS 0.1 offsets (x, z) of the Upper bays (v2). */
export const UPPER_OFFSET: Record<UpperBay, readonly [number, number]> = {
  B1: [0, 60],
  A1: [1, 54],
  B2: [7, 49.5],
  A2: [59, 50],
};

/** World point from a bay's local (x, z, y above the Upper floor). */
export function at(bay: UpperBay, x: number, z: number, y = 0): P3 {
  const o = UPPER_OFFSET[bay];
  return { x: x + o[0], y: UPPER_Y + y, z: z + o[1] };
}
const wx = (bay: UpperBay, x: number): number => x + UPPER_OFFSET[bay][0];
const wz = (bay: UpperBay, z: number): number => z + UPPER_OFFSET[bay][1];

/** Heights above the Upper floor. */
export const B1_CLEAR = 3.2;
export const B2_CLEAR = 9;
export const AIRLOCK_CLEAR = 3.0;
const OUTER = 0.45;
const PART = 0.2;
const ROOF_T = 0.3;
const DOOR_W = 1.2;
const DOOR_H = 2.1;
/** Glass (the invisible collision box) and the A51 screen height. */
const GLASS_T = 0.1;
const SCREEN_H = 2.4;

/** B2 metrics (BAYS B2 station table, local heights over 2A's floor). */
export const B2_METRICS = {
  step: 0.5,
  vault: 1.1,
  vaultThick: 0.3,
  mantle: 1.7,
  gallery: 4.0,
  pipe: 6.5,
  /** 2B-4: the pit catcher floor. */
  pit: -1.0,
  trenchWidth: 1.2,
  trenchDepth: 2.0,
  /** 2C-3: the beam ledge L1, 0.25 deep, hang only. */
  beam: 5.0,
  l1Depth: 0.25,
  /** 2C-5: the portal sill (L2), 0.7 deep through the cross wall, climb up. */
  sill: 5.0,
  l2Depth: 0.7,
  /** 2C-5: hand to hand, the stub's grip to the sill's nearest grip. */
  gap: 2.2,
  sump: -1.0,
  /** 2D: the deck, the pads (tops) and the pad pit floor. */
  deck: 4.5,
  padSoft: 2.5,
  padRoll: 1.3,
  padPit: -0.5,
  /** 2E: window sills over the pad pit floor. */
  windowSill: 0.9,
} as const;

/** B2 plan lines (local x / z). */
const G1 = [14, 16] as const;
const G2 = [20, 22] as const;
const PIT = [16, 20] as const;
const TRENCH = [27, 28.2] as const;
/** The cross wall between 2C and 2D (its west face 34.0) and the beam line (L1's lip) 0.25 in front of it. */
const CW = [34, 34.45] as const;
const LIP_X = 33.75;
/** L1 run along the cross wall, the column (1 x 1 on the wall) and its beam wrap, the stub. */
const L1_Z0 = 1;
const COL_Z = [3.85, 4.85] as const;
const WRAP = 0.25;
const STUB_Z1 = 5.4;
/** The cable portal in the cross wall (z 7.2..9.0, y 5.0..7.1) and the sump under it. */
const PORTAL_Z = [7.2, 9.0] as const;
const PORTAL_TOP = 7.1;
const SUMP = [31.5, 5.6, 34, 9] as const;
const DECK_X1 = 38;
const PAD_PIT = [38, 0, 46, 9] as const;
/** 2E: the window wall (centre x, 0.3 thick as `windowZ`) and its three openings (z centres): open, glazed, glazed. */
const WIN_X = 46.15;
const WINDOWS = [{ z: 1.6, open: true }, { z: 4.2, open: false }, { z: 6.8, open: false }] as const;
/** RL2's turnstile cage on G2 (A61): x 20.8..22, z 7.6..9. */
const CAGE = [20.8, 7.6] as const;

const C = {
  wall: '#3f4245',
  part: '#e4e6e8',
  floor: '#45484c',
  roof: '#2e3033',
  plinth: '#6f6a62',
  rail: '#9aa0a6',
  block: '#74787c',
  steel: '#8d949b',
  beam: '#6a5f52',
  pad: '#4f6a57',
  locker: '#56606a',
  wood: '#7a5a3c',
  glass: '#5d7387',
  mark: '#c9b458',
  led: '#dfe8f0',
} as const;

/** A planned lip: its plan box (world), its top (world y). */
export interface BunkerLip {
  id: string;
  bay: UpperBay;
  box: [number, number, number, number];
  top: number;
}

function lipBox(bay: UpperBay, x0: number, z0: number, x1: number, z1: number): [number, number, number, number] {
  return [wx(bay, Math.min(x0, x1)) - 0.05, wz(bay, Math.min(z0, z1)) - 0.05, wx(bay, Math.max(x0, x1)) + 0.05, wz(bay, Math.max(z0, z1)) + 0.05];
}

/** Every lip on the Upper level (all manual; B1 has none). Nothing else makes a ledge. */
export const BUNKER_LIPS: readonly BunkerLip[] = [
  { id: 'G2H', bay: 'B2', box: lipBox('B2', G2[1], 3.5, G2[1], 5), top: UPPER_Y + B2_METRICS.gallery },
  { id: 'L1', bay: 'B2', box: lipBox('B2', LIP_X - 1, L1_Z0, LIP_X, STUB_Z1), top: UPPER_Y + B2_METRICS.beam },
  { id: 'L2', bay: 'B2', box: lipBox('B2', LIP_X, PORTAL_Z[0], LIP_X, PORTAL_Z[1]), top: UPPER_Y + B2_METRICS.sill },
];

/** A room or station of the line (BAYS room / station tables), world plan rect and floor (world y). */
export interface UpperRoom {
  id: string;
  bay: UpperBay;
  rect: [number, number, number, number];
}

const room = (id: string, bay: UpperBay, x0: number, z0: number, x1: number, z1: number): UpperRoom => ({ id, bay, rect: [wx(bay, x0), wz(bay, z0), wx(bay, x1), wz(bay, z1)] });

/** BAYS B1 rooms (the line LL -> KR -> BR -> GR -> DS -> A1) and the B2 bay box (one lane). R4 footprints. */
export const UPPER_ROOMS: readonly UpperRoom[] = [
  room('LL', 'B1', 0, 8.4, 6, 14.4),
  room('KR', 'B1', 6, 8.4, 14, 14.4),
  room('BR', 'B1', 14, 8.4, 20, 14.4),
  room('GR', 'B1', 0, 6, 20, 8.4),
  room('DS', 'B1', 0, 0, 8, 6),
  room('A1', 'A1', 0, 0, 6, 6),
  room('B2', 'B2', 0, 0, 52, 9),
  room('A2', 'A2', 0, 0, 6, 6),
];

/** BAYS v2 objective tables (R5, A47, A59): the names T7a turns into drills (`DrillDef.name`), in teaching order. */
const B1_OBJ = [
  'Open your locker', 'Crouch, then stand up', 'Elbow-strike the pad', 'Aim at the briefing screen to draw your weapon',
  'Stop aiming to holster', 'Run the gear run: gears 1 to 6 on the marks', 'Stop dead on the line',
  'Quick 180 on the turn mark', 'Stand in the dark and watch your light meter drop', 'Switch the store light for your partner',
  'Night vision on in the dark store', 'Ping the airlock door', 'Both on the airlock pad',
];
const B2_OBJ: [string, string][] = [
  ['1', 'Step up onto the plinth'], ['2', 'Vault the rail'], ['3', 'Mantle the block wall'],
  ['4', 'Sprint, vault the rail and carry into the mantle'], ['4a', 'Shoot out a gallery lamp'],
  ['5', 'Ladder up to the gallery'], ['6', 'Cross the gap hand over hand on the pipe'],
  ['7', 'Lower into a hang from the far gallery'], ['8', 'Hang-drop to the floor'], ['9', 'Sprint and jump the trench'],
  ['10', 'Forward roll on the strip'], ['11', 'Run, jump to the downpipe and climb it'], ['12', 'Shimmy along the beam ledge'],
  ['13', 'Round the column: two outside corners'], ['14', 'Jump the gap to the portal sill'], ['15', 'Climb up onto the deck'],
  ['16', 'Drop to the high pad: soft landing'], ['17', 'Drop to the low pad: roll landing'],
  ['18', 'Drop to the pit floor: heavy landing (hear it)'], ['19', 'Vault through the open window (quiet)'],
  ['20', 'Break through a glazed window (loud)'], ['21', 'Stop dead on the line'], ['22', 'Quick 180 on the turn mark'],
  ['23', 'Both on the airlock pad'],
];
export const UPPER_OBJECTIVES: readonly CourseObjective[] = [
  ...B1_OBJ.map((text, i) => ({ id: `B1-${i + 1}`, bay: 'B1', text })),
  ...B2_OBJ.map(([n, text]) => ({ id: `B2-${n}`, bay: 'B2', text })),
];

/** Elements whose behaviour is a stub until T6 / T7a (A61): built as geometry, not yet final. */
export const UPPER_ELEMENTS: Record<'B1' | 'B2', ElementFlag[]> = {
  B1: [{ id: 'B1-DS-switch', feature: 'store light switch K4 (T6 circuit, T7a drill)', final: false }],
  B2: [
    { id: 'B2-RL2', feature: 'one-way return turnstile (A61): locked door until T7a', final: false },
    { id: 'B2-reglaze', feature: 'practice panes re-glaze 10 s after a break (A54, A61)', final: false },
    { id: 'B2-relamp', feature: 'L2-G1..3 breakable, one re-lamps after 30 s (A61; T6 lamps)', final: false },
  ],
};

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

/** A lintel over a door gap in a wall along z (x, gap z0..z1) up to the wall top h. */
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

/**
 * Toughened glass (A26, BAYS 0.5) over a world plan rect from y to y + h: one invisible collision box (`noLedge`, no
 * fence anchor: never climbable) and a visual-only steel frame (posts about every 3 m, sill and head rails).
 */
export function glass(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number, h: number): void {
  const from = b.boxes.length;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const sx = Math.max(GLASS_T, x1 - x0);
  const sz = Math.max(GLASS_T, z1 - z0);
  b.box(cx, y + h / 2, cz, sx, h, sz, C.glass, 0, 0, true, false);
  const alongX = sx >= sz;
  const len = alongX ? sx : sz;
  const n = Math.max(1, Math.round(len / 3));
  for (let i = 0; i <= n; i++) {
    const t = -len / 2 + (len * i) / n;
    b.box(alongX ? cx + t : cx, y + h / 2, alongX ? cz : cz + t, 0.06, h, 0.06, C.steel, 0, 0, false);
  }
  for (const ry of [0.03, h - 0.03]) b.box(cx, y + ry, cz, alongX ? len : 0.06, 0.06, alongX ? 0.06 : len, C.steel, 0, 0, false);
  b.mark(from, { noLedge: true });
}

/** A visual-only LED strip (T6 decides which strips are lamps; an accent strip adds no light). */
export function led(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number): void {
  b.box((x0 + x1) / 2, y, (z0 + z1) / 2, Math.max(0.04, x1 - x0), 0.03, Math.max(0.04, z1 - z0), C.led, 0, 0, false);
}

function link(chain: Ledge[]): void {
  for (let i = 0; i + 1 < chain.length; i++) {
    chain[i]!.nextA = chain[i + 1]!.id;
    chain[i + 1]!.nextB = chain[i]!.id;
  }
}

/** A safety cage round a ladder (A51): three thin `noLedge` panels from y0 to y1 (world), the ladder's back open. */
function cage(b: LevelBuilder, x: number, z: number, facing: number, y0: number, y1: number): void {
  const from = b.boxes.length;
  const fx = Math.round(Math.sin(facing));
  const fz = Math.round(Math.cos(facing));
  // the climber's side (away from the wall) is -facing; the cage reaches 1.0 out from the wall line
  const h = y1 - y0;
  const cy = y0 + h / 2;
  if (fx !== 0) {
    const out = x - fx * 0.7; // panels overlap at the corners (voxel fit)
    b.box(out, cy, z, 0.1, h, 1.3, C.steel);
    b.box(x - fx * 0.35, cy, z - 0.6, 0.8, h, 0.1, C.steel);
    b.box(x - fx * 0.35, cy, z + 0.6, 0.8, h, 0.1, C.steel);
  } else {
    const out = z - fz * 0.7;
    b.box(x, cy, out, 1.3, h, 0.1, C.steel);
    b.box(x - 0.6, cy, z - fz * 0.35, 0.1, h, 0.8, C.steel);
    b.box(x + 0.6, cy, z - fz * 0.35, 0.1, h, 0.8, C.steel);
  }
  b.mark(from, { noLedge: true });
}

// ---------------------------------------------------------------------------------------------------- B1 Muster

function buildB1(b: LevelBuilder, r: UpperResult): void {
  const y = UPPER_Y;
  const H = B1_CLEAR;
  const X = (x: number): number => wx('B1', x);
  const Z = (z: number): number => wz('B1', z);
  // floors: the top row and the gear run (x 0..20, z 6..14.4), the dark store (x 0..8, z 0..6)
  b.floor(X(10), Z(10.2), 20 + 2 * OUTER, 8.4 + 2 * OUTER, C.floor, y);
  b.floor(X(4), Z(3), 8 + 2 * OUTER, 6 + OUTER, C.floor, y);
  // perimeter (0.45, outside the bay box); DS's south wall is shared with A1 (centred on z 0, the A1 door x 3.4..4.6)
  wallXAt(b, Z(14.4 + OUTER / 2), X(-OUTER), X(20 + OUTER), [], y, H, C.wall, OUTER);
  wallZAt(b, X(-OUTER / 2), Z(0), Z(14.4), [], y, H, C.wall, OUTER);
  wallZAt(b, X(20 + OUTER / 2), Z(6 - OUTER), Z(14.4 + OUTER), [], y, H, C.wall, OUTER);
  wallXAt(b, Z(6 - OUTER / 2), X(8), X(20 + OUTER), [], y, H, C.wall, OUTER);
  wallZAt(b, X(8 + OUTER / 2), Z(-0.225), Z(6), [], y, H, C.wall, OUTER);
  wallXAt(b, Z(0), X(-OUTER), X(8 + OUTER), [[X(3.4), X(4.6)]], y, H, C.wall, OUTER);
  headerX(b, Z(0), X(3.4), X(4.6), y, H, OUTER, C.wall);
  // partitions (0.2, white panels): LL | KR at x 6, KR | BR at x 14 (doors z 10.8..12.0)
  for (const x of [6, 14]) {
    wallZAt(b, X(x), Z(8.4), Z(14.4), [[Z(10.8), Z(12.0)]], y, H, C.part, PART);
    headerZ(b, X(x), Z(10.8), Z(12.0), y, H, PART, C.part);
    r.doors[`B1-${x === 6 ? 'kr' : 'br'}`] = b.door(X(x), y, Z(10.8), DOOR_W, 0).id;
  }
  // the top row | gear run partition at z 8.4: solid under LL and KR, BR's glass south wall (observation) with its door
  wallXAt(b, Z(8.4), X(0), X(14), [], y, H, C.part, PART);
  glass(b, X(14), Z(8.4) - GLASS_T / 2, X(18.2), Z(8.4) + GLASS_T / 2, y, H);
  glass(b, X(19.4), Z(8.4) - GLASS_T / 2, X(20), Z(8.4) + GLASS_T / 2, y, H);
  headerX(b, Z(8.4), X(18.2), X(19.4), y, H, PART, C.part);
  r.doors['B1-gr'] = b.door(X(18.2), y, Z(8.4), DOOR_W, Math.PI / 2).id;
  // the gear run | dark store partition at z 6 (x 0..8): the DS door at GR's west end (x 0.6..1.8)
  wallXAt(b, Z(6), X(0), X(8), [[X(0.6), X(1.8)]], y, H, C.part, PART);
  headerX(b, Z(6), X(0.6), X(1.8), y, H, PART, C.part);
  r.doors['B1-ds'] = b.door(X(0.6), y, Z(6), DOOR_W, Math.PI / 2).id;
  // LL: the surface lift's closed doors on the west wall (the way in, visual)
  b.box(X(0.05), y + 1.1, Z(11.4), 0.1, 2.2, 2.0, C.steel, 0, 0, false);
  // KR: two operator lockers (north wall, glass fronts), bench 0.45 (x 8..12, z 12.6..13.0), weapon rack (south wall)
  b.box(X(7.2), y + 1.0, Z(14.1), 0.6, 2.0, 0.6, C.locker);
  b.box(X(7.9), y + 1.0, Z(14.1), 0.6, 2.0, 0.6, C.locker);
  b.box(X(7.55), y + 1.0, Z(13.79), 1.3, 1.9, 0.02, C.glass, 0, 0, false);
  b.block(X(10), Z(12.8), 4, 0.45, 0.4, C.wood, y);
  b.box(X(11.5), y + 0.9, Z(8.7), 3, 1.8, 0.4, C.steel);
  // (the padded strike post at (12.5, 10) is a TrainingDummy placed by the course data, T7a)
  // BR: map table 0.9 (x 15.5..18.5, z 11..13), the wall screen on the east wall (aim target, visual)
  b.block(X(17), Z(12), 3, 0.9, 2, C.wood, y);
  b.box(X(19.95), y + 1.8, Z(11.4), 0.06, 1.4, 2.6, '#202428', 0, 0, false);
  // GR: LED floor marks "1".."6" at x 18, 15, 12, 9, 6, 3; the stop line x 2.0, the turn mark x 1.0 (accent, visual)
  for (const x of [18, 15, 12, 9, 6, 3]) led(b, X(x) - 0.04, Z(6.1), X(x) + 0.04, Z(8.3), y + 0.015);
  b.box(X(2), y + 0.01, Z(7.2), 0.1, 0.02, 2.2, C.mark, 0, 0, false);
  b.box(X(1), y + 0.01, Z(7.2), 0.1, 0.02, 2.2, C.mark, 0, 0, false);
  // DS: decontamination suit racks 2.0 along the east and west walls (chequer plate floor: T6 surfaces)
  b.box(X(0.35), y + 1.0, Z(2.6), 0.6, 2.0, 3.6, C.steel);
  b.box(X(7.65), y + 1.0, Z(3), 0.6, 2.0, 5.0, C.steel);
  // the store light switch inside the door (x 2.2, z 5.7): visual until T6 wires K4 (UPPER_ELEMENTS)
  b.box(X(2.2), y + 1.3, Z(5.85), 0.12, 0.18, 0.06, C.steel, 0, 0, false);
  roof(b, X(-OUTER), Z(6 - OUTER), X(20 + OUTER), Z(14.4 + OUTER), y + H);
  roof(b, X(-OUTER), Z(-0.225), X(8 + OUTER), Z(6), y + H);
  r.spawns.push({ pos: at('B1', 2, 11.4), yaw: Math.PI / 2 }, { pos: at('B1', 4, 11.4), yaw: Math.PI / 2 });
  r.debug.push(
    { id: 'B1', label: 'B1 Muster: lift lobby', pos: at('B1', 3, 10), yaw: Math.PI / 2 },
    { id: 'B1-KR', label: 'B1 kit room', pos: at('B1', 9, 10), yaw: Math.PI / 2 },
    { id: 'B1-BR', label: 'B1 briefing room', pos: at('B1', 16, 10), yaw: Math.PI / 2 },
    { id: 'B1-GR', label: 'B1 gear run (east end)', pos: at('B1', 19, 7.2), yaw: -Math.PI / 2 },
    { id: 'B1-DS', label: 'B1 dark store', pos: at('B1', 4, 3), yaw: Math.PI },
  );
  for (const [x, z] of [[3, 11.4], [10, 11.4], [17, 11.4], [10, 7.2], [4, 3]] as const) b.light({ ...at('B1', x, z, 2.9), radius: 8, intensity: 0.8 });
}

// ---------------------------------------------------------------------------------------------------- airlocks

/**
 * A1 / A2 (BAYS 0.4): 6 x 6 x 3.0, two locked blast doors (the course opens them), the pad border (LED, visual), a bench
 * outside the pad, a vision panel by the far door. A1: near door in its north wall (B1's DS wall), far door in its east
 * wall (B2's west wall). A2: near door in its west wall (B2's east wall), far door in its east wall (built here).
 */
function buildAirlock(b: LevelBuilder, bay: 'A1' | 'A2', r: UpperResult): void {
  const y = UPPER_Y;
  const X = (x: number): number => wx(bay, x);
  const Z = (z: number): number => wz(bay, z);
  b.floor(X(3), Z(3), 6, 6, C.floor, y);
  if (bay === 'A1') {
    wallXAt(b, Z(-OUTER / 2), X(-OUTER), X(6 + 0.225), [], y, AIRLOCK_CLEAR, C.wall, OUTER);
    wallZAt(b, X(-OUTER / 2), Z(-OUTER), Z(6 + 0.225), [], y, AIRLOCK_CLEAR, C.wall, OUTER);
    // the east wall north of B2's north wall (B2 builds z 0..4.95)
    wallZAt(b, X(6), Z(4.95), Z(6.225), [], y, AIRLOCK_CLEAR, C.wall, OUTER);
    b.block(X(4.8), Z(0.4), 1.6, 0.45, 0.45, C.wood, y);
  } else {
    wallXAt(b, Z(-OUTER / 2), X(0), X(6), [], y, AIRLOCK_CLEAR, C.wall, OUTER);
    wallXAt(b, Z(6 + OUTER / 2), X(0), X(6), [], y, AIRLOCK_CLEAR, C.wall, OUTER);
    wallZAt(b, X(6), Z(-OUTER), Z(6 + OUTER), [[Z(2.4), Z(3.6)]], y, AIRLOCK_CLEAR, C.wall, OUTER);
    headerZ(b, X(6), Z(2.4), Z(3.6), y, AIRLOCK_CLEAR, OUTER, C.wall);
    b.block(X(3), Z(5.6), 2.4, 0.45, 0.45, C.wood, y);
  }
  // the pad border: a 4 x 4 LED floor strip inset 1 m (AIRLOCK_PAD_INSET; white / amber / green is T6's)
  led(b, X(1), Z(1), X(5), Z(1), y + 0.015);
  led(b, X(1), Z(5), X(5), Z(5), y + 0.015);
  led(b, X(1), Z(1), X(1), Z(5), y + 0.015);
  led(b, X(5), Z(1), X(5), Z(5), y + 0.015);
  roof(b, X(-0.225), Z(-OUTER), X(6.225), Z(6 + OUTER), y + AIRLOCK_CLEAR);
  let near: Door;
  let far: Door;
  if (bay === 'A1') {
    // near: DS's south wall at z 6 (x 2.4..3.6), swinging into the chamber; far: B2's west wall at x 6 (z 1.4..2.6)
    near = b.door(X(2.4), y, Z(6), DOOR_W, Math.PI / 2, { locked: true, swing: 1 });
    far = b.door(X(6), y, Z(1.4), DOOR_W, 0, { locked: true, swing: -1 });
    b.box(X(6) - 0.24, y + 1.5, Z(3.1), 0.04, 0.6, 0.15, C.glass, 0, 0, false);
  } else {
    near = b.door(X(0), y, Z(2.4), DOOR_W, 0, { locked: true, swing: 1 });
    far = b.door(X(6), y, Z(2.4), DOOR_W, 0, { locked: true, swing: -1 });
    b.box(X(6) - 0.24, y + 1.5, Z(3.9), 0.04, 0.6, 0.15, C.glass, 0, 0, false);
  }
  r.doors[`${bay}-near`] = near.id;
  r.doors[`${bay}-far`] = far.id;
  r.debug.push({ id: bay, label: `${bay} airlock`, pos: at(bay, 3, 3), yaw: Math.PI / 2 });
}

// ---------------------------------------------------------------------------------------------------- B2 The Lanes

function buildB2(b: LevelBuilder, r: UpperResult): void {
  const y = UPPER_Y;
  const H = B2_CLEAR;
  const M = B2_METRICS;
  const X = (x: number): number => wx('B2', x);
  const Z = (z: number): number => wz('B2', z);
  const hole = (x0: number, z0: number, x1: number, z1: number): [number, number, number, number] => [X(x0), Z(z0), X(x1), Z(z1)];
  const pitH = hole(PIT[0], 0, PIT[1], 9);
  const trenchH = hole(TRENCH[0], 0, TRENCH[1], 9);
  const sumpH = hole(SUMP[0], SUMP[1], SUMP[2], SUMP[3]);
  const padH = hole(PAD_PIT[0], PAD_PIT[1], PAD_PIT[2], PAD_PIT[3]);
  slabWithHoles(b, X(-0.225), Z(-OUTER), X(52.225), Z(9 + OUTER), y, [pitH, trenchH, sumpH, padH], C.floor);
  pit(b, pitH, y, -M.pit, C.block);
  pit(b, trenchH, y, M.trenchDepth, C.block);
  pit(b, sumpH, y, -M.sump, C.block);
  pit(b, padH, y, -M.padPit, C.pad);
  // perimeter: north / south outside the bay box; west (A1) and east (A2) shared walls centred, with the door gaps
  wallXAt(b, Z(9 + OUTER / 2), X(-0.225), X(52.225), [], y, H, C.wall, OUTER);
  wallXAt(b, Z(-OUTER / 2), X(-0.225), X(52.225), [], y, H, C.wall, OUTER);
  wallZAt(b, X(0), Z(-OUTER), Z(9 + OUTER), [[Z(5.9), Z(7.1)]], y, H, C.wall, OUTER);
  headerZ(b, X(0), Z(5.9), Z(7.1), y, H, OUTER, C.wall);
  wallZAt(b, X(52), Z(-OUTER), Z(9 + OUTER), [[Z(2.9), Z(4.1)]], y, H, C.wall, OUTER);
  headerZ(b, X(52), Z(2.9), Z(4.1), y, H, OUTER, C.wall);

  // 2A: plinth 0.5 (x 2..3), rail 1.1 x 0.3 (x 5..5.3), block wall 1.7 (x 7.5..9.5): each wall to wall
  b.block(X(2.5), Z(4.5), 1, M.step, 9, C.plinth, y);
  b.block(X(5.15), Z(4.5), M.vaultThick, M.vault, 9, C.rail, y);
  b.block(X(8.5), Z(4.5), 2, M.mantle, 9, C.block, y);

  // 2B: G1 and G2, solid 4.0 blocks wall to wall; the pit between them (x 16..20, floor -1.0)
  for (const [x0, x1] of [G1, G2]) b.block(X((x0 + x1) / 2), Z(4.5), x1 - x0, M.gallery, 9, C.block, y);
  const gy = y + M.gallery;
  // 2B-1: the fixed ladder on G1's west face (z 4..5), caged from 2.0 to the head; G1's west edge a flush 2.4 glass
  // screen except the 1.2 m ladder head (A51: no boost onto G1)
  b.ladder(X(G1[0] - 0.4), Z(4.5), y, gy, Math.PI / 2);
  cage(b, X(G1[0] - 0.4), Z(4.5), Math.PI / 2, y + 2.0, gy + 0.2);
  glass(b, X(G1[0]), Z(0), X(G1[0] + GLASS_T), Z(3.9), gy, SCREEN_H);
  glass(b, X(G1[0]), Z(5.1), X(G1[0] + GLASS_T), Z(9), gy, SCREEN_H);
  // 2B-3: the cable-support pipe at 6.5 across the pit (x 15.5..20.5, z 4.5)
  b.pipeH(X(15.5), Z(4.5), X(20.5), Z(4.5), y + M.pipe);
  // 2B-4: the pit's caged plant ladder up G1's east face (x 16, z 1) back to G1
  b.ladder(X(G1[1] + 0.4), Z(1), y + M.pit, gy, -Math.PI / 2);
  cage(b, X(G1[1] + 0.4), Z(1), -Math.PI / 2, y + M.pit + 2.0, gy + 0.2);
  // 2B-5: G2's east edge open on the hang point z 3.5..5 only (a manual lip: lower into a hang, hang-drop); flush 2.4
  // glass screens elsewhere; RL2 from 2C's floor up G2's east face (x 22, z 8.5) into a cage whose door is the return
  // turnstile (A61; a locked door until T7a builds the one-way rotor: UPPER_ELEMENTS)
  glass(b, X(G2[1] - GLASS_T), Z(0), X(G2[1]), Z(3.5), gy, SCREEN_H);
  glass(b, X(G2[1] - GLASS_T), Z(5), X(G2[1]), Z(CAGE[1]), gy, SCREEN_H);
  b.ledge(X(G2[1]), Z(3.5), X(G2[1]), Z(5), gy, { drop: M.gallery, canHang: true, canClimbUp: true });
  b.ladder(X(G2[1] + 0.4), Z(8.5), y, gy, -Math.PI / 2);
  glass(b, X(CAGE[0]), Z(CAGE[1]) - GLASS_T, X(G2[1]), Z(CAGE[1]), gy, SCREEN_H);
  const tsFrom = b.boxes.length;
  wallZAt(b, X(CAGE[0]), Z(CAGE[1]), Z(9), [[Z(7.7), Z(8.9)]], gy, SCREEN_H, C.steel, GLASS_T);
  headerZ(b, X(CAGE[0]), Z(7.7), Z(8.9), gy, SCREEN_H, GLASS_T, C.steel);
  b.mark(tsFrom, { noLedge: true });
  r.doors['B2-rl2'] = b.door(X(CAGE[0]), gy, Z(7.7), DOOR_W, 0, { locked: true }).id;

  // 2C: sprint strip, the trench (x 27..28.2, 2.0 deep, step irons on its near side only), the strip on
  b.ladder(X(TRENCH[0] + 0.35), Z(4.5), y - M.trenchDepth, y, -Math.PI / 2);
  // 2C-2: the cast-iron downpipe on the cross wall (x 33.9, z 0.8) up to L1
  b.pipeV(X(CW[0] - 0.1), Z(0.8), y, y + M.beam, Math.PI / 2);
  // the cross wall (x 34..34.45) full height with the cable portal (z 7.2..9.0, y 5.0..7.1); the column (x 33..34,
  // z 3.85..4.85) on it; the sill 0.7 deep (x 33.75..34.45) from the sump floor, its top level with L1
  const cwx = (CW[0] + CW[1]) / 2;
  wallZAt(b, X(cwx), Z(0), Z(9), [[Z(PORTAL_Z[0]), Z(PORTAL_Z[1])]], y, H, C.wall, CW[1] - CW[0]);
  const pz = (PORTAL_Z[0] + PORTAL_Z[1]) / 2;
  const pw = PORTAL_Z[1] - PORTAL_Z[0];
  b.box(X(cwx), y + (PORTAL_TOP + H) / 2, Z(pz), CW[1] - CW[0], H - PORTAL_TOP, pw, C.wall);
  b.box(X((LIP_X + CW[1]) / 2), y + (M.sump + M.sill) / 2, Z(pz), CW[1] - LIP_X, M.sill - M.sump, pw, C.wall);
  b.box(X(CW[0] - 0.5), y + H / 2, Z((COL_Z[0] + COL_Z[1]) / 2), 1, H, COL_Z[1] - COL_Z[0], C.wall);
  // 2C-3 / 2C-4: L1 beam (0.25) along the wall from z 1, round the column's south, west and north faces, a 0.3 stub
  const bt = y + M.beam;
  const by = bt - 0.125;
  const zS = COL_Z[0] - WRAP;
  const zN = COL_Z[1] + WRAP;
  const xW = CW[0] - 1 - WRAP;
  b.box(X(LIP_X + WRAP / 2), by, Z((L1_Z0 + zS) / 2), WRAP, 0.25, zS - L1_Z0, C.beam);
  b.box(X((xW + CW[0]) / 2), by, Z(zS + WRAP / 2), CW[0] - xW, 0.25, WRAP, C.beam);
  b.box(X(xW + WRAP / 2), by, Z((zS + zN) / 2), WRAP, 0.25, zN - zS, C.beam);
  b.box(X((xW + CW[0]) / 2), by, Z(zN - WRAP / 2), CW[0] - xW, 0.25, WRAP, C.beam);
  b.box(X(LIP_X + WRAP / 2), by, Z((zN + STUB_Z1) / 2), WRAP, 0.25, STUB_Z1 - zN, C.beam);
  // the lips (each a -> b so its normal points out of the wall: listed south to north, built reversed), linked end to end
  const lip = (ax: number, az: number, bx: number, bz: number, top: number, drop: number, climb: boolean): Ledge =>
    b.ledge(X(bx), Z(bz), X(ax), Z(az), top, { drop, canHang: true, canClimbUp: climb });
  link([
    lip(LIP_X, L1_Z0, LIP_X, zS, bt, M.beam, false),
    lip(LIP_X, zS, xW, zS, bt, M.beam, false),
    lip(xW, zS, xW, zN, bt, M.beam, false),
    lip(xW, zN, LIP_X, zN, bt, M.beam, false),
    lip(LIP_X, zN, LIP_X, STUB_Z1, bt, M.beam, false),
  ]);
  // 2C-5: the portal sill (L2), climb up; a 0.5 step down inside onto the deck
  lip(LIP_X, PORTAL_Z[0], LIP_X, PORTAL_Z[1], y + M.sill, M.sill - M.sump, true);

  // 2D: deck P (x 34.45..38, top 4.5) wall to wall; pads S (2.5) and R (1.3) under its east edge; the pad pit (-0.5)
  // with a plant ladder up the deck's east face (x 38, z 8) to repeat a drop
  b.block(X((CW[1] + DECK_X1) / 2), Z(4.5), DECK_X1 - CW[1], M.deck, 9, C.block, y);
  b.block(X(39.5), Z(1.5), 3, M.padSoft - M.padPit, 3, C.pad, y + M.padPit);
  b.block(X(39.5), Z(4.5), 3, M.padRoll - M.padPit, 3, C.pad, y + M.padPit);
  b.ladder(X(DECK_X1 + 0.4), Z(8), y + M.padPit, y + M.deck, -Math.PI / 2);

  // 2E: the window wall (no door) from the pad pit floor: one open window, two glazed practice panes (re-glaze: T7a)
  const wy = y + M.padPit;
  const gaps = WINDOWS.map((w) => [Z(w.z - 0.6), Z(w.z + 0.6)] as const);
  wallZAt(b, X(WIN_X), Z(0), Z(9), gaps, wy, H - M.padPit, C.wall);
  for (const w of WINDOWS) windowZ(b, X(WIN_X), Z(w.z), wy, H - M.padPit, C.wall, { open: w.open, breakable: !w.open });
  // 2F: floor marks "stop on the line" (x 48), "turn" (x 49.5)
  b.box(X(48), y + 0.01, Z(4.5), 0.1, 0.02, 8.6, C.mark, 0, 0, false);
  b.box(X(49.5), y + 0.01, Z(4.5), 0.1, 0.02, 8.6, C.mark, 0, 0, false);

  // LED strips under the lips (accent, visual: T6)
  led(b, X(G1[0]), Z(0.1), X(G1[1]), Z(0.1), gy - 0.05);
  led(b, X(G2[0]), Z(0.1), X(G2[1]), Z(0.1), gy - 0.05);
  led(b, X(LIP_X), Z(L1_Z0), X(LIP_X), Z(zS), bt - 0.28);
  led(b, X(DECK_X1), Z(0.1), X(DECK_X1), Z(8.9), y + M.deck - 0.05);
  roof(b, X(-0.225), Z(-OUTER), X(52.225), Z(9 + OUTER), y + H);

  r.debug.push(
    { id: 'B2', label: 'B2 The Lanes: 2A (west end)', pos: at('B2', 1, 4.5), yaw: Math.PI / 2 },
    { id: 'B2-2B', label: 'B2 2B ladder foot', pos: at('B2', 11.5, 4.5), yaw: Math.PI / 2 },
    { id: 'B2-G1', label: 'B2 gallery G1', pos: at('B2', 15, 2, M.gallery), yaw: Math.PI / 2 },
    { id: 'B2-pit', label: 'B2 pit catcher', pos: at('B2', 18, 7, M.pit), yaw: Math.PI / 2 },
    { id: 'B2-G2', label: 'B2 gallery G2', pos: at('B2', 21, 2, M.gallery), yaw: Math.PI / 2 },
    { id: 'B2-2C', label: 'B2 2C sprint strip', pos: at('B2', 24, 4.5), yaw: Math.PI / 2 },
    { id: 'B2-2C-E', label: 'B2 2C east (downpipe)', pos: at('B2', 31, 2), yaw: Math.PI / 2 },
    { id: 'B2-deck', label: 'B2 deck P', pos: at('B2', 36, 4.5, M.deck), yaw: Math.PI / 2 },
    { id: 'B2-2D', label: 'B2 pad pit', pos: at('B2', 43, 7, M.padPit), yaw: Math.PI / 2 },
    { id: 'B2-2F', label: 'B2 2F (stop line)', pos: at('B2', 50, 6), yaw: -Math.PI / 2 },
  );
  for (const x of [5, 18, 28, 36, 44, 49.5]) b.light({ ...at('B2', x, 4.5, 8.5), radius: 12, intensity: 0.8 });
}

/**
 * Build the Upper level into `b`. Returns doors (course ids -> anchor ids), course devices (none: B1 and B2 have no
 * gates in v2), the two lift spawns and the debug points. Afterwards every Upper box is `noLedge`.
 */
export function buildUpper(b: LevelBuilder): UpperResult {
  const r: UpperResult = { doors: {}, devices: {}, spawns: [], debug: [] };
  const from = b.boxes.length;
  buildB1(b, r);
  buildAirlock(b, 'A1', r);
  buildB2(b, r);
  buildAirlock(b, 'A2', r);
  for (let k = from; k < b.boxes.length; k++) b.boxes[k]!.noLedge = true;
  return r;
}
