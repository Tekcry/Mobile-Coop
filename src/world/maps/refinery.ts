import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import { makeCone } from '../lights';
import { glassX, glassZ, wallXAt, wallZAt, windowX, windowZ } from './storey';

const SAND = '#8a7a5e';
const PAD = '#6e6a62';
const TANK = '#b8b2a4';
const STEEL = '#59626b';
const PIPE = '#7a6a52';
const RED = '#8a3a2a';
const BLOCKW = '#c7bca6';
const YELLOW = '#c9a227';
const CRATE = '#8a6a44';
const TRUCK = '#3d4a5a';

/** Tank tops, the pipe rack walkway, the unit platform, the control building storeys. */
const TANK_H = 7;
const TANK_R = 4;
const RACK = 4.5;
const UNIT = 3.0;
const C1 = 3.2;
const CUP = 3.4;
const C2 = 2.8;
const CROOF = 6.4;
const T = 0.3;

/** Lamp circuits. */
const FLOODS = 1;
const CONTROL = 2;
const OFFICE = 3;
const LOCKERS = 4;
const PUMPS = 5;

const ROOMS: RoomDef[] = [
  { id: 'gate', name: 'Gate', minX: -10, maxX: 10, minZ: -30, maxZ: -22, squad: [{ kind: 'grunt', x: -2.5, z: -23.4, yaw: Math.PI }, { kind: 'dog', x: 2, z: -23.4, yaw: Math.PI }] },
  {
    id: 'tanks',
    name: 'Tank Farm',
    minX: -34,
    maxX: -12,
    minZ: -30,
    maxZ: 30,
    squad: [
      { kind: 'grunt', x: -20.8, z: -24, yaw: 0, route: [[-20.8, -24], [-20.8, 24], [-14, 8]], wait: 4 },
      // overwatch from the middle tank
      { kind: 'sniper', x: -26, z: 0, y: TANK_H, yaw: Math.PI / 2 },
      { kind: 'grunt', x: -31, z: 9, yaw: Math.PI / 2 },
    ],
  },
  { id: 'pumps', name: 'Pump House Yard', minX: -12, maxX: 10, minZ: -22, maxZ: -8, squad: [{ kind: 'grunt', x: 4, z: -12, yaw: -Math.PI / 2, route: [[4, -12], [-9, -12]], wait: 5 }] },
  {
    id: 'rack',
    name: 'Pipe Rack',
    minX: -12,
    maxX: 16,
    minZ: -8,
    maxZ: 8,
    squad: [
      { kind: 'grunt', x: -8, z: 0, y: RACK, yaw: Math.PI / 2, route: [[-8, 0], [12, 0]], wait: 5 },
      { kind: 'enforcer', x: 6, z: -5, yaw: Math.PI },
    ],
  },
  {
    id: 'units',
    name: 'Process Units',
    minX: -12,
    maxX: 16,
    minZ: 8,
    maxZ: 30,
    squad: [
      { kind: 'grunt', x: -11.7, z: 26, yaw: Math.PI / 2, route: [[-11.7, 26], [-11.7, 10], [0, 10]], wait: 4 },
      { kind: 'heavy', x: 7, z: 27, y: UNIT, yaw: Math.PI },
      { kind: 'droneOp', x: 14, z: 16, yaw: -Math.PI / 2 },
    ],
  },
  { id: 'control', name: 'Control Room', minX: 20, maxX: 32, minZ: -6, maxZ: 8, maxY: 3, squad: [{ kind: 'grunt', x: 22.4, z: 6, yaw: Math.PI / 2 }, { kind: 'grunt', x: 30, z: -3.5, yaw: Math.PI }] },
  { id: 'office', name: 'Operations Office', minX: 20, maxX: 32, minZ: -6, maxZ: 8, minY: 3, squad: [{ kind: 'officer', x: 22.5, z: -3.5, y: CUP, yaw: 0 }] },
  { id: 'loading', name: 'Loading Bay', minX: 10, maxX: 34, minZ: -30, maxZ: -12, squad: [{ kind: 'grunt', x: 14, z: -16, yaw: Math.PI / 2, route: [[14, -16], [31, -16]], wait: 4 }, { kind: 'grunt', x: 26, z: -27.5, yaw: 0 }] },
  { id: 'east', name: 'East Yard', minX: 16.2, maxX: 34, minZ: 8.2, maxZ: 30, squad: [{ kind: 'grunt', x: 26, z: 20, yaw: Math.PI, route: [[26, 20], [26, 12], [19, 12]], wait: 4 }] },
];

