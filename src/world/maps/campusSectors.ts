import type { RoutePt, SectorDef, SectorGuard } from '../../game/sectors';
import type { SecurityData } from '../../security/data';
import { C1_BOX, S1_DOORS } from './campusS1';
import { C2_BOX, C2_FLOOR, S2_DOORS } from './campusS2';
import { S3_DOORS, S3_L1 } from './campusS3';
import { S4_ALARMS, S4_CAMERAS, S4_DESKS, S4_SECTOR } from './campusS4Data';
import { S5_ALARMS, S5_CAMERAS, S5_SECTOR } from './campusS5Data';

const PI = Math.PI;

/**
 * The campus screen cap (BRIEF A99, lifts A64's 6): no walkable player point, at any of 32 facings, sees more than this
 * many guards (every guard counts, `dormant` or not: no code sleeps a guard) on their posts and routes in the view with a
 * clear line within 40 m. From guard-render's measured budget: the merged-body run (`docs/archive/guard-render/run-s1`, laptop
 * 4090, Epic 1920x1080) holds 24 alive / 12 in sight on Sector Ops at frame CPU p95 11.1 ms, GPU p95 7.2 ms (60 Hz line:
 * 12 / 15). The campus scene itself is not measured yet (GPU perf pass). Undo: 6 here and the awake-only filter in the
 * campus S2-S5 screen-count tests.
 */
export const CAMPUS_SCREEN_CAP = 12;

/**
 * Saltmarsh Park (`campusOps`) sector data (`docs/sector-redesign/SPEC.md`): index 0 = section 1 in full (the gatehouse,
 * car park and forecourt: 8 armed Larchmont guards, 2 cameras, an alarm panel, the gatehouse PC download, C1); index 1 =
 * section 2 in full (the HQ atrium and offices: 12 guards, 3 cameras, 2 alarm panels, the BMS hack, C2 on L1); index 2 =
 * section 3 (16 guards, here); indices 3-4 = sections 4-5 (`campusS4Data.ts` 20 guards incl. 1 dog, `campusS5Data.ts` 24
 * incl. 2 dogs). The signed-off counts are 15 / 18 / 20 / 25 / 26 for 1-2 players, plus tagged extras for 3-4 (G328,
 * G362): campus greybox v2 (FOLDED-PLAN J17). Pure data; the mode places the guards and runs the connectors,
 * `campusOps.ts` builds the rooms.
 *
 * Walk speeds (m/s) in the cycle arithmetic: a plain route walks at walkSpeed x 1.1 (grunt 0.99, officer 0.935, enforcer 0.88);
 * a timed `loop` at walkSpeed (grunt 0.9, officer 0.85). Each cycle is 25-45 s (`tests/campusS1.test.ts`).
 */

/** Section 1's guards (SPEC "S1" guard table; kinds and weapons as listed: officer = pistolSd, grunt = rifle). */
const S1_GUARDS: SectorGuard[] = [
  // 1 the gate officer: works the barrier, waits for the 03:00 courier; at the reception window, facing west onto the lane
  { kind: 'officer', x: 16, z: -76, yaw: -PI / 2, takedownSpot: [16, -76.4], role: 'gate', zone: 'gatehouse', squad: 0, reason: 'Works the barrier and waits for the 03:00 courier' },
  // 2 the CCTV officer: the monitors at his desk (28 s), the kettle (5 s) every ~39 s; alone at the kettle, facing the counter
  { kind: 'officer', x: 18.3, z: -74.8, yaw: 0, route: [[18.3, -74.8], [18.4, -77.65]], waits: [28, 5], faces: [0, PI], takedownSpot: [18.4, -77.65], role: 'cctv', zone: 'gatehouse', squad: 0, reason: 'Watches the cam-gate and cam-walk monitors; the kettle is on the other side of the room' },
  // 3-4 the car-park pair: a timed loop of the aisle (a 42 s master clock), side by side, facing each other at every stop
  {
    kind: 'grunt',
    x: -29,
    z: -66.2,
    yaw: 0,
    route: [[-29, -66.2], [-21, -66.2], [-21, -63.8], [-29, -63.8]],
    faces: [0, 0, 0, 0],
    loop: { period: 42, leave: [4.5, 18, 25, 38], t0: 0 },
    takedownSpot: [-29, -66.2],
    role: 'patrol',
    zone: 'carpark',
    squad: 1,
    pair: 3,
    reason: 'Two cars were broken into last month: they try door handles along the rows',
  },
  {
    kind: 'officer',
    x: -29,
    z: -65.2,
    yaw: PI,
    route: [[-29, -65.2], [-21, -65.2], [-21, -62.8], [-29, -62.8]],
    faces: [PI, PI, PI, PI],
    loop: { period: 42, leave: [4.5, 18, 25, 38], t0: 0 },
    takedownSpot: [-29, -65.2],
    role: 'patrol',
    zone: 'carpark',
    squad: 1,
    pair: 2,
    reason: 'Walks the rows with the grunt, as the break-in follow-up',
  },
  // 5 the doorman (K1, M12): posted under the canopy at the C1 badge door, facing south onto the walkway
  { kind: 'officer', x: -20, z: -35, yaw: PI, takedownSpot: [-20, -34.7], post: { leash: 5, guards: 'c1-door' }, role: 'posted', zone: 'c1', squad: 2, reason: 'Badge check at the only staff door' },
  // 6 the smoker: on his break in the smoking shelter, facing the car park
  { kind: 'grunt', x: 8, z: -48.5, yaw: PI, takedownSpot: [8, -47.6], role: 'smoker', zone: 'smoking', squad: 2, reason: 'On his break; he can see the car park from the shelter' },
  // 7 the fence patrol: the west fence <-> the bin store mouth, 41 s; dark at the bin-store end; comes to the feeder board if it is cut
  { kind: 'grunt', x: -38, z: -66, yaw: PI, route: [[-38, -66], [-34, -50]], waits: [4, 4], faces: [PI, 0], takedownSpot: [-34, -50.6], role: 'patrol', zone: 'perimeter', squad: 3, reason: 'Fence-line check after the break-ins' },
  // 8 the delivery sentry: a sweep at the dock door, +-60 degrees, 12 s each way
  { kind: 'grunt', x: -34, z: -41.6, yaw: PI - 1.05, route: [[-34, -41.6], [-32, -41.6]], waits: [12, 12], faces: [PI - 1.05, PI + 1.05], takedownSpot: [-33, -42.2], role: 'sentry', zone: 'dock', squad: 3, reason: 'Waits for the courier with a cage trolley' },
];

