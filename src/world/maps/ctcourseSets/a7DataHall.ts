/**
 * A7 the Data Hall (SPEC section 9 "A7 - Set 7, the Data Hall"; set doc `docs/marlow-final/sets/a7DataHall.md`; PLAN slice 7,
 * steps 2-4: greybox, lights, guard / objective steps / e2e). A colocation data hall after hours: the entry lobby with its two
 * glazed doors, the rack hall, the client's two-person cage with dual-control terminals, the hot-aisle containment pod east of
 * it and the plant corridor along the south side. It teaches split paths and a synced hack (the paired scanners, N6's second
 * pair on the map).
 *
 * Ground, set box x 70-100, z 52-72, under a 4.0 m slab (the walls on the box edges are `facility.ts`'s):
 * - the entry lobby x 70.25-75.85, z 55.95-65.85 (3.0 m ceiling) with the hall door `A7-hall` (east wall) and the plant door
 *   `A7-plant` (south wall), each with a `kit.glass` sidelight; the closed riser block north of it (x 70-76, z 66-72) so the
 *   hall's west wall runs straight;
 * - the rack hall: rows 1-3 west of the cage (x 78.8-83.0) and row 1's east part along the cage's south face, all 2.2 m and
 *   `noLedge`, 3.0 m aisles; the technician's loop round rows 1-2;
 * - the cage x 86-96, z 60-66: `b.fence` mesh on all four faces over 1.2 m kick-panel boxes, a `noLedge` lid at 2.4-2.5, its
 *   six fence anchors locked by `anchorLock` gates on a flag nothing sets (ENGINE-ANSWERS Q8), two 1.2 m doors on the sync, a solid 1.75 m equipment cabinet between the terminals (`A7_CABINET`: hides T2's spot from the technician's round);
 *   terminals `a7-t1` (west face, in the hall) and `a7-t2` (east face, in the pod), 10.1 m apart (`syncStation`, kind 'scan');
 * - the containment pod x 96-100, z 55.95-68 (2.6 m roof): reached only from the plant corridor by its south door `A7-pod-s`
 *   (or through the cage after the sync); its east door is the facility's L7 near door, on the sync too;
 * - the plant corridor x 70.25-99.75, z 52.25-55.65 (3.5 m ceiling): three 2.0 m cooling units against its north wall (their
 *   west lees hide a body from the corridor camera) and the 6 m trench grating x 86-92 (`metal`, loud).
 * Every collidable block is `noLedge`: nothing in A7 is a lip, a co-op surface or a solo top over 0.3 m. Prototype values (G10).
 *
 * Lights (LIGHTING-PLAN 3, A7): rack rows 70 (six strips and the lobby panel, A7-D4; switch in the lobby by the hall door),
 * aisle ends 71 (two bulkheads; switch at the south aisle's west end: the lure), plant corridor 72 (four bulkheads; switch
 * by its west door), pod 73 (two strips; on the cage's own control, no switch). Cameras ignore light (G240).
 *
 * C2 (the set doc's camera contradiction): a fence passes sight, so `a7-cam1` at the hall's north-east corner would see T1's
 * hack spot through the mesh. Built as section 13 says: on the north wall over the front aisle at x 86.5 with a short aim (4 m),
 * so a head at T1's spot (10 m out) is above its frame; it watches the front aisle's north mouth and the cage's north apron.
 *
 * Dressing (slice 7 step 5, SPEC 6, M5: a colocation hall mock-up inside the luxury hall, so it keeps its own materials - painted
 * block walls on a dark dado, a raised access floor with perforated tiles, galvanised basket trays, white plant, a steel cage - and
 * only the hall above the set takes the kit's charcoal panels):
 * - the greybox's boxes, lamps, doors, anchors and devices are untouched; the dressing is appended after them (the test pins the
 *   greybox: 47 boxes, 37 of them solid, 15 lamps, the cabinet included (marlow-a7-cabinet));
 * - everything built by hand is a thin visual skin (no collision, `noLedge`, one side under `CANON_MIN_THICK` so it is out of the
 *   canonical light shapes: the bake, the meter, the guards and the cameras see the greybox as built): wall finishes, the raised
 *   floor's seams and perforated tiles, rack ends and rears, the cage's posts, rails and plates, the terminals' bezels, the pod's
 *   containment panels, the corridor's grating bars, pipes and plant, the lobby's fittings, the 6 x 6 m riser block as a services
 *   core (steel riser doors, access hatches, cable ladders, conduit, a pipe manifold, signage plates);
 * - NO new collision at all: the props kit's racks and cooling units stand over the greybox's own boxes (5 cm proud on their fronts,
 *   1 cm up, their sides capped by skins), so those boxes stay the collision, the cover and the light shapes;
 * - kit panels with accent coves above the 4.2 m slab on the west, north and east walls (rows 70) and over the gallery glazing on
 *   the south wall (corridor 72), accent slots under the trays (70), in the corridor (72) and in the pod roof (73), every one on its
 *   circuit's group. No lamp is added.
 */
