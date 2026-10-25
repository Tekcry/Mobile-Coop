// (campus-greybox, v2 lane S3) The lab block's sector data: the 20 guards, the routes and the sector (sub-lane r5, slice R5;
// brief `docs/campus-greybox/briefs/S3.md` section 4 "R5"). Built only when `flags.campusV2` names 3.
import type { RoutePt, SectorDef, SectorGuard } from '../../../game/sectors';
import type { CampusSectionParts } from '../campusParts';
import { C2_FLOOR } from '../campusS2';
import { buildCampusS3, S3_BOARDS, S3_COOP_LIPS, S3_DOORS, S3_HIDESPOTS, S3_L1, S3_LASERS, S3_NAV_SEEDS, S3_PANELS, S3_PICKUPS, S3_ROOMS, S3_SWITCHES } from './s3';
import { S3_ALARMS, S3_CAMERAS, S3_DESKS, S3_INTEL, S3_KEYPADS } from './s3Devices';
import { dressS3, HERO_S3, S3_ART_TAGS } from './s3Dress';

const PI = Math.PI;

/*
 * Section 3 data (the lab block re-laid to the signed plan, sector-redesign-signoff 7c021f01 `S3-detail.md` "6. Guards per
 * space"; brief R5 table). Sources: D = `S3-detail.md`, P0 / P45 = the plan sheets, CS = `campusSectors.ts` at 6c3f4a87
 * (the as-built S3 rows). Numbers marked "derived" follow the rule given beside them (brief section 7, B7).
 */

const Y1 = S3_L1;
/** Top of every fire stair's half landing: flight 1's 13 of the 27 risers to L1 (R3, GR:236). */
const HALF = (S3_L1 * 13) / 27;

/**
 * Section 3's guards (20, D:167; was 16). Officer = pistolSd, grunt = rifle, no enforcers, no dogs. Array index = number - 1;
 * `pair` = the partner's index. None dormant (AS4: every guard is awake now). One posted choke: #9 at the dock desk, the C3
 * door 2.5 m behind him (D:101, the reversal of SPEC A60). Plain routes walk at grunt 0.99 / officer 0.935 m/s, the timed
 * loop (#2-#3) at 0.9 / 0.85 (CS:28). Squads per space as built: hall 2, dock 3, L1 1, #12 / #14 / #19 4. Takedown spots
 * (derived): on nav within 1.0 m of the post or a route end, beside or behind the guard, never in front of him.
 */
