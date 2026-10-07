import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import { makeCone } from '../lights';

const STONE = '#b9b2a2';
const STONE_DARK = '#8a8478';
const PLASTER = '#d6cfc0';
const ROOF = '#4a4f55';
const HEDGE = '#3e5a36';
const GRAVEL = '#7d7a70';
const STEEL = '#55606a';
const WOOD = '#7a5a3e';
const CAR = '#23272e';
const GLASS = '#1b2530';
const TYRE = '#141518';
const SEAT = '#2a2d33';
const BRONZE = '#5b5040';

/** Main building: one tall storey under a walkable roof. */
const H = 3.6;
const ROOF_TOP = 3.9;
const T = 0.3;

const ROOMS: RoomDef[] = [
  {
    id: 'court',
    name: 'Front Court',
    minX: -8.8,
    maxX: 18,
    minZ: -22,
    maxZ: -0.2,
    squad: [
      { kind: 'grunt', x: -6, z: -6, yaw: 0, route: [[-6, -6], [6, -6], [6, -13], [-6, -13]], wait: 2 },
      { kind: 'dog', x: -5.2, z: -6.8, yaw: 0 },
      // overwatch from the gate tower
      { kind: 'sniper', x: 14, z: -16, yaw: Math.PI * 0.9 },
    ],
  },
  { id: 'westcourt', name: 'Front Court', minX: -18, maxX: -8.8, minZ: -14.8, maxZ: -0.2 },
  { id: 'gatehouse', name: 'Gatehouse', minX: -14, maxX: -9, minZ: -20, maxZ: -15, squad: [{ kind: 'grunt', x: -12.8, z: -16.2, yaw: Math.PI }] },
  { id: 'garden', name: 'West Garden', minX: -26, maxX: -18.2, minZ: -22, maxZ: 22, squad: [{ kind: 'grunt', x: -22, z: -12, yaw: 0, route: [[-22, -12], [-22, 15], [-20, 2]], wait: 3 }] },
  { id: 'yard', name: 'Service Yard', minX: 18.2, maxX: 26, minZ: -22, maxZ: 7.8, squad: [{ kind: 'droneOp', x: 22, z: -12, yaw: -Math.PI / 2 }] },
  { id: 'garage', name: 'Garage', minX: 19.5, maxX: 25.5, minZ: 8, maxZ: 18, squad: [{ kind: 'grunt', x: 21.4, z: 16.6, yaw: Math.PI }] },
  { id: 'lobby', name: 'Lobby', minX: -5, maxX: 5, minZ: 0, maxZ: 10, squad: [{ kind: 'grunt', x: 3.2, z: 7.5, yaw: Math.PI }] },
  { id: 'security', name: 'Security Office', minX: -9, maxX: -5, minZ: 0, maxZ: 10, squad: [{ kind: 'grunt', x: -7, z: 3.2, yaw: Math.PI / 2 }] },
  {
    id: 'server',
    name: 'Server Room',
    minX: -18,
    maxX: -9,
    minZ: 0,
    maxZ: 10,
    squad: [
      { kind: 'heavy', x: -11, z: 8.2, yaw: Math.PI },
      { kind: 'grunt', x: -16, z: 2, yaw: 0, route: [[-16, 2], [-16, 8.6], [-10.5, 2.2]], wait: 2 },
    ],
  },
  { id: 'reception', name: 'Reception', minX: 5, maxX: 11, minZ: 0, maxZ: 10, squad: [{ kind: 'grunt', x: 8, z: 7.6, yaw: Math.PI }] },
  { id: 'ambassador', name: "Ambassador's Office", minX: 11, maxX: 18, minZ: 0, maxZ: 10, squad: [{ kind: 'officer', x: 13, z: 7.4, yaw: Math.PI }] },
  { id: 'corridor', name: 'Corridor', minX: -18, maxX: 18, minZ: 10, maxZ: 12.5, squad: [{ kind: 'enforcer', x: -14, z: 11.2, yaw: Math.PI / 2, route: [[-14, 11.2], [14, 11.2]], wait: 2 }] },
  { id: 'conference', name: 'Conference Room', minX: -18, maxX: -6, minZ: 12.5, maxZ: 18, squad: [{ kind: 'grunt', x: -9, z: 16.4, yaw: Math.PI }] },
  { id: 'staff', name: 'Staff Room', minX: -6, maxX: 6, minZ: 12.5, maxZ: 18 },
  { id: 'archive', name: 'Archive', minX: 6, maxX: 18, minZ: 12.5, maxZ: 18, squad: [{ kind: 'grunt', x: 14.75, z: 13.6, yaw: -Math.PI / 2 }] },
];

