// (campus-greybox, v2 lane S1) Copied from `campusS1Data.ts` at P0; the S1 lane's greybox. Built only when `flags.campusV2` names 1.
import type { SectorDef, SectorGuard } from '../../../game/sectors';
import type { SecurityDesk } from '../../../game/sectorDesks';
import type { SecurityData } from '../../../security/data';
import type { CampusAlarm, CampusSectionParts } from '../campusParts';
import { buildCampusS1, C1_BOX, S1_COOP_LIPS, S1_DOORS, S1_GROUPS, S1_HIDESPOTS, S1_NAV_SEEDS, S1_PICKUPS, S1_ROOMS, S1_SPAWNS, S1_SWITCHES, type S1Colour, type S1Column, type S1Lights } from './s1';
import { dressS1, HERO_S1, S1_ART_TAGS } from './s1Dress';

const PI = Math.PI;

// PROVISIONAL - light-realism retunes these (docs/light-realism/PLAN.md, AS/NZS 1158.3.1), except the car-park columns and
// the lane floodlight: light-realism L1 calibrated those (P11a, Michael "Approve but only s1"); L1 covers the car park only.
// TODO(light-realism): replace the other S1 lamps with calibrated values.
/** The warm sodium and the cool white of S1's fittings (linear RGB). */
export const SODIUM: S1Colour = [1, 0.72, 0.38];
export const WHITE: S1Colour = [1, 0.95, 0.88];
/** (light-realism L1) The car-park column rows' z on v2's rows (`ROW_Z` -75.75 / -71.25 / -60.75 / -56.25): the north row's
 *  remaining poles in R3, the aisle row 1 m inside the aisle's north edge, the south row on R0 / R1's back-to-back line. */
const PARK_ROW_N = -55;
const PARK_ROW_AISLE = -64;
const PARK_ROW_S = -73.5;
/** A row of twin-head columns: each pole x carries a head on a -x arm and one on a +x arm. */
const twinRow = (z: number, xs: readonly number[]): S1Column[] => xs.flatMap((x) => [[x, z, -1, 0] as const, [x, z, 1, 0] as const]);
/**
 * (campus-greybox S1 G1) Every S1 lamp in one block (lead note, Michael ~09:05 "Real-world levels"; job BRIEF A19): position,
 * height, radius, intensity, colour, cone and circuit. `buildCampusS1` draws every lamp, column pillar and lamp post from it
 * (`S1_PARTS.build`), so light-realism's calibration retunes this block only. Today's engine values (the as-built S1, B:214-314).
 */
