import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LaserDef } from '../../game/jammer';
import type { PassZone } from '../../game/ctDevices';
import type { ScannerDef } from '../../game/scanners';
import type { SecurityData } from '../../security/data';
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
const DOOR_Z0 = 6.4;
const DOOR_W = 1.2;
const MID = CT_W / 2;

export const bayX = (i: number): number => CT_PITCH * i;

/** The airlock pads' floor colour and the station 3 blind spot's (distinct: course-ready F5). */
export const AIRLOCK_PAD_COLOR = '#2f6b4a';
export const S3_POCKET_COLOR = '#6f8296';
/**
 * The leg-up spot (bay x offset, z) at stations 2, 5 and 7, where the striped square sits: the booster's tested spot
 * (e2e-ctcourse `legUp(x0 + 8.0, 3 / 3.6)`), 0.5 m from the 1 m walls' face (0.85 m from the annex lip), beside the door.
 */
export const LEGUP_SPOT: readonly [number, number] = [8.0, 3.5];

/** Obstacle wall heights by station (1-based; none for the panel station). */
const OBST_H: Record<number, number> = { 2: LEDGE, 3: 3.2, 4: 3.5, 5: 4.0, 6: 3.2, 7: LEDGE, 8: 3.5 };

/** The map's footprint. */
export const CT_BOUNDS = { minX: -1, maxX: bayX(7) + CT_BAY + 1, minZ: -1, maxZ: CT_W + 1 } as const;

/** Station 3: the course flag the camera pocket sets (both players in the blind spot under the camera). */
export const S3_FLAG = 's3-clear';

/**
 * Station 3 camera (B3): over the door, 2.4 m up, sweeping +-30 deg across the approach. Its 45 deg vertical field leaves a
 * blind spot under it (SN04): the pocket in front of the door. Both players must stand in the pocket; the camera sees the
 * walk to it unless the partner's held jammer blinds it.
 */
export const S3_CAMERA = { x: bayX(2) + CT_OBST - 0.4, z: CT_W / 2 };
export const S3_POCKET: PassZone = { id: 'p-s3', box: [bayX(2) + CT_OBST - 1.5, MID - 1.2, bayX(2) + CT_OBST - 0.5, MID + 1.2], flag: S3_FLAG };
/** Station 6 (B6): the course flag the paired scanners set (both hacks finished within the sync window). */
export const S6_FLAG = 's6-sync';
export const S6_SCANNERS: ScannerDef = { id: 'sc-s6', a: 'sw-s6-a', b: 'sw-s6-b', flag: S6_FLAG };
/** Station 4 (B4): the course flag the far-side release switch sets; it switches the laser band off for good (bay restart re-arms it). */
export const S4_FLAG = 's4-release';
/** Station 4: the open gap in the 3.5 m wall the laser band closes (z), wide enough to throw a partner through. */
export const S4_GAP: [number, number] = [4, 10];
/**
 * Station 4 laser band (B3 device, B4 layout): three beams across the whole gap in the wall plane. One player throws the
 * other over it (CT 1.3); the thrown one presses the release on the far side (CT's far-side release) and the band goes off.
 */
export const S4_LASER: LaserDef = { id: 'laser-s4', x1: bayX(3) + CT_OBST, z1: S4_GAP[0], x2: bayX(3) + CT_OBST, z2: S4_GAP[1], ys: [0.35, 0.9, 1.45], label: 'Laser', offFlag: S4_FLAG };
/** Station 7 (B7): the return stair's z (against the south fence, on the far side of the rope wall). */
export const S7_STAIR_Z = 1.0;
/** Station 5 (B5): the roof hatch (a skylight narrower than a body, 0.55 m: nobody walks or drops in, only a partner lowered
 *  head-first fits) over the annex's back room [x0, z0, x1, z1], and the hack panel under it (y = its reach height). */
export const S5_HATCH: [number, number, number, number] = [bayX(4) + 14.125, 1.0, bayX(4) + 14.675, 1.55];
export const S5_PANEL = { x: bayX(4) + 14.4, y: 1.2, z: 0.4 };
const SECURITY: SecurityData = {
  devices: [{ id: 'cam-s3', kind: 'camera', level: 'ground', at: [S3_CAMERA.x, S3_CAMERA.z], y: 2.4, facing: 270, sweep: [240, 300], reason: 'Training camera for the jam-and-pass drill' }],
};

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

