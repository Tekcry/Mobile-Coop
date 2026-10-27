import type { RoutePt, SectorDef, SectorGuard } from '../../game/sectors';
import type { SecurityData } from '../../security/data';
import type { GearTag } from '../../ai/gear';
import type { SecurityDesk } from '../../game/sectorDesks';
import type { CampusSectionParts } from './campusParts';
import { buildCampusS4, S4_BOARDS, S4_COOP_LIPS, S4_DOORS, S4_HIDESPOTS, S4_LASERS, S4_NAV_SEEDS, S4_PANELS, S4_ROOMS, S4_SWITCHES } from './campusS4';
import { dressS4, HERO_S4, S4_ART_TAGS } from './campusS4Dress';

const PI = Math.PI;

/**
 * Saltmarsh Park (`campusOps`) section 4 sector data (`docs/sector-redesign/briefs/SLICE4.md`): the data hall, 20 armed
 * Larchmont guards incl. the first dog, three bulletproof cameras, the first security desk, the first pair gate (the cage's
 * rear gate), two keypad doors, the dock board, the alarm-stage extras, and the K3 choke (#19 at the C4 gate). Pure data (no
 * Babylon); the mode places the guards and runs the connector, `campusS4.ts` builds the rooms.
 *
 * Walk speeds (m/s) in the cycle arithmetic: a plain route walks at walkSpeed x 1.1 (grunt 0.99, officer 0.935, enforcer 0.88);
 * a timed `loop` at walkSpeed (grunt 0.9, dog 1.1). Each cycle is 25-45 s (`tests/campusS4.test.ts`). Floors: G 0, the NOC 3.6, the deck 7.3 (`y`).
 */

const NOC = 3.6;
const DECK = 7.3;

/** The yard loop (handler and dog share one clock, A87): 17 m, 44 s, the handler at 0.9 m/s stops 3.1 s each end. */
const YARD_LOOP = { period: 44, leave: [3, 25], t0: 0 };
/** The dock pair's loop (staggered trips, A89): 15.1 m, 42 s, stops 4.2 s each end. */
const DOCK_LOOP = { period: 42, leave: [4, 25], t0: 0 };

/** A section guard with its per-slot gear tag (`SquadSlot` has no `gear` field on this branch; the guard-ai wiring reads it off the slot as `GuardSlotTags.gear`, so the tag rides here until the type gains it). */
export type GearGuard = SectorGuard & { gear?: GearTag };

/**
 * Section 4's guards (20; officer = pistolSd, grunt = rifle, enforcer = pistolSd + shield, dog = melee at the handler's heel).
 * The 0-based index in this list is the guard's number minus one. Dormant (A64 / A99, data only): #10, #11 (the hot-aisle checkers)
 * and #16 (the north corridor tour); none is posted, paired, a handler or a dog.
 */