export const S1_LIGHTS: S1Lights = {
  // the car-park columns on the feeder pillar's two circuits: (light-realism L1, ported from v1 `campusS1.ts`) twin-head arm
  // columns, 6.2 m poles, 0.6 m arms at y 6.10-6.20, each light point 0.8 m out at y 6.0, tuned to AS/NZS 1158.3.1 P11a
  // (`docs/light-realism/measure/S1-carpark.md`). L1's rows 2 m south with v2's (G3, D:77): the aisle row z -64, the south row
  // on the back-to-back line between R0 and R1 (z -73.5), poles on bay boundaries (x -36 + 2.8k) in the rows; L1's north row
  // at the carport (x -24.8, -13.6, 0.4) gone, the carport downlights replace it; its west pole kept at z -55 and its east
  // pole one bay east (x 3.2) off the carport's eave. Every west pole west of every east pole (one breaker each half).
  columnsW: [...twinRow(PARK_ROW_N, [-33.2]), ...twinRow(PARK_ROW_AISLE, [-33, -21]), ...twinRow(PARK_ROW_S, [-36, -24.8, -13.6])],
  columnsE: [...twinRow(PARK_ROW_N, [3.2]), ...twinRow(PARK_ROW_AISLE, [-9, 3]), ...twinRow(PARK_ROW_S, [-2.4, 6])],
  // the heads: radius 10 (the worst 2 m lamp-grid column stays within `LAMP_GRID_SLOTS`), the cone tipped 0.2 toward the arm,
  // outer 1.3 rad (tilt + outer at most 1.5: a full cut-off head)
  column: { pillarH: 6.2, pillarR: 0.15, armLen: 0.6, armY: 6.15, reach: 0.8, y: 6.0, r: 10, i: 2.0, colour: SODIUM, tilt: 0.2, outer: 1.3, w: 0.6, groupW: S1_GROUPS.parkW, groupE: S1_GROUPS.parkE },
  // the forecourt light bollards on the yard board's circuit
  bollards: { xs: [-28, -24, -20, -16, -12, -8, -4, 0], z: -45.5, postH: 0.9, postR: 0.08, y: 0.85, r: 4.5, i: 0.5, colour: SODIUM, group: S1_GROUPS.fore, w: 0.2 },
  // the entrance canopy downlights (A65: the east pair at x -18.5)
  canopy: { pts: [[-23, -38], [-18.5, -38], [-23, -35.6], [-18.5, -35.6]], y: 4.1, r: 4.5, i: 0.85, colour: WHITE, group: S1_GROUPS.canopy, cone: [0, -1, 0, 1.0], w: 0.5 },
  // the dock lamp over the plant room's goods door, on the yard board
  dock: { x: -33, y: 2.7, z: -40.4, r: 5, i: 0.8, colour: WHITE, group: S1_GROUPS.fore, cone: [0, -0.8, -0.6, 1.0], w: 0.4 },
  // the lane floodlight (photocell: no switch, shot only): (light-realism L1) its 6.2 m pole at x 9, the arm +x into the lane,
  // the light point at the arm's end 0.8 m out (x 9.8)
  laneFlood: { x: 9.8, y: 6.0, z: -66, r: 12, i: 0.5, colour: SODIUM, group: S1_GROUPS.lane, cone: [0, -1, 0, 1.15], w: 0.6, poleX: 9, poleH: 6.2, poleR: 0.15, armLen: 0.6, armY: 6.15 },
  // the gatehouse ceiling tube (switch by its door)
  gate: { x: 17, y: 2.9, z: -76, r: 5.5, i: 0.9, colour: WHITE, group: S1_GROUPS.gate, cone: null, w: 0.6 },
  // (G2, D:67) the warm desk lamp on the CCTV desk, on the gate circuit (colour and intensity A6)
  deskLamp: { x: 18.6, y: 1.2, z: -73.4, r: 2.5, i: 0.9, colour: SODIUM, group: S1_GROUPS.gate, cone: null, w: 0.2 },
  // (G3, A9) the carport's under-canopy downlights, mid-span between the posts (the canopy downlights' values), each cut with
  // its half of the car park: x -21 and -15 on park-W, x -9 and -3 on park-E
  carport: {
    pts: [[-21, -58.5, S1_GROUPS.parkW], [-15, -58.5, S1_GROUPS.parkW], [-9, -58.5, S1_GROUPS.parkE], [-3, -58.5, S1_GROUPS.parkE]],
    y: 2.5, r: 4.5, i: 0.85, colour: WHITE, cone: [0, -1, 0, 1.0], w: 0.5,
  },
  // (G3, A25) the bike shelter lamp (the smoke shelter's values), its own circuit
  bikes: { x: -7, y: 2.2, z: -52, r: 3, i: 0.5, colour: SODIUM, group: S1_GROUPS.bikes, cone: null, w: 0.2 },
  // (G5, D:133) the smoking shelter's warm lamp, its own circuit (colour and intensity A6)
  smoke: { x: 8, y: 2.2, z: -48.5, r: 3, i: 0.5, colour: SODIUM, group: S1_GROUPS.smoke, cone: null, w: 0.2 },
};
/** The lists `s1.ts` re-exports (the dress and the tests read them by these names). */
export const PARK_COLUMNS_W = S1_LIGHTS.columnsW;
export const PARK_COLUMNS_E = S1_LIGHTS.columnsE;
export const BOLLARD_XS = S1_LIGHTS.bollards.xs;
export const CANOPY_LAMPS = S1_LIGHTS.canopy.pts;

/*
 * Section 1 data (the gatehouse, car park and forecourt; `docs/sector-redesign/SPEC.md` "S1"), moved out of
 * `campusSectors.ts` by campus-greybox P0 so each section's data lives in its own file (`S1_PARTS`).
 *
 * Walk speeds (m/s) in the cycle arithmetic: a plain route walks at walkSpeed x 1.1 (grunt 0.99, officer 0.935, enforcer 0.88);
 * a timed `loop` at walkSpeed (grunt 0.9, officer 0.85). Each cycle is 25-45 s (`tests/campusS1.test.ts`).
 */