/**
 * Section 2's guards (SPEC "S2" guard table; officer = pistolSd, grunt = rifle). Floors: G 0, L1 4.4, L2 8.4 (`y`). The
 * 0-based index in this list is the guard's number minus one. #10 and #12 are far from every route (`dormant`, A64 / A99:
 * data for a later far-guard sleep step, read by no code yet).
 */
const S2_GUARDS: SectorGuard[] = [
  // 1 the reception officer: at the desk, facing the turnstiles; watches cam-turnstile / cam-lift; answers the atrium panel
  { kind: 'officer', x: -20, z: -24.9, yaw: 0, takedownSpot: [-20, -25.6], role: 'reception', zone: 'reception', squad: 0, reason: 'Front of house: watches the turnstile line and the lift lobby monitors' },
  // 2 the lobby patrol: the hall's west side between #1's desk (a 4 s pair stop) and the lift lobby door, 42 s
  { kind: 'grunt', x: -24, z: -24.8, yaw: PI / 2, route: [[-24, -24.8], [-29, -8.5]], waits: [4, 4], faces: [PI / 2, 0], takedownSpot: [-29, -8.5], role: 'patrol', zone: 'lobby', squad: 0, reason: 'Ground-floor round: reception, the cafe and the lift lobby' },
  // 3 the L1 balcony officer: back and forth along the north edge, looks down into the atrium at each end, 36 s
  { kind: 'officer', x: -24.5, z: -2.7, y: 4.4, yaw: PI, route: [[-24.5, -2.7], [-11.5, -2.7]], waits: [4, 4], faces: [PI, PI], takedownSpot: [-24.5, -2.7], role: 'balcony', zone: 'l1-balcony', squad: 2, reason: 'Looks down into the atrium from each end of the L1 balcony' },
  // 4 the L2 balcony grunt: the opposite side, opposite phase (starts at the east end), covers #3 across the void
  { kind: 'grunt', x: -11.5, z: -21.3, y: 8.4, yaw: 0, route: [[-11.5, -21.3], [-24.5, -21.3]], waits: [4, 4], faces: [0, 0], takedownSpot: [-11.5, -21.3], role: 'balcony', zone: 'l2-balcony', squad: 3, reason: 'Watches the L1 balcony across the void' },
  // 5-6 the coffee pair in the kitchen: one 34 s master-clock loop of a 4 x 3 m rectangle, a row apart, facing each other at each stop
  {
    kind: 'grunt',
    x: -27,
    z: -27.5,
    y: 4.4,
    yaw: 0,
    route: [[-27, -27.5], [-23, -27.5], [-23, -24.5], [-27, -24.5]],
    faces: [0, 0, 0, 0],
    loop: { period: 34, leave: [8, 17, 25, 34], t0: 0 },
    takedownSpot: [-27, -27.5],
    role: 'break',
    zone: 'kitchen',
    squad: 2,
    pair: 5,
    reason: 'On their break: the ceremony, and the facilities keypad code they were told to memorise',
  },
  {
    kind: 'officer',
    x: -27,
    z: -26.5,
    y: 4.4,
    yaw: PI,
    route: [[-27, -26.5], [-23, -26.5], [-23, -23.5], [-27, -23.5]],
    faces: [PI, PI, PI, PI],
    loop: { period: 34, leave: [8, 17, 25, 34], t0: 0 },
    takedownSpot: [-27, -26.5],
    role: 'break',
    zone: 'kitchen',
    squad: 2,
    pair: 4,
    reason: 'Refills the coffee with the grunt, then back to the corridor',
  },
  // 7 the facilities officer: at the BMS desk (28 s), to the plotter (6 s), 43 s
  { kind: 'officer', x: -6.5, z: 2.9, y: 4.4, yaw: 0, route: [[-6.5, 2.9], [-2.5, 4.2]], waits: [28, 6], faces: [0, 0], takedownSpot: [-2.5, 4.2], role: 'desk', zone: 'facilities', squad: 1, reason: 'Night facilities duty: sets the lighting schedule, prints the plant log' },
  // 8 the comms checker: a 3-stop loop of the east wing: the facilities door, the comms room (UPS), the bridge lobby wall, 38 s
  { kind: 'grunt', x: -4, z: -1.5, y: 4.4, yaw: 0, route: [[-4, -1.5], [1, -6.5], [-4, -12]], waits: [3, 7, 3], faces: [0, PI / 2, PI], takedownSpot: [1, -6.5], role: 'patrol', zone: 'comms', squad: 1, reason: 'Reads the UPS panel in the comms room each round and glances at the facilities door' },
  // 9 the L2 stair tour: the SW fire door to the lift lobby (the NE door is 45 m away: a 44 s loop cannot clock both), 43 s
  { kind: 'officer', x: -37.5, z: -23.5, y: 8.4, yaw: PI, route: [[-37.5, -23.5], [-33.5, -8.5]], waits: [5, 5], faces: [PI, 0], takedownSpot: [-37.5, -23.5], role: 'patrol', zone: 'l2-stairs', squad: 3, reason: 'Clocking round: the fire door and the lift lobby' },
  // 10 the L2 lift sentry: sweeps the lobby and the corridor to the executive suite (12 s each way)
  { kind: 'grunt', x: -35, z: -7, y: 8.4, yaw: -1, route: [[-35, -7], [-33, -7]], waits: [12, 12], faces: [-1, 1], takedownSpot: [-34, -7], role: 'sentry', dormant: true, zone: 'l2-lift', squad: 3, reason: 'Watches the corridor to the executive suite' },
  // 11 the bridge officer (K2, M12): posted in the bridge landing, facing the doorways, the card door at his back
  { kind: 'officer', x: 1, z: -14, y: 4.4, yaw: -PI / 2, takedownSpot: [2, -14], post: { leash: 5, guards: 'c2-door' }, role: 'posted', zone: 'c2', squad: 1, reason: 'The only internal link to the lab block: he checks every card' },
  // 12 the mailroom guard: posted at the goods door, facing into the room
  { kind: 'grunt', x: -42.5, z: -16, yaw: PI / 2, takedownSpot: [-43.2, -16], role: 'post', dormant: true, zone: 'goods', squad: 0, reason: "Takes the courier's paperwork at the goods door" },
];
// ---- Section 3 (slice 3): the lab block (SPEC "S3" guard table; `campusS3.ts` builds it) ------------------------------
const Y1 = S3_L1;

