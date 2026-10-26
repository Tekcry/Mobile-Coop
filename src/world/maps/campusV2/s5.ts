// (campus-greybox, v2 lane S5) Copied from `campusS5.ts` at P0; the S5 lane's greybox. Built only when `flags.campusV2` names 5.
import { Vector3 } from '../../../core/babylon';
import { GLASS_COLOR, type LevelBuilder } from '../../levelBuilder';
import type { RoomDef } from '../../rooms';
import type { MapLayout } from '../../mapDef';
import type { LaserDef } from '../../../game/jammer';
import type { LaserPanelDef } from '../../../game/laserPanels';
import type { BoardDef } from '../../../game/isolators';
import { makeCone } from '../../lights';
import { hyp2 } from '../../../core/mathx';
import type { CoopLip } from '../campusS1';
import { buildEdgeCaps, type EdgeCap } from './edgeCaps';

/**
 * Saltmarsh Park (`campusOps`) section 5 - the Old House and the extraction (`docs/sector-redesign/briefs/SLICE5.md`,
 * SPEC "S5"). A greybox: boxes, lamps, switches, the board, the laser and its panel, hide spots and nav seeds; no
 * dressing, no pickups. Frame: x west to east, z south to north, y up, metres; yaw 0 = +z, PI / 2 = +x. Every piece is
 * an axis-aligned box (yaw 0) but the stair ramps.
 *
 * Plan: the main block x -56..-32, z 18..44 (G 0, L1 4.2, roof 8.4) holds the control room and the drawing room (west),
 * the stair hall with its gallery (centre), the west passage, the light well, the plate store, the anteroom, the
 * strongroom, the shaft, the vestibule, the back corridor and the service stair (east); L1 holds the boardroom, the CEO
 * suite, the gallery, the archive with its cage, and the back landing. The service wing x -32..-26 (one storey, low roof
 * 4.2) holds the plant room, the lobby (the C4 far door) and the kitchen. The walled garden x -70..-56, the terrace
 * z 44..50, the lawn z 50..58 and the jetty to z 66 make the grounds.
 *
 * The service stair is S2's fire-stair core copied (private: `campusS2.ts` is not edited) with floors [0, 4.2, 8.4].
 */

const PI = Math.PI;
const T = 0.3;
const P = 0.2;
const WALL = '#a9a496';
const WALL_DARK = '#6f6b60';
const STEEL = '#55606a';
const SLAB = '#7d8386';
const ROOF = '#4a4f55';
const DESK = '#8a6a4c';
const STAIR = '#8d9296';
const GROUND_COVER = '#5d6b4a';
const TREE = '#4a5d3a';
const VAN = '#8a8f93';
const WHITE: [number, number, number] = [1, 0.95, 0.88];
/** The warm lamp colour (S1's, `campusS1.ts:25`): social / objective light. */
const WARM: [number, number, number] = [1, 0.72, 0.38];
const DOOR_H = 2.1;

/** Storey heights: the L1 floor's top, the roof's top; the partitions' tops under the slabs. */
export const S5_L1 = 4.2;
export const S5_ROOF = 8.4;
const G_TOP = 4.0;
const L_TOP = 8.2;
/** The service stair's bulkhead top. */
export const S5_BULKHEAD_TOP = 11.0;
/** The service stair's floors: G, L1, the roof. */
export const S5_FLOORS = [0, S5_L1, S5_ROOF] as const;
/**
 * (campus-fence-s2s5) The anti-climb caps (`buildEdgeCaps`). The roof kit boxes (top 9.39) stand against the main roof's
 * 1.9 south parapet and the wing's (5.0 / 5.19) against its 1.9 south and east parapets: a mantle onto a box, then over
 * the parapet, lands outside S5. Off the SW kit box a jump over the 1.1 west parapet clears the garden's 2.8 south wall.
 * At the wing's NE corner the 0.2 gutter kerb (4.4) is a mantle onto the east parapet, and a jump off the low roof there
 * clears the 2.8 estate wall. A sheet on the south line (the garden wall from 2.8, the parapets from their tops) up to
 * 12.0 (over a kit box's mantle, 9.39 + 1.8), on the wing's east parapet from 6.1 and the estate wall's first 6 m from
 * 2.8 up to 8.5 (over the low roof's jump and mantle). The rappels, the kerb's lips and the wing's north drop are untouched.
 */
export const S5_EDGE_CAPS: readonly EdgeCap[] = [
  [-70, 18.1, -56, 18.1, 2.8, 12],
  [-56, 18.1, -32, 18.1, 10.3, 12],
  [-32, 18.1, -26, 18.1, 6.1, 12],
  [-26.1, 18, -26.1, 44, 6.1, 8.5],
  [-26, 44, -26, 50, 2.8, 8.5],
];

/** The lamp circuits of section 5 (brief "Lighting"); (P2, job PLAN section 2) the new circuits in S5's band 150-159. */
export const S5_GROUPS = {
  chand: 80,
  gal: 81,
  board: 82,
  ante: 83,
  garden: 84,
  ctl: 85,
  kitchen: 86,
  roof: 87,
  hall: 88,
  ceo: 89,
  draw: 150,
  back: 151,
  plant: 152,
  lobby: 153,
  arch: 154,
  landing: 155,
  stair: 156,
  /** The van's work light: its own battery, no switch (shot only). */
  van: 157,
} as const;

/** The doors the sector data and the tests find by centre (`Doors.nearest`): [x, z]. */
export const S5_DOORS = {
  /** C4's far door: the service lobby's east wall (the S1 test asserts it). */
  c4Far: [-26, 29] as [number, number],
  front: [-44, 18] as [number, number],
  hallWest: [-50, 27] as [number, number],
  drawEast: [-50, 33] as [number, number],
  drawWest: [-56, 40] as [number, number],
  anteHall: [-43, 32] as [number, number],
  /** (P1, G3) The anteroom's side door from the back hall (x -37). */
  anteSide: [-37, 34] as [number, number],
  /** (P1, G4 / G6) The shaft door in the anteroom's north wall; the strongroom day gate beside it (an open gap). */
  anteShaft: [-39.5, 38.5] as [number, number],
  // sync-s5-strongkey reserved: day gate (-43, 38.5)
  dayGate: [-43, 38.5] as [number, number],
  lobbyWest: [-32, 29] as [number, number],
  lobbyNorth: [-27.5, 32] as [number, number],
  lobbySouth: [-30.5, 26.5] as [number, number],
  kitchenBack: [-29, 44] as [number, number],
  /** (P1, G7) The kitchen's west door into the back hall. */
  kitchenWest: [-33, 36.5] as [number, number],
  /** (P1, G10) The control room's garden door. */
  ctlGarden: [-56, 22] as [number, number],
  /** (P1, L6) The boardroom <-> CEO suite door (L1). */
  boardCeo: [-53, 30] as [number, number],
  gate: [-63, 44] as [number, number],
  /** The service stair's doors (G, L1 and the roof, all at this plan point). */
  core: [-35, 38.1] as [number, number],
  archSouth: [-40.5, 32] as [number, number],
  /** kp-arch (the keypad door), the cage's pair gate pg-arch and the hoist door onto the well (CR7). */
  kpArch: [-38, 35.5] as [number, number],
  pgArch: [-41.5, 39.6] as [number, number],
  hoist: [-46, 36.0] as [number, number],
  boardEast: [-50, 27] as [number, number],
  ceoEast: [-50, 31] as [number, number],
} as const;

