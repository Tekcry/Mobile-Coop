// (campus-greybox, v2 lane S4) Copied from `campusS4Data.ts` at P0; the S4 lane's greybox. Built only when `flags.campusV2` names 4.
import type { RoutePt, SectorDef, SectorGuard } from '../../../game/sectors';
import type { SecurityData } from '../../../security/data';
import type { GearTag } from '../../../ai/gear';
import type { SecurityDesk } from '../../../game/sectorDesks';
import type { CampusSectionParts } from '../campusParts';
import { buildCampusS4, S4_BOARDS, S4_COOP_LIPS, S4_DOORS, S4_HIDESPOTS, S4_LASERS, S4_NAV_SEEDS, S4_PANELS, S4_ROOMS, S4_SWITCHES } from './s4';
import { dressS4, HERO_S4, S4_ART_TAGS } from './s4Dress';

const PI = Math.PI;

/**
 * Saltmarsh Park (`campusOps`) section 4 sector data (`docs/sector-redesign/briefs/SLICE4.md`; v2 lane `docs/campus-greybox/briefs/S4.md`
 * G4.6): the data hall, 25 armed Larchmont guards incl. the first dog, three bulletproof cameras, the first security desk, the first pair gate (the cage's
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
 * Section 4's guards (25, the base list for 1 and 2 players; officer = pistolSd, grunt = rifle, enforcer = pistolSd + shield, dog = melee at the
 * handler's heel). The 0-based index in this list is the guard's number minus one. Dormant (A64 / A99, data only): #10, #11 (the hot-aisle
 * checkers) and #16 (the north corridor tour); none is posted, paired, a handler or a dog. (G4.6) Gear: no section `gear` (job BRIEF A27: the
 * guard-rules PR1 drops the section helmet; the lane writes no 'helmet'), body armour as `'armour'` where the plan says both.
 */