/**
 * Section 3's guards (16; SPEC "S3" table; officer = pistolSd, grunt = rifle, enforcer = pistolSd + shield). No choke
 * guard (A60). `y` is the L1 floor for the L1 guards. Dormant (A64 / A99, far from every route; data only): #12 (the security room, off
 * the north corridor's east end) and #14 (the east yard, outside the building). The values the SPEC left open (posts,
 * yaws, waits) are in `docs/sector-redesign/checks/slice3-build.md`.
 */
const S3_GUARDS: SectorGuard[] = [
  // 1 the bridge landing officer (L1, the C2 landing): faces the bridge door, his back to the SW stair's L1 door
  { kind: 'officer', x: 14, y: Y1, z: -17, yaw: -0.927, takedownSpot: [14.4, -17.3], role: 'bridge', zone: 's3-c2', squad: 0, reason: 'Checks cards from the HQ side at the bridge landing' },
  // 2-3 the viewing-corridor pair (L1): a timed back-and-forth (a 40 s master clock), side by side, facing each other at each end
  {
    kind: 'officer',
    x: 30,
    y: Y1,
    z: -7.4,
    yaw: 0,
    route: [[30, -7.4], [44, -7.4]],
    faces: [0, 0],
    loop: { period: 40, leave: [3.5, 23.5], t0: 0 },
    takedownSpot: [30, -7.4],
    role: 'patrol',
    zone: 's3-view',
    squad: 1,
    pair: 2,
    reason: 'The prototype is in the building tonight: the corridor round is doubled',
  },
  {
    kind: 'grunt',
    x: 30,
    y: Y1,
    z: -6.6,
    yaw: PI,
    route: [[30, -6.6], [44, -6.6]],
    faces: [PI, PI],
    loop: { period: 40, leave: [3.5, 23.5], t0: 0 },
    takedownSpot: [30, -6.6],
    role: 'patrol',
    zone: 's3-view',
    squad: 1,
    pair: 1,
    reason: 'Walks the viewing corridor with the officer (the doubled round)',
  },
  // 4 the gowning sentry (L1): posted in the gowning room by the pass-through, covering the beam curtain
  { kind: 'grunt', x: 32.2, y: Y1, z: -1.0, yaw: PI - 0.6, takedownSpot: [31.9, -0.7], role: 'sentry', zone: 's3-gown', squad: 1, reason: 'Nobody enters the clean room at night' },
  // 5 the store keyholder (L1): posted at the store hatch, facing west down the corridor
  { kind: 'officer', x: 47.8, y: Y1, z: -7.0, yaw: -PI / 2, takedownSpot: [48.3, -7.0], role: 'keyholder', zone: 's3-store', squad: 1, reason: 'Holds the store key; signs the board out to the courier at 06:00' },
  // 6-7 the test-hall patrols: one loop round the chamber (1-2 m off its faces), opposite corners, the same direction
  { kind: 'grunt', x: 28, z: -23, yaw: 0, route: [[28, -23], [28, -13], [37, -13], [37, -23]], waits: [0.5, 0.5, 2.5, 2.5], faces: [0, PI / 2, PI, -PI / 2], takedownSpot: [37, -23], role: 'patrol', zone: 's3-hall', squad: 2, reason: 'The test-hall floor round' },
  { kind: 'grunt', x: 37, z: -13, yaw: PI, route: [[37, -13], [37, -23], [28, -23], [28, -13]], waits: [2.5, 2.5, 0.5, 0.5], faces: [PI, -PI / 2, 0, PI / 2], takedownSpot: [37, -13], role: 'patrol', zone: 's3-hall', squad: 2, reason: 'The test-hall floor round, on the far side of the chamber from his partner' },
  // 8 the burn-in watcher: at the racks (20 s, the EMC room hides him from the west), the log desk (5 s), every ~42 s
  { kind: 'grunt', x: 49.4, z: -20, yaw: PI / 2, route: [[49.4, -20], [47.5, -11.2]], waits: [20, 5], faces: [PI / 2, PI], takedownSpot: [49.4, -20], role: 'watch', zone: 's3-racks', squad: 2, reason: 'Logs the rack temperatures of the overnight burn-in test' },
  // 9 the dock officer: posted at the dock desk, facing east (the stair lobby door); the C3 door is behind him
  { kind: 'officer', x: 30.5, z: -2.5, yaw: PI / 2, takedownSpot: [30.0, -2.5], role: 'desk', zone: 's3-dock', squad: 3, reason: 'Waits at the dock desk for the 03:00 courier' },
  // 10 the dock patrol: the dock door <-> behind the gas cage's blast wall, 36 s
  { kind: 'grunt', x: 25, z: -4.5, yaw: PI, route: [[25, -4.5], [38.9, -4.6]], waits: [4, 4], faces: [PI, PI / 2], takedownSpot: [38.9, -4.6], role: 'patrol', zone: 's3-dock', squad: 3, reason: 'Checks the gas-cage padlock each round' },
  // 11 the stair tour: the dock-hall door <-> the north stair's ground lobby, clocking each, 38 s (L5: both stairs is a 70 s loop)
  { kind: 'officer', x: 27.5, z: -9.2, yaw: PI, route: [[27.5, -9.2], [41.3, -6.6]], waits: [4, 4], faces: [PI, 0], takedownSpot: [41.3, -6.6], role: 'tour', zone: 's3-hall', squad: 2, reason: 'The clocking round of the stair doors' },
  // 12 the security room operator (L1): the monitors (26 s), the kettle (4 s), 43 s
  { kind: 'officer', x: 58, y: Y1, z: -6.6, yaw: PI, route: [[58, -6.6], [62.8, -2.6]], waits: [26, 4], faces: [PI, 0], takedownSpot: [62.8, -2.6], role: 'operator', dormant: true, zone: 's3-sec', squad: 4, reason: 'Watches the lab cameras; the kettle is across the room' },
  // 13 the write-up officer (L1): posted at his desk facing the corridor glass
  { kind: 'officer', x: 25, y: Y1, z: -4.2, yaw: PI, takedownSpot: [25, -3.6], role: 'desk', zone: 's3-writeup', squad: 1, reason: "Reads tonight's test reports over the radio" },
  // 14 the east yard patrol: outside the east wall, 38 s
  { kind: 'grunt', x: 67, z: -26, yaw: 0, route: [[67, -26], [67, -10]], waits: [3, 3], faces: [0, PI], takedownSpot: [67, -10], role: 'patrol', dormant: true, zone: 's3-yard', squad: 4, reason: "Walks the yard outside the hall's east wall" },
  // 15 the shift supervisor (L1): the back corridor's north end <-> the security room door, 40 s
  { kind: 'officer', x: 43.6, y: Y1, z: -0.8, yaw: PI, route: [[43.6, -0.8], [57, -0.8]], waits: [4, 6], faces: [PI, PI], takedownSpot: [43.6, -0.8], role: 'supervisor', zone: 's3-l1', squad: 1, reason: 'Visits every post on L1 and checks in with the security room' },
  // 16 the crane-bay sentry: a sweep inside the hall's west door, facing the hall, +-50 degrees, 12 s each way
  { kind: 'grunt', x: 25, z: -19, yaw: PI / 2 - 0.87, route: [[25, -19], [25, -17]], waits: [12, 12], faces: [PI / 2 - 0.87, PI / 2 + 0.87], takedownSpot: [24.4, -18], role: 'sentry', zone: 's3-hall', squad: 2, reason: 'Minds the hall door from the HQ side' },
];