import type { AnchorLockGate, CourseDevice, FlagGate } from '../../../game/course/courseDef';
import type { CameraDevice } from '../../../security/data';
import { KIT_BOX_COLOR, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { marlowCourseGroups } from '../../lighting/marlowCircuits';
import { FacilityProps } from '../../props/facilityProps';
import { applyGreybox, syncStation } from '../ctcourseGreybox';
import { GAL_TOP, wallRuns } from './facility';
import { emptyPart, HALL_H, holdDoorId, tally, type Box, type SetPart } from './types';

/** The technician (set doc section 2): squad slot id, his loop round rows 1-2, its stops and facings. */
export const A7_TECH = 'a7-tech';
/** A walker pauses at a route point for its `waits` entry; a wait of 0 never advances (`PatrolWalker.step`, S2), so the
 *  pass-through points pause this long (s). */
export const A7_PASS_WAIT = 0.1;
/** R0 the cage front (reads the rack screen, facing east), the front aisle's south end, R1 the south aisle's west end (the
 *  PDU, facing west), the west cross aisle's north end, aisle C's east end. */
export const A7_TECH_ROUTE: [number, number][] = [[84.4, 60.6], [84.4, 57.4], [77.5, 57.4], [77.5, 65.7], [84.4, 65.7]];
export const A7_TECH_WAITS = [5, A7_PASS_WAIT, 3, A7_PASS_WAIT, A7_PASS_WAIT];
export const A7_TECH_FACES = [Math.PI / 2, Number.NaN, -Math.PI / 2, Number.NaN, Number.NaN];

/** The scanner pair (N6): its id, the two terminals (SPEC ids, A7-D3), the flag a synced hack sets. */
export const A7_SCANNER = 'sc-a7';
export const A7_T1 = 'a7-t1';
export const A7_T2 = 'a7-t2';
export const A7_SYNC_FLAG = 'a7-sync';
/** The terminals' mounting points on the cage's west and east faces (facing out of the cage) and the housing height. */
export const A7_T1_AT = { x: 85.95, z: 61.5, yaw: -Math.PI / 2 } as const;
export const A7_T2_AT = { x: 96.05, z: 61.5, yaw: Math.PI / 2 } as const;
export const A7_PANEL_Y = 1.2;
/** The shortest walk between the two terminals (m: T1 -> the front aisle -> the lobby -> the corridor -> the pod -> T2). */
export const A7_SYNC_WALK = 26;
/** The hack spots (feet), 0.6 m out from each terminal (`syncStation`'s scan spots). */
export const A7_T1_SPOT: [number, number] = [85.35, 61.5];
export const A7_T2_SPOT: [number, number] = [96.65, 61.5];

/** The cage: plan box (fence lines), mesh height, kick-panel height, the lid's thickness (0.1: a 5 cm slab is off the 5 cm voxel
 *  grid's parity, `tests/voxelFit.test.ts`), the panels' thickness, door span (z) on the west and east faces. */
export const A7_CAGE = { x0: 86, z0: 60, x1: 96, z1: 66, mesh: 2.4, kick: 1.2, lidT: 0.1, panelT: 0.1, door: [63.9, 65.1] as [number, number] } as const;
/** (marlow-a7-cabinet) The solid equipment cabinet in the cage between the terminals (plan box, height; `noLedge`): the mesh
 *  passes sight, so without it the technician at R0 (and on aisle B, the front aisle, aisle C's east end) sees a player waiting
 *  at T2's spot through both mesh faces into the lit pod. 1.75 m: over every guard line to a standing body at T2 (head at
 *  most about 1.67 where the lines cross it), under the T1 <-> T2 lamp lines from a standing eye (state lamp 1.95: 1.77 there;
 *  ready lamp 2.25: 1.91). South face 0.15 m off the south kick panel, north face 0.2 m short of the door span (the
 *  door-to-door walk at z 64.5 keeps 0.5 m beside a body). */
export const A7_CABINET = { x0: 90.4, x1: 91.6, z0: 60.2, z1: 63.7, h: 1.75 } as const;
/** Course doors: the cage's two, the lobby's two glazed doors, the pod's south door; the pod's east door is the facility's L7
 *  near door (SPEC's `A7-east`). */
export const A7_CAGE_W = 'A7-cage-w';
export const A7_CAGE_E = 'A7-cage-e';
export const A7_HALL_DOOR = 'A7-hall';
export const A7_PLANT_DOOR = 'A7-plant';
export const A7_POD_DOOR = 'A7-pod-s';
export const A7_EAST_DOOR = holdDoorId('L7', 'near');
/** The flag gates the sync opens and the anchor locks that never open (their flag is listed but nothing sets it). */
export const A7_GATE_CAGE_W = 'g-a7-cage-w';
export const A7_GATE_CAGE_E = 'g-a7-cage-e';
export const A7_GATE_EAST = 'g-a7-east';
export const A7_NEVER_FLAG = 'a7-never';
/** The pod pass zone (one player in the pod ticks the split) and the plant corridor's role claim box (B). */
export const A7_POD_FLAG = 'a7-pod';
export const A7_POD_ZONE: [number, number, number, number] = [96.3, 56.2, 99.8, 67.8];
export const A7_CORRIDOR_CLAIM: [number, number, number, number] = [70.3, 52.3, 99.8, 55.6];

/** Rack runs [x0, x1, z0, z1] (2.2 m, `noLedge`): rows 1 (west and east parts), 2, 3. */
export const A7_RACKS: readonly (readonly [number, number, number, number])[] = [
  [78.8, 83.0, 58.8, 60.0],
  [86.0, 95.6, 58.8, 59.95],
  [78.8, 83.0, 63.0, 64.2],
  [78.8, 83.0, 67.2, 68.4],
];
export const A7_RACK_H = 2.2;
/** Cooling units (centres x; 1.8 x 0.9, 2.0 m, `noLedge`) against the corridor's north wall, and the trench grating. */
export const A7_UNITS = [78.0, 85.0, 93.0] as const;
export const A7_UNIT = { w: 1.8, z0: 54.75, z1: 55.65, h: 2.0 } as const;
export const A7_GRATING = { x0: 86, x1: 92 } as const;
/** The units' west lees (feet: a body against the corridor's north wall, clear of the unit by its radius). */
export const A7_LEES: readonly [number, number][] = [
  [83.7, 55.2],
  [91.75, 55.2],
];
/** Ceilings and the slab (m): the lobby, the corridor, the pod roof, the hall slab. */
export const A7_H = { lobby: 3.0, corridor: 3.5, pod: 2.6, slab: 4.0 } as const;

/** The cameras (set doc section 2; C2). */
export const A7_CAM1: CameraDevice = { id: 'a7-cam1', kind: 'camera', level: 'ground', at: [86.5, 71.5], y: 3.2, facing: 195, aim: 4.0, range: 12, reason: "Data hall CCTV over the front aisle's north mouth and the cage's north apron (fixed, short aim: T1's spot is above its frame)" };
export const A7_CAM2: CameraDevice = { id: 'a7-cam2', kind: 'camera', level: 'ground', at: [99.6, 54.0], y: 3.0, facing: 270, sweep: [220, 320], aim: 9, range: 14, reason: 'Plant corridor CCTV at its east end, sweeping the corridor and the pod door' };

/** The shell's faces (`facility.ts`, 0.5 m walls on the set box's edges). */
const SHELL = { west: 70.25, east: 99.75, south: 52.25, north: 71.75 } as const;
/** Wall thickness (centre lines on the plan) and the doors' height. */
const T = 0.3;
const DOOR_H = 2.1;
/** The lobby's walls: east wall centre x 76, the riser block's south face z 65.85; the corridor's north wall z 55.65-55.95. */
const LOBBY_E = 76;
const RISER_Z = 65.85;
const CORR_N = { z0: 55.65, z1: 55.95 } as const;
/** Openings: the hall door and its sidelight (z on x 76), the plant door and its sidelight (x on z 55.8), the pod door. */
const HALL_DOOR = { z0: 61.0, z1: 62.2 } as const;
const HALL_LIGHT = { z0: 62.4, z1: 63.6 } as const;
const PLANT_DOOR = { x0: 72.2, x1: 73.4 } as const;
const PLANT_LIGHT = { x0: 73.6, x1: 74.8 } as const;
const POD_DOOR = { x0: 97.4, x1: 98.6 } as const;
/** The pod's west wall (x 96) solid runs and its north wall (z 68). */
const POD = { x0: 96, x1: SHELL.east, z0: CORR_N.z1, z1: 68 } as const;

const RACK = '#3c434b';
const UNIT = '#7d858c';
const KICK = '#4b5259';
const LID = '#5d646b';
const GRATE = '#555b60';
const PLAN_BOARD = '#c9c3b2';
const COOL: [number, number, number] = [0.86, 0.93, 1.0];
const WHITE: [number, number, number] = [0.96, 0.97, 1.0];

// ---- dressing (slice 7 step 5) ----
/** The circuits the kit's accent lines follow: the rack rows (70) for the hall, the plant corridor (72) over the gallery glazing and in the corridor, the pod (73). */
const G_ROWS = 70;
const G_PLANT = 72;
const G_POD = 73;
/** A dressing skin's thickness (m) and the thinnest side a skin may have: under `CANON_MIN_THICK` (0.05, `voxel/lightShapes.ts`) the
 *  canonical light shapes leave it out, so dressing never moves the bake, the meter, what a guard sees or a camera frames. */
const SKIN = 0.03;
const THIN = 0.05;
/** The hall slab's top (the kit panels start there) and the raised floor's 0.6 m tile grid (its lines, the origin that puts tile centres on 61.5 and 79.5). */
const SLAB_TOP = A7_H.slab + 0.2;
const TILE = 0.6;
const TILE_ORIGIN = { x: 70.2, z: 55.8 } as const;
/** The rack props over the greybox runs (`A7_RACKS` order): which way each run's fronts face (+1 north, -1 south). The prop stands this far
 *  proud of the run's box on its front (the skin rule: 5 cm) and 1 cm up, so none of its faces lies in a box face. */
export const A7_RACK_FRONT = [1, -1, -1, 1] as const;
export const A7_RACK_PROUD = 0.05;
export const A7_PROP_LIFT = 0.01;
export const A7_RACK_PITCH = 0.6;
/** The cooling units' fronts face the corridor (-z): the same 5 cm proud, the side faces capped. */
export const A7_UNIT_Z = (A7_UNIT.z0 + A7_UNIT.z1) / 2 - A7_RACK_PROUD;
/** Cable trays (props: 1 m modules, hung): over the rack rows, the west cross aisle's spine, the corridor. [x0, z0, x1, z1, mount y]. */
export const A7_TRAYS: readonly (readonly [number, number, number, number, number])[] = [
  [78.8, 59.4, 83.0, 59.4, 2.45],
  [86.0, 59.375, 95.6, 59.375, 2.45],
  [78.8, 63.6, 83.0, 63.6, 2.45],
  [78.8, 67.8, 83.0, 67.8, 2.45],
  [77.5, 56.4, 77.5, 69.6, 2.7],
  [75.0, 54.5, 97.0, 54.5, 2.25],
];
/** The services core: the riser block's two open faces (the lobby's north wall, the hall's west cross aisle). */
export const A7_RISER = { x0: SHELL.west, x1: LOBBY_E + T / 2, z0: RISER_Z, z1: SHELL.north } as const;
/** Cage post lines: the corners, the door jambs and clear-of-terminal intermediates (z on the west and east faces, x on the south and north). */
const POST_Z = [60, 60.8, 62.0, 63.84, 65.16, 66] as const;
const POST_X = [86, 88.5, 91, 93.5, 96] as const;
/** Own materials (painted block, raised floor, galvanised steel, white plant, a steel cage, containment panels). */
const LOOK = {
  paint: '#aeb3b3',
  dado: '#454c51',
  rail: '#c9ced0',
  skirt: '#2c3135',
  seam: '#3d4449',
  perf: '#1e2226',
  perfSlat: '#707880',
  rack: '#23272b',
  rackRear: '#2b3136',
  label: '#e4e6e3',
  black: '#15181a',
  yellow: '#c9a227',
  red: '#b5282d',
  green: '#2f8f5b',
  blue: '#3a6ea5',
  steel: '#6d747a',
  steelDark: '#3a3f44',
  pipeBlue: '#2f6f8f',
  pipeRed: '#a33a2f',
  pipeGrey: '#8d9296',
  grate: '#a0a6ab',
  pit: '#121416',
  door: '#69727a',
  conduit: '#7c8388',
  cable: '#202326',
  cream: '#d9d8cf',
  pod: '#9fb0b8',
  podSeam: '#56646c',
  screen: '#10202a',
  glow: '#2f9a73',
  concrete: '#4d4c47',
  stain: '#26292b',
  coatA: '#2a3345',
  coatB: '#4a4a35',
  coatC: '#5a3a30',
  unit: '#e8e8e4',
  vent: '#b9bdc0',
} as const;

/** (J14) `opts.replan`: the re-planned yard, whose lobby east wall is the glazed screen (`replan/a7DataHall.ts`). */
export function buildA7DataHall(b: LevelBuilder, kit: FacilityKit, opts: { replan?: boolean } = {}): SetPart {
  const p = emptyPart('a7DataHall');
  /** A box from x0 to x1, z0 to z1, y0 to y1; `noLedge` unless told otherwise. */
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string, opts: { overhead?: boolean; noLedge?: boolean } = {}): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
    b.mark(from, { noLedge: opts.noLedge ?? true, ...(opts.overhead ? { overhead: true } : {}) });
  };
  /** A visual-only box (no collision, `noLedge`). */
  const visual = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, false);
    b.mark(from, { noLedge: true });
  };

  // ---- A7-11: the hall slab (4.0 m) over the whole set and the closed riser block north of the lobby ----
  tally(b, p.register, 'A7-11', 'Hall slab at 4.0 m over the set (overhead, noLedge) and the closed riser block x 70-76, z 66-72 behind the lobby (the hall\'s west wall runs straight)', () => {
    slab(70, 100, 52, 72, A7_H.slab, A7_H.slab + 0.2, KIT_BOX_COLOR, { overhead: true });
    slab(SHELL.west, LOBBY_E + T / 2, RISER_Z, SHELL.north, 0, A7_H.slab, KIT_BOX_COLOR);
  });

  // ---- A7-4: the plant corridor: its north wall (the lobby's and the pod's south wall), ceiling, cooling units, grating ----
  tally(b, p.register, 'A7-4', 'Plant corridor x 70.25-99.75, z 52.25-55.65: north wall to the slab with the plant and pod door openings, 3.5 m ceiling, three 2.0 m cooling units (noLedge), the 6 m trench grating (metal, loud)', () => {
    const { z0, z1 } = CORR_N;
    slab(SHELL.west, PLANT_DOOR.x0, z0, z1, 0, A7_H.slab, KIT_BOX_COLOR);
    slab(PLANT_DOOR.x1, PLANT_LIGHT.x0, z0, z1, 0, A7_H.slab, KIT_BOX_COLOR);
    slab(PLANT_LIGHT.x1, POD_DOOR.x0, z0, z1, 0, A7_H.slab, KIT_BOX_COLOR);
    slab(POD_DOOR.x1, SHELL.east, z0, z1, 0, A7_H.slab, KIT_BOX_COLOR);
    slab(POD_DOOR.x0, POD_DOOR.x1, z0, z1, DOOR_H, A7_H.slab, KIT_BOX_COLOR);
    slab(SHELL.west, SHELL.east, SHELL.south, z0, A7_H.corridor, A7_H.corridor + 0.1, KIT_BOX_COLOR, { overhead: true });
    for (const x of A7_UNITS) slab(x - A7_UNIT.w / 2, x + A7_UNIT.w / 2, A7_UNIT.z0, A7_UNIT.z1, 0, A7_UNIT.h, UNIT);
    b.surface('metal', A7_GRATING.x0, A7_GRATING.x1, SHELL.south, z0, 0);
    visual(A7_GRATING.x0, A7_GRATING.x1, SHELL.south, z0, 0, 0.012, GRATE);
  });

  // ---- A7-5: the entry lobby: east wall, ceiling, the two glazed doors with their sidelights, the fire plan ----
  tally(b, p.register, 'A7-5', 'Entry lobby x 70.25-75.85, z 55.95-65.85: east wall to the slab, 3.0 m ceiling, hall door A7-hall and plant door A7-plant (1.2 x 2.1) with kit.glass sidelights (glass stops guard and camera sight), fire plan board on the north wall', () => {
    const x0 = LOBBY_E - T / 2;
    const x1 = LOBBY_E + T / 2;
    // (J14) on the re-plan the glazed screen replaces the east wall's solid runs, its head and its sidelight
    if (!opts.replan) {
      slab(x0, x1, CORR_N.z1, HALL_DOOR.z0, 0, A7_H.slab, KIT_BOX_COLOR);
      slab(x0, x1, HALL_DOOR.z1, HALL_LIGHT.z0, 0, A7_H.slab, KIT_BOX_COLOR);
      slab(x0, x1, HALL_LIGHT.z1, RISER_Z, 0, A7_H.slab, KIT_BOX_COLOR);
      slab(x0, x1, HALL_DOOR.z0, HALL_LIGHT.z1, DOOR_H, A7_H.slab, KIT_BOX_COLOR);
    }
    slab(PLANT_DOOR.x0, PLANT_LIGHT.x1, CORR_N.z0, CORR_N.z1, DOOR_H, A7_H.slab, KIT_BOX_COLOR);
    slab(SHELL.west, x0, CORR_N.z1, RISER_Z, A7_H.lobby, A7_H.lobby + 0.1, KIT_BOX_COLOR, { overhead: true });
    if (!opts.replan) kit.glass(LOBBY_E, HALL_LIGHT.z0, LOBBY_E, HALL_LIGHT.z1, DOOR_H);
    kit.glass(PLANT_LIGHT.x0, (CORR_N.z0 + CORR_N.z1) / 2, PLANT_LIGHT.x1, (CORR_N.z0 + CORR_N.z1) / 2, DOOR_H);
    // the doors: the hall door's hinge at its south jamb (the leaf along +z), the plant door's at its west jamb (along +x)
    p.doors[A7_HALL_DOOR] = b.door(LOBBY_E, 0, HALL_DOOR.z0, HALL_DOOR.z1 - HALL_DOOR.z0, 0, { height: DOOR_H }).id;
    p.doors[A7_PLANT_DOOR] = b.door(PLANT_DOOR.x0, 0, (CORR_N.z0 + CORR_N.z1) / 2, PLANT_DOOR.x1 - PLANT_DOOR.x0, Math.PI / 2, { height: DOOR_H }).id;
    // the fire plan (both routes, both terminals, both cameras: a texture waits for the visual pass)
    visual(72.4, 73.6, RISER_Z - 0.03, RISER_Z, 1.05, 1.95, PLAN_BOARD);
  });

  // ---- A7-1: the rack rows ----
  tally(b, p.register, 'A7-1', 'Rack rows 2.2 m (noLedge, one box per run): rows 1-3 west of the cage x 78.8-83.0 and row 1\'s east part along the cage\'s south face; 3.0 m aisles (A7-D2)', () => {
    for (const [x0, x1, z0, z1] of A7_RACKS) slab(x0, x1, z0, z1, 0, A7_RACK_H, RACK);
  });

  // ---- A7-2 / A7-10 / A7-7: the cage (fence mesh over kick panels, the lid, the anchor lock), the terminals, the doors ----
  const { x0: cx0, z0: cz0, x1: cx1, z1: cz1, mesh, kick, lidT, panelT, door } = A7_CAGE;
  /** The cage's six mesh runs (a -> b on the fence lines), the door spans left open on the west and east faces. */
  const runs: [string, number, number, number, number][] = [
    ['a7-fence-w1', cx0, cz0, cx0, door[0]],
    ['a7-fence-w2', cx0, door[1], cx0, cz1],
    ['a7-fence-e1', cx1, cz0, cx1, door[0]],
    ['a7-fence-e2', cx1, door[1], cx1, cz1],
    ['a7-fence-s', cx0, cz0, cx1, cz0],
    ['a7-fence-n', cx0, cz1, cx1, cz1],
  ];
  const station = syncStation({ id: 'a7', kind: 'scan', a: A7_T1_AT, b: A7_T2_AT, y: A7_PANEL_Y, walk: A7_SYNC_WALK });
  tally(b, p.register, 'A7-2', 'Cage 10 x 6 (x 86-96, z 60-66): b.fence mesh 2.4 m on all four faces (sight, the ready lamps and the jam line pass it; bodies do not) over 1.2 m solid kick panels (noLedge), door lintels; a solid 1.75 m equipment cabinet in the middle (x 90.4-91.6, z 60.2-63.7, noLedge) that hides T2\'s spot from the technician\'s round while the lamps show over it; terminals T1 (west face) and T2 (east face) 10.1 m apart (syncStation, scan)', () => {
    for (const [id, ax, az, bx, bz] of runs) {
      p.anchors[id] = b.fence(ax, az, bx, bz, mesh, 0).id;
      const h = panelT / 2;
      slab(Math.min(ax, bx) - (ax === bx ? h : 0), Math.max(ax, bx) + (ax === bx ? h : 0), Math.min(az, bz) - (az === bz ? h : 0), Math.max(az, bz) + (az === bz ? h : 0), 0, kick, KICK);
    }
    slab(A7_CABINET.x0, A7_CABINET.x1, A7_CABINET.z0, A7_CABINET.z1, 0, A7_CABINET.h, RACK);
    for (const x of [cx0, cx1]) slab(x - panelT / 2, x + panelT / 2, door[0], door[1], DOOR_H, mesh, KICK);
    applyGreybox(b, station);
  });
  tally(b, p.register, 'A7-10', 'Cage lid 2.4-2.5 (noLedge, roofed as real colocation cages) and the fence anchor lock (anchorLock gates on a flag nothing sets)', () => {
    slab(cx0 - panelT / 2, cx1 + panelT / 2, cz0 - panelT / 2, cz1 + panelT / 2, mesh, mesh + lidT, LID, { overhead: true });
  });
  tally(b, p.register, 'A7-7', 'Cage doors A7-cage-w and A7-cage-e (1.2 x 2.1, locked; flag gates on a7-sync) and the pod\'s east door (the facility\'s L7 near door, a flag gate on a7-sync)', () => {
    p.doors[A7_CAGE_W] = b.door(cx0, 0, door[0], door[1] - door[0], 0, { height: DOOR_H, locked: true }).id;
    p.doors[A7_CAGE_E] = b.door(cx1, 0, door[0], door[1] - door[0], 0, { height: DOOR_H, locked: true }).id;
  });
  // the terminals keep SPEC's ids (A7-D3); a scanner device's y is its panel's floor (N6: the ready lamps hang at floor + 1.95 /
  // 2.25, in the mesh band between the kick panels and the lid; the housing stays at 1.2)
  const dev = (d: CourseDevice, label: string): CourseDevice => ({ x: d.x, y: 0, z: d.z, yaw: d.yaw, label });
  p.devices[A7_T1] = dev(station.devices['sw-a7-a']!, 'Terminal one (hack with your partner)');
  p.devices[A7_T2] = dev(station.devices['sw-a7-b']!, 'Terminal two (hack with your partner)');
  p.scanners.push({ id: A7_SCANNER, a: A7_T1, b: A7_T2, flag: A7_SYNC_FLAG });
  const sync = (id: string, doorId: string): FlagGate => ({ kind: 'flag', id, flag: A7_SYNC_FLAG, doorId });
  p.bay.gates.push(sync(A7_GATE_CAGE_W, A7_CAGE_W), sync(A7_GATE_CAGE_E, A7_CAGE_E), sync(A7_GATE_EAST, A7_EAST_DOOR));
  for (const [id] of runs) p.bay.gates.push({ kind: 'anchorLock', id: `g-${id}-lock`, anchorId: id, flag: A7_NEVER_FLAG } satisfies AnchorLockGate);

  // ---- A7-3 / A7-9: the containment pod (west and north walls, roof) and its south door ----
  tally(b, p.register, 'A7-3', 'Hot-aisle containment pod x 96-100, z 55.95-68: solid panels on its west wall but the cage\'s mesh face (z 60-66) and on its north wall, 2.6 m roof (overhead, noLedge)', () => {
    slab(POD.x0 - T / 2, POD.x0 + T / 2, POD.z0, cz0 - panelT / 2, 0, A7_H.pod, KIT_BOX_COLOR);
    slab(POD.x0 - T / 2, POD.x0 + T / 2, cz1 + panelT / 2, POD.z1 + T / 2, 0, A7_H.pod, KIT_BOX_COLOR);
    slab(POD.x0 + T / 2, POD.x1, POD.z1 - T / 2, POD.z1 + T / 2, 0, A7_H.pod, KIT_BOX_COLOR);
    slab(POD.x0 - T / 2, POD.x1, POD.z0, POD.z1 + T / 2, A7_H.pod, A7_H.pod + 0.1, KIT_BOX_COLOR, { overhead: true });
  });
  tally(b, p.register, 'A7-9', 'Containment pod south door A7-pod-s (z 55.8, x 97.4-98.6, unlocked): the plant corridor\'s end', () => {
    p.doors[A7_POD_DOOR] = b.door(POD_DOOR.x0, 0, (CORR_N.z0 + CORR_N.z1) / 2, POD_DOOR.x1 - POD_DOOR.x0, Math.PI / 2, { height: DOOR_H }).id;
  });

  // ---- A7-6: the cameras (data only) ----
  p.register.push({ id: 'A7-6', element: 'Cameras: a7-cam1 fixed on the north wall over the front aisle (short aim, C2), a7-cam2 sweeping at the plant corridor\'s east end (IR, layout data)' });
  p.cameras.push(A7_CAM1, A7_CAM2);

  // ---- A7-8: the lights (LIGHTING-PLAN 3, A7; the circuits are `MARLOW_CIRCUITS` 70-73) ----
  tally(b, p.register, 'A7-8', 'Lamps on groups 70-73: rack-row strips and the lobby panel (70), aisle-end bulkheads (71), corridor bulkheads (72), pod roof strips (73)', () => {
    const strip = (x: number, z: number, alongX: boolean, group: number, y: number, radius: number, intensity: number): void => {
      b.light({ x, y, z, radius, intensity, color: COOL, group, electric: true, destructible: true, fixture: alongX ? { sx: 1.6, sy: 0.08, sz: 0.2, oy: 0.04 } : { sx: 0.2, sy: 0.08, sz: 1.6, oy: 0.04 } });
    };
    const bulkhead = (x: number, y: number, z: number, group: number, radius: number, intensity: number, color: [number, number, number]): void => {
      b.light({ x, y, z, radius, intensity, color, group, electric: true, destructible: true, fixture: { sx: 0.3, sy: 0.18, sz: 0.3, oy: 0.09 } });
    };
    for (const [x, z] of [[81.6, 57.4], [80.9, 61.5], [80.9, 65.7], [91.0, 57.4], [91.0, 69.0]] as const) strip(x, z, true, 70, 3.8, 4.5, 0.25);
    strip(84.5, 61.8, false, 70, 3.8, 4.5, 0.25);
    b.light({ x: 73.0, y: 2.9, z: 61.0, radius: 4.0, intensity: 0.18, color: COOL, group: 70, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.05, sz: 0.6, oy: 0.025 } });
    bulkhead(76.4, 2.6, 57.4, 71, 3.2, 0.115, COOL);
    bulkhead(76.4, 2.6, 69.9, 71, 3.2, 0.115, COOL);
    for (const [x, i] of [[74.0, 0.19], [79.5, 0.19], [85.0, 0.19], [91.0, 0.22]] as const) bulkhead(x, 3.0, 53.9, 72, 4.5, i, WHITE);
    for (const z of [60.0, 63.0]) strip(97.8, z, false, 73, 2.5, 3.5, 0.17);
  });
  for (const [k, g] of Object.entries(marlowCourseGroups())) if (k.startsWith('a7-')) p.groups[k] = g;
  // wall switches: the rows' in the lobby by the hall door, the aisle ends' at the south aisle's west end (the lure), the
  // corridor's inside its west door (the plant door's sidelight and opening take the doc's x 73.0: west of the door instead)
  p.switches.push({ id: 'a7-sw-rows', group: 70, pos: { x: LOBBY_E - T / 2 - 0.05, y: 1.2, z: 60.4 }, yaw: -Math.PI / 2 });
  p.switches.push({ id: 'a7-sw-aisles', group: 71, pos: { x: 76.6, y: 1.2, z: CORR_N.z1 + 0.05 }, yaw: 0 });
  p.switches.push({ id: 'a7-sw-plant', group: 72, pos: { x: 71.6, y: 1.2, z: CORR_N.z0 - 0.05 }, yaw: Math.PI });
  p.ambientZones.push({ id: 'A7', box: [70, 52, 100, 72], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: A7_H.slab - 0.1 });

  // ---- the technician, the steps, the claim, the pass zone, the radio ----
  p.squads[A7_TECH] = { kind: 'grunt', x: A7_TECH_ROUTE[0]![0], z: A7_TECH_ROUTE[0]![1], yaw: Math.PI / 2, route: A7_TECH_ROUTE, waits: A7_TECH_WAITS, faces: A7_TECH_FACES };
  p.bay.squad.push(A7_TECH);
  // the first player into the plant corridor takes B; the other is A (the hall). Until then the lead (P1, odd set) reads A
  p.bay.roles = [{ role: 'b', zone: { box: A7_CORRIDOR_CLAIM } }];
  p.passZones.push({ id: 'a7-p-pod', box: A7_POD_ZONE, flag: A7_POD_FLAG, floorY: 0, any: true });
  p.externalFlags.push(A7_POD_FLAG, A7_SYNC_FLAG, A7_NEVER_FLAG);
  p.objectives.push(
    {
      id: 'a7-split',
      bay: 'A7',
      text: 'Split up: one through the hall, one through the plant corridor.',
      a: "Hall route: slip past the technician's round to terminal one.",
      b: 'Plant corridor: quiet on the grating, past the camera, to terminal two.',
      done: { flag: A7_POD_FLAG },
    },
    {
      id: 'a7-sync',
      bay: 'A7',
      text: 'Hack both terminals together. Start on the ready lamps.',
      a: "Hack terminal one on your partner's count.",
      b: "Hack terminal two on your partner's count.",
      done: { flag: A7_SYNC_FLAG },
    },
    { id: 'a7-lock', bay: 'A7', text: 'The cage and the east door are open. Both of you into holding room seven.' },
  );
  p.bay.radio.push(
    { at: 'enter', text: "Two terminals, two routes. You'll be on your own for a bit. Meet at the cage." },
    { at: 'enter', text: 'That corridor camera sweeps. Move while it looks the other way.' },
    { at: 'a7-sync', text: 'Cage released. East door is open.' },
  );

  // ---- spaces, nav, debug points, light and shot spots ----
  const hall: Box = [76, 56, 96, 72];
  p.camSpaces.push(
    { box: hall, size: 'open' },
    { box: [70, 56, 76, 66], size: 'tight' },
    { box: [70, 52, 100, 56], size: 'tight' },
    { box: [96, 56, 100, 68], size: 'tight' },
    { box: [cx0, cz0, cx1, cz1], size: 'tight' },
  );
  p.navSeeds.push({ x: 73, y: 0, z: 61 }, { x: 80.9, y: 0, z: 61.5 }, { x: 80, y: 0, z: 53.9 }, { x: 98, y: 0, z: 62 }, { x: 91, y: 0, z: 64.8 });
  p.debugPoints.push(
    { id: 'A7-entry', label: 'Set 7 entry (the lobby)', pos: { x: 72.5, y: 0, z: 62 }, yaw: Math.PI / 2 },
    { id: 'A7-mid', label: 'Set 7 middle (aisle B)', pos: { x: 80.9, y: 0, z: 61.5 }, yaw: Math.PI / 2 },
    { id: 'A7-t1', label: 'Set 7 terminal one (hall)', pos: { x: A7_T1_SPOT[0], y: 0, z: A7_T1_SPOT[1] }, yaw: Math.PI / 2 },
    { id: 'A7-corridor', label: 'Set 7 plant corridor (west end)', pos: { x: 73, y: 0, z: 54 }, yaw: Math.PI / 2 },
    { id: 'A7-pod', label: 'Set 7 containment pod (terminal two)', pos: { x: A7_T2_SPOT[0], y: 0, z: A7_T2_SPOT[1] }, yaw: -Math.PI / 2 },
  );
  p.lightSpots.push(
    { name: 'A7 T1', kind: 'body', x: A7_T1_SPOT[0], y: 0, z: A7_T1_SPOT[1], band: 'pool' },
    { name: 'A7 aisle B', kind: 'body', x: 80.9, y: 0, z: 61.5, band: 'read' },
    { name: 'A7 aisle B cut', kind: 'body', x: 80.9, y: 0, z: 61.5, band: 'cut', off: [70] },
    { name: 'A7 aisle C', kind: 'body', x: 80.9, y: 0, z: 65.7, band: 'read' },
    { name: 'A7 north apron', kind: 'body', x: 91, y: 0, z: 69, band: 'read' },
    { name: 'A7 R1', kind: 'body', x: 77.5, y: 0, z: 57.4, band: 'read' },
    { name: 'A7 R1 cut', kind: 'body', x: 77.5, y: 0, z: 57.4, band: 'cut', off: [71] },
    { name: 'A7 lobby', kind: 'body', x: 73.5, y: 0, z: 62, band: 'read' },
    { name: 'A7 lobby cut', kind: 'body', x: 73.5, y: 0, z: 62, band: 'cut', off: [70] },
    { name: 'A7 corridor', kind: 'body', x: 80, y: 0, z: 53.9, band: 'read' },
    { name: 'A7 corridor cut', kind: 'body', x: 80, y: 0, z: 53.9, band: 'cut', off: [72] },
    { name: 'A7 grating', kind: 'body', x: 89, y: 0, z: 53.9, band: 'read' },
    { name: 'A7 T2', kind: 'body', x: A7_T2_SPOT[0], y: 0, z: A7_T2_SPOT[1], band: 'read' },
    { name: 'A7 T2 cut', kind: 'body', x: A7_T2_SPOT[0], y: 0, z: A7_T2_SPOT[1], band: 'cut', off: [73] },
    { name: 'A7 hall floor', kind: 'surf', x: 80.9, y: 0.05, z: 61.5, band: 'any' },
    { name: 'A7 hall standby', kind: 'body', x: 80.9, y: 0, z: 61.5, band: 'standby' },
  );
  p.shotVantages.push(
    { name: 'a7-lobby', feet: [73.5, 0, 62], cam: [72.2, 1.7, 61.6], target: [80, 1.4, 62.9] },
    { name: 'a7-corridor', feet: [73.5, 0, 53.9], cam: [72.2, 1.7, 53.6], target: [92, 1.2, 54.0] },
    { name: 'a7-t1', feet: [A7_T1_SPOT[0], 0, A7_T1_SPOT[1]], cam: [84.2, 1.7, 61.0], target: [96, 1.5, 61.5] },
  );

  // ---- dressing (slice 7 step 5; SPEC 6, PROPS.md 3 / 5, KIT.md): appended after the greybox, which it does not touch ----
  /** A visual-only skin [x0, x1] x [y0, y1] x [z0, z1]: no collision, `noLedge`, one side under `THIN` (out of the light shapes). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): void => {
    if (Math.min(x1 - x0, y1 - y0, z1 - z0) >= THIN) throw new Error(`a7DataHall: the dressing skin at (${x0}, ${y0}, ${z0}) is not thin`);
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, false);
    b.mark(from, { noLedge: true });
  };
  /** A skin on the face of an axis-aligned block: `side` is the face's outward direction ('s' -z, 'n' +z, 'w' -x, 'e' +x), `at` the face's
   *  plane (z for n / s, x for e / w), [a0, a1] the run along it (x for n / s, z for e / w), `layer` how many skins out (each `SKIN` thick). */
  const face = (side: 'n' | 's' | 'e' | 'w', at: number, a0: number, a1: number, y0: number, y1: number, color: string, layer = 0): void => {
    const o0 = layer * SKIN;
    const o1 = (layer + 1) * SKIN;
    if (side === 'n') skin(a0, a1, y0, y1, at + o0, at + o1, color);
    else if (side === 's') skin(a0, a1, y0, y1, at - o1, at - o0, color);
    else if (side === 'e') skin(at + o0, at + o1, y0, y1, a0, a1, color);
    else skin(at - o1, at - o0, y0, y1, a0, a1, color);
  };
  /** Floor paint (a few mm proud, no collision). */
  const paint = (x0: number, x1: number, z0: number, z1: number, color: string, top = 0.008): void => skin(x0, x1, 0, top, z0, z1, color);
  /** A face's finish: a dark dado to 1.2 m, light paint above to `top`, a dado rail and a skirting; `gaps` (doors, slots, sidelights) left bare. */
  const finish = (side: 'n' | 's' | 'e' | 'w', at: number, lo: number, hi: number, top: number, gaps: readonly (readonly [number, number])[] = []): void => {
    for (const [a, e] of wallRuns(lo, hi, gaps)) {
      face(side, at, a, e, 0, 1.2, LOOK.dado);
      face(side, at, a, e, 1.2, top, LOOK.paint);
      face(side, at, a, e, 1.2, 1.25, LOOK.rail, 1);
      face(side, at, a, e, 0, 0.1, LOOK.skirt, 1);
    }
  };
  /** A door's architrave on one face: two jambs and a head, `w` wide, around the opening [a0, a1] up to the door's height. */
  const architrave = (side: 'n' | 's' | 'e' | 'w', at: number, a0: number, a1: number, layer = 0, w = 0.1): void => {
    face(side, at, a0 - w, a0, 0, DOOR_H + w, LOOK.steelDark, layer);
    face(side, at, a1, a1 + w, 0, DOOR_H + w, LOOK.steelDark, layer);
    face(side, at, a0, a1, DOOR_H, DOOR_H + w, LOOK.steelDark, layer);
  };
  /** A flat vertical hatch (access panel) on a face: a plate with an edge frame and four corner bolts. */
  const hatch = (side: 'n' | 's' | 'e' | 'w', at: number, c: number, y0: number, w: number, h: number, color: string): void => {
    face(side, at, c - w / 2, c + w / 2, y0, y0 + h, color, 1);
    face(side, at, c - w / 2 - 0.02, c - w / 2, y0 - 0.02, y0 + h + 0.02, LOOK.steelDark, 1);
    face(side, at, c + w / 2, c + w / 2 + 0.02, y0 - 0.02, y0 + h + 0.02, LOOK.steelDark, 1);
    face(side, at, c - w / 2, c + w / 2, y0 - 0.02, y0, LOOK.steelDark, 1);
    face(side, at, c - w / 2, c + w / 2, y0 + h, y0 + h + 0.02, LOOK.steelDark, 1);
    for (const sx of [-1, 1]) for (const sy of [0.05, h - 0.09]) face(side, at, c + sx * (w / 2 - 0.07) - 0.02, c + sx * (w / 2 - 0.07) + 0.02, y0 + sy, y0 + sy + 0.04, LOOK.black, 2);
  };
  /** A hazard base (yellow with black chevron dashes) along a face from `a` to `e`, 0.15 m high. */
  const hazard = (side: 'n' | 's' | 'e' | 'w', at: number, a: number, e: number, layer = 1): void => {
    face(side, at, a, e, 0, 0.15, LOOK.yellow, layer);
    for (let q = a + 0.1; q + 0.14 <= e; q += 0.28) face(side, at, q, q + 0.14, 0, 0.15, LOOK.black, layer + 1);
  };

  // ---- A7-12: the walls' finish (painted block on a dark dado, rail and skirting; the doors, slots and sidelights left bare) ----
  tally(b, p.register, 'A7-12', "Wall finish (visual skins, no collision): painted block above a dark dado with a rail and a skirting on the lobby's west and east faces, the hall's north and west faces, the aisle A face, the pod's east face and the corridor's four faces (the doors, the L6 and L7 door frames, the glass slot and the sidelights left bare), switch back-plates, a PDU cabinet on the west cross aisle's wall where the technician reads it", () => {
    const lobby = A7_H.lobby;
    const hallTop = A7_H.slab;
    finish('e', SHELL.west, CORR_N.z1, RISER_Z, lobby, [[60.8, 63.2], [63.8, 64.6]]);
    // (J14) not on the re-plan's glazed screen: the paint would hide the glass
    if (!opts.replan) finish('w', LOBBY_E - T / 2, CORR_N.z1, RISER_Z, lobby, [[HALL_DOOR.z0 - 0.1, HALL_LIGHT.z1 + 0.1]]);
    finish('n', CORR_N.z1, SHELL.west, LOBBY_E - T / 2, lobby, [[PLANT_DOOR.x0 - 0.1, PLANT_LIGHT.x1 + 0.1]]);
    if (!opts.replan) finish('e', LOBBY_E + T / 2, CORR_N.z1, RISER_Z, hallTop, [[HALL_DOOR.z0 - 0.1, HALL_LIGHT.z1 + 0.1]]);
    finish('n', CORR_N.z1, LOBBY_E + T / 2, POD.x0 - T / 2, hallTop);
    finish('s', SHELL.north, LOBBY_E + T / 2, SHELL.east, hallTop);
    finish('w', SHELL.east, POD.z1 + T / 2, SHELL.north, hallTop);
    finish('w', SHELL.east, CORR_N.z1, POD.z1 + T / 2, A7_H.pod, [[58.8, 61.2]]);
    // the corridor: south wall, west and east ends, the north wall's corridor face
    finish('n', SHELL.south, SHELL.west, SHELL.east, A7_H.corridor);
    finish('e', SHELL.west, SHELL.south, CORR_N.z0, A7_H.corridor);
    finish('w', SHELL.east, SHELL.south, CORR_N.z0, A7_H.corridor);
    finish('s', CORR_N.z0, SHELL.west, SHELL.east, A7_H.corridor, [[PLANT_DOOR.x0 - 0.1, PLANT_LIGHT.x1 + 0.1], [POD_DOOR.x0 - 0.1, POD_DOOR.x1 + 0.1]]);
    // the three wall switches' back-plates (the switch itself is the device's)
    face('w', LOBBY_E - T / 2, 60.3, 60.5, 1.1, 1.3, LOOK.rail, 2);
    face('n', CORR_N.z1, 76.5, 76.7, 1.1, 1.3, LOOK.rail, 2);
    face('s', CORR_N.z0, 71.5, 71.7, 1.1, 1.3, LOOK.rail, 2);
    // the PDU on the west cross aisle's wall (the technician's R1 stop faces it): a 1.2 m cabinet with two doors, breaker rows, a danger plate and phase lamps;
    // (J14) not on the re-plan, where that wall is the glazed screen
    const pz = [56.7, 57.9] as const;
    const px = LOBBY_E + T / 2;
    if (!opts.replan) {
      face('e', px, pz[0], pz[1], 0, 1.95, LOOK.door, 2);
      face('e', px, pz[0], pz[0] + 0.03, 0, 1.95, LOOK.steelDark, 3);
      face('e', px, pz[1] - 0.03, pz[1], 0, 1.95, LOOK.steelDark, 3);
      face('e', px, 57.29, 57.31, 0.1, 1.85, LOOK.steelDark, 3);
      for (const y of [0.9, 1.2, 1.5]) for (const z of [56.85, 57.03, 57.45, 57.63]) face('e', px, z, z + 0.12, y, y + 0.1, LOOK.black, 3);
      face('e', px, 56.78, 57.2, 1.72, 1.88, LOOK.yellow, 3);
      for (const [z, c] of [[57.45, LOOK.red], [57.58, LOOK.yellow], [57.71, LOOK.blue]] as const) face('e', px, z, z + 0.06, 1.76, 1.82, c, 3);
      face('e', px, 56.78, 57.2, 0.4, 0.8, LOOK.vent, 3);
      for (let y = 0.44; y < 0.78; y += 0.08) face('e', px, 56.8, 57.18, y, y + 0.03, LOOK.steelDark, 4);
    }
  });

  // ---- A7-13: the raised access floor (0.6 m tile seams, perforated tiles in the cold aisle), the corridor's concrete ----
  tally(b, p.register, 'A7-13', "Floors (visual skins, no collision): the raised floor's 0.6 m tile seams in the lobby, the hall, the cage and the pod, fourteen perforated tiles in aisle B (cold aisle) in front of rows 1 and 2, and the corridor's concrete with saw joints, a yellow walkway line and oil stains; the surfaces are the greybox's", () => {
    const line = (c: number, a: number, e: number, alongX: boolean): void => (alongX ? paint(a, e, c - 0.01, c + 0.01, LOOK.seam, 0.006) : paint(c - 0.01, c + 0.01, a, e, LOOK.seam, 0.006));
    // lobby and hall (one grid): seams along x at every tile row, along z at every tile column
    for (let z = TILE_ORIGIN.z + TILE; z < SHELL.north; z += TILE) line(z, z > RISER_Z ? LOBBY_E + T / 2 : SHELL.west, SHELL.east, true);
    for (let x = TILE_ORIGIN.x + TILE; x < SHELL.east; x += TILE) line(x, CORR_N.z1, x < LOBBY_E + T / 2 ? RISER_Z : SHELL.north, false);
    // the perforated tiles: dark squares with three light slats, one row in front of each of rows 1 and 2 on aisle B
    for (const z of [60.3, 62.7]) {
      for (let i = 0; i < 7; i++) {
        const x = 78.9 + TILE * i;
        paint(x - 0.24, x + 0.24, z - 0.24, z + 0.24, LOOK.perf, 0.009);
        for (const dz of [-0.14, 0, 0.14]) skin(x - 0.2, x + 0.2, 0.009, 0.011, z + dz - 0.015, z + dz + 0.015, LOOK.perfSlat);
      }
    }
    // the corridor's concrete: saw joints every 3 m, a yellow walkway line beside each wall, stains
    for (let x = 73.0; x < 99; x += 3) paint(x - 0.01, x + 0.01, SHELL.south, CORR_N.z0, LOOK.seam, 0.005);
    paint(SHELL.west, A7_GRATING.x0 - 0.1, 52.55, 52.65, LOOK.yellow);
    paint(A7_GRATING.x1 + 0.1, SHELL.east, 52.55, 52.65, LOOK.yellow);
    for (const [x0, x1, z0, z1] of [[80.2, 81.3, 53.2, 53.9], [88.6, 89.4, 52.6, 53.1], [94.2, 95.0, 54.0, 54.7], [74.5, 75.4, 52.8, 53.3]] as const) paint(x0, x1, z0, z1, LOOK.stain, 0.004);
  });

  // ---- A7-14: the rack rows (props over the greybox runs): rears, ends with row labels, the rack screen at the cage front ----
  const props = new FacilityProps();
  tally(b, p.register, 'A7-14', "Rack rows (props kit serverRack over the four greybox runs, 37 racks; visual skins, no collision): the racks stand 5 cm proud on their fronts and 1 cm up so the run's own box stays the collision, with a rear panel skin on each run's hot side, an end cap with a cool reflector line on every run end, row numbers 1-3 on the west ends and the rack status screen on the east run's west end (the technician reads it at R0)", () => {
    for (const [i, [x0, x1, z0, z1]] of A7_RACKS.entries()) {
      const front = A7_RACK_FRONT[i]!;
      const zc = (front > 0 ? z1 : z0) + front * A7_RACK_PROUD - front * 0.6;
      const n = Math.floor((x1 - x0) / A7_RACK_PITCH + 1e-6);
      for (let k = 0; k < n; k++) props.add('serverRack', x0 + A7_RACK_PITCH / 2 + A7_RACK_PITCH * k, zc, front > 0 ? 0 : Math.PI, { y: A7_PROP_LIFT, group: G_ROWS });
      const zs0 = Math.min(z0, zc - 0.6);
      const zs1 = Math.max(z1, zc + 0.6);
      // the rear (the greybox box's hot-side face, 5 cm proud of the rack's back): a panel, door seams every module and handles; the east run's rear is on the cage
      if (i !== 1) {
        const side = front > 0 ? 's' : 'n';
        const at = front > 0 ? z0 : z1;
        face(side, at, x0, x1, 0, A7_RACK_H, LOOK.rackRear);
        for (let k = 0; k <= n; k++) face(side, at, x0 + A7_RACK_PITCH * k - 0.01, x0 + A7_RACK_PITCH * k + 0.01, 0.05, A7_RACK_H - 0.05, LOOK.black, 1);
        for (let k = 0; k < n; k++) face(side, at, x0 + A7_RACK_PITCH * (k + 0.5) + 0.2, x0 + A7_RACK_PITCH * (k + 0.5) + 0.24, 0.9, 1.3, LOOK.rail, 1);
      }
      // the ends: a dark cap over the end panel and the strip of front the box does not reach, a cool reflector line near the top
      for (const [side, at] of [['w', x0], ['e', x1]] as const) {
        face(side, at, zs0, zs1, 0, A7_RACK_H, LOOK.rack);
        face(side, at, zs0 + 0.05, zs1 - 0.05, 2.0, 2.05, LOOK.rail, 1);
        face(side, at, zs0 + 0.1, zs1 - 0.1, 0.12, 0.15, LOOK.steelDark, 1);
      }
    }
    // row numbers 1, 2, 3 on the west ends (a white plate, the digit in 7-segment strokes: 0.2 x 0.36)
    const seg = (s: string): readonly [number, number, number, number] => {
      const w = 0.2;
      const h = 0.36;
      const t = 0.045;
      const all: Record<string, readonly [number, number, number, number]> = { a: [0, w, h - t, h], b: [w - t, w, h / 2, h], c: [w - t, w, 0, h / 2], d: [0, w, 0, t], e: [0, t, 0, h / 2], f: [0, t, h / 2, h], g: [0, w, (h - t) / 2, (h + t) / 2] };
      return all[s]!;
    };
    const STROKES = { 1: 'bc', 2: 'abged', 3: 'abgcd' } as const;
    const rows = [[1, A7_RACKS[0]!], [2, A7_RACKS[2]!], [3, A7_RACKS[3]!]] as const;
    for (const [n, [x0, , z0, z1]] of rows) {
      const zc = (z0 + z1) / 2;
      face('w', x0, zc - 0.25, zc + 0.25, 1.55, 2.05, LOOK.label, 1);
      for (const k of STROKES[n]) {
        const [u0, u1, v0, v1] = seg(k);
        // the reader's right on a west-facing end runs towards -z
        face('w', x0, zc + 0.1 - u1, zc + 0.1 - u0, 1.62 + v0, 1.62 + v1, LOOK.black, 2);
      }
    }
    // the rack status screen at the cage front: a bezel, a dark screen with three green status rows, a keypad plate
    const [ex0, , ez0, ez1] = A7_RACKS[1]!;
    face('w', ex0, ez0 + 0.2, ez1 - 0.25, 1.15, 1.85, LOOK.steelDark, 1);
    face('w', ex0, ez0 + 0.25, ez1 - 0.3, 1.3, 1.8, LOOK.screen, 2);
    for (const y of [1.4, 1.52, 1.64]) face('w', ex0, ez0 + 0.32, ez1 - 0.5, y, y + 0.05, LOOK.glow, 3);
    face('w', ex0, ez0 + 0.3, ez1 - 0.35, 1.18, 1.28, LOOK.black, 2);
  });

  // ---- A7-15: overhead: the trays' accent slots (circuit 70) and the gas-suppression pipework ----
  tally(b, p.register, 'A7-15', 'Overhead (kit accent slots and visual skins, no collision): cool accent slots (no light, on circuit 70) under the rack-row trays, a gas-suppression main with nozzle drops and a yellow band over aisles A and C, the lobby ceiling grid', () => {
    for (const [x0, z0, x1, z1, y] of A7_TRAYS.slice(0, 4)) kit.ledSlot((x0 + x1) / 2, y, (z0 + z1) / 2, x1 - x0, 0, { tone: 'cool', light: false, group: G_ROWS });
    // the suppression main along the aisles (above the lamps' fixtures, under the slab at 4.0): two long runs and nozzle drops with a yellow band
    for (const z of [57.2, 65.9]) {
      skin(SHELL.west + 6, SHELL.east, 3.55, 3.63, z - 0.04, z + 0.04 - 0.04, LOOK.pipeRed);
      for (let x = 78.0; x < SHELL.east - 0.5; x += 3.0) {
        skin(x - 0.02, x + 0.02, 3.35, 3.55, z - 0.04, z - 0.01, LOOK.pipeRed);
        skin(x - 0.05, x + 0.05, 3.33, 3.36, z - 0.04, z - 0.01, LOOK.yellow);
      }
    }
    // the lobby's ceiling tile grid (1.2 m) on its 3.0 m soffit
    for (let x = 71.4; x < LOBBY_E - 0.2; x += 1.2) skin(x - 0.01, x + 0.01, A7_H.lobby - 0.03, A7_H.lobby, CORR_N.z1, RISER_Z, LOOK.seam);
    for (let z = 57.15; z < RISER_Z - 0.2; z += 1.2) skin(SHELL.west, LOBBY_E - T / 2, A7_H.lobby - 0.03, A7_H.lobby, z - 0.01, z + 0.01, LOOK.seam);
  });

  // ---- A7-16: the cage: posts, rails, plates, lintels, lid skin; the terminals' bezels, screens, keypads and cable drops ----
  const cmesh = mesh;
  const ckick = kick;
  const cpt = panelT;
  const cdoor = door;
  tally(b, p.register, 'A7-16', "Cage dressing (visual skins, no collision): 40 x 120 mm steel posts on the fence lines (corners, door jambs, clear of the terminals' lamps), top rails at 2.4 m and mid rails at 1.2 m, riveted kick-panel plates with ribs on both faces, lintel plates over both doors, the lid's top sheet; terminal bezels with dark screens, keypads, card readers and cable drops on T1 and T2 (the ready lamps and the hack spots untouched)", () => {
    const h = cpt / 2;
    // posts: blades on the fence lines (0.04 across, 0.12 along), kick-height to the mesh top
    for (const z of POST_Z) for (const x of [cx0, cx1]) skin(x - 0.02, x + 0.02, 0, cmesh, z - 0.06, z + 0.06, LOOK.steel);
    for (const x of POST_X) for (const z of [cz0, cz1]) skin(x - 0.06, x + 0.06, 0, cmesh, z - 0.02, z + 0.02, LOOK.steel);
    // rails: the top rail at 2.4 and the mid rail at 1.2 (door spans left clear on the west and east faces)
    const doorSpans = [[cz0, cdoor[0]], [cdoor[1], cz1]] as const;
    for (const x of [cx0, cx1]) {
      for (const [a, e] of doorSpans) {
        skin(x - 0.02, x + 0.02, cmesh - 0.06, cmesh, a, e, LOOK.steel);
        skin(x - 0.02, x + 0.02, ckick, ckick + 0.05, a, e, LOOK.steel);
        skin(x - 0.02, x + 0.02, 1.8, 1.84, a, e, LOOK.steelDark);
      }
    }
    for (const z of [cz0, cz1]) {
      skin(cx0, cx1, cmesh - 0.06, cmesh, z - 0.02, z + 0.02, LOOK.steel);
      skin(cx0, cx1, ckick, ckick + 0.05, z - 0.02, z + 0.02, LOOK.steel);
      skin(cx0, cx1, 1.8, 1.84, z - 0.02, z + 0.02, LOOK.steelDark);
    }
    // kick plates on both faces of every run: a panel and two ribs, the plate's rivets along the top
    const kickRuns: [number, number, number][] = [
      [cx0 - h, cz0, cdoor[0]],
      [cx0 - h, cdoor[1], cz1],
      [cx1 - h, cz0, cdoor[0]],
      [cx1 - h, cdoor[1], cz1],
    ];
    for (const [at, a, e] of kickRuns) {
      // west-facing faces (outward -x): the west run's outside and the east run's inside; the mirror faces on +x
      face('w', at, a, e, 0.05, ckick - 0.05, LOOK.rackRear);
      face('e', at + cpt, a, e, 0.05, ckick - 0.05, LOOK.rackRear);
      for (const y of [0.4, 0.8]) {
        face('w', at, a, e, y, y + 0.04, LOOK.steelDark, 1);
        face('e', at + cpt, a, e, y, y + 0.04, LOOK.steelDark, 1);
      }
    }
    for (const z of [cz0, cz1]) {
      face('s', z - h, cx0, cx1, 0.05, ckick - 0.05, LOOK.rackRear);
      face('n', z + h, cx0, cx1, 0.05, ckick - 0.05, LOOK.rackRear);
      for (const y of [0.4, 0.8]) {
        face('s', z - h, cx0, cx1, y, y + 0.04, LOOK.steelDark, 1);
        face('n', z + h, cx0, cx1, y, y + 0.04, LOOK.steelDark, 1);
      }
    }
    // lintel plates over both doors (the greybox's 2.1-2.4 boxes) with a green "released" bar and a label plate
    for (const [sideOut, sideIn, x] of [['w', 'e', cx0] as const, ['e', 'w', cx1] as const]) {
      const out = x + (sideOut === 'e' ? h : -h);
      const inn = x + (sideIn === 'e' ? h : -h);
      face(sideOut, out, cdoor[0], cdoor[1], DOOR_H + 0.02, cmesh - 0.02, LOOK.steelDark);
      face(sideIn, inn, cdoor[0], cdoor[1], DOOR_H + 0.02, cmesh - 0.02, LOOK.steelDark);
      face(sideOut, out, cdoor[0] + 0.15, cdoor[1] - 0.15, DOOR_H + 0.12, DOOR_H + 0.2, LOOK.red, 1);
      face(sideOut, out, cdoor[0] + 0.3, cdoor[1] - 0.3, DOOR_H + 0.05, DOOR_H + 0.09, LOOK.label, 1);
    }
    // the lid's top sheet with its seams and a lifting plate
    skin(cx0 - h, cx1 + h, cmesh + A7_CAGE.lidT, cmesh + A7_CAGE.lidT + SKIN, cz0 - h, cz1 + h, LOOK.rackRear);
    for (const x of [88.4, 90.8, 93.2]) skin(x - 0.01, x + 0.01, cmesh + A7_CAGE.lidT + SKIN, cmesh + A7_CAGE.lidT + 2 * SKIN - 0.01, cz0 - h, cz1 + h, LOOK.steelDark);
    // the terminals (the greybox's 0.9 m housings sit just inside the fence, 0.15 from its line): a bezel on the front, a screen, a shelf with a keypad,
    // a card reader and a cable drop from the lid at the housing's edge (never over the ready lamps at the panel's middle, z 61.5)
    for (const [at, side, sgn] of [[A7_T1_AT.x - Math.sin(A7_T1_AT.yaw) * 0.2 - 0.04, 'w', -1] as const, [A7_T2_AT.x - Math.sin(A7_T2_AT.yaw) * 0.2 + 0.04, 'e', 1] as const]) {
      const z0 = A7_T1_AT.z - 0.45;
      const z1 = A7_T1_AT.z + 0.45;
      face(side, at, z0, z1, 0.95, 1.85, LOOK.rack, 0);
      face(side, at, z0 + 0.1, z1 - 0.1, 1.3, 1.78, LOOK.screen, 1);
      for (const y of [1.42, 1.54, 1.66]) face(side, at, z0 + 0.16, z1 - 0.34, y, y + 0.05, LOOK.glow, 2);
      skin(sgn < 0 ? at - 0.07 : at, sgn < 0 ? at : at + 0.07, 1.08, 1.11, z0 + 0.1, z1 - 0.1, LOOK.rack);
      for (let k = 0; k < 6; k++) skin(sgn < 0 ? at - 0.06 : at + 0.01, sgn < 0 ? at - 0.01 : at + 0.06, 1.11, 1.13, z0 + 0.14 + 0.1 * k, z0 + 0.2 + 0.1 * k, LOOK.perfSlat);
      face(side, at, z1 - 0.28, z1 - 0.12, 1.0, 1.2, LOOK.steelDark, 1);
      face(side, at, z1 - 0.24, z1 - 0.16, 1.1, 1.14, LOOK.glow, 2);
      face(side, at, z0 + 0.02, z0 + 0.06, 1.85, cmesh - 0.04, LOOK.cable, 1);
    }
  });

  // ---- A7-17: the plant corridor: cooling units' sides, the trench grating, pipes, wall plant ----
  tally(b, p.register, 'A7-17', "Plant corridor (props kit coolingUnit over the three greybox boxes, visual skins, no collision): side panels with seams and louvres capping each unit's flanks (the west lee included), the 6 m trench grating as a dark pit under 60 longitudinal bars, cross bearers, an angle frame and hazard edge strips, chilled-water flow and return pipes with brackets and valves along the north wall, a gas bottle rack and an electrical board at the west end, a fire point", () => {
    for (const x of A7_UNITS) {
      props.add('coolingUnit', x, A7_UNIT_Z, Math.PI, { y: A7_PROP_LIFT, group: G_PLANT });
      const zs0 = A7_UNIT_Z - 0.45;
      for (const [side, at] of [['w', x - A7_UNIT.w / 2], ['e', x + A7_UNIT.w / 2]] as const) {
        face(side, at, zs0, A7_UNIT.z1, 0, A7_UNIT.h, LOOK.unit);
        for (const y of [0.45, 1.3, 1.9]) face(side, at, zs0, A7_UNIT.z1, y, y + 0.02, LOOK.steel, 1);
        for (let y = 0.6; y < 1.2; y += 0.1) face(side, at, zs0 + 0.2, A7_UNIT.z1 - 0.3, y, y + 0.04, LOOK.vent, 1);
        face(side, at, zs0, A7_UNIT.z1, 0, 0.1, LOOK.steelDark, 1);
      }
    }
    // the trench grating: the greybox's flush plate is the base; a dark pit, longitudinal bars (0.04 wide, 0.1 pitch), cross bearers, the angle frame
    const { x0: gx0, x1: gx1 } = A7_GRATING;
    paint(gx0, gx1, SHELL.south, CORR_N.z0, LOOK.pit, 0.014);
    for (let x = gx0 + 0.05; x < gx1; x += 0.1) skin(x - 0.02, x + 0.02, 0.014, 0.026, SHELL.south, CORR_N.z0, LOOK.grate);
    for (let x = gx0; x <= gx1 + 1e-9; x += 0.75) skin(x - 0.02, x + 0.02, 0.026, 0.036, SHELL.south, CORR_N.z0, LOOK.steel);
    for (const z of [SHELL.south, CORR_N.z0 - 0.06]) skin(gx0, gx1, 0.012, 0.04, z, z + 0.06, LOOK.steel);
    for (const x of [gx0 - 0.06, gx1]) skin(x, x + 0.06, 0, 0.04, SHELL.south, CORR_N.z0, LOOK.steel);
    for (const x of [gx0 - 0.16, gx1 + 0.06]) paint(x, x + 0.1, SHELL.south, CORR_N.z0, LOOK.yellow, 0.007);
    // chilled-water flow (blue) and return (red) pipes on the corridor's north wall above the units, 0.14 m, on brackets every 1.5 m, with valve wheels
    const pipe = (y: number, color: string): void => {
      for (const [a, e] of wallRuns(SHELL.west + 0.3, SHELL.east - 0.3, [[PLANT_DOOR.x0 - 0.2, PLANT_LIGHT.x1 + 0.2], [POD_DOOR.x0 - 0.2, POD_DOOR.x1 + 0.2]])) {
        face('s', CORR_N.z0, a, e, y, y + 0.14, color, 1);
        face('s', CORR_N.z0, a, e, y + 0.04, y + 0.06, LOOK.label, 2);
      }
      for (let x = 76.0; x < 97; x += 1.5) if (!(x > PLANT_DOOR.x0 - 0.3 && x < PLANT_LIGHT.x1 + 0.3) && !(x > POD_DOOR.x0 - 0.3 && x < POD_DOOR.x1 + 0.3)) face('s', CORR_N.z0, x - 0.03, x + 0.03, y - 0.14, y + 0.14, LOOK.steelDark, 2);
    };
    pipe(2.75, LOOK.pipeBlue);
    pipe(2.95, LOOK.pipeRed);
    for (const x of [79.5, 88.5, 95.0]) {
      face('s', CORR_N.z0, x - 0.1, x + 0.1, 2.75, 2.89, LOOK.steelDark, 2);
      face('s', CORR_N.z0, x - 0.1, x + 0.1, 2.89, 2.93, LOOK.red, 3);
    }
    // the west end: an electrical board on the shell's end wall's south part, a gas bottle rack and a fire point on the south wall
    face('e', SHELL.west, 52.55, 53.55, 0.9, 2.1, LOOK.door, 1);
    face('e', SHELL.west, 52.55, 53.55, 0.9, 0.93, LOOK.steelDark, 2);
    face('e', SHELL.west, 52.6, 53.5, 1.7, 1.78, LOOK.yellow, 2);
    for (const z of [52.7, 52.95, 53.2, 53.4]) face('e', SHELL.west, z, z + 0.1, 1.1, 1.4, LOOK.black, 2);
    for (const x of [78.0, 78.45, 78.9, 79.35]) {
      face('n', SHELL.south, x - 0.1, x + 0.1, 0, 1.4, LOOK.red, 1);
      face('n', SHELL.south, x - 0.05, x + 0.05, 1.4, 1.5, LOOK.steel, 1);
    }
    face('n', SHELL.south, 77.7, 79.65, 0.35, 0.4, LOOK.steelDark, 2);
    face('n', SHELL.south, 77.7, 79.65, 1.0, 1.05, LOOK.steelDark, 2);
    face('n', SHELL.south, 82.0, 82.4, 0.9, 1.5, LOOK.red, 1);
    face('n', SHELL.south, 82.05, 82.35, 1.55, 1.9, LOOK.label, 1);
    face('n', SHELL.south, 82.1, 82.3, 1.62, 1.7, LOOK.red, 2);
    // door architraves on the corridor side: the plant door and the pod door
    architrave('s', CORR_N.z0, PLANT_DOOR.x0, PLANT_DOOR.x1);
    architrave('s', CORR_N.z0, PLANT_LIGHT.x0, PLANT_LIGHT.x1);
    architrave('s', CORR_N.z0, POD_DOOR.x0, POD_DOOR.x1);
  });

  // ---- A7-18: the containment pod: panels on the walls, a door frame, the L7 door's surround, terminal two's reader ----
  tally(b, p.register, 'A7-18', "Containment pod dressing (visual skins, no collision): pale polycarbonate panels with dark seams on the pod's west and north walls (both faces) and its east face, a yellow-black base band, hot-aisle labels, architrave on its south door, a danger plate, the roof's front fascia", () => {
    const podWalls: [string, 's' | 'n' | 'e' | 'w', number, number, number][] = [
      ['w-hall-s', 'w', POD.x0 - T / 2, CORR_N.z1, cz0 - cpt / 2],
      ['w-hall-n', 'w', POD.x0 - T / 2, cz1 + cpt / 2, POD.z1 + T / 2],
      ['w-in-s', 'e', POD.x0 + T / 2, CORR_N.z1, cz0 - cpt / 2],
      ['w-in-n', 'e', POD.x0 + T / 2, cz1 + cpt / 2, POD.z1 - T / 2],
      ['n-in', 's', POD.z1 - T / 2, POD.x0 + T / 2, POD.x1],
      ['n-out', 'n', POD.z1 + T / 2, POD.x0 - T / 2, POD.x1],
    ];
    for (const [, side, at, a, e] of podWalls) {
      face(side, at, a, e, 0.15, A7_H.pod, LOOK.pod);
      for (let q = Math.ceil(a / 1.2) * 1.2; q < e; q += 1.2) face(side, at, q - 0.015, q + 0.015, 0.15, A7_H.pod, LOOK.podSeam, 1);
      face(side, at, a, e, 1.1, 1.14, LOOK.podSeam, 1);
      hazard(side, at, a, e);
      face(side, at, a, e, A7_H.pod - 0.08, A7_H.pod, LOOK.steelDark, 1);
    }
    // hot-aisle labels on the hall faces: a yellow plate with a black bar
    for (const z of [57.5, 67.0]) {
      face('w', POD.x0 - T / 2, z - 0.4, z + 0.4, 1.5, 1.9, LOOK.yellow, 1);
      face('w', POD.x0 - T / 2, z - 0.3, z + 0.3, 1.66, 1.74, LOOK.black, 2);
    }
    architrave('n', CORR_N.z1, POD_DOOR.x0, POD_DOOR.x1);
    face('n', CORR_N.z1, 99.0, 99.4, 1.4, 1.7, LOOK.red, 1);
    face('n', CORR_N.z1, 99.05, 99.35, 1.45, 1.5, LOOK.label, 2);
    // the L7 near door's hall-side surround and the pod's east wall base band (the facility's sliding frame stays as it is)
    hazard('w', SHELL.east, CORR_N.z1, 58.8);
    hazard('w', SHELL.east, 61.2, POD.z1 + T / 2);
  });

  // ---- A7-19: the lobby: fire plan frame and routes, coat bay, door architraves and signage, visitor board ----
  tally(b, p.register, 'A7-19', "Lobby (visual skins, no collision): the fire plan board's frame and its drawn plan (hall, cage, corridor, the two routes, both terminals and both cameras as flat marks), architraves on the hall and plant doors on both faces, the coat bay's hook rail with five coats and a shelf on the riser block's wall, a visitor sign-in board, a fire point and the lobby door's push plates", () => {
    // the fire plan: the greybox board is 1.2 x 0.9 at (72.4-73.6, 1.05-1.95) on z 65.82-65.85; a frame, a white field and the plan in flat marks
    const fx0 = 72.4;
    const fx1 = 73.6;
    face('s', RISER_Z, fx0 - 0.04, fx1 + 0.04, 1.01, 1.05, LOOK.steelDark, 1);
    face('s', RISER_Z, fx0 - 0.04, fx1 + 0.04, 1.95, 1.99, LOOK.steelDark, 1);
    face('s', RISER_Z, fx0 - 0.04, fx0, 1.05, 1.95, LOOK.steelDark, 1);
    face('s', RISER_Z, fx1, fx1 + 0.04, 1.05, 1.95, LOOK.steelDark, 1);
    face('s', RISER_Z - 0.03, fx0 + 0.05, fx1 - 0.05, 1.1, 1.9, LOOK.cream, 0);
    // the plan (north up, x 70-100 over 1.1 m, z 52-72 over 0.7 m): hall outline, cage, pod, corridor
    const mx = (x: number): number => fx0 + 0.05 + ((x - 70) / 30) * 1.1;
    const my = (z: number): number => 1.15 + ((z - 52) / 20) * 0.7;
    const mark = (x0: number, x1: number, z0: number, z1: number, color: string, ly = 1): void => face('s', RISER_Z - 0.03, mx(x0), mx(x1), my(z0), my(z1), color, ly);
    mark(70.5, 99.5, 55.95, 71.5, LOOK.paint, 1);
    mark(86, 96, 60, 66, LOOK.steel, 2);
    mark(96, 99.5, 56, 68, LOOK.pod, 2);
    mark(70.5, 99.5, 52.4, 55.4, LOOK.dado, 1);
    mark(73, 98, 53.8, 54.1, LOOK.green, 2);
    mark(76.2, 86, 61.4, 61.7, LOOK.blue, 2);
    mark(85.2, 86.4, 61.2, 61.8, LOOK.red, 3);
    mark(95.6, 96.8, 61.2, 61.8, LOOK.red, 3);
    mark(86.2, 86.9, 70.9, 71.5, LOOK.yellow, 3);
    mark(98.9, 99.5, 53.7, 54.3, LOOK.yellow, 3);
    // architraves: the hall door and its sidelight on both faces; the plant door and its sidelight on the lobby face
    for (const [side, at] of [['w', LOBBY_E - T / 2], ['e', LOBBY_E + T / 2]] as const) {
      architrave(side, at, HALL_DOOR.z0, HALL_DOOR.z1);
      architrave(side, at, HALL_LIGHT.z0, HALL_LIGHT.z1);
    }
    architrave('n', CORR_N.z1, PLANT_DOOR.x0, PLANT_DOOR.x1);
    architrave('n', CORR_N.z1, PLANT_LIGHT.x0, PLANT_LIGHT.x1);
    // push plates and card readers beside the hall door's lobby face
    face('w', LOBBY_E - T / 2, 60.62, 60.82, 0.95, 1.15, LOOK.steel, 2);
    face('w', LOBBY_E - T / 2, 60.65, 60.79, 1.2, 1.26, LOOK.green, 3);
    // the coat bay (x 74.5-76, z 64-66) on the riser block's wall: a hook rail with five coats, a shelf over it
    face('s', RISER_Z, 74.5, 75.85, 1.75, 1.8, LOOK.steelDark, 1);
    face('s', RISER_Z, 74.5, 75.85, 2.0, 2.04, LOOK.steelDark, 1);
    for (const [i, x] of [74.65, 74.85, 75.05, 75.3, 75.55].entries()) {
      face('s', RISER_Z, x - 0.07, x + 0.07, 0.95, 1.7, [LOOK.coatA, LOOK.coatB, LOOK.coatC][i % 3]!, 2);
      face('s', RISER_Z, x - 0.04, x + 0.04, 1.7, 1.78, LOOK.black, 3);
    }
    // a visitor sign-in board and a fire point on the lobby's east wall, north of the hall door sidelight
    face('w', LOBBY_E - T / 2, 64.2, 65.2, 1.15, 1.75, LOOK.steelDark, 1);
    face('w', LOBBY_E - T / 2, 64.28, 65.12, 1.25, 1.65, LOOK.cream, 2);
    for (const y of [1.33, 1.43, 1.53]) face('w', LOBBY_E - T / 2, 64.35, 65.05, y, y + 0.02, LOOK.dado, 3);
    face('w', LOBBY_E - T / 2, 65.35, 65.65, 0.85, 1.35, LOOK.red, 1);
    face('w', LOBBY_E - T / 2, 65.4, 65.6, 1.4, 1.7, LOOK.label, 1);
  });

  // ---- A7-20: the riser block as a services core (6 x 6 m, solid: risers, trays, access panels, signage plates) ----
  const R = A7_RISER;
  tally(b, p.register, 'A7-20', "Riser block as a services core (visual skins and props, no collision): on the hall face (x 76.15) two steel riser doors with louvres and lock plates, four access hatches, a vertical cable ladder with rungs, conduit risers, two horizontal pipe runs and a hazard base; on the lobby face (z 65.85) a third riser door, a hose cabinet and a conduit; sign plates 'RISER' over every door", () => {
    const e = R.x1;
    const s = R.z0;
    const riserDoor = (side: 'e' | 's', at: number, c: number, name: 'a' | 'b'): void => {
      // a 0.9 x 2.0 steel leaf in a frame: hinge barrels, a lever handle and lock plate, a louvre panel over the head
      face(side, at, c - 0.52, c + 0.52, 0, 2.12, LOOK.steelDark, 1);
      face(side, at, c - 0.45, c + 0.45, 0.04, 2.05, LOOK.door, 2);
      face(side, at, c - 0.45, c + 0.45, 1.0, 1.04, LOOK.steelDark, 3);
      for (const y of [0.25, 1.0, 1.75]) face(side, at, c - 0.47, c - 0.43, y, y + 0.12, LOOK.black, 3);
      face(side, at, c + 0.28, c + 0.4, 0.98, 1.04, LOOK.rail, 3);
      face(side, at, c + 0.3, c + 0.38, 1.05, 1.22, LOOK.rail, 3);
      face(side, at, c + 0.25, c + 0.4, 0.86, 0.94, LOOK.steelDark, 3);
      for (let y = 1.55; y < 1.9; y += 0.07) face(side, at, c - 0.3, c + 0.3, y, y + 0.03, LOOK.vent, 3);
      face(side, at, c - 0.4, c + 0.4, 1.3, 1.5, name === 'a' ? LOOK.yellow : LOOK.red, 3);
      face(side, at, c - 0.33, c + 0.33, 1.36, 1.44, LOOK.black, 4);
    };
    // the hall face: the base, doors at z 67.0 and 70.4, hatches between them, the ladder and conduits
    hazard('e', e, s, R.z1);
    face('e', e, s, R.z1, 0.15, 1.0, LOOK.dado);
    face('e', e, s, R.z1, 1.0, A7_H.slab, LOOK.paint);
    face('e', e, s, R.z1, 1.0, 1.05, LOOK.rail, 1);
    riserDoor('e', e, 67.0, 'a');
    riserDoor('e', e, 70.4, 'b');
    for (const [c, y] of [[68.55, 0.35], [68.55, 1.15], [68.55, 1.95]] as const) hatch('e', e, c, y, 0.5, 0.6, LOOK.door);
    // the vertical cable ladder up the face between the hatches and the second door (two rails, a rung every 0.3 m), over a head-height cable drop
    face('e', e, 69.2, 69.24, 0.2, A7_H.slab - 0.05, LOOK.steel, 1);
    face('e', e, 69.6, 69.64, 0.2, A7_H.slab - 0.05, LOOK.steel, 1);
    for (let y = 0.3; y < A7_H.slab - 0.1; y += 0.3) face('e', e, 69.2, 69.64, y, y + 0.03, LOOK.steel, 2);
    for (const [z, y0] of [[69.3, 0.3], [69.42, 1.1], [69.54, 2.2]] as const) face('e', e, z, z + 0.06, y0, y0 + 1.2, LOOK.cable, 3);
    // conduit risers (three 25 mm runs) with saddles, and two horizontal pipe runs (a flow and a return) at 3.2 / 3.4
    for (const z of [66.1, 66.25, 66.4]) {
      face('e', e, z, z + 0.04, 0.2, A7_H.slab - 0.05, LOOK.conduit, 1);
      for (const y of [0.6, 1.4, 2.2, 3.0]) face('e', e, z - 0.01, z + 0.05, y, y + 0.04, LOOK.steelDark, 2);
    }
    face('e', e, s, R.z1, 3.2, 3.34, LOOK.pipeBlue, 1);
    face('e', e, s, R.z1, 3.45, 3.59, LOOK.pipeRed, 1);
    for (let z = 66.3; z < R.z1; z += 1.5) face('e', e, z - 0.03, z + 0.03, 3.1, 3.7, LOOK.steelDark, 2);
    // the lobby face (x 70.25-76.15): a base, a riser door at x 71.3, a hose cabinet at 74.2 (the fire plan at 72.4-73.6 and the coat bay at 74.5 stay as the lobby set them)
    face('s', s, R.x0, R.x1, 0.15, 1.0, LOOK.dado);
    face('s', s, R.x0, R.x1, 1.0, 1.05, LOOK.paint);
    face('s', s, R.x0, R.x1, 1.95, A7_H.lobby, LOOK.paint);
    // (the fire plan's greybox board occupies the first skin's place at x 72.4-73.6, y 1.05-1.95: the paint leaves it bare)
    for (const [a, z] of wallRuns(R.x0, R.x1, [[72.4, 73.6]])) {
      face('s', s, a, z, 1.05, 1.95, LOOK.paint);
      face('s', s, a, z, 1.0, 1.05, LOOK.rail, 1);
    }
    face('s', s, 72.4, 73.6, 1.0, 1.05, LOOK.rail, 1);
    hazard('s', s, R.x0, R.x1);
    riserDoor('s', s, 71.35, 'a');
    face('s', s, 73.65, 74.45, 1.0, 1.9, LOOK.red, 1);
    face('s', s, 73.7, 74.4, 1.05, 1.85, LOOK.steelDark, 2);
    face('s', s, 73.75, 74.35, 1.1, 1.8, LOOK.screen, 3);
    face('s', s, 73.8, 74.3, 1.55, 1.75, LOOK.label, 4);
    face('s', s, 70.4, 70.44, 0.2, A7_H.lobby - 0.05, LOOK.conduit, 1);
    face('s', s, 70.5, 70.54, 0.2, A7_H.lobby - 0.05, LOOK.conduit, 1);
    // sign plates over the doors (props: dark plate, backlit face; text waits for a texture): see the props row
  });

  // ---- A7-21: the hall above the set (kit panels with accent coves on their circuits; no lamp) ----
  tally(b, p.register, 'A7-21', "Kit panels above the data hall (visual): the hall's charcoal panels and coves from the slab's top (4.2 m) to the roof on the west, north and east walls (rack rows 70) and from the gallery glazing's top (7.5 m) over the south wall (plant corridor 72); coves on their circuit's group", () => {
    const corner = 0.09;
    const rise = HALL_H - SLAB_TOP;
    kit.wallPanel(SHELL.west, (SHELL.south + corner + SHELL.north - corner) / 2, SHELL.north - SHELL.south - 2 * corner, Math.PI / 2, { h: rise, y: SLAB_TOP, tone: 'cool', group: G_ROWS });
    kit.wallPanel((SHELL.west + SHELL.east) / 2, SHELL.north, SHELL.east - SHELL.west - 2 * corner, Math.PI, { h: rise, y: SLAB_TOP, tone: 'cool', group: G_ROWS });
    kit.wallPanel(SHELL.east, (SHELL.south + corner + SHELL.north - corner) / 2, SHELL.north - SHELL.south - 2 * corner, -Math.PI / 2, { h: rise, y: SLAB_TOP, tone: 'cool', group: G_ROWS });
    kit.wallPanel((SHELL.west + SHELL.east) / 2, SHELL.south, SHELL.east - SHELL.west - 2 * corner, 0, { h: HALL_H - GAL_TOP, y: GAL_TOP, tone: 'cool', group: G_PLANT });
  });

  // ---- A7-22: accent slots in the corridor and the pod roof (kit, no light; each on its circuit) ----
  tally(b, p.register, 'A7-22', 'Accent slots (kit, no light, on their circuit): the plant corridor ceiling line (72) and the pod roof line (73)', () => {
    kit.ledSlot(86.0, A7_H.corridor, 53.0, 22, 0, { tone: 'white', light: false, group: G_PLANT });
    kit.ledSlot(99.2, A7_H.pod, 62.0, 11, Math.PI / 2, { tone: 'cool', light: false, group: G_POD });
  });

  // ---- A7-23: the props kit (PROPS.md 3 A7): 37 racks and 3 cooling units over the greybox boxes, the trays, the door signs. NO collision is written: the boxes are the greybox's ----
  tally(b, p.register, 'A7-23', 'Props kit: 37 serverRack over the four rack runs and 3 coolingUnit over the corridor boxes (visual over the greybox boxes: no collision written, 5 cm proud on the fronts), cableTray modules over the rows, the west cross aisle and the corridor (hung, none), signPlate stand-ins over the hall, plant, pod and riser doors (hung, none)', () => {
    for (const [x0, z0, x1, z1, y] of A7_TRAYS) props.row('cableTray', x0, z0, x1, z1, { y });
    // (S3-7 S1) each plate's face is on the circuit that lights the side it faces: the lobby and the hall on the rack rows (70), the corridor on 72, the pod on 73
    const plate = (x: number, z: number, yaw: number, group: number, y = 2.2): void => void props.add('signPlate', x, z, yaw, { y, group });
    plate(LOBBY_E - T / 2, 61.6, -Math.PI / 2, G_ROWS);
    plate(LOBBY_E + T / 2, 61.6, Math.PI / 2, G_ROWS);
    plate(73.0, CORR_N.z1, 0, G_ROWS);
    plate(73.0, CORR_N.z0, Math.PI, G_PLANT);
    plate(98.0, CORR_N.z1, 0, G_POD);
    plate(98.0, CORR_N.z0, Math.PI, G_PLANT);
    plate(R.x1, 67.0, Math.PI / 2, G_ROWS, 2.2);
    plate(R.x1, 70.4, Math.PI / 2, G_ROWS, 2.2);
    plate(71.35, R.z0, Math.PI, G_ROWS, 2.2);
  });
  p.props.push(...props.placements);

  return p;
}
