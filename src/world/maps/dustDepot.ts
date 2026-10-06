import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import { mulberry, pickOne, randRange } from '../../core/rng';

const SAND = '#c2a878';
const WALL = '#cdb894';
const WALL_DARK = '#9b8463';
const CONCRETE = '#a59e92';
const CONTAINERS = ['#a8453a', '#3d6e8f', '#5e7a3a', '#c98a2e', '#6b5b8a', '#4f5d66'];

type Module = (b: LevelBuilder, cx: number, cz: number, rng: () => number, props: MapLayout['props']) => void;

/** Roofless warehouse shell with door gaps and interior cover. */
const warehouse: Module = (b, cx, cz, rng, props) => {
  const w = 14;
  const d = 12;
  const h = 3.4;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const z0 = cz - d / 2;
  const z1 = cz + d / 2;
  const door = 2.6;
  // south and north walls with a centred door each, east/west with an off-centre door
  // south wall: a door and an open window (vault through)
  b.wall(x0, z0, cx - 4.6, z0, h, WALL);
  b.wall(cx - 3.4, z0, cx - door / 2, z0, h, WALL);
  b.box(cx - 4, 0.45, z0, 1.2, 0.9, 0.4, WALL);
  b.box(cx - 4, 2.75, z0, 1.2, 1.3, 0.4, WALL);
  b.windowAt(cx - 4, 1.5, z0, 1.2, 1.2, 0, { sill: 0.9, open: true });
  b.wall(cx + door / 2, z0, x1, z0, h, WALL);
  // a crate against the east wall: mantle it, grab the wall top, climb along it, drop inside
  b.block(x1 + 0.95, cz + 2, 1.2, 1.2, 1.4, '#8a6a4c');
  b.wall(x0, z1, cx - door / 2 + 3, z1, h, WALL);
  b.wall(cx + door / 2 + 3, z1, x1, z1, h, WALL);
  b.wall(x0, z0, x0, cz - 1, h, WALL_DARK);
  b.wall(x0, cz + door - 1, x0, z1, h, WALL_DARK);
  b.wall(x1, z0, x1, z1, h, WALL_DARK);
  b.floor(cx, cz, w, d, CONCRETE, 0.02, 0.04);
  b.pillar(cx - 3, cz, 0.35, h, WALL_DARK);
  b.pillar(cx + 3, cz, 0.35, h, WALL_DARK);
  b.lowCover(cx - 4.5, cz + 3, 3, WALL_DARK, Math.PI / 2);
  b.lowCover(cx + 4, cz - 3, 3, WALL_DARK, Math.PI / 2);
  for (let i = 0; i < 2; i++) props.push({ kind: rng() < 0.5 ? 'crate' : 'barrel', pos: new Vector3(cx + randRange(rng, -5, 5), 0, cz + randRange(rng, -4, 4)) });
};

/** Shipping container rows; some double-stacked. */
const containerYard: Module = (b, cx, cz, rng) => {
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col += 2) {
      if (rng() < 0.2) continue;
      const x = cx + col * 4 + randRange(rng, -0.5, 0.5);
      const z = cz + row * 5.5;
      const yaw = Math.PI / 2 + randRange(rng, -0.08, 0.08);
      const col1 = pickOne(rng, CONTAINERS);
      b.box(x, 1.3, z, 2.4, 2.6, 6, col1, yaw);
      b.box(x, 2.62, z, 2.5, 0.06, 6.1, '#2b2f36', yaw, 0, false);
      if (rng() < 0.35) b.box(x, 3.9, z, 2.4, 2.6, 6, pickOne(rng, CONTAINERS), yaw + randRange(rng, -0.1, 0.1));
    }
  }
  b.lowCover(cx, cz, 2.4, WALL_DARK, 0);
};

/** Broken walls and pillars. */
const ruins: Module = (b, cx, cz, rng, props) => {
  for (let i = 0; i < 6; i++) {
    const x = cx + randRange(rng, -6.5, 6.5);
    const z = cz + randRange(rng, -6.5, 6.5);
    const yaw = rng() < 0.5 ? 0 : Math.PI / 2;
    if (rng() < 0.55) b.lowCover(x, z, randRange(rng, 2, 4), WALL, yaw);
    else b.highCover(x, z, randRange(rng, 2.5, 4), WALL_DARK, yaw);
  }
  for (let i = 0; i < 3; i++) b.pillar(cx + randRange(rng, -7, 7), cz + randRange(rng, -7, 7), 0.4, randRange(rng, 1.2, 3.5), WALL);
  props.push({ kind: 'explosiveBarrel', pos: new Vector3(cx + randRange(rng, -4, 4), 0, cz + randRange(rng, -4, 4)) });
};

