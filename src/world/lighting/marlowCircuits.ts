/**
 * Marlow Yard lighting circuits, zones and dark pockets (marlow-final, LIGHTING-PLAN.md section 3; pure data and
 * checks, Babylon-free).
 *
 * One row per light group: every lamp the set builders place carries one of these group numbers (`LightDef.group`),
 * every row has an owner, a fitting and its switches or the stated reason it has none (LD 5.1, 16.8.1), and every row
 * that can change at run time is named in the course layout's `groups` (`marlowCourseGroups`), because the co-op
 * client only learns group states for those (`courseMode.ts` `wire`, `lights.groups`): a switch the client never hears
 * about would leave its picture and meter lit while the host's guards read dark (light parity).
 *
 * Group numbers: 10 x set + k for the sets (SPEC 9), 90-98 for the facility house circuits. Plan points (switches,
 * guard stops) are hints from the set sheets: builders may move them up to 1 m (SPEC 9) and the light tests use the
 * built positions.
 */
import { LAMP_GRID_SLOTS } from '../../voxel/lampBake';
import { MARLOW_LEVEL } from './levels';

export type MarlowRoom = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7' | 'A8' | 'F';

/** house: the instructors' facility circuit (no switch); switch: wall switches by a door; isolator: a timed contactor
 *  (N2); photocell: dusk switch (jam or shoot only); emergency / device: a device's own supply; dead: a fitting that is
 *  off tonight (tagged out, motion sensor), built with intensity 0 and never in the course groups. */
export type CircuitKind = 'house' | 'switch' | 'isolator' | 'photocell' | 'emergency' | 'device' | 'dead';
/** read: lights the set so it reads; pool: a lit chokepoint a route must cross or avoid; toy: a light the players may
 *  use; device: lights a device; decor: out-of-bounds glow (the gallery). */
export type CircuitRole = 'read' | 'pool' | 'toy' | 'device' | 'decor';
export type CutWay = 'switch' | 'isolator' | 'jam' | 'shot';
export type LampTone = 'warm' | 'cool' | 'white' | 'sodium';

export interface SwitchSpot {
  id: string;
  /** wall: a plain switch (`layout.switches`); isolator / board: a timed contactor push station (course device). */
  kind: 'wall' | 'isolator' | 'board';
  x: number;
  z: number;
  /** Floor height (m) of the switch's floor. */
  y: number;
  /** Where it is ("by the west door"). */
  by: string;
}

export interface Lure {
  /** The squad slot the cut lures (`EnemyManager.lightsOut`: the nearest calm guard within `LURE_RANGE`). */
  guard: string;
  /** The guard's stop the plan times the press for (plan x, z). */
  from: [number, number];
}

export interface MarlowCircuit {
  group: number;
  /** The course layout's `groups` key. */
  key: string;
  room: MarlowRoom;
  name: string;
  kind: CircuitKind;
  role: CircuitRole;
  fitting: string;
  tone: LampTone;
  owner: string;
  switches: SwitchSpot[];
  /** The stated reason for no switch (LD 16.8.1). */
  noSwitch?: string;
  /** Isolators only: seconds cut and seconds to re-arm (`CircuitSchedule`). */
  timed?: { seconds: number; rearm: number };
  cutBy: CutWay[];
  lure?: Lure;
  /** Planned baked lamps on the circuit (the budget check). */
  lamps: number;
  /** A jam target (`ctDevices.ts` makes every electric fixed lamp one). Decor and out-of-bounds lamps are not. */
  electric: boolean;
  destructible: boolean;
}

/** `EnemyManager.lightsOut`: the nearest calm guard within this (m) comes to look (enemyManager.ts:270). */
export const LURE_RANGE = 25;

/** The silent crouched pace the set timings use (m/s; `GEARS.crouch[2]`, the crouched walk, SPEC 9 A2). */
export const SILENT_PACE = 1.7;

/** Per-set planning budget: baked lamps per set, per 2 m bake column (the shaders' `LAMP_GRID_SLOTS`: 24 since LR16b, was
 *  8), and in the whole map. */
export const MARLOW_LAMP_BUDGET = { perSet: 24, perColumn: LAMP_GRID_SLOTS, map: 200 } as const;

/** Set and facility room plan boxes [x0, z0, x1, z1] (SPEC 5). */
export const MARLOW_ROOMS: Record<Exclude<MarlowRoom, 'F'>, [number, number, number, number]> = {
  A1: [0, 2, 22, 20],
  A2: [28, 0, 70, 20],
  A3: [76, 0, 100, 13],
  A4: [76, 13, 112, 48],
  A5: [40, 24, 70, 48],
  A6: [40, 54, 64, 72],
  A7: [70, 52, 100, 72],
  A8: [106, 50, 150, 78],
};

/** The lounge inside A1 keeps the house fill (the smallest zone wins, `LightRegistry.zoneAt`). */
export const MARLOW_LOUNGE: [number, number, number, number] = [0, 8, 6, 14];