export const S4_GUARDS: GearGuard[] = [
  // 1 the yard handler (L1: the lane is the compound's west side, x 35.3, because the tanks and the generator stand on x 36..39)
  { kind: 'grunt', x: 35.3, z: 27, yaw: 0, route: [[35.3, 27], [35.3, 44]], faces: [0, PI], loop: YARD_LOOP, takedownSpot: [35.3, 44.0], role: 'handler', zone: 'yard', squad: 0, reason: 'Diesel was stolen from the tanks twice' },
  // 2 the dog, at heel (A87): the same loop, one lane over; the handler is #1 (index 0)
  { kind: 'dog', x: 34.8, z: 27, yaw: 0, route: [[34.8, 27], [34.8, 44]], faces: [0, PI], loop: YARD_LOOP, handler: 0, takedownSpot: [34.8, 44.0], role: 'dog', zone: 'yard', squad: 0, reason: 'At heel (A87)' },
  // 3 the yard gate officer: at the gate, facing it, the compound at his back
  { kind: 'officer', x: 37, z: 17.6, yaw: PI, takedownSpot: [37, 18.0], role: 'gate', zone: 'yard', squad: 0, reason: 'Lets the 03:00 courier van in at the yard gate' },
  // 4 the mantrap officer: at the mantrap desk, facing the mantrap door
  { kind: 'officer', x: 6.0, z: 20.2, yaw: PI / 2, takedownSpot: [5.5, 20.2], role: 'mantrap', zone: 'lobby', squad: 1, reason: 'Admits one at a time; answers the hall panel' },
  // gear (stealth over shooting): the two NOC officers and the security room supervisor wear body armour (torso shots only stagger); helmets come from the difficulty and the alarm stage (guard-rules A15)
  // 5-6 the security room pair: the operator at the console, the supervisor beside him
  { kind: 'officer', x: -2.5, z: 44.6, yaw: -PI / 2, takedownSpot: [-2.1, 44.6], role: 'operator', zone: 'sec', squad: 2, reason: 'Watches the hall cameras (desk operator)' },
  { kind: 'officer', x: -1.2, z: 44.0, yaw: -PI / 2 + 0.6, takedownSpot: [-0.8, 44.0], role: 'supervisor', zone: 'sec', squad: 2, gear: 'armour', reason: 'Site supervisor at the monitors' },
  // 7-8 the cold-aisle patrols: a loop each, opposite phase (west aisles, east aisles)
  { kind: 'grunt', x: 3.6, z: 23, yaw: 0, route: [[3.6, 23], [3.6, 33], [9.2, 33], [9.2, 23]], waits: [3, 0.5, 3, 0.5], faces: [0, PI / 2, PI, -PI / 2], takedownSpot: [3.6, 23], role: 'patrol', zone: 'cold-w', squad: 3, reason: 'Floor round, west aisles' },
  { kind: 'grunt', x: 32.7, z: 33, yaw: PI, route: [[32.7, 33], [32.7, 23], [26.8, 23], [26.8, 33]], waits: [3, 0.5, 3, 0.5], takedownSpot: [32.7, 24.0], role: 'patrol', zone: 'cold-e', squad: 3, reason: 'Floor round, east aisles (opposite phase)' },
  // 9 the cage keyholder: at the front gate, under cam-cage
  { kind: 'officer', x: 18, z: 33.0, yaw: PI, takedownSpot: [18, 33.5], role: 'keyholder', zone: 'cage', squad: 3, reason: 'Holds one of the two cage keys; under cam-cage' },
  // 10-11 the hot-aisle checkers (dormant): back and forth along P1 and P4's hot aisles, 6 s at each end
  { kind: 'grunt', x: 0.8, z: 24.7, yaw: 0, route: [[0.8, 24.7], [0.8, 33.0]], waits: [6, 6], takedownSpot: [0.8, 24.7], role: 'checker', zone: 'pod-1', squad: 3, dormant: true, reason: 'Reads the pod thermometers' },
  { kind: 'grunt', x: 24.0, z: 33.0, yaw: PI, route: [[24.0, 33.0], [24.0, 24.7]], waits: [6, 6], takedownSpot: [24.0, 24.7], role: 'checker', zone: 'pod-4', squad: 3, dormant: true, reason: 'Reads the pod thermometers' },
  // 12 the battery checker: the UPS room <-> the battery room through the colonnade doors
  { kind: 'grunt', x: -7, z: 37, yaw: PI, route: [[-7, 37], [-7, 20]], waits: [3, 3], takedownSpot: [-7, 20], role: 'checker', zone: 'batt', squad: 4, reason: 'Reads cell voltages with his torch' },
  // 13 the deck patrol (on the deck): along the chillers' north side, covering the riser hatch
  { kind: 'grunt', x: 12, y: DECK, z: 36, yaw: PI / 2, route: [[12, 36], [30, 36]], waits: [3, 3], takedownSpot: [12, 36], role: 'patrol', zone: 'deck', squad: 5, reason: 'A chiller alarm earlier tonight; covers the riser hatch' },
  // 14-15 the NOC pair (on the mezzanine): at the window over the hall
  { kind: 'officer', x: 1.0, y: NOC, z: 43.0, yaw: PI, takedownSpot: [1.0, 43.5], role: 'noc', zone: 'noc', squad: 2, gear: 'armour', reason: 'Watches the hall from the NOC window' },
  { kind: 'officer', x: 3.0, y: NOC, z: 43.0, yaw: PI, takedownSpot: [3.0, 43.5], role: 'noc', zone: 'noc', squad: 2, gear: 'armour', reason: 'Watches the screens and the hall' },
  // 16 the north corridor tour (dormant): the security room's side door <-> the riser door
  { kind: 'officer', x: 11, z: 45.8, yaw: PI / 2, route: [[11, 45.8], [28, 45.8]], waits: [3, 3], takedownSpot: [20, 45.8], role: 'tour', zone: 'nc', squad: 4, dormant: true, reason: 'Clocking round: the security room side door and the riser door (A94)' },
  // 17-18 the dock pair: a timed loop of the dock (staggered, A89), opposite ends
  { kind: 'grunt', x: 31.8, z: 18.6, yaw: -PI / 2, route: [[31.8, 18.6], [16.2, 20.4]], loop: DOCK_LOOP, takedownSpot: [31.8, 18.6], role: 'dock', zone: 'dock', squad: 1, reason: 'Unloads the 03:00 drives (staggered, A89)' },
  { kind: 'grunt', x: 16.2, z: 18.6, yaw: PI / 2, route: [[16.2, 18.6], [31.8, 20.4]], loop: DOCK_LOOP, takedownSpot: [16.2, 18.6], role: 'dock', zone: 'dock', squad: 1, reason: 'Unloads the drives; alone at the shelf end each trip' },
  // 19 the colonnade sentry (K3, M12): posted at the C4 gate, facing east, the C4 door 1.5 m behind him
  { kind: 'grunt', x: -8.5, z: 29, yaw: PI / 2, takedownSpot: [-9.0, 29], post: { leash: 5, guards: 'c4-gate' }, role: 'posted', zone: 'c4', squad: 4, reason: 'The Old House is closed tonight: nobody goes down the colonnade' },
  // 20 the mobile supervisor: the hall's west aisle, visiting the battery, colonnade and UPS doors
  { kind: 'officer', x: -2.5, z: 23.0, yaw: 0, route: [[-2.5, 23.0], [-2.5, 39.5]], waits: [3, 3], takedownSpot: [-2.5, 23.0], role: 'supervisor', zone: 'hall-w', squad: 3, reason: 'Mobile supervisor: visits the battery, colonnade and UPS doors' },
  // coop4 A8: spawned only for a team of 3 / 4 (`minPlayers`); appended, so the base list keeps its numbers (the desk operator is #5, never tagged)
  // 21 the cage keyholder's second (3+): at the cage front gate, 1.2 m west of the keyholder, under cam-cage
  { kind: 'grunt', x: 16.8, z: 33.0, yaw: PI, takedownSpot: [16.8, 33.0], role: 'sentry', zone: 'cage', squad: 3, minPlayers: 3, reason: 'Cage pair gate (the team door): with 3+ players one pair works the rear gate while another holds the keyholder, so a second guard stands the front gate' },
  // 22 the second battery checker (4+): the UPS room <-> battery room round from the battery end
  { kind: 'grunt', x: -7, z: 20, yaw: 0, route: [[-7, 20], [-7, 37]], waits: [3, 3], takedownSpot: [-7, 20], role: 'checker', zone: 'batt', squad: 4, minPlayers: 4, reason: 'Stealth route (service corridor, battery room, kp-batt): 4 players clear it from both ends, so a second checker walks the battery round from the colonnade end' },
];

