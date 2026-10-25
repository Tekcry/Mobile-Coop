import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { CourseDef, GateDef } from '../../game/course/courseDef';
import { buildUpper, UPPER_ELEMENTS, UPPER_OBJECTIVES, UPPER_Y } from './bunkerUpper';
import { buildShaft, buildShaftFloors, plantAt, SHAFT_ELEMENTS, SHAFT_OBJECTIVES } from './bunkerShaft';
import { B5_GROUPS, B5_METRICS, B6_METRICS, buildPlant, buildPlantFloors, PLANT2_BOX, PLANT2_ELEMENTS, PLANT2_OBJECTIVES, plantAt2, S6_TOP_DOOR } from './bunkerPlant';
import { B8_CS_DOOR, buildDeep, DEEP_BOX, DEEP_ELEMENTS, DEEP_OBJECTIVES, deepNavSeeds } from './bunkerDeep';

/** Course footprint (every bay and airlock inside it, BAYS v2 offsets since T5g; the Deep relief spawns included). */
export const BUNKER_BOUNDS = { minX: -1, maxX: 142, minZ: -71, maxZ: 76 } as const;

/**
 * The course data stub (T2-T5; BAYS v2: Upper in T5d, the shaft and reservoir in T5e, the plant in T5f): B1 to B9, A1 to A8
 * and the exit lift L9 ("Finish" in the car). B1, B2 and B3 have no split (one shared course, R3). B3: the fan guard
 * stays locked until either player throws the fan isolator in CR (a pickup flag; a gate on the line). B4: W1's inspection door is bolted from C2, the W2 sluice opens while the
 * handwheel is held (and 6 s after), the outlet ladder is locked until the top player lowers it; B4 exits into A4.
 * B7: the store door (A7's near door) opens on the "Store key" pickup (B7-O's desk drawer). B8: the catwalk stair's
 * door is bolted from below; the cease-fire switch sets its flag. B9: keys A and B and the case are pickups; the lift
 * door opens only with all three flags AND the two key switches turned together (pair gate). T7a completes the drills
 * and radio.
 */
/** The bolted doors' press points (world plan: the door's centre in its wall). */
const INSP_DOOR = plantAt('B4', 4.6, 17);
/** S6's top door across S6's top landing (opened from the B6 side, north, only). */
const S6_TOP = S6_TOP_DOOR;
/** An airlock's course box (world plan) from its south-west corner. */
const box6 = (p: { x: number; z: number }): [number, number, number, number] => [p.x, p.z, p.x + 6, p.z + 6];

/** A pickup switch setting several flags (a card of level n opens every reader up to n). */
function card(id: string, switchId: string, levels: number): GateDef[] {
  const out: GateDef[] = [];
  for (let n = 1; n <= levels; n++) out.push({ kind: 'pickup', id: `g-${id}-${n}`, switchId, flag: `card-${n}`, perPlayer: false });
  return out;
}