/** Section 1's guards (SPEC "S1" guard table; kinds and weapons as listed: officer = pistolSd, grunt = rifle). */
export const S1_GUARDS: SectorGuard[] = [
  // 1 (G2, D:239) the gate officer: works the barrier, waits for the 03:00 courier; posted at the reception window, facing west
  // onto the lane; his takedown spot 0.5 m behind him (A7)
  { kind: 'officer', x: 14.6, z: -76, yaw: -PI / 2, takedownSpot: [15.1, -76], role: 'gate', zone: 'gatehouse', squad: 0, reason: 'Works the barrier and waits for the 03:00 courier' },
  // 2 (G2, D:240) the CCTV officer, the desk operator: the monitors at his desk (28 s), the kettle (5 s, A8: the as-built stop),
  // a 41.7 s cycle; alone at the kettle (4.47 m from the desk, outside DESK_POST_RADIUS), facing the counter
  { kind: 'officer', x: 18.3, z: -73.6, yaw: 0, route: [[18.3, -73.6], [18.4, -77.65]], waits: [28, 5], faces: [0, PI], takedownSpot: [18.4, -77.65], role: 'cctv', zone: 'gatehouse', squad: 0, reason: 'Watches the cam-gate and cam-walk monitors; the kettle is on the other side of the room' },
  // 3-4 the car-park pair: a timed loop of the aisle (a 42 s master clock), side by side, facing each other at every stop
  {
    kind: 'grunt',
    x: -29,
    z: -68.2,
    yaw: 0,
    // (G3, D:94) the loop 2 m south with the rows
    route: [[-29, -68.2], [-21, -68.2], [-21, -65.8], [-29, -65.8]],
    faces: [0, 0, 0, 0],
    loop: { period: 42, leave: [4.5, 18, 25, 38], t0: 0 },
    takedownSpot: [-29, -68.2],
    role: 'patrol',
    zone: 'carpark',
    squad: 1,
    pair: 3,
    reason: 'Two cars were broken into last month: they try door handles along the rows',
  },
  {
    kind: 'officer',
    x: -29,
    z: -67.2,
    yaw: PI,
    // (G3, D:95-96) the north stops 1.8 m under the carport's south edge (the drop takedown)
    route: [[-29, -67.2], [-21, -67.2], [-21, -64.8], [-29, -64.8]],
    faces: [PI, PI, PI, PI],
    loop: { period: 42, leave: [4.5, 18, 25, 38], t0: 0 },
    takedownSpot: [-29, -67.2],
    role: 'patrol',
    zone: 'carpark',
    squad: 1,
    pair: 2,
    reason: 'Walks the rows with the grunt, as the break-in follow-up',
  },
  // 5 the doorman (K1, M12): posted under the canopy at the C1 badge door, facing south onto the walkway
  { kind: 'officer', x: -20, z: -35, yaw: PI, takedownSpot: [-20, -34.7], post: { leash: 5, guards: 'c1-door' }, role: 'posted', zone: 'c1', squad: 2, reason: 'Badge check at the only staff door' },
  // 6 the smoker: on his break in the smoking shelter, facing the car park
  { kind: 'grunt', x: 8, z: -48.5, yaw: PI, takedownSpot: [8, -47.6], role: 'smoker', zone: 'smoking', squad: 2, pair: 14, reason: 'On his break; he can see the car park from the shelter' },
  // 7 (G4, D:245) the fence patrol: the west palisade <-> the bin corner, 4 s stops, 44.4 s; dark at the bin corner; comes to
  // the feeder board if it is cut (his straight leg crosses the bin screen: his path goes round its open south side, R3)
  // (G6, M8) his takedown spot moved from the bin-corner stop (-38, -46), seen by the storeman #12 (0 s isolated), to the south stop's
  // north side (-38, -62.5, 1.5 m behind him, within CHECK_SPOT): 5.75 s unseen, tested on his own route
  { kind: 'grunt', x: -38, z: -64, yaw: 0, route: [[-38, -64], [-38, -46]], waits: [4, 4], faces: [PI, 0], takedownSpot: [-38, -62.5], role: 'patrol', zone: 'perimeter', squad: 3, reason: 'Fence-line check after the break-ins' },
  // 8 (G4, D:103, D:246) the delivery sentry: a sweep at the goods door, +-60 degrees, 12 s each way; his stops at z -42.1, clear
  // of the door's swing (H10)
  { kind: 'grunt', x: -34, z: -42.1, yaw: PI - 1.05, route: [[-34, -42.1], [-32, -42.1]], waits: [12, 12], faces: [PI - 1.05, PI + 1.05], takedownSpot: [-33, -42.7], role: 'sentry', zone: 'dock', squad: 3, reason: 'Waits for the courier with a cage trolley' },
  // 9 (G2, D:241) the night supervisor: the log desk (20 s), the door step facing the lane (5 s), a 30.8 s cycle
  { kind: 'officer', x: 15.2, z: -73.6, yaw: 0, route: [[15.2, -73.6], [17, -71.6]], waits: [20, 5], faces: [0, -PI / 2], takedownSpot: [17, -71.6], role: 'desk', zone: 'gatehouse', squad: 0, reason: 'Night supervisor: signs the log, checks the barrier for the 03:00 courier' },
  // (no #10) 11 (G3, D:244) the east-rows patrol: the aisle's east half, 4 s stops, a 42.2 s cycle; dark at the east end
  { kind: 'officer', x: -12, z: -66, yaw: PI / 2, route: [[-12, -66], [4, -66]], waits: [4, 4], takedownSpot: [4, -66], role: 'patrol', zone: 'carpark', squad: 1, reason: 'Walks the rows by the gate where the courier parks' },
  // 12 (G4, D:247) the storeman: the goods door <-> the bin screen mouth, 6 s stops, 25.4 s; alone at the bin mouth
  { kind: 'grunt', x: -31, z: -42.6, yaw: PI, route: [[-31, -42.6], [-34, -48.5]], waits: [6, 6], takedownSpot: [-34, -48.5], role: 'patrol', zone: 'dock', squad: 3, reason: 'Storeman: stages the cage trolley for the 03:00 courier' },
  // 13 (G5, D:249) the walkway patrol: the drop-off walkway, 4 s stops, 40.3 s; dark at the east end by the lockers
  { kind: 'grunt', x: -24, z: -43, yaw: PI / 2, route: [[-24, -43], [-8, -43]], waits: [4, 4], takedownSpot: [-8, -43], role: 'patrol', zone: 'forecourt', squad: 2, reason: 'Walks the drop-off walkway' },
  // 14 (G5, D:250) the courier escort: posted at the kerb facing the car park; his takedown spot 0.5 m behind him (A7)
  { kind: 'officer', x: -18, z: -46.6, yaw: PI, takedownSpot: [-18, -46.1], role: 'escort', zone: 'forecourt', squad: 2, reason: 'Meets the 03:00 courier at the drop-off' },
  // 15 (G5, D:253) the north-east fence patrol: 5 s stops, 42.3 s; dark at the NE corner
  { kind: 'grunt', x: 24, z: -54, yaw: 0, route: [[24, -54], [24, -38]], waits: [5, 5], takedownSpot: [24, -38], role: 'patrol', zone: 'perimeter', squad: 4, reason: 'East fence-line check' },
  // 16 (G5, D:252) the second smoker, #6's talking pair: the shelter front <-> the ash bin, 12.5 s stops (A20), 30.3 s
  { kind: 'officer', x: 7, z: -50.8, yaw: -PI / 2, route: [[7, -50.8], [4.5, -50.8]], waits: [12.5, 12.5], takedownSpot: [4.5, -50.8], role: 'smoker', zone: 'smoking', squad: 2, pair: 5, reason: 'On his break with the smoker' },
];