/** The plan boxes the tests read: [x0, z0, x1, z1] (and the top where it matters). */
export const S5_BOX = {
  foot: [-70, 18, -26, 70] as const,
  main: [-56, 18, -32, 44] as const,
  wing: [-32, 18, -26, 44] as const,
  garden: [-70, 18, -56, 44] as const,
  terrace: [-70, 44, -26, 50] as const,
  lawn: [-70, 50, -26, 58] as const,
  hallVoid: [-47, 18, -41, 29] as const,
  well: [-50, 34, -46, 38] as const,
  shaft: [-40.5, 38.5, -38.5, 40.5] as const,
  cage: [-41.5, 38, -38, 41] as const,
  /** (P1, L3) The archive's free-standing row and the north wall shelving (2.2, noLedge). */
  stacks: [[-45.9, 40.4, -43, 41.2], [-45.9, 43.2, -43, 43.9]] as const,
  stacksTop: 2.2,
  token: [-43.6, 43.2, -42.4, 43.8] as const,
  /** The control room's rack rows (z centres; x -56..-51.6, 0.3 thick, 2.2 high) and the gallery's screens (x0, x1, z0, z1; 2.2 high on L1). */
  racks: [21.0, 23.8, 26.9] as const,
  screens: [[-47.4, -47.1, 18, 21.6], [-40.9, -40.6, 18, 21.6]] as const,
  anteroom: [-46, 32, -37, 38.5] as const,
  strongroom: [-46, 38.5, -40.5, 44] as const,
  /** (P1, G1) The hall's timber screen (x0, z0, x1, z1; 2.2 high) and the screens passage's two settles (1.2). */
  screen: [-38.1, 21, -37.9, 29] as const,
  settles: [[-32.6, 22.5, -32.0, 24], [-32.6, 26.5, -32.0, 28]] as const,
  /** (P1, L3) The archive's plan chest (1.2). */
  chest: [-44.5, 34.5, -43, 35.5] as const,
  /** (P1, L5) The archive rooflight in the roof slab: the open hatch (south 1.2 m) over its ladder and the fixed wired glass. */
  rooflight: [-45.85, 32.4, -44.65, 35.4] as const,
  rooflightHatch: [-45.85, 32.4, -44.65, 33.6] as const,
  /** (P1, L9) The low roof's two hatches: the kitchen smoke hatch (its 0.2 kerb outside) and the plant-room flue hatch. */
  smokeHatch: [-28.6, 41.4, -27.4, 42.6] as const,
  plantHatch: [-27.6, 18.9, -26.4, 20.1] as const,
  /** The jetty deck (top 0.3) and the boathouse (3.0). */
  deck: [-47, 58, -43, 66] as const,
  deckTop: 0.3,
  boathouse: [-54, 58, -49, 64] as const,
  van: [-30.5, 52, -27.5, 57] as const,
  extract: [-50, 60, -40, 66] as const,
  /** The low roof over the wing (top 4.2). */
  lowRoof: [-32, 18, -26, 44] as const,
  chimneys: [[-53, 22], [-53, 36], [-41, 24], [-36, 21]] as const,
  rappel: { x: -54, z: 44.15 },
  /** (P1, R2) The west rappel point over the garden (facing -x). */
  rappelWest: { x: -56.15, z: 31 },
  trees: [[-65, 52], [-62, 53.5], [-65, 55.5], [-61, 56.5], [-57, 58], [-53, 57]] as const,
} as const;

/** The hoist door's sill over the well (CR7): the rope's edge, 4.2 over the well floor. */
export const S5_ROPE_EDGE = { x: -46.15, z: 36.0, y: 4.2, n: { x: -1, z: 0 }, floor: 0 } as const;

/**
 * (P4, D:167-188) The co-op-only lips of section 5: CR8-s5 the low roof's 0.2 gutter kerb over the lawn (a boost from the
 * lawn 1.5 m east of the kitchen back door, P11), CR9-s5 the roof's 0.2 coping over the low roof (a boost from the low roof),
 * CR10-s5 the smoke hatch's west kerb over the kitchen (a boost from the floor under the hatch). Each lip is 4.4 over its
 * boost floor with no solo stand-on in reach. The campus list `CAMPUS_COOP_LIPS` is built once in `campusLips.ts`.
 */
export const S5_COOP_LIPS: readonly CoopLip[] = [
  {
    id: 'CR8-s5',
    section: 4,
    lip: { x: -27.5, z0: 44.15, z1: 44.15, y: 4.4, n: { x: 0, z: 1 } },
    top: { x0: -32, x1: -26, z0: 18, z1: 44, top: 4.2 },
    boost: { floor: 0, x: -27.5, z: 44.75 },
    solo: 'the plant-room flue ladder, or the service stair to the roof and the coping drop',
  },
  {
    id: 'CR9-s5',
    section: 4,
    lip: { x: -31.85, z0: 30, z1: 33, y: 8.6, n: { x: 1, z: 0 } },
    top: { x0: -56, x1: -32, z0: 18, z1: 44, top: 8.4 },
    boost: { floor: 4.2, x: -31.25, z: 31.5 },
    solo: 'the service stair to the roof bulkhead',
  },
  {
    id: 'CR10-s5',
    section: 4,
    lip: { x: -28.6, z0: 41.4, z1: 42.6, y: 4.4, n: { x: 1, z: 0 } },
    top: { x0: -32, x1: -26, z0: 18, z1: 44, top: 4.2 },
    boost: { floor: 0, x: -28.0, z: 42.0 },
    solo: 'the plant-room flue ladder to the low roof',
  },
];

/** (P4, job A17) The true plan segment of the x-running co-op lip (`S5_COOP_LIPS` writes it point-style). */
export const S5_LIP_SEGMENTS: Record<string, { a: [number, number]; b: [number, number] }> = {
  'CR8-s5': { a: [-32, 44.15], b: [-26, 44.15] },
};

/** One stair flight as `LevelBuilder.stairs` takes it (centre, width, length, rise, yaw, base height). */
export interface Flight {
  cx: number;
  cz: number;
  w: number;
  len: number;
  rise: number;
  yaw: number;
  y0: number;
  steps: number;
}

/** A fire-stair core (S2's): the clear interior, the end that holds the floor landings, and the door. */
export interface Core {
  id: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  near: 'N' | 'S';
  door: { wall: 'E' | 'S'; c: number };
}

/** The service stair: interior x -36.3..-33.7, z 38.2..43.8, the landings at the south end, the doors at (-35, 38.1). */
export const S5_CORE: Core = { id: 's5', x0: -36.3, x1: -33.7, z0: 38.2, z1: 43.8, near: 'S', door: { wall: 'S', c: -35.0 } };
const NEAR_D = 1.2;
const FAR_D = 0.8;
/** (P1, R4) The bulkhead's two clear wired-glass lights: the west face (z0..z1) and the north face (x0..x1), y 9.4..10.3. */
export const S5_BULKHEAD_LIGHTS = { west: { z0: 40.7, z1: 41.3, y0: 9.4, y1: 10.3 }, north: { x0: -35.3, x1: -34.7, y0: 9.4, y1: 10.3 } } as const;
/** The core's footprint with its walls (the slabs leave it open). */
export const S5_CORE_FOOT: Rect = [S5_CORE.x0 - 0.2, S5_CORE.x1 + 0.2, S5_CORE.z0 - 0.2, S5_CORE.z1 + 0.2];

/** The core's flights (the west half up from the near end, the east half back to it), S2's `coreFlights` on [0, 4.2, 8.4]. */
export function coreFlights(c: Core): Flight[] {
  const dir = c.near === 'N' ? -1 : 1;
  const nearZ = c.near === 'N' ? c.z1 : c.z0;
  const len = c.z1 - c.z0 - NEAR_D - FAR_D;
  const zc = nearZ + dir * (NEAR_D + len / 2);
  const xm = (c.x0 + c.x1) / 2;
  const w = (c.x1 - c.x0) / 2;
  const out: Flight[] = [];
  for (let s = 0; s < S5_FLOORS.length - 1; s++) {
    const f = S5_FLOORS[s]!;
    const half = (S5_FLOORS[s + 1]! - f) / 2;
    const steps = Math.round(half / 0.18);
    out.push({ cx: (c.x0 + xm) / 2, cz: zc, w, len, rise: half, yaw: dir > 0 ? 0 : PI, y0: f, steps });
    out.push({ cx: (xm + c.x1) / 2, cz: zc, w, len, rise: half, yaw: dir > 0 ? PI : 0, y0: f + half, steps });
  }
  return out;
}

/**
 * (P1, G9) The hall stair, 2.4 wide (built like S2's feature stair): two flights of 13 risers (0.162 / 0.283) and a 2.0
 * landing, z 20.2 at 0 to z 29.0 at 4.2 (the foot 2.2 m inside the front door), up to the gallery's north arm.
 */
