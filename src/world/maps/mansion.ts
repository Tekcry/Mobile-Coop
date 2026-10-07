import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import { makeCone } from '../lights';
import { glassX, glassZ, wallXAt, wallZAt, windowX as winX, windowZ as winZ } from './storey';

const GRASS = '#3c4a34';
const GRAVEL = '#7b776c';
const HEDGE = '#2f4a2c';
const STONE = '#c4bba8';
const STONE_DARK = '#8c8475';
const PLASTER = '#e0d7c6';
const PANEL = '#6b4e36';
const MARBLE = '#d8d3c8';
const ROOF = '#3c3f45';
const WOOD = '#6e4f34';
const STEEL = '#55606a';
const WATER = '#1f4a63';
const CAR = '#1d2127';
const GLASS = '#1b2530';
const TYRE = '#141518';
const SEAT = '#3a2a24';
const LINEN = '#d8d0c0';

/** Ground storey walls, the upper floor's top, upper walls, the flat roof's top. */
const H1 = 3.4;
const UP = 3.6;
const H2 = 3.2;
const ROOF_TOP = 7.0;
const T = 0.3;
const windowX = (b: LevelBuilder, c: number, z: number, y: number, h: number, o: { open?: boolean; breakable?: boolean }): void => winX(b, c, z, y, h, PLASTER, o);
const windowZ = (b: LevelBuilder, x: number, c: number, y: number, h: number, o: { open?: boolean; breakable?: boolean }): void => winZ(b, x, c, y, h, PLASTER, o);

/** Lamp circuits. */
const FOYER = 1;
const DINING = 2;
const KITCHEN = 3;
const LIBRARY = 4;
const STUDY = 5;
const LANDING = 6;
const MASTER = 7;
const GUEST = 8;
const GALLERY = 9;
const VAULT = 10;
const GROUNDS = 20;

const ROOMS: RoomDef[] = [
  // ---- ground floor (feet below 3 m) ----
  { id: 'foyer', name: 'Foyer', minX: -4, maxX: 4, minZ: -4, maxZ: 14, maxY: 3, squad: [{ kind: 'grunt', x: 2.6, z: 8, yaw: Math.PI, route: [[2.6, 8], [2.6, -2.5], [-2.6, -2.5], [-2.6, 8]], wait: 4 }] },
  { id: 'dining', name: 'Dining Room', minX: -16, maxX: -4, minZ: -4, maxZ: 5, maxY: 3, squad: [{ kind: 'grunt', x: -13.5, z: 3.2, yaw: Math.PI / 2 }] },
  { id: 'kitchen', name: 'Kitchen', minX: -16, maxX: -4, minZ: 5, maxZ: 14, maxY: 3, squad: [{ kind: 'grunt', x: -7, z: 12.2, yaw: Math.PI, route: [[-7, 12.2], [-14, 12.2]], wait: 5 }] },
  { id: 'library', name: 'Library', minX: 4, maxX: 16, minZ: -4, maxZ: 5, maxY: 3, squad: [{ kind: 'grunt', x: 13.8, z: -2, yaw: -Math.PI / 2 }] },
  { id: 'study', name: 'Study', minX: 4, maxX: 16, minZ: 5, maxZ: 14, maxY: 3, squad: [{ kind: 'officer', x: 8, z: 12.85, yaw: Math.PI }] },
  // ---- upper floor (feet at 3.6 m) ----
  { id: 'landing', name: 'Landing', minX: -4, maxX: 4, minZ: -4, maxZ: 14, minY: 3, squad: [{ kind: 'enforcer', x: -2.7, z: 10, y: UP, yaw: Math.PI, route: [[-2.7, 10], [-2.7, -2.6], [2.7, -2.6], [2.7, 10]], wait: 3 }] },
  { id: 'master', name: 'Master Bedroom', minX: -16, maxX: -4, minZ: -4, maxZ: 5, minY: 3, squad: [{ kind: 'grunt', x: -6, z: 3, y: UP, yaw: -Math.PI / 2 }] },
  { id: 'guest', name: 'Guest Room', minX: -16, maxX: -4, minZ: 5, maxZ: 14, minY: 3 },
  { id: 'gallery', name: 'Gallery', minX: 4, maxX: 16, minZ: -4, maxZ: 5, minY: 3, squad: [{ kind: 'grunt', x: 6, z: -2.4, yaw: Math.PI / 2, route: [[6, -2.4], [14.5, -2.4], [14.5, 3.4]], wait: 3 }] },
  { id: 'vault', name: 'Vault Office', minX: 4, maxX: 16, minZ: 5, maxZ: 14, minY: 3, squad: [{ kind: 'heavy', x: 6.2, z: 9.5, y: UP, yaw: Math.PI / 2 }] },
  { id: 'balcony', name: 'Balcony', minX: -6, maxX: 6, minZ: -6.5, maxZ: -4, minY: 3, squad: [{ kind: 'sniper', x: -4.6, z: -5.4, y: UP, yaw: Math.PI }] },
  // ---- grounds ----
  {
    id: 'front',
    name: 'Front Garden',
    minX: -30,
    maxX: 30,
    minZ: -28,
    maxZ: -6.6,
    squad: [
      { kind: 'grunt', x: -8, z: -12, yaw: 0, route: [[-8, -12], [8, -12], [8, -20], [-8, -20]], wait: 3 },
      { kind: 'dog', x: -7.2, z: -12.8, yaw: 0 },
      { kind: 'grunt', x: 5, z: -23, yaw: Math.PI / 2 },
    ],
  },
  { id: 'garage', name: 'Garage', minX: -27, maxX: -19, minZ: -6, maxZ: 4, squad: [{ kind: 'grunt', x: -21.5, z: -5, yaw: -Math.PI / 2 }] },
  { id: 'west', name: 'West Lawn', minX: -30, maxX: -16.2, minZ: 4.2, maxZ: 26, squad: [{ kind: 'grunt', x: -22, z: 10, yaw: 0, route: [[-22, 10], [-22, 22], [-18.5, 16]], wait: 4 }] },
  { id: 'back', name: 'Back Terrace', minX: -16, maxX: 16, minZ: 14.2, maxZ: 26, squad: [{ kind: 'grunt', x: -8, z: 18, yaw: Math.PI / 2, route: [[-8, 18], [10, 18]], wait: 4 }] },
  { id: 'poolhouse', name: 'Pool House', minX: 19, maxX: 27, minZ: 2, maxZ: 10, squad: [{ kind: 'grunt', x: 21.5, z: 3.4, yaw: Math.PI / 2 }] },
  { id: 'pool', name: 'Pool', minX: 16.2, maxX: 30, minZ: -6.4, maxZ: 1.8, squad: [{ kind: 'droneOp', x: 28, z: -2, yaw: -Math.PI / 2 }] },
];