export interface MarlowZone {
  id: string;
  box: [number, number, number, number];
  ambient: number;
  minY: number;
  maxY: number;
}

/** The `ambientZone`s the map adds: each set at standby, the lounge at the house level. The holding rooms, the gallery
 *  and the cash dock sit outside every zone and take the theme's `lightLevel` 0.30 (G225). */
export const MARLOW_ZONES: MarlowZone[] = [
  ...(Object.keys(MARLOW_ROOMS) as (keyof typeof MARLOW_ROOMS)[]).map((id) => ({ id, box: MARLOW_ROOMS[id], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 10 })),
  { id: 'lounge', box: MARLOW_LOUNGE, ambient: MARLOW_LEVEL.house, minY: -1, maxY: 4 },
];

export interface DarkPocket {
  id: string;
  room: MarlowRoom;
  box: [number, number, number, number];
  /** Floor height of the pocket (m). */
  y: number;
  /** The real reason it is dark (mixed zone, M6). */
  reason: string;
  /** What it is for. */
  use: string;
  /** Most a crouched body reads there with every circuit at its start. */
  max: number;
}

/** Permanent dark pockets (mixed zones, SPEC 7): the only dark a set has before the players cut anything. */
export const MARLOW_POCKETS: DarkPocket[] = [
  { id: 'a2-coat', room: 'A2', box: [28.3, 3.6, 29.6, 4.9], y: 0, reason: "The cabin's coat corner: the panel lamp is over the desk", use: 'Lure destination hide and takedown spot (E7a)', max: MARLOW_LEVEL.pocketMax },
  { id: 'a4-back', room: 'A4', box: [84, 24.3, 110, 27.3], y: 0, reason: "The bulk-store row's lights are on motion sensors, off tonight", use: 'Shadow route across the floor (crosses C2: cameras still see)', max: MARLOW_LEVEL.pocketMax },
  { id: 'a5-landing', room: 'A5', box: [53.5, 34, 57.7, 39.5], y: 0, reason: "No fitting reaches it: the flood's cone and radius stop short, pen 2 shades the switchroom bulkhead", use: "The throw's landing (E6)", max: MARLOW_LEVEL.pocketMax },
  { id: 'a5-pen1', room: 'A5', box: [40.3, 28, 42.5, 31.5], y: 0, reason: "Behind pen 1's transformer, outside the flood's cone", use: "The patrol's isolation moment", max: MARLOW_LEVEL.pocketMax },
  { id: 'a6-sump', room: 'A6', box: [48.3, 54.3, 53.5, 57.8], y: 0, reason: 'The high-bay over the old sump is tagged out', use: 'Entry vantage from L5', max: MARLOW_LEVEL.pocketMax },
  { id: 'a6-west', room: 'A6', box: [40.3, 69.6, 46, 71.7], y: 4.4, reason: "The gallery strip's west fittings are off with the sump bay", use: 'Leg-up and rope at the dark west end', max: MARLOW_LEVEL.pocketMax },
  { id: 'a6-westfloor', room: 'A6', box: [40.3, 66, 46, 69.6], y: 0, reason: 'The west gallery fittings overhead are tagged out (69)', use: 'The leg-up spot under the tagged-out gallery fittings', max: MARLOW_LEVEL.pocketMax },
  { id: 'a6-pump3', room: 'A6', box: [44.5, 58.5, 49.5, 63], y: 0, reason: 'The far pump stands under the tagged-out bay', use: "The attendant's isolation moment", max: MARLOW_LEVEL.pocketMax },
  { id: 'a8-vest', room: 'A8', box: [106.3, 60, 110, 68], y: 0, reason: "The vestibule under the gallery's return has no fitting", use: 'Entry vantage from L7', max: MARLOW_LEVEL.pocketMax },
  { id: 'a8-west', room: 'A8', box: [110, 66, 118, 74.5], y: 0, reason: "The night circuit lights only the hall's front; the west bays are unlit at night", use: 'The boost to the gallery; the cross-level jam spot behind the counters', max: MARLOW_LEVEL.pocketMax },
];

const sw = (id: string, kind: SwitchSpot['kind'], x: number, z: number, by: string, y = 0): SwitchSpot => ({ id, kind, x, z, y, by });
/** A3's office switches as built (S3: the plan's 72 + 7n + 1.2, 8.1 moved to the doors' real inside walls). */
const A3_OFFICE_SWITCH: [number, number][] = [[79.7, 6.0], [87.45, 7.65], [93.0, 8.65]];
const HOUSE = 'The instructors\' house circuit on the lighting board: no wall switch';