export const S5_HALL_FLIGHTS: readonly Flight[] = [
  { cx: -45, cz: 21.9, w: 2.4, len: 3.4, rise: 2.1, yaw: 0, y0: 0, steps: 13 },
  { cx: -45, cz: 27.3, w: 2.4, len: 3.4, rise: 2.1, yaw: 0, y0: 2.1, steps: 13 },
];
/** The hall stair's landing (x0, x1, z0, z1, top 2.1) and its rails' centre lines (1.1 high, 0.1 thick). */
export const S5_HALL_LANDING = { x0: -46.2, x1: -43.8, z0: 23.6, z1: 25.6, top: 2.1 } as const;
export const S5_HALL_RAIL_X = [-46.25, -43.75] as const;

/** Every flight of the section: the test's nav raster reads the ramps from here. */
export const S5_FLIGHTS: readonly Flight[] = [...coreFlights(S5_CORE), ...S5_HALL_FLIGHTS];

/** Section 5's rooms (HUD tags; no squads). Stacked rooms carry their storey; none overlap. */
export const S5_ROOMS: RoomDef[] = [
  { id: 's5-ctl', name: 'Control Room', minX: -56, maxX: -50, minZ: 18, maxZ: 30, maxY: 4.1 },
  { id: 's5-draw', name: 'Drawing Room', minX: -56, maxX: -50, minZ: 30, maxZ: 44, maxY: 4.1 },
  // (P1, G1-G8) the hall takes the screens passage; the old west passage is its alcove ('s5-pass'); the back hall replaces
  // the vestibule and the back corridor's north end
  { id: 's5-hall', name: 'Stair Hall', minX: -50, maxX: -32, minZ: 18, maxZ: 32, maxY: 4.1 },
  { id: 's5-pass', name: 'Stair Hall', minX: -50, maxX: -46, minZ: 32, maxZ: 34, maxY: 4.1 },
  { id: 's5-ante', name: 'Anteroom', minX: -46, maxX: -37, minZ: 32, maxZ: 38.5, maxY: 4.1 },
  { id: 's5-strong', name: 'Strongroom', minX: -46, maxX: -40.5, minZ: 38.5, maxZ: 44, maxY: 4.1 },
  { id: 's5-back', name: 'Back Hall', minX: -37, maxX: -33, minZ: 32, maxZ: 38, maxY: 4.1 },
  { id: 's5-plant', name: 'Plant Room', minX: -32, maxX: -26, minZ: 18, maxZ: 26.5, maxY: 4.1 },
  { id: 's5-lobby', name: 'Service Lobby', minX: -32, maxX: -26, minZ: 26.5, maxZ: 32, maxY: 4.1 },
  { id: 's5-kitchen', name: 'Kitchen', minX: -33, maxX: -26, minZ: 32, maxZ: 44, maxY: 4.1 },
  { id: 's5-board', name: 'Boardroom', minX: -56, maxX: -50, minZ: 18, maxZ: 30, minY: 4.2, maxY: 8.3 },
  { id: 's5-ceo', name: 'CEO Suite', minX: -56, maxX: -50, minZ: 30, maxZ: 44, minY: 4.2, maxY: 8.3 },
  { id: 's5-gal', name: 'Gallery', minX: -50, maxX: -38, minZ: 18, maxZ: 32, minY: 4.2, maxY: 8.3 },
  { id: 's5-arch', name: 'Archive', minX: -46, maxX: -38, minZ: 32, maxZ: 44, minY: 4.2, maxY: 8.3 },
  { id: 's5-landing', name: 'Back Landing', minX: -38, maxX: -32, minZ: 32, maxZ: 38, minY: 4.2, maxY: 8.3 },
  { id: 's5-low', name: 'Service Roof', minX: -32, maxX: -26, minZ: 18, maxZ: 44, minY: 4.2, maxY: 8.3 },
  { id: 's5-roof', name: 'Roof', minX: -56, maxX: -32, minZ: 18, maxZ: 44, minY: 8.4 },
  { id: 's5-garden', name: 'Walled Garden', minX: -70, maxX: -56, minZ: 18, maxZ: 44 },
  { id: 's5-terrace', name: 'Terrace', minX: -70, maxX: -26, minZ: 44, maxZ: 50 },
  { id: 's5-lawn', name: 'Lawn and Lane', minX: -70, maxX: -26, minZ: 50, maxZ: 58 },
  { id: 's5-jetty', name: 'Boathouse Jetty', minX: -70, maxX: -26, minZ: 58, maxZ: 70 },
].map((r) => ({ ...r, squad: [] }));

/**
 * The shaft landing beams (R5: an alarm stage, never damage; drawn in night vision): three beams across the shaft door's
 * opening on the anteroom side (the lift is out of use tonight, so the shaft is armed). (P2, D:24) across the moved door.
 */
export const S5_LASERS: LaserDef[] = [{ id: 'las-shaft', x1: -40.1, z1: 38.35, x2: -38.9, z2: 38.35, ys: [0.4, 0.9, 1.4], floorY: 0, label: 'Shaft landing beams', section: 4 }];

/**
 * The beams' power panel (one): on the cage's west face in the archive (L1), 1.4 over the floor: the far side for a solo,
 * the near side for CR6 (the partner jams it from the archive while the climber crosses the beams).
 */
export const S5_PANELS: LaserPanelDef[] = [{ id: 'panel-shaft', lasers: ['las-shaft'], x: -41.65, y: 5.6, z: 39.0, yaw: -PI / 2, section: 4, label: 'Shaft landing beams power' }];

/** The near-side points (feet) the panel is seen from (the unit test traces eye lines from them); (P2) derived: the archive
 *  floor 1.0-3.4 m off the moved panel. */
export const S5_PANEL_NEAR: Record<string, readonly (readonly [number, number, number])[]> = {
  'panel-shaft': [[-43.0, S5_L1, 39.0], [-42.5, S5_L1, 37.5], [-42.6, S5_L1, 42.2]],
};

/**
 * The timed boards (E4 isolators): the garden board in the kitchen on its west wall (moved with the wall, window 30) and
 * (P2, L7) the house board on the back landing's east wall (the anteroom and the hall wall lamps, window 45).
 */
export const S5_BOARDS: BoardDef[] = [
  // sync-s5-gardenboard (SY:53): circuit 84, the garden uplights, the bollards, the jetty lantern and the lane lamp
  { pos: new Vector3(-32.85, 0, 40.0), yaw: PI / 2, groups: [S5_GROUPS.garden], window: 30 },
  // sync-s5-houseboard (SY:52): circuits 83 (the anteroom, the strongroom, the audit lamp) and 88 (the hall wall lamps)
  { pos: new Vector3(-32.15, S5_L1, 35), yaw: -PI / 2, groups: [S5_GROUPS.ante, S5_GROUPS.hall], window: 45 },
];

/** Nav seeds: the hall, the strongroom, the gallery, the archive, the CEO suite, the boardroom, the garden, the terrace, the lawn, the jetty, the roof, the low roof. */
export const S5_NAV_SEEDS: Vector3[] = [
  new Vector3(-44, 0, 20.5),
  new Vector3(-43, 0, 40),
  new Vector3(-48.5, S5_L1, 24),
  new Vector3(-45.2, S5_L1, 39.5),
  new Vector3(-54, S5_L1, 38),
  new Vector3(-54, S5_L1, 22),
  new Vector3(-63, 0, 31),
  new Vector3(-48, 0, 47),
  new Vector3(-48, 0, 54),
  new Vector3(-45, 0.3, 62),
  new Vector3(-45, S5_ROOF, 30),
  new Vector3(-29, S5_L1, 30),
  new Vector3(-29, 0, 29),
  new Vector3(-34, 0, 28),
  // (P1) the back hall and the light well
  new Vector3(-35, 0, 35),
  new Vector3(-48, 0, 36),
];

/** Where a carried body can be hidden: the garden's corner, the plant room, the drawing room, the archive's corner, the roof, the lawn under the trees. */
export const S5_HIDESPOTS: NonNullable<MapLayout['hideSpots']> = [
  { pos: new Vector3(-68.5, 0, 19.5) },
  { pos: new Vector3(-27.2, 0, 21) },
  { pos: new Vector3(-54.5, 0, 42) },
  { pos: new Vector3(-40, S5_L1, 43.2) },
  { pos: new Vector3(-46, S5_ROOF, 30) },
  { pos: new Vector3(-67, 0, 56) },
];