/** Lamp circuits (switches turn a group). */
const LOBBY = 1;
const CORRIDOR = 2;
const SERVER = 3;
const OFFICE = 4;
const ARCHIVE = 5;
const GARAGE = 6;
const COURT = 10;

/** A slab over [x0, x1] x [z0, z1] at height y (centre) with square holes (vents): strips around them. */
function slabWithHoles(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, y: number, th: number, holes: readonly [number, number, number][], color: string): void {
  // columns split at the hole edges in x; each column split in z round the holes inside it
  const xs = [x0, x1];
  for (const [hx, , hs] of holes) xs.push(hx - hs / 2, hx + hs / 2);
  xs.sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i]!;
    const c = xs[i + 1]!;
    if (c - a < 1e-3) continue;
    const mx = (a + c) / 2;
    const zs = [z0, z1];
    for (const [hx, hz, hs] of holes) if (mx > hx - hs / 2 && mx < hx + hs / 2) zs.push(hz - hs / 2, hz + hs / 2);
    zs.sort((p, q) => p - q);
    for (let k = 0; k < zs.length - 1; k++) {
      const za = zs[k]!;
      const zb = zs[k + 1]!;
      if (zb - za < 1e-3) continue;
      const mz = (za + zb) / 2;
      // skip the hole itself
      let hole = false;
      for (const [hx, hz, hs] of holes) if (Math.abs(mx - hx) < hs / 2 && Math.abs(mz - hz) < hs / 2) hole = true;
      if (!hole) b.box(mx, y, mz, c - a, th, zb - za, color);
    }
  }
}

/** A roof duct: a housing on the roof from a wall grate (facing +z) down to a ceiling vent at (x, zVent). */
function roofDuct(b: LevelBuilder, x: number, zVent: number, zEntry: number): void {
  const y0 = ROOF_TOP;
  const cz = (zVent + zEntry) / 2;
  const len = zEntry - zVent + 0.4;
  b.box(x - 0.55, y0 + 0.55, cz, 0.1, 1.1, len, STEEL);
  b.box(x + 0.55, y0 + 0.55, cz, 0.1, 1.1, len, STEEL);
  b.box(x, y0 + 1.15, cz, 1.2, 0.1, len, STEEL);
  b.box(x, y0 + 0.55, zVent - 0.3, 1.0, 1.1, 0.1, STEEL);
  b.duct(
    [
      { x, y: y0, z: zEntry - 0.25 },
      { x, y: y0, z: zVent },
    ],
    { pos: { x, y: y0 + 0.45, z: zEntry }, nx: 0, ny: 0, nz: 1, where: 'wall' },
    { pos: { x, y: (y0 + H) / 2, z: zVent }, nx: 0, ny: -1, nz: 0, where: 'ceiling' },
  );
}

/** A parked car along `yaw` (0 = along z): a waist-high body (low cover), the cabin, a dark skirt for the wheels. */
function car(b: LevelBuilder, x: number, z: number, yaw: number, color: string, len = 4.4): void {
  const sx = Math.sin(yaw) * -0.15;
  const sz = Math.cos(yaw) * -0.15;
  b.block(x, z, 1.9, 1.0, len, color, 0, yaw);
  b.box(x + sx, 1.27, z + sz, 1.66, 0.54, len * 0.52, GLASS, yaw);
  b.box(x, 0.2, z, 1.98, 0.36, len - 0.5, TYRE, yaw, 0, false);
}

/** A van (high cover) along `yaw`: the box body, a windscreen band at the front, the wheel skirt. */
function van(b: LevelBuilder, x: number, z: number, yaw: number, color: string, len = 4.8): void {
  const fx = Math.sin(yaw) * (len / 2 + 0.01);
  const fz = Math.cos(yaw) * (len / 2 + 0.01);
  b.block(x, z, 2.0, 1.85, len, color, 0, yaw);
  b.box(x + fx, 1.4, z + fz, 1.8, 0.55, 0.04, GLASS, yaw, 0, false);
  b.box(x, 0.2, z, 2.08, 0.36, len - 0.6, TYRE, yaw, 0, false);
}

