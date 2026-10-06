import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import { makeCone } from '../lights';
import { glassX, glassZ, wallXAt, wallZAt, windowX, windowZ } from './storey';

const ASPHALT = '#3a3d40';
const QUAY = '#6b6a66';
const HULL = '#2d3a46';
const DECK = '#5a4a3a';
const STEEL = '#55606a';
const RUST = '#7a4a32';
const SHED = '#7d8287';
const OFFICE = '#c9c4b8';
const YELLOW = '#c9a227';
const CRATE = '#8a6a44';
/** Container colours. */
const BOX = ['#8a2f2a', '#2a5a8a', '#2f6a3a', '#8a6a2a', '#5a5f66', '#6a2f5a'];

/** Ship deck height, bridge storey, the customs office deck, the shed roof. */
const DECK_Y = 3.0;
const BRIDGE_H = 2.8;
const MEZZ = 3.2;
const SHED_H = 6;
/** A container: 6.1 x 2.6 x 2.44. */
const CL = 6.1;
const CH = 2.6;
const CW = 2.44;

/** Lamp circuits. */
const YARD = 1;
const QUAYSIDE = 2;
const SHEDL = 3;
const OFFICEL = 4;
const BRIDGEL = 5;

const ROOMS: RoomDef[] = [
  { id: 'gate', name: 'Gate', minX: -8, maxX: 10, minZ: -30, maxZ: -24, squad: [{ kind: 'grunt', x: 2, z: -25, yaw: Math.PI }, { kind: 'dog', x: -2, z: -25.4, yaw: Math.PI }] },
  {
    id: 'westyard',
    name: 'Container Stacks',
    minX: -32,
    maxX: -8,
    minZ: -30,
    maxZ: 0,
    squad: [
      { kind: 'grunt', x: -24, z: -16, yaw: Math.PI / 2, route: [[-24, -16], [-9.5, -16], [-9.5, -8], [-24, -8]], wait: 4 },
      // overwatch from the tallest stack
      { kind: 'sniper', x: -14, z: -20, y: CH * 2, yaw: Math.PI / 2 },
    ],
  },
  {
    id: 'eastyard',
    name: 'Loading Yard',
    minX: -8,
    maxX: 14,
    minZ: -24,
    maxZ: 0,
    squad: [
      { kind: 'grunt', x: -4, z: -11.5, yaw: Math.PI / 2, route: [[-4, -11.5], [10.5, -11.5], [10.5, -20]], wait: 4 },
      { kind: 'droneOp', x: -6, z: -3, yaw: 0 },
    ],
  },
  { id: 'shed', name: 'Customs Shed', minX: 14, maxX: 30, minZ: -24, maxZ: -10, maxY: 3, squad: [{ kind: 'heavy', x: 17, z: -12.4, yaw: Math.PI }, { kind: 'grunt', x: 20, z: -21, yaw: 0, route: [[20, -21], [20, -12.5]], wait: 5 }] },
  { id: 'customs', name: 'Customs Office', minX: 24, maxX: 30, minZ: -24, maxZ: -10, minY: 3, squad: [{ kind: 'officer', x: 27.5, z: -13.5, y: MEZZ, yaw: -Math.PI / 2 }] },
  {
    id: 'quay',
    name: 'Quayside',
    minX: -32,
    maxX: 32,
    minZ: 0,
    maxZ: 23.8,
    squad: [
      { kind: 'grunt', x: -20, z: 10, yaw: Math.PI / 2, route: [[-20, 10], [10, 10]], wait: 4 },
      { kind: 'enforcer', x: 16, z: 15, yaw: Math.PI },
      { kind: 'grunt', x: -28, z: 20, yaw: Math.PI / 2 },
    ],
  },
  {
    id: 'deck',
    name: 'Cargo Deck',
    minX: -20,
    maxX: 14,
    minZ: 24,
    maxZ: 30,
    minY: 2.5,
    squad: [
      { kind: 'grunt', x: -16.6, z: 24.75, y: DECK_Y, yaw: Math.PI / 2, route: [[-16.6, 24.75], [12, 24.75]], wait: 4 },
      { kind: 'grunt', x: -12, z: 29.2, y: DECK_Y, yaw: -Math.PI / 2 },
    ],
  },
  { id: 'bridge', name: 'Bridge', minX: -26, maxX: -20, minZ: 24, maxZ: 30, minY: 2.5, squad: [{ kind: 'grunt', x: -23, z: 27.5, y: DECK_Y, yaw: 0 }, { kind: 'sniper', x: -24.6, z: 25.2, y: DECK_Y + BRIDGE_H + 0.2, yaw: Math.PI }] },
  { id: 'pier', name: 'Pier', minX: 14, maxX: 32, minZ: 24, maxZ: 30, squad: [{ kind: 'grunt', x: 24, z: 26.4, yaw: -Math.PI / 2 }] },
];