export const MARLOW_CIRCUITS: MarlowCircuit[] = [
  // the facility: house circuits (never cut by an exercise; restored on a restart because they are in the groups)
  { group: 90, key: 'f-gallery', room: 'F', name: 'Instructor gallery and bridge', kind: 'house', role: 'decor', fitting: 'LED slot coves, desk task lights', tone: 'warm', owner: 'Vellan & Rook (instructors)', switches: [], noSwitch: `${HOUSE}; out of bounds`, cutBy: [], lamps: 30, electric: false, destructible: false },
  ...[1, 2, 3, 4, 5, 6, 7].map((n): MarlowCircuit => ({ group: 90 + n, key: `f-l${n}`, room: 'F', name: `Holding room ${n}`, kind: 'house', role: 'read', fitting: 'Flush LED panel, cool floor wash', tone: 'cool', owner: 'Vellan & Rook (set crew)', switches: [], noSwitch: HOUSE, cutBy: ['jam', 'shot'], lamps: 2, electric: true, destructible: true })),
  { group: 98, key: 'f-dock', room: 'F', name: 'Cash dock (debrief bay)', kind: 'house', role: 'read', fitting: 'LED slot coves', tone: 'warm', owner: 'Vellan & Rook (instructors)', switches: [], noSwitch: HOUSE, cutBy: ['jam', 'shot'], lamps: 2, electric: true, destructible: true },
  // A1 the Gate
  { group: 10, key: 'a1-lounge', room: 'A1', name: 'Arrival lounge coves', kind: 'house', role: 'read', fitting: 'LED cove and slot lights', tone: 'warm', owner: 'Vellan & Rook (instructors)', switches: [], noSwitch: HOUSE, cutBy: ['jam', 'shot'], lamps: 4, electric: true, destructible: true },
  { group: 11, key: 'a1-apron', room: 'A1', name: 'Apron security light', kind: 'photocell', role: 'read', fitting: 'Wall bulkhead on the cabin', tone: 'sodium', owner: 'Goods yard (set)', switches: [], noSwitch: 'Photocell: the gatehouse security light', cutBy: ['jam', 'shot'], lamps: 1, electric: true, destructible: true },
  { group: 12, key: 'a1-yard', room: 'A1', name: 'Yard lamps', kind: 'switch', role: 'read', fitting: 'Wall bulkheads on the boundary wall', tone: 'sodium', owner: 'Goods yard (set)', switches: [sw('a1-sw-yard', 'wall', 8.2, 15.4, 'in the cabin by its door')], cutBy: ['switch', 'jam', 'shot'], lamps: 3, electric: true, destructible: true },
  { group: 13, key: 'a1-cabin', room: 'A1', name: 'Cabin panel', kind: 'switch', role: 'toy', fitting: 'Ceiling panel', tone: 'white', owner: 'Goods yard (set)', switches: [sw('a1-sw-cabin', 'wall', 8.8, 15.4, 'by the cabin door')], cutBy: ['switch', 'jam', 'shot'], lamps: 1, electric: true, destructible: true },
  // A2 the Carriage Shed
  { group: 20, key: 'a2-shed', room: 'A2', name: 'Shed general', kind: 'switch', role: 'read', fitting: 'Strips on wires under the roof tie', tone: 'white', owner: 'Freight operator (set)', switches: [sw('a2-sw-shed', 'wall', 28.6, 6.6, 'by the west door')], cutBy: ['switch', 'jam', 'shot'], lamps: 6, electric: true, destructible: true },
  { group: 21, key: 'a2-neck', room: 'A2', name: 'Neck high-bays', kind: 'isolator', role: 'pool', fitting: 'High-bays on the roof tie', tone: 'white', owner: 'Freight operator (set)', switches: [sw('a2-iso-1', 'isolator', 30.6, 1.6, 'cabinet 1, in the cabin'), sw('a2-iso-2', 'isolator', 69.4, 14.2, 'cabinet 2, by the east door')], timed: { seconds: 15, rearm: 3 }, cutBy: ['isolator', 'jam', 'shot'], lure: { guard: 'a2-shunter', from: [51, 10] }, lamps: 4, electric: true, destructible: true },
  { group: 22, key: 'a2-cabin', room: 'A2', name: "Shunter's cabin panel", kind: 'switch', role: 'toy', fitting: 'Ceiling panel over the desk', tone: 'white', owner: 'Freight operator (set)', switches: [sw('a2-sw-cabin', 'wall', 31.6, 4.4, 'by the cabin door')], cutBy: ['switch', 'jam', 'shot'], lamps: 1, electric: true, destructible: true },
  { group: 23, key: 'a2-staging', room: 'A2', name: 'Staging strip', kind: 'switch', role: 'toy', fitting: 'Strips under the staging roof', tone: 'white', owner: 'Cleaning contractor (set)', switches: [sw('a2-sw-staging', 'wall', 66.5, 18.5, 'at the east stair head', 4.4)], cutBy: ['switch', 'jam', 'shot'], lamps: 4, electric: true, destructible: true },
  // A3 the Office Range
  { group: 30, key: 'a3-corridor', room: 'A3', name: 'Corridor panels', kind: 'switch', role: 'read', fitting: 'Recessed LED panels', tone: 'white', owner: 'Office tenant (set)', switches: [sw('a3-sw-corr', 'wall', 78.6, 12.7, 'in the west lobby')], cutBy: ['switch', 'jam', 'shot'], lamps: 6, electric: true, destructible: true },
  ...[1, 2, 3].map((n): MarlowCircuit => ({ group: 30 + n, key: `a3-office${n}`, room: 'A3', name: `Office ${n}`, kind: 'switch', role: 'toy', fitting: 'Recessed LED panels', tone: 'white', owner: 'Office tenant (set)', switches: [sw(`a3-sw-off${n}`, 'wall', A3_OFFICE_SWITCH[n - 1]![0], A3_OFFICE_SWITCH[n - 1]![1], `inside office ${n} by its door`)], cutBy: ['switch', 'jam', 'shot'], lure: { guard: 'a3-cleaner', from: [72 + 7 * n + 4.5, 4] }, lamps: 2, electric: true, destructible: true })),
  { group: 34, key: 'a3-lobbies', room: 'A3', name: 'Lift lobbies', kind: 'house', role: 'read', fitting: 'Downlights', tone: 'warm', owner: 'Office landlord (set)', switches: [], noSwitch: "The landlord's common-parts circuit (timer, no wall switch)", cutBy: ['jam', 'shot'], lamps: 2, electric: true, destructible: true },
  // A4 the Goods Shed
  { group: 40, key: 'a4-secroom', room: 'A4', name: 'Security room', kind: 'switch', role: 'toy', fitting: 'Ceiling panels', tone: 'white', owner: 'Port operator (set)', switches: [sw('a4-sw-sec', 'wall', 101.2, 13.3, 'by the door from L3')], cutBy: ['switch', 'jam', 'shot'], lamps: 2, electric: true, destructible: true },
  { group: 41, key: 'a4-floor', room: 'A4', name: 'Floor high-bays', kind: 'switch', role: 'pool', fitting: 'High-bays under the roof tie', tone: 'white', owner: 'Port operator (set)', switches: [sw('a4-sw-floor', 'wall', 79.4, 37.85, 'at the dispatch office door')], cutBy: ['switch', 'jam', 'shot'], lure: { guard: 'a4-dock1', from: [79.5, 33] }, lamps: 8, electric: true, destructible: true },
  { group: 42, key: 'a4-aisles', room: 'A4', name: 'Racking aisle lights', kind: 'switch', role: 'read', fitting: 'Strips over the aisles', tone: 'white', owner: 'Port operator (set)', switches: [sw('a4-sw-aisles', 'wall', 76.3, 28.0, 'at the west end')], cutBy: ['switch', 'jam', 'shot'], lamps: 6, electric: true, destructible: true },
  { group: 43, key: 'a4-mezz', room: 'A4', name: 'Pick mezzanine', kind: 'switch', role: 'toy', fitting: 'Strips under the roof', tone: 'white', owner: 'Port operator (set)', switches: [sw('a4-sw-mezz-w', 'wall', 87.0, 47.7, 'west stair head', 3.3), sw('a4-sw-mezz-e', 'wall', 105.0, 47.7, 'east stair head', 3.3)], cutBy: ['switch', 'jam', 'shot'], lamps: 4, electric: true, destructible: true },
  { group: 49, key: 'a4-bulk', room: 'A4', name: 'Bulk-store row (off tonight)', kind: 'dead', role: 'read', fitting: 'Strips on motion sensors', tone: 'white', owner: 'Port operator (set)', switches: [], noSwitch: 'Motion sensors, set off tonight (the dark back aisle)', cutBy: [], lamps: 0, electric: false, destructible: false },
  // A5 the Substation
  { group: 50, key: 'a5-apron', room: 'A5', name: 'Apron', kind: 'switch', role: 'read', fitting: 'Wall bulkheads', tone: 'white', owner: 'Grid operator (set)', switches: [sw('a5-sw-apron', 'wall', 69.7, 36.0, 'at the L4 door')], cutBy: ['switch', 'jam', 'shot'], lamps: 3, electric: true, destructible: true },
  { group: 51, key: 'a5-inner', room: 'A5', name: 'Inner zone general', kind: 'switch', role: 'read', fitting: 'Wall bulkheads on the inner wall, the south wall and the switchroom face; the switchroom panel', tone: 'white', owner: 'Grid operator (set)', switches: [sw('a5-sw-inner', 'wall', 45.8, 40.7, 'inside the switchroom door')], cutBy: ['switch', 'jam', 'shot'], lure: { guard: 'a5-patrol', from: [47, 30] }, lamps: 4, electric: true, destructible: true },
  { group: 52, key: 'a5-flood', room: 'A5', name: 'Kiosk floodlight', kind: 'photocell', role: 'pool', fitting: 'Floodlight on the switchroom face', tone: 'sodium', owner: 'Grid operator (set)', switches: [], noSwitch: 'Photocell security flood: jam or shoot only', cutBy: ['jam', 'shot'], lamps: 1, electric: true, destructible: true },
  { group: 53, key: 'a5-kiosk', room: 'A5', name: 'Kiosk panel light', kind: 'emergency', role: 'device', fitting: "The kiosk's own panel light", tone: 'white', owner: 'Grid operator (set)', switches: [], noSwitch: "On the kiosk's emergency supply", cutBy: ['jam', 'shot'], lamps: 1, electric: true, destructible: true },
  // A6 the Pump House
  { group: 60, key: 'a6-floor', room: 'A6', name: 'Pump floor high-bays', kind: 'switch', role: 'read', fitting: 'High-bays', tone: 'white', owner: 'Barrier authority (set)', switches: [sw('a6-sw-floor', 'wall', 63.7, 60.4, 'by the outfall door')], cutBy: ['switch', 'jam', 'shot'], lamps: 3, electric: true, destructible: true },
  { group: 61, key: 'a6-gallery', room: 'A6', name: 'Motor gallery strip', kind: 'switch', role: 'toy', fitting: 'A pendant over the bridge and two bulkheads on the gallery wall', tone: 'white', owner: 'Barrier authority (set)', switches: [sw('a6-sw-gallery', 'wall', 56.4, 71.7, 'at the staff stair head', 4.4)], cutBy: ['switch', 'jam', 'shot'], lure: { guard: 'a6-attendant', from: [61, 64] }, lamps: 3, electric: true, destructible: true },
  { group: 62, key: 'a6-desk', room: 'A6', name: "Attendant's desk lamp", kind: 'switch', role: 'toy', fitting: 'Desk lamp', tone: 'warm', owner: 'Barrier authority (set)', switches: [sw('a6-sw-desk', 'wall', 61.0, 66.0, 'on the desk')], cutBy: ['switch', 'jam', 'shot'], lamps: 1, electric: true, destructible: true },
  { group: 63, key: 'a6-cage', room: 'A6', name: 'Drive cage work light', kind: 'device', role: 'device', fitting: "The drive panel's work light", tone: 'white', owner: 'Barrier authority (set)', switches: [], noSwitch: "On the drive panel's own circuit", cutBy: ['jam', 'shot'], lamps: 1, electric: true, destructible: true },
  { group: 69, key: 'a6-sump', room: 'A6', name: 'Sump high-bay and west gallery fittings (tagged out)', kind: 'dead', role: 'read', fitting: 'High-bay, bulkheads', tone: 'white', owner: 'Barrier authority (set)', switches: [], noSwitch: 'Tagged out for repair (lock-off tag on the board)', cutBy: [], lamps: 0, electric: false, destructible: false },
  // A7 the Data Hall
  { group: 70, key: 'a7-rows', room: 'A7', name: 'Rack-row lights', kind: 'switch', role: 'read', fitting: 'Strips over the rack rows', tone: 'cool', owner: 'Colocation operator (set)', switches: [sw('a7-sw-rows', 'wall', 75.8, 60.4, 'in the entry lobby')], cutBy: ['switch', 'jam', 'shot'], lamps: 7, electric: true, destructible: true },
  { group: 71, key: 'a7-aisles', room: 'A7', name: 'Aisle end lights', kind: 'switch', role: 'toy', fitting: 'Wall bulkheads at the aisle ends', tone: 'cool', owner: 'Colocation operator (set)', switches: [sw('a7-sw-aisles', 'wall', 76.6, 56.0, "at the south aisle's west end")], cutBy: ['switch', 'jam', 'shot'], lure: { guard: 'a7-tech', from: [84.4, 60.6] }, lamps: 2, electric: true, destructible: true },
  { group: 72, key: 'a7-plant', room: 'A7', name: 'Plant corridor', kind: 'switch', role: 'read', fitting: 'Bulkheads', tone: 'white', owner: 'Colocation operator (set)', switches: [sw('a7-sw-plant', 'wall', 71.6, 55.6, 'at its west door')], cutBy: ['switch', 'jam', 'shot'], lamps: 4, electric: true, destructible: true },
  { group: 73, key: 'a7-pod', room: 'A7', name: 'Containment pod', kind: 'device', role: 'device', fitting: 'Strips in the pod roof', tone: 'cool', owner: 'Colocation operator (set)', switches: [], noSwitch: "On the cage's own control", cutBy: ['jam', 'shot'], lamps: 2, electric: true, destructible: true },
  // A8 the Strongroom
  { group: 81, key: 'a8-night', room: 'A8', name: 'Hall night circuit (front chandeliers, counter lamps)', kind: 'isolator', role: 'pool', fitting: 'Chandeliers, counter lamps', tone: 'warm', owner: 'Vault company (set)', switches: [sw('a8-board', 'board', 118.0, 74.4, 'the lighting board under the gallery')], timed: { seconds: 25, rearm: 5 }, cutBy: ['isolator', 'jam', 'shot'], lure: { guard: 'a8-night1', from: [128, 64] }, lamps: 7, electric: true, destructible: true },
  { group: 82, key: 'a8-gallery', room: 'A8', name: 'Gallery wall lights', kind: 'switch', role: 'toy', fitting: 'Brass wall lights (east bays only)', tone: 'warm', owner: 'Vault company (set)', switches: [sw('a8-sw-gallery', 'wall', 131.0, 76.2, 'at the public stair head', 4.4)], cutBy: ['switch', 'jam', 'shot'], lamps: 3, electric: true, destructible: true },
  { group: 83, key: 'a8-office', room: 'A8', name: 'Security office', kind: 'switch', role: 'toy', fitting: 'Ceiling panels', tone: 'white', owner: 'Vault company (set)', switches: [sw('a8-sw-office', 'wall', 134.6, 73.2, 'by its door', 4.4)], cutBy: ['switch', 'jam', 'shot'], lamps: 2, electric: true, destructible: true },
  { group: 84, key: 'a8-vault', room: 'A8', name: 'Vault lobby', kind: 'device', role: 'read', fitting: 'Ceiling panels', tone: 'white', owner: 'Vault company (set)', switches: [], noSwitch: "On the time lock's circuit", cutBy: ['jam', 'shot'], lamps: 2, electric: true, destructible: true },
];