/** A flag pole with its flag hanging off towards +x. */
function flag(b: LevelBuilder, x: number, z: number, h: number, color: string, y = 0): void {
  b.pillar(x, z, 0.05, h, '#c9c4b8', y);
  b.box(x + 0.6, y + h - 0.5, z, 1.1, 0.7, 0.03, color, 0, 0, false);
}

/** A potted plant (a stone pot, a round shrub): low enough to see over, solid to walk into. */
function plant(b: LevelBuilder, x: number, z: number, y = 0): void {
  b.pillar(x, z, 0.32, 0.5, STONE, y).pillar(x, z, 0.42, 0.7, HEDGE, y + 0.5);
}

/**
 * The embassy (night): a walled compound - a front court with a fountain, a gatehouse and a gate tower, a west
 * garden, a service yard and garage, and the residence: lobby, security office, server room, reception, the
 * ambassador's office, a corridor, conference room, staff room and archive under a walkable roof. Every
 * objective room is reachable along the ground, from above (roof ducts, a zipline) and through windows.
 */
export const embassy: MapDef = {
  id: 'embassy',
  name: 'Embassy',
  description: 'Night: a walled compound, a residence with a walkable roof, roof ducts and dark gardens.',
  modes: ['infiltration', 'clear', 'wave', 'tdm', 'ffa'],
  theme: {
    sky: '#070b14',
    horizon: '#1e2633',
    ground: '#4d5048',
    fogStart: 28,
    fogEnd: 85,
    sunDir: [-0.4, -1, 0.3],
    sunIntensity: 0.14,
    ambient: 0.28,
    lightLevel: 0.22,
    floor: 'gravel',
    faction: 'maritime',
    // night by the sea: steel blue
    grade: { tint: [0.9, 0.98, 1.1], saturation: 0.8, contrast: 1.1 },
  },
  build(b: LevelBuilder): MapLayout {
    // ground and compound wall
    b.floor(0, 0, 58, 50, GRAVEL, 0, 1);
    b.perimeter(-26, 26, -22, 22, 4.2, STONE_DARK);
    // the gate in the south wall (closed, a steel leaf) and a paved drive
    b.box(0, 1.6, -21.9, 4.2, 3.2, 0.12, STEEL, 0, 0, false);
    b.floor(0, -11, 8, 22, '#8c877c', 0.02, 0.04);

    // ---------------- residence: exterior walls (doors / windows as gaps) ----------------
    b.floor(0, 9, 36, 18, '#77736a', 0.02, 0.04);
    // south facade: double front door, the security office window, a reception window (behind the planters)
    b.wallX(0, -18, 18, [[-7.6, -6.4], [-1.2, 1.2], [9, 10.2]], H, PLASTER, T);
    b.box(-7, 0.45, 0, 1.2, 0.9, T, PLASTER).box(-7, 2.85, 0, 1.2, 1.5, T, PLASTER);
    b.windowAt(-7, 1.5, 0, 1.2, 1.2, 0, { sill: 0.9, breakable: true });
    b.box(9.6, 0.45, 0, 1.2, 0.9, T, PLASTER).box(9.6, 2.85, 0, 1.2, 1.5, T, PLASTER);
    b.windowAt(9.6, 1.5, 0, 1.2, 1.2, 0, { sill: 0.9, breakable: true });
    // north facade (a dark service alley): a conference window, the staff back door, an open archive window
    b.wallX(18, -18, 18, [[-14.6, -13.4], [-1, 0.2], [11.4, 12.6]], H, PLASTER, T);
    b.box(-14, 0.45, 18, 1.2, 0.9, T, PLASTER).box(-14, 2.85, 18, 1.2, 1.5, T, PLASTER);
    b.windowAt(-14, 1.5, 18, 1.2, 1.2, 0, { sill: 0.9, breakable: true });
    b.box(12, 0.45, 18, 1.2, 0.9, T, PLASTER).box(12, 2.85, 18, 1.2, 1.5, T, PLASTER);
    b.windowAt(12, 1.5, 18, 1.2, 1.2, 0, { sill: 0.9, open: true });
    // west facade: the server room window (glazed), a conference door
    b.wallZ(-18, 0, 18, [[4.4, 5.6], [15, 16.1]], H, PLASTER, T);
    b.box(-18, 0.45, 5, T, 0.9, 1.2, PLASTER).box(-18, 2.85, 5, T, 1.5, 1.2, PLASTER);
    b.windowAt(-18, 1.5, 5, 1.2, 1.2, Math.PI / 2, { sill: 0.9, breakable: true });
    // east facade: the ambassador's window (open), an archive door
    b.wallZ(18, 0, 18, [[4.4, 5.6], [14, 15.1]], H, PLASTER, T);
    b.box(18, 0.45, 5, T, 0.9, 1.2, PLASTER).box(18, 2.85, 5, T, 1.5, 1.2, PLASTER);
    b.windowAt(18, 1.5, 5, 1.2, 1.2, Math.PI / 2, { sill: 0.9, open: true });

    // ---------------- interior ----------------
    // corridor walls (z 10 and 12.5) with doors into every room
    b.wallX(10, -18, 18, [[-11, -9.9], [-7.5, -6.4], [-1.5, 1.5], [7, 8.1], [12, 13.1]], H, PLASTER, T);
    b.wallX(12.5, -18, 18, [[-12, -10.9], [-1, 0.1], [10, 11.1]], H, PLASTER, T);
    // wing partitions
    b.wallZ(-9, 0, 10, [], H, PLASTER, T);
    b.wallZ(-5, 0, 10, [[4, 5.1]], H, PLASTER, T);
    b.wallZ(5, 0, 10, [[4, 5.1]], H, PLASTER, T);
    b.wallZ(11, 0, 10, [[6, 7.1]], H, PLASTER, T);
    b.wallZ(-6, 12.5, 18, [], H, PLASTER, T);
    b.wallZ(6, 12.5, 18, [[14.5, 15.6]], H, PLASTER, T);
    // doors
    b.door(-1.2, 0, 0, 1.2, Math.PI / 2, { swing: 1 });
    b.door(1.2, 0, 0, 1.2, -Math.PI / 2, { swing: 1 });
    b.door(-11, 0, 10, 1.1, Math.PI / 2, { swing: -1 });
    b.door(-7.5, 0, 10, 1.1, Math.PI / 2, { swing: -1 });
    b.door(12, 0, 10, 1.1, Math.PI / 2, { swing: -1 });
    b.door(-12, 0, 12.5, 1.1, Math.PI / 2, { swing: 1 });
    b.door(10, 0, 12.5, 1.1, Math.PI / 2, { swing: 1 });
    b.door(18, 0, 14, 1.1, 0, { swing: -1 });
    b.door(-1, 0, 18, 1.2, Math.PI / 2, { swing: 1 });

    // lobby: a reception desk, benches, pillars; a baggage scanner, a waiting sofa
    b.block(0, 6.2, 3.2, 1.05, 0.8, WOOD);
    b.pillar(-3, 3, 0.3, H, STONE).pillar(3, 3, 0.3, H, STONE);
    b.lowCover(-3.5, 8.5, 1.8, WOOD, 0, 0.9, 0.5);
    b.block(4.2, 1.8, 0.8, 1.05, 2.0, STEEL);
    b.block(-4.4, 6.45, 0.8, 0.8, 1.6, '#3e4a5a');
    // security office: desks and a monitor wall (screens), a gun locker
    b.block(-7, 7.8, 2.4, 0.95, 0.8, WOOD).block(-8.6, 2.5, 0.5, 1.9, 2.4, STEEL);
    b.box(-8.33, 1.3, 2.5, 0.04, 0.9, 2.0, '#2b4a5e', 0, 0, false);
    b.block(-8.6, 5.6, 0.5, 1.85, 1.2, STEEL);
    // server room: rack rows (high cover), a cooling unit, a UPS cabinet; the terminal is the objective
    for (const x of [-15.5, -12.5]) b.block(x, 6.2, 0.9, 2.2, 4.4, '#1f2a36');
    b.block(-10.2, 2.2, 1.2, 1.8, 1.4, STEEL);
    b.block(-17.5, 9.2, 0.6, 1.8, 1.0, '#2a3440');
    // reception / ambassador: desks, a bookcase, a sofa
    b.block(8, 4.5, 2.4, 0.95, 0.9, WOOD).block(15.5, 6.5, 2.6, 0.95, 1.2, WOOD).block(17.5, 2, 0.6, 2.0, 2.6, WOOD);
    b.lowCover(13, 2.2, 2.2, '#5a3a3a', 0, 0.85, 0.8);
    // reception: a waiting sofa, filing cabinets; ambassador: a coffee table, a sideboard
    b.block(6.9, 0.6, 2.0, 0.8, 0.8, '#4a3a3a').block(5.45, 8.9, 0.5, 1.3, 1.0, STEEL);
    b.block(14, 2.0, 0.6, 0.45, 1.0, WOOD).block(16.8, 9.45, 1.2, 1.0, 0.6, WOOD);
    // corridor: a console table, a plant at the dead end
    b.block(4.25, 10.35, 2.4, 0.85, 0.4, WOOD);
    plant(b, 17.35, 11.25);
    // conference: a long table, chairs (clear of the phone and the window), a credenza, a screen
    b.block(-12, 15.2, 6, 0.8, 1.6, WOOD);
    for (const [x, z] of [[-12.9, 16.45], [-11.1, 16.45], [-15.45, 15.2], [-8.55, 15.2]] as const) b.block(x, z, 0.48, 0.85, 0.48, SEAT);
    b.block(-6.45, 15, 0.5, 0.85, 2.4, WOOD);
    b.box(-17.83, 1.7, 13.6, 0.03, 1.1, 1.9, '#20262c', 0, 0, false);
    // staff: a kitchenette on the west side (the back door stays clear), a fridge, a table, a vending machine
    b.block(-3.3, 17.45, 3.4, 0.95, 0.7, '#6b6f73').block(-5.45, 17.45, 0.7, 1.85, 0.7, '#c8ccd0');
    b.block(2.5, 15.2, 1.6, 0.75, 1.0, WOOD).block(5.4, 13.3, 0.8, 1.85, 0.7, '#7a2a2a');
    // archive: shelving rows, filing cabinets by the door
    for (const x of [8.5, 11, 13.5, 16]) b.block(x, 15.8, 0.6, 2.2, 3, WOOD);
    b.block(7.2, 13, 1.2, 1.3, 0.6, STEEL);

    // ---------------- roof (walkable; vents into the server room and the ambassador's office) ----------------
    const slab0 = b.boxes.length;
    slabWithHoles(b, -18.15, 18.15, -0.15, 18.15, (H + ROOF_TOP) / 2, ROOF_TOP - H, [[-12.5, 4.0, 0.8], [15, 4.5, 0.8]], ROOF);
    b.mark(slab0, { overhead: true });
    roofDuct(b, -12.5, 4.0, 6.4);
    roofDuct(b, 15, 4.5, 6.9);
    // AC units and a skylight housing (cover on the roof); a short parapet on the north side
    b.block(-4, 14, 2.2, 1.2, 1.6, '#6d7378', ROOF_TOP).block(6, 15, 1.6, 1.0, 1.6, '#6d7378', ROOF_TOP).block(0, 6, 3.0, 0.8, 3.0, '#3b4a5a', ROOF_TOP);
    b.box(-9, ROOF_TOP + 0.35, 18.0, 18, 0.7, 0.25, PLASTER);
    // more roof clutter to move between: condensers, vent stacks, a satellite dish
    b.block(-8, 9, 2.0, 1.2, 1.4, '#6d7378', ROOF_TOP).block(11.5, 12.5, 1.6, 1.0, 1.6, '#6d7378', ROOF_TOP);
    b.pillar(-15, 15.5, 0.25, 1.0, STEEL, ROOF_TOP);
    b.pillar(-14.5, 9.5, 0.15, 1.0, STEEL, ROOF_TOP);
    b.box(-14.5, ROOF_TOP + 1.25, 9.5, 1.4, 0.08, 1.4, '#c8ccd0', 0, -0.6, false);
    // ways up: a ladder on the north facade, a hidden one in the dark alley beside the garage, drainpipes at the
    // front corners and the west side
    b.ladder(4, 18.3, 0, ROOF_TOP, Math.PI, STEEL);
    b.ladder(18.3, 16.6, 0, ROOF_TOP, -Math.PI / 2, STEEL);
    b.pipeV(-16.8, -0.3, 0, ROOF_TOP, 0);
    b.pipeV(16.8, -0.3, 0, ROOF_TOP, 0);
    b.pipeV(-18.3, 13, 0, ROOF_TOP, Math.PI / 2);
    // a pipe run along the east facade (hang and shimmy to the window)
    b.pipeH(18.3, 1, 18.3, 9, 2.7);
    // ziplines: roof -> front court, roof -> garage roof
    b.pillar(6, 1.0, 0.06, 2.2, STEEL, ROOF_TOP);
    b.zipline({ x: 6, y: ROOF_TOP + 2.0, z: 0.75 }, { x: 6, y: 2.4, z: -9 });
    b.pillar(17.2, 13.5, 0.06, 2.2, STEEL, ROOF_TOP);
    b.zipline({ x: 17.4, y: ROOF_TOP + 2.0, z: 13.5 }, { x: 23, y: 5.0, z: 13.5 });

    // ---------------- front court ----------------
    // fountain, hedges, cars, lamp posts
    b.pillar(0, -10, 1.8, 0.8, STONE).pillar(0, -10, 0.3, 2.2, STONE);
    b.lowCover(-8, -4.5, 5, HEDGE, Math.PI / 2, 1.1, 0.8).lowCover(8, -4.5, 5, HEDGE, Math.PI / 2, 1.1, 0.8);
    b.lowCover(-8, -15, 4, HEDGE, 0, 1.1, 0.8).lowCover(8, -15, 4, HEDGE, 0, 1.1, 0.8);
    // diplomatic cars in the west court
    car(b, -15.5, -7, 0, CAR);
    car(b, -12.5, -7, 0, '#3a3f48');
    car(b, -16.5, -12.2, 0, '#8d9298');
    // hedge planters 2 m off the facade: a crouched lane behind them to the security and reception windows
    for (const x of [-15.2, -11.6, 11.4, 14.6]) b.lowCover(x, -2.2, 2.4, HEDGE, Math.PI / 2, 1.05, 0.8);
    // flags by the front door, a bronze statue in the east court
    flag(b, -4.6, -1.4, 6.5, '#24427a');
    flag(b, -3.4, -1.4, 6.5, '#a8323a');
    b.block(12.5, -5.5, 1.2, 1.0, 1.2, STONE).pillar(12.5, -5.5, 0.28, 1.5, BRONZE, 1.0);
    // the gate security booth (a lamp over the drive)
    b.block(5.3, -19.8, 1.6, 2.4, 1.6, STONE).mark(b.boxes.length - 1, { noLedge: true });
    b.box(5.3, 2.47, -19.8, 2.0, 0.14, 2.0, ROOF, 0, 0, false);
    // gatehouse (a small room with a roof, a door and a glazed window)
    b.wallX(-20, -14, -9, [], 3, STONE, T);
    b.wallX(-15, -14, -9, [[-12, -10.9]], 3, STONE, T);
    b.wallZ(-14, -20, -15, [], 3, STONE, T);
    b.wallZ(-9, -20, -15, [[-18.1, -16.9]], 3, STONE, T);
    b.box(-9, 0.45, -17.5, T, 0.9, 1.2, STONE).box(-9, 2.5, -17.5, T, 1.0, 1.2, STONE);
    b.windowAt(-9, 1.5, -17.5, 1.2, 1.2, Math.PI / 2, { sill: 0.9, breakable: true });
    b.door(-12, 0, -15, 1.1, Math.PI / 2, { swing: 1 });
    const gh0 = b.boxes.length;
    b.box(-11.5, 3.1, -17.5, 5.3, 0.2, 5.3, ROOF);
    b.mark(gh0, { overhead: true });
    b.block(-12.5, -18.8, 1.6, 0.95, 0.8, WOOD).block(-13.6, -19.5, 0.5, 1.85, 0.6, STEEL);
    // the gate tower: stairs up the north side, a railing
    b.block(14, -16, 3, 3.2, 3, STONE_DARK);
    b.stairs(14, -12.25, 1.6, 4.5, 3.2, 10, STONE, Math.PI);
    b.box(14, 3.7, -17.45, 3, 1.0, 0.15, STEEL).box(15.45, 3.7, -16, 0.15, 1.0, 3, STEEL).box(12.55, 3.7, -16, 0.15, 1.0, 3, STEEL);
    b.ladder(15.65, -16, 0, 3.2, -Math.PI / 2, STEEL);

    // ---------------- west garden ----------------
    for (const [x, z] of [[-23, -16], [-21, -6], [-24, 4], [-21.5, 12]] as const) {
      b.pillar(x, z, 0.25, 2.6, '#4a3a2a');
      b.pillar(x, z, 1.3, 1.4, HEDGE, 2.4);
    }
    // the shed (hide a body behind its door) and the storm drain grate
    b.block(-23.6, 8.5, 2.6, 2.4, 2.2, WOOD);
    b.box(-21, 0.03, -2, 1.2, 0.04, 1.2, STEEL, 0, 0, false);
    b.lowCover(-20, 18, 3, HEDGE, Math.PI / 2, 1.1, 0.8);
    // shrubs off the patrol path, and a tall hedge screening the garden from the west court
    for (const [x, z] of [[-24.8, -8.5], [-24.6, -1], [-24.9, 14.5], [-19.5, 8.6]] as const) b.pillar(x, z, 0.6, 1.1, HEDGE);
    b.box(-19.2, 0.9, -10.5, 0.8, 1.8, 5, HEDGE);

    // ---------------- north service alley (dark): a dumpster, condensers ----------------
    b.block(-6, 21.3, 1.9, 1.15, 1.1, '#2f5a3c');
    b.block(-9, 18.55, 1.0, 0.9, 0.7, '#8a9096').block(7.5, 18.55, 1.0, 0.9, 0.7, '#8a9096');

    // ---------------- service yard and garage ----------------
    b.block(22, 1.5, 2.3, 2.3, 5.2, '#d0d0cc');
    b.block(23, -6, 2.0, 1.6, 1.2, '#596048');
    b.block(24.2, -18.2, 1.9, 1.2, 1.1, '#2f5a3c');
    // a delivery van, pallets and crates, a fuel tank
    van(b, 19.7, -18.4, 0, '#d6d6d2');
    b.block(24.8, -12.5, 1.2, 1.0, 1.2, WOOD);
    b.block(19.4, -9.5, 1.1, 1.1, 1.1, WOOD);
    b.pillar(25, -0.8, 0.8, 2.0, '#9aa0a6');
    b.wallX(8, 19.5, 25.5, [], 3, STONE, T);
    b.wallX(18, 19.5, 25.5, [], 3, STONE, T);
    b.wallZ(19.5, 8, 18, [[11, 13.6]], 3, STONE, T);
    b.wallZ(25.5, 8, 18, [], 3, STONE, T);
    const gr0 = b.boxes.length;
    b.box(22.5, 3.1, 13, 6.3, 0.2, 10.3, ROOF);
    b.mark(gr0, { overhead: true });
    car(b, 22.5, 10.5, 0, CAR, 4.2);
    b.block(24.2, 16, 1.2, 1.8, 1.6, STEEL);
    // a workbench
    b.block(25, 11.2, 0.6, 0.95, 2.0, WOOD);
    b.pipeV(25.8, 9, 0, 3.2, -Math.PI / 2);

    // ---------------- lights (night: pools of light, dark gardens) ----------------
    const down = makeCone(0, -1, 0, 0.9);
    for (const [x, z] of [[-8, -11], [8, -11], [0, -2.5]] as const) {
      b.pillar(x, z, 0.08, 3.6, '#2b2f36');
      b.light({ kind: 'spot', x, y: 3.7, z, radius: 7, intensity: 0.85, color: [1, 0.9, 0.7], cone: down, group: COURT, fixture: { sx: 0.35, sy: 0.18, sz: 0.35, oy: 0.1 } });
    }
    b.light({ kind: 'spot', x: 14, y: 4.6, z: -17.2, radius: 10, intensity: 0.9, color: [0.85, 0.9, 1], cone: makeCone(-0.6, -0.8, -0.2, 0.55), group: COURT + 1, fixture: { sx: 0.45, sy: 0.22, sz: 0.3, oy: 0.12 } });
    b.light({ kind: 'lamp', x: -11.5, y: 2.8, z: -17.5, radius: 4.5, intensity: 0.9, color: [1, 0.9, 0.75], group: COURT + 2, fixture: { sx: 0.6, sy: 0.08, sz: 0.25, oy: 0.08 } });
    // the gate booth's lamp over the drive
    b.light({ kind: 'spot', x: 4.3, y: 2.3, z: -19.8, radius: 5, intensity: 0.75, color: [1, 0.92, 0.78], cone: makeCone(-0.5, -0.85, 0, 0.7), group: COURT + 3, fixture: { sx: 0.2, sy: 0.12, sz: 0.3, oy: 0.06 } });
    const lamp = (x: number, z: number, group: number, color: [number, number, number] = [1, 0.92, 0.78], r = 6): void => {
      b.light({ kind: 'lamp', x, y: H - 0.15, z, radius: r, intensity: 1, color, group, fixture: { sx: 0.9, sy: 0.08, sz: 0.25, oy: 0.08 } });
    };
    lamp(0, 3, LOBBY);
    lamp(0, 7.5, LOBBY);
    lamp(-12, 11.25, CORRIDOR, [1, 0.92, 0.78], 5);
    lamp(12, 11.25, CORRIDOR, [1, 0.92, 0.78], 5);
    lamp(-14, 4, SERVER, [0.55, 0.75, 1], 6);
    lamp(14.5, 5, OFFICE);
    lamp(12, 15.2, ARCHIVE, [1, 0.92, 0.78], 5);
    lamp(22.5, 13, GARAGE, [1, 0.95, 0.85], 5);
    b.ambientZone(-18, 18, 0, 18, 0.1, -1, ROOF_TOP - 0.1);
    b.ambientZone(-14, -9, -20, -15, 0.12, -1, 3);
    b.ambientZone(19.5, 25.5, 8, 18, 0.1, -1, 3);
    // darker side paths: the north service alley, the gap between the residence and the garage, the garden's
    // west strip under the trees
    b.ambientZone(-18, 18, 18.2, 22, 0.08, -1, 3.6);
    b.ambientZone(18.2, 19.4, 8, 18.2, 0.06, -1, 3.6);
    b.ambientZone(-26, -23.6, -22, 22, 0.1, -1, 4);
    // surfaces: stone court drive, carpet in the offices, wood archive, a metal roof
    b.surface('concrete', -4, 4, -22, 0);
    b.surface('carpet', 5, 18, 0, 10);
    b.surface('carpet', -18, -6, 12.5, 18);
    b.surface('wood', 6, 18, 12.5, 18);
    b.surface('concrete', -18, 18, 0, 18);
    b.surface('metal', -18.2, 18.2, -0.2, 18.2, ROOF_TOP);

    const v = (x: number, z: number, y = 0): Vector3 => new Vector3(x, y, z);
    return {
      playerSpawns: [
        { pos: v(0, -20.2), yaw: 0 },
        { pos: v(1.5, -20.2), yaw: 0 },
        { pos: v(-1.5, -20.2), yaw: 0 },
        { pos: v(3, -20.2), yaw: 0 },
      ],
      enemySpawns: [v(-6, -8), v(6, -8), v(0, 8.6), v(-12, 11.2), v(12, 11.2), v(-22, 0), v(22, -4), v(14.75, 13.4)],
      props: [
        { kind: 'barrel', pos: v(24.6, -9) },
        { kind: 'explosiveBarrel', pos: v(24.8, -4.2) },
        { kind: 'crate', pos: v(20.6, -15) },
        { kind: 'smallCrate', pos: v(-20.5, 15.5) },
      ],
      objectives: [
        { id: 'termA', pos: v(-14, 2.6), kind: 'terminal' },
        { id: 'termB', pos: v(8, 4.5), kind: 'terminal' },
        { id: 'cache', pos: v(13.5, 13.6), kind: 'cache' },
        { id: 'extract', pos: v(-23, 19), kind: 'extract' },
      ],
      pickups: [
        { pos: v(-12.4, -18.8, 0.95), kind: 'ammo' },
        { pos: v(24.2, 16, 1.8), kind: 'health' },
      ],
      rooms: ROOMS,
      switches: [
        { pos: v(-4.85, 1.2), yaw: Math.PI / 2, group: LOBBY },
        { pos: v(-17.85, 11.8), yaw: Math.PI / 2, group: CORRIDOR },
        { pos: v(-9.15, 8.5), yaw: -Math.PI / 2, group: SERVER },
      ],
      alarms: [
        { pos: v(4.85, 9), yaw: -Math.PI / 2 },
        { pos: v(-5.15, 7), yaw: -Math.PI / 2 },
        { pos: v(-13.85, -16.5), yaw: Math.PI / 2 },
      ],
      hideSpots: [{ pos: v(-22, 8.5) }, { pos: v(24.2, -17) }, { pos: v(7.8, 16.2) }, { pos: v(-6, 20.3) }],
      reinforce: [v(0, -20.5), v(-23.5, 20), v(23.5, -20)],
    };
  },
};
