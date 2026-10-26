// (campus-greybox, v2 lane S5) Copied from `campusS5Data.ts` at P0; the S5 lane's greybox. Built only when `flags.campusV2` names 5.
import type { RoutePt, SectorDef, SectorGuard } from '../../../game/sectors';
import type { SecurityData } from '../../../security/data';
import type { GearTag } from '../../../ai/gear';
import type { ArmourPiece } from '../campusS4Data';
import type { CampusSectionParts } from '../campusParts';
import { buildCampusS5, S5_BOARDS, S5_BOX, S5_DOORS, S5_HIDESPOTS, S5_LASERS, S5_NAV_SEEDS, S5_PANELS, S5_ROOMS, S5_SWITCHES } from './s5';
import { dressS5, HERO_S5, S5_ART_TAGS } from './s5Dress';

const PI = Math.PI;

/**
 * Saltmarsh Park (`campusOps`) section 5 sector data (`docs/sector-redesign/briefs/SLICE5.md`, SPEC "S5"): the Old House
 * and the extraction. 24 guards (two dogs, a response team), three bulletproof thermal cameras, the shaft beams, three alarm
 * panels, the two-person token room (K4), the archive keypad, the pair gate and the rope well (CR6, CR7), the jetty. Pure
 * data (no Babylon): `campusS5.ts` builds the rooms. Section index 4 everywhere.
 *
 * Walk speeds (m/s) in the cycle arithmetic: a plain route walks at walkSpeed x 1.1 (grunt 0.99, officer 0.935, enforcer
 * 0.88); a timed `loop` at walkSpeed (grunt 0.9, dog 1.1). Each cycle is 25-45 s (`tests/campusS5.test.ts`).
 */

/** The L1 floor (the storey the gallery, the archive and the suites stand on) and the roof. */
const Y1 = 4.2;
const YR = 8.4;
/** The grounds' timed patrol loop: the garden team (#5, #6) and the lake-side team (#7, #8) share one clock (west stop at t 22-25). */
const LOOP = { period: 44, leave: [3, 25], t0: 0 };

/** A section guard with its per-slot gear tag (`SquadSlot` has no `gear` field on this branch; the guard-ai wiring reads it off the slot as `GuardSlotTags.gear`, so the tag rides here until the type gains it). */
type GearGuard = SectorGuard & { gear?: GearTag };

/**
 * Section 5's guards (24; the brief's table: officer = pistolSd, grunt = rifle, enforcer = pistolSd + shield, dog). Dormant
 * (A64 / A99, data only): the response team's standing three (#1-#3) and the boardroom officer (#15). The values the brief left open (the
 * takedown spots, the facings of route guards) are in `docs/sector-redesign/checks/slice5-build.md`.
 */