export const S4_GUARDS: GearGuard[] = [
  // 1 the yard handler (L1: the lane is the compound's west side, x 35.3, because the tanks and the generator stand on x 36..39)
  { kind: 'grunt', x: 35.3, z: 27, yaw: 0, route: [[35.3, 27], [35.3, 44]], faces: [0, PI], loop: YARD_LOOP, takedownSpot: [35.3, 44.0], role: 'handler', zone: 'yard', squad: 0, reason: 'Diesel was stolen from the tanks twice' },
  // 2 the dog, at heel (A87): the same loop, one lane over; the handler is #1 (index 0)
  { kind: 'dog', x: 34.8, z: 27, yaw: 0, route: [[34.8, 27], [34.8, 44]], faces: [0, PI], loop: YARD_LOOP, handler: 0, takedownSpot: [34.8, 44.0], role: 'dog', zone: 'yard', squad: 0, reason: 'At heel (A87)' },
  // 3 the yard gate officer: at the gate, facing it, the compound at his back
  { kind: 'officer', x: 37, z: 17.6, yaw: PI, takedownSpot: [37, 18.0], role: 'gate', zone: 'yard', squad: 0, reason: 'Lets the 03:00 courier van in at the yard gate' },
  // 4 the mantrap officer: at the mantrap desk, facing the interlock (G4.1, D:106; the spot 0.5 m behind him, S1 A7); talks with #21 (index 20)
  { kind: 'officer', x: 1.3, z: 20.1, yaw: PI / 2, takedownSpot: [0.8, 20.1], role: 'mantrap', zone: 'lobby', squad: 1, pair: 20, reason: 'Admits one at a time; answers the hall panel' },
  // gear (stealth over shooting): the two NOC officers and the security room supervisor wear body armour (torso shots only stagger); no section helmet (job BRIEF A27)
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
  // 12 the battery checker (G4.6, D:107, P7): starts in the battery room, walks the aisle x -7 (D:107's x -8.5 is inside the west rack),
  // through battCC (-8.5, 27.5), the colonnade and ccUps (-5.5, 31) to the UPS room's north end and back; counted in s4-batt; cycle 35.8 / 0.99 + 6 = 42.1 s.
  // M8 (G4.6): the brief's spot (-7.0, 21.0) is seen down the battery room by K3 #19 through battCC (0 s isolated); the spot moves along his own route
  // to (-5.5, 35.4) in the UPS room (3.25 s isolated in a 15 s window, CHECK_SPOT)
  { kind: 'grunt', x: -7.0, z: 21.0, yaw: 0, route: [[-7.0, 21.0], [-7.4, 26.9], [-8.3, 28.4], [-5.5, 30.0], [-5.5, 37.0], [-5.5, 30.0], [-8.3, 28.4], [-7.4, 26.9]], waits: [3, 0, 0, 0, 3, 0, 0, 0], takedownSpot: [-5.5, 35.4], role: 'checker', zone: 'batt', squad: 4, reason: 'Reads cell voltages with his torch' },
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
  { kind: 'grunt', x: -8.8, z: 30.0, yaw: PI / 2, takedownSpot: [-9.3, 30.0], post: { leash: 5, guards: 'c4-gate' }, role: 'posted', zone: 'c4', squad: 4, reason: 'The Old House is closed tonight: nobody goes down the colonnade' },
  // 20 the mobile supervisor: the hall's west aisle, visiting the battery, colonnade and UPS doors
  { kind: 'officer', x: -2.5, z: 23.0, yaw: 0, route: [[-2.5, 23.0], [-2.5, 39.5]], waits: [3, 3], takedownSpot: [-2.5, 23.0], role: 'supervisor', zone: 'hall-w', squad: 3, reason: 'Mobile supervisor: visits the battery, colonnade and UPS doors' },
  // 21 (G4.6, D:106, P8) the goods-in officer: round the mantrap and the parcel cages along the lane, stopping 4 s at the dock end and 6 s
  // with #4 at the desk end (the straight z 19.6 line crosses the mantrap box); cycle 24.3 / 0.935 + 10 = 36.0 s; talks with #4 (index 3)
  { kind: 'officer', x: 12.5, z: 19.6, yaw: PI, route: [[12.5, 19.6], [13.4, 17.4], [6.1, 17.4], [5.0, 19.6], [6.1, 17.4], [13.4, 17.4]], waits: [4, 0, 0, 6, 0, 0], takedownSpot: [12.5, 19.6], role: 'goods-in', zone: 'lobby', squad: 1, pair: 3, reason: 'Goods-in officer: checks the 03:00 drives along the lane to the mantrap desk' },
  // 22 (G4.6, D:112, P9) the second keyholder: round the cage, his south leg at z 32.5 (the brief's z 32.4 is off the nav grid, 0.25 m from pod P3's
  // rack end: moved 0.1 m north, reported; #9 is posted at (18, 33)); cycle 34.6 / 0.935 + 4 = 41.0 s
  { kind: 'officer', x: 13.5, z: 32.5, yaw: 0, route: [[13.5, 32.5], [13.5, 40.8], [22.5, 40.8], [22.5, 32.5]], waits: [1, 1, 1, 1], takedownSpot: [22.5, 40.8], role: 'keyholder', zone: 'cage', squad: 3, reason: 'Second keyholder: dual custody, walks round the cage' },
  // 23 (G4.6, D:108) the tank watch, in the compound facing the gate
  { kind: 'grunt', x: 38.5, z: 31, yaw: PI, takedownSpot: [38.5, 31.5], role: 'watch', zone: 'yard', squad: 0, reason: 'Tank watch: diesel was stolen from the tanks twice' },
  // 24 (G4.6, D:109) the chiller watch, on the deck
  { kind: 'grunt', x: 18, y: DECK, z: 30.0, yaw: PI / 2, takedownSpot: [17.5, 30.0], role: 'watch', zone: 'deck', squad: 5, reason: 'Chiller watch: waiting on the chiller engineer' },
  // 25 (G4.6, D:111, P10) the night runner: the desk to the side door and up to the NOC, 6 s at each end; cycle 14.01 / 0.935 + 12 = 27.0 s
  { kind: 'officer', x: 0, z: 43.2, yaw: PI / 2, route: [[0, 43.2], [7, 43.5]], waits: [6, 6], takedownSpot: [7, 43.5], role: 'runner', zone: 'sec', squad: 2, reason: 'Night runner: carries the log from the desk to the side door and up to the NOC' },
];

/** The exit legs every S4 route shares from the objective: the cage front, the build-out area, the UPS room, the colonnade (past K3), C4 (G4.6, AS11). */
const EXIT: readonly RoutePt[] = [[18.0, 34.8], [16.6, 33.2], [12.6, 35.5], [5.0, 36.0], [-2.6, 38.0], [-5.4, 38.0], [-6.5, 33.0], [-5.5, 31.7], [-5.5, 30.3], [-7.6, 29.6], [-9.4, 29.0], [-11.0, 29.0], [-18, 29]];

const S4_STEALTH = 'The goods lane, the battery room and the hot aisles';
const S4_LOUD = 'The interlock and the P2|P3 cold aisle';
const S4_HIGH = 'The compound, the riser and the cable baskets';