export const S3_GUARDS: SectorGuard[] = [
  // 1 the bridge landing officer (L1): posted facing the C2 door (yaw atan2(10 - 12.8, -14 + 17), derived; D:175, P45:120)
  { kind: 'officer', x: 12.8, y: Y1, z: -17, yaw: -0.751, takedownSpot: [13.2, -17.4], role: 'bridge', zone: 's3-c2', squad: 1, reason: 'Checks cards from the HQ side at the bridge landing' },
  // 2-3 the viewing-corridor pair (L1): a timed back-and-forth on the as-built 40 s clock, x 32..46 (P5), side by side,
  // facing each other across the corridor at each stop (D:178, P45:122-124)
  {
    kind: 'officer',
    x: 32,
    y: Y1,
    z: -8.6,
    yaw: PI,
    route: [[32, -8.6], [46, -8.6]],
    faces: [PI, PI],
    loop: { period: 40, leave: [3.5, 23.5], t0: 0 },
    takedownSpot: [32, -8.1],
    role: 'patrol',
    zone: 's3-view',
    squad: 1,
    pair: 2,
    reason: 'The prototype is in the building tonight: the corridor round is doubled',
  },
  {
    kind: 'grunt',
    x: 32,
    y: Y1,
    z: -9.6,
    yaw: 0,
    route: [[32, -9.6], [46, -9.6]],
    faces: [0, 0],
    loop: { period: 40, leave: [3.5, 23.5], t0: 0 },
    takedownSpot: [32, -10.1],
    role: 'patrol',
    zone: 's3-view',
    squad: 1,
    pair: 1,
    reason: 'Walks the viewing corridor with the officer (the doubled round)',
  },
  // 4 the gowning sentry (L1): posted by the pass-through, facing it (the as-built offset, CS:185; D:181, P45:127)
  { kind: 'grunt', x: 36.7, y: Y1, z: -1.0, yaw: 2.761, takedownSpot: [36.3, -0.9], role: 'sentry', zone: 's3-gown', squad: 1, reason: 'Nobody enters the clean room at night' },
  // 5 the store keyholder (L1): posted at the store hatch, facing west down the corridor (D:178)
  { kind: 'officer', x: 49.6, y: Y1, z: -8.3, yaw: -PI / 2, takedownSpot: [50.1, -8.3], role: 'keyholder', zone: 's3-view', squad: 1, reason: 'Holds the store key; signs the board out to the courier at 06:00' },
  // 6-7 the test-hall patrols: one loop round the chamber (the as-built rectangle, P3), opposite phase, the same direction (D:176)
  { kind: 'grunt', x: 28, z: -23, yaw: 0, route: [[28, -23], [28, -13], [37, -13], [37, -23]], waits: [0.3, 0.3, 1.5, 1.5], faces: [0, PI / 2, PI, -PI / 2], takedownSpot: [37, -23], role: 'patrol', zone: 's3-hall', squad: 2, reason: 'The test-hall floor round' },
  { kind: 'grunt', x: 37, z: -13, yaw: PI, route: [[37, -13], [37, -23], [28, -23], [28, -13]], waits: [1.5, 1.5, 0.3, 0.3], faces: [PI, -PI / 2, 0, PI / 2], takedownSpot: [37, -13], role: 'patrol', zone: 's3-hall', squad: 2, reason: 'The test-hall floor round, on the far side of the chamber from his partner' },
  // 8 the burn-in watcher: the racks (24 s, the EMC room hides him from the west), the log desk (5 s), 43.2 s (D:176, CS:192).
  // R5-A1 (derived): the log desk now stands 0.85 m off the hall's new north wall (z -11), too tight for the nav grid, so he
  // reads it from its open south side (a nav cell 0.45 m off its edge, facing north); the 2 m shorter leg is given back at the
  // racks (20 -> 24 s) to keep D's 43 s
  { kind: 'grunt', x: 49.4, z: -20, yaw: PI / 2, route: [[49.4, -20], [47.5, -13.25]], waits: [24, 5], faces: [PI / 2, 0], takedownSpot: [49.4, -20], role: 'watch', zone: 's3-hall', squad: 2, reason: 'Logs the rack temperatures of the overnight burn-in test' },
  // 9 the dock officer: the posted choke at the dock desk, facing south into the dock, the C3 door behind him (D:101, D:177).
  // R5-A2 (derived): 0.5 m off the desk's south edge (z -3.1, not -3.0): at 0.4 his nav cell is inside the desk's clearance
  { kind: 'officer', x: 24.5, z: -3.1, yaw: PI, takedownSpot: [25.4, -3.1], post: { leash: 5, guards: 'c3-door' }, role: 'posted', zone: 's3-dock', squad: 3, reason: 'Waits at the dock desk for the 03:00 courier; nobody passes the goods door' },
  // 10 the dock patrol: the roller door <-> behind the gas cage (36 s, stops 9.85 s: P6; D:177, P0:116)
  { kind: 'grunt', x: 21.5, z: -8.5, yaw: PI, route: [[21.5, -8.5], [14.5, -4.5]], waits: [9.85, 9.85], faces: [PI, -0.785], takedownSpot: [14.85, -4.85], role: 'patrol', zone: 's3-dock', squad: 3, reason: 'Checks the gas-cage padlock each round' },
  // 11 the stair tour: the west stair foot <-> the roller door's hall side, clocking each (~40 s by the nav path round the
  // west core, P4; D:176)
  { kind: 'officer', x: 13, z: -20.05, yaw: 0, route: [[13, -20.05], [21.5, -11.6]], waits: [4, 4], faces: [0, PI], takedownSpot: [13, -20.55], role: 'tour', zone: 's3-hall', squad: 2, reason: 'The clocking round of the west stair and the goods door' },
  // 12 the security room operator (L1): the monitors (26 s), the kettle (4 s), 41.4 s; awake (the desk is a sync node; D:182,
  // P45:131). R5-A2 (derived): the kettle stop 0.5 m off R2's kettle counter (z -12.7, not -12.5: the counter stands 0.3 in
  // front of the table's stop, inside his 0.32 radius)
  { kind: 'officer', x: 58, y: Y1, z: -15, yaw: PI / 2, route: [[58, -15], [62.8, -12.7]], waits: [26, 4], faces: [PI / 2, 0], takedownSpot: [62.8, -13.2], role: 'operator', zone: 's3-sec', squad: 4, reason: 'Watches the lab cameras; the kettle is across the room' },
  // 13 the write-up officer (L1): posted at his desk facing the corridor glass (D:181, P45:134)
  { kind: 'officer', x: 24.6, y: Y1, z: -4.2, yaw: PI, takedownSpot: [24.6, -3.7], role: 'desk', zone: 's3-writeup', squad: 1, reason: "Reads tonight's test reports over the radio" },
  // 14 the plant patrol: the chillers <-> the isolator board, 38 s (moved from the sealed yard; D:184, P0:122)
  { kind: 'grunt', x: 56, z: -27, yaw: PI, route: [[56, -27], [56, -12]], waits: [3.85, 3.85], faces: [PI, 0], takedownSpot: [56, -26.5], role: 'patrol', zone: 's3-plant', squad: 4, reason: 'Walks the plant room: the chillers and the isolator board' },
  // 15 the shift supervisor (L1): the corridor <-> the security room door, 40 s, 1.5 m south of #5's post (P7; D:179)
  { kind: 'officer', x: 44, y: Y1, z: -9.8, yaw: -PI / 2, route: [[44, -9.8], [58.6, -9.8]], waits: [4, 4.8], faces: [-PI / 2, PI], takedownSpot: [44.5, -9.8], role: 'supervisor', zone: 's3-east', squad: 1, reason: 'Visits every post on L1 and checks in with the security room' },
  // 16 the crane-bay sentry: a sweep at (20, -17), +-50 degrees, 12 s each way (D:176, P0:125, CS:208)
  { kind: 'grunt', x: 20, z: -17, yaw: PI / 2 - 0.87, route: [[20, -17], [20, -19]], waits: [12, 12], faces: [PI / 2 - 0.87, PI / 2 + 0.87], takedownSpot: [19.4, -17.4], role: 'sentry', zone: 's3-hall', squad: 2, reason: 'Minds the crane bay and the west stair door' },
  // 17 the EMC door sentry (new): posted at the shielded room, his back to it (D:176, P0:129)
  { kind: 'grunt', x: 45, z: -15, yaw: 0, takedownSpot: [44.4, -15.3], role: 'sentry', zone: 's3-hall', squad: 2, reason: 'The EMC test is running: nobody opens the shielded room' },
  // 18 the goods-door watch (new): posted inside the dock, facing the roller door (D:177, P0:131)
  { kind: 'grunt', x: 22.5, z: -9.6, yaw: PI, takedownSpot: [22.5, -9.1], role: 'watch', zone: 's3-dock', squad: 3, reason: 'Watches the goods door into the test hall' },
  // 19 the control-room officer (new): posted at the consoles, facing the windows (D:183, P0:136)
  { kind: 'officer', x: 41, z: -9.6, yaw: PI, takedownSpot: [41, -9.1], role: 'console', zone: 's3-control', squad: 4, reason: 'Minds the test consoles through the control-room windows' },
  // 20 the courier escort (new): talks with #9 at the desk (28.5 s), checks the C3 door (6 s), 40 s (D:177, P0:133)
  { kind: 'officer', x: 26, z: -2.2, yaw: -2.06, route: [[26, -2.2], [24, -0.6]], waits: [28.5, 6], faces: [-2.06, 0], takedownSpot: [24, -1.1], role: 'escort', zone: 's3-dock', squad: 3, reason: 'Escorts the 03:00 courier: talks with the desk, checks the goods door' },
];