/** A panel's text is at most this many characters (its banner shows for 1.8 s; course-ready F18). */
export const PANEL_TEXT_MAX = 120;

/** The panel text of each station (an optional read: what to do here). Pad and keyboard words (course-ready F14). */
export const PANEL_TEXT: readonly string[] = [
  'Step onto the airlock pad at the end with your partner to go on',
  'Wall: crouch + Co-op (RB / F) boosts your partner; Y / Space climbs up. They unbolt the door (A / E) on the far side',
  'Camera: LB / Tab to the pistol, X / RMB draws it; hold LT / Z on the camera. Partner: into the blind spot, then swap',
  'Laser: a beam costs health. Stand, Co-op (RB / F) throws your partner over; they press the red release on the left fence',
  'Annex: leg-up and relay onto the roof (Y / Space climbs up). Press both roof plates (A / E) together',
  'Scanners: one each. Press A / E at your scanner and stay; both hacks must finish within 1.5 s. Start on two green lights',
  'High wall: leg-up one; on top, face back down and Co-op (RB / F) drops a rope. Partner: climb it, Y / Space at the top',
  'Last wall: through the doorway, then both of you into the lit zone to finish',
];

/** LANTERN's line as each station starts (<= 90 characters). */
export const RADIO_ENTER: readonly string[] = [
  'Marlow Yard. Both of you onto the airlock pad at the end, then through.',
  'Wall one. Crouch + Co-op (RB / F): a leg-up. Unbolt the far door from the other side.',
  'Camera. LB / Tab to the pistol, X draws, hold LT / Z on it. Partner: the blind spot.',
  'Laser line. Stand, Co-op (RB / F): throw your partner. Red release on the left fence.',
  'Annex roof: leg-up and relay. Then both roof plates together.',
  'Two scanners, one each. Start the hacks together (A / E) and stay put. A fail hurts.',
  'High wall. Leg-up one; the one on top drops a rope (RB / F) for the other.',
  'Last wall. Cross, then both of you into the lit zone.',
];

/** LANTERN's line when a station's gate opens, keyed by gate id: it names the next step (course-ready F2). */
export const GATE_RADIO: Readonly<Record<string, string>> = {
  'g-s2': 'Unbolted. Open the door for your partner.',
  'g-s3': 'Door unlocked. Holster first (X / RMB), then open it (A / E).',
  'g-s4': 'Laser down. Both of you through, then onto the airlock pad.',
  'g-s5': 'Plates done. Crouch at the hatch, face it, Co-op (RB / F): lower your partner to hack.',
  'g-s5-grid': 'Grid open. Off the roof, in the front door, through the grid to the airlock.',
  'g-s6': 'Scanners synced. Door open. On to the airlock pad.',
};

/** Each station's task, the HUD's step line while the bay has no drills (<= 90 characters; course-ready F1). */
export const OBJECTIVE_TEXT: readonly string[] = [
  'Read the panel if you like, then both of you onto the airlock pad.',
  'Leg-up your partner over the wall (crouch, RB / F); they unbolt the door on the far side.',
  'Jam the camera (pistol, hold LT / Z) while your partner reaches the blind spot. Then swap.',
  'Throw your partner over the laser (RB / F); they press the red release on the left fence.',
  'Leg-up and relay onto the roof, press both plates, lower your partner through the hatch.',
  'One at each scanner: press A / E together and stay until both hacks finish.',
  'Leg-up one onto the wall; on top, face back down and drop the rope (RB / F) for the other.',
  'Through the doorway, then both of you into the lit zone to finish.',
];