/** Section 1's cameras (range 8-12, `aim` on the protected floor point, a `reason`); live only in their own section. */
export const S1_CAMERAS: SecurityData['devices'] = [
  // fixed, faces south down the lane: the verge and the rear window are behind it
  { id: 'cam-gate', kind: 'camera', level: 'ground', at: [11, -77.9], y: 3.0, aim: 6, range: 10, facing: 180, reason: 'S1: the barrier and the gatehouse door (the insurer asks for an ANPR / tailgating camera)', section: 0 },
  // under the canopy soffit: sweeps 40 degrees south-west to south, 8 m out; cannot see the canopy top
  { id: 'cam-walk', kind: 'camera', level: 'ground', at: [-17, -34.5], y: 3.4, aim: 8, range: 10, facing: 205, sweep: [185, 225], reason: 'S1: the walkway from the car park to the staff door', section: 0 },
];

/** Section 1's security desk (G2, D:73, SY:9): the gatehouse CCTV desk, run by #2 (index 1). Sync node `sync-s1-gate-desk`. */
export const S1_DESKS: SecurityDesk[] = [{ id: 'desk-gate', section: 0, at: [18.8, -73.2], yaw: 0, cameras: ['cam-gate', 'cam-walk'], operator: 1 }];

/** Section 1's alarm panel: the gatehouse's, by its door, facing into the room (G2, D:61). */
export const S1_ALARMS: CampusAlarm[] = [{ at: [15.0, -72.8], yaw: PI, section: 0 }];