/**
 * Light switches (Y is the floor the switch stands on): the chandelier's by the front door (in #12's view, the lure for
 * the gallery pair); the gallery's two; the boardroom's; the anteroom's in the hall by its door (the K4 lure, cut from
 * outside); the control room's; the kitchen's (P2: by its moved lobby door); the hall's wall lights (P2, G3: in the back
 * hall, the s5-k4 assist); the CEO suite's; (P2) the new circuits' by their rooms' doors: the drawing room, the back hall,
 * the plant room, the lobby, the archive, the back landing, the service stair and the roof (at the bulkhead door). The
 * garden circuit is the garden board; the van's light has no switch.
 */
export const S5_SWITCHES: NonNullable<MapLayout['switches']> = [
  { pos: new Vector3(-42.5, 0, 18.15), yaw: 0, group: S5_GROUPS.chand },
  { pos: new Vector3(-49.85, S5_L1, 19.0), yaw: PI / 2, group: S5_GROUPS.gal },
  { pos: new Vector3(-38.15, S5_L1, 19.0), yaw: -PI / 2, group: S5_GROUPS.gal },
  { pos: new Vector3(-50.15, S5_L1, 25.8), yaw: -PI / 2, group: S5_GROUPS.board },
  { pos: new Vector3(-44.2, 0, 31.85), yaw: PI, group: S5_GROUPS.ante },
  { pos: new Vector3(-50.15, 0, 28.2), yaw: -PI / 2, group: S5_GROUPS.ctl },
  { pos: new Vector3(-28.6, 0, 32.15), yaw: 0, group: S5_GROUPS.kitchen },
  { pos: new Vector3(-33.25, 0, 33.2), yaw: -PI / 2, group: S5_GROUPS.hall },
  { pos: new Vector3(-50.15, S5_L1, 32.3), yaw: -PI / 2, group: S5_GROUPS.ceo },
  { pos: new Vector3(-50.25, 0, 34.2), yaw: -PI / 2, group: S5_GROUPS.draw },
  { pos: new Vector3(-33.25, 0, 33.6), yaw: -PI / 2, group: S5_GROUPS.back },
  { pos: new Vector3(-29.5, 0, 26.25), yaw: PI, group: S5_GROUPS.plant },
  { pos: new Vector3(-26.3, 0, 30.2), yaw: -PI / 2, group: S5_GROUPS.lobby },
  { pos: new Vector3(-39.5, S5_L1, 32.25), yaw: 0, group: S5_GROUPS.arch },
  { pos: new Vector3(-34.0, S5_L1, 37.85), yaw: PI, group: S5_GROUPS.landing },
  { pos: new Vector3(-34.0, 0, 38.35), yaw: 0, group: S5_GROUPS.stair },
  { pos: new Vector3(-34.0, S5_ROOF, 38.35), yaw: 0, group: S5_GROUPS.roof },
];

/** One lamp of `S5_LIGHTS`: position, radius, intensity, circuit, an optional cone, fitting width and colour (default `WHITE`). */
export interface S5Lamp {
  x: number;
  y: number;
  z: number;
  r: number;
  i: number;
  group: number;
  cone?: ReturnType<typeof makeCone> | null;
  w?: number;
  color?: readonly [number, number, number];
}

const DOWN = makeCone(0, -1, 0, 1.15);
/** (P2, section 0.5 rule 4) The cone of a room's new fitting (the J17 rule of S2 G5c / S3 B8). */
const ROOM_CONE = makeCone(0, -1, 0, 1.2);

// PROVISIONAL - light-realism (J10) retunes these values. TODO(light-realism): replace with calibrated values.
/**
 * (campus-greybox P1, job BRIEF A19) Every lamp of section 5, in named lists; `buildCampusS5` draws every lamp from this
 * block and from nowhere else. The as-built lamps (`campusS5.ts` as built) keep their position, radius, intensity and
 * group; the plan's removals and dims are not built (Q2 "Never").
 */
export const S5_LIGHTS = {
  // ---- as built (B:601-612)
  chand: [{ x: -44, y: 6.5, z: 23.5, r: 12, i: 0.9, group: S5_GROUPS.chand, w: 0.7 }],
  gal: [[-48.7, 21], [-48.7, 27], [-46, 30.7], [-42, 30.7], [-39.2, 21], [-39.2, 27]].map(([x, z]) => ({ x: x!, y: 6.6, z: z!, r: 5, i: 0.8, group: S5_GROUPS.gal, w: 0.3 })),
  board: [21, 27].map((z) => ({ x: -53, y: 7.4, z, r: 6, i: 0.8, group: S5_GROUPS.board, cone: DOWN })),
  ante: [{ x: -43, y: 3.4, z: 34.5, r: 6, i: 0.8, group: S5_GROUPS.ante, cone: DOWN }],
  // (P2, G5, D:23) the one move kept: the strongroom moved north, so its lamp moves 1 m with it, warm (the objective)
  strong: [{ x: -43, y: 3.4, z: 41.5, r: 6, i: 0.8, group: S5_GROUPS.ante, cone: DOWN, color: WARM }],
  garden: [[-67, 25], [-59, 25], [-67, 37.2], [-59, 37.2]].map(([x, z]) => ({ x: x!, y: 0.3, z: z!, r: 6, i: 0.8, group: S5_GROUPS.garden, w: 0.3 })),
  bollards: [-64, -56, -48, -40, -34, -28].map((x) => ({ x, y: 0.8, z: 48.7, r: 4, i: 0.8, group: S5_GROUPS.garden, w: 0.3 })),
  ctl: [21, 27].map((z) => ({ x: -53, y: 3.4, z, r: 6, i: 0.8, group: S5_GROUPS.ctl, cone: DOWN })),
  kitchen: [35, 41].map((z) => ({ x: -29, y: 3.4, z, r: 6, i: 0.8, group: S5_GROUPS.kitchen, cone: DOWN })),
  roof: [{ x: -40, y: 9.6, z: 42.6, r: 4, i: 0.8, group: S5_GROUPS.roof, w: 0.3 }],
  hallWall: [[-48.7, 22], [-48.7, 28], [-39.3, 26], [-39.3, 30]].map(([x, z]) => ({ x: x!, y: 2.6, z: z!, r: 5, i: 0.8, group: S5_GROUPS.hall, w: 0.3 })),
  ceo: [34, 40].map((z) => ({ x: -53, y: 7.4, z, r: 6, i: 0.8, group: S5_GROUPS.ceo, cone: DOWN })),
  // ---- added (P2, G14 / L3 / R4: the plan's lamps with a job of their own). Warm = social / objective (D:104-107)
  audit: [{ x: -42.5, y: 1.3, z: 34.5, r: 3, i: 0.8, group: S5_GROUPS.ante, color: WARM, w: 0.2 }],
  reading: [{ x: -42.2, y: 6.6, z: 39.5, r: 4, i: 0.8, group: S5_GROUPS.arch, color: WARM, w: 0.3 }],
  lantern: [{ x: -45, y: 2.5, z: 62, r: 6, i: 0.8, group: S5_GROUPS.garden, color: WARM, w: 0.3 }],
  lane: [{ x: -36, y: 4.0, z: 56, r: 6, i: 0.8, group: S5_GROUPS.garden, cone: DOWN, w: 0.5 }],
  van: [{ x: -29, y: 2.7, z: 52, r: 6, i: 0.8, group: S5_GROUPS.van, w: 0.3 }],
  roofWalk: [-50, -40].map((x) => ({ x, y: 10.4, z: 42, r: 6, i: 0.8, group: S5_GROUPS.roof, w: 0.3 })),
  bulkhead: [{ x: -35, y: 10.6, z: 37.6, r: 6, i: 0.8, group: S5_GROUPS.roof, w: 0.3 }],
  // ---- added (P2, section 0.5 rule 4): rooms with no fitting get fittings (r 5, i 0.8, cone 1.2, w 0.4 at floor + 3.5;
  // derived: ceil(L / 8) fittings evenly on each room's long centre line); the service stair one per landing (r 4, i 0.7,
  // w 0.3, landing + 2.4; the roof one under the bulkhead lid)
  draw: [33.5, 40.5].map((z) => ({ x: -53, y: 3.5, z, r: 5, i: 0.8, group: S5_GROUPS.draw, cone: ROOM_CONE, w: 0.4 })),
  back: [{ x: -35, y: 3.5, z: 35, r: 5, i: 0.8, group: S5_GROUPS.back, cone: ROOM_CONE, w: 0.4 }],
  plant: [20.1, 24.4].map((z) => ({ x: -29, y: 3.5, z, r: 5, i: 0.8, group: S5_GROUPS.plant, cone: ROOM_CONE, w: 0.4 })),
  lobby: [{ x: -29, y: 3.5, z: 29.25, r: 5, i: 0.8, group: S5_GROUPS.lobby, cone: ROOM_CONE, w: 0.4 }],
  arch: [35, 41].map((z) => ({ x: -42, y: 7.7, z, r: 5, i: 0.8, group: S5_GROUPS.arch, cone: ROOM_CONE, w: 0.4 })),
  landing: [{ x: -35, y: 7.7, z: 35, r: 5, i: 0.8, group: S5_GROUPS.landing, cone: ROOM_CONE, w: 0.4 }],
  stair: [[2.4, 38.8], [4.5, 43.4], [6.6, 38.8], [8.7, 43.4], [10.6, 38.8]].map(([y, z]) => ({ x: -35, y: y!, z: z!, r: 4, i: 0.7, group: S5_GROUPS.stair, w: 0.3 })),
} satisfies Record<string, readonly S5Lamp[]>;

