import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { BayDef, CourseDef, CourseDevice, GateDef } from '../../game/course/courseDef';

/**
 * Marlow Yard (CT prototype B1, `docs/ct-prototype/CTCOURSE-SPEC.md`): an operator training yard at night, eight
 * stations in CT's training order along +x, each a bay of the course framework (airlocks between them). Every number is
 * a prototype starting value (G10). The station obstacles are geometry plus a PLACEHOLDER door gate (pair / timed hold)
 * so the course stays completable until slices B2-B8 build the real moves; each placeholder is marked in its label.
 * Reached by `?autostart=ctcourse&mode=course` (not listed). Old Fallow bunker: `?legacy=1&autostart=bunker`.
 */

/** Bay pitch along x: a 16 m bay plus a 6 m airlock. */
export const CT_PITCH = 22;
/** Bay length (x), airlock size and yard width (z). */
export const CT_BAY = 16;
export const CT_W = 14;
/** The obstacle wall sits this far into each bay. */
export const CT_OBST = 9;
/** Fence and airlock wall height; the ledge band (G57) is 4.3-4.5. */
const FENCE = 6;
const LEDGE = 4.4;
const WALL = '#6a6f74';
const DARK = '#3f4348';
const CONC = '#52575c';
const WARN = '#c9a227';
const RED = '#a8262b';
const DOOR_Z0 = 6.4;
const DOOR_W = 1.2;
const MID = CT_W / 2;

export const bayX = (i: number): number => CT_PITCH * i;

/** Obstacle wall heights by station (1-based; none for the panel station). */
const OBST_H: Record<number, number> = { 2: LEDGE, 3: 3.2, 4: 3.5, 5: 4.0, 6: 3.2, 7: LEDGE, 8: 3.5 };

/** The map's footprint. */
export const CT_BOUNDS = { minX: -1, maxX: bayX(7) + CT_BAY + 1, minZ: -1, maxZ: CT_W + 1 } as const;

/** The exit zone (G138, last bay): both players inside ends the course. */
export const CT_EXIT_ZONE = { box: [bayX(7) + 11.5, 3, bayX(7) + 15.5, 11] as [number, number, number, number], floorY: 0 };

const dev = (x: number, z: number, yaw: number, label: string, y = 0): CourseDevice => ({ x, y, z, yaw, label });
const SOUTH = 0;
const NORTH = Math.PI;

/** A cross wall at x with a door gap and a lintel over it; returns the door's anchor id. */
function crossWall(b: LevelBuilder, x: number, h: number, thick = 0.3): number {
  b.wallZ(x, 0, CT_W, [[DOOR_Z0, DOOR_Z0 + DOOR_W]], h, WALL, thick);
  b.box(x, (2.1 + h) / 2, DOOR_Z0 + DOOR_W / 2, thick, h - 2.1, DOOR_W, WALL);
  return b.door(x, 0, DOOR_Z0, DOOR_W, 0).id;
}

/** Floor marking squares (CT's striped contextual-move squares): visual only. */
function mark(b: LevelBuilder, x: number, z: number, w = 1.6, d = 1.6, color = WARN): void {
  b.box(x, 0.01, z, w, 0.02, d, color, 0, 0, false);
}

/** The panel text of each station (an optional read: what to do here). */
export const PANEL_TEXT: readonly string[] = [
  'Step onto the green pad at the end with your partner to go on',
  'Wall: crouch + Co-op Action boosts your partner up; they open the far door',
  'Camera: one holds the console while the other walks through',
  'Laser: stand on a plate each, together, to open the door',
  'Annex: boost up, relay your partner, press both roof plates, then hack',
  'Scanners: press both within a second of each other',
  'Wire wall: one holds the rope post while the other crosses',
  'Last wall: one holds the lift, then both into the lit zone',
];