// ------------------------------------------------------------------------------------------ the re-plan (J14)

/**
 * (J14 Marlow re-plan, A20; BRIEF Q2 "Never": every light works, darkness only from cover, cut power and shot lamps) The circuit
 * table of the map `ctcourseReplan`: the built table with the lights left off tonight now live. Group 49 (A4 back aisle) and
 * 69 (A6 sump and west gallery) become switched read circuits; the A4 dispatch office (44), the A8 vestibule (85) and the A8
 * west bays (86) get fittings on their own switches; the A2 coat corner gets a lamp on the cabin's circuit (22) and the A2 stores
 * bay a seventh strip on the shed general (20, J14 G-A2 lead answer 4). Switch spots
 * are plan points (builders may move them up to 1 m, SPEC 9); each set slice places the lamps (`replan/<set>.ts`) and the
 * lamp counts here are the budget they build to. The built `MARLOW_CIRCUITS` is untouched.
 */
export const MARLOW_CIRCUITS_REPLAN: MarlowCircuit[] = [
  ...MARLOW_CIRCUITS.flatMap((c): MarlowCircuit[] => {
    if (c.group === 20) return [{ ...c, fitting: 'Strips on wires under the roof tie, one over the stores bay', lamps: 7 }];
    if (c.group === 22) return [{ ...c, name: "Shunter's cabin panel and coat corner lamp", fitting: 'Ceiling panel over the desk, a wall lamp over the coat hooks', lamps: 2 }];
    // (J14 G-A5 fix 2) the apron switch moved onto the perimeter wall's inside face with the apron's two east bulkheads (the
    // built row keeps the built yard's spot at the L4 door)
    if (c.group === 50) return [{ ...c, switches: [sw('a5-sw-apron', 'wall', 67.8, 36.0, "on the perimeter wall's inside face, by the apron's east bulkheads")] }];
    if (c.group === 49) {
      return [
        { ...c, name: 'Bulk-store row (back aisle)', kind: 'switch', role: 'read', fitting: 'Strips over the back aisle', switches: [sw('a4-sw-bulk', 'wall', 99.0, 24.3, "on the back aisle's south wall, west of the lift grille")], noSwitch: undefined, cutBy: ['switch', 'jam', 'shot'], lamps: 3, electric: true, destructible: true },
        { group: 44, key: 'a4-dispatch', room: 'A4', name: 'Dispatch office', kind: 'switch', role: 'toy', fitting: 'Ceiling panel', tone: 'white', owner: 'Port operator (set)', switches: [sw('a4-sw-dispatch', 'wall', 79.4, 38.4, 'inside the office by its door')], cutBy: ['switch', 'jam', 'shot'], lamps: 1, electric: true, destructible: true },
      ];
    }
    if (c.group === 69) return [{ ...c, name: 'Sump high-bay and west gallery fittings', kind: 'switch', role: 'read', fitting: 'High-bay, bulkheads', switches: [sw('a6-sw-sump', 'wall', 51.0, 54.3, "on the sump bay's south wall, west of the L5 door")], noSwitch: undefined, cutBy: ['switch', 'jam', 'shot'], lamps: 3, electric: true, destructible: true }];
    if (c.group === 84) {
      return [
        c,
        { group: 85, key: 'a8-vestibule', room: 'A8', name: 'Vestibule', kind: 'switch', role: 'read', fitting: 'Ceiling panels under the gallery return', tone: 'warm', owner: 'Vault company (set)', switches: [sw('a8-sw-vestibule', 'wall', 106.5, 62.5, 'by the L7 door')], cutBy: ['switch', 'jam', 'shot'], lamps: 2, electric: true, destructible: true },
        { group: 86, key: 'a8-west', room: 'A8', name: 'West bays behind the counters', kind: 'switch', role: 'read', fitting: 'Brass wall lights and counter lamps', tone: 'warm', owner: 'Vault company (set)', switches: [sw('a8-sw-west', 'wall', 112.0, 74.6, 'on the north wall, west end')], cutBy: ['switch', 'jam', 'shot'], lamps: 2, electric: true, destructible: true },
      ];
    }
    return [c];
  }),
];

