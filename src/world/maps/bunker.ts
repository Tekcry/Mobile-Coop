import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { CourseDef } from '../../game/course/courseDef';
import { buildUpper, UPPER_Y } from './bunkerUpper';
import { buildShaft, plantAt } from './bunkerShaft';

/** Course footprint (BAYS 0: about 162 x 158 m in plan, every bay and airlock inside it). */
export const BUNKER_BOUNDS = { minX: -1, maxX: 163, minZ: -57, maxZ: 103 } as const;

/**
 * The course data stub (T2, T3): B1 to B4 with A1 to A4. B2's lane doors and the lanes' walkway doors at the east end
 * are lever gates (each lever in the other lane opens both of a lane's doors). B3: the fan guard (its four fence
 * sides) and the discharge duct stay locked until the fan isolator in CR is thrown (a pickup flag); CR's door onto the
 * chamber floor is bolted from inside CR. B4: W1's inspection door is bolted from C2, the W2 sluice opens while the
 * handwheel is held (and 6 s after), the outlet ladder is locked until the top player lowers it. B4 ends the course for
 * now with the "Finish" device inside A4 (A4 is listed but never cycles until B5 exists). T7a completes the drills,
 * radio and the later bays.
 */
/** The bolted doors' press points (world plan: the door's centre in its wall). */
const CR_DOOR = plantAt('B3', 18.225, 9);
const INSP_DOOR = plantAt('B4', 14.6, 25);

function courseDef(): CourseDef {
  return {
    id: 'bunker',
    airlocks: [
      { id: 'A1', box: [24, 81, 30, 87], floorY: UPPER_Y, nearDoor: 'A1-near', farDoor: 'A1-far' },
      { id: 'A2', box: [78, 81, 84, 87], floorY: UPPER_Y, nearDoor: 'A2-near', farDoor: 'A2-far' },
      { id: 'A3', box: [90, 68, 96, 74], floorY: plantAt('A3', 0, 0).y, nearDoor: 'A3-near', farDoor: 'A3-far' },
      { id: 'A4', box: [97, 24, 103, 30], floorY: plantAt('A4', 0, 0).y, nearDoor: 'A4-near', farDoor: 'A4-far' },
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
        exit: 'end',
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
    ],
  };
}

/** Course door ids the definition uses (the other doors stay plain, unlocked). */
const COURSE_DOORS = [
  'A1-near', 'A1-far', 'A2-near', 'A2-far', 'B2-lane-n', 'B2-lane-s', 'B2-exit-n', 'B2-exit-s',
  'B3-cr', 'A3-near', 'A3-far', 'B4-insp', 'B4-sluice', 'A4-near', 'A4-far',
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
 * the shaft and reservoir (Plant y 6, bunkerShaft); the rest of Plant and Deep (y 0) follow (T4-T5).
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
    const def = courseDef();
    const debug = [...up.debug, ...sh.debug];
    return {
      playerSpawns: up.spawns.map((s) => ({ pos: new Vector3(s.pos.x, s.pos.y, s.pos.z), yaw: s.yaw })),
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      debugPoints: debug.map((d) => ({ group: 'Fallow', id: d.id, label: d.label, pos: new Vector3(d.pos.x, d.pos.y, d.pos.z), yaw: d.yaw })),
      course: { def, doors: pick({ ...up.doors, ...sh.doors }), anchors: sh.anchors, devices: { ...up.devices, ...sh.devices }, squads: {} },
    };
  },
};

