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
 *
 * Dressing (slice 3 step 5, SPEC 6, M5: a let office floor inside the luxury hall, so it keeps its own materials - plaster, ceiling tile,
 * carpet tile, corridor vinyl, frosted partitions, laminate desks, brushed lift doors - and only the two lift lobbies, the landlord's front of
 * house, take the kit's charcoal panels and coves; the hall over the set is a sealed void above the slab, nobody sees it, so it gets none):
 * - the greybox's boxes, lamps, doors, switches, devices and steps are untouched; the dressing is appended after them (the register row
 *   A3-3 that S34-check found missing included);
 * - everything built by hand is a thin visual skin (no collision, `noLedge`, one side under `CANON_MIN_THICK`, so out of the canonical light
 *   shapes: the bake, the meter and the guards see the greybox as built): floor sheets, plaster and skirting on every wall face, door surrounds,
 *   ceiling tile and grid, the desks' laminate and panels, the runs' cabinet fronts and drawers, wall furniture, lift doors, the services
 *   cupboard, switch back plates;
 * - the only new collision is the cleaner's trolley's one invisible, `noLedge` box (the props kit's own, `FacilityProps.write`), parked in
 *   office 2's south-west corner so the trolley bay (the hide pocket) stays free;
 * - four `officeDesk` props stand over the greybox desks (visual: the greybox box is the collision; the test holds each prop's box inside it),
 *   five `officeChair`s, the trolley and five hung `signPlate`s (draws: 4 + 3 + 3 + the facility's plate 2 = 12);
 * - kit panels with accent coves in the lobbies, every one on circuit 34. No lamp is added.
 */
import type { HallRule } from '../../../game/jammer';
import type { CameraDevice } from '../../../security/data';
import { KIT_BOX_COLOR, KIT_PANEL_DEPTH, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { marlowCourseGroups } from '../../lighting/marlowCircuits';
import { FacilityProps, writePropBoxes } from '../../props/facilityProps';
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

// ---- dressing (slice 3 step 5) ----
/** The lobbies' circuit (the landlord's common-parts timer run, no switch): the kit's panels and coves in the lobbies follow it. */
const G_LOBBY = 34;
/** A dressing skin's thickness (m) and the thinnest side a skin may have: under `CANON_MIN_THICK` (0.05, `voxel/lightShapes.ts`) the
 *  canonical light shapes leave it out, so dressing never moves the bake, the meter or what a guard sees. */
const SKIN = 0.03;
const THIN = 0.05;
/** The corridor's inner faces (z) and its ends (x). */
const CORR = { x0: 79.5, x1: 97, zS: 9.0, zN: 12.5 } as const;
/** The recess's cheeks (x of the faces looking into it) and the lintel's span over the corridor door. */
const RECESS = { x0: 87.55, x1: 88.95, z0: 8.0, z1: 9.0 } as const;
/** The greybox desks the four desk props stand over (x0, x1, z0, z1; 0.75 m high) and the desk runs (0.9 m high); the far desk is skinned, not propped. */
export const A3_DESKS = [
  { x0: 80.0, x1: 81.6, z0: 0.25, z1: 1.5 },
  { x0: 82.0, x1: 84.2, z0: 0.25, z1: 1.5 },
  { x0: 87.1, x1: 89.5, z0: 0.25, z1: 1.5 },
  { x0: 92.4, x1: 94.4, z0: 0.25, z1: 1.1 },
] as const;
export const A3_RUNS = [
  { x0: 81.0, x1: 85.35, z0: 7.9, z1: 8.7 },
  { x0: 85.45, x1: 87.25, z0: 7.9, z1: 8.7 },
  { x0: 89.25, x1: 90.0, z0: 7.0, z1: 8.7 },
  { x0: 93.4, x1: 96.85, z0: 7.9, z1: 8.7 },
] as const;
export const A3_FAR_DESK = { x0: 96.15, x1: 96.85, z0: 0.5, z1: 2.5 } as const;
/** A desk prop stands on the greybox desk's centre line, its front 5 cm inside the box's front (z1 - 0.45 for the 0.8 m desk), 1 cm up so its top clears the box's. */
export const A3_DESK_LIFT = 0.01;
/** The task chairs: tucked at four desks, one pushed out at the far desk (free yaw, no collision). */
export const A3_CHAIRS = [
  { x: 80.8, z: 1.75, yaw: Math.PI + 0.25 },
  { x: 83.1, z: 1.75, yaw: Math.PI - 0.2 },
  { x: 88.3, z: 1.8, yaw: Math.PI + 0.1 },
  { x: 93.4, z: 1.4, yaw: Math.PI - 0.3 },
  { x: 95.2, z: 3.4, yaw: 2.2 },
] as const;
/** The cleaner's trolley parks in office 2's south-west corner (yaw pi / 2: 0.5 m across x, 1.1 m along z), clear of the communicating door's swing, his loop and the trolley bay. */
export const A3_TROLLEY = { x: 85.8, z: 0.85 } as const;
/** The lifts' doors (z spans on each lobby's outer wall, 1.1 m wide, 2.2 m tall), the call plate and the lobbies' kit-panel face offset. */
export const A3_LIFTS: readonly (readonly [number, number])[] = [[1.4, 2.5], [2.9, 4.0]];
export const A3_LIFT_H = 2.2;
const LIFT_FACE = 0.065;
/** The east lobby's services cupboard on the office wall's lobby face (x 97.15): z span of its door. */
export const A3_CUPBOARD_Z: readonly [number, number] = [6.0, 7.0];
/** The set's own look: plaster, ceiling tile, carpet tile, corridor vinyl, laminate, brushed lift steel. */
const LOOK = {
  plaster: '#b6b7b1',
  skirt: '#2b2e31',
  steel: '#9ea4aa',
  steelDark: '#3a3f44',
  frame: '#34383c',
  carpet: '#3f444c',
  carpetSeam: '#353a41',
  vinyl: '#585d62',
  vinylBand: '#44484c',
  tile: '#c7c8c3',
  grid: '#8f9291',
  laminate: '#d8d8d2',
  panel: '#2e3134',
  cab: '#5c6166',
  cabDark: '#3d4145',
  black: '#1a1c1e',
  screen: '#0b0e10',
  board: '#e3e3dd',
  cork: '#8d6a45',
  paper: '#ecece6',
  yellow: '#c9a227',
  red: '#b5282d',
  stone: '#2a2d31',
  inlay: '#25282c',
  lift: '#a9aeb3',
  amber: '#d9a441',
  louvre: '#6b7076',
  print: '#4b5560',
} as const;

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
    for (const x of [81, 84, 87, 90, 93, 96]) panel(x, A3_CORRIDOR.at.z, 30, 3.8, 0.16, 1.2, 0.3);
    for (const [x, g] of [[81.5, 31], [84.0, 31], [87.3, 32], [89.6, 32], [93.2, 33], [95.5, 33]] as const) panel(x, 4.3, g, 4.3, ({ 31: 0.3, 32: 0.52, 33: 0.2 } as const)[g], 0.6, 0.6);
    for (const [x, z, r, i] of [[77.75, 8.0, 6.0, 0.5], [98.5, 6.5, 5.5, 0.2]] as const) panel(x, z, 34, r, i, 0.3, 0.3, WARM);
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
      text: 'Jam the corridor camera for each other. If it sees you, you start again.',
      a: 'Hold the jammer on the camera while your partner moves.',
      b: 'Move on the jam: the recess first, then the far lobby.',
      done: { flag: A3_FAR1_FLAG },
    },
    {
      id: 'a3-swap',
      bay: 'A3',
      text: 'Swap: jam the corridor camera from the far lobby.',
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

  // ---- dressing (slice 3 step 5; SPEC 6, PROPS.md 3 / 5, KIT.md): appended after the greybox, which it does not touch ----
  /** A visual-only skin [x0, x1] x [y0, y1] x [z0, z1]: no collision, `noLedge`, one side under `THIN` (out of the light shapes). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): void => {
    if (Math.min(x1 - x0, y1 - y0, z1 - z0) >= THIN) throw new Error(`a3OfficeRange: the dressing skin at (${x0}, ${y0}, ${z0}) is not thin`);
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
  const paint = (x0: number, x1: number, z0: number, z1: number, color: string, top = 0.012): void => skin(x0, x1, 0, top, z0, z1, color);
  /** Plaster on a wall face with a dark skirting under it (a lintel strip starting over 0.12 m has no skirting). */
  const plaster = (side: 'n' | 's' | 'e' | 'w', at: number, a0: number, a1: number, y0 = 0.12, y1 = CEIL): void => {
    face(side, at, a0, a1, y0, y1, LOOK.plaster);
    if (y0 <= 0.12) face(side, at, a0, a1, 0, 0.12, LOOK.skirt);
  };
  /** A framed board or print: a dark frame and an inset face one skin further out. */
  const framed = (side: 'n' | 's' | 'e' | 'w', at: number, a0: number, a1: number, y0: number, y1: number, inner: string, layer = 1): void => {
    face(side, at, a0, a1, y0, y1, LOOK.frame, layer);
    face(side, at, a0 + 0.03, a1 - 0.03, y0 + 0.03, y1 - 0.03, inner, layer + 1);
  };
  /** Ceiling tile: a sheet under the slab (above the lamps and the camera, which hang lower) with its 1.2 m grid below it. */
  const ceiling = (x0: number, x1: number, z0: number, z1: number): void => {
    skin(x0, x1, CEIL - 0.02, CEIL, z0, z1, LOOK.tile);
    for (let x = x0 + 1.2; x < x1 - 0.1; x += 1.2) skin(x - 0.0125, x + 0.0125, CEIL - 0.03, CEIL - 0.02, z0, z1, LOOK.grid);
    for (let z = z0 + 1.2; z < z1 - 0.1; z += 1.2) skin(x0, x1, CEIL - 0.03, CEIL - 0.02, z - 0.0125, z + 0.0125, LOOK.grid);
  };
  /** Carpet tile: a sheet with 1.2 m seams. */
  const carpet = (x0: number, x1: number, z0: number, z1: number): void => {
    paint(x0, x1, z0, z1, LOOK.carpet);
    for (let x = x0 + 1.2; x < x1 - 0.1; x += 1.2) paint(x - 0.01, x + 0.01, z0, z1, LOOK.carpetSeam, 0.014);
    for (let z = z0 + 1.2; z < z1 - 0.1; z += 1.2) paint(x0, x1, z - 0.01, z + 0.01, LOOK.carpetSeam, 0.014);
  };
  /** A desk's top as strips round a hole (the prop standing on it): back, front and the two sides. */
  const ring = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, hole: readonly [number, number, number, number], color: string): void => {
    const [hx0, hx1, hz0, hz1] = hole;
    if (hz0 - z0 > 0.004) skin(x0, x1, y0, y1, z0, hz0, color);
    if (z1 - hz1 > 0.004) skin(x0, x1, y0, y1, hz1, z1, color);
    if (hx0 - x0 > 0.004) skin(x0, hx0, y0, y1, hz0, hz1, color);
    if (x1 - hx1 > 0.004) skin(hx1, x1, y0, y1, hz0, hz1, color);
  };
  const { zS, zN } = CORR;

  p.register.push({ id: 'A3-3', element: "Office 2's door reveal (the recess, 1.4 x 1.0 m on the corridor's south wall at x 88.25): built with the corridor (A3-1) and office 2's door (A3-11), no pieces of its own; dressed in A3-13 (plaster, skirting, jamb strips, sign plate)" });

  // ---- A3-13: the corridor (vinyl, plaster and skirting, bumper rail, door surrounds, notices, ceiling tile, the camera's mount plate) ----
  tally(b, p.register, 'A3-13', "Corridor dressing (visual skins, no collision): vinyl sheet and border bands, steel thresholds at both archways and both doors, plaster with a dark skirting and a bumper rail on both walls and the recess, the recess back's jamb strips, office 3's door surround, framed plans and prints, a notice board, a camera notice, a fire point, ceiling tile with its grid and the camera's mount plate", () => {
    const { x0, x1 } = CORR;
    // the floor: vinyl over the corridor and the recess, darker bands along both walls (not across the two doors), steel thresholds
    paint(x0, x1, zS, zN, LOOK.vinyl);
    paint(RECESS.x0, RECESS.x1, RECESS.z0, zS, LOOK.vinyl);
    paint(x0, x1, zN - 0.18, zN, LOOK.vinylBand, 0.014);
    for (const [a, e] of [[x0, RECESS.x0], [RECESS.x1, A3_CORR_DOOR_X[0]], [A3_CORR_DOOR_X[1], x1]] as const) paint(a, e, zS, zS + 0.18, LOOK.vinylBand, 0.014);
    paint(x0 - 0.1, x0 + 0.1, zS, zN, LOOK.steel, 0.014);
    paint(x1 - 0.1, x1 + 0.1, zS, zN, LOOK.steel, 0.014);
    paint(A3_RECESS_DOOR_X[0], A3_RECESS_DOOR_X[1], A3_RECESS_BACK_Z - h, A3_RECESS_BACK_Z + h, LOOK.steel, 0.014);
    paint(A3_CORR_DOOR_X[0], A3_CORR_DOOR_X[1], A3_OFFICE_Z1, zS, LOOK.steel, 0.014);
    // the walls: plaster, skirting, a bumper rail at 0.9 m
    plaster('s', zN, x0, x1);
    face('s', zN, x0, x1, 0.9, 0.96, LOOK.steel, 1);
    for (const [a, e] of [[x0, RECESS.x0], [RECESS.x1, A3_CORR_DOOR_X[0]], [A3_CORR_DOOR_X[1], x1]] as const) {
      plaster('n', zS, a, e);
      face('n', zS, a, e, 0.9, 0.96, LOOK.steel, 1);
    }
    // the cheeks' recess faces and the recess back (the door's sliver jambs in brushed steel, the lintel in plaster)
    plaster('e', RECESS.x0, RECESS.z0, zS);
    plaster('w', RECESS.x1, RECESS.z0, zS);
    plaster('n', RECESS.z0, RECESS.x0, RECESS.x1, A3_DOOR_H, CEIL);
    face('n', RECESS.z0, RECESS.x0, A3_RECESS_DOOR_X[0], 0, A3_DOOR_H, LOOK.steel);
    face('n', RECESS.z0, A3_RECESS_DOOR_X[1], RECESS.x1, 0, A3_DOOR_H, LOOK.steel);
    // office 3's corridor door: plaster over the lintel, a steel surround
    plaster('n', zS, A3_CORR_DOOR_X[0], A3_CORR_DOOR_X[1], A3_DOOR_H, CEIL);
    face('n', zS, A3_CORR_DOOR_X[0] - 0.1, A3_CORR_DOOR_X[0], 0, A3_DOOR_H, LOOK.steel, 1);
    face('n', zS, A3_CORR_DOOR_X[1], A3_CORR_DOOR_X[1] + 0.1, 0, A3_DOOR_H, LOOK.steel, 1);
    face('n', zS, A3_CORR_DOOR_X[0] - 0.1, A3_CORR_DOOR_X[1] + 0.1, A3_DOOR_H, A3_DOOR_H + 0.08, LOOK.steel, 1);
    // north wall: a floor plan, a notice board with notes, a camera notice, a second print, the fire point
    framed('s', zN, 82.0, 82.8, 1.35, 1.95, LOOK.paper);
    framed('s', zN, 84.0, 85.4, 1.3, 1.9, LOOK.cork);
    for (const [a, e, y0] of [[84.2, 84.45, 1.45], [84.6, 84.85, 1.6], [84.95, 85.2, 1.4]] as const) face('s', zN, a, e, y0, y0 + 0.25, LOOK.paper, 3);
    face('s', zN, 80.3, 80.75, 1.7, 2.0, LOOK.yellow, 1);
    face('s', zN, 80.4, 80.62, 1.78, 1.9, LOOK.black, 2);
    face('s', zN, 80.62, 80.68, 1.82, 1.86, LOOK.black, 2);
    framed('s', zN, 94.4, 95.2, 1.35, 1.95, LOOK.paper);
    face('s', zN, 92.6, 93.1, 1.3, 1.6, LOOK.red, 1);
    face('s', zN, 92.67, 93.03, 1.37, 1.53, LOOK.paper, 2);
    face('s', zN, 92.8, 92.92, 0.35, 0.75, LOOK.red, 1);
    face('s', zN, 92.8, 92.92, 0.72, 0.8, LOOK.black, 1);
    face('s', zN, 92.72, 93.0, 0.3, 0.34, LOOK.steelDark, 1);
    // south wall: prints
    framed('n', zS, 81.2, 82.0, 1.4, 1.95, LOOK.paper);
    framed('n', zS, 83.4, 84.4, 1.4, 1.9, LOOK.paper);
    framed('n', zS, 85.4, 86.2, 1.4, 1.95, LOOK.paper);
    framed('n', zS, 89.7, 90.6, 1.4, 1.9, LOOK.paper);
    framed('n', zS, 93.6, 94.4, 1.4, 1.95, LOOK.paper);
    // the ceiling: tile and grid over the corridor and the recess, the camera's mount plate at its lens
    ceiling(x0, x1, zS, zN);
    skin(RECESS.x0, RECESS.x1, CEIL - 0.02, CEIL, RECESS.z0, zS, LOOK.tile);
    skin(camera.at[0] - 0.25, camera.at[0] + 0.25, CEIL - 0.03, CEIL, A3_CORRIDOR.at.z - 0.25, A3_CORRIDOR.at.z + 0.25, LOOK.steelDark);
  });

  // ---- A3-14: the offices (carpet tile, plaster and skirting, partition surrounds, ceiling tile, wall furniture) ----
  tally(b, p.register, 'A3-14', 'Office dressing (visual skins, no collision): carpet tile with 1.2 m seams, plaster and skirting on every wall face, steel surrounds on the lobby door and both communicating doors, ceiling tile and grid, whiteboards, pin boards, prints, clocks and upper cupboards on the walls', () => {
    const z0 = SHELL.south;
    const z1 = A3_OFFICE_Z1;
    const lobbyFace = A3_LOBBY_WALL_X + h;
    const recessFace = A3_RECESS_BACK_Z - h;
    for (const [ox0, ox1] of A3_OFFICES) {
      carpet(ox0, ox1, z0, z1);
      ceiling(ox0, ox1, z0, z1);
      plaster('n', z0, ox0, ox1);
    }
    // office 1: the west wall (the lobby door's gap with its lintel) and the corridor wall; office 2: the corridor wall west of the recess, the recess back, east of it;
    // office 3: the corridor wall either side of its door, the east wall
    const [d0, d1] = A3_LOBBY_DOOR_Z;
    plaster('e', lobbyFace, z0, d0);
    plaster('e', lobbyFace, d1, z1);
    plaster('e', lobbyFace, d0, d1, A3_DOOR_H, CEIL);
    plaster('s', z1, A3_OFFICES[0][0], A3_OFFICES[0][1]);
    plaster('s', z1, A3_OFFICES[1][0], 87.25);
    plaster('s', recessFace, 87.25, A3_RECESS_DOOR_X[0]);
    plaster('s', recessFace, A3_RECESS_DOOR_X[0], A3_RECESS_DOOR_X[1], A3_DOOR_H, CEIL);
    plaster('s', recessFace, A3_RECESS_DOOR_X[1], 89.25);
    plaster('s', z1, 89.25, A3_OFFICES[1][1]);
    plaster('s', z1, A3_OFFICES[2][0], A3_CORR_DOOR_X[0]);
    plaster('s', z1, A3_CORR_DOOR_X[0], A3_CORR_DOOR_X[1], A3_DOOR_H, CEIL);
    plaster('s', z1, A3_CORR_DOOR_X[1], A3_OFFICES[2][1]);
    plaster('w', A3_OFFICES[2][1], z0, z1);
    // steel surrounds: the lobby door (office side), and each communicating door on both faces of its partition
    face('e', lobbyFace, d0 - 0.1, d0, 0, A3_DOOR_H, LOOK.steel, 1);
    face('e', lobbyFace, d1, d1 + 0.1, 0, A3_DOOR_H, LOOK.steel, 1);
    face('e', lobbyFace, d0 - 0.1, d1 + 0.1, A3_DOOR_H, A3_DOOR_H + 0.08, LOOK.steel, 1);
    for (const xp of A3_PARTITIONS) {
      for (const [side, at] of [['w', xp - 0.05], ['e', xp + 0.05]] as const) {
        face(side, at, A3_COMM_Z[0] - 0.1, A3_COMM_Z[0], 0, A3_DOOR_H, LOOK.steel);
        face(side, at, A3_COMM_Z[1], A3_COMM_Z[1] + 0.1, 0, A3_DOOR_H, LOOK.steel);
        face(side, at, A3_COMM_Z[0] - 0.1, A3_COMM_Z[1] + 0.1, A3_DOOR_H, A3_DOOR_H + 0.08, LOOK.steel);
      }
    }
    // wall furniture. Office 1: a whiteboard, a print and a clock over the desks, a pin board on the west wall, upper cupboards and a pin board over the run
    framed('n', z0, 80.2, 81.4, 1.3, 1.95, LOOK.board);
    framed('n', z0, 82.6, 83.6, 1.4, 1.9, LOOK.paper);
    face('n', z0, 84.2, 84.5, 2.15, 2.45, LOOK.board, 1);
    framed('e', lobbyFace, 0.6, 1.8, 1.3, 1.9, LOOK.cork);
    for (let k = 0; k < 4; k++) face('s', z1, 81.2 + 0.55 * k + 0.01, 81.2 + 0.55 * k + 0.54, 1.55, 2.25, LOOK.cab, 1);
    framed('s', z1, 83.8, 85.0, 1.3, 1.9, LOOK.cork);
    // office 2: a whiteboard over the trolley, a print over the desk, a clock, a whiteboard over the west run, a pin board over the bay's drawer unit
    framed('n', z0, 85.6, 86.8, 1.3, 1.95, LOOK.board);
    framed('n', z0, 87.5, 88.3, 1.4, 1.9, LOOK.paper);
    face('n', z0, 89.7, 90.0, 2.15, 2.45, LOOK.board, 1);
    framed('s', z1, 85.6, 87.1, 1.2, 1.9, LOOK.board);
    framed('s', z1, 89.4, 90.8, 1.3, 1.9, LOOK.cork);
    // office 3: a print over the desk, a clock, a whiteboard over the far desk, upper cupboards and a pin board over the run
    framed('n', z0, 92.7, 93.5, 1.4, 1.9, LOOK.paper);
    face('n', z0, 94.8, 95.1, 2.15, 2.45, LOOK.board, 1);
    framed('w', A3_OFFICES[2][1], 0.6, 2.4, 1.3, 1.95, LOOK.board);
    for (let k = 0; k < 3; k++) face('s', z1, 93.6 + 0.55 * k + 0.01, 93.6 + 0.55 * k + 0.54, 1.55, 2.25, LOOK.cab, 1);
    framed('s', z1, 95.5, 96.7, 1.3, 1.9, LOOK.cork);
  });

  // ---- A3-15: the desks and runs (laminate tops round the props, panels, cabinet fronts, drawers, the far desk's own screen) ----
  tally(b, p.register, 'A3-15', "Desk and run dressing (visual skins, no collision): laminate round each desk prop, dark end and front panels over the greybox desks, a skinned screen, keyboard and mouse on the far desk, worktops, cabinet fronts with handles on the three wall runs, a three-drawer unit on the bay's run", () => {
    for (const d of A3_DESKS) {
      const cx = (d.x0 + d.x1) / 2;
      const pz = d.z1 - 0.45;
      ring(d.x0, d.x1, d.z0, d.z1, 0.75, 0.75 + 0.01, [cx - 0.8, cx + 0.8, pz - 0.4, pz + 0.4], LOOK.laminate);
      face('w', d.x0, d.z0, d.z1, 0, 0.75, LOOK.panel);
      face('e', d.x1, d.z0, d.z1, 0, 0.75, LOOK.panel);
      face('n', d.z1, d.x0, d.x1, 0, 0.1, LOOK.skirt);
      face('n', d.z1, d.x0, d.x1, 0.1, 0.75, LOOK.panel);
    }
    // the far desk against the east wall: laminate, panels, a skinned monitor on its stand, keyboard and mouse (the cleaner's isolation stop)
    const f = A3_FAR_DESK;
    const zm = (f.z0 + f.z1) / 2;
    skin(f.x0, f.x1, 0.75, 0.76, f.z0, f.z1, LOOK.laminate);
    face('w', f.x0, f.z0, f.z1, 0.1, 0.75, LOOK.panel);
    face('w', f.x0, f.z0, f.z1, 0, 0.1, LOOK.skirt);
    face('s', f.z0, f.x0, f.x1, 0, 0.75, LOOK.panel);
    face('n', f.z1, f.x0, f.x1, 0, 0.75, LOOK.panel);
    skin(f.x1 - 0.2, f.x1 - 0.16, 0.76, 0.94, zm - 0.04, zm + 0.04, LOOK.steelDark);
    skin(f.x1 - 0.23, f.x1 - 0.19, 0.94, 1.2, zm - 0.28, zm + 0.28, LOOK.black);
    skin(f.x1 - 0.235, f.x1 - 0.225, 0.97, 1.17, zm - 0.25, zm + 0.25, LOOK.screen);
    skin(f.x0 + 0.1, f.x0 + 0.3, 0.76, 0.775, zm - 0.2, zm + 0.2, LOOK.black);
    skin(f.x0 + 0.12, f.x0 + 0.18, 0.76, 0.775, zm + 0.3, zm + 0.36, LOOK.black);
    // the runs: worktop, plinth, cabinet fronts with handles (the bay's run is a drawer unit on two faces)
    for (const r of A3_RUNS) {
      skin(r.x0, r.x1, 0.9, 0.93, r.z0, r.z1, LOOK.laminate);
      face('w', r.x0, r.z0, r.z1, 0, 0.9, LOOK.panel);
      if (r.z0 > 7.5) {
        face('s', r.z0, r.x0, r.x1, 0, 0.1, LOOK.skirt);
        const n = Math.max(1, Math.round((r.x1 - r.x0) / 0.6));
        const w = (r.x1 - r.x0) / n;
        for (let k = 0; k < n; k++) {
          face('s', r.z0, r.x0 + k * w + 0.01, r.x0 + (k + 1) * w - 0.01, 0.12, 0.88, LOOK.cab);
          face('s', r.z0, r.x0 + (k + 0.5) * w - 0.01, r.x0 + (k + 0.5) * w + 0.01, 0.55, 0.78, LOOK.steel, 1);
        }
        face('e', r.x1, r.z0, r.z1, 0, 0.9, LOOK.panel);
      } else {
        // x 89.25-90.0, z 7.0-8.7: drawers face south (z 7.0) and east (x 90.0, into the bay)
        face('s', r.z0, r.x0, r.x1, 0, 0.1, LOOK.skirt);
        face('e', r.x1, r.z0, r.z1, 0, 0.1, LOOK.skirt);
        for (const [y0, y1] of [[0.12, 0.36], [0.38, 0.62], [0.64, 0.88]] as const) {
          face('s', r.z0, r.x0 + 0.02, r.x1 - 0.02, y0, y1, LOOK.cab);
          face('s', r.z0, r.x0 + 0.25, r.x1 - 0.25, (y0 + y1) / 2 - 0.01, (y0 + y1) / 2 + 0.01, LOOK.steel, 1);
          face('e', r.x1, r.z0 + 0.1, r.z1 - 0.1, y0, y1, LOOK.cabDark);
          face('e', r.x1, (r.z0 + r.z1) / 2 - 0.2, (r.z0 + r.z1) / 2 + 0.2, (y0 + y1) / 2 - 0.01, (y0 + y1) / 2 + 0.01, LOOK.steel, 1);
        }
      }
    }
    // a printer's flat tray and a paper stack on the long run (flat skins on the worktop)
    skin(83.2, 83.8, 0.93, 0.945, 8.0, 8.5, LOOK.print);
    skin(84.1, 84.4, 0.93, 0.95, 8.1, 8.35, LOOK.paper);
  });

  // ---- A3-16 (with A3-10, the lift doors): the lobbies. Charcoal kit panels with warm coves on the landlord's circuit 34, brushed lift doors, the services cupboard, a stone inlay ----
  tally(b, p.register, 'A3-16', "Lobby dressing (kit panels visual, skins no collision): the kit's charcoal panels and warm coves with skirting on both lobbies' walls (circuit 34; the doors' frames, the corridor archways and the corridor switch left clear), two brushed lift doors with a call plate on each lobby's outer wall (A3-10), the east lobby's services cupboard on the office wall, a dark stone inlay with steel edging on each floor", () => {
    const run = (x: number, z: number, len: number, yaw: number): void => {
      kit.wallPanel(x, z, len, yaw, { h: CEIL, tone: 'warm', group: G_LOBBY });
      kit.skirting(x, z, len, yaw, { tone: 'warm', group: G_LOBBY, standoff: KIT_PANEL_DEPTH });
    };
    const alongZ = (x: number, yaw: number, a: number, e: number): void => run(x, (a + e) / 2, e - a, yaw);
    const alongX = (z: number, yaw: number, a: number, e: number): void => run((a + e) / 2, z, e - a, yaw);
    const lobbyX = A3_LOBBY_WALL_X - h;
    // west lobby: the outer wall (south of the L2 door's frame), office 1's wall either side of its door, the south wall, the north wall short of the corridor switch
    alongZ(SHELL.west, Math.PI / 2, 0.34, 8.9);
    alongZ(lobbyX, -Math.PI / 2, 0.34, A3_LOBBY_DOOR_Z[0] - 0.1);
    alongZ(lobbyX, -Math.PI / 2, A3_LOBBY_DOOR_Z[1] + 0.1, 8.9);
    alongX(SHELL.south, 0, 76.34, 79.26);
    alongX(SHELL.north, Math.PI, 76.34, 78.3);
    // east lobby: the outer wall either side of the L3 door's frame, the office wall either side of the services cupboard, the south and north walls
    const eastX = A3_EAST_WALL_X + h;
    alongZ(SHELL.east, -Math.PI / 2, 0.34, 8.9);
    alongZ(SHELL.east, -Math.PI / 2, 11.1, 12.66);
    alongZ(eastX, Math.PI / 2, 0.34, A3_CUPBOARD_Z[0] - 0.3);
    alongZ(eastX, Math.PI / 2, A3_CUPBOARD_Z[1] + 0.3, 8.9);
    alongX(SHELL.south, 0, 97.24, 99.66);
    alongX(SHELL.north, Math.PI, 97.24, 99.66);
    // the lifts: a dark frame, two brushed leaves with a seam, a display over them, standing on the panels (0.065 m off the wall); a call plate beside the pair
    const lift = (side: 'e' | 'w', at: number, [a, e]: readonly [number, number]): void => {
      const mid = (a + e) / 2;
      face(side, at, a - 0.08, e + 0.08, 0, A3_LIFT_H + 0.08, LOOK.steelDark, 0);
      face(side, at, a, mid - 0.01, 0, A3_LIFT_H, LOOK.lift, 1);
      face(side, at, mid + 0.01, e, 0, A3_LIFT_H, LOOK.lift, 1);
      face(side, at, mid - 0.14, mid + 0.14, A3_LIFT_H + 0.1, A3_LIFT_H + 0.2, LOOK.black, 1);
      face(side, at, mid - 0.03, mid + 0.03, A3_LIFT_H + 0.13, A3_LIFT_H + 0.17, LOOK.amber, 2);
      face(side, at, a + 0.08, a + 0.12, 0, 0.1, LOOK.steelDark, 2);
      face(side, at, e - 0.12, e - 0.08, 0, 0.1, LOOK.steelDark, 2);
    };
    const call = (side: 'e' | 'w', at: number): void => {
      face(side, at, 4.3, 4.5, 0.95, 1.35, LOOK.steelDark, 0);
      face(side, at, 4.37, 4.43, 1.2, 1.26, LOOK.amber, 1);
      face(side, at, 4.37, 4.43, 1.05, 1.11, LOOK.steel, 1);
    };
    for (const z of A3_LIFTS) {
      lift('e', SHELL.west + LIFT_FACE, z);
      lift('w', SHELL.east - LIFT_FACE, z);
    }
    call('e', SHELL.west + LIFT_FACE);
    call('w', SHELL.east - LIFT_FACE);
    // the services cupboard: a dark frame in the plain wall, a steel door with louvres, a lock and a red riser label
    const [c0, c1] = A3_CUPBOARD_Z;
    face('e', eastX, c0 - 0.1, c1 + 0.1, 0, 2.1, LOOK.steelDark, 0);
    face('e', eastX, c0, c1, 0, 2.0, LOOK.lift, 1);
    for (let k = 0; k < 6; k++) face('e', eastX, c0 + 0.1, c1 - 0.1, 1.5 + k * 0.06, 1.53 + k * 0.06, LOOK.louvre, 2);
    face('e', eastX, c1 - 0.2, c1 - 0.14, 0.95, 1.05, LOOK.steelDark, 2);
    face('e', eastX, (c0 + c1) / 2 - 0.15, (c0 + c1) / 2 + 0.15, 1.15, 1.3, LOOK.red, 2);
    // a stone inlay with steel edging under each lobby's lifts (clear of the send-back spot, the jam posts and both doors)
    for (const [x0, x1] of [[76.6, 79.1], [97.3, 99.5]] as const) {
      paint(x0, x1, 0.6, 8.4, LOOK.inlay);
      paint(x0, x1, 0.6, 0.64, LOOK.steel, 0.014);
      paint(x0, x1, 8.36, 8.4, LOOK.steel, 0.014);
      paint(x0, x0 + 0.04, 0.6, 8.4, LOOK.steel, 0.014);
      paint(x1 - 0.04, x1, 0.6, 8.4, LOOK.steel, 0.014);
    }
  });

  // ---- A3-17: the switches' back plates (the four wall switches stood on bare walls) ----
  tally(b, p.register, 'A3-17', 'Switch back plates (visual skins): a dark plate on the wall behind each of the four wall switches (corridor, offices 1-3), so none floats in front of its wall', () => {
    face('s', SHELL.north, A3_SW_CORR.x - 0.1, A3_SW_CORR.x + 0.1, 1.05, 1.35, LOOK.steelDark, 0);
    face('e', A3_LOBBY_WALL_X + h, A3_SW_OFFICE[0].z - 0.1, A3_SW_OFFICE[0].z + 0.1, 1.05, 1.35, LOOK.steelDark, 1);
    face('s', A3_RECESS_BACK_Z - h, A3_SW_OFFICE[1].x - 0.1, A3_SW_OFFICE[1].x + 0.1, 1.05, 1.35, LOOK.steelDark, 1);
    face('s', A3_OFFICE_Z1, A3_SW_OFFICE[2].x - 0.1, A3_SW_OFFICE[2].x + 0.1, 1.05, 1.35, LOOK.steelDark, 1);
  });

  // ---- A3-18: the props kit (PROPS.md 3 A3): four desks over the greybox desks, five chairs, the cleaner's trolley, five hung plates ----
  const props = new FacilityProps();
  for (const d of A3_DESKS) props.add('officeDesk', (d.x0 + d.x1) / 2, d.z1 - 0.45, 0, { y: A3_DESK_LIFT, tint: [0, 0, 0] });
  for (const c of A3_CHAIRS) props.add('officeChair', c.x, c.z, c.yaw, { free: true });
  const trolley = props.add('cleanerTrolley', A3_TROLLEY.x, A3_TROLLEY.z, Math.PI / 2);
  // plates (hung, bottom edge at 2.55 m): over office 3's corridor door, office 2's recess door and office 1's lobby door, and a lift display over each lobby's pair
  // (S3-7 S1) each plate's backlit face is on the circuit that lights its wall: the corridor panels (30) for the two in the corridor, the landlord's lobby circuit (34) for the three in the lobbies
  props.add('signPlate', (A3_CORR_DOOR_X[0] + A3_CORR_DOOR_X[1]) / 2, zS + SKIN * 2, 0, { y: 2.55, group: 30 });
  props.add('signPlate', A3_RECESS.x, RECESS.z0 + SKIN * 2, 0, { y: 2.55, group: 30 });
  props.add('signPlate', A3_LOBBY_WALL_X - h - SKIN, (A3_LOBBY_DOOR_Z[0] + A3_LOBBY_DOOR_Z[1]) / 2, -Math.PI / 2, { y: 2.55, group: G_LOBBY });
  props.add('signPlate', SHELL.west + 0.05, 2.7, Math.PI / 2, { y: 2.45, group: G_LOBBY });
  props.add('signPlate', SHELL.east - 0.05, 2.7, -Math.PI / 2, { y: 2.45, group: G_LOBBY });
  tally(b, p.register, 'A3-18', "Props kit: four officeDesk props over the greybox desks (visual: the greybox box is the collision, screens dark), five officeChairs (no collision), the cleaner's trolley parked in office 2's south-west corner (A3-7; its one see-through box via writePropBoxes, noLedge) and five hung signPlates (over the three suite doors and a display over each lobby's lifts)", () => {
    const from = b.boxes.length;
    writePropBoxes(b, [props.placements[trolley]!]);
    b.mark(from, { noLedge: true });
  });
  p.props.push(...props.placements);

  return p;
}
