/**
 * A8 the Strongroom (SPEC section 9 "A8 - Set 8, the Strongroom"; set doc `docs/marlow-final/sets/a8Strongroom.md`, section 13 over
 * SPEC; PLAN slice 8, steps 2-4: greybox, lights, guards / devices / objective steps / e2e). A Victorian bank's banking hall at night:
 * the graduation set, everything in sync. The leg-up split onto the public gallery, the cross-level jam on C2, the security office loop
 * (N3, 60 s), the timed light and lock isolation at the lighting board (N2, 25 s, the `mains` grille), the partner throw over the inner
 * beam curtain, the paired hack of the two time locks (N6, second pair) and the walk out through the vault to the cash dock.
 *
 * Ground, set box x 106-150, z 50-78 (the walls on the box edges are `facility.ts`'s, 0.5 m on the lines; plan faces are 0.25 m in):
 * - the banking hall x 106.25-133.85, z 50.25-77.75 under a 9.0 m ceiling slab: marble floor, oak counters (main run x 114-126, return
 *   x 125.26-126 down to z 58.3, 1.2 m), the night desk (x 127.3-129.7, z 70-70.9, 0.75 m), the public stair x 130.5-131.7 (27 risers
 *   rising north to the gallery), the east wall x 134 with the public grille gate (`A8-grille`, x 134, z 61.1-62.9, 3.0 m);
 * - the public gallery (hand slab 4.0-4.4 on columns, A8-D1): the north run x 106.25-133.85, z 75-77.75 and the west return x 106.25-109,
 *   z 56-75, a 1.2 m solid balustrade on every front edge but the public stair head and the return's open loading edge (x 109, z 66-70.5:
 *   the one co-op lip, a manual ledge at 4.4); under the return the vestibule (no fitting), under the north run the strip with the
 *   lighting board `a8-board` on the north wall at (127, 0.9, 77.6);
 * - the security office x 134-144, z 71.4-78 at gallery level (floor 4.4 on a solid block, ceiling 7.4), door `A8-office` on its west wall,
 *   the console on the east wall, the medkit on the north wall; its stair: an enclosed stairwell along the lobby's north side (flight
 *   x 134.5-142.2, z 70-71.2, 27 risers rising east, the strip south of it a closed block) down to the foot door `A8-stair-foot` (push bar
 *   on the stair side) into the lobby's outer zone;
 * - the vault lobby x 134.15-145.85, z 56.15-67.85 (5.5 m, steel plate): the beam curtain at x 140 (`throwGateway`, header 4.8, beams
 *   switched off by `a8-sync`), the time locks T1 (north wall) and T2 (east wall beside the vault door) and its power panel, the
 *   vault door `A8-vault` on x 146 (z 61.3-62.7, a flag gate on `a8-sync`) into the vault x 146.15-149.75, z 58.15-65.85, open at its back to
 *   the cash dock (the facility's);
 * - closed solid blocks (back offices, plant): no doors.
 * Every collidable block 1.9 m or taller is `noLedge`; the only lip in the co-op band is the return's open edge (`COOP_LIPS`). Prototype
 * values (G10).
 *
 * Lights (LIGHTING-PLAN 3, A8; `MARLOW_CIRCUITS` 81-84): the hall night circuit 81 (three chandeliers, three counter lamps, the desk lamp;
 * the board is its isolator, the grille reads it), gallery wall lights 82 (switch at the stair head), office 83 (switch by its door), vault
 * lobby 84 (the time lock's circuit, no switch). The vestibule and the west bays have no fitting.
 *
 * Dressing (slice 8 step 5, SPEC 6, M5: a Victorian banking hall mock-up inside the luxury hall, so it keeps its own materials - oak
 * panelling, plaster, stone pilasters and cornices, a black-and-cream marble floor, brass bars, a vault company's steel plate - and
 * only the hall above the set takes the kit's charcoal panels):
 * - the greybox's boxes, lamps, doors, anchors, devices and guards are untouched; the dressing is appended after them (the test pins the
 *   greybox: 138 boxes, 81 of them solid, 16 lamps);
 * - everything built by hand is a thin visual skin (no collision, `noLedge`, one side under `CANON_MIN_THICK`, so out of the canonical
 *   light shapes: the bake, the meter, the guards and the cameras see the greybox as built): the hall's wall finish (oak dado, plaster,
 *   pilasters, windows, cornice), floors (chequer, plank seams, plate seams, carpet seams, the two striped marks), the gallery's coping,
 *   panels, frieze, column bases and capitals, newels and drop chain, rails on both stairs (visual; the public stair's two open sides also take an invisible noLedge collision rail, below),
 *   the counters' back panels and lamp stems, the grille's stone surround and two brass bar panels, the lighting board's cabinet, the
 *   office, the stairwell, the lobby, the beam curtain's plates, the time locks' cases and dials, the vault's inner surround;
 * - the one collision the stair's rails add: the public stair's two open sides' collision rail (kit.handrail, invisible noLedge, thirteen 0.55 m segments a side
 *   from the fourth tread to the gallery, S8-check polish 10), so a body cannot step off the flight; the foot and the flight stay open;
 * - the props kit: 8 bank counters and the night desk stand over their greybox boxes (no box written), 5 sign plates hang on the walls,
 *   and the vault's 6 deposit walls are the dressing's only collision (their own six `noLedge` boxes, 0.56 m deep on the two flanks: the
 *   vault stays 6.58 m wide (the test floor is 6.5 m) and the door's axis and swing are clear);
 * - kit panels with accent coves from the 9.2 m slab's top to the roof on the four walls (81, 83, 84), accent slots under the gallery's
 *   front (82), on the office roof (83), the lobby's ceiling and the vault's roof (84). No lamp is added.
 */