/** Open square with a raised central platform (high ground) and scattered cover. */
const plaza: Module = (b, cx, cz, rng, props) => {
  b.floor(cx, cz, 16, 16, CONCRETE, 0.02, 0.04);
  b.block(cx, cz, 5, 1.2, 5, WALL_DARK);
  b.ramp(cx - 4.6, cz, 2.4, 4.2, 1.2, WALL, Math.PI / 2);
  b.stairs(cx + 4.6, cz, 2.4, 4.2, 1.2, 5, WALL, -Math.PI / 2);
  b.lowCover(cx, cz + 1.9, 2.2, WALL, Math.PI / 2, 0.95, 0.3);
  b.lowCover(cx - 6, cz - 6, 2.5, WALL, 0.6);
  b.lowCover(cx + 6, cz + 6, 2.5, WALL, 0.6);
  b.lowCover(cx + 6, cz - 6, 2.5, WALL, -0.6);
  b.lowCover(cx - 6, cz + 6, 2.5, WALL, -0.6);
  props.push({ kind: 'smallCrate', pos: new Vector3(cx + randRange(rng, -3, 3), 0, cz - 6.5) });
};

/** Procedural compound: 3x3 blocks of modules separated by roads. Objective blocks are fixed. */
export const dustDepot: MapDef = {
  id: 'depot',
  name: 'Dust Depot',
  description: 'Sun-baked supply depot: warehouses, container stacks and ruins.',
  modes: ['wave', 'mission'],
  theme: {
    sky: '#7fb0d8',
    horizon: '#e8dcc4',
    ground: SAND,
    fogStart: 40,
    fogEnd: 130,
    sunDir: [0.5, -1, 0.3],
    sunIntensity: 0.95,
    ambient: 0.65,
    floor: 'gravel',
  },
  build(b: LevelBuilder, seed: number): MapLayout {
    const rng = mulberry(seed * 7919 + 13);
    b.floor(0, 0, 84, 84, SAND, 0, 1);
    b.perimeter(-36, 36, -36, 36, 4.5, WALL_DARK);
    const props: MapLayout['props'] = [];
    const S = 22;
    // fixed objective layout, procedural fill elsewhere
    const grid: (Module | null)[][] = [
      [null, containerYard, warehouse], // z = -S row: spawn corner (west) empty, terminal B warehouse east
      [ruins, plaza, containerYard], // centre row: cache on plaza
      [warehouse, ruins, null], // z = +S row: terminal A warehouse west, extraction corner east
    ];
    const fill = [containerYard, ruins];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cx = (c - 1) * S;
        const cz = (r - 1) * S;
        let mod = grid[r]![c]!;
        if (mod && mod !== warehouse && mod !== plaza && rng() < 0.4) mod = pickOne(rng, fill);
        if (mod) mod(b, cx, cz, rng, props);
      }
    }
    // spawn corner cover + extraction pad surroundings
    b.lowCover(-S - 3, -S + 4, 3, WALL);
    b.lowCover(-S + 4, -S - 2, 3, WALL, Math.PI / 2);
    b.highCover(S - 6, S, 4, WALL_DARK);
    b.highCover(S, S - 6, 4, WALL_DARK, Math.PI / 2);
    // road-side clutter
    for (let i = 0; i < 6; i++) {
      const onX = rng() < 0.5;
      const k = pickOne(rng, [-11, 11]);
      const t = randRange(rng, -30, 30);
      props.push({ kind: rng() < 0.3 ? 'explosiveBarrel' : rng() < 0.5 ? 'barrel' : 'crate', pos: new Vector3(onX ? t : k, 0, onX ? k : t) });
    }
    const v = (x: number, z: number): Vector3 => new Vector3(x, 0, z);
    return {
      playerSpawns: [
        { pos: v(-S, -S), yaw: Math.PI / 4 },
        { pos: v(-S - 2, -S), yaw: Math.PI / 4 },
        { pos: v(-S, -S - 2), yaw: Math.PI / 4 },
        { pos: v(-S - 2, -S - 2), yaw: Math.PI / 4 },
      ],
      enemySpawns: [v(0, -S), v(S, 0), v(-S, 0), v(0, S), v(S + 6, -S - 6), v(-S - 6, S + 8), v(S - 2, S - 10), v(10, 10)],
      props,
      objectives: [
        { id: 'termA', pos: v(-S - 5, S + 3), kind: 'terminal' },
        { id: 'termB', pos: v(S + 5, -S - 3), kind: 'terminal' },
        { id: 'cache', pos: new Vector3(0, 1.2, 0), kind: 'cache' },
        { id: 'extract', pos: v(S + 4, S + 4), kind: 'extract' },
      ],
      pickups: [
        { pos: v(-S + 3, -S + 3), kind: 'ammo' },
        { pos: v(-11, 0), kind: 'health' },
        { pos: v(11, 0), kind: 'ammo' },
        { pos: v(0, 11), kind: 'health' },
        { pos: v(0, -11), kind: 'ammo' },
        { pos: v(S, S - 3), kind: 'health' },
      ],
    };
  },
};