/** The exit legs every S3 route shares: the store, the back corridor, the north stair down, the dock, C3. */
const S3_EXIT: readonly RoutePt[] = [
  [45.2, -4.2, Y1],
  [43.7, -4.2, Y1],
  [43.7, -5.4, Y1],
  [42, -5.4, Y1],
  [40.6, -1.1, 2.25],
  [40.6, -5.2],
  [41.3, -6.8],
  [39.2, -7],
  [30, -6],
  [24, -1.5],
  [24, 1],
  [24, 8],
];

/** (L13) Into the lab block from C2: the L1 bridge door, down the north stair to the hall floor (every route opens with it). */
const S3_ENTRY: readonly RoutePt[] = [[7, -14, 4.4], [11, -14, S3_L1], [14, -21.6, S3_L1], [14, -23, S3_L1], [13.3, -27.4, 2.25], [12.6, -23, 0], [12.6, -21.6, 0]];

/** The ways in (M8): stealth round the EMC room, loud by the viewing corridor and the hatch, high by the crane walkway. */
const S3_ROUTES: SectorDef['routes'] = [
  {
    // stealth (solo): the lobby, the west door behind #16, the hall's south strip, round the EMC room, under the gallery,
    // the north stair, the back corridor, the store's back door, the beams (jammed, or the crouch at the reset)
    name: 'Round the EMC room and the back corridor',
    pts: [...S3_ENTRY, [20.5, -18], [23.2, -18], [23.2, -27.3], [40, -27.3], [49.3, -25], [49.3, -13], [44, -9.2], [41.3, -9.2], [41.3, -6.5], [40.6, -5.2], [40.6, -1.1, 2.25], [42, -5.4, Y1], [43.7, -5.4, Y1], [43.7, -4.2, Y1], [45.2, -4.2, Y1], [50.4, -4.2, Y1], ...S3_EXIT],
    obj: 22,
  },
  {
    // loud: across the hall, the north stair, the viewing corridor past the pair and the keyholder, the hatch, the beams
    name: 'The viewing corridor and the hatch',
    pts: [...S3_ENTRY, [20.5, -18], [23.2, -18], [30, -11], [41.3, -9.2], [41.3, -6.5], [40.6, -5.2], [40.6, -1.1, 2.25], [42, -5.4, Y1], [42, -6.6, Y1], [46.8, -6.8, Y1], [46.8, -5.2, Y1], [47.8, -4.2, Y1], [50.4, -4.2, Y1], ...S3_EXIT],
    obj: 19,
  },
  {
    // high (solo): the SW caged ladder, the crane walkway (6.0, overwatch of both hall patrols), the SE ladder, then stealth
    name: 'The crane walkway',
    pts: [...S3_ENTRY, [20.5, -18], [23.2, -18], [23, -27.4], [23, -29.25, 6], [51, -29.25, 6], [51, -27.4], [49.3, -25], [49.3, -13], [44, -9.2], [41.3, -9.2], [41.3, -6.5], [40.6, -5.2], [40.6, -1.1, 2.25], [42, -5.4, Y1], [43.7, -5.4, Y1], [43.7, -4.2, Y1], [45.2, -4.2, Y1], [50.4, -4.2, Y1], ...S3_EXIT],
    obj: 24,
    climbs: [9, 11],
  },
];

