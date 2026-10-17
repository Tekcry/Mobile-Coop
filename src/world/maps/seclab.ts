import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { SecurityData } from '../../security/data';

/**
 * Security lab (Kestrel S1): a debug map for the security systems, never listed (it is in `MAPS`, not
 * `LISTED_MAP_IDS`). One dark room, 24 x 14 m, x east, z north, floor at 0, ceiling at 3.6.
 *   - a fixed camera on the west wall (yaw 90) watches a lit strip along z 7 and a dark corner at (10, 1.5);
 *   - a panning camera on the east wall sweeps between yaw 190 and 270 over a lit pad at (14, 12): at the 190 end
 *     its far pause looks south of the pad, at the 270 end it looks straight at it.
 * Boots with `?autostart=seclab&mode=sandbox`. The desk, the panel and a guard seat come with S1 Part B.
 */
const SECLAB_SECURITY: SecurityData = {
  devices: [
    { id: 'cam-fixed', kind: 'camera', level: 'ground', at: [0.5, 7], y: 3.0, facing: 90, room: 'lab', reason: 'covers the west half of the room' },
    { id: 'cam-pan', kind: 'camera', level: 'ground', at: [23.5, 12], y: 3.0, facing: 270, sweep: [190, 270], room: 'lab', reason: 'sweeps the east end' },
  ],
};

export const seclab: MapDef = {
  id: 'seclab',
  name: 'Security Lab',
  description: 'Debug room for cameras and the security desk.',
  modes: [], // off every menu (menus filter MAPS by mode); reached only with ?autostart=seclab&mode=sandbox
  theme: {
    sky: '#0d1117',
    horizon: '#161c24',
    ground: '#20262c',
    fogStart: 40,
    fogEnd: 120,
    sunDir: [0, -1, 0],
    sunIntensity: 0.05,
    ambient: 0.3,
    lightLevel: 0.1,
  },
  build(b: LevelBuilder): MapLayout {
    const FLOOR = '#454c52';
    const WALL = '#6a7078';
    b.floor(12, 7, 24, 14, FLOOR, 0, 0.4);
    b.perimeter(0, 24, 0, 14, 3.6, WALL);
    b.box(12, 3.75, 7, 26, 0.3, 16, '#3c4147');
    // the lit strip: two lamps over z 7 (x 7 and 11), the fixed camera sees x 3 to 18 along it
    b.light({ kind: 'lamp', x: 7, y: 3.4, z: 7, radius: 7, intensity: 1, color: [1, 0.95, 0.85], fixture: { sx: 0.8, sy: 0.08, sz: 0.3, oy: 0.08 } });
    b.light({ kind: 'lamp', x: 11, y: 3.4, z: 7, radius: 7, intensity: 1, color: [1, 0.95, 0.85], fixture: { sx: 0.8, sy: 0.08, sz: 0.3, oy: 0.08 } });
    // the lit pad of the panning camera
    b.light({ kind: 'lamp', x: 14, y: 3.4, z: 12, radius: 7, intensity: 1, color: [1, 0.95, 0.85], fixture: { sx: 0.8, sy: 0.08, sz: 0.3, oy: 0.08 } });
    return {
      playerSpawns: [{ pos: new Vector3(4, 0, 10), yaw: Math.PI / 2 }],
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      security: SECLAB_SECURITY,
      debugPoints: [
        { group: 'seclab', id: 'lit', label: 'Lit strip (fixed cam, 10 m)', pos: new Vector3(11, 0, 7), yaw: -Math.PI / 2 },
        { group: 'seclab', id: 'dark', label: 'Dark corner (fixed cam)', pos: new Vector3(10, 0, 1.5), yaw: -Math.PI / 2 },
        { group: 'seclab', id: 'pad', label: 'Lit pad (panning cam)', pos: new Vector3(14, 0, 12), yaw: Math.PI / 2 },
      ],
    };
  },
};