/** A shipping container along X (yaw 0) or Z (yaw PI / 2), standing on y. */
function container(b: LevelBuilder, x: number, z: number, yaw: number, y: number, k: number): void {
  b.block(x, z, CL, CH, CW, BOX[k % BOX.length]!, y, yaw);
}

/**
 * The port (night): a container terminal - a gate, stacks of containers (ladders onto the tall ones), a loading
 * yard, the customs shed with an office on a mezzanine, the quayside under a gantry crane and a moored cargo
 * ship: a gangway up to the cargo deck, holds and deck containers, the bridge with a lookout on its roof. A pier
 * past the bow.
 */
export const port: MapDef = {
  id: 'port',
  name: 'Port',
  description: 'Night: a container terminal, a customs shed and a moored cargo ship with a bridge.',
  modes: ['infiltration', 'clear', 'wave', 'tdm', 'ffa'],
  theme: {
    sky: '#060a12',
    horizon: '#1a2430',
    ground: '#3a3d40',
    fogStart: 30,
    fogEnd: 100,
    sunDir: [-0.3, -1, 0.5],
    sunIntensity: 0.12,
    ambient: 0.26,
    lightLevel: 0.22,
    floor: 'concrete',
    faction: 'maritime',
    // sodium lamps in a sea fog
    grade: { tint: [1.02, 0.97, 0.92], saturation: 0.8, contrast: 1.1 },
  },
  build(b: LevelBuilder): MapLayout {
    b.floor(0, 0, 64, 60, ASPHALT, 0, 1);
    b.perimeter(-32, 32, -30, 30, 3.0, '#4a4d50');
    b.floor(0, 12, 64, 24, QUAY, 0.02, 0.04);
    // yellow lane markings, the quay kerb (bollards along the edge)
    b.box(0, 0.05, 0.4, 64, 0.02, 0.15, YELLOW, 0, 0, false);
    for (let x = -30; x <= 30; x += 6) if (x < -27 || x > 15) b.pillar(x, 23.4, 0.25, 0.7, '#2b2d30');

    // ================= gate =================
    b.box(-1, 0.55, -24.8, 7, 0.12, 0.12, YELLOW, 0, 0, false);
    b.pillar(-4.6, -24.8, 0.18, 1.1, '#2b2d30');
    b.wallX(-28, 5, 9, [], 2.8, OFFICE);
    b.wallX(-24.5, 5, 9, [[6.4, 7.5]], 2.8, OFFICE);
    b.wallZ(5, -28, -24.5, [], 2.8, OFFICE);
    b.wallZ(9, -28, -24.5, [[-26.85, -25.65]], 2.8, OFFICE);
    b.box(9, 0.45, -26.25, 0.3, 0.9, 1.2, OFFICE).box(9, 2.35, -26.25, 0.3, 0.9, 1.2, OFFICE);
    b.windowAt(9, 1.5, -26.25, 1.2, 1.2, Math.PI / 2, { sill: 0.9, breakable: true });
    b.door(6.4, 0, -24.5, 1.1, Math.PI / 2, { swing: 1 });
    const gb0 = b.boxes.length;
    b.box(7, 2.9, -26.25, 4.3, 0.2, 3.8, STEEL);
    b.mark(gb0, { overhead: true });
    b.block(7.6, -27.4, 1.4, 0.95, 0.6, '#6b6f73');

    // ================= container stacks (west) =================
    container(b, -27, -20, 0, 0, 0);
    container(b, -27, -20, 0, CH, 1);
    container(b, -20.5, -20, 0, 0, 2);
    container(b, -14, -20, 0, 0, 3);
    container(b, -14, -20, 0, CH, 4);
    container(b, -27, -12, 0, 0, 5);
    container(b, -20.5, -12, 0, 0, 1);
    container(b, -20.5, -12, 0, CH, 2);
    container(b, -14, -12, 0, 0, 0);
    container(b, -24, -4, 0, 0, 3);
    container(b, -17, -4, 0, 0, 4);
    container(b, -17, -4, 0, CH, 5);
    container(b, -29, -26.9, Math.PI / 2, 0, 2);
    // ladders up the tall stacks
    b.ladder(-27, -20 + CW / 2 + 0.15, 0, CH * 2, Math.PI, STEEL);
    b.ladder(-14, -20 - CW / 2 - 0.15, 0, CH * 2, 0, STEEL);
    b.ladder(-20.5, -12 + CW / 2 + 0.15, 0, CH * 2, Math.PI, STEEL);
    b.ladder(-17 + CL / 2 + 0.15, -4, 0, CH * 2, -Math.PI / 2, STEEL);
    // zipline: the stack by the quay -> the quayside by the crane
    b.pillar(-17, -3.6, 0.06, 2.2, STEEL, CH * 2);
    b.zipline({ x: -17, y: CH * 2 + 2.0, z: -3.4 }, { x: -15, y: 2.3, z: 12 });

    // ================= loading yard (east) =================
    container(b, -4, -16, 0, 0, 1);
    container(b, 4, -16, 0, 0, 5);
    container(b, 0, -8, 0, 0, 2);
    container(b, 0, -8, 0, CH, 0);
    container(b, 8, -6, Math.PI / 2, 0, 3);
    b.ladder(0, -8 - CW / 2 - 0.15, 0, CH * 2, 0, STEEL);
    // a forklift, pallets of crates
    b.block(-6.5, -20.5, 1.2, 2.0, 2.4, YELLOW).block(10.8, -3.2, 1.2, 1.0, 1.2, CRATE).block(12.2, -3.2, 1.2, 1.4, 1.2, CRATE);
    b.lowCover(-2, -21.5, 3, CRATE, Math.PI / 2, 1.0, 1.0);

    // ================= customs shed (south east) =================
    b.floor(22, -17, 16, 14, '#6e7176', 0.02, 0.04);
    b.wallX(-24, 14, 30, [[21.4, 22.6]], SHED_H, SHED, 0.3);
    windowX(b, 22, -24, 0, 3.4, SHED, { breakable: true });
    b.box(22, (3.4 + SHED_H) / 2, -24, 1.2, SHED_H - 3.4, 0.3, SHED);
    b.wallX(-10, 14, 30, [[18, 22]], SHED_H, SHED, 0.3);
    b.box(20, (3 + SHED_H) / 2, -10, 4, SHED_H - 3, 0.3, SHED);
    b.wallZ(14, -24, -10, [[-18, -16.9]], SHED_H, SHED, 0.3);
    b.wallZ(30, -24, -10, [], SHED_H, SHED, 0.3);
    b.door(14, 0, -18, 1.1, 0, { swing: 1 });
    // the mezzanine: a steel deck along the east wall, stairs up its west side to a landing
    b.box(26.925, MEZZ - 0.1, -17, 5.85, 0.2, 13.7, STEEL);
    // (the landing overlaps the stair top so there is no seam over the ramp end)
    b.box(23.05, MEZZ - 0.1, -22.925, 1.9, 0.2, 1.85, STEEL);
    for (const z of [-22.3, -17, -11.7]) b.pillar(24.2, z, 0.12, MEZZ - 0.2, STEEL);
    b.stairs(22.6, -19.8, 1.4, 5, MEZZ, 12, STEEL, Math.PI);
    b.box(21.85, MEZZ / 2 + 0.5, -19.8, 0.08, 1.0, 5, YELLOW, 0, 0, false);
    // the office on the deck: walls with a door off the landing, a window over the shed floor
    wallZAt(b, 24, -24, -10, [[-23.6, -22.5], [-17.6, -16.4]], MEZZ, 2.6, OFFICE);
    b.door(24, MEZZ, -23.6, 1.1, 0, { swing: -1 });
    glassZ(b, 24, -17, MEZZ, 2.6, OFFICE);
    wallXAt(b, -15.5, 24, 30, [[26.2, 27.3]], MEZZ, 2.6, OFFICE);
    b.door(26.2, MEZZ, -15.5, 1.1, Math.PI / 2, { swing: 1 });
    b.block(27.2, -21, 2.2, 0.95, 1.0, '#6b6f73', MEZZ).block(29.4, -18.5, 0.6, 1.9, 2.4, STEEL, MEZZ).block(27, -11.2, 2.4, 0.95, 0.7, '#6b6f73', MEZZ);
    // the shed floor: pallet racks, crates, a scanner arch
    b.block(17, -21.8, 4, 2.2, 1.2, STEEL).block(17, -16, 1.2, 1.4, 2.4, CRATE);
    b.block(27, -12.6, 1.6, 1.2, 1.6, CRATE);
    // roof (walkable), a drainpipe up the west wall
    const sr0 = b.boxes.length;
    b.box(22, SHED_H + 0.1, -17, 16.3, 0.2, 14.3, STEEL);
    b.mark(sr0, { overhead: true });
    b.pipeV(13.7, -12, 0, SHED_H + 0.2, Math.PI / 2);

    // ================= quayside =================
    // the gantry crane: legs (high cover) and the beam overhead
    for (const [x, z] of [[-12, 4], [-12, 20], [2, 4], [2, 20]] as const) b.block(x, z, 1.0, 14, 1.0, YELLOW);
    b.box(-5, 14.5, 4, 16, 1.0, 1.0, YELLOW, 0, 0, false).box(-5, 14.5, 20, 16, 1.0, 1.0, YELLOW, 0, 0, false).box(-5, 15.2, 12, 3, 1.2, 17, YELLOW, 0, 0, false);
    // stacks waiting to load, crates, a reefer row
    container(b, -26, 6, 0, 0, 4);
    container(b, -26, 6, 0, CH, 2);
    container(b, 9, 6, 0, 0, 0);
    container(b, 20, 7, Math.PI / 2, 0, 5);
    container(b, 26, 7, Math.PI / 2, 0, 1);
    container(b, 26, 7, Math.PI / 2, CH, 3);
    b.ladder(-26, 6 - CW / 2 - 0.15, 0, CH * 2, 0, STEEL);
    b.lowCover(-6, 16, 3, CRATE, Math.PI / 2, 1.1, 1.2).lowCover(6, 18, 2.4, CRATE, 0, 1.1, 1.2).lowCover(18, 18.5, 4, '#5a5f66', Math.PI / 2, 1.2, 1.0);
    b.block(-20, 18, 1.2, 1.3, 1.2, CRATE).block(-18.6, 18.2, 1.0, 1.0, 1.0, CRATE);

    // ================= the cargo ship =================
    b.block(-6, 27, 40, DECK_Y, 6, HULL);
    b.box(-6, DECK_Y + 0.02, 27, 39.6, 0.04, 5.6, DECK, 0, 0, false);
    // gangway up from the quay; bulwarks along the deck edges (gaps for the gangway and the bow ladder)
    b.ramp(-4, 21, 1.6, 6, DECK_Y, STEEL, 0);
    const rail = -Math.atan2(DECK_Y, 6);
    b.box(-4.85, 2.4, 21, 0.06, 0.06, 6.7, STEEL, 0, rail, false).box(-3.15, 2.4, 21, 0.06, 0.06, 6.7, STEEL, 0, rail, false);
    b.box(-12.45, DECK_Y + 0.45, 24.1, 15.1, 0.9, 0.15, RUST).box(5.5, DECK_Y + 0.45, 24.1, 17, 0.9, 0.15, RUST);
    b.box(-3, DECK_Y + 0.45, 29.9, 34, 0.9, 0.15, RUST);
    // hatches (low cover), deck containers
    b.block(-15, 27, 5, 0.9, 3.4, '#3d4a3a', DECK_Y).block(-8, 27, 5, 0.9, 3.4, '#3d4a3a', DECK_Y);
    container(b, 1, 27.6, 0, DECK_Y, 2);
    container(b, 8, 26.6, 0, DECK_Y, 5);
    // the funnel, then the bridge at the stern: a deckhouse with a door and windows; a ladder to its roof (lookout)
    b.pillar(-18, 27.6, 0.9, 4, '#8a2f2a', DECK_Y);
    wallXAt(b, 24.3, -26, -20, [[-23.6, -22.4]], DECK_Y, BRIDGE_H, '#d8d4c8');
    glassX(b, -23, 24.3, DECK_Y, BRIDGE_H, '#d8d4c8');
    wallXAt(b, 29.7, -26, -20, [], DECK_Y, BRIDGE_H, '#d8d4c8');
    wallZAt(b, -26, 24.3, 29.7, [], DECK_Y, BRIDGE_H, '#d8d4c8');
    wallZAt(b, -20, 24.3, 29.7, [[25.4, 26.5], [26.9, 28.1]], DECK_Y, BRIDGE_H, '#d8d4c8');
    windowZ(b, -20, 27.5, DECK_Y, BRIDGE_H, '#d8d4c8', { open: true });
    b.door(-20, DECK_Y, 25.4, 1.1, 0, { swing: -1 });
    b.box(-23, DECK_Y + BRIDGE_H + 0.1, 27, 6.3, 0.2, 5.7, '#d8d4c8');
    b.box(-23, DECK_Y + BRIDGE_H + 0.75, 24.2, 6.3, 0.9, 0.12, RUST).box(-25.95, DECK_Y + BRIDGE_H + 0.75, 27, 0.12, 0.9, 5.7, RUST);
    b.block(-23, 28.8, 3.6, 1.1, 0.8, '#3a3f48', DECK_Y).block(-25, 26.6, 0.8, 1.0, 0.8, '#3a3f48', DECK_Y);
    b.ladder(-19.7, 29.1, DECK_Y, DECK_Y + BRIDGE_H + 0.2, -Math.PI / 2, STEEL);
    // the bosun's store at the bow (a door off the deck)
    wallXAt(b, 27.9, 11.6, 14, [], DECK_Y, 2.4, '#d8d4c8');
    wallZAt(b, 11.6, 27.9, 29.85, [[28.2, 29.2]], DECK_Y, 2.4, '#d8d4c8');
    b.door(11.6, DECK_Y, 28.2, 1.0, 0, { swing: 1 });
    const bs0 = b.boxes.length;
    b.box(12.8, DECK_Y + 2.5, 28.875, 2.7, 0.2, 2.25, RUST);
    b.mark(bs0, { overhead: true });
    // the bow ladder down to the pier
    b.ladder(14.3, 26, 0, DECK_Y, -Math.PI / 2, STEEL);

    // ================= pier =================
    b.floor(23, 27, 18, 6, '#5d5a52', 0.02, 0.04);
    for (const x of [17, 21]) b.pillar(x, 29.4, 0.25, 0.7, '#2b2d30');
    // the harbour hut (a door and a window onto the pier)
    b.wallX(27.6, 25, 29, [[26.4, 27.5]], 2.6, '#c9c4b8');
    b.wallX(29.8, 25, 29, [], 2.6, '#c9c4b8');
    b.wallZ(25, 27.6, 29.8, [], 2.6, '#c9c4b8');
    b.wallZ(29, 27.6, 29.8, [], 2.6, '#c9c4b8');
    b.door(26.4, 0, 27.6, 1.1, Math.PI / 2, { swing: -1 });
    const hh0 = b.boxes.length;
    b.box(27, 2.7, 28.7, 4.3, 0.2, 2.5, STEEL);
    b.mark(hh0, { overhead: true });
    b.block(28.5, 25.4, 2.4, 1.0, 1.4, '#3d4a5a').block(19, 28.6, 1.2, 1.2, 1.2, CRATE);

    // ================= lights =================
    const down = makeCone(0, -1, 0, 0.75);
    for (const [x, z, g] of [[-21, -8, YARD], [5, -12, YARD], [-18, 14, QUAYSIDE], [12, 14, QUAYSIDE], [24, 20, QUAYSIDE]] as const) {
      b.pillar(x, z, 0.12, 8, '#2b2f36');
      b.light({ kind: 'spot', x, y: 8.1, z, radius: 13, intensity: 0.9, color: [1, 0.82, 0.55], cone: down, group: g, fixture: { sx: 0.7, sy: 0.25, sz: 0.5, oy: 0.12 } });
    }
    b.light({ kind: 'lamp', x: 7, y: 2.6, z: -26.25, radius: 4, intensity: 0.9, color: [1, 0.9, 0.75], group: YARD + 10, fixture: { sx: 0.6, sy: 0.08, sz: 0.25, oy: 0.08 } });
    const lamp = (x: number, y: number, z: number, group: number, color: [number, number, number] = [1, 0.92, 0.8], r = 6): void => {
      b.light({ kind: 'lamp', x, y, z, radius: r, intensity: 1, color, group, fixture: { sx: 1.2, sy: 0.08, sz: 0.25, oy: 0.08 } });
    };
    lamp(18, SHED_H - 0.3, -19, SHEDL, [0.9, 0.95, 1], 8);
    lamp(18, SHED_H - 0.3, -13, SHEDL, [0.9, 0.95, 1], 8);
    lamp(27, MEZZ + 2.45, -20, OFFICEL);
    lamp(27, MEZZ + 2.45, -12.8, OFFICEL);
    lamp(-23, DECK_Y + BRIDGE_H - 0.15, 27, BRIDGEL, [0.6, 0.85, 0.7], 5);
    b.ambientZone(14, 30, -24, -10, 0.1, -1, SHED_H);
    b.ambientZone(5, 9, -28, -24.5, 0.12, -1, 3);
    b.ambientZone(-26, -20, 24.3, 29.7, 0.1, DECK_Y - 0.5, DECK_Y + BRIDGE_H);
    // surfaces: concrete quay, steel deck / mezzanine / roofs, a wooden pier
    b.surface('metal', -26, 14, 24, 30, DECK_Y);
    b.surface('metal', 24, 30, -24, -10, MEZZ);
    b.surface('metal', 14, 30, -24, -10, SHED_H + 0.2);
    b.surface('wood', 14, 32, 24, 30);
    b.surface('metal', -32, 32, -30, 30, CH);

    const v = (x: number, z: number, y = 0): Vector3 => new Vector3(x, y, z);
    return {
      playerSpawns: [
        { pos: v(-1.5, -28.4), yaw: 0 },
        { pos: v(1.5, -28.4), yaw: 0 },
        { pos: v(-3, -28.4), yaw: 0 },
        { pos: v(3, -28.4), yaw: 0 },
      ],
      enemySpawns: [v(-22, -16), v(-10, -8), v(4, -11.5), v(20, -13), v(-14, 12), v(10, 12), v(-2, 17), v(24, 27)],
      props: [
        { kind: 'explosiveBarrel', pos: v(-8.8, -21.5) },
        { kind: 'barrel', pos: v(15.2, -22.8) },
        { kind: 'barrel', pos: v(-23, 20.5) },
        { kind: 'crate', pos: v(13, 16) },
      ],
      objectives: [
        { id: 'manifest', pos: v(27.2, -20, MEZZ), kind: 'terminal' },
        { id: 'tracker', pos: v(-8, 25.0, DECK_Y), kind: 'cache' },
        { id: 'scanner', pos: v(17, -20.6), kind: 'terminal' },
        { id: 'extract', pos: v(31, 26), kind: 'extract' },
      ],
      pickups: [
        { pos: v(7.6, -27.4, 0.95), kind: 'ammo' },
        { pos: v(27, -12.6, 1.2), kind: 'health' },
        { pos: v(-25, 26.6, DECK_Y + 1.0), kind: 'ammo' },
      ],
      rooms: ROOMS,
      switches: [
        { pos: v(14.15, -15.5), yaw: Math.PI / 2, group: SHEDL },
        { pos: v(24.15, -21.8, MEZZ), yaw: Math.PI / 2, group: OFFICEL },
        { pos: v(-20.15, 24.8, DECK_Y), yaw: -Math.PI / 2, group: BRIDGEL },
      ],
      alarms: [
        { pos: v(5.15, -26.3), yaw: Math.PI / 2 },
        { pos: v(29.85, -14), yaw: -Math.PI / 2 },
        { pos: v(-25.85, 29, DECK_Y), yaw: Math.PI / 2 },
      ],
      hideSpots: [{ pos: v(-29, -23) }, { pos: v(-8.2, -16) }, { pos: v(13, 28.9, DECK_Y) }, { pos: v(-26, 9.2) }],
      reinforce: [v(0, -28.5), v(-30, 20), v(30, 20)],
    };
  },
};