export const S5_GUARDS: GearGuard[] = [
  // gear (stealth over shooting): the response team (#1-#4) and the two token room officers wear body armour; helmets come from the difficulty and the alarm stage (guard-rules A15); dogs never get gear
  // 1-3 the response team's standing force in the control room, for the ceremony
  { kind: 'grunt', x: -55, z: 19.5, yaw: PI / 2, takedownSpot: [-55.5, 19.5], role: 'response', zone: 'ctl', squad: 0, dormant: true, gear: 'armour', reason: 'Standing reaction force for the ceremony' },
  { kind: 'grunt', x: -55, z: 22.4, yaw: PI / 2, takedownSpot: [-55.5, 22.4], role: 'response', zone: 'ctl', squad: 0, dormant: true, gear: 'armour', reason: 'Standing reaction force for the ceremony' },
  { kind: 'grunt', x: -55, z: 25.4, yaw: PI / 2, takedownSpot: [-55.5, 25.4], role: 'response', zone: 'ctl', squad: 0, dormant: true, gear: 'armour', reason: 'Standing reaction force for the ceremony' },
  // 4 the team's hall walk
  { kind: 'grunt', x: -53, z: 28.4, yaw: 1.9, route: [[-53, 28.4], [-41.5, 23.5]], waits: [6, 6], takedownSpot: [-53.5, 28.6], role: 'response', zone: 'hall', squad: 0, gear: 'armour', reason: "The response team's hall walk" },
  // 5-8 the grounds: the garden team and the lake-side team (a handler and a dog each, on one clock)
  { kind: 'grunt', x: -63, z: 23.5, yaw: 0, route: [[-63, 23.5], [-63, 40.5]], faces: [0, PI], loop: LOOP, takedownSpot: [-63, 23.0], role: 'handler', zone: 'garden', squad: 1, reason: 'Grounds patrol for the ceremony' },
  { kind: 'dog', x: -62, z: 23.5, yaw: 0, route: [[-62, 23.5], [-62, 40.5]], faces: [0, PI], loop: LOOP, takedownSpot: [-62, 23.0], role: 'dog', zone: 'garden', squad: 1, handler: 4, reason: 'At heel with the garden handler' },
  { kind: 'grunt', x: -36, z: 47, yaw: -PI / 2, route: [[-36, 47], [-53, 47]], faces: [-PI / 2, PI / 2], loop: LOOP, takedownSpot: [-35.5, 47], role: 'handler', zone: 'terrace', squad: 1, reason: 'Lake-side patrol' },
  { kind: 'dog', x: -36, z: 46, yaw: -PI / 2, route: [[-36, 46], [-53, 46]], faces: [-PI / 2, PI / 2], loop: LOOP, takedownSpot: [-35.5, 46], role: 'dog', zone: 'terrace', squad: 1, handler: 6, reason: 'At heel with the lake-side handler' },
  // 9-10 the token room's keyholders (K4): neither alone with the token
  { kind: 'officer', x: -44, z: 34.0, yaw: PI, takedownSpot: [-44, 34.5], post: { leash: 3, highSecurity: true, guards: 'token' }, role: 'posted', zone: 'token', squad: 2, gear: 'armour', reason: 'Two-person rule: neither is alone with the token' },
  { kind: 'officer', x: -42, z: 34.0, yaw: PI, takedownSpot: [-42, 34.5], post: { leash: 3, highSecurity: true, guards: 'token' }, role: 'posted', zone: 'token', squad: 2, gear: 'armour', reason: 'Two-person rule: neither is alone with the token' },
  // 11 the audit escort
  { kind: 'officer', x: -45.2, z: 33.0, yaw: PI / 2, route: [[-45.2, 33.0], [-40.8, 36.2], [-39.0, 34.0]], waits: [4, 4, 4], takedownSpot: [-39.0, 34.3], role: 'escort', zone: 'ante', squad: 2, reason: 'Escorts the audit papers; alone at the shaft door' },
  // 12 the front door
  { kind: 'officer', x: -44, z: 20.5, yaw: PI, takedownSpot: [-44, 20.0], role: 'door', zone: 'hall', squad: 0, reason: 'Front door, under the hall camera' },
  // 13-14 the gallery pair, opposite phases
  { kind: 'grunt', x: -48.5, y: Y1, z: 19.6, yaw: 0, route: [[-48.5, 19.6], [-48.5, 28.4]], waits: [5, 5], takedownSpot: [-48.5, 19.1], role: 'gallery', zone: 'gal-w', squad: 3, reason: 'Overlooks the stair hall' },
  { kind: 'grunt', x: -39.5, y: Y1, z: 28.4, yaw: PI, route: [[-39.5, 28.4], [-39.5, 19.6]], waits: [5, 5], takedownSpot: [-39.5, 19.1], role: 'gallery', zone: 'gal-e', squad: 3, reason: 'Overlooks the stair hall, opposite phase' },
  // 15 the boardroom
  { kind: 'officer', x: -53, y: Y1, z: 24, yaw: PI / 2, takedownSpot: [-53.5, 24], role: 'post', zone: 'board', squad: 3, dormant: true, reason: 'Board papers laid out for 08:00' },
  // 16-17 the CEO suite pair
  { kind: 'officer', x: -51.6, y: Y1, z: 30.8, yaw: 0, takedownSpot: [-50.9, 30.8], role: 'post', zone: 'ceo', squad: 3, reason: "The CEO's safe and laptop" },
  { kind: 'grunt', x: -51.6, y: Y1, z: 32.0, yaw: PI, takedownSpot: [-51.6, 32.4], role: 'post', zone: 'ceo', squad: 3, reason: "The CEO's safe and laptop" },
  // 18 the archive round
  { kind: 'grunt', x: -45, y: Y1, z: 33, yaw: 0, route: [[-45, 33], [-45, 43], [-42.2, 43], [-42.2, 33]], waits: [3, 3, 3, 3], takedownSpot: [-45, 43.3], role: 'patrol', zone: 'archive', squad: 3, reason: 'Archive round; alone in the dark stacks' },
  // 19 the roof marksman
  { kind: 'grunt', x: -40, y: YR, z: 43.0, yaw: 0, route: [[-40, 43.0], [-39, 43.0]], waits: [12, 12], faces: [-0.6, 0.6], takedownSpot: [-40.4, 42.6], role: 'marksman', zone: 'roof', squad: 4, reason: 'Overwatch of the lake approach' },
  // 20 the terrace gate
  { kind: 'grunt', x: -44, z: 50.7, yaw: 0, route: [[-44, 50.7], [-47.8, 57.6], [-48.1, 62.2], [-47.5, 57.6]], waits: [6, 0, 6, 0], takedownSpot: [-48.1, 62.6], role: 'gate', zone: 'terrace', squad: 1, reason: 'The terrace gate, lake side' },
  // 21 the service round
  { kind: 'grunt', x: -29, z: 42.5, yaw: PI, route: [[-29, 42.5], [-29, 23.5]], waits: [3, 3], takedownSpot: [-30.4, 23.3], role: 'patrol', zone: 'wing', squad: 5, reason: 'Service round; answers the garden board' },
  // 22 the lobby officer, the C4 door 1.6 m behind him
  { kind: 'officer', x: -27.6, z: 29.0, yaw: -PI / 2, takedownSpot: [-27.1, 29.0], role: 'post', zone: 'lobby', squad: 5, reason: 'Checks anyone coming in from the data hall' },
  // 23 the van
  { kind: 'grunt', x: -31.4, z: 53.5, yaw: -PI / 2, takedownSpot: [-32.0, 54.3], role: 'driver', zone: 'lane', squad: 4, reason: "The team's van; overlooks the jetty path" },
  // 24 the clocking round
  { kind: 'officer', x: -35, z: 37.2, yaw: PI, route: [[-35, 37.2], [-35, 19.6]], waits: [3, 3], takedownSpot: [-35, 37.6], role: 'tour', zone: 'back', squad: 5, reason: 'Clocking round of the back stair door and the hall door' },
];