/**
 * The ways in (M8; G4.6 AS11, D:216-219): stealth along the goods lane, through the battery room and the hot aisles (the keypad code from
 * the dock board); loud through the interlock and the P2|P3 cold aisle; high through the compound, the riser (kp-riser, R1) and the cable
 * baskets (the plant ladder is co-op, CR10; the deck is Relay's mission track, P11).
 */
export const S4_ROUTES: SectorDef['routes'] = [
  {
    name: S4_STEALTH,
    pts: [[24, 8], [24, 14.8], [24, 17.6], [16, 17.2], [14.8, 17.5], [12.8, 17.4], [-2.6, 17.4], [-2.6, 18.5], [-5.4, 18.5], [-7.0, 20.0], [-7.0, 24.0], [-5.4, 25.0], [-2.6, 25.0], [-2.5, 23.0], [6.4, 23.0], [6.4, 24.7], [6.4, 31.3], [6.4, 33.0], [12.6, 33.2], [16.6, 33.2], [18.0, 34.8], [18.0, 37.3], ...EXIT],
    obj: 21,
  },
  {
    name: S4_LOUD,
    pts: [[24, 8], [24, 14.8], [24, 17.6], [16, 17.2], [14.8, 17.5], [12.8, 17.4], [5.0, 17.4], [5.0, 19.6], [7.2, 20.5], [8.8, 20.5], [9.5, 21.4], [9.5, 22.8], [9.2, 23.5], [9.2, 33.0], [12.6, 33.2], [16.6, 33.2], [18.0, 34.8], [18.0, 37.3], ...EXIT],
    obj: 17,
  },
  {
    name: S4_HIGH,
    pts: [[24, 8], [24, 14.8], [24, 17.6], [31.5, 19.0], [35.2, 19.0], [35.2, 45.6], [34.8, 46.5], [33.2, 46.5], [32.2, 45.6], [32.2, 44.0, 4.4], [32.1, 41.3, 4.4], [21.0, 41.25, 4.4], [18.0, 41.25, 4.4], [18.0, 39.6, 4.4], [18.0, 36.6, 4.4], [19.3, 36.6], [18.0, 37.3], ...EXIT],
    obj: 16,
    // R1 up (leg 8), the basket legs and the hang-down (the runtime rule: every raised basket leg is a climb)
    climbs: [8, 9, 10, 11, 12, 13, 14],
  },
];

/**
 * The cameras of section 4 (SPEC register; level `ground`; all bulletproof, E8 / A95): cam-mantrap inside the mantrap, cam-cage on the cage's SE post,
 * cam-dock4 over the dock (the C3 door is outside its view).
 */