function courseDef(): CourseDef {
  return {
    id: 'bunker',
    objectives: [...UPPER_OBJECTIVES, ...SHAFT_OBJECTIVES, ...PLANT2_OBJECTIVES, ...DEEP_OBJECTIVES],
    airlocks: [
      { id: 'A1', box: [1, 54, 7, 60], floorY: UPPER_Y, nearDoor: 'A1-near', farDoor: 'A1-far' },
      { id: 'A2', box: [59, 50, 65, 56], floorY: UPPER_Y, nearDoor: 'A2-near', farDoor: 'A2-far' },
      { id: 'A3', box: [69, 40, 75, 46], floorY: plantAt('A3', 0, 0).y, nearDoor: 'A3-near', farDoor: 'A3-far' },
      { id: 'A4', box: box6(plantAt('A4', 0, 0)), floorY: plantAt('A4', 0, 0).y, nearDoor: 'A4-near', farDoor: 'A4-far' },
      { id: 'A5', box: [...PLANT2_BOX.A5], floorY: plantAt2('A5', 0, 0).y, nearDoor: 'A5-near', farDoor: 'A5-far' },
      { id: 'A6', box: [...PLANT2_BOX.A6], floorY: plantAt2('A6', 0, 0).y, nearDoor: 'A6-near', farDoor: 'A6-far' },
      { id: 'A7', box: [...DEEP_BOX.A7], floorY: 0, nearDoor: 'A7-near', farDoor: 'A7-far' },
      { id: 'A8', box: [...DEEP_BOX.A8], floorY: 0, nearDoor: 'A8-near', farDoor: 'A8-far' },
    ],
    bays: [
      // B1, B2 (BAYS v2, T5d): one shared course, no split, no gate (R3); objectives by name (UPPER_OBJECTIVES, T7a
      // makes them drills); the elements still stubs are flagged (UPPER_ELEMENTS)
      { id: 'B1', entry: 'start', exit: 'A1', squad: [], gates: [], radio: [], drills: [], elements: UPPER_ELEMENTS.B1 },
      { id: 'B2', entry: 'A1', exit: 'A2', squad: [], gates: [], radio: [], drills: [], elements: UPPER_ELEMENTS.B2 },
      {
        id: 'B3',
        entry: 'A2',
        exit: 'A3',
        squad: [],
        gates: [
          { kind: 'pickup', id: 'g-isolator', switchId: 'sw-isolator', flag: 'fan-off', perPlayer: false },
          { kind: 'anchorLock', id: 'g-fan', anchorId: 'B3-fence', flag: 'fan-off' },
        ],
        radio: [],
        drills: [],
        elements: SHAFT_ELEMENTS.B3,
      },
      {
        id: 'B4',
        entry: 'A3',
        exit: 'A4',
        squad: [],
        gates: [
          { kind: 'bolt', id: 'g-insp', doorId: 'B4-insp', side: [0, -1], at: [INSP_DOOR.x, INSP_DOOR.z] },
          { kind: 'timedHold', id: 'g-sluice', holdId: 'hold-sluice', doorId: 'B4-sluice' },
          { kind: 'pickup', id: 'g-outlet', switchId: 'sw-outlet-ladder', flag: 'outlet-ladder', perPlayer: false },
          { kind: 'anchorLock', id: 'g-outlet-ladder', anchorId: 'B4-outlet-ladder', flag: 'outlet-ladder' },
        ],
        radio: [],
        drills: [],
        elements: SHAFT_ELEMENTS.B4,
      },
      {
        // the mains gate: A5's near door is unlocked while the L1-L3 group (MB in SR) is off
        id: 'B5',
        entry: 'A4',
        exit: 'A5',
        squad: [],
        gates: [{ kind: 'mains', id: 'g-mains', group: 'B5-mains', doorId: 'A5-near' }],
        radio: [],
        drills: [],
        elements: PLANT2_ELEMENTS.B5,
      },
      {
        // now forms (A37): cards are pickups setting reader levels, readers are flag gates; the exit keypad is three
        // buttons (2 is right); the egress on the secure side and the records exit button release their readers;
        // S6's top door opens from the B6 side only.
        id: 'B6',
        entry: 'A5',
        exit: 'A6',
        squad: [],
        gates: [
          ...card('card-a', 'pk-card-a', 2),
          ...card('card-b', 'pk-card-b', 3),
          ...card('card-m', 'pk-card-m', 4),
          { kind: 'flag', id: 'g-rd1', flag: 'card-1', doorId: 'B6-rd1' },
          { kind: 'flag', id: 'g-rd2', flag: 'card-2', doorId: 'B6-rd2' },
          { kind: 'flag', id: 'g-rd3', flag: 'card-3', doorId: 'B6-rd3' },
          { kind: 'flag', id: 'g-rd4', flag: 'card-4', doorId: 'B6-rd4' },
          { kind: 'pickup', id: 'g-rex-1', switchId: 'sw-rd1-rex', flag: 'card-1', perPlayer: false },
          { kind: 'pickup', id: 'g-egress-3', switchId: 'sw-mt-egress', flag: 'card-3', perPlayer: false },
          { kind: 'pickup', id: 'g-egress-4', switchId: 'sw-mt-egress', flag: 'card-4', perPlayer: false },
          { kind: 'pickup', id: 'g-key-2', switchId: 'sw-key-2', flag: 'exit-code', perPlayer: false },
          { kind: 'pickup', id: 'g-key-1', switchId: 'sw-key-1', flag: 'keypad-wrong', perPlayer: false },
          { kind: 'pickup', id: 'g-key-3', switchId: 'sw-key-3', flag: 'keypad-wrong', perPlayer: false },
          { kind: 'flag', id: 'g-exit', flag: 'exit-code', doorId: 'B6-exit' },
          { kind: 'bolt', id: 'g-s6-top', doorId: 'S6-top', side: [0, 1], at: [S6_TOP.x, S6_TOP.z] },
        ],
        radio: [],
        drills: [],
        elements: PLANT2_ELEMENTS.B6,
      },
      {
        // the store door is A7's near door: the store key (B7-O's desk drawer) AND the airlock (A37: gates AND together)
        id: 'B7',
        entry: 'A6',
        exit: 'A7',
        squad: [],
        gates: [
          { kind: 'pickup', id: 'g-store-key', switchId: 'sw-store-key', flag: 'store-key', perPlayer: false },
          { kind: 'flag', id: 'g-store', flag: 'store-key', doorId: 'A7-near' },
        ],
        radio: [],
        drills: [],
        elements: DEEP_ELEMENTS.B7,
      },
      {
        // CS (the catwalk stair) is bolted from below (the floor side); the cease-fire switch at the far end
        id: 'B8',
        entry: 'A7',
        exit: 'A8',
        squad: [],
        gates: [
          { kind: 'bolt', id: 'g-cs', doorId: 'B8-cs', side: [0, -1], at: [B8_CS_DOOR.x, B8_CS_DOOR.z] },
          { kind: 'pickup', id: 'g-cease-fire', switchId: 'sw-cease-fire', flag: 'cease-fire', perPlayer: false },
        ],
        radio: [],
        drills: [],
        elements: DEEP_ELEMENTS.B8,
      },
      {
        // objectives: key A (B-1 west cabin), key B (B-1 east cabin), the case (B-2 east); the lift: both keys turned
        // within the pair window AND the three flags (the gates on one door AND together); the course ends in the car
        id: 'B9',
        entry: 'A8',
        exit: 'end',
        squad: [],
        gates: [
          { kind: 'pickup', id: 'g-key-a', switchId: 'pk-key-a', flag: 'key-a', perPlayer: false },
          { kind: 'pickup', id: 'g-key-b', switchId: 'pk-key-b', flag: 'key-b', perPlayer: false },
          { kind: 'pickup', id: 'g-case', switchId: 'pk-case', flag: 'case', perPlayer: false },
          { kind: 'flag', id: 'g-lift-a', flag: 'key-a', doorId: 'L9-door' },
          { kind: 'flag', id: 'g-lift-b', flag: 'key-b', doorId: 'L9-door' },
          { kind: 'flag', id: 'g-lift-case', flag: 'case', doorId: 'L9-door' },
          { kind: 'pair', id: 'g-lift', a: 'K-A', b: 'K-B', doorId: 'L9-door' },
        ],
        radio: [],
        drills: [],
        elements: DEEP_ELEMENTS.B9,
      },
    ],
  };
}