/** A visible lamp fitting (the glowing box), a real registry light, from an `S5_LIGHTS` entry. */
function lamp(b: LevelBuilder, l: S5Lamp): void {
  const w = l.w ?? 0.5;
  b.light({
    kind: l.cone ? 'spot' : 'lamp',
    x: l.x,
    y: l.y,
    z: l.z,
    radius: l.r,
    intensity: l.i,
    color: [...(l.color ?? WHITE)] as [number, number, number],
    cone: l.cone ?? null,
    group: l.group,
    on: true,
    destructible: true,
    electric: true,
    fixture: { sx: w, sy: 0.1, sz: w / 2, oy: 0 },
  });
}

/** A rectangle in plan: x0, x1, z0, z1. */
type Rect = [number, number, number, number];

/** `r` minus `h` as up to four rectangles. */
function subtract(r: Rect, h: Rect): Rect[] {
  if (h[1] <= r[0] || h[0] >= r[1] || h[3] <= r[2] || h[2] >= r[3]) return [r];
  const out: Rect[] = [];
  if (h[0] > r[0]) out.push([r[0], h[0], r[2], r[3]]);
  if (h[1] < r[1]) out.push([h[1], r[1], r[2], r[3]]);
  const x0 = Math.max(r[0], h[0]);
  const x1 = Math.min(r[1], h[1]);
  if (h[2] > r[2]) out.push([x0, x1, r[2], h[2]]);
  if (h[3] < r[3]) out.push([x0, x1, h[3], r[3]]);
  return out;
}

interface Flags {
  overhead?: boolean;
  noLedge?: boolean;
}

/** An axis-aligned box from its extents. */
function bx(b: LevelBuilder, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string, f: Flags = {}): void {
  b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
  const p = b.boxes[b.boxes.length - 1]!;
  if (f.overhead) p.overhead = true;
  if (f.noLedge) p.noLedge = true;
}

/** An opening in a wall: a..e along it, from y0 to y1; `door` openings get an overhead head. */
type Hole = readonly [a: number, e: number, y0: number, y1: number, door?: boolean];

/** A door opening centred on `c`, on the floor `y`. */
const dh = (c: number, y: number): Hole => [c - 0.6, c + 0.6, y, y + DOOR_H, true];

/**
 * A wall of thickness `th` centred on a line (along x at z when `alongX`, else along z at x), from a0 to a1 and y0 to y1,
 * cut by its openings: split into strips between the openings' edges, each strip solid where no opening covers it. Every
 * piece is noLedge; the head over a door opening is overhead (the nav grid reads the floor below as open).
 */
function wall(b: LevelBuilder, alongX: boolean, at: number, a0: number, a1: number, y0: number, y1: number, holes: readonly Hole[], th = P, color = WALL): void {
  const cuts = new Set<number>([a0, a1]);
  for (const h of holes) {
    if (h[0] > a0 && h[0] < a1) cuts.add(h[0]);
    if (h[1] > a0 && h[1] < a1) cuts.add(h[1]);
  }
  const xs = [...cuts].sort((p, q) => p - q);
  for (let i = 0; i + 1 < xs.length; i++) {
    const p = xs[i]!;
    const q = xs[i + 1]!;
    if (q - p < 1e-6) continue;
    const over = holes.filter((h) => h[0] <= p + 1e-6 && h[1] >= q - 1e-6 && h[3] > y0 && h[2] < y1).sort((u, v) => u[2] - v[2]);
    let y = y0;
    const solid: { u: number; v: number; head: boolean }[] = [];
    for (const h of over) {
      const lo = Math.max(y0, h[2]);
      const hi = Math.min(y1, h[3]);
      if (lo > y) solid.push({ u: y, v: lo, head: false });
      y = Math.max(y, hi);
      // a head: the next solid piece above this door opening
      if (h[4]) solid.push({ u: -1, v: -1, head: true });
    }
    if (y1 > y) solid.push({ u: y, v: y1, head: false });
    // fix the head markers: the piece after a door marker is its head
    const pieces: { u: number; v: number; head: boolean }[] = [];
    let nextHead = false;
    for (const s of solid) {
      if (s.u === -1) {
        nextHead = true;
        continue;
      }
      pieces.push({ ...s, head: nextHead });
      nextHead = false;
    }
    for (const s of pieces) {
      if (s.v - s.u < 1e-6) continue;
      if (alongX) bx(b, p, q, s.u, s.v, at - th / 2, at + th / 2, color, { noLedge: true, overhead: s.head });
      else bx(b, at - th / 2, at + th / 2, s.u, s.v, p, q, color, { noLedge: true, overhead: s.head });
    }
  }
}

/** A door anchor in a wall along x (at z) or along z (at x), centred on `c`, on floor `y`. */
function doorIn(b: LevelBuilder, alongX: boolean, at: number, c: number, y: number, o: { locked?: boolean; breachable?: boolean; swing?: 1 | -1; armoured?: boolean } = {}): void {
  const opts = { swing: o.swing ?? 1, ...(o.locked !== undefined ? { locked: o.locked } : {}), ...(o.breachable !== undefined ? { breachable: o.breachable } : {}), ...(o.armoured ? { armoured: true } : {}) };
  if (alongX) b.door(c - 0.6, y, at, 1.2, PI / 2, opts);
  else b.door(at, y, c - 0.6, 1.2, 0, opts);
}

/** A floor slab over `rect` minus `holes` (top at `top`, 0.2 thick), every piece overhead and noLedge. */
function slab(b: LevelBuilder, rect: Rect, top: number, holes: readonly Rect[], color = SLAB): void {
  let pieces: Rect[] = [rect];
  for (const h of holes) pieces = pieces.flatMap((r) => subtract(r, h));
  for (const r of pieces) {
    if (r[1] - r[0] < 0.01 || r[3] - r[2] < 0.01) continue;
    bx(b, r[0], r[1], top - 0.2, top, r[2], r[3], color, { overhead: true, noLedge: true });
  }
}

/** A steel guard rail (0.1 thick, 1.1 high) on a floor at `y`, noLedge. */
function rail(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, y: number, h = 1.1): void {
  bx(b, x0, x1, y, y + h, z0, z1, STEEL, { noLedge: true });
}

/** A furniture block resting on `y` (noLedge when 1.8 or over). */
function furn(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, h: number, color = DESK, y = 0): void {
  bx(b, x0, x1, y, y + h, z0, z1, color, h >= 1.8 ? { noLedge: true } : {});
}