/** Section 1's sector: the gatehouse PC download, C1 into the staff entrance. */
export const S1_SECTOR: SectorDef = {
  id: 's1',
  name: 'Gatehouse and car park',
  start: { x: 24, y: 0, z: -79, yaw: 0 },
  // weapons crate (E9): the verge east fence, strip to the lane
  crate: { at: [25, 0, -78], yaw: -PI / 2 },
  // download (10 s, within 4 m) at the gatehouse PC, through the open rear window from the dark verge: opens C1 (the cloned courier badge).
  // (builder L2) The SPEC's (18.5, -76) is 1.95 m from where a player stands at the window (the wall face x 20.15 + the 0.3 body):
  // the default interact reach is 1.8 (`Interactables.nearest`), so the download could not be started from the verge. The PC sits
  // on its desk at x 19.3 (0.8 m east, 1.15 m from the window). (F42) The desk moved south of the window, off the vault's
  // landing: the PC sits on its north end at z -77.3 (the terminal z -77.65..-76.95), 1.74 m from the player at the window.
  objective: { kind: 'download', label: "Download tonight's visitor list in the gatehouse", x: 19.3, y: 0, z: -77.3, yaw: PI / 2 },
  connector: {
    label: 'Into the staff entrance',
    box: [C1_BOX[0], C1_BOX[1], C1_BOX[2], C1_BOX[3]],
    nearAt: [S1_DOORS.c1Near[0], S1_DOORS.c1Near[1]],
    farAt: [S1_DOORS.c1Far[0], S1_DOORS.c1Far[1]],
    // E12: the delivery yard's dock door opens when C1 seals (a side door of section 2)
    sealUnlocks: [[S1_DOORS.dock[0], S1_DOORS.dock[1]]],
    checkpoint: { x: -20, y: 0, z: -32, yaw: 0 },
  },
  guards: S1_GUARDS,
  // stage 1: the lane and the dock door
  reinforce: [[11, -79], [-33, -41]],
  perStage: 2,
  dogs: 0,
  // (G6, D:147, SVG:537-544) the three polylines, each from the start through the objective (within 4 m) into C1
  routes: [
    {
      // track B (SVG:537): the verge, the rear window, the dark east fence, behind the smoking shelter, the facade planters, the doorman from the east
      name: 'The verge, the rear window and the east side',
      pts: [[24, -79], [21, -76], [23, -70], [23, -55], [22, -46], [12, -45.6], [4, -45.8], [0, -37.2], [-12, -37.2], [-18.6, -35.3], [-20, -34], [-20, -32]],
      obj: 1,
    },
    {
      // shadow (SVG:538, then the as-built tail SEC:340): the south footway, the west margin, the yard board, the doorman from the west
      name: 'The south footway, the west margin and the yard board',
      pts: [[24, -79], [21, -76], [22, -73], [10, -79], [-10, -79.2], [-38.6, -78], [-38.6, -55], [-37, -51], [-33, -46], [-29.5, -41.2], [-24.5, -41.2], [-23.2, -36.5], [-21.6, -35.1], [-20, -34], [-20, -32]],
      obj: 1,
    },
    {
      // track A (the as-built lead-in SEC:346, then SVG:539): the caged ladder, the plant roof, the canopy hatch drop behind the doorman
      name: 'The caged ladder, the plant roof and the canopy hatch',
      pts: [[24, -79], [21, -76], [21, -70], [21, -64.5], [-30, -64.5], [-28.5, -50.5], [-26.8, -44], [-29.5, -41.2], [-38, -41.3], [-38, -39.2, 4.4], [-33, -37, 4.4], [-20, -37.5, 4.4], [-20, -35.9], [-20, -34], [-20, -32]],
      obj: 1,
      // the caged ladder (leg 8) and the hatch drop (leg 11, A65)
      climbs: [8, 11],
    },
  ],
};

/** (campus-greybox P0) Section 1's parts for the map (`campusSections.ts`). */
export const S1_PARTS: CampusSectionParts = {
  build: (b) => buildCampusS1(b, S1_LIGHTS),
  spawns: S1_SPAWNS,
  pickups: S1_PICKUPS,
  hideSpots: S1_HIDESPOTS,
  switches: S1_SWITCHES,
  rooms: S1_ROOMS,
  navSeeds: S1_NAV_SEEDS,
  lasers: [],
  panels: [],
  boards: [],
  sector: S1_SECTOR,
  cameras: S1_CAMERAS,
  desks: S1_DESKS,
  levels: {},
  alarms: S1_ALARMS,
  coopLips: S1_COOP_LIPS,
  dress: dressS1,
  artTags: S1_ART_TAGS,
  hero: HERO_S1,
};

/** (campus-greybox) True while this v2 section is still an exact copy of the live one (`tests/campusV2.test.ts`
 *  checks it equals v1); the lane sets it false with its first layout change. */
export const S1_V2_COPY = false;