/** The cameras of section 3 (SPEC register): cam-view on L1, cam-dock over the C3 door. */
const S3_CAMERAS: SecurityData['devices'] = [
  // at the viewing corridor's store end, facing west down it: the store hatch and the corridor end; the back corridor is behind its wall; bulletproof (E8, A95: shots ricochet, jam it or slip the sweep); cam-dock stays shootable
  { id: 'cam-view', kind: 'camera', level: 's3-l1', at: [51.7, -7.0], y: 2.8, aim: 6, range: 10, facing: 270, reason: 'S3: the prototype store hatch and the viewing corridor', section: 2, bulletproof: true },
  // over the dock door (C3), fixed, facing in: the dock floor in front of the door
  { id: 'cam-dock', kind: 'camera', level: 'ground', at: [24, -0.4], y: 3.2, aim: 6, range: 10, facing: 180, reason: 'S3: the goods-in dock door', section: 2 },
];

/** Section 3's alarm panels: alarm-dock at the dock desk (north wall), alarm-sec in the security room (L1, west wall). */
const S3_ALARMS: { at: [number, number]; yaw: number; section: number; y?: number }[] = [
  { at: [32.6, -0.2], yaw: PI, section: 2 },
  { at: [52.2, -4.0], yaw: PI / 2, section: 2, y: Y1 },
];