/** One fire stair core (S2's `buildCore` over the floors [0, 4.2, 8.4]): walls with the door at G, L1 and the roof, the flights, the landings, the bulkhead roof. */
function buildCore(b: LevelBuilder, c: Core): void {
  const [fx0, fx1, fz0, fz1] = S5_CORE_FOOT;
  const gap: Hole = dh(c.door.c, 0);
  for (let s = 0; s < S5_FLOORS.length; s++) {
    const y0 = S5_FLOORS[s]!;
    const y1 = s < S5_FLOORS.length - 1 ? S5_FLOORS[s + 1]! : S5_BULKHEAD_TOP;
    const g: Hole = [gap[0], gap[1], y0, y0 + DOOR_H, true];
    // (P1, R4) the bulkhead's two wired-glass lights (0.6 x 0.9, y 9.4..10.3) in its west and north faces
    const roof = s === S5_FLOORS.length - 1;
    const [wl, nl] = [S5_BULKHEAD_LIGHTS.west, S5_BULKHEAD_LIGHTS.north];
    wall(b, false, c.x0 - 0.1, fz0, fz1, y0, y1, roof ? [[wl.z0, wl.z1, wl.y0, wl.y1]] : [], P, WALL_DARK);
    wall(b, false, c.x1 + 0.1, fz0, fz1, y0, y1, [], P, WALL_DARK);
    wall(b, true, c.z0 - 0.1, fx0, fx1, y0, y1, [g], P, WALL_DARK);
    wall(b, true, c.z1 + 0.1, fx0, fx1, y0, y1, roof ? [[nl.x0, nl.x1, nl.y0, nl.y1]] : [], P, WALL_DARK);
    if (roof) {
      b.glass(c.x0 - 0.1, wl.z0, c.x0 - 0.1, wl.z1, wl.y1 - wl.y0, wl.y0);
      b.glass(nl.x0, c.z1 + 0.1, nl.x1, c.z1 + 0.1, nl.y1 - nl.y0, nl.y0);
    }
    doorIn(b, true, c.z0 - 0.1, c.door.c, y0);
  }
  const dir = c.near === 'N' ? -1 : 1;
  const nearZ = c.near === 'N' ? c.z1 : c.z0;
  coreFlights(c).forEach((f) => b.stairs(f.cx, f.cz, f.w, f.len, f.rise, f.steps, STAIR, f.yaw, f.y0));
  const farMid = nearZ + dir * (c.z1 - c.z0 - FAR_D / 2);
  const nearMid = nearZ + dir * (NEAR_D / 2);
  const cx = (c.x0 + c.x1) / 2;
  const w = c.x1 - c.x0;
  const i0 = b.boxes.length;
  for (let s = 0; s < S5_FLOORS.length - 1; s++) {
    const f = S5_FLOORS[s]!;
    const top = S5_FLOORS[s + 1]!;
    b.box(cx, f + (top - f) / 2 - 0.1, farMid, w, 0.2, FAR_D, SLAB);
    b.box(cx, top - 0.1, nearMid, w, 0.2, NEAR_D, SLAB);
  }
  b.box(cx, S5_BULKHEAD_TOP - 0.1, (c.z0 + c.z1) / 2, w + 0.4, 0.2, c.z1 - c.z0 + 0.4, ROOF);
  b.mark(i0, { overhead: true, noLedge: true });
}

