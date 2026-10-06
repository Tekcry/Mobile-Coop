import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';

const CONCRETE = '#8e9396';
const FLOOR = '#6f7477';
const WALL = '#b7b2a6';
const WALL_DARK = '#7d786d';
const STEEL = '#55606a';
const RACK = '#3f6f9a';
const BEAM = '#e07b22';
const CRATE = '#a8784a';
const HAZARD = '#e8b923';
const DESK = '#8a6a4c';
const LIGHT = '#fff1c8';
const ROOF = '#4a4f55';

const H = 3.2; // interior wall height
const T = 0.3; // interior wall thickness

const wallX = (b: LevelBuilder, z: number, x0: number, x1: number, gaps: [number, number][], color = WALL, h = H): LevelBuilder => b.wallX(z, x0, x1, gaps, h, color, T);
const wallZ = (b: LevelBuilder, x: number, z0: number, z1: number, gaps: [number, number][], color = WALL, h = H): LevelBuilder => b.wallZ(x, z0, z1, gaps, h, color, T);

const ROOMS: RoomDef[] = [
  {
    id: 'dock',
    name: 'Loading Dock',
    minX: -24,
    maxX: -4,
    minZ: -18,
    maxZ: -6,
    squad: [
      { kind: 'grunt', x: -19, z: -10.5, yaw: Math.PI },
      { kind: 'grunt', x: -7.5, z: -15.5, yaw: -2.4 },
    ],
  },
  { id: 'dispatch', name: 'Dispatch', minX: -4, maxX: 6, minZ: -18, maxZ: -11, squad: [{ kind: 'grunt', x: 2.5, z: -16.5, yaw: -1.2 }] },
  {
    id: 'workshop',
    name: 'Workshop',
    minX: 6,
    maxX: 24,
    minZ: -18,
    maxZ: -11,
    squad: [
      { kind: 'grunt', x: 20.5, z: -12.5, yaw: Math.PI },
      { kind: 'runner', x: 11, z: -16.8, yaw: 0.6 },
    ],
  },
  { id: 'corridor', name: 'Corridor', minX: -4, maxX: 24, minZ: -11, maxZ: -8.8 },
  {
    id: 'racking',
    name: 'Racking Aisles',
    minX: -24,
    maxX: -4,
    minZ: -6,
    maxZ: 18,
    squad: [
      { kind: 'grunt', x: -18.5, z: 1, yaw: Math.PI },
      { kind: 'grunt', x: -10.5, z: 10, yaw: Math.PI },
      { kind: 'runner', x: -14.5, z: 15.5, yaw: Math.PI },
    ],
  },
  {
    id: 'floor',
    name: 'Factory Floor',
    minX: -4,
    maxX: 24,
    minZ: -8.8,
    maxZ: 12,
    squad: [
      { kind: 'grunt', x: 7.5, z: -1.5, yaw: Math.PI },
      { kind: 'grunt', x: 15.5, z: 6.5, yaw: -2.6 },
      { kind: 'heavy', x: 19.5, z: -4.5, yaw: -1.9 },
    ],
  },
  {
    id: 'mezz',
    name: 'Mezzanine',
    minX: 8,
    maxX: 24,
    minZ: 12,
    maxZ: 18,
    squad: [
      { kind: 'grunt', x: 13, z: 14.2, yaw: Math.PI },
      { kind: 'grunt', x: 22.5, z: 16.5, yaw: Math.PI },
    ],
  },
  { id: 'office', name: 'Office', minX: -4, maxX: 2, minZ: 12, maxZ: 18, squad: [{ kind: 'grunt', x: -2.5, z: 16.8, yaw: Math.PI }] },
  { id: 'manager', name: "Manager's Office", minX: 2, maxX: 8, minZ: 12, maxZ: 18, squad: [{ kind: 'heavy', x: 6.2, z: 13.4, yaw: -1.6 }] },
];

/**
 * Close-quarters warehouse: loading dock off a truck yard, dispatch and workshop offices, a tight
 * service corridor, tall racking aisles, an open factory floor with machines, a mezzanine deck over it
 * and two offices (the manager's is a dead end). Roofed, with skylight strips and hanging lights.
 * Rooms are tagged for the HUD, Clear mode and room-holding squads.
 */
