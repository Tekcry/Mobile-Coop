import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import { PALETTE } from '../materials';

/** Test map: movement features (steps, slopes, stairs, crouch tunnel), cover and physics props. */
export const provingGrounds: MapDef = {
  id: 'proving',
  name: 'Proving Grounds',
  description: 'Training yard with ramps, stairs, cover and physics props.',
  modes: ['sandbox', 'wave'],
  theme: {
    sky: '#8fb8de',
    horizon: '#d5e6f2',
    ground: '#7d9466',
    fogStart: 35,
    fogEnd: 110,
    sunDir: [-0.45, -1, 0.35],
    sunIntensity: 0.85,
    ambient: 0.7,
  },
  build(b: LevelBuilder): MapLayout {
    const C = PALETTE;
    b.floor(0, 0, 64, 64, C.ground, 0, 1);
    b.perimeter(-30, 30, -30, 30, 4, C.wallDark);
    // concrete pad in the middle
    b.floor(0, 0, 18, 18, C.concrete, 0.02, 0.04);

    // raised platform (north) with ramp and stairs
    b.block(0, 16, 10, 2.4, 6, C.concreteDark);
    b.block(0, 16, 10, 0.2, 6, C.concrete, 2.4);
    b.ramp(-8.5, 16, 3, 7, 2.6, C.wall, Math.PI / 2); // rises toward +X onto platform
    b.stairs(8.5, 16, 3, 7, 2.6, 9, C.wall, -Math.PI / 2);
    b.lowCover(0, 13.6, 4, C.wallDark, Math.PI / 2, 1, 0.3); // parapet
    // step test row (west)
    [0.15, 0.3, 0.42, 0.6, 0.9].forEach((h, i) => b.block(-22, -14 + i * 3.2, 2.4, h, 2.4, i < 3 ? C.hazard : C.red));
    // slope test (east): 20, 35, 55 degrees
    [20, 35, 55].forEach((deg, i) => {
      const len = 5;
      const rise = Math.tan((deg * Math.PI) / 180) * len;
      b.ramp(21, 4 + i * 8, 3, len, Math.min(rise, 6), deg < 50 ? C.concrete : C.red, 0);
    });
    // crouch tunnel (south west)
    b.block(-12, -22, 0.5, 1.4, 6, C.wallDark, 0);
    b.block(-9.5, -22, 0.5, 1.4, 6, C.wallDark, 0);
    b.block(-10.75, -22, 3, 0.4, 6, C.wall, 1.4);

    // cover garden (centre / south)
    b.lowCover(-5, -6, 4, C.wall);
    b.lowCover(5, -6, 4, C.wall);
    b.lowCover(0, -12, 6, C.wall, Math.PI / 2);
    b.highCover(-10, 2, 4, C.wallDark);
    b.highCover(10, 2, 4, C.wallDark);
    b.highCover(0, -20, 8, C.wallDark, Math.PI / 2);
    b.pillar(-6, 6, 0.5, 4, C.concrete);
    b.pillar(6, 6, 0.5, 4, C.concrete);
    b.pillar(-14, -6, 0.6, 4, C.concrete);
    b.pillar(14, -6, 0.6, 4, C.concrete);
    // close-quarters lane (north west): a wall with a 1.1 m doorway, and a free-standing wall corner
    b.wall(-27, 8, -20.55, 8, 3, C.wall);
    b.wall(-19.45, 8, -14, 8, 3, C.wall);
    b.wall(-16, 0.5, -16, 5, 3, C.wallDark);
    // L-shaped building shell (south east) with doorway
    b.wall(12, -18, 24, -18, 3.2, C.wall);
    b.wall(24, -18, 24, -26, 3.2, C.wall);
    b.wall(12, -18, 12, -21, 3.2, C.wall);
    b.wall(12, -24, 12, -26, 3.2, C.wall);
    b.box(18, 3.3, -22, 12.4, 0.2, 8.4, C.concreteDark);

    const props: MapLayout['props'] = [];
    const v = (x: number, z: number, y = 0): Vector3 => new Vector3(x, y, z);
    props.push({ kind: 'crate', pos: v(-3, 3) }, { kind: 'crate', pos: v(-1.9, 3.1), yaw: 0.2 }, { kind: 'crate', pos: v(-2.45, 3.05, 1.02) });
    props.push({ kind: 'smallCrate', pos: v(3, 3) }, { kind: 'smallCrate', pos: v(3.7, 3.4) }, { kind: 'box', pos: v(3.2, 2.2) });
    props.push({ kind: 'barrel', pos: v(-8, -2) }, { kind: 'barrel', pos: v(-8.7, -2.4) }, { kind: 'barrel', pos: v(8, -2) });
    props.push({ kind: 'explosiveBarrel', pos: v(-3, -9) }, { kind: 'explosiveBarrel', pos: v(3, -9) }, { kind: 'explosiveBarrel', pos: v(16, -14) });
    props.push({ kind: 'crate', pos: v(18, -22) }, { kind: 'smallCrate', pos: v(19.2, -22.2) }, { kind: 'box', pos: v(0, 16, 2.6) });

    const enemySpawns = [v(-25, 25), v(25, 25), v(-25, -25), v(25, 0), v(-25, 0), v(0, 26)];
    return {
      playerSpawns: [
        { pos: v(0, -2), yaw: 0 },
        { pos: v(-2, -2), yaw: 0 },
        { pos: v(2, -2), yaw: 0 },
        { pos: v(0, -4), yaw: 0 },
      ],
      enemySpawns,
      props,
      objectives: [],
      pickups: [
        { pos: v(-6, -2), kind: 'ammo' },
        { pos: v(6, -2), kind: 'health' },
        { pos: v(0, 16, 2.6), kind: 'ammo' },
      ],
    };
  },
};