function courseDef(): CourseDef {
  const gates = (n: number): GateDef[] => {
    switch (n) {
      case 1:
        return [];
      case 2:
        // B2: the door is bolted from the far side; the boosted player opens it for the partner (CT's first wall). The side
        // test is at the door plane (course-ready F7): any feet past the leaf count as the bolt side; the near side is refused
        return [{ kind: 'bolt', id: 'g-s2', doorId: 'S2-door', side: [1, 0], at: [bayX(1) + CT_OBST, DOOR_Z0 + DOOR_W / 2] }];
      case 3:
        // B3: the door opens once BOTH stand in the camera's blind spot (the pass zone): one has to jam it for the other
        return [{ kind: 'flag', id: 'g-s3', flag: S3_FLAG, doorId: 'S3-door' }];
      case 4:
        // B4: the partner throw over the laser band; the thrown player's far-side release switches the band off
        return [{ kind: 'pickup', id: 'g-s4', switchId: 'sw-s4-release', flag: S4_FLAG, perPlayer: false }];
      case 6:
        // B6: the paired scanners (CtDevices): both hacks finished within the sync window set the flag
        return [{ kind: 'flag', id: 'g-s6', flag: S6_FLAG, doorId: 'S6-door' }];
      case 7:
        // B7: a solid wall, no door: leg-up one, the one on top drops the two-person rope for the other (nobody is left
        // below to boost); the airlock waits for both. A far-side stair lets a lone player back up (never stranded).
        return [];
      case 5:
        return [
          { kind: 'pair', id: 'g-s5', a: 'sw-s5-a', b: 'sw-s5-b', doorId: 'S5-door' },
          { kind: 'lever', id: 'g-s5-grid', switchId: 'sw-s5-hack', doorId: 'S5-grid' },
        ];
      case 8:
        // B8: the final beat: an open doorway in the last wall, then both players into the lit exit zone (G138)
        return [];
      default:
        return [{ kind: 'timedHold', id: `g-s${n}`, holdId: `h-s${n}`, doorId: `S${n}-door` }];
    }
  };
  const bays: BayDef[] = [];
  for (let n = 1; n <= 8; n++) {
    const own = gates(n);
    bays.push({
      id: `S${n}`,
      entry: n === 1 ? 'start' : `A${n - 1}`,
      exit: n === 8 ? 'end' : `A${n}`,
      squad: [],
      // one optional panel per station (F1b, Michael's pick): it only says what to do, no gate waits on it
      gates: [...own, { kind: 'pickup', id: `g-p${n}`, switchId: `sw-p${n}`, flag: `panel-${n}`, perPlayer: false }],
      radio: [
        { at: 'enter', text: RADIO_ENTER[n - 1]! },
        ...own.flatMap((g) => (GATE_RADIO[g.id] ? [{ at: g.id, text: GATE_RADIO[g.id]! }] : [])),
      ],
      drills: [],
      elements: [],
    });
  }
  return {
    id: 'ctcourse',
    objectives: OBJECTIVE_TEXT.map((text, i) => ({ id: `o-s${i + 1}`, bay: `S${i + 1}`, text })),
    airlocks: Array.from({ length: 7 }, (_, i) => {
      const n = i + 1;
      return { id: `A${n}`, box: [bayX(i) + CT_BAY, 4, bayX(i) + CT_BAY + 6, 10] as [number, number, number, number], floorY: 0, nearDoor: `A${n}-near`, farDoor: `A${n}-far` };
    }),
    bays,
    exitZone: CT_EXIT_ZONE,
    externalFlags: [S3_FLAG, S6_FLAG],
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
    const lamp = (x: number, y = 5, intensity = 0.9): void => void b.light({ x, y, z: MID, radius: 13, intensity });

    for (let i = 0; i < 8; i++) {
      const n = i + 1;
      const x0 = bayX(i);
      lamp(x0 + 4);
      // (course-ready S2) station 5: lamp B is a mast over the annex roof, so bodies on the roof (plates, relay lip, hatch) read lit
      if (n === 5) lamp(x0 + 12.5, 6.8, 1.1);
      else lamp(x0 + 12.5);
      if (i < 7) {
        // (course-ready S2) the airlock's utility lamp: the green pad and both doors readable; its 6 m walls and shut doors keep it in
        b.light({ x: x0 + CT_BAY + 3, y: 4.6, z: MID, radius: 7, intensity: 0.5 });
        // the airlock A(n): cross walls at both planes, side walls, the pockets beside it are sealed void
        doors[`A${n}-near`] = crossWall(b, x0 + CT_BAY, FENCE);
        doors[`A${n}-far`] = crossWall(b, x0 + CT_PITCH, FENCE);
        b.wallX(4, x0 + CT_BAY, x0 + CT_PITCH, [], FENCE, DARK);
        b.wallX(10, x0 + CT_BAY, x0 + CT_PITCH, [], FENCE, DARK);
        mark(b, x0 + CT_BAY + 3, MID, 4, 4, AIRLOCK_PAD_COLOR);
      }
      if (n === 4) {
        // B4: a wide gap in the wall, closed only by the laser band (layout.lasers); no door
        b.wallZ(x0 + CT_OBST, 0, CT_W, [S4_GAP], OBST_H[4]!, WALL, 0.3);
        mark(b, x0 + CT_OBST - 1.6, MID);
        mark(b, x0 + CT_OBST + 2.2, MID);
      } else if (n === 7) {
        // B7: the 4.4 m wall, 1 m thick (a top to stand on and hold the rope), full width, no door
        b.wallZ(x0 + CT_OBST, 0, CT_W, [], OBST_H[7]!, WALL, 1.0);
        mark(b, x0 + LEGUP_SPOT[0], LEGUP_SPOT[1], 1, 1);
      } else if (n === 8) {
        // B8: the last wall keeps its doorway open (no door, no console): the end is both players in the exit zone
        const h = OBST_H[8]!;
        b.wallZ(x0 + CT_OBST, 0, CT_W, [[DOOR_Z0, DOOR_Z0 + DOOR_W]], h, WALL, 0.3);
        b.box(x0 + CT_OBST, (2.1 + h) / 2, DOOR_Z0 + DOOR_W / 2, 0.3, h - 2.1, DOOR_W, WALL);
        mark(b, x0 + CT_OBST + 1.6, MID);
      } else if (n >= 2) {
        const h = OBST_H[n]!;
        // station 2 is a 1 m thick wall (a top deep enough to climb onto, LEDGE.climbDepth); the rest keep the thin one
        doors[`S${n}-door`] = crossWall(b, x0 + CT_OBST, h, n === 2 ? 1.0 : 0.3);
        // stations 2 and 5: the near square marks the tested leg-up spot beside the door (course-ready F11)
        if (n === 2 || n === 5) mark(b, x0 + LEGUP_SPOT[0], LEGUP_SPOT[1], 1, 1);
        else mark(b, x0 + CT_OBST - 1.6, MID);
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
    // (course-ready S2) a small wall-top lamp over the far side: the wall top, the drop and the bolt / door area
    b.light({ x: bayX(1) + CT_OBST + 0.9, y: 6.6, z: 5.0, radius: 7, intensity: 0.5 });

    // 3 Camera: the real camera device (layout.security) sits over the door; the blind spot under it is marked
    let x0 = bayX(2);
    // a pale blue-grey, not the airlock pads' green (course-ready F5)
    mark(b, (S3_POCKET.box[0] + S3_POCKET.box[2]) / 2, MID, S3_POCKET.box[2] - S3_POCKET.box[0], S3_POCKET.box[3] - S3_POCKET.box[1], S3_POCKET_COLOR);
    b.light({ x: x0 + 6, y: 3.0, z: MID, radius: 7, intensity: 0.9 });

    // 4 Laser line (B4): the laser band (layout.lasers) across the wall's gap; the release switch is on the far side
    x0 = bayX(3);
    devices['sw-s4-release'] = dev(x0 + 12, CT_W - 0.4, NORTH, 'Laser release');
    b.box(x0 + 12, 1.3, CT_W - 0.2, 0.7, 0.9, 0.12, '#5a1d1d', 0, 0, false);

    // 5 Annex: roofed (top 4.4), internal grid wall at +12.5, computer, wall medkit
    x0 = bayX(4);
    // the roof slab starts flush with the front wall face so the lip hangs over a flat face (B2: leg-up + relay target)
    // (B5) a roof hatch over the back room (behind the grid wall, reached only from above): the slab in four pieces round it
    const [hx0, hz0, hx1, hz1] = S5_HATCH;
    b.box((x0 + 8.85 + hx0) / 2, 4.2, MID, hx0 - x0 - 8.85, 0.4, CT_W, DARK);
    b.box((hx1 + x0 + 16) / 2, 4.2, MID, x0 + 16 - hx1, 0.4, CT_W, DARK);
    b.box((hx0 + hx1) / 2, 4.2, hz0 / 2, hx1 - hx0, 0.4, hz0, DARK);
    b.box((hx0 + hx1) / 2, 4.2, (hz1 + CT_W) / 2, hx1 - hx0, 0.4, CT_W - hz1, DARK);
    b.noLedge((hx0 + hx1) / 2, (hz0 + hz1) / 2, 1.0);
    // the tell: a striped frame round the hatch and the holder's square beside it (CT's marked spot)
    b.box((hx0 + hx1) / 2, LEDGE + 0.01, hz1 + 0.05, hx1 - hx0 + 0.2, 0.02, 0.1, WARN, 0, 0, false);
    b.box((hx0 + hx1) / 2, LEDGE + 0.01, hz1 + 0.75, 1.2, 0.02, 1.0, WARN, 0, 0, false);
    doors['S5-grid'] = crossWall(b, x0 + 12.5, 4.0);
    b.light({ x: x0 + 11, y: 3.4, z: MID, radius: 8, intensity: 0.9 });
    // (course-ready S2) back room: the lamp moved south over the hack panel, a second one north over the medkit
    b.light({ x: x0 + 14.2, y: 3.4, z: 3.0, radius: 8, intensity: 0.9 });
    b.light({ x: x0 + 14.6, y: 3.4, z: 11.5, radius: 6, intensity: 0.9 });
    // both players must be ON the roof (leg-up one, relay the other) to press the roof plates together
    devices['sw-s5-a'] = dev(x0 + 11, 3.6, SOUTH, 'Roof plate A (press with B)', LEDGE);
    devices['sw-s5-b'] = dev(x0 + 11, CT_W - 3.6, NORTH, 'Roof plate B (press with A)', LEDGE);
    b.box(x0 + 11, LEDGE + 0.01, 3.6, 1.2, 0.02, 1.2, WARN, 0, 0, false);
    b.box(x0 + 11, LEDGE + 0.01, CT_W - 3.6, 1.2, 0.02, 1.2, WARN, 0, 0, false);
    // (B5) the hack panel low on the back room's south wall, under the hatch: the hanging partner reaches it head-first
    // (lowered past about 2.3 m); a player dropped into the room can press it from the floor (never stuck there)
    devices['sw-s5-hack'] = dev(S5_PANEL.x, S5_PANEL.z, SOUTH, 'Hack panel (hang down through the roof hatch)', S5_PANEL.y);
    b.box(S5_PANEL.x, 1.4, 0.2, 0.9, 0.9, 0.08, '#20252b', 0, 0, false);

    // 6 Paired scanners, ten metres apart
    x0 = bayX(5);
    devices['sw-s6-a'] = dev(x0 + 5, 0.4, SOUTH, 'Retinal scanner A (hack)');
    devices['sw-s6-b'] = dev(x0 + 5, CT_W - 0.4, NORTH, 'Retinal scanner B (hack)');
    b.box(x0 + 5, 1.4, 0.2, 0.9, 0.9, 0.08, '#20252b', 0, 0, false);
    b.box(x0 + 5, 1.4, CT_W - 0.2, 0.9, 0.9, 0.08, '#20252b', 0, 0, false);

    // 7 (B7) Rope wall: 4.4 m solid; the holder's striped strip on its top; a far-side return stair (1.1 m rises) so a
    // player alone on the far side can always climb back (never stranded)
    x0 = bayX(6);
    // (course-ready S2) a wall-top lamp over the holder strip, above a standing holder's head
    b.light({ x: x0 + CT_OBST, y: 6.6, z: MID, radius: 5, intensity: 0.6 });
    b.box(x0 + CT_OBST, LEDGE + 0.01, MID, 0.9, 0.02, 3, WARN, 0, 0, false);
    for (let k = 1; k <= 3; k++) {
      const h = 1.1 * (4 - k);
      b.box(x0 + CT_OBST + 0.5 + k - 0.5, h / 2, S7_STAIR_Z, 1.0, h, 1.2, CONC);
    }

    // 8 The lit exit zone (B8: the wall keeps an open doorway, built with the walls above)
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
      // wall medkit stations (G180): the annex (north wall, station 5) and before the last wall
      medkitWalls: [
        { pos: new Vector3(bayX(4) + 15, 0, CT_W - 0.4), yaw: NORTH },
        { pos: new Vector3(bayX(7) + 2, 0, CT_W - 0.4), yaw: NORTH },
      ],
      navSeeds,
      security: SECURITY,
      lasers: [S4_LASER],
      passZones: [S3_POCKET],
      scanners: [S6_SCANNERS],
      course: { def: courseDef(), doors, devices, squads: {} },
      // (G3, AUDIT-CAMERA row 1) the yard reads as open (the 2.8 m camera, the whole body in frame); the 6 m airlocks and
      // the roofed annex (under its 4.2 m slab) are tight (1.8 m). Its roof is open again (feet at 4.4).
      camSize: 'open',
      camSpaces: [
        ...Array.from({ length: 7 }, (_, i) => ({ box: [bayX(i) + CT_BAY, 4, bayX(i) + CT_PITCH, 10] as const, size: 'tight' as const })),
        { box: [bayX(4) + CT_OBST, 0, bayX(4) + CT_BAY, CT_W], y: [-1, 3.9], size: 'tight' },
      ],
    };
  },
};