export const warehouse: MapDef = {
  id: 'warehouse',
  name: 'Warehouse',
  description: 'Close quarters: dock, racking aisles, offices, corridors and a factory floor.',
  modes: ['clear', 'mission', 'wave'],
  theme: {
    sky: '#5d6f82',
    horizon: '#a9b3ba',
    ground: '#5f6364',
    fogStart: 30,
    fogEnd: 90,
    sunDir: [0.35, -1, 0.55],
    sunIntensity: 0.55,
    ambient: 0.62,
  },
  build(b: LevelBuilder): MapLayout {
    // ground, yard and building floor
    b.floor(0, -4, 54, 50, '#5a5e60', 0, 1);
    b.perimeter(-24, 24, -26, 18, 6, WALL_DARK);
    b.floor(0, 0, 48, 36, FLOOR, 0.02, 0.04);
    // south facade: two roller doors at the dock, a personnel door into the workshop
    wallX(b, -18, -24, 24, [[-20, -17], [-12, -9], [10.9, 12.1], [17, 18.1]], WALL_DARK, 6);
    // workshop window off the yard (open: vault through)
    b.box(11.5, 0.45, -18, 1.2, 0.9, T, WALL_DARK);
    b.box(11.5, 4.05, -18, 1.2, 3.9, T, WALL_DARK);
    b.windowAt(11.5, 1.5, -18, 1.2, 1.2, 0, { sill: 0.9, open: true });
    b.box(-18.5, 5, -18, 3.2, 2, 0.32, WALL_DARK);
    b.box(-10.5, 5, -18, 3.2, 2, 0.32, WALL_DARK);
    b.box(17.55, 4.5, -18, 1.3, 3, 0.32, WALL_DARK);
    for (const x of [-20, -17, -12, -9]) b.box(x, 2.5, -18.2, 0.12, 5, 0.12, HAZARD, 0, 0, false);

    // interior walls (doors 1.1 m, double doors 1.6 m)
    wallZ(b, -4, -18, 18, [[-15, -13.9], [-10.5, -9.3], [-8.2, -7.1], [-2, -0.9], [8, 9.1], [14, 15.1]]);
    wallX(b, -6, -24, -4, [[-16, -13], [-8, -6.9]]);
    wallX(b, -11, -4, 24, [[0, 1.1], [3.6, 4.8], [14, 15.1]]);
    // dispatch -> corridor: a glazed window (shatters through)
    b.box(4.2, 0.45, -11, 1.2, 0.9, T, WALL);
    b.box(4.2, 2.65, -11, 1.2, 1.1, T, WALL);
    b.windowAt(4.2, 1.5, -11, 1.2, 1.2, 0, { sill: 0.9, open: false, breakable: true });
    wallX(b, -8.8, -4, 24, [[2, 3.6], [18, 19.1]]);
    wallZ(b, 6, -18, -11, [[-16, -14.9]]);
    wallX(b, 12, -4, 8, [[-1.5, -0.4]]);
    wallZ(b, 2, 12, 18, [[15.5, 16.6]]);

    // loading dock: pallet stacks, a forklift, dock plates and a staging line
    b.block(-21.5, -9, 1.2, 1.3, 1.2, CRATE).block(-21.5, -7.6, 1.2, 1.0, 1.2, CRATE);
    b.block(-6.5, -9.5, 1.2, 1.6, 1.2, CRATE);
    b.block(-14.5, -11.5, 1.3, 1.5, 2.4, HAZARD).box(-14.5, 1.9, -10.2, 1.0, 2.2, 0.2, STEEL);
    b.lowCover(-10, -13.2, 2.6, CONCRETE, Math.PI / 2, 1.05, 0.5);
    b.lowCover(-20, -14.6, 2.2, CONCRETE, 0, 1.05, 0.5);
    b.block(-18.5, -17.2, 3, 0.08, 1.2, STEEL).block(-10.5, -17.2, 3, 0.08, 1.2, STEEL);

    // dispatch: desks and a shelf
    b.block(-1, -15.2, 1.8, 0.95, 0.8, DESK).block(3.2, -13.4, 0.8, 0.95, 1.8, DESK);
    b.block(5.3, -17.1, 0.8, 2.0, 1.6, STEEL);

    // workshop: benches, a lathe, lockers
    b.block(10, -14.6, 2.4, 1.0, 0.9, DESK).block(16, -13.2, 0.9, 1.0, 2.4, DESK);
    b.block(21, -15.6, 1.4, 1.8, 1.4, STEEL);
    b.block(23.45, -13.8, 0.6, 2.0, 2.6, STEEL);

    // racking aisles: four double-sided racks with a cross aisle, orange beams, pallets on top
    for (const x of [-20.5, -16.5, -12.5, -8.5]) {
      for (const [z0, z1] of [[-4.2, 4.2], [6.2, 16.6]] as const) {
        const len = z1 - z0;
        const cz = (z0 + z1) / 2;
        b.block(x, cz, 1.0, 2.8, len, RACK);
        for (const y of [1.0, 2.0]) b.box(x, y, cz, 1.08, 0.1, len + 0.04, BEAM, 0, 0, false);
        b.box(x, 3.1, cz - len / 4, 0.9, 0.6, 1.1, CRATE, 0, 0, false).box(x, 3.05, cz + len / 4, 0.9, 0.5, 1.2, CRATE, 0, 0, false);
      }
    }
    // ladders onto the racks: their tops are a route over the aisles (sprint-hop the cross aisle)
    b.ladder(-12.5, -4.25, 0, 2.8, 0, STEEL);
    b.ladder(-20.5, 16.65, 0, 2.8, Math.PI, STEEL);
    b.block(-22.6, 5.2, 1.0, 1.1, 1.0, CRATE);
    b.block(-6.2, 5.0, 1.2, 1.0, 1.2, CRATE);

    // factory floor: columns, a press, low machines, a conveyor line, stairs to the mezzanine
    for (const [x, z] of [[2, -4], [10, -4], [18, -1], [2, 5], [10, 5]] as const) b.pillar(x, z, 0.35, 6, CONCRETE);
    b.block(6, 1, 2.4, 2.6, 2.0, STEEL).box(6, 2.9, 1, 1.6, 0.6, 1.2, HAZARD, 0, 0, false);
    b.block(14, -2.5, 3.0, 1.2, 1.6, STEEL).block(14, 3.5, 3.0, 1.2, 1.6, STEEL);
    b.block(4, 8.6, 10, 1.0, 0.9, '#3d4247');
    b.block(-1.8, -6.6, 1.2, 1.1, 1.2, CRATE);
    b.block(20.5, -6.8, 1.2, 1.5, 2.2, HAZARD);
    b.stairs(21.2, 9, 2.4, 6, 2.6, 10, CONCRETE, 0);

    // mezzanine: a deck along the north wall with railings and crates; offices under the west end
    b.block(16, 15, 16, 2.6, 6, WALL_DARK);
    // railing with gaps for a ladder (x 8.9) and the zipline (x 12)
    b.box(10.45, 3.1, 12.1, 2.1, 1.0, 0.15, HAZARD);
    b.box(16.25, 3.1, 12.1, 7.5, 1.0, 0.15, HAZARD);
    b.box(23.2, 3.1, 12.1, 1.6, 1.0, 0.15, HAZARD);
    // west railing with a gap at the duct mouth (z 15)
    b.box(8.1, 3.1, 13.2, 0.15, 1.0, 2.4, HAZARD);
    b.box(8.1, 3.1, 16.8, 0.15, 1.0, 2.4, HAZARD);
    b.ladder(8.9, 11.95, 0, 2.6, 0, STEEL);
    // zipline from the deck down over the factory floor
    b.pillar(12, 13.15, 0.06, 2.2, STEEL, 2.6);
    b.zipline({ x: 12, y: 4.6, z: 12.9 }, { x: 12, y: 2.3, z: 1.2 });
    // the manager's office gets a ceiling (3.2 - 3.4) with a vent; a duct over it from the deck
    const slab0 = b.boxes.length;
    const vx0 = 6.35;
    const vx1 = 7.15;
    const vz0 = 14.6;
    const vz1 = 15.4;
    b.box((2.15 + vx0) / 2, 3.3, 15, vx0 - 2.15, 0.2, 5.7, CONCRETE);
    b.box((vx1 + 7.85) / 2, 3.3, 15, 7.85 - vx1, 0.2, 5.7, CONCRETE);
    b.box((vx0 + vx1) / 2, 3.3, (12.15 + vz0) / 2, vx1 - vx0, 0.2, vz0 - 12.15, CONCRETE);
    b.box((vx0 + vx1) / 2, 3.3, (vz1 + 17.85) / 2, vx1 - vx0, 0.2, 17.85 - vz1, CONCRETE);
    b.box(8.12, 3.3, 15, 0.55, 0.2, 1.2, STEEL);
    b.box(7.05, 3.8, 14.45, 2.7, 0.8, 0.1, STEEL);
    b.box(7.05, 3.8, 15.55, 2.7, 0.8, 0.1, STEEL);
    b.box(7.05, 4.25, 15, 2.7, 0.1, 1.2, STEEL);
    b.box(5.7, 3.8, 15, 0.1, 0.8, 1.0, STEEL);
    b.mark(slab0, { overhead: true, noLedge: true });
    b.duct(
      [
        { x: 8.15, y: 3.4, z: 15 },
        { x: 6.75, y: 3.4, z: 15 },
      ],
      { pos: { x: 8.4, y: 3.8, z: 15 }, nx: 1, ny: 0, nz: 0, where: 'wall' },
      { pos: { x: 6.75, y: 3.3, z: 15 }, nx: 0, ny: -1, nz: 0, where: 'ceiling' },
    );
    b.block(11.5, 15.8, 1.2, 1.1, 1.2, CRATE, 2.6).block(17.5, 14.2, 1.2, 1.3, 1.2, CRATE, 2.6).block(18.7, 14.3, 1.0, 1.0, 1.0, CRATE, 2.6);

    // offices: desks, filing cabinets
    b.block(-2.2, 15, 1.6, 0.95, 0.8, DESK).block(0.8, 13.6, 0.8, 0.95, 1.4, DESK);
    b.block(4.6, 15.6, 1.8, 0.95, 0.9, DESK);
    b.block(7.4, 17.2, 0.6, 1.8, 1.0, STEEL).block(-3.5, 17.3, 0.6, 1.8, 0.9, STEEL);

    // yard: trailer, container, jersey barriers
    b.block(-3.5, -22.5, 7, 2.8, 2.5, '#d8d8d8').box(-3.5, 0.45, -22.5, 6.2, 0.9, 2.3, '#2a2d30', 0, 0, false);
    b.block(9, -23, 6, 2.6, 2.4, '#3d6e8f');
    b.lowCover(-14, -21.5, 3, CONCRETE, Math.PI / 2, 1.0, 0.6);
    b.lowCover(16, -21.2, 2.6, CONCRETE, Math.PI / 2, 1.0, 0.6);

    // roof with skylight strips and hanging lights (visual only: no collision, nav samples the floor)
    for (let z = -18; z < 18; z += 6) b.box(0, 6.15, z + 2.4, 48, 0.25, 4.8, ROOF, 0, 0, false);
    for (let x = -18; x <= 18; x += 9) for (let z = -15; z <= 15; z += 6) b.box(x, 5.2, z, 0.25, 0.08, 2.6, LIGHT, 0, 0, false);

    const v = (x: number, z: number, y = 0): Vector3 => new Vector3(x, y, z);
    const props: MapLayout['props'] = [
      { kind: 'barrel', pos: v(-22.8, -16.5) },
      { kind: 'barrel', pos: v(-22.2, -17.0) },
      { kind: 'explosiveBarrel', pos: v(22.8, -9.9) },
      { kind: 'crate', pos: v(12.5, 9.8) },
      { kind: 'smallCrate', pos: v(-6.4, 11.5) },
      { kind: 'explosiveBarrel', pos: v(-8.2, -22) },
      { kind: 'barrel', pos: v(20.5, -24) },
      { kind: 'box', pos: v(-2, -12) },
    ];
    return {
      playerSpawns: [
        { pos: v(-14.5, -24), yaw: 0 },
        { pos: v(-16, -24), yaw: 0 },
        { pos: v(-13, -24), yaw: 0 },
        { pos: v(-14.5, -25.2), yaw: 0 },
      ],
      enemySpawns: [v(-18.5, 10), v(-12.5, 5.2), v(13, -13), v(20, 2), v(0, -14), v(10, -10), v(5, -3), v(-0.5, 16.8), v(-21, -12), v(14, 9.5)],
      props,
      objectives: [
        { id: 'termA', pos: v(5.2, 16.8), kind: 'terminal' },
        { id: 'termB', pos: v(22.6, -16.6), kind: 'terminal' },
        { id: 'cache', pos: v(15, 16.3, 2.6), kind: 'cache' },
        { id: 'extract', pos: v(18.5, -23.2), kind: 'extract' },
      ],
      pickups: [
        { pos: v(-12.5, -16), kind: 'ammo' },
        { pos: v(-2.5, -12.2), kind: 'health' },
        { pos: v(-14.5, 5.2), kind: 'ammo' },
        { pos: v(12, -0.5), kind: 'health' },
        { pos: v(8.5, -15.5), kind: 'ammo' },
        { pos: v(21, 14.5, 2.6), kind: 'health' },
      ],
      rooms: ROOMS,
    };
  },
};