function courseDef(): CourseDef {
  const gates = (n: number): GateDef[] => {
    switch (n) {
      case 1:
        return [];
      case 2:
        // B2: the door is bolted from the far side; the boosted player opens it for the partner (CT's first wall)
        return [{ kind: 'bolt', id: 'g-s2', doorId: 'S2-door', side: [1, 0], at: [bayX(1) + CT_OBST + 0.9, DOOR_Z0 + DOOR_W / 2] }];
      case 4:
      case 6:
        return [{ kind: 'pair', id: `g-s${n}`, a: `sw-s${n}-a`, b: `sw-s${n}-b`, doorId: `S${n}-door` }];
      case 5:
        return [
          { kind: 'pair', id: 'g-s5', a: 'sw-s5-a', b: 'sw-s5-b', doorId: 'S5-door' },
          { kind: 'lever', id: 'g-s5-grid', switchId: 'sw-s5-hack', doorId: 'S5-grid' },
        ];
      default:
        return [{ kind: 'timedHold', id: `g-s${n}`, holdId: `h-s${n}`, doorId: `S${n}-door` }];
    }
  };
  const radio: Record<number, string> = {
    1: 'Marlow Yard. Both of you on the green pad at the end, then through the airlock.',
    2: 'Wall one. Crouch + Co-op action: a leg-up. Open the far door.',
    3: 'Camera corridor. Placeholder: one holds the console, the other walks through.',
    4: 'Laser line. Placeholder plates. The partner throw replaces them.',
    5: 'Annex roof: leg-up, then relay the other up. Both plates, then hack.',
    6: 'Two scanners, ten metres apart. Press both within a second.',
    7: 'Wire wall and rope. Placeholder: one holds, the other crosses.',
    8: 'Last wall. Cross, then both of you into the lit zone.',
  };
  const bays: BayDef[] = [];
  for (let n = 1; n <= 8; n++) {
    bays.push({
      id: `S${n}`,
      entry: n === 1 ? 'start' : `A${n - 1}`,
      exit: n === 8 ? 'end' : `A${n}`,
      squad: [],
      // one optional panel per station (F1b, Michael's pick): it only says what to do, no gate waits on it
      gates: [...gates(n), { kind: 'pickup', id: `g-p${n}`, switchId: `sw-p${n}`, flag: `panel-${n}`, perPlayer: false }],
      radio: [{ at: 'enter', text: radio[n]! }],
      drills: [],
      elements: [],
    });
  }
  return {
    id: 'ctcourse',
    airlocks: Array.from({ length: 7 }, (_, i) => {
      const n = i + 1;
      return { id: `A${n}`, box: [bayX(i) + CT_BAY, 4, bayX(i) + CT_BAY + 6, 10] as [number, number, number, number], floorY: 0, nearDoor: `A${n}-near`, farDoor: `A${n}-far` };
    }),
    bays,
    exitZone: CT_EXIT_ZONE,
  };
}

/**
 * Marlow Yard. Plan (x east, z north, floor 0): the yard is 14 m wide; bay i spans x = 22 i .. 22 i + 16 and its airlock
 * 22 i + 16 .. 22 i + 22. Obstacle walls stand at bay x + 9 (full width, one 1.2 m placeholder door); station 5 is a
 * roofed annex (roof top 4.4) with a second internal wall (the hack grid).
 */
