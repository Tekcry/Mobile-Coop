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
 * Section 2's guards (SPEC "S2" guard table; officer = pistolSd, grunt = rifle). Floors: G 0, L1 4.4, L2 8.4 (`y`).
 * (campus-greybox S2-G6a, `S2-detail.md:247-276`, C7) 18 guards, none dormant; list order #1-#14 then #18-#21 (the plan's
 * numbers: the index stops being the number minus one after #14), each number in its comment. Squads by area: 0 G,
 * 1 the east wing, 2 the L1 plan, 3 L2. New guards' first yaw faces their second route point (BA11). The torch round
 * (#19, AS14) is the archetype's flashlight: no new gear. Two tagged 3-4 player extras come with TAG-2 (#317).
 */
export const S2_GUARDS: SectorGuard[] = [
  // #1 (0) the reception officer: at the desk, facing the turnstiles; watches cam-turnstile / cam-lift; answers the atrium panel
  { kind: 'officer', x: -20, z: -24.9, yaw: 0, takedownSpot: [-20, -25.6], role: 'reception', zone: 'reception', squad: 0, reason: 'Front of house: watches the turnstile line and the lift lobby monitors' },
  // #2 (1) the lobby patrol: the hall's west side between #1's desk (a 4 s pair stop) and the lift lobby door, 42 s
  { kind: 'grunt', x: -24, z: -24.8, yaw: PI / 2, route: [[-24, -24.8], [-29, -8.5]], waits: [4, 4], faces: [PI / 2, 0], takedownSpot: [-29, -8.5], role: 'patrol', zone: 'lobby', squad: 0, reason: 'Ground-floor round: reception, the cafe and the lift lobby' },
  // #3 (2) the L1 balcony officer: back and forth along the north edge, looks down into the atrium at each end, 36 s
  { kind: 'officer', x: -24.5, z: -2.7, y: 4.4, yaw: PI, route: [[-24.5, -2.7], [-11.5, -2.7]], waits: [4, 4], faces: [PI, PI], takedownSpot: [-24.5, -2.7], role: 'balcony', zone: 'l1-balcony', squad: 2, reason: 'Looks down into the atrium from each end of the L1 balcony' },
  // #4 (3) the L2 balcony grunt: the opposite side, opposite phase (starts at the east end), covers #3 across the void
  { kind: 'grunt', x: -11.5, z: -21.3, y: 8.4, yaw: 0, route: [[-11.5, -21.3], [-24.5, -21.3]], waits: [4, 4], faces: [0, 0], takedownSpot: [-11.5, -21.3], role: 'balcony', zone: 'l2-balcony', squad: 3, reason: 'Watches the L1 balcony across the void' },
  // #5 (4), #6 (5) the coffee pair in the kitchen: one 34 s master-clock loop of a 4 x 3 m rectangle, a row apart, facing each other at each stop
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
  // #7 (6) the facilities officer: at the BMS desk (28 s), to the plotter (6 s), 43 s
  { kind: 'officer', x: -6.5, z: 2.9, y: 4.4, yaw: 0, route: [[-6.5, 2.9], [-2.5, 4.2]], waits: [28, 6], faces: [0, 0], takedownSpot: [-2.5, 4.2], role: 'desk', zone: 'facilities', squad: 1, reason: 'Night facilities duty: sets the lighting schedule, prints the plant log' },
  // #8 (7) the comms checker: the facilities door, the comms room panel stop, the pair-door corner (Q2: moved from z -16.5 to -14.5), 44.4 s
  { kind: 'grunt', x: -4, z: -1.5, y: 4.4, yaw: 0, route: [[-4, -1.5], [2.2, -6.5], [-4, -14.5]], waits: [3, 7, 3], faces: [0, PI / 2, PI], takedownSpot: [2.2, -6.5], role: 'patrol', zone: 'comms', squad: 1, reason: 'Reads the UPS panel in the comms room each round and glances at the facilities door' },
  // #9 (8) the L2 stair tour: the SW fire door to the lift lobby (the NE door is 45 m away: a 44 s loop cannot clock both), 43 s
  { kind: 'officer', x: -37.5, z: -23.5, y: 8.4, yaw: PI, route: [[-37.5, -23.5], [-33.5, -8.5]], waits: [5, 5], faces: [PI, 0], takedownSpot: [-37.5, -23.5], role: 'patrol', zone: 'l2-stairs', squad: 3, reason: 'Clocking round: the fire door and the lift lobby' },
  // #10 (9) the L2 lift sentry: sweeps the lobby and the corridor to the executive suite (12 s each way); awake now
  { kind: 'grunt', x: -35, z: -7, y: 8.4, yaw: -1, route: [[-35, -7], [-33, -7]], waits: [12, 12], faces: [-1, 1], takedownSpot: [-34, -7], role: 'sentry', zone: 'l2-lift', squad: 3, reason: 'Watches the corridor to the executive suite' },
  // #11 (10) the bridge officer (K2, M12): posted in the bridge landing at (1.5, -15.8), facing the comms door (north), the pg-brg door 90 degrees off his facing
  { kind: 'officer', x: 1.5, z: -15.8, y: 4.4, yaw: 0, takedownSpot: [1.5, -16.5], post: { leash: 5, guards: 'c2-door' }, role: 'posted', zone: 'c2', squad: 1, reason: 'The only internal link to the lab block: he checks every card' },
  // #12 (11) the mailroom guard: posted at the goods door, facing into the room; awake now (cage 3 behind his left shoulder)
  { kind: 'grunt', x: -42.5, z: -16, yaw: PI / 2, takedownSpot: [-43.2, -16], role: 'post', zone: 'goods', squad: 0, reason: "Takes the courier's paperwork at the goods door" },
  // #13 (12) NEW the cafe round: the cafe to the NE lobby (the NE stair door), 4 s stops, 44.4 s; dark at the NE lobby end
  { kind: 'grunt', x: -20, z: 2, yaw: PI / 2, route: [[-20, 2], [-2, 2]], waits: [4, 4], takedownSpot: [-2, 2], role: 'patrol', zone: 'cafe', squad: 0, reason: 'Cafe and NE lobby round: checks the NE fire-stair door' },
  // #14 (13) NEW the atrium sentry at the feature-stair foot: faces south, 60 degrees either side, 12 s (BA12), 28.3 s
  { kind: 'officer', x: -19, z: -8.5, yaw: PI / 2, route: [[-19, -8.5], [-17, -8.5]], waits: [12, 12], faces: [PI - 1.05, PI + 1.05], takedownSpot: [-18, -8.5], role: 'sentry', zone: 'atrium', squad: 0, reason: 'Watches the hall and the feature stair, the loud way up' },
  // #18 (14) NEW the L1 west plan: the SW fire door, MR1, the north end (the mail-lift hatch), 4 s stops, 41.7 s
  { kind: 'grunt', x: -38, z: -21, y: 4.4, yaw: Math.atan2(5, 5), route: [[-38, -21], [-33, -16], [-32, -8]], waits: [4, 4, 4], takedownSpot: [-32, -8], role: 'patrol', zone: 'l1-west', squad: 2, reason: 'Checks the west plan, the meeting room and the mail-lift hatch' },
  // #19 (15) NEW the L1 north plan torch round: MR2 to the strip (Q2: the east end moved from x -9 to -22), 4 s stops, 44.4 s (AS14)
  { kind: 'officer', x: -39, z: -1.5, y: 4.4, yaw: PI / 2, route: [[-39, -1.5], [-22, -1.5]], waits: [4, 4], takedownSpot: [-39, -1.5], role: 'patrol', zone: 'l1-north', squad: 2, reason: 'Torch round of the dark north plan and the meeting rooms' },
  // #20 (16) NEW the relief: the NE stair door to the facilities door, 7 s stops (Q2: 6 -> 7), 26.2 s; chats with #8
  { kind: 'officer', x: 1.2, z: -2.7, y: 4.4, yaw: Math.atan2(-5.7, 0.5), route: [[1.2, -2.7], [-4.5, -2.2]], waits: [7, 7], takedownSpot: [1.2, -2.7], role: 'patrol', zone: 'wing', squad: 1, reason: 'Relieves the bridge officer and chats with the comms checker' },
  // #21 (17) NEW the L2 north strip: the exec east door (Q2: from x -29 to -27) to the east wing north door, 4 s stops, 44.4 s
  { kind: 'grunt', x: -27, z: -1.5, y: 8.4, yaw: PI / 2, route: [[-27, -1.5], [-9, -1.5]], waits: [4, 4], takedownSpot: [-9, -1.5], role: 'patrol', zone: 'l2-north', squad: 3, reason: 'North strip round: the board room door and the executive suite' },
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

/** Section 2's security desks. */
export const S2_DESKS: SecurityDesk[] = [
  // (S2-G5a, `S2-detail.md:179`) the CCTV patch panel on the comms room's cabinet wall; operator #8 (index 7) at his panel stop (2.2, -6.5)
  { id: 'desk-comms2', section: 1, at: [3.6, -6.5], y: 4.4, yaw: -PI / 2, cameras: ['cam-turnstile', 'cam-lift', 'cam-bridge'], operator: 7 }, // sync-s2-comms
];

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
  // (S2-G5a) the office's two doors are keypad doors (kp-fac): the code is overheard at the kitchen door
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
  // (S2-G5a) the Split Shift devices ("Approve as drawn"): data only (EW5 keypads, intel, E3 pair gates; `sectors.ts`)
  keypads: [
    { at: [-4, -1], code: 's2-fac-code' }, // sync-s2-kpfac (kp-fac): the wing door
    { at: [-7.5, 3], code: 's2-fac-code' }, // sync-s2-kpfac (kp-fac): the west door from the north plan (Q1 default: both)
  ],
  intel: [
    // the overhear: a 2 x 2 box outside the kitchen west door (-31, -26), the coffee pair #5 / #6 talking (BA13 line)
    { kind: 'overhear', grants: 's2-fac-code', line: 'Kitchen: the facilities keypad code, overheard.', box: [-32, -27, -30, -25], floorY: 4.4, talkers: [4, 5] }, // sync-s2-kitchen
    // the plant log in parcel cage 3 (-41.5, 0, -18.5), read from the aisle north of it (BA13 line)
    { kind: 'board', grants: 's2-board', line: 'Plant log: east-wing breaker, plant room switchgear.', at: [-41.5, 0, -18.5], yaw: 0 }, // sync-s2-plantlog
  ],
  pairGates: [
    { door: [-2.5, -16], a: { at: [-3.1, -16.8], yaw: -PI / 2 }, b: { at: [-1.9, -9.9], yaw: PI / 2 } }, // sync-s2-pairdoor (pg-brg, two players, Q21)
    { door: [-33, -4], a: { at: [-34.8, -4.6], yaw: PI }, b: { at: [-31.2, -4.6], yaw: PI } }, // pg-exec (two players, Q21)
  ],
  // (S2-G6b, M8) the three routes on the v2 doors, at the as-built offset of 1.2 m each side of a door centre: the facilities door
  // (-4, -1) z -2.2 / 0.2, the comms door (-2.5, -7.5) x -3.7 / -1.3, the landing's north door (1, -10.5) z -9.3 / -11.7; a route through a
  // keypad door assumes the code (the e2e teleports)
  routes: [
    {
      // stealth (solo): C1, the post room, the SW fire stair, the L1 open plan east of the mail-lift hole and along the north strip (z -1.5,
      // clear of meeting room 3's glass front), in by the west keypad door (-7.5, 3), the terminal, out by the wing door (-4, -1), the wing, the
      // comms room, its door into the landing (facing K2), the bridge landing
      name: 'The post room, the SW stair and the north open plan',
      pts: [[-20, -32], [-20, -28.5], [-26, -27.5], [-33, -27], [-38.4, -24.5], [-38.4, -23], [-40.7, -23], [-40.7, -23, 4.4], [-37.5, -23, 4.4], [-31.4, -20.5, 4.4], [-31.4, -8, 4.4], [-29, -1, 4.4], [-20, -1.5, 4.4], [-12, -1.5, 4.4], [-8.7, 3, 4.4], [-6.3, 3, 4.4], [-6.5, 2.9, 4.4], [-4, 0.2, 4.4], [-4, -2.2, 4.4], [-3.7, -7.5, 4.4], [-1.3, -7.5, 4.4], [1, -9.3, 4.4], [1, -11.7, 4.4], [2.5, -14, 4.4], [6, -14, 4.4]],
      obj: 16,
    },
    {
      // high (solo): the SW stair to the bulkhead, the roof past the atrium roof light, the NE bulkhead down to the L1 wing hall, the
      // facilities office by its wing door, then the stealth way out
      name: 'The SW bulkhead, the roof and the NE bulkhead',
      pts: [[-20, -32], [-20, -28.5], [-26, -27.5], [-33, -27], [-38.4, -24.5], [-38.4, -23], [-40.7, -23], [-40.7, -23, 12.3], [-38.6, -23, 12.3], [-33, -26, 12.3], [-12, -26, 12.3], [-5, -18, 12.3], [-4, -6, 12.3], [1.5, -1.2, 12.3], [1.5, 0.6, 12.3], [1.5, 0.6, 4.4], [1.5, -1.2, 4.4], [-1.5, -3, 4.4], [-4, -2.2, 4.4], [-4, 0.2, 4.4], [-6.5, 2.9, 4.4], [-4, 0.2, 4.4], [-4, -2.2, 4.4], [-3.7, -7.5, 4.4], [-1.3, -7.5, 4.4], [1, -9.3, 4.4], [1, -11.7, 4.4], [2.5, -14, 4.4], [6, -14, 4.4]],
      obj: 20,
    },
    {
      // loud: the turnstile gate, the feature stair (two flights and the mid landing) to the L1 south strip, along the strip to the east
      // wing's south door (-7.5, -21), the wing hall north to the facilities door, then the stealth way out
      name: 'The turnstiles, the feature stair and the east wing',
      pts: [[-20, -32], [-20, -28.5], [-20, -24.4], [-20, -22.2], [-18, -9], [-18, -14.1, 2.2], [-18, -19.4, 4.4], [-12, -20.4, 4.4], [-9, -20.4, 4.4], [-6, -21, 4.4], [-5, -12, 4.4], [-4, -3.5, 4.4], [-4, -2.2, 4.4], [-4, 0.2, 4.4], [-6.5, 2.9, 4.4], [-4, 0.2, 4.4], [-4, -2.2, 4.4], [-3.7, -7.5, 4.4], [-1.3, -7.5, 4.4], [1, -9.3, 4.4], [1, -11.7, 4.4], [2.5, -14, 4.4], [6, -14, 4.4]],
      obj: 14,
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
