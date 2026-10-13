import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { CourseDef, GateDef } from '../../game/course/courseDef';
import { buildUpper, UPPER_Y } from './bunkerUpper';
import { buildShaft, buildShaftFloors, plantAt } from './bunkerShaft';
import { B5_GROUPS, B5_METRICS, buildPlant, buildPlantFloors, plantAt2 } from './bunkerPlant';
import { B8_CS_DOOR, buildDeep, deepNavSeeds } from './bunkerDeep';

/** Course footprint (BAYS 0: about 162 x 158 m in plan, every bay and airlock inside it). */
export const BUNKER_BOUNDS = { minX: -1, maxX: 163, minZ: -57, maxZ: 103 } as const;

/**
 * The course data stub (T2-T5): B1 to B9 with A1 to A8 and the exit lift L9 ("Finish" in the car). B2's lane doors and the lanes' walkway doors at the east end
 * are lever gates (each lever in the other lane opens both of a lane's doors). B3: the fan guard (its four fence
 * sides) and the discharge duct stay locked until the fan isolator in CR is thrown (a pickup flag); CR's door onto the
 * chamber floor is bolted from inside CR. B4: W1's inspection door is bolted from C2, the W2 sluice opens while the
 * handwheel is held (and 6 s after), the outlet ladder is locked until the top player lowers it; B4 exits into A4.
 * B7: the store door (A7's near door) opens on the "Store key" pickup (B7-O's desk drawer). B8: the catwalk stair's
 * door is bolted from below; the cease-fire switch sets its flag. B9: keys A and B and the case are pickups; the lift
 * door opens only with all three flags AND the two key switches turned together (pair gate). T7a completes the drills
 * and radio.
 */
/** The bolted doors' press points (world plan: the door's centre in its wall). */
const CR_DOOR = plantAt('B3', 18.225, 9);
const INSP_DOOR = plantAt('B4', 14.6, 25);
/** S6's top door in B6's west wall (opened from the B6 side only). */
const S6_TOP = plantAt2('B6', 0, 1.5);

/** A pickup switch setting several flags (a card of level n opens every reader up to n). */
function card(id: string, switchId: string, levels: number): GateDef[] {
  const out: GateDef[] = [];
  for (let n = 1; n <= levels; n++) out.push({ kind: 'pickup', id: `g-${id}-${n}`, switchId, flag: `card-${n}`, perPlayer: false });
  return out;
}