export const ctcourse: MapDef = {
  id: 'ctcourse',
  name: 'Marlow Yard',
  description: 'Operator training yard at night: eight stations for two (prototype greybox).',
  theme: {
    sky: '#0a0d12',
    horizon: '#141922',
    ground: '#2a2d30',
    fogStart: 60,
    fogEnd: 200,
    sunDir: [-0.3, -1, -0.2],
    sunIntensity: 0.05,
    ambient: 0.25,
    lightLevel: 0.3,
    floor: 'concrete',
    grade: { tint: [0.97, 0.98, 1.0], saturation: 0.75, contrast: 1.1 },
  },
  modes: ['course'],
  build(b): MapLayout {
    b.bounds = { ...CT_BOUNDS };
    const length = bayX(7) + CT_BAY;
    b.floor(length / 2, MID, length, CT_W, CONC);
    // the yard fence: north, south, west and east ends
    b.wallX(0, 0, length, [], FENCE, DARK);
    b.wallX(CT_W, 0, length, [], FENCE, DARK);
    b.wallZ(0, 0, CT_W, [], FENCE, DARK);
    b.wallZ(length, 0, CT_W, [], FENCE, DARK);
    const doors: Record<string, number> = {};
    const devices: Record<string, CourseDevice> = {};
    const lamp = (x: number): void => void b.light({ x, y: 5, z: MID, radius: 13, intensity: 0.9 });

    for (let i = 0; i < 8; i++) {
      const n = i + 1;
      const x0 = bayX(i);
      lamp(x0 + 4);
      lamp(x0 + 12.5);
      if (i < 7) {
        // the airlock A(n): cross walls at both planes, side walls, the pockets beside it are sealed void
        doors[`A${n}-near`] = crossWall(b, x0 + CT_BAY, FENCE);
        doors[`A${n}-far`] = crossWall(b, x0 + CT_PITCH, FENCE);
        b.wallX(4, x0 + CT_BAY, x0 + CT_PITCH, [], FENCE, DARK);
        b.wallX(10, x0 + CT_BAY, x0 + CT_PITCH, [], FENCE, DARK);
        mark(b, x0 + CT_BAY + 3, MID, 4, 4, '#2f6b4a');
      }
      if (n >= 2) {
        const h = OBST_H[n]!;
        // station 2 is a 1 m thick wall (a top deep enough to climb onto, LEDGE.climbDepth); the rest keep the thin one
        doors[`S${n}-door`] = crossWall(b, x0 + CT_OBST, h, n === 2 ? 1.0 : 0.3);
        mark(b, x0 + CT_OBST - 1.6, MID);
        mark(b, x0 + CT_OBST + 1.6, MID);
      }
    }

    // One optional panel at the start of each station (F1b): it says what to do; the station's action opens the way.
    for (let n = 1; n <= 8; n++) {
      const x = bayX(n - 1) + 3.5;
      devices[`sw-p${n}`] = dev(x, CT_W - 0.4, NORTH, PANEL_TEXT[n - 1]!);
      b.box(x, 1.4, CT_W - 0.2, 1.4, 0.9, 0.08, '#20252b', 0, 0, false);
      mark(b, x, CT_W - 2);
    }

    // 2 Leg-up wall (4.4 ledge band, 1 m thick): a bolt on the far side of the door (B2)

    // 3 Camera corridor: a camera body on the wall, a jammer console (hold) placeholder
    let x0 = bayX(2);
    b.box(x0 + CT_OBST - 0.4, 2.9, MID - 3, 0.4, 0.3, 0.6, '#222', 0, 0, false);
    devices['h-s3'] = dev(x0 + 5, 0.4, SOUTH, 'Hold jammer (placeholder: B3)');

    // 4 Laser line: red beams across the doorway (visual only)
    x0 = bayX(3);
    for (const y of [0.4, 1.0, 1.6]) b.box(x0 + CT_OBST, y, MID, 0.04, 0.04, 6, RED, 0, 0, false);
    devices['sw-s4-a'] = dev(x0 + 5, 0.4, SOUTH, 'Plate A (placeholder: partner throw, B4)');
    devices['sw-s4-b'] = dev(x0 + 5, CT_W - 0.4, NORTH, 'Plate B (placeholder: partner throw, B4)');

    // 5 Annex: roofed (top 4.4), internal grid wall at +12.5, computer, wall medkit
    x0 = bayX(4);
    // the roof slab starts flush with the front wall face so the lip hangs over a flat face (B2: leg-up + relay target)
    b.box(x0 + 12.425, 4.2, MID, 7.15, 0.4, CT_W, DARK);
    doors['S5-grid'] = crossWall(b, x0 + 12.5, 4.0);
    b.light({ x: x0 + 11, y: 3.4, z: MID, radius: 8, intensity: 0.9 });
    b.light({ x: x0 + 14.2, y: 3.4, z: MID, radius: 8, intensity: 0.9 });
    // both players must be ON the roof (leg-up one, relay the other) to press the roof plates together
    devices['sw-s5-a'] = dev(x0 + 11, 3.6, SOUTH, 'Roof plate A (press with B)', LEDGE);
    devices['sw-s5-b'] = dev(x0 + 11, CT_W - 3.6, NORTH, 'Roof plate B (press with A)', LEDGE);
    b.box(x0 + 11, LEDGE + 0.01, 3.6, 1.2, 0.02, 1.2, WARN, 0, 0, false);
    b.box(x0 + 11, LEDGE + 0.01, CT_W - 3.6, 1.2, 0.02, 1.2, WARN, 0, 0, false);
    devices['sw-s5-hack'] = dev(x0 + 11, CT_W - 0.4, NORTH, 'Hack computer (placeholder: hang-down, B5)');

    // 6 Paired scanners, ten metres apart
    x0 = bayX(5);
    devices['sw-s6-a'] = dev(x0 + 5, 0.4, SOUTH, 'Retinal scanner A');
    devices['sw-s6-b'] = dev(x0 + 5, CT_W - 0.4, NORTH, 'Retinal scanner B');
    b.box(x0 + 5, 1.4, 0.2, 0.9, 0.9, 0.08, '#20252b', 0, 0, false);
    b.box(x0 + 5, 1.4, CT_W - 0.2, 0.9, 0.9, 0.08, '#20252b', 0, 0, false);

    // 7 Wire wall (4.4), a rope post and pipe on the near side
    x0 = bayX(6);
    b.box(x0 + CT_OBST, LEDGE + 0.15, MID, 0.1, 0.3, CT_W, '#888', 0, 0, false);
    b.box(x0 + 3, 2, 2, 0.12, 4, 0.12, '#7a5a3a', 0, 0, false);
    devices['h-s7'] = dev(x0 + 5, 0.4, SOUTH, 'Hold rope (placeholder: two-person rope, B7)');

    // 8 Final wall and the lit exit zone
    x0 = bayX(7);
    devices['h-s8'] = dev(x0 + 5, 0.4, SOUTH, 'Hold lift (placeholder: final throw, B4)');
    mark(b, (CT_EXIT_ZONE.box[0] + CT_EXIT_ZONE.box[2]) / 2, MID, CT_EXIT_ZONE.box[2] - CT_EXIT_ZONE.box[0], CT_EXIT_ZONE.box[3] - CT_EXIT_ZONE.box[1], '#2f8f5a');

    const navSeeds = Array.from({ length: 8 }, (_, i) => new Vector3(bayX(i) + 3, 0, MID));
    return {
      playerSpawns: [
        { pos: new Vector3(2, 0, MID - 1), yaw: Math.PI / 2 },
        { pos: new Vector3(2, 0, MID + 1), yaw: Math.PI / 2 },
      ],
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      // wall medkit stations (G178): the annex (north wall, station 5) and before the last wall
      medkitWalls: [
        { pos: new Vector3(bayX(4) + 15, 0, CT_W - 0.4), yaw: NORTH },
        { pos: new Vector3(bayX(7) + 2, 0, CT_W - 0.4), yaw: NORTH },
      ],
      navSeeds,
      course: { def: courseDef(), doors, devices, squads: {} },
    };
  },
};