/** The exit legs every S4 route shares from the objective: the cage front, the build-out area, the UPS room, the colonnade, C4. */
const EXIT: readonly RoutePt[] = [[18.0, 34.8], [16.6, 33.2], [12.6, 35.5], [5.0, 36.0], [-2.6, 38.0], [-5.4, 38.0], [-7.0, 33.0], [-7.0, 30.9], [-7.6, 29.5], [-9.4, 29.0], [-11.0, 29.0], [-18, 29]];

/**
 * The ways in (M8): stealth through the service corridor, the battery room and the hot aisles (the keypad codes from the dock
 * board); loud through the lobby, the mantrap and the centre aisle; high over the compound, the plant deck and the cable baskets.
 */
export const S4_ROUTES: SectorDef['routes'] = [
  {
    name: 'The service corridor, the battery room and the hot aisles',
    pts: [[24, 8], [24, 14.8], [24, 17.6], [16, 17.2], [12.8, 17.0], [-2.6, 17.0], [-5.4, 17.0], [-7.0, 22.0], [-5.4, 25.0], [-2.6, 25.0], [-2.5, 23.0], [6.4, 23.0], [6.4, 24.7], [6.4, 31.3], [6.4, 33.0], [12.6, 33.2], [16.6, 33.2], [18.0, 34.8], [18.0, 37.3], ...EXIT],
    obj: 18,
  },
  {
    name: 'The lobby, the mantrap and the centre aisle',
    pts: [[24, 8], [24, 14.8], [24, 17.6], [16, 17.2], [12.8, 17.0], [4.0, 17.0], [4.0, 18.9], [7.6, 20.0], [10.2, 20.5], [10.5, 23.0], [16.6, 23.0], [18.0, 25.0], [16.6, 32.6], [18.0, 34.8], [18.0, 37.3], ...EXIT],
    obj: 14,
  },
  {
    name: 'The compound, the plant deck and the cable baskets',
    pts: [[24, 8], [24, 14.8], [24, 17.6], [31.5, 19.0], [35.2, 19.0], [35.2, 23.0], [33.1, 23.0, DECK], [32.6, 30.0, DECK], [32.6, 40.0, DECK], [32.2, 44.4, DECK], [32.2, 43.0, 4.4], [32.1, 41.3, 4.4], [21.0, 41.25, 4.4], [18.0, 41.25, 4.4], [18.0, 39.6, 4.4], [18.0, 36.6, 4.4], [19.3, 36.6], [18.0, 37.3], ...EXIT],
    obj: 17,
    climbs: [5, 9, 10, 11, 12, 13, 14, 15],
  },
];