/** Course door ids the definition uses (the other doors stay plain, unlocked). */
const COURSE_DOORS = [
  'A1-near', 'A1-far', 'A2-near', 'A2-far',
  'A3-near', 'A3-far', 'B4-insp', 'B4-sluice', 'A4-near', 'A4-far',
  'A5-near', 'A5-far', 'B6-rd1', 'B6-rd2', 'B6-rd3', 'B6-rd4', 'B6-exit', 'S6-top', 'A6-near', 'A6-far',
  'A7-near', 'A7-far', 'B8-cs', 'A8-near', 'A8-far', 'L9-door',
] as const;

function pick(all: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of COURSE_DOORS) {
    const d = all[id];
    if (d === undefined) throw new Error(`bunker: no door '${id}'`);
    out[id] = d;
  }
  return out;
}

/**
 * Fallow (training bunker, docs/archive/training): a 1950s civil-defence bunker under a hill, fitted out as a two-player
 * course. Reached by `?autostart=bunker&mode=course` (not listed). One builder per part: Upper (y 16, bunkerUpper),
 * the shaft and reservoir (Plant y 6, bunkerShaft); B5, B6, S6 and A6 (bunkerPlant, BAYS v2 since T5f); Deep (y 0: B7-B9, L9, bunkerDeep).
 */
