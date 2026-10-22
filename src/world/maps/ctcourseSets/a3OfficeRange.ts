/**
 * A3 the Office Range (SPEC section 9 "A3 - Set 3, the Office Range"; set doc `docs/marlow-final/sets/a3OfficeRange.md`;
 * PLAN slice 3, steps 2-4: greybox, lights, guard / objective steps / e2e). A commercial office floor at night: a west lift
 * lobby, the 17.5 m corridor with a ceiling IR camera at its far end, three offices let to one tenant and an east lift lobby.
 * It teaches the timed jam relay: the jammer's 5 s hold, 5 s cooldown and 1.5 s reboot force strict alternation, the recess
 * halfway is the hide spot, and a camera that has a player sends him back to the west lobby (the one hard rule, G125).
 *
 * Ground, set box x 76-100, z 0-13, a 3.0 m ceiling slab over the whole floor (the hall above is out of reach; the walls on
 * the box edges are `facility.ts`'s, 0.5 m, faces at x 76.25 / 99.75 and z 0.25 / 12.75):
 * - the corridor x 79.5-97, z 9-12.5 from `jamRelay` (`a3-hall`: walls 0.3 m, one recess at x 88.25 on the south wall, the hide spot
 *   against its camera-side cheek, the camera `cam-a3-hall` at the east end), post-processed here: office 2's door at the recess
 *   back, office 3's corridor door cut in the south wall (x 91.4-92.6, A3-D2 moved 2 m west), the camera's `range` set to 17 (A3-D4);
 * - the west lobby (x 76.25-79.35, the L2 door at x 76) and the east lobby (x 97.15-99.75, the L3 door at x 100), full depth, no
 *   door between office 3 and the east lobby (A3-D3);
 * - three offices south of the corridor (x 79.65-85.35, 85.45-91.15, 91.25-96.85, z 0.25-8.7) split by frosted partitions
 *   (`kit.glass` frosted, collision-only: stops movement, sight, jam lines and bullets, passes baked light), a 1.2 m communicating
 *   door in each at z 1.8-3.0; office 1's lobby door at x 79.5, z 4.0-5.2; desks 0.75 m and desk runs 0.9 m (cover, the cleaner's
 *   stops, three pockets); every piece `noLedge` (the set has no lip: 3 m ceilings, P11).
 * The cleaner (`a3-cleaner`, an armed `grunt`) walks the three offices through the communicating doors; the camera never sees
 * into the offices and he never enters the corridor, so the player chooses camera (corridor) or cleaner (offices). Prototype
 * starting values (G10).
 *
 * Lights (LIGHTING-PLAN 3, A3): corridor 30 (six panels), offices 31-33 (two panels each, a switch inside each door), lobbies 34
 * (the landlord's timer circuit, no switch). The camera ignores light (IR, G240), so the corridor stays lit.
 */
