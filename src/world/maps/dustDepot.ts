import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import { mulberry, pickOne, randRange } from '../../core/rng';

const SAND = '#c2a878';
const WALL = '#cdb894';
const WALL_DARK = '#9b8463';
const CONCRETE = '#a59e92';
const CONTAINERS = ['#a8453a', '#3d6e8f', '#5e7a3a', '#c98a2e', '#6b5b8a', '#4f5d66'];
const WOOD = '#8a6a4c';
const STEEL = '#5b5f63';
const OLIVE = '#4f5a3a';
const SANDBAG = '#b8a27a';
const ROOF = '#7a6a55';

/** `deco` is a separate stream for set dressing, so the procedural layout (`rng`) stays as it was. */
type Module = (b: LevelBuilder, cx: number, cz: number, rng: () => number, props: MapLayout['props'], deco: () => number) => void;

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
  b.block(x1 + 0.95, cz + 2, 1.2, 1.2, 1.4, WOOD);
  // north wall: an open window at the west end (a quiet way in beside the terminal), the door further east
  b.wall(x0, z1, cx - 4.6, z1, h, WALL);
  b.wall(cx - 3.4, z1, cx - door / 2 + 3, z1, h, WALL);
  b.box(cx - 4, 0.45, z1, 1.2, 0.9, 0.4, WALL);
  b.box(cx - 4, 2.75, z1, 1.2, 1.3, 0.4, WALL);
  b.windowAt(cx - 4, 1.5, z1, 1.2, 1.2, 0, { sill: 0.9, open: true });
  b.wall(cx + door / 2 + 3, z1, x1, z1, h, WALL);
  b.wall(x0, z0, x0, cz - 1, h, WALL_DARK);
  b.wall(x0, cz + door - 1, x0, z1, h, WALL_DARK);
  b.wall(x1, z0, x1, z1, h, WALL_DARK);
  b.floor(cx, cz, w, d, CONCRETE, 0.02, 0.04);
  b.pillar(cx - 3, cz, 0.35, h, WALL_DARK);
  b.pillar(cx + 3, cz, 0.35, h, WALL_DARK);
  b.lowCover(cx - 4.5, cz + 3, 3, WALL_DARK, Math.PI / 2);
  b.lowCover(cx + 4, cz - 3, 3, WALL_DARK, Math.PI / 2);
  // stores: a tall shelf on the north wall, a workbench on the south wall, a pallet stack in the south-west corner
  b.block(cx + 5.6, z1 - 0.5, 2.0, 2.2, 0.6, '#6b5b45');
  b.block(cx + 4.5, z0 + 0.6, 2.0, 0.95, 0.8, WOOD);
  b.block(cx - 6, cz - 4.6, 1.2, 1.2, 1.2, '#a8784a');
  // a raised sheet roof on corner posts (visual, clear of anyone walking the wall tops): the inside is in shade
  b.box(cx, 5.6, cz, w + 0.6, 0.12, d + 0.6, ROOF, 0, 0, false);
  for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]] as const) b.box(px, 4.5, pz, 0.2, 2.2, 0.2, WALL_DARK, 0, 0, false);
  b.ambientZone(x0, x1, z0, z1, 0.4, -1, 3.3);
  for (let i = 0; i < 2; i++) props.push({ kind: rng() < 0.5 ? 'crate' : 'barrel', pos: new Vector3(cx + randRange(rng, -5, 5), 0, cz + randRange(rng, -4, 4)) });
};

/** Shipping container rows; some double-stacked. */
const containerYard: Module = (b, cx, cz, rng, _props, deco) => {
  // single (unstacked) containers by row and column: candidates for a ladder
  const single: { x: number; z: number; yaw: number; col: number; row: number }[] = [];
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
      else single.push({ x, z, yaw, col, row });
    }
  }
  b.lowCover(cx, cz, 2.4, WALL_DARK, 0);
  // a ladder up the outer end of one single container (middle row first): overwatch, and a sprint-hop
  // across the centre lane to the facing row
  single.sort((p, q) => Math.abs(p.row) - Math.abs(q.row));
  const c = single[0];
  if (c) {
    const d = c.yaw - Math.PI / 2;
    // outer end face centre and its outward normal
    const nx = c.col * Math.cos(d);
    const nz = -c.col * Math.sin(d);
    b.ladder(c.x + nx * 3.05, c.z + nz * 3.05, 0, 2.6, Math.atan2(-nx, -nz), STEEL);
  }
  // pallets left in the row gaps (flush to the middle row, a 1.8 m lane beside them); the gaps are in shade
  for (const s of [-1, 1]) {
    const col = deco() < 0.5 ? -1 : 1;
    b.block(cx + col * 4 + (deco() * 2 - 1) * 1.5, cz + s * 2.0, 1.2, 1.0, 1.0, WOOD, 0, (deco() - 0.5) * 0.3);
    b.ambientZone(cx - 7, cx + 7, cz + Math.min(s * 1.2, s * 4.3), cz + Math.max(s * 1.2, s * 4.3), 0.5, -1, 2.6);
  }
};