/** (brief R5 "Routes") Into the lab block from C2: the bridge, the C2 far door, the landing (every route opens with it). */
const S3_ENTRY: readonly RoutePt[] = [[7, -14, C2_FLOOR], [11.2, -14, Y1], [11.6, -18.5, Y1]];

/** The way out every S3 route shares (after the grab): the store front bay, the hatch, the corridor, the north stair down,
 *  the dock, the C3 door, into C3. */
const S3_EXIT: readonly RoutePt[] = [
  [52.2, -3.4, Y1],
  [49.6, -5.6, Y1],
  [49.6, -8.6, Y1],
  [31.6, -8.3, Y1],
  [31.6, -6.2, Y1],
  [31.75, -1.35, HALF],
  [31, -6.2, 0],
  [28.8, -6, 0],
  [24, -1, 0],
  [24, 1],
  [24, 8],
];

/** The grab point (on nav, 0.6 m short of the objective, the shelf in front of it) and the point before it, west of
 *  las-store's line x 53 in the aisle gap's row (every route crosses the beams). */
const GRAB: RoutePt = [56.4, -3.8, Y1];
const GAP_W: RoutePt = [52.2, -3.4, Y1];

/** "The south strip and the clean suite" (shadow): the west stair down, the low aisle, the south strip, round the EMC room,
 *  the control room, the north stair up, the gowning room, las-gown, the clean room, the airlock, las-store. */