import type { HallRule } from '../../../game/jammer';
import type { CameraDevice } from '../../../security/data';
import { KIT_BOX_COLOR, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { marlowCourseGroups } from '../../lighting/marlowCircuits';
import { applyGreybox, jamRelay, type GreyBox } from '../ctcourseGreybox';
import { emptyPart, tally, type SetPart } from './types';

/** The cleaner's squad slot id and his loop (set doc section 2). */
export const A3_CLEANER = 'a3-cleaner';
/** A walker pauses at a route point for its `waits` entry; a wait of 0 never advances (`PatrolWalker.step`), so the pass-through
 *  points pause this long (s), as A2's shunter does. */
export const A3_PASS_WAIT = 0.1;
export const A3_CLEANER_ROUTE: [number, number][] = [[83, 3], [85.4, 2.4], [88.3, 3], [91.2, 2.4], [95.5, 1.5], [91.2, 2.4], [85.4, 2.4]];
export const A3_CLEANER_WAITS = [5, A3_PASS_WAIT, 5, A3_PASS_WAIT, 5, A3_PASS_WAIT, A3_PASS_WAIT];
/** He faces the desk south at offices 1 and 2 and east at the far desk of office 3 (NaN: keep facing through a doorway). */
export const A3_CLEANER_FACES = [Math.PI, Number.NaN, Math.PI, Number.NaN, Math.PI / 2, Number.NaN, Number.NaN];

/** The corridor helper's id, the camera it makes and its range (A3-D4: the helper leaves the 18 m default). */
export const A3_HALL_ID = 'a3-hall';
export const A3_CAMERA = 'cam-a3-hall';
export const A3_CAMERA_RANGE = 14;
/** The corridor (the helper's call): its mouth on the centre line, length, width and height. */
export const A3_CORRIDOR = { at: { x: 79.5, z: 10.75 }, length: 17.5, width: 3.5, height: 3.0, recessDepth: 1.0, recessW: 1.4, camY: 2.8 } as const;
/** The recess (centre line x 88.25 on the south wall) and the hide spot against its camera-side cheek (A3-D1). */
export const A3_RECESS = { x: 88.25, z0: 8.0, z1: 9.0 } as const;
export const A3_HIDE = { x: 88.6, z: 8.5 } as const;
/** The recess back's centre line (z), where office 2's door is, and the corridor's south wall's (office 3's door). */
export const A3_RECESS_BACK_Z = 7.85;
export const A3_SOUTH_WALL_Z = 8.85;
/** The jam posts (the helper's, 1 m outside each end) and the east lobby's L3 door. */
export const A3_POST_WEST = { x: 78.5, z: 10.75 } as const;
export const A3_POST_EAST = { x: 98.0, z: 10.75 } as const;
/** The send-back rule (G125): the hallway box, the west lobby, the send-back spot (x, z, yaw) and LANTERN's line (69 characters). */
export const A3_HALL: HallRule = {
  camera: A3_CAMERA,
  box: [79.5, 9, 97, 12.5],
  lobby: [76.3, 0.3, 79.5, 12.7],
  back: [77.8, 10.75, Math.PI / 2],
  say: 'The camera had you. Back to the lobby, and jam it properly this time.',
};
/** The two pass zones and their flags: one player in the east lobby (the first across), both. */
export const A3_FAR1_FLAG = 'a3-far1';
export const A3_FAR_FLAG = 'a3-far';
export const A3_FAR_ZONE: [number, number, number, number] = [97.3, 0.3, 99.7, 12.7];

/** The set's own course doors (ids start `A3-`): office 1's lobby door, the two communicating doors, office 2's recess door, office 3's corridor door. */
export const A3_DOOR_LOBBY = 'A3-office1';
export const A3_DOOR_COMM1 = 'A3-comm1';
export const A3_DOOR_COMM2 = 'A3-comm2';
export const A3_DOOR_RECESS = 'A3-recess';
export const A3_DOOR_CORR = 'A3-office3';
/** The door openings (x or z span on the wall line, all 1.2 x 2.1). Office 3's corridor door is at x 91.4-92.6, not the set doc's x 93.4-94.6: the camera's
 *  vertical frame (it looks 17.7 deg down, 45 deg tall) cannot see a crouched head within about 2 m of the mount (x past 94.5), so a door at 94 leaves a
 *  player a free exit and the offices route needs no jam; at 92 an unjammed player is in frame for 2.5 m and is caught (a deviation from A3-D2, S3.md). */
export const A3_DOOR_H = 2.1;
export const A3_LOBBY_DOOR_Z: [number, number] = [4.0, 5.2];
export const A3_COMM_Z: [number, number] = [1.8, 3.0];
export const A3_RECESS_DOOR_X: [number, number] = [87.65, 88.85];
export const A3_CORR_DOOR_X: [number, number] = [91.4, 92.6];
/** The partitions' x lines, the lobby wall, the office 3 east wall, the corridor's south wall's inner face (z) and the shell faces. */
export const A3_PARTITIONS = [85.4, 91.2] as const;
export const A3_LOBBY_WALL_X = 79.5;
export const A3_EAST_WALL_X = 97;
export const A3_OFFICE_Z1 = 8.7;
const SHELL = { west: 76.25, east: 99.75, south: 0.25, north: 12.75 } as const;
const CEIL = 3.0;
const WALL_T = 0.3;

/** The wall switches (id, group, position, facing) and the office boxes (x0, x1) the lights and the light tests use. */
export const A3_SW_CORR = { id: 'a3-sw-corr', group: 30, x: 78.6, z: 12.7 } as const;
export const A3_SW_OFFICE = [
  { id: 'a3-sw-off1', group: 31, x: 79.7, z: 6.0 },
  { id: 'a3-sw-off2', group: 32, x: 87.45, z: 7.65 },
  { id: 'a3-sw-off3', group: 33, x: 93.0, z: 8.65 },
] as const;
export const A3_OFFICES = [[79.65, 85.35], [85.45, 91.15], [91.25, 96.85]] as const;

const WHITE: [number, number, number] = [0.96, 0.97, 1.0];
const WARM: [number, number, number] = [1.0, 0.82, 0.62];
const DESK = '#3a3226';
const RUN = '#4a4337';

export function buildA3OfficeRange(b: LevelBuilder, kit: FacilityKit): SetPart {
  const p = emptyPart('a3OfficeRange');
  /** A box from x0 to x1, z0 to z1, y0 to y1; `noLedge` unless told otherwise. */
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string, opts: { overhead?: boolean; noLedge?: boolean } = {}): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
    b.mark(from, { noLedge: opts.noLedge ?? true, ...(opts.overhead ? { overhead: true } : {}) });
  };
  const h = WALL_T / 2;

  // ---- A3-1 / A3-2 / A3-3: the corridor (`jamRelay`), its recess, the camera; office 2's door and office 3's corridor door cut in ----
  const hall = jamRelay({ id: A3_HALL_ID, at: A3_CORRIDOR.at, facing: '+x', length: A3_CORRIDOR.length, width: A3_CORRIDOR.width, height: A3_CORRIDOR.height, side: -1, recessDepth: A3_CORRIDOR.recessDepth, recessW: A3_CORRIDOR.recessW, camY: A3_CORRIDOR.camY });
  /** Replace the helper's box `at` with the same piece cut to the spans [x0, x1, y0, y1] (plain data: the post-processing before `applyGreybox`). */
  const recut = (find: (q: GreyBox) => boolean, what: string, spans: readonly (readonly [number, number, number, number])[]): void => {
    const i = hall.boxes.findIndex(find);
    const q = hall.boxes[i];
    if (!q) throw new Error(`a3OfficeRange: the helper has no ${what} to cut`);
    hall.boxes.splice(i, 1, ...spans.map(([x0, x1, y0, y1]): GreyBox => ({ ...q, c: [(x0 + x1) / 2, (y0 + y1) / 2, q.c[2]], s: [x1 - x0, y1 - y0, q.s[2]] })));
  };
  // the south wall's east piece (x 88.95-97): office 3's corridor door (A3-D2), a lintel over it, the wall either side
  recut((q) => q.tag === 'corridor wall' && q.c[2] < A3_CORRIDOR.at.z && q.c[0] > A3_RECESS.x + 1, 'south wall east of the recess', [
    [A3_RECESS.x + 0.7, A3_CORR_DOOR_X[0], 0, CEIL],
    [A3_CORR_DOOR_X[0], A3_CORR_DOOR_X[1], A3_DOOR_H, CEIL],
    [A3_CORR_DOOR_X[1], A3_EAST_WALL_X, 0, CEIL],
  ]);
  // the recess back (x 87.25-89.25): office 2's door (A3-D2 / A3-3) with its lintel
  recut((q) => q.tag === 'recess back', 'recess back', [
    [A3_RECESS.x - 1.0, A3_RECESS_DOOR_X[0], 0, CEIL],
    [A3_RECESS_DOOR_X[0], A3_RECESS_DOOR_X[1], A3_DOOR_H, CEIL],
    [A3_RECESS_DOOR_X[1], A3_RECESS.x + 1.0, 0, CEIL],
  ]);
  const camera: CameraDevice = { ...hall.cameras[0]!, range: A3_CAMERA_RANGE };
  p.cameras.push(camera);
  tally(b, p.register, 'A3-1', 'Corridor 3.5 x 17.5 (jamRelay a3-hall): 0.3 m noLedge walls, the recess 1.4 x 1.0 on the south wall at x 88.25 with its camera-side hide spot (88.6, 8.5), the jam post marks (78.5 and 98.0, z 10.75); office 3 corridor door cut at x 91.4-92.6', () => {
    applyGreybox(b, { ...hall, doors: [] });
  });
  p.register.push({ id: 'A3-2', element: 'Ceiling IR camera cam-a3-hall at (96.6, 2.8, 10.75) facing west, sweep 262-278, aim 8.75, range 17 (A3-D4): jam, send-back, shot (device data, no pieces)' });

  // ---- A3-8: the lobbies (full depth z 0.25-12.75) and the archways ----
  tally(b, p.register, 'A3-8', "Lift lobbies: the west lobby's east wall (x 79.5, 0.3 m) with office 1's door and the corridor archway (z 9-12.5, open), the east lobby's wall on office 3's east side (x 97); lobbies 3.1 and 2.6 m clear, full depth", () => {
    const lx = A3_LOBBY_WALL_X;
    const [d0, d1] = A3_LOBBY_DOOR_Z;
    slab(lx - h, lx + h, SHELL.south, d0, 0, CEIL, KIT_BOX_COLOR);
    slab(lx - h, lx + h, d1, A3_CORRIDOR.at.z - A3_CORRIDOR.width / 2, 0, CEIL, KIT_BOX_COLOR);
    slab(lx - h, lx + h, d0, d1, A3_DOOR_H, CEIL, KIT_BOX_COLOR);
    slab(A3_EAST_WALL_X - h, A3_EAST_WALL_X + h, SHELL.south, A3_CORRIDOR.at.z - A3_CORRIDOR.width / 2, 0, CEIL, KIT_BOX_COLOR);
  });

  // ---- A3-11: the suite's doors (office 1's lobby door, office 2's recess door, office 3's corridor door) ----
  tally(b, p.register, 'A3-11', "The suite's doors, 1.2 x 2.1: office 1's lobby door (x 79.5, z 4.0-5.2), office 2's door at the recess back (x 87.65-88.85), office 3's corridor door (x 91.4-92.6); course ids A3-office1, A3-recess, A3-office3", () => {
    p.doors[A3_DOOR_LOBBY] = b.door(A3_LOBBY_WALL_X, 0, A3_LOBBY_DOOR_Z[0], A3_LOBBY_DOOR_Z[1] - A3_LOBBY_DOOR_Z[0], 0, { height: A3_DOOR_H }).id;
    p.doors[A3_DOOR_RECESS] = b.door(A3_RECESS_DOOR_X[0], 0, A3_RECESS_BACK_Z, A3_RECESS_DOOR_X[1] - A3_RECESS_DOOR_X[0], Math.PI / 2, { height: A3_DOOR_H }).id;
    p.doors[A3_DOOR_CORR] = b.door(A3_CORR_DOOR_X[0], 0, A3_SOUTH_WALL_Z, A3_CORR_DOOR_X[1] - A3_CORR_DOOR_X[0], Math.PI / 2, { height: A3_DOOR_H }).id;
  });

  // ---- A3-4 / A3-5: the offices: frosted partitions with a communicating door each (no sight, no jam line, no bullets through them) ----
  tally(b, p.register, 'A3-5', 'Frosted partitions x 85.4 and x 91.2 (kit.glass frosted, collision-only, light passes): z 0.25-8.7 with a 1.2 m communicating door at z 1.8-3.0 and glass over it', () => {
    for (const x of A3_PARTITIONS) {
      kit.glass(x, SHELL.south, x, A3_COMM_Z[0], CEIL, { frosted: true });
      kit.glass(x, A3_COMM_Z[1], x, A3_OFFICE_Z1, CEIL, { frosted: true });
      kit.glass(x, A3_COMM_Z[0], x, A3_COMM_Z[1], CEIL - A3_DOOR_H, { frosted: true, y: A3_DOOR_H });
    }
  });
  tally(b, p.register, 'A3-4', 'Offices 1-3 (5.7, 5.7 and 5.6 m wide x 8.45 m) and their two communicating doors: the cleaner\'s loop and the alternative route; course ids A3-comm1, A3-comm2', () => {
    p.doors[A3_DOOR_COMM1] = b.door(A3_PARTITIONS[0], 0, A3_COMM_Z[0], A3_COMM_Z[1] - A3_COMM_Z[0], 0, { height: A3_DOOR_H }).id;
    p.doors[A3_DOOR_COMM2] = b.door(A3_PARTITIONS[1], 0, A3_COMM_Z[0], A3_COMM_Z[1] - A3_COMM_Z[0], 0, { height: A3_DOOR_H }).id;
  });

  // ---- A3-9 / A3-7: desks 0.75 m, desk runs 0.9 m (cover, the cleaner's stops), the pockets ----
  tally(b, p.register, 'A3-9', "Office desks (0.75 m) and desk runs (0.9 m), all noLedge: office 1's desks and its desk-run pocket (x 79.65-81.0, z 7.0-8.7), office 2's desk and the trolley bay (x 90.0-91.15, z 7.0-8.7), office 3's desks, desk run and the far desk against its east wall", () => {
    // office 1: two desks on the south wall (the cleaner's stop faces the second), the north desk run leaving the west corner pocket
    slab(80.0, 81.6, SHELL.south, 1.5, 0, 0.75, DESK);
    slab(82.0, 84.2, SHELL.south, 1.5, 0, 0.75, DESK);
    slab(81.0, A3_OFFICES[0][1], 7.9, A3_OFFICE_Z1, 0, 0.9, RUN);
    // office 2: the desk at the cleaner's stop, a desk run west of the recess door, a cabinet that makes the trolley bay (x 90.0-91.15)
    slab(87.1, 89.5, SHELL.south, 1.5, 0, 0.75, DESK);
    slab(A3_OFFICES[1][0], 87.25, 7.9, A3_OFFICE_Z1, 0, 0.9, RUN);
    slab(89.25, 90.0, 7.0, A3_OFFICE_Z1, 0, 0.9, RUN);
    // office 3: a desk on the south wall, a desk run east of the door, the far desk against the east wall (the cleaner's isolation stop)
    slab(92.4, 94.4, SHELL.south, 1.1, 0, 0.75, DESK);
    slab(93.4, A3_OFFICES[2][1], 7.9, A3_OFFICE_Z1, 0, 0.9, RUN);
    slab(96.15, A3_OFFICES[2][1], 0.5, 2.5, 0, 0.75, DESK);
  });
  p.register.push({ id: 'A3-7', element: "The cleaner's trolley (cover, his job): the trolley bay in office 2 (x 90.0-91.15, z 7.0-8.7) is its parking pocket; the prop is dressing (no pieces)" });
  p.register.push({ id: 'A3-10', element: "Lift doors in both lobbies (dressing, closed: the landlord's lifts are off tonight; no pieces in the greybox)" });

  // ---- A3-12: the ceiling slab (3.0 m rooms; the hall above is out of reach) ----
  tally(b, p.register, 'A3-12', 'Ceiling slab y 3.0-3.2 over the whole floor (overhead, noLedge): the lamps and the camera hang under it', () => {
    slab(SHELL.west, SHELL.east, SHELL.south, SHELL.north, CEIL, CEIL + 0.2, KIT_BOX_COLOR, { overhead: true });
  });

  // ---- A3-6: the lights (LIGHTING-PLAN 3, A3; the circuits are `MARLOW_CIRCUITS` 30-34) ----
  const panel = (x: number, z: number, group: number, radius: number, intensity: number, sx: number, sz: number, color: [number, number, number] = WHITE): void => {
    b.light({ x, y: CEIL - 0.05, z, radius, intensity, color, group, electric: true, destructible: true, fixture: { sx, sy: 0.05, sz, oy: 0.025 } });
  };
  tally(b, p.register, 'A3-6', 'Corridor group 30 (six recessed panels at x 81-96, switch in the west lobby), office groups 31-33 (two panels each, a switch inside each door), lobby downlights group 34 (the landlord\'s timer circuit, no switch)', () => {
    for (const x of [81, 84, 87, 90, 93, 96]) panel(x, A3_CORRIDOR.at.z, 30, 3.8, 0.9, 1.2, 0.3);
    for (const [x, g] of [[81.5, 31], [84.0, 31], [87.3, 32], [89.6, 32], [93.2, 33], [95.5, 33]] as const) panel(x, 4.3, g, 4.3, 0.85, 0.6, 0.6);
    for (const [x, z, r, i] of [[77.75, 8.0, 6.0, 1.5], [98.5, 6.5, 5.5, 0.9]] as const) panel(x, z, 34, r, i, 0.3, 0.3, WARM);
  });
  for (const [k, g] of Object.entries(marlowCourseGroups())) if (k.startsWith('a3-')) p.groups[k] = g;
  // wall switches: the corridor's in the west lobby on the shell's north wall, each office's inside by its door (office 2's on the recess back's jamb)
  p.switches.push({ id: A3_SW_CORR.id, group: A3_SW_CORR.group, pos: { x: A3_SW_CORR.x, y: 1.2, z: A3_SW_CORR.z }, yaw: Math.PI });
  p.switches.push({ id: A3_SW_OFFICE[0].id, group: 31, pos: { x: A3_SW_OFFICE[0].x, y: 1.2, z: A3_SW_OFFICE[0].z }, yaw: Math.PI / 2 });
  p.switches.push({ id: A3_SW_OFFICE[1].id, group: 32, pos: { x: A3_SW_OFFICE[1].x, y: 1.2, z: A3_SW_OFFICE[1].z }, yaw: Math.PI });
  p.switches.push({ id: A3_SW_OFFICE[2].id, group: 33, pos: { x: A3_SW_OFFICE[2].x, y: 1.2, z: A3_SW_OFFICE[2].z }, yaw: Math.PI });
  // the set at its standby fill, under its 3.0 m ceiling (ENGINE-ANSWERS Q3: the ceiling less 0.1)
  p.ambientZones.push({ id: 'A3', box: [76, 0, 100, 13], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: CEIL - 0.1 });

  // ---- the cleaner, the steps, the claim, the pass zones, the radio ----
  p.squads[A3_CLEANER] = { kind: 'grunt', x: 83, z: 3, yaw: Math.PI, route: A3_CLEANER_ROUTE, waits: A3_CLEANER_WAITS, faces: A3_CLEANER_FACES };
  p.bay.squad.push(A3_CLEANER);
  // the first player into the corridor takes B; the other (the first jammer) is A (A3-D5: a jam is not a device press)
  p.bay.roles = [{ role: 'b', zone: { box: [...A3_HALL.box], y1: 1 } }];
  p.passZones.push({ id: 'a3-p-far1', box: A3_FAR_ZONE, flag: A3_FAR1_FLAG, floorY: 0, any: true, hall: A3_HALL });
  p.passZones.push({ id: 'a3-p-far', box: A3_FAR_ZONE, flag: A3_FAR_FLAG, floorY: 0, hall: A3_HALL });
  p.externalFlags.push(A3_FAR1_FLAG, A3_FAR_FLAG);
  p.objectives.push(
    {
      id: 'a3-in',
      bay: 'A3',
      text: 'Jam the camera for each other. If it sees you, you start again.',
      a: 'Hold the jammer on the camera while your partner moves.',
      b: 'Move on the jam: the recess first, then the far lobby.',
      done: { flag: A3_FAR1_FLAG },
    },
    {
      id: 'a3-swap',
      bay: 'A3',
      text: 'Swap: the far player jams now.',
      a: "Move on your partner's jam: the recess, then the far lobby.",
      b: 'Jam the camera from the far lobby for your partner.',
      done: { flag: A3_FAR_FLAG },
    },
    { id: 'a3-lock', bay: 'A3', text: 'Both of you into holding room three.' },
  );
  p.bay.radio.push(
    { at: 'enter', text: 'That camera sends you back to the lobby if it sees you. Jam it for each other.' },
    { at: 'enter', text: "It sees in the dark as well, so the light switch won't save you." },
    { at: 'a3-in', text: 'Good. Now the other way round.' },
  );

  // ---- spaces, nav, debug points, light and shot spots ----
  p.camSpaces.push({ box: [76, 0, 79.5, 13], size: 'tight' }, { box: [79.5, 8.7, 97, 13], size: 'tight' }, { box: [97, 0, 100, 13], size: 'tight' }, { box: [79.5, 0, 97, 8.7], size: 'tight' });
  p.navSeeds.push({ x: 77.5, y: 0, z: 10.75 }, { x: 88.25, y: 0, z: 10.75 }, { x: 98.5, y: 0, z: 10.75 }, { x: 82.5, y: 0, z: 4.3 }, { x: 88.3, y: 0, z: 4.3 }, { x: 94.1, y: 0, z: 4.3 });
  p.debugPoints.push(
    { id: 'A3-entry', label: 'Set 3 entry (L2 door)', pos: { x: 77.2, y: 0, z: 10.75 }, yaw: Math.PI / 2 },
    { id: 'A3-vantage', label: 'Set 3 vantage (the west archway)', pos: { x: A3_POST_WEST.x, y: 0, z: A3_POST_WEST.z }, yaw: Math.PI / 2 },
    { id: 'A3-recess', label: 'Set 3 recess hide spot', pos: { x: A3_HIDE.x, y: 0, z: A3_HIDE.z }, yaw: Math.PI },
    { id: 'A3-mid', label: 'Set 3 middle (the corridor)', pos: { x: 88.25, y: 0, z: 10.75 }, yaw: Math.PI / 2 },
    { id: 'A3-east', label: 'Set 3 east lobby (the L3 door)', pos: { x: A3_POST_EAST.x, y: 0, z: A3_POST_EAST.z }, yaw: -Math.PI / 2 },
    { id: 'A3-office2', label: 'Set 3 office 2', pos: { x: 88.3, y: 0, z: 4.3 }, yaw: Math.PI / 2 },
  );
  p.lightSpots.push(
    { name: 'A3 corridor centre', kind: 'body', x: 88.25, y: 0, z: 10.75, band: 'pool' },
    { name: 'A3 corridor centre cut', kind: 'body', x: 88.25, y: 0, z: 10.75, band: 'cut', off: [30] },
    { name: 'A3 west lobby', kind: 'body', x: 77.8, y: 0, z: 10.75, band: 'read' },
    { name: 'A3 east lobby', kind: 'body', x: 98.5, y: 0, z: 8.0, band: 'read' },
    { name: 'A3 office 1 middle', kind: 'body', x: 82.5, y: 0, z: 4.3, band: 'read' },
    { name: 'A3 office 2 middle', kind: 'body', x: 88.3, y: 0, z: 4.3, band: 'read' },
    { name: 'A3 office 3 middle', kind: 'body', x: 94.1, y: 0, z: 4.3, band: 'read' },
    { name: 'A3 office 1 cut', kind: 'body', x: 82.5, y: 0, z: 4.3, band: 'cut', off: [31] },
    { name: 'A3 office 2 cut', kind: 'body', x: 88.3, y: 0, z: 4.3, band: 'cut', off: [32] },
    { name: 'A3 office 3 cut', kind: 'body', x: 94.1, y: 0, z: 4.3, band: 'cut', off: [33] },
    { name: 'A3 far desk', kind: 'body', x: 95.5, y: 0, z: 2.3, band: 'read' },
    { name: 'A3 corridor floor', kind: 'surf', x: 88.25, y: 0.05, z: 10.75, band: 'any' },
    { name: 'A3 corridor standby', kind: 'body', x: 88.25, y: 0, z: 10.75, band: 'standby' },
  );
  p.shotVantages.push(
    { name: 'a3-lobby', feet: [A3_POST_WEST.x, 0, A3_POST_WEST.z], cam: [77.0, 1.7, 10.9], target: [96, 1.4, 10.75] },
    { name: 'a3-office2', feet: [87.0, 0, 2.4], cam: [85.9, 1.7, 2.4], target: [95, 1.2, 1.8] },
  );
  return p;
}
