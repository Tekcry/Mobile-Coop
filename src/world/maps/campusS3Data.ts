import type { RoutePt, SectorDef, SectorGuard } from '../../game/sectors';
import type { SecurityDesk } from '../../game/sectorDesks';
import type { SecurityData } from '../../security/data';
import type { CampusAlarm, CampusSectionParts } from './campusParts';
import { C2_FLOOR } from './campusS2';
import { buildCampusS3, S3_COOP_LIPS, S3_DOORS, S3_HIDESPOTS, S3_L1, S3_LASERS, S3_NAV_SEEDS, S3_PANELS, S3_PICKUPS, S3_ROOMS, S3_SWITCHES } from './campusS3';
import { dressS3, HERO_S3, S3_ART_TAGS } from './campusS3Dress';

const PI = Math.PI;

/*
 * Section 3 data (the lab block; `docs/sector-redesign/SPEC.md` "S3"; `campusS3.ts` builds it), moved out of
 * `campusSectors.ts` by campus-greybox P0 so each section's data lives in its own file (`S3_PARTS`).
 */

const Y1 = S3_L1;

/**
 * Section 3's guards (16; SPEC "S3" table; officer = pistolSd, grunt = rifle, enforcer = pistolSd + shield). No choke
 * guard (A60). `y` is the L1 floor for the L1 guards. Dormant (A64 / A99, far from every route; data only): #12 (the security room, off
 * the north corridor's east end) and #14 (the east yard, outside the building). The values the SPEC left open (posts,
 * yaws, waits) are in `docs/sector-redesign/checks/slice3-build.md`.
 */
export const S3_GUARDS: SectorGuard[] = [
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
  // coop4 A8: spawned only for a team of 3 / 4 (`minPlayers`); appended, so the base list keeps its numbers
  // 17 the fourth hall patrol (3+): the same loop as #6 and #7, from the fourth corner
  { kind: 'grunt', x: 37, z: -23, yaw: -PI / 2, route: [[37, -23], [28, -23], [28, -13], [37, -13]], waits: [2.5, 0.5, 0.5, 2.5], faces: [-PI / 2, 0, PI / 2, PI], takedownSpot: [37, -13], role: 'patrol', zone: 's3-hall', squad: 2, minPlayers: 3, reason: 'Hall crossing (the loud route, the south strip of the stealth one): 3+ players cross it together, so a third patrol walks the chamber round from the fourth corner' },
  // 18 the second dock patrol (4+): the dock door <-> the gas cage round from the cage end
  { kind: 'grunt', x: 38.9, z: -4.6, yaw: -PI / 2, route: [[38.9, -4.6], [25, -4.5]], waits: [4, 4], faces: [PI / 2, PI], takedownSpot: [25, -4.5], role: 'patrol', zone: 's3-dock', squad: 3, minPlayers: 4, reason: 'The dock is the exit leg of all three routes: with 4 players two hold the stair lobby while two run the C3 door, so a second dock patrol walks it from the cage end' },
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
export const S3_ROUTES: SectorDef['routes'] = [
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
export const S3_CAMERAS: SecurityData['devices'] = [
  // at the viewing corridor's store end, facing west down it: the store hatch and the corridor end; the back corridor is behind its wall; bulletproof (E8, A95: shots ricochet, jam it or slip the sweep); cam-dock stays shootable
  { id: 'cam-view', kind: 'camera', level: 's3-l1', at: [51.7, -7.0], y: 2.8, aim: 6, range: 10, facing: 270, reason: 'S3: the prototype store hatch and the viewing corridor', section: 2, bulletproof: true },
  // over the dock door (C3), fixed, facing in: the dock floor in front of the door
  { id: 'cam-dock', kind: 'camera', level: 'ground', at: [24, -0.4], y: 3.2, aim: 6, range: 10, facing: 180, reason: 'S3: the goods-in dock door', section: 2 },
];

/** Section 3's alarm panels: alarm-dock at the dock desk (north wall), alarm-sec in the security room (L1, west wall). */
export const S3_ALARMS: CampusAlarm[] = [
  { at: [32.6, -0.2], yaw: PI, section: 2 },
  { at: [52.2, -4.0], yaw: PI / 2, section: 2, y: Y1 },
];

/** Section 3's security desks (none yet). */
export const S3_DESKS: SecurityDesk[] = [];

/**
 * Section 3's sector (slice 3, SPEC "S3"): 16 armed Larchmont guards, cam-view and cam-dock, the first lasers (las-gown,
 * las-store, `campusS3.ts`), alarm-dock and alarm-sec, the prototype grab, C3. No choke (A60).
 */
export const S3_SECTOR: SectorDef = {
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
};

/** (campus-greybox P0) Section 3's parts for the map (`campusSections.ts`). */
export const S3_PARTS: CampusSectionParts = {
  build: buildCampusS3,
  spawns: [],
  pickups: S3_PICKUPS,
  hideSpots: S3_HIDESPOTS,
  switches: S3_SWITCHES,
  rooms: S3_ROOMS,
  navSeeds: S3_NAV_SEEDS,
  lasers: S3_LASERS,
  panels: S3_PANELS,
  boards: [],
  sector: S3_SECTOR,
  cameras: S3_CAMERAS,
  desks: S3_DESKS,
  levels: { 's3-l1': S3_L1 },
  alarms: S3_ALARMS,
  coopLips: S3_COOP_LIPS,
  dress: dressS3,
  artTags: S3_ART_TAGS,
  hero: HERO_S3,
};