/** The built dark pockets minus those the re-plan lights (BRIEF Q2): the A2 coat corner, the A4 back aisle, the A6 sump bay,
 *  west gallery and pump 3 (all circuit 69), the A8 vestibule and west bays. A5's two (cone and shade geometry) stay. */
export const MARLOW_POCKETS_REPLAN: DarkPocket[] = MARLOW_POCKETS.filter((p) => !['a2-coat', 'a4-back', 'a6-sump', 'a6-west', 'a6-westfloor', 'a6-pump3', 'a8-vest', 'a8-west'].includes(p.id));

/** Exercise timings for the timed circuits (SPEC 9): the crossing a window must cover and the one-player route it
 *  must not (m, at `SILENT_PACE`). */
export interface TimedExercise {
  key: string;
  /** The crossing the window covers (m). */
  crossM: number;
  /** Press to far cover for one player alone (m); 0 = the window is not what makes it co-op. */
  soloM: number;
  /** Seconds the window leaves spare at `SILENT_PACE` (at least this). */
  slack: number;
}

export const MARLOW_TIMED: TimedExercise[] = [
  { key: 'a2-neck', crossM: 10, soloM: 26, slack: 5 },
  { key: 'a8-night', crossM: 20, soloM: 0, slack: 8 },
];

/** The course layout's `groups` (key -> group number): every circuit but the dead ones. */
export function marlowCourseGroups(circuits: readonly MarlowCircuit[] = MARLOW_CIRCUITS): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of circuits) if (c.kind !== 'dead') out[c.key] = c.group;
  return out;
}

