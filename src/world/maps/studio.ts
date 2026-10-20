import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';

/**
 * (anim-studio) The Anim Studio stage: a dev scene, not a level (it is not in `MAPS`, no menu lists it, no mode
 * supports it; `getMap('studio')` finds it in `DEV_MAPS`, `?autostart=studio` boots it in Free Roam). The level design
 * standard (`docs/level-design.md`) binds playable maps; this is a plain room to look at the animation in, like the old
 * menu void: a 16 x 16 m dark floor with a 1 m grid (visual only: thin boxes that never collide), dark walls all round as
 * the backdrop, a warm key lamp front left, a cool rim lamp behind and a soft fill. Wren stands in the middle facing +z.
 * x east, z north, floor at 0.
 */
const SIZE = 16;
const C = SIZE / 2;

export const studio: MapDef = {
  id: 'studio',
  name: 'Anim Studio',
  description: 'Developer stage for the animation tuner and loop player.',
  modes: [],
  // no dressing (nothing on the walls): a plain stage
  detail: false,
  theme: {
    sky: '#121418',
    horizon: '#181b20',
    ground: '#22262b',
    fogStart: 60,
    fogEnd: 160,
    sunDir: [-0.3, -1, 0.2],
    sunIntensity: 0.2,
    ambient: 0.45,
    lightLevel: 0.6,
  },
  build(b: LevelBuilder): MapLayout {
    const FLOOR = '#3a3e44';
    const LINE = '#5c636b';
    const AXIS = '#7d8792';
    const WALL = '#26292e';
    b.floor(C, C, SIZE, SIZE, FLOOR, 0, 0.4);
    b.perimeter(0, SIZE, 0, SIZE, 5, WALL);
    b.box(C, 5.15, C, SIZE + 0.6, 0.3, SIZE + 0.6, WALL);
    // the grid: 1 m lines, the centre lines brighter (visual only, never collide)
    for (let i = 1; i < SIZE; i++) {
      const col = i === C ? AXIS : LINE;
      const w = i === C ? 0.03 : 0.015;
      b.box(i, 0.004, C, w, 0.008, SIZE - 0.4, col, 0, 0, false);
      b.box(C, 0.004, i, SIZE - 0.4, 0.008, w, col, 0, 0, false);
    }
    // key (warm, front left, high), rim (cool, behind right), fill (soft, front right)
    b.light({ kind: 'lamp', x: C - 3, y: 4.6, z: C + 3, radius: 11, intensity: 1, color: [1, 0.93, 0.82] });
    b.light({ kind: 'lamp', x: C + 2.5, y: 4.2, z: C - 3.5, radius: 9, intensity: 0.8, color: [0.75, 0.85, 1] });
    b.light({ kind: 'lamp', x: C + 3.5, y: 3.6, z: C + 2.5, radius: 8, intensity: 0.45, color: [0.95, 0.95, 1] });
    return {
      playerSpawns: [{ pos: new Vector3(C, 0, C), yaw: 0 }],
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      camSize: 'open',
    };
  },
};