function courseDef(): CourseDef {
  return {
    id: 'bunker',
    airlocks: [
      { id: 'A1', box: [24, 81, 30, 87], floorY: UPPER_Y, nearDoor: 'A1-near', farDoor: 'A1-far' },
      { id: 'A2', box: [78, 81, 84, 87], floorY: UPPER_Y, nearDoor: 'A2-near', farDoor: 'A2-far' },
      { id: 'A3', box: [90, 68, 96, 74], floorY: plantAt('A3', 0, 0).y, nearDoor: 'A3-near', farDoor: 'A3-far' },
      { id: 'A4', box: [97, 24, 103, 30], floorY: plantAt('A4', 0, 0).y, nearDoor: 'A4-near', farDoor: 'A4-far' },
      { id: 'A5', box: [64, 5, 70, 11], floorY: plantAt2('A5', 0, 0).y, nearDoor: 'A5-near', farDoor: 'A5-far' },
      { id: 'A6', box: [0, -10, 6, -4], floorY: plantAt2('A6', 0, 0).y, nearDoor: 'A6-near', farDoor: 'A6-far' },
      { id: 'A7', box: [44, -33, 50, -27], floorY: 0, nearDoor: 'A7-near', farDoor: 'A7-far' },
      { id: 'A8', box: [112, -33, 118, -27], floorY: 0, nearDoor: 'A8-near', farDoor: 'A8-far' },
    ],
    bays: [
      { id: 'B1', entry: 'start', exit: 'A1', squad: [], gates: [], radio: [], drills: [], elements: [] },
      {
        id: 'B2',
        entry: 'A1',
        exit: 'A2',
        squad: [],
        gates: [
          { kind: 'lever', id: 'g-lane-n', switchId: 'sw-lever-s', doorId: 'B2-lane-n' },
          { kind: 'lever', id: 'g-lane-s', switchId: 'sw-lever-n', doorId: 'B2-lane-s' },
          // each lane's walkway door at its east end opens with the same lever (no way into the second half round the gate)
          { kind: 'lever', id: 'g-exit-n', switchId: 'sw-lever-s', doorId: 'B2-exit-n' },
          { kind: 'lever', id: 'g-exit-s', switchId: 'sw-lever-n', doorId: 'B2-exit-s' },
        ],
        radio: [],
        drills: [],
        elements: [],
      },
      {
        id: 'B3',
        entry: 'A2',
        exit: 'A3',
        squad: [],
        gates: [
          { kind: 'pickup', id: 'g-isolator', switchId: 'sw-isolator', flag: 'fan-off', perPlayer: false },
          { kind: 'anchorLock', id: 'g-fan-n', anchorId: 'B3-fence-n', flag: 'fan-off' },
          { kind: 'anchorLock', id: 'g-fan-e', anchorId: 'B3-fence-e', flag: 'fan-off' },
          { kind: 'anchorLock', id: 'g-fan-s', anchorId: 'B3-fence-s', flag: 'fan-off' },
          { kind: 'anchorLock', id: 'g-fan-w', anchorId: 'B3-fence-w', flag: 'fan-off' },
          { kind: 'anchorLock', id: 'g-duct', anchorId: 'B3-duct', flag: 'fan-off' },
          { kind: 'bolt', id: 'g-cr', doorId: 'B3-cr', side: [1, 0], at: [CR_DOOR.x, CR_DOOR.z] },
        ],
        radio: [],
        drills: [],
        elements: [],
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
        elements: [],
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
        elements: [],
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
          { kind: 'bolt', id: 'g-s6-top', doorId: 'S6-top', side: [1, 0], at: [S6_TOP.x, S6_TOP.z] },
        ],
        radio: [],
        drills: [],
        elements: [],
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
        elements: [],
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
        elements: [],
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
        elements: [],
      },
    ],
  };
}

/** Course door ids the definition uses (the other doors stay plain, unlocked). */
const COURSE_DOORS = [
  'A1-near', 'A1-far', 'A2-near', 'A2-far', 'B2-lane-n', 'B2-lane-s', 'B2-exit-n', 'B2-exit-s',
  'B3-cr', 'A3-near', 'A3-far', 'B4-insp', 'B4-sluice', 'A4-near', 'A4-far',
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
 * Fallow (training bunker, docs/training): a 1950s civil-defence bunker under a hill, fitted out as a two-player
 * course. Reached by `?autostart=bunker&mode=course` (not listed). One builder per part: Upper (y 16, bunkerUpper),
 * the shaft and reservoir (Plant y 6, bunkerShaft); B5, B6, S6 and A6 (bunkerPlant); Deep (y 0: B7-B9, L9, bunkerDeep).
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
    // B4: the three cells, the valve gallery, the outlet platform
    plantAt('B4', 11, 36), plantAt('B4', 11, 19), plantAt('B4', 11, 6), plantAt('B4', 34, 19, 4.4), plantAt('B4', 18, 1, 4.4),
    // B5: the hall floor, the gallery, the switch room, the fuel bay, the pocket behind the landing stair
    plantAt2('B5', 24, 12), plantAt2('B5', 12, 31, B5_METRICS.gallery), plantAt2('B5', 44, 28), plantAt2('B5', 42, 4), plantAt2('B5', 35, 27),
    // B6: reception, corridor, open office, manager's office, locker room, records, mantrap, server room (T5: the
    // office and records seeds moved off the partition and the records desk onto open floor)
    plantAt2('B6', 39, 16), plantAt2('B6', 30, 16), plantAt2('B6', 28, 19), plantAt2('B6', 17, 29), plantAt2('B6', 8, 22),
    plantAt2('B6', 25.5, 8), plantAt2('B6', 19, 7), plantAt2('B6', 10, 7),
    // B7, B8, B9, L9 (bunkerDeep)
    ...deepNavSeeds(),
  ];
}