const R_SHADOW: readonly RoutePt[] = [
  ...S3_ENTRY,
  [13, -20.05, Y1],
  [15.3, -20.15, Y1],
  [15.75, -15.35, HALF],
  [16.2, -20.15, 0],
  [12.8, -20.05, 0],
  [12, -25.5, 0],
  [23.5, -27.3, 0],
  [40, -27.3, 0],
  [49.3, -25, 0],
  [49.3, -13.5, 0],
  [45.5, -13.6, 0],
  [40.6, -12.2, 0],
  [39.4, -9.4, 0],
  [34.6, -6, 0],
  [32.6, -6.2, 0],
  [31.75, -1.35, HALF],
  [31.6, -6.2, Y1],
  [31.6, -8.3, Y1],
  [35.5, -8.3, Y1],
  [35.5, -5.8, Y1],
  [36.3, -3, Y1],
  [38.7, -3, Y1],
  [45.8, -3, Y1],
  [48.2, -3, Y1],
  GAP_W,
  GRAB,
];

/** "The hatch" (loud): the landing's fire door, the corridor past the pair and the keyholder, the store hatch. */
const R_LOUD: readonly RoutePt[] = [...S3_ENTRY, [12, -12.3, Y1], [12, -9.6, Y1], [48.8, -9.2, Y1], [49.6, -5.6, Y1], GAP_W, GRAB];

/** "The crane walkway" (high): the ship ladder, the walkway (6.0), the SE caged ladder, the hall, the control room, the
 *  north stair up, the corridor, the store hatch. */
const R_HIGH: readonly RoutePt[] = [
  ...S3_ENTRY,
  [11.4, -27.5, Y1],
  [11.35, -29.1, Y1],
  [13.2, -29.1, 6],
  [15, -29.1, 6],
  [50.3, -29.1, 6],
  [51, -27.4, 0],
  [49.3, -25, 0],
  [49.3, -13.5, 0],
  [45.5, -13.6, 0],
  [40.6, -12.2, 0],
  [39.4, -9.4, 0],
  [34.6, -6, 0],
  [32.6, -6.2, 0],
  [31.75, -1.35, HALF],
  [31.6, -6.2, Y1],
  [31.6, -8.3, Y1],
  [48.8, -9.2, Y1],
  [49.6, -5.6, Y1],
  GAP_W,
  GRAB,
];