/** The ways in (M8): stealth by the back corridor, the side door and the garden; loud by the hall, the kitchen and the terrace gate; high by the service stair, the roof and the rappel. */
/** The stealth route's exit from the strongroom door to the jetty (shared by the high route). */
const S5_EXIT: readonly RoutePt[] = [
  [-43.0, 38.0],
  [-43.0, 35.6],
  [-43.0, 32.8],
  [-43.0, 31.0],
  [-48.0, 31.0],
  [-48.0, 33.0],
  [-51.0, 33.0],
  [-55.0, 39.5],
  [-57.0, 40.0],
  [-60.0, 42.5],
  [-63.0, 45.5],
  [-64.0, 49.0],
  [-64.0, 51.0],
  [-63.0, 55.0],
  [-56.0, 58.5],
  [-51.0, 57.0],
  [-45.0, 59.5, 0.4],
  [-45.0, 63.0, 0.4],
];

export const S5_ROUTES: SectorDef['routes'] = [
  {
    // stealth (solo): the lobby, the back corridor, the vestibule, the anteroom's side door, the strongroom, the garden and the jetty
    name: 'The back corridor, the anteroom side door and the garden',
    pts: [[-18, 29], [-24.6, 29], [-27.0, 28.0], [-31.0, 29.0], [-33.0, 29.0], [-36.5, 31.0], [-36.5, 33.5], [-39.0, 33.5], [-41.0, 33.4], [-43.0, 35.6], [-43.0, 38.0], [-43.0, 42.2], ...S5_EXIT],
    obj: 11,
  },
  {
    // loud: the hall past the door officer, the anteroom's hall door, out by the kitchen and the terrace gate
    name: 'The front hall, the kitchen and the terrace gate',
    pts: [[-18, 29], [-24.6, 29], [-27.0, 28.0], [-31.0, 29.0], [-33.0, 29.0], [-36.5, 23.0], [-39.0, 22.0], [-41.5, 23.0], [-42.0, 30.8], [-43.0, 32.8], [-43.0, 35.6], [-43.0, 38.0], [-43.0, 42.2], [-43.0, 38.0], [-43.0, 35.6], [-43.0, 32.8], [-42.0, 30.8], [-39.0, 22.0], [-36.5, 23.0], [-33.0, 29.0], [-31.0, 29.0], [-29.0, 31.0], [-29.0, 33.0], [-29.0, 43.0], [-29.0, 45.0], [-33.0, 49.0], [-44.0, 49.0], [-44.0, 51.3], [-45.0, 57.0], [-45.0, 59.5, 0.4], [-45.0, 63.0, 0.4]],
    obj: 12,
  },
  {
    // high (solo): the service stair to the roof, the rappel, the garden and the drawing room's door, then the stealth exit
    name: 'The service stair, the roof and the rappel',
    pts: [[-18, 29], [-24.6, 29], [-27.0, 28.0], [-31.0, 29.0], [-33.0, 29.0], [-35.0, 37.2], [-35.0, 38.9], [-35.0, 38.9, YR], [-35.0, 37.0, YR], [-41.0, 35.0, YR], [-44.0, 40.0, YR], [-53.6, 43.2, YR], [-54.0, 45.4], [-63.0, 45.5], [-63.0, 42.5], [-57.0, 40.0], [-55.0, 39.5], [-51.0, 33.0], [-48.0, 33.0], [-48.0, 31.0], [-43.0, 31.0], [-43.0, 32.8], [-43.0, 35.6], [-43.0, 38.0], [-43.0, 42.2], ...S5_EXIT],
    obj: 24,
    climbs: [11],
  },
];

