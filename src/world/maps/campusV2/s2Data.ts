// (campus-greybox, v2 lane S2) Copied from `campusS2Data.ts` at P0; the S2 lane's greybox. Built only when `flags.campusV2` names 2.
import type { SectorDef, SectorGuard } from '../../../game/sectors';
import type { SecurityDesk } from '../../../game/sectorDesks';
import type { SecurityData } from '../../../security/data';
import type { CampusAlarm, CampusSectionParts } from '../campusParts';
import { buildCampusS2, C2_BOX, C2_FLOOR, S2_BOARDS, S2_COOP_LIPS, S2_DOORS, S2_HIDESPOTS, S2_NAV_SEEDS, S2_PICKUPS, S2_ROOMS, S2_SWITCHES } from './s2';
import { dressS2, HERO_S2, S2_ART_TAGS } from './s2Dress';

const PI = Math.PI;

/*
 * Section 2 data (the HQ atrium and offices; `docs/sector-redesign/SPEC.md` "S2"), moved out of `campusSectors.ts` by
 * campus-greybox P0 so each section's data lives in its own file (`S2_PARTS`).
 */

/**
 * Section 2's guards (SPEC "S2" guard table; officer = pistolSd, grunt = rifle). Floors: G 0, L1 4.4, L2 8.4 (`y`). The
 * 0-based index in this list is the guard's number minus one. #10 and #12 are far from every route (`dormant`, A64 / A99:
 * data for a later far-guard sleep step, read by no code yet).
 */
export const S2_GUARDS: SectorGuard[] = [
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

/** Section 2's cameras (range 8-12, `aim` on the protected floor point, a `reason`); live only in their own section. */
export const S2_CAMERAS: SecurityData['devices'] = [
  // S2: on the foyer's west wall, faces east along the turnstile line; the post room door is in the same wall behind it
  { id: 'cam-turnstile', kind: 'camera', level: 'ground', at: [-29.7, -24.2], y: 3.2, aim: 7, range: 8, facing: 90, reason: 'S2: the turnstile line (tailgating at the front of house)', section: 1 },
  // S2: in the G lift lobby, faces the dummy lift doors; the fire stairs are not on CCTV
  { id: 'cam-lift', kind: 'camera', level: 'ground', at: [-31, -4.4], y: 3.0, aim: 7, range: 8, facing: 250, reason: 'S2: the lifts, the way to the executive suite (a laptop was taken that way)', section: 1 },
  // S2: over the card door inside the bridge landing, faces west down the landing; sees the doorways, not the NE stair door 14 m along
  { id: 'cam-bridge', kind: 'camera', level: 'l1', at: [3.7, -13], y: 3.0, aim: 6, range: 9, facing: 270, reason: "S2: the bridge door and landing (the lab block's only link)", section: 1 },
];

/** Section 2's security desks (none yet). */
export const S2_DESKS: SecurityDesk[] = [];

/** Section 2's alarm panels: alarm-rcp on the foyer's east wall by the reception, alarm-brg on the bridge landing's east wall by the card door (both beside posted guards). */
export const S2_ALARMS: CampusAlarm[] = [
  { at: [-8.3, -24.4], yaw: -PI / 2, section: 1 },
  { at: [3.7, -15.3], yaw: -PI / 2, section: 1, y: 4.4 },
];

/** Section 2's sector (slice 2): the HQ atrium and offices, C2 the glazed bridge on L1. */
export const S2_SECTOR: SectorDef = {
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
};

/** (campus-greybox P0) Section 2's parts for the map (`campusSections.ts`). */
export const S2_PARTS: CampusSectionParts = {
  build: buildCampusS2,
  spawns: [],
  pickups: S2_PICKUPS,
  hideSpots: S2_HIDESPOTS,
  switches: S2_SWITCHES,
  rooms: S2_ROOMS,
  navSeeds: S2_NAV_SEEDS,
  lasers: [],
  panels: [],
  boards: S2_BOARDS,
  sector: S2_SECTOR,
  cameras: S2_CAMERAS,
  desks: S2_DESKS,
  levels: { l1: 4.4 },
  alarms: S2_ALARMS,
  coopLips: S2_COOP_LIPS,
  dress: dressS2,
  artTags: S2_ART_TAGS,
  hero: HERO_S2,
};

/** (campus-greybox) True while this v2 section is still an exact copy of the live one (`tests/campusV2.test.ts`
 *  checks it equals v1); the lane sets it false with its first layout change. */
export const S2_V2_COPY = false;