/** Everything of section 5: the main block, the wing, the grounds, the jetty, lamps, the laser's housings. */
export function buildCampusS5(b: LevelBuilder): void {
  const L1 = S5_L1;
  const R = S5_ROOF;

  // ---- the main block's shell (0.3): G band to the L1 slab, L1 band to the roof; the front door (locked, unbreachable),
  // the drawing room's and the control room's garden doors, the screens passage's door to the wing
  const outer = (alongX: boolean, at: number, a0: number, a1: number, g: readonly Hole[]): void => {
    wall(b, alongX, at, a0, a1, 0, L1, g, T);
    wall(b, alongX, at, a0, a1, L1, R, [], T);
  };
  outer(true, 18, -56, -32, [dh(-44, 0)]);
  outer(true, 44, -56, -32, []);
  // (P1, G10) the control room's garden door (-56, 22)
  outer(false, -56, 18, 44, [dh(22, 0), dh(40, 0)]);
  // (P1, G7) the G band on x -32 only on z 18..32 (the kitchen takes x -33..-32 at G); L1 and the roof stay on x -32
  wall(b, false, -32, 18, 32, 0, L1, [dh(29, 0)], T);
  wall(b, false, -32, 18, 44, L1, R, [], T);
  doorIn(b, true, 18, -44, 0, { locked: true, breachable: false, armoured: true }); // (E10) arm-front
  doorIn(b, false, -56, 40, 0);
  doorIn(b, false, -56, 22, 0, { swing: -1 });
  doorIn(b, false, -32, 29, 0);

  // ---- the service wing (one storey, 4.2): the south, north (kitchen back door) and east (C4's far door) walls, the low roof
  wall(b, true, 18, -32, -26, 0, L1, [], T);
  wall(b, true, 44, -32, -26, 0, L1, [dh(-29, 0)], T);
  wall(b, false, -26, 18, 44, 0, L1, [dh(29, 0)], T);
  doorIn(b, true, 44, -29, 0, { swing: -1 });
  doorIn(b, false, -26, 29, 0, { swing: -1 });
  // (P1, G8) plant | lobby on z 26.5 (door -30.5), lobby | kitchen on z 32 (door -27.5): the lobby doors off each other's line
  wall(b, true, 26.5, -32, -26, 0, G_TOP, [dh(-30.5, 0)]);
  wall(b, true, 32, -32, -26, 0, G_TOP, [dh(-27.5, 0)]);
  doorIn(b, true, 26.5, -30.5, 0);
  doorIn(b, true, 32, -27.5, 0);
  // (P1, L9) the low roof with the plant-room flue hatch and the kitchen smoke hatch
  const [ph0, phz0, ph1, phz1] = S5_BOX.plantHatch;
  const [sh0, shz0, sh1, shz1] = S5_BOX.smokeHatch;
  slab(b, [-32, -26, 18, 44], L1, [[ph0, ph1, phz0, phz1], [sh0, sh1, shz0, shz1]]);
  // parapets on the low roof: the east and south edges look over ground outside S5 (1.9); the north edge is the 0.2 gutter
  // kerb (CR8-s5: not noLedge). (fix 1) The co-op lip pieces are 0.40 deep, their lip faces kept: a lip climbs only off a
  // piece LEDGE.climbDepth (0.38) deep (`generateLedges` canClimbUp); their back faces (a 0.2 drop to the roof) hang nowhere
  rail(b, -26.2, -26.0, 18, 44, L1, 1.9);
  rail(b, -32, -26, 18, 18.2, L1, 1.9);
  bx(b, -32, -26, L1, L1 + 0.2, 43.75, 44.15, STEEL);
  // the smoke hatch kerb (0.2, 0.1 thick, outside the hole): the west piece is CR10-s5's lip (not noLedge; 0.4 thick, fix 1),
  // the others noLedge
  bx(b, sh0 - 0.4, sh0, L1, L1 + 0.2, shz0 - 0.1, shz1 + 0.1, STEEL);
  bx(b, sh1, sh1 + 0.1, L1, L1 + 0.2, shz0 - 0.1, shz1 + 0.1, STEEL, { noLedge: true });
  bx(b, sh0, sh1, L1, L1 + 0.2, shz0 - 0.1, shz0, STEEL, { noLedge: true });
  bx(b, sh0, sh1, L1, L1 + 0.2, shz1, shz1 + 0.1, STEEL, { noLedge: true });
  // (P1, G8) the flue ladder under the plant hatch: base 0.25 m inside the hatch's north rim, facing it (S1's hatch-ladder rule)
  b.ladder(-27, 19.85, 0, L1, 0);
  // the wing's rooms: the plant room's boiler, the kitchen counter (z 34..38: the board at z 40 stays reachable, L-log)
  furn(b, -31.5, -30.0, 19, 21, 2.0, STEEL);
  furn(b, -31.6, -30.8, 34, 38, 0.9);

  // ---- the walled garden (x -70..-56): south and north walls 2.8 noLedge, the gate in the north wall (a plain door)
  wall(b, true, 18, -70, -56, 0, 2.8, [], T);
  wall(b, true, 44, -70, -56, 0, 2.8, [dh(-63, 0)], T);
  doorIn(b, true, 44, -63, 0, { swing: -1 });
  // (P1, G12) the beds are 1.2 box hedges (low cover)
  bx(b, -68, -58, 0, 1.2, 26, 28, GROUND_COVER);
  bx(b, -68, -58, 0, 1.2, 34, 36, GROUND_COVER);

  // ---- the estate wall (x -26, z 44..70): the east boundary of the grounds
  wall(b, false, -26, 44, 70, 0, 2.8, [], T);
  // (campus-fence-s2s5) the anti-climb caps on the south line, the wing's east parapet and the estate wall's end (`S5_EDGE_CAPS`)
  buildEdgeCaps(b, S5_EDGE_CAPS);

  // ---- slabs: L1 (the hall's void, the well, the shaft, the service stair's footprint left open), the roof (the well, the
  // stair and the archive rooflight)
  const voidR: Rect = [-47, -41, 18, 29];
  const wellR: Rect = [-50, -46, 34, 38];
  const [sx0, sz0, sx1, sz1] = S5_BOX.shaft;
  const shaftR: Rect = [sx0, sx1, sz0, sz1];
  const [rx0, rz0, rx1, rz1] = S5_BOX.rooflight;
  slab(b, [-56, -32, 18, 44], L1, [voidR, wellR, shaftR, S5_CORE_FOOT]);
  slab(b, [-56, -32, 18, 44], R, [wellR, S5_CORE_FOOT, [rx0, rx1, rz0, rz1]], ROOF);
  // (P1, L5) the rooflight: the south 1.2 m an open hatch over its ladder on the archive's west wall, the north 1.8 m fixed
  // wired glass (clear: sight passes; overhead, noLedge)
  {
    const hz1 = S5_BOX.rooflightHatch[3];
    const i0 = b.boxes.length;
    b.box((rx0 + rx1) / 2, R - 0.025, (hz1 + rz1) / 2, rx1 - rx0, 0.05, rz1 - hz1, GLASS_COLOR, 0, 0, true, false);
    b.boxes[i0]!.glass = 'clear';
    b.mark(i0, { overhead: true, noLedge: true });
    b.ladder(-45.65, 33.0, L1, R, -PI / 2);
  }

  // ---- the service stair and the hall stair
  buildCore(b, S5_CORE);
  // (P1, G9) the hall stair: two flights and the 2.0 landing, rails 1.1 on both sides (pitched along the flights), noLedge
  {
    for (const f of S5_HALL_FLIGHTS) b.stairs(f.cx, f.cz, f.w, f.len, f.rise, f.steps, STAIR, f.yaw, f.y0);
    const L = S5_HALL_LANDING;
    bx(b, L.x0, L.x1, L.top - 0.2, L.top, L.z0, L.z1, STAIR, { noLedge: true });
    const i0 = b.boxes.length;
    const h = 1.1;
    for (const x of S5_HALL_RAIL_X) {
      for (const f of S5_HALL_FLIGHTS) {
        const pitch = -Math.atan2(f.rise, f.len);
        b.box(x, f.y0 + f.rise / 2 + (h / 2) * Math.cos(pitch), f.cz, 0.1, h, hyp2(f.len, f.rise), STEEL, f.yaw, pitch);
      }
      b.box(x, L.top + h / 2, (L.z0 + L.z1) / 2, 0.1, h, L.z1 - L.z0, STEEL);
    }
    b.mark(i0, { noLedge: true });
  }

  // ---- G partitions (0.2, to the L1 slab's underside) and the L1 partitions (to the roof slab's)
  // x -50: control room | hall (door -50, 27), drawing room | alcove (door -50, 33, swings into the drawing room), the well's
  // west wall, the plate store
  wall(b, false, -50, 18, 44, 0, G_TOP, [dh(27, 0), dh(33, 0)]);
  wall(b, false, -50, 18, 44, L1, L_TOP, [dh(27, L1), dh(31, L1)]);
  doorIn(b, false, -50, 27, 0);
  doorIn(b, false, -50, 33, 0, { swing: -1 });
  doorIn(b, false, -50, 27, L1);
  doorIn(b, false, -50, 31, L1);
  // z 30: control room | drawing room; L1: boardroom | CEO suite with (P1, L6) their connecting door (-53, 30)
  wall(b, true, 30, -56, -50, 0, G_TOP, []);
  wall(b, true, 30, -56, -50, L1, L_TOP, [dh(-53, L1)]);
  doorIn(b, true, 30, -53, L1);
  // (P1, G1) the screens passage: the x -38 partition is gone; a 2.2 timber screen z 21..29, open 3 m at each end, and two
  // 1.2 settles on the east wall. The passage x -38..-32 is part of the hall (one space)
  {
    const [x0, z0, x1, z1] = S5_BOX.screen;
    bx(b, x0, x1, 0, 2.2, z0, z1, DESK, { noLedge: true });
    for (const [a0, c0, a1, c1] of S5_BOX.settles) furn(b, a0, a1, c0, c1, 1.2);
  }
  // L1: the archive's east wall onto the landing, kp-arch (P1, L1: moved to z 35.5; its leaf swings into the landing)
  wall(b, false, -38, 32, 44, L1, L_TOP, [dh(35.5, L1)]);
  doorIn(b, false, -38, 35.5, L1);
  // z 32: the hall's north wall (the anteroom door -43, armoured: not breachable) and the stub east of the 3.5 m opening
  // (x -36.75..-33.25) into the back hall (P1, G2-G3: the alcove x -50..-46 open to the hall); L1: gallery | archive (door -40.5)
  wall(b, true, 32, -46, -36.75, 0, G_TOP, [dh(-43, 0)]);
  wall(b, true, 32, -33.25, -32, 0, G_TOP, []);
  wall(b, true, 32, -50, -38, L1, L_TOP, [dh(-40.5, L1)]);
  doorIn(b, true, 32, -43, 0, { breachable: false, armoured: true }); // (E10) arm-ante: bulletproof
  doorIn(b, true, 32, -40.5, L1);
  // (P1, G3) the back hall x -37..-33, z 32..38: its west wall with the anteroom side door (opens into the anteroom)
  wall(b, false, -37, 32, 38.5, 0, G_TOP, [dh(34, 0)]);
  doorIn(b, false, -37, 34, 0, { swing: -1 });
  // (P1, G7) the kitchen's west wall (x -33) with its door from the back hall
  wall(b, false, -33, 32, 44, 0, G_TOP, [dh(36.5, 0)]);
  doorIn(b, false, -33, 36.5, 0);
  // z 34: the alcove | the well; x -46: alcove, the well and the anteroom's west wall (the glazed screen and the sash), the
  // strongroom's; L1: the archive's west wall (the hoist door)
  wall(b, true, 34, -50, -46, 0, G_TOP, []);
  // (polish 6, L11) the sill 0.5, over the guards' nav step (0.45): no guard paths through the sash; the player vaults it.
  // (P1, G4) the hole widens to the 3.0 glazed screen z 34.5..37.5: clear glass either side of the kept 1.6 sash
  wall(b, false, -46, 32, 44, 0, G_TOP, [[34.5, 37.5, 0.5, 2.05]]);
  b.glass(-46, 34.5, -46, 34.7, 1.55, 0.5);
  b.glass(-46, 36.3, -46, 37.5, 1.55, 0.5);
  wall(b, false, -46, 32, 44, L1, L_TOP, [dh(36, L1)]);
  doorIn(b, false, -46, 36, L1);
  b.windowAt(-46, 1.275, 35.5, 1.6, 1.55, PI / 2, { sill: 0.5, open: true, breakable: false });
  // (P1, G4-G6) z 38.5: the anteroom's north wall: the strongroom day gate (-43) an open gap, the shaft door (-39.5)
  // strongroom day gate, open tonight (sync-s5-strongkey reserved: a mission that arms it adds the door and its keypad)
  wall(b, true, 38.5, -46, -37, 0, G_TOP, [dh(-43, 0), dh(-39.5, 0)]);
  doorIn(b, true, 38.5, -39.5, 0, { swing: 1 });
  // the strongroom / shaft west line x -40.5; the shaft (x -40.5..-38.5, z 38.5..40.5): east and north walls, the ladder up
  // to the cage's west strip (P3)
  wall(b, false, -40.5, 38.5, 44, 0, G_TOP, []);
  wall(b, false, -38.5, 38.5, 40.5, 0, G_TOP, []);
  wall(b, true, 40.5, -40.5, -38.5, 0, G_TOP, []);
  b.ladder(-40.25, 39.6, 0, L1, -PI / 2);
  // the audit table (D:22)
  furn(b, -43.5, -41.5, 34, 35, 0.9);
  // solid masses: the plate store (x -50..-46, z 38..44), the closet round the shaft (under the L1 slab), the corner and
  // the sliver beside the core, the L1 blocks (P1, L1: the landing strip x -38..-36.5, z 38..44 closed)
  bx(b, -50, -46, 0, L_TOP, 38, 44, WALL_DARK, { noLedge: true });
  bx(b, -40.5, -37, 0, G_TOP, 40.5, 44, WALL_DARK, { noLedge: true });
  bx(b, -38.5, -37, 0, G_TOP, 38.5, 40.5, WALL_DARK, { noLedge: true });
  bx(b, -37, -36.5, 0, G_TOP, 38, 44, WALL_DARK, { noLedge: true });
  bx(b, -33.5, -33.1, 0, G_TOP, 38, 44, WALL_DARK, { noLedge: true });
  bx(b, -33.5, -32, L1, R, 38, 44, WALL_DARK, { noLedge: true });
  bx(b, -38, -36.5, L1, R, 38, 44, WALL_DARK, { noLedge: true });
  bx(b, -38, -32, L1, R, 18, 32, WALL_DARK, { noLedge: true });
  bx(b, -50, -46, L1, R, 32, 34, WALL_DARK, { noLedge: true });
  // the well's rim on the roof (1.1); (P1, R3) the west rim's gate (z 35.4..36.6) over the cleaning ladder
  rail(b, -50, -46, 33.9, 34.0, R);
  rail(b, -50, -46, 38.0, 38.1, R);
  rail(b, -50, -49.9, 34, 35.4, R);
  rail(b, -50, -49.9, 36.6, 38, R);
  rail(b, -46.1, -46, 34, 38, R);
  // (P1, G11) the well's cleaning ladder on its west wall, 0 -> 8.4, 0.25 m off the wall face
  b.ladder(-49.65, 36, 0, R, -PI / 2);

  // ---- the gallery's rails (1.1) on the hall void's edges, the gap at the stair head (P1, G9: x -46.2..-43.8)
  rail(b, -47.1, -47.0, 18, 29, L1);
  rail(b, -41.0, -40.9, 18, 29, L1);
  rail(b, -47, -46.2, 29, 29.1, L1);
  rail(b, -43.8, -41, 29, 29.1, L1);
  // the display screens (2.2, noLedge) on each arm's south end beside the rail: each gallery guard's south stop is out of
  // the other arm's view (M8)
  for (const [x0, x1, z0, z1] of S5_BOX.screens) bx(b, x0, x1, L1, L1 + 2.2, z0, z1, WALL_DARK, { noLedge: true });

  // ---- (P1, L2) the cage (x -41.5..-38, z 38..41) over the moved shaft: 0.1 steel walls 4.2..8.2, the pair gate in its west
  // face (opening z 39.0..40.2; the leaf swings into the cage); the archive's east wall x -38 is the cage's east side
  wall(b, false, -41.45, 38, 41, L1, L_TOP, [[39.0, 40.2, L1, L1 + DOOR_H, true]], 0.1, STEEL);
  wall(b, true, 38.05, -41.5, -38, L1, L_TOP, [], 0.1, STEEL);
  wall(b, true, 40.95, -41.5, -38, L1, L_TOP, [], 0.1, STEEL);
  b.door(-41.45, L1, 39.0, 1.2, 0, { swing: 1 });
  // (P1, L3) the archive's free-standing row and wall shelving (2.2, noLedge), the plan chest (1.2)
  for (const [x0, z0, x1, z1] of S5_BOX.stacks) bx(b, x0, x1, L1, L1 + S5_BOX.stacksTop, z0, z1, STEEL, { noLedge: true });
  {
    const [x0, z0, x1, z1] = S5_BOX.chest;
    furn(b, x0, x1, z0, z1, 1.2, DESK, L1);
  }

  // ---- furniture: the control room's radio and CCTV racks (2.2, noLedge: three rows from the west wall, an aisle by the
  // east wall, so the standing team's three bays and the hall walk's bay screen each other, M8), the token table (0.9)
  for (const z of S5_BOX.racks) bx(b, -56, -51.6, 0, 2.2, z - 0.15, z + 0.15, STEEL, { noLedge: true });
  const [tx0, tz0, tx1, tz1] = S5_BOX.token;
  furn(b, tx0, tx1, tz0, tz1, 0.9);

  // ---- the roof: parapets (the south edge looks over ground outside S5: 1.9; the others 1.1), the rappels, the chimneys
  rail(b, -56, -32, 18, 18.2, R, 1.9);
  // (P1, R2) the west parapet splits round the garden rappel (z 30.4..31.6)
  rail(b, -56, -55.8, 18, 30.4, R);
  rail(b, -56, -55.8, 31.6, 44, R);
  // (P1, R1) the east parapet splits round the 0.2 coping z 30..33 (CR9-s5: not noLedge; on the wall top, flush with its face;
  // 0.4 deep into the roof, fix 1)
  rail(b, -32.2, -32, 18, 30, R);
  rail(b, -32.2, -32, 33, 44, R);
  bx(b, -32.25, -31.85, R, R + 0.2, 30, 33, STEEL);
  rail(b, -56, -54.6, 43.8, 44, R);
  rail(b, -53.4, -32, 43.8, 44, R);
  b.rappel(S5_BOX.rappel.x, R, S5_BOX.rappel.z, 0, R);
  b.rappel(S5_BOX.rappelWest.x, R, S5_BOX.rappelWest.z, -PI / 2, R);
  for (const [x, z] of S5_BOX.chimneys) bx(b, x - 0.6, x + 0.6, R, R + 2.0, z - 0.6, z + 0.6, WALL_DARK, { noLedge: true });

  // ---- the grounds: the terrace's balustrade (1.2, low cover, vaultable: P1, G13) with the terrace gate and the boathouse
  // path, the van, the trees
  bx(b, -70, -64.6, 0, 1.2, 49.9, 50.1, WALL);
  bx(b, -63.4, -44.6, 0, 1.2, 49.9, 50.1, WALL);
  bx(b, -43.4, -26, 0, 1.2, 49.9, 50.1, WALL);
  const [vx0, vz0, vx1, vz1] = S5_BOX.van;
  bx(b, vx0, vx1, 0, 2.4, vz0, vz1, VAN, { noLedge: true });
  for (const [x, z] of S5_BOX.trees) b.cylinders.push({ c: [x, 3, z], r: 0.35, h: 6, color: TREE, collide: true });

  // ---- the jetty: the deck (top 0.3) and the boathouse (3.0, noLedge); the lake is not modelled (L-log)
  const [dx0, dz0, dx1, dz1] = S5_BOX.deck;
  bx(b, dx0, dx1, 0, S5_BOX.deckTop, dz0, dz1, '#6b5a45');
  const [hx0, hz0, hx1, hz1] = S5_BOX.boathouse;
  bx(b, hx0, hx1, 0, 3.0, hz0, hz1, WALL_DARK, { noLedge: true });

  // ---- the laser's housings (a visible emitter box at each end, R5)
  for (const l of S5_LASERS) {
    const top = Math.max(...l.ys) + 0.15;
    for (const [x, z] of [[l.x1, l.z1], [l.x2, l.z2]] as const) b.box(x, l.floorY! + top / 2, z, 0.12, top, 0.12, '#3a3d40', 0, 0, false);
  }

  // ---- lamps: every lamp from `S5_LIGHTS` (PROVISIONAL, J10)
  for (const list of Object.values(S5_LIGHTS)) for (const l of list) lamp(b, l);

  // ---- ambient (LR7): the grounds and the house at the standby fill 0.14; the service stair 0.30 (transit); C4 keeps its 0.30
  b.ambientZone(-70, -26, 18, 66, 0.14, -1, 12);
  b.ambientZone(S5_CORE.x0, S5_CORE.x1, S5_CORE.z0, S5_CORE.z1, 0.3, -1, S5_BULKHEAD_TOP);
}