/** A parked car along `yaw` (0 = along z): a waist-high body (low cover), the cabin, a dark skirt for the wheels. */
function car(b: LevelBuilder, x: number, z: number, yaw: number, color: string, len = 4.4): void {
  const sx = Math.sin(yaw) * -0.15;
  const sz = Math.cos(yaw) * -0.15;
  b.block(x, z, 1.9, 1.0, len, color, 0, yaw);
  b.box(x + sx, 1.27, z + sz, 1.66, 0.54, len * 0.52, GLASS, yaw);
  b.box(x, 0.2, z, 1.98, 0.36, len - 0.5, TYRE, yaw, 0, false);
}

/** A potted plant (a stone pot, a round shrub). */
function plant(b: LevelBuilder, x: number, z: number, y = 0): void {
  b.pillar(x, z, 0.32, 0.5, STONE, y).pillar(x, z, 0.42, 0.7, HEDGE, y + 0.5);
}

/** Tall furniture (bookcases, wardrobes) never offers a lip to hang from. */
function tall(b: LevelBuilder, x: number, z: number, w: number, h: number, d: number, color: string, y = 0): void {
  b.block(x, z, w, h, d, color, y).mark(b.boxes.length - 1, { noLedge: true });
}

/**
 * The mansion (night): a walled estate - a front garden with a fountain, a gatehouse booth, a garage, a pool and
 * pool house, lawns - and a two-storey house: foyer with a grand staircase, dining room, kitchen, library and
 * study below; a landing, master bedroom, guest room, gallery and the vault office above, a balcony over the
 * front door and a flat roof. Up by the stairs, a balcony ladder, a garden ladder to the roof, drainpipes and a
 * roof duct into the vault office; guards follow up stairs and ladders.
 */