/**
 * The cameras of section 4 (SPEC register; level `ground`; all bulletproof, E8 / A95): cam-mantrap inside the mantrap, cam-cage on the cage's SE post,
 * cam-dock4 over the dock (the C3 door is outside its view).
 */
export const S4_CAMERAS: SecurityData['devices'] = [
  { id: 'cam-mantrap', kind: 'camera', level: 'ground', at: [11.8, 21.8], y: 2.6, facing: 225, aim: 3, range: 8, reason: 'S4: the mantrap (an admission record of the entrance interlock)', section: 3, bulletproof: true },
  { id: 'cam-cage', kind: 'camera', level: 'ground', at: [22.15, 33.85], y: 2.8, facing: 235, aim: 5, range: 9, reason: 'S4: the cage front gate and the centre aisle (the high-value servers)', section: 3, bulletproof: true },
  { id: 'cam-dock4', kind: 'camera', level: 'ground', at: [25.5, 21.8], y: 3.2, facing: 150, aim: 6, range: 10, reason: 'S4: the goods-in roller door and the van bay', section: 3, bulletproof: true },
];

/**
 * (E10, A97) An armoured route: a bulletproof piece on the loud way (the map builds it with `armoured`: a door's
 * `Door.armoured`, a pane's `BoxPiece.armoured`; rounds stop on it, never through it) and the ONE named quiet bypass,
 * a feature on a route (`bypass.route`) whose legs to the objective never pass the piece.
 */
export interface ArmourPiece {
  id: string;
  kind: 'door' | 'glass';
  /** The door's centre in its opening, or a point on the pane (plan). */
  at: readonly [number, number];
  /** A pane's sill (its bottom) when it is above the floor. */
  y?: number;
  /** The loud route the piece armours (a `SectorDef.routes` name). */
  loud: string;
  bypass: {
    kind: 'keypad' | 'hang' | 'vent' | 'side door' | 'rappel';
    name: string;
    /** Where the bypass is used (plan), on `route` within 0.6 m. */
    at: readonly [number, number];
    /** Its floor when it is not the ground (a basket, a roof). */
    y?: number;
    /** The route that takes it (a `SectorDef.routes` name). */
    route: string;
  };
}

const S4_STEALTH = 'The service corridor, the battery room and the hot aisles';
const S4_LOUD = 'The lobby, the mantrap and the centre aisle';
const S4_HIGH = 'The compound, the plant deck and the cable baskets';

/** Section 4's armoured routes (A97): the mantrap's inner door and the NOC window. */
export const S4_ARMOURED: ArmourPiece[] = [
  // the loud way in is the mantrap by force: its inner door is bulletproof (no shooting #4 through it); the quiet way is
  // the battery room's keypad door off the service corridor (the code is on the dock board)
  { id: 'arm-mantrap', kind: 'door', at: [10.5, 22], loud: S4_LOUD, bypass: { kind: 'keypad', name: 'kp-batt, the battery room keypad door (code on the dock board)', at: [S4_DOORS.kpBatt[0], S4_DOORS.kpBatt[1]], route: S4_STEALTH } },
  // the NOC pair watch the hall through bulletproof glass (nobody shoots them from the floor, they cannot shoot down
  // through it); the quiet way keeps off the hall floor: over the cable baskets and the hang-down into the cage
  { id: 'arm-noc', kind: 'glass', at: [2, 42], y: 4.6, loud: S4_LOUD, bypass: { kind: 'hang', name: 'the hang-down from the cable basket into the cage', at: [18.0, 36.6], y: 4.4, route: S4_HIGH } },
];

/**
 * The section-start weapons crate (E9-crate, `S4_SECTOR.crate`): inside C3 by its east wall, 1.7 m from the checkpoint,
 * strip facing west. Once per player per section, tops up to the starting loadout, never above, a restart resets it.
 */
export const S4_AMMO_CRATE = { x: 25.2, y: 0, z: 6.8, yaw: -PI / 2, section: 3 } as const;

