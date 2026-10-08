import { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { MapDef, MapLayout } from '../mapDef';
import type { RoomDef } from '../rooms';
import type { Grate } from '../anchors';
import { windowZ } from './storey';

/**
 * Kestrel Exchange (3.2.x): a linear, indoor, night-time stealth map for the Chaos Theory movement. A 1930s telephone
 * exchange turned black-market switching hub, one U-shaped path of eight sections (S0 culvert .. S7 freight lift).
 * Built to `docs/prompts/exchange-map-plan.md`; every number there is a design decision, every deviation is logged in
 * `docs/prompts/exchange-map-progress.md`.
 *
 * Footprint x -32..32, z -20..20 (+Z north, yaw 0 = +Z). Walls are `noLedge` (lips come only from the named pieces).
 */

// --- palette (the Exchange's own)
const PL = '#9c9486'; // wall plaster
const PAN = '#4a3b2e'; // dark panelling
const GRN = '#3f5e4f'; // switchboard enamel
const TER = '#8a857b'; // terrazzo
const IRON = '#3c4146'; // cast iron
const RUST = '#7a4a2c';
const CARP = '#4f3a46'; // records-wing carpet
const BAK = '#1f1c1a'; // bakelite

/** Warm sodium lamps and the records wing's cold fluorescents. */
const SODIUM: [number, number, number] = [1, 0.78, 0.5];

/** Structural wall height (the perimeter's; nothing climbs to it: every wall is `noLedge`). */
const H = 8.0;
/** The roof of the southern row and the tunnel (visual only: nothing collides). */
const ROOF_Y = 6.7;

/** Lamp circuits (`LightDef.group`). */
export const EXCHANGE_GROUPS = { s0: 0, s1: 1, s2: 2, s3: 3, s4: 4, s6: 6, s7: 7 } as const;

/** A fixture box for a hanging lamp strip. */
const STRIP = { sx: 0.9, sy: 0.12, sz: 0.25, oy: 0 };

/** Build the pieces added by `fn` with no generated ledges (walls, headers, sills). */
function plain(b: LevelBuilder, fn: () => void): void {
  const from = b.boxes.length;
  fn();
  b.mark(from, { noLedge: true });
}

/** A door gap's header (2.1 m up to the wall top) in a wall along Z at x. */
function headerZ(b: LevelBuilder, x: number, a: number, e: number, color = PL): void {
  b.box(x, (2.1 + H) / 2, (a + e) / 2, 0.3, H - 2.1, e - a, color);
}

/** The same in a wall along X at z. */
function headerX(b: LevelBuilder, z: number, a: number, e: number, color = PL): void {
  b.box((a + e) / 2, (2.1 + H) / 2, z, e - a, H - 2.1, 0.3, color);
}

function rooms(): RoomDef[] {
  return [
    { id: 's0', name: 'Culvert', minX: -32, maxX: -24, minZ: -20, maxZ: -6 },
    { id: 's1', name: 'Sorting Room', minX: -24, maxX: -8, minZ: -20, maxZ: -6 },
    { id: 's2', name: 'Switchboard Hall', minX: -8, maxX: 12, minZ: -20, maxZ: -6 },
    { id: 's3', name: 'Boiler Room', minX: 12, maxX: 32, minZ: -20, maxZ: -6 },
    { id: 's4', name: 'Light Well', minX: 12, maxX: 32, minZ: -6, maxZ: 6 },
    { id: 's5', name: 'Records Wing', minX: 8, maxX: 32, minZ: 6, maxZ: 20 },
    { id: 's6', name: 'Exchange Floor', minX: -12, maxX: 8, minZ: -6, maxZ: 20, maxY: 3 },
    { id: 's6g', name: 'Exchange Gallery', minX: -12, maxX: 8, minZ: -6, maxZ: 20, minY: 3 },
    { id: 's7', name: 'Service Tunnel', minX: -32, maxX: -12, minZ: -6, maxZ: 20 },
  ];
}

export const exchange: MapDef = {
  id: 'exchange',
  name: 'Kestrel Exchange',
  description: 'A black-market switching hub in a 1930s telephone exchange. Get in through the culvert, tap the broker\'s line, leave by the freight lift. Stay in the dark.',
  theme: {
    sky: '#080b12',
    horizon: '#121823',
    ground: '#181b20',
    fogStart: 22,
    fogEnd: 80,
    sunDir: [-0.4, -0.8, 0.3],
    sunIntensity: 0.14,
    ambient: 0.2,
    lightLevel: 0.1,
    floor: 'concrete',
    faction: 'urban',
    grade: { tint: [0.95, 0.97, 1.1], saturation: 0.8, contrast: 1.12 },
  },
  modes: ['infiltration', 'clear', 'sandbox'],
  weathers: ['clear', 'rain', 'fog'],
  build(b: LevelBuilder): MapLayout {
    shell(b);
    s0(b);
    s1(b);
    s2(b);
    s3(b);
    const lamp = (x: number, y: number, z: number, radius: number, intensity: number, group: number): void => {
      b.light({ kind: 'lamp', x, y, z, radius, intensity, color: SODIUM, group, fixture: STRIP });
    };
    // S0: the one maintenance lamp over the walkway
    lamp(-29.4, 3.0, -13.5, 7, 0.95, EXCHANGE_GROUPS.s0);
    // S1: the table pool and the exit-door pool
    lamp(-13.2, 3.0, -14.6, 7, 0.95, EXCHANGE_GROUPS.s1);
    lamp(-9.6, 3.0, -10.3, 6, 0.95, EXCHANGE_GROUPS.s1);
    // S2: the desk
    lamp(6.0, 3.0, -14.5, 6, 0.9, EXCHANGE_GROUPS.s2);
    // S3: the stair foot (lit east end)
    lamp(22.0, 3.8, -13.8, 7, 1.0, EXCHANGE_GROUPS.s3);

    return {
      playerSpawns: [{ pos: new Vector3(-28, 0, -18), yaw: 0 }],
      enemySpawns: [new Vector3(-12.8, 0, -13), new Vector3(-5, 0, -10.1), new Vector3(27.8, 0, -11.2), new Vector3(19, 0, -0.6), new Vector3(21.4, 0, 10.4), new Vector3(-8.2, 0, 10), new Vector3(-27, 0, 15.2), new Vector3(-25.8, 0, 15.2)],
      props: [],
      objectives: [
        { id: 'trunk', pos: new Vector3(10, 0, -17.2), kind: 'terminal' },
        { id: 'logs', pos: new Vector3(20.4, 0, 7.3), kind: 'terminal' },
        { id: 'tap', pos: new Vector3(-2, 3.6, -4.7), kind: 'terminal' },
        { id: 'lift', pos: new Vector3(-30.2, 0, 18.6), kind: 'extract' },
      ],
      pickups: [
        { pos: new Vector3(-22.9, 0, -18.6), kind: 'health' },
        { pos: new Vector3(14.4, 0, -11), kind: 'ammo' },
        { pos: new Vector3(-23, 0, 18.5), kind: 'ammo' },
        { pos: new Vector3(30.8, 0, 7.4), kind: 'health' },
      ],
      rooms: rooms(),
      switches: [
        { pos: new Vector3(-31.9, 1.4, -14.5), yaw: Math.PI / 2, group: EXCHANGE_GROUPS.s0 },
        { pos: new Vector3(-15.0, 1.4, -6.3), yaw: Math.PI, group: EXCHANGE_GROUPS.s1 },
        { pos: new Vector3(-6.0, 1.4, -6.3), yaw: Math.PI, group: EXCHANGE_GROUPS.s2 },
      ],
      hideSpots: [
        { pos: new Vector3(-8.7, 0, -7.0) },
        { pos: new Vector3(-12.6, 0, -6.9) },
        { pos: new Vector3(-6.8, 0, -7.0) },
        { pos: new Vector3(9.5, 0, -19.0) },
        { pos: new Vector3(14.4, 0, -11.0) },
        { pos: new Vector3(28.6, 0, -13.4) },
      ],
    };
  },
};

/** Perimeter, floors, structural walls (with the doorways between sections), roofs, ambient zones, surfaces. */
function shell(b: LevelBuilder): void {
  plain(b, () => b.perimeter(-32, 32, -20, 20, H, PL));

  // floors (a little over the footprint so no seam shows under a wall)
  b.floor(-28, -13, 8.3, 14.3, IRON); // S0
  b.floor(-16, -13, 16.3, 14.3, TER); // S1
  b.floor(2, -13, 20.3, 14.3, TER); // S2
  b.floor(22, -13, 20.3, 14.3, IRON); // S3
  b.floor(22, 0, 20.3, 12.3, TER); // S4 court and arcade
  b.floor(20, 13, 24.3, 14.3, CARP); // S5
  b.floor(-2, 7, 20.3, 26.3, TER); // S6
  b.floor(-18.25, 7.5, 12.8, 3.6, IRON); // S7 tunnel
  b.floor(-26.9, 14.65, 10.2, 10.7, IRON); // S7 lift hall

  plain(b, () => {
    // S0 / S1 (thick: the duct runs in it)
    b.box(-24.0, H / 2, -13, 0.6, H, 14, PL);
    // the row's north line z=-6: S0 / S7, S1 / S7 and S1 / S6 (x -32..-8), S2 / S6 (x -8..8, the high glazed window),
    // the plant room (x 8..12, solid), S3 / S4 (x 12..32: the catwalk doorway above 3.3 and the cage door)
    b.wallX(-6, -32, -8, [], H, PL);
    b.wallX(-6, -8, 8, [[-7.6, -6.4]], H, PL);
    b.box(10, H / 2, 0, 4, H, 12, PL);
    b.wallX(-6, 12, 32, [[12.15, 13.15], [29.4, 30.6]], H, PL);
    // S1 / S2 (window, door), S2 / S3 (window above the perch, door)
    b.wallZ(-8, -20, -6, [[-14.0, -12.8], [-10.7, -9.5]], H, PL);
    b.wallZ(12, -20, -6, [[-17.1, -15.9], [-10.7, -9.5]], H, PL);
    // S4 / S5 facade (5.7 m: the roof strip caps it): the dark side door and the entry door
    b.wallX(6, 12, 32, [[15.6, 16.8], [27.0, 28.2]], 5.7, PL);
    // S5 / S6 and S6 / S7
    b.wallZ(8, 6, 20, [[9.2, 11.6]], H, PL);
    b.wallZ(-12, -6, 20, [[7.7, 8.9]], H, PL);
    // S7: the tunnel's walls, its west end, the hall's south wall (gap into the hall) and east wall
    b.wallX(5.7, -24.8, -12, [], H, PL);
    b.wallX(9.3, -32, -12, [[-24.4, -22.4]], H, PL);
    b.wallZ(-24.65, 5.55, 9.3, [], H, PL);
    b.wallZ(-21.85, 9.3, 20, [], H, PL);

    // doorway fills: headers over every door gap, the block under the catwalk doorway, the S2 glazed window frame
    headerZ(b, -8, -10.7, -9.5);
    headerZ(b, 12, -10.7, -9.5);
    headerX(b, -6, 29.4, 30.6);
    b.box(12.65, 1.65, -6.0, 1.0, 3.3, 0.3, PL);
    b.box(12.65, (5.4 + H) / 2, -6.0, 1.0, H - 5.4, 0.3, PL);
    b.box((27.0 + 28.2) / 2, (2.1 + 5.7) / 2, 6, 1.2, 5.7 - 2.1, 0.3, PL);
    b.box((15.6 + 16.8) / 2, (2.1 + 5.7) / 2, 6, 1.2, 5.7 - 2.1, 0.3, PL);
    headerZ(b, 8, 9.2, 11.6);
    headerZ(b, -12, 7.7, 8.9);
    // S2 high window: sill under, header over, the glazed window between (sill 3.8)
    b.box(-7.0, 1.9, -6.0, 1.2, 3.8, 0.3, PL);
    b.box(-7.0, (5.0 + H) / 2, -6.0, 1.2, H - 5.0, 0.3, PL);
    // S1 exit window and S2 perch window frames (sill 0.9 above their floors)
    windowZ(b, -8, -13.4, 0, H, PL, { open: true });
    b.box(12, 1.65, -16.5, 0.3, 3.3, 1.2, PL);
    windowZ(b, 12, -16.5, 3.3, H - 3.3, PL, { open: true });
  });
  // the S2 window the player sees the exchange floor through (glazed: guards cannot see through the glass)
  b.windowAt(-7.0, 4.4, -6.0, 1.2, 1.2, 0, { sill: 3.8, breakable: true, open: false });

  // doors
  b.door(-8, 0, -10.7, 1.2, 0, { swing: 1 }); // S1 -> S2
  b.door(12, 0, -10.7, 1.2, 0, { swing: 1 }); // S2 -> S3
  b.door(29.4, 0, -6, 1.2, Math.PI / 2, { swing: 1 }); // S3 cage door
  b.door(15.6, 0, 6, 1.2, Math.PI / 2, { swing: 1 }); // S4 dark side door
  b.door(27.0, 0, 6, 1.2, Math.PI / 2, { swing: 1 }); // S4 entry door
  b.door(8, 0, 9.2, 1.2, 0, { swing: 1 }); // S5 / S6 double doors
  b.door(8, 0, 11.6, 1.2, Math.PI, { swing: 1 });
  b.door(-12, 0, 7.7, 1.2, 0, { swing: 1 }); // S6 -> S7

  // roofs (visual only: no collision)
  b.box(0, ROOF_Y, -13, 64.6, 0.3, 14.6, IRON, 0, 0, false); // S0..S3
  b.box(-18.25, 3.5, 7.5, 12.8, 0.3, 3.6, IRON, 0, 0, false); // tunnel
  b.box(-26.9, ROOF_Y, 14.65, 10.2, 0.3, 10.7, IRON, 0, 0, false); // lift hall
  b.box(20, 3.5, 13, 24.3, 0.3, 14.3, IRON, 0, 0, false); // S5 wing
  // S6: the roof at 8.15 with the skylight stripe (x -3.5..0.5, z -3..17.5) left open
  b.box(-7.75, 8.15, 7, 8.5, 0.3, 26.5, IRON, 0, 0, false);
  b.box(4.25, 8.15, 7, 7.5, 0.3, 26.5, IRON, 0, 0, false);
  b.box(-1.5, 8.15, -4.5, 4, 0.3, 3, IRON, 0, 0, false);
  b.box(-1.5, 8.15, 18.75, 4, 0.3, 2.5, IRON, 0, 0, false);

  // ambient: S0 pitch dark, the rest of the interiors dark; the open sky of S4 and the skylight stripe are Phase 3
  b.ambientZone(-31.85, -24.3, -19.85, -6.15, 0.08);
  b.ambientZone(-23.7, -8.15, -19.85, -6.15, 0.12);
  b.ambientZone(-7.85, 11.85, -19.85, -6.15, 0.12);
  b.ambientZone(12.15, 31.85, -19.85, -6.15, 0.12);

  // surfaces: the sorting room is wood, the catwalks grate, plates by boiler B metal (S3)
  b.surface('wood', -23.7, -8, -19.85, -6.15, 0);
  b.surface('metal', 23.0, 29.5, -18.0, -13.0, 0);
  b.surface('grate', 12.15, 13.15, -19.8, -6.15, 3.3);
  b.surface('grate', 13.15, 26.45, -7.15, -6.15, 3.3);
  b.surface('grate', -26.9, -25.7, -14.6, -13.2, 0);
}

/** S0 Culvert: the insertion, no guard. Teaches gears, the light and noise meters, the roll, landing bands, the crawl. */
function s0(b: LevelBuilder): void {
  // the pump plinth (2.6 m: lips to hang from, a roll-band drop off its back) and a 1.3 m valve housing (a soft drop)
  b.box(-29.8, 1.3, -9.0, 2.4, 2.6, 2.4, RUST);
  // its motor housing (top 2.9, flush with the north face): walking off it is a 2.8 m fall, the roll band
  b.box(-29.8, 2.75, -8.3, 1.4, 0.3, 1.0, IRON);
  b.box(-28.9, 0.65, -15.1, 1.4, 1.3, 1.4, IRON);
  // the 1.2 m dry channel (low cover walls, inner faces x -26.9 / -25.7), z -19..-9
  b.box(-27.05, 0.55, -14, 0.3, 1.1, 10, IRON);
  b.box(-25.55, 0.55, -14, 0.3, 1.1, 10, IRON);
  // the grate strip across the channel (a visual plate on the marked surface)
  b.box(-26.3, 0.02, -13.9, 1.2, 0.04, 1.4, BAK, 0, 0, false);
  // the way out: a wall vent in S0's east wall to a wall vent in S1's south-west pocket behind the mail shelves
  const entry: Grate = { pos: { x: -24.3, y: 0.6, z: -9.5 }, nx: -1, ny: 0, nz: 0, where: 'wall' };
  const exit: Grate = { pos: { x: -23.7, y: 0.6, z: -19.2 }, nx: 1, ny: 0, nz: 0, where: 'wall' };
  b.duct(
    [
      { x: -24.0, y: 0.1, z: -9.5 },
      { x: -24.0, y: 0.1, z: -19.2 },
    ],
    entry,
    exit,
  );
}

/** S1 Sorting Room: shadows. Four mail-shelf rows (tops 2.6 m), two lit tables, the exit door and window. */
function s1(b: LevelBuilder): void {
  for (const z of [-18.2, -15.4, -12.6, -9.8]) b.box(-18.4, 1.3, z, 8.0, 2.6, 0.6, PAN);
  b.box(-12.0, 0.5, -14.2, 2.4, 1.0, 1.0, GRN); // table T1
  b.box(-11.2, 0.5, -7.8, 2.2, 1.0, 0.9, GRN); // table T2
  b.box(-13.4, 0.65, -9.0, 1.0, 1.3, 0.7, RUST); // mail cart
  b.box(-19.0, 2.45, -6.5, 1.6, 0.9, 0.7, IRON); // chute hopper: a lip at 2.9 for the manual jump
}

/** S2 Switchboard Hall: look up. The split lane, the desk, the pipe over it, the cabinet and the relay perch. */
function s2(b: LevelBuilder): void {
  // the two switchboard banks (4.0 m, 1.85 m between inner faces, 6 m long): the split; their tops are not routes
  plain(b, () => {
    b.box(0, 2.0, -11.4, 6.0, 4.0, 0.8, GRN);
    b.box(0, 2.0, -8.75, 6.0, 4.0, 0.8, GRN);
  });
  b.box(6.0, 0.5, -14.5, 2.2, 1.0, 0.9, PAN); // the operator's desk
  b.pipeH(6.0, -7.0, 6.0, -18.5, 4.4); // over the desk, N-S
  b.box(6.0, 1.3, -7.6, 1.6, 2.6, 0.9, IRON); // the cable cabinet: a jump grab onto the pipe
  b.box(11.35, 1.65, -16.5, 1.0, 3.3, 3.0, GRN); // the relay bank: the wall-jump perch
}

/** S3 Boiler Room: hear yourself. The catwalk, two boilers, the stairs and ladder, the cage. */
function s3(b: LevelBuilder): void {
  // the grate catwalk (1.0 m, hugging the west and north walls: the wall is within a kick's reach of the lip)
  b.box(12.65, 3.24, -12.975, 1.0, 0.12, 13.65, IRON);
  b.box(19.8, 3.24, -6.65, 13.3, 0.12, 1.0, IRON);
  // a conduit trunking under each lip (2.0 m: too tall to mantle, so the wall jump is what the lip offers): the wall a
  // wall jump kicks off, wherever you stand to it
  plain(b, () => {
    b.box(13.075, 1.0, -15.35, 0.15, 2.0, 9.1, IRON); // west: z -19.9..-10.8 (the S2 door gap z -10.7..-9.5 stays open)
    b.box(13.075, 1.0, -7.725, 0.15, 2.0, 3.1, IRON); // z -9.3..-6.2 (past the door gap)
    b.box(19.8, 1.0, -7.075, 13.3, 2.0, 0.15, IRON); // north, under the south edge of the N strip
  });
  b.stairs(22.0, -9.9, 1.2, 5.5, 3.3, 17, IRON, 0);
  b.ladder(13.6, -17.5, 0, 3.3, -Math.PI / 2);
  b.box(18.5, 2.2, -8.65, 3.0, 4.4, 3.0, RUST); // boiler A (top 4.4; the catwalk is a 1.1 m step to it)
  b.box(26.0, 1.75, -16.0, 2.6, 3.5, 2.6, RUST); // boiler B (3.5; a drainpipe to its top)
  b.pipeV(24.6, -16.0, 0, 3.5, Math.PI / 2);
  b.box(26.4, 1.0, -8.8, 0.9, 2.0, 1.4, IRON); // valve housing (shields the sabotage nook)
  // the tool cage round the north-east corner holding the ground door: fence, no gate
  b.fence(27.0, -10.0, 27.0, -6.15, 2.4);
  b.fence(27.0, -10.0, 31.85, -10.0, 2.4);
}