/** Broken walls and pillars. */
const ruins: Module = (b, cx, cz, rng, props, deco) => {
  // a burnt-out car on the road side (low cover: body, crushed cabin)
  {
    const x = cx + (deco() < 0.5 ? -7 : 7);
    const z = cz + (deco() * 2 - 1) * 3;
    const yaw = (deco() - 0.5) * 0.8;
    b.block(x, z, 1.8, 0.95, 4.0, '#3a3530', 0, yaw);
    b.block(x - Math.sin(yaw) * 0.3, z - Math.cos(yaw) * 0.3, 1.6, 0.45, 2.0, '#2a2622', 0.95, yaw);
  }
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
  // a watchtower on the north side of the square: overwatch on the cache, reached by a ladder (railing gap)
  const tz = cz + 6.2;
  b.box(cx, 3.5, tz, 2.4, 0.2, 2.4, WALL_DARK);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(cx + sx * 1.05, 1.7, tz + sz * 1.05, 0.22, 3.4, 0.22, '#6b5a44');
  b.box(cx - 1.15, 4.1, tz, 0.1, 1.0, 2.4, WOOD).box(cx + 1.15, 4.1, tz, 0.1, 1.0, 2.4, WOOD).box(cx, 4.1, tz - 1.15, 2.2, 1.0, 0.1, WOOD);
  b.box(cx - 0.8, 4.1, tz + 1.15, 0.8, 1.0, 0.1, WOOD).box(cx + 0.8, 4.1, tz + 1.15, 0.8, 1.0, 0.1, WOOD);
  b.ladder(cx, tz + 1.25, 0, 3.6, Math.PI, STEEL);
};

/** Procedural compound: 3x3 blocks of modules separated by roads. Objective blocks are fixed. */
export const dustDepot: MapDef = {
  id: 'depot',
  name: 'Dust Depot',
  description: 'Sun-baked supply depot: warehouses, container stacks and ruins.',
  modes: ['wave', 'mission', 'tdm', 'ffa'],
  theme: {
    weather: 'dust',
    sky: '#7fb0d8',
    horizon: '#e8dcc4',
    ground: SAND,
    fogStart: 40,
    fogEnd: 130,
    sunDir: [0.5, -1, 0.3],
    sunIntensity: 0.95,
    ambient: 0.65,
    floor: 'gravel',
    faction: 'desert',
    // dusk: warm, sun-bleached
    grade: { tint: [1.08, 1.0, 0.88], saturation: 0.92, contrast: 1.05 },
  },
  build(b: LevelBuilder, seed: number): MapLayout {
    const rng = mulberry(seed * 7919 + 13);
    const deco = mulberry(seed * 104729 + 7);
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
        if (mod) mod(b, cx, cz, rng, props, deco);
      }
    }
    // spawn corner cover + extraction pad surroundings
    b.lowCover(-S - 3, -S + 4, 3, WALL);
    b.lowCover(-S + 4, -S - 2, 3, WALL, Math.PI / 2);
    b.highCover(S - 6, S, 4, WALL_DARK);
    b.highCover(S, S - 6, 4, WALL_DARK, Math.PI / 2);
    // motor pool in the spawn corner: a cargo truck under camouflage netting (shade beside it), fuel drums
    b.block(-29, -27.5, 2.3, 1.2, 6.5, OLIVE);
    b.block(-29, -28.6, 2.4, 1.8, 4.2, '#5e6b45', 1.2).block(-29, -25.4, 2.3, 1.3, 1.8, OLIVE, 1.2);
    b.box(-29, 2.05, -24.48, 2.0, 0.55, 0.04, '#1d2730', 0, 0, false);
    b.box(-28.5, 4.2, -27.2, 5, 0.05, 7, '#5f6a48', 0, 0, false);
    for (const z of [-30.5, -23.9]) b.box(-26.1, 2.1, z, 0.08, 4.2, 0.08, STEEL, 0, 0, false);
    b.ambientZone(-31.5, -26, -31, -23.5, 0.45, -1, 3.3);
    for (const [x, z] of [[-17.5, -29.5], [-16.85, -29.9], [-17.3, -30.4]] as const) b.pillar(x, z, 0.3, 0.9, '#7a3a2e');
    // extraction pad: a painted helipad, fuel tanks behind it, a sandbag line
    b.box(S + 4, 0.03, S + 4, 5, 0.02, 5, '#8a8170', 0, 0, false);
    b.box(S + 3.2, 0.045, S + 4, 0.35, 0.01, 2.6, '#e8e2d0', 0, 0, false).box(S + 4.8, 0.045, S + 4, 0.35, 0.01, 2.6, '#e8e2d0', 0, 0, false);
    b.box(S + 4, 0.045, S + 4, 1.6, 0.01, 0.35, '#e8e2d0', 0, 0, false);
    b.pillar(30, 31, 1.2, 2.8, '#d8d2c4').pillar(32.4, 27.4, 1.2, 2.8, '#d8d2c4');
    b.lowCover(S + 6, S - 2.5, 3, SANDBAG, Math.PI / 2, 0.9, 0.7);
    // jersey barriers along the roads (low cover on the long crossings)
    b.lowCover(12.6, -18, 2.5, CONCRETE, 0, 0.9, 0.6).lowCover(-12.6, 18, 2.5, CONCRETE, 0, 0.9, 0.6);
    b.lowCover(16, 12.6, 2.5, CONCRETE, Math.PI / 2, 0.9, 0.6).lowCover(-18, -12.6, 2.5, CONCRETE, Math.PI / 2, 0.9, 0.6);
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