/** The cameras (range 8-12, `aim` on the protected floor point, a `reason`); live only in their own section. */
export const CAMPUS_SECURITY: SecurityData = {
  levels: { ground: 0, l1: 4.4, 's3-l1': S3_L1, 's5-l1': 4.2 },
  devices: [
    // fixed, faces south down the lane: the verge and the rear window are behind it
    { id: 'cam-gate', kind: 'camera', level: 'ground', at: [11, -77.9], y: 3.0, aim: 6, range: 10, facing: 180, reason: 'S1: the barrier and the gatehouse door (the insurer asks for an ANPR / tailgating camera)', section: 0 },
    // under the canopy soffit: sweeps 40 degrees south-west to south, 8 m out; cannot see the canopy top
    { id: 'cam-walk', kind: 'camera', level: 'ground', at: [-17, -34.5], y: 3.4, aim: 8, range: 10, facing: 205, sweep: [185, 225], reason: 'S1: the walkway from the car park to the staff door', section: 0 },
    // S2: on the foyer's west wall, faces east along the turnstile line; the post room door is in the same wall behind it
    { id: 'cam-turnstile', kind: 'camera', level: 'ground', at: [-29.7, -24.2], y: 3.2, aim: 7, range: 8, facing: 90, reason: 'S2: the turnstile line (tailgating at the front of house)', section: 1 },
    // S2: in the G lift lobby, faces the dummy lift doors; the fire stairs are not on CCTV
    { id: 'cam-lift', kind: 'camera', level: 'ground', at: [-31, -4.4], y: 3.0, aim: 7, range: 8, facing: 250, reason: 'S2: the lifts, the way to the executive suite (a laptop was taken that way)', section: 1 },
    // S2: over the card door inside the bridge landing, faces west down the landing; sees the doorways, not the NE stair door 14 m along
    { id: 'cam-bridge', kind: 'camera', level: 'l1', at: [3.7, -13], y: 3.0, aim: 6, range: 9, facing: 270, reason: "S2: the bridge door and landing (the lab block's only link)", section: 1 },
    ...S3_CAMERAS,
    ...S4_CAMERAS,
    ...S5_CAMERAS,
  ],
  desks: [...S4_DESKS],
};

/** The alarm panels by section (only the live section's works): the gatehouse's, by its door, facing into the room; S2's and S3's. `y`: the floor (default 0). */
export const CAMPUS_ALARMS: { at: [number, number]; yaw: number; section: number; y?: number }[] = [
  { at: [15.0, -73.3], yaw: PI, section: 0 },
  // S2: alarm-rcp on the foyer's east wall by the reception, alarm-brg on the bridge landing's east wall by the card door (both beside posted guards)
  { at: [-8.3, -24.4], yaw: -PI / 2, section: 1 },
  { at: [3.7, -15.3], yaw: -PI / 2, section: 1, y: 4.4 },
  ...S3_ALARMS,
  ...S4_ALARMS,
  ...S5_ALARMS,
];

