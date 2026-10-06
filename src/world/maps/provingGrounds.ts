import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import { PALETTE } from '../materials';
import type { RoomDef } from '../rooms';

/** Mini room set (north west) for Clear mode and close-quarters tests: two rooms off a hall. */
const ROOMS: RoomDef[] = [
  { id: 'miniA', name: 'Room A', minX: -30, maxX: -22, minZ: 12, maxZ: 20, squad: [{ kind: 'grunt', x: -27.5, z: 17.5, yaw: Math.PI }] },
  { id: 'miniB', name: 'Room B', minX: -22, maxX: -15.5, minZ: 12, maxZ: 20, squad: [{ kind: 'grunt', x: -19.5, z: 17.8, yaw: Math.PI }] },
  { id: 'miniC', name: 'Back Hall', minX: -30, maxX: -15.5, minZ: 20, maxZ: 30, squad: [{ kind: 'grunt', x: -24, z: 27, yaw: Math.PI }] },
];

/** Test map: movement features (steps, slopes, stairs, crouch tunnel), cover and physics props. */
export const provingGrounds: MapDef = {
  id: 'proving',
  name: 'Proving Grounds',
  description: 'Training yard with ramps, stairs, cover and physics props.',
  modes: ['sandbox', 'wave', 'clear'],
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
    b.lowCover(-5, -1.2, 2.4, C.wall); // in line with the one above, 1.6 m gap: SWAT turn
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
    // mini room set (north west): doors 1.1 m
    b.wallX(12, -30, -15.5, [[-27, -25.9], [-18.6, -17.5]], 3, C.wall);
    b.wallZ(-22, 12, 20, [[15.5, 16.6]], 3, C.wallDark);
    b.wallX(20, -30, -15.5, [[-19, -17.9]], 3, C.wall);
    b.wallZ(-15.5, 12, 30, [[24, 25.1]], 3, C.wall);
    b.lowCover(-26, 15, 1.6, C.wallDark, Math.PI / 2);
    b.block(-18, 22.5, 1.2, 1.1, 1.2, C.crate);

    // traversal course (north east, driven by e2e-traverse): a 3.6 m tower with a ladder (west face) and a
    // drainpipe (south face) up to its lip; two 2.3 m hang blocks 2 m apart (grab, shimmy, round the corners,
    // jump across, climb up); a horizontal pipe between two posts
    b.block(27.5, 11, 3, 3.6, 3, C.concreteDark);
    b.ladder(25.95, 11, 0, 3.6, Math.PI / 2);
    b.pipeV(27.8, 9.42, 0, 3.6, 0);
    b.block(27.5, 16, 3, 2.3, 3, C.wall);
    b.block(27.5, 20, 3, 2.3, 2, C.wall);
    b.pillar(23, 23.5, 0.1, 2.5, C.metal);
    b.pillar(28.6, 23.5, 0.1, 2.5, C.metal);
    b.pipeH(23, 23.5, 28.6, 23.5, 2.4);
    // zipline off the tower's south edge down towards the shed
    b.pillar(26.12, 9.6, 0.06, 2.3, C.metal, 3.6);
    b.box(26.26, 5.55, 9.5, 0.3, 0.05, 0.05, C.metal, 0, 0, false);
    b.zipline({ x: 26.4, y: 5.5, z: 9.4 }, { x: 24.5, y: 2.3, z: 1.5 });

    // shed (south east, 6 x 6 m): an open window (south), a glazed one (north) and a door; a duct on its ceiling
    // slab, entered from a platform (ladder on its west face) by its grate, dropping into the shed through a
    // ceiling vent
    const SH = 3;
    b.wall(23, -8, 25.4, -8, SH, C.wall, 0.3);
    b.wall(26.6, -8, 29, -8, SH, C.wall, 0.3);
    b.box(26, 0.45, -8, 1.2, 0.9, 0.3, C.wall);
    b.box(26, 2.55, -8, 1.2, 0.9, 0.3, C.wall);
    b.windowAt(26, 1.5, -8, 1.2, 1.2, 0, { sill: 0.9, open: true });
    b.wall(23, -2, 24.4, -2, SH, C.wall, 0.3);
    b.wall(25.6, -2, 27, -2, SH, C.wall, 0.3);
    b.wall(28.2, -2, 29, -2, SH, C.wall, 0.3);
    b.box(25, 0.45, -2, 1.2, 0.9, 0.3, C.wall);
    b.box(25, 2.55, -2, 1.2, 0.9, 0.3, C.wall);
    b.box(27.6, 2.6, -2, 1.2, 0.8, 0.3, C.wall);
    b.windowAt(25, 1.5, -2, 1.2, 1.2, 0, { sill: 0.9, open: false, breakable: true });
    b.wall(23, -8.15, 23, -1.85, SH, C.wallDark, 0.3);
    b.wall(29, -8.15, 29, -1.85, SH, C.wallDark, 0.3);
    // ceiling slab (3.0 - 3.2) around a 0.8 m vent hatch at (27.35, -5)
    const slab0 = b.boxes.length;
    const vx0 = 26.95;
    const vx1 = 27.75;
    const vz0 = -5.4;
    const vz1 = -4.6;
    b.box((22.85 + vx0) / 2, 3.1, -5, vx0 - 22.85, 0.2, 6.3, C.concreteDark);
    b.box((vx1 + 29.15) / 2, 3.1, -5, 29.15 - vx1, 0.2, 6.3, C.concreteDark);
    b.box((vx0 + vx1) / 2, 3.1, (-8.15 + vz0) / 2, vx1 - vx0, 0.2, vz0 + 8.15, C.concreteDark);
    b.box((vx0 + vx1) / 2, 3.1, (vz1 - 1.85) / 2, vx1 - vx0, 0.2, -1.85 - vz1, C.concreteDark);
    // the duct: a 1 x 0.8 m tunnel on the slab from the platform (x 22.2) to past the vent (x 28.3)
    const duct0 = b.boxes.length;
    b.box(22.6, 3.1, -5, 0.8, 0.2, 1.2, C.metal);
    b.box(25.25, 3.6, -5.55, 6.1, 0.8, 0.1, C.metal);
    b.box(25.25, 3.6, -4.45, 6.1, 0.8, 0.1, C.metal);
    b.box(25.25, 4.05, -5, 6.1, 0.1, 1.2, C.metal);
    b.box(28.3, 3.6, -5, 0.1, 0.8, 1.0, C.metal);
    b.mark(duct0, { noLedge: true });
    b.mark(slab0, { overhead: true });
    b.duct(
      [
        { x: 22.45, y: 3.2, z: -5 },
        { x: 27.35, y: 3.2, z: -5 },
      ],
      { pos: { x: 22.2, y: 3.6, z: -5 }, nx: -1, ny: 0, nz: 0, where: 'wall' },
      { pos: { x: 27.35, y: 3.1, z: -5 }, nx: 0, ny: -1, nz: 0, where: 'ceiling' },
    );
    // the platform at the duct mouth, a ladder up its west face
    b.block(21.6, -5, 1.2, 3.2, 2, C.concreteDark);
    b.ladder(20.95, -5, 0, 3.2, Math.PI / 2);

    const props: MapLayout['props'] = [];
    const v = (x: number, z: number, y = 0): Vector3 => new Vector3(x, y, z);
    props.push({ kind: 'crate', pos: v(-3, 3) }, { kind: 'crate', pos: v(-1.9, 3.1), yaw: 0.2 }, { kind: 'crate', pos: v(-2.45, 3.05, 1.02) });
    props.push({ kind: 'smallCrate', pos: v(3, 3) }, { kind: 'smallCrate', pos: v(3.7, 3.4) }, { kind: 'box', pos: v(3.2, 2.2) });
    props.push({ kind: 'barrel', pos: v(-8, -2) }, { kind: 'barrel', pos: v(-8.7, -2.4) }, { kind: 'barrel', pos: v(8, -2) });
    props.push({ kind: 'explosiveBarrel', pos: v(-3, -9) }, { kind: 'explosiveBarrel', pos: v(3, -9) }, { kind: 'explosiveBarrel', pos: v(16, -14) });
    props.push({ kind: 'crate', pos: v(18, -22) }, { kind: 'smallCrate', pos: v(19.2, -22.2) }, { kind: 'box', pos: v(0, 16, 2.6) });

    const enemySpawns = [v(-21, 25), v(25, 25), v(-25, -25), v(25, 0), v(-25, 0), v(0, 26)];
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
      rooms: ROOMS,
    };
  },
};