import type { GuardIntel } from '../../../game/intel';
import { hyp2 } from '../../../core/mathx';
import type { EgressGate, FlagGate, IsolatorGate, MainsGate, PickupGate } from '../../../game/course/courseDef';
import type { LaserPanelDef } from '../../../game/laserPanels';
import type { CameraDevice } from '../../../security/data';
import { KIT_BOX_COLOR, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { circuitOf, marlowCourseGroups } from '../../lighting/marlowCircuits';
import { FacilityProps } from '../../props/facilityProps';
import { applyGreybox, COOP_LIP, stairSteps, syncStation, throwGateway, type CoopLip, type ThrowGatewayOpts } from '../ctcourseGreybox';
import { wallRuns } from './facility';
import { emptyPart, HALL_H, tally, type SetPart } from './types';

/** The three guards: N1 the night desk clerk, N2 the hall patrol, the duty officer in the security office. */
export const A8_N1 = 'a8-night1';
export const A8_N2 = 'a8-night2';
export const A8_OFFICER = 'a8-officer';
/** A walker pauses at a route point for its `waits` entry; a wait of 0 never advances (`PatrolWalker.step`, S2), so the pass-through
 *  points pause this long (s). */
export const A8_PASS_WAIT = 0.1;
/** N1: a post with head turns (south-west, then south-east, 6 s each). */
export const A8_N1_POST = { x: 128.5, z: 71.6 } as const;
export const A8_N1_ROUTE: [number, number][] = [[128.5, 71.6], [128.5, 71.6]];
export const A8_N1_WAITS = [6, 6];
export const A8_N1_FACES = [Math.PI + 0.6, Math.PI - 0.6];
/** N2: TALK (west of the desk, facing N1), W1 (past the public stair's foot), G the grille, SE the south-east floor, W2 the counters' east end. */
export const A8_N2_ROUTE: [number, number][] = [[126.4, 71.2], [129.6, 66.5], [133.2, 62.0], [131.0, 58.5], [127.0, 66.9]];
export const A8_N2_WAITS = [5, A8_PASS_WAIT, 5, A8_PASS_WAIT, A8_PASS_WAIT];
export const A8_N2_FACES = [Math.PI / 2, Number.NaN, Math.PI / 2, Number.NaN, Number.NaN];
/** The officer's post (seated at the console, his back to the door) and what he gives up when held (set doc section 2, G206, P14). */
export const A8_OFFICER_POST = { x: 142.9, z: 74.7, y: 4.4 } as const;
/** (joint-interrogation, G148) His joint-only lines (a read during a partner's live bluff): the request-to-exit on the lobby's
 *  south wall (`A8_RTE_AT`, `A8_RTE_GATE_ON`), and night two's loop (`patrolPeriod` of `A8_N2_ROUTE` at the grunt's patrol pace:
 *  39.8 s, rounded to forty; the grille stop is `A8_N2_WAITS[2]`, 5 s). The flag has no consumer yet (PLAN section 3). */
export const A8_JOINT_FLAG = 'a8-joint';
export const A8_OFFICER_INFO: GuardIntel = {
  lines: ['The board under the gallery kills the hall lights. The grille is on the same circuit.', 'Both time locks turn together. The beams in the lobby drop with them.'],
  joint: {
    lines: ['The button inside the lobby, south wall. It opens the grille and keeps it open.', 'Night two stops at the grille five seconds, every forty. Then back to the desk.'],
    flag: A8_JOINT_FLAG,
  },
};

/** The console (course device and N3 console), its pickup gate, the flag the cameras name, the timed loop, the three cameras. */
export const A8_CONSOLE = 'a8-console';
export const A8_CONSOLE_GATE = 'g-a8-console';
export const A8_LOOP_FLAG = 'a8-loop';
export const A8_LOOP = { seconds: 60, rearm: 20 } as const;
export const A8_CAMERAS = ['a8-cam1', 'a8-cam2', 'a8-cam3'] as const;
/** The gallery level the cross-level camera C2 hangs over (`SecurityData.levels`, A8-C13) and its floor. */
export const A8_GALLERY_LEVEL = 'a8-gallery';
export const A8_LEVELS: Readonly<Record<string, number>> = { [A8_GALLERY_LEVEL]: 4.4 };
/** The part with the camera levels it needs (`MapLayout.security.levels`): `SetPart` has no field for it, so the merge reads this one (S8 request). */
export type A8Part = SetPart & { levels: Record<string, number> };

/** The night circuit's isolator (the lighting board), the grille's two gates (mains, request-to-exit), the stair foot's, the vault's. */
export const A8_BOARD = 'a8-board';
export const A8_NIGHT_GROUP = 'a8-night';
export const A8_NIGHT_GATE = 'g-a8-night';
export const A8_GRILLE = 'A8-grille';
export const A8_GRILLE_GATE = 'g-a8-grille';
export const A8_RTE = 'a8-rte';
export const A8_RTE_GATE = 'g-a8-rte';
/** The request-to-exit's device and egress gate on the grille: ON (the engine rule since 2e58f265: the other gates on a door must all open, an open egress gate releases the door on its own, so the mains gate on the night cut and the button each open the grille). */
export const A8_RTE_GATE_ON: boolean = true;
/** Where the request-to-exit stands (it is on): the lobby's south wall (136.3, 1.1, 56.15), 2.75 m from a body at the hall wall and out of the stairs' reach (A8-D13). */
export const A8_RTE_AT = { x: 136.3, y: 1.1, z: 56.15, yaw: 0 } as const;
export const A8_STAIR_BAR = 'a8-stair-bar';
export const A8_STAIR_GATE = 'g-a8-stair';
export const A8_VAULT = 'A8-vault';
export const A8_VAULT_GATE = 'g-a8-vault';
export const A8_OFFICE_DOOR = 'A8-office';
export const A8_STAIR_TOP = 'A8-stair-top';
export const A8_STAIR_FOOT = 'A8-stair-foot';
/** The time locks (SPEC-style ids, A8-D5), the scanner pair and the flag a synced hack sets. */
export const A8_T1 = 'a8-t1';
export const A8_T2 = 'a8-t2';
export const A8_SCANNER = 'sc-a8';
export const A8_SYNC_FLAG = 'a8-sync';
/** The devices stand 0.1 m off the wall faces (z 67.85 / x 145.85): the scanner glow sits 0.1 m behind the device (`SCAN_GLOW.back`), so a device on the face would put its lamps in the wall (A8-D16). */
export const A8_T1_AT = { x: 137.0, z: 67.75, yaw: Math.PI } as const;
export const A8_T2_AT = { x: 145.75, z: 59.6, yaw: -Math.PI / 2 } as const;
export const A8_PANEL_Y = 1.2;
export const A8_T1_SPOT: [number, number] = [137.0, 67.15];
export const A8_T2_SPOT: [number, number] = [145.15, 59.6];
/** The pass-zone flags and the claim. */
export const A8_GAL_FLAG = 'a8-gal1';
export const A8_LOBBY_FLAG = 'a8-lobby';
export const A8_INNER_FLAG = 'a8-inner1';
export const A8_GAL_ZONE: [number, number, number, number] = [106.2, 56, 134, 77.775];
export const A8_LOBBY_ZONE: [number, number, number, number] = [134.3, 56.3, 145.7, 67.7];
export const A8_INNER_ZONE: [number, number, number, number] = [140.4, 56.6, 145.7, 67.4];

/** The throw gateway (set doc 1.3), kept whole so the tests rebuild the same piece; its release is dropped (A8-D4). */
export const A8_GATEWAY: ThrowGatewayOpts = { id: 'a8', at: { x: 140, z: 62 }, facing: '+x', gap: 11, span: 12, wallH: 5.5, header: 4.8, thick: 0.3, beams: [0.35, 0.9, 1.45], stand: 1.2 };
export const A8_LASER = 'laser-a8';
export const A8_THROW = { x: 138.8, z: 62 } as const;
export const A8_RUNNER = { x: 137.8, z: 62 } as const;
export const A8_LANDING = { x: 142.0, z: 62 } as const;
/** The beams' power panel (high on the lobby's east wall, north of the vault door: `checkPanels` wants one per laser; A8-D11). */
export const A8_PANEL: LaserPanelDef = { id: 'panel-a8', lasers: [A8_LASER], x: 145.75, y: 4.2, z: 66.0, yaw: -Math.PI / 2, label: 'Lobby beams' };

/** The leg-up mark (feet), the gallery's open loading edge (the one co-op lip) and the cross-level jam spot (set doc section 1). */
export const A8_LEGUP = { x: 109.5, z: 68.25 } as const;
export const A8_LIP: CoopLip = { id: 'a8-gallery-lip', y: COOP_LIP, floor: 0, a: { x: 109, z: 66.0 }, b: { x: 109, z: 70.5 }, n: { x: 1, z: 0 } };
export const A8_JAM = { x: 118.0, z: 67.2 } as const;
export const A8_PIER = { x: 125, z: 76.4 } as const;
export const A8_BOARD_WEST = { x: 126.4, z: 76.5 } as const;
export const A8_GRILLE_SPOT = { x: 133.0, z: 62.0 } as const;

/** The hall's faces and heights. */
export const A8_SHELL = { west: 106.25, east: 149.75, south: 50.25, north: 77.75 } as const;
export const A8_H = { hall: 9.0, gallery: 4.4, slab: 4.0, office: 7.4, lobby: 5.5, vault: 3.0, stairwell: 7.4, balustrade: 1.2 } as const;
/** The gallery's slab and the open edge of the return. */
export const A8_RETURN = { x0: 106.25, x1: 109.0, z0: 56.0, z1: 75.0 } as const;
export const A8_NORTH = { x0: 106.25, x1: 133.85, z0: 75.0, z1: 77.75 } as const;
export const A8_OPEN_EDGE: [number, number] = [66.0, 70.5];
export const A8_COLUMNS_N: readonly number[] = [115, 121, 127, 133];
/** The return's columns (z at x 109): the doc's (56.2, 62, 68) with the third moved off the open span (A8-D9). */
export const A8_COLUMNS_W: readonly number[] = [56.2, 62, 65.6, 71.0];
/** The public stair (foot z 67.3, rising north) and the office stair (foot x 134.5, rising east). */
export const A8_PUBLIC_STAIR = { x0: 130.5, x1: 131.7, foot: 67.3 } as const;
/** The public stair's open-side rails (S8-check polish 10; A6's `A6_STAIR_RAIL` idiom): `kit.handrail` in stepped segments of `seg` m along z on the two lines `x` (0.05 m
 *  outside each open edge, so it never narrows the 1.2 m flight), from the flight's fourth tread (z `from`: treads are 0.285 m deep from the foot at 67.3, so the fourth starts at 68.155, 5 mm past `from` on the kit's 0.05 m grid; the first
 *  three treads stay open to step on from the side, a 0.6 m body's centre z <= `from` - 0.3 = 67.85 reaching the first and second treads' centres) to the gallery (z `to`,
 *  where the balustrade's ends stand at x 130.5 / 131.7); each segment's collision box starts at the floor line at its low (south) end and stands `h` m over the line
 *  at its high end. Twelve whole `seg` segments and a 0.25 m last one to `to`: thirteen a side (P4-1; P2-3 started at 67.85, the third tread). */
export const A8_STAIR_RAIL = { x: [A8_PUBLIC_STAIR.x0 - 0.05, A8_PUBLIC_STAIR.x1 + 0.05] as readonly number[], from: 68.15, to: 75, seg: 0.55, h: 1.1 } as const;
/** (J14 re-plan, graph `open_stair` 2.4 m: a real banking hall's width) The re-plan widens the public flight east to x 132.9 (west edge stays 130.5);
 *  `replan/a8Strongroom.ts` builds it. The fourth north column (x 133) stood in the widened flight's way and is not built there (the east wall
 *  carries the slab's last bay). The built 1.2 m flight above stays as `ctcourse` builds it. */
export const A8_REPLAN_STAIR_X1 = 132.9;
export const A8_REPLAN_COLUMN_OUT = 133;
export const A8_OFFICE_STAIR = { z0: 70.0, z1: 71.2, foot: 134.5 } as const;
/** The closed block south of the flight starts here (x): the foot landing is x 134.15-135.2, so a body there is 2.18 m from T1 (A8-D13). */
export const A8_STAIR_BLOCK_X0 = 135.2;
/** The counters (plan boxes) and the night desk. */
export const A8_COUNTER_MAIN = { x0: 114.0, x1: 126.0, z0: 65.5, z1: 66.24, h: 1.2 } as const;
export const A8_COUNTER_RETURN = { x0: 125.26, x1: 126.0, z0: 58.3, z1: 65.5, h: 1.2 } as const;
export const A8_DESK = { x0: 127.3, x1: 129.7, z0: 70.0, z1: 70.9, h: 0.75 } as const;

const WHITE: [number, number, number] = [0.96, 0.97, 1.0];
const WARM: [number, number, number] = [1.0, 0.86, 0.62];
const BRASS: [number, number, number] = [1.0, 0.8, 0.5];
const OAK = '#5a4130';
const COUNTER = '#4a3324';
const STONE = '#6e6a63';
const PLATE = '#585d61';
const STEEL = '#8d949b';
const CONCRETE = '#5b5e61';

/** Lamp radius and intensity per circuit (prototype values; night levels re-tuned under the LR16 light model, LR16-M; the counter lamps' bulb 0.4 m over the marble top; one level per time lock). */
const LAMP = {
  chandelier: { radius: 9, intensity: 1.4 },
  counter: { radius: 2.2, intensity: 0.6, y: 1.6 },
  desk: { radius: 2.0, intensity: 0.5 },
  gallery: { radius: 3.5, intensity: 0.15 },
  office: { radius: 5, intensity: 0.28 },
  lobby: { radius: 6.0, intensity: 0.2 },
  lock: { radius: 3.4, t1: 0.07, t2: 0.085 },
} as const;


// ---- dressing (slice 8 step 5) ----
/** A wall face's outward direction ('s' -z, 'n' +z, 'w' -x, 'e' +x) and a bare hole in a finish [along a0, a1, y0, y1]. */
type Side = 'n' | 's' | 'e' | 'w';
type Hole = readonly [number, number, number, number];
/** The circuits the kit's accent lines follow: the hall night circuit (81, dark in the cut), the gallery lights (82), the office (83), the vault lobby (84). */
const G_HALL = 81;
const G_GALLERY = 82;
const G_OFFICE = 83;
const G_LOBBY = 84;
/** A dressing skin's thickness (m) and the thinnest side a skin may have: under `CANON_MIN_THICK` (0.05, `voxel/lightShapes.ts`) the canonical light shapes
 *  leave it out, so dressing never moves the bake, the meter, what a guard sees or a camera frames. */
const SKIN = 0.03;
const THIN = 0.05;
/** The hall slab's top (the kit's panels start there) and where the wall finishes meet the ceiling (the cornice's foot). */
export const A8_CEIL_TOP = A8_H.hall + 0.2;
export const A8_CORNICE = 8.62;
/** The dado heights: the hall floor (2.4), the deck level (1.2 over the oak boards), the vestibule and the strip under the gallery (1.6). */
const DADO_FLOOR = 2.4;
const DADO_DECK = 1.2;
const DADO_LOW = 1.6;
/** Pilaster centre lines on the hall's four wall faces (stone, 0.36 m wide, clear of the lamps, the board, the doors and the grille bays). */
export const A8_SOUTH_P: readonly number[] = [108.5, 113.1, 117.7, 122.3, 126.9, 131.5];
export const A8_NORTH_P: readonly number[] = [108.5, 113.1, 117.7, 122.3, 128.0, 131.25];
export const A8_EAST_P: readonly number[] = [52.6, 56.0, 59.2, 64.8, 68.0, 71.4, 74.5];
/** The two brass bar panels either side of the grille's opening on the east wall's hall face: the bars' run [a, e] and the finish left out behind them (z). */
export const A8_BAYS: readonly { bars: readonly [number, number]; fill: readonly [number, number] }[] = [
  { bars: [59.6, 60.8], fill: [59.55, 61.1] },
  { bars: [63.2, 64.4], fill: [62.9, 64.45] },
];
export const A8_WEST_P: readonly number[] = [54.0, 57.6, 64.6, 67.9, 71.2, 74.5];
/** The tall windows (dark glass in stone surrounds) on the south wall and over the gallery on the north wall: centres (x), the sill and head heights. */
export const A8_WINDOW_S: readonly number[] = [110.8, 115.4, 120.0, 124.6, 129.2];
export const A8_WINDOW_N: readonly number[] = [110.8, 115.4, 120.0, 124.6];
export const A8_WINDOW_Y = { south: [3.5, 7.5], north: [5.9, 8.0] } as const;
/** The striped marks (SPEC P16): the leg-up mark and the cross-level jam spot, 1 m squares on the floor. */
export const A8_MARKS: readonly { x: number; z: number }[] = [
  { x: A8_LEGUP.x, z: A8_LEGUP.z },
  { x: A8_JAM.x, z: A8_JAM.z },
];
/** The hall floor's black chequer: 1.6 m cells from (109.25, 51.45), 15 by 14. */
export const A8_CHECKER = { cell: 1.6, nx: 15, nz: 14 } as const;
/** The bank counters (props over the greybox boxes, A8-4): the main run's five modules, the return's three. The prop stands 2 cm / 3 cm proud on its front and the
 *  box behind it is closed by a back panel; both are lifted 1 cm. */
export const A8_COUNTER_MAIN_X: readonly number[] = [115.2, 117.6, 120.0, 122.4, 124.8];
export const A8_COUNTER_MAIN_Z = 65.85;
export const A8_COUNTER_RETURN_Z: readonly number[] = [59.5, 61.9, 64.3];
export const A8_COUNTER_RETURN_X = 125.6;
export const A8_PROP_LIFT = 0.01;
/** The night desk prop (over the desk box, shifted 5 cm north so its back sits inside the box and its front stands 5 cm proud). */
export const A8_DESK_PROP = { x: 128.5, z: 70.5 } as const;
/** The vault's deposit walls: three 1.2 m modules on each flank, backs on the flank walls (z 58.15 and 65.85). */
export const A8_DEPOSIT_X: readonly number[] = [146.75, 147.95, 149.15];
export const A8_DEPOSIT_Z = { south: 58.45, north: 65.55 } as const;
/** Sign plates (props, hung, no collision): [x, z, yaw, mount y, light circuit]: over the grille on the hall face (81, the hall night circuit), over the vault door on the lobby
 *  face (84), over the stair foot door on the lobby face (84), over the stair-top door on the office face (83) and over the office door on the hall face at gallery level
 *  (82, the gallery wall lights over it). The circuit is the one that lights the plate's wall (S3-7 S1: the plate's lamp dims with it). */
export const A8_SIGNS: readonly (readonly [number, number, number, number, number])[] = [
  [133.85, 62.0, -Math.PI / 2, 3.7, 81],
  [145.85, 62.0, -Math.PI / 2, 2.75, 84],
  [135.0, 67.85, Math.PI, 2.35, 84],
  [143.2, 71.55, 0, 6.75, 83],
  [133.85, 76.6, -Math.PI / 2, 6.8, 82],
];
/** The lighting board's place on the north wall (x range): the cabinet's width 1.2 m plus a hand's width of dado each side. */
export const A8_BOARD_FIT = [126.25, 127.75] as const;
/** The two stairs' rails: posts every 1.5 m on both sides of the public flight, wall rails on both walls of the office flight. */
export const A8_RAIL_LIFT = { top: 1.0, mid: 0.5, wall: 0.9 } as const;
/** Own materials: a Victorian bank (oak panelling, plaster, stone, marble, brass) over a vault company's steel plate and concrete. */
const LOOK = {
  oak: '#6a4a30',
  oakDark: '#46301f',
  plaster: '#cdc4ae',
  plasterShade: '#b8ae96',
  stone: '#a39d8e',
  stoneDark: '#6f6a5f',
  marble: '#d6d0c0',
  marbleDark: '#2b2c2f',
  brass: '#b58f3d',
  brassDark: '#7f6226',
  steel: '#7b838a',
  steelDark: '#3b4045',
  plate: '#4d5358',
  rivet: '#363b40',
  black: '#141618',
  yellow: '#d2a420',
  red: '#b3262b',
  green: '#2f8f5b',
  white: '#e3e4de',
  cream: '#d6d3c6',
  glass: '#17222c',
  glassBar: '#2b3136',
  screen: '#0f1f29',
  glow: '#2f9a73',
  amber: '#d8891c',
  seam: '#31383d',
  paint: '#9da5a2',
  concrete: '#5c5f60',
  stain: '#25282a',
  leather: '#3a2a22',
  chain: '#8b7430',
  wire: '#222528',
  carpet: '#3a4650',
} as const;

export function buildA8Strongroom(b: LevelBuilder, kit: FacilityKit, opts: { replan?: boolean } = {}): A8Part {
  const p = emptyPart('a8Strongroom');
  /** A box from x0 to x1, z0 to z1, y0 to y1; `noLedge` unless told otherwise. */
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string, opts: { overhead?: boolean; noLedge?: boolean; visible?: boolean } = {}): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, true, opts.visible ?? true);
    b.mark(from, { noLedge: opts.noLedge ?? true, ...(opts.overhead ? { overhead: true } : {}) });
  };
  /** The collision fillers under a flight (A2-17, S2-check should-fix 2): 0.5 m slices of invisible solid to 0.05 m under the ramp's
   *  nosing line at each slice's low end, so nothing can stand in the steps. `axis` is the run's axis, `sign` its direction. */
  const fillFlight = (axis: 'x' | 'z', sign: 1 | -1, foot: number, len: number, rise: number, c0: number, c1: number): void => {
    for (let a0 = 0; a0 < len - 1e-9; a0 += 0.5) {
      const a1 = Math.min(a0 + 0.5, len);
      const hgt = (rise * a0) / len - 0.05;
      if (hgt < 0.05) continue;
      const u0 = sign === 1 ? foot + a0 : foot - a1;
      const u1 = sign === 1 ? foot + a1 : foot - a0;
      if (axis === 'x') slab(u0, u1, c0, c1, 0, hgt, STEEL, { visible: false });
      else slab(c0, c1, u0, u1, 0, hgt, STEEL, { visible: false });
    }
  };

  const S = A8_SHELL;
  const T = 0.3;
  const HE = 134; // the hall's east wall centre line
  const heW = HE - T / 2;
  const heE = HE + T / 2;
  const DOOR_H = 2.1;
  const grille = { z0: 61.1, z1: 62.9, h: 3.0 };

  // ---- A8-1: the hall's ceiling and east wall (the grille gate's opening and lintel) ----
  tally(b, p.register, 'A8-1', "Banking hall: a 9.0 m ceiling slab (overhead, noLedge) x 106.25-133.85, z 50.25-77.75; the east wall x 134 (0.3, 9.0 m) with the public grille's opening z 61.1-62.9 (lintel 3.0-9.0); oak boards on the gallery", () => {
    slab(S.west, heW, S.south, S.north, A8_H.hall, A8_H.hall + 0.2, KIT_BOX_COLOR, { overhead: true });
    slab(heW, heE, S.south, grille.z0, 0, A8_H.hall, KIT_BOX_COLOR);
    slab(heW, heE, grille.z1, 71.4, 0, A8_H.hall, KIT_BOX_COLOR);
    slab(heW, heE, grille.z0, grille.z1, grille.h, A8_H.hall, KIT_BOX_COLOR);
    b.surface('wood', A8_NORTH.x0, A8_NORTH.x1, A8_NORTH.z0, A8_NORTH.z1, A8_H.gallery);
    b.surface('wood', A8_RETURN.x0, A8_RETURN.x1, A8_RETURN.z0, A8_RETURN.z1, A8_H.gallery);
  });

  // ---- A8-2: the public gallery: the slab on columns, the balustrade, the open loading edge (A8-D1) ----
  const r = A8_RETURN;
  const n = A8_NORTH;
  const bal = A8_H.balustrade;
  tally(b, p.register, 'A8-2', 'Public gallery: a hand slab 4.0-4.4 (overhead, noLedge) on the north run x 106.25-133.85, z 75-77.75 and the west return x 106.25-109, z 56-75; 0.4 m columns (noLedge) at x 115 / 121 / 127 / 133 on z 75 and at z 56.2 / 62 / 65.6 / 71 on x 109; the 1.2 m solid balustrade (noLedge) on every front edge but the public stair head and the open loading edge z 66-70.5; the one manual ledge (the co-op lip, 4.4)', () => {
    slab(n.x0, n.x1, n.z0, n.z1, A8_H.slab, A8_H.gallery, OAK, { overhead: true });
    slab(r.x0, r.x1, r.z0, r.z1, A8_H.slab, A8_H.gallery, OAK, { overhead: true });
    for (const x of A8_COLUMNS_N) if (!opts.replan || x !== A8_REPLAN_COLUMN_OUT) slab(x - 0.2, x + 0.2, 74.8, 75.2, 0, A8_H.slab, STONE);
    for (const z of A8_COLUMNS_W) slab(108.8, 109.2, z - 0.2, z + 0.2, 0, A8_H.slab, STONE);
    const top = A8_H.gallery + bal;
    // the north front (z 75.0-75.2), x 108.8 round the corner to the stair head x 130.5, then 131.7 to the east wall
    slab(108.8, 130.5, 75.0, 75.2, A8_H.gallery, top, STONE);
    if (!opts.replan) slab(131.7, n.x1, 75.0, 75.2, A8_H.gallery, top, STONE);
    // the return's front (x 108.8-109.0): z 56.2 to the open edge, and from it to the corner; and the return's south end
    slab(108.8, 109.0, 56.2, A8_OPEN_EDGE[0], A8_H.gallery, top, STONE);
    slab(108.8, 109.0, A8_OPEN_EDGE[1], 75.0, A8_H.gallery, top, STONE);
    slab(r.x0, 109.0, 56.0, 56.2, A8_H.gallery, top, STONE);
    // the open loading edge: the one manual ledge, a -> b with the floor on its right (normal +x)
    b.ledge(109, A8_OPEN_EDGE[0], 109, A8_OPEN_EDGE[1], A8_H.gallery);
  });
  p.lips.push(A8_LIP);

  // ---- A8-3: the public stair (27 risers, rising north) with its underside filled ----
  const ps = A8_PUBLIC_STAIR;
  const st = stairSteps(A8_H.gallery);
  if (!opts.replan) tally(b, p.register, 'A8-3', 'Public stair x 130.5-131.7, z 67.3-75 (27 risers of 0.163, run 0.285, rising north to the gallery): step boxes and the ramp collider, noLedge fillers under the flight (invisible, 0.5 m slices)', () => {
    b.stairs((ps.x0 + ps.x1) / 2, ps.foot + st.len / 2, ps.x1 - ps.x0, st.len, A8_H.gallery, st.steps, OAK, 0, 0);
    fillFlight('z', 1, ps.foot, st.len, A8_H.gallery, ps.x0, ps.x1);
  });

  // ---- A8-4: the oak counters and the night desk (low cover) ----
  tally(b, p.register, 'A8-4', 'Oak counters 1.2 m (main run x 114-126, z 65.5-66.24, from x 114: A8-D2; return x 125.26-126, z 58.3-65.5) and the night desk 0.75 m, x 127.3-129.7, z 70-70.9: low cover, solo-standable tops', () => {
    for (const c of [A8_COUNTER_MAIN, A8_COUNTER_RETURN]) slab(c.x0, c.x1, c.z0, c.z1, 0, c.h, COUNTER, { noLedge: false });
    slab(A8_DESK.x0, A8_DESK.x1, A8_DESK.z0, A8_DESK.z1, 0, A8_DESK.h, COUNTER, { noLedge: false });
  });

  // ---- A8-5: the security office (floor block 4.4, walls, ceiling 7.4, the door, the stair-top door) ----
  const OF = { x0: 134, x1: 144 } as const;
  const ofE = OF.x1 + T / 2;
  const officeDoor = { z0: 76.0, z1: 77.2 };
  const topDoor = { x0: 142.6, x1: 143.8 };
  const floorY = A8_H.gallery;
  tally(b, p.register, 'A8-5', 'Security office x 134-144, z 71.4-78: floor a solid block to 4.4 (noLedge, closed rooms below), walls to the hall roof with the door A8-office on the west wall (z 76.0-77.2, 1.2 x 2.1) and the stair-top door A8-stair-top on the south wall (x 142.6-143.8), roof 7.4-7.5; carpet; the console desk on the east wall', () => {
    slab(heW, ofE - T, 71.25, S.north, 0, floorY, KIT_BOX_COLOR);
    // west wall (above the floor block), door gap and lintel
    if (!opts.replan) slab(heW, heE, 71.4, officeDoor.z0, floorY, A8_H.hall, KIT_BOX_COLOR);
    slab(heW, heE, officeDoor.z1, S.north, floorY, A8_H.hall, KIT_BOX_COLOR);
    slab(heW, heE, officeDoor.z0, officeDoor.z1, floorY + DOOR_H, A8_H.hall, KIT_BOX_COLOR);
    // east wall
    slab(OF.x1 - T / 2, ofE, 71.25, S.north, floorY, A8_H.hall, KIT_BOX_COLOR);
    // south wall with the stair-top door
    slab(heE, topDoor.x0, 71.25, 71.55, floorY, A8_H.hall, KIT_BOX_COLOR);
    slab(topDoor.x1, OF.x1 - T / 2, 71.25, 71.55, floorY, A8_H.hall, KIT_BOX_COLOR);
    slab(topDoor.x0, topDoor.x1, 71.25, 71.55, floorY + DOOR_H, A8_H.hall, KIT_BOX_COLOR);
    // the roof (over the office and the stairwell)
    slab(heE, ofE, 68.15, S.north, A8_H.office, A8_H.office + 0.1, KIT_BOX_COLOR, { overhead: true });
    b.surface('carpet', heE, OF.x1 - T / 2, 71.55, S.north, floorY);
    p.doors[A8_OFFICE_DOOR] = b.door(HE, floorY, officeDoor.z0, officeDoor.z1 - officeDoor.z0, 0, { height: DOOR_H }).id;
    p.doors[A8_STAIR_TOP] = b.door(topDoor.x0, floorY, 71.4, topDoor.x1 - topDoor.x0, Math.PI / 2, { height: DOOR_H }).id;
    // the console desk (0.75 m) under the console on the east wall
    slab(143.3, OF.x1 - T / 2, 73.7, 75.7, floorY, floorY + 0.75, COUNTER);
  });

  // ---- A8-6: the office stair: an enclosed stairwell along the lobby's north side ----
  const os = A8_OFFICE_STAIR;
  const stO = stairSteps(floorY);
  const foot = { x0: 134.4, x1: 135.6 };
  tally(b, p.register, 'A8-6', "Office stair: the stairwell x 134.15-144.15, z 68.15-71.25 (7.4 m, roof above) with the flight x 134.5-142.2, z 70-71.2 (27 risers rising east, noLedge fillers under it), the closed block south of it (x 135.2-142.2, z 68.15-70, noLedge: T1 is out of reach from the stair), the head landing x 142.2-144.15 (4.4 block), the lobby wall's foot door A8-stair-foot (x 134.4-135.6, 1.2 x 2.1, locked: an egress gate, push bar on the stair side)", () => {
    // the lobby's north wall (z 68, 7.4 m) with the foot door's gap and lintel
    slab(134.15, foot.x0, 67.85, 68.15, 0, A8_H.stairwell, KIT_BOX_COLOR);
    slab(foot.x1, 146.15, 67.85, 68.15, 0, A8_H.stairwell, KIT_BOX_COLOR);
    slab(foot.x0, foot.x1, 67.85, 68.15, DOOR_H, A8_H.stairwell, KIT_BOX_COLOR);
    p.doors[A8_STAIR_FOOT] = b.door(foot.x0, 0, 68.0, foot.x1 - foot.x0, Math.PI / 2, { height: DOOR_H, locked: true }).id;
    // the block south of the flight (T1's wall must not be reachable from the stairs) and the head landing
    slab(A8_STAIR_BLOCK_X0, 142.2, 68.15, os.z0, 0, A8_H.stairwell, STONE);
    slab(142.2, 144.15, 68.15, 71.25, 0, floorY, STONE);
    b.stairs(os.foot + stO.len / 2, (os.z0 + os.z1) / 2, os.z1 - os.z0, stO.len, floorY, stO.steps, PLATE, Math.PI / 2, 0);
    fillFlight('x', 1, os.foot, stO.len, floorY, os.z0, os.z1);
  });

  // ---- A8-7: the vault lobby: ceiling, east wall with the vault door's opening, floor plate ----
  const vd = { z0: 61.3, z1: 62.7, h: 2.2 };
  tally(b, p.register, 'A8-7', 'Vault lobby x 134.15-145.85, z 56.15-67.85: a 5.5 m ceiling slab (overhead, noLedge), the east wall x 146 (5.5 m) with the vault door A8-vault (x 146, z 61.3-62.7, 1.4 x 2.2, locked, flag gate on a8-sync); the steel plate floor (metal, loud)', () => {
    slab(134.15, 145.85, 56.15, 67.85, A8_H.lobby, A8_H.lobby + 0.1, KIT_BOX_COLOR, { overhead: true });
    slab(145.85, 146.15, 56.15, vd.z0, 0, A8_H.lobby, KIT_BOX_COLOR);
    slab(145.85, 146.15, vd.z1, 67.85, 0, A8_H.lobby, KIT_BOX_COLOR);
    slab(145.85, 146.15, vd.z0, vd.z1, vd.h, A8_H.lobby, KIT_BOX_COLOR);
    b.surface('metal', 134.15, 145.85, 56.15, 67.85, 0);
    p.doors[A8_VAULT] = b.door(146, 0, vd.z0, vd.z1 - vd.z0, 0, { height: vd.h, locked: true }).id;
  });

  // ---- A8-8: the public grille (a mains gate) and its request-to-exit button ----
  tally(b, p.register, 'A8-8', "Public grille: the gate A8-grille on x 134, z 61.1-62.9 (1.8 m wide, 3.0 m, built locked, swinging into the lobby): a mains gate on the night circuit, opaque while shut; the request-to-exit button a8-rte on the lobby's south wall (a course device, no piece; its egress gate releases the grille on its own)", () => {
    p.doors[A8_GRILLE] = b.door(HE, 0, grille.z0, grille.z1 - grille.z0, 0, { height: grille.h, locked: true }).id;
  });

  // ---- A8-9: the inner beam curtain (`throwGateway`), its beams on `a8-sync`, its power panel ----
  const g = throwGateway(A8_GATEWAY);
  tally(b, p.register, 'A8-9', "Inner beam curtain x 140: piers z 56-56.5 and 67.5-68 (5.5 m, noLedge), the header over z 56.5-67.5 at 4.8-5.5 (overhead), three IR beams laser-a8 at 0.35 / 0.9 / 1.45 switched off by a8-sync (A8-D4: the helper's release removed), the striped throw mark 1.2 m behind the line", () => {
    applyGreybox(b, { ...g, stairs: [], ledges: [], doors: [] });
  });
  for (const l of g.lasers) p.lasers.push({ ...l, label: 'Lobby beams', offFlag: A8_SYNC_FLAG });
  p.laserPanels.push({ ...A8_PANEL });
  p.register.push({ id: 'A8-10', element: "Beam power panel panel-a8 high on the lobby's east wall north of the vault door (145.75, 4.2, 66.0), facing west: jammable, shown in electro (a laser panel, no builder piece)" });

  // ---- A8-11: the time locks (`syncStation`, scan): T1 on the lobby's north wall, T2 on its east wall ----
  const station = syncStation({ id: 'a8', kind: 'scan', a: A8_T1_AT, b: A8_T2_AT, y: A8_PANEL_Y });
  tally(b, p.register, 'A8-11', 'Time locks T1 (north wall, (137, 67.75), faces south) and T2 (east wall beside the vault door, (145.75, 59.6), faces west) 12 m apart (syncStation, scan): housings (visual), scanner pair sc-a8 on a8-sync', () => {
    applyGreybox(b, station);
  });
  const dev = (d: { x: number; z: number; yaw: number }, label: string) => ({ x: d.x, y: 0, z: d.z, yaw: d.yaw, label });
  p.devices[A8_T1] = dev(station.devices['sw-a8-a']!, 'Time lock one (hack with your partner)');
  p.devices[A8_T2] = dev(station.devices['sw-a8-b']!, 'Time lock two (hack with your partner)');
  p.scanners.push({ id: A8_SCANNER, a: A8_T1, b: A8_T2, flag: A8_SYNC_FLAG });

  // ---- A8-12: the closed areas: back offices, the plant, the vault's roof and flanks (solid, no doors) ----
  tally(b, p.register, 'A8-12', "Closed areas (solid, noLedge, no doors): the back offices x 134.15-149.75, z 50.25-56.15 (the lobby's south wall); the vault's flanks z 56.15-58.15 and z 65.85-77.75 (x 146.15-149.75) and the plant x 144.15-146.15, z 68.15-77.75; the vault x 146.15-149.75, z 58.15-65.85 under a solid 3.0 m roof (open at its back to the cash dock)", () => {
    slab(134.15, S.east, S.south, 56.15, 0, A8_H.hall, CONCRETE);
    slab(146.15, S.east, 56.15, 58.15, 0, A8_H.hall, CONCRETE);
    slab(146.15, S.east, 65.85, S.north, 0, A8_H.hall, CONCRETE);
    slab(144.15, 146.15, 68.15, S.north, 0, A8_H.hall, CONCRETE);
    slab(146.15, S.east, 58.15, 65.85, A8_H.vault, A8_H.hall, CONCRETE);
    b.surface('metal', 146.15, S.east, 58.15, 65.85, 0);
  });

  // ---- the console, the board, the gates ----
  p.register.push({ id: 'A8-13', element: "Course devices (no pieces): the lighting board a8-board under the gallery at (127, 0.9, 77.6) (the night circuit's isolator, 25 s, re-arm 5 s), the console a8-console on the office's east wall (143.7, 5.6, 74.7) with its pickup gate, the stair's push bar a8-stair-bar at the flight's foot (135.8, 1.1, 71.2) (an egress gate), the vault's flag gate; the grille's request-to-exit a8-rte on the lobby's south wall (136.3, 1.1, 56.15) is ON (A8_RTE_GATE_ON): a second gate on the grille, an egress gate that releases it for good from the lobby side (2e58f265)" });
  const night = circuitOf(81)!.timed!;
  p.devices[A8_BOARD] = { x: 127.0, y: 0.9, z: 77.6, yaw: Math.PI, label: 'Isolate the hall lights' };
  p.devices[A8_CONSOLE] = { x: 143.7, y: 5.6, z: 74.7, yaw: -Math.PI / 2, label: 'Loop the cameras' };
  p.devices[A8_STAIR_BAR] = { x: 135.8, y: 1.1, z: 71.2, yaw: Math.PI, label: 'Push the bar' };
  // the request-to-exit (SPEC: the player inside opens the grille for good): a second gate on the grille. `CourseState.locked` (2e58f265): the
  // other gates on a door must all open and an open egress gate releases it on its own, so the board still opens it on the night cut and the button opens it for good.
  if (A8_RTE_GATE_ON) {
    p.devices[A8_RTE] = { ...A8_RTE_AT, label: 'Request to exit' };
    p.bay.gates.push({ kind: 'egress', id: A8_RTE_GATE, switchId: A8_RTE, doorIds: [A8_GRILLE] } satisfies EgressGate);
  }
  p.consoles.push({ id: A8_CONSOLE, guard: A8_OFFICER, flag: A8_LOOP_FLAG, seconds: A8_LOOP.seconds, rearm: A8_LOOP.rearm });
  p.bay.gates.push(
    { kind: 'isolator', id: A8_NIGHT_GATE, switchIds: [A8_BOARD], group: A8_NIGHT_GROUP, seconds: night.seconds, rearm: night.rearm } satisfies IsolatorGate,
    { kind: 'mains', id: A8_GRILLE_GATE, group: A8_NIGHT_GROUP, doorId: A8_GRILLE } satisfies MainsGate,
    { kind: 'egress', id: A8_STAIR_GATE, switchId: A8_STAIR_BAR, doorIds: [A8_STAIR_FOOT] } satisfies EgressGate,
    { kind: 'flag', id: A8_VAULT_GATE, flag: A8_SYNC_FLAG, doorId: A8_VAULT } satisfies FlagGate,
    { kind: 'pickup', id: A8_CONSOLE_GATE, switchId: A8_CONSOLE, flag: A8_LOOP_FLAG, perPlayer: false } satisfies PickupGate,
  );

  // ---- the three cameras (all on the console's flag; C2 hangs over the gallery level) ----
  p.register.push({ id: 'A8-14', element: "Cameras C1-C3 on the console flag a8-loop (layout data): C1 on the hall's south wall over the public floor, C2 on its east wall over the gallery level (y 3.0 over 4.4), C3 in the lobby's south-west corner" });
  const cam = (id: string, at: [number, number], y: number, facing: number, aim: number, range: number, reason: string, level = 'ground'): CameraDevice => ({ id, kind: 'camera', level, at, y, facing, aim, range, room: 'A8', reason, offFlag: A8_LOOP_FLAG });
  p.cameras.push(
    cam(A8_CAMERAS[0], [120.0, 50.4], 3.2, 0, 8, 14, 'Bank CCTV over the public floor south of the counters'),
    cam(A8_CAMERAS[1], [133.75, 73.0], 3.0, 323, 6, 10, "Bank CCTV on the hall's east wall: the gallery's last 8 m and the office door", A8_GALLERY_LEVEL),
    cam(A8_CAMERAS[2], [134.45, 56.45], 3.2, 45, 8, 14, 'Vault lobby CCTV over both time locks, the throw spot and the beam curtain'),
  );

  // ---- A8-15: the lights (LIGHTING-PLAN 3, A8; the circuits are `MARLOW_CIRCUITS` 81-84) ----
  tally(b, p.register, 'A8-15', 'Lamps on groups 81-84: hall night circuit 81 (three chandeliers y 7.5, three counter lamps, the desk lamp), gallery wall lights 82 (three on the north wall over the east bays), office panels 83 (two), vault lobby panels 84 (two) and a status lamp over each time lock (A8-D12)', () => {
    const lamp = (x: number, y: number, z: number, group: number, radius: number, intensity: number, color: [number, number, number], fx: [number, number, number]): void => {
      b.light({ x, y, z, radius, intensity, color, group, electric: true, destructible: true, fixture: { sx: fx[0], sy: fx[1], sz: fx[2], oy: fx[1] / 2 } });
    };
    for (const [x, z] of [[130.0, 62.0], [124.0, 58.0], [128.0, 69.5]] as const) lamp(x, 7.5, z, 81, LAMP.chandelier.radius, LAMP.chandelier.intensity, WARM, [0.8, 0.4, 0.8]);
    for (const [x, z] of [[121.0, 65.9], [124.8, 65.9], [125.6, 61.5]] as const) lamp(x, LAMP.counter.y, z, 81, LAMP.counter.radius, LAMP.counter.intensity, WARM, [0.2, 0.2, 0.2]);
    lamp(128.5, 1.0, 70.4, 81, LAMP.desk.radius, LAMP.desk.intensity, WARM, [0.2, 0.2, 0.2]);
    for (const x of [126.0, 129.5, 133.0]) lamp(x, 6.6, 77.6, 82, LAMP.gallery.radius, LAMP.gallery.intensity, BRASS, [0.2, 0.3, 0.15]);
    for (const x of [137.5, 141.5]) lamp(x, 7.2, 74.7, 83, LAMP.office.radius, LAMP.office.intensity, WHITE, [0.6, 0.05, 0.6]);
    for (const x of [137.0, 143.0]) lamp(x, 5.3, 62.0, 84, LAMP.lobby.radius, LAMP.lobby.intensity, WHITE, [0.6, 0.05, 0.6]);
    // a status lamp over each time lock (A8-D12): the panels' own pools, so the locks read lit without the ceiling panels spilling out of the open grille
    lamp(A8_T1_AT.x, 2.2, A8_T1_AT.z - 0.4, 84, LAMP.lock.radius, LAMP.lock.t1, WHITE, [0.3, 0.05, 0.2]);
    lamp(A8_T2_AT.x - 0.4, 2.2, A8_T2_AT.z + 0.4, 84, LAMP.lock.radius, LAMP.lock.t2, WHITE, [0.2, 0.05, 0.3]);
  });
  for (const [k, gr] of Object.entries(marlowCourseGroups())) if (k.startsWith('a8-')) p.groups[k] = gr;
  // wall switches: the gallery's on the stair head's east balustrade end, the office's inside its door
  p.switches.push({ id: 'a8-sw-gallery', group: 82, pos: { x: 131.65, y: 5.6, z: 75.1 }, yaw: -Math.PI / 2 });
  p.switches.push({ id: 'a8-sw-office', group: 83, pos: { x: 134.25, y: 5.6, z: 75.6 }, yaw: Math.PI / 2 });
  // the set at its standby fill by level (SPEC 7; the doc's four zones: the set, the gallery, the office, the lobby)
  const sb = MARLOW_LEVEL.standby;
  p.ambientZones.push(
    { id: 'A8', box: [106, 50, 150, 78], ambient: sb, minY: -1, maxY: 8.9 },
    { id: 'a8-gallery', box: [106, 56, 134, 78], ambient: sb, minY: 3.9, maxY: 8.9 },
    { id: 'a8-office', box: [134, 71, 144, 78], ambient: sb, minY: 3.9, maxY: 7.3 },
    { id: 'a8-lobby', box: [134, 56, 146, 68], ambient: sb, minY: -1, maxY: 5.4 },
  );
  p.medkitWalls.push({ pos: { x: 138.5, y: floorY, z: 77.35 }, yaw: Math.PI });

  // ---- the guards, the steps, the claim, the pass zones, the radio ----
  p.squads[A8_N1] = { kind: 'grunt', x: A8_N1_POST.x, z: A8_N1_POST.z, yaw: Math.PI, route: A8_N1_ROUTE, waits: A8_N1_WAITS, faces: A8_N1_FACES };
  p.squads[A8_N2] = { kind: 'grunt', x: A8_N2_ROUTE[0]![0], z: A8_N2_ROUTE[0]![1], yaw: Math.PI / 2, route: A8_N2_ROUTE, waits: A8_N2_WAITS, faces: A8_N2_FACES };
  p.squads[A8_OFFICER] = { kind: 'grunt', x: A8_OFFICER_POST.x, z: A8_OFFICER_POST.z, yaw: Math.PI / 2, y: A8_OFFICER_POST.y, info: A8_OFFICER_INFO };
  p.bay.squad.push(A8_N1, A8_N2, A8_OFFICER);
  // the first player onto the public gallery takes A; the other is B. Until then the lead (P2 in this even set) reads A
  p.bay.roles = [{ role: 'a', zone: { box: A8_GAL_ZONE, y0: 3.9 } }];
  p.passZones.push(
    { id: 'a8-p-gal1', box: A8_GAL_ZONE, flag: A8_GAL_FLAG, floorY: A8_H.gallery, any: true },
    { id: 'a8-p-lobby', box: A8_LOBBY_ZONE, flag: A8_LOBBY_FLAG, floorY: 0 },
    { id: 'a8-p-inner1', box: A8_INNER_ZONE, flag: A8_INNER_FLAG, floorY: 0, any: true },
  );
  p.externalFlags.push(A8_GAL_FLAG, A8_LOBBY_FLAG, A8_INNER_FLAG, A8_SYNC_FLAG);
  p.objectives.push(
    {
      id: 'a8-split',
      bay: 'A8',
      text: 'Split up: gallery and floor',
      a: 'Take the boost to the gallery at the dark west end.',
      b: 'Boost your partner up, then keep to the counters.',
      done: { flag: A8_GAL_FLAG },
    },
    {
      id: 'a8-office',
      bay: 'A8',
      text: 'Loop the cameras in the security office',
      a: "Reach the office on your partner's jam, then take the officer.",
      b: 'Jam the gallery camera from the floor for your partner.',
      done: { flag: A8_LOOP_FLAG },
    },
    {
      id: 'a8-grille',
      bay: 'A8',
      text: 'Cut the hall lights, open the grille',
      a: 'Come down the office stair into the vault lobby.',
      b: 'Cut the hall lights at the board, then slip through the grille.',
      done: { flag: A8_LOBBY_FLAG },
      timer: A8_CONSOLE_GATE,
    },
    {
      id: 'a8-beams',
      bay: 'A8',
      text: 'Cross the beams to time lock two',
      a: 'Throw your partner over the beams.',
      b: 'Land by the vault door and take time lock two.',
      done: { flag: A8_INNER_FLAG },
      timer: A8_CONSOLE_GATE,
    },
    {
      id: 'a8-sync',
      bay: 'A8',
      text: 'Hack both time locks on the lamps',
      a: "Hack time lock one on your partner's count.",
      b: "Hack time lock two on your partner's count.",
      done: { flag: A8_SYNC_FLAG },
      timer: A8_CONSOLE_GATE,
    },
    { id: 'a8-out', bay: 'A8', text: 'Both out to the cash dock' },
  );
  p.bay.radio.push(
    { at: 'enter', text: 'Last one: everything from tonight in one room. Take your time.' },
    // (joint-interrogation, G148) the teach, as A reaches the gallery
    { at: 'a8-split', text: 'The duty officer clams up with one of you. Two of you, he might say more.' },
    { at: `warn:${A8_NIGHT_GATE}`, text: 'Lights back in five.' },
    { at: `warn:${A8_NIGHT_GATE}`, text: "Grille's locking again." },
    { at: `warn:${A8_CONSOLE_GATE}`, text: 'Cameras back in five.' },
    { at: 'a8-sync', text: 'Vault open. Well done, both of you.' },
  );
  // bodies are dragged to these: the vestibule, the west bays behind the main counter, the board's west side
  p.hideSpots.push({ x: 107.6, y: 0, z: 64.5 }, { x: 116.0, y: 0, z: 70.0 }, { x: A8_BOARD_WEST.x, y: 0, z: A8_BOARD_WEST.z });

  // ---- spaces, nav, debug points, light and shot spots ----
  p.camSpaces.push(
    { box: [106, 50, 134, 78], size: 'open' },
    { box: [134, 56, 146, 68], size: 'open' },
    { box: [146, 58, 150, 66], size: 'tight' },
    { box: [134, 68, 144, 71.4], size: 'tight' },
    { box: [134, 71.4, 144, 78], y: [3.9, 8], size: 'tight' },
  );
  p.navSeeds.push(
    { x: 107.6, y: 0, z: 62 },
    { x: 120, y: 0, z: 62 },
    { x: 120, y: A8_H.gallery, z: 76.4 },
    { x: 139, y: A8_H.gallery, z: 74.7 },
    { x: 134.8, y: 0, z: 69.3 },
    { x: 137, y: 0, z: 62 },
    { x: 143, y: 0, z: 62 },
    { x: 148, y: 0, z: 62 },
  );
  p.debugPoints.push(
    { id: 'A8-entry', label: 'Set 8 entry (the vestibule vantage)', pos: { x: 107.4, y: 0, z: 64.5 }, yaw: Math.PI / 2 },
    { id: 'A8-mid', label: 'Set 8 middle (the front, by the desk)', pos: { x: 124, y: 0, z: 69 }, yaw: Math.PI / 2 },
    { id: 'A8-legup', label: 'Set 8 leg-up mark', pos: { x: A8_LEGUP.x, y: 0, z: A8_LEGUP.z }, yaw: -Math.PI / 2 },
    { id: 'A8-jam', label: 'Set 8 cross-level jam spot', pos: { x: A8_JAM.x, y: 0, z: A8_JAM.z }, yaw: Math.PI / 2 },
    { id: 'A8-pier', label: 'Set 8 gallery pier (under C2)', pos: { x: A8_PIER.x, y: A8_H.gallery, z: A8_PIER.z }, yaw: Math.PI / 2 },
    { id: 'A8-board', label: 'Set 8 lighting board (west side)', pos: { x: A8_BOARD_WEST.x, y: 0, z: A8_BOARD_WEST.z }, yaw: 0 },
    { id: 'A8-grille', label: 'Set 8 grille approach', pos: { x: A8_GRILLE_SPOT.x, y: 0, z: A8_GRILLE_SPOT.z }, yaw: Math.PI / 2 },
    { id: 'A8-console', label: 'Set 8 console (behind the officer)', pos: { x: 142.0, y: A8_H.gallery, z: 74.7 }, yaw: Math.PI / 2 },
    { id: 'A8-throw', label: 'Set 8 throw mark', pos: { x: A8_THROW.x, y: 0, z: A8_THROW.z }, yaw: Math.PI / 2 },
    { id: 'A8-t1', label: 'Set 8 time lock one', pos: { x: A8_T1_SPOT[0], y: 0, z: A8_T1_SPOT[1] }, yaw: 0 },
    { id: 'A8-t2', label: 'Set 8 time lock two', pos: { x: A8_T2_SPOT[0], y: 0, z: A8_T2_SPOT[1] }, yaw: -Math.PI / 2 },
    { id: 'A8-vault', label: 'Set 8 vault', pos: { x: 148, y: 0, z: 62 }, yaw: Math.PI / 2 },
  );
  p.lightSpots.push(
    { name: 'A8 front', kind: 'body', x: 128, y: 0, z: 66.5, band: 'pool' },
    { name: 'A8 front cut', kind: 'body', x: 128, y: 0, z: 66.5, band: 'cut', off: [81] },
    { name: 'A8 grille approach', kind: 'body', x: A8_GRILLE_SPOT.x, y: 0, z: A8_GRILLE_SPOT.z, band: 'pool' },
    { name: 'A8 grille approach cut', kind: 'body', x: A8_GRILLE_SPOT.x, y: 0, z: A8_GRILLE_SPOT.z, band: 'cut', off: [81] },
    { name: 'A8 board', kind: 'body', x: A8_BOARD_WEST.x, y: 0, z: A8_BOARD_WEST.z, band: 'any' },
    { name: 'A8 board cut', kind: 'body', x: A8_BOARD_WEST.x, y: 0, z: A8_BOARD_WEST.z, band: 'cut', off: [81] },
    { name: 'A8 jam spot', kind: 'body', x: A8_JAM.x, y: 0, z: A8_JAM.z, band: 'pocket' },
    { name: 'A8 leg-up mark', kind: 'body', x: A8_LEGUP.x, y: 0, z: A8_LEGUP.z, band: 'pocket' },
    { name: 'A8 vestibule', kind: 'body', x: 107.6, y: 0, z: 64.5, band: 'pocket' },
    { name: 'A8 gallery east', kind: 'body', x: 130, y: A8_H.gallery, z: 76.4, band: 'read' },
    { name: 'A8 gallery east cut', kind: 'body', x: 130, y: A8_H.gallery, z: 76.4, band: 'cut', off: [82] },
    { name: 'A8 gallery west', kind: 'body', x: 112, y: A8_H.gallery, z: 76.4, band: 'pocket' },
    { name: 'A8 office', kind: 'body', x: 139, y: A8_H.gallery, z: 74.7, band: 'read' },
    { name: 'A8 office cut', kind: 'body', x: 139, y: A8_H.gallery, z: 74.7, band: 'cut', off: [83] },
    { name: 'A8 T1', kind: 'body', x: A8_T1_SPOT[0], y: 0, z: A8_T1_SPOT[1], band: 'read' },
    { name: 'A8 T2', kind: 'body', x: A8_T2_SPOT[0], y: 0, z: A8_T2_SPOT[1], band: 'read' },
    { name: 'A8 hall floor', kind: 'surf', x: 124, y: 0.05, z: 69, band: 'any' },
    { name: 'A8 hall standby', kind: 'body', x: 124, y: 0, z: 69, band: 'standby' },
  );
  p.shotVantages.push(
    { name: 'a8-vestibule', feet: [107.4, 0, 64.5], cam: [106.8, 1.7, 64.0], target: [126, 1.4, 66] },
    { name: 'a8-pier', feet: [A8_PIER.x, A8_H.gallery, A8_PIER.z], cam: [123.6, 6.0, 76.2], target: [134, 6.0, 76.6] },
    { name: 'a8-outer', feet: [137.0, 0, 64], cam: [135.0, 1.7, 63.5], target: [146, 1.3, 62] },
  );

  // ---- dressing (slice 8 step 5; SPEC 6, PROPS.md 3 / 5, KIT.md): appended after the greybox, which it does not touch ----
  /** A visual-only skin [x0, x1] x [y0, y1] x [z0, z1]: no collision, `noLedge`, one side under `THIN` (out of the light shapes). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): void => {
    if (Math.min(x1 - x0, y1 - y0, z1 - z0) >= THIN) throw new Error(`a8Strongroom: the dressing skin at (${x0}, ${y0}, ${z0}) is not thin`);
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, false);
    b.mark(from, { noLedge: true });
  };
  /** A skin on the face of an axis-aligned block: `side` is the face's outward direction ('s' -z, 'n' +z, 'w' -x, 'e' +x), `at` the face's plane (z for n / s,
   *  x for e / w), [a0, a1] the run along it (x for n / s, z for e / w), `layer` how many skins out (each `SKIN` thick). */
  const face = (side: Side, at: number, a0: number, a1: number, y0: number, y1: number, color: string, layer = 0): void => {
    const o0 = layer * SKIN;
    const o1 = (layer + 1) * SKIN;
    if (side === 'n') skin(a0, a1, y0, y1, at + o0, at + o1, color);
    else if (side === 's') skin(a0, a1, y0, y1, at - o1, at - o0, color);
    else if (side === 'e') skin(at + o0, at + o1, y0, y1, a0, a1, color);
    else skin(at - o1, at - o0, y0, y1, a0, a1, color);
  };
  /** `face` minus holes: each hole [a0, a1, y0, y1] is left bare (a device, a camera, a lamp's plate, a door). */
  const faceH = (side: Side, at: number, a: number, e: number, y0: number, y1: number, color: string, layer = 0, holes: readonly Hole[] = []): void => {
    const cuts = [a, e];
    for (const h of holes) if (h[1] > a && h[0] < e) cuts.push(Math.max(a, h[0]), Math.min(e, h[1]));
    cuts.sort((p, q) => p - q);
    for (let i = 0; i + 1 < cuts.length; i++) {
      const s0 = cuts[i]!;
      const s1 = cuts[i + 1]!;
      if (s1 - s0 < 1e-6) continue;
      const mid = (s0 + s1) / 2;
      let spans: [number, number][] = [[y0, y1]];
      for (const h of holes) {
        if (!(h[0] < mid && h[1] > mid)) continue;
        const next: [number, number][] = [];
        for (const [p, q] of spans) {
          if (h[3] <= p || h[2] >= q) next.push([p, q]);
          else {
            if (h[2] > p) next.push([p, h[2]]);
            if (h[3] < q) next.push([h[3], q]);
          }
        }
        spans = next;
      }
      for (const [p, q] of spans) if (q - p > 1e-6) face(side, at, s0, s1, p, q, color, layer);
    }
  };
  /** Floor paint (a few mm proud, no collision). */
  const paint = (x0: number, x1: number, z0: number, z1: number, color: string, top = 0.008, y = 0): void => skin(x0, x1, y, y + top, z0, z1, color);
  /** A thin box pitched like a flight (`b.ramp`'s pitch): `across` wide, `thick` high, `len` long along `yaw`, centred at (cx, cy, cz). Visual, `noLedge`. */
  const slope = (cx: number, cy: number, cz: number, across: number, thick: number, len: number, yaw: number, pitch: number, color: string): void => {
    if (Math.min(across, thick) >= THIN) throw new Error(`a8Strongroom: the pitched skin at (${cx}, ${cy}, ${cz}) is not thin`);
    const from = b.boxes.length;
    b.box(cx, cy, cz, across, thick, len, color, yaw, pitch, false);
    b.mark(from, { noLedge: true });
  };
  /** The runs of [a, e] between the pilasters (centres `pil`, 0.36 wide plus 2 cm): where the panelling's stiles go. */
  const bays = (a: number, e: number, pil: readonly number[]): [number, number][] => {
    const out: [number, number][] = [];
    let s = a;
    for (const c of pil) {
      if (c + 0.2 <= a || c - 0.2 >= e) continue;
      if (c - 0.2 > s) out.push([s, c - 0.2]);
      s = Math.max(s, c + 0.2);
    }
    if (e > s) out.push([s, e]);
    return out;
  };
  /** A panelled wall: oak dado from `y0` to `dadoTop` (stiles between the pilasters, a rail top and bottom, a chair rail, a stone skirting), plaster above to `ceil`
   *  with a picture rail; `gaps` (doors) leave the run, `holes` stay bare. */
  const panelled = (side: Side, at: number, lo: number, hi: number, y0: number, dadoTop: number, ceil: number, pil: readonly number[], gaps: readonly (readonly [number, number])[] = [], holes: readonly Hole[] = [], pal: readonly [string, string] = [LOOK.oak, LOOK.plaster]): void => {
    for (const [a, e] of wallRuns(lo, hi, gaps)) {
      faceH(side, at, a, e, y0, dadoTop, pal[0], 0, holes);
      if (ceil > dadoTop) faceH(side, at, a, e, dadoTop, ceil, pal[1], 0, holes);
      faceH(side, at, a, e, y0, y0 + 0.2, LOOK.stoneDark, 1, holes);
      faceH(side, at, a, e, y0 + 0.24, y0 + 0.3, LOOK.oakDark, 1, holes);
      faceH(side, at, a, e, dadoTop - 0.3, dadoTop - 0.24, LOOK.oakDark, 1, holes);
      faceH(side, at, a, e, dadoTop - 0.04, dadoTop + 0.04, LOOK.oakDark, 1, holes);
      if (ceil - dadoTop > 1.5) faceH(side, at, a, e, ceil - 0.75, ceil - 0.7, LOOK.oakDark, 1, holes);
      for (const [s0, s1] of bays(a, e, pil)) {
        const n = Math.max(1, Math.round((s1 - s0) / 1.8));
        for (let k = 0; k <= n; k++) {
          const c = s0 + ((s1 - s0) * k) / n;
          faceH(side, at, Math.max(a, c - 0.035), Math.min(e, c + 0.035), y0 + 0.3, dadoTop - 0.3, LOOK.oakDark, 1, holes);
        }
      }
    }
  };
  /** A plain painted wall (office, stairwell, lobby): a dark dado to `dadoTop`, paint above to `ceil`, a black skirting and a steel dado rail (`pal`: dado and upper colours). */
  const plainWall = (side: Side, at: number, lo: number, hi: number, y0: number, dadoTop: number, ceil: number, pal: readonly [string, string], gaps: readonly (readonly [number, number])[] = [], holes: readonly Hole[] = []): void => {
    for (const [a, e] of wallRuns(lo, hi, gaps)) {
      faceH(side, at, a, e, y0, dadoTop, pal[0], 0, holes);
      if (ceil > dadoTop) faceH(side, at, a, e, dadoTop, ceil, pal[1], 0, holes);
      faceH(side, at, a, e, y0, y0 + 0.12, LOOK.black, 1, holes);
      faceH(side, at, a, e, dadoTop - 0.03, dadoTop + 0.03, LOOK.steel, 1, holes);
    }
  };
  /** A stone pilaster (0.36 m) on a wall face from `y0` to `y1`: base and capital blocks, a shaft (up to 12 cm out: over the finish's layers 0-1). */
  const pilaster = (side: Side, at: number, c: number, y0: number, y1: number): void => {
    for (const layer of [2, 3]) {
      face(side, at, c - 0.25, c + 0.25, y0, y0 + 0.3, LOOK.stoneDark, layer);
      face(side, at, c - 0.25, c + 0.25, y1 - 0.3, y1, LOOK.stone, layer);
    }
    face(side, at, c - 0.17, c + 0.17, y0 + 0.3, y1 - 0.3, LOOK.stoneDark, 2);
    face(side, at, c - 0.18, c + 0.18, y0 + 0.3, y1 - 0.3, LOOK.stone, 3);
  };
  /** A stepped plaster and stone cornice along a wall face under the ceiling (8.62 to 9.0). */
  const cornice = (side: Side, at: number, a: number, e: number): void => {
    face(side, at, a, e, A8_CORNICE, A8_H.hall, LOOK.plasterShade, 1);
    face(side, at, a, e, 8.78, A8_H.hall, LOOK.stone, 2);
    face(side, at, a, e, 8.9, A8_H.hall, LOOK.stone, 3);
  };
  /** A tall window: dark glass with a mullion and a transom in a stone surround (jambs, sill, head, keystone), 15 cm out at most. */
  const win = (side: Side, at: number, c: number, y0: number, y1: number, w = 1.8): void => {
    // (layers 2-4: the glass stands over the finish's picture rail, the surround and the sill over the glass; 15 cm out at most)
    face(side, at, c - w / 2, c + w / 2, y0, y1, LOOK.glass, 2);
    face(side, at, c - 0.02, c + 0.02, y0, y1, LOOK.glassBar, 3);
    const tr = y0 + (y1 - y0) * 0.62;
    face(side, at, c - w / 2, c + w / 2, tr, tr + 0.04, LOOK.glassBar, 3);
    for (const s of [-1, 1]) face(side, at, s < 0 ? c - w / 2 - 0.12 : c + w / 2, s < 0 ? c - w / 2 : c + w / 2 + 0.12, y0 - 0.08, y1 + 0.14, LOOK.stone, 3);
    face(side, at, c - w / 2 - 0.15, c + w / 2 + 0.15, y0 - 0.1, y0 - 0.02, LOOK.stone, 3);
    face(side, at, c - w / 2 - 0.2, c + w / 2 + 0.2, y0 - 0.14, y0 - 0.1, LOOK.stoneDark, 4);
    face(side, at, c - w / 2 - 0.12, c + w / 2 + 0.12, y1, y1 + 0.14, LOOK.stone, 3);
    face(side, at, c - 0.15, c + 0.15, y1, y1 + 0.32, LOOK.stoneDark, 4);
  };
  /** A door's architrave on one face: two jambs and a head (`w` wide) round the opening [a0, a1] from `y0` up to its height `h`. */
  const architrave = (side: Side, at: number, a0: number, a1: number, y0: number, h: number, layer = 1, w = 0.12, color: string = LOOK.stone): void => {
    face(side, at, a0 - w, a0, y0, y0 + h + w, color, layer);
    face(side, at, a1, a1 + w, y0, y0 + h + w, color, layer);
    face(side, at, a0, a1, y0 + h, y0 + h + w, color, layer);
  };

  // ---- A8-16: the hall's walls: oak panelling, plaster, stone pilasters, tall windows, a stepped cornice ----
  const WS = S.west;
  const WN = S.north;
  const WSo = S.south;
  tally(b, p.register, 'A8-16', "Hall wall finish (visual skins, no collision): oak panelled dado and plaster with a picture rail, stone pilasters (south x 108.5-131.5, north, east, west; 12 cm out), a stepped cornice under the 9.0 ceiling, five tall windows in stone surrounds on the south wall and four over the gallery on the north wall (dark glass), on the south, west, north and east faces (the vestibule and the strip under the gallery to 3.85 m, the deck level above 4.4, the L7 door, the glazed end bay, the board's place, the grille's opening, the office door and C2's mount left bare)", () => {
    // south wall (z 50.25): the whole hall width; C1's mount (120, 3.2) stays clear of the sill (3.4)
    panelled('n', WSo, WS, heW, 0, DADO_FLOOR, A8_CORNICE, A8_SOUTH_P);
    cornice('n', WSo, WS, heW);
    for (const c of A8_SOUTH_P) pilaster('n', WSo, c, 0, A8_CORNICE);
    for (const x of A8_WINDOW_S) win('n', WSo, x, A8_WINDOW_Y.south[0], A8_WINDOW_Y.south[1]);
    // west wall (x 106.25): the glazed end bay z 50.25-52 (finished to 4.4 only), the hall z 52.1-56, the vestibule and strip under the return (to 3.85), the deck level above 4.4
    panelled('e', WS, WSo, 52.05, 0, DADO_FLOOR, 4.4, []);
    panelled('e', WS, 52.1, 56.0, 0, DADO_FLOOR, A8_CORNICE, A8_WEST_P);
    cornice('e', WS, 52.1, 56.0);
    panelled('e', WS, 56.0, WN, 0, DADO_LOW, 3.85, A8_WEST_P, [[58.6, 63.0]]);
    faceH('e', WS, 56.0, WN, 3.85, 3.97, LOOK.plasterShade, 1);
    faceH('e', WS, 58.6, 63.0, 2.6, 3.85, LOOK.plaster, 0);
    panelled('e', WS, 56.2, WN, A8_H.gallery, A8_H.gallery + DADO_DECK, A8_CORNICE, A8_WEST_P);
    cornice('e', WS, 56.2, WN);
    for (const c of A8_WEST_P) {
      if (c < 56) pilaster('e', WS, c, 0, A8_CORNICE);
      else {
        pilaster('e', WS, c, 0, 3.85);
        pilaster('e', WS, c, A8_H.gallery, A8_CORNICE);
      }
    }
    // north wall (z 77.75): the strip under the gallery (the lighting board's place bare) and the deck level above 4.4 with its windows
    panelled('s', WN, WS, heW, 0, DADO_LOW, 3.85, A8_NORTH_P, [[A8_BOARD_FIT[0], A8_BOARD_FIT[1]]]);
    faceH('s', WN, WS, heW, 3.85, 3.97, LOOK.plasterShade, 1);
    const sconceHoles: Hole[] = [126.0, 129.5, 133.0].map((x) => [x - 0.14, x + 0.14, 6.42, 7.0] as const);
    panelled('s', WN, WS, heW, A8_H.gallery, A8_H.gallery + DADO_DECK, A8_CORNICE, A8_NORTH_P, [], sconceHoles);
    cornice('s', WN, WS, heW);
    for (const c of A8_NORTH_P) {
      pilaster('s', WN, c, 0, 3.85);
      pilaster('s', WN, c, A8_H.gallery, A8_CORNICE);
    }
    for (const x of A8_WINDOW_N) win('s', WN, x, A8_WINDOW_Y.north[0], A8_WINDOW_Y.north[1]);
    // east wall, the hall face (x 133.85): the floor part to the cornice (the grille's opening bare to its 3.0 lintel, C2's mount bare), the strip under the gallery,
    // the deck level (the office door bare to 6.6)
    const c2: Hole = [72.6, 73.4, 6.9, 7.9];
    const bays: Hole[] = A8_BAYS.map((q) => [q.fill[0], q.fill[1], 0, 3.05]);
    // (J14) the re-plan's glazed screen in the office's west wall (z 71.4-76.0, 4.4-7.4) is left bare
    const glassHole: Hole[] = opts.replan ? [[71.4, officeDoor.z0, floorY, 7.4]] : [];
    panelled('w', heW, WSo, 75.0, 0, DADO_FLOOR, A8_CORNICE, A8_EAST_P, [[grille.z0, grille.z1]], [c2, ...bays, ...glassHole]);
    faceH('w', heW, grille.z0, grille.z1, grille.h, A8_CORNICE, LOOK.plaster, 0);
    cornice('w', heW, WSo, 75.0);
    for (const c of A8_EAST_P) pilaster('w', heW, c, 0, A8_CORNICE);
    panelled('w', heW, 75.0, WN, 0, DADO_LOW, 3.85, A8_EAST_P);
    faceH('w', heW, 75.0, WN, 3.85, 3.97, LOOK.plasterShade, 1);
    panelled('w', heW, 75.0, WN, A8_H.gallery, A8_H.gallery + DADO_DECK, A8_CORNICE, [], [[officeDoor.z0, officeDoor.z1]], glassHole);
    faceH('w', heW, officeDoor.z0, officeDoor.z1, A8_H.gallery + DOOR_H + 0.1, A8_CORNICE, LOOK.plaster, 0);
    cornice('w', heW, 75.0, WN);
  });

  // ---- A8-17: floors: the hall's marble (cream with a black chequer and a brass border), the oak boards' seams, the steel plate's seams, the office carpet, the striped marks ----
  tally(b, p.register, 'A8-17', "Floors (visual skins, no collision): the hall's cream marble with a 1.6 m black chequer inside a brass line (x 109.25-133.25, z 51.45-73.85), plank seams on the gallery's oak boards (every 0.3 m), a yellow edge band along the open loading edge, plate seams on the lobby and vault floors (1.2 m), carpet-tile seams in the office (1.2 m), and the two striped marks (SPEC P16): the leg-up mark and the cross-level jam spot (1 m squares)", () => {
    paint(WS, heW, WSo, WN, LOOK.marble, 0.006);
    const c0 = { x: 109.25, z: 51.45 };
    for (let i = 0; i < A8_CHECKER.nx; i++) {
      for (let j = 0; j < A8_CHECKER.nz; j++) {
        if ((i + j) % 2 !== 0) continue;
        const x = c0.x + A8_CHECKER.cell * i;
        const z = c0.z + A8_CHECKER.cell * j;
        paint(x, x + A8_CHECKER.cell, z, z + A8_CHECKER.cell, LOOK.marbleDark, 0.008);
      }
    }
    const cx1 = c0.x + A8_CHECKER.cell * A8_CHECKER.nx;
    const cz1 = c0.z + A8_CHECKER.cell * A8_CHECKER.nz;
    for (const [x0, x1, z0, z1] of [[c0.x - 0.05, cx1 + 0.05, c0.z - 0.05, c0.z], [c0.x - 0.05, cx1 + 0.05, cz1, cz1 + 0.05], [c0.x - 0.05, c0.x, c0.z - 0.05, cz1 + 0.05], [cx1, cx1 + 0.05, c0.z - 0.05, cz1 + 0.05]] as const) paint(x0, x1, z0, z1, LOOK.brass, 0.01);
    // the gallery's boards: plank seams along the runs, a hazard edge band on the open loading edge (x 108.7-109.0, z 66-70.5)
    for (let z = 75.3; z < 77.7; z += 0.3) skin(WS, heW, A8_H.gallery, A8_H.gallery + 0.006, z - 0.01, z + 0.01, LOOK.oakDark);
    for (let x = 106.55; x < 108.8; x += 0.3) skin(x - 0.01, x + 0.01, A8_H.gallery, A8_H.gallery + 0.006, 56.2, 75.0, LOOK.oakDark);
    skin(108.7, 109.0, A8_H.gallery, A8_H.gallery + 0.012, A8_OPEN_EDGE[0], A8_OPEN_EDGE[1], LOOK.yellow);
    for (let z = A8_OPEN_EDGE[0] + 0.2; z + 0.2 <= A8_OPEN_EDGE[1]; z += 0.4) skin(108.7, 109.0, A8_H.gallery + 0.012, A8_H.gallery + 0.016, z, z + 0.2, LOOK.black);
    // the lobby's and the vault's steel plate: seams every 1.2 m
    for (let x = 135.35; x < 145.85; x += 1.2) paint(x - 0.01, x + 0.01, 56.15, 67.85, LOOK.seam, 0.006);
    for (let z = 57.35; z < 67.85; z += 1.2) paint(134.15, 145.85, z - 0.01, z + 0.01, LOOK.seam, 0.006);
    for (let x = 147.35; x < 149.75; x += 1.2) paint(x - 0.01, x + 0.01, 58.15, 65.85, LOOK.seam, 0.006);
    for (const z of [60.55, 62.95]) paint(146.15, 149.75, z - 0.01, z + 0.01, LOOK.seam, 0.006);
    // the office's carpet tiles (0.6 m)
    for (let x = 135.35; x < 143.85; x += 1.2) skin(x - 0.01, x + 0.01, A8_H.gallery, A8_H.gallery + 0.006, 71.55, WN, LOOK.seam);
    for (let z = 72.75; z < WN; z += 1.2) skin(heE, 143.85, A8_H.gallery, A8_H.gallery + 0.006, z - 0.01, z + 0.01, LOOK.seam);
    // the striped marks: five 0.2 m strips across z, yellow and black
    for (const m of A8_MARKS) {
      for (let k = 0; k < 5; k++) paint(m.x - 0.5, m.x + 0.5, m.z - 0.5 + 0.2 * k, m.z - 0.3 + 0.2 * k, k % 2 === 0 ? LOOK.yellow : LOOK.black, 0.015);
    }
  });

  // ---- A8-18: the gallery: a stone coping and raised panels on the balustrade, a frieze and brass line on the slab's front, column bases and capitals, newels at the stair head, an LED line under the front, the drop chain ----
  tally(b, p.register, 'A8-18', "Gallery dressing (visual skins and kit accent slots, no collision): a stone coping on the 1.2 m balustrade (4 cm proud each side, none past the ends of the stair head's gap and the open loading edge) and raised panels (2 m pitch) on both its faces and its south end, a stone base moulding, the slab's front frieze (4.0-4.4, the stair head's opening and the open loading edge left bare) with a brass line, bases and capitals on the eight columns, newels with caps at the two ends of the stair head's gap, a warm accent line under the slab's front edge on circuit 82 (kit, no light), and the drop chain across the open loading edge (SPEC P13: eye plates on the two balustrade ends and 24 links in a swag 0.75-0.95 m over the deck, no collision)", () => {
    const top = A8_H.gallery + bal;
    const BAL: { hall: [Side, number]; deck: [Side, number]; a0: number; a1: number; o0: number; o1: number }[] = [
      { hall: ['s', 75.0], deck: ['n', 75.2], a0: 108.8, a1: 130.5, o0: 0.04, o1: 0 },
      { hall: ['s', 75.0], deck: ['n', 75.2], a0: 131.7, a1: n.x1, o0: 0, o1: 0 },
      { hall: ['e', 109.0], deck: ['w', 108.8], a0: 56.2, a1: A8_OPEN_EDGE[0], o0: 0.04, o1: 0 },
      { hall: ['e', 109.0], deck: ['w', 108.8], a0: A8_OPEN_EDGE[1], a1: 75.0, o0: 0, o1: 0.04 },
    ];
    for (const run of BAL) {
      if (opts.replan && run.a0 === 131.7) continue; // the re-plan's east piece starts at the widened stair head (`replan/a8Strongroom.ts`)
      const alongX = run.hall[0] === 's';
      // the coping over the whole thickness
      if (alongX) skin(run.a0 - run.o0, run.a1 + run.o1, top, top + SKIN, 74.96, 75.24, LOOK.stone);
      else skin(108.76, 109.04, top, top + SKIN, run.a0 - run.o0, run.a1 + run.o1, LOOK.stone);
      for (const [side, at] of [run.hall, run.deck]) {
        face(side, at, run.a0, run.a1, A8_H.gallery, A8_H.gallery + 0.16, LOOK.stoneDark, 1);
        const len = run.a1 - run.a0;
        const cnt = Math.max(1, Math.floor(len / 2.0));
        for (let k = 0; k < cnt; k++) {
          const c = run.a0 + ((k + 0.5) * len) / cnt;
          const w = Math.min(1.4, len / cnt - 0.4);
          face(side, at, c - w / 2, c + w / 2, 4.65, 5.35, LOOK.stoneDark, 1);
          face(side, at, c - w / 2 + 0.07, c + w / 2 - 0.07, 4.72, 5.28, LOOK.stone, 2);
        }
      }
    }
    // the south end of the return's balustrade (z 56.0-56.2, x 106.25-109.0)
    skin(WS, 109.04, top, top + SKIN, 55.96, 56.24, LOOK.stone);
    for (const [side, at] of [['s', 56.0], ['n', 56.2]] as const) {
      face(side, at, 106.4, 108.65, 4.65, 5.35, LOOK.stoneDark, 1);
      face(side, at, 106.47, 108.58, 4.72, 5.28, LOOK.stone, 2);
    }
    // the slab's front: a frieze with a brass line (not across the stair head or the open edge)
    for (const [a, e] of [[108.8, 130.5], [131.7, n.x1]] as const) {
      if (opts.replan && a === 131.7) continue;
      face('s', 75.0, a, e, 4.05, 4.35, LOOK.stoneDark, 1);
      face('s', 75.0, a, e, 4.18, 4.22, LOOK.brass, 2);
    }
    for (const [a, e] of [[56.2, A8_OPEN_EDGE[0] - 0.05], [A8_OPEN_EDGE[1] + 0.05, 75.0]] as const) {
      face('e', 109.0, a, e, 4.05, 4.35, LOOK.stoneDark, 1);
      face('e', 109.0, a, e, 4.18, 4.22, LOOK.brass, 2);
    }
    // columns: a base block, and a capital of two blocks, on all four faces
    const cols: [number, number][] = [...A8_COLUMNS_N.filter((x) => !opts.replan || x !== A8_REPLAN_COLUMN_OUT).map((x) => [x, 75] as [number, number]), ...A8_COLUMNS_W.map((z) => [109, z] as [number, number])];
    for (const [cx, cz] of cols) {
      face('s', cz - 0.2, cx - 0.2, cx + 0.2, 0, 0.35, LOOK.stoneDark, 1);
      face('n', cz + 0.2, cx - 0.2, cx + 0.2, 0, 0.35, LOOK.stoneDark, 1);
      face('w', cx - 0.2, cz - 0.2, cz + 0.2, 0, 0.35, LOOK.stoneDark, 1);
      face('e', cx + 0.2, cz - 0.2, cz + 0.2, 0, 0.35, LOOK.stoneDark, 1);
      for (const [side, at, a0, a1] of [['s', cz - 0.2, cx - 0.2, cx + 0.2], ['n', cz + 0.2, cx - 0.2, cx + 0.2], ['w', cx - 0.2, cz - 0.2, cz + 0.2], ['e', cx + 0.2, cz - 0.2, cz + 0.2]] as const) {
        face(side, at, a0, a1, 3.62, 4.0, LOOK.stone, 1);
        face(side, at, a0, a1, 3.82, 4.0, LOOK.stoneDark, 2);
      }
    }
    // newels on the two balustrade ends of the stair head's gap (the gallery switch stands at the east one's west face)
    for (const [x0, x1] of [[130.3, 130.5], [131.7, 131.9]] as const) {
      if (opts.replan && x0 === 131.7) continue;
      skin(x0, x0 + SKIN, top, top + 0.35, 75.0, 75.2, LOOK.stone);
      skin(x1 - SKIN, x1, top, top + 0.35, 75.0, 75.2, LOOK.stone);
      skin(x0, x1, top, top + 0.35, 75.0, 75.0 + SKIN, LOOK.stone);
      skin(x0, x1, top, top + 0.35, 75.2 - SKIN, 75.2, LOOK.stone);
      skin(x0 - 0.02, x1 + 0.02, top + 0.35, top + 0.35 + SKIN, 74.98, 75.22, LOOK.stoneDark);
    }
    // the drop chain (P13): eye plates on the two ends of the open span and 24 links in a swag
    face('n', A8_OPEN_EDGE[0], 108.8, 109.0, 5.25, 5.35, LOOK.brassDark, 0);
    face('s', A8_OPEN_EDGE[1], 108.8, 109.0, 5.25, 5.35, LOOK.brassDark, 0);
    const links = 24;
    const span = A8_OPEN_EDGE[1] - A8_OPEN_EDGE[0] - 0.1;
    for (let i = 0; i < links; i++) {
      const z = A8_OPEN_EDGE[0] + 0.05 + (span * (i + 0.5)) / links;
      const sag = 0.2 * (1 - ((z - (A8_OPEN_EDGE[0] + A8_OPEN_EDGE[1]) / 2) / ((A8_OPEN_EDGE[1] - A8_OPEN_EDGE[0]) / 2)) ** 2);
      const y = A8_H.gallery + 0.95 - sag;
      skin(108.88, 108.92, y, y + 0.04, z - 0.07, z + 0.07, LOOK.chain);
    }
    // the warm accent line under the slab's front edge (circuit 82: dark with the gallery lights)
    kit.ledSlot(119.65, A8_H.slab, 75.1, 21.7, 0, { tone: 'warm', light: false, group: G_GALLERY });
    kit.ledSlot(132.775, A8_H.slab, 75.1, 2.15, 0, { tone: 'warm', light: false, group: G_GALLERY });
    kit.ledSlot(108.9, A8_H.slab, 61.1, 9.8, Math.PI / 2, { tone: 'warm', light: false, group: G_GALLERY });
    kit.ledSlot(108.9, A8_H.slab, 72.75, 4.5, Math.PI / 2, { tone: 'warm', light: false, group: G_GALLERY });
  });

  // ---- A8-19: the public stair: stringers, balusters, a brass handrail and a mid rail on both sides, newels at the foot, and each open side's collision rail (invisible) ----
  const lineAt = (z: number): number => (A8_H.gallery * (z - ps.foot)) / st.len;
  const stairPitch = -Math.atan2(A8_H.gallery, st.len);
  const stairLen = hyp2(st.len, A8_H.gallery);
  if (!opts.replan) tally(b, p.register, 'A8-19', "Public stair rails (visual skins, and the open sides' 1.1 m collision rail: kit.handrail, invisible noLedge, thirteen stepped segments of 0.55 m a side 0.05 m outside the flight, from the fourth tread to the gallery where they meet the balustrade's ends; the foot stays open to step on; accent on the gallery strip 82): on both sides a post every 1.5 m with balusters every 0.4 m under a brass top rail 1.0 m over the nosing line and a mid rail at 0.5 m (pitched like the flight), a stringer board along the nosings, a cross-plate newel 1.1 m at each foot", () => {
    for (const x of [ps.x0 - 0.03, ps.x1 + 0.03]) {
      const mid = ps.foot + st.len / 2;
      slope(x, A8_H.gallery / 2 + A8_RAIL_LIFT.top, mid, 0.05, 0.04, stairLen, 0, stairPitch, LOOK.brass);
      slope(x, A8_H.gallery / 2 + A8_RAIL_LIFT.mid, mid, 0.03, 0.04, stairLen, 0, stairPitch, LOOK.steelDark);
      slope(x, A8_H.gallery / 2 - 0.1, mid, 0.03, 0.3, stairLen, 0, stairPitch, LOOK.oakDark);
      for (let z = ps.foot + 0.4; z < ps.foot + st.len - 0.1; z += 0.4) {
        const hgt = A8_RAIL_LIFT.top - 0.02;
        skin(x - 0.01, x + 0.01, lineAt(z) + 0.05, lineAt(z) + hgt, z - 0.01, z + 0.01, LOOK.steelDark);
      }
      for (let z = ps.foot + 0.4; z < ps.foot + st.len; z += 1.5) skin(x - 0.02, x + 0.02, lineAt(z), lineAt(z) + A8_RAIL_LIFT.top + 0.04, z - 0.02, z + 0.02, LOOK.brassDark);
      // the foot newel: two crossed plates and a cap
      skin(x - 0.05, x + 0.05, 0, 1.1, ps.foot - 0.115, ps.foot - 0.085, LOOK.oakDark);
      skin(x - 0.015, x + 0.015, 0, 1.1, ps.foot - 0.15, ps.foot - 0.05, LOOK.oakDark);
      skin(x - 0.06, x + 0.06, 1.1, 1.13, ps.foot - 0.16, ps.foot - 0.04, LOOK.brass);
    }
    // the open sides: the kit's balustrade and its collision box per segment, `h` over the walking line at the high end
    const { x: rx, from, to, seg, h } = A8_STAIR_RAIL;
    const n = Math.ceil((to - from) / seg - 1e-9);
    for (const x of rx) {
      for (let k = 0; k < n; k++) {
        const za = from + k * seg;
        const zb = Math.min(za + seg, to);
        kit.handrail(x, za, x, zb, { y: lineAt(za), h: h + (lineAt(zb) - lineAt(za)), group: G_GALLERY });
      }
    }
  });

  // ---- A8-20: the oak counters and the night desk: back panels and end caps over the greybox boxes (the props kit stands over them, A8-31), brass lamp stems ----
  const cm = A8_COUNTER_MAIN;
  const cr = A8_COUNTER_RETURN;
  const ds = A8_DESK;
  tally(b, p.register, 'A8-20', "Counters and night desk dressing (visual skins, no collision): oak back panels with rails and stiles on the clerks' side of the main run (north face z 66.24) and the return (east face x 126.0), end caps on the main run's west end and the return's south end, a back panel and two end caps on the night desk, brass stems and base plates under the three counter lamps and the desk lamp (the counter lamps' light points sit 0.4 m over the counter tops in the greybox, the bulb inside a banker's-lamp shade; the stems carry them)", () => {
    face('n', cm.z1, cm.x0, cm.x1 + SKIN, 0, 1.19, LOOK.oak, 0);
    face('e', cr.x1, cr.z0, cm.z1 + SKIN, 0, 1.19, LOOK.oak, 0);
    for (let x = cm.x0; x <= cm.x1 + 1e-9; x += 2.4) face('n', cm.z1, x - 0.035, x + 0.035, 0.16, 1.1, LOOK.oakDark, 1);
    face('n', cm.z1, cm.x0, cm.x1, 0.1, 0.16, LOOK.oakDark, 1);
    face('n', cm.z1, cm.x0, cm.x1, 1.1, 1.16, LOOK.oakDark, 1);
    for (let z = cr.z0; z <= cr.z1 + 1e-9; z += 2.4) face('e', cr.x1, z - 0.035, z + 0.035, 0.16, 1.1, LOOK.oakDark, 1);
    face('e', cr.x1, cr.z0, cr.z1, 0.1, 0.16, LOOK.oakDark, 1);
    face('e', cr.x1, cr.z0, cr.z1, 1.1, 1.16, LOOK.oakDark, 1);
    face('w', cm.x0, cm.z0 - 0.02, cm.z1 + SKIN, 0, 1.2, LOOK.oak, 0);
    face('s', cr.z0, cr.x0 - 0.03, cr.x1 + SKIN, 0, 1.2, LOOK.oak, 0);
    // the lamps' brass stems (a base plate and a stem from the marble top at 1.21 to the fixture's foot at the light point)
    for (const [x, z] of [[121.0, 65.9], [124.8, 65.9], [125.6, 61.5]] as const) {
      skin(x - 0.07, x + 0.07, 1.21, 1.23, z - 0.07, z + 0.07, LOOK.brassDark);
      skin(x - 0.02, x + 0.02, 1.23, LAMP.counter.y, z - 0.02, z + 0.02, LOOK.brass);
    }
    // the night desk (over its box 127.3-129.7 x 70.0-70.9; the prop is 5 cm north): back panel, end caps, the desk lamp's stem at (128.5, 70.4)
    face('s', ds.z0, ds.x0, ds.x1, 0, ds.h, LOOK.oak, 0);
    face('w', ds.x0, ds.z0, ds.z1 + 0.05, 0, ds.h + 0.02, LOOK.oak, 0);
    face('e', ds.x1, ds.z0, ds.z1 + 0.05, 0, ds.h + 0.02, LOOK.oak, 0);
    skin(128.45, 128.55, 0.76, 0.78, 70.35, 70.45, LOOK.brassDark);
    skin(128.48, 128.52, 0.78, 1.0, 70.38, 70.42, LOOK.brass);
  });

  // ---- A8-21: the east wall's grille bay: a stone surround, a keystone and a cornice shelf over the sign, two brass bar panels either side, a brass threshold, the lobby's steel surround ----
  tally(b, p.register, 'A8-21', "Grille wall dressing (visual skins, no collision; the gate's own leaf stays the door system's, plain: a prop cannot follow a door but the vault's, requested): on the hall face a stone surround 0.3 m round the opening z 61.1-62.9 (stepped: jambs to 3.3, a head 3.0-3.3), a keystone, a cornice shelf (y 4.05-4.2) over the sign plate, two brass bar panels (z 59.6-60.8 and 63.2-64.4, y 0.1-3.05: a frame, three rails and eleven bars each, over a black backing) with the dado's stiles left out, a brass threshold in the opening; on the lobby face a steel surround 0.25 m round the opening with a hazard strip on its head", () => {
    architrave('w', heW, grille.z0, grille.z1, 0, grille.h, 1, 0.3);
    architrave('w', heW, grille.z0, grille.z1, 0, grille.h, 2, 0.18, LOOK.stoneDark);
    face('w', heW, 61.75, 62.25, grille.h, 3.45, LOOK.stoneDark, 3);
    face('w', heW, 60.2, 63.8, 4.05, 4.12, LOOK.stone, 2);
    face('w', heW, 60.3, 63.7, 4.12, 4.2, LOOK.stoneDark, 3);
    paint(heW, heE, grille.z0, grille.z1, LOOK.brass, 0.012);
    for (const { bars: [a, e], fill } of A8_BAYS) {
      face('w', heW, fill[0], fill[1], 0, 3.05, LOOK.black, 0);
      face('w', heW, a, a + 0.08, 0.1, 3.05, LOOK.brass, 1);
      face('w', heW, e - 0.08, e, 0.1, 3.05, LOOK.brass, 1);
      for (const [y0, y1] of [[0.1, 0.17], [1.45, 1.5], [2.95, 3.05]] as const) face('w', heW, a + 0.08, e - 0.08, y0, y1, LOOK.brass, 1);
      const nb = Math.round((e - a - 0.16) / 0.1);
      for (let k = 1; k < nb; k++) face('w', heW, a + 0.08 + (k * (e - a - 0.16)) / nb - 0.0125, a + 0.08 + (k * (e - a - 0.16)) / nb + 0.0125, 0.17, 2.95, LOOK.brass, 2);
    }
    // the lobby face: a steel surround (jambs and head), the head striped yellow and black
    architrave('e', heE, grille.z0, grille.z1, 0, grille.h, 1, 0.25, LOOK.plate);
    architrave('e', heE, grille.z0, grille.z1, 0, grille.h, 2, 0.1, LOOK.steelDark);
    for (let z = grille.z0; z + 0.15 <= grille.z1; z += 0.3) face('e', heE, z, z + 0.15, grille.h + 0.12, grille.h + 0.2, LOOK.yellow, 2);
  });

  // ---- A8-22: the lighting board and the strip under the gallery: the cabinet on the north wall, its dado, the soffit's beams ----
  tally(b, p.register, 'A8-22', "Lighting board and the strip under the gallery (visual skins, no collision): the board's cabinet on the north wall (1.2 x 1.8 m, steel, two doors with a seam, hinges, six vent slats a door, a yellow plate with the red rotary knob at the device (127, 0.9), 3 cm behind it, three indicator squares, a label plate with a black bar, a hazard square, a conduit to the soffit) with the dado and plaster either side, and cross beams under the gallery's soffit over the strip and the vestibule (the device and the hide spot untouched)", () => {
    const [f0, f1] = A8_BOARD_FIT;
    const bx0 = 126.4;
    const bx1 = 127.6;
    face('s', WN, f0, bx0, 0, DADO_LOW, LOOK.oak, 0);
    face('s', WN, bx1, f1, 0, DADO_LOW, LOOK.oak, 0);
    face('s', WN, f0, bx0, DADO_LOW, 3.85, LOOK.plaster, 0);
    face('s', WN, bx1, f1, DADO_LOW, 3.85, LOOK.plaster, 0);
    face('s', WN, bx0, bx1, 1.85, 3.85, LOOK.plaster, 0);
    face('s', WN, f0, bx0, 0, 0.2, LOOK.stoneDark, 1);
    face('s', WN, bx1, f1, 0, 0.2, LOOK.stoneDark, 1);
    face('s', WN, bx0, bx1, 0, 0.05, LOOK.stoneDark, 1);
    // the cabinet (layers 0-3, 12 cm deep: the device at z 77.6 is 3 cm in front of the deepest): the body, the two door faces (layer 1), then hinges, vents, the
    // yellow plate, indicators, the label and the hazard square (layer 2), the red rotary knob and the label's bar (layer 3)
    face('s', WN, bx0, bx1, 0.05, 1.85, LOOK.steel, 0);
    for (const [a, e] of [[bx0 + 0.04, 126.985], [127.015, bx1 - 0.04]] as const) face('s', WN, a, e, 0.1, 1.8, LOOK.paint, 1);
    for (const y of [0.3, 1.1, 1.6]) for (const x of [bx0 + 0.05, bx1 - 0.09]) face('s', WN, x, x + 0.04, y, y + 0.12, LOOK.black, 2);
    for (const x0 of [126.5, 127.1]) for (let k = 0; k < 6; k++) face('s', WN, x0, x0 + 0.4, 0.2 + 0.07 * k, 0.23 + 0.07 * k, LOOK.black, 2);
    face('s', WN, 126.87, 127.13, 0.72, 1.08, LOOK.yellow, 2);
    face('s', WN, 126.94, 127.06, 0.84, 0.96, LOOK.red, 3);
    for (const [x, c] of [[126.55, LOOK.green], [126.69, LOOK.amber], [126.83, LOOK.red]] as const) face('s', WN, x, x + 0.08, 1.4, 1.48, c, 2);
    face('s', WN, 126.55, 127.45, 1.56, 1.74, LOOK.white, 2);
    face('s', WN, 126.6, 127.2, 1.62, 1.68, LOOK.black, 3);
    face('s', WN, 127.28, 127.48, 1.12, 1.32, LOOK.yellow, 2);
    face('s', WN, 127.36, 127.4, 1.15, 1.29, LOOK.black, 3);
    face('s', WN, 127.43, 127.47, 1.85, 3.85, LOOK.steel, 1);
    // the soffit's cross beams over the strip (x every 2.75 m) and the vestibule's (z every 2.75 m)
    for (let x = 108.0; x < heW; x += 2.75) skin(x - 0.1, x + 0.1, A8_H.slab - 0.04, A8_H.slab, A8_NORTH.z0, WN, LOOK.oakDark);
    skin(WS, heW, A8_H.slab - 0.04, A8_H.slab, 76.35, 76.55, LOOK.oakDark);
    for (let z = 58.0; z < A8_RETURN.z1; z += 2.75) skin(WS, A8_RETURN.x1, A8_H.slab - 0.04, A8_H.slab, z - 0.1, z + 0.1, LOOK.oakDark);
  });

  // ---- A8-23: the security office: panelling, a ceiling grid, hung panels, the console wall of screens, a notice board and a clock ----
  const officePal: readonly [string, string] = ['#2f353a', LOOK.paint];
  tally(b, p.register, 'A8-23', "Security office dressing (visual skins, no collision): painted walls on a dark dado with a dado rail and a black skirting on the west (the door's architrave), south (the stair-top door's), east and north faces, a cove at 7.25, a 1.2 m ceiling grid on the 7.4 roof and four hangers for each of the two panels (7.2), the east wall's screens round the console (eleven screens in bezels, the device's place bare), the console desk's worktop, front and end panels and a keyboard, a notice board with notes and a clock on the north wall (the medkit's place bare), the gallery switch's back plate by the door", () => {
    const top = 7.25;
    const dado = A8_H.gallery + 1.2;
    // west wall (x 134.15): the door z 76.0-77.2 with its architrave; the office switch's plate at z 75.6
    // (J14) the re-plan: the glazed screen (z 71.4-76.0) leaves the finish out, the office switch's plate moves to the jamb strip north of the door (z 77.5)
    plainWall('e', heE, 71.55, WN, A8_H.gallery, dado, top, officePal, [[opts.replan ? 71.4 : officeDoor.z0 - 0.1, officeDoor.z1 + 0.1]], [opts.replan ? [77.35, 77.65, 5.45, 5.75] : [75.45, 75.75, 5.45, 5.75]]);
    faceH('e', heE, officeDoor.z0 - 0.1, officeDoor.z1 + 0.1, A8_H.gallery + DOOR_H + 0.1, top, officePal[1], 0);
    architrave('e', heE, officeDoor.z0, officeDoor.z1, A8_H.gallery, DOOR_H, 1, 0.1, LOOK.steelDark);
    if (opts.replan) face('e', heE, 77.4, 77.6, 5.5, 5.7, LOOK.steel, 0);
    else face('e', heE, 75.5, 75.7, 5.5, 5.7, LOOK.steel, 0);
    // south wall (z 71.55): the stair-top door x 142.6-143.8
    plainWall('n', 71.55, heE, 143.85, A8_H.gallery, dado, top, officePal, [[topDoor.x0 - 0.1, topDoor.x1 + 0.1]]);
    faceH('n', 71.55, topDoor.x0 - 0.1, topDoor.x1 + 0.1, A8_H.gallery + DOOR_H + 0.1, top, officePal[1], 0);
    architrave('n', 71.55, topDoor.x0, topDoor.x1, A8_H.gallery, DOOR_H, 1, 0.1, LOOK.steelDark);
    // east wall (x 143.85): the console's place bare (z 74.2-75.2 over the desk)
    plainWall('w', 143.85, 71.55, WN, A8_H.gallery, dado, top, officePal, [], [[72.1, 77.1, 5.2, 6.7]]);
    // north wall (z 77.75): the medkit's place bare
    plainWall('s', WN, heE, 143.85, A8_H.gallery, dado, top, officePal, [], [[137.85, 139.15, A8_H.gallery, 6.9], [134.95, 136.25, 5.45, 6.45], [140.8, 141.2, 6.25, 6.65]]);
    for (const [side, at, a, e] of [['e', heE, 71.55, WN], ['n', 71.55, heE, 143.85], ['w', 143.85, 71.55, WN], ['s', WN, heE, 143.85]] as const) face(side, at, a, e, top, A8_H.office, LOOK.plasterShade, 1);
    // the ceiling grid and the panels' hangers
    for (let x = 135.35; x < 143.8; x += 1.2) skin(x - 0.015, x + 0.015, A8_H.office - 0.03, A8_H.office, 71.55, WN, LOOK.seam);
    for (let z = 72.75; z < WN; z += 1.2) skin(heE, 143.85, A8_H.office - 0.03, A8_H.office, z - 0.015, z + 0.015, LOOK.seam);
    for (const x of [137.5, 141.5]) for (const dx of [-0.27, 0.27]) for (const dz of [-0.27, 0.27]) skin(x + dx - 0.01, x + dx + 0.01, 7.25, A8_H.office - 0.03, 74.7 + dz - 0.01, 74.7 + dz + 0.01, LOOK.steelDark);
    // the console wall: screens (a bezel, a dark screen, a green status line) in two columns either side of the console and three over it
    const screen = (z0: number, z1: number, y0: number, y1: number): void => {
      face('w', 143.85, z0, z1, y0, y1, LOOK.black, 0);
      face('w', 143.85, z0 + 0.03, z1 - 0.03, y0 + 0.03, y1 - 0.03, LOOK.screen, 1);
      face('w', 143.85, z0 + 0.06, z0 + 0.06 + (z1 - z0) * 0.4, y0 + 0.06, y0 + 0.08, LOOK.glow, 2);
    };
    for (const z of [72.2, 72.8, 75.8, 76.4]) for (const y of [5.4, 5.76]) screen(z, z + 0.55, y, y + 0.32);
    for (const z of [73.5, 74.15, 74.8]) screen(z, z + 0.6, 6.2, 6.55);
    // the console desk (x 143.3-143.85, z 73.7-75.7, 0.75 m): worktop, front, ends, keyboard and a mouse pad
    skin(143.3, 143.85, A8_H.gallery + 0.75, A8_H.gallery + 0.76, 73.7, 75.7, LOOK.black);
    face('w', 143.3, 73.7, 75.7, A8_H.gallery, A8_H.gallery + 0.75, LOOK.steelDark, 0);
    face('s', 73.7, 143.3, 143.85, A8_H.gallery, A8_H.gallery + 0.75, LOOK.steelDark, 0);
    face('n', 75.7, 143.3, 143.85, A8_H.gallery, A8_H.gallery + 0.75, LOOK.steelDark, 0);
    skin(143.38, 143.5, A8_H.gallery + 0.76, A8_H.gallery + 0.78, 74.4, 74.95, LOOK.steelDark);
    skin(143.4, 143.5, A8_H.gallery + 0.76, A8_H.gallery + 0.77, 75.05, 75.2, LOOK.glassBar);
    // a notice board (frame, cork, four notes) and a clock on the north wall
    face('s', WN, 134.95, 136.25, 5.45, 6.45, LOOK.steelDark, 0);
    face('s', WN, 135.0, 136.2, 5.5, 6.4, LOOK.oak, 1);
    for (const [x, y, c] of [[135.1, 5.6, LOOK.white], [135.5, 5.65, LOOK.yellow], [135.85, 5.6, LOOK.white], [135.3, 6.05, LOOK.cream]] as const) face('s', WN, x, x + 0.25, y, y + 0.3, c, 2);
    face('s', WN, 140.8, 141.2, 6.25, 6.65, LOOK.steelDark, 0);
    face('s', WN, 140.84, 141.16, 6.29, 6.61, LOOK.white, 1);
    face('s', WN, 140.995, 141.005, 6.45, 6.58, LOOK.black, 2);
    face('s', WN, 141.0, 141.1, 6.445, 6.455, LOOK.black, 2);
    // the sign over the stair-top door and the one over the office door (A8-31) hang on these faces
  });

  // ---- A8-24: the office stair and its stairwell: painted walls, handrails on both walls (pitched like the flight), brackets, the foot door's stairwell side ----
  const osLine = (x: number): number => (A8_H.gallery * (x - os.foot)) / stO.len;
  const osPitch = -Math.atan2(A8_H.gallery, stO.len);
  const wallP: readonly [string, string] = [LOOK.plate, LOOK.paint];
  tally(b, p.register, 'A8-24', "Office stair and stairwell dressing (visual skins, no collision: the walls stay walls): painted walls on a dark dado with a skirting and a rail round the stairwell (the flight's north wall z 71.25 with the push bar's and the stair-top door's places bare, the closed block's face z 70.0, the foot landing, the head landing), a brass handrail 0.9 m over the nosing line on both walls with a bracket every 1.3 m (pitched like the flight: z 71.18 along the whole flight and z 70.07 along the block, x 135.2-142.2), architraves on the foot door's stairwell side and the stair-top door's", () => {
    const hallTop = A8_H.stairwell;
    plainWall('s', 71.25, heE, 144.15, 0, 1.2, hallTop, wallP, [], [[topDoor.x0 - 0.1, topDoor.x1 + 0.1, A8_H.gallery, 6.6], [135.45, 136.15, 0.8, 1.4]]);
    architrave('s', 71.25, topDoor.x0, topDoor.x1, A8_H.gallery, DOOR_H, 1, 0.1, LOOK.steelDark);
    plainWall('n', os.z0, A8_STAIR_BLOCK_X0, 142.2, 0, 1.2, hallTop, wallP);
    plainWall('e', heE, 68.15, 71.25, 0, 1.2, hallTop, wallP);
    plainWall('n', 68.15, heE, A8_STAIR_BLOCK_X0, 0, 1.2, hallTop, wallP, [[foot.x0, foot.x1]]);
    architrave('n', 68.15, foot.x0, A8_STAIR_BLOCK_X0, 0, DOOR_H, 1, 0.1, LOOK.steelDark);
    plainWall('w', A8_STAIR_BLOCK_X0, 68.15, os.z0, 0, 1.2, hallTop, wallP);
    plainWall('e', 142.2, 68.15, os.z0, A8_H.gallery, A8_H.gallery + 1.2, hallTop, wallP);
    plainWall('n', 68.15, 142.2, 144.15, A8_H.gallery, A8_H.gallery + 1.2, hallTop, wallP);
    plainWall('w', 144.15, 68.15, 71.25, A8_H.gallery, A8_H.gallery + 1.2, hallTop, wallP);
    // the handrails: the north wall's along the whole flight, the block face's along x 135.2-142.2
    const flightLen = hyp2(stO.len, A8_H.gallery);
    const midX = os.foot + stO.len / 2;
    slope(midX, A8_H.gallery / 2 + A8_RAIL_LIFT.wall, 71.18, 0.04, 0.04, flightLen, Math.PI / 2, osPitch, LOOK.brass);
    const bx0 = A8_STAIR_BLOCK_X0;
    const bx1 = os.foot + stO.len;
    const blockMid = (bx0 + bx1) / 2;
    slope(blockMid, osLine(blockMid) + A8_RAIL_LIFT.wall, os.z0 + 0.07, 0.04, 0.04, hyp2(bx1 - bx0, osLine(bx1) - osLine(bx0)), Math.PI / 2, osPitch, LOOK.brass);
    for (let x = os.foot + 0.4; x < bx1 - 0.2; x += 1.3) {
      skin(x - 0.02, x + 0.02, osLine(x) + A8_RAIL_LIFT.wall - 0.1, osLine(x) + A8_RAIL_LIFT.wall - 0.02, 71.2, 71.22, LOOK.brassDark);
      if (x >= bx0) skin(x - 0.02, x + 0.02, osLine(x) + A8_RAIL_LIFT.wall - 0.1, osLine(x) + A8_RAIL_LIFT.wall - 0.02, os.z0 + 0.03, os.z0 + 0.05, LOOK.brassDark);
    }
  });

  // ---- A8-25: the vault lobby: steel plate walls with seams, the foot door's surround, the vault door's heavy surround, ceiling ribs and the panels' hangers, the beam line's floor lines ----
  const lobbyPal: readonly [string, string] = [LOOK.plate, LOOK.steel];
  const T1_HOLE: Hole = [A8_T1_AT.x - 0.35, A8_T1_AT.x + 0.35, 0.6, 2.5];
  const T2_HOLE: Hole = [A8_T2_AT.z - 0.4, A8_T2_AT.z + 0.4, 0.6, 2.5];
  const RTE_HOLE: Hole = [A8_RTE_AT.x - 0.3, A8_RTE_AT.x + 0.3, 0.8, 1.45];
  const PANEL_HOLE: Hole = [A8_PANEL.z - 0.5, A8_PANEL.z + 0.5, A8_PANEL.y - 0.4, A8_PANEL.y + 0.5];
  tally(b, p.register, 'A8-25', "Vault lobby dressing (visual skins, no collision): steel plate walls on a darker dado with a black skirting, a steel rail and vertical seams every 1.2 m on the four walls (T1's, the request-to-exit's, T2's and the beam panel's places bare, the foot door's, the grille's and the vault door's openings bare), an architrave on the foot door, a steel surround on the vault door (jambs 0.3 m, a head, bolts, and a brass maker's plate above it), ceiling ribs every 1.2 m on the 5.5 slab (not across the beam header) with four hangers for each lobby panel, two yellow floor lines either side of the beam line", () => {
    const top = A8_H.lobby;
    const seams = (side: Side, at: number, lo: number, hi: number, holes: readonly Hole[]): void => {
      for (let c = lo + 1.2; c < hi - 0.3; c += 1.2) faceH(side, at, c - 0.01, c + 0.01, 0.3, top - 0.1, LOOK.seam, 1, holes);
    };
    // north wall (z 67.85): the foot door and T1
    plainWall('s', 67.85, 134.15, 145.85, 0, 1.2, top, lobbyPal, [[foot.x0 - 0.1, foot.x1 + 0.1]], [T1_HOLE]);
    seams('s', 67.85, 134.15, 145.85, [T1_HOLE, [foot.x0 - 0.2, foot.x1 + 0.2, 0, top]]);
    faceH('s', 67.85, foot.x0 - 0.1, foot.x1 + 0.1, DOOR_H + 0.1, top, lobbyPal[1], 0);
    architrave('s', 67.85, foot.x0, foot.x1, 0, DOOR_H, 1, 0.1, LOOK.steelDark);
    // south wall (z 56.15): the request-to-exit's place bare
    plainWall('n', 56.15, 134.15, 145.85, 0, 1.2, top, lobbyPal, [], [RTE_HOLE]);
    seams('n', 56.15, 134.15, 145.85, [RTE_HOLE]);
    // west wall (x 134.15): the grille's opening (z 61.1-62.9) with a surround 0.25 m wide, bare 60.8-63.2 below it
    plainWall('e', heE, 56.15, 67.85, 0, 1.2, top, lobbyPal, [[grille.z0 - 0.3, grille.z1 + 0.3]]);
    seams('e', heE, 56.15, 67.85, [[grille.z0 - 0.4, grille.z1 + 0.4, 0, top]]);
    faceH('e', heE, grille.z0 - 0.3, grille.z1 + 0.3, grille.h + 0.25, top, lobbyPal[1], 0);
    // east wall (x 145.85): the vault door's opening (z 61.3-62.7) with its surround, T2 and the beam panel bare
    plainWall('w', 145.85, 56.15, 67.85, 0, 1.2, top, lobbyPal, [[vd.z0 - 0.3, vd.z1 + 0.3]], [T2_HOLE, PANEL_HOLE]);
    seams('w', 145.85, 56.15, 67.85, [T2_HOLE, PANEL_HOLE, [vd.z0 - 0.4, vd.z1 + 0.4, 0, top]]);
    faceH('w', 145.85, vd.z0 - 0.3, vd.z1 + 0.3, vd.h + 0.3, top, lobbyPal[1], 0);
    architrave('w', 145.85, vd.z0, vd.z1, 0, vd.h, 1, 0.3, LOOK.plate);
    architrave('w', 145.85, vd.z0, vd.z1, 0, vd.h, 2, 0.18, LOOK.steelDark);
    for (const zc of [vd.z0 - 0.15, vd.z1 + 0.15]) for (let y = 0.35; y < vd.h; y += 0.35) face('w', 145.85, zc - 0.04, zc + 0.04, y, y + 0.08, LOOK.black, 3);
    face('w', 145.85, 61.7, 62.3, vd.h + 0.35, vd.h + 0.5, LOOK.brass, 1);
    face('w', 145.85, 61.75, 62.25, vd.h + 0.4, vd.h + 0.45, LOOK.black, 2);
    // the ceiling's ribs (not across the header at x 140) and the panels' four hangers each
    for (let x = 135.35; x < 145.6; x += 1.2) if (Math.abs(x - 140) > 0.45) skin(x - 0.07, x + 0.07, top - 0.04, top, 56.15, 67.85, LOOK.steelDark);
    for (const x of [137.0, 143.0]) for (const dx of [-0.27, 0.27]) for (const dz of [-0.27, 0.27]) skin(x + dx - 0.01, x + dx + 0.01, 5.35, top - 0.04, 62.0 + dz - 0.01, 62.0 + dz + 0.01, LOOK.steelDark);
    // two yellow lines either side of the beam line (the beams are at x 140)
    for (const x of [139.6, 140.2]) paint(x, x + 0.2, 56.5, 67.5, LOOK.yellow, 0.01);
  });

  // ---- A8-26: the beam curtain: steel plates on the piers' broad faces, hazard bases and caps, the header's faces with a chevron band and a soffit plate ----
  tally(b, p.register, 'A8-26', "Beam curtain dressing (visual skins, no collision, the beams' own faces and heads bare): steel plates (0.1-4.7 m) on the broad faces of both piers (z 56.15-56.5 and 67.5-67.85) with a yellow hazard base and a dark cap, plates on the header's two faces (z 56.5-67.5, y 4.85-5.45) with a yellow band 4.8-4.95 and eighteen black chevrons a side, a soffit plate", () => {
    const hx = A8_GATEWAY.at.x;
    for (const [z0, z1] of [[56.15, 56.5], [67.5, 67.85]] as const) {
      for (const [side, at] of [['w', hx - 0.15], ['e', hx + 0.15]] as const) {
        face(side, at, z0, z1, 0.2, 4.7, LOOK.plate, 1);
        face(side, at, z0, z1, 0, 0.2, LOOK.yellow, 1);
        face(side, at, z0, z1, 0.1, 0.14, LOOK.black, 2);
        face(side, at, z0, z1, 4.7, 4.8, LOOK.steelDark, 2);
        face(side, at, (z0 + z1) / 2 - 0.01, (z0 + z1) / 2 + 0.01, 0.3, 4.6, LOOK.seam, 2);
      }
    }
    for (const [side, at] of [['w', hx - 0.15], ['e', hx + 0.15]] as const) {
      face(side, at, 56.5, 67.5, 4.85, 5.45, LOOK.plate, 1);
      face(side, at, 56.5, 67.5, 4.8, 4.95, LOOK.yellow, 2);
      for (let z = 56.65; z + 0.3 <= 67.5; z += 0.6) face(side, at, z, z + 0.3, 4.8, 4.95, LOOK.black, 3);
    }
    skin(hx - 0.15, hx + 0.15, 4.77, 4.8, 56.5, 67.5, LOOK.steelDark);
  });

  // ---- A8-27: the time locks: a case, a brass dial with hands and a keypad on the wall at each device; the status lamps' brackets; the request-to-exit's plate ----
  tally(b, p.register, 'A8-27', "Time lock dressing (visual skins, no collision, the ready lamps' column x +-0.1 above 1.75 m bare): at T1 (137.0, north wall) and T2 (east wall, z 59.6) a black case 0.6 x 1.05 m (0.65-1.7), a brass-bezelled white dial with hands and four ticks (y 1.0-1.4) and a keypad with six keys (0.72-0.92) kept inside the device's 9 cm; two brackets from the wall to each status lamp's fixture (0.4 m, at its two ends, clear of the lamp column); the request-to-exit's plate (green, with a white label) on the lobby's south wall", () => {
    const timeLock = (side: Side, at: number, c: number): void => {
      const dial: Hole = [c - 0.2, c + 0.2, 1.0, 1.4];
      const keys: Hole = [c - 0.14, c + 0.14, 0.72, 0.92];
      face(side, at, c - 0.3, c + 0.3, 0.65, 1.7, LOOK.black, 0);
      faceH(side, at, c - 0.27, c + 0.27, 0.68, 1.67, LOOK.steelDark, 1, [dial, keys]);
      face(side, at, c - 0.2, c + 0.2, 1.0, 1.4, LOOK.white, 1);
      face(side, at, c - 0.14, c + 0.14, 0.72, 0.92, LOOK.black, 1);
      face(side, at, c - 0.24, c + 0.24, 1.4, 1.44, LOOK.brass, 2);
      face(side, at, c - 0.24, c + 0.24, 0.96, 1.0, LOOK.brass, 2);
      face(side, at, c - 0.24, c - 0.2, 1.0, 1.4, LOOK.brass, 2);
      face(side, at, c + 0.2, c + 0.24, 1.0, 1.4, LOOK.brass, 2);
      face(side, at, c - 0.01, c + 0.01, 1.2, 1.36, LOOK.black, 2);
      face(side, at, c, c + 0.1, 1.19, 1.21, LOOK.black, 2);
      for (const [da, y] of [[0, 1.33], [0, 1.07], [0.15, 1.2], [-0.15, 1.2]] as const) face(side, at, c + da - 0.01, c + da + 0.01, y - 0.02, y + 0.02, LOOK.black, 2);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) face(side, at, c - 0.1 + 0.075 * i, c - 0.1 + 0.075 * i + 0.05, 0.75 + 0.08 * j, 0.75 + 0.08 * j + 0.05, LOOK.steel, 2);
    };
    timeLock('s', 67.85, A8_T1_AT.x);
    timeLock('w', 145.85, A8_T2_AT.z);
    // the status lamps' brackets: T1's lamp (137, 2.2, 67.35) 0.3 x 0.2, T2's (145.35, 2.2, 60.0) 0.2 x 0.3
    for (const x of [136.88, 137.12]) skin(x - 0.015, x + 0.015, 2.2, 2.23, 67.45, 67.85, LOOK.steelDark);
    for (const z of [59.9, 60.1]) skin(145.45, 145.85, 2.2, 2.23, z - 0.015, z + 0.015, LOOK.steelDark);
    // the request-to-exit's plate (the device on the south wall at x 136.3, y 1.1)
    face('n', 56.15, A8_RTE_AT.x - 0.2, A8_RTE_AT.x + 0.2, 0.9, 1.3, LOOK.green, 0);
    face('n', 56.15, A8_RTE_AT.x - 0.15, A8_RTE_AT.x + 0.15, 1.33, 1.41, LOOK.white, 0);
  });

  // ---- A8-28: the vault: plate walls with the door's inner surround, ceiling ribs, a brass line; the deposit walls are props (A8-31) ----
  tally(b, p.register, 'A8-28', "Vault dressing (visual skins, no collision; the deposit walls are props, A8-31): plate on the vault's west wall (x 146.15) on a darker dado with the door's inner surround (jambs 0.3 m, a head), three ribs under the 3.0 roof, end caps on the deposit walls' open ends (x 149.75, the cash dock side)", () => {
    const top = A8_H.vault;
    plainWall('e', 146.15, 58.15, 65.85, 0, 1.2, top, lobbyPal, [[vd.z0 - 0.3, vd.z1 + 0.3]]);
    faceH('e', 146.15, vd.z0 - 0.3, vd.z1 + 0.3, vd.h + 0.3, top, lobbyPal[1], 0);
    architrave('e', 146.15, vd.z0, vd.z1, 0, vd.h, 1, 0.3, LOOK.plate);
    architrave('e', 146.15, vd.z0, vd.z1, 0, vd.h, 2, 0.18, LOOK.steelDark);
    for (let x = 147.0; x < 149.7; x += 0.9) skin(x - 0.07, x + 0.07, top - 0.04, top, 58.15, 65.85, LOOK.steelDark);
    for (const [z0, z1] of [[58.15, 58.75], [65.25, 65.85]] as const) face('e', 149.75, z0, z1, 0, 2.4, LOOK.steelDark, 0);
  });

  // ---- A8-29: the lamps' fittings: chandeliers with rods to the ceiling, a rose, a ring and a finial; brass back plates behind the gallery's wall lights; the hall ceiling's coffer beams ----
  tally(b, p.register, 'A8-29', "Lamp fittings and the hall ceiling (visual skins, no collision, no lamp added: the greybox's 16 stay): each of the three chandeliers (y 7.5-7.9) hangs on four rods to a brass ceiling rose at 9.0, with a brass ring under it (7.45) and a finial; a brass plate and a trim behind each gallery wall light (x 126, 129.5, 133, the fixtures 7.5 cm out of the wall); stone coffer beams on the 9.0 ceiling every 3.0 m along z and 3.45 m along x (y 8.96-9.0)", () => {
    for (const [x, z] of [[130.0, 62.0], [124.0, 58.0], [128.0, 69.5]] as const) {
      for (const dx of [-0.35, 0.35]) for (const dz of [-0.35, 0.35]) skin(x + dx - 0.01, x + dx + 0.01, 7.9, A8_H.hall, z + dz - 0.01, z + dz + 0.01, LOOK.brassDark);
      skin(x - 0.2, x + 0.2, A8_H.hall - 0.03, A8_H.hall, z - 0.2, z + 0.2, LOOK.brass);
      skin(x - 0.45, x + 0.45, 7.45, 7.49, z - 0.45, z - 0.42, LOOK.brass);
      skin(x - 0.45, x + 0.45, 7.45, 7.49, z + 0.42, z + 0.45, LOOK.brass);
      skin(x - 0.45, x - 0.42, 7.45, 7.49, z - 0.42, z + 0.42, LOOK.brass);
      skin(x + 0.42, x + 0.45, 7.45, 7.49, z - 0.42, z + 0.42, LOOK.brass);
      skin(x - 0.02, x + 0.02, 7.25, 7.45, z - 0.02, z + 0.02, LOOK.brass);
    }
    for (const x of [126.0, 129.5, 133.0]) {
      face('s', WN, x - 0.14, x + 0.14, 6.42, 7.0, LOOK.brassDark, 0);
      face('s', WN, x - 0.08, x + 0.08, 6.5, 6.95, LOOK.brass, 1);
    }
    for (let z = 53.25; z < WN - 0.05; z += 3.0) skin(WS, heW, 8.96, A8_H.hall, z - 0.15, z + 0.15, LOOK.stone);
    for (let x = 109.7; x < heW - 0.05; x += 3.45) skin(x - 0.15, x + 0.15, 8.96, A8_H.hall, WSo, WN, LOOK.stone);
  });

  // ---- A8-30: the hall above the set (kit panels with coves, each on its circuit; no lamp) and the accent slots ----
  tally(b, p.register, 'A8-30', "Kit panels above the set (visual): the hall's charcoal panels and coves from the 9.2 slab top to the 10 m roof on the south and north walls and the west and east ends (hall part x 106.25-133.85 and the west end on 81, the office and the plant on 83 and 84, the lobby side and the east end on 84; 0.8 m high, no upper rows), accent slots (no light) under the gallery's front (82), on the office roof (83), the lobby's ceiling (84) and the vault's roof (84)", () => {
    const corner = 0.09;
    const rise = HALL_H - A8_CEIL_TOP;
    const panel = (x: number, z: number, len: number, yaw: number, group: number): void => void kit.wallPanel(x, z, len, yaw, { h: rise, y: A8_CEIL_TOP, tone: 'warm', group });
    // south wall (z 50.25, outward +z): the hall part on 81, the closed blocks over the lobby and the vault on 84
    panel((S.west + corner + heW) / 2, S.south, heW - S.west - corner, 0, G_HALL);
    panel((heE + S.east - corner) / 2, S.south, S.east - corner - heE, 0, G_LOBBY);
    // north wall (z 77.75, outward -z): the hall part on 81, the office on 83, the plant and the vault's flank on 84
    panel((S.west + corner + heW) / 2, S.north, heW - S.west - corner, Math.PI, G_HALL);
    panel((heE + 144.15) / 2, S.north, 144.15 - heE, Math.PI, G_OFFICE);
    panel((144.15 + S.east - corner) / 2, S.north, S.east - corner - 144.15, Math.PI, G_LOBBY);
    // the west end (x 106.25) on 81 and the east end (x 149.75) on 84
    panel(S.west, (S.south + corner + S.north - corner) / 2, S.north - S.south - 2 * corner, Math.PI / 2, G_HALL);
    panel(S.east, (S.south + corner + S.north - corner) / 2, S.north - S.south - 2 * corner, -Math.PI / 2, G_LOBBY);
    kit.ledSlot(139.0, A8_H.office, 72.6, 9.0, 0, { tone: 'cool', light: false, group: G_OFFICE });
    kit.ledSlot(139.0, A8_H.office, 76.8, 9.0, 0, { tone: 'cool', light: false, group: G_OFFICE });
    kit.ledSlot(140.0, A8_H.lobby, 58.0, 11.2, 0, { tone: 'cool', light: false, group: G_LOBBY });
    kit.ledSlot(140.0, A8_H.lobby, 66.0, 11.2, 0, { tone: 'cool', light: false, group: G_LOBBY });
    kit.ledSlot(147.95, A8_H.vault, 62.0, 3.4, 0, { tone: 'cool', light: false, group: G_LOBBY });
  });

  // ---- A8-31: the props kit (PROPS.md 3 A8): bank counters over the two counter boxes and the night desk over its box (no collision written: the boxes are the greybox's), deposit walls on the vault's two flanks (their own boxes), five sign plates ----
  const greyProps = new FacilityProps();
  const vaultProps = new FacilityProps();
  tally(b, p.register, 'A8-31', "Props kit: 8 bankCounter (five over the main run, three over the return; visual over the greybox boxes, no box written: 2 cm / 3 cm proud on the front, a skin back panel behind), 1 nightDesk over the night desk's box (5 cm north of it), 6 depositWall (three a flank on the vault's backs z 58.15 and 65.85: their own 6 solid noLedge boxes via FacilityProps.write, 0.56 m deep, the vault stays 6.6 m wide at the narrowest and the door's axis is clear) and 5 signPlate stand-ins (hung, none), each plate and the desk on the circuit that lights its wall (S3-7 S1, `group`: the grille 81, the vault door and the stair foot door 84, the stair-top door 83, the office door 82; the desk 81): over the grille (hall face), the vault door (lobby face), the stair foot door (lobby face), the stair-top door (office face) and the office door (hall face)", () => {
    for (const x of A8_COUNTER_MAIN_X) greyProps.add('bankCounter', x, A8_COUNTER_MAIN_Z, Math.PI, { y: A8_PROP_LIFT });
    for (const z of A8_COUNTER_RETURN_Z) greyProps.add('bankCounter', A8_COUNTER_RETURN_X, z, -Math.PI / 2, { y: A8_PROP_LIFT });
    greyProps.add('nightDesk', A8_DESK_PROP.x, A8_DESK_PROP.z, 0, { y: A8_PROP_LIFT, group: G_HALL });
    for (const [x, z, yaw, y, group] of A8_SIGNS) greyProps.add('signPlate', x, z, yaw, { y, group });
    for (const x of A8_DEPOSIT_X) {
      vaultProps.add('depositWall', x, A8_DEPOSIT_Z.south, 0);
      vaultProps.add('depositWall', x, A8_DEPOSIT_Z.north, Math.PI);
    }
    vaultProps.write(b);
  });
  p.props.push(...greyProps.placements, ...vaultProps.placements);

  return Object.assign(p, { levels: { ...A8_LEVELS } });
}
