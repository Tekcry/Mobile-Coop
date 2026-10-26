import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { SectorDef } from '../../game/sectors';

/**
 * Thornbeck Mill (piano-escape, `scene: 'piano'`): a storm grain mill in Hollowmere, the setting of
 * the piano escape scene (the piano is the music theme only; Player Build's knife gate reads `scene`). Listed in `MAPS`
 * only behind `flags.pianoEscape` (`maps/index.ts`).
 *
 * STUB. The greybox waits for Michael's map click (G288): no walls, rooms, cover, lamps, windows or guards yet. This
 * file holds the id, the name, the scene tag, the sector mode and one SectorDef with the `clear` objective and no guards,
 * on a bare floor, so the scene shell (`game/pianoScene.ts`) and the menu entry can be built and tested. The map's
 * numbers (rooms, doors, 8 guards, lamps, window lights, extract) come with the greybox slice; the objective and exit
 * lines below are placeholders until the map says what and where (G343).
 */

/** The scene's one section (placeholder start, exit and lines until the greybox). */
export const THORNBECK_SECTORS: readonly SectorDef[] = [
  {
    id: 'thornbeckMill',
    name: 'Thornbeck Mill',
    start: { x: 0, y: 0, z: 0, yaw: 0 },
    start2: { x: 1.2, y: 0, z: 0, yaw: 0 },
    objective: { kind: 'clear', label: 'Take down every guard. Then get out.', x: 0, y: 0, z: 0, yaw: 0 },
    extract: { label: 'Get out', box: [8, -2, 12, 2] },
    guards: [],
    reinforce: [],
    perStage: 0,
    routes: [{ name: 'placeholder', pts: [[0, 0], [10, 0]], obj: 0 }],
  },
];

export const thornbeckMill: MapDef = {
  id: 'thornbeckMill',
  name: 'Thornbeck Mill',
  description: 'A grain mill in a storm, held by a night crew. The lights are about to go.',
  modes: ['sector'],
  scene: 'piano',
  sectors: THORNBECK_SECTORS,
  detail: false,
  theme: {
    sky: '#05070b',
    horizon: '#0b0f16',
    ground: '#1c1f22',
    fogStart: 20,
    fogEnd: 70,
    sunDir: [0.35, -1, 0.55],
    sunIntensity: 0,
    ambient: 0.05,
    lightLevel: 0.02,
    faction: 'urban',
  },
  build(b: LevelBuilder): MapLayout {
    // bare floor and a perimeter only: the greybox waits for Michael's map click
    b.floor(5, 0, 30, 20, '#3a3d40', 0, 1);
    b.perimeter(-10, 20, -10, 10, 4, '#2c3033');
    return {
      playerSpawns: [
        { pos: new Vector3(0, 0, 0), yaw: 0 },
        { pos: new Vector3(1.2, 0, 0), yaw: 0 },
      ],
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      navSeeds: [new Vector3(0, 0, 0)],
    };
  },
};