/** Section 4's alarm panels: alarm-sec4 (security room, west wall), alarm-mt (the lobby, on the hall's south wall), alarm-dk (the dock, west wall). */
export const S4_ALARMS: { at: [number, number]; yaw: number; section: number; y?: number }[] = [
  { at: [-3.85, 46.8], yaw: PI / 2, section: 3 },
  { at: [5.0, 21.85], yaw: PI, section: 3 },
  { at: [14.15, 20.8], yaw: PI / 2, section: 3 },
];

/** The security desk (E6): the console in the security room that loops / switches off the three cameras; usable once #5 (index 4) is down or lured. */
export const S4_DESKS: SecurityDesk[] = [
  { id: 'desk-sec4', section: 3, at: [-2.8, 44.6], yaw: -PI / 2, cameras: ['cam-mantrap', 'cam-cage', 'cam-dock4'], operator: 4 },
];

/**
 * Section 4 in full: 20 armed Larchmont guards incl. one dog, three cameras and the desk, las-tray and its panel, kp-batt and
 * kp-deck (codes from the dock board), the cage's pair gate, alarm-sec4 / alarm-mt / alarm-dk, the cage download, C4. K3: #19.
 */
export const S4_SECTOR: SectorDef = {
  id: 's4',
  name: 'Data hall',
  // C3's checkpoint
  start: { x: 24, y: 0, z: 8, yaw: 0 },
  // weapons crate (E9): the dock link east wall, strip to the link
  crate: { at: [S4_AMMO_CRATE.x, S4_AMMO_CRATE.y, S4_AMMO_CRATE.z], yaw: S4_AMMO_CRATE.yaw },
  // download (10 s, within 4 m) the build and signing logs at the cage terminal: opens C4
  objective: { kind: 'download', label: 'Download the signing logs in the server cage', x: 18, y: 0, z: 38.3, yaw: PI },
  connector: {
    label: 'Along the colonnade to the Old House',
    box: [-26, 26, -10, 32],
    nearAt: [S4_DOORS.c4Near[0], S4_DOORS.c4Near[1]],
    farAt: [-26, 29],
    checkpoint: { x: -18, y: 0, z: 29, yaw: -PI / 2 },
  },
  guards: S4_GUARDS,
  // stage 1: the dock's east end and the UPS room
  reinforce: [[28, 20.5], [-7, 40]],
  // (guard-rules S1, A15) no section gear: helmets come from the difficulty and the alarm stage (G350)
  // sweep points (response team): the service corridor, the battery room (kp-batt side), the centre of the hall, the cage front and the hang-down landing in the cage
  sweep: [[12.8, 17.0], [-5.4, 17.0], [-7.0, 22.0], [6.4, 23.0], [16.6, 33.2], [19.3, 36.6]],
  perStage: 2,
  // (guard-rules S1, A4) a riot-shield guard leads each response team (the later sections only, G307 (3))
  shieldTeams: true,
  dogs: 1,
  routes: S4_ROUTES,
  keypads: [
    { at: [S4_DOORS.kpBatt[0], S4_DOORS.kpBatt[1]], code: 's4-codes' },
    { at: [S4_DOORS.kpDeck[0], S4_DOORS.kpDeck[1]], code: 's4-codes' },
  ],
  intel: [{ kind: 'board', grants: 's4-codes', line: 'Dock board: plant doors 2208, battery room the same.', at: [16.0, 1.5, 21.85], yaw: PI }],
  pairGates: [{ door: [S4_DOORS.pgCage[0], S4_DOORS.pgCage[1]], a: { at: [13.85, 39.6], yaw: -PI / 2 }, b: { at: [21.8, 40.15], yaw: 0 } }],
  stageActions: [
    { stage: 1, lightsFull: [70, 71, 72] },
    { stage: 2, releaseDogs: true, responseRoute: [[-7, 42], [-7, 38], [-2.5, 36], [-2.5, 24]], lockDoors: [[14, 17]] },
    { stage: 3, lockDoors: [[-4, 25]] },
  ],
};

/** (campus-greybox P0) Section 4's parts for the map (`campusSections.ts`). */
export const S4_PARTS: CampusSectionParts = {
  build: buildCampusS4,
  spawns: [],
  pickups: [],
  hideSpots: S4_HIDESPOTS,
  switches: S4_SWITCHES,
  rooms: S4_ROOMS,
  navSeeds: S4_NAV_SEEDS,
  lasers: S4_LASERS,
  panels: S4_PANELS,
  boards: S4_BOARDS,
  sector: S4_SECTOR,
  cameras: S4_CAMERAS,
  desks: S4_DESKS,
  levels: {},
  alarms: S4_ALARMS,
  coopLips: S4_COOP_LIPS,
  dress: dressS4,
  artTags: S4_ART_TAGS,
  hero: HERO_S4,
};