export const S4_CAMERAS: SecurityData['devices'] = [
  { id: 'cam-mantrap', kind: 'camera', level: 'ground', at: [10.8, 21.8], y: 2.6, facing: 225, aim: 3, range: 8, reason: 'S4: the mantrap (an admission record of the entrance interlock)', section: 3, bulletproof: true },
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

/** Section 4's armoured routes (A97): the mantrap's inner door and the NOC window. */
export const S4_ARMOURED: ArmourPiece[] = [
  // the loud way in is the mantrap by force: its inner door is bulletproof (no shooting #4 through it); the quiet way is
  // the battery room's keypad door off the service corridor (the code is on the dock board)
  { id: 'arm-mantrap', kind: 'door', at: [S4_DOORS.mantrapInner[0], S4_DOORS.mantrapInner[1]], loud: S4_LOUD, bypass: { kind: 'keypad', name: 'kp-batt, the battery room keypad door (code on the dock board)', at: [S4_DOORS.kpBatt[0], S4_DOORS.kpBatt[1]], route: S4_STEALTH } },
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
  { at: [-3.85, 43.0], yaw: PI / 2, section: 3 }, // (G4.3 C15, D:30) clear of the new UPS door (-4, 46.5)
  { at: [5.0, 21.85], yaw: PI, section: 3 },
  { at: [14.15, 20.8], yaw: PI / 2, section: 3 },
];

/** The security desk (E6): the console in the security room that loops / switches off the three cameras; usable once #5 (index 4) is down or lured. */
export const S4_DESKS: SecurityDesk[] = [
  // sync-s4-desk: the camera desk, unmoved (-2.8, 44.6); the side door secNc (8, 43.5) is its lead
  // footage drive (Code Relay optional, 8 s second desk action, J26)
  { id: 'desk-sec4', section: 3, at: [-2.8, 44.6], yaw: -PI / 2, cameras: ['cam-mantrap', 'cam-cage', 'cam-dock4'], operator: 4 },
];

/**
 * Section 4 in full: 25 armed Larchmont guards incl. one dog, three cameras and the desk, las-tray and its panel, kp-batt, kp-deck and
 * kp-riser (codes from the dock board), the cage's pair gate and the mantrap interlock (CR9), alarm-sec4 / alarm-mt / alarm-dk, the cage
 * download, C4. K3: #19. 25 + `alarmMax` 3 x `perStage` 2 = 31 <= `maxAlive` 32. No section `gear` (job BRIEF A27); `shieldTeams` waits for PR1.
 */
export const S4_SECTOR: SectorDef = {
  id: 's4',
  name: 'Data hall',
  // C3's checkpoint
  start: { x: 24, y: 0, z: 8, yaw: 0 },
  // weapons crate (E9): the dock link east wall, strip to the link
  crate: { at: [S4_AMMO_CRATE.x, S4_AMMO_CRATE.y, S4_AMMO_CRATE.z], yaw: S4_AMMO_CRATE.yaw },
  // download (10 s, within 4 m) the build and signing logs at the cage terminal: opens C4
  // sync-s4-cagekp: release prompt; 30 s (90 s solo), an expired release is asked for again (J26)
  objective: { kind: 'download', label: 'Download the build and signing logs', x: 18, y: 0, z: 38.3, yaw: PI },
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
  // sweep points (response team): the goods lane, the battery room (kp-batt side), the centre of the hall, the cage front and the hang-down landing in the cage
  sweep: [[12.8, 17.4], [-5.4, 18.5], [-7.0, 22.0], [6.4, 23.0], [16.6, 33.2], [19.3, 36.6]],
  perStage: 2,
  dogs: 1,
  routes: S4_ROUTES,
  keypads: [
    { at: [S4_DOORS.kpBatt[0], S4_DOORS.kpBatt[1]], code: 's4-codes' },
    { at: [S4_DOORS.kpDeck[0], S4_DOORS.kpDeck[1]], code: 's4-codes' },
    { at: [S4_DOORS.kpRiser[0], S4_DOORS.kpRiser[1]], code: 's4-codes' }, // kp-riser (Code Relay BT:102)
  ],
  intel: [
    // sync-s4-dockboard: the dock board, unmoved (16, 1.5, 21.85); it opens kp-batt, kp-deck and kp-riser
    { kind: 'board', grants: 's4-codes', line: 'Dock board: plant doors 2208, battery room the same.', at: [16.0, 1.5, 21.85], yaw: PI },
    // lead-s4-roster (Code Relay BT:106; D:93): the duty roster on the security room's west wall, beside the desk
    { kind: 'board', grants: 's4-noc-duty', line: 'Duty roster: NOC tonight, Dunmore on the west seat.', at: [-3.85, 1.5, 45.2], yaw: PI / 2 },
    // lead-s4-deckradio (Code Relay BT:52, BT:105; P13): #13's radio on the deck, in the lee of chiller 12..16 between his west stop and the chillers
    { kind: 'overhear', grants: 's4-noc-duty', line: "Deck radio: Dunmore, it's chiller three again.", box: [11, 33.2, 13, 35.0], floorY: 7.3, talkers: [12] },
  ],
  pairGates: [
    { door: [S4_DOORS.pgCage[0], S4_DOORS.pgCage[1]], a: { at: [13.85, 39.6], yaw: -PI / 2 }, b: { at: [21.8, 40.15], yaw: 0 } },
    // CR9 mantrap interlock (desk release, door reader; two players, 1.0 s): 6.4 m apart, the default PAIR_WINDOW (D:18, D:130)
    { door: [S4_DOORS.mantrapOuter[0], S4_DOORS.mantrapOuter[1]], a: { at: [1.3, 21.0], yaw: PI }, b: { at: [7.7, 21.4], yaw: -PI / 2 } },
  ],
  stageActions: [
    { stage: 1, lightsFull: [70, 71, 72] },
    { stage: 2, releaseDogs: true, responseRoute: [[-7, 42], [-7, 38], [-2.5, 36], [-2.5, 24]], lockDoors: [[S4_DOORS.dockWest[0], S4_DOORS.dockWest[1]]] },
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

/** (campus-greybox) True while this v2 section is still an exact copy of the live one (`tests/campusV2.test.ts`
 *  checks it equals v1); the lane sets it false with its first layout change. */
export const S4_V2_COPY = false;