export const mansion: MapDef = {
  id: 'mansion',
  name: 'Mansion',
  description: 'Night: a walled estate and a two-storey house with a grand staircase, a balcony and a vault office.',
  modes: ['infiltration', 'clear', 'wave', 'tdm', 'ffa'],
  theme: {
    sky: '#080a12',
    horizon: '#20242e',
    ground: '#3c4a34',
    fogStart: 30,
    fogEnd: 90,
    sunDir: [0.3, -1, 0.4],
    sunIntensity: 0.12,
    ambient: 0.26,
    lightLevel: 0.2,
    floor: 'gravel',
    faction: 'urban',
    // warm lamplight against a cold night
    grade: { tint: [1.04, 0.98, 0.94], saturation: 0.85, contrast: 1.12 },
  },
  build(b: LevelBuilder): MapLayout {
    b.floor(0, -1, 60, 54, GRASS, 0, 1);
    b.perimeter(-30, 30, -28, 26, 3.2, STONE_DARK);
    // the drive from the gate to the porch, the terrace behind
    b.floor(0, -17, 6, 22, GRAVEL, 0.02, 0.04);
    b.floor(0, 20, 32, 11.6, '#8a8577', 0.02, 0.04);

    // ================= house: ground storey =================
    b.floor(0, 5, 32, 18, MARBLE, 0.02, 0.04);
    // south facade: front door, dining and library windows
    b.wallX(-4, -16, 16, [[-11.6, -10.4], [-1.2, 1.2], [9.4, 10.6]], H1, PLASTER, T);
    windowX(b, -11, -4, 0, H1, { breakable: true });
    windowX(b, 10, -4, 0, H1, { breakable: true });
    b.door(-1.2, 0, -4, 1.2, Math.PI / 2, { swing: 1 });
    b.door(1.2, 0, -4, 1.2, -Math.PI / 2, { swing: 1 });
    // north facade: kitchen door, the back door, the study window (open)
    b.wallX(14, -16, 16, [[-12.6, -11.4], [-0.6, 0.6], [9.4, 10.6]], H1, PLASTER, T);
    windowX(b, 10, 14, 0, H1, { open: true });
    b.door(-12.6, 0, 14, 1.2, Math.PI / 2, { swing: -1 });
    b.door(-0.6, 0, 14, 1.2, Math.PI / 2, { swing: -1 });
    // west facade: dining and kitchen windows
    b.wallZ(-16, -4, 14, [[-0.6, 0.6], [8.4, 9.6]], H1, PLASTER, T);
    windowZ(b, -16, 0, 0, H1, { breakable: true });
    windowZ(b, -16, 9, 0, H1, { open: true });
    // east facade: the library window, a garden door into the study
    b.wallZ(16, -4, 14, [[-0.6, 0.6], [8.4, 9.5]], H1, PLASTER, T);
    windowZ(b, 16, 0, 0, H1, { breakable: true });
    b.door(16, 0, 8.4, 1.1, 0, { swing: -1 });
    // foyer walls and the wing partitions, a door in each
    b.wallZ(-4, -4, 14, [[0, 1.1], [9, 10.1]], H1, PANEL, T);
    b.wallZ(4, -4, 14, [[0, 1.1], [9, 10.1]], H1, PANEL, T);
    b.wallX(5, -16, -4, [[-10.6, -9.5]], H1, PLASTER, T);
    b.wallX(5, 4, 16, [[9.5, 10.6]], H1, PLASTER, T);
    b.door(-4, 0, 0, 1.1, 0, { swing: 1 });
    b.door(4, 0, 0, 1.1, 0, { swing: -1 });
    b.door(-4, 0, 9, 1.1, 0, { swing: 1 });
    b.door(4, 0, 9, 1.1, 0, { swing: -1 });
    b.door(-10.6, 0, 5, 1.1, Math.PI / 2, { swing: 1 });
    b.door(9.5, 0, 5, 1.1, Math.PI / 2, { swing: 1 });
    // the grand staircase up the middle of the foyer
    b.stairs(0, 2.5, 2.4, 6, UP, 14, MARBLE, 0);
    // foyer: pillars, a console table (beside the back door, which stays clear), a plant, benches either side
    // of the stairs
    b.pillar(-3.2, -3.2, 0.25, H1, MARBLE).pillar(3.2, -3.2, 0.25, H1, MARBLE);
    b.lowCover(-2.8, 3.5, 2.2, WOOD, 0, 0.9, 0.5).lowCover(2.8, 3.5, 2.2, WOOD, 0, 0.9, 0.5);
    b.block(1.5, 13.6, 1.2, 0.95, 0.5, WOOD);
    plant(b, -1.7, 13.3);
    // dining: a long table and chairs, a sideboard, a china cabinet; kitchen: an island, counters either side of
    // the back door (a way in from the terrace), a fridge, a tall unit
    b.block(-10, 0.5, 6.5, 0.8, 1.6, WOOD).block(-15.4, -2.6, 0.6, 1.0, 2.0, WOOD);
    for (const x of [-12, -10, -8]) b.block(x, -0.75, 0.48, 0.85, 0.48, SEAT).block(x, 1.75, 0.48, 0.85, 0.48, SEAT);
    b.block(-14, 4.5, 1.6, 1.85, 0.6, PANEL);
    b.block(-10, 9.5, 3.6, 0.95, 1.4, '#cfcac0').block(-15.4, 9.5, 0.6, 2.1, 3.2, '#a9a49a');
    b.block(-13.75, 13.4, 1.5, 0.95, 0.7, '#cfcac0').block(-8.3, 13.4, 5.4, 0.95, 0.7, '#cfcac0').block(-5.05, 13.4, 0.9, 1.85, 0.7, '#d8dade');
    // library: shelving rows (high cover), a reading table, a wall bookcase, an armchair, the fireplace; study: a
    // desk, a safe, cabinets, a bookcase, a sofa
    for (const x of [7, 10, 13]) b.block(x, 1.6, 0.6, 2.3, 3.8, PANEL);
    b.block(7.5, -2.0, 1.6, 0.8, 1.0, WOOD);
    tall(b, 4.45, -2.5, 0.6, 2.3, 2.0, PANEL);
    b.block(14.8, -3.2, 0.8, 0.8, 0.8, '#5a3a3a').block(14.5, 4.6, 1.6, 1.2, 0.5, STONE_DARK);
    b.block(8, 11.6, 2.2, 0.95, 1.0, WOOD).block(15.3, 12.6, 0.8, 1.6, 1.4, STEEL).block(15.4, 6.5, 0.6, 1.9, 2.0, PANEL);
    tall(b, 4.45, 6.6, 0.6, 2.3, 2.4, PANEL);
    b.block(10, 7.6, 2.4, 0.8, 0.8, '#4a2e2a');

    // ================= upper floor =================
    // the floor slab round the stairwell (a hole over the stairs), the balcony over the front door
    b.box(-8.65, UP - 0.1, 5, 14.7, 0.2, 18.3, PANEL);
    b.box(8.65, UP - 0.1, 5, 14.7, 0.2, 18.3, PANEL);
    b.box(0, UP - 0.1, -2.375, 2.6, 0.2, 3.55, PANEL);
    b.box(0, UP - 0.1, 9.85, 2.6, 0.2, 8.7, PANEL);
    b.box(0, UP - 0.1, -5.25, 12, 0.2, 2.5, STONE);
    // banisters round the stairwell, the balcony balustrade (a gap for the ladder)
    b.box(-1.45, UP + 0.5, 2.45, 0.1, 1.0, 6.1, WOOD).box(1.45, UP + 0.5, 2.45, 0.1, 1.0, 6.1, WOOD).box(0, UP + 0.5, -0.55, 3.0, 1.0, 0.1, WOOD);
    b.box(-6, UP + 0.5, -5.25, 0.15, 1.0, 2.5, STONE).box(6, UP + 0.5, -5.25, 0.15, 1.0, 2.5, STONE);
    b.box(-1.7, UP + 0.5, -6.45, 8.6, 1.0, 0.15, STONE).box(4.7, UP + 0.5, -6.45, 2.6, 1.0, 0.15, STONE);
    // facades
    wallXAt(b, -4, -16, 16, [[-11.6, -10.4], [-1.2, 1.2], [9.4, 10.6]], UP, H2, PLASTER);
    glassX(b, -11, -4, UP, H2, PLASTER);
    glassX(b, 10, -4, UP, H2, PLASTER);
    b.door(-1.2, UP, -4, 1.2, Math.PI / 2, { swing: -1 });
    b.door(1.2, UP, -4, 1.2, -Math.PI / 2, { swing: -1 });
    wallXAt(b, 14, -16, 16, [[-10.6, -9.4], [-0.6, 0.6], [9.4, 10.6]], UP, H2, PLASTER);
    glassX(b, -10, 14, UP, H2, PLASTER);
    glassX(b, 10, 14, UP, H2, PLASTER);
    // a back balcony off the landing over the back door, a ladder up from the terrace (a way onto the upper
    // floor that skips the stairs)
    b.door(-0.6, UP, 14, 1.2, Math.PI / 2, { swing: 1 });
    const bb0 = b.boxes.length;
    b.box(0, UP - 0.1, 15.075, 6, 0.2, 1.85, STONE);
    b.mark(bb0, { overhead: true });
    b.box(-0.425, UP + 0.5, 15.93, 5.15, 1.0, 0.15, STONE).box(-2.93, UP + 0.5, 15.075, 0.15, 1.0, 1.85, STONE).box(2.93, UP + 0.5, 15.075, 0.15, 1.0, 1.85, STONE);
    wallZAt(b, -16, -4, 14, [[-0.6, 0.6]], UP, H2, PLASTER);
    glassZ(b, -16, 0, UP, H2, PLASTER);
    wallZAt(b, 16, -4, 14, [[-0.6, 0.6]], UP, H2, PLASTER);
    glassZ(b, 16, 0, UP, H2, PLASTER);
    // landing walls and partitions (doors as below)
    wallZAt(b, -4, -4, 14, [[0, 1.1], [9, 10.1]], UP, H2, PANEL);
    wallZAt(b, 4, -4, 14, [[0, 1.1], [9, 10.1]], UP, H2, PANEL);
    wallXAt(b, 5, -16, -4, [[-10.6, -9.5]], UP, H2, PLASTER);
    wallXAt(b, 5, 4, 16, [[9.5, 10.6]], UP, H2, PLASTER);
    b.door(-4, UP, 0, 1.1, 0, { swing: 1 });
    b.door(4, UP, 0, 1.1, 0, { swing: -1 });
    b.door(-4, UP, 9, 1.1, 0, { swing: 1 });
    b.door(4, UP, 9, 1.1, 0, { swing: -1 });
    b.door(-10.6, UP, 5, 1.1, Math.PI / 2, { swing: 1 });
    b.door(9.5, UP, 5, 1.1, Math.PI / 2, { swing: 1 });
    // master: the bed, a dresser; guest: two beds; gallery: plinths and display walls; vault: the vault door,
    // a desk with the terminal, server cabinets
    b.block(-10, 2.6, 2.2, 0.7, 2.4, '#5a3d48', UP).block(-15.4, -2.4, 0.6, 1.2, 2.2, WOOD, UP);
    b.block(-13.5, 10.5, 1.2, 0.7, 2.2, '#4e5a6a', UP).block(-7.5, 10.5, 1.2, 0.7, 2.2, '#4e5a6a', UP);
    b.block(8, 0.5, 0.7, 1.1, 0.7, MARBLE, UP).block(12, 0.5, 0.7, 1.1, 0.7, MARBLE, UP);
    b.box(10, UP + 1.2, 3.6, 4, 2.4, 0.3, PANEL);
    b.block(15.3, 9.5, 0.7, 2.3, 2.4, STEEL, UP).block(10, 12.4, 2.4, 0.95, 1.0, WOOD, UP).block(5, 13.3, 1.2, 2.0, 0.8, '#1f2a36', UP);
    // master: a wardrobe, an armchair; guest: a wardrobe; gallery: display cases along the windows (low cover
    // against the patrol); vault: filing cabinets
    tall(b, -14, 4.5, 1.6, 1.85, 0.6, WOOD, UP);
    b.block(-6.2, -3.0, 0.8, 0.8, 0.8, '#5a3d48', UP);
    tall(b, -12.5, 13.5, 1.6, 1.85, 0.6, WOOD, UP);
    b.block(7, -3.4, 1.4, 1.0, 0.6, '#9aa6ae', UP).block(13, -3.4, 1.4, 1.0, 0.6, '#9aa6ae', UP);
    b.block(13.5, 13.4, 1.6, 1.3, 0.7, STEEL, UP);

    // ================= roof (walkable; a vent into the vault office) =================
    const r0 = b.boxes.length;
    // round a 0.8 m vent hole at (4.75, 8.6)
    b.box(-5.9, ROOF_TOP - 0.1, 5, 20.5, 0.2, 18.3, ROOF);
    b.box(10.65, ROOF_TOP - 0.1, 5, 11, 0.2, 18.3, ROOF);
    b.box(4.75, ROOF_TOP - 0.1, 2.025, 0.8, 0.2, 12.35, ROOF);
    b.box(4.75, ROOF_TOP - 0.1, 11.575, 0.8, 0.2, 5.15, ROOF);
    b.mark(r0, { overhead: true });
    // the duct housing from a grate on the roof to the vent over the vault office (x 4.75, z 8.6)
    b.box(4.2, ROOF_TOP + 0.55, 9.7, 0.1, 1.1, 2.6, STEEL).box(5.3, ROOF_TOP + 0.55, 9.7, 0.1, 1.1, 2.6, STEEL).box(4.75, ROOF_TOP + 1.15, 9.7, 1.2, 0.1, 2.6, STEEL).box(4.75, ROOF_TOP + 0.55, 8.4, 1.0, 1.1, 0.1, STEEL);
    b.duct(
      [
        { x: 4.75, y: ROOF_TOP, z: 10.75 },
        { x: 4.75, y: ROOF_TOP, z: 8.6 },
      ],
      { pos: { x: 4.75, y: ROOF_TOP + 0.45, z: 11 }, nx: 0, ny: 0, nz: 1, where: 'wall' },
      { pos: { x: 4.75, y: ROOF_TOP - 0.1, z: 8.6 }, nx: 0, ny: -1, nz: 0, where: 'ceiling' },
    );
    // chimneys and skylight housings (cover on the roof)
    b.block(-12, 11, 1.2, 1.6, 1.2, STONE_DARK, ROOF_TOP).block(-6, -1, 2.6, 0.8, 2.6, '#3b4a5a', ROOF_TOP).block(12, 2, 1.2, 1.6, 1.2, STONE_DARK, ROOF_TOP);
    // condensers, a vent stack and a satellite dish
    b.block(-1, 11, 2.0, 1.2, 1.4, '#6d7378', ROOF_TOP).block(8, -1.5, 1.6, 1.0, 1.6, '#6d7378', ROOF_TOP);
    b.pillar(10, 7, 0.25, 1.0, STEEL, ROOF_TOP).pillar(-14, -2.5, 0.15, 1.0, STEEL, ROOF_TOP);
    b.box(-14, ROOF_TOP + 1.25, -2.5, 1.4, 0.08, 1.4, '#c8ccd0', 0, -0.6, false);
    // ways up: the balcony ladder, a garden ladder to the roof, drainpipes on the corners
    b.ladder(3, -6.75, 0, UP, 0, STEEL);
    b.ladder(6, 14.3, 0, ROOF_TOP, Math.PI, STEEL);
    // (the back balcony's ladder, beside the garden ladder)
    b.ladder(2.55, 16.15, 0, UP, Math.PI, STEEL);
    b.pipeV(-16.3, 13, 0, ROOF_TOP, Math.PI / 2);
    b.pipeV(16.3, -3, 0, ROOF_TOP, -Math.PI / 2);
    // zipline: roof -> pool house roof
    b.pillar(14, -2.6, 0.06, 2.2, STEEL, ROOF_TOP);
    b.zipline({ x: 14.2, y: ROOF_TOP + 2.0, z: -2.6 }, { x: 22, y: 5.0, z: 6 });

    // ================= grounds =================
    // the gate (closed leaf) and the gatehouse booth
    b.box(0, 1.5, -27.9, 5, 3.0, 0.12, STEEL, 0, 0, false);
    b.wallX(-25, 4, 8, [], 2.8, STONE, T);
    b.wallX(-21, 4, 8, [[5.4, 6.5]], 2.8, STONE, T);
    b.wallZ(4, -25, -21, [], 2.8, STONE, T);
    b.wallZ(8, -25, -21, [[-23.6, -22.4]], 2.8, STONE, T);
    b.box(8, 0.45, -23, T, 0.9, 1.2, STONE).box(8, 2.35, -23, T, 0.9, 1.2, STONE);
    b.windowAt(8, 1.5, -23, 1.2, 1.2, Math.PI / 2, { sill: 0.9, breakable: true });
    b.door(5.4, 0, -21, 1.1, Math.PI / 2, { swing: 1 });
    const g0 = b.boxes.length;
    b.box(6, 2.9, -23, 4.3, 0.2, 4.3, ROOF);
    b.mark(g0, { overhead: true });
    b.block(6.8, -24.4, 1.4, 0.95, 0.6, WOOD);
    // fountain, hedges, statues, cars on the drive
    b.pillar(0, -13, 2.2, 0.7, STONE).pillar(0, -13, 0.35, 2.4, STONE);
    for (const x of [-9, 9]) {
      b.lowCover(x, -10, 6, HEDGE, 0, 1.1, 0.8);
      b.lowCover(x, -19, 6, HEDGE, 0, 1.1, 0.8);
    }
    b.lowCover(-15, -14.5, 5, HEDGE, 0, 1.1, 0.8).lowCover(15, -14.5, 5, HEDGE, 0, 1.1, 0.8);
    for (const [x, z] of [[-5, -7.6], [5, -7.6], [-20, -20], [20, -20]] as const) b.pillar(x, z, 0.45, 1.0, STONE).pillar(x, z, 0.22, 1.2, STONE, 1.0);
    car(b, -3.6, -20, 0, CAR);
    car(b, 3.4, -16, 0, '#3a3f48');
    // hedge planters off the facade: a crouched lane behind them past the front windows and the balcony ladder
    for (const x of [-14, -7.4, 7.4, 13]) b.lowCover(x, -5.95, 2.4, HEDGE, Math.PI / 2, 1.05, 0.8);
    // trees on the lawns
    for (const [x, z] of [[-24, -16], [24, -16], [-24, 18], [-19, 22], [12, 22], [-12, 22], [25, 18]] as const) {
      b.pillar(x, z, 0.25, 2.6, '#4a3a2a');
      b.pillar(x, z, 1.4, 1.4, HEDGE, 2.4);
    }
    // garage (west): a wide door onto the drive
    b.wallX(-6, -27, -19, [], 3, STONE, T);
    b.wallX(4, -27, -19, [], 3, STONE, T);
    b.wallZ(-27, -6, 4, [], 3, STONE, T);
    b.wallZ(-19, -6, 4, [[-4.5, 1]], 3, STONE, T);
    const gr0 = b.boxes.length;
    b.box(-23, 3.1, -1, 8.3, 0.2, 10.3, ROOF);
    b.mark(gr0, { overhead: true });
    car(b, -23.5, -2.5, 0, CAR);
    b.block(-26.2, 2.6, 1.2, 1.8, 2.0, STEEL).block(-22.5, 3.45, 2.4, 0.95, 0.7, WOOD);
    b.ladder(-27.3, 0, 0, 3.2, Math.PI / 2, STEEL);
    // west lawn: a garden shed, shrubs off the patrol path, a tall hedge screening the west windows (a dark lane
    // along the facade)
    tall(b, -27.6, 9, 2.4, 2.2, 2.0, WOOD);
    b.pillar(-26, 14.5, 0.6, 1.1, HEDGE).pillar(-19, 8.5, 0.6, 1.1, HEDGE);
    b.box(-18.3, 0.9, 5, 0.6, 1.8, 5, HEDGE);
    // pool and loungers, the pool house (east)
    b.floor(23, -2.2, 10, 6, WATER, 0.03, 0.04);
    b.lowCover(23, -5.8, 10, STONE, Math.PI / 2, 0.6, 0.5);
    b.block(18.6, -2, 0.8, 0.5, 2.0, LINEN).block(18.6, 0.6, 0.8, 0.5, 2.0, LINEN);
    b.block(21.5, 1.25, 0.8, 0.5, 2.0, LINEN, 0, Math.PI / 2).block(24, 1.25, 0.8, 0.5, 2.0, LINEN, 0, Math.PI / 2);
    b.wallX(2, 19, 27, [], 3, PLASTER, T);
    b.wallX(10, 19, 27, [[22.4, 23.6]], 3, PLASTER, T);
    b.box(23, 0.45, 10, 1.2, 0.9, T, PLASTER).box(23, 2.35, 10, 1.2, 0.9, T, PLASTER);
    b.windowAt(23, 1.5, 10, 1.2, 1.2, 0, { sill: 0.9, breakable: true });
    b.wallZ(19, 2, 10, [[5, 6.1]], 3, PLASTER, T);
    b.wallZ(27, 2, 10, [], 3, PLASTER, T);
    b.door(19, 0, 5, 1.1, 0, { swing: 1 });
    const ph0 = b.boxes.length;
    b.box(23, 3.1, 6, 8.3, 0.2, 8.3, ROOF);
    b.mark(ph0, { overhead: true });
    b.block(24, 8.6, 2.6, 0.95, 0.7, '#cfcac0').block(26.4, 3.2, 0.6, 1.9, 1.6, PANEL);
    // the back terrace: planters and a pergola
    b.lowCover(-9, 16, 4, HEDGE, Math.PI / 2, 0.9, 0.7).lowCover(9, 16, 4, HEDGE, Math.PI / 2, 0.9, 0.7);
    for (const x of [-4, 4]) b.pillar(x, 22, 0.2, 2.8, STONE);
    b.box(0, 2.88, 22, 8.4, 0.16, 0.22, WOOD, 0, 0, false).box(-2, 2.98, 22, 0.12, 0.1, 2.6, WOOD, 0, 0, false).box(2, 2.98, 22, 0.12, 0.1, 2.6, WOOD, 0, 0, false);
    b.block(0, 24.6, 6, 1.0, 0.8, STONE_DARK);
    // a garden table under the pergola; shrubs across the east lawn towards the far corner
    b.pillar(0, 20.8, 0.6, 0.75, STONE);
    for (const [x, z] of [[19.5, 14.5], [22.5, 19.5], [28.2, 15]] as const) b.pillar(x, z, 0.6, 1.1, HEDGE);

    // ================= lights =================
    const down = makeCone(0, -1, 0, 0.9);
    for (const [x, z] of [[-6, -9], [6, -9], [-6, -22], [6, -22], [0, 17], [21, -3]] as const) {
      b.pillar(x, z, 0.08, 3.4, '#2b2f36');
      b.light({ kind: 'spot', x, y: 3.5, z, radius: 7, intensity: 0.85, color: [1, 0.88, 0.68], cone: down, group: GROUNDS, fixture: { sx: 0.35, sy: 0.18, sz: 0.35, oy: 0.1 } });
    }
    b.light({ kind: 'lamp', x: 6, y: 2.6, z: -23, radius: 4, intensity: 0.9, color: [1, 0.9, 0.75], group: GROUNDS + 1, fixture: { sx: 0.6, sy: 0.08, sz: 0.25, oy: 0.08 } });
    b.light({ kind: 'lamp', x: -23, y: 2.8, z: -1, radius: 5, intensity: 0.9, color: [1, 0.95, 0.85], group: GROUNDS + 2, fixture: { sx: 0.9, sy: 0.08, sz: 0.25, oy: 0.08 } });
    b.light({ kind: 'lamp', x: 23, y: 2.8, z: 6, radius: 5, intensity: 0.9, color: [1, 0.92, 0.8], group: GROUNDS + 3, fixture: { sx: 0.9, sy: 0.08, sz: 0.25, oy: 0.08 } });
    const lamp = (x: number, y: number, z: number, group: number, color: [number, number, number] = [1, 0.9, 0.74], r = 6): void => {
      b.light({ kind: 'lamp', x, y, z, radius: r, intensity: 1, color, group, fixture: { sx: 0.5, sy: 0.12, sz: 0.5, oy: 0.08 } });
    };
    lamp(0, H1 - 0.15, -1.5, FOYER, [1, 0.9, 0.7], 7);
    lamp(0, H1 - 0.15, 10, FOYER);
    lamp(-10, H1 - 0.15, 0.5, DINING);
    lamp(-10, H1 - 0.15, 9.5, KITCHEN, [0.95, 0.97, 1]);
    lamp(10, H1 - 0.15, 0.5, LIBRARY);
    lamp(10, H1 - 0.15, 9.5, STUDY);
    lamp(0, UP + H2 - 0.15, 4, LANDING, [1, 0.9, 0.7], 7);
    lamp(-10, UP + H2 - 0.15, 0.5, MASTER);
    lamp(-10, UP + H2 - 0.15, 9.5, GUEST);
    lamp(10, UP + H2 - 0.15, 0.5, GALLERY, [1, 0.95, 0.88]);
    lamp(10, UP + H2 - 0.15, 9.5, VAULT, [0.6, 0.78, 1]);
    b.ambientZone(-16, 16, -4, 14, 0.1, -1, ROOF_TOP - 0.1);
    b.ambientZone(-6, 6, -6.5, -4, 0.16, UP - 0.5, ROOF_TOP);
    b.ambientZone(4, 8, -25, -21, 0.12, -1, 3);
    b.ambientZone(-27, -19, -6, 4, 0.1, -1, 3);
    b.ambientZone(19, 27, 2, 10, 0.1, -1, 3);
    // dark side paths down both flanks of the house
    b.ambientZone(-19, -16.2, -4, 14, 0.08, -1, 3.4);
    b.ambientZone(16.2, 19, 2, 14, 0.08, -1, 3.4);
    // surfaces: gravel drive and paths, marble foyer, wood and carpet rooms, a metal roof
    b.surface('concrete', -16, 16, -4, 14);
    b.surface('wood', -16, -4, -4, 14);
    b.surface('carpet', 4, 16, -4, 14);
    b.surface('carpet', -16, 16, -4, 14, UP);
    b.surface('wood', -4, 4, -4, 14, UP);
    b.surface('concrete', -6, 6, -6.5, -4, UP);
    b.surface('metal', -16.2, 16.2, -4.2, 14.2, ROOF_TOP);
    b.surface('concrete', -16, 16, 14, 26);

    const v = (x: number, z: number, y = 0): Vector3 => new Vector3(x, y, z);
    return {
      playerSpawns: [
        { pos: v(-1.5, -26.2), yaw: 0 },
        { pos: v(1.5, -26.2), yaw: 0 },
        { pos: v(-3, -26.2), yaw: 0 },
        { pos: v(3, -26.2), yaw: 0 },
      ],
      enemySpawns: [v(-8, -14), v(8, -14), v(0, 10), v(-10, 3), v(10, 10.5), v(-22, 12), v(10, 20), v(24, -1)],
      props: [
        { kind: 'barrel', pos: v(-26.2, -4.6) },
        { kind: 'explosiveBarrel', pos: v(-20.2, 3.2) },
        { kind: 'crate', pos: v(26, 0.6) },
        { kind: 'smallCrate', pos: v(-14.6, 24.6) },
      ],
      objectives: [
        { id: 'safe', pos: v(14.4, 12.6), kind: 'terminal' },
        { id: 'vault', pos: v(10, 11.5, UP), kind: 'terminal' },
        { id: 'cache', pos: v(-14.6, -2.4, UP), kind: 'cache' },
        { id: 'extract', pos: v(26, 23), kind: 'extract' },
      ],
      pickups: [
        { pos: v(6.8, -24.4, 0.95), kind: 'ammo' },
        { pos: v(-26.2, 2.6, 1.8), kind: 'health' },
        { pos: v(-15.4, 9.5, 2.1), kind: 'ammo' },
      ],
      rooms: ROOMS,
      switches: [
        { pos: v(-3.85, -3.2), yaw: Math.PI / 2, group: FOYER },
        { pos: v(-15.85, 4.2), yaw: Math.PI / 2, group: DINING },
        { pos: v(15.85, 6.2), yaw: -Math.PI / 2, group: STUDY },
        { pos: v(4.15, 12, UP), yaw: Math.PI / 2, group: VAULT },
      ],
      alarms: [
        { pos: v(-3.85, 12.5), yaw: Math.PI / 2 },
        { pos: v(3.85, -2.2, UP), yaw: -Math.PI / 2 },
        { pos: v(4.15, -23.5), yaw: Math.PI / 2 },
      ],
      hideSpots: [{ pos: v(-25, 2.6) }, { pos: v(25.6, 3.2) }, { pos: v(-14.8, 9.5) }, { pos: v(0, 23.4) }],
      reinforce: [v(0, -26.5), v(-28, 24), v(28, 24)],
    };
  },
};