/**
 * The refinery (dusk): a tank farm with catwalks across the tank tops, a pipe rack with a walkway along its top,
 * process units round a cracking tower and a burning flare, a unit platform, the pump house yard, a loading bay
 * of tankers, and a two-storey control building (an outside stair to the operations office, a ladder to the
 * roof). Vertical routes everywhere; guards follow up the stairs and ladders.
 */
export const refinery: MapDef = {
  id: 'refinery',
  name: 'Refinery',
  description: 'Dusk: tank tops, a pipe-rack walkway, process units under a flare and a two-storey control building.',
  modes: ['infiltration', 'clear', 'wave', 'tdm', 'ffa'],
  theme: {
    sky: '#3a2a2e',
    horizon: '#b0704a',
    ground: '#8a7a5e',
    fogStart: 35,
    fogEnd: 120,
    sunDir: [0.8, -0.35, 0.3],
    sunIntensity: 0.45,
    ambient: 0.4,
    lightLevel: 0.45,
    floor: 'gravel',
    faction: 'desert',
    // a low sun through haze
    grade: { tint: [1.08, 0.96, 0.86], saturation: 0.9, contrast: 1.08 },
  },
  build(b: LevelBuilder): MapLayout {
    b.floor(0, 0, 68, 60, SAND, 0, 1);
    b.perimeter(-34, 34, -30, 30, 3.0, '#6a5e4a');
    b.floor(-1, -26, 18, 8, PAD, 0.02, 0.04);
    b.floor(2, 0, 28, 16, PAD, 0.02, 0.04);
    b.floor(22, -21, 24, 18, PAD, 0.02, 0.04);

    // ================= gate =================
    b.wallX(-29.5, 4.5, 8.5, [], 2.8, BLOCKW, T);
    b.wallX(-26, 4.5, 8.5, [[5.8, 6.9]], 2.8, BLOCKW, T);
    b.wallZ(4.5, -29.5, -26, [], 2.8, BLOCKW, T);
    b.wallZ(8.5, -29.5, -26, [[-28.35, -27.15]], 2.8, BLOCKW, T);
    b.box(8.5, 0.45, -27.75, T, 0.9, 1.2, BLOCKW).box(8.5, 2.35, -27.75, T, 0.9, 1.2, BLOCKW);
    b.windowAt(8.5, 1.5, -27.75, 1.2, 1.2, Math.PI / 2, { sill: 0.9, breakable: true });
    b.door(5.8, 0, -26, 1.1, Math.PI / 2, { swing: 1 });
    const gb0 = b.boxes.length;
    b.box(6.5, 2.9, -27.75, 4.3, 0.2, 3.8, STEEL);
    b.mark(gb0, { overhead: true });
    b.block(7.2, -29, 1.4, 0.95, 0.6, '#6b6f73');
    b.box(-1.5, 0.55, -24, 7, 0.12, 0.12, YELLOW, 0, 0, false);

    // ================= tank farm (west) =================
    for (const z of [-18, 0, 18]) b.pillar(-26, z, TANK_R, TANK_H, TANK);
    for (const z of [-24, 24]) b.pillar(-17, z, 2.5, 4, TANK);
    // catwalks across the tank tops (railed), ladders up the end tanks' east sides
    for (const z of [-9, 9]) {
      b.box(-26, TANK_H - 0.1, z, 1.4, 0.2, 10.4, STEEL);
      b.box(-26.75, TANK_H + 0.5, z, 0.06, 1.0, 10, YELLOW).box(-25.25, TANK_H + 0.5, z, 0.06, 1.0, 10, YELLOW);
    }
    b.ladder(-26 + TANK_R + 0.15, -18, 0, TANK_H, -Math.PI / 2, STEEL);
    b.ladder(-26 + TANK_R + 0.15, 18, 0, TANK_H, -Math.PI / 2, STEEL);
    // the bund wall (low cover) and valve stations
    b.lowCover(-16, -9, 6, PAD, 0, 1.0, 0.5).lowCover(-16, 9, 6, PAD, 0, 1.0, 0.5);
    b.block(-31, 5, 1.4, 1.3, 1.2, RED).block(-31, -5, 1.4, 1.3, 1.2, RED);
    // zipline: the north tank's top -> the process units
    b.pillar(-23.2, 18, 0.06, 2.2, STEEL, TANK_H);
    b.zipline({ x: -23, y: TANK_H + 2.0, z: 18 }, { x: -9.5, y: 2.3, z: 18 });

    // ================= pipe rack (a walkway on top) =================
    b.box(2, RACK - 0.1, 0, 24, 0.2, 1.6, STEEL);
    for (const x of [-10, -4, 2, 8, 14]) for (const z of [-0.9, 0.9]) b.pillar(x, z, 0.15, RACK - 0.2, STEEL);
    b.box(2, RACK + 0.5, -0.85, 24, 1.0, 0.08, YELLOW).box(2, RACK + 0.5, 0.85, 24, 1.0, 0.08, YELLOW);
    // pipe runs under the walkway (visual) and alongside it at knee height (cover)
    for (const [y, z] of [[3.6, -0.45], [3.6, 0.45], [3.1, 0]] as const) b.box(2, y, z, 24, 0.35, 0.35, PIPE, 0, 0, false);
    b.lowCover(2, -2.6, 20, PIPE, Math.PI / 2, 0.8, 0.5).lowCover(2, 2.6, 20, PIPE, Math.PI / 2, 0.8, 0.5);
    // up at the west end by stairs, the east end by a ladder
    b.stairs(-14, 0, 1.4, 8, RACK, 18, STEEL, Math.PI / 2);
    b.ladder(14.15, 0, 0, RACK, -Math.PI / 2, STEEL);
    b.block(6, -6.5, 2.4, 1.8, 1.2, STEEL).block(-6, 6, 1.6, 1.5, 1.6, RED);

    // ================= process units (north) =================
    b.pillar(-4, 18, 1.6, 16, '#9aa0a6').pillar(-4, 18, 2.0, 1.2, STEEL);
    b.block(-8, 12.5, 6, 1.8, 1.4, STEEL).block(2, 13, 1.4, 2.4, 4, '#9aa0a6').block(-1, 25, 3, 1.4, 2, RED);
    // the unit platform: a raised steel deck with stairs, railed
    b.block(7, 26, 10, UNIT, 4, '#4f565c');
    b.stairs(10.5, 22, 1.4, 4, UNIT, 10, STEEL, 0);
    b.box(4.65, UNIT + 0.5, 24.05, 5.3, 1.0, 0.08, YELLOW).box(11.6, UNIT + 0.5, 24.05, 0.8, 1.0, 0.08, YELLOW);
    b.block(4, 27, 1.6, 1.2, 1.6, STEEL, UNIT).block(8.5, 27.4, 1.2, 1.6, 1.2, '#9aa0a6', UNIT);
    // the analyser shelter (a door and a window)
    b.wallX(20, -11, -7, [[-9.6, -8.5]], 2.8, BLOCKW, T);
    b.wallX(23.5, -11, -7, [], 2.8, BLOCKW, T);
    b.wallZ(-11, 20, 23.5, [], 2.8, BLOCKW, T);
    b.wallZ(-7, 20, 23.5, [[21.15, 22.35]], 2.8, BLOCKW, T);
    windowZ(b, -7, 21.75, 0, 2.8, BLOCKW, { breakable: true });
    b.door(-9.6, 0, 20, 1.1, Math.PI / 2, { swing: 1 });
    const as0 = b.boxes.length;
    b.box(-9, 2.9, 21.75, 4.3, 0.2, 3.8, STEEL);
    b.mark(as0, { overhead: true });
    b.block(-10.2, 22.8, 1.0, 1.6, 0.8, '#3a3f48');
    // the flare stack, burning
    b.pillar(13, 11, 0.45, 18, '#6a6e73');

    // ================= pump house yard (south west) =================
    b.wallX(-20, -11, -3, [], 3, BLOCKW, T);
    b.wallX(-15, -11, -3, [[-6.6, -5.5]], 3, BLOCKW, T);
    b.wallZ(-11, -20, -15, [[-18.05, -16.85]], 3, BLOCKW, T);
    windowZ(b, -11, -17.45, 0, 3, BLOCKW, { open: true });
    b.wallZ(-3, -20, -15, [], 3, BLOCKW, T);
    b.door(-6.6, 0, -15, 1.1, Math.PI / 2, { swing: -1 });
    const ph0 = b.boxes.length;
    b.box(-7, 3.1, -17.5, 8.3, 0.2, 5.3, STEEL);
    b.mark(ph0, { overhead: true });
    b.block(-8.5, -18.5, 2.4, 1.3, 1.4, RED).block(-4.6, -18.6, 1.4, 1.3, 1.6, RED);
    for (const x of [2, 6]) b.block(x, -18, 1.6, 1.2, 1.6, STEEL);
    b.lowCover(-1, -10, 8, PIPE, Math.PI / 2, 0.9, 0.5);

    // ================= control building (east) =================
    b.floor(26, 1, 12, 14, '#8c877c', 0.02, 0.04);
    // ground: the control room (west) and lockers (east)
    b.wallX(-6, 20, 32, [], C1, BLOCKW, T);
    b.wallX(8, 20, 32, [[22.4, 23.6], [29, 30.1]], C1, BLOCKW, T);
    windowX(b, 23, 8, 0, C1, BLOCKW, { breakable: true });
    b.door(29, 0, 8, 1.1, Math.PI / 2, { swing: -1 });
    b.wallZ(20, -6, 8, [[0, 1.2]], C1, BLOCKW, T);
    b.door(20, 0, 0, 1.2, 0, { swing: 1 });
    b.wallZ(32, -6, 8, [], C1, BLOCKW, T);
    b.wallZ(26, -6, 8, [[3, 4.1]], C1, BLOCKW, T);
    b.door(26, 0, 3, 1.1, 0, { swing: 1 });
    b.block(23, -3.6, 4, 1.0, 1.0, '#3a3f48').block(21, 4, 0.8, 1.6, 3, '#3a3f48').block(29, 6.6, 3, 1.9, 0.6, STEEL).block(31.4, -1, 0.6, 1.9, 4, STEEL);
    // the upper floor, an outside stair along the south wall to a landing and the office door
    b.box(26, C1 + 0.1, 1, 12.3, 0.2, 14.3, '#6b6f73');
    b.stairs(24, -6.9, 1.4, 6, CUP, 12, STEEL, Math.PI / 2);
    b.box(28, CUP - 0.1, -6.925, 2, 0.2, 1.55, STEEL);
    b.box(24.5, CUP / 2 + 0.5, -7.65, 7, 0.06, 0.06, YELLOW, 0, -Math.atan2(CUP, 6), false);
    b.box(28.95, CUP + 0.5, -6.925, 0.06, 1.0, 1.55, YELLOW);
    // upper: the operations office (west) and the server room (east)
    wallXAt(b, -6, 20, 32, [[22.4, 23.6], [27.4, 28.5]], CUP, C2, BLOCKW);
    glassX(b, 23, -6, CUP, C2, BLOCKW);
    b.door(27.4, CUP, -6, 1.1, Math.PI / 2, { swing: 1 });
    wallXAt(b, 8, 20, 32, [[25.4, 26.6]], CUP, C2, BLOCKW);
    glassX(b, 26, 8, CUP, C2, BLOCKW);
    wallZAt(b, 20, -6, 8, [[3.4, 4.6]], CUP, C2, BLOCKW);
    glassZ(b, 20, 4, CUP, C2, BLOCKW);
    wallZAt(b, 32, -6, 8, [], CUP, C2, BLOCKW);
    wallZAt(b, 26, -6, 8, [[0, 1.1]], CUP, C2, BLOCKW);
    b.door(26, CUP, 0, 1.1, 0, { swing: -1 });
    b.block(23.5, 6.6, 3, 0.95, 0.8, '#6b6f73', CUP).block(21, -1, 0.6, 1.8, 2.4, STEEL, CUP);
    for (const z of [-3, 1, 5]) b.block(30, z, 2.4, 1.9, 0.8, '#1f2a36', CUP);
    // the flat roof, a ladder up the east wall, a drainpipe at the north west corner
    const cr0 = b.boxes.length;
    b.box(26, CROOF - 0.1, 1, 12.3, 0.2, 14.3, STEEL);
    b.mark(cr0, { overhead: true });
    b.block(27, 3, 2, 1.0, 2, '#6d7378', CROOF);
    b.ladder(32.3, 2, 0, CROOF, -Math.PI / 2, STEEL);
    b.pipeV(19.7, 7.6, 0, CROOF, Math.PI / 2);

    // ================= loading bay (south east) =================
    for (const x of [16, 22]) {
      b.block(x, -21, 2.4, 2.6, 7, TRUCK);
      b.pillar(x, -22.6, 1.1, 1.8, TANK, 2.6);
    }
    b.block(29, -21, 3, 3.0, 4, '#4f565c');
    b.stairs(29, -25.25, 1.4, 4.5, 3.0, 10, STEEL, 0);
    b.block(32.5, -14, 1.2, 1.1, 1.2, CRATE).block(31.6, -27.6, 2.4, 2.2, 1.2, STEEL);
    b.lowCover(19, -13.5, 6, PAD, Math.PI / 2, 1.0, 0.5);

    // ================= east yard =================
    b.block(22, 16, 1.4, 2.2, 6, PIPE).block(30, 21, 2.4, 2.4, 2.4, CRATE).block(19, 26, 1.2, 1.2, 1.2, CRATE);
    // the fence hut by the east gate (a door and a window)
    b.wallX(24.5, 29, 33, [[30.4, 31.6]], 2.8, BLOCKW, T);
    windowX(b, 31, 24.5, 0, 2.8, BLOCKW, { breakable: true });
    b.wallX(28.5, 29, 33, [], 2.8, BLOCKW, T);
    b.wallZ(29, 24.5, 28.5, [[26, 27.1]], 2.8, BLOCKW, T);
    b.wallZ(33, 24.5, 28.5, [], 2.8, BLOCKW, T);
    b.door(29, 0, 26, 1.1, 0, { swing: 1 });
    const fh0 = b.boxes.length;
    b.box(31, 2.9, 26.5, 4.3, 0.2, 4.3, STEEL);
    b.mark(fh0, { overhead: true });
    b.pillar(30, 14, 1.5, 3, TANK);

    // ================= lights =================
    const down = makeCone(0, -1, 0, 0.75);
    for (const [x, z] of [[-16, -16], [-16, 14], [2, -14], [8, 14], [17, -4], [25, -18.5], [24, 22]] as const) {
      b.pillar(x, z, 0.12, 8, '#2b2f36');
      b.light({ kind: 'spot', x, y: 8.1, z, radius: 13, intensity: 0.8, color: [1, 0.86, 0.62], cone: down, group: FLOODS, fixture: { sx: 0.7, sy: 0.25, sz: 0.5, oy: 0.12 } });
    }
    b.light({ kind: 'fire', x: 13, y: 18.6, z: 11, radius: 16, intensity: 0.7, color: [1, 0.6, 0.3] });
    const lamp = (x: number, y: number, z: number, group: number, color: [number, number, number] = [0.95, 0.97, 1], r = 6): void => {
      b.light({ kind: 'lamp', x, y, z, radius: r, intensity: 1, color, group, fixture: { sx: 1.2, sy: 0.08, sz: 0.25, oy: 0.08 } });
    };
    lamp(23, C1 - 0.15, 1, CONTROL);
    lamp(29, C1 - 0.15, 1, LOCKERS, [1, 0.94, 0.82]);
    lamp(23, CUP + C2 - 0.15, 1, OFFICE, [1, 0.94, 0.82]);
    lamp(29, CUP + C2 - 0.15, 1, OFFICE, [0.6, 0.78, 1]);
    lamp(-7, 2.9, -17.5, PUMPS, [1, 0.92, 0.8], 5);
    b.light({ kind: 'lamp', x: 6.5, y: 2.6, z: -27.75, radius: 4, intensity: 0.9, color: [1, 0.9, 0.75], group: FLOODS + 10, fixture: { sx: 0.6, sy: 0.08, sz: 0.25, oy: 0.08 } });
    b.ambientZone(20, 32, -6, 8, 0.15, -1, CROOF - 0.1);
    b.ambientZone(-11, -3, -20, -15, 0.15, -1, 3);
    b.ambientZone(4.5, 8.5, -29.5, -26, 0.18, -1, 3);
    // surfaces: steel walkways and tank tops, concrete pads
    b.surface('concrete', -10, 16, -8, 8);
    b.surface('concrete', 10, 34, -30, -12);
    b.surface('grate', -10, 14, -0.8, 0.8, RACK);
    b.surface('metal', -30, -22, -22, 22, TANK_H);
    b.surface('grate', 2, 12, 24, 28, UNIT);
    b.surface('concrete', 20, 32, -6, 8);
    b.surface('carpet', 20, 26, -6, 8, CUP);
    b.surface('metal', 20, 32, -6, 8, CROOF);

    const v = (x: number, z: number, y = 0): Vector3 => new Vector3(x, y, z);
    return {
      playerSpawns: [
        { pos: v(-2.5, -28.5), yaw: 0 },
        { pos: v(-0.5, -28.5), yaw: 0 },
        { pos: v(-4.5, -28.5), yaw: 0 },
        { pos: v(1.5, -28.5), yaw: 0 },
      ],
      enemySpawns: [v(-18, -12), v(-18, 12), v(4, -5), v(-6, 11), v(8, 16), v(17, 4), v(26, -16), v(26, 14)],
      props: [
        { kind: 'explosiveBarrel', pos: v(-14, -4) },
        { kind: 'explosiveBarrel', pos: v(12.6, -14.8) },
        { kind: 'barrel', pos: v(-9.6, 22.4) },
        { kind: 'crate', pos: v(18.6, 20) },
      ],
      objectives: [
        { id: 'ops', pos: v(23.5, 5.6, CUP), kind: 'terminal' },
        { id: 'valve', pos: v(-4, 15.7), kind: 'terminal' },
        { id: 'cache', pos: v(-26, 2, TANK_H), kind: 'cache' },
        { id: 'extract', pos: v(25, 28), kind: 'extract' },
      ],
      pickups: [
        { pos: v(7.2, -29, 0.95), kind: 'ammo' },
        { pos: v(29, 6.6, 1.9), kind: 'health' },
        { pos: v(4, 27, UNIT + 1.2), kind: 'ammo' },
      ],
      rooms: ROOMS,
      switches: [
        { pos: v(20.15, -2), yaw: Math.PI / 2, group: CONTROL },
        { pos: v(20.15, -4.5, CUP), yaw: Math.PI / 2, group: OFFICE },
        { pos: v(-3.15, -16), yaw: -Math.PI / 2, group: PUMPS },
      ],
      alarms: [
        { pos: v(25.85, 6.5), yaw: -Math.PI / 2 },
        { pos: v(4.65, -28.3), yaw: Math.PI / 2 },
        { pos: v(31.85, -4.5, CUP), yaw: -Math.PI / 2 },
      ],
      hideSpots: [{ pos: v(-31, 3.8) }, { pos: v(31.6, -26.3) }, { pos: v(31, 26.5) }, { pos: v(-8.5, -17.2) }],
      reinforce: [v(-1, -28.5), v(-31, 27), v(31, 2)],
    };
  },
};