/**
 * The cameras of section 5 (brief register): the hall, the gallery, the terrace; none sees the archive's back door or the
 * boathouse path. All bulletproof and thermal (E8, A95 / A96): beat them with the jammer or the routes round.
 */
export const S5_CAMERAS: SecurityData['devices'] = [
  // on the hall's east wall, facing the front door and the stair foot; the back-corridor door beside it is out of frame
  { id: 'cam-hall', kind: 'camera', level: 'ground', at: [-38.2, 25.0], y: 3.2, aim: 6, range: 10, facing: 225, reason: 'S5: the front door and the stair foot (the insurer wants the entrance covered)', section: 4, bulletproof: true, thermal: true },
  // on the gallery's east wall: the archive's gallery door; the kp-arch back door is on the other side
  { id: 'cam-gallery', kind: 'camera', level: 's5-l1', at: [-38.2, 26.0], y: 2.6, aim: 5, range: 9, facing: 340, reason: "S5: the archive's gallery door (the records room)", section: 4, bulletproof: true, thermal: true },
  // over the terrace gate, facing the lawn: the boathouse path under the trees is outside it
  { id: 'cam-terrace', kind: 'camera', level: 'ground', at: [-44, 44.3], y: 3.0, aim: 6, range: 12, facing: 0, reason: 'S5: the terrace gate and the lawn (the lake side)', section: 4, bulletproof: true, thermal: true },
];

const S5_STEALTH = 'The back corridor, the anteroom side door and the garden';
const S5_LOUD = 'The front hall, the kitchen and the terrace gate';
const S5_HIGH = 'The service stair, the roof and the rappel';

/** Section 5's armoured routes (E10, A97; `ArmourPiece`): the anteroom's hall door and the front door, each with one quiet bypass. */
export const S5_ARMOURED: ArmourPiece[] = [
  // the loud way to the token is across the hall to the anteroom's hall door: bulletproof (no shooting the keyholders
  // through it); the quiet way is the anteroom's side door from the vestibule (SPEC CR6 "solo bypass")
  { id: 'arm-ante', kind: 'door', at: [S5_DOORS.anteHall[0], S5_DOORS.anteHall[1]], loud: S5_LOUD, bypass: { kind: 'side door', name: 'the anteroom side door from the vestibule', at: [S5_DOORS.anteSide[0], S5_DOORS.anteSide[1]], route: S5_STEALTH } },
  // the front door (SPEC loud "front door") is locked and bulletproof; the quiet way down from the roof is the north parapet rappel
  { id: 'arm-front', kind: 'door', at: [S5_DOORS.front[0], S5_DOORS.front[1]], loud: S5_LOUD, bypass: { kind: 'rappel', name: 'the north parapet rappel to the terrace', at: [S5_BOX.rappel.x, S5_BOX.rappel.z], y: YR, route: S5_HIGH } },
];

/** No ammo inside the section: the weapons crate at the section start (E9-crate, `S5_SECTOR.crate`), inside C4 by its south wall, strip facing north. */
export const S5_AMMO_CRATE = { x: -17.2, y: 0, z: 27.0, yaw: 0, section: 4 };

