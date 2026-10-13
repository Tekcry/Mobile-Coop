import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { CourseDef } from '../../game/course/courseDef';
import { buildUpper, UPPER_Y, type UpperResult } from './bunkerUpper';

/** Course footprint (BAYS 0: about 162 x 158 m in plan, every bay and airlock inside it). */
export const BUNKER_BOUNDS = { minX: -1, maxX: 163, minZ: -57, maxZ: 103 } as const;

/**
 * The course data stub (T2): B1 and B2 with A1 and A2. B2's lane doors are lever gates (each lever in the other lane);
 * B2 ends the course for now with the "Finish" device inside A2 (A2 is listed but never cycles until B3 exists, so
 * its far door stays locked). T7a completes the drills, radio and the later bays.
 */
function courseDef(): CourseDef {
  return {
    id: 'bunker',
    airlocks: [
      { id: 'A1', box: [24, 81, 30, 87], floorY: UPPER_Y, nearDoor: 'A1-near', farDoor: 'A1-far' },
      { id: 'A2', box: [78, 81, 84, 87], floorY: UPPER_Y, nearDoor: 'A2-near', farDoor: 'A2-far' },
    ],
    bays: [
      { id: 'B1', entry: 'start', exit: 'A1', squad: [], gates: [], radio: [], drills: [], elements: [] },
      {
        id: 'B2',
        entry: 'A1',
        exit: 'end',
        squad: [],
        gates: [
          { kind: 'lever', id: 'g-lane-n', switchId: 'sw-lever-s', doorId: 'B2-lane-n' },
          { kind: 'lever', id: 'g-lane-s', switchId: 'sw-lever-n', doorId: 'B2-lane-s' },
        ],
        radio: [],
        drills: [],
        elements: [],
      },
    ],
  };
}

/** Course door ids the definition uses (the other doors stay plain, unlocked). */
const COURSE_DOORS = ['A1-near', 'A1-far', 'A2-near', 'A2-far', 'B2-lane-n', 'B2-lane-s'] as const;

function pick(r: UpperResult): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of COURSE_DOORS) {
    const d = r.doors[id];
    if (d === undefined) throw new Error(`bunker: no door '${id}'`);
    out[id] = d;
  }
  return out;
}

/**
 * Fallow (training bunker, docs/training): a 1950s civil-defence bunker under a hill, fitted out as a two-player
 * course. Reached by `?autostart=bunker&mode=course` (not listed). One builder per level: Upper (y 16, this step),
 * Plant (y 6) and Deep (y 0) follow (T3-T5).
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
    const def = courseDef();
    return {
      playerSpawns: up.spawns.map((s) => ({ pos: new Vector3(s.pos.x, s.pos.y, s.pos.z), yaw: s.yaw })),
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      debugPoints: up.debug.map((d) => ({ group: 'Fallow', id: d.id, label: d.label, pos: new Vector3(d.pos.x, d.pos.y, d.pos.z), yaw: d.yaw })),
      course: { def, doors: pick(up), devices: up.devices, squads: {} },
    };
  },
};