/** The plain wall switches the map lists (`MapLayout.switches`); isolators and boards are course devices instead. */
export function marlowWallSwitches(circuits: readonly MarlowCircuit[] = MARLOW_CIRCUITS): { id: string; group: number; x: number; y: number; z: number }[] {
  const out: { id: string; group: number; x: number; y: number; z: number }[] = [];
  for (const c of circuits) for (const s of c.switches) if (s.kind === 'wall') out.push({ id: s.id, group: c.group, x: s.x, y: s.y, z: s.z });
  return out;
}

/** The circuit a group number belongs to, or null. */
export function circuitOf(group: number, circuits: readonly MarlowCircuit[] = MARLOW_CIRCUITS): MarlowCircuit | null {
  for (const c of circuits) if (c.group === group) return c;
  return null;
}

const inBox = (b: readonly number[], x: number, z: number): boolean => x >= b[0]! && x <= b[2]! && z >= b[1]! && z <= b[3]!;
const dist = (a: readonly number[], x: number, z: number): number => Math.sqrt((a[0]! - x) ** 2 + (a[1]! - z) ** 2);

/** Check a circuit table against the plan's rules. Returns one line per problem (empty = fine). */
export function validateMarlowCircuits(circuits: readonly MarlowCircuit[] = MARLOW_CIRCUITS, timed: readonly TimedExercise[] = MARLOW_TIMED, pockets: readonly DarkPocket[] = MARLOW_POCKETS): string[] {
  const bad: string[] = [];
  const groups = new Set<number>();
  const keys = new Set<string>();
  const perRoom = new Map<MarlowRoom, number>();
  let total = 0;
  for (const c of circuits) {
    const at = `${c.key} (${c.group})`;
    if (groups.has(c.group)) bad.push(`${at}: group number used twice`);
    if (keys.has(c.key)) bad.push(`${at}: key used twice`);
    groups.add(c.group);
    keys.add(c.key);
    // numbering: 10 x set + k; the facility 90-98
    if (c.room === 'F') {
      if (c.group < 90 || c.group > 98) bad.push(`${at}: facility circuits are 90-98`);
    } else {
      const n = Number(c.room.slice(1));
      if (Math.floor(c.group / 10) !== n) bad.push(`${at}: set ${c.room} circuits are ${10 * n}-${10 * n + 9}`);
    }
    // a switch where a real one would be, or a stated reason (LD 5.1, 16.8.1)
    if (c.switches.length === 0 && !c.noSwitch) bad.push(`${at}: no switch and no stated reason`);
    if (c.switches.length > 0 && c.noSwitch) bad.push(`${at}: has switches and a no-switch reason`);
    const switchless = c.kind === 'house' || c.kind === 'photocell' || c.kind === 'emergency' || c.kind === 'device' || c.kind === 'dead';
    if (switchless && c.switches.length > 0) bad.push(`${at}: a ${c.kind} circuit has no switches`);
    if ((c.kind === 'switch' || c.kind === 'isolator') && c.switches.length === 0) bad.push(`${at}: a ${c.kind} circuit needs a switch`);
    // timed circuits are isolators, driven only by isolators or a board (a plain wall switch would cut it for good)
    if (c.kind === 'isolator') {
      if (!c.timed || !(c.timed.seconds > 0) || !(c.timed.rearm >= 0)) bad.push(`${at}: an isolator needs seconds > 0 and rearm >= 0`);
      if (c.switches.some((s) => s.kind === 'wall')) bad.push(`${at}: an isolator circuit has no plain wall switch`);
      if (!c.cutBy.includes('isolator')) bad.push(`${at}: an isolator circuit is cut by its isolator`);
    } else {
      if (c.timed) bad.push(`${at}: only isolators are timed`);
      if (c.switches.some((s) => s.kind !== 'wall')) bad.push(`${at}: isolator push stations belong to isolator circuits`);
    }
    if (c.cutBy.includes('switch') && !c.switches.some((s) => s.kind === 'wall')) bad.push(`${at}: cut by a switch it does not have`);
    if (c.cutBy.includes('jam') && !c.electric) bad.push(`${at}: only electric lamps are jammed`);
    if (c.cutBy.includes('shot') && !c.destructible) bad.push(`${at}: only destructible lamps are shot`);
    if (c.electric && !c.cutBy.includes('jam')) bad.push(`${at}: every electric fixed lamp is a jam target (ctDevices.ts)`);
    // a lit chokepoint is darkened two ways and at least one is not a shot (players cut it on switches, isolators, jams)
    if (c.role === 'pool') {
      if (c.cutBy.length < 2) bad.push(`${at}: a lit chokepoint is darkened at least two ways (LD 5.2)`);
      if (!c.cutBy.some((w) => w !== 'shot')) bad.push(`${at}: a pool needs a way to cut it that is not a shot`);
    }
    if (c.role === 'decor' && (c.electric || c.destructible)) bad.push(`${at}: out-of-bounds decor lamps are neither jam targets nor shootable`);
    if (c.kind === 'dead' && (c.lamps !== 0 || c.cutBy.length)) bad.push(`${at}: a dead circuit has no lit lamps and nothing cuts it`);
    // switches and lure stops inside their set
    if (c.room !== 'F') {
      const box = MARLOW_ROOMS[c.room];
      for (const s of c.switches) if (!inBox(box, s.x, s.z)) bad.push(`${at}: switch ${s.id} is outside ${c.room}`);
      if (c.lure) {
        if (!inBox(box, c.lure.from[0], c.lure.from[1])) bad.push(`${at}: lure stop outside ${c.room}`);
        // the lightsOut lure reaches the guard from at least one of the circuit's switches
        if (!c.switches.some((s) => dist(c.lure!.from, s.x, s.z) < LURE_RANGE)) bad.push(`${at}: ${c.lure.guard} is out of lure range (${LURE_RANGE} m) of every switch`);
      }
    }
    if (c.lamps < 0) bad.push(`${at}: negative lamp count`);
    perRoom.set(c.room, (perRoom.get(c.room) ?? 0) + c.lamps);
    total += c.lamps;
  }
  for (const [room, n] of perRoom) if (room !== 'F' && n > MARLOW_LAMP_BUDGET.perSet) bad.push(`${room}: ${n} lamps over the per-set budget ${MARLOW_LAMP_BUDGET.perSet}`);
  if (total > MARLOW_LAMP_BUDGET.map) bad.push(`map: ${total} lamps over the budget ${MARLOW_LAMP_BUDGET.map}`);
  // every set has a lit read circuit and at least two toys or switches (LD 7.2 counts switches among toys)
  for (const room of Object.keys(MARLOW_ROOMS) as (keyof typeof MARLOW_ROOMS)[]) {
    const cs = circuits.filter((c) => c.room === room);
    if (!cs.some((c) => c.role === 'read' && c.kind !== 'dead')) bad.push(`${room}: no lit read circuit (lit by default, M6)`);
    if (cs.reduce((n, c) => n + c.switches.length, 0) < 1) bad.push(`${room}: no switch at all`);
  }
  // the timed exercises: the window covers the crossing with slack, and one player alone cannot press and cross
  for (const t of timed) {
    const c = circuits.find((x) => x.key === t.key);
    if (!c || !c.timed) {
      bad.push(`${t.key}: timed exercise without a timed circuit`);
      continue;
    }
    const cross = t.crossM / SILENT_PACE;
    if (cross + t.slack > c.timed.seconds) bad.push(`${t.key}: ${c.timed.seconds} s does not cover the ${t.crossM} m crossing (${cross.toFixed(1)} s) with ${t.slack} s spare`);
    if (t.soloM > 0 && t.soloM / SILENT_PACE <= c.timed.seconds) bad.push(`${t.key}: one player can press and reach cover inside ${c.timed.seconds} s`);
  }
  for (const p of pockets) {
    if (p.room === 'F') continue;
    const b = MARLOW_ROOMS[p.room];
    if (!(inBox(b, p.box[0], p.box[1]) && inBox(b, p.box[2], p.box[3]))) bad.push(`pocket ${p.id}: outside ${p.room}`);
    if (p.max > MARLOW_LEVEL.pocketMax) bad.push(`pocket ${p.id}: max over the pocket band ${MARLOW_LEVEL.pocketMax}`);
  }
  return bad;
}
