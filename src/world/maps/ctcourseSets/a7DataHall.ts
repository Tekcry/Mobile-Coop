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
 *   six fence anchors locked by `anchorLock` gates on a flag nothing sets (ENGINE-ANSWERS Q8), two 1.2 m doors on the sync;
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
 */
import type { AnchorLockGate, CourseDevice, FlagGate } from '../../../game/course/courseDef';
import type { CameraDevice } from '../../../security/data';
import { KIT_BOX_COLOR, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { marlowCourseGroups } from '../../lighting/marlowCircuits';
import { applyGreybox, syncStation } from '../ctcourseGreybox';
import { emptyPart, holdDoorId, tally, type Box, type SetPart } from './types';

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
export const A7_CAM2: CameraDevice = { id: 'a7-cam2', kind: 'camera', level: 'ground', at: [99.6, 54.0], y: 3.0, facing: 270, sweep: [220, 320], aim: 9, range: 18, reason: 'Plant corridor CCTV at its east end, sweeping the corridor and the pod door' };

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

export function buildA7DataHall(b: LevelBuilder, kit: FacilityKit): SetPart {
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
    slab(x0, x1, CORR_N.z1, HALL_DOOR.z0, 0, A7_H.slab, KIT_BOX_COLOR);
    slab(x0, x1, HALL_DOOR.z1, HALL_LIGHT.z0, 0, A7_H.slab, KIT_BOX_COLOR);
    slab(x0, x1, HALL_LIGHT.z1, RISER_Z, 0, A7_H.slab, KIT_BOX_COLOR);
    slab(x0, x1, HALL_DOOR.z0, HALL_LIGHT.z1, DOOR_H, A7_H.slab, KIT_BOX_COLOR);
    slab(PLANT_DOOR.x0, PLANT_LIGHT.x1, CORR_N.z0, CORR_N.z1, DOOR_H, A7_H.slab, KIT_BOX_COLOR);
    slab(SHELL.west, x0, CORR_N.z1, RISER_Z, A7_H.lobby, A7_H.lobby + 0.1, KIT_BOX_COLOR, { overhead: true });
    kit.glass(LOBBY_E, HALL_LIGHT.z0, LOBBY_E, HALL_LIGHT.z1, DOOR_H);
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
  tally(b, p.register, 'A7-2', 'Cage 10 x 6 (x 86-96, z 60-66): b.fence mesh 2.4 m on all four faces (sight, the ready lamps and the jam line pass it; bodies do not) over 1.2 m solid kick panels (noLedge), door lintels; terminals T1 (west face) and T2 (east face) 10.1 m apart (syncStation, scan)', () => {
    for (const [id, ax, az, bx, bz] of runs) {
      p.anchors[id] = b.fence(ax, az, bx, bz, mesh, 0).id;
      const h = panelT / 2;
      slab(Math.min(ax, bx) - (ax === bx ? h : 0), Math.max(ax, bx) + (ax === bx ? h : 0), Math.min(az, bz) - (az === bz ? h : 0), Math.max(az, bz) + (az === bz ? h : 0), 0, kick, KICK);
    }
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
    for (const [x, z] of [[81.6, 57.4], [80.9, 61.5], [80.9, 65.7], [91.0, 57.4], [91.0, 69.0]] as const) strip(x, z, true, 70, 3.8, 4.5, 1.0);
    strip(84.5, 61.8, false, 70, 3.8, 4.5, 1.0);
    b.light({ x: 73.0, y: 2.9, z: 61.0, radius: 4.0, intensity: 0.8, color: COOL, group: 70, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.05, sz: 0.6, oy: 0.025 } });
    bulkhead(76.4, 2.6, 57.4, 71, 3.2, 0.9, COOL);
    bulkhead(76.4, 2.6, 69.9, 71, 3.2, 0.9, COOL);
    for (const x of [74.0, 79.5, 85.0, 91.0]) bulkhead(x, 3.0, 53.9, 72, 4.5, 1.0, WHITE);
    for (const z of [60.0, 63.0]) strip(97.8, z, false, 73, 2.5, 3.5, 1.0);
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
  p.navSeeds.push({ x: 73, y: 0, z: 61 }, { x: 80.9, y: 0, z: 61.5 }, { x: 80, y: 0, z: 53.9 }, { x: 98, y: 0, z: 62 }, { x: 91, y: 0, z: 63 });
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
  return p;
}