/** "The ceiling void" (secret): the fire door, the goods landing, the racking ladder, the void crawl (7.5, crouch), the
 *  store's lift-out tile, the drop into the front bay. */
const R_VOID: readonly RoutePt[] = [
  ...S3_ENTRY,
  [12, -12.3, Y1],
  [12, -9.6, Y1],
  [12.6, -8.3, Y1],
  [12.6, -5.6, Y1],
  [19.6, -1.6, Y1],
  [20.8, -1, 7.5],
  [49.5, -1.6, 7.5],
  [49.5, -3, Y1],
  GAP_W,
  GRAB,
];

/** The ways in (M8; brief R5 "Routes"): shadow, loud, high and secret, each on to the shared exit. `climbs`: the ladder,
 *  crawl and drop legs the guards' grid does not walk. */
export const S3_ROUTES: SectorDef['routes'] = [
  { name: 'The south strip and the clean suite', pts: [...R_SHADOW, ...S3_EXIT], obj: R_SHADOW.length - 1 },
  { name: 'The hatch', pts: [...R_LOUD, ...S3_EXIT], obj: R_LOUD.length - 1 },
  // the ship ladder (4.5 -> 6.0) and the SE caged ladder (6.0 -> 0)
  { name: 'The crane walkway', pts: [...R_HIGH, ...S3_EXIT], obj: R_HIGH.length - 1, climbs: [S3_ENTRY.length + 1, S3_ENTRY.length + 4] },
  // the racking ladder (4.5 -> 7.5), the crawl, the drop through the tile (7.5 -> 4.5)
  { name: 'The ceiling void', pts: [...R_VOID, ...S3_EXIT], obj: R_VOID.length - 1, climbs: [S3_ENTRY.length + 4, S3_ENTRY.length + 5, S3_ENTRY.length + 6] },
];

/**
 * Section 3's sector (brief R5; shape CS:398-420): 20 armed Larchmont guards, the posted choke at the C3 door, cam-view and
 * cam-dock (looped from the security desk), las-gown and las-store, the store and security room keypads with their code on
 * the sign-out board, alarm-dock and alarm-sec, the prototype grab, C3.
 */
export const S3_SECTOR: SectorDef = {
  id: 's3',
  name: 'Lab block',
  // C2's checkpoint: S2's glazed bridge on L1 (L13: its far door is S3's L1 door at (10, -14))
  start: { x: 7, y: C2_FLOOR, z: -14, yaw: PI / 2 },
  // weapons crate (E9): the glazed bridge south wall, strip to the walkway
  crate: { at: [7, C2_FLOOR, -15.3], yaw: 0 },
  // grab the Tidewater prototype board off the shelf against the store's x 58 wall (L1), past las-store: opens C3 (the
  // as-built grab CS:406 moved with the shelf from x 52 to 58, derived)
  objective: { kind: 'grab', label: 'Take the Tidewater prototype board', x: 57.0, y: S3_L1, z: -3.8, yaw: PI / 2 },
  connector: {
    label: 'Along the dock link to the data hall',
    box: [22, 0, 26, 16],
    nearAt: [S3_DOORS.c3Near[0], S3_DOORS.c3Near[1]],
    farAt: [24, 16],
    checkpoint: { x: 24, y: 0, z: 8, yaw: 0 },
  },
  guards: S3_GUARDS,
  keypads: S3_KEYPADS,
  intel: S3_INTEL,
  // stage 2 (SPEC): the dock and the hall's new west entry (the west stair foot), taken in turn (derived)
  reinforce: [[15, -8], [12, -20.05]],
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
  boards: S3_BOARDS,
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

/** (campus-greybox) True while this v2 section is still an exact copy of the live one (`tests/campusV2.test.ts`
 *  checks it equals v1); the lane sets it false with its first layout change. */
export const S3_V2_COPY = false;