/** The alarm panels of section 5: alarm-ctl (control room west wall), alarm-ante (the anteroom's east wall), alarm-ter (the terrace, by the house's north wall). */
export const S5_ALARMS: { at: [number, number]; yaw: number; section: number; y?: number }[] = [
  { at: [-55.85, 26.5], yaw: PI / 2, section: 4 },
  { at: [-40.15, 34.6], yaw: -PI / 2, section: 4 },
  { at: [-44.8, 44.15], yaw: 0, section: 4 },
];

/**
 * Section 5 in full (slice 5): the Old House. Start = C4's checkpoint; the objective is the signing key token in the
 * strongroom; the run ends at the boathouse jetty. K4 (the keyholders), the archive keypad and its rota board, CR6 (the
 * pair gate) and CR7 (the rope well), the stage actions and the garden board's guard lure are the section's data.
 */
export const S5_SECTOR: SectorDef = {
  id: 's5',
  name: 'The Old House',
  start: { x: -18, y: 0, z: 29, yaw: -PI / 2 },
  // weapons crate (E9): the colonnade south wall, strip to the colonnade
  crate: { at: [S5_AMMO_CRATE.x, S5_AMMO_CRATE.y, S5_AMMO_CRATE.z], yaw: S5_AMMO_CRATE.yaw },
  objective: { kind: 'grab', label: 'Take the signing key token', x: -43, y: 0, z: 43.4, yaw: 0 },
  extract: { label: 'Extract at the boathouse jetty', box: [-50, 60, -40, 66] },
  guards: S5_GUARDS,
  // stage 1: the hall's front door and the service wing
  reinforce: [[-44, 21], [-29, 21]],
  // (guard-rules S1, A15) no section gear: helmets come from the difficulty and the alarm stage (G350)
  // sweep points (response team): the vestibule, the anteroom side door, the anteroom, the strongroom approach, the hall door side and the terrace landing under the north parapet rappel
  sweep: [[-36.5, 33.5], [-41.0, 33.4], [-43.0, 35.6], [-43.0, 42.2], [-42.0, 30.8], [-54.0, 45.4]],
  perStage: 2,
  // (guard-rules S1, A4) a riot-shield guard leads each response team (the later sections only, G307 (3))
  shieldTeams: true,
  dogs: 2,
  routes: S5_ROUTES,
  keypads: [{ at: [-38, 41.0], code: 's5-arch' }],
  intel: [{ kind: 'board', grants: 's5-arch', line: 'Rota board: archive keypad 1960 until Monday.', at: [-26.15, 1.5, 37.0], yaw: -PI / 2 }],
  pairGates: [{ door: [-41, 38.6], a: { at: [-40.0, 34.45], y: Y1, yaw: PI }, b: { at: [-45.85, 42.0], y: Y1, yaw: PI / 2 }, window: 1.0 }],
  stageActions: [
    { stage: 1, responseRoute: [[-50.8, 26.0], [-47, 27], [-43, 30.5]], releaseDogs: true },
    { stage: 2, lightsFull: [81, 84], lockDoors: [[-56, 40]] },
    { stage: 3, lightsFull: [80, 88], lockDoors: [[-38, 33.5]] },
  ],
};

/** (campus-greybox P0) Section 5's parts for the map (`campusSections.ts`). No co-op lips yet; the chimney stacks feed the art pass. */
export const S5_PARTS: CampusSectionParts = {
  build: buildCampusS5,
  spawns: [],
  pickups: [],
  hideSpots: S5_HIDESPOTS,
  switches: S5_SWITCHES,
  rooms: S5_ROOMS,
  navSeeds: S5_NAV_SEEDS,
  lasers: S5_LASERS,
  panels: S5_PANELS,
  boards: S5_BOARDS,
  sector: S5_SECTOR,
  cameras: S5_CAMERAS,
  desks: [],
  levels: { 's5-l1': 4.2 },
  alarms: S5_ALARMS,
  coopLips: [],
  dress: dressS5,
  artTags: S5_ART_TAGS,
  hero: HERO_S5,
  chimneys: S5_BOX.chimneys,
};

/** (campus-greybox) True while this v2 section is still an exact copy of the live one (`tests/campusV2.test.ts`
 *  checks it equals v1); the lane sets it false with its first layout change. */
export const S5_V2_COPY = false;
