// (campus-greybox, v2 lane S1) Copied from `campusS1Data.ts` at P0; the S1 lane's greybox. Built only when `flags.campusV2` names 1.
import type { SectorDef, SectorGuard } from '../../../game/sectors';
import type { SecurityDesk } from '../../../game/sectorDesks';
import type { SecurityData } from '../../../security/data';
import type { CampusAlarm, CampusSectionParts } from '../campusParts';
import { buildCampusS1, C1_BOX, S1_COOP_LIPS, S1_DOORS, S1_HIDESPOTS, S1_NAV_SEEDS, S1_PICKUPS, S1_ROOMS, S1_SPAWNS, S1_SWITCHES } from './s1';
import { dressS1, HERO_S1, S1_ART_TAGS } from './s1Dress';

const PI = Math.PI;

/*
 * Section 1 data (the gatehouse, car park and forecourt; `docs/sector-redesign/SPEC.md` "S1"), moved out of
 * `campusSectors.ts` by campus-greybox P0 so each section's data lives in its own file (`S1_PARTS`).
 *
 * Walk speeds (m/s) in the cycle arithmetic: a plain route walks at walkSpeed x 1.1 (grunt 0.99, officer 0.935, enforcer 0.88);
 * a timed `loop` at walkSpeed (grunt 0.9, officer 0.85). Each cycle is 25-45 s (`tests/campusS1.test.ts`).
 */

/** Section 1's guards (SPEC "S1" guard table; kinds and weapons as listed: officer = pistolSd, grunt = rifle). */
export const S1_GUARDS: SectorGuard[] = [
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

/** Section 1's cameras (range 8-12, `aim` on the protected floor point, a `reason`); live only in their own section. */
export const S1_CAMERAS: SecurityData['devices'] = [
  // fixed, faces south down the lane: the verge and the rear window are behind it
  { id: 'cam-gate', kind: 'camera', level: 'ground', at: [11, -77.9], y: 3.0, aim: 6, range: 10, facing: 180, reason: 'S1: the barrier and the gatehouse door (the insurer asks for an ANPR / tailgating camera)', section: 0 },
  // under the canopy soffit: sweeps 40 degrees south-west to south, 8 m out; cannot see the canopy top
  { id: 'cam-walk', kind: 'camera', level: 'ground', at: [-17, -34.5], y: 3.4, aim: 8, range: 10, facing: 205, sweep: [185, 225], reason: 'S1: the walkway from the car park to the staff door', section: 0 },
];

/** Section 1's security desks (none yet). */
export const S1_DESKS: SecurityDesk[] = [];

/** Section 1's alarm panel: the gatehouse's, by its door, facing into the room. */
export const S1_ALARMS: CampusAlarm[] = [{ at: [15.0, -73.3], yaw: PI, section: 0 }];

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
  objective: { kind: 'download', label: "Download tonight's visitor list and the courier badge template", x: 19.3, y: 0, z: -77.3, yaw: PI / 2 },
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
};

/** (campus-greybox P0) Section 1's parts for the map (`campusSections.ts`). */
export const S1_PARTS: CampusSectionParts = {
  build: buildCampusS1,
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
export const S1_V2_COPY = true;