export const bunker: MapDef = {
  id: 'bunker',
  name: 'Fallow',
  description: 'Training bunker under Fallow Hill: a two-player course through every system.',
  theme: {
    sky: '#0b0c0e',
    horizon: '#131518',
    ground: '#2a2c2f',
    fogStart: 80,
    fogEnd: 240,
    sunDir: [-0.3, -1, -0.2],
    sunIntensity: 0,
    ambient: 0.12,
    // (TUNE) unlit air is near dark: the bays' lamps make the light (T6)
    lightLevel: 0.05,
    floor: 'concrete',
    grade: { tint: [0.97, 0.98, 1.0], saturation: 0.7, contrast: 1.15 },
  },
  modes: ['course', 'sandbox'],
  navLayers: 5,
  build(b): MapLayout {
    b.bounds = { ...BUNKER_BOUNDS };
    const up = buildUpper(b);
    const sh = buildShaft(b);
    const pl = buildPlant(b);
    const dp = buildDeep(b);
    // the pieces the 'epic' detail pass dresses as floor go last (detailPass: ultra's wall stream = epic's)
    buildShaftFloors(b);
    buildPlantFloors(b);
    b.boxes.push(...dp.floors);
    const def = courseDef();
    const debug = [...up.debug, ...sh.debug, ...pl.debug, ...dp.debug];
    const hides = [...pl.hideSpots, ...dp.hideSpots];
    const v = (p: { x: number; y: number; z: number }): Vector3 => new Vector3(p.x, p.y, p.z);
    return {
      playerSpawns: up.spawns.map((s) => ({ pos: new Vector3(s.pos.x, s.pos.y, s.pos.z), yaw: s.yaw })),
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      switches: pl.switches.map((s) => ({ pos: v(s.pos), yaw: s.yaw, group: s.group })),
      hideSpots: hides.map((p) => ({ pos: v(p) })),
      navSeeds: [...debug.map((d) => d.pos), ...hides, ...bunkerNavSeeds()].map(v),
      debugPoints: debug.map((d) => ({ group: 'Fallow', id: d.id, label: d.label, pos: new Vector3(d.pos.x, d.pos.y, d.pos.z), yaw: d.yaw })),
      course: {
        def,
        doors: pick({ ...up.doors, ...sh.doors, ...pl.doors, ...dp.doors }),
        anchors: { ...sh.anchors, ...pl.anchors, ...dp.anchors },
        groups: { 'B5-mains': B5_GROUPS.mains },
        devices: { ...up.devices, ...sh.devices, ...pl.devices, ...dp.devices },
        squads: {},
      },
    };
  },
};

/**
 * Nav flood seeds past the spawn's region (T4 fix): the bunker's levels are joined by ladders, ropes, drops and locked
 * doors, so a single spawn seed drops everything from B4 on. The debug points and hide spots seed too (bunker.build).
 */
function bunkerNavSeeds(): { x: number; y: number; z: number }[] {
  return [
    // B4: the three cells, the valve gallery, the outlet platform (the debug points seed B3's rooms)
    plantAt('B4', 6, 22), plantAt('B4', 6, 13), plantAt('B4', 10.5, 1.5), plantAt('B4', 10.5, 20, 4.4), plantAt('B4', 7, 1, 4.4),
    // B5 (v2, T5f): the hall floor, the gallery, the switch room, the fuel bay, the strip east of the landing stair
    plantAt2('B5', 12, 6), plantAt2('B5', 12, 23.1, B5_METRICS.gallery), plantAt2('B5', 27, 10), plantAt2('B5', 25, 1), plantAt2('B5', 29, 18),
    // B6 (v2): reception, AH, the platform, records, corridor, locker room, office, the floor under CR, CR, mantrap, server room
    plantAt2('B6', 27, 20), plantAt2('B6', 25.5, 2), plantAt2('B6', 24.9, 5.5, B6_METRICS.platform), plantAt2('B6', 20, 9),
    plantAt2('B6', 20, 13), plantAt2('B6', 8, 16), plantAt2('B6', 22, 16), plantAt2('B6', 23.4, 20.2), plantAt2('B6', 16, 20, B6_METRICS.mezzanine),
    plantAt2('B6', 3, 1), plantAt2('B6', 11, 1.5),
    // B7, B8, B9, L9 (bunkerDeep)
    ...deepNavSeeds(),
  ];
}