/**
 * The five sections: S1 here, S2-S5 from their slices (`campusS2.ts` .. `campusS5Data.ts`). The connectors are
 * ground-level rooms between the buildings (the glazed bridge C2 is on L1 in the SPEC: a later slice).
 */
export const CAMPUS_SECTORS: SectorDef[] = [
  {
    id: 's1',
    name: 'Gatehouse and car park',
    start: { x: 24, y: 0, z: -79, yaw: 0 },
    // weapons crate (E9): the verge east fence, strip to the lane
    crate: { at: [25, 0, -78], yaw: -PI / 2 },
    // download (10 s, within 4 m) at the gatehouse PC, through the open rear window from the dark verge: opens C1 (the cloned courier badge).
    // (builder L2) The SPEC's (18.5, -76) is 1.95 m from where a player stands at the window (the wall face x 20.15 + the 0.3 body):
    // the default interact reach is 1.8 (`Interactables.nearest`), so the download could not be started from the verge. The PC sits
    // on its desk at x 19.3 (0.8 m east, 1.15 m from the window).
    objective: { kind: 'download', label: "Download tonight's visitor list in the gatehouse", x: 19.3, y: 0, z: -76, yaw: PI / 2 },
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
    routes: [
      {
        // stealth (solo): the verge, the rear window, the dark east fence, behind the smoking shelter, the facade planters, the doorman from the east
        name: 'The verge, the rear window and the east side',
        pts: [[24, -79], [22.2, -76.2], [21, -70], [21, -58], [24, -52], [8, -45.2], [2, -37.2], [-12.8, -37.2], [-18.5, -35.1], [-20, -34], [-20, -32]],
        obj: 1,
      },
      {
        // shadow (made): the feeder board cuts the west half, the bin store, the delivery yard, the doorman from the west
        name: 'The feeder board, the bin store and the yard',
        pts: [[24, -79], [22.2, -76.2], [21, -70], [21, -64.5], [-30, -64.5], [-35.2, -64.5], [-35.2, -52], [-31.8, -48], [-31, -53], [-28.5, -50.5], [-26.8, -44], [-28, -41.5], [-24.5, -41.2], [-23.2, -36.5], [-21.6, -35.1], [-20, -34], [-20, -32]],
        obj: 1,
      },
      {
        // high (solo): the yard's caged ladder, the plant roof, the canopy (overwatch), the drop at its east lip, the doorman from the east
        name: 'The caged ladder, the plant roof and the canopy',
        pts: [[24, -79], [22.2, -76.2], [21, -70], [21, -64.5], [-30, -64.5], [-28.5, -50.5], [-26.8, -44], [-30.5, -41.3], [-38, -41.3], [-38, -38.5, 4.4], [-30, -37, 4.4], [-20, -37.5, 4.4], [-15, -36, 4.4], [-13, -37], [-18.6, -35.1], [-20, -34], [-20, -32]],
        obj: 1,
        climbs: [8, 12],
      },
    ],
  },
  // ---- section 2 in full (slice 2): the HQ atrium and offices, C2 the glazed bridge on L1
  {
    id: 's2',
    name: 'HQ atrium and offices',
    start: { x: -20, y: 0, z: -32, yaw: 0 },
    // weapons crate (E9): C1 west wall, strip into the room
    crate: { at: [-22.2, 0, -32], yaw: PI / 2 },
    // hack (3 s) the BMS terminal on the desk in the facilities office (L1 NE): the lab block's door codes and the lighting schedule; opens C2.
    // (EW5 keypads are not built: the office door, kp-fac, is a plain door, and the code beat is cut.)
    objective: { kind: 'hack', label: 'Hack the BMS terminal in the facilities office', x: -6.5, y: 4.4, z: 4.3, yaw: 0 },
    connector: {
      label: 'Over the glazed bridge to the labs',
      box: [C2_BOX[0], C2_BOX[1], C2_BOX[2], C2_BOX[3]],
      floorY: C2_FLOOR,
      nearAt: [S2_DOORS.c2Near[0], S2_DOORS.c2Near[1]],
      farAt: [S2_DOORS.c2Far[0], S2_DOORS.c2Far[1]],
      checkpoint: { x: 7, y: C2_FLOOR, z: -14, yaw: PI / 2 },
    },
    guards: S2_GUARDS,
    // stage 2: the goods door (G, inside the mail room) and the L2 lift lobby (x, z only: the guard spawns on the lowest surface there, the G lift lobby)
    reinforce: [[-40, -16.5], [-36, -7]],
    perStage: 2,
    dogs: 0,
    routes: [
      {
        // stealth (solo): C1, the post room, the SW fire stair, the dark L1 open plan along the north side, the east wing door, the facilities door, the BMS terminal; out by the bridge landing
        name: 'The post room, the SW stair and the north open plan',
        pts: [[-20, -32], [-20, -28.5], [-26, -27.5], [-33, -27], [-38.4, -24.5], [-38.4, -23], [-40.7, -23], [-40.7, -23, 4.4], [-37.5, -23, 4.4], [-33, -17, 4.4], [-32, -8, 4.4], [-29, -1, 4.4], [-20, 0.8, 4.4], [-12, 0.8, 4.4], [-9.5, -3, 4.4], [-6.2, -3, 4.4], [-4, -1.2, 4.4], [-4, 1.2, 4.4], [-6.5, 2.9, 4.4], [-4, 1.2, 4.4], [-4, -1.2, 4.4], [-4, -9, 4.4], [1, -11.2, 4.4], [1, -12.8, 4.4], [2.5, -14, 4.4], [6, -14, 4.4]],
        obj: 18,
      },
      {
        // high (solo): the SW stair to the bulkhead, the roof past the atrium roof light, the NE bulkhead down to the L1 landing, the facilities door
        name: 'The SW bulkhead, the roof and the NE bulkhead',
        pts: [[-20, -32], [-20, -28.5], [-26, -27.5], [-33, -27], [-38.4, -24.5], [-38.4, -23], [-40.7, -23], [-40.7, -23, 12.3], [-38.6, -23, 12.3], [-33, -26, 12.3], [-12, -26, 12.3], [-5, -18, 12.3], [-4, -6, 12.3], [1.5, -1.2, 12.3], [1.5, 0.6, 12.3], [1.5, 0.6, 4.4], [1.5, -1.2, 4.4], [-4, -1.2, 4.4], [-4, 1.2, 4.4], [-6.5, 2.9, 4.4], [-4, 1.2, 4.4], [-4, -1.2, 4.4], [-4, -9, 4.4], [1, -11.2, 4.4], [1, -12.8, 4.4], [2.5, -14, 4.4], [6, -14, 4.4]],
        obj: 19,
      },
      {
        // loud: the turnstile gate, the feature stair to the L1 south strip, the east wing's south door, the wing corridor north to the facilities door
        name: 'The turnstiles, the feature stair and the east wing',
        pts: [[-20, -32], [-20, -28.5], [-20, -24.4], [-20, -22.2], [-18, -12.5], [-18, -20.5, 4.4], [-12, -21, 4.4], [-9, -21, 4.4], [-6, -21, 4.4], [-5, -12, 4.4], [-4, -3, 4.4], [-4, -1.2, 4.4], [-4, 1.2, 4.4], [-6.5, 2.9, 4.4], [-4, 1.2, 4.4], [-4, -1.2, 4.4], [-4, -9, 4.4], [1, -11.2, 4.4], [1, -12.8, 4.4], [2.5, -14, 4.4], [6, -14, 4.4]],
        obj: 13,
      },
    ],
  },
  // ---- S3 in full (slice 3): the lab block (SPEC "S3"): 16 armed Larchmont guards, cam-view and cam-dock, the first lasers
  // (las-gown, las-store, `campusS3.ts`), alarm-dock and alarm-sec, the prototype grab, C3. No choke (A60).
  {
    id: 's3',
    name: 'Lab block',
    // C2's checkpoint: S2's glazed bridge on L1 (L13: its far door is S3's L1 door at (10, -14.6))
    start: { x: 7, y: C2_FLOOR, z: -14, yaw: PI / 2 },
    // weapons crate (E9): the glazed bridge south wall, strip to the walkway
    crate: { at: [7, C2_FLOOR, -15.3], yaw: 0 },
    // grab the Tidewater prototype board off the shelf at the store's east end (L1), past las-store: opens C3
    objective: { kind: 'grab', label: 'Take the Tidewater board from the prototype store', x: 51.0, y: S3_L1, z: -3.8, yaw: PI / 2 },
    connector: {
      label: 'Along the dock link to the data hall',
      box: [22, 0, 26, 16],
      nearAt: [S3_DOORS.c3Near[0], S3_DOORS.c3Near[1]],
      farAt: [24, 16],
      checkpoint: { x: 24, y: 0, z: 8, yaw: 0 },
    },
    guards: S3_GUARDS,
    // stage 2 (SPEC): the dock and the hall's west door (taken in turn from stage 1)
    reinforce: [[30, -5], [24, -21]],
    perStage: 2,
    dogs: 0,
    routes: S3_ROUTES,
  },
  S4_SECTOR,
  S5_SECTOR,
];
